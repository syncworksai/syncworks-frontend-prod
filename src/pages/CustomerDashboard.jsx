import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";

import AddToCalendarButton from "../components/AddToCalendarButton";
import CustomerTickets from "../components/CustomerTickets";
import CustomerWeeklyCalendar from "../components/CustomerWeeklyCalendar";
import InboxPanel from "../components/Inbox/InboxPanel";
import NewsReel from "../components/NewsReel";
import PriorityBadge, { isPriorityOne } from "../components/tickets/PriorityBadge";
import TodoList from "../components/TodoList";
import Button from "../components/ui/Button";

import DashboardShell from "../components/dashboard/DashboardShell";
import GlassCard, { cx } from "../components/dashboard/GlassCard";
import StatCard from "../components/dashboard/StatCard";

const BASE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "orders", label: "My Requests" },
  { id: "calendar", label: "Calendar" },
  { id: "todo", label: "To-Do" },
  { id: "inbox", label: "Messages" },
  { id: "deals", label: "Deals" },
  { id: "finance", label: "Finance" },
];

function safeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.value)) return data.value;
  return [];
}

function safeCount(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function safeMoney(value) {
  const n = Number(value || 0);
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

function safeDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function safeDateTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function safeStr(x) {
  return String(x ?? "").trim();
}

function titleCase(s) {
  return safeStr(s)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusPill(status) {
  const s = String(status || "NEW").toUpperCase();
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]";

  if (["COMPLETED", "PAID", "CLOSED"].includes(s)) {
    return `${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-200`;
  }

  if (["CANCELLED", "VOID"].includes(s)) {
    return `${base} border-rose-500/30 bg-rose-500/10 text-rose-200`;
  }

  if (["IN_PROGRESS", "ACCEPTED", "ASSIGNED", "SCHEDULED"].includes(s)) {
    return `${base} border-indigo-500/30 bg-indigo-500/10 text-indigo-200`;
  }

  if (["INVOICED", "SENT", "OPEN", "READY_FOR_PAYMENT"].includes(s)) {
    return `${base} border-amber-500/30 bg-amber-500/10 text-amber-200`;
  }

  return `${base} border-cyan-500/30 bg-cyan-500/10 text-cyan-200`;
}

function invoicePill(status) {
  const s = String(status || "OPEN").toUpperCase();
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]";

  if (s === "PAID") {
    return `${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-200`;
  }

  if (s === "VOID") {
    return `${base} border-slate-700 bg-slate-950/60 text-slate-300`;
  }

  return `${base} border-amber-500/30 bg-amber-500/10 text-amber-200`;
}

function archiveKeyForUser(user) {
  const uid = user?.id || user?.pk || user?.email || "anon";
  return `sw:customer_archived_tickets:${uid}`;
}

function readArchivedSet(user) {
  try {
    const raw = localStorage.getItem(archiveKeyForUser(user));
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(
      Array.isArray(parsed)
        ? parsed.map((x) => Number(x)).filter((n) => Number.isFinite(n))
        : []
    );
  } catch {
    return new Set();
  }
}

function writeArchivedSet(user, set) {
  try {
    localStorage.setItem(archiveKeyForUser(user), JSON.stringify(Array.from(set)));
  } catch {
    // no-op
  }
}

function readLocalFeed() {
  try {
    const raw = localStorage.getItem("sw_feed_items");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalFeed(items) {
  try {
    localStorage.setItem("sw_feed_items", JSON.stringify(Array.isArray(items) ? items : []));
  } catch {
    // no-op
  }
}

function seedFeedIfNeeded() {
  const existing = readLocalFeed();
  if (existing.length) return existing;

  const demo = [
    {
      id: "feed-1",
      type: "FEATURED",
      sponsored: true,
      business_name: "SyncWorks Demo Plumbing",
      headline: "Fast plumbing service with trusted routing.",
      body: "Book directly through SyncWorks and track everything from your dashboard.",
      cta: "Book Now",
      cta_href: "/customer/new-request",
      city: "Montgomery",
      state: "AL",
    },
    {
      id: "feed-2",
      type: "LOCAL PROMO",
      sponsored: true,
      business_name: "Montgomery Auto Detail",
      headline: "Mobile detailing with fast booking.",
      body: "Save the provider card and book again in minutes.",
      cta: "View Cards",
      cta_href: "/customer/business-cards",
      city: "Montgomery",
      state: "AL",
    },
    {
      id: "feed-3",
      type: "AFFILIATE",
      sponsored: true,
      business_name: "Refer & Earn",
      headline: "Help grow the SyncWorks network.",
      body: "Share SyncWorks with local service businesses and track referral opportunities.",
      cta: "Open Affiliate",
      cta_href: "/customer/affiliate",
      city: "Remote",
      state: "",
    },
  ];

  writeLocalFeed(demo);
  return demo;
}

const LIFE_CATEGORY_LABELS = {
  home_property: "Home & Property",
  rides_transport: "Rides & Transportation",
  kids_family: "Kids & Family",
  pets: "Pets",
  beauty_wellness: "Beauty & Wellness",
  events_media: "Events & Media",
  business_finance: "Business & Finance",
  property_mgmt: "Property Mgmt / Rentals",
  errands_help: "Errands & Help",
  sports_activities: "Sports & Activities",
  music_creative: "Music & Creative",
  education_tutoring: "Education & Tutoring",
  tech_digital: "Tech & Digital Help",
  other: "Something Else",
};

const SUBTYPE_LABELS = {
  ride_local: "Need a Ride",
  ride_airport: "Airport Ride",
  ride_medical: "Medical Transport",
  delivery_pickup: "Delivery / Pickup",
  moving_help: "Moving / Hauling Help",
  roadside: "Roadside Help",
  plumbing: "Plumbing",
  hvac: "HVAC",
  electrical: "Electrical",
  cleaning: "Cleaning",
  lawn: "Lawn & Landscaping",
  handyman: "Handyman / Home Repair",
  roofing: "Roofing & Gutters",
  remodeling: "Construction & Remodeling",
  appliance: "Appliance Repair",
  pest: "Pest Control",
  other_any: "Custom Job",
};

function extractSyncworksIntake(description) {
  const desc = safeStr(description);
  if (!desc) return null;

  const marker = "SyncWorks Intake:";
  const idx = desc.lastIndexOf(marker);
  if (idx === -1) return null;

  const after = desc.slice(idx + marker.length).trim();
  const start = after.indexOf("{");
  const end = after.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(after.slice(start, end + 1));
  } catch {
    return null;
  }
}

function resolveCustomerFriendlyTitle(ticket) {
  const t = ticket || {};
  const preferred = [
    t.taxonomy_label,
    t.taxonomy?.label,
    t.taxonomy?.name,
    t.category_label,
    t.category?.label,
    t.category?.name,
    t.service_category_label,
    t.service_category?.label,
    t.service_category?.name,
    t.display_title,
    t.display_name,
    t.title,
  ]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);

  const blacklist = new Set([
    "ac not cooling",
    "ac-not-cooling",
    "uncategorized",
    "unknown",
    "not set",
  ]);

  const firstGood = preferred.find((s) => !blacklist.has(s.toLowerCase()));
  if (firstGood) return firstGood;

  const intake = extractSyncworksIntake(t.description || t.details || "");
  const lifeKey = intake?.life_category || intake?.lifeCategory || "";
  const subtypeKey = intake?.subtype || intake?.type || "";

  const subtypeLabel =
    SUBTYPE_LABELS[subtypeKey] || (subtypeKey ? titleCase(subtypeKey) : "");
  const lifeLabel =
    LIFE_CATEGORY_LABELS[lifeKey] || (lifeKey ? titleCase(lifeKey) : "");

  if (subtypeLabel) return subtypeLabel;
  if (lifeLabel) return lifeLabel;
  if (t.category_name && typeof t.category_name === "string") return t.category_name;

  return "Service Request";
}

function resolveBusinessName(ticket) {
  const t = ticket || {};
  const candidates = [
    t.assigned_business_name,
    t.assigned_business_card?.name,
    t.business_name,
    t.business?.name,
    t.assigned_business?.name,
  ]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);

  return candidates[0] || "";
}

