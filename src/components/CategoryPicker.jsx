// src/components/CategoryPicker.jsx
import React, { useMemo, useState } from "react";

function norm(s) {
  return String(s || "").toLowerCase().trim();
}

export default function CategoryPicker({ categories = [], value, onChange, label = "Category" }) {
  const [q, setQ] = useState("");
  const [showAll, setShowAll] = useState(false);

  const list = useMemo(() => {
    const query = norm(q);

    let filtered = (categories || []).filter((c) => {
      if (!query) return true;
      const hay = [c.name, c.key, c.path, c.root_key, c.category_path].map(norm).join(" ");
      return hay.includes(query);
    });

    // Keep it “slides” sized unless expanded
    if (!showAll && filtered.length > 18) filtered = filtered.slice(0, 18);
    return filtered;
  }, [categories, q, showAll]);

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-2 flex-wrap">
        <div>
          <div className="text-xs text-slate-400 mb-1">{label}</div>
          <div className="text-[11px] text-slate-500">Search + pick a category (faster than dropdown).</div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            className="w-72 max-w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
            placeholder="Search categories (plumbing, electrical, lawn...)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
          >
            {showAll ? "Show fewer" : "Show all"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {list.map((c) => {
            const id = String(c.id);
            const active = String(value) === id;

            return (
              <button
                key={id}
                type="button"
                onClick={() => onChange?.(id)}
                className={
                  "min-w-[220px] text-left rounded-2xl border p-4 transition " +
                  (active
                    ? "bg-cyan-500/15 border-cyan-500/35"
                    : "bg-slate-950 border-slate-800 hover:bg-slate-900")
                }
              >
                <div className="text-sm font-semibold">{c.name || c.label || "Category"}</div>
                <div className="text-xs text-slate-400 mt-1">{c.path || c.category_path || c.key || "Service"}</div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500">ID: {id}</div>
                  {active ? (
                    <div className="text-[11px] px-2 py-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-200">
                      Selected
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500">Pick</div>
                  )}
                </div>
              </button>
            );
          })}

          {!list.length ? <div className="text-sm text-slate-500 p-4">No categories match.</div> : null}
        </div>

        {/* Tiny fallback dropdown (optional) */}
        <div className="mt-3 grid md:grid-cols-2 gap-2">
          <select
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
            value={value || ""}
            onChange={(e) => onChange?.(e.target.value)}
          >
            <option value="" disabled>
              Select category…
            </option>
            {(categories || []).map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name || c.label || `Category ${c.id}`}
              </option>
            ))}
          </select>

          <div className="text-xs text-slate-500 flex items-center">
            Use search + slides. Dropdown is just a fallback.
          </div>
        </div>
      </div>
    </div>
  );
}
