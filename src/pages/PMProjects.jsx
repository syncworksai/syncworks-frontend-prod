import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import PMHeader from "../components/pm/PMHeader";
import Button from "../components/ui/Button";

const STAGES = [
  ["REQUESTED", "Requested"], ["PLANNING", "Planning"], ["APPROVAL", "Approval"], ["SCHEDULED", "Scheduled"],
  ["IN_PROGRESS", "In Progress"], ["REVIEW", "Review"], ["COMPLETED", "Completed"],
];
const CATEGORIES = ["Capital Improvement", "Installation", "Painting", "Signage", "Landscaping", "Compliance", "Repair", "Amenity", "Turnover", "Other"];
const emptyProject = {
  title: "", description: "", category: "Capital Improvement", property: "", unit_label: "", priority: "NORMAL",
  status: "REQUESTED", progress_percent: 0, start_date: "", target_date: "", assignment_type: "UNASSIGNED",
  internal_assignee_name: "", internal_assignee_email: "", external_assignee_name: "", external_assignee_email: "",
  vendor_title: "", vendor_contact_name: "", vendor_email: "", contract_reference: "", budget_amount: "", actual_amount: "",
  blocker: "", next_action: "", next_action_due: "", update_recipient_emails: "", custom_data: {},
};
const inputClass = "min-h-11 w-full rounded-2xl border border-slate-700 bg-black/35 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/70";
const list = (data) => Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
const money = (value) => Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });

function Field({ label, children }) { return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-300">{label}</span>{children}</label>; }
function Metric({ label, value, tone = "cyan" }) {
  const tones = { cyan: "border-cyan-500/25 text-cyan-100", rose: "border-rose-500/25 text-rose-100", amber: "border-amber-500/25 text-amber-100", emerald: "border-emerald-500/25 text-emerald-100" };
  return <div className={`rounded-3xl border bg-[#07111f]/95 p-4 ${tones[tone]}`}><div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</div><div className="mt-2 text-3xl font-bold text-white">{value}</div></div>;
}
function ProgressTrack({ status }) {
  const index = STAGES.findIndex(([key]) => key === status);
  return <div className="mt-4 grid grid-cols-7 gap-1">{STAGES.map(([key, label], i) => <div key={key} className="min-w-0"><div className={`h-2 rounded-full ${i <= index ? "bg-gradient-to-r from-cyan-400 to-fuchsia-500" : "bg-slate-800"}`} /><div className="mt-1 hidden truncate text-[9px] text-slate-500 md:block">{label}</div></div>)}</div>;
}
function adaptiveQuestions(category) {
  const common = [
    ["success_definition", "What does complete and accepted look like?"],
    ["approval_owner", "Who approves the work?"],
    ["access_requirements", "Are there access, resident, or blackout restrictions?"],
  ];
  if (["Installation", "Capital Improvement", "Amenity"].includes(category)) return [...common, ["permit_required", "Are permits or inspections required?"], ["material_lead_time", "Are materials ordered or subject to lead time?"]];
  if (category === "Painting") return [...common, ["areas", "Which buildings, rooms, or surfaces are included?"], ["color_spec", "What color or finish specification applies?"]];
  if (category === "Signage") return [...common, ["sign_count", "How many signs and where will they be installed?"], ["brand_approval", "Who approves design and branding?"]];
  if (category === "Compliance") return [...common, ["authority", "Which authority or requirement governs this project?"], ["inspection_date", "Is there a required inspection or compliance deadline?"]];
  return common;
}

export default function PMProjects() {
  const [workspace, setWorkspace] = useState(null);
  const [properties, setProperties] = useState([]);
  const [projects, setProjects] = useState([]);
  const [metrics, setMetrics] = useState({ active: 0, overdue: 0, blocked: 0, awaiting_approval: 0, budget_total: 0, actual_total: 0 });
  const [filter, setFilter] = useState("ACTIVE");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [project, setProject] = useState(emptyProject);
  const [selected, setSelected] = useState(null);
  const [updateForm, setUpdateForm] = useState({ note: "", status: "", progress_percent: "", blocker: "", next_action: "", next_action_due: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const headers = useMemo(() => workspace?.id ? { "X-PM-Workspace-ID": String(workspace.id) } : {}, [workspace]);
  async function load() {
    setError("");
    try {
      const ws = await api.get("/pm-hub/workspaces/current/");
      setWorkspace(ws.data);
      const h = { "X-PM-Workspace-ID": String(ws.data.id) };
      const [p, jobs, stats] = await Promise.all([
        api.get("/pm-hub/properties/", { headers: h }),
        api.get("/pm-hub/projects/", { headers: h, params: { archived: filter === "ARCHIVED" } }),
        api.get("/pm-hub/projects/metrics/", { headers: h }),
      ]);
      setProperties(list(p.data)); setProjects(list(jobs.data)); setMetrics(stats.data || {});
    } catch (e) { setError(e?.response?.data?.detail || "Could not load the Project Center."); }
  }
  useEffect(() => { load(); }, [filter]);

  const visible = projects.filter((item) => {
    if (filter === "LATE" && !item.is_overdue) return false;
    if (filter === "BLOCKED" && !item.blocker) return false;
    if (filter === "APPROVAL" && item.status !== "APPROVAL") return false;
    const q = search.trim().toLowerCase();
    return !q || [item.title, item.property_name, item.vendor_title, item.description].some((v) => String(v || "").toLowerCase().includes(q));
  });

  function setValue(key, value) { setProject((p) => ({ ...p, [key]: value })); }
  async function createProject() {
    if (!project.title.trim()) return setError("Project name is required.");
    setSaving(true); setError("");
    const payload = { ...project, property: project.property || null, budget_amount: project.budget_amount || null, actual_amount: project.actual_amount || null, start_date: project.start_date || null, target_date: project.target_date || null, next_action_due: project.next_action_due || null };
    try {
      await api.post("/pm-hub/projects/", payload, { headers });
      setProject(emptyProject); setShowCreate(false); setMessage("Project created and added to the tracker."); await load();
    } catch (e) { setError(e?.response?.data?.detail || "Could not create the project."); } finally { setSaving(false); }
  }
  async function addUpdate() {
    if (!selected || !updateForm.note.trim()) return setError("Add a status update note.");
    setSaving(true); setError("");
    const payload = { ...updateForm, progress_percent: updateForm.progress_percent === "" ? null : Number(updateForm.progress_percent), next_action_due: updateForm.next_action_due || null };
    try { await api.post(`/pm-hub/projects/${selected.id}/add-update/`, payload, { headers }); setSelected(null); setUpdateForm({ note: "", status: "", progress_percent: "", blocker: "", next_action: "", next_action_due: "" }); setMessage("Project update saved."); await load(); }
    catch (e) { setError(e?.response?.data?.detail || "Could not save the update."); } finally { setSaving(false); }
  }
  async function emailStatus(item) {
    const emails = window.prompt("Send this status update to which email address(es)?", item.update_recipient_emails || item.vendor_email || "");
    if (!emails) return;
    try { await api.post(`/pm-hub/projects/${item.id}/email-status/`, { emails }, { headers }); setMessage("Project status email sent."); }
    catch (e) { setError(e?.response?.data?.detail || "Could not send the status email."); }
  }
  async function archive(item) {
    if (!window.confirm(`Archive ${item.title}?`)) return;
    try { await api.post(`/pm-hub/projects/${item.id}/archive/`, {}, { headers }); setMessage("Project archived."); await load(); }
    catch (e) { setError(e?.response?.data?.detail || "Could not archive the project."); }
  }

  return <div className="min-h-screen bg-black text-slate-100">
    <PMHeader title="Project Center" subtitle="Track property initiatives, vendors, owners, deadlines, and executive-ready progress" actions={<Button tone="cyan" onClick={() => setShowCreate(true)}>Create Project</Button>} />
    <main className="mx-auto max-w-7xl space-y-5 px-4 pb-[calc(13rem+env(safe-area-inset-bottom))] pt-5">
      {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}
      {message ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">{message}</div> : null}
      <section className="rounded-[30px] border border-cyan-500/20 bg-[#07111f]/95 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Portfolio intelligence</div><h1 className="mt-2 text-2xl font-bold text-white">Turn daily property work into measurable execution.</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Start with one project. SyncWorks captures the people, vendor, scope, deadlines, blockers, approvals, costs, and updates needed for manager and executive reporting.</p></div><Button tone="cyan" onClick={() => setShowCreate(true)}>+ Create Project</Button></div>
      </section>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"><Metric label="Active" value={metrics.active || 0} /><Metric label="Overdue" value={metrics.overdue || 0} tone="rose" /><Metric label="Blocked" value={metrics.blocked || 0} tone="amber" /><Metric label="Awaiting Approval" value={metrics.awaiting_approval || 0} tone="amber" /><Metric label="Budget" value={money(metrics.budget_total)} tone="emerald" /><Metric label="Actual" value={money(metrics.actual_total)} tone="emerald" /></div>
      <section className="rounded-[28px] border border-slate-800 bg-[#07111f]/90 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]"><input className={inputClass} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects, properties, vendors, or scope" /><div className="flex flex-wrap gap-2">{[["ACTIVE","Active"],["LATE","Late"],["BLOCKED","Blocked"],["APPROVAL","Approval"],["ARCHIVED","Archive"]].map(([key,label]) => <button key={key} onClick={() => setFilter(key)} className={`rounded-2xl border px-3 py-2 text-xs font-bold ${filter === key ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-100" : "border-slate-700 text-slate-400"}`}>{label}</button>)}</div></div>
      </section>
      <div className="grid gap-4 xl:grid-cols-2">{visible.length ? visible.map((item) => <article key={item.id} className="rounded-[28px] border border-blue-500/20 bg-[#07111f]/95 p-5">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap gap-2"><span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-bold text-cyan-100">{String(item.priority || "NORMAL")}</span>{item.is_overdue ? <span className="rounded-full border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 text-[10px] font-bold text-rose-100">OVERDUE</span> : null}{item.blocker ? <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-100">BLOCKED</span> : null}</div><h2 className="mt-3 text-lg font-bold text-white">{item.title}</h2><div className="mt-1 text-xs text-slate-500">{item.property_name || "Portfolio-wide"}{item.unit_label ? ` · Unit ${item.unit_label}` : ""} · {item.category || "Project"}</div></div><div className="text-right"><div className="text-2xl font-bold text-white">{item.progress_percent || 0}%</div><div className="text-[10px] uppercase tracking-wider text-slate-500">{String(item.status).replaceAll("_", " ")}</div></div></div>
        <ProgressTrack status={item.status} />
        <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2"><div className="rounded-2xl border border-slate-800 bg-black/20 p-3"><div className="text-slate-500">Owner / assignee</div><div className="mt-1 text-slate-200">{item.internal_assignee_name || item.external_assignee_name || "Unassigned"}</div></div><div className="rounded-2xl border border-slate-800 bg-black/20 p-3"><div className="text-slate-500">Vendor</div><div className="mt-1 text-slate-200">{item.vendor_title || "Not entered"}</div></div><div className="rounded-2xl border border-slate-800 bg-black/20 p-3"><div className="text-slate-500">Target</div><div className="mt-1 text-slate-200">{item.target_date || "Not scheduled"}</div></div><div className="rounded-2xl border border-slate-800 bg-black/20 p-3"><div className="text-slate-500">Next action</div><div className="mt-1 text-slate-200">{item.next_action || "Add next action"}</div></div></div>
        {item.blocker ? <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100"><strong>Blocker:</strong> {item.blocker}</div> : null}
        <div className="mt-4 flex flex-wrap gap-2"><Button tone="cyan" onClick={() => { setSelected(item); setUpdateForm((p) => ({ ...p, status: item.status, progress_percent: item.progress_percent, blocker: item.blocker || "", next_action: item.next_action || "", next_action_due: item.next_action_due || "" })); }}>Add Update</Button><Button tone="slate" onClick={() => emailStatus(item)}>Email Status</Button>{item.status === "COMPLETED" ? <Button tone="slate" onClick={() => archive(item)}>Archive</Button> : null}</div>
      </article>) : <div className="xl:col-span-2 rounded-[28px] border border-dashed border-slate-700 bg-[#07111f]/75 p-10 text-center"><div className="text-slate-400">No projects match this view.</div><div className="mt-4"><Button tone="cyan" onClick={() => setShowCreate(true)}>Create First Project</Button></div></div>}</div>
    </main>

    {showCreate ? <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm"><div className="absolute inset-y-0 right-0 w-full max-w-2xl overflow-y-auto border-l border-cyan-500/20 bg-[#050914] p-5 pb-32"><div className="flex items-start justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Guided setup</div><h2 className="mt-2 text-2xl font-bold">Create a project card</h2><p className="mt-2 text-sm text-slate-400">Answer what is known now. The card can be improved as the project develops.</p></div><button onClick={() => setShowCreate(false)} className="h-11 w-11 rounded-2xl border border-slate-700">×</button></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="Project name"><input className={inputClass} value={project.title} onChange={(e) => setValue("title", e.target.value)} placeholder="Install community fire pits" /></Field></div><Field label="Category"><select className={inputClass} value={project.category} onChange={(e) => setValue("category", e.target.value)}>{CATEGORIES.map((x) => <option key={x}>{x}</option>)}</select></Field><Field label="Priority"><select className={inputClass} value={project.priority} onChange={(e) => setValue("priority", e.target.value)}><option>LOW</option><option>NORMAL</option><option>HIGH</option><option>URGENT</option></select></Field><Field label="Property"><select className={inputClass} value={project.property} onChange={(e) => setValue("property", e.target.value)}><option value="">Portfolio-wide</option>{properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Field label="Unit or area"><input className={inputClass} value={project.unit_label} onChange={(e) => setValue("unit_label", e.target.value)} placeholder="Pool deck, Building A, Unit 204" /></Field><div className="sm:col-span-2"><Field label="Scope and desired outcome"><textarea className={`${inputClass} min-h-28`} value={project.description} onChange={(e) => setValue("description", e.target.value)} /></Field></div><Field label="Start date"><input type="date" className={inputClass} value={project.start_date} onChange={(e) => setValue("start_date", e.target.value)} /></Field><Field label="Target completion"><input type="date" className={inputClass} value={project.target_date} onChange={(e) => setValue("target_date", e.target.value)} /></Field><Field label="Assignment"><select className={inputClass} value={project.assignment_type} onChange={(e) => setValue("assignment_type", e.target.value)}><option value="UNASSIGNED">Unassigned</option><option value="INTERNAL">Internal team member</option><option value="EXTERNAL">External person</option></select></Field>{project.assignment_type === "INTERNAL" ? <Field label="Internal assignee"><input className={inputClass} value={project.internal_assignee_name} onChange={(e) => setValue("internal_assignee_name", e.target.value)} /></Field> : project.assignment_type === "EXTERNAL" ? <Field label="External assignee"><input className={inputClass} value={project.external_assignee_name} onChange={(e) => setValue("external_assignee_name", e.target.value)} /></Field> : <div />}
        <Field label="Vendor title or company"><input className={inputClass} value={project.vendor_title} onChange={(e) => setValue("vendor_title", e.target.value)} placeholder="ABC Fire Features" /></Field><Field label="Vendor email"><input type="email" className={inputClass} value={project.vendor_email} onChange={(e) => setValue("vendor_email", e.target.value)} /></Field><Field label="Budget"><input inputMode="decimal" className={inputClass} value={project.budget_amount} onChange={(e) => setValue("budget_amount", e.target.value)} /></Field><Field label="Contract or PO reference"><input className={inputClass} value={project.contract_reference} onChange={(e) => setValue("contract_reference", e.target.value)} /></Field><div className="sm:col-span-2 rounded-3xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-4"><div className="text-sm font-bold text-fuchsia-100">Questions selected for this project</div><div className="mt-4 grid gap-3">{adaptiveQuestions(project.category).map(([key,label]) => <Field key={key} label={label}><input className={inputClass} value={project.custom_data?.[key] || ""} onChange={(e) => setProject((p) => ({ ...p, custom_data: { ...p.custom_data, [key]: e.target.value } }))} /></Field>)}</div></div><div className="sm:col-span-2"><Field label="Next action"><textarea className={`${inputClass} min-h-20`} value={project.next_action} onChange={(e) => setValue("next_action", e.target.value)} /></Field></div><Field label="Next action due"><input type="date" className={inputClass} value={project.next_action_due} onChange={(e) => setValue("next_action_due", e.target.value)} /></Field><Field label="Status update recipients"><input className={inputClass} value={project.update_recipient_emails} onChange={(e) => setValue("update_recipient_emails", e.target.value)} placeholder="manager@example.com, vendor@example.com" /></Field></div>
      <div className="mt-6 flex gap-2"><Button tone="slate" onClick={() => setShowCreate(false)}>Cancel</Button><Button tone="cyan" onClick={createProject} disabled={saving}>{saving ? "Creating..." : "Create Project"}</Button></div>
    </div></div> : null}

    {selected ? <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm md:items-center"><div className="w-full max-w-xl rounded-[30px] border border-cyan-500/20 bg-[#07111f] p-5"><div className="flex justify-between gap-3"><div><div className="text-xs uppercase tracking-wider text-cyan-300">Project update</div><h2 className="mt-1 text-xl font-bold">{selected.title}</h2></div><button onClick={() => setSelected(null)} className="h-10 w-10 rounded-xl border border-slate-700">×</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="Update note"><textarea className={`${inputClass} min-h-24`} value={updateForm.note} onChange={(e) => setUpdateForm((p) => ({ ...p, note: e.target.value }))} /></Field></div><Field label="Stage"><select className={inputClass} value={updateForm.status} onChange={(e) => setUpdateForm((p) => ({ ...p, status: e.target.value }))}>{STAGES.map(([k,l]) => <option key={k} value={k}>{l}</option>)}</select></Field><Field label="Progress %"><input type="number" min="0" max="100" className={inputClass} value={updateForm.progress_percent} onChange={(e) => setUpdateForm((p) => ({ ...p, progress_percent: e.target.value }))} /></Field><div className="sm:col-span-2"><Field label="Blocker"><input className={inputClass} value={updateForm.blocker} onChange={(e) => setUpdateForm((p) => ({ ...p, blocker: e.target.value }))} /></Field></div><div className="sm:col-span-2"><Field label="Next action"><input className={inputClass} value={updateForm.next_action} onChange={(e) => setUpdateForm((p) => ({ ...p, next_action: e.target.value }))} /></Field></div><Field label="Next action due"><input type="date" className={inputClass} value={updateForm.next_action_due} onChange={(e) => setUpdateForm((p) => ({ ...p, next_action_due: e.target.value }))} /></Field></div><div className="mt-5 flex justify-end gap-2"><Button tone="slate" onClick={() => setSelected(null)}>Cancel</Button><Button tone="cyan" onClick={addUpdate} disabled={saving}>{saving ? "Saving..." : "Save Update"}</Button></div></div></div> : null}
  </div>;
}
