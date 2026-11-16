import React, { useEffect, useState } from "react";
import { Archive, ClipboardCopy, X } from "lucide-react";
import api from "../../api/client";

const BASE = "/sync-ai/assist/pilot/workday/history/";
const kindLabel = { GOAL_CREATED: "Goal created", WORKER_RECEIPT: "Employee execution receipt", OWNER_PROGRESS: "Owner review / progress" };
const niceDate = (value) => { try { return new Date(value).toLocaleString(); } catch { return value; } };

export default function SyncAssistWorkHistory({ goals = [], onReuse }) {
  const [open, setOpen] = useState(false);
  const [goalFilter, setGoalFilter] = useState("");
  const [events, setEvents] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setBusy(true); setError("");
    api.get(BASE, { params: goalFilter ? { goal_id: goalFilter } : {}, timeout: 15000 })
      .then(({ data }) => {
        if (!active) return;
        setEvents(data.events || []);
        setHasMore(Boolean(data.has_more));
      })
      .catch((err) => { if (active) setError(err?.response?.data?.detail || "Unable to load employee history."); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [open, goalFilter]);

  function reuse(item) {
    onReuse?.(item);
    setOpen(false);
  }

  return <>
    <button type="button" onClick={() => setOpen(true)}
      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-cyan-400/30 px-3 text-xs font-bold text-cyan-100 hover:border-cyan-300">
      <Archive size={15}/> Work history
    </button>
    {open && <div className="fixed inset-0 z-[260] flex justify-end bg-slate-950/75 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-label="Sync Assist employee work history" className="flex h-full w-full max-w-xl flex-col border-l border-cyan-400/35 bg-[#071225] text-white shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
          <div><p className="text-[10px] font-black uppercase tracking-widest text-cyan-300">Sync Assist · Evidence vault</p>
            <h2 className="text-xl font-black">Employee Work History</h2></div>
          <button type="button" onClick={() => setOpen(false)} className="grid h-11 w-11 place-items-center rounded-xl border border-white/20" aria-label="Close work history"><X size={20}/></button>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <p className="text-xs leading-5 text-slate-300">Every recorded goal, execution receipt, and owner review stays available to revisit. Previous drafts can be reused as new tasks; history is never erased or rewritten.</p>
          <label className="block text-xs font-bold text-slate-200">Filter by goal
            <select value={goalFilter} onChange={(e) => setGoalFilter(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-white/20 bg-slate-950 px-3 text-sm text-white">
              <option value="">All recent activity</option>
              {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.goal.slice(0,85)}</option>)}
            </select>
          </label>
          {busy && <p role="status" className="text-sm text-slate-300">Loading recorded evidence…</p>}
          {error && <p role="alert" className="rounded-lg border border-rose-400/30 p-3 text-xs text-rose-200">{error}</p>}
          {!busy && !error && !events.length && <p className="text-sm text-slate-400">No recorded work yet. Create an assignment to begin the audit trail.</p>}
          {!busy && events.map((event) => {
            const goal = goals.find((item) => item.id === event.goal_id);
            return <article key={event.event_id} className="space-y-2 rounded-2xl border border-white/15 bg-slate-900/45 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-xs text-cyan-200">{kindLabel[event.kind] || event.kind}</strong>
                <time className="text-[11px] text-slate-400" dateTime={event.timestamp}>{niceDate(event.timestamp)}</time>
              </div>
              <p className="break-words text-xs font-semibold text-white">{goal?.goal || event.goal || "Recorded work"}</p>
              {event.role && <p className="text-xs text-slate-300">Employee role: {event.role.replaceAll("_", " ")}</p>}
              {event.status && <p className="text-xs text-slate-300">Status: <strong>{event.status.replaceAll("_", " ")}</strong></p>}
              {event.message && <p className="whitespace-pre-wrap break-words text-xs text-slate-300">{event.message}</p>}
              {event.evidence && <p className="whitespace-pre-wrap break-words text-xs text-slate-300">Owner evidence: {event.evidence}</p>}
              {event.kind === "WORKER_RECEIPT" && <div className="text-[11px] text-slate-400">
                <div>Receipt: {event.receipt_id}</div>
                <div>Workflow: {event.workflow_version || "unknown"} · {event.output?.length || 0} output records · {event.messages_sent || 0} messages sent</div>
                {Boolean(event.output?.length) && <details className="mt-2 rounded-lg border border-white/10 p-2"><summary className="cursor-pointer text-cyan-200">View saved output and sources</summary>
                  <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all text-[10px] text-slate-200">{JSON.stringify({ output: event.output, sources: event.sources }, null, 2)}</pre>
                </details>}
              </div>}
              {event.kind === "GOAL_CREATED" && <button type="button" onClick={() => reuse(event)}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-cyan-400/35 px-3 text-xs font-bold text-cyan-100"><ClipboardCopy size={14}/> Reuse as new draft</button>}
            </article>;
          })}
          {hasMore && <p className="text-[11px] text-amber-200">Showing the latest 100 records. Select a goal to narrow the history.</p>}
          <p className="text-[11px] leading-5 text-amber-200">This is a recorded work log, not a general undo feature. Previously sent emails, charges, or external changes cannot be reversed by reopening a task.</p>
        </div>
      </section>
    </div>}
  </>;
}
