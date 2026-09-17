import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CreditCard,
  Dumbbell,
  Gauge,
  Ruler,
  Scale,
  Sparkles,
  Utensils,
} from "lucide-react";

import api from "../api/client";
import { getCustomerHealthProfile } from "../api/customerHealth";
import { getSyncUsageSummary, trackSyncUsage } from "../api/syncUsage";

function safeList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function ymd(value = new Date()) {
  const date = new Date(value);
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function daysSince(value) {
  if (!value) return 999;
  const date = new Date(String(value).length === 10 ? `${value}T00:00:00` : value);
  if (!Number.isFinite(date.getTime())) return 999;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

function daysUntil(value) {
  if (!value) return 999;
  const date = new Date(`${value}T23:59:59`);
  if (!Number.isFinite(date.getTime())) return 999;
  return Math.ceil((date.getTime() - Date.now()) / 86400000);
}

function toneClasses(tone) {
  if (tone === "rose") return "border-rose-400/20 bg-rose-500/[.07] text-rose-100";
  if (tone === "amber") return "border-amber-400/20 bg-amber-500/[.07] text-amber-100";
  if (tone === "emerald") return "border-emerald-400/20 bg-emerald-500/[.07] text-emerald-100";
  if (tone === "violet") return "border-violet-400/20 bg-violet-500/[.07] text-violet-100";
  return "border-cyan-400/20 bg-cyan-500/[.07] text-cyan-100";
}

function healthProgressLogs(profile) {
  if (Array.isArray(profile?.progress_json)) return profile.progress_json;
  return [];
}

export default function NeedsAttentionCard({ compact = false, maxItems = 5, className = "" }) {
  const [events, setEvents] = useState([]);
  const [health, setHealth] = useState(null);
  const [finance, setFinance] = useState(null);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const [calendarResult, healthResult, financeResult, usageResult] = await Promise.allSettled([
        api.get("/personal-calendar/events/", { params: { status: "ACTIVE" } }),
        getCustomerHealthProfile(),
        api.get("/personal-finance/dashboard/"),
        getSyncUsageSummary(),
      ]);
      if (!mounted) return;
      if (calendarResult.status === "fulfilled") setEvents(safeList(calendarResult.value?.data));
      if (healthResult.status === "fulfilled") setHealth(healthResult.value || null);
      if (financeResult.status === "fulfilled") setFinance(financeResult.value?.data || null);
      if (usageResult.status === "fulfilled") setUsage(usageResult.value || null);
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  const items = useMemo(() => {
    const next = [];
    const today = ymd();
    const todayEvents = events.filter((event) => ymd(new Date(event.start_at)) === today);
    const todayWorkout = todayEvents.some((event) => String(event?.source || "").toUpperCase() === "HEALTH" || String(event?.metadata?.category || "").toUpperCase() === "WORKOUT");
    const mealEvents = todayEvents.filter((event) => String(event?.metadata?.category || "").toUpperCase() === "MEAL");

    if (health) {
      const logs = healthProgressLogs(health);
      const weightLog = logs.find((row) => row?.type === "weight" || row?.weight);
      const measurementLog = logs.find((row) => row?.measurements && Object.values(row.measurements || {}).some(Boolean));
      if (!todayWorkout) next.push({ id: "workout", tone: "emerald", icon: Dumbbell, title: "No workout planned today", detail: "Plan one or let SYNC adjust the day.", href: "/customer/health", action: "PLAN_WORKOUT" });
      if (daysSince(weightLog?.ymd || weightLog?.date || weightLog?.created_at) >= 7) next.push({ id: "weight", tone: "cyan", icon: Scale, title: "Weigh-in due", detail: "SYNC is missing this week's progress check.", href: "/customer/health", action: "WEIGH_IN" });
      if (daysSince(measurementLog?.ymd || measurementLog?.date || measurementLog?.created_at) >= 28) next.push({ id: "measurements", tone: "violet", icon: Ruler, title: "Measurements due", detail: "Update measurements to keep progress trends useful.", href: "/customer/health", action: "MEASUREMENTS" });

      const snapshot = health?.snapshot_json && typeof health.snapshot_json === "object" ? health.snapshot_json : {};
      const nutritionActive = Boolean(snapshot.nutrition_enabled || snapshot.meal_plan_enabled || snapshot.protein_target || snapshot.protein_target_g || snapshot.daily_protein_goal);
      if (nutritionActive && !mealEvents.length) next.push({ id: "meals", tone: "amber", icon: Utensils, title: "Meals are not planned", detail: "Add lunch or dinner only if you want SYNC to protect a meal window.", href: "/calendar", action: "PLAN_MEAL" });
    }

    const upcoming = finance?.next_30_days || {};
    const financeRows = [
      ...(upcoming.liabilities || []).map((row) => ({ name: row.name, amount: row.next_payment_amount || row.minimum_payment, due: row.next_payment_date })),
      ...(upcoming.obligations || []).map((row) => ({ name: row.name, amount: row.expected_amount, due: row.next_due_date })),
    ].filter((row) => row.due).sort((a, b) => String(a.due).localeCompare(String(b.due)));
    financeRows.slice(0, 3).forEach((row) => {
      const dueIn = daysUntil(row.due);
      if (dueIn <= 7) next.push({
        id: `finance-${row.name}-${row.due}`,
        tone: dueIn <= 1 ? "rose" : "amber",
        icon: CreditCard,
        title: `${row.name} ${dueIn < 0 ? "overdue" : dueIn === 0 ? "due today" : `due in ${dueIn} day${dueIn === 1 ? "" : "s"}`}`,
        detail: row.amount != null ? `Minimum / expected: $${Number(row.amount || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}` : "Review payment status.",
        href: "/customer/finance",
        action: "FINANCE_DUE",
      });
    });

    const travelSoon = events.find((event) => {
      const start = new Date(event.start_at);
      const hours = (start.getTime() - Date.now()) / 3600000;
      const metadata = event?.metadata || {};
      const hasAddress = Boolean(metadata.routing_address_override || event.address_line1 || event.location_name);
      const travelAware = Boolean(metadata.travel_aware || metadata.scheduling_mode === "TRAVEL_AWARE" || hasAddress);
      return hours > 0 && hours <= 48 && travelAware && hasAddress && !metadata.travel_assist;
    });
    if (travelSoon) next.push({ id: `travel-${travelSoon.id}`, tone: "cyan", icon: CalendarClock, title: `Prepare travel for ${travelSoon.title}`, detail: "Traffic, weather and arrival buffer can become one leave-by plan.", href: "/calendar", action: "TRAVEL_PLAN" });

    return next.slice(0, maxItems);
  }, [events, finance, health, maxItems]);

  const score = Number(usage?.score || 0);
  const scoreLabel = usage?.level ? String(usage.level).replaceAll("_", " ") : "Building";

  function follow(item) {
    trackSyncUsage("PERSONAL", "ATTENTION_OPENED", { category: item.action, source: compact ? "dashboard" : "calendar" });
  }

  return <section className={`rounded-[1.35rem] border border-amber-400/18 bg-[linear-gradient(145deg,rgba(32,20,5,.42),rgba(2,6,23,.96))] p-3 ${className}`}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-300" /><div><div className="text-[9px] font-black uppercase tracking-[.16em] text-amber-200">Needs attention</div><div className="text-[10px] text-slate-500">SYNC notices missing or time-sensitive items so you don't have to maintain everything manually.</div></div></div>
      <div className="flex items-center gap-2 rounded-xl border border-white/[.07] bg-black/20 px-2.5 py-1.5"><Gauge className="h-3.5 w-3.5 text-cyan-300" /><div><div className="text-[8px] font-black uppercase tracking-wider text-slate-600">SYNC score</div><div className="text-[10px] font-black text-white">{usage ? `${score}/100 · ${scoreLabel}` : "Building"}</div></div></div>
    </div>

    <div className={`mt-3 grid gap-2 ${compact ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2"}`}>
      {loading ? <div className="text-[10px] text-slate-500">Checking your day…</div> : items.length ? items.map((item) => {
        const Icon = item.icon;
        return <a key={item.id} href={item.href} onClick={() => follow(item)} className={`flex min-w-0 items-center gap-2 rounded-xl border p-2.5 ${toneClasses(item.tone)}`}><Icon className="h-4 w-4 shrink-0" /><div className="min-w-0"><div className="truncate text-[10px] font-black">{item.title}</div><div className="mt-0.5 truncate text-[9px] opacity-60">{item.detail}</div></div></a>;
      }) : <div className="flex items-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-500/[.05] p-2.5 text-[10px] font-bold text-emerald-100"><Sparkles className="h-4 w-4" />Nothing urgent right now.</div>}
    </div>
  </section>;
}
