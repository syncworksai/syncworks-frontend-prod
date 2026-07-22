// src/components/customer-health/PreWorkoutCheckInDrawer.jsx
import React, { useEffect, useMemo, useState } from "react";
import { classifyWorkout } from "./healthTrainingClassification";

const BODY_AREAS = [
  "Neck",
  "Shoulders",
  "Chest",
  "Upper Back",
  "Lower Back",
  "Elbows",
  "Wrists",
  "Core",
  "Hips",
  "Knees",
  "Ankles",
  "Quads",
  "Hamstrings",
  "Calves",
];

const SEVERITY_OPTIONS = ["Mild", "Moderate", "Severe"];

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function toggleItem(values, value) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function ChoiceButton({
  active,
  onClick,
  children,
  tone = "cyan",
}) {
  const activeClasses = {
    cyan:
      "border-cyan-300/35 bg-cyan-300/15 text-cyan-100",
    lime:
      "border-lime-300/35 bg-lime-300/15 text-lime-100",
    amber:
      "border-amber-300/35 bg-amber-300/15 text-amber-100",
    rose:
      "border-rose-300/35 bg-rose-300/15 text-rose-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "min-h-10 rounded-xl border px-2.5 py-2 text-[11px] font-black",
        active
          ? activeClasses[tone] || activeClasses.cyan
          : "border-white/10 bg-white/[0.035] text-slate-400"
      )}
    >
      {children}
    </button>
  );
}

function controlLabel(value) {
  const labels = {
    locked: "Locked Plan",
    coach_assist: "Coach Assist",
    adaptive: "Adaptive",
  };

  return labels[value] || "Coach Assist";
}

