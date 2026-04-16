import React from "react";
import Button from "../ui/Button";

function Row({ label, ok, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/55 px-4 py-3">
      <div>
        <div className="text-sm font-semibold text-slate-100">{label}</div>
        {value ? <div className="text-[11px] text-slate-500 mt-1">{value}</div> : null}
      </div>
      <div
        className={[
          "text-[11px] px-2 py-1 rounded-full border",
          ok
            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
            : "border-amber-500/25 bg-amber-500/10 text-amber-200",
        ].join(" ")}
      >
        {ok ? "Ready" : "Needs setup"}
      </div>
    </div>
  );
}

export default function SboSetupReadiness({
  loading,
  setupState,
  onOpenSetup,
  onOpenCatalog,
}) {
  const score = [
    setupState?.hasServices,
    setupState?.hasZip,
    setupState?.hasRadius,
    setupState?.acceptsMarketplace,
    setupState?.stripeConnected,
    setupState?.catalogReady,
  ].filter(Boolean).length;

  const total = 6;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-slate-100">Setup Readiness</div>
          <div className="text-xs text-slate-400 mt-1">
            Like Stripe setup — make onboarding obvious and fixable.
          </div>
        </div>
        <div className="text-xs px-3 py-1.5 rounded-full border border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-200">
          {loading ? "…" : `${score}/${total}`}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Row label="Service Tags" ok={setupState?.hasServices} value={`${setupState?.servicesCount || 0} selected`} />
        <Row label="Base ZIP" ok={setupState?.hasZip} value={setupState?.baseZip || "Not set"} />
        <Row
          label="Radius"
          ok={setupState?.hasRadius}
          value={setupState?.radius ? `${setupState.radius} mi` : "Not set"}
        />
        <Row label="Marketplace Enabled" ok={setupState?.acceptsMarketplace} />
        <Row label="Stripe Connected" ok={setupState?.stripeConnected} />
        <Row label="Catalog Ready" ok={setupState?.catalogReady} />
      </div>

      <div className="mt-4 grid gap-2">
        <Button tone="fuchsia" onClick={onOpenSetup}>
          Complete Setup
        </Button>
        <Button tone="cyan" onClick={onOpenCatalog}>
          Open Service Catalog
        </Button>
      </div>
    </div>
  );
}