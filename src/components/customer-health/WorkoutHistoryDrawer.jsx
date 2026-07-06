// src/components/customer-health/WorkoutHistoryDrawer.jsx
import React, { useEffect, useMemo, useState } from "react";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

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

function getSession(entry) {
  return entry?.session || entry || {};
}

function getCompletedAt(entry) {
  const session = getSession(entry);
  return (
    entry?.completed_at ||
    session?.finished_at ||
    session?.completed_at ||
    session?.updated_at ||
    ""
  );
}

function completed(history) {
  return (Array.isArray(history) ? history : [])
    .filter((entry) => {
      const session = getSession(entry);
      return (
        entry?.type === "workout_session" ||
        session?.status === "completed"
      );
    })
    .sort(
      (a, b) =>
        new Date(getCompletedAt(b)).getTime() -
        new Date(getCompletedAt(a)).getTime()
    );
}

function summarize(entry) {
  const session = getSession(entry);
  const exercises = Array.isArray(session.exercises)
    ? session.exercises
    : [];

  let workingSets = 0;
  let warmupSets = 0;
  let volume = 0;
  let failures = 0;
  let painFlags = 0;

  const details = exercises.map((exercise, exerciseIndex) => {
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
      if (num(setLog.pain_score) > 0) painFlags += 1;

      return {
        ...setLog,
        id:
          setLog.id ||
          `${exercise.id || exerciseIndex}-set-${index}`,
        number: index + 1,
        type: warmup ? "Warm-up" : "Working",
        weight,
        reps,
        rpe: setLog.rpe ?? setLog.ease_score ?? "",
        form: setLog.form_quality || "",
        pain: setLog.pain_score ?? "0",
        failure: Boolean(setLog.reached_failure),
      };
    });

    return {
      ...exercise,
      id: exercise.id || `exercise-${exerciseIndex}`,
      name:
        exercise.substituted && exercise.substitute_name
          ? exercise.substitute_name
          : exercise.name || `Exercise ${exerciseIndex + 1}`,
      sets,
    };
  });

  return {
    id: session.id || entry.id || getCompletedAt(entry),
    entry,
    session,
    title:
      session.workout_name ||
      session.name ||
      "Completed Workout",
    completedAt: getCompletedAt(entry),
    totalSeconds: num(session.total_seconds),
    activeSeconds: num(session.active_seconds),
    restSeconds: num(session.rest_seconds),
    workingSets,
    warmupSets,
    volume,
    failures,
    painFlags,
    exercises: details,
    notes:
      session.completion_notes ||
      session.completion_meta?.completion_notes ||
      "",
    energy:
      session.completion_meta?.energy ||
      session.energy ||
      "",
    difficulty:
      session.completion_meta?.difficulty ||
      session.difficulty ||
      "",
    overallForm:
      session.completion_meta?.overall_form ||
      session.overall_form ||
      "",
    painAfterWorkout:
      session.completion_meta?.pain_after_workout ||
      session.pain_after_workout ||
      "",
    painLocation:
      session.completion_meta?.pain_location ||
      session.pain_location ||
      "",
    recommendation:
      session.coach_next_recommendation ||
      session.completion_meta?.next_recommendation ||
      "",
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}


