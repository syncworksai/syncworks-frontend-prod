import React, { useMemo } from "react";

function shortDay(ymd) {
  if (!ymd) return "—";
  const date = new Date(`${ymd}T12:00:00`);
  return Number.isNaN(date.getTime()) ? ymd : date.toLocaleDateString(undefined, { weekday: "short" });
}

export default function WorkoutConsistencyCard({ weekPlan = [], dayKey, onOpenPlan }) {
  const summary = useMemo(() => {
    const scheduled = (Array.isArray(weekPlan) ? weekPlan : []).filter((item) => item?.workout_name);
    const elapsed = scheduled.filter((item) => String(item?.ymd || "") <= dayKey && item?.status !== "Rescheduled");
    const completed = elapsed.filter((item) => item?.status === "Completed");
    const missed = elapsed.filter((item) => String(item?.ymd || "") < dayKey && !["Completed", "Rescheduled"].includes(item?.status));
    const consistency = elapsed.length ? Math.round((completed.length / elapsed.length) * 100) : 0;
    return { scheduled, elapsed, completed, missed, consistency };
  }, [weekPlan, dayKey]);

  const latestMissed = summary.missed[summary.missed.length - 1];

  return (
    <section className={`rounded-[1.75rem] border p-4 ${summary.missed.length ? "border-rose-300/20 bg-rose-500/[0.05]" : "border-emerald-300/15 bg-emerald-500/[0.035]"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`text-[9px] font-black uppercase tracking-[.18em] ${summary.missed.length ? "text-rose-200" : "text-emerald-200"}`}>Workout consistency</div>
          <div className="mt-1 text-base font-black text-white">{summary.missed.length ? `${summary.missed.length} missed planned day${summary.missed.length === 1 ? "" : "s"}` : "No missed planned days"}</div>
          {latestMissed ? <div className="mt-1 text-[10px] leading-4 text-slate-400">Latest: {latestMissed.ymd} · {latestMissed.workout_name}. Open the plan to complete, skip or reschedule it.</div> : <div className="mt-1 text-[10px] text-slate-500">Past scheduled sessions are checked automatically against completion status.</div>}
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-right"><div className="text-[8px] uppercase text-slate-500">Consistency</div><div className="text-xl font-black text-white">{summary.consistency}%</div></div>
      </div>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {summary.scheduled.map((item) => {
          const past = String(item?.ymd || "") < dayKey;
          const completed = item?.status === "Completed";
          const rescheduled = item?.status === "Rescheduled";
          const missed = past && !completed && !rescheduled;
          const tone = completed
            ? "border-emerald-300/25 bg-emerald-500/10 text-emerald-200"
            : missed
              ? "border-rose-300/25 bg-rose-500/10 text-rose-200"
              : rescheduled
                ? "border-cyan-300/20 bg-cyan-500/10 text-cyan-200"
                : "border-white/10 bg-white/[0.035] text-slate-400";
          return <div key={item.id || `${item.ymd}-${item.workout_name}`} className={`min-w-[62px] rounded-xl border px-2 py-2 text-center ${tone}`}><div className="text-[8px] font-black uppercase">{shortDay(item.ymd)}</div><div className="mt-1 text-[8px] font-bold">{completed ? "Done" : missed ? "Missed" : rescheduled ? "Moved" : item.ymd === dayKey ? "Today" : "Planned"}</div></div>;
        })}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-black/20 p-2"><div className="text-[8px] text-slate-500">Completed</div><div className="mt-1 text-lg font-black text-emerald-300">{summary.completed.length}</div></div>
        <div className="rounded-xl bg-black/20 p-2"><div className="text-[8px] text-slate-500">Missed</div><div className="mt-1 text-lg font-black text-rose-300">{summary.missed.length}</div></div>
        <div className="rounded-xl bg-black/20 p-2"><div className="text-[8px] text-slate-500">Planned</div><div className="mt-1 text-lg font-black text-cyan-300">{summary.scheduled.length}</div></div>
      </div>

      <button type="button" onClick={onOpenPlan} className="mt-3 min-h-10 w-full rounded-xl border border-blue-300/20 bg-blue-500/10 text-[10px] font-black text-blue-200">Open workout calendar</button>
    </section>
  );
}
