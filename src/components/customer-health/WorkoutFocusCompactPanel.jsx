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

function exerciseImageSlug(name) {
  const slug = slugify(name);
  const aliases = [
    [/bench|chest-press/, "bench-press"],
    [/deadlift|romanian-deadlift|rdl/, "deadlift"],
    [/squat/, "squat"],
    [/push-up|pushup/, "push-up"],
    [/leg-press/, "leg-press"],
    [/leg-curl|hamstring-curl/, "leg-curl"],
    [/shoulder-press|overhead-press/, "shoulder-press"],
    [/lat-pulldown|pulldown/, "lat-pulldown"],
    [/seated-row|cable-row/, "seated-row"],
    [/biceps-curl|bicep-curl|curl/, "biceps-curl"],
    [/triceps-pushdown|tricep-pushdown/, "triceps-pushdown"],
    [/chest-fly|pec-fly|cable-fly/, "chest-fly"],
    [/lateral-raise/, "lateral-raise"],
    [/calf-raise/, "calf-raise"],
    [/plank/, "plank"],
    [/sit-up|situp/, "sit-up"],
    [/leg-extension/, "leg-extension"],
  ];
  return aliases.find(([pattern]) => pattern.test(slug))?.[1] || slug;
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
  const action = String(suggestion?.action || "").toLowerCase();
  const proposedWeight = suggestion?.weight ?? suggestion?.next_weight ?? "";
  const proposedReps = suggestion?.reps ?? suggestion?.next_reps ?? "";
  const isProgress = ["increase", "progress", "advance"].includes(action);
  const isDecrease = ["decrease", "reduce", "protect"].includes(action);
  const isHold = !action || ["hold", "repeat", "maintain"].includes(action);
  const label = isProgress ? "Increase next set" : isDecrease ? "Reduce next set" : isHold ? "Hold this target" : "SYNC recommendation";
  const tone = isProgress
    ? "border-lime-300/30 bg-lime-300/[0.08] text-lime-100"
    : isDecrease
    ? "border-amber-300/30 bg-amber-300/[0.08] text-amber-100"
    : "border-cyan-300/25 bg-cyan-300/[0.07] text-cyan-100";
  const reason = suggestion?.reason || (isHold
    ? "Stay with the current target until your completed reps and effort support a clean increase."
    : "SYNC is using your completed reps, effort and previous performance to guide the next set.");

  return (
    <div className={`mt-2 rounded-xl border p-2.5 ${tone}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[8px] font-black uppercase tracking-[0.14em] opacity-80">SYNC set intelligence</div>
          <div className="mt-0.5 text-xs font-black">{label}</div>
          <div className="mt-1 text-[10px] leading-4 text-slate-300">{reason}</div>
        </div>
        <div className="shrink-0 rounded-lg border border-white/10 bg-black/25 px-2 py-1.5 text-right">
          <div className="text-[7px] font-black uppercase tracking-wider text-slate-500">Next</div>
          <div className="mt-0.5 text-[11px] font-black text-white">
            {proposedWeight !== "" ? formatLoad(proposedWeight) : "Current load"}
            {proposedReps !== "" ? ` × ${proposedReps}` : ""}
          </div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <button type="button" onClick={() => onKeep?.(suggestion)} className="h-9 rounded-lg border border-white/10 bg-white/[0.04] text-[9px] font-black text-slate-200">Keep</button>
        <button type="button" onClick={() => onUse?.(suggestion)} className="h-9 rounded-lg border border-lime-300/30 bg-lime-300/15 text-[9px] font-black text-lime-100">Use SYNC</button>
        <button type="button" onClick={() => onAdjust?.(suggestion)} className="h-9 rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-[9px] font-black text-cyan-100">Adjust</button>
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
  const previousSets = currentExercise?.previous_performance?.last_sets || currentExercise?.previous_working_sets || currentExercise?.last_working_sets || currentExercise?.exercise_memory?.working_sets || [];
  const previousSet = Array.isArray(previousSets) ? previousSets[previousSets.length - 1] : null;
  const explicitImage = currentExercise?.image_url || currentExercise?.hero_image || currentExercise?.image || currentExercise?.demo_image || "";
  const canonicalSlug = exerciseImageSlug(exerciseName);
  const fallbackImage = `/health/exercises/${canonicalSlug}/${canonicalSlug}-hero.png`;
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
  const primaryLabel = session.pending_set_logging
    ? "Log Set"
    : session.set_active
    ? "Finish Set"
    : session.rest_active
    ? `Rest ${formatSeconds(session.rest_remaining_seconds)}`
    : "Start Set";

  function primaryAction() {
    if (session.pending_set_logging || session.set_active) {
      onFinishSet?.();
      return;
    }
    if (session.rest_active) {
      setDrawerMode("timer");
      return;
    }
    onStartSet?.();
  }

  return (
    <>
      <section id="health-workout-command-center" className="overflow-hidden rounded-[1.35rem] border border-cyan-300/25 bg-[radial-gradient(circle_at_88%_0%,rgba(34,211,238,0.10),transparent_28%),linear-gradient(160deg,#07101f,#020617)] shadow-[0_18px_50px_rgba(0,0,0,0.42)]">
        <div className="border-b border-white/8 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[8px] font-black uppercase tracking-[0.16em] text-cyan-300">Active workout</div>
              <div className="mt-0.5 truncate text-sm font-black text-white">{cleanText(session.workout_name, "Workout")}</div>
            </div>
            <button type="button" onClick={onEndWorkout} disabled={session.set_active} className="h-9 rounded-lg border border-rose-300/20 bg-rose-300/8 px-3 text-[9px] font-black text-rose-100 disabled:opacity-35">Finish</button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-600" style={{ width: `${workoutProgress.percent}%` }} /></div>
            <div className="text-[8px] font-black text-slate-500">{workoutProgress.resolved}/{workoutProgress.total}</div>
          </div>
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
            {exercises.map((exercise, index) => (
              <div key={exercise.id || `${exercise.name}-${index}`} className={`min-w-[94px] rounded-lg border px-2 py-1.5 ${index === safeNumber(session.current_exercise_index, 0) ? "border-cyan-300/30 bg-cyan-300/10" : "border-white/8 bg-black/20"}`}>
                <div className="text-[7px] font-black uppercase text-slate-500">{index + 1}/{exercises.length}</div>
                <div className="mt-0.5 truncate text-[9px] font-black text-slate-200">{cleanText(exercise?.substitute_name || exercise?.name, "Exercise")}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-2.5 pb-24 sm:p-4 sm:pb-32">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[8px] font-black uppercase tracking-[0.14em] text-cyan-200">Exercise {safeNumber(session.current_exercise_index, 0) + 1} of {Math.max(1, exercises.length)}</div>
              <h2 className="mt-0.5 truncate text-lg font-black text-white">{exerciseName}</h2>
              <div className="mt-0.5 text-[10px] font-bold text-slate-400">Set {setNumber} of {plannedSets}</div>
            </div>
            <button type="button" onClick={() => setDrawerMode("insight")} className="h-9 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-3 text-[9px] font-black text-cyan-100">Info</button>
          </div>

          {image ? (
            <button type="button" onClick={() => setDrawerMode("insight")} className="mt-2 block h-32 w-full overflow-hidden rounded-xl border border-white/10 bg-black/30 sm:h-60">
              <img src={image} alt={exerciseName} onError={() => setImageFailed(true)} className="h-full w-full object-contain" />
            </button>
          ) : (
            <button type="button" onClick={() => setDrawerMode("insight")} className="mt-2 flex h-24 w-full items-center justify-center rounded-xl border border-dashed border-cyan-300/15 bg-cyan-300/[0.03] text-center text-[10px] font-bold text-slate-500">
              Exercise guide · tap for movement details
            </button>
          )}

          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <div className="rounded-lg border border-white/10 bg-black/25 p-2 text-center"><div className="text-[7px] font-black uppercase tracking-wider text-slate-500">Reps</div><div className="mt-0.5 text-base font-black text-white">{reps}</div></div>
            <div className="rounded-lg border border-white/10 bg-black/25 p-2 text-center"><div className="text-[7px] font-black uppercase tracking-wider text-slate-500">Load</div><div className="mt-0.5 text-base font-black text-white">{formatLoad(weight)}</div></div>
            <button type="button" onClick={() => setDrawerMode("history")} className="rounded-lg border border-cyan-300/20 bg-cyan-300/[0.06] p-2 text-center"><div className="text-[7px] font-black uppercase tracking-wider text-cyan-200">Last</div><div className="mt-0.5 text-[10px] font-black text-cyan-100">{previousSet ? `${cleanText(previousSet.actual_weight || previousSet.weight, "BW")} × ${cleanText(previousSet.actual_reps || previousSet.reps, "—")}` : "Baseline"}</div></button>
          </div>

          <RecommendationBanner suggestion={suggestion} onUse={onUseRecommendation} onKeep={onKeepCurrent} onAdjust={onAdjustManually} />

          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <button type="button" onClick={() => setDrawerMode("history")} className="h-9 rounded-lg border border-white/10 bg-white/[0.035] text-[9px] font-black text-slate-200">History</button>
            <button type="button" onClick={() => setDrawerMode("insight")} className="h-9 rounded-lg border border-white/10 bg-white/[0.035] text-[9px] font-black text-slate-200">Exercise</button>
            <button type="button" onClick={() => setDrawerMode("change")} disabled={session.set_active} className="h-9 rounded-lg border border-white/10 bg-white/[0.035] text-[9px] font-black text-slate-200 disabled:opacity-35">Swap</button>
          </div>
          {allSetsComplete ? <button type="button" onClick={onEndWorkout} className="mt-2 h-12 w-full rounded-xl border border-lime-300/40 bg-lime-300 text-xs font-black uppercase tracking-[0.08em] text-black">End Workout and Review</button> : null}
        </div>
      </section>

      <div className="health-workout-action-dock fixed inset-x-0 bottom-0 z-[210] border-t border-lime-300/20 bg-[#020604]/96 px-3 pb-[calc(env(safe-area-inset-bottom)+0.65rem)] pt-2 backdrop-blur-xl">
        <div className="mx-auto grid max-w-xl grid-cols-[56px_1fr_56px] gap-1.5">
          <button type="button" onClick={onToggleAudio} className={`h-11 rounded-lg border text-[9px] font-black ${audioOn ? "border-cyan-300/30 bg-cyan-300/12 text-cyan-100" : "border-white/10 bg-white/[0.04] text-slate-300"}`}>Audio<br />{audioOn ? "On" : "Off"}</button>
          <button type="button" onClick={primaryAction} disabled={session.paused} className="h-12 rounded-xl border border-cyan-300/45 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-xs font-black uppercase tracking-[0.08em] text-white shadow-[0_0_24px_rgba(34,211,238,0.24)] disabled:opacity-55">{primaryLabel}</button>
          <button type="button" onClick={onAskSync} className="h-11 rounded-lg border border-fuchsia-300/25 bg-fuchsia-300/10 text-[9px] font-black text-fuchsia-100">Ask<br />SYNC</button>
        </div>
        <div className="mx-auto mt-1 flex max-w-xl items-center justify-between px-1 text-[7px] font-black uppercase tracking-[0.12em] text-slate-600"><button type="button" onClick={onPause} className="py-1">{session.paused ? "Resume" : "Pause"}</button><button type="button" onClick={() => setDrawerMode("timer")} className="py-1">Rest / timer</button><button type="button" onClick={() => setDrawerMode("more")} className="py-1">More</button></div>
      </div>

      <WorkoutFocusDrawer open={Boolean(drawerMode)} mode={drawerMode} exercise={currentExercise} session={session} suggestion={suggestion} timerPreferences={timerPreferences} onTimerPreferencesChange={updateTimer} onClose={() => setDrawerMode("")} onReplay={() => { onReplay?.(); setDrawerMode(""); }} onSwap={() => { setDrawerMode(""); onModify?.(); }} onSkip={() => setDrawerMode("")} onComeBackLater={() => setDrawerMode("")} onFinish={() => { setDrawerMode(""); onEndWorkout?.(); }} />
    </>
  );
}
