import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";

import DashboardShell from "../components/dashboard/DashboardShell";
import GlassCard, { cx } from "../components/dashboard/GlassCard";
import SidebarNav from "../components/dashboard/SidebarNav";
import StatCard from "../components/dashboard/StatCard";

import SboKpiHero from "../components/sbo/SboKpiHero";
import SboKpiCharts from "../components/sbo/SboKpiCharts";
import SboSetupReadiness from "../components/sbo/SboSetupReadiness";
import SboActionGrid from "../components/sbo/SboActionGrid";
import SboUtilityCards from "../components/sbo/SboUtilityCards";
import SboMobileCommandCenter from "../components/sbo/SboMobileCommandCenter";

function safeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.value)) return data.value;
  return [];
}

function safeMoney(value) {
  const n = Number(value || 0);
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
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

function toMoneyFromCents(cents) {
  return Number(cents || 0) / 100;
}

function sumBy(rows, key) {
  return (rows || []).reduce((acc, row) => acc + Number(row?.[key] || 0), 0);
}

function latestValue(rows, key) {
  if (!rows?.length) return 0;
  return Number(rows[rows.length - 1]?.[key] || 0);
}

function buildChartData(rows) {
  return (rows || []).map((row) => ({
    day: String(row?.day || "").slice(5),
    revenue: toMoneyFromCents(row?.gmv_paid_cents || 0),
    paidInvoices: Number(row?.paid_invoice_count || 0),
    completedJobs: Number(row?.tickets_completed_count || 0),
    openTickets: Number(row?.tickets_open_count || 0),
    paidTickets: Number(row?.tickets_paid_count || 0),
  }));
}

function baselineKey(businessId) {
  return `sw_setup_baseline_v1_${businessId || "no_biz"}`;
}

function resolveTicketTitle(ticket) {
  return (
    ticket?.title ||
    ticket?.display_title ||
    ticket?.service_category_label ||
    ticket?.category_label ||
    ticket?.category?.name ||
    ticket?.service_category?.name ||
    "Service Request"
  );
}

function statusPillClass(status) {
  const s = String(status || "NEW").toUpperCase();
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]";

  if (["COMPLETED", "PAID", "CLOSED"].includes(s)) {
    return `${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-200`;
  }

  if (["INVOICED", "SENT", "OPEN", "READY_FOR_PAYMENT"].includes(s)) {
    return `${base} border-amber-500/30 bg-amber-500/10 text-amber-200`;
  }

  if (["IN_PROGRESS", "ACCEPTED", "ASSIGNED", "SCHEDULED"].includes(s)) {
    return `${base} border-indigo-500/30 bg-indigo-500/10 text-indigo-200`;
  }

  if (["CANCELLED", "VOID"].includes(s)) {
    return `${base} border-rose-500/30 bg-rose-500/10 text-rose-200`;
  }

  return `${base} border-cyan-500/30 bg-cyan-500/10 text-cyan-200`;
}

