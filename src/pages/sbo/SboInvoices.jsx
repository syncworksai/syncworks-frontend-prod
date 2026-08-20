import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  LoaderCircle,
  Plus,
  ReceiptText,
  RefreshCw,
  Send,
  Sparkles,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import DashboardShell from "../../components/dashboard/DashboardShell";
import {
  createInvoiceFromTicket,
  getInvoiceCenter,
  getInvoiceDetail,
  invoiceAction,
} from "../../api/invoices";

const FILTERS = ["ALL", "DRAFT", "SENT", "PARTIALLY_PAID", "OVERDUE", "PAID", "VOID"];

function money(value) {
  const n = Number(value || 0);
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function fmtDate(value) {
  if (!value) return "No due date";
  try {
    return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return value;
  }
}

function fmtTime(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return value;
  }
}

function tone(state) {
  if (state === "PAID") return "border-emerald-400/25 bg-emerald-500/10 text-emerald-100";
  if (state === "OVERDUE") return "border-rose-400/25 bg-rose-500/10 text-rose-100";
  if (state === "PARTIALLY_PAID") return "border-amber-400/25 bg-amber-500/10 text-amber-100";
  if (state === "VOID") return "border-slate-600 bg-slate-800/50 text-slate-400";
  if (state === "SENT") return "border-violet-400/25 bg-violet-500/10 text-violet-100";
  return "border-cyan-400/25 bg-cyan-500/10 text-cyan-100";
}

function StatePill({ state }) {
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[.13em] ${tone(state)}`}>
      {String(state || "DRAFT").replaceAll("_", " ")}
    </span>
  );
}

function Metric({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[.025] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-black uppercase tracking-[.16em] text-slate-500">{label}</div>
        <Icon className="h-5 w-5 text-cyan-200" aria-hidden="true" />
      </div>
      <div className="mt-3 text-3xl font-black text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </div>
  );
}

function InvoiceCard({ invoice, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(invoice.id)}
      className="w-full rounded-[1.7rem] border border-white/10 bg-slate-950/60 p-4 text-left transition hover:border-cyan-400/25 hover:bg-slate-950/90"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-300">Invoice #{invoice.id}</div>
          <div className="mt-1 truncate text-lg font-black text-white">{invoice.service_title || invoice.title || "Service invoice"}</div>
          <div className="mt-1 text-sm text-slate-400">{invoice.customer_name || "Customer"}</div>
        </div>
        <StatePill state={invoice.derived_state} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div><div className="text-[10px] uppercase tracking-[.12em] text-slate-600">Total</div><div className="mt-1 font-black text-white">{money(invoice.total)}</div></div>
        <div><div className="text-[10px] uppercase tracking-[.12em] text-slate-600">Balance</div><div className="mt-1 font-black text-white">{money(invoice.balance_due)}</div></div>
        <div><div className="text-[10px] uppercase tracking-[.12em] text-slate-600">Due</div><div className="mt-1 text-sm font-bold text-slate-300">{fmtDate(invoice.due_date)}</div></div>
        <div><div className="text-[10px] uppercase tracking-[.12em] text-slate-600">Source</div><div className="mt-1 text-sm font-bold text-slate-300">{invoice.marketplace_origin ? "Marketplace" : "Business"}</div></div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3 text-xs text-slate-500">
        <span>{invoice.ticket_code ? `Ticket ${invoice.ticket_code}` : `Ticket #${invoice.ticket || "—"}`}</span>
        <span className="inline-flex items-center gap-1 font-black text-cyan-200">Open <ChevronRight className="h-4 w-4" /></span>
      </div>
    </button>
  );
}

