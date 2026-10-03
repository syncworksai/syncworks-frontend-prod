import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BrainCircuit,
  ChevronRight,
  Dumbbell,
  Footprints,
  Moon,
  Scale,
  SmilePlus,
  Sparkles,
  Utensils,
} from "lucide-react";
import {
  archiveExpiredCloudWorkout,
  loadCloudActiveWorkout,
} from "./healthWorkoutCloudSync";
import {
  currentDayWorkout,
  localYmd,
  shouldOfferPreviousWorkout,
} from "./healthWorkoutDateLifecycle";

const num = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clampPct = (value) => Math.max(0, Math.min(100, Math.round(num(value))));

function Ring({ value = 0, label = "", tone = "lime" }) {
  const pct = clampPct(value);
  return (
    <div
      className={`sw-health-ring sw-health-ring--${tone}`}
      style={{ "--ring-progress": `${pct * 3.6}deg` }}
    >
      <div className="sw-health-ring__inner">
        <strong>{pct}%</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function MetricBar({ label, value = 0, detail }) {
  return (
    <div className="sw-health-readiness-row">
      <span>{label}</span>
      <div className="sw-health-readiness-track">
        <div style={{ width: `${clampPct(value)}%` }} />
      </div>
      <b>{detail}</b>
    </div>
  );
}

function QuickLog({ icon: Icon, label, active = false, onClick }) {
  return (
    <button
      type="button"
      className={`sw-health-quick-log ${active ? "is-active" : ""}`}
      onClick={onClick}
    >
      <span className="sw-health-quick-log__icon"><Icon size={19} /></span>
      <span>{label}</span>
    </button>
  );
}

export default function HealthMobileHome({
  profile = {},
  snapshot = {},
  history = [],
  decision = null,
  onOpen,
  onStartWorkout,
  onShowInsights,
  onQuickLog,
  onEditDailyGoals,
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

  const workoutName = nextWorkout?.workout_name || "Build Today's Plan";
  const workoutMinutes = num(nextWorkout?.duration_minutes ?? nextWorkout?.minutes, 45);
  const exercises = Array.isArray(nextWorkout?.exercises) ? nextWorkout.exercises : [];
  const workoutExercises = exercises.length || num(nextWorkout?.exercise_count, 0);
  const workoutSets = exercises.reduce(
    (sum, exercise) => sum + num(exercise?.sets ?? exercise?.planned_sets, 0),
    0
  );

  const calories = num(snapshot?.calories ?? snapshot?.calories_today, 0);
  const calorieGoal = num(snapshot?.calorie_goal ?? profile?.calorie_goal, 2400);
  const protein = num(snapshot?.protein_today ?? snapshot?.protein, 0);
  const proteinGoal = num(snapshot?.protein_goal ?? profile?.protein_goal, 136);
  const proteinRemaining = Math.max(0, Math.round(proteinGoal - protein));
  const steps = num(snapshot?.steps ?? snapshot?.steps_today, 0);
  const stepGoal = num(snapshot?.step_goal ?? profile?.step_goal, 10000);
  const sleepHours = num(snapshot?.last_sleep_hours ?? snapshot?.sleep_hours, 0);
  const sleepGoal = num(snapshot?.sleep_goal_hours ?? profile?.sleep_goal_hours, 8);

  const readinessRaw = snapshot?.readiness_score ?? snapshot?.readiness_percent;
  const readiness = Number.isFinite(Number(readinessRaw))
    ? clampPct(readinessRaw)
    : snapshot?.readiness === "High"
    ? 87
    : snapshot?.readiness === "Medium"
    ? 68
    : 74;

  const soreness = clampPct(snapshot?.soreness_score ?? (snapshot?.soreness ? 45 : 28));
  const sleepQuality = clampPct(snapshot?.sleep_quality_score ?? (sleepHours >= sleepGoal ? 82 : 66));
  const energy = clampPct(snapshot?.energy_score ?? (snapshot?.energy === "High" ? 88 : 76));

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
          setPreviousWorkout({ ...active, session: lifecycle.session, label: lifecycle.label });
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
        ymd: previousWorkout.session?.scheduled_ymd || previousWorkout.session?.ymd || "",
        workout_name: previousWorkout.session?.workout_name || "Previous workout",
      }
    : null;

  const insight =
    snapshot?.trainer_insight ||
    snapshot?.ai_coach_insight ||
    (latestCompleted
      ? `Your recent training is logged. I’ll use it to balance today’s intensity and avoid repeating the same muscle groups too soon.`
      : "Build your first plan and I’ll adapt training, nutrition and recovery as you log your days.");

  function openQuick(type, fallback) {
    if (onQuickLog) {
      onQuickLog(type);
      return;
    }
    onOpen?.(fallback);
  }

  return (
    <section className="sw-health-home lg:hidden text-white">
      <section className="sw-health-hero">
        <img
          className="sw-health-hero__logo"
          src="/health/syncworks-health-s-glow.png"
          alt=""
          aria-hidden="true"
        />
        <div className="sw-health-hero__copy">
          <div className="sw-health-eyebrow">Ready to</div>
          <h1>Level up?</h1>
          <p>What’s the plan today, {firstName}?</p>
          <span>Stronger habits. A healthier you.</span>
        </div>
        <button type="button" className="sw-health-ai-pill" onClick={() => onOpen?.("coach-chat")}>
          <BrainCircuit size={17} /> AI Coach <ChevronRight size={15} />
        </button>
      </section>

      <section className="sw-health-panel sw-health-quick-panel">
        <div className="sw-health-section-head">
          <span>Today at a glance</span>
          <button type="button" onClick={onEditDailyGoals}>Log progress <ChevronRight size={13} /></button>
        </div>
        <div className="sw-health-quick-grid">
          <QuickLog icon={Dumbbell} label="Workout" active onClick={() => nextWorkout ? onStartWorkout?.(nextWorkout) : onOpen?.("plan-today")} />
          <QuickLog icon={Utensils} label="Nutrition" onClick={() => openQuick("meal", "nutrition-coach")} />
          <QuickLog icon={Footprints} label="Steps" onClick={() => openQuick("steps", "daily-goals")} />
          <QuickLog icon={Moon} label="Sleep" onClick={() => openQuick("sleep", "sleep")} />
          <QuickLog icon={Scale} label="Weight" onClick={() => openQuick("weight", "progress")} />
          <QuickLog icon={SmilePlus} label="Mood" onClick={() => openQuick("mood", "daily-goals")} />
        </div>
      </section>

      {decision?.revised ? (
        <button
          type="button"
          onClick={() => decision?.needsRebuild ? onOpen?.("planner") : onStartWorkout?.(decision?.workout)}
          className="sw-health-adaptive-alert"
        >
          <Sparkles size={17} />
          <span><b>SYNC adjusted today</b>{decision?.reason || "Your plan was adapted around recovery."}</span>
          <ChevronRight size={17} />
        </button>
      ) : null}

      {previousWorkout && resumePreviousWorkout ? (
        <button type="button" className="sw-health-resume" onClick={() => onStartWorkout?.(resumePreviousWorkout)}>
          <Activity size={17} />
          <span><b>{previousWorkout.label || "Yesterday — incomplete"}</b>{resumePreviousWorkout.workout_name}</span>
          <strong>Resume</strong>
        </button>
      ) : null}

      <section className="sw-health-panel sw-health-workout-card">
        <div className="sw-health-workout-copy">
          <div className="sw-health-eyebrow">Today’s workout</div>
          <h2>{workoutName}</h2>
          <div className="sw-health-workout-stats">
            <div><b>{workoutExercises || 5}</b><span>Exercises</span></div>
            <div><b>{workoutSets || 16}</b><span>Sets</span></div>
            <div><b>{workoutMinutes || 45}</b><span>Min est.</span></div>
          </div>
          <button
            type="button"
            className="sw-health-primary"
            onClick={() => nextWorkout ? onStartWorkout?.(nextWorkout) : onOpen?.("plan-today")}
          >
            {nextWorkout ? "Start workout" : "Build today’s workout"} <ChevronRight size={17} />
          </button>
        </div>
        <div className="sw-health-workout-art">
          <img src="/health/exercises/bench-press/bench-press-hero.png" alt="Bench press exercise" />
          <span>Push<br /><small>Chest · Shoulders · Triceps</small></span>
        </div>
      </section>

      <section className="sw-health-panel sw-health-readiness-card">
        <div className="sw-health-section-title">Readiness & recovery</div>
        <div className="sw-health-readiness-layout">
          <Ring value={readiness} label="Readiness" />
          <div className="sw-health-readiness-metrics">
            <MetricBar label="Soreness" value={100 - soreness} detail={soreness < 45 ? "Low" : "Med"} />
            <MetricBar label="Sleep quality" value={sleepQuality} detail={sleepQuality > 74 ? "Good" : "Fair"} />
            <MetricBar label="Energy" value={energy} detail={energy > 80 ? "High" : "Good"} />
            <button type="button" className="sw-health-secondary" onClick={() => onOpen?.("daily-goals")}>Check in now <ChevronRight size={16} /></button>
          </div>
        </div>
      </section>

      <div className="sw-health-dual-grid">
        <section className="sw-health-panel sw-health-mini-card">
          <div className="sw-health-section-title">Nutrition</div>
          <div className="sw-health-mini-body">
            <Ring value={proteinGoal ? (protein / proteinGoal) * 100 : 0} label="Protein" />
            <div><b>{proteinRemaining}g</b><span>protein remaining</span><small>{Math.round(calories).toLocaleString()} / {Math.round(calorieGoal).toLocaleString()} cal</small></div>
          </div>
          <button type="button" className="sw-health-secondary" onClick={() => onOpen?.("nutrition-coach")}>Log meal <ChevronRight size={15} /></button>
        </section>

        <section className="sw-health-panel sw-health-mini-card sw-health-sleep-card">
          <div className="sw-health-section-title">Sleep & recovery</div>
          <div className="sw-health-mini-body">
            <Ring value={sleepGoal ? (sleepHours / sleepGoal) * 100 : 0} label="Sleep" tone="violet" />
            <div><b>{sleepHours ? `${sleepHours.toFixed(1)}h` : "—"}</b><span>last night</span><small>{sleepGoal}h target</small></div>
          </div>
          <button type="button" className="sw-health-secondary" onClick={() => onOpen?.("sleep")}>Sleep planner <ChevronRight size={15} /></button>
        </section>
      </div>

      <button type="button" className="sw-health-insight" onClick={() => onOpen?.("coach-chat")}>
        <span className="sw-health-insight__icon"><BrainCircuit size={20} /></span>
        <span><b>AI Coach insight</b>{insight}</span>
        <ChevronRight size={18} />
      </button>

      <section className="sw-health-panel sw-health-week-card">
        <div className="sw-health-section-head">
          <span>This week</span>
          <button type="button" onClick={() => onOpen?.("planner")}>Open plan <ChevronRight size={13} /></button>
        </div>
        <div className="sw-health-week-strip">
          {[...weekPlan].slice(0, 5).map((item, index) => (
            <button key={item?.id || index} type="button" onClick={() => item?.status !== "Completed" && onStartWorkout?.(item)}>
              <small>{item?.day_label || String(item?.ymd || "").slice(5)}</small>
              <b>{item?.workout_name || "Recovery"}</b>
              <span className={item?.status === "Completed" ? "is-done" : ""}>{item?.status || "Planned"}</span>
            </button>
          ))}
          {!weekPlan.length ? (
            <button type="button" className="sw-health-empty-week" onClick={() => onOpen?.("questionnaire")}>
              <Sparkles size={18} /><b>Build my plan</b><span>2-minute setup</span>
            </button>
          ) : null}
        </div>
      </section>

      <div className="sw-health-home-actions">
        <button type="button" onClick={() => onOpen?.("questionnaire")}><Sparkles size={15} /> Build / adjust plan</button>
        <button type="button" onClick={onShowInsights || (() => onOpen?.("progress"))}>View progress <ChevronRight size={14} /></button>
      </div>
    </section>
  );
}
