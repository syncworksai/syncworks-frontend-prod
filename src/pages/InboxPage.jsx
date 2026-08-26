// src/pages/InboxPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Mail, MessageSquareText, PlugZap, Search, Send, Settings2, Sparkles } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import ModeBar from "../components/ModeBar";
import BusinessPicker from "../components/BusinessPicker";

function cx(...parts) { return parts.filter(Boolean).join(" "); }
function safeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}
function formatTime(value) {
  if (!value) return "";
  try { return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)); } catch { return ""; }
}
function scopeFromPath(pathname, mode) {
  const path = String(pathname || "").toLowerCase();
  if (path.startsWith("/sbo") || path.startsWith("/employee")) return "BUSINESS";
  if (path.startsWith("/customer")) return "PERSONAL";
  return ["SBO", "EMPLOYEE"].includes(String(mode || "").toUpperCase()) ? "BUSINESS" : "PERSONAL";
}

function ThreadCard({ thread, active, onClick }) {
  const latest = thread?.latest_message;
  return (
    <button type="button" onClick={onClick} className={cx("w-full rounded-2xl border p-3 text-left transition", active ? "border-cyan-400/45 bg-cyan-500/[.10]" : thread?.needs_attention ? "border-amber-400/25 bg-amber-500/[.05]" : "border-white/10 bg-white/[.02] hover:border-white/20")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {thread?.is_unread ? <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-400" /> : null}
            {thread?.needs_attention ? <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-200">Attention</span> : null}
            <div className={cx("truncate text-sm text-white", thread?.is_unread ? "font-black" : "font-bold")}>{thread?.subject || thread?.ticket_code || "Conversation"}</div>
          </div>
          <div className="mt-1 truncate text-[11px] text-slate-500">{thread?.ticket_code || "SyncWorks"} · {String(thread?.status || "active").replaceAll("_", " ")}</div>
        </div>
        <span className="shrink-0 text-[10px] text-slate-600">{formatTime(thread?.updated_at)}</span>
      </div>
      <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{latest?.body || "No messages yet."}</div>
    </button>
  );
}

export default function InboxPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { mode, activeBusinessId } = useAuth();
  const scope = useMemo(() => scopeFromPath(location.pathname, mode), [location.pathname, mode]);
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
  const [error, setError] = useState("");
  const selected = useMemo(() => threads.find((thread) => Number(thread.id) === Number(selectedId)) || null, [threads, selectedId]);

  async function loadThreads({ preserveSelection = true } = {}) {
    if (scope === "BUSINESS" && !activeBusinessId) {
      setThreads([]); setSelectedId(null); setLoadingThreads(false); return;
    }
    setLoadingThreads(true); setError("");
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
      const stillExists = next.some((thread) => Number(thread.id) === Number(selectedId));
      if (!preserveSelection || !stillExists) setSelectedId(next[0]?.id || null);
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || requestError?.response?.data?.business?.[0] || "Inbox conversations could not be loaded.");
    } finally { setLoadingThreads(false); }
  }

  async function loadMessages(threadId) {
    if (!threadId) { setMessages([]); return; }
    setLoadingMessages(true); setError("");
    try {
      const response = await api.get(`/ticket-conversations/${threadId}/messages/?scope=${scope}`);
      setMessages(safeList(response?.data));
      setThreads((current) => current.map((thread) => Number(thread.id) === Number(threadId) ? { ...thread, ...(response?.data?.thread || {}), is_unread: false, unread_count: 0 } : thread));
      window.dispatchEvent(new CustomEvent("sw:inboxReadStateChanged", { detail: { scope, threadId } }));
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "This conversation could not be opened.");
      setMessages([]);
    } finally { setLoadingMessages(false); }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => loadThreads(), query ? 250 : 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, activeBusinessId, query, statusFilter, showArchived]);
  useEffect(() => { loadMessages(selectedId); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [selectedId, scope, activeBusinessId]);

  async function sendMessage(event) {
    event.preventDefault();
    const body = draft.trim();
    if (!selectedId || !body || sending) return;
    setSending(true); setError("");
    try {
      const response = await api.post(`/ticket-conversations/${selectedId}/messages/?scope=${scope}`, { body });
      setDraft("");
      const created = response?.data?.message;
      if (created) setMessages((current) => [...current, created]);
      await loadThreads({ preserveSelection: true });
    } catch (requestError) {
      setError(requestError?.response?.data?.body?.[0] || requestError?.response?.data?.detail || "Message could not be sent.");
    } finally { setSending(false); }
  }

  const title = scope === "BUSINESS" ? "Business Inbox" : "Personal Inbox";
  return (
    <div className="min-h-dvh bg-[#020617] text-slate-100">
      <ModeBar title={title} subtitle={scope === "BUSINESS" ? "Customer conversations routed by ticket and role" : "One place for conversations that need you"} rightActions={<div className="flex gap-2">{scope === "BUSINESS" ? <BusinessPicker /> : null}<button type="button" onClick={() => navigate(scope === "BUSINESS" ? "/sbo" : "/customer")} className="rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-xs font-black text-slate-200">Back</button></div>} />

      <main className="mx-auto max-w-[1500px] space-y-4 px-4 py-5 pb-28 lg:px-8">
        {scope === "PERSONAL" ? (
          <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-[1.7rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_90%_10%,rgba(139,92,246,.14),transparent_35%),rgba(2,6,23,.88)] p-5">
              <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200"><MessageSquareText className="h-5 w-5" /></span><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">SyncWorks Inbox</div><h1 className="mt-1 text-xl font-black text-white">Internal conversations, organized automatically</h1></div></div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Service conversations stay tied to their tickets. Unread and attention items rise first so the inbox remains a decision screen instead of a filing cabinet.</p>
              <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-black text-cyan-100">{unreadTotal} unread</span><span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black text-emerald-100">Internal first</span></div>
            </div>
            <div className="rounded-[1.7rem] border border-violet-400/20 bg-violet-500/[.055] p-5">
              <div className="flex items-center gap-2 text-sm font-black text-white"><Mail className="h-5 w-5 text-violet-200" />Connect external inboxes</div>
              <p className="mt-2 text-xs leading-5 text-slate-400">Connect Gmail or Outlook so SYNC can eventually rank important mail alongside your SyncWorks conversations without mixing spam into your service inbox.</p>
              <button type="button" onClick={() => navigate("/settings?tab=CONNECTIONS")} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-violet-400/25 bg-violet-500/10 px-3 text-xs font-black text-violet-100"><PlugZap className="h-4 w-4" />Connection settings</button>
              <div className="mt-2 text-[10px] leading-4 text-slate-500">Provider authorization is managed through Connections; SyncWorks will not ask for your email password.</div>
            </div>
          </section>
        ) : null}

        {error ? <div className="rounded-2xl border border-rose-400/25 bg-rose-500/[.08] p-4 text-sm text-rose-100">{error}</div> : null}

        {scope === "BUSINESS" && !activeBusinessId ? <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100">Select a business to open its inbox.</div> : (
          <div className="grid min-h-[68vh] gap-4 lg:grid-cols-[390px_minmax(0,1fr)]">
            <aside className="rounded-[1.7rem] border border-white/10 bg-slate-950/55 p-3">
              <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search service, ZIP, address, or message…" className="h-11 w-full rounded-xl border border-white/10 bg-slate-950 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/35" /></div>
              <div className="mt-2 grid grid-cols-2 gap-2"><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-xl border border-white/10 bg-slate-950 px-3 text-xs font-bold text-slate-300"><option value="">All active</option><option value="NEW">New</option><option value="ASSIGNED">Assigned</option><option value="SCHEDULED">Scheduled</option><option value="IN_PROGRESS">In progress</option><option value="COMPLETED">Completed</option><option value="INVOICED">Invoiced</option><option value="PAID">Paid</option></select><button type="button" onClick={() => setShowArchived((value) => !value)} className={cx("h-10 rounded-xl border text-xs font-black", showArchived ? "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-100" : "border-white/10 bg-white/[.025] text-slate-400")}>{showArchived ? "Archived" : "Active"}</button></div>
              <div className="mt-3 space-y-2">{loadingThreads ? <div className="rounded-2xl border border-white/10 p-4 text-sm text-slate-500">Organizing conversations…</div> : threads.length ? threads.map((thread) => <ThreadCard key={thread.id} thread={thread} active={Number(thread.id) === Number(selectedId)} onClick={() => setSelectedId(thread.id)} />) : <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center"><Sparkles className="mx-auto h-5 w-5 text-cyan-300" /><div className="mt-2 text-sm font-black text-white">Inbox is clear</div><div className="mt-1 text-xs text-slate-500">New service conversations will appear automatically.</div></div>}</div>
            </aside>

            <section className="flex min-h-[560px] flex-col rounded-[1.7rem] border border-white/10 bg-slate-950/55">
              {selected ? <>
                <header className="border-b border-white/10 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-200">{selected.ticket_code || "Conversation"}</div><h2 className="mt-1 text-lg font-black text-white">{selected.subject || "Service conversation"}</h2></div>{selected.needs_attention ? <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase text-amber-200">Needs attention</span> : null}</div></header>
                <div className="flex-1 space-y-3 overflow-y-auto p-4">{loadingMessages ? <div className="text-sm text-slate-500">Loading conversation…</div> : messages.map((message) => <div key={message.id} className={cx("max-w-[82%] rounded-2xl border px-4 py-3", message?.is_mine || message?.sender_scope === scope ? "ml-auto border-cyan-400/20 bg-cyan-500/[.08]" : "border-white/10 bg-white/[.03]")}><div className="text-sm leading-6 text-slate-200">{message.body}</div><div className="mt-1 text-[10px] text-slate-600">{formatTime(message.created_at)}</div></div>)}</div>
                <form onSubmit={sendMessage} className="border-t border-white/10 p-3"><div className="flex gap-2"><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message…" className="h-11 flex-1 rounded-xl border border-white/10 bg-slate-950 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/35" /><button type="submit" disabled={!draft.trim() || sending} className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 text-xs font-black text-white disabled:opacity-50"><Send className="h-4 w-4" />Send</button></div></form>
              </> : <div className="grid flex-1 place-items-center p-8 text-center"><div><Mail className="mx-auto h-8 w-8 text-slate-700" /><div className="mt-3 text-lg font-black text-white">Choose a conversation</div><div className="mt-1 text-sm text-slate-500">Messages and next actions will appear here.</div></div></div>}
            </section>
          </div>
        )}

        {scope === "PERSONAL" ? <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.02] p-4"><div><div className="flex items-center gap-2 text-xs font-black text-white"><Settings2 className="h-4 w-4 text-cyan-200" />Inbox preferences</div><div className="mt-1 text-xs text-slate-500">Manage connected services and the data SYNC may use.</div></div><button type="button" onClick={() => navigate("/settings?tab=CONNECTIONS")} className="rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-xs font-black text-slate-200">Manage connections</button></section> : null}
      </main>
    </div>
  );
}
