// src/pages/CustomerFinance.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Building2,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Landmark,
  Link2,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";

import api from "../api/client";
import { getSyncAiErrorMessage, sendSyncAiMessage } from "../api/syncAi";
import { useAuth } from "../auth/AuthContext";
import ModeBar from "../components/ModeBar";

const STRIPE_FINANCE_CHECKOUT_URL = "https://buy.stripe.com/6oU00jgX07eT3qFgJl2Nq0c";
const FINANCE_LOGO_URL = "/brands/finance.jpg";
const FINANCE_API = "/personal-finance";

const BILL_CATEGORIES = [
  ["HOUSING", "Housing / rent"],
  ["MORTGAGE", "Mortgage"],
  ["UTILITIES", "Utilities"],
  ["PHONE", "Phone"],
  ["INTERNET", "Internet"],
  ["INSURANCE", "Insurance"],
  ["VEHICLE", "Vehicle"],
  ["TRANSPORTATION", "Transportation"],
  ["GROCERIES", "Groceries"],
  ["SUBSCRIPTIONS", "Subscriptions"],
  ["CHILDCARE", "Childcare"],
  ["HEALTH", "Health"],
  ["TAX", "Tax"],
  ["OTHER", "Other"],
];

const INCOME_KINDS = [
  ["PAYCHECK", "Paycheck"],
  ["BUSINESS", "Business income"],
  ["RENTAL", "Rental income"],
  ["BENEFIT", "Benefit"],
  ["INVESTMENT", "Investment income"],
  ["OTHER", "Other income"],
];

const CADENCES = [
  ["WEEKLY", "Weekly"],
  ["BIWEEKLY", "Every 2 weeks"],
  ["SEMIMONTHLY", "Twice monthly"],
  ["MONTHLY", "Monthly"],
  ["QUARTERLY", "Quarterly"],
  ["ANNUAL", "Annual"],
  ["OTHER", "Other"],
];

