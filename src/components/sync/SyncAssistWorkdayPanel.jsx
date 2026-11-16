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

  const refresh = useCallback(async () => {
    try {
      const [response, jobResponse] = await Promise.all([
        api.get(BASE, { timeout: 15000 }),
        api.get(BASE + "jobs/", { timeout: 15000 }),
      ]);
      setData(response.data);
      setJobs(jobResponse.data.jobs || []);
      setWorkerStatus(jobResponse.data);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to load workday goals.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
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
  }

  function addStep() {
    if (!task.trim() || draftSteps.length >= 8) return;
    setDraftSteps((steps) => [...steps, { role, task: task.trim() }]);
    setTask("");
  }

  async function createGoal(event) {
    event.preventDefault();
    if (busy || !goal.trim() || !draftSteps.length) return;
    setBusy(true); setError("");
    try {
      const response = await api.post(BASE, {
        goal: goal.trim(), steps: draftSteps,
        source_mode: publicMode ? "PUBLIC_SEARCH" : "INTERNAL_ONLY",
        public_search_query: publicMode ? publicQuery.trim() : "",
        allow_external_search: publicMode,
      });
      setData(response.data);
      setGoal(""); setDraftSteps([]); setPublicMode(false); setPublicQuery("");
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to create the workday goal.");
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
    <section className="mb-5 rounded-3xl border border-cyan-400/30 bg-slate-900/50 p-4 sm:p-5" aria-label="AI workforce workday">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-cyan-200">Workforce command center</p>
          <h2 className="mt-1 text-xl font-black">Goals and employee assignments</h2>
          <p className="mt-2 text-xs leading-5 text-slate-300">
            Run restricted research and drafting tasks, review real receipts, and optionally enroll internal work in the durable background queue.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SyncAssistWorkHistory goals={data?.goals || []} onReuse={reuseHistoricalGoal}/>
          <button type="button" disabled={busy} onClick={refresh} className="min-h-10 rounded-xl border border-cyan-400/30 px-3 text-xs font-bold text-cyan-100">Refresh</button>
        </div>
      </div>
      {data && <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {Object.entries(data.counts || {}).filter(([, count]) => count > 0).map(([name, count]) => (
          <span key={name} className="rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2">
            <strong className="text-cyan-200">{count}</strong> {name.replaceAll("_", " ")}
          </span>
        ))}
      </div>}
      {workerStatus && <p className="mt-3 text-xs text-amber-200">
        Durable queue records are available. Independent worker deployed: {workerStatus.worker_deployed ? "reported active" : "not yet verified"}.
        Jobs execute unattended only after a separately configured worker is enabled.
      </p>}
      {error && <p role="alert" className="mt-3 rounded-xl border border-rose-400/30 p-3 text-xs text-rose-200">{error}</p>}
      <form onSubmit={createGoal} className="mt-4 space-y-3 rounded-2xl border border-white/10 p-4">
        <label className="block text-xs font-bold text-slate-200">Business goal
          <textarea required value={goal} onChange={(event) => setGoal(event.target.value)} maxLength={500} rows={2} placeholder="e.g. Build a qualified property management lead pipeline" className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-950 p-3 text-sm text-white"/>
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block text-xs font-bold text-slate-200">Assigned employee
            <select value={role} onChange={(event) => setRole(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-600 bg-slate-950 p-2 text-sm text-white">
              {(teamEmployees.length
                ? teamEmployees.map((employee) => [employee.role, employee.name + " — " + (ROLES.find(([id]) => id === employee.role)?.[1] || employee.role)])
                : ROLES).map(([id, name]) => <option value={id} key={id}>{name}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold text-slate-200">Assignment
            <input value={task} onChange={(event) => setTask(event.target.value)} maxLength={500} placeholder="Describe the employee's job" className="mt-1 min-h-11 w-full rounded-xl border border-slate-600 bg-slate-950 p-3 text-sm text-white"/>
          </label>
        </div>
        <label className="flex items-start gap-2 text-xs text-slate-200">
          <input type="checkbox" checked={publicMode} onChange={(event) => setPublicMode(event.target.checked)} className="mt-1"/>
          <span>Use public web search for Research Analyst assignments. I authorize sending only the search query below to the configured search provider. Search results are unverified and require review.</span>
        </label>
        {publicMode && <label className="block text-xs font-bold text-slate-200">Public search query (no private or customer information)
          <input required minLength={4} maxLength={120} value={publicQuery} onChange={(event) => setPublicQuery(event.target.value)} placeholder="e.g. commercial property management companies in Birmingham Alabama" className="mt-1 min-h-11 w-full rounded-xl border border-slate-600 bg-slate-950 p-3 text-sm text-white"/>
          <span className="mt-1 block font-normal text-amber-200">Only available when the backend search integration is configured and enabled.</span>
        </label>}
        <button type="button" disabled={!task.trim() || draftSteps.length >= 8} onClick={addStep} className="min-h-10 rounded-xl border border-cyan-400/30 px-4 text-xs font-bold text-cyan-100 disabled:opacity-40">Add assignment</button>
        {draftSteps.map((step, index) => (
          <div key={index} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-950/50 p-2 text-xs">
            <span className="min-w-0 break-words">{step.role.replaceAll("_", " ")} · {step.task}</span>
            <button type="button" onClick={() => setDraftSteps((items) => items.filter((_, i) => i !== index))} aria-label={"Remove assignment " + (index + 1)} className="min-h-9 shrink-0 rounded-lg border border-white/20 px-2">Remove</button>
          </div>
        ))}
        <button type="submit" disabled={busy || !goal.trim() || draftSteps.length === 0 || (publicMode && (publicQuery.trim().length < 4 || !draftSteps.some((step) => step.role === "RESEARCH_ANALYST")))} className="min-h-11 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 p-3 text-sm font-bold disabled:opacity-40">Create coordinated goal</button>
      </form>
      <div className="mt-4 space-y-3">
        {!loaded && <p className="text-xs text-slate-400">Loading recorded goals…</p>}
        {loaded && data?.goals?.length === 0 && <p className="text-xs text-slate-400">No coordinated goals saved yet.</p>}
        {(data?.goals || []).map((item) => (
          <article key={item.id} className="rounded-2xl border border-white/15 bg-slate-950/40 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="max-w-xl break-words text-sm font-black">{item.goal}</h3>
              <span className="rounded-lg border border-cyan-400/25 px-2 py-1 text-[10px] font-bold text-cyan-200">{item.status.replaceAll("_", " ")}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" disabled={busy || item.status === "COMPLETED"}
                onClick={() => runInternalStep(item.id)}
                className="min-h-10 rounded-lg border border-cyan-400/35 px-3 text-xs font-bold text-cyan-100 disabled:opacity-40">Run one internal step</button>
              <button type="button" disabled={busy || item.status === "COMPLETED"}
                onClick={() => queueGoal(item.id)}
                className="min-h-10 rounded-lg border border-amber-400/30 px-3 text-xs font-bold text-amber-200 disabled:opacity-40">Authorize internal queue</button>
              {jobs.some((job) => String(job.goal_id) === String(item.id) && ["QUEUED", "RUNNING", "WAITING", "RETRY"].includes(job.state)) &&
                <button type="button" disabled={busy} onClick={() => cancelGoal(item.id)} className="min-h-10 rounded-lg border border-rose-400/30 px-3 text-xs font-bold text-rose-200 disabled:opacity-40">Cancel job</button>}
              {jobs.filter((job) => String(job.goal_id) === String(item.id)).map((job) =>
                <span key={job.id} className="self-center text-[11px] text-slate-300">Queue: {job.state.replaceAll("_", " ")}</span>)}
            </div>
            <div className="mt-3 space-y-3">
              {item.steps.map((step) => {
                const edit = editing[step.id] || {};
                const selection = edit.status || step.status;
                return <div key={step.id} className="rounded-xl border border-white/10 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-cyan-200">{step.role.replaceAll("_", " ")} · {step.status.replaceAll("_", " ")}</div>
                  <p className="mt-1 break-words text-xs text-slate-200">{step.task}</p>
                  {step.worker_receipt && <div className="mt-3 space-y-2 rounded-xl border border-cyan-400/20 bg-cyan-950/20 p-3">
                    <p className="text-xs font-bold text-cyan-200">Recorded execution receipt</p>
                    <p className="text-xs text-slate-200">{step.worker_receipt.message}</p>
                    <p className="text-[11px] text-slate-400">Receipt: {step.worker_receipt.receipt_id} · {step.worker_receipt.output?.length || 0} records · {step.worker_receipt.messages_sent} messages sent</p>
                    {(step.worker_receipt.output || []).map((record, index) => (
                      <div key={index} className="rounded-lg border border-white/10 p-2 text-xs">
                        {record.company && <strong className="block text-white">{record.company}</strong>}
                        {record.title && <strong className="block text-white">{record.title}</strong>}
                        {record.snippet && <p className="mt-1 text-slate-300">{record.snippet}</p>}
                        {record.source_url && <span className="block break-all text-slate-300">Reference: {record.source_url}</span>}
                        {record.website && <span className="block break-all text-slate-300">Source URL (content not independently verified): {record.website}</span>}
                        {record.observation && <p className="mt-1 text-slate-300">{record.observation}</p>}
                        {record.draft && <p className="mt-1 whitespace-pre-wrap text-slate-300">Unsent outreach draft: {record.draft}</p>}
                        {record.result && <p className="mt-1 text-slate-300">{record.result} · {record.records} records</p>}
                      </div>
                    ))}
                    <p className="text-[10px] text-amber-200">Provenance and output are stored in the receipt. User-entered business claims have not been independently verified.</p>
                  </div>}
                  {step.evidence && <p className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-400">Recorded evidence: {step.evidence}</p>}
                  {step.status === "COMPLETED" ? <p className="mt-2 text-xs text-emerald-200">Owner-attested completion. Not independently verified by an AI worker.</p> : <div className="mt-3 space-y-2">
                    <select aria-label="Assignment status" value={selection} onChange={(event) => setEditing((old) => ({ ...old, [step.id]: { ...old[step.id], status: event.target.value } }))} className="min-h-11 w-full rounded-lg border border-slate-600 bg-slate-950 p-2 text-xs">
                      {STATUS.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
                    </select>
                    <textarea aria-label="Evidence or progress note" value={edit.evidence || ""} maxLength={2000} onChange={(event) => setEditing((old) => ({ ...old, [step.id]: { ...old[step.id], evidence: event.target.value } }))} placeholder="Verified evidence or a progress note. Completing an assignment confirms your own review." rows={2} className="w-full rounded-lg border border-slate-600 bg-slate-950 p-2 text-xs"/>
                    <button type="button" disabled={busy} onClick={() => updateStep(item.id, step)} className="min-h-10 rounded-lg border border-cyan-400/40 px-3 text-xs font-bold text-cyan-100 disabled:opacity-40">{selection === "COMPLETED" ? "Attest completion" : "Save progress"}</button>
                  </div>}
                </div>;
              })}
            </div>
          </article>
        ))}
      </div>
      <p className="mt-4 text-[11px] leading-5 text-amber-200">This pilot tracks owner-assigned work and evidence. Restricted work can run on demand. Public research requires consent and server configuration. Messaging and third-party changes remain disabled.</p>
    </section>
  );
}
