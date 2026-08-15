import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "syncworks_god_mode_launch_control_v2";

const BOT_SEED = [
  { id: "master", name: "Master Project Bot", type: "INTERNAL", category: "Operations", scope: "Coordinates projects, dependencies, approvals, and handoffs.", permission: "RECOMMEND", status: "READY", runtime: "ON_DEMAND", sellable: false, package: "Internal" },
  { id: "audit", name: "Application Audit Bot", type: "INTERNAL", category: "Quality", scope: "Creates repeatable findings for auth, dashboards, mobile UX, APIs, and production readiness.", permission: "OBSERVE", status: "READY", runtime: "SCHEDULED", sellable: false, package: "Internal" },
  { id: "qa", name: "QA Bot", type: "INTERNAL", category: "Quality", scope: "Runs acceptance checklists and records passed, warning, failed, or blocked results.", permission: "OBSERVE", status: "READY", runtime: "SCHEDULED", sellable: false, package: "Internal" },
  { id: "release", name: "Production Readiness Bot", type: "INTERNAL", category: "Release", scope: "Checks launch gates, deployment state, rollback readiness, and unresolved blockers.", permission: "OBSERVE", status: "READY", runtime: "SCHEDULED", sellable: false, package: "Internal" },
  { id: "social-queue", name: "Social Queue Bot", type: "BUSINESS", category: "Growth", scope: "Publishes owner-approved posts on schedule and records publish results.", permission: "EXECUTE_APPROVED", status: "PLANNED", runtime: "SERVER_REQUIRED", sellable: true, package: "Social Automation" },
  { id: "content-calendar", name: "Content Calendar Bot", type: "BUSINESS", category: "Growth", scope: "Builds and maintains a reusable posting calendar from approved business content and templates.", permission: "RECOMMEND", status: "READY", runtime: "SCHEDULED", sellable: true, package: "Social Automation" },
  { id: "engagement", name: "Engagement Tracker Bot", type: "BUSINESS", category: "Growth", scope: "Collects available post metrics and surfaces which content drives attention, leads, and conversions.", permission: "OBSERVE", status: "PLANNED", runtime: "SERVER_REQUIRED", sellable: true, package: "Social Automation" },
  { id: "lead-followup", name: "Lead Follow-Up Bot", type: "BUSINESS", category: "CRM", scope: "Detects unanswered legitimate leads and creates approved follow-up tasks and reminders.", permission: "RECOMMEND", status: "PLANNED", runtime: "SERVER_REQUIRED", sellable: true, package: "Growth CRM" },
  { id: "activation", name: "Customer Activation Bot", type: "BUSINESS", category: "CRM", scope: "Finds new customers who have not completed the next useful action and queues re-engagement steps.", permission: "RECOMMEND", status: "PLANNED", runtime: "SERVER_REQUIRED", sellable: true, package: "Growth CRM" },
  { id: "retention", name: "Retention Bot", type: "BUSINESS", category: "CRM", scope: "Identifies inactive customers and creates permission-safe re-engagement opportunities.", permission: "RECOMMEND", status: "PLANNED", runtime: "SERVER_REQUIRED", sellable: true, package: "Growth CRM" },
  { id: "review", name: "Review Request Bot", type: "BUSINESS", category: "Reputation", scope: "Queues review requests after eligible completed jobs and tracks whether the customer responded.", permission: "EXECUTE_APPROVED", status: "PLANNED", runtime: "SERVER_REQUIRED", sellable: true, package: "Reputation" },
  { id: "seo", name: "Local SEO Audit Bot", type: "BUSINESS", category: "Growth", scope: "Audits business profile content, service pages, metadata, and obvious local-search opportunities.", permission: "OBSERVE", status: "READY", runtime: "SCHEDULED", sellable: true, package: "Growth Intelligence" },
  { id: "frontend", name: "Frontend Build Bot", type: "INTERNAL", category: "Development", scope: "Prepares scoped React, Vite, and Tailwind builds on review branches.", permission: "BUILD", status: "LOCKED", runtime: "ON_DEMAND", sellable: false, package: "Internal" },
  { id: "backend", name: "Backend Build Bot", type: "INTERNAL", category: "Development", scope: "Prepares scoped Django REST changes and migrations on review branches.", permission: "BUILD", status: "LOCKED", runtime: "ON_DEMAND", sellable: false, package: "Internal" },
];

