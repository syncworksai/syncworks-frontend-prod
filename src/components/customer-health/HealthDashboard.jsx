// src/components/customer-health/HealthDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";

import HealthMomentumCard from "./HealthMomentumCard";
import HealthKpiSection from "./HealthKpiSection";
import HealthProgressCharts from "./HealthProgressCharts";
import SleepPlanCard from "./SleepPlanCard";
import HealthCoachIntelligenceCard from "./HealthCoachIntelligenceCard";
import AdaptiveNextWorkoutCard from "./AdaptiveNextWorkoutCard";
import CardioProgressCard from "./CardioProgressCard";

import {
  clampPercent,
  cx,
  prettyDate,
  readinessSuggestion,
  safeNumber,
} from "./healthStorage";

import { formatSeconds } from "./healthWorkoutSession";

import {
  countWorkoutsThisWeek,
  getWeekPlanBounds,
  isWeekPlanCurrent,
  isWeekPlanExpired,
  isWeekPlanFuture,
  localYmd,
  summarizeWeekPlan,
} from "./healthDailyLifecycle";

const SEEQ_AFFILIATE_URL = "https://www.seeqsupply.com/JACOB78279";

const WEWARD_AFFILIATE_URL =
  "https://wewardapp.go.link/profile?adj_t=1rg2xpwh&userId=22865998";

const QUOTES = [
  "Consistency beats intensity you can't repeat.",
  "You do not need a perfect week. You need to win today.",
  "Short workout beats a skipped workout.",
  "Momentum matters more than motivation.",
  "Hit the protein. Hit the steps. The body follows.",
  "Train for the goal, not just the mood.",
];

function formatTodayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function Card({ className = "", children }) {
  return (
    <section
      className={cx(
        "rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-3 shadow-[0_10px_36px_rgba(0,0,0,0.18)] sm:rounded-[1.75rem] sm:p-4",
        className
      )}
    >
      {children}
    </section>
  );
}

function StatPill({ label, value, tone = "cyan" }) {
  const toneMap = {
    cyan:
      "border-cyan-500/25 bg-cyan-500/10 text-cyan-100",
    emerald:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",
    amber:
      "border-amber-500/25 bg-amber-500/10 text-amber-100",
    fuchsia:
      "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-100",
  };

  return (
    <div
      className={cx(
        "rounded-2xl border px-3 py-2",
        toneMap[tone] || toneMap.cyan
      )}
    >
      <div className="text-[10px] font-black uppercase tracking-[0.18em] opacity-80">
        {label}
      </div>

      <div className="mt-1 text-sm font-black">
        {value}
      </div>
    </div>
  );
}

function ProgressBar({
  label,
  value,
  goal,
  suffix = "",
  tone = "cyan",
}) {
  const pct =
    goal > 0
      ? clampPercent((value / goal) * 100)
      : 0;

  const barTone = {
    cyan: "from-cyan-400 to-blue-500",
    emerald: "from-emerald-400 to-cyan-500",
    amber: "from-amber-400 to-orange-500",
    fuchsia: "from-fuchsia-400 to-purple-500",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
          {label}
        </div>

        <div className="text-sm font-black text-white">
          {value}
          {suffix} / {goal}
          {suffix}
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-900">
        <div
          className={cx(
            "h-full rounded-full bg-gradient-to-r",
            barTone[tone] || barTone.cyan
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 text-[11px] text-slate-500">
        {pct}% complete
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  tone = "cyan",
  className = "",
}) {
  const toneMap = {
    cyan:
      "border-cyan-500/25 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20",
    emerald:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20",
    amber:
      "border-amber-500/25 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20",
    fuchsia:
      "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-100 hover:bg-fuchsia-500/20",
    white:
      "border-white/10 bg-white/[0.04] text-slate-100 hover:bg-white/[0.08]",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex h-11 items-center justify-center rounded-2xl border px-4 text-sm font-black transition active:scale-[0.99]",
        toneMap[tone] || toneMap.cyan,
        className
      )}
    >
      {label}
    </button>
  );
}

