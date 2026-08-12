import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/client";
import PMHeader from "../components/pm/PMHeader";
import PMPropertyFeatureChecklist from "../components/pm/PMPropertyFeatureChecklist";

const PROPERTY_TYPES = [
  ["HOME", "Single-family home"],
  ["MULTIFAMILY", "Multifamily"],
  ["APARTMENT", "Apartment building"],
  ["CONDO", "Condominium"],
  ["TOWNHOME", "Townhome"],
  ["COMMERCIAL", "Commercial"],
  ["OTHER", "Other"],
];

function Field({ label, required, hint, children }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-300">{label}{required ? <span className="text-cyan-300"> *</span> : null}</span>{children}{hint ? <span className="mt-1.5 block text-[11px] leading-4 text-slate-500">{hint}</span> : null}</label>;
}

const controlClass = "min-h-12 w-full rounded-2xl border border-slate-700 bg-black/35 px-4 py-3 text-base text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/20";
const emptyProfile = {
  bedrooms: "",
  bathrooms: "",
  square_feet: "",
  year_built: "",
  furnished: false,
  utility_electric: "",
  utility_gas: "",
  utility_water: "",
  utility_trash: "",
  sewer_septic: "",
  hvac_details: "",
  roof_details: "",
  water_heater_details: "",
  access_details: "",
  insurance_details: "",
  warranty_notes: "",
  parking_details: "",
  safety_details: "",
  general_notes: "",
  custom_data: {},
};

function normalizeError(error) {
  const data = error?.response?.data;
  if (typeof data === "string") return data;
  if (data?.detail) return String(data.detail);
  if (data && typeof data === "object") return Object.entries(data).map(([key, value]) => `${key.replaceAll("_", " ")}: ${Array.isArray(value) ? value.join(", ") : value}`).join(" · ");
  return error?.message || "Property could not be saved. Please try again.";
}

