// src/components/customer-health/ExerciseLibraryDrawer.jsx
import React, { useEffect, useMemo, useState } from "react";
import HealthDrawer from "./HealthDrawer";
import ExerciseDetailDrawer from "./ExerciseDetailDrawer";
import {
  HEALTH_EXERCISE_CATALOG,
  readExerciseFavorites,
  trackExerciseLibraryKpi,
  writeExerciseFavorites,
} from "./healthExerciseCatalog";
import { speakCoachText } from "./healthCoachVoice";

function unique(values) {
  return ["All", ...Array.from(new Set(values.filter(Boolean))).sort()];
}

function matchesText(exercise, search) {
  const query = String(search || "").trim().toLowerCase();
  if (!query) return true;

  const haystack = [
    exercise.name,
    exercise.equipment,
    exercise.location,
    exercise.category,
    exercise.movement_pattern,
    exercise.feel,
    ...(exercise.primary_muscles || []),
    ...(exercise.secondary_muscles || []),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function ExerciseImage({ exercise }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/20 via-slate-950 to-fuchsia-500/15">
      {!failed ? (
        <img
          src={exercise.image}
          alt={exercise.name}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : null}
      {failed ? (
        <div className="flex h-full w-full items-center justify-center p-2 text-center">
          <div>
            <div className="text-3xl">🏋️</div>
            <div className="mt-1 line-clamp-2 text-[10px] font-black text-white">
              {exercise.name}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ExerciseLibraryDrawer({
  open,
  onClose,
  onAddExercise,
}) {
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState("All");
  const [equipment, setEquipment] = useState("All");
  const [location, setLocation] = useState("All");
  const [selected, setSelected] = useState(null);
  const [favorites, setFavorites] = useState(() =>
    readExerciseFavorites()
  );

  useEffect(() => {
    if (!open) return;
    trackExerciseLibraryKpi("library_opened");
  }, [open]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search.trim()) {
        trackExerciseLibraryKpi("library_searched", {
          query: search.trim(),
        });
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [search]);

  const muscles = useMemo(
    () =>
      unique(
        HEALTH_EXERCISE_CATALOG.flatMap(
          (exercise) => exercise.primary_muscles || []
        )
      ),
    []
  );

  const equipmentOptions = useMemo(
    () =>
      unique(
        HEALTH_EXERCISE_CATALOG.map(
          (exercise) => exercise.equipment
        )
      ),
    []
  );

  const locations = useMemo(
    () =>
      unique(
        HEALTH_EXERCISE_CATALOG.map(
          (exercise) => exercise.location
        )
      ),
    []
  );

  const list = useMemo(() => {
    return HEALTH_EXERCISE_CATALOG.filter(
      (exercise) =>
        matchesText(exercise, search) &&
        (muscle === "All" ||
          exercise.primary_muscles.includes(muscle)) &&
        (equipment === "All" ||
          exercise.equipment === equipment) &&
        (location === "All" ||
          exercise.location === location)
    ).sort((a, b) => {
      const aFavorite = favorites.includes(a.id) ? 1 : 0;
      const bFavorite = favorites.includes(b.id) ? 1 : 0;
      return bFavorite - aFavorite || a.name.localeCompare(b.name);
    });
  }, [search, muscle, equipment, location, favorites]);

  function toggleFavorite(exercise) {
    const next = favorites.includes(exercise.id)
      ? favorites.filter((id) => id !== exercise.id)
      : [...favorites, exercise.id];

    setFavorites(next);
    writeExerciseFavorites(next);
    trackExerciseLibraryKpi("favorite_toggled", {
      exercise_id: exercise.id,
      favorite: next.includes(exercise.id),
    });
  }

  function openDetails(exercise) {
    setSelected(exercise);
    trackExerciseLibraryKpi("exercise_details_opened", {
      exercise_id: exercise.id,
    });
  }

  function addExercise(exercise, reason = "exercise") {
    trackExerciseLibraryKpi("exercise_added", {
      exercise_id: exercise.id,
      reason,
    });

    speakCoachText({
      text:
        reason === "variation"
          ? `${exercise.name} added as an extra variation. I will track the added volume and adjust future recommendations.`
          : `${exercise.name} added to your workout. I will adapt the session and track how you perform.`,
      audioMode: "essential",
      voicePreference: "auto",
      rate: 0.98,
    });

    onAddExercise?.({
      ...exercise,
      group: exercise.primary_muscles[0] || "Other",
      trains: [
        ...(exercise.primary_muscles || []),
        ...(exercise.secondary_muscles || []),
      ].join(", "),
      avoid: (exercise.mistakes || []).join(" • "),
      sportBenefit: exercise.movement_pattern,
      suggestion: `${exercise.sets} sets • ${exercise.reps} reps • ${exercise.rest} rest`,
    });
  }

  function selectAlternative(alternative, original) {
    trackExerciseLibraryKpi("exercise_alternative_selected", {
      original_exercise_id: original?.id,
      alternative_exercise_id: alternative.id,
    });

    speakCoachText({
      text: `${alternative.name} selected. It keeps the ${alternative.movement_pattern.toLowerCase()} goal while using ${alternative.equipment}.`,
      audioMode: "essential",
      voicePreference: "auto",
      rate: 0.98,
    });

    addExercise(alternative, "alternative");
    setSelected(alternative);
  }

  return (
    <>
      <HealthDrawer
        open={open}
        onClose={onClose}
        title="Visual Exercise Library"
        subtitle="Search, learn, swap equipment, add variations, and let the coach adapt."
      >
        <div className="space-y-4">
          <div className="sticky top-0 z-10 -mx-1 space-y-3 bg-[#07101f]/95 px-1 pb-3 backdrop-blur-xl">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search chest, cable, triceps, hip flexor..."
              className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
            />

            <div className="grid grid-cols-3 gap-2">
              <select
                value={muscle}
                onChange={(event) => setMuscle(event.target.value)}
                className="h-10 rounded-xl border border-white/10 bg-slate-950 px-2 text-xs font-bold text-white"
              >
                {muscles.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>

              <select
                value={equipment}
                onChange={(event) => setEquipment(event.target.value)}
                className="h-10 rounded-xl border border-white/10 bg-slate-950 px-2 text-xs font-bold text-white"
              >
                {equipmentOptions.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>

              <select
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="h-10 rounded-xl border border-white/10 bg-slate-950 px-2 text-xs font-bold text-white"
              >
                {locations.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs font-bold text-slate-500">
            {list.length} exercise{list.length === 1 ? "" : "s"} found
          </div>

          <div className="grid gap-3">
            {list.map((exercise) => (
              <article
                key={exercise.id}
                className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-3"
              >
                <div className="flex gap-3">
                  <ExerciseImage exercise={exercise} />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => openDetails(exercise)}
                        className="min-w-0 text-left"
                      >
                        <div className="truncate text-base font-black text-white">
                          {exercise.name}
                        </div>
                        <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
                          {exercise.primary_muscles.join(", ")} •{" "}
                          {exercise.equipment}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleFavorite(exercise)}
                        className="h-9 w-9 shrink-0 rounded-xl border border-white/10 bg-white/[0.04] text-lg"
                        aria-label="Toggle favorite"
                      >
                        {favorites.includes(exercise.id) ? "★" : "☆"}
                      </button>
                    </div>

                    <div className="mt-2 text-xs font-bold text-cyan-100">
                      {exercise.sets} sets × {exercise.reps}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => openDetails(exercise)}
                        className="h-10 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-black text-white"
                      >
                        Details / Swap
                      </button>

                      <button
                        type="button"
                        onClick={() => addExercise(exercise)}
                        className="h-10 rounded-xl border border-emerald-300/25 bg-emerald-300/10 text-xs font-black text-emerald-100"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {!list.length ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center">
              <div className="text-lg font-black text-white">
                No matching exercises
              </div>
              <div className="mt-2 text-sm text-slate-400">
                Try a broader muscle, equipment, or movement search.
              </div>
            </div>
          ) : null}
        </div>
      </HealthDrawer>

      <ExerciseDetailDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        exercise={selected}
        onAdd={addExercise}
        onSelectAlternative={selectAlternative}
      />
    </>
  );
}
