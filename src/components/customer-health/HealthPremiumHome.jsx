// src/components/customer-health/HealthPremiumHome.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import HealthProgressControlCenter from "./HealthProgressControlCenter";
import HealthAthleteProfileCard from "./HealthAthleteProfileCard";
import RecoveryReadinessCard from "./RecoveryReadinessCard";
import HealthGoalProgressCard from "./HealthGoalProgressCard";

const PLAN_LENGTH_KEY = "syncworks_health_plan_length_weeks";

function safeNumber(value, fallback = 0) {
  const parsed = Number(
    String(value ?? "").replace(/[^\d.-]/g, "")
  );
  return Number.isFinite(parsed) ? parsed : fallback;
}

function localYmd(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function firstName(profile) {
  return String(
    profile?.first_name || profile?.name || ""
  )
    .trim()
    .split(" ")[0];
}

function workoutName(item) {
  return String(
    item?.workout_name || item?.name || item?.title || ""
  ).trim();
}

function workoutDate(item) {
  return String(
    item?.ymd ||
      item?.date ||
      item?.completed_ymd ||
      item?.completed_at ||
      item?.ended_at ||
      ""
  ).slice(0, 10);
}

function completedRecently(history, name) {
  if (!name || !Array.isArray(history)) return false;

  return history.some((entry) => {
    const status = String(
      entry?.status || entry?.workout_status || ""
    ).toLowerCase();

    return (
      workoutName(entry).toLowerCase() === name.toLowerCase() &&
      (status.includes("complete") ||
        entry?.completed === true ||
        entry?.completed_at) &&
      [localYmd(), localYmd(-1)].includes(workoutDate(entry))
    );
  });
}

function unfinishedWorkout(snapshot) {
  const direct = [
    snapshot?.active_workout,
    snapshot?.workout_in_progress,
    snapshot?.incomplete_workout,
    snapshot?.last_incomplete_workout,
  ].find((item) => item && typeof item === "object");

  if (direct) return direct;

  return (Array.isArray(snapshot?.week_plan)
    ? snapshot.week_plan
    : []
  ).find((item) =>
    ["in progress", "started", "incomplete"].includes(
      String(item?.status || "").toLowerCase()
    )
  );
}

function chooseWorkout(snapshot, history) {
  const plan = Array.isArray(snapshot?.week_plan)
    ? snapshot.week_plan
    : [];

  const today = plan.find(
    (item) =>
      item?.ymd === localYmd() &&
      workoutName(item) &&
      String(item?.status || "") !== "Completed"
  );

  if (
    today &&
    !completedRecently(history, workoutName(today))
  ) {
    return { workout: today, repeated: false };
  }

  const nextDifferent = [...plan]
    .filter(
      (item) =>
        workoutName(item) &&
        !["Completed", "Skipped"].includes(item?.status)
    )
    .filter(
      (item) =>
        !completedRecently(history, workoutName(item))
    )
    .sort((a, b) =>
      String(a?.ymd || "9999").localeCompare(
        String(b?.ymd || "9999")
      )
    )[0];

  return {
    workout: nextDifferent || null,
    repeated: Boolean(today),
  };
}

function totalSets(workout) {
  return (Array.isArray(workout?.exercises)
    ? workout.exercises
    : []
  ).reduce(
    (sum, exercise) =>
      sum +
      safeNumber(
        exercise?.planned_sets || exercise?.sets,
        0
      ),
    0
  );
}

function entriesForDay(history, ymd) {
  return (Array.isArray(history) ? history : []).filter(
    (entry) => workoutDate(entry) === ymd || entry?.ymd === ymd
  );
}

function hasTrackedType(entries, keywords) {
  return entries.some((entry) => {
    const haystack = `${entry?.type || ""} ${
      entry?.category || ""
    } ${entry?.label || ""} ${entry?.name || ""}`.toLowerCase();

    return keywords.some((keyword) =>
      haystack.includes(keyword)
    );
  });
}

function buildTrackingGaps(history, snapshot) {
  const yesterdayEntries = entriesForDay(
    history,
    localYmd(-1)
  );

  const gaps = [];

  if (
    !hasTrackedType(yesterdayEntries, [
      "meal",
      "food",
      "nutrition",
      "protein",
      "calorie",
    ])
  ) {
    gaps.push({ id: "meal", label: "meals" });
  }

  if (
    !hasTrackedType(yesterdayEntries, ["water", "hydration"])
  ) {
    gaps.push({ id: "water", label: "water" });
  }

  if (
    !hasTrackedType(yesterdayEntries, ["sleep"]) &&
    !safeNumber(snapshot?.last_sleep_hours, 0)
  ) {
    gaps.push({ id: "sleep", label: "sleep" });
  }

  if (
    !hasTrackedType(yesterdayEntries, ["step", "walk"]) &&
    !safeNumber(snapshot?.steps_yesterday, 0)
  ) {
    gaps.push({ id: "steps", label: "steps" });
  }

  return gaps;
}

function nextPlannedWorkouts(snapshot, limit = 3) {
  return [...(Array.isArray(snapshot?.week_plan)
    ? snapshot.week_plan
    : [])]
    .filter(
      (item) =>
        workoutName(item) &&
        !["Completed", "Skipped"].includes(item?.status)
    )
    .sort((a, b) =>
      String(a?.ymd || "9999").localeCompare(
        String(b?.ymd || "9999")
      )
    )
    .slice(0, limit);
}

function QuickStat({ label, value, detail, onClick, tone }) {
  const toneClass = {
    lime: "border-lime-300/20 bg-lime-300/[0.06]",
    cyan: "border-cyan-300/20 bg-cyan-300/[0.06]",
    violet: "border-violet-300/20 bg-violet-300/[0.06]",
    emerald: "border-emerald-300/20 bg-emerald-300/[0.06]",
  }[tone] || "border-white/10 bg-white/[0.035]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-3 text-left ${toneClass}`}
    >
      <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-black text-white">
        {value}
      </div>
      <div className="mt-1 text-[10px] text-slate-500">
        {detail}
      </div>
    </button>
  );
}

