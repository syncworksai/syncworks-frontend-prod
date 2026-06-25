// src/components/customer-health/ExerciseDetailDrawer.jsx
import React from "react";
import HealthDrawer from "./HealthDrawer";
import {
  buildExerciseCoachSpeech,
  getExerciseAlternatives,
  getExerciseVariations,
  trackExerciseLibraryKpi,
} from "./healthExerciseCatalog";
import { speakCoachText } from "./healthCoachVoice";

function Pill({ children }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-black text-slate-200">
      {children}
    </span>
  );
}

export default function ExerciseDetailDrawer({
  open,
  onClose,
  exercise,
  onAdd,
  onSelectAlternative,
  audioMode = "essential",
  voicePreference = "auto",
}) {
  if (!exercise) return null;

  const alternatives = getExerciseAlternatives(exercise);
  const variations = getExerciseVariations(exercise);

  function hearCoach() {
    trackExerciseLibraryKpi("exercise_audio_played", {
      exercise_id: exercise.id,
    });

    speakCoachText({
      text: buildExerciseCoachSpeech(exercise),
      audioMode,
      voicePreference,
      rate: 0.96,
    });
  }

  return (
    <HealthDrawer
      open={open}
      onClose={onClose}
      title={exercise.name}
      subtitle={`${exercise.primary_muscles.join(", ")} • ${exercise.equipment}`}
    >
      <div className="space-y-4">
        <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-cyan-500/15 via-slate-950 to-fuchsia-500/10">
          <div className="relative aspect-[16/9]">
            <img
              src={exercise.image}
              alt={exercise.name}
              className="h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center p-5 text-center">
              <div>
                <div className="text-5xl">🏋️</div>
                <div className="mt-3 text-xl font-black text-white">
                  {exercise.name}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Pill>{exercise.category}</Pill>
          <Pill>{exercise.location}</Pill>
          <Pill>{exercise.difficulty}</Pill>
          <Pill>{exercise.movement_pattern}</Pill>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            ["Sets", exercise.sets],
            ["Reps", exercise.reps],
            ["Rest", exercise.rest],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center"
            >
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                {label}
              </div>
              <div className="mt-1 text-sm font-black text-white">
                {value}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={hearCoach}
          className="h-12 w-full rounded-2xl border border-cyan-300/30 bg-cyan-300/10 text-sm font-black text-cyan-100"
        >
          🔊 Hear Coach Instructions
        </button>

        <section className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">
            What you should feel
          </div>
          <div className="mt-2 text-sm leading-6 text-emerald-50">
            {exercise.feel}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-sm font-black text-white">How to perform it</div>
          <ol className="mt-3 space-y-2">
            {(exercise.instructions || []).map((instruction, index) => (
              <li key={instruction} className="flex gap-3 text-sm leading-6 text-slate-300">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-300/10 text-xs font-black text-cyan-100">
                  {index + 1}
                </span>
                {instruction}
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-4">
          <div className="text-sm font-black text-amber-100">Common mistakes</div>
          <div className="mt-2 text-sm leading-6 text-amber-50/90">
            {(exercise.mistakes || []).join(" • ")}
          </div>
          {exercise.safety ? (
            <div className="mt-3 border-t border-amber-200/10 pt-3 text-sm leading-6 text-amber-100">
              {exercise.safety}
            </div>
          ) : null}
        </section>

        {alternatives.length ? (
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-black text-white">
              Equipment unavailable? Swap it
            </div>
            <div className="mt-3 grid gap-2">
              {alternatives.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectAlternative?.(item, exercise)}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-left"
                >
                  <div>
                    <div className="text-sm font-black text-white">{item.name}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {item.equipment} • {item.primary_muscles.join(", ")}
                    </div>
                  </div>
                  <span className="text-cyan-200">Swap</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {variations.length ? (
          <section className="rounded-3xl border border-fuchsia-300/20 bg-fuchsia-300/10 p-4">
            <div className="text-sm font-black text-fuchsia-100">
              Add a variation
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {variations.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onAdd?.(item, "variation")}
                  className="rounded-2xl border border-fuchsia-200/20 bg-black/20 px-3 py-2 text-xs font-black text-fuchsia-50"
                >
                  + {item.name}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <button
          type="button"
          onClick={() => onAdd?.(exercise, "exercise")}
          className="h-13 w-full rounded-2xl border border-emerald-300/35 bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-3 text-sm font-black text-white"
        >
          Add to Workout
        </button>
      </div>
    </HealthDrawer>
  );
}