function resolveServiceLocation(ticket) {
  const parts = [
    ticket?.service_address,
    ticket?.service_city,
    ticket?.service_state,
    ticket?.service_zip,
  ]
    .map((x) => safeStr(x))
    .filter(Boolean);

  if (parts.length) return parts.join(", ");
  if (ticket?.service_zip) return `ZIP ${ticket.service_zip}`;
  return "Location pending";
}

function invoiceAmount(invoice) {
  if (!invoice) return 0;
  if (invoice.total != null && invoice.total !== "") return Number(invoice.total || 0);
  if (invoice.amount != null && invoice.amount !== "") return Number(invoice.amount || 0);
  if (invoice.amount_cents != null && invoice.amount_cents !== "") {
    return Number(invoice.amount_cents || 0) / 100;
  }
  return 0;
}

function isInvoiceDue(invoice) {
  if (!invoice) return false;
  const status = String(invoice.status || "").toUpperCase();
  return !["PAID", "VOID"].includes(status);
}

function isCompletedStatus(status) {
  return ["COMPLETED", "PAID", "CLOSED"].includes(String(status || "").toUpperCase());
}

function isInProgressStatus(status) {
  return ["IN_PROGRESS", "ACCEPTED", "ASSIGNED", "SCHEDULED"].includes(
    String(status || "").toUpperCase()
  );
}

