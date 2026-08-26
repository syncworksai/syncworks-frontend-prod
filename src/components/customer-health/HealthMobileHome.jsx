import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  ChevronRight,
  CircleGauge,
  Dumbbell,
  Droplets,
  Footprints,
  HeartPulse,
  Mic2,
  ShoppingBag,
  Sparkles,
  Utensils,
} from "lucide-react";
import {
  archiveExpiredCloudWorkout,
  loadCloudActiveWorkout,
} from "./healthWorkoutCloudSync";
import {
  currentDayWorkout,
  formatHealthDay,
  localYmd,
  shouldOfferPreviousWorkout,
} from "./healthWorkoutDateLifecycle";

const num = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const pct = (value, goal) => {
  if (!goal) return 0;
  return Math.max(0, Math.min(100, Math.round((num(value) / num(goal)) * 100)));
};

function MiniStat({ icon: Icon, label, value, detail, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-white/10 bg-white/[0.025] p-3 text-left active:scale-[0.99]"
    >
      <Icon className="h-4 w-4 text-cyan-300" />
      <div className="mt-2 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 truncate text-[14px] font-black text-white">{value}</div>
      <div className="mt-0.5 truncate text-[9px] text-slate-500">{detail}</div>
    </button>
  );
}

function QuickAction({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-w-[88px] rounded-2xl border border-white/10 bg-white/[0.025] p-3 text-left active:scale-[0.99]"
    >
      <Icon className="h-4 w-4 text-cyan-300" />
      <div className="mt-2 text-[10px] font-black text-white">{label}</div>
    </button>
  );
}

