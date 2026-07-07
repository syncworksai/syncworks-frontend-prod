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
  runHealthStorageDiagnostics,
  runHealthWebRuntimeDiagnostics,
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

class HealthCardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      message: "",
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || "Something went wrong in this Health card.",
    };
  }

  componentDidCatch(error, info) {
    try {
      console.error("[SyncWorks Health card error]", {
        card: this.props.name,
        error,
        info,
      });
    } catch {
      // Keep the app running even if console logging is unavailable.
    }
  }

  reset = () => {
    this.setState({
      hasError: false,
      message: "",
    });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <Card className="border-rose-300/25 bg-rose-300/[0.06]">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-200">
          Health Card Recovery
        </div>

        <div className="mt-2 text-lg font-black text-white">
          {this.props.name || "This section"} needs a refresh
        </div>

        <div className="mt-2 text-sm leading-6 text-slate-300">
          SYNC caught a card-level issue before it could blank the whole Health dashboard.
        </div>

        <div className="mt-2 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs font-bold leading-5 text-slate-400">
          {this.state.message}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={this.reset}
            className="h-10 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-3 text-xs font-black text-cyan-100"
          >
            Retry Card
          </button>

          <button
            type="button"
            onClick={() => this.props.onOpen?.("coach-chat")}
            className="h-10 rounded-2xl border border-fuchsia-300/25 bg-fuchsia-300/10 px-3 text-xs font-black text-fuchsia-100"
          >
            Ask SYNC
          </button>
        </div>
      </Card>
    );
  }
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

function buildDailyAccountabilityLoop({
  snapshot,
  profile,
  weekPlan,
  history,
}) {
  const now = new Date();
  const hour = now.getHours();
  const quietStart = safeNumber(
    profile?.quiet_hours_start ??
      snapshot?.quiet_hours_start ??
      21
  );
  const quietEnd = safeNumber(
    profile?.quiet_hours_end ??
      snapshot?.quiet_hours_end ??
      7
  );

  const quiet =
    quietStart > quietEnd
      ? hour >= quietStart || hour < quietEnd
      : hour >= quietStart && hour < quietEnd;

  const steps = safeNumber(snapshot?.steps || 0);
  const stepGoal = safeNumber(snapshot?.step_goal || 8000);
  const protein = safeNumber(snapshot?.protein_today || 0);
  const proteinGoal = safeNumber(snapshot?.protein_goal || 150);
  const calories = safeNumber(snapshot?.calories || 0);
  const calorieGoal = safeNumber(snapshot?.calorie_goal || 2200);
  const water = safeNumber(snapshot?.water || 0);
  const waterGoal = safeNumber(snapshot?.water_goal || 100);
  const workoutsThisWeek = countWorkoutsThisWeek(history);
  const trainingGoal = Math.max(
    1,
    safeNumber(profile?.training_days || 3)
  );

  const today = localYmd();
  const todayPlan = (Array.isArray(weekPlan) ? weekPlan : []).find(
    (item) =>
      item?.ymd === today &&
      item?.workout_name &&
      item?.status !== "Completed" &&
      item?.status !== "Rest Day"
  );

  const tasks = [];

  if (todayPlan) {
    tasks.push({
      id: "workout",
      label: "Finish today's workout",
      detail: todayPlan.workout_name,
      tone: "emerald",
      action: "Start",
      open: "workout",
      priority: 1,
    });
  } else if (workoutsThisWeek < trainingGoal) {
    tasks.push({
      id: "planner",
      label: "Protect the next training slot",
      detail: `${workoutsThisWeek}/${trainingGoal} weekly workouts complete`,
      tone: "cyan",
      action: "Plan",
      open: "planner",
      priority: 2,
    });
  }

  if (proteinGoal > 0 && protein < proteinGoal) {
    tasks.push({
      id: "protein",
      label: "Protein still open",
      detail: `${Math.max(0, proteinGoal - protein)}g remaining today`,
      tone: "fuchsia",
      action: "Log meal",
      open: "nutrition-coach",
      priority: 3,
    });
  }

  if (stepGoal > 0 && steps < stepGoal) {
    tasks.push({
      id: "steps",
      label: "Steps need attention",
      detail: `${Math.max(0, stepGoal - steps).toLocaleString()} steps left`,
      tone: "amber",
      action: "Log steps",
      open: "steps",
      priority: 4,
    });
  }

  if (waterGoal > 0 && water < waterGoal * 0.75) {
    tasks.push({
      id: "water",
      label: "Hydration check",
      detail: `${Math.max(0, waterGoal - water)} oz remaining`,
      tone: "cyan",
      action: "Log",
      open: "quick-log",
      priority: 5,
    });
  }

  if (calorieGoal > 0 && calories <= 0 && hour >= 12) {
    tasks.push({
      id: "meal",
      label: "Meal log missing",
      detail: "No calories logged yet today",
      tone: "fuchsia",
      action: "Log food",
      open: "nutrition-coach",
      priority: 6,
    });
  }

  const recoveryFlag =
    snapshot?.readiness === "Recovery" ||
    snapshot?.sleep_quality === "Poor" ||
    safeNumber(snapshot?.pain_score || 0) >= 3;

  if (recoveryFlag) {
    tasks.push({
      id: "recovery",
      label: "Recovery guardrail",
      detail: "Keep intensity controlled and pain-free",
      tone: "amber",
      action: "Ask SYNC",
      open: "coach-chat",
      priority: 0,
    });
  }

  const sortedTasks = tasks
    .sort((left, right) => left.priority - right.priority)
    .slice(0, 4);

  const message = quiet
    ? "Quiet hours are active. SYNC will keep nudges soft and avoid aggressive reminders."
    : sortedTasks.length
    ? "SYNC found the next actions that keep today from slipping."
    : "Daily loop is clean. Maintain momentum and keep logging the basics.";

  return {
    quiet,
    quietLabel: `${quietStart}:00-${quietEnd}:00`,
    tasks: sortedTasks,
    message,
  };
}

