// src/components/customer-health/WorkoutStudioDrawer.jsx
import React, { useMemo, useState } from "react";
import HealthDrawer from "./HealthDrawer";
import { PROGRAM_TEMPLATES, uid } from "./healthStorage";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function safeNumber(value) {
  const n = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function Field({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-slate-400">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-slate-400">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none transition focus:border-cyan-400/40"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Pill({ children, tone = "slate" }) {
  const tones = {
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-200",
    amber: "border-amber-500/25 bg-amber-500/10 text-amber-200",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
    fuchsia: "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-200",
    indigo: "border-indigo-500/25 bg-indigo-500/10 text-indigo-200",
    rose: "border-rose-500/25 bg-rose-500/10 text-rose-200",
    slate: "border-white/10 bg-white/[0.04] text-slate-300",
  };

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]",
        tones[tone] || tones.slate
      )}
    >
      {children}
    </span>
  );
}

function inferUserPath(profile = {}, snapshot = {}) {
  const goal = cleanText(profile.primary_goal || snapshot.goal).toLowerCase();
  const experience = cleanText(profile.experience).toLowerCase();
  const limitations = cleanText(profile.limitations).toLowerCase();
  const sport = cleanText(profile.sport).toLowerCase();

  if (
    limitations.includes("pain") ||
    limitations.includes("injury") ||
    limitations.includes("surgery") ||
    goal.includes("pain") ||
    goal.includes("mobility") ||
    goal.includes("rehab")
  ) {
    return {
      type: "Recovery / Weak Area",
      cadence: "Day-to-day",
      defaultProgression: "Protect and improve quality first",
      tone: "amber",
    };
  }

  if (sport || goal.includes("sport") || goal.includes("athletic")) {
    return {
      type: "Sport Performance",
      cadence: "Week-to-week",
      defaultProgression: "Build performance without breaking recovery",
      tone: "fuchsia",
    };
  }

  if (goal.includes("strength")) {
    return {
      type: "Strength",
      cadence: "Week-to-week",
      defaultProgression: "Progress load slowly when form and pain are controlled",
      tone: "indigo",
    };
  }

  if (goal.includes("muscle") || goal.includes("hypertrophy")) {
    return {
      type: "Muscle Gain",
      cadence: "Week-to-week",
      defaultProgression: "Add reps first, then load",
      tone: "emerald",
    };
  }

  if (goal.includes("fat") || goal.includes("weight") || goal.includes("lean")) {
    return {
      type: "Weight Loss / Health",
      cadence: "Day-to-day",
      defaultProgression: "Consistency, steps, calories, and repeatable workouts",
      tone: "cyan",
    };
  }

  if (experience.includes("beginner") || !experience) {
    return {
      type: "Beginner / General Health",
      cadence: "Day-to-day",
      defaultProgression: "Repeat clean movement before adding intensity",
      tone: "cyan",
    };
  }

  return {
    type: "General Fitness",
    cadence: "Hybrid",
    defaultProgression: "Balance consistency, strength, steps, and recovery",
    tone: "slate",
  };
}

