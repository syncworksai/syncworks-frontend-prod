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
  Mail,
  Pencil,
  RotateCcw,
  CalendarClock,
  CreditCard,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import DashboardShell from "../../components/dashboard/DashboardShell";
import "./SboInvoices.css";
import SboNewInvoiceDrawer from "./SboNewInvoiceDrawer";
import "./SboNewInvoiceDrawer.css";
import {
  createInvoiceFromTicket,
  getInvoiceCenter,
  getInvoiceDetail,
  invoiceAction,
  editInvoiceDraft,
  getBillingAutomationSettings,
  saveBillingAutomationSettings,
} from "../../api/invoices";

const FILTERS = ["ALL", "DRAFT", "SENT", "PARTIALLY_PAID", "OVERDUE", "PAID", "VOID"];

function money(value) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
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
  const paid=invoice.amount_paid;
  const balance=invoice.balance_due;
  return (
    <button type="button" onClick={()=>onOpen(invoice.id)} className="sw-invoice-ledger-row" aria-label={`Open invoice ${invoice.id} for ${invoice.customer_name || "customer"}`}>
      <span className="sw-invoice-ledger-identity">
        <strong>INV-{invoice.id} · {invoice.customer_name || "Customer"}</strong>
        <small>{invoice.title || invoice.service_title || "Service invoice"} · {fmtDate(invoice.due_date)}</small>
      </span>
      <span className="sw-invoice-ledger-amounts">
        <span>Paid {money(paid)} of {money(invoice.total)}</span>
        <strong>{money(balance)} due</strong>
      </span>
      <StatePill state={invoice.derived_state}/>
      <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-cyan-200"/>
    </button>
  );
}

