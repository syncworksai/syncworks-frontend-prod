// src/components/customer-health/ActiveWorkoutSessionDrawer.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  addSetToExercise,
  createWorkoutSessionFromPlannerItem,
  finishWorkoutSession,
  formatSeconds,
  markExerciseSkipped,
  markExerciseSubstituted,
  moveToExercise,
  removeSetFromExercise,
  toggleRestTimer,
  toggleSessionPause,
  updateExerciseField,
  updateSessionTimer,
  updateSetField,
} from "./healthWorkoutSession";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function ScoreSelect({ label, value, onChange, options }) {
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
        {options.map((option) => (
          <option key={option} value={option} className="bg-slate-950">
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatTile({ label, value, tone = "cyan" }) {
  const toneMap = {
    cyan: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
    emerald: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
    amber: "border-amber-300/20 bg-amber-300/10 text-amber-100",
    rose: "border-rose-300/20 bg-rose-300/10 text-rose-100",
    slate: "border-white/10 bg-white/[0.04] text-slate-200",
  };

  return (
    <div
      className={cx(
        "rounded-2xl border px-3 py-3",
        toneMap[tone] || toneMap.cyan
      )}
    >
      <div className="text-[10px] font-black uppercase tracking-[0.16em] opacity-75">
        {label}
      </div>
      <div className="mt-1 text-lg font-black">{value}</div>
    </div>
  );
}

function SetLogger({ exercise, onAddSet, onUpdateSet, onRemoveSet }) {
  const [reps, setReps] = useState(exercise.planned_reps || "");
  const [weight, setWeight] = useState(exercise.planned_weight || "");

  useEffect(() => {
    setReps(exercise.planned_reps || "");
    setWeight(exercise.planned_weight || "");
  }, [exercise.id, exercise.planned_reps, exercise.planned_weight]);

  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            Reps
          </div>
          <input
            value={reps}
            onChange={(event) => setReps(event.target.value)}
            placeholder="10"
            className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
          />
        </label>

        <label>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            Weight
          </div>
          <input
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            placeholder="Bodyweight"
            className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
          />
        </label>

        <button
          type="button"
          onClick={() => onAddSet({ reps, weight })}
          className="mt-6 h-11 rounded-2xl border border-emerald-300/25 bg-emerald-300/10 px-4 text-sm font-black text-emerald-100 transition hover:bg-emerald-300/20 sm:mt-auto"
        >
          Add Set
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {(exercise.set_logs || []).length ? (
          exercise.set_logs.map((setLog, index) => (
            <div
              key={setLog.id}
              className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-[auto_1fr_1fr_auto]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-sm font-black text-cyan-100">
                {index + 1}
              </div>

              <input
                value={setLog.reps || ""}
                onChange={(event) =>
                  onUpdateSet(setLog.id, "reps", event.target.value)
                }
                className="h-10 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/40"
              />

              <input
                value={setLog.weight || ""}
                onChange={(event) =>
                  onUpdateSet(setLog.id, "weight", event.target.value)
                }
                className="h-10 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/40"
              />

              <button
                type="button"
                onClick={() => onRemoveSet(setLog.id)}
                className="h-10 rounded-xl border border-rose-300/20 bg-rose-300/10 px-3 text-xs font-black text-rose-100 transition hover:bg-rose-300/20"
              >
                Remove
              </button>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-500">
            No sets logged yet.
          </div>
        )}
      </div>
    </div>
  );
}

function ExercisePanel({
  session,
  exercise,
  index,
  total,
  onSessionChange,
}) {
  if (!exercise) return null;

  function patchExercise(field, value) {
    onSessionChange(updateExerciseField(session, exercise.id, field, value));
  }

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
            Exercise {index + 1} of {total}
          </div>

          <h3 className="mt-2 text-2xl font-black text-white">
            {exercise.substituted && exercise.substitute_name
              ? exercise.substitute_name
              : exercise.name}
          </h3>

          <div className="mt-2 text-sm leading-6 text-slate-300">
            Planned: {exercise.planned_sets} x {exercise.planned_reps}
            {exercise.target ? ` • ${exercise.target}` : ""}
            {exercise.rest_seconds ? ` • ${exercise.rest_seconds}s rest` : ""}
          </div>

          {exercise.notes ? (
            <div className="mt-2 text-sm leading-6 text-slate-500">
              {exercise.notes}
            </div>
          ) : null}
        </div>

        <div
          className={cx(
            "w-fit rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]",
            exercise.skipped
              ? "border-rose-300/25 bg-rose-300/10 text-rose-100"
              : exercise.completed
              ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
              : "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
          )}
        >
          {exercise.skipped
            ? "Skipped"
            : exercise.completed
            ? "Logged"
            : "Active"}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ScoreSelect
          label="Pain"
          value={exercise.pain_score || "0"}
          onChange={(value) => patchExercise("pain_score", value)}
          options={["0", "1", "2", "3", "4", "5"]}
        />

        <ScoreSelect
          label="Difficulty"
          value={exercise.difficulty_score || "Medium"}
          onChange={(value) => patchExercise("difficulty_score", value)}
          options={["Easy", "Medium", "Hard", "Max"]}
        />
      </div>

      <div className="mt-4">
        <label className="block">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            Substitute exercise
          </div>

          <input
            value={exercise.substitute_name || ""}
            onChange={(event) =>
              onSessionChange(
                markExerciseSubstituted(session, exercise.id, event.target.value)
              )
            }
            placeholder="Example: swap Bench Press for Push-Ups"
            className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
          />
        </label>
      </div>

      <div className="mt-4">
        <SetLogger
          exercise={exercise}
          onAddSet={(setLog) =>
            onSessionChange(addSetToExercise(session, exercise.id, setLog))
          }
          onUpdateSet={(setId, field, value) =>
            onSessionChange(
              updateSetField(session, exercise.id, setId, field, value)
            )
          }
          onRemoveSet={(setId) =>
            onSessionChange(removeSetFromExercise(session, exercise.id, setId))
          }
        />
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={() =>
            onSessionChange(markExerciseSkipped(session, exercise.id))
          }
          className={cx(
            "rounded-2xl border px-4 py-3 text-sm font-black transition",
            exercise.skipped
              ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/20"
              : "border-rose-300/25 bg-rose-300/10 text-rose-100 hover:bg-rose-300/20"
          )}
        >
          {exercise.skipped ? "Undo Skip" : "Skip Exercise"}
        </button>

        <button
          type="button"
          onClick={() =>
            onSessionChange(
              moveToExercise(session, Math.max(0, index - 1))
            )
          }
          disabled={index === 0}
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-slate-100 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        <button
          type="button"
          onClick={() =>
            onSessionChange(
              moveToExercise(session, Math.min(total - 1, index + 1))
            )
          }
          disabled={index >= total - 1}
          className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next Exercise
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
  const [finishMessage, setFinishMessage] = useState("");

  useEffect(() => {
    if (!open || !plannerItem) return;

    setSession(
      createWorkoutSessionFromPlannerItem({
        plannerItem,
        workouts,
      })
    );
    setFinishMessage("");
  }, [open, plannerItem, workouts]);

  useEffect(() => {
    if (!open || !session || session.status !== "active") return;

    const timer = window.setInterval(() => {
      setSession((prev) => {
        if (!prev || prev.status !== "active") return prev;
        return updateSessionTimer(prev, prev.rest_active ? "rest" : "active");
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [open, session?.id, session?.status]);

  const currentExercise = useMemo(() => {
    if (!session || !Array.isArray(session.exercises)) return null;
    return session.exercises[session.current_exercise_index || 0] || null;
  }, [session]);

  const totalExercises = Array.isArray(session?.exercises)
    ? session.exercises.length
    : 0;

  function closeDrawer() {
    setFinishMessage("");
    onClose?.();
  }

  function handleFinishWorkout() {
    if (!session) return;

    const result = finishWorkoutSession({
      session,
      snapshot: snapshot || {},
      history: history || [],
    });

    if (typeof setHistory === "function") {
      setHistory(result.nextHistory);
    }

    if (typeof setSnapshot === "function") {
      setSnapshot(result.nextSnapshot);
    }

    setSession(result.finishedSession);
    setFinishMessage(
      `Workout saved. ${result.summary.completed_sets} sets logged, ${formatSeconds(
        result.summary.total_seconds
      )} total time.`
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-black/75 backdrop-blur-xl">
      <button
        type="button"
        aria-label="Close active workout"
        onClick={closeDrawer}
        className="absolute inset-0 cursor-default"
      />

      <section className="relative z-[91] flex h-full w-full max-w-5xl flex-col border-l border-white/10 bg-[#06111f] shadow-[-30px_0_80px_rgba(0,0,0,0.5)]">
        <div className="border-b border-white/10 bg-white/[0.04] px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-[0.28em] text-emerald-200">
                SyncWorks Trainer Loop
              </div>

              <h2 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                {session?.workout_name || "Active Workout"}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                Track sets, reps, weight, rest, pain, difficulty, skipped
                exercises, and substitutions. This creates the stats the coach
                will use in Phase 7C.
              </p>
            </div>

            <button
              type="button"
              onClick={closeDrawer}
              className="w-fit rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-black text-white transition hover:bg-white/15"
            >
              ✕
            </button>
          </div>

          {session ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
              <StatTile
                label="Total"
                value={formatSeconds(session.total_seconds)}
                tone="cyan"
              />

              <StatTile
                label="Active"
                value={formatSeconds(session.active_seconds)}
                tone="emerald"
              />

              <StatTile
                label="Rest"
                value={formatSeconds(session.rest_seconds)}
                tone="amber"
              />

              <StatTile
                label="Idle"
                value={formatSeconds(session.idle_seconds)}
                tone="slate"
              />

              <StatTile
                label="Sets"
                value={session.completed_sets || 0}
                tone="emerald"
              />

              <StatTile
                label="Skipped"
                value={session.skipped_exercises || 0}
                tone="rose"
              />
            </div>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {!session ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-300">
              No active workout selected.
            </div>
          ) : (
            <div className="space-y-4">
              {finishMessage ? (
                <div className="rounded-3xl border border-emerald-300/25 bg-emerald-300/10 p-4 text-sm font-bold leading-6 text-emerald-100">
                  {finishMessage}
                </div>
              ) : null}

              <div className="rounded-[2rem] border border-white/10 bg-black/20 p-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <button
                    type="button"
                    onClick={() => setSession(toggleSessionPause(session))}
                    disabled={session.status === "completed"}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {session.paused ? "Resume" : "Pause"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSession(toggleRestTimer(session))}
                    disabled={session.status === "completed"}
                    className={cx(
                      "rounded-2xl border px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50",
                      session.rest_active
                        ? "border-amber-300/30 bg-amber-300/15 text-amber-100 hover:bg-amber-300/20"
                        : "border-cyan-300/25 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/20"
                    )}
                  >
                    {session.rest_active ? "Stop Rest" : "Start Rest"}
                  </button>

                  <button
                    type="button"
                    onClick={handleFinishWorkout}
                    disabled={session.status === "completed"}
                    className="rounded-2xl border border-emerald-300/30 bg-emerald-300/15 px-4 py-3 text-sm font-black text-emerald-100 transition hover:bg-emerald-300/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Finish Workout
                  </button>

                  <button
                    type="button"
                    onClick={closeDrawer}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-slate-100 transition hover:bg-white/[0.08]"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
                <div className="space-y-2">
                  {(session.exercises || []).map((exercise, index) => (
                    <button
                      key={exercise.id}
                      type="button"
                      onClick={() => setSession(moveToExercise(session, index))}
                      className={cx(
                        "w-full rounded-2xl border px-4 py-3 text-left transition",
                        index === session.current_exercise_index
                          ? "border-cyan-300/30 bg-cyan-300/10"
                          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-white">
                            {exercise.substituted && exercise.substitute_name
                              ? exercise.substitute_name
                              : exercise.name}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {exercise.planned_sets} x {exercise.planned_reps}
                          </div>
                        </div>

                        <div
                          className={cx(
                            "shrink-0 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em]",
                            exercise.skipped
                              ? "border-rose-300/20 bg-rose-300/10 text-rose-100"
                              : exercise.completed
                              ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                              : "border-white/10 bg-white/[0.04] text-slate-400"
                          )}
                        >
                          {exercise.skipped
                            ? "Skip"
                            : exercise.completed
                            ? "Done"
                            : "Open"}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <ExercisePanel
                  session={session}
                  exercise={currentExercise}
                  index={session.current_exercise_index || 0}
                  total={totalExercises}
                  onSessionChange={setSession}
                />
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  Finish Check-In
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <ScoreSelect
                    label="Overall Pain"
                    value={session.pain_score || "0"}
                    onChange={(value) =>
                      setSession((prev) => ({ ...prev, pain_score: value }))
                    }
                    options={["0", "1", "2", "3", "4", "5"]}
                  />

                  <ScoreSelect
                    label="Difficulty"
                    value={session.difficulty_score || "Medium"}
                    onChange={(value) =>
                      setSession((prev) => ({
                        ...prev,
                        difficulty_score: value,
                      }))
                    }
                    options={["Easy", "Medium", "Hard", "Max"]}
                  />

                  <ScoreSelect
                    label="Energy"
                    value={session.energy_score || "Good"}
                    onChange={(value) =>
                      setSession((prev) => ({ ...prev, energy_score: value }))
                    }
                    options={["Low", "Okay", "Good", "Great"]}
                  />

                  <ScoreSelect
                    label="Soreness"
                    value={session.soreness_score || "Normal"}
                    onChange={(value) =>
                      setSession((prev) => ({
                        ...prev,
                        soreness_score: value,
                      }))
                    }
                    options={["None", "Normal", "High", "Painful"]}
                  />
                </div>

                <label className="mt-3 block">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Workout notes
                  </div>

                  <textarea
                    value={session.notes || ""}
                    onChange={(event) =>
                      setSession((prev) => ({
                        ...prev,
                        notes: event.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="What felt good, what hurt, what should the coach adjust next time?"
                    className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-slate-950 px-3 py-3 text-sm font-bold leading-6 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}