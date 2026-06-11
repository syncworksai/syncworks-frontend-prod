// src/pages/CustomerFinance.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import ModeBar from "../components/ModeBar";
import PaidGate from "../components/paid/PaidGate";

const STRIPE_FINANCE_CHECKOUT_URL = "https://buy.stripe.com/6oU00jgX07eT3qFgJl2Nq0c";
const FINANCE_LOGO_URL = "/brands/finance.jpg";

const SNAPSHOT_KEY = "sw_customer_money_snapshot_v1";
const BILLS_KEY = "sw_customer_finance_bills_v1";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function money(value) {
  const n = Number(value || 0);

  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

function safeNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // no-op
  }
}

function todayYmd() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function prettyDate(value) {
  if (!value) return "Not set";

  const d = new Date(`${value}T00:00:00`);
  if (!Number.isFinite(d.getTime())) return value;

  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(value) {
  if (!value) return null;

  const due = new Date(`${value}T00:00:00`);
  if (!Number.isFinite(due.getTime())) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function coverageTone(percent) {
  if (percent >= 100) return "emerald";
  if (percent >= 75) return "cyan";
  if (percent >= 40) return "amber";
  return "rose";
}

function Card({ title, subtitle, right, children, tone = "slate", className = "" }) {
  const tones = {
    cyan: "border-cyan-400/20 bg-cyan-500/10",
    amber: "border-amber-400/20 bg-amber-500/10",
    emerald: "border-emerald-400/20 bg-emerald-500/10",
    fuchsia: "border-fuchsia-400/20 bg-fuchsia-500/10",
    indigo: "border-indigo-400/20 bg-indigo-500/10",
    rose: "border-rose-400/20 bg-rose-500/10",
    slate: "border-white/10 bg-white/[0.03]",
  };

  return (
    <section
      className={cx(
        "rounded-[1.65rem] border p-4 shadow-[0_18px_60px_rgba(0,0,0,0.24)]",
        tones[tone] || tones.slate,
        className
      )}
    >
      {(title || subtitle || right) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? <h3 className="text-base font-black text-white">{title}</h3> : null}
            {subtitle ? <p className="mt-1 text-xs leading-5 text-slate-400">{subtitle}</p> : null}
          </div>

          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      )}

      {children}
    </section>
  );
}

function Pill({ children, tone = "slate" }) {
  const tones = {
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-200",
    amber: "border-amber-500/25 bg-amber-500/10 text-amber-200",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
    fuchsia: "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-200",
    indigo: "border-indigo-500/25 bg-indigo-500/10 text-indigo-200",
    rose: "border-rose-500/25 bg-rose-500/10 text-rose-200",
    slate: "border-white/10 bg-white/[0.04] text-slate-300",
  };

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]",
        tones[tone] || tones.slate
      )}
    >
      {children}
    </span>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "", prefix = "" }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-slate-400">{label}</div>

      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
            {prefix}
          </span>
        ) : null}

        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cx(
            "h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40",
            prefix && "pl-8"
          )}
        />
      </div>
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-slate-400">{label}</div>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-slate-100 outline-none transition focus:border-cyan-400/40"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function ProgressBar({ percent, tone = "cyan" }) {
  const fill =
    tone === "emerald"
      ? "bg-emerald-400"
      : tone === "amber"
      ? "bg-amber-400"
      : tone === "rose"
      ? "bg-rose-400"
      : "bg-cyan-400";

  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-slate-950/70">
      <div
        className={cx("h-full rounded-full transition-all", fill)}
        style={{ width: `${Math.max(0, Math.min(100, percent || 0))}%` }}
      />
    </div>
  );
}

