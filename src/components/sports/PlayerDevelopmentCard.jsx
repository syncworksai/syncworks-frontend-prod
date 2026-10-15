import React, { useEffect, useState } from "react";
import { Loader2, Target, TrendingUp } from "lucide-react";

import { getCoachBox } from "../../api/wayAnalytics";

const fmtRate = (value) => value == null ? "—" : Number(value).toFixed(3).replace(/^0(?=\.)/, "");
const fmtRuns = (value) => Number(value || 0).toFixed(2);

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

  return <section className="mx-auto max-w-6xl overflow-hidden rounded-[1.4rem] border border-cyan-300/18 bg-[radial-gradient(circle_at_100%_0%,rgba(34,211,238,.11),transparent_32%),linear-gradient(145deg,#07111f,#040a12)] p-3.5 text-white shadow-[0_14px_40px_rgba(0,0,0,.24)] sm:p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0"><div className="text-[8px] font-black uppercase tracking-[.17em] text-cyan-300">Your player profile</div><h2 className="mt-1 text-base font-black">Role & Development</h2><p className="mt-1 text-[9px] leading-4 text-slate-500">The question isn’t only whether you got a hit. Where do you help us most, and what improvement makes the team better?</p></div>
      <Target className="h-5 w-5 shrink-0 text-cyan-200" />
    </div>

    <div className="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/[.055] p-3">
      <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[8px] font-black uppercase tracking-wide text-amber-100">Best fit · {row.effective_slots}</span><b className="text-sm text-white">{row.effective_role}</b></div>
      <p className="mt-1.5 text-[9px] leading-4 text-slate-400">{row.role_reason}</p>
    </div>

    <div className="mt-2 grid grid-cols-3 gap-1.5">
      <div className="rounded-xl border border-white/8 bg-black/20 p-2 text-center"><div className="text-[7px] font-black uppercase tracking-wide text-slate-600">AVG</div><div className="mt-1 text-sm font-black text-white">{fmtRate(row.season_batting?.avg)}</div></div>
      <div className="rounded-xl border border-white/8 bg-black/20 p-2 text-center"><div className="text-[7px] font-black uppercase tracking-wide text-slate-600">SIT+</div><div className="mt-1 text-sm font-black text-white">{row.situational_index == null ? "—" : Number(row.situational_index).toFixed(1)}</div></div>
      <div className="rounded-xl border border-white/8 bg-black/20 p-2 text-center"><div className="text-[7px] font-black uppercase tracking-wide text-slate-600">EXE</div><div className="mt-1 text-sm font-black text-white">{fmtRate(row.execution_average)}</div></div>
    </div>

    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[.05] p-3"><div className="text-[7px] font-black uppercase tracking-[.14em] text-emerald-300">What you already give us</div><div className="mt-1 text-xs font-black text-white">{row.strength?.label || "Keep building the sample"}</div>{row.strength?.value != null ? <div className="mt-1 text-sm font-black text-emerald-100">{fmtRate(row.strength.value)}</div> : null}</div>
      <div className="rounded-xl border border-violet-300/15 bg-violet-300/[.05] p-3"><div className="text-[7px] font-black uppercase tracking-[.14em] text-violet-300">Next lever</div><div className="mt-1 text-xs font-black text-white">{focus.label || "Keep building the sample"}</div>{focus.current != null ? <div className="mt-1 text-[9px] text-slate-400">{fmtRate(focus.current)} → target {fmtRate(focus.target)}</div> : null}</div>
    </div>

    <div className="mt-2 rounded-xl border border-white/10 bg-white/[.025] p-3"><div className="text-[7px] font-black uppercase tracking-[.14em] text-slate-500">What to do</div><p className="mt-1 text-[10px] leading-5 text-slate-300">{focus.action || "Keep executing the situation, protect our outs, and pass the torch."}</p></div>

    <div className="mt-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[.05] p-3"><div className="flex items-center gap-1 text-[7px] font-black uppercase tracking-[.14em] text-cyan-300"><TrendingUp className="h-3 w-3" />If this improves</div><div className="mt-1 text-sm font-black text-white">+{fmtRuns(focus.projected_runs_per_game_low)}–{fmtRuns(focus.projected_runs_per_game_high)} team runs / game</div><div className="mt-1 text-[8px] leading-4 text-slate-500">Modeled range, not a guarantee. It uses your opportunities and the team benchmark to estimate how much that improvement could help team scoring.</div></div>
  </section>;
}
