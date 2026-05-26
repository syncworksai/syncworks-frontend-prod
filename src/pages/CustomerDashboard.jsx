// src/pages/CustomerDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import ModeBar from "../components/ModeBar";
import NewsReel from "../components/NewsReel";
import AddToCalendarButton from "../components/AddToCalendarButton";
import CustomerWeeklyCalendar from "../components/CustomerWeeklyCalendar";
import TodoList from "../components/TodoList";
import InboxPanel from "../components/Inbox/InboxPanel";
import CustomerTickets from "../components/CustomerTickets";
import PriorityBadge, { isPriorityOne } from "../components/tickets/PriorityBadge";
import CustomerDashboardTabs from "../components/customer/dashboard/CustomerDashboardTabs";
import CustomerHeroCard from "../components/customer/dashboard/CustomerHeroCard";
import CustomerAffiliateProgramCard from "../components/customer/dashboard/CustomerAffiliateProgramCard";

const BASE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "orders", label: "All Orders" },
  { id: "calendar", label: "Calendar" },
  { id: "todo", label: "Quick To-Do" },
  { id: "inbox", label: "Inbox" },
  { id: "deals", label: "Deals" },
  { id: "finance", label: "Finance" },
  { id: "fitness", label: "Fitness" },
];

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Card({ title, right, children, className = "" }) {
  return (
    <div
      className={cx(
        "rounded-3xl border border-slate-800/80 bg-slate-950/35 backdrop-blur-xl p-5 shadow-[0_0_60px_rgba(0,0,0,0.35)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="font-semibold text-slate-100">{title}</div>
        {right ? <div>{right}</div> : null}
      </div>
      {children}
    </div>
  );
}

function safeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

function statusPill(status) {
  const s = String(status || "").toUpperCase();
  const base =
    "text-[10px] px-2.5 py-1 rounded-full border font-semibold tracking-wide ";
  if (s === "COMPLETED" || s === "PAID")
    return base + "bg-emerald-500/10 border-emerald-500/30 text-emerald-200";
  if (s === "CANCELLED")
    return base + "bg-rose-500/10 border-rose-500/30 text-rose-200";
  return base + "bg-cyan-500/10 border-cyan-500/30 text-cyan-200";
}

function invoicePill(status) {
  const s = String(status || "").toUpperCase();
  const base =
    "text-[10px] px-2.5 py-1 rounded-full border font-semibold tracking-wide ";
  if (s === "PAID")
    return base + "bg-emerald-500/10 border-emerald-500/30 text-emerald-200";
  if (s === "VOID")
    return base + "bg-slate-500/10 border-slate-500/30 text-slate-300";
  if (s === "SENT" || s === "READY_FOR_PAYMENT" || s === "OPEN")
    return base + "bg-amber-500/10 border-amber-500/30 text-amber-200";
  return base + "bg-cyan-500/10 border-cyan-500/30 text-cyan-200";
}

function IconBtn({ title, tone = "slate", disabled, onClick, children }) {
  const tones = {
    slate:
      "bg-slate-950/70 border-slate-800 hover:bg-slate-900/60 text-slate-200",
    cyan: "bg-cyan-500/18 border-cyan-500/35 hover:bg-cyan-500/24 text-cyan-100",
    indigo:
      "bg-indigo-500/18 border-indigo-500/35 hover:bg-indigo-500/24 text-indigo-100",
    emerald:
      "bg-emerald-500/14 border-emerald-500/28 hover:bg-emerald-500/18 text-emerald-100",
    rose: "bg-rose-500/14 border-rose-500/28 hover:bg-rose-500/18 text-rose-100",
    fuchsia:
      "bg-fuchsia-500/14 border-fuchsia-500/28 hover:bg-fuchsia-500/18 text-fuchsia-100",
    amber:
      "bg-amber-500/14 border-amber-500/28 hover:bg-amber-500/18 text-amber-100",
  };

  return (
    <button
      type="button"
      title={title}
      disabled={!!disabled}
      onClick={onClick}
      className={cx(
        "inline-flex items-center justify-center h-9 w-9 rounded-2xl border transition select-none",
        tones[tone] || tones.slate,
        disabled ? "opacity-50 cursor-not-allowed" : ""
      )}
    >
      <span className="text-[14px] leading-none">{children}</span>
    </button>
  );
}

function archiveKeyForUser(user) {
  const uid = user?.id || user?.pk || user?.email || "anon";
  return `sw:customer_archived_tickets:${uid}`;
}

function readArchivedSet(user) {
  try {
    const raw = localStorage.getItem(archiveKeyForUser(user));
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.map((x) => Number(x)).filter((n) => Number.isFinite(n)));
  } catch {
    return new Set();
  }
}

function writeArchivedSet(user, set) {
  try {
    localStorage.setItem(archiveKeyForUser(user), JSON.stringify(Array.from(set)));
  } catch {}
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
  } catch {}
}

