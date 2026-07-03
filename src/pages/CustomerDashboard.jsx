import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/client";
import { useAuth } from "../auth/AuthContext";

import AddToCalendarButton from "../components/AddToCalendarButton";
import CalendarAgenda from "../components/CalendarAgenda";
import CustomerTickets from "../components/CustomerTickets";
import InboxPanel from "../components/Inbox/InboxPanel";
import NewsReel from "../components/NewsReel";
import PriorityBadge, { isPriorityOne } from "../components/tickets/PriorityBadge";
import TodoList from "../components/TodoList";

import DashboardShell from "../components/dashboard/DashboardShell";
import GlassCard, { cx } from "../components/dashboard/GlassCard";
import CustomerMobileHome from "../components/customer/CustomerMobileHome";

const BASE_TABS = [
  { id: "overview", label: "Home" },
  { id: "orders", label: "Requests" },
  { id: "calendar", label: "Schedule" },
  { id: "inbox", label: "Messages" },
  { id: "finance", label: "Money" },
  { id: "health", label: "Health" },
  { id: "todo", label: "To-Do" },
  { id: "deals", label: "Deals" },
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

function statusPill(status) {
  const s = String(status || "NEW").toUpperCase();
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]";

  if (["COMPLETED", "PAID", "CLOSED"].includes(s)) {
    return `${base} border-emerald-500/25 bg-emerald-500/10 text-emerald-200`;
  }

  if (["CANCELLED", "VOID"].includes(s)) {
    return `${base} border-rose-500/25 bg-rose-500/10 text-rose-200`;
  }

  if (["IN_PROGRESS", "ACCEPTED", "ASSIGNED", "SCHEDULED"].includes(s)) {
    return `${base} border-indigo-500/25 bg-indigo-500/10 text-indigo-200`;
  }

  if (["INVOICED", "SENT", "OPEN", "READY_FOR_PAYMENT"].includes(s)) {
    return `${base} border-amber-500/25 bg-amber-500/10 text-amber-200`;
  }

  return `${base} border-cyan-500/25 bg-cyan-500/10 text-cyan-200`;
}

function invoicePill(status) {
  const s = String(status || "OPEN").toUpperCase();
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]";

  if (s === "PAID") {
    return `${base} border-emerald-500/25 bg-emerald-500/10 text-emerald-200`;
  }

  if (s === "VOID") {
    return `${base} border-white/10 bg-white/[0.04] text-slate-300`;
  }

  return `${base} border-amber-500/25 bg-amber-500/10 text-amber-200`;
}

function Pill({ children, tone = "slate" }) {
  const tones = {
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-200",
    indigo: "border-indigo-500/25 bg-indigo-500/10 text-indigo-200",
    fuchsia: "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-200",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-500/25 bg-amber-500/10 text-amber-200",
    rose: "border-rose-500/25 bg-rose-500/10 text-rose-200",
    slate: "border-white/10 bg-white/[0.04] text-slate-300",
  };

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]",
        tones[tone] || tones.slate
      )}
    >
      {children}
    </span>
  );
}

function MiniActionButton({ children, onClick, tone = "slate", className = "" }) {
  const tones = {
    cyan: "border-cyan-400/25 bg-cyan-500/12 text-cyan-100 hover:bg-cyan-500/18",
    indigo: "border-indigo-400/25 bg-indigo-500/12 text-indigo-100 hover:bg-indigo-500/18",
    fuchsia: "border-fuchsia-400/25 bg-fuchsia-500/12 text-fuchsia-100 hover:bg-fuchsia-500/18",
    emerald: "border-emerald-400/25 bg-emerald-500/12 text-emerald-100 hover:bg-emerald-500/18",
    amber: "border-amber-400/25 bg-amber-500/12 text-amber-100 hover:bg-amber-500/18",
    slate: "border-white/10 bg-white/[0.04] text-slate-100 hover:bg-white/[0.07]",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex h-10 items-center justify-center rounded-2xl border px-4 text-xs font-black transition",
        tones[tone] || tones.slate,
        className
      )}
    >
      {children}
    </button>
  );
}

