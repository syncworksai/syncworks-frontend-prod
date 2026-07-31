import React, { useState } from "react";
import { Link } from "react-router-dom";

const navItems = [
  ["Dashboard", "/platform"],
  ["Social Media", "/platform?tab=growth_os"],
  ["Projects", "#projects"],
  ["Bot Audits", "/platform?tab=developer_agent"],
  ["Data Intelligence", "/platform?tab=overview"],
  ["Analytics", "/platform?tab=overview"],
  ["Inbox", "/inbox"],
  ["Calendar", "/calendar"],
  ["Finance", "/customer/finance"],
  ["Health", "/customer/health"],
  ["Property Management", "/pm"],
  ["Settings", "/settings"],
];

const projects = {
  beta: [["AI Content Agent", 75], ["LeadGen Bot v2", 60], ["Analytics Hub", 40], ["CRM Sync", 70]],
  build: [["Payment Gateway", 20], ["Affiliate Portal", 30], ["Mobile App v1", 10], ["Onboarding Flow", 25], ["Data Sync Engine", 15]],
  improve: [["Personal Dashboard", 45], ["Reports Module", 35], ["Email Campaigns", 50]],
  ready: ["Landing Pages", "Funnel Builder", "Social Scheduler", "AI Chatbot", "Notifications", "Billing System"],
};

const audits = [
  ["UI Audit", "Check interface consistency & responsiveness", "Passed"],
  ["Funnel Audit", "Validate funnel steps & conversions", "Passed"],
  ["PM Audit", "Property management process review", "Passed"],
  ["Health Audit", "System health & performance check", "Passed"],
  ["Growth Audit", "Growth loops & acquisition review", "Warning"],
  ["Notifications Audit", "Notification delivery & engagement", "Passed"],
  ["Data Sync Audit", "Data integrity & sync validation", "Passed"],
];

const prioritySeed = [
  ["Review today's social media performance", "HIGH", "10:00 AM"],
  ["Launch new AI Content Agent beta", "HIGH", "12:00 PM"],
  ["Audit onboarding funnel conversion", "MEDIUM", "2:00 PM"],
  ["Check system alerts & notifications", "MEDIUM", "4:00 PM"],
  ["Approve content calendar for week", "LOW", "5:00 PM"],
];

