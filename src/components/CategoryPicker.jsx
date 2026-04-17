import React, { useMemo, useState } from "react";

function norm(s) {
  return String(s || "").toLowerCase().trim();
}

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function getParentMap(categories = []) {
  const byId = new Map();
  (categories || []).forEach((c) => byId.set(Number(c.id), c));
  return byId;
}

function getRootCategories(categories = []) {
  return (categories || []).filter((c) => !c?.parent_id);
}

function getGroupCategories(categories = []) {
  const byId = getParentMap(categories);
  return (categories || []).filter((c) => {
    if (!c?.parent_id) return false;
    const parent = byId.get(Number(c.parent_id));
    return !!parent && !parent.parent_id;
  });
}

function scoreGroup(cat, query, byId) {
  const q = norm(query);
  if (!q) return 0;

  const name = norm(cat?.name);
  const key = norm(cat?.key);
  const parent = byId.get(Number(cat?.parent_id));
  const rootName = norm(parent?.name || "");

  let score = 0;

  if (name === q) score += 120;
  if (name.startsWith(q)) score += 95;
  if (name.includes(q)) score += 75;

  if (rootName.includes(q)) score += 18;
  if (key.includes(q)) score += 10;

  const words = q.split(/\s+/).filter(Boolean);
  for (const word of words) {
    if (name.includes(word)) score += 15;
    if (rootName.includes(word)) score += 5;
  }

  return score;
}

export default function CategoryPicker({
  categories = [],
  value,
  onChange,
  label = "Services",
  multi = false,
  quickPicks = [],
  placeholder = "Type your business type or service...",
}) {
  const [q, setQ] = useState("");

  const byId = useMemo(() => getParentMap(categories), [categories]);
  const groups = useMemo(() => getGroupCategories(categories), [categories]);

  const selectedIds = useMemo(() => {
    if (multi) return new Set((Array.isArray(value) ? value : []).map((x) => String(x)));
    return new Set(value ? [String(value)] : []);
  }, [value, multi]);

  const selectedObjects = useMemo(() => {
    return Array.from(selectedIds)
      .map((id) => byId.get(Number(id)))
      .filter(Boolean);
  }, [selectedIds, byId]);

  const quickPickObjects = useMemo(() => {
    return (quickPicks || [])
      .map((id) => byId.get(Number(id)))
      .filter(Boolean)
      .slice(0, 10);
  }, [quickPicks, byId]);

  const results = useMemo(() => {
    const query = norm(q);
    if (!query) return [];

    return [...groups]
      .map((cat) => ({
        cat,
        score: scoreGroup(cat, query, byId),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return String(a.cat?.name || "").localeCompare(String(b.cat?.name || ""));
      })
      .slice(0, 10)
      .map((x) => x.cat);
  }, [groups, byId, q]);

  function handlePick(id) {
    const sid = String(id);

    if (!multi) {
      onChange?.(sid);
      return;
    }

    const next = new Set(selectedIds);
    if (next.has(sid)) next.delete(sid);
    else next.add(sid);
    onChange?.(Array.from(next));
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs text-slate-400 mb-1">{label}</div>
        <div className="text-[11px] text-slate-500">
          Type the kind of work you do. Pick broad service types, not every tiny task.
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
        <div className="flex gap-2">
          <input
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-500/40"
            placeholder={placeholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q ? (
            <button
              type="button"
              onClick={() => setQ("")}
              className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-300"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {multi ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
          <div className="text-xs text-slate-400">Selected service types</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedObjects.length ? (
              selectedObjects.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handlePick(cat.id)}
                  className="text-[11px] px-3 py-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/10 text-cyan-100"
                >
                  {cat.name} ✕
                </button>
              ))
            ) : (
              <div className="text-sm text-slate-500">No service types selected yet.</div>
            )}
          </div>
        </div>
      ) : null}

      {!q ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
          <div className="text-xs text-slate-400">Popular service types</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {quickPickObjects.map((cat) => {
              const active = selectedIds.has(String(cat.id));
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handlePick(cat.id)}
                  className={cx(
                    "text-[11px] px-3 py-1.5 rounded-full border transition",
                    active
                      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-100"
                      : "border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900"
                  )}
                >
                  {cat.name}
                </button>
              );
            })}

            {!quickPickObjects.length ? (
              <div className="text-sm text-slate-500">Start typing to see suggestions.</div>
            ) : null}
          </div>
        </div>
      ) : null}

      {q ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
          <div className="text-xs text-slate-400">Best matches</div>
          <div className="mt-2 grid gap-2">
            {results.map((cat) => {
              const active = selectedIds.has(String(cat.id));
              const root = byId.get(Number(cat.parent_id));

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handlePick(cat.id)}
                  className={cx(
                    "w-full text-left rounded-2xl border p-3 transition",
                    active
                      ? "bg-cyan-500/15 border-cyan-500/35"
                      : "bg-slate-950 border-slate-800 hover:bg-slate-900"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-100">{cat.name}</div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {root?.name || "Service Type"}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500">{active ? "Selected" : "Pick"}</div>
                  </div>
                </button>
              );
            })}

            {!results.length ? (
              <div className="text-sm text-slate-500 p-2">
                No close matches yet. Try a broader term like “pest”, “plumbing”, “roofing”, or “cleaning”.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}