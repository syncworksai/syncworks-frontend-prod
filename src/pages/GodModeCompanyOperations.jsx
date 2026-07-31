import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "syncworks_god_mode_company_ops_v1";
const MODES = ["OFF", "ASSIST_ONLY", "APPROVAL_REQUIRED", "AUTONOMOUS"];
const STAGES = ["AUDIT_NEEDED", "READY_TO_BUILD", "BUILDING", "PREVIEW_READY", "TESTING", "PRODUCTION_READY", "COMPLETE", "BLOCKED"];

const automationSeed = [
  ["master", "Master Operations Agent", "Coordinates priorities, projects, approvals, and escalations.", "APPROVAL_REQUIRED"],
  ["audit", "Application Audit Agent", "Reviews auth, dashboards, APIs, mobile UX, and launch readiness.", "ASSIST_ONLY"],
  ["qa", "QA Agent", "Creates acceptance checks and records passed, warning, failed, or blocked results.", "ASSIST_ONLY"],
  ["frontend", "Frontend Build Agent", "Prepares scoped React, Vite, and Tailwind branches and pull requests.", "APPROVAL_REQUIRED"],
  ["backend", "Backend Build Agent", "Prepares scoped Django REST changes and migrations.", "APPROVAL_REQUIRED"],
  ["deployment", "Deployment Agent", "Tracks previews, production deployments, failures, and rollback points.", "ASSIST_ONLY"],
  ["support", "Customer Support Agent", "Handles common questions and escalates unresolved or risky cases.", "ASSIST_ONLY"],
  ["social", "Social Content Agent", "Creates drafts, campaigns, calendars, and approval-ready publishing tasks.", "APPROVAL_REQUIRED"],
  ["lead", "Lead Qualification Agent", "Categorizes leads, recommends next steps, and prevents missed follow-up.", "ASSIST_ONLY"],
  ["onboarding", "Onboarding Agent", "Finds incomplete setup and creates approved follow-up actions.", "ASSIST_ONLY"],
  ["billing", "Billing Watch Agent", "Tracks verified revenue, failed payments, invoices, and billing gaps.", "ASSIST_ONLY"],
  ["release", "Production Readiness Agent", "Checks launch gates, blockers, monitoring, and rollback readiness.", "ASSIST_ONLY"],
].map(([id, name, scope, mode]) => ({ id, name, scope, mode, status: "READY", lastRun: "Never", failures: 0 }));

const projectSeed = [
  ["auth-network", "Login network error and session stability", "Authentication", "AUDIT_NEEDED", "CRITICAL", "audit", 10],
  ["social-small", "Small social media automations", "Social Media", "READY_TO_BUILD", "HIGH", "social", 35],
  ["god-ops", "God Mode company operations foundation", "God Mode", "BUILDING", "HIGH", "master", 80],
  ["bot-audits", "Repeatable module audit coverage", "Platform", "AUDIT_NEEDED", "HIGH", "audit", 20],
  ["revenue-source", "Connect verified platform revenue", "Finance", "READY_TO_BUILD", "MEDIUM", "billing", 0],
  ["real-test-users", "Separate real users from test accounts", "Users", "AUDIT_NEEDED", "HIGH", "onboarding", 15],
  ["support-routing", "Support escalation and bug-to-project routing", "Support", "READY_TO_BUILD", "HIGH", "support", 25],
].map(([id, title, module, stage, priority, bot, progress]) => ({ id, title, module, stage, priority, bot, progress, acceptance: "Require a verified data source, clear completion criteria, test evidence, and owner approval before production." }));

const gateSeed = [
  ["auth", "Authentication and mobile session stability"],
  ["billing", "Verified billing and revenue source"],
  ["support", "Support intake and escalation"],
  ["monitoring", "Deployment, error, and uptime monitoring"],
  ["security", "Owner-only permissions and security review"],
  ["onboarding", "Real-user onboarding and abandoned setup follow-up"],
  ["social", "Approved social content and publishing workflow"],
  ["rollback", "Known stable commits and rollback process"],
].map(([id, label]) => ({ id, label, status: "PENDING" }));

const needsMeSeed = [
  ["approve-social", "Approve this week's social content", "Social Media", "HIGH"],
  ["auth-investigation", "Approve login stability audit", "Authentication", "CRITICAL"],
  ["billing-source", "Choose the first verified billing source", "Finance", "HIGH"],
].map(([id, title, area, priority]) => ({ id, title, area, priority, status: "OPEN" }));

