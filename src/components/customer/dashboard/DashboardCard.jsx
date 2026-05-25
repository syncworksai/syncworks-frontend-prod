import React from "react";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function DashboardCard({ title, right, children, className = "" }) {
  return (
    <div
      className={cx(
        "rounded-3xl border border-slate-800/80 bg-slate-950/35 backdrop-blur-xl p-5 shadow-[0_0_60px_rgba(0,0,0,0.35)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="font-semibold text-slate-100">{title}</div>
        {right ? <div>{right}</div> : null}
      </div>
      {children}
    </div>
  );
}