function buildExerciseProgression(exercise, session = {}, profile = {}, snapshot = {}) {
  const pain = safeNumber(exercise.pain);
  const weight = safeNumber(exercise.weight);
  const reps = safeNumber(exercise.reps);
  const sets = safeNumber(exercise.sets);
  const difficulty = cleanText(exercise.difficulty || "Medium").toLowerCase();
  const sessionFeel = cleanText(session.session_feel).toLowerCase();
  const soreness = safeNumber(session.soreness);
  const readiness = cleanText(snapshot.readiness).toLowerCase();
  const path = inferUserPath(profile, snapshot);

  if (pain >= 4 || readiness.includes("pain")) {
    return {
      exercise: exercise.name,
      action: "Protect",
      next_target: "Reduce load/range and keep pain below 3/10",
      reason: "Pain is the limiter. The next win is safer movement, not more intensity.",
    };
  }

  if (soreness >= 7 || sessionFeel.includes("too hard") || readiness.includes("recovery")) {
    return {
      exercise: exercise.name,
      action: "Recover",
      next_target: "Repeat or reduce volume next session",
      reason: "Recovery is low. The system should hold intensity and preserve consistency.",
    };
  }

  if (path.type.includes("Beginner")) {
    return {
      exercise: exercise.name,
      action: difficulty.includes("easy") ? "Add reps" : "Repeat",
      next_target: difficulty.includes("easy")
        ? `Try ${sets || 3} sets of ${Math.max(reps + 1, reps || 10)} reps`
        : "Repeat same movement with cleaner form",
      reason: "Beginners progress best by consistency and cleaner reps before heavier loads.",
    };
  }

  if (path.type.includes("Weight Loss")) {
    return {
      exercise: exercise.name,
      action: difficulty.includes("easy") ? "Add volume" : "Repeat",
      next_target: difficulty.includes("easy")
        ? "Add 1 set, a short finisher, or more steps"
        : "Repeat the workout and keep nutrition consistent",
      reason: "For weight loss, consistency and total movement matter more than max load.",
    };
  }

  if (path.type.includes("Recovery")) {
    return {
      exercise: exercise.name,
      action: "Quality",
      next_target: "Slow tempo, controlled range, pain-free reps",
      reason: "Weak-area training should improve control before intensity.",
    };
  }

  if (difficulty.includes("easy")) {
    if (weight > 0) {
      const nextWeight = Math.max(weight + 5, Math.round((weight * 1.05) / 5) * 5);

      return {
        exercise: exercise.name,
        action: "Increase",
        next_target: `${nextWeight} lbs or add 1-2 reps per set`,
        reason: "Difficulty was easy and pain was controlled, so progression is safe.",
      };
    }

    return {
      exercise: exercise.name,
      action: "Increase",
      next_target: reps ? `Add 1-3 reps per set from ${reps}` : "Add reps, time, or a harder variation",
      reason: "Difficulty was easy and pain was controlled.",
    };
  }

  if (difficulty.includes("hard")) {
    return {
      exercise: exercise.name,
      action: "Hold",
      next_target: weight > 0 ? `Hold ${weight} lbs and improve form` : "Hold the same version",
      reason: "Hard sessions should be repeated before adding more.",
    };
  }

  return {
    exercise: exercise.name,
    action: "Progress",
    next_target: weight > 0 ? `Keep ${weight} lbs and add 1 clean rep per set` : "Add cleaner reps or slower tempo",
    reason: "Medium difficulty means controlled progression is the right path.",
  };
}

function buildSessionCoachNote({ profile, snapshot, workout, session, progressions }) {
  const path = inferUserPath(profile, snapshot);
  const painFlags = progressions.filter((item) => item.action === "Protect").length;
  const holds = progressions.filter((item) => item.action === "Hold" || item.action === "Recover").length;
  const increases = progressions.filter((item) => item.action === "Increase").length;

  if (painFlags) {
    return `This should adapt day-to-day. Pain showed up, so the next session should protect the weak area, reduce load or range, and keep movement pain-free.`;
  }

  if (holds) {
    return `Hold or repeat before progressing. The goal is not to force improvement every day; it is to stack clean sessions.`;
  }

  if (increases) {
    return `${path.cadence} progression is available. Increase only the easy movements and keep the rest consistent.`;
  }

  return `${path.defaultProgression}. Use this log to shape the next session around the user's actual readiness, goal, and recovery.`;
}

