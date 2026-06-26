// src/components/customer-health/TrainerThumbControls.jsx
import React from "react";
import { formatSeconds } from "./healthWorkoutSession";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function MiniButton({
  label,
  sublabel = "",
  icon = "",
  tone = "slate",
  onClick,
  disabled = false,
  wide = false,
}) {
  const toneMap = {
    slate:
      "border-white/10 bg-white/[0.05] text-slate-100 hover:bg-white/[0.09]",
    cyan: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/20",
    emerald:
      "border-emerald-300/30 bg-emerald-300/15 text-emerald-100 hover:bg-emerald-300/25",
    amber:
      "border-amber-300/30 bg-amber-300/15 text-amber-100 hover:bg-amber-300/25",
    rose: "border-rose-300/30 bg-rose-300/15 text-rose-100 hover:bg-rose-300/25",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "flex min-w-0 flex-col items-center justify-center rounded-2xl border px-2 py-2.5 text-center transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40",
        toneMap[tone] || toneMap.slate,
        wide ? "col-span-2" : ""
      )}
    >
      <div className="flex max-w-full items-center justify-center gap-1">
        {icon ? <span className="text-sm leading-none">{icon}</span> : null}
        <span className="truncate text-[11px] font-black uppercase tracking-[0.12em]">
          {label}
        </span>
      </div>

      {sublabel ? (
        <span className="mt-0.5 max-w-full truncate text-[10px] font-bold opacity-70">
          {sublabel}
        </span>
      ) : null}
    </button>
  );
}

export default function TrainerThumbControls({
  session,
  currentExercise,
  currentIndex,
  totalExercises,
  onPrevious,
  onNext,
  onStartSet,
  onCompleteSet,
  onToggleRest,
  onFinish,
  onClose,
}) {
  if (!session) return null;

  const isCompleted = session.status === "completed";
  const isSetActive = !!session.set_active;
  const isResting = !!session.rest_active;
  const isFirst = currentIndex <= 0;
  const isLast = currentIndex >= totalExercises - 1;

  const activeLabel = isSetActive ? "Complete" : "Start Set";
  const activeSubLabel = isSetActive
    ? formatSeconds(session.current_set_seconds || 0)
    : currentExercise
    ? `${currentExercise.planned_sets || "3"} x ${
        currentExercise.planned_reps || "10"
      }`
    : "";

  return (
    <div className="fixed inset-x-0 bottom-0 z-[120] border-t border-white/10 bg-[#020617]/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.7rem)] pt-3 shadow-[0_-22px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
      <div className="mx-auto max-w-5xl">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <div className="min-w-0">
            <div className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Current Exercise
            </div>
            <div className="truncate text-sm font-black text-white">
              {currentExercise?.substituted && currentExercise?.substitute_name
                ? currentExercise.substitute_name
                : currentExercise?.name || "Workout"}
            </div>
          </div>

          <div
            className={cx(
              "shrink-0 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]",
              isSetActive
                ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                : isResting
                ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                : "border-white/10 bg-white/[0.04] text-slate-300"
            )}
          >
            {isSetActive
              ? `Set ${formatSeconds(session.current_set_seconds || 0)}`
              : isResting
              ? "Resting"
              : "Ready"}
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2">
          <MiniButton
            label="Prev"
            icon="‹"
            tone="slate"
            onClick={onPrevious}
            disabled={isCompleted || isFirst}
          />

          <MiniButton
            label={isResting ? "Stop Rest" : "Rest"}
            icon="⏱"
            tone={isResting ? "amber" : "cyan"}
            onClick={onToggleRest}
            disabled={isCompleted || isSetActive}
          />

          <MiniButton
            label={activeLabel}
            sublabel={activeSubLabel}
            icon={isSetActive ? "✓" : "▶"}
            tone={isSetActive ? "emerald" : "emerald"}
            onClick={isSetActive ? onCompleteSet : onStartSet}
            disabled={isCompleted || !currentExercise}
            wide
          />

          <MiniButton
            label="Next"
            icon="›"
            tone="slate"
            onClick={onNext}
            disabled={isCompleted || isLast}
          />
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <MiniButton
            label="Finish"
            icon="🏁"
            tone="amber"
            onClick={onFinish}
            disabled={isCompleted || isSetActive}
          />

          <MiniButton label="Close" icon=" x " tone="slate" onClick={onClose} />
        </div>
      </div>
    </div>
  );
}