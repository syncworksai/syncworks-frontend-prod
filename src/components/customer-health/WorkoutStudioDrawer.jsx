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

function ymdFromDate(date) {
  const value = new Date(date);
  const yyyy = value.getFullYear();
  const mm = String(value.getMonth() + 1).padStart(2, "0");
  const dd = String(value.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function tomorrowYmd() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return ymdFromDate(date);
}

function defaultScheduleDraft() {
  const now = new Date();
  return {
    ymd: ymdFromDate(now),
    time: now.toTimeString().slice(0, 5),
    plan_control: "coach_assist",
  };
}

function formatScheduleDate(ymd) {
  if (!ymd) return "Date not set";

  const date = new Date(`${ymd}T12:00:00`);

  if (!Number.isFinite(date.getTime())) {
    return ymd;
  }

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function planControlLabel(value) {
  const labels = {
    locked: "Locked",
    coach_assist: "Coach Assist",
    adaptive: "Adaptive",
  };

  return labels[value] || "Coach Assist";
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
  onStartWorkout,
  onScheduleWorkout,
  onStartScheduledWorkout,
  onRescheduleScheduledWorkout,
  onRemoveScheduledWorkout,
}) {
  const [scheduleDrafts, setScheduleDrafts] = useState({});
  const [openScheduleId, setOpenScheduleId] = useState("");
  const [editingSessionId, setEditingSessionId] = useState("");
  const [sessionEdits, setSessionEdits] = useState({});

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

  const upcomingSessions = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return (Array.isArray(snapshot?.week_plan)
      ? snapshot.week_plan
      : []
    )
      .filter((item) => item?.status !== "Completed")
      .filter((item) => item?.workout_name || item?.name)
      .map((item) => {
        const sortTime = new Date(
          `${item.ymd || "2099-01-01"}T${
            item.time && item.time !== "Anytime"
              ? item.time
              : "23:59"
          }:00`
        ).getTime();

        return {
          ...item,
          sortTime,
        };
      })
      .filter(
        (item) =>
          Number.isFinite(item.sortTime) &&
          item.sortTime >= startOfToday.getTime()
      )
      .sort((a, b) => a.sortTime - b.sortTime);
  }, [snapshot?.week_plan]);

  function getSessionEdit(session) {
    return (
      sessionEdits[session.id] || {
        ymd: session.ymd || ymdFromDate(new Date()),
        time:
          session.time && session.time !== "Anytime"
            ? session.time
            : "06:00",
        plan_control:
          session.plan_control || "coach_assist",
      }
    );
  }

  function updateSessionEdit(session, patch) {
    setSessionEdits((previous) => ({
      ...previous,
      [session.id]: {
        ...getSessionEdit(session),
        ...patch,
      },
    }));
  }

  function saveSessionEdit(session) {
    onRescheduleScheduledWorkout?.(
      session.id,
      getSessionEdit(session)
    );
    setEditingSessionId("");
  }

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

  function getScheduleDraft(workoutId) {
    return scheduleDrafts[workoutId] || defaultScheduleDraft();
  }

  function updateScheduleDraft(workoutId, patch) {
    setScheduleDrafts((previous) => ({
      ...previous,
      [workoutId]: {
        ...(previous[workoutId] || defaultScheduleDraft()),
        ...patch,
      },
    }));
  }

  function useToday(workout) {
    onScheduleWorkout?.(workout, {
      ...getScheduleDraft(workout.id),
      ymd: ymdFromDate(new Date()),
    });
  }

  function duplicateWorkout(workout) {
    const copy = {
      ...workout,
      id: uid("w"),
      name: `${workout.name || "Workout"} Copy`,
      workout_name: `${workout.workout_name || workout.name || "Workout"} Copy`,
      status: "Planned",
      source: "custom_builder",
      saved_at: new Date().toISOString(),
      exercises: (workout.exercises || []).map((exercise) => ({
        ...exercise,
        id: uid("exercise"),
      })),
    };

    setWorkouts((previous) => [copy, ...(Array.isArray(previous) ? previous : [])]);
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
      title="My Workouts"
      subtitle="Choose a saved workout, start now, or schedule it for later. Open the studio only when you need to build or edit."
    >
      <div className="space-y-5">
        <section className="rounded-[2rem] border border-fuchsia-300/20 bg-[radial-gradient(circle_at_top_right,rgba(255,59,212,0.10),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(52,223,255,0.08),transparent_28%),linear-gradient(145deg,#07111f,#040812)] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-200">
                Training calendar
              </div>
              <h2 className="mt-1 text-2xl font-black text-white">
                Upcoming Workouts
              </h2>
              <p className="mt-1 max-w-xl text-xs leading-5 text-slate-400">
                Scheduled sessions are separate from saved workout templates. Start, reschedule, or remove each session here.
              </p>
            </div>

            <Pill tone="fuchsia">
              {upcomingSessions.length} scheduled
            </Pill>
          </div>

          {upcomingSessions.length ? (
            <div className="mt-4 space-y-3">
              {upcomingSessions.map((session) => {
                const editing = editingSessionId === session.id;
                const edit = getSessionEdit(session);

                return (
                  <article
                    key={`scheduled-${session.id}`}
                    className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-1.5">
                          <Pill tone="fuchsia">
                            {formatScheduleDate(session.ymd)}
                          </Pill>
                          <Pill tone="cyan">
                            {session.time || "Anytime"}
                          </Pill>
                          <Pill tone="slate">
                            {planControlLabel(
                              session.plan_control
                            )}
                          </Pill>
                        </div>

                        <h3 className="mt-3 truncate text-lg font-black text-white">
                          {session.workout_name ||
                            session.name ||
                            "Scheduled Workout"}
                        </h3>

                        <div className="mt-1 text-[11px] text-slate-500">
                          {(session.exercises || []).length} exercises
                          {" · "}
                          {session.source === "custom_workout"
                            ? "Custom session"
                            : "Planned session"}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          onStartScheduledWorkout?.(session)
                        }
                        className="h-11 shrink-0 rounded-2xl border border-lime-300/30 bg-lime-300/15 px-4 text-xs font-black text-lime-100"
                      >
                        Start
                      </button>
                    </div>

                    {editing ? (
                      <div className="mt-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.05] p-3">
                        <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
                          <input
                            type="date"
                            value={edit.ymd}
                            onChange={(event) =>
                              updateSessionEdit(session, {
                                ymd: event.target.value,
                              })
                            }
                            className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-cyan-300/40"
                          />

                          <input
                            type="time"
                            value={edit.time}
                            onChange={(event) =>
                              updateSessionEdit(session, {
                                time: event.target.value,
                              })
                            }
                            className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-cyan-300/40"
                          />
                        </div>

                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {[
                            ["locked", "Locked"],
                            ["coach_assist", "Coach Assist"],
                            ["adaptive", "Adaptive"],
                          ].map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() =>
                                updateSessionEdit(session, {
                                  plan_control: value,
                                })
                              }
                              className={cx(
                                "rounded-xl border px-2 py-2 text-[10px] font-black",
                                edit.plan_control === value
                                  ? "border-cyan-300/30 bg-cyan-300/15 text-cyan-100"
                                  : "border-white/10 bg-white/[0.03] text-slate-400"
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => saveSessionEdit(session)}
                            className="h-10 rounded-xl border border-lime-300/25 bg-lime-300/10 text-xs font-black text-lime-100"
                          >
                            Save Changes
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingSessionId("")}
                            className="h-10 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-black text-slate-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSessionEdits((previous) => ({
                              ...previous,
                              [session.id]: {
                                ymd:
                                  session.ymd ||
                                  ymdFromDate(new Date()),
                                time:
                                  session.time &&
                                  session.time !== "Anytime"
                                    ? session.time
                                    : "06:00",
                                plan_control:
                                  session.plan_control ||
                                  "coach_assist",
                              },
                            }));
                            setEditingSessionId(session.id);
                          }}
                          className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[10px] font-black text-cyan-100"
                        >
                          Reschedule
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onRemoveScheduledWorkout?.(session.id)
                          }
                          className="rounded-xl border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-[10px] font-black text-rose-100"
                        >
                          Remove Session
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-white/15 bg-black/20 p-6 text-center">
              <div className="text-sm font-black text-white">
                No upcoming workouts scheduled
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Schedule one from a saved workout below.
              </div>
            </div>
          )}
        </section>

        <section className="rounded-[2rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_top_left,rgba(57,255,136,0.10),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,59,212,0.08),transparent_28%),linear-gradient(145deg,#07111f,#040812)] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-300">
                Saved training
              </div>
              <h2 className="mt-1 text-2xl font-black text-white">
                My Workouts
              </h2>
              <p className="mt-1 max-w-xl text-xs leading-5 text-slate-400">
                Start immediately or place any saved workout on your schedule without opening the editor.
              </p>
            </div>

            <button
              type="button"
              onClick={addWorkout}
              className="rounded-2xl border border-lime-300/30 bg-lime-300/15 px-4 py-3 text-xs font-black text-lime-100"
            >
              + Build New Workout
            </button>
          </div>

          {workouts.length ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {workouts.map((workout) => {
                const exerciseCount = Array.isArray(workout.exercises)
                  ? workout.exercises.length
                  : 0;
                const setCount = (workout.exercises || []).reduce(
                  (total, exercise) =>
                    total + Math.max(0, safeNumber(exercise.sets)),
                  0
                );
                const scheduleOpen = openScheduleId === workout.id;
                const draft = getScheduleDraft(workout.id);

                return (
                  <article
                    key={`hub-${workout.id}`}
                    className={cx(
                      "overflow-hidden rounded-[1.6rem] border p-4",
                      snapshot.today_workout_id === workout.id
                        ? "border-lime-300/30 bg-lime-300/[0.08]"
                        : "border-white/10 bg-black/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-1.5">
                          {snapshot.today_workout_id === workout.id ? (
                            <Pill tone="emerald">Today</Pill>
                          ) : null}
                          <Pill tone="cyan">
                            {workout.focus || "Workout"}
                          </Pill>
                          <Pill tone="slate">
                            {workout.status || "Saved"}
                          </Pill>
                        </div>

                        <h3 className="mt-3 truncate text-xl font-black text-white">
                          {workout.name || "Untitled Workout"}
                        </h3>

                        <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-bold text-slate-400">
                          <span>{exerciseCount} exercises</span>
                          <span>{setCount} sets</span>
                          <span>{workout.duration || "30"} min</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setOpenScheduleId(
                            scheduleOpen ? "" : workout.id
                          )
                        }
                        className="shrink-0 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[10px] font-black text-cyan-100"
                      >
                        {scheduleOpen ? "Close" : "Schedule"}
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-[1.35fr_0.85fr] gap-2">
                      <button
                        type="button"
                        onClick={() => onStartWorkout?.(workout)}
                        className="h-12 rounded-2xl border border-lime-300/35 bg-lime-300/20 text-sm font-black text-lime-100 shadow-[0_0_28px_rgba(57,255,136,0.10)]"
                      >
                        Start Workout Now
                      </button>

                      <button
                        type="button"
                        onClick={() => useToday(workout)}
                        className="h-12 rounded-2xl border border-fuchsia-300/25 bg-fuchsia-300/10 px-2 text-xs font-black text-fuchsia-100"
                      >
                        Add Today
                      </button>
                    </div>

                    {scheduleOpen ? (
                      <div className="mt-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.05] p-3">
                        <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
                          <label className="block">
                            <div className="mb-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                              Date
                            </div>
                            <input
                              type="date"
                              value={draft.ymd}
                              onChange={(event) =>
                                updateScheduleDraft(workout.id, {
                                  ymd: event.target.value,
                                })
                              }
                              className="h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-cyan-300/40"
                            />
                          </label>

                          <label className="block">
                            <div className="mb-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                              Time
                            </div>
                            <input
                              type="time"
                              value={draft.time}
                              onChange={(event) =>
                                updateScheduleDraft(workout.id, {
                                  time: event.target.value,
                                })
                              }
                              className="h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-cyan-300/40"
                            />
                          </label>
                        </div>

                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {[
                            ["locked", "Locked"],
                            ["coach_assist", "Coach Assist"],
                            ["adaptive", "Adaptive"],
                          ].map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() =>
                                updateScheduleDraft(workout.id, {
                                  plan_control: value,
                                })
                              }
                              className={cx(
                                "rounded-xl border px-2 py-2.5 text-[10px] font-black",
                                draft.plan_control === value
                                  ? "border-cyan-300/30 bg-cyan-300/15 text-cyan-100"
                                  : "border-white/10 bg-white/[0.03] text-slate-400"
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              onScheduleWorkout?.(workout, {
                                ...draft,
                                ymd: tomorrowYmd(),
                              })
                            }
                            className="h-11 rounded-xl border border-fuchsia-300/25 bg-fuchsia-300/10 text-xs font-black text-fuchsia-100"
                          >
                            Schedule Tomorrow
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              onScheduleWorkout?.(workout, draft)
                            }
                            className="h-11 rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-xs font-black text-cyan-100"
                          >
                            Schedule Selected
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                      <button
                        type="button"
                        onClick={() => duplicateWorkout(workout)}
                        className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-[10px] font-black text-amber-100"
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const studio = document.getElementById(
                            `workout-editor-${workout.id}`
                          );
                          studio?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                        }}
                        className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black text-slate-200"
                      >
                        Edit in Studio
                      </button>
                      <button
                        type="button"
                        onClick={() => removeWorkout(workout.id)}
                        className="rounded-xl border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-[10px] font-black text-rose-100"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-white/15 bg-black/20 p-6 text-center">
              <div className="text-sm font-black text-white">
                No saved workouts yet
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Build one from scratch or add a template below.
              </div>
            </div>
          )}
        </section>

        <details className="group rounded-[2rem] border border-white/10 bg-white/[0.025]">
          <summary className="cursor-pointer list-none px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black text-white">
                  Workout Builder & Editor
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Create workouts, change exercises, or review adaptive coaching settings.
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black text-slate-300">
                Open Studio
              </div>
            </div>
          </summary>

          <div className="space-y-5 border-t border-white/10 p-4">
        <div className="rounded-3xl border border-fuchsia-500/25 bg-fuchsia-500/10 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-black text-white">Adaptive Training Path</div>
              <div className="mt-1 text-xs leading-5 text-fuchsia-100/80">
                {userPath.type === "Sport Performance"
                  ? "Athlete mode balances strength, mobility, practice, competition, and recovery."
                  : userPath.type === "Weight Loss / Health"
                  ? "Weight-loss mode prioritizes repeatable strength work, steps, cardio, protein, and consistency."
                  : userPath.type === "Recovery / Weak Area"
                  ? "Pain-aware mode keeps the goal intact while controlling range, load, and symptom response."
                  : "SYNC tailors coaching to the user's actual goal without forcing an athlete-style program."}
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
            id={`workout-editor-${workout.id}`}
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

            <div className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.05] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-black text-white">Schedule this workout</div>
                  <div className="mt-1 text-[11px] leading-5 text-slate-400">
                    Add multiple sessions to the same day, schedule ahead, or start immediately.
                  </div>
                </div>
                <Pill tone="cyan">
                  {(workout.exercises || []).length} exercises
                </Pill>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_120px_160px]">
                <label className="block">
                  <div className="mb-1 text-xs font-semibold text-slate-400">Date</div>
                  <input
                    type="date"
                    value={getScheduleDraft(workout.id).ymd}
                    onChange={(event) =>
                      updateScheduleDraft(workout.id, { ymd: event.target.value })
                    }
                    className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 text-sm text-white outline-none focus:border-cyan-400/40"
                  />
                </label>

                <label className="block">
                  <div className="mb-1 text-xs font-semibold text-slate-400">Time</div>
                  <input
                    type="time"
                    value={getScheduleDraft(workout.id).time}
                    onChange={(event) =>
                      updateScheduleDraft(workout.id, { time: event.target.value })
                    }
                    className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 text-sm text-white outline-none focus:border-cyan-400/40"
                  />
                </label>

                <SelectField
                  label="SYNC control"
                  value={getScheduleDraft(workout.id).plan_control}
                  onChange={(value) =>
                    updateScheduleDraft(workout.id, { plan_control: value })
                  }
                  options={["locked", "coach_assist", "adaptive"]}
                />
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <button
                  type="button"
                  onClick={() => onStartWorkout?.(workout)}
                  className="h-11 rounded-2xl border border-lime-300/30 bg-lime-300/15 text-xs font-black text-lime-100"
                >
                  Start Now
                </button>

                <button
                  type="button"
                  onClick={() => useToday(workout)}
                  className="h-11 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 text-xs font-black text-emerald-100"
                >
                  Add Another Today
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onScheduleWorkout?.(workout, {
                      ...getScheduleDraft(workout.id),
                      ymd: tomorrowYmd(),
                    })
                  }
                  className="h-11 rounded-2xl border border-fuchsia-500/25 bg-fuchsia-500/10 text-xs font-black text-fuchsia-100"
                >
                  Schedule Tomorrow
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onScheduleWorkout?.(workout, getScheduleDraft(workout.id))
                  }
                  className="h-11 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-xs font-black text-cyan-100"
                >
                  Schedule Selected
                </button>
              </div>

              <div className="mt-2 text-[10px] leading-4 text-slate-500">
                Locked preserves the workout. Coach assist adds cues and safety checks. Adaptive allows suggested changes with approval.
              </div>
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
                onClick={() => duplicateWorkout(workout)}
                className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-black text-amber-100"
              >
                Duplicate
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
        </details>
      </div>
    </HealthDrawer>
  );
}