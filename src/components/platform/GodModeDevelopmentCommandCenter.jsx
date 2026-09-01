import React, { useMemo, useState } from "react";

const MODULES = [
  ["Control", "God Mode / Developer Control", 72, "BUILDING", "ON MAIN", "PARTIAL", "NEEDS VERIFY", "Launch truth is still partly manual.", "Make this board the operating source of truth."],
  ["Core", "Authentication & Mobile Session", 78, "TESTING", "ON MAIN", "ON MAIN", "NEEDS TEST", "Mobile app-switch/session acceptance remains.", "Production mobile session audit."],
  ["Personal", "Personal Dashboard", 82, "TESTING", "ON MAIN", "ON MAIN", "NEEDS TEST", "Global UI consistency audit incomplete.", "Use Personal as UI source of truth."],
  ["Assistant", "SYNC Assist", 68, "BUILDING", "ON MAIN", "PARTIAL", "NEEDS TEST", "Cross-module commerce/provider handoffs incomplete.", "Connect Store + provider discovery."],
  ["Health", "Health Workout / Nutrition", 84, "TESTING", "ON MAIN", "PARTIAL", "NEEDS TEST", "Final gym, nutrition and mobile acceptance remains.", "Finish Health beta acceptance + Store."],
  ["Commerce", "Store / Affiliate Commerce", 20, "READY TO BUILD", "PARTIAL", "NOT BUILT", "NOT READY", "No unified partner catalog or attribution layer.", "Personal Store + Health Store + attribution."],
  ["Marketplace", "Marketplace / Tickets / Provider Referral", 72, "TESTING", "ON MAIN", "ON MAIN", "NEEDS TEST", "Provider-to-ticket-to-payment acceptance remains.", "Build I Know Just the Guy handoff."],
  ["Business", "Business Core / Team / Dispatch", 78, "TESTING", "ON MAIN", "ON MAIN", "NEEDS TEST", "UI consistency and E2E acceptance incomplete.", "Business production audit."],
  ["Money", "Billing / Payments / Offline Transactions", 55, "BLOCKED", "PARTIAL", "PARTIAL", "NOT READY", "Stripe, cash, Cash App, Venmo and fee billing need one ledger.", "Lock transaction ledger + fee policy."],
  ["Growth", "Social Media / Leads", 76, "BUILDING", "ON MAIN", "ON MAIN", "NEEDS TEST", "Production channel/action acceptance remains.", "Finish Social + Leads acceptance."],
  ["Social", "Groups / Events / RSVP / Collect", 52, "OPEN PR", "PR #100", "PR #58", "NOT READY", "Open Social work remains unmerged.", "Reconcile PR #100 + backend #58."],
  ["PM", "Property Management / Lease Documents", 70, "TESTING", "ON MAIN / PR #77", "ON MAIN / PR #28", "NEEDS TEST", "Lease builder and E2E PM acceptance remain.", "Reconcile lease PRs + PM audit."],
  ["Revenue", "Affiliate Sales Program", 68, "TESTING", "ON MAIN", "ON MAIN", "NEEDS TEST", "Capped platform fees need commission allocation rules.", "Track gross fee, cap adjustment and affiliate share."],
  ["Platform", "Production Infrastructure", 58, "NEEDS VERIFY", "ON MAIN", "ON MAIN", "UNKNOWN", "Deployment/runtime must be independently verified.", "Verify Vercel + Render + migrations."],
];

const MONEY_RULES = [
  ["Platform fee", "Target 1% of recorded business transactions; monthly cap is configurable before launch."],
  ["Free subscription codes", "Waive the subscription only. Transaction/platform fees remain unless a specific promo explicitly waives them."],
  ["Offline payments", "Cash, external Cash App, Venmo and other off-platform settlements still create a recorded transaction and fee obligation."],
  ["Stripe / Cash App Pay", "Processor fee is separate from SyncWorks revenue; do not silently subsidize it from the 1%."],
  ["Affiliate commission", "Preserve the existing 10% of SyncWorks platform-fee revenue concept; calculate from fee actually earned after caps/credits/refunds, not gross business revenue."],
  ["Marketplace sourced", "Track source separately so we can test customer-paid, business-paid or split economics without losing attribution."],
];

const REVENUE = ["Subscriptions", "Platform transaction fees", "Marketplace fees", "Affiliate commerce", "Affiliate sales program", "Health / add-ons", "Payment revenue share"];

