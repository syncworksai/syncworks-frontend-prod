// src/components/customer-health/HealthPremiumHome.jsx
import React, { useMemo } from "react";

function safeNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function todayYmd() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function findTodayWorkout(weekPlan = []) {
  return (Array.isArray(weekPlan) ? weekPlan : []).find(
    (item) =>
      item?.ymd === todayYmd() &&
      item?.workout_name &&
      item?.status !== "Completed"
  );
}

function findNextWorkout(weekPlan = []) {
  const now = new Date().setHours(0, 0, 0, 0);
  return [...(Array.isArray(weekPlan) ? weekPlan : [])]
    .filter((item) => item?.workout_name && !["Completed", "Skipped"].includes(item?.status))
    .map((item) => ({ ...item, timeValue: new Date(`${item.ymd || "2099-01-01"}T12:00:00`).getTime() }))
    .filter((item) => Number.isFinite(item.timeValue) && item.timeValue >= now)
    .sort((a, b) => a.timeValue - b.timeValue)[0];
}

function firstName(profile) {
  return String(profile?.first_name || profile?.name || "").trim();
}

function readinessValue(snapshot) {
  const raw = snapshot?.readiness_score ?? snapshot?.readiness ?? snapshot?.daily_readiness;
  if (typeof raw === "number") return Math.max(0, Math.min(100, Math.round(raw)));
  const text = String(raw || "").toLowerCase();
  if (text.includes("ready") || text.includes("high")) return 88;
  if (text.includes("good")) return 74;
  if (text.includes("low")) return 46;
  return 0;
}

function totalSets(workout) {
  if (!workout) return 0;
  if (Array.isArray(workout.exercises)) {
    return workout.exercises.reduce((sum, exercise) => sum + safeNumber(exercise?.sets || exercise?.planned_sets, 0), 0);
  }
  return safeNumber(workout.total_sets || workout.sets, 0);
}

function QuickLogButton({ label, icon, onClick, active = false }) {
  return (
    <button type="button" onClick={onClick} className={`group flex min-w-[72px] flex-1 flex-col items-center gap-2 rounded-2xl border px-2 py-3 transition active:scale-[0.98] ${active ? "border-emerald-300/55 bg-emerald-300/[0.09] text-emerald-200 shadow-[0_0_22px_rgba(0,245,106,0.14)]" : "border-white/10 bg-white/[0.025] text-slate-400 hover:border-emerald-300/25 hover:text-white"}`}>
      <span className={`flex h-11 w-11 items-center justify-center rounded-[1rem] border text-xl ${active ? "border-emerald-300/45 bg-emerald-300/[0.08]" : "border-white/10 bg-black/25"}`}>{icon}</span>
      <span className="text-[9px] font-black uppercase tracking-[0.1em]">{label}</span>
    </button>
  );
}

function MetricCard({ eyebrow, value, detail, progress, action, onClick, compact = false }) {
  return (
    <section className="relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-[linear-gradient(145deg,rgba(17,24,20,0.97),rgba(4,7,5,0.99))] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.3)]">
      <div className="absolute right-4 top-0 h-px w-16 bg-gradient-to-r from-transparent via-emerald-300 to-transparent" />
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">{eyebrow}</div>
      <div className={`mt-2 font-black tracking-tight text-white ${compact ? "text-3xl" : "text-4xl"}`}>{value}</div>
      <div className="mt-1 text-xs leading-5 text-slate-400">{detail}</div>
      {typeof progress === "number" ? (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-300 shadow-[0_0_14px_rgba(0,245,106,0.4)]" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
        </div>
      ) : null}
      {action ? (
        <button type="button" onClick={onClick} className="mt-4 flex h-11 w-full items-center justify-between rounded-xl border border-white/10 bg-black/25 px-4 text-sm font-black text-white hover:border-emerald-300/35">
          <span>{action}</span><span aria-hidden="true">â†’</span>
        </button>
      ) : null}
    </section>
  );
}

