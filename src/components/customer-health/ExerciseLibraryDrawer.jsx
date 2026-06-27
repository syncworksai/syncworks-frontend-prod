// src/components/customer-health/ExerciseLibraryDrawer.jsx
import React, { useEffect, useMemo, useState } from "react";
import HealthDrawer from "./HealthDrawer";
import ExerciseDetailDrawer from "./ExerciseDetailDrawer";
import HealthBodyMapDrawer from "./HealthBodyMapDrawer";
import {
  HEALTH_EXERCISE_CATALOG,
  readExerciseFavorites,
  trackExerciseLibraryKpi,
  writeExerciseFavorites,
} from "./healthExerciseCatalog";
import {
  exerciseMatchesBodyGroup,
} from "./healthBodyMapConfig";
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
  const [bodyMapOpen, setBodyMapOpen] = useState(false);
  const [favorites, setFavorites] = useState(() =>
    readExerciseFavorites()
  );

  useEffect(() => {
    if (!open) return;

    trackExerciseLibraryKpi("library_opened");

    try {
      const raw = window.localStorage.getItem(
        "sw_health_library_builder_intent"
      );
      const intent = raw ? JSON.parse(raw) : null;
      const focus = String(intent?.focus || "").toLowerCase();

      if (focus === "arms") {
        setSearch("biceps");
      } else if (focus === "abs") {
        setSearch("core");
      } else if (focus === "push") {
        setSearch("press");
      } else if (focus === "pull") {
        setSearch("row");
      } else if (focus === "legs") {
        setSearch("leg");
      } else if (focus === "mobility") {
        setSearch("mobility");
      } else if (focus === "recovery") {
        setSearch("stretch");
      } else if (
        focus === "full-body" ||
        focus === "custom"
      ) {
        setSearch("");
        setMuscle("All");
      }
    } catch {
      // Builder intent is best effort.
    }
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
        exerciseMatchesBodyGroup(exercise, muscle) &&
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
      selected_muscle_filter: muscle,
      active_search: search.trim(),
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
      avoid: (exercise.mistakes || []).join(" | "),
      sportBenefit: exercise.movement_pattern,
      suggestion: `${exercise.sets} sets | ${exercise.reps} reps | ${exercise.rest} rest`,
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

  function selectBodyMuscle(nextMuscle) {
    setMuscle(nextMuscle);

    trackExerciseLibraryKpi("library_filtered_from_body_map", {
      muscle_group: nextMuscle,
    });
  }

  return (
    <>
      <HealthDrawer
        open={open}
        onClose={onClose}
        title="Visual Exercise Library"
        subtitle="Search, choose a focus, add exercises, and build a workout the coach can review."
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-lime-300/20 bg-lime-300/[0.07] p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-lime-200">
              Build Your Own
            </div>
            <div className="mt-1 text-sm font-black text-white">
              Add the movements you want today
            </div>
            <div className="mt-1 text-xs leading-5 text-slate-400">
              Choose arms, abs, strength, mobility, or any combination. Added exercises go into your current workout so the coach can guide sets, rest, effort, form, and pain.
            </div>
          </div>
          <div className="sticky top-0 z-10 -mx-1 space-y-3 bg-[#07101f]/95 px-1 pb-3 backdrop-blur-xl">
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search exercise, muscle, equipment..."
                className="h-12 min-w-0 rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
              />

              <button
                type="button"
                onClick={() => {
                  setBodyMapOpen(true);
                  trackExerciseLibraryKpi("body_map_opened");
                }}
                className="h-12 rounded-2xl border border-cyan-300/35 bg-cyan-300/10 px-4 text-xs font-black text-cyan-100 shadow-[0_0_24px_rgba(52,223,255,0.10)]"
              >
                Body Map
              </button>
            </div>

            {muscle !== "All" ? (
              <div className="flex items-center justify-between rounded-2xl border border-emerald-300/25 bg-emerald-300/10 px-3 py-2">
                <div className="text-xs font-black text-emerald-100">
                  Muscle: {muscle}
                </div>
                <button
                  type="button"
                  onClick={() => setMuscle("All")}
                  className="text-xs font-black text-emerald-200"
                >
                  Clear
                </button>
              </div>
            ) : null}

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
                          {exercise.primary_muscles.join(", ")}  | {" "}
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
                      {exercise.sets} sets x {exercise.reps}
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

      <HealthBodyMapDrawer
        open={bodyMapOpen}
        onClose={() => setBodyMapOpen(false)}
        selectedMuscle={muscle}
        onSelectMuscle={selectBodyMuscle}
      />

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
