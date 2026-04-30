import React from "react";

function KpiCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-2xl font-extrabold mt-1 text-slate-100">{value ?? "—"}</div>
      {hint ? <div className="text-[11px] text-slate-500 mt-1">{hint}</div> : null}
    </div>
  );
}

export default function GrowthKpiGrid({ kpis }) {
  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <KpiCard label="Leads captured" value={kpis.leadsCaptured} />
      <KpiCard label="Conversations active" value={kpis.conversationsActive} />
      <KpiCard label="Campaigns live" value={kpis.campaignsLive} />
      <KpiCard label="Activation events" value={kpis.activationEvents} />
      <KpiCard label="Conversion" value={kpis.conversionPlaceholder} hint="Placeholder until conversion model ships" />
      <KpiCard label="Growth score" value={kpis.growthScore} />
    </div>
  );
}