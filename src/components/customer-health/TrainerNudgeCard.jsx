// src/components/customer-health/TrainerNudgeCard.jsx

import React, {
  useEffect,
  useRef,
} from "react";

import {
  speakCoachText,
} from "./healthCoachVoice";

function cx(...parts) {
  return parts
    .filter(Boolean)
    .join(" ");
}

function formatTargetValue(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  return value;
}

function RecommendationTarget({
  recommendation,
}) {
  if (!recommendation) return null;

  const weight =
    formatTargetValue(
      recommendation.recommended_weight
    );

  const reps =
    formatTargetValue(
      recommendation.recommended_reps
    );

  return (
    <div className="mt-4 rounded-3xl border border-white/10 bg-black/25 p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
        Recommended Next Set
      </div>

      <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
        <div className="text-3xl font-black text-white">
          {weight}
        </div>

        <div className="pb-1 text-sm font-bold text-slate-400">
          lb
        </div>

        <div className="pb-1 text-xl font-black text-cyan-200">
          ×
        </div>

        <div className="text-3xl font-black text-white">
          {reps}
        </div>

        <div className="pb-1 text-sm font-bold text-slate-400">
          reps
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-200">
          {String(
            recommendation.action ||
              "hold"
          ).replaceAll("_", " ")}
        </span>

        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-200">
          {recommendation.confidence ||
            "medium"}{" "}
          confidence
        </span>

        {recommendation.generated_after_set ? (
          <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-200">
            After set{" "}
            {
              recommendation.generated_after_set
            }
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default function TrainerNudgeCard({
  nudge,
  audioMode = "off",
  voicePreference = "auto",
  onReplay,

  onUseRecommendation,
  onKeepCurrent,
  onAdjustManually,
}) {
  const lastSpokenRef = useRef("");

  const toneMap = {
    cyan:
      "border-cyan-300/20 bg-cyan-300/10 text-cyan-50",

    emerald:
      "border-emerald-300/20 bg-emerald-300/10 text-emerald-50",

    amber:
      "border-amber-300/20 bg-amber-300/10 text-amber-50",

    rose:
      "border-rose-300/20 bg-rose-300/10 text-rose-50",

    slate:
      "border-white/10 bg-white/[0.04] text-slate-100",
  };

  useEffect(() => {
    if (
      !nudge?.speak ||
      audioMode === "off"
    ) {
      return;
    }

    const speakKey = [
      nudge?.title || "",
      nudge?.message || "",
      nudge?.recommendation
        ?.recommended_weight || "",
      nudge?.recommendation
        ?.recommended_reps || "",
      audioMode,
      voicePreference,
    ].join("|");

    if (
      lastSpokenRef.current ===
      speakKey
    ) {
      return;
    }

    const targetSpeech =
      nudge?.recommendation
        ? `Next set, ${
            nudge.recommendation
              .recommended_weight ||
            "the same weight"
          } pounds for ${
            nudge.recommendation
              .recommended_reps ||
            "the target"
          } reps.`
        : "";

    const fullText = [
      nudge?.title,
      nudge?.message,
      targetSpeech,
    ]
      .filter(Boolean)
      .join(". ");

    speakCoachText({
      text: fullText,
      audioMode,
      voicePreference,
      rate:
        audioMode === "full"
          ? 1
          : 1.03,
      pitch: 1,
      volume: 1,
    });

    lastSpokenRef.current =
      speakKey;
  }, [
    nudge,
    audioMode,
    voicePreference,
  ]);

  if (!nudge) return null;

  const recommendation =
    nudge?.recommendation || null;

  const showActions = Boolean(
    recommendation &&
      (
        onUseRecommendation ||
        onKeepCurrent ||
        onAdjustManually
      )
  );

  return (
    <div
      className={cx(
        "rounded-[2rem] border p-4 shadow-[0_18px_50px_rgba(0,0,0,0.28)]",
        toneMap[nudge?.tone] ||
          toneMap.cyan
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] opacity-75">
            SyncWorks Live Trainer
          </div>

          <h3 className="mt-1 text-2xl font-black text-white">
            {nudge?.title}
          </h3>

          <div className="mt-3 text-base leading-7 text-white/95">
            {nudge?.message}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-200">
            {audioMode === "off"
              ? "Audio Off"
              : `${voicePreference} voice`}
          </div>

          <button
            type="button"
            onClick={onReplay}
            className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-white/10"
          >
            Replay
          </button>
        </div>
      </div>

      <RecommendationTarget
        recommendation={recommendation}
      />

      {showActions ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {onUseRecommendation ? (
            <button
              type="button"
              onClick={() =>
                onUseRecommendation(
                  recommendation
                )
              }
              className="h-12 rounded-2xl border border-emerald-300/30 bg-emerald-300/15 px-3 text-sm font-black text-emerald-100 transition hover:bg-emerald-300/20"
            >
              Use Recommendation
            </button>
          ) : null}

          {onKeepCurrent ? (
            <button
              type="button"
              onClick={() =>
                onKeepCurrent(
                  recommendation
                )
              }
              className="h-12 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/15"
            >
              Keep My Target
            </button>
          ) : null}

          {onAdjustManually ? (
            <button
              type="button"
              onClick={() =>
                onAdjustManually(
                  recommendation
                )
              }
              className="h-12 rounded-2xl border border-white/10 bg-white/[0.05] px-3 text-sm font-black text-slate-200 transition hover:bg-white/[0.09]"
            >
              Adjust Manually
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