function DailyAccountabilityLoopCard({
  snapshot,
  profile,
  weekPlan,
  history,
  onOpen,
  onStartWorkout,
}) {
  const loop = buildDailyAccountabilityLoop({
    snapshot,
    profile,
    weekPlan,
    history,
  });

  const toneMap = {
    cyan: "border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-100",
    emerald:
      "border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-100",
    fuchsia:
      "border-fuchsia-300/20 bg-fuchsia-300/[0.08] text-fuchsia-100",
    amber:
      "border-amber-300/20 bg-amber-300/[0.08] text-amber-100",
  };

  function runTask(task) {
    if (task.id === "workout" && onStartWorkout) {
      const today = localYmd();
      const planned = (Array.isArray(weekPlan) ? weekPlan : []).find(
        (item) =>
          item?.ymd === today &&
          item?.workout_name &&
          item?.status !== "Completed"
      );

      if (planned) {
        onStartWorkout(planned);
        return;
      }
    }

    onOpen?.(task.open);
  }

  return (
    <Card className="relative overflow-hidden border-lime-400/20 bg-[radial-gradient(circle_at_top_left,rgba(57,255,136,0.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(52,223,255,0.1),transparent_30%),linear-gradient(135deg,rgba(4,8,18,0.98),rgba(7,17,31,0.98))]">
      <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full bg-lime-400/10 blur-3xl" />
      <div className="relative flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-lime-200">
            SYNC Daily Accountability
          </div>

          <h3 className="mt-1 text-xl font-black text-white">
            Today's follow-up loop
          </h3>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
            {loop.message}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <div className="rounded-2xl border border-lime-300/20 bg-lime-300/10 px-3 py-2 text-center text-lime-100">
            <div className="text-[8px] font-black uppercase tracking-wider opacity-75">
              Open Items
            </div>
            <div className="mt-1 text-lg font-black">
              {loop.tasks.length}
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-center text-cyan-100">
            <div className="text-[8px] font-black uppercase tracking-wider opacity-75">
              Quiet
            </div>
            <div className="mt-1 text-lg font-black">
              {loop.quiet ? "On" : "Off"}
            </div>
          </div>
        </div>
      </div>

      <div className="relative mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {(loop.tasks.length
          ? loop.tasks
          : [
              {
                id: "clean",
                label: "Daily loop clean",
                detail: "No urgent gaps found right now.",
                tone: "emerald",
                action: "Open SYNC",
                open: "coach-chat",
              },
            ]
        ).map((task) => (
          <button
            key={task.id}
            type="button"
            onClick={() => runTask(task)}
            className={`rounded-2xl border p-3 text-left transition hover:scale-[1.01] active:scale-[0.99] ${
              toneMap[task.tone] || toneMap.cyan
            }`}
          >
            <div className="text-sm font-black text-white">
              {task.label}
            </div>
            <div className="mt-1 min-h-[2.25rem] text-xs font-bold leading-5 text-slate-300">
              {task.detail}
            </div>
            <div className="mt-3 inline-flex rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white">
              {task.action}
            </div>
          </button>
        ))}
      </div>

      <div className="relative mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs font-bold leading-5 text-slate-400">
        Quiet-hour window: {loop.quietLabel}. Browser push notifications are not enabled yet; this card creates the in-app reminder logic now so backend/push can attach to it later.
      </div>
    </Card>
  );
}
function MuscleTrainingSelectorCard({ onOpen }) {
  const [selectedArea, setSelectedArea] = useState("Chest");

  const areas = [
    { id: "Chest", side: "Front", x: "50%", y: "25%", tone: "rose", search: "chest", label: "Chest", detail: "Bench, fly, push-up" },
    { id: "Shoulders", side: "Front", x: "50%", y: "17%", tone: "amber", search: "shoulder", label: "Shoulders", detail: "Press, raise, stability" },
    { id: "Abs", side: "Front", x: "50%", y: "39%", tone: "cyan", search: "core", label: "Core / Abs", detail: "Brace, plank, control" },
    { id: "Quads", side: "Front", x: "50%", y: "64%", tone: "fuchsia", search: "leg", label: "Quads", detail: "Squat, leg press" },
    { id: "Hip Flexors", side: "Front", x: "50%", y: "50%", tone: "emerald", search: "hip", label: "Hips", detail: "Mobility, stability" },
    { id: "Lats", side: "Back", x: "50%", y: "31%", tone: "emerald", search: "lat", label: "Lats / Back", detail: "Pulldown, rows" },
    { id: "Traps", side: "Back", x: "50%", y: "18%", tone: "rose", search: "trap", label: "Traps", detail: "Shrug, posture" },
    { id: "Triceps", side: "Back", x: "50%", y: "28%", tone: "violet", search: "triceps", label: "Triceps", detail: "Pushdown, extension" },
    { id: "Glutes", side: "Back", x: "50%", y: "51%", tone: "amber", search: "glute", label: "Glutes", detail: "Bridge, hinge" },
    { id: "Hamstrings", side: "Back", x: "50%", y: "66%", tone: "fuchsia", search: "hamstring", label: "Hamstrings", detail: "Curl, RDL" },
  ];

  const selected = areas.find((area) => area.id === selectedArea) || areas[0];
  const frontAreas = areas.filter((area) => area.side === "Front");
  const backAreas = areas.filter((area) => area.side === "Back");

  function openLibrary(mode = "filter") {
    try {
      window.localStorage.setItem(
        "sw_health_library_builder_intent",
        JSON.stringify({
          mode: mode === "builder" ? "builder" : "filter",
          focus: selected.search,
          label: selected.label,
          muscle: selected.id,
          source: "dashboard_body_map",
          created_at: new Date().toISOString(),
        })
      );
    } catch {
      // The library can still open without saved intent.
    }

    onOpen?.("library");
  }

  function Marker({ area }) {
    const active = selected.id === area.id;
    const colorMap = {
      cyan: "border-cyan-300/70 bg-cyan-300/25 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.28)]",
      emerald: "border-emerald-300/70 bg-emerald-300/25 text-emerald-100 shadow-[0_0_24px_rgba(57,255,136,0.24)]",
      fuchsia: "border-fuchsia-300/70 bg-fuchsia-300/25 text-fuchsia-100 shadow-[0_0_24px_rgba(255,59,212,0.24)]",
      amber: "border-amber-300/70 bg-amber-300/25 text-amber-100 shadow-[0_0_24px_rgba(255,200,87,0.22)]",
      rose: "border-rose-300/70 bg-rose-300/25 text-rose-100 shadow-[0_0_24px_rgba(255,94,125,0.24)]",
      violet: "border-violet-300/70 bg-violet-300/25 text-violet-100 shadow-[0_0_24px_rgba(139,92,255,0.24)]",
    };

    return (
      <button
        type="button"
        onClick={() => setSelectedArea(area.id)}
        className={`absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[10px] font-black transition hover:scale-110 ${active ? colorMap[area.tone] || colorMap.cyan : "border-white/15 bg-white/[0.08] text-slate-300"}`}
        style={{ left: area.x, top: area.y }}
        aria-label={`Select ${area.label}`}
      >
        +
      </button>
    );
  }

  function BodyPanel({ title, children, points }) {
    return (
      <div className="relative min-h-[360px] overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(52,223,255,0.10),transparent_36%),linear-gradient(180deg,rgba(3,7,18,0.96),rgba(8,13,26,0.96))] p-3">
        <div className="mb-2 text-center text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
          {title}
        </div>
        <div className="relative mx-auto h-[315px] max-w-[170px]">
          {children}
          {points.map((area) => (
            <Marker key={area.id} area={area} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card className="relative overflow-hidden border-fuchsia-400/20 bg-[radial-gradient(circle_at_top_left,rgba(255,59,212,0.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(57,255,136,0.10),transparent_30%),linear-gradient(135deg,rgba(4,8,18,0.98),rgba(7,17,31,0.98))]">
      <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-fuchsia-500/10 blur-3xl" />
      <div className="relative flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-200">
            SYNC Muscle Map
          </div>
          <h3 className="mt-1 text-xl font-black text-white">
            Train by body part
          </h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
            Pick a muscle area, then jump straight into exercise suggestions or build a focused workout.
          </p>
        </div>

        <div className="rounded-2xl border border-lime-300/20 bg-lime-300/10 px-4 py-3 text-lime-100">
          <div className="text-[8px] font-black uppercase tracking-wider opacity-75">
            Selected
          </div>
          <div className="mt-1 text-lg font-black">
            {selected.label}
          </div>
        </div>
      </div>

      <div className="relative mt-4 grid gap-3 lg:grid-cols-[0.9fr_0.9fr_1.2fr]">
        <BodyPanel title="Front" points={frontAreas}>
          <div className="absolute left-1/2 top-2 h-12 w-12 -translate-x-1/2 rounded-full border border-cyan-300/35 bg-slate-950" />
          <div className="absolute left-1/2 top-16 h-32 w-24 -translate-x-1/2 rounded-[45%] border border-cyan-300/30 bg-cyan-300/[0.07]" />
          <div className="absolute left-7 top-20 h-28 w-8 rotate-12 rounded-full border border-cyan-300/25 bg-cyan-300/[0.05]" />
          <div className="absolute right-7 top-20 h-28 w-8 -rotate-12 rounded-full border border-cyan-300/25 bg-cyan-300/[0.05]" />
          <div className="absolute left-[54px] top-48 h-32 w-9 rotate-3 rounded-full border border-cyan-300/25 bg-cyan-300/[0.05]" />
          <div className="absolute right-[54px] top-48 h-32 w-9 -rotate-3 rounded-full border border-cyan-300/25 bg-cyan-300/[0.05]" />
        </BodyPanel>

        <BodyPanel title="Back" points={backAreas}>
          <div className="absolute left-1/2 top-2 h-12 w-12 -translate-x-1/2 rounded-full border border-fuchsia-300/35 bg-slate-950" />
          <div className="absolute left-1/2 top-16 h-32 w-24 -translate-x-1/2 rounded-[45%] border border-fuchsia-300/30 bg-fuchsia-300/[0.07]" />
          <div className="absolute left-7 top-20 h-28 w-8 rotate-12 rounded-full border border-fuchsia-300/25 bg-fuchsia-300/[0.05]" />
          <div className="absolute right-7 top-20 h-28 w-8 -rotate-12 rounded-full border border-fuchsia-300/25 bg-fuchsia-300/[0.05]" />
          <div className="absolute left-[54px] top-48 h-32 w-9 rotate-3 rounded-full border border-fuchsia-300/25 bg-fuchsia-300/[0.05]" />
          <div className="absolute right-[54px] top-48 h-32 w-9 -rotate-3 rounded-full border border-fuchsia-300/25 bg-fuchsia-300/[0.05]" />
        </BodyPanel>

        <div className="rounded-[2rem] border border-white/10 bg-black/20 p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
            Focus Area
          </div>
          <h4 className="mt-2 text-2xl font-black text-white">
            {selected.label}
          </h4>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-300">
            {selected.detail}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {areas.map((area) => (
              <button
                key={area.id}
                type="button"
                onClick={() => setSelectedArea(area.id)}
                className={`rounded-2xl border px-3 py-2 text-left text-xs font-black transition ${selected.id === area.id ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-100" : "border-white/10 bg-white/[0.03] text-slate-300"}`}
              >
                {area.label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <ActionButton
              label="Show Exercises"
              tone="cyan"
              onClick={() => openLibrary("filter")}
              className="w-full"
            />
            <ActionButton
              label="Build This Workout"
              tone="fuchsia"
              onClick={() => openLibrary("builder")}
              className="w-full"
            />
          </div>

          <button
            type="button"
            onClick={() => onOpen?.("library")}
            className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-slate-200"
          >
            Open Full Muscle Map
          </button>
        </div>
      </div>
    </Card>
  );
}
function HealthProductionQaPanel({
  snapshot,
  profile,
  weekPlan,
  history,
  progressLogs,
  devices,
  onOpen,
}) {
  const storageDiagnostics = runHealthStorageDiagnostics();
  const runtimeDiagnostics = runHealthWebRuntimeDiagnostics();

  function countArray(value) {
    return Array.isArray(value) ? value.length : 0;
  }

  const localStorageOk = !!storageDiagnostics?.ok;
  const historyCount = countArray(history);
  const weekPlanCount = countArray(weekPlan);
  const progressCount = countArray(progressLogs);
  const deviceCount = countArray(devices);
  const nutritionCount =
    countArray(snapshot?.nutrition_logs) +
    countArray(snapshot?.meal_logs) +
    countArray(snapshot?.meals);

  const profileReady =
    !!profile?.primary_goal ||
    !!profile?.inspiration_goal ||
    !!snapshot?.goal;

  const systems = [
    {
      label: "Local storage",
      ok: localStorageOk,
      detail: localStorageOk ? `Readable, writable, ${storageDiagnostics.totalBytes || 0} bytes tracked.` : `Storage issue: ${(storageDiagnostics.badKeys || []).join(", ") || storageDiagnostics.error || "Browser storage blocked."}`,
      action: "SYNC",
      open: "coach-chat",
    },
    {
      label: "Storage integrity",
      ok: (storageDiagnostics?.badKeys || []).length === 0,
      detail:
        (storageDiagnostics?.badKeys || []).length === 0
          ? `${(storageDiagnostics?.missingKeys || []).length} empty storage buckets, no corrupted JSON.`
          : `Corrupted: ${(storageDiagnostics?.badKeys || []).join(", ")}`,
      action: "SYNC",
      open: "coach-chat",
    },    {
      label: "Web beta runtime",
      ok: !!runtimeDiagnostics?.ok,
      detail:
        runtimeDiagnostics?.ok
          ? `${runtimeDiagnostics.host} is online and secure.`
          : `Runtime issue: ${(runtimeDiagnostics?.issues || []).join(", ") || "Needs review."}`,
      action: "SYNC",
      open: "coach-chat",
    },
    {
      label: "Browser visibility",
      ok: runtimeDiagnostics?.visibility === "visible",
      detail:
        runtimeDiagnostics?.visibility === "visible"
          ? "Health page is active in the browser."
          : `Current state: ${runtimeDiagnostics?.visibility || "unknown"}.`,
      action: "SYNC",
      open: "coach-chat",
      optional: true,
    },    {
      label: "Profile state",
      ok: profileReady,
      detail: profileReady ? "Goal/profile data present." : "Profile needs goal data.",
      action: "Profile",
      open: "questionnaire",
    },
    {
      label: "Week plan",
      ok: weekPlanCount > 0,
      detail: weekPlanCount > 0 ? `${weekPlanCount} plan items loaded.` : "No weekly plan loaded.",
      action: "Planner",
      open: "planner",
    },
    {
      label: "Workout memory",
      ok: historyCount > 0,
      detail: historyCount > 0 ? `${historyCount} saved sessions.` : "Finish one workout to seed memory.",
      action: "History",
      open: "workout-history",
    },
    {
      label: "Nutrition logs",
      ok: nutritionCount > 0 || !!snapshot?.protein_today || !!snapshot?.calories,
      detail:
        nutritionCount > 0
          ? `${nutritionCount} meal logs visible.`
          : "No meal logs visible yet.",
      action: "Log Meal",
      open: "nutrition-coach",
    },
    {
      label: "Progress logs",
      ok: progressCount > 0,
      detail: progressCount > 0 ? `${progressCount} progress logs.` : "No progress check-ins yet.",
      action: "Quick Log",
      open: "quick-log",
    },
    {
      label: "Device sync",
      ok: deviceCount > 0 || !!snapshot?.steps,
      detail:
        deviceCount > 0
          ? `${deviceCount} device record(s).`
          : snapshot?.steps
          ? "Step data visible."
          : "Device connection optional for beta.",
      action: "Progress",
      open: "progress",
      optional: true,
    },
    {
      label: "Card recovery",
      ok: true,
      detail: "Dashboard card safety net is active.",
      action: "SYNC",
      open: "coach-chat",
    },
    {
      label: "SYNC actions",
      ok: typeof onOpen === "function",
      detail:
        typeof onOpen === "function"
          ? "Dashboard actions are wired."
          : "Open handlers missing.",
      action: "Ask SYNC",
      open: "coach-chat",
    },
  ];

  const requiredSystems = systems.filter((item) => !item.optional);
  const passed = requiredSystems.filter((item) => item.ok).length;
  const qaScore = Math.round((passed / requiredSystems.length) * 100);
  const needsAttention = systems.filter((item) => !item.ok && !item.optional);

  return (
    <Card className="relative overflow-hidden border-emerald-300/20 bg-[linear-gradient(135deg,rgba(57,255,136,0.08),rgba(3,7,18,0.92),rgba(52,223,255,0.07))]">
      <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">
            Production QA
          </div>

          <h3 className="mt-1 text-xl font-black text-white">
            Health systems check
          </h3>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
            Use this before web beta invites. Green means the dashboard can read the data it needs in the browser.
          </p>
        </div>

        <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-center">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-100">
            QA Score
          </div>
          <div className="mt-1 text-3xl font-black text-white">
            {qaScore}%
          </div>
          <div className="mt-1 text-[11px] font-bold text-slate-300">
            {passed}/{requiredSystems.length} required passing
          </div>
        </div>
      </div>

      <div className="relative mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {systems.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onOpen?.(item.open)}
            className={cx(
              "rounded-2xl border p-3 text-left transition active:scale-[0.99]",
              item.ok
                ? "border-emerald-300/20 bg-emerald-300/[0.07] hover:bg-emerald-300/[0.11]"
                : item.optional
                ? "border-amber-300/20 bg-amber-300/[0.07] hover:bg-amber-300/[0.11]"
                : "border-rose-300/25 bg-rose-300/[0.07] hover:bg-rose-300/[0.11]"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-black text-white">
                  {item.ok ? "PASS" : item.optional ? "OPTIONAL" : "FIX"} | {item.label}
                </div>
                <div className="mt-1 text-xs font-bold leading-5 text-slate-400">
                  {item.detail}
                </div>
              </div>

              <div className="shrink-0 rounded-xl border border-white/10 bg-black/20 px-2 py-1 text-[10px] font-black text-slate-200">
                {item.action}
              </div>
            </div>
          </button>
        ))}
      </div>


      <div className="relative mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
              Storage Audit Details
            </div>
            <div className="mt-1 text-xs font-bold text-slate-400">
              {storageDiagnostics?.canWrite ? "Write test passed." : "Write test failed."} Checked {storageDiagnostics?.checkedAt ? new Date(storageDiagnostics.checkedAt).toLocaleTimeString() : "now"}.
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-black text-cyan-100">
            {storageDiagnostics?.totalBytes || 0} bytes
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {(storageDiagnostics?.keys || []).map((item) => (
            <div
              key={item.name}
              className={cx(
                "rounded-2xl border p-3",
                item.exists && !item.validJson
                  ? "border-rose-300/25 bg-rose-300/[0.07]"
                  : item.exists
                  ? "border-emerald-300/15 bg-emerald-300/[0.04]"
                  : "border-white/10 bg-white/[0.025]"
              )}
            >
              <div className="text-xs font-black uppercase tracking-[0.14em] text-white">
                {item.name}
              </div>
              <div className="mt-1 text-[11px] font-bold leading-5 text-slate-400">
                {item.exists ? `${item.type} | ${item.itemCount} items | ${item.bytes} bytes` : "Not created yet"}
              </div>
              {item.error ? (
                <div className="mt-1 text-[11px] font-bold text-rose-200">
                  {item.error}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="relative mt-4 rounded-2xl border border-blue-300/15 bg-blue-300/[0.045] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-200">
              Web Beta Runtime Details
            </div>
            <div className="mt-1 text-xs font-bold text-slate-400">
              Browser website check for beta testing before App Store work.
            </div>
          </div>

          <div className={cx(
            "rounded-2xl border px-3 py-2 text-xs font-black",
            runtimeDiagnostics?.ok
              ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
              : "border-amber-300/20 bg-amber-300/10 text-amber-100"
          )}>
            {runtimeDiagnostics?.ok ? "WEB OK" : "REVIEW"}
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Host", runtimeDiagnostics?.host || "unknown"],
            ["Protocol", runtimeDiagnostics?.protocol || "unknown"],
            ["Online", runtimeDiagnostics?.online ? "yes" : "no"],
            ["Secure", runtimeDiagnostics?.secureContext ? "yes" : "no"],
            ["Visibility", runtimeDiagnostics?.visibility || "unknown"],
            ["Viewport", `${runtimeDiagnostics?.viewport?.width || 0} x ${runtimeDiagnostics?.viewport?.height || 0}`],
            ["Timezone", runtimeDiagnostics?.timezone || "unknown"],
            ["Language", runtimeDiagnostics?.language || "unknown"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                {label}
              </div>
              <div className="mt-1 break-words text-xs font-black text-white">
                {value}
              </div>
            </div>
          ))}
        </div>

        {(runtimeDiagnostics?.issues || []).length > 0 ? (
          <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-3 text-xs font-bold leading-5 text-amber-100">
            {(runtimeDiagnostics?.issues || []).join(" | ")}
          </div>
        ) : null}
      </div>
      {needsAttention.length > 0 ? (
        <div className="relative mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-3 text-sm leading-6 text-amber-100">
          Next fix: {needsAttention[0].label}. Tap that QA row to jump to the right Health tool.
        </div>
      ) : (
        <div className="relative mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.07] p-3 text-sm leading-6 text-emerald-100">
          Required systems look beta-ready. Keep testing real workouts, meals, and progress logs before public launch.
        </div>
      )}
    </Card>
  );
}
function HealthBetaCleanlinessNote({ onOpen }) {
  return (
    <Card className="border-white/10 bg-white/[0.025] p-3 sm:hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
            Mobile Beta View
          </div>
          <div className="mt-1 text-sm font-black text-white">
            Start simple: workout, meal, steps, or SYNC.
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-400">
            Advanced cards stay lower on the page so testers can move faster.
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpen?.("coach-chat")}
          className="shrink-0 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-2 text-xs font-black text-fuchsia-100"
        >
          SYNC
        </button>
      </div>
    </Card>
  );
}
function HealthLaunchReadinessCard({
  snapshot,
  profile,
  weekPlan,
  history,
  progressLogs,
  onOpen,
  onStartWorkout,
}) {
  const planReady = Array.isArray(weekPlan) && weekPlan.length > 0;
  const hasProfile =
    !!profile?.primary_goal ||
    !!profile?.inspiration_goal ||
    !!snapshot?.goal;
  const hasWorkoutHistory =
    Array.isArray(history) && history.length > 0;
  const hasProgressLogs =
    Array.isArray(progressLogs) && progressLogs.length > 0;

  const nextSession = nextPlannedSession(weekPlan);
  const checks = [
    {
      label: "Profile",
      done: hasProfile,
      detail: hasProfile
        ? "Goal data is ready."
        : "Add goals, limits, and equipment.",
      action: "Profile",
      open: "questionnaire",
    },
    {
      label: "Week Plan",
      done: planReady,
      detail: planReady
        ? `${weekPlan.length} day plan loaded.`
        : "Build a week so SYNC can guide you.",
      action: "Planner",
      open: "planner",
    },
    {
      label: "Workout Memory",
      done: hasWorkoutHistory,
      detail: hasWorkoutHistory
        ? `${history.length} saved sessions.`
        : "Finish one workout to unlock memory.",
      action: "Start",
      open: "workout",
    },
    {
      label: "Progress Data",
      done: hasProgressLogs,
      detail: hasProgressLogs
        ? `${progressLogs.length} progress logs.`
        : "Log weight, steps, nutrition, or water.",
      action: "Log",
      open: "quick-log",
    },
  ];

  const completeCount = checks.filter((item) => item.done).length;
  const launchScore = Math.round((completeCount / checks.length) * 100);
  const primaryAction = nextSession
    ? "Start Today's Workout"
    : planReady
    ? "Open Planner"
    : "Build My Week";

  function runPrimaryAction() {
    if (nextSession && typeof onStartWorkout === "function") {
      onStartWorkout(nextSession);
      return;
    }

    onOpen?.(planReady ? "planner" : "coach-chat");
  }

  function runCheck(item) {
    if (item.label === "Workout Memory" && nextSession && onStartWorkout) {
      onStartWorkout(nextSession);
      return;
    }

    onOpen?.(item.open);
  }

  return (
    <Card className="relative overflow-hidden border-cyan-300/25 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(3,7,18,0.95),rgba(57,255,136,0.08))] p-3 sm:p-4">
      <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-lime-400/10 blur-3xl" />

      <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-lime-300/25 bg-lime-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-lime-100">
              Beta Launch Check
            </span>
            <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
              {launchScore}% ready
            </span>
          </div>

          <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">
            Health is ready for today's next move
          </h2>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
            A cleaner launch view for beta users: finish setup, start training, log the basics, and let SYNC learn from real data.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <ActionButton
            label={primaryAction}
            tone="emerald"
            onClick={runPrimaryAction}
            className="w-full sm:w-auto"
          />
          <ActionButton
            label="Ask SYNC"
            tone="fuchsia"
            onClick={() => onOpen?.("coach-chat")}
            className="w-full sm:w-auto"
          />
        </div>
      </div>

      <div className="relative mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {checks.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => runCheck(item)}
            className={`rounded-2xl border p-3 text-left transition active:scale-[0.99] ${
              item.done
                ? "border-lime-300/20 bg-lime-300/[0.07] text-lime-100"
                : "border-amber-300/20 bg-amber-300/[0.07] text-amber-100"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-black uppercase tracking-[0.14em]">
                {item.label}
              </div>
              <div className="rounded-full border border-white/10 bg-black/25 px-2 py-1 text-[9px] font-black uppercase text-white">
                {item.done ? "Ready" : "Needs input"}
              </div>
            </div>
            <div className="mt-2 min-h-[2.4rem] text-xs font-bold leading-5 text-slate-300">
              {item.detail}
            </div>
            <div className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-white">
              {item.action} ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢
            </div>
          </button>
        ))}
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
      <HealthCardErrorBoundary name="Launch Checklist" onOpen={onOpen}>
        <HealthLaunchReadinessCard
          snapshot={snapshot}
          profile={profile}
          weekPlan={weekPlan}
          history={history}
          progressLogs={progressLogs}
          onOpen={onOpen}
          onStartWorkout={onStartWorkout}
        />
      </HealthCardErrorBoundary>
      <HealthCardErrorBoundary name="Mobile Beta Note" onOpen={onOpen}>
        <HealthBetaCleanlinessNote
          onOpen={onOpen}
        />
      </HealthCardErrorBoundary>

      <HealthCardErrorBoundary name="Production QA" onOpen={onOpen}>
        <HealthProductionQaPanel
          snapshot={snapshot}
          profile={profile}
          weekPlan={weekPlan}
          history={history}
          progressLogs={progressLogs}
          devices={devices}
          onOpen={onOpen}
        />
      </HealthCardErrorBoundary>

      <HealthCardErrorBoundary name="Daily Accountability" onOpen={onOpen}>
        <DailyAccountabilityLoopCard
          snapshot={snapshot}
          profile={profile}
          weekPlan={weekPlan}
          history={history}
          onOpen={onOpen}
          onStartWorkout={onStartWorkout}
        />
      </HealthCardErrorBoundary>

      <HealthCardErrorBoundary name="Muscle Map" onOpen={onOpen}>
        <MuscleTrainingSelectorCard
        onOpen={onOpen}
        />
      </HealthCardErrorBoundary>
      <HealthCardErrorBoundary name="Adaptive Workout" onOpen={onOpen}>
        <AdaptiveNextWorkoutCard
        history={history}
        snapshot={snapshot}
        profile={profile}
        onOpen={onOpen}
        />
      </HealthCardErrorBoundary>
      <HealthCardErrorBoundary name="Cardio Progress" onOpen={onOpen}>
        <CardioProgressCard
        history={history}
        onOpenCardio={onOpenCardio}
        onOpenHistory={() =>
          onOpen?.("workout-history")
        }
        />
      </HealthCardErrorBoundary>
      <HealthCardErrorBoundary name="Coach Intelligence" onOpen={onOpen}>
        <HealthCoachIntelligenceCard
        history={history}
        snapshot={snapshot}
        onOpen={onOpen}
        />
      </HealthCardErrorBoundary>
      <WeekLifecycleCard
        weekPlan={weekPlan}
        history={history}
        onOpen={onOpen}
        onBuildNextWeek={onBuildNextWeek}
        onRepeatLastWeek={onRepeatLastWeek}
      />

      <Card className="relative hidden overflow-hidden border-blue-400/20 bg-[#050b18] lg:block">
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
              icon="GO"
              label="Start Workout"
              detail={nextSession?.workout_name || "Choose or build today's session"}
              tone="emerald"
              onClick={() => nextSession ? onStartWorkout?.(nextSession) : onOpen?.("workout")}
            />
            <QuickAction
              icon="+"
              label="Build Workout"
              detail="Create and save your own sets"
              tone="cyan"
              onClick={() => onOpen?.("workout")}
            />
            <QuickAction
              icon="BODY"
              label="Train a Muscle"
              detail="Browse legs, chest, back, arms, and more"
              tone="fuchsia"
              onClick={() => onOpen?.("library")}
            />
            <QuickAction
              icon="LIB"
              label="Exercise Library"
              detail="Search movements and form guidance"
              tone="violet"
              onClick={() => onOpen?.("library")}
            />
            <QuickAction
              icon="PR"
              label="Progress"
              detail="Weight, workouts, strength, and trends"
              tone="amber"
              onClick={() => onOpen?.("progress")}
            />
            <QuickAction
              icon="ID"
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

      <HealthCardErrorBoundary name="Sleep Planner" onOpen={onOpen}>

        <SleepPlanCard
        profile={profile}
        snapshot={snapshot}
        onOpen={onOpen}

        />

      </HealthCardErrorBoundary>
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
                  SW</div>

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

      <HealthCardErrorBoundary name="Last Workout Stats" onOpen={onOpen}>

        <LastWorkoutStatsCard
        stats={snapshot?.last_workout_stats}

        />

      </HealthCardErrorBoundary>
      <HealthCardErrorBoundary name="Progress Charts" onOpen={onOpen}>
        <HealthProgressCharts
        profile={profile}
        snapshot={snapshot}
        history={history}
        progressLogs={progressLogs}
        onOpen={onOpen}
        />
      </HealthCardErrorBoundary>
      <HealthCardErrorBoundary name="Health KPIs" onOpen={onOpen}>
        <HealthKpiSection
        history={history}
        snapshot={snapshot}
        profile={profile}
        />
      </HealthCardErrorBoundary>
      <HealthCardErrorBoundary name="Momentum" onOpen={onOpen}>
        <HealthMomentumCard
        profile={profile}
        snapshot={snapshot}
        history={history}
        progressLogs={progressLogs}
        onOpen={onOpen}
        />
      </HealthCardErrorBoundary>
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