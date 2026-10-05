// src/components/customer-health/WorkoutFocusLaunchDrawer.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  ClipboardPenLine,
  Crown,
  Dumbbell,
  LockKeyhole,
  Mic2,
  Play,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { getHealthAiStatus } from "../../api/customerHealth";
import {
  playWorkoutCoachMessage,
  setActiveWorkoutMode,
  stopWorkoutCoachAudio,
  unlockWorkoutCoachAudio,
} from "./healthWorkoutAudioController";

const AI_COACH_CHECKOUT_URL =
  import.meta.env.VITE_HEALTH_AI_CHECKOUT_URL || "";

function safeNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function workoutName(workout) {
  return workout?.workout_name || workout?.title || workout?.name || "Today's workout";
}

function workoutTotals(workout) {
  const exercises = Array.isArray(workout?.exercises) ? workout.exercises : [];
  const sets = exercises.reduce(
    (total, exercise) =>
      total + Math.max(1, safeNumber(exercise?.planned_sets || exercise?.sets, 1)),
    0
  );

  return {
    exercises: exercises.length,
    sets,
    duration:
      safeNumber(
        workout?.duration_minutes || workout?.requested_duration_minutes,
        45
      ) || 45,
  };
}

function exerciseName(exercise, index) {
  return exercise?.substitute_name || exercise?.name || exercise?.exercise_name || `Exercise ${index + 1}`;
}

function exerciseTarget(exercise) {
  const sets = Math.max(1, safeNumber(exercise?.planned_sets || exercise?.sets, 1));
  const reps =
    exercise?.planned_reps || exercise?.reps || exercise?.current_target_reps || "clean reps";
  const weight =
    exercise?.planned_weight || exercise?.weight || exercise?.current_target_weight || "";

  return `${sets} × ${reps}${weight ? ` · ${weight} lb` : ""}`;
}

function buildBriefing(workout) {
  const totals = workoutTotals(workout);
  const exercises = Array.isArray(workout?.exercises) ? workout.exercises : [];
  const location =
    workout?.workout_location_name ||
    workout?.requested_location ||
    "your selected location";
  const focus =
    workout?.adaptive_focus || workout?.requested_focus || workout?.focus || "";
  const exerciseBrief = exercises
    .slice(0, 8)
    .map((exercise, index) => {
      const sets = Math.max(1, safeNumber(exercise?.planned_sets || exercise?.sets, 1));
      const reps = exercise?.planned_reps || exercise?.reps || "controlled reps";
      return `${index + 1}, ${exerciseName(exercise, index)}, ${sets} sets of ${reps}`;
    })
    .join(". ");

  return [
    `${workoutName(workout)} is ready.`,
    `${totals.exercises} exercises, ${totals.sets} total sets, about ${totals.duration} minutes.`,
    focus ? `Today's focus is ${focus}.` : "",
    location ? `We're training at ${location}.` : "",
    exerciseBrief ? `Here's the plan. ${exerciseBrief}.` : "",
    "When you're ready, start the trainer session. I'll coach the work, rest, progression, and finish with a workout debrief.",
  ]
    .filter(Boolean)
    .join(" ");
}

