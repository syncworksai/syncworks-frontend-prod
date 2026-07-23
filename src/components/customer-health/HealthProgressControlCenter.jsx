// src/components/customer-health/HealthProgressControlCenter.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  buildPlanControlOptions,
  buildProgressSummary,
  simulateTrainingProgram,
} from "./healthProgressSimulation";
import {
  runHealthPlanControl,
  updateHealthSimulationPreferences,
} from "../../api/healthProfiles";

function Metric({ label, value, detail }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
      <div className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-black text-white">
        {value}
      </div>
      <div className="mt-1 text-[10px] leading-4 text-slate-400">
        {detail}
      </div>
    </div>
  );
}

export default function HealthProgressControlCenter({
  history,
  snapshot,
  onOpen,
  onShowInsights,
}) {
  const [expanded, setExpanded] = useState(false);
  const [simulationWeeks, setSimulationWeeks] = useState(8);
  const [confirmReset, setConfirmReset] = useState(false);
  const [controlBusy, setControlBusy] = useState("");
  const [controlMessage, setControlMessage] = useState("");
  const [controlError, setControlError] = useState("");
  const [simulationSaving, setSimulationSaving] =
    useState(false);
  const simulationSaveTimerRef = useRef(null);

  const summary = useMemo(
    () => buildProgressSummary({ history, snapshot }),
    [history, snapshot]
  );

  const simulation = useMemo(
    () =>
      simulateTrainingProgram({
        weekPlan: snapshot?.week_plan,
        history,
        snapshot,
        weeks: simulationWeeks,
      }),
    [history, simulationWeeks, snapshot]
  );

  const controls = useMemo(
    () =>
      buildPlanControlOptions({
        hasPlan:
          Array.isArray(snapshot?.week_plan) &&
          snapshot.week_plan.length > 0,
        hasHistory:
          Array.isArray(history) && history.length > 0,
      }),
    [history, snapshot?.week_plan]
  );

  async function runControl(control) {
    if (!control.enabled || controlBusy) return;

    if (control.id === "reset" && !confirmReset) {
      setConfirmReset(true);
      setControlMessage(
        "Reset requires one more confirmation."
      );
      return;
    }

    const actionMap = {
      review: "review",
      rebuild: "rebuild",
      "restart-keep": "restart_keep_weights",
      reset: "reset",
    };
    const action = actionMap[control.id];

    setControlBusy(control.id);
    setControlError("");
    setControlMessage("");

    try {
      await runHealthPlanControl({
        action,
        confirmed: control.id === "reset",
      });

      setControlMessage(
        control.id === "restart-keep"
          ? "Restart request saved. Previous working weights will be preserved."
          : control.id === "reset"
          ? "Reset request confirmed and saved."
          : "Plan request saved."
      );

      onOpen?.(control.route, {
        preserveWeights: control.id === "restart-keep",
        confirmed: control.id === "reset",
        persisted: true,
      });
      setConfirmReset(false);
    } catch (error) {
      if (
        control.id === "reset" &&
        Number(error?.status) === 409
      ) {
        setConfirmReset(true);
        setControlMessage(
          "The server requires explicit reset confirmation. Tap Confirm Reset again."
        );
      } else {
        setControlError(
          error?.networkLike
            ? "The server is temporarily unavailable. No destructive plan change was applied."
            : error?.message ||
                "The plan request could not be saved."
        );
      }
    } finally {
      setControlBusy("");
    }
  }

  useEffect(() => {
    return () => {
      window.clearTimeout(
        simulationSaveTimerRef.current
      );
    };
  }, []);

  return (
    <section className="rounded-[1.75rem] border border-cyan-300/20 bg-[linear-gradient(145deg,rgba(4,12,18,0.98),rgba(2,5,8,0.99))] p-4 shadow-[0_0_34px_rgba(52,223,255,0.07)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
            Progress Control Center
          </div>
          <h2 className="mt-1 text-xl font-black text-white">
            Training momentum and plan controls
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Review current performance, test the direction of the program, or safely rebuild without losing prior working weights.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="shrink-0 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-[10px] font-black text-cyan-100"
        >
          {expanded ? "Collapse" : "Open"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric
          label="7-Day Workouts"
          value={summary.week.sessions}
          detail={`Target ${summary.weeklyTarget}`}
        />
        <Metric
          label="Adherence"
          value={`${summary.adherence}%`}
          detail="Completed against weekly target"
        />
        <Metric
          label="Active Minutes"
          value={summary.week.activeMinutes}
          detail="Rolling seven days"
        />
        <Metric
          label="Training Volume"
          value={summary.week.volume.toLocaleString()}
          detail="Working-set load × reps"
        />
      </div>

      {expanded ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_1.2fr]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.16em] text-lime-300">
                    Program Simulation
                  </div>
                  <div className="mt-1 text-sm font-black text-white">
                    Directional preview
                  </div>
                </div>

                <select
                  value={simulationWeeks}
                  onChange={(event) => {
                    const weeks = Number(event.target.value);
                    setSimulationWeeks(weeks);
                    setSimulationSaving(true);
                    setControlError("");

                    window.clearTimeout(
                      simulationSaveTimerRef.current
                    );
                    simulationSaveTimerRef.current =
                      window.setTimeout(async () => {
                        try {
                          await updateHealthSimulationPreferences({
                            weeks,
                            expected_adherence:
                              simulation.expectedAdherence,
                            planned_sessions:
                              simulation.plannedSessions,
                            baseline_volume:
                              simulation.baselineVolume,
                          });
                          setControlMessage(
                            "Simulation preferences saved."
                          );
                        } catch (error) {
                          setControlError(
                            error?.networkLike
                              ? "Simulation changed locally, but server sync is unavailable."
                              : error?.message ||
                                  "Simulation preferences could not be saved."
                          );
                        } finally {
                          setSimulationSaving(false);
                        }
                      }, 350);
                  }}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-black text-white"
                >
                  <option value={4}>4 weeks</option>
                  <option value={8}>8 weeks</option>
                  <option value={12}>12 weeks</option>
                </select>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Metric
                  label="Projected Sessions"
                  value={simulation.projectedSessions}
                  detail={`${simulation.expectedAdherence}% expected adherence`}
                />
                <Metric
                  label="Weekly Schedule"
                  value={simulation.plannedSessions}
                  detail="Planned training days"
                />
              </div>

              <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                {simulation.projection.map((week) => (
                  <div
                    key={week.week}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                  >
                    <div>
                      <div className="text-xs font-black text-white">
                        {week.label}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {week.phase}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-cyan-100">
                        {week.expectedSessions} sessions
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {week.projectedVolume
                          ? `${week.projectedVolume.toLocaleString()} volume`
                          : "Volume builds after logged sets"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 text-[10px] leading-4 text-slate-500">
                {simulation.note}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-fuchsia-200">
                Plan Controls
              </div>
              <div className="mt-1 text-sm font-black text-white">
                Change the program without accidental data loss
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {controls.map((control) => (
                  <button
                    key={control.id}
                    type="button"
                    disabled={
                      !control.enabled || Boolean(controlBusy)
                    }
                    onClick={() => runControl(control)}
                    className={`rounded-2xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-35 ${
                      control.destructive
                        ? "border-rose-300/20 bg-rose-300/[0.06]"
                        : "border-white/10 bg-black/20 hover:border-cyan-300/25"
                    }`}
                  >
                    <div
                      className={`text-xs font-black ${
                        control.destructive
                          ? "text-rose-100"
                          : "text-white"
                      }`}
                    >
                      {controlBusy === control.id
                        ? "Saving..."
                        : control.id === "reset" &&
                          confirmReset
                        ? "Confirm Reset"
                        : control.label}
                    </div>
                    <div className="mt-1 text-[10px] leading-4 text-slate-400">
                      {control.id === "reset" && confirmReset
                        ? "Tap again to open the confirmed reset flow."
                        : control.detail}
                    </div>
                  </button>
                ))}
              </div>

              {simulationSaving ? (
                <div className="mt-3 text-[10px] font-bold text-cyan-100">
                  Saving simulation preferences...
                </div>
              ) : null}

              {controlMessage ? (
                <div className="mt-3 rounded-xl border border-lime-300/20 bg-lime-300/[0.06] p-3 text-[10px] font-bold leading-4 text-lime-100">
                  {controlMessage}
                </div>
              ) : null}

              {controlError ? (
                <div className="mt-3 rounded-xl border border-rose-300/20 bg-rose-300/[0.06] p-3 text-[10px] font-bold leading-4 text-rose-100">
                  {controlError}
                </div>
              ) : null}

              <button
                type="button"
                onClick={onShowInsights}
                className="mt-3 h-11 w-full rounded-xl border border-lime-300/30 bg-lime-300/10 text-xs font-black text-lime-100"
              >
                Open Full Progress Insights
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
