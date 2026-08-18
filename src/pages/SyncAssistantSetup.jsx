import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CloudSun,
  Dumbbell,
  LoaderCircle,
  LocateFixed,
  Mail,
  Newspaper,
  ShieldCheck,
  Sparkles,
  Trophy,
  WalletCards,
} from "lucide-react";

import {
  getJarvisProduct,
  openJarvisBillingPortal,
  startJarvisCheckout,
  startSyncAssistantLiveCheckout,
  updateJarvisProduct,
} from "../api/jarvisProduct";

const GOALS = [
  ["ORGANIZE_DAY", "Organize my day", CalendarDays],
  ["HEALTH", "Health & fitness", Dumbbell],
  ["MONEY", "Money & bills", WalletCards],
  ["IMPORTANT_EMAIL", "Important email", Mail],
  ["FORGET_LESS", "Forget less", Sparkles],
];
const NEWS_TOPICS = ["Local", "Markets", "Politics", "Business", "Technology / AI", "Major national", "World"];

function Pill({ active, children, onClick }) {
  return <button type="button" onClick={onClick} className={`min-h-10 rounded-2xl border px-3 text-xs font-black ${active ? "border-cyan-300/50 bg-cyan-500/15 text-cyan-100" : "border-slate-800 bg-slate-950/70 text-slate-400"}`}>{children}</button>;
}

function Toggle({ checked, onChange, title, body, icon: Icon }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
      {Icon ? <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-900 text-cyan-200"><Icon className="h-5 w-5" /></span> : null}
      <span className="min-w-0 flex-1"><span className="block font-black text-white">{title}</span><span className="mt-1 block text-xs leading-5 text-slate-400">{body}</span></span>
      <input type="checkbox" checked={Boolean(checked)} onChange={onChange} className="mt-2 h-5 w-5" />
    </label>
  );
}

