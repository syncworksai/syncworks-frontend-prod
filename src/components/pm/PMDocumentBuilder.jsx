import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client";

const inputClass = "min-h-11 w-full rounded-2xl border border-slate-700 bg-[#050d18] px-3 text-sm text-white outline-none focus:border-cyan-400";
const labelClass = "space-y-1.5 text-xs font-bold text-slate-300";
const money = (value) => Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
const pretty = (value) => String(value || "").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

function Field({ label, children, span = "" }) {
  return <label className={`${labelClass} ${span}`}><span>{label}</span>{children}</label>;
}

function Input({ value, onChange, type = "text", placeholder = "" }) {
  return <input type={type} className={inputClass} value={value ?? ""} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />;
}

function TextArea({ value, onChange, placeholder = "", rows = 3 }) {
  return <textarea rows={rows} className={`${inputClass} min-h-24 py-3`} value={value ?? ""} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />;
}

function Select({ value, onChange, children }) {
  return <select className={inputClass} value={value ?? ""} onChange={(event) => onChange(event.target.value)}>{children}</select>;
}

function Section({ title, children }) {
  return <section className="rounded-[24px] border border-slate-800 bg-black/20 p-4 sm:p-5"><h4 className="text-sm font-black text-white">{title}</h4><div className="mt-4 grid gap-4 md:grid-cols-2">{children}</div></section>;
}

function PrintSection({ title, children }) {
  return <section style={{ marginBottom: 22, pageBreakInside: "avoid" }}><h2 style={{ fontSize: 16, borderBottom: "1px solid #aaa", paddingBottom: 5, marginBottom: 9 }}>{title}</h2><div style={{ fontSize: 13, lineHeight: 1.55 }}>{children}</div></section>;
}

function Row({ label, value }) {
  return <p style={{ margin: "5px 0" }}><strong>{label}:</strong> {value || "—"}</p>;
}

