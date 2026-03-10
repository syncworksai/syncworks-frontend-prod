// src/pages/Connect.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import ModeBar from "../components/ModeBar";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Pill({ children, tone = "slate" }) {
  const cls =
    tone === "cyan"
      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
      : tone === "fuchsia"
      ? "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200"
      : tone === "indigo"
      ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-200"
      : tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : "border-slate-800 bg-slate-950/50 text-slate-200";

  return (
    <span className={cx("inline-flex items-center rounded-full border px-2 py-1 text-[11px]", cls)}>
      {children}
    </span>
  );
}

function Card({ tone, title, subtitle, bullets, onClick, cta = "Continue →" }) {
  const ring =
    tone === "cyan"
      ? "border-cyan-500/30"
      : tone === "fuchsia"
      ? "border-fuchsia-500/30"
      : tone === "indigo"
      ? "border-indigo-500/30"
      : tone === "emerald"
      ? "border-emerald-500/30"
      : "border-slate-800";

  const btn =
    tone === "cyan"
      ? "border-cyan-500/35 bg-cyan-500/12 hover:bg-cyan-500/18 text-cyan-200"
      : tone === "fuchsia"
      ? "border-fuchsia-500/35 bg-fuchsia-500/12 hover:bg-fuchsia-500/18 text-fuchsia-200"
      : tone === "indigo"
      ? "border-indigo-500/35 bg-indigo-500/12 hover:bg-indigo-500/18 text-indigo-200"
      : tone === "emerald"
      ? "border-emerald-500/35 bg-emerald-500/12 hover:bg-emerald-500/18 text-emerald-200"
      : "border-slate-800 bg-slate-950/60 hover:bg-slate-900/40 text-slate-200";

  return (
    <div className={cx("rounded-3xl border bg-slate-950/45 p-5", ring)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-extrabold text-slate-100">{title}</div>
          <div className="text-xs text-slate-400 mt-1 leading-relaxed">{subtitle}</div>
        </div>
        <Pill tone={tone}>Code</Pill>
      </div>

      <div className="mt-4 space-y-2">
        {bullets.map((b) => (
          <div key={b} className="text-sm text-slate-300 flex gap-2">
            <span className="text-cyan-300">•</span>
            <span>{b}</span>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <button
          type="button"
          onClick={onClick}
          className={cx("rounded-2xl px-4 py-2 text-sm font-semibold border transition", btn)}
        >
          {cta}
        </button>
      </div>
    </div>
  );
}

export default function Connect() {
  const nav = useNavigate();

  // If later you add employee claim endpoint, you can route to /connect/employee (and add form there).
  // For now we reuse your existing portal claim page for tenant/investor.
  const note = useMemo(
    () =>
      "Invite codes are how SyncWorks securely links you to an organization without creating a new account. Employee, Tenant, and Investor access is assigned by the invite.",
    []
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar title="SyncWorks" subtitle="Connect by Code — employee / tenant / investor." />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-2xl md:text-3xl font-extrabold tracking-tight">Connect by Code</div>
              <Pill tone="cyan">Secure</Pill>
              <Pill tone="indigo">No new account</Pill>
              <Pill tone="fuchsia">Scoped access</Pill>
            </div>

            <div className="mt-2 text-sm text-slate-300 max-w-3xl leading-relaxed">{note}</div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/upgrade"
              className="rounded-2xl px-4 py-2 text-sm border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40"
            >
              Back to Upgrade Hub
            </Link>
          </div>
        </div>

        <div className="mt-6 grid lg:grid-cols-3 gap-4">
          <Card
            tone="emerald"
            title="Employee"
            subtitle="Join a business team (dispatch, technician, agent, assistant, etc.)."
            bullets={[
              "You’ll receive an invite code from the business owner/manager",
              "Link your account to their business securely",
              "Unlock Employee dashboard + assigned work",
            ]}
            cta="Enter employee code →"
            onClick={() => nav("/join?type=employee")}
          />

          <Card
            tone="cyan"
            title="Tenant"
            subtitle="Claim tenant portal access for your unit/property."
            bullets={[
              "Get your tenant claim code from the Property Manager",
              "Unlock tenant portal: requests, messages, receipts",
              "Access is scoped to your lease/unit",
            ]}
            cta="Enter tenant code →"
            onClick={() => nav("/portal/claim?portal=tenant")}
          />

          <Card
            tone="fuchsia"
            title="Investor"
            subtitle="Claim investor portal access for your portfolio."
            bullets={[
              "Get your investor claim code from the Property Manager",
              "Unlock investor portal: snapshot, updates, documents",
              "Access is scoped to your investor relationship",
            ]}
            cta="Enter investor code →"
            onClick={() => nav("/portal/claim?portal=investor")}
          />
        </div>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-950/45 p-5 text-sm text-slate-300">
          If you don’t have a code, you can still use SyncWorks as a customer for free and upgrade later.
        </div>
      </div>
    </div>
  );
}