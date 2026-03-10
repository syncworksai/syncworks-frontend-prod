// src/components/upgrade/steps/Step3Billing.jsx
import React from "react";
import UpgradeCard from "../ui/UpgradeCard";
import UpgradeInfo from "../ui/UpgradeInfo";
import { MVP_PLAN_LABEL } from "../constants";

export default function Step3Billing({
  status,
  subStatus,
  billingExempt,
  setupComplete,
  businessSelected,
  lockCountdownLabel,
  loadingStatus,
  loadingSub,
  loadBillingStatus,
  loadSubscriptionStatus,
  setupCard,
  promoCode,
  setPromoCode,
  promoLoading,
  applyPromo,
}) {
  return (
    <UpgradeCard
      title="Step 3 — Billing 💳"
      subtitle="Attach a card on file to avoid being locked."
      badge={lockCountdownLabel()}
    >
      <div className="text-xs text-slate-400 mb-3">
        Plan: <span className="text-slate-200 font-semibold">{MVP_PLAN_LABEL}</span>
      </div>

      {!status ? (
        <div className="text-sm text-slate-400">Select a business to load billing status.</div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <UpgradeInfo label="Card on file" value={status.stripe_setup_complete ? "Yes" : "No"} />
            <UpgradeInfo label="Locked" value={status.is_locked ? "Yes" : "No"} />
            <UpgradeInfo label="Next due date" value={status.next_due_date || "-"} />
            <UpgradeInfo label="Grace until" value={status.grace_until || "-"} />
          </div>

          {!billingExempt && !setupComplete ? (
            <div className="mt-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">
              <div className="font-semibold">Action needed</div>
              <div className="text-[12px] text-rose-100/90 mt-1">
                Add a valid card to keep your account active.
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex gap-2 flex-wrap items-center">
            {!billingExempt ? (
              <button
                className="rounded-xl px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-sm"
                onClick={setupCard}
                disabled={!businessSelected}
                type="button"
              >
                {setupComplete ? "Update Card" : "Add Card on File"}
              </button>
            ) : (
              <div className="text-xs text-slate-500">Card not required due to promo exemption.</div>
            )}

            <button
              className="rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-xs"
              onClick={loadBillingStatus}
              disabled={loadingStatus}
              type="button"
            >
              {loadingStatus ? "Refreshing..." : "Refresh billing"}
            </button>
          </div>

          <div className="mt-5 pt-5 border-t border-slate-800">
            <div className="text-sm font-semibold mb-2">Subscription status</div>

            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <UpgradeInfo label="Status" value={subStatus?.subscription_status || "—"} />
              <UpgradeInfo label="Subscription ID" value={subStatus?.subscription_id || "—"} mono />
            </div>

            <div className="mt-3">
              <button
                className="rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-xs"
                onClick={loadSubscriptionStatus}
                disabled={loadingSub}
                type="button"
              >
                {loadingSub ? "Refreshing..." : "Refresh subscription"}
              </button>
            </div>
          </div>
        </>
      )}

      <div className="mt-5 pt-5 border-t border-slate-800">
        <div className="text-sm font-semibold mb-2">Promo code 🎟️</div>
        <div className="text-xs text-slate-400 mb-3">Have a promo code? Check your email, then enter it here.</div>

        <div className="flex gap-2 flex-wrap">
          <input
            className="flex-1 min-w-[220px] bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono"
            placeholder="Enter promo code"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            disabled={!businessSelected}
          />
          <button
            className="rounded-xl px-4 py-2 bg-indigo-500/20 border border-indigo-500/40 hover:bg-indigo-500/30 text-sm disabled:opacity-60"
            onClick={applyPromo}
            disabled={promoLoading || !promoCode.trim() || !businessSelected}
            type="button"
          >
            {promoLoading ? "Applying..." : "Apply Code"}
          </button>
        </div>
      </div>
    </UpgradeCard>
  );
}