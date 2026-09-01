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
  { id: "platform_affiliate", title: "Platform fee + affiliate lineage", detail: "Verify collected SyncWorks revenue produces the correct affiliate commission record without duplicate payout." },
  { id: "billing_runtime", title: "Billing automation", detail: "Verify reminder rules, idempotency, A/R aging, fee invoicing, and suppression after payment." },
  { id: "personal_core", title: "Personal command center", detail: "Verify dashboard, Settings, notifications, current/Home location behavior, invoices, calendar, and Marketplace navigation." },
  { id: "health", title: "Health", detail: "Verify mobile workout launch, logging, completion, persistence, SYNC coaching, and subscription gates." },
  { id: "property_management", title: "Property Management", detail: "Verify PM dashboard, property/tenant/work-order workflow, communication, and permissions." },
  { id: "social_events", title: "Social / Groups / Events", detail: "Verify group membership, event coordination, calendar propagation, and current payment boundary." },
  { id: "sync_assistant", title: "SYNC Assistant", detail: "Verify role-aware chat, notifications, weather/travel context, action boundaries, and no false execution claims." },
];

const BUILD_MODULES = [
  ["God Mode / Developer Control", 82, "BUILDING", "Phase 1 command center + verified launch gate"],
  ["Authentication & Mobile Session", 78, "NEEDS TEST", "Production mobile session audit"],
  ["Personal Dashboard", 84, "NEEDS TEST", "Global UI standard + E2E"],
  ["SYNC Assist", 68, "BUILDING", "Cross-module intelligence + actions"],
  ["Calendar / Tasks / Location", 74, "NEEDS TEST", "Travel + event propagation QA"],
  ["Finance", 66, "BUILDING", "Cash flow + transaction reconciliation"],
  ["Health", 86, "NEEDS TEST", "Final mobile beta certification"],
  ["Marketplace / Tickets", 73, "BUILDING", "I Know Just the Guy workflow"],
  ["Business Core / Dispatch", 76, "NEEDS TEST", "E2E business operations"],
  ["Business Billing / Payments", 62, "BUILDING", "1% fee + cap + offline settlement billing"],
  ["Social Media / Leads", 65, "OPEN PR", "Reconcile open social work"],
  ["Groups / Events / Collect", 56, "OPEN PR", "Payments + production boundary"],
  ["Property Management", 72, "NEEDS TEST", "PM E2E + permissions"],
  ["Lease / Documents", 55, "OPEN PR", "Reconcile lease builder PRs"],
  ["Affiliate", 72, "BUILDING", "Revenue attribution + payout verification"],
  ["Store / Affiliate Commerce", 28, "READY TO BUILD", "Personal + Health Store"],
  ["Production Infrastructure", 52, "BLOCKED", "Provider + deployment verification"],
];

const REVENUE_RULES = [
  { title: "Business Starter", value: "$19.99/mo", detail: "Core Business access. Platform transaction fee remains separate." },
  { title: "Business Pro", value: "$249.99/mo", detail: "Premium operating tier. Advanced tools, automation, reporting and preferred transaction economics." },
  { title: "Platform fee", value: "1%", detail: "Working policy: every legitimate business transaction is recorded, regardless of how payment settles." },
  { title: "Monthly maximum", value: "Configurable", detail: "Cap business-originated platform fees so growth is rewarded rather than punished. Final dollar cap remains a pricing decision." },
  { title: "Affiliate share", value: "10%", detail: "Affiliate earns 10% of attributable net SyncWorks revenue actually collected, not 10% of GMV." },
  { title: "Free subscription code", value: "$0 subscription", detail: "Onboarding codes can waive subscription cost while preserving transaction/platform fees unless explicitly configured otherwise." },
];

