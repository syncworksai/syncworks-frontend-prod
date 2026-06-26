// src/components/customer-health/WorkoutHistoryDrawer.jsx
import React, { useMemo, useState } from "react";

function num(value) {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function fmtDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

function fmtTime(seconds) {
  const total = Math.max(0, Math.floor(num(seconds)));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function completed(history) {
  return (Array.isArray(history) ? history : [])
    .map((entry) => ({ ...entry, session: entry?.session || entry }))
    .filter((entry) =>
      entry?.type === "workout_session" ||
      entry?.session?.status === "completed"
    )
    .sort((a, b) =>
      new Date(
        b?.completed_at || b?.session?.finished_at || 0
      ) -
      new Date(
        a?.completed_at || a?.session?.finished_at || 0
      )
    );
}

function summarize(entry) {
  const session = entry.session || {};
  const exercises = Array.isArray(session.exercises)
    ? session.exercises
    : [];

  let workingSets = 0;
  let warmupSets = 0;
  let volume = 0;
  let failures = 0;
  let painFlags = 0;

  const details = exercises.map((exercise) => {
    const logs = Array.isArray(exercise.set_logs)
      ? exercise.set_logs
      : [];

    const sets = logs.map((setLog, index) => {
      const warmup = setLog.set_type === "warmup";
      const weight = setLog.actual_weight ?? setLog.weight ?? "";
      const reps = setLog.actual_reps ?? setLog.reps ?? "";

      if (warmup) {
        warmupSets += 1;
      } else {
        workingSets += 1;
        volume += num(weight) * num(reps);
      }

      if (setLog.reached_failure && !warmup) failures += 1;
      if (num(setLog.pain_score) >= 3) painFlags += 1;

      return {
        id: setLog.id || `${exercise.id}-${index}`,
        number: index + 1,
        type: warmup ? "Warm-up" : "Working",
        weight,
        reps,
        rpe: setLog.rpe ?? setLog.ease_score ?? "",
        form: setLog.form_quality || "",
        pain: setLog.pain_score || "0",
        failure: Boolean(setLog.reached_failure),
      };
    });

    return {
      id: exercise.id,
      name:
        exercise.substituted && exercise.substitute_name
          ? exercise.substitute_name
          : exercise.name,
      sets,
    };
  });

  return {
    id: session.id || entry.id || entry.completed_at,
    title: session.workout_name || session.name || "Completed Workout",
    completedAt:
      entry.completed_at ||
      session.finished_at ||
      session.updated_at ||
      "",
    totalSeconds: num(session.total_seconds),
    activeSeconds: num(session.active_seconds),
    restSeconds: num(session.rest_seconds),
    workingSets,
    warmupSets,
    volume,
    failures,
    painFlags,
    exercises: details,
  };
}

export default function WorkoutHistoryDrawer({
  open,
  onClose,
  history,
}) {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("all");
  const [selectedId, setSelectedId] = useState("");

  const records = useMemo(
    () => completed(history).map((entry) => summarize(entry)),
    [history]
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const days = { "7d": 7, "30d": 30, "90d": 90 }[period];

    return records.filter((record) => {
      const names = record.exercises
        .map((exercise) => exercise.name)
        .join(" ")
        .toLowerCase();

      if (
        needle &&
        !`${record.title} ${names}`.toLowerCase().includes(needle)
      ) {
        return false;
      }

      if (days) {
        const time = new Date(record.completedAt).getTime();

        if (
          !Number.isFinite(time) ||
          Date.now() - time > days * 86400000
        ) {
          return false;
        }
      }

      return true;
    });
  }, [records, search, period]);

  const selected =
    filtered.find((record) => record.id === selectedId) ||
    filtered[0] ||
    null;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex justify-end bg-black/80 backdrop-blur-xl">
      <button
        type="button"
        aria-label="Close workout history"
        onClick={onClose}
        className="absolute inset-0"
      />

      <section className="relative z-[121] flex h-full w-full max-w-6xl flex-col overflow-hidden border-l border-cyan-300/10 bg-[#07111f]">
        <header className="border-b border-white/10 bg-[#040812]/95 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
                SyncWorks Training Archive
              </div>
              <h2 className="mt-1 text-2xl font-black text-white sm:text-4xl">
                Workout History
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-10 w-10 rounded-2xl border border-white/10 bg-white/10 font-black text-white"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search workout or exercise"
              className="h-11 rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none"
            />

            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="h-11 rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white"
            >
              <option value="all">All time</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 pb-24 sm:p-6">
          {!filtered.length ? (
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center">
              <div className="text-xl font-black text-white">
                No completed workouts found
              </div>
              <p className="mt-2 text-sm text-slate-400">
                Complete and save a workout, or change the filters.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[0.85fr_1.35fr]">
              <div className="space-y-3">
                {filtered.map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => setSelectedId(record.id)}
                    className={`w-full rounded-[1.5rem] border p-4 text-left ${
                      selected?.id === record.id
                        ? "border-cyan-300/35 bg-cyan-300/10"
                        : "border-white/10 bg-white/[0.04]"
                    }`}
                  >
                    <div className="text-lg font-black text-white">
                      {record.title}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {fmtDate(record.completedAt)}
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-black/20 p-2 text-xs font-black text-white">
                        {fmtTime(record.totalSeconds)}
                      </div>
                      <div className="rounded-xl bg-black/20 p-2 text-xs font-black text-white">
                        {record.workingSets} sets
                      </div>
                      <div className="rounded-xl bg-black/20 p-2 text-xs font-black text-white">
                        {Math.round(record.volume)} vol
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {selected ? (
                <div className="space-y-4">
                  <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-200">
                      Session Detail
                    </div>
                    <h3 className="mt-1 text-2xl font-black text-white">
                      {selected.title}
                    </h3>
                    <div className="mt-1 text-sm text-slate-400">
                      {fmtDate(selected.completedAt)}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        ["Total", fmtTime(selected.totalSeconds)],
                        ["Active", fmtTime(selected.activeSeconds)],
                        ["Rest", fmtTime(selected.restSeconds)],
                        ["Volume", Math.round(selected.volume)],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.07] p-3"
                        >
                          <div className="text-[9px] uppercase text-slate-400">
                            {label}
                          </div>
                          <div className="mt-1 text-lg font-black text-white">
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className={`mt-4 rounded-2xl border p-3 text-xs font-bold ${
                      selected.painFlags || selected.failures
                        ? "border-rose-300/20 bg-rose-300/10 text-rose-100"
                        : "border-lime-300/20 bg-lime-300/10 text-lime-100"
                    }`}>
                      {selected.painFlags || selected.failures
                        ? `${selected.painFlags} pain flag(s) · ${selected.failures} failure set(s)`
                        : "No major pain or failure flags were logged."}
                    </div>
                  </section>

                  {selected.exercises.map((exercise, index) => (
                    <details
                      key={exercise.id || index}
                      className="rounded-[1.5rem] border border-white/10 bg-white/[0.04]"
                    >
                      <summary className="cursor-pointer p-4 font-black text-white">
                        {exercise.name} · {exercise.sets.length} sets
                      </summary>

                      <div className="space-y-2 border-t border-white/10 p-3">
                        {exercise.sets.map((setLog) => (
                          <div
                            key={setLog.id}
                            className="rounded-2xl border border-white/10 bg-black/20 p-3"
                          >
                            <div className="flex justify-between text-xs font-black text-slate-400">
                              <span>
                                Set {setLog.number} · {setLog.type}
                              </span>
                              {setLog.failure ? (
                                <span className="text-rose-200">
                                  Failure
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-1 text-sm font-black text-white">
                              {setLog.weight || setLog.weight === 0
                                ? `${setLog.weight} lb`
                                : "Bodyweight"}{" "}
                              x {setLog.reps || "-"}
                              {setLog.rpe
                                ? ` · RPE ${setLog.rpe}`
                                : ""}
                            </div>
                            <div className="mt-1 text-[11px] text-slate-500">
                              Form: {setLog.form || "Not logged"} · Pain: {setLog.pain}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </main>
      </section>
    </div>
  );
}
