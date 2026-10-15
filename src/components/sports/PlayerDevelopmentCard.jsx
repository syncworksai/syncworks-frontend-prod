import React, { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Target, TrendingDown, TrendingUp } from "lucide-react";

import { getCoachBox } from "../../api/wayAnalytics";

const fmtRate = (value) => value == null ? "—" : Number(value).toFixed(3).replace(/^0(?=\.)/, "");
const fmtRuns = (value) => Number(value || 0).toFixed(2);

function BandBadge({ band }) {
  const key = band?.key || "LOWER";
  const tones = {
    TOP: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
    MIDDLE: "border-amber-300/25 bg-amber-300/10 text-amber-100",
    LOWER: "border-violet-300/25 bg-violet-300/10 text-violet-100",
  };
  return <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[.13em] ${tones[key] || tones.LOWER}`}>{band?.label || "Lineup role"}</span>;
}

export default function PlayerDevelopmentCard({ team }) {
  const teamId = Number(team?.id || 0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;
    let alive = true;
    setLoading(true);
    getCoachBox(teamId)
      .then((payload) => { if (alive) setData(payload); })
      .catch(() => { if (alive) setData(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [teamId]);

  if (!teamId) return null;
  if (loading) return <section className="mx-auto max-w-6xl rounded-[1.35rem] border border-cyan-300/12 bg-[#07111f]/95 p-3.5 text-slate-400"><div className="flex items-center gap-2 text-[10px]"><Loader2 className="h-4 w-4 animate-spin text-cyan-300" />Loading your role & development plan…</div></section>;

  const row = Array.isArray(data?.rows) ? data.rows[0] : null;
  if (!row) return null;
  const focus = row.focus || {};
  const downside = row.downside || null;
  const distinctions = data?.metric_distinction || {};

  return <section className="mx-auto max-w-6xl overflow-hidden rounded-[1.4rem] border border-cyan-300/18 bg-[radial-gradient(circle_at_100%_0%,rgba(34,211,238,.11),transparent_32%),linear-gradient(145deg,#07111f,#040a12)] p-3.5 text-white shadow-[0_14px_40px_rgba(0,0,0,.24)] sm:p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0"><div className="text-[8px] font-black uppercase tracking-[.17em] text-cyan-300">Your player profile</div><h2 className="mt-1 text-base font-black">Role & Development</h2><p className="mt-1 text-[9px] leading-4 text-slate-500">Where you help us, what to improve next, and how that change affects the team.</p></div>
      <Target className="h-5 w-5 shrink-0 text-cyan-200" />
    </div>

    <div className="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/[.055] p-3">
      <div className="flex flex-wrap items-center gap-2"><BandBadge band={row.lineup_band} />{row.suggested_slot ? <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[8px] font-black text-slate-300">Model slot #{row.suggested_slot}</span> : null}</div>
      <div className="mt-2 text-sm font-black text-white">{row.effective_role}</div>
      <p className="mt-1.5 text-[9px] leading-4 text-slate-400">{row.role_reason}</p>
    </div>

    <div className="mt-2 grid grid-cols-3 gap-1.5">
      <div className="rounded-xl border border-white/8 bg-black/20 p-2 text-center"><div className="text-[7px] font-black uppercase tracking-wide text-slate-600">AVG</div><div className="mt-1 text-sm font-black text-white">{fmtRate(row.season_batting?.avg)}</div></div>
      <div className="rounded-xl border border-violet-300/12 bg-violet-300/[.035] p-2 text-center"><div className="text-[7px] font-black uppercase tracking-wide text-violet-300">SIT+</div><div className="mt-1 text-sm font-black text-white">{row.situational_index == null ? "—" : Number(row.situational_index).toFixed(1)}</div><div className="mt-1 text-[6px] text-slate-600">situational hitting</div></div>
      <div className="rounded-xl border border-emerald-300/12 bg-emerald-300/[.035] p-2 text-center"><div className="text-[7px] font-black uppercase tracking-wide text-emerald-300">EXE</div><div className="mt-1 text-sm font-black text-white">{fmtRate(row.execution_average)}</div><div className="mt-1 text-[6px] text-slate-600">team-value action</div></div>
    </div>

    <div className="mt-2 rounded-xl border border-white/8 bg-black/15 p-2.5 text-[8px] leading-4 text-slate-500">
      <b className="text-violet-200">SIT+</b> = {distinctions.sit_plus || "situational hitting effectiveness."} <b className="ml-1 text-emerald-200">EXE</b> = {distinctions.execution || "did your total action make the team better?"} <b className="ml-1 text-amber-200">QAB</b> = {distinctions.qab || "coach eye-test of at-bat quality, tracked going forward."}
    </div>

    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[.05] p-3"><div className="text-[7px] font-black uppercase tracking-[.14em] text-emerald-300">What you already give us</div><div className="mt-1 text-xs font-black text-white">{row.strength?.label || "Keep building the sample"}</div>{row.strength?.value != null ? <div className="mt-1 text-sm font-black text-emerald-100">{fmtRate(row.strength.value)}</div> : null}{row.strength?.baseline != null ? <div className="mt-1 text-[8px] text-slate-500">Team benchmark {fmtRate(row.strength.baseline)}</div> : null}</div>
      <div className="rounded-xl border border-violet-300/15 bg-violet-300/[.05] p-3"><div className="text-[7px] font-black uppercase tracking-[.14em] text-violet-300">What to improve</div><div className="mt-1 text-xs font-black text-white">{focus.label || "Keep building the sample"}</div>{focus.current != null ? <div className="mt-1 text-[9px] text-slate-400">{fmtRate(focus.current)} → target {fmtRate(focus.target)}</div> : null}</div>
    </div>

    <div className="mt-2 rounded-xl border border-white/10 bg-white/[.025] p-3"><div className="text-[7px] font-black uppercase tracking-[.14em] text-slate-500">What to do</div><p className="mt-1 text-[10px] leading-5 text-slate-300">{focus.action || "Keep executing the situation, protect our outs, and pass the torch."}</p></div>

    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[.05] p-3"><div className="flex items-center gap-1 text-[7px] font-black uppercase tracking-[.14em] text-cyan-300"><TrendingUp className="h-3 w-3" />If this improves</div><div className="mt-1 text-sm font-black text-white">+{fmtRuns(focus.projected_runs_per_game_low)}–{fmtRuns(focus.projected_runs_per_game_high)} team runs/game</div><div className="mt-1 text-[9px] leading-4 text-slate-400">About <b className="text-cyan-100">+{Number(focus.projected_events_per_10_games || 0).toFixed(1)}</b> additional {focus.event_label || "successful opportunities"} per 10 games.</div></div>
      <div className="rounded-xl border border-rose-300/15 bg-rose-300/[.045] p-3"><div className="flex items-center gap-1 text-[7px] font-black uppercase tracking-[.14em] text-rose-300"><TrendingDown className="h-3 w-3" />If your strength slips .050</div>{downside ? <><div className="mt-1 text-sm font-black text-white">−{fmtRuns(downside.projected_runs_lost_per_game_low)}–{fmtRuns(downside.projected_runs_lost_per_game_high)} team runs/game</div><div className="mt-1 text-[9px] leading-4 text-slate-400">~{Number(downside.lost_events_per_10_games || 0).toFixed(1)} fewer {downside.event_label || "successful opportunities"} per 10 games.</div></> : <div className="mt-1 text-[9px] text-slate-500">Need more sample before modeling downside.</div>}</div>
    </div>

    <div className="mt-2 rounded-xl border border-amber-300/12 bg-amber-300/[.035] p-3"><div className="flex items-center gap-1 text-[7px] font-black uppercase tracking-[.14em] text-amber-300"><AlertTriangle className="h-3 w-3" />Player takeaway</div><p className="mt-1 text-[10px] leading-5 text-slate-300">{row.player_message}</p></div>
    <div className="mt-2 text-[8px] leading-4 text-slate-600">Run/rally impact is a directional model, not a promise. It gets stronger as Game Book captures more games and QAB is graded prospectively.</div>
  </section>;
}