// src/components/customer-health/CardioActivityDrawer.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

const MODES = [
  "Treadmill Walk",
  "Incline Treadmill Walk",
  "Treadmill Run",
  "Outdoor Walk",
  "Outdoor Run",
  "Stationary Bike",
  "Recumbent Bike",
  "Elliptical",
  "Stair Climber",
  "Rowing Machine",
  "Ski Erg",
  "Jump Rope",
  "Battle Ropes",
  "Bike Intervals",
  "Rower Intervals",
  "Treadmill Intervals",
];

function uid(prefix = "cardio") {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(16)
    .slice(2)}`;
}

function formatTime(seconds) {
  const safe = Math.max(0, Number(seconds || 0));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainder
  ).padStart(2, "0")}`;
}

function announce(message, enabled) {
  if (
    !enabled ||
    typeof window === "undefined" ||
    !window.speechSynthesis
  ) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.rate = 1;
  window.speechSynthesis.speak(utterance);
}

function Field({
  label,
  value,
  onChange,
  step = "1",
  suffix = "",
}) {
  return (
    <label className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
        {label}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          min="0"
          step={step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-black text-white outline-none focus:border-cyan-400"
        />

        {suffix ? (
          <span className="text-xs font-bold text-slate-400">
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
  );
}

export default function CardioActivityDrawer({
  open,
  onClose,
  onSave,
  suggestedPlan,
}) {
  const [mode, setMode] = useState("Treadmill Walk");
  const [status, setStatus] = useState("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distance, setDistance] = useState("");
  const [speed, setSpeed] = useState("");
  const [incline, setIncline] = useState("");
  const [resistance, setResistance] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [calories, setCalories] = useState("");
  const [workSeconds, setWorkSeconds] = useState("30");
  const [recoverySeconds, setRecoverySeconds] = useState("60");
  const [rounds, setRounds] = useState("8");
  const [notes, setNotes] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [intervalPhase, setIntervalPhase] = useState("work");
  const [intervalRound, setIntervalRound] = useState(1);
  const [phaseRemaining, setPhaseRemaining] = useState(30);
  const startedAtRef = useRef("");

  const suggestedCardio = useMemo(
    () =>
      suggestedPlan?.exercises?.find((exercise) =>
        /cardio|hiit/i.test(exercise.category || "")
      ),
    [suggestedPlan]
  );

  const isInterval = /interval|battle ropes|jump rope/i.test(
    mode
  );

  useEffect(() => {
    if (open && suggestedCardio?.name) {
      setMode(suggestedCardio.name);
    }
  }, [open, suggestedCardio]);

  useEffect(() => {
    if (!isInterval) return;
    setIntervalPhase("work");
    setIntervalRound(1);
    setPhaseRemaining(Math.max(1, Number(workSeconds || 30)));
  }, [isInterval, mode, workSeconds]);

  useEffect(() => {
    if (!open || status !== "active") return undefined;

    const timer = window.setInterval(() => {
      setElapsedSeconds((previous) => previous + 1);

      if (isInterval) {
        setPhaseRemaining((previous) => {
          if (previous > 1) {
            if (previous === 6) {
              announce("Five seconds", audioEnabled);
            }
            return previous - 1;
          }

          if (intervalPhase === "work") {
            announce("Recover", audioEnabled);
            setIntervalPhase("recovery");
            return Math.max(1, Number(recoverySeconds || 60));
          }

          const totalRounds = Math.max(1, Number(rounds || 1));

          if (intervalRound >= totalRounds) {
            announce("Intervals complete", audioEnabled);
            setStatus("paused");
            return 0;
          }

          announce(`Round ${intervalRound + 1}. Go`, audioEnabled);
          setIntervalRound((round) => round + 1);
          setIntervalPhase("work");
          return Math.max(1, Number(workSeconds || 30));
        });
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [
    open,
    status,
    isInterval,
    intervalPhase,
    intervalRound,
    rounds,
    workSeconds,
    recoverySeconds,
    audioEnabled,
  ]);

  function start() {
    if (!startedAtRef.current) {
      startedAtRef.current = new Date().toISOString();
    }

    announce(
      isInterval ? `Round ${intervalRound}. Go` : `${mode} started`,
      audioEnabled
    );

    setStatus("active");
  }

  function reset() {
    setStatus("idle");
    setElapsedSeconds(0);
    setDistance("");
    setSpeed("");
    setIncline("");
    setResistance("");
    setHeartRate("");
    setCalories("");
    setNotes("");
    setIntervalPhase("work");
    setIntervalRound(1);
    setPhaseRemaining(Math.max(1, Number(workSeconds || 30)));
    startedAtRef.current = "";
  }

  function finish() {
    const completedAt = new Date().toISOString();
    const durationText = `${formatTime(elapsedSeconds)} duration`;

    announce("Cardio complete. Strong work.", audioEnabled);

    onSave?.({
      id: uid("cardio-session"),
      workout_name: mode,
      name: mode,
      category: isInterval ? "HIIT" : "Cardio",
      status: "Completed",
      source: "cardio_player",
      started_at: startedAtRef.current || completedAt,
      completed_at: completedAt,
      total_seconds: elapsedSeconds,
      active_seconds: elapsedSeconds,
      rest_seconds: 0,
      idle_seconds: 0,
      completed_sets: isInterval
        ? Math.max(1, intervalRound)
        : 1,
      pain_score: "0",
      difficulty_score: "Medium",
      energy_score: "Good",
      skipped_exercises: 0,
      cardio_metrics: {
        mode,
        distance: Number(distance || 0),
        speed: Number(speed || 0),
        incline: Number(incline || 0),
        resistance: Number(resistance || 0),
        heart_rate: Number(heartRate || 0),
        calories: Number(calories || 0),
        interval_work_seconds: Number(workSeconds || 0),
        interval_recovery_seconds: Number(recoverySeconds || 0),
        interval_rounds_completed: isInterval
          ? Math.max(1, intervalRound)
          : 0,
        interval_rounds_planned: isInterval
          ? Number(rounds || 0)
          : 0,
        notes,
      },
      exercises: [
        {
          id: uid("cardio-exercise"),
          name: mode,
          category: isInterval ? "HIIT" : "Cardio",
          planned_sets: isInterval ? rounds : "1",
          planned_reps: durationText,
          completed: true,
          set_logs: [
            {
              id: uid("cardio-log"),
              set_number: 1,
              set_type: "working",
              actual_reps: durationText,
              reps: durationText,
              completed: true,
              started_at: startedAtRef.current || completedAt,
              completed_at: completedAt,
              set_duration_seconds: elapsedSeconds,
              pain_score: "0",
            },
          ],
        },
      ],
    });

    reset();
    onClose?.();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[96dvh] w-full max-w-3xl overflow-y-auto rounded-t-[2rem] border border-cyan-300/20 bg-[#050b18] p-4 shadow-2xl sm:rounded-[2rem] sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
              Cardio Coach
            </div>
            <h2 className="mt-1 text-2xl font-black text-white">
              Live conditioning session
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              if (status === "active") setStatus("paused");
              onClose?.();
            }}
            className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm font-black text-white"
          >
            Close
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-3">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
              Audio coach
            </div>
            <div className="mt-1 text-sm font-black text-white">
              Spoken starts, switches, and countdowns
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAudioEnabled((value) => !value)}
            className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-xs font-black text-cyan-100"
          >
            {audioEnabled ? "On" : "Off"}
          </button>
        </div>

        <div className="mt-4 rounded-[1.75rem] border border-fuchsia-300/20 bg-fuchsia-300/[0.06] p-4 text-center">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-200">
            {status === "active"
              ? "Active"
              : status === "paused"
              ? "Paused"
              : "Ready"}
          </div>

          <div className="mt-2 text-6xl font-black tabular-nums text-white">
            {formatTime(elapsedSeconds)}
          </div>

          {isInterval ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Round {intervalRound} of {Math.max(1, Number(rounds || 1))}
              </div>
              <div className="mt-1 text-xl font-black uppercase text-white">
                {intervalPhase}
              </div>
              <div className="mt-1 text-4xl font-black tabular-nums text-amber-200">
                {formatTime(phaseRemaining)}
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex justify-center gap-2">
            {status !== "active" ? (
              <button
                type="button"
                onClick={start}
                className="h-12 rounded-2xl border border-lime-300/30 bg-lime-300/15 px-6 text-sm font-black text-lime-100"
              >
                {status === "paused" ? "Resume" : "Start"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStatus("paused")}
                className="h-12 rounded-2xl border border-amber-300/30 bg-amber-300/15 px-6 text-sm font-black text-amber-100"
              >
                Pause
              </button>
            )}

            <button
              type="button"
              disabled={!elapsedSeconds}
              onClick={finish}
              className="h-12 rounded-2xl border border-cyan-300/30 bg-cyan-300/15 px-6 text-sm font-black text-cyan-100 disabled:opacity-40"
            >
              Finish & Save
            </button>
          </div>
        </div>

        <label className="mt-4 block">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            Activity
          </div>
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value)}
            className="mt-2 h-12 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm font-black text-white outline-none focus:border-cyan-400"
          >
            {MODES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Field
            label="Distance"
            value={distance}
            onChange={setDistance}
            step="0.01"
            suffix="mi"
          />
          <Field
            label="Speed"
            value={speed}
            onChange={setSpeed}
            step="0.1"
            suffix="mph"
          />
          <Field
            label="Incline"
            value={incline}
            onChange={setIncline}
            step="0.5"
            suffix="%"
          />
          <Field
            label="Resistance"
            value={resistance}
            onChange={setResistance}
          />
          <Field
            label="Heart Rate"
            value={heartRate}
            onChange={setHeartRate}
            suffix="bpm"
          />
          <Field
            label="Calories"
            value={calories}
            onChange={setCalories}
            suffix="kcal"
          />
        </div>

        {isInterval ? (
          <div className="mt-4 rounded-[1.5rem] border border-amber-300/20 bg-amber-300/[0.06] p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-200">
              Interval Setup
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <Field
                label="Work"
                value={workSeconds}
                onChange={setWorkSeconds}
                suffix="sec"
              />
              <Field
                label="Recovery"
                value={recoverySeconds}
                onChange={setRecoverySeconds}
                suffix="sec"
              />
              <Field
                label="Rounds"
                value={rounds}
                onChange={setRounds}
              />
            </div>
          </div>
        ) : null}

        <label className="mt-4 block">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            Notes
          </div>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="How did the cardio feel?"
            className="mt-2 min-h-24 w-full rounded-2xl border border-slate-700 bg-slate-950 p-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
          />
        </label>
      </div>
    </div>
  );
}
