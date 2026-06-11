// src/pages/CustomerHealth.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import ModeBar from "../components/ModeBar";
import PaidGate from "../components/paid/PaidGate";

const STRIPE_HEALTH_CHECKOUT_URL = "https://buy.stripe.com/4gMfZh0Y2ar5aT70Kn2Nq0b";
const HEALTH_LOGO_URL = "/brands/health.jpg";

const SNAPSHOT_KEY = "sw_customer_health_snapshot_v1";
const WORKOUTS_KEY = "sw_customer_health_workouts_v1";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
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
      : "bg-emerald-400";

  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-slate-950/70">
      <div
        className={cx("h-full rounded-full transition-all", fill)}
        style={{ width: `${Math.max(0, Math.min(100, percent || 0))}%` }}
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
    return "Keep it conservative. Focus on mobility, walking, stretching, or rest.";
  }

  if (readiness === "Need Recovery") {
    return "Go lighter today. Choose recovery work, steps, and mobility over heavy training.";
  }

  if (readiness === "Moderate") {
    return "Train, but keep intensity controlled. A shorter session or reduced volume fits today.";
  }

  return "You look ready for a normal session. Hit the planned workout and track completion.";
}

export default function CustomerHealth() {
  const nav = useNavigate();

  const [form, setForm] = useState(() => {
    const saved = readJson(SNAPSHOT_KEY, null);

    return {
      workout: saved?.workout ?? "",
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

    if (Array.isArray(saved) && saved.length) return saved;

    return [
      { id: "w-push", name: "Push Day", duration: "35", focus: "Chest • Shoulders • Triceps", status: "Planned" },
      { id: "w-walk", name: "Walk / Steps", duration: "25", focus: "Recovery • Cardio", status: "Optional" },
      { id: "w-core", name: "Core Reset", duration: "12", focus: "Core • Mobility", status: "Optional" },
    ];
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
  const tone = readinessTone(form.readiness);

  const snapshot = useMemo(() => {
    return {
      workout: form.workout,
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
  ]);

  useEffect(() => {
    writeJson(SNAPSHOT_KEY, snapshot);
  }, [snapshot]);

  useEffect(() => {
    writeJson(WORKOUTS_KEY, workouts);
  }, [workouts]);

  function updateWorkout(id, patch) {
    setWorkouts((prev) =>
      prev.map((workout) => {
        if (workout.id !== id) return workout;
        return { ...workout, ...patch };
      })
    );
  }

  function addWorkout() {
    setWorkouts((prev) => [
      ...prev,
      {
        id: `w-${Date.now()}`,
        name: "New Workout",
        duration: "30",
        focus: "Strength",
        status: "Planned",
      },
    ]);
  }

  function removeWorkout(id) {
    setWorkouts((prev) => prev.filter((workout) => workout.id !== id));
  }

  function useWorkoutAsToday(workout) {
    setForm((prev) => ({
      ...prev,
      workout: workout.name,
      time_available: `${workout.duration || 30} minutes`,
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
        subtitle="Readiness • workouts • steps • nutrition • routines"
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
          subtitle="Plan workouts, track readiness, steps, calories, protein, and simple daily execution."
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
                      SyncWorks Health
                    </div>

                    <h1 className="mt-2 text-2xl font-black tracking-tight text-white md:text-4xl">
                      Daily health command center
                    </h1>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                      Track the basics that matter: readiness, movement, food targets, and today’s workout.
                    </p>
                  </div>

                  <Pill tone={tone}>{form.readiness}</Pill>
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
                      Calories
                    </div>
                    <div className="mt-2 text-3xl font-black text-white">
                      {calories.toLocaleString()}
                    </div>
                    <div className="mt-3">
                      <ProgressBar percent={caloriePercent} tone="emerald" />
                    </div>
                    <div className="mt-1 text-xs text-slate-400">{caloriePercent}% of target</div>
                  </Card>
                </div>
              </div>
            </section>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
              <div className="space-y-5">
                <Card
                  title="Daily Readiness"
                  subtitle="Updates your dashboard and Life Schedule automatically."
                  tone="emerald"
                  right={<Pill tone="emerald">Synced</Pill>}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      label="Today’s workout"
                      value={form.workout}
                      onChange={(value) => setForm((p) => ({ ...p, workout: value }))}
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

                    <Field
                      label="Protein goal"
                      value={form.protein_goal}
                      onChange={(value) => setForm((p) => ({ ...p, protein_goal: value }))}
                      type="number"
                      placeholder="180"
                    />

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
                      options={["General fitness", "Fat loss", "Muscle gain", "Strength", "Mobility", "Athletic performance"]}
                    />
                  </div>

                  <label className="mt-3 block">
                    <div className="mb-1 text-xs font-semibold text-slate-400">
                      Notes / limitations
                    </div>

                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Example: hip feels tight, avoid heavy squats today, 30 minutes max."
                      rows={3}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-400/40"
                    />
                  </label>
                </Card>

                <Card
                  title="Workout Builder"
                  subtitle="Create reusable workouts and send one to Today."
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
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
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
                              onClick={() => useWorkoutAsToday(workout)}
                              className="h-10 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3 text-xs font-black text-emerald-100 hover:bg-emerald-500/15"
                            >
                              Use Today
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

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-xs text-slate-400">Workouts</div>
                      <div className="mt-1 text-xl font-black text-white">{workouts.length}</div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-xs text-slate-400">Planned</div>
                      <div className="mt-1 text-xl font-black text-white">{plannedWorkouts}</div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-xs text-slate-400">Completed</div>
                      <div className="mt-1 text-xl font-black text-white">{completedWorkouts}</div>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="space-y-5">
                <Card title="Smart Readiness" subtitle="Simple daily execution guidance." tone={tone}>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-sm font-black text-white">{form.readiness}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-400">
                      {readinessSuggestion(form.readiness)}
                    </div>
                  </div>

                  {form.notes ? (
                    <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-xs text-slate-400">Notes</div>
                      <div className="mt-1 text-sm leading-6 text-slate-200">{form.notes}</div>
                    </div>
                  ) : null}
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

                <Card title="Training Rules" subtitle="Keep the system simple." tone="slate">
                  <div className="space-y-3">
                    {[
                      "Match intensity to readiness.",
                      "Log steps even on recovery days.",
                      "Protein and calories beat perfection.",
                      "Use one workout as today’s plan before training.",
                    ].map((item, index) => (
                      <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                          Rule {index + 1}
                        </div>
                        <div className="mt-1 text-sm leading-6 text-slate-300">{item}</div>
                      </div>
                    ))}
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