import React, { useEffect, useState } from "react";
import { ArrowLeft, Bot, CheckCircle2, ClipboardCheck, Clock3, ShieldCheck, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";

const PILOT = "jacoblord7@outlook.com";
const OPTIONS = [
  ["LEAD_FOLLOW_UP", "Lead follow-up"],
  ["TICKET_REVIEW", "Ticket review"],
  ["INVOICE_REMINDER", "Invoice reminder"],
  ["GENERAL", "General business task"],
];

export default function SyncAssistPilot() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const permitted = String(user?.email || "").trim().toLowerCase() === PILOT;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [kind, setKind] = useState("LEAD_FOLLOW_UP");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const result = await api.get("/sync-ai/assist/pilot/");
      setData(result.data);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to load the private pilot.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (permitted) refresh();
    else setLoading(false);
  }, [permitted]);

  async function createTask(event) {
    event.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await api.post("/sync-ai/assist/pilot/", {
        kind, title: title.trim(), description: description.trim(),
      });
      setData(response.data);
      setTitle("");
      setDescription("");
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not save task.");
    } finally {
      setBusy(false);
    }
  }

  async function decide(task, decision) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await api.post(`/sync-ai/assist/pilot/tasks/${encodeURIComponent(task.id)}/decision/`, { decision });
      setData(response.data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not record decision.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-dvh bg-[#020617] px-4 pb-36 pt-5 text-white">
      <div className="mx-auto max-w-4xl">
        <button type="button" onClick={() => navigate("/sync")} className="mb-5 inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200"><ArrowLeft size={16}/> Back to SYNC</button>
        <header className="mb-5 rounded-3xl border border-cyan-300/25 bg-gradient-to-br from-[#091c32] to-[#120c2c] p-5">
          <div className="flex items-center gap-3"><Bot className="h-8 w-8 text-cyan-300"/><div><p className="text-xs font-black uppercase tracking-[.17em] text-cyan-200">Private pilot</p><h1 className="text-2xl font-black">Sync Assist Control Center</h1></div></div>
          <p className="mt-3 text-sm leading-6 text-slate-300">Prepare business tasks, record approvals and track what's waiting. This first stage does not execute approved tasks or send customer communications.</p>
          <div className="mt-3 flex items-center gap-2 text-xs font-bold text-amber-200"><ShieldCheck size={16}/> Pilot access only · Automation worker not yet enabled</div>
        </header>
        {!permitted ? <div role="alert" className="rounded-2xl border border-rose-400/35 p-5 text-rose-200">This feature is restricted to the private pilot account.</div> : <>
          {error && <div role="alert" className="mb-4 rounded-xl border border-rose-400/40 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</div>}
          <div className="mb-5 grid grid-cols-3 gap-2">
            {[[Clock3, "Pending", data?.counts?.pending ?? "—"],[CheckCircle2, "Approved", data?.counts?.approved ?? "—"],[XCircle, "Rejected", data?.counts?.rejected ?? "—"]].map(([Icon,label,count]) => <div key={label} className="rounded-2xl border border-slate-700/70 bg-slate-900/50 p-3"><Icon size={20} className="text-cyan-300"/><div className="mt-2 text-2xl font-black">{count}</div><p className="text-xs text-slate-400">{label}</p></div>)}
          </div>
          <form onSubmit={createTask} className="mb-5 space-y-3 rounded-3xl border border-cyan-400/20 bg-slate-900/35 p-5">
            <h2 className="flex items-center gap-2 text-lg font-black"><ClipboardCheck className="text-cyan-300"/> Prepare a task</h2>
            <label className="block text-xs font-bold text-slate-300">Type
              <select value={kind} onChange={(event) => setKind(event.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border border-slate-600 bg-[#101a2d] p-3 text-white">{OPTIONS.map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select>
            </label>
            <label className="block text-xs font-bold text-slate-300">Task title
              <input required maxLength={140} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Follow up on unconfirmed customer lead" className="mt-1 block min-h-11 w-full rounded-xl border border-slate-600 bg-[#101a2d] p-3 text-sm text-white placeholder:text-slate-500"/>
            </label>
            <label className="block text-xs font-bold text-slate-300">Instructions (optional)
              <textarea maxLength={2000} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe what the assistant should prepare for review." className="mt-1 block w-full rounded-xl border border-slate-600 bg-[#101a2d] p-3 text-sm text-white placeholder:text-slate-500"/>
            </label>
            <button disabled={busy || !title.trim()} type="submit" className="min-h-11 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 py-3 text-sm font-black disabled:opacity-50">Save for review</button>
          </form>
          <section className="rounded-3xl border border-white/10 bg-slate-900/25 p-5">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-black">Task activity & approvals</h2><button type="button" disabled={busy || loading} onClick={refresh} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-cyan-200">Refresh</button></div>
            {loading && <p className="text-sm text-slate-400">Loading pilot records…</p>}
            {!loading && !data?.tasks?.length && <p className="text-sm text-slate-400">No tasks prepared yet. Create a task above to test the approval workflow.</p>}
            <div className="space-y-3">{(data?.tasks || []).map((task) => <article key={task.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-black">{task.title}</h3><span className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${task.status === "PENDING" ? "border-amber-400/40 text-amber-200" : task.status === "APPROVED" ? "border-emerald-400/40 text-emerald-200" : "border-rose-400/40 text-rose-200"}`}>{task.status}</span></div>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-cyan-200">{task.kind.replaceAll("_", " ")}</p>
              {task.description && <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-slate-300">{task.description}</p>}
              <p className="mt-2 text-[10px] text-slate-500">{new Date(task.created_at).toLocaleString()}</p>
              {task.status === "PENDING" ? <div className="mt-3 flex gap-2"><button disabled={busy} onClick={() => decide(task,"APPROVE")} className="min-h-10 flex-1 rounded-xl border border-emerald-400/40 bg-emerald-500/10 text-xs font-bold text-emerald-200 disabled:opacity-50">Approve (record only)</button><button disabled={busy} onClick={() => decide(task,"REJECT")} className="min-h-10 flex-1 rounded-xl border border-rose-400/30 bg-rose-500/10 text-xs font-bold text-rose-200 disabled:opacity-50">Reject</button></div> : <p className="mt-2 text-xs text-slate-400">{task.status === "APPROVED" ? "Approved for future authorized execution. Nothing has been sent." : "Rejected; no action taken."}</p>}
            </article>)}</div>
          </section>
        </>}
      </div>
    </main>
  );
}
