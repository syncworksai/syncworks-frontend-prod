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
} from "lucide-react";

import { getHealthAiStatus } from "../../api/customerHealth";
import {
  getActiveWorkoutMode,
  playWorkoutCoachMessage,
  setActiveWorkoutMode,
  stopWorkoutCoachAudio,
  unlockWorkoutCoachAudio,
} from "./healthWorkoutAudioController";

const AI_COACH_CHECKOUT_URL =
  import.meta.env.VITE_HEALTH_AI_CHECKOUT_URL || "";

const safeNumber = (value, fallback = 0) => {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const nameOf = (workout) =>
  workout?.workout_name || workout?.title || workout?.name || "Today's workout";

function totalsFor(workout = {}) {
  const exercises = Array.isArray(workout?.exercises) ? workout.exercises : [];
  return {
    exercises: exercises.length,
    sets: exercises.reduce(
      (total, item) =>
        total + Math.max(1, safeNumber(item?.planned_sets || item?.sets, 1)),
      0
    ),
    duration:
      safeNumber(workout?.duration_minutes || workout?.requested_duration_minutes, 45) || 45,
  };
}

function buildBriefing(workout = {}) {
  const totals = totalsFor(workout);
  const exercises = Array.isArray(workout?.exercises) ? workout.exercises : [];
  const plan = exercises
    .slice(0, 8)
    .map((item, index) => {
      const exerciseName = item?.substitute_name || item?.name || item?.exercise_name || `exercise ${index + 1}`;
      const sets = Math.max(1, safeNumber(item?.planned_sets || item?.sets, 1));
      const reps = item?.planned_reps || item?.reps || "controlled reps";
      return `${index + 1}, ${exerciseName}, ${sets} sets of ${reps}`;
    })
    .join(". ");

  return [
    `${nameOf(workout)} is ready.`,
    `${totals.exercises || "Your"} exercises, ${totals.sets || "your planned"} total sets, about ${totals.duration} minutes.`,
    plan ? `Here's the plan. ${plan}.` : "",
    "When you're ready, start the trainer session. I'll coach sets, rest, effort and progression, then finish with your workout debrief.",
  ]
    .filter(Boolean)
    .join(" ");
}

function OptionCard({ trainer = false, locked = false, loading = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`w-full rounded-[1.65rem] border p-4 text-left active:scale-[0.995] disabled:opacity-70 ${
        trainer
          ? "border-lime-300/40 bg-[radial-gradient(circle_at_top_right,rgba(166,255,0,.13),transparent_40%),linear-gradient(145deg,#07150b,#020805)]"
          : "border-cyan-300/30 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,.11),transparent_40%),linear-gradient(145deg,#07121d,#020711)]"
      }`}
    >
      <div className="flex gap-3">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${trainer ? "border-lime-300/35 bg-lime-300/10 text-lime-200" : "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"}`}>
          {trainer ? <Crown size={23} /> : <ClipboardPenLine size={23} />}
        </span>
        <span className="min-w-0 flex-1">
          <small className={`block text-[9px] font-black uppercase tracking-[.2em] ${trainer ? "text-lime-300" : "text-cyan-300"}`}>
            {trainer ? "Premium" : "Free"}
          </small>
          <span className="mt-1 flex items-center gap-2">
            <b className="text-xl font-black text-white">{trainer ? "Personal Trainer" : "Gym Log"}</b>
            {trainer && locked ? <LockKeyhole size={14} className="text-amber-200" /> : null}
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-400">
            {trainer
              ? "Gemma coaches the complete workout while you still log every set, rep and weight."
              : "Just log the workout. No trainer voice, AI interruptions or premium requirement."}
          </span>
        </span>
      </div>

      <span className="mt-4 grid gap-2 text-[11px] font-bold text-slate-300 sm:grid-cols-2">
        {(trainer
          ? ["Pre-workout briefing", "Live set/rest coaching", "Set + rep logging", "End-of-workout debrief"]
          : ["Sets, reps and weight", "Workout history", "Personal records", "Always available"]
        ).map((feature) => (
          <span key={feature} className="flex items-center gap-2">
            <Check size={13} className={trainer ? "text-lime-300" : "text-cyan-300"} />
            {feature}
          </span>
        ))}
      </span>

      <span className={`mt-4 flex min-h-12 items-center justify-center gap-2 rounded-2xl border text-sm font-black ${trainer ? "border-lime-300/50 bg-lime-300/15 text-lime-100" : "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"}`}>
        {loading ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
        {loading ? "Checking access…" : trainer ? "Start Personal Trainer" : "Start Gym Log"}
      </span>
    </button>
  );
}

export default function WorkoutModeGate({
  workout,
  forcedOpen = false,
  activeWorkoutFallback = false,
  onCancel,
  onBegin,
  onDismissFallback,
}) {
  const [stage, setStage] = useState("choose");
  const [aiStatus, setAiStatus] = useState(null);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  const totals = useMemo(() => totalsFor(workout), [workout]);
  const open = forcedOpen || activeWorkoutFallback;
  const hasAccess = Boolean(aiStatus?.has_ai_access);

  useEffect(() => {
    if (!open) {
      setStage("choose");
      setMessage("");
      return undefined;
    }

    setChecking(true);
    getHealthAiStatus()
      .then((data) => setAiStatus(data || {}))
      .catch(() => {
        setAiStatus(null);
        setMessage("Trainer access could not be verified. Gym Log is still available.");
      })
      .finally(() => setChecking(false));
  }, [open]);

  if (!open) return null;

  const fallbackAlreadyOpen = activeWorkoutFallback && !forcedOpen;

  function finishFallback(mode) {
    if (!fallbackAlreadyOpen) return false;
    setActiveWorkoutMode(mode);
    onDismissFallback?.();
    return true;
  }

  function startLog() {
    stopWorkoutCoachAudio({ clearPlayed: true });
    setActiveWorkoutMode("gym_log");
    if (finishFallback("gym_log")) return;
    onBegin?.({
      workout_mode: "gym_log",
      launch_mode: "gym_log",
      coach_audio_mode: "off",
      launch_started_at: new Date().toISOString(),
    });
  }

  function openTrainerBriefing() {
    if (!hasAccess) {
      if (AI_COACH_CHECKOUT_URL) {
        window.location.assign(AI_COACH_CHECKOUT_URL);
      } else {
        setMessage("Personal Trainer is part of Fitness + Nutrition AI. Gym Log remains free.");
      }
      return;
    }

    setStage("briefing");
    setActiveWorkoutMode("trainer");
    unlockWorkoutCoachAudio();
    stopWorkoutCoachAudio({ clearPlayed: true });
    playWorkoutCoachMessage({
      id: `${workout?.id || workout?.workout_id || nameOf(workout)}:trainer-preworkout`,
      text: buildBriefing(workout),
      priority: "high",
      playOnce: false,
      replace: true,
      audioMode: "trainer",
      provider: "elevenlabs",
      browserFallback: false,
      energy: "high_energy",
      eventType: "preworkout_briefing",
    });
  }

  function beginTrainer() {
    setActiveWorkoutMode("trainer");
    if (finishFallback("trainer")) return;
    onBegin?.({
      workout_mode: "trainer",
      launch_mode: "personal_trainer",
      coach_audio_mode: "trainer",
      launch_briefing_completed_at: new Date().toISOString(),
      launch_started_at: new Date().toISOString(),
    });
  }

  function back() {
    stopWorkoutCoachAudio();
    if (stage === "briefing") {
      setStage("choose");
      setActiveWorkoutMode("");
      return;
    }
    if (fallbackAlreadyOpen) {
      onDismissFallback?.();
      return;
    }
    onCancel?.();
  }

  return (
    <div className="fixed inset-0 z-[2147483640] overflow-y-auto bg-[radial-gradient(circle_at_50%_-10%,rgba(34,211,238,.13),transparent_30%),linear-gradient(180deg,#04101d,#020617_45%,#01040b)] text-white">
      <div className="mx-auto min-h-[100dvh] w-full max-w-2xl px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+.75rem)]">
        <header className="flex items-center gap-3 border-b border-white/10 pb-4">
          <button type="button" onClick={back} className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/[.06]">
            <ArrowLeft size={19} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-black uppercase tracking-[.22em] text-cyan-300">
              {stage === "briefing" ? "Personal Trainer Briefing" : "Choose workout mode"}
            </div>
            <h2 className="mt-1 truncate text-xl font-black">{nameOf(workout)}</h2>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-[9px] font-black uppercase text-slate-300">
            {totals.duration} min
          </span>
        </header>

        {stage === "briefing" ? (
          <main className="py-5">
            <section className="rounded-[1.8rem] border border-lime-300/35 bg-[radial-gradient(circle_at_top_right,rgba(166,255,0,.12),transparent_40%),linear-gradient(145deg,#07150b,#020805)] p-5">
              <div className="flex gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-lime-300/35 bg-lime-300/10 text-lime-200"><Mic2 size={24} /></span>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[.2em] text-lime-300">Gemma · SYNC Personal Trainer</div>
                  <h3 className="mt-1 text-2xl font-black">Know the plan. Then start.</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">Gemma will coach the workout while you log sets, reps and weight. The trainer stays on ElevenLabs rather than switching back to the old robot browser voice.</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><small className="text-[8px] uppercase text-slate-500">Exercises</small><b className="mt-1 block text-xl">{totals.exercises || "—"}</b></div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><small className="text-[8px] uppercase text-slate-500">Sets</small><b className="mt-1 block text-xl">{totals.sets || "—"}</b></div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><small className="text-[8px] uppercase text-slate-500">Est.</small><b className="mt-1 block text-xl">{totals.duration}m</b></div>
              </div>

              <button type="button" onClick={beginTrainer} className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-lime-300/55 bg-lime-300/18 text-base font-black text-lime-100">
                <Play size={18} /> Start Trainer Session
              </button>
            </section>
          </main>
        ) : (
          <main className="py-5">
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/[.06] text-cyan-200"><Dumbbell size={20} /></span>
              <div><b className="text-sm">How do you want to train?</b><p className="mt-1 text-xs text-slate-400">Choose coaching or simple workout logging.</p></div>
            </div>
            <div className="space-y-3">
              <OptionCard trainer locked={!hasAccess} loading={checking} onClick={openTrainerBriefing} />
              <OptionCard onClick={startLog} />
            </div>
            {message ? <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/[.06] p-3 text-xs leading-5 text-amber-100">{message}</div> : null}
          </main>
        )}
      </div>
    </div>
  );
}

export function useWorkoutModeFallbackGate(enabled = true) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled || typeof document === "undefined") return undefined;

    const check = () => {
      const activeWorkout = document.querySelector(".health-active-workout-root");
      if (activeWorkout && !getActiveWorkoutMode()) {
        setOpen(true);
      }
    };

    check();
    const timer = window.setInterval(check, 120);
    return () => window.clearInterval(timer);
  }, [enabled]);

  return [open, () => setOpen(false)];
}
