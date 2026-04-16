import React from "react";
import Button from "../ui/Button";

function UtilityCard({ title, subtitle, children, right = null }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
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
        subtitle="Bring in old tickets, customers, invoices, or exported records from prior tools."
      >
        <div className="flex gap-2 flex-wrap">
          <Button tone="cyan" onClick={onOpenImport}>
            Import Old Data
          </Button>
          <Button tone="slate" onClick={onOpenEmployeeInvite}>
            Invite Employee
          </Button>
        </div>
      </UtilityCard>

      <UtilityCard
        title="Export Data"
        subtitle="Back up your business data and prepare for future QuickBooks/tax exports."
      >
        <div className="flex gap-2 flex-wrap">
          <Button tone="indigo" onClick={onOpenExport}>
            Export Data
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