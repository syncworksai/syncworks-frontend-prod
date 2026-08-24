import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BadgeCheck, CalendarClock, CheckCircle2, ChevronRight, CircleDollarSign, CreditCard, FileText, LoaderCircle, ReceiptText, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import DashboardShell from "../components/dashboard/DashboardShell";
import { getCustomerInvoiceCenter, getCustomerInvoiceDetail, startInvoiceCheckout } from "../api/customerInvoices";

function money(value) {
  return Number(value || 0).toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function fmtDate(value) {
  if (!value) return "No due date";
  try { return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
  catch { return value; }
}

function fmtTime(value) {
  if (!value) return "";
  try { return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
  catch { return value; }
}

function stateClass(state) {
  if (state === "PAID") return "border-emerald-400/25 bg-emerald-500/10 text-emerald-100";
  if (state === "OVERDUE") return "border-rose-400/25 bg-rose-500/10 text-rose-100";
  if (state === "PARTIALLY_PAID") return "border-amber-400/25 bg-amber-500/10 text-amber-100";
  if (state === "VOID") return "border-slate-600 bg-slate-800/60 text-slate-400";
  return "border-cyan-400/25 bg-cyan-500/10 text-cyan-100";
}

function StatePill({ state }) {
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[.13em] ${stateClass(state)}`}>{String(state || "SENT").replaceAll("_", " ")}</span>;
}

function Metric({ icon: Icon, label, value, hint }) {
  return <div className="rounded-3xl border border-white/10 bg-white/[.025] p-4"><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-black uppercase tracking-[.16em] text-slate-500">{label}</span><Icon className="h-5 w-5 text-cyan-200" /></div><div className="mt-3 text-2xl font-black text-white sm:text-3xl">{value}</div><div className="mt-1 text-xs text-slate-500">{hint}</div></div>;
}

function InvoiceCard({ invoice, onOpen }) {
  return <button type="button" onClick={() => onOpen(invoice.id)} className="w-full rounded-[1.7rem] border border-white/10 bg-slate-950/65 p-4 text-left transition hover:border-cyan-400/25">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-300">Invoice #{invoice.id}</div><div className="mt-1 truncate text-lg font-black text-white">{invoice.service_title || invoice.title || "Service invoice"}</div><div className="mt-1 text-sm text-slate-400">{invoice.business_name || "Service provider"}</div></div><StatePill state={invoice.derived_state} /></div>
    <div className="mt-4 grid grid-cols-3 gap-3"><div><div className="text-[10px] uppercase tracking-[.12em] text-slate-600">Total</div><div className="mt-1 font-black text-white">{money(invoice.total)}</div></div><div><div className="text-[10px] uppercase tracking-[.12em] text-slate-600">Balance</div><div className="mt-1 font-black text-white">{money(invoice.balance_due)}</div></div><div><div className="text-[10px] uppercase tracking-[.12em] text-slate-600">Due</div><div className="mt-1 text-sm font-bold text-slate-300">{fmtDate(invoice.due_date)}</div></div></div>
    <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3 text-xs text-slate-500"><span>{invoice.ticket_code ? `Ticket ${invoice.ticket_code}` : `Ticket #${invoice.ticket || "—"}`}</span><span className="inline-flex items-center gap-1 font-black text-cyan-200">Review <ChevronRight className="h-4 w-4" /></span></div>
  </button>;
}

function InvoiceDetail({ invoice, busy, onClose, onPay }) {
  if (!invoice) return null;
  return <section className="rounded-[2rem] border border-cyan-400/20 bg-slate-950/90 p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Invoice #{invoice.id}</div><h2 className="mt-1 text-2xl font-black text-white">{invoice.service_title || invoice.title || "Service invoice"}</h2><div className="mt-1 text-sm text-slate-400">From {invoice.business_name || "Service provider"}</div></div><div className="flex items-center gap-2"><StatePill state={invoice.derived_state} /><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-400"><XCircle className="h-5 w-5" /></button></div></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-3"><Metric icon={ReceiptText} label="Invoice total" value={money(invoice.total)} hint="Original invoice" /><Metric icon={CheckCircle2} label="Paid" value={money(invoice.amount_paid)} hint="Payments recorded" /><Metric icon={CalendarClock} label="Balance due" value={money(invoice.balance_due)} hint={`Due ${fmtDate(invoice.due_date)}`} /></div>
    <div className="mt-5 rounded-3xl border border-white/10 bg-white/[.02] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div className="font-black text-white">Invoice details</div><div className="text-xs text-slate-500">Subtotal {money(invoice.subtotal)} · Tax {money(invoice.tax)}</div></div><div className="mt-3 divide-y divide-white/8">{(invoice.line_items || []).length ? invoice.line_items.map((line) => <div key={line.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-3"><div><div className="font-bold text-slate-200">{line.name}</div><div className="text-xs text-slate-500">{line.quantity} {line.unit_label || ""} × {money(line.unit_price)}</div></div><div className="font-black text-white">{money(line.line_subtotal)}</div></div>) : <div className="py-4 text-sm text-slate-500">No detailed line items were included.</div>}</div>{invoice.notes ? <div className="mt-3 rounded-2xl border border-white/8 bg-slate-950/60 p-3 text-sm leading-6 text-slate-400">{invoice.notes}</div> : null}</div>
    {invoice.can_pay ? <div className="mt-5 rounded-3xl border border-emerald-400/20 bg-emerald-500/[.05] p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-200" /><div><div className="font-black text-white">Pay securely through SyncWorks</div><p className="mt-1 text-xs leading-5 text-slate-400">You will only be charged the remaining balance of {money(invoice.balance_due)}. Card payment is handled through Stripe checkout.</p></div></div><button type="button" disabled={busy} onClick={onPay} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 text-sm font-black text-slate-950 disabled:opacity-50 sm:w-auto">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}Pay {money(invoice.balance_due)}</button></div> : invoice.derived_state === "PAID" ? <div className="mt-5 flex items-center gap-3 rounded-3xl border border-emerald-400/20 bg-emerald-500/[.05] p-4 text-emerald-100"><BadgeCheck className="h-5 w-5" /><div><div className="font-black">Paid in full</div><div className="text-xs text-emerald-100/70">No balance remains on this invoice.</div></div></div> : null}
    <div className="mt-5 rounded-3xl border border-white/10 bg-white/[.02] p-4"><div className="font-black text-white">Activity</div><div className="mt-3 space-y-3">{(invoice.events || []).length ? invoice.events.map((event) => <div key={event.id} className="flex gap-3 text-sm"><div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan-300" /><div><div className="font-bold text-slate-200">{String(event.event_type || "").replaceAll("_", " ")}{event.amount ? ` · ${money(event.amount)}` : ""}</div><div className="mt-0.5 text-xs leading-5 text-slate-500">{event.message} · {fmtTime(event.occurred_at)}</div></div></div>) : <div className="text-sm text-slate-500">No activity recorded yet.</div>}</div></div>
  </section>;
}

export default function CustomerInvoices() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState({ summary: {}, results: [] });
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const requestedInvoiceId = useMemo(() => Number(searchParams.get("invoice_id") || 0), [searchParams]);

  async function load() {
    setLoading(true); setError("");
    try { setData((await getCustomerInvoiceCenter()) || { summary: {}, results: [] }); }
    catch (e) { setError(e?.response?.data?.detail || "Invoices are temporarily unavailable."); }
    finally { setLoading(false); }
  }

  async function openInvoice(id) {
    setBusy(true); setError("");
    try { setSelected(await getCustomerInvoiceDetail(id)); }
    catch (e) { setError(e?.response?.data?.detail || "Unable to load invoice."); }
    finally { setBusy(false); }
  }

  async function payInvoice() {
    if (!selected?.id) return;
    setBusy(true); setError("");
    try {
      const checkout = await startInvoiceCheckout(selected.id);
      if (!checkout?.checkout_url) throw new Error("Checkout URL missing");
      window.location.assign(checkout.checkout_url);
    } catch (e) { setError(e?.response?.data?.detail || "Unable to start secure checkout."); setBusy(false); }
  }

  useEffect(() => {
    load();
    if (searchParams.get("paid") === "1") setNotice("Payment received. Your invoice status will refresh automatically.");
    if (searchParams.get("cancelled") === "1") setNotice("Payment was cancelled. No charge was completed.");
  }, []);

  useEffect(() => { if (requestedInvoiceId) openInvoice(requestedInvoiceId); }, [requestedInvoiceId]);

  const summary = data?.summary || {};
  const invoices = data?.results || [];

  return <DashboardShell eyebrow="Personal · Payments" title="Invoices" subtitle="Review service invoices, track balances, and pay securely without leaving SyncWorks." rightActions={<div className="flex flex-wrap gap-2"><button type="button" onClick={() => navigate("/customer")} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm font-black text-slate-200"><ArrowLeft className="h-4 w-4" /> Dashboard</button><button type="button" onClick={load} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-500/15 px-4 text-sm font-black text-cyan-100 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button></div>}>
    <div className="space-y-5 pb-24 lg:pb-8">
      {notice ? <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">{notice}</div> : null}
      {error ? <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}
      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-500/20 bg-slate-950/75 p-5 md:p-7"><div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" /><div className="relative"><div className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-200">What needs attention</div><h1 className="mt-2 text-3xl font-black tracking-tight text-white">Know exactly what you owe</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Sent invoices appear here with the original total, payments already recorded, remaining balance, due date, and a secure Pay Now action.</p></div></section>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric icon={CircleDollarSign} label="Outstanding" value={money(summary.outstanding)} hint="Across open invoices" /><Metric icon={FileText} label="Open invoices" value={summary.open_count || 0} hint="Awaiting full payment" /><Metric icon={CalendarClock} label="Overdue" value={summary.overdue_count || 0} hint="Past due date" /><Metric icon={CheckCircle2} label="Paid" value={summary.paid_count || 0} hint="Completed invoices" /></div>
      {selected ? <InvoiceDetail invoice={selected} busy={busy} onClose={() => setSelected(null)} onPay={payInvoice} /> : null}
      <section className="rounded-[2rem] border border-white/10 bg-slate-950/55 p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.16em] text-slate-500">Your invoices</div><h2 className="mt-1 text-xl font-black text-white">Payment history and balances</h2></div><ReceiptText className="h-6 w-6 text-cyan-200" /></div><div className="mt-4 space-y-3">{loading ? <div className="flex min-h-32 items-center justify-center text-slate-500"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> Loading invoices…</div> : invoices.length ? invoices.map((invoice) => <InvoiceCard key={invoice.id} invoice={invoice} onOpen={openInvoice} />) : <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center"><ReceiptText className="mx-auto h-8 w-8 text-slate-700" /><div className="mt-3 font-black text-slate-300">No invoices yet</div><div className="mt-1 text-sm text-slate-500">Invoices sent by businesses you work with will appear here.</div></div>}</div></section>
    </div>
  </DashboardShell>;
}
