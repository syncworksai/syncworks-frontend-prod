// src/components/customer-health/HealthGoalProgressCard.jsx
import React, { useMemo, useState } from "react";

import {
  readHealthCoachingContext,
  writeHealthCoachingContext,
} from "./healthCoachingContext";

function safeNumber(value, fallback = 0) {
  const parsed = Number(
    String(value ?? "").replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(parsed) ? parsed : fallback;
}

function todayYmd() {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function addWeeksYmd(weeks) {
  const date = new Date();
  date.setDate(date.getDate() + weeks * 7);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function daysBetween(start, end) {
  const startTime = new Date(`${start}T12:00:00`).getTime();
  const endTime = new Date(`${end}T12:00:00`).getTime();

  if (
    !Number.isFinite(startTime) ||
    !Number.isFinite(endTime)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.ceil((endTime - startTime) / 86400000)
  );
}

function completedWorkoutCount(history) {
  return (Array.isArray(history) ? history : []).filter(
    (item) =>
      item?.status === "completed" ||
      item?.status === "Completed" ||
      item?.completed_at ||
      item?.finished_at
  ).length;
}

function plannedWorkoutCount(snapshot) {
  return (Array.isArray(snapshot?.week_plan)
    ? snapshot.week_plan
    : []
  ).filter(
    (item) =>
      item?.workout_name &&
      !["Skipped", "Cancelled"].includes(item?.status)
  ).length;
}

function calculateAdherence(history, snapshot) {
  const completed = completedWorkoutCount(history);
  const planned = plannedWorkoutCount(snapshot);

  if (planned > 0) {
    return Math.max(
      0,
      Math.min(100, Math.round((completed / planned) * 100))
    );
  }

  if (completed >= 8) return 88;
  if (completed >= 4) return 76;
  if (completed >= 1) return 64;
  return 48;
}

function calculateProbability({
  adherence,
  readiness,
  sleepRatio,
  painCount,
  targetDays,
}) {
  const timelinePressure =
    targetDays > 0 && targetDays < 28
      ? 12
      : targetDays > 0 && targetDays < 56
      ? 6
      : 0;

  return Math.max(
    5,
    Math.min(
      95,
      Math.round(
        adherence * 0.5 +
          readiness * 0.25 +
          sleepRatio * 0.15 +
          10 -
          painCount * 4 -
          timelinePressure
      )
    )
  );
}

function probabilityLabel(probability) {
  if (probability >= 80) return "Strong trajectory";
  if (probability >= 65) return "On track";
  if (probability >= 50) return "Needs consistency";
  return "Plan needs attention";
}

function milestoneRows({
  targetDate,
  primaryGoal,
  trainingDays,
}) {
  const today = todayYmd();
  const totalDays = Math.max(
    28,
    daysBetween(today, targetDate)
  );

  const points = [0.25, 0.5, 0.75, 1];

  return points.map((fraction, index) => {
    const date = new Date(`${today}T12:00:00`);
    date.setDate(
      date.getDate() +
        Math.max(7, Math.round(totalDays * fraction))
    );

    const ymd = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");

    const labels = [
      "Consistency established",
      "Midpoint assessment",
      "Final progression block",
      "Goal review",
    ];

    const details = [
      `Complete approximately ${Math.max(
        2,
        Math.round(trainingDays * 3)
      )} planned sessions with reliable logging.`,
      `Review strength, measurements, recovery, and whether ${primaryGoal.toLowerCase()} is moving in the right direction.`,
      "Protect form, manage fatigue, and complete the highest-value sessions.",
      "Compare the starting point with current performance and set the next objective.",
    ];

    return {
      id: `milestone-${index + 1}`,
      label: labels[index],
      detail: details[index],
      date: ymd,
    };
  });
}

export default function HealthGoalProgressCard({
  profile,
  snapshot,
  history,
  onOpen,
}) {
  const initialContext =
    readHealthCoachingContext();

  const [primaryGoal, setPrimaryGoal] = useState(
    initialContext?.identity?.primary_goal ||
      profile?.primary_goal ||
      "General fitness"
  );
  const [targetDate, setTargetDate] = useState(
    initialContext?.identity?.target_date ||
      profile?.target_date ||
      addWeeksYmd(12)
  );
  const [published, setPublished] = useState(false);

  const metrics = useMemo(() => {
    const adherence = calculateAdherence(
      history,
      snapshot
    );
    const readiness = safeNumber(
      snapshot?.readiness_score ||
        snapshot?.readiness,
      70
    );
    const sleep = safeNumber(
      snapshot?.last_sleep_hours ||
        snapshot?.sleep_hours,
      0
    );
    const sleepGoal = safeNumber(
      snapshot?.sleep_goal ||
        profile?.sleep_goal,
      8
    );
    const sleepRatio =
      sleepGoal > 0
        ? Math.min(
            100,
            Math.round((sleep / sleepGoal) * 100)
          )
        : 70;
    const context = readHealthCoachingContext();
    const painCount = Array.isArray(
      context?.health_constraints?.active_pain_areas
    )
      ? context.health_constraints.active_pain_areas.length
      : 0;
    const targetDays = daysBetween(
      todayYmd(),
      targetDate
    );
    const probability = calculateProbability({
      adherence,
      readiness,
      sleepRatio,
      painCount,
      targetDays,
    });

    return {
      adherence,
      readiness,
      sleepRatio,
      painCount,
      targetDays,
      probability,
      completed: completedWorkoutCount(history),
      planned: plannedWorkoutCount(snapshot),
    };
  }, [
    history,
    snapshot,
    profile,
    targetDate,
  ]);

  const trainingDays = Math.max(
    1,
    safeNumber(
      initialContext?.identity?.training_days ||
        profile?.training_days,
      3
    )
  );

  const milestones = useMemo(
    () =>
      milestoneRows({
        targetDate,
        primaryGoal,
        trainingDays,
      }),
    [targetDate, primaryGoal, trainingDays]
  );

  function saveGoal() {
    const current = readHealthCoachingContext();

    writeHealthCoachingContext({
      ...current,
      identity: {
        ...current.identity,
        primary_goal: primaryGoal.trim() ||
          "General fitness",
        target_date: targetDate,
      },
      goal_progress: {
        ...(current.goal_progress || {}),
        probability_percent:
          metrics.probability,
        adherence_percent:
          metrics.adherence,
        status:
          probabilityLabel(metrics.probability),
        target_days_remaining:
          metrics.targetDays,
        milestones,
        calculated_at:
          new Date().toISOString(),
      },
    });

    setPublished(false);
  }

  function publishToSync() {
    const current = readHealthCoachingContext();
    const summary = {
      primary_goal:
        primaryGoal.trim() ||
        "General fitness",
      target_date: targetDate,
      probability_percent:
        metrics.probability,
      trajectory:
        probabilityLabel(metrics.probability),
      adherence_percent:
        metrics.adherence,
      readiness_percent:
        metrics.readiness,
      active_pain_flags:
        metrics.painCount,
      completed_workouts:
        metrics.completed,
      next_best_action:
        metrics.adherence < 70
          ? "Complete the next scheduled workout and log every working set."
          : metrics.painCount > 0
          ? "Keep the plan pain-aware and review active symptoms before the next workout."
          : "Continue the current plan and complete the next scheduled milestone.",
      milestones,
      published_at:
        new Date().toISOString(),
      source: "syncworks_health",
    };

    writeHealthCoachingContext({
      ...current,
      identity: {
        ...current.identity,
        primary_goal:
          summary.primary_goal,
        target_date: targetDate,
      },
      goal_progress: {
        ...(current.goal_progress || {}),
        ...summary,
      },
      sync_summary: summary,
      daily_state: {
        ...current.daily_state,
        next_best_action:
          summary.next_best_action,
      },
    });

    setPublished(true);
  }

  return (
    <section className="rounded-[1.8rem] border border-emerald-300/22 bg-[radial-gradient(circle_at_90%_10%,rgba(0,245,106,0.14),transparent_30%),linear-gradient(145deg,rgba(15,22,17,0.99),rgba(3,6,4,0.99))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.36)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
            12-Week Goal Intelligence
          </div>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
            Are you on pace?
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            SYNC combines adherence, readiness, sleep,
            pain flags, and timeline pressure into a
            transparent probability estimate.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-center">
          <div className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-200">
            Goal Probability
          </div>
          <div className="mt-1 text-4xl font-black text-white">
            {metrics.probability}%
          </div>
          <div className="mt-1 text-[10px] font-black text-emerald-100">
            {probabilityLabel(
              metrics.probability
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
            Primary Goal
          </div>
          <input
            value={primaryGoal}
            onChange={(event) =>
              setPrimaryGoal(event.target.value)
            }
            className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-bold text-white outline-none focus:border-emerald-300/40"
          />
        </label>

        <label className="block">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
            Target Date
          </div>
          <input
            type="date"
            value={targetDate}
            min={todayYmd()}
            onChange={(event) =>
              setTargetDate(event.target.value)
            }
            className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-bold text-white outline-none focus:border-emerald-300/40"
          />
        </label>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Adherence", `${metrics.adherence}%`],
          [
            "Readiness",
            `${Math.max(
              0,
              Math.min(100, metrics.readiness)
            )}%`,
          ],
          [
            "Completed",
            String(metrics.completed),
          ],
          [
            "Days Left",
            String(metrics.targetDays),
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-white/10 bg-black/25 p-3 text-center"
          >
            <div className="text-xl font-black text-white">
              {value}
            </div>
            <div className="mt-1 text-[8px] font-black uppercase tracking-[0.13em] text-slate-500">
              {label}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
          <span>Trajectory</span>
          <span>
            {metrics.probability}%
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-700 to-emerald-300 shadow-[0_0_18px_rgba(0,245,106,0.35)]"
            style={{
              width: `${metrics.probability}%`,
            }}
          />
        </div>
      </div>

      <div className="mt-5">
        <div className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-300">
          Milestones
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {milestones.map((milestone, index) => (
            <div
              key={milestone.id}
              className="rounded-2xl border border-white/10 bg-black/25 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-black text-white">
                  {index + 1}. {milestone.label}
                </div>
                <div className="text-[9px] font-black text-emerald-300">
                  {milestone.date}
                </div>
              </div>
              <div className="mt-2 text-[11px] leading-5 text-slate-400">
                {milestone.detail}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
        <div className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-300">
          Next Best Action
        </div>
        <div className="mt-2 text-sm font-bold leading-6 text-white">
          {metrics.adherence < 70
            ? "Complete the next scheduled workout and log every working set."
            : metrics.painCount > 0
            ? "Review active pain before training and use the approved safer target."
            : "Continue the current plan and complete the next scheduled milestone."}
        </div>
      </div>

      {published ? (
        <div className="mt-4 rounded-2xl border border-emerald-300/25 bg-emerald-300/10 px-4 py-3 text-xs font-black text-emerald-100">
          Health summary published to the shared SYNC
          context.
        </div>
      ) : null}

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={saveGoal}
          className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-white"
        >
          Save Goal
        </button>

        <button
          type="button"
          onClick={() => onOpen?.("progress")}
          className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-white"
        >
          Open Full Progress
        </button>

        <button
          type="button"
          onClick={publishToSync}
          className="h-12 rounded-2xl border border-emerald-300/60 bg-emerald-400 text-sm font-black text-black"
        >
          Publish to SYNC
        </button>
      </div>

      <div className="mt-3 text-[10px] leading-5 text-slate-500">
        Probability is a coaching estimate based on
        available logged data. It is not a guarantee or a
        medical prediction.
      </div>
    </section>
  );
}
