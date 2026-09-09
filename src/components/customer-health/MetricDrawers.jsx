// src/components/customer-health/MetricDrawers.jsx
import React from "react";
import HealthDrawer from "./HealthDrawer";
import { prettyDate, safeNumber, todayYmd, uid } from "./healthStorage";

function Field({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-slate-400">{label}</div>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none"
      />
    </label>
  );
}

function measurementSummary(measurements = {}) {
  return [
    measurements.waist ? `Waist ${measurements.waist}` : "",
    measurements.chest ? `Chest ${measurements.chest}` : "",
    measurements.hips ? `Hips ${measurements.hips}` : "",
    measurements.left_arm ? `L arm ${measurements.left_arm}` : "",
    measurements.right_arm ? `R arm ${measurements.right_arm}` : "",
    measurements.left_thigh ? `L thigh ${measurements.left_thigh}` : "",
    measurements.right_thigh ? `R thigh ${measurements.right_thigh}` : "",
  ].filter(Boolean).join(" | ");
}

export function NutritionDrawer({ open, onClose, snapshot, setSnapshot }) {
  return (
    <HealthDrawer open={open} onClose={onClose} title="Calories & Nutrition" subtitle="Calories, protein, water, and meal notes.">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Calories consumed" value={snapshot.calories} onChange={(v) => setSnapshot((p) => ({ ...p, calories: v }))} type="number" />
          <Field label="Calorie target" value={snapshot.calorie_goal} onChange={(v) => setSnapshot((p) => ({ ...p, calorie_goal: v }))} type="number" />
          <Field label="Protein today" value={snapshot.protein_today} onChange={(v) => setSnapshot((p) => ({ ...p, protein_today: v }))} type="number" />
          <Field label="Protein goal" value={snapshot.protein_goal} onChange={(v) => setSnapshot((p) => ({ ...p, protein_goal: v }))} type="number" />
          <Field label="Water today" value={snapshot.water} onChange={(v) => setSnapshot((p) => ({ ...p, water: v }))} type="number" placeholder="oz" />
          <Field label="Water goal" value={snapshot.water_goal} onChange={(v) => setSnapshot((p) => ({ ...p, water_goal: v }))} type="number" placeholder="oz" />
        </div>

        <label className="block">
          <div className="mb-1 text-xs font-semibold text-slate-400">Meal notes</div>
          <textarea
            value={snapshot.meal_notes || ""}
            onChange={(e) => setSnapshot((p) => ({ ...p, meal_notes: e.target.value }))}
            rows={4}
            placeholder="What did you eat today? Any misses? Any wins?"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
          />
        </label>

        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">
          Simple rule: protein first, calories second, consistency always. The app can later use this data to adjust workout recovery and weekly recommendations.
        </div>
      </div>
    </HealthDrawer>
  );
}

export function StepsDrawer({ open, onClose, snapshot, setSnapshot }) {
  return (
    <HealthDrawer open={open} onClose={onClose} title="Steps & Activity" subtitle="Manual activity tracking now, device sync later.">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Steps today" value={snapshot.steps} onChange={(v) => setSnapshot((p) => ({ ...p, steps: v }))} type="number" />
          <Field label="Step goal" value={snapshot.step_goal} onChange={(v) => setSnapshot((p) => ({ ...p, step_goal: v }))} type="number" />
          <Field label="Active minutes" value={snapshot.active_minutes || ""} onChange={(v) => setSnapshot((p) => ({ ...p, active_minutes: v }))} type="number" />
          <Field label="Calories burned" value={snapshot.calories_burned || ""} onChange={(v) => setSnapshot((p) => ({ ...p, calories_burned: v }))} type="number" />
        </div>

        <label className="block">
          <div className="mb-1 text-xs font-semibold text-slate-400">Activity notes</div>
          <textarea
            value={snapshot.activity_notes || ""}
            onChange={(e) => setSnapshot((p) => ({ ...p, activity_notes: e.target.value }))}
            rows={4}
            placeholder="Walk, run, game, practice, cardio, recovery..."
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
          />
        </label>
      </div>
    </HealthDrawer>
  );
}

