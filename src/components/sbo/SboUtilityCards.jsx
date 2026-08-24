import React, { useEffect, useState } from "react";
import Button from "../ui/Button";
import { getReceivablesIntelligence } from "../../api/invoices";

function UtilityCard({ title, subtitle, children, right = null, className = "" }) {
  return (
    <div className={`rounded-3xl border border-slate-800 bg-slate-950/40 p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-slate-100">{title}</div>
          <div className="text-sm text-slate-400 mt-2">{subtitle}</div>
        </div>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function FinancialPulse() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let active = true;
    getReceivablesIntelligence()
      .then((next) => { if (active) setData(next); })
      .catch(() => { if (active) setData(null); });
    return () => { active = false; };
  }, []);

  const forecast = data?.collection_forecast || {};
  const insights = data?.insights || [];
  const topInsight = insights[0];

  return (
    <UtilityCard
      className="lg:col-span-2 border-cyan-500/20 bg-[radial-gradient(circle_at_90%_10%,rgba(34,211,238,.10),transparent_35%),rgba(2,6,23,.55)]"
      title="SYNC Financial Pulse"
      subtitle="CEO-level receivables intelligence: what is owed, what is likely to collect, and what needs attention next."
      right={
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[.12em] ${data?.automation?.runtime === "ACTIVE_DAILY" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-slate-700 bg-slate-900 text-slate-400"}`}>
          {data?.automation?.runtime === "ACTIVE_DAILY" ? "Reminders Active" : "Manual Mode"}
        </span>
      }
    >
      {!data ? (
        <div className="text-sm text-slate-500">Financial intelligence will appear when receivables data is available.</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[.025] p-3"><div className="text-[10px] uppercase tracking-wider text-slate-500">Outstanding</div><div className="mt-1 text-lg font-black text-white">{money(data.outstanding_total)}</div></div>
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[.06] p-3"><div className="text-[10px] uppercase tracking-wider text-rose-300/70">Overdue</div><div className="mt-1 text-lg font-black text-rose-100">{money(data.overdue_total)}</div></div>
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[.06] p-3"><div className="text-[10px] uppercase tracking-wider text-cyan-300/70">Due 7 days</div><div className="mt-1 text-lg font-black text-cyan-100">{money(forecast.due_next_7_days)}</div></div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[.06] p-3"><div className="text-[10px] uppercase tracking-wider text-emerald-300/70">Weighted 30-day</div><div className="mt-1 text-lg font-black text-emerald-100">{money(forecast.weighted_expected_30_days)}</div></div>
          </div>

          {topInsight ? (
            <div className={`rounded-2xl border p-3 text-xs leading-5 ${topInsight.severity === "high" ? "border-rose-500/20 bg-rose-500/[.06] text-rose-100" : "border-amber-500/20 bg-amber-500/[.06] text-amber-100"}`}>
              <span className="font-black">SYNC attention:</span> {topInsight.message}
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[.05] p-3 text-xs text-emerald-100">No material receivables exceptions detected.</div>
          )}

          <div className="flex flex-wrap gap-2">
            <a href="/sbo/settings/billing-automation" className="inline-flex items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/15">Open Billing Intelligence</a>
            <a href="/sbo/invoices" className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800">Open Invoice Center</a>
          </div>
        </div>
      )}
    </UtilityCard>
  );
}

export default function SboUtilityCards({
  onOpenSocial,
  onOpenImport,
  onOpenExport,
  onOpenEmployeeInvite,
  keeperUrl,
  socialPaymentUrl,
}) {
  return (
    <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-4">
      <FinancialPulse />

      <UtilityCard
        title="Social Media Automation"
        subtitle="AI-powered social media content for your business. Generate posts, captions, and marketing ideas in seconds. Save drafts, stay consistent, and attract more customers—without the hassle."
        right={
          <a
            href={socialPaymentUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] px-3 py-1.5 rounded-full border border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-200"
          >
            Upgrade
          </a>
        }
      >
        <div className="flex gap-2 flex-wrap">
          <Button tone="fuchsia" onClick={onOpenSocial}>
            Open Social
          </Button>
        </div>
      </UtilityCard>

      <UtilityCard
        title="Import Data"
        subtitle="Bring in old tickets, customers, invoices, or exported records from prior tools. This routes to the safe setup/data workspace instead of a dead page."
      >
        <div className="flex gap-2 flex-wrap">
          <Button tone="cyan" onClick={onOpenImport}>
            Import Workspace
          </Button>
          <Button tone="slate" onClick={onOpenEmployeeInvite}>
            Invite Employee
          </Button>
        </div>
      </UtilityCard>

      <UtilityCard
        title="Export Data"
        subtitle="Back up your business data and open the export-ready data workspace without breaking navigation."
      >
        <div className="flex gap-2 flex-wrap">
          <Button tone="indigo" onClick={onOpenExport}>
            Export Workspace
          </Button>
        </div>
      </UtilityCard>

      <UtilityCard
        title="Keeper Tax Tool"
        subtitle="Easy tax write-off help for business owners. Your users get a discount and the referral still works for you."
      >
        <a
          href={keeperUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
        >
          Open Keeper
        </a>
      </UtilityCard>
    </div>
  );
}
