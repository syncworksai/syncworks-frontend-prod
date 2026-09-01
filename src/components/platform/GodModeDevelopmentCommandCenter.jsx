import React, { useMemo, useState } from "react";

const MODULES = [
  { area: "Control", module: "God Mode / Developer Control", progress: 72, state: "BUILDING", frontend: "ON MAIN", backend: "PARTIAL", production: "NEEDS VERIFY", blocker: "Launch truth is still partly browser/manual state.", next: "Make this board the operating source of truth." },
  { area: "Core", module: "Authentication & Mobile Session", progress: 78, state: "TESTING", frontend: "ON MAIN", backend: "ON MAIN", production: "NEEDS TEST", blocker: "Full mobile app-switch/session acceptance still required.", next: "Production mobile session audit." },
  { area: "Personal", module: "Personal Dashboard", progress: 82, state: "TESTING", frontend: "ON MAIN", backend: "ON MAIN", production: "NEEDS TEST", blocker: "Global UI consistency audit is not complete.", next: "Use Personal as the UI source of truth across modules." },
  { area: "Assistant", module: "SYNC Assist", progress: 68, state: "BUILDING", frontend: "ON MAIN", backend: "PARTIAL", production: "NEEDS TEST", blocker: "Cross-module actions and commerce/provider handoffs are incomplete.", next: "Connect Store + provider discovery + contextual actions." },
  { area: "Planning", module: "Calendar / Tasks / Weather", progress: 72, state: "TESTING", frontend: "ON MAIN", backend: "PARTIAL", production: "NEEDS TEST", blocker: "External calendar write-through and integrated QA remain.", next: "End-to-end schedule/location acceptance." },
  { area: "Money", module: "Personal Finance", progress: 55, state: "BUILDING", frontend: "ON MAIN", backend: "PARTIAL", production: "NOT READY", blocker: "Financial aggregation and production acceptance incomplete.", next: "Finish core finance operating loop." },
  { area: "Health", module: "Health Workout", progress: 88, state: "TESTING", frontend: "ON MAIN", backend: "ON MAIN", production: "NEEDS TEST", blocker: "One-thumb UX, persistence, completion and real gym verification remain.", next: "Final beta acceptance pass." },
  { area: "Health", module: "Health Nutrition", progress: 72, state: "BUILDING", frontend: "ON MAIN", backend: "PARTIAL", production: "NEEDS TEST", blocker: "Nutrition + commerce recommendation loop incomplete.", next: "Add Health Store recommendation surface." },
  { area: "Commerce", module: "Store / Affiliate Commerce", progress: 20, state: "READY TO BUILD", frontend: "PARTIAL", backend: "NOT BUILT", production: "NOT READY", blocker: "No unified affiliate catalog, attribution or Store operating layer yet.", next: "Personal Store + Health Store + affiliate attribution." },
  { area: "Marketplace", module: "Marketplace / Tickets", progress: 72, state: "TESTING", frontend: "ON MAIN", backend: "ON MAIN", production: "NEEDS TEST", blocker: "Full provider-to-ticket-to-payment acceptance remains.", next: "Build I Know Just the Guy provider handoff." },
  { area: "Business", module: "Business Core / Team / Dispatch", progress: 78, state: "TESTING", frontend: "ON MAIN", backend: "ON MAIN", production: "NEEDS TEST", blocker: "UI consistency and E2E business acceptance incomplete.", next: "Business production audit using Personal UI standard." },
  { area: "Business", module: "Billing / Payments", progress: 55, state: "BLOCKED", frontend: "PARTIAL", backend: "PARTIAL", production: "NOT READY", blocker: "Fee responsibility, Connect architecture and payout economics must be finalized.", next: "Lock Stripe fee model before public transactions." },
  { area: "Growth", module: "Social Media Automation", progress: 76, state: "BUILDING", frontend: "ON MAIN", backend: "ON MAIN", production: "NEEDS TEST", blocker: "Production channel/action acceptance remains.", next: "Finish Business Social + Leads acceptance." },
  { area: "Social", module: "Groups / Events / RSVP / Collect", progress: 52, state: "OPEN PR", frontend: "PR #100", backend: "PR #58", production: "NOT READY", blocker: "Key frontend/backend work remains draft/unmerged; real payment execution is separate.", next: "Reconcile and finish PR #100 + backend PR #58." },
  { area: "PM", module: "Property Management", progress: 78, state: "TESTING", frontend: "ON MAIN", backend: "ON MAIN", production: "NEEDS TEST", blocker: "End-to-end PM acceptance and document workflow remain.", next: "PM production audit." },
  { area: "PM", module: "Lease Builder / Documents", progress: 55, state: "OPEN PR", frontend: "PR #77", backend: "PR #28", production: "NOT READY", blocker: "Lease builder branches remain draft/unmerged.", next: "Reconcile and finish lease builder PRs." },
  { area: "Revenue", module: "Affiliate Program", progress: 68, state: "TESTING", frontend: "ON MAIN", backend: "ON MAIN", production: "NEEDS TEST", blocker: "Commerce partner attribution and consolidated revenue reporting are missing.", next: "Unify affiliate earnings inside God Mode." },
  { area: "Trading", module: "EDGE / Day Trading Futures", progress: 62, state: "BUILDING", frontend: "ON MAIN", backend: "PARTIAL", production: "NOT READY", blocker: "Provider/live execution and production acceptance remain separate.", next: "Keep signal/paper workflow isolated until verified." },
  { area: "Platform", module: "Production Infrastructure", progress: 58, state: "NEEDS VERIFY", frontend: "ON MAIN", backend: "ON MAIN", production: "UNKNOWN", blocker: "Production deployment status must be independently verified before launch credit.", next: "Verify Vercel + Render + migrations + runtime." },
];

