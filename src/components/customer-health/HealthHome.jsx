// src/components/customer-health/HealthHome.jsx
import React, {
  useMemo,
  useState,
} from "react";
import { Headphones } from "lucide-react";

import {
  speakCoachText,
} from "./healthCoachVoice";
import { buildGoalAnalysis } from "./healthGoalEngine";
import DailyMetricProgressCard from "./DailyMetricProgressCard";
import HealthVoiceSettingsDrawer from "./HealthVoiceSettingsDrawer";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(
    String(value ?? "").replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function findTodayWorkout(weekPlan = []) {
  const today = new Date();
  const ymd = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  return (
    (Array.isArray(weekPlan) ? weekPlan : []).find(
      (item) =>
        item?.ymd === ymd &&
        item?.workout_name &&
        item?.status !== "Completed"
    ) || null
  );
}

function findNextWorkout(weekPlan = []) {
  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime();

  return [...(Array.isArray(weekPlan) ? weekPlan : [])]
    .filter(
      (item) =>
        item?.workout_name &&
        !["Completed", "Skipped"].includes(item?.status)
    )
    .map((item) => ({
      ...item,
      dayTime: new Date(
        `${item.ymd || "2099-01-01"}T12:00:00`
      ).getTime(),
    }))
    .filter(
      (item) =>
        Number.isFinite(item.dayTime) &&
        item.dayTime > todayStart
    )
    .sort((a, b) => a.dayTime - b.dayTime)[0] || null;
}

function workoutDateLabel(item) {
  if (!item?.ymd) return "Upcoming";
  const date = new Date(`${item.ymd}T12:00:00`);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
    : "Upcoming";
}
function startOfCurrentWeek() {
  const today = new Date();
  const start = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const day = start.getDay();
  const distance = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - distance);
  return start.getTime();
}

function findMissedWorkout(weekPlan = []) {
  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime();
  const weekStart = startOfCurrentWeek();

  return [...(Array.isArray(weekPlan) ? weekPlan : [])]
    .filter(
      (item) =>
        item?.workout_name &&
        ![
          "Completed",
          "Skipped",
          "Rescheduled",
        ].includes(item?.status)
    )
    .map((item) => ({
      ...item,
      dayTime: new Date(
        `${item.ymd || "2099-01-01"}T12:00:00`
      ).getTime(),
    }))
    .filter(
      (item) =>
        Number.isFinite(item.dayTime) &&
        item.dayTime >= weekStart &&
        item.dayTime < todayStart
    )
    .sort((a, b) => b.dayTime - a.dayTime)[0] || null;
}

function getWeeklyAdherence(weekPlan = []) {
  const weekStart = startOfCurrentWeek();
  const items = (Array.isArray(weekPlan) ? weekPlan : [])
    .map((item) => ({
      ...item,
      dayTime: new Date(
        `${item?.ymd || "2099-01-01"}T12:00:00`
      ).getTime(),
    }))
    .filter(
      (item) =>
        item?.workout_name &&
        Number.isFinite(item.dayTime) &&
        item.dayTime >= weekStart
    );

  return {
    completed: items.filter(
      (item) => item.status === "Completed"
    ).length,
    skipped: items.filter(
      (item) => item.status === "Skipped"
    ).length,
    unresolved: items.filter(
      (item) =>
        ![
          "Completed",
          "Skipped",
          "Rescheduled",
        ].includes(item.status) &&
        item.dayTime < new Date().setHours(0, 0, 0, 0)
    ).length,
  };
}

