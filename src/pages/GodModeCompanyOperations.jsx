import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "syncworks_god_mode_live_ops_v1";
const USER_TYPES = ["REAL_USER", "TEST_ACCOUNT", "BETA_TESTER", "INTERNAL", "DEMO", "BILLING_RESTRICTED", "SUSPENDED"];
const MODES = ["OFF", "ASSIST_ONLY", "APPROVAL_REQUIRED", "AUTONOMOUS"];
const STAGES = ["AUDIT_NEEDED", "READY_TO_BUILD", "BUILDING", "PREVIEW_READY", "TESTING", "PRODUCTION_READY", "COMPLETE", "BLOCKED"];

const seed = {
  users: [
    { id: 1, name: "Jacob Lord", email: "jacob@syncworksapp.com", type: "INTERNAL", note: "Owner / God Mode" },
    { id: 2, name: "Health Beta Tester", email: "healthtest@example.com", type: "BETA_TESTER", note: "Suggested by name/email" },
    { id: 3, name: "Test Business", email: "testbusiness@example.com", type: "TEST_ACCOUNT", note: "Suggested by name/email" },
  ],
  approvals: [
    { id: "auth-audit", title: "Audit login and session stability", problem: "Some users have seen network errors or unexpected sign-outs.", proposal: "Inspect frontend login, API availability, CORS, token refresh, and mobile inactivity behavior. No production changes until findings are reviewed.", why: "Login reliability is a launch blocker.", unchanged: "No pricing, billing, user data, or unrelated modules will change.", tests: "Login on desktop/mobile, app switching, expired token, backend unavailable, and recovery behavior.", risk: "MEDIUM", status: "PENDING" },
    { id: "billing-foundation", title: "Build billing restriction foundation", problem: "Paid access is not yet governed by a verified grace-period and restoration workflow.", proposal: "Add billing states, 30-day grace rules, notices, restricted access, and webhook-confirmed restoration.", why: "SyncWorks must collect payment without deleting customer data or locking users away from billing/support.", unchanged: "No real account will be restricted until test-mode verification passes.", tests: "Stripe test mode, failed card, expiring card, grace-period compression, webhook replay, successful restoration.", risk: "HIGH", status: "PENDING" },
  ],
  support: [
    { id: 1, source: "INTERNAL_MESSAGE", title: "User cannot finish business setup", confidence: 92, status: "SUGGESTED", user: "testbusiness@example.com" },
    { id: 2, source: "MANUAL", title: "Confirm billing reminder wording", confidence: 100, status: "OPEN", user: "Internal" },
  ],
  billing: [
    { id: 1, user: "healthtest@example.com", state: "CURRENT", due: "$0.00", next: "No action" },
    { id: 2, user: "testbusiness@example.com", state: "MISSING_PAYMENT_METHOD", due: "$19.99", next: "Send internal + email notice" },
  ],
  projects: [
    { id: "user-classification", title: "God Mode user classification", stage: "TESTING", progress: 85, owner: "Master Operations Agent" },
    { id: "approval-center", title: "Plain-language build approval center", stage: "TESTING", progress: 80, owner: "Master Operations Agent" },
    { id: "support-intelligence", title: "Support ticket intelligence", stage: "READY_TO_BUILD", progress: 35, owner: "Support Agent" },
    { id: "billing-enforcement", title: "Billing enforcement foundation", stage: "AUDIT_NEEDED", progress: 20, owner: "Billing Watch Agent" },
    { id: "social-connectors", title: "Social account connection wizard", stage: "AUDIT_NEEDED", progress: 10, owner: "Social Content Agent" },
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
  activity: [{ id: 1, text: "God Mode live operations controls initialized", at: new Date().toISOString() }],
};

const socialGuides = [
  ["Meta / Facebook + Instagram", "Create a Meta developer account, create a SyncWorks app, configure business login, add privacy/terms/data-deletion URLs, add OAuth redirect URLs, request required Page and Instagram publishing permissions, then complete App Review."],
  ["LinkedIn", "Create a LinkedIn developer app, associate the SyncWorks company page, add OAuth redirect URLs, request the approved Community Management products and posting permissions, then complete review if required."],
  ["TikTok", "Create a TikTok for Developers account and app, add the Content Posting API product, verify domains and redirect URLs, request video publishing access, then complete TikTok's app review."],
  ["YouTube", "Create a Google Cloud project, enable YouTube Data API v3, configure OAuth consent, create web OAuth credentials, add redirect URLs, then complete Google's verification or API audit when required."],
  ["X", "Create an X developer project and app, enable OAuth 2.0 user authorization, add callback URLs, request read/write posting access, and select the current API plan that supports posting."],
];

function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return parsed?.projects ? parsed : seed;
  } catch {
    return seed;
  }
}

