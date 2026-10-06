import React, { useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, DollarSign, LoaderCircle, X } from "lucide-react";

import api from "../../api/client";

const FINANCE_API = "/personal-finance";

function money(value) {
  return Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function localYmd() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function dateLabel(value) {
  if (!value) return "Not available";
  const date = new Date(`${value}T00:00:00`);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : String(value);
}

export default function DebtPaymentDrawer({ liability, cashAccounts = [], onClose, onSaved }) {
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(localYmd());
  const [fundingAccount, setFundingAccount] = useState("");
  const [notes, setNotes] = useState("");
  const [payments, setPayments] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(null);

  const currentBalance = Number(liability?.outstanding_balance || 0);
  const apr = Number(liability?.apr ?? liability?.interest_rate ?? 0);
  const estimatedMonthlyInterest = apr > 0 ? currentBalance * (apr / 100) / 12 : 0;
  const minimum = Number(liability?.minimum_payment ?? liability?.next_payment_amount ?? 0);

  const projected = useMemo(() => {
    const payment = Math.max(0, Number(amount || 0));
    const principal = Math.min(payment, currentBalance);
    const balanceAfter = Math.max(0, currentBalance - principal);
    const interestAfter = apr > 0 ? balanceAfter * (apr / 100) / 12 : 0;
    return { payment, balanceAfter, interestAfter, monthlyInterestReduction: Math.max(0, estimatedMonthlyInterest - interestAfter) };
  }, [amount, currentBalance, apr, estimatedMonthlyInterest]);

  const loadHistory = async () => {
    if (!liability?.id) return;
    setLoadingHistory(true);
    try {
      const response = await api.get(`${FINANCE_API}/debt-payments/`, { params: { liability: liability.id } });
      const data = response?.data;
      setPayments(Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []);
    } catch {
      setPayments([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (!liability?.id) return;
    setAmount(minimum > 0 ? String(minimum.toFixed(2)) : "");
    setPaymentDate(localYmd());
    setFundingAccount("");
    setNotes("");
    setSaved(null);
    setError("");
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liability?.id]);

  if (!liability) return null;

  const submit = async () => {
    if (saving) return;
    const numeric = Number(amount || 0);
    if (!(numeric > 0)) return setError("Enter a payment amount greater than zero.");
    setSaving(true);
    setError("");
    try {
      const response = await api.post(`${FINANCE_API}/debt-payments/`, {
        liability: liability.id,
        amount: numeric,
        payment_date: paymentDate,
        funding_account: fundingAccount || null,
        notes,
      });
      setSaved(response?.data || {});
      setAmount("");
      setNotes("");
      await loadHistory();
      if (onSaved) await onSaved(response?.data || {});
    } catch (err) {
      setError(err?.response?.data?.detail || "SyncWorks could not record that payment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/75 sm:items-center sm:p-4">
      <div className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-t-[1.5rem] border border-cyan-400/20 bg-[#07111f] p-4 sm:rounded-[1.5rem]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[.16em] text-cyan-200">Debt payment</div>
            <h2 className="mt-1 text-lg font-black">{liability.name}</h2>
            <div className="mt-1 text-[11px] text-slate-500">Record a payment and SyncWorks will immediately recalculate the balance and Debt Plan 1.</div>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-rose-400/15 bg-rose-500/[.04] p-2.5"><div className="text-[9px] font-black uppercase text-slate-500">Balance</div><div className="mt-1 text-sm font-black text-rose-100">{money(currentBalance)}</div></div>
          <div className="rounded-xl border border-amber-400/15 bg-amber-500/[.04] p-2.5"><div className="text-[9px] font-black uppercase text-slate-500">Minimum</div><div className="mt-1 text-sm font-black text-amber-100">{money(minimum)}</div></div>
          <div className="rounded-xl border border-violet-400/15 bg-violet-500/[.04] p-2.5"><div className="text-[9px] font-black uppercase text-slate-500">APR</div><div className="mt-1 text-sm font-black text-violet-100">{apr > 0 ? `${apr}%` : "Missing"}</div></div>
          <div className="rounded-xl border border-cyan-400/15 bg-cyan-500/[.04] p-2.5"><div className="text-[9px] font-black uppercase text-slate-500">Est. interest / mo</div><div className="mt-1 text-sm font-black text-cyan-100">{apr > 0 ? money(estimatedMonthlyInterest) : "—"}</div></div>
        </div>

        {(liability.last_payment_amount || liability.last_payment_date) ? <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-500/[.04] p-3 text-xs text-slate-300"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" /><span>Last known payment <b>{money(liability.last_payment_amount)}</b>{liability.last_payment_date ? ` on ${dateLabel(liability.last_payment_date)}` : ""}.</span></div> : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label><span className="text-[11px] font-bold text-slate-400">Payment amount</span><div className="relative mt-1"><DollarSign className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-600"/><input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-slate-950 pl-9 pr-3 text-sm text-white outline-none focus:border-cyan-400/40" /></div></label>
          <label><span className="text-[11px] font-bold text-slate-400">Payment date</span><div className="relative mt-1"><CalendarClock className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-600"/><input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-slate-950 pl-9 pr-3 text-sm text-white outline-none focus:border-cyan-400/40" /></div></label>
          <label className="sm:col-span-2"><span className="text-[11px] font-bold text-slate-400">Paid from (optional)</span><select value={fundingAccount} onChange={(e) => setFundingAccount(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-cyan-400/40"><option value="">External / don't change cash balance</option>{cashAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {money(account.current_balance)}</option>)}</select><div className="mt-1 text-[10px] leading-4 text-slate-500">Selecting checking/savings reduces its SyncWorks cash balance too. Use External if the payment already happened outside the balances you track here.</div></label>
          <label className="sm:col-span-2"><span className="text-[11px] font-bold text-slate-400">Note (optional)</span><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Minimum payment, extra payoff, statement payment…" className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-cyan-400/40" /></label>
        </div>

        {projected.payment > 0 ? <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-black/20 p-2.5"><div><div className="text-[8px] font-black uppercase text-slate-600">After payment</div><div className="mt-1 text-xs font-black">{money(projected.balanceAfter)}</div></div><div><div className="text-[8px] font-black uppercase text-slate-600">Est. interest / mo</div><div className="mt-1 text-xs font-black">{apr > 0 ? money(projected.interestAfter) : "—"}</div></div><div><div className="text-[8px] font-black uppercase text-slate-600">Interest reduction</div><div className="mt-1 text-xs font-black text-emerald-200">{apr > 0 ? money(projected.monthlyInterestReduction) : "—"}</div></div></div> : null}

        {error ? <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/[.06] p-3 text-xs text-amber-100">{error}</div> : null}
        {saved?.payment ? <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-500/[.06] p-3 text-xs leading-5 text-emerald-100">Payment recorded. New debt balance: <b>{money(saved?.liability?.outstanding_balance)}</b>. Estimated interest saved over the next 30 days: <b>{money(saved.payment.estimated_interest_saved_next_30_days)}</b>. Debt Plan 1 has been recalculated.</div> : null}

        <button type="button" disabled={saving || !(Number(amount || 0) > 0)} onClick={submit} className="mt-4 min-h-11 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-black text-white disabled:opacity-40">{saving ? <><LoaderCircle className="mr-2 inline h-4 w-4 animate-spin"/>Recording…</> : "Record payment"}</button>
        <p className="mt-2 text-center text-[9px] leading-4 text-slate-600">This records a payment in SyncWorks; it does not send money to the lender.</p>

        <div className="mt-5 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between"><div><div className="text-xs font-black">Payment history</div><div className="text-[10px] text-slate-500">Manual entries and connected-account payment snapshots.</div></div>{loadingHistory ? <LoaderCircle className="h-4 w-4 animate-spin text-slate-500"/> : null}</div>
          {payments.length ? <div className="mt-2 space-y-1.5">{payments.slice(0, 8).map((payment) => <div key={payment.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2"><div><div className="text-xs font-black">{dateLabel(payment.payment_date)}</div><div className="text-[9px] uppercase text-slate-500">{String(payment.source || "MANUAL").replaceAll("_", " ")}{payment.metadata?.provider_verified ? " · verified" : ""}</div></div><div className="text-right"><div className="text-xs font-black text-emerald-100">{money(payment.amount)}</div>{payment.balance_after != null ? <div className="text-[9px] text-slate-500">balance {money(payment.balance_after)}</div> : null}</div></div>)}</div> : <div className="mt-2 rounded-lg border border-dashed border-white/10 p-3 text-[11px] text-slate-500">No payment history stored yet.</div>}
        </div>
      </div>
    </div>
  );
}
