import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "syncworks_god_mode_ops_v1";

const BOT_SEED = [
  { id: "master", name: "Master Project Bot", scope: "Coordinates projects, dependencies, approvals, and handoffs.", permission: "RECOMMEND", status: "READY" },
  { id: "audit", name: "Application Audit Bot", scope: "Creates findings for auth, dashboards, mobile UX, APIs, and production readiness.", permission: "OBSERVE", status: "READY" },
  { id: "qa", name: "QA Bot", scope: "Runs acceptance checks and records passed, warning, failed, or blocked results.", permission: "OBSERVE", status: "READY" },
  { id: "frontend", name: "Frontend Build Bot", scope: "Prepares scoped React, Vite, and Tailwind builds on review branches.", permission: "BUILD", status: "LOCKED" },
  { id: "backend", name: "Backend Build Bot", scope: "Prepares scoped Django REST changes and migrations on review branches.", permission: "BUILD", status: "LOCKED" },
  { id: "social", name: "Social Media Bot", scope: "Creates post ideas, drafts, content calendars, and approval-ready publishing tasks.", permission: "RECOMMEND", status: "READY" },
  { id: "release", name: "Production Readiness Bot", scope: "Checks launch gates, deployment state, rollback readiness, and open blockers.", permission: "OBSERVE", status: "READY" },
];

const PROJECT_SEED = [
  { id: "auth-network", title: "Login network error and session stability", module: "Authentication", stage: "AUDIT_NEEDED", priority: "CRITICAL", bot: "audit", progress: 10, finding: "Confirm whether the error is frontend timeout, API availability, CORS, or token refresh behavior." },
  { id: "social-small", title: "Small social media automations", module: "Social Media", stage: "READY_TO_BUILD", priority: "HIGH", bot: "social", progress: 35, finding: "Draft, approve, schedule, publish, and measure posts without unrestricted auto-publishing." },
  { id: "project-control", title: "Interactive God Mode project control", module: "God Mode", stage: "BUILDING", priority: "HIGH", bot: "master", progress: 65, finding: "Replace decorative percentages with persistent project status, findings, bot ownership, and activity." },
  { id: "bot-audits", title: "Automated module audit coverage", module: "Platform", stage: "AUDIT_NEEDED", priority: "HIGH", bot: "audit", progress: 20, finding: "Create repeatable audit runs for each major SyncWorks module." },
  { id: "revenue-source", title: "Connect live platform revenue reporting", module: "Finance", stage: "NEEDS_IMPROVEMENT", priority: "MEDIUM", bot: "backend", progress: 0, finding: "Dashboard must show $0 until billing and transaction sources are connected and verified." },
];

const STAGES = ["AUDIT_NEEDED", "READY_TO_BUILD", "BUILDING", "PREVIEW_READY", "TESTING", "PRODUCTION_READY", "COMPLETE", "BLOCKED"];

function initialState() {
  return { bots: BOT_SEED, projects: PROJECT_SEED, activity: [{ id: 1, text: "God Mode bot control initialized", at: new Date().toISOString() }] };
}

function loadState() {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    return value && Array.isArray(value.projects) ? value : initialState();
  } catch {
    return initialState();
  }
}

function Panel({ title, action, children, className = "" }) {
  return <section className={`overflow-hidden rounded-2xl border border-blue-500/20 bg-[#050b1c]/90 ${className}`}><div className="flex items-center justify-between border-b border-blue-500/15 px-4 py-3"><h2 className="text-sm font-black uppercase tracking-wide text-white">{title}</h2>{action}</div>{children}</section>;
}

function badge(value) {
  if (["READY", "COMPLETE", "PRODUCTION_READY", "PASSED"].includes(value)) return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  if (["CRITICAL", "BLOCKED", "FAILED"].includes(value)) return "border-rose-400/30 bg-rose-400/10 text-rose-300";
  if (["HIGH", "BUILDING", "READY_TO_BUILD"].includes(value)) return "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-300";
  return "border-amber-400/30 bg-amber-400/10 text-amber-300";
}

