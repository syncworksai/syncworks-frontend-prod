import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2, CheckCircle2, ClipboardList, Mail, Plus, RefreshCw, Send, X,
} from "lucide-react";
import api from "../../api/client";

const STATUSES = [
  ["NEW", "New"], ["CONTACTED", "Contacted"], ["INVITED", "Invited"],
  ["DEMO", "Demo"], ["REGISTERED", "Signed up"], ["WON", "Won"],
  ["LOST", "Lost"],
];
const PILOT_STAGES = [
  ["NOT_STARTED", "Not started"], ["INVITED", "Invited"], ["ONBOARDING", "Onboarding"],
  ["TESTING", "Testing"], ["BLOCKED", "Blocked"], ["COMPLETE", "Completed"],
];
const PILOT_GROUPS = [
  { title: "Account & setup", items: [
    ["signup", "Verified signup", "/platform?tab=businesses"],
    ["business", "Business linked to correct owner", "/platform?tab=businesses"],
    ["settings", "Settings save and reload verified", "/sbo/settings"],
    ["password_reset", "Reset-password email and sign-in verified", "/forgot-password"],
  ]},
  { title: "Customer migration", items: [
    ["customer_import", "Customer contacts added (manual or CSV)", "/sbo/customers/import"],
    ["customer_dedup", "Duplicates reviewed against existing records", "/sbo/customers"],
    ["customer_search", "Imported customer found in Quick Intake", "/sbo/quick-intake"],
  ]},
  { title: "Real job & money", items: [
    ["intake", "Service ticket created for a customer", "/sbo/quick-intake"],
    ["estimate", "Estimate and approval tested", "/tickets"],
    ["dispatch", "Technician and schedule verified", "/sbo/tech-board"],
    ["invoice", "Job completion and invoice verified", "/sbo/invoices"],
    ["payment", "Payment state reconciled against processor", "/sbo/finance"],
    ["billing_review", "Fee disclosure and invoice total reviewed", "/sbo/finance"],
    ["payout_review", "Connect account and payout flow verified", "/sbo/settings"],
  ]},
  { title: "Pilot sign-off", items: [
    ["mobile", "iPhone usability and navigation tested", "/sbo/pilot"],
    ["feedback", "Owner feedback and blocker report recorded", "/sbo/pilot"],
  ]},
];
const PILOT_CHECKS = PILOT_GROUPS.flatMap(group => group.items);
const PAID_OFFERS = [
  { id:"sales", label:"Sales OS", route:"/sbo/sales", description:"Track leads and sales pipeline" },
  { id:"growth", label:"Growth OS", route:"/sbo/growth", description:"Social media and marketing automation" },
  { id:"pm", label:"Property Management", route:"/pm", description:"Properties, tenants and maintenance" },
];

