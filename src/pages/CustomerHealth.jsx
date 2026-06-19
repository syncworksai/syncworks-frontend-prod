// src/pages/CustomerHealth.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import ModeBar from "../components/ModeBar";
import { useAuth } from "../auth/AuthContext";

import {
  getCustomerHealthProfile,
  patchCustomerHealthProfile,
} from "../api/customerHealth";

import { buildHealthAchievements } from "../components/customer-health/healthAchievements";
import HealthConfetti from "../components/customer-health/HealthConfetti";
import TodayPlanDrawer from "../components/customer-health/TodayPlanDrawer";
import HealthDashboard from "../components/customer-health/HealthDashboard";
import HealthPlannerDrawer from "../components/customer-health/HealthPlannerDrawer";
import QuestionnaireDrawer from "../components/customer-health/QuestionnaireDrawer";
import WorkoutStudioDrawer from "../components/customer-health/WorkoutStudioDrawer";
import ExerciseLibraryDrawer from "../components/customer-health/ExerciseLibraryDrawer";
import AiCoachDrawer from "../components/customer-health/AiCoachDrawer";
import CoachChatDrawer from "../components/customer-health/CoachChatDrawer";
import ActiveWorkoutSessionDrawer from "../components/customer-health/ActiveWorkoutSessionDrawer";
import HealthMobileQuickNav from "../components/customer-health/HealthMobileQuickNav";
import SleepPlannerDrawer from "../components/customer-health/SleepPlannerDrawer";
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
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasObjectData(value) {
  return isPlainObject(value) && Object.keys(value).length > 0;
}

function hasArrayData(value) {
  return Array.isArray(value) && value.length > 0;
}