const MODULE_SEED = [
  { id: "god-mode", title: "God Mode Launch Control", module: "God Mode", priority: "P0", bot: "master", build: 72, beta: 45, live: 30, production: 45, blocker: "Launch board must become the single source of truth and move beyond browser-only state.", acceptance: "All sellable modules have build, beta, live, production, blockers, acceptance criteria, and bot ownership.", stage: "BUILDING" },
  { id: "finance", title: "Personal Finance", module: "Personal", priority: "P0", bot: "master", build: 55, beta: 15, live: 5, production: 20, blocker: "Transactions, budgets, debt planning, recurring bills, rollover logic, and SYNC Assist intelligence are incomplete.", acceptance: "User can understand cash flow, budget, debt, upcoming bills, and ask SYNC Assist what they can safely spend.", stage: "READY_TO_BUILD" },
  { id: "sync-assist", title: "SYNC Assist", module: "Assistant", priority: "P0", bot: "master", build: 68, beta: 35, live: 20, production: 30, blocker: "Cross-module context and remaining Jarvis terminology prevent a single coherent assistant experience.", acceptance: "SYNC Assist can brief and act across Calendar, Finance, Health, Tickets, PM, Business, and Inbox using explicit permissions.", stage: "READY_TO_BUILD" },
  { id: "health", title: "Health / Fitness", module: "Health", priority: "P0", bot: "qa", build: 88, beta: 55, live: 40, production: 55, blocker: "Needs final one-thumb workout UX, date rollover, persistence, completion-flow, and real gym verification.", acceptance: "A user can plan, perform, complete, review, and resume workouts on mobile without confusing scrolling or lost data.", stage: "TESTING" },
  { id: "nutrition", title: "Nutrition", module: "Health", priority: "P1", bot: "qa", build: 72, beta: 30, live: 15, production: 35, blocker: "Food logging, macro verification, daily rollover, reminders, and SYNC Assist context need completion.", acceptance: "User can log food quickly, see remaining calorie/protein targets, and receive accurate daily guidance.", stage: "TESTING" },
  { id: "calendar", title: "Personal Calendar", module: "Personal", priority: "P0", bot: "qa", build: 70, beta: 35, live: 20, production: 35, blocker: "Calendar is not yet the universal schedule layer across Health, PM, Business, tickets, travel, and SYNC Assist.", acceptance: "One calendar presents all SyncWorks commitments and SYNC Assist can explain conflicts, timing, and next actions.", stage: "READY_TO_BUILD" },
  { id: "social", title: "Social Media / Growth", module: "Business", priority: "P0", bot: "social-queue", build: 78, beta: 40, live: 20, production: 35, blocker: "Real channel publishing, publish history, retry behavior, engagement ingestion, and attribution remain launch gates.", acceptance: "Business can connect approved channels, approve content, schedule it, publish reliably, and measure outcomes.", stage: "READY_TO_BUILD" },
  { id: "pm", title: "Property Management", module: "PM", priority: "P1", bot: "qa", build: 85, beta: 45, live: 25, production: 50, blocker: "End-to-end onboarding, tenant linking, maintenance, payments, documents, messaging, and calendar flows need live verification.", acceptance: "A property manager can onboard, manage a tenant/property, process a maintenance flow, communicate, and track payment lifecycle.", stage: "TESTING" },
  { id: "business", title: "Business Core", module: "Business", priority: "P1", bot: "qa", build: 80, beta: 45, live: 30, production: 50, blocker: "Business onboarding, marketplace requests, billing, team permissions, leads, finance, reports, and mobile QA need final validation.", acceptance: "A small business can onboard, receive work, communicate, quote, complete, invoice, and review performance end-to-end.", stage: "TESTING" },
  { id: "auth", title: "Authentication & Session Stability", module: "Platform", priority: "P0", bot: "audit", build: 78, beta: 45, live: 35, production: 45, blocker: "Mobile app switching, API availability, token refresh, timeout, and network error behavior require production verification.", acceptance: "Users remain authenticated appropriately across mobile app switching and recover cleanly from temporary API/network failures.", stage: "AUDIT_NEEDED" },
];

const STAGES = ["AUDIT_NEEDED", "READY_TO_BUILD", "BUILDING", "PREVIEW_READY", "TESTING", "PRODUCTION_READY", "COMPLETE", "BLOCKED"];
const SCORE_FIELDS = ["build", "beta", "live", "production"];

