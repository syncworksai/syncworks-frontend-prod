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

const STORAGE_KEY = "syncworks_developer_agent_demo_state";
const PROJECTS = ["SyncWorks Frontend", "SyncWorks Backend", "Developer Agent"];
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
const TASK_CATALOG = [
  { id: "task-1", title: "Stabilize auth session refresh", project: "SyncWorks Backend" },
  { id: "task-2", title: "Tune dashboard loading states", project: "SyncWorks Frontend" },
  { id: "task-3", title: "Verify developer-agent queue wiring", project: "Developer Agent" },
  { id: "task-4", title: "Review deployment health checks", project: "SyncWorks Backend" },
];

const emptyAuditModules = () =>
  AUDIT_MODULES.map((name) => ({ name, status: "NOT_STARTED", reason: "" }));

const emptyFindings = () => [];

const defaultState = {
  project: "Developer Agent",
  auditModules: emptyAuditModules(),
  findings: emptyFindings(),
  queue: [],
};

function loadState() {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return {
      project: PROJECTS.includes(parsed.project) ? parsed.project : "Developer Agent",
      auditModules: Array.isArray(parsed.auditModules) && parsed.auditModules.length === AUDIT_MODULES.length ? parsed.auditModules : emptyAuditModules(),
      findings: Array.isArray(parsed.findings) ? parsed.findings : emptyFindings(),
      queue: Array.isArray(parsed.queue) ? parsed.queue : [],
    };
  } catch {
    return defaultState;
  }
}

function auditComplete(auditModules, findings) {
  const everyModuleDone = auditModules.every(
    (module) => module.status === "PASSED" || (module.status === "DEFERRED" && module.reason.trim())
  );
  const noBlocked = auditModules.every((module) => module.status !== "BLOCKED");
  const everyFindingResolved = findings.every(
    (finding) =>
      finding.status === "RESOLVED" || finding.status === "ACCEPTED_RISK" || (finding.status === "DEFERRED" && finding.reason.trim())
  );
  return everyModuleDone && noBlocked && everyFindingResolved;
}

function statusBadgeClass(status) {
  switch (status) {
    case "PASSED":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "DEFERRED":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "BLOCKED":
      return "bg-red-500/15 text-red-300 border-red-500/30";
    case "RESOLVED":
    case "ACCEPTED_RISK":
      return "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
    case "IN_PROGRESS":
    case "RUNNING":
      return "bg-blue-500/15 text-blue-300 border-blue-500/30";
    default:
      return "bg-slate-800 text-slate-300 border-slate-700";
  }
}