function PaymentPanel({ invoice, busy, onRecord }) {
  const [amount, setAmount] = useState(invoice?.balance_due || "");
  const [source, setSource] = useState("EXTERNAL_POS");
  const [reference, setReference] = useState("");

  useEffect(() => {
    setAmount(invoice?.balance_due || "");
    setReference("");
  }, [invoice?.id, invoice?.balance_due]);

  return (
    <div className="rounded-3xl border border-amber-400/20 bg-amber-500/[.05] p-4">
      <div className="font-black text-white">Record a payment</div>
      <p className="mt-1 text-xs leading-5 text-slate-400">
        Use this for checks, cash, or payments taken through another POS. SyncWorks records the reconciliation but does not claim it processed an external payment.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-bold text-slate-400">Amount
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-base text-white" />
        </label>
        <label className="text-xs font-bold text-slate-400">Source
          <select value={source} onChange={(e) => setSource(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-base text-white">
            <option value="EXTERNAL_POS">External POS</option>
            <option value="CHECK">Check</option>
            <option value="CASH">Cash</option>
            <option value="OTHER">Other</option>
            <option value="SYNC_CARD">SyncWorks card</option>
          </select>
        </label>
        <label className="text-xs font-bold text-slate-400">Reference
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-base text-white" />
        </label>
      </div>
      <button type="button" disabled={busy || Number(amount) <= 0} onClick={() => onRecord({ amount, source, reference })} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 text-sm font-black text-amber-100 disabled:opacity-40">
        <Banknote className="h-4 w-4" /> Record payment
      </button>
    </div>
  );
}

function DetailPanel({ invoice, busy, onClose, onAction }) {
  if (!invoice) return null;
  const open = !["PAID", "VOID"].includes(invoice.derived_state);
  return (
    <section className="rounded-[2rem] border border-cyan-400/20 bg-slate-950/90 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Invoice #{invoice.id}</div>
          <h2 className="mt-1 text-2xl font-black text-white">{invoice.service_title || invoice.title}</h2>
          <div className="mt-1 text-sm text-slate-400">{invoice.customer_name}</div>
        </div>
        <div className="flex items-center gap-2"><StatePill state={invoice.derived_state} /><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-400"><XCircle className="h-5 w-5" /></button></div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <Metric icon={ReceiptText} label="Invoice total" value={money(invoice.total)} hint="Customer total" />
        <Metric icon={WalletCards} label="Paid" value={money(invoice.amount_paid)} hint="Recorded payments" />
        <Metric icon={Clock3} label="Balance" value={money(invoice.balance_due)} hint={`Due ${fmtDate(invoice.due_date)}`} />
        <Metric icon={FileText} label="Platform fee" value={money(invoice.platform_fee_amount)} hint={invoice.platform_fee_collected ? "Collected" : "Tracked / pending"} />
      </div>

      <div className="mt-5 rounded-3xl border border-white/10 bg-white/[.02] p-4">
        <div className="flex items-center justify-between"><div className="font-black text-white">Line items</div><div className="text-xs text-slate-500">Subtotal {money(invoice.subtotal)} · Tax {money(invoice.tax)}</div></div>
        <div className="mt-3 divide-y divide-white/8">
          {(invoice.line_items || []).length ? invoice.line_items.map((line) => (
            <div key={line.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-3">
              <div><div className="font-bold text-slate-200">{line.name}</div><div className="text-xs text-slate-500">{line.quantity} {line.unit_label || ""} × {money(line.unit_price)}</div></div>
              <div className="font-black text-white">{money(line.line_subtotal)}</div>
            </div>
          )) : <div className="py-4 text-sm text-slate-500">No detailed lines yet. The original invoice total is preserved.</div>}
        </div>
      </div>

      {open ? <div className="mt-4 flex flex-wrap gap-2">
        {invoice.derived_state === "DRAFT" ? <button type="button" disabled={busy} onClick={() => onAction("send")} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-500 px-4 text-sm font-black text-slate-950 disabled:opacity-40"><Send className="h-4 w-4" />Mark sent</button> : null}
        {["SENT", "OVERDUE", "PARTIALLY_PAID"].includes(invoice.derived_state) ? <button type="button" disabled={busy} onClick={() => onAction("reminder")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-violet-400/25 bg-violet-500/10 px-4 text-sm font-black text-violet-100 disabled:opacity-40"><Clock3 className="h-4 w-4" />Payment reminder</button> : null}
        <button type="button" disabled={busy} onClick={() => onAction("void", { reason: "Voided from Invoice Center" })} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-500/[.06] px-4 text-sm font-black text-rose-200 disabled:opacity-40"><XCircle className="h-4 w-4" />Void</button>
      </div> : null}

      {open ? <div className="mt-4"><PaymentPanel invoice={invoice} busy={busy} onRecord={(payload) => onAction("record-payment", payload)} /></div> : null}

      <div className="mt-5 rounded-3xl border border-white/10 bg-white/[.02] p-4">
        <div className="font-black text-white">Invoice timeline</div>
        <div className="mt-3 space-y-3">
          {(invoice.events || []).length ? invoice.events.map((event) => (
            <div key={event.id} className="flex gap-3 text-sm"><div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-300" /><div><div className="font-bold text-slate-200">{String(event.event_type).replaceAll("_", " ")}{event.amount ? ` · ${money(event.amount)}` : ""}</div><div className="mt-0.5 text-xs leading-5 text-slate-500">{event.message} · {fmtTime(event.occurred_at)}</div></div></div>
          )) : <div className="text-sm text-slate-500">No timeline events recorded yet.</div>}
        </div>
      </div>
    </section>
  );
}

export default function SboInvoices() {
  const navigate = useNavigate();
  const [data, setData] = useState({ summary: {}, results: [], ready_to_bill: [], suggestions: [] });
  const [filter, setFilter] = useState("ALL");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try { setData(await getInvoiceCenter(filter === "ALL" ? "" : filter)); }
    catch (e) { setError(e?.response?.data?.detail || "Invoice Center is temporarily unavailable."); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [filter]);

  async function openInvoice(id) {
    setBusy(true); setError("");
    try { setSelected(await getInvoiceDetail(id)); }
    catch (e) { setError(e?.response?.data?.detail || "Unable to load invoice."); }
    finally { setBusy(false); }
  }

  async function createDraft(ticketId) {
    setBusy(true); setNotice(""); setError("");
    try {
      const invoice = await createInvoiceFromTicket(ticketId);
      setNotice("Invoice draft created. Review it before sending.");
      await load();
      await openInvoice(invoice.id);
    } catch (e) { setError(e?.response?.data?.detail || "Unable to create invoice draft."); }
    finally { setBusy(false); }
  }

  async function runAction(action, payload = {}) {
    if (!selected?.id) return;
    setBusy(true); setNotice(""); setError("");
    try {
      const updated = await invoiceAction(selected.id, action, payload);
      setSelected(updated);
      setNotice(action === "record-payment" ? "Payment recorded and balance recalculated." : "Invoice updated.");
      await load();
    } catch (e) { setError(e?.response?.data?.detail || "Unable to update invoice."); }
    finally { setBusy(false); }
  }

  const summary = data.summary || {};
  const filteredCount = useMemo(() => (data.results || []).length, [data.results]);

  return (
    <DashboardShell modeBarTitle="Business" modeBarSubtitle="Invoice Center">
      <div className="mx-auto max-w-7xl space-y-5 pb-28">
        <section className="rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_88%_8%,rgba(34,211,238,.12),transparent_34%),rgba(2,6,23,.94)] p-5 sm:p-7">
          <button type="button" onClick={() => navigate("/sbo/finance")} className="inline-flex items-center gap-2 text-xs font-black text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" />Finance</button>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl"><div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">SYNC Invoice Operations</div><h1 className="mt-1 text-3xl font-black text-white sm:text-4xl">Get the money without losing the details.</h1><p className="mt-2 text-sm leading-6 text-slate-400">Completed work, invoice line items, customer balances, platform-fee lineage and external payment reconciliation stay together. Quick actions sit on top of the existing invoicing engine instead of replacing it.</p></div>
            <button type="button" onClick={load} disabled={loading} className="inline-flex h-11 items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 text-sm font-black text-cyan-100 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={WalletCards} label="Outstanding" value={money(summary.outstanding)} hint="Open customer balances" />
          <Metric icon={AlertTriangle} label="Overdue" value={summary.overdue_count || 0} hint="Needs follow-up" />
          <Metric icon={CheckCircle2} label="Paid this month" value={money(summary.paid_this_month)} hint="Recorded invoice payments" />
          <Metric icon={ReceiptText} label="Ready to bill" value={summary.ready_to_bill_count || 0} hint="Completed jobs without invoice" />
        </section>

        {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-500/[.07] p-4 text-sm text-rose-100">{error}</div> : null}
        {notice ? <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[.07] p-4 text-sm text-emerald-100">{notice}</div> : null}

        {(data.suggestions || []).length ? <section className="rounded-[1.7rem] border border-violet-400/20 bg-violet-500/[.05] p-4"><div className="flex items-center gap-2 font-black text-white"><Sparkles className="h-5 w-5 text-violet-200" />SYNC recommendations</div><div className="mt-3 grid gap-2 sm:grid-cols-3">{data.suggestions.map((item) => <div key={item.type} className="rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-300">{item.message}</div>)}</div></section> : null}

        {(data.ready_to_bill || []).length ? <section className="rounded-[1.8rem] border border-emerald-400/20 bg-emerald-500/[.045] p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div><div className="font-black text-white">Completed work ready to invoice</div><div className="mt-1 text-xs text-slate-500">Create a draft first. Nothing is silently sent to the customer.</div></div><Plus className="h-5 w-5 text-emerald-200" /></div><div className="mt-4 grid gap-3 lg:grid-cols-2">{data.ready_to_bill.map((job) => <div key={job.ticket_id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-black text-white">{job.title}</div><div className="mt-1 text-xs text-slate-500">{job.customer_name} · {job.marketplace_origin ? "Marketplace" : "Business customer"}</div></div><button type="button" disabled={busy} onClick={() => createDraft(job.ticket_id)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-3 text-xs font-black text-emerald-100 disabled:opacity-40"><Plus className="h-4 w-4" />Create draft</button></div>)}</div></section> : null}

        {selected ? <DetailPanel invoice={selected} busy={busy} onClose={() => setSelected(null)} onAction={runAction} /> : null}

        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><div className="text-lg font-black text-white">Invoices</div><div className="text-xs text-slate-500">{filteredCount} shown</div></div>
            <div className="flex flex-wrap gap-2">{FILTERS.map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={`min-h-9 rounded-full border px-3 text-[10px] font-black uppercase tracking-[.12em] ${filter === item ? "border-cyan-300/30 bg-cyan-500/15 text-cyan-100" : "border-white/10 bg-white/[.025] text-slate-500"}`}>{item.replaceAll("_", " ")}</button>)}</div>
          </div>
          {loading ? <div className="grid min-h-48 place-items-center"><LoaderCircle className="h-8 w-8 animate-spin text-cyan-200" /></div> : null}
          {!loading && !(data.results || []).length ? <div className="mt-4 rounded-3xl border border-white/10 bg-white/[.025] p-8 text-center"><ReceiptText className="mx-auto h-8 w-8 text-slate-600" /><div className="mt-3 font-black text-white">No invoices in this view</div><div className="mt-1 text-sm text-slate-500">Completed jobs will appear above when they are ready to bill.</div></div> : null}
          <div className="mt-4 grid gap-3 xl:grid-cols-2">{(data.results || []).map((invoice) => <InvoiceCard key={invoice.id} invoice={invoice} onOpen={openInvoice} />)}</div>
        </section>
      </div>
    </DashboardShell>
  );
}
