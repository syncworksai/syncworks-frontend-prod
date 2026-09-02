import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../api/client";

const inputClass = "min-h-10 w-full rounded-xl border border-slate-700 bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/70";
const stagesDefault = [
  ["NEW", "New"], ["CONTACTED", "Contacted"], ["QUALIFIED", "Qualified"], ["REVIEWING", "Showing / Reviewing"], ["APPLICATION", "Application"], ["APPROVED", "Approved"], ["LEASE_PENDING", "Lease Pending"], ["WON", "Won"], ["LOST", "Lost"],
];
const leadTypesDefault = [["REGULAR", "Regular Tenant"], ["CORPORATE", "Corporate Leasing"], ["INSURANCE", "Insurance Housing"], ["SECTION8", "Section 8 / Housing"], ["RELOCATION", "Relocation"], ["OTHER", "Other"]];
const sourcesDefault = [["FURNISHED_FINDER", "Furnished Finder"], ["ZILLOW", "Zillow"], ["APARTMENTS", "Apartments.com"], ["FACEBOOK", "Facebook"], ["INSTAGRAM", "Instagram"], ["WEBSITE", "Website"], ["PHONE", "Phone"], ["REFERRAL", "Referral"], ["CORPORATE_PARTNER", "Corporate Housing Partner"], ["INSURANCE_CARRIER", "Insurance Carrier"], ["HOUSING_AUTHORITY", "Housing Authority"], ["REALTOR", "Realtor"], ["OWNER_REFERRAL", "Owner Referral"], ["MANUAL", "Manual"], ["OTHER", "Other"]];
const mailCategories = [["LEADS", "Leads"], ["TENANTS", "Tenants"], ["OWNERS", "Owners / Investors"], ["MAINTENANCE", "Maintenance"], ["SECTION8", "Section 8"], ["COLLECTIONS", "Collections / Legal"], ["VENDORS", "Vendors"]];
const blankLead = { stage: "NEW", lead_type: "REGULAR", source: "MANUAL", first_name: "", last_name: "", email: "", phone: "", company_name: "", property: "", requested_start: "", requested_end: "", adults: 1, children: 0, pets: 0, pet_notes: "", furnished_requested: false, budget_amount: "", summary: "", notes: "" };

