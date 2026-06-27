// src/components/customer-health/PreWorkoutCheckInDrawer.jsx
import React, { useEffect, useMemo, useState } from "react";

const BODY_AREAS = [
  "Neck", "Shoulders", "Chest", "Upper Back", "Lower Back",
  "Elbows", "Wrists", "Core", "Hips", "Knees", "Ankles",
  "Quads", "Hamstrings", "Calves",
];

const SEVERITY_OPTIONS = ["Mild", "Moderate", "Severe"];

function toggleItem(values, value) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function ChoiceButton({ active, onClick, children, tone = "cyan" }) {
  const activeClasses = {
    cyan: "border-cyan-300/35 bg-cyan-300/15 text-cyan-100",
    lime: "border-lime-300/35 bg-lime-300/15 text-lime-100",
    amber: "border-amber-300/35 bg-amber-300/15 text-amber-100",
    rose: "border-rose-300/35 bg-rose-300/15 text-rose-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-2xl border px-3 py-2 text-xs font-black ${
        active
          ? activeClasses[tone] || activeClasses.cyan
          : "border-white/10 bg-white/[0.035] text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

export default function PreWorkoutCheckInDrawer({
  open,
  onClose,
  workout,
  snapshot,
  onConfirm,
}) {
  const [readiness, setReadiness] = useState(snapshot?.readiness || "Good");
  const [energy, setEnergy] = useState("Good");
  const [soreAreas, setSoreAreas] = useState([]);
  const [painAreas, setPainAreas] = useState([]);
  const [painSeverity, setPainSeverity] = useState("None");
  const [avoidPainAreas, setAvoidPainAreas] = useState(true);
  const [adjustWorkout, setAdjustWorkout] = useState(true);

  useEffect(() => {
    if (!open) return;
    setReadiness(snapshot?.readiness || "Good");
    setEnergy("Good");
    setSoreAreas(Array.isArray(snapshot?.sore_areas) ? snapshot.sore_areas : []);
    setPainAreas(
      Array.isArray(snapshot?.preworkout_pain_areas)
        ? snapshot.preworkout_pain_areas
        : []
    );
    setPainSeverity(snapshot?.preworkout_pain_severity || "None");
    setAvoidPainAreas(true);
    setAdjustWorkout(true);
  }, [open, snapshot]);

  if (!open || !workout) return null;

  const title =
    workout.workout_name || workout.title || workout.name || "Today's Workout";
  const exerciseCount = Array.isArray(workout.exercises)
    ? workout.exercises.length
    : 0;
  const painSelected = painAreas.length > 0;
  const canBegin = painSeverity !== "Severe" || !avoidPainAreas;

  const coachSummary = useMemo(() => {
    if (avoidPainAreas && painAreas.length) {
      return `The coach will build around ${painAreas.join(", ")} and prioritize movements you can do comfortably today.`;
    }
    if (soreAreas.length) {
      return `The coach will reduce unnecessary work for ${soreAreas.join(", ")} while keeping you moving.`;
    }
    return "The coach will keep the planned session and adjust intensity from your readiness and energy.";
  }, [avoidPainAreas, painAreas, soreAreas]);

  return (
    <div className="fixed inset-0 z-[170] flex items-end justify-center bg-black/85 p-3 backdrop-blur-md sm:items-center">
      <button type="button" aria-label="Close pre-workout check-in" onClick={onClose} className="absolute inset-0" />

      <section className="relative z-[171] flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-lime-300/20 bg-[#07111f] shadow-[0_28px_90px_rgba(0,0,0,0.72)]">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-200">Pre-Workout Check-In</div>
          <h2 className="mt-1 text-2xl font-black text-white">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            {exerciseCount} exercise{exerciseCount === 1 ? "" : "s"}. Tell the coach how your body feels so it can offer movements you can do today.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Readiness</div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {["Low", "Good", "Ready"].map((item) => (
                  <ChoiceButton key={item} active={readiness === item} onClick={() => setReadiness(item)} tone="cyan">{item}</ChoiceButton>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Energy</div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {["Low", "Good", "High"].map((item) => (
                  <ChoiceButton key={item} active={energy === item} onClick={() => setEnergy(item)} tone="lime">{item}</ChoiceButton>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-[1.35rem] border border-amber-300/20 bg-amber-300/[0.06] p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-200">Normal soreness</div>
            <p className="mt-1 text-xs leading-5 text-slate-400">Select areas that feel trained or stiff from a recent workout. Soreness is not automatically an injury.</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {BODY_AREAS.map((item) => (
                <ChoiceButton key={item} active={soreAreas.includes(item)} onClick={() => setSoreAreas((previous) => toggleItem(previous, item))} tone="amber">{item}</ChoiceButton>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-[1.35rem] border border-rose-300/20 bg-rose-300/[0.055] p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-200">Existing pain before training</div>
            <p className="mt-1 text-xs leading-5 text-slate-400">This is pain you already have today. It is separate from pain caused by a specific exercise.</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {BODY_AREAS.map((item) => (
                <ChoiceButton
                  key={item}
                  active={painAreas.includes(item)}
                  onClick={() => {
                    setPainAreas((previous) => toggleItem(previous, item));
                    if (!painAreas.includes(item) && painSeverity === "None") setPainSeverity("Mild");
                  }}
                  tone="rose"
                >
                  {item}
                </ChoiceButton>
              ))}
            </div>

            {painSelected ? (
              <>
                <div className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Existing pain severity</div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {SEVERITY_OPTIONS.map((item) => (
                    <ChoiceButton key={item} active={painSeverity === item} onClick={() => setPainSeverity(item)} tone="rose">{item}</ChoiceButton>
                  ))}
                </div>

                <label className="mt-3 flex items-start gap-3 rounded-2xl border border-rose-300/20 bg-black/20 p-3">
                  <input type="checkbox" checked={avoidPainAreas} onChange={(event) => setAvoidPainAreas(event.target.checked)} className="mt-1" />
                  <span>
                    <span className="block text-sm font-black text-white">Train around these areas</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-400">Offer exercises I can do comfortably instead of only telling me what I cannot do.</span>
                  </span>
                </label>
              </>
            ) : null}
          </div>

          <label className="mt-4 flex items-start gap-3 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/[0.07] p-3">
            <input type="checkbox" checked={adjustWorkout} onChange={(event) => setAdjustWorkout(event.target.checked)} className="mt-1" />
            <span>
              <span className="block text-sm font-black text-white">Let the coach adapt today's workout</span>
              <span className="mt-1 block text-xs leading-5 text-slate-400">The coach will keep the training goal where possible and substitute movements based on soreness, pain, energy, and available options.</span>
            </span>
          </label>

          <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.07] p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">What the coach will do</div>
            <p className="mt-1 text-sm leading-6 text-slate-300">{coachSummary}</p>
          </div>

          {!canBegin ? (
            <div className="mt-4 rounded-2xl border border-rose-300/25 bg-rose-300/10 p-3 text-sm font-bold leading-6 text-rose-100">
              Severe pain should not be pushed through. Uncheck â€œTrain around these areasâ€ only when you have already chosen an appropriate medically cleared plan.
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-lime-300/15 bg-[#07111f]/98 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-xl">
          <div className="grid grid-cols-[0.8fr_1.2fr] gap-2">
            <button type="button" onClick={onClose} className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-white">Back</button>
            <button
              type="button"
              disabled={!canBegin}
              onClick={() => onConfirm?.({
                readiness,
                energy,
                sore_areas: soreAreas,
                preworkout_pain_areas: painAreas,
                preworkout_pain_severity: painSelected ? painSeverity : "None",
                avoid_pain_areas: avoidPainAreas,
                adjust_workout: adjustWorkout,
              })}
              className="h-12 rounded-2xl border border-lime-300/30 bg-lime-300/15 text-sm font-black text-lime-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {adjustWorkout ? "Build What I Can Do" : "Begin Planned Workout"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}