export default function PreWorkoutCheckInDrawer({
  open,
  onClose,
  workout,
  snapshot,
  onConfirm,
}) {
  const [readiness, setReadiness] = useState(
    snapshot?.readiness || "Good"
  );
  const [energy, setEnergy] = useState("Good");
  const [soreAreas, setSoreAreas] = useState([]);
  const [painAreas, setPainAreas] = useState([]);
  const [painSeverity, setPainSeverity] =
    useState("None");
  const [avoidPainAreas, setAvoidPainAreas] =
    useState(true);
  const [adjustWorkout, setAdjustWorkout] =
    useState(true);
  const [bodyStatusOpen, setBodyStatusOpen] =
    useState(false);

  useEffect(() => {
    if (!open) return;

    setReadiness(snapshot?.readiness || "Good");
    setEnergy("Good");
    setSoreAreas(
      Array.isArray(snapshot?.sore_areas)
        ? snapshot.sore_areas
        : []
    );
    setPainAreas(
      Array.isArray(snapshot?.preworkout_pain_areas)
        ? snapshot.preworkout_pain_areas
        : []
    );
    setPainSeverity(
      snapshot?.preworkout_pain_severity || "None"
    );
    setAvoidPainAreas(true);
    setAdjustWorkout(
      workout?.plan_control !== "locked"
    );
    setBodyStatusOpen(false);
  }, [open, snapshot, workout]);

  const title =
    workout?.workout_name ||
    workout?.title ||
    workout?.name ||
    "Today's Workout";

  const exerciseCount = Array.isArray(workout?.exercises)
    ? workout.exercises.length
    : 0;

  const workoutClassification = useMemo(
    () => classifyWorkout(workout || {}),
    [workout]
  );

  const planControl =
    workout?.plan_control || "coach_assist";

  const painSelected = painAreas.length > 0;
  const canBegin =
    painSeverity !== "Severe" || !avoidPainAreas;

  const effectiveAdjust =
    planControl === "locked"
      ? false
      : planControl === "adaptive"
      ? true
      : adjustWorkout;

  const coachSummary = useMemo(() => {
    if (planControl === "locked") {
      return "SYNC will preserve the saved workout and provide cues without replacing exercises.";
    }

    if (avoidPainAreas && painAreas.length) {
      return `SYNC will train around ${painAreas.join(
        ", "
      )} and protect painful areas.`;
    }

    if (soreAreas.length) {
      return `SYNC will account for ${soreAreas.join(
        ", "
      )} while keeping the session moving.`;
    }

    if (planControl === "adaptive") {
      return "SYNC may adjust exercise choice, load, volume, or rest using todayâ€™s readiness.";
    }

    return "SYNC will keep the plan and offer coaching or suggested changes when useful.";
  }, [
    planControl,
    avoidPainAreas,
    painAreas,
    soreAreas,
  ]);

  if (!open || !workout) return null;

  function submit(overrides = {}) {
    onConfirm?.({
      readiness,
      energy,
      sore_areas: soreAreas,
      preworkout_pain_areas: painAreas,
      preworkout_pain_severity: painSelected
        ? painSeverity
        : "None",
      avoid_pain_areas: avoidPainAreas,
      adjust_workout: effectiveAdjust,
      plan_control: planControl,
      scientific_title:
        workoutClassification.scientific_title,
      training_category:
        workoutClassification.training_category,
      body_region:
        workoutClassification.body_region,
      movement_pattern:
        workoutClassification.movement_pattern,
      primary_muscles:
        workoutClassification.primary_muscles,
      secondary_muscles:
        workoutClassification.secondary_muscles,
      multiple_sessions_today:
        Boolean(snapshot?.multiple_sessions_today),
      session_number:
        Math.max(
          1,
          Number(snapshot?.next_session_number || 1)
        ),
      available_minutes:
        Number(
          workout?.requested_duration_minutes ||
            workout?.duration_minutes ||
            snapshot?.available_minutes ||
            45
        ),
      ...overrides,
    });
  }

  return (
    <div className="fixed inset-0 z-[170] flex items-end justify-center bg-black/85 p-3 backdrop-blur-md sm:items-center">
      <button
        type="button"
        aria-label="Close pre-workout check-in"
        onClick={onClose}
        className="absolute inset-0"
      />

      <section className="relative z-[171] flex max-h-[94dvh] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] border border-lime-300/20 bg-[radial-gradient(circle_at_top_left,rgba(57,255,136,0.10),transparent_30%),linear-gradient(180deg,#07111f,#040812)] shadow-[0_28px_90px_rgba(0,0,0,0.72)]">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-lime-200">
                Ready check
              </div>
              <h2 className="mt-1 truncate text-2xl font-black text-white">
                {title}
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100">
                  {exerciseCount} exercises
                </span>
                <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-fuchsia-100">
                  {controlLabel(planControl)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-xs font-black text-white"
            >
              X
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-4">
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200">
              Scientific focus
            </div>
            <div className="mt-2 text-lg font-black text-white">
              {workoutClassification.scientific_title}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {workoutClassification.body_region} · {workoutClassification.movement_pattern}
            </div>
            {workoutClassification.primary_muscles?.length ? (
              <div className="mt-2 text-xs leading-5 text-slate-300">
                Primary: {workoutClassification.primary_muscles.join(", ")}
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                Readiness
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {["Low", "Good", "Ready"].map((item) => (
                  <ChoiceButton
                    key={item}
                    active={readiness === item}
                    onClick={() => setReadiness(item)}
                    tone="cyan"
                  >
                    {item}
                  </ChoiceButton>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                Energy
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {["Low", "Good", "High"].map((item) => (
                  <ChoiceButton
                    key={item}
                    active={energy === item}
                    onClick={() => setEnergy(item)}
                    tone="lime"
                  >
                    {item}
                  </ChoiceButton>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setBodyStatusOpen((current) => !current)
            }
            className="mt-4 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left"
          >
            <span>
              <span className="block text-sm font-black text-white">
                Soreness or pain today?
              </span>
              <span className="mt-0.5 block text-[11px] text-slate-500">
                Optional â€” open only when your body needs an adjustment.
              </span>
            </span>
            <span className="text-xs font-black text-cyan-200">
              {bodyStatusOpen ? "Hide" : "Check"}
            </span>
          </button>

          {bodyStatusOpen ? (
            <div className="mt-3 space-y-3">
              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.055] p-3">
                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-200">
                  Normal soreness
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {BODY_AREAS.map((item) => (
                    <ChoiceButton
                      key={item}
                      active={soreAreas.includes(item)}
                      onClick={() =>
                        setSoreAreas((previous) =>
                          toggleItem(previous, item)
                        )
                      }
                      tone="amber"
                    >
                      {item}
                    </ChoiceButton>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-rose-300/20 bg-rose-300/[0.05] p-3">
                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-rose-200">
                  Existing pain
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {BODY_AREAS.map((item) => (
                    <ChoiceButton
                      key={item}
                      active={painAreas.includes(item)}
                      onClick={() => {
                        setPainAreas((previous) =>
                          toggleItem(previous, item)
                        );
                        if (
                          !painAreas.includes(item) &&
                          painSeverity === "None"
                        ) {
                          setPainSeverity("Mild");
                        }
                      }}
                      tone="rose"
                    >
                      {item}
                    </ChoiceButton>
                  ))}
                </div>

                {painSelected ? (
                  <>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {SEVERITY_OPTIONS.map((item) => (
                        <ChoiceButton
                          key={item}
                          active={painSeverity === item}
                          onClick={() =>
                            setPainSeverity(item)
                          }
                          tone="rose"
                        >
                          {item}
                        </ChoiceButton>
                      ))}
                    </div>

                    <label className="mt-3 flex items-start gap-3 rounded-xl border border-rose-300/20 bg-black/20 p-3">
                      <input
                        type="checkbox"
                        checked={avoidPainAreas}
                        onChange={(event) =>
                          setAvoidPainAreas(
                            event.target.checked
                          )
                        }
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-xs font-black text-white">
                          Train around these areas
                        </span>
                        <span className="mt-1 block text-[11px] leading-4 text-slate-500">
                          Protect the painful area and use comfortable alternatives.
                        </span>
                      </span>
                    </label>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}

          {planControl === "coach_assist" ? (
            <label className="mt-3 flex items-start gap-3 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/[0.06] p-3">
              <input
                type="checkbox"
                checked={adjustWorkout}
                onChange={(event) =>
                  setAdjustWorkout(event.target.checked)
                }
                className="mt-1"
              />
              <span>
                <span className="block text-xs font-black text-white">
                  Allow suggested adjustments
                </span>
                <span className="mt-1 block text-[11px] leading-4 text-slate-500">
                  SYNC may suggest safer or better options while keeping you in control.
                </span>
              </span>
            </label>
          ) : null}

          <div className="mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-200">
              SYNC plan
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-300">
              {coachSummary}
            </p>
          </div>

          {!canBegin ? (
            <div className="mt-3 rounded-2xl border border-rose-300/25 bg-rose-300/10 p-3 text-xs font-bold leading-5 text-rose-100">
              Severe pain should not be pushed through. Continue only with an appropriate medically cleared plan.
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-lime-300/15 bg-[#07111f]/98 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-xl">
          <div className="grid grid-cols-[0.75fr_1.25fr] gap-2">
            <button
              type="button"
              onClick={() =>
                submit({
                  readiness: "Ready",
                  energy: "Good",
                  sore_areas: [],
                  preworkout_pain_areas: [],
                  preworkout_pain_severity: "None",
                  adjust_workout:
                    planControl === "adaptive",
                  quick_start: true,
                })
              }
              className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] px-2 text-xs font-black text-slate-200"
            >
              Feeling Good
            </button>

            <button
              type="button"
              disabled={!canBegin}
              onClick={() => submit()}
              className="h-12 rounded-2xl border border-lime-300/30 bg-lime-300/15 text-sm font-black text-lime-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Start Workout
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