function DocumentPreview({ templateId, fields }) {
  const address = [fields.property_address, fields.unit_label, fields.property_city, fields.property_state, fields.property_zip].filter(Boolean).join(", ");
  const people = <><Row label="Property" value={fields.property_name} /><Row label="Premises" value={address} />{fields.tenant_name ? <Row label="Tenant" value={fields.tenant_name} /> : null}<Row label="Owner / Landlord" value={fields.owner_name} /><Row label="Property Manager" value={fields.manager_name} /></>;

  let body = null;
  if (templateId === "residential_lease") body = <>
    <PrintSection title="Parties and Premises">{people}</PrintSection>
    <PrintSection title="Lease Term"><Row label="Start" value={fields.lease_start} /><Row label="End" value={fields.lease_end || "Month-to-month / not entered"} /><Row label="Term" value={pretty(fields.lease_term)} /></PrintSection>
    <PrintSection title="Rent, Deposit, and Late Fees"><Row label="Monthly rent" value={money(fields.monthly_rent)} /><Row label="Rent due" value={`Day ${fields.rent_due_day || 1} of each month`} /><Row label="Security deposit" value={money(fields.security_deposit)} /><Row label="Late-fee terms" value={fields.late_fee_summary} />{fields.payment_arrangement_enabled ? <Row label="Current payment arrangement" value={`${pretty(fields.payment_arrangement_frequency)} · ${money(fields.payment_arrangement_amount)}`} /> : null}</PrintSection>
    {fields.section8 ? <PrintSection title="Housing Assistance"><Row label="Housing authority" value={fields.housing_authority} /><Row label="Tenant portion" value={money(fields.tenant_portion)} /><Row label="Assistance portion" value={money(fields.assistance_portion)} /></PrintSection> : null}
    <PrintSection title="Utilities, Occupants, and Terms"><Row label="Landlord-paid utilities" value={(fields.utilities_landlord || []).join(", ")} /><Row label="Tenant-paid utilities" value={(fields.utilities_tenant || []).join(", ")} /><Row label="Included appliances" value={(fields.included_appliances || []).join(", ")} /><Row label="Authorized occupants" value={(fields.authorized_occupants || []).join(", ")} /><Row label="Pet terms" value={fields.pet_terms} /><Row label="Maintenance terms" value={fields.maintenance_terms} /><Row label="Special terms" value={fields.special_terms} /><Row label="Addenda" value={(fields.addenda || []).join(", ")} /></PrintSection>
  </>;
  if (templateId === "move_in_inspection") body = <><PrintSection title="Move-In Details">{people}<Row label="Inspection date" value={fields.inspection_date} /><Row label="Move-in date" value={fields.move_in_date} /></PrintSection><PrintSection title="Condition Checklist"><Row label="Areas reviewed" value={(fields.rooms || []).join(", ")} /><Row label="Condition notes" value={fields.general_condition_notes} /><Row label="Keys received" value={fields.keys_received} /><Row label="Meter readings" value={fields.meter_readings} /><Row label="Photo notes" value={fields.photo_notes} /></PrintSection></>;
  if (templateId === "security_deposit_receipt") body = <><PrintSection title="Deposit Receipt">{people}<Row label="Receipt date" value={fields.receipt_date} /><Row label="Required deposit" value={money(fields.deposit_required || fields.security_deposit)} /><Row label="Received" value={money(fields.deposit_received)} /><Row label="Currently held" value={money(fields.deposit_held)} /><Row label="Applied" value={money(fields.deposit_applied)} /><Row label="Payment method" value={fields.payment_method} /><Row label="Terms / notes" value={fields.deposit_terms || fields.deposit_notes} /></PrintSection></>;
  if (templateId === "payment_arrangement") body = <><PrintSection title="Payment Arrangement">{people}<Row label="Current balance" value={money(fields.current_balance || fields.case_current_balance)} /><Row label="Installment amount" value={money(fields.payment_arrangement_amount)} /><Row label="Frequency" value={pretty(fields.payment_arrangement_frequency)} /><Row label="Start" value={fields.first_payment_date || fields.payment_arrangement_start} /><Row label="End" value={fields.payment_arrangement_end} /><Row label="Late-fee treatment" value={fields.late_fee_summary} /><Row label="Arrangement notes" value={fields.arrangement_notes} /><Row label="Default terms" value={fields.default_terms} /></PrintSection></>;
  if (templateId === "move_out_inspection") body = <><PrintSection title="Move-Out Details">{people}<Row label="Move-out date" value={fields.move_out_date} /><Row label="Inspection date" value={fields.inspection_date} /><Row label="Move-out reason" value={fields.move_out_reason} /><Row label="Forwarding address" value={fields.forwarding_address} /></PrintSection><PrintSection title="Condition and Deposit"><Row label="Areas reviewed" value={(fields.rooms || []).join(", ")} /><Row label="Condition notes" value={fields.general_condition_notes} /><Row label="Keys returned" value={fields.keys_returned} /><Row label="Make-ready notes" value={fields.make_ready_notes} /><Row label="Deposit held" value={money(fields.deposit_held)} /><Row label="Deposit applied" value={money(fields.deposit_applied)} /><Row label="Deposit disposition" value={fields.deposit_disposition_notes} /></PrintSection></>;
  if (templateId === "nonpayment_notice") body = <><PrintSection title="Notice Information">{people}<Row label="Notice date" value={fields.notice_date} /><Row label="Amount due" value={money(fields.amount_due)} /><Row label="Lease dates" value={`${fields.lease_start || "—"} through ${fields.lease_end || "—"}`} /><Row label="Delivery method" value={fields.delivery_method} /><Row label="Delivery date" value={fields.delivery_date} /></PrintSection><PrintSection title="Approved Notice Language"><p>{fields.notice_body || "Use company-approved notice language before delivery."}</p></PrintSection></>;
  if (templateId === "collections_packet") body = <><PrintSection title="Former Tenant / Account">{people}<Row label="Occupancy status" value={pretty(fields.occupancy_status)} /><Row label="Move-out date" value={fields.move_out_date} /><Row label="Case" value={[pretty(fields.case_type), pretty(fields.case_status), fields.case_reference].filter(Boolean).join(" · ")} /><Row label="Current case balance" value={money(fields.case_current_balance)} /><Row label="Agency" value={[fields.case_agency_name, fields.case_agency_email].filter(Boolean).join(" · ")} /></PrintSection><PrintSection title="Collections Summary"><Row label="Account summary" value={fields.account_summary} /><Row label="Repair charges" value={fields.repair_charges_summary} /><Row label="Supporting documents" value={(fields.supporting_documents || []).join(", ")} /><Row label="Adjustments / notes" value={fields.adjustment_notes} /></PrintSection></>;
  if (templateId === "owner_make_ready_scope") body = <><PrintSection title="Property and Owner">{people}</PrintSection><PrintSection title="Make-Ready Scope"><Row label="Scope items" value={(fields.scope_items || []).join(", ")} /><Row label="Estimated cost" value={money(fields.estimated_cost)} /><Row label="Owner approval limit" value={money(fields.approval_limit)} /><Row label="Target completion" value={fields.target_completion_date} /><Row label="Assigned team / vendor" value={fields.vendor_or_team} /><Row label="Approval notes" value={fields.owner_approval_notes} /></PrintSection></>;

  return <article className="sw-document-print mx-auto max-w-[850px] bg-white p-7 text-black shadow-2xl sm:p-10">
    <header style={{ textAlign: "center", marginBottom: 28 }}><div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: "#64748b" }}>SYNCWORKS DOCUMENT BUILDER</div><h1 style={{ fontSize: 28, margin: "10px 0 4px", fontWeight: 900 }}>{fields.document_title || "Generated Document"}</h1><div style={{ fontSize: 12, color: "#64748b" }}>Generated {fields.generated_on || ""} · Structured working copy</div></header>
    {body}
    <PrintSection title="Acknowledgement / Signatures"><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 36, marginTop: 42 }}><div><div style={{ borderBottom: "1px solid #111", height: 30 }} /><small>Manager / Owner Signature & Date</small></div>{fields.tenant_name ? <div><div style={{ borderBottom: "1px solid #111", height: 30 }} /><small>Tenant Signature & Date</small></div> : <div><div style={{ borderBottom: "1px solid #111", height: 30 }} /><small>Owner Approval & Date</small></div>}</div></PrintSection>
    <footer style={{ borderTop: "1px solid #ddd", paddingTop: 8, fontSize: 10, color: "#64748b" }}>Generated from saved SyncWorks property, occupancy, tenant, billing, case, and owner data. Company-approved legal language and required addenda control over this working copy.</footer>
  </article>;
}