export default function PMPropertyCreate() {
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdPropertyId, setCreatedPropertyId] = useState(null);
  const [form, setForm] = useState({ name: "", property_type: "HOME", address: "", city: "", state: "", zip: "", status: "HEALTHY", notes: "" });
  const [profile, setProfile] = useState(emptyProfile);

  useEffect(() => {
    let active = true;
    api.get("/pm-hub/workspaces/current/")
      .then((response) => { if (active) setWorkspace(response.data); })
      .catch((caught) => { if (active) setError(caught?.response?.status === 404 ? "Save your portfolio settings before adding a property." : normalizeError(caught)); })
      .finally(() => { if (active) setLoadingWorkspace(false); });
    return () => { active = false; };
  }, []);

  const canSave = useMemo(() => Boolean(workspace?.id && form.name.trim() && form.address.trim() && form.city.trim() && form.state.trim() && form.zip.trim()), [form, workspace]);
  const update = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const updateProfile = (name, value) => setProfile((current) => ({ ...current, [name]: value }));

  async function saveProperty(event) {
    event.preventDefault();
    if (!canSave || saving || createdPropertyId) return;
    setSaving(true);
    setError("");
    try {
      const headers = { "X-PM-Workspace-ID": String(workspace.id) };
      const response = await api.post("/pm-hub/properties/", {
        name: form.name.trim(), property_type: form.property_type, address: form.address.trim(), city: form.city.trim(), state: form.state.trim().toUpperCase().slice(0, 2), zip: form.zip.trim(), status: form.status, notes: form.notes.trim(), workspace_id: workspace.id,
      }, { headers });
      const propertyId = response.data?.id;
      if (!propertyId) return navigate("/pm/properties", { replace: true });

      setCreatedPropertyId(propertyId);
      const detailPayload = { ...profile };
      ["bedrooms", "bathrooms", "square_feet", "year_built"].forEach((key) => { if (detailPayload[key] === "") detailPayload[key] = null; });
      try {
        await api.patch(`/pm-hub/properties/${propertyId}/profile/`, detailPayload, { headers });
      } catch (profileError) {
        setError(`Property was created, but the detailed setup could not be saved: ${normalizeError(profileError)}`);
        setSaving(false);
        return;
      }
      navigate(`/pm/properties/${propertyId}`, { replace: true });
    } catch (caught) {
      setError(normalizeError(caught));
      setSaving(false);
    }
  }

  return <div className="min-h-screen bg-black text-white">
    <PMHeader title={workspace?.name || "Create Property"} subtitle="Add a property to this Property Management portfolio" />
    <main className="relative z-10 mx-auto max-w-5xl px-4 pb-[calc(13rem+env(safe-area-inset-bottom))] pt-6">
      <form onSubmit={saveProperty} className="space-y-5">
        <section className="rounded-[28px] border border-blue-500/20 bg-[#07111f]/95 p-5 sm:p-6">
          <div className="mb-5"><div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300">Portfolio record</div><h1 className="mt-2 text-2xl font-semibold tracking-tight">Property information</h1><p className="mt-2 text-sm leading-6 text-slate-400">Enter it once here. These details will carry into the property profile, leasing, MHA/Section 8 paperwork, inspections, and future document builders.</p></div>
          {error ? <div className="mb-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm leading-5 text-rose-100">{error}{!workspace?.id ? <button type="button" onClick={() => navigate("/pm/settings")} className="mt-3 block rounded-xl border border-rose-300/30 px-3 py-2 text-xs font-bold">Open Portfolio Settings</button> : null}{createdPropertyId ? <button type="button" onClick={() => navigate(`/pm/properties/${createdPropertyId}`)} className="mt-3 block rounded-xl border border-rose-300/30 px-3 py-2 text-xs font-bold">Open Created Property</button> : null}</div> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Property name" required hint="Example: Roxana or Oak Ridge Apartments"><input className={controlClass} value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Property name" /></Field></div>
            <Field label="Property type" required><select className={controlClass} value={form.property_type} onChange={(event) => update("property_type", event.target.value)}>{PROPERTY_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
            <Field label="Portfolio status" required><select className={controlClass} value={form.status} onChange={(event) => update("status", event.target.value)}><option value="HEALTHY">Healthy</option><option value="WATCH">Watch</option><option value="AT_RISK">At risk</option></select></Field>
            <div className="sm:col-span-2"><Field label="Street address" required><input className={controlClass} value={form.address} onChange={(event) => update("address", event.target.value)} placeholder="123 Main Street" autoComplete="street-address" /></Field></div>
            <Field label="City" required><input className={controlClass} value={form.city} onChange={(event) => update("city", event.target.value)} placeholder="Montgomery" autoComplete="address-level2" /></Field>
            <div className="grid grid-cols-[0.8fr_1.2fr] gap-3"><Field label="State" required><input className={controlClass} value={form.state} onChange={(event) => update("state", event.target.value.toUpperCase().slice(0, 2))} placeholder="AL" maxLength={2} /></Field><Field label="ZIP code" required><input className={controlClass} value={form.zip} onChange={(event) => update("zip", event.target.value)} placeholder="36104" inputMode="numeric" /></Field></div>
          </div>
        </section>

        <section className="rounded-[28px] border border-cyan-500/20 bg-[#07111f]/95 p-5 sm:p-6">
          <div className="mb-5"><div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300">Property setup</div><h2 className="mt-2 text-xl font-black">Physical details</h2><p className="mt-2 text-sm text-slate-400">Quick property facts used throughout PM operations and paperwork.</p></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Bedrooms"><input className={controlClass} value={profile.bedrooms} onChange={(e) => updateProfile("bedrooms", e.target.value)} /></Field><Field label="Bathrooms"><input className={controlClass} value={profile.bathrooms} onChange={(e) => updateProfile("bathrooms", e.target.value)} /></Field><Field label="Square feet"><input type="number" className={controlClass} value={profile.square_feet} onChange={(e) => updateProfile("square_feet", e.target.value)} /></Field><Field label="Year built"><input type="number" className={controlClass} value={profile.year_built} onChange={(e) => updateProfile("year_built", e.target.value)} /></Field></div>
          <label className="mt-4 flex items-center gap-3 rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-4 text-sm font-bold text-fuchsia-100"><input type="checkbox" checked={profile.furnished} onChange={(e) => updateProfile("furnished", e.target.checked)} />Furnished property / furnished unit</label>
          <div className="mt-5"><PMPropertyFeatureChecklist value={profile.custom_data} onChange={(custom_data) => updateProfile("custom_data", custom_data)} showFurnished={profile.furnished} /></div>
        </section>

        <section className="rounded-[28px] border border-blue-500/20 bg-[#07111f]/95 p-5 sm:p-6">
          <div className="mb-4"><h2 className="text-xl font-black">Providers & notes</h2><p className="mt-1 text-sm text-slate-400">Use check buttons above for who pays. Add provider/account details only where useful.</p></div>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Electric provider"><input className={controlClass} value={profile.utility_electric} onChange={(e) => updateProfile("utility_electric", e.target.value)} /></Field><Field label="Gas provider"><input className={controlClass} value={profile.utility_gas} onChange={(e) => updateProfile("utility_gas", e.target.value)} /></Field><Field label="Water provider"><input className={controlClass} value={profile.utility_water} onChange={(e) => updateProfile("utility_water", e.target.value)} /></Field><Field label="Trash provider"><input className={controlClass} value={profile.utility_trash} onChange={(e) => updateProfile("utility_trash", e.target.value)} /></Field><Field label="Sewer / septic"><input className={controlClass} value={profile.sewer_septic} onChange={(e) => updateProfile("sewer_septic", e.target.value)} /></Field><Field label="Parking / access notes"><input className={controlClass} value={profile.parking_details} onChange={(e) => updateProfile("parking_details", e.target.value)} /></Field><div className="sm:col-span-2"><Field label="Internal notes" hint="Visible only inside this Property Management portfolio."><textarea className={`${controlClass} min-h-28 resize-y`} value={form.notes} onChange={(event) => update("notes", event.target.value)} /></Field></div></div>
        </section>

        <div className="sticky bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-30 rounded-[26px] border border-cyan-400/25 bg-[#07111f]/95 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:static sm:flex sm:justify-end"><button type="submit" disabled={!canSave || saving || loadingWorkspace || Boolean(createdPropertyId)} className="min-h-14 w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto sm:min-w-48">{saving ? "Saving property..." : loadingWorkspace ? "Loading portfolio..." : createdPropertyId ? "Property created" : "Save property"}</button></div>
      </form>
    </main>
  </div>;
}
