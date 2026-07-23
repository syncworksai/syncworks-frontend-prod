// src/components/customer-health/MissionModeProgressCard.jsx
import React, { useMemo, useState } from "react";
import { buildMissionMetrics } from "./healthMissionMode";

function formatLoad(value) {
  const number = Number(value || 0);
  return number > 0 ? `${number} lb` : "BW";
}

export default function MissionModeProgressCard({
  session,
  onModify,
  onFinish,
  onReplay,
}) {
  const [objectivesOpen, setObjectivesOpen] = useState(false);

  const mission = useMemo(
    () => buildMissionMetrics(session),
    [session]
  );

  const bestSet = mission.best_set;

  return (
    <section className="rounded-[1.65rem] border border-[#39ff88]/25 bg-[radial-gradient(circle_at_90%_0%,rgba(57,255,136,0.11),transparent_28%),linear-gradient(145deg,#07100b,#030604)] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.34)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-[#65ff9a]">
            Mission Mode
          </div>
          <h3 className="mt-1 truncate text-xl font-black text-white">
            {mission.mission_title}
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {mission.objective}
          </p>
        </div>

        <div className="shrink-0 rounded-2xl border border-[#65ff9a]/30 bg-[#39ff88]/10 px-3 py-2 text-center">
          <div className="text-[8px] font-black uppercase tracking-[0.14em] text-[#8affb4]">
            Complete
          </div>
          <div className="mt-0.5 text-2xl font-black text-white">
            {mission.progress_percent}%
          </div>
        </div>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-lime-300 to-[#39ff88] transition-all duration-500"
          style={{ width: `${mission.progress_percent}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.12em]">
        <span className="text-lime-200">
          {mission.next_checkpoint}
        </span>
        <span className="text-slate-500">
          {mission.completed_sets}/{mission.planned_sets} sets
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          [
            "Exercises",
            `${mission.completed_exercises}/${mission.total_exercises}`,
          ],
          ["Active Ratio", `${mission.active_ratio_percent}%`],
          [
            "Volume",
            mission.total_volume > 0
              ? mission.total_volume.toLocaleString()
              : "-",
          ],
          [
            "Best Set",
            bestSet
              ? `${bestSet.reps} x ${formatLoad(bestSet.weight)}`
              : "-",
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-center"
          >
            <div className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">
              {label}
            </div>
            <div className="mt-1 truncate text-sm font-black text-white">
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-2xl border border-lime-300/18 bg-lime-300/[0.07] px-3 py-3 text-sm font-bold leading-5 text-lime-50">
        {mission.motivational_line}
      </div>

      <button
        type="button"
        onClick={() => setObjectivesOpen((current) => !current)}
        className="mt-3 h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-black text-white"
      >
        {objectivesOpen ? "Hide Mission Objectives" : "View Mission Objectives"}
      </button>

      {objectivesOpen ? (
        <div className="mt-3 space-y-2">
          {mission.objectives.map((objective) => (
            <div
              key={objective.id}
              className={
                objective.complete
                  ? "flex items-center justify-between rounded-xl border border-lime-300/25 bg-lime-300/10 px-3 py-2"
                  : "flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-3 py-2"
              }
            >
              <div className="text-xs font-black text-white">
                {objective.complete ? "✓ " : ""}
                {objective.label}
              </div>
              <div className="text-[10px] font-black text-slate-400">
                {objective.current}/{objective.target || "-"}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-3 gap-2">
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
          disabled={session?.set_active}
          className="h-11 rounded-xl border border-lime-300/25 bg-lime-300/10 text-xs font-black text-lime-100 disabled:opacity-40"
        >
          Modify
        </button>

        <button
          type="button"
          onClick={onFinish}
          disabled={session?.set_active}
          className="h-11 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-black text-white disabled:opacity-40"
        >
          Finish
        </button>
      </div>
    </section>
  );
}
