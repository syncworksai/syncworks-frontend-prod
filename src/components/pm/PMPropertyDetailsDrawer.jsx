import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import PMPropertyFeatureChecklist from "./PMPropertyFeatureChecklist";

const inputClass = "min-h-11 w-full rounded-2xl border border-slate-700 bg-[#050d18] px-3 text-sm text-white outline-none focus:border-cyan-400";
const categories = ["FURNITURE", "APPLIANCE", "HVAC", "PLUMBING", "ELECTRICAL", "ACCESS", "UTILITY", "SAFETY", "FIXTURE", "AMENITY", "WARRANTY", "OTHER"];
const conditions = ["NEW", "EXCELLENT", "GOOD", "FAIR", "POOR", "NEEDS_REPAIR", "MISSING"];
const emptyProfile = { bedrooms: "", bathrooms: "", square_feet: "", year_built: "", furnished: false, utility_electric: "", utility_gas: "", utility_water: "", utility_trash: "", sewer_septic: "", hvac_details: "", roof_details: "", water_heater_details: "", access_details: "", insurance_details: "", warranty_notes: "", parking_details: "", safety_details: "", general_notes: "", custom_data: {} };
const emptyItem = { unit: "", category: "FURNITURE", name: "", room_location: "", quantity: 1, condition: "GOOD", furnished_item: true, brand: "", model_number: "", serial_number: "", provider_name: "", account_reference: "", purchase_date: "", warranty_expiration: "", replacement_cost: "", notes: "" };

