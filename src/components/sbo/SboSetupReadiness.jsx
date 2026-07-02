import React from "react";
import {
  ArrowRight,
  BadgeCheck,
  CircleAlert,
  CreditCard,
  MapPinned,
  PackageCheck,
  Radio,
  Tags,
} from "lucide-react";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function ReadinessItem({ icon, label, value, ok, actionLabel, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "group flex min-h-[76px] w-full items-center gap-3 rounded-3xl border px-4 py-3 text-left transition",
        ok
          ? "border-emerald-500/20 bg-emerald-500/[0.07] hover:border-emerald-400/35"
          : "border-amber-500/25 bg-amber-500/[0.08] hover:border-amber-400/45"
      )}
    >
      <span
        className={cx(
          "grid h-11 w-11 shrink-0 place-items-center rounded-2xl border",
          ok
            ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
            : "border-amber-400/30 bg-amber-400/10 text-amber-200"
        )}
      >
        {React.createElement(icon, {
          "aria-hidden": true,
          className: "h-5 w-5",
          strokeWidth: 2,
        })}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-black text-white">{label}</span>
          <span
            className={cx(
              "rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em]",
              ok
                ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                : "border-amber-400/25 bg-amber-400/10 text-amber-200"
            )}
          >
            {ok ? "Ready" : "Needs setup"}
          </span>
        </span>
        <span className="mt-1 block text-xs leading-5 text-slate-400">{value}</span>
      </span>

      <span className="flex shrink-0 items-center gap-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 transition group-hover:text-cyan-200">
        <span className="hidden sm:inline">{actionLabel}</span>
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </span>
    </button>
  );
}

export default function SboSetupReadiness({
  loading,
  setupState,
  onOpenServices,
  onOpenCoverage,
  onOpenMarketplace,
  onOpenPayments,
  onOpenCatalog,
}) {
  const items = [
    {
      key: "services",
      icon: Tags,
      label: "Service tags",
      value: setupState?.hasServices
        ? `${setupState.servicesCount || 0} service tag(s) selected`
        : "Choose the services customers can request.",
      ok: !!setupState?.hasServices,
      actionLabel: "Edit",
      onClick: onOpenServices,
    },
    {
      key: "zip",
      icon: MapPinned,
      label: "Base ZIP",
      value: setupState?.hasZip
        ? setupState.baseZip
        : "Set the location used for marketplace matching.",
      ok: !!setupState?.hasZip,
      actionLabel: "Set ZIP",
      onClick: onOpenCoverage,
    },
    {
      key: "radius",
      icon: Radio,
      label: "Service radius",
      value: setupState?.hasRadius
        ? setupState?.isOnline
          ? "Online business — no travel radius required"
          : `${setupState.radius || 0} miles`
        : "Choose how far your team travels for work.",
      ok: !!setupState?.hasRadius,
      actionLabel: "Set radius",
      onClick: onOpenCoverage,
    },
    {
      key: "marketplace",
      icon: BadgeCheck,
      label: "Marketplace availability",
      value: setupState?.acceptsMarketplace
        ? "Your business can receive matching service requests."
        : "Turn this on when you are ready to receive work.",
      ok: !!setupState?.acceptsMarketplace,
      actionLabel: "Manage",
      onClick: onOpenMarketplace,
    },
    {
      key: "payments",
      icon: CreditCard,
      label: "Stripe payments",
      value: setupState?.stripeConnected
        ? "Payments are connected and ready."
        : "Connect payouts before accepting online payments.",
      ok: !!setupState?.stripeConnected,
      actionLabel: setupState?.stripeConnected ? "View" : "Connect",
      onClick: onOpenPayments,
    },
    {
      key: "catalog",
      icon: PackageCheck,
      label: "Service catalog",
      value: setupState?.catalogReady
        ? `${setupState.catalogCount || 0} active catalog item(s)`
        : "Add at least one priced service, product, or fee.",
      ok: !!setupState?.catalogReady,
      actionLabel: "Open",
      onClick: onOpenCatalog,
    },
  ];

  const score = items.filter((item) => item.ok).length;
  const total = items.length;
  const percent = loading ? 0 : Math.round((score / total) * 100);
  const ready = !loading && score === total;
  const nextItem = items.find((item) => !item.ok);

  return (
    <section
      id="business-readiness"
      className="overflow-hidden rounded-[2rem] border border-cyan-500/20 bg-slate-950/65 shadow-[0_0_60px_rgba(34,211,238,0.08)]"
    >
      <div className="relative overflow-hidden border-b border-slate-800 p-5 md:p-6">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-500/12 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl" />

        <div className="relative">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">
                Business readiness
              </div>
              <h2 className="mt-2 text-xl font-black tracking-tight text-white md:text-2xl">
                {loading
                  ? "Checking your business setup..."
                  : ready
                  ? "Ready to receive work"
                  : "Finish setup to start converting customers"}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Every item opens the exact screen needed to complete it. Readiness
                updates from live business, catalog, and payment data.
              </p>
            </div>

            <div
              className={cx(
                "flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-black",
                ready
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                  : "border-cyan-400/25 bg-cyan-400/10 text-cyan-100"
              )}
            >
              {ready ? (
                <BadgeCheck aria-hidden="true" className="h-5 w-5" />
              ) : (
                <CircleAlert aria-hidden="true" className="h-5 w-5" />
              )}
              {loading ? "Checking" : `${score}/${total} complete`}
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-bold text-slate-300">Profile completion</span>
              <span className="font-black text-cyan-200">
                {loading ? "..." : `${percent}%`}
              </span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full border border-slate-800 bg-slate-950">
              <div
                className={cx(
                  "h-full rounded-full transition-[width] duration-500",
                  ready
                    ? "bg-gradient-to-r from-emerald-400 to-green-400"
                    : "bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500"
                )}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {!loading && nextItem ? (
            <button
              type="button"
              onClick={nextItem.onClick}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border border-fuchsia-400/25 bg-fuchsia-500/10 px-4 py-3 text-left transition hover:bg-fuchsia-500/15 sm:w-auto"
            >
              <span>
                <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-fuchsia-200">
                  Recommended next step
                </span>
                <span className="mt-0.5 block text-sm font-black text-white">
                  {nextItem.label}
                </span>
              </span>
              <ArrowRight aria-hidden="true" className="h-5 w-5 text-fuchsia-200" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 p-4 md:grid-cols-2 md:p-5 xl:grid-cols-3">
        {items.map((item) => (
          <ReadinessItem key={item.key} {...item} />
        ))}
      </div>
    </section>
  );
}
