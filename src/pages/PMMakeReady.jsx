import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";

const statuses = ["ALL", "NEW", "ASSIGNED", "SCHEDULED", "IN_PROGRESS", "WAITING_PARTS", "WAITING_APPROVAL", "COMPLETED"];
const inputClass = "min-h-11 w-full rounded-2xl border border-slate-700 bg-black/30 px-3 text-sm text-white";

function money(value) {
  if (value === "" || value === null || value === undefined) return "Not set";
  return Number(value || 0).toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default function PMMakeReady() {
  const [workspace, setWorkspace] = useState(null);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ total: 0, unassigned: 0, in_progress: 0, ready_for_final: 0 });
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [assignedFilter, setAssignedFilter] = useState("");
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const ws = (await api.get("/pm-hub/workspaces/current/")).data;
      setWorkspace(ws);
      const params = {};
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (assignedFilter.trim()) params.assigned_to = assignedFilter.trim();
      const response = await api.get("/pm-hub/make-ready/", { headers: { "X-PM-Workspace-ID": String(ws.id) }, params });
      setRows(response.data?.results || []);
      setSummary(response.data?.summary || {});
    } catch (error) {
      setNotice(error?.response?.data?.detail || "Could not load make-ready properties.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [statusFilter]);

  const assignees = useMemo(() => [...new Set(rows.map((item) => item.assigned_to).filter(Boolean))].sort(), [rows]);

  async function save(item) {
    const payload = {
      status: item.status,
      priority: item.priority,
      internal_assignee: item.assigned_to,
      vendor_name: item.vendor_name,
      preferred_schedule: item.target_date,
      not_to_exceed: item.estimated_cost,
      resolution_notes: item.resolution_notes,
    };
    await api.patch(`/pm-hub/make-ready/${item.id}/`, payload, { headers: { "X-PM-Workspace-ID": String(workspace.id) } });
    setEditing(null);
    setNotice("Make-ready assignment updated.");
    await load();
  }

  return <main className="space-y-5 px-4 py-6 sm:px-6">
    {notice ? <div className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-4 text-sm text-cyan-100">{notice}</div> : null}

    <section className="rounded-[28px] border border-cyan-500/15 bg-[#07111f]/92 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="text-xl font-black text-white">Make-Ready Command Center</h2><p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">Vacant and recently closed occupancies move here for assessment, repairs, team assignment, final inspection, and listing readiness.</p></div>
        <button type="button" onClick={load} className="min-h-11 rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-5 text-sm font-black text-cyan-100">Refresh</button>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[["Total", summary.total], ["Unassigned", summary.unassigned], ["In progress", summary.in_progress], ["Ready for final", summary.ready_for_final]].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-800 bg-black/25 p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</div><div className="mt-2 text-2xl font-black text-white">{value || 0}</div></div>)}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr_auto]">
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClass}>{statuses.map((item) => <option key={item}>{item}</option>)}</select>
        <input list="make-ready-assignees" value={assignedFilter} onChange={(event) => setAssignedFilter(event.target.value)} placeholder="Filter by employee, team, or vendor" className={inputClass} />
        <datalist id="make-ready-assignees">{assignees.map((item) => <option key={item} value={item} />)}</datalist>
        <button type="button" onClick={load} className="rounded-2xl bg-cyan-400 px-5 text-sm font-black text-slate-950">Apply Filters</button>
      </div>
    </section>

    <section className="grid gap-4 xl:grid-cols-2">
      {loading ? <div className="rounded-[28px] border border-slate-800 bg-[#07111f]/92 p-8 text-slate-500">Loading make-ready properties...</div> : rows.length ? rows.map((item) => <article key={item.id} className="rounded-[28px] border border-cyan-500/15 bg-[#07111f]/92 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">{item.status.replaceAll("_", " ")}</div><h3 className="mt-2 text-xl font-black text-white">{item.property_name}{item.unit_label ? ` · ${item.unit_label}` : ""}</h3><div className="mt-1 text-sm text-slate-500">{item.property_address}</div></div><span className="rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-3 py-1 text-[10px] font-black text-fuchsia-100">{item.priority}</span></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm"><div><span className="text-slate-500">Former tenant</span><div className="mt-1 font-bold text-white">{item.former_tenant || "Vacant property"}</div></div><div><span className="text-slate-500">Assigned team</span><div className="mt-1 font-bold text-white">{item.assigned_to || "Unassigned"}</div></div><div><span className="text-slate-500">Target</span><div className="mt-1 font-bold text-white">{item.target_date || "Not set"}</div></div><div><span className="text-slate-500">Approval limit</span><div className="mt-1 font-bold text-white">{money(item.estimated_cost)}</div></div></div>
        <p className="mt-4 rounded-2xl border border-slate-800 bg-black/25 p-4 text-sm leading-6 text-slate-300">{item.description}</p>
        <button type="button" onClick={() => setEditing({ ...item })} className="mt-4 min-h-11 w-full rounded-2xl border border-cyan-400/30 bg-cyan-500/10 text-sm font-black text-cyan-100">Assign / Update</button>
      </article>) : <div className="rounded-[28px] border border-dashed border-slate-700 p-10 text-center text-sm text-slate-500 xl:col-span-2">No make-ready properties match this filter.</div>}
    </section>

    {editing ? <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-3 sm:items-center"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-cyan-400/25 bg-[#07111f] p-5"><div className="flex items-center justify-between"><div><h3 className="text-xl font-black text-white">{editing.property_name}</h3><p className="mt-1 text-xs text-slate-500">Assign the team, update progress, cost ceiling, and completion notes.</p></div><button type="button" onClick={() => setEditing(null)} className="text-slate-400">Close</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })} className={inputClass}>{statuses.filter((item) => item !== "ALL").map((item) => <option key={item}>{item}</option>)}</select><select value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: e.target.value })} className={inputClass}><option>ROUTINE</option><option>HIGH</option><option>URGENT</option><option>EMERGENCY</option></select><input value={editing.assigned_to || ""} onChange={(e) => setEditing({ ...editing, assigned_to: e.target.value })} placeholder="Employee or team" className={inputClass} /><input value={editing.vendor_name || ""} onChange={(e) => setEditing({ ...editing, vendor_name: e.target.value })} placeholder="Vendor, optional" className={inputClass} /><input value={editing.target_date || ""} onChange={(e) => setEditing({ ...editing, target_date: e.target.value })} placeholder="Target date or schedule" className={inputClass} /><input type="number" step="0.01" value={editing.estimated_cost || ""} onChange={(e) => setEditing({ ...editing, estimated_cost: e.target.value })} placeholder="Owner approval limit" className={inputClass} /></div><textarea value={editing.resolution_notes || ""} onChange={(e) => setEditing({ ...editing, resolution_notes: e.target.value })} placeholder="Progress, blockers, materials, photos, final inspection notes" className="mt-3 min-h-32 w-full rounded-2xl border border-slate-700 bg-black/30 p-4 text-white" /><button type="button" onClick={() => save(editing)} className="mt-4 min-h-11 w-full rounded-2xl bg-cyan-400 font-black text-slate-950">Save Make-Ready Update</button></div></div> : null}
  </main>;
}
