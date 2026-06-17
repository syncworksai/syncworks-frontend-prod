// src/components/customer-health/TodayPlanDrawer.jsx
import React, { useMemo } from "react";
import HealthDrawer from "./HealthDrawer";
import { buildTodayPlan } from "./healthTodayPlan";
import { cx } from "./healthStorage";

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
        "rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]",
        tones[tone] || tones.slate
      )}
    >
      {children}
    </span>
  );
}

function PlanCard({ title, subtitle, tone = "slate", children }) {
  const tones = {
    cyan: "border-cyan-500/25 bg-cyan-500/10",
    amber: "border-amber-500/25 bg-amber-500/10",
    emerald: "border-emerald-500/25 bg-emerald-500/10",
    fuchsia: "border-fuchsia-500/25 bg-fuchsia-500/10",
    indigo: "border-indigo-500/25 bg-indigo-500/10",
    rose: "border-rose-500/25 bg-rose-500/10",
    slate: "border-white/10 bg-white/[0.03]",
  };

  return (
    <section className={cx("rounded-3xl border p-5", tones[tone] || tones.slate)}>
      <div className="text-sm font-black text-white">{title}</div>
      {subtitle ? <div className="mt-1 text-xs leading-5 text-slate-400">{subtitle}</div> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function TodayPlanDrawer({
  open,
  onClose,
  profile,
  snapshot,
  workouts,
  history,
  setSnapshot,
}) {
  const plan = useMemo(() => {
    return buildTodayPlan({
      profile,
      snapshot,
      workouts,
      history,
    });
  }, [profile, snapshot, workouts, history]);

  function usePlanWorkout() {
    if (!plan.workout) return;

    setSnapshot((prev) => ({
      ...prev,
      workout: plan.workout.name,
      today_workout_id: plan.workout.id,
      time_available: `${plan.workout.duration || 30} minutes`,
      goal: profile?.primary_goal || prev.goal || "General fitness",
      equipment: profile?.preferred_equipment || prev.equipment || "Bodyweight",
      user_path: plan.coachPath?.label || prev.user_path || "",
      progression_cadence: profile?.progression_preference || prev.progression_cadence || "",
      next_session_note: plan.todayMission,
    }));
  }

  return (
    <HealthDrawer
      open={open}
      onClose={onClose}
      title="Today’s AI Plan"
      subtitle="One clear mission built from the questionnaire, readiness, logs, nutrition, steps, and recovery."
    >
      <div className="space-y-4">
        <section className="relative overflow-hidden rounded-3xl border border-cyan-500/25 bg-cyan-500/10 p-5">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 left-8 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative">
            <div className="flex flex-wrap gap-2">
              <Pill tone={plan.coachPath?.tone}>{plan.coachPath?.label}</Pill>
              <Pill tone={plan.pressure?.tone}>{plan.pressure?.label}</Pill>
              <Pill tone={plan.logStatus?.tone}>{plan.logStatus?.label}</Pill>
            </div>

            <div className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
              Today’s Mission
            </div>

            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
              {plan.todayMission}
            </h2>

            <p className="mt-3 text-sm leading-6 text-cyan-50">
              {plan.pressure?.message}
            </p>
          </div>
        </section>

        <PlanCard
          title="Workout"
          subtitle="The plan picks this from readiness, logs, goal, and available workouts."
          tone="emerald"
        >
          {plan.workout ? (
            <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-black text-white">{plan.workout.name}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-400">
                    {plan.workout.focus || "Workout"} • {plan.workout.duration || 30} minutes
                  </div>
                </div>

                <Pill tone="emerald">Today</Pill>
              </div>

              <p className="mt-3 text-sm leading-6 text-emerald-50/90">
                {plan.workoutReason}
              </p>

              <button
                type="button"
                onClick={usePlanWorkout}
                className="mt-4 w-full rounded-2xl border border-emerald-400/25 bg-emerald-500/12 px-4 py-3 text-xs font-black text-emerald-100 hover:bg-emerald-500/18"
              >
                Use This Workout Today
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-sm leading-6 text-slate-400">
              No workout is available yet. Open Workout Studio and add a template.
            </div>
          )}
        </PlanCard>

        <div className="grid gap-4 md:grid-cols-2">
          <PlanCard title={plan.steps.title} tone="cyan">
            <div className="text-2xl font-black text-white">{plan.steps.target}</div>
            <p className="mt-2 text-sm leading-6 text-cyan-50/90">{plan.steps.note}</p>
          </PlanCard>

          <PlanCard title={plan.nutrition.title} tone="fuchsia">
            <div className="text-2xl font-black text-white">{plan.nutrition.target}</div>
            <p className="mt-2 text-sm leading-6 text-fuchsia-50/90">{plan.nutrition.note}</p>
          </PlanCard>
        </div>

        <PlanCard title={plan.recovery.title} tone={plan.recovery.tone}>
          <p className="text-sm leading-6 text-slate-100">{plan.recovery.message}</p>
        </PlanCard>

        <PlanCard
          title="Daily Checklist"
          subtitle="This is what the user needs to do today."
          tone="slate"
        >
          <div className="space-y-2">
            {plan.checklist.map((item, index) => (
              <div
                key={`${item}-${index}`}
                className="flex gap-3 rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-sm leading-5 text-slate-200"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-500/10 text-[11px] font-black text-cyan-100">
                  {index + 1}
                </div>
                <div>{item}</div>
              </div>
            ))}
          </div>
        </PlanCard>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-5 text-slate-500">
          This plan is guidance, not medical advice. Pain, injury, surgery history, or medical limitations should be reviewed with a qualified professional.
        </div>
      </div>
    </HealthDrawer>
  );
}