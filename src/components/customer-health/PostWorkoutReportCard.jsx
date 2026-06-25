// src/components/customer-health/PostWorkoutReportCard.jsx
import React, { useMemo, useState } from "react";
import { buildWorkoutReport } from "./healthWorkoutReport";
import { formatSeconds } from "./healthWorkoutSession";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function PostWorkoutReportCard({ session }) {
  const [expanded, setExpanded] = useState(false);
  const report = useMemo(
    () => buildWorkoutReport(session || {}),
    [session]
  );

  if (!session) return null;

  return (
    <section className="rounded-[1.5rem] border border-lime-300/20 bg-[linear-gradient(135deg,rgba(57,255,136,0.08),rgba(52,223,255,0.06))] p-3 sm:rounded-[2rem] sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-lime-200">
            SyncWorks Post-Workout Report
          </div>
          <h3 className="mt-1 text-xl font-black text-white">
            Session complete
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-300">
            Review performance, recovery signals, and the next coaching move.
          </p>
        </div>
        <div className="rounded-xl border border-lime-300/20 bg-lime-300/10 px-3 py-2 text-center">
          <div className="text-[8px] font-black uppercase tracking-wider text-lime-200">
            Volume
          </div>
          <div className="mt-1 text-sm font-black text-white">
            {Math.round(report.totalVolume).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {[
          ["Total", formatSeconds(report.totalSeconds)],
          ["Active", formatSeconds(report.activeSeconds)],
          ["Rest", formatSeconds(report.restSeconds)],
          ["Idle", formatSeconds(report.idleSeconds)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-white/10 bg-black/20 px-1.5 py-2 text-center"
          >
            <div className="text-[8px] font-black uppercase tracking-wider text-slate-500">
              {label}
            </div>
            <div className="mt-1 truncate text-xs font-black text-white">
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          ["Working Sets", report.totalSets],
          ["Missed Targets", report.missedTargets],
          ["Pain/Form Flags", report.painFlags],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-center"
          >
            <div className="text-[8px] font-black uppercase tracking-wider text-slate-500">
              {label}
            </div>
            <div className="mt-1 text-base font-black text-white">
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-2xl border border-lime-300/15 bg-lime-300/[0.06] p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-lime-200">
            Wins
          </div>
          <div className="mt-2 space-y-1.5">
            {(report.wins.length
              ? report.wins
              : ["Complete a working set to generate wins."]
            ).map((item) => (
              <div
                key={item}
                className="text-xs font-bold leading-5 text-slate-200"
              >
                ✓ {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-200">
            Coach Next Move
          </div>
          <div className="mt-2 space-y-1.5">
            {report.nextSteps.map((item) => (
              <div
                key={item}
                className="text-xs font-bold leading-5 text-slate-200"
              >
                • {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-xs font-black text-white"
      >
        {expanded
          ? "Hide Exercise Breakdown"
          : "View Exercise Breakdown"}
      </button>

      {expanded ? (
        <div className="mt-3 space-y-2">
          {report.rows.map((row) => (
            <div
              key={row.id || row.name}
              className={cx(
                "rounded-2xl border p-3",
                row.outcome === "attention"
                  ? "border-rose-300/20 bg-rose-300/[0.06]"
                  : row.outcome === "incomplete" ||
                    row.outcome === "skipped"
                  ? "border-amber-300/20 bg-amber-300/[0.06]"
                  : "border-white/10 bg-black/20"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-black text-white">
                    {row.name}
                  </div>
                  <div className="mt-1 text-[10px] font-bold text-slate-400">
                    {row.completedSets}/{row.plannedSets || "—"} working sets
                    {" · "}
                    {Math.round(row.volume).toLocaleString()} lb
                  </div>
                </div>
                <div className="shrink-0 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] font-black uppercase text-slate-200">
                  {row.outcome}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {row.averageRpe ? (
                  <span className="rounded-lg bg-fuchsia-300/10 px-2 py-1 text-[9px] font-black text-fuchsia-100">
                    Avg RPE {row.averageRpe}
                  </span>
                ) : null}
                {row.failures ? (
                  <span className="rounded-lg bg-rose-300/10 px-2 py-1 text-[9px] font-black text-rose-100">
                    {row.failures} failure
                  </span>
                ) : null}
                {row.maxPain >= 3 ? (
                  <span className="rounded-lg bg-amber-300/10 px-2 py-1 text-[9px] font-black text-amber-100">
                    Pain {row.maxPain}/5
                  </span>
                ) : null}
                {row.poorForm ? (
                  <span className="rounded-lg bg-rose-300/10 px-2 py-1 text-[9px] font-black text-rose-100">
                    Form flag
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
