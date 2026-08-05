import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";

const categories = ["ALL", "TENANT", "INVESTOR", "MAINTENANCE", "INTERNAL", "COLLECTIONS"];
const list = (data) => Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

export default function PMMessages() {
  const [workspace, setWorkspace] = useState(null);
  const [threads, setThreads] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [category, setCategory] = useState("ALL");
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [reply, setReply] = useState("");
  const [compose, setCompose] = useState(false);
  const [form, setForm] = useState({ category: "INTERNAL", subject: "", body: "", tenant_id: "", property_id: "" });
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
      const [messageRes, tenantRes, propertyRes] = await Promise.all([
        api.get("/pm-hub/messages/", { headers, params }),
        api.get("/pm-hub/tenants/", { headers }),
        api.get("/pm-hub/properties/", { headers }),
      ]);
      const rows = list(messageRes.data);
      setThreads(rows);
      setTenants(list(tenantRes.data));
      setProperties(list(propertyRes.data));
      setSelected((current) => rows.find((item) => item.id === current?.id) || rows[0] || null);
    } catch (error) {
      setNotice(error?.response?.data?.detail || "Could not load PM messages.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [category]);

  const counts = useMemo(() => categories.reduce((acc, item) => {
    acc[item] = item === "ALL" ? threads.length : threads.filter((thread) => thread.category === item).length;
    return acc;
  }, {}), [threads]);

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    const headers = { "X-PM-Workspace-ID": String(workspace.id) };
    await api.post(`/pm-hub/messages/${selected.id}/reply/`, { body: reply.trim() }, { headers });
    setReply("");
    setNotice("Reply sent.");
    await load();
  }

  async function createThread(event) {
    event.preventDefault();
    const headers = { "X-PM-Workspace-ID": String(workspace.id) };
    await api.post("/pm-hub/messages/", {
      ...form,
      tenant_id: form.tenant_id || null,
      property_id: form.property_id || null,
    }, { headers });
    setCompose(false);
    setForm({ category: "INTERNAL", subject: "", body: "", tenant_id: "", property_id: "" });
    setNotice("Conversation created.");
    await load();
  }

  return <main className="space-y-5 px-4 py-6 sm:px-6">
    {notice ? <div className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-4 text-sm text-cyan-100">{notice}</div> : null}
    <section className="rounded-[28px] border border-cyan-500/15 bg-[#07111f]/92 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-black text-white">PM Messages</h2><p className="mt-1 text-xs text-slate-500">Tenant, investor, maintenance, internal, and collections conversations in one place.</p></div>
        <button type="button" onClick={() => setCompose(true)} className="min-h-11 rounded-2xl bg-cyan-400 px-5 text-sm font-black text-slate-950">+ New Message</button>
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-black ${category === item ? "border-cyan-300 bg-cyan-400 text-slate-950" : "border-slate-700 bg-black/25 text-slate-400"}`}>{item.replace("_", " ")}{counts[item] ? ` ${counts[item]}` : ""}</button>)}</div>
      <div className="mt-4 flex gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tenant, property, subject..." className="min-h-11 flex-1 rounded-2xl border border-slate-700 bg-black/30 px-4 text-sm text-white" /><button type="button" onClick={load} className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-4 text-sm font-black text-cyan-100">Search</button></div>
    </section>

    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <section className="max-h-[720px] overflow-y-auto rounded-[28px] border border-cyan-500/15 bg-[#07111f]/92 p-3">
        {loading ? <div className="p-6 text-sm text-slate-500">Loading messages...</div> : threads.length ? threads.map((thread) => <button key={thread.id} type="button" onClick={() => setSelected(thread)} className={`mb-2 w-full rounded-2xl border p-4 text-left ${selected?.id === thread.id ? "border-cyan-400/45 bg-cyan-500/10" : "border-slate-800 bg-black/20"}`}><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-black uppercase tracking-[0.15em] text-cyan-300">{thread.category}</span><span className="text-[10px] text-slate-500">{thread.status.replaceAll("_", " ")}</span></div><div className="mt-2 font-black text-white">{thread.subject}</div><div className="mt-1 text-xs text-slate-500">{thread.tenant_name || thread.property_owner_name || "Internal team"}{thread.property_name ? ` · ${thread.property_name}` : ""}</div></button>) : <div className="p-6 text-center text-sm text-slate-500">No conversations in this category.</div>}
      </section>

      <section className="rounded-[28px] border border-cyan-500/15 bg-[#07111f]/92 p-5">
        {selected ? <><div className="border-b border-slate-800 pb-4"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">{selected.category}</div><h3 className="mt-2 text-2xl font-black text-white">{selected.subject}</h3><div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">{selected.tenant_name ? <span>Tenant: {selected.tenant_name}</span> : null}{selected.property_name ? <span>Property: {selected.property_name}</span> : null}{selected.work_order ? <span>Work order #{selected.work_order}</span> : null}{selected.ledger_entry ? <span>Ledger #{selected.ledger_entry}</span> : null}{selected.tenant_case ? <span>Case #{selected.tenant_case}</span> : null}</div></div><div className="my-5 space-y-3">{selected.messages?.map((message) => <div key={message.id} className={`rounded-2xl border p-4 ${["PM", "INTERNAL"].includes(message.sender_role) ? "ml-4 border-cyan-500/20 bg-cyan-500/8" : "mr-4 border-slate-700 bg-black/25"}`}><div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{message.sender_name} · {message.sender_role}</div><div className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{message.body}</div></div>)}</div><div className="flex gap-2"><textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Reply..." className="min-h-24 flex-1 rounded-2xl border border-slate-700 bg-black/30 p-4 text-sm text-white" /><button type="button" onClick={sendReply} className="rounded-2xl bg-cyan-400 px-5 text-sm font-black text-slate-950">Send</button></div></> : <div className="py-16 text-center text-sm text-slate-500">Select a conversation.</div>}
      </section>
    </div>

    {compose ? <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-3 sm:items-center"><form onSubmit={createThread} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-cyan-400/25 bg-[#07111f] p-5"><div className="flex items-center justify-between"><h3 className="text-xl font-black text-white">New PM Conversation</h3><button type="button" onClick={() => setCompose(false)} className="text-slate-400">Close</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="min-h-11 rounded-2xl border border-slate-700 bg-black/30 px-3 text-white">{categories.filter((item) => item !== "ALL").map((item) => <option key={item}>{item}</option>)}</select><input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="Subject" className="min-h-11 rounded-2xl border border-slate-700 bg-black/30 px-4 text-white" /><select value={form.tenant_id} onChange={(event) => setForm({ ...form, tenant_id: event.target.value })} className="min-h-11 rounded-2xl border border-slate-700 bg-black/30 px-3 text-white"><option value="">No tenant</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.full_name || `${tenant.first_name} ${tenant.last_name}`}</option>)}</select><select value={form.property_id} onChange={(event) => setForm({ ...form, property_id: event.target.value })} className="min-h-11 rounded-2xl border border-slate-700 bg-black/30 px-3 text-white"><option value="">No property</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></div><textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder="Message or internal note" className="mt-3 min-h-36 w-full rounded-2xl border border-slate-700 bg-black/30 p-4 text-white" required /><button className="mt-4 min-h-11 w-full rounded-2xl bg-cyan-400 font-black text-slate-950">Create Conversation</button></form></div> : null}
  </main>;
}
