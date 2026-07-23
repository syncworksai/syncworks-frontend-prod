// src/components/customer-health/CoachVoiceSettingsCard.jsx
import React from "react";
import {
  AUDIO_MODE_PROFILES,
  normalizeWorkoutAudioMode,
} from "./healthPremiumAudio";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function ChoiceButton({
  active,
  label,
  detail,
  onClick,
  tone = "cyan",
}) {
  const toneMap = {
    cyan: active
      ? "border-cyan-300/35 bg-cyan-300/15 text-cyan-100"
      : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]",
    emerald: active
      ? "border-emerald-300/35 bg-emerald-300/15 text-emerald-100"
      : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]",
    purple: active
      ? "border-fuchsia-300/35 bg-fuchsia-300/15 text-fuchsia-100"
      : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-2xl border px-3 py-3 text-left transition active:scale-[0.98]",
        toneMap[tone] || toneMap.cyan
      )}
    >
      <div className="text-xs font-black uppercase tracking-[0.12em]">
        {label}
      </div>
      {detail ? (
        <div className="mt-1 text-[10px] normal-case leading-4 opacity-75">
          {detail}
        </div>
      ) : null}
    </button>
  );
}

export default function CoachVoiceSettingsCard({
  audioMode = "basic",
  voicePreference = "australian_female",
  onChange,
}) {
  const normalizedMode = normalizeWorkoutAudioMode(audioMode);
  const currentProfile =
    AUDIO_MODE_PROFILES[normalizedMode] ||
    AUDIO_MODE_PROFILES.basic;

  return (
    <div className="rounded-[2rem] border border-fuchsia-300/15 bg-[linear-gradient(135deg,rgba(139,92,246,0.10),rgba(34,211,238,0.06),rgba(57,255,136,0.08))] p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-200">
            Premium Audio Coach
          </div>
          <div className="mt-1 text-lg font-black text-white">
            Choose how SYNC coaches the workout
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-400">
            Browser voices are the fallback. Premium provider playback remains dependent on the connected voice service.
          </div>
        </div>

        <div className="mt-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300 sm:mt-0">
          {currentProfile.label}
        </div>
      </div>

      <div className="mt-4">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
          Audio mode
        </div>

        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <ChoiceButton
            label="Off"
            detail="Mute all coach cues."
            active={normalizedMode === "off"}
            tone="cyan"
            onClick={() => onChange?.({ audioMode: "off" })}
          />
          <ChoiceButton
            label="Basic Audio"
            detail="Short cues that work alongside music."
            active={normalizedMode === "basic"}
            tone="emerald"
            onClick={() => onChange?.({ audioMode: "basic" })}
          />
          <ChoiceButton
            label="Full Trainer"
            detail="Detailed setup, form, muscle, and effort coaching."
            active={normalizedMode === "trainer"}
            tone="purple"
            onClick={() => onChange?.({ audioMode: "trainer" })}
          />
        </div>

        <div className="mt-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] leading-5 text-slate-300">
          {currentProfile.description}
        </div>

        {normalizedMode === "trainer" ? (
          <div className="mt-2 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-[11px] font-bold leading-5 text-amber-100">
            Full Trainer is focus-first. Important coaching may interrupt lower-priority cues. It cannot directly lower audio from another app in a normal browser.
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
          Voice preference
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            ["australian_female", "Australian Female", "emerald"],
            ["australian_male", "Australian Male", "cyan"],
            ["female", "American Female", "emerald"],
            ["male", "American Male", "purple"],
            ["auto", "Device Best Match", "cyan"],
          ].map(([value, label, tone]) => (
            <ChoiceButton
              key={value}
              label={label}
              active={voicePreference === value}
              tone={tone}
              onClick={() =>
                onChange?.({ voicePreference: value })
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
