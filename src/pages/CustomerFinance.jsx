// src/pages/CustomerFinance.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import ModeBar from "../components/ModeBar";
import PaidGate from "../components/paid/PaidGate";

const STRIPE_FINANCE_CHECKOUT_URL = "https://buy.stripe.com/6oU00jgX07eT3qFgJl2Nq0c";

// ✅ Put your logo here:
// Place the image in: syncworks_v7_1_frontend/public/brands/finance.jpg
// Then this URL will work without imports (no build break).
const FINANCE_LOGO_URL = "/brands/finance.jpg";

export default function CustomerFinance() {
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="Finance Ops"
        subtitle="Priorities • Plans • Systems • History (no trading, no investing advice)"
        rightActions={
          <button
            onClick={() => nav("/customer")}
            className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
          >
            Back
          </button>
        }
      />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <PaidGate
          entitlementKey="finance"
          title="Finance Ops (Paid Add-On)"
          subtitle="A simple, repeatable personal finance operating system: priorities, time-horizon planning, templates, and history."
          checkoutUrl={STRIPE_FINANCE_CHECKOUT_URL}
          ctaTo="/upgrade"
          ctaLabel="View plans / Upgrade"
          iconUrl={FINANCE_LOGO_URL}
        >
          {/* Unlocked content (we’ll build the real module next) */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">You’re unlocked ✅</div>
                <div className="text-sm text-slate-300 mt-1">
                  Next we build the full Finance module screens: Snapshot → Top Priorities → Time Horizon Plan →
                  Systems/Templates → History.
                </div>
              </div>

              <button
                onClick={() => nav("/customer/settings")}
                className="shrink-0 text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
              >
                Settings
              </button>
            </div>

            <div className="mt-5 grid lg:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="text-xs text-slate-400">Snapshot</div>
                <div className="mt-2 text-sm text-slate-200">
                  A quick view of what matters right now: bills, cash buffer, debt pressure, and key goals.
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="text-xs text-slate-400">Today’s Top 3 Priorities</div>
                <div className="mt-2 text-sm text-slate-200">
                  Ranked tasks that keep you moving: pay, plan, reduce stress, automate, and follow-through.
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="text-xs text-slate-400">Time Horizon Plan</div>
                <div className="mt-2 text-sm text-slate-200">
                  Immediate • Tactical • Strategic planning so you don’t get trapped in “today-only” mode.
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="font-semibold">Coming next</div>
              <ul className="mt-2 space-y-1 text-sm text-slate-300 list-disc pl-5">
                <li>Questionnaire (risk tolerance, liquidity preference, debt stress, budgeting style, goals) → stored in CustomerSettings.finance_profile</li>
                <li>Finance plan history log (backend CRUD endpoints)</li>
                <li>Systems & Templates library (budget template, bill schedule, debt plan, automation checklist)</li>
                <li>Memory / history timeline (what you planned vs what happened)</li>
              </ul>
              <div className="mt-3 text-[11px] text-slate-500">
                Reminder: This module will never contain trading/investing advice. It’s personal finance ops only.
              </div>
            </div>
          </div>
        </PaidGate>
      </main>
    </div>
  );
}
