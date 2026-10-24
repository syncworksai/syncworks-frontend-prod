import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, CheckCircle2, CircleDollarSign,
  ClipboardCheck, Pencil, Plus, RefreshCw, ShieldCheck, Wallet,
} from "lucide-react";

import api from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import DashboardShell from "../../components/dashboard/DashboardShell";
import GlassCard from "../../components/dashboard/GlassCard";
import SidebarNav from "../../components/dashboard/SidebarNav";

const today = () => {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
};
const thisMonth = () => today().slice(0, 7);
const expenseInitial = () => ({
  id: null, ticket: "", category: "OVERHEAD", status: "INCURRED", description: "",
  quantity: "1", unit_cost: "", incurred_on: today(), due_on: "", paid_on: "", vendor: "", notes: "",
});
const forecastInitial = () => ({
  description: "", direction: "IN", amount: "", expected_on: today(), notes: "",
});
const CATEGORIES = [
  ["LABOR", "Labor"], ["MATERIAL", "Materials"], ["SUBCONTRACTOR", "Subcontractor"],
  ["OVERHEAD", "Overhead"], ["EQUIPMENT", "Equipment"], ["MARKETING", "Marketing"], ["OTHER", "Other"],
];
const CATEGORY_LABEL = Object.fromEntries(CATEGORIES);
const money = (value) =>
  value == null ? "—" : Number(value).toLocaleString("en-US", { style: "currency", currency: "USD" });
const num = (value) => Number(value || 0);
const pct = (value) => value == null ? "—" : Number(value).toFixed(1) + "%";
const rows = (value) => Array.isArray(value) ? value : Array.isArray(value?.results) ? value.results : [];

const inputClass = "min-h-11 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-cyan-400";
const btnClass = "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3 text-xs font-black text-cyan-100 hover:border-cyan-300/60 disabled:opacity-40";
const secondaryClass = "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs font-black text-slate-200 hover:border-cyan-400/50 disabled:opacity-40";

function Field({ label, children }) {
  return (
    <label className="block min-w-0 space-y-1.5">
      <span className="text-[11px] font-bold text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="mt-1 break-words text-xl font-black tracking-tight text-white">{value}</div>
      <div className="mt-1 text-[10px] leading-4 text-slate-500">{sub}</div>
    </div>
  );
}

function formatError(error) {
  const response = error?.response?.data;
  if (typeof response?.detail === "string") return response.detail;
  if (typeof response?.non_field_errors?.[0] === "string") return response.non_field_errors[0];
  if (response && typeof response === "object") {
    const first = Object.entries(response)[0];
    if (first) return first[0] + ": " + (Array.isArray(first[1]) ? first[1][0] : String(first[1]));
  }
  return "Unable to save. Check your input and try again.";
}

