// src/components/upgrade/categories/GridCards.jsx
import React from "react";

export default function GridCards({ items, loading, onPick, selectedId, disabled, emojiMap }) {
  const list = Array.isArray(items) ? items : [];
  if (loading) return <div className="text-xs text-slate-500">Loading…</div>;
  if (!list.length) return <div className="text-xs text-slate-500">No items.</div>;

  return (
    <div className="grid sm:grid-cols-2 gap-2">
      {list.map((x) => {
        const active = x.id === selectedId;
        const emoji = emojiMap?.[x.name] || (x.parent_id ? "🧩" : "🧱");
        return (
          <button
            key={x.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick(x)}
            className={
              "text-left rounded-2xl px-3 py-3 border transition " +
              (active
                ? "bg-indigo-500/15 border-indigo-500/40"
                : "bg-slate-950 border-slate-800 hover:bg-slate-900")
            }
            title={x.key}
          >
            <div className="flex items-center gap-2">
              <div className="text-lg">{emoji}</div>
              <div>
                <div className="text-sm font-semibold">{x.name}</div>
                <div className="text-[11px] text-slate-500">{x.key}</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}