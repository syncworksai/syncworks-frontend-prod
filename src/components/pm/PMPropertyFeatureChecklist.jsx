import React from "react";

const GROUPS = [
  {
    key: "appliances",
    title: "Appliances & equipment",
    options: ["Refrigerator", "Range / oven", "Dishwasher", "Microwave", "Garbage disposal", "Washer", "Dryer", "Washer / dryer hookups", "Freezer"],
  },
  {
    key: "property_features",
    title: "Property features & amenities",
    options: ["Central HVAC", "Window / wall A/C", "Ceiling fans", "Fireplace", "Garage", "Carport", "Off-street parking", "Fenced yard", "Storage", "Lawn care included", "Pest control included"],
  },
  {
    key: "safety_access",
    title: "Safety & access",
    options: ["Smoke detectors", "Carbon monoxide detectors", "Fire extinguisher", "Deadbolt", "Smart lock", "Lockbox", "Alarm / security system", "Exterior lighting"],
  },
  {
    key: "furnished_areas",
    title: "Furnished areas",
    options: ["Living room", "Dining area", "Primary bedroom", "Additional bedroom(s)", "Kitchen / cookware", "Patio / outdoor furniture", "TV / electronics"],
  },
];

const UTILITIES = ["Electric", "Gas", "Water", "Sewer / septic", "Trash", "Internet / cable"];
const RESPONSIBILITIES = ["TENANT", "OWNER_PM", "HOUSING_AUTHORITY", "INCLUDED", "NA"];
const responsibilityLabel = {
  TENANT: "Tenant",
  OWNER_PM: "Owner / PM",
  HOUSING_AUTHORITY: "Housing",
  INCLUDED: "Included",
  NA: "N/A",
};

function normalize(data) {
  const source = data && typeof data === "object" ? data : {};
  return {
    ...source,
    appliances: Array.isArray(source.appliances) ? source.appliances : [],
    property_features: Array.isArray(source.property_features) ? source.property_features : [],
    safety_access: Array.isArray(source.safety_access) ? source.safety_access : [],
    furnished_areas: Array.isArray(source.furnished_areas) ? source.furnished_areas : [],
    utility_responsibility: source.utility_responsibility && typeof source.utility_responsibility === "object" ? source.utility_responsibility : {},
  };
}

export default function PMPropertyFeatureChecklist({ value, onChange, showFurnished = true }) {
  const data = normalize(value);

  function toggle(group, option) {
    const current = data[group] || [];
    const next = current.includes(option) ? current.filter((item) => item !== option) : [...current, option];
    onChange?.({ ...data, [group]: next });
  }

  function setResponsibility(utility, responsibility) {
    onChange?.({
      ...data,
      utility_responsibility: { ...data.utility_responsibility, [utility]: responsibility },
    });
  }

  return <div className="space-y-5">
    <div className="rounded-3xl border border-cyan-500/15 bg-black/20 p-4">
      <div className="mb-3"><h3 className="font-black text-white">Utilities — who is responsible?</h3><p className="mt-1 text-xs text-slate-500">Choose once here so the same answer can flow into leases, MHA/Section 8 paperwork, and move-in documents.</p></div>
      <div className="space-y-3">{UTILITIES.map((utility) => <div key={utility} className="rounded-2xl border border-slate-800 bg-[#050d18] p-3"><div className="mb-2 text-sm font-bold text-slate-200">{utility}</div><div className="flex flex-wrap gap-2">{RESPONSIBILITIES.map((responsibility) => {
        const selected = data.utility_responsibility?.[utility] === responsibility;
        return <button key={responsibility} type="button" onClick={() => setResponsibility(utility, responsibility)} className={`rounded-xl border px-3 py-2 text-xs font-black transition ${selected ? "border-cyan-300 bg-cyan-400 text-slate-950" : "border-slate-700 bg-black/25 text-slate-300 hover:border-cyan-400/40"}`}>{responsibilityLabel[responsibility]}</button>;
      })}</div></div>)}</div>
    </div>

    {GROUPS.filter((group) => showFurnished || group.key !== "furnished_areas").map((group) => <div key={group.key} className="rounded-3xl border border-cyan-500/15 bg-black/20 p-4"><div className="mb-3"><h3 className="font-black text-white">{group.title}</h3><p className="mt-1 text-xs text-slate-500">Check everything that applies. You can add exact brand/model/condition later in Inventory.</p></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{group.options.map((option) => {
      const checked = data[group.key]?.includes(option);
      return <button key={option} type="button" onClick={() => toggle(group.key, option)} className={`flex min-h-11 items-center gap-3 rounded-2xl border px-3 py-2 text-left text-sm transition ${checked ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100" : "border-slate-700 bg-[#050d18] text-slate-300 hover:border-cyan-400/35"}`}><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border text-xs font-black ${checked ? "border-emerald-300 bg-emerald-400 text-slate-950" : "border-slate-600"}`}>{checked ? "✓" : ""}</span><span>{option}</span></button>;
    })}</div></div>)}
  </div>;
}
