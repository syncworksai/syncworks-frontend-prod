import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/client";

/**
 * Google-Sheets-ish grid:
 * - inline edit cells
 * - autosave (debounced)
 * - sticky header
 *
 * Requires endpoints:
 *   GET  /api/v1/sales/prospects/?pipeline=<id>
 *   PATCH /api/v1/sales/prospects/<id>/
 *   GET  /api/v1/sales/stages/?pipeline=<id>
 */
export default function ProspectsSheet({ pipelineId }) {
  const [loading, setLoading] = useState(true);
  const [prospects, setProspects] = useState([]);
  const [stages, setStages] = useState([]);
  const [savingMap, setSavingMap] = useState({}); // { [id]: true }
  const saveTimers = useRef({}); // { [id_field]: timeoutId }

  const stageById = useMemo(() => {
    const m = new Map();
    stages.forEach((s) => m.set(String(s.id), s));
    return m;
  }, [stages]);

  async function load() {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        api.get(`/sales/prospects/`, { params: { pipeline: pipelineId } }),
        api.get(`/sales/stages/`, { params: { pipeline: pipelineId } }),
      ]);
      setProspects(pRes.data?.results || []);
      setStages(sRes.data?.results || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!pipelineId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineId]);

  function setCell(id, field, value) {
    setProspects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );

    // Debounced PATCH per (id, field)
    const key = `${id}_${field}`;
    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);

    saveTimers.current[key] = setTimeout(async () => {
      setSavingMap((m) => ({ ...m, [id]: true }));
      try {
        await api.patch(`/sales/prospects/${id}/`, { [field]: value });
      } catch (e) {
        // optional: show toast
        // revert? (keeping simple for now)
        console.error("Failed to save cell", id, field, e);
      } finally {
        setSavingMap((m) => ({ ...m, [id]: false }));
      }
    }, 450);
  }

  const columns = [
    { key: "name", label: "Name", width: 220, type: "text" },
    { key: "company", label: "Company", width: 220, type: "text" },
    { key: "email", label: "Email", width: 240, type: "text" },
    { key: "phone", label: "Phone", width: 160, type: "text" },
    { key: "value", label: "Value", width: 120, type: "number" },
    { key: "status", label: "Status", width: 120, type: "select", options: [
      { value: "OPEN", label: "Open" },
      { value: "WON", label: "Won" },
      { value: "LOST", label: "Lost" },
    ]},
    { key: "stage", label: "Stage", width: 200, type: "stage" },
    { key: "notes", label: "Notes", width: 360, type: "text" },
  ];

  if (!pipelineId) {
    return (
      <div className="text-white/70">
        Select a pipeline first.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="text-white font-semibold">Prospects</div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 text-white text-sm hover:bg-white/15"
            onClick={load}
            type="button"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-auto max-h-[70vh]">
        <table className="min-w-[1200px] w-full text-sm">
          <thead className="sticky top-0 z-10 bg-[#0b1020]">
            <tr className="border-b border-white/10">
              <th className="px-3 py-2 text-left text-white/70 w-[60px]">#</th>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className="px-3 py-2 text-left text-white/70"
                  style={{ minWidth: c.width }}
                >
                  {c.label}
                </th>
              ))}
              <th className="px-3 py-2 text-left text-white/70 w-[90px]">Save</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-6 text-white/60" colSpan={columns.length + 2}>
                  Loading…
                </td>
              </tr>
            ) : prospects.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-white/60" colSpan={columns.length + 2}>
                  No prospects yet.
                </td>
              </tr>
            ) : (
              prospects.map((p, idx) => (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-3 py-2 text-white/40">{idx + 1}</td>

                  {columns.map((c) => (
                    <td key={c.key} className="px-2 py-1">
                      <Cell
                        prospect={p}
                        col={c}
                        stages={stages}
                        stageById={stageById}
                        onChange={(val) => setCell(p.id, c.key, val)}
                      />
                    </td>
                  ))}

                  <td className="px-3 py-2">
                    {savingMap[p.id] ? (
                      <span className="text-xs text-white/60">Saving…</span>
                    ) : (
                      <span className="text-xs text-white/30">Saved</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 text-xs text-white/40 border-t border-white/10">
        Tip: click a cell, edit, tab/enter to move — autosaves in the background.
      </div>
    </div>
  );
}

function Cell({ prospect, col, stages, stageById, onChange }) {
  const value = prospect[col.key] ?? "";

  const base =
    "w-full bg-transparent outline-none rounded-md px-2 py-1 border border-transparent " +
    "focus:border-white/20 focus:bg-white/5 text-white/90 placeholder:text-white/20";

  if (col.type === "select") {
    return (
      <select
        className={base}
        value={value || "OPEN"}
        onChange={(e) => onChange(e.target.value)}
      >
        {col.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  if (col.type === "stage") {
    const current = stageById.get(String(value));
    return (
      <select
        className={base}
        value={value || ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">—</option>
        {stages.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      className={base}
      value={value}
      onChange={(e) => {
        const v = col.type === "number" ? e.target.value : e.target.value;
        onChange(col.type === "number" ? (v === "" ? "0" : v) : v);
      }}
      placeholder=""
      inputMode={col.type === "number" ? "decimal" : undefined}
    />
  );
}