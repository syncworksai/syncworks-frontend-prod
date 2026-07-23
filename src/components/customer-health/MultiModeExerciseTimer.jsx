// src/components/customer-health/MultiModeExerciseTimer.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  TIMER_MODE_LABELS,
  buildTimerConfig,
  formatTimerSeconds,
  inferTimerMode,
} from "./healthTimerModes";

const STORAGE_KEY = "syncworks_health_multimode_timer_v1";

function readSaved(exerciseId) {
  if (typeof window === "undefined" || !exerciseId) return null;

  try {
    const all = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return all[exerciseId] || null;
  } catch {
    return null;
  }
}

function persist(exerciseId, value) {
  if (typeof window === "undefined" || !exerciseId) return;

  try {
    const all = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    all[exerciseId] = {
      ...value,
      persisted_at: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Best-effort local persistence.
  }
}

function beep(frequency = 720, duration = 100) {
  if (typeof window === "undefined") return;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.frequency.value = frequency;
    gain.gain.value = 0.06;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration / 1000);
    oscillator.addEventListener("ended", () => context.close());
  } catch {
    // Audio cue is optional.
  }
}

export default function MultiModeExerciseTimer({ exercise }) {
  const exerciseId = String(exercise?.id || exercise?.name || "");
  const inferredMode = inferTimerMode(exercise);
  const saved = useMemo(() => readSaved(exerciseId), [exerciseId]);

  const [mode, setMode] = useState(saved?.mode || inferredMode);
  const baseConfig = useMemo(
    () => buildTimerConfig(exercise, mode),
    [exercise, mode]
  );

  const [phase, setPhase] = useState(saved?.phase || "ready");
  const [running, setRunning] = useState(false);
  const [round, setRound] = useState(saved?.round || 1);
  const [remaining, setRemaining] = useState(
    saved?.remaining ?? baseConfig.work_seconds
  );
  const [workSeconds, setWorkSeconds] = useState(
    saved?.work_seconds ?? baseConfig.work_seconds
  );
  const [restSeconds, setRestSeconds] = useState(
    saved?.rest_seconds ?? baseConfig.rest_seconds
  );
  const [rounds, setRounds] = useState(saved?.rounds ?? baseConfig.rounds);
  const lastExerciseRef = useRef(exerciseId);

  useEffect(() => {
    if (lastExerciseRef.current === exerciseId) return;

    const nextSaved = readSaved(exerciseId);
    const nextMode = nextSaved?.mode || inferTimerMode(exercise);
    const nextConfig = buildTimerConfig(exercise, nextMode);

    setMode(nextMode);
    setPhase(nextSaved?.phase || "ready");
    setRunning(false);
    setRound(nextSaved?.round || 1);
    setWorkSeconds(nextSaved?.work_seconds ?? nextConfig.work_seconds);
    setRestSeconds(nextSaved?.rest_seconds ?? nextConfig.rest_seconds);
    setRounds(nextSaved?.rounds ?? nextConfig.rounds);
    setRemaining(nextSaved?.remaining ?? nextConfig.work_seconds);
    lastExerciseRef.current = exerciseId;
  }, [exercise, exerciseId]);

  useEffect(() => {
    persist(exerciseId, {
      mode,
      phase,
      round,
      remaining,
      work_seconds: workSeconds,
      rest_seconds: restSeconds,
      rounds,
    });
  }, [
    exerciseId,
    mode,
    phase,
    round,
    remaining,
    workSeconds,
    restSeconds,
    rounds,
  ]);

  useEffect(() => {
    if (!running || !baseConfig.timed) return undefined;

    const timer = window.setInterval(() => {
      setRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [running, baseConfig.timed]);

  useEffect(() => {
    if (!running || remaining > 0 || !baseConfig.timed) return;

    beep(phase === "work" ? 520 : 820, 150);

    if (phase === "work" && restSeconds > 0) {
      setPhase("rest");
      setRemaining(restSeconds);
      return;
    }

    if (round >= rounds) {
      setRunning(false);
      setPhase("complete");
      setRemaining(0);
      return;
    }

    setRound((current) => current + 1);
    setPhase("work");
    setRemaining(workSeconds);
  }, [
    baseConfig.timed,
    phase,
    remaining,
    restSeconds,
    round,
    rounds,
    running,
    workSeconds,
  ]);

  function resetForMode(nextMode) {
    const config = buildTimerConfig(exercise, nextMode);

    setMode(nextMode);
    setRunning(false);
    setPhase("ready");
    setRound(1);
    setWorkSeconds(config.work_seconds);
    setRestSeconds(config.rest_seconds);
    setRounds(config.rounds);
    setRemaining(config.work_seconds);
  }

  function startOrPause() {
    if (!baseConfig.timed) return;

    if (phase === "complete") {
      setPhase("work");
      setRound(1);
      setRemaining(workSeconds);
      setRunning(true);
      beep();
      return;
    }

    if (phase === "ready") {
      setPhase("work");
      setRemaining(workSeconds);
      setRunning(true);
      beep();
      return;
    }

    setRunning((current) => !current);
  }

  function reset() {
    setRunning(false);
    setPhase("ready");
    setRound(1);
    setRemaining(workSeconds);
  }

  function skipPhase() {
    if (!baseConfig.timed) return;
    setRemaining(0);
  }

  function adjustRemaining(amount) {
    setRemaining((current) => Math.max(0, current + amount));
  }

  const phaseLabel =
    phase === "work"
      ? "WORK"
      : phase === "rest"
      ? "REST"
      : phase === "complete"
      ? "COMPLETE"
      : "READY";

  return (
    <section className="rounded-[1.5rem] border border-[#39ff88]/20 bg-[radial-gradient(circle_at_top_left,rgba(57,255,136,0.10),transparent_34%),linear-gradient(145deg,#07100b,#030604)] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.30)] sm:rounded-[2rem] sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[#65ff9a]">
            Exercise Timer Mode
          </div>
          <h3 className="mt-1 text-lg font-black text-white">
            {TIMER_MODE_LABELS[mode] || "Strength"}
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {baseConfig.guidance}
          </p>
        </div>

        <div className="shrink-0 rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-center">
          <div className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-500">
            Round
          </div>
          <div className="mt-0.5 text-base font-black text-white">
            {round}/{rounds}
          </div>
        </div>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {Object.entries(TIMER_MODE_LABELS).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => resetForMode(value)}
            className={
              mode === value
                ? "shrink-0 rounded-full border border-[#65ff9a]/45 bg-[#39ff88]/15 px-3 py-2 text-[10px] font-black text-[#9affbb]"
                : "shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-black text-slate-400"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {!baseConfig.timed ? (
        <div className="mt-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.07] p-4">
          <div className="text-sm font-black text-white">
            Manual strength set
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-400">
            There is no pre-set countdown. Use the existing Start Set and Finish Set controls. Rest begins after logging.
          </div>
          <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-black text-amber-100">
            Planned rest: {formatTimerSeconds(restSeconds)}
          </div>
        </div>
      ) : (
        <>
          <div className="mt-3 rounded-2xl border border-white/10 bg-black/35 p-4 text-center">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#65ff9a]">
              {phaseLabel}
            </div>
            <div className="mt-1 text-5xl font-black tabular-nums text-white">
              {formatTimerSeconds(remaining)}
            </div>
            <div className="mt-2 text-xs font-bold text-slate-400">
              Work {formatTimerSeconds(workSeconds)} · Rest{" "}
              {formatTimerSeconds(restSeconds)}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-[1.4fr_0.8fr_0.8fr] gap-2">
            <button
              type="button"
              onClick={startOrPause}
              className="h-12 rounded-2xl border border-[#65ff9a]/55 bg-[#39ff88] text-sm font-black text-black shadow-[0_0_24px_rgba(57,255,136,0.18)]"
            >
              {running
                ? "Pause"
                : phase === "ready"
                ? "Start Timer"
                : phase === "complete"
                ? "Restart"
                : "Resume"}
            </button>
            <button
              type="button"
              onClick={skipPhase}
              className="h-12 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-xs font-black text-cyan-100"
            >
              Next Phase
            </button>
            <button
              type="button"
              onClick={reset}
              className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] text-xs font-black text-slate-300"
            >
              Reset
            </button>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => adjustRemaining(-15)}
              className="h-10 rounded-xl border border-white/10 bg-black/25 text-xs font-black text-slate-300"
            >
              -15 sec
            </button>
            <button
              type="button"
              onClick={() => adjustRemaining(15)}
              className="h-10 rounded-xl border border-white/10 bg-black/25 text-xs font-black text-slate-300"
            >
              +15 sec
            </button>
          </div>
        </>
      )}
    </section>
  );
}
