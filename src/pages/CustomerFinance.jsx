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
  Wallet,
  X,
} from "lucide-react";

import api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import ModeBar from "../components/ModeBar";

const STRIPE_FINANCE_CHECKOUT_URL = "https://buy.stripe.com/6oU00jgX07eT3qFgJl2Nq0c";
const FINANCE_LOGO_URL = "/brands/finance.jpg";
const FINANCE_API = "/personal-finance";

const EMPTY_MANUAL = {
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

function money(value) {
  return Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function dateLabel(value) {
  if (!value) return "Not set";
  const date = new Date(`${value}T00:00:00`);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : String(value);
}

function listFrom(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function MetricCard({ label, value, detail, tone = "cyan" }) {
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
      <div className="mt-1 text-xs leading-5 text-slate-400">{detail}</div>
    </div>
  );
}

function Panel({ title, subtitle, right, children }) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-black text-white">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs leading-5 text-slate-400">{subtitle}</p> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyState({ children }) {
  return <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm leading-6 text-slate-500">{children}</div>;
}

function Progress({ value, danger = false }) {
  const width = Math.max(0, Math.min(100, Number(value || 0)));
  return <div className="h-2 overflow-hidden rounded-full bg-white/[.05]"><div className={`h-full rounded-full ${danger ? "bg-rose-400" : "bg-emerald-400"}`} style={{ width: `${width}%` }} /></div>;
}

function FinanceSignupScreen({ onBack }) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-slate-950/70 p-5 sm:p-7">
      <div className="relative grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="flex items-center gap-3">
            <img src={FINANCE_LOGO_URL} alt="SyncWorks Finance" className="h-16 w-16 rounded-2xl border border-cyan-400/20 object-cover" />
            <div><div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">SyncWorks Finance</div><h1 className="mt-1 text-3xl font-black text-white sm:text-5xl">Your financial command center.</h1></div>
          </div>
          <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">Connect supported institutions, add anything that cannot connect, and let SYNC turn the complete picture into bills, budgets, safe-to-spend, payoff priorities and next actions.</p>
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

const inputClass = "mt-1 h-11 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-cyan-400/40";
function Field({ label, wide = false, children }) {
  return <label className={wide ? "sm:col-span-2" : ""}><span className="text-xs font-bold text-slate-400">{label}</span>{children}</label>;
}

export default function CustomerFinance() {
  const nav = useNavigate();
  const { moduleAccess, isGod } = useAuth();
  const hasFinanceAccess = Boolean(isGod || moduleAccess?.finance || moduleAccess?.money || moduleAccess?.customer_finance || moduleAccess?.customerFinance);
  const [dashboard, setDashboard] = useState(null);
  const [intelligence, setIntelligence] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState(EMPTY_MANUAL);
  const [savingManual, setSavingManual] = useState(false);

  const loadFinance = async () => {
    setLoading(true);
    setError("");
    try {
      const [summaryResult, txResult, intelligenceResult] = await Promise.allSettled([
        api.get(`${FINANCE_API}/dashboard/`),
        api.get(`${FINANCE_API}/transactions/`),
        api.get(`${FINANCE_API}/automation/`),
      ]);
      if (summaryResult.status !== "fulfilled") throw summaryResult.reason;
      setDashboard(summaryResult.value?.data || {});
      setTransactions(txResult.status === "fulfilled" ? listFrom(txResult.value?.data).slice(0, 10) : []);
      setIntelligence(intelligenceResult.status === "fulfilled" ? intelligenceResult.value?.data || {} : null);
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
            await api.post(`${FINANCE_API}/connections/plaid/exchange/`, { public_token: publicToken, institution: metadata?.institution || {} });
            await loadFinance();
          } catch (err) {
            setError(err?.response?.data?.detail || "The institution connected, but SyncWorks could not finish importing it.");
          } finally { setSyncing(false); }
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
    setSyncing(true);
    setError("");
    try {
      await api.post(`${FINANCE_API}/automation/refresh/`, {});
      await loadFinance();
    } catch (err) {
      setError(err?.response?.data?.detail || "Finance refresh needs attention.");
    } finally { setSyncing(false); }
  };

  const saveManual = async () => {
    if (!manual.name.trim()) return setError("Give this financial item a name first.");
    setSavingManual(true);
    setError("");
    try {
      if (manual.type === "ACCOUNT") {
        await api.post(`${FINANCE_API}/accounts/`, { name: manual.name, kind: manual.account_kind, current_balance: manual.balance || null, credit_limit: manual.credit_limit || null, is_manual: true });
      } else if (manual.type === "DEBT") {
        await api.post(`${FINANCE_API}/liabilities/`, { name: manual.name, kind: manual.account_kind, outstanding_balance: manual.balance || null, minimum_payment: manual.minimum_payment || null, next_payment_amount: manual.minimum_payment || null, next_payment_date: manual.due_date || null, apr: manual.apr || null, payoff_target_date: manual.payoff_target_date || null, is_manual: true });
      } else if (manual.type === "GOAL") {
        await api.post(`${FINANCE_API}/goals/`, { name: manual.name, kind: "SAVINGS", target_amount: manual.target_amount || null, current_amount: manual.balance || 0, target_date: manual.target_date || null, active: true });
      } else if (manual.type === "BUDGET") {
        await api.post(`${FINANCE_API}/budgets/`, { name: manual.name, category: manual.category, monthly_limit: manual.amount || 0, active: true });
      } else {
        await api.post(`${FINANCE_API}/obligations/`, { name: manual.name, category: manual.category, expected_amount: manual.amount || null, next_due_date: manual.due_date || null, recurring: true, cadence: "MONTHLY", active: true, is_manual: true });
      }
      setManual(EMPTY_MANUAL);
      setManualOpen(false);
      await loadFinance();
    } catch (err) {
      setError(err?.response?.data?.detail || "SyncWorks could not save that financial item.");
    } finally { setSavingManual(false); }
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
  const summary = intelligence?.summary || {};
  const budgets = intelligence?.budgets || [];
  const avalanche = intelligence?.debt_strategy?.avalanche || [];
  const actions = intelligence?.actions || [];
  const alerts = intelligence?.alerts || [];
  const safeToSpend = intelligence ? Number(summary.safe_to_spend_now || 0) : Math.max(0, Number(net.cash || 0) - Number(upcoming.total_due || 0));

  const upcomingItems = useMemo(() => {
    const bills = (upcoming.obligations || []).map((item) => ({ id: `bill-${item.id}`, name: item.name, amount: item.expected_amount, date: item.next_due_date, type: item.category }));
    const debt = (upcoming.liabilities || []).map((item) => ({ id: `debt-${item.id}`, name: item.name, amount: item.next_payment_amount || item.minimum_payment, date: item.next_payment_date, type: item.kind }));
    return [...bills, ...debt].sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  }, [upcoming.obligations, upcoming.liabilities]);

  if (!hasFinanceAccess) return <div className="min-h-screen bg-[#030712] text-white"><ModeBar /><main className="mx-auto max-w-7xl px-3 pb-24 pt-5 sm:px-5"><FinanceSignupScreen onBack={() => nav("/customer/dashboard")} /></main></div>;

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <ModeBar />
      <main className="mx-auto w-full max-w-7xl space-y-4 px-3 pb-28 pt-4 sm:px-5 lg:px-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_85%_15%,rgba(34,211,238,.13),transparent_28%),radial-gradient(circle_at_65%_80%,rgba(139,92,246,.12),transparent_32%),linear-gradient(145deg,#07111f,#020617)] p-5 sm:p-7">
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <button type="button" onClick={() => nav("/customer/dashboard")} className="mb-4 inline-flex items-center gap-2 text-xs font-black text-slate-400"><ArrowLeft className="h-4 w-4" /> Personal</button>
              <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10"><Landmark className="h-6 w-6 text-cyan-200" /></div><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Personal Finance</div><h1 className="text-2xl font-black sm:text-4xl">Financial Command Center</h1></div></div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">One financial picture. SYNC keeps the data together, protects known obligations, watches budgets and tells you what deserves attention next.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={connectBank} disabled={syncing} className="min-h-11 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 text-sm font-black disabled:opacity-50"><Building2 className="mr-2 inline h-4 w-4" />Connect institution</button>
              <button type="button" onClick={() => setManualOpen(true)} className="min-h-11 rounded-2xl border border-white/10 bg-white/[.04] px-4 text-sm font-black"><Plus className="mr-2 inline h-4 w-4" />Add manually</button>
              <button type="button" onClick={syncAll} disabled={syncing || loading} className="min-h-11 rounded-2xl border border-white/10 bg-white/[.04] px-4 text-sm font-black text-slate-300"><RefreshCw className={`mr-2 inline h-4 w-4 ${syncing ? "animate-spin" : ""}`} />Refresh + analyze</button>
            </div>
          </div>
        </section>

        {error ? <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/[.08] p-4 text-sm text-amber-100"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div> : null}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <MetricCard label="Safe to spend" value={money(safeToSpend)} detail="Cash after known 30-day obligations" tone={safeToSpend > 0 ? "emerald" : "rose"} />
          <MetricCard label="Available cash" value={money(net.cash)} detail={`${accounts.filter((a) => ["CHECKING", "SAVINGS"].includes(a.kind)).length} cash accounts`} />
          <MetricCard label="Due next 30 days" value={money(upcoming.total_due)} detail="Bills + debt payments" tone="amber" />
          <MetricCard label="Total debt" value={money(net.debt)} detail={`${liabilities.length} tracked liabilities`} tone="rose" />
          <MetricCard label="Month cash flow" value={money(month.cash_flow)} detail={`${money(month.income)} in • ${money(month.spending)} out`} tone={Number(month.cash_flow || 0) >= 0 ? "emerald" : "rose"} />
        </div>

        <Panel title="SYNC financial decision briefing" subtitle="Facts first, then the next best actions." right={<Bot className="h-5 w-5 text-violet-200" />}>
          {alerts.length ? <div className="grid gap-2 sm:grid-cols-2">{alerts.map((item) => <div key={item.code} className="rounded-2xl border border-amber-400/15 bg-amber-500/[.05] p-3 text-sm text-slate-300"><div className="text-[10px] font-black uppercase tracking-wider text-amber-200">{item.severity}</div><div className="mt-1">{item.message}</div></div>)}</div> : <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-500/[.05] p-4 text-sm text-emerald-100"><ShieldCheck className="h-5 w-5" />No major finance alerts are visible from current data.</div>}
          {actions.length ? <div className="mt-3 space-y-2">{actions.map((item) => <div key={item.code} className="rounded-2xl border border-violet-400/15 bg-violet-500/[.05] p-3"><div className="text-sm font-black text-white">{item.priority}. {item.title}</div><div className="mt-1 text-xs leading-5 text-slate-400">{item.detail}</div></div>)}</div> : null}
          <button type="button" onClick={() => nav("/sync")} className="mt-3 min-h-10 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 text-xs font-black text-violet-100"><Sparkles className="mr-2 inline h-4 w-4" />Ask SYNC about my finances</button>
        </Panel>

        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Budgets" subtitle="Monthly category guardrails compared with actual connected spending." right={<Target className="h-5 w-5 text-emerald-200" />}>
            {budgets.length ? <div className="space-y-3">{budgets.map((budget) => <div key={budget.id} className="rounded-2xl border border-white/10 p-3"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-black text-white">{budget.name}</div><div className="mt-1 text-[11px] text-slate-500">{budget.category}</div></div><div className="text-right"><div className={budget.over_budget ? "font-black text-rose-200" : "font-black text-emerald-100"}>{money(budget.remaining)} left</div><div className="text-[10px] text-slate-500">{money(budget.spent)} of {money(budget.monthly_limit)}</div></div></div><div className="mt-3"><Progress value={budget.percent_used} danger={budget.over_budget} /></div></div>)}</div> : <EmptyState>Add a budget to give SYNC a monthly spending guardrail. Your connected transactions will update it automatically.</EmptyState>}
          </Panel>

          <Panel title="Debt payoff strategy" subtitle="Default: avalanche to reduce interest. Snowball remains available through SYNC." right={<TrendingDown className="h-5 w-5 text-cyan-200" />}>
            {avalanche.length ? <div className="space-y-2">{avalanche.slice(0, 6).map((item) => <div key={item.id} className={`rounded-2xl border p-3 ${item.rank === 1 ? "border-cyan-400/25 bg-cyan-500/[.06]" : "border-white/10"}`}><div className="flex items-center justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-wider text-cyan-200">#{item.rank}{item.rank === 1 ? " • pay extra here" : ""}</div><div className="mt-1 text-sm font-black text-white">{item.name}</div></div><div className="text-right"><div className="font-black text-rose-100">{money(item.balance)}</div><div className="text-[10px] text-slate-500">{item.apr != null ? `${item.apr}% APR` : "APR not entered"}</div></div></div></div>)}</div> : <EmptyState>Add debts with balances and APRs so SYNC can build avalanche and snowball payoff orders.</EmptyState>}
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
          <Panel title="Accounts" subtitle="Connected and manually tracked cash, cards and other accounts." right={<span className="text-xs font-black text-slate-400">{accounts.length} total</span>}>
            {accounts.length ? <div className="space-y-2">{accounts.map((account) => <div key={account.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 p-3"><div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-white/[.04]">{account.kind === "CREDIT_CARD" ? <CreditCard className="h-5 w-5 text-amber-200" /> : <Banknote className="h-5 w-5 text-cyan-200" />}</div><div><div className="text-sm font-black text-white">{account.name}</div><div className="text-[11px] text-slate-500">{String(account.kind || "OTHER").replaceAll("_", " ")}{account.is_manual ? " • manual" : " • connected"}</div></div></div><div className="font-black text-white">{money(account.current_balance)}</div></div>)}</div> : <EmptyState>No financial accounts yet.</EmptyState>}
          </Panel>
          <Panel title="Credit & debt" subtitle="Balances, minimums, APR and payoff targets." right={credit.utilization_percent != null ? <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black text-slate-300">{credit.utilization_percent}% utilization</span> : null}>
            {liabilities.length ? <div className="space-y-2">{liabilities.slice(0, 8).map((item) => <div key={item.id} className="rounded-2xl border border-white/10 p-3"><div className="flex justify-between gap-3"><div><div className="text-sm font-black text-white">{item.name}</div><div className="text-[11px] text-slate-500">{String(item.kind || "OTHER").replaceAll("_", " ")}{item.apr ? ` • ${item.apr}% APR` : ""}</div></div><div className="text-right"><div className="font-black text-rose-100">{money(item.outstanding_balance)}</div><div className="text-[10px] text-slate-500">min {money(item.minimum_payment)}</div></div></div></div>)}</div> : <EmptyState>No debt tracked yet.</EmptyState>}
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Upcoming obligations" subtitle="Bills, utilities, housing and debt payments due in the next 30 days." right={<CalendarClock className="h-5 w-5 text-amber-200" />}>
            {upcomingItems.length ? <div className="space-y-2">{upcomingItems.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 p-3"><div><div className="text-sm font-black text-white">{item.name}</div><div className="mt-1 text-[11px] text-slate-500">{String(item.type || "OTHER").replaceAll("_", " ")} • {dateLabel(item.date)}</div></div><div className="font-black text-amber-100">{money(item.amount)}</div></div>)}</div> : <EmptyState>No known obligations are due in the next 30 days.</EmptyState>}
          </Panel>
          <Panel title="Spending habits" subtitle="Top recorded spending categories for the current month." right={<TrendingDown className="h-5 w-5 text-cyan-200" />}>
            {spending.length ? <div className="space-y-2">{spending.slice(0, 8).map((item) => <div key={item.category_primary || "Other"} className="flex justify-between gap-3 rounded-xl border border-white/5 p-3 text-sm"><span className="text-slate-300">{item.category_primary || "Other"}</span><span className="font-black text-white">{money(item.total)}</span></div>)}</div> : <EmptyState>Spending patterns appear as transactions are connected or imported.</EmptyState>}
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Goals" subtitle="Savings targets and payoff milestones." right={<Target className="h-5 w-5 text-emerald-200" />}>
            {goals.length ? <div className="space-y-2">{goals.map((goal) => <div key={goal.id} className="rounded-2xl border border-white/10 p-3"><div className="flex justify-between gap-3"><div><div className="text-sm font-black text-white">{goal.name}</div><div className="text-[11px] text-slate-500">{goal.target_date ? `Target ${dateLabel(goal.target_date)}` : String(goal.kind || "GOAL").replaceAll("_", " ")}</div></div><div className="text-right"><div className="font-black text-emerald-100">{money(goal.current_amount)}</div><div className="text-[10px] text-slate-500">of {money(goal.target_amount)}</div></div></div></div>)}</div> : <EmptyState>Add an emergency fund, savings goal or payoff target.</EmptyState>}
          </Panel>
          <Panel title="Recent activity" subtitle="Latest imported financial transactions." right={Number(month.cash_flow || 0) >= 0 ? <TrendingUp className="h-5 w-5 text-emerald-200" /> : <TrendingDown className="h-5 w-5 text-rose-200" />}>
            {transactions.length ? <div className="space-y-2">{transactions.map((tx) => <div key={tx.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 p-3"><div className="min-w-0"><div className="truncate text-sm font-black text-white">{tx.merchant_name || tx.description || "Transaction"}</div><div className="mt-1 text-[11px] text-slate-500">{dateLabel(tx.date)} • {tx.category_primary || "Uncategorized"}</div></div><div className={`font-black ${tx.is_income ? "text-emerald-200" : "text-white"}`}>{tx.is_income ? "+" : "-"}{money(Math.abs(Number(tx.amount || 0)))}</div></div>)}</div> : <EmptyState>Connect a bank or card to begin building transaction history.</EmptyState>}
          </Panel>
        </div>

        <Panel title="Connections & automation" subtitle="Connected data + manual records feed the same financial intelligence layer." right={<Wallet className="h-5 w-5 text-cyan-200" />}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><MetricCard label="Institutions" value={connections.length} detail="Bank/card connections" /><MetricCard label="Budgets" value={budgets.length} detail="Active monthly guardrails" tone="violet" /><MetricCard label="Budget headroom" value={money(summary.budget_headroom_remaining)} detail="Remaining across active budgets" tone="emerald" /><MetricCard label="Automation" value="SYNC" detail="Refresh → infer → analyze → act" tone="emerald" /></div>
        </Panel>
      </main>

      {manualOpen ? <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 sm:items-center sm:p-4"><div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] border border-white/10 bg-[#07111f] p-5 sm:rounded-[2rem]"><div className="flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Manual financial record</div><h2 className="mt-1 text-xl font-black">Add what cannot connect</h2></div><button type="button" onClick={() => setManualOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10"><X className="h-5 w-5" /></button></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Field label="Type" wide><select value={manual.type} onChange={(e) => setManual({ ...manual, type: e.target.value })} className={inputClass}><option value="BILL">Bill / utility</option><option value="BUDGET">Monthly budget</option><option value="ACCOUNT">Bank / card account</option><option value="DEBT">Debt / mortgage / loan</option><option value="GOAL">Savings goal</option></select></Field>
          <Field label="Name" wide><input value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} placeholder="Dining, Mortgage, Visa…" className={inputClass} /></Field>
          {manual.type === "BILL" || manual.type === "BUDGET" ? <><Field label={manual.type === "BUDGET" ? "Monthly limit" : "Expected payment"}><input type="number" value={manual.amount} onChange={(e) => setManual({ ...manual, amount: e.target.value })} className={inputClass} /></Field>{manual.type === "BILL" ? <Field label="Next due date"><input type="date" value={manual.due_date} onChange={(e) => setManual({ ...manual, due_date: e.target.value })} className={inputClass} /></Field> : null}<Field label="Category" wide><input value={manual.category} onChange={(e) => setManual({ ...manual, category: e.target.value.toUpperCase().replaceAll(" ", "_") })} placeholder={manual.type === "BUDGET" ? "FOOD_AND_DRINK" : "HOUSING"} className={inputClass} /></Field></> : null}
          {manual.type === "ACCOUNT" ? <><Field label="Account type"><select value={manual.account_kind} onChange={(e) => setManual({ ...manual, account_kind: e.target.value })} className={inputClass}>{["CHECKING", "SAVINGS", "CREDIT_CARD", "INVESTMENT", "OTHER"].map((v) => <option key={v}>{v}</option>)}</select></Field><Field label="Current balance"><input type="number" value={manual.balance} onChange={(e) => setManual({ ...manual, balance: e.target.value })} className={inputClass} /></Field>{manual.account_kind === "CREDIT_CARD" ? <Field label="Credit limit" wide><input type="number" value={manual.credit_limit} onChange={(e) => setManual({ ...manual, credit_limit: e.target.value })} className={inputClass} /></Field> : null}</> : null}
          {manual.type === "DEBT" ? <><Field label="Debt type"><select value={manual.account_kind} onChange={(e) => setManual({ ...manual, account_kind: e.target.value })} className={inputClass}>{["MORTGAGE", "CREDIT_CARD", "AUTO_LOAN", "STUDENT_LOAN", "PERSONAL_LOAN", "OTHER"].map((v) => <option key={v}>{v}</option>)}</select></Field><Field label="Outstanding balance"><input type="number" value={manual.balance} onChange={(e) => setManual({ ...manual, balance: e.target.value })} className={inputClass} /></Field><Field label="Minimum payment"><input type="number" value={manual.minimum_payment} onChange={(e) => setManual({ ...manual, minimum_payment: e.target.value })} className={inputClass} /></Field><Field label="Next payment"><input type="date" value={manual.due_date} onChange={(e) => setManual({ ...manual, due_date: e.target.value })} className={inputClass} /></Field><Field label="APR %"><input type="number" step="0.01" value={manual.apr} onChange={(e) => setManual({ ...manual, apr: e.target.value })} className={inputClass} /></Field><Field label="Payoff target"><input type="date" value={manual.payoff_target_date} onChange={(e) => setManual({ ...manual, payoff_target_date: e.target.value })} className={inputClass} /></Field></> : null}
          {manual.type === "GOAL" ? <><Field label="Current saved"><input type="number" value={manual.balance} onChange={(e) => setManual({ ...manual, balance: e.target.value })} className={inputClass} /></Field><Field label="Target amount"><input type="number" value={manual.target_amount} onChange={(e) => setManual({ ...manual, target_amount: e.target.value })} className={inputClass} /></Field><Field label="Target date" wide><input type="date" value={manual.target_date} onChange={(e) => setManual({ ...manual, target_date: e.target.value })} className={inputClass} /></Field></> : null}
        </div><button type="button" disabled={savingManual} onClick={saveManual} className="mt-5 min-h-12 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-sm font-black disabled:opacity-50">{savingManual ? "Saving…" : "Save to Finance"}</button></div></div> : null}
    </div>
  );
}
