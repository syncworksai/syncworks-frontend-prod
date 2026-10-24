import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import api from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import DashboardShell from "../../components/dashboard/DashboardShell";
import GlassCard from "../../components/dashboard/GlassCard";
import SidebarNav from "../../components/dashboard/SidebarNav";
import {
  asRows,
  buildBusinessBriefing,
  calculateBusinessIntelligence,
} from "../../utils/businessIntelligence";

const money = (value) =>
  value == null
    ? "—"
    : Number(value).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      });
const integer = (value) => value == null ? "—" : Number(value).toLocaleString();
const percent = (value) => value == null ? "—" : Number(value).toFixed(1) + "%";

async function fetchPages(path, maxPages = 5) {
  let rows = [];
  let partial = false;
  for (let page = 1; page <= maxPages; page += 1) {
    const response = await api.get(path, { params: { page } });
    rows = rows.concat(asRows(response?.data));
    if (!response?.data?.next) return { rows, partial };
    if (page === maxPages) partial = true;
  }
  return { rows, partial };
}

function Metric({ label, value, helper, icon: Icon, tone = "cyan" }) {
  const accent = tone === "emerald" ? "text-emerald-200" :
    tone === "fuchsia" ? "text-fuchsia-200" : "text-cyan-200";
  return (
    <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 text-[11px] font-semibold text-slate-400">{label}</div>
        <Icon aria-hidden="true" className={"h-4 w-4 shrink-0 " + accent} />
      </div>
      <div className="mt-2 break-words text-xl font-black tracking-tight text-white sm:text-2xl">{value}</div>
      <div className="mt-1 text-[11px] leading-4 text-slate-500">{helper}</div>
    </div>
  );
}

function Shortcut({ title, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-16 w-full items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-950/65 p-3 text-left hover:border-cyan-400/40"
    >
      <span className="min-w-0">
        <span className="block text-sm font-bold text-slate-100">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-4 text-slate-400">{description}</span>
      </span>
      <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-cyan-200" />
    </button>
  );
}

const STAGES = [
  ["NEW", "New"],
  ["CONTACTED", "Contacted"],
  ["QUALIFIED", "Qualified"],
  ["QUOTE_SENT", "Quoted"],
  ["WON", "Won"],
  ["LOST", "Lost"],
];

