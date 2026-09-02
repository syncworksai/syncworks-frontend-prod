import React, { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { getGodModeStorefrontKpis } from "../../api/platformAffiliates";

function money(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed.toLocaleString("en-US", { style: "currency", currency: "USD" }) : "$0.00";
}

const MODULES = [
  ["PERSONAL_PROJECTS", "Personal projects", "Project and task-driven commerce"],
  ["HEALTH", "Health", "Health-driven partner revenue"],
  ["BUSINESS", "Business", "Technician + office supply commerce"],
  ["PROPERTY_MANAGEMENT", "Property Management", "Property + office supply commerce"],
  ["DIRECT_STOREFRONT", "Direct Storefront", "Browse/search-driven commerce"],
];

export default function StorefrontRevenueKpis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await getGodModeStorefrontKpis());
    } catch (err) {
      setError(err?.response?.data?.detail || "Storefront ledger is unavailable right now.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const rows = useMemo(() => {
    const byModule = data?.by_module || {};
    return [
      ["Affiliate clicks", String(data?.affiliate_clicks ?? 0), "Tracked merchant opens"],
      ["Reported conversions", String(data?.reported_conversions ?? 0), "Partner-reported purchases"],
      ["Commission earned", money(data?.commission_earned), "Non-reversed affiliate earnings"],
      ...MODULES.map(([key, label, detail]) => [label, money(byModule?.[key]?.commission), detail]),
    ];
  }, [data]);

  const merchants = Array.isArray(data?.merchants) ? data.merchants : [];
  const configured = merchants.filter((merchant) => merchant.configured).length;

  return <section className="rounded-[1.8rem] border border-emerald-400/15 bg-emerald-500/[.035] p-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><div className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-200">Commerce intelligence</div><h3 className="mt-1 text-xl font-black text-white">Storefront Revenue KPIs</h3><p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">Live attribution: module → need/project → product → merchant → tracked click → reported conversion → earning. GOD MODE reads the real commerce ledger and never invents revenue.</p></div>
      <div className="flex items-center gap-2"><span className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-wider ${error ? "border-rose-300/20 bg-rose-500/10 text-rose-100" : "border-emerald-300/20 bg-emerald-500/10 text-emerald-100"}`}>{error ? "Ledger unavailable" : loading ? "Loading ledger" : "Live ledger"}</span><button type="button" onClick={load} disabled={loading} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-slate-400 disabled:opacity-50" aria-label="Refresh Storefront KPIs"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /></button></div>
    </div>

    {error ? <div className="mt-3 rounded-xl border border-rose-300/20 bg-rose-500/10 p-3 text-[9px] font-bold text-rose-100">{error}</div> : null}

    <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">{rows.map(([label,value,detail]) => <div key={label} className="rounded-2xl border border-white/10 bg-black/15 p-3"><div className="text-[8px] font-black uppercase tracking-[.13em] text-slate-500">{label}</div><div className="mt-1 text-lg font-black text-white">{loading && !data ? "—" : value}</div><div className="mt-1 text-[8px] leading-4 text-slate-500">{detail}</div></div>)}</div>

    <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]"><div className="rounded-xl border border-cyan-300/15 bg-cyan-500/[.04] p-3 text-[9px] leading-4 text-slate-400">Gross referred sales: <span className="font-black text-white">{loading && !data ? "—" : money(data?.gross_sales_referred)}</span>. Revenue source dimensions include Personal Projects · Health · Business · Property Management · Events · Direct Storefront · SYNC recommendations.</div><div className="rounded-xl border border-white/10 bg-black/15 p-3 text-[9px] text-slate-400"><span className="font-black text-white">{configured}/{merchants.length}</span> merchants configured{merchants.length ? <div className="mt-1 text-[8px] text-slate-500">{merchants.map((merchant) => `${merchant.name}: ${merchant.configured ? "ready" : "pending"}`).join(" · ")}</div> : null}</div></div>
  </section>;
}
