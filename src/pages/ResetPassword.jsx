import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/client";

function errorText(e) {
  const data = e?.response?.data;
  return data?.new_password?.[0] || data?.detail || "Unable to reset password. Request a new link.";
}
export default function ResetPassword() {
  const [params] = useSearchParams();
  const uid = params.get("uid") || "";
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const validLink = Boolean(uid && token);

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setBusy(true);
    try {
      await api.post("/auth/password/reset/confirm/", { uid, token, new_password: password });
      setComplete(true);
      setPassword(""); setConfirm("");
    } catch (err) { setError(errorText(err)); }
    finally { setBusy(false); }
  }

  return (
    <main className="min-h-dvh bg-[#020712] px-4 py-14 text-white">
      <section className="mx-auto max-w-md rounded-3xl border border-cyan-400/25 bg-slate-950 p-6">
        <h1 className="text-2xl font-black">Choose a new password</h1>
        {complete ? (
          <div role="status" className="mt-5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            Password updated. Sign in again on your devices.
            <Link to="/login" className="mt-3 block min-h-10 font-black text-cyan-200">Return to sign in →</Link>
          </div>
        ) : validLink ? (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <p className="text-sm text-slate-400">Use a new password that you haven't used before.</p>
            <label className="block text-sm text-slate-300">New password
              <input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)}
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base text-white"/>
            </label>
            <label className="block text-sm text-slate-300">Confirm new password
              <input type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)}
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base text-white"/>
            </label>
            {error ? <p role="alert" className="text-sm text-rose-200">{error}</p> : null}
            <button type="submit" disabled={busy} className="min-h-12 w-full rounded-xl bg-cyan-400 px-4 font-black text-slate-950 disabled:opacity-50">
              {busy ? "Updating…" : "Save new password"}
            </button>
          </form>
        ) : (
          <div className="mt-4 text-sm text-amber-200">
            This reset link is missing required information.
            <Link to="/forgot-password" className="mt-3 block min-h-10 font-black text-cyan-200">Request a fresh link →</Link>
          </div>
        )}
        <Link to="/forgot-password" className="mt-4 block text-xs text-slate-400">Reset link expired? Request another.</Link>
      </section>
    </main>
  );
}
