// src/components/customer-health/ExerciseLibraryDrawer.jsx
import React, { useMemo, useState } from "react";
import HealthDrawer from "./HealthDrawer";
import { EXERCISE_LIBRARY } from "./healthStorage";

export default function ExerciseLibraryDrawer({ open, onClose, onAddExercise }) {
  const [group, setGroup] = useState("All");
  const groups = ["All", ...Array.from(new Set(EXERCISE_LIBRARY.map((x) => x.group)))];

  const list = useMemo(() => {
    if (group === "All") return EXERCISE_LIBRARY;
    return EXERCISE_LIBRARY.filter((x) => x.group === group);
  }, [group]);

  return (
    <HealthDrawer
      open={open}
      onClose={onClose}
      title="Exercise Library"
      subtitle="Choose movements by muscle group and teach the user what to feel."
    >
      <div className="space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {groups.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGroup(g)}
              className={
                group === g
                  ? "h-10 shrink-0 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 text-xs font-black text-emerald-100"
                  : "h-10 shrink-0 rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-xs font-black text-slate-300"
              }
            >
              {g}
            </button>
          ))}
        </div>

        <div className="grid gap-3">
          {list.map((ex) => (
            <article key={ex.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-black text-white">{ex.name}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {ex.group} • {ex.equipment}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onAddExercise(ex)}
                  className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-100 hover:bg-emerald-500/15"
                >
                  Add to Workout
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                  <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                    Trains
                  </div>
                  <div className="mt-1 text-sm leading-6 text-slate-200">{ex.trains}</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                  <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                    What to feel
                  </div>
                  <div className="mt-1 text-sm leading-6 text-slate-200">{ex.feel}</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                  <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                    Avoid
                  </div>
                  <div className="mt-1 text-sm leading-6 text-slate-200">{ex.avoid}</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                  <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                    Sport benefit
                  </div>
                  <div className="mt-1 text-sm leading-6 text-slate-200">{ex.sportBenefit}</div>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-sm font-semibold text-cyan-100">
                Suggested: {ex.suggestion}
              </div>
            </article>
          ))}
        </div>
      </div>
    </HealthDrawer>
  );
}