// src/components/customer-health/WorkoutFocusCompactPanel.jsx
import React, { useMemo, useState } from "react";
import WorkoutFocusDrawer from "./WorkoutFocusDrawer";

const TIMER_PREFS_KEY = "syncworks_health_workout_timer_preferences_v3";

function safeNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cleanText(value, fallback = "") {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  if (/[ÃÂ�]|â€|â€”|â€“/.test(text)) return fallback;
  return text;
}

function formatLoad(value) {
  const text = cleanText(value, "");
  if (!text || /^(bw|bodyweight|body weight)$/i.test(text)) return "BW";
  const numeric = safeNumber(text, NaN);
  return Number.isFinite(numeric) ? `${numeric} lb` : text;
}

function slugify(value) {
  return String(value || "exercise")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readTimerPreferences() {
  if (typeof window === "undefined") {
    return { mode: "standard", restSeconds: 60, workSeconds: 40, rounds: 8 };
  }
  try {
    return {
      mode: "standard",
      restSeconds: 60,
      workSeconds: 40,
      rounds: 8,
      ...JSON.parse(window.localStorage.getItem(TIMER_PREFS_KEY) || "{}"),
    };
  } catch {
    return { mode: "standard", restSeconds: 60, workSeconds: 40, rounds: 8 };
  }
}

function RecommendationBanner({ suggestion, onUse, onKeep, onAdjust }) {
  if (!suggestion || !suggestion.action || suggestion.action === "hold") return null;
  const proposedWeight = suggestion.weight ?? suggestion.next_weight ?? "";
  const proposedReps = suggestion.reps ?? suggestion.next_reps ?? "";
  const actionLabel = suggestion.action === "decrease" ? "Lower next set" : "Progress next set";
  return (
    <div className="mt-3 rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.07] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-200">SYNC next-set coach</div>
          <div className="mt-1 text-sm font-black text-white">{actionLabel}</div>
          <div className="mt-1 text-[11px] leading-5 text-slate-400">{suggestion.reason || "Your last set suggests a small adjustment while keeping the exercise and plan intact."}</div>
        </div>
        <div className="shrink-0 rounded-xl border border-cyan-300/20 bg-black/25 px-3 py-2 text-right">
          <div className="text-[8px] font-black uppercase tracking-wider text-slate-500">Suggested</div>
          <div className="mt-1 text-sm font-black text-cyan-100">{proposedWeight !== "" ? formatLoad(proposedWeight) : "Current load"}{proposedReps !== "" ? ` × ${proposedReps}` : ""}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button type="button" onClick={() => onKeep?.(suggestion)} className="h-10 rounded-xl border border-white/10 bg-white/[0.04] text-[10px] font-black text-slate-200">Keep Current</button>
        <button type="button" onClick={() => onUse?.(suggestion)} className="h-10 rounded-xl border border-lime-300/30 bg-lime-300/15 text-[10px] font-black text-lime-100">Use Suggestion</button>
        <button type="button" onClick={() => onAdjust?.(suggestion)} className="h-10 rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-[10px] font-black text-cyan-100">Custom</button>
      </div>
    </div>
  );
}

export default function WorkoutFocusCompactPanel({
  session,
  currentExercise,
  formatSeconds,
  suggestion,
  audioOn,
  onStartSet,
  onFinishSet,
  onPause,
  onToggleAudio,
  onAskSync,
  onEndWorkout,
  onModify,
  onReplay,
  onUseRecommendation,
  onKeepCurrent,
  onAdjustManually,
}) {
  const [drawerMode, setDrawerMode] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const [timerPreferences, setTimerPreferences] = useState(readTimerPreferences);
  const exercises = Array.isArray(session?.exercises) ? session.exercises : [];
  const setLogs = Array.isArray(currentExercise?.set_logs) ? currentExercise.set_logs : [];
  const plannedSets = Math.max(1, safeNumber(currentExercise?.planned_sets, 1));
  const setNumber = Math.min(setLogs.length + 1, plannedSets);
  const totalPlannedSets = exercises.reduce((sum, exercise) => sum + Math.max(0, safeNumber(exercise?.planned_sets, 0)), 0);
  const completedSets = exercises.reduce((sum, exercise) => sum + (Array.isArray(exercise?.set_logs) ? exercise.set_logs.length : 0), 0);
  const allSetsComplete = Boolean(totalPlannedSets > 0 && completedSets >= totalPlannedSets);
  const exerciseName = cleanText(currentExercise?.substitute_name || currentExercise?.name, "Exercise");
  const reps = cleanText(currentExercise?.current_target_reps || currentExercise?.planned_reps, "—");
  const weight = currentExercise?.current_target_weight || currentExercise?.planned_weight || "";
  const previousSets = currentExercise?.previous_working_sets || currentExercise?.last_working_sets || currentExercise?.exercise_memory?.working_sets || [];
  const previousSet = Array.isArray(previousSets) ? previousSets[previousSets.length - 1] : null;
  const explicitImage = currentExercise?.image_url || currentExercise?.hero_image || currentExercise?.image || currentExercise?.demo_image || "";
  const fallbackImage = `/health/exercises/${slugify(exerciseName)}/${slugify(exerciseName)}-hero.png`;
  const image = imageFailed ? "" : explicitImage || fallbackImage;
  const workoutProgress = useMemo(() => {
    const resolved = exercises.filter((exercise) => exercise?.skipped || (exercise?.set_logs || []).length >= safeNumber(exercise?.planned_sets, 0)).length;
    return { resolved, total: exercises.length, percent: exercises.length ? Math.round((resolved / exercises.length) * 100) : 0 };
  }, [exercises]);

  function updateTimer(patch) {
    const next = { ...timerPreferences, ...patch };
    setTimerPreferences(next);
    try { window.localStorage.setItem(TIMER_PREFS_KEY, JSON.stringify(next)); } catch { /* Session preference remains in memory. */ }
  }

  if (!session || !currentExercise) return null;
  const primaryLabel = session.pending_set_logging ? "Log Set" : session.set_active ? "Finish Set" : session.rest_active ? `Rest ${formatSeconds(session.rest_remaining_seconds)}` : "Start Set";

  function primaryAction() {
    if (session.pending_set_logging || session.set_active) { onFinishSet?.(); return; }
    if (session.rest_active) { setDrawerMode("timer"); return; }
    onStartSet?.();
  }

  return (
    <>
      <section id="health-workout-command-center" className="overflow-hidden rounded-[1.7rem] border border-lime-300/25 bg-[radial-gradient(circle_at_88%_0%,rgba(57,255,136,0.11),transparent_28%),linear-gradient(160deg,#0a120d,#020403)] shadow-[0_22px_70px_rgba(0,0,0,0.46)]">
        <div className="border-b border-white/8 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0"><div className="text-[9px] font-black uppercase tracking-[0.18em] text-lime-300">Active workout</div><div className="mt-1 truncate text-base font-black text-white">{cleanText(session.workout_name, "Workout")}</div></div>
            <button type="button" onClick={onEndWorkout} disabled={session.set_active} className="h-10 rounded-xl border border-rose-300/25 bg-rose-300/10 px-3 text-[10px] font-black text-rose-100 disabled:opacity-35">End Workout</button>
          </div>
          <div className="mt-2 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-lime-300" style={{ width: `${workoutProgress.percent}%` }} /></div><div className="text-[9px] font-black text-slate-500">{workoutProgress.resolved}/{workoutProgress.total}</div></div>
        </div>
        <div className="p-3 pb-28 sm:p-4 sm:pb-32">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-200">Exercise {safeNumber(session.current_exercise_index, 0) + 1} of {Math.max(1, exercises.length)}</div><h2 className="mt-1 truncate text-2xl font-black text-white">{exerciseName}</h2><div className="mt-1 text-xs font-bold text-slate-400">Set {setNumber} of {plannedSets}</div></div>
            <button type="button" onClick={() => setDrawerMode("insight")} className="h-10 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 text-[10px] font-black text-cyan-100">Info</button>
          </div>
          {image ? <button type="button" onClick={() => setDrawerMode("insight")} className="mt-3 block h-44 w-full overflow-hidden rounded-2xl border border-white/10 bg-black/30 sm:h-64"><img src={image} alt={exerciseName} onError={() => setImageFailed(true)} className="h-full w-full object-cover" /></button> : null}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-3 text-center"><div className="text-[8px] font-black uppercase tracking-wider text-slate-500">Target reps</div><div className="mt-1 text-lg font-black text-white">{reps}</div></div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-3 text-center"><div className="text-[8px] font-black uppercase tracking-wider text-slate-500">Target load</div><div className="mt-1 text-lg font-black text-white">{formatLoad(weight)}</div></div>
            <button type="button" onClick={() => setDrawerMode("history")} className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-3 text-center"><div className="text-[8px] font-black uppercase tracking-wider text-cyan-200">Last time</div><div className="mt-1 text-sm font-black text-cyan-100">{previousSet ? `${cleanText(previousSet.actual_reps || previousSet.reps, "—")} × ${formatLoad(previousSet.actual_weight || previousSet.weight)}` : "Baseline"}</div></button>
          </div>
          <RecommendationBanner suggestion={suggestion} onUse={onUseRecommendation} onKeep={onKeepCurrent} onAdjust={onAdjustManually} />
          <div className="mt-3 grid grid-cols-3 gap-2"><button type="button" onClick={() => setDrawerMode("history")} className="h-11 rounded-xl border border-white/10 bg-white/[0.035] text-[10px] font-black text-slate-200">History</button><button type="button" onClick={() => setDrawerMode("insight")} className="h-11 rounded-xl border border-white/10 bg-white/[0.035] text-[10px] font-black text-slate-200">Exercise Info</button><button type="button" onClick={() => setDrawerMode("change")} disabled={session.set_active} className="h-11 rounded-xl border border-white/10 bg-white/[0.035] text-[10px] font-black text-slate-200 disabled:opacity-35">Swap / Skip</button></div>
          {allSetsComplete ? <button type="button" onClick={onEndWorkout} className="mt-3 h-14 w-full rounded-2xl border border-lime-300/40 bg-lime-300 text-sm font-black uppercase tracking-[0.08em] text-black">End Workout and Review</button> : null}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-[210] border-t border-lime-300/20 bg-[#020604]/96 px-3 pb-[calc(env(safe-area-inset-bottom)+0.65rem)] pt-2 backdrop-blur-xl">
        <div className="mx-auto grid max-w-xl grid-cols-[72px_1fr_72px] gap-2">
          <button type="button" onClick={onToggleAudio} className={`h-14 rounded-2xl border text-[10px] font-black ${audioOn ? "border-cyan-300/30 bg-cyan-300/12 text-cyan-100" : "border-white/10 bg-white/[0.04] text-slate-300"}`}>Audio<br />{audioOn ? "On" : "Off"}</button>
          <button type="button" onClick={primaryAction} disabled={session.paused || (session.rest_active && !session.pending_set_logging)} className="h-14 rounded-2xl border border-lime-300/45 bg-lime-300 text-sm font-black uppercase tracking-[0.08em] text-black shadow-[0_0_24px_rgba(57,255,136,0.30)] disabled:opacity-55">{primaryLabel}</button>
          <button type="button" onClick={onAskSync} className="h-14 rounded-2xl border border-fuchsia-300/25 bg-fuchsia-300/10 text-[10px] font-black text-fuchsia-100">Ask<br />SYNC</button>
        </div>
        <div className="mx-auto mt-1 flex max-w-xl items-center justify-between px-1 text-[8px] font-black uppercase tracking-[0.13em] text-slate-600"><button type="button" onClick={onPause} className="py-1">{session.paused ? "Resume workout" : "Pause workout"}</button><button type="button" onClick={() => setDrawerMode("timer")} className="py-1">Timers</button><button type="button" onClick={() => setDrawerMode("more")} className="py-1">More</button></div>
      </div>

      <WorkoutFocusDrawer open={Boolean(drawerMode)} mode={drawerMode} exercise={currentExercise} session={session} suggestion={suggestion} timerPreferences={timerPreferences} onTimerPreferencesChange={updateTimer} onClose={() => setDrawerMode("")} onReplay={() => { onReplay?.(); setDrawerMode(""); }} onSwap={() => { setDrawerMode(""); onModify?.(); }} onSkip={() => setDrawerMode("")} onComeBackLater={() => setDrawerMode("")} onFinish={() => { setDrawerMode(""); onEndWorkout?.(); }} />
    </>
  );
}
