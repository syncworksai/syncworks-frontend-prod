import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client";

const STATUSES = ["IDEA", "BUILD_LATER", "NEXT", "IN_PROGRESS", "TESTING", "DONE"];
const PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW"];
const MODULES = ["General", "SYNC Assistant", "Communications / SYNC Inbox", "Personal", "Finance", "Business", "Property Management", "Health", "Calendar", "Social / Growth", "Marketplace", "God Mode", "Developer Agent", "Mobile", "Infrastructure"];

function pill(status) {
  if (status === "DONE") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  if (status === "IN_PROGRESS") return "border-cyan-400/30 bg-cyan-400/10 text-cyan-200";
  if (status === "NEXT") return "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-200";
  if (status === "TESTING") return "border-violet-400/30 bg-violet-400/10 text-violet-200";
  if (status === "BUILD_LATER") return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  return "border-slate-600 bg-slate-900 text-slate-300";
}
function priorityClass(priority) { if (priority === "URGENT") return "text-rose-300"; if (priority === "HIGH") return "text-amber-300"; if (priority === "MEDIUM") return "text-cyan-300"; return "text-slate-400"; }

export default function GodModeBuildBacklog() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [moduleFilter, setModuleFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState({ title: "", status: "BUILD_LATER", priority: "MEDIUM", module: "General", notes: "", source: "God Mode" });
  const [edits, setEdits] = useState({});
  const [showDetails, setShowDetails] = useState(false);
  const [showCreate, setShowCreate] = useState(true);

  async function load({ quiet = false } = {}) {
    if (!quiet) setLoading(true); setError("");
    try { const response = await api.get("/platform/developer-agent/status/"); const next = response?.data?.build_backlog || null; setPayload(next); if (next?.error) setError(next.error); }
    catch (err) { setError(err?.response?.data?.detail || err?.message || "Unable to load Build Backlog."); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const items = useMemo(() => Array.isArray(payload?.items) ? payload.items : [], [payload]);
  const modules = useMemo(() => Array.from(new Set([...MODULES, ...items.map((item) => item.module).filter(Boolean)])).sort(), [items]);
  const filtered = useMemo(() => { const q = search.trim().toLowerCase(); return items.filter((item) => { if (statusFilter === "OPEN" && item.status === "DONE") return false; if (statusFilter !== "ALL" && statusFilter !== "OPEN" && item.status !== statusFilter) return false; if (moduleFilter !== "ALL" && item.module !== moduleFilter) return false; if (q && !`${item.title} ${item.module} ${item.notes} ${item.source}`.toLowerCase().includes(q)) return false; return true; }); }, [items, statusFilter, moduleFilter, search]);
  const counts = useMemo(() => STATUSES.reduce((acc, status) => ({ ...acc, [status]: items.filter((item) => item.status === status).length }), {}), [items]);

  async function createItem() {
    if (!draft.title.trim() || saving) return;
    setSaving("new"); setError(""); setMessage("");
    try { await api.post("/platform/developer-agent/run/", { backlog_action: "create", ...draft }); setDraft({ title: "", status: "BUILD_LATER", priority: "MEDIUM", module: "General", notes: "", source: "God Mode" }); setMessage("Backlog item saved in SyncWorks."); await load({ quiet: true }); }
    catch (err) { setError(err?.response?.data?.detail || "Could not create backlog item."); }
    finally { setSaving(""); }
  }
  function editValue(item, key) { return edits[item.id]?.[key] ?? item[key] ?? ""; }
  function change(item, key, value) { setEdits((current) => ({ ...current, [item.id]: { ...(current[item.id] || {}), [key]: value } })); }
  async function saveItem(item) {
    if (saving) return;
    setSaving(String(item.id)); setError(""); setMessage("");
    try { await api.post("/platform/developer-agent/run/", { backlog_action: "update", id: item.id, issue_number: item.issue_number, title: editValue(item, "title"), status: editValue(item, "status"), priority: editValue(item, "priority"), module: editValue(item, "module"), notes: editValue(item, "notes"), source: item.source || "God Mode" }); setEdits((current) => { const next = { ...current }; delete next[item.id]; return next; }); setMessage(`Saved backlog item #${item.id}.`); await load({ quiet: true }); }
    catch (err) { setError(err?.response?.data?.detail || "Could not update backlog item."); }
    finally { setSaving(""); }
  }

  return <section className="sw-god-backlog space-y-3">
    <div className="sw-god-backlog-summary rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-[#07111f] via-slate-950 to-fuchsia-950/20 p-3 shadow-[0_0_35px_rgba(34,211,238,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><div className="text-[10px] font-black uppercase tracking-[0.17em] text-cyan-300">Product operations</div><h2 className="text-lg font-black text-white">Backlog overview</h2></div><div className="flex gap-2"><button type="button" aria-expanded={showDetails} onClick={() => setShowDetails(v => !v)} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300">{showDetails ? "Hide details" : "About"}</button><button type="button" onClick={() => load()} className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-100">Refresh</button></div></div>
      {showDetails && <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-300">Product ideas are stored in the SyncWorks production database. GitHub mirroring is optional, and Developer Agent workflows can reference these ideas without requiring GitHub availability.</p>}
      <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wide"><span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-emerald-200">Primary: SyncWorks Database</span><span className={`rounded-full border px-3 py-1 ${payload?.github_mirror_healthy && payload?.github_mirror_configured ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-200" : "border-slate-700 bg-slate-900 text-slate-400"}`}>GitHub mirror: {payload?.github_mirror_configured ? (payload?.github_mirror_healthy ? "Healthy" : "Needs permission") : "Optional / Off"}</span></div>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">{STATUSES.map((status) => <div key={status} className="rounded-xl border border-slate-800 bg-black/25 p-2.5"><div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{status.replaceAll("_", " ")}</div><div className="mt-1 text-xl font-black text-white">{counts[status] || 0}</div></div>)}</div>
    </div>

    {error ? <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100">{error}</div> : null}
    {payload?.warning ? <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100">Backlog is working normally. Optional GitHub mirror warning: {payload.warning}</div> : null}
    {message ? <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">{message}</div> : null}

    <div className="sw-god-backlog-compose rounded-2xl border border-fuchsia-500/20 bg-slate-950/70 p-3">
      <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-black text-white">Add product idea</h3><button type="button" onClick={()=>setShowCreate(v=>!v)} aria-expanded={showCreate} className="rounded-lg border border-fuchsia-300/25 px-3 py-1.5 text-xs font-bold text-fuchsia-200">{showCreate ? "Collapse" : "New idea +"}</button></div>
      {showCreate && <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-12">
        <input aria-label="Product idea title" value={draft.title} onChange={e=>setDraft(p=>({...p,title:e.target.value}))} placeholder="What should we build?" className="min-w-0 min-h-10 rounded-xl border border-slate-700 bg-[#07111f] px-3 text-sm text-white col-span-2 lg:col-span-5"/>
        <select aria-label="Module" value={draft.module} onChange={e=>setDraft(p=>({...p,module:e.target.value}))} className="min-w-0 min-h-10 rounded-xl border border-slate-700 bg-[#07111f] px-2 text-sm lg:col-span-3">{modules.map(module=><option key={module}>{module}</option>)}</select>
        <select aria-label="Priority" value={draft.priority} onChange={e=>setDraft(p=>({...p,priority:e.target.value}))} className="min-w-0 min-h-10 rounded-xl border border-slate-700 bg-[#07111f] px-2 text-sm lg:col-span-2">{PRIORITIES.map(priority=><option key={priority}>{priority}</option>)}</select>
        <select aria-label="Status" value={draft.status} onChange={e=>setDraft(p=>({...p,status:e.target.value}))} className="min-w-0 min-h-10 rounded-xl border border-slate-700 bg-[#07111f] px-2 text-sm lg:col-span-2">{STATUSES.map(status=><option key={status} value={status}>{status.replaceAll("_"," ")}</option>)}</select>
        <textarea aria-label="Idea notes" value={draft.notes} onChange={e=>setDraft(p=>({...p,notes:e.target.value}))} rows={2} placeholder="Notes, context and requirements (optional)" className="min-w-0 rounded-xl border border-slate-700 bg-[#07111f] p-3 text-sm text-white col-span-2 lg:col-span-10"/>
        <button type="button" onClick={createItem} disabled={!draft.title.trim()||Boolean(saving)} className="min-h-10 rounded-xl bg-cyan-400 px-3 text-xs font-black text-slate-950 disabled:opacity-50 col-span-2 lg:col-span-2">{saving==="new"?"Adding...":"Add to Backlog"}</button>
      </div>}
    </div>

    <div className="sw-god-backlog-list rounded-2xl border border-slate-800 bg-slate-950/70 p-3"><div className="flex flex-wrap gap-2"><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-700 bg-[#07111f] px-3 py-2 text-sm"><option value="OPEN">Open backlog</option><option value="ALL">All statuses</option>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select><select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="rounded-xl border border-slate-700 bg-[#07111f] px-3 py-2 text-sm"><option value="ALL">All modules</option>{modules.map((module) => <option key={module}>{module}</option>)}</select><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search backlog..." className="min-w-60 flex-1 rounded-xl border border-slate-700 bg-[#07111f] px-3 py-2 text-sm" /></div><div className="mt-4 space-y-3">{loading ? <div className="py-10 text-center text-sm text-slate-500">Loading persistent backlog...</div> : null}{!loading && filtered.length === 0 ? <div className="py-10 text-center text-sm text-slate-500">No backlog items match these filters.</div> : null}{filtered.map((item) => <article key={item.id} className="rounded-2xl border border-slate-800 bg-[#07111f]/75 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2 py-1 text-[10px] font-black ${pill(editValue(item, "status"))}`}>{String(editValue(item, "status")).replaceAll("_", " ")}</span><span className={`text-[10px] font-black ${priorityClass(editValue(item, "priority"))}`}>{editValue(item, "priority")}</span><span className="text-[10px] text-slate-500">SW #{item.id} · {item.source}</span>{item.github_mirrored ? <span className="text-[10px] text-cyan-400">GitHub #{item.issue_number}</span> : null}</div><input value={editValue(item, "title")} onChange={(e) => change(item, "title", e.target.value)} className="mt-3 w-full bg-transparent text-lg font-black text-white outline-none" /></div>{item.url ? <a href={item.url} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:border-cyan-400/40 hover:text-cyan-200">Open GitHub Mirror</a> : null}</div><div className="mt-3 grid gap-3 md:grid-cols-3"><select value={editValue(item, "status")} onChange={(e) => change(item, "status", e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm">{STATUSES.map((status) => <option key={status}>{status}</option>)}</select><select value={editValue(item, "priority")} onChange={(e) => change(item, "priority", e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm">{PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}</select><input value={editValue(item, "module")} onChange={(e) => change(item, "module", e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm" /></div><textarea value={editValue(item, "notes")} onChange={(e) => change(item, "notes", e.target.value)} rows={4} className="mt-3 w-full rounded-xl border border-slate-800 bg-black/25 p-3 text-sm leading-6 text-slate-300" /><div className="mt-3 flex justify-end"><button type="button" onClick={() => saveItem(item)} disabled={Boolean(saving)} className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-black text-cyan-100 hover:bg-cyan-400/20 disabled:opacity-50">{saving === String(item.id) ? "Saving..." : "Save"}</button></div></article>)}</div></div>
  </section>;
}