function initialState() {
  return {
    automations: automationSeed,
    projects: projectSeed,
    gates: gateSeed,
    needsMe: needsMeSeed,
    metrics: { verifiedRevenue: 0, realUsers: 0, testAccounts: 0, failedAutomations: 0 },
    connections: [
      ["GitHub", "CONNECTED"], ["Vercel", "CONNECTED"], ["Render", "NOT_VERIFIED"], ["Stripe", "NOT_CONNECTED"], ["Billing API", "NOT_CONNECTED"], ["Social Channels", "NOT_CONNECTED"], ["Support Inbox", "NOT_CONNECTED"],
    ].map(([name, status]) => ({ name, status })),
    activity: [{ id: Date.now(), text: "Company Operations Foundation initialized", at: new Date().toISOString() }],
  };
}

function loadState() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    return parsed?.projects ? parsed : initialState();
  } catch {
    return initialState();
  }
}

function Panel({ title, action, children, className = "" }) {
  return <section className={`overflow-hidden rounded-2xl border border-blue-500/20 bg-[#050b1c]/90 ${className}`}><div className="flex items-center justify-between gap-3 border-b border-blue-500/15 px-4 py-3"><h2 className="text-sm font-black uppercase tracking-wide text-white">{title}</h2>{action}</div>{children}</section>;
}

function tone(value) {
  if (["CONNECTED", "COMPLETE", "PRODUCTION_READY", "PASSED", "READY"].includes(value)) return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  if (["CRITICAL", "BLOCKED", "FAILED", "NOT_CONNECTED"].includes(value)) return "border-rose-400/30 bg-rose-400/10 text-rose-300";
  if (["HIGH", "BUILDING", "READY_TO_BUILD", "APPROVAL_REQUIRED"].includes(value)) return "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-300";
  return "border-amber-400/30 bg-amber-400/10 text-amber-300";
}

