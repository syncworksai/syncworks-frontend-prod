// src/components/customer-health/HealthDailyCoachStatusCard.jsx
import React, { useMemo, useState } from "react";

import {
  readHealthCoachingContext,
  readMeasurementSettings,
  writeHealthCoachingContext,
  writeMeasurementSettings,
} from "./healthCoachingContext";

function safeNumber(value, fallback = 0) {
  const parsed = Number(
    String(value ?? "").replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(parsed) ? parsed : fallback;
}

function daysSince(value) {
  if (!value) return Number.POSITIVE_INFINITY;

  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(
    0,
    Math.floor((Date.now() - time) / 86400000)
  );
}

function measurementLabel(key) {
  const labels = {
    weight: "Weight",
    waist: "Waist",
    progress_photos: "Progress Photos",
    blood_pressure: "Blood Pressure",
    resting_heart_rate: "Resting Heart Rate",
  };

  return labels[key] || key;
}

function buildMeasurementDue(settings) {
  return Object.entries(settings || {})
    .filter(([, item]) => item?.enabled)
    .map(([key, item]) => ({
      key,
      ...item,
      due:
        daysSince(item?.last_logged_at) >=
        safeNumber(item?.frequency_days, 7),
    }))
    .filter((item) => item.due);
}

function calendarSummary(snapshot) {
  const event =
    snapshot?.next_calendar_event ||
    snapshot?.calendar_next_event ||
    snapshot?.next_event ||
    null;

  if (!event) {
    return {
      title: "Calendar ready",
      detail:
        "No relevant schedule conflict is loaded. SYNC will use calendar summaries when available.",
      action: "Keep Plan",
      risk: "clear",
    };
  }

  const title =
    event?.title ||
    event?.summary ||
    "Upcoming commitment";

  const duration = safeNumber(
    event?.duration_minutes ||
      event?.duration ||
      0
  );

  const minutesUntil = safeNumber(
    event?.minutes_until ||
      event?.starts_in_minutes ||
      999
  );

  if (minutesUntil <= 90 || duration >= 120) {
    return {
      title,
      detail:
        "This schedule may affect workout time or recovery. Review before changing the plan.",
      action: "Review Schedule",
      risk: "attention",
    };
  }

  return {
    title,
    detail:
      "The current workout can remain in place based on the available calendar summary.",
    action: "Keep Plan",
    risk: "clear",
  };
}

export default function HealthDailyCoachStatusCard({
  profile,
  snapshot,
  onQuickLog,
  onOpen,
}) {
  const [context, setContext] = useState(
    () => readHealthCoachingContext()
  );
  const [measurementSettings, setMeasurementSettings] =
    useState(() => readMeasurementSettings());

  const measurementsDue = useMemo(
    () => buildMeasurementDue(measurementSettings),
    [measurementSettings]
  );

  const activePainAreas = Array.isArray(
    context?.health_constraints?.active_pain_areas
  )
    ? context.health_constraints.active_pain_areas
    : [];

  const proteinGoal = safeNumber(
    snapshot?.protein_goal ||
      profile?.protein_goal,
    150
  );
  const proteinToday = safeNumber(
    snapshot?.protein_today ||
      snapshot?.protein,
    0
  );
  const proteinRemaining = Math.max(
    0,
    proteinGoal - proteinToday
  );

  const waterGoal = safeNumber(
    snapshot?.water_goal,
    100
  );
  const waterToday = safeNumber(
    snapshot?.water,
    0
  );
  const waterRemaining = Math.max(
    0,
    waterGoal - waterToday
  );

  const stepsGoal = safeNumber(
    snapshot?.step_goal,
    8000
  );
  const stepsToday = safeNumber(
    snapshot?.steps,
    0
  );
  const stepsRemaining = Math.max(
    0,
    stepsGoal - stepsToday
  );

  const schedule = calendarSummary(snapshot);

  function markMeasurementHandled(item) {
    const next = {
      ...measurementSettings,
      [item.key]: {
        ...measurementSettings[item.key],
        last_logged_at: new Date().toISOString(),
      },
    };

    setMeasurementSettings(next);
    writeMeasurementSettings(next);

    if (item.key === "weight") {
      onQuickLog?.("weight");
      return;
    }

    if (item.key === "blood_pressure") {
      onQuickLog?.("blood-pressure");
      return;
    }

    onOpen?.("progress");
  }

  function updatePain(area, status) {
    const now = new Date().toISOString();
    const current = readHealthCoachingContext();
    const active = Array.isArray(
      current?.health_constraints?.active_pain_areas
    )
      ? current.health_constraints.active_pain_areas
      : [];
    const resolved = Array.isArray(
      current?.health_constraints?.resolved_pain_areas
    )
      ? current.health_constraints.resolved_pain_areas
      : [];

    let nextActive = active;
    let nextResolved = resolved;

    if (status === "resolved") {
      nextActive = active.filter(
        (item) => item?.area !== area
      );
      nextResolved = [
        {
          area,
          resolved_at: now,
          source: "daily_health_check_in",
        },
        ...resolved,
      ].slice(0, 50);
    } else {
      nextActive = active.map((item) =>
        item?.area === area
          ? {
              ...item,
              status,
              last_reviewed_at: now,
              next_review_at: new Date(
                Date.now() + 3 * 86400000
              ).toISOString(),
            }
          : item
      );
    }

    const next = writeHealthCoachingContext({
      ...current,
      health_constraints: {
        ...current.health_constraints,
        active_pain_areas: nextActive,
        resolved_pain_areas: nextResolved,
      },
    });

    setContext(next);
  }

  return (
    <section className="rounded-[1.75rem] border border-emerald-300/20 bg-[radial-gradient(circle_at_top_right,rgba(0,245,106,0.11),transparent_34%),linear-gradient(145deg,rgba(14,20,16,0.98),rgba(3,6,4,0.99))] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.32)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
            SYNC Daily Health Context
          </div>
          <h2 className="mt-2 text-2xl font-black text-white">
            What needs attention now?
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            One shared status for training, recovery,
            nutrition, measurements, pain, and schedule.
          </p>
        </div>

        <div className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-100">
          Ask before changing
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-300">
            Nutrition Remaining
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div>
              <div className="text-xl font-black text-white">
                {proteinRemaining}g
              </div>
              <div className="text-[9px] font-bold uppercase text-slate-500">
                Protein
              </div>
            </div>
            <div>
              <div className="text-xl font-black text-white">
                {waterRemaining}
              </div>
              <div className="text-[9px] font-bold uppercase text-slate-500">
                Water oz
              </div>
            </div>
            <div>
              <div className="text-xl font-black text-white">
                {stepsRemaining}
              </div>
              <div className="text-[9px] font-bold uppercase text-slate-500">
                Steps
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onQuickLog?.("meal")}
            className="mt-4 h-11 w-full rounded-xl border border-emerald-300/25 bg-emerald-300/10 text-xs font-black text-emerald-100"
          >
            Log Meal or Protein
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-300">
            Measurement Check-In
          </div>
          <div className="mt-2 text-3xl font-black text-white">
            {measurementsDue.length}
          </div>
          <div className="text-xs leading-5 text-slate-400">
            measurement
            {measurementsDue.length === 1 ? "" : "s"} due
            based on your chosen cadence.
          </div>

          {measurementsDue.length ? (
            <div className="mt-3 space-y-2">
              {measurementsDue.slice(0, 2).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    markMeasurementHandled(item)
                  }
                  className="flex min-h-10 w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 text-left text-xs font-black text-white"
                >
                  <span>
                    {measurementLabel(item.key)}
                  </span>
                  <span className="text-emerald-300">
                    Log
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] p-3 text-xs font-bold text-emerald-100">
              Measurement schedule is current.
            </div>
          )}
        </div>

        <div
          className={`rounded-2xl border p-4 ${
            schedule.risk === "attention"
              ? "border-amber-300/25 bg-amber-300/[0.07]"
              : "border-white/10 bg-black/25"
          }`}
        >
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-300">
            Calendar-Aware Plan
          </div>
          <div className="mt-2 text-lg font-black text-white">
            {schedule.title}
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-400">
            {schedule.detail}
          </div>
          <button
            type="button"
            onClick={() =>
              schedule.risk === "attention"
                ? onOpen?.("planner")
                : onOpen?.("today")
            }
            className="mt-4 h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] text-xs font-black text-white"
          >
            {schedule.action}
          </button>
        </div>
      </div>

      {activePainAreas.length ? (
        <div className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-300/[0.06] p-4">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-rose-200">
            Pain Follow-Up
          </div>
          <div className="mt-1 text-sm font-black text-white">
            Is this feeling better?
          </div>
          <div className="mt-3 space-y-3">
            {activePainAreas.slice(0, 3).map((item) => {
              const area =
                item?.area ||
                item?.location ||
                "Reported area";

              return (
                <div
                  key={`${area}-${item?.created_at || ""}`}
                  className="rounded-xl border border-white/10 bg-black/25 p-3"
                >
                  <div className="text-sm font-black text-white">
                    {area}
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updatePain(area, "improving")
                      }
                      className="h-10 rounded-xl border border-emerald-300/25 bg-emerald-300/10 text-[10px] font-black text-emerald-100"
                    >
                      Better
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updatePain(area, "unchanged")
                      }
                      className="h-10 rounded-xl border border-amber-300/25 bg-amber-300/10 text-[10px] font-black text-amber-100"
                    >
                      Same
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updatePain(area, "resolved")
                      }
                      className="h-10 rounded-xl border border-white/10 bg-white/[0.04] text-[10px] font-black text-white"
                    >
                      Resolved
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 text-[10px] leading-5 text-rose-100/75">
            SYNC provides general fitness information,
            not medical diagnosis or treatment. Stop for
            sharp, severe, worsening, or unusual symptoms
            and consult a qualified healthcare professional.
          </div>
        </div>
      ) : null}
    </section>
  );
}
