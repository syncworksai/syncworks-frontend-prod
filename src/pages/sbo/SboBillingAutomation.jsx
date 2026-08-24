import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, BellRing, Bot, CheckCircle2, Clock3, DollarSign, Save, Send, ShieldCheck, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

import DashboardShell from "../../components/dashboard/DashboardShell";
import { getBillingAutomationSettings, getReceivablesIntelligence, saveBillingAutomationSettings } from "../../api/invoices";

function money(value) {
  return Number(value || 0).toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function Toggle({ checked, onChange, label, detail }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${checked ? "border-cyan-300/30 bg-cyan-500/[.08]" : "border-white/10 bg-white/[.025]"}`}>
      <span className={`mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${checked ? "justify-end bg-cyan-400" : "justify-start bg-slate-700"}`}><span className="h-5 w-5 rounded-full bg-white shadow" /></span>
      <span><span className="block text-sm font-black text-white">{label}</span><span className="mt-1 block text-xs leading-5 text-slate-400">{detail}</span></span>
    </button>
  );
}

function Stat({ label, value, tone = "text-white" }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="text-[10px] font-black uppercase tracking-[.15em] text-slate-500">{label}</div><div className={`mt-2 text-xl font-black ${tone}`}>{money(value)}</div></div>;
}

export default function SboBillingAutomation() {
  const nav = useNavigate();
  const [settings, setSettings] = useState(null);
  const [ar, setAr] = useState({ aging: {}, customers: [], insights: [], chronic_late_customers: [], collection_forecast: {}, automation: {}, overdue_total: "0", overdue_customer_count: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const [nextSettings, nextAr] = await Promise.all([getBillingAutomationSettings(), getReceivablesIntelligence()]);
      setSettings(nextSettings); setAr(nextAr);
    } catch (e) { setError(e?.response?.data?.detail || "Billing automation is temporarily unavailable."); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function patch(field, value) { setNotice(""); setSettings((current) => ({ ...current, [field]: value })); }

  async function save() {
    setSaving(true); setNotice(""); setError("");
    try {
      const payload = {
        auto_send_invoices: !!settings.auto_send_invoices,
        due_terms: settings.due_terms,
        custom_due_days: Number(settings.custom_due_days || 0),
        auto_reminders_enabled: !!settings.auto_reminders_enabled,
        reminder_before_due_days: Number(settings.reminder_before_due_days || 0),
        reminder_on_due_date: !!settings.reminder_on_due_date,
        reminder_after_due_days: String(settings.reminder_after_due_days_text ?? (settings.reminder_after_due_days || []).join(","))
          .split(",").map((value) => Number(value.trim())).filter((value) => Number.isInteger(value) && value >= 0),
        pause_new_non_emergency_work_when_overdue: !!settings.pause_new_non_emergency_work_when_overdue,
        overdue_pause_threshold_days: Number(settings.overdue_pause_threshold_days || 0),
        overdue_pause_threshold_cents: Math.round(Number(settings.overdue_pause_threshold_dollars || Number(settings.overdue_pause_threshold_cents || 0) / 100 || 0) * 100),
      };
      const updated = await saveBillingAutomationSettings(payload);
      setSettings(updated); setNotice("Billing automation settings saved.");
      setAr(await getReceivablesIntelligence());
    } catch (e) { setError(e?.response?.data?.detail || "Unable to save billing automation settings."); }
    finally { setSaving(false); }
  }

  const dueLabel = useMemo(() => {
    const map = { DUE_ON_RECEIPT: "Due on receipt", NET_7: "Net 7", NET_15: "Net 15", NET_30: "Net 30", NET_45: "Net 45", CUSTOM: "Custom" };
    return map[settings?.due_terms] || "Net 15";
  }, [settings?.due_terms]);

  const forecast = ar.collection_forecast || {};
  const runtimeActive = ar.automation?.runtime === "ACTIVE_DAILY";

  return (
    <DashboardShell modeBarTitle="Business" modeBarSubtitle="Billing automation">
      <div className="mx-auto max-w-6xl space-y-4 pb-24">
        <section className="rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_90%_10%,rgba(139,92,246,.18),transparent_30%),rgba(2,6,23,.94)] p-5 sm:p-7">
          <button type="button" onClick={() => nav("/sbo/settings")} className="inline-flex items-center gap-2 text-xs font-black text-slate-400"><ArrowLeft className="h-4 w-4" />Business settings</button>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-cyan-200"><Bot className="h-4 w-4" />SYNC accounts receivable</div>
          <h1 className="mt-2 text-3xl font-black text-white">Automate the follow-up. Keep control of the money.</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Choose whether invoices are sent automatically or held as drafts, set payment terms and reminder cadence, and let SYNC surface aging, cash expectations, and collection risk.</p>
        </section>

        {error ? <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}
        {notice ? <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-100">{notice}</div> : null}

        {loading || !settings ? <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 text-sm text-slate-400">Loading billing controls…</div> : <>
          <section className="grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
            <div className="rounded-[1.8rem] border border-white/10 bg-slate-950/65 p-5">
              <div className="flex items-center gap-2"><Send className="h-5 w-5 text-cyan-200" /><h2 className="text-lg font-black text-white">Invoice delivery</h2></div>
              <div className="mt-4"><Toggle checked={!!settings.auto_send_invoices} onChange={(value) => patch("auto_send_invoices", value)} label="Automatically send invoices" detail={settings.auto_send_invoices ? "ON — when an eligible completed job is invoiced, SyncWorks sends it using your payment terms." : "OFF — SyncWorks creates a draft and waits for an approved Business user to review and send it."} /></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-400">Default payment terms<select value={settings.due_terms || "NET_15"} onChange={(e) => patch("due_terms", e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-white"><option value="DUE_ON_RECEIPT">Due on receipt</option><option value="NET_7">Net 7</option><option value="NET_15">Net 15</option><option value="NET_30">Net 30</option><option value="NET_45">Net 45</option><option value="CUSTOM">Custom</option></select></label>
                {settings.due_terms === "CUSTOM" ? <label className="text-xs font-bold text-slate-400">Custom days<input type="number" min="0" max="365" value={settings.custom_due_days ?? 14} onChange={(e) => patch("custom_due_days", e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-white" /></label> : <div className="rounded-xl border border-white/10 bg-white/[.025] p-3"><div className="text-[10px] uppercase tracking-wider text-slate-500">New invoices</div><div className="mt-1 font-black text-white">{dueLabel}</div></div>}
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-white/10 bg-slate-950/65 p-5">
              <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><BellRing className="h-5 w-5 text-violet-200" /><h2 className="text-lg font-black text-white">Payment reminders</h2></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${runtimeActive ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-slate-700 bg-slate-900 text-slate-500"}`}>{runtimeActive ? "Runtime active" : "Manual mode"}</span></div>
              <div className="mt-4"><Toggle checked={!!settings.auto_reminders_enabled} onChange={(value) => patch("auto_reminders_enabled", value)} label="Automatic reminder rules" detail="When enabled, the production billing worker evaluates this cadence daily. Manual reminder buttons remain available in Invoice Center." /></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-400">Days before due<input type="number" min="0" value={settings.reminder_before_due_days ?? 3} onChange={(e) => patch("reminder_before_due_days", e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-white" /></label>
                <label className="text-xs font-bold text-slate-400">Days after due<input value={settings.reminder_after_due_days_text ?? (settings.reminder_after_due_days || []).join(", ")} onChange={(e) => patch("reminder_after_due_days_text", e.target.value)} placeholder="3, 7, 14, 30" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-white" /></label>
              </div>
              <div className="mt-3"><Toggle checked={!!settings.reminder_on_due_date} onChange={(value) => patch("reminder_on_due_date", value)} label="Remind on the due date" detail="Keeps the due-date touch separate from before/after-due reminders." /></div>
            </div>
          </section>

          <section className="rounded-[1.8rem] border border-amber-400/15 bg-amber-500/[.035] p-5">
            <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-amber-200" /><h2 className="text-lg font-black text-white">Overdue-work guardrail</h2></div>
            <p className="mt-1 text-xs leading-5 text-slate-400">Decision support only. SYNC can flag a customer before new non-emergency work is scheduled; an approved employee still decides what to do.</p>
            <div className="mt-4"><Toggle checked={!!settings.pause_new_non_emergency_work_when_overdue} onChange={(value) => patch("pause_new_non_emergency_work_when_overdue", value)} label="Flag new non-emergency work for overdue customers" detail="Emergency work is never automatically blocked by this setting." /></div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-400">Oldest invoice at least<input type="number" min="0" value={settings.overdue_pause_threshold_days ?? 30} onChange={(e) => patch("overdue_pause_threshold_days", e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-white" /><span className="mt-1 block text-[10px] text-slate-600">days overdue</span></label><label className="text-xs font-bold text-slate-400">Overdue balance at least<input inputMode="decimal" value={settings.overdue_pause_threshold_dollars ?? Number(settings.overdue_pause_threshold_cents || 0) / 100} onChange={(e) => patch("overdue_pause_threshold_dollars", e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-white" /><span className="mt-1 block text-[10px] text-slate-600">dollars</span></label></div>
          </section>

          <button type="button" disabled={saving} onClick={save} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 text-sm font-black text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Saving…" : "Save billing rules"}</button>
        </>}

        <section className="rounded-[1.8rem] border border-cyan-400/15 bg-slate-950/65 p-5">
          <div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-cyan-200" /><h2 className="text-lg font-black text-white">CEO cash forecast</h2></div>
          <p className="mt-1 text-xs text-slate-500">Operational forecast only: weighted by receivable age, not a guarantee of collection.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><Stat label="Outstanding" value={ar.outstanding_total} /><Stat label="Due next 7 days" value={forecast.due_next_7_days} tone="text-cyan-100" /><Stat label="Due next 30 days" value={forecast.due_next_30_days} tone="text-violet-100" /><Stat label="Weighted 30-day" value={forecast.weighted_expected_30_days} tone="text-emerald-100" /></div>
          <div className="mt-4 space-y-2">{(ar.insights || []).length ? ar.insights.map((item, index) => <div key={`${item.type}-${index}`} className={`rounded-2xl border p-3 text-xs leading-5 ${item.severity === "high" ? "border-rose-500/20 bg-rose-500/[.06] text-rose-100" : "border-amber-500/20 bg-amber-500/[.05] text-amber-100"}`}><span className="font-black">SYNC:</span> {item.message}</div>) : <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[.04] p-4 text-sm text-emerald-100">No material collection exceptions detected.</div>}</div>
        </section>

        <section className="rounded-[1.8rem] border border-white/10 bg-slate-950/65 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-emerald-200" /><h2 className="text-lg font-black text-white">Accounts receivable</h2></div><p className="mt-1 text-xs text-slate-500">Who owes what, and how long it has been outstanding.</p></div><div className="text-right"><div className="text-[10px] uppercase tracking-wider text-slate-500">Overdue</div><div className="text-2xl font-black text-rose-200">{money(ar.overdue_total)}</div><div className="text-xs text-slate-500">{ar.overdue_customer_count || 0} customer(s)</div></div></div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5"><Stat label="Current" value={ar.aging?.current} /><Stat label="1–30 days" value={ar.aging?.["1_30"]} tone="text-amber-100" /><Stat label="31–60" value={ar.aging?.["31_60"]} tone="text-orange-100" /><Stat label="61–90" value={ar.aging?.["61_90"]} tone="text-rose-100" /><Stat label="90+" value={ar.aging?.["90_plus"]} tone="text-rose-200" /></div>
          <div className="mt-5 space-y-2">{(ar.customers || []).length ? ar.customers.map((customer) => <div key={customer.customer_id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-4"><div><div className="font-black text-white">{customer.customer_name}</div><div className="mt-1 text-xs text-slate-500">{customer.invoice_count} overdue invoice(s) · oldest {customer.oldest_days} days</div></div><div className="text-right"><div className="font-black text-rose-100">{money(customer.overdue_balance)}</div>{customer.pause_recommended ? <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-black text-amber-200"><AlertTriangle className="h-3 w-3" />Review before new work</div> : <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-slate-600"><CheckCircle2 className="h-3 w-3" />No hold flag</div>}</div></div>) : <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[.04] p-4 text-sm text-emerald-100">No overdue customer balances right now.</div>}</div>
        </section>

        {(ar.chronic_late_customers || []).length ? <section className="rounded-[1.8rem] border border-amber-400/15 bg-amber-500/[.035] p-5"><div className="font-black text-white">Repeated late-payment patterns</div><div className="mt-3 grid gap-2 md:grid-cols-2">{ar.chronic_late_customers.map((row) => <div key={row.customer_id} className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="font-black text-white">{row.customer_name}</div><div className="mt-1 text-xs text-slate-400">{row.late_invoice_count} of {row.paid_invoice_count} paid invoices were late · average {row.average_days_late} days late</div></div>)}</div></section> : null}

        <section className="rounded-2xl border border-violet-400/15 bg-violet-500/[.04] p-4"><div className="flex gap-3"><Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-violet-200" /><div><div className="font-black text-white">Automation boundary</div><p className="mt-1 text-xs leading-5 text-slate-400">Invoice auto-send and the scheduled reminder runtime are active only when the Business enables them. The reminder worker runs daily and records an immutable invoice event before the same rule can run again, preventing duplicate reminders. SyncWorks never treats a reminder as delivered unless the event exists.</p></div></div></section>
      </div>
    </DashboardShell>
  );
}
