// src/components/customer-health/WorkoutFocusDrawer.jsx
import React from "react";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function valueFrom(set, keys) {
  for (const key of keys) {
    if (set?.[key] !== undefined && set?.[key] !== null && set?.[key] !== "") return set[key];
  }
  return "";
}

function setLabel(set, index) {
  const reps = valueFrom(set, ["actual_reps", "reps", "target_reps"]);
  const weight = valueFrom(set, ["actual_weight", "weight", "target_weight"]);
  const effort = valueFrom(set, ["rpe", "effort", "difficulty"]);
  return {
    title: `Set ${index + 1}`,
    detail: [reps ? `${reps} reps` : "Reps not logged", weight !== "" ? `${weight} lb` : "Bodyweight", effort ? `RPE ${effort}` : ""].filter(Boolean).join(" · "),
  };
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/8 py-3 last:border-0">
      <span className="text-[10px] font-black uppercase tracking-[0.13em] text-slate-500">{label}</span>
      <span className="max-w-[68%] text-right text-sm font-bold leading-5 text-slate-100">{value}</span>
    </div>
  );
}

export default function WorkoutFocusDrawer({ open, mode, exercise, session, onClose, onReplay, onSwap, onSkip, onComeBackLater }) {
  if (!open || !exercise) return null;

  const currentSets = safeArray(exercise.set_logs);
  const previousSets = safeArray(exercise.previous_working_sets || exercise.last_working_sets || exercise.exercise_memory?.working_sets || exercise.memory?.working_sets);
  const image = exercise.image_url || exercise.hero_image || exercise.image || exercise.demo_image || "";
  const muscles = safeArray(exercise.primary_muscles || exercise.muscles || exercise.muscle_groups);
  const secondaryMuscles = safeArray(exercise.secondary_muscles);
  const title = mode === "history" ? "Historical reps" : mode === "insight" ? "Exercise and muscle focus" : "Change this exercise";

  return (
    <div className="fixed inset-0 z-[220] flex items-end justify-center bg-black/75 backdrop-blur-sm">
      <button type="button" aria-label="Close workout drawer" onClick={onClose} className="absolute inset-0" />
      <section className="relative z-[221] max-h-[82dvh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] border border-lime-300/25 bg-[linear-gradient(180deg,#07100a,#020403)] px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-3 shadow-[0_-24px_80px_rgba(0,0,0,0.72)]">
        <div className="mx-auto h-1.5 w-12 rounded-full bg-white/20" />
        <div className="mt-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-lime-300">Workout drawer</div>
            <h3 className="mt-1 text-2xl font-black text-white">{title}</h3>
            <p className="mt-1 truncate text-sm font-bold text-slate-400">{exercise.substitute_name || exercise.name}</p>
          </div>
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-xs font-black text-white">Close</button>
        </div>

        {mode === "history" ? (
          <div className="mt-4 space-y-4">
            {[{ label: "This workout", rows: currentSets, tone: "lime" }, { label: "Previous tracked session", rows: previousSets, tone: "cyan" }].map((group) => (
              <div key={group.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <div className={`text-[10px] font-black uppercase tracking-[0.15em] ${group.tone === "lime" ? "text-lime-200" : "text-cyan-200"}`}>{group.label}</div>
                <div className="mt-2 space-y-2">
                  {group.rows.length ? group.rows.map((set, index) => {
                    const row = setLabel(set, index);
                    return <div key={set.id || index} className="rounded-xl border border-white/10 bg-black/25 px-3 py-2"><div className="text-xs font-black text-white">{row.title}</div><div className="mt-1 text-[11px] text-slate-400">{row.detail}</div></div>;
                  }) : <div className="text-sm leading-5 text-slate-500">{group.label === "This workout" ? "No sets logged yet." : "No prior set history is attached yet. Today will establish or extend the baseline."}</div>}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {mode === "insight" ? (
          <div className="mt-4 space-y-3">
            {image ? <div className="overflow-hidden rounded-2xl border border-lime-300/20 bg-black/30"><img src={image} alt={exercise.name || "Exercise"} className="h-52 w-full object-cover" /></div> : null}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <InfoRow label="Target" value={`${exercise.current_target_reps || exercise.planned_reps || "Clean reps"} × ${exercise.current_target_weight || exercise.planned_weight || "Bodyweight"}`} />
              <InfoRow label="Primary muscles" value={muscles.join(", ") || exercise.primary_muscle || exercise.muscle_focus || "Movement-specific muscle focus"} />
              <InfoRow label="Secondary" value={secondaryMuscles.join(", ") || exercise.secondary_muscle || ""} />
              <InfoRow label="Purpose" value={exercise.reason || exercise.training_intent || exercise.coaching_focus || "Build controlled strength and repeatable technique."} />
              <InfoRow label="Technique" value={exercise.form_cue || exercise.cue || exercise.instructions || "Use controlled reps and stop if form breaks down."} />
              <InfoRow label="Rest" value={exercise.rest_seconds ? `${exercise.rest_seconds} seconds` : session?.rest_seconds ? `${session.rest_seconds} seconds` : "Follow the active rest timer"} />
            </div>
            <button type="button" onClick={onReplay} className="h-12 w-full rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-sm font-black text-cyan-100">Replay Exercise Cue</button>
          </div>
        ) : null}

        {mode === "change" ? (
          <div className="mt-4 space-y-2">
            <button type="button" onClick={onSwap} className="flex min-h-16 w-full items-center justify-between rounded-2xl border border-lime-300/25 bg-lime-300/10 px-4 text-left"><span><span className="block text-sm font-black text-lime-100">Swap exercise</span><span className="mt-1 block text-[11px] text-slate-400">Choose a similar movement or equipment option.</span></span><span className="text-xl text-lime-200">›</span></button>
            <button type="button" onClick={onComeBackLater} className="flex min-h-16 w-full items-center justify-between rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 text-left"><span><span className="block text-sm font-black text-amber-100">Machine busy — come back later</span><span className="mt-1 block text-[11px] text-slate-400">Keep this exercise unfinished and move to the next station.</span></span><span className="text-xl text-amber-200">›</span></button>
            <button type="button" onClick={onSkip} className="flex min-h-16 w-full items-center justify-between rounded-2xl border border-rose-300/25 bg-rose-300/10 px-4 text-left"><span><span className="block text-sm font-black text-rose-100">Skip exercise</span><span className="mt-1 block text-[11px] text-slate-400">Mark it skipped for this workout and continue.</span></span><span className="text-xl text-rose-200">›</span></button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