function initialState() {
  return {
    bots: BOT_SEED,
    projects: MODULE_SEED,
    activity: [{ id: 1, text: "God Mode Launch Control initialized", at: new Date().toISOString() }],
  };
}

function loadState() {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    return value && Array.isArray(value.projects) && Array.isArray(value.bots) ? value : initialState();
  } catch {
    return initialState();
  }
}

function clamp(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function score(project) {
  return Math.round((project.build * 0.3) + (project.beta * 0.25) + (project.live * 0.2) + (project.production * 0.25));
}

function Panel({ title, action, children, className = "" }) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-blue-500/20 bg-[#050b1c]/90 ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-blue-500/15 px-4 py-3">
        <h2 className="text-sm font-black uppercase tracking-wide text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function badge(value) {
  if (["READY", "COMPLETE", "PRODUCTION_READY", "P2"].includes(value)) return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  if (["P0", "BLOCKED", "FAILED", "SERVER_REQUIRED"].includes(value)) return "border-rose-400/30 bg-rose-400/10 text-rose-300";
  if (["P1", "BUILDING", "READY_TO_BUILD", "BUSINESS"].includes(value)) return "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-300";
  if (["SCHEDULED", "TESTING", "PLANNED"].includes(value)) return "border-amber-400/30 bg-amber-400/10 text-amber-300";
  return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";
}

function ScoreBar({ label, value, onChange }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500">
        <span>{label}</span><span>{value}%</span>
      </div>
      <input type="range" min="0" max="100" step="5" value={value} onChange={(event) => onChange(clamp(event.target.value))} className="w-full accent-cyan-400" />
    </div>
  );
}

