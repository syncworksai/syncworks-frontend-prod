import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/client";

const list = (data) => Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
const categories = [
  ["LEASE", "Lease agreement"], ["LEASE_ADDENDUM", "Lease addendum"], ["MANAGEMENT_AGREEMENT", "Management agreement"],
  ["OWNERSHIP", "Ownership / management change"], ["SECTION8", "Section 8 / housing authority"], ["RENT_INCREASE", "Rent increase request"],
  ["MOVE_IN_INSPECTION", "Move-in inspection"], ["MOVE_OUT_INSPECTION", "Move-out inspection"], ["SECURITY_DEPOSIT", "Security deposit"],
  ["PAYMENT_ARRANGEMENT", "Payment arrangement"], ["NOTICE", "Notice / legal"], ["OPERATING_STATEMENT", "Operating statement"],
  ["INSURANCE", "Insurance"], ["IDENTITY_TAX", "Identity / tax"], ["OTHER", "Other"],
];

export default function PMPropertyPaperwork({ workspace, property, tenants = [] }) {
  const fileRef = useRef(null);
  const [documents, setDocuments] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ category: "LEASE", title: "", tenant: "", status: "ACTIVE", effective_date: "", expiration_date: "", housing_authority: "", notes: "" });

  const headers = useMemo(() => workspace?.id ? { "X-PM-Workspace-ID": String(workspace.id) } : {}, [workspace]);

  async function load() {
    if (!workspace?.id || !property?.id) return;
    setLoading(true); setError("");
    try {
      const [docs, items] = await Promise.all([
        api.get("/pm-hub/property-documents/", { headers, params: { property_id: property.id } }),
        api.get("/pm-hub/document-library/checklist/", { headers, params: { property_id: property.id } }),
      ]);
      setDocuments(list(docs.data));
      setChecklist(items.data?.items || []);
    } catch (e) {
      setError(e?.response?.data?.detail || "Could not load the property document library.");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [workspace?.id, property?.id]);

  async function upload(event) {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("Choose a PDF, image, Word document, or spreadsheet."); return; }
    if (!form.title.trim()) { setError("Enter a document title."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      const data = new FormData();
      data.append("property", String(property.id));
      data.append("category", form.category);
      data.append("title", form.title.trim());
      data.append("status", form.status);
      data.append("document", file);
      data.append("source_name", file.name);
      data.append("state_code", property.state || "");
      if (form.tenant) data.append("tenant", form.tenant);
      if (form.effective_date) data.append("effective_date", form.effective_date);
      if (form.expiration_date) data.append("expiration_date", form.expiration_date);
      if (form.housing_authority) data.append("housing_authority", form.housing_authority);
      if (form.notes) data.append("notes", form.notes);
      await api.post("/pm-hub/property-documents/", data, { headers: { ...headers, "Content-Type": "multipart/form-data" } });
      setForm({ category: "LEASE", title: "", tenant: "", status: "ACTIVE", effective_date: "", expiration_date: "", housing_authority: "", notes: "" });
      if (fileRef.current) fileRef.current.value = "";
      setMessage("Document saved to this property profile.");
      await load();
    } catch (e) {
      const data = e?.response?.data;
      setError(typeof data?.detail === "string" ? data.detail : data ? Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" · ") : "Could not upload the document.");
    } finally { setSaving(false); }
  }

  async function removeDocument(id) {
    if (!window.confirm("Delete this document record from the property profile?")) return;
    await api.delete(`/pm-hub/property-documents/${id}/`, { headers });
    await load();
  }

  return <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
    <section className="rounded-[28px] border border-cyan-500/15 bg-[#07111f]/92">
      <div className="border-b border-cyan-500/10 px-5 py-4"><h2 className="text-lg font-black text-white">Add Property Document</h2><p className="mt-1 text-xs text-slate-500">Upload the company’s actual lease, MHA packet, inspection, notice, or owner document.</p></div>
      <form onSubmit={upload} className="grid gap-4 p-5 sm:grid-cols-2">
        <label className="text-xs font-bold text-slate-300 sm:col-span-2">Document type<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-700 bg-[#020914] px-4 py-3 text-white">{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-xs font-bold text-slate-300 sm:col-span-2">Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Example: Chastain signed lease" className="mt-2 w-full rounded-2xl border border-slate-700 bg-[#020914] px-4 py-3 text-white" /></label>
        <label className="text-xs font-bold text-slate-300">Tenant<select value={form.tenant} onChange={(e) => setForm({ ...form, tenant: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-700 bg-[#020914] px-4 py-3 text-white"><option value="">Property / owner document</option>{tenants.map((t) => <option key={t.id} value={t.id}>{t.full_name || `${t.first_name} ${t.last_name}`}</option>)}</select></label>
        <label className="text-xs font-bold text-slate-300">Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-700 bg-[#020914] px-4 py-3 text-white"><option>ACTIVE</option><option>DRAFT</option><option>PENDING_SIGNATURE</option><option>SIGNED</option><option>SUBMITTED</option><option>APPROVED</option><option>ARCHIVED</option></select></label>
        <label className="text-xs font-bold text-slate-300">Effective date<input type="date" value={form.effective_date} onChange={(e) => setForm({ ...form, effective_date: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-700 bg-[#020914] px-4 py-3 text-white" /></label>
        <label className="text-xs font-bold text-slate-300">Expiration / renewal<input type="date" value={form.expiration_date} onChange={(e) => setForm({ ...form, expiration_date: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-700 bg-[#020914] px-4 py-3 text-white" /></label>
        <label className="text-xs font-bold text-slate-300 sm:col-span-2">Housing authority<input value={form.housing_authority} onChange={(e) => setForm({ ...form, housing_authority: e.target.value })} placeholder="Montgomery Housing Authority" className="mt-2 w-full rounded-2xl border border-slate-700 bg-[#020914] px-4 py-3 text-white" /></label>
        <label className="text-xs font-bold text-slate-300 sm:col-span-2">File<input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg" className="mt-2 block w-full rounded-2xl border border-dashed border-slate-700 bg-black/20 px-4 py-4 text-sm text-slate-300" /></label>
        <label className="text-xs font-bold text-slate-300 sm:col-span-2">Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-2 min-h-24 w-full rounded-2xl border border-slate-700 bg-[#020914] px-4 py-3 text-white" /></label>
        {error ? <div className="sm:col-span-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</div> : null}
        {message ? <div className="sm:col-span-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{message}</div> : null}
        <button disabled={saving} className="sm:col-span-2 min-h-12 rounded-2xl bg-cyan-400 px-5 font-black text-slate-950 disabled:opacity-50">{saving ? "Uploading..." : "Upload to Property Profile"}</button>
      </form>
    </section>

    <div className="space-y-5">
      <section className="rounded-[28px] border border-cyan-500/15 bg-[#07111f]/92 p-5"><div className="flex items-center justify-between"><div><h2 className="text-lg font-black text-white">Paperwork Readiness</h2><p className="mt-1 text-xs text-slate-500">Checklist based on leases, owner onboarding, inspections, Section 8, and reporting.</p></div><div className="text-2xl font-black text-cyan-300">{checklist.filter((x) => x.complete).length}/{checklist.length}</div></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{checklist.map((item) => <div key={item.key} className={`rounded-2xl border p-3 text-sm ${item.complete ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100" : "border-slate-800 bg-black/20 text-slate-400"}`}><span className="mr-2">{item.complete ? "✓" : "○"}</span>{item.label}{item.optional ? <span className="ml-2 text-[10px] uppercase text-slate-500">Optional</span> : null}</div>)}</div></section>
      <section className="rounded-[28px] border border-cyan-500/15 bg-[#07111f]/92"><div className="border-b border-cyan-500/10 px-5 py-4"><h2 className="text-lg font-black text-white">Document Library</h2><p className="mt-1 text-xs text-slate-500">Property, tenant, owner, housing-authority, and report files.</p></div><div className="space-y-3 p-5">{loading ? <div className="text-sm text-slate-500">Loading documents...</div> : documents.length ? documents.map((doc) => <article key={doc.id} className="rounded-2xl border border-slate-800 bg-black/25 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-black text-white">{doc.title}</div><div className="mt-1 text-xs text-slate-500">{String(doc.category).replaceAll("_", " ")} · {doc.tenant_name || "Property / owner"} · {doc.status}</div>{doc.notes ? <div className="mt-2 text-xs text-slate-400">{doc.notes}</div> : null}</div><div className="flex gap-2">{doc.document_url || doc.source_url ? <a href={doc.document_url || doc.source_url} target="_blank" rel="noreferrer" className="rounded-xl border border-cyan-500/25 px-3 py-2 text-xs font-black text-cyan-200">Open</a> : null}<button onClick={() => removeDocument(doc.id)} className="rounded-xl border border-rose-500/25 px-3 py-2 text-xs font-black text-rose-200">Delete</button></div></div></article>) : <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">No documents uploaded for this property yet.</div>}</div></section>
    </div>
  </div>;
}
