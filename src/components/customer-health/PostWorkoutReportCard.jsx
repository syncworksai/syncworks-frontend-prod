// src/components/customer-health/PostWorkoutReportCard.jsx
import React, { useMemo, useState } from "react";
import { buildWorkoutReport } from "./healthWorkoutReport";
import { formatSeconds } from "./healthWorkoutSession";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function MiniStat({ label, value, tone = "slate" }) {
  const tones = {
    lime: "border-lime-300/20 bg-lime-300/10 text-lime-100",
    cyan: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
    amber: "border-amber-300/20 bg-amber-300/10 text-amber-100",
    fuchsia:
      "border-fuchsia-300/20 bg-fuchsia-300/10 text-fuchsia-100",
    rose: "border-rose-300/20 bg-rose-300/10 text-rose-100",
    slate: "border-white/10 bg-white/[0.04] text-slate-200",
  };

  return (
    <div
      className={cx(
        "rounded-xl border px-2 py-2 text-center",
        tones[tone] || tones.slate
      )}
    >
      <div className="text-[8px] font-black uppercase tracking-wider opacity-75">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-black">
        {value}
      </div>
    </div>
  );
}

export default function PostWorkoutReportCard({ session }) {
  const [expanded, setExpanded] = useState(false);
  const [showProgression, setShowProgression] =
    useState(true);
  const report = useMemo(
    () => buildWorkoutReport(session || {}),
    [session]
  );

  if (!session) return null;

  return (
    <section className="rounded-[1.5rem] border border-lime-300/20 bg-[radial-gradient(circle_at_top_left,rgba(57,255,136,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(255,59,212,0.09),transparent_32%),linear-gradient(135deg,rgba(4,8,18,0.96),rgba(7,17,31,0.98))] p-3 shadow-[0_18px_55px_rgba(0,0,0,0.28)] sm:rounded-[2rem] sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-lime-200">
            SYNC Post-Workout Recap
          </div>
          <h3 className="mt-1 text-xl font-black text-white">
            Session complete
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-300">
            What went well, what to fix, and what SYNC should recommend next.
          </p>
        </div>

        <div className="shrink-0 rounded-2xl border border-fuchsia-300/25 bg-fuchsia-300/10 px-3 py-2 text-center">
          <div className="text-[8px] font-black uppercase tracking-wider text-fuchsia-200">
            Score
          </div>
          <div className="mt-0.5 text-2xl font-black text-fuchsia-100">
            {report.sessionScore}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.07] p-3">
        <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-200">
          SYNC Coach Summary
        </div>
        <div className="mt-2 text-sm font-bold leading-6 text-slate-100">
          {report.coachSummary}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        <MiniStat label="Total" value={formatSeconds(report.totalSeconds)} tone="cyan" />
        <MiniStat label="Active" value={formatSeconds(report.activeSeconds)} tone="lime" />
        <MiniStat label="Effort" value={report.effortLabel} tone="fuchsia" />
        <MiniStat label="Active %" value={`${report.activeRatio}%`} tone="amber" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStat label="Sets" value={`${report.totalSets}/${report.plannedSets || "-"}`} tone="lime" />
        <MiniStat label="Volume" value={Math.round(report.totalVolume).toLocaleString()} tone="cyan" />
        <MiniStat label="Target Vol" value={report.targetVolume > 0 ? Math.round(report.targetVolume).toLocaleString() : "-"} tone="fuchsia" />
        <MiniStat label="Flags" value={report.painFlags + report.missedTargets} tone={report.painFlags || report.missedTargets ? "rose" : "lime"} />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-2xl border border-lime-300/15 bg-lime-300/[0.06] p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-lime-200">
            What Went Well
          </div>
          <div className="mt-2 space-y-1.5">
            {(report.wins.length ? report.wins : ["Complete a working set to generate wins."]).map((item) => (
              <div key={item} className="text-xs font-bold leading-5 text-slate-200">+ {item}</div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.06] p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-200">
            What To Improve
          </div>
          <div className="mt-2 space-y-1.5">
            {report.nextSteps.map((item) => (
              <div key={item} className="text-xs font-bold leading-5 text-slate-200">- {item}</div>
            ))}
          </div>
        </div>
      </div>

      {report.attentionRows.length ? (
        <div className="mt-3 rounded-2xl border border-rose-300/20 bg-rose-300/[0.06] p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-rose-200">
            Pain / Form / Missed Target Flags
          </div>
          <div className="mt-2 space-y-1.5">
            {report.attentionRows.slice(0, 4).map((row) => (
              <div key={row.id || row.name} className="text-xs font-bold leading-5 text-slate-200">
                {row.name}: {row.outcome}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setShowProgression((current) => !current)}
        className="mt-3 w-full rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.08] px-3 py-3 text-xs font-black text-cyan-100"
      >
        {showProgression ? "Hide Next Session Targets" : "Show Next Session Targets"}
      </button>

      {showProgression ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(report.progressionRows.length ? report.progressionRows : []).map((row) => (
            <div key={row.id || row.name} className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="text-sm font-black text-white">{row.name}</div>
              <div className="mt-1 text-xs font-bold text-cyan-100">
                Next target: {row.nextWeight || "BW"} x {row.nextReps || "-"}
              </div>
              <div className="mt-1 text-[11px] font-bold leading-5 text-slate-400">{row.reason}</div>
            </div>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-xs font-black text-white"
      >
        {expanded ? "Hide Exercise Breakdown" : "View Exercise Breakdown"}
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
                  : row.outcome === "incomplete" || row.outcome === "skipped" || row.outcome === "target missed"
                  ? "border-amber-300/20 bg-amber-300/[0.06]"
                  : "border-white/10 bg-black/20"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-black text-white">{row.name}</div>
                  <div className="mt-1 text-[10px] font-bold text-slate-400">
                    {row.completedSets}/{row.plannedSets || "-"} working sets / {Math.round(row.volume).toLocaleString()} lb
                  </div>
                </div>
                <div className="shrink-0 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] font-black uppercase text-slate-200">
                  {row.outcome}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {row.averageRpe ? (
                  <span className="rounded-lg bg-fuchsia-300/10 px-2 py-1 text-[9px] font-black text-fuchsia-100">
                    {row.effortLabel} {row.averageRpe}
                  </span>
                ) : null}
                {row.failures ? (
                  <span className="rounded-lg bg-rose-300/10 px-2 py-1 text-[9px] font-black text-rose-100">
                    {row.failures} failure
                  </span>
                ) : null}
                {row.missedReps || row.missedLoad ? (
                  <span className="rounded-lg bg-amber-300/10 px-2 py-1 text-[9px] font-black text-amber-100">
                    Missed target
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