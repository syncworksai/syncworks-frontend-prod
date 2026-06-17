// src/components/customer-health/HealthDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import HealthMomentumCard from "./HealthMomentumCard";
import {
  clampPercent,
  cx,
  prettyDate,
  readinessSuggestion,
  safeNumber,
} from "./healthStorage";
import { formatSeconds } from "./healthWorkoutSession";

const SEEQ_AFFILIATE_URL = "https://www.seeqsupply.com/JACOB78279";
const WEWARD_AFFILIATE_URL =
  "https://wewardapp.go.link/profile?adj_t=1rg2xpwh&userId=22865998";

const QUOTES = [
  "Consistency beats intensity you can’t repeat.",
  "You do not need a perfect week. You need to win today.",
  "Short workout > skipped workout.",
  "Momentum matters more than motivation.",
  "Hit the protein. Hit the steps. The body follows.",
  "Train for the goal, not just the mood.",
];

function Card({ className = "", children }) {
  return (
    <section
      className={cx(
        "rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-4 shadow-[0_10px_36px_rgba(0,0,0,0.18)]",
        className
      )}
    >
      {children}
    </section>
  );
}

function StatPill({ label, value, tone = "cyan" }) {
  const toneMap = {
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-100",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",
    amber: "border-amber-500/25 bg-amber-500/10 text-amber-100",
    fuchsia: "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-100",
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
      <div className="mt-1 text-sm font-black">{value}</div>
    </div>
  );
}

function ProgressBar({ label, value, goal, suffix = "", tone = "cyan" }) {
  const pct = goal > 0 ? clampPercent((value / goal) * 100) : 0;

  const barTone = {
    cyan: "from-cyan-400 to-blue-500",
    emerald: "from-emerald-400 to-cyan-500",
    amber: "from-amber-400 to-orange-500",
    fuchsia: "from-fuchsia-400 to-purple-500",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
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

      <div className="mt-2 text-[11px] text-slate-500">{pct}% complete</div>
    </div>
  );
}

function ActionButton({ label, onClick, tone = "cyan", className = "" }) {
  const toneMap = {
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20",
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
        "inline-flex h-11 items-center justify-center rounded-2xl border px-4 text-sm font-black transition",
        toneMap[tone] || toneMap.cyan,
        className
      )}
    >
      {label}
    </button>
  );
}

function nextPlannedSession(weekPlan = []) {
  const safeWeekPlan = Array.isArray(weekPlan) ? weekPlan : [];

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
        `${item.ymd || "2099-01-01"}T${item.time || "23:59"}:00`
      ).getTime(),
    }))
    .filter((item) => item.sortTime >= startOfToday)
    .sort((a, b) => a.sortTime - b.sortTime)[0];
}

