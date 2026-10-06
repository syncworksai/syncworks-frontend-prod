import React from "react";

import WorkoutModeGate, {
  useWorkoutModeFallbackGate,
} from "./WorkoutModeGate";

/**
 * Health workout launch gate.
 *
 * Normal path: CustomerHealth opens this drawer before Active Workout.
 * Safety path: older/direct mobile entry points may still jump straight into
 * ActiveWorkoutSessionDrawer. In that case the fallback hook detects the
 * active workout surface and overlays the same Personal Trainer / Gym Log
 * choice immediately so the athlete never silently lands in legacy Focus Mode.
 */
export default function WorkoutFocusLaunchDrawer({
  open,
  workout,
  onCancel,
  onBegin,
}) {
  const [fallbackOpen, dismissFallback] =
    useWorkoutModeFallbackGate(!open);

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
