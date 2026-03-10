// src/components/upgrade/ui/UpgradeField.jsx
import React from "react";

export default function UpgradeField({ label, children }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
      <div className="text-xs text-slate-500 mb-2">{label}</div>
      {children}
    </div>
  );
}