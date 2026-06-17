// src/components/customer-health/HealthPlannerDrawer.jsx
import React from "react";
import { prettyDate } from "./healthStorage";

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

  const nextPlanned = weekPlan.find(
    (item) => item?.workout_name && item?.status !== "Completed"
  );

  return (
    <DrawerShell open={open} onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <div className="text-sm font-black text-white">Planner tips</div>
          <div className="mt-2 text-sm leading-6 text-emerald-100/90">
            Give users a clear weekly plan, a time to train, and an easy way to add the next session to calendar.
            This is what makes them come back to the app daily.
          </div>

          {nextPlanned ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-emerald-100">
                Next up: {nextPlanned.day_label} • {nextPlanned.time || "Anytime"} • {nextPlanned.workout_name}
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