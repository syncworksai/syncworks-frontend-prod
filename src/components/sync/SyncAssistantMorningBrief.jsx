import React, { useEffect, useState } from "react";
import { CalendarDays, CloudSun, Dumbbell, ExternalLink, LoaderCircle, Sparkles, WalletCards } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { getSyncAssistantDailyState, setSyncDepartureReminder } from "../../api/jarvisProduct";

function clock(value) {
  if (!value) return "";
  try { return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); } catch { return ""; }
}
function dollars(value) {
  return Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function SyncAssistantMorningBrief({ onPlayBriefing }) {
  const nav = useNavigate();
  const [state, setState] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    getSyncAssistantDailyState().then(setState).catch(() => setState(null));
  }, []);

  if (!state) return <section className="rounded-[2rem] border border-cyan-400/15 bg-slate-950/60 p-5 text-sm text-slate-400"><LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" />Preparing your SYNC Assistant briefing…</section>;

  const weather = state.weather || {};
  const period = weather.current_period || {};
  const calendar = state.calendar || {};
  const nextEvent = calendar.next_event || {};
  const health = state.health || {};
  const todayHealth = health.today || {};
  const nutrition = health.nutrition || {};
  const money = state.money || {};
  const tasks = state.tasks || {};
  const properties = state.properties || {};
  const business = state.business || {};
  const attention = state.needs_attention || [];
  const live = state.live || {};

  async function remindMe() {
    if (!nextEvent.id) return;
    try {
      await setSyncDepartureReminder(nextEvent.id, {
        enabled: true,
        arrival_buffer_minutes: nextEvent.arrival_buffer_minutes ?? live.preferences?.arrival_buffer_minutes ?? 15,
        reminder_minutes: live.preferences?.departure_reminder_minutes ?? 10,
      });
      setNotice("Leave reminder saved for this event.");
    } catch (error) { setNotice(error?.response?.data?.detail || "Could not save the leave reminder."); }
  }

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_90%_10%,rgba(34,211,238,.14),transparent_30%),linear-gradient(145deg,rgba(7,17,31,.98),rgba(2,6,23,.98))] p-5 shadow-[0_22px_80px_rgba(0,0,0,.28)] sm:p-7">
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">SYNC Assistant · Daily brief</div>
            <h1 className="mt-2 text-2xl font-black text-white sm:text-4xl">{state.greeting}, {state.user_name}. It’s {clock(state.local_time)}.</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">I checked the connected parts of your day and prioritized what may need attention.</p>
          </div>
          <button type="button" onClick={() => nav("/upgrade?product=assistant")} className="rounded-2xl border border-cyan-300/25 bg-cyan-500/10 px-4 py-2 text-xs font-black text-cyan-100">Assistant settings</button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-800 bg-black/20 p-4"><CloudSun className="h-5 w-5 text-cyan-200" /><div className="mt-2 text-xs font-black uppercase text-slate-500">Weather</div>{weather.available ? <><div className="mt-1 font-black text-white">{period.temperature ?? "—"}°{period.temperature_unit || "F"} · {period.short_forecast || "Forecast ready"}</div><div className="mt-1 text-xs text-slate-400">{period.precipitation_probability != null ? `${period.precipitation_probability}% precipitation` : "Weather included in today’s plan."}</div></> : <><div className="mt-1 font-black text-white">{live.access ? "Add your location" : "SYNC Assistant Live"}</div><div className="mt-1 text-xs text-slate-400">{live.access ? "Location is needed for your local forecast." : "$1/month adds personalized weather, travel, news and sports."}</div></>}</div>

          <div className="rounded-3xl border border-slate-800 bg-black/20 p-4"><CalendarDays className="h-5 w-5 text-violet-200" /><div className="mt-2 text-xs font-black uppercase text-slate-500">Calendar</div><div className="mt-1 font-black text-white">{calendar.count_today || 0} event{calendar.count_today === 1 ? "" : "s"} today</div>{nextEvent.title ? <div className="mt-1 text-xs text-slate-400">Next: {nextEvent.title} at {clock(nextEvent.start_at)}</div> : <div className="mt-1 text-xs text-slate-400">No upcoming event detected today.</div>}{nextEvent.departure?.available ? <div className="mt-2 text-xs font-black text-cyan-100">Leave by {clock(nextEvent.departure.leave_by)} · {nextEvent.departure.travel_minutes} min drive</div> : null}</div>

          <div className="rounded-3xl border border-slate-800 bg-black/20 p-4"><Dumbbell className="h-5 w-5 text-emerald-200" /><div className="mt-2 text-xs font-black uppercase text-slate-500">Health</div>{health.available ? <><div className="mt-1 font-black text-white">{todayHealth.workout_completed ? "Workout complete" : todayHealth.planned_workout?.workout_name || "No workout planned"}</div><div className="mt-1 text-xs text-slate-400">{nutrition.planned_breakfast ? `${nutrition.breakfast_logged ? "Breakfast logged" : "Breakfast not logged"}: ${typeof nutrition.planned_breakfast === "string" ? nutrition.planned_breakfast : "planned meal"}` : "Nutrition will appear when a meal plan is available."}</div></> : <><div className="mt-1 font-black text-white">Health not connected</div><div className="mt-1 text-xs text-slate-400">Connect Health to add workout and nutrition guidance.</div></>}</div>

          <div className="rounded-3xl border border-slate-800 bg-black/20 p-4"><WalletCards className="h-5 w-5 text-amber-200" /><div className="mt-2 text-xs font-black uppercase text-slate-500">Money</div>{money.available ? <><div className="mt-1 font-black text-white">{(money.due_next_7_days || []).length} known payment{(money.due_next_7_days || []).length === 1 ? "" : "s"} this week</div><div className="mt-1 text-xs text-slate-400">Known due total: {dollars(money.known_due_total_next_7_days)}</div></> : <><div className="mt-1 font-black text-white">No connected money data</div><div className="mt-1 text-xs text-slate-400">Balances and bills appear as financial accounts are connected.</div></>}</div>
        </div>

        {(nextEvent.departure?.available || nextEvent.location) ? <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-cyan-400/15 bg-cyan-500/[.05] p-3 text-xs text-slate-300"><span className="font-black text-white">{nextEvent.title}</span>{nextEvent.departure?.available ? <span>Recommended departure {clock(nextEvent.departure.leave_by)}.</span> : <span>Add a starting location and Live access for traffic-aware departure time.</span>}<button type="button" onClick={remindMe} className="ml-auto rounded-xl border border-cyan-300/25 bg-cyan-500/10 px-3 py-2 font-black text-cyan-100">Remind me to leave</button></div> : null}

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[.025] p-4"><div className="flex items-center gap-2 text-sm font-black text-white"><Sparkles className="h-4 w-4 text-cyan-200" />What needs attention</div><div className="mt-3 space-y-2">{attention.length ? attention.slice(0, 5).map((item, index) => <button key={`${item.category}-${index}`} type="button" onClick={() => item.action?.url && nav(item.action.url)} className="flex w-full items-start justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-left"><div><div className="text-sm font-black text-white">{item.title}</div><div className="mt-1 text-xs text-slate-400">{item.detail}</div></div>{item.action?.url ? <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-cyan-200" /> : null}</button>) : <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">No connected area currently needs immediate attention.</div>}</div></div>
          <div className="rounded-3xl border border-white/10 bg-white/[.025] p-4"><div className="text-sm font-black text-white">Quick status</div><div className="mt-3 space-y-2 text-sm text-slate-300"><div className="flex justify-between"><span>To-do</span><strong className="text-white">{tasks.open_count || 0} open</strong></div><div className="flex justify-between"><span>Properties</span><strong className="text-white">{properties.open_workorders || 0} work orders</strong></div><div className="flex justify-between"><span>Business</span><strong className="text-white">{business.needs_attention || 0} need attention</strong></div><div className="flex justify-between"><span>Email</span><strong className="text-slate-500">Next build</strong></div><div className="flex justify-between"><span>News / sports</span><strong className="text-slate-500">Preferences saved</strong></div></div><div className="mt-4 grid gap-2"><button type="button" onClick={onPlayBriefing} className="min-h-11 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 text-sm font-black text-white">Hear full briefing</button><button type="button" onClick={() => nav("/sync")} className="min-h-11 rounded-2xl border border-white/10 px-4 text-sm font-black text-slate-200">Ask SYNC Assistant</button></div></div>
        </div>
        {notice ? <div className="mt-3 text-xs font-bold text-emerald-200">{notice}</div> : null}
      </div>
    </section>
  );
}
