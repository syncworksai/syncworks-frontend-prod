import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Archive, ClipboardCheck, Clock3, ExternalLink, RefreshCw, ShieldCheck, Sparkles, XCircle } from "lucide-react";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { AVATARS } from "../components/sync/JarvisAvatar";

const BASE = "/sync-ai/assist/pilot/";
const executable = new Set(["CHIEF_OF_STAFF", "EXECUTIVE_ASSISTANT", "RESEARCH_ANALYST", "SALES_MANAGER", "MARKETING_MANAGER"]);
const duties = {
  CHIEF_OF_STAFF: "Summarize your approved specialist work, identify outstanding decisions and prepare a review-only briefing.",
  EXECUTIVE_ASSISTANT: "Organize owner-approved research and specialist results into a concise internal briefing.",
  RESEARCH_ANALYST: "Compile owner-entered prospect records into a documented internal report. Public search is separate and opt-in.",
  SALES_MANAGER: "Prepare unsent outreach drafts from research you've reviewed and approved.",
  MARKETING_MANAGER: "Prepare an internal campaign outline using previously approved research. Nothing is published automatically.",
  BUSINESS_MANAGER: "Business operations integration is not yet enabled.",
  FINANCE_MANAGER: "Finance integration is not yet enabled.",
  PROPERTY_MANAGER: "Property-manager integration is not yet enabled.",
  CUSTOMER_SERVICE: "Customer service integration is not yet enabled.",
  PERSONAL_TRAINER: "Health and personal-training integration is not yet enabled.",
};
const fmt = (date) => date ? new Date(date).toLocaleString() : "—";
const title = (value) => String(value || "").replaceAll("_", " ").toLowerCase().split(" ").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");