function Card({ title, action, children, id, className = "" }) {
  return (
    <section id={id} className={`overflow-hidden rounded-2xl border border-blue-500/20 bg-[#050b1c]/90 shadow-[0_0_35px_rgba(37,99,235,0.06)] ${className}`}>
      <div className="flex items-center justify-between border-b border-blue-500/15 px-4 py-3">
        <h2 className="text-sm font-black uppercase tracking-wide text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ProgressItem({ item }) {
  return (
    <div className="rounded-lg border border-blue-500/15 bg-slate-950/70 p-2.5">
      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-200">
        <span>{item[0]}</span><span>{item[1]}%</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-fuchsia-500" style={{ width: `${item[1]}%` }} />
      </div>
    </div>
  );
}

function ProjectColumn({ title, count, tone, items, ready = false }) {
  return (
    <div className="min-w-0 border-r border-blue-500/10 p-3 last:border-r-0">
      <div className={`mb-3 flex items-center justify-between text-[10px] font-black uppercase tracking-wider ${tone}`}><span>{title}</span><span>{count}</span></div>
      <div className="space-y-2">
        {items.map((item) => ready ? (
          <div key={item} className="flex items-center justify-between rounded-lg border border-blue-500/15 bg-slate-950/70 px-2.5 py-2 text-[11px] text-slate-200"><span>{item}</span><span className="text-emerald-400">✓</span></div>
        ) : <ProgressItem key={item[0]} item={item} />)}
      </div>
    </div>
  );
}

export default function GodModeDashboard() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [priorities, setPriorities] = useState(prioritySeed.map((item) => ({ item, done: false })));

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_8%_70%,rgba(0,102,255,.20),transparent_27%),radial-gradient(circle_at_92%_80%,rgba(168,40,255,.18),transparent_30%)]" />
      <div className="relative flex min-h-screen">
        <aside className={`${mobileOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto border-r border-blue-500/20 bg-[#030819]/95 p-4 backdrop-blur-xl transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0`}>
          <button type="button" onClick={() => setMobileOpen(false)} className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 lg:hidden">✕</button>
          <div className="mb-7 flex flex-col items-center pt-4">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-blue-400/30 bg-slate-950 text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-br from-cyan-300 via-blue-500 to-fuchsia-400 shadow-[0_0_35px_rgba(59,130,246,.25)]">S</div>
            <div className="mt-3 text-xs font-black tracking-[0.36em] text-white">SYNCWORKS</div>
          </div>
          <div className="mb-3 rounded-xl border border-fuchsia-500/50 bg-gradient-to-r from-blue-600/20 to-fuchsia-600/20 px-3 py-3 text-sm font-bold text-white">♛ &nbsp; God Mode</div>
          <nav className="space-y-1">
            {navItems.map(([label, href]) => (
              <Link key={label} to={href} onClick={() => setMobileOpen(false)} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-blue-500/10 hover:text-white">
                <span>{label}</span>{label === "Inbox" ? <span className="rounded-full bg-fuchsia-500 px-2 py-0.5 text-[10px] font-black text-white">7</span> : null}
              </Link>
            ))}
          </nav>
          <div className="mt-6 rounded-xl border border-blue-500/20 bg-slate-950/60 p-3 text-xs">
            <div className="font-black uppercase tracking-wider text-slate-400">System status</div>
            <div className="mt-2 font-bold text-emerald-400">● All Systems Operational</div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full w-full bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500" /></div>
          </div>
        </aside>

        {mobileOpen ? <button type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-black/70 lg:hidden" /> : null}

        <main className="min-w-0 flex-1 p-3 pb-24 sm:p-5 lg:p-7">
          <header className="mb-5 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <button type="button" onClick={() => setMobileOpen(true)} className="mt-1 rounded-xl border border-blue-500/20 bg-slate-950/80 p-2 lg:hidden">☰</button>
              <div><h1 className="text-xl font-black tracking-[0.08em] text-white sm:text-3xl">SYNCWORKS <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-fuchsia-400">GOD MODE</span></h1><p className="mt-1 text-xs text-slate-400">Owner Access Only &nbsp; • &nbsp; Central Command</p></div>
            </div>
            <div className="flex items-center gap-3"><button type="button" className="rounded-xl border border-blue-500/20 bg-slate-950/70 p-2.5">🔔</button><div className="hidden text-right sm:block"><div className="text-sm font-bold text-white">Jacob W.</div><div className="text-xs text-slate-500">Owner</div></div><div className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10 font-black text-blue-400">JW</div></div>
          </header>

          <div className="grid gap-4 xl:grid-cols-12">
            <Card title="Social Media Automation" className="xl:col-span-4">
              <div className="p-4"><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Platform status</div><div className="mt-3 grid grid-cols-6 gap-2">{["IG", "FB", "X", "TT", "IN", "YT"].map((name) => <div key={name} className="text-center"><div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10 text-[9px] font-black text-cyan-400">{name}</div><div className="mt-1 text-[9px] text-emerald-400">Online</div></div>)}</div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2"><div><div className="mb-2 text-[10px] font-black uppercase text-slate-500">Content queue</div>{["The future of automation is here.", "SyncWorks update: What's new.", "Behind the build: feature drop."].map((text) => <div key={text} className="mb-2 rounded-lg border border-blue-500/15 bg-slate-950/70 p-2 text-[11px] text-slate-200">{text}</div>)}</div><div><div className="mb-2 text-[10px] font-black uppercase text-slate-500">Scheduled posts</div>{[["Power your business with AI.", "12 PM"], ["Automation that scales.", "3 PM"], ["Build. Automate. Grow.", "Tomorrow"]].map((item) => <div key={item[0]} className="flex justify-between gap-2 border-b border-blue-500/10 py-2 text-[10px]"><span>{item[0]}</span><span className="text-slate-500">{item[1]}</span></div>)}</div></div>
                <div className="mt-4 grid grid-cols-2 gap-3"><Link to="/platform?tab=growth_os" className="rounded-xl bg-gradient-to-r from-blue-600 to-fuchsia-600 px-3 py-2.5 text-center text-sm font-bold text-white">＋ Create Post</Link><Link to="/calendar" className="rounded-xl border border-blue-500/20 bg-slate-950/70 px-3 py-2.5 text-center text-sm text-cyan-400">View Calendar →</Link></div>
              </div>
            </Card>

            <Card id="projects" title="Projects" action={<Link to="/platform?tab=developer_agent" className="text-[10px] font-bold text-cyan-400">View All Projects →</Link>} className="xl:col-span-5">
              <div className="grid grid-cols-2 lg:grid-cols-4"><ProjectColumn title="Beta Testing" count="4" tone="text-violet-400" items={projects.beta} /><ProjectColumn title="Build Now" count="5" tone="text-amber-400" items={projects.build} /><ProjectColumn title="Needs Improvement" count="3" tone="text-orange-400" items={projects.improve} /><ProjectColumn title="Production Ready" count="6" tone="text-emerald-400" items={projects.ready} ready /></div>
              <div className="grid grid-cols-4 border-t border-blue-500/15 text-center text-[10px]"><div className="p-3">Total Projects<div className="mt-1 text-base font-black text-white">18</div></div><div className="p-3">In Progress<div className="mt-1 text-base font-black text-amber-300">12</div></div><div className="p-3">Blocked<div className="mt-1 text-base font-black text-rose-400">1</div></div><div className="p-3">Completed<div className="mt-1 text-base font-black text-emerald-400">6</div></div></div>
            </Card>

            <Card title="Bot Audits" action={<Link to="/platform?tab=developer_agent" className="text-[10px] font-bold text-cyan-400">View All Audits →</Link>} className="xl:col-span-3">
              <div className="divide-y divide-blue-500/10">{audits.map((item) => <Link to="/platform?tab=developer_agent" key={item[0]} className="flex items-center gap-3 p-3 hover:bg-blue-500/5"><div className="min-w-0 flex-1"><div className="text-xs font-bold text-white">{item[0]}</div><div className="truncate text-[9px] text-slate-500">{item[1]}</div></div><span className={`rounded px-2 py-1 text-[9px] font-black ${item[2] === "Passed" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>{item[2]}</span><span>›</span></Link>)}</div>
            </Card>

            <Card title="System Overview" action={<span className="text-[10px] text-cyan-400">Last 30 Days →</span>} className="xl:col-span-5">
              <div className="p-4"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Total Revenue", "$128,430", "+18.7%"], ["Active Users", "24,892", "+12.4%"], ["Automations Run", "341,672", "+23.1%"], ["Uptime", "99.98%", "+0.02%"]].map((item) => <div key={item[0]} className="rounded-xl border border-blue-500/15 bg-slate-950/70 p-3"><div className="text-[9px] font-black uppercase text-slate-500">{item[0]}</div><div className="mt-1 text-lg font-black text-white">{item[1]}</div><div className="mt-1 text-[10px] text-emerald-400">↑ {item[2]}</div></div>)}</div><div className="mt-4 flex h-44 items-end gap-2 rounded-xl border border-blue-500/15 bg-slate-950/50 p-4">{[30,24,42,54,40,66,52,76,68,88,72,94].map((height, index) => <div key={index} className="flex-1 rounded-t bg-gradient-to-t from-fuchsia-600/30 to-blue-500" style={{ height: `${height}%` }} />)}</div></div>
            </Card>

            <Card title="Daily Priorities" className="xl:col-span-4">
              <div className="divide-y divide-blue-500/10">{priorities.map((entry, index) => <button type="button" key={`${entry.item[0]}-${index}`} onClick={() => setPriorities((current) => current.map((priority, priorityIndex) => priorityIndex === index ? { ...priority, done: !priority.done } : priority))} className="flex w-full items-center gap-3 p-3 text-left hover:bg-blue-500/5"><span className={`flex h-4 w-4 items-center justify-center rounded border ${entry.done ? "border-emerald-400 bg-emerald-400 text-slate-950" : "border-slate-500"}`}>{entry.done ? "✓" : ""}</span><span className={`min-w-0 flex-1 text-xs ${entry.done ? "text-slate-600 line-through" : "text-slate-200"}`}>{entry.item[0]}</span><span className="rounded bg-fuchsia-500/15 px-2 py-1 text-[8px] font-black text-fuchsia-400">{entry.item[1]}</span><span className="hidden text-[9px] text-slate-500 sm:block">{entry.item[2]}</span></button>)}</div><button type="button" onClick={() => setPriorities((current) => [...current, { item: ["New owner priority", "LOW", "Today"], done: false }])} className="p-4 text-xs font-bold text-cyan-400">＋ Add Priority</button>
            </Card>

            <Card title="Recent Activity" action={<span className="text-[10px] text-cyan-400">View All →</span>} className="xl:col-span-3">
              <div className="divide-y divide-blue-500/10">{[["AI Content Agent beta updated", "v1.2.4 deployed successfully", "2m"], ["New lead captured", "Source: Facebook Ads", "8m"], ["Funnel audit completed", "Onboarding Funnel", "15m"], ["Payment processed", "$1,250.00", "27m"], ["Project moved to Production", "Social Scheduler", "1h"]].map((item) => <div key={item[0]} className="flex gap-3 p-3"><div className="min-w-0 flex-1"><div className="text-xs font-bold text-white">{item[0]}</div><div className="truncate text-[9px] text-slate-500">{item[1]}</div></div><span className="text-[9px] text-slate-600">{item[2]}</span></div>)}</div>
            </Card>
          </div>

          <div className="mt-7 flex items-center gap-5"><div className="h-px flex-1 bg-gradient-to-r from-transparent to-cyan-500" /><div className="text-[10px] font-black tracking-[0.35em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">ONE SYSTEM. CONNECTED.</div><div className="h-px flex-1 bg-gradient-to-r from-fuchsia-500 to-transparent" /></div>
        </main>
      </div>
    </div>
  );
}