export function ProgressDrawer({ open, onClose, snapshot, setSnapshot, progressLogs, setProgressLogs, history, setHistory }) {
  function addProgressLog() {
    const measurements = {
      waist: snapshot.waist || "",
      chest: snapshot.chest || "",
      hips: snapshot.hips || "",
      left_arm: snapshot.left_arm || "",
      right_arm: snapshot.right_arm || "",
      left_thigh: snapshot.left_thigh || "",
      right_thigh: snapshot.right_thigh || "",
      units: "in",
    };

    const log = {
      id: uid("progress"),
      type: "progress",
      date: todayYmd(),
      ymd: todayYmd(),
      weight: snapshot.weight,
      steps: snapshot.steps,
      calories: snapshot.calories,
      protein_today: snapshot.protein_today,
      readiness: snapshot.readiness,
      workout: snapshot.workout,
      measurements,
      note: snapshot.notes || "",
      created_at: new Date().toISOString(),
    };

    setProgressLogs((prev) => [log, ...prev].slice(0, 100));
  }

  return (
    <HealthDrawer open={open} onClose={onClose} title="Progress & Measurements" subtitle="Track weight, body measurements, completed workouts, and trends.">
      <div className="space-y-4">
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/[0.06] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">Progress check-in</div>
          <p className="mt-1 text-xs leading-5 text-slate-400">For clean comparisons, use the same conditions each time: ideally morning, before food, and the same tape placement.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Weight (lb)" value={snapshot.weight} onChange={(v) => setSnapshot((p) => ({ ...p, weight: v }))} type="number" />
          <Field label="Readiness" value={snapshot.readiness} onChange={(v) => setSnapshot((p) => ({ ...p, readiness: v }))} />
        </div>

        <div>
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-violet-200">Body measurements · inches</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Waist" value={snapshot.waist} onChange={(v) => setSnapshot((p) => ({ ...p, waist: v }))} type="number" placeholder="in" />
            <Field label="Chest" value={snapshot.chest} onChange={(v) => setSnapshot((p) => ({ ...p, chest: v }))} type="number" placeholder="in" />
            <Field label="Hips" value={snapshot.hips} onChange={(v) => setSnapshot((p) => ({ ...p, hips: v }))} type="number" placeholder="in" />
            <Field label="Left arm" value={snapshot.left_arm} onChange={(v) => setSnapshot((p) => ({ ...p, left_arm: v }))} type="number" placeholder="in" />
            <Field label="Right arm" value={snapshot.right_arm} onChange={(v) => setSnapshot((p) => ({ ...p, right_arm: v }))} type="number" placeholder="in" />
            <Field label="Left thigh" value={snapshot.left_thigh} onChange={(v) => setSnapshot((p) => ({ ...p, left_thigh: v }))} type="number" placeholder="in" />
            <Field label="Right thigh" value={snapshot.right_thigh} onChange={(v) => setSnapshot((p) => ({ ...p, right_thigh: v }))} type="number" placeholder="in" />
          </div>
        </div>

        <button
          type="button"
          onClick={addProgressLog}
          className="w-full rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-3 text-xs font-black text-cyan-100"
        >
          Save Today's Progress + Measurements
        </button>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-black text-white">Progress Entries</div>
            <div className="mt-3 space-y-3">
              {progressLogs.slice(0, 8).map((log) => {
                const measurements = measurementSummary(log.measurements);
                return (
                  <div key={log.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                    <div className="text-sm font-black text-white">{prettyDate(log.date || log.ymd)}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-400">
                      Weight: {log.weight || "-"} | Steps: {safeNumber(log.steps).toLocaleString()} | Protein: {safeNumber(log.protein_today).toLocaleString()}g
                    </div>
                    {measurements ? <div className="mt-1 text-xs leading-5 text-violet-200">{measurements} in</div> : null}
                    <button
                      type="button"
                      onClick={() => setProgressLogs((prev) => prev.filter((x) => x.id !== log.id))}
                      className="mt-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-2 py-1 text-[11px] font-black text-rose-100"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
              {!progressLogs.length ? <div className="text-sm text-slate-500">No progress logs yet.</div> : null}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-black text-white">Workout History</div>
            <div className="mt-3 space-y-3">
              {history.slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                  <div className="text-sm font-black text-white">{item.workout_name}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-400">
                    {prettyDate(item.date)} | {item.readiness || "Readiness not set"} | Exercises: {Array.isArray(item.exercises) ? item.exercises.length : 0}
                  </div>
                  <button
                    type="button"
                    onClick={() => setHistory((prev) => prev.filter((x) => x.id !== item.id))}
                    className="mt-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-2 py-1 text-[11px] font-black text-rose-100"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {!history.length ? <div className="text-sm text-slate-500">No completed workouts yet.</div> : null}
            </div>
          </div>
        </div>
      </div>
    </HealthDrawer>
  );
}
