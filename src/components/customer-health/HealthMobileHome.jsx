import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import HealthStrengthProgression from "./HealthStrengthProgression";
import {
  Activity,
  BarChart3,
  BrainCircuit,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Dumbbell,
  Footprints,
  HeartPulse,
  Home,
  Mic2,
  Moon,
  Menu,
  X,
  Ruler,
  Scale,
  SmilePlus,
  Sparkles,
  UserRound,
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

const clampPct = (value) =>
  Math.max(0, Math.min(100, Math.round(num(value))));

function Ring({ value = 0, label = "", tone = "lime", mainText = "" }) {
  const pct = clampPct(value);
  return (
    <div
      className={`sw-health-ring sw-health-ring--${tone}`}
      style={{ "--ring-progress": `${pct * 3.6}deg` }}
    >
      <div className="sw-health-ring__inner">
        <strong>{mainText || `${pct}%`}</strong>
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
      <span className="sw-health-quick-log__icon"><Icon size={21} /></span>
      <span>{label}</span>
    </button>
  );
}

function HealthTab({ icon: Icon, label, active = false, onClick }) {
  return (
    <button
      type="button"
      className={`sw-health-shell-tab ${active ? "is-active" : ""}`}
      onClick={onClick}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );
}

function FlowAction({ icon: Icon, eyebrow, title, detail, status, onClick, featured = false }) {
  return (
    <button
      type="button"
      className={`sw-health-flow-action ${featured ? "is-featured" : ""}`}
      onClick={onClick}
    >
      <span className="sw-health-flow-icon"><Icon size={21} /></span>
      <span className="sw-health-flow-copy">
        <small>{eyebrow}</small>
        <b>{title}</b>
        <span>{detail}</span>
      </span>
      <span className="sw-health-flow-status">{status}</span>
      <ChevronRight size={18} />
    </button>
  );
}

function displayMeasurement(value, unit = "") {
  if (value === undefined || value === null || value === "") return "—";
  return `${value}${unit}`;
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
  const navigate = useNavigate();
  const [dayKey, setDayKey] = useState(() => localYmd());
  const [desktopPanel, setDesktopPanel] = useState("today");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [progressionOpen, setProgressionOpen] = useState(false);

  useEffect(() => {
    if (!toolsOpen && !recoveryOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") { setToolsOpen(false); setRecoveryOpen(false); }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [toolsOpen, recoveryOpen]);
  const [previousWorkout, setPreviousWorkout] = useState(null);

  const firstName =
    String(profile?.first_name || profile?.name || "")
      .trim()
      .split(/\s+/)[0] || "there";

  const weekPlan = Array.isArray(snapshot?.week_plan) ? snapshot.week_plan : [];
  const todayWorkout = currentDayWorkout(weekPlan, dayKey);
  const nextWorkout = todayWorkout;

  const workoutName = nextWorkout?.workout_name || nextWorkout?.name || "Build Today's Plan";
  const workoutMinutes = num(nextWorkout?.duration_minutes ?? nextWorkout?.minutes, 45);
  const exercises = Array.isArray(nextWorkout?.exercises) ? nextWorkout.exercises : [];
  const workoutExercises = exercises.length || num(nextWorkout?.exercise_count, 0);
  const workoutSets =
    exercises.reduce((sum, exercise) => sum + num(exercise?.sets ?? exercise?.planned_sets, 0), 0) ||
    num(nextWorkout?.set_count, 0);

  const calories = num(snapshot?.calories ?? snapshot?.calories_today, 0);
  const calorieGoal = num(snapshot?.calorie_goal ?? profile?.calorie_goal, 2400);
  const protein = num(snapshot?.protein_today ?? snapshot?.protein, 0);
  const proteinGoal = num(snapshot?.protein_goal ?? profile?.protein_goal, 136);
  const carbs = num(snapshot?.carbs_today ?? snapshot?.carbs, 0);
  const carbGoal = num(snapshot?.carb_goal ?? profile?.carb_goal, 0);
  const fat = num(snapshot?.fat_today ?? snapshot?.fat, 0);
  const fatGoal = num(snapshot?.fat_goal ?? profile?.fat_goal, 0);
  const proteinRemaining = Math.max(0, Math.round(proteinGoal - protein));
  const sleepHours = num(snapshot?.last_sleep_hours ?? snapshot?.sleep_hours, 0);
  const sleepGoal = num(snapshot?.sleep_goal_hours ?? profile?.sleep_goal_hours, 8);
  const steps = num(snapshot?.steps ?? snapshot?.steps_today, 0);
  const stepGoal = num(snapshot?.step_goal ?? profile?.step_goal, 10000);

  const readinessRaw = snapshot?.readiness_score ?? snapshot?.readiness_percent;
  const readiness = Number.isFinite(Number(readinessRaw))
    ? clampPct(readinessRaw)
    : snapshot?.readiness === "High"
    ? 87
    : snapshot?.readiness === "Medium"
    ? 74
    : 82;
  const soreness = clampPct(snapshot?.soreness_score ?? (snapshot?.soreness ? 45 : 24));
  const sleepQuality = clampPct(snapshot?.sleep_quality_score ?? (sleepHours >= sleepGoal ? 86 : sleepHours ? 72 : 78));
  const energy = clampPct(snapshot?.energy_score ?? (snapshot?.energy === "High" ? 91 : 84));

  const latestCompleted = useMemo(
    () =>
      [...(Array.isArray(history) ? history : [])]
        .filter((item) => item?.completed_at || item?.finished_at)
        .sort((a, b) =>
          new Date(b?.completed_at || b?.finished_at || 0).getTime() -
          new Date(a?.completed_at || a?.finished_at || 0).getTime()
        )[0] || null,
    [history]
  );

  const profileFields = [
    profile?.age,
    profile?.sex,
    profile?.height_ft,
    profile?.weight || snapshot?.weight,
    profile?.primary_goal || snapshot?.goal,
    profile?.training_location,
    profile?.nutrition_goal,
    profile?.sleep_goal_hours || snapshot?.sleep_goal_hours,
  ];
  const profileCompletion = Math.round(
    (profileFields.filter((value) => value !== undefined && value !== null && value !== "").length /
      profileFields.length) *
      100
  );
  const planReady = Boolean(snapshot?.ai_plan_ready || weekPlan.length);
  const voicePreference = profile?.coach_voice_preference || snapshot?.coach_voice_preference || "australian_female";
  const voiceLabel = voicePreference === "australian_female" ? "Australian Female" : "Female Trainer";

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
        console.warn("Health day rollover unavailable.", error);
      }
    }
    refreshDay();
    const interval = window.setInterval(refreshDay, 60000);
    const onVisible = () => document.visibilityState === "visible" && refreshDay();
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
        id: previousWorkout.planner_item_id || previousWorkout.session?.planner_item_id || previousWorkout.session?.id,
        workout_id: previousWorkout.workout_id || previousWorkout.session?.workout_id || "",
        ymd: previousWorkout.session?.scheduled_ymd || previousWorkout.session?.ymd || "",
        workout_name: previousWorkout.session?.workout_name || "Previous workout",
      }
    : null;

  const insight =
    snapshot?.trainer_insight ||
    snapshot?.ai_coach_insight ||
    (latestCompleted
      ? "Your recent training is logged. SYNC can use recovery, nutrition and performance to adjust the next session."
      : "Complete your profile, build your first plan, and log the day. SYNC will adapt workouts, nutrition and recovery around you.");

  function openTodayMission() {
    if (resumePreviousWorkout) { onStartWorkout?.(resumePreviousWorkout); return; }
    if (decision?.needsRebuild || !todayWorkout) { onOpen?.("plan-today"); return; }
    onStartWorkout?.(todayWorkout);
  }

  function openQuick(type, fallback) {
    if (onQuickLog) {
      onQuickLog(type);
      return;
    }
    onOpen?.(fallback);
  }

  return (
    <section className="syncfit-lobby" aria-label="SYNCFIT training lobby">
      <header className="syncfit-lobby-head">
        <div><small>ATHLETE HQ · SYNCFIT</small><strong>{firstName}</strong></div>
        <div className="syncfit-head-actions"><button type="button" className="syncfit-desktop-home" onClick={() => navigate("/customer")} aria-label="Return to SyncWorks home"><Home size={20}/></button><button type="button" onClick={() => onOpen?.("planner")} aria-label="Workout planner and calendar"><CalendarDays size={20}/></button><button type="button" onClick={() => onOpen?.("progress")} aria-label="Workout progress"><BarChart3 size={20}/></button><button type="button" onClick={() => setToolsOpen(true)} aria-label="Open training tools"><Menu size={22}/></button></div>
      </header>
      <div className="syncfit-arena">
        <div className="syncfit-arena-light" aria-hidden="true" />
        <img className="syncfit-arena-mark" src="/health/brand/syncfit-mark.svg" alt=""/>
        <div className="syncfit-arena-copy"><small>DAILY MISSION</small><h1>{resumePreviousWorkout ? resumePreviousWorkout.workout_name : workoutName}</h1><span>{nextWorkout ? `${workoutExercises || "—"} exercises · ${workoutMinutes} min` : "Build your personalized training plan"}</span></div>
        <button className="syncfit-arena-coach" type="button" onClick={() => onOpen?.("coach-chat")} aria-label="Talk to SYNCFIT fitness coach"><img src="/jarvis-avatars/sarahgym1.png" alt=""/><span>SYNCFIT</span></button>
      </div>
      <div className="syncfit-mission-grid" aria-label="Training zones">
        <button type="button" onClick={openTodayMission}><Dumbbell/><strong>TRAIN</strong><small>{snapshot?.workout_completed_today ? "Complete" : "Today"}</small></button>
        <button type="button" onClick={() => onOpen?.("nutrition-dashboard")}><Utensils/><strong>NUTRITION</strong><small>{Math.round(protein)} / {Math.round(proteinGoal)}g P</small></button>
        <button type="button" onClick={() => { setToolsOpen(false); setRecoveryOpen(v=>!v); }}><HeartPulse/><strong>RECOVER</strong><small>{sleepHours ? `${sleepHours}h sleep` : "Check in"}</small></button>
      </div>
      <div className="syncfit-objectives" aria-label="Daily objectives">
        <div><span>DAILY OBJECTIVES</span><button type="button" onClick={() => onOpen?.("quick-log")}>Log <ChevronRight size={14}/></button></div>
        {[
          ["Training", snapshot?.workout_completed_today ? 100 : 0, () => onOpen?.("my-workouts")],
          ["Protein", proteinGoal ? clampPct(protein / proteinGoal * 100) : 0, () => openQuick("meal","nutrition-coach")],
          ["Steps", stepGoal ? clampPct(steps / stepGoal * 100) : 0, () => openQuick("steps","daily-goals")]
        ].map(([label,pct,action]) => <button type="button" key={label} onClick={action}><span>{label}</span><span className="syncfit-meter"><i style={{width:pct+"%"}}/></span><small>{pct}%</small></button>)}
      </div>
      <button type="button" className="syncfit-start-mission" onClick={openTodayMission}>{resumePreviousWorkout ? "RESUME MISSION" : nextWorkout && !decision?.needsRebuild ? "START TODAY’S WORKOUT" : "PLAN TODAY’S WORKOUT"} <ChevronRight size={20}/></button>
      {toolsOpen ? (
        <div className="sw-health-tools-layer" role="presentation">
          <button type="button" className="sw-health-tools-backdrop"
            aria-label="Close Health tools" onClick={() => setToolsOpen(false)} />
          <aside className="sw-health-tools-drawer" role="dialog" aria-modal="true"
            aria-label="SyncWorks Health tools">
            <div className="sw-health-tools-head">
              <div>
                <small>SYNCFIT</small>
                <h2>Command Center</h2>
                <p>Choose where to go. Your workout stays available.</p>
              </div>
              <button type="button" className="sw-health-tools-close"
                aria-label="Close Health tools" onClick={() => setToolsOpen(false)}><X size={22} /></button>
            </div>
            <div className="sw-health-tools-grid">
              {[
                { label: "Start Workout", detail: "Launch your guided session", icon: Dumbbell, action: openTodayMission },
                { label: "Workout Library", detail: "Exercises and previous sessions", icon: Activity, action: () => onOpen?.("my-workouts") },
                { label: "Build My Plan", detail: "Set up or revise your training", icon: CalendarDays, action: () => onOpen?.("questionnaire") },
                { label: "Workout Calendar", detail: "Review and schedule your training plan", icon: CalendarDays, action: () => onOpen?.("planner") },
                { label: "SyncWorks Calendar", detail: "Open your main calendar", icon: CalendarDays, action: () => navigate("/calendar") },
                { label: "Workout Logs", detail: "Completed workouts, weights and reps", icon: ClipboardCheck, action: () => onOpen?.("workout-history") },
                { label: "Nutrition", detail: "Meals, macros and food logging", icon: Utensils, action: () => onOpen?.("nutrition-dashboard") },
                { label: "Meal Plan", detail: "Build and review your nutrition plan", icon: Utensils, action: () => onOpen?.("meal-planner") },
                { label: "Nutrition Goals", detail: "Calories, macros and dietary preferences", icon: Utensils, action: () => onOpen?.("nutrition-goals") },
                { label: "Recovery", detail: "Sleep and daily check-in", icon: Moon, action: () => onOpen?.("daily-goals") },
                { label: "Body Metrics", detail: "Measurements and health profile", icon: Scale, action: () => onOpen?.("profile-intake") },
                { label: "Performance", detail: "Trends, progress and records", icon: BarChart3, action: () => onOpen?.("progress") },
                { label: "Strength Progression", detail: "Personal weights, reps and improvement", icon: BarChart3, action: () => setProgressionOpen(true) },
                { label: "SYNCFIT Coach", detail: "Ask questions and adjust your plan", icon: BrainCircuit, action: () => onOpen?.("coach-chat") },
              ].map(({label,detail,icon:Icon,action}) => (
                <button key={label} type="button" className="sw-health-tool-item"
                  onClick={() => { setToolsOpen(false); action(); }}>
                  <span className="sw-health-tool-icon"><Icon size={20} /></span>
                  <span className="sw-health-tool-text"><strong>{label}</strong><small>{detail}</small></span>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
          </aside>
        </div>
      ) : null}
      <HealthStrengthProgression open={progressionOpen} onClose={() => setProgressionOpen(false)} />

      {recoveryOpen ? (
        <div className="sw-health-tools-layer sw-health-recovery-layer" role="presentation">
          <button type="button" className="sw-health-tools-backdrop"
            aria-label="Close recovery details" onClick={() => setRecoveryOpen(false)} />
          <aside className="sw-health-tools-drawer sw-health-recovery-drawer" role="dialog"
            aria-modal="true" aria-label="Readiness and recovery details">
            <div className="sw-health-tools-head">
              <div><small>SYNCFIT</small><h2>Readiness & Recovery</h2>
                <p>Your current recovery snapshot and daily check-in.</p></div>
              <button type="button" className="sw-health-tools-close"
                aria-label="Close recovery details" onClick={() => setRecoveryOpen(false)}><X size={22} /></button>
            </div>
            <div className="sw-health-recovery-content">
              <div className="sw-health-recovery-score">
                <Ring value={readiness} label="Readiness" />
                <p>Readiness is an estimate based on available check-in data, not a medical assessment.</p>
              </div>
              <div className="sw-health-recovery-breakdown">
                <MetricBar label="Soreness" value={100 - soreness} detail={soreness < 40 ? "Low" : soreness < 65 ? "Med" : "High"} />
                <MetricBar label="Sleep quality" value={sleepQuality} detail={sleepQuality > 78 ? "Good" : "Fair"} />
                <MetricBar label="Energy" value={energy} detail={energy > 84 ? "High" : "Good"} />
              </div>
              <button type="button" className="sw-health-recovery-checkin"
                onClick={() => { setRecoveryOpen(false); onOpen?.("daily-goals"); }}>
                <HeartPulse size={18} /> Update daily recovery check-in <ChevronRight size={16} />
              </button>
              <button type="button" className="sw-health-recovery-sleep"
                onClick={() => { setRecoveryOpen(false); onOpen?.("sleep"); }}>
                <Moon size={18} /> Review sleep planner <ChevronRight size={16} />
              </button>
            </div>
          </aside>
        </div>
      ) : null}


    </section>
  );
}
