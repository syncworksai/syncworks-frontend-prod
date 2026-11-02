// src/components/business/BusinessServiceAreasEditor.jsx
import React, { useState } from "react";

const US_STATES = [["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["FL","Florida"],["GA","Georgia"],["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],["IN","Indiana"],["IA","Iowa"],["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],["ME","Maine"],["MD","Maryland"],["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],["MO","Missouri"],["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],["NH","New Hampshire"],["NJ","New Jersey"],["NM","New Mexico"],["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],["OK","Oklahoma"],["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],["SD","South Dakota"],["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VT","Vermont"],["VA","Virginia"],["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"],["DC","District of Columbia"]];
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
  const [states, setStates] = useState([]);
  const [locationError, setLocationError] = useState("");

  function addArea() {
    const values = (type === "STATE" || type === "REGION") ? states :
      type === "NATIONWIDE"
        ? ["US"]
        : locations
            .split(/[\n,;]+/)
            .map((item) => item.trim())
            .filter(Boolean);

    if (type !== "NATIONWIDE" && !values.length) { setLocationError("Choose at least one location before adding this area."); return; }
    if (type === "ZIP" && values.some(v => !/^\\d{5}$/.test(v))) { setLocationError("Enter five-digit ZIP codes separated by commas."); return; }
    setLocationError("");

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
    setStates([]);
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
          Only the home ZIP and radius currently affect live marketplace matching. Additional states are planning coverage, not automatically active territories.
        </div>
      </div>

      <div className="rounded-3xl border border-fuchsia-500/25 bg-fuchsia-500/10 p-4">
        <div className="text-sm font-black text-fuchsia-100">Add expanded coverage</div>

        <div className="mt-3 rounded-xl border border-sky-400/25 bg-slate-950/60 p-3">
          <p className="mb-2 text-sm font-semibold text-slate-100">How should customers find you?</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {[["ZIP","ZIP codes"],["CITY","Specific cities"],["STATE","Entire state"]].map(([value,label]) =>
              <button key={value} type="button" onClick={()=>{setType(value);setLocationError("");setLocations("");setStates([]);}} aria-pressed={type===value} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold ${type===value?"border-sky-400 bg-sky-400/15 text-sky-100":"border-slate-700 text-slate-300"}`}>{label}</button>
            )}
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-300">Use your home ZIP and radius for live nearby matching. City and statewide coverage are saved as planned areas until geographic matching is enabled on the server.</p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alabama commercial projects" className="rounded-2xl border border-slate-800 bg-slate-950/75 px-3 py-3 text-sm" />
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-2xl border border-slate-800 bg-slate-950/75 px-3 py-3 text-sm">
            <option value="ZIP">Specific ZIP codes</option>
            <option value="CITY">Specific cities</option>
            <option value="COUNTY">County</option>
            <option value="STATE">Entire state</option>
            <option value="REGION">Multiple states</option>
            <option value="NATIONWIDE">Nationwide projects</option>
          </select>

          {(type === "STATE" || type === "REGION") ? (
            <fieldset className="md:col-span-2 rounded-2xl border border-sky-400/25 bg-slate-950/65 p-3">
              <legend className="px-1 text-sm font-semibold text-sky-100">Select covered states (not license verification)</legend>
              <div className="mt-2 grid max-h-48 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
                {US_STATES.map(([code,label]) => <label key={code} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 text-xs text-slate-200 hover:bg-sky-500/10"><input type="checkbox" checked={states.includes(code)} onChange={e=>setStates(prev=>e.target.checked?[...prev,code]:prev.filter(x=>x!==code))} className="accent-sky-400"/>{label}</label>)}
              </div>
              <p className="mt-2 text-xs text-slate-400">{states.length} selected. This records intended coverage only; it does not enable live multi-state matching.</p>
            </fieldset>
          ) : type !== "NATIONWIDE" ? (
            <textarea value={locations} onChange={(e) => setLocations(e.target.value)} rows={3} placeholder={type==="ZIP" ? "36104, 36106" : type==="CITY" ? "Montgomery, AL; Auburn, AL" : "Enter locations separated by commas"} className="rounded-2xl border border-slate-800 bg-slate-950/75 px-3 py-3 text-sm md:col-span-2" />
          ) : null}

          <select value={scope} onChange={(e) => setScope(e.target.value)} className="rounded-2xl border border-slate-800 bg-slate-950/75 px-3 py-3 text-sm">
            <option value="BOTH">Residential and commercial</option>
            <option value="RESIDENTIAL">Residential only</option>
            <option value="COMMERCIAL">Commercial only</option>
          </select>

          <input value={minimum} onChange={(e) => setMinimum(e.target.value)} type="number" min="0" placeholder="Minimum project value" className="rounded-2xl border border-slate-800 bg-slate-950/75 px-3 py-3 text-sm" />

          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes" className="rounded-2xl border border-slate-800 bg-slate-950/75 px-3 py-3 text-sm md:col-span-2" />
        </div>

        {locationError ? <p role="alert" className="mt-3 text-sm text-amber-200">{locationError}</p> : null}
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
