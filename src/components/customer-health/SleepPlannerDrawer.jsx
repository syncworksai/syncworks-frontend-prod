// src/components/customer-health/SleepPlannerDrawer.jsx
import React, { useEffect, useMemo, useState } from "react";

import SleepCheckInCard from "./SleepCheckInCard";

import {
  DEFAULT_SLEEP_PLAN,
  buildSleepPlannerSnapshot,
  formatClock,
  formatHours,
  getQuietHours,
  normalizeSleepPlan,
  plannedSleepHours,
} from "./healthSleepPlanner";

import {
  buildSleepGoogleCalendarLink,
  downloadSleepScheduleIcs,
} from "./healthCalendarUtils";

const DAYS = [
  ["sun", "S"],
  ["mon", "M"],
  ["tue", "T"],
  ["wed", "W"],
  ["thu", "T"],
  ["fri", "F"],
  ["sat", "S"],
];

const MOTIVATION_STYLES = [
  ["grit", "Grit"],
  ["discipline", "Discipline"],
  ["confidence", "Confidence"],
  ["competitive", "Competitive"],
  ["health_longevity", "Health & Longevity"],
  ["athletic_performance", "Athletic Performance"],
  ["weight_loss", "Weight Loss"],
  ["strength", "Strength"],
];

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-left"
    >
      <div>
        <div className="text-sm font-black text-white">{label}</div>

        {description ? (
          <div className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </div>
        ) : null}
      </div>

      <div
        className={cx(
          "relative h-7 w-12 shrink-0 rounded-full border transition",
          checked
            ? "border-lime-300/30 bg-lime-300/20"
            : "border-white/10 bg-slate-900"
        )}
      >
        <div
          className={cx(
            "absolute top-1 h-5 w-5 rounded-full transition",
            checked ? "left-6 bg-lime-300" : "left-1 bg-slate-500"
          )}
        />
      </div>
    </button>
  );
}