const REVENUE = [
  { name: "Subscriptions", status: "ACTIVE / VERIFY", detail: "Business, Health and paid add-ons." },
  { name: "Marketplace fees", status: "MODEL REVIEW", detail: "Target: small customer-facing platform fee without absorbing processor cost." },
  { name: "Affiliate commerce", status: "BUILD NEXT", detail: "Amazon, Health, software and contextual SYNC recommendations." },
  { name: "Affiliate sales program", status: "BUILT / TEST", detail: "Business referral commissions and payout reporting." },
  { name: "Payments monetization", status: "DECISION GATE", detail: "Stripe Connect configuration determines who pays processing." },
];

const OPEN_WORK = [
  ["Frontend PR #100", "Social groups, events, RSVPs, payments UI and chat", "OPEN / DRAFT"],
  ["Backend PR #58", "Social RSVP/event calendar propagation and chat", "OPEN / DRAFT"],
  ["Frontend PR #77", "Internal PM lease builder UI", "OPEN / DRAFT"],
  ["Backend PR #28", "PM lease builder bootstrap/save/finalize", "OPEN / DRAFT"],
];

const RECENT = [
  ["Aug 31", "Health workout start + history recovery", "MERGED"],
  ["Now", "God Mode Development Command Center v3", "BUILDING"],
];

function tone(value) {
  if (/READY|PASSED|MERGED|ON MAIN|ACTIVE/.test(value)) return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  if (/BLOCKED|NOT READY|NOT BUILT/.test(value)) return "border-rose-400/25 bg-rose-400/10 text-rose-200";
  if (/PR|BUILD|TEST|VERIFY|PARTIAL|UNKNOWN|DECISION/.test(value)) return "border-amber-400/25 bg-amber-400/10 text-amber-100";
  return "border-slate-700 bg-slate-900 text-slate-300";
}