const PAYMENT_RAILS = [
  ["Card / Stripe", "PROCESSOR", "Record transaction, separate processor economics from SyncWorks platform revenue."],
  ["Cash App", "TRACK", "Record settlement and ensure the SyncWorks platform fee is captured or billed."],
  ["Venmo", "TRACK", "Record external settlement and create/collect the applicable SyncWorks platform fee."],
  ["Cash", "TRACK", "Record cash settlement and include it in business platform-fee billing."],
  ["Other external", "TRACK", "Never let the payment rail bypass transaction accounting."],
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
  const value = String(status || "").toUpperCase();
  if (["GREEN", "PASSED", "ON MAIN", "PRODUCTION VERIFIED"].includes(value)) return "border-emerald-400/25 bg-emerald-500/10 text-emerald-100";
  if (["RED", "BLOCKED"].includes(value)) return "border-rose-400/25 bg-rose-500/10 text-rose-100";
  if (["WAIVED", "YELLOW", "NEEDS TEST", "OPEN PR"].includes(value)) return "border-amber-400/25 bg-amber-500/10 text-amber-100";
  if (["BUILDING", "READY TO BUILD"].includes(value)) return "border-cyan-400/25 bg-cyan-500/10 text-cyan-100";
  return "border-slate-700 bg-slate-900 text-slate-300";
}