export default function SyncAssistantSetup() {
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [teamDraft, setTeamDraft] = useState("");

  useEffect(() => {
    getJarvisProduct().then((value) => {
      const timezone = value.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      const next = { ...value, timezone };
      setData(value);
      setDraft(next);
    }).catch((error) => setNotice(error?.response?.data?.detail || "SYNC Assistant setup could not load."));
  }, []);

  const goalSet = useMemo(() => new Set(draft?.goals || []), [draft?.goals]);
  const live = draft?.live || {};

  function patch(values) { setDraft((current) => ({ ...current, ...values })); }
  function patchLive(values) { setDraft((current) => ({ ...current, live: { ...(current?.live || {}), ...values } })); }

  async function save(extra = {}) {
    if (!draft) return null;
    setSaving(true); setNotice("");
    try {
      const payload = {
        assistant_name: draft.assistant_name || "SYNC",
        tone: draft.tone,
        briefing_length: draft.briefing_length,
        timezone: draft.timezone,
        wake_time: draft.wake_time,
        bedtime: draft.bedtime,
        quiet_hours_enabled: draft.quiet_hours_enabled,
        goals: draft.goals,
        modules: draft.modules,
        permissions: draft.permissions,
        home_location: draft.home_location,
        live: draft.live,
        onboarding_step: 5,
        onboarding_complete: true,
        ...extra,
      };
      const value = await updateJarvisProduct(payload);
      setData(value); setDraft(value); setNotice("SYNC Assistant preferences saved.");
      return value;
    } catch (error) {
      setNotice(error?.response?.data?.detail || "Could not save SYNC Assistant settings.");
      return null;
    } finally { setSaving(false); }
  }

  function useLocation() {
    if (!navigator.geolocation) { setNotice("Location is not available in this browser."); return; }
    setNotice("Requesting your location…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        patch({ home_location: { ...(draft.home_location || {}), label: draft.home_location?.label || "Home / current area", latitude: position.coords.latitude, longitude: position.coords.longitude } });
        setNotice("Location added. Save settings to use it for weather and leave-time calculations.");
      },
      () => setNotice("Location permission was not granted. You can enable it later."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  async function choosePlan(plan) {
    if (plan === "BASIC" || data?.billing?.test_access) { await save({ plan }); return; }
    setSaving(true);
    try { const result = await startJarvisCheckout(plan); if (result?.url) window.location.assign(result.url); }
    catch (error) { setNotice(error?.response?.data?.detail || "Checkout could not start."); }
    finally { setSaving(false); }
  }

  async function activateLive() {
    await save();
    setSaving(true);
    try {
      const result = await startSyncAssistantLiveCheckout();
      if (result?.url) window.location.assign(result.url);
      else if (result?.activated) { setData(result.profile); setDraft(result.profile); setNotice("SYNC Assistant Live is active for this testing account."); }
    } catch (error) { setNotice(error?.response?.data?.detail || "SYNC Assistant Live checkout could not start."); }
    finally { setSaving(false); }
  }

  function toggleTopic(topic) {
    const next = new Set(live.news_topics || []); next.has(topic) ? next.delete(topic) : next.add(topic); patchLive({ news_topics: [...next] });
  }
  function addTeam() {
    const name = teamDraft.trim(); if (!name) return;
    patchLive({ sports: [...(live.sports || []), { team: name }] }); setTeamDraft("");
  }

  if (!draft) return <div className="grid min-h-dvh place-items-center bg-[#020617] text-cyan-200"><LoaderCircle className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="min-h-dvh bg-[#020617] pb-20 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <button type="button" onClick={() => nav("/customer")} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-700 px-4 text-sm font-black"><ArrowLeft className="h-4 w-4" />Home</button>
          <div className="text-center"><div className="font-black text-white">SYNC Assistant</div><div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Your connected life assistant</div></div>
          <div className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-100">{data?.setup_score || 0}% ready</div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 pt-5">
        {notice ? <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100">{notice}</div> : null}

        <section className="rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,.12),transparent_35%),rgba(2,6,23,.75)] p-5 md:p-7">
          <div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Morning briefing</div>
          <h1 className="mt-2 text-3xl font-black text-white md:text-5xl">Teach SYNC what matters to you.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">SYNC Assistant combines your calendar, Health, Money, tasks, business and property activity into one prioritized briefing. Email intelligence is the next connection build.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <label className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4"><span className="text-xs font-black uppercase text-slate-500">Timezone</span><input value={draft.timezone || ""} onChange={(e) => patch({ timezone: e.target.value })} className="mt-2 w-full bg-transparent text-sm font-black text-white outline-none" /></label>
            <label className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4"><span className="text-xs font-black uppercase text-slate-500">Wake time</span><input type="time" value={draft.wake_time || "07:00"} onChange={(e) => patch({ wake_time: e.target.value })} className="mt-2 w-full bg-transparent text-lg font-black text-white" /></label>
            <label className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4"><span className="text-xs font-black uppercase text-slate-500">Bedtime</span><input type="time" value={draft.bedtime || "22:30"} onChange={(e) => patch({ bedtime: e.target.value })} className="mt-2 w-full bg-transparent text-lg font-black text-white" /></label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">{GOALS.map(([id, label, Icon]) => <Pill key={id} active={goalSet.has(id)} onClick={() => { const next = new Set(goalSet); next.has(id) ? next.delete(id) : next.add(id); patch({ goals: [...next] }); }}><Icon className="mr-1 inline h-4 w-4" />{label}</Pill>)}</div>
        </section>

        <section className="rounded-[2rem] border border-violet-400/20 bg-slate-950/70 p-5 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-violet-200">SYNC Assistant Live</div><h2 className="mt-1 text-2xl font-black text-white">Weather, travel, news & sports</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">$1/month. Personalize what is important enough to interrupt or appear in your briefing.</p></div><div className="rounded-2xl border border-violet-400/25 bg-violet-500/10 px-4 py-2 text-sm font-black text-violet-100">{data?.billing?.test_access ? "Included for testing" : "$1 / month"}</div></div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Toggle checked={live.weather_enabled} onChange={(e) => patchLive({ weather_enabled: e.target.checked })} title="Daily weather" body="Use weather in the morning brief and around scheduled events." icon={CloudSun} />
            <Toggle checked={live.weather_alerts} onChange={(e) => patchLive({ weather_alerts: e.target.checked })} title="Severe weather alerts" body="Prioritize active warnings that can affect your plans." icon={ShieldCheck} />
            <Toggle checked={live.travel_weather} onChange={(e) => patchLive({ travel_weather: e.target.checked })} title="Travel-aware updates" body="Use event location, drive time and traffic to recommend when to leave." icon={LocateFixed} />
            <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4"><div className="font-black text-white">Home / starting location</div><div className="mt-1 text-xs text-slate-400">Coordinates stay in your SYNC Assistant profile and are used for local weather and route calculations.</div><div className="mt-3 flex gap-2"><input value={draft.home_location?.label || ""} onChange={(e) => patch({ home_location: { ...(draft.home_location || {}), label: e.target.value } })} placeholder="Home or city label" className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /><button type="button" onClick={useLocation} className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3 text-xs font-black text-cyan-100">Use location</button></div></div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4"><div className="flex items-center gap-2 font-black text-white"><Newspaper className="h-5 w-5 text-cyan-200" />News importance</div><select value={live.news_mode || "MAJOR_ONLY"} onChange={(e) => patchLive({ news_mode: e.target.value })} className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"><option value="OFF">Off</option><option value="MAJOR_ONLY">Major events only</option><option value="PERSONALIZED">Personalized</option><option value="FULL">More complete briefing</option></select><div className="mt-3 flex flex-wrap gap-2">{NEWS_TOPICS.map((topic) => <Pill key={topic} active={(live.news_topics || []).includes(topic)} onClick={() => toggleTopic(topic)}>{topic}</Pill>)}</div></div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4"><div className="flex items-center gap-2 font-black text-white"><Trophy className="h-5 w-5 text-amber-200" />Sports teams to follow</div><div className="mt-2 text-xs text-slate-400">Add any team. Later SYNC will learn whether you want scores, schedules, standings, injuries, trades or recruiting.</div><div className="mt-3 flex gap-2"><input value={teamDraft} onChange={(e) => setTeamDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTeam(); } }} placeholder="Atlanta Braves, Alabama…" className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /><button type="button" onClick={addTeam} className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 text-xs font-black text-amber-100">Add</button></div><div className="mt-3 flex flex-wrap gap-2">{(live.sports || []).map((item, index) => <Pill key={`${item.team}-${index}`} active onClick={() => patchLive({ sports: live.sports.filter((_, i) => i !== index) })}>{item.team} ×</Pill>)}</div></div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4"><span className="text-xs font-black uppercase text-slate-500">Arrive early</span><div className="mt-2 flex items-center gap-2"><input type="number" min="0" max="240" value={live.arrival_buffer_minutes ?? 15} onChange={(e) => patchLive({ arrival_buffer_minutes: Number(e.target.value) })} className="w-24 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white" /><span className="text-sm text-slate-400">minutes</span></div></label><label className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4"><span className="text-xs font-black uppercase text-slate-500">Remind before leave time</span><div className="mt-2 flex items-center gap-2"><input type="number" min="0" max="240" value={live.departure_reminder_minutes ?? 10} onChange={(e) => patchLive({ departure_reminder_minutes: Number(e.target.value) })} className="w-24 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white" /><span className="text-sm text-slate-400">minutes</span></div></label></div>

          <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={() => save()} disabled={saving} className="min-h-11 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-5 text-sm font-black text-white">{saving ? "Saving…" : "Save preferences"}</button>{!live.access ? <button type="button" onClick={activateLive} disabled={saving} className="min-h-11 rounded-2xl border border-violet-300/30 bg-violet-500/10 px-5 text-sm font-black text-violet-100">{data?.billing?.test_access ? "Activate Live free" : "Add Live for $1/month"}</button> : <span className="inline-flex min-h-11 items-center rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 text-sm font-black text-emerald-100"><Check className="mr-2 h-4 w-4" />Live active</span>}</div>
        </section>

        <section className="rounded-[2rem] border border-slate-800 bg-slate-950/65 p-5 md:p-7"><div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Assistant plan</div><h2 className="mt-1 text-2xl font-black text-white">Choose the depth of assistance</h2>{data?.billing?.test_access ? <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">Full testing access is active on this account. No checkout is required.</div> : null}<div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">{(data?.plans || []).map((plan) => <button key={plan.id} type="button" onClick={() => choosePlan(plan.id)} className={`rounded-3xl border p-4 text-left ${data?.plan === plan.id ? "border-cyan-300/40 bg-cyan-500/10" : "border-slate-800 bg-slate-950/60"}`}><div className="font-black text-white">{plan.name}</div><div className="mt-1 text-2xl font-black text-cyan-100">{plan.price ? `$${plan.price}/mo` : "Free"}</div><div className="mt-2 text-xs leading-5 text-slate-400">{plan.description}</div></button>)}</div>{data?.billing?.stripe_customer_ready ? <button type="button" onClick={async () => { const result = await openJarvisBillingPortal(); if (result?.url) window.location.assign(result.url); }} className="mt-4 text-xs font-black text-slate-400 underline">Manage billing</button> : null}</section>
      </main>
    </div>
  );
}