function buildGoogleCalendarLink(item) {
  if (!item?.ymd || !item?.workout_name) return "#";

  const start = new Date(`${item.ymd}T${item.time || "09:00"}:00`);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  function fmt(d) {
    const pad = (n) => String(n).padStart(2, "0");

    return (
      `${d.getUTCFullYear()}` +
      `${pad(d.getUTCMonth() + 1)}` +
      `${pad(d.getUTCDate())}` +
      `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(
        d.getUTCSeconds()
      )}Z`
    );
  }

  const params = new URLSearchParams();
  params.set("action", "TEMPLATE");
  params.set("text", item.workout_name);
  params.set(
    "details",
    `SyncWorks Health Planner • ${item.note || "Workout session"}`
  );
  params.set("dates", `${fmt(start)}/${fmt(end)}`);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function CoachChatStartCard({ snapshot, onOpen }) {
  const coachChat = Array.isArray(snapshot?.coach_chat)
    ? snapshot.coach_chat
    : [];
  const proposal = snapshot?.coach_plan_proposal || null;
  const hasPlannerProposal = !!proposal;
  const isAdded = proposal?.status === "added_to_planner";

  return (
    <Card className="relative overflow-hidden border-emerald-400/25 bg-gradient-to-br from-emerald-500/10 via-slate-950/70 to-cyan-500/10">
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100">
                Phase 7A
              </span>

              <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100">
                Coach Chat
              </span>

              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                Local Smart Engine
              </span>
            </div>

            <h2 className="mt-4 text-2xl font-black tracking-tight text-white md:text-3xl">
              Start with your AI Fitness Coach
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Tell the coach what you are chasing, where you train, how many
              days this week, pain or limits, and whether you want to be pushed
              hard or kept balanced. It will build a plan and ask if you are
              ready to add it to the planner.
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
              value={isAdded ? "Added" : hasPlannerProposal ? "Ready" : "None"}
              tone={
                isAdded ? "emerald" : hasPlannerProposal ? "amber" : "fuchsia"
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
              First prompt
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-200">
              “I want a gym plan this week. My goal is fitness model strength
              with chest, abs, and athletic performance. I can train 4 days for
              45 minutes. Push me hard but protect my hips.”
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

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
}) {
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
    }, 7000);

    return () => window.clearInterval(timer);
  }, []);

  const stepGoal = safeNumber(snapshot?.step_goal || 8000);
  const steps = safeNumber(snapshot?.steps || 0);

  const calorieGoal = safeNumber(snapshot?.calorie_goal || 2200);
  const calories = safeNumber(snapshot?.calories || 0);

  const proteinGoal = safeNumber(snapshot?.protein_goal || 150);
  const protein = safeNumber(snapshot?.protein_today || 0);

  const waterGoal = safeNumber(snapshot?.water_goal || 100);
  const water = safeNumber(snapshot?.water || 0);

  const currentWeight = safeNumber(snapshot?.weight || profile?.weight || 0);
  const targetWeight = safeNumber(profile?.target_weight || 0);

  const trainingDaysGoal = Math.max(1, safeNumber(profile?.training_days || 3));
  const weeklyCompleted = Math.max(
    0,
    safeNumber(snapshot?.weekly_completed || history?.length || 0)
  );

  const weekPlan = Array.isArray(snapshot?.week_plan) ? snapshot.week_plan : [];
  const plannedCount = weekPlan.filter(
    (item) => item?.workout_name && item?.status !== "Rest Day"
  ).length;

  const nextSession = useMemo(() => nextPlannedSession(weekPlan), [weekPlan]);

  const goalTitle =
    profile?.inspiration_goal ||
    profile?.primary_goal ||
    snapshot?.goal ||
    "General fitness";

  const coachMessage =
    snapshot?.last_coach_summary ||
    (snapshot?.readiness && snapshot?.readiness !== "Moderate"
      ? readinessSuggestion(snapshot.readiness)
      : `You are training for ${goalTitle}. Win today by doing the next workout, hitting protein, and staying on top of recovery.`);

  const healthScore = clampPercent(
    clampPercent((steps / Math.max(stepGoal, 1)) * 100) * 0.25 +
      clampPercent((protein / Math.max(proteinGoal, 1)) * 100) * 0.3 +
      clampPercent((weeklyCompleted / Math.max(trainingDaysGoal, 1)) * 100) *
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
    <div className="space-y-5">
      <CoachChatStartCard snapshot={snapshot} onOpen={onOpen} />

      <Card className="relative overflow-hidden border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 via-slate-950/60 to-fuchsia-500/10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/4 h-64 w-64 rounded-full bg-fuchsia-500/15 blur-3xl" />

        <div className="relative">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100">
                  SyncWorks Health
                </span>

                <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100">
                  {snapshot?.readiness || "Moderate"}
                </span>

                <span className="rounded-full border border-fuchsia-500/25 bg-fuchsia-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-100">
                  Trainer Loop
                </span>
              </div>

              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan-400/25 bg-cyan-500/10 text-3xl animate-pulse">
                  🏋️
                </div>

                <div className="min-w-0">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                    Today’s Mission
                  </div>

                  <h1 className="mt-1 text-3xl font-black tracking-tight text-white md:text-4xl">
                    {nextSession?.workout_name || "Build momentum today"}
                  </h1>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                    Train for{" "}
                    <span className="font-bold text-white">{goalTitle}</span>,
                    stay on top of your progress, and keep the app focused on
                    what matters today.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatPill label="Goal" value={goalTitle} tone="emerald" />

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
                <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Coach Message
                  </div>

                  <div className="mt-2 text-lg font-black text-white">
                    “{QUOTES[quoteIndex]}”
                  </div>

                  <div className="mt-2 text-sm leading-6 text-slate-300">
                    {coachMessage}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Next Planned Session
                  </div>

                  {nextSession ? (
                    <>
                      <div className="mt-2 text-lg font-black text-white">
                        {nextSession.workout_name}
                      </div>

                      <div className="mt-1 text-sm text-slate-300">
                        {prettyDate(nextSession.ymd)} •{" "}
                        {nextSession.time || "Anytime"}
                      </div>

                      <div className="mt-1 text-sm text-slate-500">
                        {nextSession.note || "Planned workout"}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <ActionButton
                          label="Start Workout"
                          onClick={() => onStartWorkout?.(nextSession)}
                          tone="emerald"
                        />

                        <ActionButton
                          label="Open Planner"
                          onClick={() => onOpen("planner")}
                        />

                        <a
                          href={buildGoogleCalendarLink(nextSession)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-11 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 text-sm font-black text-emerald-100 transition hover:bg-emerald-500/20"
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
                        Build the week inside your planner so the app becomes a
                        daily checkpoint.
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

              <div className="mt-5 flex flex-wrap gap-2">
                <ActionButton
                  label="Chat With Coach"
                  onClick={() => onOpen("coach-chat")}
                  tone="emerald"
                />

                <ActionButton
                  label="Today’s AI Plan"
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

      <LastWorkoutStatsCard stats={snapshot?.last_workout_stats} />

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

          <div className="mt-2 text-xl font-black text-white">
            See your progress at a glance
          </div>

          <div className="mt-1 text-sm text-slate-400">
            This section should make people want to log in every day.
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

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                Current Weight
              </div>

              <div className="mt-2 text-2xl font-black text-white">
                {currentWeight ? `${currentWeight} lb` : "—"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                Target Weight
              </div>

              <div className="mt-2 text-2xl font-black text-white">
                {targetWeight ? `${targetWeight} lb` : "—"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                Planned This Week
              </div>

              <div className="mt-2 text-2xl font-black text-white">
                {plannedCount}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
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

          <div className="mt-2 text-xl font-black text-white">This week</div>

          <div className="mt-1 text-sm text-slate-400">
            Build habit by showing today, tomorrow, and the next sessions.
          </div>

          <div className="mt-4 space-y-2">
            {weekPlan.length ? (
              weekPlan.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-white">
                        {item.day_label} • {prettyDate(item.ymd)}
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        {item.workout_name || "Recovery / open day"}
                        {item.time ? ` • ${item.time}` : ""}
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

                  {item.workout_name && item.status !== "Completed" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onStartWorkout?.(item)}
                        className="inline-flex h-10 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3 text-xs font-black text-emerald-100 transition hover:bg-emerald-500/20"
                      >
                        Start
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpen("planner")}
                        className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-xs font-black text-slate-100 transition hover:bg-white/[0.08]"
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

          <div className="mt-4 flex flex-wrap gap-2">
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
            Add exercises, sets, reps, weight, pain, difficulty, and use the AI
            coach to adjust.
          </div>

          <div className="mt-4">
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
            Make it easier for users to choose movements by muscle group, feel,
            and equipment.
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
            Track recovery and future sync
          </div>

          <div className="mt-2 text-sm leading-6 text-slate-400">
            Devices active: {devices?.length || 0}. Keep users ready for Apple
            Health, Fitbit, Garmin, and more.
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
            Helpful option for recovery and hitting daily protein targets.
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={SEEQ_AFFILIATE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-fuchsia-500/25 bg-fuchsia-500/10 px-4 text-sm font-black text-fuchsia-100 transition hover:bg-fuchsia-500/20"
            >
              Shop Seeq
            </a>

            <button
              type="button"
              onClick={() => onOpen("nutrition")}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-slate-100 transition hover:bg-white/[0.08]"
            >
              Log Protein Goal
            </button>
          </div>
        </Card>

        <Card className="border-cyan-500/20">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">
            Step Motivation Partner
          </div>

          <div className="mt-2 text-xl font-black text-white">WeWard</div>

          <div className="mt-2 text-sm leading-6 text-slate-300">
            Add a little fun to steps. Users can stay more motivated when they
            feel rewarded for walking and daily movement.
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={WEWARD_AFFILIATE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-4 text-sm font-black text-cyan-100 transition hover:bg-cyan-500/20"
            >
              Explore WeWard
            </a>

            <button
              type="button"
              onClick={() => onOpen("steps")}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-slate-100 transition hover:bg-white/[0.08]"
            >
              Update Steps
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}