export default function GodModeOperationsDashboard() {
  const [state, setState] = useState(loadState);
  const [selectedId, setSelectedId] = useState(MODULE_SEED[0].id);
  const [runningBot, setRunningBot] = useState("");
  const [view, setView] = useState("launch");

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const selected = state.projects.find((project) => project.id === selectedId) || state.projects[0];
  const totals = useMemo(() => {
    const avg = (field) => Math.round(state.projects.reduce((sum, project) => sum + Number(project[field] || 0), 0) / Math.max(1, state.projects.length));
    return {
      build: avg("build"),
      beta: avg("beta"),
      live: avg("live"),
      production: avg("production"),
      readiness: Math.round(state.projects.reduce((sum, project) => sum + score(project), 0) / Math.max(1, state.projects.length)),
      blockers: state.projects.filter((project) => project.stage === "BLOCKED" || project.priority === "P0" && project.production < 80).length,
      sellableBots: state.bots.filter((bot) => bot.sellable).length,
      serverBots: state.bots.filter((bot) => bot.runtime === "SERVER_REQUIRED").length,
    };
  }, [state]);

  const launchReady = totals.production >= 85 && totals.live >= 80 && totals.blockers === 0;

  function log(text) {
    setState((current) => ({
      ...current,
      activity: [{ id: Date.now(), text, at: new Date().toISOString() }, ...current.activity].slice(0, 40),
    }));
  }

  function patchProject(projectId, patch) {
    setState((current) => ({
      ...current,
      projects: current.projects.map((project) => project.id === projectId ? { ...project, ...patch } : project),
    }));
  }

  function runBot(botId, projectId) {
    const bot = state.bots.find((item) => item.id === botId);
    const project = state.projects.find((item) => item.id === projectId);
    if (!bot || !project || bot.status === "LOCKED" || bot.runtime === "SERVER_REQUIRED") return;
    setRunningBot(botId);
    log(`${bot.name} started for ${project.title}`);
    window.setTimeout(() => {
      const patch = botId === "audit"
        ? { stage: "READY_TO_BUILD", beta: Math.max(project.beta, 30) }
        : botId === "qa"
          ? { stage: "TESTING", beta: Math.max(project.beta, 60) }
          : botId === "release"
            ? { stage: project.production >= 85 && project.live >= 80 ? "PRODUCTION_READY" : "TESTING" }
            : { build: Math.min(95, project.build + 5) };
      patchProject(projectId, patch);
      setRunningBot("");
      log(`${bot.name} completed a controlled run for ${project.title}`);
    }, 600);
  }

  function resetBoard() {
    const reset = initialState();
    setState(reset);
    setSelectedId(reset.projects[0].id);
  }

  const visibleBots = state.bots.filter((bot) => view === "bots" ? bot.sellable : true);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_8%_70%,rgba(0,102,255,.18),transparent_27%),radial-gradient(circle_at_92%_80%,rgba(168,40,255,.16),transparent_30%)]" />
      <div className="relative mx-auto max-w-[1900px] p-3 pb-24 sm:p-5 lg:p-7">
        <header className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${launchReady ? badge("READY") : badge("P0")}`}>{launchReady ? "READY TO SELL" : "LAUNCH MODE"}</span>
              <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[10px] font-black text-blue-200">SYNC Assist</span>
            </div>
            <h1 className="text-2xl font-black tracking-[0.08em] text-white sm:text-3xl">SYNCWORKS <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-400 bg-clip-text text-transparent">GOD MODE</span></h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-400">Founder launch control for completion, testing, production readiness, sellable automation, and the path to user adoption.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/platform?tab=developer_agent" className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-200">Developer Agent</Link>
            <Link to="/platform?tab=growth_os" className="rounded-xl bg-gradient-to-r from-blue-600 to-fuchsia-600 px-4 py-2 text-sm font-bold text-white">Social Media</Link>
            <button type="button" onClick={resetBoard} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm">Reset board</button>
          </div>
        </header>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {[
            ["Launch Readiness", `${totals.readiness}%`, "Weighted build + testing + production"],
            ["Build", `${totals.build}%`, "Implementation completion"],
            ["Beta Tested", `${totals.beta}%`, "Controlled user testing"],
            ["Live Tested", `${totals.live}%`, "Real production-data testing"],
            ["Production", `${totals.production}%`, "Sellable production readiness"],
            ["P0 Gates", String(totals.blockers), "Critical launch gates remaining"],
          ].map(([label, value, note]) => (
            <div key={label} className="rounded-2xl border border-blue-500/20 bg-[#050b1c]/90 p-4">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</div>
              <div className="mt-2 text-2xl font-black text-white">{value}</div>
              <div className="mt-1 text-xs text-slate-500">{note}</div>
            </div>
          ))}
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {[['launch', 'Launch Modules'], ['bots', `Business Bots (${totals.sellableBots})`], ['activity', 'Audit Trail']].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setView(id)} className={`whitespace-nowrap rounded-xl border px-4 py-2 text-sm font-black ${view === id ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-200' : 'border-blue-500/15 bg-slate-950/50 text-slate-400'}`}>{label}</button>
          ))}
        </div>

        {view === "launch" && (
          <div className="grid gap-4 xl:grid-cols-12">
            <Panel title="Master Completion Board" className="xl:col-span-8" action={<span className="text-xs text-slate-500">Build / Beta / Live / Production</span>}>
              <div className="grid gap-3 p-4 md:grid-cols-2">
                {state.projects.map((project) => (
                  <button type="button" key={project.id} onClick={() => setSelectedId(project.id)} className={`rounded-xl border p-4 text-left transition ${selectedId === project.id ? 'border-cyan-400/60 bg-cyan-400/10' : 'border-blue-500/15 bg-slate-950/70 hover:border-blue-400/40'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div><div className="text-sm font-black text-white">{project.title}</div><div className="mt-1 text-xs text-slate-500">{project.module}</div></div>
                      <span className={`rounded-full border px-2 py-1 text-[9px] font-black ${badge(project.priority)}`}>{project.priority}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-4 gap-2 text-center text-[9px] font-black uppercase tracking-wider text-slate-500">
                      {SCORE_FIELDS.map((field) => <div key={field}><div className="text-sm text-white">{project[field]}%</div>{field}</div>)}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[10px]"><span className={`rounded-full border px-2 py-1 font-black ${badge(project.stage)}`}>{project.stage.replaceAll('_', ' ')}</span><span className="font-black text-cyan-300">Score {score(project)}%</span></div>
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="Selected Module" className="xl:col-span-4">
              {selected && <div className="space-y-4 p-4">
                <div><div className="text-lg font-black text-white">{selected.title}</div><div className="mt-1 text-xs text-slate-500">Overall readiness {score(selected)}%</div></div>
                <div className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-3"><div className="text-[10px] font-black uppercase tracking-wider text-rose-300">Current blocker</div><p className="mt-1 text-xs leading-5 text-rose-100">{selected.blocker}</p></div>
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3"><div className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Acceptance criteria</div><p className="mt-1 text-xs leading-5 text-emerald-100">{selected.acceptance}</p></div>
                <div className="space-y-3">{SCORE_FIELDS.map((field) => <ScoreBar key={field} label={field} value={selected[field]} onChange={(value) => patchProject(selected.id, { [field]: value })} />)}</div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Stage<select value={selected.stage} onChange={(event) => { patchProject(selected.id, { stage: event.target.value }); log(`${selected.title} moved to ${event.target.value}`); }} className="mt-2 w-full rounded-xl border border-blue-500/20 bg-slate-950 px-3 py-2 text-sm text-white">{STAGES.map((stage) => <option key={stage}>{stage}</option>)}</select></label>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Assigned bot<select value={selected.bot} onChange={(event) => patchProject(selected.id, { bot: event.target.value })} className="mt-2 w-full rounded-xl border border-blue-500/20 bg-slate-950 px-3 py-2 text-sm text-white">{state.bots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}</select></label>
                <button type="button" onClick={() => runBot(selected.bot, selected.id)} disabled={Boolean(runningBot) || state.bots.find((bot) => bot.id === selected.bot)?.status === 'LOCKED' || state.bots.find((bot) => bot.id === selected.bot)?.runtime === 'SERVER_REQUIRED'} className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-fuchsia-600 px-3 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{runningBot ? 'Running…' : 'Run assigned bot'}</button>
              </div>}
            </Panel>
          </div>
        )}

        {view === "bots" && (
          <div className="grid gap-4 xl:grid-cols-12">
            <Panel title="Sellable Business Bot Catalog" className="xl:col-span-8" action={<span className="text-xs text-slate-500">Package automation as Business add-ons</span>}>
              <div className="grid gap-3 p-4 md:grid-cols-2">
                {visibleBots.map((bot) => (
                  <div key={bot.id} className="rounded-xl border border-blue-500/15 bg-slate-950/70 p-4">
                    <div className="flex items-start justify-between gap-3"><div><div className="font-black text-white">{bot.name}</div><div className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-500">{bot.category} · {bot.package}</div></div><span className={`rounded-full border px-2 py-1 text-[9px] font-black ${badge(bot.status)}`}>{bot.status}</span></div>
                    <p className="mt-3 text-xs leading-5 text-slate-400">{bot.scope}</p>
                    <div className="mt-3 flex flex-wrap gap-2"><span className={`rounded-full border px-2 py-1 text-[9px] font-black ${badge(bot.runtime)}`}>{bot.runtime.replaceAll('_', ' ')}</span><span className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-2 py-1 text-[9px] font-black text-cyan-200">{bot.permission}</span></div>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="Automation Packaging" className="xl:col-span-4">
              <div className="space-y-3 p-4 text-sm">
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3"><div className="font-black text-emerald-200">$0 incremental intelligence first</div><p className="mt-1 text-xs leading-5 text-slate-400">Use rules, templates, database queries, approved social APIs, and scheduled server jobs before adding paid AI inference.</p></div>
                <div className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-3"><div className="font-black text-rose-200">{totals.serverBots} bots require server execution</div><p className="mt-1 text-xs leading-5 text-slate-400">Anything expected to run while the owner is offline cannot depend on a browser tab. These need Django/worker scheduling before they can be sold as true automation.</p></div>
                <div className="rounded-xl border border-blue-400/20 bg-blue-400/5 p-3"><div className="font-black text-blue-200">Recommended packaging</div><p className="mt-1 text-xs leading-5 text-slate-400">Bundle bots into Social Automation, Growth CRM, Reputation, and Growth Intelligence rather than charging per tiny bot.</p></div>
                <Link to="/platform?tab=growth_os" className="block rounded-xl bg-gradient-to-r from-blue-600 to-fuchsia-600 px-4 py-3 text-center text-sm font-black text-white">Open Social Media</Link>
              </div>
            </Panel>
          </div>
        )}

        {view === "activity" && (
          <Panel title="Activity & Audit Trail">
            <div className="grid gap-2 p-4 md:grid-cols-2 xl:grid-cols-3">{state.activity.map((item) => <div key={item.id} className="rounded-xl border border-blue-500/10 bg-slate-950/60 p-3"><div className="text-xs text-slate-200">{item.text}</div><div className="mt-1 text-[10px] text-slate-600">{new Date(item.at).toLocaleString()}</div></div>)}</div>
          </Panel>
        )}
      </div>
    </div>
  );
}
