// src/components/customer-health/ActiveWorkoutSessionDrawer.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  addSetToExercise,
  advanceSessionTimer,
  applyCoachRecommendationDecision,
  completeActiveSet,
  createWorkoutSessionFromPlannerItem,
  finishWorkoutSession,
  formatSeconds,
  markExerciseSkipped,
  markExerciseSubstituted,
  moveToExercise,
  removeSetFromExercise,
  startActiveSet,
  startRestTimer,
  stopRestTimer,
  toggleRestTimer,
  toggleSessionPause,
  updateCompletedWorkoutSession,
  updateExerciseField,
  updateExerciseTarget,
  updateSessionTimer,
  updateSetField,
  validateWorkoutSessionForFinish,
} from "./healthWorkoutSession";

import {
  buildNextSetSuggestion,
  buildTrainerNudge,
} from "./healthTrainerLogic";

import { getExerciseKnowledge } from "./healthExerciseKnowledge";

import {
  buildExerciseIntroSpeech,
  speakCoachText,
  stopCoachVoice,
} from "./healthCoachVoice";

import {
  ensureDynamicPreparation,
  skipWarmup,
  toggleWarmupItem,
} from "./healthWarmupCooldown";

import TrainerExerciseIntroCard from "./TrainerExerciseIntroCard";
import CoachVoiceSettingsCard from "./CoachVoiceSettingsCard";
import TrainerNudgeCard from "./TrainerNudgeCard";
import WorkoutProgressionCard from "./WorkoutProgressionCard";
import PersonalRecordsCard from "./PersonalRecordsCard";
import PostWorkoutReportCard from "./PostWorkoutReportCard";
import LiveWorkoutAdaptationDrawer from "./LiveWorkoutAdaptationDrawer";
import {
  buildAdaptiveExercise,
  buildPostWorkoutWrapUp,
  buildPreWorkoutBriefing,
  trackWorkoutAdaptationKpi,
} from "./healthWorkoutAdaptation";

const ACTIVE_WORKOUT_STORAGE_KEY =
  "syncworks_health_active_workout_v1";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function readPersistedWorkout() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(
      ACTIVE_WORKOUT_STORAGE_KEY
    );

    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      !parsed.session ||
      parsed.session.status !== "active"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function persistWorkoutSession(session, plannerItem) {
  if (
    typeof window === "undefined" ||
    !session ||
    session.status !== "active"
  ) {
    return;
  }

  try {
    window.localStorage.setItem(
      ACTIVE_WORKOUT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        persisted_at: new Date().toISOString(),
        planner_item_id:
          plannerItem?.id ||
          session.planner_item_id ||
          "",
        workout_id:
          plannerItem?.workout_id ||
          session.workout_id ||
          "",
        session,
      })
    );
  } catch {
    // Local persistence is best effort.
  }
}

function clearPersistedWorkout() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(
      ACTIVE_WORKOUT_STORAGE_KEY
    );
  } catch {
    // Local persistence is best effort.
  }
}

function persistedWorkoutMatches(
  persisted,
  plannerItem
) {
  if (!persisted?.session || !plannerItem) {
    return false;
  }

  const plannerId = String(plannerItem.id || "");
  const workoutId = String(
    plannerItem.workout_id || plannerItem.id || ""
  );

  return Boolean(
    (plannerId &&
      String(
        persisted.planner_item_id ||
          persisted.session.planner_item_id ||
          ""
      ) === plannerId) ||
      (workoutId &&
        String(
          persisted.workout_id ||
            persisted.session.workout_id ||
            ""
        ) === workoutId)
  );
}

function restorePersistedSession(
  persisted
) {
  const session = persisted?.session;

  if (!session || session.status !== "active") {
    return null;
  }

  const persistedAt = new Date(
    persisted.persisted_at || 0
  ).getTime();

  if (!Number.isFinite(persistedAt)) {
    return session;
  }

  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - persistedAt) / 1000)
  );

  return advanceSessionTimer(
    session,
    elapsedSeconds
  );
}

function DynamicWarmupCard({
  plan,
  onToggle,
  onSkip,
}) {
  if (
    !plan ||
    plan.completed ||
    plan.skipped
  ) {
    return null;
  }

  const completedCount = (plan.items || []).filter(
    (item) => item.completed
  ).length;

  return (
    <section className="rounded-[1.35rem] border border-amber-300/20 bg-[linear-gradient(135deg,rgba(251,191,36,0.10),rgba(34,211,238,0.06))] p-3 shadow-[0_12px_36px_rgba(0,0,0,0.18)] sm:rounded-[2rem] sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-200">
            Dynamic Preparation
          </div>

          <h3 className="mt-1 text-lg font-black text-white">
            {plan.title}
          </h3>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            {plan.reason}
          </p>
        </div>

        <div className="shrink-0 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-black text-amber-100">
          {Math.max(
            1,
            Math.round(
              Number(plan.estimated_seconds || 0) / 60
            )
          )}{" "}
          min
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {(plan.items || []).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggle(item.id)}
            className={cx(
              "flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition",
              item.completed
                ? "border-lime-300/25 bg-lime-300/10"
                : item.type === "safety"
                ? "border-rose-300/20 bg-rose-300/[0.07]"
                : "border-white/10 bg-black/20"
            )}
          >
            <div
              className={cx(
                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-black",
                item.completed
                  ? "border-lime-300/40 bg-lime-300/20 text-lime-100"
                  : "border-white/15 bg-white/[0.04] text-slate-500"
              )}
            >
              {item.completed ? "âœ“" : ""}
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-sm font-black text-white">
                {item.label}
              </div>

              <div className="mt-1 text-xs leading-5 text-slate-400">
                {item.detail}
              </div>
            </div>

            <div className="shrink-0 text-[10px] font-black text-slate-500">
              {item.seconds}s
            </div>
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="text-xs font-bold text-slate-400">
          {completedCount}/{plan.items?.length || 0} complete
        </div>

        <button
          type="button"
          onClick={onSkip}
          className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black text-slate-300"
        >
          Skip Warm-up
        </button>
      </div>
    </section>
  );
}

