import React, { useEffect, useMemo, useState } from "react";
import ModeBar from "../components/ModeBar";

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

const DEV_AGENT_STORAGE_KEY = "syncworks.platform.developerAgent.v1";
const DEV_AGENT_PROJECTS = [
  "Syncworks Core",
  "Admin Console",
  "Developer Agent",
  "Billing Engine",
  "Growth OS",
];

const MODULES = [
  "Auth",
  "Billing",
  "Users",
  "Businesses",
  "Requests",
  "Ads",
  "Broadcasts",
  "News",
  "Growth OS",
  "Platform UI",
  "Mode Bar",
  "Tabs",
  "Affiliates",
  "Notifications",
  "Audit Log",
  "Queue Engine",
  "Safety Controls",
  "Persistence",
  "Developer Agent",
  "LocalStorage",
];

const makeInitialAudit = () => ({
  manifest: MODULES.map((name) => ({
    name,
    status: "NOT_STARTED",
    reason: "",
  })),
  findings: [],
  completed: 0,
  total: MODULES.length,
  percent: 0,
  complete: false,
});

const makeInitialQueue = () => [
  {
    id: "task-001",
    title: "Review platform console shell",
    status: "pending",
    detail: "Assess UI structure and state wiring.",
  },
  {
    id: "task-002",
    title: "Verify safety controls",
    status: "pending",
    detail: "Confirm explicit simulation-only controls and warning copy.",
  },
  {
    id: "task-003",
    title: "Validate audit manifest",
    status: "pending",
    detail: "Ensure truthful module and finding states.",
  },
];

const makeInitialState = () => ({
  project: DEV_AGENT_PROJECTS[0],
  queue: makeInitialQueue(),
  audit: makeInitialAudit(),
  recentRuns: [],
  selectedTaskId: null,
  safety: {
    simulationOnly: true,
    warningAcknowledged: false,
  },
  agent: {
    status: "Idle",
    currentTaskId: null,
  },
});

function loadDevAgentState() {
  if (typeof window === "undefined") return makeInitialState();
  try {
    const raw = window.localStorage.getItem(DEV_AGENT_STORAGE_KEY);
    if (!raw) return makeInitialState();
    const parsed = JSON.parse(raw);
    return {
      ...makeInitialState(),
      ...parsed,
      audit: parsed?.audit || makeInitialAudit(),
      queue: parsed?.queue || makeInitialQueue(),
      recentRuns: parsed?.recentRuns || [],
      safety: { ...makeInitialState().safety, ...(parsed?.safety || {}) },
      agent: { ...makeInitialState().agent, ...(parsed?.agent || {}) },
    };
  } catch {
    return makeInitialState();
  }
}

function persistDevAgentState(state) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEV_AGENT_STORAGE_KEY, JSON.stringify(state));
}

function buildCompleteAudit(baseAudit) {
  return {
    ...baseAudit,
    manifest: baseAudit.manifest.map((module) => ({
      ...module,
      status: module.reason ? "DEFERRED" : module.status,
    })),
    complete: true,
  };
}

