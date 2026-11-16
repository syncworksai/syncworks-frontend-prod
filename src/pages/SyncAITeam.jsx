import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bot, CheckCircle2, ClipboardList, LoaderCircle, Send, ShieldCheck, Users, X } from "lucide-react";
import api from "../api/client";

const API = "/sync-ai/assist/employees/";

export default function SyncAITeam() {
  const navigate = useNavigate();
  const [roster, setRoster] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function reload() {
    const [r, a] = await Promise.all([api.get(API), api.get(API + "assignments/")]);
    setRoster(r.data);
    setAssignments(a.data?.assignments || []);
  }
  useEffect(() => {
    let live = true;
    Promise.all([api.get(API), api.get(API + "assignments/")])
      .then(([r, a]) => { if (live) { setRoster(r.data); setAssignments(a.data?.assignments || []); } })
      .catch(() => { if (live) setError("The employee beta service is not available. Your existing Sync Assist is unchanged."); });
    return () => { live = false; };
  }, []);
  async function toggle(employee) {
    setBusy(employee.id); setError(""); setNotice("");
    try {
      await api.post(API + employee.id + "/activation/", { action: employee.active ? "DEACTIVATE" : "ACTIVATE" });
      await reload();
    } catch (e) { setError(e?.response?.data?.detail || "Unable to change employee status."); }
    finally { setBusy(""); }
  }
  async function assign(e) {
    e.preventDefault();
    if (!selected) return;
    setBusy("assign"); setError(""); setNotice("");
    try {
      await api.post(API + "assignments/", { employee_id: selected.id, title, instructions });
      await reload();
      setTitle(""); setInstructions("");
      setNotice("Assignment saved for review. Automated execution is not enabled yet.");
    } catch (e) { setError(e?.response?.data?.detail || "Unable to save assignment."); }
    finally { setBusy(""); }
  }
  return (
    <main className="min-h-dvh bg-[#030a18] px-4 pb-28 pt-6 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => navigate("/sync")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-300/30 px-4 text-sm"><ArrowLeft size={17}/> Sync Assist</button>
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">$0 during beta · no checkout</span>
        </header>
        <section className="rounded-3xl border border-cyan-400/25 bg-slate-950/70 p-5 backdrop-blur-lg md:p-8">
          <div className="flex items-center gap-3"><Users className="text-cyan-300"/><h1 className="text-2xl font-black md:text-4xl">Your AI Team</h1></div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Hire specialist assistants, give them assignments and manage your team. Your Chief of Staff is included. Employee actions are currently review-only; this beta does not send emails, browse automatically, schedule events or access bank accounts.</p>
        </section>
        {error && <div role="alert" className="rounded-xl border border-rose-400/40 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</div>}
        {notice && <div role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-950/30 p-4 text-sm text-emerald-200">{notice}</div>}
        {!roster && !error && <div className="flex items-center gap-2 text-sm text-cyan-200"><LoaderCircle className="animate-spin"/> Loading AI employees…</div>}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(roster?.employees || []).map(employee => (
            <article key={employee.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-cyan-400/20 bg-[#08152a]/80 p-5">
              <div>
                <div className="flex items-center justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-400/10"><Bot className="text-cyan-200"/></div><span className={employee.active ? "text-xs font-bold text-emerald-300" : "text-xs text-slate-400"}>{employee.active ? "ACTIVE" : "AVAILABLE"}</span></div>
                <h2 className="mt-3 text-lg font-bold">{employee.name}</h2>
                <p className="mt-2 text-sm text-slate-300">{employee.description}</p>
                <p className="mt-3 text-xs text-slate-400">{(employee.capabilities || []).map(s => s.replaceAll("_", " ")).join(" · ")}</p>
              </div>
              <div className="flex gap-2">
                <button disabled={busy === employee.id || employee.id === "chief_of_staff"} onClick={() => toggle(employee)} className="min-h-11 flex-1 rounded-xl border border-cyan-400/30 px-3 text-sm font-semibold text-cyan-100 disabled:opacity-50">{busy === employee.id ? "Saving…" : employee.id === "chief_of_staff" ? "Included" : employee.active ? "Pause" : "Activate free"}</button>
                <button disabled={!employee.active} onClick={() => setSelected(employee)} className="min-h-11 flex-1 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 px-3 text-sm font-semibold disabled:opacity-40">Open workspace</button>
              </div>
            </article>
          ))}
        </div>
        <section className="rounded-2xl border border-slate-700/70 bg-slate-950/70 p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold"><ClipboardList size={20}/> Assignments for review</h2>
          <p className="mt-1 text-sm text-slate-400">Saved requests are not being executed by background workers yet.</p>
          {assignments.length === 0 ? <p className="mt-4 text-sm text-slate-400">No assignments saved yet.</p> : <div className="mt-4 space-y-2">{assignments.slice(0, 20).map(a => <div key={a.id} className="rounded-xl border border-slate-800 p-3 text-sm"><strong>{a.title}</strong><p className="mt-1 text-xs text-slate-400">{a.employee_id?.replaceAll("_", " ")} · Queued for review</p></div>)}</div>}
        </section>
        {selected && <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/80 p-3 backdrop-blur-sm md:items-center" onClick={() => setSelected(null)}>
          <section role="dialog" aria-modal="true" aria-label={selected.name + " workspace"} className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-2xl border border-cyan-400/30 bg-[#07162b] p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h2 className="text-xl font-bold">{selected.name}</h2><button aria-label="Close" onClick={() => setSelected(null)}><X/></button></div>
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-300/20 p-3 text-xs text-slate-300"><ShieldCheck size={20} className="shrink-0 text-amber-300"/> Conversation and live execution are coming later. For now, save a task for review without performing external actions.</div>
            <form className="mt-4 space-y-4" onSubmit={assign}>
              <label className="block text-sm">Assignment title<input required maxLength={140} value={title} onChange={e => setTitle(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-600 bg-slate-950 px-3" placeholder="Find 20 local business prospects"/></label>
              <label className="block text-sm">Instructions<textarea required maxLength={2500} rows={5} value={instructions} onChange={e => setInstructions(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-950 p-3" placeholder="Describe the outcome you want…"/></label>
              <button disabled={busy === "assign"} type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 font-bold disabled:opacity-50"><Send size={17}/>{busy === "assign" ? "Saving…" : "Save assignment for review"}</button>
            </form>
          </section>
        </div>}
      </div>
    </main>
  );
}
