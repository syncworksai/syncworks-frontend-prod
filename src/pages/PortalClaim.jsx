// src/pages/PortalClaim.jsx
import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function PortalClaim() {
  const nav = useNavigate();
  const q = useQuery();

  const portal = (q.get("portal") || "investor").toLowerCase(); // investor | tenant
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  const title = portal === "tenant" ? "Tenant Portal" : "Investor Portal";
  const endpoint =
    portal === "tenant"
      ? "/tenant/invites/accept/" // expects invite_code
      : "/investor/claim/"; // expects connect_code

  async function submit() {
    setErr("");
    setOk("");

    const trimmed = code.trim();
    if (!trimmed) {
      setErr("Enter a code.");
      return;
    }

    setBusy(true);
    try {
      const payload =
        portal === "tenant"
          ? { invite_code: trimmed }
          : { connect_code: trimmed };

      await api.post(endpoint, payload);

      setOk("Linked ✅ Redirecting…");

      // Where to send them after claim:
      // - Tenant already has /tenant
      // - Investor dashboard route is up to us (we’ll wire later); for now send to /pm or /customer
      setTimeout(() => {
        if (portal === "tenant") nav("/tenant");
        else nav("/pm"); // temp until investor dashboard page exists
      }, 650);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to link. Check the code and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title={`${title} — Claim Access`}
        subtitle="Paste your code to link your account to this portal."
        rightActions={
          <button
            onClick={() => nav(-1)}
            className="text-xs rounded-xl px-3 py-2 bg-slate-950/55 border border-slate-800 hover:bg-slate-900/70 hover:border-transparent transition"
          >
            Back
          </button>
        }
      />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
          <div className="text-lg font-semibold">{title}</div>
          <div className="text-sm text-slate-400 mt-1">
            Enter the code you received from the Property Manager.
          </div>

          <div className="mt-5">
            <div className="text-xs text-slate-400 mb-2">Code</div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={portal === "tenant" ? "Tenant Invite Code" : "Investor Connect Code"}
              className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm outline-none focus:border-fuchsia-500/40"
              autoFocus
            />
          </div>

          {err ? (
            <div className="mt-4 text-sm text-rose-200 bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3">
              {err}
            </div>
          ) : null}

          {ok ? (
            <div className="mt-4 text-sm text-emerald-200 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3">
              {ok}
            </div>
          ) : null}

          <div className="mt-5 flex gap-2 flex-wrap">
            <button
              disabled={busy}
              onClick={submit}
              className={[
                "rounded-2xl px-4 py-3 text-sm font-semibold transition border",
                busy
                  ? "bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-fuchsia-500/20 border-fuchsia-500/40 hover:bg-fuchsia-500/30 text-fuchsia-100",
              ].join(" ")}
            >
              {busy ? "Linking…" : "Claim Portal"}
            </button>

            <button
              onClick={() => setCode("")}
              className="rounded-2xl px-4 py-3 text-sm border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40 transition"
            >
              Clear
            </button>
          </div>

          <div className="mt-4 text-[12px] text-slate-500">
            If you don’t have a code, ask your PM to send a new invite.
          </div>
        </div>
      </main>
    </div>
  );
}
