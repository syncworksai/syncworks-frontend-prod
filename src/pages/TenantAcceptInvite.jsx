// src/pages/TenantAcceptInvite.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";
import Button from "../components/ui/Button";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function TenantAcceptInvite() {
  const nav = useNavigate();
  const q = useQuery();

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const prefill = (q.get("code") || "").trim();
    if (prefill) setCode(prefill);
  }, [q]);

  async function accept() {
    setErr("");
    setMsg("");
    const trimmed = (code || "").trim();
    if (!trimmed) {
      setErr("Enter your invite code.");
      return;
    }

    setBusy(true);
    try {
      const res = await api.post("/tenant/invites/accept/", { code: trimmed });
      setMsg("Invite accepted! Loading your tenant portal...");

      // Give backend a moment to commit/link, then navigate
      setTimeout(() => nav("/tenant"), 400);
      return res.data;
    } catch (e) {
      const detail = e?.response?.data?.detail || "Unable to accept invite.";
      setErr(detail);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-slate-100">
      <ModeBar />
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="rounded-[32px] border border-blue-500/25 bg-[#050b13]/95 p-6 shadow-[0_0_80px_rgba(21,151,255,0.12)]">
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-blue-400">SYNCWORKS PROPERTY MANAGEMENT</div><div className="mt-2 text-3xl font-bold text-white">Join Your Property</div>
          <div className="text-slate-400 mt-2">
            Enter the secure code from your PM company to connect your account to the correct property, unit, lease, and tenant record.
          </div>

          <div className="mt-6">
            <label className="text-sm text-slate-400">Invite code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="OCEANVIEW-4B7X"
              className="mt-2 w-full rounded-2xl border border-blue-500/25 bg-black/35 px-4 py-3 font-semibold tracking-[0.12em] text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {err ? (
            <div className="mt-4 rounded-2xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-200">
              {err}
            </div>
          ) : null}

          {msg ? (
            <div className="mt-4 rounded-2xl border border-emerald-900/60 bg-emerald-950/25 px-4 py-3 text-sm text-emerald-200">
              {msg}
            </div>
          ) : null}

          <div className="mt-6 flex items-center gap-2">
            <Button onClick={accept} disabled={busy}>
              {busy ? "Accepting..." : "Accept Invite"}
            </Button>
            <Button variant="secondary" onClick={() => nav("/tenant")} disabled={busy}>
              Back
            </Button>
          </div>

          <div className="mt-6 text-xs text-slate-500">
            If this keeps failing, confirm you're logged into the same email address that received the invite.
          </div>
        </div>
      </div>
    </div>
  );
}
