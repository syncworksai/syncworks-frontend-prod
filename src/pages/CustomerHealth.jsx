// src/pages/CustomerHealth.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import ModeBar from "../components/ModeBar";
import { useAuth } from "../auth/AuthContext";

import {
  getCustomerHealthProfile,
  patchCustomerHealthProfile,
  redeemHealthAccessCode,
} from "../api/customerHealth";

import { buildHealthAchievements } from "../components/customer-health/healthAchievements";
import {
  countWorkoutsThisWeek,
  createNextWeekFromSnapshot,
  ensureCurrentHealthDay,
  ensureCurrentHealthWeek,
} from "../components/customer-health/healthDailyLifecycle";

import HealthConfetti from "../components/customer-health/HealthConfetti";
import TodayPlanDrawer from "../components/customer-health/TodayPlanDrawer";
import HealthDashboard from "../components/customer-health/HealthDashboard";
import HealthProgressCharts from "../components/customer-health/HealthProgressCharts";
import HealthHome from "../components/customer-health/HealthHome";
import PlanTodayWorkoutDrawer from "../components/customer-health/PlanTodayWorkoutDrawer";
import PreWorkoutCheckInDrawer from "../components/customer-health/PreWorkoutCheckInDrawer";
import HealthProfileIntakeDrawer from "../components/customer-health/HealthProfileIntakeDrawer";
import HealthQuickLogDrawer from "../components/customer-health/HealthQuickLogDrawer";
import NutritionCoachDrawer from "../components/customer-health/NutritionCoachDrawer";
import NutritionDashboard from "../components/customer-health/NutritionDashboard";
import NutritionGoalsDrawer from "../components/customer-health/NutritionGoalsDrawer";
import SmartMealPlannerDrawer from "../components/customer-health/SmartMealPlannerDrawer";
import AICoachUpgradeDrawer from "../components/customer-health/AICoachUpgradeDrawer";
import HealthPlannerDrawer from "../components/customer-health/HealthPlannerDrawer";
import QuestionnaireDrawer from "../components/customer-health/QuestionnaireDrawer";
import WorkoutStudioDrawer from "../components/customer-health/WorkoutStudioDrawer";
import ExerciseLibraryDrawer from "../components/customer-health/ExerciseLibraryDrawer";
import AiCoachDrawer from "../components/customer-health/AiCoachDrawer";
import CoachChatDrawer from "../components/customer-health/CoachChatDrawer";
import ActiveWorkoutSessionDrawer from "../components/customer-health/ActiveWorkoutSessionDrawer";
import HealthMobileQuickNav from "../components/customer-health/HealthMobileQuickNav";
import "../components/customer-health/healthUiPolish.css";
import { buildAdaptiveWorkout } from "../components/customer-health/healthAdaptiveWorkoutGenerator";
import {
  backupHealthHistory,
  getHealthHistoryBackup,
  mergeHealthHistory,
} from "../components/customer-health/healthHistorySync";
import SleepPlannerDrawer from "../components/customer-health/SleepPlannerDrawer";
import WorkoutHistoryDrawer from "../components/customer-health/WorkoutHistoryDrawer";
import CardioActivityDrawer from "../components/customer-health/CardioActivityDrawer";
import HealthGoalCenterDrawer from "../components/customer-health/HealthGoalCenterDrawer";

import {
  NutritionDrawer,
  ProgressDrawer,
  StepsDrawer,
} from "../components/customer-health/MetricDrawers";

import {
  DevicesDrawer,
  SynopsisDrawer,
} from "../components/customer-health/SynopsisDeviceDrawers";

