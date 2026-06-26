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

function startOfCurrentWeekYmd() {
  const today = new Date();
  const start = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));

  const yyyy = start.getFullYear();
  const mm = String(start.getMonth() + 1).padStart(2, "0");
  const dd = String(start.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function sessionValue(item = {}, key, fallback = 0) {
  return safeNumber(
    item?.[key] ??
      item?.summary?.[key] ??
      item?.session?.[key],
    fallback
  );
}

function sessionExercises(item = {}) {
  const exercises =
    item?.exercises ||
    item?.session?.exercises ||
    [];

  return Array.isArray(exercises) ? exercises : [];
}

function buildWeeklyCoachReview({
  snapshot,
  history,
}) {
  const weekStart = startOfCurrentWeekYmd();
  const plan = Array.isArray(snapshot?.week_plan)
    ? snapshot.week_plan.filter(
        (item) => !item?.ymd || item.ymd >= weekStart
      )
    : [];

  const sessions = (Array.isArray(history) ? history : []).filter(
    (item) => {
      const date = workoutDate(item);
      return date && date >= weekStart;
    }
  );

  const planned = plan.filter(
    (item) => item?.workout_name
  ).length;
  const completedPlan = plan.filter(
    (item) => item?.status === "Completed"
  ).length;
  const skipped = plan.filter(
    (item) => item?.status === "Skipped"
  ).length;
  const completed = Math.max(
    completedPlan,
    sessions.length
  );
  const resolved = completed + skipped;
  const adherence =
    planned > 0
      ? Math.min(
          100,
          Math.round((completed / planned) * 100)
        )
      : completed > 0
      ? 100
      : 0;

  const sets = sessions.reduce(
    (sum, item) =>
      sum + sessionValue(item, "completed_sets"),
    0
  );
  const activeSeconds = sessions.reduce(
    (sum, item) =>
      sum + sessionValue(item, "active_seconds"),
    0
  );
  const totalSeconds = sessions.reduce(
    (sum, item) =>
      sum + sessionValue(item, "total_seconds"),
    0
  );
  const volume = sessions.reduce((total, item) => {
    return (
      total +
      sessionExercises(item).reduce(
        (exerciseTotal, exercise) =>
          exerciseTotal +
          (Array.isArray(exercise?.set_logs)
            ? exercise.set_logs.reduce(
                (setTotal, setLog) =>
                  setTotal +
                  safeNumber(
                    setLog?.actual_weight ??
                      setLog?.weight,
                    0
                  ) *
                    safeNumber(
                      setLog?.actual_reps ??
                        setLog?.reps,
                      0
                    ),
                0
              )
            : 0),
        0
      )
    );
  }, 0);

  const rpeValues = sessions.flatMap((item) =>
    sessionExercises(item).flatMap((exercise) =>
      (Array.isArray(exercise?.set_logs)
        ? exercise.set_logs
        : []
      )
        .map((setLog) =>
          safeNumber(
            setLog?.rpe ??
              setLog?.ease_score,
            0
          )
        )
        .filter((value) => value > 0)
    )
  );
  const averageRpe = rpeValues.length
    ? Math.round(
        (rpeValues.reduce(
          (sum, value) => sum + value,
          0
        ) /
          rpeValues.length) *
          10
      ) / 10
    : 0;

  const muscleCounts = new Map();
  let painFlags = 0;

  sessions.forEach((item) => {
    sessionExercises(item).forEach((exercise) => {
      const trained =
        (exercise?.set_logs || []).length > 0 ||
        exercise?.completed;

      if (!trained) return;

      [
        ...(exercise?.primary_muscles || []),
        ...(exercise?.secondary_muscles || []),
      ].forEach((muscle) => {
        const key = String(muscle || "").trim();
        if (!key) return;
        muscleCounts.set(
          key,
          (muscleCounts.get(key) || 0) + 1
        );
      });

      painFlags += (exercise?.set_logs || []).filter(
        (setLog) =>
          safeNumber(setLog?.pain_score, 0) > 0
      ).length;
    });

    painFlags +=
      safeNumber(
        item?.completion_meta?.pain_flags ??
          item?.session?.completion_meta?.pain_flags,
        0
      );
  });

  const muscleBalance = Array.from(
    muscleCounts.entries()
  )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  let recommendation =
    "Complete one focused workout and log every set so your coach can establish a reliable baseline.";

  if (painFlags > 0) {
    recommendation =
      "Keep the next session pain-free: reduce load, use controlled ranges, and substitute any movement that reproduces pain.";
  } else if (skipped >= 2) {
    recommendation =
      "Reduce next week's plan to the sessions you can realistically complete, then rebuild consistency before adding volume.";
  } else if (adherence >= 85 && averageRpe >= 8.5) {
    recommendation =
      "Consistency is strong, but effort is high. Hold the current load and improve recovery before progressing.";
  } else if (adherence >= 85 && sessions.length > 0) {
    recommendation =
      "Consistency is strong. Progress one variable next week: add a small amount of weight, one rep, or better control.";
  } else if (adherence > 0) {
    recommendation =
      "Protect the next scheduled workout. Consistency will improve results more than adding extra intensity right now.";
  }

  return {
    planned,
    completed,
    skipped,
    resolved,
    adherence,
    sets,
    activeMinutes: Math.round(activeSeconds / 60),
    totalMinutes: Math.round(totalSeconds / 60),
    activeRatio:
      totalSeconds > 0
        ? Math.round(
            (activeSeconds / totalSeconds) * 100
          )
        : 0,
    volume: Math.round(volume),
    averageRpe,
    painFlags,
    muscleBalance,
    recommendation,
  };
}

function workoutName(item = {}) {
  return String(
    item?.workout_name ||
      item?.name ||
      item?.session?.workout_name ||
      ""
  ).trim();
}

function sessionTotals(item = {}) {
  const exercises = sessionExercises(item);
  const setLogs = exercises.flatMap((exercise) =>
    Array.isArray(exercise?.set_logs)
      ? exercise.set_logs
      : []
  );

  const volume = setLogs.reduce(
    (sum, setLog) =>
      sum +
      safeNumber(
        setLog?.actual_weight ?? setLog?.weight,
        0
      ) *
        safeNumber(
          setLog?.actual_reps ?? setLog?.reps,
          0
        ),
    0
  );

  const rpeValues = setLogs
    .map((setLog) =>
      safeNumber(
        setLog?.rpe ?? setLog?.ease_score,
        0
      )
    )
    .filter((value) => value > 0);

  const painFlags =
    setLogs.filter(
      (setLog) =>
        safeNumber(setLog?.pain_score, 0) > 0
    ).length +
    safeNumber(
      item?.completion_meta?.pain_flags ??
        item?.session?.completion_meta?.pain_flags,
      0
    );

  const poorFormFlags = setLogs.filter(
    (setLog) =>
      String(setLog?.form_quality || "")
        .toLowerCase()
        .includes("poor")
  ).length;

  return {
    name: workoutName(item) || "Workout",
    date: workoutDate(item),
    sets: sessionValue(item, "completed_sets"),
    activeSeconds: sessionValue(
      item,
      "active_seconds"
    ),
    totalSeconds: sessionValue(
      item,
      "total_seconds"
    ),
    volume: Math.round(volume),
    averageRpe: rpeValues.length
      ? Math.round(
          (rpeValues.reduce(
            (sum, value) => sum + value,
            0
          ) /
            rpeValues.length) *
            10
        ) / 10
      : 0,
    painFlags,
    poorFormFlags,
    exercises,
  };
}

function buildWorkoutComparison(history = []) {
  const sessions = (Array.isArray(history)
    ? history
    : []
  )
    .map((item) => ({
      raw: item,
      date: workoutDate(item),
      name: workoutName(item),
    }))
    .filter((item) => item.date && item.name)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (!sessions.length) {
    return null;
  }

  const currentRow = sessions[0];
  const previousRow = sessions.find(
    (item, index) =>
      index > 0 &&
      item.name.toLowerCase() ===
        currentRow.name.toLowerCase()
  );

  const current = sessionTotals(currentRow.raw);
  const previous = previousRow
    ? sessionTotals(previousRow.raw)
    : null;

  if (!previous) {
    return {
      current,
      previous: null,
      exerciseRows: [],
      action: "baseline",
      headline: "Baseline established",
      explanation:
        "Complete this workout again to unlock a true last-time versus current comparison.",
    };
  }

  const previousByName = new Map(
    previous.exercises.map((exercise) => [
      String(exercise?.name || "").toLowerCase(),
      exercise,
    ])
  );

  const exerciseRows = current.exercises
    .map((exercise) => {
      const name = String(
        exercise?.substitute_name ||
          exercise?.name ||
          "Exercise"
      );
      const prior = previousByName.get(
        String(exercise?.name || "").toLowerCase()
      );
      const currentSets = Array.isArray(
        exercise?.set_logs
      )
        ? exercise.set_logs
        : [];
      const previousSets = Array.isArray(
        prior?.set_logs
      )
        ? prior.set_logs
        : [];

      const bestCurrent = currentSets.reduce(
        (best, setLog) => {
          const weight = safeNumber(
            setLog?.actual_weight ??
              setLog?.weight,
            0
          );
          const reps = safeNumber(
            setLog?.actual_reps ?? setLog?.reps,
            0
          );
          const score = weight * Math.max(1, reps);
          return score > best.score
            ? { weight, reps, score }
            : best;
        },
        { weight: 0, reps: 0, score: 0 }
      );

      const bestPrevious = previousSets.reduce(
        (best, setLog) => {
          const weight = safeNumber(
            setLog?.actual_weight ??
              setLog?.weight,
            0
          );
          const reps = safeNumber(
            setLog?.actual_reps ?? setLog?.reps,
            0
          );
          const score = weight * Math.max(1, reps);
          return score > best.score
            ? { weight, reps, score }
            : best;
        },
        { weight: 0, reps: 0, score: 0 }
      );

      const improved =
        bestCurrent.score > bestPrevious.score &&
        bestPrevious.score > 0;

      return {
        name,
        current: bestCurrent,
        previous: bestPrevious,
        improved,
      };
    })
    .filter(
      (row) =>
        row.current.score > 0 ||
        row.previous.score > 0
    )
    .slice(0, 6);

  const painOrFormRisk =
    current.painFlags > 0 ||
    current.poorFormFlags > 0;
  const volumeDelta =
    current.volume - previous.volume;
  const rpeDelta =
    current.averageRpe - previous.averageRpe;
  const activeDelta =
    current.activeSeconds - previous.activeSeconds;

  let action = "maintain";
  let headline = "Hold steady";
  let explanation =
    "Performance was similar. Repeat the targets and focus on cleaner execution.";

  if (painOrFormRisk) {
    action = "reduce";
    headline = "Reduce or modify";
    explanation =
      "Pain or poor form was reported. Do not progress load until the movement is pain-free and controlled.";
  } else if (
    volumeDelta > 0 &&
    current.averageRpe <= 8.5
  ) {
    action = "increase";
    headline = "Ready to progress";
    explanation =
      "You completed more work without excessive effort. Add a small amount of weight, one rep, or better control next time.";
  } else if (
    rpeDelta >= 1 ||
    current.averageRpe >= 9
  ) {
    action = "maintain";
    headline = "Maintain and recover";
    explanation =
      "Effort increased. Repeat the current load before adding more demand.";
  }

  return {
    current,
    previous,
    exerciseRows,
    action,
    headline,
    explanation,
    deltas: {
      volume: volumeDelta,
      sets: current.sets - previous.sets,
      activeSeconds: activeDelta,
      rpe:
        Math.round(rpeDelta * 10) / 10,
    },
  };
}

function DeltaValue({
  value,
  suffix = "",
  invert = false,
}) {
  const numeric = safeNumber(value, 0);
  const positive = invert ? numeric < 0 : numeric > 0;
  const negative = invert ? numeric > 0 : numeric < 0;

  return (
    <span
      className={cx(
        "font-black",
        positive
          ? "text-lime-200"
          : negative
          ? "text-rose-200"
          : "text-slate-300"
      )}
    >
      {numeric > 0 ? "+" : ""}
      {numeric}
      {suffix}
    </span>
  );
}

function KpiTile({
  label,
  value,
  detail,
  tone = "cyan",
}) {
  const tones = {
    cyan:
      "border-cyan-300/20 bg-cyan-300/[0.07] text-cyan-100",
    lime:
      "border-lime-300/20 bg-lime-300/[0.07] text-lime-100",
    amber:
      "border-amber-300/20 bg-amber-300/[0.07] text-amber-100",
    fuchsia:
      "border-fuchsia-300/20 bg-fuchsia-300/[0.07] text-fuchsia-100",
    rose:
      "border-rose-300/20 bg-rose-300/[0.07] text-rose-100",
  };

  return (
    <div
      className={cx(
        "rounded-2xl border p-3",
        tones[tone] || tones.cyan
      )}
    >
      <div className="text-[9px] font-black uppercase tracking-[0.14em] opacity-75">
        {label}
      </div>
      <div className="mt-1 text-xl font-black text-white">
        {value}
      </div>
      {detail ? (
        <div className="mt-1 text-[11px] leading-4 text-slate-400">
          {detail}
        </div>
      ) : null}
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

  const workoutComparison = useMemo(
    () => buildWorkoutComparison(history),
    [history]
  );

  const weeklyReview = useMemo(
    () =>
      buildWeeklyCoachReview({
        snapshot,
        history,
      }),
    [snapshot, history]
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

      <div className="mt-4 rounded-[1.35rem] border border-fuchsia-300/20 bg-[linear-gradient(135deg,rgba(232,121,249,0.08),rgba(34,211,238,0.05))] p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-200">
              Workout Progression Intelligence
            </div>
            <div className="mt-1 text-xl font-black text-white">
              {workoutComparison
                ? workoutComparison.headline
                : "Complete a workout to begin"}
            </div>
            <div className="mt-1 text-sm leading-6 text-slate-400">
              {workoutComparison
                ? `${workoutComparison.current.name} Â· ${shortDate(
                    workoutComparison.current.date
                  )}`
                : "Your latest matching workout will be compared automatically."}
            </div>
          </div>

          {workoutComparison ? (
            <div
              className={cx(
                "rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em]",
                workoutComparison.action === "increase"
                  ? "border-lime-300/25 bg-lime-300/10 text-lime-100"
                  : workoutComparison.action === "reduce"
                  ? "border-rose-300/25 bg-rose-300/10 text-rose-100"
                  : workoutComparison.action === "baseline"
                  ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
                  : "border-amber-300/25 bg-amber-300/10 text-amber-100"
              )}
            >
              {workoutComparison.action}
            </div>
          ) : null}
        </div>

        {workoutComparison ? (
          <>
            <p className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm leading-6 text-slate-300">
              {workoutComparison.explanation}
            </p>

            {workoutComparison.previous ? (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <KpiTile
                  label="Volume Change"
                  value={
                    <DeltaValue
                      value={
                        workoutComparison.deltas.volume
                      }
                    />
                  }
                  detail={`${workoutComparison.current.volume.toLocaleString()} current`}
                  tone="cyan"
                />
                <KpiTile
                  label="Set Change"
                  value={
                    <DeltaValue
                      value={
                        workoutComparison.deltas.sets
                      }
                    />
                  }
                  detail={`${workoutComparison.current.sets} current sets`}
                  tone="lime"
                />
                <KpiTile
                  label="Active Time"
                  value={
                    <DeltaValue
                      value={Math.round(
                        workoutComparison.deltas
                          .activeSeconds / 60
                      )}
                      suffix="m"
                    />
                  }
                  detail={`${Math.round(
                    workoutComparison.current
                      .activeSeconds / 60
                  )}m current`}
                  tone="fuchsia"
                />
                <KpiTile
                  label="RPE Change"
                  value={
                    <DeltaValue
                      value={
                        workoutComparison.deltas.rpe
                      }
                      invert
                    />
                  }
                  detail={`RPE ${
                    workoutComparison.current
                      .averageRpe || "â€”"
                  } current`}
                  tone="amber"
                />
              </div>
            ) : null}

            {workoutComparison.exerciseRows.length ? (
              <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Exercise-by-Exercise
                </div>

                <div className="mt-3 space-y-2">
                  {workoutComparison.exerciseRows.map(
                    (row) => (
                      <div
                        key={row.name}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-white">
                            {row.name}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Last:{" "}
                            {row.previous.weight || "BW"} Ã—{" "}
                            {row.previous.reps || "â€”"}
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div
                            className={cx(
                              "text-sm font-black",
                              row.improved
                                ? "text-lime-200"
                                : "text-cyan-100"
                            )}
                          >
                            {row.current.weight || "BW"} Ã—{" "}
                            {row.current.reps || "â€”"}
                          </div>
                          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
                            {row.improved
                              ? "Improved"
                              : "Current"}
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-white/10 bg-black/20 p-5 text-center text-sm leading-6 text-slate-500">
            Save at least one completed workout to unlock comparison and progression guidance.
          </div>
        )}
      </div>

      <div className="mt-4 rounded-[1.35rem] border border-lime-300/20 bg-[linear-gradient(135deg,rgba(57,255,136,0.08),rgba(34,211,238,0.05))] p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-200">
              Weekly Coach Review
            </div>
            <div className="mt-1 text-xl font-black text-white">
              {weeklyReview.adherence}% adherence
            </div>
            <div className="mt-1 text-sm leading-6 text-slate-400">
              {weeklyReview.completed} completed Â·{" "}
              {weeklyReview.skipped} skipped Â·{" "}
              {weeklyReview.planned} planned
            </div>
          </div>

          <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-black/20 p-3 sm:w-64">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
              <span>Consistency</span>
              <span>{weeklyReview.adherence}%</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-lime-400 to-emerald-300 transition-all"
                style={{
                  width: `${Math.max(
                    2,
                    weeklyReview.adherence
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <KpiTile
            label="Completed"
            value={weeklyReview.completed}
            detail={`${weeklyReview.planned} scheduled`}
            tone="lime"
          />
          <KpiTile
            label="Training Sets"
            value={weeklyReview.sets}
            detail="Logged working data"
            tone="cyan"
          />
          <KpiTile
            label="Active Time"
            value={`${weeklyReview.activeMinutes}m`}
            detail={`${weeklyReview.activeRatio}% of total`}
            tone="fuchsia"
          />
          <KpiTile
            label="Total Time"
            value={`${weeklyReview.totalMinutes}m`}
            detail="Workout duration"
            tone="amber"
          />
          <KpiTile
            label="Avg RPE"
            value={
              weeklyReview.averageRpe || "â€”"
            }
            detail="Effort across sets"
            tone="fuchsia"
          />
          <KpiTile
            label="Volume"
            value={
              weeklyReview.volume
                ? weeklyReview.volume.toLocaleString()
                : "â€”"
            }
            detail="Weight Ã— reps"
            tone="cyan"
          />
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1.25fr]">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Muscle Balance
                </div>
                <div className="mt-1 text-sm font-black text-white">
                  Training distribution
                </div>
              </div>
              <div
                className={cx(
                  "rounded-full border px-3 py-1 text-[10px] font-black",
                  weeklyReview.painFlags
                    ? "border-rose-300/25 bg-rose-300/10 text-rose-100"
                    : "border-lime-300/25 bg-lime-300/10 text-lime-100"
                )}
              >
                {weeklyReview.painFlags
                  ? `${weeklyReview.painFlags} pain flag${
                      weeklyReview.painFlags === 1 ? "" : "s"
                    }`
                  : "No pain flags"}
              </div>
            </div>

            {weeklyReview.muscleBalance.length ? (
              <div className="mt-3 space-y-2">
                {weeklyReview.muscleBalance.map(
                  (item) => {
                    const maxCount = Math.max(
                      1,
                      ...weeklyReview.muscleBalance.map(
                        (row) => row.count
                      )
                    );

                    return (
                      <div key={item.name}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-300">
                            {item.name}
                          </span>
                          <span className="font-black text-cyan-100">
                            {item.count}
                          </span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-400"
                            style={{
                              width: `${
                                (item.count / maxCount) * 100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-white/10 p-4 text-center text-xs leading-5 text-slate-500">
                Complete workouts with exercise muscle data to unlock balance tracking.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/[0.06] p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-200">
              Coach Recommendation
            </div>
            <div className="mt-2 text-lg font-black text-white">
              One priority for next week
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {weeklyReview.recommendation}
            </p>
          </div>
        </div>
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
