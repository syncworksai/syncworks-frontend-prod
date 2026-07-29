import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/client";

const list = (data) => Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
const inputClass = "min-h-11 w-full rounded-2xl border border-slate-700 bg-black/30 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/15";
const categories = {
  PLUMBING: ["Active leak", "Clogged drain", "No hot water", "Toilet issue", "Low water pressure", "Water heater", "Other plumbing"],
  ELECTRICAL: ["No power", "Outlet or switch", "Breaker tripping", "Light fixture", "Smoke detector", "Electrical hazard", "Other electrical"],
  HVAC: ["No cooling", "No heat", "Thermostat", "Airflow issue", "Water around unit", "Filter or maintenance", "Other HVAC"],
  APPLIANCE: ["Refrigerator", "Range or oven", "Dishwasher", "Washer or dryer", "Garbage disposal", "Microwave", "Other appliance"],
  STRUCTURAL: ["Roof or ceiling", "Door or lock", "Window", "Wall or flooring", "Stairs or railing", "Foundation", "Other structural"],
  PEST: ["Roaches", "Rodents", "Bed bugs", "Termites", "Wasps or bees", "Other pest"],
  SAFETY: ["Smoke or fire", "Gas odor", "Carbon monoxide", "Flooding", "Security or lockout", "Trip or fall hazard", "Other safety"],
  EXTERIOR: ["Landscaping", "Parking", "Fence or gate", "Exterior lighting", "Trash or dumping", "Painting", "Other exterior"],
  GENERAL: ["Routine inspection item", "Cleaning", "Painting", "Turn or make-ready", "Resident damage", "Other maintenance"],
};

const emptyForm = {
  property: "", unit: "", tenant: "", source: "CALL_IN", category: "PLUMBING", issue_type: "Active leak",
  title: "", description: "", priority: "ROUTINE", caller_name: "", caller_phone: "", permission_to_enter: false,
  pets_or_access_notes: "", preferred_schedule: "", active_leak: false, electrical_hazard: false, water_shutoff: false,
  no_heat_or_air: false, appliance_make_model: "", dispatch_mode: "UNASSIGNED", internal_assignee: "", vendor_name: "",
  vendor_email: "", vendor_phone: "", not_to_exceed: "",
};

function Field({ label, hint, children }) {
  return <label className="block space-y-1.5"><span className="text-xs font-bold text-slate-300">{label}</span>{children}{hint ? <span className="block text-[11px] text-slate-500">{hint}</span> : null}</label>;
}

function errorMessage(error, fallback) {
  const data = error?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (data && typeof data === "object") return Object.entries(data).map(([key, value]) => `${key.replaceAll("_", " ")}: ${Array.isArray(value) ? value.join(", ") : value}`).join(" · ");
  return error?.message || fallback;
}

