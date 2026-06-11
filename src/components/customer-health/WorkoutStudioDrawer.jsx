// src/components/customer-health/WorkoutStudioDrawer.jsx
import React from "react";
import HealthDrawer from "./HealthDrawer";
import { PROGRAM_TEMPLATES, uid } from "./healthStorage";

function Field({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-slate-400">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none"
      />
    </label>
  );
}

export default function WorkoutStudioDrawer({
  open,
  onClose,
  snapshot,
  setSnapshot,
  workouts,
  setWorkouts,
  history,
  setHistory,
}) {
  function addWorkout() {
    setWorkouts((prev) => [
      ...prev,
      {
        id: uid("w"),
        name: "New Workout",
        duration: "30",
        focus: "Strength",
        status: "Planned",
        exercises: [{ name: "New Exercise", sets: "3", reps: "10", weight: "", rest: "60 sec", notes: "", difficulty: "Medium", pain: "0" }],
      },
    ]);
  }

  function updateWorkout(id, patch) {
    setWorkouts((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  }

  function removeWorkout(id) {
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  }

  function updateExercise(workoutId, index, patch) {
    setWorkouts((prev) =>
      prev.map((w) => {
        if (w.id !== workoutId) return w;

        const exercises = Array.isArray(w.exercises) ? [...w.exercises] : [];
        exercises[index] = { ...exercises[index], ...patch };

        return { ...w, exercises };
      })
    );
  }

  function addExercise(workoutId) {
    setWorkouts((prev) =>
      prev.map((w) => {
        if (w.id !== workoutId) return w;

        return {
          ...w,
          exercises: [
            ...(w.exercises || []),
            { name: "New Exercise", sets: "3", reps: "10", weight: "", rest: "60 sec", notes: "", difficulty: "Medium", pain: "0" },
          ],
        };
      })
    );
  }

  function removeExercise(workoutId, index) {
    setWorkouts((prev) =>
      prev.map((w) => {
        if (w.id !== workoutId) return w;
        return { ...w, exercises: (w.exercises || []).filter((_, i) => i !== index) };
      })
    );
  }

  function useToday(workout) {
    setSnapshot((prev) => ({
      ...prev,
      workout: workout.name,
      today_workout_id: workout.id,
      time_available: `${workout.duration || 30} minutes`,
    }));
  }

  function completeWorkout(workout) {
    const log = {
      id: uid("hist"),
      date: new Date().toISOString().slice(0, 10),
      workout_id: workout.id,
      workout_name: workout.name,
      duration: workout.duration,
      readiness: snapshot.readiness,
      steps: snapshot.steps,
      calories: snapshot.calories,
      protein_today: snapshot.protein_today,
      notes: snapshot.notes,
      exercises: workout.exercises || [],
      completed_at: new Date().toISOString(),
    };

    setHistory((prev) => [log, ...prev].slice(0, 100));
    updateWorkout(workout.id, { status: "Completed" });
  }

  function applyTemplate(template) {
    const next = template.workouts.map((workout) => ({
      ...workout,
      id: uid("w"),
      exercises: (workout.exercises || []).map((exercise) => ({
        ...exercise,
        difficulty: "Medium",
        pain: "0",
      })),
    }));

    setWorkouts((prev) => [...next, ...prev]);
  }

  return (
    <HealthDrawer
      open={open}
      onClose={onClose}
      title="Workout Studio"
      subtitle="Build workouts, track sets/reps/weight/rest, and complete sessions."
    >
      <div className="space-y-5">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-black text-white">Training templates</div>
              <div className="mt-1 text-xs leading-5 text-slate-400">
                Add a starter plan based on the user’s goal.
              </div>
            </div>

            <button
              type="button"
              onClick={addWorkout}
              className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-xs font-black text-cyan-100"
            >
              + Blank Workout
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {PROGRAM_TEMPLATES.map((template) => (
              <div key={template.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <div className="text-sm font-black text-white">{template.name}</div>
                <div className="mt-1 text-xs leading-5 text-slate-400">{template.description}</div>

                <button
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className="mt-3 w-full rounded-2xl border border-fuchsia-500/25 bg-fuchsia-500/10 px-3 py-2 text-xs font-black text-fuchsia-100"
                >
                  Add Template
                </button>
              </div>
            ))}
          </div>
        </div>

        {workouts.map((workout) => (
          <article
            key={workout.id}
            className={
              snapshot.today_workout_id === workout.id
                ? "rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-4"
                : "rounded-3xl border border-white/10 bg-white/[0.03] p-4"
            }
          >
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
              <Field
                label="Workout"
                value={workout.name}
                onChange={(value) => updateWorkout(workout.id, { name: value })}
              />

              <Field
                label="Minutes"
                value={workout.duration}
                onChange={(value) => updateWorkout(workout.id, { duration: value })}
                type="number"
              />
            </div>

            <div className="mt-3">
              <Field
                label="Focus"
                value={workout.focus}
                onChange={(value) => updateWorkout(workout.id, { focus: value })}
              />
            </div>

            <div className="mt-4 space-y-3">
              {(workout.exercises || []).map((exercise, index) => (
                <div key={`${workout.id}-${index}`} className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                  <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_70px_90px_90px]">
                    <Field
                      label="Exercise"
                      value={exercise.name}
                      onChange={(value) => updateExercise(workout.id, index, { name: value })}
                    />

                    <Field
                      label="Sets"
                      value={exercise.sets}
                      onChange={(value) => updateExercise(workout.id, index, { sets: value })}
                    />

                    <Field
                      label="Reps"
                      value={exercise.reps}
                      onChange={(value) => updateExercise(workout.id, index, { reps: value })}
                    />

                    <Field
                      label="Weight"
                      value={exercise.weight}
                      onChange={(value) => updateExercise(workout.id, index, { weight: value })}
                    />
                  </div>

                  <div className="mt-2 grid gap-2 md:grid-cols-[90px_110px_90px_minmax(0,1fr)]">
                    <Field
                      label="Rest"
                      value={exercise.rest}
                      onChange={(value) => updateExercise(workout.id, index, { rest: value })}
                    />

                    <label>
                      <div className="mb-1 text-xs font-semibold text-slate-400">Difficulty</div>
                      <select
                        value={exercise.difficulty || "Medium"}
                        onChange={(e) => updateExercise(workout.id, index, { difficulty: e.target.value })}
                        className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 text-sm text-white"
                      >
                        <option>Easy</option>
                        <option>Medium</option>
                        <option>Hard</option>
                      </select>
                    </label>

                    <Field
                      label="Pain"
                      value={exercise.pain || "0"}
                      onChange={(value) => updateExercise(workout.id, index, { pain: value })}
                      type="number"
                    />

                    <Field
                      label="Notes"
                      value={exercise.notes}
                      onChange={(value) => updateExercise(workout.id, index, { notes: value })}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeExercise(workout.id, index)}
                    className="mt-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs font-black text-rose-100"
                  >
                    Remove Exercise
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => addExercise(workout.id)} className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-xs font-black text-cyan-100">
                + Exercise
              </button>

              <button type="button" onClick={() => useToday(workout)} className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-100">
                Use Today
              </button>

              <button type="button" onClick={() => completeWorkout(workout)} className="rounded-2xl border border-indigo-500/25 bg-indigo-500/10 px-3 py-2 text-xs font-black text-indigo-100">
                Complete
              </button>

              <button type="button" onClick={() => removeWorkout(workout.id)} className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs font-black text-rose-100">
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>
    </HealthDrawer>
  );
}