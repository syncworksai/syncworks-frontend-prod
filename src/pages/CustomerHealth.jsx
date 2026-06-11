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
  const stepPercent = stepGoal > 0 ? Math.min(100, Math.round((steps / stepGoal) * 100)) : 0;
  const caloriePercent = calorieGoal > 0 ? Math.min(100, Math.round((calories / calorieGoal) * 100)) : 0;

  const snapshot = useMemo(() => {
    return {
      workout: form.workout,
      steps,
      step_goal: stepGoal,
      calories,
      calorie_goal: calorieGoal,
      protein_goal: safeNumber(form.protein_goal),
      readiness: form.readiness,
      time_available: form.time_available,
      equipment: form.equipment,
      goal: form.goal,
      notes: form.notes,
      updated_at: new Date().toISOString(),
    };
  }, [form, steps, stepGoal, calories, calorieGoal]);

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

  const readinessTone =
    form.readiness === "Need Recovery"
      ? "amber"
      : form.readiness === "Pain / Limit"
      ? "rose"
      : "emerald";

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#020617] text-slate-100">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[#020617]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.10),transparent_32%),radial-gradient(circle_at_bottom,rgba(99,102,241,0.12),transparent_38%)]" />
      </div>

      <ModeBar
        title="Health"
        subtitle="Readiness • workouts • steps • nutrition basics"
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
          subtitle="Daily readiness, workout planning, steps, calories, and simple nutrition tools."
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
                      Your daily fitness snapshot
                    </h1>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                      Start with readiness, steps, calories, and a workout plan.
                      Later we can build full programs, history, strength tracking, and goals.
                    </p>
                  </div>

                  <Pill tone={readinessTone}>{form.readiness}</Pill>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <Card tone="emerald" className="shadow-none">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-200">
                      Today’s Workout
                    </div>
                    <div className="mt-2 text-xl font-black text-white">
                      {form.workout || "Not set"}
                    </div>
                  </Card>

                  <Card tone="cyan" className="shadow-none">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-200">
                      Steps
                    </div>
                    <div className="mt-2 text-3xl font-black text-white">
                      {steps.toLocaleString()}
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
                    <div className="mt-1 text-xs text-slate-400">{caloriePercent}% of goal</div>
                  </Card>
                </div>
              </div>
            </section>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
              <div className="space-y-5">
                <Card
                  title="Daily Readiness"
                  subtitle="This updates the Health card on the customer dashboard."
                  tone="emerald"
                  right={<Pill tone="emerald">Dashboard Sync</Pill>}
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
                      label="Calorie goal"
                      value={form.calorie_goal}
                      onChange={(value) => setForm((p) => ({ ...p, calorie_goal: value }))}
                      type="number"
                      placeholder="2200"
                    />

                    <Field
                      label="Protein goal"
                      value={form.protein_goal}
                      onChange={(value) => setForm((p) => ({ ...p, protein_goal: value }))}
                      type="number"
                      placeholder="180"
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
                  subtitle="Create reusable workout blocks. Tap Use Today to push one to the dashboard."
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
                </Card>
              </div>

              <div className="space-y-5">
                <Card title="Smart Suggestion" subtitle="Simple rule-based starting point." tone="indigo">
                  <div className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-4">
                    <div className="text-sm font-black text-indigo-100">
                      {form.readiness === "Pain / Limit"
                        ? "Recovery day recommended."
                        : form.readiness === "Need Recovery"
                        ? "Light movement and mobility recommended."
                        : "Training day looks good."}
                    </div>

                    <div className="mt-2 text-xs leading-5 text-slate-400">
                      Based on readiness, available time, and equipment. This can become AI-assisted later.
                    </div>
                  </div>
                </Card>

                <Card title="Nutrition Basics" subtitle="Keep it simple first." tone="emerald">
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-xs text-slate-400">Protein Goal</div>
                      <div className="mt-1 text-2xl font-black text-white">
                        {safeNumber(form.protein_goal).toLocaleString()}g
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-sm leading-6 text-slate-400">
                        Later: meal templates, macro targets, weight tracking, and grocery-style planning.
                      </div>
                    </div>
                  </div>
                </Card>

                <Card title="Coming Next" subtitle="Backend expansion path." tone="fuchsia">
                  <ul className="space-y-2 pl-5 text-sm leading-6 text-slate-400 list-disc">
                    <li>Readiness history</li>
                    <li>Workout completion log</li>
                    <li>Weight and strength tracking</li>
                    <li>Weekly program templates</li>
                    <li>Calendar export for workouts</li>
                  </ul>
                </Card>
              </div>
            </div>
          </div>
        </PaidGate>
      </main>
    </div>
  );
}