function Badge({ children }) {
  return <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${tone(String(children))}`}>{children}</span>;
}

function Metric({ label, value, note }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</div><div className="mt-1 text-xl font-black text-white">{value}</div>{note ? <div className="mt-1 text-[11px] leading-4 text-slate-500">{note}</div> : null}</div>;
}

export default function GodModeDevelopmentCommandCenter() {
  const [filter, setFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => MODULES.filter((item) => (filter === "ALL" || item.area === filter) && `${item.area} ${item.module} ${item.state} ${item.blocker}`.toLowerCase().includes(query.toLowerCase())), [filter, query]);
  const areas = ["ALL", ...Array.from(new Set(MODULES.map((item) => item.area)))];
  const readiness = Math.round(MODULES.reduce((sum, item) => sum + item.progress, 0) / MODULES.length);
  const blocked = MODULES.filter((item) => item.state === "BLOCKED" || item.production === "NOT READY").length;
  const testing = MODULES.filter((item) => /TEST/.test(item.state) || /TEST/.test(item.production)).length;
  const openPr = MODULES.filter((item) => item.state === "OPEN PR").length;

  return <section className="space-y-4">
    <div className="rounded-2xl border border-cyan-400/20 bg-slate-950/80 p-4 shadow-2xl shadow-cyan-950/20">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div><div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">SyncWorks Operations</div><h2 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">Development Command Center</h2><p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">One board for what is built, merged, deployed, verified, blocked and next. Progress is an audited operating estimate, not a production guarantee.</p></div>
        <div className="flex gap-2"><Badge>GOD MODE ONLY</Badge><Badge>LAUNCH CONTROL</Badge></div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6"><Metric label="Launch readiness" value={`${readiness}%`} note="Commercial beta estimate"/><Metric label="Modules" value={MODULES.length}/><Metric label="Testing" value={testing}/><Metric label="Not ready" value={blocked}/><Metric label="Open PR lanes" value={openPr}/><Metric label="Production" value="VERIFY" note="Never assume deployed"/></div>
    </div>

    <div className="grid gap-3 xl:grid-cols-[1.55fr_.85fr]">
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
        <div className="border-b border-slate-800 p-3"><div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><h3 className="text-sm font-black text-white">Module Matrix</h3><p className="text-[11px] text-slate-500">Built is not complete. Complete means verified.</p></div><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search modules / blockers" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none md:w-64"/></div><div className="mt-2 flex gap-1 overflow-x-auto pb-1">{areas.map((area)=><button key={area} onClick={()=>setFilter(area)} className={`whitespace-nowrap rounded-md border px-2 py-1 text-[10px] font-bold ${filter===area?"border-cyan-400/40 bg-cyan-400/10 text-cyan-200":"border-slate-800 text-slate-500"}`}>{area}</button>)}</div></div>
        <div className="overflow-x-auto"><table className="min-w-[1080px] w-full text-left text-[11px]"><thead className="bg-slate-900/80 text-[9px] uppercase tracking-[0.12em] text-slate-500"><tr><th className="p-3">Module</th><th className="p-3">Stage</th><th className="p-3">Progress</th><th className="p-3">Frontend</th><th className="p-3">Backend</th><th className="p-3">Production</th><th className="p-3">Blocker / gap</th><th className="p-3">Next build</th></tr></thead><tbody>{filtered.map((item)=><tr key={item.module} className="border-t border-slate-900 align-top"><td className="p-3"><div className="text-[9px] font-bold uppercase tracking-[0.12em] text-cyan-500">{item.area}</div><div className="mt-1 font-bold text-slate-100">{item.module}</div></td><td className="p-3"><Badge>{item.state}</Badge></td><td className="p-3"><div className="font-black text-white">{item.progress}%</div><div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-cyan-400" style={{width:`${item.progress}%`}}/></div></td><td className="p-3"><Badge>{item.frontend}</Badge></td><td className="p-3"><Badge>{item.backend}</Badge></td><td className="p-3"><Badge>{item.production}</Badge></td><td className="max-w-[240px] p-3 leading-4 text-slate-400">{item.blocker}</td><td className="max-w-[220px] p-3 leading-4 text-slate-300">{item.next}</td></tr>)}</tbody></table></div>
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3"><h3 className="text-sm font-black text-white">Revenue Control</h3><p className="mt-1 text-[11px] text-slate-500">Every monetization lane belongs in God Mode.</p><div className="mt-3 space-y-2">{REVENUE.map((item)=><div key={item.name} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3"><div className="flex items-start justify-between gap-2"><div className="text-xs font-bold text-slate-100">{item.name}</div><Badge>{item.status}</Badge></div><div className="mt-1 text-[11px] leading-4 text-slate-500">{item.detail}</div></div>)}</div></div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3"><h3 className="text-sm font-black text-white">Open Work</h3><div className="mt-2 space-y-2">{OPEN_WORK.map(([name,detail,status])=><div key={name} className="rounded-lg border border-slate-800 p-2"><div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-slate-200">{name}</span><Badge>{status}</Badge></div><div className="mt-1 text-[11px] leading-4 text-slate-500">{detail}</div></div>)}</div></div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3"><h3 className="text-sm font-black text-white">Recently Shipped</h3><div className="mt-2 space-y-2">{RECENT.map(([date,name,status])=><div key={name} className="flex items-center gap-2 text-[11px]"><span className="w-12 text-slate-600">{date}</span><span className="flex-1 text-slate-300">{name}</span><Badge>{status}</Badge></div>)}</div></div>
      </div>
    </div>

    <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/5 p-4"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-300">Recommended build order</div><div className="mt-2 grid gap-2 text-xs text-slate-300 md:grid-cols-3 xl:grid-cols-6">{["1. God Mode truth layer","2. Global UI production audit","3. Store + affiliate engine","4. I Know Just the Guy","5. Payments economics gate","6. Production closure"].map((x)=><div key={x} className="rounded-lg border border-fuchsia-400/10 bg-slate-950/60 p-2 font-bold">{x}</div>)}</div></div>
  </section>;
}
