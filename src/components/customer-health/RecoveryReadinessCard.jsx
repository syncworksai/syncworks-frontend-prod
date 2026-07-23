// src/components/customer-health/RecoveryReadinessCard.jsx
import React, { useMemo, useState } from "react";
import {
  buildRecoveryAnalysis,
  evaluateWorkoutRecovery,
} from "./healthRecoveryEngine";

export default function RecoveryReadinessCard({
  history,
  snapshot,
  workout,
  onReviewPlan,
}) {
  const [expanded, setExpanded] = useState(false);

  const analysis = useMemo(
    () => buildRecoveryAnalysis({ history, snapshot }),
    [history, snapshot]
  );

  const evaluation = useMemo(
    () => evaluateWorkoutRecovery(workout, analysis),
    [workout, analysis]
  );

  return (
    <section className="rounded-[1.65rem] border border-white/10 bg-[linear-gradient(145deg,rgba(17,24,20,0.97),rgba(4,7,5,0.99))] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.3)]">
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
        72-Hour Recovery
      </div>

      <h3 className="mt-1 text-xl font-black text-white">
        {analysis.overall}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-300">
        {analysis.recommendation}
      </p>

      {workout ? (
        <div className="mt-3 rounded-2xl border border-white/10 bg-black/25 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-200">
            Next workout decision
          </div>
          <div className="mt-1 text-sm font-black text-white">
            {evaluation.decision === "replace_or_recovery"
              ? "Review before starting"
              : evaluation.decision === "reduce_volume"
              ? "Reduce volume"
              : evaluation.decision === "proceed_with_caution"
              ? "Conservative first set"
              : "Proceed as planned"}
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {evaluation.explanation}
          </p>
        </div>
      ) : null}

      {analysis.muscles.length ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-3 h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-black text-white"
        >
          {expanded ? "Hide muscle status" : "Show muscle status"}
        </button>
      ) : null}

      {expanded ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {analysis.muscles.slice(0, 10).map((item) => (
            <div
              key={item.muscle}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2"
            >
              <div className="text-xs font-black capitalize text-white">
                {item.muscle}
              </div>
              <div className="mt-0.5 text-[10px] font-bold text-slate-400">
                {item.status} · {Math.round(item.latest_hours_ago)}h ago
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {evaluation.requires_workout_review ? (
        <button
          type="button"
          onClick={onReviewPlan}
          className="mt-3 h-11 w-full rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 text-xs font-black text-amber-100"
        >
          Review or Adapt Next Workout
        </button>
      ) : null}
    </section>
  );
}
