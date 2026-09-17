import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Dumbbell,
  ExternalLink,
  HeartPulse,
  Link2,
  ListTodo,
  MapPin,
  Ruler,
  Scale,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import api from "../../api/client";
import { trackSyncUsage } from "../../api/syncUsage";

const CACHE_KEY = "syncworks_calendar_last_good_v3";
const HEALTH_ACTION_KEY = "syncworks_health_open_action_v1";

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

function sourceKey(event) {
  return String(event?.source || "MANUAL").toUpperCase();
}

function isTask(event) {
  return String(event?.metadata?.entity_type || "EVENT").toUpperCase() === "TASK";
}

function taskDone(event) {
  return String(event?.metadata?.task_status || "OPEN").toUpperCase() === "DONE";
}

function eventLocation(event) {
  const metadata = event?.metadata || {};
  const override = String(metadata.routing_address_override || "").trim();
  if (override) return override;
  return [event?.location_name, event?.address_line1, event?.city, event?.state, event?.postal_code].filter(Boolean).join(", ");
}

function MiniAction({ children, href, onClick, tone = "slate" }) {
  const tones = {
    slate: "border-white/10 bg-white/[.035] text-slate-300",
    cyan: "border-cyan-300/20 bg-cyan-500/[.08] text-cyan-100",
    emerald: "border-emerald-300/20 bg-emerald-500/[.08] text-emerald-100",
    violet: "border-violet-300/20 bg-violet-500/[.08] text-violet-100",
    amber: "border-amber-300/20 bg-amber-500/[.08] text-amber-100",
  };
  const className = `inline-flex min-h-8 shrink-0 items-center justify-center gap-1 rounded-lg border px-2 text-[9px] font-black ${tones[tone] || tones.slate}`;
  if (href) return <a href={href} className={className}>{children}</a>;
  return <button type="button" onClick={onClick} className={className}>{children}</button>;
}

