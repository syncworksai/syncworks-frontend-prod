import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client";

const EXTERNAL_GATES = [
  { id: "backend_deployment", group: "Deploy", title: "Backend production deployment verified", detail: "Confirm the current backend main commit is serving production traffic." },
  { id: "frontend_deployment", group: "Deploy", title: "Frontend production deployment verified", detail: "Confirm the current frontend main commit is live at SyncWorks." },
  { id: "database_backups", group: "Recovery", title: "Automated database backups verified", detail: "Confirm managed PostgreSQL backups are enabled at the provider." },
  { id: "database_pitr", group: "Recovery", title: "Point-in-time recovery verified", detail: "Confirm PITR is enabled when the production database plan supports it." },
  { id: "restore_drill", group: "Recovery", title: "Restore drill completed", detail: "Restore a production backup into a non-production database and record the result." },
  { id: "durable_media", group: "Storage", title: "Durable media storage verified", detail: "Confirm uploaded files use durable object storage/versioning rather than an ephemeral service filesystem." },
  { id: "stripe_webhooks", group: "Payments", title: "Stripe webhook endpoints verified", detail: "Confirm billing, invoice, Connect, and rent webhook endpoints use the intended production secrets." },
  { id: "mobile_smoke", group: "QA", title: "Real-device mobile smoke test", detail: "Verify login, Personal, Business, employee, invoice/payment, and SYNC flows on a real phone." },
];

const CERTIFICATION_FLOWS = [
  { id: "auth_identity", title: "Registration + identity", detail: "Register, verify email, complete Personal profile, sign out/in, and verify session persistence." },
  { id: "marketplace_ticket", title: "Marketplace → Ticket", detail: "Create a service request, match real availability, book, and confirm Business receives the correct Marketplace-origin ticket." },
  { id: "workforce_dispatch", title: "Workforce + dispatch", detail: "Assign staff, honor availability/breaks, run technician clock, and verify route/SLA information." },
  { id: "invoice_payment", title: "Completion → Invoice → Payment", detail: "Complete a job, create/send invoice according to settings, pay remaining balance, and verify paid state." },
  { id: "platform_affiliate", title: "Platform fee + affiliate lineage", detail: "Verify Marketplace/platform fee attribution and the affiliate commission source record without duplicate payout." },
  { id: "billing_runtime", title: "Billing automation", detail: "Verify reminder rules, idempotency, A/R aging, and suppression after payment." },
  { id: "personal_core", title: "Personal command center", detail: "Verify dashboard, Settings, notifications, current/Home location behavior, invoices, calendar, and Marketplace navigation." },
  { id: "health", title: "Health", detail: "Verify mobile workout launch, logging, completion, persistence, SYNC coaching, and subscription gates." },
  { id: "property_management", title: "Property Management", detail: "Verify PM dashboard, property/tenant/work-order workflow, communication, and permissions." },
  { id: "social_events", title: "Social / Groups / Events", detail: "Verify group membership, event coordination, calendar propagation, and current payment boundary." },
  { id: "sync_assistant", title: "SYNC Assistant", detail: "Verify role-aware chat, notifications, weather/travel context, action boundaries, and no false execution claims." },
];

function initialState(items) {
  return items.reduce((acc, item) => {
    acc[item.id] = { status: "PENDING", note: "", updated_at: "" };
    return acc;
  }, {});
}

function emptyManualState() {
  return { external: initialState(EXTERNAL_GATES), certification: initialState(CERTIFICATION_FLOWS) };
}

function stateFromAudit(audit) {
  const base = emptyManualState();
  const persisted = audit?.signoff_state || {};
  return {
    external: { ...base.external, ...(persisted.external_verification || {}) },
    certification: { ...base.certification, ...(persisted.certification || {}) },
  };
}

function badge(status) {
  if (status === "GREEN" || status === "PASSED") return "border-emerald-400/25 bg-emerald-500/10 text-emerald-100";
  if (status === "RED" || status === "BLOCKED") return "border-rose-400/25 bg-rose-500/10 text-rose-100";
  if (status === "WAIVED" || status === "YELLOW") return "border-amber-400/25 bg-amber-500/10 text-amber-100";
  return "border-slate-700 bg-slate-900 text-slate-300";
}

