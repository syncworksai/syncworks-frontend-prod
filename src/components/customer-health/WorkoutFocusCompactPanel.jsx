// src/components/customer-health/WorkoutFocusCompactPanel.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import WorkoutFocusDrawer from "./WorkoutFocusDrawer";

const TIMER_PREFS_KEY = "syncworks_health_workout_timer_preferences_v2";

function safeNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatLoad(value) {
  const text = String(value ?? "").trim();
  if (!text || /^(bw|bodyweight|body weight)$/i.test(text)) return "BW";
  return `${text} lb`;
}

function slugify(value) {
  return String(value || "exercise")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function findWorkoutRoot(node) {
  let current = node;
  while (current) {
    const text = current.textContent || "";
    if (text.includes("SYNC WORKOUT FOCUS MODE") && text.includes("Exit Focus")) return current;
    current = current.parentElement;
  }
  return null;
}

function findButton(root, labels) {
  const normalized = labels.map((label) => label.toLowerCase());
  return [...root.querySelectorAll("button")].find((button) =>
    normalized.includes((button.textContent || "").trim().toLowerCase())
  );
}

function readTimerPreferences() {
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

export default function WorkoutFocusCompactPanel({
  session,
  currentExercise,
  formatSeconds,
  onModify,
  onFinish,
  onReplay,
}) {
  const panelRef = useRef(null);
  const [drawerMode, setDrawerMode] = useState("");
  const [notice, setNotice] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const [timerPreferences, setTimerPreferences] = useState(readTimerPreferences);

  const allSetsComplete = Boolean(
    session?.exercises?.length &&
      session.exercises.every(
        (exercise) =>
          exercise.skipped ||
          (exercise.set_logs || []).length >= Number(exercise.planned_sets || 0)
      )
  );

  const workoutProgress = useMemo(() => {
    const exercises = Array.isArray(session?.exercises) ? session.exercises : [];
    const completed = exercises.filter(
      (exercise) =>
        exercise.skipped ||
        (exercise.set_logs || []).length >= Number(exercise.planned_sets || 0)
    ).length;
    return {
      completed,
      total: exercises.length,
      percent: exercises.length ? Math.round((completed / exercises.length) * 100) : 0,
    };
  }, [session?.exercises]);

  useEffect(() => {
    setImageFailed(false);
  }, [currentExercise?.id, currentExercise?.name]);

  useEffect(() => {
    try {
      window.localStorage.setItem(TIMER_PREFS_KEY, JSON.stringify(timerPreferences));
    } catch {
      // Preferences remain available for this workout session.
    }
  }, [timerPreferences]);

  useEffect(() => {
    const panel = panelRef.current;
    const root = findWorkoutRoot(panel);
    if (!panel || !root) return undefined;

    const restore = [];
    const hide = (element) => {
      if (!element) return;
      const previous = element.style.display;
      restore.push(() => {
        element.style.display = previous;
      });
      element.style.display = "none";
    };

    // Keep the workout screen action-first. All legacy detail cards remain
    // connected, but this command center replaces their default presentation.
    const previousCard = panel.previousElementSibling;
    hide(previousCard);

    [
      "Previous Workout + Progression",
      "Personal Records",
      "Next Record Targets",
      "Milestones Reached",
      "Coach Voice Settings",
      "Live Set Board",
      "Finish Check-In",
    ].forEach((marker) => {
      [...root.querySelectorAll("div, section, details")]
        .filter((element) => (element.textContent || "").includes(marker))
        .slice(0, 1)
        .forEach(hide);
    });

    [...root.querySelectorAll("button")].forEach((button) => {
      const label = (button.textContent || "").trim();
      if (label === "Finish" || label === "Finish Workout") hide(button);
    });

    // Hide both older floating control bars. Their actions are invoked by the
    // large primary button and the drawers below.
    [...root.querySelectorAll("div")].forEach((element) => {
      const text = element.textContent || "";
      const className = String(element.className || "");
      if (
        (text.includes("Pause") && text.includes("Set Control") && text.includes("Ask SYNC")) ||
        (className.includes("fixed") && text.includes("Start Set") && text.includes("SYNC"))
      ) {
        hide(element);
      }
    });

    return () => restore.reverse().forEach((callback) => callback());
  }, [currentExercise?.id, allSetsComplete]);

  if (!session || !currentExercise) return null;

  const setLogs = currentExercise.set_logs || [];
  const setNumber = Math.min(setLogs.length + 1, Number(currentExercise.planned_sets || 1));
  const plannedSets = currentExercise.planned_sets || "-";
  const reps = currentExercise.current_target_reps || currentExercise.planned_reps || "-";
  const weight = currentExercise.current_target_weight || currentExercise.planned_weight;
  const lastSet = setLogs[setLogs.length - 1];
  const exerciseName = currentExercise.substitute_name || currentExercise.name || "Exercise";
  const explicitImage = currentExercise.image_url || currentExercise.hero_image || currentExercise.image || currentExercise.demo_image || "";
  const fallbackImage = `/health/exercises/${slugify(exerciseName)}/${slugify(exerciseName)}-hero.png`;
  const image = imageFailed ? "" : explicitImage || fallbackImage;
  const primaryLabel = session.pending_set_logging
    ? "Log Completed Set"
    : session.set_active
    ? "Finish Set"
    : session.rest_active
    ? `Rest ${formatSeconds(session.rest_remaining_seconds)}`
    : "Start Set";

  function clickWorkoutAction(labels) {
    const root = findWorkoutRoot(panelRef.current);
    const button = root ? findButton(root, labels) : null;
    if (button) {
      button.click();
      return true;
    }
    return false;
  }

  function handlePrimaryAction() {
    if (session.pending_set_logging) {
      clickWorkoutAction(["Log Set"]);
      return;
    }
    if (session.rest_active) {
      setDrawerMode("timer");
      return;
    }
    clickWorkoutAction(["Start Set", "Start Timer", "Finish Set", "Finish Timer"]);
  }

  function comeBackLater() {
    if (session.set_active || session.pending_set_logging) {
      setNotice("Finish or save this set first.");
      return;
    }

    const root = findWorkoutRoot(panelRef.current);
    const exerciseButtons = root
      ? [...root.querySelectorAll("button")].filter((button) => /\d+\/\d+ sets/i.test(button.textContent || ""))
      : [];
    const nextIndex = Math.min(exerciseButtons.length - 1, Number(session.current_exercise_index || 0) + 1);

    if (exerciseButtons.length && nextIndex > Number(session.current_exercise_index || 0)) {
      exerciseButtons[nextIndex].click();
      setNotice("Saved for later. Moved to the next exercise.");
      setDrawerMode("");
      window.setTimeout(() => setNotice(""), 2600);
      return;
    }
    setNotice("This is the final exercise.");
  }

  function openSwapFlow() {
    const root = findWorkoutRoot(panelRef.current);
    setDrawerMode("");
    onModify?.();
    window.setTimeout(() => findButton(root, ["Swap Exercise"])?.click(), 100);
  }

  function skipExercise() {
    const root = findWorkoutRoot(panelRef.current);
    setDrawerMode("");
    window.setTimeout(() => findButton(root, ["Skip Exercise", "Undo Skip"])?.click(), 80);
  }

  return (
    <>
      <section
        ref={panelRef}
        className="overflow-hidden rounded-[1.7rem] border border-lime-300/25 bg-[radial-gradient(circle_at_90%_0%,rgba(57,255,136,0.10),transparent_30%),linear-gradient(160deg,#0b120e,#020403)] shadow-[0_22px_70px_rgba(0,0,0,0.45)]"
      >
        <div className="border-b border-white/8 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-lime-300">Current workout</div>
              <div className="mt-1 truncate text-base font-black text-white">{session.workout_name || "Active workout"}</div>
            </div>
            <div className="text-right text-[10px] font-black text-slate-400">
              {workoutProgress.completed}/{workoutProgress.total} exercises
            </div>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
            <div className="h-full rounded-full bg-lime-300 transition-all" style={{ width: `${workoutProgress.percent}%` }} />
          </div>
        </div>

        <div className="p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-200">Exercise {Number(session.current_exercise_index || 0) + 1} of {workoutProgress.total}</div>
              <h2 className="mt-1 truncate text-2xl font-black text-white">{exerciseName}</h2>
              <div className="mt-1 text-xs font-bold text-slate-400">Set {setNumber} of {plannedSets}</div>
            </div>
            <button type="button" onClick={() => setDrawerMode("insight")} className="h-10 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 text-[10px] font-black text-cyan-100">Info</button>
          </div>

          {image ? (
            <button type="button" onClick={() => setDrawerMode("insight")} className="mt-3 block h-48 w-full overflow-hidden rounded-2xl border border-white/10 bg-black/30 sm:h-64">
              <img src={image} alt={exerciseName} onError={() => setImageFailed(true)} className="h-full w-full object-cover" />
            </button>
          ) : (
            <button type="button" onClick={() => setDrawerMode("insight")} className="mt-3 flex h-28 w-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 text-xs font-black text-slate-500">Open exercise instructions</button>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-3 text-center">
              <div className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-500">Target reps</div>
              <div className="mt-1 text-xl font-black text-white">{reps}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-3 text-center">
              <div className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-500">Target weight</div>
              <div className="mt-1 text-xl font-black text-white">{formatLoad(weight)}</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-[0.8fr_1.4fr_0.8fr] items-stretch gap-2">
            <button type="button" onClick={() => setDrawerMode("timer")} className="rounded-2xl border border-amber-300/25 bg-amber-300/10 p-2 text-center">
              <div className="text-[8px] font-black uppercase tracking-[0.12em] text-amber-200">{session.rest_active ? "Rest left" : "Timer"}</div>
              <div className="mt-1 text-base font-black text-amber-100">{session.rest_active ? formatSeconds(session.rest_remaining_seconds) : timerPreferences.mode.toUpperCase()}</div>
            </button>

            <button
              type="button"
              onClick={handlePrimaryAction}
              disabled={session.paused || (session.rest_active && !session.pending_set_logging)}
              className="min-h-20 rounded-full border-[5px] border-lime-300/30 bg-lime-300 text-sm font-black uppercase tracking-[0.08em] text-black shadow-[0_0_28px_rgba(57,255,136,0.28)] disabled:opacity-55"
            >
              {primaryLabel}
            </button>

            <button type="button" onClick={() => setDrawerMode("history")} className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-2 text-center">
              <div className="text-[8px] font-black uppercase tracking-[0.12em] text-cyan-200">Last set</div>
              <div className="mt-1 text-sm font-black text-cyan-100">{lastSet ? `${lastSet.actual_reps ?? lastSet.reps ?? "-"} x ${formatLoad(lastSet.actual_weight ?? lastSet.weight)}` : "Baseline"}</div>
            </button>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {[
              ["history", "History"],
              ["insight", "Info"],
              ["change", "Change"],
              ["more", "More"],
            ].map(([mode, label]) => (
              <button key={mode} type="button" onClick={() => setDrawerMode(mode)} disabled={mode === "change" && session.set_active} className="h-11 rounded-xl border border-white/10 bg-white/[0.035] px-1 text-[10px] font-black text-slate-200 disabled:opacity-40">{label}</button>
            ))}
          </div>

          {notice ? <div className="mt-2 rounded-xl border border-amber-300/20 bg-amber-300/[0.07] px-3 py-2 text-[10px] font-bold text-amber-100">{notice}</div> : null}

          {allSetsComplete ? (
            <button type="button" onClick={() => setDrawerMode("finish")} className="mt-3 h-12 w-full rounded-2xl border border-fuchsia-300/25 bg-fuchsia-300/12 text-sm font-black text-fuchsia-100">Review Workout with AI Coach</button>
          ) : null}
        </div>
      </section>

      <WorkoutFocusDrawer
        open={Boolean(drawerMode)}
        mode={drawerMode}
        exercise={currentExercise}
        session={session}
        timerPreferences={timerPreferences}
        onTimerPreferencesChange={setTimerPreferences}
        onClose={() => setDrawerMode("")}
        onReplay={() => {
          onReplay?.();
          setDrawerMode("");
        }}
        onSwap={openSwapFlow}
        onSkip={skipExercise}
        onComeBackLater={comeBackLater}
        onFinish={() => {
          setDrawerMode("");
          onFinish?.();
        }}
      />
    </>
  );
}
