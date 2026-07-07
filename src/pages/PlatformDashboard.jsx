import React, { useEffect, useMemo, useState } from "react";
import ModeBar from "../components/ModeBar";
import api from "../api/client";

import PlatformTabs from "../components/platform/PlatformTabs";
import PlatformOverviewTab from "../components/platform/PlatformOverviewTab";
import PlatformGrowthEngineTab from "../components/platform/PlatformGrowthEngineTab";
import UsersManager from "../components/platform/UsersManager";
import BusinessesManager from "../components/platform/BusinessesManager";
import BillingManager from "../components/platform/BillingManager";
import BroadcastsManager from "../components/platform/BroadcastsManager";
import NewsReelManager from "../components/platform/NewsReelManager";
import SupportRequestsManager from "../components/platform/SupportRequestsManager";
import AdsOrdersManager from "../components/platform/AdsOrdersManager";
import GodModeAffiliates from "./platform/GodModeAffiliates";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "growth_os", label: "Growth OS" },
  { id: "users", label: "Users" },
  { id: "businesses", label: "Businesses" },
  { id: "billing", label: "Billing" },
  { id: "requests", label: "Requests" },
  { id: "ads", label: "Ads Orders" },
  { id: "news", label: "News Reel" },
  { id: "broadcasts", label: "Broadcasts" },
  { id: "affiliates", label: "Affiliates" },
  { id: "developer_agent", label: "Developer Agent" },
];

const STORAGE_KEY = "syncworks_developer_agent_demo_state_v1";
const PROJECTS = ["SyncWorks Frontend", "SyncWorks Backend", "Developer Agent"];
const MODULES = [
  "Authentication & Sessions",
  "Personal Dashboard",
  "Business Dashboard",
  "Business Settings",
  "Marketplace & Tickets",
  "Inbox & Notifications",
  "Calendar",
  "Finance",
  "Health",
  "Growth/Social Media",
  "Property Management",
  "Employees & Roles",
  "Billing & Payments",
  "God Mode",
  "Backend APIs",
  "Database Migrations",
  "Mobile UX",
  "Encoding",
  "Build & Bundle",
  "Deployment Health",
];
const MODULE_STATUSES = ["NOT_STARTED", "RUNNING", "PASSED", "FINDINGS", "BLOCKED", "DEFERRED"];
const FINDING_STATUSES = ["OPEN", "RESOLVED", "ACCEPTED_RISK", "DEFERRED"];
const TASK_CATALOG = [
  "Validate auth session refresh flow",
  "Check dashboard loading and hydration",
  "Review business settings persistence",
  "Inspect marketplace ticket state transitions",
  "Audit inbox notification delivery",
  "Verify calendar scheduling edge cases",
  "Review finance calculations and rounding",
  "Confirm health and monitoring indicators",
  "Check growth/social publishing flow",
  "Validate billing and payment lock states",
];

const DEVELOPER_AGENT_TASK_LABELS = {
  "business-growth-backend-persistence-001": "Business Growth backend persistence",
  "god-mode-developer-agent-panel-001": "God Mode Developer Agent panel",
  "business-setup-ui-001": "Business setup UI",
  "developer-agent-smoke-test-001": "Developer Agent smoke test",
  "agent-control-center-foundation-001": "Agent Control Center foundation",
  "agent-control-center-foundation-002": "Agent Control Center foundation v2",
};

function getDeveloperAgentError(error, fallback) {
  return error?.response?.data?.detail || error?.message || fallback;
}

function makeInitialModules() {
  return MODULES.reduce((acc, module) => {
    acc[module] = { status: "NOT_STARTED", reason: "" };
    return acc;
  }, {});
}

function makeInitialState() {
  return {
    project: "SyncWorks Frontend",
    modules: makeInitialModules(),
    findings: [],
    queue: [],
    completedCount: 0,
    queueCompletedCount: 0,
  };
}

function loadState() {
  if (typeof window === "undefined") return makeInitialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return makeInitialState();
    const parsed = JSON.parse(raw);
    return {
      ...makeInitialState(),
      ...parsed,
      modules: {
        ...makeInitialModules(),
        ...(parsed?.modules || {}),
      },
      findings: Array.isArray(parsed?.findings) ? parsed.findings : [],
      queue: Array.isArray(parsed?.queue) ? parsed.queue : [],
    };
  } catch {
    return makeInitialState();
  }
}