function ModeCard({
  icon: Icon,
  eyebrow,
  title,
  copy,
  features,
  tone,
  badge,
  disabled,
  loading,
  onClick,
}) {
  const trainer = tone === "trainer";

  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className={`w-full rounded-[1.7rem] border p-4 text-left transition active:scale-[0.995] disabled:cursor-not-allowed disabled:opacity-70 ${
        trainer
          ? "border-lime-300/35 bg-[radial-gradient(circle_at_top_right,rgba(166,255,0,.12),transparent_38%),linear-gradient(145deg,#07150b,#020805)] shadow-[0_0_32px_rgba(166,255,0,.08)]"
          : "border-cyan-300/25 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,.10),transparent_38%),linear-gradient(145deg,#07121d,#020711)]"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${
            trainer
              ? "border-lime-300/35 bg-lime-300/10 text-lime-200"
              : "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
          }`}
        >
          <Icon size={23} />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block text-[9px] font-black uppercase tracking-[.2em] ${
              trainer ? "text-lime-300" : "text-cyan-300"
            }`}
          >
            {eyebrow}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-2">
            <strong className="text-xl font-black text-white">{title}</strong>
            {badge ? (
              <em className="rounded-full border border-white/10 bg-white/[.05] px-2 py-1 text-[8px] font-black not-italic uppercase tracking-[.12em] text-slate-300">
                {badge}
              </em>
            ) : null}
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-400">{copy}</span>
        </span>
      </div>

      <span className="mt-4 grid gap-2 sm:grid-cols-2">
        {features.map((feature) => (
          <span key={feature} className="flex items-center gap-2 text-[11px] font-bold text-slate-300">
            <Check size={13} className={trainer ? "text-lime-300" : "text-cyan-300"} />
            {feature}
          </span>
        ))}
      </span>

      <span
        className={`mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border text-sm font-black ${
          trainer
            ? "border-lime-300/45 bg-lime-300/15 text-lime-100"
            : "border-cyan-300/35 bg-cyan-300/10 text-cyan-100"
        }`}
      >
        {loading ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
        {loading ? "Checking access…" : trainer ? "Open Trainer Briefing" : "Start Gym Log"}
      </span>
    </button>
  );
}

export default function WorkoutFocusLaunchDrawer({
  open,
  workout,
  onCancel,
  onBegin,
}) {
  const [aiStatus, setAiStatus] = useState(null);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [stage, setStage] = useState("choose");
  const [briefingPlayed, setBriefingPlayed] = useState(false);

  const totals = useMemo(() => workoutTotals(workout), [workout]);
  const exercises = Array.isArray(workout?.exercises) ? workout.exercises : [];
  const hasTrainerAccess = Boolean(aiStatus?.has_ai_access);

  useEffect(() => {
    if (!open) {
      setStage("choose");
      setBriefingPlayed(false);
      setAccessError("");
      stopWorkoutCoachAudio();
      return undefined;
    }

    setActiveWorkoutMode("");
    setAccessLoading(true);
    setAccessError("");

    let cancelled = false;
    getHealthAiStatus()
      .then((data) => {
        if (!cancelled) setAiStatus(data || {});
      })
      .catch(() => {
        if (!cancelled) {
          setAiStatus(null);
          setAccessError("Trainer access could not be verified. Gym Log is still available.");
        }
      })
      .finally(() => {
        if (!cancelled) setAccessLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  function cancelLaunch() {
    stopWorkoutCoachAudio();
    setActiveWorkoutMode("");
    onCancel?.();
  }

  function startGymLog() {
    stopWorkoutCoachAudio({ clearPlayed: true });
    setActiveWorkoutMode("gym_log");
    onBegin?.({
      workout_mode: "gym_log",
      launch_mode: "gym_log",
      coach_audio_mode: "off",
      launch_started_at: new Date().toISOString(),
    });
  }

  function playTrainerBriefing() {
    if (!hasTrainerAccess) {
      if (AI_COACH_CHECKOUT_URL) {
        window.location.assign(AI_COACH_CHECKOUT_URL);
      } else {
        setAccessError(
          "Personal Trainer is part of Fitness + Nutrition AI. Premium checkout is not configured on this client yet."
        );
      }
      return;
    }

    setStage("briefing");
    setActiveWorkoutMode("trainer");
    unlockWorkoutCoachAudio();
    stopWorkoutCoachAudio({ clearPlayed: true });

    playWorkoutCoachMessage({
      id: `${workout?.id || workout?.workout_id || workoutName(workout)}:trainer-preworkout`,
      text: buildBriefing(workout),
      priority: "high",
      playOnce: false,
      replace: true,
      audioMode: "trainer",
      voicePreference: "australian female",
      provider: "elevenlabs",
      browserFallback: false,
      energy: "high_energy",
      eventType: "preworkout_briefing",
    });
    setBriefingPlayed(true);
  }

  function beginTrainer() {
    setActiveWorkoutMode("trainer");
    onBegin?.({
      workout_mode: "trainer",
      launch_mode: "personal_trainer",
      coach_audio_mode: "trainer",
      launch_briefing_completed_at: new Date().toISOString(),
      launch_started_at: new Date().toISOString(),
    });
  }

  if (!workout || totals.exercises === 0) {
    return (
      <div className="fixed inset-0 z-[2147483000] grid place-items-center bg-[#020617] px-6 text-white">
        <div className="w-full max-w-sm rounded-3xl border border-cyan-300/20 bg-[#07101e] p-5 text-center">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">SyncWorks Health</div>
          <div className="mt-2 text-lg font-black">Restoring your workout plan</div>
          <p className="mt-2 text-xs leading-5 text-slate-400">Your workout details are still loading. Nothing has been discarded.</p>
          <button type="button" onClick={cancelLaunch} className="mt-4 h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] text-xs font-black text-white">Back to Health</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[radial-gradient(circle_at_50%_-10%,rgba(34,211,238,.12),transparent_28%),linear-gradient(180deg,#04101d,#020617_45%,#01040b)] text-white">
      <div className="mx-auto min-h-[100dvh] w-full max-w-3xl px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+.75rem)] sm:px-6">
        <header className="flex items-center gap-3 border-b border-white/10 pb-4">
          <button
            type="button"
            onClick={stage === "briefing" ? () => { stopWorkoutCoachAudio(); setActiveWorkoutMode(""); setStage("choose"); } : cancelLaunch}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/[.06] text-white"
            aria-label="Back"
          >
            <ArrowLeft size={19} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-black uppercase tracking-[.22em] text-cyan-300">
              {stage === "briefing" ? "Personal Trainer Briefing" : "Choose workout experience"}
            </div>
            <h2 className="mt-1 truncate text-xl font-black text-white sm:text-2xl">{workoutName(workout)}</h2>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-[9px] font-black uppercase tracking-[.12em] text-slate-300">
            {totals.duration} min
          </div>
        </header>

        {stage === "briefing" ? (
          <main className="py-5">
            <section className="rounded-[1.8rem] border border-lime-300/30 bg-[radial-gradient(circle_at_top_right,rgba(166,255,0,.11),transparent_40%),linear-gradient(145deg,#07150b,#020805)] p-5 shadow-[0_0_42px_rgba(166,255,0,.08)]">
              <div className="flex items-start gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-lime-300/35 bg-lime-300/10 text-lime-200"><Mic2 size={24} /></span>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[.2em] text-lime-300">Gemma · SYNC Personal Trainer</div>
                  <h3 className="mt-1 text-2xl font-black text-white">Know the plan. Then start the clock.</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">Your workout timer does not start until you tap <b className="text-white">Start Trainer Session</b>. Gemma will coach sets, rest, effort and progression, then close with a workout debrief.</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center"><small className="text-[8px] font-black uppercase text-slate-500">Exercises</small><b className="mt-1 block text-xl text-white">{totals.exercises}</b></div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center"><small className="text-[8px] font-black uppercase text-slate-500">Sets</small><b className="mt-1 block text-xl text-white">{totals.sets}</b></div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center"><small className="text-[8px] font-black uppercase text-slate-500">Est.</small><b className="mt-1 block text-xl text-white">{totals.duration}m</b></div>
              </div>

              <div className="mt-4 space-y-2">
                {exercises.map((exercise, index) => (
                  <div key={exercise?.id || `${exerciseName(exercise, index)}-${index}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/[.06] text-[10px] font-black text-cyan-200">{String(index + 1).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1"><b className="block truncate text-sm text-white">{exerciseName(exercise, index)}</b><small className="mt-1 block text-[10px] text-slate-500">{exerciseTarget(exercise)}</small></span>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={playTrainerBriefing} className="min-h-12 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 text-sm font-black text-cyan-100">
                  <span className="inline-flex items-center gap-2"><RefreshCw size={16} /> {briefingPlayed ? "Replay Briefing" : "Play Briefing"}</span>
                </button>
                <button type="button" onClick={beginTrainer} className="min-h-12 rounded-2xl border border-lime-300/50 bg-lime-300/15 px-4 text-sm font-black text-lime-100 shadow-[0_0_28px_rgba(166,255,0,.10)]">
                  <span className="inline-flex items-center gap-2"><Play size={16} /> Start Trainer Session</span>
                </button>
              </div>
              <p className="mt-3 text-center text-[10px] leading-4 text-slate-500">Trainer Mode uses the connected ElevenLabs coach voice. It will not silently switch to the old browser robot voice.</p>
            </section>
          </main>
        ) : (
          <main className="py-5">
            <section className="mb-4 rounded-[1.6rem] border border-white/10 bg-white/[.025] p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/[.06] text-cyan-200"><Dumbbell size={20} /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-white">Today's workout is ready</div>
                  <div className="mt-1 text-xs text-slate-400">{totals.exercises} exercises · {totals.sets} sets · ~{totals.duration} minutes</div>
                </div>
              </div>
            </section>

            <div className="space-y-3">
              <ModeCard
                icon={Crown}
                eyebrow="Premium"
                title="Personal Trainer"
                badge={hasTrainerAccess ? "Unlocked" : "Paid"}
                tone="trainer"
                loading={accessLoading}
                copy="A focused full-screen session with Gemma coaching the entire workout instead of making you read a dashboard between sets."
                features={[
                  "Pre-workout briefing before the timer starts",
                  "ElevenLabs voice through sets, rest and transitions",
                  "Set, rep and weight logging stays in the session",
                  "End-of-workout debrief and next-session guidance",
                ]}
                onClick={playTrainerBriefing}
              />

              <ModeCard
                icon={ClipboardPenLine}
                eyebrow="Free"
                title="Gym Log"
                badge="Always available"
                tone="log"
                copy="Just train and record the workout. No trainer voice, no AI interruptions, and no premium requirement."
                features={[
                  "Log sets, reps, weight and effort",
                  "Use the same saved workout and exercise history",
                  "Track progress and personal records",
                  "Finish the workout and return to Health",
                ]}
                onClick={startGymLog}
              />
            </div>

            {!accessLoading && !hasTrainerAccess ? (
              <section className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/[.06] p-4">
                <div className="flex items-start gap-3">
                  <LockKeyhole size={18} className="mt-0.5 shrink-0 text-amber-200" />
                  <div className="min-w-0">
                    <div className="text-sm font-black text-white">Personal Trainer is a premium Health feature</div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">Gym Log remains free. Premium adds the live trainer voice, AI coaching and conversational Health guidance.</p>
                  </div>
                </div>
              </section>
            ) : null}

            {accessError ? (
              <div className="mt-3 rounded-2xl border border-rose-300/20 bg-rose-300/[.06] p-3 text-xs leading-5 text-rose-100">{accessError}</div>
            ) : null}

            <section className="mt-5 rounded-[1.6rem] border border-white/10 bg-white/[.025] p-4">
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.18em] text-cyan-300"><Sparkles size={14} /> Planned exercises</div>
              <div className="mt-3 space-y-2">
                {exercises.slice(0, 8).map((exercise, index) => (
                  <div key={exercise?.id || `${exerciseName(exercise, index)}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/20 px-3 py-2.5">
                    <span className="min-w-0 truncate text-xs font-black text-slate-200">{index + 1}. {exerciseName(exercise, index)}</span>
                    <span className="shrink-0 text-[10px] text-slate-500">{exerciseTarget(exercise)}</span>
                  </div>
                ))}
              </div>
            </section>
          </main>
        )}
      </div>
    </div>
  );
}
