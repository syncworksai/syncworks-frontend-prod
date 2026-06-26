// src/components/customer-health/AiCoachDrawer.jsx
import React, { useMemo } from "react";
import HealthDrawer from "./HealthDrawer";
import { buildHealthCoachReport } from "./healthCoach";
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

function statusTone(status) {
  if (status === "Increase") return "emerald";
  if (status === "Progress") return "cyan";
  if (status === "Add reps") return "cyan";
  if (status === "Add volume") return "cyan";
  if (status === "Quality") return "amber";
  if (status === "Repeat") return "amber";
  if (status === "Hold") return "amber";
  if (status === "Recover") return "amber";
  if (status === "Protect") return "rose";
  return "slate";
}

function CoachCard({ title, subtitle, children, tone = "slate" }) {
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-black text-white">{title}</div>
          {subtitle ? <p className="mt-1 text-xs leading-5 text-slate-400">{subtitle}</p> : null}
        </div>
      </div>

      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function AiCoachDrawer({
  open,
  onClose,
  profile,
  snapshot,
  workouts,
  history,
  progressLogs,
  setSnapshot,
}) {
  const report = useMemo(() => {
    return buildHealthCoachReport({
      profile,
      snapshot,
      workouts,
      history,
      progressLogs,
    });
  }, [profile, snapshot, workouts, history, progressLogs]);

  function useRecommendedWorkout() {
    if (!report.recommendedWorkout) return;

    setSnapshot((prev) => ({
      ...prev,
      workout: report.recommendedWorkout.name,
      today_workout_id: report.recommendedWorkout.id,
      time_available: `${report.recommendedWorkout.duration || 30} minutes`,
      goal: profile?.primary_goal || prev.goal || "General fitness",
      equipment: profile?.preferred_equipment || prev.equipment || "Bodyweight",
      user_path: report.coachPath?.type || prev.user_path || "",
      progression_cadence: profile?.progression_preference || report.coachPath?.cadence || "",
      next_session_note: report.dailyFocus,
    }));
  }

  return (
    <HealthDrawer
      open={open}
      onClose={onClose}
      title="AI Fitness Coach"
      subtitle="Questionnaire-driven coaching that adapts from user input, missed logs, workouts, and recovery."
    >
      <div className="space-y-4">
        <section className="relative overflow-hidden rounded-3xl border border-fuchsia-500/25 bg-fuchsia-500/10 p-5">
          <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 left-8 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative">
            <div className="flex flex-wrap gap-2">
              {report.trainingIdentity.map((item) => (
                <Pill key={item} tone={report.coachPath?.tone || "fuchsia"}>
                  {item}
                </Pill>
              ))}
            </div>

            <div className="mt-4 text-sm font-black uppercase tracking-[0.16em] text-fuchsia-100">
              Coach Path
            </div>

            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
              {report.coachPath?.type || "AI fitness coach"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-fuchsia-50/90">
              {report.coachMessage}
            </p>

            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Coach Voice
              </div>
              <div className="mt-1 text-sm font-black text-white">
                {report.coachVoice?.label}
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-300">
                {report.coachVoice?.message}
              </p>
            </div>
          </div>
        </section>

        <CoachCard
          title="Today's Coaching Focus"
          subtitle="This is what the coach should care about right now."
          tone="cyan"
        >
          <p className="text-sm leading-6 text-cyan-50">{report.dailyFocus}</p>

          <div className="mt-4 grid gap-2">
            {report.nextActions.map((action) => (
              <div
                key={action}
                className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-sm leading-5 text-slate-200"
              >
                {action}
              </div>
            ))}
          </div>
        </CoachCard>

        <CoachCard
          title="Accountability / Logging Status"
          subtitle="The coach adapts when the user logs. If they stop logging, the plan resets intelligently."
          tone={report.accountability?.tone || "amber"}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={report.accountability?.tone || "amber"}>
              {report.accountability?.status}
            </Pill>

            {report.accountability?.daysSince != null ? (
              <Pill tone="slate">
                {report.accountability.daysSince} day
                {report.accountability.daysSince === 1 ? "" : "s"} since log
              </Pill>
            ) : null}
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-100">
            {report.accountability?.message}
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-300">
            {report.accountability?.action}
          </p>
        </CoachCard>

        <CoachCard
          title="Recommended Workout"
          subtitle="Selected from goal, readiness, missed logs, and coach path."
          tone="emerald"
        >
          {report.recommendedWorkout ? (
            <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-black text-white">
                    {report.recommendedWorkout.name}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-slate-400">
                    {report.recommendedWorkout.focus || "Workout"}  | {" "}
                    {report.recommendedWorkout.duration || 30} minutes
                  </div>
                </div>

                <Pill tone="emerald">Ready</Pill>
              </div>

              <p className="mt-3 text-sm leading-6 text-emerald-50/90">
                {report.recommendedReason}
              </p>

              <button
                type="button"
                onClick={useRecommendedWorkout}
                className="mt-4 w-full rounded-2xl border border-emerald-400/25 bg-emerald-500/12 px-4 py-3 text-xs font-black text-emerald-100 hover:bg-emerald-500/18"
              >
                Use This Workout Today
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-sm leading-6 text-slate-400">
              Add workouts in Workout Studio first, then the coach can recommend the best one.
            </div>
          )}
        </CoachCard>

        <CoachCard
          title="Weak Area / Limit Guardrail"
          subtitle="This prevents the coach from pushing the wrong thing too hard."
          tone="amber"
        >
          <div className="flex flex-wrap gap-2">
            <Pill tone="amber">{report.weakArea.label}</Pill>
          </div>

          <p className="mt-3 text-sm leading-6 text-amber-50">
            {report.weakArea.advice}
          </p>
        </CoachCard>

        <CoachCard
          title="Progression Recommendations"
          subtitle="Based on completed workout logs."
          tone="slate"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={report.hasHistory ? "fuchsia" : "slate"}>
              {report.hasHistory ? "Active" : "Needs Logs"}
            </Pill>

            <Pill tone="slate">{report.progressCount} progress logs</Pill>
          </div>

          <div className="mt-4 space-y-3">
            {report.progression.map((item) => (
              <div
                key={`${item.name}-${item.status}`}
                className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-black text-white">{item.name}</div>
                    <p className="mt-1 text-sm leading-6 text-slate-300">
                      {item.recommendation}
                    </p>
                    {item.reason ? (
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        {item.reason}
                      </p>
                    ) : null}
                  </div>

                  <Pill tone={statusTone(item.status)}>{item.status}</Pill>
                </div>
              </div>
            ))}

            {!report.progression.length ? (
              <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-sm leading-6 text-slate-400">
                Complete a workout with sets, reps, weight, difficulty, pain level, energy,
                soreness, and sleep. Then the coach will start adapting daily and weekly.
              </div>
            ) : null}
          </div>
        </CoachCard>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-5 text-slate-500">
          This is fitness guidance, not medical advice. Pain, injury, surgery history, or medical limitations should be reviewed with a qualified professional.
        </div>
      </div>
    </HealthDrawer>
  );
}