export default function BusinessFinanceIntelligence() {
  const navigate = useNavigate();
  const { activeBusinessId } = useAuth();
  const [tab, setTab] = useState("overview");
  const [month, setMonth] = useState(thisMonth());
  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [cash, setCash] = useState(null);
  const [forecastEntries, setForecastEntries] = useState([]);
  const [expenseDraft, setExpenseDraft] = useState(expenseInitial);
  const [forecastDraft, setForecastDraft] = useState(forecastInitial);
  const [cashDraft, setCashDraft] = useState({ opening_cash_balance: "", opening_cash_date: today() });
  const [loadKey, setLoadKey] = useState(0);

  const loadAll = useCallback(async () => {
    if (!activeBusinessId) {
      setLoading(false);
      setError("Select an active Business profile to open its financial records.");
      return;
    }
    setLoading(true);
    setError("");
    const endpoints = [
      api.get("/business-finance/summary/", { params: { month } }),
      api.get("/business-finance/expenses/"),
      api.get("/business-finance/job-profit/"),
      api.get("/business-finance/cash-forecast/", { params: { days } }),
      api.get("/business-finance/forecast-items/"),
      api.get("/business-finance/settings/"),
    ];
    const responses = await Promise.allSettled(endpoints);
    const [a, b, c, d, e, f] = responses;
    setSummary(a.status === "fulfilled" ? a.value.data : null);
    setExpenses(b.status === "fulfilled" ? rows(b.value.data) : []);
    setJobs(c.status === "fulfilled" ? rows(c.value.data) : []);
    setCash(d.status === "fulfilled" ? d.value.data : null);
    setForecastEntries(e.status === "fulfilled" ? rows(e.value.data) : []);
    if (f.status === "fulfilled") {
      const state = f.value.data;
      setCashDraft({
        opening_cash_balance: state.opening_cash_balance ?? "",
        opening_cash_date: state.opening_cash_date || today(),
      });
    }
    const rejected = responses.filter((r) => r.status === "rejected");
    if (rejected.length) {
      setError("Some financial records could not load. " + formatError(rejected[0].reason));
    }
    setLoading(false);
  }, [activeBusinessId, days, month]);

  useEffect(() => { loadAll(); }, [loadAll, loadKey]);

  const expenseTotal = useMemo(() => num(expenseDraft.quantity) * num(expenseDraft.unit_cost), [expenseDraft]);
  const recentExpenses = useMemo(() => expenses.filter((e) => e.incurred_on?.slice(0, 7) === month), [expenses, month]);

  async function perform(action, success) {
    setError("");
    setMessage("");
    setWorking(true);
    try {
      await action();
      setMessage(success);
      setLoadKey((key) => key + 1);
      return true;
    } catch (e) {
      setError(formatError(e));
      return false;
    } finally {
      setWorking(false);
    }
  }

  function expensePayload() {
    return {
      ticket: expenseDraft.ticket ? Number(expenseDraft.ticket) : null,
      category: expenseDraft.category, status: expenseDraft.status,
      description: expenseDraft.description.trim(), vendor: expenseDraft.vendor.trim(),
      quantity: expenseDraft.quantity, unit_cost: expenseDraft.unit_cost,
      incurred_on: expenseDraft.incurred_on, due_on: expenseDraft.due_on || null,
      paid_on: expenseDraft.status === "PAID" ? (expenseDraft.paid_on || null) : null,
      notes: expenseDraft.notes.trim(),
    };
  }

  async function submitExpense(event) {
    event.preventDefault();
    if (!expenseDraft.description.trim() || !(expenseTotal >= 0)) {
      setError("Enter a description, quantity and valid unit cost.");
      return;
    }
    const payload = expensePayload();
    const saved = await perform(
      () => expenseDraft.id
        ? api.patch("/business-finance/expenses/" + expenseDraft.id + "/", payload)
        : api.post("/business-finance/expenses/", payload),
      expenseDraft.id ? "Expense updated. Any affected job cost review was reopened." : "Expense added to this business.",
    );
    if (saved) setExpenseDraft(expenseInitial());
  }

  function editExpense(item) {
    setExpenseDraft({
      id: item.id, ticket: item.ticket ? String(item.ticket) : "",
      category: item.category, status: item.status, description: item.description,
      quantity: String(item.quantity), unit_cost: String(item.unit_cost),
      incurred_on: item.incurred_on, due_on: item.due_on || "", paid_on: item.paid_on || "",
      vendor: item.vendor || "", notes: item.notes || "",
    });
    setTab("expenses");
  }

  async function submitForecast(event) {
    event.preventDefault();
    const saved = await perform(
      () => api.post("/business-finance/forecast-items/", {
        ...forecastDraft, amount: forecastDraft.amount,
      }),
      "Planned cash event saved.",
    );
    if (saved) setForecastDraft(forecastInitial());
  }

  async function submitOpening(event) {
    event.preventDefault();
    await perform(
      () => api.patch("/business-finance/settings/", {
        opening_cash_balance: cashDraft.opening_cash_balance === "" ? null : cashDraft.opening_cash_balance,
        opening_cash_date: cashDraft.opening_cash_balance === "" ? null : cashDraft.opening_cash_date,
      }),
      "Cash balance snapshot saved.",
    );
  }

  function openJobCost(job) {
    setExpenseDraft({ ...expenseInitial(), ticket: String(job.ticket), category: "LABOR" });
    setTab("expenses");
  }

  const reconciledThrough = () => {
    const [year, monthNo] = month.split("-").map(Number);
    const lastDay = new Date(year, monthNo, 0).getDate();
    return month + "-" + String(lastDay).padStart(2, "0");
  };
  const canReconcile = month < thisMonth();

  const navItems = [
    { label: "Dashboard", icon: "⌂", onClick: () => navigate("/sbo") },
    { label: "Job Requests", icon: "▤", onClick: () => navigate("/tickets") },
    { label: "Customers", icon: "◉", onClick: () => navigate("/sbo/customers") },
    { label: "Leads", icon: "◎", onClick: () => navigate("/sbo/leads") },
    { label: "Finance", icon: "$", onClick: () => navigate("/sbo/finance") },
    { label: "Business Intelligence", icon: "↗", onClick: () => navigate("/sbo/reports") },
    { label: "Profit & Cash", icon: "▦", active: true, onClick: () => navigate("/sbo/finance-intelligence") },
  ];

  return (
    <DashboardShell
      title="Profit & Cash"
      subtitle="Expense ledger · job costing · recorded margins · cash outlook"
      modeBarTitle="Business Finance"
      modeBarSubtitle="Costs, profits, and cash flow"
      bottomNavItems={[
        { label: "Home", icon: "⌂", onClick: () => navigate("/sbo") },
        { label: "Reports", icon: "↗", onClick: () => navigate("/sbo/reports") },
        { label: "Finance", icon: "$", onClick: () => navigate("/sbo/finance") },
        { label: "Customers", icon: "◉", onClick: () => navigate("/sbo/customers") },
      ]}
      bottomCenterAction={{ label: "New", onClick: () => navigate("/tickets?view=new") }}
      rightActions={
        <button type="button" className={secondaryClass} disabled={loading} onClick={() => setLoadKey((key) => key + 1)}>
          <RefreshCw aria-hidden="true" className={"h-4 w-4 " + (loading ? "animate-spin" : "")} /> Refresh
        </button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <SidebarNav title="Business OS" subtitle="Profit & Cash" items={navItems} />

        <div className="min-w-0 space-y-4 pb-8">
          <div className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-slate-950 to-fuchsia-500/10 p-4">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
              <Wallet className="h-4 w-4" /> BUSINESS FINANCE
            </div>
            <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">Turn job activity into real financial visibility.</h1>
            <p className="mt-2 text-xs leading-5 text-slate-300">
              Record actual labor, materials and overhead. Review job costs before confirming margins.
              Use your known cash position and scheduled payments for a cash-flow scenario.
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <Field label="Financial month">
                <input className={inputClass} type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
              </Field>
              <Field label="Cash outlook">
                <select className={inputClass} value={days} onChange={(event) => setDays(Number(event.target.value))}>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                </select>
              </Field>
            </div>
          </div>

          {error ? <div role="alert" className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</div> : null}
          {message ? <div role="status" className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-100">{message}</div> : null}

          <div className="grid grid-cols-4 gap-1.5 rounded-2xl border border-slate-800 bg-slate-950/70 p-1.5">
            {[
              ["overview", "Overview"],
              ["expenses", "Expenses"],
              ["jobs", "Job Costs"],
              ["forecast", "Forecast"],
            ].map(([key, label]) => (
              <button
                key={key} type="button" onClick={() => setTab(key)}
                className={"min-h-11 rounded-xl px-1.5 text-[11px] font-black sm:text-sm " +
                  (tab === key ? "bg-cyan-500/15 text-cyan-100 ring-1 ring-cyan-400/30" : "text-slate-400 hover:bg-slate-800")}
              >{label}</button>
            ))}
          </div>

          {tab === "overview" ? (
            <>
              <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
                <Stat label="Collected Revenue" value={loading ? "…" : money(summary?.revenue)} sub="Paid invoices + separately confirmed cash" />
                <Stat label="Recorded Costs" value={loading ? "…" : money(summary?.costs)} sub="Expenses incurred this month" />
                <Stat label="Recorded Contribution" value={loading ? "…" : money(summary?.recorded_contribution)} sub="Collections less recorded costs" />
                <Stat label="Recorded Margin" value={loading ? "…" : pct(summary?.recorded_margin_percent)} sub={summary?.reconciled ? "Owner-reconciled month" : "Provisional until reconciled"} />
              </div>
              <GlassCard title="Profitability Integrity" subtitle="Make actual performance understandable, not artificially precise" tone={summary?.reconciled ? "emerald" : "amber"}>
                <div className="flex flex-wrap items-center gap-2">
                  {summary?.reconciled ? (
                    <span className="inline-flex items-center gap-2 text-sm font-black text-emerald-200"><ShieldCheck className="h-4 w-4" /> Owner-reconciled</span>
                  ) : (
                    <span className="text-sm font-black text-amber-200">Provisional records — expenses not fully reconciled</span>
                  )}
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  {summary?.disclaimer || "Once records load, the reconciliation status and recorded margin will appear."}
                  {" "}This is an operating contribution, not tax profit or an audited financial statement.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(Object.entries(summary?.cost_breakdown || {})).map(([category, amount]) => (
                    <div key={category} className="rounded-xl border border-slate-800 bg-slate-950/55 p-2.5">
                      <div className="text-[11px] text-slate-400">{CATEGORY_LABEL[category] || category}</div>
                      <div className="mt-1 text-sm font-black text-white">{money(amount)}</div>
                    </div>
                  ))}
                </div>
                {canReconcile ? (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button type="button" className={btnClass} disabled={working || !summary}
                      onClick={() => {
                        if (!window.confirm("Confirm you have reviewed ALL income and expense transactions for " + month + ". This attests to completeness but does not constitute an audit.")) return;
                        perform(() => api.patch("/business-finance/settings/", {
                          expenses_reconciled_through: reconciledThrough(),
                        }), "Month marked owner-reconciled.");
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Mark books reconciled through {month}
                    </button>
                    {summary?.reconciled ? (
                      <button type="button" className={secondaryClass} disabled={working}
                        onClick={() => perform(
                          () => api.patch("/business-finance/settings/", { expenses_reconciled_through: null }),
                          "Books reopened for review.",
                        )}
                      >Reopen books</button>
                    ) : null}
                  </div>
                ) : <p className="mt-3 text-xs text-slate-500">Only completed prior months can be marked reconciled.</p>}
              </GlassCard>

              <div className="grid gap-3 sm:grid-cols-2">
                <button className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 text-left" onClick={() => setTab("jobs")}>
                  <ClipboardCheck className="mb-2 h-5 w-5 text-fuchsia-300" />
                  <div className="font-black text-white">Job Profitability</div>
                  <div className="mt-1 text-xs text-slate-400">Verify job costs before confirming contribution and margin.</div>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-black text-cyan-200">Review jobs <ArrowRight className="h-3.5 w-3.5" /></span>
                </button>
                <button className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 text-left" onClick={() => setTab("forecast")}>
                  <CircleDollarSign className="mb-2 h-5 w-5 text-emerald-300" />
                  <div className="font-black text-white">Cash Runway</div>
                  <div className="mt-1 text-xs text-slate-400">Current cash estimate: {money(cash?.estimated_cash_today)}</div>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-black text-cyan-200">Open forecast <ArrowRight className="h-3.5 w-3.5" /></span>
                </button>
              </div>
              <button type="button" className={secondaryClass} onClick={() => navigate("/sbo/reports")}>
                <ArrowLeft className="h-4 w-4" /> Business Intelligence
              </button>
            </>
          ) : null}

          {tab === "expenses" ? (
            <>
              <GlassCard title={expenseDraft.id ? "Edit Ledger Entry" : "Record an Expense or Job Cost"} subtitle="Labor: hours × hourly cost. Materials: quantity × unit cost. These are cost records, not customer invoices." tone="emerald">
                <form onSubmit={submitExpense} className="grid gap-3 sm:grid-cols-2">
                  <Field label="Cost description *">
                    <input className={inputClass} required maxLength={220} placeholder="e.g., 3 hours troubleshooting" value={expenseDraft.description}
                      onChange={(e) => setExpenseDraft({ ...expenseDraft, description: e.target.value })} />
                  </Field>
                  <Field label="Cost category">
                    <select className={inputClass} value={expenseDraft.category}
                      onChange={(e) => setExpenseDraft({ ...expenseDraft, category: e.target.value })}>
                      {CATEGORIES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                    </select>
                  </Field>
                  <Field label="Associated job (optional)">
                    <select className={inputClass} value={expenseDraft.ticket}
                      onChange={(e) => setExpenseDraft({ ...expenseDraft, ticket: e.target.value })}>
                      <option value="">Business overhead / unassigned</option>
                      {jobs.map((job) => <option key={job.ticket} value={job.ticket}>#{job.ticket} · {job.title}</option>)}
                    </select>
                  </Field>
                  <Field label="Record status">
                    <select className={inputClass} value={expenseDraft.status}
                      onChange={(e) => setExpenseDraft({ ...expenseDraft, status: e.target.value })}>
                      <option value="PLANNED">Planned (not incurred)</option>
                      <option value="INCURRED">Incurred / owed</option>
                      <option value="PAID">Paid</option>
                      <option value="VOID">Void</option>
                    </select>
                  </Field>
                  <Field label={expenseDraft.category === "LABOR" ? "Hours" : "Quantity"}>
                    <input className={inputClass} type="number" min="0.01" step="0.01" required value={expenseDraft.quantity}
                      onChange={(e) => setExpenseDraft({ ...expenseDraft, quantity: e.target.value })} />
                  </Field>
                  <Field label={expenseDraft.category === "LABOR" ? "Cost per hour ($)" : "Unit cost ($)"}>
                    <input className={inputClass} type="number" min="0" step="0.01" required value={expenseDraft.unit_cost}
                      onChange={(e) => setExpenseDraft({ ...expenseDraft, unit_cost: e.target.value })} />
                  </Field>
                  <Field label="Cost incurred on">
                    <input className={inputClass} type="date" required value={expenseDraft.incurred_on}
                      onChange={(e) => setExpenseDraft({ ...expenseDraft, incurred_on: e.target.value })} />
                  </Field>
                  <Field label="Due date (optional)">
                    <input className={inputClass} type="date" value={expenseDraft.due_on}
                      onChange={(e) => setExpenseDraft({ ...expenseDraft, due_on: e.target.value })} />
                  </Field>
                  {expenseDraft.status === "PAID" ? (
                    <Field label="Actual payment date (defaults to today)">
                      <input className={inputClass} type="date" value={expenseDraft.paid_on}
                        onChange={(e) => setExpenseDraft({ ...expenseDraft, paid_on: e.target.value })} />
                    </Field>
                  ) : null}
                  <Field label="Vendor / employee (optional)">
                    <input className={inputClass} maxLength={160} placeholder="Vendor or technician" value={expenseDraft.vendor}
                      onChange={(e) => setExpenseDraft({ ...expenseDraft, vendor: e.target.value })} />
                  </Field>
                  <Field label="Notes (optional)">
                    <input className={inputClass} placeholder="Material details or memo" value={expenseDraft.notes}
                      onChange={(e) => setExpenseDraft({ ...expenseDraft, notes: e.target.value })} />
                  </Field>
                  <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
                    <div>
                      <div className="text-[11px] text-slate-400">Calculated total</div>
                      <div className="text-xl font-black text-emerald-200">{money(expenseTotal)}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {expenseDraft.id ? <button type="button" className={secondaryClass} onClick={() => setExpenseDraft(expenseInitial())}>Cancel edit</button> : null}
                      <button type="submit" disabled={working || loading || !expenseDraft.description.trim()} className={btnClass}>
                        <Plus className="h-4 w-4" /> {expenseDraft.id ? "Save Changes" : "Save Expense"}
                      </button>
                    </div>
                  </div>
                </form>
              </GlassCard>

              <GlassCard title="Expense Ledger" subtitle="Business expenses are persistent and editable. Voiding preserves the audit trail." tone="indigo">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-400">{expenses.length} loaded entries · {recentExpenses.length} in selected month</span>
                  <span className="text-xs font-bold text-cyan-200">Recorded: {money(summary?.costs)}</span>
                </div>
                <div className="space-y-2">
                  {expenses.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="break-words text-sm font-black text-white">{entry.description}</div>
                          <div className="mt-1 text-[11px] text-slate-400">
                            {CATEGORY_LABEL[entry.category] || entry.category} · {entry.incurred_on} · {entry.status}
                            {entry.ticket ? " · Job #" + entry.ticket : ""}
                          </div>
                        </div>
                        <div className="shrink-0 text-sm font-black text-white">{money(entry.amount)}</div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button type="button" className={secondaryClass} onClick={() => editExpense(entry)}><Pencil className="h-3.5 w-3.5" /> Edit</button>
                        {entry.status === "INCURRED" || entry.status === "PLANNED" ? (
                          <button type="button" disabled={working} className={btnClass} onClick={() => perform(
                            () => api.patch("/business-finance/expenses/" + entry.id + "/", { status: "PAID" }),
                            "Expense marked paid.",
                          )}>Mark Paid</button>
                        ) : null}
                        {entry.status !== "VOID" ? (
                          <button type="button" disabled={working} className={secondaryClass} onClick={() => {
                            if (!window.confirm("Void this cost record? It will no longer count toward recorded costs.")) return;
                            perform(() => api.patch("/business-finance/expenses/" + entry.id + "/", { status: "VOID" }), "Expense voided.");
                          }}>Void</button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {!loading && !expenses.length ? <p className="rounded-xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-400">No expenses recorded yet. Add labor, materials or overhead above.</p> : null}
                </div>
              </GlassCard>
            </>
          ) : null}

          {tab === "jobs" ? (
            <GlassCard title="Job Cost & Margin Review" subtitle="A margin is confirmed only after revenue is collected and someone marks all job costs complete." tone="fuchsia">
              <div className="space-y-3">
                {jobs.map((job) => (
                  <div key={job.ticket} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-black text-white">#{job.ticket} · {job.title}</div>
                        <div className="mt-1 text-[11px] text-slate-400">{job.status} · {job.revenue_source.replaceAll("_", " ").toLowerCase()}</div>
                      </div>
                      <span className={"rounded-lg px-2 py-1 text-[10px] font-black " +
                        (job.verified ? "bg-emerald-500/15 text-emerald-200" : "bg-amber-500/10 text-amber-200")}>
                        {job.verified ? "Verified job costs" : "Provisional"}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Stat label="Collected" value={money(job.revenue)} sub="Verified payment only" />
                      <Stat label="Job Costs" value={money(job.tracked_cost)} sub={"Labor " + money(job.labor) + " · Materials " + money(job.materials)} />
                      <Stat label="Contribution" value={money(job.contribution)} sub="Only after cost confirmation" />
                      <Stat label="Margin" value={pct(job.margin_percent)} sub="Collected less direct costs" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" className={btnClass} onClick={() => openJobCost(job)}><Plus className="h-4 w-4" /> Add Cost</button>
                      <button type="button" disabled={working} className={secondaryClass}
                        onClick={() => perform(
                          () => api.patch("/business-finance/jobs/" + job.ticket + "/review/", { costs_complete: !job.costs_complete }),
                          job.costs_complete ? "Job costs reopened." : "Job cost entry marked complete.",
                        )}
                      >
                        <CheckCircle2 className="h-4 w-4" /> {job.costs_complete ? "Reopen Costs" : "Confirm All Costs Logged"}
                      </button>
                      <button type="button" className={secondaryClass} onClick={() => navigate("/tickets/" + job.ticket)}>Open Ticket</button>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">This is a job contribution after directly assigned costs, excluding any unallocated overhead.</p>
                  </div>
                ))}
                {!loading && !jobs.length ? <p className="rounded-xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-400">No business tickets available to evaluate.</p> : null}
              </div>
            </GlassCard>
          ) : null}

          {tab === "forecast" ? (
            <>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                <Stat label="Cash Today (Estimated)" value={loading ? "…" : money(cash?.estimated_cash_today)} sub="Opening cash + confirmed receipts − paid costs" />
                <Stat label={days + "-Day Outlook"} value={loading ? "…" : money(cash?.projected_cash_end)} sub="Known planned entries only" />
                <Stat label="Scheduled Events" value={loading ? "…" : cash?.event_count ?? "—"} sub="Manual forecasts and unpaid expenses" />
              </div>
              <GlassCard title="Starting Cash Position" subtitle="Enter an actual reconciled bank/cash snapshot. Forecasting cannot produce a balance without it." tone="emerald">
                <form onSubmit={submitOpening} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <Field label="Reconciled opening cash ($)">
                    <input type="number" step="0.01" className={inputClass} value={cashDraft.opening_cash_balance} placeholder="e.g., 10000.00"
                      onChange={(e) => setCashDraft({ ...cashDraft, opening_cash_balance: e.target.value })} />
                  </Field>
                  <Field label="Balance as of (end of day)">
                    <input type="date" max={today()} className={inputClass} value={cashDraft.opening_cash_date}
                      onChange={(e) => setCashDraft({ ...cashDraft, opening_cash_date: e.target.value })} />
                  </Field>
                  <button type="submit" className={btnClass} disabled={working}>Save Cash Snapshot</button>
                </form>
                <p className="mt-3 text-[11px] leading-4 text-slate-500">Opening balance is a manual snapshot. Forecast uses future entered events and expenses with due dates; it does not assume new sales, payroll, rent or credit payments unless recorded.</p>
              </GlassCard>

              <GlassCard title="Add Future Cash Event" subtitle="Expected receipts or bills not otherwise captured by an expense due date. Avoid duplicate planned outflows." tone="cyan">
                <form onSubmit={submitForecast} className="grid gap-3 sm:grid-cols-2">
                  <Field label="Description">
                    <input className={inputClass} required maxLength={220} value={forecastDraft.description} placeholder="e.g., expected customer payment"
                      onChange={(e) => setForecastDraft({ ...forecastDraft, description: e.target.value })} />
                  </Field>
                  <Field label="Direction">
                    <select className={inputClass} value={forecastDraft.direction} onChange={(e) => setForecastDraft({ ...forecastDraft, direction: e.target.value })}>
                      <option value="IN">Expected money in</option>
                      <option value="OUT">Expected money out</option>
                    </select>
                  </Field>
                  <Field label="Expected amount ($)">
                    <input type="number" required min="0.01" step="0.01" className={inputClass} value={forecastDraft.amount}
                      onChange={(e) => setForecastDraft({ ...forecastDraft, amount: e.target.value })} />
                  </Field>
                  <Field label="Expected date">
                    <input type="date" required className={inputClass} value={forecastDraft.expected_on}
                      onChange={(e) => setForecastDraft({ ...forecastDraft, expected_on: e.target.value })} />
                  </Field>
                  <div className="sm:col-span-2 flex justify-end">
                    <button type="submit" className={btnClass} disabled={working}><Plus className="h-4 w-4" /> Add Forecast Entry</button>
                  </div>
                </form>
              </GlassCard>

              <GlassCard title="Known Future Events" subtitle="Planned items and bills due contribute to the forecast until settled or marked paid." tone="indigo">
                <div className="space-y-2">
                  {forecastEntries.map((item) => (
                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                      <div>
                        <div className="text-sm font-black text-white">{item.description}</div>
                        <div className="text-[11px] text-slate-400">{item.expected_on} · {item.direction === "IN" ? "Expected in" : "Expected out"} · {item.status}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={"text-sm font-black " + (item.direction === "IN" ? "text-emerald-200" : "text-amber-200")}>{money(item.amount)}</span>
                        {item.status === "PLANNED" ? <button type="button" className={secondaryClass} disabled={working} onClick={() => perform(
                          () => api.patch("/business-finance/forecast-items/" + item.id + "/", { status: "SETTLED" }),
                          "Forecast entry marked settled. Record actual money separately.",
                        )}>Settle</button> : null}
                        {item.status === "PLANNED" ? <button type="button" className={secondaryClass} disabled={working} onClick={() => perform(
                          () => api.patch("/business-finance/forecast-items/" + item.id + "/", { status: "CANCELLED" }),
                          "Forecast entry cancelled.",
                        )}>Cancel</button> : null}
                      </div>
                    </div>
                  ))}
                  {!forecastEntries.length && !loading ? <div className="p-3 text-sm text-slate-400">No cash plan entered.</div> : null}
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-400">{cash?.disclaimer}</p>
              </GlassCard>
            </>
          ) : null}
        </div>
      </div>
    </DashboardShell>
  );
}
