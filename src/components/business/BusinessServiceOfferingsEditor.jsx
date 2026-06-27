// src/components/business/BusinessServiceOfferingsEditor.jsx
import React, { useMemo, useState } from "react";

const list = (v) => Array.isArray(v) ? v : Array.isArray(v?.results) ? v.results : [];
const idOf = (c) => {
  const n = Number(c?.id ?? c?.pk ?? c?.value);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const parentOf = (c) => {
  const raw = c?.parent_id ?? c?.parent ?? c?.parentId;
  return raw && typeof raw === "object" ? idOf(raw) : Number(raw) || null;
};
const nameOf = (c) => String(c?.name || c?.label || c?.title || "Service").trim();
const keyOf = (c) => String(c?.key || c?.slug || c?.name || "").toLowerCase();
const cx = (...v) => v.filter(Boolean).join(" ");

function iconFor(value) {
  const t = String(value || "").toLowerCase();
  if (t.includes("plumb")) return "🚰";
  if (t.includes("electric")) return "⚡";
  if (t.includes("tree")) return "🌳";
  if (t.includes("lawn") || t.includes("landscap")) return "🌿";
  if (t.includes("roof")) return "🏠";
  if (t.includes("auto") || t.includes("mechanic")) return "🚗";
  if (t.includes("clean")) return "🧽";
  if (t.includes("hvac") || t.includes("air")) return "❄️";
  return "🛠️";
}

function makeGroups(categories) {
  const active = list(categories).filter((c) => c?.is_active !== false);
  const byId = new Map(active.map((c) => [idOf(c), c]).filter(([id]) => id));
  const children = new Map();

  active.forEach((c) => {
    const id = idOf(c);
    const pid = parentOf(c);
    if (id && pid) children.set(pid, [...(children.get(pid) || []), c]);
  });

  function leaves(id, seen = new Set()) {
    if (!id || seen.has(id)) return [];
    seen.add(id);
    const direct = children.get(id) || [];
    if (!direct.length) return byId.get(id) ? [byId.get(id)] : [];
    return direct.flatMap((c) => leaves(idOf(c), seen));
  }

  let groups = active.filter((c) => idOf(c) && (children.get(idOf(c)) || []).length);
  const roots = groups.filter((c) => !parentOf(c));
  if (roots.length) groups = roots;

  return groups
    .map((g) => ({
      id: idOf(g),
      name: nameOf(g),
      key: keyOf(g),
      leaves: leaves(idOf(g)).filter((c) => idOf(c) !== idOf(g)).sort((a, b) => nameOf(a).localeCompare(nameOf(b))),
    }))
    .filter((g) => g.id && g.leaves.length)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export default function BusinessServiceOfferingsEditor({
  categories,
  selectedServiceIds,
  setSelectedServiceIds,
  detailedServicesEnabled,
  setDetailedServicesEnabled,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(() => new Set());
  const groups = useMemo(() => makeGroups(categories), [categories]);
  const selected = useMemo(
    () => new Set((selectedServiceIds || []).map(Number).filter(Boolean)),
    [selectedServiceIds]
  );

  const leafIds = useMemo(() => {
    const out = new Set();
    groups.forEach((g) => g.leaves.forEach((leaf) => out.add(idOf(leaf))));
    return out;
  }, [groups]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        leaves: g.leaves.filter((leaf) =>
          `${g.name} ${nameOf(leaf)} ${keyOf(leaf)}`.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.name.toLowerCase().includes(q) || g.leaves.length);
  }, [groups, query]);

  function convertLegacy(extraToggleId = null) {
    const next = new Set();
    groups.forEach((g) => {
      if (selected.has(g.id)) g.leaves.forEach((leaf) => next.add(idOf(leaf)));
    });
    [...selected].forEach((id) => {
      if (leafIds.has(id)) next.add(id);
    });
    if (extraToggleId) {
      if (next.has(extraToggleId)) next.delete(extraToggleId);
      else next.add(extraToggleId);
    }
    setSelectedServiceIds([...next].filter(Boolean));
    setDetailedServicesEnabled(true);
    setOpen(new Set(groups.map((g) => g.id)));
  }

  function toggleLeaf(id) {
    if (!detailedServicesEnabled) {
      convertLegacy(id);
      return;
    }
    setSelectedServiceIds((current) => {
      const next = new Set((current || []).map(Number).filter(Boolean));
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return [...next];
    });
  }

  function toggleGroup(group) {
    if (!detailedServicesEnabled) {
      convertLegacy();
      return;
    }
    const ids = group.leaves.map(idOf).filter(Boolean);
    const all = ids.length && ids.every((id) => selected.has(id));
    setSelectedServiceIds((current) => {
      const next = new Set((current || []).map(Number).filter(Boolean));
      ids.forEach((id) => all ? next.delete(id) : next.add(id));
      return [...next];
    });
  }

  function toggleOpen(id) {
    setOpen((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className={cx(
        "rounded-3xl border p-4",
        detailedServicesEnabled
          ? "border-emerald-500/30 bg-emerald-500/10"
          : "border-amber-500/30 bg-amber-500/10"
      )}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-black text-white">
              {detailedServicesEnabled ? "Exact service matching is active" : "Broad service matching is active"}
            </div>
            <div className="mt-1 max-w-3xl text-xs leading-5 text-slate-300">
              {detailedServicesEnabled
                ? "Only checked services can match marketplace tickets."
                : "Existing broad groups still include every service beneath them until you customize the list."}
            </div>
          </div>
          {!detailedServicesEnabled ? (
            <button type="button" onClick={() => convertLegacy()} className="rounded-2xl bg-amber-400 px-4 py-2 text-xs font-black text-black">
              Customize Exact Services
            </button>
          ) : (
            <span className="rounded-full border border-emerald-400/30 px-3 py-1 text-[11px] font-black text-emerald-100">
              {selected.size} enabled
            </span>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search water heaters, leaking pipes, drain cleaning..."
          className="h-11 w-full bg-transparent px-3 text-sm text-slate-100 outline-none placeholder:text-slate-600"
        />
      </div>

      <div className="space-y-3">
        {visible.map((group) => {
          const ids = group.leaves.map(idOf).filter(Boolean);
          const count = ids.filter((id) => selected.has(id)).length;
          const legacy = !detailedServicesEnabled && selected.has(group.id);
          const all = detailedServicesEnabled && ids.length > 0 && count === ids.length;
          const expanded = open.has(group.id) || query.trim();

          return (
            <section key={group.id} className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/55">
              <div className="flex flex-wrap items-center gap-3 p-4">
                <button type="button" onClick={() => toggleOpen(group.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span className="text-2xl">{iconFor(`${group.key} ${group.name}`)}</span>
                  <span>
                    <span className="block text-sm font-black text-white">{group.name}</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {detailedServicesEnabled
                        ? `${count} of ${ids.length} services enabled`
                        : legacy ? `All ${ids.length} sub-services included` : `${ids.length} sub-services`}
                    </span>
                  </span>
                </button>
                <button type="button" onClick={() => toggleGroup(group)} className="rounded-2xl border border-fuchsia-400/30 px-3 py-2 text-xs font-black text-fuchsia-100">
                  {all || legacy ? "Clear Group" : "Select All"}
                </button>
                <button type="button" onClick={() => toggleOpen(group.id)} className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-300">
                  {expanded ? "Hide" : "Choose Services"}
                </button>
              </div>

              {expanded ? (
                <div className="grid gap-2 border-t border-slate-800 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.leaves.map((leaf) => {
                    const id = idOf(leaf);
                    const active = detailedServicesEnabled ? selected.has(id) : legacy;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleLeaf(id)}
                        className={cx(
                          "flex min-h-12 items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left",
                          active
                            ? "border-emerald-400/40 bg-emerald-500/12 text-emerald-50"
                            : "border-slate-800 bg-slate-950/75 text-slate-300"
                        )}
                      >
                        <span className="text-sm font-semibold">{nameOf(leaf)}</span>
                        <span className={cx(
                          "rounded-full border px-2 py-1 text-[10px] font-black",
                          active ? "border-emerald-300 bg-emerald-400 text-black" : "border-slate-700 text-slate-500"
                        )}>
                          {active ? "YES" : "NO"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