function nextPlannedSession(weekPlan = []) {
  const safeWeekPlan = Array.isArray(weekPlan)
    ? weekPlan
    : [];

  const today = new Date();

  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime();

  return [...safeWeekPlan]
    .filter((item) => item?.workout_name)
    .filter((item) => item?.status !== "Completed")
    .map((item) => ({
      ...item,
      sortTime: new Date(
        `${item.ymd || "2099-01-01"}T${
          item.time || "23:59"
        }:00`
      ).getTime(),
    }))
    .filter((item) => item.sortTime >= startOfToday)
    .sort((a, b) => a.sortTime - b.sortTime)[0];
}

function buildGoogleCalendarLink(item) {
  if (!item?.ymd || !item?.workout_name) {
    return "#";
  }

  const start = new Date(
    `${item.ymd}T${item.time || "09:00"}:00`
  );

  const durationMinutes = Math.max(
    15,
    safeNumber(item.duration_minutes || 60)
  );

  const end = new Date(
    start.getTime() + durationMinutes * 60 * 1000
  );

  function fmt(date) {
    const pad = (value) =>
      String(value).padStart(2, "0");

    return (
      `${date.getUTCFullYear()}` +
      `${pad(date.getUTCMonth() + 1)}` +
      `${pad(date.getUTCDate())}` +
      `T${pad(date.getUTCHours())}` +
      `${pad(date.getUTCMinutes())}` +
      `${pad(date.getUTCSeconds())}Z`
    );
  }

  const params = new URLSearchParams();

  params.set("action", "TEMPLATE");
  params.set("text", item.workout_name);

  params.set(
    "details",
    `SyncWorks Health Planner | ${
      item.note || "Workout session"
    }`
  );

  params.set(
    "dates",
    `${fmt(start)}/${fmt(end)}`
  );

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function QuickAction({ icon, label, detail, tone = "cyan", onClick }) {
  const toneMap = {
    cyan: "border-cyan-400/25 bg-cyan-400/[0.08] text-cyan-100 hover:bg-cyan-400/[0.14] shadow-[0_0_30px_rgba(34,211,238,0.08)]",
    emerald: "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-100 hover:bg-emerald-400/[0.14] shadow-[0_0_30px_rgba(57,255,136,0.08)]",
    fuchsia: "border-fuchsia-400/25 bg-fuchsia-400/[0.08] text-fuchsia-100 hover:bg-fuchsia-400/[0.14] shadow-[0_0_30px_rgba(255,59,212,0.08)]",
    violet: "border-violet-400/25 bg-violet-400/[0.08] text-violet-100 hover:bg-violet-400/[0.14] shadow-[0_0_30px_rgba(139,92,255,0.08)]",
    amber: "border-amber-400/25 bg-amber-400/[0.08] text-amber-100 hover:bg-amber-400/[0.14] shadow-[0_0_30px_rgba(255,200,87,0.08)]",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "group min-w-0 rounded-[1.25rem] border p-3 text-left transition active:scale-[0.985] sm:p-4",
        toneMap[tone] || toneMap.cyan
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-xl transition group-hover:scale-105">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-black text-white">{label}</div>
          <div className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-400">
            {detail}
          </div>
        </div>
      </div>
    </button>
  );
}

function WeekLifecycleCard({
  weekPlan,
  history,
  onOpen,
  onBuildNextWeek,
  onRepeatLastWeek,
}) {
  const expired = isWeekPlanExpired(weekPlan);
  const current = isWeekPlanCurrent(weekPlan);
  const future = isWeekPlanFuture(weekPlan);
  const bounds = getWeekPlanBounds(weekPlan);
  const summary = summarizeWeekPlan(weekPlan, history);
  const missing = !Array.isArray(weekPlan) || weekPlan.length === 0;

  if (!expired && !missing) {
    return (
      <Card className="relative overflow-hidden border-cyan-400/20 bg-[linear-gradient(135deg,rgba(34,211,238,0.08),rgba(3,7,18,0.88),rgba(139,92,246,0.08))]">
        <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
                {current ? "Current Training Week" : future ? "Upcoming Week" : "Training Plan"}
              </span>
              {bounds.hasDates ? (
                <span className="text-xs font-bold text-slate-400">
                  {prettyDate(bounds.startYmd)} - {prettyDate(bounds.endYmd)}
                </span>
              ) : null}
            </div>
            <div className="mt-2 text-lg font-black text-white">
              {summary.completed_sessions}/{summary.planned_sessions || 0} planned workouts complete
            </div>
            <div className="mt-1 text-sm text-slate-400">
              Keep the week editable. The coach can adjust volume, focus, or recovery at any time.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton label="Adjust With Coach" onClick={() => onOpen?.("coach-chat")} tone="fuchsia" />
            <ActionButton label="Edit Week" onClick={() => onOpen?.("planner")} tone="cyan" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-fuchsia-400/30 bg-[linear-gradient(135deg,rgba(255,59,212,0.12),rgba(3,7,18,0.92),rgba(52,223,255,0.12))] shadow-[0_0_50px_rgba(139,92,246,0.12)]">
      <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-20 h-52 w-52 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="relative">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-fuchsia-300/30 bg-fuchsia-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-100">
                {expired ? "Week Complete" : "Plan Needed"}
              </span>
              {expired && bounds.hasDates ? (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
                  {prettyDate(bounds.startYmd)} - {prettyDate(bounds.endYmd)}
                </span>
              ) : null}
            </div>

            <h2 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
              {expired ? "Your last plan ended. Let's build the next week." : "Build a training week that fits your life."}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {expired
                ? `You completed ${summary.completed_sessions} of ${summary.planned_sessions || 0} planned sessions. Preserve the results, then repeat, adapt, or rebuild with your coach.`
                : "Choose your days, goals, equipment, and limitations. The coach will turn them into a dated seven-day plan."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:min-w-[300px]">
            <StatPill label="Completed" value={summary.completed_sessions || 0} tone="emerald" />
            <StatPill label="Planned" value={summary.planned_sessions || 0} tone="cyan" />
            <StatPill label="Skipped" value={summary.skipped_sessions || 0} tone="amber" />
            <StatPill label="Consistency" value={`${summary.completion_rate || 0}%`} tone="fuchsia" />
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <ActionButton
            label={expired ? "Build My Next Week" : "Build My Week"}
            onClick={() => {
              if (typeof onBuildNextWeek === "function") {
                onBuildNextWeek();
              } else {
                onOpen?.("coach-chat");
              }
            }}
            tone="emerald"
            className="shadow-[0_0_34px_rgba(57,255,136,0.15)]"
          />
          {expired ? (
            <ActionButton
              label="Repeat Last Week"
              onClick={() => {
                if (typeof onRepeatLastWeek === "function") {
                  onRepeatLastWeek();
                } else {
                  onOpen?.("planner");
                }
              }}
              tone="cyan"
            />
          ) : null}
          <ActionButton label="Adjust With Coach" onClick={() => onOpen?.("coach-chat")} tone="fuchsia" />
          <ActionButton label="Review Planner" onClick={() => onOpen?.("planner")} tone="white" />
        </div>
      </div>
    </Card>
  );
}

function CoachChatStartCard({ snapshot, onOpen }) {
  const coachChat = Array.isArray(snapshot?.coach_chat)
    ? snapshot.coach_chat
    : [];

  const proposal =
    snapshot?.coach_plan_proposal || null;

  const hasPlannerProposal = !!proposal;

  const isAdded =
    proposal?.status === "added_to_planner";

  return (
    <Card className="relative overflow-hidden border-emerald-400/25 bg-gradient-to-br from-emerald-500/10 via-slate-950/70 to-cyan-500/10">
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100">
                Adaptive Coach
              </span>

              <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100">
                Coach Chat
              </span>

              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                Personal Plan
              </span>
            </div>

            <h2 className="mt-4 text-2xl font-black tracking-tight text-white md:text-3xl">
              Start with your fitness coach
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Tell the coach what you are chasing, where you train, how many
              days this week, pain or limits, and whether you want to be pushed
              or kept balanced.
            </p>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-2 sm:min-w-[260px]">
            <StatPill
              label="Messages"
              value={coachChat.length || 1}
              tone="cyan"
            />

            <StatPill
              label="Proposal"
              value={
                isAdded
                  ? "Added"
                  : hasPlannerProposal
                  ? "Ready"
                  : "None"
              }
              tone={
                isAdded
                  ? "emerald"
                  : hasPlannerProposal
                  ? "amber"
                  : "fuchsia"
              }
            />
          </div>
        </div>

        {proposal?.summary ? (
          <div className="mt-4 rounded-3xl border border-emerald-300/15 bg-black/25 p-4">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
              Latest Coach Summary
            </div>

            <div className="mt-2 text-sm leading-6 text-slate-200">
              {proposal.summary}
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-3xl border border-white/10 bg-black/25 p-4">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
              Example
            </div>

            <div className="mt-2 text-sm leading-6 text-slate-200">
              "Build a four-day plan for strength, athletic performance, and
              better recovery. Push me, but adjust around pain and sleep."
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <ActionButton
            label={
              hasPlannerProposal && !isAdded
                ? "Review Coach Plan"
                : "Chat With Coach"
            }
            onClick={() => onOpen("coach-chat")}
            tone="emerald"
            className="shadow-[0_0_30px_rgba(16,185,129,0.16)]"
          />

          <ActionButton
            label="Open Questionnaire"
            onClick={() => onOpen("questionnaire")}
            tone="white"
          />

          <ActionButton
            label="Open Planner"
            onClick={() => onOpen("planner")}
            tone="cyan"
          />
        </div>
      </div>
    </Card>
  );
}

function LastWorkoutStatsCard({ stats }) {
  if (!stats) return null;

  return (
    <Card className="border-emerald-500/20">
      <div className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200">
        Last Workout Stats
      </div>

      <div className="mt-2 text-xl font-black text-white">
        {stats.workout_name || "Completed Workout"}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatPill
          label="Total Time"
          value={formatSeconds(stats.total_seconds)}
          tone="cyan"
        />

        <StatPill
          label="Active Time"
          value={formatSeconds(stats.active_seconds)}
          tone="emerald"
        />

        <StatPill
          label="Rest Time"
          value={formatSeconds(stats.rest_seconds)}
          tone="amber"
        />

        <StatPill
          label="Sets"
          value={stats.completed_sets || 0}
          tone="fuchsia"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatPill
          label="Pain"
          value={stats.pain_score || "0"}
          tone="emerald"
        />

        <StatPill
          label="Difficulty"
          value={stats.difficulty_score || "Medium"}
          tone="cyan"
        />

        <StatPill
          label="Energy"
          value={stats.energy_score || "Good"}
          tone="amber"
        />

        <StatPill
          label="Skipped"
          value={stats.skipped_exercises || 0}
          tone="fuchsia"
        />
      </div>
    </Card>
  );
}

export default function HealthDashboard({
  profile,
  snapshot,
  workouts,
  history,
  progressLogs,
  devices,
  onOpen,
  onStartWorkout,
  onStartAdaptive,
  onOpenCardio,
  onBuildNextWeek,
  onRepeatLastWeek,
}) {
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setQuoteIndex(
        (previous) =>
          (previous + 1) % QUOTES.length
      );
    }, 7000);

    return () => window.clearInterval(timer);
  }, []);

  const stepGoal = safeNumber(
    snapshot?.step_goal || 8000
  );

  const steps = safeNumber(snapshot?.steps || 0);

  const calorieGoal = safeNumber(
    snapshot?.calorie_goal || 2200
  );

  const calories = safeNumber(
    snapshot?.calories || 0
  );

  const proteinGoal = safeNumber(
    snapshot?.protein_goal || 150
  );

  const protein = safeNumber(
    snapshot?.protein_today || 0
  );

  const waterGoal = safeNumber(
    snapshot?.water_goal || 100
  );

  const water = safeNumber(snapshot?.water || 0);

  const currentWeight = safeNumber(
    snapshot?.weight || profile?.weight || 0
  );

  const targetWeight = safeNumber(
    profile?.target_weight || 0
  );

  const trainingDaysGoal = Math.max(
    1,
    safeNumber(profile?.training_days || 3)
  );

  const weeklyCompleted = Math.max(
    0,
    countWorkoutsThisWeek(history)
  );

  const weekPlan = Array.isArray(snapshot?.week_plan)
    ? snapshot.week_plan
    : [];

  const plannedCount = weekPlan.filter(
    (item) =>
      item?.workout_name &&
      item?.status !== "Rest Day"
  ).length;

  const nextSession = useMemo(
    () => nextPlannedSession(weekPlan),
    [weekPlan]
  );

  const goalTitle =
    profile?.inspiration_goal ||
    profile?.primary_goal ||
    snapshot?.goal ||
    "General fitness";

  const coachMessage =
    snapshot?.last_coach_summary ||
    (snapshot?.readiness &&
    snapshot?.readiness !== "Moderate"
      ? readinessSuggestion(snapshot.readiness)
      : `You are training for ${goalTitle}. Win today by completing the next action, hitting protein, moving, and protecting recovery.`);

  const healthScore = clampPercent(
    clampPercent(
      (steps / Math.max(stepGoal, 1)) * 100
    ) *
      0.25 +
      clampPercent(
        (protein / Math.max(proteinGoal, 1)) * 100
      ) *
        0.3 +
      clampPercent(
        (weeklyCompleted /
          Math.max(trainingDaysGoal, 1)) *
          100
      ) *
        0.3 +
      (snapshot?.readiness === "Ready"
        ? 15
        : snapshot?.readiness === "Moderate"
        ? 10
        : snapshot?.readiness === "Recovery"
        ? 6
        : 3)
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      <AdaptiveNextWorkoutCard
        history={history}
        snapshot={snapshot}
        profile={profile}
        onOpen={onOpen}
      />

      <CardioProgressCard
        history={history}
        onOpenCardio={onOpenCardio}
        onOpenHistory={() =>
          onOpen?.("workout-history")
        }
      />

      <HealthCoachIntelligenceCard
        history={history}
        snapshot={snapshot}
        onOpen={onOpen}
      />

      <WeekLifecycleCard
        weekPlan={weekPlan}
        history={history}
        onOpen={onOpen}
        onBuildNextWeek={onBuildNextWeek}
        onRepeatLastWeek={onRepeatLastWeek}
      />

      <Card className="relative overflow-hidden border-blue-400/20 bg-[#050b18]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
        <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="relative">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">Health Command Center</div>
              <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">What do you want to do?</h2>
              <p className="mt-1 text-sm text-slate-400">Jump directly to training, planning, progress, or your exercise library.</p>
            </div>
            <div className="text-xs font-bold text-slate-500">One-tap navigation</div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            <QuickAction
              icon="▶"
              label="Start Workout"
              detail={nextSession?.workout_name || "Choose or build today's session"}
              tone="emerald"
              onClick={() => nextSession ? onStartWorkout?.(nextSession) : onOpen?.("workout")}
            />
            <QuickAction
              icon="＋"
              label="Build Workout"
              detail="Create and save your own sets"
              tone="cyan"
              onClick={() => onOpen?.("workout")}
            />
            <QuickAction
              icon="🦵"
              label="Train a Muscle"
              detail="Browse legs, chest, back, arms, and more"
              tone="fuchsia"
              onClick={() => onOpen?.("library")}
            />
            <QuickAction
              icon="⌕"
              label="Exercise Library"
              detail="Search movements and form guidance"
              tone="violet"
              onClick={() => onOpen?.("library")}
            />
            <QuickAction
              icon="↗"
              label="Progress"
              detail="Weight, workouts, strength, and trends"
              tone="amber"
              onClick={() => onOpen?.("progress")}
            />
            <QuickAction
              icon="◎"
              label="Profile"
              detail="Height, weight, goals, limits, equipment"
              tone="cyan"
              onClick={() => onOpen?.("questionnaire")}
            />
          </div>
        </div>
      </Card>

      <CoachChatStartCard
        snapshot={snapshot}
        onOpen={onOpen}
      />

      <SleepPlanCard
        profile={profile}
        snapshot={snapshot}
        onOpen={onOpen}
      />

      <Card className="relative overflow-hidden border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 via-slate-950/60 to-fuchsia-500/10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/4 h-64 w-64 rounded-full bg-fuchsia-500/15 blur-3xl" />

        <div className="relative">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100">
                  SyncWorks Health
                </span>

                <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-blue-100">
                  {formatTodayLabel()}
                </span>

                <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100">
                  {snapshot?.readiness || "Moderate"}
                </span>

                <span className="rounded-full border border-fuchsia-500/25 bg-fuchsia-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-100">
                  Trainer Loop
                </span>
              </div>

              <div className="mt-4 flex items-start gap-3 sm:items-center sm:gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl border border-cyan-400/25 bg-cyan-500/10 text-2xl sm:h-16 sm:w-16 sm:text-3xl">
                  🏋️
                </div>

                <div className="min-w-0">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                    Today's Mission | {localYmd()}
                  </div>

                  <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl md:text-4xl">
                    {nextSession?.workout_name ||
                      "Build momentum today"}
                  </h1>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                    Train for{" "}
                    <span className="font-bold text-white">
                      {goalTitle}
                    </span>
                    , stay on top of progress, and let
                    your logged data shape the next plan.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
                <StatPill
                  label="Goal"
                  value={goalTitle}
                  tone="emerald"
                />

                <StatPill
                  label="Weekly Workouts"
                  value={`${weeklyCompleted}/${trainingDaysGoal}`}
                  tone="cyan"
                />

                <StatPill
                  label="Health Score"
                  value={`${healthScore}/100`}
                  tone="amber"
                />

                <StatPill
                  label="Next Workout"
                  value={
                    nextSession
                      ? `${nextSession.day_label} ${
                          nextSession.time || ""
                        }`.trim()
                      : "Not scheduled"
                  }
                  tone="fuchsia"
                />
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-3 sm:p-4">
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Coach Message
                  </div>

                  <div className="mt-2 text-base font-black text-white sm:text-lg">
                    "{QUOTES[quoteIndex]}"
                  </div>

                  <div className="mt-2 text-sm leading-6 text-slate-300">
                    {coachMessage}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-3 sm:p-4">
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Next Planned Session
                  </div>

                  {nextSession ? (
                    <>
                      <div className="mt-2 text-lg font-black text-white">
                        {nextSession.workout_name}
                      </div>

                      <div className="mt-1 text-sm text-slate-300">
                        {prettyDate(nextSession.ymd)}  | {" "}
                        {nextSession.time || "Anytime"}
                      </div>

                      <div className="mt-1 text-sm text-slate-500">
                        {nextSession.note ||
                          "Planned workout"}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <ActionButton
                          label="Start Workout"
                          onClick={() =>
                            onStartWorkout?.(nextSession)
                          }
                          tone="emerald"
                        />

                        <ActionButton
                          label="Open Planner"
                          onClick={() => onOpen("planner")}
                        />

                        <a
                          href={buildGoogleCalendarLink(
                            nextSession
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-11 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 text-sm font-black text-emerald-100 transition hover:bg-emerald-500/20 active:scale-[0.99]"
                        >
                          Add to Calendar
                        </a>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mt-2 text-lg font-black text-white">
                        No workout scheduled yet
                      </div>

                      <div className="mt-2 text-sm leading-6 text-slate-400">
                        Build your week so SyncWorks can
                        connect training, recovery, and
                        daily lifestyle targets.
                      </div>

                      <div className="mt-4">
                        <ActionButton
                          label="Build Weekly Planner"
                          onClick={() => onOpen("planner")}
                          tone="emerald"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-5 hidden flex-wrap gap-2 lg:flex">
                <ActionButton
                  label="Chat With Coach"
                  onClick={() => onOpen("coach-chat")}
                  tone="emerald"
                />

                <ActionButton
                  label="Today's AI Plan"
                  onClick={() => onOpen("today")}
                />

                <ActionButton
                  label="Quick Log Workout"
                  onClick={() => onOpen("workout")}
                  tone="emerald"
                />

                <ActionButton
                  label="Log Steps"
                  onClick={() => onOpen("steps")}
                  tone="amber"
                />

                <ActionButton
                  label="Log Nutrition"
                  onClick={() => onOpen("nutrition")}
                  tone="fuchsia"
                />

                <ActionButton
                  label="Coach Report"
                  onClick={() => onOpen("coach")}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <LastWorkoutStatsCard
        stats={snapshot?.last_workout_stats}
      />

      <HealthProgressCharts
        profile={profile}
        snapshot={snapshot}
        history={history}
        progressLogs={progressLogs}
        onOpen={onOpen}
      />

      <HealthKpiSection
        history={history}
        snapshot={snapshot}
        profile={profile}
      />

      <HealthMomentumCard
        profile={profile}
        snapshot={snapshot}
        history={history}
        progressLogs={progressLogs}
        onOpen={onOpen}
      />

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Goal Snapshot
          </div>

          <div className="mt-2 text-lg font-black text-white sm:text-xl">
            See your progress at a glance
          </div>

          <div className="mt-1 text-sm text-slate-400">
            Every useful input should change today's
            recommendation or tomorrow's plan.
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <ProgressBar
              label="Steps"
              value={steps}
              goal={stepGoal}
              tone="cyan"
            />

            <ProgressBar
              label="Protein"
              value={protein}
              goal={proteinGoal}
              suffix="g"
              tone="emerald"
            />

            <ProgressBar
              label="Calories"
              value={calories}
              goal={calorieGoal}
              tone="amber"
            />

            <ProgressBar
              label="Water"
              value={water}
              goal={waterGoal}
              suffix=" oz"
              tone="fuchsia"
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3 sm:p-4">
              <div className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                Current Weight
              </div>

              <div className="mt-2 text-2xl font-black text-white">
                {currentWeight
                  ? `${currentWeight} lb`
                  : "-"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3 sm:p-4">
              <div className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                Target Weight
              </div>

              <div className="mt-2 text-2xl font-black text-white">
                {targetWeight
                  ? `${targetWeight} lb`
                  : "-"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3 sm:p-4">
              <div className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                Planned
              </div>

              <div className="mt-2 text-2xl font-black text-white">
                {plannedCount}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3 sm:p-4">
              <div className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                Progress Logs
              </div>

              <div className="mt-2 text-2xl font-black text-white">
                {progressLogs?.length || 0}
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-emerald-500/20">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200">
            Weekly Planner Preview
          </div>

          <div className="mt-2 text-lg font-black text-white sm:text-xl">
            This week
          </div>

          <div className="mt-1 text-sm text-slate-400">
            Today, tomorrow, and the next planned
            sessions.
          </div>

          <div className="mt-4 space-y-2">
            {weekPlan.length ? (
              weekPlan.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-3 sm:px-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-white">
                        {item.day_label}  | {" "}
                        {prettyDate(item.ymd)}
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        {item.workout_name ||
                          "Recovery / open day"}
                        {item.time
                          ? ` | ${item.time}`
                          : ""}
                      </div>

                      {item.source === "coach_chat" ? (
                        <div className="mt-2 w-fit rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100">
                          Coach Built
                        </div>
                      ) : null}
                    </div>

                    <div className="shrink-0 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">
                      {item.status || "Planned"}
                    </div>
                  </div>

                  {item.workout_name &&
                  item.status !== "Completed" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onStartWorkout?.(item)
                        }
                        className="inline-flex h-10 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3 text-xs font-black text-emerald-100 transition hover:bg-emerald-500/20 active:scale-[0.99]"
                      >
                        Start
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onOpen("planner")
                        }
                        className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-xs font-black text-slate-100 transition hover:bg-white/[0.08] active:scale-[0.99]"
                      >
                        Edit
                      </button>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-400">
                No week planned yet.
              </div>
            )}
          </div>

          <div className="mt-4 hidden flex-wrap gap-2 lg:flex">
            <ActionButton
              label="Open Planner"
              onClick={() => onOpen("planner")}
              tone="emerald"
            />

            <ActionButton
              label="Ask Coach"
              onClick={() => onOpen("coach-chat")}
              tone="cyan"
            />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Workout Studio
          </div>

          <div className="mt-2 text-lg font-black text-white">
            Build and log sessions
          </div>

          <div className="mt-2 text-sm leading-6 text-slate-400">
            Add exercises, sets, repetitions, weight,
            pain, effort, and timing.
          </div>

          <div className="mt-4 hidden lg:block">
            <ActionButton
              label="Open Workout Studio"
              onClick={() => onOpen("workout")}
              tone="cyan"
            />
          </div>
        </Card>

        <Card>
          <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Exercise Library
          </div>

          <div className="mt-2 text-lg font-black text-white">
            Pick movements by goal
          </div>

          <div className="mt-2 text-sm leading-6 text-slate-400">
            Choose movements by muscle group,
            equipment, target, and training need.
          </div>

          <div className="mt-4">
            <ActionButton
              label="Open Exercise Library"
              onClick={() => onOpen("library")}
              tone="fuchsia"
            />
          </div>
        </Card>

        <Card>
          <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Recovery / Devices
          </div>

          <div className="mt-2 text-lg font-black text-white">
            Connect the full picture
          </div>

          <div className="mt-2 text-sm leading-6 text-slate-400">
            Devices active: {devices?.length || 0}.
            Prepare for Apple Health, Fitbit, Garmin,
            and additional recovery data.
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <ActionButton
              label="Devices"
              onClick={() => onOpen("devices")}
              tone="amber"
            />

            <ActionButton
              label="Daily Synopsis"
              onClick={() => onOpen("synopsis")}
            />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-fuchsia-500/20">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-fuchsia-200">
            Partner Recommendation
          </div>

          <div className="mt-2 text-xl font-black text-white">
            Seeq Protein
          </div>

          <div className="mt-2 text-sm leading-6 text-slate-300">
            Helpful option for recovery and hitting
            daily protein targets.
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={SEEQ_AFFILIATE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-fuchsia-500/25 bg-fuchsia-500/10 px-4 text-sm font-black text-fuchsia-100 transition hover:bg-fuchsia-500/20 active:scale-[0.99]"
            >
              Shop Seeq
            </a>

            <button
              type="button"
              onClick={() => onOpen("nutrition")}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-slate-100 transition hover:bg-white/[0.08] active:scale-[0.99]"
            >
              Log Protein Goal
            </button>
          </div>
        </Card>

        <Card className="border-cyan-500/20">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">
            Step Motivation Partner
          </div>

          <div className="mt-2 text-xl font-black text-white">
            WeWard
          </div>

          <div className="mt-2 text-sm leading-6 text-slate-300">
            Add motivation to daily movement and step
            completion.
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={WEWARD_AFFILIATE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-4 text-sm font-black text-cyan-100 transition hover:bg-cyan-500/20 active:scale-[0.99]"
            >
              Explore WeWard
            </a>

            <button
              type="button"
              onClick={() => onOpen("steps")}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-slate-100 transition hover:bg-white/[0.08] active:scale-[0.99]"
            >
              Update Steps
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}