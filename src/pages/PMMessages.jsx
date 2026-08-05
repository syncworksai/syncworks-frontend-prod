import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";

const categories = ["ALL", "TENANT", "INVESTOR", "MAINTENANCE", "INTERNAL", "COLLECTIONS"];
const list = (data) => Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
const inputClass = "min-h-11 w-full rounded-2xl border border-slate-700 bg-black/30 px-4 text-sm text-white";

export default function PMMessages() {
  const [workspace, setWorkspace] = useState(null);
  const [threads, setThreads] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [occupancies, setOccupancies] = useState([]);
  const [cases, setCases] = useState([]);
  const [view, setView] = useState("messages");
  const [category, setCategory] = useState("ALL");
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [reply, setReply] = useState("");
  const [compose, setCompose] = useState(false);
  const [occupancyOpen, setOccupancyOpen] = useState(false);
  const [caseOpen, setCaseOpen] = useState(false);
  const [form, setForm] = useState({ category: "INTERNAL", subject: "", body: "", tenant_id: "", property_id: "" });
  const [occupancyForm, setOccupancyForm] = useState({ tenant_id: "", property_id: "", move_in_date: "", unit_label: "", notes: "" });
  const [caseForm, setCaseForm] = useState({ tenant_id: "", case_type: "COLLECTIONS", status: "OPEN", opened_date: new Date().toISOString().slice(0, 10), agency_name: "", agency_email: "", notes: "" });
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const ws = (await api.get("/pm-hub/workspaces/current/")).data;
      setWorkspace(ws);
      const headers = { "X-PM-Workspace-ID": String(ws.id) };
      const params = {};
      if (category !== "ALL") params.category = category;
      if (search.trim()) params.search = search.trim();
      const [messageRes, tenantRes, propertyRes, occupancyRes, caseRes] = await Promise.all([
        api.get("/pm-hub/messages/", { headers, params }),
        api.get("/pm-hub/tenants/", { headers }),
        api.get("/pm-hub/properties/", { headers }),
        api.get("/pm-hub/occupancies/", { headers }),
        api.get("/pm-hub/tenant-cases/", { headers }),
      ]);
      const rows = list(messageRes.data);
      setThreads(rows);
      setTenants(list(tenantRes.data));
      setProperties(list(propertyRes.data));
      setOccupancies(list(occupancyRes.data));
      setCases(list(caseRes.data));
      setSelected((current) => rows.find((item) => item.id === current?.id) || rows[0] || null);
    } catch (error) {
      setNotice(error?.response?.data?.detail || "Could not load PM records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [category]);

  const counts = useMemo(() => categories.reduce((acc, item) => {
    acc[item] = item === "ALL" ? threads.length : threads.filter((thread) => thread.category === item).length;
    return acc;
  }, {}), [threads]);
  const activeOccupancies = occupancies.filter((item) => ["ACTIVE", "NOTICE_GIVEN"].includes(item.status));

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    const headers = { "X-PM-Workspace-ID": String(workspace.id) };
    await api.post(`/pm-hub/messages/${selected.id}/reply/`, { body: reply.trim() }, { headers });
    setReply(""); setNotice("Reply sent."); await load();
  }

  async function createThread(event) {
    event.preventDefault();
    const headers = { "X-PM-Workspace-ID": String(workspace.id) };
    await api.post("/pm-hub/messages/", { ...form, tenant_id: form.tenant_id || null, property_id: form.property_id || null }, { headers });
    setCompose(false); setForm({ category: "INTERNAL", subject: "", body: "", tenant_id: "", property_id: "" }); setNotice("Conversation created."); await load();
  }

  async function createOccupancy(event) {
    event.preventDefault();
    const headers = { "X-PM-Workspace-ID": String(workspace.id) };
    await api.post("/pm-hub/occupancies/", { ...occupancyForm, tenant_id: Number(occupancyForm.tenant_id), property_id: Number(occupancyForm.property_id) }, { headers });
    setOccupancyOpen(false); setOccupancyForm({ tenant_id: "", property_id: "", move_in_date: "", unit_label: "", notes: "" }); setNotice("Tenant occupancy connected."); await load();
  }

  async function closeOccupancy(item, evicted = false) {
    const reason = window.prompt(evicted ? "Eviction or move-out note" : "Move-out reason", evicted ? "Eviction" : "Tenant moved out");
    if (reason === null) return;
    const headers = { "X-PM-Workspace-ID": String(workspace.id) };
    await api.post(`/pm-hub/occupancies/${item.id}/move-out/`, { evicted, move_out_reason: reason }, { headers });
    setNotice("Occupancy closed. Tenant ledger and history remain available."); await load();
  }

  async function createCase(event) {
    event.preventDefault();
    const headers = { "X-PM-Workspace-ID": String(workspace.id) };
    await api.post("/pm-hub/tenant-cases/", { ...caseForm, tenant_id: Number(caseForm.tenant_id) }, { headers });
    setCaseOpen(false); setCaseForm({ tenant_id: "", case_type: "COLLECTIONS", status: "OPEN", opened_date: new Date().toISOString().slice(0, 10), agency_name: "", agency_email: "", notes: "" }); setNotice("Tenant case opened."); await load();
  }

  return <main className="space-y-5 px-4 py-6 sm:px-6">
    {notice ? <div className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-4 text-sm text-cyan-100">{notice}</div> : null}
    <section className="rounded-[28px] border border-cyan-500/15 bg-[#07111f]/92 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black text-white">PM Communications & Tenant Records</h2><p className="mt-1 text-xs text-slate-500">Messages, occupancy history, move-outs, eviction, and collections without overwriting the property or tenant history.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setCompose(true)} className="min-h-11 rounded-2xl bg-cyan-400 px-5 text-sm font-black text-slate-950">+ New Message</button><button type="button" onClick={() => setOccupancyOpen(true)} className="min-h-11 rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/15 px-5 text-sm font-black text-fuchsia-100">Connect Occupancy</button><button type="button" onClick={() => setCaseOpen(true)} className="min-h-11 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-5 text-sm font-black text-amber-100">Open Case</button></div></div>
      <div className="mt-4 flex gap-2"><button type="button" onClick={() => setView("messages")} className={`rounded-xl px-4 py-2 text-xs font-black ${view === "messages" ? "bg-cyan-400 text-slate-950" : "border border-slate-700 text-slate-400"}`}>Messages</button><button type="button" onClick={() => setView("records")} className={`rounded-xl px-4 py-2 text-xs font-black ${view === "records" ? "bg-cyan-400 text-slate-950" : "border border-slate-700 text-slate-400"}`}>Occupancy & Cases</button></div>
    </section>

    {view === "messages" ? <>
      <section className="rounded-[28px] border border-cyan-500/15 bg-[#07111f]/92 p-4"><div className="flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-black ${category === item ? "border-cyan-300 bg-cyan-400 text-slate-950" : "border-slate-700 bg-black/25 text-slate-400"}`}>{item.replace("_", " ")}{counts[item] ? ` ${counts[item]}` : ""}</button>)}</div><div className="mt-4 flex gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tenant, property, subject..." className={`${inputClass} flex-1`} /><button type="button" onClick={load} className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-4 text-sm font-black text-cyan-100">Search</button></div></section>
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]"><section className="max-h-[720px] overflow-y-auto rounded-[28px] border border-cyan-500/15 bg-[#07111f]/92 p-3">{loading ? <div className="p-6 text-sm text-slate-500">Loading messages...</div> : threads.length ? threads.map((thread) => <button key={thread.id} type="button" onClick={() => setSelected(thread)} className={`mb-2 w-full rounded-2xl border p-4 text-left ${selected?.id === thread.id ? "border-cyan-400/45 bg-cyan-500/10" : "border-slate-800 bg-black/20"}`}><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-black uppercase tracking-[0.15em] text-cyan-300">{thread.category}</span><span className="text-[10px] text-slate-500">{thread.status.replaceAll("_", " ")}</span></div><div className="mt-2 font-black text-white">{thread.subject}</div><div className="mt-1 text-xs text-slate-500">{thread.tenant_name || thread.property_owner_name || "Internal team"}{thread.property_name ? ` · ${thread.property_name}` : ""}</div></button>) : <div className="p-6 text-center text-sm text-slate-500">No conversations in this category.</div>}</section><section className="rounded-[28px] border border-cyan-500/15 bg-[#07111f]/92 p-5">{selected ? <><div className="border-b border-slate-800 pb-4"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">{selected.category}</div><h3 className="mt-2 text-2xl font-black text-white">{selected.subject}</h3><div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">{selected.tenant_name ? <span>Tenant: {selected.tenant_name}</span> : null}{selected.property_name ? <span>Property: {selected.property_name}</span> : null}{selected.work_order ? <span>Work order #{selected.work_order}</span> : null}{selected.ledger_entry ? <span>Ledger #{selected.ledger_entry}</span> : null}{selected.tenant_case ? <span>Case #{selected.tenant_case}</span> : null}</div></div><div className="my-5 space-y-3">{selected.messages?.map((message) => <div key={message.id} className={`rounded-2xl border p-4 ${["PM", "INTERNAL"].includes(message.sender_role) ? "ml-4 border-cyan-500/20 bg-cyan-500/10" : "mr-4 border-slate-700 bg-black/25"}`}><div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{message.sender_name} · {message.sender_role}</div><div className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{message.body}</div></div>)}</div><div className="flex gap-2"><textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Reply..." className="min-h-24 flex-1 rounded-2xl border border-slate-700 bg-black/30 p-4 text-sm text-white" /><button type="button" onClick={sendReply} className="rounded-2xl bg-cyan-400 px-5 text-sm font-black text-slate-950">Send</button></div></> : <div className="py-16 text-center text-sm text-slate-500">Select a conversation.</div>}</section></div>
    </> : <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-[28px] border border-cyan-500/15 bg-[#07111f]/92 p-5"><div className="flex items-center justify-between"><div><h3 className="text-lg font-black text-white">Current Occupancies</h3><p className="mt-1 text-xs text-slate-500">Closing an occupancy never deletes the tenant ledger, messages, lease, or case history.</p></div><span className="rounded-full border border-cyan-400/25 px-3 py-1 text-xs text-cyan-200">{activeOccupancies.length} active</span></div><div className="mt-4 space-y-3">{activeOccupancies.length ? activeOccupancies.map((item) => <div key={item.id} className="rounded-2xl border border-slate-800 bg-black/25 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-black text-white">{item.tenant_name}</div><div className="mt-1 text-xs text-slate-500">{item.property_name}{item.unit_label ? ` · ${item.unit_label}` : ""} · Since {item.move_in_date || "unknown"}</div></div><div className="flex gap-2"><button type="button" onClick={() => closeOccupancy(item, false)} className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-black text-slate-200">Move Out</button><button type="button" onClick={() => closeOccupancy(item, true)} className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-black text-rose-100">Evicted</button></div></div></div>) : <div className="rounded-2xl border border-dashed border-slate-700 p-7 text-center text-sm text-slate-500">No active occupancies.</div>}</div></section>
      <section className="rounded-[28px] border border-cyan-500/15 bg-[#07111f]/92 p-5"><div className="flex items-center justify-between"><div><h3 className="text-lg font-black text-white">Tenant Cases</h3><p className="mt-1 text-xs text-slate-500">Eviction, collections, legal, and payment-plan records remain attached to the former tenant.</p></div><span className="rounded-full border border-amber-400/25 px-3 py-1 text-xs text-amber-200">{cases.filter((item) => item.status !== "CLOSED").length} open</span></div><div className="mt-4 space-y-3">{cases.length ? cases.map((item) => <div key={item.id} className="rounded-2xl border border-slate-800 bg-black/25 p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-black text-white">{item.tenant_name}</div><div className="mt-1 text-xs text-slate-500">{item.case_type.replaceAll("_", " ")} · {item.property_name || "Tenant record"}</div></div><span className="rounded-full border border-amber-400/25 px-2 py-1 text-[10px] font-black text-amber-200">{item.status.replaceAll("_", " ")}</span></div><div className="mt-3 grid grid-cols-2 gap-3 text-xs"><div><span className="text-slate-500">Current balance</span><div className="mt-1 font-black text-white">${Number(item.current_balance || 0).toFixed(2)}</div></div><div><span className="text-slate-500">Agency</span><div className="mt-1 font-bold text-white">{item.agency_name || "Not assigned"}</div></div></div></div>) : <div className="rounded-2xl border border-dashed border-slate-700 p-7 text-center text-sm text-slate-500">No tenant cases.</div>}</div></section>
    </div>}

    {compose ? <Modal title="New PM Conversation" onClose={() => setCompose(false)}><form onSubmit={createThread}><div className="grid gap-3 sm:grid-cols-2"><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>{categories.filter((item) => item !== "ALL").map((item) => <option key={item}>{item}</option>)}</select><input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Subject" className={inputClass} /><select value={form.tenant_id} onChange={(e) => setForm({ ...form, tenant_id: e.target.value })} className={inputClass}><option value="">No tenant</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.full_name || `${tenant.first_name} ${tenant.last_name}`}</option>)}</select><select value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })} className={inputClass}><option value="">No property</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></div><textarea required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Message or internal note" className="mt-3 min-h-36 w-full rounded-2xl border border-slate-700 bg-black/30 p-4 text-white" /><Submit>Create Conversation</Submit></form></Modal> : null}
    {occupancyOpen ? <Modal title="Connect Tenant Occupancy" onClose={() => setOccupancyOpen(false)}><form onSubmit={createOccupancy}><div className="grid gap-3 sm:grid-cols-2"><select required value={occupancyForm.tenant_id} onChange={(e) => setOccupancyForm({ ...occupancyForm, tenant_id: e.target.value })} className={inputClass}><option value="">Choose tenant</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.full_name || `${tenant.first_name} ${tenant.last_name}`}</option>)}</select><select required value={occupancyForm.property_id} onChange={(e) => setOccupancyForm({ ...occupancyForm, property_id: e.target.value })} className={inputClass}><option value="">Choose property</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select><input type="date" value={occupancyForm.move_in_date} onChange={(e) => setOccupancyForm({ ...occupancyForm, move_in_date: e.target.value })} className={inputClass} /><input value={occupancyForm.unit_label} onChange={(e) => setOccupancyForm({ ...occupancyForm, unit_label: e.target.value })} placeholder="Unit label, optional" className={inputClass} /></div><textarea value={occupancyForm.notes} onChange={(e) => setOccupancyForm({ ...occupancyForm, notes: e.target.value })} placeholder="Occupancy notes" className="mt-3 min-h-24 w-full rounded-2xl border border-slate-700 bg-black/30 p-4 text-white" /><Submit>Connect Occupancy</Submit></form></Modal> : null}
    {caseOpen ? <Modal title="Open Tenant Case" onClose={() => setCaseOpen(false)}><form onSubmit={createCase}><div className="grid gap-3 sm:grid-cols-2"><select required value={caseForm.tenant_id} onChange={(e) => setCaseForm({ ...caseForm, tenant_id: e.target.value })} className={inputClass}><option value="">Choose tenant</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.full_name || `${tenant.first_name} ${tenant.last_name}`}</option>)}</select><select value={caseForm.case_type} onChange={(e) => setCaseForm({ ...caseForm, case_type: e.target.value })} className={inputClass}><option>COLLECTIONS</option><option>EVICTION</option><option>LEGAL</option><option>PAYMENT_PLAN</option></select><input type="date" value={caseForm.opened_date} onChange={(e) => setCaseForm({ ...caseForm, opened_date: e.target.value })} className={inputClass} /><select value={caseForm.status} onChange={(e) => setCaseForm({ ...caseForm, status: e.target.value })} className={inputClass}><option>OPEN</option><option>NOTICE_SENT</option><option>FILED</option><option>SENT_TO_COLLECTIONS</option><option>PAYMENT_PLAN</option></select><input value={caseForm.agency_name} onChange={(e) => setCaseForm({ ...caseForm, agency_name: e.target.value })} placeholder="Agency or attorney" className={inputClass} /><input type="email" value={caseForm.agency_email} onChange={(e) => setCaseForm({ ...caseForm, agency_email: e.target.value })} placeholder="Agency email" className={inputClass} /></div><textarea value={caseForm.notes} onChange={(e) => setCaseForm({ ...caseForm, notes: e.target.value })} placeholder="Case notes" className="mt-3 min-h-24 w-full rounded-2xl border border-slate-700 bg-black/30 p-4 text-white" /><Submit>Open Case</Submit></form></Modal> : null}
  </main>;
}

function Modal({ title, onClose, children }) { return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-3 sm:items-center"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-cyan-400/25 bg-[#07111f] p-5"><div className="mb-5 flex items-center justify-between"><h3 className="text-xl font-black text-white">{title}</h3><button type="button" onClick={onClose} className="text-slate-400">Close</button></div>{children}</div></div>; }
function Submit({ children }) { return <button className="mt-4 min-h-11 w-full rounded-2xl bg-cyan-400 font-black text-slate-950">{children}</button>; }
