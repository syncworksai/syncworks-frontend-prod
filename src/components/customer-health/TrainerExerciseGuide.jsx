// src/components/customer-health/TrainerExerciseGuide.jsx
import React, { useMemo, useState } from "react";
import {
  buildYouTubeSearchUrl,
  getExerciseGuide,
} from "./healthExerciseKnowledge";
import { explainFailure } from "./healthTrainerLogic";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Chip({ children }) {
  return (
    <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-cyan-100">
      {children}
    </span>
  );
}

function GuideSection({ title, items }) {
  if (!items?.length) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
        {title}
      </div>

      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="text-sm leading-6 text-slate-300">
            • {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function TrainerExerciseGuide({ exerciseName }) {
  const [expanded, setExpanded] = useState(false);

  const guide = useMemo(() => getExerciseGuide(exerciseName), [exerciseName]);
  const failure = explainFailure();
  const youtubeUrl = buildYouTubeSearchUrl(exerciseName);

  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
            Exercise Guide
          </div>

          <div className="mt-1 text-lg font-black text-white">
            {guide.name || exerciseName || "Exercise"}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {(guide.muscles || []).slice(0, 4).map((muscle) => (
              <Chip key={muscle}>{muscle}</Chip>
            ))}
          </div>
        </div>

        <div
          className={cx(
            "shrink-0 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-slate-200",
            expanded && "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
          )}
        >
          {expanded ? "Hide" : "Open"}
        </div>
      </button>

      {expanded ? (
        <div className="mt-4 space-y-3">
          <GuideSection title="What you should feel" items={guide.feel} />
          <GuideSection
            title="Better contraction tricks"
            items={guide.contractionTips}
          />
          <GuideSection title="Common mistakes" items={guide.mistakes} />

          <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-100">
              {failure.title}
            </div>

            <div className="mt-2 text-sm leading-6 text-amber-50/90">
              {guide.failureCue || failure.body}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100">
              Swap ideas
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {(guide.swaps || []).map((swap) => (
                <span
                  key={swap}
                  className="rounded-full border border-emerald-300/20 bg-black/20 px-3 py-1 text-xs font-bold text-emerald-50"
                >
                  {swap}
                </span>
              ))}
            </div>
          </div>

          <a
            href={youtubeUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-red-300/25 bg-red-300/10 px-4 text-sm font-black text-red-100 transition hover:bg-red-300/20 active:scale-[0.99] sm:w-auto"
          >
            ▶ Search YouTube Demo
          </a>
        </div>
      ) : null}
    </div>
  );
}