function seedFeedIfNeeded() {
  const existing = readLocalFeed();
  if (existing.length) return existing;

  const demo = [
    {
      id: "feed-1",
      type: "AD",
      sponsored: true,
      title: "Quantum Edge FX",
      business_name: "Quantum Edge FX",
      headline: "Trading tools, insights, and education built for serious traders.",
      body: "Get structure, clarity, and execution support with premium trading resources.",
      cta: "Learn More",
      cta_href: "/newsfeed",
      city: "Remote",
      state: "",
      image_url: "",
    },
    {
      id: "feed-2",
      type: "FEATURED_BUSINESS",
      sponsored: true,
      title: "Featured Local Service",
      business_name: "SyncWorks Demo Plumbing",
      headline: "Fast plumbing service with clean scheduling and trusted routing.",
      body: "Book directly through SyncWorks and save your favorite providers to Business Cards.",
      cta: "Book Now",
      cta_href: "/customer/new-request",
      city: "Montgomery",
      state: "AL",
      image_url: "",
    },
    {
      id: "feed-3",
      type: "LOCAL_PROMO",
      sponsored: true,
      title: "Featured Provider",
      business_name: "Montgomery Auto Detail",
      headline: "On-site detailing with fast booking and premium finish packages.",
      body: "Mobile service available this week. Save the provider card and book in minutes.",
      cta: "View Card",
      cta_href: "/customer/business-cards",
      city: "Montgomery",
      state: "AL",
      image_url: "",
    },
  ];

  writeLocalFeed(demo);
  return demo;
}

function PromoPill({ children, tone = "slate" }) {
  const cls =
    tone === "fuchsia"
      ? "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200"
      : tone === "emerald"
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
        : tone === "cyan"
          ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
          : tone === "amber"
            ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
            : "border-slate-800 bg-slate-950/60 text-slate-200";

  return (
    <span className={`text-[11px] px-3 py-1.5 rounded-full border font-semibold ${cls}`}>
      {children}
    </span>
  );
}