export default function SboReports() {
  const navigate = useNavigate();
  const { activeBusinessId } = useAuth();
  const [days, setDays] = useState(30);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [leads, setLeads] = useState([]);
  const [source, setSource] = useState({
    hasKpis: false,
    hasTickets: false,
    hasLeads: false,
    partialTickets: false,
    partialLeads: false,
  });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setSource({
      hasKpis: false, hasTickets: false, hasLeads: false,
      partialTickets: false, partialLeads: false,
    });
    setKpis([]);
    setTickets([]);
    setLeads([]);

    if (!activeBusinessId) {
      setLoading(false);
      return () => { mounted = false; };
    }

    const load = async () => {
      const responses = await Promise.allSettled([
        api.get("/kpis/business/", { params: { days } }),
        fetchPages("/tickets/"),
        fetchPages("/sales/leads/"),
      ]);
      if (!mounted) return;
      const [kpi, ticket, lead] = responses;
      setKpis(kpi.status === "fulfilled" ? asRows(kpi.value?.data) : []);
      setTickets(ticket.status === "fulfilled" ? ticket.value.rows : []);
      setLeads(lead.status === "fulfilled" ? lead.value.rows : []);
      setSource({
        hasKpis: kpi.status === "fulfilled",
        hasTickets: ticket.status === "fulfilled",
        hasLeads: lead.status === "fulfilled",
        partialTickets: ticket.status === "fulfilled" && ticket.value.partial,
        partialLeads: lead.status === "fulfilled" && lead.value.partial,
      });
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [activeBusinessId, days, reloadKey]);

  const results = useMemo(
    () => calculateBusinessIntelligence({
      kpis,
      tickets,
      leads,
      hasKpis: source.hasKpis,
      hasTickets: source.hasTickets,
      hasLeads: source.hasLeads,
    }),
    [kpis, tickets, leads, source]
  );
  const briefing = useMemo(() => buildBusinessBriefing(results), [results]);
  const incomplete = !source.hasKpis || !source.hasTickets || !source.hasLeads;
  const partial = source.partialTickets || source.partialLeads;

  const navItems = [
    { label: "Dashboard", icon: "⌂", onClick: () => navigate("/sbo") },
    { label: "Job Requests", icon: "▤", onClick: () => navigate("/tickets?view=new") },
    { label: "Inbox", icon: "💬", onClick: () => navigate("/inbox"), badge: "0" },
    { label: "Calendar", icon: "◷", onClick: () => navigate("/calendar") },
    { label: "Customers", icon: "◉", onClick: () => navigate("/sbo/customers") },
    { label: "Leads", icon: "◎", onClick: () => navigate("/sbo/leads") },
    { label: "Employees", icon: "👥", onClick: () => navigate("/team/invites") },
    { label: "Finance", icon: "$", onClick: () => navigate("/sbo/finance") },
    { label: "Intelligence", icon: "↗", active: true, onClick: () => navigate("/sbo/reports") },
    { label: "Settings", icon: "⚙", onClick: () => navigate("/sbo/settings?return=%2Fsbo") },
  ];

  return (
    <DashboardShell
      title="Business Intelligence"
      subtitle="Owner command center · financial signals, sales, customers, and operations"
      modeBarTitle="Business Intelligence"
      modeBarSubtitle="Performance and actionable reports"
      bottomNavItems={[
        { label: "Home", icon: "⌂", onClick: () => navigate("/sbo") },
        { label: "Requests", icon: "▤", onClick: () => navigate("/tickets?view=new") },
        { label: "Leads", icon: "◎", onClick: () => navigate("/sbo/leads") },
        { label: "Finance", icon: "$", onClick: () => navigate("/sbo/finance") },
      ]}
      bottomCenterAction={{ label: "New", onClick: () => navigate("/tickets?view=new") }}
    >
      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <SidebarNav title="Business OS" subtitle="Intelligence" items={navItems} />

        <div className="min-w-0 space-y-4 pb-8 sm:space-y-5">
          <section className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-slate-950/80 to-fuchsia-500/10 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
                  <BarChart3 aria-hidden="true" className="h-4 w-4" /> Business Intelligence
                </div>
                <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">Know how your business is doing.</h1>
                <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-300 sm:text-sm">
                  See recorded collections, job activity, leads and repeat customers in one place.
                  No estimated profit or invented balances.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <label className="sr-only" htmlFor="business-intelligence-range">KPI date range</label>
                <select
                  id="business-intelligence-range"
                  aria-label="KPI date range"
                  className="min-h-11 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-bold text-white"
                  value={days}
                  onChange={(event) => setDays(Number(event.target.value))}
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
                <button
                  type="button"
                  onClick={() => setReloadKey((key) => key + 1)}
                  disabled={loading}
                  aria-label="Refresh intelligence"
                  className="flex min-h-11 items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 text-xs font-bold text-cyan-100 disabled:opacity-50"
                >
                  <RefreshCw aria-hidden="true" className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                  Refresh
                </button>
              </div>
            </div>
            <div className="mt-3 text-[11px] text-slate-400">
              Revenue and jobs use the selected KPI period. Leads and customer history use available records, not the date filter.
            </div>
          </section>

          {!activeBusinessId ? (
            <div role="status" className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
              Select a Business profile to view its intelligence.
            </div>
          ) : null}
          {!loading && incomplete && activeBusinessId ? (
            <div role="alert" className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
              Some data sources could not load. Unavailable metrics show as — instead of zero.
              {!source.hasKpis ? " KPI service unavailable." : ""}
              {!source.hasTickets ? " Tickets unavailable." : ""}
              {!source.hasLeads ? " Leads unavailable." : ""}
            </div>
          ) : null}
          {!loading && partial ? (
            <div role="status" className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs text-amber-100">
              Large history: showing the first five pages for some records. Customer and pipeline figures may be incomplete.
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3 xl:grid-cols-4">
            <Metric label="Collected Revenue" value={loading ? "…" : money(results.revenue)} helper={"Recorded in KPI service · " + days + " days"} icon={CircleDollarSign} tone="emerald" />
            <Metric label="Completed Jobs" value={loading ? "…" : integer(results.completedJobs)} helper={"KPI activity · " + days + " days"} icon={ClipboardCheck} />
            <Metric label="Paid Invoices" value={loading ? "…" : integer(results.paidInvoices)} helper={"KPI activity · " + days + " days"} icon={Wallet} />
            <Metric label="Collected / Paid Ticket" value={loading ? "…" : money(results.averagePaidTicket)} helper="Collected revenue ÷ paid ticket count" icon={TrendingUp} tone="fuchsia" />
            <Metric label="Unpaid Invoice Tickets" value={loading ? "…" : integer(results.unpaidInvoices)} helper="Ticket status count, not a balance" icon={Clock3} />
            <Metric label="Open Tickets" value={loading ? "…" : integer(results.openTickets)} helper="Latest available KPI snapshot" icon={BriefcaseBusiness} />
            <Metric label="Logged Leads" value={loading ? "…" : integer(results.trackedLeads)} helper="Loaded lead history, all dates" icon={BarChart3} />
            <Metric label="Repeat Customers" value={loading ? "…" : integer(results.repeatCustomers)} helper="Customer IDs with 2+ visible tickets" icon={Users} tone="emerald" />
          </div>

          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(260px,1fr)]">
            <GlassCard title="Collected Revenue Trend" subtitle={"KPI-recorded collections, last " + days + " days"} tone="cyan">
              {!loading && source.hasKpis && results.revenueSeries.length > 0 ? (
                <div className="h-64 w-full min-w-0" role="img" aria-label="Daily collected revenue trend">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={results.revenueSeries} margin={{ top: 8, right: 12, left: -20, bottom: 4 }}>
                      <defs>
                        <linearGradient id="businessIntelligenceRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#334155" strokeDasharray="3 3" opacity={0.35} />
                      <XAxis dataKey="day" stroke="#94a3b8" tick={{ fontSize: 10 }} tickLine={false} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: 12 }}
                        formatter={(value) => [money(value), "Collected"]}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#22d3ee" strokeWidth={2} fill="url(#businessIntelligenceRevenue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex min-h-40 items-center justify-center rounded-2xl border border-slate-800 text-center text-sm text-slate-400">
                  {loading ? "Loading revenue history…" : "No KPI revenue history available for this period."}
                </div>
              )}
              <p className="mt-2 text-[11px] leading-4 text-slate-500">
                Collected KPI value is not net profit. Cash and external payments only appear if reported through the KPI service.
              </p>
            </GlassCard>

            <GlassCard title="Financial Health" subtitle="Separate income from actual profitability" tone="emerald">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="text-xs text-slate-400">Net profit</div>
                  <div className="mt-1 text-xl font-black text-white">—</div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="text-xs text-slate-400">Profit margin</div>
                  <div className="mt-1 text-xl font-black text-white">—</div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="text-xs text-slate-400">Operating expenses</div>
                  <div className="mt-1 text-xl font-black text-white">—</div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="text-xs text-slate-400">AR dollar balance</div>
                  <div className="mt-1 text-xl font-black text-white">—</div>
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-amber-100">
                A verified expense ledger, labor/material job costs, and invoice balances are not yet connected.
                These values will not be estimated from revenue alone.
              </p>
              <button type="button" onClick={() => navigate("/sbo/finance")} className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-black text-cyan-200">
                Open Finance <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </GlassCard>
          </div>

          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            <GlassCard title="Sales Pipeline" subtitle="All loaded leads · won share is not a close-rate forecast" tone="fuchsia">
              <div className="mb-3 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-slate-900/70 p-2.5">
                  <div className="text-[10px] text-slate-400">Won</div>
                  <div className="mt-1 text-lg font-black text-emerald-200">{loading ? "…" : integer(results.wonLeads)}</div>
                </div>
                <div className="rounded-xl bg-slate-900/70 p-2.5">
                  <div className="text-[10px] text-slate-400">Won / logged</div>
                  <div className="mt-1 text-lg font-black text-white">{loading ? "…" : percent(results.leadWinShare)}</div>
                </div>
                <div className="rounded-xl bg-slate-900/70 p-2.5">
                  <div className="text-[10px] text-slate-400">Follow-ups due</div>
                  <div className="mt-1 text-lg font-black text-amber-200">{loading ? "…" : integer(results.overdueLeads)}</div>
                </div>
              </div>
              <div className="space-y-2">
                {STAGES.map(([stage, label]) => {
                  const count = results.stageCounts?.[stage] || 0;
                  const share = results.trackedLeads ? 100 * count / results.trackedLeads : 0;
                  return (
                    <div key={stage} className="flex items-center gap-2">
                      <span className="w-20 shrink-0 text-[11px] text-slate-300">{label}</span>
                      <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-400" style={{ width: String(share) + "%" }} />
                      </div>
                      <span className="w-8 shrink-0 text-right text-xs font-bold text-white">{source.hasLeads ? count : "—"}</span>
                    </div>
                  );
                })}
              </div>
              <button type="button" onClick={() => navigate("/sbo/leads")} className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-black text-cyan-200">
                Open Leads CRM <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </GlassCard>

            <GlassCard title="Customers & Operations" subtitle="Ticket-based signals from available history" tone="indigo">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="text-[11px] text-slate-400">Identified customers</div>
                  <div className="mt-1 text-2xl font-black text-white">{loading ? "…" : integer(results.identifiedCustomers)}</div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="text-[11px] text-slate-400">Repeat customer share</div>
                  <div className="mt-1 text-2xl font-black text-white">{loading ? "…" : percent(results.repeatShare)}</div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="text-[11px] text-slate-400">Visible tickets</div>
                  <div className="mt-1 text-2xl font-black text-white">{loading ? "…" : integer(results.visibleTickets)}</div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="text-[11px] text-slate-400">Inactive jobs · 7+ days</div>
                  <div className="mt-1 text-2xl font-black text-amber-200">{loading ? "…" : integer(results.staleJobs)}</div>
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-4 text-slate-500">
                Repeat share counts distinct known customers with multiple tickets; it is not a true retention cohort.
                Jobs without timestamps cannot be classified as stale.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Shortcut title="Customers" description="Profiles and service history" onClick={() => navigate("/sbo/customers")} />
                <Shortcut title="Tickets" description="Jobs and invoice status" onClick={() => navigate("/tickets")} />
              </div>
            </GlassCard>
          </div>

          <GlassCard title="Business Briefing" subtitle="Automatic rules-based observations from current records — not an AI prediction" tone="cyan">
            <div className="grid gap-2 md:grid-cols-2">
              {briefing.map((note, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => navigate(note.route)}
                  className="min-h-24 rounded-2xl border border-slate-700 bg-slate-950/65 p-3.5 text-left hover:border-cyan-400/30"
                >
                  <div className="text-sm font-black text-white">{note.title}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-400">{note.body}</div>
                  <div className="mt-2 flex items-center gap-1 text-xs font-bold text-cyan-200">
                    {note.action} <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                  </div>
                </button>
              ))}
            </div>
          </GlassCard>

          <GlassCard title="Explore Reports" subtitle="Open the underlying records to take action" tone="slate">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <Shortcut title="Finance" description="Payouts, invoice fees, and payments" onClick={() => navigate("/sbo/finance")} />
              <Shortcut title="Lead Pipeline" description="Follow-ups, conversions, and sources" onClick={() => navigate("/sbo/leads")} />
              <Shortcut title="ZIP Leaderboard" description="Marketplace ranking by service area" onClick={() => navigate("/sbo/metrics/zip")} />
            </div>
          </GlassCard>
        </div>
      </div>
    </DashboardShell>
  );
}
