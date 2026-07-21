// src/components/customer-health/AdaptiveCoachProposalCard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

import { speakCoachText } from "./healthCoachVoice";
import { readHealthCoachingContext } from "./healthCoachingContext";

function numeric(value) {
  const parsed = Number(
    String(value ?? "").replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatLoad(value) {
  const text = String(value ?? "").trim();

  if (
    !text ||
    /^(bw|bodyweight|body weight)$/i.test(text)
  ) {
    return "bodyweight";
  }

  return `${text} pounds`;
}

function buildOptions(exercise) {
  const recommendation =
    exercise?.memory_recommendation || {};
  const previous =
    exercise?.previous_performance || {};
  const previousSet = previous?.last_set || {};

  const baseWeight =
    numeric(
      recommendation?.weight ??
        exercise?.current_target_weight ??
        exercise?.planned_weight ??
        previousSet?.weight
    ) || 0;

  const baseReps =
    numeric(
      recommendation?.reps ??
        exercise?.current_target_reps ??
        exercise?.planned_reps ??
        previousSet?.reps
    ) || 10;

  const action =
    exercise?.memory_action ||
    recommendation?.action ||
    "repeat";

  const suggestedWeight =
    action === "progress" && baseWeight > 0
      ? baseWeight
      : baseWeight;

  const options = [
    {
      id: "recommended",
      label:
        action === "progress"
          ? "Progress load"
          : action === "protect"
          ? "Protect and reduce"
          : action === "hold"
          ? "Hold current target"
          : "Repeat cleanly",
      weight:
        action === "protect" && baseWeight > 0
          ? Math.max(0, baseWeight - 5)
          : suggestedWeight,
      reps: baseReps,
      reason:
        exercise?.memory_note ||
        recommendation?.reason ||
        (action === "progress"
          ? "Your previous logged performance supports a controlled increase."
          : action === "protect"
          ? "Recent pain, form, or effort data supports a safer reduced target."
          : "Your previous performance supports repeating this target with clean form."),
    },
    {
      id: "alternate",
      label:
        baseWeight > 0
          ? "Smaller load step"
          : "Add one rep",
      weight:
        baseWeight > 0
          ? Math.max(
              0,
              action === "protect"
                ? baseWeight - 2.5
                : baseWeight + 2.5
            )
          : "",
      reps:
        baseWeight > 0
          ? baseReps
          : baseReps + 1,
      reason:
        baseWeight > 0
          ? "This uses a smaller load adjustment while preserving the same rep target."
          : "This keeps bodyweight resistance and progresses by one controlled rep.",
    },
    {
      id: "conservative",
      label: "Conservative option",
      weight:
        baseWeight > 0
          ? Math.max(0, baseWeight - 5)
          : "",
      reps: Math.max(1, baseReps - 1),
      reason:
        "This reduces the immediate demand and prioritizes clean form, readiness, and pain-free movement.",
    },
  ];

  return options;
}

export default function AdaptiveCoachProposalCard({
  exercise,
  audioMode = "off",
  voicePreference = "female",
  onApply,
}) {
  const options = useMemo(
    () => buildOptions(exercise),
    [exercise]
  );
  const [optionIndex, setOptionIndex] =
    useState(0);
  const [decision, setDecision] =
    useState("");
  const spokenKeyRef = useRef("");

  useEffect(() => {
    setOptionIndex(0);
    setDecision("");
    spokenKeyRef.current = "";
  }, [exercise?.id]);

  const proposal =
    options[optionIndex] || options[0];

  if (
    !exercise ||
    (!exercise?.previous_performance &&
      !exercise?.memory_recommendation)
  ) {
    return null;
  }

  const proposalText = [
    `Based on your previous ${exercise.name || "exercise"} performance,`,
    `I recommend ${proposal.reps} reps at ${formatLoad(
      proposal.weight
    )}.`,
    proposal.reason,
    "Would you like me to apply this change?",
  ].join(" ");

  function readProposal() {
    speakCoachText({
      text: proposalText,
      audioMode:
        audioMode === "off"
          ? "essential"
          : audioMode,
      voicePreference,
      rate: 0.98,
      pitch: 1,
      volume: 1,
    });

    spokenKeyRef.current = `${exercise.id}:${proposal.id}`;
  }

  function applyProposal() {
    onApply?.({
      weight: proposal.weight,
      reps: proposal.reps,
      action: proposal.id,
      reason: proposal.reason,
    });
    setDecision("applied");

    if (audioMode !== "off") {
      speakCoachText({
        text: `Applied. Your next target is ${proposal.reps} reps at ${formatLoad(
          proposal.weight
        )}.`,
        audioMode,
        voicePreference,
        rate: 1,
        pitch: 1,
        volume: 1,
      });
    }
  }

  function keepOriginal() {
    setDecision("kept");

    if (audioMode !== "off") {
      speakCoachText({
        text:
          "Original target kept. I will continue monitoring your form, effort, and pain.",
        audioMode,
        voicePreference,
        rate: 1,
        pitch: 1,
        volume: 1,
      });
    }
  }

  function showAnother() {
    const nextIndex =
      (optionIndex + 1) % options.length;
    setOptionIndex(nextIndex);
    setDecision("");

    const next = options[nextIndex];

    if (audioMode !== "off") {
      speakCoachText({
        text: `Another option is ${next.reps} reps at ${formatLoad(
          next.weight
        )}. ${next.reason}`,
        audioMode,
        voicePreference,
        rate: 0.98,
        pitch: 1,
        volume: 1,
      });
    }
  }

  return (
    <section className="rounded-[1.5rem] border border-emerald-300/25 bg-[radial-gradient(circle_at_top_right,rgba(0,245,106,0.13),transparent_35%),linear-gradient(145deg,rgba(4,10,7,0.98),rgba(2,4,3,0.99))] p-4 shadow-[0_18px_52px_rgba(0,0,0,0.34)] sm:rounded-[2rem]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-emerald-300">
            SYNC Coach Proposal
          </div>
          <h3 className="mt-1 text-lg font-black text-white">
            {proposal.label}
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            SYNC reviewed your previous load, reps,
            effort, and available pain or form data.
          </p>
        </div>

        <button
          type="button"
          onClick={readProposal}
          className="shrink-0 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-100"
        >
          Read Aloud
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-white/10 bg-black/25 p-3 text-center">
          <div className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-500">
            Proposed
          </div>
          <div className="mt-1 text-lg font-black text-white">
            {proposal.reps} reps
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-3 text-center">
          <div className="text-[8px] font-black uppercase tracking-[0.14em] text-emerald-200">
            Load
          </div>
          <div className="mt-1 text-lg font-black text-emerald-100">
            {proposal.weight
              ? `${proposal.weight} lb`
              : "BW"}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/25 p-3 text-center">
          <div className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-500">
            Option
          </div>
          <div className="mt-1 text-lg font-black text-white">
            {optionIndex + 1}/{options.length}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-white/10 bg-black/25 p-3 text-xs font-bold leading-5 text-slate-200">
        {proposal.reason}
      </div>

      {decision ? (
        <div
          className={`mt-3 rounded-2xl border px-3 py-2 text-xs font-black ${
            decision === "applied"
              ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
              : "border-white/10 bg-white/[0.04] text-slate-300"
          }`}
        >
          {decision === "applied"
            ? "Change applied to this exercise and future sets."
            : "Original target kept."}
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={applyProposal}
          className="h-12 rounded-2xl border border-emerald-300/60 bg-emerald-400 text-sm font-black text-black"
        >
          Yes, Apply
        </button>

        <button
          type="button"
          onClick={keepOriginal}
          className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-white"
        >
          Keep Original
        </button>

        <button
          type="button"
          onClick={showAnother}
          className="h-12 rounded-2xl border border-amber-300/25 bg-amber-300/10 text-sm font-black text-amber-100"
        >
          Show Another Option
        </button>
      </div>
    </section>
  );
}
