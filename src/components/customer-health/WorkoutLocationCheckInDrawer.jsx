// src/components/customer-health/WorkoutLocationCheckInDrawer.jsx
import React, { useMemo, useState } from "react";

import {
  readHealthCoachingContext,
  readSavedGyms,
  writeHealthCoachingContext,
  writeSavedGyms,
} from "./healthCoachingContext";

const QUICK_LOCATIONS = [
  {
    id: "home",
    name: "Home",
    type: "home",
    equipment: ["Bodyweight"],
    description: "Use your saved home equipment and floor space.",
  },
  {
    id: "bodyweight",
    name: "Floor / Bodyweight",
    type: "bodyweight",
    equipment: ["Bodyweight", "Floor space"],
    description: "No machines required. Build around bodyweight and mobility.",
  },
  {
    id: "hotel",
    name: "Hotel Gym",
    type: "hotel",
    equipment: ["Dumbbells", "Cardio"],
    description: "Use a compact travel-friendly workout.",
  },
  {
    id: "outdoors",
    name: "Outdoors",
    type: "outdoors",
    equipment: ["Bodyweight", "Open space"],
    description: "Use running, walking, bodyweight, and portable equipment.",
  },
];

function normalizeEquipment(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function LocationCard({ location, active, onClick }) {
  const equipment = normalizeEquipment(location?.equipment);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[1.35rem] border p-4 text-left transition active:scale-[0.99] ${
        active
          ? "border-emerald-300/55 bg-emerald-300/[0.10] shadow-[0_0_28px_rgba(0,245,106,0.12)]"
          : "border-white/10 bg-white/[0.035] hover:border-emerald-300/25"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-black text-white">
            {location?.name || "Training Location"}
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-400">
            {location?.description ||
              location?.notes ||
              "Use this location's saved equipment."}
          </div>
        </div>

        <div
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
            active
              ? "border-emerald-300 bg-emerald-400 text-black"
              : "border-white/15 text-transparent"
          }`}
        >
          <span className="text-xs font-black">OK</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {(equipment.length ? equipment : ["Equipment not set"])
          .slice(0, 6)
          .map((item) => (
            <span
              key={item}
              className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-slate-300"
            >
              {item}
            </span>
          ))}
      </div>
    </button>
  );
}

export default function WorkoutLocationCheckInDrawer({
  open,
  workout,
  onClose,
  onConfirm,
}) {
  const [savedGyms, setSavedGyms] = useState(() => readSavedGyms());
  const [selectedId, setSelectedId] = useState("");
  const [showAddGym, setShowAddGym] = useState(false);
  const [gymName, setGymName] = useState("");
  const [equipmentText, setEquipmentText] = useState("");
  const [dumbbellMax, setDumbbellMax] = useState("");

  const allLocations = useMemo(() => {
    const savedIds = new Set(
      savedGyms.map((gym) => String(gym?.id || ""))
    );

    return [
      ...savedGyms,
      ...QUICK_LOCATIONS.filter(
        (location) => !savedIds.has(location.id)
      ),
    ];
  }, [savedGyms]);

  if (!open) return null;

  const selected = allLocations.find(
    (location) => String(location?.id || "") === selectedId
  );

  function addGym() {
    const cleanName = gymName.trim();
    if (!cleanName) return;

    const gym = {
      id: `gym-${Date.now()}`,
      name: cleanName,
      type: "gym",
      active: true,
      equipment: normalizeEquipment(equipmentText),
      dumbbell_max_lb: dumbbellMax.trim(),
      notes: dumbbellMax.trim()
        ? `Dumbbells up to ${dumbbellMax.trim()} lb`
        : "",
      created_at: new Date().toISOString(),
      last_used_at: "",
    };

    const next = [...savedGyms, gym];
    setSavedGyms(next);
    writeSavedGyms(next);
    setSelectedId(gym.id);
    setShowAddGym(false);
    setGymName("");
    setEquipmentText("");
    setDumbbellMax("");
  }

  function continueWorkout() {
    if (!selected) return;

    const now = new Date().toISOString();
    const location = {
      ...selected,
      equipment: normalizeEquipment(selected.equipment),
      selected_at: now,
      last_used_at: now,
    };

    const nextGyms = savedGyms.map((gym) =>
      gym?.id === location.id
        ? { ...gym, last_used_at: now }
        : gym
    );

    writeSavedGyms(nextGyms);

    const context = readHealthCoachingContext();
    writeHealthCoachingContext({
      ...context,
      current_location: {
        location_id: location.id,
        location_name: location.name,
        location_type: location.type || "gym",
        selected_at: now,
        equipment_override: location.equipment,
      },
      daily_state: {
        ...context.daily_state,
        workout_location_id: location.id,
        next_best_action: "Complete pre-workout readiness check",
      },
    });

    onConfirm?.(location);
  }

  return (
    <div className="fixed inset-0 z-[145] flex items-end justify-center bg-black/90 p-3 backdrop-blur-xl sm:items-center">
      <button
        type="button"
        aria-label="Close workout location"
        onClick={onClose}
        className="absolute inset-0"
      />

      <section className="relative z-[146] flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-emerald-300/25 bg-[#040705] shadow-[0_30px_100px_rgba(0,0,0,0.78)]">
        <header className="border-b border-white/10 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
                Workout Location Check-In
              </div>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                Where are you training?
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                SYNC will adapt {workout?.workout_name || "today's workout"} to
                the equipment and space available right now.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-sm font-black text-white"
            >
              X
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {allLocations.map((location) => (
              <LocationCard
                key={location.id}
                location={location}
                active={selectedId === location.id}
                onClick={() => setSelectedId(location.id)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowAddGym((current) => !current)}
            className="mt-4 h-12 w-full rounded-2xl border border-dashed border-emerald-300/30 bg-emerald-300/[0.05] text-sm font-black text-emerald-100"
          >
            {showAddGym ? "Cancel New Gym" : "Add or Save Another Gym"}
          </button>

          {showAddGym ? (
            <div className="mt-3 rounded-[1.35rem] border border-white/10 bg-white/[0.035] p-4">
              <div className="text-sm font-black text-white">
                Save this gym
              </div>

              <input
                value={gymName}
                onChange={(event) => setGymName(event.target.value)}
                placeholder="Gym name, such as YMCA or Hotel Fitness Center"
                className="mt-3 h-12 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-emerald-300/45"
              />

              <textarea
                value={equipmentText}
                onChange={(event) => setEquipmentText(event.target.value)}
                placeholder="Equipment, separated by commas: barbell, squat rack, cables, leg press..."
                rows={3}
                className="mt-3 w-full rounded-2xl border border-white/10 bg-black/35 p-4 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-emerald-300/45"
              />

              <input
                value={dumbbellMax}
                onChange={(event) => setDumbbellMax(event.target.value)}
                inputMode="decimal"
                placeholder="Maximum dumbbell weight in pounds"
                className="mt-3 h-12 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-emerald-300/45"
              />

              <button
                type="button"
                onClick={addGym}
                disabled={!gymName.trim()}
                className="mt-3 h-12 w-full rounded-2xl bg-emerald-400 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save and Select Gym
              </button>
            </div>
          ) : null}
        </div>

        <footer className="border-t border-white/10 bg-black/45 p-4">
          <button
            type="button"
            disabled={!selected}
            onClick={continueWorkout}
            className="h-14 w-full rounded-2xl border border-emerald-300/60 bg-emerald-400 text-base font-black uppercase tracking-[0.1em] text-black shadow-[0_0_30px_rgba(0,245,106,0.20)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Adapt and Continue
          </button>

          <div className="mt-2 text-center text-[10px] font-bold leading-4 text-slate-500">
            You can change locations every session. Performance is recorded
            with the location used so lighter hotel or home loads are not
            treated as lost progress.
          </div>
        </footer>
      </section>
    </div>
  );
}