export default function HealthPremiumHome({
  profile,
  snapshot,
  history,
  onOpen,
  onStartWorkout,
  onShowInsights,
  onQuickLog,
  onEditDailyGoals,
}) {
  const todayWorkout = useMemo(() => findTodayWorkout(snapshot?.week_plan), [snapshot?.week_plan]);
  const nextWorkout = useMemo(() => findNextWorkout(snapshot?.week_plan), [snapshot?.week_plan]);
  const workout = todayWorkout || nextWorkout;

  const readiness = readinessValue(snapshot);
  const protein = safeNumber(snapshot?.protein_today || snapshot?.protein, 0);
  const proteinGoal = safeNumber(snapshot?.protein_goal || profile?.protein_goal, 136);
  const proteinRemaining = Math.max(0, proteinGoal - protein);
  const sleep = safeNumber(snapshot?.last_sleep_hours || snapshot?.sleep_hours, 0);
  const sleepGoal = safeNumber(profile?.sleep_goal_hours || snapshot?.sleep_goal_hours, 7.5);
  const steps = safeNumber(snapshot?.steps, 0);
  const stepsGoal = safeNumber(profile?.step_goal || snapshot?.step_goal, 10000);
  const name = firstName(profile);
  const exerciseCount = Array.isArray(workout?.exercises) ? workout.exercises.length : safeNumber(workout?.exercise_count, 0);
  const setCount = totalSets(workout);
  const duration = safeNumber(workout?.duration_minutes || workout?.requested_duration_minutes, 45);

  const insight = history?.length
    ? "Your recent training history is ready for SYNC to review. Use Progress to see trends and your next best move."
    : "Complete your first guided workout to unlock strength, consistency, volume, and recovery insights.";

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[2rem] border border-emerald-300/18 bg-[radial-gradient(circle_at_88%_20%,rgba(0,245,106,0.14),transparent_28%),linear-gradient(145deg,#0d130f,#020403_72%)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.42)] sm:p-7">
        <div className="pointer-events-none absolute -right-8 top-4 h-52 w-52 rounded-full border border-emerald-300/10 bg-[radial-gradient(circle,rgba(0,245,106,0.08),transparent_65%)]" />
        <div className="relative max-w-2xl">
          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-300">SYNC FITNESS COACH</div>
          <h1 className="mt-4 text-4xl font-black uppercase leading-[0.95] tracking-[-0.04em] text-white sm:text-6xl">
            Ready to <span className="block text-emerald-400">level up?</span>
          </h1>
          <p className="mt-4 text-sm text-slate-400 sm:text-base">What is the plan today{name ? `, ${name}` : ""}?</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => onOpen?.("coach-chat")} className="h-12 rounded-2xl border border-emerald-300/45 bg-emerald-300/[0.08] px-5 text-sm font-black text-emerald-100 shadow-[0_0_28px_rgba(0,245,106,0.15)]">Talk to SYNC</button>
            <button type="button" onClick={onShowInsights} className="h-12 rounded-2xl border border-white/10 bg-white/[0.03] px-5 text-sm font-black text-white">View Progress</button>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(145deg,rgba(16,22,18,0.97),rgba(4,7,5,0.98))] p-4">
        <div className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Daily Quick Log</div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <QuickLogButton label="Workout" icon="âš¡" active onClick={() => workout ? onStartWorkout?.(workout) : onOpen?.("plan-today")} />
          <QuickLogButton label="Nutrition" icon="â—«" onClick={() => onQuickLog?.("meal")} />
          <QuickLogButton label="Steps" icon="â†—" onClick={() => onQuickLog?.("steps")} />
          <QuickLogButton label="Sleep" icon="â—”" onClick={() => onQuickLog?.("sleep")} />
          <QuickLogButton label="Weight" icon="â—‡" onClick={() => onQuickLog?.("weight")} />
          <QuickLogButton label="Mood" icon="â˜º" onClick={() => onQuickLog?.("readiness")} />
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[1.85rem] border border-emerald-300/20 bg-[radial-gradient(circle_at_90%_30%,rgba(0,245,106,0.11),transparent_30%),linear-gradient(145deg,#101713,#040705)] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.34)] sm:p-6">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Today's Workout</div>
        <div className="mt-2 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">{workout?.workout_name || "Build Today's Plan"}</div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div><div className="text-3xl font-black text-white">{exerciseCount || "-"}</div><div className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">Exercises</div></div>
          <div><div className="text-3xl font-black text-white">{setCount || "-"}</div><div className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">Sets</div></div>
          <div><div className="text-3xl font-black text-white">{duration}</div><div className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">Min Est.</div></div>
        </div>
        <button type="button" onClick={() => workout ? onStartWorkout?.(workout) : onOpen?.("plan-today")} className="mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-emerald-300/60 bg-emerald-400 text-base font-black uppercase tracking-[0.12em] text-[#021408] shadow-[0_0_32px_rgba(0,245,106,0.22)]">
          {workout ? "Start Workout" : "Build Workout"}<span aria-hidden="true">â–¶</span>
        </button>
      </section>

      <section className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(145deg,rgba(16,22,18,0.97),rgba(4,7,5,0.98))] p-5">
        <div className="grid gap-5 md:grid-cols-[180px_1fr] md:items-center">
          <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-full border-[10px] border-white/[0.06] bg-black/25 shadow-[inset_0_0_30px_rgba(0,0,0,0.65)]">
            <div className="flex h-28 w-28 items-center justify-center rounded-full border-[8px] border-emerald-400 text-3xl font-black text-white shadow-[0_0_24px_rgba(0,245,106,0.25)]">{readiness ? `${readiness}%` : "--"}</div>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Readiness Check</div>
            <div className="mt-3 space-y-3">
              <div><div className="flex justify-between text-xs font-black uppercase tracking-[0.1em] text-slate-300"><span>Soreness</span><span>{snapshot?.soreness || "Not logged"}</span></div><div className="mt-2 h-1.5 rounded-full bg-white/[0.07]"><div className="h-full w-[35%] rounded-full bg-emerald-400" /></div></div>
              <div><div className="flex justify-between text-xs font-black uppercase tracking-[0.1em] text-slate-300"><span>Sleep</span><span>{sleep ? `${sleep}h` : "Not logged"}</span></div><div className="mt-2 h-1.5 rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(100, (sleep / sleepGoal) * 100)}%` }} /></div></div>
              <div><div className="flex justify-between text-xs font-black uppercase tracking-[0.1em] text-slate-300"><span>Energy</span><span>{snapshot?.energy || "Not logged"}</span></div><div className="mt-2 h-1.5 rounded-full bg-white/[0.07]"><div className="h-full w-[70%] rounded-full bg-emerald-400" /></div></div>
            </div>
            <button type="button" onClick={() => onQuickLog?.("readiness")} className="mt-5 flex h-12 w-full items-center justify-between rounded-xl border border-white/10 bg-black/25 px-4 text-sm font-black text-white hover:border-emerald-300/35"><span>Check In Now</span><span>â†’</span></button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard eyebrow="Nutrition" value={`${proteinRemaining}g`} detail={`protein remaining of ${proteinGoal}g goal`} progress={proteinGoal ? (protein / proteinGoal) * 100 : 0} action="Log Meal" onClick={() => onQuickLog?.("meal")} />
        <MetricCard eyebrow="Active Recovery" value={`${sleepGoal}h`} detail={sleep ? `Last night: ${sleep}h` : "Sleep has not been logged"} progress={sleepGoal ? (sleep / sleepGoal) * 100 : 0} action="Sleep Planner" onClick={() => onOpen?.("sleep")} />
        <MetricCard eyebrow="Daily Movement" value={steps.toLocaleString()} detail={`of ${stepsGoal.toLocaleString()} step goal`} progress={stepsGoal ? (steps / stepsGoal) * 100 : 0} action="Log Steps" onClick={() => onQuickLog?.("steps")} compact />
        <MetricCard eyebrow="Your Targets" value="Goals" detail="Update protein, sleep, steps, weight, and training targets." action="Edit Daily Goals" onClick={onEditDailyGoals} compact />
      </div>

      <button type="button" onClick={onShowInsights} className="flex w-full items-center gap-4 rounded-[1.6rem] border border-emerald-300/18 bg-[linear-gradient(145deg,rgba(15,21,17,0.97),rgba(4,7,5,0.99))] p-5 text-left hover:border-emerald-300/35">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-emerald-300/35 bg-emerald-300/[0.08] text-2xl text-emerald-300">â—Ž</span>
        <span className="min-w-0 flex-1"><span className="block text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Trainer Insight</span><span className="mt-1 block text-sm leading-6 text-slate-300">{insight}</span></span>
        <span className="text-emerald-300">â†’</span>
      </button>
    </div>
  );
}
