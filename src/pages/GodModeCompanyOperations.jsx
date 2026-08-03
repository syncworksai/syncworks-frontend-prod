import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "syncworks_god_mode_live_ops_v2";
const USER_TYPES = ["REAL_USER", "TEST_ACCOUNT", "BETA_TESTER", "INTERNAL", "DEMO", "BILLING_RESTRICTED", "SUSPENDED"];
const MODES = ["OFF", "ASSIST_ONLY", "APPROVAL_REQUIRED", "AUTONOMOUS"];

const seed = {
  users: [
    { id: 1, name: "Jacob Lord", email: "jacob@syncworksapp.com", type: "INTERNAL", note: "Owner / God Mode" },
    { id: 2, name: "Health Beta Tester", email: "healthtest@example.com", type: "BETA_TESTER", note: "Suggested by name/email" },
    { id: 3, name: "Test Business", email: "testbusiness@example.com", type: "TEST_ACCOUNT", note: "Suggested by name/email" },
  ],
  approvals: [
    { id: "auth-audit", title: "Audit login and session stability", problem: "Some users have seen network errors or unexpected sign-outs.", proposal: "Inspect frontend login, API availability, CORS, token refresh, and mobile inactivity behavior.", why: "Login reliability is a launch blocker.", tests: "Desktop, mobile, app switching, expired token, backend unavailable, and recovery behavior.", status: "PENDING" },
    { id: "billing-foundation", title: "Build billing restriction foundation", problem: "Paid access is not yet governed by a verified grace-period and restoration workflow.", proposal: "Add billing states, 30-day grace rules, notices, restricted access, and webhook-confirmed restoration.", why: "SyncWorks must collect payment without deleting customer data or blocking billing/support.", tests: "Stripe test mode, failed card, expiring card, compressed grace period, webhook replay, and restoration.", status: "PENDING" },
  ],
  support: [
    { id: 1, title: "User cannot finish business setup", status: "SUGGESTED", confidence: 92, user: "testbusiness@example.com" },
    { id: 2, title: "Confirm billing reminder wording", status: "OPEN", confidence: 100, user: "Internal" },
  ],
  billing: [
    { id: 1, user: "healthtest@example.com", state: "CURRENT", due: "$0.00", next: "No action" },
    { id: 2, user: "testbusiness@example.com", state: "MISSING_PAYMENT_METHOD", due: "$19.99", next: "Send internal + email notice" },
  ],
  projects: [
    { id: "user-classification", title: "God Mode user classification", stage: "TESTING", progress: 85, owner: "Master Operations Agent", next: "Finish rule tuning and edge cases" },
    { id: "approval-center", title: "Plain-language build approval center", stage: "TESTING", progress: 80, owner: "Master Operations Agent", next: "Finalize approval flow and permissions" },
    { id: "support-intelligence", title: "Support ticket intelligence", stage: "READY_TO_BUILD", progress: 35, owner: "Support Agent", next: "Connect live data sources" },
    { id: "billing-enforcement", title: "Billing enforcement foundation", stage: "AUDIT_NEEDED", progress: 20, owner: "Billing Watch Agent", next: "Review rules and compliance logic" },
    { id: "social-connectors", title: "Social account connection wizard", stage: "AUDIT_NEEDED", progress: 10, owner: "Growth Agent", next: "Validate providers and auth flows" },
    { id: "automation-health", title: "Automation health monitor", stage: "BUILDING", progress: 60, owner: "Automation Agent", next: "Add alerts and anomaly detection" },
  ],
  automations: [
    ["audit", "Application Audit Agent", "ASSIST_ONLY"],
    ["frontend", "Frontend Build Agent", "APPROVAL_REQUIRED"],
    ["backend", "Backend Build Agent", "APPROVAL_REQUIRED"],
    ["support", "Support Agent", "ASSIST_ONLY"],
    ["billing", "Billing Watch Agent", "ASSIST_ONLY"],
    ["social", "Social Content Agent", "APPROVAL_REQUIRED"],
    ["deployment", "Deployment Agent", "APPROVAL_REQUIRED"],
  ].map(([id, name, mode]) => ({ id, name, mode, lastRun: "Never", status: "READY" })),
  activity: [
    { id: 1, text: "God Mode live operations controls initialized", meta: "System", at: new Date().toISOString() },
    { id: 2, text: "New beta tester added", meta: "User Management", at: new Date(Date.now() - 18 * 60000).toISOString() },
    { id: 3, text: "Needs approval: Pricing engine v2", meta: "Approvals", at: new Date(Date.now() - 35 * 60000).toISOString() },
    { id: 4, text: "Billing attention: Failed payment", meta: "Billing", at: new Date(Date.now() - 51 * 60000).toISOString() },
  ],
};

