// src/components/investor/InvestorInbox.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/client";
import Button from "../ui/Button";

function Pill({ children, tone = "slate" }) {
  const cls =
    tone === "purple"
      ? "border-fuchsia-500/40 text-fuchsia-200 bg-fuchsia-500/10"
      : tone === "cyan"
      ? "border-cyan-500/40 text-cyan-200 bg-cyan-500/10"
      : tone === "emerald"
      ? "border-emerald-500/40 text-emerald-200 bg-emerald-500/10"
      : tone === "amber"
      ? "border-amber-500/40 text-amber-200 bg-amber-500/10"
      : tone === "rose"
      ? "border-rose-500/40 text-rose-200 bg-rose-500/10"
      : "border-slate-700 text-slate-300 bg-slate-950/40";

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full border text-[11px] ${cls}`}>
      {children}
    </span>
  );
}

function fmtTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return "";
  }
}

function statusTone(status) {
  const s = String(status || "").toUpperCase();
  if (s === "OPEN") return "emerald";
  if (s === "CLOSED") return "slate";
  if (s === "PENDING") return "amber";
  return "cyan";
}

export default function InvestorInbox({ className = "" }) {
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");

  const [refreshTick, setRefreshTick] = useState(0);
  const scrollRef = useRef(null);

  function toastOk(msg) {
    setOk(msg || "");
    setErr("");
  }
  function toastErr(msg) {
    setErr(msg || "Something went wrong.");
    setOk("");
  }

  async function loadThreads() {
    setLoadingThreads(true);
    setErr("");
    setOk("");
    try {
      const r = await api.get("/investor/inbox/threads/");
      const results = Array.isArray(r.data?.results) ? r.data.results : [];
      setThreads(results);

      // Auto-select first thread if none selected
      if (!activeThreadId && results.length) {
        setActiveThreadId(results[0].id);
      } else if (activeThreadId && !results.find((t) => t.id === activeThreadId) && results.length) {
        setActiveThreadId(results[0].id);
      }
    } catch (e) {
      toastErr(e?.response?.data?.detail || e?.message || "Failed to load threads.");
    } finally {
      setLoadingThreads(false);
    }
  }

  async function loadMessages(threadId) {
    if (!threadId) return;
    setLoadingMsgs(true);
    setErr("");
    setOk("");
    try {
      const r = await api.get(`/investor/inbox/threads/${threadId}/messages/`);
      const results = Array.isArray(r.data?.results) ? r.data.results : [];
      setMessages(results);
    } catch (e) {
      toastErr(e?.response?.data?.detail || e?.message || "Failed to load messages.");
    } finally {
      setLoadingMsgs(false);
    }
  }

  async function sendMessage() {
    const tid = activeThreadId;
    const body = String(draft || "").trim();
    if (!tid) return toastErr("Pick a thread first.");
    if (!body) return toastErr("Type a message.");

    setErr("");
    setOk("");
    try {
      await api.post(`/investor/inbox/threads/${tid}/send/`, { body });
      setDraft("");
      toastOk("Sent.");
      await loadMessages(tid);
      await loadThreads(); // keep ordering/last message fresh
    } catch (e) {
      toastErr(e?.response?.data?.detail || e?.message || "Failed to send.");
    }
  }

  const activeThread = useMemo(() => threads.find((t) => t.id === activeThreadId) || null, [threads, activeThreadId]);

  useEffect(() => {
    loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick]);

  useEffect(() => {
    if (!activeThreadId) return;
    loadMessages(activeThreadId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeThreadId]);

  useEffect(() => {
    // scroll to bottom on new messages
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  return (
    <div className={`rounded-3xl border border-slate-800 bg-slate-950/40 ${className}`}>
      <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-xs text-slate-400 tracking-widest">INVESTOR INBOX</div>
          <div className="text-lg font-semibold text-slate-100">Messages with your Property Manager</div>
          <div className="text-xs text-slate-400 mt-1">
            This inbox is separate from platform notifications (top nav). It’s strictly PM ↔ Investor.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button tone="slate" onClick={() => setRefreshTick((x) => x + 1)} disabled={loadingThreads || loadingMsgs}>
            Refresh
          </Button>
          {activeThread ? <Pill tone={statusTone(activeThread.status)}>{String(activeThread.status || "—")}</Pill> : null}
        </div>

        {err ? (
          <div className="w-full text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-2xl p-3">
            {err}
          </div>
        ) : null}
        {ok ? (
          <div className="w-full text-sm text-emerald-200 bg-emerald-900/15 border border-emerald-700/30 rounded-2xl p-3">
            {ok}
          </div>
        ) : null}
      </div>

      <div className="grid md:grid-cols-[360px_1fr]">
        {/* LEFT: thread list */}
        <div className="border-r border-slate-800">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-400">Threads</div>
              {loadingThreads ? <div className="text-[11px] text-slate-500">Loading…</div> : null}
            </div>

            <div className="mt-3 space-y-2 max-h-[520px] overflow-auto pr-1">
              {threads.length === 0 && !loadingThreads ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-300">
                  No threads yet. Your PM will start one when they link a property to you.
                </div>
              ) : null}

              {threads.map((t) => {
                const isActive = t.id === activeThreadId;
                const last = t.last_message;
                const lastText = last?.body ? String(last.body) : "";
                const lastFrom = last?.from_side ? String(last.from_side) : "";
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveThreadId(t.id)}
                    className={[
                      "w-full text-left rounded-2xl border p-3 transition",
                      isActive
                        ? "border-fuchsia-500/40 bg-fuchsia-500/10"
                        : "border-slate-800 bg-slate-950/40 hover:bg-slate-900/40",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-100 truncate">
                          {t.subject ? String(t.subject) : `Thread #${t.id}`}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex gap-2 flex-wrap">
                          <Pill tone={statusTone(t.status)}>{String(t.status || "—")}</Pill>
                          <span className="text-slate-500">{fmtTime(t.updated_at || t.created_at)}</span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        <Pill tone="cyan">PM ↔ You</Pill>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-slate-300 line-clamp-2">
                      {lastText ? (
                        <>
                          <span className="text-slate-400">{lastFrom === "PM" ? "PM: " : "You: "}</span>
                          {lastText}
                        </>
                      ) : (
                        <span className="text-slate-500">No messages yet</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT: messages */}
        <div className="flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs text-slate-400">Active Thread</div>
              <div className="font-semibold text-slate-100 truncate">
                {activeThread ? (activeThread.subject ? String(activeThread.subject) : `Thread #${activeThread.id}`) : "—"}
              </div>
            </div>
            {loadingMsgs ? <div className="text-[11px] text-slate-500">Loading…</div> : null}
          </div>

          <div ref={scrollRef} className="p-4 space-y-3 overflow-auto max-h-[520px]">
            {!activeThread ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-300">
                Select a thread to view messages.
              </div>
            ) : null}

            {activeThread && messages.length === 0 && !loadingMsgs ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-300">
                No messages yet. Send the first message.
              </div>
            ) : null}

            {messages.map((m) => {
              const from = String(m.from_side || "").toUpperCase();
              const isMine = from === "INVESTOR";
              return (
                <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={[
                      "max-w-[680px] rounded-2xl border px-4 py-3",
                      isMine
                        ? "border-cyan-500/30 bg-cyan-500/10 text-slate-100"
                        : "border-slate-800 bg-slate-950/50 text-slate-100",
                    ].join(" ")}
                  >
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <Pill tone={isMine ? "cyan" : "purple"}>{isMine ? "You" : "PM"}</Pill>
                      <span className="text-slate-500">{fmtTime(m.created_at)}</span>
                    </div>
                    <div className="mt-2 text-sm whitespace-pre-wrap leading-relaxed">{String(m.body || "")}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* composer */}
          <div className="p-4 border-t border-slate-800">
            <div className="flex gap-2 items-end">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a message to your PM…"
                className="flex-1 min-h-[44px] max-h-[140px] rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500/40"
              />
              <Button tone="cyan" onClick={sendMessage} disabled={!activeThreadId || loadingMsgs}>
                Send
              </Button>
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              Tip: keep requests specific (dates, vendor access times, approvals).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
