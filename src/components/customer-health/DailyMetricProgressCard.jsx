// src/components/customer-health/DailyMetricProgressCard.jsx
import React, { useMemo } from "react";

import {
  buildDailyMetricIntelligence,
} from "./healthDailyMetricIntelligence";

function MetricMiniChart({
  points = [],
}) {
  const max = Math.max(
    1,
    ...points.map(
      (point) => point.percent || 0
    )
  );

  return (
    <div className="mt-3 flex h-16 items-end gap-1.5">
      {points.map((point) => {
        const height = Math.max(
          5,
          Math.round(
            ((point.percent || 0) /
              max) *
              100
          )
        );

        return (
          <div
            key={point.ymd}
            className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
          >
            <div className="flex h-11 w-full items-end">
              <div
                className={`w-full rounded-t-md ${
                  point.complete
                    ? "bg-lime-300/80"
                    : "bg-cyan-300/45"
                }`}
                style={{
                  height: `${height}%`,
                }}
              />
            </div>

            <div className="text-[8px] font-black uppercase text-slate-600">
              {point.label.slice(0, 1)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function DailyMetricProgressCard({
  snapshot,
  onQuickLog,
  onShowInsights,
  onEditGoals,
}) {
  const intelligence = useMemo(
    () =>
      buildDailyMetricIntelligence({
        snapshot,
      }),
    [snapshot]
  );

  return (
    <section className="rounded-[1.7rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_34%),rgba(255,255,255,0.03)] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
            Daily Progress Engine
          </div>

          <div className="mt-1 text-2xl font-black text-white">
            {intelligence.completed_count} of{" "}
            {intelligence.total_count} goals complete
          </div>

          <div className="mt-1 text-sm leading-6 text-slate-400">
            {intelligence.coach_message}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEditGoals}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-black text-slate-200"
          >
            Edit Goals
          </button>

          <div className="rounded-2xl border border-lime-300/20 bg-lime-300/10 px-4 py-3 text-center">
            <div className="text-[9px] font-black uppercase tracking-[0.14em] text-lime-200">
              Daily Score
            </div>
            <div className="mt-1 text-2xl font-black text-white">
              {intelligence.daily_score}%
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {intelligence.metrics.map(
          (metric) => (
            <button
              key={metric.key}
              type="button"
              onClick={() =>
                onQuickLog?.(
                  metric.key
                )
              }
              className="rounded-2xl border border-white/10 bg-black/20 p-3 text-left transition active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
                    {metric.label}
                  </div>

                  <div className="mt-1 text-lg font-black text-white">
                    {metric.value}
                    {metric.unit}
                  </div>
                </div>

                <div className={`rounded-full border px-2 py-1 text-[9px] font-black ${
                  metric.complete
                    ? "border-lime-300/25 bg-lime-300/10 text-lime-100"
                    : "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
                }`}>
                  {metric.percent}%
                </div>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full ${
                    metric.complete
                      ? "bg-lime-300"
                      : "bg-cyan-300"
                  }`}
                  style={{
                    width: `${Math.max(
                      2,
                      metric.percent
                    )}%`,
                  }}
                />
              </div>

              <div className="mt-2 text-[10px] text-slate-500">
                Goal {metric.goal}
                {metric.unit}
                {" | "}
                {metric.streak} day streak
              </div>

              {metric.reward ? (
                <div className="mt-2 rounded-xl border border-amber-300/20 bg-amber-300/10 px-2 py-1.5 text-[9px] font-black text-amber-100">
                  Reward: {metric.reward}
                </div>
              ) : null}

              <MetricMiniChart
                points={metric.points}
              />
            </button>
          )
        )}
      </div>

      <button
        type="button"
        onClick={onShowInsights}
        className="mt-4 h-11 w-full rounded-2xl border border-fuchsia-300/25 bg-fuchsia-300/10 text-sm font-black text-fuchsia-100"
      >
        Open Full Health Trends
      </button>
    </section>
  );
}