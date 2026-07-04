// src/components/customer-health/healthDailyMetricIntelligence.js

function safeNumber(value, fallback = 0) {
  const parsed = Number(
    String(value ?? "").replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function localYmd(date = new Date()) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function lastDays(count = 7) {
  return Array.from(
    { length: count },
    (_, index) => {
      const date = new Date();
      date.setHours(12, 0, 0, 0);
      date.setDate(
        date.getDate() -
          (count - 1 - index)
      );

      return {
        ymd: localYmd(date),
        label: date.toLocaleDateString(
          undefined,
          { weekday: "short" }
        ),
      };
    }
  );
}

function metricValue(row, key) {
  if (!row || typeof row !== "object") {
    return 0;
  }

  if (key === "protein") {
    return safeNumber(
      row.protein ??
        row.protein_today
    );
  }

  if (key === "sleep") {
    return safeNumber(
      row.sleep ??
        row.sleep_hours ??
        row.last_sleep_hours
    );
  }

  return safeNumber(row[key]);
}

export function mergeDailyMetricEntry(
  dailyHistory,
  entry
) {
  const rows = Array.isArray(dailyHistory)
    ? [...dailyHistory]
    : [];

  const ymd =
    entry?.ymd || localYmd();

  const index = rows.findIndex(
    (row) => row?.ymd === ymd
  );

  const current =
    index >= 0
      ? { ...rows[index] }
      : { ymd };

  const type = String(
    entry?.type || ""
  );

  const value = safeNumber(
    entry?.value
  );

  const secondary = safeNumber(
    entry?.secondary
  );

  if (type === "steps") {
    current.steps = value;
  }

  if (type === "water") {
    current.water =
      safeNumber(current.water) +
      value;
  }

  if (type === "protein") {
    current.protein =
      safeNumber(current.protein) +
      value;
  }

  if (type === "calories") {
    current.calories =
      safeNumber(current.calories) +
      value;
  }

  if (type === "sleep") {
    current.sleep = value;
  }

  if (type === "weight") {
    current.weight = value;
  }

  if (type === "meal") {
    current.calories =
      safeNumber(current.calories) +
      value;
    current.protein =
      safeNumber(current.protein) +
      secondary;
  }

  current.updated_at =
    new Date().toISOString();

  if (index >= 0) {
    rows[index] = current;
  } else {
    rows.push(current);
  }

  return rows
    .sort((left, right) =>
      String(left?.ymd || "").localeCompare(
        String(right?.ymd || "")
      )
    )
    .slice(-90);
}

function buildMetric({
  key,
  label,
  unit,
  goal,
  rows,
  todayValue,
  rewardLabel,
}) {
  const days = lastDays(7);

  const points = days.map((day) => {
    const row = rows.find(
      (item) => item?.ymd === day.ymd
    );

    const value =
      day.ymd === localYmd() &&
      safeNumber(todayValue) > 0
        ? safeNumber(todayValue)
        : metricValue(row, key);

    const percent =
      goal > 0
        ? Math.max(
            0,
            Math.min(
              100,
              Math.round(
                (value / goal) * 100
              )
            )
          )
        : 0;

    return {
      ...day,
      value,
      percent,
      complete:
        goal > 0 && value >= goal,
    };
  });

  let streak = 0;

  for (
    let index = points.length - 1;
    index >= 0;
    index -= 1
  ) {
    if (!points[index].complete) {
      break;
    }
    streak += 1;
  }

  const today = points[
    points.length - 1
  ];

  return {
    key,
    label,
    unit,
    goal,
    value: today?.value || 0,
    percent: today?.percent || 0,
    remaining: Math.max(
      0,
      goal - (today?.value || 0)
    ),
    complete: !!today?.complete,
    streak,
    reward:
      streak >= 7
        ? `7-day ${rewardLabel}`
        : streak >= 3
        ? `3-day ${rewardLabel}`
        : today?.complete
        ? `Daily ${rewardLabel}`
        : "",
    points,
  };
}

export function buildDailyMetricIntelligence({
  snapshot = {},
} = {}) {
  const rows = Array.isArray(
    snapshot.daily_history
  )
    ? snapshot.daily_history
    : [];

  const metrics = [
    buildMetric({
      key: "steps",
      label: "Steps",
      unit: "",
      goal:
        safeNumber(
          snapshot.step_goal
        ) || 8000,
      rows,
      todayValue:
        snapshot.steps,
      rewardLabel:
        "movement goal",
    }),
    buildMetric({
      key: "water",
      label: "Water",
      unit: " oz",
      goal:
        safeNumber(
          snapshot.water_goal
        ) || 100,
      rows,
      todayValue:
        snapshot.water,
      rewardLabel:
        "hydration goal",
    }),
    buildMetric({
      key: "protein",
      label: "Protein",
      unit: " g",
      goal:
        safeNumber(
          snapshot.protein_goal
        ) || 150,
      rows,
      todayValue:
        snapshot.protein_today,
      rewardLabel:
        "protein goal",
    }),
    buildMetric({
      key: "calories",
      label: "Calories",
      unit: "",
      goal:
        safeNumber(
          snapshot.calorie_goal
        ) || 2200,
      rows,
      todayValue:
        snapshot.calories,
      rewardLabel:
        "nutrition log",
    }),
    buildMetric({
      key: "sleep",
      label: "Sleep",
      unit: " h",
      goal:
        safeNumber(
          snapshot.sleep_goal
        ) || 8,
      rows,
      todayValue:
        snapshot.last_sleep_hours ||
        snapshot.sleep_hours,
      rewardLabel:
        "recovery goal",
    }),
  ];

  const incomplete = metrics
    .filter((metric) => !metric.complete)
    .sort(
      (left, right) =>
        left.percent - right.percent
    );

  const priority =
    incomplete[0] || null;

  const completedCount =
    metrics.filter(
      (metric) => metric.complete
    ).length;

  return {
    metrics,
    completed_count: completedCount,
    total_count: metrics.length,
    daily_score: Math.round(
      metrics.reduce(
        (sum, metric) =>
          sum + metric.percent,
        0
      ) / metrics.length
    ),
    priority,
    coach_message: priority
      ? `${priority.label} is today's biggest gap. You have ${priority.remaining}${priority.unit} remaining to reach the goal.`
      : "All tracked daily goals are complete. Protect the streak and recover well.",
  };
}