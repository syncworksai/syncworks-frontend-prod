// src/components/customer-health/TrainerNudgeCard.jsx
import React, { useEffect, useRef } from "react";
import { speakCoachText } from "./healthCoachVoice";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function TrainerNudgeCard({
  nudge,
  audioMode = "off",
  voicePreference = "auto",
  onReplay,
}) {
  const lastSpokenRef = useRef("");

  const toneMap = {
    cyan: "border-cyan-300/20 bg-cyan-300/10 text-cyan-50",
    emerald: "border-emerald-300/20 bg-emerald-300/10 text-emerald-50",
    amber: "border-amber-300/20 bg-amber-300/10 text-amber-50",
    rose: "border-rose-300/20 bg-rose-300/10 text-rose-50",
    slate: "border-white/10 bg-white/[0.04] text-slate-100",
  };

  useEffect(() => {
    if (!nudge?.speak || audioMode === "off") return;

    const speakKey = `${nudge?.title || ""}|${nudge?.message || ""}|${audioMode}|${voicePreference}`;
    if (lastSpokenRef.current === speakKey) return;

    const fullText = [nudge?.title, nudge?.message].filter(Boolean).join(". ");

    speakCoachText({
      text: fullText,
      audioMode,
      voicePreference,
      rate: audioMode === "full" ? 1 : 1.03,
      pitch: 1,
      volume: 1,
    });

    lastSpokenRef.current = speakKey;
  }, [nudge, audioMode, voicePreference]);

  if (!nudge) return null;

  return (
    <div
      className={cx(
        "rounded-[2rem] border p-4 shadow-[0_18px_50px_rgba(0,0,0,0.28)]",
        toneMap[nudge?.tone] || toneMap.cyan
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] opacity-75">
            Live Trainer
          </div>

          <h3 className="mt-1 text-2xl font-black text-white">{nudge?.title}</h3>

          <div className="mt-3 text-base leading-8 text-white/95">
            {nudge?.message}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-200">
            {audioMode === "off" ? "Audio Off" : `${voicePreference} voice`}
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
    </div>
  );
}