function tone(value) {
  if (/READY|PASSED|MERGED|ON MAIN|ACTIVE/.test(value)) return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  if (/BLOCKED|NOT READY|NOT BUILT/.test(value)) return "border-rose-400/25 bg-rose-400/10 text-rose-200";
  return "border-amber-400/25 bg-amber-400/10 text-amber-100";
}
function Badge({ children }) { return <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-[.08em] ${tone(String(children))}`}>{children}</span>; }
function Metric({ label, value, note }) { return <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3"><div className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">{label}</div><div className="mt-1 text-xl font-black text-white">{value}</div>{note ? <div className="mt-1 text-[11px] text-slate-500">{note}</div> : null}</div>; }

export default function GodModeDevelopmentCommandCenter() {
  const [filter, setFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const rows = useMemo(() => MODULES.map(([area,module,progress,state,frontend,backend,production,blocker,next]) => ({area,module,progress,state,frontend,backend,production,blocker,next})), []);
  const areas = ["ALL", ...new Set(rows.map((row) => row.area))];
  const filtered = rows.filter((row) => (filter === "ALL" || row.area === filter) && `${row.area} ${row.module} ${row.state} ${row.blocker}`.toLowerCase().includes(query.toLowerCase()));
  const readiness = Math.round(rows.reduce((sum,row) => sum + row.progress, 0) / rows.length);
  const notReady = rows.filter((row) => row.production === "NOT READY").length;

  return <section className="space-y-4">
    <div className="rounded-2xl border border-cyan-400/20 bg-slate-950/80 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><div className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-300">SyncWorks Operations</div><h2 className="mt-1 text-xl font-black text-white sm:text-2xl">Development + Revenue Command Center</h2><p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">Built is not complete. Launch credit requires merged, deployed and verified. Revenue rules include both processor and off-platform transactions.</p></div><div className="flex gap-2"><Badge>GOD MODE ONLY</Badge><Badge>PHASE 1</Badge></div></div>
      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5"><Metric label="Launch readiness" value={`${readiness}%`} note="Operating estimate"/><Metric label="Modules" value={rows.length}/><Metric label="Not ready" value={notReady}/><Metric label="Target take" value="1%" note="Platform transaction revenue"/><Metric label="Production" value="VERIFY" note="Never assumed"/></div>
    </div>

    <div className="grid gap-3 xl:grid-cols-[1.55fr_.85fr]">
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70"><div className="border-b border-slate-800 p-3"><div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><h3 className="text-sm font-black text-white">Master Module Matrix</h3><p className="text-[11px] text-slate-500">Current stage, production state, blocker and next build.</p></div><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search modules / blockers" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs md:w-64"/></div><div className="mt-2 flex gap-1 overflow-x-auto">{areas.map((area)=><button key={area} onClick={()=>setFilter(area)} className={`whitespace-nowrap rounded-md border px-2 py-1 text-[10px] font-bold ${filter===area?"border-cyan-400/40 bg-cyan-400/10 text-cyan-200":"border-slate-800 text-slate-500"}`}>{area}</button>)}</div></div><div className="overflow-x-auto"><table className="w-full min-w-[1060px] text-left text-[11px]"><thead className="bg-slate-900/80 text-[9px] uppercase tracking-[.1em] text-slate-500"><tr>{["Module","Stage","Progress","Frontend","Backend","Production","Blocker / gap","Next build"].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{filtered.map((row)=><tr key={row.module} className="border-t border-slate-900 align-top"><td className="p-3"><div className="text-[9px] font-bold uppercase text-cyan-500">{row.area}</div><div className="mt-1 font-bold text-slate-100">{row.module}</div></td><td className="p-3"><Badge>{row.state}</Badge></td><td className="p-3 font-black text-white">{row.progress}%</td><td className="p-3"><Badge>{row.frontend}</Badge></td><td className="p-3"><Badge>{row.backend}</Badge></td><td className="p-3"><Badge>{row.production}</Badge></td><td className="max-w-[230px] p-3 leading-4 text-slate-400">{row.blocker}</td><td className="max-w-[210px] p-3 leading-4 text-slate-300">{row.next}</td></tr>)}</tbody></table></div></div>

      <div className="space-y-3"><div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3"><h3 className="text-sm font-black text-white">Transaction Economics Gate</h3><div className="mt-2 space-y-2">{MONEY_RULES.map(([name,detail])=><div key={name} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3"><div className="text-xs font-bold text-cyan-100">{name}</div><div className="mt-1 text-[11px] leading-4 text-slate-500">{detail}</div></div>)}</div></div><div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3"><h3 className="text-sm font-black text-white">Revenue Lanes</h3><div className="mt-2 grid grid-cols-2 gap-2">{REVENUE.map((name)=><div key={name} className="rounded-lg border border-slate-800 p-2 text-[11px] font-bold text-slate-300">{name}</div>)}</div></div></div>
    </div>

    <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/5 p-4"><div className="text-[10px] font-black uppercase tracking-[.18em] text-fuchsia-300">Closure order</div><div className="mt-2 grid gap-2 text-xs text-slate-300 md:grid-cols-5"><div>1. God Mode truth layer</div><div>2. Transaction ledger + fee policy</div><div>3. Store + affiliate engine</div><div>4. Provider referral flow</div><div>5. Production/mobile QA</div></div></div>
  </section>;
}