function StatusPill({ status }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[.14em] ${badge(status)}`}>{String(status || "PENDING").replaceAll("_", " ")}</span>;
}

function Stat({ label, value, tone = "text-white" }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">{label}</div><div className={`mt-2 text-xl font-black ${tone}`}>{value}</div></div>;
}

function ManualGate({ item, value, onChange }) {
  const current = value || { status: "PENDING", note: "" };
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.02] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1"><div className="text-sm font-black text-white">{item.title}</div><div className="mt-1 text-xs leading-5 text-slate-400">{item.detail}</div></div>
        <StatusPill status={current.status} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {["PENDING", "PASSED", "BLOCKED", "WAIVED"].map((status) => <button key={status} type="button" onClick={() => onChange({ ...current, status })} className={`rounded-xl border px-3 py-2 text-[11px] font-black transition ${current.status === status ? badge(status) : "border-white/10 bg-slate-950 text-slate-400 hover:text-white"}`}>{status}</button>)}
      </div>
      <input value={current.note || ""} onChange={(event) => onChange({ ...current, note: event.target.value })} placeholder="Verification note / ticket / provider detail" className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-xs text-white outline-none placeholder:text-slate-600" />
    </div>
  );
}

export default function ProductionReadinessCommandCenter() {
  const [audit, setAudit] = useState(null);
  const [manual, setManual] = useState(() => emptyManualState());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);

  async function load() {
    setLoading(true); setError(""); setNotice("");
    try {
      const response = await api.get("/sync-ai/production/readiness/");
      const next = response?.data || null;
      setAudit(next);
      setManual(stateFromAudit(next));
      setDirty(false);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Production readiness audit is unavailable.");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const groupedChecks = useMemo(() => (audit?.checks || []).reduce((acc, row) => { (acc[row.category || "Other"] ||= []).push(row); return acc; }, {}), [audit]);
  const externalDone = useMemo(() => EXTERNAL_GATES.filter((item) => ["PASSED", "WAIVED"].includes(manual.external[item.id]?.status)).length, [manual]);
  const certificationDone = useMemo(() => CERTIFICATION_FLOWS.filter((item) => ["PASSED", "WAIVED"].includes(manual.certification[item.id]?.status)).length, [manual]);
  const manualBlocked = useMemo(() => [...EXTERNAL_GATES.map((item) => manual.external[item.id]), ...CERTIFICATION_FLOWS.map((item) => manual.certification[item.id])].filter((row) => row?.status === "BLOCKED").length, [manual]);
  const appBlocked = Number(audit?.summary?.red || 0) > 0;
  const launchReady = !appBlocked && manualBlocked === 0 && externalDone === EXTERNAL_GATES.length && certificationDone === CERTIFICATION_FLOWS.length;

  function update(section, id, value) {
    setDirty(true); setNotice("");
    setManual((current) => ({ ...current, [section]: { ...current[section], [id]: value } }));
  }

  async function saveSignoff() {
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await api.patch("/sync-ai/production/readiness/", {
        external_verification: manual.external,
        certification: manual.certification,
      });
      const next = response?.data || null;
      setAudit(next);
      setManual(stateFromAudit(next));
      setDirty(false);
      setNotice("Production verification state saved to SyncWorks.");
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Unable to save production verification state.");
    } finally { setSaving(false); }
  }

  async function copyReport() {
    const report = { generated_at: new Date().toISOString(), launch_ready: launchReady, runtime_audit: audit, external_verification: manual.external, certification: manual.certification };
    try { await navigator.clipboard.writeText(JSON.stringify(report, null, 2)); setCopied(true); window.setTimeout(() => setCopied(false), 1500); } catch { setCopied(false); }
  }

  return (
    <section className="space-y-4">
      <div className="relative overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_90%_10%,rgba(34,211,238,.13),transparent_34%),radial-gradient(circle_at_5%_100%,rgba(139,92,246,.12),transparent_35%),rgba(2,6,23,.88)] p-5 sm:p-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div><div className="text-[10px] font-black uppercase tracking-[.24em] text-cyan-200">God Mode · Build 22</div><h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Production Readiness Command Center</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">One launch gate for application health, security, payments, communications, recovery verification, and end-to-end certification. Green means the runtime can prove it. Yellow means external verification or hardening remains. Red blocks launch.</p></div>
          <div className="flex flex-wrap gap-2"><button onClick={load} type="button" className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-xs font-black text-cyan-100">Refresh audit</button><button onClick={saveSignoff} disabled={saving || !dirty} type="button" className="rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-xs font-black text-emerald-100 disabled:opacity-40">{saving ? "Saving…" : dirty ? "Save verification" : "Saved"}</button><button onClick={copyReport} type="button" className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-2 text-xs font-black text-white">{copied ? "Copied" : "Copy launch report"}</button></div>
        </div>
        <div className={`mt-5 rounded-2xl border p-4 ${launchReady ? "border-emerald-400/25 bg-emerald-500/10" : appBlocked || manualBlocked ? "border-rose-400/25 bg-rose-500/10" : "border-amber-400/25 bg-amber-500/10"}`}><div className="text-[10px] font-black uppercase tracking-[.2em] text-slate-300">Whole-platform launch gate</div><div className="mt-1 text-2xl font-black text-white">{launchReady ? "READY FOR RELEASE" : appBlocked || manualBlocked ? "BLOCKED" : "VERIFICATION IN PROGRESS"}</div>{audit?.signoff_state?.updated_at ? <div className="mt-1 text-[11px] text-slate-400">Last persisted signoff: {new Date(audit.signoff_state.updated_at).toLocaleString()}</div> : null}</div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6"><Stat label="Runtime score" value={audit ? `${audit.summary?.readiness_percent || 0}%` : "—"} /><Stat label="Green" value={audit?.summary?.green ?? "—"} tone="text-emerald-200" /><Stat label="Yellow" value={audit?.summary?.yellow ?? "—"} tone="text-amber-200" /><Stat label="Red" value={audit?.summary?.red ?? "—"} tone="text-rose-200" /><Stat label="External" value={`${externalDone}/${EXTERNAL_GATES.length}`} /><Stat label="E2E flows" value={`${certificationDone}/${CERTIFICATION_FLOWS.length}`} /></div>
      </div>

      {error ? <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}
      {notice ? <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">{notice}</div> : null}
      {loading ? <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-400">Running production readiness checks…</div> : null}

      {audit ? <>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Stat label="Database" value={audit.environment?.database_vendor || "—"} /><Stat label="Businesses" value={audit.metrics?.businesses ?? "—"} /><Stat label="Tickets" value={audit.metrics?.tickets ?? "—"} /><Stat label="Invoices" value={audit.metrics?.invoices ?? "—"} /></div>
        {Object.entries(groupedChecks).map(([category, checks]) => <div key={category} className="rounded-[1.8rem] border border-white/10 bg-slate-950/55 p-5"><h3 className="text-sm font-black uppercase tracking-[.15em] text-slate-300">{category}</h3><div className="mt-3 grid gap-2 lg:grid-cols-2">{checks.map((row) => <div key={row.key} className="rounded-2xl border border-white/10 bg-white/[.02] p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-black text-white">{row.label}</div><div className="mt-1 text-xs leading-5 text-slate-400">{row.detail}</div>{row.action ? <div className="mt-2 text-xs font-bold text-amber-200">Next: {row.action}</div> : null}</div><StatusPill status={row.status} /></div></div>)}</div></div>)}
      </> : null}

      <div className="rounded-[1.8rem] border border-violet-400/15 bg-violet-500/[.035] p-5"><div className="text-[10px] font-black uppercase tracking-[.2em] text-violet-200">Provider / device verification</div><h3 className="mt-1 text-xl font-black text-white">External launch gates</h3><p className="mt-1 text-xs leading-5 text-slate-400">These cannot be honestly inferred from source code. God Mode records the actual provider/device signoff here, and Save verification persists it on the SyncWorks backend for use across devices.</p><div className="mt-4 grid gap-2 lg:grid-cols-2">{EXTERNAL_GATES.map((item) => <ManualGate key={item.id} item={item} value={manual.external[item.id]} onChange={(value) => update("external", item.id, value)} />)}</div></div>

      <div className="rounded-[1.8rem] border border-cyan-400/15 bg-cyan-500/[.03] p-5"><div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Production certification</div><h3 className="mt-1 text-xl font-black text-white">End-to-end workflow signoff</h3><p className="mt-1 text-xs leading-5 text-slate-400">Do not infer that one successful module proves another. Each major SyncWorks lifecycle gets its own durable production signoff.</p><div className="mt-4 grid gap-2 lg:grid-cols-2">{CERTIFICATION_FLOWS.map((item) => <ManualGate key={item.id} item={item} value={manual.certification[item.id]} onChange={(value) => update("certification", item.id, value)} />)}</div></div>
    </section>
  );
}
