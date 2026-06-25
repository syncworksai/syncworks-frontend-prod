// src/components/customer-health/CardioProgressCard.jsx
import React, { useMemo } from "react";
import { buildCardioInsights } from "./healthCardioInsights";

function Stat({ label, value, detail }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-lg font-black text-white">{value}</div>
      {detail ? (
        <div className="mt-1 text-xs text-slate-400">{detail}</div>
      ) : null}
    </div>
  );
}

export default function CardioProgressCard({
  history,
  onOpenCardio,
  onOpenHistory,
}) {
  const insights = useMemo(
    () => buildCardioInsights(history, 30),
    [history]
  );

  return (
    <section className="rounded-[1.75rem] border border-fuchsia-300/20 bg-fuchsia-300/[0.05] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-200">
            Cardio Progress
          </div>
          <h3 className="mt-1 text-xl font-black text-white">
            Conditioning dashboard
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Track endurance, activity volume, heart rate, calories, and recent progress.
          </p>
        </div>

        <div className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-white">
          {insights.sessionCount} sessions
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
        <Stat
          label="Minutes"
          value={insights.totalMinutes}
          detail="Last 30 days"
        />
        <Stat
          label="Distance"
          value={`${insights.totalDistance} mi`}
          detail="Logged total"
        />
        <Stat
          label="Calories"
          value={insights.totalCalories}
          detail="Logged total"
        />
        <Stat
          label="Avg HR"
          value={
            insights.averageHeartRate
              ? `${insights.averageHeartRate} bpm`
              : "â€”"
          }
          detail="Recorded sessions"
        />
        <Stat
          label="Latest"
          value={`${insights.latestMinutes} min`}
          detail={insights.trend}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="font-black uppercase tracking-[0.13em] text-slate-400">
            150-minute conditioning target
          </span>
          <span className="font-black text-fuchsia-100">
            {insights.targetProgress}%
          </span>
        </div>

        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-900">
          <div
            className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 via-cyan-400 to-lime-300"
            style={{ width: `${insights.targetProgress}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => onOpenCardio?.()}
          className="h-11 rounded-2xl border border-fuchsia-300/30 bg-fuchsia-300/10 px-4 text-sm font-black text-fuchsia-100"
        >
          Start Cardio
        </button>

        <button
          type="button"
          onClick={() => onOpenHistory?.()}
          className="h-11 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 text-sm font-black text-cyan-100"
        >
          View Cardio History
        </button>
      </div>
    </section>
  );
}
