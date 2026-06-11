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

function Card({ title, subtitle, right, children, tone = "slate", className = "" }) {
  const tones = {
    cyan: "border-cyan-400/20 bg-cyan-500/10",
    amber: "border-amber-400/20 bg-amber-500/10",
    emerald: "border-emerald-400/20 bg-emerald-500/10",
    fuchsia: "border-fuchsia-400/20 bg-fuchsia-500/10",
    indigo: "border-indigo-400/20 bg-indigo-500/10",
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
  const coveredPercent = monthlyBills > 0 ? Math.min(100, Math.round((coveredAmount / monthlyBills) * 100)) : 0;
  const remaining = Math.max(0, monthlyBills - coveredAmount);

  const snapshot = useMemo(() => {
    return {
      monthly_bills: monthlyBills,
      covered_amount: coveredAmount,
      covered_percent: coveredPercent,
      mortgage_label: form.mortgage_label,
      mortgage_amount: safeNumber(form.mortgage_amount),
      mortgage_due_date: form.mortgage_due_date,
      emergency_buffer: safeNumber(form.emergency_buffer),
      top_priority: form.top_priority,
      updated_at: new Date().toISOString(),
    };
  }, [monthlyBills, coveredAmount, coveredPercent, form]);

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

  const billTotal = bills.reduce((sum, bill) => sum + safeNumber(bill.amount), 0);

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#020617] text-slate-100">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[#020617]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(217,70,239,0.10),transparent_32%),radial-gradient(circle_at_bottom,rgba(99,102,241,0.12),transparent_38%)]" />
      </div>

      <ModeBar
        title="Money"
        subtitle="Bills • payment readiness • priorities • personal finance ops"
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
          subtitle="Track recurring bills, payment readiness, priorities, and personal finance systems."
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
                      Your monthly money snapshot
                    </h1>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                      Start manual first: mortgage, rent, utilities, subscriptions, and payment readiness.
                      Later we can connect bank/payment links as a paid automation add-on.
                    </p>
                  </div>

                  <Pill tone={coveredPercent >= 80 ? "emerald" : coveredPercent > 0 ? "amber" : "slate"}>
                    {coveredPercent ? `${coveredPercent}% Covered` : "Setup"}
                  </Pill>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <Card tone="amber" className="shadow-none">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-200">
                      Monthly Bills
                    </div>
                    <div className="mt-2 text-3xl font-black text-white">{money(monthlyBills)}</div>
                  </Card>

                  <Card tone="cyan" className="shadow-none">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-200">
                      Covered / Ready
                    </div>
                    <div className="mt-2 text-3xl font-black text-white">{money(coveredAmount)}</div>
                  </Card>

                  <Card tone={remaining > 0 ? "fuchsia" : "emerald"} className="shadow-none">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-300">
                      Remaining
                    </div>
                    <div className="mt-2 text-3xl font-black text-white">{money(remaining)}</div>
                  </Card>
                </div>
              </div>
            </section>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
              <div className="space-y-5">
                <Card
                  title="Bill Coverage Setup"
                  subtitle="This updates the Money card on the customer dashboard."
                  tone="cyan"
                  right={<Pill tone="cyan">Dashboard Sync</Pill>}
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
                      label="Amount already covered / ready"
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
                  </div>

                  <label className="mt-3 block">
                    <div className="mb-1 text-xs font-semibold text-slate-400">
                      Today’s top money priority
                    </div>

                    <textarea
                      value={form.top_priority}
                      onChange={(e) => setForm((p) => ({ ...p, top_priority: e.target.value }))}
                      placeholder="Example: cover mortgage first, then reduce credit card balance, then cancel unused subscriptions."
                      rows={3}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40"
                    />
                  </label>
                </Card>

                <Card
                  title="Recurring Bill List"
                  subtitle="Manual tracker for mortgage, rent, utilities, auto, insurance, subscriptions, and more."
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

                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-xs text-slate-400">Manual bill list total</div>
                    <div className="mt-1 text-2xl font-black text-white">{money(billTotal)}</div>
                  </div>
                </Card>
              </div>

              <div className="space-y-5">
                <Card title="Top 3 Priorities" subtitle="Simple money operating system." tone="indigo">
                  <div className="space-y-3">
                    {[
                      "Protect required payments first.",
                      "Know what is covered before spending extra.",
                      "Build repeatable systems, then automate later.",
                    ].map((item, idx) => (
                      <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="text-[11px] font-black uppercase tracking-[0.14em] text-indigo-200">
                          Priority {idx + 1}
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-200">{item}</div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="Linked Payments Add-On" subtitle="Future paid automation layer." tone="fuchsia">
                  <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-4">
                    <div className="text-sm font-black text-fuchsia-100">
                      Later: connect payment accounts.
                    </div>
                    <div className="mt-2 text-xs leading-5 text-slate-400">
                      SyncWorks can eventually detect recurring bills, show bill coverage percentage,
                      remind before due dates, and surface cashflow pressure.
                    </div>
                  </div>
                </Card>

                <Card title="Important Note" subtitle="Personal finance ops only." tone="slate">
                  <div className="text-sm leading-6 text-slate-400">
                    This module should stay focused on budgeting, bills, planning, organization,
                    and payment readiness. No trading or investing advice.
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