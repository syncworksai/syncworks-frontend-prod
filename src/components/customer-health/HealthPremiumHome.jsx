// src/components/customer-health/HealthPremiumHome.jsx
import React, { useMemo, useState } from "react";
import HealthDailyCoachStatusCard from "./HealthDailyCoachStatusCard";
import HealthGoalProgressCard from "./HealthGoalProgressCard";
import RecoveryReadinessCard from "./RecoveryReadinessCard";
import HealthProgressControlCenter from "./HealthProgressControlCenter";
import HealthAthleteProfileCard from "./HealthAthleteProfileCard";
import {
  adaptWorkoutForRecovery,
  buildRecoveryAnalysis,
} from "./healthRecoveryEngine";
import {
  speakCoachText,
  stopCoachVoice,
} from "./healthCoachVoice";

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

function firstName(profile) {
  return String(
    profile?.first_name || profile?.name || ""
  ).trim();
}

function findTodayWorkout(weekPlan = []) {
  return (Array.isArray(weekPlan) ? weekPlan : []).find(
    (item) =>
      item?.ymd === todayYmd() &&
      item?.workout_name &&
      item?.status !== "Completed"
  );
}

function findNextWorkout(weekPlan = []) {
  const todayStart = new Date().setHours(0, 0, 0, 0);

  return [...(Array.isArray(weekPlan) ? weekPlan : [])]
    .filter(
      (item) =>
        item?.workout_name &&
        !["Completed", "Skipped"].includes(item?.status)
    )
    .map((item) => ({
      ...item,
      timeValue: new Date(
        `${item?.ymd || "2099-01-01"}T12:00:00`
      ).getTime(),
    }))
    .filter(
      (item) =>
        Number.isFinite(item.timeValue) &&
        item.timeValue >= todayStart
    )
    .sort((a, b) => a.timeValue - b.timeValue)[0];
}

function findUnfinishedWorkout(snapshot) {
  const candidates = [
    snapshot?.active_workout,
    snapshot?.workout_in_progress,
    snapshot?.incomplete_workout,
    snapshot?.last_incomplete_workout,
  ];

  const direct = candidates.find(
    (item) => item && typeof item === "object"
  );
  if (direct) return direct;

  const plan = Array.isArray(snapshot?.week_plan)
    ? snapshot.week_plan
    : [];

  return plan.find(
    (item) =>
      item?.workout_name &&
      ["In Progress", "Started", "Incomplete"].includes(
        item?.status
      )
  );
}

function totalSets(workout) {
  if (!workout) return 0;
  if (Array.isArray(workout.exercises)) {
    return workout.exercises.reduce(
      (sum, exercise) =>
        sum +
        safeNumber(
          exercise?.sets || exercise?.planned_sets,
          0
        ),
      0
    );
  }
  return safeNumber(workout?.total_sets || workout?.sets, 0);
}

function Icon({ type, className = "h-5 w-5" }) {
  const common = {
    viewBox: "0 0 24 24",
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (type === "play") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
        <path d="m8 5 11 7-11 7V5Z" />
      </svg>
    );
  }

  if (type === "sync") {
    return (
      <svg {...common}>
        <path d="M20 12a8 8 0 1 1-2.34-5.66" />
        <path d="M20 4v6h-6" />
      </svg>
    );
  }

  if (type === "arrow") {
    return (
      <svg {...common}>
        <path d="M5 12h14" />
        <path d="m14 7 5 5-5 5" />
      </svg>
    );
  }

  return null;
}

function CompactMetric({ label, value, detail, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.025] px-3 py-3 text-left active:scale-[0.99]"
    >
      <div className="truncate text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 truncate text-lg font-black text-white">
        {value}
      </div>
      <div className="mt-0.5 truncate text-[9px] text-slate-500">
        {detail}
      </div>
    </button>
  );
}