function IconButton({ title, tone = "slate", disabled, onClick, children }) {
  const tones = {
    slate:
      "border-slate-800 bg-slate-950/65 text-slate-200 hover:bg-slate-900/70",
    cyan:
      "border-cyan-500/35 bg-cyan-500/12 text-cyan-100 hover:bg-cyan-500/18",
    rose:
      "border-rose-500/35 bg-rose-500/12 text-rose-100 hover:bg-rose-500/18",
    amber:
      "border-amber-500/35 bg-amber-500/12 text-amber-100 hover:bg-amber-500/18",
  };

  return (
    <button
      type="button"
      title={title}
      disabled={!!disabled}
      onClick={disabled ? undefined : onClick}
      className={cx(
        "inline-flex h-9 w-9 items-center justify-center rounded-2xl border text-sm transition",
        tones[tone] || tones.slate,
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      {children}
    </button>
  );
}

function Pill({ children, tone = "slate" }) {
  const tones = {
    cyan: "border-cyan-500/35 bg-cyan-500/10 text-cyan-200",
    indigo: "border-indigo-500/35 bg-indigo-500/10 text-indigo-200",
    fuchsia: "border-fuchsia-500/35 bg-fuchsia-500/10 text-fuchsia-200",
    emerald: "border-emerald-500/35 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-500/35 bg-amber-500/10 text-amber-200",
    rose: "border-rose-500/35 bg-rose-500/10 text-rose-200",
    slate: "border-slate-700 bg-slate-950/60 text-slate-300",
  };

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]",
        tones[tone] || tones.slate
      )}
    >
      {children}
    </span>
  );
}

function CustomerHero({
  displayName,
  totalDue,
  openCount,
  onNewRequest,
  onViewOrders,
  onBusinessCards,
  onAffiliate,
}) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-cyan-500/20 bg-slate-950/55 p-5 shadow-[0_0_70px_rgba(34,211,238,0.10)] md:p-7">
      <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="absolute -bottom-28 left-1/3 h-80 w-80 rounded-full bg-fuchsia-500/12 blur-3xl" />
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-indigo-500/10 to-fuchsia-500/10" />

      <div className="relative grid gap-5 lg:grid-cols-[1fr_360px] lg:items-center">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-200">
            SyncWorks Customer Command
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight text-white md:text-5xl">
            Hey {displayName}, what do you need done today?
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
            Request services, track active jobs, manage payments, message providers,
            and save your favorite businesses in one clean dashboard.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onNewRequest}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-cyan-300/40 bg-gradient-to-r from-cyan-500 to-blue-600 px-5 text-sm font-black text-white shadow-[0_0_35px_rgba(34,211,238,0.28)] transition hover:brightness-110"
            >
              + New Request
            </button>

            <Button tone="slate" size="lg" onClick={onViewOrders}>
              My Requests
            </Button>

            <Button tone="indigo" size="lg" onClick={onBusinessCards}>
              Saved Businesses
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-700/80 bg-slate-950/60 p-4 backdrop-blur-xl">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
              <div className="text-xs text-cyan-200">Open</div>
              <div className="mt-2 text-3xl font-black text-white">{openCount}</div>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
              <div className="text-xs text-amber-200">Due</div>
              <div className="mt-2 text-3xl font-black text-white">{safeMoney(totalDue)}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onAffiliate}
            className="mt-3 w-full rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-3 text-left transition hover:bg-fuchsia-500/15"
          >
            <div className="text-sm font-black text-fuchsia-100">Refer & Earn</div>
            <div className="mt-1 text-xs text-slate-400">
              Help grow the network and track referral opportunities.
            </div>
          </button>
        </div>
      </div>
    </section>
  );
}

