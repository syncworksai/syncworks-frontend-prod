// src/pages/InvestorAcceptInvite.jsx
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/client";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function InvestorAcceptInvite() {
  const nav = useNavigate();
  const { search } = useLocation();
  const [code, setCode] = useState(() => (new URLSearchParams(search).get("code") || "").trim());
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    const c = code.trim();
    if (!c) {
      setErr("Enter your Property Owner / Partner invitation code.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/pm-hub/access/investors/accept/", { code: c });
      setOk("Property Owner / Partner access linked to your management company.");
      nav("/investor", { replace: true });
    } catch (claimError) {
      setErr(claimError?.response?.data?.detail || "Invitation invalid, expired or sent to a different email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 px-4 py-10">
      <div className="max-w-xl mx-auto">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
          <div className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-fuchsia-400 via-purple-400 to-cyan-300 bg-clip-text text-transparent">
            Connect Property Owner / Partner
          </div>
          <div className="text-sm text-slate-400 mt-2">
            Paste the code from your PM company onboarding email. Only a valid invitation matching your Personal email links you to the company and its authorized properties.
          </div>

          <form onSubmit={submit} className="mt-6 space-y-3">
            <div>
              <div className="text-xs text-slate-400 mb-1">Owner / Partner invitation code</div>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Code from your management company"
                className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm outline-none focus:border-fuchsia-500/50"
              />
            </div>

            {err ? (
              <div className="text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-2xl p-3">
                {err}

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
                {loading ? "Claiming…" : "Link My Property Access"}
              </button>

              <button
                type="button"
                onClick={() => nav("/get-started#property-management")}
                className="rounded-2xl px-4 py-2 text-sm border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40"
              >
                Request invitation
              </button>

              <button
                type="button"
                onClick={() => nav("/customer")}
                className="rounded-2xl px-4 py-2 text-sm border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40"
              >
                Personal dashboard
              </button>
            </div>
          </form>
        </div>

        <div className="mt-4 text-[11px] text-slate-500">
          No code? Ask your property-management company to send an invitation to the email you use to sign in.
        </div>
      </div>
    </div>
  );
}
