// src/components/customer-health/HealthPremiumHome.jsx
import React, { useEffect, useMemo, useState } from "react";
import HealthDashboard from "./HealthDashboard";
import { loadCloudWorkoutHistory } from "./healthWorkoutCloudSync";
import { currentDayWorkout, localYmd } from "./healthWorkoutDateLifecycle";
import { chooseRecoverySafeWorkout } from "./healthWorkoutRecoveryGuard";

function workoutLabel(workout = {}) {
  return String(
    workout?.workout_name || workout?.name || workout?.title || "Workout"
  ).trim();
}

function buildRecoveryPlaceholder(proposedWorkout = {}, reason = "") {
  return {
    ...proposedWorkout,
    workout_name: "Recovery-Safe Session Needed",
    ai_revised: true,
    ai_revised_from_workout_name: workoutLabel(proposedWorkout),
    ai_revision_reason: reason,
    requires_plan_rebuild: true,
  };
}

export default function HealthPremiumHome({
  profile = {},
  snapshot = {},
  history = [],
  progressLogs = [],
  onOpen,
  onStartWorkout,
}) {
  const [cloudHistory, setCloudHistory] = useState([]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleHealthOpen = (event) => {
      const target = event?.detail?.target;
      if (target) onOpen?.(target);
    };

    window.addEventListener("syncworks:health-open", handleHealthOpen);
    return () => window.removeEventListener("syncworks:health-open", handleHealthOpen);
  }, [onOpen]);

  useEffect(() => {
    let cancelled = false;

    async function refreshHistory() {
      try {
        const result = await loadCloudWorkoutHistory();
        if (cancelled) return;
        setCloudHistory(
          Array.isArray(result?.results)
            ? result.results
            : Array.isArray(result)
            ? result
            : []
        );
      } catch (error) {
        console.warn("Health recovery history unavailable.", error);
      }
    }

    refreshHistory();
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshHistory();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const decision = useMemo(() => {
    const today = localYmd();
    const plan = Array.isArray(snapshot?.week_plan) ? snapshot.week_plan : [];
    const proposed =
      currentDayWorkout(plan, today) ||
      [...plan]
        .filter(
          (item) =>
            item?.workout_name &&
            !["Completed", "Skipped", "Rescheduled"].includes(item?.status) &&
            String(item?.ymd || "") >= today
        )
        .sort((a, b) =>
          String(a?.ymd || "9999").localeCompare(String(b?.ymd || "9999"))
        )[0] ||
      null;

    const combinedHistory = [
      ...(Array.isArray(history) ? history : []),
      ...cloudHistory,
    ];

    const candidates = [...plan]
      .filter(
        (item) =>
          item?.workout_name &&
          !["Completed", "Skipped", "Rescheduled"].includes(item?.status) &&
          String(item?.ymd || "") >= today
      )
      .sort((a, b) =>
        String(a?.ymd || "9999").localeCompare(String(b?.ymd || "9999"))
      );

    return chooseRecoverySafeWorkout({
      proposedWorkout: proposed,
      candidates,
      history: combinedHistory,
      today,
    });
  }, [snapshot, history, cloudHistory]);

  const guardedSnapshot = useMemo(() => {
    if (!decision?.revised) return snapshot;

    const today = localYmd();
    const originalPlan = Array.isArray(snapshot?.week_plan)
      ? snapshot.week_plan
      : [];
    const todayIndex = originalPlan.findIndex(
      (item) => String(item?.ymd || "").slice(0, 10) === today
    );

    const safeWorkout = decision.needsRebuild
      ? buildRecoveryPlaceholder(decision.workout, decision.reason)
      : {
          ...decision.workout,
          ai_revised: true,
          ai_revision_reason: decision.reason,
        };

    const revisedToday = {
      ...safeWorkout,
      ymd: today,
      scheduled_ymd: today,
      status: "Planned",
    };

    const nextPlan = [...originalPlan];
    if (todayIndex >= 0) nextPlan[todayIndex] = revisedToday;
    else nextPlan.unshift(revisedToday);

    return {
      ...snapshot,
      week_plan: nextPlan,
      health_ai_revision: {
        active: true,
        reason: decision.reason,
        original_workout: workoutLabel(decision.evaluation?.proposedWorkout),
        revised_workout: workoutLabel(revisedToday),
      },
    };
  }, [snapshot, decision]);

  function guardedStartWorkout(requestedWorkout) {
    if (decision?.revised) {
      if (decision.needsRebuild) {
        onOpen?.("planner");
        return;
      }
      onStartWorkout?.({
        ...decision.workout,
        ymd: localYmd(),
        scheduled_ymd: localYmd(),
        ai_revised: true,
        ai_revision_reason: decision.reason,
      });
      return;
    }

    onStartWorkout?.(requestedWorkout);
  }

  return (
    <div className="space-y-3">
      {decision?.revised ? (
        <section className="rounded-[1.5rem] border border-lime-300/25 bg-lime-300/[0.07] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-lime-200">
                AI revised plan
              </div>
              <div className="mt-1 text-lg font-black text-white">
                {decision.needsRebuild
                  ? "Today's workout needs a recovery-safe rebuild"
                  : `${workoutLabel(decision.workout)} replaces today's repeated muscle focus`}
              </div>
              <div className="mt-1 text-xs leading-5 text-slate-300">
                {decision.reason}
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                decision.needsRebuild
                  ? onOpen?.("planner")
                  : guardedStartWorkout(decision.workout)
              }
              className="h-11 shrink-0 rounded-xl border border-lime-300/35 bg-lime-300/15 px-4 text-xs font-black text-lime-100"
            >
              {decision.needsRebuild ? "Rebuild Today" : "Start Revised Workout"}
            </button>
          </div>
        </section>
      ) : null}

      <HealthDashboard
        profile={profile}
        snapshot={guardedSnapshot}
        history={history}
        progressLogs={progressLogs}
        onOpen={onOpen}
        onStartWorkout={guardedStartWorkout}
      />
    </div>
  );
}
