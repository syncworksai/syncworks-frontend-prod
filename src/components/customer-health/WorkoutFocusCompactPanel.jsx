// src/components/customer-health/WorkoutFocusCompactPanel.jsx
import React, { useEffect, useState } from "react";

function safeNumber(value, fallback = 0) {
  const parsed = Number(
    String(value ?? "").replace(/[^\d.-]/g, "")
  );
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatLoad(value) {
  const text = String(value ?? "").trim();
  if (!text || /^(bw|bodyweight|body weight)$/i.test(text)) {
    return "BW";
  }
  return `${text} lb`;
}

export default function WorkoutFocusCompactPanel({
  session,
  currentExercise,
  formatSeconds,
  onModify,
  onFinish,
  onReplay,
}) {
  const [bpm, setBpm] = useState(() => {
    if (typeof window === "undefined") return 0;
    return safeNumber(
      window.localStorage.getItem(
        "syncworks_health_current_bpm"
      ),
      0
    );
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "syncworks_health_current_bpm",
      String(bpm || "")
    );
  }, [bpm]);

  if (!session || !currentExercise) return null;

  const setNumber =
    (currentExercise.set_logs || []).length + 1;
  const plannedSets =
    currentExercise.planned_sets || "-";
  const reps =
    currentExercise.current_target_reps ||
    currentExercise.planned_reps ||
    "-";
  const weight =
    currentExercise.current_target_weight ||
    currentExercise.planned_weight;

  return (
    <section className="rounded-[1.65rem] border border-lime-300/25 bg-[radial-gradient(circle_at_90%_0%,rgba(112,255,61,0.09),transparent_28%),linear-gradient(145deg,rgba(13,18,14,0.98),rgba(3,6,4,0.99))] p-4">
      <div className="grid grid-cols-5 gap-2">
        {[
          ["Total", formatSeconds(session.total_seconds)],
          ["Active", formatSeconds(session.active_seconds)],
          [
            session.rest_active ? "Rest Left" : "Rest",
            formatSeconds(
              session.rest_active
                ? session.rest_remaining_seconds
                : session.rest_seconds
            ),
          ],
          [
            "Sets",
            `${session.completed_sets || 0}/${
              session.total_planned_sets || "-"
            }`,
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-center"
          >
            <div className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">
              {label}
            </div>
            <div className="mt-1 text-sm font-black text-white">
              {value}
            </div>
          </div>
        ))}

        <label className="rounded-xl border border-rose-300/20 bg-black/30 px-2 py-2 text-center">
          <span className="block text-[8px] font-black uppercase tracking-[0.12em] text-rose-200">
            BPM
          </span>
          <input
            type="number"
            min="0"
            max="240"
            inputMode="numeric"
            value={bpm || ""}
            onChange={(event) =>
              setBpm(
                Math.max(
                  0,
                  Math.min(
                    240,
                    safeNumber(event.target.value, 0)
                  )
                )
              )
            }
            placeholder="-"
            className="mt-1 w-full border-0 bg-transparent p-0 text-center text-sm font-black text-white outline-none"
          />
        </label>
      </div>

      <div className="mt-4 rounded-[1.35rem] border border-white/10 bg-black/25 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-lime-300">
              Current Exercise
            </div>
            <div className="mt-1 truncate text-2xl font-black text-white">
              {currentExercise.substitute_name ||
                currentExercise.name}
            </div>
            <div className="mt-1 text-xs font-bold text-slate-400">
              Set {setNumber} of {plannedSets}
            </div>
          </div>

          <div className="rounded-2xl border border-lime-300/25 bg-lime-300/10 px-3 py-2 text-right">
            <div className="text-[8px] font-black uppercase tracking-[0.12em] text-lime-200">
              This Set
            </div>
            <div className="mt-1 text-sm font-black text-lime-100">
              {reps} x {formatLoad(weight)}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={onReplay}
            className="h-11 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-black text-white"
          >
            Replay Cue
          </button>
          <button
            type="button"
            onClick={onModify}
            disabled={session.set_active}
            className="h-11 rounded-xl border border-lime-300/25 bg-lime-300/10 text-xs font-black text-lime-100 disabled:opacity-40"
          >
            Modify
          </button>
          <button
            type="button"
            onClick={onFinish}
            disabled={session.set_active}
            className="h-11 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-black text-white disabled:opacity-40"
          >
            Finish
          </button>
        </div>
      </div>
    </section>
  );
}
