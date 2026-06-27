// src/pages/InboxPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import ModeBar from "../components/ModeBar";
import BusinessPicker from "../components/BusinessPicker";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function safeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function formatTime(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function scopeFromPath(pathname, mode) {
  const path = String(pathname || "").toLowerCase();
  if (path.startsWith("/sbo") || path.startsWith("/employee")) return "BUSINESS";
  if (path.startsWith("/customer")) return "PERSONAL";
  return ["SBO", "EMPLOYEE"].includes(String(mode || "").toUpperCase())
    ? "BUSINESS"
    : "PERSONAL";
}

function ThreadCard({ thread, active, onClick }) {
  const latest = thread?.latest_message;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "w-full rounded-3xl border p-4 text-left transition",
        active
          ? "border-cyan-400/50 bg-cyan-500/12"
          : "border-slate-800 bg-slate-950/65 hover:border-slate-700 hover:bg-slate-900/70"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {thread?.is_unread ? (
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-400" />
            ) : null}
            {thread?.pinned ? (
              <span title="Pinned" className="text-xs text-amber-300">PIN</span>
            ) : null}
            {thread?.needs_attention ? (
              <span title={thread?.attention_reason || "Needs attention"} className="text-xs font-black text-rose-300">!</span>
            ) : null}
            {thread?.muted ? (
              <span title="Muted" className="text-[10px] font-black text-slate-500">MUTED</span>
            ) : null}
            <div className={cx("truncate text-sm text-white", thread?.is_unread ? "font-black" : "font-bold")}>
              {thread?.subject || thread?.ticket_code || "Conversation"}
            </div>
          </div>
          <div className="mt-1 truncate text-xs text-slate-500">
            {thread?.ticket_code} · {thread?.status}
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-black text-slate-400">
          {thread?.message_count || 0}
        </span>
      </div>

      <div className="mt-3 line-clamp-2 text-sm leading-5 text-slate-300">
        {latest?.body || "No messages yet. The thread is ready automatically."}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-slate-500">
        <span className="truncate">
          {thread?.assigned_member?.name ||
            thread?.business?.name ||
            thread?.customer?.name ||
            "SyncWorks"}
        </span>
        <span className="shrink-0">{formatTime(thread?.updated_at)}</span>
      </div>
    </button>
  );
}

function EmptyState({ scope }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/40 p-8 text-center">
      <div className="text-lg font-black text-white">Inbox is clear</div>
      <div className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
        {scope === "BUSINESS"
          ? "Ticket conversations appear automatically when work is assigned to this business or employee."
          : "Your service conversations appear automatically. No manual filing is required."}
      </div>
    </div>
  );
}