function MiniPill({ children, tone = "slate" }) {
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

function SboCommandHero({
  businessName,
  revenueThisMonth,
  openTickets,
  onNewRequest,
  onOpenSocial,
  onOpenRequests,
}) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-cyan-500/20 bg-slate-950/55 p-5 shadow-[0_0_70px_rgba(34,211,238,0.10)] md:p-7">
      <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="absolute -bottom-28 left-1/3 h-80 w-80 rounded-full bg-fuchsia-500/12 blur-3xl" />
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-indigo-500/10 to-fuchsia-500/10" />

      <div className="relative grid gap-5 xl:grid-cols-[1fr_380px] xl:items-center">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-200">
            SyncWorks Business OS
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight text-white md:text-5xl">
            {businessName ? `${businessName} command center` : "Business command center"}
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
            Track performance, manage job requests, monitor revenue, operate your team,
            and grow through Social Media CRM from one dashboard.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onNewRequest}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-cyan-300/40 bg-gradient-to-r from-cyan-500 to-blue-600 px-5 text-sm font-black text-white shadow-[0_0_35px_rgba(34,211,238,0.28)] transition hover:brightness-110"
            >
              + New Request
            </button>

            <Button tone="fuchsia" size="lg" onClick={onOpenSocial}>
              Social Media
            </Button>

            <Button tone="slate" size="lg" onClick={onOpenRequests}>
              Job Requests
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-700/80 bg-slate-950/60 p-4 backdrop-blur-xl">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <div className="text-xs text-emerald-200">Collected</div>
              <div className="mt-2 text-3xl font-black text-white">
                {safeMoney(revenueThisMonth)}
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
              <div className="text-xs text-cyan-200">Open Jobs</div>
              <div className="mt-2 text-3xl font-black text-white">{openTickets}</div>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-fuchsia-500/25 bg-fuchsia-500/10 p-4">
            <div className="text-sm font-black text-fuchsia-100">
              Social Media CRM
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Leads, posts, campaigns, and automations will connect here.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RequestsOverviewCard({ tickets, onOpenTickets }) {
  const recent = safeList(tickets).slice(0, 5);

  return (
    <GlassCard
      title="Recent Job Requests"
      subtitle="Live operational snapshot from your request pipeline."
      tone="cyan"
      right={
        <button
          type="button"
          onClick={() => onOpenTickets()}
          className="rounded-2xl border border-cyan-500/30 bg-cyan-500/12 px-4 py-2 text-xs font-black text-cyan-100 hover:bg-cyan-500/18"
        >
          Open Board
        </button>
      }
    >
      {recent.length ? (
        <div className="space-y-3">
          {recent.map((ticket) => (
            <button
              key={ticket.id}
              type="button"
              onClick={() => onOpenTickets(ticket.id)}
              className="w-full rounded-3xl border border-slate-800 bg-slate-950/45 p-4 text-left transition hover:border-cyan-500/30 hover:bg-slate-900/60"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-black text-slate-100">
                    {resolveTicketTitle(ticket)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Ticket #{ticket.id} •{" "}
                    {ticket?.service_zip ? `ZIP ${ticket.service_zip}` : "Location pending"}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Customer:{" "}
                    <span className="text-slate-200">
                      {ticket?.customer_name ||
                        ticket?.customer_email ||
                        ticket?.customer ||
                        "Customer"}
                    </span>
                  </div>
                </div>

                <span className={statusPillClass(ticket.status)}>
                  {String(ticket.status || "NEW").replaceAll("_", " ")}
                </span>
              </div>

              <div className="mt-3 text-[11px] text-slate-500">
                Updated {safeDateTime(ticket.updated_at || ticket.created_at)}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-5 text-sm text-slate-400">
          No job requests found yet. Marketplace and direct jobs will show here.
        </div>
      )}
    </GlassCard>
  );
}

function TeamStatusCard({ newCustomers, completedJobs, onOpenEmployees, onOpenCustomers }) {
  return (
    <GlassCard title="Customers & Employees" subtitle="People, customers, and job throughput." tone="indigo">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onOpenCustomers}
          className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-left transition hover:bg-cyan-500/15"
        >
          <div className="text-xs text-cyan-200">Customers</div>
          <div className="mt-2 text-3xl font-black text-white">{newCustomers}</div>
        </button>

        <button
          type="button"
          onClick={onOpenEmployees}
          className="rounded-3xl border border-indigo-500/20 bg-indigo-500/10 p-4 text-left transition hover:bg-indigo-500/15"
        >
          <div className="text-xs text-indigo-200">Completed Jobs</div>
          <div className="mt-2 text-3xl font-black text-white">{completedJobs}</div>
        </button>
      </div>

      <button
        type="button"
        onClick={onOpenEmployees}
        className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/12 px-4 text-xs font-black text-indigo-100 hover:bg-indigo-500/18"
      >
        Manage Employees
      </button>
    </GlassCard>
  );
}

function UpcomingScheduleCard({ tickets, onOpenCalendar }) {
  const upcoming = safeList(tickets)
    .filter((ticket) => ticket?.needed_by_date || ticket?.scheduled_start || ticket?.scheduled_at)
    .slice(0, 4);

  return (
    <GlassCard
      title="Calendar"
      subtitle="Scheduled jobs and upcoming request deadlines."
      tone="fuchsia"
      right={<MiniPill tone="fuchsia">{upcoming.length || 0} Items</MiniPill>}
    >
      {upcoming.length ? (
        <div className="space-y-3">
          {upcoming.map((ticket) => (
            <div key={ticket.id} className="rounded-3xl border border-slate-800 bg-slate-950/45 p-4">
              <div className="text-sm font-black text-slate-100">{resolveTicketTitle(ticket)}</div>
              <div className="mt-1 text-xs text-slate-400">
                {safeDateTime(ticket.scheduled_start || ticket.scheduled_at || ticket.needed_by_date)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-4 text-sm text-slate-400">
          No scheduled jobs found yet.
        </div>
      )}

      <button
        type="button"
        onClick={onOpenCalendar}
        className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/12 px-4 text-xs font-black text-fuchsia-100 hover:bg-fuchsia-500/18"
      >
        Open Calendar
      </button>
    </GlassCard>
  );
}

function SocialMediaCard({ onOpenSocial, onOpenLeads }) {
  return (
    <GlassCard tone="fuchsia" className="border-fuchsia-500/25">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="min-w-0">
          <div className="text-[11px] font-black uppercase tracking-[0.24em] text-fuchsia-200">
            Social Media
          </div>
          <h2 className="mt-2 text-xl font-black tracking-tight text-white md:text-2xl">
            Content, lead capture, follow-ups, and campaign automation.
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            This is where Growth OS becomes customer-facing: social posts, automations,
            social inbox, and CRM leads.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button tone="fuchsia" onClick={onOpenSocial}>
            Open Social Media
          </Button>
          <Button tone="slate" onClick={onOpenLeads}>
            View Leads
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}

function ActivityCard({ tickets }) {
  const items = safeList(tickets).slice(0, 6);

  return (
    <GlassCard title="Recent Activity" subtitle="Latest business movement across jobs and requests." tone="slate">
      {items.length ? (
        <div className="space-y-3">
          {items.map((ticket) => (
            <div key={ticket.id} className="flex gap-3 rounded-3xl border border-slate-800 bg-slate-950/45 p-3">
              <div className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.8)]" />
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-slate-100">
                  {resolveTicketTitle(ticket)}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {String(ticket.status || "NEW").replaceAll("_", " ")}
                </div>
                <div className="mt-1 text-[11px] text-slate-600">
                  {safeDateTime(ticket.updated_at || ticket.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-4 text-sm text-slate-400">
          Activity will appear after jobs, invoices, or messages begin moving.
        </div>
      )}
    </GlassCard>
  );
}

function NotificationUpsellCard({ onOpenSettings }) {
  return (
    <GlassCard
      title="Direct Request Notifications"
      subtitle="Future add-on: email and SMS alerts for speed-to-lead."
      tone="amber"
      right={<MiniPill tone="amber">Planned</MiniPill>}
    >
      <div className="space-y-3">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-4">
          <div className="text-sm font-black text-slate-100">Email Alerts</div>
          <div className="mt-1 text-xs text-slate-400">
            Direct request, marketplace match, invoice, and customer response emails.
          </div>
          <div className="mt-2 text-xs font-black text-cyan-200">$0.99/mo idea</div>
        </div>

        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-4">
          <div className="text-sm font-black text-amber-100">SMS Alerts</div>
          <div className="mt-1 text-xs text-slate-400">
            Instant job alerts for direct requests and high-priority marketplace work.
          </div>
          <div className="mt-2 text-xs font-black text-amber-200">$9.99/mo idea</div>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenSettings}
        className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/12 px-4 text-xs font-black text-amber-100 hover:bg-amber-500/18"
      >
        Open Business Settings
      </button>
    </GlassCard>
  );
}

export default function SboDashboard() {
  const navigate = useNavigate();
  const { myBusinesses, activeBusinessId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [kpiRows, setKpiRows] = useState([]);
  const [ticketRows, setTicketRows] = useState([]);
  const [billingStatus, setBillingStatus] = useState(null);
  const [catalogRows, setCatalogRows] = useState([]);
  const [localBaseline, setLocalBaseline] = useState({});

  const activeBusiness = useMemo(() => {
    const list = Array.isArray(myBusinesses) ? myBusinesses : [];
    const found = list.find(
      (b) =>
        String(b?.id || b?.business_id || b?.business?.id || "") ===
        String(activeBusinessId || "")
    );
    return found?.business || found || null;
  }, [myBusinesses, activeBusinessId]);

  async function loadAll() {
    if (!activeBusinessId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr("");

    try {
      const [kpiRes, ticketsRes, billingRes, catalogRes] =
        await Promise.allSettled([
          api.get("/kpis/business/", { params: { days: 30 } }),
          api.get("/tickets/"),
          api.get("/billing/status/"),
          api.get("/service-catalog/", { params: { active_only: true } }),
        ]);

      setKpiRows(kpiRes.status === "fulfilled" ? safeList(kpiRes.value?.data) : []);
      setTicketRows(ticketsRes.status === "fulfilled" ? safeList(ticketsRes.value?.data) : []);
      setBillingStatus(
        billingRes.status === "fulfilled"
          ? billingRes.value?.data || null
          : null
      );
      setCatalogRows(
        catalogRes.status === "fulfilled"
          ? safeList(catalogRes.value?.data)
          : []
      );

      try {
        const saved = JSON.parse(localStorage.getItem(baselineKey(activeBusinessId)) || "{}");
        setLocalBaseline(saved || {});
      } catch {
        setLocalBaseline({});
      }
    } catch (e) {
      setErr(e?.message || "Failed to load SBO dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBusinessId]);

  const chartData = useMemo(() => buildChartData(kpiRows), [kpiRows]);

  const baselineRevenue = Number(localBaseline?.baselineRevenue || 0);
  const revenueGoal = Number(localBaseline?.targetRevenue || 0);

  const revenueThisMonth = useMemo(
    () => toMoneyFromCents(sumBy(kpiRows, "gmv_paid_cents")),
    [kpiRows]
  );

  const growthPct = useMemo(() => {
    if (!baselineRevenue || baselineRevenue <= 0) return 0;
    return ((revenueThisMonth - baselineRevenue) / baselineRevenue) * 100;
  }, [baselineRevenue, revenueThisMonth]);

  const goalPct = useMemo(() => {
    if (!revenueGoal || revenueGoal <= 0) return 0;
    return Math.min((revenueThisMonth / revenueGoal) * 100, 100);
  }, [revenueGoal, revenueThisMonth]);

  const paidInvoices = useMemo(() => sumBy(kpiRows, "paid_invoice_count"), [kpiRows]);
  const completedJobs = useMemo(() => sumBy(kpiRows, "tickets_completed_count"), [kpiRows]);
  const openTickets = useMemo(() => latestValue(kpiRows, "tickets_open_count"), [kpiRows]);

  const inProgressTickets = useMemo(() => {
    return ticketRows.filter((t) =>
      ["IN_PROGRESS", "ACCEPTED", "ASSIGNED", "SCHEDULED"].includes(
        String(t?.status || "").toUpperCase()
      )
    ).length;
  }, [ticketRows]);

  const outstandingInvoices = useMemo(() => {
    return (ticketRows || []).filter((t) => {
      const s = String(t?.status || "").toUpperCase();
      return s === "INVOICED" || s === "SENT";
    }).length;
  }, [ticketRows]);

  const newCustomersApprox = useMemo(() => {
    const ids = new Set(
      (ticketRows || [])
        .map((t) => t?.customer || t?.customer_id || t?.customer_user_id)
        .filter(Boolean)
        .map(String)
    );
    return ids.size;
  }, [ticketRows]);

  const setupState = useMemo(() => {
    const biz = activeBusiness || {};
    const servicesOffered = Array.isArray(biz?.services_offered) ? biz.services_offered : [];
    const baseZip = String(biz?.base_zip || "").trim();
    const radius = Number(biz?.service_radius_miles ?? biz?.effective_service_radius_miles ?? 0);
    const acceptsMarketplace = !!biz?.accepts_marketplace_tickets;
    const businessPresenceMode = String(
      biz?.business_presence_mode || ""
    ).trim();
    const stripeConnected = !!(
      billingStatus?.stripe_setup_complete ||
      billingStatus?.stripe_connected ||
      billingStatus?.connect_onboarding_complete ||
      billingStatus?.charges_enabled
    );
    const catalogReady = catalogRows.length > 0;

    return {
      hasServices: servicesOffered.length > 0,
      hasZip: !!baseZip,
      hasRadius: businessPresenceMode === "online" ? true : radius > 0,
      acceptsMarketplace,
      stripeConnected,
      catalogReady,
      servicesCount: servicesOffered.length,
      baseZip,
      radius,
      isOnline: businessPresenceMode === "online",
      catalogCount: catalogRows.length,
    };
  }, [activeBusiness, billingStatus, catalogRows]);

  function openSettingsSection(section, extra = "") {
    const qs = new URLSearchParams();
    qs.set("return", "/sbo");
    if (section) qs.set("section", section);
    const suffix = extra ? `&${extra}` : "";
    navigate(`/sbo/settings?${qs.toString()}${suffix}`);
  }

  const businessName = activeBusiness?.name || activeBusiness?.business_name || "";

  const sidebarItems = [
    { label: "Dashboard", icon: "⌂", active: true, onClick: () => navigate("/sbo") },
    { label: "Job Requests", icon: "▤", onClick: () => navigate("/tickets?view=new"), badge: openTickets || "" },
    { label: "Inbox", icon: "💬", onClick: () => navigate("/inbox"), badge: "0" },
    { label: "Calendar", icon: "◷", onClick: () => navigate("/calendar") },
    { label: "Customers", icon: "◉", onClick: () => navigate("/sbo/customers") },
    { label: "Leads", icon: "◎", onClick: () => navigate("/sbo/leads") },
    { label: "Employees", icon: "👥", onClick: () => navigate("/team/invites") },
    { label: "Partners", icon: "◇", onClick: () => navigate("/sbo/partners") },
    { label: "Product Settings", icon: "⚙", onClick: () => navigate("/sbo/catalog") },
    { label: "Finance", icon: "$", onClick: () => navigate("/sbo/finance") },
    { label: "Social Media", icon: "✦", onClick: () => navigate("/sbo/growth") },
    { label: "Reports", icon: "↗", onClick: () => navigate("/sbo/reports") },
    { label: "Settings", icon: "⚙", onClick: () => navigate("/sbo/settings?return=%2Fsbo") },
  ];

  const bottomNavItems = [
    { label: "Home", icon: "⌂", active: true, onClick: () => navigate("/sbo") },
    { label: "Requests", icon: "▤", onClick: () => navigate("/tickets?view=new") },
    { label: "Leads", icon: "◎", onClick: () => navigate("/sbo/leads") },
    { label: "Settings", icon: "⚙", onClick: () => navigate("/sbo/settings?return=%2Fsbo") },
  ];

  return (
    <DashboardShell
      title="Business Dashboard"
      subtitle="Performance • Job requests • Revenue • Social Media CRM"
      modeBarTitle="Business Dashboard"
      modeBarSubtitle="Performance charts • job requests • revenue • marketplace readiness"
      bottomNavItems={bottomNavItems}
      bottomCenterAction={{
        label: "New",
        onClick: () => navigate("/tickets?view=new"),
      }}
      rightActions={
        <div className="flex flex-wrap gap-2">
          <Button tone="fuchsia" onClick={() => navigate("/sbo/growth")}>
            Social Media
          </Button>
          <Button tone="cyan" onClick={() => navigate("/tickets?view=new")}>
            Job Requests
          </Button>
          <Button tone="slate" onClick={() => navigate("/sbo/settings?return=%2Fsbo&setup=1")}>
            Setup
          </Button>
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <SidebarNav
          title="Business OS"
          subtitle={businessName || "Business Command"}
          items={sidebarItems}
          footer={
            <div className="rounded-3xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-4">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-fuchsia-200">
                Social Media CRM
              </div>
              <div className="mt-2 text-sm text-slate-300">
                Content, automations, and lead capture.
              </div>
              <button
                type="button"
                onClick={() => navigate("/sbo/growth")}
                className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/12 px-3 text-xs font-black text-fuchsia-100 hover:bg-fuchsia-500/18"
              >
                Open Social Media
              </button>
            </div>
          }
        />

        <div className="min-w-0 space-y-5">
          {err ? (
            <div className="rounded-2xl border border-red-800 bg-red-900/20 p-3 text-sm text-red-300">
              {err}
            </div>
          ) : null}

          <SboMobileCommandCenter
            businessName={businessName}
            loading={loading}
            tickets={ticketRows}
            revenueThisMonth={revenueThisMonth}
            openTickets={openTickets}
            outstandingInvoices={outstandingInvoices}
            onRefresh={loadAll}
            onOpenTicket={(ticketId) =>
              ticketId ? navigate(`/tickets/${ticketId}`) : navigate("/tickets")
            }
            onOpenRequests={() => navigate("/tickets?view=new")}
            onOpenCalendar={() => navigate("/calendar")}
            onOpenTeam={() => navigate("/team/invites")}
            onOpenCustomers={() => navigate("/sbo/customers")}
            onOpenLeads={() => navigate("/sbo/leads")}
            onOpenFinance={() => navigate("/sbo/finance")}
            onOpenSocial={() => navigate("/sbo/growth")}
            onOpenSettings={() => navigate("/sbo/settings?return=%2Fsbo")}
          />

          <SboSetupReadiness
            loading={loading}
            setupState={setupState}
            onOpenServices={() => openSettingsSection("services")}
            onOpenCoverage={() => openSettingsSection("marketplace")}
            onOpenMarketplace={() => openSettingsSection("marketplace")}
            onOpenPayments={() => navigate("/sbo/finance?section=payments")}
            onOpenCatalog={() => navigate("/sbo/catalog")}
          />

          <div className="hidden lg:block">
          <SboCommandHero
            businessName={businessName}
            revenueThisMonth={revenueThisMonth}
            openTickets={openTickets}
            onNewRequest={() => navigate("/tickets?view=new")}
            onOpenSocial={() => navigate("/sbo/growth")}
            onOpenRequests={() => navigate("/tickets?view=new")}
          />
          </div>

          <div className="hidden gap-4 sm:grid-cols-2 lg:grid xl:grid-cols-4">
            <StatCard
              label="Open Requests"
              value={openTickets}
              hint="Jobs requiring attention"
              icon="▤"
              tone="cyan"
              badge="Live"
              onClick={() => navigate("/tickets?view=new")}
            />
            <StatCard
              label="In Progress"
              value={inProgressTickets}
              hint="Accepted or scheduled"
              icon="↗"
              tone="indigo"
              onClick={() => navigate("/tickets")}
            />
            <StatCard
              label="Completed"
              value={completedJobs}
              hint="Completed this period"
              icon="✓"
              tone="emerald"
              onClick={() => navigate("/tickets")}
            />
            <StatCard
              label="Revenue"
              value={safeMoney(revenueThisMonth)}
              hint="Collected this month"
              icon="$"
              tone="fuchsia"
              onClick={() => navigate("/sbo/finance")}
            />
          </div>

          <SocialMediaCard
            onOpenSocial={() => navigate("/sbo/growth")}
            onOpenLeads={() => navigate("/sbo/leads")}
          />

          <SboKpiHero
            loading={loading}
            revenueThisMonth={revenueThisMonth}
            revenueGoal={revenueGoal}
            baselineRevenue={baselineRevenue}
            growthPct={growthPct}
            goalPct={goalPct}
            paidInvoices={paidInvoices}
            outstandingInvoices={outstandingInvoices}
            completedJobs={completedJobs}
            openTickets={openTickets}
            newCustomers={newCustomersApprox}
          />

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
            <div className="min-w-0 space-y-5">
              <SboKpiCharts loading={loading} chartData={chartData} />

              <RequestsOverviewCard
                tickets={ticketRows}
                onOpenTickets={(ticketId) =>
                  ticketId ? navigate(`/tickets/${ticketId}`) : navigate("/tickets?view=new")
                }
              />

              <SboActionGrid
                onOpenGrowth={() => navigate("/sbo/growth")}
                onOpenInvoicing={() => navigate("/tickets?view=new")}
                onOpenTaxes={() => navigate("/sbo/finance")}
                onOpenEmployees={() => navigate("/team/invites")}
                onOpenCatalog={() => navigate("/sbo/catalog")}
                onOpenKpis={() => navigate("/sbo/reports")}
                onOpenSettings={() => navigate("/sbo/settings?return=%2Fsbo")}
              />
            </div>

            <div className="space-y-5">
              <UpcomingScheduleCard
                tickets={ticketRows}
                onOpenCalendar={() => navigate("/calendar")}
              />

              <TeamStatusCard
                newCustomers={newCustomersApprox}
                completedJobs={completedJobs}
                onOpenEmployees={() => navigate("/team/invites")}
                onOpenCustomers={() => navigate("/sbo/customers")}
              />

              <ActivityCard tickets={ticketRows} />

              <NotificationUpsellCard
                onOpenSettings={() => navigate("/sbo/settings?return=%2Fsbo")}
              />
            </div>
          </div>

          <SboUtilityCards
            onOpenSocial={() => navigate("/sbo/growth")}
            onOpenImport={() => openSettingsSection("data", "intent=import")}
            onOpenExport={() => openSettingsSection("data", "intent=export")}
            onOpenEmployeeInvite={() => navigate("/team/invites")}
            keeperUrl="https://www.keepertax.com/invite?referrer=Jacob898531"
            socialPaymentUrl="https://buy.stripe.com/28E9AT4aefLp4uJ0Kn2Nq0i"
          />
        </div>
      </div>
    </DashboardShell>
  );
}