export default function WorkoutStudioDrawer({
  open,
  onClose,
  profile = {},
  snapshot,
  setSnapshot,
  workouts,
  setWorkouts,
  history,
  setHistory,
}) {
  const [session, setSession] = useState({
    adaptation_mode: "Auto",
    session_feel: "Good",
    energy: "7",
    soreness: "3",
    sleep_quality: "Good",
    time_pressure: "Normal",
    goal_for_today: "",
    coach_notes: "",
  });

  const userPath = useMemo(() => {
    return inferUserPath(profile, snapshot);
  }, [profile, snapshot]);

  function addWorkout() {
    setWorkouts((prev) => [
      ...prev,
      {
        id: uid("w"),
        name: "New Workout",
        duration: "30",
        focus: "Strength",
        status: "Planned",
        exercises: [
          {
            name: "New Exercise",
            sets: "3",
            reps: "10",
            weight: "",
            rest: "60 sec",
            notes: "",
            difficulty: "Medium",
            pain: "0",
          },
        ],
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
            {
              name: "New Exercise",
              sets: "3",
              reps: "10",
              weight: "",
              rest: "60 sec",
              notes: "",
              difficulty: "Medium",
              pain: "0",
            },
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
      goal: profile.primary_goal || prev.goal || "General fitness",
      equipment: profile.preferred_equipment || prev.equipment || "Bodyweight",
    }));
  }

  function completeWorkout(workout) {
    const exercises = (workout.exercises || []).map((exercise) => ({
      ...exercise,
      name: cleanText(exercise.name),
      sets: cleanText(exercise.sets),
      reps: cleanText(exercise.reps),
      weight: cleanText(exercise.weight),
      rest: cleanText(exercise.rest),
      difficulty: cleanText(exercise.difficulty || "Medium"),
      pain: cleanText(exercise.pain || "0"),
      notes: cleanText(exercise.notes),
    }));

    const progressions = exercises.map((exercise) =>
      buildExerciseProgression(exercise, session, profile, snapshot)
    );

    const coachNote = buildSessionCoachNote({
      profile,
      snapshot,
      workout,
      session,
      progressions,
    });

    const log = {
      id: uid("hist"),
      date: new Date().toISOString().slice(0, 10),
      completed_at: new Date().toISOString(),

      workout_id: workout.id,
      workout_name: workout.name,
      duration: workout.duration,
      focus: workout.focus,

      user_path: userPath.type,
      progression_cadence: session.adaptation_mode === "Auto" ? userPath.cadence : session.adaptation_mode,
      progression_default: userPath.defaultProgression,

      readiness: snapshot.readiness,
      goal: profile.primary_goal || snapshot.goal || "General fitness",
      sport: profile.sport || "",
      experience: profile.experience || "",
      limitations: profile.limitations || "",
      equipment: profile.preferred_equipment || snapshot.equipment || "",

      session_feel: session.session_feel,
      energy: session.energy,
      soreness: session.soreness,
      sleep_quality: session.sleep_quality,
      time_pressure: session.time_pressure,
      goal_for_today: session.goal_for_today,
      coach_notes: session.coach_notes,

      steps: snapshot.steps,
      calories: snapshot.calories,
      protein_today: snapshot.protein_today,
      weight: snapshot.weight,
      notes: snapshot.notes,

      exercises,
      progression_recommendations: progressions,
      next_session_note: coachNote,
    };

    setHistory((prev) => [log, ...prev].slice(0, 150));

    setSnapshot((prev) => ({
      ...prev,
      workout: workout.name,
      today_workout_id: workout.id,
      completed_workouts: Number(prev.completed_workouts || 0) + 1,
      last_completed_workout: workout.name,
      last_completed_at: log.completed_at,
      next_session_note: coachNote,
      progression_cadence: log.progression_cadence,
      user_path: userPath.type,
    }));

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
      subtitle="Adaptive workouts for beginners, athletes, busy parents, weight loss, strength, and recovery."
    >
      <div className="space-y-5">
        <div className="rounded-3xl border border-fuchsia-500/25 bg-fuchsia-500/10 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-black text-white">Adaptive Training Path</div>
              <div className="mt-1 text-xs leading-5 text-fuchsia-100/80">
                This molds the plan day-to-day or week-to-week based on the user, not just a hardcore fitness profile.
              </div>
            </div>

            <Pill tone={userPath.tone}>{userPath.type}</Pill>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <SelectField
              label="Progression style"
              value={session.adaptation_mode}
              onChange={(value) => setSession((prev) => ({ ...prev, adaptation_mode: value }))}
              options={["Auto", "Day-to-day", "Week-to-week", "Hybrid"]}
            />

            <SelectField
              label="Session feel"
              value={session.session_feel}
              onChange={(value) => setSession((prev) => ({ ...prev, session_feel: value }))}
              options={["Great", "Good", "Normal", "Too Hard", "Pain / Limited", "Skipped"]}
            />

            <SelectField
              label="Sleep"
              value={session.sleep_quality}
              onChange={(value) => setSession((prev) => ({ ...prev, sleep_quality: value }))}
              options={["Great", "Good", "Okay", "Poor"]}
            />

            <Field
              label="Energy 1-10"
              value={session.energy}
              onChange={(value) => setSession((prev) => ({ ...prev, energy: value }))}
              type="number"
              placeholder="7"
            />

            <Field
              label="Soreness 1-10"
              value={session.soreness}
              onChange={(value) => setSession((prev) => ({ ...prev, soreness: value }))}
              type="number"
              placeholder="3"
            />

            <SelectField
              label="Time pressure"
              value={session.time_pressure}
              onChange={(value) => setSession((prev) => ({ ...prev, time_pressure: value }))}
              options={["Normal", "Limited Time", "No Time", "Extra Time"]}
            />
          </div>

          <label className="mt-3 block">
            <div className="mb-1 text-xs font-semibold text-slate-400">Goal for today</div>
            <textarea
              value={session.goal_for_today}
              onChange={(e) => setSession((prev) => ({ ...prev, goal_for_today: e.target.value }))}
              placeholder="Example: get moving, avoid hip pain, improve squat form, hit a quick upper-body workout."
              rows={2}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40"
            />
          </label>

          <label className="mt-3 block">
            <div className="mb-1 text-xs font-semibold text-slate-400">Coach notes</div>
            <textarea
              value={session.coach_notes}
              onChange={(e) => setSession((prev) => ({ ...prev, coach_notes: e.target.value }))}
              placeholder="Anything the user felt today: tight hips, low back pressure, great energy, no time, etc."
              rows={2}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40"
            />
          </label>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-black text-white">Training templates</div>
              <div className="mt-1 text-xs leading-5 text-slate-400">
                Add starter plans based on general goal and adjust them to the user.
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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  {snapshot.today_workout_id === workout.id ? <Pill tone="emerald">Today</Pill> : null}
                  <Pill tone="slate">{workout.status || "Planned"}</Pill>
                  <Pill tone="cyan">{workout.focus || "Workout"}</Pill>
                </div>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
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

                    <SelectField
                      label="Difficulty"
                      value={exercise.difficulty || "Medium"}
                      onChange={(value) => updateExercise(workout.id, index, { difficulty: value })}
                      options={["Easy", "Medium", "Hard"]}
                    />

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
              <button
                type="button"
                onClick={() => addExercise(workout.id)}
                className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-xs font-black text-cyan-100"
              >
                + Exercise
              </button>

              <button
                type="button"
                onClick={() => useToday(workout)}
                className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-100"
              >
                Use Today
              </button>

              <button
                type="button"
                onClick={() => completeWorkout(workout)}
                className="rounded-2xl border border-indigo-500/25 bg-indigo-500/10 px-3 py-2 text-xs font-black text-indigo-100"
              >
                Complete + Adapt
              </button>

              <button
                type="button"
                onClick={() => removeWorkout(workout.id)}
                className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs font-black text-rose-100"
              >
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>
    </HealthDrawer>
  );
}