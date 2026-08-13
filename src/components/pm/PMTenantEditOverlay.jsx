import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../../api/client";

const control = "min-h-11 w-full rounded-2xl border border-slate-700 bg-[#050d18] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400";
const list = (data) => Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

function Field({ label, children }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-300">{label}</span>{children}</label>;
}

function messageFrom(error, fallback) {
  const data = error?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  return fallback;
}

export default function PMTenantEditOverlay() {
  const location = useLocation();
  const active = location.pathname.replace(/\/+$/, "") === "/pm/tenants";
  const [open, setOpen] = useState(false);
  const [workspace, setWorkspace] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [occupancies, setOccupancies] = useState([]);
  const [tenantId, setTenantId] = useState("");
  const [form, setForm] = useState({ first_name:"", last_name:"", email:"", phone:"", property_id:"", unit_id:"", move_in_date:"", lease_start:"", lease_end:"", monthly_rent:"", security_deposit:"", section8:false, housing_authority:"", tenant_portion:"", assistance_portion:"", notes:"" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const headers = useMemo(() => workspace?.id ? { "X-PM-Workspace-ID": String(workspace.id) } : {}, [workspace?.id]);
  const selectedTenant = tenants.find((item) => String(item.id) === String(tenantId));
  const propertyUnits = units.filter((unit) => String(unit.property) === String(form.property_id));

  async function load() {
    if (!active) return;
    try {
      const ws = (await api.get("/pm-hub/workspaces/current/")).data;
      setWorkspace(ws);
      const h = { "X-PM-Workspace-ID": String(ws.id) };
      const results = await Promise.allSettled([
        api.get("/pm-hub/tenants/", { headers: h }),
        api.get("/pm-hub/properties/", { headers: h }),
        api.get("/pm-hub/units/", { headers: h }),
        api.get("/pm-hub/occupancies/?status=ACTIVE", { headers: h }),
      ]);
      setTenants(results[0].status === "fulfilled" ? list(results[0].value.data) : []);
      setProperties(results[1].status === "fulfilled" ? list(results[1].value.data) : []);
      setUnits(results[2].status === "fulfilled" ? list(results[2].value.data) : []);
      setOccupancies(results[3].status === "fulfilled" ? list(results[3].value.data) : []);
    } catch (caught) {
      setError(messageFrom(caught, "Could not load tenant records."));
    }
  }

  useEffect(() => { if (active) load(); }, [active]);

  useEffect(() => {
    if (!selectedTenant) return;
    const occupancy = occupancies.find((item) => String(item.tenant) === String(selectedTenant.id));
    const lease = selectedTenant.active_lease || {};
    const property = properties.find((item) => String(item.id) === String(occupancy?.property)) || properties.find((item) => item.name === selectedTenant.property_name);
    setForm({
      first_name: selectedTenant.first_name || "",
      last_name: selectedTenant.last_name || "",
      email: selectedTenant.email || "",
      phone: selectedTenant.phone || "",
      property_id: property ? String(property.id) : "",
      unit_id: lease.unit ? String(lease.unit) : occupancy?.unit ? String(occupancy.unit) : "",
      move_in_date: occupancy?.move_in_date || selectedTenant.move_in_date || "",
      lease_start: lease.start_date || selectedTenant.lease_start || "",
      lease_end: lease.end_date || selectedTenant.lease_end || "",
      monthly_rent: lease.monthly_rent || selectedTenant.monthly_rent || "",
      security_deposit: lease.security_deposit || "",
      section8: Boolean(lease.section8),
      housing_authority: lease.housing_authority || "",
      tenant_portion: lease.tenant_portion || "",
      assistance_portion: lease.assistance_portion || "",
      notes: selectedTenant.notes || "",
    });
    setError("");
    setNotice("");
  }, [tenantId, tenants, occupancies, properties]);

  function set(name, value) {
    setForm((current) => ({ ...current, [name]: value, ...(name === "property_id" ? { unit_id: "" } : {}) }));
  }

  async function save(resend = false) {
    if (!tenantId) return setError("Choose a tenant to edit.");
    if (!form.first_name.trim() || !form.email.trim()) return setError("First name and email are required.");
    if (!form.property_id) return setError("Choose the tenant's property.");
    setSaving(true); setError(""); setNotice("");
    try {
      const payload = {
        ...form,
        property_id: Number(form.property_id),
        unit_id: form.unit_id ? Number(form.unit_id) : null,
        move_in_date: form.move_in_date || null,
        lease_start: form.lease_start || null,
        lease_end: form.lease_end || null,
        monthly_rent: form.monthly_rent || null,
        security_deposit: form.security_deposit || null,
        tenant_portion: form.tenant_portion || null,
        assistance_portion: form.assistance_portion || null,
      };
      await api.patch(`/pm-hub/tenants/${tenantId}/correct-profile/`, payload, { headers });
      if (resend) {
        await api.post(`/pm-hub/tenants/${tenantId}/send-invite/`, { mode: "TENANT_ONBOARDING" }, { headers });
      }
      setNotice(resend ? `Tenant updated and new invite created for ${form.email}.` : "Tenant information updated without replacing the tenant record.");
      await load();
    } catch (caught) {
      setError(messageFrom(caught, "Could not update tenant information."));
    } finally {
      setSaving(false);
    }
  }

  if (!active) return null;
  return <>
    <button type="button" onClick={() => setOpen(true)} className="fixed right-6 top-[9.5rem] z-[210] rounded-2xl border border-amber-400/30 bg-[#10131b]/95 px-4 py-3 text-xs font-black text-amber-100 shadow-2xl backdrop-blur-xl">Edit Tenant</button>
    {open ? <div className="fixed inset-0 z-[280] bg-black/70" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <aside className="ml-auto flex h-full w-full max-w-2xl flex-col border-l border-cyan-400/20 bg-[#040b14] shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-cyan-500/15 p-5"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-300">Tenant Record</div><h2 className="mt-2 text-2xl font-black text-white">Edit Tenant</h2><p className="mt-1 text-sm text-slate-400">Correct information without losing ledger, messages, documents, occupancy history, or prior invites.</p></div><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-700 px-3 py-2 text-slate-300">✕</button></header>
        <div className="flex-1 overflow-y-auto p-5">
          {error ? <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</div> : null}
          {notice ? <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{notice}</div> : null}
          <Field label="Tenant"><select className={control} value={tenantId} onChange={(e) => setTenantId(e.target.value)}><option value="">Choose tenant...</option>{tenants.map((item) => <option key={item.id} value={item.id}>{item.full_name} · {item.property_name || "No property"}</option>)}</select></Field>
          {selectedTenant ? <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="First name"><input className={control} value={form.first_name} onChange={(e) => set("first_name", e.target.value)} /></Field>
            <Field label="Last name"><input className={control} value={form.last_name} onChange={(e) => set("last_name", e.target.value)} /></Field>
            <Field label="Email"><input type="email" className={control} value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
            <Field label="Phone"><input className={control} value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
            <Field label="Property"><select className={control} value={form.property_id} onChange={(e) => set("property_id", e.target.value)}><option value="">Choose property...</option>{properties.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.address}</option>)}</select></Field>
            <Field label="Unit"><select className={control} value={form.unit_id} onChange={(e) => set("unit_id", e.target.value)}><option value="">Whole property / no unit</option>{propertyUnits.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field>
            <Field label="Move-in date"><input type="date" className={control} value={form.move_in_date} onChange={(e) => set("move_in_date", e.target.value)} /></Field>
            <Field label="Monthly rent"><input className={control} value={form.monthly_rent} onChange={(e) => set("monthly_rent", e.target.value)} /></Field>
            <Field label="Lease start"><input type="date" className={control} value={form.lease_start} onChange={(e) => set("lease_start", e.target.value)} /></Field>
            <Field label="Lease end"><input type="date" className={control} value={form.lease_end} onChange={(e) => set("lease_end", e.target.value)} /></Field>
            <Field label="Security deposit"><input className={control} value={form.security_deposit} onChange={(e) => set("security_deposit", e.target.value)} /></Field>
            <label className="flex items-center gap-3 rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-4 text-sm font-bold text-fuchsia-100"><input type="checkbox" checked={form.section8} onChange={(e) => set("section8", e.target.checked)} />Section 8 / housing assistance</label>
            {form.section8 ? <><Field label="Housing authority"><input className={control} value={form.housing_authority} onChange={(e) => set("housing_authority", e.target.value)} /></Field><Field label="Tenant portion"><input className={control} value={form.tenant_portion} onChange={(e) => set("tenant_portion", e.target.value)} /></Field><Field label="Assistance portion"><input className={control} value={form.assistance_portion} onChange={(e) => set("assistance_portion", e.target.value)} /></Field></> : null}
            <div className="sm:col-span-2"><Field label="Internal notes"><textarea rows="4" className={`${control} py-3`} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></Field></div>
          </div> : null}
        </div>
        <footer className="grid gap-2 border-t border-cyan-500/15 p-4 sm:grid-cols-2"><button type="button" disabled={!selectedTenant || saving} onClick={() => save(false)} className="rounded-2xl border border-cyan-400/30 px-4 py-3 text-sm font-black text-cyan-100 disabled:opacity-40">{saving ? "Saving..." : "Save Changes"}</button><button type="button" disabled={!selectedTenant || saving} onClick={() => save(true)} className="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-40">Save & Resend Invite</button></footer>
      </aside>
    </div> : null}
  </>;
}