const tabs = [["command", "Command"], ["users", "Users"], ["approvals", "Approvals"], ["support", "Support"], ["billing", "Billing"], ["social", "Social How-To"], ["automations", "Automations"]];

function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return parsed?.projects ? parsed : seed;
  } catch {
    return seed;
  }
}

function tone(value) {
  if (["CURRENT", "OPEN", "READY", "COMPLETE", "PRODUCTION_READY", "APPROVED"].includes(value)) return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  if (["HIGH", "CRITICAL", "BLOCKED", "DENIED", "SUSPENDED", "BILLING_RESTRICTED"].includes(value)) return "border-rose-400/30 bg-rose-400/10 text-rose-300";
  if (["PENDING", "TESTING", "APPROVAL_REQUIRED"].includes(value)) return "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-300";
  if (["READY_TO_BUILD", "BUILDING"].includes(value)) return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";
  return "border-amber-400/30 bg-amber-400/10 text-amber-300";
}

function Shell({ title, action, children, className = "" }) {
  return <section className={`overflow-hidden rounded-[22px] border border-cyan-400/15 bg-[#061027]/85 shadow-[0_24px_80px_rgba(0,0,0,.26)] ${className}`}>
    <div className="flex items-center justify-between gap-3 border-b border-cyan-400/10 px-5 py-4">
      <div className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_18px_rgba(34,211,238,.9)]" /><h2 className="text-sm font-black uppercase tracking-[.12em] text-white">{title}</h2></div>{action}
    </div>{children}
  </section>;
}

function MetricCard({ label, value, note, accent = "cyan", icon }) {
  const accents = {
    cyan: "border-cyan-400/25 from-cyan-500/12 to-blue-500/5",
    blue: "border-blue-400/25 from-blue-500/12 to-indigo-500/5",
    violet: "border-violet-400/25 from-violet-500/12 to-fuchsia-500/5",
    amber: "border-amber-400/25 from-amber-500/12 to-orange-500/5",
    pink: "border-pink-400/25 from-pink-500/12 to-fuchsia-500/5",
  };
  return <div className={`relative overflow-hidden rounded-[20px] border bg-gradient-to-br p-4 ${accents[accent]}`}>
    <div className="absolute inset-x-0 bottom-0 h-10 opacity-50 bg-[radial-gradient(ellipse_at_bottom,rgba(56,189,248,.35),transparent_70%)]" />
    <div className="relative flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-950/55 text-xl shadow-[0_0_28px_rgba(59,130,246,.2)]">{icon}</div><div><div className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">{label}</div><div className="mt-1 text-2xl font-black text-white">{value}</div><div className="mt-1 text-xs leading-4 text-slate-500">{note}</div></div></div>
  </div>;
}

function ProjectCard({ project }) {
  return <article className="rounded-2xl border border-cyan-400/15 bg-slate-950/55 p-4 transition hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-slate-950/75">
    <div className="flex items-start justify-between gap-4"><h3 className="font-black text-white">{project.title}</h3><span className="text-lg font-black text-white">{project.progress}%</span></div>
    <div className="mt-3"><span className={`rounded-full border px-2 py-1 text-[9px] font-black ${tone(project.stage)}`}>{project.stage.replaceAll("_", " ")}</span></div>
    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500" style={{ width: `${project.progress}%` }} /></div>
    <div className="mt-4 text-xs text-slate-400">⚙ {project.owner}</div><div className="mt-2 text-xs text-slate-500"><span className="font-bold text-slate-300">Next Step:</span> {project.next}</div>
  </article>;
}

