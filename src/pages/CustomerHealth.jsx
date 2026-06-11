// src/pages/CustomerHealth.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import ModeBar from "../components/ModeBar";
import PaidGate from "../components/paid/PaidGate";

const STRIPE_HEALTH_CHECKOUT_URL = "https://buy.stripe.com/4gMfZh0Y2ar5aT70Kn2Nq0b";
const HEALTH_LOGO_URL = "/brands/health.jpg";

const SNAPSHOT_KEY = "sw_customer_health_snapshot_v1";
const WORKOUTS_KEY = "sw_customer_health_workouts_v1";
const PROFILE_KEY = "sw_customer_health_profile_v1";
const HISTORY_KEY = "sw_customer_health_history_v1";
const PROGRESS_KEY = "sw_customer_health_progress_v1";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
}

function safeNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // no-op
  }
}

function todayYmd() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function prettyDate(value) {
  if (!value) return "Not set";

  const d = new Date(`${value}T00:00:00`);
  if (!Number.isFinite(d.getTime())) return value;

  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isWithinDays(dateStr, days) {
  if (!dateStr) return false;

  const d = new Date(`${dateStr}T00:00:00`);
  if (!Number.isFinite(d.getTime())) return false;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const diff = Math.round((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 && diff <= days;
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, safeNumber(value)));
}

function Card({ title, subtitle, right, children, tone = "slate", className = "" }) {
  const tones = {
    cyan: "border-cyan-400/20 bg-cyan-500/10",
    amber: "border-amber-400/20 bg-amber-500/10",
    emerald: "border-emerald-400/20 bg-emerald-500/10",
    fuchsia: "border-fuchsia-400/20 bg-fuchsia-500/10",
    indigo: "border-indigo-400/20 bg-indigo-500/10",
    rose: "border-rose-400/20 bg-rose-500/10",
    slate: "border-white/10 bg-white/[0.03]",
  };

  return (
    <section
      className={cx(
        "rounded-[1.65rem] border p-4 shadow-[0_18px_60px_rgba(0,0,0,0.24)]",
        tones[tone] || tones.slate,
        className
      )}
    >
      {(title || subtitle || right) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? <h3 className="text-base font-black text-white">{title}</h3> : null}
            {subtitle ? <p className="mt-1 text-xs leading-5 text-slate-400">{subtitle}</p> : null}
          </div>

          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      )}

      {children}
    </section>
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

function Field({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-slate-400">{label}</div>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-400/40"
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
        className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-slate-100 outline-none transition focus:border-emerald-400/40"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function ProgressBar({ percent, tone = "emerald" }) {
  const fill =
    tone === "cyan"
      ? "bg-cyan-400"
      : tone === "amber"
      ? "bg-amber-400"
      : tone === "rose"
      ? "bg-rose-400"
      : tone === "indigo"
      ? "bg-indigo-400"
      : "bg-emerald-400";

  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-slate-950/70">
      <div
        className={cx("h-full rounded-full transition-all", fill)}
        style={{ width: `${clampPercent(percent)}%` }}
      />
    </div>
  );
}

function readinessTone(readiness) {
  if (readiness === "Pain / Limit") return "rose";
  if (readiness === "Need Recovery") return "amber";
  if (readiness === "Moderate") return "cyan";
  return "emerald";
}

function readinessSuggestion(readiness) {
  if (readiness === "Pain / Limit") {
    return "Keep it conservative. Use rest, mobility, walking, or light recovery work today.";
  }

  if (readiness === "Need Recovery") {
    return "Go lighter today. Choose recovery, steps, mobility, and lower intensity work.";
  }

  if (readiness === "Moderate") {
    return "Train with control. Shorten the workout or reduce volume if needed.";
  }

  return "You look ready for a normal session. Hit the planned workout and track completion.";
}

const PROGRAM_TEMPLATES = [
  {
    id: "starter_3_day",
    name: "Starter 3-Day Strength",
    label: "3-Day",
    description: "Simple full-body strength structure for consistency.",
    workouts: [
      {
        name: "Full Body A",
        duration: "35",
        focus: "Legs • Push • Pull • Core",
        status: "Planned",
        exercises: [
          { name: "Squat Pattern", sets: "3", reps: "8-10", weight: "", rest: "90 sec", notes: "" },
          { name: "Push-Up / Chest Press", sets: "3", reps: "8-12", weight: "", rest: "90 sec", notes: "" },
          { name: "Row", sets: "3", reps: "10-12", weight: "", rest: "90 sec", notes: "" },
          { name: "Plank", sets: "3", reps: "30 sec", weight: "", rest: "60 sec", notes: "" },
        ],
      },
      {
        name: "Full Body B",
        duration: "35",
        focus: "Hinge • Shoulders • Back • Core",
        status: "Planned",
        exercises: [
          { name: "Hip Hinge / RDL", sets: "3", reps: "8-10", weight: "", rest: "90 sec", notes: "" },
          { name: "Shoulder Press", sets: "3", reps: "8-12", weight: "", rest: "90 sec", notes: "" },
          { name: "Pulldown / Assisted Pull", sets: "3", reps: "10-12", weight: "", rest: "90 sec", notes: "" },
          { name: "Dead Bug", sets: "3", reps: "8 each", weight: "", rest: "45 sec", notes: "" },
        ],
      },
      {
        name: "Full Body C",
        duration: "35",
        focus: "Single Leg • Push • Pull • Carry",
        status: "Planned",
        exercises: [
          { name: "Split Squat / Step-Up", sets: "3", reps: "8 each", weight: "", rest: "90 sec", notes: "" },
          { name: "Incline Press", sets: "3", reps: "8-12", weight: "", rest: "90 sec", notes: "" },
          { name: "Cable / Band Row", sets: "3", reps: "10-12", weight: "", rest: "90 sec", notes: "" },
          { name: "Farmer Carry", sets: "3", reps: "30-45 sec", weight: "", rest: "60 sec", notes: "" },
        ],
      },
    ],
  },
  {
    id: "bodyweight_recovery",
    name: "Bodyweight + Recovery",
    label: "Recovery",
    description: "Low-equipment plan for movement, steps, and consistency.",
    workouts: [
      {
        name: "Mobility Reset",
        duration: "20",
        focus: "Mobility • Breathing • Core",
        status: "Planned",
        exercises: [
          { name: "Walk", sets: "1", reps: "10 min", weight: "", rest: "", notes: "" },
          { name: "Hip Mobility", sets: "2", reps: "8 each", weight: "", rest: "30 sec", notes: "" },
          { name: "Cat Cow", sets: "2", reps: "10", weight: "", rest: "30 sec", notes: "" },
          { name: "Dead Bug", sets: "2", reps: "8 each", weight: "", rest: "30 sec", notes: "" },
        ],
      },
      {
        name: "Bodyweight Strength",
        duration: "25",
        focus: "Push • Legs • Core",
        status: "Planned",
        exercises: [
          { name: "Bodyweight Squat", sets: "3", reps: "10-15", weight: "", rest: "60 sec", notes: "" },
          { name: "Push-Up Variation", sets: "3", reps: "6-12", weight: "", rest: "60 sec", notes: "" },
          { name: "Glute Bridge", sets: "3", reps: "12-15", weight: "", rest: "60 sec", notes: "" },
          { name: "Side Plank", sets: "2", reps: "20 sec each", weight: "", rest: "45 sec", notes: "" },
        ],
      },
    ],
  },
  {
    id: "gym_4_day",
    name: "Gym 4-Day Split",
    label: "4-Day",
    description: "Upper/lower structure for gym training.",
    workouts: [
      {
        name: "Upper A",
        duration: "45",
        focus: "Chest • Back • Shoulders",
        status: "Planned",
        exercises: [
          { name: "Bench Press", sets: "3", reps: "6-10", weight: "", rest: "2 min", notes: "" },
          { name: "Row", sets: "3", reps: "8-12", weight: "", rest: "90 sec", notes: "" },
          { name: "Shoulder Press", sets: "3", reps: "8-10", weight: "", rest: "90 sec", notes: "" },
          { name: "Lat Pulldown", sets: "3", reps: "10-12", weight: "", rest: "90 sec", notes: "" },
        ],
      },
      {
        name: "Lower A",
        duration: "45",
        focus: "Squat • Hinge • Core",
        status: "Planned",
        exercises: [
          { name: "Squat", sets: "3", reps: "6-10", weight: "", rest: "2 min", notes: "" },
          { name: "Romanian Deadlift", sets: "3", reps: "8-10", weight: "", rest: "2 min", notes: "" },
          { name: "Leg Curl", sets: "3", reps: "10-12", weight: "", rest: "90 sec", notes: "" },
          { name: "Core", sets: "3", reps: "30 sec", weight: "", rest: "60 sec", notes: "" },
        ],
      },
      {
        name: "Upper B",
        duration: "45",
        focus: "Incline • Pull • Arms",
        status: "Planned",
        exercises: [
          { name: "Incline Press", sets: "3", reps: "8-10", weight: "", rest: "90 sec", notes: "" },
          { name: "Pull-Up / Pulldown", sets: "3", reps: "8-12", weight: "", rest: "90 sec", notes: "" },
          { name: "Lateral Raise", sets: "3", reps: "12-15", weight: "", rest: "60 sec", notes: "" },
          { name: "Arm Superset", sets: "3", reps: "10-12", weight: "", rest: "60 sec", notes: "" },
        ],
      },
      {
        name: "Lower B",
        duration: "45",
        focus: "Single Leg • Glutes • Conditioning",
        status: "Planned",
        exercises: [
          { name: "Split Squat", sets: "3", reps: "8 each", weight: "", rest: "90 sec", notes: "" },
          { name: "Hip Thrust", sets: "3", reps: "8-12", weight: "", rest: "90 sec", notes: "" },
          { name: "Leg Press", sets: "3", reps: "10-12", weight: "", rest: "90 sec", notes: "" },
          { name: "Conditioning", sets: "1", reps: "8-12 min", weight: "", rest: "", notes: "" },
        ],
      },
    ],
  },
];

function defaultWorkouts() {
  return [
    {
      id: "w-push",
      name: "Push Day",
      duration: "35",
      focus: "Chest • Shoulders • Triceps",
      status: "Planned",
      exercises: [
        { name: "Push-Up / Chest Press", sets: "3", reps: "8-12", weight: "", rest: "90 sec", notes: "" },
        { name: "Shoulder Press", sets: "3", reps: "8-10", weight: "", rest: "90 sec", notes: "" },
        { name: "Triceps Extension", sets: "3", reps: "10-12", weight: "", rest: "60 sec", notes: "" },
      ],
    },
    {
      id: "w-walk",
      name: "Walk / Steps",
      duration: "25",
      focus: "Recovery • Cardio",
      status: "Optional",
      exercises: [
        { name: "Walk", sets: "1", reps: "25 min", weight: "", rest: "", notes: "" },
      ],
    },
    {
      id: "w-core",
      name: "Core Reset",
      duration: "12",
      focus: "Core • Mobility",
      status: "Optional",
      exercises: [
        { name: "Dead Bug", sets: "2", reps: "8 each", weight: "", rest: "30 sec", notes: "" },
        { name: "Side Plank", sets: "2", reps: "20 sec each", weight: "", rest: "30 sec", notes: "" },
      ],
    },
  ];
}

export default function CustomerHealth() {
  const nav = useNavigate();

  const [profile, setProfile] = useState(() => {
    const saved = readJson(PROFILE_KEY, null);

    return {
      primary_goal: saved?.primary_goal ?? "General fitness",
      experience: saved?.experience ?? "Beginner",
      training_days: saved?.training_days ?? "3",
      preferred_time: saved?.preferred_time ?? "Morning",
      limitations: saved?.limitations ?? "",
      preferred_equipment: saved?.preferred_equipment ?? "Bodyweight",
    };
  });

  const [form, setForm] = useState(() => {
    const saved = readJson(SNAPSHOT_KEY, null);

    return {
      workout: saved?.workout ?? "",
      today_workout_id: saved?.today_workout_id ?? "",
      steps: saved?.steps ?? "",
      step_goal: saved?.step_goal ?? 8000,
      calories: saved?.calories ?? "",
      calorie_goal: saved?.calorie_goal ?? 2200,
      protein_goal: saved?.protein_goal ?? "",
      protein_today: saved?.protein_today ?? "",
      weight: saved?.weight ?? "",
      readiness: saved?.readiness ?? "Ready",
      time_available: saved?.time_available ?? "30 minutes",
      equipment: saved?.equipment ?? "Bodyweight",
      goal: saved?.goal ?? "General fitness",
      notes: saved?.notes ?? "",
    };
  });

  const [workouts, setWorkouts] = useState(() => {
    const saved = readJson(WORKOUTS_KEY, null);

    if (Array.isArray(saved) && saved.length) {
      return saved.map((w) => ({
        ...w,
        exercises: Array.isArray(w.exercises) ? w.exercises : [],
      }));
    }

    return defaultWorkouts();
  });

  const [history, setHistory] = useState(() => {
    const saved = readJson(HISTORY_KEY, []);
    return Array.isArray(saved) ? saved : [];
  });

  const [progressLogs, setProgressLogs] = useState(() => {
    const saved = readJson(PROGRESS_KEY, []);
    return Array.isArray(saved) ? saved : [];
  });

  const steps = safeNumber(form.steps);
  const stepGoal = safeNumber(form.step_goal) || 8000;
  const calories = safeNumber(form.calories);
  const calorieGoal = safeNumber(form.calorie_goal) || 2200;
  const proteinGoal = safeNumber(form.protein_goal);
  const proteinToday = safeNumber(form.protein_today);
  const weight = safeNumber(form.weight);

  const stepPercent = stepGoal > 0 ? Math.min(100, Math.round((steps / stepGoal) * 100)) : 0;
  const caloriePercent = calorieGoal > 0 ? Math.min(100, Math.round((calories / calorieGoal) * 100)) : 0;
  const proteinPercent = proteinGoal > 0 ? Math.min(100, Math.round((proteinToday / proteinGoal) * 100)) : 0;

  const completedWorkouts = workouts.filter((w) => w.status === "Completed").length;
  const plannedWorkouts = workouts.filter((w) => w.status === "Planned").length;
  const weeklyCompleted = history.filter((item) => isWithinDays(item.date, 7)).length;
  const tone = readinessTone(form.readiness);

  const todayWorkout = useMemo(() => {
    return (
      workouts.find((w) => w.id === form.today_workout_id) ||
      workouts.find((w) => w.name === form.workout) ||
      null
    );
  }, [workouts, form.today_workout_id, form.workout]);

  const snapshot = useMemo(() => {
    return {
      workout: form.workout,
      today_workout_id: form.today_workout_id,
      steps,
      step_goal: stepGoal,
      calories,
      calorie_goal: calorieGoal,
      protein_goal: proteinGoal,
      protein_today: proteinToday,
      weight,
      readiness: form.readiness,
      time_available: form.time_available,
      equipment: form.equipment,
      goal: form.goal,
      notes: form.notes,
      completed_workouts: completedWorkouts,
      planned_workouts: plannedWorkouts,
      weekly_completed: weeklyCompleted,
      updated_at: new Date().toISOString(),
    };
  }, [
    form,
    steps,
    stepGoal,
    calories,
    calorieGoal,
    proteinGoal,
    proteinToday,
    weight,
    completedWorkouts,
    plannedWorkouts,
    weeklyCompleted,
  ]);

  useEffect(() => {
    writeJson(SNAPSHOT_KEY, snapshot);
  }, [snapshot]);

  useEffect(() => {
    writeJson(WORKOUTS_KEY, workouts);
  }, [workouts]);

  useEffect(() => {
    writeJson(PROFILE_KEY, profile);
  }, [profile]);

  useEffect(() => {
    writeJson(HISTORY_KEY, history);
  }, [history]);

  useEffect(() => {
    writeJson(PROGRESS_KEY, progressLogs);
  }, [progressLogs]);

  function updateWorkout(id, patch) {
    setWorkouts((prev) =>
      prev.map((workout) => {
        if (workout.id !== id) return workout;
        return { ...workout, ...patch };
      })
    );
  }

  function updateExercise(workoutId, exerciseIndex, patch) {
    setWorkouts((prev) =>
      prev.map((workout) => {
        if (workout.id !== workoutId) return workout;

        const exercises = Array.isArray(workout.exercises) ? [...workout.exercises] : [];
        exercises[exerciseIndex] = {
          ...exercises[exerciseIndex],
          ...patch,
        };

        return {
          ...workout,
          exercises,
        };
      })
    );
  }

  function addExercise(workoutId) {
    setWorkouts((prev) =>
      prev.map((workout) => {
        if (workout.id !== workoutId) return workout;

        return {
          ...workout,
          exercises: [
            ...(Array.isArray(workout.exercises) ? workout.exercises : []),
            { name: "New Exercise", sets: "3", reps: "10", weight: "", rest: "60 sec", notes: "" },
          ],
        };
      })
    );
  }

  function removeExercise(workoutId, exerciseIndex) {
    setWorkouts((prev) =>
      prev.map((workout) => {
        if (workout.id !== workoutId) return workout;

        return {
          ...workout,
          exercises: (workout.exercises || []).filter((_, index) => index !== exerciseIndex),
        };
      })
    );
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
          { name: "New Exercise", sets: "3", reps: "10", weight: "", rest: "60 sec", notes: "" },
        ],
      },
    ]);
  }

  function removeWorkout(id) {
    setWorkouts((prev) => prev.filter((workout) => workout.id !== id));

    if (form.today_workout_id === id) {
      setForm((prev) => ({
        ...prev,
        today_workout_id: "",
        workout: "",
      }));
    }
  }

  function useWorkoutAsToday(workout) {
    setForm((prev) => ({
      ...prev,
      workout: workout.name,
      today_workout_id: workout.id,
      time_available: `${workout.duration || 30} minutes`,
    }));
  }

  function completeWorkout(workout = todayWorkout) {
    const name = workout?.name || form.workout || "Workout";
    if (!name) return;

    const log = {
      id: uid("hist"),
      date: todayYmd(),
      workout_id: workout?.id || "",
      workout_name: name,
      duration: workout?.duration || form.time_available || "",
      readiness: form.readiness,
      steps,
      calories,
      protein_today: proteinToday,
      notes: form.notes || "",
      exercises: Array.isArray(workout?.exercises) ? workout.exercises : [],
      completed_at: new Date().toISOString(),
    };

    setHistory((prev) => [log, ...prev].slice(0, 100));

    if (workout?.id) {
      updateWorkout(workout.id, { status: "Completed" });
    }
  }

  function addProgressLog() {
    const log = {
      id: uid("progress"),
      date: todayYmd(),
      weight,
      steps,
      calories,
      protein_today: proteinToday,
      readiness: form.readiness,
      workout: form.workout || "",
      note: form.notes || "",
      created_at: new Date().toISOString(),
    };

    setProgressLogs((prev) => [log, ...prev].slice(0, 100));
  }

  function removeProgressLog(id) {
    setProgressLogs((prev) => prev.filter((item) => item.id !== id));
  }

  function removeHistoryLog(id) {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  }

  function applyTemplate(template) {
    const next = template.workouts.map((workout) => ({
      ...workout,
      id: uid("w"),
      exercises: (workout.exercises || []).map((exercise) => ({ ...exercise })),
    }));

    setWorkouts((prev) => [...next, ...prev]);
  }

  function setProteinFromWeight() {
    const w = safeNumber(form.weight);
    if (!w) return;

    setForm((prev) => ({
      ...prev,
      protein_goal: String(Math.round(w * 0.8)),
    }));
  }

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#020617] text-slate-100">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[#020617]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.10),transparent_32%),radial-gradient(circle_at_bottom,rgba(99,102,241,0.12),transparent_38%)]" />
      </div>

      <ModeBar
        title="Health"
        subtitle="Readiness • workouts • nutrition • progress • routines"
        rightActions={
          <button
            type="button"
            onClick={() => nav("/customer")}
            className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
          >
            Back
          </button>
        }
      />

      <main className="relative mx-auto max-w-6xl px-3 pb-12 pt-4 sm:px-5">
        <PaidGate
          entitlementKey="health"
          title="Health & Fitness"
          subtitle="Build workouts, track readiness, log progress, and keep your routine organized."
          checkoutUrl={STRIPE_HEALTH_CHECKOUT_URL}
          ctaTo="/upgrade"
          ctaLabel="View plans / Upgrade"
          iconUrl={HEALTH_LOGO_URL}
        >
          <div className="space-y-5">
            <section className="relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-slate-950/65 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.28)] md:p-6">
              <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-emerald-500/14 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-28 left-1/4 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

              <div className="relative">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-200/90">
                      SyncWorks Fitness
                    </div>

                    <h1 className="mt-2 text-2xl font-black tracking-tight text-white md:text-4xl">
                      Fitness command center
                    </h1>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                      Plan the session, track the basics, finish the workout, and keep your history organized.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Pill tone={tone}>{form.readiness}</Pill>
                    <Pill tone="cyan">{weeklyCompleted} This Week</Pill>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <Card tone="emerald" className="shadow-none">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-200">
                      Today’s Workout
                    </div>
                    <div className="mt-2 text-xl font-black text-white">
                      {form.workout || "Not set"}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {form.time_available} • {form.equipment}
                    </div>
                  </Card>

                  <Card tone="cyan" className="shadow-none">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-200">
                      Steps
                    </div>
                    <div className="mt-2 text-3xl font-black text-white">
                      {steps.toLocaleString()}
                    </div>
                    <div className="mt-3">
                      <ProgressBar percent={stepPercent} tone="cyan" />
                    </div>
                    <div className="mt-1 text-xs text-slate-400">{stepPercent}% of goal</div>
                  </Card>

                  <Card tone="indigo" className="shadow-none">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-indigo-200">
                      Protein
                    </div>
                    <div className="mt-2 text-3xl font-black text-white">
                      {proteinToday.toLocaleString()}g
                    </div>
                    <div className="mt-3">
                      <ProgressBar percent={proteinPercent} tone="emerald" />
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Goal {proteinGoal.toLocaleString()}g
                    </div>
                  </Card>
                </div>
              </div>
            </section>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
              <div className="space-y-5">
                <Card
                  title="Fitness Profile"
                  subtitle="Set the training direction for workouts and daily targets."
                  tone="indigo"
                  right={<Pill tone="indigo">Profile</Pill>}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <SelectField
                      label="Primary goal"
                      value={profile.primary_goal}
                      onChange={(value) => {
                        setProfile((p) => ({ ...p, primary_goal: value }));
                        setForm((p) => ({ ...p, goal: value }));
                      }}
                      options={[
                        "General fitness",
                        "Fat loss",
                        "Muscle gain",
                        "Strength",
                        "Mobility",
                        "Athletic performance",
                      ]}
                    />

                    <SelectField
                      label="Experience"
                      value={profile.experience}
                      onChange={(value) => setProfile((p) => ({ ...p, experience: value }))}
                      options={["Beginner", "Intermediate", "Advanced"]}
                    />

                    <SelectField
                      label="Training days"
                      value={profile.training_days}
                      onChange={(value) => setProfile((p) => ({ ...p, training_days: value }))}
                      options={["2", "3", "4", "5", "6"]}
                    />

                    <SelectField
                      label="Preferred time"
                      value={profile.preferred_time}
                      onChange={(value) => setProfile((p) => ({ ...p, preferred_time: value }))}
                      options={["Morning", "Lunch", "Afternoon", "Evening", "Flexible"]}
                    />

                    <SelectField
                      label="Preferred equipment"
                      value={profile.preferred_equipment}
                      onChange={(value) => {
                        setProfile((p) => ({ ...p, preferred_equipment: value }));
                        setForm((p) => ({ ...p, equipment: value }));
                      }}
                      options={["Bodyweight", "Dumbbells", "Full gym", "Bands", "Cardio only"]}
                    />
                  </div>

                  <label className="mt-3 block">
                    <div className="mb-1 text-xs font-semibold text-slate-400">
                      Limitations / notes
                    </div>

                    <textarea
                      value={profile.limitations}
                      onChange={(e) => setProfile((p) => ({ ...p, limitations: e.target.value }))}
                      placeholder="Example: hip feels tight, avoid heavy squats, keep sessions under 45 minutes."
                      rows={3}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-400/40"
                    />
                  </label>
                </Card>

                <Card
                  title="Daily Readiness"
                  subtitle="This powers the dashboard and Life Schedule."
                  tone="emerald"
                  right={<Pill tone="emerald">Synced</Pill>}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      label="Today’s workout"
                      value={form.workout}
                      onChange={(value) => setForm((p) => ({ ...p, workout: value, today_workout_id: "" }))}
                      placeholder="Push Day"
                    />

                    <SelectField
                      label="Readiness"
                      value={form.readiness}
                      onChange={(value) => setForm((p) => ({ ...p, readiness: value }))}
                      options={["Ready", "Moderate", "Need Recovery", "Pain / Limit"]}
                    />

                    <Field
                      label="Steps"
                      value={form.steps}
                      onChange={(value) => setForm((p) => ({ ...p, steps: value }))}
                      type="number"
                      placeholder="5000"
                    />

                    <Field
                      label="Step goal"
                      value={form.step_goal}
                      onChange={(value) => setForm((p) => ({ ...p, step_goal: value }))}
                      type="number"
                      placeholder="8000"
                    />

                    <Field
                      label="Calories"
                      value={form.calories}
                      onChange={(value) => setForm((p) => ({ ...p, calories: value }))}
                      type="number"
                      placeholder="1800"
                    />

                    <Field
                      label="Calorie target"
                      value={form.calorie_goal}
                      onChange={(value) => setForm((p) => ({ ...p, calorie_goal: value }))}
                      type="number"
                      placeholder="2200"
                    />

                    <Field
                      label="Protein today"
                      value={form.protein_today}
                      onChange={(value) => setForm((p) => ({ ...p, protein_today: value }))}
                      type="number"
                      placeholder="120"
                    />

                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                      <Field
                        label="Protein goal"
                        value={form.protein_goal}
                        onChange={(value) => setForm((p) => ({ ...p, protein_goal: value }))}
                        type="number"
                        placeholder="180"
                      />

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={setProteinFromWeight}
                          className="h-11 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3 text-xs font-black text-emerald-100 hover:bg-emerald-500/15"
                        >
                          Auto
                        </button>
                      </div>
                    </div>

                    <Field
                      label="Weight"
                      value={form.weight}
                      onChange={(value) => setForm((p) => ({ ...p, weight: value }))}
                      type="number"
                      placeholder="205"
                    />

                    <SelectField
                      label="Time available"
                      value={form.time_available}
                      onChange={(value) => setForm((p) => ({ ...p, time_available: value }))}
                      options={["10 minutes", "20 minutes", "30 minutes", "45 minutes", "60 minutes"]}
                    />

                    <SelectField
                      label="Equipment"
                      value={form.equipment}
                      onChange={(value) => setForm((p) => ({ ...p, equipment: value }))}
                      options={["Bodyweight", "Dumbbells", "Full gym", "Bands", "Cardio only"]}
                    />

                    <SelectField
                      label="Goal"
                      value={form.goal}
                      onChange={(value) => setForm((p) => ({ ...p, goal: value }))}
                      options={[
                        "General fitness",
                        "Fat loss",
                        "Muscle gain",
                        "Strength",
                        "Mobility",
                        "Athletic performance",
                      ]}
                    />
                  </div>

                  <label className="mt-3 block">
                    <div className="mb-1 text-xs font-semibold text-slate-400">
                      Daily notes
                    </div>

                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Example: hip feels tight, keep lower body light, 30 minutes max."
                      rows={3}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-400/40"
                    />
                  </label>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => completeWorkout()}
                      className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-xs font-black text-emerald-100 hover:bg-emerald-500/15"
                    >
                      Complete Workout
                    </button>

                    <button
                      type="button"
                      onClick={addProgressLog}
                      className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-3 text-xs font-black text-cyan-100 hover:bg-cyan-500/15"
                    >
                      Log Progress
                    </button>
                  </div>
                </Card>

                <Card
                  title="Workout Builder"
                  subtitle="Build sessions with exercises, sets, reps, rest, and notes."
                  tone="cyan"
                  right={
                    <button
                      type="button"
                      onClick={addWorkout}
                      className="rounded-2xl border border-cyan-400/25 bg-cyan-500/12 px-3 py-2 text-xs font-black text-cyan-100 hover:bg-cyan-500/18"
                    >
                      + Workout
                    </button>
                  }
                >
                  <div className="space-y-3">
                    {workouts.map((workout) => (
                      <div
                        key={workout.id}
                        className={cx(
                          "rounded-2xl border bg-white/[0.03] p-4",
                          form.today_workout_id === workout.id
                            ? "border-emerald-400/30"
                            : "border-white/10"
                        )}
                      >
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px]">
                          <Field
                            label="Workout"
                            value={workout.name}
                            onChange={(value) => updateWorkout(workout.id, { name: value })}
                            placeholder="Push Day"
                          />

                          <Field
                            label="Minutes"
                            value={workout.duration}
                            onChange={(value) => updateWorkout(workout.id, { duration: value })}
                            type="number"
                            placeholder="35"
                          />
                        </div>

                        <div className="mt-3">
                          <Field
                            label="Focus"
                            value={workout.focus}
                            onChange={(value) => updateWorkout(workout.id, { focus: value })}
                            placeholder="Chest • Shoulders • Triceps"
                          />
                        </div>

                        <div className="mt-4 space-y-3">
                          {(workout.exercises || []).map((exercise, index) => (
                            <div
                              key={`${workout.id}-exercise-${index}`}
                              className="rounded-2xl border border-white/10 bg-slate-950/45 p-3"
                            >
                              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_80px_100px]">
                                <Field
                                  label="Exercise"
                                  value={exercise.name}
                                  onChange={(value) =>
                                    updateExercise(workout.id, index, { name: value })
                                  }
                                  placeholder="Exercise"
                                />

                                <Field
                                  label="Sets"
                                  value={exercise.sets}
                                  onChange={(value) =>
                                    updateExercise(workout.id, index, { sets: value })
                                  }
                                  placeholder="3"
                                />

                                <Field
                                  label="Reps"
                                  value={exercise.reps}
                                  onChange={(value) =>
                                    updateExercise(workout.id, index, { reps: value })
                                  }
                                  placeholder="10"
                                />
                              </div>

                              <div className="mt-2 grid gap-2 sm:grid-cols-[120px_120px_minmax(0,1fr)]">
                                <Field
                                  label="Weight"
                                  value={exercise.weight}
                                  onChange={(value) =>
                                    updateExercise(workout.id, index, { weight: value })
                                  }
                                  placeholder="Optional"
                                />

                                <Field
                                  label="Rest"
                                  value={exercise.rest}
                                  onChange={(value) =>
                                    updateExercise(workout.id, index, { rest: value })
                                  }
                                  placeholder="60 sec"
                                />

                                <Field
                                  label="Notes"
                                  value={exercise.notes}
                                  onChange={(value) =>
                                    updateExercise(workout.id, index, { notes: value })
                                  }
                                  placeholder="Optional"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => removeExercise(workout.id, index)}
                                className="mt-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs font-black text-rose-100 hover:bg-rose-500/15"
                              >
                                Remove Exercise
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <select
                            value={workout.status}
                            onChange={(e) => updateWorkout(workout.id, { status: e.target.value })}
                            className="h-10 rounded-2xl border border-white/10 bg-slate-950/70 px-3 text-xs font-semibold text-slate-200 outline-none"
                          >
                            <option>Planned</option>
                            <option>Optional</option>
                            <option>Completed</option>
                            <option>Skip</option>
                          </select>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => addExercise(workout.id)}
                              className="h-10 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-3 text-xs font-black text-cyan-100 hover:bg-cyan-500/15"
                            >
                              + Exercise
                            </button>

                            <button
                              type="button"
                              onClick={() => useWorkoutAsToday(workout)}
                              className="h-10 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3 text-xs font-black text-emerald-100 hover:bg-emerald-500/15"
                            >
                              Use Today
                            </button>

                            <button
                              type="button"
                              onClick={() => completeWorkout(workout)}
                              className="h-10 rounded-2xl border border-indigo-500/25 bg-indigo-500/10 px-3 text-xs font-black text-indigo-100 hover:bg-indigo-500/15"
                            >
                              Complete
                            </button>

                            <button
                              type="button"
                              onClick={() => removeWorkout(workout.id)}
                              className="h-10 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-3 text-xs font-black text-rose-100 hover:bg-rose-500/15"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <div className="space-y-5">
                <Card title="Smart Readiness" subtitle="Daily execution guide." tone={tone}>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-sm font-black text-white">{form.readiness}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-400">
                      {readinessSuggestion(form.readiness)}
                    </div>
                  </div>

                  {profile.limitations ? (
                    <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-xs text-slate-400">Limitations</div>
                      <div className="mt-1 text-sm leading-6 text-slate-200">
                        {profile.limitations}
                      </div>
                    </div>
                  ) : null}
                </Card>

                <Card title="Program Templates" subtitle="Add a ready-made structure." tone="fuchsia">
                  <div className="space-y-3">
                    {PROGRAM_TEMPLATES.map((template) => (
                      <div
                        key={template.id}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-black text-white">{template.name}</div>
                            <div className="mt-1 text-xs leading-5 text-slate-400">
                              {template.description}
                            </div>
                          </div>

                          <Pill tone="fuchsia">{template.label}</Pill>
                        </div>

                        <button
                          type="button"
                          onClick={() => applyTemplate(template)}
                          className="mt-3 w-full rounded-2xl border border-fuchsia-500/25 bg-fuchsia-500/10 px-3 py-3 text-xs font-black text-fuchsia-100 hover:bg-fuchsia-500/15"
                        >
                          Add Template
                        </button>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="Nutrition" subtitle="Calories and protein basics." tone="emerald">
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs text-slate-400">Protein</div>
                          <div className="mt-1 text-2xl font-black text-white">
                            {proteinToday.toLocaleString()}g
                          </div>
                        </div>

                        <Pill tone="emerald">{proteinPercent}%</Pill>
                      </div>

                      <div className="mt-3">
                        <ProgressBar percent={proteinPercent} tone="emerald" />
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        Goal {proteinGoal.toLocaleString()}g
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs text-slate-400">Calories</div>
                          <div className="mt-1 text-2xl font-black text-white">
                            {calories.toLocaleString()}
                          </div>
                        </div>

                        <Pill tone="cyan">{caloriePercent}%</Pill>
                      </div>

                      <div className="mt-3">
                        <ProgressBar percent={caloriePercent} tone="cyan" />
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        Target {calorieGoal.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </Card>

                <Card title="Progress Log" subtitle="Bodyweight, activity, and daily notes." tone="cyan">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-xs text-slate-400">Weight</div>
                      <div className="mt-1 text-xl font-black text-white">
                        {weight ? `${weight}` : "—"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-xs text-slate-400">Logged</div>
                      <div className="mt-1 text-xl font-black text-white">
                        {progressLogs.length}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-xs text-slate-400">Completed</div>
                      <div className="mt-1 text-xl font-black text-white">
                        {history.length}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-3">
                    {progressLogs.slice(0, 5).map((log) => (
                      <div
                        key={log.id}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-black text-white">
                              {prettyDate(log.date)}
                            </div>
                            <div className="mt-1 text-xs leading-5 text-slate-400">
                              Weight: {log.weight || "—"} • Steps:{" "}
                              {safeNumber(log.steps).toLocaleString()} • Protein:{" "}
                              {safeNumber(log.protein_today).toLocaleString()}g
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeProgressLog(log.id)}
                            className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-2 py-1 text-[11px] font-black text-rose-100 hover:bg-rose-500/15"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}

                    {!progressLogs.length ? (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                        No progress entries yet. Tap Log Progress after entering today’s numbers.
                      </div>
                    ) : null}
                  </div>
                </Card>

                <Card title="Workout History" subtitle="Completed sessions." tone="indigo">
                  <div className="space-y-3">
                    {history.slice(0, 7).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-black text-white">
                              {item.workout_name}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              {prettyDate(item.date)} • {item.readiness || "Readiness not set"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Exercises: {Array.isArray(item.exercises) ? item.exercises.length : 0}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeHistoryLog(item.id)}
                            className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-2 py-1 text-[11px] font-black text-rose-100 hover:bg-rose-500/15"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}

                    {!history.length ? (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                        No completed workouts yet. Use Complete Workout to start history.
                      </div>
                    ) : null}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </PaidGate>
      </main>
    </div>
  );
}