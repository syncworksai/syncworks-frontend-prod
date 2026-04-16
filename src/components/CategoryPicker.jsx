import React, { useMemo, useState } from "react";

function norm(s) {
  return String(s || "").toLowerCase().trim();
}

function getParentMap(categories = []) {
  const byId = new Map();
  (categories || []).forEach((c) => byId.set(Number(c.id), c));
  return byId;
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

function getLeafCategories(categories = []) {
  const list = Array.isArray(categories) ? categories : [];
  const parentIds = new Set(list.map((x) => Number(x?.parent_id)).filter(Boolean));
  return list.filter((x) => !parentIds.has(Number(x.id)));
}

function getGroupName(cat, byId) {
  if (!cat) return "";
  if (!cat.parent_id) return cat.name || "";
  const parent = byId.get(Number(cat.parent_id));
  if (!parent) return "";
  if (!parent.parent_id) return parent.name || "";
  return parent.name || "";
}

function getRootName(cat, byId) {
  if (!cat) return "";
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
  const path = norm(buildPath(cat, byId));
  const group = norm(getGroupName(cat, byId));
  const root = norm(getRootName(cat, byId));

  let score = 0;

  if (name === q) score += 120;
  if (name.startsWith(q)) score += 80;
  if (name.includes(q)) score += 55;

  if (group.includes(q)) score += 30;
  if (root.includes(q)) score += 18;
  if (path.includes(q)) score += 16;
  if (key.includes(q)) score += 10;

  const words = q.split(/\s+/).filter(Boolean);
  for (const w of words) {
    if (name.includes(w)) score += 14;
    if (group.includes(w)) score += 8;
    if (root.includes(w)) score += 4;
  }

  return score;
}

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function CategoryPicker({
  categories = [],
  value,
  onChange,
  label = "Category",
  multi = false,
  maxVisible = 16,
}) {
  const [q, setQ] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [activeGroup, setActiveGroup] = useState("");

  const byId = useMemo(() => getParentMap(categories), [categories]);
  const leafs = useMemo(() => getLeafCategories(categories), [categories]);

  const groupOptions = useMemo(() => {
    const groups = new Map();
    leafs.forEach((cat) => {
      const groupName = getGroupName(cat, byId);
      if (!groupName) return;
      groups.set(groupName, (groups.get(groupName) || 0) + 1);
    });

    return Array.from(groups.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [leafs, byId]);

  const selectedIds = useMemo(() => {
    if (multi) return new Set((Array.isArray(value) ? value : []).map((x) => String(x)));
    return new Set(value ? [String(value)] : []);
  }, [value, multi]);

  const scoredList = useMemo(() => {
    const query = norm(q);

    let filtered = [...leafs];

    if (activeGroup) {
      filtered = filtered.filter((c) => getGroupName(c, byId) === activeGroup);
    }

    if (query) {
      filtered = filtered
        .map((c) => ({
          cat: c,
          score: scoreCategory(c, query, byId),
        }))
        .filter((x) => x.score > 0)
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return String(a.cat?.name || "").localeCompare(String(b.cat?.name || ""));
        })
        .map((x) => x.cat);
    } else {
      filtered = filtered.sort((a, b) => {
        const ag = getGroupName(a, byId);
        const bg = getGroupName(b, byId);
        if (ag !== bg) return ag.localeCompare(bg);
        return String(a?.name || "").localeCompare(String(b?.name || ""));
      });
    }

    if (!showAll && filtered.length > maxVisible) return filtered.slice(0, maxVisible);
    return filtered;
  }, [leafs, byId, q, activeGroup, showAll, maxVisible]);

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

  const selectedObjects = useMemo(() => {
    return Array.from(selectedIds)
      .map((id) => byId.get(Number(id)))
      .filter(Boolean);
  }, [selectedIds, byId]);

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-2 flex-wrap">
        <div>
          <div className="text-xs text-slate-400 mb-1">{label}</div>
          <div className="text-[11px] text-slate-500">
            Search first, then pick the closest exact service.
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            className="w-80 max-w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
            placeholder="Search services (plumbing, dog grooming, website update...)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
          >
            {showAll ? "Show fewer" : "Show more"}
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveGroup("")}
          className={cx(
            "text-[11px] px-3 py-1.5 rounded-full border",
            !activeGroup
              ? "border-cyan-500/35 bg-cyan-500/10 text-cyan-200"
              : "border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900"
          )}
        >
          All groups
        </button>

        {groupOptions.slice(0, 18).map((g) => (
          <button
            key={g.name}
            type="button"
            onClick={() => setActiveGroup(g.name)}
            className={cx(
              "text-[11px] px-3 py-1.5 rounded-full border",
              activeGroup === g.name
                ? "border-cyan-500/35 bg-cyan-500/10 text-cyan-200"
                : "border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900"
            )}
          >
            {g.name}
          </button>
        ))}
      </div>

      {multi ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
          <div className="text-xs text-slate-400">Selected</div>
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

      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
        <div className="grid gap-2">
          {scoredList.map((c) => {
            const id = String(c.id);
            const active = selectedIds.has(id);
            const path = buildPath(c, byId);
            const groupName = getGroupName(c, byId);

            return (
              <button
                key={id}
                type="button"
                onClick={() => handlePick(id)}
                className={cx(
                  "w-full text-left rounded-2xl border p-4 transition",
                  active
                    ? "bg-cyan-500/15 border-cyan-500/35"
                    : "bg-slate-950 border-slate-800 hover:bg-slate-900"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-100">{c.name || "Category"}</div>
                    <div className="text-xs text-slate-400 mt-1">{path || c.key || "Service"}</div>
                    {groupName ? (
                      <div className="mt-2 text-[11px] text-slate-500">Group: {groupName}</div>
                    ) : null}
                  </div>

                  <div className="shrink-0">
                    {active ? (
                      <div className="text-[11px] px-2 py-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-200">
                        Selected
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500">Pick</div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {!scoredList.length ? (
            <div className="text-sm text-slate-500 p-4">
              No services match. Try a broader term like “plumbing”, “training”, “cleaning”, or “website”.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}