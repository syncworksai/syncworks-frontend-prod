// src/components/customer-health/AICoachUpgradeDrawer.jsx
import React, { useState } from "react";

import {
  redeemHealthAiPromo,
} from "../../api/customerHealth";

const AI_COACH_CHECKOUT_URL =
  import.meta.env.VITE_HEALTH_AI_CHECKOUT_URL || "";

const FEATURES = [
  "OpenAI-powered Fitness Coach conversations",
  "AI meal analysis for restaurant and homemade food",
  "Personalized macros, recovery, and nutrition guidance",
  "Adaptive recommendations validated by SyncWorks rules",
  "Editable calories, protein, carbs, fat, fiber, and sugar",
  "Manual workout and nutrition logging stays free",
];

export default function AICoachUpgradeDrawer({
  open,
  onClose,
  onContinueFree,
}) {
  const [promoCode, setPromoCode] = useState("");
  const [promoStatus, setPromoStatus] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  if (!open) return null;

  function startCheckout() {
    if (!AI_COACH_CHECKOUT_URL) {
      setPromoStatus(
        "Secure $9.99 checkout is being connected. Manual Health remains free."
      );
      return;
    }

    window.location.assign(AI_COACH_CHECKOUT_URL);
  }

  async function redeemPromo() {
    const clean = promoCode.trim();

    if (!clean || redeeming) return;

    setRedeeming(true);
    setPromoStatus("");

    try {
      const result = await redeemHealthAiPromo(clean);

      setPromoStatus(
        result?.message ||
          "Promotional AI access has been applied."
      );
      setPromoCode("");

      window.setTimeout(() => {
        onClose?.();
        window.location.reload();
      }, 900);
    } catch (error) {
      setPromoStatus(
        error?.response?.data?.detail ||
          "That promotional code could not be applied."
      );
    } finally {
      setRedeeming(false);
    }
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
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-200">
              Fitness + Nutrition AI
            </div>

            <h2 className="mt-1 text-2xl font-black leading-tight text-white sm:text-3xl">
              Add AI to your Health plan
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
              $9.99
            </div>

            <div className="pb-1 text-sm font-black text-slate-400">
              /month
            </div>
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-300">
            Unlock OpenAI-powered Fitness Coach conversations and fast AI nutrition analysis.
          </p>

          <div className="mt-5 space-y-2.5">
            {FEATURES.map((feature) => (
              <div
                key={feature}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5"
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
            className="mt-5 h-12 w-full rounded-2xl border border-fuchsia-300/35 bg-gradient-to-r from-fuchsia-400/25 to-cyan-300/20 text-sm font-black text-white"
          >
            Upgrade to Fitness + Nutrition AI
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.15em] text-cyan-200">
            Have a promotional code?
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={promoCode}
              onChange={(event) =>
                setPromoCode(event.target.value)
              }
              placeholder="Enter code"
              className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-black uppercase text-white outline-none"
            />

            <button
              type="button"
              disabled={!promoCode.trim() || redeeming}
              onClick={redeemPromo}
              className="h-11 rounded-xl border border-cyan-300/30 bg-cyan-300/15 px-4 text-xs font-black text-cyan-100 disabled:opacity-40"
            >
              {redeeming ? "Applying…" : "Apply"}
            </button>
          </div>

          {promoStatus ? (
            <div className="mt-3 text-xs font-bold leading-5 text-slate-300">
              {promoStatus}
            </div>
          ) : null}
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.15em] text-lime-200">
            Free Health remains available
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Manual workouts, manual meal logging, progress tracking, macros, and planning remain free.
          </p>

          <button
            type="button"
            onClick={onContinueFree || onClose}
            className="mt-3 h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] text-xs font-black text-slate-200"
          >
            Continue With Free Health
          </button>
        </div>
      </section>
    </div>
  );
}