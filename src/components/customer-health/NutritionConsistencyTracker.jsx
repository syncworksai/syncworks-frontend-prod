import React, { useMemo } from "react";

function todayYmd() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function evaluateDay(day, calorieGoal, proteinGoal) {
  const today = todayYmd();
  const isToday = day?.ymd === today;
  const count = Number(day?.count || 0);
  const calories = Number(day?.calories || 0);
  const protein = Number(day?.protein || 0);

  if (!calorieGoal || !proteinGoal) {
    return { key: "setup", label: "Targets needed", tone: "slate", met: false };
  }

  if (!count) {
    return isToday
      ? { key: "today", label: "Not logged yet", tone: "cyan", met: false }
      : { key: "unlogged", label: "No log", tone: "slate", met: false };
  }

  const caloriePct = calories / calorieGoal;
  const proteinPct = protein / proteinGoal;
  const goalMet = caloriePct >= 0.9 && caloriePct <= 1.05 && proteinPct >= 0.9;
  const close = caloriePct >= 0.8 && caloriePct <= 1.1 && proteinPct >= 0.75;

  if (goalMet) return { key: "met", label: isToday ? "Goal met today" : "Goal met", tone: "emerald", met: true };
  if (isToday) return { key: "progress", label: "In progress", tone: "amber", met: false };
  if (close) return { key: "close", label: "Close", tone: "orange", met: false };
  return { key: "missed", label: "Goal missed", tone: "rose", met: false };
}

const tones = {
  emerald: "border-emerald-300/25 bg-emerald-500/10 text-emerald-200",
  orange: "border-orange-300/25 bg-orange-500/10 text-orange-200",
  amber: "border-amber-300/25 bg-amber-500/10 text-amber-200",
  rose: "border-rose-300/25 bg-rose-500/10 text-rose-200",
  cyan: "border-cyan-300/25 bg-cyan-500/10 text-cyan-200",
  slate: "border-white/10 bg-white/[0.035] text-slate-400",
};

export default function NutritionConsistencyTracker({ days = [], calorieGoal = 0, proteinGoal = 0, onSelectDay }) {
  const evaluated = useMemo(
    () => days.map((day) => ({ ...day, evaluation: evaluateDay(day, calorieGoal, proteinGoal) })),
    [days, calorieGoal, proteinGoal]
  );

  const summary = useMemo(() => {
    const today = todayYmd();
    const completedDays = evaluated.filter((day) => day.ymd < today);
    const goalDays = completedDays.filter((day) => day.evaluation.met).length;
    const loggedDays = completedDays.filter((day) => Number(day.count || 0) > 0).length;
    const missedGoalDays = completedDays.filter((day) => day.evaluation.key === "missed" || day.evaluation.key === "close").length;
    const unloggedDays = completedDays.filter((day) => day.evaluation.key === "unlogged").length;
    const adherence = completedDays.length ? Math.round((goalDays / completedDays.length) * 100) : 0;

    let streak = 0;
    for (let index = evaluated.length - 1; index >= 0; index -= 1) {
      const day = evaluated[index];
      if (day.ymd === today && !day.evaluation.met) continue;
      if (!day.evaluation.met) break;
      streak += 1;
    }

    return { goalDays, loggedDays, missedGoalDays, unloggedDays, adherence, streak, completedDays: completedDays.length };
  }, [evaluated]);

  return (
    <section className="rounded-[1.5rem] border border-fuchsia-300/15 bg-fuchsia-500/[0.035] p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-fuchsia-200">Nutrition consistency</div>
          <div className="mt-1 text-sm font-black text-white">Daily + weekly goal tracker</div>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">A goal day requires calories within 90–105% of target and protein at least 90% of target. Today stays in progress until the goal is reached.</p>
        </div>
        <div className="rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-right">
          <div className="text-[8px] font-black uppercase tracking-wider text-emerald-200">7-day consistency</div>
          <div className="mt-0.5 text-xl font-black text-white">{summary.adherence}%</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        <div className="rounded-xl bg-black/20 p-2"><div className="text-[8px] uppercase text-slate-500">Goal days</div><div className="mt-1 text-lg font-black text-emerald-300">{summary.goalDays}</div></div>
        <div className="rounded-xl bg-black/20 p-2"><div className="text-[8px] uppercase text-slate-500">Streak</div><div className="mt-1 text-lg font-black text-cyan-300">{summary.streak}</div></div>
        <div className="rounded-xl bg-black/20 p-2"><div className="text-[8px] uppercase text-slate-500">Missed goal</div><div className="mt-1 text-lg font-black text-rose-300">{summary.missedGoalDays}</div></div>
        <div className="rounded-xl bg-black/20 p-2"><div className="text-[8px] uppercase text-slate-500">No log</div><div className="mt-1 text-lg font-black text-slate-300">{summary.unloggedDays}</div></div>
      </div>

      <div className="mt-3 space-y-2">
        {evaluated.map((day) => (
          <button key={day.ymd} type="button" onClick={() => onSelectDay?.(day.ymd)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/20 px-3 py-2 text-left">
            <div className="min-w-0"><div className="text-[11px] font-bold text-slate-200">{day.ymd}</div><div className="mt-0.5 text-[9px] text-slate-500">{day.count} meal{Number(day.count) === 1 ? "" : "s"} · {Math.round(day.calories || 0)} cal · {Math.round(day.protein || 0)}g protein</div></div>
            <span className={`shrink-0 rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-wider ${tones[day.evaluation.tone]}`}>{day.evaluation.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-2 text-[9px] leading-4 text-slate-500">Past days with no meal logs stay explicitly marked “No log” rather than being treated as zero calories. Goal consistency uses completed calendar days in this 7-day window.</div>
    </section>
  );
}
