import React, { useMemo } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
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
  const loc = useLocation();

  const returnTo = useMemo(() => {
    const qs = new URLSearchParams(loc.search || "");
    const raw = (qs.get("return") || "").trim();
    return raw && raw.startsWith("/") ? raw : "/settings";
  }, [loc.search]);

  const note = useMemo(
    () =>
      "Invite codes securely link your existing SyncWorks account to a business, property, or portal without creating a second account.",
    []
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar title="SyncWorks" subtitle="Connect by Code" />

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
              to={returnTo}
              className="rounded-2xl px-4 py-2 text-sm border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40"
            >
              Back
            </Link>
          </div>
        </div>

        <div className="mt-6 grid lg:grid-cols-3 gap-4">
          <Card
            tone="emerald"
            title="Employee"
            subtitle="Join a team for dispatch, field work, admin, office support, or other internal roles."
            bullets={[
              "Get your employee code from the business owner or manager",
              "Links your account to their business securely",
              "Unlocks employee-specific access and future permissions",
            ]}
            cta="Open employee setup →"
            onClick={() => nav(`/employee/settings?return=${encodeURIComponent(returnTo)}`)}
          />

          <Card
            tone="cyan"
            title="Tenant"
            subtitle="Claim tenant portal access for your unit or property."
            bullets={[
              "Use your tenant code from the Property Manager",
              "Unlock rent, requests, notices, and documents",
              "Access stays scoped to your lease or unit",
            ]}
            cta="Open tenant setup →"
            onClick={() => nav(`/tenant/settings?return=${encodeURIComponent(returnTo)}`)}
          />

          <Card
            tone="fuchsia"
            title="Investor"
            subtitle="Claim investor portal access for your portfolio and updates."
            bullets={[
              "Use your investor code from the Property Manager",
              "Unlock portfolio visibility and future statements",
              "Access stays scoped to your investor relationship",
            ]}
            cta="Open investor setup →"
            onClick={() => nav(`/investor/settings?return=${encodeURIComponent(returnTo)}`)}
          />
        </div>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-950/45 p-5 text-sm text-slate-300">
          If you do not have a code yet, you can still use SyncWorks as a customer and connect later.
        </div>
      </div>
    </div>
  );
}