function ServiceCard({
  eyebrow,
  title,
  description,
  tone,
  children,
}) {
  const toneClass = {
    cyan:
      "border-cyan-300/20 bg-[linear-gradient(145deg,rgba(34,211,238,0.08),rgba(3,7,18,0.84))]",
    lime:
      "border-lime-300/20 bg-[linear-gradient(145deg,rgba(57,255,136,0.07),rgba(3,7,18,0.86))]",
    violet:
      "border-violet-300/20 bg-[linear-gradient(145deg,rgba(139,92,246,0.08),rgba(3,7,18,0.86))]",
  }[tone];

  return (
    <section
      className={`rounded-[1.55rem] border p-4 ${toneClass}`}
    >
      <div className="text-[9px] font-black uppercase tracking-[0.17em] text-slate-400">
        {eyebrow}
      </div>
      <h3 className="mt-1 text-lg font-black text-white">
        {title}
      </h3>
      <p className="mt-1 text-xs leading-5 text-slate-400">
        {description}
      </p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function MiniAction({ children, onClick, primary = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 rounded-xl border px-3 text-[11px] font-black ${
        primary
          ? "border-lime-300/40 bg-lime-300 text-black"
          : "border-white/10 bg-white/[0.04] text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

export default function HealthPremiumHome({
  profile,
  snapshot,
  history,
  onOpen,
  onStartWorkout,
  onQuickLog,
  onCoachUpdate,
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [planLengthWeeks, setPlanLengthWeeks] = useState(
    () => {
      if (typeof window === "undefined") return 8;
      return safeNumber(
        window.localStorage.getItem(PLAN_LENGTH_KEY),
        8
      );
    }
  );

  const coachUpdateRef = useRef(onCoachUpdate);
  coachUpdateRef.current = onCoachUpdate;

  const stableCoachUpdate = useCallback(
    (patch) => coachUpdateRef.current?.(patch),
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      PLAN_LENGTH_KEY,
      String(planLengthWeeks)
    );
  }, [planLengthWeeks]);

  const unfinished = useMemo(
    () => unfinishedWorkout(snapshot),
    [snapshot]
  );
  const selected = useMemo(
    () => chooseWorkout(snapshot, history),
    [snapshot, history]
  );
  const workout = unfinished || selected.workout;
  const isResume = Boolean(unfinished);
  const needsRefresh = !isResume && selected.repeated;
  const exercises = Array.isArray(workout?.exercises)
    ? workout.exercises
    : [];
  const exerciseCount =
    exercises.length || safeNumber(workout?.exercise_count, 0);
  const sets =
    totalSets(workout) || safeNumber(workout?.total_sets, 0);
  const duration = safeNumber(
    workout?.duration_minutes ||
      workout?.requested_duration_minutes,
    exerciseCount ? 45 : 0
  );
  const completed = safeNumber(
    workout?.completed_exercises ||
      workout?.current_exercise_index,
    0
  );
  const progress = exerciseCount
    ? Math.min(100, Math.round((completed / exerciseCount) * 100))
    : 0;

  const protein = safeNumber(
    snapshot?.protein_today || snapshot?.protein,
    0
  );
  const proteinGoal = safeNumber(
    snapshot?.protein_goal || profile?.protein_goal,
    136
  );
  const steps = safeNumber(snapshot?.steps, 0);
  const sleep = safeNumber(
    snapshot?.sleep_hours || snapshot?.last_sleep_hours,
    0
  );
  const readiness = safeNumber(
    snapshot?.readiness_score || snapshot?.readiness,
    0
  );
  const water = safeNumber(
    snapshot?.water_ounces || snapshot?.water_today,
    0
  );
  const calories = safeNumber(
    snapshot?.calories_today || snapshot?.calories,
    0
  );
  const calorieGoal = safeNumber(
    snapshot?.calorie_goal || profile?.calorie_goal,
    2200
  );

  const trackingGaps = useMemo(
    () => buildTrackingGaps(history, snapshot),
    [history, snapshot]
  );
  const nextWorkouts = useMemo(
    () => nextPlannedWorkouts(snapshot),
    [snapshot]
  );
  const hasPlan = Boolean(
    workout ||
      (Array.isArray(snapshot?.week_plan) &&
        snapshot.week_plan.length)
  );

  function startPrimary() {
    if (workout && !needsRefresh) {
      onStartWorkout?.(workout);
    } else {
      onOpen?.("plan-today");
    }
  }

  return (
    <div className="space-y-3 pb-5">
      <section className="overflow-hidden rounded-[1.9rem] border border-lime-300/20 bg-[radial-gradient(circle_at_85%_0%,rgba(57,255,136,0.11),transparent_34%),linear-gradient(160deg,#0b120e,#030504)] shadow-[0_22px_70px_rgba(0,0,0,0.46)]">
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.19em] text-lime-300">
                SYNC AI Fitness Coach
              </div>
              <h1 className="mt-1 text-2xl font-black text-white">
                {firstName(profile)
                  ? `Ready, ${firstName(profile)}?`
                  : "Build your AI fitness plan"}
              </h1>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Your workouts, nutrition, recovery, and daily habits work together to reach the goal.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpen?.("coach-chat")}
              className="rounded-full border border-lime-300/25 bg-lime-300/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.13em] text-lime-100"
            >
              AI Online
            </button>
          </div>

          {trackingGaps.length ? (
            <div className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-300/[0.08] p-3">
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-200">
                Yesterday needs attention
              </div>
              <div className="mt-1 text-sm font-black text-white">
                We missed tracking {trackingGaps
                  .map((gap) => gap.label)
                  .join(", ")} yesterday.
              </div>
              <div className="mt-1 text-[11px] leading-5 text-slate-400">
                Add the missing data so SYNC can adjust calories, recovery, hydration, steps, and your next workout accurately.
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {trackingGaps.map((gap) => (
                  <MiniAction
                    key={gap.id}
                    onClick={() => onQuickLog?.(gap.id)}
                  >
                    Log {gap.label}
                  </MiniAction>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 rounded-[1.55rem] border border-white/10 bg-black/25 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-200">
                  {isResume
                    ? "Workout in progress"
                    : needsRefresh
                    ? "Fresh plan needed"
                    : hasPlan
                    ? "AI selected today's workout"
                    : "New member setup"}
                </div>
                <h2 className="mt-1 truncate text-2xl font-black text-white">
                  {needsRefresh
                    ? "Build a fresh workout"
                    : workoutName(workout) ||
                      "Create your AI fitness plan"}
                </h2>
                <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-bold text-slate-400">
                  <span>{exerciseCount || "-"} exercises</span>
                  <span>{sets || "-"} sets</span>
                  <span>{duration || "-"} min</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPlanOpen((value) => !value)}
                className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[10px] font-black text-white"
              >
                {planOpen ? "Hide" : "Why this?"}
              </button>
            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-lime-300"
                style={{
                  width: `${
                    isResume
                      ? Math.max(8, progress)
                      : hasPlan && !needsRefresh
                      ? 12
                      : 0
                  }%`,
                }}
              />
            </div>

            {planOpen ? (
              <div className="mt-3 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.05] p-3 text-[11px] leading-5 text-slate-300">
                <div className="font-black text-cyan-100">
                  SYNC used your goals, measurements, experience, location, available equipment, recent performance, recovery, sleep, steps, and nutrition data.
                </div>
                <div className="mt-2 text-slate-400">
                  The active workout stays stable while you train. SYNC reviews results after the session and proposes the next adjustment for you to accept.
                </div>
              </div>
            ) : null}

            {needsRefresh ? (
              <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.07] p-3 text-xs leading-5 text-amber-100">
                You completed this workout recently. SYNC will not blindly repeat it. Build the next appropriate session from your recovery and plan progress.
              </div>
            ) : null}

            <button
              type="button"
              onClick={startPrimary}
              className="mt-4 h-14 w-full rounded-2xl border border-lime-300/50 bg-lime-300 text-sm font-black uppercase tracking-[0.09em] text-black shadow-[0_0_28px_rgba(57,255,136,0.25)]"
            >
              {isResume
                ? "Resume Workout"
                : hasPlan && !needsRefresh
                ? "Start Workout"
                : "Create My AI Plan"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-5 gap-2">
        <QuickStat
          label="Protein"
          value={`${protein}g`}
          detail={`${Math.max(0, proteinGoal - protein)}g left`}
          onClick={() => onQuickLog?.("meal")}
          tone="lime"
        />
        <QuickStat
          label="Steps"
          value={steps.toLocaleString()}
          detail="WeWard"
          onClick={() => onQuickLog?.("steps")}
          tone="cyan"
        />
        <QuickStat
          label="Water"
          value={water ? `${water}oz` : "Log"}
          detail="Hydration"
          onClick={() => onQuickLog?.("water")}
          tone="cyan"
        />
        <QuickStat
          label="Sleep"
          value={sleep ? `${sleep}h` : "Log"}
          detail="Recovery"
          onClick={() => onQuickLog?.("sleep")}
          tone="violet"
        />
        <QuickStat
          label="Ready"
          value={readiness || "Log"}
          detail="Today"
          onClick={() => onQuickLog?.("readiness")}
          tone="emerald"
        />
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <ServiceCard
          eyebrow="AI Coach"
          title="Your coach is active and learning"
          description="Ask questions, hear your briefing, and review why the next recommendation changed."
          tone="cyan"
        >
          <div className="grid grid-cols-2 gap-2">
            <MiniAction
              primary
              onClick={() => onOpen?.("coach-chat")}
            >
              Ask AI Coach
            </MiniAction>
            <MiniAction onClick={() => onOpen?.("coach-chat")}>
              Workout Briefing
            </MiniAction>
            <MiniAction onClick={() => setDetailsOpen(true)}>
              Review Progress
            </MiniAction>
            <MiniAction onClick={() => onOpen?.("goals")}>
              Update Goals
            </MiniAction>
          </div>
        </ServiceCard>

        <ServiceCard
          eyebrow="Nutrition Coach"
          title={`${Math.max(0, calorieGoal - calories).toLocaleString()} calories remaining`}
          description="Targets adapt to your goal, training schedule, recovery, adherence, and real progress."
          tone="lime"
        >
          <div className="mb-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-black/25 p-2 text-[10px] text-slate-400">
              <b className="block text-sm text-white">{protein}/{proteinGoal}g</b>
              Protein
            </div>
            <div className="rounded-xl bg-black/25 p-2 text-[10px] text-slate-400">
              <b className="block text-sm text-white">{calories}</b>
              Calories
            </div>
            <div className="rounded-xl bg-black/25 p-2 text-[10px] text-slate-400">
              <b className="block text-sm text-white">{water || 0}oz</b>
              Water
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MiniAction
              primary
              onClick={() => onQuickLog?.("meal")}
            >
              Log Meal
            </MiniAction>
            <MiniAction
              onClick={() => onOpen?.("nutrition-coach")}
            >
              View Plan
            </MiniAction>
            <MiniAction
              onClick={() => onOpen?.("nutrition-coach")}
            >
              Common Meals
            </MiniAction>
          </div>
        </ServiceCard>
      </section>

      <ServiceCard
        eyebrow="My Plan and Schedule"
        title={hasPlan ? `Your ${planLengthWeeks}-week AI plan` : "Create a complete plan"}
        description="Choose the commitment length. Missing a workout does not destroy the plan; SYNC reviews the week and recommends the safest adjustment."
        tone="violet"
      >
        <div className="grid grid-cols-4 gap-2">
          {[3, 6, 12, 24].map((weeks) => (
            <button
              key={weeks}
              type="button"
              onClick={() => setPlanLengthWeeks(weeks)}
              className={`h-10 rounded-xl border text-[10px] font-black ${
                planLengthWeeks === weeks
                  ? "border-violet-300/40 bg-violet-300/20 text-violet-100"
                  : "border-white/10 bg-black/20 text-slate-400"
              }`}
            >
              {weeks} weeks
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-2">
          {nextWorkouts.length ? (
            nextWorkouts.map((item) => (
              <div
                key={`${item?.ymd}-${workoutName(item)}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/20 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-xs font-black text-white">
                    {workoutName(item)}
                  </div>
                  <div className="mt-0.5 text-[9px] text-slate-500">
                    {item?.ymd || "Flexible day"} · {item?.status || "Planned"}
                  </div>
                </div>
                <div className="text-[9px] font-black uppercase tracking-wider text-violet-200">
                  Planned
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-500">
              No future workouts are visible. Create or rebuild the AI plan to repopulate the planner.
            </div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MiniAction
            primary
            onClick={() => onOpen?.("planner")}
          >
            View Full Plan
          </MiniAction>
          <MiniAction onClick={() => onOpen?.("plan-today")}>
            Build As You Go
          </MiniAction>
          <MiniAction onClick={() => onOpen?.("plan-today")}>
            Restart Plan
          </MiniAction>
          <MiniAction onClick={() => onOpen?.("goals")}>
            Update Goals
          </MiniAction>
        </div>
      </ServiceCard>

      <button
        type="button"
        onClick={() => setDetailsOpen((value) => !value)}
        className="flex h-12 w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-black text-white"
      >
        <span>
          {detailsOpen
            ? "Hide Recovery, Profile and Progress"
            : "Recovery, Profile, Heat Maps and Progress"}
        </span>
        <span>{detailsOpen ? "−" : "+"}</span>
      </button>

      {detailsOpen ? (
        <div className="space-y-3">
          <RecoveryReadinessCard
            profile={profile}
            snapshot={snapshot}
            history={history}
            onOpen={onOpen}
          />
          <HealthGoalProgressCard
            profile={profile}
            snapshot={snapshot}
            history={history}
            onOpen={onOpen}
          />
          <HealthProgressControlCenter
            profile={profile}
            snapshot={snapshot}
            history={history}
            onCoachUpdate={stableCoachUpdate}
          />
          <HealthAthleteProfileCard
            profile={profile}
            snapshot={snapshot}
            onCoachUpdate={stableCoachUpdate}
          />
        </div>
      ) : null}
    </div>
  );
}
