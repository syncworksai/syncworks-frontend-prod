import React from "react";

export default function MetricCard({ title, value, subtitle, right }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-slate-400 text-xs uppercase tracking-wider">{title}</div>
          <div className="text-2xl font-bold mt-1">{value}</div>
          {subtitle ? <div className="text-xs text-slate-500 mt-1">{subtitle}</div> : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
    </div>
  );
}
