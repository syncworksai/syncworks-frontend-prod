import React, { useMemo, useState } from "react";

function norm(s) {
  return String(s || "").toLowerCase().trim();
}

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function keyDepth(key) {
  const k = String(key || "");
  if (!k) return 0;
  return k.split("--").length - 1;
}

function humanizeSlugPart(s) {
  return String(s || "")
    .split("-")
    .filter(Boolean)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}

function getById(categories = []) {
  const m = new Map();
  (categories || []).forEach((c) => m.set(Number(c.id), c));
  return m;
}

function uniqueById(list = []) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const id = Number(item?.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }
  return out;
}

function getBroadCategories(categories = []) {
  const all = Array.isArray(categories) ? categories : [];
  const byId = getById(all);

  const byKeyDepth = all.filter((c) => keyDepth(c?.key) === 1);
  if (byKeyDepth.length) return uniqueById(byKeyDepth);

  const byParentShape = all.filter((c) => {
    if (!c?.parent_id) return false;
    const parent = byId.get(Number(c.parent_id));
    return parent && !parent.parent_id;
  });
  if (byParentShape.length) return uniqueById(byParentShape);

  return [];
}

function getBroadParent(category, byId) {
  if (!category) return null;

  const depth = keyDepth(category?.key);

  if (depth === 1) return category;

  if (depth === 2) {
    const parent = byId.get(Number(category.parent_id));
    if (parent) return parent;

    const key = String(category.key || "");
    const broadKey = key.split("--").slice(0, 2).join("--");
    return Array.from(byId.values()).find((x) => String(x?.key || "") === broadKey) || null;
  }

  if (depth === 0) return category;

  return null;
}

function scoreAnyCategory(cat, query, byId) {
  const q = norm(query);
  if (!q) return 0;

  const name = norm(cat?.name);
  const key = norm(cat?.key);
  const parent = byId.get(Number(cat?.parent_id));
  const parentName = norm(parent?.name || "");

  let score = 0;

  if (name === q) score += 120;
  if (name.startsWith(q)) score += 95;
  if (name.includes(q)) score += 75;
  if (parentName.includes(q)) score += 18;
  if (key.includes(q)) score += 12;

  const words = q.split(/\s+/).filter(Boolean);
  for (const word of words) {
    if (name.includes(word)) score += 14;
    if (parentName.includes(word)) score += 6;
    if (key.includes(word)) score += 4;
  }

  return score;
}

function scoreBroadCategory(cat, query) {
  const q = norm(query);
  if (!q) return 0;

  const name = norm(cat?.name);
  const key = norm(cat?.key);

  let score = 0;
  if (name === q) score += 120;
  if (name.startsWith(q)) score += 100;
  if (name.includes(q)) score += 80;
  if (key.includes(q)) score += 10;

  const words = q.split(/\s+/).filter(Boolean);
  for (const word of words) {
    if (name.includes(word)) score += 15;
    if (key.includes(word)) score += 4;
  }

  return score;
}

function highlightText(text, query) {
  const t = String(text || "");
  const q = String(query || "").trim();
  if (!q) return t;

  const lowerT = t.toLowerCase();
  const lowerQ = q.toLowerCase();
  const idx = lowerT.indexOf(lowerQ);

  if (idx === -1) return t;

  const before = t.slice(0, idx);
  const match = t.slice(idx, idx + q.length);
  const after = t.slice(idx + q.length);

  return (
    <>
      {before}
      <span className="text-cyan-200">{match}</span>
      {after}
    </>
  );
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

  const allCategories = useMemo(() => (Array.isArray(categories) ? categories : []), [categories]);
  const byId = useMemo(() => getById(allCategories), [allCategories]);

  const broadCategories = useMemo(() => getBroadCategories(allCategories), [allCategories]);

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

    const directBroad = broadCategories
      .map((cat) => ({
        cat,
        score: scoreBroadCategory(cat, query),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return String(a.cat?.name || "").localeCompare(String(b.cat?.name || ""));
      })
      .map((x) => x.cat);

    if (directBroad.length) return directBroad.slice(0, 8);

    const promoted = allCategories
      .map((cat) => ({
        cat,
        score: scoreAnyCategory(cat, query, byId),
      }))
      .filter((x) => x.score > 0)
      .map((x) => getBroadParent(x.cat, byId))
      .filter(Boolean);

    return uniqueById(promoted).slice(0, 8);
  }, [allCategories, broadCategories, byId, q]);

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
        <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/5 p-3">
          <div className="text-xs text-cyan-200">Best matches</div>
          <div className="mt-3 grid gap-2">
            {results.map((cat) => {
              const active = selectedIds.has(String(cat.id));

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handlePick(cat.id)}
                  className={cx(
                    "w-full text-left rounded-2xl border p-4 transition",
                    active
                      ? "bg-cyan-500/15 border-cyan-500/40 shadow-[0_0_20px_rgba(34,211,238,0.12)]"
                      : "bg-slate-950 border-slate-700 hover:bg-slate-900 hover:border-cyan-500/25"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-base font-semibold text-slate-100">
                        {highlightText(cat.name, q)}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Broad service type
                      </div>
                    </div>

                    <div
                      className={cx(
                        "text-[11px] px-2 py-1 rounded-lg border",
                        active
                          ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
                          : "border-slate-700 bg-slate-900 text-slate-400"
                      )}
                    >
                      {active ? "Selected" : "Pick"}
                    </div>
                  </div>
                </button>
              );
            })}

            {!results.length ? (
              <div className="text-sm text-slate-400 p-2">
                No close matches yet. Try a broader term like “pest”, “plumbing”, “roofing”, or “cleaning”.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="text-[11px] text-slate-600">
        Loaded categories: {allCategories.length} · Broad service types: {broadCategories.length}
      </div>
    </div>
  );
}