function Field({ label, children, span = "" }) { return <label className={`block ${span}`}><span className="mb-1.5 block text-xs font-semibold text-slate-300">{label}</span>{children}</label>; }
function pretty(value) { return String(value || "").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function money(value) { return Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" }); }

export default function PMPropertyDetailsDrawer({ open, onClose, workspace, property, units = [], onChanged }) {
  const [profile, setProfile] = useState(emptyProfile);
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [item, setItem] = useState(emptyItem);
  const [section, setSection] = useState("details");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const headers = useMemo(() => workspace?.id ? { "X-PM-Workspace-ID": String(workspace.id) } : {}, [workspace?.id]);

  async function load() {
    if (!open || !workspace?.id || !property?.id) return;
    setLoading(true); setError("");
    try {
      const [profileRes, inventoryRes] = await Promise.all([
        api.get(`/pm-hub/properties/${property.id}/profile/`, { headers }),
        api.get(`/pm-hub/properties/${property.id}/inventory/`, { headers }),
      ]);
      setProfile({ ...emptyProfile, ...(profileRes.data?.profile || {}), custom_data: profileRes.data?.profile?.custom_data || {} });
      setItems(inventoryRes.data?.items || []);
    } catch (caught) { setError(caught?.response?.data?.detail || "Could not load property details."); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [open, workspace?.id, property?.id]);

  async function saveProfile() {
    setSaving(true); setError(""); setNotice("");
    try {
      const payload = { ...profile };
      ["bedrooms", "bathrooms", "square_feet", "year_built"].forEach((key) => { if (payload[key] === "") payload[key] = null; });
      const response = await api.patch(`/pm-hub/properties/${property.id}/profile/`, payload, { headers });
      setProfile({ ...emptyProfile, ...(response.data?.profile || {}), custom_data: response.data?.profile?.custom_data || {} });
      setNotice("Property details and check-button selections saved.");
      onChanged?.();
    } catch (caught) { setError(caught?.response?.data?.detail || "Could not save property details."); }
    finally { setSaving(false); }
  }

  function beginAdd() { setEditing(null); setItem({ ...emptyItem, furnished_item: Boolean(profile.furnished) }); setSection("inventory"); }
  function beginEdit(row) { setEditing(row.id); setItem({ ...emptyItem, ...row, unit: row.unit || "" }); setSection("inventory"); }

  async function saveItem() {
    if (!item.name.trim()) return setError("Item name is required.");
    setSaving(true); setError(""); setNotice("");
    try {
      const payload = { ...item, unit: item.unit || null, quantity: Number(item.quantity || 1), replacement_cost: item.replacement_cost || null, purchase_date: item.purchase_date || null, warranty_expiration: item.warranty_expiration || null };
      if (editing) await api.patch(`/pm-hub/properties/${property.id}/inventory/${editing}/`, payload, { headers });
      else await api.post(`/pm-hub/properties/${property.id}/inventory/`, payload, { headers });
      setNotice(editing ? "Property item updated." : "Property item added.");
      setEditing(null); setItem({ ...emptyItem, furnished_item: Boolean(profile.furnished) });
      await load(); onChanged?.();
    } catch (caught) { setError(caught?.response?.data?.detail || "Could not save the property item."); }
    finally { setSaving(false); }
  }

  async function deleteItem(row) {
    if (!window.confirm(`Delete ${row.name} from this property inventory?`)) return;
    setSaving(true); setError("");
    try {
      await api.delete(`/pm-hub/properties/${property.id}/inventory/${row.id}/`, { headers });
      setItems((current) => current.filter((value) => value.id !== row.id));
      if (editing === row.id) { setEditing(null); setItem({ ...emptyItem, furnished_item: Boolean(profile.furnished) }); }
      setNotice("Property item deleted."); onChanged?.();
    } catch (caught) { setError(caught?.response?.data?.detail || "Could not delete the property item."); }
    finally { setSaving(false); }
  }

  if (!open) return null;
  return <div className="fixed inset-0 z-[260] bg-black/70" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="ml-auto flex h-full w-full max-w-4xl flex-col overflow-hidden border-l border-cyan-400/20 bg-[#040b14] shadow-2xl">
      <header className="flex items-start justify-between gap-4 border-b border-cyan-500/15 p-5"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-300">Property Profile</div><h2 className="mt-2 text-2xl font-black text-white">Details & Inventory</h2><p className="mt-1 text-sm text-slate-400">{property?.name} · check common features once, then only type the exceptions.</p></div><button onClick={onClose} className="rounded-xl border border-slate-700 px-3 py-2 text-slate-300">✕</button></header>
      <div className="flex gap-2 overflow-x-auto border-b border-cyan-500/10 p-3"><button onClick={() => setSection("details")} className={`rounded-xl px-4 py-2 text-xs font-black ${section === "details" ? "bg-cyan-400 text-slate-950" : "text-slate-300"}`}>Property Details</button><button onClick={() => setSection("inventory")} className={`rounded-xl px-4 py-2 text-xs font-black ${section === "inventory" ? "bg-cyan-400 text-slate-950" : "text-slate-300"}`}>Inventory ({items.length})</button></div>
      <div className="flex-1 overflow-y-auto p-5">
        {error ? <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</div> : null}
        {notice ? <div className="mb-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-100">{notice}</div> : null}
        {loading ? <div className="py-10 text-center text-sm text-slate-500">Loading property profile...</div> : null}

        {!loading && section === "details" ? <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Bedrooms"><input className={inputClass} value={profile.bedrooms ?? ""} onChange={(e) => setProfile({ ...profile, bedrooms: e.target.value })} /></Field><Field label="Bathrooms"><input className={inputClass} value={profile.bathrooms ?? ""} onChange={(e) => setProfile({ ...profile, bathrooms: e.target.value })} /></Field><Field label="Square feet"><input type="number" className={inputClass} value={profile.square_feet ?? ""} onChange={(e) => setProfile({ ...profile, square_feet: e.target.value })} /></Field><Field label="Year built"><input type="number" className={inputClass} value={profile.year_built ?? ""} onChange={(e) => setProfile({ ...profile, year_built: e.target.value })} /></Field></div>
          <label className="flex items-center gap-3 rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-4 text-sm font-bold text-fuchsia-100"><input type="checkbox" checked={Boolean(profile.furnished)} onChange={(e) => setProfile({ ...profile, furnished: e.target.checked })} />Furnished property / furnished unit inventory applies</label>

          <PMPropertyFeatureChecklist value={profile.custom_data} onChange={(custom_data) => setProfile({ ...profile, custom_data })} showFurnished={profile.furnished} />

          <div><h3 className="mb-3 font-black text-white">Provider details</h3><p className="mb-3 text-xs text-slate-500">The check buttons above record who is responsible. Add provider names here only when known.</p><div className="grid gap-4 sm:grid-cols-2"><Field label="Electric provider"><input className={inputClass} value={profile.utility_electric || ""} onChange={(e) => setProfile({ ...profile, utility_electric: e.target.value })} /></Field><Field label="Gas provider"><input className={inputClass} value={profile.utility_gas || ""} onChange={(e) => setProfile({ ...profile, utility_gas: e.target.value })} /></Field><Field label="Water provider"><input className={inputClass} value={profile.utility_water || ""} onChange={(e) => setProfile({ ...profile, utility_water: e.target.value })} /></Field><Field label="Trash provider"><input className={inputClass} value={profile.utility_trash || ""} onChange={(e) => setProfile({ ...profile, utility_trash: e.target.value })} /></Field><Field label="Sewer / septic" span="sm:col-span-2"><input className={inputClass} value={profile.sewer_septic || ""} onChange={(e) => setProfile({ ...profile, sewer_septic: e.target.value })} /></Field></div></div>
          <div className="grid gap-4 sm:grid-cols-2">{[["HVAC details", "hvac_details"], ["Roof details", "roof_details"], ["Water heater", "water_heater_details"], ["Keys / access / lockbox", "access_details"], ["Insurance", "insurance_details"], ["Warranties", "warranty_notes"], ["Parking", "parking_details"], ["Safety / alarms", "safety_details"]].map(([label, key]) => <Field key={key} label={label}><textarea rows="3" className={`${inputClass} py-3`} value={profile[key] || ""} onChange={(e) => setProfile({ ...profile, [key]: e.target.value })} /></Field>)}</div>
          <Field label="General property notes"><textarea rows="4" className={`${inputClass} py-3`} value={profile.general_notes || ""} onChange={(e) => setProfile({ ...profile, general_notes: e.target.value })} /></Field>
          <div className="sticky bottom-0 flex justify-end border-t border-cyan-500/10 bg-[#040b14]/95 py-4"><button disabled={saving} onClick={saveProfile} className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950">{saving ? "Saving..." : "Save Property Details"}</button></div>
        </div> : null}

        {!loading && section === "inventory" ? <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-black text-white">Property-owned inventory</h3><p className="mt-1 text-xs text-slate-500">Furniture, appliances, systems, utilities, keys, fixtures, warranties, and amenities.</p></div><button onClick={beginAdd} className="rounded-2xl bg-cyan-400 px-4 py-2.5 text-sm font-black text-slate-950">+ Add Item</button></div>
          <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-slate-800 bg-black/20 p-3"><div className="text-[10px] uppercase text-slate-500">Items</div><div className="mt-1 text-2xl font-black text-white">{items.length}</div></div><div className="rounded-2xl border border-fuchsia-500/20 bg-black/20 p-3"><div className="text-[10px] uppercase text-slate-500">Furnished</div><div className="mt-1 text-2xl font-black text-fuchsia-200">{items.filter((row) => row.furnished_item).length}</div></div><div className="rounded-2xl border border-amber-500/20 bg-black/20 p-3"><div className="text-[10px] uppercase text-slate-500">Needs attention</div><div className="mt-1 text-2xl font-black text-amber-200">{items.filter((row) => ["POOR", "NEEDS_REPAIR", "MISSING"].includes(row.condition)).length}</div></div></div>

          <section className="rounded-3xl border border-cyan-500/15 bg-[#07111f] p-4"><div className="flex items-center justify-between"><div><div className="text-xs font-black uppercase tracking-[.16em] text-cyan-300">{editing ? "Edit Item" : "Add Item"}</div><div className="mt-1 text-sm text-slate-400">Use room and unit fields for furnished or multi-unit inventory.</div></div>{editing ? <button onClick={() => { setEditing(null); setItem({ ...emptyItem, furnished_item: Boolean(profile.furnished) }); }} className="text-xs font-bold text-slate-400">Cancel edit</button> : null}</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Item name"><input className={inputClass} value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} placeholder="Example: Queen bed" /></Field><Field label="Category"><select className={inputClass} value={item.category} onChange={(e) => setItem({ ...item, category: e.target.value })}>{categories.map((value) => <option key={value} value={value}>{pretty(value)}</option>)}</select></Field><Field label="Room / location"><input className={inputClass} value={item.room_location} onChange={(e) => setItem({ ...item, room_location: e.target.value })} placeholder="Primary bedroom" /></Field><Field label="Unit"><select className={inputClass} value={item.unit || ""} onChange={(e) => setItem({ ...item, unit: e.target.value })}><option value="">Whole property</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.label}</option>)}</select></Field><Field label="Quantity"><input type="number" min="1" className={inputClass} value={item.quantity} onChange={(e) => setItem({ ...item, quantity: e.target.value })} /></Field><Field label="Condition"><select className={inputClass} value={item.condition} onChange={(e) => setItem({ ...item, condition: e.target.value })}>{conditions.map((value) => <option key={value} value={value}>{pretty(value)}</option>)}</select></Field><Field label="Brand"><input className={inputClass} value={item.brand} onChange={(e) => setItem({ ...item, brand: e.target.value })} /></Field><Field label="Model"><input className={inputClass} value={item.model_number} onChange={(e) => setItem({ ...item, model_number: e.target.value })} /></Field><Field label="Serial number"><input className={inputClass} value={item.serial_number} onChange={(e) => setItem({ ...item, serial_number: e.target.value })} /></Field><Field label="Provider / vendor"><input className={inputClass} value={item.provider_name} onChange={(e) => setItem({ ...item, provider_name: e.target.value })} /></Field><Field label="Account / reference"><input className={inputClass} value={item.account_reference} onChange={(e) => setItem({ ...item, account_reference: e.target.value })} /></Field><Field label="Replacement cost"><input inputMode="decimal" className={inputClass} value={item.replacement_cost ?? ""} onChange={(e) => setItem({ ...item, replacement_cost: e.target.value })} /></Field><Field label="Purchase date"><input type="date" className={inputClass} value={item.purchase_date || ""} onChange={(e) => setItem({ ...item, purchase_date: e.target.value })} /></Field><Field label="Warranty expiration"><input type="date" className={inputClass} value={item.warranty_expiration || ""} onChange={(e) => setItem({ ...item, warranty_expiration: e.target.value })} /></Field><label className="flex items-center gap-3 rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-3 text-sm font-bold text-fuchsia-100"><input type="checkbox" checked={Boolean(item.furnished_item)} onChange={(e) => setItem({ ...item, furnished_item: e.target.checked })} />Furnished item</label><Field label="Notes" span="sm:col-span-2"><textarea rows="3" className={`${inputClass} py-3`} value={item.notes || ""} onChange={(e) => setItem({ ...item, notes: e.target.value })} /></Field></div>
            <div className="mt-4 flex justify-end"><button disabled={saving} onClick={saveItem} className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950">{saving ? "Saving..." : editing ? "Save Changes" : "Add Item"}</button></div>
          </section>

          <div className="space-y-3">{items.length ? items.map((row) => <article key={row.id} className="rounded-2xl border border-slate-800 bg-black/20 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h4 className="font-black text-white">{row.name}</h4><span className="rounded-full border border-cyan-400/20 px-2 py-1 text-[10px] font-black text-cyan-200">{pretty(row.category)}</span>{row.furnished_item ? <span className="rounded-full border border-fuchsia-400/20 px-2 py-1 text-[10px] font-black text-fuchsia-200">Furnished</span> : null}</div><div className="mt-1 text-xs text-slate-500">{[row.unit_label, row.room_location].filter(Boolean).join(" · ") || "Whole property"}</div></div><div className="flex gap-2"><button onClick={() => beginEdit(row)} className="rounded-xl border border-cyan-400/30 px-3 py-2 text-xs font-black text-cyan-100">Edit</button><button onClick={() => deleteItem(row)} className="rounded-xl border border-rose-400/30 px-3 py-2 text-xs font-black text-rose-100">Delete</button></div></div><div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-3"><div>Condition: <span className="text-white">{pretty(row.condition)}</span></div><div>Qty: <span className="text-white">{row.quantity}</span></div><div>Replacement: <span className="text-white">{row.replacement_cost ? money(row.replacement_cost) : "—"}</span></div>{row.brand || row.model_number ? <div className="sm:col-span-3">Brand / model: <span className="text-white">{[row.brand, row.model_number].filter(Boolean).join(" · ")}</span></div> : null}{row.notes ? <div className="sm:col-span-3">Notes: <span className="text-white">{row.notes}</span></div> : null}</div></article>) : <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">No inventory items yet. Add furniture, appliances, utilities, systems, keys, or warranties as needed.</div>}</div>
        </div> : null}
      </div>
    </aside>
  </div>;
}
