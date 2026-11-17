import React, { useEffect, useState } from "react";
import { ArrowLeft, Bot, CheckCircle2, ClipboardCheck, Clock3, ShieldCheck, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import SyncAssistWorkdayPanel from "../components/sync/SyncAssistWorkdayPanel";
import { useWorkspaceAppearance } from "../components/customer/CustomerWorkspace";
import "../components/sync/SyncAssistTheme.css";


const PILOT = "jacoblord7@outlook.com";
const OPTIONS = [
  ["LEAD_FOLLOW_UP", "Lead follow-up"],
  ["TICKET_REVIEW", "Ticket review"],
  ["INVOICE_REMINDER", "Invoice reminder"],
  ["GENERAL", "General business task"],
];

export default function SyncAssistPilot() {
  const navigate = useNavigate();
  const [workspaceAppearance] = useWorkspaceAppearance();
  const { user } = useAuth();
  const permitted = String(user?.email || "").trim().toLowerCase() === PILOT;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [kind, setKind] = useState("LEAD_FOLLOW_UP");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [connections, setConnections] = useState(null);
  const [connectionsError, setConnectionsError] = useState("");
  const [showConnections, setShowConnections] = useState(false);
  const [operations, setOperations] = useState(null);
  const [operationsError, setOperationsError] = useState("");
  const [operationsOpen, setOperationsOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const result = await api.get("/sync-ai/assist/pilot/", { timeout: 15000 });
      setData(result.data);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.detail || (err?.code === "ECONNABORTED" ? "The SyncWorks server took too long to respond. Try again." : "Unable to load Sync Assist data. Check your connection and retry."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (permitted) refresh();
    else setLoading(false);
  }, [permitted]);

  async function loadConnections() {
    setConnectionsError("");
    try {
      const response = await api.get("/sync-ai/assist/pilot/internal-connections/", { timeout: 15000 });
      setConnections(response.data);
    } catch (err) {
      setConnectionsError(err?.response?.data?.detail || "Could not load your internal businesses.");
    }
  }

  async function loadOperations() {
    setOperationsError("");
    try {
      const response = await api.get("/sync-ai/assist/pilot/operations/brief/", {timeout: 15000});
      setOperations(response.data);
    } catch (err) {
      setOperationsError(err?.response?.data?.detail || "Could not load the business operations briefing.");
    }
  }

  async function createTask(event) {
    event.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await api.post("/sync-ai/assist/pilot/", {
        kind, title: title.trim(), description: description.trim(),
      });
      setData(response.data);
      setTitle("");
      setDescription("");
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not save task.");
    } finally {
      setBusy(false);
    }
  }

  async function runScan() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await api.post("/sync-ai/assist/pilot/scan/");
      setData(result.data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to run the scan.");
    } finally {
      setBusy(false);
    }
  }

  async function decide(task, decision) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await api.post(`/sync-ai/assist/pilot/tasks/${encodeURIComponent(task.id)}/decision/`, { decision });
      setData(response.data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not record decision.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main data-assist-theme={workspaceAppearance.theme} data-assist-motion={workspaceAppearance.motion ? "on" : "off"} className="sw-assist-themed relative h-[calc(100dvh-115px)] min-h-0 overflow-hidden bg-[#020617] px-3 pb-3 pt-3 text-white sm:h-[calc(100dvh-57px)]">
      <div className="mx-auto flex h-full max-w-7xl flex-col gap-2 overflow-hidden">
        <div className="flex shrink-0 items-center justify-between gap-2"><button type="button" onClick={() => navigate("/sync")} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-200"><ArrowLeft size={15}/> Back to SYNC</button><button type="button" onClick={() => setToolsOpen(true)} className="min-h-10 rounded-xl border border-cyan-400/35 bg-slate-950/80 px-3 text-xs font-bold text-cyan-100">More pilot tools</button></div>
        <header className="sw-assist-panel sw-assist-banner shrink-0 rounded-2xl border border-cyan-300/25 p-3">
          <div className="flex items-center gap-3"><Bot className="h-6 w-6 text-cyan-300"/><div><p className="text-[10px] font-black uppercase tracking-[.17em] text-cyan-200">Private pilot</p><h1 className="text-lg font-black">Sync Assist · Workday Test Center</h1></div></div>
          <p className="mt-1 text-[11px] leading-4 text-slate-300">Assign employees, run an authorized internal step, inspect receipts, and review work history.</p>
          <div className="mt-1 flex items-center gap-2 text-[11px] font-bold text-amber-200"><ShieldCheck size={13}/> Private pilot · Unattended worker not verified</div>
        </header>
        {!permitted ? <div role="alert" className="rounded-2xl border border-rose-400/35 p-5 text-rose-200">This feature is restricted to the private pilot account.</div> : <>
          {(loading || (error && !data)) && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-400/25 bg-slate-900/75 p-3" role="status">
              <p className="text-xs text-slate-300">{loading ? "Connecting to SyncWorks… Your records will appear when the server responds." : "Your records could not be loaded. No scan has run."}</p>
              <button type="button" onClick={refresh} disabled={loading} className="min-h-10 rounded-lg border border-cyan-400/35 px-4 text-xs font-black text-cyan-100 disabled:opacity-50">Retry</button>
            </div>
          )}
          {error && <div role="alert" className="mb-4 rounded-xl border border-rose-400/40 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</div>}
          <div className="min-h-0 flex-1 overflow-hidden"><SyncAssistWorkdayPanel /></div>
          {toolsOpen && <div className="fixed inset-0 z-[260] flex justify-end bg-slate-950/75 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setToolsOpen(false); }}><section role="dialog" aria-modal="true" aria-label="Additional Sync Assist pilot tools" className="flex h-full w-full max-w-xl flex-col border-l border-cyan-300/30 bg-[#061327] text-white"><div className="flex shrink-0 items-center justify-between border-b border-white/10 p-4"><h2 className="text-lg font-black">Other pilot tools</h2><button type="button" onClick={() => setToolsOpen(false)} className="min-h-11 rounded-xl border border-white/20 px-4 text-sm">Close</button></div><div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          <button type="button" onClick={() => navigate("/sync/assist/daily")} className="mb-4 flex min-h-16 w-full items-center justify-between rounded-2xl border border-cyan-400/35 bg-gradient-to-r from-cyan-700/25 to-violet-700/20 p-4 text-left font-black text-cyan-100"><span>Jarvis Daily · My to-do list<span className="block text-xs font-normal text-slate-400">Today's priorities · Property · Business · Personal</span></span><span aria-hidden="true">→</span></button>
          <section className="mb-4 rounded-2xl border border-cyan-400/25 bg-slate-900/50 p-4">
            <button type="button" aria-expanded={operationsOpen} onClick={() => { setOperationsOpen(!operationsOpen); if (!operationsOpen) loadOperations(); }} className="flex min-h-11 w-full items-center justify-between gap-2 text-left font-black text-cyan-100">
              <span>Jarvis Operations Brief <span className="block text-xs font-normal text-slate-400">Internal business, invoices, maintenance and property tasks</span></span>
              <span aria-hidden="true">{operationsOpen ? "−" : "+"}</span>
            </button>
            {operationsOpen && <div className="mt-3 space-y-3">
              <button type="button" onClick={loadOperations} className="min-h-10 rounded-xl border border-cyan-400/35 px-4 text-xs font-bold text-cyan-200">Refresh operations</button>
              {operationsError && <p role="alert" className="text-sm text-rose-200">{operationsError}</p>}
              {!operations && !operationsError && <p className="text-xs text-slate-400">Loading internal data…</p>}
              {operations && <>
                <p className="text-xs text-slate-300">Owner-linked businesses: {operations.business_work.counts.businesses || 0}. Read-only snapshot, not an unattended scan.</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(operations.business_work.counts).filter(([key])=>key!=="businesses").map(([key,value])=><div key={key} className="rounded-xl border border-white/10 p-3"><strong className="block text-lg text-white">{value}</strong><span className="text-[11px] text-slate-400">{key.replaceAll("_"," ")}</span></div>)}
                </div>
                {operations.business_work.items.slice(0,8).map((item,i)=><div key={i} className="rounded-xl border border-white/10 p-3"><strong className="text-sm">{item.title}</strong><p className="mt-1 text-xs leading-5 text-slate-400">{item.description}</p></div>)}
                <p className="text-xs text-amber-200">Outlook: not connected to SyncWorks. Email reading, drafts and sending remain disabled until secure authorization.</p>
              </>}
            </div>}
          </section>
          <button type="button" onClick={() => navigate("/sync/assist/growth")} className="mb-4 flex min-h-14 w-full items-center justify-between rounded-2xl border border-cyan-400/30 bg-gradient-to-r from-emerald-500/15 to-cyan-600/10 p-4 text-left font-black text-cyan-100"><span>Jarvis Growth Center <span className="block text-xs font-normal text-slate-400">Business prospects · Personalized outreach drafts · Pipeline</span></span><span aria-hidden="true">→</span></button>
          <section className="mb-4 rounded-2xl border border-cyan-400/25 bg-slate-900/50 p-4">
            <button type="button" aria-expanded={showConnections} onClick={() => { setShowConnections(!showConnections); if (!showConnections) loadConnections(); }} className="flex min-h-11 w-full items-center justify-between gap-2 text-left font-black text-cyan-100">
              <span>My SyncWorks businesses <span className="block text-xs font-normal text-slate-400">Internal CRM + property management · Social setup saved for later</span></span>
              <span aria-hidden="true">{showConnections ? "−" : "+"}</span>
            </button>
            {showConnections && <div className="mt-3 space-y-3">
              {connectionsError && <p role="alert" className="text-sm text-rose-200">{connectionsError}</p>}
              <button type="button" onClick={loadConnections} className="min-h-10 rounded-xl border border-cyan-400/30 px-3 text-xs font-black text-cyan-100">Refresh business connections</button>
              {connections && <p className="text-xs text-slate-300">{connections.counts.visible} accessible businesses · {connections.counts.scan_eligible} eligible for owner-only discovery</p>}
              {connections?.internal_businesses?.length === 0 && <p className="text-xs text-amber-200">No active owned or managed non-demo businesses linked to this user. Business onboarding/ownership needs review.</p>}
              {connections?.internal_businesses?.map(biz => <article key={biz.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-white">{biz.name}</strong><span className="text-[11px] text-cyan-200">{biz.access} · {biz.properties} PM properties</span></div>
                <p className="mt-1 text-xs text-slate-400">{biz.scan_eligible ? "Eligible for existing read-only discovery" : "Manager-visible · not scanned automatically"}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {biz.social.map(channel => <span key={channel.channel} className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-slate-300">{channel.channel}: {channel.status === "profile_saved" ? "Profile saved" : "Not configured"}</span>)}
                </div>
                <p className="mt-2 text-[11px] text-amber-200">Social and WhatsApp APIs not connected. No posting or messaging.</p>
              </article>)}
            </div>}
          </section>
          <button type="button" onClick={() => navigate("/sync/assist/communications")} className="mb-4 flex min-h-14 w-full items-center justify-between rounded-2xl border border-cyan-400/30 bg-gradient-to-r from-cyan-500/15 to-violet-600/10 p-4 text-left font-black text-cyan-100"><span>Jarvis Communications Hub <span className="block text-xs font-normal text-slate-400">WhatsApp · SMS · Phone setup and inbox</span></span><span aria-hidden="true">→</span></button>
          <div className="mb-5 grid grid-cols-3 gap-2">
            {[[Clock3, "Pending", data?.counts?.pending ?? "—"],[CheckCircle2, "Approved", data?.counts?.approved ?? "—"],[XCircle, "Rejected", data?.counts?.rejected ?? "—"]].map(([Icon,label,count]) => <div key={label} className="rounded-2xl border border-slate-700/70 bg-slate-900/50 p-3"><Icon size={20} className="text-cyan-300"/><div className="mt-2 text-2xl font-black">{count}</div><p className="text-xs text-slate-400">{label}</p></div>)}
          </div>
          <section className="mb-4 rounded-2xl border border-white/10 bg-slate-900/50 p-4" aria-label="Background automation status">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-black">Background discovery</h2>
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${data?.scheduler_status === "observed_recently" ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200" : "border-amber-400/30 bg-amber-500/10 text-amber-200"}`}>
                {!data ? "Waiting for server" : data?.scheduler_status === "observed_recently" ? "Recent scheduled runs verified" : "Scheduled runs not verified"}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              {!data ? "Background status will be shown after the server responds." : data?.last_scheduled_run ? `Last recorded scheduled scan: ${new Date(data.last_scheduled_run).toLocaleString()}.` : "No recorded scheduled worker run. Manual scans do not count as unattended automation."}
              {" "}Approving a task never sends messages or payments.
            </p>
          </section>
          <section className="mb-5 rounded-2xl border border-cyan-400/25 bg-cyan-500/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="font-black text-white">Business discovery</h2><p className="mt-1 text-xs text-slate-400">{data?.last_discovery_scan ? `Last scan: ${new Date(data.last_discovery_scan.at).toLocaleString()} · ${data.last_discovery_scan.created} new tasks` : !data ? "Waiting for server to load scan history…" : "No scan record found."}</p></div>
              <button type="button" disabled={busy || loading || !data} onClick={runScan} className="min-h-11 rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-4 text-xs font-black text-cyan-100 disabled:opacity-50">Scan my businesses</button>
            </div>
            {data?.last_discovery_scan?.checked && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Sources checked">
                {[
                  ["Owned businesses", "businesses"],
                  ["Service requests", "service_requests"],
                  ["Service tickets", "tickets"],
                  ["Invoices", "invoices"],
                  ["PM work orders", "pm_work_orders"],
                  ["PM rent charges", "pm_rent_charges"],
                ].map(([label, key]) => (
                  <div key={key} className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                    <div className="text-lg font-black text-cyan-200">{data.last_discovery_scan.checked[key] ?? 0}</div>
                    <div className="text-xs text-slate-400">{label}</div>
                  </div>
                ))}
              </div>
            )}
            {data?.last_discovery_scan?.checked?.businesses === 0 ? (
              <p className="mt-3 text-xs text-amber-200">No active, non-demo businesses owned by this account were found. Check the business or PM company ownership before expecting tasks.</p>
            ) : data?.last_discovery_scan?.found === 0 ? (
              <p className="mt-3 text-xs text-slate-300">No records currently meet the attention rules. Existing completed or paid records are excluded.</p>
            ) : null}
            <p className="mt-3 text-xs leading-5 text-amber-200">Manual read-only scan. No background schedule is active; no messages or payments will be sent.</p>
          </section>
          <form onSubmit={createTask} className="mb-5 space-y-3 rounded-3xl border border-cyan-400/20 bg-slate-900/35 p-5">
            <h2 className="flex items-center gap-2 text-lg font-black"><ClipboardCheck className="text-cyan-300"/> Prepare a task</h2>
            <label className="block text-xs font-bold text-slate-300">Type
              <select value={kind} onChange={(event) => setKind(event.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border border-slate-600 bg-[#101a2d] p-3 text-white">{OPTIONS.map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select>
            </label>
            <label className="block text-xs font-bold text-slate-300">Task title
              <input required maxLength={140} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Follow up on unconfirmed customer lead" className="mt-1 block min-h-11 w-full rounded-xl border border-slate-600 bg-[#101a2d] p-3 text-sm text-white placeholder:text-slate-500"/>
            </label>
            <label className="block text-xs font-bold text-slate-300">Instructions (optional)
              <textarea maxLength={2000} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe what the assistant should prepare for review." className="mt-1 block w-full rounded-xl border border-slate-600 bg-[#101a2d] p-3 text-sm text-white placeholder:text-slate-500"/>
            </label>
            <button disabled={busy || !data || !title.trim()} type="submit" className="min-h-11 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 py-3 text-sm font-black disabled:opacity-50">Save for review</button>
          </form>
          <section className="rounded-3xl border border-white/10 bg-slate-900/25 p-5">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-black">Task activity & approvals</h2><button type="button" disabled={busy || loading} onClick={refresh} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-cyan-200">Refresh</button></div>
            {loading && <p className="text-sm text-slate-400">Loading pilot records…</p>}
            {!loading && !data?.tasks?.length && <p className="text-sm text-slate-400">No tasks prepared yet. Create a task above to test the approval workflow.</p>}
            <div className="space-y-3">{(data?.tasks || []).map((task) => <article key={task.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-black">{task.title}</h3><span className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${task.status === "PENDING" ? "border-amber-400/40 text-amber-200" : task.status === "APPROVED" ? "border-emerald-400/40 text-emerald-200" : "border-rose-400/40 text-rose-200"}`}>{task.status}</span></div>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-cyan-200">{task.kind.replaceAll("_", " ")}</p>
              {task.description && <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-slate-300">{task.description}</p>}
              <p className="mt-2 text-[10px] text-slate-500">{new Date(task.created_at).toLocaleString()}</p>
              {task.status === "PENDING" ? <div className="mt-3 flex gap-2"><button disabled={busy} onClick={() => decide(task,"APPROVE")} className="min-h-10 flex-1 rounded-xl border border-emerald-400/40 bg-emerald-500/10 text-xs font-bold text-emerald-200 disabled:opacity-50">Approve (record only)</button><button disabled={busy} onClick={() => decide(task,"REJECT")} className="min-h-10 flex-1 rounded-xl border border-rose-400/30 bg-rose-500/10 text-xs font-bold text-rose-200 disabled:opacity-50">Reject</button></div> : <p className="mt-2 text-xs text-slate-400">{task.status === "APPROVED" ? "Approved for future authorized execution. Nothing has been sent." : "Rejected; no action taken."}</p>}
            </article>)}</div>
          </section>
          </div></section></div>}
        </>}
      </div>
    </main>
  );
}
