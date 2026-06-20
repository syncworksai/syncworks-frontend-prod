// src/components/customer-health/ExerciseProgressCard.jsx
import React from "react";
import { formatSeconds } from "./healthWorkoutSession";
import { formatKpiNumber } from "./healthKpiEngine";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function ExerciseProgressCard({ metric }) {
  if (!metric) return null;

  const recommendation = metric.recommendation || {};
  const last = metric.last_occurrence;

  const toneMap = {
    emerald:
      "border-lime-300/25 bg-lime-300/10 text-lime-100",
    cyan:
      "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
    amber:
      "border-amber-300/25 bg-amber-300/10 text-amber-100",
    rose:
      "border-rose-300/25 bg-rose-300/10 text-rose-100",
  };

  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-[#071425] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
            Exercise Progress
          </div>

          <h3 className="mt-1 truncate text-lg font-black text-white">
            {metric.name}
          </h3>
        </div>

        <div
          className={cx(
            "shrink-0 rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.13em]",
            toneMap[recommendation.tone] || toneMap.cyan
          )}
        >
          {recommendation.label || "Maintain"}
        </div>
      </div>

      {last ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
              Last Weight
            </div>
            <div className="mt-1 text-lg font-black text-white">
              {last.best_weight
                ? formatKpiNumber(last.best_weight)
                : "Bodyweight"}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
              Last Sets
            </div>
            <div className="mt-1 text-lg font-black text-white">
              {last.sets_completed}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
              Average Effort
            </div>
            <div className="mt-1 text-lg font-black text-white">
              {last.average_effort || "—"}
              {last.average_effort ? "/10" : ""}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
              Set Time
            </div>
            <div className="mt-1 text-lg font-black text-white">
              {last.average_set_seconds
                ? formatSeconds(last.average_set_seconds)
                : "—"}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-center">
          <div className="text-[8px] font-black uppercase tracking-[0.1em] text-slate-500">
            Hit Rate
          </div>
          <div className="mt-1 text-sm font-black text-white">
            {metric.target_hit_rate}%
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-center">
          <div className="text-[8px] font-black uppercase tracking-[0.1em] text-slate-500">
            Best
          </div>
          <div className="mt-1 text-sm font-black text-white">
            {metric.best_weight
              ? formatKpiNumber(metric.best_weight)
              : "—"}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-center">
          <div className="text-[8px] font-black uppercase tracking-[0.1em] text-slate-500">
            Volume
          </div>
          <div className="mt-1 text-sm font-black text-white">
            {formatKpiNumber(metric.total_volume)}
          </div>
        </div>
      </div>

      <div
        className={cx(
          "mt-3 rounded-2xl border p-3 text-xs leading-5",
          toneMap[recommendation.tone] || toneMap.cyan
        )}
      >
        {recommendation.message}
      </div>
    </article>
  );
}