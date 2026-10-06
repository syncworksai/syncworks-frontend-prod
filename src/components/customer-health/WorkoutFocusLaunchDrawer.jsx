import React, { useEffect, useRef, useState } from "react";

import WorkoutModeGate from "./WorkoutModeGate";

/**
 * Health workout launch gate.
 *
 * Normal path: CustomerHealth opens this drawer before Active Workout.
 * Safety path: older/direct mobile entry points may still jump straight into
 * ActiveWorkoutSessionDrawer. In that case we inspect the actual planner item
 * instead of trusting the globally persisted workout-mode value. This prevents
 * a stale Trainer/Gym Log selection from a previous workout from skipping the
 * chooser on the next workout.
 */
export default function WorkoutFocusLaunchDrawer({
  open,
  workout,
  onCancel,
  onBegin,
}) {
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const dismissedForCurrentSurface = useRef(false);

  const explicitMode =
    workout?.workout_mode === "trainer" ||
    workout?.workout_mode === "gym_log" ||
    workout?.launch_mode === "personal_trainer" ||
    workout?.launch_mode === "gym_log";

  useEffect(() => {
    if (open || typeof document === "undefined") {
      setFallbackOpen(false);
      return undefined;
    }

    const check = () => {
      const activeWorkout = document.querySelector(".health-active-workout-root");

      if (!activeWorkout) {
        dismissedForCurrentSurface.current = false;
        setFallbackOpen(false);
        return;
      }

      if (!explicitMode && !dismissedForCurrentSurface.current) {
        setFallbackOpen(true);
      }
    };

    check();
    const timer = window.setInterval(check, 120);
    return () => window.clearInterval(timer);
  }, [open, explicitMode]);

  function dismissFallback() {
    dismissedForCurrentSurface.current = true;
    setFallbackOpen(false);
  }

  return (
    <WorkoutModeGate
      workout={workout}
      forcedOpen={open}
      activeWorkoutFallback={fallbackOpen}
      onCancel={onCancel}
      onBegin={onBegin}
      onDismissFallback={dismissFallback}
    />
  );
}
