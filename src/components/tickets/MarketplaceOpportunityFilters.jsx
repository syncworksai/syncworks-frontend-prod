// src/components/tickets/MarketplaceOpportunityFilters.jsx
import React from "react";

const text = (value) => String(value ?? "").trim();
const upper = (value) => text(value).toUpperCase();

export const marketplaceCategoryLabel = (ticket) =>
  text(ticket?.category_path) ||
  text(ticket?.category_name) ||
  text(ticket?.title) ||
  "Uncategorized";

export const marketplaceCategoryKey = (ticket) =>
  text(ticket?.category_key) ||
  text(ticket?.category_id) ||
  marketplaceCategoryLabel(ticket);

export const marketplaceCoverageType = (ticket) =>
  upper(
    ticket?.marketplace_match?.match_type ||
      ticket?.marketplace_match?.match_label ||
      "OTHER"
  );

export const marketplaceCoverageLabel = (ticket) =>
  text(ticket?.marketplace_match?.coverage_name) ||
  text(ticket?.marketplace_match?.match_label) ||
  "Other coverage";

export function marketplaceProjectScope(ticket) {
  const normalized = norm(ticket?.opportunity_profile?.project_scope);
  if (["COMMERCIAL", "RESIDENTIAL", "UNSPECIFIED"].includes(normalized)) {
    return normalized;
  }
  const details = Array.isArray(ticket?.marketplace_match?.details)
    ? ticket.marketplace_match.details.join(" ")
    : "";
  const blob = upper(
    [
      details,
      ticket?.description,
      ticket?.service_request?.description,
      ticket?.service_request?.intake_payload?.project_scope,
      ticket?.intake_payload?.project_scope,
    ].join(" ")
  );
  if (blob.includes("COMMERCIAL")) return "COMMERCIAL";
  if (blob.includes("RESIDENTIAL")) return "RESIDENTIAL";
  return "UNSPECIFIED";
}

export function marketplaceProjectValue(ticket) {
  const normalizedValue = Number(ticket?.opportunity_profile?.estimated_value || 0);
  if (Number.isFinite(normalizedValue) && normalizedValue > 0) return normalizedValue;
  const values = [
    ticket?.project_value,
    ticket?.estimated_value,
    ticket?.estimated_budget,
    ticket?.budget,
    ticket?.service_request?.project_value,
    ticket?.service_request?.estimated_value,
    ticket?.service_request?.intake_payload?.estimated_budget,
    ticket?.intake_payload?.estimated_budget,
  ];
  for (const value of values) {
    const numeric = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
  }

  const details = Array.isArray(ticket?.marketplace_match?.details)
    ? ticket.marketplace_match.details.join(" ")
    : "";
  const blob = [details, ticket?.description, ticket?.service_request?.description]
    .filter(Boolean)
    .join(" ");
  for (const pattern of [
    /minimum project value met:\s*\$?([\d,]+(?:\.\d+)?)/i,
    /estimated (?:project )?(?:value|budget):\s*\$?([\d,]+(?:\.\d+)?)/i,
    /budget:\s*\$?([\d,]+(?:\.\d+)?)/i,
  ]) {
    const match = blob.match(pattern);
    if (match) {
      const numeric = Number(match[1].replace(/,/g, ""));
      if (Number.isFinite(numeric) && numeric > 0) return numeric;
    }
  }
  return 0;
}

export const marketplacePriority = (ticket) =>
  upper(
    ticket?.opportunity_profile?.priority ||
      ticket?.priority ||
      ticket?.service_request?.priority ||
      ticket?.intake_payload?.priority ||
      "P3"
  );

export function marketplaceFitScore(ticket, saved = false) {
  const priority = marketplacePriority(ticket);
  const type = marketplaceCoverageType(ticket);
  const value = marketplaceProjectValue(ticket);
  let score = { P1: 1000, P2: 600, P3: 250, P4: 100 }[priority] || 100;
  score += {
    PRIMARY_ZIP: 500,
    LOCAL_RADIUS: 450,
    ZIP: 400,
    CITY: 350,
    COUNTY: 300,
    STATE: 250,
    REGION: 200,
    NATIONWIDE: 150,
  }[type] || 50;
  score += Math.min(value, 100000) / 100;
  if (saved) score += 125;
  return score;
}

export function buildMarketplaceFilterOptions(items) {
  const categories = new Map();
  const coverage = new Map();
  (items || []).forEach((ticket) => {
    categories.set(marketplaceCategoryKey(ticket), marketplaceCategoryLabel(ticket));
    coverage.set(marketplaceCoverageType(ticket), marketplaceCoverageLabel(ticket));
  });
  const convert = (map) =>
    Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  return { categories: convert(categories), coverage: convert(coverage) };
}

function SelectField({ label, value, onChange, children }) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-500">
        {label}
      </div>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
      >
        {children}
      </select>
    </label>
  );
}

export default function MarketplaceOpportunityFilters({
  filters,
  setFilters,
  options,
  visibleCount,
  totalCount,
  onClear,
}) {
  const update = (key, value) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const active =
    filters.service !== "ALL" ||
    filters.coverage !== "ALL" ||
    filters.scope !== "ALL" ||
    filters.urgency !== "ALL" ||
    filters.minimumValue !== "0";

  return (
    <section className="rounded-3xl border border-fuchsia-500/25 bg-gradient-to-br from-fuchsia-500/10 via-purple-500/7 to-cyan-500/8 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-white">Opportunity Prioritization</div>
          <div className="mt-1 text-xs leading-5 text-slate-400">
            Filter eligible work by exact service, coverage source, project type,
            known value, and urgency.
          </div>
        </div>
        <div className="rounded-full border border-fuchsia-400/35 bg-fuchsia-500/15 px-3 py-1 text-[11px] font-black text-fuchsia-100">
          {visibleCount} of {totalCount}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SelectField label="Exact Service" value={filters.service} onChange={(v) => update("service", v)}>
          <option value="ALL">All services</option>
          {(options?.categories || []).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </SelectField>

        <SelectField label="Coverage Source" value={filters.coverage} onChange={(v) => update("coverage", v)}>
          <option value="ALL">All coverage</option>
          {(options?.coverage || []).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </SelectField>

        <SelectField label="Project Type" value={filters.scope} onChange={(v) => update("scope", v)}>
          <option value="ALL">All project types</option>
          <option value="RESIDENTIAL">Residential</option>
          <option value="COMMERCIAL">Commercial</option>
          <option value="UNSPECIFIED">Not specified</option>
        </SelectField>

        <SelectField label="Urgency" value={filters.urgency} onChange={(v) => update("urgency", v)}>
          <option value="ALL">All urgency</option>
          <option value="P1">P1 — Immediate</option>
          <option value="P2">P2 — Urgent</option>
          <option value="P3">P3 — Standard</option>
          <option value="P4">P4 — Flexible</option>
        </SelectField>

        <SelectField label="Minimum Value" value={filters.minimumValue} onChange={(v) => update("minimumValue", v)}>
          <option value="0">Any value</option>
          <option value="250">$250+</option>
          <option value="500">$500+</option>
          <option value="1000">$1,000+</option>
          <option value="2500">$2,500+</option>
          <option value="5000">$5,000+</option>
          <option value="10000">$10,000+</option>
        </SelectField>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[11px] leading-5 text-slate-500">
          Best Fit ranks urgency, coverage proximity, saved opportunities, and known value.
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={!active}
          className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-300 disabled:opacity-40"
        >
          Clear Opportunity Filters
        </button>
      </div>
    </section>
  );
}
