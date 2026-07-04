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

const AGENT_STATUS_META = {
  OFF: { label: "OFF", ring: "ring-slate-500/30", badge: "bg-slate-500/15 text-slate-200 border-slate-500/30", dot: "bg-slate-400" },
  READY: { label: "READY", ring: "ring-cyan-500/30", badge: "bg-cyan-500/15 text-cyan-200 border-cyan-500/30", dot: "bg-cyan-400" },
  RUNNING: { label: "RUNNING", ring: "ring-emerald-500/30", badge: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30", dot: "bg-emerald-400" },
  PAUSED: { label: "PAUSED", ring: "ring-amber-500/30", badge: "bg-amber-500/15 text-amber-200 border-amber-500/30", dot: "bg-amber-400" },
  FAILED: { label: "FAILED", ring: "ring-rose-500/30", badge: "bg-rose-500/15 text-rose-200 border-rose-500/30", dot: "bg-rose-400" },
  COMPLETE: { label: "COMPLETE", ring: "ring-fuchsia-500/30", badge: "bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-500/30", dot: "bg-fuchsia-400" },
};

const TASK_CATALOG = [
  { id: "agent-bootstrap", title: "Bootstrap agent workspace", project: "Developer Agent", priority: "P0", description: "Create a simulation-only workspace flow, validate branch-only execution, and prepare safe queue metadata." },
  { id: "frontend-audit", title: "Frontend audit sweep", project: "SyncWorks Frontend", priority: "P1", description: "Review mobile-first UI consistency, component states, and dark navy/neon glassmorphism alignment." },
  { id: "backend-apis", title: "Backend API contract review", project: "SyncWorks Backend", priority: "P1", description: "Inspect endpoints, payload shapes, and failure handling without calling live production APIs." },
  { id: "billing-guardrails", title: "Billing guardrails verification", project: "SyncWorks Backend", priority: "P0", description: "Confirm no automatic billing mutations, deployment, or merge actions occur from the browser." },
  { id: "audit-handoff", title: "Audit handoff package", project: "Developer Agent", priority: "P2", description: "Summarize findings, unresolved items, and completion criteria for operator review." },
];

const PROJECT_OPTIONS = ["SyncWorks Frontend", "SyncWorks Backend", "Developer Agent"];
const QUEUE_STATUSES = ["pending", "running", "completed", "failed", "blocked"];
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

const DEFAULT_AUDIT = {
  modules: MODULES.map((name, index) => ({
    name,
    status: index < 6 ? "PASSED" : index === 9 ? "RUNNING" : "NOT_STARTED",
    reason: index < 6 ? "Verified in simulation review." : "",
  })),
  findings: [
    { id: "f1", module: "Backend APIs", status: "RESOLVED", reason: "Contract issue was corrected in the demo plan." },
    { id: "f2", module: "Database Migrations", status: "DEFERRED", reason: "Deferred until secure dispatcher is connected." },
    { id: "f3", module: "Deployment Health", status: "ACCEPTED_RISK", reason: "Manual operator follow-up required for production rollout." },
  ],
  lastAuditAt: new Date().toISOString(),
};

const STORAGE_KEYS = {
  queue: "syncworks_developer_agent_queue_v1",
  audit: "syncworks_developer_agent_audit_v1",
  agent: "syncworks_developer_agent_state_v1",
};

function safeRead(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function Badge({ children, className = "" }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${className}`}>{children}</span>;
}

function Card({ children, className = "" }) {
  return <div className={`rounded-2xl border border-cyan-400/10 bg-white/5 backdrop-blur-xl shadow-[0_0_0_1px_rgba(34,211,238,0.04),0_24px_80px_rgba(3,7,18,0.45)] ${className}`}>{children}</div>;
}

function SectionTitle({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-300/80">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

function DeveloperAgentPanel() {
  const [agentStatus, setAgentStatus] = useState("READY");
  const [selectedProject, setSelectedProject] = useState(PROJECT_OPTIONS[0]);
  const [selectedTaskId, setSelectedTaskId] = useState(TASK_CATALOG[0].id);
  const [queue, setQueue] = useState([]);
  const [audit, setAudit] = useState(DEFAULT_AUDIT);

  useEffect(() => {
    setQueue(safeRead(STORAGE_KEYS.queue, []));
    const savedAudit = safeRead(STORAGE_KEYS.audit, DEFAULT_AUDIT);
    setAudit(savedAudit);
    setAgentStatus(safeRead(STORAGE_KEYS.agent, { status: "READY" }).status || "READY");
  }, []);

  useEffect(() => safeWrite(STORAGE_KEYS.queue, queue), [queue]);
  useEffect(() => safeWrite(STORAGE_KEYS.audit, audit), [audit]);
  useEffect(() => safeWrite(STORAGE_KEYS.agent, { status: agentStatus }), [agentStatus]);

  const selectedTask = useMemo(() => TASK_CATALOG.find((task) => task.id === selectedTaskId) || TASK_CATALOG[0], [selectedTaskId]);

  const queueCounts = useMemo(() => {
    const counts = { pending: 0, running: 0, completed: 0, failed: 0, blocked: 0 };
    queue.forEach((item) => {
      if (counts[item.status] !== undefined) counts[item.status] += 1;
    });
    return counts;
  }, [queue]);

  const auditSummary = useMemo(() => {
    const modulesCompleted = audit.modules.filter((m) => m.status === "PASSED" || (m.status === "DEFERRED" && m.reason)).length;
    const blockedModules = audit.modules.filter((m) => m.status === "BLOCKED").length;
    const unresolvedFindings = audit.findings.filter((f) => !["RESOLVED", "ACCEPTED_RISK", "DEFERRED"].includes(f.status) || !f.reason).length;
    const percentComplete = Math.round((modulesCompleted / audit.modules.length) * 100);
    const finalStatus = modulesCompleted === audit.modules.length && blockedModules === 0 && unresolvedFindings === 0 ? "COMPLETE" : blockedModules > 0 || unresolvedFindings > 0 ? "NEEDS_ATTENTION" : "IN_PROGRESS";
    return { modulesCompleted, blockedModules, unresolvedFindings, percentComplete, finalStatus };
  }, [audit]);

  const addToQueue = () => {
    setQueue((current) => [
      {
        id: `job-${Date.now()}`,
        taskId: selectedTask.id,
        title: selectedTask.title,
        project: selectedProject,
        status: "pending",
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
    setAgentStatus("READY");
  };

  const simulateRun = () => {
    setAgentStatus("RUNNING");
    setQueue((current) => {
      const next = [...current];
      const pendingIndex = next.findIndex((item) => item.status === "pending");
      if (pendingIndex >= 0) next[pendingIndex] = { ...next[pendingIndex], status: Math.random() > 0.82 ? "failed" : "running", startedAt: new Date().toISOString() };
      return next;
    });
  };

  const pause = () => setAgentStatus("PAUSED");
  const resume = () => setAgentStatus("RUNNING");
  const clearCompleted = () => setQueue((current) => current.filter((item) => item.status !== "completed"));
  const openActions = () => window.open("https://github.com/SyncWorks", "_blank", "noopener,noreferrer");

  return (
    <div className="space-y-4 pb-8">
      <Card className="p-4 sm:p-5 border-cyan-400/20 bg-gradient-to-br from-slate-950/90 via-slate-900/70 to-cyan-950/20">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-cyan-500/15 text-cyan-200 border-cyan-500/30">GOD MODE</Badge>
              <Badge className={AGENT_STATUS_META[agentStatus]?.badge || AGENT_STATUS_META.READY.badge}>{agentStatus}</Badge>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Developer Agent Command Panel</h2>
              <p className="mt-1 text-sm text-slate-300/80 max-w-3xl">
                Run Task is simulation-only until the secure God Mode backend dispatcher is connected. Do not call GitHub APIs from the browser and do not expose tokens or secrets.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto">
            {[
              ["Add to Queue", addToQueue],
              ["Simulate Run", simulateRun],
              ["Pause", pause],
              ["Resume", resume],
            ].map(([label, onClick]) => (
              <button key={label} onClick={onClick} className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm font-medium text-cyan-50 hover:bg-cyan-400/15">
                {label}
              </button>
            ))}
            <button onClick={clearCompleted} className="rounded-xl border border-slate-500/20 bg-white/5 px-3 py-2 text-sm font-medium text-slate-100 hover:bg-white/10">Clear Completed</button>
            <button onClick={openActions} className="rounded-xl border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-2 text-sm font-medium text-fuchsia-50 hover:bg-fuchsia-400/15">Open GitHub Actions</button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-4 xl:col-span-1">
          <SectionTitle title="Agent Status" subtitle="State machine for safe operator-controlled task execution." />
          <div className={`mt-4 rounded-2xl border p-4 ${AGENT_STATUS_META[agentStatus]?.ring || AGENT_STATUS_META.READY.ring}`}>
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${AGENT_STATUS_META[agentStatus]?.dot || AGENT_STATUS_META.READY.dot}`} />
              <div>
                <div className="text-2xl font-semibold text-white">{agentStatus}</div>
                <div className="text-sm text-slate-300/80">Branch-only ON • Draft PR only ON • Stop-on-failure ON</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-200">
              <div className="rounded-xl bg-white/5 p-3">Auto-merge: OFF</div>
              <div className="rounded-xl bg-white/5 p-3">Auto-deploy: OFF</div>
              <div className="rounded-xl bg-white/5 p-3">Prod migrations: OFF</div>
              <div className="rounded-xl bg-white/5 p-3">One task at a time: ON</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 xl:col-span-2">
          <SectionTitle title="Project Selector" subtitle="Choose the target workspace before queuing a simulated run." />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {PROJECT_OPTIONS.map((project) => (
              <button
                key={project}
                onClick={() => setSelectedProject(project)}
                className={`rounded-2xl border px-4 py-4 text-left transition ${selectedProject === project ? "border-cyan-400/40 bg-cyan-400/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
              >
                <div className="text-sm font-semibold text-white">{project}</div>
                <div className="mt-1 text-xs text-slate-300/70">Simulation-only target</div>
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <select value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none">
              {TASK_CATALOG.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
            </select>
            <div className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">Selected: {selectedTask.title}</div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <SectionTitle title="Approved Task Catalog" subtitle="Only approved simulation tasks are shown here." />
          <div className="mt-4 grid gap-3">
            {TASK_CATALOG.map((task) => (
              <button key={task.id} onClick={() => setSelectedTaskId(task.id)} className={`w-full rounded-2xl border p-4 text-left ${selectedTaskId === task.id ? "border-cyan-400/40 bg-cyan-400/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-white">{task.title}</div>
                    <div className="mt-1 text-sm text-slate-300/75">{task.description}</div>
                  </div>
                  <Badge className="bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-500/30">{task.priority}</Badge>
                </div>
                <div className="mt-3 text-xs text-cyan-200/80">Project: {task.project}</div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <SectionTitle title="Queue" subtitle={`Pending ${queueCounts.pending} • Running ${queueCounts.running} • Completed ${queueCounts.completed} • Failed ${queueCounts.failed} • Blocked ${queueCounts.blocked}`} />
          <div className="mt-4 space-y-3 max-h-[520px] overflow-auto pr-1">
            {queue.length ? queue.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-white">{item.title}</div>
                    <div className="mt-1 text-xs text-slate-300/70">{item.project} • {new Date(item.createdAt).toLocaleString()}</div>
                  </div>
                  <Badge className={item.status === "completed" ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/30" : item.status === "failed" ? "bg-rose-500/15 text-rose-200 border-rose-500/30" : item.status === "running" ? "bg-cyan-500/15 text-cyan-200 border-cyan-500/30" : item.status === "blocked" ? "bg-amber-500/15 text-amber-200 border-amber-500/30" : "bg-slate-500/15 text-slate-200 border-slate-500/30"}>{item.status.toUpperCase()}</Badge>
                </div>
              </div>
            )) : <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-300/70">No queued tasks yet. Add one to test the local simulation.</div>}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <SectionTitle title="Safety Controls" subtitle="Production-safe guardrails stay locked on this panel." />
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              ["Branch-only", "ON"],
              ["Draft PR only", "ON"],
              ["Auto-merge", "OFF"],
              ["Auto-deploy", "OFF"],
              ["Production migrations", "OFF"],
              ["Stop-on-failure", "ON"],
              ["One-task-at-a-time", "ON"],
            ].map(([label, value]) => <div key={label} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-200"><span className="text-slate-300/70">{label}:</span> <span className="font-semibold text-white">{value}</span></div>)}
          </div>
        </Card>

        <Card className="p-4">
          <SectionTitle title="Recent Runs" subtitle="Local demo history persists in browser storage." />
          <div className="mt-4 space-y-3">
            {(queue.slice(0, 4)).map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-white">{item.title}</div>
                    <div className="text-xs text-slate-300/70">{item.project}</div>
                  </div>
                  <Badge className="bg-cyan-500/15 text-cyan-200 border-cyan-500/30">{item.status.toUpperCase()}</Badge>
                </div>
              </div>
            ))}
            {!queue.length ? <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-300/70">Recent runs will appear after you add items to the queue.</div> : null}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <SectionTitle title="Links" subtitle="Navigation helpers for operator review only." />
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <a className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-50 hover:bg-cyan-400/15" href="https://github.com/SyncWorks/actions" target="_blank" rel="noreferrer">GitHub Actions</a>
          <a className="rounded-xl border border-fuchsia-400/20 bg-fuchsia-400/10 px-4 py-3 text-sm font-medium text-fuchsia-50 hover:bg-fuchsia-400/15" href="https://github.com/SyncWorks/pulls" target="_blank" rel="noreferrer">Draft PRs</a>
        </div>
      </Card>

      <Card className="p-4">
        <SectionTitle title="Audit Coverage" subtitle="Module-by-module coverage uses the explicit manifest and persists locally for manual testing." />
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <div className="xl:col-span-1 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-slate-300/70">Percent complete</div>
              <div className="mt-1 text-3xl font-semibold text-white">{auditSummary.percentComplete}%</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 space-y-2">
              <div>Modules completed: <span className="font-semibold text-white">{auditSummary.modulesCompleted}/{audit.modules.length}</span></div>
              <div>Unresolved findings: <span className="font-semibold text-white">{auditSummary.unresolvedFindings}</span></div>
              <div>Blocked modules: <span className="font-semibold text-white">{auditSummary.blockedModules}</span></div>
              <div>Last audit timestamp: <span className="font-semibold text-white">{new Date(audit.lastAuditAt).toLocaleString()}</span></div>
              <div>Final status: <span className="font-semibold text-cyan-200">{auditSummary.finalStatus}</span></div>
            </div>
          </div>
          <div className="xl:col-span-2 grid gap-3 sm:grid-cols-2">
            {audit.modules.map((module) => (
              <div key={module.name} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-white">{module.name}</div>
                    {module.reason ? <div className="mt-1 text-xs text-slate-300/75">{module.reason}</div> : null}
                  </div>
                  <Badge className={module.status === "PASSED" ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/30" : module.status === "FINDINGS" ? "bg-amber-500/15 text-amber-200 border-amber-500/30" : module.status === "BLOCKED" ? "bg-rose-500/15 text-rose-200 border-rose-500/30" : "bg-slate-500/15 text-slate-200 border-slate-500/30"}>{module.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <p className="text-xs text-slate-400/80">Simulation-only: this panel persists demo queue and audit state in localStorage for manual testing and does not invoke GitHub APIs or secure backend dispatchers.</p>
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
        subtitle="Platform console — performance, billing locks, ads, broadcasts, support triage, and Developer Agent controls."
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
