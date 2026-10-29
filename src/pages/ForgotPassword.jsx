import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/password/reset/request/", { email: email.trim().toLowerCase() });
      setSubmitted(true);
    } catch {
      setError("We couldn't submit this request. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#020712] px-4 py-14 text-white">
      <section className="mx-auto max-w-md rounded-3xl border border-cyan-400/25 bg-slate-950 p-6 shadow-xl">
        <Link to="/login" className="text-xs font-bold text-cyan-200">← Back to sign in</Link>
        <h1 className="mt-5 text-2xl font-black">Reset your password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Enter the email you used to register. If it belongs to a SyncWorks account, we'll send a link to reset your password.</p>
        {submitted ? (
          <div role="status" className="mt-5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            If an account uses that email, a reset link has been requested. Check your inbox and spam folder.
            <button type="button" onClick={() => { setSubmitted(false); setEmail(""); }} className="mt-3 block min-h-10 text-xs font-black text-cyan-200">Try a different email</button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block text-sm text-slate-300">Account email
              <input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)}
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base text-white focus:border-cyan-400"/>
            </label>
            {error ? <p role="alert" className="text-sm text-rose-200">{error}</p> : null}
            <button type="submit" disabled={busy} className="min-h-12 w-full rounded-xl bg-cyan-400 px-4 font-black text-slate-950 disabled:opacity-50">
              {busy ? "Sending request…" : "Request reset link"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