export default function PMDocumentBuilder({ workspace, property, tenants = [] }) {
  const [bootstrap, setBootstrap] = useState(null);
  const [templateId, setTemplateId] = useState("residential_lease");
  const [tenantId, setTenantId] = useState("");
  const [fields, setFields] = useState({});
  const [packetId, setPacketId] = useState(null);
  const [step, setStep] = useState("setup");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const headers = useMemo(() => ({ "X-PM-Workspace-ID": String(workspace?.id || "") }), [workspace]);
  const activeTemplate = useMemo(() => bootstrap?.templates?.find((item) => item.id === templateId), [bootstrap, templateId]);
  const availableTenants = bootstrap?.tenants?.length ? bootstrap.tenants : tenants;

  useEffect(() => {
    if (!workspace?.id || !property?.id) return;
    let alive = true;
    setLoading(true);
    api.get(`/pm-hub/document-builder/properties/${property.id}/`, { headers })
      .then((response) => {
        if (!alive) return;
        setBootstrap(response.data);
        if (response.data.tenants?.length === 1) setTenantId(String(response.data.tenants[0].id));
      })
      .catch((caught) => { if (alive) setError(caught?.response?.data?.detail || "Could not load the document builder."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [workspace?.id, property?.id]);

  const update = (key, value) => setFields((current) => ({ ...current, [key]: value }));
  const listUpdate = (key, value) => update(key, value.split(",").map((item) => item.trim()).filter(Boolean));

  async function loadPrefill(nextTemplate = templateId, nextTenant = tenantId) {
    const template = bootstrap?.templates?.find((item) => item.id === nextTemplate);
    if (!template) return;
    if (template.requires_tenant && !nextTenant) { setError("Choose a tenant for this document."); return; }
    setError(""); setNotice(""); setSaving(true);
    try {
      const response = await api.get(`/pm-hub/document-builder/properties/${property.id}/templates/${nextTemplate}/prefill/`, { headers, params: nextTenant ? { tenant_id: nextTenant } : {} });
      setFields(response.data.fields || {});
      setPacketId(null);
      setNotice("Saved property, tenant, lease, billing, occupancy, owner, and case data loaded. Review only the exceptions.");
      setStep("edit");
    } catch (caught) { setError(caught?.response?.data?.detail || "Could not prefill this document."); }
    finally { setSaving(false); }
  }

  async function saveDraft() {
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await api.post(`/pm-hub/document-builder/properties/${property.id}/save/`, { template_id: templateId, tenant_id: tenantId ? Number(tenantId) : null, packet_id: packetId, fields }, { headers });
      setPacketId(response.data.packet.id);
      setFields(response.data.packet.field_data || fields);
      setNotice("Document draft saved to the property and tenant records.");
      return response.data.packet.id;
    } catch (caught) { setError(caught?.response?.data?.detail || "Could not save this document."); return null; }
    finally { setSaving(false); }
  }

  async function finalize() {
    let id = packetId;
    if (!id) id = await saveDraft();
    if (!id) return;
    setSaving(true); setError("");
    try {
      const response = await api.post(`/pm-hub/document-builder/packets/${id}/finalize/`, { ready_for_signature: true }, { headers });
      setFields(response.data.field_data || fields);
      setNotice(response.data.detail || "Document ready for PDF review and signatures.");
      setStep("preview");
    } catch (caught) { setError(caught?.response?.data?.detail || "Could not finalize this document."); }
    finally { setSaving(false); }
  }

  function printPdf() {
    const source = document.querySelector(".sw-document-print");
    if (!source) return;
    const popup = window.open("", "_blank", "width=900,height=1100");
    if (!popup) { setError("Allow pop-ups for SyncWorks to open the PDF print view."); return; }
    popup.document.write(`<!doctype html><html><head><title>${fields.document_title || "SyncWorks Document"}</title><style>body{font-family:Arial,Helvetica,sans-serif;margin:0;background:white;color:#111}article{max-width:850px;margin:0 auto;padding:36px;box-sizing:border-box}@media print{article{max-width:none;padding:0}}</style></head><body>${source.outerHTML}<script>window.onload=()=>setTimeout(()=>window.print(),150);<\/script></body></html>`);
    popup.document.close();
  }

  function commonFields() {
    return <Section title="Parties, property, and contacts"><Field label="Document title" span="md:col-span-2"><Input value={fields.document_title} onChange={(v) => update("document_title", v)} /></Field><Field label="Tenant"><Input value={fields.tenant_name} onChange={(v) => update("tenant_name", v)} /></Field><Field label="Tenant email"><Input value={fields.tenant_email} onChange={(v) => update("tenant_email", v)} /></Field><Field label="Owner / landlord"><Input value={fields.owner_name} onChange={(v) => update("owner_name", v)} /></Field><Field label="Manager"><Input value={fields.manager_name} onChange={(v) => update("manager_name", v)} /></Field><Field label="Property address" span="md:col-span-2"><Input value={fields.property_address} onChange={(v) => update("property_address", v)} /></Field></Section>;
  }

  function editor() {
    if (templateId === "residential_lease") return <>{commonFields()}<Section title="Lease, rent, deposit, and assistance"><Field label="Lease start"><Input type="date" value={fields.lease_start} onChange={(v) => update("lease_start", v)} /></Field><Field label="Lease end"><Input type="date" value={fields.lease_end} onChange={(v) => update("lease_end", v)} /></Field><Field label="Monthly rent"><Input type="number" value={fields.monthly_rent} onChange={(v) => update("monthly_rent", v)} /></Field><Field label="Rent due day"><Input type="number" value={fields.rent_due_day} onChange={(v) => update("rent_due_day", v)} /></Field><Field label="Security deposit"><Input type="number" value={fields.security_deposit} onChange={(v) => update("security_deposit", v)} /></Field><Field label="Housing authority"><Input value={fields.housing_authority} onChange={(v) => update("housing_authority", v)} /></Field><Field label="Late-fee terms" span="md:col-span-2"><TextArea value={fields.late_fee_summary} onChange={(v) => update("late_fee_summary", v)} /></Field></Section><Section title="Utilities, occupants, and exceptions"><Field label="Landlord-paid utilities"><Input value={(fields.utilities_landlord || []).join(", ")} onChange={(v) => listUpdate("utilities_landlord", v)} /></Field><Field label="Tenant-paid utilities"><Input value={(fields.utilities_tenant || []).join(", ")} onChange={(v) => listUpdate("utilities_tenant", v)} /></Field><Field label="Included appliances"><Input value={(fields.included_appliances || []).join(", ")} onChange={(v) => listUpdate("included_appliances", v)} /></Field><Field label="Authorized occupants"><Input value={(fields.authorized_occupants || []).join(", ")} onChange={(v) => listUpdate("authorized_occupants", v)} /></Field><Field label="Pet terms" span="md:col-span-2"><TextArea value={fields.pet_terms} onChange={(v) => update("pet_terms", v)} /></Field><Field label="Maintenance terms" span="md:col-span-2"><TextArea value={fields.maintenance_terms} onChange={(v) => update("maintenance_terms", v)} /></Field><Field label="Special terms" span="md:col-span-2"><TextArea value={fields.special_terms} onChange={(v) => update("special_terms", v)} /></Field><Field label="Addenda" span="md:col-span-2"><Input value={(fields.addenda || []).join(", ")} onChange={(v) => listUpdate("addenda", v)} /></Field></Section></>;
    if (["move_in_inspection", "move_out_inspection"].includes(templateId)) return <>{commonFields()}<Section title={templateId === "move_in_inspection" ? "Move-in inspection" : "Move-out inspection"}><Field label="Inspection date"><Input type="date" value={fields.inspection_date} onChange={(v) => update("inspection_date", v)} /></Field><Field label={templateId === "move_in_inspection" ? "Keys received" : "Keys returned"}><Input value={templateId === "move_in_inspection" ? fields.keys_received : fields.keys_returned} onChange={(v) => update(templateId === "move_in_inspection" ? "keys_received" : "keys_returned", v)} /></Field><Field label="Areas reviewed" span="md:col-span-2"><Input value={(fields.rooms || []).join(", ")} onChange={(v) => listUpdate("rooms", v)} /></Field><Field label="Condition notes" span="md:col-span-2"><TextArea rows={5} value={fields.general_condition_notes} onChange={(v) => update("general_condition_notes", v)} placeholder="Record condition, damage, cleanliness, safety issues, and photo references." /></Field>{templateId === "move_in_inspection" ? <><Field label="Meter readings"><Input value={fields.meter_readings} onChange={(v) => update("meter_readings", v)} /></Field><Field label="Photo notes"><Input value={fields.photo_notes} onChange={(v) => update("photo_notes", v)} /></Field></> : <><Field label="Forwarding address"><Input value={fields.forwarding_address} onChange={(v) => update("forwarding_address", v)} /></Field><Field label="Make-ready notes"><TextArea value={fields.make_ready_notes} onChange={(v) => update("make_ready_notes", v)} /></Field><Field label="Deposit disposition" span="md:col-span-2"><TextArea value={fields.deposit_disposition_notes} onChange={(v) => update("deposit_disposition_notes", v)} /></Field></>}</Section></>;
    if (templateId === "security_deposit_receipt") return <>{commonFields()}<Section title="Deposit"><Field label="Receipt date"><Input type="date" value={fields.receipt_date} onChange={(v) => update("receipt_date", v)} /></Field><Field label="Payment method"><Input value={fields.payment_method} onChange={(v) => update("payment_method", v)} /></Field><Field label="Deposit required"><Input type="number" value={fields.deposit_required || fields.security_deposit} onChange={(v) => update("deposit_required", v)} /></Field><Field label="Deposit received"><Input type="number" value={fields.deposit_received} onChange={(v) => update("deposit_received", v)} /></Field><Field label="Currently held"><Input type="number" value={fields.deposit_held} onChange={(v) => update("deposit_held", v)} /></Field><Field label="Applied"><Input type="number" value={fields.deposit_applied} onChange={(v) => update("deposit_applied", v)} /></Field><Field label="Deposit terms / notes" span="md:col-span-2"><TextArea value={fields.deposit_terms || fields.deposit_notes} onChange={(v) => update("deposit_terms", v)} /></Field></Section></>;
    if (templateId === "payment_arrangement") return <>{commonFields()}<Section title="Arrangement"><Field label="Current balance"><Input type="number" value={fields.current_balance || fields.case_current_balance} onChange={(v) => update("current_balance", v)} /></Field><Field label="Installment amount"><Input type="number" value={fields.payment_arrangement_amount} onChange={(v) => update("payment_arrangement_amount", v)} /></Field><Field label="Frequency"><Select value={fields.payment_arrangement_frequency} onChange={(v) => update("payment_arrangement_frequency", v)}><option value="WEEKLY">Weekly</option><option value="BIWEEKLY">Biweekly</option><option value="MONTHLY">Monthly</option><option value="CUSTOM">Custom</option></Select></Field><Field label="First payment"><Input type="date" value={fields.first_payment_date || fields.payment_arrangement_start} onChange={(v) => update("first_payment_date", v)} /></Field><Field label="Arrangement notes" span="md:col-span-2"><TextArea value={fields.arrangement_notes} onChange={(v) => update("arrangement_notes", v)} /></Field><Field label="Default terms" span="md:col-span-2"><TextArea value={fields.default_terms} onChange={(v) => update("default_terms", v)} /></Field></Section></>;
    if (templateId === "nonpayment_notice") return <>{commonFields()}<Section title="Notice"><Field label="Notice date"><Input type="date" value={fields.notice_date} onChange={(v) => update("notice_date", v)} /></Field><Field label="Amount due"><Input type="number" value={fields.amount_due} onChange={(v) => update("amount_due", v)} /></Field><Field label="Delivery method"><Input value={fields.delivery_method} onChange={(v) => update("delivery_method", v)} /></Field><Field label="Delivery date"><Input type="date" value={fields.delivery_date} onChange={(v) => update("delivery_date", v)} /></Field><Field label="Company-approved notice language" span="md:col-span-2"><TextArea rows={7} value={fields.notice_body} onChange={(v) => update("notice_body", v)} /></Field></Section></>;
    if (templateId === "collections_packet") return <>{commonFields()}<Section title="Collections / legal summary"><Field label="Case"><Input value={[pretty(fields.case_type), pretty(fields.case_status), fields.case_reference].filter(Boolean).join(" · ")} onChange={() => {}} /></Field><Field label="Current case balance"><Input type="number" value={fields.case_current_balance} onChange={(v) => update("case_current_balance", v)} /></Field><Field label="Agency"><Input value={fields.case_agency_name} onChange={(v) => update("case_agency_name", v)} /></Field><Field label="Agency email"><Input value={fields.case_agency_email} onChange={(v) => update("case_agency_email", v)} /></Field><Field label="Account summary" span="md:col-span-2"><TextArea value={fields.account_summary} onChange={(v) => update("account_summary", v)} /></Field><Field label="Repair charges summary" span="md:col-span-2"><TextArea value={fields.repair_charges_summary} onChange={(v) => update("repair_charges_summary", v)} /></Field><Field label="Supporting documents" span="md:col-span-2"><Input value={(fields.supporting_documents || []).join(", ")} onChange={(v) => listUpdate("supporting_documents", v)} placeholder="Lease, ledger, receipts, inspection photos" /></Field><Field label="Adjustments / attorney notes" span="md:col-span-2"><TextArea value={fields.adjustment_notes} onChange={(v) => update("adjustment_notes", v)} /></Field></Section></>;
    return <>{commonFields()}<Section title="Make-ready scope"><Field label="Scope items" span="md:col-span-2"><Input value={(fields.scope_items || []).join(", ")} onChange={(v) => listUpdate("scope_items", v)} /></Field><Field label="Estimated cost"><Input type="number" value={fields.estimated_cost} onChange={(v) => update("estimated_cost", v)} /></Field><Field label="Owner approval limit"><Input type="number" value={fields.approval_limit} onChange={(v) => update("approval_limit", v)} /></Field><Field label="Target completion"><Input type="date" value={fields.target_completion_date} onChange={(v) => update("target_completion_date", v)} /></Field><Field label="Team / vendor"><Input value={fields.vendor_or_team} onChange={(v) => update("vendor_or_team", v)} /></Field><Field label="Owner approval notes" span="md:col-span-2"><TextArea value={fields.owner_approval_notes} onChange={(v) => update("owner_approval_notes", v)} /></Field></Section></>;
  }

  if (loading) return <div className="rounded-[28px] border border-cyan-500/15 bg-[#07111f] p-6 text-sm text-slate-500">Loading document builder...</div>;
  if (error && !bootstrap) return <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div>;

  return <section className="mb-6 rounded-[30px] border border-cyan-400/20 bg-gradient-to-br from-cyan-500/8 via-[#07111f] to-fuchsia-500/8 p-4 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">Paperwork Automation</div><h3 className="mt-2 text-2xl font-black text-white">Build a Document</h3><p className="mt-2 max-w-3xl text-sm text-slate-400">Reuse saved data instead of retyping it. Choose the document, review exceptions, save the structured record, then export a clean PDF.</p></div>{packetId ? <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-200">Saved draft #{packetId}</span> : null}</div>
    {error ? <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}
    {notice ? <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">{notice}</div> : null}

    <div className="mt-5 flex gap-2 overflow-x-auto rounded-2xl border border-slate-800 bg-black/20 p-2">{[["setup", "1. Choose"], ["edit", "2. Review"], ["preview", "3. Preview / PDF"]].map(([key, label]) => <button key={key} type="button" onClick={() => setStep(key)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-black ${step === key ? "bg-cyan-400 text-slate-950" : "text-slate-400"}`}>{label}</button>)}</div>

    {step === "setup" ? <div className="mt-5"><div className="grid gap-4 md:grid-cols-2"><Field label="Document"><Select value={templateId} onChange={(value) => { setTemplateId(value); setPacketId(null); setFields({}); }} >{bootstrap?.templates?.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</Select></Field><Field label="Tenant / former tenant"><Select value={tenantId} onChange={(value) => { setTenantId(value); setPacketId(null); setFields({}); }}><option value="">Property-only / choose tenant</option>{availableTenants?.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name || `${tenant.first_name || ""} ${tenant.last_name || ""}`} · {pretty(tenant.status)}</option>)}</Select></Field></div>{activeTemplate ? <div className="mt-4 rounded-2xl border border-slate-800 bg-black/20 p-4"><div className="font-black text-white">{activeTemplate.name}</div><p className="mt-1 text-sm text-slate-400">{activeTemplate.description}</p>{activeTemplate.requires_tenant ? <div className="mt-2 text-xs font-bold text-amber-200">Tenant or former tenant required.</div> : <div className="mt-2 text-xs font-bold text-cyan-200">Can be generated as a property-only document.</div>}</div> : null}<div className="mt-5 flex justify-end"><button type="button" disabled={saving || (activeTemplate?.requires_tenant && !tenantId)} onClick={() => loadPrefill()} className="min-h-11 rounded-2xl bg-cyan-400 px-5 text-sm font-black text-slate-950 disabled:opacity-40">{saving ? "Loading..." : "Load Saved Data"}</button></div></div> : null}

    {step === "edit" ? <div className="mt-5 space-y-4">{editor()}<div className="flex flex-wrap justify-end gap-3"><button type="button" disabled={saving} onClick={saveDraft} className="min-h-11 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-5 text-sm font-black text-cyan-100">Save Draft</button><button type="button" disabled={saving} onClick={async () => { const id = await saveDraft(); if (id) setStep("preview"); }} className="min-h-11 rounded-2xl bg-cyan-400 px-5 text-sm font-black text-slate-950">Save & Preview</button></div></div> : null}

    {step === "preview" ? <div className="mt-5 space-y-4"><div className="flex flex-wrap justify-end gap-3"><button type="button" onClick={() => setStep("edit")} className="min-h-11 rounded-2xl border border-slate-700 px-4 text-sm font-black text-slate-200">Edit</button><button type="button" disabled={saving} onClick={saveDraft} className="min-h-11 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 text-sm font-black text-cyan-100">Save Draft</button><button type="button" disabled={saving} onClick={finalize} className="min-h-11 rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/15 px-4 text-sm font-black text-fuchsia-100">Ready for Signature</button><button type="button" onClick={printPdf} className="min-h-11 rounded-2xl bg-cyan-400 px-5 text-sm font-black text-slate-950">Print / Save PDF</button></div><DocumentPreview templateId={templateId} fields={fields} /></div> : null}

    {bootstrap?.drafts?.length ? <div className="mt-6 border-t border-slate-800 pt-5"><div className="text-sm font-black text-white">Saved generated documents</div><div className="mt-3 grid gap-3 md:grid-cols-2">{bootstrap.drafts.slice(0, 8).map((draft) => <button key={draft.id} type="button" onClick={() => { setPacketId(draft.id); setTemplateId(draft.field_data?.template_id || "residential_lease"); setTenantId(draft.tenant_id ? String(draft.tenant_id) : ""); setFields(draft.field_data || {}); setStep("edit"); }} className="rounded-2xl border border-slate-800 bg-black/20 p-4 text-left"><div className="font-black text-white">{draft.field_data?.document_title || draft.template_name}</div><div className="mt-1 text-xs text-slate-500">{draft.template_name} · {pretty(draft.status)}</div></button>)}</div></div> : null}
  </section>;
}
