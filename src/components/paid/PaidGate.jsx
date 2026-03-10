// src/components/paid/PaidGate.jsx
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

/**
 * PaidGate
 * - Single, reusable paywall wrapper for paid modules (Finance / Health).
 * - Uses AuthContext.hasEntitlement("finance"|"health") as the source of truth.
 * - Superuser / platform admin bypass is handled by AuthContext.
 *
 * Props:
 *  - entitlementKey: "finance" | "health" (required)
 *  - title: string (optional)
 *  - subtitle: string (optional)
 *  - checkoutUrl: string (optional) -> direct Stripe payment link (opens new tab)
 *  - ctaTo: string (optional) default "/upgrade"
 *  - ctaLabel: string (optional) default "Upgrade"
 *  - iconUrl: string (optional) -> shows a small logo/avatar for the module
 *  - children: ReactNode
 */
export default function PaidGate({
  entitlementKey,
  title = "Locked Module",
  subtitle = "Upgrade to unlock this module.",
  checkoutUrl = "",
  ctaTo = "/upgrade",
  ctaLabel = "Upgrade",
  iconUrl = "",
  children,
}) {
  const nav = useNavigate();
  const { hasEntitlement, isGod } = useAuth();

  const unlocked = useMemo(() => {
    const k = String(entitlementKey || "").toLowerCase();
    if (!k) return false;
    return !!hasEntitlement(k);
  }, [entitlementKey, hasEntitlement]);

  if (unlocked) return <>{children}</>;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
      <div className="flex items-start gap-4">
        <div className="shrink-0">
          {iconUrl ? (
            <img
              src={iconUrl}
              alt=""
              className="h-14 w-14 rounded-2xl border border-slate-800 bg-slate-950 object-cover"
            />
          ) : (
            <div className="h-14 w-14 rounded-2xl border border-slate-800 bg-slate-950 flex items-center justify-center">
              <span className="text-lg">🔒</span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-lg font-semibold text-slate-100 truncate">{title}</div>
            {isGod ? (
              <span className="text-[11px] px-2 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-200">
                God Mode should bypass (check entitlements)
              </span>
            ) : null}
          </div>

          <div className="mt-1 text-sm text-slate-300">{subtitle}</div>

          <div className="mt-4 grid md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="text-xs text-slate-400">What you get</div>
              <ul className="mt-2 space-y-1 text-sm text-slate-200 list-disc pl-5">
                <li>Guided setup questionnaire</li>
                <li>Daily / weekly planning tools</li>
                <li>History + progress logging</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="text-xs text-slate-400">How unlock works</div>
              <ul className="mt-2 space-y-1 text-sm text-slate-200 list-disc pl-5">
                <li>Paid subscription</li>
                <li>Promo code redemption</li>
                <li>Platform admin bypass</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="text-xs text-slate-400">Security</div>
              <div className="mt-2 text-sm text-slate-200">
                Your access is enforced by the backend entitlements (single source of truth).
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => nav(ctaTo)}
              className="rounded-xl px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-sm font-semibold"
            >
              {ctaLabel}
            </button>

            {checkoutUrl ? (
              <a
                href={checkoutUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl px-4 py-2 bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-sm font-semibold"
              >
                Open Stripe Checkout
              </a>
            ) : null}

            <button
              type="button"
              onClick={() => nav("/customer")}
              className="rounded-xl px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-sm"
            >
              Back to Dashboard
            </button>
          </div>

          <div className="mt-3 text-[11px] text-slate-500">
            If you just paid and it still shows locked, log out/in or refresh — entitlements update after backend confirmation.
          </div>
        </div>
      </div>
    </div>
  );
}
