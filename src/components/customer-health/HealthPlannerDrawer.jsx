// src/components/customer-health/HealthPlannerDrawer.jsx
import React from "react";
import { prettyDate, uid } from "./healthStorage";

function buildGoogleCalendarLink(item) {
  if (!item?.ymd || !item?.workout_name) return "#";

  const start = new Date(`${item.ymd}T${item.time || "09:00"}:00`);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  function fmt(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return (
      `${d.getUTCFullYear()}` +
      `${pad(d.getUTCMonth() + 1)}` +
      `${pad(d.getUTCDate())}` +
      `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
    );
  }

  const params = new URLSearchParams();
  params.set("action", "TEMPLATE");
  params.set("text", item.workout_name);
  params.set(
    "details",
    `SyncWorks Health workout planner\nStatus: ${item.status || "Planned"}\nNote: ${item.note || ""}`
  );
  params.set("dates", `${fmt(start)}/${fmt(end)}`);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function addDaysYmd(ymd, days) {
  const date = new Date(`${ymd}T12:00:00`);

  if (!Number.isFinite(date.getTime())) {
    return ymd;
  }

  date.setDate(date.getDate() + days);

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function DrawerShell({ open, onClose, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/75 backdrop-blur-sm md:items-center">
      <div className="relative max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-t-3xl border border-cyan-500/20 bg-[#020617] shadow-[0_22px_80px_rgba(0,0,0,0.45)] md:rounded-3xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
              Workout Planner
            </div>
            <div className="mt-1 text-lg font-black text-white">
              Plan the week and add sessions to calendar
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/[0.08]"
          >
            Close
          </button>
        </div>

        <div className="max-h-[calc(92vh-76px)] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export default function HealthPlannerDrawer({
  open,
  onClose,
  snapshot,
  setSnapshot,
  workouts,
  onStartWorkout,
  onOpenMyWorkouts,
  onEditTrainingProfile,
}) {
  const weekPlan = Array.isArray(snapshot?.week_plan) ? snapshot.week_plan : [];

  function updateRow(index, updater) {
    setSnapshot((prev) => {
      const rows = Array.isArray(prev.week_plan) ? [...prev.week_plan] : [];
      const current = rows[index] || {};
      rows[index] = typeof updater === "function" ? updater(current) : current;

      return {
        ...prev,
        week_plan: rows,
      };
    });
  }

  function handleWorkoutChange(index, workoutId) {
    const selected = workouts.find((w) => w.id === workoutId);

    updateRow(index, (current) => ({
      ...current,
      workout_id: selected?.id || "",
      workout_name: selected?.name || "",
      status: selected ? current.status === "Completed" ? "Completed" : "Planned" : "Rest Day",
      note: selected ? current.note || "Planned session" : "Recovery / open day",
    }));
  }

  const activeSessions = weekPlan.filter(
    (item) =>
      item?.workout_name &&
      !["Completed", "Skipped", "Rescheduled"].includes(
        String(item?.status || "")
      )
  );

  const completedCount = weekPlan.filter(
    (item) => item?.status === "Completed"
  ).length;

  const nextPlanned = activeSessions[0];

  function repeatPlanNextWeek() {
    if (!activeSessions.length) return;

    const createdAt = new Date().toISOString();
    const existingKeys = new Set(
      weekPlan.map(
        (item) =>
          `${item?.ymd || ""}|${
            item?.time || ""
          }|${item?.workout_id || item?.workout_name || ""}`
      )
    );

    const duplicates = activeSessions
      .map((item) => {
        const nextYmd = addDaysYmd(
          item.ymd,
          7
        );

        const key = `${nextYmd}|${
          item?.time || ""
        }|${item?.workout_id || item?.workout_name || ""}`;

        if (existingKeys.has(key)) {
          return null;
        }

        existingKeys.add(key);

        return {
          ...item,
          id: uid("repeated-session"),
          ymd: nextYmd,
          status: "Planned",
          completed_at: undefined,
          skipped_at: undefined,
          resolved_at: undefined,
          rescheduled_at: undefined,
          repeated_from_id: item.id,
          repeated_at: createdAt,
          source:
            item.source ||
            "planner_repeat",
        };
      })
      .filter(Boolean);

    if (!duplicates.length) return;

    setSnapshot((previous) => ({
      ...previous,
      week_plan: [
        ...(
          Array.isArray(previous.week_plan)
            ? previous.week_plan
            : []
        ),
        ...duplicates,
      ].sort((left, right) =>
        `${left?.ymd || ""}T${
          left?.time || "23:59"
        }`.localeCompare(
          `${right?.ymd || ""}T${
            right?.time || "23:59"
          }`
        )
      ),
      planned_workouts:
        Number(previous.planned_workouts || 0) +
        duplicates.length,
      last_coach_change_title:
        "Next week is scheduled",
      last_coach_change_reason:
        `${duplicates.length} sessions were repeated into next week at the same times.`,
      updated_at: createdAt,
    }));
  }

  return (
    <DrawerShell open={open} onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-black text-white">
                Your Training Schedule
              </div>
              <div className="mt-2 text-sm leading-6 text-emerald-100/90">
                Start the next session, adjust any day, repeat the plan into next week, or open the full workout studio.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="rounded-full border border-white/10 bg-black/15 px-3 py-1.5 text-xs font-black text-white">
                {activeSessions.length} upcoming
              </div>
              <div className="rounded-full border border-white/10 bg-black/15 px-3 py-1.5 text-xs font-black text-white">
                {completedCount} completed
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={repeatPlanNextWeek}
              disabled={!activeSessions.length}
              className="h-11 rounded-2xl border border-lime-300/30 bg-lime-300/15 px-3 text-sm font-black text-lime-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Repeat Next Week
            </button>

            <button
              type="button"
              onClick={onOpenMyWorkouts}
              className="h-11 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-3 text-sm font-black text-cyan-100"
            >
              Open My Workouts
            </button>

            <button
              type="button"
              onClick={onEditTrainingProfile}
              className="h-11 rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 text-sm font-black text-fuchsia-100"
            >
              Edit Training Profile
            </button>
          </div>

          {nextPlanned ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-emerald-100">
                Next up: {nextPlanned.day_label} | {nextPlanned.time || "Anytime"} | {nextPlanned.workout_name}
              </div>

              <a
                href={buildGoogleCalendarLink(nextPlanned)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 text-sm font-black text-cyan-100 hover:bg-cyan-500/20"
              >
                Add Next Workout to Calendar
              </a>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4">
          {weekPlan.map((item, index) => (
            <div
              key={item.id || index}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="grid gap-4 lg:grid-cols-[160px_1fr_110px_140px]">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    {item.day_label}
                  </div>
                  <div className="mt-1 text-lg font-black text-white">
                    {prettyDate(item.ymd)}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                    Workout
                  </label>
                  <select
                    value={item.workout_id || ""}
                    onChange={(e) => handleWorkoutChange(index, e.target.value)}
                    className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 text-sm text-white outline-none"
                  >
                    <option value="">Rest Day / Open Day</option>
                    {workouts.map((workout) => (
                      <option key={workout.id} value={workout.id}>
                        {workout.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={item.note || ""}
                    onChange={(e) =>
                      updateRow(index, (current) => ({
                        ...current,
                        note: e.target.value,
                      }))
                    }
                    placeholder="Optional note"
                    className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                    Time
                  </label>
                  <input
                    type="time"
                    value={item.time || ""}
                    onChange={(e) =>
                      updateRow(index, (current) => ({
                        ...current,
                        time: e.target.value,
                      }))
                    }
                    className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                    Status
                  </label>
                  <select
                    value={item.status || "Planned"}
                    onChange={(e) =>
                      updateRow(index, (current) => ({
                        ...current,
                        status: e.target.value,
                      }))
                    }
                    className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 text-sm text-white outline-none"
                  >
                    <option value="Planned">Planned</option>
                    <option value="Completed">Completed</option>
                    <option value="Skipped">Skipped</option>
                    <option value="Rest Day">Rest Day</option>
                  </select>
                </div>
              </div>

              {item.workout_name ? (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div className="rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-fuchsia-100">
                    {item.workout_name}
                  </div>

                  {!["Completed", "Skipped", "Rescheduled"].includes(
                    String(item.status || "")
                  ) ? (
                    <button
                      type="button"
                      onClick={() =>
                        onStartWorkout?.(item)
                      }
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-lime-300/30 bg-lime-300/15 px-3 text-xs font-black text-lime-100"
                    >
                      Start Workout
                    </button>
                  ) : null}

                  <a
                    href={buildGoogleCalendarLink(item)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-cyan-200 underline underline-offset-4 hover:text-cyan-100"
                  >
                    Add this day to Google Calendar
                  </a>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </DrawerShell>
  );
}