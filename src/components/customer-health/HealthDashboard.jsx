// src/components/customer-health/HealthDashboard.jsx
import React from "react";
import {
  clampPercent,
  cx,
  readinessSuggestion,
  readinessTone,
  safeNumber,
} from "./healthStorage";

function Pill({ children, tone = "slate" }) {
  const tones = {
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-200",
    amber: "border-amber-500/25 bg-amber-500/10 text-amber-200",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
    fuchsia: "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-200",
    indigo: "border-indigo-500/25 bg-indigo-500/10 text-indigo-200",
    rose: "border-rose-500/25 bg-rose-500/10 text-rose-200",
    slate: "border-white/10 bg-white/[0.04] text-slate-300",
  };

  return (
    <span className={cx("rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]", tones[tone] || tones.slate)}>
      {children}
    </span>
  );
}

function ProgressBar({ percent, tone = "emerald" }) {
  const fill =
    tone === "cyan"
      ? "bg-cyan-400"
      : tone === "amber"
      ? "bg-amber-400"
      : tone === "rose"
      ? "bg-rose-400"
      : tone === "indigo"
      ? "bg-indigo-400"
      : "bg-emerald-400";

  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-slate-950/70">
      <div className={cx("h-full rounded-full", fill)} style={{ width: `${clampPercent(percent)}%` }} />
    </div>
  );
}

