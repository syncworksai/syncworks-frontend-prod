// src/components/customer-health/WorkoutFocusDrawer.jsx
import React, { useMemo, useState } from "react";

const WEWARD_URL = "https://wewardapp.go.link/profile?adj_t=1rg2xpwh&userId=22865998";
const SEEQ_URL = "https://www.seeqsupply.com/JACOB78279";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function valueFrom(set, keys) {
  for (const key of keys) {
    if (set?.[key] !== undefined && set?.[key] !== null && set?.[key] !== "") return set[key];
  }
  return "";
}

function setLabel(set, index) {
  const reps = valueFrom(set, ["actual_reps", "reps", "target_reps"]);
  const weight = valueFrom(set, ["actual_weight", "weight", "target_weight"]);
  const effort = valueFrom(set, ["rpe", "effort", "difficulty"]);
  return {
    title: `Set ${index + 1}`,
    detail: [
      reps ? `${reps} reps` : "Reps not logged",
      weight !== "" ? `${weight} lb` : "Bodyweight",
      effort ? `RPE ${effort}` : "",
    ].filter(Boolean).join(" · "),
  };
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/8 py-3 last:border-0">
      <span className="text-[10px] font-black uppercase tracking-[0.13em] text-slate-500">{label}</span>
      <span className="max-w-[68%] text-right text-sm font-bold leading-5 text-slate-100">{value}</span>
    </div>
  );
}

function SectionButton({ title, detail, tone = "lime", onClick }) {
  const styles = {
    lime: "border-lime-300/25 bg-lime-300/10 text-lime-100",
    cyan: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
    amber: "border-amber-300/25 bg-amber-300/10 text-amber-100",
    rose: "border-rose-300/25 bg-rose-300/10 text-rose-100",
    fuchsia: "border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-100",
  };
  return (
    <button type="button" onClick={onClick} className={`flex min-h-16 w-full items-center justify-between rounded-2xl border px-4 text-left ${styles[tone]}`}>
      <span>
        <span className="block text-sm font-black">{title}</span>
        <span className="mt-1 block text-[11px] leading-4 text-slate-400">{detail}</span>
      </span>
      <span className="text-xl opacity-80">›</span>
    </button>
  );
}