function list(data) { return Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []; }
function choiceRows(rows, fallback) { return Array.isArray(rows) && rows.length ? rows.map((r) => [r.value, r.label]) : fallback; }
function Field({ label, children }) { return <label className="block"><span className="mb-1 block text-[11px] font-semibold text-slate-300">{label}</span>{children}</label>; }
function tag(tone, text) {
  const cls = tone === "fuchsia" ? "border-fuchsia-400/35 bg-fuchsia-500/10 text-fuchsia-200" : tone === "emerald" ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-200" : tone === "amber" ? "border-amber-400/35 bg-amber-500/10 text-amber-200" : "border-cyan-400/35 bg-cyan-500/10 text-cyan-200";
  return <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${cls}`}>{text}</span>;
}
function Drawer({ title, onClose, children, width = "max-w-2xl" }) {
  return <div className="fixed inset-0 z-[260] bg-black/75 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><aside className={`ml-auto flex h-[100dvh] w-full ${width} flex-col border-l border-cyan-400/25 bg-[#050c16] shadow-2xl`}><div className="sticky top-0 z-10 flex items-center justify-between border-b border-cyan-500/20 bg-[#050c16]/95 px-4 py-3 backdrop-blur"><h2 className="text-xl font-black">{title}</h2><button onClick={onClose} className="rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-black text-cyan-100">Close ✕</button></div><div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div></aside></div>;
}

export default function PMLeads() {
  const location = useLocation();
  const [workspace, setWorkspace] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [properties, setProperties] = useState([]);
  const [leads, setLeads] = useState([]);
  const [choices, setChoices] = useState({});
  const [connections, setConnections] = useState([]);
  const [stageFilter, setStageFilter] = useState("ACTIVE");
  const [typeFilter, setTypeFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState(() => new URLSearchParams(location.search).get("connect") === "email" ? "mail" : "");
  const [draft, setDraft] = useState(blankLead);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const headers = workspace?.id ? { "X-PM-Workspace-ID": String(workspace.id) } : {};

  async function load() {
    setError("");
    try {
      const [ws, allWs, props, conn] = await Promise.all([
        api.get("/pm-hub/workspaces/current/"),
        api.get("/pm-hub/workspaces/"),
        api.get("/pm-hub/properties/"),
        api.get("/personal-calendar/connections/"),
      ]);
      const current = ws.data;
      setWorkspace(current);
      setWorkspaces(list(allWs.data));
      setProperties(list(props.data));
      setConnections(conn.data?.connections || []);
      const leadResponse = await api.get("/pm-hub/leads/", { headers: { "X-PM-Workspace-ID": String(current.id) } });
      setLeads(leadResponse.data?.leads || []);
      setChoices(leadResponse.data?.choices || {});
    } catch (e) { setError(e?.response?.data?.detail || "Could not load PM leads."); }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (new URLSearchParams(location.search).get("connect") === "email") setDrawer("mail");
  }, [location.search]);

  const stageRows = choiceRows(choices.stages, stagesDefault);
  const typeRows = choiceRows(choices.lead_types, leadTypesDefault);
  const sourceRows = choiceRows(choices.sources, sourcesDefault);
  const filtered = useMemo(() => leads.filter((lead) => {
    if (stageFilter === "ACTIVE" && ["WON", "LOST"].includes(lead.stage)) return false;
    if (stageFilter && stageFilter !== "ACTIVE" && lead.stage !== stageFilter) return false;
    if (typeFilter && lead.lead_type !== typeFilter) return false;
    if (sourceFilter && lead.source !== sourceFilter) return false;
    if (search) {
      const hay = `${lead.full_name} ${lead.email} ${lead.phone} ${lead.company_name} ${lead.property_name} ${lead.source_label} ${lead.source_subject}`.toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  }), [leads, stageFilter, typeFilter, sourceFilter, search]);
  const counts = useMemo(() => Object.fromEntries(stageRows.map(([value]) => [value, leads.filter((l) => l.stage === value).length])), [leads, stageRows]);
  const mailAccounts = connections.filter((c) => c.provider === "MICROSOFT");
  const enabledMail = mailAccounts.filter((c) => c.mail_enabled);

  async function refreshLeads() {
    if (!workspace?.id) return;
    const r = await api.get("/pm-hub/leads/", { headers });
    setLeads(r.data?.leads || []); setChoices(r.data?.choices || choices);
  }
  async function openLead(id) {
    setError("");
    try { const r = await api.get(`/pm-hub/leads/${id}/`, { headers }); setSelected(r.data); setDrawer("lead"); } catch (e) { setError(e?.response?.data?.detail || "Could not open lead."); }
  }
  async function saveLead(model, existing = false) {
    setBusy(true); setError("");
    try {
      const r = existing ? await api.patch(`/pm-hub/leads/${model.id}/`, model, { headers }) : await api.post("/pm-hub/leads/", model, { headers });
      setMessage(existing ? "Lead updated." : "Lead created.");
      if (existing) setSelected(r.data); else setDrawer("");
      setDraft(blankLead); await refreshLeads();
    } catch (e) { setError(e?.response?.data?.detail || "Could not save lead."); } finally { setBusy(false); }
  }
  async function deleteLead() {
    if (!selected || !confirm(`Delete lead ${selected.full_name}?`)) return;
    await api.delete(`/pm-hub/leads/${selected.id}/`, { headers }); setDrawer(""); setSelected(null); await refreshLeads();
  }
  async function addNote() {
    if (!note.trim() || !selected) return;
    setBusy(true);
    try { const r = await api.post(`/pm-hub/leads/${selected.id}/note/`, { body: note }, { headers }); setSelected(r.data); setNote(""); await refreshLeads(); } catch (e) { setError(e?.response?.data?.detail || "Could not save note."); } finally { setBusy(false); }
  }
  async function sendReply() {
    if (!reply.trim() || !selected) return;
    setBusy(true); setError("");
    try {
      const connectionId = selected.mailbox_connection_id || enabledMail[0]?.id || "";
      const r = await api.post(`/pm-hub/leads/${selected.id}/reply-email/`, { body: reply, connection_id: connectionId }, { headers });
      setSelected(r.data); setReply(""); setMessage("Email sent and saved to the lead thread."); await refreshLeads();
    } catch (e) { setError(e?.response?.data?.detail || "Could not send email."); } finally { setBusy(false); }
  }
  async function convertToTenant() {
    if (!selected) return;
    setBusy(true);
    try { const r = await api.post(`/pm-hub/leads/${selected.id}/convert-to-tenant/`, {}, { headers }); setMessage(r.data?.detail || "Lead converted to tenant."); await refreshLeads(); } catch (e) { setError(e?.response?.data?.detail || "Could not convert lead."); } finally { setBusy(false); }
  }
  async function syncInbox() {
    if (!enabledMail.length) return setDrawer("mail");
    setBusy(true); setError(""); setMessage("");
    try {
      let leadCount = 0, msgCount = 0;
      for (const account of enabledMail) {
        const r = await api.post(`/personal-calendar/connections/${account.id}/sync/`);
        leadCount += Number(r.data?.mail?.leads || 0); msgCount += Number(r.data?.mail?.pm_messages || 0);
      }
      setMessage(`SYNC Inbox processed mail: ${leadCount} lead${leadCount === 1 ? "" : "s"} and ${msgCount} PM message${msgCount === 1 ? "" : "s"}.`);
      await load();
    } catch (e) { setError(e?.response?.data?.detail || "Inbox sync failed. Reconnect Outlook if mail permission has not been granted yet."); } finally { setBusy(false); }
  }
  async function startMicrosoft() {
    try { const r = await api.post("/personal-calendar/connections/oauth/start/", { provider: "MICROSOFT", return_to: "/pm/settings?view=leads" }); window.location.assign(r.data.authorization_url); } catch (e) { setError(e?.response?.data?.detail || "Microsoft connection is not configured."); }
  }
  async function saveMailRoute(account, patch) {
    setBusy(true); setError("");
    try {
      const payload = { mail_enabled: patch.mail_enabled ?? account.mail_enabled ?? false, mail_destinations: patch.mail_destinations ?? account.mail_destinations ?? [], pm_workspace_ids: patch.pm_workspace_ids ?? account.pm_workspace_ids ?? [], mail_categories: patch.mail_categories ?? account.mail_categories ?? mailCategories.map(([v]) => v) };
      await api.patch(`/personal-calendar/connections/${account.id}/`, payload);
      setMessage("Email routing saved."); await load();
    } catch (e) { setError(e?.response?.data?.detail || "Could not save email routing."); } finally { setBusy(false); }
  }

  const leadForm = (model, setter, existing = false) => <div className="grid gap-3 pb-6">
    <div className="grid gap-3 sm:grid-cols-3"><Field label="Stage"><select className={inputClass} value={model.stage || "NEW"} onChange={(e) => setter({ ...model, stage: e.target.value })}>{stageRows.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></Field><Field label="Lead type"><select className={inputClass} value={model.lead_type || "REGULAR"} onChange={(e) => setter({ ...model, lead_type: e.target.value })}>{typeRows.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></Field><Field label="Source"><select className={inputClass} value={model.source || "MANUAL"} onChange={(e) => setter({ ...model, source: e.target.value })}>{sourceRows.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></Field></div>
    <div className="grid gap-3 sm:grid-cols-2"><Field label="First name"><input className={inputClass} value={model.first_name || ""} onChange={(e) => setter({ ...model, first_name: e.target.value })}/></Field><Field label="Last name"><input className={inputClass} value={model.last_name || ""} onChange={(e) => setter({ ...model, last_name: e.target.value })}/></Field><Field label="Email"><input type="email" className={inputClass} value={model.email || ""} onChange={(e) => setter({ ...model, email: e.target.value })}/></Field><Field label="Phone"><input className={inputClass} value={model.phone || ""} onChange={(e) => setter({ ...model, phone: e.target.value })}/></Field><Field label="Company"><input className={inputClass} value={model.company_name || ""} onChange={(e) => setter({ ...model, company_name: e.target.value })}/></Field><Field label="Property"><select className={inputClass} value={model.property || ""} onChange={(e) => setter({ ...model, property: e.target.value })}><option value="">Not matched yet</option>{properties.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.address}</option>)}</select></Field></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Field label="Start"><input type="date" className={inputClass} value={model.requested_start || ""} onChange={(e) => setter({ ...model, requested_start: e.target.value })}/></Field><Field label="End"><input type="date" className={inputClass} value={model.requested_end || ""} onChange={(e) => setter({ ...model, requested_end: e.target.value })}/></Field><Field label="Adults"><input type="number" min="0" className={inputClass} value={model.adults ?? 1} onChange={(e) => setter({ ...model, adults: e.target.value })}/></Field><Field label="Children"><input type="number" min="0" className={inputClass} value={model.children ?? 0} onChange={(e) => setter({ ...model, children: e.target.value })}/></Field><Field label="Pets"><input type="number" min="0" className={inputClass} value={model.pets ?? 0} onChange={(e) => setter({ ...model, pets: e.target.value })}/></Field><Field label="Budget"><input className={inputClass} value={model.budget_amount || ""} onChange={(e) => setter({ ...model, budget_amount: e.target.value })}/></Field></div>
    <label className="flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs"><input type="checkbox" checked={Boolean(model.furnished_requested)} onChange={(e) => setter({ ...model, furnished_requested: e.target.checked })}/>Furnished requested</label>
    <Field label="Pet notes"><input className={inputClass} value={model.pet_notes || ""} onChange={(e) => setter({ ...model, pet_notes: e.target.value })}/></Field>
    <Field label="Lead summary"><textarea rows={4} className={inputClass} value={model.summary || ""} onChange={(e) => setter({ ...model, summary: e.target.value })}/></Field>
    <Field label="Internal notes"><textarea rows={3} className={inputClass} value={model.notes || ""} onChange={(e) => setter({ ...model, notes: e.target.value })}/></Field>
    <button onClick={() => saveLead(model, existing)} disabled={busy} className="rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-black text-slate-950 disabled:opacity-50">{busy ? "Saving..." : existing ? "Save Lead" : "Create Lead"}</button>
  </div>;

  return <div className="min-h-screen bg-[#020611] text-slate-100"><main className="space-y-4 px-4 py-5 sm:px-6">
    <section className="rounded-[28px] border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-[#07111f] to-fuchsia-500/10 p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-300">Leasing intelligence</div><h2 className="mt-2 text-2xl font-black">PM Leads Command Center</h2><p className="mt-1 max-w-3xl text-sm text-slate-400">Rental inquiries, corporate housing, insurance housing, relocation, Section 8, and other prospects in one property-linked pipeline.</p></div><div className="flex flex-wrap gap-2"><button onClick={() => { setDraft(blankLead); setDrawer("new"); }} className="rounded-xl bg-cyan-400 px-3 py-2 text-xs font-black text-slate-950">+ Add Lead</button><button onClick={syncInbox} disabled={busy} className="rounded-xl border border-emerald-400/45 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-100 disabled:opacity-50">{busy ? "Syncing..." : "Sync Inbox"}</button><button onClick={() => setDrawer("mail")} className="rounded-xl border border-fuchsia-400/45 bg-fuchsia-500/10 px-3 py-2 text-xs font-black text-fuchsia-100">Email Accounts</button></div></div></section>
    {error ? <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</div> : null}{message ? <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{message}</div> : null}
    <section className="rounded-[24px] border border-cyan-500/15 bg-[#07111f]/90 p-4"><div className="grid gap-3 md:grid-cols-[1fr_auto_auto]"><input className={inputClass} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search lead, company, property, source..."/><select className={inputClass} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option value="">All lead types</option>{typeRows.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select><select className={inputClass} value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}><option value="">All sources</option>{sourceRows.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></div><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => setStageFilter("ACTIVE")} className={`rounded-full border px-2.5 py-1.5 text-[11px] font-black ${stageFilter === "ACTIVE" ? "border-cyan-300 bg-cyan-400 text-slate-950" : "border-slate-700 text-slate-300"}`}>Active {leads.filter((l) => !["WON","LOST"].includes(l.stage)).length}</button>{stageRows.map(([v,l]) => <button key={v} onClick={() => setStageFilter(v)} className={`rounded-full border px-2.5 py-1.5 text-[11px] font-black ${stageFilter === v ? "border-cyan-300 bg-cyan-400 text-slate-950" : "border-slate-700 text-slate-300"}`}>{l} {counts[v] || 0}</button>)}</div></section>
    <section className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">{filtered.length ? filtered.map((lead) => <button key={lead.id} onClick={() => openLead(lead.id)} className="rounded-[22px] border border-slate-700 bg-[#07111f]/90 p-4 text-left transition hover:border-cyan-400/45 hover:bg-cyan-500/5"><div className="flex items-start justify-between gap-3"><div><div className="text-base font-black text-white">{lead.full_name}</div><div className="mt-1 text-xs text-slate-400">{lead.company_name || lead.email || "No contact email"}</div></div>{tag(lead.stage === "WON" ? "emerald" : lead.stage === "LOST" ? "amber" : "cyan", stageRows.find(([v]) => v === lead.stage)?.[1] || lead.stage)}</div><div className="mt-3 flex flex-wrap gap-1.5">{tag("fuchsia", typeRows.find(([v]) => v === lead.lead_type)?.[1] || lead.lead_type)}{tag("cyan", lead.source_label || lead.source)}{lead.furnished_requested ? tag("emerald", "Furnished") : null}</div><div className="mt-3 grid grid-cols-2 gap-2 text-[11px]"><div><span className="text-slate-500">Property</span><div className="mt-0.5 font-semibold text-slate-200">{lead.property_name || "Unmatched"}</div></div><div><span className="text-slate-500">Stay</span><div className="mt-0.5 font-semibold text-slate-200">{lead.requested_start || "—"} → {lead.requested_end || "—"}</div></div><div><span className="text-slate-500">Party</span><div className="mt-0.5 font-semibold text-slate-200">{lead.adults} adults · {lead.children} kids · {lead.pets} pets</div></div><div><span className="text-slate-500">Messages</span><div className="mt-0.5 font-semibold text-slate-200">{lead.message_count || 0}</div></div></div>{lead.classification_reason ? <div className="mt-3 rounded-xl border border-slate-800 bg-black/20 p-2 text-[10px] text-slate-400">SYNC: {lead.classification_reason} · {lead.classification_confidence}%</div> : null}</button>) : <div className="col-span-full rounded-[22px] border border-dashed border-slate-700 p-10 text-center text-sm text-slate-400">No leads match these filters.</div>}</section>
  </main>

  {drawer === "new" ? <Drawer title="Add Lead" onClose={() => setDrawer("")}>{leadForm(draft, setDraft)}</Drawer> : null}
  {drawer === "lead" && selected ? <Drawer title={selected.full_name} width="max-w-4xl" onClose={() => setDrawer("")}><div className="space-y-4">{selected.classification_reason ? <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs"><strong>SYNC classification:</strong> {selected.classification_reason} · {selected.classification_confidence}% confidence</div> : null}{leadForm(selected, setSelected, true)}<div className="rounded-2xl border border-slate-800 p-3"><div className="text-sm font-black">Communication thread</div><div className="mt-3 space-y-2">{(selected.messages || []).length ? selected.messages.map((m) => <div key={m.id} className={`rounded-xl border p-3 ${m.direction === "OUTBOUND" ? "border-cyan-500/20 bg-cyan-500/5" : m.direction === "INTERNAL" ? "border-amber-500/20 bg-amber-500/5" : "border-slate-700 bg-slate-900/50"}`}><div className="flex justify-between gap-3 text-[10px] text-slate-500"><span>{m.direction} · {m.sender_name || m.sender_email || m.channel}</span><span>{String(m.sent_at || m.created_at || "").replace("T", " ").slice(0,16)}</span></div>{m.subject ? <div className="mt-1 text-xs font-black">{m.subject}</div> : null}<div className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-300">{m.body}</div></div>) : <div className="text-xs text-slate-500">No messages yet.</div>}</div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div><textarea rows={4} className={inputClass} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply by email..."/><button onClick={sendReply} disabled={busy || !selected.email} className="mt-2 rounded-lg bg-cyan-400 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-40">Send Email</button></div><div><textarea rows={4} className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Internal note — never emailed..."/><button onClick={addNote} disabled={busy} className="mt-2 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs font-black text-amber-100 disabled:opacity-40">Save Internal Note</button></div></div></div><div className="flex flex-wrap gap-2 border-t border-slate-800 pt-4">{selected.stage === "WON" ? <button onClick={convertToTenant} disabled={busy} className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-black text-slate-950">Convert to Tenant</button> : null}<button onClick={deleteLead} className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs font-black text-rose-100">Delete Lead</button></div></div></Drawer> : null}
  {drawer === "mail" ? <Drawer title="Email Accounts & SYNC Routing" width="max-w-3xl" onClose={() => setDrawer("")}><div className="space-y-4"><div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs leading-5 text-slate-300">Connections are owned by the signed-in user. You decide which areas each mailbox may feed. SYNC classifies the message; routing permissions decide where it is allowed to go. Non-PM banking/personal mail is not copied into this PM workspace.</div>{mailAccounts.length ? mailAccounts.map((account) => <MailAccountCard key={`${account.id}-${account.updated_at || "current"}`} account={account} workspaces={workspaces} onSave={saveMailRoute} onSync={async () => { setBusy(true); try { const r = await api.post(`/personal-calendar/connections/${account.id}/sync/`); setMessage(`Mailbox synced. ${r.data?.mail?.leads || 0} leads and ${r.data?.mail?.pm_messages || 0} PM messages routed.`); await load(); } catch (e) { setError(e?.response?.data?.detail || "Mailbox sync failed. Reconnect Outlook to grant Mail.Read/Mail.Send."); } finally { setBusy(false); } }} busy={busy}/>) : <div className="rounded-xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-400">No Microsoft mailbox connected yet.</div>}<button onClick={startMicrosoft} className="rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-black text-slate-950">{mailAccounts.length ? "Connect Another Outlook Account" : "Connect Outlook / Microsoft"}</button><div className="text-[11px] leading-5 text-slate-500">Existing Microsoft Calendar connections created before this build may need one reconnect so Microsoft can grant the additional Mail.Read and Mail.Send permissions. Gmail routing is the next provider adapter; this build activates Microsoft/Outlook first.</div></div></Drawer> : null}
</div>;
}

function MailAccountCard({ account, workspaces, onSave, onSync, busy }) {
  const [draft, setDraft] = useState({ mail_enabled: Boolean(account.mail_enabled), mail_destinations: account.mail_destinations || [], pm_workspace_ids: account.pm_workspace_ids || [], mail_categories: account.mail_categories || mailCategories.map(([v]) => v) });
  const toggleList = (key, value) => setDraft((d) => ({ ...d, [key]: d[key].includes(value) ? d[key].filter((v) => String(v) !== String(value)) : [...d[key], value] }));
  return <div className="rounded-2xl border border-slate-700 bg-[#07111f] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-black">{account.display_name || account.email}</div><div className="mt-1 text-xs text-slate-400">{account.email} · Microsoft</div></div><label className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs"><input type="checkbox" checked={draft.mail_enabled} onChange={(e) => setDraft((d) => ({ ...d, mail_enabled: e.target.checked }))}/>Process email with SYNC</label></div><div className="mt-4"><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Allowed destinations</div><div className="mt-2 flex flex-wrap gap-2">{[["PERSONAL","Personal"],["FINANCE","Finance"],["PM","Property Management"],["BUSINESS","Business"]].map(([v,l]) => <button type="button" key={v} onClick={() => toggleList("mail_destinations", v)} className={`rounded-full border px-2.5 py-1.5 text-[11px] font-black ${draft.mail_destinations.includes(v) ? "border-cyan-300 bg-cyan-400 text-slate-950" : "border-slate-700 text-slate-300"}`}>{l}</button>)}</div></div>{draft.mail_destinations.includes("PM") ? <><div className="mt-4"><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Which PM portfolios may receive mail?</div><div className="mt-2 space-y-2">{workspaces.map((w) => <label key={w.id} className="flex items-center gap-2 rounded-lg border border-slate-800 p-2 text-xs"><input type="checkbox" checked={draft.pm_workspace_ids.map(String).includes(String(w.id))} onChange={() => toggleList("pm_workspace_ids", w.id)}/>{w.name}</label>)}</div></div><div className="mt-4"><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">PM categories to extract</div><div className="mt-2 flex flex-wrap gap-2">{mailCategories.map(([v,l]) => <button type="button" key={v} onClick={() => toggleList("mail_categories", v)} className={`rounded-full border px-2.5 py-1.5 text-[11px] font-black ${draft.mail_categories.includes(v) ? "border-fuchsia-300 bg-fuchsia-400/20 text-fuchsia-100" : "border-slate-700 text-slate-400"}`}>{l}</button>)}</div></div></> : null}<div className="mt-4 flex flex-wrap gap-2"><button onClick={() => onSave(account, draft)} disabled={busy} className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-50">Save Routing</button><button onClick={onSync} disabled={busy || !draft.mail_enabled} className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-100 disabled:opacity-40">Sync Now</button></div>{account.mail_last_error ? <div className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/5 p-2 text-[11px] text-rose-200">{account.mail_last_error}</div> : null}{account.mail_last_synced_at ? <div className="mt-2 text-[10px] text-slate-500">Last mail sync: {String(account.mail_last_synced_at).replace("T"," ").slice(0,16)}</div> : null}</div>;
}