function ProgressLine({ label, value, goal, suffix = "" }) {
  const progress = pct(value, goal);
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-[10px]">
        <span className="font-black text-slate-400">{label}</span>
        <span className="font-black text-white">
          {Math.round(num(value))}{suffix}
          <span className="font-semibold text-slate-600">
            {goal ? ` / ${Math.round(num(goal))}${suffix}` : " / set goal"}
          </span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-600"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export default function HealthMobileHome({
  profile = {},
  snapshot = {},
  history = [],
  decision = null,
  onOpen,
  onStartWorkout,
}) {
  const [dayKey, setDayKey] = useState(() => localYmd());
  const [previousWorkout, setPreviousWorkout] = useState(null);

  const firstName =
    String(profile?.first_name || profile?.name || "")
      .trim()
      .split(/\s+/)[0] || "there";

  const weekPlan = Array.isArray(snapshot?.week_plan) ? snapshot.week_plan : [];
  const todayWorkout = currentDayWorkout(weekPlan, dayKey);
  const nextWorkout = useMemo(
    () =>
      todayWorkout ||
      [...weekPlan]
        .filter(
          (item) =>
            item?.workout_name &&
            !["Completed", "Skipped", "Rescheduled"].includes(item?.status) &&
            String(item?.ymd || "") >= dayKey
        )
        .sort((a, b) =>
          String(a?.ymd || "9999").localeCompare(String(b?.ymd || "9999"))
        )[0] ||
      null,
    [weekPlan, todayWorkout, dayKey]
  );

  const workoutName = nextWorkout?.workout_name || "No workout planned";
  const workoutMinutes = num(nextWorkout?.duration_minutes ?? nextWorkout?.minutes, 0);
  const workoutExercises = Array.isArray(nextWorkout?.exercises)
    ? nextWorkout.exercises.length
    : 0;
  const workoutFocus =
    nextWorkout?.focus ||
    nextWorkout?.note ||
    nextWorkout?.muscle_focus ||
    (nextWorkout ? "Planned session" : "Build today's session with SYNC");

  const calories = num(snapshot?.calories ?? snapshot?.calories_today, 0);
  const calorieGoal = num(snapshot?.calorie_goal ?? profile?.calorie_goal, 0);
  const protein = num(snapshot?.protein_today ?? snapshot?.protein, 0);
  const proteinGoal = num(snapshot?.protein_goal ?? profile?.protein_goal, 0);
  const water = num(snapshot?.water ?? snapshot?.water_oz, 0);
  const waterGoal = num(snapshot?.water_goal ?? snapshot?.water_goal_oz, 0);
  const steps = num(snapshot?.steps ?? snapshot?.steps_today, 0);
  const stepGoal = num(snapshot?.step_goal ?? profile?.step_goal, 10000);
  const readiness = snapshot?.readiness || snapshot?.recovery_status || "Not logged";

  const completedPlanItems = weekPlan.filter((item) => item?.status === "Completed").length;
  const scheduledPlanItems = weekPlan.filter((item) => item?.workout_name).length;
  const calculatedPlanPct = scheduledPlanItems
    ? Math.round((completedPlanItems / scheduledPlanItems) * 100)
    : 0;
  const planPct = Math.max(
    0,
    Math.min(100, num(snapshot?.plan_completion_percent, calculatedPlanPct))
  );

  const latestCompleted = useMemo(
    () =>
      [...(Array.isArray(history) ? history : [])]
        .filter((item) => item?.completed_at || item?.finished_at)
        .sort(
          (a, b) =>
            new Date(b?.completed_at || b?.finished_at || 0).getTime() -
            new Date(a?.completed_at || a?.finished_at || 0).getTime()
        )[0] || null,
    [history]
  );

  useEffect(() => {
    let cancelled = false;

    async function refreshDay() {
      setDayKey(localYmd());
      try {
        const active = await loadCloudActiveWorkout();
        if (cancelled || !active?.session) {
          if (!cancelled) setPreviousWorkout(null);
          return;
        }

        const lifecycle = shouldOfferPreviousWorkout(active);
        if (lifecycle.expired) {
          await archiveExpiredCloudWorkout(active);
          if (!cancelled) setPreviousWorkout(null);
          return;
        }

        if (lifecycle.ageDays === 1) {
          setPreviousWorkout({
            ...active,
            session: lifecycle.session,
            label: lifecycle.label,
          });
          return;
        }

        if (!cancelled) setPreviousWorkout(null);
      } catch (error) {
        console.warn("Health mobile day rollover unavailable.", error);
      }
    }

    refreshDay();
    const interval = window.setInterval(refreshDay, 60000);
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshDay();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const resumePreviousWorkout = previousWorkout
    ? {
        ...previousWorkout.session,
        id:
          previousWorkout.planner_item_id ||
          previousWorkout.session?.planner_item_id ||
          previousWorkout.session?.id,
        workout_id:
          previousWorkout.workout_id || previousWorkout.session?.workout_id || "",
        ymd:
          previousWorkout.session?.scheduled_ymd ||
          previousWorkout.session?.ymd ||
          "",
        workout_name: previousWorkout.session?.workout_name || "Previous workout",
      }
    : null;

  const latestWorkoutLabel =
    latestCompleted?.workout_name || latestCompleted?.name || "No completed workout yet";

  return (
    <section className="lg:hidden text-white">
      <div className="rounded-[1.4rem] border border-cyan-300/15 bg-[linear-gradient(145deg,rgba(8,18,38,.95),rgba(3,8,20,.98))] p-4 shadow-[0_18px_48px_rgba(0,0,0,.3)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-300">
              {formatHealthDay(dayKey)}
            </div>
            <h1 className="mt-1 text-[23px] font-black tracking-tight text-white">
              Health, {firstName}
            </h1>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">
              One place for training, fuel, recovery and progress.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpen?.("questionnaire")}
            className="h-9 shrink-0 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-[10px] font-black text-slate-300"
          >
            Profile
          </button>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <MiniStat
            icon={CircleGauge}
            label="Readiness"
            value={readiness}
            detail="today"
            onClick={() => onOpen?.("daily-goals")}
          />
          <MiniStat
            icon={Utensils}
            label="Protein"
            value={proteinGoal ? `${Math.round(protein)}/${Math.round(proteinGoal)}g` : `${Math.round(protein)}g`}
            detail={proteinGoal ? `${Math.max(0, Math.round(proteinGoal - protein))}g left` : "set goal"}
            onClick={() => onOpen?.("nutrition-dashboard")}
          />
          <MiniStat
            icon={Footprints}
            label="Steps"
            value={Math.round(steps).toLocaleString()}
            detail={`${pct(steps, stepGoal)}% of goal`}
            onClick={() => onOpen?.("daily-goals")}
          />
        </div>
      </div>

      {decision?.revised ? (
        <button
          type="button"
          onClick={() =>
            decision?.needsRebuild
              ? onOpen?.("planner")
              : onStartWorkout?.(decision?.workout)
          }
          className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-blue-400/25 bg-blue-500/[0.08] p-3 text-left"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-500/15 text-blue-200">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-blue-300">
              SYNC adjusted today
            </span>
            <span className="mt-0.5 block truncate text-[11px] font-black text-white">
              {decision?.needsRebuild ? "Recovery-safe rebuild needed" : decision?.workout?.workout_name}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-blue-300" />
        </button>
      ) : null}

      {previousWorkout && resumePreviousWorkout ? (
        <button
          type="button"
          onClick={() => onStartWorkout?.(resumePreviousWorkout)}
          className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.055] p-3 text-left"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-300/10 text-amber-200">
            <Activity className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-amber-200">
              {previousWorkout.label || "Yesterday - Incomplete"}
            </span>
            <span className="mt-0.5 block truncate text-[11px] font-black text-white">
              {resumePreviousWorkout.workout_name}
            </span>
          </span>
          <span className="text-[10px] font-black text-amber-100">Resume</span>
        </button>
      ) : null}

      <section className="mt-3 rounded-[1.45rem] border border-blue-400/20 bg-[#06101f] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-300">
              {todayWorkout ? "Today's workout" : nextWorkout ? "Next workout" : "Workout plan"}
            </div>
            <h2 className="mt-1 truncate text-[20px] font-black text-white">{workoutName}</h2>
            <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">{workoutFocus}</p>
          </div>
          <button
            type="button"
            onClick={() => onOpen?.("planner")}
            className="h-8 shrink-0 rounded-xl border border-white/10 px-2.5 text-[9px] font-black text-slate-400"
          >
            Plan
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-slate-500">
          <span>{workoutMinutes ? `${workoutMinutes} min` : "Flexible"}</span>
          <span>•</span>
          <span>{workoutExercises ? `${workoutExercises} exercises` : "Build session"}</span>
          <span>•</span>
          <span>{nextWorkout?.level || "Adaptive"}</span>
        </div>

        <button
          type="button"
          onClick={() =>
            nextWorkout ? onStartWorkout?.(nextWorkout) : onOpen?.("plan-today")
          }
          className="mt-3 h-12 w-full rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-[13px] font-black text-white shadow-[0_10px_30px_rgba(37,99,235,.28)]"
        >
          {nextWorkout ? "START WORKOUT" : "BUILD TODAY'S WORKOUT"}
        </button>

        <button
          type="button"
          onClick={() => onOpen?.("workouts")}
          className="mt-2 w-full text-[10px] font-black text-cyan-300"
        >
          Browse quick-start workouts
        </button>
      </section>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] font-black text-white">Fuel today</div>
            <button type="button" onClick={() => onOpen?.("nutrition-dashboard")} className="text-[9px] font-black text-cyan-300">Open</button>
          </div>
          <div className="mt-2 space-y-2.5">
            <ProgressLine label="Calories" value={calories} goal={calorieGoal} />
            <ProgressLine label="Protein" value={protein} goal={proteinGoal} suffix="g" />
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] font-black text-white">Recovery</div>
            <button type="button" onClick={() => onOpen?.("daily-goals")} className="text-[9px] font-black text-cyan-300">Open</button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <Droplets className="h-4 w-4 text-cyan-300" />
              <div className="mt-1 text-[13px] font-black text-white">{waterGoal ? `${Math.round(water)}/${Math.round(waterGoal)}` : Math.round(water)}</div>
              <div className="text-[8px] text-slate-500">oz water</div>
            </div>
            <div>
              <HeartPulse className="h-4 w-4 text-cyan-300" />
              <div className="mt-1 text-[13px] font-black text-white">{readiness}</div>
              <div className="text-[8px] text-slate-500">readiness</div>
            </div>
          </div>
        </section>
      </div>

      <section className="mt-3 rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/[0.08] to-cyan-500/[0.035] p-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onOpen?.("coach-chat")}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-cyan-300/30 bg-[#06101f] text-lg font-black text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,.15)]"
          >
            S
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-black uppercase tracking-[0.15em] text-cyan-300">SYNC Coach</div>
            <div className="mt-0.5 text-[11px] font-black text-white">Ask, adapt or get your briefing.</div>
          </div>
          <button
            type="button"
            onClick={() => onOpen?.("coach-chat")}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.035] text-cyan-300"
            aria-label="Speak to SYNC"
          >
            <Mic2 className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="mt-3 rounded-2xl border border-white/10 bg-white/[0.025] p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black text-white">Progress</div>
            <div className="mt-0.5 text-[9px] text-slate-500">
              {scheduledPlanItems
                ? `${completedPlanItems}/${scheduledPlanItems} planned sessions · ${planPct}%`
                : "Your weekly trend builds as you train."}
            </div>
          </div>
          <button type="button" onClick={() => onOpen?.("progress")} className="text-[9px] font-black text-cyan-300">View</button>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-600" style={{ width: `${planPct}%` }} />
        </div>
        <div className="mt-2 truncate text-[9px] text-slate-600">Latest: {latestWorkoutLabel}</div>
      </section>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <QuickAction icon={CalendarDays} label="Plan" onClick={() => onOpen?.("planner")} />
        <QuickAction icon={Utensils} label="Nutrition" onClick={() => onOpen?.("nutrition-dashboard")} />
        <QuickAction icon={Activity} label="Progress" onClick={() => onOpen?.("progress")} />
        <QuickAction icon={Dumbbell} label="Workouts" onClick={() => onOpen?.("workouts")} />
        <QuickAction icon={ShoppingBag} label="Shop" onClick={() => onOpen?.("shop")} />
        <QuickAction icon={Sparkles} label="SYNC" onClick={() => onOpen?.("coach-chat")} />
      </div>
    </section>
  );
}
