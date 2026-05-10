import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ModeBar from "../components/ModeBar";
import Button from "../components/ui/Button";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";

import SboKpiHero from "../components/sbo/SboKpiHero";
import SboKpiCharts from "../components/sbo/SboKpiCharts";
import SboSetupReadiness from "../components/sbo/SboSetupReadiness";
import SboActionGrid from "../components/sbo/SboActionGrid";
import SboUtilityCards from "../components/sbo/SboUtilityCards";

function safeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.value)) return data.value;
  return [];
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

function GrowthHeroCard({ onOpenGrowth, onUpgrade }) {
  return (
    <section className="rounded-3xl border border-fuchsia-500/25 bg-gradient-to-br from-fuchsia-500/10 via-indigo-500/10 to-cyan-500/10 p-5 shadow-[0_0_60px_rgba(217,70,239,0.10)]">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-fuchsia-200 font-black">
            New Growth Module
          </div>
          <h2 className="mt-2 text-xl md:text-2xl font-black tracking-tight text-white">
            Growth OS: automate follow-ups, review requests, and social drafts.
          </h2>
          <p className="mt-2 text-sm text-slate-300 max-w-3xl">
            Turn new leads into ready-to-send content, queue posts safely, and keep your business visible without juggling extra tools.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button tone="fuchsia" onClick={onOpenGrowth}>
            Open Growth OS
          </Button>
          <Button tone="slate" onClick={onUpgrade}>
            Upgrade / Manage
          </Button>
        </div>
      </div>
    </section>
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
  const [localBaseline, setLocalBaseline] = useState({});

  const activeBusiness = useMemo(() => {
    const list = Array.isArray(myBusinesses) ? myBusinesses : [];
    const found = list.find((b) => String(b?.id || b?.business_id || b?.business?.id || "") === String(activeBusinessId || ""));
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
      const [kpiRes, ticketsRes, billingRes] = await Promise.allSettled([
        api.get("/kpis/business/", { params: { days: 30 } }),
        api.get("/tickets/"),
        api.get("/billing/status/"),
      ]);

      setKpiRows(kpiRes.status === "fulfilled" ? safeList(kpiRes.value?.data) : []);
      setTicketRows(ticketsRes.status === "fulfilled" ? safeList(ticketsRes.value?.data) : []);
      setBillingStatus(billingRes.status === "fulfilled" ? billingRes.value?.data || null : null);

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
  const revenueThisMonth = useMemo(() => toMoneyFromCents(sumBy(kpiRows, "gmv_paid_cents")), [kpiRows]);

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
    const businessPresenceMode = String(biz?.business_presence_mode || "").trim();
    const stripeConnected = !!billingStatus?.stripe_setup_complete;
    const catalogReady = false;

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
    };
  }, [activeBusiness, billingStatus]);

  function openSettingsSection(section, extra = "") {
    const qs = new URLSearchParams();
    qs.set("return", "/sbo");
    if (section) qs.set("section", section);
    const suffix = extra ? `&${extra}` : "";
    navigate(`/sbo/settings?${qs.toString()}${suffix}`);
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="SBO Dashboard"
        subtitle="Financial-first business command center"
        rightActions={
          <div className="flex gap-2 flex-wrap">
            <Button tone="fuchsia" onClick={() => navigate("/sbo/growth")}>
              Growth OS
            </Button>
            <Button tone="cyan" onClick={() => navigate("/tickets?view=new")}>
              Tickets
            </Button>
            <Button tone="indigo" onClick={() => navigate("/sbo/catalog")}>
              Catalog
            </Button>
            <Button tone="slate" onClick={() => navigate("/sbo/settings?return=%2Fsbo&setup=1")}>
              Setup
            </Button>
          </div>
        }
      />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {err ? (
          <div className="text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-2xl p-3">
            {err}
          </div>
        ) : null}

        <GrowthHeroCard
          onOpenGrowth={() => navigate("/sbo/growth")}
          onUpgrade={() => window.open("https://buy.stripe.com/28E9AT4aefLp4uJ0Kn2Nq0i", "_blank", "noopener,noreferrer")}
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

        <div className="grid xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <SboKpiCharts loading={loading} chartData={chartData} />
          </div>

          <div className="space-y-4">
            <SboSetupReadiness
              loading={loading}
              setupState={setupState}
              onOpenSetup={() => navigate("/sbo/settings?return=%2Fsbo&setup=1")}
              onOpenCatalog={() => navigate("/sbo/catalog")}
            />
          </div>
        </div>

        <SboActionGrid
          onOpenGrowth={() => navigate("/sbo/growth")}
          onOpenInvoicing={() => navigate("/tickets?view=new")}
          onOpenTaxes={() => navigate("/billing/cash-fee-invoices")}
          onOpenEmployees={() => navigate("/team/invites")}
          onOpenCatalog={() => navigate("/sbo/catalog")}
          onOpenKpis={() => navigate("/sbo")}
          onOpenSettings={() => navigate("/sbo/settings?return=%2Fsbo")}
        />

        <SboUtilityCards
          onOpenSocial={() => navigate("/sbo/growth")}
          onOpenImport={() => openSettingsSection("data", "intent=import")}
          onOpenExport={() => openSettingsSection("data", "intent=export")}
          onOpenEmployeeInvite={() => navigate("/team/invites")}
          keeperUrl="https://www.keepertax.com/invite?referrer=Jacob898531"
          socialPaymentUrl="https://buy.stripe.com/28E9AT4aefLp4uJ0Kn2Nq0i"
        />
      </main>
    </div>
  );
}