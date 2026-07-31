import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Database,
  FolderKanban,
  HeartPulse,
  Home,
  Inbox,
  Instagram,
  Linkedin,
  Menu,
  MessageSquareText,
  Plus,
  Radio,
  Rocket,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  X,
  Youtube,
  Zap,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: Home, href: "/platform" },
  { label: "Social Media", icon: MessageSquareText, href: "/platform?tab=growth_os" },
  { label: "Projects", icon: FolderKanban, href: "#projects" },
  { label: "Bot Audits", icon: Bot, href: "/platform?tab=developer_agent" },
  { label: "Data Intelligence", icon: Database, href: "/platform?tab=overview" },
  { label: "Analytics", icon: BarChart3, href: "/platform?tab=overview" },
  { label: "Inbox", icon: Inbox, href: "/inbox", badge: 7 },
  { label: "Calendar", icon: CalendarDays, href: "/calendar" },
  { label: "Finance", icon: CircleDollarSign, href: "/customer/finance" },
  { label: "Health", icon: HeartPulse, href: "/customer/health" },
  { label: "Property Management", icon: ClipboardCheck, href: "/pm" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

const socialPlatforms = [
  { name: "Instagram", icon: Instagram },
  { name: "Facebook", icon: Radio },
  { name: "X", icon: X },
  { name: "TikTok", icon: Zap },
  { name: "LinkedIn", icon: Linkedin },
  { name: "YouTube", icon: Youtube },
];

const initialProjects = {
  beta: [
    { name: "AI Content Agent", value: 75 },
    { name: "LeadGen Bot v2", value: 60 },
    { name: "Analytics Hub", value: 40 },
    { name: "CRM Sync", value: 70 },
  ],
  build: [
    { name: "Payment Gateway", value: 20 },
    { name: "Affiliate Portal", value: 30 },
    { name: "Mobile App v1", value: 10 },
    { name: "Onboarding Flow", value: 25 },
    { name: "Data Sync Engine", value: 15 },
  ],
  improve: [
    { name: "Personal Dashboard", value: 45 },
    { name: "Reports Module", value: 35 },
    { name: "Email Campaigns", value: 50 },
  ],
  ready: [
    "Landing Pages",
    "Funnel Builder",
    "Social Scheduler",
    "AI Chatbot",
    "Notifications",
    "Billing System",
  ],
};

const auditRows = [
  ["UI Audit", "Check interface consistency & responsiveness", "Passed"],
  ["Funnel Audit", "Validate funnel steps & conversions", "Passed"],
  ["PM Audit", "Project management process review", "Passed"],
  ["Health Audit", "System health & performance check", "Passed"],
  ["Growth Audit", "Growth loops & acquisition review", "Warning"],
  ["Notifications Audit", "Notification delivery & engagement", "Passed"],
  ["Data Sync Audit", "Data integrity & sync validation", "Passed"],
];

const initialPriorities = [
  ["Review today's social media performance", "HIGH", "10:00 AM"],
  ["Launch new AI Content Agent beta", "HIGH", "12:00 PM"],
  ["Audit onboarding funnel conversion", "MEDIUM", "2:00 PM"],
  ["Check system alerts & notifications", "MEDIUM", "4:00 PM"],
  ["Approve content calendar for week", "LOW", "5:00 PM"],
];

function Card({ children, className = "", id }) {
  return (
    <section id={id} className={`rounded-2xl border border-blue-500/20 bg-[#050b1c]/90 shadow-[0_0_35px_rgba(37,99,235,0.06)] ${className}`}>
      {children}
    </section>
  );
}

function CardHeader({ icon: Icon, title, action }) {
  return (
    <div className="flex items-center justify-between border-b border-blue-500/15 px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-white">
        <Icon className="h-4 w-4 text-cyan-400" />
        {title}
      </div>
      {action}
    </div>
  );
}

function ProjectColumn({ title, count, tone, items, ready }) {
  return (
    <div className="min-w-0 border-r border-blue-500/10 p-3 last:border-r-0">
      <div className={`mb-3 flex items-center justify-between text-[10px] font-black uppercase tracking-wider ${tone}`}>
        <span>{title}</span><span>{count}</span>
      </div>
      <div className="space-y-2">
        {items.map((item) => ready ? (
          <div key={item} className="flex items-center justify-between rounded-lg border border-blue-500/15 bg-slate-950/70 px-2.5 py-2 text-[11px] text-slate-200">
            <span>{item}</span><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          </div>
        ) : (
          <div key={item.name} className="rounded-lg border border-blue-500/15 bg-slate-950/70 p-2.5">
            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-200"><span>{item.name}</span><span>{item.value}%</span></div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-fuchsia-500" style={{ width: `${item.value}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GodModeDashboard() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [priorities, setPriorities] = useState(initialPriorities.map((item) => ({ item, done: false })));
  const projectTotals = useMemo(() => ({ total: 18, progress: 12, blocked: 1, complete: 6 }), []);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-fuchsia-500/30">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_8%_70%,rgba(0,102,255,.20),transparent_27%),radial-gradient(circle_at_92%_80%,rgba(168,40,255,.18),transparent_30%),linear-gradient(120deg,#020617_0%,#030716_55%,#08031a_100%)]" />
      <div className="relative flex min-h-screen">
        <aside className={`${mobileOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-40 w-64 border-r border-blue-500/20 bg-[#030819]/95 p-4 backdrop-blur-xl transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0`}>
          <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 lg:hidden"><X className="h-5 w-5" /></button>
          <div className="mb-7 flex flex-col items-center pt-4">
            <div className="relative h-20 w-20">
              <div className="absolute inset-0 rotate-45 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-600 to-fuchsia-500 opacity-35 blur-xl" />
              <div className="relative flex h-full w-full items-center justify-center rounded-2xl border border-blue-400/30 bg-slate-950 text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-br from-cyan-300 via-blue-500 to-fuchsia-400">S</div>
            </div>
            <div className="mt-3 text-xs font-black tracking-[0.36em] text-white">SYNCWORKS</div>
          </div>
          <div className="mb-3 rounded-xl border border-fuchsia-500/50 bg-gradient-to-r from-blue-600/20 to-fuchsia-600/20 px-3 py-3 shadow-[0_0_25px_rgba(168,85,247,.18)]">
            <div className="flex items-center gap-2 text-sm font-bold text-white"><ShieldCheck className="h-4 w-4 text-cyan-300" /> God Mode</div>
          </div>
          <nav className="space-y-1">
            {navItems.map(({ label, icon: Icon, href, badge }) => (
              <Link key={label} to={href} onClick={() => setMobileOpen(false)} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-blue-500/10 hover:text-white">
                <span className="flex items-center gap-3"><Icon className="h-4 w-4 text-blue-400" />{label}</span>{badge ? <span className="rounded-full bg-fuchsia-500 px-2 py-0.5 text-[10px] font-black text-white">{badge}</span> : null}
              </Link>
            ))}
          </nav>
          <div className="mt-6 rounded-xl border border-blue-500/20 bg-slate-950/60 p-3 text-xs">
            <div className="font-black uppercase tracking-wider text-slate-400">System status</div>
            <div className="mt-2 flex items-center gap-2 font-bold text-emerald-400"><span className="h-2 w-2 rounded-full bg-emerald-400" /> All Systems Operational</div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full w-full bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500" /></div>
          </div>
        </aside>

        {mobileOpen ? <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-black/70 lg:hidden" /> : null}

        <main className="min-w-0 flex-1 p-3 pb-24 sm:p-5 lg:p-7">
          <header className="mb-5 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <button onClick={() => setMobileOpen(true)} className="mt-1 rounded-xl border border-blue-500/20 bg-slate-950/80 p-2 lg:hidden"><Menu className="h-5 w-5" /></button>
              <div>
                <h1 className="text-xl font-black tracking-[0.08em] text-white sm:text-3xl">SYNCWORKS <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-fuchsia-400">GOD MODE</span></h1>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400"><ShieldCheck className="h-3.5 w-3.5 text-cyan-400" /> Owner Access Only <span>•</span> Central Command</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative rounded-xl border border-blue-500/20 bg-slate-950/70 p-2.5"><Bell className="h-5 w-5" /><span className="absolute -right-1 -top-1 rounded-full bg-fuchsia-500 px-1.5 text-[9px] font-black">3</span></button>
              <div className="hidden text-right sm:block"><div className="text-sm font-bold text-white">Jacob W.</div><div className="text-xs text-slate-500">Owner</div></div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10 font-black text-blue-400">JW</div>
            </div>
          </header>

          <div className="grid gap-4 xl:grid-cols-12">
            <Card className="xl:col-span-4">
              <CardHeader icon={Radio} title="Social Media Automation" />
              <div className="p-4">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Platform status</div>
                <div className="mt-3 grid grid-cols-6 gap-2">
                  {socialPlatforms.map(({ name, icon: Icon }) => <div key={name} className="text-center"><Icon className="mx-auto h-5 w-5 text-cyan-400" /><div className="mt-1 text-[9px] text-emerald-400">Online</div></div>)}
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div><div className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">Content queue</div>{["The future of automation is here.", "SyncWorks update: What's new.", "Behind the build: feature drop."].map((text, i) => <div key={text} className="mb-2 rounded-lg border border-blue-500/15 bg-slate-950/70 p-2 text-[11px]"><div className="text-slate-200">{text}</div><div className="mt-1 text-[9px] text-blue-400">{i === 2 ? "TikTok • Short" : i === 1 ? "LinkedIn • Post" : "Reels • Instagram"}</div></div>)}</div>
                  <div><div className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">Scheduled posts</div>{[["Power your business with AI.", "12:00 PM"], ["Automation that scales.", "3:00 PM"], ["Build. Automate. Grow.", "Tomorrow"], ["Consistency creates momentum.", "Tomorrow"]].map(([text,time]) => <div key={text} className="flex justify-between gap-2 border-b border-blue-500/10 py-2 text-[10px]"><span>{text}</span><span className="text-slate-500">{time}</span></div>)}</div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3"><Link to="/platform?tab=growth_os" className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-fuchsia-600 px-3 py-2.5 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Create Post</Link><Link to="/calendar" className="flex items-center justify-center gap-2 rounded-xl border border-blue-500/20 bg-slate-950/70 px-3 py-2.5 text-sm text-cyan-400">View Calendar <ChevronRight className="h-4 w-4" /></Link></div>
              </div>
            </Card>

            <Card id="projects" className="xl:col-span-5">
              <CardHeader icon={FolderKanban} title="Projects" action={<Link to="/platform?tab=developer_agent" className="text-[10px] font-bold text-cyan-400">View All Projects →</Link>} />
              <div className="grid grid-cols-2 lg:grid-cols-4"><ProjectColumn title="Beta Testing" count="4" tone="text-violet-400" items={initialProjects.beta} /><ProjectColumn title="Build Now" count="5" tone="text-amber-400" items={initialProjects.build} /><ProjectColumn title="Needs Improvement" count="3" tone="text-orange-400" items={initialProjects.improve} /><ProjectColumn title="Production Ready" count="6" tone="text-emerald-400" items={initialProjects.ready} ready /></div>
              <div className="grid grid-cols-4 border-t border-blue-500/15 text-center text-[10px]"><div className="p-3">Total Projects<div className="mt-1 text-base font-black text-white">{projectTotals.total}</div></div><div className="p-3">In Progress<div className="mt-1 text-base font-black text-amber-300">{projectTotals.progress}</div></div><div className="p-3">Blocked<div className="mt-1 text-base font-black text-rose-400">{projectTotals.blocked}</div></div><div className="p-3">Completed<div className="mt-1 text-base font-black text-emerald-400">{projectTotals.complete}</div></div></div>
            </Card>

            <Card className="xl:col-span-3">
              <CardHeader icon={ShieldCheck} title="Bot Audits" action={<Link to="/platform?tab=developer_agent" className="text-[10px] font-bold text-cyan-400">View All Audits →</Link>} />
              <div className="divide-y divide-blue-500/10">{auditRows.map(([name, detail, status]) => <Link to="/platform?tab=developer_agent" key={name} className="flex items-center gap-3 p-3 transition hover:bg-blue-500/5"><div className="rounded-lg bg-blue-500/10 p-2"><Bot className="h-4 w-4 text-fuchsia-400" /></div><div className="min-w-0 flex-1"><div className="text-xs font-bold text-white">{name}</div><div className="truncate text-[9px] text-slate-500">{detail}</div></div><span className={`rounded px-2 py-1 text-[9px] font-black ${status === "Passed" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>{status}</span><ChevronRight className="h-4 w-4 text-slate-600" /></Link>)}</div>
            </Card>

            <Card className="xl:col-span-5">
              <CardHeader icon={Activity} title="System Overview" action={<span className="text-[10px] text-cyan-400">Last 30 Days →</span>} />
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Total Revenue", "$128,430", "+18.7%"], ["Active Users", "24,892", "+12.4%"], ["Automations Run", "341,672", "+23.1%"], ["Uptime", "99.98%", "+0.02%"]].map(([label,value,change]) => <div key={label} className="rounded-xl border border-blue-500/15 bg-slate-950/70 p-3"><div className="text-[9px] font-black uppercase text-slate-500">{label}</div><div className="mt-1 text-lg font-black text-white">{value}</div><div className="mt-1 text-[10px] text-emerald-400">↑ {change}</div></div>)}</div>
                <div className="mt-4 h-44 rounded-xl border border-blue-500/15 bg-[linear-gradient(rgba(37,99,235,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,.08)_1px,transparent_1px)] bg-[size:34px_34px] p-4"><div className="flex h-full items-end gap-2">{[30,24,42,54,40,66,52,76,68,88,72,94].map((h,i) => <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-fuchsia-600/20 to-blue-500" style={{ height: `${h}%` }} />)}</div></div>
              </div>
            </Card>

            <Card className="xl:col-span-4">
              <CardHeader icon={Target} title="Daily Priorities" />
              <div className="divide-y divide-blue-500/10">{priorities.map(({ item, done }, index) => { const [label,level,time] = item; return <button key={label} onClick={() => setPriorities((current) => current.map((p,i) => i === index ? {...p, done: !p.done} : p))} className="flex w-full items-center gap-3 p-3 text-left hover:bg-blue-500/5"><span className={`h-4 w-4 rounded border ${done ? "border-emerald-400 bg-emerald-400" : "border-slate-500"}`}>{done ? <CheckCircle2 className="h-4 w-4 text-slate-950" /> : null}</span><span className={`min-w-0 flex-1 text-xs ${done ? "text-slate-600 line-through" : "text-slate-200"}`}>{label}</span><span className={`rounded px-2 py-1 text-[8px] font-black ${level === "HIGH" ? "bg-fuchsia-500/15 text-fuchsia-400" : level === "MEDIUM" ? "bg-amber-500/15 text-amber-400" : "bg-cyan-500/15 text-cyan-400"}`}>{level}</span><span className="hidden text-[9px] text-slate-500 sm:block">Due {time}</span></button>})}</div>
              <button onClick={() => setPriorities((current) => [...current, { item: ["New owner priority", "LOW", "Today"], done: false }])} className="flex items-center gap-2 p-4 text-xs font-bold text-cyan-400"><Plus className="h-4 w-4" /> Add Priority</button>
            </Card>

            <Card className="xl:col-span-3">
              <CardHeader icon={Clock3} title="Recent Activity" action={<span className="text-[10px] text-cyan-400">View All →</span>} />
              <div className="divide-y divide-blue-500/10">{[[Sparkles,"AI Content Agent beta updated","v1.2.4 deployed successfully","2m ago"],[Users,"New lead captured from landing page","Source: Facebook Ads","8m ago"],[ShieldCheck,"Funnel audit completed","Onboarding Funnel","15m ago"],[CircleDollarSign,"Payment processed","Amount: $1,250.00","27m ago"],[Rocket,"New project moved to Production","Social Scheduler","1h ago"]].map(([Icon,title,detail,time]) => <div key={title} className="flex gap-3 p-3"><div className="rounded-lg bg-blue-500/10 p-2"><Icon className="h-4 w-4 text-cyan-400" /></div><div className="min-w-0 flex-1"><div className="text-xs font-bold text-white">{title}</div><div className="truncate text-[9px] text-slate-500">{detail}</div></div><span className="text-[9px] text-slate-600">{time}</span></div>)}</div>
            </Card>
          </div>

          <div className="mt-7 flex items-center gap-5"><div className="h-px flex-1 bg-gradient-to-r from-transparent to-cyan-500" /><div className="text-[10px] font-black tracking-[0.5em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 sm:text-xs">ONE SYSTEM. CONNECTED.</div><div className="h-px flex-1 bg-gradient-to-r from-fuchsia-500 to-transparent" /></div>
        </main>
      </div>
    </div>
  );
}
