// src/components/business/BusinessServiceOfferingsEditor.jsx
import React, { useMemo, useState } from "react";

const cx = (...parts) => parts.filter(Boolean).join(" ");
const list = (value) =>
  Array.isArray(value)
    ? value
    : Array.isArray(value?.results)
      ? value.results
      : Array.isArray(value?.value)
        ? value.value
        : [];

function idOf(category) {
  const value = Number(category?.id ?? category?.pk ?? category?.value);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function nameOf(category) {
  return String(category?.name || category?.label || category?.title || category?.key || "Service").trim();
}

function keyOf(category) {
  return String(category?.key || category?.slug || category?.code || category?.name || "")
    .trim()
    .toLowerCase();
}

function parentOf(category) {
  const raw =
    category?.parent_id ??
    category?.parent ??
    category?.parentId ??
    category?.parent_category_id ??
    category?.parent_category ??
    category?.parentCategory ??
    null;
  return raw && typeof raw === "object" ? idOf(raw) : Number(raw) || null;
}

function flattenCategories(value) {
  const output = [];
  const seen = new Set();

  function visit(category, inheritedParentId = null) {
    if (!category || typeof category !== "object") return;
    const id = idOf(category);
    const normalized = inheritedParentId && !parentOf(category)
      ? { ...category, parent_id: inheritedParentId }
      : category;

    if (!id || !seen.has(id)) {
      if (id) seen.add(id);
      output.push(normalized);
    }

    const children = [
      ...list(category.children),
      ...list(category.subcategories),
      ...list(category.sub_categories),
      ...list(category.items),
    ];
    children.forEach((child) => visit(child, id || inheritedParentId));
  }

  list(value).forEach((category) => visit(category));
  return output;
}

function buildGroups(categories) {
  const active = flattenCategories(categories).filter(
    (category) => category?.is_active !== false && category?.active !== false
  );
  const byId = new Map(active.map((category) => [idOf(category), category]).filter(([id]) => id));
  const childrenByParent = new Map();

  active.forEach((category) => {
    const id = idOf(category);
    const parentId = parentOf(category);
    if (!id || !parentId) return;
    childrenByParent.set(parentId, [...(childrenByParent.get(parentId) || []), category]);
  });

  function leavesFor(id, seen = new Set()) {
    if (!id || seen.has(id)) return [];
    const nextSeen = new Set(seen);
    nextSeen.add(id);
    const children = childrenByParent.get(id) || [];
    if (!children.length) return byId.get(id) ? [byId.get(id)] : [];
    return children.flatMap((child) => leavesFor(idOf(child), nextSeen));
  }

  let groupRows = active.filter((category) => {
    const id = idOf(category);
    return id && (childrenByParent.get(id) || []).length;
  });
  const roots = groupRows.filter((category) => !parentOf(category));
  if (roots.length) groupRows = roots;

  const groups = groupRows
    .map((group) => ({
      id: idOf(group),
      name: nameOf(group),
      key: keyOf(group),
      services: leavesFor(idOf(group))
        .filter((service) => idOf(service) !== idOf(group))
        .sort((a, b) => nameOf(a).localeCompare(nameOf(b))),
    }))
    .filter((group) => group.id && group.services.length)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (groups.length) return groups;

  const standalone = active.filter((category) => idOf(category)).sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  return standalone.length
    ? [{ id: "available-services", name: "Available Services", key: "services", services: standalone }]
    : [];
}

function findExistingSaveButton() {
  return Array.from(document.querySelectorAll("button")).find((button) => {
    const text = String(button.textContent || "").trim().toLowerCase();
    return text === "save" || text === "save settings" || text === "save & continue";
  });
}

export default function BusinessServiceOfferingsEditor({
  categories,
  selectedServiceIds,
  setSelectedServiceIds,
  detailedServicesEnabled,
  setDetailedServicesEnabled,
}) {
  const [query, setQuery] = useState("");
  const [openGroups, setOpenGroups] = useState(() => new Set());
  const groups = useMemo(() => buildGroups(categories), [categories]);
  const selected = useMemo(
    () => new Set((selectedServiceIds || []).map(Number).filter(Boolean)),
    [selectedServiceIds]
  );

  const visibleGroups = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return groups;
    return groups
      .map((group) => ({
        ...group,
        services: group.services.filter((service) =>
          `${group.name} ${nameOf(service)} ${keyOf(service)}`.toLowerCase().includes(search)
        ),
      }))
      .filter((group) => group.name.toLowerCase().includes(search) || group.services.length);
  }, [groups, query]);

  function enableExactMode() {
    const next = new Set(selected);
    groups.forEach((group) => {
      if (selected.has(Number(group.id))) {
        group.services.forEach((service) => next.add(idOf(service)));
        next.delete(Number(group.id));
      }
    });
    setSelectedServiceIds([...next].filter(Boolean));
    setDetailedServicesEnabled(true);
    setOpenGroups(new Set(groups.map((group) => group.id)));
  }

  function toggleService(id) {
    if (!detailedServicesEnabled) enableExactMode();
    setSelectedServiceIds((current) => {
      const next = new Set((current || []).map(Number).filter(Boolean));
      next.has(id) ? next.delete(id) : next.add(id);
      return [...next];
    });
  }

  function toggleGroup(group) {
    if (!detailedServicesEnabled) {
      enableExactMode();
      return;
    }
    const ids = group.services.map(idOf).filter(Boolean);
    const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
    setSelectedServiceIds((current) => {
      const next = new Set((current || []).map(Number).filter(Boolean));
      ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return [...next];
    });
  }

  function toggleOpen(id) {
    setOpenGroups((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function saveChanges() {
    const button = findExistingSaveButton();
    if (button && !button.disabled) button.click();
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
              {detailedServicesEnabled ? "Exact service matching is active" : "Choose what kind of business you operate"}
            </div>
            <div className="mt-1 max-w-3xl text-xs leading-5 text-slate-300">
              Select a broad category, then choose the exact services this business accepts.
            </div>
          </div>
          {!detailedServicesEnabled ? (
            <button type="button" onClick={enableExactMode} className="rounded-2xl bg-amber-400 px-4 py-2 text-xs font-black text-black">
              Choose Services
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
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search plumbing, technology, cleaning, roofing..."
          className="h-11 w-full bg-transparent px-3 text-sm text-slate-100 outline-none placeholder:text-slate-600"
        />
      </div>

      {groups.length === 0 ? (
        <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          No service categories were returned by the API. The backend service taxonomy needs to be checked.
        </div>
      ) : visibleGroups.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-950/55 p-4 text-sm text-slate-300">
          <div className="font-bold text-white">No services match “{query.trim()}”.</div>
          <button type="button" onClick={() => setQuery("")} className="mt-3 rounded-2xl border border-cyan-400/35 bg-cyan-500/10 px-4 py-2 text-xs font-black text-cyan-100">
            Show All Services
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleGroups.map((group) => {
            const ids = group.services.map(idOf).filter(Boolean);
            const selectedCount = ids.filter((id) => selected.has(id)).length;
            const expanded = openGroups.has(group.id) || Boolean(query.trim());
            const allSelected = detailedServicesEnabled && ids.length > 0 && selectedCount === ids.length;

            return (
              <section key={group.id} className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/55">
                <div className="flex flex-wrap items-center gap-3 p-4">
                  <button type="button" onClick={() => toggleOpen(group.id)} className="min-w-0 flex-1 text-left">
                    <span className="block text-sm font-black text-white">{group.name}</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {selectedCount} of {ids.length} services selected
                    </span>
                  </button>
                  <button type="button" onClick={() => toggleGroup(group)} className="rounded-2xl border border-fuchsia-400/30 px-3 py-2 text-xs font-black text-fuchsia-100">
                    {allSelected ? "Clear Group" : "Select All"}
                  </button>
                  <button type="button" onClick={() => toggleOpen(group.id)} className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-300">
                    {expanded ? "Hide" : "Choose Services"}
                  </button>
                </div>

                {expanded ? (
                  <div className="grid gap-2 border-t border-slate-800 p-4 sm:grid-cols-2 lg:grid-cols-3">
                    {group.services.map((service) => {
                      const id = idOf(service);
                      const active = selected.has(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleService(id)}
                          className={cx(
                            "flex min-h-12 items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left",
                            active
                              ? "border-emerald-400/40 bg-emerald-500/12 text-emerald-50"
                              : "border-slate-800 bg-slate-950/75 text-slate-300"
                          )}
                        >
                          <span className="text-sm font-semibold">{nameOf(service)}</span>
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
      )}

      <div className="sticky bottom-3 z-20 rounded-3xl border border-cyan-400/25 bg-[#020617]/95 p-3 shadow-[0_-14px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl">
        <button
          type="button"
          onClick={saveChanges}
          className="min-h-12 w-full rounded-2xl bg-cyan-400 px-4 text-sm font-black text-slate-950"
        >
          Save Service Changes
        </button>
        <div className="mt-2 text-center text-[11px] text-slate-500">
          Selected services are saved to this Business profile.
        </div>
      </div>
    </div>
  );
}
