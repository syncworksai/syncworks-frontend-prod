import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/client";

const inputClass = "min-h-11 w-full rounded-2xl border border-slate-700 bg-[#050d18] px-3 text-sm text-white outline-none focus:border-cyan-400";
const labelClass = "space-y-1.5 text-xs font-bold text-slate-300";

const money = (value) => Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
const pretty = (value) => String(value || "").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

function Field({ label, children, span = "" }) {
  return <label className={`${labelClass} ${span}`}><span>{label}</span>{children}</label>;
}

function TextInput({ value, onChange, type = "text", placeholder = "" }) {
  return <input className={inputClass} type={type} value={value ?? ""} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />;
}

function TextArea({ value, onChange, rows = 3, placeholder = "" }) {
  return <textarea className={`${inputClass} min-h-24 py-3`} rows={rows} value={value ?? ""} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />;
}

function LeasePrintView({ fields, template }) {
  const section = (title, children) => <section className="mb-5 break-inside-avoid"><h2 className="mb-2 border-b border-slate-400 pb-1 text-base font-bold text-black">{title}</h2><div className="space-y-2 text-sm leading-6 text-black">{children}</div></section>;
  return <article id="lease-print-view" className="mx-auto max-w-[850px] bg-white p-8 text-black shadow-2xl print:max-w-none print:p-0 print:shadow-none">
    <header className="mb-8 text-center"><div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-600">SyncWorks Document Builder</div><h1 className="mt-3 text-3xl font-black">{fields.document_title || template?.name || "Residential Lease Agreement"}</h1><p className="mt-2 text-sm text-slate-600">Draft for review. Final legal language must match the approved company template and governing requirements.</p></header>
    {section("1. Parties and Premises", <><p><strong>Landlord/Owner:</strong> {fields.landlord_name || "Not entered"}</p><p><strong>Property Manager:</strong> {fields.manager_name || fields.landlord_name || "Not entered"}</p><p><strong>Tenant:</strong> {fields.tenant_name || "Not selected"}</p><p><strong>Premises:</strong> {[fields.property_address, fields.unit_label, fields.property_city, fields.property_state, fields.property_zip].filter(Boolean).join(", ")}</p></>)}
    {section("2. Lease Term", <><p><strong>Term:</strong> {pretty(fields.lease_term)}</p><p><strong>Start:</strong> {fields.lease_start || "Not entered"}</p><p><strong>End:</strong> {fields.lease_end || "Month-to-month / not entered"}</p><p><strong>Converts to month-to-month:</strong> {fields.converts_to_month_to_month ? "Yes" : "No"}</p></>)}
    {section("3. Rent and Payment", <><p><strong>Monthly rent:</strong> {money(fields.monthly_rent)}</p><p><strong>Due day:</strong> Day {fields.rent_due_day || 1} of each month</p>{fields.section8 ? <><p><strong>Tenant portion:</strong> {money(fields.tenant_portion)}</p><p><strong>Housing assistance portion:</strong> {money(fields.assistance_portion)}</p><p><strong>Housing authority:</strong> {fields.housing_authority || "Not entered"}</p></> : null}<p><strong>Late-fee terms:</strong> {fields.late_fee_summary || "Not entered"}</p><p><strong>Payment arrangement:</strong> {fields.payment_arrangement_summary || "None"}</p></>)}
    {section("4. Security Deposit", <><p><strong>Security deposit:</strong> {money(fields.security_deposit)}</p><p>Deposit handling, application, deductions, and return will follow the signed agreement and applicable requirements.</p></>)}
    {section("5. Utilities and Appliances", <><p><strong>Landlord-paid utilities:</strong> {(fields.utilities_landlord || []).join(", ") || "None listed"}</p><p><strong>Tenant-paid utilities:</strong> {(fields.utilities_tenant || []).join(", ") || "None listed"}</p><p><strong>Included appliances:</strong> {(fields.included_appliances || []).join(", ") || "None listed"}</p></>)}
    {section("6. Occupancy, Pets, and Maintenance", <><p><strong>Authorized occupants:</strong> {(fields.occupants || []).join(", ") || fields.tenant_name || "Not entered"}</p><p><strong>Pet terms:</strong> {fields.pet_terms || "No additional terms entered"}</p><p><strong>Maintenance terms:</strong> {fields.maintenance_terms || "Not entered"}</p></>)}
    {fields.section8 ? section("7. Housing Assistance", <><p>This lease is connected to a housing-assistance record. Required housing-authority documents and addenda must be attached before signature.</p><p><strong>Required addenda:</strong> {(fields.addenda || []).join(", ") || "Housing assistance tenancy addendum"}</p></>) : null}
    {section(fields.section8 ? "8. Special Terms and Addenda" : "7. Special Terms and Addenda", <><p>{fields.special_terms || "No additional special terms entered."}</p><p><strong>Addenda:</strong> {(fields.addenda || []).join(", ") || "None listed"}</p></>)}
    {section(fields.section8 ? "9. Notices and Signatures" : "8. Notices and Signatures", <><p><strong>Manager contact:</strong> {[fields.manager_name, fields.manager_email, fields.manager_phone].filter(Boolean).join(" · ")}</p><div className="mt-10 grid grid-cols-2 gap-12"><div><div className="border-b border-black pt-10" /><p className="mt-1 text-xs">Landlord/Manager Signature & Date</p></div><div><div className="border-b border-black pt-10" /><p className="mt-1 text-xs">Tenant Signature & Date</p></div></div></>)}
    <footer className="mt-8 border-t border-slate-300 pt-3 text-xs text-slate-500">Generated from saved SyncWorks property, tenant, lease, and billing data. Packet status: {fields.signature_status || "DRAFT"}.</footer>
  </article>;
}

