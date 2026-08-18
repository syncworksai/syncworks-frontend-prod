import React, { useEffect, useMemo, useState } from "react";
import HealthDashboard from "./HealthDashboard";
import {
  archiveExpiredCloudWorkout,
  loadCloudActiveWorkout,
} from "./healthWorkoutCloudSync";
import {
  formatHealthDay,
  localYmd,
  shouldOfferPreviousWorkout,
} from "./healthWorkoutDateLifecycle";

function normalizeYmd(value) {
  return String(value || "").slice(0, 10);
}

export default function HealthDayAwareDashboard({
  profile = {},
  snapshot = {},
  history = [],
  progressLogs = [],
  onOpen,
  onStartWorkout,
}) {
  const [dayKey, setDayKey] = useState(() => localYmd());
  const [previousWorkout, setPreviousWorkout] = useState(null);
  const [dayMessage, setDayMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function refreshDayState() {
      const today = localYmd();
      setDayKey(today);

      try {
        const active = await loadCloudActiveWorkout();
        if (cancelled) return;

        if (!active?.session) {
          setPreviousWorkout(null);
          return;
        }

        const lifecycle = shouldOfferPreviousWorkout(active);

        if (lifecycle.expired) {
          await archiveExpiredCloudWorkout(active);
          if (!cancelled) {
            setPreviousWorkout(null);
            setDayMessage(
              "An older unfinished workout was saved as partial history so today's plan can continue."
            );
          }
          return;
        }

        if (lifecycle.ageDays === 1) {
          setPreviousWorkout({
            ...active,
            session: lifecycle.session,
            label: lifecycle.label,
          });
          setDayMessage(
            "SYNC detected a new day. Yesterday's unfinished workout is preserved separately from today's plan."
          );
          return;
        }

        setPreviousWorkout(null);
        setDayMessage("");
      } catch (error) {
        console.warn("Health day rollover check unavailable.", error);
      }
    }

    refreshDayState();
    const timer = window.setInterval(refreshDayState, 60000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshDayState();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const todaySnapshot = useMemo(() => {
    const plan = Array.isArray(snapshot?.week_plan) ? snapshot.week_plan : [];
    const currentAndFuture = plan
      .filter((item) => {
        const ymd = normalizeYmd(item?.ymd || item?.scheduled_ymd);
        return !ymd || ymd >= dayKey;
      })
      .sort((left, right) => {
        const leftDate = normalizeYmd(left?.ymd || left?.scheduled_ymd) || "9999-12-31";
        const rightDate = normalizeYmd(right?.ymd || right?.scheduled_ymd) || "9999-12-31";
        const leftToday = leftDate === dayKey ? 0 : 1;
        const rightToday = rightDate === dayKey ? 0 : 1;
        return leftToday - rightToday || leftDate.localeCompare(rightDate);
      });

    return {
      ...snapshot,
      current_health_ymd: dayKey,
      current_health_day_label: formatHealthDay(dayKey),
      week_plan: currentAndFuture,
    };
  }, [snapshot, dayKey]);

  const resumePlannerItem = previousWorkout
    ? {
        ...previousWorkout.session,
        id:
          previousWorkout.planner_item_id ||
          previousWorkout.session?.planner_item_id ||
          previousWorkout.session?.id,
        workout_id:
          previousWorkout.workout_id ||
          previousWorkout.session?.workout_id ||
          "",
        ymd:
          previousWorkout.session?.scheduled_ymd ||
          previousWorkout.session?.ymd ||
          "",
        workout_name:
          previousWorkout.session?.workout_name ||
          "Previous workout",
      }
    : null;

  return (
    <div className="space-y-3">
      <section className="rounded-[1.35rem] border border-cyan-300/20 bg-cyan-300/[0.055] px-4 py-3">
        <div className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200">
          {formatHealthDay(dayKey)}
        </div>
        <div className="mt-1 text-sm font-black text-white">
          SYNC Day Tracker
        </div>
        <div className="mt-1 text-[11px] leading-5 text-slate-400">
          Today's workout, nutrition, recovery, and adherence are tracked separately from previous days.
        </div>
      </section>

      {dayMessage ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] leading-5 text-slate-300">
          {dayMessage}
        </div>
      ) : null}

      {previousWorkout && resumePlannerItem ? (
        <section className="rounded-[1.5rem] border border-amber-300/25 bg-amber-300/[0.07] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-200">
                {previousWorkout.label || "Yesterday - Incomplete"}
              </div>
              <div className="mt-1 text-lg font-black text-white">
                {resumePlannerItem.workout_name}
              </div>
              <div className="mt-1 text-xs leading-5 text-slate-400">
                Completed sets are preserved. Resume yesterday only if it still makes sense; today's scheduled workout remains available below.
              </div>
            </div>
            <button
              type="button"
              onClick={() => onStartWorkout?.(resumePlannerItem)}
              className="h-11 shrink-0 rounded-xl border border-amber-300/35 bg-amber-300/15 px-4 text-xs font-black text-amber-100"
            >
              Resume Yesterday
            </button>
          </div>
        </section>
      ) : null}

      <HealthDashboard
        profile={profile}
        snapshot={todaySnapshot}
        history={history}
        progressLogs={progressLogs}
        onOpen={onOpen}
        onStartWorkout={onStartWorkout}
      />
    </div>
  );
}
