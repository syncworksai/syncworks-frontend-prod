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
    <span className={cx("rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]", tones[tone] || tones.slate)}>
      {children}
    </span>
  );
}

function statusTone(status) {
  if (status === "Increase") return "emerald";
  if (status === "Progress") return "cyan";
  if (status === "Hold") return "amber";
  if (status === "Protect") return "rose";
  return "slate";
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
    }));
  }

  return (
    <HealthDrawer
      open={open}
      onClose={onClose}
      title="AI Coach"
      subtitle="Progression, readiness, weak areas, and next workout guidance."
    >
      <div className="space-y-4">
        <section className="rounded-3xl border border-cyan-500/25 bg-cyan-500/10 p-5">
          <div className="flex flex-wrap gap-2">
            {report.trainingIdentity.map((item) => (
              <Pill key={item} tone="cyan">
                {item}
              </Pill>
            ))}
          </div>

          <div className="mt-4 text-sm font-black uppercase tracking-[0.16em] text-cyan-200">
            Today’s Focus
          </div>

          <p className="mt-2 text-sm leading-6 text-cyan-50">
            {report.dailyFocus}
          </p>
        </section>

        <section className="rounded-3xl border border-emerald-500/25 bg-emerald-500/10 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-black text-white">Recommended Workout</div>
              <p className="mt-1 text-xs leading-5 text-emerald-100/80">
                {report.recommendedReason}
              </p>
            </div>

            {report.recommendedWorkout ? <Pill tone="emerald">Ready</Pill> : <Pill tone="slate">None</Pill>}
          </div>

          {report.recommendedWorkout ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="text-lg font-black text-white">{report.recommendedWorkout.name}</div>
              <div className="mt-1 text-xs leading-5 text-slate-400">
                {report.recommendedWorkout.focus || "Workout"} • {report.recommendedWorkout.duration || 30} minutes
              </div>

              <button
                type="button"
                onClick={useRecommendedWorkout}
                className="mt-4 w-full rounded-2xl border border-emerald-400/25 bg-emerald-500/12 px-4 py-3 text-xs font-black text-emerald-100 hover:bg-emerald-500/18"
              >
                Use This Workout Today
              </button>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm leading-6 text-slate-400">
              Add workouts in Workout Studio first, then the coach can recommend the best one.
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-amber-500/25 bg-amber-500/10 p-5">
          <div className="text-sm font-black text-white">Weak Area / Limitation Guardrail</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Pill tone="amber">{report.weakArea.label}</Pill>
          </div>
          <p className="mt-3 text-sm leading-6 text-amber-50">
            {report.weakArea.advice}
          </p>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-white">Progression Recommendations</div>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Based on the last completed workout logs.
              </p>
            </div>

            <Pill tone={report.hasHistory ? "fuchsia" : "slate"}>
              {report.hasHistory ? "Active" : "Needs Logs"}
            </Pill>
          </div>

          <div className="mt-4 space-y-3">
            {report.progression.map((item) => (
              <div key={item.name} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-black text-white">{item.name}</div>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{item.recommendation}</p>
                  </div>

                  <Pill tone={statusTone(item.status)}>{item.status}</Pill>
                </div>
              </div>
            ))}

            {!report.progression.length ? (
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm leading-6 text-slate-400">
                Complete a workout with sets, reps, weight, difficulty, and pain level. Then the coach will start giving week-to-week progression.
              </div>
            ) : null}
          </div>
        </section>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-5 text-slate-500">
          This is fitness guidance, not medical advice. Pain, injury, or medical limitations should be reviewed with a qualified professional.
        </div>
      </div>
    </HealthDrawer>
  );
}