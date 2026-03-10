// src/components/upgrade/categories/SelectedTray.jsx
import React from "react";

export default function SelectedTray({ ids, map, onRemove }) {
  const list = Array.isArray(ids) ? ids : [];
  if (!list.length) {
    return (
      <div className="text-xs text-slate-500">
        Selected services: <span className="text-slate-300">none yet</span> — pick a few ✅✅✅
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-400">Selected services ({list.length})</div>
        <div className="text-[11px] text-slate-500">click ❌ to remove</div>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {list.slice(0, 30).map((id) => {
          const o = map?.[id];
          const label = o?.name ? o.name : `Service #${id}`;
          return (
            <div
              key={id}
              className="flex items-center gap-2 px-3 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-xs"
            >
              <span>✅</span>
              <span className="text-slate-100">{label}</span>
              <button
                type="button"
                className="text-slate-300 hover:text-white"
                onClick={() => onRemove(id)}
                title="Remove"
              >
                ❌
              </button>
            </div>
          );
        })}
        {list.length > 30 ? <div className="text-xs text-slate-500 px-2 py-2">+{list.length - 30} more…</div> : null}
      </div>
    </div>
  );
}