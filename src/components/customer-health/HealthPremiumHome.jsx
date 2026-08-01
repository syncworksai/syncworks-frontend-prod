// src/components/customer-health/HealthPremiumHome.jsx
import React, { useCallback, useMemo, useRef, useState } from "react";
import HealthProgressControlCenter from "./HealthProgressControlCenter";
import HealthAthleteProfileCard from "./HealthAthleteProfileCard";
import RecoveryReadinessCard from "./RecoveryReadinessCard";
import HealthGoalProgressCard from "./HealthGoalProgressCard";

function safeNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function todayYmd() {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function firstName(profile) {
  return String(profile?.first_name || profile?.name || "").trim().split(" ")[0];
}

function workoutName(item) {
  return String(item?.workout_name || item?.name || item?.title || "").trim();
}

function workoutDate(item) {
  return String(item?.ymd || item?.date || item?.completed_ymd || item?.completed_at || item?.ended_at || "").slice(0, 10);
}

function completedRecently(history, name) {
  if (!name || !Array.isArray(history)) return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayYmd = [yesterday.getFullYear(), String(yesterday.getMonth() + 1).padStart(2, "0"), String(yesterday.getDate()).padStart(2, "0")].join("-");
  return history.some((entry) => {
    const status = String(entry?.status || entry?.workout_status || "").toLowerCase();
    return workoutName(entry).toLowerCase() === name.toLowerCase() &&
      (status.includes("complete") || entry?.completed === true || entry?.completed_at) &&
      [todayYmd(), yesterdayYmd].includes(workoutDate(entry));
  });
}

function unfinishedWorkout(snapshot) {
  const direct = [snapshot?.active_workout, snapshot?.workout_in_progress, snapshot?.incomplete_workout, snapshot?.last_incomplete_workout]
    .find((item) => item && typeof item === "object");
  if (direct) return direct;
  return (Array.isArray(snapshot?.week_plan) ? snapshot.week_plan : []).find((item) =>
    ["in progress", "started", "incomplete"].includes(String(item?.status || "").toLowerCase())
  );
}

function chooseWorkout(snapshot, history) {
  const plan = Array.isArray(snapshot?.week_plan) ? snapshot.week_plan : [];
  const today = plan.find((item) => item?.ymd === todayYmd() && workoutName(item) && String(item?.status || "") !== "Completed");
  if (today && !completedRecently(history, workoutName(today))) return { workout: today, repeated: false };
  const nextDifferent = [...plan]
    .filter((item) => workoutName(item) && !["Completed", "Skipped"].includes(item?.status))
    .filter((item) => !completedRecently(history, workoutName(item)))
    .sort((a, b) => String(a?.ymd || "9999").localeCompare(String(b?.ymd || "9999")))[0];
  return { workout: nextDifferent || null, repeated: Boolean(today) };
}

function totalSets(workout) {
  return (Array.isArray(workout?.exercises) ? workout.exercises : []).reduce((sum, exercise) => sum + safeNumber(exercise?.planned_sets || exercise?.sets, 0), 0);
}

function QuickStat({ label, value, detail, onClick }) {
  return <button type="button" onClick={onClick} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-left">
    <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</div>
    <div className="mt-1 text-xl font-black text-white">{value}</div>
    <div className="mt-1 text-[10px] text-slate-500">{detail}</div>
  </button>;
}

function ActionTile({ label, detail, onClick, tone = "lime" }) {
  const toneClass = tone === "cyan" ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100" : tone === "amber" ? "border-amber-300/25 bg-amber-300/10 text-amber-100" : "border-lime-300/25 bg-lime-300/10 text-lime-100";
  return <button type="button" onClick={onClick} className={`min-h-20 rounded-2xl border p-3 text-left ${toneClass}`}>
    <div className="text-sm font-black">{label}</div>
    <div className="mt-1 text-[10px] leading-4 text-slate-400">{detail}</div>
  </button>;
}

export default function HealthPremiumHome({
  profile,
  snapshot,
  history,
  onOpen,
  onStartWorkout,
  onQuickLog,
  onCoachUpdate,
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const coachUpdateRef = useRef(onCoachUpdate);
  coachUpdateRef.current = onCoachUpdate;
  const stableCoachUpdate = useCallback((patch) => coachUpdateRef.current?.(patch), []);

  const unfinished = useMemo(() => unfinishedWorkout(snapshot), [snapshot]);
  const selected = useMemo(() => chooseWorkout(snapshot, history), [snapshot, history]);
  const workout = unfinished || selected.workout;
  const isResume = Boolean(unfinished);
  const needsRefresh = !isResume && selected.repeated;
  const exercises = Array.isArray(workout?.exercises) ? workout.exercises : [];
  const exerciseCount = exercises.length || safeNumber(workout?.exercise_count, 0);
  const sets = totalSets(workout) || safeNumber(workout?.total_sets, 0);
  const duration = safeNumber(workout?.duration_minutes || workout?.requested_duration_minutes, exerciseCount ? 45 : 0);
  const completed = safeNumber(workout?.completed_exercises || workout?.current_exercise_index, 0);
  const progress = exerciseCount ? Math.min(100, Math.round((completed / exerciseCount) * 100)) : 0;

  const protein = safeNumber(snapshot?.protein_today || snapshot?.protein, 0);
  const proteinGoal = safeNumber(snapshot?.protein_goal || profile?.protein_goal, 136);
  const steps = safeNumber(snapshot?.steps, 0);
  const sleep = safeNumber(snapshot?.sleep_hours || snapshot?.last_sleep_hours, 0);
  const readiness = safeNumber(snapshot?.readiness_score || snapshot?.readiness, 0);

  function startPrimary() {
    if (workout && !needsRefresh) onStartWorkout?.(workout);
    else onOpen?.("plan-today");
  }

  return <div className="space-y-3 pb-5">
    <section className="overflow-hidden rounded-[1.9rem] border border-lime-300/20 bg-[radial-gradient(circle_at_85%_0%,rgba(57,255,136,0.11),transparent_34%),linear-gradient(160deg,#0b120e,#030504)] shadow-[0_22px_70px_rgba(0,0,0,0.46)]">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.19em] text-lime-300">SYNC Health Command Center</div>
            <h1 className="mt-1 text-2xl font-black text-white">{firstName(profile) ? `Ready, ${firstName(profile)}?` : "Ready to train?"}</h1>
            <p className="mt-1 text-xs text-slate-400">One clear next action. Everything else opens only when you need it.</p>
          </div>
          <div className="rounded-full border border-lime-300/25 bg-lime-300/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.13em] text-lime-100">
            {isResume ? "Resume" : needsRefresh ? "Refresh plan" : workout ? "Plan ready" : "Build plan"}
          </div>
        </div>

        <div className="mt-4 rounded-[1.55rem] border border-white/10 bg-black/25 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-200">{isResume ? "Workout in progress" : needsRefresh ? "Yesterday's workout detected" : "Today's workout"}</div>
              <h2 className="mt-1 truncate text-2xl font-black text-white">{needsRefresh ? "Build a fresh workout" : workoutName(workout) || "Choose today's training"}</h2>
              <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-bold text-slate-400">
                <span>{exerciseCount || "-"} exercises</span><span>{sets || "-"} sets</span><span>{duration || "-"} min</span>
              </div>
            </div>
            <button type="button" onClick={() => setPlanOpen((value) => !value)} className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[10px] font-black text-white">{planOpen ? "Hide" : "View"}</button>
          </div>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-lime-300" style={{ width: `${isResume ? Math.max(8, progress) : needsRefresh ? 0 : 8}%` }} /></div>

          {needsRefresh ? <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.07] p-3 text-xs leading-5 text-amber-100">You completed this workout recently, so SYNC will not automatically repeat it today. Review recovery and build the next appropriate session.</div> : null}

          {planOpen ? <div className="mt-3 grid grid-cols-2 gap-2">
            <ActionTile label="Scheduled workout" detail="Use the planned session for today." onClick={startPrimary} />
            <ActionTile label="Build as you go" detail="Walk into the gym and log each exercise as you choose it." onClick={() => onOpen?.("plan-today")} tone="cyan" />
            <ActionTile label="Home workout" detail="Build from your available home equipment." onClick={() => onOpen?.("plan-today")} tone="amber" />
            <ActionTile label="Change location or intensity" detail="Gym, home, beginner, advanced, shorter, or harder." onClick={() => onOpen?.("plan-today")} />
          </div> : null}

          <button type="button" onClick={startPrimary} className="mt-4 h-14 w-full rounded-2xl border border-lime-300/50 bg-lime-300 text-sm font-black uppercase tracking-[0.09em] text-black shadow-[0_0_28px_rgba(57,255,136,0.25)]">
            {isResume ? "Resume Workout" : needsRefresh ? "Build Fresh Workout" : workout ? "Start Workout" : "Choose Workout"}
          </button>
          <button type="button" onClick={() => onOpen?.("plan-today")} className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/[0.035] text-xs font-black text-slate-200">Change workout, location, intensity, or experience level</button>
        </div>
      </div>
    </section>

    <section className="grid grid-cols-4 gap-2">
      <QuickStat label="Protein" value={`${protein}g`} detail={`${Math.max(0, proteinGoal - protein)}g left`} onClick={() => onQuickLog?.("meal")} />
      <QuickStat label="Steps" value={steps.toLocaleString()} detail="WeWard" onClick={() => onQuickLog?.("steps")} />
      <QuickStat label="Sleep" value={sleep ? `${sleep}h` : "Log"} detail="Recovery" onClick={() => onQuickLog?.("sleep")} />
      <QuickStat label="Ready" value={readiness || "Log"} detail="Today" onClick={() => onQuickLog?.("readiness")} />
    </section>

    <button type="button" onClick={() => setDetailsOpen((value) => !value)} className="flex h-12 w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-black text-white">
      <span>{detailsOpen ? "Hide Health Details" : "Recovery, Goals, Profile and Progress"}</span><span>{detailsOpen ? "−" : "+"}</span>
    </button>

    {detailsOpen ? <div className="space-y-3">
      <RecoveryReadinessCard profile={profile} snapshot={snapshot} history={history} onOpen={onOpen} />
      <HealthGoalProgressCard profile={profile} snapshot={snapshot} history={history} onOpen={onOpen} />
      <HealthProgressControlCenter profile={profile} snapshot={snapshot} history={history} onCoachUpdate={stableCoachUpdate} />
      <HealthAthleteProfileCard profile={profile} snapshot={snapshot} onCoachUpdate={stableCoachUpdate} />
    </div> : null}
  </div>;
}
