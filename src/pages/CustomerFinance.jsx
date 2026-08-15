// src/pages/CustomerFinance.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Bot,
  Building2,
  CalendarClock,
  CreditCard,
  Landmark,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";

import api from "../api/client";
import ModeBar from "../components/ModeBar";
import { useAuth } from "../auth/AuthContext";

const STRIPE_FINANCE_CHECKOUT_URL = "https://buy.stripe.com/6oU00jgX07eT3qFgJl2Nq0c";
const FINANCE_LOGO_URL = "/brands/finance.jpg";
const FINANCE_API = "/personal-finance";

function money(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function dateLabel(value) {
  if (!value) return "Not set";
  const date = new Date(`${value}T00:00:00`);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function unwrap(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function Metric({ label, value, detail, tone = "cyan" }) {
  const tones = {
    cyan: "border-cyan-400/20 from-cyan-500/[.10]",
    emerald: "border-emerald-400/20 from-emerald-500/[.10]",
    amber: "border-amber-400/20 from-amber-500/[.10]",
    rose: "border-rose-400/20 from-rose-500/[.10]",
    violet: "border-violet-400/20 from-violet-500/[.10]",
  };
  return (
    <div className={`rounded-[1.5rem] border bg-gradient-to-br ${tones[tone] || tones.cyan} to-transparent p-4`}>
      <div className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-black text-white">{value}</div>
      {detail ? <div className="mt-1 text-xs leading-5 text-slate-400">{detail}</div> : null}
    </div>
  );
}

function Panel({ title, subtitle, right, children }) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-white">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs leading-5 text-slate-400">{subtitle}</p> : null}
        </div>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Empty({ children }) {
  return <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-500">{children}</div>;
}

function FinanceSignupScreen({ onBack }) {
  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-slate-950/70 p-5 sm:p-7">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_340px]">
          <div>
            <div className="flex items-center gap-3">
              <img src={FINANCE_LOGO_URL} alt="SyncWorks Finance" className="h-16 w-16 rounded-2xl border border-cyan-400/20 object-cover" />
              <div><div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">SyncWorks Finance</div><h1 className="mt-1 text-3xl font-black text-white sm:text-5xl">Your financial command center.</h1></div>
            </div>
            <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">Connect supported banks and credit cards, add anything that cannot connect manually, then see cash, bills, mortgages, debt, spending and goals in one place. SYNC Assist will use the same picture to help you make decisions.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {["Connected + manual accounts", "Bills, debt and payoff dates", "SYNC Assist financial briefings"].map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-white/[.03] p-3 text-xs font-bold text-slate-300">{item}</div>)}
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[.04] p-5">
            <div className="text-xs font-black uppercase tracking-[.16em] text-slate-400">Personal Finance</div>
            <div className="mt-3 flex items-end gap-2"><span className="text-5xl font-black text-white">$2.99</span><span className="pb-2 text-sm text-slate-400">/month</span></div>
            <div className="mt-2 text-sm font-bold text-emerald-200">30 days free</div>
            <a href={STRIPE_FINANCE_CHECKOUT_URL} target="_blank" rel="noreferrer" className="mt-5 flex min-h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 px-4 text-sm font-black text-white">Start free trial</a>
            <button type="button" onClick={onBack} className="mt-3 min-h-11 w-full rounded-2xl border border-white/10 bg-white/[.03] text-sm font-black text-slate-200">Back to Personal</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function loadPlaidScript() {
  if (window.Plaid) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-syncworks-plaid="true"]');
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
    script.async = true;
    script.dataset.syncworksPlaid = "true";
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

const INITIAL_MANUAL = {
  type: "BILL",
  name: "",
  amount: "",
  category: "HOUSING",
  due_date: "",
  balance: "",
  minimum_payment: "",
  apr: "",
  payoff_target_date: "",
  account_kind: "CHECKING",
  credit_limit: "",
  target_amount: "",
  target_date: "",
};

export default function CustomerFinance() {
  const nav = useNavigate();
  const { moduleAccess, isGod } = useAuth();
  const hasFinanceAccess = !!isGod || !!moduleAccess?.finance || !!moduleAccess?.money || !!moduleAccess?.customer_finance || !!moduleAccess?.customerFinance;

  const [dashboard, setDashboard] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState(INITIAL_MANUAL);
  const [savingManual, setSavingManual] = useState(false);

  const loadFinance = async () => {
    setLoading(true);
    setError("");
    try {
      const [summaryResult, txResult] = await Promise.allSettled([
        api.get(`${FINANCE_API}/dashboard/`),
        api.get(`${FINANCE_API}/transactions/`),
      ]);
      if (summaryResult.status !== "fulfilled") throw summaryResult.reason;
      setDashboard(summaryResult.value?.data || {});
      setTransactions(txResult.status === "fulfilled" ? unwrap(txResult.value?.data).slice(0, 10) : []);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Finance could not load yet.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (hasFinanceAccess) loadFinance(); }, [hasFinanceAccess]);

  const connectBank = async () => {
    setSyncing(true);
    setError("");
    try {
      await loadPlaidScript();
      const tokenResponse = await api.post(`${FINANCE_API}/connections/plaid/link-token/`, {});
      const token = tokenResponse?.data?.link_token;
      if (!token || !window.Plaid) throw new Error("Bank connection is not configured yet.");
      const handler = window.Plaid.create({
        token,
        onSuccess: async (publicToken, metadata) => {
          try {
            await api.post(`${FINANCE_API}/connections/plaid/exchange/`, {
              public_token: publicToken,
              institution: metadata?.institution || {},
            });
            await loadFinance();
          } catch (err) {
            setError(err?.response?.data?.detail || "The institution connected, but SyncWorks could not finish importing it.");
          } finally {
            setSyncing(false);
          }
        },
        onExit: () => setSyncing(false),
      });
      handler.open();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Bank connection is unavailable.");
      setSyncing(false);
    }
  };

  const syncAll = async () => {
    const connections = dashboard?.connections || [];
    if (!connections.length) return loadFinance();
    setSyncing(true);
    setError("");
    try {
      await Promise.all(connections.filter((item) => item.status === "ACTIVE").map((item) => api.post(`${FINANCE_API}/connections/${item.id}/sync/`, {})));
      await loadFinance();
    } catch (err) {
      setError(err?.response?.data?.detail || "One or more institutions need attention.");
    } finally {
      setSyncing(false);
    }
  };

  const saveManual = async () => {
    if (!manual.name.trim()) return setError("Give this financial item a name first.");
    setSavingManual(true);
    setError("");
    try {
      if (manual.type === "ACCOUNT") {
        await api.post(`${FINANCE_API}/accounts/`, {
          name: manual.name,
          kind: manual.account_kind,
          current_balance: manual.balance || null,
          credit_limit: manual.credit_limit || null,
          is_manual: true,
        });
      } else if (manual.type === "DEBT") {
        await api.post(`${FINANCE_API}/liabilities/`, {
          name: manual.name,
          kind: manual.account_kind === "CREDIT_CARD" ? "CREDIT_CARD" : manual.account_kind === "MORTGAGE" ? "MORTGAGE" : "OTHER",
          outstanding_balance: manual.balance || null,
          minimum_payment: manual.minimum_payment || null,
          next_payment_amount: manual.minimum_payment || null,
          next_payment_date: manual.due_date || null,
          apr: manual.apr || null,
          payoff_target_date: manual.payoff_target_date || null,
          is_manual: true,
        });
      } else if (manual.type === "GOAL") {
        await api.post(`${FINANCE_API}/goals/`, {
          name: manual.name,
          kind: "SAVINGS",
          target_amount: manual.target_amount || null,
          current_amount: manual.balance || 0,
          target_date: manual.target_date || null,
          active: true,
        });
      } else {
        await api.post(`${FINANCE_API}/obligations/`, {
          name: manual.name,
          category: manual.category,
          expected_amount: manual.amount || null,
          next_due_date: manual.due_date || null,
          recurring: true,
          cadence: "MONTHLY",
          active: true,
          is_manual: true,
        });
      }
      setManual(INITIAL_MANUAL);
      setManualOpen(false);
      await loadFinance();
    } catch (err) {
      setError(err?.response?.data?.detail || "SyncWorks could not save that financial item.");
    } finally {
      setSavingManual(false);
    }
  };

  const net = dashboard?.net_position || {};
  const month = dashboard?.this_month || {};
  const credit = dashboard?.credit || {};
  const upcoming = dashboard?.next_30_days || {};
  const accounts = dashboard?.accounts || [];
  const liabilities = dashboard?.liabilities || [];
  const goals = dashboard?.goals || [];
  const spending = dashboard?.spending_by_category || [];
  const connections = dashboard?.connections || [];

  const availableAfterBills = Number(net.cash || 0) - Number(upcoming.total_due || 0);
  const attention = useMemo(() => {
    const items = [];
    if (Number(upcoming.total_due || 0) > Number(net.cash || 0)) items.push("Upcoming 30-day obligations are greater than available cash.");
    if (Number(credit.utilization_percent || 0) >= 30) items.push(`Credit utilization is ${Number(credit.utilization_percent).toFixed(1)}%.`);
    if (Number(month.cash_flow || 0) < 0) items.push("This month's recorded spending is currently ahead of recorded income.");
    if (connections.some((item) => item.status === "NEEDS_ATTENTION")) items.push("A connected institution needs attention.");
    return items;
  }, [dashboard]);

  if (!hasFinanceAccess) {
    return <div className="min-h-screen bg-[#030712] text-white"><ModeBar /><main className="mx-auto max-w-7xl px-3 pb-24 pt-5 sm:px-5"><FinanceSignupScreen onBack={() => nav("/customer/dashboard")} /></main></div>;
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <ModeBar />
      <main className="mx-auto w-full max-w-7xl space-y-4 px-3 pb-28 pt-4 sm:px-5 lg:px-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_85%_15%,rgba(34,211,238,.13),transparent_28%),radial-gradient(circle_at_65%_80%,rgba(139,92,246,.12),transparent_32%),linear-gradient(145deg,#07111f,#020617)] p-5 sm:p-7">
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <button type="button" onClick={() => nav("/customer/dashboard")} className="mb-4 inline-flex items-center gap-2 text-xs font-black text-slate-400"><ArrowLeft className="h-4 w-4" /> Personal</button>
              <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10"><Landmark className="h-6 w-6 text-cyan-200" /></div><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Personal Finance</div><h1 className="text-2xl font-black sm:text-4xl">Financial Command Center</h1></div></div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">One view for banks, cards, mortgages, loans, bills, utilities, spending and goals. Connect what you can. Add what you cannot. SYNC Assist reads the same financial picture.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={connectBank} disabled={syncing} className="min-h-11 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 text-sm font-black text-white disabled:opacity-50"><Building2 className="mr-2 inline h-4 w-4" />{syncing ? "Connecting…" : "Connect institution"}</button>
              <button type="button" onClick={() => setManualOpen(true)} className="min-h-11 rounded-2xl border border-white/10 bg-white/[.04] px-4 text-sm font-black"><Plus className="mr-2 inline h-4 w-4" />Add manually</button>
              <button type="button" onClick={syncAll} disabled={syncing || loading} className="min-h-11 rounded-2xl border border-white/10 bg-white/[.04] px-4 text-sm font-black text-slate-300"><RefreshCw className={`mr-2 inline h-4 w-4 ${syncing ? "animate-spin" : ""}`} />Refresh</button>
            </div>
          </div>
        </section>

        {error ? <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/[.08] p-4 text-sm text-amber-100"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div> : null}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Metric label="Available cash" value={money(net.cash)} detail={`${accounts.filter((a) => ["CHECKING", "SAVINGS"].includes(a.kind)).length} cash accounts`} tone="cyan" />
          <Metric label="Due next 30 days" value={money(upcoming.total_due)} detail="Bills + debt payments" tone="amber" />
          <Metric label="After scheduled bills" value={money(availableAfterBills)} detail="Cash less known 30-day obligations" tone={availableAfterBills >= 0 ? "emerald" : "rose"} />
          <Metric label="Total debt" value={money(net.debt)} detail={`${liabilities.length} tracked liabilities`} tone="rose" />
          <Metric label="Month cash flow" value={money(month.cash_flow)} detail={`${money(month.income)} in • ${money(month.spending)} out`} tone={Number(month.cash_flow || 0) >= 0 ? "emerald" : "rose"} />
        </div>

        <Panel title="SYNC Assist financial briefing" subtitle="Automatic attention items from the same data used by your Finance dashboard." right={<div className="grid h-10 w-10 place-items-center rounded-2xl border border-violet-400/20 bg-violet-500/10"><Bot className="h-5 w-5 text-violet-200" /></div>}>
          {attention.length ? <div className="grid gap-2 sm:grid-cols-2">{attention.map((item) => <div key={item} className="rounded-2xl border border-amber-400/15 bg-amber-500/[.05] p-3 text-sm text-slate-300">{item}</div>)}</div> : <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-500/[.05] p-4 text-sm text-emerald-100"><ShieldCheck className="h-5 w-5" />No major finance alerts are visible from the data SyncWorks currently has.</div>}
          <button type="button" onClick={() => nav("/sync")} className="mt-3 min-h-10 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 text-xs font-black text-violet-100"><Sparkles className="mr-2 inline h-4 w-4" />Ask SYNC Assist about my finances</button>
        </Panel>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
          <Panel title="Accounts" subtitle="Connected and manually tracked cash, cards and other accounts." right={<span className="text-xs font-black text-slate-400">{accounts.length} total</span>}>
            {accounts.length ? <div className="space-y-2">{accounts.map((account) => <div key={account.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-3"><div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[.04]">{account.kind === "CREDIT_CARD" ? <CreditCard className="h-5 w-5 text-amber-200" /> : <Banknote className="h-5 w-5 text-cyan-200" />}</div><div className="min-w-0"><div className="truncate text-sm font-black text-white">{account.name}</div><div className="mt-0.5 text-[11px] text-slate-500">{account.kind?.replaceAll("_", " ")} {account.mask ? `•••• ${account.mask}` : ""} {account.is_manual ? "• manual" : "• connected"}</div></div></div><div className="text-right"><div className="font-black text-white">{money(account.current_balance)}</div>{account.credit_limit ? <div className="text-[10px] text-slate-500">limit {money(account.credit_limit)}</div> : null}</div></div>)}</div> : <Empty>No financial accounts yet. Connect an institution or add one manually.</Empty>}
          </Panel>

          <Panel title="Credit & debt" subtitle="Balances, minimums, APR and payoff targets." right={credit.utilization_percent != null ? <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black text-slate-300">{credit.utilization_percent}% utilization</span> : null}>
            {liabilities.length ? <div className="space-y-2">{liabilities.slice(0, 6).map((item) => <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-3"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-black text-white">{item.name}</div><div className="mt-1 text-[11px] text-slate-500">{item.kind?.replaceAll("_", " ")}{item.apr ? ` • ${item.apr}% APR` : ""}</div></div><div className="text-right"><div className="font-black text-rose-100">{money(item.outstanding_balance)}</div><div className="text-[10px] text-slate-500">min {money(item.minimum_payment)}</div></div></div>{item.next_payment_date ? <div className="mt-2 text-xs text-slate-400">Next payment {dateLabel(item.next_payment_date)} • {money(item.next_payment_amount || item.minimum_payment)}</div> : null}{item.payoff_target_date ? <div className="mt-1 text-xs text-cyan-200">Payoff target {dateLabel(item.payoff_target_date)}</div> : null}</div>)}</div> : <Empty>Add credit cards, mortgages, auto loans, student loans or other debt to build a complete payoff picture.</Empty>}
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <Panel title="Upcoming obligations" subtitle="Bills, utilities, housing and debt payments due in the next 30 days." right={<CalendarClock className="h-5 w-5 text-amber-200" />}>
            {[...(upcoming.obligations || []).map((item) => ({ id: `bill-${item.id}`, name: item.name, amount: item.expected_amount, date: item.next_due_date, type: item.category })), ...(upcoming.liabilities || []).map((item) => ({ id: `debt-${item.id}`, name: item.name, amount: item.next_payment_amount || item.minimum_payment, date: item.next_payment_date, type: item.kind }))].length ? <div className="space-y-2">{[...(upcoming.obligations || []).map((item) => ({ id: `bill-${item.id}`, name: item.name, amount: item.expected_amount, date: item.next_due_date, type: item.category })), ...(upcoming.liabilities || []).map((item) => ({ id: `debt-${item.id}`, name: item.name, amount: item.next_payment_amount || item.minimum_payment, date: item.next_payment_date, type: item.kind }))].sort((a, b) => String(a.date).localeCompare(String(b.date))).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 p-3"><div><div className="text-sm font-black text-white">{item.name}</div><div className="mt-1 text-[11px] text-slate-500">{item.type?.replaceAll("_", " ")} • {dateLabel(item.date)}</div></div><div className="font-black text-amber-100">{money(item.amount)}</div></div>)}</div> : <Empty>No known obligations are due in the next 30 days.</Empty>}
          </Panel>

          <Panel title="Spending habits" subtitle="Top recorded spending categories for the current month." right={Number(month.spending || 0) > 0 ? <TrendingDown className="h-5 w-5 text-cyan-200" /> : null}>
            {spending.length ? <div className="space-y-3">{spending.map((item) => { const pct = Number(month.spending || 0) ? Math.min(100, (Number(item.total || 0) / Number(month.spending || 1)) * 100) : 0; return <div key={item.category_primary || "Other"}><div className="mb-1 flex justify-between gap-3 text-xs"><span className="font-bold text-slate-300">{item.category_primary || "Other"}</span><span className="font-black text-white">{money(item.total)}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[.05]"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${pct}%` }} /></div></div>; })}</div> : <Empty>Spending patterns will appear as transactions are connected or imported.</Empty>}
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <Panel title="Goals & payoff plan" subtitle="Savings targets and debt-payoff milestones." right={<Target className="h-5 w-5 text-emerald-200" />}>
            {goals.length ? <div className="space-y-2">{goals.map((goal) => { const pct = Number(goal.target_amount || 0) ? Math.min(100, Number(goal.current_amount || 0) / Number(goal.target_amount) * 100) : 0; return <div key={goal.id} className="rounded-2xl border border-white/10 p-3"><div className="flex justify-between gap-3"><div><div className="text-sm font-black text-white">{goal.name}</div><div className="mt-1 text-[11px] text-slate-500">{goal.target_date ? `Target ${dateLabel(goal.target_date)}` : goal.kind?.replaceAll("_", " ")}</div></div><div className="text-right"><div className="font-black text-emerald-100">{money(goal.current_amount)}</div><div className="text-[10px] text-slate-500">of {money(goal.target_amount)}</div></div></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[.05]"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${pct}%` }} /></div></div></div>; })}</div> : <Empty>Add an emergency fund, savings goal or payoff target.</Empty>}
          </Panel>

          <Panel title="Recent activity" subtitle="Latest imported financial transactions." right={Number(month.cash_flow || 0) >= 0 ? <TrendingUp className="h-5 w-5 text-emerald-200" /> : <TrendingDown className="h-5 w-5 text-rose-200" />}>
            {transactions.length ? <div className="space-y-2">{transactions.map((tx) => <div key={tx.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 p-3"><div className="min-w-0"><div className="truncate text-sm font-black text-white">{tx.merchant_name || tx.description || "Transaction"}</div><div className="mt-1 text-[11px] text-slate-500">{dateLabel(tx.date)} • {tx.category_primary || "Uncategorized"}</div></div><div className={`font-black ${tx.is_income ? "text-emerald-200" : "text-white"}`}>{tx.is_income ? "+" : "-"}{money(Math.abs(Number(tx.amount || 0)))}</div></div>)}</div> : <Empty>Connect a bank or card to begin building your transaction history.</Empty>}
          </Panel>
        </div>

        <Panel title="Connections & automation" subtitle="SyncWorks keeps connected financial data together and allows manual records for anything a provider cannot reach." right={<WalletCards className="h-5 w-5 text-cyan-200" />}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 p-3"><div className="text-xs font-black text-white">Institutions</div><div className="mt-2 text-2xl font-black text-cyan-100">{connections.length}</div><div className="mt-1 text-[11px] text-slate-500">Bank/card connections</div></div>
            <div className="rounded-2xl border border-white/10 p-3"><div className="text-xs font-black text-white">Manual coverage</div><div className="mt-2 text-2xl font-black text-violet-100">{accounts.filter((a) => a.is_manual).length + liabilities.filter((a) => a.is_manual).length}</div><div className="mt-1 text-[11px] text-slate-500">Items added outside providers</div></div>
            <div className="rounded-2xl border border-white/10 p-3"><div className="text-xs font-black text-white">Last refresh</div><div className="mt-2 text-sm font-black text-white">{dashboard?.last_synced_at ? new Date(dashboard.last_synced_at).toLocaleString() : "Not synced yet"}</div><div className="mt-1 text-[11px] text-slate-500">Connected data timestamp</div></div>
            <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/[.04] p-3"><div className="text-xs font-black text-cyan-100">Automation target</div><div className="mt-2 text-sm font-black text-white">Bills → spending → payoff → SYNC briefing</div><div className="mt-1 text-[11px] text-slate-500">One financial intelligence layer</div></div>
          </div>
        </Panel>
      </main>

      {manualOpen ? <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"><div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] border border-white/10 bg-[#07111f] p-5 sm:rounded-[2rem]"><div className="flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Manual financial record</div><h2 className="mt-1 text-xl font-black text-white">Add what cannot connect</h2></div><button type="button" onClick={() => setManualOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10"><X className="h-5 w-5" /></button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="sm:col-span-2"><span className="text-xs font-bold text-slate-400">Type</span><select value={manual.type} onChange={(e) => setManual({ ...manual, type: e.target.value })} className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm"><option value="BILL">Bill / utility</option><option value="ACCOUNT">Bank / card account</option><option value="DEBT">Debt / mortgage / loan</option><option value="GOAL">Savings goal</option></select></label><label className="sm:col-span-2"><span className="text-xs font-bold text-slate-400">Name</span><input value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} placeholder="Mortgage, Alabama Power, Visa…" className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm" /></label>{manual.type === "BILL" ? <><label><span className="text-xs font-bold text-slate-400">Expected payment</span><input type="number" value={manual.amount} onChange={(e) => setManual({ ...manual, amount: e.target.value })} className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm" /></label><label><span className="text-xs font-bold text-slate-400">Next due date</span><input type="date" value={manual.due_date} onChange={(e) => setManual({ ...manual, due_date: e.target.value })} className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm" /></label><label className="sm:col-span-2"><span className="text-xs font-bold text-slate-400">Category</span><select value={manual.category} onChange={(e) => setManual({ ...manual, category: e.target.value })} className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm"><option>HOUSING</option><option>UTILITIES</option><option>INSURANCE</option><option>TRANSPORTATION</option><option>SUBSCRIPTIONS</option><option>DEBT</option><option>CHILDCARE</option><option>HEALTH</option><option>TAX</option><option>OTHER</option></select></label></> : null}{manual.type === "ACCOUNT" ? <><label><span className="text-xs font-bold text-slate-400">Account type</span><select value={manual.account_kind} onChange={(e) => setManual({ ...manual, account_kind: e.target.value })} className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm"><option>CHECKING</option><option>SAVINGS</option><option>CREDIT_CARD</option><option>INVESTMENT</option><option>OTHER</option></select></label><label><span className="text-xs font-bold text-slate-400">Current balance</span><input type="number" value={manual.balance} onChange={(e) => setManual({ ...manual, balance: e.target.value })} className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm" /></label>{manual.account_kind === "CREDIT_CARD" ? <label className="sm:col-span-2"><span className="text-xs font-bold text-slate-400">Credit limit</span><input type="number" value={manual.credit_limit} onChange={(e) => setManual({ ...manual, credit_limit: e.target.value })} className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm" /></label> : null}</> : null}{manual.type === "DEBT" ? <><label><span className="text-xs font-bold text-slate-400">Debt type</span><select value={manual.account_kind} onChange={(e) => setManual({ ...manual, account_kind: e.target.value })} className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm"><option>MORTGAGE</option><option>CREDIT_CARD</option><option>AUTO_LOAN</option><option>STUDENT_LOAN</option><option>PERSONAL_LOAN</option><option>OTHER</option></select></label><label><span className="text-xs font-bold text-slate-400">Outstanding balance</span><input type="number" value={manual.balance} onChange={(e) => setManual({ ...manual, balance: e.target.value })} className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm" /></label><label><span className="text-xs font-bold text-slate-400">Minimum / payment</span><input type="number" value={manual.minimum_payment} onChange={(e) => setManual({ ...manual, minimum_payment: e.target.value })} className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm" /></label><label><span className="text-xs font-bold text-slate-400">Next payment date</span><input type="date" value={manual.due_date} onChange={(e) => setManual({ ...manual, due_date: e.target.value })} className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm" /></label><label><span className="text-xs font-bold text-slate-400">APR %</span><input type="number" step="0.01" value={manual.apr} onChange={(e) => setManual({ ...manual, apr: e.target.value })} className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm" /></label><label><span className="text-xs font-bold text-slate-400">Payoff target</span><input type="date" value={manual.payoff_target_date} onChange={(e) => setManual({ ...manual, payoff_target_date: e.target.value })} className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm" /></label></> : null}{manual.type === "GOAL" ? <><label><span className="text-xs font-bold text-slate-400">Current saved</span><input type="number" value={manual.balance} onChange={(e) => setManual({ ...manual, balance: e.target.value })} className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm" /></label><label><span className="text-xs font-bold text-slate-400">Target amount</span><input type="number" value={manual.target_amount} onChange={(e) => setManual({ ...manual, target_amount: e.target.value })} className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm" /></label><label className="sm:col-span-2"><span className="text-xs font-bold text-slate-400">Target date</span><input type="date" value={manual.target_date} onChange={(e) => setManual({ ...manual, target_date: e.target.value })} className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm" /></label></> : null}</div><button type="button" disabled={savingManual} onClick={saveManual} className="mt-5 min-h-12 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-sm font-black disabled:opacity-50">{savingManual ? "Saving…" : "Save to Finance"}</button></div></div> : null}
    </div>
  );
}