function MetricCard({ label, value, sub, tone = "slate", percent, onClick }) {
  const tones = {
    cyan: "border-cyan-400/20 bg-cyan-500/10",
    amber: "border-amber-400/20 bg-amber-500/10",
    emerald: "border-emerald-400/20 bg-emerald-500/10",
    fuchsia: "border-fuchsia-400/20 bg-fuchsia-500/10",
    indigo: "border-indigo-400/20 bg-indigo-500/10",
    rose: "border-rose-400/20 bg-rose-500/10",
    slate: "border-white/10 bg-white/[0.03]",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-[1.35rem] border p-4 text-left transition hover:bg-white/[0.06]",
        tones[tone] || tones.slate
      )}
    >
      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </div>

      <div className="mt-2 text-2xl font-black text-white">{value}</div>

      {percent != null ? (
        <div className="mt-3">
          <ProgressBar percent={percent} tone={tone} />
        </div>
      ) : null}

      {sub ? <div className="mt-2 text-xs leading-5 text-slate-400">{sub}</div> : null}
    </button>
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
}) {
  const steps = safeNumber(snapshot.steps);
  const stepGoal = safeNumber(snapshot.step_goal) || 8000;
  const calories = safeNumber(snapshot.calories);
  const calorieGoal = safeNumber(snapshot.calorie_goal) || 2200;
  const proteinToday = safeNumber(snapshot.protein_today);
  const proteinGoal = safeNumber(snapshot.protein_goal);
  const water = safeNumber(snapshot.water);
  const waterGoal = safeNumber(snapshot.water_goal) || 100;

  const stepPercent = stepGoal > 0 ? Math.round((steps / stepGoal) * 100) : 0;
  const caloriePercent = calorieGoal > 0 ? Math.round((calories / calorieGoal) * 100) : 0;
  const proteinPercent = proteinGoal > 0 ? Math.round((proteinToday / proteinGoal) * 100) : 0;
  const waterPercent = waterGoal > 0 ? Math.round((water / waterGoal) * 100) : 0;

  const completedThisWeek = history.length;
  const activeDevices = devices.filter((x) => String(x.status || "").includes("Active")).length;
  const tone = readinessTone(snapshot.readiness);
  const healthScore = Math.round(
    (clampPercent(stepPercent) * 0.25) +
      (clampPercent(proteinPercent) * 0.25) +
      (clampPercent(caloriePercent) * 0.2) +
      (clampPercent(waterPercent) * 0.1) +
      (snapshot.readiness === "Ready" ? 20 : snapshot.readiness === "Moderate" ? 14 : 8)
  );

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-slate-950/65 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.28)] md:p-6">
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-emerald-500/14 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/4 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-200/90">
                SyncWorks Health
              </div>

              <h1 className="mt-2 text-2xl font-black tracking-tight text-white md:text-4xl">
                Health command center
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Quick metrics, smarter workouts, daily synopsis, and a path toward device-powered coaching.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Pill tone={tone}>{snapshot.readiness}</Pill>
              <Pill tone="cyan">{completedThisWeek} Recent</Pill>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
            <button
              type="button"
              onClick={() => onOpen("synopsis")}
              className="rounded-[1.35rem] border border-emerald-400/25 bg-emerald-500/10 p-5 text-left"
            >
              <div className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200">
                Health Score
              </div>
              <div className="mt-2 text-5xl font-black text-white">{healthScore}</div>
              <div className="mt-3">
                <ProgressBar percent={healthScore} tone="emerald" />
              </div>
              <div className="mt-3 text-sm leading-6 text-slate-300">
                {readinessSuggestion(snapshot.readiness)}
              </div>
            </button>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <MetricCard
                label="Training For"
                value={profile.primary_goal || "General fitness"}
                sub={profile.sport ? `Sport: ${profile.sport}` : "Tap to update your questionnaire."}
                tone="indigo"
                onClick={() => onOpen("questionnaire")}
              />

              <MetricCard
                label="Workout"
                value={snapshot.workout || "Choose workout"}
                sub={`${snapshot.time_available || "30 minutes"} • ${snapshot.equipment || "Bodyweight"}`}
                tone="emerald"
                onClick={() => onOpen("workout")}
              />

              <MetricCard
                label="Devices"
                value={`${activeDevices}/${devices.length || 4}`}
                sub="Manual tracking active. Device sync path ready."
                tone="cyan"
                onClick={() => onOpen("devices")}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Steps"
          value={steps.toLocaleString()}
          sub={`Goal ${stepGoal.toLocaleString()}`}
          tone="cyan"
          percent={stepPercent}
          onClick={() => onOpen("steps")}
        />

        <MetricCard
          label="Calories"
          value={calories.toLocaleString()}
          sub={`Target ${calorieGoal.toLocaleString()}`}
          tone="amber"
          percent={caloriePercent}
          onClick={() => onOpen("nutrition")}
        />

        <MetricCard
          label="Protein"
          value={`${proteinToday.toLocaleString()}g`}
          sub={`Goal ${proteinGoal.toLocaleString()}g`}
          tone="emerald"
          percent={proteinPercent}
          onClick={() => onOpen("nutrition")}
        />

        <MetricCard
          label="Progress"
          value={safeNumber(snapshot.weight) ? `${snapshot.weight}` : "Log"}
          sub={`${progressLogs.length} entries • ${workouts.length} workouts`}
          tone="fuchsia"
          onClick={() => onOpen("progress")}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <button
          type="button"
          onClick={() => onOpen("library")}
          className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.06]"
        >
          <div className="text-sm font-black text-white">Exercise Library</div>
          <div className="mt-1 text-xs leading-5 text-slate-400">
            Pick movements by muscle group and learn what to feel.
          </div>
        </button>

        <button
          type="button"
          onClick={() => onOpen("workout")}
          className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.06]"
        >
          <div className="text-sm font-black text-white">Workout Studio</div>
          <div className="mt-1 text-xs leading-5 text-slate-400">
            Sets, reps, weight, rest, pain level, and difficulty.
          </div>
        </button>

        <button
          type="button"
          onClick={() => onOpen("synopsis")}
          className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.06]"
        >
          <div className="text-sm font-black text-white">Daily Synopsis</div>
          <div className="mt-1 text-xs leading-5 text-slate-400">
            End-of-day recap and week-to-week recommendation.
          </div>
        </button>
      </div>
    </div>
  );
}