const EMPTY_MANUAL = {
  type: "BILL",
  name: "",
  amount: "",
  category: "HOUSING",
  due_date: "",
  cadence: "MONTHLY",
  income_kind: "PAYCHECK",
  balance: "",
  minimum_payment: "",
  apr: "",
  payoff_target_date: "",
  promo_apr: "",
  promo_apr_end_date: "",
  account_status: "OPEN",
  paid_this_cycle: false,
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

function MiniStat({ label, value, detail, tone = "cyan" }) {
  const tones = {
    cyan: "border-cyan-400/20 bg-cyan-500/[.05]",
    emerald: "border-emerald-400/20 bg-emerald-500/[.05]",
    amber: "border-amber-400/20 bg-amber-500/[.05]",
    rose: "border-rose-400/20 bg-rose-500/[.05]",
    violet: "border-violet-400/20 bg-violet-500/[.05]",
  };
  return (
    <div className={`rounded-xl border p-3 ${tones[tone] || tones.cyan}`}>
      <div className="text-[9px] font-black uppercase tracking-[.14em] text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-black leading-tight text-white">{value}</div>
      {detail ? <div className="mt-1 text-[10px] leading-4 text-slate-400">{detail}</div> : null}
    </div>
  );
}

function Section({ title, subtitle, right, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/55 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-black text-white sm:text-base">{title}</h2>
          {subtitle ? <p className="mt-1 text-[11px] leading-4 text-slate-500">{subtitle}</p> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function EmptyState({ children }) {
  return <div className="rounded-xl border border-dashed border-white/10 p-3 text-xs leading-5 text-slate-500">{children}</div>;
}

function FinanceSignupScreen({ onBack }) {
  return (
    <section className="rounded-2xl border border-cyan-400/20 bg-slate-950/70 p-5">
      <div className="flex items-center gap-3">
        <img src={FINANCE_LOGO_URL} alt="SyncWorks Finance" className="h-14 w-14 rounded-2xl border border-cyan-400/20 object-cover" />
        <div><div className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-200">SyncWorks Finance</div><h1 className="mt-1 text-2xl font-black">Your financial command center.</h1></div>
      </div>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">Track income, bills, debt, savings and household finances in one place. Add records manually now and connect institutions when automatic bank sync is available.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <a href={STRIPE_FINANCE_CHECKOUT_URL} target="_blank" rel="noreferrer" className="flex min-h-11 items-center rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 text-xs font-black">Start 30-day free trial · $2.99/mo</a>
        <button type="button" onClick={onBack} className="min-h-11 rounded-xl border border-white/10 px-4 text-xs font-black">Back</button>
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

const inputClass = "mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-cyan-400/40";
function Field({ label, wide = false, children }) {
  return <label className={wide ? "sm:col-span-2" : ""}><span className="text-[11px] font-bold text-slate-400">{label}</span>{children}</label>;
}

export default function CustomerFinance() {
  const nav = useNavigate();
  const { moduleAccess, isGod } = useAuth();
  const hasFinanceAccess = Boolean(isGod || moduleAccess?.finance || moduleAccess?.money || moduleAccess?.customer_finance || moduleAccess?.customerFinance);

  const [tab, setTab] = useState("overview");
  const [dashboard, setDashboard] = useState(null);
  const [intelligence, setIntelligence] = useState(null);
  const [householdFinance, setHouseholdFinance] = useState(null);
  const [extraMonthly, setExtraMonthly] = useState("0");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState(EMPTY_MANUAL);
  const [savingManual, setSavingManual] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkImporting, setBulkImporting] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [plaidStatus, setPlaidStatus] = useState(null);
  const [editLiability, setEditLiability] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [editRecordForm, setEditRecordForm] = useState({});
  const [linkerOpen, setLinkerOpen] = useState(false);
  const [matchData, setMatchData] = useState({ manual: [], connected: [] });
  const [linkManualId, setLinkManualId] = useState("");
  const [linkConnectedId, setLinkConnectedId] = useState("");
  const [linkingAccount, setLinkingAccount] = useState(false);

  const loadFinance = async (extraOverride = null) => {
    setLoading(true);
    setError("");
    const extra = Math.max(0, Number(extraOverride ?? extraMonthly) || 0);
    try {
      const [summaryResult, txResult, intelligenceResult, householdResult, plaidResult] = await Promise.allSettled([
        api.get(`${FINANCE_API}/dashboard/`),
        api.get(`${FINANCE_API}/transactions/`),
        api.get(`${FINANCE_API}/automation/`, { params: { extra_monthly: extra } }),
        api.get("/household/households/"),
        api.get(`${FINANCE_API}/connections/plaid/status/`),
      ]);
      if (summaryResult.status !== "fulfilled") throw summaryResult.reason;
      setDashboard(summaryResult.value?.data || {});
      setTransactions(txResult.status === "fulfilled" ? listFrom(txResult.value?.data).slice(0, 10) : []);
      setIntelligence(intelligenceResult.status === "fulfilled" ? intelligenceResult.value?.data || {} : null);
      setPlaidStatus(plaidResult.status === "fulfilled" ? plaidResult.value?.data || null : null);

      const households = householdResult.status === "fulfilled" ? listFrom(householdResult.value?.data) : [];
      if (households[0]?.id) {
        try {
          const response = await api.get(`/household/households/${households[0].id}/finance/`, { params: { extra_monthly: extra } });
          setHouseholdFinance(response?.data || null);
        } catch {
          setHouseholdFinance(null);
        }
      } else {
        setHouseholdFinance(null);
      }
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Finance could not load yet.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (hasFinanceAccess) loadFinance(); }, [hasFinanceAccess]);

  const openManual = (type, defaults = {}) => {
    setManual({ ...EMPTY_MANUAL, type, ...defaults });
    setManualOpen(true);
  };

  const connectBank = async () => {
    setError("");
    if (plaidStatus?.configured === false) {
      setError("Automatic bank sync is not available yet. Your manual Finance records, household sharing, cash-flow plan and debt plan still work normally.");
      return;
    }
    setSyncing(true);
    try {
      await loadPlaidScript();
      const tokenResponse = await api.post(`${FINANCE_API}/connections/plaid/link-token/`, {});
      const token = tokenResponse?.data?.link_token;
      if (!token || !window.Plaid) throw new Error("Automatic bank sync is unavailable right now.");
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
      setError(err?.response?.data?.detail || err?.message || "Automatic bank sync is unavailable right now.");
      setSyncing(false);
    }
  };

  const syncAll = async () => {
    setSyncing(true);
    setError("");
    try {
      await api.post(`${FINANCE_API}/automation/refresh/`, { extra_monthly: Math.max(0, Number(extraMonthly) || 0) });
      await loadFinance();
    } catch (err) {
      setError(err?.response?.data?.detail || "Finance refresh needs attention.");
    } finally { setSyncing(false); }
  };

  const sendFinanceChat = async (raw = chatInput) => {
    const question = String(raw || "").trim();
    if (!question || chatSending) return;
    setChatSending(true);
    setError("");
    setChatOpen(true);
    setChatMessages((current) => [...current, { role: "user", text: question, id: `u-${Date.now()}` }].slice(-10));
    setChatInput("");
    try {
      const result = await sendSyncAiMessage({
        workspace: "personal",
        message: `Answer from the user's current SyncWorks Finance records. Focus on current cash, planned inflow/outflow, Debt Plan 1, minimums, bills, budgets, promo deadlines and household data that has been explicitly shared. State when data is missing. User question: ${question}`,
      });
      setChatMessages((current) => [...current, { role: "assistant", text: result?.message || "SYNC returned no text.", id: `a-${Date.now()}` }].slice(-10));
    } catch (err) {
      setChatMessages((current) => [...current, { role: "assistant", text: getSyncAiErrorMessage(err), id: `e-${Date.now()}` }].slice(-10));
    } finally { setChatSending(false); }
  };

  const importDebtList = async () => {
    if (!bulkText.trim()) return setError("Paste a debt import package first.");
    setBulkImporting(true);
    setError("");
    try {
      const parsed = JSON.parse(bulkText);
      const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.debts) ? parsed.debts : [];
      if (!rows.length) throw new Error("The import package must contain a debts array.");
      if (rows.length > 50) throw new Error("Import 50 debts or fewer at a time.");
      for (const row of rows) {
        const name = String(row?.name || "").trim();
        if (!name) throw new Error("Every debt needs a name.");
        const owner = String(row?.owner || "self").trim().toLowerCase();
        if (!["", "self", "me", "mine"].includes(owner)) throw new Error(`${name} belongs to another profile. Import it while signed into that person's SyncWorks account.`);
        const kind = String(row?.kind || "CREDIT_CARD").trim().toUpperCase();
        if (kind === "CREDIT_CARD") {
          await api.post(`${FINANCE_API}/automation/manual-card/`, {
            name,
            balance: row.balance ?? 0,
            credit_limit: row.credit_limit ?? null,
            minimum_payment: row.minimum_payment ?? null,
            next_payment_date: row.next_payment_date || row.due_date || null,
            apr: row.apr ?? null,
            promo_apr: row.promo_apr ?? null,
            promo_apr_end_date: row.promo_apr_end_date || null,
            account_status: String(row.account_status || "OPEN").toUpperCase(),
            paid_this_cycle: row.paid_this_cycle === true,
          });
        } else {
          await api.post(`${FINANCE_API}/liabilities/`, {
            name,
            kind,
            outstanding_balance: row.balance ?? null,
            minimum_payment: row.minimum_payment ?? null,
            next_payment_amount: row.minimum_payment ?? null,
            next_payment_date: row.next_payment_date || row.due_date || null,
            apr: row.apr ?? null,
            payoff_target_date: row.payoff_target_date || null,
            is_manual: true,
            metadata: { source: "bulk_finance_import", account_status: String(row.account_status || "OPEN").toUpperCase(), paid_this_cycle: row.paid_this_cycle === true },
          });
        }
      }
      setBulkOpen(false);
      setBulkText("");
      await loadFinance();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "SyncWorks could not import that debt list.");
    } finally { setBulkImporting(false); }
  };

  const accounts = dashboard?.accounts || [];
  const liabilities = dashboard?.liabilities || [];
  const obligations = dashboard?.obligations || [];
  const incomeSources = dashboard?.income_sources || [];
  const net = dashboard?.net_position || {};
  const month = dashboard?.this_month || {};
  const planned = dashboard?.planned_month || {};
  const credit = dashboard?.credit || {};
  const upcoming = dashboard?.next_30_days || {};
  const goals = dashboard?.goals || [];
  const budgets = intelligence?.budgets || [];
  const personalPlan = intelligence?.plan_1 || {};
  const householdPlan = householdFinance?.plan_1 || {};
  const householdSummary = householdFinance?.summary || {};
  const alerts = intelligence?.alerts || [];
  const safeToSpend = intelligence ? Number(intelligence?.summary?.safe_to_spend_now || 0) : Math.max(0, Number(net.cash || 0) - Number(upcoming.total_due || 0));

  const upcomingItems = useMemo(() => {
    const bills = (upcoming.obligations || []).map((item) => ({ id: `bill-${item.id}`, name: item.name, amount: item.expected_amount, date: item.next_due_date, type: item.category }));
    const debt = (upcoming.liabilities || []).map((item) => ({ id: `debt-${item.id}`, name: item.name, amount: item.next_payment_amount || item.minimum_payment, date: item.next_payment_date, type: item.kind }));
    return [...bills, ...debt].sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  }, [upcoming.obligations, upcoming.liabilities]);

  const openDebtEdit = (item) => {
    const account = accounts.find((row) => Number(row.id) === Number(item.account));
    setEditLiability(item);
    setEditForm({
      name: item.name || "",
      balance: item.outstanding_balance ?? "",
      minimum_payment: item.minimum_payment ?? item.next_payment_amount ?? "",
      next_payment_date: item.next_payment_date || "",
      apr: item.apr ?? "",
      credit_limit: account?.credit_limit ?? item?.metadata?.credit_limit ?? "",
      account_status: item?.metadata?.account_status || "OPEN",
      promo_apr: item?.metadata?.promo_apr ?? "",
      promo_apr_end_date: item?.metadata?.promo_apr_end_date || "",
      paid_this_cycle: item?.metadata?.paid_this_cycle === true,
    });
  };

  const saveDebtEdit = async () => {
    if (!editLiability) return;
    setSavingEdit(true);
    setError("");
    try {
      const metadata = { ...(editLiability.metadata || {}), account_status: editForm.account_status || "OPEN", paid_this_cycle: !!editForm.paid_this_cycle };
      if (editForm.promo_apr !== "") metadata.promo_apr = String(editForm.promo_apr); else delete metadata.promo_apr;
      if (editForm.promo_apr_end_date) metadata.promo_apr_end_date = editForm.promo_apr_end_date; else delete metadata.promo_apr_end_date;
      if (editForm.credit_limit !== "") metadata.credit_limit = String(editForm.credit_limit);
      await api.patch(`${FINANCE_API}/liabilities/${editLiability.id}/`, {
        name: editForm.name,
        outstanding_balance: editForm.balance === "" ? null : editForm.balance,
        minimum_payment: editForm.minimum_payment === "" ? null : editForm.minimum_payment,
        next_payment_amount: editForm.minimum_payment === "" ? null : editForm.minimum_payment,
        next_payment_date: editForm.next_payment_date || null,
        apr: editForm.apr === "" ? null : editForm.apr,
        metadata,
      });
      if (editLiability.account) {
        const account = accounts.find((row) => Number(row.id) === Number(editLiability.account));
        await api.patch(`${FINANCE_API}/accounts/${editLiability.account}/`, {
          name: editForm.name,
          current_balance: editForm.balance === "" ? null : editForm.balance,
          credit_limit: editForm.credit_limit === "" ? null : editForm.credit_limit,
          metadata: { ...(account?.metadata || {}), ...metadata },
        });
      }
      setEditLiability(null);
      await loadFinance();
    } catch (err) {
      setError(err?.response?.data?.detail || "SyncWorks could not update that debt.");
    } finally { setSavingEdit(false); }
  };

  const openGenericEdit = (type, item) => {
    setEditRecord({ type, item });
    if (type === "INCOME") setEditRecordForm({ name: item.name, amount: item.amount, kind: item.kind, cadence: item.cadence, next_income_date: item.next_income_date || "" });
    else if (type === "BILL") setEditRecordForm({ name: item.name, amount: item.expected_amount ?? "", category: item.category, cadence: item.cadence || "MONTHLY", due_date: item.next_due_date || "" });
    else setEditRecordForm({ name: item.name, balance: item.current_balance ?? "", credit_limit: item.credit_limit ?? "", kind: item.kind });
  };

  const saveGenericEdit = async () => {
    if (!editRecord) return;
    setSavingEdit(true);
    setError("");
    try {
      const { type, item } = editRecord;
      if (type === "INCOME") await api.patch(`${FINANCE_API}/income-sources/${item.id}/`, { name: editRecordForm.name, amount: editRecordForm.amount, kind: editRecordForm.kind, cadence: editRecordForm.cadence, next_income_date: editRecordForm.next_income_date || null });
      else if (type === "BILL") await api.patch(`${FINANCE_API}/obligations/${item.id}/`, { name: editRecordForm.name, expected_amount: editRecordForm.amount || null, category: editRecordForm.category, cadence: editRecordForm.cadence || "MONTHLY", next_due_date: editRecordForm.due_date || null });
      else await api.patch(`${FINANCE_API}/accounts/${item.id}/`, { name: editRecordForm.name, current_balance: editRecordForm.balance === "" ? null : editRecordForm.balance, credit_limit: editRecordForm.credit_limit === "" ? null : editRecordForm.credit_limit, kind: editRecordForm.kind });
      setEditRecord(null);
      await loadFinance();
    } catch (err) {
      setError(err?.response?.data?.detail || "SyncWorks could not update that record.");
    } finally { setSavingEdit(false); }
  };

  const openAccountLinker = async () => {
    setError("");
    try {
      const response = await api.get(`${FINANCE_API}/automation/account-match-candidates/`);
      const data = response?.data || { manual: [], connected: [] };
      setMatchData(data);
      setLinkManualId(data.manual?.[0]?.id ? String(data.manual[0].id) : "");
      setLinkConnectedId(data.connected?.[0]?.id ? String(data.connected[0].id) : "");
      setLinkerOpen(true);
    } catch (err) {
      setError(err?.response?.data?.detail || "SyncWorks could not load account matching.");
    }
  };

  const linkExistingAccount = async () => {
    if (!linkManualId || !linkConnectedId) return;
    setLinkingAccount(true);
    setError("");
    try {
      await api.post(`${FINANCE_API}/automation/link-connected-account/`, { manual_account_id: Number(linkManualId), connected_account_id: Number(linkConnectedId) });
      setLinkerOpen(false);
      await loadFinance();
    } catch (err) {
      setError(err?.response?.data?.detail || "SyncWorks could not link those accounts.");
    } finally { setLinkingAccount(false); }
  };

  const saveManual = async () => {
    if (!manual.name.trim()) return setError("Give this financial item a name first.");
    setSavingManual(true);
    setError("");
    try {
      if (manual.type === "INCOME") {
        await api.post(`${FINANCE_API}/income-sources/`, { name: manual.name, kind: manual.income_kind, amount: manual.amount || 0, cadence: manual.cadence || "MONTHLY", next_income_date: manual.due_date || null, active: true, is_manual: true });
      } else if (manual.type === "ACCOUNT") {
        await api.post(`${FINANCE_API}/accounts/`, { name: manual.name, kind: manual.account_kind, current_balance: manual.balance || null, credit_limit: manual.credit_limit || null, is_manual: true });
      } else if (manual.type === "DEBT") {
        if (manual.account_kind === "CREDIT_CARD") {
          await api.post(`${FINANCE_API}/automation/manual-card/`, { name: manual.name, balance: manual.balance || 0, credit_limit: manual.credit_limit || null, minimum_payment: manual.minimum_payment || null, next_payment_date: manual.due_date || null, apr: manual.apr || null, promo_apr: manual.promo_apr || null, promo_apr_end_date: manual.promo_apr_end_date || null, account_status: manual.account_status || "OPEN", paid_this_cycle: !!manual.paid_this_cycle });
        } else {
          await api.post(`${FINANCE_API}/liabilities/`, { name: manual.name, kind: manual.account_kind, outstanding_balance: manual.balance || null, minimum_payment: manual.minimum_payment || null, next_payment_amount: manual.minimum_payment || null, next_payment_date: manual.due_date || null, apr: manual.apr || null, payoff_target_date: manual.payoff_target_date || null, is_manual: true });
        }
      } else if (manual.type === "GOAL") {
        await api.post(`${FINANCE_API}/goals/`, { name: manual.name, kind: "SAVINGS", target_amount: manual.target_amount || null, current_amount: manual.balance || 0, target_date: manual.target_date || null, active: true });
      } else if (manual.type === "BUDGET") {
        await api.post(`${FINANCE_API}/budgets/`, { name: manual.name, category: manual.category, monthly_limit: manual.amount || 0, active: true });
      } else {
        await api.post(`${FINANCE_API}/obligations/`, { name: manual.name, category: manual.category, expected_amount: manual.amount || null, next_due_date: manual.due_date || null, recurring: true, cadence: manual.cadence || "MONTHLY", active: true, is_manual: true });
      }
      setManual(EMPTY_MANUAL);
      setManualOpen(false);
      await loadFinance();
    } catch (err) {
      setError(err?.response?.data?.detail || "SyncWorks could not save that financial item.");
    } finally { setSavingManual(false); }
  };

  if (!hasFinanceAccess) return <div className="min-h-screen bg-[#030712] text-white"><ModeBar /><main className="mx-auto max-w-5xl px-3 pb-24 pt-4"><FinanceSignupScreen onBack={() => nav("/customer/dashboard")} /></main></div>;

  const tabs = [["overview", "Overview"], ["plan", "Plan"], ["accounts", "Accounts"], ["household", "Household"]];
  const currentTarget = personalPlan?.first_target;

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <ModeBar />
      <main className="mx-auto w-full max-w-6xl space-y-3 px-2.5 pb-28 pt-3 sm:px-4">
        <section className="rounded-2xl border border-cyan-400/20 bg-[radial-gradient(circle_at_90%_10%,rgba(34,211,238,.10),transparent_30%),linear-gradient(145deg,#07111f,#020617)] p-3 sm:p-4">
          <button type="button" onClick={() => nav("/customer/dashboard")} className="inline-flex items-center gap-1.5 text-[11px] font-black text-slate-500"><ArrowLeft className="h-3.5 w-3.5" /> Personal</button>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-cyan-400/20 bg-cyan-500/10"><Landmark className="h-4.5 w-4.5 text-cyan-200" /></div><div className="min-w-0"><div className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-200">Personal Finance</div><h1 className="truncate text-lg font-black sm:text-xl">Financial Command Center</h1></div></div>
            <button type="button" onClick={syncAll} disabled={syncing || loading} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.03] text-slate-300" aria-label="Refresh Finance"><RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} /></button>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1 rounded-xl border border-white/10 bg-black/20 p-1">{tabs.map(([key, label]) => <button key={key} type="button" onClick={() => setTab(key)} className={`rounded-lg px-1.5 py-2 text-[10px] font-black sm:text-xs ${tab === key ? "bg-cyan-500/15 text-cyan-100" : "text-slate-500"}`}>{label}</button>)}</div>
        </section>

        {error ? <div className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-500/[.07] p-3 text-xs leading-5 text-amber-100"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div> : null}

        {tab === "overview" ? <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <MiniStat label="Available cash" value={money(net.cash)} detail={`${accounts.filter((a) => ["CHECKING", "SAVINGS"].includes(a.kind)).length} cash account(s)`} />
            <MiniStat label="Planned inflow" value={money(planned.expected_income)} detail={incomeSources.length ? `${incomeSources.length} income source(s)` : "Add paychecks / rental income"} tone="emerald" />
            <MiniStat label="Planned outflow" value={money(planned.expected_outflow)} detail={`${money(planned.expected_bills)} bills + ${money(planned.known_debt_minimums)} debt`} tone="amber" />
            <MiniStat label="Total debt" value={money(net.debt)} detail={`${liabilities.length} tracked debt(s)`} tone="rose" />
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.15fr_.85fr]">
            <Section title="Monthly cash flow" subtitle="Plan first; connected transactions will replace estimates with actual spending." right={<TrendingUp className="h-4 w-4 text-emerald-300" />}>
              <div className="grid grid-cols-3 gap-2"><MiniStat label="In" value={money(planned.expected_income)} tone="emerald" /><MiniStat label="Out" value={money(planned.expected_outflow)} tone="amber" /><MiniStat label="Left" value={money(planned.expected_cash_flow)} tone={Number(planned.expected_cash_flow || 0) >= 0 ? "emerald" : "rose"} /></div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500"><span>Actual this month: {money(month.income)} in</span><span>{money(month.spending)} out</span><span>Net {money(month.cash_flow)}</span><span>Safe now {money(safeToSpend)}</span></div>
            </Section>

            <Section title="Next move" subtitle="One clear action instead of another full dashboard." right={<Bot className="h-4 w-4 text-violet-300" />}>
              {currentTarget ? <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/[.05] p-3"><div className="text-[9px] font-black uppercase tracking-[.14em] text-cyan-200">Debt Plan 1 target</div><div className="mt-1 flex items-end justify-between gap-3"><div><div className="text-sm font-black">{currentTarget.name}</div><div className="text-[10px] text-slate-500">{currentTarget.apr != null ? `${currentTarget.apr}% APR` : "APR needed"}</div></div><div className="text-right text-lg font-black text-rose-100">{money(currentTarget.balance)}</div></div></div> : <EmptyState>Add a debt to activate Plan 1.</EmptyState>}
              <button type="button" onClick={() => { setTab("plan"); }} className="mt-2 min-h-9 w-full rounded-lg border border-white/10 text-[11px] font-black text-slate-300">Open plan</button>
            </Section>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Section title="Upcoming" subtitle="Known bills and debt payments due in the next 30 days." right={<CalendarClock className="h-4 w-4 text-amber-300" />}>
              {upcomingItems.length ? <div className="space-y-1.5">{upcomingItems.slice(0, 5).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2"><div className="min-w-0"><div className="truncate text-xs font-black">{item.name}</div><div className="text-[9px] uppercase tracking-wider text-slate-500">{dateLabel(item.date)} · {String(item.type || "").replaceAll("_", " ")}</div></div><div className="text-xs font-black text-amber-100">{money(item.amount)}</div></div>)}</div> : <EmptyState>Add due dates to bills and debts to build your upcoming schedule.</EmptyState>}
            </Section>

            <Section title="Ask SYNC" subtitle="Use Finance AI only when you need it; it stays compact otherwise." right={<Bot className="h-4 w-4 text-cyan-300" />}>
              {!chatOpen ? <div className="flex gap-2"><button type="button" onClick={() => setChatOpen(true)} className="min-h-10 flex-1 rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 text-xs font-black text-violet-100">Ask about my finances</button><button type="button" onClick={() => sendFinanceChat("What should I pay next?")} className="min-h-10 rounded-xl border border-white/10 px-3 text-[10px] font-black text-slate-400">Next debt</button></div> : <><div className="max-h-56 space-y-2 overflow-y-auto">{chatMessages.map((message) => <div key={message.id} className={`rounded-xl p-2.5 text-xs leading-5 ${message.role === "user" ? "ml-6 bg-cyan-500/10" : "mr-6 bg-violet-500/10"}`}>{message.text}</div>)}</div><div className="mt-2 flex gap-2"><textarea rows={2} value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask SYNC…" className="min-h-11 flex-1 resize-none rounded-xl border border-white/10 bg-slate-950 p-2.5 text-xs outline-none"/><button type="button" onClick={() => sendFinanceChat()} disabled={chatSending || !chatInput.trim()} className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 disabled:opacity-40">{chatSending ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}</button></div></>}
            </Section>
          </div>
        </> : null}

        {tab === "plan" ? <>
          <Section title="Debt Plan 1" subtitle="One payoff strategy. Keep minimums current, then direct extra money to the current target." right={<TrendingDown className="h-4 w-4 text-cyan-300" />}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><MiniStat label="Debt" value={money(personalPlan.total_debt)} tone="rose" /><MiniStat label="Minimums" value={money(personalPlan.known_minimum_payments)} tone="amber" /><MiniStat label="Complete" value={`${Number(personalPlan.data_completeness_percent || 0)}%`} /><MiniStat label="Extra" value={money(personalPlan.extra_monthly)} tone="violet" /></div>
            {currentTarget ? <div className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-500/[.05] p-3"><div className="flex items-start justify-between gap-3"><div><div className="text-[9px] font-black uppercase tracking-[.14em] text-cyan-200">Pay extra here</div><div className="mt-1 flex items-center gap-2"><div className="text-base font-black">{currentTarget.name}</div><button type="button" onClick={() => openDebtEdit(liabilities.find((row) => Number(row.id) === Number(currentTarget.id)) || currentTarget)} className="grid h-7 w-7 place-items-center rounded-lg border border-white/10"><Pencil className="h-3 w-3"/></button></div><div className="text-[10px] text-slate-500">{currentTarget.priority_reason}</div></div><div className="text-right"><div className="text-xl font-black text-rose-100">{money(currentTarget.balance)}</div><div className="text-[10px] text-slate-500">target {money(personalPlan.target_monthly_payment)}</div></div></div></div> : <EmptyState>Add debts to activate the payoff plan.</EmptyState>}
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]"><input type="number" min="0" step="25" value={extraMonthly} onChange={(e) => setExtraMonthly(e.target.value)} placeholder="Extra monthly payoff" className={inputClass}/><button type="button" onClick={() => loadFinance(extraMonthly)} className="mt-1 min-h-11 rounded-xl bg-violet-500 px-4 text-xs font-black">Apply extra</button></div>
            {personalPlan.priority?.length ? <div className="mt-3 space-y-1.5">{personalPlan.priority.slice(0, 10).map((item) => <div key={`plan-${item.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2"><div className="min-w-0"><div className="text-[9px] font-black uppercase text-cyan-200">#{item.rank}</div><div className="truncate text-xs font-black">{item.name}</div><div className="text-[9px] text-slate-500">{item.apr != null ? `${item.apr}% APR` : "APR missing"} · min {money(item.minimum_payment)}</div></div><div className="text-xs font-black text-rose-100">{money(item.balance)}</div></div>)}</div> : null}
            {personalPlan.missing_data?.length ? <div className="mt-3 rounded-xl border border-amber-400/15 bg-amber-500/[.05] p-3"><div className="text-[10px] font-black uppercase text-amber-200">Finish these details</div><div className="mt-1 text-[11px] leading-5 text-slate-400">{personalPlan.missing_data.slice(0, 6).map((item) => `${item.name}: ${item.missing.join(", ")}`).join(" · ")}</div></div> : null}
          </Section>

          <div className="grid gap-3 lg:grid-cols-2">
            <Section title="Budgets" subtitle="Monthly category guardrails."><div className="flex justify-end"><button type="button" onClick={() => openManual("BUDGET")} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-black"><Plus className="mr-1 inline h-3 w-3"/>Add</button></div>{budgets.length ? <div className="mt-2 space-y-1.5">{budgets.slice(0, 6).map((item) => <div key={item.id} className="flex justify-between rounded-lg border border-white/10 px-3 py-2 text-xs"><span>{item.name}</span><b>{money(item.monthly_limit)}</b></div>)}</div> : <EmptyState>No budgets yet.</EmptyState>}</Section>
            <Section title="Goals" subtitle="Savings, emergency fund and purchase targets."><div className="flex justify-end"><button type="button" onClick={() => openManual("GOAL")} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-black"><Plus className="mr-1 inline h-3 w-3"/>Add</button></div>{goals.length ? <div className="mt-2 space-y-1.5">{goals.slice(0, 6).map((item) => <div key={item.id} className="rounded-lg border border-white/10 px-3 py-2"><div className="flex justify-between text-xs"><b>{item.name}</b><span>{money(item.current_amount)} / {money(item.target_amount)}</span></div></div>)}</div> : <EmptyState>No goals yet.</EmptyState>}</Section>
          </div>
        </> : null}

        {tab === "accounts" ? <>
          <div className="grid grid-cols-4 gap-1.5">
            <button type="button" onClick={() => openManual("INCOME")} className="min-h-11 rounded-xl border border-emerald-400/20 bg-emerald-500/[.06] px-1 text-[10px] font-black text-emerald-100"><DollarSign className="mx-auto mb-1 h-3.5 w-3.5"/>Income</button>
            <button type="button" onClick={() => openManual("BILL")} className="min-h-11 rounded-xl border border-amber-400/20 bg-amber-500/[.06] px-1 text-[10px] font-black text-amber-100"><CalendarClock className="mx-auto mb-1 h-3.5 w-3.5"/>Bill</button>
            <button type="button" onClick={() => openManual("DEBT", { account_kind: "CREDIT_CARD" })} className="min-h-11 rounded-xl border border-rose-400/20 bg-rose-500/[.06] px-1 text-[10px] font-black text-rose-100"><CreditCard className="mx-auto mb-1 h-3.5 w-3.5"/>Debt</button>
            <button type="button" onClick={() => openManual("ACCOUNT")} className="min-h-11 rounded-xl border border-cyan-400/20 bg-cyan-500/[.06] px-1 text-[10px] font-black text-cyan-100"><Wallet className="mx-auto mb-1 h-3.5 w-3.5"/>Account</button>
          </div>

          <Section title="Income" subtitle="Paychecks, rental income, business income and other inflow." right={<TrendingUp className="h-4 w-4 text-emerald-300" />}>
            {incomeSources.length ? <div className="space-y-1.5">{incomeSources.map((item) => <div key={`income-${item.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2"><div className="min-w-0"><div className="truncate text-xs font-black">{item.name}</div><div className="text-[9px] uppercase text-slate-500">{String(item.kind).replaceAll("_", " ")} · {String(item.cadence).replaceAll("_", " ")}</div></div><div className="flex items-center gap-2"><b className="text-xs text-emerald-100">{money(item.amount)}</b><button type="button" onClick={() => openGenericEdit("INCOME", item)} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10"><Pencil className="h-3 w-3"/></button></div></div>)}</div> : <EmptyState>Add household income so SyncWorks can calculate real planned inflow.</EmptyState>}
          </Section>

          <Section title="Bills & living expenses" subtitle="Mortgage, rent, insurance, vehicle, phone, utilities, groceries, subscriptions and more." right={<CalendarClock className="h-4 w-4 text-amber-300" />}>
            {obligations.length ? <div className="space-y-1.5">{obligations.map((item) => <div key={`bill-${item.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2"><div className="min-w-0"><div className="truncate text-xs font-black">{item.name}</div><div className="text-[9px] uppercase text-slate-500">{String(item.category).replaceAll("_", " ")} · {String(item.cadence || "MONTHLY").replaceAll("_", " ")}{item.next_due_date ? ` · ${dateLabel(item.next_due_date)}` : ""}</div></div><div className="flex items-center gap-2"><b className="text-xs text-amber-100">{money(item.expected_amount)}</b><button type="button" onClick={() => openGenericEdit("BILL", item)} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10"><Pencil className="h-3 w-3"/></button></div></div>)}</div> : <EmptyState>Add your mortgage/rent, insurance, car, phone and other recurring bills.</EmptyState>}
          </Section>

          <Section title="Debts" subtitle="Cards and loans. Edit balances, limits, APRs and minimums here." right={credit.utilization_percent != null ? <span className="rounded-full border border-white/10 px-2 py-1 text-[9px] font-black text-slate-400">{credit.utilization_percent}% utilization</span> : null}>
            {liabilities.length ? <div className="grid gap-1.5 sm:grid-cols-2">{liabilities.map((item) => <div key={`debt-${item.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2"><div className="min-w-0"><div className="truncate text-xs font-black">{item.name}</div><div className="text-[9px] uppercase text-slate-500">{String(item.kind).replaceAll("_", " ")} · {item.apr != null ? `${item.apr}% APR` : "APR missing"}</div></div><div className="flex items-center gap-2"><div className="text-right"><b className="block text-xs text-rose-100">{money(item.outstanding_balance)}</b><span className="text-[9px] text-slate-500">min {money(item.minimum_payment)}</span></div><button type="button" onClick={() => openDebtEdit(item)} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10"><Pencil className="h-3 w-3"/></button></div></div>)}</div> : <EmptyState>No debts tracked in this profile yet.</EmptyState>}
          </Section>

          <Section title="Cash & other accounts" subtitle="Checking, savings, investments and manual accounts." right={<Wallet className="h-4 w-4 text-cyan-300" />}>
            {accounts.filter((item) => item.kind !== "CREDIT_CARD").length ? <div className="grid gap-1.5 sm:grid-cols-2">{accounts.filter((item) => item.kind !== "CREDIT_CARD").map((item) => <div key={`account-${item.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2"><div><div className="text-xs font-black">{item.name}</div><div className="text-[9px] uppercase text-slate-500">{String(item.kind).replaceAll("_", " ")}{item.is_manual ? " · manual" : " · connected"}</div></div><div className="flex items-center gap-2"><b className="text-xs">{money(item.current_balance)}</b><button type="button" onClick={() => openGenericEdit("ACCOUNT", item)} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10"><Pencil className="h-3 w-3"/></button></div></div>)}</div> : <EmptyState>Add checking or savings balances manually until automatic bank sync is available.</EmptyState>}
          </Section>

          <Section title="Connections" subtitle="Manual records stay useful now and can be matched to a bank connection later." right={<Building2 className="h-4 w-4 text-cyan-300" />}>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={connectBank} disabled={syncing} className="min-h-10 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3 text-xs font-black"><Building2 className="mr-1.5 inline h-3.5 w-3.5"/>Connect bank</button><button type="button" onClick={openAccountLinker} className="min-h-10 rounded-xl border border-white/10 px-3 text-xs font-black text-slate-300"><Link2 className="mr-1.5 inline h-3.5 w-3.5"/>Match existing</button><button type="button" onClick={() => setBulkOpen(true)} className="min-h-10 rounded-xl border border-violet-400/20 px-3 text-xs font-black text-violet-200">Import debts</button></div>
            <div className="mt-2 text-[10px] text-slate-500">{dashboard?.connections?.length || 0} institution connection(s). Automatic bank sync may be unavailable during setup; that does not affect manual Finance records or plans.</div>
          </Section>
        </> : null}

        {tab === "household" ? <>
          <Section title={householdFinance?.household?.name || "Family finances"} subtitle="Each person owns their own financial profile. Household totals use only information that person explicitly shares." right={<Users className="h-4 w-4 text-emerald-300" />}>
            {householdFinance ? <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><MiniStat label="Visible debt" value={money(householdSummary.visible_total_debt)} tone="rose" /><MiniStat label="Visible cash" value={money(householdSummary.visible_available_cash)} /><MiniStat label="Minimums" value={money(householdSummary.visible_known_minimum_payments)} tone="amber" /><MiniStat label="AI plan members" value={`${householdSummary.ai_plan_members || 0}`} tone="violet" /></div>
              <div className="mt-3 space-y-1.5">{(householdFinance.members || []).map((member) => <div key={member.user_id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2"><div><div className="text-xs font-black">{member.display_name}{member.is_self ? " · You" : ""}</div><div className="text-[9px] uppercase text-slate-500">{member.privacy_status === "PRIVATE" ? "Finance private" : member.privacy_status === "SHARED" ? "Finance summary shared" : "Your finance"}</div></div>{member.privacy_status === "PRIVATE" ? <ShieldCheck className="h-4 w-4 text-slate-600"/> : <CheckCircle2 className="h-4 w-4 text-emerald-300"/>}</div>)}</div>
              {householdPlan?.first_target ? <div className="mt-3 rounded-xl border border-violet-400/20 bg-violet-500/[.05] p-3"><div className="text-[9px] font-black uppercase text-violet-200">Household Plan 1 target</div><div className="mt-1 flex justify-between"><b className="text-sm">{householdPlan.first_target.owner_name ? `${householdPlan.first_target.owner_name} · ` : ""}{householdPlan.first_target.name}</b><b className="text-sm text-rose-100">{money(householdPlan.first_target.balance)}</b></div></div> : null}
            </> : <EmptyState>Create or join a Family workspace to combine selected financial summaries while keeping individual accounts private by default.</EmptyState>}
            <button type="button" onClick={() => nav("/customer/family")} className="mt-3 min-h-10 w-full rounded-xl border border-emerald-400/20 bg-emerald-500/[.06] px-3 text-xs font-black text-emerald-100">Manage family & sharing</button>
          </Section>

          <Section title="How household Finance works" subtitle="Connection is not permission.">
            <div className="grid gap-2 sm:grid-cols-3"><div className="rounded-xl border border-white/10 p-3"><div className="text-[10px] font-black text-cyan-200">1. Separate profiles</div><p className="mt-1 text-[10px] leading-4 text-slate-500">Your accounts stay yours. A spouse or family member keeps theirs.</p></div><div className="rounded-xl border border-white/10 p-3"><div className="text-[10px] font-black text-cyan-200">2. Choose sharing</div><p className="mt-1 text-[10px] leading-4 text-slate-500">Share summary, bills, income, budgets or transactions independently.</p></div><div className="rounded-xl border border-white/10 p-3"><div className="text-[10px] font-black text-cyan-200">3. Build household plan</div><p className="mt-1 text-[10px] leading-4 text-slate-500">SYNC combines only what each person allowed for household planning.</p></div></div>
          </Section>
        </> : null}

        {alerts.length && tab === "overview" ? <div className="text-center text-[9px] text-slate-600">{alerts.length} Finance alert(s) available in SYNC.</div> : null}
      </main>

      {manualOpen ? <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/75 sm:items-center sm:p-4"><div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[1.5rem] border border-cyan-400/20 bg-[#07111f] p-4 sm:rounded-[1.5rem]"><div className="flex items-start justify-between gap-3"><div><div className="text-[9px] font-black uppercase tracking-[.16em] text-cyan-200">Add Finance record</div><h2 className="mt-1 text-lg font-black">{manual.type === "INCOME" ? "Income" : manual.type === "BILL" ? "Bill / living expense" : manual.type === "DEBT" ? "Debt" : manual.type === "ACCOUNT" ? "Account" : manual.type === "GOAL" ? "Goal" : "Budget"}</h2></div><button type="button" onClick={() => setManualOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10"><X className="h-4 w-4"/></button></div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2"><Field label="Type" wide><select value={manual.type} onChange={(e) => setManual({ ...EMPTY_MANUAL, type: e.target.value })} className={inputClass}><option value="INCOME">Income</option><option value="BILL">Bill / living expense</option><option value="DEBT">Debt</option><option value="ACCOUNT">Cash / account</option><option value="GOAL">Goal</option><option value="BUDGET">Budget</option></select></Field><Field label="Name" wide><input value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} placeholder={manual.type === "INCOME" ? "Paycheck / Rental #1" : manual.type === "BILL" ? "Mortgage / Auto insurance / Phone" : "Name"} className={inputClass}/></Field>
        {manual.type === "INCOME" ? <><Field label="Income type"><select value={manual.income_kind} onChange={(e) => setManual({ ...manual, income_kind: e.target.value })} className={inputClass}>{INCOME_KINDS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></Field><Field label="Amount"><input type="number" value={manual.amount} onChange={(e) => setManual({ ...manual, amount: e.target.value })} className={inputClass}/></Field><Field label="Frequency"><select value={manual.cadence} onChange={(e) => setManual({ ...manual, cadence: e.target.value })} className={inputClass}>{CADENCES.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></Field><Field label="Next deposit"><input type="date" value={manual.due_date} onChange={(e) => setManual({ ...manual, due_date: e.target.value })} className={inputClass}/></Field></> : null}
        {manual.type === "BILL" ? <><Field label="Category"><select value={manual.category} onChange={(e) => setManual({ ...manual, category: e.target.value })} className={inputClass}>{BILL_CATEGORIES.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></Field><Field label="Amount"><input type="number" value={manual.amount} onChange={(e) => setManual({ ...manual, amount: e.target.value })} className={inputClass}/></Field><Field label="Frequency"><select value={manual.cadence} onChange={(e) => setManual({ ...manual, cadence: e.target.value })} className={inputClass}>{CADENCES.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></Field><Field label="Next due date"><input type="date" value={manual.due_date} onChange={(e) => setManual({ ...manual, due_date: e.target.value })} className={inputClass}/></Field></> : null}
        {manual.type === "ACCOUNT" ? <><Field label="Account type"><select value={manual.account_kind} onChange={(e) => setManual({ ...manual, account_kind: e.target.value })} className={inputClass}><option value="CHECKING">Checking</option><option value="SAVINGS">Savings</option><option value="INVESTMENT">Investment</option><option value="OTHER">Other</option></select></Field><Field label="Balance"><input type="number" value={manual.balance} onChange={(e) => setManual({ ...manual, balance: e.target.value })} className={inputClass}/></Field></> : null}
        {manual.type === "DEBT" ? <><Field label="Debt type"><select value={manual.account_kind} onChange={(e) => setManual({ ...manual, account_kind: e.target.value })} className={inputClass}><option value="CREDIT_CARD">Credit card</option><option value="MORTGAGE">Mortgage</option><option value="AUTO_LOAN">Auto loan</option><option value="STUDENT_LOAN">Student loan</option><option value="PERSONAL_LOAN">Personal loan</option><option value="OTHER">Other</option></select></Field><Field label="Balance"><input type="number" value={manual.balance} onChange={(e) => setManual({ ...manual, balance: e.target.value })} className={inputClass}/></Field><Field label="Minimum payment"><input type="number" value={manual.minimum_payment} onChange={(e) => setManual({ ...manual, minimum_payment: e.target.value })} className={inputClass}/></Field><Field label="Next payment"><input type="date" value={manual.due_date} onChange={(e) => setManual({ ...manual, due_date: e.target.value })} className={inputClass}/></Field><Field label="APR %"><input type="number" step="0.01" value={manual.apr} onChange={(e) => setManual({ ...manual, apr: e.target.value })} className={inputClass}/></Field>{manual.account_kind === "CREDIT_CARD" ? <><Field label="Credit limit"><input type="number" value={manual.credit_limit} onChange={(e) => setManual({ ...manual, credit_limit: e.target.value })} className={inputClass}/></Field><Field label="Promo APR %"><input type="number" step="0.01" value={manual.promo_apr} onChange={(e) => setManual({ ...manual, promo_apr: e.target.value })} className={inputClass}/></Field><Field label="Promo ends"><input type="date" value={manual.promo_apr_end_date} onChange={(e) => setManual({ ...manual, promo_apr_end_date: e.target.value })} className={inputClass}/></Field><Field label="Status"><select value={manual.account_status} onChange={(e) => setManual({ ...manual, account_status: e.target.value })} className={inputClass}><option value="OPEN">Open</option><option value="CLOSED">Closed</option><option value="COLLECTION">Collection</option></select></Field></> : null}</> : null}
        {manual.type === "GOAL" ? <><Field label="Target"><input type="number" value={manual.target_amount} onChange={(e) => setManual({ ...manual, target_amount: e.target.value })} className={inputClass}/></Field><Field label="Current"><input type="number" value={manual.balance} onChange={(e) => setManual({ ...manual, balance: e.target.value })} className={inputClass}/></Field><Field label="Target date"><input type="date" value={manual.target_date} onChange={(e) => setManual({ ...manual, target_date: e.target.value })} className={inputClass}/></Field></> : null}
        {manual.type === "BUDGET" ? <><Field label="Category"><input value={manual.category} onChange={(e) => setManual({ ...manual, category: e.target.value.toUpperCase().replace(/\s+/g, "_") })} className={inputClass}/></Field><Field label="Monthly limit"><input type="number" value={manual.amount} onChange={(e) => setManual({ ...manual, amount: e.target.value })} className={inputClass}/></Field></> : null}</div>
        <button type="button" disabled={savingManual} onClick={saveManual} className="mt-4 min-h-11 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-black disabled:opacity-50">{savingManual ? "Saving…" : "Save"}</button></div></div> : null}

      {editLiability ? <div className="fixed inset-0 z-[91] flex items-end justify-center bg-black/75 sm:items-center sm:p-4"><div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[1.5rem] border border-cyan-400/20 bg-[#07111f] p-4 sm:rounded-[1.5rem]"><div className="flex items-start justify-between"><div><div className="text-[9px] font-black uppercase text-cyan-200">Edit debt</div><h2 className="mt-1 text-lg font-black">{editLiability.name}</h2></div><button onClick={() => setEditLiability(null)} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10"><X className="h-4 w-4"/></button></div><div className="mt-4 grid gap-2 sm:grid-cols-2"><Field label="Name" wide><input value={editForm.name || ""} onChange={(e)=>setEditForm({...editForm,name:e.target.value})} className={inputClass}/></Field><Field label="Balance"><input type="number" value={editForm.balance ?? ""} onChange={(e)=>setEditForm({...editForm,balance:e.target.value})} className={inputClass}/></Field><Field label="Credit limit"><input type="number" value={editForm.credit_limit ?? ""} onChange={(e)=>setEditForm({...editForm,credit_limit:e.target.value})} className={inputClass}/></Field><Field label="Minimum"><input type="number" value={editForm.minimum_payment ?? ""} onChange={(e)=>setEditForm({...editForm,minimum_payment:e.target.value})} className={inputClass}/></Field><Field label="APR %"><input type="number" step="0.01" value={editForm.apr ?? ""} onChange={(e)=>setEditForm({...editForm,apr:e.target.value})} className={inputClass}/></Field><Field label="Next payment"><input type="date" value={editForm.next_payment_date || ""} onChange={(e)=>setEditForm({...editForm,next_payment_date:e.target.value})} className={inputClass}/></Field><Field label="Status"><select value={editForm.account_status || "OPEN"} onChange={(e)=>setEditForm({...editForm,account_status:e.target.value})} className={inputClass}><option value="OPEN">Open</option><option value="CLOSED">Closed</option><option value="COLLECTION">Collection</option></select></Field><Field label="Promo APR %"><input type="number" step="0.01" value={editForm.promo_apr ?? ""} onChange={(e)=>setEditForm({...editForm,promo_apr:e.target.value})} className={inputClass}/></Field><Field label="Promo ends"><input type="date" value={editForm.promo_apr_end_date || ""} onChange={(e)=>setEditForm({...editForm,promo_apr_end_date:e.target.value})} className={inputClass}/></Field></div><button type="button" disabled={savingEdit} onClick={saveDebtEdit} className="mt-4 min-h-11 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-black">{savingEdit ? "Saving…" : "Save changes"}</button></div></div> : null}

      {editRecord ? <div className="fixed inset-0 z-[91] flex items-end justify-center bg-black/75 sm:items-center sm:p-4"><div className="w-full max-w-xl rounded-t-[1.5rem] border border-cyan-400/20 bg-[#07111f] p-4 sm:rounded-[1.5rem]"><div className="flex items-start justify-between"><div><div className="text-[9px] font-black uppercase text-cyan-200">Edit {editRecord.type.toLowerCase()}</div><h2 className="mt-1 text-lg font-black">{editRecord.item.name}</h2></div><button onClick={() => setEditRecord(null)} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10"><X className="h-4 w-4"/></button></div><div className="mt-4 grid gap-2 sm:grid-cols-2"><Field label="Name" wide><input value={editRecordForm.name || ""} onChange={(e)=>setEditRecordForm({...editRecordForm,name:e.target.value})} className={inputClass}/></Field>{editRecord.type === "INCOME" ? <><Field label="Amount"><input type="number" value={editRecordForm.amount ?? ""} onChange={(e)=>setEditRecordForm({...editRecordForm,amount:e.target.value})} className={inputClass}/></Field><Field label="Type"><select value={editRecordForm.kind || "PAYCHECK"} onChange={(e)=>setEditRecordForm({...editRecordForm,kind:e.target.value})} className={inputClass}>{INCOME_KINDS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field><Field label="Frequency"><select value={editRecordForm.cadence || "MONTHLY"} onChange={(e)=>setEditRecordForm({...editRecordForm,cadence:e.target.value})} className={inputClass}>{CADENCES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field><Field label="Next deposit"><input type="date" value={editRecordForm.next_income_date || ""} onChange={(e)=>setEditRecordForm({...editRecordForm,next_income_date:e.target.value})} className={inputClass}/></Field></> : editRecord.type === "BILL" ? <><Field label="Amount"><input type="number" value={editRecordForm.amount ?? ""} onChange={(e)=>setEditRecordForm({...editRecordForm,amount:e.target.value})} className={inputClass}/></Field><Field label="Category"><select value={editRecordForm.category || "OTHER"} onChange={(e)=>setEditRecordForm({...editRecordForm,category:e.target.value})} className={inputClass}>{BILL_CATEGORIES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field><Field label="Frequency"><select value={editRecordForm.cadence || "MONTHLY"} onChange={(e)=>setEditRecordForm({...editRecordForm,cadence:e.target.value})} className={inputClass}>{CADENCES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field><Field label="Next due"><input type="date" value={editRecordForm.due_date || ""} onChange={(e)=>setEditRecordForm({...editRecordForm,due_date:e.target.value})} className={inputClass}/></Field></> : <><Field label="Balance"><input type="number" value={editRecordForm.balance ?? ""} onChange={(e)=>setEditRecordForm({...editRecordForm,balance:e.target.value})} className={inputClass}/></Field><Field label="Type"><select value={editRecordForm.kind || "OTHER"} onChange={(e)=>setEditRecordForm({...editRecordForm,kind:e.target.value})} className={inputClass}><option value="CHECKING">Checking</option><option value="SAVINGS">Savings</option><option value="INVESTMENT">Investment</option><option value="OTHER">Other</option></select></Field></>}</div><button type="button" disabled={savingEdit} onClick={saveGenericEdit} className="mt-4 min-h-11 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-black">{savingEdit ? "Saving…" : "Save changes"}</button></div></div> : null}

      {linkerOpen ? <div className="fixed inset-0 z-[91] flex items-end justify-center bg-black/75 sm:items-center sm:p-4"><div className="w-full max-w-xl rounded-t-[1.5rem] border border-cyan-400/20 bg-[#07111f] p-4 sm:rounded-[1.5rem]"><div className="flex justify-between"><div><div className="text-[9px] font-black uppercase text-cyan-200">Match accounts</div><h2 className="mt-1 text-lg font-black">Connect live data to an existing record</h2></div><button onClick={()=>setLinkerOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10"><X className="h-4 w-4"/></button></div>{matchData.connected?.length && matchData.manual?.length ? <div className="mt-4 grid gap-3"><Field label="Connected account"><select value={linkConnectedId} onChange={(e)=>setLinkConnectedId(e.target.value)} className={inputClass}>{matchData.connected.map((item)=><option key={item.id} value={item.id}>{item.name}{item.mask ? ` ••••${item.mask}` : ""} — {money(item.current_balance)}</option>)}</select></Field><Field label="Existing record"><select value={linkManualId} onChange={(e)=>setLinkManualId(e.target.value)} className={inputClass}>{matchData.manual.map((item)=><option key={item.id} value={item.id}>{item.name} — {money(item.current_balance)}</option>)}</select></Field><button disabled={linkingAccount} onClick={linkExistingAccount} className="min-h-11 rounded-xl bg-cyan-600 text-xs font-black">{linkingAccount ? "Linking…" : "Link accounts"}</button></div> : <EmptyState>No connected bank account is available to match yet.</EmptyState>}</div></div> : null}

      {bulkOpen ? <div className="fixed inset-0 z-[91] flex items-end justify-center bg-black/75 sm:items-center sm:p-4"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[1.5rem] border border-violet-400/20 bg-[#07111f] p-4 sm:rounded-[1.5rem]"><div className="flex justify-between"><div><div className="text-[9px] font-black uppercase text-violet-200">Bulk import</div><h2 className="mt-1 text-lg font-black">Import debt list</h2></div><button onClick={()=>setBulkOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10"><X className="h-4 w-4"/></button></div><textarea value={bulkText} onChange={(e)=>setBulkText(e.target.value)} rows={12} spellCheck={false} placeholder={'{"debts":[{"owner":"self","name":"Visa","kind":"CREDIT_CARD","balance":2500,"credit_limit":5000,"minimum_payment":75,"apr":24.99}]}' } className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-xs text-white outline-none"/><button disabled={bulkImporting || !bulkText.trim()} onClick={importDebtList} className="mt-3 min-h-11 w-full rounded-xl bg-violet-600 text-xs font-black disabled:opacity-40">{bulkImporting ? "Importing…" : "Import debts"}</button></div></div> : null}
    </div>
  );
}
