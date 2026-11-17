import React, { useCallback, useEffect, useState } from "react";
import api from "../../api/client";
import SyncAssistWorkHistory from "./SyncAssistWorkHistory";

const BASE = "/sync-ai/assist/pilot/workday/";
const ROLES = [
  ["CHIEF_OF_STAFF", "Chief of Staff"],
  ["EXECUTIVE_ASSISTANT", "Executive Assistant"],
  ["RESEARCH_ANALYST", "Research Analyst"],
  ["SALES_MANAGER", "Sales Manager"],
  ["MARKETING_MANAGER", "Marketing Manager"],
  ["BUSINESS_MANAGER", "Business Manager"],
  ["FINANCE_MANAGER", "Finance Manager"],
  ["PROPERTY_MANAGER", "Property Manager"],
  ["CUSTOMER_SERVICE", "Customer Service"],
  ["PERSONAL_TRAINER", "Personal Trainer"],
];
const STATUS = ["PLANNED", "IN_PROGRESS", "BLOCKED", "AWAITING_APPROVAL", "COMPLETED"];

export default function SyncAssistWorkdayPanel() {
  const [data, setData] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [workerStatus, setWorkerStatus] = useState(null);
  const [teamEmployees, setTeamEmployees] = useState([]);
  const [goal, setGoal] = useState("");
  const [role, setRole] = useState("RESEARCH_ANALYST");
  const [task, setTask] = useState("");
  const [publicMode, setPublicMode] = useState(false);
  const [publicQuery, setPublicQuery] = useState("");
  const [draftSteps, setDraftSteps] = useState([]);
  const [editing, setEditing] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetRole, setBudgetRole] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("3.00");
  const [budgetBusy, setBudgetBusy] = useState(false);
  const [budgetError, setBudgetError] = useState("");
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [allGoalsOpen, setAllGoalsOpen] = useState(false);
  const [draftDrawer, setDraftDrawer] = useState(false);

  const refresh = useCallback(async () => {
    try {
      // A queue status error must not hide otherwise accessible goals.
      const [goalResult, jobResult] = await Promise.allSettled([
        api.get(BASE, { timeout: 15000 }),
        api.get(BASE + "jobs/", { timeout: 15000 }),
      ]);
      if (goalResult.status === "fulfilled") {
        setData(goalResult.value.data);
      }
      if (jobResult.status === "fulfilled") {
        setJobs(jobResult.value.data.jobs || []);
        setWorkerStatus(jobResult.value.data);
      } else {
        setWorkerStatus(null);
      }
      if (goalResult.status === "rejected") {
        const err = goalResult.reason;
        const code = Number(err?.response?.status || 0);
        setError(err?.response?.data?.detail || (code ? `Workday goals request failed (HTTP ${code}). Check the signed-in session or try Refresh.` : "Could not reach the workday goals API. Check connection or try Refresh."));
      } else if (jobResult.status === "rejected") {
        const err = jobResult.reason;
        const code = Number(err?.response?.status || 0);
        setError(code ? `Background queue status unavailable (HTTP ${code}). Goal creation and manual steps may still work.` : "Background queue status is unreachable. Goal creation and manual steps may still work.");
      } else {
        setError("");
      }
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to load workday goals. Please retry.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { window.dispatchEvent(new CustomEvent("sync-assist:task-dialog", { detail: { open: Boolean(selectedGoalId) } })); return () => window.dispatchEvent(new CustomEvent("sync-assist:task-dialog", { detail: { open: false } })); }, [selectedGoalId]);
  useEffect(() => {
    let active = true;
    api.get("/sync-ai/assist/pilot/team/", { timeout: 15000 })
      .then(({ data }) => {
        if (!active) return;
        const configured = Array.isArray(data?.employees) ? data.employees : [];
        setTeamEmployees(configured);
        if (configured.length) {
          setRole((current) => configured.some((entry) => entry.role === current) ? current : configured[0].role);
        }
      })
      .catch(() => { /* Workday remains available if team preferences cannot load. */ });
    return () => { active = false; };
  }, []);

  async function saveEmployeeBudget(event) {
    event.preventDefault();
    if (!budgetRole || budgetBusy) return;
    setBudgetBusy(true); setBudgetError("");
    try {
      const { data: budget } = await api.post("/sync-ai/assist/pilot/budget/", {
        role: budgetRole, limit_usd: budgetAmount,
      }, { timeout: 15000 });
      setWorkerStatus((previous) => ({ ...previous, pilot_budget: budget }));
      setBudgetRole("");
    } catch (err) {
      setBudgetError(err?.response?.data?.detail || "Could not update employee allowance.");
    } finally {
      setBudgetBusy(false);
    }
  }

  function reuseHistoricalGoal(record) {
    // Reuse is a new task draft. It cannot overwrite completed work or undo
    // external actions; the original audit event remains intact.
    setGoal(String(record.goal || "").slice(0, 500));
    setDraftSteps((Array.isArray(record.steps) ? record.steps : [])
      .filter((step) => ROLES.some(([id]) => id === step.role) && typeof step.task === "string")
      .slice(0, 8).map((step) => ({ role: step.role, task: step.task.slice(0, 500) })));
    setPublicMode(false);
    setPublicQuery("");
    setError("");
    setDraftDrawer(true);
  }

  function addStep() {
    if (!task.trim() || draftSteps.length >= 8) return;
    setDraftSteps((steps) => [...steps, { role, task: task.trim() }]);
    setTask("");
  }

  async function createGoal(event) {
    event.preventDefault();
    const steps = task.trim() && draftSteps.length < 8
      ? [...draftSteps, { role, task: task.trim() }]
      : draftSteps;
    if (busy || !goal.trim() || !steps.length || (publicMode && (publicQuery.trim().length < 4 || !steps.some((step) => step.role === "RESEARCH_ANALYST")))) return;
    setBusy(true); setError("");
    try {
      const response = await api.post(BASE, {
        goal: goal.trim(), steps,
        source_mode: publicMode ? "PUBLIC_SEARCH" : "INTERNAL_ONLY",
        public_search_query: publicMode ? publicQuery.trim() : "",
        allow_external_search: publicMode,
      });
      setData(response.data);
      setGoal(""); setTask(""); setDraftSteps([]); setPublicMode(false); setPublicQuery("");
      setLoaded(true);
    } catch (err) {
      const status = Number(err?.response?.status || 0);
      setError(err?.response?.data?.detail || (status ? `Could not create goal (HTTP ${status}).` : "Unable to contact the workday API to create your goal."));
    } finally {
      setBusy(false);
    }
  }

  async function runInternalStep(goalId) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await api.post(
        BASE + encodeURIComponent(goalId) + "/run/", {},
        { timeout: 20000 },
      );
      setData(response.data);
    } catch (err) {
      setError(err?.response?.data?.detail || "No internal task could be executed. Check approvals or retry.");
    } finally {
      setBusy(false);
    }
  }

  async function queueGoal(goalId) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      await api.post(BASE + "jobs/", {
        goal_id: goalId, allow_background_internal: true,
      });
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to queue this goal.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelGoal(goalId) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      await api.post(BASE + "jobs/" + encodeURIComponent(goalId) + "/cancel/");
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to cancel the queued job.");
    } finally {
      setBusy(false);
    }
  }

  async function updateStep(goalId, step) {
    const current = editing[step.id] || {};
    const status = current.status || step.status;
    const evidence = (current.evidence || "").trim();
    if (status === "COMPLETED" && evidence.length < 15) {
      setError("To confirm completion, enter at least 15 characters of verified evidence.");
      return;
    }
    setBusy(true); setError("");
    try {
      const response = await api.post(
        BASE + encodeURIComponent(goalId) + "/steps/" + encodeURIComponent(step.id) + "/",
        { status, evidence, owner_attested: status === "COMPLETED" },
      );
      setData(response.data);
      // Only dismiss after the server confirms every assignment in this goal
      // is completed. A partial approval, failed save, or other status keeps
      // the modal open so the user can continue reviewing pending work.
      const updatedGoal = (response.data?.goals || []).find(
        (item) => String(item.id) === String(goalId),
      );
      const allCompleted = status === "COMPLETED" &&
        updatedGoal?.status === "COMPLETED" &&
        updatedGoal.steps?.length > 0 &&
        updatedGoal.steps.every((item) => item.status === "COMPLETED");
      if (allCompleted) {
        setSelectedGoalId(null);
        setSelectedTaskId(null);
        setSuccessMessage("Goal completed. Both employees' work and receipts are saved in Work history.");
      }
      await refresh();
      setEditing((previous) => {
        const copy = { ...previous };
        delete copy[step.id];
        return copy;
      });
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to record progress.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`sw-assist-panel sw-assist-workday flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-cyan-400/30 p-2 sm:p-3 ${selectedGoalId ? "sw-assist-modal-open" : ""}`} aria-label="AI workforce workday">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-cyan-200">Workforce command center</p>
          <h2 className="mt-0.5 text-base font-black">Goals and employee assignments</h2>
          <p className="sr-only">
            Run restricted research and drafting tasks, review real receipts, and optionally enroll internal work in the durable background queue.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {workerStatus?.pilot_budget && <button type="button" onClick={() => setBudgetOpen(true)} className="min-h-10 rounded-xl border border-emerald-400/30 bg-emerald-900/10 px-3 text-xs font-black text-emerald-100" title="Shared monthly agent paid-tool budget">AI budget ${workerStatus.pilot_budget.remaining_usd} left</button>}
          <SyncAssistWorkHistory goals={data?.goals || []} onReuse={reuseHistoricalGoal}/>
          <button type="button" disabled={busy} onClick={refresh} className="min-h-10 rounded-xl border border-cyan-400/30 px-3 text-xs font-bold text-cyan-100">Refresh</button>
        </div>
      </div>
      {data && <div className="mt-1 flex shrink-0 flex-wrap gap-1 text-[11px]">
        {Object.entries(data.counts || {}).filter(([, count]) => count > 0).map(([name, count]) => (
          <span key={name} className="rounded-lg border border-white/15 bg-slate-950/70 px-2 py-1">
            <strong className="text-cyan-200">{count}</strong> {name.replaceAll("_", " ")}
          </span>
        ))}
      </div>}
      {workerStatus && <p className="mt-1 shrink-0 truncate text-[10px] text-amber-200">
        Durable queue records are available. Independent worker deployed: {workerStatus.worker_deployed ? "reported active" : "not yet verified"}.
        Jobs execute unattended only after a separately configured worker is enabled.
      </p>}
      {successMessage && <div role="status" className="mt-1 flex shrink-0 items-center justify-between gap-2 rounded-lg border border-emerald-400/35 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-100"><span>{successMessage}</span><button type="button" onClick={() => setSuccessMessage("")} aria-label="Dismiss completion confirmation" className="rounded-md border border-emerald-400/35 px-2 py-1">Dismiss</button></div>}
      {error && <div role="alert" className="mt-2 flex shrink-0 items-center justify-between gap-2 rounded-xl border border-rose-400/30 bg-rose-950/20 p-2 text-xs text-rose-200"><span>{error}</span><button type="button" onClick={refresh} disabled={busy} className="shrink-0 rounded-lg border border-rose-400/40 px-2 py-1">Retry</button></div>}
      <div className="mt-2 grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-y-auto lg:grid-cols-[minmax(320px,0.95fr)_minmax(360px,1.05fr)] lg:overflow-hidden">
      <form onSubmit={createGoal} className="sw-assist-surface min-h-0 space-y-2 overflow-hidden rounded-xl border border-white/10 p-2.5">
        <label className="block text-xs font-bold text-slate-200">Business goal
          <textarea required value={goal} onChange={(event) => setGoal(event.target.value)} maxLength={500} rows={1} placeholder="e.g. Build a qualified property management lead pipeline" className="mt-1 w-full resize-none rounded-lg border border-slate-600 bg-slate-950 p-2 text-sm text-white"/>
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block text-xs font-bold text-slate-200">Assigned employee
            <select value={role} onChange={(event) => setRole(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-slate-600 bg-slate-950 p-2 text-sm text-white">
              {(teamEmployees.length
                ? teamEmployees.map((employee) => [employee.role, employee.name + " — " + (ROLES.find(([id]) => id === employee.role)?.[1] || employee.role)])
                : ROLES).map(([id, name]) => <option value={id} key={id}>{name}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold text-slate-200">Assignment
            <input value={task} onChange={(event) => setTask(event.target.value)} maxLength={500} placeholder="Describe the employee's job" className="mt-1 min-h-10 w-full rounded-lg border border-slate-600 bg-slate-950 p-2 text-sm text-white"/>
          </label>
        </div>
        <label className="flex items-start gap-2 text-xs text-slate-200">
          <input type="checkbox" checked={publicMode} onChange={(event) => setPublicMode(event.target.checked)} className="mt-1"/>
          <span>Optional public web search (sends only the entered query; results are unverified)</span>
        </label>
        {publicMode && <label className="block text-xs font-bold text-slate-200">Public search query (no private or customer information)
          <input required minLength={4} maxLength={120} value={publicQuery} onChange={(event) => setPublicQuery(event.target.value)} placeholder="e.g. commercial property management companies in Birmingham Alabama" className="mt-1 min-h-11 w-full rounded-xl border border-slate-600 bg-slate-950 p-3 text-sm text-white"/>
          <span className="mt-1 block font-normal text-amber-200">Only available when the backend search integration is configured and enabled.</span>
        </label>}
        <button type="button" disabled={!task.trim() || draftSteps.length >= 8} onClick={addStep} className="min-h-9 rounded-lg border border-cyan-400/30 px-3 text-xs font-bold text-cyan-100 disabled:opacity-40">Add assignment</button>
        {draftSteps.length > 0 && <button type="button" onClick={() => setDraftDrawer(true)} className="text-xs font-bold text-cyan-200 underline underline-offset-2">{draftSteps.length} added assignment(s) · View / remove</button>}
        <button type="submit" disabled={busy || !goal.trim() || (!task.trim() && draftSteps.length === 0) || (publicMode && (publicQuery.trim().length < 4 || !(role === "RESEARCH_ANALYST" && task.trim()) && !draftSteps.some((step) => step.role === "RESEARCH_ANALYST")))} className="min-h-10 w-full rounded-lg bg-gradient-to-r from-cyan-500 to-violet-600 px-3 py-2 text-sm font-bold disabled:opacity-40">{busy ? "Saving goal…" : "Create goal & assign employee"}</button>

      </form>
      <div className="sw-assist-surface min-h-0 space-y-2 overflow-hidden rounded-xl border border-white/10 p-2.5">
        <h3 className="text-sm font-black text-white">Assigned work & results</h3>
        {!loaded && <p className="text-xs text-slate-400">Loading recorded goals…</p>}
        {loaded && data?.goals?.length === 0 && <p className="text-xs text-slate-400">No coordinated goals saved yet.</p>}
        {(data?.goals || []).slice(0,3).map((item) => <article key={item.id} className="sw-assist-task-card rounded-xl border border-white/15 p-2.5">
          <div className="flex items-start justify-between gap-2"><h4 className="min-w-0 flex-1 line-clamp-2 text-xs font-bold leading-5">{item.goal}</h4><span className="shrink-0 rounded-lg border border-cyan-400/25 px-2 py-1 text-[10px] text-cyan-200">{item.status.replaceAll("_", " ")}</span></div>
          <p className="mt-1 text-[11px] text-slate-400">{item.steps?.length || 0} assignment(s) · {(item.steps || []).filter(step => step.worker_receipt).length} receipt(s)</p>
          <button type="button" onClick={() => setSelectedGoalId(item.id)} className="mt-2 min-h-9 rounded-lg border border-cyan-400/35 px-3 text-xs font-bold text-cyan-100">View more · Review / run</button>
        </article>)}
        {(data?.goals || []).length > 3 && <button type="button" onClick={() => setAllGoalsOpen(true)} className="min-h-9 rounded-xl border border-white/20 text-xs font-bold text-cyan-200">View all goals ({(data?.goals || []).length})</button>}
      </div>
      </div>
      {selectedGoalId && <div className="sw-assist-dialog-overlay sw-assist-task-overlay fixed inset-0 z-[260] flex items-center justify-center p-2 sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedGoalId(null); }}>
        <section role="dialog" aria-modal="true" aria-label="Goal details and execution" className="sw-assist-detail-dialog sw-assist-centered-task flex min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-cyan-400/30 text-white">
          <div className="sw-assist-detail-header flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
            <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Sync Assist / Employee work</p><h2 className="mt-1 text-lg font-black">Task details · Receipts · Approval</h2></div>
            <button type="button" onClick={() => setSelectedGoalId(null)} className="min-h-11 rounded-lg border border-cyan-400/40 px-4 text-sm font-bold">Close</button>
          </div>
          <div className="min-h-0 flex-1 p-3 sm:p-4">
            {(data?.goals || []).filter((item) => item.id === selectedGoalId).map((item) => {
              const chosen = item.steps.find(step => step.id === selectedTaskId) || item.steps[0];
              const edit = chosen ? editing[chosen.id] || {} : {};
              const selection = chosen ? edit.status || chosen.status : "PLANNED";
              return <div key={item.id} className="flex h-full min-h-0 flex-col gap-3">
                <div className="flex shrink-0 flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-sm font-black sm:text-base">{item.goal}</h3>
                    <p className="mt-1 text-xs text-slate-300">{item.steps.length} employee assignment(s) · {item.steps.filter(step => step.worker_receipt).length} saved receipt(s)</p>
                  </div>
                  <span className="rounded-lg border border-cyan-400/25 px-2 py-1 text-xs font-bold text-cyan-200">{item.status.replaceAll("_", " ")}</span>
                </div>
                <div className="sw-assist-execution-bar flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-400/20 bg-slate-950/35 p-2">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busy || item.status === "COMPLETED"} onClick={() => runInternalStep(item.id)} className="min-h-11 rounded-lg border border-cyan-400/50 bg-cyan-500/15 px-4 text-xs font-black text-cyan-100 disabled:opacity-40">Run next internal step</button>
                    <button type="button" disabled={busy || item.status === "COMPLETED"} onClick={() => queueGoal(item.id)} className="min-h-10 rounded-lg border border-amber-400/30 px-3 text-xs font-bold text-amber-200 disabled:opacity-40">Authorize internal queue</button>
                    {jobs.some(job => String(job.goal_id) === String(item.id) && ["QUEUED","RUNNING","WAITING","RETRY"].includes(job.state)) &&
                      <button type="button" disabled={busy} onClick={() => cancelGoal(item.id)} className="min-h-10 rounded-lg border border-rose-400/30 px-3 text-xs text-rose-200">Cancel job</button>}
                  </div>
                  <span className="text-[10px] text-slate-300">Internal tasks only · No outbound sends</span>
                </div>
                <div className="sw-assist-employee-choices grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-2">
                  {item.steps.map((step) =>
                    <button key={step.id} type="button" onClick={() => setSelectedTaskId(step.id)} aria-pressed={chosen?.id === step.id}
                      className={"sw-assist-task-choice flex min-w-0 items-center justify-between gap-3 rounded-xl border p-3 text-left " + (chosen?.id === step.id ? "border-cyan-300/65 bg-cyan-400/15" : "border-cyan-300/20 bg-slate-950/30")}>
                      <span className="min-w-0"><strong className="block text-xs text-white">{step.role.replaceAll("_", " ")}</strong><span className="mt-1 block text-[11px] text-slate-300">{step.worker_receipt ? "Saved execution receipt" : "No execution receipt yet"}</span></span>
                      <span className="shrink-0 rounded-lg border border-cyan-400/30 px-2 py-1 text-[10px] font-bold text-cyan-200">{step.status.replaceAll("_", " ")}</span>
                    </button>
                  )}
                </div>
                {chosen && <div className="sw-assist-focused-task sw-assist-step-card flex min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-xl border border-white/10 p-3">
                  <div className="flex shrink-0 flex-wrap items-center justify-between gap-2"><strong className="text-xs text-cyan-200">{chosen.role.replaceAll("_", " ")}</strong><span className="text-[11px] text-slate-300">{chosen.status.replaceAll("_", " ")}</span></div>
                  <p className="shrink-0 text-xs text-slate-200">{chosen.task}</p>
                  <div className="sw-assist-focused-details min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                    {chosen.worker_receipt && <div className="sw-assist-receipt rounded-xl border border-cyan-400/20 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-xs text-cyan-200">Recorded execution receipt</strong><span className="text-[11px] text-slate-300">{chosen.worker_receipt.output?.length || 0} record(s) · {chosen.worker_receipt.messages_sent} messages sent</span></div>
                      <p className="mt-2 text-xs text-slate-200">{chosen.worker_receipt.message}</p>
                      <p className="mt-1 break-all text-[11px] text-slate-400">Receipt: {chosen.worker_receipt.receipt_id}</p>
                      {(chosen.worker_receipt.output || []).map((record, index) => <div key={index} className="mt-2 rounded-lg border border-white/10 p-2 text-xs text-slate-200">
                        {(record.company || record.title) && <strong className="block text-white">{record.company || record.title}</strong>}
                        {record.snippet && <p>{record.snippet}</p>}
                        {record.website && <p className="break-all">Owner-entered website (not independently verified): {record.website}</p>}
                        {record.source_url && <p className="break-all">Source: {record.source_url}</p>}
                        {record.observation && <p>{record.observation}</p>}
                        {record.draft && <p className="whitespace-pre-wrap">Unsent draft: {record.draft}</p>}
                        {record.result && <p>{record.result} · {record.records} records</p>}
                      </div>)}
                      <p className="mt-2 text-[10px] text-amber-200">Saved source claims have not been independently verified.</p>
                    </div>}
                    {chosen.evidence && <p className="text-xs text-slate-300">Recorded review evidence: {chosen.evidence}</p>}
                    {chosen.status === "COMPLETED"
                      ? <p className="text-xs text-emerald-200">Owner-attested completion; not independently verified by an AI worker.</p>
                      : <div className="grid gap-2 sm:grid-cols-[180px_1fr_auto] sm:items-end">
                        <label className="block text-xs font-bold text-slate-300">Review status
                          <select aria-label="Assignment status" value={selection} onChange={(event) => setEditing(old => ({ ...old, [chosen.id]: { ...old[chosen.id], status: event.target.value } }))} className="mt-1 min-h-10 w-full rounded-lg border border-slate-600 bg-slate-950 p-2 text-xs">
                            {STATUS.map(status => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
                          </select>
                        </label>
                        <label className="block min-w-0 text-xs font-bold text-slate-300">Owner review evidence
                          <textarea aria-label="Evidence or progress note" value={edit.evidence || ""} maxLength={2000} onChange={(event) => setEditing(old => ({ ...old, [chosen.id]: { ...old[chosen.id], evidence: event.target.value } }))} rows={2} placeholder="Describe what you verified." className="mt-1 min-h-10 w-full rounded-lg border border-slate-600 bg-slate-950 p-2 text-xs" />
                        </label>
                        <button type="button" disabled={busy} onClick={() => updateStep(item.id, chosen)} className="min-h-10 rounded-lg border border-cyan-400/50 px-3 text-xs font-bold text-cyan-100 disabled:opacity-40">{selection === "COMPLETED" ? "Attest completion" : "Save progress"}</button>
                      </div>}
                  </div>
                </div>}

              </div>;
            })}
          </div>
        </section>
      </div>}
      {budgetOpen && <div className="sw-assist-dialog-overlay fixed inset-0 z-[260] flex items-center justify-center p-3" onMouseDown={(event) => { if (event.target === event.currentTarget) setBudgetOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-label="Sync Assist shared pilot budget" className="sw-assist-secondary-dialog flex max-h-[min(650px,90dvh)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-cyan-400/35 p-4 text-white">
          <div className="flex shrink-0 items-start justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-widest text-cyan-200">God Mode / AI Workforce</p><h2 className="mt-1 text-xl font-black">Shared pilot budget</h2><p className="mt-1 text-xs text-slate-300">All AI employees share this monthly paid-tool allowance.</p></div><button type="button" onClick={() => setBudgetOpen(false)} className="min-h-10 rounded-lg border border-white/20 px-3 text-xs font-bold">Close</button></div>
          {workerStatus?.pilot_budget ? <div className="mt-4 min-h-0 space-y-3 overflow-y-auto text-sm">
            <div className="grid grid-cols-3 gap-2">{[["Monthly cap",workerStatus.pilot_budget.limit_usd],["Reserved",workerStatus.pilot_budget.reserved_usd],["Remaining",workerStatus.pilot_budget.remaining_usd]].map(([title,value])=><div key={title} className="rounded-xl border border-cyan-400/20 bg-slate-950/35 p-3"><p className="text-[11px] text-slate-300">{title}</p><p className="mt-1 text-lg font-black">${value}</p></div>)}</div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-700" role="progressbar" aria-label="Monthly paid tool budget reserved" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100,Math.round(100 * Number(workerStatus.pilot_budget.reserved_usd)/10))}><div className="h-full bg-cyan-400" style={{width:`${Math.min(100,100*Number(workerStatus.pilot_budget.reserved_usd)/10)}%`}} /></div>
            <p className="text-xs text-slate-300">Period: {workerStatus.pilot_budget.period}. Usage by role:</p>
            {Object.entries(workerStatus.pilot_budget.by_role || {}).length ? Object.entries(workerStatus.pilot_budget.by_role).map(([name,amount])=><div key={name} className="flex justify-between border-b border-white/10 pb-1 text-xs"><span>{name.replaceAll("_"," ")}</span><strong>${amount}</strong></div>) : <p className="text-xs text-slate-400">No paid-tool reservations recorded yet. Current internal specialists use zero model API calls.</p>}
            <div className="rounded-xl border border-cyan-400/20 p-3">
              <h3 className="text-sm font-bold text-cyan-100">Employee spending limits</h3>
              <p className="mt-1 text-[11px] text-slate-400">Each role has a monthly sub-limit within the shared $10 cap. Price figures are planning targets, not active subscription billing.</p>
              <div className="mt-2 space-y-1">
                {Object.entries(workerStatus.pilot_budget.employee_budgets || {}).map(([role, detail]) =>
                  <div key={role} className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 py-1 text-[11px]">
                    <span>{role.replaceAll("_", " ")}</span>
                    <span className="text-slate-300">Used ${detail.reserved_usd} / ${detail.limit_usd}</span>
                    <button type="button" className="rounded-lg border border-cyan-400/30 px-2 py-1 text-cyan-100" onClick={() => { setBudgetRole(role); setBudgetAmount(detail.limit_usd); setBudgetError(""); }}>Edit</button>
                  </div>
                )}
              </div>
              {budgetRole && <form onSubmit={saveEmployeeBudget} className="mt-3 flex flex-wrap items-end gap-2">
                <label className="text-xs text-slate-200">Monthly limit for {budgetRole.replaceAll("_", " ")}
                  <input type="number" min="0" max="10" step="0.01" required value={budgetAmount} onChange={(event) => setBudgetAmount(event.target.value)} className="mt-1 block w-28 rounded-lg border border-white/25 bg-slate-900 p-2 text-white"/>
                </label>
                <button type="submit" disabled={budgetBusy} className="min-h-10 rounded-lg border border-cyan-400/40 px-3 text-xs font-bold text-cyan-100 disabled:opacity-50">{budgetBusy ? "Saving…" : "Save limit"}</button>
                <button type="button" className="min-h-10 px-2 text-xs" onClick={() => setBudgetRole("")}>Cancel</button>
              </form>}
              {budgetError && <p role="alert" className="mt-2 text-xs text-rose-200">{budgetError}</p>}
            </div>
            {workerStatus.pilot_budget.alerts?.length > 0 && <p role="alert" className="text-xs font-bold text-amber-200">Tracked budget thresholds reached: {workerStatus.pilot_budget.alerts.map((alert) => alert.threshold_percent + "%").join(", ")}.</p>}
            <p className="rounded-lg border border-amber-400/35 bg-amber-950/15 p-3 text-xs text-amber-100"><strong>Not a total hosting bill or universal charge cap.</strong> Render Cron, database, web hosting and providers not wired into this guard are excluded. Provider invoices and billing alerts must be checked separately. New unmetered paid tools remain disabled.</p>
            <button type="button" onClick={() => { setBudgetOpen(false); refresh(); }} className="min-h-10 rounded-lg border border-cyan-400/40 px-3 text-xs font-bold text-cyan-100">Refresh budget</button>
          </div> : <p className="mt-4 text-xs text-amber-200">Budget data unavailable. Do not assume zero spending; retry Refresh.</p>}
        </section>
      </div>}
      {allGoalsOpen && <div className="sw-assist-dialog-overlay fixed inset-0 z-[260] flex justify-end" onMouseDown={(event) => { if (event.target === event.currentTarget) setAllGoalsOpen(false); }}><section role="dialog" aria-modal="true" aria-label="All goals" className="sw-assist-secondary-dialog flex h-full w-full max-w-lg flex-col border-l border-cyan-400/30 text-white"><div className="flex shrink-0 items-center justify-between border-b border-white/10 p-3"><h2 className="text-base font-black">All coordinated goals</h2><button type="button" onClick={() => setAllGoalsOpen(false)} className="min-h-10 rounded-lg border border-white/20 px-3 text-xs">Close</button></div><div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">{(data?.goals || []).map((item) => <button type="button" key={item.id} onClick={() => { setAllGoalsOpen(false); setSelectedGoalId(item.id); }} className="block w-full rounded-xl border border-white/15 bg-slate-900/40 p-3 text-left text-xs"><strong className="block">{item.goal}</strong><span className="mt-1 block text-cyan-200">{item.status.replaceAll("_", " ")} · View details</span></button>)}</div></section></div>}
      {draftDrawer && <div className="sw-assist-dialog-overlay fixed inset-0 z-[260] flex justify-end" onMouseDown={(event) => { if (event.target === event.currentTarget) setDraftDrawer(false); }}><section role="dialog" aria-modal="true" aria-label="Draft assignments" className="sw-assist-secondary-dialog flex h-full w-full max-w-lg flex-col border-l border-cyan-400/30 text-white"><div className="flex shrink-0 items-center justify-between border-b border-white/10 p-3"><h2 className="text-base font-black">Draft employee assignments</h2><button type="button" onClick={() => setDraftDrawer(false)} className="min-h-10 rounded-lg border border-white/20 px-3 text-xs">Done</button></div><div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">{draftSteps.map((step, index) => <div key={index} className="flex items-start justify-between gap-2 rounded-lg border border-white/15 p-3 text-xs"><span className="break-words">{step.role.replaceAll("_", " ")} · {step.task}</span><button type="button" onClick={() => setDraftSteps(items => items.filter((_, i) => i !== index))} className="shrink-0 rounded-lg border border-rose-400/35 px-3 py-2 text-rose-200">Remove</button></div>)}{!draftSteps.length && <p className="text-sm text-slate-400">No additional assignments yet.</p>}</div></section></div>}
      <p className="mt-1 shrink-0 truncate text-[10px] leading-4 text-amber-200">Pilot · Internal execution only · No unattended external actions.</p>
    </section>
  );
}