function Panel({ title, action, children, className = "" }) {
  return <section className={`overflow-hidden rounded-2xl border border-blue-500/20 bg-[#050b1c]/90 ${className}`}><div className="flex items-center justify-between gap-3 border-b border-blue-500/15 px-4 py-3"><h2 className="text-sm font-black uppercase tracking-wide text-white">{title}</h2>{action}</div>{children}</section>;
}

function badge(value) {
  if (["APPROVED", "CURRENT", "READY", "COMPLETE", "PRODUCTION_READY", "OPEN"].includes(value)) return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  if (["DENIED", "HIGH", "CRITICAL", "BLOCKED", "SUSPENDED", "BILLING_RESTRICTED"].includes(value)) return "border-rose-400/30 bg-rose-400/10 text-rose-300";
  if (["PENDING", "APPROVAL_REQUIRED", "READY_TO_BUILD", "BUILDING", "TESTING"].includes(value)) return "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-300";
  return "border-amber-400/30 bg-amber-400/10 text-amber-300";
}

export default function GodModeCompanyOperations() {
  const [state, setState] = useState(load);
  const [tab, setTab] = useState("command");
  const [selectedProject, setSelectedProject] = useState(state.projects[0]?.id);
  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(state)), [state]);

  const metrics = useMemo(() => ({
    revenue: 0,
    real: state.users.filter((u) => u.type === "REAL_USER").length,
    beta: state.users.filter((u) => u.type === "BETA_TESTER").length,
    test: state.users.filter((u) => ["TEST_ACCOUNT", "DEMO"].includes(u.type)).length,
    pending: state.approvals.filter((a) => a.status === "PENDING").length,
    billing: state.billing.filter((b) => b.state !== "CURRENT").length,
  }), [state]);

  function log(text) {
    setState((s) => ({ ...s, activity: [{ id: Date.now(), text, at: new Date().toISOString() }, ...s.activity].slice(0, 50) }));
  }

  function classifyUser(id, type) {
    setState((s) => ({ ...s, users: s.users.map((u) => u.id === id ? { ...u, type } : u) }));
    log(`User ${id} classified as ${type}`);
  }

  function decideApproval(id, status) {
    setState((s) => ({ ...s, approvals: s.approvals.map((a) => a.id === id ? { ...a, status } : a) }));
    log(`Build plan ${id} ${status.toLowerCase()}`);
  }

  function convertSupport(id) {
    setState((s) => ({ ...s, support: s.support.map((item) => item.id === id ? { ...item, status: "OPEN" } : item) }));
    log(`Support suggestion ${id} converted into a support ticket`);
  }

  function updateAutomation(id, mode) {
    setState((s) => ({ ...s, automations: s.automations.map((a) => a.id === id ? { ...a, mode } : a) }));
    log(`${id} automation changed to ${mode}`);
  }

  return <div className="min-h-screen bg-[#020617] text-slate-200">
    <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_8%_65%,rgba(0,102,255,.18),transparent_28%),radial-gradient(circle_at_92%_80%,rgba(168,40,255,.16),transparent_32%)]" />
    <div className="relative mx-auto max-w-[1900px] p-3 pb-24 sm:p-5 lg:p-7">
      <header className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div><h1 className="text-2xl font-black tracking-[0.08em] text-white sm:text-3xl">SYNCWORKS <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-400 bg-clip-text text-transparent">GOD MODE</span></h1><p className="mt-1 text-sm text-slate-400">Private operating hub for users, approvals, support, billing, social setup, automations, and launch readiness.</p></div>
        <div className="flex flex-wrap gap-2"><Link to="/platform?tab=developer_agent" className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-200">Developer Agent</Link><Link to="/platform?tab=growth_os" className="rounded-xl bg-gradient-to-r from-blue-600 to-fuchsia-600 px-4 py-2 text-sm font-bold text-white">Social Media</Link></div>
      </header>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">{[["command","Command"],["users","Users"],["approvals","Approvals"],["support","Support"],["billing","Billing"],["social","Social How-To"],["automations","Automations"]].map(([id,label]) => <button key={id} onClick={() => setTab(id)} className={`whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-bold ${tab === id ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-200" : "border-slate-700 bg-slate-950 text-slate-400"}`}>{label}</button>)}</div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{[["Verified Revenue","$0","Only collected, non-test revenue"],["Real Users",metrics.real,"God Mode classified"],["Beta Testers",metrics.beta,"Tracked separately"],["Test Accounts",metrics.test,"Excluded from adoption"],["Needs Approval",metrics.pending,"Build plans waiting"],["Billing Attention",metrics.billing,"Notice or payment action"]].map(([label,value,note]) => <div key={label} className="rounded-2xl border border-blue-500/20 bg-[#050b1c]/90 p-4"><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</div><div className="mt-2 text-2xl font-black text-white">{value}</div><div className="mt-1 text-xs text-slate-500">{note}</div></div>)}</div>

      {tab === "command" && <div className="grid gap-4 xl:grid-cols-12">
        <Panel title="Company Projects" className="xl:col-span-8"><div className="grid gap-3 p-4 md:grid-cols-2">{state.projects.map((p) => <button key={p.id} onClick={() => setSelectedProject(p.id)} className={`rounded-xl border p-4 text-left ${selectedProject === p.id ? "border-cyan-400/60 bg-cyan-400/10" : "border-blue-500/15 bg-slate-950/70"}`}><div className="font-black text-white">{p.title}</div><div className="mt-2 flex justify-between text-xs"><span className={`rounded-full border px-2 py-1 ${badge(p.stage)}`}>{p.stage.replaceAll("_"," ")}</span><span>{p.progress}%</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500" style={{width:`${p.progress}%`}} /></div><div className="mt-2 text-[10px] text-slate-500">{p.owner}</div></button>)}</div></Panel>
        <Panel title="Recent Activity" className="xl:col-span-4"><div className="max-h-[520px] space-y-2 overflow-y-auto p-4">{state.activity.map((a) => <div key={a.id} className="rounded-xl border border-blue-500/10 bg-slate-950/60 p-3"><div className="text-xs text-slate-200">{a.text}</div><div className="mt-1 text-[10px] text-slate-600">{new Date(a.at).toLocaleString()}</div></div>)}</div></Panel>
      </div>}

      {tab === "users" && <Panel title="God Mode User Classification" action={<span className="text-xs text-slate-500">Suggested test accounts still require your confirmation</span>}><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-950/80 text-xs uppercase text-slate-500"><tr><th className="p-3">User</th><th className="p-3">Email</th><th className="p-3">Classification</th><th className="p-3">Notes</th></tr></thead><tbody>{state.users.map((u) => <tr key={u.id} className="border-t border-blue-500/10"><td className="p-3 font-bold text-white">{u.name}</td><td className="p-3">{u.email}</td><td className="p-3"><select value={u.type} onChange={(e) => classifyUser(u.id,e.target.value)} className="rounded-lg border border-blue-500/20 bg-slate-950 px-2 py-1.5">{USER_TYPES.map((t) => <option key={t}>{t}</option>)}</select></td><td className="p-3 text-slate-500">{u.note}</td></tr>)}</tbody></table></div></Panel>}

      {tab === "approvals" && <div className="grid gap-4 lg:grid-cols-2">{state.approvals.map((a) => <Panel key={a.id} title={a.title} action={<span className={`rounded-full border px-2 py-1 text-[9px] font-black ${badge(a.status)}`}>{a.status}</span>}><div className="space-y-3 p-4 text-sm"><div><b className="text-white">What is wrong:</b><p className="text-slate-400">{a.problem}</p></div><div><b className="text-white">What the bot proposes:</b><p className="text-slate-400">{a.proposal}</p></div><div><b className="text-white">Why it matters:</b><p className="text-slate-400">{a.why}</p></div><div><b className="text-white">What will not change:</b><p className="text-slate-400">{a.unchanged}</p></div><div><b className="text-white">How it will be tested:</b><p className="text-slate-400">{a.tests}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => decideApproval(a.id,"APPROVED")} className="rounded-xl bg-emerald-600 px-3 py-2 font-bold text-white">Approve</button><button onClick={() => decideApproval(a.id,"DENIED")} className="rounded-xl bg-rose-600 px-3 py-2 font-bold text-white">Deny</button><button onClick={() => decideApproval(a.id,"CHANGES_REQUESTED")} className="rounded-xl border border-amber-400/30 px-3 py-2 font-bold text-amber-200">Request changes</button></div></div></Panel>)}</div>}

      {tab === "support" && <Panel title="Support Ticket Intelligence" action={<span className="text-xs text-slate-500">Internal messages can be suggested, then approved</span>}><div className="grid gap-3 p-4 md:grid-cols-2">{state.support.map((s) => <div key={s.id} className="rounded-xl border border-blue-500/15 bg-slate-950/70 p-4"><div className="flex justify-between gap-3"><div><div className="font-black text-white">{s.title}</div><div className="mt-1 text-xs text-slate-500">{s.source} · {s.user}</div></div><span className={`rounded-full border px-2 py-1 text-[9px] ${badge(s.status)}`}>{s.status}</span></div><div className="mt-3 text-xs text-slate-400">Bot confidence: {s.confidence}%</div>{s.status === "SUGGESTED" && <button onClick={() => convertSupport(s.id)} className="mt-3 rounded-lg border border-cyan-400/30 px-3 py-2 text-xs font-bold text-cyan-200">Create support ticket</button>}</div>)}</div></Panel>}

      {tab === "billing" && <div className="grid gap-4 xl:grid-cols-12"><Panel title="Billing Attention" className="xl:col-span-7"><div className="space-y-3 p-4">{state.billing.map((b) => <div key={b.id} className="rounded-xl border border-blue-500/15 bg-slate-950/70 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-black text-white">{b.user}</div><div className="mt-1 text-xs text-slate-500">Amount due: {b.due}</div></div><span className={`rounded-full border px-2 py-1 text-[9px] ${badge(b.state)}`}>{b.state}</span></div><div className="mt-3 text-sm text-slate-400">Next action: {b.next}</div></div>)}</div></Panel><Panel title="Billing Policy" className="xl:col-span-5"><div className="space-y-3 p-4 text-sm text-slate-400"><p><b className="text-white">Day 0:</b> failed or missing billing notice by SyncWorks and email.</p><p><b className="text-white">Days 3, 7, 14, 21, 27:</b> escalating reminders.</p><p><b className="text-white">Day 30:</b> paid features restricted; profile, support, and billing remain available.</p><p><b className="text-white">Restoration:</b> only after payment provider webhook confirms success.</p><p><b className="text-white">Testing:</b> Stripe test mode, compressed staging grace periods, webhook replay, and test accounts.</p></div></Panel></div>}

      {tab === "social" && <div className="grid gap-4 lg:grid-cols-2">{socialGuides.map(([name,steps]) => <Panel key={name} title={name}><div className="p-4"><p className="text-sm leading-6 text-slate-400">{steps}</p><div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-100">Do not paste client secrets into chat. Store credentials in Render or the approved secrets manager. Businesses will connect their own accounts through OAuth.</div></div></Panel>)}</div>}

      {tab === "automations" && <Panel title="Automation Authority"><div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">{state.automations.map((a) => <div key={a.id} className="rounded-xl border border-blue-500/15 bg-slate-950/70 p-4"><div className="font-black text-white">{a.name}</div><select value={a.mode} onChange={(e) => updateAutomation(a.id,e.target.value)} className="mt-3 w-full rounded-lg border border-blue-500/20 bg-slate-950 px-2 py-2 text-sm">{MODES.map((m) => <option key={m}>{m}</option>)}</select><div className="mt-2 text-[10px] text-slate-500">Builds, merges, deployments, billing actions, and customer-facing mass actions should remain Approval Required.</div></div>)}</div></Panel>}
    </div>
  </div>;
}
