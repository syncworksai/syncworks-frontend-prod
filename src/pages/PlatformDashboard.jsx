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
];

const STORAGE_KEY = "syncworks_god_mode_developer_agent_phase1";
const PROJECT_OPTIONS = ["SyncWorks Frontend", "SyncWorks Backend", "Developer Agent"];
const AUDIT_MODULES = [
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
const FINDING_STATUSES = ["OPEN", "RESOLVED", "ACCEPTED_RISK", "DEFERRED"];
const MODULE_STATUSES = ["NOT_STARTED", "PASSED", "DEFERRED", "BLOCKED"];
const TASK_CATALOG = [
  {
    id: "task-1",
    title: "Review auth/session flows",
    project: "SyncWorks Frontend",
    description: "Inspect login, session refresh, and logout behavior for edge cases.",
  },
  {
    id: "task-2",
    title: "Verify backend endpoint coverage",
    project: "SyncWorks Backend",
    description: "Check API routes, error handling, and response contracts.",
  },
  {
    id: "task-3",
    title: "Run developer agent audit sweep",
    project: "Developer Agent",
    description: "Execute deterministic module review and track findings separately from queue tasks.",
  },
];

function createInitialAuditModules() {
  return AUDIT_MODULES.map((name) => ({
    name,
    status: "NOT_STARTED",
    reason: "",
  }));
}

function createInitialFindings() {
  return [];
}

function createInitialQueue() {
  return [];
}

function createInitialState() {
  return {
    project: "Developer Agent",
    auditModules: createInitialAuditModules(),
    findings: createInitialFindings(),
    queue: createInitialQueue(),
    activeTaskId: null,
    auditProgress: { completed: 0, total: 20, percent: 0 },
    simulationLog: ["Simulation only: deterministic queue and audit transitions are enabled."],
  };
}

function loadState() {
  if (typeof window === "undefined") return createInitialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    const base = createInitialState();
    return {
      ...base,
      ...parsed,
      auditModules: Array.isArray(parsed.auditModules) && parsed.auditModules.length === AUDIT_MODULES.length ? parsed.auditModules : base.auditModules,
      findings: Array.isArray(parsed.findings) ? parsed.findings : base.findings,
      queue: Array.isArray(parsed.queue) ? parsed.queue : base.queue,
      project: PROJECT_OPTIONS.includes(parsed.project) ? parsed.project : base.project,
      activeTaskId: parsed.activeTaskId ?? null,
      auditProgress: parsed.auditProgress || base.auditProgress,
      simulationLog: Array.isArray(parsed.simulationLog) ? parsed.simulationLog : base.simulationLog,
    };
  } catch {
    return createInitialState();
  }
}

function computeAuditComplete(auditModules, findings) {
  const modulesOk = auditModules.every(
    (module) => module.status === "PASSED" || (module.status === "DEFERRED" && module.reason.trim().length > 0),
  );
  const noBlocked = auditModules.every((module) => module.status !== "BLOCKED");
  const findingsOk = findings.every(
    (finding) => finding.status === "RESOLVED" || finding.status === "ACCEPTED_RISK" || (finding.status === "DEFERRED" && finding.reason.trim().length > 0),
  );
  return modulesOk && noBlocked && findingsOk;
}

