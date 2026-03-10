import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Google-Sheets-ish grid for prospects.
 * - Sticky header
 * - Keyboard friendly
 * - Inline edits (calls onPatchProspect)
 * - Fast filters (agent/status/search)
 *
 * Props:
 *  prospects: array
 *  stages: array
 *  members: array
 *  onOpenProspect(id)
 *  onPatchProspect(id, patchObj)
 */
export default function ProspectSheetGrid({
  prospects = [],
  stages = [],
  members = [],
  onOpenProspect,
  onPatchProspect,
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [agent, setAgent] = useState("ALL");

  // Inline edit state (optimistic)
  const [editing, setEditing] = useState({}); // { [prospectId]: {field: value} }
  const commitTimersRef = useRef({}); // debounce per cell

  const stageMap = useMemo(() => {
    const m = new Map();
    stages.forEach((s) => m.set(String(s.id), s));
    return m;
  }, [stages]);

  const memberMap = useMemo(() => {
    const m = new Map();
    members.forEach((mm) => m.set(String(mm.id), mm));
    return m;
  }, [members]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return prospects.filter((p) => {
      if (status !== "ALL" && p.status !== status) return false;
      if (agent !== "ALL") {
        // owner might be null
        if (String(p.owner || "") !== String(agent)) return false;
      }
      if (!q) return true;
      const hay = [
        p.name,
        p.company,
        p.email,
        p.phone,
        p.notes,
        String(p.value ?? ""),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [prospects, search, status, agent]);

  const sortedStages = useMemo(() => {
    return [...stages].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [stages]);

  function setCell(prospectId, field, value) {
    setEditing((prev) => ({
      ...prev,
      [prospectId]: { ...(prev[prospectId] || {}), [field]: value },
    }));

    // Debounce commit per cell (small, feels like Sheets)
    const key = `${prospectId}:${field}`;
    if (commitTimersRef.current[key]) clearTimeout(commitTimersRef.current[key]);

    commitTimersRef.current[key] = setTimeout(async () => {
      try {
        await onPatchProspect?.(prospectId, { [field]: value });
      } catch (e) {
        // If patch fails, you can add toast later
        console.error("Patch failed", e);
      }
    }, 450);
  }

  function getValue(p, field) {
    const local = editing?.[p.id]?.[field];
    return local !== undefined ? local : p[field];
  }

  return (
    <div className="w-full">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center justify-between mb-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <span className="opacity-70">Agent:</span>
            <select
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-slate-100"
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
            >
              <option value="ALL">All agents</option>
              {members.map((m) => (
                <option key={m.id} value={String(m.user || m.id)}>
                  {m.display_name || m.email || `Member ${m.id}`}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-300">
            <span className="opacity-70">Status:</span>
            <select
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-slate-100"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="WON">WON</option>
              <option value="LOST">LOST</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-300">
            <span className="opacity-70">Search:</span>
            <input
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 w-[280px] text-slate-100 placeholder:text-slate-500"
              placeholder="Name, email, phone, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200"
            onClick={() => {
              setSearch("");
              setStatus("ALL");
              setAgent("ALL");
            }}
          >
            Clear
          </button>
        </div>

        <div className="text-sm text-slate-300 opacity-80">
          Showing: <span className="text-slate-100">{filtered.length}</span> prospects
        </div>
      </div>

      {/* Grid */}
      <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
        <div className="overflow-auto max-h-[70vh]">
          <table className="min-w-[1200px] w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-10">
              <tr className="bg-black/70 backdrop-blur border-b border-white/10">
                {[
                  "Name",
                  "Company",
                  "Stage",
                  "Status",
                  "Value",
                  "Email",
                  "Phone",
                  "Owner",
                  "Updated",
                  "Attachments",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left text-xs uppercase tracking-wider text-slate-300 px-3 py-3 border-b border-white/10"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filtered.map((p, idx) => {
                const rowBg =
                  idx % 2 === 0 ? "bg-white/[0.02]" : "bg-white/[0.04]";
                const updated = p.updated_at
                  ? new Date(p.updated_at).toLocaleString()
                  : "";

                return (
                  <tr
                    key={p.id}
                    className={`${rowBg} hover:bg-white/[0.07] transition cursor-default`}
                    onDoubleClick={() => onOpenProspect?.(p.id)}
                  >
                    {/* Name (click to open) */}
                    <td className="px-3 py-2 border-b border-white/5">
                      <button
                        className="text-slate-100 hover:underline text-left"
                        onClick={() => onOpenProspect?.(p.id)}
                      >
                        {getValue(p, "name") || "(no name)"}
                      </button>
                      {p.id ? (
                        <div className="text-[11px] text-slate-400">
                          #{p.id}
                        </div>
                      ) : null}
                    </td>

                    {/* Company */}
                    <td className="px-3 py-2 border-b border-white/5">
                      <input
                        className="w-full bg-transparent text-slate-100 outline-none border border-transparent focus:border-white/15 rounded-lg px-2 py-1"
                        value={getValue(p, "company") || ""}
                        onChange={(e) => setCell(p.id, "company", e.target.value)}
                      />
                    </td>

                    {/* Stage */}
                    <td className="px-3 py-2 border-b border-white/5">
                      <select
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-slate-100"
                        value={String(getValue(p, "stage") || "")}
                        onChange={(e) => setCell(p.id, "stage", Number(e.target.value))}
                      >
                        <option value="">(none)</option>
                        {sortedStages.map((s) => (
                          <option key={s.id} value={String(s.id)}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2 border-b border-white/5">
                      <select
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-slate-100"
                        value={getValue(p, "status") || "OPEN"}
                        onChange={(e) => setCell(p.id, "status", e.target.value)}
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="WON">WON</option>
                        <option value="LOST">LOST</option>
                      </select>
                    </td>

                    {/* Value */}
                    <td className="px-3 py-2 border-b border-white/5">
                      <input
                        className="w-full bg-transparent text-slate-100 outline-none border border-transparent focus:border-white/15 rounded-lg px-2 py-1"
                        value={String(getValue(p, "value") ?? "")}
                        onChange={(e) => setCell(p.id, "value", e.target.value)}
                        inputMode="decimal"
                      />
                    </td>

                    {/* Email */}
                    <td className="px-3 py-2 border-b border-white/5">
                      <input
                        className="w-full bg-transparent text-slate-100 outline-none border border-transparent focus:border-white/15 rounded-lg px-2 py-1"
                        value={getValue(p, "email") || ""}
                        onChange={(e) => setCell(p.id, "email", e.target.value)}
                      />
                    </td>

                    {/* Phone */}
                    <td className="px-3 py-2 border-b border-white/5">
                      <input
                        className="w-full bg-transparent text-slate-100 outline-none border border-transparent focus:border-white/15 rounded-lg px-2 py-1"
                        value={getValue(p, "phone") || ""}
                        onChange={(e) => setCell(p.id, "phone", e.target.value)}
                      />
                    </td>

                    {/* Owner */}
                    <td className="px-3 py-2 border-b border-white/5">
                      <input
                        className="w-full bg-transparent text-slate-100 outline-none border border-transparent focus:border-white/15 rounded-lg px-2 py-1"
                        value={
                          (p.owner && memberMap.get(String(p.owner))?.display_name) ||
                          ""
                        }
                        readOnly
                      />
                      <div className="text-[11px] text-slate-500">
                        {p.owner ? `User ${p.owner}` : "—"}
                      </div>
                    </td>

                    {/* Updated */}
                    <td className="px-3 py-2 border-b border-white/5 text-xs text-slate-400">
                      {updated}
                    </td>

                    {/* Attachments */}
                    <td className="px-3 py-2 border-b border-white/5 text-xs text-slate-300">
                      {p.attachments_count ?? 0}
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    No prospects found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 text-xs text-slate-400 border-t border-white/10 bg-black/30">
          Tip: <span className="text-slate-300">Double-click</span> a row to open the prospect.
        </div>
      </div>
    </div>
  );
}