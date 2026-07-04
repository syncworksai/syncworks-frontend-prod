// src/components/customer-health/DailyHealthGoalsDrawer.jsx
import React, {
  useMemo,
  useState,
} from "react";
import { Check, RotateCcw, X } from "lucide-react";

import {
  buildDailyMetricIntelligence,
} from "./healthDailyMetricIntelligence";

const DEFAULT_GOALS = {
  step_goal: 8000,
  water_goal: 100,
  protein_goal: 150,
  calorie_goal: 2200,
  sleep_goal: 8,
};

const GOAL_FIELDS = [
  {
    key: "step_goal",
    label: "Daily steps",
    suffix: "steps",
    minimum: 1000,
    maximum: 50000,
    step: 500,
    description:
      "Your movement target for the day.",
  },
  {
    key: "water_goal",
    label: "Daily water",
    suffix: "oz",
    minimum: 20,
    maximum: 300,
    step: 5,
    description:
      "Your hydration target. Use ounces.",
  },
  {
    key: "protein_goal",
    label: "Daily protein",
    suffix: "g",
    minimum: 20,
    maximum: 500,
    step: 5,
    description:
      "Your protein target for recovery and body composition.",
  },
  {
    key: "calorie_goal",
    label: "Daily calories",
    suffix: "cal",
    minimum: 800,
    maximum: 10000,
    step: 50,
    description:
      "Your planned daily calorie target.",
  },
  {
    key: "sleep_goal",
    label: "Nightly sleep",
    suffix: "hours",
    minimum: 4,
    maximum: 14,
    step: 0.5,
    description:
      "Your recovery target for each night.",
  },
];

function safeNumber(value, fallback = 0) {
  const parsed = Number(
    String(value ?? "").replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function clamp(value, minimum, maximum) {
  return Math.min(
    maximum,
    Math.max(minimum, value)
  );
}

function buildGoalDraft(snapshot = {}) {
  return {
    step_goal:
      safeNumber(snapshot?.step_goal) ||
      DEFAULT_GOALS.step_goal,
    water_goal:
      safeNumber(snapshot?.water_goal) ||
      DEFAULT_GOALS.water_goal,
    protein_goal:
      safeNumber(snapshot?.protein_goal) ||
      DEFAULT_GOALS.protein_goal,
    calorie_goal:
      safeNumber(snapshot?.calorie_goal) ||
      DEFAULT_GOALS.calorie_goal,
    sleep_goal:
      safeNumber(snapshot?.sleep_goal) ||
      DEFAULT_GOALS.sleep_goal,
  };
}

export default function DailyHealthGoalsDrawer({
  open,
  onClose,
  snapshot,
  setSnapshot,
}) {
  const [draft, setDraft] = useState(() =>
    buildGoalDraft(snapshot)
  );
  const [saved, setSaved] = useState(false);
  const [lastOpen, setLastOpen] = useState(open);

  if (open !== lastOpen) {
    setLastOpen(open);

    if (open) {
      setDraft(buildGoalDraft(snapshot));
      setSaved(false);
    }
  }

  const preview = useMemo(
    () =>
      buildDailyMetricIntelligence({
        snapshot: {
          ...snapshot,
          ...draft,
        },
      }),
    [snapshot, draft]
  );

  if (!open) return null;

  function updateGoal(field, value) {
    setSaved(false);
    setDraft((previous) => ({
      ...previous,
      [field.key]: clamp(
        safeNumber(value, field.minimum),
        field.minimum,
        field.maximum
      ),
    }));
  }

  function resetDefaults() {
    setDraft(DEFAULT_GOALS);
    setSaved(false);
  }

  function saveGoals() {
    const updatedAt =
      new Date().toISOString();

    setSnapshot((previous) => {
      const next = {
        ...previous,
        ...draft,
        daily_goals_updated_at:
          updatedAt,
      };

      next.daily_metric_intelligence =
        buildDailyMetricIntelligence({
          snapshot: next,
        });

      return next;
    });

    setSaved(true);
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/80 p-3 backdrop-blur-xl sm:items-center">
      <button
        type="button"
        aria-label="Close daily goal settings"
        onClick={onClose}
        className="absolute inset-0"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-health-goals-title"
        className="relative z-[151] max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-cyan-300/25 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.13),transparent_32%),radial-gradient(circle_at_top_right,rgba(57,255,136,0.10),transparent_32%),linear-gradient(180deg,#07111f,#030712)] p-4 shadow-[0_30px_100px_rgba(0,0,0,0.76)] sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
              Daily Goal Intelligence
            </div>

            <h2
              id="daily-health-goals-title"
              className="mt-2 text-3xl font-black tracking-tight text-white"
            >
              Set targets that fit your life
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              SYNC will judge progress, streaks, rewards, and daily priorities against these numbers.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close daily goal settings"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {GOAL_FIELDS.map((field) => (
            <label
              key={field.key}
              className="rounded-2xl border border-white/10 bg-black/20 p-4"
            >
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                {field.label}
              </div>

              <div className="relative mt-2">
                <input
                  type="number"
                  inputMode="decimal"
                  min={field.minimum}
                  max={field.maximum}
                  step={field.step}
                  value={draft[field.key]}
                  onChange={(event) =>
                    updateGoal(
                      field,
                      event.target.value
                    )
                  }
                  className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 pr-20 text-base font-black text-white outline-none focus:border-cyan-300/40"
                />

                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-black text-slate-500">
                  {field.suffix}
                </span>
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                {field.description}
              </p>
            </label>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-lime-300/20 bg-lime-300/[0.07] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-lime-200">
            Live goal preview
          </div>

          <div className="mt-2 text-2xl font-black text-white">
            Today would score {preview.daily_score}%
          </div>

          <p className="mt-1 text-sm leading-6 text-slate-300">
            {preview.coach_message}
          </p>
        </div>

        {saved ? (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-lime-300/25 bg-lime-300/10 px-4 py-3 text-sm font-black text-lime-100">
            <Check size={18} />
            Daily goals saved and coach intelligence recalculated.
          </div>
        ) : null}

        <div className="mt-5 grid gap-2 sm:grid-cols-[auto_1fr]">
          <button
            type="button"
            onClick={resetDefaults}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-slate-200"
          >
            <RotateCcw size={17} />
            Reset defaults
          </button>

          <button
            type="button"
            onClick={saveGoals}
            className="h-12 rounded-2xl border border-lime-300/30 bg-lime-300/15 px-5 text-sm font-black text-lime-100"
          >
            Save Daily Goals
          </button>
        </div>
      </section>
    </div>
  );
}