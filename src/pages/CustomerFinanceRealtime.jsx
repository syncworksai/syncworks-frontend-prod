import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CreditCard, LoaderCircle, X } from "lucide-react";

import api from "../api/client";
import DebtPaymentDrawer from "../components/finance/DebtPaymentDrawer";
import CustomerFinance from "./CustomerFinance";

const FINANCE_API = "/personal-finance";

function money(value) {
  return Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function dateLabel(value) {
  if (!value) return "No payment recorded";
  const date = new Date(`${value}T00:00:00`);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : String(value);
}

export default function CustomerFinanceRealtime() {
  const [finance, setFinance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [paymentLiability, setPaymentLiability] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get(`${FINANCE_API}/dashboard/`);
      setFinance(response?.data || {});
    } catch {
      setFinance(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [refreshKey]);

  const liabilities = finance?.liabilities || [];
  const cashAccounts = useMemo(
    () => (finance?.accounts || []).filter((item) => ["CHECKING", "SAVINGS"].includes(item.kind) && !item.is_hidden),
    [finance?.accounts],
  );

  const activePaymentLiability = paymentLiability
    ? liabilities.find((item) => Number(item.id) === Number(paymentLiability.id)) || paymentLiability
    : null;

  const paymentSaved = async () => {
    await load();
    setRefreshKey((value) => value + 1);
  };

  return (
    <>
      <CustomerFinance key={refreshKey} />

      {liabilities.length ? (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="fixed bottom-[9.5rem] left-3 z-[68] inline-flex min-h-10 items-center gap-2 rounded-full border border-cyan-300/30 bg-[#062338]/95 px-4 text-xs font-black text-cyan-50 shadow-2xl backdrop-blur sm:bottom-6 sm:left-auto sm:right-6"
          aria-label="Record a debt payment"
        >
          <CreditCard className="h-4 w-4" />
          Record payment
        </button>
      ) : null}

      {pickerOpen ? (
        <div className="fixed inset-0 z-[94] flex items-end justify-center bg-black/75 sm:items-center sm:p-4">
          <div className="max-h-[84vh] w-full max-w-xl overflow-y-auto rounded-t-[1.5rem] border border-cyan-400/20 bg-[#07111f] p-4 sm:rounded-[1.5rem]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[.16em] text-cyan-200">Real-time debt plan</div>
                <h2 className="mt-1 text-lg font-black">Which account did you pay?</h2>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">Record the actual payment. SyncWorks will update the balance, minimum progress, interest estimate and Debt Plan 1 immediately.</p>
              </div>
              <button type="button" onClick={() => setPickerOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10"><X className="h-4 w-4" /></button>
            </div>

            {loading ? <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-white/10 p-6 text-xs text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading debts…</div> : (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {liabilities.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { setPaymentLiability(item); setPickerOpen(false); }}
                    className="rounded-xl border border-white/10 bg-white/[.02] p-3 text-left hover:border-cyan-400/30 hover:bg-cyan-500/[.04]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-black text-white">{item.name}</div>
                        <div className="mt-1 text-[9px] uppercase text-slate-500">{String(item.kind || "DEBT").replaceAll("_", " ")}{item.apr != null ? ` · ${item.apr}% APR` : ""}</div>
                      </div>
                      <div className="text-right text-sm font-black text-rose-100">{money(item.outstanding_balance)}</div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/5 pt-2 text-[10px] text-slate-500">
                      <span>Min {money(item.minimum_payment ?? item.next_payment_amount)}</span>
                      <span className="inline-flex items-center gap-1">{item.last_payment_date ? <CheckCircle2 className="h-3 w-3 text-emerald-400"/> : null}{item.last_payment_amount ? `${money(item.last_payment_amount)} · ` : ""}{dateLabel(item.last_payment_date)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {activePaymentLiability ? (
        <DebtPaymentDrawer
          liability={activePaymentLiability}
          cashAccounts={cashAccounts}
          onClose={() => setPaymentLiability(null)}
          onSaved={paymentSaved}
        />
      ) : null}
    </>
  );
}
