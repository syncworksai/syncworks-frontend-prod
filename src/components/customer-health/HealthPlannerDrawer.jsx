// src/components/customer-health/HealthPlannerDrawer.jsx
import React, { useMemo, useState } from "react";
import { todayYmd, uid } from "./healthStorage";

function ymd(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseYmd(value) {
  const date = new Date(`${value || ""}T12:00:00`);
  return Number.isFinite(date.getTime()) ? date : null;
}

function monthTitle(date) {
  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function dayLabel(value) {
  const date = parseYmd(value);
  return date
    ? date.toLocaleDateString(undefined, { weekday: "short" })
    : "";
}

function statusTone(status) {
  if (status === "Completed") {
    return "border-lime-300/30 bg-lime-300/12 text-lime-100";
  }

  if (status === "Skipped" || status === "Rescheduled") {
    return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  }

  return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
}

function calendarCells(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = first.getDay();
  const cells = [];

  for (let index = 0; index < leading; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }

  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function HealthPlannerDrawer({
  open,
  onClose,
  snapshot,
  setSnapshot,
  workouts,
  history = [],
  onStartWorkout,
  onOpenMyWorkouts,
  onEditTrainingProfile,
}) {
  const now = new Date();
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(now.getFullYear(), now.getMonth(), 1)
  );
  const [selectedYmd, setSelectedYmd] = useState(todayYmd());

  const plan = Array.isArray(snapshot?.week_plan)
    ? snapshot.week_plan
    : [];

  const completedHistory = Array.isArray(history) ? history : [];

  const entriesByDate = useMemo(() => {
    const map = new Map();

    function add(dateKey, entry) {
      if (!dateKey) return;
      const current = map.get(dateKey) || [];
      current.push(entry);
      map.set(dateKey, current);
    }

    plan.forEach((item) => {
      if (!item?.workout_name || !item?.ymd) return;
      add(item.ymd, {
        ...item,
        calendar_source: "plan",
      });
    });

    completedHistory.forEach((item) => {
      const dateKey =
        item?.ymd ||
        String(
          item?.finished_at ||
          item?.completed_at ||
          item?.created_at ||
          ""
        ).slice(0, 10);

      if (!dateKey) return;

      const alreadyPlanned = (map.get(dateKey) || []).some(
        (planned) =>
          planned?.completed_session_id === item?.id ||
          (planned?.status === "Completed" &&
            planned?.workout_name ===
              (item?.workout_name || item?.name))
      );

      if (alreadyPlanned) return;

      add(dateKey, {
        id: item?.id || uid("history-calendar"),
        ymd: dateKey,
        workout_name:
          item?.workout_name || item?.name || "Completed Workout",
        status: "Completed",
        calendar_source: "history",
        completed_at:
          item?.finished_at ||
          item?.completed_at ||
          item?.created_at ||
          "",
      });
    });

    for (const entries of map.values()) {
      entries.sort((left, right) =>
        String(left?.time || "23:59").localeCompare(
          String(right?.time || "23:59")
        )
      );
    }

    return map;
  }, [plan, completedHistory]);

  const selectedEntries =
    entriesByDate.get(selectedYmd) || [];

  const todayEntries =
    entriesByDate.get(todayYmd()) || [];

  const todayPlanned = todayEntries.find(
    (item) =>
      item?.calendar_source === "plan" &&
      !["Completed", "Skipped", "Rescheduled"].includes(
        String(item?.status || "")
      )
  );

  function moveMonth(amount) {
    setVisibleMonth(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() + amount,
          1
        )
    );
  }

  function goToday() {
    const current = new Date();
    setVisibleMonth(
      new Date(current.getFullYear(), current.getMonth(), 1)
    );
    setSelectedYmd(todayYmd());
  }

  function updatePlan(updater) {
    setSnapshot((previous) => {
      const currentPlan = Array.isArray(previous?.week_plan)
        ? previous.week_plan
        : [];

      const nextPlan = updater(currentPlan);

      const nextToday = nextPlan.find(
        (item) =>
          item?.ymd === todayYmd() &&
          item?.workout_name &&
          !["Completed", "Skipped", "Rescheduled"].includes(
            String(item?.status || "")
          )
      );

      return {
        ...previous,
        week_plan: nextPlan.sort((left, right) =>
          `${left?.ymd || ""}T${left?.time || "23:59"}`.localeCompare(
            `${right?.ymd || ""}T${right?.time || "23:59"}`
          )
        ),
        today_workout_id: nextToday?.id || "",
        workout: nextToday?.workout_name || "",
        updated_at: new Date().toISOString(),
      };
    });
  }

  function moveToToday(item) {
    if (!item?.id || item?.calendar_source !== "plan") return;

    updatePlan((currentPlan) =>
      currentPlan.map((entry) =>
        entry?.id === item.id
          ? {
              ...entry,
              original_ymd: entry.original_ymd || entry.ymd,
              ymd: todayYmd(),
              day_label: dayLabel(todayYmd()),
              status: "Planned",
              moved_to_today_at: new Date().toISOString(),
            }
          : entry
      )
    );

    setSelectedYmd(todayYmd());
  }

  function swapWithToday(item) {
    if (
      !item?.id ||
      item?.calendar_source !== "plan" ||
      !todayPlanned?.id ||
      todayPlanned.id === item.id
    ) {
      moveToToday(item);
      return;
    }

    const selectedDate = item.ymd;

    updatePlan((currentPlan) =>
      currentPlan.map((entry) => {
        if (entry?.id === item.id) {
          return {
            ...entry,
            ymd: todayYmd(),
            day_label: dayLabel(todayYmd()),
            swapped_at: new Date().toISOString(),
            swapped_with_id: todayPlanned.id,
            status: "Planned",
          };
        }

        if (entry?.id === todayPlanned.id) {
          return {
            ...entry,
            ymd: selectedDate,
            day_label: dayLabel(selectedDate),
            swapped_at: new Date().toISOString(),
            swapped_with_id: item.id,
            status: "Planned",
          };
        }

        return entry;
      })
    );

    setSelectedYmd(todayYmd());
  }

  function chooseWorkoutForDay(workoutId) {
    const workout = (Array.isArray(workouts) ? workouts : []).find(
      (item) => item?.id === workoutId
    );

    if (!workout) return;

    const plannerItem = {
      id: uid("calendar-workout"),
      workout_id: workout.id,
      workout_name:
        workout.workout_name || workout.name || "Workout",
      name: workout.name || workout.workout_name || "Workout",
      ymd: selectedYmd,
      day_label: dayLabel(selectedYmd),
      time: "18:00",
      status: "Planned",
      source: "month_calendar",
      exercises: Array.isArray(workout.exercises)
        ? workout.exercises
        : [],
    };

    updatePlan((currentPlan) => [...currentPlan, plannerItem]);
  }

  if (!open) return null;

  const cells = calendarCells(visibleMonth);

  return (
    <div className="fixed inset-0 z-[90] bg-[#020403] text-white">
      <section className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(112,255,61,0.12),transparent_30%),linear-gradient(180deg,#050806,#020403)]">
        <header className="border-b border-lime-300/15 bg-[#030604]/96 px-3 py-3 backdrop-blur-xl sm:px-5">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-300">
                Workout Calendar
              </div>
              <h2 className="mt-1 text-xl font-black text-white sm:text-3xl">
                {monthTitle(visibleMonth)}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-xs font-black text-white"
            >
              Close
            </button>
          </div>

          <div className="mx-auto mt-3 grid max-w-5xl grid-cols-[1fr_auto_1fr] gap-2">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              className="h-10 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-black text-slate-200"
            >
              Previous
            </button>

            <button
              type="button"
              onClick={goToday}
              className="h-10 rounded-xl border border-lime-300/30 bg-lime-300/12 px-4 text-xs font-black text-lime-100"
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => moveMonth(1)}
              className="h-10 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-black text-slate-200"
            >
              Next
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto px-2 py-3 pb-28 sm:px-5">
          <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
              (label) => (
                <div key={label} className="py-1">
                  {label}
                </div>
              )
            )}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((date, index) => {
              if (!date) {
                return (
                  <div
                    key={`blank-${index}`}
                    className="min-h-[74px] rounded-xl border border-transparent"
                  />
                );
              }

              const dateKey = ymd(date);
              const entries = entriesByDate.get(dateKey) || [];
              const selected = dateKey === selectedYmd;
              const isToday = dateKey === todayYmd();

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => setSelectedYmd(dateKey)}
                  className={`min-h-[74px] overflow-hidden rounded-xl border p-1.5 text-left transition ${
                    selected
                      ? "border-lime-300/45 bg-lime-300/12"
                      : isToday
                      ? "border-emerald-300/30 bg-emerald-300/[0.08]"
                      : "border-white/10 bg-white/[0.025]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white">
                      {date.getDate()}
                    </span>
                    {isToday ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-lime-300 shadow-[0_0_10px_rgba(112,255,61,0.8)]" />
                    ) : null}
                  </div>

                  <div className="mt-1 space-y-1">
                    {entries.slice(0, 2).map((entry) => (
                      <div
                        key={entry.id}
                        className={`truncate rounded-md border px-1 py-0.5 text-[7px] font-black ${statusTone(
                          entry.status
                        )}`}
                      >
                        {entry.workout_name}
                      </div>
                    ))}

                    {entries.length > 2 ? (
                      <div className="text-[7px] font-black text-slate-500">
                        +{entries.length - 2} more
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          <section className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.18em] text-lime-300">
                  Selected Day
                </div>
                <div className="mt-1 text-lg font-black text-white">
                  {parseYmd(selectedYmd)?.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>

              <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[9px] font-black text-slate-300">
                {selectedEntries.length} workout
                {selectedEntries.length === 1 ? "" : "s"}
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {selectedEntries.map((item) => {
                const canStart =
                  item.calendar_source === "plan" &&
                  !["Completed", "Skipped", "Rescheduled"].includes(
                    String(item.status || "")
                  );

                return (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-black/25 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-black text-white">
                          {item.workout_name}
                        </div>
                        <div className="mt-1 text-[10px] font-bold text-slate-500">
                          {item.time || "Anytime"} ·{" "}
                          {item.status || "Planned"}
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-2 py-1 text-[8px] font-black ${statusTone(
                          item.status
                        )}`}
                      >
                        {item.status || "Planned"}
                      </span>
                    </div>

                    {canStart ? (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => onStartWorkout?.(item)}
                          className="h-10 rounded-xl border border-lime-300/30 bg-lime-300/15 text-xs font-black text-lime-100"
                        >
                          Start This Workout
                        </button>

                        {item.ymd !== todayYmd() ? (
                          <button
                            type="button"
                            onClick={() =>
                              todayPlanned
                                ? swapWithToday(item)
                                : moveToToday(item)
                            }
                            className="h-10 rounded-xl border border-emerald-300/25 bg-emerald-300/10 text-xs font-black text-emerald-100"
                          >
                            {todayPlanned
                              ? "Swap With Today"
                              : "Move To Today"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={onOpenMyWorkouts}
                            className="h-10 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-black text-slate-200"
                          >
                            Change Workout
                          </button>
                        )}
                      </div>
                    ) : null}
                  </article>
                );
              })}

              {!selectedEntries.length ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-black/15 p-4 text-center">
                  <div className="text-sm font-black text-white">
                    No workout scheduled
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Choose a saved workout for this day.
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <select
                defaultValue=""
                onChange={(event) => {
                  chooseWorkoutForDay(event.target.value);
                  event.target.value = "";
                }}
                className="h-11 rounded-xl border border-white/10 bg-[#050806] px-3 text-xs font-black text-white outline-none"
              >
                <option value="">Add saved workout...</option>
                {(Array.isArray(workouts) ? workouts : []).map(
                  (workout) => (
                    <option key={workout.id} value={workout.id}>
                      {workout.name || workout.workout_name}
                    </option>
                  )
                )}
              </select>

              <button
                type="button"
                onClick={onOpenMyWorkouts}
                className="h-11 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-xs font-black text-white"
              >
                My Workouts
              </button>

              <button
                type="button"
                onClick={onEditTrainingProfile}
                className="h-11 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-xs font-black text-white"
              >
                Training Profile
              </button>
            </div>
          </section>
        </main>
      </section>
    </div>
  );
}
