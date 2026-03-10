// src/components/upgrade/categories/SearchResults.jsx
import React from "react";

export default function SearchResults({ items, selected, onToggle, disabled, onDrill, setSelectedLeafObjects }) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return <div className="text-xs text-slate-500">No search results.</div>;

  const sorted = [...list].sort((a, b) => {
    const al = a?.is_leaf ? 0 : 1;
    const bl = b?.is_leaf ? 0 : 1;
    if (al !== bl) return al - bl;
    return String(a?.name || "").localeCompare(String(b?.name || ""));
  });

  return (
    <div className="grid sm:grid-cols-2 gap-2">
      {sorted.slice(0, 40).map((x) => {
        const leaf = !!x.is_leaf;
        const checked = selected.includes(x.id);

        if (!leaf) {
          return (
            <button
              key={x.id}
              type="button"
              disabled={disabled}
              onClick={() => onDrill(x)}
              className="text-left rounded-2xl px-3 py-3 border border-slate-800 bg-slate-950 hover:bg-slate-900"
              title="Parent category — click to drill down"
            >
              <div className="text-sm font-semibold">📁 {x.name}</div>
              <div className="text-[11px] text-slate-500">{x.key}</div>
              <div className="text-[11px] text-slate-500 mt-1">Drill down</div>
            </button>
          );
        }

        return (
          <button
            key={x.id}
            type="button"
            disabled={disabled}
            onClick={() => {
              setSelectedLeafObjects?.((prev) => ({ ...prev, [x.id]: x }));
              onToggle(x.id, x);
            }}
            className={
              "text-left rounded-2xl px-3 py-3 border transition " +
              (checked
                ? "bg-cyan-500/15 border-cyan-500/40"
                : "bg-slate-950 border-slate-800 hover:bg-slate-900")
            }
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">✅ {x.name}</div>
                <div className="text-[11px] text-slate-500">{x.key}</div>
              </div>
              <div className="text-xs">{checked ? "Selected" : "Tap"}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}