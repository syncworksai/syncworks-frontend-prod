// src/components/customer-health/AICoachUpgradeDrawer.jsx
import React from "react";

const AI_COACH_CHECKOUT_URL =
  "https://buy.stripe.com/5kQfZh4ae2YD3qF8cP2Nq0j";

const FEATURES = [
  "AI meal analysis for restaurant and homemade food",
  "Personalized macro and nutrition guidance",
  "What should I eat next? recommendations",
  "Adaptive workout and recovery coaching",
  "Faster logging with editable AI estimates",
  "Future barcode and meal-photo recognition",
];

export default function AICoachUpgradeDrawer({
  open,
  onClose,
  onContinueFree,
}) {
  if (!open) return null;

  function startCheckout() {
    window.location.assign(
      AI_COACH_CHECKOUT_URL
    );
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/85 p-0 backdrop-blur-xl sm:items-center sm:p-3">
      <button
        type="button"
        aria-label="Close AI Coach upgrade"
        onClick={onClose}
        className="absolute inset-0"
      />

      <section className="relative z-[151] h-[100dvh] w-full max-w-xl overflow-y-auto border border-fuchsia-300/25 bg-[radial-gradient(circle_at_top_left,rgba(255,59,212,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(52,223,255,0.10),transparent_30%),linear-gradient(180deg,#08111f,#030712)] p-4 pb-24 shadow-[0_28px_90px_rgba(0,0,0,0.78)] sm:h-auto sm:max-h-[92vh] sm:rounded-[2rem] sm:p-6">
        <div className="sticky top-0 z-10 -mx-4 -mt-4 flex items-start justify-between gap-3 border-b border-white/10 bg-[#08111f]/95 px-4 py-3 backdrop-blur-xl sm:static sm:mx-0 sm:mt-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-200">
              SyncWorks AI Coach
            </div>

            <h2 className="mt-1 text-2xl font-black leading-tight text-white sm:text-3xl">
              Upgrade your daily coaching
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sm font-black text-white"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 rounded-[1.6rem] border border-fuchsia-300/25 bg-gradient-to-br from-fuchsia-300/12 to-cyan-300/8 p-5">
          <div className="flex items-end gap-2">
            <div className="text-4xl font-black text-white">
              $4.99
            </div>

            <div className="pb-1 text-sm font-black text-slate-400">
              /month
            </div>
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-300">
            Unlock AI-powered nutrition and coaching while keeping the rest of SyncWorks Health available.
          </p>

          <div className="mt-5 space-y-2.5">
            {FEATURES.map((feature) => (
              <div
                key={feature}
                className="flex items-start gap-3 rounded-xl border border-white/8 bg-black/20 px-3 py-2.5"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lime-300/15 text-xs font-black text-lime-200">
                  ✓
                </span>

                <span className="text-sm font-bold leading-5 text-slate-200">
                  {feature}
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={startCheckout}
            className="mt-5 h-12 w-full rounded-2xl border border-fuchsia-300/35 bg-gradient-to-r from-fuchsia-400/25 to-cyan-300/20 text-sm font-black text-white shadow-[0_0_30px_rgba(255,59,212,0.14)]"
          >
            Start AI Coach - $4.99/month
          </button>

          <div className="mt-3 text-center text-[11px] font-bold leading-5 text-slate-500">
            Secure checkout through Stripe. Cancel anytime.
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.15em] text-cyan-200">
            Keep using Health for free
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Workouts, manual nutrition logging, progress tracking, macros, and planning remain available while AI Coach is an optional upgrade.
          </p>

          <button
            type="button"
            onClick={onContinueFree || onClose}
            className="mt-3 h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] text-xs font-black text-slate-200"
          >
            Continue With Free Health
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-[11px] leading-5 text-slate-400">
          Payment currently opens Stripe checkout. Account activation and subscription verification will be connected in the next backend phase.
        </div>
      </section>
    </div>
  );
}
