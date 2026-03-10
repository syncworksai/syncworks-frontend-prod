// src/components/StripeConnectCTA.jsx
import React, { useEffect, useMemo, useState } from "react";
import api, { getActiveBusinessId, setActiveBusinessId } from "../api/client";

/**
 * Stripe Connect (Express) CTA
 *
 * Backend endpoints:
 *   POST /connect/express/start/
 *   GET  /connect/express/status/
 *
 * Business scoping:
 *   X-Business-Id header is sent automatically by api/client.js
 *
 * Usage:
 *   <StripeConnectCTA />
 *   <StripeConnectCTA businessId={someId} />
 */
export default function StripeConnectCTA({
  businessId = null,
  title = "Get Paid (Connect Stripe)",
  subtitle = "Connect your business to Stripe so payouts can go to your bank automatically.",
  className = "",
  compact = false,
}) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const effectiveBizId = useMemo(() => {
    return String(businessId || getActiveBusinessId() || "").trim();
  }, [businessId]);

  async function fetchStatus() {
    setErr("");
    if (!effectiveBizId) {
      setStatus({ missingBiz: true });
      return;
    }

    try {
      // ensure header is set in api interceptor
      setActiveBusinessId(effectiveBizId);

      const res = await api.get("/connect/express/status/");
      setStatus(res.data || {});
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to load Stripe Connect status.");
      setStatus(null);
    }
  }

  useEffect(() => {
    fetchStatus();

    // Refresh when auth changes or active business changes
    const fnAuth = () => fetchStatus();
    const fnBiz = () => fetchStatus();

    window.addEventListener("sw:authChanged", fnAuth);
    window.addEventListener("sw:activeBusinessChanged", fnBiz);

    return () => {
      window.removeEventListener("sw:authChanged", fnAuth);
      window.removeEventListener("sw:activeBusinessChanged", fnBiz);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveBizId]);

  async function startOnboarding() {
    setErr("");
    if (!effectiveBizId) {
      setErr("Select an active business first.");
      return;
    }
    setBusy(true);
    try {
      setActiveBusinessId(effectiveBizId);

      // This creates or reuses the Express account and returns an onboarding link.
      // For "Manage", Stripe will usually take them through update/finish flow as needed.
      const res = await api.post("/connect/express/start/");
      const url = res?.data?.url;
      if (!url) throw new Error("No onboarding URL returned.");

      window.location.href = url;
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Unable to start Stripe onboarding.");
    } finally {
      setBusy(false);
    }
  }

  const connected = Boolean(status?.connected || status?.stripe_connect_account_id);
  const chargesEnabled = Boolean(status?.charges_enabled);
  const payoutsEnabled = Boolean(status?.payouts_enabled);

  // ✅ Backend returns onboarding_completed (not onboarding_complete)
  const onboardingComplete = Boolean(status?.onboarding_completed || (chargesEnabled && payoutsEnabled));

  const acct = status?.stripe_connect_account_id || "";

  const badge = onboardingComplete
    ? { text: "Connected", tone: "bg-emerald-500/15 text-emerald-200 border-emerald-400/20" }
    : connected
    ? { text: "Needs Setup", tone: "bg-amber-500/15 text-amber-200 border-amber-400/20" }
    : { text: "Not Connected", tone: "bg-zinc-500/15 text-zinc-200 border-zinc-400/20" };

  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 p-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${badge.tone}`}>{badge.text}</span>
          </div>
          {!compact && <p className="mt-1 text-xs text-white/70">{subtitle}</p>}
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchStatus}
            disabled={busy}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10 disabled:opacity-50"
          >
            Refresh
          </button>

          <button
            onClick={startOnboarding}
            disabled={busy || !effectiveBizId}
            className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-black hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Opening…" : onboardingComplete ? "Manage" : "Connect"}
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-white/70 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-black/20 p-2">
          <div className="text-[11px] text-white/50">Business</div>
          <div className="truncate">{effectiveBizId ? `#${effectiveBizId}` : "None selected"}</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-2">
          <div className="text-[11px] text-white/50">Connect Account</div>
          <div className="truncate">{acct || "—"}</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-2">
          <div className="text-[11px] text-white/50">Payouts</div>
          <div>{onboardingComplete ? "Enabled ✅" : connected ? "Pending ⚠️" : "Not set"}</div>
        </div>
      </div>

      {status?.missingBiz && (
        <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/10 p-2 text-xs text-amber-200">
          Select an active business to connect Stripe.
        </div>
      )}

      {err ? (
        <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 p-2 text-xs text-red-200">
          {err}
        </div>
      ) : null}

      {!onboardingComplete && connected && (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-2 text-xs text-white/70">
          Stripe account exists but onboarding isn’t complete yet. Click <b>Connect</b> to finish setup.
        </div>
      )}
    </div>
  );
}
