// src/components/customer-health/WorkoutFocusCompactPanel.jsx
import React, { useEffect, useRef, useState } from "react";

function safeNumber(value, fallback = 0) {
  const parsed = Number(
    String(value ?? "").replace(/[^\d.-]/g, "")
  );
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatLoad(value) {
  const text = String(value ?? "").trim();
  if (!text || /^(bw|bodyweight|body weight)$/i.test(text)) {
    return "BW";
  }
  return `${text} lb`;
}

function findWorkoutRoot(node) {
  let current = node;
  while (current) {
    const text = current.textContent || "";
    if (
      text.includes("SYNC WORKOUT FOCUS MODE") &&
      text.includes("Exit Focus")
    ) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

function elementWithMarker(root, marker) {
  return [...root.querySelectorAll("div, section, details")].find(
    (element) => {
      const ownText = [...element.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent || "")
        .join(" ")
        .trim();
      const headingText = element.querySelector(
        ":scope > div:first-child, :scope > summary, :scope > h2, :scope > h3"
      )?.textContent;
      return `${ownText} ${headingText || ""}`.includes(marker);
    }
  );
}

export default function WorkoutFocusCompactPanel({
  session,
  currentExercise,
  formatSeconds,
  onModify,
  onFinish,
  onReplay,
}) {
  const panelRef = useRef(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [laterMessage, setLaterMessage] = useState("");
  const [bpm, setBpm] = useState(() => {
    if (typeof window === "undefined") return 0;
    return safeNumber(
      window.localStorage.getItem(
        "syncworks_health_current_bpm"
      ),
      0
    );
  });

  const allSetsComplete = Boolean(
    session?.exercises?.length &&
      session.exercises.every(
        (exercise) =>
          (exercise.set_logs || []).length >=
          Number(exercise.planned_sets || 0)
      )
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "syncworks_health_current_bpm",
      String(bpm || "")
    );
  }, [bpm]);

  useEffect(() => {
    const panel = panelRef.current;
    const root = findWorkoutRoot(panel);
    if (!panel || !root) return undefined;

    const restore = [];
    const setDisplay = (element, display) => {
      if (!element) return;
      const previous = element.style.display;
      restore.push(() => {
        element.style.display = previous;
      });
      element.style.display = display;
    };

    // The header already shows timing and set totals. Hide the duplicate
    // mission summary immediately above this compact exercise card.
    const previousCard = panel.previousElementSibling;
    if (previousCard) setDisplay(previousCard, "none");

    // Keep only one sticky workout controller. The newer compact controller
    // remains visible near the phone safe area.
    [...root.querySelectorAll("div")].forEach((element) => {
      const text = element.textContent || "";
      if (
        text.includes("Pause") &&
        text.includes("Set Control") &&
        text.includes("Audio") &&
        text.includes("Ask SYNC") &&
        element.className.includes("absolute")
      ) {
        setDisplay(element, "none");
      }
    });

    const optionalMarkers = [
      "Previous Workout + Progression",
      "Personal Records",
      "Next Record Targets",
      "Milestones Reached",
      "Coach Voice Settings",
    ];

    optionalMarkers.forEach((marker) => {
      const element = elementWithMarker(root, marker);
      if (element) setDisplay(element, moreOpen ? "" : "none");
    });

    // The finish questionnaire belongs to the finish flow, not the middle of
    // an active set. Reveal it only when the workout is complete or requested.
    const finishCheckIn = elementWithMarker(root, "Finish Check-In");
    if (finishCheckIn) {
      setDisplay(
        finishCheckIn,
        allSetsComplete || moreOpen ? "" : "none"
      );
    }

    // Hide early finish buttons until every planned set is logged. Exit Focus
    // still saves the active session so the user can resume later.
    [...root.querySelectorAll("button")].forEach((button) => {
      const label = (button.textContent || "").trim();
      if (
        !allSetsComplete &&
        (label === "Finish" || label === "Finish Workout")
      ) {
        setDisplay(button, "none");
      }
    });

    return () => restore.reverse().forEach((callback) => callback());
  }, [allSetsComplete, moreOpen, session?.current_exercise_index]);

  if (!session || !currentExercise) return null;

  const setNumber =
    (currentExercise.set_logs || []).length + 1;
  const plannedSets =
    currentExercise.planned_sets || "-";
  const reps =
    currentExercise.current_target_reps ||
    currentExercise.planned_reps ||
    "-";
  const weight =
    currentExercise.current_target_weight ||
    currentExercise.planned_weight;

  function comeBackLater() {
    if (session.set_active || session.pending_set_logging) {
      setLaterMessage("Finish or save this set first.");
      return;
    }

    const root = findWorkoutRoot(panelRef.current);
    if (!root) return;

    const exerciseButtons = [...root.querySelectorAll("button")].filter(
      (button) => /\d+\/\d+ sets/i.test(button.textContent || "")
    );
    const nextIndex = Math.min(
      exerciseButtons.length - 1,
      Number(session.current_exercise_index || 0) + 1
    );

    if (
      exerciseButtons.length &&
      nextIndex > Number(session.current_exercise_index || 0)
    ) {
      exerciseButtons[nextIndex].click();
      setLaterMessage("Saved for later. Moved to the next exercise.");
      window.setTimeout(() => setLaterMessage(""), 2600);
      return;
    }

    setLaterMessage("This is the final exercise.");
  }

  return (
    <section
      ref={panelRef}
      className="rounded-[1.45rem] border border-lime-300/25 bg-[radial-gradient(circle_at_90%_0%,rgba(112,255,61,0.09),transparent_28%),linear-gradient(145deg,rgba(13,18,14,0.98),rgba(3,6,4,0.99))] p-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-lime-300">
            Current Exercise
          </div>
          <div className="mt-1 truncate text-2xl font-black text-white">
            {currentExercise.substitute_name ||
              currentExercise.name}
          </div>
          <div className="mt-1 text-xs font-bold text-slate-400">
            Set {setNumber} of {plannedSets}
          </div>
        </div>

        <div className="shrink-0 rounded-xl border border-lime-300/25 bg-lime-300/10 px-3 py-2 text-right">
          <div className="text-[8px] font-black uppercase tracking-[0.12em] text-lime-200">
            Target
          </div>
          <div className="mt-1 text-sm font-black text-lime-100">
            {reps} x {formatLoad(weight)}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={comeBackLater}
          disabled={
            session.set_active ||
            session.pending_set_logging
          }
          className="h-11 rounded-xl border border-amber-300/25 bg-amber-300/10 px-2 text-xs font-black text-amber-100 disabled:opacity-40"
        >
          Machine Busy - Later
        </button>
        <button
          type="button"
          onClick={() => setMoreOpen((current) => !current)}
          className="h-11 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-black text-white"
        >
          {moreOpen ? "Hide Details" : "Workout Details"}
        </button>
      </div>

      {laterMessage ? (
        <div className="mt-2 rounded-xl border border-amber-300/20 bg-amber-300/[0.07] px-3 py-2 text-[10px] font-bold text-amber-100">
          {laterMessage}
        </div>
      ) : null}

      {moreOpen ? (
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={onReplay}
            className="h-10 rounded-xl border border-white/10 bg-white/[0.04] text-[10px] font-black text-white"
          >
            Replay Cue
          </button>
          <button
            type="button"
            onClick={onModify}
            disabled={session.set_active}
            className="h-10 rounded-xl border border-lime-300/25 bg-lime-300/10 text-[10px] font-black text-lime-100 disabled:opacity-40"
          >
            Modify
          </button>
          {allSetsComplete ? (
            <button
              type="button"
              onClick={onFinish}
              disabled={session.set_active}
              className="h-10 rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-[10px] font-black text-cyan-100 disabled:opacity-40"
            >
              Finish Workout
            </button>
          ) : (
            <label className="rounded-xl border border-rose-300/20 bg-black/30 px-2 py-1 text-center">
              <span className="block text-[8px] font-black uppercase tracking-[0.12em] text-rose-200">
                BPM
              </span>
              <input
                type="number"
                min="0"
                max="240"
                inputMode="numeric"
                value={bpm || ""}
                onChange={(event) =>
                  setBpm(
                    Math.max(
                      0,
                      Math.min(
                        240,
                        safeNumber(event.target.value, 0)
                      )
                    )
                  )
                }
                placeholder="-"
                className="w-full border-0 bg-transparent p-0 text-center text-xs font-black text-white outline-none"
              />
            </label>
          )}
        </div>
      ) : null}

      <div className="sr-only">
        Total {formatSeconds(session.total_seconds)}. Active {formatSeconds(session.active_seconds)}.
      </div>
    </section>
  );
}
