// src/components/customer-health/PersonalRecordsCard.jsx
import React from "react";

import {
  buildLastTimeComparison,
  buildPersonalRecords,
} from "./healthPersonalRecords";

function signed(value) {
  const number = Number(value || 0);
  if (number > 0) return `+${Math.round(number)}`;
  return `${Math.round(number)}`;
}

export default function PersonalRecordsCard({
  history,
  exercise,
  session,
}) {
  if (!exercise) return null;

  const result = buildPersonalRecords({
    history,
    exercise,
    session,
  });

  const comparison = buildLastTimeComparison({
    history,
    exercise,
    session,
  });

  const hasCurrentSets = result.current?.workingSets > 0;

  return (
    <section className="rounded-[1.5rem] border border-fuchsia-300/20 bg-[linear-gradient(135deg,rgba(255,59,212,0.08),rgba(139,92,246,0.07))] p-3 sm:rounded-[2rem] sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-fuchsia-200">
            Personal Records
          </div>

          <h3 className="mt-1 text-base font-black text-white sm:text-lg">
            Today vs. your history
          </h3>
        </div>

        <div
          className={`rounded-xl border px-2.5 py-1.5 text-[10px] font-black ${
            result.records.length
              ? "border-lime-300/25 bg-lime-300/10 text-lime-100"
              : result.milestones?.length
              ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
              : "border-fuchsia-300/20 bg-fuchsia-300/10 text-fuchsia-100"
          }`}
        >
          {result.records.length
            ? `${result.records.length} PR${
                result.records.length === 1 ? "" : "s"
              }`
            : result.milestones?.length
            ? "Milestone"
            : result.isBaseline
            ? "Baseline"
            : "Tracking"}
        </div>
      </div>

      {!hasCurrentSets ? (
        <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs font-bold leading-5 text-slate-300">
          Complete a working set to begin checking weight, rep, estimated 1RM, and volume records.
        </div>
      ) : null}

      {result.records.length ? (
        <>
          <div className="mt-3 rounded-2xl border border-lime-300/25 bg-[linear-gradient(135deg,rgba(112,255,61,0.14),rgba(52,223,255,0.08))] p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-lime-200">
              Record Alert
            </div>

            <div className="mt-1 text-lg font-black text-white">
              {result.headline}
            </div>

            <div className="mt-1 text-xs leading-5 text-lime-50/75">
              This performance is above your saved history for this exercise.
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {result.records.map((record) => (
              <div
                key={record.id}
                className="rounded-2xl border border-lime-300/20 bg-lime-300/[0.08] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[9px] font-black uppercase tracking-[0.14em] text-lime-200">
                    {record.label}
                  </div>

                  {record.gain_percent > 0 ? (
                    <div className="rounded-full border border-lime-300/20 bg-lime-300/10 px-2 py-0.5 text-[9px] font-black text-lime-100">
                      +{record.gain_percent}%
                    </div>
                  ) : null}
                </div>

                <div className="mt-1 text-xl font-black text-white">
                  {record.value}
                </div>

                <div className="mt-1 text-[10px] font-bold text-slate-400">
                  {record.detail}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : result.isBaseline ? (
        <div className="mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.07] p-3">
          <div className="text-xs font-black text-cyan-50">
            Baseline established
          </div>

          <div className="mt-1 text-xs leading-5 text-slate-400">
            This is your first saved performance for this exercise. Future sets will be measured against it.
          </div>
        </div>
      ) : hasCurrentSets ? (
        <div className="mt-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] p-3 text-xs font-bold leading-5 text-cyan-50">
          No new record yet. Keep building clean working-set performance.
        </div>
      ) : null}

      {result.milestones?.length ? (
        <div className="mt-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-200">
            Milestones Reached
          </div>

          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {result.milestones.map((milestone) => (
              <div
                key={milestone.id}
                className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.08] p-3"
              >
                <div className="text-[9px] font-black uppercase tracking-[0.14em] text-amber-200">
                  {milestone.label}
                </div>

                <div className="mt-1 text-lg font-black text-white">
                  {milestone.value}
                </div>

                <div className="mt-1 text-[10px] leading-4 text-slate-400">
                  {milestone.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {comparison ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-white/10 bg-black/20 p-2 text-center">
            <div className="text-[8px] font-black uppercase tracking-wider text-slate-500">
              Last Volume
            </div>
            <div className="mt-1 text-sm font-black text-white">
              {Math.round(comparison.previousVolume)}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-2 text-center">
            <div className="text-[8px] font-black uppercase tracking-wider text-slate-500">
              Today
            </div>
            <div className="mt-1 text-sm font-black text-white">
              {Math.round(comparison.currentVolume)}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-2 text-center">
            <div className="text-[8px] font-black uppercase tracking-wider text-slate-500">
              Difference
            </div>
            <div
              className={`mt-1 text-sm font-black ${
                comparison.volumeDifference > 0
                  ? "text-lime-200"
                  : comparison.volumeDifference < 0
                  ? "text-amber-200"
                  : "text-white"
              }`}
            >
              {signed(comparison.volumeDifference)}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 text-[10px] font-bold text-slate-500">
          Last-time comparison appears after this exercise has at least one saved workout.
        </div>
      )}

      <div className="mt-3 text-[10px] leading-4 text-slate-500">
        Warm-up sets are excluded from PR and volume calculations.
      </div>
    </section>
  );
}
