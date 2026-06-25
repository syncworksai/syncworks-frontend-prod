// src/components/customer-health/WorkoutProgressionCard.jsx
import React from "react";

import {
  buildExerciseProgression,
  formatPreviousSet,
} from "./healthProgressionLogic";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function WorkoutProgressionCard({
  history,
  exercise,
  session,
  onApply,
}) {
  const progression = buildExerciseProgression({
    history,
    exercise,
    session,
  });

  if (!exercise || !progression.recommendation) {
    return null;
  }

  const { previous, recommendation } = progression;

  const tones = {
    emerald:
      "border-lime-300/25 bg-lime-300/[0.08] text-lime-100",
    cyan:
      "border-cyan-300/25 bg-cyan-300/[0.08] text-cyan-100",
    amber:
      "border-amber-300/25 bg-amber-300/[0.08] text-amber-100",
    rose:
      "border-rose-300/25 bg-rose-300/[0.08] text-rose-100",
  };

  const applyLabel =
    recommendation.action === "increase"
      ? "Apply Progression"
      : recommendation.action === "reduce"
      ? "Apply Safer Target"
      : recommendation.action === "hold"
      ? "Use Last Target"
      : "Use Planned Target";

  return (
    <section
      className={cx(
        "rounded-[1.5rem] border p-3 sm:rounded-[2rem] sm:p-4",
        tones[recommendation.tone] || tones.cyan
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[9px] font-black uppercase tracking-[0.18em] opacity-75">
            Previous Workout + Progression
          </div>

          <h3 className="mt-1 text-base font-black text-white sm:text-lg">
            {recommendation.title}
          </h3>
        </div>

        <div className="shrink-0 rounded-xl border border-white/10 bg-black/20 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em]">
          {recommendation.action}
        </div>
      </div>

      {previous ? (
        <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
            Last working sets
          </div>

          <div className="mt-2 space-y-1.5">
            {previous.sets.map((setLog, index) => (
              <div
                key={setLog.id || index}
                className="flex items-center justify-between gap-3 text-xs"
              >
                <span className="font-black text-slate-400">
                  Set {index + 1}
                </span>

                <span className="text-right font-black text-white">
                  {formatPreviousSet(setLog)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-white/8 bg-white/[0.04] p-2 text-center">
              <div className="text-[8px] font-black uppercase tracking-wider text-slate-500">
                Avg RPE
              </div>
              <div className="mt-1 text-sm font-black text-white">
                {previous.averageRpe || "—"}
              </div>
            </div>

            <div className="rounded-xl border border-white/8 bg-white/[0.04] p-2 text-center">
              <div className="text-[8px] font-black uppercase tracking-wider text-slate-500">
                Failures
              </div>
              <div className="mt-1 text-sm font-black text-white">
                {previous.failureCount}
              </div>
            </div>

            <div className="rounded-xl border border-white/8 bg-white/[0.04] p-2 text-center">
              <div className="text-[8px] font-black uppercase tracking-wider text-slate-500">
                Volume
              </div>
              <div className="mt-1 truncate text-sm font-black text-white">
                {Math.round(previous.totalVolume)}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-300">
          This is the first tracked session for this exercise.
        </div>
      )}

      <p className="mt-3 text-xs font-bold leading-5 text-slate-200">
        {recommendation.message}
      </p>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
        <div>
          <div className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-500">
            Recommended target
          </div>

          <div className="mt-1 text-lg font-black text-white">
            {recommendation.weight || "Bodyweight"} ×{" "}
            {recommendation.reps || "—"}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onApply?.(recommendation)}
          className="shrink-0 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-[10px] font-black text-white"
        >
          {applyLabel}
        </button>
      </div>
    </section>
  );
}