export default function CalendarDailySnapshot({ compact = false, title = "Today · Calendar", className = "" }) {
  const [events, setEvents] = useState(() => {
    try { return safeList(JSON.parse(window.localStorage.getItem(CACHE_KEY) || "[]")); }
    catch { return []; }
  });
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const [groupEvent, setGroupEvent] = useState(null);
  const [groupName, setGroupName] = useState("");
  const [groupUrl, setGroupUrl] = useState("");
  const [savingGroup, setSavingGroup] = useState(false);
  const [groupNotice, setGroupNotice] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await api.get("/personal-calendar/events/", { params: { status: "ACTIVE" } });
      const rows = safeList(response.data);
      setEvents(rows);
      setStale(false);
      try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(rows)); } catch { /* optional cache */ }
    } catch {
      setStale(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const today = ymd();
  const todayEvents = useMemo(
    () => events.filter((event) => ymd(new Date(event.start_at)) === today && !taskDone(event)).sort((a, b) => new Date(a.start_at) - new Date(b.start_at)),
    [events, today],
  );
  const nextEvent = useMemo(
    () => events.filter((event) => !taskDone(event) && new Date(event.start_at) >= new Date()).sort((a, b) => new Date(a.start_at) - new Date(b.start_at))[0] || null,
    [events],
  );
  const taskCount = todayEvents.filter(isTask).length;
  const serviceCount = todayEvents.filter((event) => sourceKey(event) === "TICKET").length;
  const healthEvents = todayEvents.filter((event) => sourceKey(event) === "HEALTH" || String(event?.metadata?.category || "").toUpperCase() === "WORKOUT");
  const blocks = todayEvents.filter((event) => !isTask(event)).length;

  function openHealth(action) {
    trackSyncUsage("HEALTH", "QUICK_ACTION", { category: action, source: "calendar_snapshot" });
    try { window.localStorage.setItem(HEALTH_ACTION_KEY, action); } catch { /* optional */ }
    window.location.assign("/customer/health");
  }

  function openGroupEditor(event) {
    if (!event?.id) return;
    const attachment = event?.metadata?.social_group_attachment || {};
    setGroupEvent(event);
    setGroupName(String(attachment.group_name || ""));
    setGroupUrl(String(attachment.group_url || ""));
    setGroupNotice("");
  }

  async function saveGroupAttachment() {
    if (!groupEvent?.id || !String(groupName || "").trim()) return;
    setSavingGroup(true);
    setGroupNotice("");
    try {
      await api.patch(`/personal-calendar/events/${groupEvent.id}/`, {
        metadata: {
          ...(groupEvent.metadata || {}),
          social_group_attachment: {
            group_name: String(groupName || "").trim(),
            group_url: String(groupUrl || "").trim(),
            source: "calendar_manual",
            status: "READY_FOR_SOCIAL_LINK",
            attached_at: new Date().toISOString(),
          },
        },
      });
      trackSyncUsage("SOCIAL", "GROUP_ATTACHED_TO_EVENT", { completed: true, source: "calendar_snapshot" });
      setGroupNotice("Group attached to this event. Social can use this metadata when the group workflow is finished.");
      await load();
    } catch (error) {
      setGroupNotice(error?.response?.data?.detail || "Could not attach that group yet.");
    } finally {
      setSavingGroup(false);
    }
  }

  const counters = [[blocks, "Blocks"], [taskCount, "Tasks"], [serviceCount, "Service"], [healthEvents.length, "Health"]];

  return (
    <section className={`rounded-[1.25rem] border border-cyan-400/18 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,.07),transparent_35%),linear-gradient(145deg,rgba(8,18,35,.94),rgba(2,6,23,.96))] p-3 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-cyan-200" />
          <div className="min-w-0"><div className="text-[9px] font-black uppercase tracking-[.16em] text-cyan-200">{title}</div><div className="truncate text-[10px] font-black text-white">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</div></div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {compact ? counters.map(([value, label]) => <span key={label} className="rounded-full border border-white/[.07] bg-black/20 px-2 py-1 text-[8px] font-black text-slate-400"><span className="text-white">{loading && !events.length ? "·" : value}</span> {label}</span>) : null}
          {stale ? <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-1 text-[8px] font-black text-amber-100">Cached</span> : null}
          <MiniAction href="/calendar" tone="cyan">Open <ExternalLink className="h-3 w-3" /></MiniAction>
        </div>
      </div>

      {!compact ? <div className="mt-2 grid grid-cols-4 gap-1.5">{counters.map(([value, label]) => <div key={label} className="rounded-xl border border-white/[.07] bg-black/20 p-2"><div className="text-sm font-black text-white">{loading && !events.length ? "·" : value}</div><div className="text-[8px] font-black uppercase tracking-wider text-slate-600">{label}</div></div>)}</div> : null}

      <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0 rounded-xl border border-white/[.07] bg-black/20 p-2.5">
          <div className="text-[8px] font-black uppercase tracking-[.14em] text-slate-600">Next up</div>
          {nextEvent ? <div className="flex flex-wrap items-end justify-between gap-2"><div className="min-w-0"><div className="mt-1 truncate text-[11px] font-black text-white">{nextEvent.title}</div><div className="mt-0.5 text-[9px] text-slate-500">{new Date(nextEvent.start_at).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })}</div>{eventLocation(nextEvent) ? <div className="mt-1 truncate text-[9px] text-slate-400"><MapPin className="mr-1 inline h-3 w-3" />{eventLocation(nextEvent)}</div> : null}</div><div className="flex shrink-0 flex-wrap gap-1.5"><MiniAction onClick={() => openGroupEditor(nextEvent)}><Users className="h-3 w-3" />Group</MiniAction><MiniAction href="/calendar" tone="cyan"><CalendarDays className="h-3 w-3" />Details</MiniAction></div></div> : <div className="mt-1 text-[10px] text-slate-500">Nothing upcoming. Your day is open.</div>}
        </div>

        <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/[.045] p-2.5">
          <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[.14em] text-emerald-200"><HeartPulse className="h-3 w-3" />Health</div>
          <div className="mt-2 flex max-w-full flex-wrap gap-1.5">
            {healthEvents.length ? <MiniAction href="/customer/health" tone="emerald"><Dumbbell className="h-3 w-3" />Workout</MiniAction> : <MiniAction onClick={() => openHealth("plan-today")} tone="emerald"><Dumbbell className="h-3 w-3" />Workout</MiniAction>}
            <MiniAction onClick={() => openHealth("coach-chat")} tone="violet"><Sparkles className="h-3 w-3" />AI</MiniAction>
            <MiniAction onClick={() => openHealth("weight")}><Scale className="h-3 w-3" />Weigh</MiniAction>
            <MiniAction onClick={() => openHealth("progress")}><Ruler className="h-3 w-3" />Measure</MiniAction>
            <MiniAction href="/calendar" tone="cyan"><ListTodo className="h-3 w-3" />Plan</MiniAction>
          </div>
        </div>
      </div>

      {groupEvent ? <div className="fixed inset-0 z-[260] flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center" onMouseDown={() => setGroupEvent(null)}>
        <div className="w-full max-w-md rounded-[1.6rem] border border-violet-400/25 bg-[#050b16] p-4 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
          <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.16em] text-violet-200"><Users className="h-4 w-4" />Event group attachment</div><h3 className="mt-1 text-lg font-black text-white">{groupEvent.title}</h3><p className="mt-1 text-[10px] leading-4 text-slate-500">Attach a group now. When Social group integrations are completed, this same event metadata can connect to the live group record.</p></div><button type="button" onClick={() => setGroupEvent(null)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 text-slate-400"><X className="h-4 w-4" /></button></div>
          <label className="mt-4 block text-[10px] font-black uppercase tracking-wider text-slate-500">Group name<input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Softball team, family trip, church group…" className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none" /></label>
          <label className="mt-3 block text-[10px] font-black uppercase tracking-wider text-slate-500">Group link or future Social URL<input value={groupUrl} onChange={(event) => setGroupUrl(event.target.value)} placeholder="Optional for now" className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none" /></label>
          {groupNotice ? <div className="mt-3 rounded-xl border border-cyan-400/15 bg-cyan-500/[.06] p-2.5 text-[10px] leading-4 text-cyan-100">{groupNotice}</div> : null}
          <button type="button" onClick={saveGroupAttachment} disabled={savingGroup || !groupName.trim()} className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 text-xs font-black text-white disabled:opacity-40"><Link2 className="h-4 w-4" />{savingGroup ? "Saving…" : "Attach group to event"}</button>
        </div>
      </div> : null}
    </section>
  );
}