function auditProgressFromModules(auditModules) {
  const completed = auditModules.filter((module) => module.status === "PASSED" || module.status === "DEFERRED").length;
  const total = auditModules.length;
  return {
    completed,
    total,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

function DeveloperAgentPanel() {
  const [state, setState] = useState(() => loadState());

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const auditComplete = useMemo(
    () => computeAuditComplete(state.auditModules, state.findings),
    [state.auditModules, state.findings],
  );

  const queueTaskById = (taskId) => {
    const task = TASK_CATALOG.find((item) => item.id === taskId);
    if (!task) return;
    setState((prev) => {
      if (prev.queue.some((item) => item.id === taskId)) return prev;
      return { ...prev, queue: [...prev.queue, { ...task, status: "PENDING" }] };
    });
  };

  const runNextQueueTask = () => {
    setState((prev) => {
      const nextIndex = prev.queue.findIndex((item) => item.status === "PENDING");
      if (nextIndex === -1) return prev;
      const nextQueue = prev.queue.map((item, index) =>
        index === nextIndex ? { ...item, status: "RUNNING" } : item,
      );
      return { ...prev, queue: nextQueue, activeTaskId: prev.queue[nextIndex].id };
    });
  };

  const completeActiveTask = () => {
    setState((prev) => {
      const activeIndex = prev.queue.findIndex((item) => item.id === prev.activeTaskId);
      if (activeIndex === -1) return prev;
      const nextQueue = prev.queue.map((item, index) =>
        index === activeIndex ? { ...item, status: "COMPLETED" } : item,
      );
      return { ...prev, queue: nextQueue, activeTaskId: null };
    });
  };

  const failActiveTask = () => {
    setState((prev) => {
      const activeIndex = prev.queue.findIndex((item) => item.id === prev.activeTaskId);
      if (activeIndex === -1) return prev;
      const nextQueue = prev.queue.map((item, index) =>
        index === activeIndex ? { ...item, status: "FAILED" } : item,
      );
      return { ...prev, queue: nextQueue, activeTaskId: null };
    });
  };

  const blockModule = (moduleName, reason) => {
    setState((prev) => ({
      ...prev,
      auditModules: prev.auditModules.map((module) =>
        module.name === moduleName ? { ...module, status: "BLOCKED", reason } : module,
      ),
    }));
  };

  const passModule = (moduleName) => {
    setState((prev) => ({
      ...prev,
      auditModules: prev.auditModules.map((module) =>
        module.name === moduleName ? { ...module, status: "PASSED", reason: "" } : module,
      ),
    }));
  };

  const deferModule = (moduleName, reason) => {
    setState((prev) => ({
      ...prev,
      auditModules: prev.auditModules.map((module) =>
        module.name === moduleName ? { ...module, status: "DEFERRED", reason } : module,
      ),
    }));
  };

  const resetDemoState = () => {
    const fresh = createInitialState();
    setState(fresh);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    }
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-cyan-400/20 bg-slate-950/70 p-5 shadow-2xl shadow-cyan-950/20">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">God Mode Developer Agent</div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-50">Phase 1 audit and task orchestration panel</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Simulation only: deterministic queue progression, module review, and finding resolution. No browser API calls, auth changes, billing changes, route changes, or dependencies.
            </p>
          </div>
          <button
            type="button"
            onClick={resetDemoState}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800"
          >
            Reset Demo State
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Project selector</div>
            <select
              value={state.project}
              onChange={(e) => setState((prev) => ({ ...prev, project: e.target.value }))}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            >
              {PROJECT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Audit progress</div>
            <div className="mt-2 text-2xl font-semibold text-slate-50">{state.auditProgress.completed}/{state.auditProgress.total}</div>
            <div className="mt-1 text-sm text-slate-300">{state.auditProgress.percent}% complete</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Audit complete</div>
            <div className="mt-2 text-2xl font-semibold text-slate-50">{auditComplete ? "YES" : "NO"}</div>
            <div className="mt-1 text-sm text-slate-300">Computed from module and finding states only.</div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-50">Audit Modules</h3>
            <div className="text-xs uppercase tracking-[0.25em] text-slate-400">0/20, 0%</div>
          </div>
          <div className="mt-4 space-y-3">
            {state.auditModules.map((module) => (
              <div key={module.name} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-medium text-slate-100">{module.name}</div>
                    <div className="text-xs text-slate-400">{module.status}{module.reason ? ` · ${module.reason}` : ""}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => passModule(module.name)} className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500">
                      Pass
                    </button>
                    <button type="button" onClick={() => deferModule(module.name, "Deferred pending follow-up") } className="rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-500">
                      Defer
                    </button>
                    <button type="button" onClick={() => blockModule(module.name, "Blocked by upstream dependency") } className="rounded-md bg-rose-600 px-3 py-1 text-xs font-medium text-white hover:bg-rose-500">
                      Block
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-50">Findings</h3>
              <button
                type="button"
                onClick={() => setState((prev) => ({ ...prev, findings: [...prev.findings, { id: `finding-${prev.findings.length + 1}`, title: `Finding ${prev.findings.length + 1}`, status: "OPEN", reason: "" }] }))}
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-100 hover:bg-slate-800"
              >
                Add finding
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {state.findings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-800 p-4 text-sm text-slate-400">No findings yet.</div>
              ) : (
                state.findings.map((finding, index) => (
                  <div key={finding.id || index} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        value={finding.title}
                        onChange={(e) => setState((prev) => ({
                          ...prev,
                          findings: prev.findings.map((item, itemIndex) => itemIndex === index ? { ...item, title: e.target.value } : item),
                        }))}
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                      />
                      <select
                        value={finding.status}
                        onChange={(e) => setState((prev) => ({
                          ...prev,
                          findings: prev.findings.map((item, itemIndex) => itemIndex === index ? { ...item, status: e.target.value } : item),
                        }))}
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                      >
                        {FINDING_STATUSES.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                    <input
                      value={finding.reason}
                      onChange={(e) => setState((prev) => ({
                        ...prev,
                        findings: prev.findings.map((item, itemIndex) => itemIndex === index ? { ...item, reason: e.target.value } : item),
                      }))}
                      placeholder="Reason required for deferred findings"
                      className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-50">Task Queue</h3>
              <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Deterministic transitions only</div>
            </div>
            <div className="mt-4 grid gap-3">
              {TASK_CATALOG.map((task) => (
                <div key={task.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="font-medium text-slate-100">{task.title}</div>
                  <div className="text-xs text-slate-400">{task.project} · {task.description}</div>
                  <button
                    type="button"
                    onClick={() => queueTaskById(task.id)}
                    className="mt-3 rounded-md bg-cyan-600 px-3 py-1 text-xs font-medium text-white hover:bg-cyan-500"
                  >
                    Add to Queue
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={runNextQueueTask} className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500">
                Pending → Running
              </button>
              <button type="button" onClick={completeActiveTask} className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500">
                Running → Completed
              </button>
              <button type="button" onClick={failActiveTask} className="rounded-md bg-rose-600 px-3 py-1 text-xs font-medium text-white hover:bg-rose-500">
                Explicit Failure
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {state.queue.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-800 p-4 text-sm text-slate-400">Queue empty.</div>
              ) : (
                state.queue.map((task) => (
                  <div key={task.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
                    <div className="font-medium">{task.title}</div>
                    <div className="text-xs text-slate-400">{task.status}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 text-sm text-slate-300">
        <div className="font-semibold text-slate-100">GitHub Actions</div>
        <a
          href="https://github.com/syncworksai/Syncworks-developer-agent/actions"
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-cyan-300 hover:text-cyan-200"
        >
          https://github.com/syncworksai/Syncworks-developer-agent/actions
        </a>
      </div>

      <div className="rounded-2xl border border-amber-400/20 bg-amber-950/30 p-4 text-sm text-amber-100">
        Simulation only warning: this panel is deterministic and does not perform browser GitHub API calls or sensitive production actions.
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
        {tab === "overview" ? <DeveloperAgentPanel /> : null}
      </main>
    </div>
  );
}
