// src/components/upgrade/categories/SelectedList.jsx
import React from "react";

export default function SelectedList({ ids, map }) {
  const list = Array.isArray(ids) ? ids : [];
  if (!list.length) return <div className="text-xs text-slate-500">No services selected.</div>;

  return (
    <div className="grid sm:grid-cols-2 gap-2">
      {list.map((id) => {
        const o = map?.[id];
        return (
          <div key={id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
            <div className="text-sm font-semibold">✅ {o?.name || `Service #${id}`}</div>
            <div className="text-[11px] text-slate-500">{o?.key || "—"}</div>
          </div>
        );
      })}
    </div>
  );
}