function buildTrainingArchiveInsights(records = []) {
  const safeRecords = Array.isArray(records)
    ? records
    : [];

  const recent = safeRecords.slice(0, 14);
  const last7 = safeRecords.filter((record) => {
    const time = new Date(record.completedAt).getTime();
    return (
      Number.isFinite(time) &&
      Date.now() - time <= 7 * 86400000
    );
  });

  const previous7 = safeRecords.filter((record) => {
    const time = new Date(record.completedAt).getTime();
    return (
      Number.isFinite(time) &&
      Date.now() - time > 7 * 86400000 &&
      Date.now() - time <= 14 * 86400000
    );
  });

  const sum = (rows, field) =>
    rows.reduce((total, row) => total + num(row[field]), 0);

  const recentVolume = sum(last7, "volume");
  const previousVolume = sum(previous7, "volume");
  const recentSets = sum(last7, "workingSets");
  const recentPain = sum(last7, "painFlags");
  const recentMinutes = Math.round(sum(last7, "activeSeconds") / 60);

  const scoreValues = last7
    .map((record) =>
      num(
        record.session?.completion_meta?.session_score ??
          record.session?.session_score
      )
    )
    .filter((value) => value > 0);

  const averageScore = scoreValues.length
    ? Math.round(
        scoreValues.reduce((total, value) => total + value, 0) /
          scoreValues.length
      )
    : 0;

  const volumeTrend =
    previousVolume > 0
      ? Math.round(
          ((recentVolume - previousVolume) / previousVolume) * 100
        )
      : recentVolume > 0
      ? 100
      : 0;

  const byDay = new Map();

  last7.forEach((record) => {
    const key = String(record.completedAt || "").slice(0, 10);
    if (!key) return;

    const existing = byDay.get(key) || {
      ymd: key,
      workouts: 0,
      volume: 0,
      sets: 0,
    };

    existing.workouts += 1;
    existing.volume += num(record.volume);
    existing.sets += num(record.workingSets);
    byDay.set(key, existing);
  });

  const dayBars = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const ymd = date.toISOString().slice(0, 10);
    const row = byDay.get(ymd) || {
      ymd,
      workouts: 0,
      volume: 0,
      sets: 0,
    };

    return {
      ...row,
      label: date.toLocaleDateString(undefined, {
        weekday: "short",
      }),
    };
  });

  const maxVolume = Math.max(
    1,
    ...dayBars.map((day) => num(day.volume))
  );

  const learned = [];

  if (recent.length) {
    learned.push(
      `SYNC has ${recent.length} recent saved sessions to learn from.`
    );
  }

  if (recentVolume > 0) {
    learned.push(
      `Last 7 days volume: ${Math.round(recentVolume).toLocaleString()} lb.`
    );
  }

  if (volumeTrend > 0 && previousVolume > 0) {
    learned.push(`Volume is up ${volumeTrend}% versus the prior week.`);
  } else if (volumeTrend < 0 && previousVolume > 0) {
    learned.push(
      `Volume is down ${Math.abs(volumeTrend)}% versus the prior week.`
    );
  }

  if (recentPain > 0) {
    learned.push(
      `${recentPain} pain/form flags need safer exercise choices.`
    );
  } else if (recentSets > 0) {
    learned.push("No pain flags in the last 7 days.");
  }

  let recommendation =
    "Complete and save a few workouts so SYNC can build a reliable trend.";

  if (recentPain > 0) {
    recommendation =
      "Next phase: protect joints. Repeat loads, slow the tempo, and swap anything that causes pain.";
  } else if (averageScore >= 85 && volumeTrend >= 0) {
    recommendation =
      "Next phase: progress one variable. Add a small amount of weight, one rep, or cleaner tempo.";
  } else if (recent.length >= 3 && volumeTrend < -20) {
    recommendation =
      "Next phase: rebuild consistency. Keep workouts shorter and protect the next scheduled session.";
  } else if (recent.length >= 2) {
    recommendation =
      "Next phase: keep logging. SYNC has enough history to start improving targets exercise by exercise.";
  }

  return {
    recentCount: recent.length,
    workouts7: last7.length,
    recentVolume: Math.round(recentVolume),
    previousVolume: Math.round(previousVolume),
    volumeTrend,
    recentSets,
    recentMinutes,
    recentPain,
    averageScore,
    dayBars,
    maxVolume,
    learned,
    recommendation,
  };
}