export default function InboxPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, mode, activeBusinessId } = useAuth();

  const scope = useMemo(
    () => scopeFromPath(location.pathname, mode),
    [location.pathname, mode]
  );

  const [threads, setThreads] = useState([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [draft, setDraft] = useState("");
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [savingControls, setSavingControls] = useState(false);
  const [error, setError] = useState("");

  const selected = useMemo(
    () => threads.find((thread) => Number(thread.id) === Number(selectedId)) || null,
    [threads, selectedId]
  );

  async function loadThreads({ preserveSelection = true } = {}) {
    if (scope === "BUSINESS" && !activeBusinessId) {
      setThreads([]);
      setSelectedId(null);
      setLoadingThreads(false);
      return;
    }

    setLoadingThreads(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("scope", scope);
      params.set("archived", showArchived ? "true" : "false");
      if (query.trim()) params.set("q", query.trim());
      if (statusFilter) params.set("status", statusFilter);

      const response = await api.get(`/ticket-conversations/?${params.toString()}`);
      const next = safeList(response?.data);
      setThreads(next);
      setUnreadTotal(Number(response?.data?.unread_total || 0));

      const stillExists = next.some(
        (thread) => Number(thread.id) === Number(selectedId)
      );
      if (!preserveSelection || !stillExists) {
        setSelectedId(next[0]?.id || null);
      }
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail ||
          requestError?.response?.data?.business?.[0] ||
          "Inbox conversations could not be loaded."
      );
    } finally {
      setLoadingThreads(false);
    }
  }

  async function loadMessages(threadId) {
    if (!threadId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    setError("");

    try {
      const response = await api.get(
        `/ticket-conversations/${threadId}/messages/?scope=${scope}`
      );
      setMessages(safeList(response?.data));
      const opened = threads.find(
        (thread) => Number(thread.id) === Number(threadId)
      );
      setThreads((current) =>
        current.map((thread) =>
          Number(thread.id) === Number(threadId)
            ? {
                ...thread,
                ...(response?.data?.thread || {}),
                is_unread: false,
                unread_count: 0,
              }
            : thread
        )
      );
      setUnreadTotal((current) =>
        Math.max(0, current - Number(opened?.unread_count || 0))
      );
      window.dispatchEvent(
        new CustomEvent("sw:inboxReadStateChanged", {
          detail: { scope, threadId },
        })
      );
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail ||
          "This conversation could not be opened."
      );
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadThreads();
    }, query ? 250 : 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, activeBusinessId, query, statusFilter, showArchived]);

  useEffect(() => {
    loadMessages(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, scope, activeBusinessId]);

  async function updateControls(patch) {
    if (!selectedId || savingControls) return;

    setSavingControls(true);
    setError("");

    try {
      const response = await api.patch(
        `/ticket-conversations/${selectedId}/controls/?scope=${scope}`,
        patch
      );
      const updated = response?.data?.thread;

      if (updated) {
        setThreads((current) =>
          current
            .map((thread) =>
              Number(thread.id) === Number(selectedId)
                ? { ...thread, ...updated }
                : thread
            )
            .sort((a, b) => {
              if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
              if (!!a.is_unread !== !!b.is_unread) return a.is_unread ? -1 : 1;
              return String(b.updated_at || "").localeCompare(
                String(a.updated_at || "")
              );
            })
        );
      }
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail ||
          "Conversation controls could not be updated."
      );
    } finally {
      setSavingControls(false);
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    const body = draft.trim();
    if (!selectedId || !body || sending) return;

    setSending(true);
    setError("");
    try {
      const response = await api.post(
        `/ticket-conversations/${selectedId}/messages/?scope=${scope}`,
        { body }
      );
      setDraft("");
      const created = response?.data?.message;
      if (created) setMessages((current) => [...current, created]);
      await loadThreads({ preserveSelection: true });
    } catch (requestError) {
      setError(
        requestError?.response?.data?.body?.[0] ||
          requestError?.response?.data?.detail ||
          "Message could not be sent."
      );
    } finally {
      setSending(false);
    }
  }

  const title = scope === "BUSINESS" ? "Business Inbox" : "Personal Inbox";
  const subtitle =
    scope === "BUSINESS"
      ? "Customer conversations routed by ticket, employee assignment, and role"
      : "Your private service conversations, separate from work";

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title={title}
        subtitle={subtitle}
        rightActions={
          <div className="flex flex-wrap gap-2">
            {scope === "BUSINESS" ? <BusinessPicker /> : null}
            <button
              type="button"
              onClick={() => navigate(scope === "BUSINESS" ? "/sbo" : "/customer")}
              className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-2 text-sm font-bold text-slate-200"
            >
              Back
            </button>
          </div>
        }
      />

      <main className="mx-auto max-w-7xl px-4 py-5 pb-28 md:py-6">
        <section className="mb-4 rounded-3xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/8 via-indigo-500/5 to-fuchsia-500/8 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-black text-cyan-100">Automatically organized</div>
                <span className="rounded-full border border-cyan-400/30 bg-cyan-500/15 px-2 py-1 text-[10px] font-black text-cyan-100">
                  {unreadTotal} unread
                </span>
              </div>
              <div className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">
                Every ticket becomes a conversation automatically. Personal and
                business messages stay separated, outside spam and ads are blocked,
                and employees only see conversations allowed by their role.
              </div>
            </div>
            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-[10px] font-black text-emerald-100">
              INTERNAL FIRST
            </span>
          </div>
        </section>

        {scope === "BUSINESS" && !activeBusinessId ? (
          <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100">
            Select a business to open its inbox.
          </div>
        ) : (
          <div className="grid min-h-[68vh] gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
            <aside className="rounded-3xl border border-slate-800 bg-slate-950/45 p-3">
              <div className="grid gap-2">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search service, ZIP, address, or message…"
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/50"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-3 text-xs font-bold text-slate-200"
                  >
                    <option value="">All active</option>
                    <option value="NEW">New</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="IN_PROGRESS">In progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="INVOICED">Invoiced</option>
                    <option value="PAID">Paid</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowArchived((value) => !value)}
                    className={cx(
                      "rounded-2xl border px-3 py-3 text-xs font-black",
                      showArchived
                        ? "border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-100"
                        : "border-slate-800 bg-slate-950 text-slate-400"
                    )}
                  >
                    {showArchived ? "Archived" : "Active"}
                  </button>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {loadingThreads ? (
                  <div className="rounded-2xl border border-slate-800 p-4 text-sm text-slate-500">
                    Organizing conversations…
                  </div>
                ) : threads.length ? (
                  threads.map((thread) => (
                    <ThreadCard
                      key={thread.id}
                      thread={thread}
                      active={Number(thread.id) === Number(selectedId)}
                      onClick={() => setSelectedId(thread.id)}
                    />
                  ))
                ) : (
                  <EmptyState scope={scope} />
                )}
              </div>
            </aside>

            <section className="flex min-h-[620px] flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/45">
              {selected ? (
                <>
                  <header className="border-b border-slate-800 p-4 md:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-black text-white">
                          {selected.subject}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {selected.ticket_code} · {selected.status}
                          {selected.assigned_member?.name
                            ? ` · Assigned to ${selected.assigned_member.name}`
                            : ""}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={savingControls}
                          onClick={() =>
                            updateControls({
                              pinned: !selected.pinned,
                            })
                          }
                          className={cx(
                            "rounded-2xl border px-3 py-2 text-xs font-black transition disabled:opacity-50",
                            selected.pinned
                              ? "border-amber-400/40 bg-amber-500/15 text-amber-100"
                              : "border-slate-700 bg-slate-950 text-slate-300"
                          )}
                        >
                          {selected.pinned ? "Pinned" : "Pin"}
                        </button>

                        <button
                          type="button"
                          disabled={savingControls}
                          onClick={() =>
                            updateControls({
                              muted: !selected.muted,
                            })
                          }
                          className={cx(
                            "rounded-2xl border px-3 py-2 text-xs font-black transition disabled:opacity-50",
                            selected.muted
                              ? "border-slate-500/40 bg-slate-700/30 text-slate-100"
                              : "border-slate-700 bg-slate-950 text-slate-300"
                          )}
                        >
                          {selected.muted ? "Muted" : "Mute"}
                        </button>

                        <button
                          type="button"
                          disabled={savingControls}
                          onClick={() =>
                            updateControls({
                              needs_attention:
                                !selected.needs_attention,
                              attention_reason:
                                selected.needs_attention
                                  ? ""
                                  : "Marked for follow-up",
                            })
                          }
                          className={cx(
                            "rounded-2xl border px-3 py-2 text-xs font-black transition disabled:opacity-50",
                            selected.needs_attention
                              ? "border-rose-400/40 bg-rose-500/15 text-rose-100"
                              : "border-slate-700 bg-slate-950 text-slate-300"
                          )}
                        >
                          {selected.needs_attention
                            ? "Needs Follow-up"
                            : "Flag Follow-up"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/tickets/${selected.id}`)
                          }
                          className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-black text-cyan-100"
                        >
                          Open Ticket
                        </button>
                      </div>
                    </div>
                  </header>

                  <div className="flex-1 space-y-3 overflow-y-auto p-4 md:p-5">
                    {loadingMessages ? (
                      <div className="text-sm text-slate-500">Loading conversation…</div>
                    ) : messages.length ? (
                      messages.map((message) => {
                        const mine =
                          Number(message?.sender) === Number(user?.id) ||
                          Number(message?.author) === Number(user?.id);
                        const system =
                          String(message?.type || "").toUpperCase() === "SYSTEM";
                        return (
                          <div
                            key={message.id}
                            className={cx(
                              "flex",
                              system
                                ? "justify-center"
                                : mine
                                ? "justify-end"
                                : "justify-start"
                            )}
                          >
                            <div
                              className={cx(
                                "max-w-[88%] rounded-3xl border px-4 py-3 md:max-w-[72%]",
                                system
                                  ? "border-slate-800 bg-slate-900/70 text-slate-400"
                                  : mine
                                  ? "border-cyan-400/35 bg-cyan-500/15 text-cyan-50"
                                  : "border-slate-800 bg-slate-950 text-slate-200"
                              )}
                            >
                              {!system ? (
                                <div className="mb-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                  {mine
                                    ? "You"
                                    : message?.author_name || "Participant"}
                                </div>
                              ) : null}
                              <div className="whitespace-pre-wrap text-sm leading-6">
                                {message.body}
                              </div>
                              <div className="mt-2 text-[10px] text-slate-600">
                                {formatTime(message.created_at)}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-3xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
                        No messages yet. Send the first message below.
                      </div>
                    )}
                  </div>

                  <form
                    onSubmit={sendMessage}
                    className="border-t border-slate-800 bg-slate-950/80 p-3 md:p-4"
                  >
                    <div className="flex items-end gap-2">
                      <textarea
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        rows={2}
                        placeholder="Write a message…"
                        className="min-h-12 flex-1 resize-none rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/50"
                      />
                      <button
                        type="submit"
                        disabled={!draft.trim() || sending}
                        className="min-h-12 rounded-2xl border border-cyan-400/40 bg-cyan-400 px-5 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {sending ? "Sending…" : "Send"}
                      </button>
                    </div>
                    <div className="mt-2 text-[11px] text-slate-600">
                      Delivered internally first. Email follows account preferences;
                      SMS requires the paid add-on.
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center p-8">
                  <EmptyState scope={scope} />
                </div>
              )}
            </section>
          </div>
        )}

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
      </main>
    </div>
  );
}