function StatusPill({ status }) {
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[.12em] ${badge(status)}`}>{String(status || "PENDING").replaceAll("_", " ")}</span>;
}

function Stat({ label, value, tone = "text-white", hint }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[.025] px-3 py-2.5">
      <div className="text-[9px] font-black uppercase tracking-[.13em] text-slate-500">{label}</div>
      <div className={`mt-1 text-base font-black ${tone}`}>{value}</div>
      {hint ? <div className="mt-0.5 text-[10px] text-slate-500">{hint}</div> : null}
    </div>
  );
}

function InfoButton({ onClick, label = "Details" }) {
  return <button type="button" onClick={onClick} className="rounded-lg border border-white/10 bg-white/[.03] px-2.5 py-1.5 text-[10px] font-bold text-slate-300 transition hover:border-cyan-300/25 hover:text-cyan-100">ⓘ {label}</button>;
}

function Drawer({ open, title, eyebrow, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex justify-end bg-slate-950/75 backdrop-blur-sm" onMouseDown={onClose}>
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-[#07101f] shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-[#07101f]/95 px-4 py-3 backdrop-blur">
          <div><div className="text-[9px] font-black uppercase tracking-[.2em] text-cyan-300">{eyebrow}</div><div className="mt-0.5 text-sm font-black text-white">{title}</div></div>
          <button type="button" onClick={onClose} className="h-8 rounded-lg border border-white/10 px-3 text-xs font-bold text-slate-300">Close</button>
        </div>
        <div className="space-y-3 p-4">{children}</div>
      </aside>
    </div>
  );
}

function ManualGate({ item, value, onChange }) {
  const current = value || { status: "PENDING", note: "" };
  return (
    <div className="rounded-xl border border-white/10 bg-white/[.02] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1"><div className="text-xs font-black text-white">{item.title}</div><div className="mt-1 text-[11px] leading-4 text-slate-400">{item.detail}</div></div>
        <StatusPill status={current.status} />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">{["PENDING", "PASSED", "BLOCKED", "WAIVED"].map((status) => <button key={status} type="button" onClick={() => onChange({ ...current, status })} className={`rounded-lg border px-2 py-1 text-[9px] font-black ${current.status === status ? badge(status) : "border-white/10 bg-slate-950 text-slate-500"}`}>{status}</button>)}</div>
      <input value={current.note || ""} onChange={(event) => onChange({ ...current, note: event.target.value })} placeholder="Verification note / ticket / provider detail" className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-2.5 py-2 text-[11px] text-white outline-none placeholder:text-slate-600" />
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
  const [drawer, setDrawer] = useState(null);

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
  const buildScore = Math.round(BUILD_MODULES.reduce((sum, item) => sum + item[1], 0) / BUILD_MODULES.length);

  function update(section, id, value) {
    setDirty(true); setNotice("");
    setManual((current) => ({ ...current, [section]: { ...current[section], [id]: value } }));
  }

  async function saveSignoff() {
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await api.patch("/sync-ai/production/readiness/", { external_verification: manual.external, certification: manual.certification });
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
    const report = { generated_at: new Date().toISOString(), launch_ready: launchReady, build_score: buildScore, runtime_audit: audit, external_verification: manual.external, certification: manual.certification, revenue_policy: REVENUE_RULES };
    try { await navigator.clipboard.writeText(JSON.stringify(report, null, 2)); setCopied(true); window.setTimeout(() => setCopied(false), 1500); } catch { setCopied(false); }
  }

  return (
    <section className="space-y-3 text-[12px]">
      <div className="relative overflow-hidden rounded-2xl border border-cyan-400/20 bg-[radial-gradient(circle_at_92%_8%,rgba(34,211,238,.12),transparent_32%),radial-gradient(circle_at_8%_100%,rgba(139,92,246,.10),transparent_34%),rgba(2,6,23,.9)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0"><div className="text-[9px] font-black uppercase tracking-[.22em] text-cyan-300">God Mode · Phase 1</div><h2 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">SyncWorks Command Center</h2><p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">Fast operating view for launch readiness, development status and revenue controls. Open details only when needed.</p></div>
          <div className="flex flex-wrap gap-1.5"><button onClick={load} type="button" className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[10px] font-black text-cyan-100">Refresh</button><button onClick={saveSignoff} disabled={saving || !dirty} type="button" className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-[10px] font-black text-emerald-100 disabled:opacity-40">{saving ? "Saving…" : dirty ? "Save verification" : "Saved"}</button><button onClick={copyReport} type="button" className="rounded-lg border border-white/10 bg-white/[.04] px-3 py-2 text-[10px] font-black text-white">{copied ? "Copied" : "Copy report"}</button></div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Stat label="Build estimate" value={`${buildScore}%`} hint="Audited operating estimate" />
          <Stat label="Runtime" value={audit ? `${audit.summary?.readiness_percent || 0}%` : "—"} />
          <Stat label="Launch gate" value={launchReady ? "READY" : appBlocked || manualBlocked ? "BLOCKED" : "VERIFY"} tone={launchReady ? "text-emerald-200" : appBlocked || manualBlocked ? "text-rose-200" : "text-amber-200"} />
          <Stat label="Business Pro" value="$249.99" hint="monthly" />
          <Stat label="Platform fee" value="1%" hint="all recorded transactions" />
          <Stat label="Affiliate share" value="10%" hint="of attributable SW revenue" />
        </div>
      </div>

      {error ? <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 p-3 text-xs text-rose-100">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3 text-xs text-emerald-100">{notice}</div> : null}
      {loading ? <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3 text-xs text-slate-400">Running production readiness checks…</div> : null}

      <div className="grid gap-2 lg:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-slate-950/55 p-3 lg:col-span-2">
          <div className="flex items-center justify-between gap-3"><div><div className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-300">Development</div><div className="mt-0.5 text-sm font-black text-white">Master build board</div></div><InfoButton onClick={() => setDrawer("build")} label="All modules" /></div>
          <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {BUILD_MODULES.slice(0, 8).map(([name, progress, status, next]) => <div key={name} className="rounded-lg border border-white/10 bg-white/[.02] px-2.5 py-2"><div className="flex items-center justify-between gap-2"><div className="truncate text-[11px] font-bold text-slate-200">{name}</div><StatusPill status={status} /></div><div className="mt-1.5 flex items-center gap-2"><div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${progress}%` }} /></div><div className="w-8 text-right text-[9px] font-black text-slate-500">{progress}%</div></div><div className="mt-1 truncate text-[9px] text-slate-500">Next: {next}</div></div>)}
          </div>
        </div>

        <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/[.025] p-3">
          <div className="flex items-center justify-between gap-2"><div><div className="text-[9px] font-black uppercase tracking-[.18em] text-emerald-300">Revenue control</div><div className="mt-0.5 text-sm font-black text-white">Business economics</div></div><InfoButton onClick={() => setDrawer("revenue")} /></div>
          <div className="mt-3 space-y-1.5">{REVENUE_RULES.slice(0, 4).map((rule) => <div key={rule.title} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/10 px-2.5 py-2"><div className="text-[10px] font-bold text-slate-400">{rule.title}</div><div className="text-xs font-black text-white">{rule.value}</div></div>)}</div>
          <div className="mt-2 rounded-lg border border-amber-300/15 bg-amber-300/[.04] p-2 text-[10px] leading-4 text-amber-100">Monthly fee maximum stays configurable until final pricing is approved. Do not hide fees; make the economics predictable.</div>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <button type="button" onClick={() => setDrawer("payments")} className="rounded-xl border border-white/10 bg-slate-950/55 p-3 text-left transition hover:border-cyan-300/20"><div className="flex items-center justify-between"><div className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-300">Transactions</div><span className="text-[10px] text-slate-500">Open →</span></div><div className="mt-1 text-sm font-black text-white">Every payment rail counts</div><div className="mt-1 text-[10px] leading-4 text-slate-500">Cash, Venmo, Cash App, card and other external settlements remain inside platform-fee accounting.</div></button>
        <button type="button" onClick={() => setDrawer("affiliate")} className="rounded-xl border border-white/10 bg-slate-950/55 p-3 text-left transition hover:border-violet-300/20"><div className="flex items-center justify-between"><div className="text-[9px] font-black uppercase tracking-[.18em] text-violet-300">Affiliate</div><span className="text-[10px] text-slate-500">Open →</span></div><div className="mt-1 text-sm font-black text-white">Commission follows collected revenue</div><div className="mt-1 text-[10px] leading-4 text-slate-500">10% of attributable net SyncWorks revenue; capped platform fees naturally cap the commission base.</div></button>
        <button type="button" onClick={() => setDrawer("verification")} className="rounded-xl border border-white/10 bg-slate-950/55 p-3 text-left transition hover:border-amber-300/20"><div className="flex items-center justify-between"><div className="text-[9px] font-black uppercase tracking-[.18em] text-amber-300">Production</div><span className="text-[10px] text-slate-500">Open →</span></div><div className="mt-1 text-sm font-black text-white">{externalDone}/{EXTERNAL_GATES.length} provider · {certificationDone}/{CERTIFICATION_FLOWS.length} E2E</div><div className="mt-1 text-[10px] leading-4 text-slate-500">Only verified production evidence counts as complete.</div></button>
      </div>

      {audit ? <div className="rounded-xl border border-white/10 bg-slate-950/55 p-3"><div className="flex items-center justify-between gap-2"><div><div className="text-[9px] font-black uppercase tracking-[.18em] text-slate-400">Runtime audit</div><div className="mt-0.5 text-sm font-black text-white">Live application checks</div></div><InfoButton onClick={() => setDrawer("runtime")} label="View checks" /></div><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"><Stat label="Green" value={audit?.summary?.green ?? "—"} tone="text-emerald-200" /><Stat label="Yellow" value={audit?.summary?.yellow ?? "—"} tone="text-amber-200" /><Stat label="Red" value={audit?.summary?.red ?? "—"} tone="text-rose-200" /><Stat label="Database" value={audit.environment?.database_vendor || "—"} /></div></div> : null}

      <Drawer open={drawer === "build"} title="Master Development Board" eyebrow="God Mode" onClose={() => setDrawer(null)}>{BUILD_MODULES.map(([name, progress, status, next]) => <div key={name} className="rounded-xl border border-white/10 bg-white/[.02] p-3"><div className="flex items-start justify-between gap-3"><div><div className="text-xs font-black text-white">{name}</div><div className="mt-1 text-[10px] text-slate-500">Next build: {next}</div></div><StatusPill status={status} /></div><div className="mt-2 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${progress}%` }} /></div><span className="text-[10px] font-black text-slate-400">{progress}%</span></div></div>)}</Drawer>

      <Drawer open={drawer === "revenue"} title="Revenue & Pricing Rules" eyebrow="Monetization" onClose={() => setDrawer(null)}>{REVENUE_RULES.map((rule) => <div key={rule.title} className="rounded-xl border border-white/10 bg-white/[.02] p-3"><div className="flex items-center justify-between gap-3"><div className="text-xs font-black text-white">{rule.title}</div><div className="text-sm font-black text-cyan-100">{rule.value}</div></div><div className="mt-1 text-[11px] leading-5 text-slate-400">{rule.detail}</div></div>)}<div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[.04] p-3 text-[11px] leading-5 text-cyan-100">Marketing price standard: use $249.99, not $250.00. Promo/free subscription codes waive only the subscription unless their rules explicitly say platform fees are also waived.</div></Drawer>

      <Drawer open={drawer === "payments"} title="Transaction Accounting" eyebrow="Payments" onClose={() => setDrawer(null)}>{PAYMENT_RAILS.map(([rail, mode, detail]) => <div key={rail} className="rounded-xl border border-white/10 bg-white/[.02] p-3"><div className="flex items-center justify-between gap-3"><div className="text-xs font-black text-white">{rail}</div><StatusPill status={mode === "PROCESSOR" ? "BUILDING" : "READY TO BUILD"} /></div><div className="mt-1 text-[11px] leading-5 text-slate-400">{detail}</div></div>)}<div className="rounded-xl border border-amber-300/15 bg-amber-300/[.04] p-3 text-[11px] leading-5 text-amber-100">Required accounting rule: an external payment method must never create a fee loophole. Completed business revenue enters the transaction ledger first; SyncWorks then determines collected fee versus fee due.</div></Drawer>

      <Drawer open={drawer === "affiliate"} title="Affiliate Economics" eyebrow="Revenue Attribution" onClose={() => setDrawer(null)}><div className="rounded-xl border border-white/10 bg-white/[.02] p-3 text-[11px] leading-5 text-slate-300"><div className="text-xs font-black text-white">Example · $5,000 monthly GMV</div><div className="mt-2 grid grid-cols-3 gap-2"><Stat label="1% fee" value="$50" /><Stat label="Affiliate 10%" value="$5" /><Stat label="SyncWorks net" value="$45" /></div><p className="mt-3 text-slate-400">If a monthly platform-fee maximum reduces the collected fee, commission is calculated from the attributable SyncWorks revenue actually collected. Subscription commissions remain independently attributable by revenue source.</p></div><div className="rounded-xl border border-violet-300/15 bg-violet-300/[.04] p-3 text-[11px] leading-5 text-violet-100">Business-originated transactions and SyncWorks-sourced Marketplace transactions should be tagged separately. That gives us freedom to apply different future fee policies without breaking affiliate lineage.</div></Drawer>

      <Drawer open={drawer === "verification"} title="Production Verification" eyebrow="Launch Gate" onClose={() => setDrawer(null)}><div className="text-[10px] font-black uppercase tracking-[.18em] text-violet-300">Provider / device verification</div>{EXTERNAL_GATES.map((item) => <ManualGate key={item.id} item={item} value={manual.external[item.id]} onChange={(value) => update("external", item.id, value)} />)}<div className="pt-2 text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">End-to-end certification</div>{CERTIFICATION_FLOWS.map((item) => <ManualGate key={item.id} item={item} value={manual.certification[item.id]} onChange={(value) => update("certification", item.id, value)} />)}</Drawer>

      <Drawer open={drawer === "runtime"} title="Runtime Application Checks" eyebrow="Production Audit" onClose={() => setDrawer(null)}>{Object.entries(groupedChecks).map(([category, checks]) => <div key={category} className="rounded-xl border border-white/10 bg-white/[.02] p-3"><div className="text-[10px] font-black uppercase tracking-[.15em] text-slate-400">{category}</div><div className="mt-2 space-y-2">{checks.map((row) => <div key={row.key} className="rounded-lg border border-white/10 bg-slate-950/70 p-2.5"><div className="flex items-start justify-between gap-2"><div><div className="text-[11px] font-black text-white">{row.label}</div><div className="mt-1 text-[10px] leading-4 text-slate-500">{row.detail}</div>{row.action ? <div className="mt-1 text-[10px] font-bold text-amber-200">Next: {row.action}</div> : null}</div><StatusPill status={row.status} /></div></div>)}</div></div>)}</Drawer>
    </section>
  );
}