export default function SleepPlannerDrawer({
  open,
  onClose,
  profile,
  setProfile,
  snapshot,
  setSnapshot,
}) {
  const initialPlan = useMemo(
    () => normalizeSleepPlan(snapshot?.sleep_plan || profile?.sleep_plan || {}),
    [snapshot?.sleep_plan, profile?.sleep_plan]
  );

  const [draft, setDraft] = useState(initialPlan);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;

    setDraft(initialPlan);
    setMessage("");
  }, [open, initialPlan]);

  if (!open) return null;

  const scheduledHours = plannedSleepHours(draft);
  const quiet = getQuietHours(draft);

  function patch(field, value) {
    setDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function toggleDay(day) {
    setDraft((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((item) => item !== day)
        : [...prev.days, day],
    }));
  }

  function toggleMotivation(style) {
    setDraft((prev) => ({
      ...prev,
      motivation_styles: prev.motivation_styles.includes(style)
        ? prev.motivation_styles.filter((item) => item !== style)
        : [...prev.motivation_styles, style],
    }));
  }

  function savePlan() {
    const normalized = normalizeSleepPlan(draft);

    setProfile?.((prev) => ({
      ...prev,
      sleep_plan: normalized,
      motivation_styles: normalized.motivation_styles,
      usual_sleep_time: normalized.bedtime,
      usual_wake_time: normalized.wake_time,
      sleep_goal_hours: normalized.sleep_goal_hours,
      updated_at: new Date().toISOString(),
    }));

    setSnapshot?.((prev) => buildSleepPlannerSnapshot(prev, normalized));

    setMessage(
      "Sleep plan saved. Quiet hours and recovery guidance are active."
    );
  }

  function addTonight() {
    window.open(
      buildSleepGoogleCalendarLink(draft),
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/80 backdrop-blur-xl">
      <button
        type="button"
        aria-label="Close sleep planner"
        onClick={onClose}
        className="absolute inset-0"
      />

      <section className="relative z-[101] flex h-full w-full max-w-3xl flex-col border-l border-cyan-300/10 bg-[radial-gradient(circle_at_top_left,rgba(57,255,136,0.10),transparent_24%),radial-gradient(circle_at_top_right,rgba(255,59,212,0.10),transparent_24%),linear-gradient(180deg,#040812,#07111f)] shadow-[-30px_0_80px_rgba(0,0,0,0.55)]">
        <div className="border-b border-white/10 px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-fuchsia-200">
                Recovery Planner
              </div>

              <h2 className="mt-1 text-3xl font-black text-white">
                Sleep & Quiet Hours
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Protect recovery, stop routine notifications before bed, and
                block sleep on your calendar.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 pb-28 sm:px-6">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Bedtime
                </div>

                <input
                  type="time"
                  value={draft.bedtime}
                  onChange={(event) =>
                    patch("bedtime", event.target.value)
                  }
                  className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-white outline-none focus:border-fuchsia-300/40"
                />
              </label>

              <label className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Wake time
                </div>

                <input
                  type="time"
                  value={draft.wake_time}
                  onChange={(event) =>
                    patch("wake_time", event.target.value)
                  }
                  className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-white outline-none focus:border-cyan-300/40"
                />
              </label>
            </div>

            <div className="rounded-[1.75rem] border border-lime-300/15 bg-lime-300/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-lime-300">
                    Sleep goal
                  </div>

                  <div className="mt-1 text-xl font-black text-white">
                    {formatHours(draft.sleep_goal_hours)}
                  </div>
                </div>

                <div className="text-right text-xs leading-5 text-slate-400">
                  Scheduled window
                  <br />
                  <span className="font-black text-white">
                    {formatHours(scheduledHours)}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {[7, 7.5, 8, 8.5, 9].map((hours) => (
                  <button
                    key={hours}
                    type="button"
                    onClick={() => patch("sleep_goal_hours", hours)}
                    className={cx(
                      "rounded-xl border px-3 py-2 text-xs font-black",
                      Number(draft.sleep_goal_hours) === hours
                        ? "border-lime-300/30 bg-lime-300/15 text-lime-100"
                        : "border-white/10 bg-white/[0.04] text-slate-300"
                    )}
                  >
                    {hours}h
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Active nights
              </div>

              <div className="mt-3 grid grid-cols-7 gap-2">
                {DAYS.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleDay(key)}
                    className={cx(
                      "flex aspect-square items-center justify-center rounded-2xl border text-sm font-black",
                      draft.days.includes(key)
                        ? "border-cyan-300/30 bg-cyan-300/15 text-cyan-100"
                        : "border-white/10 bg-white/[0.03] text-slate-500"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <ToggleRow
              label="Quiet hours"
              description={`Routine reminders stop at ${formatClock(
                quiet.starts_at
              )} and resume at ${formatClock(quiet.ends_at)}.`}
              checked={draft.quiet_hours_enabled}
              onChange={(value) => patch("quiet_hours_enabled", value)}
            />

            <label className="block rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Stop notifications before bedtime
              </div>

              <select
                value={draft.notification_cutoff_minutes}
                onChange={(event) =>
                  patch(
                    "notification_cutoff_minutes",
                    Number(event.target.value)
                  )
                }
                className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none"
              >
                {[0, 15, 30, 45, 60, 90].map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} minutes before bed
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-[1.75rem] border border-fuchsia-300/15 bg-fuchsia-300/5 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-200">
                Motivation styles
              </div>

              <div className="mt-2 text-xs leading-5 text-slate-500">
                Choose multiple. These will shape daily-plan language and
                workout encouragement.
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {MOTIVATION_STYLES.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleMotivation(key)}
                    className={cx(
                      "rounded-2xl border px-3 py-2 text-xs font-black",
                      draft.motivation_styles.includes(key)
                        ? "border-fuchsia-300/30 bg-fuchsia-300/15 text-fuchsia-100"
                        : "border-white/10 bg-white/[0.04] text-slate-300"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-cyan-300/15 bg-cyan-300/5 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
                Reminder intensity
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                {[
                  "essential",
                  "balanced",
                  "highly_engaged",
                  "custom",
                ].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => patch("notification_frequency", mode)}
                    className={cx(
                      "rounded-2xl border px-3 py-3 text-xs font-black capitalize",
                      draft.notification_frequency === mode
                        ? "border-cyan-300/30 bg-cyan-300/15 text-cyan-100"
                        : "border-white/10 bg-white/[0.04] text-slate-300"
                    )}
                  >
                    {mode.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <SleepCheckInCard
              snapshot={snapshot}
              setSnapshot={setSnapshot}
            />

            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Calendar
              </div>

              <div className="mt-2 text-sm leading-6 text-slate-300">
                Block tonight in Google Calendar or export the next seven nights
                for Google, Apple, or Outlook.
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={addTonight}
                  className="h-11 rounded-2xl border border-lime-300/25 bg-lime-300/10 px-4 text-sm font-black text-lime-100"
                >
                  Add Tonight to Google Calendar
                </button>

                <button
                  type="button"
                  onClick={() => downloadSleepScheduleIcs(draft)}
                  className="h-11 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 text-sm font-black text-cyan-100"
                >
                  Export 7-Night Schedule
                </button>
              </div>
            </div>

            {message ? (
              <div className="rounded-2xl border border-lime-300/20 bg-lime-300/10 p-3 text-sm font-bold text-lime-100">
                {message}
              </div>
            ) : null}
          </div>
        </div>

        <div className="border-t border-white/10 bg-[#020617]/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.8rem)] pt-3 backdrop-blur-xl sm:px-6">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                setDraft(normalizeSleepPlan(DEFAULT_SLEEP_PLAN))
              }
              className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-slate-200"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={savePlan}
              className="h-12 rounded-2xl border border-lime-300/30 bg-lime-300/15 text-sm font-black text-lime-100 shadow-[0_0_30px_rgba(57,255,136,0.12)]"
            >
              Save Sleep Plan
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}