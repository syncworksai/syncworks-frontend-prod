import React from "react";

const rows = [
  ["Affiliate clicks", "—", "Tracked merchant opens"],
  ["Reported conversions", "—", "Partner-reported purchases"],
  ["Commission earned", "$—", "Approved + pending affiliate earnings"],
  ["Personal projects", "$—", "Project and task-driven commerce"],
  ["Health", "$—", "Health-driven partner revenue"],
  ["Business", "$—", "Technician + office supply commerce"],
  ["Property Management", "$—", "Property + office supply commerce"],
  ["Direct Storefront", "$—", "Browse/search-driven commerce"],
];

export default function StorefrontRevenueKpis() {
  return <section className="rounded-[1.8rem] border border-emerald-400/15 bg-emerald-500/[.035] p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-200">Commerce intelligence</div><h3 className="mt-1 text-xl font-black text-white">Storefront Revenue KPIs</h3><p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">Universal attribution target: module → need/project → product → merchant → affiliate campaign → click → reported conversion → earning. Values remain blank until the commerce ledger is connected; GOD MODE must never invent affiliate revenue.</p></div><span className="rounded-full border border-amber-300/20 bg-amber-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-amber-100">Ledger connection next</span></div><div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">{rows.map(([label,value,detail]) => <div key={label} className="rounded-2xl border border-white/10 bg-black/15 p-3"><div className="text-[8px] font-black uppercase tracking-[.13em] text-slate-500">{label}</div><div className="mt-1 text-lg font-black text-white">{value}</div><div className="mt-1 text-[8px] leading-4 text-slate-500">{detail}</div></div>)}</div><div className="mt-3 rounded-xl border border-cyan-300/15 bg-cyan-500/[.04] p-3 text-[9px] leading-4 text-slate-400">Revenue source dimensions: Personal Projects · Health · Business · Property Management · Events · Direct Storefront · SYNC recommendations. Partner checkout stays external; SyncWorks measures attributable commerce when the partner makes that data available.</div></section>;
}