function findNextPlanned(weekPlan = []) {
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

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function asYmd(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
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

function convertCoachWorkoutToPlannerItem(workout, index = 0) {
  const now = new Date();
  const date = addDays(now, index);
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return {
    id: workout?.planner_id || workout?.id || uid("coach-plan"),
    ymd: workout?.ymd || asYmd(date),
    day_label: workout?.day_label || names[date.getDay()],
    workout_id: workout?.workout_id || workout?.id || "",
    workout_name: normalizeCoachWorkoutName(workout),
    time: workout?.time || "06:00",
    status:
      workout?.status === "added_to_planner"
        ? "Planned"
        : workout?.status || "Planned",
    note:
      workout?.note ||
      workout?.focus ||
      "Built by SyncWorks AI Fitness Coach",
    source: "coach_chat",
    duration_minutes: workout?.duration_minutes || "",
    exercises: Array.isArray(workout?.exercises) ? workout.exercises : [],
    added_to_planner_at:
      workout?.added_to_planner_at || new Date().toISOString(),
  };
}

function normalizeWeekPlanForDashboard(weekPlan) {
  if (Array.isArray(weekPlan)) {
    return weekPlan;
  }

  if (isPlainObject(weekPlan)) {
    const possibleWorkouts = Array.isArray(weekPlan.workouts)
      ? weekPlan.workouts
      : Array.isArray(weekPlan.days)
      ? weekPlan.days
      : [];

    return possibleWorkouts.map((workout, index) =>
      convertCoachWorkoutToPlannerItem(workout, index)
    );
  }

  return [];
}

function normalizeHealthSnapshot(nextSnapshot) {
  const safeSnapshot = nextSnapshot || {};

  return {
    ...safeSnapshot,
    week_plan: normalizeWeekPlanForDashboard(safeSnapshot.week_plan),
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
    local: "border-slate-700 bg-slate-950 text-slate-300",
    loading: "border-cyan-500/25 bg-cyan-500/10 text-cyan-100",
    syncing: "border-amber-500/25 bg-amber-500/10 text-amber-100",
    saved: "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",
    error: "border-rose-500/25 bg-rose-500/10 text-rose-100",
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

function HealthSignupScreen({ onBack }) {
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
                A daily-use health hub with an AI fitness coach, workout
                planning, goal tracking, progress logging, and a cleaner reason
                to come back every day.
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
                <div className="text-5xl font-black text-white">$2.99</div>
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

              <button
                type="button"
                onClick={onBack}
                className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 text-sm font-black text-slate-100 transition hover:bg-white/[0.08]"
              >
                Back to Dashboard
              </button>

              <div className="mt-4 text-xs leading-5 text-slate-500">
                After checkout, access is unlocked by your backend entitlement.
                Log out/in or refresh if you just purchased.
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
            Quick sight of goals, progress, workout plan, next session, and
            daily coach guidance.
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
          <div className="text-sm font-black text-white">
            Workout planner + calendar
          </div>

          <div className="mt-2 text-sm leading-6 text-slate-400">
            Build a weekly workout plan and send sessions to calendar.
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
          <div className="text-sm font-black text-white">
            AI coach + partner tools
          </div>

          <div className="mt-2 text-sm leading-6 text-slate-400">
            Better motivation, better tracking, plus helpful partner
            recommendations like protein and step rewards.
          </div>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
        Health guidance is fitness support, not medical diagnosis. Pain,
        injury, or medical limitations should be reviewed with a qualified
        professional.
      </div>
    </div>
  );
}

export default function CustomerHealth() {
  const nav = useNavigate();
  const { moduleAccess, isGod } = useAuth();

  const hasHealthAccess =
    !!isGod ||
    !!moduleAccess?.health ||
    !!moduleAccess?.fitness ||
    !!moduleAccess?.customer_health ||
    !!moduleAccess?.customerHealth;

  const [drawer, setDrawer] = useState("");
  const [syncStatus, setSyncStatus] = useState("local");
  const [cloudLoaded, setCloudLoaded] = useState(false);
  const [celebration, setCelebration] = useState(null);
  const [activePlannerItem, setActivePlannerItem] = useState(null);

  const skipNextCloudSaveRef = useRef(false);
  const achievedMilestoneIdsRef = useRef(new Set());

  const [profile, setProfile] = useState(() => ({
    ...defaultProfile(),
    ...(readJson(PROFILE_KEY, null) || {}),
  }));

  const [snapshot, setSnapshotBase] = useState(() =>
    normalizeHealthSnapshot({
      ...defaultSnapshot(),
      ...(readJson(SNAPSHOT_KEY, null) || {}),
    })
  );

  function setSnapshot(nextValue) {
    if (typeof nextValue === "function") {
      setSnapshotBase((prev) => normalizeHealthSnapshot(nextValue(prev)));
      return;
    }

    setSnapshotBase(normalizeHealthSnapshot(nextValue));
  }

  const [workouts, setWorkouts] = useState(() => {
    const saved = readJson(WORKOUTS_KEY, null);

    if (Array.isArray(saved) && saved.length) {
      return saved.map((workout) => ({
        ...workout,
        exercises: Array.isArray(workout.exercises) ? workout.exercises : [],
      }));
    }

    return defaultWorkouts();
  });

  const [history, setHistory] = useState(() => {
    const saved = readJson(HISTORY_KEY, []);
    return Array.isArray(saved) ? saved : [];
  });

  const [progressLogs, setProgressLogs] = useState(() => {
    const saved = readJson(PROGRESS_KEY, []);
    return Array.isArray(saved) ? saved : [];
  });

  const [devices, setDevices] = useState(() => {
    const saved = readJson(DEVICE_KEY, null);
    return Array.isArray(saved) && saved.length ? saved : defaultDevices();
  });

  useEffect(() => {
    setSnapshot((prev) => {
      if (Array.isArray(prev.week_plan) && prev.week_plan.length) return prev;

      const starterPlan = buildStarterWeekPlan(workouts);

      return {
        ...prev,
        week_plan: starterPlan,
        planned_workouts: starterPlan.filter((item) => item.workout_name)
          .length,
      };
    });
  }, [workouts]);

  const syncedSnapshot = useMemo(() => {
    const weekPlan = normalizeWeekPlanForDashboard(snapshot.week_plan);
    const nextSession = findNextPlanned(weekPlan);

    return {
      ...snapshot,
      week_plan: weekPlan,
      workout: snapshot.workout || "",
      goal: profile.primary_goal || snapshot.goal || "General fitness",
      equipment:
        snapshot.equipment || profile.preferred_equipment || "Bodyweight",
      weekly_completed: history.length,
      progress_count: progressLogs.length,
      planned_workouts: weekPlan.filter((item) => item?.workout_name).length,
      device_status: devices.some((x) => x.status === "Selected for Sync")
        ? "Device selected"
        : "Manual tracking active",
      next_session_note: nextSession
        ? `${nextSession.day_label} • ${
            nextSession.time || "Anytime"
          } • ${nextSession.workout_name}`
        : "",
      updated_at: new Date().toISOString(),
    };
  }, [snapshot, profile, history.length, progressLogs.length, devices]);

  useEffect(() => {
    writeJson(PROFILE_KEY, profile);
  }, [profile]);

  useEffect(() => {
    writeJson(SNAPSHOT_KEY, syncedSnapshot);
  }, [syncedSnapshot]);

  useEffect(() => {
    writeJson(WORKOUTS_KEY, workouts);
  }, [workouts]);

  useEffect(() => {
    writeJson(HISTORY_KEY, history);
  }, [history]);

  useEffect(() => {
    writeJson(PROGRESS_KEY, progressLogs);
  }, [progressLogs]);

  useEffect(() => {
    writeJson(DEVICE_KEY, devices);
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
        const data = await getCustomerHealthProfile();

        if (!mounted) return;

        skipNextCloudSaveRef.current = true;

        if (hasObjectData(data?.profile_json)) {
          setProfile((prev) => ({
            ...defaultProfile(),
            ...prev,
            ...data.profile_json,
          }));
        }

        if (hasObjectData(data?.snapshot_json)) {
          setSnapshot((prev) => ({
            ...defaultSnapshot(),
            ...prev,
            ...data.snapshot_json,
          }));
        }

        if (hasArrayData(data?.workouts_json)) {
          setWorkouts(
            data.workouts_json.map((workout) => ({
              ...workout,
              exercises: Array.isArray(workout.exercises)
                ? workout.exercises
                : [],
            }))
          );
        }

        if (Array.isArray(data?.history_json)) {
          setHistory(data.history_json);
        }

        if (Array.isArray(data?.progress_json)) {
          setProgressLogs(data.progress_json);
        }

        if (hasArrayData(data?.devices_json)) {
          setDevices(data.devices_json);
        }

        setCloudLoaded(true);
        setSyncStatus("saved");
      } catch (err) {
        console.error("Failed to load customer health cloud profile", err);

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
    if (!hasHealthAccess || !cloudLoaded) return;

    if (skipNextCloudSaveRef.current) {
      skipNextCloudSaveRef.current = false;
      return;
    }

    const timer = window.setTimeout(async () => {
      setSyncStatus("syncing");

      try {
        await patchCustomerHealthProfile({
          profile_json: profile,
          snapshot_json: syncedSnapshot,
          workouts_json: workouts,
          history_json: history,
          progress_json: progressLogs,
          devices_json: devices,
        });

        setSyncStatus("saved");
      } catch (err) {
        console.error("Failed to save customer health cloud profile", err);
        setSyncStatus("error");
      }
    }, 900);

    return () => window.clearTimeout(timer);
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
    if (!hasHealthAccess) return;

    const achievements = buildHealthAchievements({
      profile,
      snapshot: syncedSnapshot,
      history,
      progressLogs,
    });

    for (const item of achievements.achieved) {
      if (!achievedMilestoneIdsRef.current.has(item.id)) {
        achievedMilestoneIdsRef.current.add(item.id);

        const seenKey = `sw_health_milestone_seen_${item.id}_${todayYmd()}`;
        const seenToday = localStorage.getItem(seenKey);

        if (!seenToday) {
          localStorage.setItem(seenKey, "1");

          setCelebration({
            title: `${item.icon} ${item.label}`,
            subtitle: item.description,
          });

          break;
        }
      }
    }

    for (const item of achievements.achieved) {
      achievedMilestoneIdsRef.current.add(item.id);
    }
  }, [hasHealthAccess, profile, syncedSnapshot, history, progressLogs]);

  function addExerciseFromLibrary(exercise) {
    setWorkouts((prev) => {
      const targetId = snapshot.today_workout_id || prev[0]?.id;

      if (!targetId) {
        return [
          {
            id: uid("w"),
            name: "Custom Workout",
            duration: "30",
            focus: exercise.group,
            status: "Planned",
            exercises: [
              {
                name: exercise.name,
                sets: "3",
                reps: "10",
                weight: "",
                rest: "60 sec",
                notes: `Focus: ${exercise.feel}`,
                difficulty: "Medium",
                pain: "0",
              },
            ],
          },
        ];
      }

      return prev.map((workout) => {
        if (workout.id !== targetId) return workout;

        return {
          ...workout,
          exercises: [
            ...(workout.exercises || []),
            {
              name: exercise.name,
              sets: "3",
              reps: "10",
              weight: "",
              rest: "60 sec",
              notes: `Focus: ${exercise.feel}`,
              difficulty: "Medium",
              pain: "0",
            },
          ],
        };
      });
    });

    setDrawer("workout");
  }

  function openQuestionnaireFromCoach() {
    setDrawer("questionnaire");
  }

  function startPlannerWorkout(plannerItem) {
    if (!plannerItem) return;

    setActivePlannerItem(plannerItem);
    setDrawer("active-workout");
  }

  const mobileNextSession = findNextPlanned(syncedSnapshot.week_plan);
  const hasCoachProposal = !!syncedSnapshot?.coach_plan_proposal;

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#020617] pb-24 text-slate-100 lg:pb-0">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[#020617]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.10),transparent_32%),radial-gradient(circle_at_bottom,rgba(99,102,241,0.12),transparent_38%)]" />
      </div>

      <ModeBar
        title="Health"
        subtitle={
          hasHealthAccess
            ? "Dashboard • planner • active workouts • nutrition • progress • AI coach"
            : "30 days free • $2.99/month after"
        }
        rightActions={
          <div className="flex items-center gap-2">
            {hasHealthAccess ? <SyncStatusPill status={syncStatus} /> : null}

            <button
              type="button"
              onClick={() => nav("/customer")}
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
          hasHealthAccess ? "max-w-7xl" : "max-w-5xl"
        )}
      >
        {hasHealthAccess ? (
          <HealthDashboard
            profile={profile}
            snapshot={syncedSnapshot}
            workouts={workouts}
            history={history}
            progressLogs={progressLogs}
            devices={devices}
            onOpen={setDrawer}
            onStartWorkout={startPlannerWorkout}
          />
        ) : (
          <HealthSignupScreen onBack={() => nav("/customer")} />
        )}
      </main>

      {hasHealthAccess ? (
        <>
          <TodayPlanDrawer
            open={drawer === "today"}
            onClose={() => setDrawer("")}
            profile={profile}
            snapshot={syncedSnapshot}
            workouts={workouts}
            history={history}
            setSnapshot={setSnapshot}
          />

          <HealthPlannerDrawer
            open={drawer === "planner"}
            onClose={() => setDrawer("")}
            snapshot={syncedSnapshot}
            setSnapshot={setSnapshot}
            workouts={workouts}
          />

          <QuestionnaireDrawer
            open={drawer === "questionnaire"}
            onClose={() => setDrawer("")}
            profile={profile}
            setProfile={setProfile}
            snapshot={snapshot}
            setSnapshot={setSnapshot}
          />

          <WorkoutStudioDrawer
            open={drawer === "workout"}
            onClose={() => setDrawer("")}
            profile={profile}
            snapshot={syncedSnapshot}
            setSnapshot={setSnapshot}
            workouts={workouts}
            setWorkouts={setWorkouts}
            history={history}
            setHistory={setHistory}
          />

          <ExerciseLibraryDrawer
            open={drawer === "library"}
            onClose={() => setDrawer("")}
            onAddExercise={addExerciseFromLibrary}
          />

          <NutritionDrawer
            open={drawer === "nutrition"}
            onClose={() => setDrawer("")}
            snapshot={syncedSnapshot}
            setSnapshot={setSnapshot}
          />

          <StepsDrawer
            open={drawer === "steps"}
            onClose={() => setDrawer("")}
            snapshot={syncedSnapshot}
            setSnapshot={setSnapshot}
          />

          <ProgressDrawer
            open={drawer === "progress"}
            onClose={() => setDrawer("")}
            snapshot={syncedSnapshot}
            setSnapshot={setSnapshot}
            progressLogs={progressLogs}
            setProgressLogs={setProgressLogs}
            history={history}
            setHistory={setHistory}
          />

          <SynopsisDrawer
            open={drawer === "synopsis"}
            onClose={() => setDrawer("")}
            snapshot={syncedSnapshot}
            profile={profile}
            history={history}
          />

          <AiCoachDrawer
            open={drawer === "coach"}
            onClose={() => setDrawer("")}
            profile={profile}
            snapshot={syncedSnapshot}
            workouts={workouts}
            history={history}
            progressLogs={progressLogs}
            setSnapshot={setSnapshot}
          />

          <CoachChatDrawer
            open={drawer === "coach-chat"}
            onClose={() => setDrawer("")}
            snapshot={syncedSnapshot}
            setSnapshot={setSnapshot}
            onOpenQuestionnaire={openQuestionnaireFromCoach}
          />

          <ActiveWorkoutSessionDrawer
            open={drawer === "active-workout"}
            onClose={() => setDrawer("")}
            plannerItem={activePlannerItem}
            workouts={workouts}
            snapshot={syncedSnapshot}
            setSnapshot={setSnapshot}
            history={history}
            setHistory={setHistory}
          />

          <DevicesDrawer
            open={drawer === "devices"}
            onClose={() => setDrawer("")}
            devices={devices}
            setDevices={setDevices}
          />

          <SleepPlannerDrawer
            open={drawer === "sleep"}
            onClose={() => setDrawer("")}
            profile={profile}
            setProfile={setProfile}
            snapshot={syncedSnapshot}
            setSnapshot={setSnapshot}
          />

          <HealthMobileQuickNav
            onOpen={setDrawer}
            onStartWorkout={startPlannerWorkout}
            nextSession={mobileNextSession}
            hasCoachProposal={hasCoachProposal}
          />
        </>
      ) : null}

      <HealthConfetti
        active={!!celebration}
        title={celebration?.title}
        subtitle={celebration?.subtitle}
        onDone={() => setCelebration(null)}
      />
    </div>
  );
}