function DeveloperAgentPanel() {
  const [state, setState] = useState(() => loadDevAgentState());

  useEffect(() => {
    persistDevAgentState(state);
  }, [state]);

  const oldestPendingTask = useMemo(
    () => state.queue.find((task) => task.status === "pending") || null,
    [state.queue],
  );

  const queueCounts = useMemo(() => {
    const counts = { pending: 0, running: 0, completed: 0, blocked: 0, failed: 0 };
    state.queue.forEach((task) => {
      counts[task.status] = (counts[task.status] || 0) + 1;
    });
    return counts;
  }, [state.queue]);

  const agentStatus = useMemo(() => {
    if (state.agent.currentTaskId) {
      const task = state.queue.find((item) => item.id === state.agent.currentTaskId);
      if (task) return task.status === "running" ? `Running: ${task.title}` : `Working: ${task.title}`;
    }
    if (queueCounts.running > 0) return "Running";
    if (queueCounts.pending > 0) return "Ready";
    if (queueCounts.blocked > 0) return "Blocked";
    if (queueCounts.failed > 0) return "Failed";
    if (queueCounts.completed > 0) return "Completed";
    return "Idle";
  }, [queueCounts, state.agent.currentTaskId, state.queue]);

  useEffect(() => {
    setState((prev) => ({
      ...prev,
      agent: {
        ...prev.agent,
        status: agentStatus,
      },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentStatus]);

  const updateQueueTask = (taskId, nextStatus) => {
    setState((prev) => ({
      ...prev,
      queue: prev.queue.map((task) =>
        task.id === taskId ? { ...task, status: nextStatus } : task,
      ),
      agent:
        nextStatus === "running"
          ? { status: "Running", currentTaskId: taskId }
          : nextStatus === "completed"
            ? { status: "Completed", currentTaskId: null }
            : nextStatus === "failed"
              ? { status: "Failed", currentTaskId: null }
              : nextStatus === "blocked"
                ? { status: "Blocked", currentTaskId: null }
                : prev.agent,
      recentRuns: [
        {
          id: `${taskId}-${nextStatus}-${Date.now()}`,
          taskId,
          title: prev.queue.find((task) => task.id === taskId)?.title || taskId,
          result: nextStatus.toUpperCase(),
          timestamp: new Date().toISOString(),
        },
        ...prev.recentRuns,
      ].slice(0, 5),
    }));
  };

  const advanceToRunning = () => {
    if (!oldestPendingTask) return;
    updateQueueTask(oldestPendingTask.id, "running");
  };

  const advanceToCompleted = () => {
    const runningTask = state.queue.find((task) => task.status === "running") || null;
    if (!runningTask) return;
    updateQueueTask(runningTask.id, "completed");
  };

  const simulateFailure = () => {
    const runningTask = state.queue.find((task) => task.status === "running") || oldestPendingTask;
    if (!runningTask) return;
    updateQueueTask(runningTask.id, "failed");
  };

  const simulateBlocked = () => {
    const runningTask = state.queue.find((task) => task.status === "running") || oldestPendingTask;
    if (!runningTask) return;
    updateQueueTask(runningTask.id, "blocked");
  };

  const markAuditComplete = () => {
    setState((prev) => {
      const nextAudit = buildCompleteAudit(prev.audit);
      return { ...prev, audit: nextAudit };
    });
  };

  const resetDemoState = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(DEV_AGENT_STORAGE_KEY);
    }
    setState(makeInitialState());
  };

  const toggleAcknowledged = () => {
    setState((prev) => ({
      ...prev,
      safety: { ...prev.safety, warningAcknowledged: !prev.safety.warningAcknowledged },
    }));
  };

  return (
    <section className="rounded-2xl border border-cyan-400/20 bg-slate-950/70 backdrop-blur-xl shadow-[0_0_0_1px_rgba(34,211,238,0.06),0_20px_60px_rgba(2,8,23,0.65)] overflow-hidden">
      <div className="px-4 py-4 border-b border-white/10 bg-gradient-to-r from-cyan-500/10 via-slate-950/40 to-fuchsia-500/10">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-cyan-100">God Mode Developer Agent</h2>
              <p className="text-xs text-slate-300/90">
                Simulation-only panel. No GitHub API calls. No secrets. No auth, permissions, billing, routes, or dependency changes.
              </p>
            </div>
            <a
              className="text-xs text-cyan-300 underline underline-offset-4"
              href="https://github.com/syncworksai/Syncworks-developer-agent/actions"
              target="_blank"
              rel="noreferrer"
            >
              Open GitHub Actions
            </a>
          </div>
          <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-400/20 rounded-xl px-3 py-2">
            Security warning: this panel is simulation-only and must not be used to access live systems or production secrets.
          </div>
        </div>
      </div>

      <div className="p-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">Project Selector</div>
          <select
            value={state.project}
            onChange={(e) => setState((prev) => ({ ...prev, project: e.target.value }))}
            className="w-full rounded-xl bg-slate-900/90 border border-white/10 px-3 py-2 text-sm text-slate-100"
          >
            {DEV_AGENT_PROJECTS.map((project) => (
              <option key={project} value={project}>
                {project}
              </option>
            ))}
          </select>
          <div className="text-sm text-slate-300">Agent status: <span className="text-cyan-200 font-medium">{agentStatus}</span></div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
            <div className="rounded-xl bg-slate-900/80 border border-white/10 p-3">Pending: {queueCounts.pending}</div>
            <div className="rounded-xl bg-slate-900/80 border border-white/10 p-3">Running: {queueCounts.running}</div>
            <div className="rounded-xl bg-slate-900/80 border border-white/10 p-3">Completed: {queueCounts.completed}</div>
            <div className="rounded-xl bg-slate-900/80 border border-white/10 p-3">Blocked/Failed: {queueCounts.blocked + queueCounts.failed}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">Safety Controls</div>
          <label className="flex items-center gap-3 text-sm text-slate-200">
            <input type="checkbox" checked={state.safety.simulationOnly} readOnly className="accent-cyan-400" />
            Simulation-only mode locked on
          </label>
          <label className="flex items-center gap-3 text-sm text-slate-200">
            <input type="checkbox" checked={state.safety.warningAcknowledged} onChange={toggleAcknowledged} className="accent-cyan-400" />
            Acknowledge security warning
          </label>
          <div className="flex flex-wrap gap-2">
            <button onClick={advanceToRunning} className="rounded-xl px-3 py-2 text-xs bg-cyan-500/15 border border-cyan-400/30 text-cyan-100">Move oldest pending → running</button>
            <button onClick={advanceToCompleted} className="rounded-xl px-3 py-2 text-xs bg-emerald-500/15 border border-emerald-400/30 text-emerald-100">Move running → completed</button>
            <button onClick={simulateFailure} className="rounded-xl px-3 py-2 text-xs bg-rose-500/15 border border-rose-400/30 text-rose-100">Simulate Failure</button>
            <button onClick={simulateBlocked} className="rounded-xl px-3 py-2 text-xs bg-amber-500/15 border border-amber-400/30 text-amber-100">Simulate Blocked</button>
          </div>
          <button onClick={resetDemoState} className="rounded-xl px-3 py-2 text-xs bg-slate-800 border border-white/10 text-slate-100">Reset Demo State</button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3 md:col-span-2 xl:col-span-1">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">Audit Manifest</div>
          <div className="text-sm text-slate-300">
            {state.audit.completed} of {state.audit.total} complete • {state.audit.percent}%
          </div>
          <div className="text-sm text-slate-300">Findings: {state.audit.findings.length}</div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={markAuditComplete} className="rounded-xl px-3 py-2 text-xs bg-fuchsia-500/15 border border-fuchsia-400/30 text-fuchsia-100">Mark audit COMPLETE</button>
          </div>
          <div className="max-h-56 overflow-auto space-y-2 pr-1">
            {state.audit.manifest.map((module) => (
              <div key={module.name} className="rounded-xl bg-slate-900/80 border border-white/10 px-3 py-2 text-xs flex items-center justify-between gap-3">
                <span className="text-slate-200">{module.name}</span>
                <span className="text-slate-400">{module.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3 md:col-span-2">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">Approved Task Catalog</div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {state.queue.map((task) => (
              <div key={task.id} className="rounded-xl bg-slate-900/80 border border-white/10 p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm text-slate-100 font-medium">{task.title}</div>
                  <div className="text-[11px] text-cyan-300 uppercase">{task.status}</div>
                </div>
                <div className="text-xs text-slate-400">{task.detail}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">Queue</div>
          <div className="space-y-2">
            {state.queue.map((task) => (
              <div key={task.id} className="rounded-xl bg-slate-900/80 border border-white/10 p-3 text-sm flex items-center justify-between gap-3">
                <span className="text-slate-200">{task.title}</span>
                <span className="text-xs text-slate-400 uppercase">{task.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">Recent Runs</div>
          <div className="space-y-2">
            {state.recentRuns.length === 0 ? (
              <div className="text-sm text-slate-400">No runs yet.</div>
            ) : (
              state.recentRuns.map((run) => (
                <div key={run.id} className="rounded-xl bg-slate-900/80 border border-white/10 p-3 text-xs text-slate-300">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-200">{run.title}</span>
                    <span className="text-cyan-300">{run.result}</span>
                  </div>
                  <div className="text-slate-500 mt-1">{run.timestamp}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
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