export default function SyncAssistEmployeeDashboard() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const permitted = String(user?.email || "").trim().toLowerCase() === "jacoblord7@outlook.com";
  const [team, setTeam] = useState([]);
  const [goals, setGoals] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState("tasks");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const employee = team.find((row) => row.id === employeeId);
  const portrait = AVATARS.find((row) => row.id === employeeId);
  const role = employee?.role;
  const tasks = useMemo(() => goals.flatMap((goal) => (goal.steps || [])
    .filter((step) => step.role === role)
    .map((step) => ({ ...step, goal_id: goal.id, goal: goal.goal, updated_at: goal.updated_at }))), [goals, role]);
  const workerEvents = useMemo(() => events.filter((event) => (
    (event.kind === "WORKER_RECEIPT" && event.role === role) ||
    (event.kind === "OWNER_PROGRESS" && tasks.some((step) => step.id === event.step_id))
  )), [events, tasks, role]);
  const historyMayBeIncomplete = events.length >= 100;
  const counts = {
    running: tasks.filter((step) => ["PLANNED", "IN_PROGRESS"].includes(step.status)).length,
    review: tasks.filter((step) => step.status === "AWAITING_APPROVAL").length,
    completed: tasks.filter((step) => step.status === "COMPLETED").length,
    blocked: tasks.filter((step) => step.status === "BLOCKED").length,
  };

  useEffect(() => {
    if (!permitted) { setLoading(false); return; }
    let alive = true;
    setLoading(true); setError("");
    Promise.all([
      api.get(BASE + "team/", { timeout: 15000 }),
      api.get(BASE + "workday/", { timeout: 15000 }),
      api.get(BASE + "workday/jobs/", { timeout: 15000 }),
      api.get(BASE + "workday/history/", { timeout: 15000 }),
    ]).then(([t, w, j, h]) => {
      if (!alive) return;
      setTeam(t.data.employees || []);
      setGoals(w.data.goals || []);
      setJobs(j.data.jobs || []);
      setEvents(h.data.events || []);
    }).catch((err) => {
      if (alive) setError(err?.response?.data?.detail || "Unable to load employee records.");
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [permitted, version]);

  if (!permitted) return <div className="grid min-h-dvh place-items-center bg-[#020817] p-6 text-white">Employee dashboards are available to the authorized private pilot only.</div>;
  if (!portrait) return <div className="grid min-h-dvh place-items-center bg-[#020817] text-white"><button onClick={() => navigate("/sync")}>Return to SYNC</button></div>;
  const queueByGoal = new Map(jobs.map((job) => [String(job.goal_id), job]));
  return (
    <div className="relative h-dvh overflow-hidden bg-[#020817] text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-65" style={{backgroundImage: 'linear-gradient(90deg,rgba(2,8,23,.93),rgba(2,8,23,.75)),url("/assist-themes/executive-office.svg")', backgroundSize:"cover", backgroundPosition:"center"}} />
      <main className="relative mx-auto flex h-full max-w-6xl flex-col gap-3 overflow-hidden px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
        <header className="flex shrink-0 items-center justify-between gap-2">
          <button type="button" onClick={() => navigate("/sync")} className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-cyan-400/30 bg-slate-950/70 px-3 text-xs font-bold"><ArrowLeft size={16}/> SYNC office</button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate("/sync/assist")} className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-white/20 bg-slate-950/75 px-3 text-xs font-bold"><ExternalLink size={15}/> Assign work</button>
            <button type="button" onClick={() => setVersion((n) => n+1)} aria-label="Refresh employee tasks" className="grid h-11 w-11 place-items-center rounded-xl border border-white/20 bg-slate-950/75"><RefreshCw size={17}/></button>
          </div>
        </header>
        <section className="flex shrink-0 items-center gap-3 rounded-2xl border border-cyan-400/30 bg-slate-950/70 p-3 backdrop-blur-xl">
          <img src={portrait.photo} alt="" className="h-16 w-16 shrink-0 rounded-full border-2 border-cyan-300 object-cover object-top shadow-[0_0_20px_rgba(34,211,238,.25)] sm:h-20 sm:w-20"/>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-cyan-300">Sync Assist · Employee workspace</p>
            <h1 className="truncate text-xl font-black sm:text-2xl">{employee?.name || portrait.name} <span className="text-cyan-300">— {title(role || portrait.role)}</span></h1>
            <p className="mt-1 line-clamp-2 text-xs text-slate-300">{duties[role] || "A specialist assignment role without an enabled worker integration."}</p>
          </div>
        </section>
        <div className="grid shrink-0 grid-cols-4 gap-2">
          {[
            ["Planned / active", counts.running, "text-cyan-200"],
            ["Needs approval", counts.review, "text-amber-200"],
            ["Completed", counts.completed, "text-emerald-200"],
            ["Blocked", counts.blocked, "text-rose-200"],
          ].map(([name, count, color]) => <div key={name} className="rounded-xl border border-white/15 bg-slate-950/70 p-2 text-center backdrop-blur-md"><strong className={"block text-xl tabular-nums " + color}>{count}</strong><span className="text-[10px] text-slate-300">{name}</span></div>)}
        </div>
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-950/75 backdrop-blur-xl">
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-3 pt-3">
            <div role="tablist" aria-label="Employee records" className="flex gap-1">
              {[[ "tasks", "Assigned tasks" ], [ "history", "Work history" ], [ "duties", "Job duties" ]].map(([id,label]) =>
                <button type="button" key={id} role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)} className={"min-h-11 rounded-t-lg px-3 text-xs font-bold " + (activeTab === id ? "border-b-2 border-cyan-300 bg-cyan-400/10 text-white" : "text-slate-400")}>{label}</button>)}
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3">
            {loading && <p role="status" className="p-3 text-sm text-slate-300">Loading employee records…</p>}
            {error && <p role="alert" className="rounded-lg border border-rose-400/30 p-3 text-sm text-rose-200">{error}</p>}
            {!loading && !error && activeTab === "tasks" && (tasks.length ? tasks.map((task) => {
              const job = queueByGoal.get(String(task.goal_id));
              return <article key={task.id} className="rounded-xl border border-white/15 bg-white/5 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{task.goal}</strong><span className="rounded-full border border-cyan-300/25 px-2 py-1 text-[10px] font-bold text-cyan-200">{title(task.status)}</span></div>
                <p className="mt-1 text-xs text-slate-300">{task.task}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-400"><span>Updated {fmt(task.updated_at)}</span>{job && <span>Queue {title(job.state)}</span>}</div>
                {task.worker_receipt && <details className="mt-2 rounded-lg border border-cyan-300/20 p-2 text-xs"><summary className="cursor-pointer text-cyan-200">View worker receipt and saved output</summary>
                  <p className="mt-2 text-slate-200">{task.worker_receipt.message}</p>
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all text-[10px] text-slate-300">{JSON.stringify({output:task.worker_receipt.output,sources:task.worker_receipt.sources},null,2)}</pre>
                </details>}
                {task.evidence && <p className="mt-2 text-xs text-slate-400">Owner evidence: {task.evidence}</p>}
                <button type="button" onClick={() => navigate("/sync/assist")} className="mt-3 inline-flex min-h-9 items-center gap-1 rounded-lg border border-cyan-400/30 px-3 text-xs text-cyan-200"><ClipboardCheck size={14}/> Review / manage assignment</button>
              </article>;
            }) : <p className="p-4 text-sm text-slate-300">No assignments for this role yet. Select “Assign work” to create the first task.</p>)}
            {!loading && !error && activeTab === "history" && (workerEvents.length ? workerEvents.map((event) =>
              <article key={event.event_id} className="rounded-xl border border-white/15 bg-white/5 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-xs text-cyan-200">{event.kind === "WORKER_RECEIPT" ? "Saved execution receipt" : "Owner review"}</strong><time className="text-[11px] text-slate-400">{fmt(event.timestamp)}</time></div>
                <p className="mt-1 text-xs text-slate-200">{event.message || event.evidence || "Recorded event"}</p>
                {event.receipt_id && <p className="mt-1 break-all text-[10px] text-slate-400">Receipt ID: {event.receipt_id}</p>}
                {event.output?.length > 0 && <details className="mt-2 text-xs"><summary className="cursor-pointer text-cyan-200">Inspect stored output and sources</summary><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all text-[10px]">{JSON.stringify({output:event.output,sources:event.sources},null,2)}</pre></details>}
              </article>) : <p className="p-4 text-sm text-slate-300">No employee execution receipts or owner reviews in the latest history window. This is not proof of completed work.</p>)}
            {!loading && !error && activeTab === "history" && historyMayBeIncomplete && <p className="rounded-lg border border-amber-400/25 p-2 text-xs text-amber-200">Only the most recent 100 events are loaded. Open Workday History to filter by a specific goal for older records.</p>}
            {!loading && !error && activeTab === "duties" &&
              <div className="space-y-3 rounded-xl border border-white/10 p-4">
                <div className="flex items-start gap-2 text-sm"><ShieldCheck className="mt-0.5 shrink-0 text-cyan-300" size={18}/><p>{duties[role] || "No permitted worker integration has been implemented for this role."}</p></div>
                <p className="text-xs text-slate-300">{executable.has(role) ? "Limited internal execution is available through Workday, subject to evidence and owner approval." : "This employee currently has no supported execution handler. Its role label does not grant access to other systems."}</p>
                <p className="text-xs text-amber-200">No unrestricted email sending, purchases, customer changes or external actions are enabled by choosing this employee.</p>
                <button type="button" onClick={() => navigate("/sync/assist")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-400/40 px-3 text-xs font-bold text-cyan-200"><Sparkles size={16}/> Open assignment center</button>
              </div>}
          </div>
        </section>
        <div className="flex shrink-0 items-center justify-between gap-2 text-[11px] text-slate-400"><span className="inline-flex items-center gap-1"><Archive size={13}/> Evidence is read-only; completing work requires owner attestation.</span><span className="hidden sm:block">SYNC Assist private pilot</span></div>
      </main>
    </div>
  );
}