function IconButton({ title, tone = "slate", disabled, onClick, children }) {
  const tones = {
    slate: "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.07]",
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15",
    rose: "border-rose-500/25 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15",
    amber: "border-amber-500/25 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15",
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

function DashboardTabs({ tabs, activeTab, onChange }) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {tabs.map((tab) => {
        const active = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cx(
              "h-10 shrink-0 rounded-2xl border px-4 text-xs font-black uppercase tracking-[0.1em] transition",
              active
                ? "border-cyan-400/35 bg-cyan-500/14 text-cyan-100"
                : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function CustomerHero({
  displayName,
  totalDue,
  openCount,
  onNewRequest,
  onOpenMoney,
  onOpenHealth,
}) {
  return (
    <section className="relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-slate-950/65 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.28)] md:rounded-[2rem] md:p-6">
      <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-cyan-500/14 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-1/4 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-200/90">
              Personal Life Hub
            </div>

            <h1 className="mt-2 text-2xl font-black tracking-tight text-white md:text-4xl">
              Hey {displayName}
            </h1>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
              Requests, payments, schedule, money, health, and local services in one place.
            </p>
          </div>

          <div className="hidden shrink-0 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-right sm:block">
            <div className="text-[10px] font-black uppercase tracking-widest text-cyan-200">
              Open
            </div>
            <div className="text-xl font-black text-white">{safeCount(openCount)}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <MiniActionButton tone="cyan" onClick={onNewRequest}>
            + New Request
          </MiniActionButton>

          <MiniActionButton tone="amber" onClick={onOpenMoney}>
            Pay / Money
          </MiniActionButton>

          <MiniActionButton tone="emerald" onClick={onOpenHealth}>
            Health
          </MiniActionButton>

          <MiniActionButton tone="slate" onClick={onOpenMoney}>
            Due {safeMoney(totalDue)}
          </MiniActionButton>
        </div>
      </div>
    </section>
  );
}

function TodayCard({
  tickets,
  invoices,
  onOpenTicket,
  onNewRequest,
  onOpenCalendar,
  onOpenMoney,
  onOpenHealth,
}) {
  const scheduledTickets = useMemo(() => {
    return safeList(tickets)
      .filter((ticket) => {
        return (
          ticket?.scheduled_at ||
          ticket?.schedule_time ||
          ticket?.scheduled_start ||
          ticket?.appointment_at
        );
      })
      .slice(0, 2);
  }, [tickets]);

  const firstInvoice = safeList(invoices)[0] || null;

  return (
    <GlassCard title="Today" subtitle="Your clean snapshot across services, payments, and life." tone="cyan">
      <div className="space-y-3">
        {firstInvoice ? (
          <button
            type="button"
            onClick={() => onOpenTicket(firstInvoice.ticket.id)}
            className="w-full rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-left transition hover:bg-amber-500/15"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-200">
                  Payment Ready
                </div>

                <div className="mt-1 truncate text-base font-black text-white">
                  {resolveCustomerFriendlyTitle(firstInvoice.ticket)}
                </div>

                <div className="mt-1 text-xs text-slate-400">
                  Due {safeDate(firstInvoice.invoice?.due_date)}
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-lg font-black text-amber-100">
                  {safeMoney(invoiceAmount(firstInvoice.invoice))}
                </div>

                <div className="mt-1 text-[11px] font-bold text-amber-200/80">
                  Pay now
                </div>
              </div>
            </div>
          </button>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-black text-white">No service payments due.</div>
            <div className="mt-1 text-xs leading-5 text-slate-400">
              When invoices are ready, they will show here first.
            </div>
          </div>
        )}

        {scheduledTickets.length ? (
          scheduledTickets.map((ticket) => {
            const when =
              ticket.scheduled_at ||
              ticket.schedule_time ||
              ticket.scheduled_start ||
              ticket.appointment_at;

            return (
              <button
                key={`today-ticket-${ticket.id}`}
                type="button"
                onClick={() => onOpenTicket(ticket.id)}
                className="w-full rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4 text-left transition hover:bg-cyan-500/15"
              >
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-cyan-200">
                  Scheduled Service
                </div>

                <div className="mt-1 text-sm font-black text-white">
                  {resolveCustomerFriendlyTitle(ticket)}
                </div>

                <div className="mt-1 text-xs text-slate-400">{safeDateTime(when)}</div>
              </button>
            );
          })
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-black text-white">No scheduled service today.</div>
            <div className="mt-1 text-xs leading-5 text-slate-400">
              Bills, mortgage/rent, workouts, and appointments can layer into this next.
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <MiniActionButton tone="cyan" onClick={onNewRequest}>
            Request
          </MiniActionButton>

          <MiniActionButton tone="indigo" onClick={onOpenCalendar}>
            Schedule
          </MiniActionButton>

          <MiniActionButton tone="amber" onClick={onOpenMoney}>
            Add Bill
          </MiniActionButton>

          <MiniActionButton tone="emerald" onClick={onOpenHealth}>
            Workout
          </MiniActionButton>
        </div>
      </div>
    </GlassCard>
  );
}

function QuickActionsCard({ navigate, setTab }) {
  const actions = [
    { label: "Request", icon: "+", tone: "cyan", onClick: () => navigate("/customer/new-request") },
    { label: "Money", icon: "$", tone: "amber", onClick: () => navigate("/customer/finance") },
    { label: "Chat", icon: "💬", tone: "fuchsia", onClick: () => setTab("inbox") },
    { label: "Health", icon: "♥", tone: "emerald", onClick: () => navigate("/customer/health") },
    { label: "Saved", icon: "★", tone: "indigo", onClick: () => navigate("/customer/business-cards") },
    { label: "Support", icon: "?", tone: "slate", onClick: () => navigate("/support") },
  ];

  const toneClasses = {
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-100",
    fuchsia: "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-100",
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
    indigo: "border-indigo-400/20 bg-indigo-500/10 text-indigo-100",
    slate: "border-white/10 bg-white/[0.03] text-slate-100",
  };

  return (
    <GlassCard title="Quick Actions" subtitle="Fast access without crowding the home page." tone="indigo">
      <div className="grid grid-cols-3 gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className={cx(
              "min-h-[76px] rounded-2xl border p-3 text-left transition hover:bg-white/[0.06]",
              toneClasses[action.tone] || toneClasses.slate
            )}
          >
            <div className="text-lg font-black">{action.icon}</div>
            <div className="mt-2 text-xs font-black leading-tight">{action.label}</div>
          </button>
        ))}
      </div>
    </GlassCard>
  );
}

function RequestsPreviewCard({
  tickets,
  loading,
  error,
  actionError,
  onRefresh,
  onOpenTicket,
  onArchive,
  onCancel,
  onViewAll,
}) {
  return (
    <GlassCard
      title="Active Requests"
      subtitle="Only the most important service activity stays on the home screen."
      tone="cyan"
      right={
        <IconButton title="Refresh" onClick={onRefresh}>
          ↻
        </IconButton>
      }
    >
      {actionError ? (
        <div className="mb-3 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-3 text-sm text-rose-200">
          {actionError}
        </div>
      ) : null}

      {error ? (
        <div className="mb-3 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {loading ? <div className="text-sm text-slate-400">Loading requests…</div> : null}

      {!loading && !tickets.length ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-sm font-black text-white">No active requests yet.</div>
          <div className="mt-1 text-xs leading-5 text-slate-400">
            Tap the center + button to request a service.
          </div>
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
                "cursor-pointer rounded-2xl border bg-white/[0.03] p-4 outline-none transition hover:bg-white/[0.06] focus:ring-2 focus:ring-cyan-500/25",
                p1 ? "border-rose-400/35" : "border-white/10"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="truncate text-base font-black text-slate-100">
                      {serviceTitle}
                    </div>
                    {p1 ? <Pill tone="rose">Now</Pill> : null}
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
                      <>Provider pending</>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className={statusPill(ticket.status)}>
                    {String(ticket.status || "NEW").replaceAll("_", " ")}
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

      <MiniActionButton tone="cyan" className="mt-4 w-full" onClick={onViewAll}>
        View All Requests
      </MiniActionButton>
    </GlassCard>
  );
}

function MoneySnapshotCard({
  invoices,
  totalDue,
  paidThisYear,
  onOpenMoney,
  onViewRequests,
}) {
  const dueCount = safeList(invoices).length;

  const billSnapshot = useMemo(() => {
    try {
      const raw = localStorage.getItem("sw_customer_money_snapshot_v1");
      const parsed = raw ? JSON.parse(raw) : null;

      if (!parsed || typeof parsed !== "object") {
        return {
          monthly_bills: 0,
          covered_amount: 0,
          covered_percent: 0,
        };
      }

      const monthlyBills = Number(parsed.monthly_bills || parsed.monthlyBills || 0);
      const coveredAmount = Number(parsed.covered_amount || parsed.coveredAmount || 0);
      const percent =
        monthlyBills > 0
          ? Math.min(100, Math.max(0, Math.round((coveredAmount / monthlyBills) * 100)))
          : 0;

      return {
        monthly_bills: Number.isFinite(monthlyBills) ? monthlyBills : 0,
        covered_amount: Number.isFinite(coveredAmount) ? coveredAmount : 0,
        covered_percent: Number.isFinite(percent) ? percent : 0,
      };
    } catch {
      return {
        monthly_bills: 0,
        covered_amount: 0,
        covered_percent: 0,
      };
    }
  }, []);

  const hasBillTracker = billSnapshot.monthly_bills > 0;

  return (
    <GlassCard
      title="Money"
      subtitle="Bills, service payments, subscriptions, and future linked payments."
      tone={totalDue > 0 ? "amber" : "emerald"}
      right={dueCount ? <Pill tone="amber">{dueCount} Due</Pill> : <Pill tone="emerald">Clear</Pill>}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-200/90">
            Service Due
          </div>

          <div className="mt-2 text-3xl font-black text-amber-50">
            {safeMoney(totalDue)}
          </div>

          <div className="mt-1 text-xs text-slate-400">
            Invoices ready through SyncWorks.
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-200/90">
            Bills Covered
          </div>

          <div className="mt-2 flex items-end gap-2">
            <div className="text-3xl font-black text-cyan-50">
              {hasBillTracker ? `${billSnapshot.covered_percent}%` : "—"}
            </div>

            {hasBillTracker ? (
              <div className="pb-1 text-xs text-slate-400">
                {safeMoney(billSnapshot.covered_amount)}
              </div>
            ) : null}
          </div>

          <div className="mt-1 text-xs text-slate-400">
            Add mortgage, rent, auto, utilities, and subscriptions.
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-black text-white">
              Mortgage / rent tracking is ready.
            </div>

            <div className="mt-1 text-xs leading-5 text-slate-400">
              Open Money to manage bills, due dates, coverage, and priorities.
            </div>
          </div>

          <Pill tone="slate">Money</Pill>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <MiniActionButton tone="amber" onClick={onOpenMoney}>
          Open Money
        </MiniActionButton>

        <MiniActionButton tone="slate" onClick={onViewRequests}>
          Requests
        </MiniActionButton>
      </div>

      <div className="mt-3 text-[11px] leading-5 text-slate-500">
        Paid service history: {safeMoney(paidThisYear)}.
      </div>
    </GlassCard>
  );
}

function PaymentsDueCard({ invoices, totalDue, onPayNow, onOpenOrder, onViewOrders }) {
  return (
    <GlassCard
      title="Payments"
      subtitle="Invoices ready for payment show here."
      tone={invoices.length ? "amber" : "emerald"}
      right={invoices.length ? <Pill tone="amber">{invoices.length} Due</Pill> : <Pill tone="emerald">Clear</Pill>}
    >
      <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-amber-200/80">
          Total Due
        </div>

        <div className="mt-2 text-3xl font-black text-amber-100">
          {safeMoney(totalDue)}
        </div>
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
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-black text-slate-100">
                      {resolveCustomerFriendlyTitle(ticket)}
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      Ticket #{ticket.id}
                    </div>
                  </div>

                  <span className={invoicePill(invoice?.status)}>
                    {String(invoice?.status || "OPEN")}
                  </span>
                </div>

                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="shrink-0">
                    <div className="text-[11px] text-slate-500">Amount Due</div>
                    <div className="text-xl font-black text-cyan-100">
                      {safeMoney(amount)}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <MiniActionButton tone="slate" onClick={() => onOpenOrder(ticket.id)}>
                      Open
                    </MiniActionButton>

                    <MiniActionButton tone="amber" onClick={() => onPayNow(ticket.id)}>
                      Pay
                    </MiniActionButton>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-bold text-slate-200">
              No invoices due right now.
            </div>

            <div className="mt-1 text-xs text-slate-500">
              When a provider sends an invoice, it will appear here.
            </div>
          </div>
        )}
      </div>

      <MiniActionButton tone="cyan" className="mt-4 w-full" onClick={onViewOrders}>
        View All Requests
      </MiniActionButton>
    </GlassCard>
  );
}

function HealthSnapshotCard({ onOpenHealth }) {
  const healthSnapshot = useMemo(() => {
    try {
      const raw = localStorage.getItem("sw_customer_health_snapshot_v1");
      const parsed = raw ? JSON.parse(raw) : null;

      if (!parsed || typeof parsed !== "object") {
        return {
          workout: "",
          steps: 0,
          step_goal: 8000,
          calories: 0,
          calorie_goal: 2200,
        };
      }

      return {
        workout: safeStr(parsed.workout || parsed.today_workout || ""),
        steps: Number(parsed.steps || 0),
        step_goal: Number(parsed.step_goal || parsed.stepGoal || 8000),
        calories: Number(parsed.calories || 0),
        calorie_goal: Number(parsed.calorie_goal || parsed.calorieGoal || 2200),
      };
    } catch {
      return {
        workout: "",
        steps: 0,
        step_goal: 8000,
        calories: 0,
        calorie_goal: 2200,
      };
    }
  }, []);

  const stepPercent =
    healthSnapshot.step_goal > 0
      ? Math.min(
          100,
          Math.max(0, Math.round((healthSnapshot.steps / healthSnapshot.step_goal) * 100))
        )
      : 0;

  return (
    <GlassCard title="Health" subtitle="Fitness, calories, steps, and goals." tone="emerald">
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-200/90">
          Today
        </div>

        <div className="mt-2 text-lg font-black text-white">
          {healthSnapshot.workout || "No workout planned yet"}
        </div>

        <div className="mt-1 text-xs leading-5 text-slate-400">
          Open Health for workouts, goals, steps, calories, progress, and devices.
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs text-slate-400">Steps</div>

          <div className="mt-1 text-xl font-black text-white">
            {safeCount(healthSnapshot.steps).toLocaleString()}
          </div>

          <div className="mt-1 text-[11px] text-slate-500">
            {stepPercent}% of goal
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs text-slate-400">Calories</div>

          <div className="mt-1 text-xl font-black text-white">
            {safeCount(healthSnapshot.calories).toLocaleString()}
          </div>

          <div className="mt-1 text-[11px] text-slate-500">
            Goal {safeCount(healthSnapshot.calorie_goal).toLocaleString()}
          </div>
        </div>
      </div>

      <MiniActionButton tone="emerald" className="mt-4 w-full" onClick={onOpenHealth}>
        Open Health
      </MiniActionButton>
    </GlassCard>
  );
}

function CompactScheduleCard({ tickets, onOpenTicket, onOpenCalendar }) {
  const scheduledTickets = safeList(tickets)
    .filter((ticket) => {
      return (
        ticket?.scheduled_at ||
        ticket?.schedule_time ||
        ticket?.scheduled_start ||
        ticket?.appointment_at
      );
    })
    .slice(0, 3);

  return (
    <GlassCard title="Schedule" subtitle="Compact on mobile. Full calendar stays one tap away." tone="cyan">
      {scheduledTickets.length ? (
        <div className="space-y-3">
          {scheduledTickets.map((ticket) => {
            const when =
              ticket.scheduled_at ||
              ticket.schedule_time ||
              ticket.scheduled_start ||
              ticket.appointment_at;

            return (
              <button
                key={`schedule-${ticket.id}`}
                type="button"
                onClick={() => onOpenTicket(ticket.id)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.06]"
              >
                <div className="text-sm font-black text-white">
                  {resolveCustomerFriendlyTitle(ticket)}
                </div>

                <div className="mt-1 text-xs text-slate-400">
                  {safeDateTime(when)}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-sm font-black text-white">No scheduled tickets.</div>

          <div className="mt-1 text-xs leading-5 text-slate-400">
            Bills, mortgage/rent, fitness reminders, and appointments can be layered here next.
          </div>
        </div>
      )}

      <MiniActionButton tone="cyan" className="mt-4 w-full" onClick={onOpenCalendar}>
        View Schedule
      </MiniActionButton>
    </GlassCard>
  );
}

function FullCalendarPanel() {
  return <CalendarAgenda modeLabel="Life Schedule" showComposer />;
}

function DealsCard({ items, onOpenFeedItem, onViewFeed }) {
  const list = safeList(items).slice(0, 3);

  return (
    <GlassCard
      title="Featured Local Deals"
      subtitle="One-column mobile cards. No more cramped side-scroll."
      tone="fuchsia"
      right={<Pill tone="fuchsia">Local</Pill>}
    >
      {list.length ? (
        <div className="space-y-3">
          {list.map((item) => (
            <article
              key={item.id || `${item.business_name}-${item.headline}`}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex flex-wrap gap-2">
                {item.type ? <Pill tone="fuchsia">{item.type}</Pill> : null}
                {item.sponsored ? <Pill tone="emerald">Sponsored</Pill> : null}
              </div>

              <div className="mt-3 text-lg font-black text-white">
                {item.business_name || "Local Business"}
              </div>

              {item.headline ? (
                <div className="mt-2 text-sm font-semibold leading-6 text-cyan-100">
                  {item.headline}
                </div>
              ) : null}

              {item.body ? (
                <div className="mt-2 text-sm leading-6 text-slate-400">
                  {item.body}
                </div>
              ) : null}

              <MiniActionButton
                tone="fuchsia"
                className="mt-4 w-full"
                onClick={() => onOpenFeedItem(item)}
              >
                {item.cta || "Open"}
              </MiniActionButton>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
          Local promos will appear here.
        </div>
      )}

      <MiniActionButton tone="slate" className="mt-4 w-full" onClick={onViewFeed}>
        View Feed
      </MiniActionButton>
    </GlassCard>
  );
}

function SavedBusinessCard({ navigate }) {
  return (
    <GlassCard title="Saved Providers" subtitle="Favorite providers and rebook faster." tone="emerald">
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
        <div className="text-sm font-black text-emerald-100">
          Saved businesses live here.
        </div>

        <div className="mt-1 text-xs leading-5 text-slate-400">
          When you favorite a provider, SyncWorks keeps them one tap away.
        </div>
      </div>

      <MiniActionButton
        tone="emerald"
        className="mt-4 w-full"
        onClick={() => navigate("/customer/business-cards")}
      >
        Open Saved Providers
      </MiniActionButton>
    </GlassCard>
  );
}

function ActivityFeed({ tickets, invoices }) {
  const items = useMemo(() => {
    const ticketItems = safeList(tickets)
      .slice(0, 3)
      .map((ticket) => ({
        id: `ticket-${ticket.id}`,
        title: resolveCustomerFriendlyTitle(ticket),
        meta: `Request ${String(ticket.status || "NEW").replaceAll("_", " ")}`,
        time: safeDateTime(ticket.created_at || ticket.updated_at),
        tone: isPriorityOne(ticket) ? "rose" : "cyan",
      }));

    const invoiceItems = safeList(invoices)
      .slice(0, 2)
      .map((item) => ({
        id: `invoice-${item.ticket.id}-${item.invoice?.id || "latest"}`,
        title: "Invoice ready",
        meta: `${resolveCustomerFriendlyTitle(item.ticket)} • ${safeMoney(invoiceAmount(item.invoice))}`,
        time: safeDate(item.invoice?.due_date || item.ticket?.updated_at),
        tone: "amber",
      }));

    return [...invoiceItems, ...ticketItems].slice(0, 5);
  }, [tickets, invoices]);

  return (
    <GlassCard title="Recent Activity" subtitle="Short, readable updates only." tone="indigo">
      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3"
            >
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
                <div className="truncate text-sm font-bold text-slate-100">
                  {item.title}
                </div>

                <div className="mt-1 text-xs text-slate-400">
                  {item.meta}
                </div>

                <div className="mt-1 text-[11px] text-slate-600">
                  {item.time}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
          Activity will appear after your first request.
        </div>
      )}
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

  function openMoney() {
    navigate("/customer/finance");
  }

  function openHealth() {
    navigate("/customer/health");
  }

  function handleTabChange(nextTab) {
    if (nextTab === "health") {
      openHealth();
      return;
    }

    if (nextTab === "finance") {
      openMoney();
      return;
    }

    setTab(nextTab);
  }

  useEffect(() => {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, [tab]);

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

  const recentTickets = useMemo(() => visibleTickets.slice(0, 4), [visibleTickets]);

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
    return BASE_TABS.map((t) => {
      if (t.id === "orders" && dueInvoiceItems.length) {
        return { ...t, label: `Requests (${dueInvoiceItems.length})` };
      }

      if (t.id === "finance" && dueInvoiceItems.length) {
        return { ...t, label: `Money (${dueInvoiceItems.length})` };
      }

      return t;
    });
  }, [dueInvoiceItems.length]);

  const featuredFeedItems = useMemo(() => {
    return safeList(feedItems).filter((x) => !!x?.sponsored).slice(0, 6);
  }, [feedItems]);

  const bottomNavItems = [
    {
      label: "Home",
      icon: "⌂",
      active: tab === "overview",
      onClick: () => handleTabChange("overview"),
    },
    {
      label: "Requests",
      icon: "▤",
      active: tab === "orders",
      onClick: () => handleTabChange("orders"),
    },
    {
      label: "Calendar",
      icon: "◷",
      active: tab === "calendar",
      onClick: () => handleTabChange("calendar"),
    },
    {
      label: "More",
      icon: "•••",
      active: false,
      onClick: () => navigate("/settings"),
    },
  ];

  return (
    <DashboardShell
      title="Personal Home"
      subtitle="Requests • Schedule • Payments • Life"
      modeBarTitle="Personal Home"
      modeBarSubtitle="Personal Life OS"
      bottomNavItems={bottomNavItems}
      bottomCenterAction={{
        label: "Request",
        onClick: () => navigate("/customer/new-request"),
      }}
      rightActions={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate("/customer/new-request")}
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-500/12 px-4 text-xs font-black text-cyan-100 hover:bg-cyan-500/18"
          >
            + New Request
          </button>

          <button
            type="button"
            onClick={() => navigate("/support")}
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-xs font-black text-slate-100 hover:bg-white/[0.07]"
          >
            Support
          </button>
        </div>
      }
    >
      <div className="space-y-5 pb-4">
        {tab === "overview" ? (
          <CustomerMobileHome
            displayName={displayName}
            tickets={visibleTickets}
            invoices={dueInvoiceItems}
            openCount={metrics.open}
            totalDue={totalDue}
            loading={ticketsLoading}
            error={ticketsErr || ticketActionErr}
            onRefresh={loadTickets}
            onNewRequest={() => navigate("/customer/new-request")}
            onOpenTicket={(id) => navigate(`/tickets/${id}`)}
            onOpenRequests={() => handleTabChange("orders")}
            onOpenCalendar={() => handleTabChange("calendar")}
            onOpenMessages={() => handleTabChange("inbox")}
            onOpenMoney={openMoney}
            onOpenHealth={openHealth}
            onOpenMore={() => navigate("/settings")}
          />
        ) : null}

        <div className="hidden lg:block">
          <NewsReel />
        </div>

        <div className="hidden lg:block">
        <CustomerHero
          displayName={displayName}
          openCount={metrics.open}
          totalDue={totalDue}
          onNewRequest={() => navigate("/customer/new-request")}
          onOpenMoney={openMoney}
          onOpenHealth={openHealth}
        />
        </div>

        <div className={tab === "overview" ? "hidden lg:block" : "block"}>
          <DashboardTabs tabs={tabs} activeTab={tab} onChange={handleTabChange} />
        </div>

        {tab === "overview" ? (
          <div className="hidden gap-5 lg:grid xl:grid-cols-[minmax(0,1fr)_390px]">
            <div className="space-y-5">
              <TodayCard
                tickets={visibleTickets}
                invoices={dueInvoiceItems}
                onOpenTicket={(id) => navigate(`/tickets/${id}`)}
                onNewRequest={() => navigate("/customer/new-request")}
                onOpenCalendar={() => setTab("calendar")}
                onOpenMoney={openMoney}
                onOpenHealth={openHealth}
              />

              <RequestsPreviewCard
                tickets={recentTickets}
                loading={ticketsLoading}
                error={ticketsErr}
                actionError={ticketActionErr}
                onRefresh={loadTickets}
                onOpenTicket={(id) => navigate(`/tickets/${id}`)}
                onArchive={archiveTicket}
                onCancel={cancelTicket}
                onViewAll={() => setTab("orders")}
              />

              <MoneySnapshotCard
                invoices={dueInvoiceItems}
                totalDue={totalDue}
                paidThisYear={metrics.totalSpent}
                onOpenMoney={openMoney}
                onViewRequests={() => setTab("orders")}
              />

              <HealthSnapshotCard onOpenHealth={openHealth} />

              <DealsCard
                items={featuredFeedItems}
                onOpenFeedItem={openFeedItem}
                onViewFeed={() => navigate("/newsfeed")}
              />
            </div>

            <div className="space-y-5">
              <QuickActionsCard navigate={navigate} setTab={setTab} />

              <CompactScheduleCard
                tickets={visibleTickets}
                onOpenTicket={(id) => navigate(`/tickets/${id}`)}
                onOpenCalendar={() => setTab("calendar")}
              />

              <PaymentsDueCard
                invoices={dueInvoiceItems}
                totalDue={totalDue}
                onPayNow={(ticketId) => navigate(`/tickets/${ticketId}`)}
                onOpenOrder={(ticketId) => navigate(`/tickets/${ticketId}`)}
                onViewOrders={() => setTab("orders")}
              />

              <SavedBusinessCard navigate={navigate} />

              <ActivityFeed tickets={recentTickets} invoices={dueInvoiceItems} />
            </div>
          </div>
        ) : null}

        {tab === "orders" ? (
          <GlassCard
            title="My Requests"
            subtitle="All customer tickets and service orders."
            tone="cyan"
            right={
              <div className="flex flex-wrap gap-2">
                <MiniActionButton tone="cyan" onClick={() => navigate("/customer/new-request")}>
                  + New Request
                </MiniActionButton>

                <MiniActionButton tone="slate" onClick={loadTickets}>
                  Refresh
                </MiniActionButton>
              </div>
            }
          >
            <CustomerTickets embedded />
          </GlassCard>
        ) : null}

        {tab === "calendar" ? <FullCalendarPanel /> : null}

        {tab === "todo" ? (
          <TodoList
            scope="customer"
            title="Quick To-Do"
            subtitle="Fast notes, reminders, and checkboxes."
            showStatus
            rightRailAds={false}
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
      </div>
    </DashboardShell>
  );
}