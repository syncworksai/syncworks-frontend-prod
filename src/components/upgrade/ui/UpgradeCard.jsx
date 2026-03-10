// src/components/upgrade/ui/UpgradeCard.jsx
import React from "react";

export default function UpgradeCard({ title, subtitle, badge, children }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{title}</div>
          {subtitle ? <div className="text-xs text-slate-400 mt-1">{subtitle}</div> : null}
        </div>
        {badge ? (
          <div className="text-[11px] px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-200">
            {badge}
          </div>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}