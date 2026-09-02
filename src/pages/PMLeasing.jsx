import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/client";
import Button from "../components/ui/Button";

const inputClass = "min-h-11 w-full rounded-2xl border border-slate-700 bg-black/35 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/70";
const list = (data) => Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
const blankProspect = { first_name: "", last_name: "", email: "", phone: "", stage: "LEAD", section8_requested: false, voucher_authority: "", desired_move_in: "", desired_bedrooms: "", max_rent: "", assigned_unit: "", showing_at: "", notes: "" };
const blankUnit = { property: "", label: "", bedrooms: "", bathrooms: "", square_feet: "", market_rent: "", availability: "AVAILABLE", available_date: "", accepts_section8: false, notes: "" };

function Field({ label, children }) { return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-300">{label}</span>{children}</label>; }
function errorText(err, fallback) { const data = err?.response?.data; if (data?.detail) return data.detail; if (data && typeof data === "object") return Object.entries(data).map(([k,v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" · "); return fallback; }

export default function PMLeasing() {
  const [searchParams] = useSearchParams();
  const section8Focus = searchParams.get("focus") === "section8";
  const [workspace, setWorkspace] = useState(null);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [prospects, setProspects] = useState([]);
  const [prospect, setProspect] = useState(blankProspect);
  const [unit, setUnit] = useState(blankUnit);
  const [tab, setTab] = useState("pipeline");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const ws = await api.get("/pm-hub/workspaces/current/");
      setWorkspace(ws.data);
      const headers = { "X-PM-Workspace-ID": String(ws.data.id) };
      const [p,u,l] = await Promise.all([api.get("/pm-hub/properties/", { headers }), api.get("/pm-hub/units/", { headers }), api.get("/pm-hub/prospects/", { headers })]);
      setProperties(list(p.data)); setUnits(list(u.data)); setProspects(list(l.data));
    } catch (err) { setError(errorText(err, "Could not load leasing data.")); }
  }
  useEffect(() => { load(); }, []);

  const availableUnits = useMemo(() => units.filter((u) => ["AVAILABLE", "NOTICE_GIVEN", "MAKE_READY"].includes(u.availability)), [units]);
  const visibleProspects = section8Focus ? prospects.filter((item) => item.section8_requested) : prospects;
  const stats = useMemo(() => ({ leads: prospects.filter((p) => p.stage === "LEAD").length, applications: prospects.filter((p) => p.stage.includes("APPLICATION") || p.stage === "SCREENING").length, approved: prospects.filter((p) => ["APPROVED","SHOWING_SCHEDULED","READY_FOR_ONBOARDING"].includes(p.stage)).length, available: availableUnits.length }), [prospects, availableUnits]);

  async function saveProspect() {
    if (!prospect.first_name || !prospect.email) return setError("First name and email are required.");
    setSaving(true); setError(""); setMessage("");
    try {
      const headers = { "X-PM-Workspace-ID": String(workspace.id) };
      await api.post("/pm-hub/prospects/", { ...prospect, desired_move_in: prospect.desired_move_in || null, desired_bedrooms: prospect.desired_bedrooms || null, max_rent: prospect.max_rent || null, assigned_unit: prospect.assigned_unit || null, showing_at: prospect.showing_at || null, workspace_id: workspace.id }, { headers });
      setProspect(blankProspect); setMessage("Prospect added to the leasing pipeline."); await load();
    } catch (err) { setError(errorText(err, "Could not save prospect.")); } finally { setSaving(false); }
  }

  async function saveUnit() {
    if (!unit.property || !unit.label) return setError("Property and unit label are required.");
    setSaving(true); setError(""); setMessage("");
    try {
      const headers = { "X-PM-Workspace-ID": String(workspace.id) };
      await api.post("/pm-hub/units/", { ...unit, bedrooms: unit.bedrooms || null, bathrooms: unit.bathrooms || null, square_feet: unit.square_feet || null, market_rent: unit.market_rent || null, available_date: unit.available_date || null, workspace_id: workspace.id }, { headers });
      setUnit(blankUnit); setMessage("Unit added to availability inventory."); await load();
    } catch (err) { setError(errorText(err, "Could not save unit.")); } finally { setSaving(false); }
  }

  async function updateProspect(item, patch) {
    try {
      const headers = { "X-PM-Workspace-ID": String(workspace.id) };
      await api.patch(`/pm-hub/prospects/${item.id}/`, patch, { headers }); await load();
    } catch (err) { setError(errorText(err, "Could not update prospect.")); }
  }

  async function convert(item) {
    try {
      const headers = { "X-PM-Workspace-ID": String(workspace.id) };
      await api.post(`/pm-hub/prospects/${item.id}/convert-to-tenant/`, {}, { headers }); setMessage("Prospect converted to tenant and assigned unit marked occupied."); await load();
    } catch (err) { setError(errorText(err, "Could not convert prospect.")); }
  }

  return <div className="min-h-screen bg-transparent text-slate-100"><main className="space-y-5 px-4 py-6 sm:px-6">
    <div className="grid gap-3 sm:grid-cols-4">{[["New Leads",stats.leads],["Applications",stats.applications],["Approved / Showing",stats.approved],["Available Units",stats.available]].map(([l,v]) => <div key={l} className="rounded-3xl border border-cyan-500/15 bg-[#07111f]/95 p-5"><div className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500">{l}</div><div className="mt-3 text-3xl font-black text-white">{v}</div></div>)}</div>
    <div className="flex flex-wrap gap-2">{[["pipeline","Prospect Pipeline"],["new","Add Prospect"],["units","Units & Availability"],["import","Import Guide"]].map(([k,l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-2xl border px-4 py-2 text-sm font-bold ${tab===k ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-100" : "border-slate-700 text-slate-400"}`}>{l}</button>)}</div>
    {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}
    {message ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">{message}</div> : null}

    {tab === "pipeline" ? <section className="rounded-[28px] border border-cyan-500/15 bg-[#07111f]/90 p-4 sm:p-5">{section8Focus ? <div className="mb-4 rounded-2xl border border-violet-400/25 bg-violet-500/10 p-4 text-sm text-violet-100"><strong>Section 8 pipeline:</strong> showing voucher-requested prospects and their housing authority details.</div> : null}<div className="space-y-3">{visibleProspects.length ? visibleProspects.map((item) => <article key={item.id} className="rounded-3xl border border-slate-700/70 bg-black/25 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-lg font-black text-white">{item.full_name}</div><div className="mt-1 text-xs text-slate-400">{item.email} · {item.phone || "No phone"}</div><div className="mt-2 text-xs text-slate-500">{item.assigned_property_name ? `${item.assigned_property_name} · ${item.assigned_unit_name}` : "No unit matched"}{item.section8_requested ? ` · Section 8 requested${item.voucher_authority ? ` · ${item.voucher_authority}` : ""}` : ""}</div></div><select className={inputClass} style={{width:220}} value={item.stage} onChange={(e) => updateProspect(item,{stage:e.target.value})}>{["LEAD","APPLICATION_SENT","APPLICATION_RECEIVED","SCREENING","APPROVED","SHOWING_SCHEDULED","READY_FOR_ONBOARDING","CONVERTED","DECLINED","WITHDRAWN"].map((s)=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select></div><div className="mt-3 flex flex-wrap gap-2">{["APPROVED","SHOWING_SCHEDULED","READY_FOR_ONBOARDING"].includes(item.stage) ? <Button tone="cyan" onClick={() => convert(item)}>Convert to Tenant</Button> : null}</div></article>) : <div className="py-12 text-center text-sm text-slate-500">{section8Focus ? "No Section 8 prospects are waiting in the leasing pipeline." : "No prospects yet."}</div>}</div></section> : null}

    {tab === "new" ? <section className="rounded-[28px] border border-cyan-500/15 bg-[#07111f]/90 p-5"><div className="grid gap-4 md:grid-cols-2"><Field label="First name"><input className={inputClass} value={prospect.first_name} onChange={(e)=>setProspect({...prospect,first_name:e.target.value})}/></Field><Field label="Last name"><input className={inputClass} value={prospect.last_name} onChange={(e)=>setProspect({...prospect,last_name:e.target.value})}/></Field><Field label="Email"><input className={inputClass} value={prospect.email} onChange={(e)=>setProspect({...prospect,email:e.target.value})}/></Field><Field label="Phone"><input className={inputClass} value={prospect.phone} onChange={(e)=>setProspect({...prospect,phone:e.target.value})}/></Field><Field label="Desired move-in"><input type="date" className={inputClass} value={prospect.desired_move_in} onChange={(e)=>setProspect({...prospect,desired_move_in:e.target.value})}/></Field><Field label="Bedrooms"><input className={inputClass} value={prospect.desired_bedrooms} onChange={(e)=>setProspect({...prospect,desired_bedrooms:e.target.value})}/></Field><Field label="Max rent"><input className={inputClass} value={prospect.max_rent} onChange={(e)=>setProspect({...prospect,max_rent:e.target.value})}/></Field><Field label="Match available unit"><select className={inputClass} value={prospect.assigned_unit} onChange={(e)=>setProspect({...prospect,assigned_unit:e.target.value})}><option value="">Not assigned</option>{availableUnits.filter((u)=>!prospect.section8_requested || u.accepts_section8).map((u)=><option key={u.id} value={u.id}>{u.display_name} · ${u.market_rent || "—"}</option>)}</select></Field><label className="flex items-center gap-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4"><input type="checkbox" checked={prospect.section8_requested} onChange={(e)=>setProspect({...prospect,section8_requested:e.target.checked})}/><span className="text-sm font-bold">Section 8 / voucher requested</span></label>{prospect.section8_requested ? <Field label="Housing authority"><input className={inputClass} placeholder="Example: Montgomery Housing Authority" value={prospect.voucher_authority} onChange={(e)=>setProspect({...prospect,voucher_authority:e.target.value})}/></Field> : null}<div className="md:col-span-2"><Field label="Notes"><textarea rows="3" className={inputClass} value={prospect.notes} onChange={(e)=>setProspect({...prospect,notes:e.target.value})}/></Field></div></div><div className="mt-5"><Button tone="cyan" onClick={saveProspect} disabled={saving}>{saving?"Saving...":"Add Prospect"}</Button></div></section> : null}

    {tab === "units" ? <div className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]"><section className="rounded-[28px] border border-cyan-500/15 bg-[#07111f]/90 p-5"><h2 className="text-lg font-black">Add unit</h2><div className="mt-4 grid gap-4"><Field label="Property"><select className={inputClass} value={unit.property} onChange={(e)=>setUnit({...unit,property:e.target.value})}><option value="">Choose property</option>{properties.map((p)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Field label="Unit label"><input className={inputClass} placeholder="Unit 101" value={unit.label} onChange={(e)=>setUnit({...unit,label:e.target.value})}/></Field><div className="grid grid-cols-2 gap-3"><Field label="Bedrooms"><input className={inputClass} value={unit.bedrooms} onChange={(e)=>setUnit({...unit,bedrooms:e.target.value})}/></Field><Field label="Bathrooms"><input className={inputClass} value={unit.bathrooms} onChange={(e)=>setUnit({...unit,bathrooms:e.target.value})}/></Field></div><Field label="Market rent"><input className={inputClass} value={unit.market_rent} onChange={(e)=>setUnit({...unit,market_rent:e.target.value})}/></Field><Field label="Availability"><select className={inputClass} value={unit.availability} onChange={(e)=>setUnit({...unit,availability:e.target.value})}>{["AVAILABLE","OCCUPIED","NOTICE_GIVEN","MAKE_READY","CONSTRUCTION","OFF_MARKET"].map((s)=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select></Field><label className="flex items-center gap-3"><input type="checkbox" checked={unit.accepts_section8} onChange={(e)=>setUnit({...unit,accepts_section8:e.target.checked})}/><span className="text-sm">Accepts Section 8</span></label><Button tone="cyan" onClick={saveUnit} disabled={saving}>Save Unit</Button></div></section><section className="rounded-[28px] border border-cyan-500/15 bg-[#07111f]/90 p-5"><h2 className="text-lg font-black">Unit inventory</h2><div className="mt-4 space-y-3">{units.map((u)=><div key={u.id} className="rounded-2xl border border-slate-700 bg-black/25 p-4"><div className="font-bold text-white">{u.display_name}</div><div className="mt-1 text-xs text-slate-400">{u.bedrooms || "—"} bd · {u.bathrooms || "—"} ba · ${u.market_rent || "—"}</div><div className="mt-2 text-xs text-cyan-300">{u.availability.replaceAll("_"," ")}{u.accepts_section8?" · Section 8":""}</div></div>)}</div></section></div> : null}

    {tab === "import" ? <section className="rounded-[28px] border border-cyan-500/15 bg-[#07111f]/90 p-5"><h2 className="text-xl font-black">Spreadsheet setup</h2><p className="mt-2 text-sm text-slate-400">Use the Property Portfolio template first, then add one row per property. Units should use one row per unit and include the exact property name so they can be matched. Google Sheets users should download as CSV before importing.</p><div className="mt-5 grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-slate-700 bg-black/25 p-4"><div className="font-bold">Property columns</div><code className="mt-2 block whitespace-pre-wrap text-xs text-cyan-200">name, property_type, address, city, state, zip, status, notes</code></div><div className="rounded-2xl border border-slate-700 bg-black/25 p-4"><div className="font-bold">Unit columns</div><code className="mt-2 block whitespace-pre-wrap text-xs text-cyan-200">property_name, unit_label, bedrooms, bathrooms, square_feet, market_rent, availability, available_date, accepts_section8, notes</code></div></div><p className="mt-4 text-xs text-amber-200">Direct Google Sheets syncing requires Google OAuth and a Sheets API connection. CSV import/export is available now and works with both Excel and Google Sheets.</p></section> : null}
  </main></div>;
}
