// src/pages/CustomerHealth.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import ModeBar from "../components/ModeBar";
import PaidGate from "../components/paid/PaidGate";

import HealthDashboard from "../components/customer-health/HealthDashboard";
import QuestionnaireDrawer from "../components/customer-health/QuestionnaireDrawer";
import WorkoutStudioDrawer from "../components/customer-health/WorkoutStudioDrawer";
import ExerciseLibraryDrawer from "../components/customer-health/ExerciseLibraryDrawer";
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
  defaultDevices,
  defaultProfile,
  defaultSnapshot,
  defaultWorkouts,
  readJson,
  uid,
  writeJson,
} from "../components/customer-health/healthStorage";

export default function CustomerHealth() {
  const nav = useNavigate();

  const [drawer, setDrawer] = useState("");
  const [profile, setProfile] = useState(() => ({
    ...defaultProfile(),
    ...(readJson(PROFILE_KEY, null) || {}),
  }));

  const [snapshot, setSnapshot] = useState(() => ({
    ...defaultSnapshot(),
    ...(readJson(SNAPSHOT_KEY, null) || {}),
  }));

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

  const syncedSnapshot = useMemo(() => {
    return {
      ...snapshot,
      workout: snapshot.workout || "",
      goal: profile.primary_goal || snapshot.goal || "General fitness",
      equipment: snapshot.equipment || profile.preferred_equipment || "Bodyweight",
      weekly_completed: history.length,
      progress_count: progressLogs.length,
      device_status: devices.some((x) => x.status === "Selected for Sync")
        ? "Device selected"
        : "Manual tracking active",
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

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#020617] text-slate-100">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[#020617]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.10),transparent_32%),radial-gradient(circle_at_bottom,rgba(99,102,241,0.12),transparent_38%)]" />
      </div>

      <ModeBar
        title="Health"
        subtitle="Dashboard • workouts • nutrition • progress • devices"
        rightActions={
          <button
            type="button"
            onClick={() => nav("/customer")}
            className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
          >
            Back
          </button>
        }
      />

      <main className="relative mx-auto max-w-6xl px-3 pb-12 pt-4 sm:px-5">
        <PaidGate
          entitlementKey="health"
          title="Health & Fitness"
          subtitle="Health dashboard, workout tracking, exercise library, progress logs, and device-ready metrics."
          checkoutUrl={STRIPE_HEALTH_CHECKOUT_URL}
          ctaTo="/upgrade"
          ctaLabel="View plans / Upgrade"
          iconUrl={HEALTH_LOGO_URL}
        >
          <HealthDashboard
            profile={profile}
            snapshot={syncedSnapshot}
            workouts={workouts}
            history={history}
            progressLogs={progressLogs}
            devices={devices}
            onOpen={setDrawer}
          />
        </PaidGate>
      </main>

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

      <DevicesDrawer
        open={drawer === "devices"}
        onClose={() => setDrawer("")}
        devices={devices}
        setDevices={setDevices}
      />
    </div>
  );
}