function buildInvoiceMailto(invoice) {
  const email=String(invoice.customer_email||"").trim();
  const link=`${window.location.origin}/customer/invoices?invoice_id=${encodeURIComponent(invoice.id)}`;
  const date=invoice.due_date?fmtDate(invoice.due_date):"the agreed due date";
  const message=[
    `Hello ${invoice.customer_name||""},`,
    "",
    `Here is invoice #${invoice.id} for ${invoice.title||invoice.service_title||"services"}.`,
    `Invoice date: ${invoice.created_at?fmtDate(String(invoice.created_at).slice(0,10)):"See invoice"}`,
    `Invoice total: ${money(invoice.total)}`,
    `Remaining balance: ${money(invoice.balance_due)}`,
    `Due date: ${date}`,
    "",
    "View the invoice and pay securely using SyncWorks:",
    link,
    "",
    "You may need to sign in to view this invoice.",
    "Thank you."
  ].join("\n");
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`Invoice #${invoice.id} · ${invoice.title||invoice.service_title||"Services"}`)}&body=${encodeURIComponent(message)}`;
}

function InvoiceEditForm({invoice,busy,onSave,onCancel}) {
  const [title,setTitle]=useState(invoice.title||invoice.service_title||"");
  const [notes,setNotes]=useState(invoice.notes||"");
  const [dueDate,setDueDate]=useState(invoice.due_date||"");
  useEffect(()=>{setTitle(invoice.title||invoice.service_title||"");setNotes(invoice.notes||"");setDueDate(invoice.due_date||"");},[invoice.id]);
  return <form onSubmit={e=>{e.preventDefault();onSave({title:title.trim(),notes,due_date:dueDate});}} className="mt-4 rounded-xl border border-cyan-300/30 bg-cyan-500/5 p-4">
    <h3 className="mb-3 font-semibold">Quick edit · Unpaid draft only</h3>
    <div className="space-y-3">
      <label className="block text-xs">Invoice title<input required maxLength={255} value={title} onChange={e=>setTitle(e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950 p-2 text-sm"/></label>
      <label className="block text-xs">Due date<input required type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950 p-2 text-sm"/></label>
      <label className="block text-xs">Notes<textarea maxLength={4000} value={notes} onChange={e=>setNotes(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950 p-2 text-sm"/></label>
    </div>
    <div className="mt-3 flex gap-2"><button disabled={busy||!title.trim()||!dueDate} type="submit" className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950">Save draft</button><button type="button" onClick={onCancel} className="rounded-lg border border-white/20 px-3 py-2 text-sm">Cancel</button></div>
  </form>;
}

function RefundReviewForm({invoice,busy,onRequest,onCancel}) {
  const [amount,setAmount]=useState(String(invoice.amount_paid||""));
  const [reason,setReason]=useState("");
  return <form onSubmit={e=>{e.preventDefault();onRequest({amount,reason});}} className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/5 p-4">
    <h3 className="font-semibold">Refund review request</h3>
    <p className="my-2 text-xs text-amber-100">This records a review request only. No card, cash, Venmo or check refund is issued automatically.</p>
    <label className="block text-xs">Amount<input required type="number" min="0.01" step="0.01" max={invoice.amount_paid} value={amount} onChange={e=>setAmount(e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950 p-2"/></label>
    <label className="mt-2 block text-xs">Reason<textarea required maxLength={300} value={reason} onChange={e=>setReason(e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950 p-2" rows={2}/></label>
    <div className="mt-3 flex gap-2"><button disabled={busy||!reason.trim()} type="submit" className="rounded-lg border border-amber-300 px-3 py-2 text-sm">Request review</button><button type="button" onClick={onCancel} className="rounded-lg border border-white/20 px-3 py-2 text-sm">Cancel</button></div>
  </form>;
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
            <option value="VENMO">Venmo</option>
            <option value="OTHER">Other external payment</option>
          </select>
        </label>
        <label className="text-xs font-bold text-slate-400">Reference
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Cash receipt, check number, Venmo ID or POS receipt" className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-base text-white" />
        </label>
      </div>
      <button type="button" disabled={busy || Number(amount) <= 0 || Number(amount)>Number(invoice.balance_due) || (["CHECK","VENMO","EXTERNAL_POS"].includes(source)&&!reference.trim())} onClick={() => onRecord({ amount, source, reference })} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 text-sm font-black text-amber-100 disabled:opacity-40">
        <Banknote className="h-4 w-4" /> Record payment
      </button>
    </div>
  );
}

function DetailPanel({ invoice, busy, canManage, onClose, onAction, onEdit, onSendDraft }) {
  if (!invoice) return null;
  const open = !["PAID", "VOID"].includes(invoice.derived_state);
  const [editing,setEditing]=useState(false);
  const [requestingRefund,setRequestingRefund]=useState(false);
  const emailAvailable=Boolean(String(invoice.customer_email||"").trim());

  return (
    <section className="rounded-[2rem] border border-cyan-400/20 bg-slate-950/90 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Invoice #{invoice.id}</div>
          <h2 className="mt-1 text-2xl font-black text-white">{invoice.title || invoice.service_title}</h2>
          <div className="mt-1 text-sm text-slate-400">{invoice.customer_name}</div>
        </div>
        <div className="flex items-center gap-2"><StatePill state={invoice.derived_state} /><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-400"><XCircle className="h-5 w-5" /></button></div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2" aria-label="Invoice quick actions">
        {canManage&&invoice.derived_state==="DRAFT"&&<button type="button" onClick={()=>setEditing(v=>!v)} className="sw-invoice-toolbar-button"><Pencil size={15}/> Quick edit</button>}
        {canManage&&["SENT","OVERDUE","PARTIALLY_PAID","PAID"].includes(invoice.derived_state)&&invoice.customer_email&&<button type="button" disabled={busy} onClick={()=>onAction("email")} className="sw-invoice-toolbar-button disabled:opacity-40"><Mail size={15}/> Send via SyncWorks</button>}
        {canManage&&invoice.derived_state!=="VOID"&&<button type="button" disabled={invoice.derived_state==="DRAFT"} title={invoice.derived_state==="DRAFT"?"Issue the invoice in SyncWorks before emailing the customer.":"Opens an editable email draft"} onClick={()=>onSendDraft(invoice)} className="sw-invoice-toolbar-button disabled:opacity-40"><Mail size={15}/> {invoice.derived_state==="DRAFT"?"Issue first to email":emailAvailable?"Open prefilled email":"Copy invoice link"}</button>}
        {canManage&&Number(invoice.amount_paid)>0&&<button type="button" onClick={()=>setRequestingRefund(v=>!v)} className="sw-invoice-toolbar-button"><RotateCcw size={15}/> Refund review</button>}
      </div>
      {canManage&&<p className="mt-2 text-xs text-slate-400">Email opens your device mail app as a draft. It does not attach a PDF, send automatically or mark the invoice delivered. The customer link requires sign-in.</p>}
      {editing&&<InvoiceEditForm invoice={invoice} busy={busy} onSave={payload=>onEdit(payload).then(ok=>{if(ok)setEditing(false);})} onCancel={()=>setEditing(false)}/>}
      {requestingRefund&&<RefundReviewForm invoice={invoice} busy={busy} onRequest={payload=>onAction("request-refund",payload).then(ok=>{if(ok)setRequestingRefund(false);})} onCancel={()=>setRequestingRefund(false)}/>}
      {invoice.card_last4&&<div className="mt-3 flex items-center gap-2 text-xs text-emerald-200"><CreditCard size={15}/>{invoice.card_brand||"Card"} ending •••• {invoice.card_last4} · Stripe-confirmed payment</div>}
      <dl className="sw-invoice-drawer-summary">
        <div><dt>Invoice total</dt><dd>{money(invoice.total)}</dd></div>
        <div><dt>Collected</dt><dd>{money(invoice.amount_paid)}</dd></div>
        <div><dt>Balance due</dt><dd>{money(invoice.balance_due)}</dd></div>
        <div><dt>Status</dt><dd>{String(invoice.derived_state||"DRAFT").replaceAll("_"," ")}</dd></div>
        <div><dt>Due date</dt><dd>{fmtDate(invoice.due_date)}</dd></div>
        <div><dt>Platform fee · {invoice.platform_fee_collected?"collected":"tracked"}</dt><dd>{money(invoice.platform_fee_amount)}</dd></div>
      </dl>

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

      {canManage&&open ? <div className="mt-4 flex flex-wrap gap-2">
        {invoice.derived_state === "DRAFT" ? <button type="button" disabled={busy} onClick={() => onAction("send")} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-500 px-4 text-sm font-black text-slate-950 disabled:opacity-40"><Send className="h-4 w-4" />Issue in SyncWorks</button> : null}
        {["SENT", "OVERDUE", "PARTIALLY_PAID"].includes(invoice.derived_state) ? <button type="button" disabled={busy} onClick={() => onAction("reminder")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-violet-400/25 bg-violet-500/10 px-4 text-sm font-black text-violet-100 disabled:opacity-40"><Clock3 className="h-4 w-4" />Notify in SyncWorks</button> : null}
        <button type="button" disabled={busy} onClick={() => onAction("void", { reason: "Voided from Invoice Center" })} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-500/[.06] px-4 text-sm font-black text-rose-200 disabled:opacity-40"><XCircle className="h-4 w-4" />Void</button>
      </div> : null}

      {canManage&&open ? <div className="mt-4"><PaymentPanel invoice={invoice} busy={busy} onRecord={(payload) => onAction("record-payment", payload)} /></div> : null}

      <div className="mt-5 rounded-3xl border border-white/10 bg-white/[.02] p-4">
        <div className="font-black text-white">Invoice timeline</div>
        <div className="mt-3 space-y-3">
          {(invoice.events || []).length ? invoice.events.map((event) => (
            <div key={event.id} className="flex gap-3 text-sm"><div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-300" /><div><div className="font-bold text-slate-200">{String(event.event_type).replaceAll("_", " ")}{event.amount ? ` · ${money(event.amount)}` : ""}</div><div className="mt-0.5 text-xs leading-5 text-slate-400">{event.message} · {fmtTime(event.occurred_at)}</div>{event.payment_source&&<div className="mt-1 text-xs text-cyan-200">Payment source: {event.payment_source.replaceAll("_"," ")}{event.external_reference?` · Receipt/reference: ${event.external_reference}`:""}</div>}</div></div>
          )) : <div className="text-sm text-slate-500">No timeline events recorded yet.</div>}
        </div>
      </div>
    </section>
  );
}

export default function SboInvoices() {
  const navigate = useNavigate();
  const [data, setData] = useState({ summary: {}, results: [], ready_to_bill: [], suggestions: [] });
  const [filter, setFilter] = useState(() => {const requested=new URLSearchParams(window.location.search).get("state")?.toUpperCase()||"ALL";return FILTERS.includes(requested)?requested:"ALL";});
  const [workspaceTab,setWorkspaceTab]=useState("invoices");
  const [selected, setSelected] = useState(null);
  const [showNewInvoice,setShowNewInvoice]=useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [reminderSettings,setReminderSettings]=useState(null);
  const canManage=Boolean(data.permissions?.can_manage_invoices);
  const [reminderBusy,setReminderBusy]=useState(false);
  const [showReminderSettings,setShowReminderSettings]=useState(false);
  const [reminderDays,setReminderDays]=useState("2");
  const [reminderError,setReminderError]=useState("");
  useEffect(()=>{getBillingAutomationSettings().then(v=>{setReminderSettings(v);setReminderDays(String(v.reminder_after_due_days?.[0]??2));}).catch(()=>setReminderSettings(null));},[]);


  async function load() {
    setLoading(true); setError("");
    try { setData(await getInvoiceCenter(filter === "ALL" ? "" : filter)); }
    catch (e) {
      const status=e?.response?.status;
      const detail=e?.response?.data?.detail;
      const problem=status===401?"Session expired. Sign in again.":status===403?"Your current business or employee role cannot access invoices.":status===404?"Invoice service or active business could not be found.":status===500?"Invoice service failed on the server. Please check backend logs.":e?.message==="Network Error"?"Could not reach the Invoice Center API. Check connectivity and server status.":"Invoice Center is temporarily unavailable.";
      setError([detail||problem,status?"HTTP "+status:null].filter(Boolean).join(" · "));
    }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [filter]);
  useEffect(()=>{if(!selected)return;const onKey=e=>{if(e.key==="Escape")setSelected(null);};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey);},[selected]);

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
      setShowNewInvoice(false);
      await openInvoice(invoice.id);
    } catch (e) { setError(e?.response?.data?.detail || "Unable to create invoice draft."); }
    finally { setBusy(false); }
  }

  async function runAction(action, payload = {}) {
    if (!selected?.id) return false;
    setBusy(true); setNotice(""); setError("");
    try {
      const updated = await invoiceAction(selected.id, action, payload);
      setSelected(updated);
      setNotice(action === "email"?"Invoice email accepted by configured provider; final delivery is not confirmed.":action === "request-refund"?"Refund review logged. No funds were returned.":action === "record-payment" ? "External payment recorded; reconcile against the actual receipt." : "Invoice updated in SyncWorks; external email delivery is not implied.");
      await load();
      return true;
    } catch (e) { setError(e?.response?.data?.detail || "Unable to update invoice.");return false; }
    finally { setBusy(false); }
  }

  async function saveDraft(payload) {
    if(!selected?.id)return false;
    setBusy(true);setError("");
    try{const updated=await editInvoiceDraft(selected.id,payload);setSelected(updated);setNotice("Unpaid draft updated.");await load();return true;}
    catch(e){setError(e?.response?.data?.detail||"Unable to edit draft.");return false;}
    finally{setBusy(false);}
  }

  async function openEmailDraft(invoice) {
    if(!invoice.customer_email){try{await navigator.clipboard.writeText(`${window.location.origin}/customer/invoices?invoice_id=${invoice.id}`);setNotice("Customer invoice link copied; recipient must sign in. Add customer email in their profile.");}catch{setNotice("No customer email found. Copy the invoice link manually from the customer portal.");}return;}
    window.location.href=buildInvoiceMailto(invoice);
    setNotice("Email draft opened. Confirm and send it from your mail app; SyncWorks has not marked delivery.");
  }

  async function saveReminders() {
    setReminderBusy(true);setReminderError("");
    try {const days=Number(reminderDays);if(!Number.isInteger(days)||days<2||days>60)throw new Error("Choose 2–60 days after the invoice due date.");const v=await saveBillingAutomationSettings({auto_reminders_enabled:true,reminder_after_due_days:[days],reminder_before_due_days:0,reminder_on_due_date:false});setReminderSettings(v);setNotice(`Automated reminders enabled for ${days} days after the due date, subject to configured email delivery and customer preferences.`);setShowReminderSettings(false);}
    catch(e){setReminderError(e?.response?.data?.detail||e.message||"Unable to save reminders.");}
    finally{setReminderBusy(false);}
  }

  async function disableReminders(){setReminderBusy(true);try{const v=await saveBillingAutomationSettings({auto_reminders_enabled:false});setReminderSettings(v);setNotice("Automated reminders disabled.");}catch(e){setReminderError(e?.response?.data?.detail||"Unable to disable reminders.");}finally{setReminderBusy(false);}}


  const summary = data.summary || {};
  const noConfirmedData=error && !(data.results||[]).length && !Object.keys(summary).length;
  const filteredCount = useMemo(() => (data.results || []).length, [data.results]);

  return (
    <DashboardShell modeBarTitle="Business" modeBarSubtitle="Invoice Center">
      <div className="sw-sterling-invoice-office mx-auto max-w-7xl">
        <header className="sw-invoice-office-header">
          <div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">SYNCWORKS · BUSINESS OPERATIONS</div><h1>Invoices & Payments</h1><p>Real business invoice records · select an invoice for details</p></div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={()=>setShowNewInvoice(true)} className="sw-invoice-toolbar-button sw-invoice-create-button"><Plus size={16}/> New invoice</button>
            <button type="button" onClick={()=>navigate("/sbo/finance")} className="sw-invoice-toolbar-button"><ArrowLeft size={16}/> Finance</button>
            <button type="button" onClick={load} disabled={loading} className="sw-invoice-toolbar-button"><RefreshCw size={16} className={loading?"animate-spin":""}/> Refresh</button>
          </div>
        </header>
        <section className="sw-invoice-summary-grid grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Metric icon={WalletCards} label="Outstanding" value={noConfirmedData?"—":money(summary.outstanding)} hint="Open customer balances" />
          <Metric icon={AlertTriangle} label="Overdue" value={noConfirmedData?"—":(summary.overdue_count ?? "—")} hint="Needs follow-up" />
          <Metric icon={CheckCircle2} label="Paid this month" value={noConfirmedData?"—":money(summary.paid_this_month)} hint="Recorded invoice payments" />
          <Metric icon={ReceiptText} label="Ready to bill" value={noConfirmedData?"—":(summary.ready_to_bill_count ?? "—")} hint="Completed jobs without invoice" />
        </section>

        <nav aria-label="Invoice workspace sections" className="sw-invoice-tabs sw-business-compact-nav flex flex-wrap gap-2 rounded-xl border border-cyan-300/20 bg-slate-950/80 p-2">
          {[
            ["invoices","Invoices"],
            ["ready",`Ready to bill (${(data.ready_to_bill||[]).length})`],
            ["assistant","SYNC suggestions"]
          ].map(([id,label])=><button type="button" key={id} onClick={()=>setWorkspaceTab(id)} aria-current={workspaceTab===id?"page":undefined} className={`min-h-10 rounded-lg border px-3 text-xs font-bold ${workspaceTab===id?"border-cyan-400/40 bg-cyan-500/20 text-cyan-50":"border-slate-700 bg-slate-900/40 text-slate-300"}`}>{label}</button>)}
        </nav>

        {canManage&&<div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 p-2">
          <button type="button" onClick={()=>setShowReminderSettings(v=>!v)} className="sw-invoice-toolbar-button"><CalendarClock size={16}/> Automated reminders</button>
          <span className="text-xs text-slate-400">{reminderSettings?.auto_reminders_enabled? `Enabled · ${(reminderSettings.reminder_after_due_days||[]).join(", ")} day(s) after due`:"Off · manual review"}</span>
        </div>}
        {canManage&&showReminderSettings&&<section className="rounded-xl border border-cyan-400/20 bg-slate-950/90 p-3 text-sm">
          <p className="mb-2 text-xs text-slate-400">For outstanding issued invoices, schedule a reminder no earlier than 2 days after the due date. Uses the existing daily automation and available server email delivery, not your personal mail app. Does not charge the card.</p>
          <label className="block text-xs">Days past due <input type="number" min="2" max="60" step="1" value={reminderDays} onChange={e=>setReminderDays(e.target.value)} className="ml-2 w-20 rounded border border-white/20 bg-slate-900 p-2 text-white"/></label>
          <div className="mt-3 flex gap-2"><button disabled={reminderBusy} type="button" onClick={saveReminders} className="sw-invoice-toolbar-button">Enable reminders</button><button disabled={reminderBusy} type="button" onClick={disableReminders} className="sw-invoice-toolbar-button">Disable</button></div>
          {reminderError&&<p role="alert" className="mt-2 text-rose-300">{reminderError}</p>}
        </section>}
        {error ? <div role="alert" className="rounded-2xl border border-rose-400/20 bg-rose-500/[.07] p-3 text-sm text-rose-100"><strong>Invoice data not loaded.</strong> {error} <button type="button" onClick={load} className="ml-2 underline">Retry</button></div> : null}
        {notice ? <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[.07] p-4 text-sm text-emerald-100">{notice}</div> : null}

        {workspaceTab==="assistant" && (data.suggestions || []).length ? <section className="rounded-[1.7rem] border border-violet-400/20 bg-violet-500/[.05] p-4"><div className="flex items-center gap-2 font-black text-white"><Sparkles className="h-5 w-5 text-violet-200" />SYNC recommendations</div><div className="mt-3 grid gap-2 sm:grid-cols-3">{data.suggestions.map((item) => <div key={item.type} className="rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-300">{item.message}</div>)}</div></section> : null}

        {workspaceTab==="ready" && (data.ready_to_bill || []).length ? <section className="rounded-[1.8rem] border border-emerald-400/20 bg-emerald-500/[.045] p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div><div className="font-black text-white">Completed work ready to invoice</div><div className="mt-1 text-xs text-slate-500">Create a draft first. Nothing is silently sent to the customer.</div></div><Plus className="h-5 w-5 text-emerald-200" /></div><div className="mt-4 grid gap-3 lg:grid-cols-2">{data.ready_to_bill.map((job) => <div key={job.ticket_id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-black text-white">{job.title}</div><div className="mt-1 text-xs text-slate-500">{job.customer_name} · {job.marketplace_origin ? "Marketplace" : "Business customer"}</div></div><button type="button" disabled={busy} onClick={() => createDraft(job.ticket_id)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-3 text-xs font-black text-emerald-100 disabled:opacity-40"><Plus className="h-4 w-4" />Create draft</button></div>)}</div></section> : null}

        {selected ? <div className="fixed inset-0 z-[300] flex justify-end bg-[#020617]/75 backdrop-blur-[3px]" role="presentation" onClick={()=>setSelected(null)}>
          <div role="dialog" aria-modal="true" aria-label={`Invoice ${selected.id} details`} className="sw-invoice-detail-drawer h-full w-full max-w-2xl overflow-y-auto overscroll-contain border-l border-cyan-400/35 bg-[#071324] p-3 shadow-2xl sm:p-5" onClick={e=>e.stopPropagation()}>
            <DetailPanel invoice={selected} busy={busy} canManage={canManage} onClose={() => setSelected(null)} onAction={runAction} onEdit={saveDraft} onSendDraft={openEmailDraft}/>
          </div>
        </div> : null}

        {workspaceTab==="assistant" && !(data.suggestions||[]).length ? <p className="rounded-xl border border-white/10 p-4 text-sm text-slate-400">No SYNC suggestions for the current business data.</p> : null}
        {workspaceTab==="ready" && !(data.ready_to_bill||[]).length ? <p className="rounded-xl border border-white/10 p-4 text-sm text-slate-400">No completed work is waiting for an invoice.</p> : null}
        {workspaceTab==="invoices" && <section className="sw-invoice-workspace-list">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><div className="text-lg font-black text-white">Invoices</div><div className="text-xs text-slate-500">{filteredCount} shown</div></div>
            <div className="flex flex-wrap gap-2">{FILTERS.map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={`min-h-9 rounded-full border px-3 text-[10px] font-black uppercase tracking-[.12em] ${filter === item ? "border-cyan-300/30 bg-cyan-500/15 text-cyan-100" : "border-white/10 bg-white/[.025] text-slate-500"}`}>{item.replaceAll("_", " ")}</button>)}</div>
          </div>
          {loading ? <div className="grid min-h-48 place-items-center"><LoaderCircle className="h-8 w-8 animate-spin text-cyan-200" /></div> : null}
          {!loading && !(data.results || []).length ? <div className="mt-4 rounded-3xl border border-white/10 bg-white/[.025] p-8 text-center"><ReceiptText className="mx-auto h-8 w-8 text-slate-600" /><div className="mt-3 font-black text-white">No invoices in this view</div><div className="mt-1 text-sm text-slate-500">Completed jobs will appear above when they are ready to bill.</div></div> : null}
          <div className="sw-invoice-ledger-list">{(data.results || []).map((invoice) => <InvoiceCard key={invoice.id} invoice={invoice} onOpen={openInvoice} />)}</div>
        </section>}
        {showNewInvoice&&<SboNewInvoiceDrawer onClose={()=>setShowNewInvoice(false)} ready={data.ready_to_bill||[]} onCreate={createDraft} busy={busy}/>}
      </div>
    </DashboardShell>
  );
}