function DeveloperAgentPanel() {
  const [state, setState] = useState(() => loadState());
  const [newTask, setNewTask] = useState(TASK_CATALOG[0]);
  const [findingDraft, setFindingDraft] = useState({ module: MODULES[0], summary: "", status: "OPEN", reason: "" });
  const [agentStatus, setAgentStatus] = useState(null);
  const [agentLoading, setAgentLoading] = useState(true);
  const [agentRefreshing, setAgentRefreshing] = useState(false);
  const [agentError, setAgentError] = useState("");
  const [selectedApprovedTask, setSelectedApprovedTask] = useState("");
  const [dispatchingTask, setDispatchingTask] = useState("");
  const [dispatchMessage, setDispatchMessage] = useState("");
  const [runTaskLabels, setRunTaskLabels] = useState(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(
        window.localStorage.getItem("sw_developer_agent_run_labels") || "{}"
      );
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const loadAgentStatus = async ({ quiet = false } = {}) => {
    if (quiet) setAgentRefreshing(true);
    else setAgentLoading(true);
    setAgentError("");

    try {
      const response = await api.get("/platform/developer-agent/status/");
      const payload = response?.data || {};
      const taskIds = Object.keys(payload.approved_tasks || {});
      setAgentStatus(payload);
      setSelectedApprovedTask((current) =>
        current && taskIds.includes(current) ? current : taskIds[0] || ""
      );
    } catch (error) {
      setAgentError(getDeveloperAgentError(error, "Unable to load Developer Agent status."));
    } finally {
      setAgentLoading(false);
      setAgentRefreshing(false);
    }
  };

  useEffect(() => {
    loadAgentStatus();
  }, []);

  const persistRunTaskLabels = (nextLabels) => {
    setRunTaskLabels(nextLabels);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        "sw_developer_agent_run_labels",
        JSON.stringify(nextLabels)
      );
    } catch {
      // Local run labels are a convenience only.
    }
  };

  const liveRunActive = Boolean(
    agentStatus?.recent_runs?.some((run) => ["queued", "in_progress"].includes(run?.status))
  );

  const rememberLatestRunTask = (taskId, statusPayload) => {
    const run = statusPayload?.recent_runs?.[0];
    if (!run?.id || !taskId) return;

    persistRunTaskLabels({
      ...runTaskLabels,
      [String(run.id)]: {
        task_id: taskId,
        label: DEVELOPER_AGENT_TASK_LABELS[taskId] || taskId,
      },
    });
  };

  const dispatchApprovedTask = async () => {
    if (!selectedApprovedTask || dispatchingTask || liveRunActive || !agentStatus?.configured) return;

    setDispatchingTask(selectedApprovedTask);
    setDispatchMessage("");
    setAgentError("");

    try {
      await api.post("/platform/developer-agent/run/", { task_id: selectedApprovedTask });
      setDispatchMessage(`Accepted: ${DEVELOPER_AGENT_TASK_LABELS[selectedApprovedTask] || selectedApprovedTask}`);
      const firstRefresh = await api.get("/platform/developer-agent/status/");
      const firstPayload = firstRefresh?.data || {};
      setAgentStatus(firstPayload);
      rememberLatestRunTask(selectedApprovedTask, firstPayload);

      window.setTimeout(async () => {
        try {
          const delayedRefresh = await api.get("/platform/developer-agent/status/");
          const delayedPayload = delayedRefresh?.data || {};
          setAgentStatus(delayedPayload);
          rememberLatestRunTask(selectedApprovedTask, delayedPayload);
        } catch {
          // Manual refresh still works if this delayed refresh fails.
        }
      }, 2500);
    } catch (error) {
      setAgentError(getDeveloperAgentError(error, "Unable to start the approved task."));
    } finally {
      setDispatchingTask("");
    }
  };

  const auditComplete = useMemo(() => {
    const moduleComplete = MODULES.every((module) => {
      const item = state.modules[module];
      if (!item) return false;
      if (item.status === "PASSED") return true;
      if (item.status === "DEFERRED") return Boolean(item.reason && item.reason.trim());
      return false;
    });
    const noBlocked = MODULES.every((module) => state.modules[module]?.status !== "BLOCKED");
    const findingsComplete = state.findings.every(
      (finding) => ["RESOLVED", "ACCEPTED_RISK"].includes(finding.status) || (finding.status === "DEFERRED" && Boolean(finding.reason && finding.reason.trim()))
    );
    return moduleComplete && noBlocked && findingsComplete;
  }, [state.modules, state.findings]);

  const completedModules = MODULES.filter((m) => {
    const item = state.modules[m];
    return item?.status === "PASSED" || (item?.status === "DEFERRED" && Boolean(item.reason && item.reason.trim()));
  }).length;

  const findingsCount = state.findings.length;
  const queueCounts = state.queue.reduce(
    (acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    },
    { PENDING: 0, RUNNING: 0, COMPLETED: 0, FAILED: 0, BLOCKED: 0 }
  );

  const saveModule = (module, patch) => {
    setState((prev) => ({
      ...prev,
      modules: {
        ...prev.modules,
        [module]: { ...prev.modules[module], ...patch },
      },
    }));
  };

  const addQueueTask = () => {
    setState((prev) => ({
      ...prev,
      queue: [...prev.queue, { id: `${Date.now()}-${Math.random()}`, name: newTask, status: "PENDING" }],
    }));
  };

  const advanceQueueTask = (id, nextStatus) => {
    setState((prev) => ({
      ...prev,
      queue: prev.queue.map((task) => (task.id === id ? { ...task, status: nextStatus } : task)),
    }));
  };

  const addFinding = () => {
    setState((prev) => ({
      ...prev,
      findings: [
        ...prev.findings,
        {
          id: `${Date.now()}-${Math.random()}`,
          module: findingDraft.module,
          summary: findingDraft.summary,
          status: findingDraft.status,
          reason: findingDraft.status === "DEFERRED" ? findingDraft.reason : "",
        },
      ],
    }));
    setFindingDraft({ module: MODULES[0], summary: "", status: "OPEN", reason: "" });
  };

  const updateFinding = (id, patch) => {
    setState((prev) => ({
      ...prev,
      findings: prev.findings.map((finding) => (finding.id === id ? { ...finding, ...patch } : finding)),
    }));
  };

  const resetDemoState = () => {
    const fresh = makeInitialState();
    setState(fresh);
    setFindingDraft({ module: MODULES[0], summary: "", status: "OPEN", reason: "" });
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/70 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-cyan-100">Developer Agent</h2>
            <p className="text-sm text-slate-400">Live approved-task dispatcher with a separate manual audit workspace.</p>
          </div>
          <button
            type="button"
            onClick={resetDemoState}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Reset Demo State
          </button>
        </div>
        <div className="mt-3 text-sm text-amber-300">Live tasks remain branch-only and draft-PR-only. No automatic merge, deployment, billing action, migration, or secret exposure.</div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <Stat label="Project" value={state.project} />
          <Stat label="Modules" value={`${completedModules}/20`} />
          <Stat label="Findings" value={`${findingsCount}`} />
          <Stat label="Audit Complete" value={auditComplete ? "100%" : "0%"} />
        </div>
        <div className="mt-3 text-xs text-slate-500">GitHub Actions: <a className="text-cyan-300 underline" href="https://github.com/syncworksai/Syncworks-developer-agent/actions" target="_blank" rel="noreferrer">https://github.com/syncworksai/Syncworks-developer-agent/actions</a></div>
      </div>

      <div className="rounded-2xl border border-cyan-500/25 bg-slate-950/70 p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-cyan-100">Live Approved Task Dispatcher</h3>
            <p className="text-sm text-slate-400">Runs the fixed backend allowlist through GitHub Actions. The browser never receives the GitHub token.</p>
          </div>
          <button type="button" onClick={() => loadAgentStatus({ quiet: true })} disabled={agentLoading || agentRefreshing} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
            {agentRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {agentError ? <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{agentError}</div> : null}
        {dispatchMessage ? <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{dispatchMessage}</div> : null}

        <div className="grid gap-3 md:grid-cols-4">
          <Stat label="Backend" value={agentLoading ? "Loading..." : agentStatus?.configured ? "Configured" : "Not configured"} />
          <Stat label="Repository" value={agentStatus?.repository || "—"} />
          <Stat label="Workflow" value={agentStatus?.workflow || "—"} />
          <Stat label="Live Run" value={liveRunActive ? "In progress" : "Idle"} />
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <select value={selectedApprovedTask} onChange={(event) => setSelectedApprovedTask(event.target.value)} disabled={agentLoading || !agentStatus?.configured || liveRunActive || Boolean(dispatchingTask)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50">
            {Object.keys(agentStatus?.approved_tasks || {}).length === 0 ? <option value="">No approved tasks available</option> : Object.keys(agentStatus.approved_tasks).map((taskId) => <option key={taskId} value={taskId}>{DEVELOPER_AGENT_TASK_LABELS[taskId] || taskId}</option>)}
          </select>
          <button type="button" onClick={dispatchApprovedTask} disabled={agentLoading || !agentStatus?.configured || !selectedApprovedTask || liveRunActive || Boolean(dispatchingTask)} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50">
            {dispatchingTask ? "Starting..." : liveRunActive ? "Run in progress" : "Run approved task"}
          </button>
        </div>

        <div className="grid gap-2 text-xs text-slate-400 md:grid-cols-5">
          <div>Branch only: {agentStatus?.safety_flags?.branch_only ? "Yes" : "—"}</div>
          <div>Draft PR only: {agentStatus?.safety_flags?.draft_pr_only ? "Yes" : "—"}</div>
          <div>Auto merge: {agentStatus?.safety_flags?.auto_merge ? "Enabled" : "Disabled"}</div>
          <div>Auto deploy: {agentStatus?.safety_flags?.auto_deploy ? "Enabled" : "Disabled"}</div>
          <div>Production migrations: {agentStatus?.safety_flags?.production_migrations ? "Enabled" : "Disabled"}</div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium text-slate-200">Recent GitHub Actions runs</div>
          {agentLoading ? <div className="text-sm text-slate-500">Loading live runs...</div> : null}
          {!agentLoading && (agentStatus?.recent_runs || []).length === 0 ? <div className="text-sm text-slate-500">No recent workflow_dispatch runs found.</div> : null}
          {(agentStatus?.recent_runs || []).map((run) => (
            <a key={run.id} href={run.html_url} target="_blank" rel="noreferrer" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 p-3 hover:border-cyan-500/40 hover:bg-slate-900/60">
              <div>
                <div className="font-medium text-slate-200">{runTaskLabels[String(run.id)]?.label || "Task not captured"}</div>
                <div className="text-xs text-slate-500">Run #{run.id} · {run.head_branch || agentStatus?.ref || "main"} · {run.created_at || "Unknown time"}</div>
              </div>
              <div className="text-sm text-cyan-300">{run.status || "unknown"}{run.conclusion ? ` · ${run.conclusion}` : ""}</div>
            </a>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
          <h3 className="text-lg font-semibold">Project Selector</h3>
          <select
            value={state.project}
            onChange={(e) => setState((prev) => ({ ...prev, project: e.target.value }))}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
          >
            {PROJECTS.map((project) => (
              <option key={project} value={project}>{project}</option>
            ))}
          </select>

          <div className="space-y-3">
            {MODULES.map((module) => {
              const item = state.modules[module];
              return (
                <div key={module} className="rounded-xl border border-slate-800 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">{module}</div>
                    <select
                      value={item.status}
                      onChange={(e) => saveModule(module, { status: e.target.value, reason: e.target.value === "DEFERRED" ? item.reason : item.reason })}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
                    >
                      {MODULE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </div>
                  <input
                    value={item.reason}
                    onChange={(e) => saveModule(module, { reason: e.target.value })}
                    placeholder="Reason required when deferred"
                    className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm"
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
          <h3 className="text-lg font-semibold">Manual Audit Task Queue</h3>
          <div className="flex gap-2">
            <select value={newTask} onChange={(e) => setNewTask(e.target.value)} className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
              {TASK_CATALOG.map((task) => <option key={task} value={task}>{task}</option>)}
            </select>
            <button type="button" onClick={addQueueTask} className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white">Add to Queue</button>
          </div>
          <div className="space-y-2">
            {state.queue.length === 0 ? <div className="text-sm text-slate-500">Queue empty</div> : null}
            {state.queue.map((task) => (
              <div key={task.id} className="rounded-xl border border-slate-800 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{task.name}</div>
                    <div className="text-xs text-slate-500">Status: {task.status}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => advanceQueueTask(task.id, "RUNNING")} className="rounded border border-slate-700 px-2 py-1 text-xs">pending → running</button>
                    <button type="button" onClick={() => advanceQueueTask(task.id, "COMPLETED")} className="rounded border border-slate-700 px-2 py-1 text-xs">running → completed</button>
                    <button type="button" onClick={() => advanceQueueTask(task.id, "FAILED")} className="rounded border border-slate-700 px-2 py-1 text-xs">explicit failure</button>
                    <button type="button" onClick={() => advanceQueueTask(task.id, "BLOCKED")} className="rounded border border-slate-700 px-2 py-1 text-xs">explicit blocked</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-300">
            <div>PENDING: {queueCounts.PENDING}</div><div>RUNNING: {queueCounts.RUNNING}</div>
            <div>COMPLETED: {queueCounts.COMPLETED}</div><div>FAILED: {queueCounts.FAILED}</div>
            <div>BLOCKED: {queueCounts.BLOCKED}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
        <h3 className="text-lg font-semibold">Findings</h3>
        <div className="grid gap-3 md:grid-cols-4">
          <select value={findingDraft.module} onChange={(e) => setFindingDraft((p) => ({ ...p, module: e.target.value }))} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
            {MODULES.map((module) => <option key={module} value={module}>{module}</option>)}
          </select>
          <input value={findingDraft.summary} onChange={(e) => setFindingDraft((p) => ({ ...p, summary: e.target.value }))} placeholder="Finding summary" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 md:col-span-2" />
          <select value={findingDraft.status} onChange={(e) => setFindingDraft((p) => ({ ...p, status: e.target.value, reason: e.target.value === "DEFERRED" ? p.reason : "" }))} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
            {FINDING_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          {findingDraft.status === "DEFERRED" ? <input value={findingDraft.reason} onChange={(e) => setFindingDraft((p) => ({ ...p, reason: e.target.value }))} placeholder="Reason required for deferred" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 md:col-span-4" /> : null}
          <button type="button" onClick={addFinding} className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white md:col-span-4">Add Finding</button>
        </div>
        <div className="space-y-2">
          {state.findings.map((finding) => (
            <div key={finding.id} className="rounded-xl border border-slate-800 p-3 space-y-2">
              <div className="text-sm text-slate-300">{finding.module}</div>
              <input value={finding.summary} onChange={(e) => updateFinding(finding.id, { summary: e.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
              <div className="flex flex-wrap gap-2 items-center">
                <select value={finding.status} onChange={(e) => updateFinding(finding.id, { status: e.target.value, reason: e.target.value === "DEFERRED" ? finding.reason : "" })} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm">
                  {FINDING_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
                {finding.status === "DEFERRED" ? <input value={finding.reason} onChange={(e) => updateFinding(finding.id, { reason: e.target.value })} placeholder="Deferred reason" className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm" /> : null}
              </div>
            </div>
          ))}
        </div>
        <div className="text-sm text-slate-400">Audit complete is only achieved when every module is PASSED or DEFERRED with a written reason, no module is BLOCKED, and every finding is RESOLVED, ACCEPTED_RISK, or DEFERRED with a written reason.</div>
      </div>
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-100">{value}</div>
    </div>
  );
}

export default function PlatformDashboard() {
  const [tab, setTab] = useState("overview");

  return (
    <div className="min-h-screen text-slate-100 bg-[#05060a]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full blur-3xl opacity-30 bg-cyan-500/30" />
        <div className="absolute -top-20 -right-40 w-[560px] h-[560px] rounded-full blur-3xl opacity-25 bg-fuchsia-500/25" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[880px] h-[320px] rounded-full blur-3xl opacity-20 bg-indigo-500/20" />
      </div>

      <ModeBar
        title="SyncWorks Admin"
        subtitle="Platform console — performance, billing locks, ads, broadcasts, and support triage."
      />

      <main className="relative max-w-7xl mx-auto px-4 py-6 space-y-5">
        <PlatformTabs tabs={TABS} active={tab} onChange={setTab} />

        {tab === "overview" ? <PlatformOverviewTab /> : null}
        {tab === "growth_os" ? <PlatformGrowthEngineTab /> : null}
        {tab === "users" ? <UsersManager /> : null}
        {tab === "businesses" ? <BusinessesManager /> : null}
        {tab === "billing" ? <BillingManager /> : null}
        {tab === "requests" ? <SupportRequestsManager embedded /> : null}
        {tab === "ads" ? <AdsOrdersManager /> : null}
        {tab === "news" ? <NewsReelManager /> : null}
        {tab === "broadcasts" ? <BroadcastsManager /> : null}
        {tab === "affiliates" ? <GodModeAffiliates /> : null}
        {tab === "developer_agent" ? <DeveloperAgentPanel /> : null}
      </main>
    </div>
  );
}
