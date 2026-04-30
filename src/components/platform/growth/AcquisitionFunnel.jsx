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

export default function AcquisitionFunnel({ funnel }) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-5 gap-2">
      <KpiCard label="Captured" value={funnel.captured} />
      <KpiCard label="Qualified" value={funnel.qualified} />
      <KpiCard label="Activated" value={funnel.activated} />
      <KpiCard label="Paying" value={funnel.paying} />
      <KpiCard label="Referred" value={funnel.referred} />
    </div>
  );
}