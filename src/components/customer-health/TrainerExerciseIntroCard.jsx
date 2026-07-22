// src/components/customer-health/TrainerExerciseIntroCard.jsx
import React, { useMemo, useState } from "react";
import { getExerciseKnowledge } from "./healthExerciseKnowledge";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Pill({ children, tone = "cyan" }) {
  const tones = {
    cyan: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
    lime: "border-lime-300/25 bg-lime-300/10 text-lime-100",
    fuchsia:
      "border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-100",
    slate: "border-white/10 bg-white/[0.04] text-slate-300",
  };

  return (
    <span
      className={cx(
        "inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em]",
        tones[tone] || tones.cyan
      )}
    >
      {children}
    </span>
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
  const [moreOpen, setMoreOpen] = useState(false);

  function openDemo() {
    const curatedUrl = String(
      knowledge?.demo_url || knowledge?.youtube_url || ""
    ).trim();

    const fallbackUrl =
      "https://www.youtube.com/results?search_query=" +
      encodeURIComponent(
        String(knowledge?.name || exerciseName || "exercise") +
          " proper form tutorial"
      );

    window.open(
      curatedUrl || fallbackUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <section className="overflow-hidden rounded-[1.6rem] border border-cyan-300/15 bg-[radial-gradient(circle_at_top_left,rgba(57,255,136,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,59,212,0.10),transparent_28%),linear-gradient(180deg,#07111f_0%,#040812_100%)] shadow-[0_18px_55px_rgba(0,0,0,0.35)]">
      <div className="relative overflow-hidden">
        {!heroBroken && knowledge.hero_image ? (
          <img
            src={knowledge.hero_image}
            alt={knowledge.name}
            onError={() => setHeroBroken(true)}
            className="h-[220px] w-full object-cover sm:h-[300px]"
          />
        ) : (
          <div className="flex h-[220px] items-center justify-center bg-[radial-gradient(circle_at_center,rgba(57,255,136,0.14),transparent_34%),linear-gradient(135deg,#0b1728,#020617)] px-6 text-center sm:h-[300px]">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
                Current movement
              </div>
              <div className="mt-2 text-3xl font-black text-white">
                {knowledge.name}
              </div>
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#020617] via-[#020617]/82 to-transparent px-4 pb-4 pt-14">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-lime-300">
                Movement focus
              </div>
              <h3 className="mt-1 truncate text-2xl font-black text-white sm:text-3xl">
                {knowledge.name}
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Pill tone="lime">
                  {knowledge.training_tag || "Strength"}
                </Pill>
                <Pill tone="cyan">
                  {knowledge.movement_pattern || "Full body"}
                </Pill>
              </div>
            </div>

            <button
              type="button"
              onClick={openDemo}
              className="shrink-0 rounded-2xl border border-lime-300/30 bg-lime-300/15 px-3 py-2 text-[10px] font-black text-lime-100"
            >
              Watch Demo
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-2 p-3 sm:grid-cols-[1fr_auto] sm:p-4">
        <div className="rounded-2xl border border-lime-300/18 bg-lime-300/[0.07] p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-lime-300">
            Coach cue
          </div>
          <div className="mt-1 text-sm font-bold leading-5 text-white">
            {knowledge.short_cue}
          </div>
          <div className="mt-2 text-xs leading-5 text-slate-400">
            <span className="font-black text-cyan-100">
              Feel:
            </span>{" "}
            {knowledge.feel_cue}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-1">
          <button
            type="button"
            onClick={onReplayCue}
            className="rounded-2xl border border-fuchsia-300/25 bg-fuchsia-300/10 px-3 py-2.5 text-[10px] font-black text-fuchsia-100"
          >
            Replay
          </button>
          <button
            type="button"
            onClick={() => setMoreOpen((current) => !current)}
            className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-3 py-2.5 text-[10px] font-black text-cyan-100"
          >
            {moreOpen ? "Hide Info" : "More Info"}
          </button>
          <button
            type="button"
            onClick={onFindAlternative}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[10px] font-black text-slate-200"
          >
            Swap
          </button>
        </div>
      </div>

      {moreOpen ? (
        <div className="grid gap-3 border-t border-white/10 p-3 sm:grid-cols-2 sm:p-4">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-200">
              Muscles
            </div>
            <div className="mt-2 text-sm leading-5 text-slate-300">
              {(knowledge.primary_muscles || []).join(", ") ||
                "Full body"}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-fuchsia-200">
              Form warning
            </div>
            <div className="mt-2 text-sm leading-5 text-slate-300">
              {knowledge.correction_cue ||
                knowledge.coach_warning}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-3 sm:col-span-2">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-lime-300">
              Quick setup
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {(knowledge.steps || [])
                .slice(0, 3)
                .map((step, index) => (
                  <div
                    key={`${knowledge.name}-${step.title}-${index}`}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    <div className="text-[10px] font-black text-white">
                      {index + 1}. {step.title}
                    </div>
                    <div className="mt-1 text-xs leading-5 text-slate-400">
                      {step.cue}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