import {
  DEVICE_KEY,
  HEALTH_LOGO_URL,
  HISTORY_KEY,
  PROFILE_KEY,
  PROGRESS_KEY,
  SNAPSHOT_KEY,
  STRIPE_HEALTH_CHECKOUT_URL,
  WORKOUTS_KEY,
  buildStarterWeekPlan,
  defaultDevices,
  defaultProfile,
  defaultSnapshot,
  defaultWorkouts,
  readJson,
  todayYmd,
  uid,
  writeJson,
} from "../components/customer-health/healthStorage";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function isPlainObject(value) {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function hasObjectData(value) {
  return (
    isPlainObject(value) &&
    Object.keys(value).length > 0
  );
}

function hasArrayData(value) {
  return Array.isArray(value) && value.length > 0;
}

function getApiErrorMessage(
  error,
  fallback = "Something went wrong."
) {
  const data = error?.response?.data;

  if (
    typeof data?.detail === "string" &&
    data.detail.trim()
  ) {
    return data.detail.trim();
  }

  if (typeof data === "string" && data.trim()) {
    return data.trim();
  }

  if (data && typeof data === "object") {
    for (const value of Object.values(data)) {
      if (
        typeof value === "string" &&
        value.trim()
      ) {
        return value.trim();
      }

      if (
        Array.isArray(value) &&
        value.length
      ) {
        return String(value[0] || fallback);
      }
    }
  }

  if (
    typeof error?.message === "string" &&
    error.message.trim()
  ) {
    return error.message.trim();
  }

  return fallback;
}

function findNextPlanned(weekPlan = []) {
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
    .filter(
      (item) =>
        Number.isFinite(item.sortTime) &&
        item.sortTime >= startOfToday
    )
    .sort((a, b) => a.sortTime - b.sortTime)[0];
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function asYmd(date) {
  const yyyy = date.getFullYear();
  const mm = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const dd = String(
    date.getDate()
  ).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function normalizeCoachWorkoutName(workout) {
  return (
    workout?.workout_name ||
    workout?.title ||
    workout?.name ||
    workout?.focus ||
    "Coach Planned Workout"
  );
}

function convertCoachWorkoutToPlannerItem(
  workout,
  index = 0
) {
  const now = new Date();
  const date = addDays(now, index);

  const names = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
  ];

  return {
    id:
      workout?.planner_id ||
      workout?.id ||
      uid("coach-plan"),

    ymd:
      workout?.ymd ||
      asYmd(date),

    day_label:
      workout?.day_label ||
      names[date.getDay()],

    workout_id:
      workout?.workout_id ||
      workout?.id ||
      "",

    workout_name:
      normalizeCoachWorkoutName(workout),

    time:
      workout?.time ||
      "06:00",

    status:
      workout?.status === "added_to_planner"
        ? "Planned"
        : workout?.status || "Planned",

    note:
      workout?.note ||
      workout?.focus ||
      "Built by SyncWorks AI Fitness Coach",

    source: "coach_chat",

    duration_minutes:
      workout?.duration_minutes ||
      "",

    exercises:
      Array.isArray(workout?.exercises)
        ? workout.exercises
        : [],

    added_to_planner_at:
      workout?.added_to_planner_at ||
      new Date().toISOString(),
  };
}

function normalizeWeekPlanForDashboard(weekPlan) {
  if (Array.isArray(weekPlan)) {
    return weekPlan;
  }

  if (isPlainObject(weekPlan)) {
    const possibleWorkouts =
      Array.isArray(weekPlan.workouts)
        ? weekPlan.workouts
        : Array.isArray(weekPlan.days)
        ? weekPlan.days
        : [];

    return possibleWorkouts.map(
      (workout, index) =>
        convertCoachWorkoutToPlannerItem(
          workout,
          index
        )
    );
  }

  return [];
}

function normalizeHealthSnapshot(nextSnapshot) {
  const safeSnapshot = nextSnapshot || {};

  return {
    ...safeSnapshot,
    week_plan:
      normalizeWeekPlanForDashboard(
        safeSnapshot.week_plan
      ),
  };
}

function SyncStatusPill({ status }) {
  const copy = {
    local: "Local save",
    loading: "Loading cloud",
    syncing: "Syncing",
    saved: "Cloud saved",
    error: "Sync failed",
  };

  const styles = {
    local:
      "border-slate-700 bg-slate-950 text-slate-300",

    loading:
      "border-cyan-500/25 bg-cyan-500/10 text-cyan-100",

    syncing:
      "border-amber-500/25 bg-amber-500/10 text-amber-100",

    saved:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",

    error:
      "border-rose-500/25 bg-rose-500/10 text-rose-100",
  };

  return (
    <span
      className={cx(
        "rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-[0.12em]",
        styles[status] || styles.local
      )}
    >
      {copy[status] || "Local save"}
    </span>
  );
}

function HealthSignupScreen({
  onBack,
  onRedeem,
  redeeming,
  redeemError,
  redeemSuccess,
}) {
  const [accessCode, setAccessCode] =
    useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    const cleanCode = String(
      accessCode || ""
    )
      .trim()
      .toUpperCase();

    if (!cleanCode || redeeming) {
      return;
    }

    await onRedeem(cleanCode);
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[1.85rem] border border-cyan-400/25 bg-slate-950/70 p-5 shadow-[0_18px_70px_rgba(0,0,0,0.32)] md:p-7">
        <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-emerald-500/14 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/4 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute right-1/4 top-1/3 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />

        <div className="relative">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <img
                  src={HEALTH_LOGO_URL}
                  alt="Health & Fitness"
                  className="h-16 w-16 rounded-2xl border border-emerald-400/25 object-cover"
                />

                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-200">
                    SyncWorks Health
                  </div>

                  <h1 className="mt-1 text-3xl font-black tracking-tight text-white md:text-5xl">
                    Health & Fitness
                  </h1>
                </div>
              </div>

              <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
                A daily-use health hub with an AI
                fitness coach, workout planning,
                goal tracking, progress logging,
                and a cleaner reason to come back
                every day.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-emerald-100">
                  30 days free
                </span>

                <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-cyan-100">
                  $2.99/month after
                </span>

                <span className="rounded-full border border-fuchsia-500/25 bg-fuchsia-500/10 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-fuchsia-100">
                  Cancel anytime
                </span>
              </div>
            </div>

            <div className="w-full shrink-0 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 lg:w-[360px]">
              <div className="text-sm font-black uppercase tracking-[0.16em] text-slate-400">
                Plan
              </div>

              <div className="mt-3 flex items-end gap-2">
                <div className="text-5xl font-black text-white">
                  $2.99
                </div>

                <div className="pb-2 text-sm font-semibold text-slate-400">
                  / month
                </div>
              </div>

              <div className="mt-2 text-sm text-emerald-200">
                First 30 days free.
              </div>

              <a
                href={STRIPE_HEALTH_CHECKOUT_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-2xl border border-emerald-300/40 bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 text-sm font-black text-white shadow-[0_0_34px_rgba(16,185,129,0.24)] transition hover:brightness-110"
              >
                Start Free Trial
              </a>

              <form
                onSubmit={handleSubmit}
                className="mt-5 border-t border-white/10 pt-5"
              >
                <div className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                  Have a fitness access code?
                </div>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Enter your Health & Fitness
                  access code to unlock this
                  module for your account.
                </p>

                <input
                  value={accessCode}
                  onChange={(event) =>
                    setAccessCode(
                      String(
                        event.target.value || ""
                      ).toUpperCase()
                    )
                  }
                  placeholder="Enter access code"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={64}
                  className="mt-3 h-11 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm font-bold uppercase text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/60"
                />

                <button
                  type="submit"
                  disabled={
                    redeeming ||
                    !accessCode.trim()
                  }
                  className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-2xl border border-cyan-400/35 bg-cyan-500/10 px-4 text-sm font-black text-cyan-100 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {redeeming
                    ? "Checking Code..."
                    : "Unlock Health & Fitness"}
                </button>

                {redeemError ? (
                  <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs leading-5 text-rose-200">
                    {redeemError}
                  </div>
                ) : null}

                {redeemSuccess ? (
                  <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs leading-5 text-emerald-200">
                    {redeemSuccess}
                  </div>
                ) : null}
              </form>

              <button
                type="button"
                onClick={onBack}
                className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 text-sm font-black text-slate-100 transition hover:bg-white/[0.08]"
              >
                Back to Dashboard
              </button>

              <div className="mt-4 text-xs leading-5 text-slate-500">
                After checkout or successful code
                redemption, access is stored on
                your SyncWorks account.
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
          <div className="text-sm font-black text-white">
            Daily-use home screen
          </div>

          <div className="mt-2 text-sm leading-6 text-slate-400">
            Quick sight of goals, progress,
            workout plan, next session, and daily
            coach guidance.
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
          <div className="text-sm font-black text-white">
            Workout planner + calendar
          </div>

          <div className="mt-2 text-sm leading-6 text-slate-400">
            Build a weekly workout plan and send
            sessions to calendar.
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
          <div className="text-sm font-black text-white">
            AI coach + partner tools
          </div>

          <div className="mt-2 text-sm leading-6 text-slate-400">
            Better motivation, better tracking,
            plus helpful partner recommendations
            like protein and step rewards.
          </div>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
        Health guidance is fitness support, not
        medical diagnosis. Pain, injury, or
        medical limitations should be reviewed
        with a qualified professional.
      </div>
    </div>
  );
}

export default function CustomerHealth() {
  const nav = useNavigate();

  const {
    moduleAccess,
    entitlements,
    refreshEntitlements,
    isPlatformAdmin,
  } = useAuth();

  const hasHealthAccess =
    !!isPlatformAdmin ||
    !!entitlements?.health_access ||
    !!moduleAccess?.health ||
    !!moduleAccess?.fitness ||
    !!moduleAccess?.customer_health ||
    !!moduleAccess?.customerHealth;

  const [drawer, setDrawer] = useState("");
  const [healthView, setHealthView] = useState("home");
  const [quickLogType, setQuickLogType] = useState("");
  const [syncStatus, setSyncStatus] =
    useState("local");
  const [cloudLoaded, setCloudLoaded] =
    useState(false);
  const [celebration, setCelebration] =
    useState(null);

  const [
    activePlannerItem,
    setActivePlannerItem,
  ] = useState(null);

  const [cardioSuggestedPlan, setCardioSuggestedPlan] =
    useState(null);

  const [
    nutritionDraft,
    setNutritionDraft,
  ] = useState(null);

  const [
    redeemingCode,
    setRedeemingCode,
  ] = useState(false);

  const [
    redeemError,
    setRedeemError,
  ] = useState("");

  const [
    redeemSuccess,
    setRedeemSuccess,
  ] = useState("");

  const skipNextCloudSaveRef =
    useRef(false);

  const achievedMilestoneIdsRef =
    useRef(new Set());

  const intakePromptedRef =
    useRef(false);

  const [profile, setProfile] = useState(
    () => ({
      ...defaultProfile(),
      ...(readJson(PROFILE_KEY, null) || {}),
    })
  );

  const [snapshot, setSnapshotBase] =
    useState(() => {
      const savedHistory =
        readJson(HISTORY_KEY, []);

      const initialSnapshot =
        normalizeHealthSnapshot({
          ...defaultSnapshot(),
          ...(readJson(
            SNAPSHOT_KEY,
            null
          ) || {}),
        });

      const lifecycle =
        ensureCurrentHealthDay({
          snapshot: initialSnapshot,
          history:
            Array.isArray(savedHistory)
              ? savedHistory
              : [],
        });

      return normalizeHealthSnapshot(
        lifecycle.snapshot
      );
    });

  function setSnapshot(nextValue) {
    if (typeof nextValue === "function") {
      setSnapshotBase((previous) =>
        normalizeHealthSnapshot(
          nextValue(previous)
        )
      );

      return;
    }

    setSnapshotBase(
      normalizeHealthSnapshot(nextValue)
    );
  }

  const [workouts, setWorkouts] = useState(
    () => {
      const saved =
        readJson(WORKOUTS_KEY, null);

      if (
        Array.isArray(saved) &&
        saved.length
      ) {
        return saved.map((workout) => ({
          ...workout,
          exercises:
            Array.isArray(
              workout.exercises
            )
              ? workout.exercises
              : [],
        }));
      }

      return defaultWorkouts();
    }
  );

  const [history, setHistory] = useState(
    () => {
      const saved =
        readJson(HISTORY_KEY, []);

      const backup =
        getHealthHistoryBackup();

      const recovery =
        mergeHealthHistory({
          localHistory:
            Array.isArray(saved)
              ? saved
              : [],
          cloudHistory:
            Array.isArray(backup)
              ? backup
              : [],
        });

      return recovery.history;
    }
  );

  const [
    progressLogs,
    setProgressLogs,
  ] = useState(() => {
    const saved =
      readJson(PROGRESS_KEY, []);

    return Array.isArray(saved)
      ? saved
      : [];
  });

  const [devices, setDevices] = useState(
    () => {
      const saved =
        readJson(DEVICE_KEY, null);

      return (
        Array.isArray(saved) &&
        saved.length
      )
        ? saved
        : defaultDevices();
    }
  );

  useEffect(() => {
    if (
      !hasHealthAccess ||
      intakePromptedRef.current ||
      profile?.health_intake_completed_at
    ) {
      return;
    }

    const hasStartingProfile =
      Boolean(profile?.weight) ||
      Boolean(profile?.height_ft) ||
      Boolean(profile?.height_in) ||
      Boolean(profile?.injuries) ||
      Boolean(profile?.surgeries) ||
      Boolean(profile?.heart_conditions) ||
      Boolean(profile?.health_conditions);

    intakePromptedRef.current = true;

    if (!hasStartingProfile) {
      setDrawer("profile-intake");
    }
  }, [
    hasHealthAccess,
    profile?.health_intake_completed_at,
    profile?.weight,
    profile?.height_ft,
    profile?.height_in,
    profile?.injuries,
    profile?.surgeries,
    profile?.heart_conditions,
    profile?.health_conditions,
  ]);

  useEffect(() => {
    function runDailyLifecycle() {
      setSnapshotBase((previous) => {
        const lifecycle =
          ensureCurrentHealthDay({
            snapshot: previous,
            history,
          });

        const next =
          normalizeHealthSnapshot(
            lifecycle.snapshot
          );

        const dailyCountChanged =
          Number(
            previous.daily_workout_count ||
              0
          ) !==
          Number(
            next.daily_workout_count || 0
          );

        const dailyCompletionChanged =
          !!previous.workout_completed_today !==
          !!next.workout_completed_today;

        if (
          !lifecycle.changed &&
          !dailyCountChanged &&
          !dailyCompletionChanged
        ) {
          return previous;
        }

        return next;
      });
    }

    runDailyLifecycle();

    const timer =
      window.setInterval(
        runDailyLifecycle,
        60 * 1000
      );

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        runDailyLifecycle();
      }
    }

    window.addEventListener(
      "focus",
      runDailyLifecycle
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      window.clearInterval(timer);

      window.removeEventListener(
        "focus",
        runDailyLifecycle
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [history]);

  useEffect(() => {
    setSnapshot((previous) => {
      if (
        Array.isArray(
          previous.week_plan
        ) &&
        previous.week_plan.length
      ) {
        return previous;
      }

      const starterPlan =
        buildStarterWeekPlan(workouts);

      return {
        ...previous,

        week_plan:
          starterPlan,

        planned_workouts:
          starterPlan.filter(
            (item) =>
              item.workout_name
          ).length,
      };
    });
  }, [workouts]);

  useEffect(() => {
    setSnapshotBase((previous) => {
      const lifecycle =
        ensureCurrentHealthWeek({
          snapshot: previous,
          history,
          workouts,
          autoCreate: false,
        });

      if (!lifecycle.changed) {
        return previous;
      }

      return normalizeHealthSnapshot(
        lifecycle.snapshot
      );
    });
  }, [history, workouts]);

  const syncedSnapshot = useMemo(() => {
    const weekPlan =
      normalizeWeekPlanForDashboard(
        snapshot.week_plan
      );

    const nextSession =
      findNextPlanned(weekPlan);

    return {
      ...snapshot,

      week_plan:
        weekPlan,

      workout:
        snapshot.workout ||
        "",

      goal:
        profile.primary_goal ||
        snapshot.goal ||
        "General fitness",

      equipment:
        snapshot.equipment ||
        profile.preferred_equipment ||
        "Bodyweight",

      weekly_completed:
        countWorkoutsThisWeek(
          history
        ),

      progress_count:
        progressLogs.length,

      planned_workouts:
        weekPlan.filter(
          (item) =>
            item?.workout_name
        ).length,

      device_status:
        devices.some(
          (item) =>
            item.status ===
            "Selected for Sync"
        )
          ? "Device selected"
          : "Manual tracking active",

      next_session_note:
        nextSession
          ? `${
              nextSession.day_label
            } | ${
              nextSession.time ||
              "Anytime"
            } | ${
              nextSession.workout_name
            }`
          : "",

      updated_at:
        new Date().toISOString(),
    };
  }, [
    snapshot,
    profile,
    history,
    progressLogs.length,
    devices,
  ]);

  useEffect(() => {
    writeJson(PROFILE_KEY, profile);
  }, [profile]);

  useEffect(() => {
    writeJson(
      SNAPSHOT_KEY,
      syncedSnapshot
    );
  }, [syncedSnapshot]);

  useEffect(() => {
    writeJson(
      WORKOUTS_KEY,
      workouts
    );
  }, [workouts]);

  useEffect(() => {
    writeJson(
      HISTORY_KEY,
      history
    );
  }, [history]);

  useEffect(() => {
    writeJson(
      PROGRESS_KEY,
      progressLogs
    );
  }, [progressLogs]);

  useEffect(() => {
    writeJson(
      DEVICE_KEY,
      devices
    );
  }, [devices]);

  useEffect(() => {
    let mounted = true;

    async function loadCloudProfile() {
      if (!hasHealthAccess) {
        setCloudLoaded(false);
        setSyncStatus("local");
        return;
      }

      setSyncStatus("loading");

      try {
        const data =
          await getCustomerHealthProfile();

        if (!mounted) return;

        skipNextCloudSaveRef.current =
          true;

        const persistedLocalHistory =
          readJson(HISTORY_KEY, history);

        const backupHistory =
          getHealthHistoryBackup();

        const localHistory =
          Array.isArray(persistedLocalHistory) &&
          persistedLocalHistory.length
            ? persistedLocalHistory
            : Array.isArray(history) &&
              history.length
            ? history
            : backupHistory;

        backupHealthHistory(localHistory);

        const historyMerge =
          mergeHealthHistory({
            localHistory,
            cloudHistory:
              Array.isArray(
                data?.history_json
              )
                ? data.history_json
                : [],
          });

        const cloudHistory =
          historyMerge.history;

        if (
          hasObjectData(
            data?.profile_json
          )
        ) {
          setProfile((previous) => ({
            ...defaultProfile(),
            ...previous,
            ...data.profile_json,
          }));
        }

        if (
          hasObjectData(
            data?.snapshot_json
          )
        ) {
          setSnapshotBase(
            (previous) => {
              const mergedSnapshot =
                normalizeHealthSnapshot({
                  ...defaultSnapshot(),
                  ...previous,
                  ...data.snapshot_json,
                });

              const lifecycle =
                ensureCurrentHealthDay({
                  snapshot:
                    mergedSnapshot,

                  history:
                    cloudHistory,
                });

              return normalizeHealthSnapshot(
                lifecycle.snapshot
              );
            }
          );
        } else {
          setSnapshotBase(
            (previous) => {
              const lifecycle =
                ensureCurrentHealthDay({
                  snapshot: previous,
                  history: cloudHistory,
                });

              return normalizeHealthSnapshot(
                lifecycle.snapshot
              );
            }
          );
        }

        if (
          hasArrayData(
            data?.workouts_json
          )
        ) {
          setWorkouts(
            data.workouts_json.map(
              (workout) => ({
                ...workout,

                exercises:
                  Array.isArray(
                    workout.exercises
                  )
                    ? workout.exercises
                    : [],
              })
            )
          );
        }

        setHistory(cloudHistory);

        writeJson(
          HISTORY_KEY,
          cloudHistory
        );

        if (
          historyMerge.report.local_preserved
        ) {
          console.info(
            "Health history recovery preserved local workouts because cloud history was empty.",
            historyMerge.report
          );
        } else if (
          historyMerge.report.duplicates_merged > 0 ||
          historyMerge.report.final_count !==
            historyMerge.report.cloud_count
        ) {
          console.info(
            "Health history recovery merged local and cloud workouts.",
            historyMerge.report
          );
        }

        if (
          Array.isArray(
            data?.progress_json
          )
        ) {
          setProgressLogs(
            data.progress_json
          );
        }

        if (
          hasArrayData(
            data?.devices_json
          )
        ) {
          setDevices(
            data.devices_json
          );
        }

        setCloudLoaded(true);
        setSyncStatus("saved");
      } catch (error) {
        console.error(
          "Failed to load customer health cloud profile",
          error
        );

        if (!mounted) return;

        setCloudLoaded(false);
        setSyncStatus("error");
      }
    }

    loadCloudProfile();

    return () => {
      mounted = false;
    };
  }, [hasHealthAccess]);

  useEffect(() => {
    if (
      !hasHealthAccess ||
      !cloudLoaded
    ) {
      return undefined;
    }

    if (
      skipNextCloudSaveRef.current
    ) {
      skipNextCloudSaveRef.current =
        false;

      return undefined;
    }

    const timer =
      window.setTimeout(
        async () => {
          setSyncStatus("syncing");

          try {
            await patchCustomerHealthProfile(
              {
                profile_json:
                  profile,

                snapshot_json:
                  syncedSnapshot,

                workouts_json:
                  workouts,

                history_json:
                  history,

                progress_json:
                  progressLogs,

                devices_json:
                  devices,
              }
            );

            setSyncStatus("saved");
          } catch (error) {
            console.error(
              "Failed to save customer health cloud profile",
              error
            );

            setSyncStatus("error");
          }
        },
        900
      );

    return () =>
      window.clearTimeout(timer);
  }, [
    hasHealthAccess,
    cloudLoaded,
    profile,
    syncedSnapshot,
    workouts,
    history,
    progressLogs,
    devices,
  ]);

  useEffect(() => {
    if (!hasHealthAccess) {
      return;
    }

    const achievements =
      buildHealthAchievements({
        profile,
        snapshot:
          syncedSnapshot,
        history,
        progressLogs,
      });

    for (
      const item of
      achievements.achieved
    ) {
      if (
        !achievedMilestoneIdsRef.current.has(
          item.id
        )
      ) {
        achievedMilestoneIdsRef.current.add(
          item.id
        );

        const seenKey =
          `sw_health_milestone_seen_${item.id}_${todayYmd()}`;

        const seenToday =
          localStorage.getItem(
            seenKey
          );

        if (!seenToday) {
          localStorage.setItem(
            seenKey,
            "1"
          );

          setCelebration({
            title:
              `${item.icon} ${item.label}`,

            subtitle:
              item.description,
          });

          break;
        }
      }
    }

    for (
      const item of
      achievements.achieved
    ) {
      achievedMilestoneIdsRef.current.add(
        item.id
      );
    }
  }, [
    hasHealthAccess,
    profile,
    syncedSnapshot,
    history,
    progressLogs,
  ]);

  async function handleRedeemHealthCode(
    code
  ) {
    const cleanCode = String(
      code || ""
    )
      .trim()
      .toUpperCase();

    setRedeemError("");
    setRedeemSuccess("");

    if (!cleanCode) {
      setRedeemError(
        "Enter a Health & Fitness access code."
      );
      return;
    }

    setRedeemingCode(true);

    try {
      const result =
        await redeemHealthAccessCode(
          cleanCode
        );

      setRedeemSuccess(
        result?.detail ||
          "Health & Fitness has been unlocked."
      );

      await refreshEntitlements();
    } catch (error) {
      setRedeemError(
        getApiErrorMessage(
          error,
          "Unable to redeem this access code."
        )
      );
    } finally {
      setRedeemingCode(false);
    }
  }

  function addExerciseFromLibrary(
    exercise
  ) {
    setWorkouts((previous) => {
      const targetId =
        snapshot.today_workout_id ||
        previous[0]?.id;

      if (!targetId) {
        return [
          {
            id:
              uid("w"),

            name:
              "Custom Workout",

            duration:
              "30",

            focus:
              exercise.group,

            status:
              "Planned",

            exercises: [
              {
                name:
                  exercise.name,

                sets:
                  "3",

                reps:
                  "10",

                weight:
                  "",

                rest:
                  "60 sec",

                notes:
                  `Focus: ${exercise.feel}`,

                difficulty:
                  "Medium",

                pain:
                  "0",
              },
            ],
          },
        ];
      }

      return previous.map(
        (workout) => {
          if (
            workout.id !== targetId
          ) {
            return workout;
          }

          return {
            ...workout,

            exercises: [
              ...(workout.exercises ||
                []),

              {
                name:
                  exercise.name,

                sets:
                  "3",

                reps:
                  "10",

                weight:
                  "",

                rest:
                  "60 sec",

                notes:
                  `Focus: ${exercise.feel}`,

                difficulty:
                  "Medium",

                pain:
                  "0",
              },
            ],
          };
        }
      );
    });

    setDrawer("workout");
  }

  function openQuestionnaireFromCoach() {
    setDrawer("questionnaire");
  }

  function getMealTotalsForDate(
    logs,
    ymd
  ) {
    return (
      Array.isArray(logs) ? logs : []
    )
      .filter(
        (item) =>
          item?.type === "meal" &&
          item?.ymd === ymd
      )
      .reduce(
        (totals, meal) => ({
          calories:
            totals.calories +
            Number(
              meal?.calories ??
                meal?.value ??
                0
            ),
          protein:
            totals.protein +
            Number(
              meal?.protein ??
                meal?.secondary ??
                0
            ),
          carbs:
            totals.carbs +
            Number(meal?.carbs || 0),
          fat:
            totals.fat +
            Number(meal?.fat || 0),
        }),
        {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        }
      );
  }

  function syncTodayNutritionFromLogs(
    logs
  ) {
    const totals =
      getMealTotalsForDate(
        logs,
        todayYmd()
      );

    setSnapshot((previous) => ({
      ...previous,
      calories: totals.calories,
      protein_today: totals.protein,
      carbs_today: totals.carbs,
      fat_today: totals.fat,
      last_quick_log_at:
        new Date().toISOString(),
    }));
  }

  function handleNutritionMealSave(
    entry = {}
  ) {
    const ymd =
      entry?.ymd || todayYmd();

    const createdAt =
      new Date().toISOString();

    const mealEntry = {
      id:
        entry?.replace_id ||
        uid("health-meal"),
      type: "meal",
      ymd,
      value:
        Number(entry?.value || 0),
      secondary:
        Number(entry?.secondary || 0),
      note: entry?.note || "",
      description:
        entry?.note || "",
      calories:
        Number(entry?.value || 0),
      protein:
        Number(entry?.secondary || 0),
      carbs:
        Number(entry?.carbs || 0),
      fat:
        Number(entry?.fat || 0),
      estimate_items:
        Array.isArray(
          entry?.estimate_items
        )
          ? entry.estimate_items
          : [],
      estimate_confidence:
        entry?.estimate_confidence ||
        "",
      source:
        entry?.source ||
        "nutrition_manual",
      created_at: createdAt,
      updated_at: createdAt,
    };

    setProgressLogs((previous) => {
      const safePrevious =
        Array.isArray(previous)
          ? previous
          : [];

      const withoutEdited =
        entry?.replace_id
          ? safePrevious.filter(
              (item) =>
                item?.id !==
                entry.replace_id
            )
          : safePrevious;

      const nextLogs = [
        ...withoutEdited,
        mealEntry,
      ];

      syncTodayNutritionFromLogs(
        nextLogs
      );

      return nextLogs;
    });

    setNutritionDraft(null);
  }

  function handleDeleteNutritionMeal(
    meal
  ) {
    if (!meal?.id) return;

    setProgressLogs((previous) => {
      const nextLogs = (
        Array.isArray(previous)
          ? previous
          : []
      ).filter(
        (item) =>
          item?.id !== meal.id
      );

      syncTodayNutritionFromLogs(
        nextLogs
      );

      return nextLogs;
    });
  }

  function handleReuseNutritionMeal(
    meal
  ) {
    if (!meal) return;

    handleNutritionMealSave({
      ymd: todayYmd(),
      note:
        meal.description ||
        meal.note ||
        "Reused meal",
      value:
        meal.calories ??
        meal.value ??
        0,
      secondary:
        meal.protein ??
        meal.secondary ??
        0,
      carbs: meal.carbs || 0,
      fat: meal.fat || 0,
      estimate_items:
        meal.estimate_items || [],
      estimate_confidence:
        meal.estimate_confidence ||
        "reused",
      source:
        "nutrition_reused_meal",
    });
  }

  function openNutritionCoach(
    meal = null
  ) {
    setNutritionDraft(meal);
    setDrawer("nutrition-coach");
  }

  function handleQuickLogSave(entry = {}) {
    const type = String(entry?.type || "");
    const ymd = entry?.ymd || todayYmd();
    const isToday = ymd === todayYmd();
    const numericValue = Number(
      String(entry?.value ?? "").replace(/[^\d.-]/g, "")
    ) || 0;
    const secondaryValue = Number(
      String(entry?.secondary ?? "").replace(/[^\d.-]/g, "")
    ) || 0;
    const createdAt = new Date().toISOString();

    const logEntry = {
      id: uid(`health-${type || "log"}`),
      type,
      ymd,
      value: numericValue,
      secondary: secondaryValue,
      note: entry?.note || "",
      bmi: entry?.bmi || "",
      created_at: createdAt,
      source: "manual_quick_log",
    };

    if (type === "meal") {
      logEntry.description = entry?.note || "";
      logEntry.calories = numericValue;
      logEntry.protein = secondaryValue;
      logEntry.carbs = Number(entry?.carbs || 0);
      logEntry.fat = Number(entry?.fat || 0);
      logEntry.estimate_items = Array.isArray(
        entry?.estimate_items
      )
        ? entry.estimate_items
        : [];
      logEntry.estimate_confidence =
        entry?.estimate_confidence || "";
      logEntry.source =
        entry?.source || logEntry.source;
    }

    setProgressLogs((previous) => [
      ...(Array.isArray(previous) ? previous : []),
      logEntry,
    ]);

    if (type === "weight") {
      setProfile((previous) => ({
        ...previous,
        weight: numericValue || previous?.weight || "",
        bmi: entry?.bmi || previous?.bmi || "",
        bmi_source: entry?.bmi
          ? "calculated"
          : previous?.bmi_source || "",
        updated_at: createdAt,
      }));
    }

    if (isToday) {
      setSnapshot((previous) => {
        const next = {
          ...previous,
          last_quick_log_at: createdAt,
        };

        if (type === "weight") {
          next.weight = numericValue;
          next.bmi = entry?.bmi || previous?.bmi || "";
        }

        if (type === "steps") {
          next.steps = numericValue;
        }

        if (type === "water") {
          next.water =
            Number(previous?.water || 0) + numericValue;
        }

        if (type === "protein") {
          next.protein_today =
            Number(previous?.protein_today || 0) +
            numericValue;
        }

        if (type === "calories") {
          next.calories =
            Number(previous?.calories || 0) + numericValue;
        }

        if (type === "sleep") {
          next.last_sleep_hours = numericValue;
          next.sleep_hours = numericValue;
        }

        if (type === "readiness") {
          next.readiness = entry?.value || "Good";
          next.pain_score = secondaryValue;
        }

        if (type === "meal") {
          next.calories =
            Number(previous?.calories || 0) + numericValue;
          next.protein_today =
            Number(previous?.protein_today || 0) +
            secondaryValue;
          next.carbs_today =
            Number(previous?.carbs_today || 0) +
            Number(entry?.carbs || 0);
          next.fat_today =
            Number(previous?.fat_today || 0) +
            Number(entry?.fat || 0);
          next.last_meal_description =
            entry?.note || previous?.last_meal_description || "";
        }

        return next;
      });
    }

    setQuickLogType("");
  }

  function handleDashboardOpen(target) {
    if (target === "home") {
      setHealthView("home");
      setDrawer("");
      return;
    }

    if (target === "insights") {
      setHealthView("insights");
      setDrawer("");
      return;
    }

    const routeMap = {
      profile: "profile-intake",
      "profile-intake": "profile-intake",
      goals: "goal-center",
      "goal-center": "goal-center",
      questionnaire: "questionnaire",
      "my-workouts": "workout",
      "workout-history": "workout-history",
      history: "workout-history",
      "build-workout": "workout",
      "plan-today": "plan-today",
      "train-muscle": "library",
      "muscle-map": "library",
      "exercise-library": "library",
      library: "library",
      progress: "progress",
      planner: "planner",
      "coach-chat": "coach-chat",
      nutrition: "nutrition-dashboard",
      "nutrition-dashboard":
        "nutrition-dashboard",
      "nutrition-goals":
        "nutrition-goals",
      "meal-planner":
        "meal-planner",
      "ai-coach-upgrade":
        "ai-coach-upgrade",
      "nutrition-coach":
        "nutrition-coach",
      cardio: "cardio-player",
      "cardio-player": "cardio-player",
    };

    setDrawer(routeMap[target] || target || "");
  }

  function resolveMissedWorkout(
    workout,
    action
  ) {
    if (!workout?.id || !action) return;

    const resolvedAt =
      new Date().toISOString();

    if (action === "today") {
      const todayItem = {
        ...workout,
        id: uid("moved-workout"),
        ymd: todayYmd(),
        day_label:
          new Date().toLocaleDateString(
            undefined,
            { weekday: "short" }
          ),
        time:
          new Date()
            .toTimeString()
            .slice(0, 5),
        status: "Planned",
        original_workout_id:
          workout.id,
        original_ymd:
          workout.ymd,
        moved_to_today_at:
          resolvedAt,
      };

      setSnapshot((previous) => ({
        ...previous,
        week_plan: [
          ...(
            Array.isArray(previous.week_plan)
              ? previous.week_plan.map((item) =>
                  item?.id === workout.id
                    ? {
                        ...item,
                        status: "Rescheduled",
                        rescheduled_at:
                          resolvedAt,
                        rescheduled_to:
                          todayItem.ymd,
                      }
                    : item
                )
              : []
          ),
          todayItem,
        ],
        last_workout_resolution: {
          action: "today",
          workout_id: workout.id,
          resolved_at: resolvedAt,
        },
        updated_at: resolvedAt,
      }));

      startPlannerWorkout(todayItem);
      return;
    }

    const statusByAction = {
      completed: "Completed",
      skipped: "Skipped",
      reschedule: "Rescheduled",
    };

    const nextStatus =
      statusByAction[action];

    if (!nextStatus) return;

    setSnapshot((previous) => {
      const adherenceEvent = {
        id: uid("workout-adherence"),
        workout_id: workout.id,
        workout_name:
          workout.workout_name ||
          workout.name ||
          "Workout",
        original_ymd:
          workout.ymd || "",
        action,
        status: nextStatus,
        created_at: resolvedAt,
        source:
          "missed_workout_resolution",
      };

      return {
        ...previous,
        week_plan:
          Array.isArray(previous.week_plan)
            ? previous.week_plan.map((item) =>
                item?.id === workout.id
                  ? {
                      ...item,
                      status: nextStatus,
                      resolved_at:
                        resolvedAt,
                      completed_at:
                        action === "completed"
                          ? resolvedAt
                          : item.completed_at,
                      skipped_at:
                        action === "skipped"
                          ? resolvedAt
                          : item.skipped_at,
                      rescheduled_at:
                        action === "reschedule"
                          ? resolvedAt
                          : item.rescheduled_at,
                    }
                  : item
              )
            : [],
        workout_adherence_log: [
          adherenceEvent,
          ...(
            Array.isArray(
              previous.workout_adherence_log
            )
              ? previous.workout_adherence_log
              : []
          ),
        ].slice(0, 100),
        skipped_workout_count:
          action === "skipped"
            ? Number(
                previous.skipped_workout_count ||
                0
              ) + 1
            : Number(
                previous.skipped_workout_count ||
                0
              ),
        last_workout_resolution:
          adherenceEvent,
        updated_at:
          resolvedAt,
      };
    });

    if (action === "reschedule") {
      setDrawer("planner");
    }
  }

  function buildCurrentWeek(mode = "adaptive") {
    setSnapshotBase((previous) => {
      const hasCurrentPlan =
        Array.isArray(previous.week_plan) &&
        previous.week_plan.length > 0;

      const hasArchivedPlan =
        Array.isArray(
          previous?.last_archived_week?.week_plan
        ) &&
        previous.last_archived_week.week_plan.length > 0;

      const sourceSnapshot =
        hasCurrentPlan || hasArchivedPlan
          ? previous
          : {
              ...previous,
              week_plan:
                buildStarterWeekPlan(workouts),
            };

      const result =
        createNextWeekFromSnapshot({
          snapshot: sourceSnapshot,
          history,
          workouts,
          mode,
        });

      return normalizeHealthSnapshot(
        result.snapshot
      );
    });

    setDrawer("planner");
  }

  function handleBuildNextWeek() {
    buildCurrentWeek("adaptive");
  }

  function handleRepeatLastWeek() {
    buildCurrentWeek("repeat");
  }

  function startPlannerWorkout(
    plannerItem
  ) {
    if (!plannerItem) return;

    setActivePlannerItem(
      plannerItem
    );

    setDrawer(
      "pre-workout"
    );
  }

  function startAdaptiveWorkout(
    plan
  ) {
    if (
      !plan ||
      !Array.isArray(plan.exercises) ||
      !plan.exercises.length
    ) {
      return;
    }

    const now = new Date();

    setActivePlannerItem({
      id: uid("adaptive-workout"),
      workout_id: "",
      workout_name:
        plan.title ||
        "Adaptive Workout",
      title:
        plan.title ||
        "Adaptive Workout",
      name:
        plan.title ||
        "Adaptive Workout",
      ymd: todayYmd(),
      day_label:
        now.toLocaleDateString(
          undefined,
          { weekday: "short" }
        ),
      time:
        now.toTimeString().slice(0, 5),
      status: "Planned",
      source: "adaptive_generator",
      requested_location:
        plan.requested_location || "",
      requested_duration_minutes:
        plan.requested_duration_minutes || "",
      requested_focus:
        plan.requested_focus || "",
      requested_home_equipment:
        Array.isArray(
          plan.requested_home_equipment
        )
          ? plan.requested_home_equipment
          : [],
      requested_mobility_focus:
        plan.requested_mobility_focus || "",
      recovery_status:
        plan.recovery || "",
      adaptive_focus:
        plan.focus || "",
      adaptive_reason:
        plan.reason || "",
      exercises:
        plan.exercises.map(
          (exercise, index) => ({
            ...exercise,
            id:
              exercise.id ||
              uid(
                `adaptive-exercise-${
                  index + 1
                }`
              ),
            name:
              exercise.name ||
              `Exercise ${index + 1}`,
            sets:
              exercise.planned_sets ||
              exercise.sets ||
              "3",
            reps:
              exercise.planned_reps ||
              exercise.reps ||
              "10",
            rest_seconds:
              Number(
                exercise.rest_seconds ||
                60
              ),
            notes:
              exercise.notes ||
              exercise.feel ||
              "",
            source:
              "adaptive_generator",
          })
        ),
    });

    setDrawer("pre-workout");
  }

  function startAlwaysReadyWorkout() {
    const plan = buildAdaptiveWorkout({
      history,
      snapshot: syncedSnapshot,
      profile,
      mode: "recommended",
    });

    startAdaptiveWorkout(plan);
  }

  function planWorkoutForToday(plan) {
    if (
      !plan ||
      !Array.isArray(plan.exercises) ||
      !plan.exercises.length
    ) {
      return;
    }

    const now = new Date();

    const plannerItem = {
      id: uid("today-plan"),
      workout_id: "",
      workout_name:
        plan.title || "Adaptive Workout",
      title:
        plan.title || "Adaptive Workout",
      name:
        plan.title || "Adaptive Workout",
      ymd: todayYmd(),
      day_label:
        now.toLocaleDateString(
          undefined,
          { weekday: "short" }
        ),
      time:
        now.toTimeString().slice(0, 5),
      status: "Planned",
      source: "plan_today",
      requested_location:
        plan.requested_location || "",
      requested_duration_minutes:
        plan.requested_duration_minutes || "",
      requested_focus:
        plan.requested_focus || "",
      requested_home_equipment:
        Array.isArray(
          plan.requested_home_equipment
        )
          ? plan.requested_home_equipment
          : [],
      requested_mobility_focus:
        plan.requested_mobility_focus || "",
      recovery_status:
        plan.recovery || "",
      adaptive_focus:
        plan.focus || "",
      adaptive_reason:
        plan.reason || "",
      exercises:
        plan.exercises.map(
          (exercise, index) => ({
            ...exercise,
            id:
              exercise.id ||
              uid(
                `today-exercise-${index + 1}`
              ),
            name:
              exercise.name ||
              `Exercise ${index + 1}`,
            sets:
              exercise.planned_sets ||
              exercise.sets ||
              "3",
            reps:
              exercise.planned_reps ||
              exercise.reps ||
              "10",
            rest_seconds:
              Number(
                exercise.rest_seconds ||
                60
              ),
          })
        ),
    };

    setSnapshot((previous) => ({
      ...previous,
      today_workout_id:
        plannerItem.id,
      workout:
        plannerItem.workout_name,
      training_location:
        plan.requested_location ||
        previous.training_location ||
        "",
      home_equipment:
        plan.requested_location === "Home"
          ? (
              Array.isArray(
                plan.requested_home_equipment
              )
                ? plan.requested_home_equipment
                : []
            )
          : (
              Array.isArray(previous.home_equipment)
                ? previous.home_equipment
                : []
            ),
      last_mobility_focus:
        plan.requested_mobility_focus ||
        previous.last_mobility_focus ||
        "",
      week_plan: [
        ...(
          Array.isArray(previous.week_plan)
            ? previous.week_plan.filter(
                (item) =>
                  !(
                    item?.ymd === todayYmd() &&
                    item?.status !== "Completed"
                  )
              )
            : []
        ),
        plannerItem,
      ],
      updated_at:
        new Date().toISOString(),
    }));

    setDrawer("");
  }

  function planAndStartWorkout(plan) {
    planWorkoutForToday(plan);

    const now = new Date();

    startAdaptiveWorkout({
      ...plan,
      title:
        plan?.title ||
        "Adaptive Workout",
      ymd: todayYmd(),
      time:
        now.toTimeString().slice(0, 5),
    });
  }
  function confirmPreWorkout(
    checkIn = {}
  ) {
    if (!activePlannerItem) return;

    const soreAreas = Array.isArray(checkIn.sore_areas)
      ? checkIn.sore_areas
      : [];
    const painAreas = Array.isArray(checkIn.preworkout_pain_areas)
      ? checkIn.preworkout_pain_areas
      : [];
    const painSeverity = checkIn.preworkout_pain_severity || "None";
    const protectedPainAreas = checkIn.avoid_pain_areas ? painAreas : [];

    let nextPlannerItem = {
      ...activePlannerItem,
      pre_workout_check_in: {
        ...checkIn,
        sore_areas: soreAreas,
        preworkout_pain_areas: painAreas,
        protected_pain_areas: protectedPainAreas,
        completed_at: new Date().toISOString(),
      },
    };

    const shouldAdjust =
      checkIn.adjust_workout &&
      (soreAreas.length > 0 ||
        protectedPainAreas.length > 0 ||
        checkIn.readiness === "Low" ||
        checkIn.energy === "Low");

    if (shouldAdjust) {
      const adjustedPlan = buildAdaptiveWorkout({
        history,
        snapshot: {
          ...syncedSnapshot,
          readiness: checkIn.readiness || syncedSnapshot.readiness,
          sore_areas: soreAreas,
          preworkout_pain_areas: painAreas,
          protected_pain_areas: protectedPainAreas,
          pain_areas: protectedPainAreas,
          pain_area: protectedPainAreas.join(" "),
          preworkout_pain_severity: painSeverity,
          pain_score:
            painSeverity === "Severe"
              ? 7
              : painSeverity === "Moderate"
              ? 4
              : painSeverity === "Mild"
              ? 2
              : 0,
        },
        profile,
        mode:
          checkIn.readiness === "Low" || checkIn.energy === "Low"
            ? "recovery"
            : "recommended",
      });

      if (Array.isArray(adjustedPlan.exercises) && adjustedPlan.exercises.length) {
        nextPlannerItem = {
          ...nextPlannerItem,
          workout_name: adjustedPlan.title || nextPlannerItem.workout_name,
          title: adjustedPlan.title || nextPlannerItem.title,
          adaptive_reason:
            adjustedPlan.positive_alternatives_message ||
            adjustedPlan.reason ||
            nextPlannerItem.adaptive_reason,
          can_train_focus: adjustedPlan.can_train_focus || "",
          protected_pain_areas: protectedPainAreas,
          exercises: adjustedPlan.exercises,
          adjusted_before_start: true,
        };
      }
    }

    setSnapshot((previous) => ({
      ...previous,
      readiness: checkIn.readiness || previous.readiness,
      sore_areas: soreAreas,
      preworkout_pain_areas: painAreas,
      protected_pain_areas: protectedPainAreas,
      preworkout_pain_severity: painSeverity,
      last_pre_workout_check_in: nextPlannerItem.pre_workout_check_in,
      updated_at: new Date().toISOString(),
    }));

    setActivePlannerItem(nextPlannerItem);
    setDrawer("active-workout");
  }

  function saveCustomWorkout(
    workout
  ) {
    if (
      !workout ||
      !Array.isArray(workout.exercises) ||
      !workout.exercises.length
    ) {
      return;
    }

    const savedWorkout = {
      ...workout,
      id: workout.id || uid("custom-workout"),
      name:
        workout.name ||
        workout.workout_name ||
        "Custom Workout",
      workout_name:
        workout.workout_name ||
        workout.name ||
        "Custom Workout",
      source: "custom_builder",
      saved_at: new Date().toISOString(),
    };

    setWorkouts((previous) => [
      savedWorkout,
      ...(Array.isArray(previous)
        ? previous.filter((item) => item?.id !== savedWorkout.id)
        : []),
    ]);
  }

  function startCustomWorkout(
    workout
  ) {
    if (
      !workout ||
      !Array.isArray(workout.exercises) ||
      !workout.exercises.length
    ) {
      return;
    }

    saveCustomWorkout(workout);

    const now = new Date();
    const plannerItem = {
      ...workout,
      id: uid("custom-session"),
      workout_id: workout.id || "",
      workout_name:
        workout.workout_name ||
        workout.name ||
        "Custom Workout",
      title:
        workout.title ||
        workout.name ||
        "Custom Workout",
      name:
        workout.name ||
        workout.workout_name ||
        "Custom Workout",
      ymd: todayYmd(),
      day_label: now.toLocaleDateString(undefined, {
        weekday: "short",
      }),
      time: now.toTimeString().slice(0, 5),
      status: "Planned",
      source: "custom_builder",
      exercises: workout.exercises.map((exercise, index) => ({
        ...exercise,
        id:
          exercise.id ||
          uid(`custom-exercise-${index + 1}`),
        sets:
          exercise.planned_sets ||
          exercise.sets ||
          "3",
        reps:
          exercise.planned_reps ||
          exercise.reps ||
          "10",
        rest_seconds: Number(exercise.rest_seconds || 60),
        order: index + 1,
      })),
    };

    setActivePlannerItem(plannerItem);
    setDrawer("pre-workout");
  }
  function openCardioPlayer(
    plan = null
  ) {
    setCardioSuggestedPlan(plan);
    setDrawer("cardio-player");
  }

  function saveCardioSession(
    session
  ) {
    if (!session) return;

    setHistory((previous) => [
      session,
      ...(Array.isArray(previous)
        ? previous
        : []),
    ]);

    setSnapshot((previous) => ({
      ...previous,
      workout_completed_today: true,
      daily_workout_count:
        Number(
          previous.daily_workout_count ||
          0
        ) + 1,
      last_workout_stats: session,
      last_completed_workout:
        session.workout_name ||
        session.name ||
        "Cardio",
      last_workout_completed_at:
        session.completed_at ||
        new Date().toISOString(),
    }));
  }

  const mobileNextSession =
    findNextPlanned(
      syncedSnapshot.week_plan
    );

  const hasCoachProposal =
    !!syncedSnapshot?.coach_plan_proposal;

  return (
    <div className="health-ui-polish min-h-dvh overflow-x-hidden bg-[#020617] pb-24 text-slate-100 lg:pb-0">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[#020617]" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.10),transparent_32%),radial-gradient(circle_at_bottom,rgba(99,102,241,0.12),transparent_38%)]" />
      </div>

      <ModeBar
        title="Health"
        subtitle={
          hasHealthAccess
            ? "Home | daily logging | workouts | coach | insights"
            : "30 days free | $2.99/month after"
        }
        rightActions={
          <div className="flex items-center gap-2">
            {hasHealthAccess ? (
              <SyncStatusPill
                status={syncStatus}
              />
            ) : null}

            <button
              type="button"
              onClick={() =>
                nav("/customer")
              }
              className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs hover:bg-slate-900"
            >
              Back
            </button>
          </div>
        }
      />

      <main
        className={cx(
          "relative mx-auto px-3 pb-16 pt-4 sm:px-5 lg:pb-12",
          hasHealthAccess
            ? "max-w-7xl"
            : "max-w-5xl"
        )}
      >
        {hasHealthAccess ? (
          healthView === "insights" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setHealthView("home")
                  }
                  className="h-11 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 text-sm font-black text-cyan-100"
                >
                  â† Back to Health Home
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setHealthView("dashboard")
                  }
                  className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-white"
                >
                  Open Full Analysis
                </button>
              </div>

              <HealthProgressCharts
                profile={profile}
                snapshot={syncedSnapshot}
                history={history}
                progressLogs={progressLogs}
                onOpen={handleDashboardOpen}
              />
            </div>
          ) : healthView === "dashboard" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setHealthView("insights")
                  }
                  className="h-11 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 text-sm font-black text-cyan-100"
                >
                  â† Back to Charts
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setHealthView("home")
                  }
                  className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-white"
                >
                  Health Home
                </button>
              </div>

              <HealthDashboard
                profile={profile}
                snapshot={syncedSnapshot}
                workouts={workouts}
                history={history}
                progressLogs={progressLogs}
                devices={devices}
                onOpen={handleDashboardOpen}
                onStartWorkout={
                  startPlannerWorkout
                }
                onStartAdaptive={
                  startAdaptiveWorkout
                }
                onOpenCardio={
                  openCardioPlayer
                }
                onBuildNextWeek={
                  handleBuildNextWeek
                }
                onRepeatLastWeek={
                  handleRepeatLastWeek
                }
              />
            </div>
          ) : (            <HealthHome
              profile={profile}
              snapshot={syncedSnapshot}
              history={history}
              progressLogs={progressLogs}
              onOpen={handleDashboardOpen}
              onStartWorkout={
                startPlannerWorkout
              }
              onShowInsights={() =>
                setHealthView("insights")
              }
              onQuickLog={(type) =>
                setQuickLogType(type)
              }
              onResolveMissedWorkout={
                resolveMissedWorkout
              }
            />
          )
        ) : (
          <HealthSignupScreen
            onBack={() =>
              nav("/customer")
            }
            onRedeem={
              handleRedeemHealthCode
            }
            redeeming={
              redeemingCode
            }
            redeemError={
              redeemError
            }
            redeemSuccess={
              redeemSuccess
            }
          />
        )}
      </main>

      {hasHealthAccess ? (
        <>
          <PreWorkoutCheckInDrawer
            open={
              drawer ===
              "pre-workout"
            }
            onClose={() =>
              setDrawer("")
            }
            workout={
              activePlannerItem
            }
            snapshot={
              syncedSnapshot
            }
            onConfirm={
              confirmPreWorkout
            }
          />

          <PlanTodayWorkoutDrawer
            open={drawer === "plan-today"}
            onClose={() =>
              setDrawer("")
            }
            profile={profile}
            snapshot={syncedSnapshot}
            history={history}
            onPlan={
              planWorkoutForToday
            }
            onStart={
              planAndStartWorkout
            }
            onOpenFullStudio={() =>
              setDrawer("workout")
            }
          />

          <TodayPlanDrawer
            open={drawer === "today"}
            onClose={() =>
              setDrawer("")
            }
            profile={profile}
            snapshot={syncedSnapshot}
            workouts={workouts}
            history={history}
            setSnapshot={setSnapshot}
          />

          <HealthPlannerDrawer
            open={drawer === "planner"}
            onClose={() =>
              setDrawer("")
            }
            snapshot={syncedSnapshot}
            setSnapshot={setSnapshot}
            workouts={workouts}
          />

          <HealthQuickLogDrawer
            open={!!quickLogType}
            type={quickLogType}
            onClose={() =>
              setQuickLogType("")
            }
            onChooseType={(type) => {
              if (
                type ===
                "nutrition-coach"
              ) {
                setQuickLogType("");
                setNutritionDraft(null);
                setDrawer(
                  "nutrition-dashboard"
                );
                return;
              }

              setQuickLogType(type);
            }}
            onSave={handleQuickLogSave}
            profile={profile}
            snapshot={syncedSnapshot}
          />

          <HealthGoalCenterDrawer
            open={drawer === "goal-center"}
            onClose={() => setDrawer("")}
            profile={profile}
            snapshot={syncedSnapshot}
            progressLogs={progressLogs}
            history={history}
            onSave={({ profile: profilePatch, snapshot: snapshotPatch }) => {
              setProfile((previous) => ({ ...previous, ...profilePatch }));
              setSnapshot((previous) => ({ ...previous, ...snapshotPatch }));
            }}
          />

          <HealthProfileIntakeDrawer
            open={
              drawer ===
              "profile-intake"
            }
            onClose={() =>
              setDrawer("")
            }
            profile={profile}
            setProfile={setProfile}
            snapshot={syncedSnapshot}
            setSnapshot={setSnapshot}
          />

          <QuestionnaireDrawer
            open={
              drawer ===
              "questionnaire"
            }
            onClose={() =>
              setDrawer("")
            }
            profile={profile}
            setProfile={setProfile}
            snapshot={snapshot}
            setSnapshot={setSnapshot}
          />

          <WorkoutStudioDrawer
            open={
              drawer === "workout"
            }
            onClose={() =>
              setDrawer("")
            }
            profile={profile}
            snapshot={syncedSnapshot}
            setSnapshot={setSnapshot}
            workouts={workouts}
            setWorkouts={setWorkouts}
            history={history}
            setHistory={setHistory}
          />

          <ExerciseLibraryDrawer
            open={
              drawer === "library"
            }
            onClose={() =>
              setDrawer("")
            }
            onAddExercise={
              addExerciseFromLibrary
            }
            onSaveCustomWorkout={
              saveCustomWorkout
            }
            onStartCustomWorkout={
              startCustomWorkout
            }
          />

          <NutritionDashboard
            open={
              drawer ===
              "nutrition-dashboard"
            }
            onClose={() =>
              setDrawer("")
            }
            profile={profile}
            snapshot={syncedSnapshot}
            progressLogs={progressLogs}
            onOpenCoach={
              openNutritionCoach
            }
            onOpenGoals={() =>
              setDrawer(
                "nutrition-goals"
              )
            }
            onOpenMealPlanner={() =>
              setDrawer(
                "meal-planner"
              )
            }
            onEditMeal={
              openNutritionCoach
            }
            onDeleteMeal={
              handleDeleteNutritionMeal
            }
            onReuseMeal={
              handleReuseNutritionMeal
            }
          />

          <SmartMealPlannerDrawer
            open={
              drawer ===
              "meal-planner"
            }
            onClose={() =>
              setDrawer(
                "nutrition-dashboard"
              )
            }
            profile={profile}
            snapshot={syncedSnapshot}
            progressLogs={progressLogs}
            onLogMeal={(entry) => {
              handleNutritionMealSave(
                entry
              );
              setDrawer(
                "nutrition-dashboard"
              );
            }}
            setProfile={setProfile}
          />

          <NutritionGoalsDrawer
            open={
              drawer ===
              "nutrition-goals"
            }
            onClose={() =>
              setDrawer(
                "nutrition-dashboard"
              )
            }
            profile={profile}
            snapshot={syncedSnapshot}
            setProfile={setProfile}
            setSnapshot={setSnapshot}
          />

          <NutritionCoachDrawer
            open={
              drawer ===
              "nutrition-coach"
            }
            onClose={() => {
              setNutritionDraft(null);
              setDrawer("");
            }}
            profile={profile}
            snapshot={syncedSnapshot}
            progressLogs={progressLogs}
            onSaveMeal={
              handleNutritionMealSave
            }
            initialMeal={
              nutritionDraft
            }
            onOpenDashboard={() => {
              setNutritionDraft(null);
              setDrawer(
                "nutrition-dashboard"
              );
            }}
            onOpenUpgrade={() =>
              setDrawer(
                "ai-coach-upgrade"
              )
            }
          />

          <AICoachUpgradeDrawer
            open={
              drawer ===
              "ai-coach-upgrade"
            }
            onClose={() =>
              setDrawer(
                "nutrition-coach"
              )
            }
            onContinueFree={() =>
              setDrawer(
                "nutrition-dashboard"
              )
            }
          />

          <NutritionDrawer
            open={
              drawer === "nutrition"
            }
            onClose={() =>
              setDrawer("")
            }
            snapshot={syncedSnapshot}
            setSnapshot={setSnapshot}
          />

          <StepsDrawer
            open={drawer === "steps"}
            onClose={() =>
              setDrawer("")
            }
            snapshot={syncedSnapshot}
            setSnapshot={setSnapshot}
          />

          <ProgressDrawer
            open={
              drawer === "progress"
            }
            onClose={() =>
              setDrawer("")
            }
            snapshot={syncedSnapshot}
            setSnapshot={setSnapshot}
            progressLogs={
              progressLogs
            }
            setProgressLogs={
              setProgressLogs
            }
            history={history}
            setHistory={setHistory}
          />

          <SynopsisDrawer
            open={
              drawer === "synopsis"
            }
            onClose={() =>
              setDrawer("")
            }
            snapshot={syncedSnapshot}
            profile={profile}
            history={history}
          />

          <AiCoachDrawer
            open={drawer === "coach"}
            onClose={() =>
              setDrawer("")
            }
            profile={profile}
            snapshot={syncedSnapshot}
            workouts={workouts}
            history={history}
            progressLogs={
              progressLogs
            }
            setSnapshot={setSnapshot}
          />

          <CoachChatDrawer
            open={
              drawer ===
              "coach-chat"
            }
            onClose={() =>
              setDrawer("")
            }
            snapshot={syncedSnapshot}
            setSnapshot={setSnapshot}
            onOpenQuestionnaire={
              openQuestionnaireFromCoach
            }
          />

          <ActiveWorkoutSessionDrawer
            open={
              drawer ===
              "active-workout"
            }
            onClose={() =>
              setDrawer("")
            }
            plannerItem={
              activePlannerItem
            }
            workouts={workouts}
            snapshot={syncedSnapshot}
            setSnapshot={setSnapshot}
            history={history}
            setHistory={setHistory}
          />

          <CardioActivityDrawer
            open={
              drawer === "cardio-player"
            }
            onClose={() => {
              setDrawer("");
              setCardioSuggestedPlan(null);
            }}
            onSave={saveCardioSession}
            suggestedPlan={
              cardioSuggestedPlan
            }
          />

          <WorkoutHistoryDrawer
            open={
              drawer === "workout-history"
            }
            onClose={() => setDrawer("")}
            history={history}
          />

          <DevicesDrawer
            open={
              drawer === "devices"
            }
            onClose={() =>
              setDrawer("")
            }
            devices={devices}
            setDevices={setDevices}
          />

          <SleepPlannerDrawer
            open={
              drawer === "sleep"
            }
            onClose={() =>
              setDrawer("")
            }
            profile={profile}
            setProfile={setProfile}
            snapshot={syncedSnapshot}
            setSnapshot={setSnapshot}
          />

          <HealthMobileQuickNav
            onOpen={handleDashboardOpen}
            onLog={() => setQuickLogType("menu")}
            onStartWorkout={
              startPlannerWorkout
            }
            onStartFallback={() =>
              setDrawer("plan-today")
            }
            nextSession={
              mobileNextSession
            }
            hasCoachProposal={
              hasCoachProposal
            }
          />
        </>
      ) : null}

      <HealthConfetti
        active={!!celebration}
        title={celebration?.title}
        subtitle={
          celebration?.subtitle
        }
        onDone={() =>
          setCelebration(null)
        }
      />
    </div>
  );
}

