// src/pages/PropertyManagerDashboard.jsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/client";
import Button from "../components/ui/Button";
import ModeBar from "../components/ModeBar";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function Card({ title, subtitle, right, children, className = "" }) {
  return (
    <section className={cx("overflow-hidden rounded-[28px] border border-blue-500/20 bg-[#07111f]/90 backdrop-blur-xl shadow-[0_18px_80px_rgba(0,89,255,0.10)]", className)}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-800/70 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-wide text-slate-100">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function Pill({ children, tone = "slate" }) {
  const map = {
    slate: "border-slate-700 bg-slate-900/70 text-slate-300",
    cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-200",
    indigo: "border-indigo-500/30 bg-indigo-500/10 text-indigo-200",
  };
  return <span className={cx("inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]", map[tone] || map.slate)}>{children}</span>;
}

function MetricCard({ label, value, tone = "cyan", hint }) {
  return (
    <div className="rounded-3xl border border-blue-500/20 bg-[#07111f]/95 p-4 shadow-[0_0_32px_rgba(21,151,255,0.06)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
        <Pill tone={tone}>Live</Pill>
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</div>
      {hint ? <div className="mt-1.5 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

function ActionTile({ title, detail, onClick, icon }) {
  return (
    <button type="button" onClick={onClick} className="group flex min-h-[92px] w-full items-center gap-4 rounded-3xl border border-blue-500/15 bg-black/25 p-4 text-left transition active:scale-[0.99] hover:border-cyan-400/40 hover:bg-cyan-500/[0.06] focus:outline-none focus:ring-2 focus:ring-cyan-400/60">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-white">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">{detail}</span>
      </span>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-cyan-300" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function PropertyRow({ property, onOpen }) {
  const status = String(property?.status || "HEALTHY").toUpperCase();
  const tone = status === "HEALTHY" ? "emerald" : status === "WATCH" ? "amber" : status === "AT_RISK" ? "rose" : "slate";
  return (
    <button type="button" onClick={() => onOpen(property)} className="group w-full rounded-3xl border border-blue-500/15 bg-black/25 p-4 text-left transition active:scale-[0.995] hover:border-blue-400/45 hover:bg-blue-500/[0.06] focus:outline-none focus:ring-2 focus:ring-cyan-400/60">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-100">{property?.name || "Unnamed Property"}</div>
          <div className="mt-1 truncate text-xs text-slate-500">{[property?.address, property?.city, property?.state].filter(Boolean).join(", ") || "No address"}</div>
        </div>
        <Pill tone={tone}>{status.replaceAll("_", " ")}</Pill>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Pill tone="indigo">{property?.property_type || "Home"}</Pill>
        <Pill tone="cyan">{property?.units_count ?? 0} units</Pill>
        <Pill tone="amber">{property?.occupancy_rate != null ? `${Math.round(property.occupancy_rate * 100)}% occupied` : "No occupancy"}</Pill>
      </div>
    </button>
  );
}

function WorkOrderRow({ wo }) {
  const priority = String(wo?.priority || "P3").toUpperCase();
  const tone = priority === "P1" ? "rose" : priority === "P2" ? "amber" : priority === "P3" ? "cyan" : "slate";
  return (
    <div className="rounded-2xl border border-blue-500/15 bg-black/25 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-100">{wo?.title || "Work Order"}</div>
          <div className="mt-1 text-xs text-slate-500">{wo?.property_name || "Property"} · {wo?.unit_label || "Unit"}</div>
        </div>
        <Pill tone={tone}>{priority}</Pill>
      </div>
      <div className="mt-3 text-xs font-medium uppercase tracking-[0.12em] text-slate-400">{wo?.status || "OPEN"}</div>
    </div>
  );
}

function speak(text) {
  if (typeof window === "undefined" || !window.speechSynthesis || !text) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.96;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
  return true;
}

const calendarIcon = <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const teamIcon = <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM17 11a3 3 0 0 0 0-6M16 15h1.5a3.5 3.5 0 0 1 3.5 3.5V20" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const settingsIcon = <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 15.25A3.25 3.25 0 1 0 12 8.75a3.25 3.25 0 0 0 0 6.5Z" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20.3h-3v-.08a1.7 1.7 0 0 0-1.03-1.56A1.7 1.7 0 0 0 8.8 19l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 7.02 15a1.7 1.7 0 0 0-1.56-1.03H5.4v-3h.06a1.7 1.7 0 0 0 1.56-1.03 1.7 1.7 0 0 0-.34-1.88L6.62 8l2.12-2.12.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.03-1.56V4.7h3v.02a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06L19.8 8l-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.03h.04v3h-.04A1.7 1.7 0 0 0 19.4 15Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;

export default function PropertyManagerDashboard() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [properties, setProperties] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [briefing, setBriefing] = useState("");
  const [briefingStatus, setBriefingStatus] = useState("");
  const [briefingLoading, setBriefingLoading] = useState(false);

  async function loadDashboard() {
    setLoading(true);
    setLoadError("");
    try {
      const [pRes, woRes] = await Promise.allSettled([api.get("/pm/properties/"), api.get("/pm/work-orders/")]);
      if (pRes.status === "fulfilled") {
        const data = pRes.value.data;
        setProperties(Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []);
      } else setProperties([]);
      if (woRes.status === "fulfilled") {
        const data = woRes.value.data;
        setWorkOrders(Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []);
      } else setWorkOrders([]);
      if (pRes.status === "rejected" && woRes.status === "rejected") setLoadError("We could not load your property data. Check your connection and try again.");
      else if (pRes.status === "rejected" || woRes.status === "rejected") setLoadError("Some property data could not be loaded. The available information is shown below.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDashboard(); }, []);

  const stats = useMemo(() => {
    const total = properties.length;
    const occupied = properties.filter((property) => Number(property?.occupancy_rate || 0) >= 0.9).length;
    const risk = properties.filter((property) => String(property?.status || "").toUpperCase() === "AT_RISK").length;
    const urgent = workOrders.filter((workOrder) => ["P1", "P2"].includes(String(workOrder?.priority || "").toUpperCase())).length;
    return { total, occupied, risk, workOrders: workOrders.length, urgent };
  }, [properties, workOrders]);

  const localBriefing = useMemo(() => {
    if (loading) return "Your Property Management portfolio is still loading.";
    const parts = [`You have ${stats.total} ${stats.total === 1 ? "property" : "properties"} in view.`];
    if (stats.risk) parts.push(`${stats.risk} ${stats.risk === 1 ? "property needs" : "properties need"} attention.`);
    else parts.push("No properties are currently marked at risk.");
    if (stats.workOrders) parts.push(`There are ${stats.workOrders} active work orders, including ${stats.urgent} high-priority items.`);
    else parts.push("No active work orders were returned.");
    parts.push("Open the calendar for inspections, lease obligations, and scheduled maintenance.");
    return parts.join(" ");
  }, [loading, stats]);

  async function playPmBriefing() {
    setBriefingLoading(true);
    setBriefing(localBriefing);
    setBriefingStatus(speak(localBriefing) ? "Browser briefing playing" : "Audio is unavailable on this device");
    try {
      const response = await api.post("/sync-ai/chat/", {
        workspace: "property_management",
        message: "Give me a concise spoken Property Management operations briefing. State what needs attention first and do not invent missing information.",
        context: {
          property_count: stats.total,
          healthy_occupancy_count: stats.occupied,
          at_risk_count: stats.risk,
          active_work_order_count: stats.workOrders,
          urgent_work_order_count: stats.urgent,
          briefing_source: "property_manager_dashboard",
          priority_work_orders: workOrders.slice(0, 5).map((item) => ({
            title: item?.title || "Work order",
            property: item?.property_name || "",
            priority: item?.priority || "",
            status: item?.status || "OPEN",
          })),
        },
      });
      const text = String(response?.data?.message || "").trim();
      if (text) {
        setBriefing(text);
        setBriefingStatus("PM SYNC backend briefing ready · tap Replay for audio");
      }
    } catch {
      setBriefingStatus("Browser briefing used · backend PM SYNC is awaiting deployment approval");
    } finally {
      setBriefingLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden"><div className="absolute left-[-15%] top-[-15%] h-[420px] w-[420px] rounded-full bg-blue-600/15 blur-[120px]" /><div className="absolute bottom-[-20%] right-[-15%] h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-[140px]" /></div>
      <ModeBar title="Property Management" subtitle="Your portfolio command center" rightActions={<Button tone="slate" onClick={loadDashboard} disabled={loading}>{loading ? "Refreshing" : "Refresh"}</Button>} />
      <main className="relative z-10 mx-auto max-w-7xl space-y-5 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 sm:space-y-6 sm:py-6">
        <section className="rounded-[30px] border border-cyan-400/20 bg-gradient-to-br from-[#07111f] via-[#081528] to-[#04101d] p-5 shadow-[0_24px_90px_rgba(0,119,255,0.14)] sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl"><Pill tone="cyan">Operations overview</Pill><h1 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">What needs your attention today?</h1><p className="mt-2 text-sm leading-6 text-slate-400">Review portfolio health, active maintenance, team access, and upcoming property activity from one mobile-first workspace.</p></div>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap"><Button tone="cyan" onClick={() => nav("/pm/calendar")}>Calendar</Button><Button tone="slate" onClick={() => nav("/pm/employees")}>Team</Button></div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[30px] border border-cyan-400/30 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.15),transparent_38%),linear-gradient(145deg,#07111f,#030913)] shadow-[0_22px_70px_rgba(0,153,255,0.14)]">
          <div className="flex items-start justify-between gap-4 p-5">
            <div className="min-w-0"><Pill tone="cyan">PM SYNC</Pill><h2 className="mt-3 text-xl font-semibold text-white">Spoken portfolio briefing</h2><p className="mt-1 text-xs leading-5 text-slate-400">Uses your visible property and maintenance totals. The secure AI gateway adds a role-specific summary when its backend deployment is approved.</p></div>
            <button type="button" onClick={playPmBriefing} disabled={briefingLoading || loading} aria-label="Play PM SYNC briefing" className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-cyan-300/45 bg-cyan-300/15 text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.18)] disabled:opacity-40">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" strokeLinecap="round" /></svg>
            </button>
          </div>
          {briefing ? <div className="border-t border-cyan-400/15 bg-black/20 p-5"><p className="text-sm leading-6 text-slate-200">{briefing}</p><div className="mt-3 flex items-center justify-between gap-3"><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-200/80">{briefingStatus}</span><button type="button" onClick={() => speak(briefing)} className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100">Replay</button></div></div> : null}
        </section>

        {loadError ? <div className="flex flex-col gap-3 rounded-3xl border border-amber-500/25 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm leading-5 text-amber-100">{loadError}</p><Button tone="slate" onClick={loadDashboard}>Try Again</Button></div> : null}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><MetricCard label="Properties" value={stats.total} tone="cyan" hint="Portfolio total" /><MetricCard label="90%+ Occupied" value={stats.occupied} tone="emerald" hint="Healthy occupancy" /><MetricCard label="At Risk" value={stats.risk} tone="rose" hint="Needs attention" /><MetricCard label="Work Orders" value={stats.workOrders} tone="amber" hint="Active queue" /></div>
        <Card title="Priority actions" subtitle="Only verified routes are shown here. New property, tenant, document, and work-order creation flows will be added as dedicated builds."><div className="grid gap-3 md:grid-cols-3"><ActionTile title="Open calendar" detail="Review inspections, maintenance visits, and property activity." onClick={() => nav("/pm/calendar")} icon={calendarIcon} /><ActionTile title="Manage team" detail="Review employee access and property-management staffing." onClick={() => nav("/pm/employees")} icon={teamIcon} /><ActionTile title="Property settings" detail="Review Property Management account and operating settings." onClick={() => nav("/pm/settings")} icon={settingsIcon} /></div></Card>
        <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr] xl:gap-6">
          <Card title="Property portfolio" subtitle="Open a property to review its existing detail workspace." right={<Pill tone="cyan">{properties.length} total</Pill>}>
            {loading ? <div className="grid gap-3">{[0,1,2].map((item) => <div key={item} className="h-28 animate-pulse rounded-3xl border border-slate-800 bg-slate-900/50" />)}</div> : properties.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/40 p-8 text-center"><div className="text-sm font-medium text-slate-300">No properties are connected yet.</div><div className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500">Property creation is not exposed here until the full form, backend persistence, and mobile validation are verified together.</div></div> : <div className="grid gap-3">{properties.map((property) => <PropertyRow key={property.id} property={property} onOpen={(item) => nav(`/pm/properties/${item.id}`)} />)}</div>}
          </Card>
          <Card title="Maintenance queue" subtitle="Current work orders returned by the production API." right={<Pill tone="amber">Live</Pill>}>
            {loading ? <div className="space-y-3">{[0,1,2].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/50" />)}</div> : workOrders.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 p-5 text-sm text-slate-500">No active work orders were returned.</div> : <div className="space-y-3">{workOrders.slice(0,6).map((workOrder) => <WorkOrderRow key={workOrder.id} wo={workOrder} />)}</div>}
          </Card>
        </div>
      </main>
    </div>
  );
}
