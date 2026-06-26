// src/components/business/BusinessServiceAreasEditor.jsx
import React, { useState } from "react";

export function normalizeServiceAreas(value) {
  return Array.isArray(value) ? value : [];
}

export default function BusinessServiceAreasEditor({
  serviceAreas,
  setServiceAreas,
  baseZip,
  radius,
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState("ZIP");
  const [locations, setLocations] = useState("");
  const [scope, setScope] = useState("BOTH");
  const [minimum, setMinimum] = useState("");
  const [notes, setNotes] = useState("");

  function addArea() {
    const values =
      type === "NATIONWIDE"
        ? ["US"]
        : locations
            .split(/[\n,;]+/)
            .map((item) => item.trim())
            .filter(Boolean);

    if (type !== "NATIONWIDE" && !values.length) return;

    const area = {
      id: `area-${Date.now()}`,
      name: name.trim() || (type === "NATIONWIDE" ? "Nationwide projects" : `${type} coverage`),
      area_type: type,
      values,
      project_scope: scope,
      minimum_project_amount: minimum,
      notes: notes.trim(),
      active: true,
    };

    setServiceAreas((current) => [...(current || []), area]);
    setName("");
    setType("ZIP");
    setLocations("");
    setScope("BOTH");
    setMinimum("");
    setNotes("");
  }

  function removeArea(id) {
    setServiceAreas((current) => (current || []).filter((area) => area.id !== id));
  }

  function toggleArea(id) {
    setServiceAreas((current) =>
      (current || []).map((area) =>
        area.id === id ? { ...area, active: area.active === false } : area
      )
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-cyan-500/25 bg-cyan-500/10 p-4">
        <div className="text-sm font-black text-cyan-100">Current live coverage</div>
        <div className="mt-1 text-xs text-slate-300">
          {baseZip || "No ZIP"} • {radius || "0"} miles
        </div>
        <div className="mt-2 text-[11px] leading-5 text-slate-500">
          Build 3A stores expanded areas. The marketplace continues using the current ZIP-radius matcher until Build 3B.
        </div>
      </div>

      <div className="rounded-3xl border border-fuchsia-500/25 bg-fuchsia-500/10 p-4">
        <div className="text-sm font-black text-fuchsia-100">Add expanded coverage</div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alabama commercial projects" className="rounded-2xl border border-slate-800 bg-slate-950/75 px-3 py-3 text-sm" />
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-2xl border border-slate-800 bg-slate-950/75 px-3 py-3 text-sm">
            <option value="ZIP">Specific ZIP codes</option>
            <option value="CITY">City / metro</option>
            <option value="COUNTY">County</option>
            <option value="STATE">Entire state</option>
            <option value="REGION">Multi-state region</option>
            <option value="NATIONWIDE">Nationwide projects</option>
          </select>

          {type !== "NATIONWIDE" ? (
            <textarea value={locations} onChange={(e) => setLocations(e.target.value)} rows={3} placeholder="AL, FL, LA, NC or 36104, 36106" className="rounded-2xl border border-slate-800 bg-slate-950/75 px-3 py-3 text-sm md:col-span-2" />
          ) : null}

          <select value={scope} onChange={(e) => setScope(e.target.value)} className="rounded-2xl border border-slate-800 bg-slate-950/75 px-3 py-3 text-sm">
            <option value="BOTH">Residential and commercial</option>
            <option value="RESIDENTIAL">Residential only</option>
            <option value="COMMERCIAL">Commercial only</option>
          </select>

          <input value={minimum} onChange={(e) => setMinimum(e.target.value)} type="number" min="0" placeholder="Minimum project value" className="rounded-2xl border border-slate-800 bg-slate-950/75 px-3 py-3 text-sm" />

          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes" className="rounded-2xl border border-slate-800 bg-slate-950/75 px-3 py-3 text-sm md:col-span-2" />
        </div>

        <button type="button" onClick={addArea} className="mt-4 rounded-2xl bg-fuchsia-500 px-5 py-3 text-sm font-black text-white">
          Add Service Area
        </button>
      </div>

      {(serviceAreas || []).map((area) => (
        <div key={area.id} className="rounded-3xl border border-slate-800 bg-slate-950/55 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-black text-white">{area.name}</div>
              <div className="mt-1 text-xs text-slate-400">
                {area.area_type} • {(area.values || []).join(", ")}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {area.project_scope}
                {area.minimum_project_amount ? ` • Minimum $${Number(area.minimum_project_amount).toLocaleString()}` : ""}
                {area.active === false ? " • Inactive" : ""}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => toggleArea(area.id)} className="rounded-xl border border-slate-700 px-3 py-2 text-xs">
                {area.active === false ? "Enable" : "Disable"}
              </button>
              <button type="button" onClick={() => removeArea(area.id)} className="rounded-xl border border-rose-500/30 px-3 py-2 text-xs text-rose-200">
                Remove
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
