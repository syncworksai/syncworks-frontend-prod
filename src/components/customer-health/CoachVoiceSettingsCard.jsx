// src/components/customer-health/CoachVoiceSettingsCard.jsx
import React from "react";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function ChoiceButton({ active, label, onClick, tone = "cyan" }) {
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
        "rounded-2xl border px-3 py-2 text-xs font-black uppercase tracking-[0.14em] transition active:scale-[0.98]",
        toneMap[tone] || toneMap.cyan
      )}
    >
      {label}
    </button>
  );
}

export default function CoachVoiceSettingsCard({
  audioMode = "essential",
  voicePreference = "female",
  onChange,
}) {
  return (
    <div className="rounded-[2rem] border border-fuchsia-300/15 bg-[linear-gradient(135deg,rgba(139,92,246,0.10),rgba(34,211,238,0.06),rgba(57,255,136,0.08))] p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-200">
            Coach Voice
          </div>
          <div className="mt-1 text-lg font-black text-white">
            Audio + voice preference
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-400">
            Device/browser voices vary. We’ll choose the closest match available.
          </div>
        </div>

        <div className="mt-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300 sm:mt-0">
          Current: {audioMode} / {voicePreference}
        </div>
      </div>

      <div className="mt-4">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
          Audio mode
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <ChoiceButton
            label="Off"
            active={audioMode === "off"}
            tone="cyan"
            onClick={() => onChange?.({ audioMode: "off" })}
          />
          <ChoiceButton
            label="Essential"
            active={audioMode === "essential"}
            tone="emerald"
            onClick={() => onChange?.({ audioMode: "essential" })}
          />
          <ChoiceButton
            label="Full Trainer"
            active={audioMode === "full"}
            tone="purple"
            onClick={() => onChange?.({ audioMode: "full" })}
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
          Voice preference
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <ChoiceButton
            label="Auto"
            active={voicePreference === "auto"}
            tone="cyan"
            onClick={() => onChange?.({ voicePreference: "auto" })}
          />
          <ChoiceButton
            label="Female"
            active={voicePreference === "female"}
            tone="emerald"
            onClick={() => onChange?.({ voicePreference: "female" })}
          />
          <ChoiceButton
            label="Male"
            active={voicePreference === "male"}
            tone="purple"
            onClick={() => onChange?.({ voicePreference: "male" })}
          />
        </div>
      </div>
    </div>
  );
}