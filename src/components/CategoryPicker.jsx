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

function getLeafCategories(categories = []) {
  const list = Array.isArray(categories) ? categories : [];
  const parentIds = new Set(list.map((x) => Number(x?.parent_id)).filter(Boolean));
  return list.filter((x) => !parentIds.has(Number(x.id)));
}

function buildPath(cat, byId) {
  if (!cat) return "";
  const parts = [];
  let cur = cat;
  let guard = 0;

  while (cur && guard < 20) {
    parts.unshift(cur.name);
    cur = cur.parent_id ? byId.get(Number(cur.parent_id)) : null;
    guard += 1;
  }

  return parts.join(" → ");
}

function getGroupName(cat, byId) {
  if (!cat) return "";
  const parent = cat.parent_id ? byId.get(Number(cat.parent_id)) : null;
  return parent?.name || "";
}

function getRootName(cat, byId) {
  let cur = cat;
  let guard = 0;
  while (cur?.parent_id && guard < 20) {
    cur = byId.get(Number(cur.parent_id));
    guard += 1;
  }
  return cur?.name || "";
}

function scoreCategory(cat, query, byId) {
  const q = norm(query);
  if (!q) return 0;

  const name = norm(cat?.name);
  const key = norm(cat?.key);
  const group = norm(getGroupName(cat, byId));
  const root = norm(getRootName(cat, byId));
  const path = norm(buildPath(cat, byId));

  let score = 0;

  if (name === q) score += 120;
  if (name.startsWith(q)) score += 95;
  if (name.includes(q)) score += 65;

  if (group.startsWith(q)) score += 32;
  if (group.includes(q)) score += 22;
  if (root.includes(q)) score += 10;
  if (path.includes(q)) score += 8;
  if (key.includes(q)) score += 6;

  const words = q.split(/\s+/).filter(Boolean);
  for (const word of words) {
    if (name.includes(word)) score += 18;
    if (group.includes(word)) score += 7;
  }

  return score;
}

export default function CategoryPicker({
  categories = [],
  value,
  onChange,
  label = "Category",
  multi = false,
  quickPicks = [],
  placeholder = "Type your business type or service...",
}) {
  const [q, setQ] = useState("");

  const byId = useMemo(() => getParentMap(categories), [categories]);
  const leafs = useMemo(() => getLeafCategories(categories), [categories]);

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

    return [...leafs]
      .map((cat) => ({
        cat,
        score: scoreCategory(cat, query, byId),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return String(a.cat?.name || "").localeCompare(String(b.cat?.name || ""));
      })
      .slice(0, 10)
      .map((x) => x.cat);
  }, [leafs, byId, q]);

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
          Type what the business does. We’ll suggest the closest matching services.
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
          <div className="text-xs text-slate-400">Selected services</div>
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
              <div className="text-sm text-slate-500">No services selected yet.</div>
            )}
          </div>
        </div>
      ) : null}

      {!q ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
          <div className="text-xs text-slate-400">Popular suggestions</div>
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
                        {getGroupName(cat, byId) || buildPath(cat, byId)}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500">{active ? "Selected" : "Pick"}</div>
                  </div>
                </button>
              );
            })}

            {!results.length ? (
              <div className="text-sm text-slate-500 p-2">
                No close matches yet. Try a broader word like “plumbing”, “cleaning”, “training”, or “website”.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}