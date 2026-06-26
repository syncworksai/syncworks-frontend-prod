// src/components/requests/new-request/MarketplaceSearchPanel.jsx
import React, { useMemo, useState } from "react";
import {
  MARKETPLACE_CATALOG,
  getAccentClasses,
  getPopularServices,
  getServicesForVertical,
  searchMarketplaceServices,
  cx,
} from "./requestMarketplaceCatalog";

function ServiceChip({ service, active, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(service)}
      className={cx(
        "group rounded-2xl border p-3 text-left transition",
        active
          ? getAccentClasses(service.verticalAccent, true)
          : "border-slate-800 bg-slate-950/65 text-slate-200 hover:border-cyan-500/30 hover:bg-slate-900/70"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base">{service.verticalIcon}</span>
            <div className="truncate text-sm font-black text-slate-50">
              {service.label}
            </div>
          </div>

          <div className="mt-1 truncate text-[11px] text-slate-400">
            {service.verticalShortLabel || service.verticalLabel} •{" "}
            {service.categoryLabel}
          </div>
        </div>

        <span
          className={cx(
            "shrink-0 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em]",
            active
              ? "border-white/25 bg-white/15 text-white"
              : "border-slate-700 bg-slate-900 text-slate-500 group-hover:text-slate-300"
          )}
        >
          {active ? "Picked" : "Pick"}
        </span>
      </div>
    </button>
  );
}

function VerticalCard({ vertical, active, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(vertical)}
      className={cx(
        "rounded-3xl border p-4 text-left transition",
        active
          ? getAccentClasses(vertical.accent, true)
          : "border-slate-800 bg-slate-950/55 text-slate-200 hover:border-cyan-500/30 hover:bg-slate-900/70"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-2xl">{vertical.icon}</div>
          <div className="mt-2 text-sm font-black text-slate-50">
            {vertical.shortLabel || vertical.label}
          </div>
          <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
            {vertical.description}
          </div>
        </div>

        <div className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-black text-slate-300">
          {(vertical.categories || []).reduce(
            (acc, cat) => acc + (cat.services || []).length,
            0
          )}
        </div>
      </div>
    </button>
  );
}

export default function MarketplaceSearchPanel({
  selectedService,
  setSelectedService,
  mode = "CUSTOMER_MARKETPLACE",
  allowedServiceKeys = [],
  onNext = null,
}) {
  const [query, setQuery] = useState("");
  const [selectedVerticalKey, setSelectedVerticalKey] = useState("");

  const isBusinessInternal = mode === "BUSINESS_INTERNAL";

  const allowedSet = useMemo(() => {
    return new Set((allowedServiceKeys || []).map(String).filter(Boolean));
  }, [allowedServiceKeys]);

  const verticals = useMemo(() => {
    if (!isBusinessInternal || !allowedSet.size) return MARKETPLACE_CATALOG;

    return MARKETPLACE_CATALOG.map((vertical) => {
      const categories = (vertical.categories || [])
        .map((category) => {
          const services = (category.services || []).filter((service) => {
            return (
              allowedSet.has(service.key) ||
              allowedSet.has(category.key) ||
              allowedSet.has(vertical.key) ||
              allowedSet.has(service.label)
            );
          });

          return services.length ? { ...category, services } : null;
        })
        .filter(Boolean);

      return categories.length ? { ...vertical, categories } : null;
    }).filter(Boolean);
  }, [allowedSet, isBusinessInternal]);

  const resultRows = useMemo(() => {
    let rows = [];

    if (query.trim()) {
      rows = searchMarketplaceServices(query, 50);
    } else if (selectedVerticalKey) {
      rows = getServicesForVertical(selectedVerticalKey);
    } else {
      rows = getPopularServices();
    }

    if (isBusinessInternal && allowedSet.size) {
      rows = rows.filter((service) => {
        return (
          allowedSet.has(service.key) ||
          allowedSet.has(service.categoryKey) ||
          allowedSet.has(service.verticalKey) ||
          allowedSet.has(service.label)
        );
      });
    }

    return rows;
  }, [allowedSet, isBusinessInternal, query, selectedVerticalKey]);

  const selectedId = selectedService?.key || "";

  function pickService(service) {
    setSelectedService(service);
  }

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-500/20 bg-slate-950/55 p-5 shadow-[0_0_70px_rgba(34,211,238,0.10)] md:p-6">
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-cyan-500/14 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/4 h-72 w-72 rounded-full bg-fuchsia-500/12 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100">
            {isBusinessInternal ? "Business Ticket Creator" : "Local Marketplace"}
          </div>

          <h1 className="mt-4 text-2xl font-black tracking-tight text-white md:text-4xl">
            {isBusinessInternal
              ? "Create a ticket from your services."
              : "What do you need today?"}
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            {isBusinessInternal
              ? "Use this when a customer called in, texted, or walked in. Your team should only pick from services your business provides."
              : "Search services, products, food, bookings, real estate, auto, and more. SyncWorks turns every need into a trackable ticket."}
          </p>

          <div className="mt-5 rounded-3xl border border-slate-800 bg-slate-950/80 p-2 shadow-inner">
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-100">
                🔎
              </div>

              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (e.target.value.trim()) setSelectedVerticalKey("");
                }}
                placeholder={
                  isBusinessInternal
                    ? "Search your services..."
                    : "Search plumbing, tutoring, dog grooming, restaurants, real estate..."
                }
                className="h-12 min-w-0 flex-1 bg-transparent px-1 text-sm font-semibold text-slate-100 placeholder:text-slate-600 outline-none"
              />

              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>

          {selectedService ? (
            <div className="mt-4 flex flex-col gap-3 rounded-3xl border border-emerald-500/25 bg-emerald-500/10 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-200">
                  Selected
                </div>
                <div className="mt-1 text-sm font-black text-white">
                  {selectedService.verticalIcon} {selectedService.label}
                </div>
                <div className="mt-1 text-xs text-slate-300">
                  {selectedService.verticalLabel} • {selectedService.categoryLabel} •{" "}
                  {selectedService.ticketType || "TICKET"}
                </div>
              </div>

              {onNext ? (
                <button
                  type="button"
                  onClick={onNext}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-500 px-4 text-sm font-black text-black transition hover:bg-emerald-400"
                >
                  Continue
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950/45 p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-black text-slate-100">
              Browse by category
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Most common categories are easy to tap on mobile.
            </div>
          </div>

          {selectedVerticalKey ? (
            <button
              type="button"
              onClick={() => setSelectedVerticalKey("")}
              className="rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 hover:bg-slate-900"
            >
              Popular
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {verticals.map((vertical) => (
            <VerticalCard
              key={vertical.key}
              vertical={vertical}
              active={selectedVerticalKey === vertical.key}
              onClick={() => {
                setQuery("");
                setSelectedVerticalKey((current) =>
                  current === vertical.key ? "" : vertical.key
                );
              }}
            />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950/45 p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-black text-slate-100">
              {query.trim()
                ? "Search results"
                : selectedVerticalKey
                ? "Available options"
                : "Popular near you"}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Pick the closest service, product, meal, booking, or request. You can add details next.
            </div>
          </div>

          <div className="rounded-full border border-slate-800 bg-slate-950/70 px-3 py-1 text-[11px] font-black text-slate-300">
            {resultRows.length} option{resultRows.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {resultRows.length ? (
            resultRows.map((service) => (
              <ServiceChip
                key={service.key}
                service={service}
                active={selectedId === service.key}
                onClick={pickService}
              />
            ))
          ) : (
            <div className="rounded-3xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100 md:col-span-2">
              No matching services found. Choose “Something Else” or try a
              broader search like “tree,” “cleaning,” “tutoring,” “restaurant,”
              or “real estate.”
            </div>
          )}
        </div>
      </section>
    </div>
  );
}