export default function GodModeOperationsDashboard() {
  const [state, setState] = useState(loadState);
  const [selectedId, setSelectedId] = useState(PROJECT_SEED[0].id);
  const [runningBot, setRunningBot] = useState("");

  useEffect(() => { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);

  const selected = state.projects.find((project) => project.id === selectedId) || state.projects[0];
  const totals = useMemo(() => ({
    projects: state.projects.length,
    ready: state.projects.filter((project) => ["PRODUCTION_READY", "COMPLETE"].includes(project.stage)).length,
    blocked: state.projects.filter((project) => project.stage === "BLOCKED").length,
    botsReady: state.bots.filter((bot) => bot.status === "READY").length,
  }), [state]);

  function log(text) {
    setState((current) => ({ ...current, activity: [{ id: Date.now(), text, at: new Date().toISOString() }, ...current.activity].slice(0, 20) }));
  }

  function patchProject(projectId, patch) {
    setState((current) => ({ ...current, projects: current.projects.map((project) => project.id === projectId ? { ...project, ...patch } : project) }));
  }

  function runBot(botId, projectId) {
    const bot = state.bots.find((item) => item.id === botId);
    const project = state.projects.find((item) => item.id === projectId);
    if (!bot || !project || bot.status === "LOCKED") return;
    setRunningBot(botId);
    log(`${bot.name} started for ${project.title}`);
    window.setTimeout(() => {
      const next = botId === "audit" ? { stage: "READY_TO_BUILD", progress: Math.max(project.progress, 30), finding: `${project.finding} Audit run recorded; review findings before approving a build.` }
        : botId === "qa" ? { stage: "TESTING", progress: Math.max(project.progress, 80), finding: `${project.finding} QA checklist generated and awaiting live verification.` }
        : botId === "release" ? { stage: project.progress >= 90 ? "PRODUCTION_READY" : "NEEDS_IMPROVEMENT", finding: `${project.finding} Production gate checked; unresolved requirements remain until live tests pass.` }
        : { progress: Math.min(95, project.progress + 10), finding: `${project.finding} Bot recommendation prepared for owner review.` };
      patchProject(projectId, next);
      setRunningBot("");
      log(`${bot.name} completed a controlled run for ${project.title}`);
    }, 700);
  }

  function resetDemo() {
    const reset = initialState();
    setState(reset);
    setSelectedId(reset.projects[0].id);
  }

  return <div className="min-h-screen bg-[#020617] text-slate-200">
    <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_8%_70%,rgba(0,102,255,.18),transparent_27%),radial-gradient(circle_at_92%_80%,rgba(168,40,255,.16),transparent_30%)]" />
    <div className="relative mx-auto max-w-[1800px] p-3 pb-24 sm:p-5 lg:p-7">
      <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><h1 className="text-2xl font-black tracking-[0.08em] text-white sm:text-3xl">SYNCWORKS <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-400 bg-clip-text text-transparent">GOD MODE</span></h1><p className="mt-1 text-sm text-slate-400">Owner-only project execution, bot controls, approvals, and production readiness.</p></div>
        <div className="flex flex-wrap gap-2"><Link to="/platform?tab=developer_agent" className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-200">Developer Agent</Link><Link to="/platform?tab=growth_os" className="rounded-xl bg-gradient-to-r from-blue-600 to-fuchsia-600 px-4 py-2 text-sm font-bold text-white">Social Media</Link><button type="button" onClick={resetDemo} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm">Reset board</button></div>
      </header>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[['Verified Revenue', '$0', 'No live billing source connected yet'], ['Projects', String(totals.projects), 'Persistent working records'], ['Bots Ready', String(totals.botsReady), 'Observe/recommend permissions'], ['Production Ready', String(totals.ready), 'Based on actual project stage'], ['Blocked', String(totals.blocked), 'Owner attention required']].map(([label, value, note]) => <div key={label} className="rounded-2xl border border-blue-500/20 bg-[#050b1c]/90 p-4"><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</div><div className="mt-2 text-2xl font-black text-white">{value}</div><div className="mt-1 text-xs text-slate-500">{note}</div></div>)}
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel title="Interactive Projects Board" className="xl:col-span-7" action={<span className="text-xs text-slate-500">Click a project to operate it</span>}>
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {state.projects.map((project) => <button type="button" key={project.id} onClick={() => setSelectedId(project.id)} className={`rounded-xl border p-4 text-left transition ${selectedId === project.id ? 'border-cyan-400/60 bg-cyan-400/10' : 'border-blue-500/15 bg-slate-950/70 hover:border-blue-400/40'}`}>
              <div className="flex items-start justify-between gap-3"><div><div className="text-sm font-black text-white">{project.title}</div><div className="mt-1 text-xs text-slate-500">{project.module}</div></div><span className={`rounded-full border px-2 py-1 text-[9px] font-black ${badge(project.priority)}`}>{project.priority}</span></div>
              <div className="mt-4 flex items-center justify-between text-[10px]"><span className={`rounded-full border px-2 py-1 font-black ${badge(project.stage)}`}>{project.stage.replaceAll('_', ' ')}</span><span>{project.progress}%</span></div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500" style={{ width: `${project.progress}%` }} /></div>
            </button>)}
          </div>
        </Panel>

        <Panel title="Project Operations" className="xl:col-span-5">
          {selected ? <div className="space-y-4 p-4">
            <div><div className="text-lg font-black text-white">{selected.title}</div><div className="mt-1 text-sm text-slate-400">{selected.finding}</div></div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Stage<select value={selected.stage} onChange={(event) => { patchProject(selected.id, { stage: event.target.value }); log(`${selected.title} moved to ${event.target.value}`); }} className="mt-2 w-full rounded-xl border border-blue-500/20 bg-slate-950 px-3 py-2 text-sm text-white">{STAGES.map((stage) => <option key={stage}>{stage}</option>)}</select></label>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Assigned bot<select value={selected.bot} onChange={(event) => patchProject(selected.id, { bot: event.target.value })} className="mt-2 w-full rounded-xl border border-blue-500/20 bg-slate-950 px-3 py-2 text-sm text-white">{state.bots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}</select></label>
            <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => runBot(selected.bot, selected.id)} disabled={Boolean(runningBot) || state.bots.find((bot) => bot.id === selected.bot)?.status === 'LOCKED'} className="rounded-xl bg-gradient-to-r from-blue-600 to-fuchsia-600 px-3 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{runningBot ? 'Running…' : 'Run assigned bot'}</button><button type="button" onClick={() => { patchProject(selected.id, { stage: 'READY_TO_BUILD' }); log(`${selected.title} approved for build planning`); }} className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2.5 text-sm font-black text-cyan-200">Approve plan</button></div>
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-5 text-amber-100">Build and release bots remain locked until a project has acceptance criteria, a scoped branch plan, and explicit owner approval. This prevents automatic production changes.</div>
          </div> : null}
        </Panel>

        <Panel title="Bot Control Center" className="xl:col-span-8">
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {state.bots.map((bot) => <div key={bot.id} className="rounded-xl border border-blue-500/15 bg-slate-950/70 p-3"><div className="flex items-center justify-between gap-3"><div className="font-black text-white">{bot.name}</div><span className={`rounded-full border px-2 py-1 text-[9px] font-black ${badge(bot.status)}`}>{bot.status}</span></div><p className="mt-2 text-xs leading-5 text-slate-400">{bot.scope}</p><div className="mt-3 flex items-center justify-between text-[10px] text-slate-500"><span>Permission: {bot.permission}</span><button type="button" onClick={() => runBot(bot.id, selected.id)} disabled={bot.status === 'LOCKED' || Boolean(runningBot)} className="rounded-lg border border-blue-500/20 px-2 py-1 text-cyan-300 disabled:opacity-30">Run</button></div></div>)}
          </div>
        </Panel>

        <Panel title="Activity & Audit Trail" className="xl:col-span-4">
          <div className="max-h-[430px] space-y-2 overflow-y-auto p-4">{state.activity.map((item) => <div key={item.id} className="rounded-xl border border-blue-500/10 bg-slate-950/60 p-3"><div className="text-xs text-slate-200">{item.text}</div><div className="mt-1 text-[10px] text-slate-600">{new Date(item.at).toLocaleString()}</div></div>)}</div>
        </Panel>
      </div>
    </div>
  </div>;
}
