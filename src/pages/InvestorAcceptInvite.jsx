// src/pages/InvestorAcceptInvite.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function InvestorAcceptInvite() {
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    const c = code.trim();
    if (!c) {
      setErr("Enter your investor claim code.");
      return;
    }

    setLoading(true);
    try {
      // Try a few likely endpoints (whichever you wire first)
      const payload = { code: c };

      const paths = [
        "/investor/accept/",
        "/investor/invites/accept/",
        "/pm/investors/accept/",
      ];

      let lastErr = null;
      for (const p of paths) {
        try {
          await api.post(p, payload);
          setOk("Investor portal linked. Redirecting…");
          setTimeout(() => nav("/investor", { replace: true }), 500);
          setLoading(false);
          return;
        } catch (e2) {
          lastErr = e2;
        }
      }

      const msg =
        lastErr?.response?.data?.detail ||
        lastErr?.response?.data?.error ||
        lastErr?.message ||
        "Could not accept invite yet (backend endpoint not wired).";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 px-4 py-10">
      <div className="max-w-xl mx-auto">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
          <div className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-fuchsia-400 via-purple-400 to-cyan-300 bg-clip-text text-transparent">
            Claim Investor Access
          </div>
          <div className="text-sm text-slate-400 mt-2">
            Paste the code your Property Manager sent you. This links your investor portal to the correct business + properties.
          </div>

          <form onSubmit={submit} className="mt-6 space-y-3">
            <div>
              <div className="text-xs text-slate-400 mb-1">Investor code</div>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="ex: INV-7X29KQ"
                className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm outline-none focus:border-fuchsia-500/50"
              />
            </div>

            {err ? (
              <div className="text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-2xl p-3">
                {err}
                <div className="text-[11px] text-red-200/80 mt-2">
                  If you haven’t wired the endpoint yet, that’s fine — this page is ready.
                </div>
              </div>
            ) : null}

            {ok ? (
              <div className="text-sm text-emerald-200 bg-emerald-900/15 border border-emerald-700/30 rounded-2xl p-3">
                {ok}
              </div>
            ) : null}

            <div className="flex gap-2 flex-wrap">
              <button
                disabled={loading}
                className={cx(
                  "rounded-2xl px-4 py-2 text-sm font-semibold border transition",
                  loading
                    ? "opacity-60 border-slate-800 bg-slate-950/60"
                    : "border-fuchsia-500/35 bg-fuchsia-500/10 hover:bg-fuchsia-500/15 text-fuchsia-200"
                )}
                type="submit"
              >
                {loading ? "Claiming…" : "Claim Investor Portal"}
              </button>

              <button
                type="button"
                onClick={() => nav("/upgrade")}
                className="rounded-2xl px-4 py-2 text-sm border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40"
              >
                Need access?
              </button>

              <button
                type="button"
                onClick={() => nav("/pm")}
                className="rounded-2xl px-4 py-2 text-sm border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40"
              >
                Back to PM
              </button>
            </div>
          </form>
        </div>

        <div className="mt-4 text-[11px] text-slate-500">
          Future: we’ll also support “Prospective Tenant” discovery by city/state/ZIP (marketplace-style),
          but we’ll build that after core portals are solid.
        </div>
      </div>
    </div>
  );
}