function FeaturedDealsRail({ items, onOpenFeedItem, onViewFeed }) {
  return (
    <Card
      title="Featured Local Deals"
      right={
        <button
          type="button"
          onClick={onViewFeed}
          className="inline-flex items-center justify-center h-9 text-xs rounded-2xl px-4 bg-fuchsia-500/14 border border-fuchsia-500/28 hover:bg-fuchsia-500/18 text-fuchsia-100"
        >
          Open Newsfeed
        </button>
      }
    >
      <div className="text-sm text-slate-400">
        Sponsored businesses, featured offers, and local promos customers can act on quickly.
      </div>

      <div className="mt-4 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
        {items.map((item) => (
          <div
            key={item.id}
            className="min-w-[310px] max-w-[310px] snap-start rounded-3xl border border-fuchsia-500/20 bg-slate-950/45 p-4 shadow-[0_0_30px_rgba(217,70,239,0.08)]"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <PromoPill tone="fuchsia">{item.type || "AD"}</PromoPill>
              <PromoPill tone="emerald">Sponsored</PromoPill>
              {(item.city || item.state) && (
                <PromoPill tone="cyan">
                  {item.city || ""}
                  {item.city && item.state ? ", " : ""}
                  {item.state || ""}
                </PromoPill>
              )}
            </div>

            <div className="mt-3 text-lg font-extrabold text-slate-100">
              {item.business_name || item.title || "Featured"}
            </div>

            {item.headline ? <div className="mt-2 text-sm text-cyan-200">{item.headline}</div> : null}
            {item.body ? <div className="mt-3 text-sm text-slate-300">{item.body}</div> : null}

            <button
              type="button"
              onClick={() => onOpenFeedItem(item)}
              className="mt-4 w-full h-10 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/12 hover:bg-fuchsia-500/18 text-fuchsia-100 text-sm font-semibold"
            >
              {item.cta || "Open"}
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
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
  ride_local: "Need a ride (local)",
  ride_airport: "Airport ride",
  ride_medical: "Medical transport (non-emergency)",
  delivery_pickup: "Delivery / pickup",
  moving_help: "Moving / hauling help",
  roadside: "Roadside help (jump/flat/lockout)",
  other_transport: "Other transportation help",
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
  other_any: "Describe a custom job",
};

function safeStr(x) {
  return (x ?? "").toString();
}

function titleCase(s) {
  return safeStr(s)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

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

  const blacklist = new Set(["ac not cooling", "ac-not-cooling", "uncategorized", "unknown", "not set"]);
  const firstGood = preferred.find((s) => !blacklist.has(s.toLowerCase()));
  if (firstGood) return firstGood;

  const intake = extractSyncworksIntake(t.description || t.details || "");
  const lifeKey = intake?.life_category || intake?.lifeCategory || "";
  const subtypeKey = intake?.subtype || intake?.type || "";

  const subtypeLabel = SUBTYPE_LABELS[subtypeKey] || (subtypeKey ? titleCase(subtypeKey) : "");
  const lifeLabel = LIFE_CATEGORY_LABELS[lifeKey] || (lifeKey ? titleCase(lifeKey) : "");

  if (subtypeLabel) return subtypeLabel;
  if (lifeLabel) return lifeLabel;
  if (t.category_name && typeof t.category_name === "string") return t.category_name;

  return "Service Request";
}

function resolveServiceStyle(ticket) {
  const t = ticket || {};
  const candidates = [t.category_name, t.category_path, t.category_key, t.taxonomy_label, t.display_title]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);

  return candidates[0] || "Service";
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

function getAcceptedBy(ticket) {
  const t = ticket || {};
  const candidates = [
    t.accepted_by_name,
    t.assigned_to_name,
    t.provider_name,
    t.contractor_name,
    t.business_name,
    t.accepted_by?.name,
    t.accepted_by?.full_name,
    t.assigned_to?.name,
    t.assigned_to?.full_name,
    t.assigned_to?.email,
    t.accepted_by?.email,
    t.business?.name,
    t.assigned_business_name,
    t.assigned_business_card?.name,
  ];

  const found = candidates.find((x) => typeof x === "string" && x.trim());
  return found ? found.trim() : "";
}

function ComingSoonPanel({ icon, title, desc, onUpgrade, bullets = [] }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/35 backdrop-blur-xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-extrabold truncate">
            <span className="mr-2">{icon}</span>
            {title}
          </div>
          <div className="text-sm text-slate-400 mt-2">{desc}</div>
        </div>
        <span className="text-[11px] px-3 py-1.5 rounded-full border font-semibold bg-indigo-500/10 border-indigo-500/30 text-indigo-200">
          Coming Soon
        </span>
      </div>

      {bullets?.length ? (
        <ul className="mt-4 text-sm text-slate-300 list-disc pl-5 space-y-1">
          {bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-5 flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={onUpgrade}
          className="inline-flex items-center justify-center h-10 text-xs rounded-2xl px-4 bg-cyan-500/18 border border-cyan-500/35 hover:bg-cyan-500/24 text-cyan-100"
        >
          Unlock via Upgrade
        </button>
      </div>
    </div>
  );
}

function DealsPanel({ feedItems, onOpenFeedItem, onOpenNewsfeed }) {
  return (
    <div className="space-y-4">
      <FeaturedDealsRail items={feedItems} onOpenFeedItem={onOpenFeedItem} onViewFeed={onOpenNewsfeed} />
    </div>
  );
}

function toMoney(n) {
  const v = Number(n || 0);
  return `$${v.toFixed(2)}`;
}

function invoiceAmount(invoice) {
  if (!invoice) return 0;
  if (invoice.total != null && invoice.total !== "") return Number(invoice.total || 0);
  if (invoice.amount != null && invoice.amount !== "") return Number(invoice.amount || 0);
  if (invoice.amount_cents != null && invoice.amount_cents !== "") return Number(invoice.amount_cents || 0) / 100;
  return 0;
}

function isInvoiceDue(invoice) {
  if (!invoice) return false;
  const status = String(invoice.status || "").toUpperCase();
  return !["PAID", "VOID"].includes(status);
}

function orderTabLabel(unpaidCount) {
  return unpaidCount > 0 ? `All Orders (${unpaidCount})` : "All Orders";
}

function PaymentsDueCard({ invoices, totalDue, onPayNow, onOpenOrder, onViewOrders }) {
  return (
    <Card
      title="Payments Due"
      right={
        invoices.length ? <PromoPill tone="amber">{invoices.length} due</PromoPill> : <PromoPill>No balance</PromoPill>
      }
    >
      {invoices.length ? (
        <>
          <div className="rounded-3xl border border-amber-500/20 bg-amber-500/8 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-amber-200/80">Total Due</div>
            <div className="mt-2 text-3xl font-extrabold text-amber-100">{toMoney(totalDue)}</div>
          </div>

          <div className="mt-4 space-y-3 min-w-0">
            {invoices.slice(0, 3).map((item) => {
              const ticket = item.ticket;
              const invoice = item.invoice;
              const serviceTitle = resolveCustomerFriendlyTitle(ticket);
              const amount = invoiceAmount(invoice);

              return (
                <div key={`due-${ticket.id}-${invoice.id || "latest"}`} className="rounded-3xl border border-slate-800/80 bg-slate-950/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-100 truncate">{serviceTitle}</div>
                      <div className="text-xs text-slate-400 mt-1">Ticket #{ticket.id}</div>
                    </div>
                    <span className={invoicePill(invoice?.status)}>{String(invoice?.status || "OPEN")}</span>
                  </div>

                  <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between min-w-0">
                    <div className="shrink-0">
                      <div className="text-[11px] text-slate-500">Amount Due</div>
                      <div className="text-xl font-extrabold text-cyan-100">{toMoney(amount)}</div>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      <button type="button" onClick={() => onOpenOrder(ticket.id)} className="inline-flex items-center justify-center h-9 text-xs rounded-2xl px-4 bg-slate-950/55 border border-slate-800/80 hover:bg-slate-900/40 text-slate-200">
                        Open Order
                      </button>
                      <button type="button" onClick={() => onPayNow(ticket.id)} className="inline-flex items-center justify-center h-9 text-xs rounded-2xl px-4 bg-amber-500/18 border border-amber-500/35 hover:bg-amber-500/24 text-amber-100">
                        Pay Now
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button type="button" onClick={onViewOrders} className="mt-4 w-full inline-flex items-center justify-center h-10 text-xs rounded-2xl px-4 bg-cyan-500/18 border border-cyan-500/35 hover:bg-cyan-500/24 text-cyan-100">
            View All Orders
          </button>
        </>
      ) : (
        <div className="rounded-3xl border border-slate-800/80 bg-slate-950/30 p-4">
          <div className="text-sm text-slate-200 font-semibold">No invoices due right now.</div>
          <div className="text-xs text-slate-500 mt-2">When a business marks an invoice ready for payment, it will show here.</div>
        </div>
      )}
    </Card>
  );
}

export default function CustomerDashboard() {
  const { user, activeBusinessId } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState("overview");
  const [tickets, setTickets] = useState([]);
  const [ticketsErr, setTicketsErr] = useState("");
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [archivedIds, setArchivedIds] = useState(() => readArchivedSet(user));
  const [ticketActionErr, setTicketActionErr] = useState("");
  const [feedItems, setFeedItems] = useState([]);

  const displayName = user?.first_name || user?.username || user?.email || "User";

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

  function unarchiveTicket(id) {
    const tid = Number(id);
    if (!Number.isFinite(tid)) return;
    const next = new Set(archivedIds);
    next.delete(tid);
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
    const list = Array.isArray(tickets) ? tickets : [];
    return list.filter((t) => !archivedIds.has(Number(t?.id)));
  }, [tickets, archivedIds]);

  const recentTickets = useMemo(() => (visibleTickets || []).slice(0, 4), [visibleTickets]);
  const archivedCount = useMemo(() => archivedIds.size, [archivedIds]);
  const featuredFeedItems = useMemo(() => (feedItems || []).filter((x) => !!x?.sponsored).slice(0, 6), [feedItems]);

  const dueInvoiceItems = useMemo(() => {
    return (visibleTickets || [])
      .map((ticket) => ({ ticket, invoice: ticket?.latest_invoice || null }))
      .filter((x) => isInvoiceDue(x.invoice))
      .sort((a, b) => {
        const ad = a?.invoice?.due_date ? new Date(a.invoice.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bd = b?.invoice?.due_date ? new Date(b.invoice.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        return ad - bd;
      });
  }, [visibleTickets]);

  const unpaidInvoiceCount = useMemo(() => dueInvoiceItems.length, [dueInvoiceItems]);
  const totalDue = useMemo(() => dueInvoiceItems.reduce((sum, item) => sum + invoiceAmount(item.invoice), 0), [dueInvoiceItems]);

  const tabs = useMemo(() => {
    return BASE_TABS.map((t) =>
      t.id === "orders" ? { ...t, label: orderTabLabel(unpaidInvoiceCount) } : t
    );
  }, [unpaidInvoiceCount]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[#020617]" />
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-indigo-500/10 to-fuchsia-500/10" />
        <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[520px] w-[520px] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <ModeBar
        title="Customer Home"
        subtitle="Create requests • Track orders • Keep everything in one place"
      />

      <main className="relative max-w-6xl mx-auto px-4 py-6 space-y-6">
        <NewsReel />

        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
  <CustomerDashboardTabs
    tabs={tabs}
    activeTab={tab}
    onChange={setTab}
  />

  <button
    type="button"
    onClick={() => navigate("/upgrade")}
    className="lg:ml-auto inline-flex items-center justify-center h-10 text-xs rounded-2xl px-4 bg-indigo-500/18 border border-indigo-500/35 hover:bg-indigo-500/24 text-indigo-100"
  >
    Start a business (Upgrade)
  </button>
</div>

        {tab === "overview" ? (
          <>
            <CustomerHeroCard
  displayName={displayName}
  activeBusinessId={activeBusinessId || "auto"}
  onNewRequest={() => navigate("/customer/new-request")}
  onViewOrders={() => setTab("orders")}
  onBusinessCards={() => navigate("/customer/business-cards")}
  onAffiliate={() => navigate("/customer/affiliate")}
/>


<div className="grid xl:grid-cols-3 gap-4">
  <div className="lg:col-span-2">
    <CustomerAffiliateProgramCard
      onOpen={() => navigate("/customer/affiliate")}
    />
  </div>

  

  <PaymentsDueCard
    invoices={dueInvoiceItems}
    totalDue={totalDue}
    onPayNow={(ticketId) => navigate(`/tickets/${ticketId}`)}
    onOpenOrder={(ticketId) => navigate(`/tickets/${ticketId}`)}
    onViewOrders={() => setTab("orders")}
  />
</div>

            <FeaturedDealsRail
              items={featuredFeedItems}
              onOpenFeedItem={openFeedItem}
              onViewFeed={() => navigate("/newsfeed")}
            />

            <Card title="This Week" right={<IconBtn title="Open calendar tab" tone="cyan" onClick={() => setTab("calendar")}>📅</IconBtn>}>
              <div className="text-sm text-slate-400">Weekly view of what’s coming (MVP uses ticket data).</div>
              <div className="mt-4">
                <CustomerWeeklyCalendar tickets={tickets} onOpenTicket={(id) => navigate(`/tickets/${id}`)} showHeader />
              </div>
            </Card>

            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <Card
                  title="Recent Requests"
                  right={
                    <div className="flex gap-2 flex-wrap items-center justify-end">
                      {archivedCount ? (
                        <IconBtn
                          title={`Clear archived (${archivedCount})`}
                          tone="slate"
                          onClick={() => {
                            const next = new Set();
                            setArchivedIds(next);
                            writeArchivedSet(user, next);
                          }}
                        >
                          🧹
                        </IconBtn>
                      ) : null}

                      <IconBtn title="Refresh" tone="slate" onClick={loadTickets}>🔄</IconBtn>
                      <IconBtn title="Open All Orders" tone="cyan" onClick={() => setTab("orders")}>🧾</IconBtn>
                    </div>
                  }
                >
                  {ticketActionErr ? (
                    <div className="text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-2xl p-3 mb-3">
                      {ticketActionErr}
                    </div>
                  ) : null}

                  {ticketsErr ? (
                    <div className="text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-2xl p-3">
                      {ticketsErr}
                    </div>
                  ) : null}

                  {ticketsLoading ? <div className="text-sm text-slate-400">Loading…</div> : null}

                  {!ticketsLoading && recentTickets.length === 0 ? (
                    <div className="text-sm text-slate-400">
                      No requests yet. Click <span className="text-cyan-200 font-semibold">+ New Request</span> to start.
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    {recentTickets.map((t) => {
                      const tid = Number(t.id);
                      const st = String(t.status || "").toUpperCase();
                      const canCancel = !["COMPLETED", "PAID", "CANCELLED", "CLOSED"].includes(st);
                      const serviceTitle = resolveCustomerFriendlyTitle(t);
                      const serviceStyle = resolveServiceStyle(t);
                      const acceptedBy = getAcceptedBy(t);
                      const businessName = resolveBusinessName(t);
                      const p1 = isPriorityOne(t);

                      return (
                        <div
                          key={t.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => navigate(`/tickets/${t.id}`)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") navigate(`/tickets/${t.id}`);
                          }}
                          className={cx(
                            "w-full text-left rounded-3xl border bg-slate-950/45 hover:bg-slate-900/40 p-4 transition cursor-pointer outline-none focus:ring-2 focus:ring-cyan-500/30",
                            p1
                              ? "border-red-500/60 shadow-[0_0_28px_rgba(239,68,68,0.2)]"
                              : "border-slate-800/80"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-extrabold truncate">{serviceTitle}</div>
                              <div className="text-xs text-slate-400 mt-1">
                                Ticket #{t.id}
                                <span className="mx-2 text-slate-600">•</span>
                                {businessName ? (
                                  <>
                                    Business <span className="text-slate-200">{businessName}</span>
                                  </>
                                ) : (
                                  <>
                                    Business <span className="text-slate-500">Not assigned yet</span>
                                  </>
                                )}
                              </div>

                              <div className="text-xs text-slate-500 mt-1">
                                Service Style: <span className="text-slate-300">{serviceStyle || "Service"}</span>
                              </div>

                              <div className="text-xs text-slate-400 mt-1">
                                {acceptedBy ? (
                                  <>
                                    Accepted by <span className="text-slate-200">{acceptedBy}</span>
                                  </>
                                ) : (
                                  <>Not accepted yet</>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              <PriorityBadge ticket={t} showEta={false} />
                              {p1 ? (
                                <span className="text-[10px] px-2 py-1 rounded-full border font-black bg-red-500/20 border-red-500/40 text-red-100 shadow-[0_0_14px_rgba(239,68,68,0.2)]">
                                  SERVICE NOW
                                </span>
                              ) : null}
                              <span className={statusPill(t.status)}>{String(t.status || "NEW")}</span>
                            </div>
                          </div>

                          <div className="text-xs text-slate-400 mt-3">
                            {t.service_zip ? `ZIP ${t.service_zip}` : "No ZIP"}
                            {t.service_address ? ` • ${t.service_address}` : ""}
                          </div>

                          <div
                            className="mt-3 flex items-center justify-between gap-2 flex-wrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <AddToCalendarButton ticket={t} />

                              <IconBtn title="Archive (hide from dashboard)" tone="slate" onClick={() => archiveTicket(tid)}>
                                🗄️
                              </IconBtn>

                              <IconBtn
                                title={canCancel ? "Cancel request" : "Cancel disabled"}
                                tone="rose"
                                disabled={!canCancel}
                                onClick={() => {
                                  const ok = window.confirm(
                                    `Cancel request #${t.id}? This will set status to CANCELLED.`
                                  );
                                  if (ok) cancelTicket(tid);
                                }}
                              >
                                ✖️
                              </IconBtn>
                            </div>

                            <span className="text-[11px] text-slate-500">
                              {t.created_at ? new Date(t.created_at).toLocaleString() : "—"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {archivedCount ? (
                    <div className="mt-4 rounded-3xl border border-slate-800/80 bg-slate-950/30 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-sm">Archived</div>
                        <IconBtn
                          title="Clear archived"
                          tone="slate"
                          onClick={() => {
                            const next = new Set();
                            setArchivedIds(next);
                            writeArchivedSet(user, next);
                          }}
                        >
                          🧹
                        </IconBtn>
                      </div>

                      <div className="text-xs text-slate-500 mt-1">
                        Archived requests are hidden from the dashboard only (MVP). They still exist in All Orders.
                      </div>

                      <div className="mt-3 flex gap-2 flex-wrap">
                        {Array.from(archivedIds)
                          .slice(0, 12)
                          .map((id) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => unarchiveTicket(id)}
                              className="text-[11px] px-3 py-2 rounded-full border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40 text-slate-200 transition"
                              title="Restore"
                            >
                              ↩️ #{id}
                            </button>
                          ))}
                      </div>
                    </div>
                  ) : null}
                </Card>
                            </div>

              <div className="space-y-4">
                <Card title="Inbox Snapshot">
                  <div className="text-[11px] text-slate-500 -mt-1 mb-3">
                    Ticket updates, reminders, broadcasts, and messages.
                  </div>
                  <div className="rounded-3xl border border-slate-800/80 bg-slate-950/30 p-3">
                    <InboxPanel />
                  </div>
                </Card>
              </div>
            </div>
          </>
        ) : null}

        {tab === "orders" ? (
          <Card
            title="All Orders"
            right={
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/customer/new-request")}
                  className="inline-flex items-center justify-center h-9 text-xs rounded-2xl px-4 bg-cyan-500/18 border border-cyan-500/35 hover:bg-cyan-500/24 text-cyan-100"
                >
                  + New Request
                </button>
                <button
                  type="button"
                  onClick={loadTickets}
                  className="inline-flex items-center justify-center h-9 text-xs rounded-2xl px-4 bg-slate-950/55 border border-slate-800/80 hover:bg-slate-900/40 text-slate-200"
                >
                  Refresh
                </button>
              </div>
            }
          >
            <CustomerTickets embedded />
          </Card>
        ) : null}

        {tab === "calendar" ? (
          <Card title="Calendar">
            <CustomerWeeklyCalendar tickets={tickets} onOpenTicket={(id) => navigate(`/tickets/${id}`)} showHeader />
          </Card>
        ) : null}

        {tab === "todo" ? (
          <TodoList
            scope="customer"
            title="Quick To-Do"
            subtitle="Fast notes + checkboxes (MVP). Full Planner module comes next."
            showStatus
            rightRailAds
          />
        ) : null}

        {tab === "inbox" ? (
          <InboxPanel
            title="Inbox"
            subtitle="Ticket updates, messages, broadcasts, and reminders."
          />
        ) : null}

        {tab === "deals" ? (
          <DealsPanel
            feedItems={featuredFeedItems}
            onOpenFeedItem={openFeedItem}
            onOpenNewsfeed={() => navigate("/newsfeed")}
          />
        ) : null}

        {tab === "finance" ? (
          <ComingSoonPanel
            icon="💳"
            title="Finance"
            desc="Bills, budgets, cashflow snapshots, and property-friendly money tracking."
            onUpgrade={() => navigate("/upgrade")}
          />
        ) : null}

        {tab === "fitness" ? (
          <ComingSoonPanel
            icon="🏋️"
            title="Fitness"
            desc="Habits, workouts, goals, and accountability — tied into your daily life flow."
            onUpgrade={() => navigate("/upgrade")}
          />
        ) : null}
      </main>
    </div>
  );
}