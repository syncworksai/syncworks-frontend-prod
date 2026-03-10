// src/components/upgrade/ui/UpgradeInfo.jsx
import React from "react";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

/**
 * A small info/notice block used inside the Upgrade flow.
 *
 * Usage:
 * <UpgradeInfo tone="cyan" title="Card on file ✅">...</UpgradeInfo>
 */
export default function UpgradeInfo({
  title,
  children,
  tone = "slate", // slate | cyan | indigo | emerald | rose | amber
  className = "",
}) {
  const tones = {
    slate: "border-slate-800 bg-slate-950/45 text-slate-200",
    cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-100",
    indigo: "border-indigo-500/30 bg-indigo-500/10 text-indigo-100",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-100",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-100",
  };

  return (
    <div
      className={cx(
        "rounded-2xl border p-4 shadow-[0_0_30px_rgba(0,0,0,0.25)]",
        tones[tone] || tones.slate,
        className
      )}
    >
      {title ? <div className="font-semibold text-sm">{title}</div> : null}
      {children ? <div className={cx("text-sm", title ? "mt-2" : "")}>{children}</div> : null}
    </div>
  );
}