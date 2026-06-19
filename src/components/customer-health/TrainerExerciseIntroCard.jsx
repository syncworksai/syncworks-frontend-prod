// src/components/customer-health/TrainerExerciseIntroCard.jsx
import React, { useMemo, useState } from "react";
import { getExerciseKnowledge } from "./healthExerciseKnowledge";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function InfoPill({ children, tone = "green" }) {
  const toneMap = {
    green: "border-lime-300/30 bg-lime-300/10 text-lime-100",
    cyan: "border-cyan-300/30 bg-cyan-300/10 text-cyan-100",
    purple: "border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-100",
    slate: "border-white/10 bg-white/[0.04] text-slate-300",
  };

  return (
    <div
      className={cx(
        "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]",
        toneMap[tone] || toneMap.green
      )}
    >
      {children}
    </div>
  );
}

function StepCard({ number, title, cue }) {
  return (
    <div className="rounded-3xl border border-cyan-300/15 bg-[#071425] p-3">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-lime-300/30 bg-lime-300/10 text-sm font-black text-lime-100">
          {String(number).padStart(2, "0")}
        </div>
        <div className="text-sm font-black uppercase tracking-[0.12em] text-white">
          {title}
        </div>
      </div>

      <div className="mt-3 text-sm leading-6 text-slate-300">{cue}</div>
    </div>
  );
}

export default function TrainerExerciseIntroCard({
  exerciseName,
  onReplayCue,
  onFindAlternative,
}) {
  const knowledge = useMemo(
    () => getExerciseKnowledge(exerciseName),
    [exerciseName]
  );

  const [heroBroken, setHeroBroken] = useState(false);

  function openDemo() {
    if (!knowledge?.demo_url) return;
    window.open(knowledge.demo_url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-cyan-300/15 bg-[radial-gradient(circle_at_top_left,rgba(57,255,136,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(255,59,212,0.10),transparent_24%),linear-gradient(180deg,#05101d_0%,#040a14_100%)] shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
      <div className="border-b border-white/10 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200">
              Exercise Reminder
            </div>

            <h3 className="mt-1 text-3xl font-black text-white sm:text-4xl">
              {knowledge.name}
            </h3>

            <div className="mt-2 flex flex-wrap gap-2">
              <InfoPill tone="green">{knowledge.training_tag || "Strength"}</InfoPill>
              <InfoPill tone="cyan">{knowledge.category || "Compound"}</InfoPill>
              <InfoPill tone="purple">
                {knowledge.movement_pattern || "Full Body"}
              </InfoPill>
            </div>

            <div className="mt-3 text-sm leading-6 text-slate-300">
              <span className="font-black text-lime-300">Primary muscles:</span>{" "}
              {(knowledge.primary_muscles || []).join(", ") || "Full body"}
            </div>

            <div className="mt-3 rounded-3xl border border-lime-300/20 bg-lime-300/10 p-3 text-sm leading-6 text-lime-50">
              <span className="font-black">Coach cue:</span>{" "}
              {knowledge.short_cue}
            </div>
          </div>

          <div className="shrink-0 rounded-3xl border border-fuchsia-300/15 bg-black/20 p-3 text-xs leading-5 text-slate-400 lg:max-w-[260px]">
            <div className="font-black uppercase tracking-[0.16em] text-fuchsia-200">
              Form warning
            </div>
            <div className="mt-2">
              {knowledge.correction_cue || knowledge.coach_warning}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 px-4 py-4 lg:grid-cols-[1.2fr_0.8fr] lg:px-5">
        <div className="overflow-hidden rounded-[1.75rem] border border-cyan-300/15 bg-[#081525]">
          {!heroBroken && knowledge.hero_image ? (
            <img
              src={knowledge.hero_image}
              alt={knowledge.name}
              onError={() => setHeroBroken(true)}
              className="h-[250px] w-full object-cover sm:h-[320px]"
            />
          ) : (
            <div className="flex h-[250px] items-center justify-center bg-[radial-gradient(circle_at_center,rgba(57,255,136,0.10),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,59,212,0.12),transparent_25%),linear-gradient(135deg,#07111d,#020617)] text-center sm:h-[320px]">
              <div className="px-6">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">
                  Add local image anytime
                </div>
                <div className="mt-3 text-4xl font-black text-white">
                  {knowledge.name}
                </div>
                <div className="mt-3 text-sm leading-6 text-slate-400">
                  Save a hero image at:
                  <div className="mt-2 break-all rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-300">
                    {knowledge.hero_image}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-white/10 px-4 py-3 text-sm text-slate-300">
            <span className="font-black text-cyan-100">Feel it here:</span>{" "}
            {knowledge.feel_cue}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-[1.75rem] border border-lime-300/15 bg-[#071425] p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-lime-300">
              Muscle focus
            </div>
            <div className="mt-3 space-y-2">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.12em] text-white">
                  Primary
                </div>
                <div className="mt-1 text-sm leading-6 text-slate-300">
                  {(knowledge.primary_muscles || []).join(", ")}
                </div>
              </div>

              <div>
                <div className="text-xs font-black uppercase tracking-[0.12em] text-white">
                  Secondary
                </div>
                <div className="mt-1 text-sm leading-6 text-slate-400">
                  {(knowledge.secondary_muscles || []).join(", ")}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-fuchsia-300/15 bg-[#071425] p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-200">
              Pro tip
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-200">
              {knowledge.pro_tip}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-cyan-300/15 bg-[#071425] p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
              Form focus
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(knowledge.form_focus || []).map((item) => (
                <InfoPill key={item} tone="cyan">
                  {item}
                </InfoPill>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 border-t border-white/10 px-4 py-4 sm:grid-cols-3 lg:px-5">
        {(knowledge.steps || []).slice(0, 3).map((step, index) => (
          <StepCard
            key={`${knowledge.name}_${step.title}_${index}`}
            number={index + 1}
            title={step.title}
            cue={step.cue}
          />
        ))}
      </div>

      <div className="border-t border-white/10 px-4 py-4 lg:px-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={onReplayCue}
            className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/20"
          >
            Replay Cue
          </button>

          <button
            type="button"
            onClick={openDemo}
            className="rounded-2xl border border-lime-300/25 bg-lime-300/10 px-4 py-3 text-sm font-black text-lime-100 transition hover:bg-lime-300/20"
          >
            Watch Demo
          </button>

          <button
            type="button"
            onClick={onFindAlternative}
            className="rounded-2xl border border-fuchsia-300/25 bg-fuchsia-300/10 px-4 py-3 text-sm font-black text-fuchsia-100 transition hover:bg-fuchsia-300/20"
          >
            Find Alternative
          </button>
        </div>
      </div>
    </div>
  );
}