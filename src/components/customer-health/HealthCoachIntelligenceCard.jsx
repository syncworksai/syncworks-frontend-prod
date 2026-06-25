// src/components/customer-health/HealthCoachIntelligenceCard.jsx
import React, { useMemo } from "react";

import { formatSeconds } from "./healthWorkoutSession";
import { speakCoachText } from "./healthCoachVoice";
import {
  buildCoachIntelligence,
  buildCoachIntelligenceSpeech,
} from "./healthCoachIntelligence";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Stat({ label, value, tone = "cyan" }) {
  const tones = {
    cyan: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
    emerald:
      "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
    amber:
      "border-amber-300/20 bg-amber-300/10 text-amber-100",
    fuchsia:
      "border-fuchsia-300/20 bg-fuchsia-300/10 text-fuchsia-100",
    rose: "border-rose-300/20 bg-rose-300/10 text-rose-100",
  };

  return (
    <div
      className={cx(
        "rounded-2xl border px-3 py-3",
        tones[tone] || tones.cyan
      )}
    >
      <div className="text-[9px] font-black uppercase tracking-[0.15em] opacity-75">
        {label}
      </div>
      <div className="mt-1 text-lg font-black">{value}</div>
    </div>
  );
}

function BalanceBar({ label, value, maximum, tone }) {
  const widths =
    maximum > 0 ? Math.max(4, Math.round((value / maximum) * 100)) : 0;

  const tones = {
    cyan: "from-cyan-400 to-blue-500",
    fuchsia: "from-fuchsia-400 to-violet-500",
    emerald: "from-emerald-400 to-lime-400",
    amber: "from-amber-400 to-orange-500",
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-black text-slate-300">{label}</span>
        <span className="font-black text-white">{value} sets</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-900">
        <div
          className={cx(
            "h-full rounded-full bg-gradient-to-r",
            tones[tone] || tones.cyan
          )}
          style={{ width: `${widths}%` }}
        />
      </div>
    </div>
  );
}

export default function HealthCoachIntelligenceCard({
  history,
  snapshot,
  onOpen,
}) {
  const intelligence = useMemo(
    () =>
      buildCoachIntelligence({
        history,
        days: 7,
      }),
    [history]
  );

  const maximumBalance = Math.max(
    1,
    intelligence.balance.push,
    intelligence.balance.pull,
    intelligence.balance.legs,
    intelligence.balance.core
  );

  const audioMode =
    snapshot?.coach_audio_mode ||
    (snapshot?.audible_trainer_enabled ? "essential" : "off");

  const voicePreference =
    snapshot?.coach_voice_preference || "female";

  const recoveryTone =
    intelligence.recovery?.tone === "rose"
      ? "border-rose-300/25 bg-rose-300/10"
      : intelligence.recovery?.tone === "amber"
      ? "border-amber-300/25 bg-amber-300/10"
      : "border-emerald-300/25 bg-emerald-300/10";

  function playBriefing() {
    speakCoachText({
      text: buildCoachIntelligenceSpeech(intelligence),
      audioMode: audioMode === "off" ? "essential" : audioMode,
      voicePreference,
      rate: 0.98,
      pitch: 1,
      volume: 1,
    });
  }

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-fuchsia-300/20 bg-[radial-gradient(circle_at_top_right,rgba(255,59,212,0.11),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(52,223,255,0.09),transparent_32%),rgba(255,255,255,0.025)] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
      <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-fuchsia-400/10 blur-3xl" />

      <div className="relative">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-200">
              Coach Intelligence Â· Last 7 Days
            </div>
            <h3 className="mt-1 text-xl font-black text-white">
              Training balance and recovery
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              The coach reads working sets, added volume, effort,
              pain, form, timing, and training balance.
            </p>
          </div>

          <button
            type="button"
            onClick={playBriefing}
            className="h-11 shrink-0 rounded-2xl border border-fuchsia-300/25 bg-fuchsia-300/10 px-4 text-sm font-black text-fuchsia-100"
          >
            Hear Coach Briefing
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Stat
            label="Workouts"
            value={intelligence.sessions}
            tone="cyan"
          />
          <Stat
            label="Working Sets"
            value={intelligence.working_sets}
            tone="emerald"
          />
          <Stat
            label="Extra Sets"
            value={intelligence.extra_sets}
            tone="amber"
          />
          <Stat
            label="Average RPE"
            value={
              intelligence.average_rpe
                ? intelligence.average_rpe
                : "â€”"
            }
            tone="fuchsia"
          />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Working-set balance
            </div>

            <div className="mt-4 space-y-4">
              <BalanceBar
                label="Push"
                value={intelligence.balance.push}
                maximum={maximumBalance}
                tone="fuchsia"
              />
              <BalanceBar
                label="Pull"
                value={intelligence.balance.pull}
                maximum={maximumBalance}
                tone="cyan"
              />
              <BalanceBar
                label="Legs"
                value={intelligence.balance.legs}
                maximum={maximumBalance}
                tone="emerald"
              />
              <BalanceBar
                label="Core"
                value={intelligence.balance.core}
                maximum={maximumBalance}
                tone="amber"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div
              className={cx(
                "rounded-3xl border p-4",
                recoveryTone
              )}
            >
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/70">
                Recovery Status Â·{" "}
                {intelligence.recovery.level}
              </div>
              <div className="mt-2 text-lg font-black text-white">
                {intelligence.recovery.title}
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-200">
                {intelligence.recovery.message}
              </div>
            </div>

            <div className="rounded-3xl border border-cyan-300/20 bg-cyan-300/[0.07] p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
                Train Next
              </div>
              <div className="mt-2 text-xl font-black text-white">
                {intelligence.next_focus.focus}
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-400">
                {intelligence.next_focus.reason}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat
            label="Active Time"
            value={formatSeconds(intelligence.active_seconds)}
            tone="emerald"
          />
          <Stat
            label="Rest Time"
            value={formatSeconds(intelligence.rest_seconds)}
            tone="amber"
          />
          <Stat
            label="Pain Flags"
            value={intelligence.pain_flags}
            tone={
              intelligence.pain_flags ? "rose" : "emerald"
            }
          />
          <Stat
            label="Swaps / Adds"
            value={`${intelligence.swaps} / ${intelligence.added_exercises}`}
            tone="cyan"
          />
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => onOpen?.("history")}
            className="h-11 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 text-sm font-black text-cyan-100"
          >
            Open Workout History
          </button>
          <button
            type="button"
            onClick={() => onOpen?.("coach-chat")}
            className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-white"
          >
            Adjust Plan With Coach
          </button>
        </div>
      </div>
    </section>
  );
}