export default function HealthPremiumHome({
  profile,
  snapshot,
  history,
  onOpen,
  onStartWorkout,
  onShowInsights,
  onQuickLog,
  onEditDailyGoals,
  onCoachUpdate,
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [audioStatus, setAudioStatus] = useState("");

  const unfinishedWorkout = useMemo(
    () => findUnfinishedWorkout(snapshot),
    [snapshot]
  );

  const todayWorkout = useMemo(
    () => findTodayWorkout(snapshot?.week_plan),
    [snapshot?.week_plan]
  );

  const nextWorkout = useMemo(
    () => findNextWorkout(snapshot?.week_plan),
    [snapshot?.week_plan]
  );

  const recoveryAnalysis = useMemo(
    () => buildRecoveryAnalysis({ history, snapshot }),
    [history, snapshot]
  );

  const plannedWorkout = useMemo(
    () =>
      adaptWorkoutForRecovery(
        todayWorkout || nextWorkout,
        recoveryAnalysis
      ),
    [todayWorkout, nextWorkout, recoveryAnalysis]
  );

  const workout = unfinishedWorkout || plannedWorkout;
  const isResume = Boolean(unfinishedWorkout);
  const name = firstName(profile);

  const exerciseCount = Array.isArray(workout?.exercises)
    ? workout.exercises.length
    : safeNumber(workout?.exercise_count, 0);

  const completedExercises = safeNumber(
    workout?.completed_exercises ||
      workout?.exercise_index ||
      workout?.current_exercise_index,
    0
  );

  const duration = safeNumber(
    workout?.duration_minutes ||
      workout?.requested_duration_minutes,
    45
  );

  const protein = safeNumber(
    snapshot?.protein_today || snapshot?.protein,
    0
  );
  const proteinGoal = safeNumber(
    snapshot?.protein_goal || profile?.protein_goal,
    136
  );
  const steps = safeNumber(snapshot?.steps, 0);
  const stepsGoal = safeNumber(
    profile?.step_goal || snapshot?.step_goal,
    10000
  );
  const sleep = safeNumber(
    snapshot?.last_sleep_hours || snapshot?.sleep_hours,
    0
  );
  const sleepGoal = safeNumber(
    profile?.sleep_goal_hours || snapshot?.sleep_goal_hours,
    7.5
  );
  const readiness = safeNumber(
    snapshot?.readiness_score ||
      snapshot?.readiness ||
      snapshot?.daily_readiness,
    0
  );

  const briefing = isResume
    ? `You have an unfinished workout. ${workout?.workout_name || "Your workout"} is ready to resume.`
    : workout
    ? `${workout?.workout_name || "Today's workout"} is ready. You have ${exerciseCount || "your planned"} exercises and about ${duration} minutes scheduled.`
    : "You do not have a workout scheduled yet. Build a plan and SYNC will guide you through it.";

  function startPrimaryWorkout() {
    if (workout) {
      onStartWorkout?.(workout);
      return;
    }
    onOpen?.("plan-today");
  }

  async function handleSync() {
    setSyncOpen((value) => !value);
    setAudioStatus("Playing briefing...");

    try {
      stopCoachVoice();
      await speakCoachText({
        text: briefing,
        audioMode: "essential",
        voicePreference: "australian",
        rate: 0.96,
        pitch: 1,
        volume: 1,
        cancelFirst: true,
        eventType: "health_home_action_first_sync",
        browserFallback: true,
      });
      setAudioStatus("Briefing played");
    } catch (error) {
      console.warn("Unable to play the SYNC briefing:", error);
      setAudioStatus("Audio blocked. Tap SYNC again.");
    }
  }

  return (
    <div className="space-y-3 pb-4">
      <section className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(145deg,rgba(12,18,14,0.98),rgba(2,5,3,0.99))] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">
              Health Home
            </div>
            <h1 className="mt-1 truncate text-xl font-black text-white">
              {name ? `Ready, ${name}?` : "Ready to train?"}
            </h1>
          </div>

          <button
            type="button"
            onClick={handleSync}
            className="flex h-11 shrink-0 items-center gap-2 rounded-2xl border border-emerald-300/45 bg-emerald-300/[0.09] px-4 text-xs font-black text-emerald-100"
          >
            <Icon type="sync" className="h-4 w-4" />
            SYNC
          </button>
        </div>

        {syncOpen ? (
          <div className="mt-3 rounded-2xl border border-emerald-300/18 bg-emerald-300/[0.05] p-3">
            <div className="text-xs leading-5 text-emerald-50">
              {briefing}
            </div>
            {audioStatus ? (
              <div className="mt-2 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-300/80">
                {audioStatus}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className={`relative overflow-hidden rounded-[1.85rem] border p-4 shadow-[0_20px_60px_rgba(0,0,0,0.38)] ${
        isResume
          ? "border-amber-300/30 bg-[linear-gradient(145deg,rgba(28,20,5,0.97),rgba(7,5,2,0.99))]"
          : "border-emerald-300/25 bg-[linear-gradient(145deg,rgba(8,18,11,0.98),rgba(2,5,3,0.99))]"
      }`}>
        <div className={`text-[9px] font-black uppercase tracking-[0.18em] ${
          isResume ? "text-amber-200" : "text-emerald-300"
        }`}>
          {isResume ? "Workout Not Finished" : "Today's Workout"}
        </div>

        <div className="mt-1 text-2xl font-black leading-tight text-white">
          {workout?.workout_name || "Build Today's Plan"}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold text-slate-400">
          {isResume ? (
            <span>
              {completedExercises || 0} of {exerciseCount || "-"} exercises complete
            </span>
          ) : (
            <>
              <span>{exerciseCount || "-"} exercises</span>
              <span>{totalSets(workout) || "-"} sets</span>
              <span>{duration} min</span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={startPrimaryWorkout}
          className="mt-4 flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-emerald-300/45 bg-emerald-300 text-sm font-black uppercase tracking-[0.08em] text-black shadow-[0_0_28px_rgba(57,255,136,0.16)]"
        >
          {isResume
            ? "Resume Workout"
            : workout
            ? "Start Workout"
            : "Build Workout"}
          <Icon type="play" className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => onOpen?.("plan-today")}
          className="mt-2 h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] text-[10px] font-black uppercase tracking-[0.12em] text-slate-300"
        >
          {isResume ? "Update Previous Workout" : "Change Workout"}
        </button>
      </section>

      <section className="grid grid-cols-4 gap-2">
        <CompactMetric
          label="Protein"
          value={`${protein}g`}
          detail={`${Math.max(0, proteinGoal - protein)}g left`}
          onClick={() => onQuickLog?.("meal")}
        />
        <CompactMetric
          label="Steps"
          value={steps.toLocaleString()}
          detail={`${Math.max(0, stepsGoal - steps).toLocaleString()} left`}
          onClick={() => onQuickLog?.("steps")}
        />
        <CompactMetric
          label="Sleep"
          value={sleep ? `${sleep}h` : "Log"}
          detail={`${sleepGoal}h goal`}
          onClick={() => onQuickLog?.("sleep")}
        />
        <CompactMetric
          label="Ready"
          value={readiness || "Log"}
          detail="Today"
          onClick={() => onQuickLog?.("readiness")}
        />
      </section>

      <button
        type="button"
        onClick={() => setShowDetails((value) => !value)}
        className="flex h-11 w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.025] px-4 text-xs font-black text-white"
      >
        <span>{showDetails ? "Hide Details" : "Progress, Profile and More"}</span>
        <span className={showDetails ? "rotate-90" : ""}>
          <Icon type="arrow" className="h-4 w-4" />
        </span>
      </button>

      {showDetails ? (
        <div className="space-y-3">
          <HealthDailyCoachStatusCard
            profile={profile}
            snapshot={snapshot}
            onOpen={onOpen}
            onQuickLog={onQuickLog}
            onEditDailyGoals={onEditDailyGoals}
          />

          <RecoveryReadinessCard
            snapshot={snapshot}
            history={history}
            analysis={recoveryAnalysis}
            onOpen={onOpen}
            onQuickLog={onQuickLog}
          />

          <HealthGoalProgressCard
            profile={profile}
            snapshot={snapshot}
            history={history}
            onOpen={onOpen}
            onShowInsights={onShowInsights}
          />

          <HealthProgressControlCenter
            history={history}
            snapshot={snapshot}
            onOpen={onOpen}
            onShowInsights={onShowInsights}
          />

          <HealthAthleteProfileCard
            profile={profile}
            snapshot={snapshot}
            onCoachUpdate={onCoachUpdate}
            onOpen={onOpen}
          />
        </div>
      ) : null}
    </div>
  );
}
