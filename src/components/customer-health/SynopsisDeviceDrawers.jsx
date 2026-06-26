// src/components/customer-health/SynopsisDeviceDrawers.jsx
import React from "react";
import HealthDrawer from "./HealthDrawer";
import { readinessSuggestion, safeNumber } from "./healthStorage";

export function SynopsisDrawer({ open, onClose, snapshot, profile, history }) {
  const steps = safeNumber(snapshot.steps);
  const stepGoal = safeNumber(snapshot.step_goal) || 8000;
  const protein = safeNumber(snapshot.protein_today);
  const proteinGoal = safeNumber(snapshot.protein_goal);
  const calories = safeNumber(snapshot.calories);
  const calorieGoal = safeNumber(snapshot.calorie_goal) || 2200;

  const stepMiss = Math.max(0, stepGoal - steps);
  const proteinMiss = Math.max(0, proteinGoal - protein);

  const recommendation =
    snapshot.readiness === "Pain / Limit"
      ? "Tomorrow should stay recovery-focused. Avoid painful movements and prioritize mobility or walking."
      : snapshot.readiness === "Need Recovery"
      ? "Tomorrow should be lighter. Keep steps reasonable and choose lower volume."
      : proteinMiss > 30
      ? "Protein was short today. Keep the next training day normal, but prioritize protein earlier."
      : stepMiss > 1500
      ? "Steps were short today. Add a walk tomorrow before increasing workout intensity."
      : "Good day. If the workout felt controlled, you can increase reps or weight slightly next time.";

  return (
    <HealthDrawer open={open} onClose={onClose} title="Daily Health Synopsis" subtitle="End-of-day recap and next-step recommendation.">
      <div className="space-y-4">
        <div className="rounded-3xl border border-emerald-500/25 bg-emerald-500/10 p-5">
          <div className="text-sm font-black text-white">Today's Recap</div>
          <div className="mt-3 space-y-2 text-sm leading-6 text-slate-200">
            <div>Workout: {snapshot.workout || "Not selected"}</div>
            <div>Training for: {profile.primary_goal || "General fitness"}{profile.sport ? ` | ${profile.sport}` : ""}</div>
            <div>Readiness: {snapshot.readiness}</div>
            <div>Steps: {steps.toLocaleString()} / {stepGoal.toLocaleString()}</div>
            <div>Calories: {calories.toLocaleString()} / {calorieGoal.toLocaleString()}</div>
            <div>Protein: {protein.toLocaleString()}g / {proteinGoal.toLocaleString()}g</div>
            <div>Recent completed workouts: {history.length}</div>
          </div>
        </div>

        <div className="rounded-3xl border border-cyan-500/25 bg-cyan-500/10 p-5">
          <div className="text-sm font-black text-white">AI-style recommendation</div>
          <p className="mt-2 text-sm leading-6 text-cyan-100">{recommendation}</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-sm font-black text-white">Readiness note</div>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {readinessSuggestion(snapshot.readiness)}
          </p>
        </div>

        {profile.limitations ? (
          <div className="rounded-3xl border border-amber-500/25 bg-amber-500/10 p-5">
            <div className="text-sm font-black text-white">Limitations to respect</div>
            <p className="mt-2 text-sm leading-6 text-amber-100">{profile.limitations}</p>
          </div>
        ) : null}

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-5 text-slate-400">
          This is fitness guidance, not medical advice. Pain, injury, or medical limitations should be reviewed with a qualified professional.
        </div>
      </div>
    </HealthDrawer>
  );
}

export function DevicesDrawer({ open, onClose, devices, setDevices }) {
  function toggleDevice(id) {
    setDevices((prev) =>
      prev.map((device) => {
        if (device.id !== id) return device;

        return {
          ...device,
          status: device.status === "Selected for Sync" ? "Manual Tracking Active" : "Selected for Sync",
        };
      })
    );
  }

  return (
    <HealthDrawer open={open} onClose={onClose} title="Device Connections" subtitle="Manual tracking now. Smartwatch sync is the backend path.">
      <div className="space-y-4">
        <div className="rounded-3xl border border-cyan-500/25 bg-cyan-500/10 p-5">
          <div className="text-sm font-black text-white">Device data we want later</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {["Steps", "Heart rate", "Calories burned", "Sleep", "Workout duration", "Active minutes", "Resting HR", "Recovery trend"].map((x) => (
              <div key={x} className="rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-sm text-cyan-100">
                {x}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          {devices.map((device) => (
            <div key={device.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-base font-black text-white">{device.name}</div>
                  <div className="mt-1 text-xs text-slate-400">{device.provider}</div>
                  <div className="mt-2 text-sm text-slate-300">{device.status}</div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleDevice(device.id)}
                  className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-100"
                >
                  {device.status === "Selected for Sync" ? "Selected" : "Select"}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-slate-400">
          Minimal backend later: store device connection provider, user consent, OAuth token reference, and synced metric records. We do not need to build that until this UX is locked.
        </div>
      </div>
    </HealthDrawer>
  );
}