function TrainingArchiveInsights({ records }) {
  const insights = buildTrainingArchiveInsights(records);

  return (
    <section className="mb-4 rounded-[2rem] border border-cyan-300/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.1),transparent_34%),radial-gradient(circle_at_top_right,rgba(255,59,212,0.08),transparent_30%),linear-gradient(135deg,rgba(4,8,18,0.98),rgba(7,17,31,0.98))] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.28)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
            SYNC Training Intelligence
          </div>
          <h3 className="mt-1 text-xl font-black text-white">
            Last 7-14 day learning loop
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            Recent sessions, volume trend, pain flags, and what SYNC should learn next.
          </p>
        </div>

        <div className="rounded-2xl border border-fuchsia-300/25 bg-fuchsia-300/10 px-4 py-3 text-center">
          <div className="text-[8px] font-black uppercase tracking-wider text-fuchsia-200">
            Avg Score
          </div>
          <div className="mt-1 text-2xl font-black text-fuchsia-100">
            {insights.averageScore || "-"}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat label="Workouts" value={insights.workouts7} tone="cyan" />
        <Stat label="Sets" value={insights.recentSets} tone="fuchsia" />
        <Stat label="Active Min" value={insights.recentMinutes} tone="lime" />
        <Stat
          label="Volume"
          value={insights.recentVolume.toLocaleString()}
          tone="cyan"
        />
        <Stat
          label="Pain Flags"
          value={insights.recentPain}
          tone={insights.recentPain ? "rose" : "lime"}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
            7-Day Volume Trend
          </div>
          <Chip tone={insights.volumeTrend >= 0 ? "lime" : "amber"}>
            {insights.previousVolume
              ? `${insights.volumeTrend >= 0 ? "+" : ""}${insights.volumeTrend}%`
              : "Baseline"}
          </Chip>
        </div>

        <div className="flex h-28 items-end gap-2">
          {insights.dayBars.map((day) => {
            const height = Math.max(
              day.volume > 0 ? 8 : 2,
              Math.round((day.volume / insights.maxVolume) * 100)
            );

            return (
              <div
                key={day.ymd}
                className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
              >
                <div className="text-[9px] font-black text-cyan-100">
                  {day.volume ? Math.round(day.volume / 1000) + "k" : ""}
                </div>
                <div className="flex h-20 w-full items-end justify-center">
                  <div
                    className="w-full max-w-8 rounded-t-xl bg-gradient-to-t from-cyan-500 via-blue-500 to-fuchsia-400 shadow-[0_0_18px_rgba(34,211,238,0.16)]"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <div className="truncate text-[9px] font-black uppercase text-slate-500">
                  {day.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded-2xl border border-lime-300/15 bg-lime-300/[0.06] p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-lime-200">
            What SYNC Learned
          </div>
          <div className="mt-2 space-y-1.5">
            {(insights.learned.length
              ? insights.learned
              : ["Save workouts to unlock training intelligence."]
            ).map((item) => (
              <div
                key={item}
                className="text-xs font-bold leading-5 text-slate-200"
              >
                + {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.06] p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-200">
            Next Coach Move
          </div>
          <div className="mt-2 text-xs font-bold leading-5 text-slate-200">
            {insights.recommendation}
          </div>
        </div>
      </div>
    </section>
  );
}
function recalcSession(session) {
  const exercises = Array.isArray(session?.exercises)
    ? session.exercises
    : [];

  let completedSets = 0;
  let skippedExercises = 0;
  let volume = 0;
  let painFlags = 0;
  let highEffortSets = 0;

  const nextExercises = exercises.map((exercise) => {
    const logs = Array.isArray(exercise.set_logs)
      ? exercise.set_logs
      : [];

    completedSets += logs.length;
    if (exercise.skipped) skippedExercises += 1;

    logs.forEach((log) => {
      if (log.set_type !== "warmup") {
        volume +=
          num(log.actual_weight ?? log.weight) *
          num(log.actual_reps ?? log.reps);
      }

      if (num(log.pain_score) > 0) painFlags += 1;
      if (num(log.rpe ?? log.ease_score) >= 9) {
        highEffortSets += 1;
      }
    });

    return {
      ...exercise,
      completed:
        logs.length >= num(exercise.planned_sets || 0) &&
        logs.length > 0,
    };
  });

  return {
    ...session,
    exercises: nextExercises,
    completed_sets: completedSets,
    skipped_exercises: skippedExercises,
    total_volume: Math.round(volume),
    pain_flags: painFlags,
    high_effort_sets: highEffortSets,
    edited_at: new Date().toISOString(),
  };
}

function Stat({ label, value, tone = "cyan" }) {
  const tones = {
    cyan: "border-cyan-300/20 bg-cyan-300/[0.07] text-cyan-100",
    lime: "border-lime-300/20 bg-lime-300/[0.07] text-lime-100",
    amber: "border-amber-300/20 bg-amber-300/[0.07] text-amber-100",
    fuchsia:
      "border-fuchsia-300/20 bg-fuchsia-300/[0.07] text-fuchsia-100",
    rose: "border-rose-300/20 bg-rose-300/[0.07] text-rose-100",
  };

  return (
    <div
      className={cx(
        "rounded-2xl border p-3",
        tones[tone] || tones.cyan
      )}
    >
      <div className="text-[9px] font-black uppercase tracking-[0.14em] opacity-70">
        {label}
      </div>
      <div className="mt-1 truncate text-lg font-black">
        {value}
      </div>
    </div>
  );
}

function Chip({ children, tone = "slate" }) {
  const tones = {
    slate:
      "border-white/10 bg-white/[0.04] text-slate-300",
    cyan:
      "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
    lime:
      "border-lime-300/20 bg-lime-300/10 text-lime-100",
    rose:
      "border-rose-300/20 bg-rose-300/10 text-rose-100",
    amber:
      "border-amber-300/20 bg-amber-300/10 text-amber-100",
  };

  return (
    <span
      className={cx(
        "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black",
        tones[tone] || tones.slate
      )}
    >
      {children}
    </span>
  );
}

function SetEditor({
  setLog,
  setNumber,
  onChange,
  onRemove,
}) {
  const fieldClass =
    "h-11 min-w-0 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-black text-white outline-none focus:border-cyan-300/40";

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-black text-white">
          Set {setNumber}
        </div>

        <div className="flex flex-wrap justify-end gap-1.5">
          <button
            type="button"
            onClick={() =>
              onChange(
                "set_type",
                setLog.set_type === "warmup"
                  ? "working"
                  : "warmup"
              )
            }
            className={cx(
              "h-9 rounded-xl border px-3 text-[10px] font-black",
              setLog.set_type === "warmup"
                ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                : "border-white/10 bg-white/[0.04] text-slate-300"
            )}
          >
            {setLog.set_type === "warmup"
              ? "Warm-up"
              : "Working"}
          </button>

          <button
            type="button"
            onClick={() =>
              onChange(
                "reached_failure",
                !setLog.reached_failure
              )
            }
            className={cx(
              "h-9 rounded-xl border px-3 text-[10px] font-black",
              setLog.reached_failure
                ? "border-rose-300/25 bg-rose-300/10 text-rose-100"
                : "border-white/10 bg-white/[0.04] text-slate-300"
            )}
          >
            Failure
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <label>
          <div className="mb-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
            Weight
          </div>
          <input
            value={
              setLog.actual_weight ??
              setLog.weight ??
              ""
            }
            onChange={(event) =>
              onChange(
                "actual_weight",
                event.target.value
              )
            }
            inputMode="decimal"
            className={fieldClass}
          />
        </label>

        <label>
          <div className="mb-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
            Reps
          </div>
          <input
            value={
              setLog.actual_reps ??
              setLog.reps ??
              ""
            }
            onChange={(event) =>
              onChange(
                "actual_reps",
                event.target.value
              )
            }
            inputMode="numeric"
            className={fieldClass}
          />
        </label>

        <label>
          <div className="mb-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
            RPE
          </div>
          <input
            value={
              setLog.rpe ??
              setLog.ease_score ??
              ""
            }
            onChange={(event) =>
              onChange("rpe", event.target.value)
            }
            inputMode="decimal"
            className={fieldClass}
          />
        </label>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <label>
          <div className="mb-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
            Form
          </div>
          <select
            value={setLog.form_quality || ""}
            onChange={(event) =>
              onChange(
                "form_quality",
                event.target.value
              )
            }
            className={fieldClass}
          >
            <option value="">Not logged</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
            <option value="Poor">Poor</option>
          </select>
        </label>

        <label>
          <div className="mb-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
            Pain
          </div>
          <select
            value={String(setLog.pain_score ?? "0")}
            onChange={(event) =>
              onChange(
                "pain_score",
                event.target.value
              )
            }
            className={fieldClass}
          >
            <option value="0">None</option>
            <option value="1">Mild</option>
            <option value="3">Moderate</option>
            <option value="5">Stop</option>
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="mt-3 h-10 w-full rounded-xl border border-rose-300/20 bg-rose-300/10 text-xs font-black text-rose-100"
      >
        Remove Set
      </button>
    </div>
  );
}

export default function WorkoutHistoryDrawer({
  open,
  onClose,
  history,
  setHistory,
  setSnapshot,
}) {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saveMessage, setSaveMessage] =
    useState("");

  const records = useMemo(
    () =>
      completed(history).map((entry) =>
        summarize(entry)
      ),
    [history]
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const days = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
    }[period];

    return records.filter((record) => {
      const names = record.exercises
        .map((exercise) => exercise.name)
        .join(" ")
        .toLowerCase();

      if (
        needle &&
        !`${record.title} ${names}`
          .toLowerCase()
          .includes(needle)
      ) {
        return false;
      }

      if (days) {
        const time = new Date(
          record.completedAt
        ).getTime();

        if (
          !Number.isFinite(time) ||
          Date.now() - time >
            days * 86400000
        ) {
          return false;
        }
      }

      return true;
    });
  }, [records, search, period]);

  const selected =
    filtered.find(
      (record) => record.id === selectedId
    ) ||
    filtered[0] ||
    null;

  useEffect(() => {
    if (!open) {
      setEditing(false);
      setDraft(null);
      setSaveMessage("");
      return;
    }

    if (
      selected &&
      selected.id !== selectedId
    ) {
      setSelectedId(selected.id);
    }
  }, [open, selected?.id]);

  function beginEdit() {
    if (!selected) return;

    setDraft(clone(selected.session));
    setEditing(true);
    setSaveMessage("");
  }

  function cancelEdit() {
    setEditing(false);
    setDraft(null);
  }

  function updateDraftSet(
    exerciseIndex,
    setIndex,
    field,
    value
  ) {
    setDraft((previous) => {
      if (!previous) return previous;

      const next = clone(previous);
      const exercise =
        next.exercises?.[exerciseIndex];
      const setLog =
        exercise?.set_logs?.[setIndex];

      if (!setLog) return previous;

      setLog[field] = value;

      if (field === "actual_weight") {
        setLog.weight = value;
      }

      if (field === "actual_reps") {
        setLog.reps = value;
      }

      if (field === "rpe") {
        setLog.ease_score = value;
      }

      return next;
    });
  }

  function removeDraftSet(
    exerciseIndex,
    setIndex
  ) {
    setDraft((previous) => {
      if (!previous) return previous;

      const next = clone(previous);
      const logs =
        next.exercises?.[exerciseIndex]
          ?.set_logs;

      if (!Array.isArray(logs)) {
        return previous;
      }

      logs.splice(setIndex, 1);
      return recalcSession(next);
    });
  }

  function updateCompletionField(
    field,
    value
  ) {
    setDraft((previous) => {
      if (!previous) return previous;

      return {
        ...previous,
        [field]: value,
        completion_meta: {
          ...(previous.completion_meta || {}),
          [field]: value,
        },
      };
    });
  }

  function saveEdits() {
    if (!draft || !selected) return;

    const nextSession = recalcSession({
      ...draft,
      completion_notes:
        draft.completion_notes || "",
      coach_next_recommendation:
        draft.coach_next_recommendation || "",
    });

    setHistory?.((previous) =>
      (Array.isArray(previous)
        ? previous
        : []
      ).map((entry) => {
        const session = getSession(entry);
        const entryId =
          session.id ||
          entry.id ||
          getCompletedAt(entry);

        if (entryId !== selected.id) {
          return entry;
        }

        if (entry?.session) {
          return {
            ...entry,
            session: nextSession,
            completed_at:
              entry.completed_at ||
              nextSession.finished_at,
            edited_at: new Date().toISOString(),
          };
        }

        return nextSession;
      })
    );

    setSnapshot?.((previous) => {
      const lastId =
        previous?.last_workout_stats?.id ||
        previous?.last_workout_stats
          ?.session_id ||
        "";

      if (
        lastId &&
        lastId !== selected.id
      ) {
        return previous;
      }

      return {
        ...previous,
        last_workout_stats: nextSession,
        last_completed_workout:
          nextSession.workout_name ||
          nextSession.name ||
          previous?.last_completed_workout,
        last_workout_edited_at:
          new Date().toISOString(),
      };
    });

    setEditing(false);
    setDraft(null);
    setSaveMessage(
      "Workout updated. Coach statistics recalculated."
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex justify-end bg-black/80 backdrop-blur-xl">
      <button
        type="button"
        aria-label="Close workout history"
        onClick={onClose}
        className="absolute inset-0"
      />

      <section className="relative z-[121] flex h-full w-full max-w-6xl flex-col overflow-hidden border-l border-cyan-300/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.08),transparent_24%),linear-gradient(180deg,#040812,#07111f)] shadow-[-30px_0_80px_rgba(0,0,0,0.65)]">
        <header className="border-b border-white/10 bg-[#040812]/95 p-4 backdrop-blur-xl sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
                SyncWorks Training Archive
              </div>

              <h2 className="mt-1 text-2xl font-black text-white sm:text-4xl">
                Workout History
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Review completed workouts and correct
                saved training data.
              </p>
            </div>

            <button
              type="button"
              aria-label="Close workout history"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 font-black text-white"
            >
              X
            </button>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search workout or exercise"
              className="h-11 rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none focus:border-cyan-300/40"
            />

            <select
              value={period}
              onChange={(event) =>
                setPeriod(event.target.value)
              }
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
          {saveMessage ? (
            <div className="mb-4 rounded-2xl border border-lime-300/20 bg-lime-300/10 p-3 text-sm font-black text-lime-100">
              {saveMessage}
            </div>
          ) : null}


          <TrainingArchiveInsights records={records} />
{!filtered.length ? (
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center">
              <div className="text-xl font-black text-white">
                No completed workouts found
              </div>
              <p className="mt-2 text-sm text-slate-400">
                Complete and save a workout, or change
                the filters.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[0.82fr_1.38fr]">
              <div className="space-y-3">
                {filtered.map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(record.id);
                      setEditing(false);
                      setDraft(null);
                      setSaveMessage("");
                    }}
                    className={cx(
                      "w-full rounded-[1.5rem] border p-4 text-left transition",
                      selected?.id === record.id
                        ? "border-cyan-300/35 bg-cyan-300/10 shadow-[0_0_28px_rgba(34,211,238,0.08)]"
                        : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-lg font-black text-white">
                          {record.title}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          {fmtDate(record.completedAt)}
                        </div>
                      </div>

                      <Chip
                        tone={
                          record.painFlags
                            ? "rose"
                            : "lime"
                        }
                      >
                        {record.painFlags
                          ? `${record.painFlags} pain`
                          : "Clear"}
                      </Chip>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-black/20 p-2">
                        <div className="text-[9px] uppercase text-slate-500">
                          Time
                        </div>
                        <div className="mt-1 text-xs font-black text-white">
                          {fmtTime(
                            record.totalSeconds
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl bg-black/20 p-2">
                        <div className="text-[9px] uppercase text-slate-500">
                          Sets
                        </div>
                        <div className="mt-1 text-xs font-black text-white">
                          {record.workingSets}
                        </div>
                      </div>

                      <div className="rounded-xl bg-black/20 p-2">
                        <div className="text-[9px] uppercase text-slate-500">
                          Volume
                        </div>
                        <div className="mt-1 truncate text-xs font-black text-white">
                          {Math.round(
                            record.volume
                          ).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {selected ? (
                <div className="space-y-4">
                  {!editing ? (
                    <>
                      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-200">
                              Session Detail
                            </div>

                            <h3 className="mt-1 text-2xl font-black text-white">
                              {selected.title}
                            </h3>

                            <div className="mt-1 text-sm text-slate-400">
                              {fmtDate(
                                selected.completedAt
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={beginEdit}
                            className="health-primary-action h-11 rounded-2xl border px-4 text-sm font-black"
                          >
                            Edit Workout
                          </button>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <Stat
                            label="Total"
                            value={fmtTime(
                              selected.totalSeconds
                            )}
                          />
                          <Stat
                            label="Active"
                            value={fmtTime(
                              selected.activeSeconds
                            )}
                            tone="lime"
                          />
                          <Stat
                            label="Working Sets"
                            value={
                              selected.workingSets
                            }
                            tone="fuchsia"
                          />
                          <Stat
                            label="Volume"
                            value={Math.round(
                              selected.volume
                            ).toLocaleString()}
                            tone="cyan"
                          />
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {selected.energy ? (
                            <Chip tone="cyan">
                              Energy: {selected.energy}
                            </Chip>
                          ) : null}
                          {selected.difficulty ? (
                            <Chip tone="amber">
                              Difficulty:{" "}
                              {selected.difficulty}
                            </Chip>
                          ) : null}
                          {selected.overallForm ? (
                            <Chip tone="lime">
                              Form:{" "}
                              {selected.overallForm}
                            </Chip>
                          ) : null}
                          {selected.painAfterWorkout ? (
                            <Chip
                              tone={
                                selected.painAfterWorkout ===
                                "None"
                                  ? "lime"
                                  : "rose"
                              }
                            >
                              Post-workout pain:{" "}
                              {
                                selected.painAfterWorkout
                              }
                            </Chip>
                          ) : null}
                        </div>

                        {selected.notes ? (
                          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
                            <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
                              Coach Note
                            </div>
                            <div className="mt-1 text-sm leading-6 text-slate-200">
                              {selected.notes}
                            </div>
                          </div>
                        ) : null}

                        {selected.recommendation ? (
                          <div className="mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.07] p-3">
                            <div className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-200">
                              Next Recommendation
                            </div>
                            <div className="mt-1 text-sm leading-6 text-white">
                              {
                                selected.recommendation
                              }
                            </div>
                          </div>
                        ) : null}
                      </section>

                      {selected.exercises.map(
                        (exercise, index) => (
                          <details
                            key={
                              exercise.id || index
                            }
                            open={index === 0}
                            className="rounded-[1.5rem] border border-white/10 bg-white/[0.04]"
                          >
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
                              <div className="min-w-0">
                                <div className="truncate font-black text-white">
                                  {exercise.name}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {
                                    exercise.sets.length
                                  }{" "}
                                  logged sets
                                </div>
                              </div>

                              <Chip tone="cyan">
                                {exercise.sets.length} sets
                              </Chip>
                            </summary>

                            <div className="space-y-2 border-t border-white/10 p-3">
                              {exercise.sets.map(
                                (setLog) => (
                                  <div
                                    key={setLog.id}
                                    className="rounded-2xl border border-white/10 bg-black/20 p-3"
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="text-xs font-black text-slate-400">
                                        Set{" "}
                                        {setLog.number} Â·{" "}
                                        {setLog.type}
                                      </div>

                                      <div className="flex gap-1.5">
                                        {setLog.failure ? (
                                          <Chip tone="rose">
                                            Failure
                                          </Chip>
                                        ) : null}
                                        {num(
                                          setLog.pain
                                        ) > 0 ? (
                                          <Chip tone="amber">
                                            Pain{" "}
                                            {
                                              setLog.pain
                                            }
                                          </Chip>
                                        ) : null}
                                      </div>
                                    </div>

                                    <div className="mt-2 text-base font-black text-white">
                                      {setLog.weight ||
                                      setLog.weight ===
                                        0
                                        ? `${setLog.weight} lb`
                                        : "Bodyweight"}{" "}
                                      x{" "}
                                      {setLog.reps || "-"}
                                      {setLog.rpe
                                        ? ` Â· RPE ${setLog.rpe}`
                                        : ""}
                                    </div>

                                    <div className="mt-1 text-[11px] text-slate-500">
                                      Form:{" "}
                                      {setLog.form ||
                                        "Not logged"}
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </details>
                        )
                      )}
                    </>
                  ) : (
                    <section className="rounded-[2rem] border border-cyan-300/20 bg-cyan-300/[0.05] p-4 sm:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
                            Editing Completed Workout
                          </div>
                          <h3 className="mt-1 text-2xl font-black text-white">
                            {draft?.workout_name ||
                              draft?.name ||
                              selected.title}
                          </h3>
                          <p className="mt-1 text-sm text-slate-400">
                            Correct the saved data. Coach
                            statistics recalculate when
                            you save.
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-slate-200"
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            onClick={saveEdits}
                            className="health-primary-action h-11 rounded-2xl border px-4 text-sm font-black"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>

                      <div className="mt-5 space-y-4">
                        {(draft?.exercises || []).map(
                          (
                            exercise,
                            exerciseIndex
                          ) => (
                            <div
                              key={
                                exercise.id ||
                                exerciseIndex
                              }
                              className="rounded-[1.5rem] border border-white/10 bg-black/20 p-3"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="font-black text-white">
                                    {exercise.substituted &&
                                    exercise.substitute_name
                                      ? exercise.substitute_name
                                      : exercise.name}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    Edit weight, reps,
                                    RPE, form, pain, and
                                    set type.
                                  </div>
                                </div>

                                <Chip tone="cyan">
                                  {
                                    (
                                      exercise.set_logs ||
                                      []
                                    ).length
                                  }{" "}
                                  sets
                                </Chip>
                              </div>

                              <div className="mt-3 space-y-2">
                                {(
                                  exercise.set_logs || []
                                ).map(
                                  (
                                    setLog,
                                    setIndex
                                  ) => (
                                    <SetEditor
                                      key={
                                        setLog.id ||
                                        setIndex
                                      }
                                      setLog={setLog}
                                      setNumber={
                                        setIndex + 1
                                      }
                                      onChange={(
                                        field,
                                        value
                                      ) =>
                                        updateDraftSet(
                                          exerciseIndex,
                                          setIndex,
                                          field,
                                          value
                                        )
                                      }
                                      onRemove={() =>
                                        removeDraftSet(
                                          exerciseIndex,
                                          setIndex
                                        )
                                      }
                                    />
                                  )
                                )}
                              </div>
                            </div>
                          )
                        )}

                        <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                          <div className="text-xs font-black uppercase tracking-[0.16em] text-fuchsia-200">
                            Completion Review
                          </div>

                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <label>
                              <div className="mb-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                                Energy
                              </div>
                              <select
                                value={
                                  draft
                                    ?.completion_meta
                                    ?.energy ||
                                  draft?.energy ||
                                  ""
                                }
                                onChange={(event) =>
                                  updateCompletionField(
                                    "energy",
                                    event.target.value
                                  )
                                }
                                className="h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-black text-white"
                              >
                                <option value="">
                                  Not logged
                                </option>
                                <option value="Low">
                                  Low
                                </option>
                                <option value="Good">
                                  Good
                                </option>
                                <option value="High">
                                  High
                                </option>
                              </select>
                            </label>

                            <label>
                              <div className="mb-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                                Difficulty
                              </div>
                              <select
                                value={
                                  draft
                                    ?.completion_meta
                                    ?.difficulty ||
                                  draft?.difficulty ||
                                  ""
                                }
                                onChange={(event) =>
                                  updateCompletionField(
                                    "difficulty",
                                    event.target.value
                                  )
                                }
                                className="h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-black text-white"
                              >
                                <option value="">
                                  Not logged
                                </option>
                                <option value="Easy">
                                  Easy
                                </option>
                                <option value="Challenging">
                                  Challenging
                                </option>
                                <option value="Max Effort">
                                  Max Effort
                                </option>
                              </select>
                            </label>

                            <label>
                              <div className="mb-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                                Overall Form
                              </div>
                              <select
                                value={
                                  draft
                                    ?.completion_meta
                                    ?.overall_form ||
                                  draft?.overall_form ||
                                  ""
                                }
                                onChange={(event) =>
                                  updateCompletionField(
                                    "overall_form",
                                    event.target.value
                                  )
                                }
                                className="h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-black text-white"
                              >
                                <option value="">
                                  Not logged
                                </option>
                                <option value="Good">
                                  Good
                                </option>
                                <option value="Fair">
                                  Fair
                                </option>
                                <option value="Needs Work">
                                  Needs Work
                                </option>
                              </select>
                            </label>

                            <label>
                              <div className="mb-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                                Pain After Workout
                              </div>
                              <select
                                value={
                                  draft
                                    ?.completion_meta
                                    ?.pain_after_workout ||
                                  draft?.pain_after_workout ||
                                  ""
                                }
                                onChange={(event) =>
                                  updateCompletionField(
                                    "pain_after_workout",
                                    event.target.value
                                  )
                                }
                                className="h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-black text-white"
                              >
                                <option value="">
                                  Not logged
                                </option>
                                <option value="None">
                                  None
                                </option>
                                <option value="Mild">
                                  Mild
                                </option>
                                <option value="Moderate">
                                  Moderate
                                </option>
                                <option value="Stop">
                                  Stop
                                </option>
                              </select>
                            </label>
                          </div>

                          <label className="mt-3 block">
                            <div className="mb-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                              Workout Note
                            </div>
                            <textarea
                              value={
                                draft?.completion_notes ||
                                ""
                              }
                              onChange={(event) =>
                                setDraft(
                                  (previous) => ({
                                    ...previous,
                                    completion_notes:
                                      event.target
                                        .value,
                                    completion_meta: {
                                      ...(
                                        previous?.completion_meta ||
                                        {}
                                      ),
                                      completion_notes:
                                        event.target
                                          .value,
                                    },
                                  })
                                )
                              }
                              rows={3}
                              placeholder="Anything the coach should remember?"
                              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-fuchsia-300/40"
                            />
                          </label>
                        </div>

                        <div className="sticky bottom-3 z-20 grid grid-cols-[0.8fr_1.2fr] gap-2 rounded-2xl border border-white/10 bg-[#040812]/95 p-2 shadow-[0_16px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-slate-200"
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            onClick={saveEdits}
                            className="health-primary-action h-12 rounded-2xl border text-sm font-black"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    </section>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </main>
      </section>
    </div>
  );
}