export default function PMLeaseBuilder() {
  const nav = useNavigate();
  const { propertyId } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [data, setData] = useState(null);
  const [tenantId, setTenantId] = useState("");
  const [packetId, setPacketId] = useState(null);
  const [fields, setFields] = useState({});
  const [step, setStep] = useState("setup");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const workspaceResponse = await api.get("/pm-hub/workspaces/current/");
        if (!alive) return;
        const current = workspaceResponse.data;
        setWorkspace(current);
        const response = await api.get(`/pm-hub/lease-builder/properties/${propertyId}/`, { headers: { "X-PM-Workspace-ID": String(current.id) } });
        if (!alive) return;
        setData(response.data);
        if (response.data.tenants?.length === 1) setTenantId(String(response.data.tenants[0].id));
      } catch (caught) {
        setError(caught?.response?.data?.detail || caught?.message || "Could not load the lease builder.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [propertyId]);

  useEffect(() => {
    if (!tenantId || !workspace) return;
    let alive = true;
    api.get(`/pm-hub/lease-builder/properties/${propertyId}/tenants/${tenantId}/prefill/`, { headers: { "X-PM-Workspace-ID": String(workspace.id) } })
      .then((response) => { if (alive) { setFields(response.data.fields || {}); setPacketId(null); setNotice("Saved property, tenant, lease, owner, and Section 8 details loaded."); } })
      .catch((caught) => { if (alive) setError(caught?.response?.data?.detail || "Could not prefill the lease."); });
    return () => { alive = false; };
  }, [tenantId, workspace, propertyId]);

  const template = useMemo(() => data?.templates?.find((item) => item.id === fields.template_id), [data, fields.template_id]);
  const update = (key, value) => setFields((current) => ({ ...current, [key]: value }));
  const listUpdate = (key, value) => update(key, value.split(",").map((item) => item.trim()).filter(Boolean));

  async function saveDraft() {
    if (!tenantId) { setError("Choose a tenant connected to this property."); return; }
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await api.post(`/pm-hub/lease-builder/properties/${propertyId}/save/`, { tenant_id: Number(tenantId), packet_id: packetId, template_id: fields.template_id, fields }, { headers: { "X-PM-Workspace-ID": String(workspace.id) } });
      setPacketId(response.data.packet.id);
      setFields(response.data.packet.field_data);
      setNotice("Lease draft saved to the tenant and property document record.");
    } catch (caught) {
      setError(caught?.response?.data?.detail || "Could not save the lease draft.");
    } finally { setSaving(false); }
  }

  async function finalize() {
    if (!packetId) await saveDraft();
    const activePacket = packetId;
    if (!activePacket) { setNotice("Save the draft, then mark it ready for signatures."); return; }
    setSaving(true); setError("");
    try {
      const response = await api.post(`/pm-hub/lease-builder/packets/${activePacket}/finalize/`, {}, { headers: { "X-PM-Workspace-ID": String(workspace.id) } });
      setFields(response.data.field_data);
      setNotice("Lease marked ready for PDF review and signatures.");
      setStep("preview");
    } catch (caught) { setError(caught?.response?.data?.detail || "Could not finalize the lease."); }
    finally { setSaving(false); }
  }

  if (loading) return <main className="p-6 text-slate-400">Loading lease builder...</main>;
  if (error && !data) return <main className="space-y-4 p-6"><div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-100">{error}</div><button onClick={() => nav(`/pm/properties/${propertyId}`)} className="rounded-xl border border-slate-700 px-4 py-2">Back</button></main>;

  return <main className="space-y-5 px-4 py-6 sm:px-6">
    <section className="rounded-[30px] border border-cyan-400/20 bg-gradient-to-br from-cyan-500/12 via-[#07111f] to-fuchsia-500/10 p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">Paperwork Automation</div><h1 className="mt-2 text-3xl font-black text-white">Internal Lease Builder</h1><p className="mt-2 max-w-3xl text-sm text-slate-400">Reuse saved property and tenant data, review only exceptions, then save a PDF-ready lease packet.</p></div><button onClick={() => nav(`/pm/properties/${propertyId}`)} className="min-h-11 rounded-2xl border border-slate-700 px-4 text-sm font-black text-slate-200">Back to Property</button></div>
    </section>

    {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}
    {notice ? <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">{notice}</div> : null}

    <div className="flex gap-2 overflow-x-auto rounded-2xl border border-cyan-500/15 bg-[#07111f] p-2 print:hidden">{[["setup", "1. Setup"], ["terms", "2. Terms"], ["preview", "3. Preview & PDF"]].map(([key, label]) => <button key={key} onClick={() => setStep(key)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-black ${step === key ? "bg-cyan-400 text-slate-950" : "text-slate-400"}`}>{label}</button>)}</div>

    {step === "setup" ? <section className="rounded-[28px] border border-cyan-500/15 bg-[#07111f] p-5 print:hidden">
      <h2 className="text-xl font-black text-white">Choose the connected tenant and template</h2><p className="mt-1 text-sm text-slate-500">Only tenants connected to {data?.property?.name} are shown.</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2"><Field label="Tenant"><select className={inputClass} value={tenantId} onChange={(event) => setTenantId(event.target.value)}><option value="">Choose tenant</option>{data?.tenants?.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} · {tenant.unit_label || "No unit"}</option>)}</select></Field><Field label="Lease template"><select className={inputClass} value={fields.template_id || "standard_residential"} onChange={(event) => update("template_id", event.target.value)}>{data?.templates?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field></div>
      {template ? <div className="mt-5 rounded-2xl border border-slate-800 bg-black/20 p-4"><div className="font-bold text-white">{template.name}</div><p className="mt-1 text-sm text-slate-400">{template.description}</p><div className="mt-3 flex flex-wrap gap-2">{template.sections.map((item) => <span key={item} className="rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-1 text-[10px] font-bold text-cyan-200">{item}</span>)}</div></div> : null}
      <div className="mt-5 flex justify-end"><button disabled={!tenantId} onClick={() => setStep("terms")} className="min-h-11 rounded-2xl bg-cyan-400 px-5 text-sm font-black text-slate-950 disabled:opacity-40">Review Lease Terms</button></div>
    </section> : null}

    {step === "terms" ? <section className="space-y-5 print:hidden">
      <div className="rounded-[28px] border border-cyan-500/15 bg-[#07111f] p-5"><h2 className="text-xl font-black text-white">Parties and property</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><Field label="Document title"><TextInput value={fields.document_title} onChange={(v) => update("document_title", v)} /></Field><Field label="Tenant"><TextInput value={fields.tenant_name} onChange={(v) => update("tenant_name", v)} /></Field><Field label="Landlord/owner"><TextInput value={fields.landlord_name} onChange={(v) => update("landlord_name", v)} /></Field><Field label="Property manager"><TextInput value={fields.manager_name} onChange={(v) => update("manager_name", v)} /></Field><Field label="Property address" span="md:col-span-2"><TextInput value={fields.property_address} onChange={(v) => update("property_address", v)} /></Field><Field label="Unit"><TextInput value={fields.unit_label} onChange={(v) => update("unit_label", v)} /></Field><Field label="Manager email"><TextInput value={fields.manager_email} onChange={(v) => update("manager_email", v)} type="email" /></Field></div></div>
      <div className="rounded-[28px] border border-cyan-500/15 bg-[#07111f] p-5"><h2 className="text-xl font-black text-white">Term, rent, and deposit</h2><div className="mt-4 grid gap-4 md:grid-cols-3"><Field label="Lease term"><select className={inputClass} value={fields.lease_term || "TWELVE_MONTH"} onChange={(e) => update("lease_term", e.target.value)}><option value="MONTH_TO_MONTH">Month to month</option><option value="SIX_MONTH">6 month</option><option value="TWELVE_MONTH">12 month</option><option value="CUSTOM">Custom</option></select></Field><Field label="Start date"><TextInput type="date" value={fields.lease_start} onChange={(v) => update("lease_start", v)} /></Field><Field label="End date"><TextInput type="date" value={fields.lease_end} onChange={(v) => update("lease_end", v)} /></Field><Field label="Monthly rent"><TextInput type="number" value={fields.monthly_rent} onChange={(v) => update("monthly_rent", v)} /></Field><Field label="Rent due day"><TextInput type="number" value={fields.rent_due_day} onChange={(v) => update("rent_due_day", v)} /></Field><Field label="Security deposit"><TextInput type="number" value={fields.security_deposit} onChange={(v) => update("security_deposit", v)} /></Field><Field label="Late-fee terms" span="md:col-span-3"><TextArea value={fields.late_fee_summary} onChange={(v) => update("late_fee_summary", v)} placeholder="Example: $50 after the 5th and an additional $50 after the 10th, subject to any approved arrangement." /></Field><Field label="Payment arrangement" span="md:col-span-3"><TextArea value={fields.payment_arrangement_summary} onChange={(v) => update("payment_arrangement_summary", v)} placeholder="Leave blank when none applies." /></Field></div></div>
      <div className="rounded-[28px] border border-cyan-500/15 bg-[#07111f] p-5"><h2 className="text-xl font-black text-white">Utilities, occupants, and exceptions</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><Field label="Landlord-paid utilities"><TextInput value={(fields.utilities_landlord || []).join(", ")} onChange={(v) => listUpdate("utilities_landlord", v)} placeholder="Water, trash" /></Field><Field label="Tenant-paid utilities"><TextInput value={(fields.utilities_tenant || []).join(", ")} onChange={(v) => listUpdate("utilities_tenant", v)} placeholder="Electric, gas" /></Field><Field label="Included appliances"><TextInput value={(fields.included_appliances || []).join(", ")} onChange={(v) => listUpdate("included_appliances", v)} /></Field><Field label="Authorized occupants"><TextInput value={(fields.occupants || []).join(", ")} onChange={(v) => listUpdate("occupants", v)} /></Field><Field label="Pet terms" span="md:col-span-2"><TextArea value={fields.pet_terms} onChange={(v) => update("pet_terms", v)} /></Field><Field label="Maintenance terms" span="md:col-span-2"><TextArea value={fields.maintenance_terms} onChange={(v) => update("maintenance_terms", v)} /></Field><Field label="Special terms" span="md:col-span-2"><TextArea value={fields.special_terms} onChange={(v) => update("special_terms", v)} /></Field><Field label="Addenda"><TextInput value={(fields.addenda || []).join(", ")} onChange={(v) => listUpdate("addenda", v)} /></Field><Field label="Housing authority"><TextInput value={fields.housing_authority} onChange={(v) => update("housing_authority", v)} /></Field></div></div>
      <div className="flex flex-wrap justify-end gap-3"><button disabled={saving} onClick={saveDraft} className="min-h-11 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-5 text-sm font-black text-cyan-100">{saving ? "Saving..." : "Save Draft"}</button><button disabled={saving} onClick={async () => { await saveDraft(); setStep("preview"); }} className="min-h-11 rounded-2xl bg-cyan-400 px-5 text-sm font-black text-slate-950">Save & Preview</button></div>
    </section> : null}

    {step === "preview" ? <section className="space-y-4"><div className="flex flex-wrap justify-end gap-3 print:hidden"><button onClick={() => setStep("terms")} className="min-h-11 rounded-2xl border border-slate-700 px-4 text-sm font-black text-slate-200">Edit Terms</button><button onClick={saveDraft} disabled={saving} className="min-h-11 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 text-sm font-black text-cyan-100">Save Draft</button><button onClick={finalize} disabled={saving || !packetId} className="min-h-11 rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/15 px-4 text-sm font-black text-fuchsia-100">Ready for Signatures</button><button onClick={() => window.print()} className="min-h-11 rounded-2xl bg-cyan-400 px-5 text-sm font-black text-slate-950">Print / Save PDF</button></div><LeasePrintView fields={fields} template={template} /></section> : null}

    {data?.drafts?.length ? <section className="rounded-[28px] border border-cyan-500/15 bg-[#07111f] p-5 print:hidden"><h2 className="text-lg font-black text-white">Saved lease drafts</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{data.drafts.map((draft) => <button key={draft.id} onClick={() => { setPacketId(draft.id); setTenantId(String(draft.tenant_id)); setFields(draft.field_data || {}); setStep("terms"); }} className="rounded-2xl border border-slate-800 bg-black/20 p-4 text-left"><div className="font-bold text-white">{draft.tenant_name}</div><div className="mt-1 text-xs text-slate-500">{draft.template_name} · {pretty(draft.status)}</div></button>)}</div></section> : null}
  </main>;
}
