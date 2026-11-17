import React, { useEffect, useState } from "react";
import { getHealthWorkoutProgression } from "../../api/customerHealth";

export default function HealthStrengthProgression({ open, onClose }) {
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    setStatus("loading");
    getHealthWorkoutProgression()
      .then((data) => {
        if (!active) return;
        setResult(data);
        setStatus("ready");
      })
      .catch((error) => {
        if (!active) return;
        console.error("Unable to load Health progression:", error);
        setStatus("error");
      });
    return () => { active = false; };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onEscape = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [open, onClose]);

  if (!open) return null;
  const exercises = Array.isArray(result?.exercises) ? result.exercises : [];

  return (
    <div className="sw-health-strength-layer" role="presentation">
      <button type="button" className="sw-health-strength-backdrop"
        aria-label="Close strength progression" onClick={onClose} />
      <aside className="sw-health-strength-panel" role="dialog" aria-modal="true"
        aria-label="Strength progression and suggested workout weights">
        <header className="sw-health-strength-head">
          <div><small>SYNCWORKS HEALTH</small><h2>Strength Progression</h2>
            <p>Recommendations from your own completed workouts.</p></div>
          <button type="button" onClick={onClose} aria-label="Close strength progression">✕</button>
        </header>
        <div className="sw-health-strength-body">
          {status === "loading" ? <p role="status">Loading your logged workout stats…</p> : null}
          {status === "error" ? <div role="alert">
            Your workout stats could not be loaded. Return to Health and try again. No workout data has been changed.
          </div> : null}
          {status === "ready" ? (
            <>
              <div className="sw-health-strength-summary">
                <div><strong>{result?.workouts_logged ?? 0}</strong><span>Completed sessions</span></div>
                <div><strong>{result?.exercises_tracked ?? 0}</strong><span>Tracked exercises</span></div>
              </div>
              {!exercises.length ? (
                <p>Complete and save a workout with sets and reps to start personalized recommendations. Initial weights aren't guessed.</p>
              ) : exercises.map((item) => (
                <article key={item.exercise} className="sw-health-strength-exercise">
                  <div className="sw-health-strength-title"><strong>{item.exercise}</strong>
                    <span>{item.action === "increase" ? "Progress" : item.action === "review" ? "Review form / pain" : "Build consistency"}</span></div>
                  <div className="sw-health-strength-stats">
                    <div><small>Previous</small><strong>{item.last_weight == null ? "Not logged" : item.last_weight} {item.last_weight == null ? "" : result?.unit === "as_logged" ? "(logged units)" : result?.unit}</strong><span>{item.last_reps} reps</span></div>
                    <div><small>Next target</small><strong>{item.suggested_weight == null ? "Confirm safe load" : item.suggested_weight}</strong><span>{item.rep_range?.min}–{item.rep_range?.max} reps</span></div>
                  </div>
                  <p>{item.reason}</p>
                  <small>Sessions: {item.sessions_logged} · Best logged load: {item.best_logged_weight ?? "—"} · {item.confidence === "limited_history" ? "Limited history" : "History-based"}</small>
                </article>
              ))}
              <p className="sw-health-strength-disclaimer">{result?.note}</p>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