export default function CustomerFinance() {
  const nav = useNavigate();

  const [form, setForm] = useState(() => {
    const saved = readJson(SNAPSHOT_KEY, null);

    return {
      monthly_bills: saved?.monthly_bills ?? "",
      covered_amount: saved?.covered_amount ?? "",
      mortgage_label: saved?.mortgage_label ?? "Mortgage / Rent",
      mortgage_amount: saved?.mortgage_amount ?? "",
      mortgage_due_date: saved?.mortgage_due_date ?? "",
      emergency_buffer: saved?.emergency_buffer ?? "",
      top_priority: saved?.top_priority ?? "",
      spending_status: saved?.spending_status ?? "Normal",
    };
  });

  const [bills, setBills] = useState(() => {
    const saved = readJson(BILLS_KEY, null);

    if (Array.isArray(saved) && saved.length) return saved;

    return [
      { id: "bill-mortgage", name: "Mortgage / Rent", amount: "", due_day: "1", status: "Planned" },
      { id: "bill-auto", name: "Auto / Insurance", amount: "", due_day: "10", status: "Planned" },
      { id: "bill-utilities", name: "Utilities", amount: "", due_day: "15", status: "Planned" },
    ];
  });

  const monthlyBills = safeNumber(form.monthly_bills);
  const coveredAmount = safeNumber(form.covered_amount);
  const emergencyBuffer = safeNumber(form.emergency_buffer);
  const coveredPercent = monthlyBills > 0 ? Math.min(100, Math.round((coveredAmount / monthlyBills) * 100)) : 0;
  const remaining = Math.max(0, monthlyBills - coveredAmount);
  const mainPaymentAmount = safeNumber(form.mortgage_amount);
  const mainPaymentDays = daysUntil(form.mortgage_due_date);
  const billTotal = bills.reduce((sum, bill) => sum + safeNumber(bill.amount), 0);
  const readyBills = bills.filter((bill) => bill.status === "Ready" || bill.status === "Paid").length;
  const paidBills = bills.filter((bill) => bill.status === "Paid").length;
  const coverage = coverageTone(coveredPercent);

  const readinessLabel =
    coveredPercent >= 100
      ? "Covered"
      : coveredPercent >= 75
      ? "Close"
      : coveredPercent >= 40
      ? "Watch"
      : "Needs Attention";

  const nextAction =
    coveredPercent >= 100
      ? "Your required monthly bills are covered. Keep tracking paid status and upcoming due dates."
      : remaining > 0
      ? `You still need ${money(remaining)} to fully cover this month. Prioritize required bills first.`
      : "Add your monthly bills and covered amount to activate your money snapshot.";

  const snapshot = useMemo(() => {
    return {
      monthly_bills: monthlyBills,
      covered_amount: coveredAmount,
      covered_percent: coveredPercent,
      mortgage_label: form.mortgage_label,
      mortgage_amount: mainPaymentAmount,
      mortgage_due_date: form.mortgage_due_date,
      emergency_buffer: emergencyBuffer,
      top_priority: form.top_priority,
      spending_status: form.spending_status,
      bill_count: bills.length,
      ready_bill_count: readyBills,
      paid_bill_count: paidBills,
      updated_at: new Date().toISOString(),
    };
  }, [
    monthlyBills,
    coveredAmount,
    coveredPercent,
    form,
    mainPaymentAmount,
    emergencyBuffer,
    bills.length,
    readyBills,
    paidBills,
  ]);

  useEffect(() => {
    writeJson(SNAPSHOT_KEY, snapshot);
  }, [snapshot]);

  useEffect(() => {
    writeJson(BILLS_KEY, bills);
  }, [bills]);

  function updateBill(id, patch) {
    setBills((prev) =>
      prev.map((bill) => {
        if (bill.id !== id) return bill;
        return { ...bill, ...patch };
      })
    );
  }

  function addBill() {
    setBills((prev) => [
      ...prev,
      {
        id: `bill-${Date.now()}`,
        name: "New Bill",
        amount: "",
        due_day: "",
        status: "Planned",
      },
    ]);
  }

  function removeBill(id) {
    setBills((prev) => prev.filter((bill) => bill.id !== id));
  }

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#020617] text-slate-100">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[#020617]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(217,70,239,0.10),transparent_32%),radial-gradient(circle_at_bottom,rgba(99,102,241,0.12),transparent_38%)]" />
      </div>

      <ModeBar
        title="Money"
        subtitle="Bills • coverage • payment readiness • personal finance systems"
        rightActions={
          <button
            type="button"
            onClick={() => nav("/customer")}
            className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
          >
            Back
          </button>
        }
      />

      <main className="relative mx-auto max-w-6xl px-3 pb-12 pt-4 sm:px-5">
        <PaidGate
          entitlementKey="finance"
          title="Money Hub"
          subtitle="Track bills, payment readiness, required expenses, and monthly priorities."
          checkoutUrl={STRIPE_FINANCE_CHECKOUT_URL}
          ctaTo="/upgrade"
          ctaLabel="View plans / Upgrade"
          iconUrl={FINANCE_LOGO_URL}
        >
          <div className="space-y-5">
            <section className="relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-slate-950/65 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.28)] md:p-6">
              <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-amber-500/12 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-28 left-1/4 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

              <div className="relative">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-200/90">
                      SyncWorks Money
                    </div>

                    <h1 className="mt-2 text-2xl font-black tracking-tight text-white md:text-4xl">
                      Monthly money command center
                    </h1>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                      Keep required bills, due dates, coverage, and priorities organized before the month gets noisy.
                    </p>
                  </div>

                  <Pill tone={coverage}>{readinessLabel}</Pill>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <Card tone="amber" className="shadow-none">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-200">
                      Monthly Bills
                    </div>
                    <div className="mt-2 text-3xl font-black text-white">{money(monthlyBills)}</div>
                    <div className="mt-1 text-xs text-slate-400">{bills.length} tracked bills</div>
                  </Card>

                  <Card tone="cyan" className="shadow-none">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-200">
                      Covered
                    </div>
                    <div className="mt-2 text-3xl font-black text-white">{money(coveredAmount)}</div>
                    <div className="mt-3">
                      <ProgressBar percent={coveredPercent} tone={coverage} />
                    </div>
                    <div className="mt-1 text-xs text-slate-400">{coveredPercent}% ready</div>
                  </Card>

                  <Card tone={remaining > 0 ? "fuchsia" : "emerald"} className="shadow-none">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-300">
                      Remaining
                    </div>
                    <div className="mt-2 text-3xl font-black text-white">{money(remaining)}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      Buffer: {money(emergencyBuffer)}
                    </div>
                  </Card>
                </div>
              </div>
            </section>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
              <div className="space-y-5">
                <Card
                  title="Monthly Snapshot"
                  subtitle="Updates your customer dashboard and Life Schedule automatically."
                  tone="cyan"
                  right={<Pill tone="cyan">Synced</Pill>}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      label="Total monthly bills"
                      value={form.monthly_bills}
                      onChange={(value) => setForm((p) => ({ ...p, monthly_bills: value }))}
                      type="number"
                      prefix="$"
                      placeholder="3500"
                    />

                    <Field
                      label="Amount covered / ready"
                      value={form.covered_amount}
                      onChange={(value) => setForm((p) => ({ ...p, covered_amount: value }))}
                      type="number"
                      prefix="$"
                      placeholder="2200"
                    />

                    <Field
                      label="Main payment label"
                      value={form.mortgage_label}
                      onChange={(value) => setForm((p) => ({ ...p, mortgage_label: value }))}
                      placeholder="Mortgage / Rent"
                    />

                    <Field
                      label="Main payment amount"
                      value={form.mortgage_amount}
                      onChange={(value) => setForm((p) => ({ ...p, mortgage_amount: value }))}
                      type="number"
                      prefix="$"
                      placeholder="1850"
                    />

                    <Field
                      label="Main payment due date"
                      value={form.mortgage_due_date}
                      onChange={(value) => setForm((p) => ({ ...p, mortgage_due_date: value }))}
                      type="date"
                    />

                    <Field
                      label="Emergency buffer"
                      value={form.emergency_buffer}
                      onChange={(value) => setForm((p) => ({ ...p, emergency_buffer: value }))}
                      type="number"
                      prefix="$"
                      placeholder="1000"
                    />

                    <SelectField
                      label="Spending status"
                      value={form.spending_status}
                      onChange={(value) => setForm((p) => ({ ...p, spending_status: value }))}
                      options={["Normal", "Tight", "Hold Spending", "Extra Available"]}
                    />
                  </div>

                  <label className="mt-3 block">
                    <div className="mb-1 text-xs font-semibold text-slate-400">
                      Top money priority
                    </div>

                    <textarea
                      value={form.top_priority}
                      onChange={(e) => setForm((p) => ({ ...p, top_priority: e.target.value }))}
                      placeholder="Example: cover mortgage first, then utilities, then reduce credit card balance."
                      rows={3}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40"
                    />
                  </label>
                </Card>

                <Card
                  title="Bill List"
                  subtitle="Track recurring bills, due days, readiness, and paid status."
                  tone="amber"
                  right={
                    <button
                      type="button"
                      onClick={addBill}
                      className="rounded-2xl border border-amber-400/25 bg-amber-500/12 px-3 py-2 text-xs font-black text-amber-100 hover:bg-amber-500/18"
                    >
                      + Bill
                    </button>
                  }
                >
                  <div className="space-y-3">
                    {bills.map((bill) => (
                      <div
                        key={bill.id}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                      >
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px_110px]">
                          <Field
                            label="Bill"
                            value={bill.name}
                            onChange={(value) => updateBill(bill.id, { name: value })}
                            placeholder="Power bill"
                          />

                          <Field
                            label="Amount"
                            value={bill.amount}
                            onChange={(value) => updateBill(bill.id, { amount: value })}
                            type="number"
                            prefix="$"
                            placeholder="150"
                          />

                          <Field
                            label="Due day"
                            value={bill.due_day}
                            onChange={(value) => updateBill(bill.id, { due_day: value })}
                            type="number"
                            placeholder="15"
                          />
                        </div>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <select
                            value={bill.status}
                            onChange={(e) => updateBill(bill.id, { status: e.target.value })}
                            className="h-10 rounded-2xl border border-white/10 bg-slate-950/70 px-3 text-xs font-semibold text-slate-200 outline-none"
                          >
                            <option>Planned</option>
                            <option>Ready</option>
                            <option>Paid</option>
                            <option>Watch</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => removeBill(bill.id)}
                            className="h-10 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-3 text-xs font-black text-rose-100 hover:bg-rose-500/15"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-xs text-slate-400">Bill list total</div>
                      <div className="mt-1 text-xl font-black text-white">{money(billTotal)}</div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-xs text-slate-400">Ready / paid</div>
                      <div className="mt-1 text-xl font-black text-white">
                        {readyBills}/{bills.length}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-xs text-slate-400">Paid</div>
                      <div className="mt-1 text-xl font-black text-white">{paidBills}</div>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="space-y-5">
                <Card title="Required Payment" subtitle="Your most important recurring payment." tone="indigo">
                  <div className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-4">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-indigo-200">
                      {form.mortgage_label || "Mortgage / Rent"}
                    </div>

                    <div className="mt-2 text-3xl font-black text-white">
                      {money(mainPaymentAmount)}
                    </div>

                    <div className="mt-2 text-sm text-slate-300">
                      Due {prettyDate(form.mortgage_due_date)}
                    </div>

                    {mainPaymentDays != null ? (
                      <div
                        className={cx(
                          "mt-3 rounded-2xl border px-3 py-2 text-xs font-black",
                          mainPaymentDays < 0
                            ? "border-rose-500/25 bg-rose-500/10 text-rose-100"
                            : mainPaymentDays <= 3
                            ? "border-amber-500/25 bg-amber-500/10 text-amber-100"
                            : "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
                        )}
                      >
                        {mainPaymentDays < 0
                          ? `${Math.abs(mainPaymentDays)} day(s) overdue`
                          : mainPaymentDays === 0
                          ? "Due today"
                          : `${mainPaymentDays} day(s) away`}
                      </div>
                    ) : null}
                  </div>
                </Card>

                <Card title="Money Priority" subtitle="Clear next action." tone={coverage}>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-sm font-black text-white">{readinessLabel}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-400">{nextAction}</div>
                  </div>

                  {form.top_priority ? (
                    <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-xs text-slate-400">Your priority</div>
                      <div className="mt-1 text-sm leading-6 text-slate-200">{form.top_priority}</div>
                    </div>
                  ) : null}
                </Card>

                <Card title="Systems" subtitle="Simple operating rules." tone="slate">
                  <div className="space-y-3">
                    {[
                      "Cover required payments before optional spending.",
                      "Review upcoming due dates once per week.",
                      "Mark bills Ready before they are paid.",
                      "Use Watch for anything that could create pressure.",
                    ].map((item, index) => (
                      <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                          Rule {index + 1}
                        </div>
                        <div className="mt-1 text-sm leading-6 text-slate-300">{item}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </PaidGate>
      </main>
    </div>
  );
}