function ScoreSelect({
  label,
  value,
  onChange,
  options,
}) {
  return (
    <label className="block rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm font-bold text-white outline-none focus:border-cyan-300/40"
      >
        <option value="">Select</option>

        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatTile({ label, value, tone = "cyan" }) {
  const tones = {
    cyan: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
    emerald:
      "border-lime-300/20 bg-lime-300/10 text-lime-100",
    amber:
      "border-amber-300/20 bg-amber-300/10 text-amber-100",
    purple:
      "border-fuchsia-300/20 bg-fuchsia-300/10 text-fuchsia-100",
    rose:
      "border-rose-300/20 bg-rose-300/10 text-rose-100",
    slate:
      "border-white/10 bg-white/[0.04] text-slate-200",
  };

  return (
    <div
      className={cx(
        "rounded-2xl border px-3 py-3",
        tones[tone] || tones.cyan
      )}
    >
      <div className="text-[10px] font-black uppercase tracking-[0.16em] opacity-75">
        {label}
      </div>

      <div className="mt-1 text-lg font-black">
        {value}
      </div>
    </div>
  );
}

function MobileStat({
  label,
  value,
  tone = "cyan",
}) {
  const tones = {
    cyan: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
    emerald:
      "border-lime-300/20 bg-lime-300/10 text-lime-100",
    amber:
      "border-amber-300/20 bg-amber-300/10 text-amber-100",
    purple:
      "border-fuchsia-300/20 bg-fuchsia-300/10 text-fuchsia-100",
  };

  return (
    <div
      className={cx(
        "min-w-0 rounded-xl border px-1.5 py-2 text-center",
        tones[tone] || tones.cyan
      )}
    >
      <div className="truncate text-[8px] font-black uppercase tracking-[0.1em] opacity-75">
        {label}
      </div>

      <div className="mt-0.5 truncate text-sm font-black">
        {value}
      </div>
    </div>
  );
}

function SetCompletionSheet({
  open,
  exercise,
  durationSeconds,
  restActive = false,
  restRemainingSeconds = 0,
  suggestion,
  saving = false,
  onCancel,
  onSave,
}) {
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [rpe, setRpe] = useState("7");
  const [formQuality, setFormQuality] = useState("Good");
  const [pain, setPain] = useState("0");
  const [setType, setSetType] = useState("working");
  const [reachedFailure, setReachedFailure] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    if (!open || !exercise) return;

    setReps(
      exercise.current_target_reps ||
        suggestion?.target_reps ||
        suggestion?.reps ||
        exercise.planned_reps ||
        ""
    );

    setWeight(
      exercise.current_target_weight ||
        suggestion?.target_weight ||
        suggestion?.weight ||
        exercise.planned_weight ||
        ""
    );

    setRpe("7");
    setFormQuality("Good");
    setPain(exercise.pain_score || "0");
    setSetType("working");
    setReachedFailure(false);
    setAdvancedOpen(false);
  }, [
    open,
    exercise?.id,
    exercise?.current_target_reps,
    exercise?.current_target_weight,
    suggestion?.target_reps,
    suggestion?.target_weight,
    suggestion?.reps,
    suggestion?.weight,
  ]);

  if (!open || !exercise) return null;

  const targetWeight =
    exercise.current_target_weight ||
    exercise.planned_weight ||
    "";

  const targetReps =
    exercise.current_target_reps ||
    exercise.planned_reps ||
    "";

  function saveSet() {
    onSave({
      actual_reps: reps,
      actual_weight: weight,
      reps,
      weight,
      target_reps: targetReps,
      target_weight: targetWeight,
      planned_reps: exercise.planned_reps || "",
      planned_weight: exercise.planned_weight || "",
      rpe,
      ease_score: rpe,
      form_quality: formQuality,
      pain_score: pain,
      set_type: setType,
      reached_failure: reachedFailure,
      adjustment_source:
        exercise.target_adjustment_source || "",
      recommendation:
        exercise.last_recommendation?.recommendation || null,
      recommendation_accepted:
        exercise.last_recommendation?.accepted || false,
      recommendation_overridden:
        exercise.last_recommendation?.overridden || false,
      recommendation_decision:
        exercise.last_recommendation?.decision || "",
      recommendation_decided_at:
        exercise.last_recommendation?.decided_at || "",
    });
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/80 p-3 backdrop-blur-md sm:items-center">
      <button
        type="button"
        aria-label="Close set check-in"
        onClick={onCancel}
        className="absolute inset-0"
      />

      <section className="relative z-[131] max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[2rem] border border-lime-300/20 bg-[#07111f] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.7)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-lime-300">
              Set Complete
            </div>

            <h3 className="mt-1 truncate text-xl font-black text-white">
              {exercise.name}
            </h3>

            <div className="mt-1 text-xs text-slate-400">
              Set {(exercise.set_logs || []).length + 1}
              {" - "}
              {formatSeconds(durationSeconds)}
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2">
            <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-center text-xs font-black text-cyan-100">
              Goal: {targetWeight || "BW"} x {targetReps || "-"}
            </div>

            {restActive ? (
              <div className="rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-center">
                <div className="text-[8px] font-black uppercase tracking-[0.14em] text-amber-200">
                  Rest Running
                </div>
                <div className="mt-0.5 text-base font-black text-amber-100">
                  {formatSeconds(restRemainingSeconds)}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              Weight
            </div>

            <input
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              inputMode="decimal"
              placeholder="Bodyweight"
              className="mt-2 h-14 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-center text-xl font-black text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
            />
          </label>

          <label>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              Reps
            </div>

            <input
              value={reps}
              onChange={(event) => setReps(event.target.value)}
              inputMode="numeric"
              className="mt-2 h-14 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-center text-xl font-black text-white outline-none focus:border-cyan-300/40"
            />
          </label>
        </div>

        <div className="mt-4 rounded-2xl border border-fuchsia-300/15 bg-fuchsia-300/[0.06] p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-black text-white">
              Effort
            </div>

            <div className="text-sm font-black text-fuchsia-100">
              RPE {rpe}/10
            </div>
          </div>

          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={rpe}
            onChange={(event) => setRpe(event.target.value)}
            className="mt-3 w-full accent-fuchsia-400"
          />
        </div>

        <button
          type="button"
          onClick={() => setAdvancedOpen((current) => !current)}
          className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-xs font-black text-slate-200"
        >
          {advancedOpen ? "Hide More Details" : "More Details"}
        </button>

        {advancedOpen ? (
          <div className="mt-3 space-y-3 rounded-2xl border border-white/10 bg-black/20 p-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                Form quality
              </div>

              <div className="mt-2 grid grid-cols-3 gap-2">
                {["Good", "Fair", "Poor"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFormQuality(option)}
                    className={cx(
                      "rounded-xl border px-2 py-3 text-xs font-black",
                      formQuality === option
                        ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
                        : "border-white/10 bg-white/[0.03] text-slate-300"
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                Pain
              </div>

              <div className="mt-2 grid grid-cols-4 gap-2">
                {[
                  ["0", "None"],
                  ["1", "Mild"],
                  ["3", "Moderate"],
                  ["5", "Stop"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPain(value)}
                    className={cx(
                      "rounded-xl border px-2 py-3 text-[10px] font-black",
                      pain === value
                        ? value === "0"
                          ? "border-lime-300/30 bg-lime-300/10 text-lime-100"
                          : "border-rose-300/30 bg-rose-300/10 text-rose-100"
                        : "border-white/10 bg-white/[0.03] text-slate-300"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setSetType(
                    setType === "warmup"
                      ? "working"
                      : "warmup"
                  )
                }
                className={cx(
                  "rounded-xl border px-3 py-3 text-xs font-black",
                  setType === "warmup"
                    ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                    : "border-white/10 bg-white/[0.03] text-slate-300"
                )}
              >
                {setType === "warmup"
                  ? "Warm-up Set"
                  : "Working Set"}
              </button>

              <button
                type="button"
                onClick={() =>
                  setReachedFailure((current) => !current)
                }
                className={cx(
                  "rounded-xl border px-3 py-3 text-xs font-black",
                  reachedFailure
                    ? "border-rose-300/30 bg-rose-300/10 text-rose-100"
                    : "border-white/10 bg-white/[0.03] text-slate-300"
                )}
              >
                {reachedFailure
                  ? "Reached Failure"
                  : "Not to Failure"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-[0.75fr_1.25fr] gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-slate-200"
          >
            Back
          </button>

          <button
            type="button"
            onClick={saveSet}
            disabled={saving}
            className="health-primary-action h-12 rounded-2xl border text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving Set..." : "Save Set"}
          </button>
        </div>
      </section>
    </div>
  );
}

function SetHistory({
  exercise,
  onUpdateSet,
  onRemoveSet,
  onTargetChange,
  onCopyPrevious,
  targetControlsRef,
}) {
  const logs = Array.isArray(exercise?.set_logs)
    ? exercise.set_logs
    : [];

  const plannedSets = Math.max(
    1,
    Number(exercise?.planned_sets || 1)
  );

  const currentIndex = logs.length;

  const rows = Array.from(
    { length: Math.max(plannedSets, logs.length) },
    (_, index) => ({
      index,
      setNumber: index + 1,
      log: logs[index] || null,
    })
  );

  const targetWeight =
    exercise?.current_target_weight ??
    exercise?.planned_weight ??
    "";

  const targetReps =
    exercise?.current_target_reps ??
    exercise?.planned_reps ??
    "";

  function bump(value, amount, minimum = 0) {
    const current = Number(value || 0);
    return String(Math.max(minimum, current + amount));
  }

  return (
    <div className="space-y-3">
      <div
        ref={targetControlsRef}
        className="rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/[0.07] p-3"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-200">
              Current Set Target
            </div>

            <div className="mt-1 text-xs text-slate-400">
              Changes carry forward to the remaining sets.
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {logs.length ? (
              <button
                type="button"
                onClick={onCopyPrevious}
                className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[10px] font-black text-cyan-100"
              >
                Copy Last Set
              </button>
            ) : null}

            {exercise?.target_adjustment_source ? (
              <div className="rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-fuchsia-100">
                {exercise.target_adjustment_source === "coach"
                  ? "Coach adjusted"
                  : "Adjusted"}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
              Weight
            </div>

            <div className="mt-2 grid grid-cols-[44px_1fr_44px] gap-2">
              <button
                type="button"
                onClick={() =>
                  onTargetChange({
                    weight: bump(targetWeight, -5, 0),
                    reps: targetReps,
                    source: "user",
                  })
                }
                className="h-11 rounded-xl border border-white/10 bg-white/[0.05] text-sm font-black text-white"
              >
                -5
              </button>

<input
                value={targetWeight}
                onChange={(event) =>
                  onTargetChange({
                    weight: event.target.value,
                    reps: targetReps,
                    source: "user",
                  })
                }
                inputMode="decimal"
                placeholder="BW"
                className="h-11 min-w-0 rounded-xl border border-white/10 bg-slate-950 px-2 text-center text-base font-black text-white outline-none focus:border-fuchsia-300/40"
              />

              <button
                type="button"
                onClick={() =>
                  onTargetChange({
                    weight: bump(targetWeight, 5, 0),
                    reps: targetReps,
                    source: "user",
                  })
                }
                className="h-11 rounded-xl border border-white/10 bg-white/[0.05] text-sm font-black text-white"
              >
                +5
              </button>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
              Reps
            </div>

            <div className="mt-2 grid grid-cols-[44px_1fr_44px] gap-2">
              <button
                type="button"
                onClick={() =>
                  onTargetChange({
                    weight: bump(targetWeight, -5, 0),
                    reps: targetReps,
                    source: "user",
                  })
                }
                className="h-11 rounded-xl border border-white/10 bg-white/[0.05] text-sm font-black text-white"
              >
                -5
              </button>

<input
                value={targetReps}
                onChange={(event) =>
                  onTargetChange({
                    weight: targetWeight,
                    reps: event.target.value,
                    source: "user",
                  })
                }
                inputMode="numeric"
                className="h-11 min-w-0 rounded-xl border border-white/10 bg-slate-950 px-2 text-center text-base font-black text-white outline-none focus:border-fuchsia-300/40"
              />

              <button
                type="button"
                onClick={() =>
                  onTargetChange({
                    weight: targetWeight,
                    reps: bump(targetReps, 1, 1),
                    source: "user",
                  })
                }
                className="h-11 rounded-xl border border-white/10 bg-white/[0.05] text-sm font-black text-white"
              >
                +1
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map(({ setNumber, index, log }) => {
          const isCurrent = !log && index === currentIndex;

          return (
            <div
              key={log?.id || `planned_set_${setNumber}`}
              className={cx(
                "rounded-2xl border p-3",
                log
                  ? "border-lime-300/20 bg-lime-300/[0.07]"
                  : isCurrent
                  ? "border-cyan-300/30 bg-cyan-300/[0.09] shadow-[0_0_28px_rgba(34,211,238,0.08)]"
                  : "border-white/10 bg-white/[0.025]"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={cx(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-black",
                      log
                        ? "border-lime-300/25 bg-lime-300/10 text-lime-100"
                        : isCurrent
                        ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
                        : "border-white/10 bg-white/[0.04] text-slate-400"
                    )}
                  >
                    {setNumber}
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm font-black text-white">
                      Set {setNumber}
                    </div>

                    {log ? (
                      <div className="mt-0.5 text-sm text-slate-300">
                        {log.actual_weight ||
                          log.weight ||
                          "Bodyweight"}{" "}
                         x {" "}
                        {log.actual_reps ||
                          log.reps ||
                          "-"}
                        {log.rpe || log.ease_score
                          ? ` · RPE ${log.rpe || log.ease_score}`
                          : ""}
                        {log.set_type === "warmup"
                          ? " · Warm-up"
                          : ""}
                        {log.reached_failure
                          ? " · Failure"
                          : ""}
                      </div>
                    ) : (
                      <div className="mt-0.5 text-sm text-slate-400">
                        Goal: {targetWeight || "Bodyweight"}  x {" "}
                        {targetReps || "-"}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className={cx(
                    "shrink-0 rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em]",
                    log
                      ? "border-lime-300/20 bg-lime-300/10 text-lime-100"
                      : isCurrent
                      ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
                      : "border-white/10 bg-white/[0.04] text-slate-500"
                  )}
                >
                  {log ? "Complete" : isCurrent ? "Current" : "Planned"}
                </div>
              </div>

              {log ? (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                  <input
                    value={log.actual_reps || log.reps || ""}
                    onChange={(event) =>
                      onUpdateSet(
                        log.id,
                        "actual_reps",
                        event.target.value
                      )
                    }
                    aria-label={`Set ${setNumber} reps`}
                    className="h-10 min-w-0 rounded-xl border border-white/10 bg-slate-950 px-2 text-sm font-bold text-white outline-none"
                  />

                  <input
                    value={log.actual_weight || log.weight || ""}
                    onChange={(event) =>
                      onUpdateSet(
                        log.id,
                        "actual_weight",
                        event.target.value
                      )
                    }
                    aria-label={`Set ${setNumber} weight`}
                    className="h-10 min-w-0 rounded-xl border border-white/10 bg-slate-950 px-2 text-sm font-bold text-white outline-none"
                  />

                  <input
                    value={log.rpe || log.ease_score || ""}
                    onChange={(event) =>
                      onUpdateSet(
                        log.id,
                        "rpe",
                        event.target.value
                      )
                    }
                    aria-label={`Set ${setNumber} RPE`}
                    placeholder="RPE"
                    className="h-10 min-w-0 rounded-xl border border-white/10 bg-slate-950 px-2 text-sm font-bold text-white outline-none"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSet(
                        log.id,
                        "set_type",
                        log.set_type === "warmup"
                          ? "working"
                          : "warmup"
                      )
                    }
                    className={cx(
                      "h-10 rounded-xl border px-3 text-[10px] font-black",
                      log.set_type === "warmup"
                        ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                        : "border-white/10 bg-white/[0.04] text-slate-300"
                    )}
                  >
                    {log.set_type === "warmup"
                      ? "Warm-up"
                      : "Working"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSet(
                        log.id,
                        "reached_failure",
                        !log.reached_failure
                      )
                    }
                    className={cx(
                      "h-10 rounded-xl border px-3 text-[10px] font-black",
                      log.reached_failure
                        ? "border-rose-300/25 bg-rose-300/10 text-rose-100"
                        : "border-white/10 bg-white/[0.04] text-slate-300"
                    )}
                  >
                    Failure
                  </button>

                  <button
                    type="button"
                    onClick={() => onRemoveSet(log.id)}
                    className="col-span-2 h-10 rounded-xl border border-rose-300/20 bg-rose-300/10 px-3 text-xs font-black text-rose-100 sm:col-span-1"
                  >
                    Remove
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FinishReviewPanel({
  validation,
  session,
  saving = false,
  onBack,
  onSave,
}) {
  const [cooldownChoice, setCooldownChoice] =
    useState("guided");
  const [energy, setEnergy] = useState("Good");
  const [difficulty, setDifficulty] =
    useState("Challenging");
  const [overallForm, setOverallForm] =
    useState("Good");
  const [painAfterWorkout, setPainAfterWorkout] =
    useState("None");
  const [painLocation, setPainLocation] =
    useState("");
  const [notes, setNotes] = useState("");

  const exercises = Array.isArray(session?.exercises)
    ? session.exercises
    : [];

  const completedExercises = exercises.filter(
    (exercise) =>
      (exercise.set_logs || []).length > 0 ||
      exercise.completed
  );

  const skippedExercises = exercises.filter(
    (exercise) => exercise.skipped
  );

  const allSetLogs = exercises.flatMap(
    (exercise) =>
      (exercise.set_logs || []).map((log) => ({
        ...log,
        exercise_name:
          exercise.substitute_name ||
          exercise.name ||
          "Exercise",
      }))
  );

  const trainedMuscles = Array.from(
    new Set(
      completedExercises.flatMap((exercise) => [
        ...(exercise.primary_muscles || []),
        ...(exercise.secondary_muscles || []),
      ])
    )
  ).slice(0, 6);

  const painLogs = allSetLogs.filter(
    (log) => Number(log.pain_score || 0) > 0
  );

  const highEffortSets = allSetLogs.filter(
    (log) => Number(log.rpe || log.ease_score || 0) >= 9
  );

  const incompleteSetLogs = allSetLogs.filter((log) => {
    const reps =
      log.actual_reps ?? log.reps ?? "";
    const weight =
      log.actual_weight ?? log.weight ?? "";
    const rpe =
      log.rpe ?? log.ease_score ?? "";

    return (
      String(reps).trim() === "" ||
      String(weight).trim() === "" ||
      String(rpe).trim() === ""
    );
  });

  const totalVolume = allSetLogs.reduce(
    (total, log) => {
      const weight = Number(
        log.actual_weight ?? log.weight ?? 0
      );
      const reps = Number(
        log.actual_reps ?? log.reps ?? 0
      );

      if (
        !Number.isFinite(weight) ||
        !Number.isFinite(reps)
      ) {
        return total;
      }

      return total + weight * reps;
    },
    0
  );

  const bestSet = allSetLogs.reduce(
    (best, log) => {
      const weight = Number(
        log.actual_weight ?? log.weight ?? 0
      );
      const reps = Number(
        log.actual_reps ?? log.reps ?? 0
      );
      const score =
        Number.isFinite(weight) &&
        Number.isFinite(reps)
          ? weight * reps
          : 0;

      if (!best || score > best.score) {
        return {
          score,
          weight,
          reps,
          exercise_name: log.exercise_name,
        };
      }

      return best;
    },
    null
  );

  const activeRatio =
    Number(session?.total_seconds || 0) > 0
      ? Math.round(
          (Number(session.active_seconds || 0) /
            Number(session.total_seconds || 1)) *
            100
        )
      : 0;

  const nextRecommendation =
    painLogs.length > 0 ||
    painAfterWorkout !== "None"
      ? "Reduce load, use a pain-free variation, and prioritize recovery before repeating this session."
      : highEffortSets.length > 1 ||
        difficulty === "Max Effort"
      ? "Keep the next session controlled. Repeat the load or reduce volume before progressing."
      : overallForm === "Needs Work"
      ? "Repeat these movements with lighter weight and cleaner technique before adding load."
      : Number(session?.completed_sets || 0) >= 8
      ? "You handled solid volume. Progress one variable next time: load, reps, or control."
      : "Build consistency first, then increase load or reps gradually.";

  const cooldownOptions = [
    {
      id: "guided",
      label: "Guided cooldown",
      detail:
        "3-5 minutes of breathing, walking, and targeted mobility.",
    },
    {
      id: "quick",
      label: "Quick reset",
      detail:
        "60-90 seconds of breathing and one gentle stretch.",
    },
    {
      id: "skip",
      label: "Skip cooldown",
      detail: "Save now and continue with your day.",
    },
  ];

  const reviewRows = [
    {
      label: "Energy",
      value: energy,
      setter: setEnergy,
      options: ["Low", "Good", "High"],
    },
    {
      label: "Difficulty",
      value: difficulty,
      setter: setDifficulty,
      options: ["Easy", "Challenging", "Max Effort"],
    },
    {
      label: "Overall Form",
      value: overallForm,
      setter: setOverallForm,
      options: ["Good", "Fair", "Needs Work"],
    },
    {
      label: "Pain After Workout",
      value: painAfterWorkout,
      setter: setPainAfterWorkout,
      options: ["None", "Mild", "Moderate", "Stop"],
    },
  ];

  function submitWorkout() {
    onSave?.({
      cooldown_choice: cooldownChoice,
      cooldown_completed: cooldownChoice !== "skip",
      cooldown_skipped: cooldownChoice === "skip",
      completion_notes: notes.trim(),
      trained_muscles: trainedMuscles,
      active_ratio_percent: activeRatio,
      pain_flags:
        painLogs.length +
        (painAfterWorkout === "None" ? 0 : 1),
      pain_after_workout: painAfterWorkout,
      pain_location: painLocation.trim(),
      high_effort_sets: highEffortSets.length,
      energy,
      difficulty,
      overall_form: overallForm,
      total_volume: Math.round(totalVolume),
      skipped_exercises: skippedExercises.length,
      incomplete_set_logs: incompleteSetLogs.length,
      next_recommendation: nextRecommendation,
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[2rem] border border-amber-300/25 bg-amber-300/10 p-4 sm:p-5">
        <div className="text-xs font-black uppercase tracking-[0.22em] text-amber-100">
          Finish Workout
        </div>

        <h3 className="mt-2 text-2xl font-black text-white">
          Review, recover, and save
        </h3>

        <p className="mt-2 text-sm leading-6 text-amber-50/80">
          Confirm the workout data and tell the coach how
          the session felt before it updates your plan.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile
            label="Sets"
            value={session.completed_sets || 0}
            tone="emerald"
          />

          <StatTile
            label="Volume"
            value={
              totalVolume > 0
                ? Math.round(totalVolume).toLocaleString()
                : "-"
            }
            tone="cyan"
          />

          <StatTile
            label="Active"
            value={formatSeconds(session.active_seconds)}
            tone="emerald"
          />

          <StatTile
            label="Active Ratio"
            value={`${activeRatio}%`}
            tone="purple"
          />
        </div>
      </div>

      {(validation?.missing?.length ||
        incompleteSetLogs.length > 0) ? (
        <div className="rounded-[2rem] border border-rose-300/25 bg-rose-300/10 p-4">
          <div className="text-sm font-black text-rose-100">
            Check before saving
          </div>

          <div className="mt-2 space-y-2 text-sm leading-6 text-rose-50">
            {validation?.missing?.map((item) => (
              <div key={item.id}>{item.label}</div>
            ))}

            {incompleteSetLogs.length > 0 ? (
              <div>
                {incompleteSetLogs.length} logged set
                {incompleteSetLogs.length === 1
                  ? ""
                  : "s"}{" "}
                are missing reps, weight, or RPE.
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onBack}
            disabled={saving}
            className="mt-3 h-11 w-full rounded-2xl border border-rose-200/20 bg-black/20 text-sm font-black text-rose-50"
          >
            Return to Workout and Fix
          </button>
        </div>
      ) : null}

      <div className="rounded-[2rem] border border-cyan-300/20 bg-cyan-300/[0.07] p-4">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
          Session Check-In
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {reviewRows.map((row) => (
            <div
              key={row.label}
              className="rounded-2xl border border-white/10 bg-black/20 p-3"
            >
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                {row.label}
              </div>

              <div className="mt-2 grid grid-cols-3 gap-2">
                {row.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => row.setter(option)}
                    className={cx(
                      "min-h-11 rounded-xl border px-2 text-[10px] font-black sm:text-xs",
                      row.value === option
                        ? "border-cyan-300/35 bg-cyan-300/12 text-cyan-100"
                        : "border-white/10 bg-white/[0.03] text-slate-300"
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {painAfterWorkout !== "None" ? (
          <label className="mt-3 block">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-200">
              Pain location or movement
            </div>

            <input
              value={painLocation}
              onChange={(event) =>
                setPainLocation(event.target.value)
              }
              placeholder="Example: front of right hip during squats"
              className="mt-2 h-12 w-full rounded-2xl border border-rose-300/20 bg-slate-950 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-rose-300/45"
            />
          </label>
        ) : null}
      </div>

      <div className="rounded-[2rem] border border-cyan-300/20 bg-cyan-300/[0.07] p-4">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
          Choose Your Cooldown
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {cooldownOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() =>
                setCooldownChoice(option.id)
              }
              className={cx(
                "rounded-2xl border p-3 text-left transition",
                cooldownChoice === option.id
                  ? "border-lime-300/35 bg-lime-300/15"
                  : "border-white/10 bg-black/20"
              )}
            >
              <div className="text-sm font-black text-white">
                {option.label}
              </div>

              <div className="mt-1 text-xs leading-5 text-slate-400">
                {option.detail}
              </div>
            </button>
          ))}
        </div>

        {cooldownChoice === "guided" ? (
          <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-lime-200">
              {session.cooldown_plan?.title ||
                "Guided cooldown"}
            </div>

            <div className="mt-1 text-xs leading-5 text-slate-400">
              {session.cooldown_plan?.reason ||
                "Matched to the muscles trained today."}
            </div>

            <div className="mt-3 space-y-2">
              {(session.cooldown_plan?.items || []).map(
                (item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-black text-white">
                        {item.label}
                      </div>

                      <div className="text-[10px] font-black text-slate-500">
                        {item.seconds}s
                      </div>
                    </div>

                    <div className="mt-1 text-xs leading-5 text-slate-400">
                      {item.detail}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        ) : null}

        {cooldownChoice === "quick" ? (
          <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm leading-6 text-slate-200">
            Take five slow breaths, lower your heart
            rate, and hold one comfortable stretch for
            30 seconds per side.
          </div>
        ) : null}
      </div>

      <div className="rounded-[2rem] border border-fuchsia-300/20 bg-fuchsia-300/[0.06] p-4">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-fuchsia-100">
          Coach Recap
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
              Performance
            </div>

            <div className="mt-1 text-sm font-black text-white">
              {session.completed_sets || 0} sets across{" "}
              {completedExercises.length} exercise
              {completedExercises.length === 1
                ? ""
                : "s"}
              .
            </div>

            {bestSet?.score > 0 ? (
              <div className="mt-2 text-xs leading-5 text-slate-400">
                Best work set: {bestSet.exercise_name},{" "}
                {bestSet.weight} x {bestSet.reps}.
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
              Next Move
            </div>

            <div className="mt-1 text-sm font-black text-white">
              {nextRecommendation}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <StatTile
            label="Skipped"
            value={skippedExercises.length}
            tone="rose"
          />
          <StatTile
            label="Pain Flags"
            value={
              painLogs.length +
              (painAfterWorkout === "None" ? 0 : 1)
            }
            tone="amber"
          />
          <StatTile
            label="RPE 9+"
            value={highEffortSets.length}
            tone="purple"
          />
        </div>

        <label className="mt-3 block">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            Optional workout note
          </div>

          <textarea
            value={notes}
            onChange={(event) =>
              setNotes(event.target.value)
            }
            rows={3}
            placeholder="Anything the coach should remember for next time?"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-fuchsia-300/40"
          />
        </label>
      </div>

      {validation?.warnings?.length ? (
        <details className="rounded-2xl border border-white/10 bg-black/20">
          <summary className="cursor-pointer px-4 py-3 text-sm font-black text-white">
            Review helpful details
          </summary>

          <div className="space-y-2 px-4 pb-4">
            {validation.warnings.map((item) => (
              <div
                key={item.id}
                className="text-sm leading-6 text-slate-400"
              >
                {item.label}
              </div>
            ))}
          </div>
        </details>
      ) : null}

      <div className="grid grid-cols-[0.75fr_1.25fr] gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={saving}
          className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-slate-200 disabled:opacity-40"
        >
          Go Back
        </button>

        <button
          type="button"
          onClick={submitWorkout}
          disabled={saving}
          className="health-primary-action h-12 rounded-2xl border text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? "Saving Workout..."
            : "Save Workout and View Recap"}
        </button>
      </div>
    </div>
  );
}


export default function ActiveWorkoutSessionDrawer({
  open,
  onClose,
  plannerItem,
  workouts,
  snapshot,
  setSnapshot,
  history,
  setHistory,
}) {
  const [session, setSession] = useState(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [finishMessage, setFinishMessage] = useState("");
  const [savingWorkout, setSavingWorkout] =
    useState(false);
  const [savingSet, setSavingSet] =
    useState(false);
  const [editAfterFinish, setEditAfterFinish] =
    useState(false);
  const [setCheckInOpen, setSetCheckInOpen] =
    useState(false);
  const [
    pendingSetDurationSeconds,
    setPendingSetDurationSeconds,
  ] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [adaptationMode, setAdaptationMode] =
    useState("");
  const [modifyMenuOpen, setModifyMenuOpen] =
    useState(false);
  const preWorkoutBriefingRef = useRef("");
  const initializedWorkoutKeyRef = useRef("");
  const latestSessionRef = useRef(null);

  const lastExerciseCueRef = useRef("");
  const lastRestCueRef = useRef("");
  const targetControlsRef = useRef(null);

  useEffect(() => {
    latestSessionRef.current = session;
  }, [session]);

  useEffect(() => {
    if (!open || !plannerItem) return;

    const workoutKey = String(
      plannerItem.id ||
        plannerItem.workout_id ||
        plannerItem.workout_name ||
        ""
    );

    if (
      initializedWorkoutKeyRef.current === workoutKey &&
      session
    ) {
      return;
    }

    const persisted = readPersistedWorkout();
    const restored =
      persistedWorkoutMatches(
        persisted,
        plannerItem
      )
        ? restorePersistedSession(persisted)
        : null;

    if (persisted && !restored) {
      clearPersistedWorkout();
    }

    const initializedSession =
      ensureDynamicPreparation(
        restored ||
          createWorkoutSessionFromPlannerItem({
            plannerItem,
            workouts,
          }),
        snapshot || {}
      );

    setSession(initializedSession);

    initializedWorkoutKeyRef.current = workoutKey;
    setReviewMode(false);
    setFinishMessage(
      restored?.pending_set_logging
        ? "Workout restored. Finish logging your completed set while rest continues."
        : restored
        ? "Active workout restored from this device."
        : ""
    );
    setSavingWorkout(false);
    setSavingSet(false);
    setEditAfterFinish(false);
    setSetCheckInOpen(
      Boolean(initializedSession?.pending_set_logging)
    );
    setPendingSetDurationSeconds(
      Number(
        initializedSession?.pending_set_duration_seconds || 0
      )
    );
    setDetailsOpen(false);
    setAdaptationMode("");
    setModifyMenuOpen(false);
    preWorkoutBriefingRef.current = "";
    lastExerciseCueRef.current = "";
    lastRestCueRef.current = "";
  }, [open, plannerItem, workouts, session, snapshot]);

  useEffect(() => {
    if (
      !open ||
      !session ||
      session.status !== "active"
    ) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setSession((previous) =>
        previous &&
        previous.status === "active"
          ? updateSessionTimer(previous)
          : previous
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [open, session?.id, session?.status]);

  useEffect(() => {
    if (!session) return;

    if (session.status === "active") {
      persistWorkoutSession(
        session,
        plannerItem
      );
      return;
    }

    clearPersistedWorkout();
  }, [session, plannerItem]);

  useEffect(() => {
    if (!open || !session?.id) {
      return undefined;
    }

    let hiddenAt = 0;

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();

        persistWorkoutSession(
          latestSessionRef.current,
          plannerItem
        );

        return;
      }

      if (!hiddenAt) return;

      const elapsedSeconds = Math.max(
        0,
        Math.floor((Date.now() - hiddenAt) / 1000)
      );

      hiddenAt = 0;

      setSession((previous) =>
        previous
          ? advanceSessionTimer(
              previous,
              elapsedSeconds
            )
          : previous
      );
    }

    function handlePageHide() {
      persistWorkoutSession(
        latestSessionRef.current,
        plannerItem
      );
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    window.addEventListener(
      "pagehide",
      handlePageHide
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      window.removeEventListener(
        "pagehide",
        handlePageHide
      );
    };
  }, [open, session?.id, plannerItem]);

  useEffect(() => {
    if (!open) stopCoachVoice();

    return () => stopCoachVoice();
  }, [open]);

  const currentExercise = useMemo(() => {
    if (!Array.isArray(session?.exercises)) return null;

    return (
      session.exercises[
        session.current_exercise_index || 0
      ] || null
    );
  }, [session]);

  const isTimedExercise = useMemo(() => {
    if (!currentExercise) return false;

    const searchable = [
      currentExercise.name,
      currentExercise.planned_reps,
      currentExercise.current_target_reps,
      currentExercise.category,
      currentExercise.movement_pattern,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return /sec|second|min|minute|timed|hold|plank|carry|wall sit|isometric|stretch|mobility|battle rope|jump rope|interval/.test(
      searchable
    );
  }, [currentExercise]);

  const currentSuggestion = useMemo(
    () =>
      currentExercise
        ? buildNextSetSuggestion(
            currentExercise,
            session
          )
        : {},
    [currentExercise, session]
  );

  const validation = useMemo(
    () => validateWorkoutSessionForFinish(session || {}),
    [session]
  );

  const coachAudioMode =
    snapshot?.coach_audio_mode ||
    (snapshot?.audible_trainer_enabled
      ? "essential"
      : "off");

  const coachVoicePreference =
    snapshot?.coach_voice_preference || "female";

  const trainerNudge = useMemo(
    () =>
      buildTrainerNudge({
        session,
        exercise: currentExercise,
        audibleEnabled: coachAudioMode !== "off",
      }),
    [session, currentExercise, coachAudioMode]
  );

  const totalExercises = Array.isArray(session?.exercises)
    ? session.exercises.length
    : 0;

  const isCompleted =
    session?.status === "completed";

  const canEdit =
    !isCompleted || editAfterFinish;

  useEffect(() => {
    if (
      !open ||
      !session ||
      coachAudioMode === "off"
    ) {
      return;
    }

    const key = `preworkout:${session.id}`;

    if (preWorkoutBriefingRef.current === key) {
      return;
    }

    speakCoachText({
      text: buildPreWorkoutBriefing(session),
      audioMode: coachAudioMode,
      voicePreference: coachVoicePreference,
      rate: 0.98,
      pitch: 1,
      volume: 1,
    });

    trackWorkoutAdaptationKpi(
      "preworkout_briefing_played",
      {
        session_id: session.id,
        workout_name: session.workout_name,
        exercise_count: session.exercises?.length || 0,
      }
    );

    preWorkoutBriefingRef.current = key;
  }, [
    open,
    session?.id,
    coachAudioMode,
    coachVoicePreference,
  ]);

  useEffect(() => {
    if (
      !open ||
      !currentExercise ||
      coachAudioMode === "off"
    ) {
      return;
    }

    const key = `${session?.id}:${currentExercise.id}`;

    if (lastExerciseCueRef.current === key) return;

    const exerciseName =
      currentExercise.substituted &&
      currentExercise.substitute_name
        ? currentExercise.substitute_name
        : currentExercise.name;

    const knowledge =
      getExerciseKnowledge(exerciseName);

    speakCoachText({
      text: buildExerciseIntroSpeech(knowledge),
      audioMode: coachAudioMode,
      voicePreference: coachVoicePreference,
      rate: 1.02,
      pitch: 1,
      volume: 1,
    });

    lastExerciseCueRef.current = key;
  }, [
    open,
    currentExercise,
    coachAudioMode,
    coachVoicePreference,
    session?.id,
  ]);

  useEffect(() => {
    if (
      !open ||
      !session?.rest_active ||
      coachAudioMode === "off"
    ) {
      return;
    }

    const remaining = Number(
      session.rest_remaining_seconds || 0
    );

    const target = Number(
      session.rest_target_seconds || 0
    );

    let message = "";

    if (target > 30 && remaining === 30) {
      message = "Thirty seconds remaining.";
    } else if (remaining === 10) {
      message = "Ten seconds remaining.";
    } else if (target > 0 && remaining === 0) {
      const completedSets =
        currentExercise?.set_logs?.length || 0;

      const plannedSets = Number(
        currentExercise?.planned_sets || 0
      );

      const exerciseFinished =
        plannedSets > 0 &&
        completedSets >= plannedSets;

      const nextExercise =
        exerciseFinished &&
        Array.isArray(session.exercises) &&
        session.current_exercise_index <
          session.exercises.length - 1
          ? session.exercises[
              session.current_exercise_index + 1
            ]
          : null;

      message = nextExercise
        ? `Rest complete. Move to ${nextExercise.name} and tap start set.`
        : "Rest complete. Reset your position and tap start set.";
    }

    if (!message) return;

    const key = `${session.id}:${session.current_exercise_index}:${remaining}:${message}`;

    if (lastRestCueRef.current === key) return;

    speakCoachText({
      text: message,
      audioMode: coachAudioMode,
      voicePreference: coachVoicePreference,
      rate: 1.02,
      pitch: 1,
      volume: 1,
    });

    lastRestCueRef.current = key;

    if (remaining === 0) {
      setSession((previous) =>
        previous ? stopRestTimer(previous) : previous
      );
    }
  }, [
    open,
    session?.id,
    session?.rest_active,
    session?.rest_remaining_seconds,
    session?.rest_target_seconds,
    session?.current_exercise_index,
    currentExercise,
    coachAudioMode,
    coachVoicePreference,
  ]);

  function patchCoachSettings(patch = {}) {
    if (typeof setSnapshot !== "function") return;

    setSnapshot((previous) => {
      const audioMode =
        patch.audioMode ??
        previous?.coach_audio_mode ??
        (previous?.audible_trainer_enabled
          ? "essential"
          : "off");

      const voicePreference =
        patch.voicePreference ??
        previous?.coach_voice_preference ??
        "female";

      return {
        ...previous,
        coach_audio_mode: audioMode,
        coach_voice_preference:
          voicePreference,
        audible_trainer_enabled:
          audioMode !== "off",
        updated_at: new Date().toISOString(),
      };
    });
  }

  function replayExerciseCue() {
    if (!currentExercise) return;

    const exerciseName =
      currentExercise.substituted &&
      currentExercise.substitute_name
        ? currentExercise.substitute_name
        : currentExercise.name;

    speakCoachText({
      text: buildExerciseIntroSpeech(
        getExerciseKnowledge(exerciseName)
      ),
      audioMode: coachAudioMode,
      voicePreference: coachVoicePreference,
      rate: 1.02,
      pitch: 1,
      volume: 1,
    });
  }

  function replayNudge() {
    if (!trainerNudge) return;

    speakCoachText({
      text: [
        trainerNudge.title,
        trainerNudge.message,
      ]
        .filter(Boolean)
        .join(". "),
      audioMode: coachAudioMode,
      voicePreference: coachVoicePreference,
      rate: 1.02,
      pitch: 1,
      volume: 1,
    });
  }

  function useCoachRecommendation(
    recommendation
  ) {
    if (
      !session ||
      !currentExercise ||
      !recommendation
    ) {
      return;
    }

    setSession(
      applyCoachRecommendationDecision(
        session,
        currentExercise.id,
        recommendation,
        "accepted"
      )
    );
  }

  function keepCurrentTarget(
    recommendation
  ) {
    if (
      !session ||
      !currentExercise ||
      !recommendation
    ) {
      return;
    }

    setSession(
      applyCoachRecommendationDecision(
        session,
        currentExercise.id,
        recommendation,
        "keep_current"
      )
    );
  }

  function adjustTargetManually(
    recommendation
  ) {
    if (
      session &&
      currentExercise &&
      recommendation
    ) {
      setSession(
        applyCoachRecommendationDecision(
          session,
          currentExercise.id,
          recommendation,
          "manual",
          {
            weight:
              currentExercise.current_target_weight,
            reps:
              currentExercise.current_target_reps,
          }
        )
      );
    }

    window.setTimeout(() => {
      targetControlsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 50);
  }

  function patchCurrentTarget({
    weight,
    reps,
    source = "user",
  }) {
    if (
      !session ||
      !currentExercise ||
      !canEdit
    ) {
      return;
    }

    setSession(
      updateExerciseTarget(
        session,
        currentExercise.id,
        {
          weight,
          reps,
          source,
          applyToFutureSets: true,
        }
      )
    );
  }

  function copyPreviousSetTarget() {
    if (!currentExercise) return;

    const logs = Array.isArray(
      currentExercise.set_logs
    )
      ? currentExercise.set_logs
      : [];

    const previous = logs[logs.length - 1];

    if (!previous) return;

    patchCurrentTarget({
      weight:
        previous.actual_weight ??
        previous.weight ??
        currentExercise.current_target_weight ??
        "",
      reps:
        previous.actual_reps ??
        previous.reps ??
        currentExercise.current_target_reps ??
        "",
      source: "copied_previous_set",
    });
  }

  function applyProgressionRecommendation(
    recommendation
  ) {
    if (
      !recommendation ||
      !currentExercise ||
      !session
    ) {
      return;
    }

    patchCurrentTarget({
      weight:
        recommendation.weight ??
        currentExercise.current_target_weight ??
        "",
      reps:
        recommendation.reps ??
        currentExercise.current_target_reps ??
        "",
      source: `progression_${recommendation.action || "coach"}`,
    });
  }

  function togglePreparationItem(itemId) {
    if (!session || !itemId) return;

    setSession((previous) =>
      previous
        ? toggleWarmupItem(previous, itemId)
        : previous
    );
  }

  function skipPreparation() {
    if (!session) return;

    setSession((previous) =>
      previous
        ? skipWarmup(previous)
        : previous
    );
  }

  function startSet() {
    if (
      !session ||
      !currentExercise ||
      isCompleted ||
      session.paused ||
      session.rest_active
    ) {
      return;
    }

    setSession(
      startActiveSet(session, currentExercise.id)
    );

    setSetCheckInOpen(false);

    speakCoachText({
      text: `Set ${
        (currentExercise.set_logs || []).length + 1
      }. Start.`,
      audioMode: coachAudioMode,
      voicePreference: coachVoicePreference,
      rate: 1.04,
      pitch: 1,
      volume: 1,
    });
  }

  function requestCompleteSet() {
    if (!session?.set_active || !currentExercise) return;

    const completedDuration = Math.max(
      1,
      Number(session.current_set_seconds || 0)
    );

    if (isTimedExercise) {
      saveTimedSet({
        actual_reps: `${completedDuration} sec`,
        reps: `${completedDuration} sec`,
        actual_weight:
          currentExercise.current_target_weight ||
          currentExercise.planned_weight ||
          "",
        weight:
          currentExercise.current_target_weight ||
          currentExercise.planned_weight ||
          "",
        target_reps:
          currentExercise.current_target_reps ||
          currentExercise.planned_reps ||
          "",
        target_weight:
          currentExercise.current_target_weight ||
          currentExercise.planned_weight ||
          "",
        rpe: "7",
        ease_score: "7",
        form_quality: "Good",
        pain_score: "0",
        set_type: "working",
        reached_failure: false,
        timed_set: true,
        timed_seconds: completedDuration,
        set_duration_seconds: completedDuration,
      });

      return;
    }

    setPendingSetDurationSeconds(completedDuration);
    setSession((previous) => {
      if (!previous) return previous;

      return {
        ...startRestTimer(
          previous,
          currentExercise.rest_seconds || 60
        ),
        pending_set_logging: true,
        pending_set_exercise_id: currentExercise.id,
        pending_set_duration_seconds: completedDuration,
        pending_set_started_at: new Date().toISOString(),
      };
    });
    setSetCheckInOpen(true);

    speakCoachText({
      text: `Set complete. Rest starts now. Log your weight, reps, and effort while you recover.`,
      audioMode: coachAudioMode,
      voicePreference: coachVoicePreference,
      rate: 1.02,
      pitch: 1,
      volume: 1,
    });
  }

  function saveTimedSet(setLog) {
    if (!session || !currentExercise || savingSet) {
      return;
    }

    setSavingSet(true);

    const enrichedSetLog = {
      ...setLog,
      set_duration_seconds:
        setLog.set_duration_seconds ||
        pendingSetDurationSeconds ||
        session.current_set_seconds ||
        1,
      target_weight:
        setLog.target_weight ??
        currentExercise.current_target_weight ??
        currentExercise.planned_weight ??
        "",
      target_reps:
        setLog.target_reps ??
        currentExercise.current_target_reps ??
        currentExercise.planned_reps ??
        "",
      planned_weight:
        setLog.planned_weight ??
        currentExercise.planned_weight ??
        "",
      planned_reps:
        setLog.planned_reps ??
        currentExercise.planned_reps ??
        "",
    };

    const restWasAlreadyRunning =
      session.rest_active;
    const elapsedRestSeconds = Number(
      session.current_rest_seconds || 0
    );
    const remainingRestSeconds = Number(
      session.rest_remaining_seconds || 0
    );
    const originalRestStartedAt =
      session.rest_started_at || "";

    let nextSession = completeActiveSet(
      session,
      currentExercise.id,
      enrichedSetLog
    );

    if (restWasAlreadyRunning) {
      nextSession = {
        ...nextSession,
        rest_active: remainingRestSeconds > 0,
        current_rest_seconds:
          elapsedRestSeconds,
        rest_remaining_seconds:
          remainingRestSeconds,
        rest_started_at:
          originalRestStartedAt ||
          nextSession.rest_started_at,
      };
    }

    const completedExercise =
      (nextSession.exercises || []).find(
        (exercise) => exercise.id === currentExercise.id
      );
    const exerciseFinished = Boolean(completedExercise?.completed);
    const currentIndex = Number(
      nextSession.current_exercise_index || 0
    );
    const hasNextExercise =
      exerciseFinished &&
      currentIndex < (nextSession.exercises || []).length - 1;

    nextSession = {
      ...nextSession,
      pending_set_logging: false,
      pending_set_exercise_id: "",
      pending_set_duration_seconds: 0,
      pending_set_started_at: "",
      current_exercise_index: hasNextExercise
        ? currentIndex + 1
        : currentIndex,
      last_completed_exercise_name: exerciseFinished
        ? currentExercise.name
        : nextSession.last_completed_exercise_name || "",
    };

    setSession(nextSession);
    setSetCheckInOpen(false);
    setPendingSetDurationSeconds(0);
    setSavingSet(false);

    if (exerciseFinished) {
      const nextExercise = hasNextExercise
        ? nextSession.exercises[currentIndex + 1]
        : null;

      setFinishMessage(
        nextExercise
          ? `${currentExercise.name} complete. Next: ${nextExercise.name}.`
          : `${currentExercise.name} complete. All planned exercises are resolved.`
      );
    }

    const restSeconds =
      nextSession.rest_remaining_seconds ||
      nextSession.rest_target_seconds ||
      currentExercise.rest_seconds ||
      0;

    const pain = Number(
      enrichedSetLog.pain_score || 0
    );

    speakCoachText({
      text:
        pain >= 3
          ? `Set saved. Pain was reported. Reduce the load or adjust the movement. Rest for ${restSeconds} seconds.`
          : exerciseFinished && hasNextExercise
          ? `${currentExercise.name} complete. Next is ${nextSession.exercises[currentIndex + 1].name}. You have ${restSeconds} seconds remaining.`
          : exerciseFinished
          ? `${currentExercise.name} complete. All planned exercises are resolved.`
          : `Set saved. Rest for ${restSeconds} seconds.`,
      audioMode: coachAudioMode,
      voicePreference: coachVoicePreference,
      rate: 1.02,
      pitch: 1,
      volume: 1,
    });
  }

  function moveExercise(index) {
    if (!session) return;

    setSession(moveToExercise(session, index));
    setSetCheckInOpen(false);
  }

  function patchExercise(field, value) {
    if (!session || !currentExercise || !canEdit) return;

    setSession(
      updateExerciseField(
        session,
        currentExercise.id,
        field,
        value
      )
    );
  }

  function openAdaptation(mode) {
    if (
      !session ||
      session.set_active ||
      session.rest_active
    ) {
      return;
    }

    setAdaptationMode(mode);
    setModifyMenuOpen(false);

    trackWorkoutAdaptationKpi(
      "adaptation_drawer_opened",
      {
        mode,
        session_id: session.id,
        current_exercise_id: currentExercise?.id || "",
      }
    );
  }

  function selectAdaptiveExercise(catalogExercise, mode) {
    if (!session || !catalogExercise) return;

    if (mode === "replace" && currentExercise) {
      setSession((previous) => ({
        ...previous,
        exercises: (previous.exercises || []).map(
          (exercise) =>
            exercise.id === currentExercise.id
              ? {
                  ...exercise,
                  name: catalogExercise.name,
                  substituted: true,
                  substitute_name: catalogExercise.name,
                  original_exercise_name:
                    exercise.original_exercise_name ||
                    exercise.name,
                  substitution_source: "live_library",
                  catalog_id: catalogExercise.id,
                  slug: catalogExercise.slug,
                  image: catalogExercise.image,
                  equipment: catalogExercise.equipment,
                  location: catalogExercise.location,
                  category: catalogExercise.category,
                  difficulty: catalogExercise.difficulty,
                  movement_pattern:
                    catalogExercise.movement_pattern,
                  primary_muscles:
                    catalogExercise.primary_muscles || [],
                  secondary_muscles:
                    catalogExercise.secondary_muscles || [],
                  feel: catalogExercise.feel || "",
                  instructions:
                    catalogExercise.instructions || [],
                  mistakes:
                    catalogExercise.mistakes || [],
                  safety: catalogExercise.safety || "",
                  alternatives:
                    catalogExercise.alternatives || [],
                  variations:
                    catalogExercise.variations || [],
                  notes: catalogExercise.feel || "",
                  current_target_weight: "",
                  planned_weight: "",
                  current_target_reps:
                    catalogExercise.reps,
                  planned_reps:
                    catalogExercise.reps,
                  planned_sets:
                    catalogExercise.sets,
                  rest_seconds: Number(
                    String(
                      catalogExercise.rest || "60"
                    ).match(/\d+/)?.[0] || 60
                  ),
                  set_logs: [],
                  completed: false,
                  skipped: false,
                }
              : exercise
        ),
      }));

      speakCoachText({
        text: `${currentExercise.name} has been replaced with ${catalogExercise.name}. This keeps the workout moving while I track the substitution.`,
        audioMode: coachAudioMode,
        voicePreference: coachVoicePreference,
        rate: 0.98,
      });
    } else {
      const addedExercise = buildAdaptiveExercise(
        catalogExercise,
        mode
      );

      setSession((previous) => {
        const currentIndex =
          previous.current_exercise_index || 0;
        const exercises = [
          ...(previous.exercises || []),
        ];

        const insertAt =
          mode === "variation"
            ? currentIndex + 1
            : exercises.length;

        exercises.splice(insertAt, 0, addedExercise);

        return {
          ...previous,
          exercises,
          workout_extended:
            mode === "finisher" ||
            previous.workout_extended,
          adaptive_additions:
            Number(previous.adaptive_additions || 0) + 1,
        };
      });

      const label =
        mode === "variation"
          ? "variation"
          : mode === "accessory"
          ? "accessory"
          : "extra exercise";

      speakCoachText({
        text: `${catalogExercise.name} added as a ${label}. I will track the extra volume and use it in future coaching.`,
        audioMode: coachAudioMode,
        voicePreference: coachVoicePreference,
        rate: 0.98,
      });
    }

    setAdaptationMode("");
  }

  function closeDrawer() {
    const activeSession = latestSessionRef.current;

    if (
      activeSession?.pending_set_logging &&
      typeof window !== "undefined"
    ) {
      const shouldLeave = window.confirm(
        "This completed set has not been saved yet. Leave the workout and finish logging it when you return?"
      );

      if (!shouldLeave) return;
    }

    persistWorkoutSession(activeSession, plannerItem);

    setReviewMode(false);
    setFinishMessage("");
    setSavingWorkout(false);
    setEditAfterFinish(false);
    setSetCheckInOpen(false);
    setPendingSetDurationSeconds(0);
    stopCoachVoice();
    onClose?.();
  }

  function saveWorkout(completionMeta = {}) {
    if (!session || savingWorkout || isCompleted) return;

    setSavingWorkout(true);

    try {
      const sessionToFinish = {
        ...session,
        completion_meta: {
          ...(session.completion_meta || {}),
          ...completionMeta,
          completed_review_at: new Date().toISOString(),
        },
        cooldown_choice:
          completionMeta.cooldown_choice || "",
        cooldown_completed:
          !!completionMeta.cooldown_completed,
        cooldown_skipped:
          !!completionMeta.cooldown_skipped,
        completion_notes:
          completionMeta.completion_notes || "",
        coach_next_recommendation:
          completionMeta.next_recommendation || "",
      };

      const result = finishWorkoutSession({
        session: sessionToFinish,
        snapshot: snapshot || {},
        history: history || [],
      });

      clearPersistedWorkout();
      initializedWorkoutKeyRef.current = "";
      const completedAt =
        result.finishedSession.finished_at ||
        new Date().toISOString();
      const completedPlannerId =
        result.finishedSession.planner_item_id ||
        plannerItem?.id ||
        "";

      const nextSnapshot = {
        ...result.nextSnapshot,
        workout: "",
        today_workout_id: "",
        last_completed_workout_at: completedAt,
        last_completed_workout_name:
          result.finishedSession.workout_name || "",
        week_plan: Array.isArray(result.nextSnapshot?.week_plan)
          ? result.nextSnapshot.week_plan.map((item) =>
              item?.id === completedPlannerId ||
              (
                item?.ymd === result.finishedSession.ymd &&
                item?.workout_name === result.finishedSession.workout_name &&
                item?.status !== "Completed"
              )
                ? {
                    ...item,
                    status: "Completed",
                    completed_at: completedAt,
                    completed_session_id: result.finishedSession.id,
                  }
                : item
            )
          : [],
        workout_adherence_log: [
          {
            id: `workout-completed-${result.finishedSession.id}`,
            workout_id: completedPlannerId,
            workout_name:
              result.finishedSession.workout_name || "Workout",
            original_ymd: result.finishedSession.ymd || "",
            action: "completed",
            status: "Completed",
            created_at: completedAt,
            session_id: result.finishedSession.id,
            source: "active_workout_completion",
          },
          ...(
            Array.isArray(result.nextSnapshot?.workout_adherence_log)
              ? result.nextSnapshot.workout_adherence_log
              : []
          ),
        ].slice(0, 100),
      };

      setHistory?.(result.nextHistory);
      setSnapshot?.(nextSnapshot);
      setSession(result.finishedSession);
      setReviewMode(false);
      setEditAfterFinish(false);

      setFinishMessage(
        `Workout saved. ${
          result.summary.completed_sets
        } sets logged in ${formatSeconds(
          result.summary.total_seconds
        )}.`
      );

      speakCoachText({
        text: `${
          buildPostWorkoutWrapUp(
            result.finishedSession,
            result.summary
          )
        } ${
          completionMeta.next_recommendation || ""
        }`,
        audioMode: coachAudioMode,
        voicePreference: coachVoicePreference,
        rate: 0.96,
        pitch: 1,
        volume: 1,
      });

      trackWorkoutAdaptationKpi(
        "postworkout_wrapup_played",
        {
          session_id: result.finishedSession.id,
          completed_sets: result.summary.completed_sets,
          total_seconds: result.summary.total_seconds,
          adaptive_additions:
            result.finishedSession.adaptive_additions || 0,
          cooldown_choice:
            completionMeta.cooldown_choice || "",
          pain_flags:
            completionMeta.pain_flags || 0,
          active_ratio_percent:
            completionMeta.active_ratio_percent || 0,
        }
      );
    } finally {
      window.setTimeout(() => {
        setSavingWorkout(false);
      }, 400);
    }
  }

  function saveEditedWorkout() {
    if (!session) return;

    const result =
      updateCompletedWorkoutSession({
        session,
        snapshot: snapshot || {},
        history: history || [],
      });

    setHistory?.(result.nextHistory);
    setSnapshot?.(result.nextSnapshot);
    setSession(result.editedSession);
    setEditAfterFinish(false);
    setFinishMessage(
      "Workout edits saved. Coach statistics updated."
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-black/80 backdrop-blur-xl">
      <button
        type="button"
        aria-label="Close active workout"
        onClick={closeDrawer}
        className="absolute inset-0"
      />

      <section className="relative z-[91] flex h-full w-full max-w-6xl flex-col overflow-hidden border-l border-cyan-300/10 bg-[radial-gradient(circle_at_top_left,rgba(57,255,136,0.09),transparent_18%),radial-gradient(circle_at_top_right,rgba(255,59,212,0.07),transparent_20%),linear-gradient(180deg,#040812_0%,#07111f_100%)] shadow-[-30px_0_80px_rgba(0,0,0,0.6)]">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#040812]/95 px-3 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[9px] font-black uppercase tracking-[0.24em] text-emerald-200 sm:text-xs">
                SyncWorks Trainer Loop
              </div>

              <h2 className="mt-1 truncate text-xl font-black text-white sm:text-4xl">
                {session?.workout_name ||
                  "Active Workout"}
              </h2>

              <p className="mt-2 hidden text-sm leading-6 text-slate-300 sm:block">
                Active time only runs while a set is
                being performed.
              </p>
            </div>

            <button
              type="button"
              onClick={closeDrawer}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-sm font-black text-white"
            >
              X
            </button>
          </div>

          {session ? (
            <>
              <div className="mt-3 grid grid-cols-4 gap-1.5 sm:hidden">
                <MobileStat
                  label="Total"
                  value={formatSeconds(
                    session.total_seconds
                  )}
                  tone="cyan"
                />

                <MobileStat
                  label="Active"
                  value={formatSeconds(
                    session.active_seconds
                  )}
                  tone="emerald"
                />

                <MobileStat
                  label={
                    session.rest_active
                      ? "Rest Left"
                      : "Rest"
                  }
                  value={formatSeconds(
                    session.rest_active
                      ? session.rest_remaining_seconds
                      : session.rest_seconds
                  )}
                  tone="amber"
                />

                <MobileStat
                  label="Sets"
                  value={session.completed_sets || 0}
                  tone="purple"
                />
              </div>

              <div className="mt-4 hidden gap-2 sm:grid sm:grid-cols-2 lg:grid-cols-6">
                <StatTile
                  label="Total"
                  value={formatSeconds(
                    session.total_seconds
                  )}
                  tone="cyan"
                />

                <StatTile
                  label="Active"
                  value={formatSeconds(
                    session.active_seconds
                  )}
                  tone="emerald"
                />

                <StatTile
                  label={
                    session.rest_active
                      ? "Rest Remaining"
                      : "Rest"
                  }
                  value={formatSeconds(
                    session.rest_active
                      ? session.rest_remaining_seconds
                      : session.rest_seconds
                  )}
                  tone="amber"
                />

                <StatTile
                  label="Idle"
                  value={formatSeconds(
                    session.idle_seconds
                  )}
                  tone="slate"
                />

                <StatTile
                  label="Sets"
                  value={session.completed_sets || 0}
                  tone="purple"
                />

                <StatTile
                  label="Skipped"
                  value={
                    session.skipped_exercises || 0
                  }
                  tone="rose"
                />
              </div>
            </>
          ) : null}
        </header>

        <main className="flex-1 overflow-y-auto px-3 py-3 pb-36 sm:px-6 sm:py-5 sm:pb-28">
          {!session ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-300">
              No active workout selected.
            </div>
          ) : reviewMode ? (
            <FinishReviewPanel
              validation={validation}
              session={session}
              saving={savingWorkout}
              onBack={() => setReviewMode(false)}
              onSave={saveWorkout}
            />
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {finishMessage ? (
                <div className="rounded-2xl border border-lime-300/25 bg-lime-300/10 p-3 text-sm font-bold text-lime-100">
                  {finishMessage}
                </div>
              ) : null}

              {!isCompleted ? (
                <DynamicWarmupCard
                  plan={session.warmup_plan}
                  onToggle={togglePreparationItem}
                  onSkip={skipPreparation}
                />
              ) : null}

              {!isCompleted && currentExercise ? (
                <div className="rounded-[1.35rem] border border-cyan-300/15 bg-[linear-gradient(135deg,rgba(34,211,238,0.08),rgba(57,255,136,0.06))] p-3 shadow-[0_12px_36px_rgba(0,0,0,0.18)] sm:rounded-[2rem] sm:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200">
                        Current Exercise
                      </div>

                      <div className="mt-1 truncate text-lg font-black text-white">
                        {currentExercise.substituted &&
                        currentExercise.substitute_name
                          ? currentExercise.substitute_name
                          : currentExercise.name}
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        Set{" "}
                        {(currentExercise.set_logs || []).length + 1}
                        {" of "}
                        {currentExercise.planned_sets || "-"}
                        {" | "}
                        {currentExercise.planned_reps || "clean reps"}
                      </div>
                    </div>

                    {session.set_active ? (
                      <div className="shrink-0 rounded-2xl border border-lime-300/25 bg-lime-300/10 px-3 py-2 text-center">
                        <div className="text-[8px] font-black uppercase tracking-[0.14em] text-lime-200">
                          Set Time
                        </div>

                        <div className="mt-0.5 text-lg font-black text-lime-100">
                          {formatSeconds(
                            session.current_set_seconds
                          )}
                        </div>
                      </div>
                    ) : session.rest_active ? (
                      <div className="shrink-0 rounded-2xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-center">
                        <div className="text-[8px] font-black uppercase tracking-[0.14em] text-amber-200">
                          Rest Left
                        </div>

                        <div className="mt-0.5 text-lg font-black text-amber-100">
                          {formatSeconds(
                            session.rest_remaining_seconds
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={
                      session.set_active
                        ? requestCompleteSet
                        : startSet
                    }
                    disabled={
                      session.paused ||
                      session.rest_active
                    }
                    className={cx(
                      "health-primary-action mt-3 h-14 w-full rounded-2xl border text-base font-black transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45",
                      session.set_active
                        ? "border-fuchsia-300/30 bg-fuchsia-300/15 text-fuchsia-100"
                        : "border-lime-300/35 bg-lime-300/20 text-lime-100 shadow-[0_0_30px_rgba(57,255,136,0.12)]"
                    )}
                  >
                    {session.set_active
                      ? (isTimedExercise ? "Complete Timed Set" : "Complete Set")
                      : session.rest_active ? "Resting"
                      : (isTimedExercise ? "Start Timer" : "Start Set")}
                  </button>

                  {!session.set_active &&
                  !session.rest_active ? (
                    <div className="mt-2 text-center text-[11px] text-slate-500">
                      Active time begins only after
                      Start Set is tapped.
                    </div>
                  ) : null}
                </div>
              ) : null}
              {!isCompleted && currentExercise ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setDetailsOpen((current) => !current)
                      }
                      className="health-secondary-action h-11 rounded-2xl border px-2 text-[10px] font-black sm:px-3 sm:text-xs"
                    >
                      Exercise Info
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setModifyMenuOpen((current) => !current)
                      }
                      disabled={session.set_active || session.rest_active}
                      className="health-secondary-action h-11 rounded-2xl border px-2 text-[10px] font-black disabled:opacity-40 sm:px-3 sm:text-xs"
                    >
                      Modify Workout
                    </button>

                    <button
                      type="button"
                      onClick={() => setReviewMode(true)}
                      disabled={session.set_active}
                      className="health-secondary-action h-11 rounded-2xl border px-2 text-[10px] font-black disabled:opacity-40 sm:px-3 sm:text-xs"
                    >
                      Finish Workout
                    </button>
                  </div>

                  {modifyMenuOpen ? (
                    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/20 p-2 sm:grid-cols-4">
                      <button
                        type="button"
                        onClick={() => openAdaptation("replace")}
                        className="h-10 rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-xs font-black text-cyan-100"
                      >
                        Swap Exercise
                      </button>

                      <button
                        type="button"
                        onClick={() => openAdaptation("variation")}
                        className="h-10 rounded-xl border border-fuchsia-300/20 bg-fuchsia-300/10 text-xs font-black text-fuchsia-100"
                      >
                        Add Variation
                      </button>

                      <button
                        type="button"
                        onClick={() => openAdaptation("accessory")}
                        className="h-10 rounded-xl border border-amber-300/20 bg-amber-300/10 text-xs font-black text-amber-100"
                      >
                        Add Accessory
                      </button>

                      <button
                        type="button"
                        onClick={() => openAdaptation("finisher")}
                        className="h-10 rounded-xl border border-lime-300/20 bg-lime-300/10 text-xs font-black text-lime-100"
                      >
                        Keep Training
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="overflow-x-auto pb-1">
                <div className="flex min-w-max gap-2">
                  {(session.exercises || []).map(
                    (exercise, index) => (
                      <button
                        key={exercise.id}
                        type="button"
                        onClick={() =>
                          moveExercise(index)
                        }
                        className={cx(
                          "w-[155px] rounded-2xl border px-3 py-3 text-left transition",
                          index ===
                            session.current_exercise_index
                            ? "border-cyan-300/30 bg-cyan-300/10"
                            : "border-white/10 bg-white/[0.03]"
                        )}
                      >
                        <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
                          {String(index + 1).padStart(
                            2,
                            "0"
                          )}
                        </div>

                        <div className="mt-1 truncate text-sm font-black text-white">
                          {exercise.substituted &&
                          exercise.substitute_name
                            ? exercise.substitute_name
                            : exercise.name}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {(exercise.set_logs || [])
                            .length}
                          /{exercise.planned_sets} sets
                        </div>
                      </button>
                    )
                  )}
                </div>
              </div>

              {isCompleted ? (
                <PostWorkoutReportCard
                  session={session}
                />
              ) : null}

              {isCompleted ? (
                <div className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
                    Workout Completed
                  </div>

                  <div className="mt-2 text-sm leading-6 text-slate-200">
                    This workout is saved. You can
                    edit it before closing.
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {!editAfterFinish ? (
                      <button
                        type="button"
                        onClick={() =>
                          setEditAfterFinish(true)
                        }
                        className="rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm font-black text-amber-100"
                      >
                        Edit Completed Workout
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={saveEditedWorkout}
                        className="rounded-2xl border border-lime-300/25 bg-lime-300/10 px-4 py-3 text-sm font-black text-lime-100"
                      >
                        Save Edits
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={closeDrawer}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : null}

              {!isCompleted && currentExercise ? (
                <WorkoutProgressionCard
                  history={history}
                  exercise={currentExercise}
                  session={session}
                  onApply={
                    applyProgressionRecommendation
                  }
                />
              ) : null}

              {!isCompleted && currentExercise ? (
                <PersonalRecordsCard
                  history={history}
                  exercise={currentExercise}
                  session={session}
                />
              ) : null}

              <div
                className={cx(
                  !canEdit &&
                    "pointer-events-none opacity-60"
                )}
              >
                <TrainerExerciseIntroCard
                  exerciseName={
                    currentExercise?.substituted &&
                    currentExercise?.substitute_name
                      ? currentExercise.substitute_name
                      : currentExercise?.name
                  }
                  onReplayCue={replayExerciseCue}
                  onFindAlternative={() => {
                    if (
                      !session ||
                      !currentExercise
                    ) {
                      return;
                    }

                    setSession(
                      markExerciseSubstituted(
                        session,
                        currentExercise.id,
                        currentExercise.substitute_name ||
                          `Alternative for ${currentExercise.name}`
                      )
                    );
                  }}
                />
              </div>

              <TrainerNudgeCard
                nudge={session?.rest_active ? null : trainerNudge}
                audioMode={coachAudioMode}
                voicePreference={
                  coachVoicePreference
                }
                onReplay={replayNudge}
                onUseRecommendation={
                  useCoachRecommendation
                }
                onKeepCurrent={
                  keepCurrentTarget
                }
                onAdjustManually={
                  adjustTargetManually
                }
              />

              <details className="rounded-[1.5rem] border border-white/10 bg-white/[0.03]">
                <summary className="cursor-pointer px-4 py-3 text-sm font-black text-white">
                  Coach Voice Settings
                </summary>

                <div className="px-3 pb-3">
                  <CoachVoiceSettingsCard
                    audioMode={coachAudioMode}
                    voicePreference={
                      coachVoicePreference
                    }
                    onChange={patchCoachSettings}
                  />
                </div>
              </details>

              {currentExercise ? (
                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-3 sm:rounded-[2rem] sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
                        Live Set Board
                      </div>

                      <div className="mt-1 text-lg font-black text-white">
                        Planned and completed sets
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setDetailsOpen(
                          (previous) => !previous
                        )
                      }
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-slate-200"
                    >
                      {detailsOpen
                        ? "Hide Details"
                        : "Info: Set and Exercise"}
                    </button>
                  </div>
                  {detailsOpen ? (
                    <div className="mt-3">
                      <SetHistory
                      exercise={currentExercise}
                      targetControlsRef={
                        targetControlsRef
                      }
                      onTargetChange={
                        patchCurrentTarget
                      }
                      onUpdateSet={(
                        setId,
                        field,
                        value
                      ) =>
                        setSession(
                          updateSetField(
                            session,
                            currentExercise.id,
                            setId,
                            field,
                            value
                          )
                        )
                      }
                      onRemoveSet={(setId) =>
                        setSession(
                          removeSetFromExercise(
                            session,
                            currentExercise.id,
                            setId
                          )
                        )
                      }
                    />

                    </div>
                  ) : (
                    <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                      <div>
                        <div className="text-xs font-black text-white">
                          {(currentExercise.set_logs || []).length} of {currentExercise.planned_sets || "-"} sets complete
                        </div>

                        <div className="mt-1 text-[11px] text-slate-500">
                          Open Exercise Info to adjust targets or review completed sets.
                        </div>
                      </div>

                      <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
                        Set {(currentExercise.set_logs || []).length + 1}
                      </div>
                    </div>
                  )}

                  {detailsOpen ? (
                    <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <ScoreSelect
                          label="Exercise Pain"
                          value={
                            currentExercise.pain_score ??
                            ""
                          }
                          onChange={(value) =>
                            patchExercise(
                              "pain_score",
                              value
                            )
                          }
                          options={[
                            "0",
                            "1",
                            "2",
                            "3",
                            "4",
                            "5",
                          ]}
                        />

                        <ScoreSelect
                          label="Difficulty"
                          value={
                            currentExercise.difficulty_score ||
                            ""
                          }
                          onChange={(value) =>
                            patchExercise(
                              "difficulty_score",
                              value
                            )
                          }
                          options={[
                            "Easy",
                            "Medium",
                            "Hard",
                            "Max",
                          ]}
                        />
                      </div>

                      <label className="block">
                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                          Substitute exercise
                        </div>

                        <input
                          value={
                            currentExercise.substitute_name ||
                            ""
                          }
                          onChange={(event) =>
                            setSession(
                              markExerciseSubstituted(
                                session,
                                currentExercise.id,
                                event.target.value
                              )
                            )
                          }
                          placeholder="Enter replacement exercise"
                          className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() =>
                          setSession(
                            markExerciseSkipped(
                              session,
                              currentExercise.id
                            )
                          )
                        }
                        className={cx(
                          "w-full rounded-2xl border px-4 py-3 text-sm font-black",
                          currentExercise.skipped
                            ? "border-lime-300/25 bg-lime-300/10 text-lime-100"
                            : "border-rose-300/25 bg-rose-300/10 text-rose-100"
                        )}
                      >
                        {currentExercise.skipped
                          ? "Undo Skip"
                          : "Skip Exercise"}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-3 sm:rounded-[2rem] sm:p-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <button
                    type="button"
                    onClick={() =>
                      setSession(
                        toggleSessionPause(session)
                      )
                    }
                    disabled={isCompleted}
                    className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-white disabled:opacity-40"
                  >
                    {session.paused
                      ? "Resume"
                      : "Pause"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSession(
                        toggleRestTimer(session)
                      )
                    }
                    disabled={
                      isCompleted ||
                      session.set_active
                    }
                    className={cx(
                      "h-11 rounded-2xl border text-sm font-black disabled:opacity-40",
                      session.rest_active
                        ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                        : "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
                    )}
                  >
                    {session.rest_active
                      ? "Stop Rest"
                      : "Start Rest"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setReviewMode(true)
                    }
                    disabled={
                      isCompleted ||
                      session.set_active
                    }
                    className="h-11 rounded-2xl border border-lime-300/25 bg-lime-300/10 text-sm font-black text-lime-100 disabled:opacity-40"
                  >
                    Finish Workout
                  </button>

                  <button
                    type="button"
                    onClick={closeDrawer}
                    className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-slate-200"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-3 sm:rounded-[2rem] sm:p-4">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  Finish Check-In
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <ScoreSelect
                    label="Overall Pain"
                    value={session.pain_score ?? ""}
                    onChange={(value) =>
                      canEdit &&
                      setSession((previous) => ({
                        ...previous,
                        pain_score: value,
                      }))
                    }
                    options={[
                      "0",
                      "1",
                      "2",
                      "3",
                      "4",
                      "5",
                    ]}
                  />

                  <ScoreSelect
                    label="Difficulty"
                    value={
                      session.difficulty_score || ""
                    }
                    onChange={(value) =>
                      canEdit &&
                      setSession((previous) => ({
                        ...previous,
                        difficulty_score: value,
                      }))
                    }
                    options={[
                      "Easy",
                      "Medium",
                      "Hard",
                      "Max",
                    ]}
                  />

                  <ScoreSelect
                    label="Energy"
                    value={session.energy_score || ""}
                    onChange={(value) =>
                      canEdit &&
                      setSession((previous) => ({
                        ...previous,
                        energy_score: value,
                      }))
                    }
                    options={[
                      "Low",
                      "Okay",
                      "Good",
                      "Great",
                    ]}
                  />

                  <ScoreSelect
                    label="Soreness"
                    value={
                      session.soreness_score || ""
                    }
                    onChange={(value) =>
                      canEdit &&
                      setSession((previous) => ({
                        ...previous,
                        soreness_score: value,
                      }))
                    }
                    options={[
                      "None",
                      "Normal",
                      "High",
                      "Painful",
                    ]}
                  />
                </div>

                <textarea
                  value={session.notes || ""}
                  onChange={(event) =>
                    canEdit &&
                    setSession((previous) => ({
                      ...previous,
                      notes: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="What felt good, what hurt, and what should change next time?"
                  className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-slate-950 px-3 py-3 text-sm font-bold leading-6 text-white outline-none placeholder:text-slate-600"
                />
              </div>
            </div>
          )}
        </main>

        {session &&
        !reviewMode &&
        !isCompleted ? (
          <div className="absolute inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#020617]/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.65rem)] pt-2 backdrop-blur-xl sm:hidden">
            <div className="grid grid-cols-[0.72fr_1.56fr_0.72fr] gap-2">
              <button
                type="button"
                onClick={() =>
                  moveExercise(
                    Math.max(
                      0,
                      (session.current_exercise_index ||
                        0) - 1
                    )
                  )
                }
                disabled={
                  (session.current_exercise_index ||
                    0) === 0
                }
                className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] text-xs font-black text-slate-200 disabled:opacity-35"
              >
                Prev
              </button>

              <button
                type="button"
                onClick={
                  session.set_active
                    ? requestCompleteSet
                    : startSet
                }
                disabled={
                  session.paused ||
                  session.rest_active
                }
                className={cx(
                  "h-12 rounded-2xl border text-sm font-black disabled:opacity-45",
                  session.set_active
                    ? "border-fuchsia-300/30 bg-fuchsia-300/15 text-fuchsia-100"
                    : "border-lime-300/35 bg-lime-300/20 text-lime-100"
                )}
              >
                {session.set_active
                  ? `Complete | ${formatSeconds(
                      session.current_set_seconds
                    )}`
                  : session.rest_active
                  ? `Rest ${formatSeconds(
                      session.rest_remaining_seconds
                    )}`
                  : (isTimedExercise ? "Start Timer" : "Start Set")}
              </button>

              <button
                type="button"
                onClick={() =>
                  moveExercise(
                    Math.min(
                      totalExercises - 1,
                      (session.current_exercise_index ||
                        0) + 1
                    )
                  )
                }
                disabled={
                  (session.current_exercise_index ||
                    0) >=
                  totalExercises - 1
                }
                className="h-12 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-xs font-black text-cyan-100 disabled:opacity-35"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}

        <LiveWorkoutAdaptationDrawer
          open={!!adaptationMode}
          onClose={() => setAdaptationMode("")}
          mode={adaptationMode}
          session={session}
          currentExercise={currentExercise}
          onSelect={selectAdaptiveExercise}
        />

        <SetCompletionSheet
          open={setCheckInOpen}
          exercise={currentExercise}
          durationSeconds={
            pendingSetDurationSeconds ||
            session?.current_set_seconds ||
            0
          }
          restActive={!!session?.rest_active}
          restRemainingSeconds={
            session?.rest_remaining_seconds || 0
          }
          suggestion={currentSuggestion}
          saving={savingSet}
          onCancel={() => {
            setSetCheckInOpen(false);
            setPendingSetDurationSeconds(0);
            setSession((previous) =>
              previous
                ? {
                    ...previous,
                    pending_set_logging: false,
                    pending_set_exercise_id: "",
                    pending_set_duration_seconds: 0,
                    pending_set_started_at: "",
                  }
                : previous
            );
          }}
          onSave={saveTimedSet}
        />
      </section>
    </div>
  );
}
