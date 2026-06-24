// src/components/customer-health/HealthProgressCharts.jsx
import React, { useMemo, useState } from "react";

function safeNumber(value, fallback = 0) {
  const parsed = Number(
    String(value ?? "").replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function shortDate(value) {
  if (!value) return "";

  const parsed = new Date(
    String(value).includes("T")
      ? value
      : `${value}T12:00:00`
  );

  if (!Number.isFinite(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function workoutDate(item = {}) {
  const raw =
    item.completed_at ||
    item.finished_at ||
    item.saved_at ||
    item.created_at ||
    item.ymd ||
    item?.session?.finished_at ||
    item?.session?.saved_at ||
    item?.session?.ymd ||
    "";

  if (!raw) return "";

  const parsed = new Date(
    String(raw).includes("T")
      ? raw
      : `${raw}T12:00:00`
  );

  if (!Number.isFinite(parsed.getTime())) {
    return "";
  }

  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function lastDays(count = 7) {
  const days = [];
  const today = new Date();

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - offset
    );

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");

    days.push({
      ymd: `${yyyy}-${mm}-${dd}`,
      label: date.toLocaleDateString(undefined, {
        weekday: "short",
      }),
    });
  }

  return days;
}

function buildWorkoutTrend(history = [], count = 7) {
  const days = lastDays(count);

  return days.map((day) => {
    const sessions = (Array.isArray(history) ? history : []).filter(
      (item) => workoutDate(item) === day.ymd
    );

    return {
      ...day,
      workouts: sessions.length,
      sets: sessions.reduce(
        (sum, item) =>
          sum +
          safeNumber(
            item.completed_sets ??
              item?.summary?.completed_sets ??
              item?.session?.completed_sets,
            0
          ),
        0
      ),
      activeMinutes: Math.round(
        sessions.reduce(
          (sum, item) =>
            sum +
            safeNumber(
              item.active_seconds ??
                item?.summary?.active_seconds ??
                item?.session?.active_seconds,
              0
            ),
          0
        ) / 60
      ),
    };
  });
}

function buildWeightTrend({
  snapshot,
  profile,
  progressLogs,
}) {
  const rows = [];

  (Array.isArray(progressLogs) ? progressLogs : []).forEach(
    (item) => {
      const value = safeNumber(
        item.weight ??
          item.current_weight ??
          item.body_weight ??
          item.value,
        0
      );

      const date =
        item.ymd ||
        item.date ||
        item.logged_at ||
        item.created_at ||
        "";

      if (value > 0 && date) {
        rows.push({
          date,
          value,
        });
      }
    }
  );

  (Array.isArray(snapshot?.daily_history)
    ? snapshot.daily_history
    : []
  ).forEach((item) => {
    const value = safeNumber(item?.weight, 0);

    if (value > 0 && item?.ymd) {
      rows.push({
        date: item.ymd,
        value,
      });
    }
  });

  const currentWeight = safeNumber(
    snapshot?.weight || profile?.weight,
    0
  );

  if (currentWeight > 0) {
    rows.push({
      date: new Date().toISOString(),
      value: currentWeight,
    });
  }

  const byDay = new Map();

  rows.forEach((row) => {
    const parsed = new Date(
      String(row.date).includes("T")
        ? row.date
        : `${row.date}T12:00:00`
    );

    if (!Number.isFinite(parsed.getTime())) return;

    const key = parsed.toISOString().slice(0, 10);

    byDay.set(key, {
      ymd: key,
      label: shortDate(key),
      value: row.value,
    });
  });

  return Array.from(byDay.values())
    .sort((a, b) => a.ymd.localeCompare(b.ymd))
    .slice(-12);
}

function EmptyChart({ message }) {
  return (
    <div className="flex min-h-[170px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-950/35 px-5 text-center text-sm leading-6 text-slate-500">
      {message}
    </div>
  );
}

function BarChart({ data, metric }) {
  const values = data.map((item) =>
    safeNumber(item[metric], 0)
  );

  const maxValue = Math.max(1, ...values);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-3">
      <div className="flex h-40 items-end gap-2">
        {data.map((item) => {
          const value = safeNumber(item[metric], 0);
          const height = Math.max(
            value > 0 ? 8 : 2,
            Math.round((value / maxValue) * 100)
          );

          return (
            <div
              key={item.ymd}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
            >
              <div className="text-[10px] font-black text-cyan-100">
                {value || ""}
              </div>

              <div className="flex h-28 w-full items-end justify-center">
                <div
                  className="w-full max-w-8 rounded-t-xl bg-gradient-to-t from-cyan-500 via-blue-500 to-fuchsia-400 shadow-[0_0_20px_rgba(34,211,238,0.16)] transition-all"
                  style={{ height: `${height}%` }}
                />
              </div>

              <div className="truncate text-[9px] font-black uppercase tracking-[0.08em] text-slate-500">
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LineChart({ data, targetWeight }) {
  if (data.length < 2) {
    return (
      <EmptyChart message="Log weight at least twice to unlock the weight trend line." />
    );
  }

  const width = 640;
  const height = 220;
  const padding = 28;

  const values = data.map((item) => item.value);

  if (targetWeight > 0) {
    values.push(targetWeight);
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(1, max - min);

  const points = data.map((item, index) => {
    const x =
      padding +
      (index / Math.max(1, data.length - 1)) *
        (width - padding * 2);

    const y =
      height -
      padding -
      ((item.value - min) / spread) *
        (height - padding * 2);

    return {
      ...item,
      x,
      y,
    };
  });

  const pointString = points
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  const targetY =
    targetWeight > 0
      ? height -
        padding -
        ((targetWeight - min) / spread) *
          (height - padding * 2)
      : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/35 p-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[210px] w-full"
        role="img"
        aria-label="Body weight trend"
      >
        <defs>
          <linearGradient
            id="healthWeightLine"
            x1="0"
            x2="1"
          >
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="55%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#e879f9" />
          </linearGradient>

          <linearGradient
            id="healthWeightArea"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#22d3ee"
              stopOpacity="0.25"
            />
            <stop
              offset="100%"
              stopColor="#22d3ee"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        {[0, 1, 2, 3].map((row) => {
          const y =
            padding +
            (row / 3) * (height - padding * 2);

          return (
            <line
              key={row}
              x1={padding}
              x2={width - padding}
              y1={y}
              y2={y}
              stroke="rgba(148,163,184,0.12)"
              strokeWidth="1"
            />
          );
        })}

        {targetY !== null &&
        targetY >= padding &&
        targetY <= height - padding ? (
          <>
            <line
              x1={padding}
              x2={width - padding}
              y1={targetY}
              y2={targetY}
              stroke="rgba(251,191,36,0.75)"
              strokeDasharray="8 7"
              strokeWidth="2"
            />
            <text
              x={width - padding}
              y={targetY - 7}
              textAnchor="end"
              fill="#fde68a"
              fontSize="12"
              fontWeight="800"
            >
              Goal {targetWeight} lb
            </text>
          </>
        ) : null}

        <polygon
          points={[
            `${points[0].x},${height - padding}`,
            pointString,
            `${points[points.length - 1].x},${height - padding}`,
          ].join(" ")}
          fill="url(#healthWeightArea)"
        />

        <polyline
          points={pointString}
          fill="none"
          stroke="url(#healthWeightLine)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point, index) => (
          <g key={`${point.ymd}-${index}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r="6"
              fill="#020617"
              stroke="#67e8f9"
              strokeWidth="4"
            />
            <text
              x={point.x}
              y={point.y - 13}
              textAnchor="middle"
              fill="#e2e8f0"
              fontSize="11"
              fontWeight="800"
            >
              {point.value}
            </text>
          </g>
        ))}
      </svg>

      <div className="mt-1 flex justify-between gap-2 text-[10px] font-bold text-slate-500">
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export default function HealthProgressCharts({
  profile,
  snapshot,
  history,
  progressLogs,
  onOpen,
}) {
  const [workoutMetric, setWorkoutMetric] =
    useState("workouts");

  const workoutData = useMemo(
    () => buildWorkoutTrend(history, 7),
    [history]
  );

  const weightData = useMemo(
    () =>
      buildWeightTrend({
        snapshot,
        profile,
        progressLogs,
      }),
    [snapshot, profile, progressLogs]
  );

  const targetWeight = safeNumber(
    profile?.target_weight,
    0
  );

  const weeklyWorkouts = workoutData.reduce(
    (sum, item) => sum + item.workouts,
    0
  );

  const weeklySets = workoutData.reduce(
    (sum, item) => sum + item.sets,
    0
  );

  const weeklyActiveMinutes = workoutData.reduce(
    (sum, item) => sum + item.activeMinutes,
    0
  );

  return (
    <section className="rounded-[1.5rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.09),transparent_30%),radial-gradient(circle_at_top_right,rgba(232,121,249,0.07),transparent_28%),rgba(255,255,255,0.025)] p-3 shadow-[0_14px_44px_rgba(0,0,0,0.2)] sm:rounded-[2rem] sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">
            Progress Intelligence
          </div>

          <h3 className="mt-1 text-xl font-black text-white sm:text-2xl">
            Trends that shape your next plan
          </h3>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
            These charts update from logged workouts, sets,
            active time, and body-weight check-ins.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpen?.("progress")}
          className="h-11 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/15"
        >
          Open Full Progress
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-200">
            Workouts
          </div>
          <div className="mt-1 text-xl font-black text-white">
            {weeklyWorkouts}
          </div>
        </div>

        <div className="rounded-2xl border border-lime-300/15 bg-lime-300/[0.06] p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.14em] text-lime-200">
            Sets
          </div>
          <div className="mt-1 text-xl font-black text-white">
            {weeklySets}
          </div>
        </div>

        <div className="rounded-2xl border border-fuchsia-300/15 bg-fuchsia-300/[0.06] p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.14em] text-fuchsia-200">
            Active Min
          </div>
          <div className="mt-1 text-xl font-black text-white">
            {weeklyActiveMinutes}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-[1.35rem] border border-white/10 bg-black/20 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Last 7 Days
              </div>
              <div className="mt-1 text-lg font-black text-white">
                Training consistency
              </div>
            </div>

            <div className="flex rounded-xl border border-white/10 bg-slate-950/60 p-1">
              {[
                ["workouts", "Workouts"],
                ["sets", "Sets"],
                ["activeMinutes", "Minutes"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setWorkoutMetric(value)}
                  className={cx(
                    "rounded-lg px-2.5 py-2 text-[10px] font-black uppercase tracking-[0.08em] transition",
                    workoutMetric === value
                      ? "bg-cyan-300/15 text-cyan-100"
                      : "text-slate-500"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <BarChart
              data={workoutData}
              metric={workoutMetric}
            />
          </div>
        </div>

        <div className="rounded-[1.35rem] border border-white/10 bg-black/20 p-3 sm:p-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Body Weight
            </div>
            <div className="mt-1 text-lg font-black text-white">
              Weight trend
            </div>
          </div>

          <div className="mt-3">
            <LineChart
              data={weightData}
              targetWeight={targetWeight}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