function DashboardTabs({ tabs, activeTab, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map((tab) => {
        const active = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cx(
              "h-10 shrink-0 rounded-2xl border px-4 text-xs font-black uppercase tracking-[0.12em] transition",
              active
                ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.12)]"
                : "border-slate-800 bg-slate-950/45 text-slate-400 hover:bg-slate-900/70 hover:text-slate-100"
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function RecentRequestsList({
  tickets,
  loading,
  error,
  actionError,
  onRefresh,
  onOpenTicket,
  onArchive,
  onCancel,
}) {
  return (
    <GlassCard
      title="Recent Requests"
      subtitle="Live job tracking, provider assignment, calendar actions, and payment status."
      tone="cyan"
      right={
        <div className="flex gap-2">
          <IconButton title="Refresh" onClick={onRefresh}>
            ↻
          </IconButton>
        </div>
      }
    >
      {actionError ? (
        <div className="mb-3 rounded-2xl border border-red-800 bg-red-900/20 p-3 text-sm text-red-300">
          {actionError}
        </div>
      ) : null}

      {error ? (
        <div className="mb-3 rounded-2xl border border-red-800 bg-red-900/20 p-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? <div className="text-sm text-slate-400">Loading requests…</div> : null}

      {!loading && !tickets.length ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-5 text-sm text-slate-400">
          No requests yet. Tap <span className="font-bold text-cyan-200">+ New Request</span> to start.
        </div>
      ) : null}

      <div className="space-y-3">
        {tickets.map((ticket) => {
          const status = String(ticket?.status || "NEW").toUpperCase();
          const canCancel = !["COMPLETED", "PAID", "CANCELLED", "CLOSED"].includes(status);
          const serviceTitle = resolveCustomerFriendlyTitle(ticket);
          const businessName = resolveBusinessName(ticket);
          const p1 = isPriorityOne(ticket);

          return (
            <article
              key={ticket.id}
              role="button"
              tabIndex={0}
              onClick={() => onOpenTicket(ticket.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onOpenTicket(ticket.id);
              }}
              className={cx(
                "cursor-pointer rounded-3xl border bg-slate-950/50 p-4 outline-none transition hover:bg-slate-900/55 focus:ring-2 focus:ring-cyan-500/30",
                p1
                  ? "border-rose-500/55 shadow-[0_0_28px_rgba(244,63,94,0.16)]"
                  : "border-slate-800/80"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-base font-black text-slate-100">
                      {serviceTitle}
                    </div>
                    {p1 ? <Pill tone="rose">Service Now</Pill> : null}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    Ticket #{ticket.id} • {resolveServiceLocation(ticket)}
                  </div>

                  <div className="mt-2 text-xs text-slate-400">
                    {businessName ? (
                      <>
                        Provider: <span className="text-slate-200">{businessName}</span>
                      </>
                    ) : (
                      <>Provider not assigned yet</>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className={statusPill(ticket.status)}>
                    {String(ticket.status || "NEW")}
                  </span>
                  <PriorityBadge ticket={ticket} showEta={false} />
                </div>
              </div>

              <div
                className="mt-4 flex flex-wrap items-center justify-between gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <AddToCalendarButton ticket={ticket} />

                  <IconButton
                    title="Archive from dashboard"
                    tone="slate"
                    onClick={() => onArchive(ticket.id)}
                  >
                    🗄
                  </IconButton>

                  <IconButton
                    title={canCancel ? "Cancel request" : "Cancel disabled"}
                    tone="rose"
                    disabled={!canCancel}
                    onClick={() => {
                      const ok = window.confirm(`Cancel request #${ticket.id}?`);
                      if (ok) onCancel(ticket.id);
                    }}
                  >
                    ✕
                  </IconButton>
                </div>

                <div className="text-[11px] text-slate-500">
                  {safeDateTime(ticket.created_at)}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </GlassCard>
  );
}

function PaymentsDueCard({ invoices, totalDue, onPayNow, onOpenOrder, onViewOrders }) {
  return (
    <GlassCard
      title="Saved Payments / Balance"
      subtitle="Invoices ready for payment show here."
      tone={invoices.length ? "amber" : "emerald"}
      right={invoices.length ? <Pill tone="amber">{invoices.length} Due</Pill> : <Pill tone="emerald">Clear</Pill>}
    >
      <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-4">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-200/80">
          Total Due
        </div>
        <div className="mt-2 text-3xl font-black text-amber-100">{safeMoney(totalDue)}</div>
      </div>

      <div className="mt-4 space-y-3">
        {invoices.length ? (
          invoices.slice(0, 3).map((item) => {
            const ticket = item.ticket;
            const invoice = item.invoice;
            const amount = invoiceAmount(invoice);

            return (
              <div
                key={`due-${ticket.id}-${invoice?.id || "latest"}`}
                className="rounded-3xl border border-slate-800 bg-slate-950/45 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-black text-slate-100">
                      {resolveCustomerFriendlyTitle(ticket)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">Ticket #{ticket.id}</div>
                  </div>
                  <span className={invoicePill(invoice?.status)}>
                    {String(invoice?.status || "OPEN")}
                  </span>
                </div>

                <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="shrink-0">
                    <div className="text-[11px] text-slate-500">Amount Due</div>
                    <div className="text-xl font-black text-cyan-100">{safeMoney(amount)}</div>
                  </div>

                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <button
                      type="button"
                      onClick={() => onOpenOrder(ticket.id)}
                      className="inline-flex h-9 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/60 px-4 text-xs font-semibold text-slate-200 hover:bg-slate-900/70"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => onPayNow(ticket.id)}
                      className="inline-flex h-9 items-center justify-center rounded-2xl border border-amber-500/35 bg-amber-500/14 px-4 text-xs font-semibold text-amber-100 hover:bg-amber-500/20"
                    >
                      Pay Now
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-sm font-bold text-slate-200">No invoices due right now.</div>
            <div className="mt-1 text-xs text-slate-500">
              When a provider sends an invoice, it will appear here.
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onViewOrders}
        className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/12 px-4 text-xs font-black text-cyan-100 hover:bg-cyan-500/18"
      >
        View All Requests
      </button>
    </GlassCard>
  );
}

function ActivityFeed({ tickets, invoices }) {
  const items = useMemo(() => {
    const ticketItems = (tickets || []).slice(0, 4).map((ticket) => ({
      id: `ticket-${ticket.id}`,
      title: resolveCustomerFriendlyTitle(ticket),
      meta: `Request ${String(ticket.status || "NEW").replaceAll("_", " ")}`,
      time: safeDateTime(ticket.created_at || ticket.updated_at),
      tone: isPriorityOne(ticket) ? "rose" : "cyan",
    }));

    const invoiceItems = (invoices || []).slice(0, 2).map((item) => ({
      id: `invoice-${item.ticket.id}-${item.invoice?.id || "latest"}`,
      title: "Invoice ready",
      meta: `${resolveCustomerFriendlyTitle(item.ticket)} • ${safeMoney(invoiceAmount(item.invoice))}`,
      time: safeDate(item.invoice?.due_date || item.ticket?.updated_at),
      tone: "amber",
    }));

    return [...invoiceItems, ...ticketItems].slice(0, 6);
  }, [tickets, invoices]);

  return (
    <GlassCard title="Recent Activity" subtitle="Updates across requests, invoices, and provider actions." tone="indigo">
      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex gap-3 rounded-3xl border border-slate-800 bg-slate-950/40 p-3">
              <div
                className={cx(
                  "mt-1 h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_16px_currentColor]",
                  item.tone === "rose"
                    ? "bg-rose-400 text-rose-400"
                    : item.tone === "amber"
                    ? "bg-amber-400 text-amber-400"
                    : "bg-cyan-400 text-cyan-400"
                )}
              />
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-slate-100">{item.title}</div>
                <div className="mt-1 text-xs text-slate-400">{item.meta}</div>
                <div className="mt-1 text-[11px] text-slate-600">{item.time}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">
          Activity will appear after your first request.
        </div>
      )}
    </GlassCard>
  );
}

function QuickActionsCard({ navigate, setTab }) {
  const actions = [
    { label: "New Request", icon: "+", tone: "cyan", onClick: () => navigate("/customer/new-request") },
    { label: "My Requests", icon: "🧾", tone: "indigo", onClick: () => setTab("orders") },
    { label: "Messages", icon: "💬", tone: "fuchsia", onClick: () => setTab("inbox") },
    { label: "Saved Business", icon: "★", tone: "emerald", onClick: () => navigate("/customer/business-cards") },
    { label: "Support", icon: "🎧", tone: "cyan", onClick: () => navigate("/support") },
    { label: "Account", icon: "⚙", tone: "slate", onClick: () => navigate("/settings") },
  ];

  return (
    <GlassCard title="Quick Actions" subtitle="Fast access to the tools customers use most." tone="fuchsia">
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className="rounded-3xl border border-slate-800 bg-slate-950/45 p-4 text-left transition hover:border-cyan-500/30 hover:bg-slate-900/60"
          >
            <div className="text-2xl">{action.icon}</div>
            <div className="mt-3 text-sm font-black text-slate-100">{action.label}</div>
          </button>
        ))}
      </div>
    </GlassCard>
  );
}

function DealsCard({ items, onOpenFeedItem, onViewFeed }) {
  return (
    <GlassCard
      title="Featured Local Deals"
      subtitle="Sponsored businesses, saved providers, and marketplace promos."
      tone="fuchsia"
      right={
        <button
          type="button"
          onClick={onViewFeed}
          className="rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/12 px-4 py-2 text-xs font-black text-fuchsia-100 hover:bg-fuchsia-500/18"
        >
          Newsfeed
        </button>
      }
    >
      <div className="flex gap-3 overflow-x-auto pb-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="min-w-[280px] rounded-3xl border border-slate-800 bg-slate-950/45 p-4"
          >
            <div className="flex flex-wrap gap-2">
              <Pill tone="fuchsia">{item.type || "Featured"}</Pill>
              {item.sponsored ? <Pill tone="emerald">Sponsored</Pill> : null}
            </div>

            <div className="mt-4 text-lg font-black text-white">
              {item.business_name || item.title || "Featured Business"}
            </div>
            <div className="mt-2 text-sm text-cyan-200">{item.headline}</div>
            <div className="mt-3 text-sm text-slate-400">{item.body}</div>

            <button
              type="button"
              onClick={() => onOpenFeedItem(item)}
              className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/12 px-4 text-xs font-black text-fuchsia-100 hover:bg-fuchsia-500/18"
            >
              {item.cta || "Open"}
            </button>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function SavedBusinessCard({ navigate }) {
  return (
    <GlassCard title="My Business Cards" subtitle="Save providers you trust and rebook faster." tone="emerald">
      <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4">
        <div className="text-sm font-black text-emerald-100">Saved businesses live here.</div>
        <div className="mt-2 text-xs leading-5 text-slate-400">
          When you favorite a provider, SyncWorks keeps them one tap away for future jobs.
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate("/customer/business-cards")}
        className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/12 px-4 text-xs font-black text-emerald-100 hover:bg-emerald-500/18"
      >
        Open Saved Businesses
      </button>
    </GlassCard>
  );
}

function ComingSoonPanel({ title, desc, icon = "✦", onUpgrade }) {
  return (
    <GlassCard title={title} subtitle={desc} tone="indigo">
      <div className="rounded-3xl border border-indigo-500/20 bg-indigo-500/10 p-6">
        <div className="text-4xl">{icon}</div>
        <div className="mt-4 text-lg font-black text-white">Coming soon inside SyncWorks.</div>
        <div className="mt-2 text-sm text-slate-400">
          This module is staged for future customer expansion.
        </div>
        <Button className="mt-5" tone="indigo" onClick={onUpgrade}>
          Upgrade / Learn More
        </Button>
      </div>
    </GlassCard>
  );
}

export default function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState("overview");
  const [tickets, setTickets] = useState([]);
  const [ticketsErr, setTicketsErr] = useState("");
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [archivedIds, setArchivedIds] = useState(() => readArchivedSet(user));
  const [ticketActionErr, setTicketActionErr] = useState("");
  const [feedItems, setFeedItems] = useState([]);

  const displayName =
    user?.first_name || user?.firstName || user?.username || user?.email || "there";

  useEffect(() => {
    setArchivedIds(readArchivedSet(user));
  }, [user?.id, user?.email]);

  useEffect(() => {
    setFeedItems(seedFeedIfNeeded());
  }, []);

  async function loadTickets() {
    setTicketsErr("");
    setTicketsLoading(true);

    try {
      const r = await api.get("/tickets/");
      setTickets(safeList(r.data));
    } catch (e) {
      setTicketsErr(e?.response?.data?.detail || e?.message || "Failed to load tickets");
      setTickets([]);
    } finally {
      setTicketsLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  function archiveTicket(id) {
    const tid = Number(id);
    if (!Number.isFinite(tid)) return;

    const next = new Set(archivedIds);
    next.add(tid);
    setArchivedIds(next);
    writeArchivedSet(user, next);
  }

  async function cancelTicket(id) {
    const tid = Number(id);
    if (!Number.isFinite(tid)) return;

    setTicketActionErr("");

    try {
      await api.post(`/tickets/${tid}/cancel/`);
      await loadTickets();
    } catch (e) {
      setTicketActionErr(e?.response?.data?.detail || "Cancel failed");
    }
  }

  function openFeedItem(item) {
    const href = String(item?.cta_href || "").trim();

    if (href.startsWith("/")) {
      navigate(href);
      return;
    }

    if (href.startsWith("http://") || href.startsWith("https://")) {
      window.open(href, "_blank", "noreferrer");
    }
  }

  const visibleTickets = useMemo(() => {
    return safeList(tickets).filter((ticket) => !archivedIds.has(Number(ticket?.id)));
  }, [tickets, archivedIds]);

  const recentTickets = useMemo(() => visibleTickets.slice(0, 5), [visibleTickets]);

  const dueInvoiceItems = useMemo(() => {
    return visibleTickets
      .map((ticket) => ({ ticket, invoice: ticket?.latest_invoice || null }))
      .filter((x) => isInvoiceDue(x.invoice))
      .sort((a, b) => {
        const ad = a?.invoice?.due_date
          ? new Date(a.invoice.due_date).getTime()
          : Number.MAX_SAFE_INTEGER;
        const bd = b?.invoice?.due_date
          ? new Date(b.invoice.due_date).getTime()
          : Number.MAX_SAFE_INTEGER;
        return ad - bd;
      });
  }, [visibleTickets]);

  const totalDue = useMemo(() => {
    return dueInvoiceItems.reduce((sum, item) => sum + invoiceAmount(item.invoice), 0);
  }, [dueInvoiceItems]);

  const metrics = useMemo(() => {
    const open = visibleTickets.filter((t) => {
      const s = String(t?.status || "").toUpperCase();
      return !["COMPLETED", "PAID", "CLOSED", "CANCELLED"].includes(s);
    }).length;

    const inProgress = visibleTickets.filter((t) => isInProgressStatus(t?.status)).length;
    const completed = visibleTickets.filter((t) => isCompletedStatus(t?.status)).length;

    const totalSpent = visibleTickets.reduce((sum, t) => {
      const inv = t?.latest_invoice;
      const status = String(inv?.status || "").toUpperCase();
      if (status === "PAID") return sum + invoiceAmount(inv);
      return sum;
    }, 0);

    return {
      open,
      inProgress,
      completed,
      totalSpent,
    };
  }, [visibleTickets]);

  const tabs = useMemo(() => {
    return BASE_TABS.map((t) =>
      t.id === "orders" && dueInvoiceItems.length
        ? { ...t, label: `My Requests (${dueInvoiceItems.length})` }
        : t
    );
  }, [dueInvoiceItems.length]);

  const featuredFeedItems = useMemo(() => {
    return safeList(feedItems).filter((x) => !!x?.sponsored).slice(0, 6);
  }, [feedItems]);

  const bottomNavItems = [
    { label: "Home", icon: "⌂", active: tab === "overview", onClick: () => setTab("overview") },
    { label: "Requests", icon: "▤", active: tab === "orders", onClick: () => setTab("orders") },
    { label: "Messages", icon: "💬", active: tab === "inbox", onClick: () => setTab("inbox") },
    { label: "Account", icon: "◉", active: false, onClick: () => navigate("/settings") },
  ];

  return (
    <DashboardShell
      title="Customer Home"
      subtitle="Create requests • Track work • Pay invoices • Message providers"
      modeBarTitle="Customer Home"
      modeBarSubtitle="Create requests • Track orders • Keep everything in one place"
      bottomNavItems={bottomNavItems}
      bottomCenterAction={{
        label: "Request",
        onClick: () => navigate("/customer/new-request"),
      }}
      rightActions={
        <div className="flex flex-wrap gap-2">
          <Button tone="cyan" onClick={() => navigate("/customer/new-request")}>
            + New Request
          </Button>
          <Button tone="slate" onClick={() => navigate("/support")}>
            Support
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <NewsReel />

        <CustomerHero
          displayName={displayName}
          totalDue={totalDue}
          openCount={metrics.open}
          onNewRequest={() => navigate("/customer/new-request")}
          onViewOrders={() => setTab("orders")}
          onBusinessCards={() => navigate("/customer/business-cards")}
          onAffiliate={() => navigate("/customer/affiliate")}
        />

        <DashboardTabs tabs={tabs} activeTab={tab} onChange={setTab} />

        {tab === "overview" ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Open Requests"
                value={safeCount(metrics.open)}
                hint="Active customer requests"
                icon="▤"
                tone="cyan"
                badge="Live"
                onClick={() => setTab("orders")}
              />
              <StatCard
                label="In Progress"
                value={safeCount(metrics.inProgress)}
                hint="Accepted or scheduled"
                icon="↗"
                tone="indigo"
                onClick={() => setTab("orders")}
              />
              <StatCard
                label="Completed"
                value={safeCount(metrics.completed)}
                hint="Finished jobs"
                icon="✓"
                tone="emerald"
                onClick={() => setTab("orders")}
              />
              <StatCard
                label="Total Spent"
                value={safeMoney(metrics.totalSpent)}
                hint="Paid invoices"
                icon="$"
                tone="fuchsia"
                onClick={() => setTab("finance")}
              />
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div className="space-y-5">
                <RecentRequestsList
                  tickets={recentTickets}
                  loading={ticketsLoading}
                  error={ticketsErr}
                  actionError={ticketActionErr}
                  onRefresh={loadTickets}
                  onOpenTicket={(id) => navigate(`/tickets/${id}`)}
                  onArchive={archiveTicket}
                  onCancel={cancelTicket}
                />

                <GlassCard
                  title="Request Status Overview"
                  subtitle="Simple snapshot of the customer workflow."
                  tone="indigo"
                >
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                      <div className="text-xs text-cyan-200">Open</div>
                      <div className="mt-2 text-3xl font-black text-white">{metrics.open}</div>
                    </div>
                    <div className="rounded-3xl border border-indigo-500/20 bg-indigo-500/10 p-4">
                      <div className="text-xs text-indigo-200">In Progress</div>
                      <div className="mt-2 text-3xl font-black text-white">
                        {metrics.inProgress}
                      </div>
                    </div>
                    <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                      <div className="text-xs text-emerald-200">Completed</div>
                      <div className="mt-2 text-3xl font-black text-white">
                        {metrics.completed}
                      </div>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard title="This Week" subtitle="Weekly view of upcoming request activity." tone="cyan">
                  <CustomerWeeklyCalendar
                    tickets={visibleTickets}
                    onOpenTicket={(id) => navigate(`/tickets/${id}`)}
                    showHeader
                  />
                </GlassCard>

                <DealsCard
                  items={featuredFeedItems}
                  onOpenFeedItem={openFeedItem}
                  onViewFeed={() => navigate("/newsfeed")}
                />
              </div>

              <div className="space-y-5">
                <PaymentsDueCard
                  invoices={dueInvoiceItems}
                  totalDue={totalDue}
                  onPayNow={(ticketId) => navigate(`/tickets/${ticketId}`)}
                  onOpenOrder={(ticketId) => navigate(`/tickets/${ticketId}`)}
                  onViewOrders={() => setTab("orders")}
                />

                <SavedBusinessCard navigate={navigate} />

                <ActivityFeed tickets={recentTickets} invoices={dueInvoiceItems} />

                <QuickActionsCard navigate={navigate} setTab={setTab} />

                <GlassCard title="Inbox Snapshot" subtitle="Messages, updates, reminders, and broadcasts." tone="slate">
                  <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-3">
                    <InboxPanel />
                  </div>
                </GlassCard>
              </div>
            </div>
          </>
        ) : null}

        {tab === "orders" ? (
          <GlassCard
            title="My Requests"
            subtitle="All customer tickets and service orders."
            tone="cyan"
            right={
              <div className="flex flex-wrap gap-2">
                <Button tone="cyan" onClick={() => navigate("/customer/new-request")}>
                  + New Request
                </Button>
                <Button tone="slate" onClick={loadTickets}>
                  Refresh
                </Button>
              </div>
            }
          >
            <CustomerTickets embedded />
          </GlassCard>
        ) : null}

        {tab === "calendar" ? (
          <GlassCard title="Calendar" subtitle="Your customer service schedule." tone="cyan">
            <CustomerWeeklyCalendar
              tickets={visibleTickets}
              onOpenTicket={(id) => navigate(`/tickets/${id}`)}
              showHeader
            />
          </GlassCard>
        ) : null}

        {tab === "todo" ? (
          <TodoList
            scope="customer"
            title="Quick To-Do"
            subtitle="Fast notes + checkboxes."
            showStatus
            rightRailAds
          />
        ) : null}

        {tab === "inbox" ? (
          <InboxPanel
            title="Messages"
            subtitle="Ticket updates, messages, broadcasts, and reminders."
          />
        ) : null}

        {tab === "deals" ? (
          <DealsCard
            items={featuredFeedItems}
            onOpenFeedItem={openFeedItem}
            onViewFeed={() => navigate("/newsfeed")}
          />
        ) : null}

        {tab === "finance" ? (
          <ComingSoonPanel
            icon="💳"
            title="Finance"
            desc="Bills, budgets, saved cards, cashflow snapshots, and payment history."
            onUpgrade={() => navigate("/upgrade")}
          />
        ) : null}
      </div>
    </DashboardShell>
  );
}