export default function PlatformDashboard() {
  const [tab, setTab] = useState("overview");
  const [panelState, setPanelState] = useState(loadState);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(panelState));
  }, [panelState]);

  const complete = useMemo(() => auditComplete(panelState.auditModules, panelState.findings), [panelState.auditModules, panelState.findings]);
  const totalCount = AUDIT_MODULES.length;
  const doneCount = panelState.auditModules.filter((m) => m.status === "PASSED" || (m.status === "DEFERRED" && m.reason.trim())).length;
  const percent = Math.round((doneCount / totalCount) * 100);

  const enqueueTask = (task) => {
    setPanelState((prev) => {
      if (prev.queue.some((item) => item.id === task.id)) return prev;
      return { ...prev, queue: [...prev.queue, { ...task, status: "PENDING" }] };
    });
  };

  const advanceTask = (taskId) => {
    setPanelState((prev) => ({
      ...prev,
      queue: prev.queue.map((task) => {
        if (task.id !== taskId) return task;
        if (task.status === "PENDING") return { ...task, status: "RUNNING" };
        if (task.status === "RUNNING") return { ...task, status: "COMPLETED" };
        return task;
      }),
    }));
  };

  const failTask = (taskId) => {
    setPanelState((prev) => ({
      ...prev,
      queue: prev.queue.map((task) => (task.id === taskId ? { ...task, status: "FAILED" } : task)),
    }));
  };

  const blockTask = (taskId) => {
    setPanelState((prev) => ({
      ...prev,
      queue: prev.queue.map((task) => (task.id === taskId ? { ...task, status: "BLOCKED" } : task)),
    }));
  };

  const resetDemoState = () => setPanelState(defaultState);

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

        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 backdrop-blur p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Developer Agent</h2>
              <p className="text-sm text-slate-400">
                Simulation-only panel. No browser GitHub API calls, secrets, auth changes, billing changes, or route changes.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetDemoState}
                className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-sm"
              >
                Reset Demo State
              </button>
              <a
                href="https://github.com/syncworksai/Syncworks-developer-agent/actions"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 text-sm"
              >
                GitHub Actions
              </a>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-800 p-4 bg-slate-900/60">
              <div className="text-xs uppercase text-slate-500">Project Selector</div>
              <select
                className="mt-2 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2"
                value={panelState.project}
                onChange={(e) => setPanelState((prev) => ({ ...prev, project: e.target.value }))}
              >
                {PROJECTS.map((project) => (
                  <option key={project} value={project}>
                    {project}
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-xl border border-slate-800 p-4 bg-slate-900/60">
              <div className="text-xs uppercase text-slate-500">Progress</div>
              <div className="mt-2 text-2xl font-semibold">{doneCount}/{totalCount}</div>
              <div className="text-sm text-slate-400">{percent}% complete</div>
            </div>
            <div className="rounded-xl border border-slate-800 p-4 bg-slate-900/60">
              <div className="text-xs uppercase text-slate-500">Audit Complete</div>
              <div className={`mt-2 inline-flex px-2 py-1 rounded-md border text-sm ${complete ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-slate-800 text-slate-300 border-slate-700"}`}>
                {complete ? "YES" : "NO"}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Audit Modules</h3>
                <span className="text-xs text-slate-500">Initial state: all NOT_STARTED</span>
              </div>
              <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
                {panelState.auditModules.map((module, index) => (
                  <div key={module.name} className="rounded-lg border border-slate-800 p-3 bg-slate-950/60">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{index + 1}. {module.name}</div>
                        {module.reason ? <div className="text-sm text-slate-400 mt-1">{module.reason}</div> : null}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-md border ${statusBadgeClass(module.status)}`}>{module.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Approved Task Catalog</h3>
                <span className="text-xs text-slate-500">Add to Queue</span>
              </div>
              <div className="space-y-2">
                {TASK_CATALOG.map((task) => (
                  <div key={task.id} className="rounded-lg border border-slate-800 p-3 bg-slate-950/60 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{task.title}</div>
                      <div className="text-xs text-slate-500">{task.project}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => enqueueTask(task)}
                      className="px-3 py-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 text-sm hover:bg-cyan-500/25"
                    >
                      Add to Queue
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-2">
                <h4 className="font-medium">Queue</h4>
                {panelState.queue.length === 0 ? (
                  <div className="text-sm text-slate-500">Queue empty</div>
                ) : (
                  <div className="space-y-2">
                    {panelState.queue.map((task) => (
                      <div key={task.id} className="rounded-lg border border-slate-800 p-3 bg-slate-950/60">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">{task.title}</div>
                            <div className="text-xs text-slate-500">{task.project}</div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-md border ${statusBadgeClass(task.status)}`}>{task.status}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button" onClick={() => advanceTask(task.id)} className="px-3 py-1.5 rounded-md border border-slate-700 bg-slate-900 text-sm">
                            Advance
                          </button>
                          <button type="button" onClick={() => failTask(task.id)} className="px-3 py-1.5 rounded-md border border-red-500/30 bg-red-500/10 text-sm text-red-200">
                            Explicit Failure
                          </button>
                          <button type="button" onClick={() => blockTask(task.id)} className="px-3 py-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 text-sm text-amber-200">
                            Explicit Blocked
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <h3 className="font-semibold mb-3">Findings</h3>
            {panelState.findings.length === 0 ? (
              <div className="text-sm text-slate-500">Findings empty</div>
            ) : (
              <div className="space-y-2" />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
