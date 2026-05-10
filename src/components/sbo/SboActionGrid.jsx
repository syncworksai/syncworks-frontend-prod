import React from "react";
import Button from "../ui/Button";

function ActionCard({ title, subtitle, buttonLabel, onClick, tone = "slate" }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="font-semibold text-slate-100">{title}</div>
      <div className="text-sm text-slate-400 mt-2">{subtitle}</div>
      <div className="mt-4">
        <Button tone={tone} onClick={onClick}>
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
}

export default function SboActionGrid({
  onOpenInvoicing,
  onOpenTaxes,
  onOpenEmployees,
  onOpenCatalog,
  onOpenKpis,
  onOpenSettings,
  onOpenGrowth,
}) {
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
      <ActionCard
        title="Growth OS"
        subtitle="Automate lead follow-ups, review requests, content drafts, and safe publishing."
        buttonLabel="Open Growth OS"
        onClick={onOpenGrowth}
        tone="fuchsia"
      />
      <ActionCard
        title="Invoicing"
        subtitle="Create, send, and track invoices. This should be one of the main work tabs."
        buttonLabel="Open Invoicing"
        onClick={onOpenInvoicing}
        tone="cyan"
      />
      <ActionCard
        title="Taxes"
        subtitle="QuickBooks-style tax and bookkeeping area later. Build the entry point now."
        buttonLabel="Open Taxes"
        onClick={onOpenTaxes}
        tone="emerald"
      />
      <ActionCard
        title="Employees / HR"
        subtitle="Invite staff, assign role-based visibility, and manage technician/accounting access."
        buttonLabel="Open Employees"
        onClick={onOpenEmployees}
        tone="indigo"
      />
      <ActionCard
        title="Catalog / Pricing"
        subtitle="Control service pricing so invoice builder and fixed-price flows have real data."
        buttonLabel="Open Catalog"
        onClick={onOpenCatalog}
        tone="cyan"
      />
      <ActionCard
        title="Settings"
        subtitle="Use settings to edit and refine. First-time onboarding should become a guided flow."
        buttonLabel="Open Settings"
        onClick={onOpenSettings}
        tone="slate"
      />
    </div>
  );
}