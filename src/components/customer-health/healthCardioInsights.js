// src/components/customer-health/healthCardioInsights.js

function asNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sessionDate(session = {}) {
  const raw =
    session.completed_at ||
    session.started_at ||
    session.created_at ||
    session.date ||
    "";

  const date = raw ? new Date(raw) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

export function buildCardioInsights(history = [], days = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Math.max(1, days));

  const sessions = (Array.isArray(history) ? history : [])
    .filter((session) => {
      const isCardio =
        session?.source === "cardio_player" ||
        /cardio|walk|run|bike|elliptical|row|stair|ski|rope/i.test(
          `${session?.category || ""} ${session?.workout_name || ""} ${session?.name || ""}`
        );

      const date = sessionDate(session);
      return isCardio && date && date >= cutoff;
    })
    .sort((a, b) => sessionDate(b) - sessionDate(a));

  const totals = sessions.reduce(
    (acc, session) => {
      const metrics = session.cardio_metrics || {};
      acc.seconds += asNumber(
        session.active_seconds || session.total_seconds
      );
      acc.distance += asNumber(metrics.distance);
      acc.calories += asNumber(metrics.calories);
      acc.heartRateSum += asNumber(metrics.heart_rate);
      if (asNumber(metrics.heart_rate) > 0) {
        acc.heartRateCount += 1;
      }
      return acc;
    },
    {
      seconds: 0,
      distance: 0,
      calories: 0,
      heartRateSum: 0,
      heartRateCount: 0,
    }
  );

  const averageHeartRate = totals.heartRateCount
    ? Math.round(totals.heartRateSum / totals.heartRateCount)
    : 0;

  const latest = sessions[0] || null;
  const previous = sessions[1] || null;

  const latestMinutes = latest
    ? Math.round(
        asNumber(latest.active_seconds || latest.total_seconds) / 60
      )
    : 0;

  const previousMinutes = previous
    ? Math.round(
        asNumber(previous.active_seconds || previous.total_seconds) / 60
      )
    : 0;

  let trend = "No trend yet";
  if (latest && previous) {
    const difference = latestMinutes - previousMinutes;
    trend =
      difference > 0
        ? `Up ${difference} min from last session`
        : difference < 0
        ? `Down ${Math.abs(difference)} min from last session`
        : "Same duration as last session";
  }

  const weeklyTargetMinutes = 150;
  const totalMinutes = Math.round(totals.seconds / 60);
  const targetProgress = Math.min(
    100,
    Math.round((totalMinutes / weeklyTargetMinutes) * 100)
  );

  return {
    sessions,
    sessionCount: sessions.length,
    totalMinutes,
    totalDistance: Number(totals.distance.toFixed(2)),
    totalCalories: Math.round(totals.calories),
    averageHeartRate,
    latest,
    latestMinutes,
    trend,
    weeklyTargetMinutes,
    targetProgress,
  };
}