export default function WorkoutFocusDrawer({
  open,
  mode,
  exercise,
  session,
  timerPreferences,
  onTimerPreferencesChange,
  onClose,
  onReplay,
  onSwap,
  onSkip,
  onComeBackLater,
  onFinish,
}) {
  const [coachNotes, setCoachNotes] = useState("");
  const [coachResponse, setCoachResponse] = useState("");

  const currentSets = safeArray(exercise?.set_logs);
  const previousSets = safeArray(
    exercise?.previous_working_sets ||
      exercise?.last_working_sets ||
      exercise?.exercise_memory?.working_sets ||
      exercise?.memory?.working_sets
  );
  const image = exercise?.image_url || exercise?.hero_image || exercise?.image || exercise?.demo_image || "";
  const muscles = safeArray(exercise?.primary_muscles || exercise?.muscles || exercise?.muscle_groups);
  const secondaryMuscles = safeArray(exercise?.secondary_muscles);

  const title = {
    history: "History and set log",
    insight: "Exercise and muscle focus",
    change: "Change this exercise",
    timer: "Timer and workout format",
    more: "Workout tools",
    finish: "AI coach debrief",
  }[mode] || "Workout details";

  const workoutTotals = useMemo(() => {
    const exercises = safeArray(session?.exercises);
    const sets = exercises.reduce((sum, item) => sum + safeArray(item.set_logs).length, 0);
    const volume = exercises.reduce(
      (sum, item) =>
        sum +
        safeArray(item.set_logs).reduce(
          (setSum, set) =>
            setSum +
            Number(valueFrom(set, ["actual_reps", "reps"]) || 0) *
              Number(valueFrom(set, ["actual_weight", "weight"]) || 0),
          0
        ),
      0
    );
    return { exercises: exercises.length, sets, volume };
  }, [session?.exercises]);

  if (!open || !exercise) return null;

  function saveTimerPatch(patch) {
    onTimerPreferencesChange?.({
      ...(timerPreferences || {}),
      ...patch,
    });
  }

  function buildCoachResponse() {
    const clean = coachNotes.trim();
    if (!clean) {
      setCoachResponse("Tell SYNC what felt strong, what hurt, what slowed you down, and what should change next time.");
      return;
    }
    setCoachResponse(
      `Saved for your debrief: “${clean}” SYNC will use this feedback after the workout to recommend changes for the next session rather than interrupting today's plan.`
    );
  }

  return (
    <div className="fixed inset-0 z-[220] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4">
      <button type="button" aria-label="Close workout drawer" onClick={onClose} className="absolute inset-0" />
      <section className="relative z-[221] max-h-[88dvh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] border border-lime-300/25 bg-[radial-gradient(circle_at_top_right,rgba(57,255,136,0.08),transparent_30%),linear-gradient(180deg,#07100a,#020403)] px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-3 shadow-[0_-24px_80px_rgba(0,0,0,0.72)] sm:rounded-[2rem] sm:pb-5">
        <div className="mx-auto h-1.5 w-12 rounded-full bg-white/20" />
        <div className="mt-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-lime-300">SYNC workout drawer</div>
            <h3 className="mt-1 text-2xl font-black text-white">{title}</h3>
            <p className="mt-1 truncate text-sm font-bold text-slate-400">{exercise.substitute_name || exercise.name}</p>
          </div>
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-xs font-black text-white">Close</button>
        </div>

        {mode === "history" ? (
          <div className="mt-4 space-y-4">
            {[
              { label: "This workout", rows: currentSets, tone: "lime" },
              { label: "Previous tracked session", rows: previousSets, tone: "cyan" },
            ].map((group) => (
              <div key={group.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <div className={`text-[10px] font-black uppercase tracking-[0.15em] ${group.tone === "lime" ? "text-lime-200" : "text-cyan-200"}`}>{group.label}</div>
                <div className="mt-2 space-y-2">
                  {group.rows.length ? group.rows.map((set, index) => {
                    const row = setLabel(set, index);
                    return (
                      <div key={set.id || index} className="rounded-xl border border-white/10 bg-black/25 px-3 py-2">
                        <div className="text-xs font-black text-white">{row.title}</div>
                        <div className="mt-1 text-[11px] text-slate-400">{row.detail}</div>
                      </div>
                    );
                  }) : (
                    <div className="text-sm leading-5 text-slate-500">
                      {group.label === "This workout" ? "No sets logged yet." : "No prior set history is attached yet. Today establishes the baseline."}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {mode === "insight" ? (
          <div className="mt-4 space-y-3">
            {image ? (
              <div className="overflow-hidden rounded-2xl border border-lime-300/20 bg-black/30">
                <img src={image} alt={exercise.name || "Exercise"} className="h-56 w-full object-cover" />
              </div>
            ) : null}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <InfoRow label="Target" value={`${exercise.current_target_reps || exercise.planned_reps || "Clean reps"} × ${exercise.current_target_weight || exercise.planned_weight || "Bodyweight"}`} />
              <InfoRow label="Primary muscles" value={muscles.join(", ") || exercise.primary_muscle || exercise.muscle_focus || "Movement-specific muscle focus"} />
              <InfoRow label="Secondary" value={secondaryMuscles.join(", ") || exercise.secondary_muscle || ""} />
              <InfoRow label="Purpose" value={exercise.reason || exercise.training_intent || exercise.coaching_focus || "Build controlled strength and repeatable technique."} />
              <InfoRow label="Technique" value={exercise.form_cue || exercise.cue || exercise.instructions || "Use controlled reps and stop if form breaks down."} />
              <InfoRow label="Rest" value={exercise.rest_seconds ? `${exercise.rest_seconds} seconds` : session?.rest_seconds ? `${session.rest_seconds} seconds` : "Follow the active rest timer"} />
            </div>
            <button type="button" onClick={onReplay} className="h-12 w-full rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-sm font-black text-cyan-100">Replay Australian Coach Cue</button>
          </div>
        ) : null}

        {mode === "change" ? (
          <div className="mt-4 space-y-2">
            <SectionButton title="Swap exercise" detail="Choose a similar movement, machine, cable, dumbbell, or home-gym option." tone="lime" onClick={onSwap} />
            <SectionButton title="Machine busy — come back later" detail="Keep this exercise unfinished and move to the next station." tone="amber" onClick={onComeBackLater} />
            <SectionButton title="Skip exercise" detail="Mark it skipped for this workout and continue." tone="rose" onClick={onSkip} />
          </div>
        ) : null}

        {mode === "timer" ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-200">Workout timer style</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  ["standard", "Standard sets"],
                  ["hiit", "HIIT intervals"],
                  ["tabata", "Tabata 20/10"],
                  ["emom", "Every minute"],
                ].map(([value, label]) => (
                  <button key={value} type="button" onClick={() => saveTimerPatch({ mode: value })} className={`min-h-11 rounded-xl border px-2 text-xs font-black ${timerPreferences?.mode === value ? "border-lime-300/30 bg-lime-300/15 text-lime-100" : "border-white/10 bg-black/20 text-slate-400"}`}>{label}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Work sec<input type="number" min="5" max="300" value={timerPreferences?.workSeconds || 40} onChange={(event) => saveTimerPatch({ workSeconds: Number(event.target.value) })} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-2 text-center text-sm text-white" /></label>
              <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Rest sec<input type="number" min="5" max="600" value={timerPreferences?.restSeconds || 60} onChange={(event) => saveTimerPatch({ restSeconds: Number(event.target.value) })} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-2 text-center text-sm text-white" /></label>
              <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Rounds<input type="number" min="1" max="30" value={timerPreferences?.rounds || 8} onChange={(event) => saveTimerPatch({ rounds: Number(event.target.value) })} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-2 text-center text-sm text-white" /></label>
            </div>
            <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] p-3 text-xs leading-5 text-slate-300">
              Selected format: <b className="text-cyan-100">{String(timerPreferences?.mode || "standard").toUpperCase()}</b>. HIIT and Tabata should be selected before the workout begins; these preferences are saved for the next session.
            </div>
          </div>
        ) : null}

        {mode === "more" ? (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/10 bg-black/25 p-3 text-center"><div className="text-[8px] uppercase text-slate-500">Exercises</div><div className="mt-1 text-xl font-black text-white">{workoutTotals.exercises}</div></div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-3 text-center"><div className="text-[8px] uppercase text-slate-500">Sets</div><div className="mt-1 text-xl font-black text-white">{workoutTotals.sets}</div></div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-3 text-center"><div className="text-[8px] uppercase text-slate-500">Volume</div><div className="mt-1 text-xl font-black text-white">{Math.round(workoutTotals.volume)}</div></div>
            </div>
            <SectionButton title="Ask SYNC Coach" detail="Use the workout coach for form, intensity, or equipment questions." tone="cyan" onClick={onReplay} />
            <a href={WEWARD_URL} target="_blank" rel="noreferrer" className="flex min-h-16 w-full items-center justify-between rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 text-left"><span><span className="block text-sm font-black text-cyan-100">Track steps with WeWard</span><span className="mt-1 block text-[11px] text-slate-400">Open the connected steps partner.</span></span><span className="text-xl text-cyan-200">›</span></a>
            <a href={SEEQ_URL} target="_blank" rel="noreferrer" className="flex min-h-16 w-full items-center justify-between rounded-2xl border border-fuchsia-300/25 bg-fuchsia-300/10 px-4 text-left"><span><span className="block text-sm font-black text-fuchsia-100">SEEQ protein support</span><span className="mt-1 block text-[11px] text-slate-400">Open the connected protein partner.</span></span><span className="text-xl text-fuchsia-200">›</span></a>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[11px] leading-5 text-slate-400">Nutrition Coach remains separate from the active workout so food planning does not compete with set tracking.</div>
          </div>
        ) : null}

        {mode === "finish" ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-lime-300/20 bg-lime-300/[0.06] p-3 text-sm leading-6 text-slate-300">
              SYNC adjusts the next workout after this debrief. It will not rewrite today’s exercise plan while you are training.
            </div>
            <textarea value={coachNotes} onChange={(event) => setCoachNotes(event.target.value)} rows={5} placeholder="What felt strong? What hurt? What equipment was unavailable? Was the workout too easy, too hard, or the wrong length?" className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950 px-3 py-3 text-sm font-bold leading-6 text-white outline-none placeholder:text-slate-600" />
            <button type="button" onClick={buildCoachResponse} className="h-12 w-full rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-sm font-black text-cyan-100">Talk Through Workout with SYNC</button>
            {coachResponse ? <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] p-3 text-xs leading-5 text-cyan-50">{coachResponse}</div> : null}
            <button type="button" onClick={onFinish} className="h-12 w-full rounded-2xl border border-lime-300/30 bg-lime-300 text-sm font-black text-black">Review and Finish Workout</button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
