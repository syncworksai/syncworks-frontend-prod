import React, { useEffect, useMemo, useState } from "react";
import { loadCloudWorkoutHistory } from "./healthWorkoutCloudSync";

function safeNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function sessionDate(session) {
  const value = session?.finished_at || session?.completed_at || session?.started_at;
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date : null;
}

function exerciseRows(session, wantedName) {
  const exercises = Array.isArray(session?.exercises) ? session.exercises : [];
  return exercises.filter((exercise) => {
    const name = exercise?.substitute_name || exercise?.name || "";
    return normalizeName(name) === normalizeName(wantedName);
  });
}

function aggregateExercise(session, wantedName) {
  const matches = exerciseRows(session, wantedName);
  if (!matches.length) return null;

  const logs = matches.flatMap((exercise) =>
    Array.isArray(exercise?.set_logs) ? exercise.set_logs : []
  );
  const working = logs.filter((log) => log?.set_type !== "warmup");
  const useful = working.length ? working : logs;
  if (!useful.length) return null;

  const weighted = useful
    .map((log) => ({
      weight: safeNumber(log.actual_weight ?? log.weight, 0),
      reps: safeNumber(log.actual_reps ?? log.reps, 0),
      rpe: safeNumber(log.rpe ?? log.ease_score, 0),
    }))
    .filter((item) => item.weight > 0 || item.reps > 0 || item.rpe > 0);

  if (!weighted.length) return null;

  const weights = weighted.map((item) => item.weight).filter((value) => value > 0);
  const reps = weighted.map((item) => item.reps).filter((value) => value > 0);
  const rpes = weighted.map((item) => item.rpe).filter((value) => value > 0);
  const volume = weighted.reduce((sum, item) => sum + item.weight * item.reps, 0);

  return {
    date: sessionDate(session),
    weight: weights.length ? weights.reduce((sum, value) => sum + value, 0) / weights.length : 0,
    topWeight: weights.length ? Math.max(...weights) : 0,
    reps: reps.length ? reps.reduce((sum, value) => sum + value, 0) / reps.length : 0,
    rpe: rpes.length ? rpes.reduce((sum, value) => sum + value, 0) / rpes.length : 0,
    volume,
    sets: useful.length,
  };
}

function formatDate(date) {
  return date
    ? date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : "-";
}

function MiniLineChart({ rows, field, suffix = "", decimals = 0 }) {
  if (!rows.length) return null;

  const values = rows.map((row) => safeNumber(row[field], 0));
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(1, max - min);
  const width = 320;
  const height = 92;
  const padX = 12;
  const padY = 14;

  const points = rows.map((row, index) => {
    const x = rows.length === 1
      ? width / 2
      : padX + (index / (rows.length - 1)) * (width - padX * 2);
    const y = height - padY - ((safeNumber(row[field], 0) - min) / range) * (height - padY * 2);
    return { x, y, row };
  });

  const path = points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const latest = rows[rows.length - 1];

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">{field === "topWeight" ? "Top Weight" : field === "volume" ? "Volume" : field === "rpe" ? "Avg RPE" : "Average"}</div>
        <div className="text-sm font-black text-white">{safeNumber(latest[field], 0).toFixed(decimals)}{suffix}</div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 h-24 w-full overflow-visible" role="img" aria-label={`${field} progress chart`}>
        <path d={path} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-lime-300" />
        {points.map((point, index) => (
          <circle key={`${field}-${index}`} cx={point.x} cy={point.y} r="4" fill="currentColor" className="text-cyan-200" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[9px] font-bold text-slate-600">
        <span>{formatDate(rows[0]?.date)}</span>
        <span>{formatDate(rows[rows.length - 1]?.date)}</span>
      </div>
    </div>
  );
}

export default function WorkoutHistoryProgressCard({ session }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exerciseName, setExerciseName] = useState(() =>
    session?.exercises?.[0]?.substitute_name || session?.exercises?.[0]?.name || ""
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    loadCloudWorkoutHistory()
      .then((result) => {
        if (cancelled) return;
        setHistory(Array.isArray(result?.results) ? result.results : []);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Workout history could not be loaded from the server.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.id]);

  const exerciseNames = useMemo(() => {
    const current = Array.isArray(session?.exercises) ? session.exercises : [];
    return [...new Set(current.map((exercise) => exercise?.substitute_name || exercise?.name || "").filter(Boolean))];
  }, [session?.exercises]);

  useEffect(() => {
    if (!exerciseName && exerciseNames[0]) setExerciseName(exerciseNames[0]);
  }, [exerciseName, exerciseNames]);

  const rows = useMemo(() => {
    if (!exerciseName) return [];

    const merged = [session, ...history.filter((item) => item?.id !== session?.id)]
      .map((item) => aggregateExercise(item, exerciseName))
      .filter(Boolean)
      .sort((a, b) => (a.date?.getTime?.() || 0) - (b.date?.getTime?.() || 0));

    return merged.slice(-8);
  }, [exerciseName, history, session]);

  const trend = rows.length >= 2
    ? safeNumber(rows[rows.length - 1]?.topWeight, 0) - safeNumber(rows[0]?.topWeight, 0)
    : 0;

  return (
    <section className="rounded-[1.5rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.10),transparent_34%),linear-gradient(145deg,#06101a,#030607)] p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200">Server Workout History</div>
          <h3 className="mt-1 text-lg font-black text-white">Exercise progress over time</h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">Weight, volume and effort are rebuilt from completed server-saved sessions.</p>
        </div>
        <div className="rounded-xl border border-lime-300/20 bg-lime-300/10 px-3 py-2 text-center">
          <div className="text-[8px] font-black uppercase text-lime-200">Trend</div>
          <div className="mt-0.5 text-sm font-black text-lime-100">{trend > 0 ? "+" : ""}{Math.round(trend)} lb</div>
        </div>
      </div>

      {exerciseNames.length ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {exerciseNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setExerciseName(name)}
              className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-black ${exerciseName === name ? "border-cyan-300/35 bg-cyan-300/12 text-cyan-100" : "border-white/10 bg-white/[0.035] text-slate-400"}`}
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs font-bold text-slate-400">Loading server history...</div>
      ) : error ? (
        <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-3 text-xs font-bold text-amber-100">{error}</div>
      ) : rows.length ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <MiniLineChart rows={rows} field="topWeight" suffix=" lb" />
          <MiniLineChart rows={rows} field="volume" suffix=" lb" />
          <MiniLineChart rows={rows} field="rpe" decimals={1} />
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs font-bold text-slate-400">Complete this exercise in more sessions to build the trend line.</div>
      )}
    </section>
  );
}