export default function GodModeCompanyOperations() {
  const [state, setState] = useState(load);
  const [tab, setTab] = useState("command");
  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(state)), [state]);

  const metrics = useMemo(() => ({
    real: state.users.filter((u) => u.type === "REAL_USER").length,
    beta: state.users.filter((u) => u.type === "BETA_TESTER").length,
    test: state.users.filter((u) => ["TEST_ACCOUNT", "DEMO"].includes(u.type)).length,
    pending: state.approvals.filter((a) => a.status === "PENDING").length,
    billing: state.billing.filter((b) => b.state !== "CURRENT").length,
    readiness: Math.round(state.projects.reduce((sum, p) => sum + p.progress, 0) / state.projects.length),
  }), [state]);

  function log(text, meta = "God Mode") {
    setState((current) => ({ ...current, activity: [{ id: Date.now(), text, meta, at: new Date().toISOString() }, ...current.activity].slice(0, 40) }));
  }

  function classifyUser(id, type) {
    setState((current) => ({ ...current, users: current.users.map((u) => u.id === id ? { ...u, type } : u) }));
    log(`User ${id} classified as ${type}`, "User Management");
  }

  function decideApproval(id, status) {
    setState((current) => ({ ...current, approvals: current.approvals.map((a) => a.id === id ? { ...a, status } : a) }));
    log(`Build plan ${id} ${status.toLowerCase()}`, "Approvals");
  }

  function updateAutomation(id, mode) {
    setState((current) => ({ ...current, automations: current.automations.map((a) => a.id === id ? { ...a, mode } : a) }));
    log(`${id} automation changed to ${mode}`, "Automations");
  }

  return <div className="min-h-screen bg-[#020617] text-slate-200">
    <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_7%_50%,rgba(0,119,255,.19),transparent_30%),radial-gradient(circle_at_95%_85%,rgba(168,40,255,.21),transparent_34%)]" />
    <main className="relative mx-auto max-w-[1900px] p-3 pb-24 sm:p-5 lg:p-7">
      <section className="mb-5 overflow-hidden rounded-[28px] border border-blue-400/15 bg-[linear-gradient(135deg,rgba(8,23,49,.96),rgba(7,11,30,.92)_55%,rgba(35,12,65,.88))] px-5 py-6 shadow-[0_28px_100px_rgba(0,0,0,.36)] sm:px-7 lg:px-9">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div><div className="inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">SyncWorks Operations Board</div><h1 className="mt-4 text-3xl font-black tracking-[.08em] text-white sm:text-4xl">SYNCWORKS <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-400 bg-clip-text text-transparent">GOD MODE</span></h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Private operating hub for launch readiness, approvals, company projects, user classifications, billing, support, social setup, and automation health.</p></div>
          <div className="flex flex-wrap gap-2"><Link to="/platform?tab=developer_agent" className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm font-black text-cyan-200">⌘ Developer Agent</Link><Link to="/platform?tab=growth_os" className="rounded-xl bg-gradient-to-r from-blue-600 to-fuchsia-600 px-5 py-3 text-sm font-black text-white shadow-[0_0_28px_rgba(168,85,247,.25)]">↗ Social Media</Link></div>
        </div>
      </section>

      <nav className="mb-4 flex gap-2 overflow-x-auto rounded-2xl border border-blue-400/15 bg-[#061027]/80 p-2">{tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-black transition ${tab === id ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-100 shadow-[inset_0_-2px_0_#22d3ee]" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>{label}</button>)}</nav>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Verified Revenue" value="$0" note="Only collected, non-test revenue" icon="$" accent="cyan" />
        <MetricCard label="Real Users" value={metrics.real} note="God Mode classified" icon="◉" accent="violet" />
        <MetricCard label="Beta Testers" value={metrics.beta} note="Tracked separately" icon="⚗" accent="blue" />
        <MetricCard label="Test Accounts" value={metrics.test} note="Excluded from adoption" icon="◆" accent="violet" />
        <MetricCard label="Needs Approval" value={metrics.pending} note="Build plans waiting" icon="!" accent="amber" />
        <MetricCard label="Billing Attention" value={metrics.billing} note="Notice or payment action" icon="▣" accent="pink" />
      </div>

      {tab === "command" && <div className="grid gap-4 xl:grid-cols-12">
        <Shell title="Build Pipeline / Projects" className="xl:col-span-8" action={<span className="text-xs text-slate-500">Track key initiatives powering SyncWorks</span>}>
          <div className="grid gap-3 p-4 md:grid-cols-2 2xl:grid-cols-3">{state.projects.map((project) => <ProjectCard key={project.id} project={project} />)}</div>
          <div className="mx-4 mb-4 grid gap-3 rounded-2xl border border-cyan-400/10 bg-slate-950/50 p-4 sm:grid-cols-5"><div className="font-black text-white">Support Queue Summary</div><div><div className="text-xs text-slate-500">Open Tickets</div><div className="text-xl font-black text-cyan-300">12</div></div><div><div className="text-xs text-slate-500">In Progress</div><div className="text-xl font-black text-fuchsia-300">5</div></div><div><div className="text-xs text-slate-500">Waiting on User</div><div className="text-xl font-black text-amber-300">3</div></div><div><div className="text-xs text-slate-500">Resolved Today</div><div className="text-xl font-black text-emerald-300">7</div></div></div>
        </Shell>

        <div className="space-y-4 xl:col-span-4">
          <Shell title="Recent Activity" action={<button className="text-xs font-black text-cyan-300">View All →</button>}><div className="space-y-2 p-4">{state.activity.map((a, index) => <div key={a.id} className="flex gap-3 rounded-xl border border-blue-400/10 bg-slate-950/55 p-3"><div className={`mt-1 h-2 w-2 rounded-full ${index % 3 === 0 ? "bg-cyan-400" : index % 3 === 1 ? "bg-fuchsia-400" : "bg-amber-400"}`} /><div className="min-w-0 flex-1"><div className="text-xs font-semibold text-slate-200">{a.text}</div><div className="mt-1 text-[10px] text-slate-500">{a.meta}</div></div><div className="text-[10px] text-slate-600">{new Date(a.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div></div>)}</div></Shell>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2"><div className="rounded-[22px] border border-blue-400/15 bg-[#061027]/85 p-5"><div className="text-xs font-black uppercase tracking-[.14em] text-slate-400">Launch Readiness</div><div className="mt-4 flex items-center gap-4"><div className="flex h-20 w-20 items-center justify-center rounded-full border-[8px] border-blue-500/80 bg-slate-950 text-xl font-black text-white">{metrics.readiness}%</div><div><div className="font-black text-white">Overall Readiness</div><div className="mt-1 text-xs text-slate-500">On track for launch</div></div></div></div><div className="rounded-[22px] border border-fuchsia-400/15 bg-[#10092b]/80 p-5"><div className="text-xs font-black uppercase tracking-[.14em] text-slate-400">Automation Status</div><div className="mt-4 text-3xl font-black text-white">{state.automations.length}</div><div className="text-xs text-slate-500">Active automations</div><div className="mt-4 flex gap-4 text-xs"><span className="text-amber-300">2 Warnings</span><span className="text-emerald-300">0 Failures</span></div></div></div>
        </div>
      </div>}

      {tab === "users" && <Shell title="God Mode User Classification"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-950/70 text-xs uppercase text-slate-500"><tr><th className="p-4">User</th><th className="p-4">Email</th><th className="p-4">Classification</th><th className="p-4">Notes</th></tr></thead><tbody>{state.users.map((u) => <tr key={u.id} className="border-t border-blue-400/10"><td className="p-4 font-black text-white">{u.name}</td><td className="p-4 text-slate-400">{u.email}</td><td className="p-4"><select value={u.type} onChange={(e) => classifyUser(u.id, e.target.value)} className="rounded-xl border border-cyan-400/20 bg-slate-950 px-3 py-2">{USER_TYPES.map((type) => <option key={type}>{type}</option>)}</select></td><td className="p-4 text-slate-500">{u.note}</td></tr>)}</tbody></table></div></Shell>}

      {tab === "approvals" && <div className="grid gap-4 lg:grid-cols-2">{state.approvals.map((a) => <Shell key={a.id} title={a.title} action={<span className={`rounded-full border px-2 py-1 text-[9px] font-black ${tone(a.status)}`}>{a.status}</span>}><div className="space-y-4 p-5 text-sm"><div><b className="text-white">What is wrong:</b><p className="mt-1 text-slate-400">{a.problem}</p></div><div><b className="text-white">What the bot proposes:</b><p className="mt-1 text-slate-400">{a.proposal}</p></div><div><b className="text-white">Why it matters:</b><p className="mt-1 text-slate-400">{a.why}</p></div><div><b className="text-white">How it will be tested:</b><p className="mt-1 text-slate-400">{a.tests}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => decideApproval(a.id, "APPROVED")} className="rounded-xl bg-emerald-500 px-4 py-2 font-black text-white">Approve</button><button onClick={() => decideApproval(a.id, "DENIED")} className="rounded-xl bg-rose-500 px-4 py-2 font-black text-white">Deny</button><button onClick={() => decideApproval(a.id, "CHANGES_REQUESTED")} className="rounded-xl border border-amber-400/30 px-4 py-2 font-black text-amber-200">Request changes</button></div></div></Shell>)}</div>}

      {tab === "support" && <Shell title="Support Ticket Intelligence"><div className="grid gap-3 p-4 md:grid-cols-2">{state.support.map((item) => <div key={item.id} className="rounded-2xl border border-cyan-400/15 bg-slate-950/55 p-4"><div className="font-black text-white">{item.title}</div><div className="mt-2 text-xs text-slate-500">{item.user} · Confidence {item.confidence}%</div><span className={`mt-3 inline-flex rounded-full border px-2 py-1 text-[9px] font-black ${tone(item.status)}`}>{item.status}</span></div>)}</div></Shell>}

      {tab === "billing" && <Shell title="Billing Attention"><div className="grid gap-3 p-4 md:grid-cols-2">{state.billing.map((item) => <div key={item.id} className="rounded-2xl border border-pink-400/15 bg-slate-950/55 p-4"><div className="font-black text-white">{item.user}</div><div className="mt-2 text-sm text-slate-400">Due: {item.due}</div><div className="mt-1 text-xs text-slate-500">{item.next}</div><span className={`mt-3 inline-flex rounded-full border px-2 py-1 text-[9px] font-black ${tone(item.state)}`}>{item.state.replaceAll("_", " ")}</span></div>)}</div></Shell>}

      {tab === "social" && <Shell title="Social API How-To"><div className="grid gap-3 p-4 md:grid-cols-2">{["Meta / Facebook + Instagram", "LinkedIn", "TikTok", "YouTube", "X"].map((name) => <div key={name} className="rounded-2xl border border-violet-400/15 bg-slate-950/55 p-4"><div className="font-black text-white">{name}</div><p className="mt-2 text-sm leading-6 text-slate-400">Create the developer app, configure OAuth redirect URLs, request posting permissions, complete platform review, and store credentials in the approved secrets manager.</p></div>)}</div></Shell>}

      {tab === "automations" && <Shell title="Automation Authority"><div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">{state.automations.map((a) => <div key={a.id} className="rounded-2xl border border-cyan-400/15 bg-slate-950/55 p-4"><div className="font-black text-white">{a.name}</div><div className="mt-1 text-xs text-slate-500">Status: {a.status}</div><select value={a.mode} onChange={(e) => updateAutomation(a.id, e.target.value)} className="mt-4 w-full rounded-xl border border-cyan-400/20 bg-slate-950 px-3 py-2 text-sm">{MODES.map((mode) => <option key={mode}>{mode}</option>)}</select></div>)}</div></Shell>}
    </main>
  </div>;
}
