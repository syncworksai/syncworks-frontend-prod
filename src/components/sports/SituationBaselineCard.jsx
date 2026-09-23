import React from "react";
import { Activity, ArrowRight, ClipboardList, Target, TrendingUp } from "lucide-react";

const buckets = [
  ["0_OUTS", "No outs"], ["1_OUT", "One out"], ["2_OUTS", "Two outs"],
  ["RISP", "Runners in scoring position"], ["RUNNER_ON", "Any runner on"],
];
const percent = (value) => value==null ? "—" : `${(Number(value)*100).toFixed(0)}%`;
const avg = (value) => value==null ? "—" : Number(value).toFixed(3).replace(/^0(?=\.)/, "");

export default function SituationBaselineCard({ data, loading = false, title = "Situation lab · game baseline" }) {
  const tracked = Number(data?.tracked_appearances || 0);
  return <section className="rounded-[1.4rem] border border-violet-300/20 bg-[linear-gradient(145deg,rgba(139,92,246,.1),rgba(4,10,21,.95))] p-3.5">
    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-violet-200"><Target className="h-4 w-4"/>{title}</div>
    <h3 className="mt-1 text-base font-black text-white">Turn practice into game situations</h3>
    <p className="mt-1 text-[10px] leading-4 text-slate-400">Live-game baseline only. Batting practice must be tracked separately so practice hits never inflate official AVG.</p>
    {loading ? <div className="mt-3 text-[10px] text-cyan-200">Loading game situations…</div> :
      tracked ? <div className="mt-3">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
          {buckets.map(([key,label])=>{
            const row = data.splits?.[key] || {};
            return <div key={key} className="rounded-xl border border-white/10 bg-black/15 p-2">
              <div className="min-h-6 text-[8px] font-black uppercase text-slate-400">{label}</div>
              <div className="mt-1 text-lg font-black text-cyan-200">{avg(row.avg)}</div>
              <div className="text-[9px] text-slate-500">{row.h||0} H / {row.ab||0} AB</div>
              {row.sample_small?<div className="mt-1 text-[8px] text-amber-200">Small sample</div>:null}
            </div>;
          })}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {[["MOVE_RUNNER","Move the runner"],["SAC_FLY","Sacrifice fly"]].map(([key,label])=>{
            const row=data.objectives?.[key]||{};
            return <div key={key} className="rounded-xl border border-emerald-300/15 bg-emerald-300/[.04] p-2">
              <div className="text-[8px] font-black uppercase text-emerald-200">{label}</div>
              <div className="mt-1 text-lg font-black text-white">{percent(row.rate)}</div>
              <div className="text-[9px] text-slate-500">{row.successes||0}/{row.attempts||0} chances</div>
            </div>;
          })}
        </div>
        <p className="mt-2 text-[9px] text-slate-500">{tracked} recorded situations · {data.excluded_missing_outs_context||0} earlier plays excluded because pre-pitch outs weren't recorded.</p>
      </div> : <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/[.05] p-3">
        <b className="text-[11px] text-amber-100">Situational sample starts with your next scored game</b>
        <p className="mt-1 text-[10px] leading-4 text-slate-400">New Game Book entries capture outs and occupied bases before contact. Historical plays without verified pre-pitch context are not guessed.</p>
      </div>
    }
    <div className="mt-3 grid grid-cols-3 gap-1.5">
      {[["Two-out approach","Hit / AB with two outs",Activity],["Productive outs","Advance or score",ArrowRight],["RISP drills","Drive in the runner",TrendingUp]].map(([label,note,Icon])=>
        <div key={label} className="rounded-xl border border-violet-300/15 bg-black/15 p-2"><Icon className="h-4 w-4 text-violet-300"/><b className="mt-1 block text-[9px] text-white">{label}</b><span className="block text-[8px] text-slate-500">{note}</span></div>
      )}
    </div>
    <p className="mt-2 text-[9px] text-slate-500"><ClipboardList className="mr-1 inline h-3 w-3"/>BP practice-session scoring is the next separate module; this card only uses recorded real-game evidence.</p>
  </section>;
}
