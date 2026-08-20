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

  return <section className="mt-5 space-y-5">
    <div className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-[#07111f] via-slate-950 to-fuchsia-950/20 p-5 shadow-[0_0_50px_rgba(34,211,238,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">God Mode Product Operations</div><h2 className="mt-2 text-2xl font-black text-white">Build Backlog</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Persistent product ideas live in the SyncWorks production database. GitHub is an optional Developer Agent mirror, so a GitHub permission problem can never take the backlog offline.</p></div><button type="button" onClick={() => load()} className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-black text-cyan-100 hover:bg-cyan-400/20">Refresh</button></div>
      <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wide"><span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-emerald-200">Primary: SyncWorks Database</span><span className={`rounded-full border px-3 py-1 ${payload?.github_mirror_healthy && payload?.github_mirror_configured ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-200" : "border-slate-700 bg-slate-900 text-slate-400"}`}>GitHub mirror: {payload?.github_mirror_configured ? (payload?.github_mirror_healthy ? "Healthy" : "Needs permission") : "Optional / Off"}</span></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">{STATUSES.map((status) => <div key={status} className="rounded-2xl border border-slate-800 bg-black/25 p-3"><div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{status.replaceAll("_", " ")}</div><div className="mt-1 text-xl font-black text-white">{counts[status] || 0}</div></div>)}</div>
    </div>

    {error ? <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100">{error}</div> : null}
    {payload?.warning ? <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100">Backlog is working normally. Optional GitHub mirror warning: {payload.warning}</div> : null}
    {message ? <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">{message}</div> : null}

    <div className="rounded-3xl border border-fuchsia-500/20 bg-slate-950/75 p-5"><h3 className="text-lg font-black text-white">Add product idea</h3><div className="mt-4 grid gap-3 lg:grid-cols-12"><input value={draft.title} onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))} placeholder="What should we build?" className="min-h-11 rounded-xl border border-slate-700 bg-[#07111f] px-3 text-sm text-white lg:col-span-5" /><select value={draft.module} onChange={(e) => setDraft((p) => ({ ...p, module: e.target.value }))} className="min-h-11 rounded-xl border border-slate-700 bg-[#07111f] px-3 text-sm lg:col-span-3">{modules.map((module) => <option key={module}>{module}</option>)}</select><select value={draft.priority} onChange={(e) => setDraft((p) => ({ ...p, priority: e.target.value }))} className="min-h-11 rounded-xl border border-slate-700 bg-[#07111f] px-3 text-sm lg:col-span-2">{PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}</select><select value={draft.status} onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value }))} className="min-h-11 rounded-xl border border-slate-700 bg-[#07111f] px-3 text-sm lg:col-span-2">{STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select><textarea value={draft.notes} onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))} rows={3} placeholder="Context, requirements, why it matters..." className="rounded-xl border border-slate-700 bg-[#07111f] p-3 text-sm text-white lg:col-span-10" /><button type="button" onClick={createItem} disabled={!draft.title.trim() || Boolean(saving)} className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50 lg:col-span-2">{saving === "new" ? "Adding..." : "Add to Backlog"}</button></div></div>

    <div className="rounded-3xl border border-slate-800 bg-slate-950/75 p-5"><div className="flex flex-wrap gap-2"><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-700 bg-[#07111f] px-3 py-2 text-sm"><option value="OPEN">Open backlog</option><option value="ALL">All statuses</option>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select><select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="rounded-xl border border-slate-700 bg-[#07111f] px-3 py-2 text-sm"><option value="ALL">All modules</option>{modules.map((module) => <option key={module}>{module}</option>)}</select><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search backlog..." className="min-w-60 flex-1 rounded-xl border border-slate-700 bg-[#07111f] px-3 py-2 text-sm" /></div><div className="mt-4 space-y-3">{loading ? <div className="py-10 text-center text-sm text-slate-500">Loading persistent backlog...</div> : null}{!loading && filtered.length === 0 ? <div className="py-10 text-center text-sm text-slate-500">No backlog items match these filters.</div> : null}{filtered.map((item) => <article key={item.id} className="rounded-2xl border border-slate-800 bg-[#07111f]/75 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2 py-1 text-[10px] font-black ${pill(editValue(item, "status"))}`}>{String(editValue(item, "status")).replaceAll("_", " ")}</span><span className={`text-[10px] font-black ${priorityClass(editValue(item, "priority"))}`}>{editValue(item, "priority")}</span><span className="text-[10px] text-slate-500">SW #{item.id} · {item.source}</span>{item.github_mirrored ? <span className="text-[10px] text-cyan-400">GitHub #{item.issue_number}</span> : null}</div><input value={editValue(item, "title")} onChange={(e) => change(item, "title", e.target.value)} className="mt-3 w-full bg-transparent text-lg font-black text-white outline-none" /></div>{item.url ? <a href={item.url} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:border-cyan-400/40 hover:text-cyan-200">Open GitHub Mirror</a> : null}</div><div className="mt-3 grid gap-3 md:grid-cols-3"><select value={editValue(item, "status")} onChange={(e) => change(item, "status", e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm">{STATUSES.map((status) => <option key={status}>{status}</option>)}</select><select value={editValue(item, "priority")} onChange={(e) => change(item, "priority", e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm">{PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}</select><input value={editValue(item, "module")} onChange={(e) => change(item, "module", e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm" /></div><textarea value={editValue(item, "notes")} onChange={(e) => change(item, "notes", e.target.value)} rows={4} className="mt-3 w-full rounded-xl border border-slate-800 bg-black/25 p-3 text-sm leading-6 text-slate-300" /><div className="mt-3 flex justify-end"><button type="button" onClick={() => saveItem(item)} disabled={Boolean(saving)} className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-black text-cyan-100 hover:bg-cyan-400/20 disabled:opacity-50">{saving === String(item.id) ? "Saving..." : "Save"}</button></div></article>)}</div></div>
  </section>;
}