const INTERESTS = [
  "Scheduling", "Technician dispatch", "Skill matching", "Route planning",
  "Call intake", "Customer CRM", "Quotes & invoices", "Payments",
  "Customer communication", "Social media",
];
const inputClass = "min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60";
const btn = "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:border-cyan-400/50 disabled:opacity-40";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}
function errorText(e, fallback) {
  const d = e?.response?.data;
  return typeof d?.detail === "string" ? d.detail : e?.message || fallback;
}
function Field({ label, children }) {
  return <label className="block space-y-1.5 text-xs font-bold text-slate-300"><span>{label}</span>{children}</label>;
}
function Metric({ label, value, hint }) {
  return <div className="rounded-2xl border border-cyan-400/15 bg-slate-950/75 p-4"><div className="text-xs text-slate-400">{label}</div><div className="mt-1 text-3xl font-black tabular-nums text-white">{value ?? "—"}</div><div className="mt-1 text-[11px] text-cyan-200/75">{hint}</div></div>;
}
function emptyDraft() {
  return { company_name: "", contact_name: "", email: "", phone: "", industry: "", notes: "", next_action: "Send onboarding invitation", follow_up_at: "", interests: [], status: "NEW" };
}
function dateToInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const p = (v) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function GodModeProspects({ pilotOnly = false }) {
  const [rows, setRows] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("ALL");
  const [pilotFilter, setPilotFilter] = useState("ALL");
  const [note, setNote] = useState("");
  const [activityKind, setActivityKind] = useState("NOTE");
  const [busy, setBusy] = useState("");
  const [offerId, setOfferId] = useState("sales");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [list, summary] = await Promise.all([
        api.get("/platform/prospects/"),
        api.get("/platform/prospects/metrics/"),
      ]);
      setRows(Array.isArray(list.data) ? list.data : list.data?.results || []);
      setMetrics(summary.data || null);
    } catch (e) {
      setError(errorText(e, "Unable to load acquisition tickets. Verify the backend release."));
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const selected = rows.find((row) => row.id === selectedId) || null;
  const filtered = useMemo(() => rows.filter((row) =>
    (stage === "ALL" || row.status === stage) &&
    (pilotFilter === "ALL" || row.pilot_status === pilotFilter) &&
    [row.company_name, row.contact_name, row.email, row.phone, row.notes, row.next_action, ...(row.interests || [])]
      .join(" ").toLowerCase().includes(search.toLowerCase().trim())
  ), [rows, search, stage, pilotOnly, pilotFilter]);

  async function createProspect(e) {
    e.preventDefault();
    if (!draft.company_name.trim()) return;
    setBusy("create"); setError(""); setMessage("");
    try {
      const response = await api.post("/platform/prospects/", {
        ...draft,
        follow_up_at: draft.follow_up_at ? new Date(draft.follow_up_at).toISOString() : null,
      });
      setShowCreate(false); setDraft(emptyDraft());
      await load(); setSelectedId(response.data.id);
      setMessage("Prospect saved as an acquisition ticket. Nothing has been sent.");
    } catch (e2) { setError(errorText(e2, "Could not create prospect.")); }
    finally { setBusy(""); }
  }

  async function patchProspect(patch) {
    if (!selected) return;
    setBusy("patch"); setMessage(""); setError("");
    try {
      await api.patch(`/platform/prospects/${selected.id}/`, patch);
      await load();
      setMessage("Prospect updated. The owner has not been notified.");
    } catch (e) { setError(errorText(e, "Could not save the changes.")); }
    finally { setBusy(""); }
  }

  async function sendInvite() {
    if (!selected?.email) return;
    if (!window.confirm(`Send a SyncWorks onboarding invitation to ${selected.email}? The email will be logged in this ticket.`)) return;
    setBusy("send"); setError(""); setMessage("");
    try {
      await api.post(`/platform/prospects/${selected.id}/send-invite/`);
      await load();
      setMessage("Invitation handed to the email provider and recorded in outreach history. Delivery is not yet confirmed.");
    } catch (e) { setError(errorText(e, "Could not send invitation.")); }
    finally { setBusy(""); }
  }
  async function approveAndNotify() {
    if (!selected || !selected.linked_business || !selected.email) return;
    const missing = PILOT_CHECKS.filter(([key]) => selected.pilot_checks?.[key] !== true);
    if (missing.length) { setError(`Finish ${missing.length} remaining verification steps before approving.`); return; }
    if (!window.confirm(`Approve ${selected.company_name}'s full Business onboarding and email the verified business owner? No subscription will be started.`)) return;
    setBusy("approve-and-notify"); setError(""); setMessage("");
    try {
      await api.patch(`/platform/prospects/${selected.id}/`, { pilot_status: "COMPLETE" });
      try {
        const email = await api.post(`/platform/prospects/${selected.id}/send-completion/`);
        setMessage(email.data?.detail || "Onboarding approved and completion notification requested.");
      } catch (mailError) {
        setError("Onboarding was approved, but email could not be sent. Use Send completion notice to retry: " + errorText(mailError, "Mail provider error."));
      }
      await load();
    } catch (e) { setError(errorText(e, "Unable to approve the onboarding checks.")); }
    finally { setBusy(""); }
  }

  async function sendCompletion() {
    if (!selected || selected.pilot_status !== "COMPLETE" || selected.completion_notified) return;
    if (!window.confirm(`Send a one-time Business setup completion email to ${selected.email}? This is a transactional message, not a marketing offer.`)) return;
    setBusy("complete-email"); setError(""); setMessage("");
    try {
      const result = await api.post(`/platform/prospects/${selected.id}/send-completion/`);
      await load();
      setMessage(result.data?.detail || "Completion notice requested.");
    } catch (error) { setError(errorText(error, "Could not notify owner.")); }
    finally { setBusy(""); }
  }
  async function copyOfferDraft() {
    if (!selected) return;
    const offer = PAID_OFFERS.find(item => item.id === offerId) || PAID_OFFERS[0];
    const draft = `SUBJECT: Optional SyncWorks ${offer.label} — details for ${selected.company_name}\n\nHi ${selected.contact_name || "there"},\n\nYour Business workspace is available in SyncWorks. If you want to explore ${offer.label}, it offers ${offer.description.toLowerCase()}.\n\nWe can review the current price, features, and billing terms together before any enrollment. No add-on has been activated.\n\nReply if you'd like information.\n\n— SyncWorks\n\nMARKETING REVIEW REQUIRED BEFORE SENDING: add verified company postal address, unsubscribe method, clear ad identification and accurate plan terms. Never send without checking suppression preferences.`;
    try {
      await navigator.clipboard.writeText(draft);
      setMessage("Optional feature message copied as a DRAFT. Nothing sent, billed, or enabled.");
    } catch { setError("Clipboard not available. Copy the draft manually."); }
  }

  async function logActivity() {
    if (!selected || !note.trim()) return;
    setBusy("activity"); setError(""); setMessage("");
    try {
      await api.post(`/platform/prospects/${selected.id}/log-activity/`, {kind: activityKind, body: note.trim()});
      setNote(""); await load(); setMessage("Activity added to the ticket.");
    } catch (e) { setError(errorText(e, "Unable to log activity.")); }
    finally { setBusy(""); }
  }
  async function copyLink() {
    if (!selected?.signup_url) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard not available");
      await navigator.clipboard.writeText(selected.signup_url);
      setMessage("Signup link copied. No invitation has been sent.");
    } catch {
      setError("Clipboard unavailable. Use the Send invitation action or copy the URL from the prospect ticket.");
    }
  }
  function changeDraft(key, value) { setDraft((old) => ({...old, [key]: value})); }

  return (
    <section className="space-y-5">
      <div className="rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_80%_0%,rgba(6,182,212,.11),transparent_50%),#071124] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">God Mode / {pilotOnly ? "Tester Launch" : "Acquisition Tickets"}</div>
            <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">{pilotOnly ? "Business Onboarding Control Center" : "Business Prospects"}</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">Your founder-only business onboarding control center. Track invitation, registration, CRM migration, first job, payout review and the next action. Test outcomes are confirmed manually, not guessed.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={load} disabled={loading} className={btn}><RefreshCw className="h-4 w-4" /> Refresh</button>
            <button type="button" onClick={() => setShowCreate(true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-cyan-400 px-4 text-sm font-black text-slate-950"><Plus className="h-4 w-4"/> New prospect</button>
          </div>
        </div>
      </div>
      {error ? <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p> : null}
      {message ? <p role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</p> : null}
      {pilotOnly ? <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Onboarding" value={metrics?.pilot?.ONBOARDING} hint="Account setup"/>
        <Metric label="Testing" value={metrics?.pilot?.TESTING} hint="Active testers"/>
        <Metric label="Blocked" value={metrics?.pilot?.BLOCKED} hint="Needs intervention"/>
        <Metric label="Completed" value={metrics?.pilot?.COMPLETE} hint="Checked and signed up"/>
      </div> : null}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Metric label="Prospects" value={metrics?.total} hint="Acquisition tickets"/>
        <Metric label="Contacted" value={metrics?.contacted} hint="Some outreach recorded"/>
        <Metric label="Invitations sent" value={metrics?.invited} hint="Handed to email provider"/>
        <Metric label="Signed up" value={metrics?.registered} hint="Matched owner account"/>
        <Metric label="Won" value={metrics?.won} hint="Manually confirmed"/>
        <Metric label="Prospect → signup" value={metrics ? `${metrics.prospect_to_signup_pct}%` : "—"} hint={`${metrics?.followups_due || 0} follow-ups due`}/>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,440px)]">
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search companies, contacts, needs..." aria-label="Search prospects" className={inputClass}/>
            <select value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Filter by status" className={inputClass+" sm:w-44"}>
              <option value="ALL">All sales stages</option>{STATUSES.map(([v,t]) => <option key={v} value={v}>{t}</option>)}
            </select>
            <select value={pilotFilter} onChange={e=>setPilotFilter(e.target.value)} aria-label="Filter by tester stage" className={inputClass+" sm:w-44"}>
              <option value="ALL">All tester stages</option>{PILOT_STAGES.map(([value,label])=><option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          {loading && !rows.length ? <div className="p-5 text-sm text-slate-400">Loading prospects...</div> : null}
          {!loading && !filtered.length ? <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-sm text-slate-400">No matching prospects. Add the electrical contractor here without creating their account.</div> : null}
          {filtered.map((p) => <button key={p.id} type="button" onClick={() => setSelectedId(p.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedId === p.id ? "border-cyan-400/60 bg-cyan-500/10" : "border-slate-800 bg-slate-950/70 hover:border-slate-600"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><div className="flex items-center gap-2"><Building2 className="h-4 w-4 shrink-0 text-cyan-300"/><span className="truncate font-black text-white">#{p.id} {p.company_name}</span></div><div className="mt-1 truncate text-xs text-slate-400">{[p.contact_name, p.phone, p.email].filter(Boolean).join(" · ") || "Add contact details"}</div></div>
              <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-2.5 py-1 text-[10px] font-bold text-violet-200">{STATUSES.find(([v]) => v === p.status)?.[1] || p.status}</span><span className="mt-1 block text-[10px] font-black text-cyan-200">{PILOT_STAGES.find(([v])=>v===p.pilot_status)?.[1] || "Not started"}</span>
            </div>
            <div className="mt-3 text-xs text-slate-300"><b className="text-cyan-200">Next:</b> {p.next_action || "Set next action"}</div>
            <div className="mt-2 text-[11px] text-slate-500">Follow-up: {formatDate(p.follow_up_at)} · Invited: {formatDate(p.last_invited_at)}</div>
            {p.signed_up ? <div className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-200"><CheckCircle2 className="h-4 w-4"/> Verified signup · Business #{p.linked_business}</div> : null}
          </button>)}
        </div>
        <aside className="min-w-0 self-start rounded-[1.7rem] border border-slate-700 bg-slate-950/80 p-4 lg:sticky lg:top-4">
          {!selected ? <div className="flex min-h-64 flex-col items-center justify-center text-center"><ClipboardList className="h-8 w-8 text-cyan-200"/><p className="mt-3 text-sm text-slate-400">Select a prospect to view outreach history, update their stage, or send an invitation.</p></div> :
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2"><div><h3 className="text-xl font-black text-white">{selected.company_name}</h3><div className="text-xs text-slate-400">{selected.contact_name || "Contact pending"}</div></div><button type="button" onClick={() => setSelectedId(null)} aria-label="Close prospect details" className={btn}><X className="h-4 w-4"/></button></div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Stage"><select className={inputClass} value={selected.status} onChange={(e) => patchProspect({status:e.target.value})} disabled={!!busy}>{STATUSES.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
                <Field label="Next follow-up"><input key={selected.id+"follow"} type="datetime-local" className={inputClass} defaultValue={dateToInput(selected.follow_up_at)} onBlur={(e) => {const newValue=e.target.value ? new Date(e.target.value).toISOString() : null;const prev=selected.follow_up_at ? new Date(selected.follow_up_at).toISOString() : null;if(newValue!==prev)patchProspect({follow_up_at:newValue});}}/></Field>
              </div>
              <Field label="Next action"><input key={selected.id+"action"} defaultValue={selected.next_action || ""} placeholder="Call, schedule demo, follow up..." className={inputClass} onBlur={(e) => {if(e.target.value!==selected.next_action)patchProspect({next_action:e.target.value});}}/></Field>
              <Field label="Business needs"><input key={selected.id+"needs"} defaultValue={(selected.interests || []).join(", ")} placeholder="Scheduling, dispatch, route planning..." className={inputClass} onBlur={(e) => {const next=e.target.value.split(",").map((v)=>v.trim()).filter(Boolean);if(JSON.stringify(next)!==JSON.stringify(selected.interests||[]))patchProspect({interests:next});}}/></Field>
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/[.04] p-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-black text-white">Tester onboarding & QA</h4>
                  <span className="text-xs font-black text-cyan-200">{PILOT_CHECKS.filter(([key]) => selected.pilot_checks?.[key] === true).length}/{PILOT_CHECKS.length}</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-400">Checklist items are manually confirmed. A verified signup alone does not mean a completed test.</p>
                <Field label="Pilot stage">
                  <select disabled={!!busy} value={selected.pilot_status || "NOT_STARTED"}
                    onChange={e=>patchProspect({pilot_status:e.target.value})} className={inputClass}>
                    {PILOT_STAGES.map(([value,label])=><option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
                <p className="mt-2 text-[11px] leading-4 text-amber-200">Founder checks are recorded here. Customer, invoice and payment steps must be tested in that business owner\'s own account; opening your personal Business workspace could show a different company.</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-valuenow={PILOT_CHECKS.filter(([key]) => selected.pilot_checks?.[key] === true).length} aria-valuemin={0} aria-valuemax={PILOT_CHECKS.length}>
                  <div className="h-full bg-cyan-400 transition-all" style={{width:`${100*PILOT_CHECKS.filter(([key])=>selected.pilot_checks?.[key] === true).length/PILOT_CHECKS.length}%`}} />
                </div>
                <div className="mt-3 space-y-3">
                  {PILOT_GROUPS.map(group=>(
                    <div key={group.title} className="rounded-xl border border-slate-800 p-2">
                      <div className="px-1 pb-2 text-xs font-black text-cyan-200">{group.title}</div>
                      <div className="space-y-1">
                        {group.items.map(([key,label,route])=>(
                          <div key={key} className="flex min-h-10 items-center justify-between gap-2 rounded-lg bg-slate-900/70 px-2 py-1.5">
                            <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-slate-200">
                              <input type="checkbox" disabled={!!busy} checked={selected.pilot_checks?.[key]===true}
                                onChange={e=>patchProspect({pilot_checks:{...selected.pilot_checks,[key]:e.target.checked}})}
                                className="h-4 w-4 shrink-0 accent-cyan-400"/>
                              <span>{label}</span>
                            </label>
                            {route.startsWith("/platform") ? <a href={route} className="shrink-0 text-[11px] font-bold text-cyan-300 hover:underline">God Mode</a> : <span title={`Owner workflow: ${route}`} className="shrink-0 text-[10px] font-bold text-slate-400">Owner step</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {selected.linked_business && PILOT_CHECKS.some(([key])=>selected.pilot_checks?.[key]!==true) ? <div className="mt-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-200">
                  Next verification: {PILOT_CHECKS.find(([key])=>selected.pilot_checks?.[key]!==true)?.[1]}. Check it only after actually testing.
                </div> : null}
                <Field label="Tester feedback, problems, devices">
                  <textarea key={selected.id+"pilot_feedback"} defaultValue={selected.pilot_feedback||""} rows={3} maxLength={4000}
                    onBlur={e=>{if(e.target.value!==(selected.pilot_feedback||""))patchProspect({pilot_feedback:e.target.value});}}
                    placeholder="Observed blockers, screenshots requested, next fix…"
                    className={inputClass+" mt-1"}/>
                </Field>
                <p className="mt-2 text-[11px] text-slate-500">Saved centrally in this founder-only prospect record. Tester-side pilot notes remain on their device until shared.</p>
                {selected.pilot_status !== "COMPLETE" ? <button type="button" onClick={approveAndNotify}
                  disabled={!!busy || !selected.linked_business || !selected.email || PILOT_CHECKS.some(([key])=>selected.pilot_checks?.[key]!==true)}
                  className="mt-3 min-h-12 w-full rounded-xl bg-emerald-400 px-3 text-sm font-black text-slate-950 disabled:opacity-40">
                  Approve setup & notify business owner
                </button> : null}
                <div className="mt-3 rounded-xl border border-indigo-500/25 bg-indigo-500/10 p-3">
                  <div className="text-xs font-black text-white">Completion notification</div>
                  <p className="mt-1 text-[11px] text-slate-300">Mark pilot Complete only after all checks pass. Sending a completion notice requires a separate confirmation; no message is sent by checking boxes.</p>
                  <button type="button" onClick={sendCompletion} disabled={!!busy || selected.pilot_status!=="COMPLETE" || !selected.linked_business || selected.completion_notified || !selected.email}
                    className="mt-3 min-h-11 w-full rounded-xl bg-indigo-400 px-3 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">
                    {selected.completion_notified?"Completion email already requested":"Send completion notice"}
                  </button>
                </div>
                <div className="mt-3 rounded-xl border border-fuchsia-500/25 bg-fuchsia-500/10 p-3">
                  <div className="text-xs font-black text-white">Optional add-on offers</div>
                  <p className="mt-1 text-[11px] text-slate-300">Prepare a message, not a subscription or automatic marketing email. Confirm prices, consent/suppression and CAN-SPAM details before any outside sending.</p>
                  <select className={inputClass+" mt-3"} value={offerId} onChange={e=>setOfferId(e.target.value)}>
                    {PAID_OFFERS.map(item=><option value={item.id} key={item.id}>{item.label} — {item.description}</option>)}
                  </select>
                  <button type="button" onClick={copyOfferDraft} className="mt-2 min-h-11 w-full rounded-xl border border-fuchsia-400/40 bg-slate-950 px-3 text-xs font-black text-fuchsia-200">
                    Copy paid-feature offer draft (no send)
                  </button>
                </div>

              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={!!busy || !selected.email} onClick={sendInvite} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-3 text-sm font-black text-slate-950 disabled:opacity-40"><Send className="h-4 w-4"/> Send invitation</button>
                <button type="button" onClick={copyLink} disabled={!selected.email} className={btn}><Mail className="h-4 w-4"/> Copy link</button>
              </div>
              <div className="text-xs leading-5 text-slate-400">Signed up: <b className="text-white">{selected.signed_up ? "Yes, verified account" : "Not yet confirmed"}</b> · Last invitation: {formatDate(selected.last_invited_at)}. Email sending records provider acceptance, not inbox delivery or open tracking.</div>
              <div className="border-t border-slate-800 pt-3">
                <h4 className="text-sm font-black text-white">Record the next interaction</h4>
                <div className="mt-2 flex gap-2">
                  <select value={activityKind} onChange={(e) => setActivityKind(e.target.value)} className={inputClass+" w-36"}><option value="NOTE">Note</option><option value="CALL">Call</option><option value="MEETING">Meeting</option><option value="EMAIL">External email</option></select>
                  <button type="button" onClick={logActivity} disabled={!!busy || !note.trim()} className={btn}><Plus className="h-4 w-4"/> Log</button>
                </div>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="What was discussed? What did they ask for?" className={inputClass+" mt-2 resize-y"} />
              </div>
              <div className="border-t border-slate-800 pt-3">
                <h4 className="text-sm font-black text-white">Outreach & activity history</h4>
                <div className="mt-3 max-h-96 space-y-2 overflow-y-auto">
                  {(selected.activities || []).length === 0 ? <p className="text-xs text-slate-500">No interactions logged.</p> : null}
                  {(selected.activities || []).map((a) => <div key={a.id} className="rounded-xl border border-slate-800 bg-black/20 p-3 text-xs">
                    <div className="flex justify-between gap-2"><b className="text-cyan-200">{a.subject || a.kind}</b><span className="text-slate-500">{formatDate(a.created_at)}</span></div>
                    {a.recipient ? <div className="mt-1 text-slate-400">To: {a.recipient}</div> : null}
                    <div className="mt-2 whitespace-pre-wrap break-words text-slate-300">{a.body}</div>
                  </div>)}
                </div>
              </div>
            </div>}
        </aside>
      </div>
      {showCreate ? <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 p-3" role="dialog" aria-modal="true" aria-label="New prospect">
        <form onSubmit={createProspect} className="max-h-[92dvh] w-full max-w-xl space-y-3 overflow-y-auto rounded-[1.75rem] border border-cyan-400/25 bg-[#071124] p-5 text-white">
          <div className="flex items-start justify-between"><div><div className="text-xs uppercase tracking-widest text-cyan-200">New acquisition ticket</div><h3 className="mt-1 text-xl font-black">Add a business prospect</h3><p className="mt-1 text-xs text-slate-400">Save without registering them or sending anything.</p></div><button type="button" onClick={() => setShowCreate(false)} aria-label="Close" className={btn}><X className="h-4 w-4"/></button></div>
          <Field label="Business name *"><input required value={draft.company_name} onChange={(e)=>changeDraft("company_name",e.target.value)} className={inputClass} placeholder="Electrical company"/></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Owner / contact"><input value={draft.contact_name} onChange={(e)=>changeDraft("contact_name",e.target.value)} className={inputClass}/></Field>
            <Field label="Industry"><input value={draft.industry} onChange={(e)=>changeDraft("industry",e.target.value)} className={inputClass} placeholder="Electrical"/></Field>
            <Field label="Email"><input type="email" value={draft.email} onChange={(e)=>changeDraft("email",e.target.value)} className={inputClass}/></Field>
            <Field label="Phone"><input type="tel" value={draft.phone} onChange={(e)=>changeDraft("phone",e.target.value)} className={inputClass}/></Field>
          </div>
          <Field label="What do they need?"><div className="flex flex-wrap gap-2">{INTERESTS.map(v=><button key={v} type="button" onClick={()=>changeDraft("interests",draft.interests.includes(v)?draft.interests.filter(x=>x!==v):[...draft.interests,v])} className={`rounded-full border px-3 py-2 text-xs ${draft.interests.includes(v)?"border-cyan-300 bg-cyan-500/20 text-cyan-100":"border-slate-700 text-slate-300"}`}>{v}</button>)}</div></Field>
          <Field label="Notes"><textarea rows={3} value={draft.notes} onChange={(e)=>changeDraft("notes",e.target.value)} className={inputClass} placeholder="Needs breaker specialist, owner interested in auto-dispatch..."/></Field>
          <Field label="Next action"><input value={draft.next_action} onChange={(e)=>changeDraft("next_action",e.target.value)} className={inputClass}/></Field>
          <Field label="Follow-up date"><input type="datetime-local" value={draft.follow_up_at} onChange={(e)=>changeDraft("follow_up_at",e.target.value)} className={inputClass}/></Field>
          <button type="submit" disabled={!!busy || !draft.company_name.trim()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 font-black text-slate-950 disabled:opacity-40"><CheckCircle2 className="h-4 w-4"/> Save prospect ticket</button>
        </form>
      </div> : null}
    </section>
  );
}