export default function GodModeCompanyOperations() {
  const [state, setState] = useState(loadState);
  const [selectedId, setSelectedId] = useState(state.projects[0]?.id);
  const [running, setRunning] = useState("");

  useEffect(() => { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);

  const selected = state.projects.find((item) => item.id === selectedId) || state.projects[0];
  const launch = useMemo(() => {
    const complete = state.gates.filter((gate) => gate.status === "PASSED").length;
    return { complete, percent: Math.round((complete / state.gates.length) * 100), blocked: state.gates.filter((gate) => gate.status === "BLOCKED").length };
  }, [state.gates]);

  function log(text) {
    setState((current) => ({ ...current, activity: [{ id: Date.now(), text, at: new Date().toISOString() }, ...current.activity].slice(0, 40) }));
  }

  function patchProject(id, patch) {
    setState((current) => ({ ...current, projects: current.projects.map((project) => project.id === id ? { ...project, ...patch } : project) }));
  }

  function runAutomation(id) {
    const automation = state.automations.find((item) => item.id === id);
    if (!automation || automation.mode === "OFF" || running) return;
    setRunning(id);
    log(`${automation.name} started`);
    window.setTimeout(() => {
      setState((current) => ({ ...current, automations: current.automations.map((item) => item.id === id ? { ...item, lastRun: new Date().toISOString(), status: "READY" } : item) }));
      if (selected) patchProject(selected.id, { progress: Math.min(95, selected.progress + 5) });
      log(`${automation.name} completed a controlled run; owner review may still be required`);
      setRunning("");
    }, 650);
  }

  function resolveNeed(id) {
    setState((current) => ({ ...current, needsMe: current.needsMe.map((item) => item.id === id ? { ...item, status: "RESOLVED" } : item) }));
    log(`Owner action resolved: ${state.needsMe.find((item) => item.id === id)?.title}`);
  }

  function reset() {
    const next = initialState();
    setState(next);
    setSelectedId(next.projects[0].id);
  }

  const briefing = [
    `${state.needsMe.filter((item) => item.status === "OPEN").length} owner decisions need attention`,
    `${state.projects.filter((item) => item.stage === "BLOCKED").length} blocked projects`,
    `${state.automations.filter((item) => item.failures > 0).length} automations reporting failures`,
    `${launch.percent}% of launch gates verified`,
    `$${state.metrics.verifiedRevenue.toLocaleString()} verified platform revenue`,
  ];

  return <div className="min-h-screen bg-[#020617] text-slate-200">
    <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_8%_65%,rgba(0,102,255,.18),transparent_28%),radial-gradient(circle_at_92%_80%,rgba(168,40,255,.16),transparent_32%)]" />
    <div className="relative mx-auto max-w-[1900px] p-3 pb-24 sm:p-5 lg:p-7">
      <header className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div><h1 className="text-2xl font-black tracking-[0.08em] text-white sm:text-3xl">SYNCWORKS <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-400 bg-clip-text text-transparent">GOD MODE</span></h1><p className="mt-1 text-sm text-slate-400">Private company operating hub for launch readiness, approvals, automations, users, support, social, builds, and verified finance.</p></div>
        <div className="flex flex-wrap gap-2"><Link to="/platform?tab=developer_agent" className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-200">Developer Agent</Link><Link to="/platform?tab=growth_os" className="rounded-xl bg-gradient-to-r from-blue-600 to-fuchsia-600 px-4 py-2 text-sm font-bold text-white">Social Media</Link><button type="button" onClick={reset} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm">Reset local ops data</button></div>
      </header>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[["Verified Revenue", `$${state.metrics.verifiedRevenue.toLocaleString()}`, "Live billing not connected"], ["Real Users", state.metrics.realUsers, "Awaiting account classification"], ["Test Accounts", state.metrics.testAccounts, "Awaiting account classification"], ["Needs Me", state.needsMe.filter((item) => item.status === "OPEN").length, "Owner decisions"], ["Launch Ready", `${launch.percent}%`, `${launch.blocked} blocked gates`], ["Failed Automations", state.metrics.failedAutomations, "Requires investigation"]].map(([label, value, note]) => <div key={label} className="rounded-2xl border border-blue-500/20 bg-[#050b1c]/90 p-4"><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</div><div className="mt-2 text-2xl font-black text-white">{value}</div><div className="mt-1 text-xs text-slate-500">{note}</div></div>)}
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel title="Daily Company Briefing" className="xl:col-span-5" action={<span className="text-xs text-emerald-300">Current board state</span>}><div className="space-y-2 p-4">{briefing.map((item) => <div key={item} className="rounded-xl border border-blue-500/10 bg-slate-950/60 px-3 py-2.5 text-sm">{item}</div>)}</div></Panel>

        <Panel title="Needs Me" className="xl:col-span-7" action={<span className="text-xs text-slate-500">Owner judgment only</span>}><div className="grid gap-3 p-4 md:grid-cols-2">{state.needsMe.map((item) => <div key={item.id} className={`rounded-xl border p-3 ${item.status === "RESOLVED" ? "border-emerald-400/20 bg-emerald-400/5 opacity-60" : "border-blue-500/15 bg-slate-950/70"}`}><div className="flex items-start justify-between gap-3"><div><div className="font-black text-white">{item.title}</div><div className="mt-1 text-xs text-slate-500">{item.area}</div></div><span className={`rounded-full border px-2 py-1 text-[9px] font-black ${tone(item.priority)}`}>{item.priority}</span></div><button type="button" onClick={() => resolveNeed(item.id)} disabled={item.status === "RESOLVED"} className="mt-3 rounded-lg border border-cyan-400/30 px-3 py-1.5 text-xs font-bold text-cyan-200 disabled:opacity-40">{item.status === "RESOLVED" ? "Resolved" : "Mark resolved"}</button></div>)}</div></Panel>

        <Panel title="Projects & Execution" className="xl:col-span-7"><div className="grid gap-3 p-4 md:grid-cols-2">{state.projects.map((project) => <button type="button" key={project.id} onClick={() => setSelectedId(project.id)} className={`rounded-xl border p-4 text-left ${selected?.id === project.id ? "border-cyan-400/60 bg-cyan-400/10" : "border-blue-500/15 bg-slate-950/70"}`}><div className="flex items-start justify-between gap-3"><div><div className="font-black text-white">{project.title}</div><div className="mt-1 text-xs text-slate-500">{project.module}</div></div><span className={`rounded-full border px-2 py-1 text-[9px] font-black ${tone(project.priority)}`}>{project.priority}</span></div><div className="mt-3 flex items-center justify-between text-[10px]"><span>{project.stage.replaceAll("_", " ")}</span><span>{project.progress}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500" style={{ width: `${project.progress}%` }} /></div></button>)}</div></Panel>

        <Panel title="Project Operations" className="xl:col-span-5">{selected ? <div className="space-y-4 p-4"><div><div className="text-lg font-black text-white">{selected.title}</div><p className="mt-1 text-sm leading-6 text-slate-400">{selected.acceptance}</p></div><label className="block text-xs font-black uppercase tracking-wider text-slate-500">Stage<select value={selected.stage} onChange={(event) => { patchProject(selected.id, { stage: event.target.value }); log(`${selected.title} moved to ${event.target.value}`); }} className="mt-2 w-full rounded-xl border border-blue-500/20 bg-slate-950 px-3 py-2 text-sm text-white">{STAGES.map((stage) => <option key={stage}>{stage}</option>)}</select></label><label className="block text-xs font-black uppercase tracking-wider text-slate-500">Assigned automation<select value={selected.bot} onChange={(event) => patchProject(selected.id, { bot: event.target.value })} className="mt-2 w-full rounded-xl border border-blue-500/20 bg-slate-950 px-3 py-2 text-sm text-white">{state.automations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button type="button" onClick={() => runAutomation(selected.bot)} disabled={Boolean(running)} className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-fuchsia-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-40">{running ? "Running controlled action..." : "Run assigned automation"}</button></div> : null}</Panel>

        <Panel title="Automation Control Center" className="xl:col-span-8"><div className="grid gap-3 p-4 md:grid-cols-2">{state.automations.map((item) => <div key={item.id} className="rounded-xl border border-blue-500/15 bg-slate-950/70 p-3"><div className="flex items-start justify-between gap-3"><div><div className="font-black text-white">{item.name}</div><p className="mt-1 text-xs leading-5 text-slate-400">{item.scope}</p></div><span className={`rounded-full border px-2 py-1 text-[9px] font-black ${tone(item.status)}`}>{item.status}</span></div><div className="mt-3 grid grid-cols-[1fr_auto] gap-2"><select value={item.mode} onChange={(event) => { const mode = event.target.value; setState((current) => ({ ...current, automations: current.automations.map((bot) => bot.id === item.id ? { ...bot, mode, status: mode === "OFF" ? "OFF" : "READY" } : bot) })); log(`${item.name} mode changed to ${mode}`); }} className="rounded-lg border border-blue-500/20 bg-slate-950 px-2 py-1.5 text-xs text-white">{MODES.map((mode) => <option key={mode}>{mode}</option>)}</select><button type="button" disabled={item.mode === "OFF" || Boolean(running)} onClick={() => runAutomation(item.id)} className="rounded-lg border border-cyan-400/30 px-3 py-1.5 text-xs font-bold text-cyan-200 disabled:opacity-30">Run</button></div><div className="mt-2 text-[10px] text-slate-600">Last run: {item.lastRun === "Never" ? "Never" : new Date(item.lastRun).toLocaleString()}</div></div>)}</div></Panel>

        <Panel title="Launch Readiness" className="xl:col-span-4" action={<span className="text-sm font-black text-white">{launch.percent}%</span>}><div className="space-y-2 p-4">{state.gates.map((gate) => <div key={gate.id} className="rounded-xl border border-blue-500/10 bg-slate-950/60 p-3"><div className="text-sm font-bold text-white">{gate.label}</div><select value={gate.status} onChange={(event) => setState((current) => ({ ...current, gates: current.gates.map((item) => item.id === gate.id ? { ...item, status: event.target.value } : item) }))} className="mt-2 w-full rounded-lg border border-blue-500/20 bg-slate-950 px-2 py-1.5 text-xs text-white"><option>PENDING</option><option>PASSED</option><option>BLOCKED</option><option>WAIVED</option></select></div>)}</div></Panel>

        <Panel title="Verified Data Connections" className="xl:col-span-5"><div className="space-y-2 p-4">{state.connections.map((item) => <div key={item.name} className="flex items-center justify-between rounded-xl border border-blue-500/10 bg-slate-950/60 px-3 py-2.5"><span className="text-sm font-bold text-white">{item.name}</span><span className={`rounded-full border px-2 py-1 text-[9px] font-black ${tone(item.status)}`}>{item.status.replaceAll("_", " ")}</span></div>)}</div></Panel>

        <Panel title="Activity & Approval History" className="xl:col-span-7"><div className="max-h-[460px] space-y-2 overflow-y-auto p-4">{state.activity.map((item) => <div key={item.id} className="rounded-xl border border-blue-500/10 bg-slate-950/60 p-3"><div className="text-xs text-slate-200">{item.text}</div><div className="mt-1 text-[10px] text-slate-600">{new Date(item.at).toLocaleString()}</div></div>)}</div></Panel>
      </div>
    </div>
  </div>;
}