function listToSpeech(items = []) {
  if (!items.length) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${
    items[items.length - 1]
  }`;
}

function MetricButton({
  label,
  value,
  goal,
  suffix = "",
  missing,
  tone,
  onClick,
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
    slate:
      "border-white/10 bg-white/[0.035] text-slate-200",
  };

  const percent =
    goal > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              (safeNumber(value) / safeNumber(goal, 1)) *
                100
            )
          )
        )
      : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "health-secondary-action min-w-0 rounded-2xl border p-3 text-left transition active:scale-[0.99]",
        tones[tone] || tones.slate
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="truncate text-[9px] font-black uppercase tracking-[0.14em] opacity-80">
          {label}
        </div>

        {missing ? (
          <span className="h-2 w-2 shrink-0 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.85)]" />
        ) : null}
      </div>

      <div className="mt-1 truncate text-lg font-black text-white">
        {value || "-"}
        {value ? suffix : ""}
      </div>

      {goal ? (
        <>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/30">
            <div
              className="h-full rounded-full bg-current opacity-80"
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="mt-1 text-[10px] opacity-70">
            Goal {goal}
            {suffix}
          </div>
        </>
      ) : (
        <div className="mt-1 text-[10px] opacity-70">
          Tap to log
        </div>
      )}
    </button>
  );
}

function QuickAction({
  title,
  subtitle,
  tone = "cyan",
  onClick,
}) {
  const tones = {
    cyan:
      "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
    lime:
      "border-lime-300/25 bg-lime-300/10 text-lime-100",
    fuchsia:
      "border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-100",
    amber:
      "border-amber-300/25 bg-amber-300/10 text-amber-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "health-secondary-action rounded-2xl border p-4 text-left transition active:scale-[0.99]",
        tones[tone] || tones.cyan
      )}
    >
      <div className="text-sm font-black">
        {title}
      </div>

      <div className="mt-1 text-xs leading-5 text-slate-400">
        {subtitle}
      </div>
    </button>
  );
}

function LogDataMenu({
  open,
  onClose,
  onOpen,
  onQuickLog,
}) {
  if (!open) return null;

  const groups = [
    {
      title: "Daily Health",
      items: [
        ["Weight / BMI", "quick:weight"],
        ["Steps", "quick:steps"],
        ["Sleep", "quick:sleep"],
        ["Readiness / pain", "quick:readiness"],
      ],
    },
    {
      title: "Nutrition",
      items: [
        ["Meal", "quick:meal"],
        ["Protein", "quick:protein"],
        ["Calories", "quick:calories"],
        ["Water", "quick:water"],
      ],
    },
    {
      title: "Training",
      items: [
        ["Plan workout with coach", "plan-today"],
        ["Past workout", "workout-history"],
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/75 p-3 backdrop-blur-md sm:items-center">
      <button
        type="button"
        aria-label="Close log data"
        onClick={onClose}
        className="absolute inset-0"
      />

      <section className="relative z-[121] max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-[2rem] border border-cyan-300/20 bg-[#07111f] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.7)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">
              Universal Health Log
            </div>

            <h3 className="mt-1 text-2xl font-black text-white">
              What would you like to log?
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-400">
              Add today's data or open the detailed logger
              for a past date.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] font-black text-white"
          >
            âœ•
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {groups.map((group) => (
            <div key={group.title}>
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                {group.title}
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {group.items.map(([label, target]) => (
                  <button
                    key={`${group.title}-${label}`}
                    type="button"
                    onClick={() => {
                      onClose();

                      if (target.startsWith("quick:")) {
                        onQuickLog?.(
                          target.replace("quick:", "")
                        );
                        return;
                      }

                      onOpen?.(target);
                    }}
                    className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-left text-sm font-black text-slate-100 transition hover:bg-white/[0.07]"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function HealthHome({
  profile,
  snapshot,
  history,
  progressLogs,
  onOpen,
  onStartWorkout,
  onShowInsights,
  onQuickLog,
  onResolveMissedWorkout,
  onEditDailyGoals,
}) {
  const [logMenuOpen, setLogMenuOpen] =
    useState(false);
  const [workoutChoiceOpen, setWorkoutChoiceOpen] =
    useState(false);
  const [voiceSettingsOpen, setVoiceSettingsOpen] =
    useState(false);

  const [audioEnabled, setAudioEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("syncworks_health_audio_enabled") !== "false";
  });

  const todayWorkout = useMemo(
    () => findTodayWorkout(snapshot?.week_plan),
    [snapshot?.week_plan]
  );

  const nextWorkout = useMemo(
    () => findNextWorkout(snapshot?.week_plan),
    [snapshot?.week_plan]
  );

  const recommendedWorkout = todayWorkout || nextWorkout;

  const missedWorkout = useMemo(
    () => findMissedWorkout(snapshot?.week_plan),
    [snapshot?.week_plan]
  );

  const missingItems = useMemo(() => {
    const items = [];

    if (!snapshot?.steps) items.push("steps");
    if (!snapshot?.water) items.push("water");
    if (!snapshot?.protein_today) items.push("protein");
    if (!snapshot?.calories) items.push("calories or meals");
    if (
      !snapshot?.last_sleep_hours &&
      !snapshot?.sleep_hours
    ) {
      items.push("sleep");
    }

    if (!snapshot?.weight && !profile?.weight) {
      items.push("weight");
    }

    return items;
  }, [snapshot, profile]);

  const weeklyAdherence = useMemo(
    () => getWeeklyAdherence(snapshot?.week_plan),
    [snapshot?.week_plan]
  );

  const configuredCoachAudioMode =
    snapshot?.coach_audio_mode ||
    (snapshot?.audible_trainer_enabled
      ? "essential"
      : "off");

  const coachAudioMode = audioEnabled
    ? configuredCoachAudioMode === "off"
      ? "essential"
      : configuredCoachAudioMode
    : "off";

  function updateAudioEnabled(nextValue) {
    const next = Boolean(nextValue);

    setAudioEnabled(next);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "syncworks_health_audio_enabled",
        String(next)
      );
    }
  }

  const voicePreference =
    snapshot?.coach_voice_preference || "female";

  const firstName =
    profile?.first_name ||
    profile?.name ||
    "";

  const dailyBrief = useMemo(() => {
    const greeting = firstName
      ? `Good morning, ${firstName}.`
      : "Good morning.";

    const sleep = safeNumber(
      snapshot?.last_sleep_hours ||
        snapshot?.sleep_hours,
      0
    );

    const sleepLine = sleep
      ? `You logged ${sleep} hours of sleep.`
      : "Sleep has not been logged yet.";

    const planLine = todayWorkout?.workout_name
      ? `Today's planned workout is ${todayWorkout.workout_name}.`
      : "There is no workout scheduled for today.";

    const missingLine = missingItems.length
      ? `Please log your ${listToSpeech(
          missingItems
        )}.`
      : "Your daily health logging is up to date.";

    const adherenceLine =
      weeklyAdherence.skipped >= 3
        ? `You skipped ${weeklyAdherence.skipped} workouts this week. It is time to rebuild momentum with one focused session.`
        : weeklyAdherence.skipped > 0
        ? `You have ${weeklyAdherence.skipped} skipped workout${
            weeklyAdherence.skipped === 1 ? "" : "s"
          } this week. Let us keep moving forward today.`
        : weeklyAdherence.completed > 0
        ? `You have completed ${weeklyAdherence.completed} workout${
            weeklyAdherence.completed === 1 ? "" : "s"
          } this week with no skips. Keep building on that consistency.`
        : "A fresh week is ready. Let us create momentum today.";

    const missedLine = missedWorkout?.workout_name
      ? `You still need to resolve the missed ${missedWorkout.workout_name} session.`
      : "";

    return [
      greeting,
      sleepLine,
      planLine,
      missingLine,
      adherenceLine,
      missedLine,
    ]
      .filter(Boolean)
      .join(" ");
  }, [
    firstName,
    snapshot?.last_sleep_hours,
    snapshot?.sleep_hours,
    todayWorkout?.workout_name,
    missingItems,
    weeklyAdherence.completed,
    weeklyAdherence.skipped,
    missedWorkout?.workout_name,
  ]);


  const intakeComplete =
    !!profile?.health_intake_completed_at;

  const goalAnalysis = useMemo(
    () => buildGoalAnalysis({ profile, snapshot, progressLogs, history }),
    [profile, snapshot, progressLogs, history]
  );

  function runGoalAction() {
    const target = goalAnalysis.todayAction.action;
    if (target.startsWith("quick:")) {
      onQuickLog?.(target.replace("quick:", ""));
      return;
    }
    onOpen?.(target);
  }

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[1.7rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_34%),radial-gradient(circle_at_top_right,rgba(57,255,136,0.10),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.96))] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.32)] sm:rounded-[2.2rem] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">
              SYNC Trainer Command Center
            </div>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-5xl">
              {firstName ? `Ready when you are, ${firstName}` : "Ready when you are"}
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              {todayLabel()} Â· Readiness{" "}
              {snapshot?.readiness || "not logged"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setVoiceSettingsOpen(true)}
              aria-label="Open coaching voice settings"
              title="Coaching voice settings"
              className={cx(
                "flex h-11 w-11 items-center justify-center rounded-2xl border",
                audioEnabled
                  ? "border-cyan-300/30 bg-cyan-300/12 text-cyan-100"
                  : "border-white/10 bg-white/[0.04] text-slate-400"
              )}
            >
              <span className="relative flex h-6 w-6 items-center justify-center">
                <Headphones size={19} />
                {!audioEnabled ? (
                  <span
                    aria-hidden="true"
                    className="absolute h-0.5 w-7 -rotate-45 rounded-full bg-current"
                  />
                ) : null}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                speakCoachText({
                  text: dailyBrief,
                  audioMode:
                    coachAudioMode === "off"
                      ? "essential"
                      : coachAudioMode,
                  voicePreference,
                  rate: 1,
                  pitch: 1,
                  volume: 1,
                })
              }
              className="h-11 rounded-2xl border border-fuchsia-300/25 bg-fuchsia-300/10 px-4 text-sm font-black text-fuchsia-100"
            >
              Coach Me Today
            </button>

            <button
              type="button"
              onClick={() => onOpen?.("workout-history")}
              className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-slate-100"
            >
              Workout History
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-lime-300/20 bg-lime-300/[0.07] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-lime-200">
                SYNC Recommended Plan
              </div>

              <div className="mt-1 text-2xl font-black text-white">
                {recommendedWorkout?.workout_name ||
                  "Choose how you want to move today"}
              </div>

              <div className="mt-1 text-sm leading-6 text-slate-400">
                {recommendedWorkout
                  ? `${todayWorkout ? "Today" : workoutDateLabel(recommendedWorkout)} - ${
                      recommendedWorkout.time || "Anytime"
                    } - ${
                      recommendedWorkout.adaptive_reason ||
                      recommendedWorkout.note ||
                      "Recommended from your recent training balance, readiness, and recovery."
                    }`
                  : "Your coach can suggest a session, or you can choose a focus, cardio activity, or build your own workout."}
              </div>
            </div>

            <div className="shrink-0 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-black text-cyan-100">
              One plan. Your choice. Full guidance.
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() =>
                recommendedWorkout
                  ? onStartWorkout?.(recommendedWorkout)
                  : onOpen?.("plan-today")
              }
              className="h-12 rounded-2xl border border-lime-300/30 bg-lime-300/15 text-sm font-black text-lime-100 shadow-[0_0_28px_rgba(57,255,136,0.12)]"
            >
              {todayWorkout
                ? "Review and Start"
                : nextWorkout
                ? "Preview or Start Early"
                : "Build Today's Plan"}
            </button>

            <button
              type="button"
              onClick={() => setWorkoutChoiceOpen(true)}
              className="h-12 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-sm font-black text-cyan-100"
            >
              Choose Your Training Path
            </button>

            <button
              type="button"
              onClick={() => onOpen?.("coach-chat")}
              className="h-12 rounded-2xl border border-fuchsia-300/25 bg-fuchsia-300/10 text-sm font-black text-fuchsia-100"
            >
              Talk to SYNC
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[1.7rem] border border-cyan-300/20 bg-white/[0.035] p-4 sm:rounded-[2rem] sm:p-5">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
          Current Training Mission
        </div>
        <div className="mt-2 text-2xl font-black text-white">
          {profile?.body_goal || profile?.primary_goal || "Build a stronger, healthier body"}
        </div>
        <div className="mt-2 text-sm leading-6 text-slate-400">
          {profile?.goal_detail ||
            "SYNC will connect each workout, recovery decision, and daily habit to your current goal."}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {profile?.target_weight ? (
            <span className="rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1.5 text-xs font-black text-lime-100">
              Target {profile.target_weight} lb
            </span>
          ) : null}
          {profile?.goal_target_date ? (
            <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-1.5 text-xs font-black text-fuchsia-100">
              Target date {profile.goal_target_date}
            </span>
          ) : null}
          {profile?.sport ? (
            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-xs font-black text-amber-100">
              Training for {profile.sport}
            </span>
          ) : null}
        </div>
      </section>
      <section className="rounded-[1.7rem] border border-fuchsia-300/20 bg-white/[0.035] p-4 sm:rounded-[2rem] sm:p-5">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-200">Goal Progress</div>
            <div className="mt-1 text-2xl font-black text-white">{goalAnalysis.currentWeight || "-"} to {goalAnalysis.targetWeight || "-"} lb</div>
            <div className="mt-1 text-sm leading-6 text-slate-400">
              Target {goalAnalysis.targetDateLabel} - Projected {goalAnalysis.projectedDateLabel}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Projection uses {goalAnalysis.projectionSource}.
            </div>
            {goalAnalysis.paceWarning ? (
              <div className="mt-2 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-bold text-amber-100">
                {goalAnalysis.paceWarning}
              </div>
            ) : null}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-white">{goalAnalysis.status}</div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-[9px] font-black uppercase text-slate-500">Remaining</div><div className="mt-1 text-lg font-black text-white">{goalAnalysis.targetWeight ? `${goalAnalysis.remainingWeight.toFixed(1)} lb` : "-"}</div></div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-[9px] font-black uppercase text-slate-500">Needed pace</div><div className="mt-1 text-lg font-black text-white">{goalAnalysis.requiredWeeklyRate ? `${Math.abs(goalAnalysis.requiredWeeklyRate).toFixed(2)}/wk` : "-"}</div></div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-[9px] font-black uppercase text-slate-500">BMI now</div><div className="mt-1 text-lg font-black text-white">{goalAnalysis.currentBmi ? goalAnalysis.currentBmi.toFixed(1) : "-"}</div></div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-[9px] font-black uppercase text-slate-500">Goal BMI</div><div className="mt-1 text-lg font-black text-white">{goalAnalysis.targetBmi ? goalAnalysis.targetBmi.toFixed(1) : "-"}</div></div>
        </div>
        <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.07] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">Today's Best Move</div>
          <div className="mt-1 text-lg font-black text-white">{goalAnalysis.todayAction.title}</div>
          <div className="mt-1 text-sm leading-6 text-slate-400">{goalAnalysis.todayAction.detail}</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={runGoalAction} className="h-11 rounded-xl border border-cyan-300/30 bg-cyan-300/15 text-xs font-black text-cyan-100">{goalAnalysis.todayAction.button}</button>
            <button type="button" onClick={() => onOpen?.("goal-center")} className="h-11 rounded-xl border border-fuchsia-300/25 bg-fuchsia-300/10 text-xs font-black text-fuchsia-100">View or Adjust Goal</button>
          </div>
        </div>
      </section>

      <HealthVoiceSettingsDrawer
        open={voiceSettingsOpen}
        onClose={() => setVoiceSettingsOpen(false)}
        audioEnabled={audioEnabled}
        onAudioEnabledChange={updateAudioEnabled}
      />

      {workoutChoiceOpen ? (
        <div className="fixed inset-0 z-[125] flex items-end justify-center bg-black/80 p-3 backdrop-blur-md sm:items-center">
          <button
            type="button"
            aria-label="Close training path choices"
            onClick={() => setWorkoutChoiceOpen(false)}
            className="absolute inset-0"
          />

          <section className="relative z-[126] max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-cyan-300/20 bg-[#07111f] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.72)] sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
                  Your Training. Your Choice.
                </div>
                <h2 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                  How do you want to train?
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Let SYNC design and schedule the full plan, or build your own workouts while the AI coach tracks, guides, and progresses you.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setWorkoutChoiceOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] font-black text-white"
              >
                X
              </button>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  window.localStorage.setItem(
                    "sw_health_training_path",
                    JSON.stringify({
                      mode: "ai_designed",
                      created_at: new Date().toISOString(),
                    })
                  );
                  setWorkoutChoiceOpen(false);
                  onOpen?.("questionnaire");
                }}
                className="group rounded-[1.6rem] border border-lime-300/30 bg-[radial-gradient(circle_at_top_left,rgba(57,255,136,0.18),transparent_42%),linear-gradient(145deg,rgba(20,83,45,0.38),rgba(2,6,23,0.92))] p-5 text-left shadow-[0_18px_45px_rgba(0,0,0,0.28)] transition hover:border-lime-300/50"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="rounded-full border border-lime-300/25 bg-lime-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-lime-100">
                    Recommended
                  </div>
                  <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">
                    AI
                  </div>
                </div>

                <div className="mt-4 text-2xl font-black text-white">
                  Have AI Coach Design My Plan
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Tell SYNC your goals, experience, schedule, equipment, nutrition, cardio preferences, injuries, and preferred workout time. The coach builds and schedules the plan for you.
                </p>

                <div className="mt-4 space-y-2">
                  {[
                    "Strength, cardio, mobility, stretching, and recovery",
                    "Exact workout days and preferred start time",
                    "Nutrition, weight, sets, reps, and progress connected",
                    "Automatic adjustments as your body and performance change",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-2 text-xs leading-5 text-lime-50/90"
                    >
                      <span className="mt-0.5 text-lime-300">Ã¢Å“â€œ</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex h-12 items-center justify-center rounded-2xl border border-lime-300/35 bg-lime-300/18 text-sm font-black text-lime-100">
                  Build My Personalized Plan
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  window.localStorage.setItem(
                    "sw_health_training_path",
                    JSON.stringify({
                      mode: "self_directed",
                      created_at: new Date().toISOString(),
                    })
                  );
                  window.localStorage.setItem(
                    "sw_health_library_builder_intent",
                    JSON.stringify({
                      mode: "builder",
                      focus: "custom",
                      label: "Custom Workout",
                      created_at: new Date().toISOString(),
                    })
                  );
                  setWorkoutChoiceOpen(false);
                  onOpen?.("exercise-library");
                }}
                className="group rounded-[1.6rem] border border-cyan-300/25 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_42%),linear-gradient(145deg,rgba(8,47,73,0.42),rgba(2,6,23,0.92))] p-5 text-left shadow-[0_18px_45px_rgba(0,0,0,0.28)] transition hover:border-cyan-300/45"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">
                    Full Control
                  </div>
                  <div className="text-2xl">Ã¯Â¼â€¹</div>
                </div>

                <div className="mt-4 text-2xl font-black text-white">
                  Build My Own + Follow With AI Coach
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Choose your exercises, sets, reps, weights, cardio, and schedule. SYNC stays with you as the tracker, training partner, and progression coach.
                </p>

                <div className="mt-4 space-y-2">
                  {[
                    "Create gym, home, travel, or sport-specific workouts",
                    "Duplicate, edit, schedule, and reuse every workout",
                    "AI recommendations for weight, sets, reps, and recovery",
                    "Beginner guidance or advanced hard-training control",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-2 text-xs leading-5 text-cyan-50/90"
                    >
                      <span className="mt-0.5 text-cyan-300">Ã¢Å“â€œ</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex h-12 items-center justify-center rounded-2xl border border-cyan-300/35 bg-cyan-300/15 text-sm font-black text-cyan-100">
                  Open Workout Builder
                </div>
              </button>
            </div>

            <div className="mt-5 rounded-[1.4rem] border border-fuchsia-300/20 bg-fuchsia-300/[0.06] p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-fuchsia-200">
                AI Coaching Is Included Either Way
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-300">
                SYNC uses your nutrition, body weight, completed sets, reps, cardio, recovery, pain, and progress to help move you toward your goal. Beginners get more guidance. Experienced lifters, bodybuilders, and athletes get more control and harder progression.
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => {
                  setWorkoutChoiceOpen(false);
                  onOpen?.("cardio-player");
                }}
                className="h-11 rounded-2xl border border-amber-300/20 bg-amber-300/10 text-xs font-black text-amber-100"
              >
                Start Cardio Now
              </button>

              <button
                type="button"
                onClick={() => {
                  setWorkoutChoiceOpen(false);
                  onOpen?.("workout");
                }}
                className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] text-xs font-black text-slate-200"
              >
                View My Workouts
              </button>

              <button
                type="button"
                onClick={() => {
                  setWorkoutChoiceOpen(false);
                  onOpen?.("coach-chat");
                }}
                className="h-11 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/10 text-xs font-black text-fuchsia-100"
              >
                Ask SYNC First
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {!intakeComplete ? (
        <section className="rounded-[1.5rem] border border-amber-300/25 bg-amber-300/[0.08] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">
            Personalization Setup
          </div>

          <div className="mt-1 text-xl font-black text-white">
            Help your coach understand your body
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Add your starting weight, goals, injuries,
            surgeries, health conditions, and movement
            restrictions. This is completed once and can
            be updated later.
          </p>

          <button
            type="button"
            onClick={() => onOpen?.("profile-intake")}
            className="mt-3 h-11 rounded-2xl border border-amber-300/30 bg-amber-300/15 px-4 text-sm font-black text-amber-100"
          >
            Complete Health Profile
          </button>
        </section>
      ) : null}

      {missedWorkout ? (
        <section className="rounded-[1.5rem] border border-rose-300/20 bg-rose-300/[0.07] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-200">
            Missed Workout
          </div>

          <div className="mt-1 text-xl font-black text-white">
            {missedWorkout.workout_name}
          </div>

          <p className="mt-1 text-sm leading-6 text-slate-400">
            This session was planned for{" "}
            {missedWorkout.day_label ||
              missedWorkout.ymd}. Choose what should
            happen next.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                onResolveMissedWorkout?.(
                  missedWorkout,
                  "today"
                )
              }
              className="h-11 rounded-2xl border border-lime-300/25 bg-lime-300/10 text-sm font-black text-lime-100"
            >
              Do It Today
            </button>

            <button
              type="button"
              onClick={() =>
                onResolveMissedWorkout?.(
                  missedWorkout,
                  "completed"
                )
              }
              className="h-11 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-sm font-black text-cyan-100"
            >
              Mark Completed
            </button>

            <button
              type="button"
              onClick={() =>
                onResolveMissedWorkout?.(
                  missedWorkout,
                  "skipped"
                )
              }
              className="h-11 rounded-2xl border border-amber-300/25 bg-amber-300/10 text-sm font-black text-amber-100"
            >
              Skip Workout
            </button>

            <button
              type="button"
              onClick={() =>
                onResolveMissedWorkout?.(
                  missedWorkout,
                  "reschedule"
                )
              }
              className="h-11 rounded-2xl border border-fuchsia-300/25 bg-fuchsia-300/10 text-sm font-black text-fuchsia-100"
            >
              Reschedule
            </button>
          </div>
        </section>
      ) : null}

      <DailyMetricProgressCard
        snapshot={snapshot}
        onQuickLog={onQuickLog}
        onShowInsights={onShowInsights}
        onEditGoals={onEditDailyGoals}
      />

      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
              Daily Actions
            </div>

            <div className="mt-1 text-xl font-black text-white">
              Keep today simple
            </div>
          </div>

          <button
            type="button"
            onClick={() => setLogMenuOpen(true)}
            className="h-11 rounded-2xl border border-cyan-300/30 bg-cyan-300/15 px-5 text-sm font-black text-cyan-100"
          >
            + Log Data
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <QuickAction
            title="Log Data"
            subtitle="Weight, meals, water, steps, sleep, readiness, or a past workout."
            tone="cyan"
            onClick={() => setLogMenuOpen(true)}
          />

          <QuickAction
            title="Ask Coach"
            subtitle="Get a decision, adjustment, explanation, or plan."
            tone="fuchsia"
            onClick={() => onOpen?.("coach-chat")}
          />


        </div>
      </section>

      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">
              Today's Check-In
            </div>

            <div className="mt-1 text-xl font-black text-white">
              {missingItems.length
                ? `${missingItems.length} useful updates remaining`
                : "You're up to date"}
            </div>

            <p className="mt-1 text-sm leading-6 text-slate-400">
              {missingItems.length
                ? "A few quick entries help your coach personalize today without overwhelming you."
                : "Your coach has enough information to guide today's plan."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setLogMenuOpen(true)}
            className="shrink-0 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-black text-amber-100"
          >
            Log Missing
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <MetricButton
            label="Steps"
            value={snapshot?.steps}
            goal={snapshot?.step_goal}
            missing={!snapshot?.steps}
            tone="cyan"
            onClick={() => onQuickLog?.("steps")}
          />

          <MetricButton
            label="Protein"
            value={snapshot?.protein_today}
            goal={snapshot?.protein_goal}
            suffix="g"
            missing={!snapshot?.protein_today}
            tone="lime"
            onClick={() => onQuickLog?.("protein")}
          />

          <MetricButton
            label="Water"
            value={snapshot?.water}
            goal={snapshot?.water_goal}
            suffix="oz"
            missing={!snapshot?.water}
            tone="cyan"
            onClick={() => onQuickLog?.("water")}
          />

          <MetricButton
            label="Calories"
            value={snapshot?.calories}
            goal={snapshot?.calorie_goal}
            missing={!snapshot?.calories}
            tone="fuchsia"
            onClick={() => onQuickLog?.("calories")}
          />

          <MetricButton
            label="Sleep"
            value={
              snapshot?.last_sleep_hours ||
              snapshot?.sleep_hours
            }
            suffix="h"
            missing={
              !snapshot?.last_sleep_hours &&
              !snapshot?.sleep_hours
            }
            tone="amber"
            onClick={() => onQuickLog?.("sleep")}
          />

          <MetricButton
            label="Weight"
            value={
              snapshot?.weight ||
              profile?.weight
            }
            suffix=" lb"
            missing={
              !snapshot?.weight &&
              !profile?.weight
            }
            tone="slate"
            onClick={() => onQuickLog?.("weight")}
          />
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-200">
              Coach Update
            </div>

            <div className="mt-1 text-lg font-black text-white">
              {snapshot?.last_coach_change_title ||
                "Your plan is ready to learn from you"}
            </div>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
              {snapshot?.last_coach_change_reason ||
                "Complete your profile and log today's key data. SyncWorks will explain every important adjustment instead of changing your plan silently."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpen?.("coach-chat")}
            className="h-11 shrink-0 rounded-2xl border border-fuchsia-300/25 bg-fuchsia-300/10 px-4 text-sm font-black text-fuchsia-100"
          >
            Review With Coach
          </button>
        </div>
      </section>

      <LogDataMenu
        open={logMenuOpen}
        onClose={() => setLogMenuOpen(false)}
        onOpen={onOpen}
        onQuickLog={onQuickLog}
      />
    </div>
  );
}