export default function PMWorkOrders() {
  const [params] = useSearchParams();
  const requestedProperty = params.get("property") || "";
  const [workspace, setWorkspace] = useState(null);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({ ...emptyForm, property: requestedProperty });
  const [filter, setFilter] = useState("OPEN");
  const [showForm, setShowForm] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const headers = workspace?.id ? { "X-PM-Workspace-ID": String(workspace.id) } : {};

  async function load() {
    setLoading(true); setError("");
    try {
      const ws = await api.get("/pm-hub/workspaces/current/");
      const current = ws.data; setWorkspace(current);
      const h = { "X-PM-Workspace-ID": String(current.id) };
      const [p, u, t, w] = await Promise.all([
        api.get("/pm-hub/properties/", { headers: h }), api.get("/pm-hub/units/", { headers: h }),
        api.get("/pm-hub/tenants/", { headers: h }), api.get("/pm-hub/work-orders/", { headers: h }),
      ]);
      setProperties(list(p.data)); setUnits(list(u.data)); setTenants(list(t.data)); setOrders(list(w.data));
      const firstProperty = requestedProperty || String(list(p.data)[0]?.id || "");
      setForm((old) => ({ ...old, property: old.property || firstProperty }));
    } catch (e) { setError(errorMessage(e, "Could not load work orders.")); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const propertyUnits = useMemo(() => units.filter((u) => String(u.property) === String(form.property)), [units, form.property]);
  const property = properties.find((p) => String(p.id) === String(form.property));
  const propertyTenants = useMemo(() => tenants.filter((t) => !property || t.property_name === property.name), [tenants, property]);
  const visible = useMemo(() => orders.filter((item) => {
    if (filter === "ALL") return true;
    if (filter === "URGENT") return ["URGENT", "EMERGENCY"].includes(item.priority);
    if (filter === "MARKETPLACE") return item.dispatch_mode === "MARKETPLACE";
    if (filter === "COMPLETED") return item.status === "COMPLETED";
    return !["COMPLETED", "CANCELLED"].includes(item.status);
  }), [orders, filter]);
  const stats = useMemo(() => ({
    open: orders.filter((o) => !["COMPLETED", "CANCELLED"].includes(o.status)).length,
    emergency: orders.filter((o) => o.priority === "EMERGENCY").length,
    marketplace: orders.filter((o) => o.dispatch_mode === "MARKETPLACE").length,
    completed: orders.filter((o) => o.status === "COMPLETED").length,
  }), [orders]);

  function set(name, value) {
    setForm((old) => {
      const next = { ...old, [name]: value };
      if (name === "category") next.issue_type = categories[value]?.[0] || "";
      if (name === "property") { next.unit = ""; next.tenant = ""; }
      return next;
    });
  }

  async function save(event) {
    event.preventDefault();
    if (!form.property || !form.title.trim() || !form.description.trim()) return setError("Property, title, and request details are required.");
    setSaving(true); setError(""); setMessage("");
    try {
      const payload = {
        ...form, property: Number(form.property), unit: form.unit ? Number(form.unit) : null, tenant: form.tenant ? Number(form.tenant) : null,
        not_to_exceed: form.not_to_exceed === "" ? null : form.not_to_exceed,
      };
      const response = await api.post("/pm-hub/work-orders/", payload, { headers });
      let saved = response.data;
      if (form.dispatch_mode === "MARKETPLACE") {
        const published = await api.post(`/pm-hub/work-orders/${saved.id}/publish-marketplace/`, {}, { headers });
        saved = published.data;
      }
      setMessage(saved.marketplace_ticket_code ? `Work order saved and published as ${saved.marketplace_ticket_code}.` : "Work order saved.");
      setForm({ ...emptyForm, property: form.property });
      setShowForm(false);
      await load();
    } catch (e) { setError(errorMessage(e, "Could not save the work order.")); }
    finally { setSaving(false); }
  }

  async function publish(item) {
    setError(""); setMessage("");
    try {
      const response = await api.post(`/pm-hub/work-orders/${item.id}/publish-marketplace/`, {}, { headers });
      setMessage(`Published to marketplace as ${response.data.marketplace_ticket_code}.`); await load();
    } catch (e) { setError(errorMessage(e, "Could not publish this work order.")); }
  }

  return <div className="min-h-screen bg-transparent text-slate-100"><main className="space-y-5 px-4 py-6 sm:px-6">
    <section className="rounded-[28px] border border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 via-[#07111f] to-fuchsia-500/10 p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-300">Rental Maintenance</div><h1 className="mt-2 text-2xl font-black text-white">Call-In Work Order Center</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Capture a resident call, assign your team or vendor, or send the request to the SyncWorks marketplace when you need a contractor.</p></div><button type="button" onClick={() => setShowForm((v) => !v)} className="min-h-12 rounded-2xl bg-cyan-400 px-5 text-sm font-black text-slate-950">{showForm ? "Hide Entry Form" : "+ New Call-In Request"}</button></div>
    </section>

    {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}
    {message ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">{message}</div> : null}

    {showForm ? <form onSubmit={save} className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
      <section className="rounded-[28px] border border-cyan-500/18 bg-[#07111f]/95 p-4 sm:p-6"><h2 className="text-lg font-black text-white">Resident request</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Property"><select className={inputClass} value={form.property} onChange={(e) => set("property", e.target.value)}><option value="">Choose property</option>{properties.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.address}</option>)}</select></Field>
        <Field label="Unit"><select className={inputClass} value={form.unit} onChange={(e) => set("unit", e.target.value)}><option value="">Whole property / no unit</option>{propertyUnits.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}</select></Field>
        <Field label="Tenant"><select className={inputClass} value={form.tenant} onChange={(e) => set("tenant", e.target.value)}><option value="">Caller not matched</option>{propertyTenants.map((t) => <option key={t.id} value={t.id}>{t.full_name || `${t.first_name} ${t.last_name}`}</option>)}</select></Field>
        <Field label="Source"><select className={inputClass} value={form.source} onChange={(e) => set("source", e.target.value)}><option value="CALL_IN">Call-in request</option><option value="OFFICE">Office entered</option><option value="INSPECTION">Inspection</option><option value="PREVENTIVE">Preventive maintenance</option></select></Field>
        <Field label="Caller name"><input className={inputClass} value={form.caller_name} onChange={(e) => set("caller_name", e.target.value)} /></Field>
        <Field label="Caller phone"><input className={inputClass} value={form.caller_phone} onChange={(e) => set("caller_phone", e.target.value)} /></Field>
        <Field label="Category"><select className={inputClass} value={form.category} onChange={(e) => set("category", e.target.value)}>{Object.keys(categories).map((c) => <option key={c} value={c}>{c.replaceAll("_", " ")}</option>)}</select></Field>
        <Field label="Issue type"><select className={inputClass} value={form.issue_type} onChange={(e) => set("issue_type", e.target.value)}>{(categories[form.category] || []).map((x) => <option key={x}>{x}</option>)}</select></Field>
        <div className="sm:col-span-2"><Field label="Short title"><input className={inputClass} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Example: Kitchen sink leaking under cabinet" /></Field></div>
        <div className="sm:col-span-2"><Field label="What is happening?" hint="Record what the resident sees, when it started, and what has already been tried."><textarea rows={4} className={inputClass} value={form.description} onChange={(e) => set("description", e.target.value)} /></Field></div>
        <Field label="Priority"><select className={inputClass} value={form.priority} onChange={(e) => set("priority", e.target.value)}><option value="ROUTINE">Routine</option><option value="HIGH">High</option><option value="URGENT">Urgent</option><option value="EMERGENCY">Emergency</option></select></Field>
        <Field label="Preferred schedule"><input className={inputClass} value={form.preferred_schedule} onChange={(e) => set("preferred_schedule", e.target.value)} placeholder="Tomorrow after 3 PM" /></Field>
        {form.category === "APPLIANCE" ? <div className="sm:col-span-2"><Field label="Appliance make/model"><input className={inputClass} value={form.appliance_make_model} onChange={(e) => set("appliance_make_model", e.target.value)} /></Field></div> : null}
      </div></section>

      <section className="space-y-5"><div className="rounded-[28px] border border-amber-500/20 bg-[#07111f]/95 p-4 sm:p-5"><h2 className="font-black text-white">Access & safety</h2><div className="mt-4 space-y-3">{[["permission_to_enter", "Permission to enter"], ["active_leak", "Active leak"], ["electrical_hazard", "Electrical hazard"], ["water_shutoff", "Water shutoff may be needed"], ["no_heat_or_air", "No heat or air conditioning"]].map(([key, text]) => <label key={key} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-black/20 p-3 text-sm"><input type="checkbox" checked={form[key]} onChange={(e) => set(key, e.target.checked)} />{text}</label>)}<Field label="Pets, gate, alarm, or entry notes"><textarea rows={3} className={inputClass} value={form.pets_or_access_notes} onChange={(e) => set("pets_or_access_notes", e.target.value)} /></Field></div></div>
      <div className="rounded-[28px] border border-fuchsia-500/20 bg-[#07111f]/95 p-4 sm:p-5"><h2 className="font-black text-white">Dispatch</h2><div className="mt-4 space-y-4"><Field label="Send to"><select className={inputClass} value={form.dispatch_mode} onChange={(e) => set("dispatch_mode", e.target.value)}><option value="UNASSIGNED">Save for triage</option><option value="INTERNAL">Internal team</option><option value="VENDOR">Known vendor</option><option value="MARKETPLACE">SyncWorks marketplace</option></select></Field>{form.dispatch_mode === "INTERNAL" ? <Field label="Internal assignee"><input className={inputClass} value={form.internal_assignee} onChange={(e) => set("internal_assignee", e.target.value)} /></Field> : null}{form.dispatch_mode === "VENDOR" ? <><Field label="Vendor name"><input className={inputClass} value={form.vendor_name} onChange={(e) => set("vendor_name", e.target.value)} /></Field><Field label="Vendor email"><input className={inputClass} value={form.vendor_email} onChange={(e) => set("vendor_email", e.target.value)} /></Field><Field label="Vendor phone"><input className={inputClass} value={form.vendor_phone} onChange={(e) => set("vendor_phone", e.target.value)} /></Field></> : null}<Field label="Not-to-exceed amount" hint="Leave blank when a quote must be approved first."><input inputMode="decimal" className={inputClass} value={form.not_to_exceed} onChange={(e) => set("not_to_exceed", e.target.value)} placeholder="$0.00" /></Field><button disabled={saving || loading} className="min-h-12 w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 text-sm font-black text-slate-950 disabled:opacity-50">{saving ? "Saving..." : form.dispatch_mode === "MARKETPLACE" ? "Save & Publish to Marketplace" : "Save Work Order"}</button></div></div></section>
    </form> : null}

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["Open", stats.open], ["Emergency", stats.emergency], ["Marketplace", stats.marketplace], ["Completed", stats.completed]].map(([name, value]) => <div key={name} className="rounded-3xl border border-cyan-500/15 bg-[#07111f]/95 p-5"><div className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500">{name}</div><div className="mt-2 text-3xl font-black text-white">{value}</div></div>)}</div>
    <div className="flex gap-2 overflow-x-auto">{["OPEN", "URGENT", "MARKETPLACE", "COMPLETED", "ALL"].map((x) => <button key={x} onClick={() => setFilter(x)} className={`min-h-10 shrink-0 rounded-2xl border px-4 text-xs font-black ${filter === x ? "border-cyan-400 bg-cyan-500/15 text-cyan-100" : "border-slate-700 text-slate-400"}`}>{x}</button>)}</div>
    <section className="rounded-[28px] border border-cyan-500/15 bg-[#07111f]/90 p-4 sm:p-5">{loading ? <div className="py-14 text-center text-sm text-slate-500">Loading work orders...</div> : visible.length ? <div className="grid gap-3">{visible.map((item) => <article key={item.id} className="rounded-3xl border border-slate-700 bg-black/25 p-4 sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:justify-between"><div><div className="flex flex-wrap gap-2"><span className="rounded-full border border-cyan-500/25 px-2 py-1 text-[9px] font-black text-cyan-200">{item.category}</span><span className="rounded-full border border-rose-500/25 px-2 py-1 text-[9px] font-black text-rose-200">{item.priority}</span><span className="rounded-full border border-fuchsia-500/25 px-2 py-1 text-[9px] font-black text-fuchsia-200">{item.dispatch_mode}</span></div><h2 className="mt-3 font-black text-white">{item.title}</h2><div className="mt-1 text-xs text-slate-500">{item.property_name}{item.unit_label ? ` · ${item.unit_label}` : ""}{item.tenant_name ? ` · ${item.tenant_name}` : ""}</div><p className="mt-3 text-sm leading-6 text-slate-400">{item.description}</p></div><div className="flex shrink-0 flex-col gap-2"><div className="rounded-2xl border border-slate-700 px-4 py-3 text-center text-xs font-black text-cyan-100">{item.status.replaceAll("_", " ")}</div>{!item.marketplace_ticket_id && item.status !== "COMPLETED" ? <button onClick={() => publish(item)} className="min-h-10 rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/10 px-4 text-xs font-black text-fuchsia-100">Find Vendor in Marketplace</button> : null}{item.marketplace_ticket_code ? <div className="text-center text-xs text-emerald-300">{item.marketplace_ticket_code}</div> : null}</div></div></article>)}</div> : <div className="py-14 text-center text-sm text-slate-500">No work orders match this view.</div>}</section>
  </main></div>;
}
