// src/components/customer-health/TrainerNudgeCard.jsx
import React, { useEffect, useRef } from "react";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

const toneMap = {
  cyan: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
  emerald: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
  amber: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  rose: "border-rose-300/25 bg-rose-300/10 text-rose-100",
  slate: "border-white/10 bg-white/[0.04] text-slate-200",
};

function speakText(text) {
  if (typeof window === "undefined") return false;
  if (!("speechSynthesis" in window)) return false;

  try {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 0.75;

    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

export default function TrainerNudgeCard({
  nudge,
  audibleEnabled,
  onToggleAudible,
}) {
  const lastSpokenRef = useRef("");
  const lastSpokenAtRef = useRef(0);

  useEffect(() => {
    if (!audibleEnabled || !nudge?.speak || !nudge?.message) return;

    const now = Date.now();
    const sameMessage = lastSpokenRef.current === nudge.message;
    const tooSoon = now - lastSpokenAtRef.current < 45000;

    if (sameMessage && tooSoon) return;

    const didSpeak = speakText(nudge.message);

    if (didSpeak) {
      lastSpokenRef.current = nudge.message;
      lastSpokenAtRef.current = now;
    }
  }, [audibleEnabled, nudge?.message, nudge?.speak]);

  const tone = nudge?.tone || "cyan";

  return (
    <div
      className={cx(
        "rounded-[1.75rem] border p-4 shadow-[0_10px_34px_rgba(0,0,0,0.18)]",
        toneMap[tone] || toneMap.cyan
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
            Live Trainer
          </div>

          <div className="mt-1 text-lg font-black text-white">
            {nudge?.title || "Coach Ready"}
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleAudible}
          className={cx(
            "shrink-0 rounded-2xl border px-3 py-2 text-xs font-black transition active:scale-[0.98]",
            audibleEnabled
              ? "border-emerald-300/30 bg-emerald-300/15 text-emerald-100"
              : "border-white/10 bg-black/20 text-slate-300"
          )}
        >
          {audibleEnabled ? "🔊 On" : "🔇 Off"}
        </button>
      </div>

      <p className="mt-3 text-sm font-semibold leading-6 text-slate-100">
        {nudge?.message ||
          "Log a set and I’ll adjust the next recommendation."}
      </p>

      <div className="mt-3 text-[11px] leading-5 text-slate-300/80">
        Audible coach uses short browser voice cues. Phone browsers may still
        control how this mixes with music.
      </div>
    </div>
  );
}