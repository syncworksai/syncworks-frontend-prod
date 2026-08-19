import React, { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  CloudSun,
  Dumbbell,
  ExternalLink,
  LoaderCircle,
  MessageCircleMore,
  RefreshCw,
  Sparkles,
  WalletCards,
  Wrench,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { getSyncAssistantDailyState, setSyncDepartureReminder } from "../../api/jarvisProduct";

function clock(value) {
  if (!value) return "";
  try { return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); } catch { return ""; }
}
function money(value) {
  return Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
}
function workoutName(planned) {
  if (!planned) return "";
  if (typeof planned === "string") return planned;
  return planned.workout_name || planned.name || planned.title || "Planned workout";
}
function askUrl(prompt) {
  return `/sync?prompt=${encodeURIComponent(prompt)}`;
}

function Row({ title, detail, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-start justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-left transition hover:border-cyan-400/20">
      <div><div className="text-sm font-black text-white">{title}</div>{detail ? <div className="mt-1 text-xs leading-5 text-slate-400">{detail}</div> : null}</div>
      {onClick ? <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-cyan-200" /> : null}
    </button>
  );
}

export default function SyncAssistantInteractiveBrief({ onPlayBriefing }) {
  const nav = useNavigate();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setState(await getSyncAssistantDailyState()); }
    catch { setState(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading && !state) return <section className="rounded-[2rem] border border-cyan-400/15 bg-slate-950/60 p-5 text-sm text-slate-400"><LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" />Preparing your SYNC Assistant briefing…</section>;
  if (!state) return <section className="rounded-[2rem] border border-rose-400/15 bg-slate-950/60 p-5 text-sm text-slate-300">SYNC Assistant could not load the daily state. <button onClick={load} className="ml-2 font-black text-cyan-200">Retry</button></section>;

  const weather = state.weather || {};
  const period = weather.current_period || {};
  const calendar = state.calendar || {};
  const events = calendar.events || [];
  const nextEvent = calendar.next_event || {};
  const requests = state.personal_requests || {};
  const requestItems = requests.items || [];
  const health = state.health || {};
  const todayHealth = health.today || {};
  const nutrition = health.nutrition || {};
  const finances = state.money || {};
  const due = finances.due_next_7_days || [];
  const attention = state.needs_attention || [];
  const recommended = state.recommended_next || {};
  const live = state.live || {};

  async function remindMe() {
    if (!nextEvent.id) return;
    try {
      await setSyncDepartureReminder(nextEvent.id, {
        enabled: true,
        arrival_buffer_minutes: nextEvent.arrival_buffer_minutes ?? live.preferences?.arrival_buffer_minutes ?? 15,
        reminder_minutes: live.preferences?.departure_reminder_minutes ?? 10,
      });
      setNotice(`I’ll remind you before it is time to leave for ${nextEvent.title}.`);
    } catch (error) { setNotice(error?.response?.data?.detail || "Could not save the leave reminder."); }
  }

  const weatherMessage = weather.available
    ? `${period.temperature ?? "—"}°${period.temperature_unit || "F"} · ${period.short_forecast || "Forecast ready"}`
    : weather.reason === "COORDINATES_REQUIRED"
      ? "Add your home location coordinates to turn on local weather."
      : weather.reason === "PLAN_REQUIRED"
        ? "Weather intelligence is included with a SYNC Assistant plan."
        : "Weather is not available right now.";

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_90%_10%,rgba(34,211,238,.14),transparent_30%),linear-gradient(145deg,rgba(7,17,31,.98),rgba(2,6,23,.98))] p-5 shadow-[0_22px_80px_rgba(0,0,0,.28)] sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">SYNC Assistant · Live daily state</div>
          <h1 className="mt-2 text-2xl font-black text-white sm:text-4xl">{state.greeting}, {state.user_name}. It’s {clock(state.local_time)}.</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">I’m using the information you’ve connected—not just counts—to tell you what is actually happening today.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 text-slate-300" aria-label="Refresh briefing"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
          <button type="button" onClick={() => nav("/customer/settings")} className="rounded-2xl border border-cyan-300/25 bg-cyan-500/10 px-4 py-2 text-xs font-black text-cyan-100">Connections</button>
        </div>
      </div>

      {recommended.title ? (
        <div className="mt-5 rounded-3xl border border-cyan-300/20 bg-cyan-500/[.07] p-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-cyan-200"><Sparkles className="h-4 w-4" />My recommendation</div>
          <div className="mt-2 text-lg font-black text-white">{recommended.title}</div>
          <div className="mt-1 text-sm text-slate-300">{recommended.detail}</div>
          <button type="button" onClick={() => nav(askUrl(`Help me handle this next: ${recommended.title}. ${recommended.detail || ""}`))} className="mt-3 rounded-xl border border-cyan-300/25 bg-cyan-500/10 px-3 py-2 text-xs font-black text-cyan-100">Talk this through with SYNC</button>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/[.025] p-4">
          <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-black text-white"><CalendarDays className="h-4 w-4 text-violet-200" />Today’s schedule</div><button onClick={() => nav("/customer/calendar")} className="text-xs font-black text-cyan-200">Calendar</button></div>
          <div className="mt-3 space-y-2">
            {events.length ? events.slice(0, 6).map((event) => <Row key={event.id} title={`${clock(event.start_at)} · ${event.title}`} detail={[event.location || event.address, event.departure?.available ? `Leave by ${clock(event.departure.leave_by)} · ${event.departure.travel_minutes} min drive${event.departure.traffic_aware ? " with traffic" : ""}` : ""].filter(Boolean).join(" · ")} onClick={() => nav("/customer/calendar")} />) : <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">No events scheduled today.</div>}
          </div>
          {nextEvent.departure?.available ? <button type="button" onClick={remindMe} className="mt-3 min-h-10 rounded-xl border border-cyan-300/25 bg-cyan-500/10 px-3 text-xs font-black text-cyan-100">Remind me to leave for {nextEvent.title}</button> : nextEvent.location ? <div className="mt-3 text-xs text-amber-200">Traffic needs a home location with coordinates plus the Google Routes server key.</div> : null}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[.025] p-4">
          <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-black text-white"><Wrench className="h-4 w-4 text-cyan-200" />Personal requests</div><button onClick={() => nav("/customer/requests")} className="text-xs font-black text-cyan-200">All requests</button></div>
          <div className="mt-3 space-y-2">
            {requestItems.length ? requestItems.slice(0, 5).map((request) => <Row key={request.id} title={request.title} detail={`${request.status_label} · ${request.provider} · ${request.code}`} onClick={() => nav("/customer/requests")} />) : <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">No open Personal requests.</div>}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <button type="button" onClick={() => nav(askUrl("Give me the weather report and tell me what it changes about my schedule today."))} className="rounded-3xl border border-slate-800 bg-black/20 p-4 text-left"><CloudSun className="h-5 w-5 text-cyan-200" /><div className="mt-2 text-xs font-black uppercase text-slate-500">Weather</div><div className="mt-1 font-black text-white">{weatherMessage}</div>{period.precipitation_probability != null ? <div className="mt-1 text-xs text-slate-400">{period.precipitation_probability}% precipitation</div> : null}</button>

        <button type="button" onClick={() => nav("/customer/health")} className="rounded-3xl border border-slate-800 bg-black/20 p-4 text-left"><Dumbbell className="h-5 w-5 text-emerald-200" /><div className="mt-2 text-xs font-black uppercase text-slate-500">Health</div>{health.available ? <><div className="mt-1 font-black text-white">{todayHealth.workout_completed ? "Workout complete" : workoutName(todayHealth.planned_workout) || "No workout planned"}</div><div className="mt-1 text-xs text-slate-400">{nutrition.planned_breakfast ? `${nutrition.breakfast_logged ? "Breakfast logged" : "Breakfast not logged"}: ${typeof nutrition.planned_breakfast === "string" ? nutrition.planned_breakfast : "planned meal"}` : "Open Health to plan today’s workout and nutrition."}</div>{nutrition.protein_goal_grams ? <div className="mt-1 text-xs font-black text-emerald-200">Protein: {nutrition.protein_grams || 0} / {nutrition.protein_goal_grams}g</div> : null}</> : <><div className="mt-1 font-black text-white">Health not configured</div><div className="mt-1 text-xs text-slate-400">Finish Health setup so SYNC can coach the day.</div></>}</button>

        <button type="button" onClick={() => nav("/customer/finance")} className="rounded-3xl border border-slate-800 bg-black/20 p-4 text-left"><WalletCards className="h-5 w-5 text-amber-200" /><div className="mt-2 text-xs font-black uppercase text-slate-500">Money</div>{finances.available ? <><div className="mt-1 font-black text-white">{due.length} payment{due.length === 1 ? "" : "s"} due this week</div><div className="mt-1 text-xs text-slate-400">Known due total: {money(finances.known_due_total_next_7_days)}</div>{due[0] ? <div className="mt-1 text-xs font-black text-amber-200">Next: {due[0].name} · {due[0].due_date}</div> : null}</> : <><div className="mt-1 font-black text-white">No connected money data</div><div className="mt-1 text-xs text-slate-400">Connect/import accounts to give SYNC balances and bill context.</div></>}</button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[.025] p-4"><div className="flex items-center gap-2 text-sm font-black text-white"><Sparkles className="h-4 w-4 text-cyan-200" />What needs attention</div><div className="mt-3 space-y-2">{attention.length ? attention.slice(0, 6).map((item, index) => <Row key={`${item.category}-${index}`} title={item.title} detail={item.detail} onClick={() => item.action?.url ? nav(item.action.url) : nav(askUrl(`Tell me more about ${item.title}`))} />) : <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">No connected area currently needs immediate attention.</div>}</div></div>

        <div className="rounded-3xl border border-white/10 bg-white/[.025] p-4">
          <div className="flex items-center gap-2 text-sm font-black text-white"><MessageCircleMore className="h-4 w-4 text-violet-200" />Ask what matters next</div>
          <div className="mt-3 grid gap-2">
            {["What should I do next?", "Walk me through my schedule", "What are my open requests?", "Help me plan my workout", "Review my finances"].map((prompt) => <button key={prompt} type="button" onClick={() => nav(askUrl(prompt))} className="min-h-10 rounded-xl border border-white/10 bg-black/20 px-3 text-left text-xs font-black text-slate-200 hover:border-cyan-400/20">{prompt}</button>)}
            <button type="button" onClick={onPlayBriefing} className="mt-1 min-h-11 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 text-sm font-black text-white">Hear this full briefing</button>
          </div>
          <div className="mt-4 rounded-2xl border border-violet-400/15 bg-violet-500/[.05] p-3 text-xs leading-5 text-slate-400"><strong className="text-violet-100">Email:</strong> Outlook routing exists for PM workflows; Personal Gmail/Outlook important-email summaries and replies are the next connection build.</div>
        </div>
      </div>

      {notice ? <div className="mt-3 text-xs font-bold text-emerald-200">{notice}</div> : null}
    </section>
  );
}
