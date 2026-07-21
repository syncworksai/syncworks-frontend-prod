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
    equipment: ["Bodyweight", "Floor space"],
    description: "Use your saved home equipment and available floor space.",
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
    equipment: ["Dumbbells", "Cardio machine", "Cable station"],
    description: "Use a compact travel-friendly workout.",
  },
  {
    id: "outdoors",
    name: "Outdoors",
    type: "outdoors",
    equipment: ["Bodyweight", "Open space"],
    description: "Use walking, running, bodyweight, and portable equipment.",
  },
];

const EQUIPMENT_GROUPS = [
  {
    id: "free-weights",
    label: "Free Weights",
    items: [
      "Dumbbells",
      "Barbells",
      "Weight plates",
      "Kettlebells",
      "EZ curl bar",
      "Trap bar",
      "Adjustable bench",
      "Flat bench",
      "Squat rack",
      "Power rack",
      "Smith machine",
    ],
  },
  {
    id: "cables",
    label: "Cables",
    items: [
      "Cable station",
      "Functional trainer",
      "Lat pulldown",
      "Seated cable row",
      "Cable crossover",
      "Rope attachment",
      "Straight bar attachment",
      "Ankle straps",
    ],
  },
  {
    id: "machines",
    label: "Strength Machines",
    items: [
      "Chest press",
      "Shoulder press",
      "Leg press",
      "Hack squat",
      "Leg extension",
      "Leg curl",
      "Calf raise",
      "Pec deck",
      "Assisted pull-up",
      "Back extension",
      "Ab machine",
      "Hip abductor/adductor",
    ],
  },
  {
    id: "cardio",
    label: "Cardio",
    items: [
      "Treadmill",
      "Elliptical",
      "Stationary bike",
      "Spin bike",
      "Rowing machine",
      "Stair climber",
      "Ski erg",
      "Air bike",
      "Indoor track",
    ],
  },
  {
    id: "mobility",
    label: "Mobility & Recovery",
    items: [
      "Stretching table",
      "Exercise mats",
      "Foam rollers",
      "Resistance bands",
      "Mini bands",
      "Yoga blocks",
      "Massage gun",
      "Mobility sticks",
    ],
  },
  {
    id: "functional",
    label: "Functional Training",
    items: [
      "Pull-up bar",
      "Dip station",
      "Battle ropes",
      "Sled",
      "Plyo boxes",
      "Medicine balls",
      "TRX / suspension trainer",
      "Sandbags",
      "Open turf",
    ],
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
          ? "border-lime-300/60 bg-lime-300/[0.10] shadow-[0_0_28px_rgba(112,255,61,0.16)]"
          : "border-white/10 bg-white/[0.035] hover:border-lime-300/25"
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
              ? "border-lime-300 bg-lime-300 text-black"
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
        {equipment.length > 6 ? (
          <span className="rounded-full border border-lime-300/20 bg-lime-300/[0.06] px-2.5 py-1 text-[9px] font-black text-lime-200">
            +{equipment.length - 6} more
          </span>
        ) : null}
      </div>
    </button>
  );
}

function EquipmentChecklist({ selected, onToggle }) {
  return (
    <div className="space-y-3">
      {EQUIPMENT_GROUPS.map((group) => (
        <details
          key={group.id}
          open={group.id === "free-weights" || group.id === "machines"}
          className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-black/25"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
            <span className="text-sm font-black text-white">{group.label}</span>
            <span className="rounded-full border border-lime-300/20 bg-lime-300/[0.06] px-2 py-1 text-[9px] font-black text-lime-200">
              {group.items.filter((item) => selected.includes(item)).length} selected
            </span>
          </summary>

          <div className="grid gap-2 border-t border-white/8 p-3 sm:grid-cols-2">
            {group.items.map((item) => {
              const active = selected.includes(item);

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => onToggle(item)}
                  className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                    active
                      ? "border-lime-300/50 bg-lime-300/[0.10] text-lime-100"
                      : "border-white/10 bg-white/[0.025] text-slate-300"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[10px] font-black ${
                      active
                        ? "border-lime-300 bg-lime-300 text-black"
                        : "border-white/20 text-transparent"
                    }`}
                  >
                    âœ“
                  </span>
                  <span className="text-xs font-bold">{item}</span>
                </button>
              );
            })}
          </div>
        </details>
      ))}
    </div>
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
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [dumbbellMax, setDumbbellMax] = useState("");
  const [notes, setNotes] = useState("");

  const allLocations = useMemo(() => {
    const savedIds = new Set(savedGyms.map((gym) => String(gym?.id || "")));

    return [
      ...savedGyms,
      ...QUICK_LOCATIONS.filter((location) => !savedIds.has(location.id)),
    ];
  }, [savedGyms]);

  if (!open) return null;

  const selected = allLocations.find(
    (location) => String(location?.id || "") === selectedId
  );

  function toggleEquipment(item) {
    setSelectedEquipment((previous) =>
      previous.includes(item)
        ? previous.filter((entry) => entry !== item)
        : [...previous, item]
    );
  }

  function addGym() {
    const cleanName = gymName.trim();
    if (!cleanName) return;

    const gym = {
      id: `gym-${Date.now()}`,
      name: cleanName,
      type: "gym",
      active: true,
      equipment: selectedEquipment,
      dumbbell_max_lb: dumbbellMax.trim(),
      notes:
        notes.trim() ||
        (dumbbellMax.trim()
          ? `Dumbbells up to ${dumbbellMax.trim()} lb`
          : ""),
      created_at: new Date().toISOString(),
      last_used_at: "",
    };

    const next = [...savedGyms, gym];
    setSavedGyms(next);
    writeSavedGyms(next);
    setSelectedId(gym.id);
    setShowAddGym(false);
    setGymName("");
    setSelectedEquipment([]);
    setDumbbellMax("");
    setNotes("");
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
      gym?.id === location.id ? { ...gym, last_used_at: now } : gym
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

      <section className="relative z-[146] flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-lime-300/25 bg-[#040705] shadow-[0_30px_100px_rgba(0,0,0,0.78)]">
        <header className="border-b border-white/10 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-lime-300">
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
            className="mt-4 h-12 w-full rounded-2xl border border-dashed border-lime-300/35 bg-lime-300/[0.06] text-sm font-black text-lime-100"
          >
            {showAddGym ? "Cancel Gym Setup" : "Build and Save a Gym"}
          </button>

          {showAddGym ? (
            <div className="mt-3 rounded-[1.5rem] border border-lime-300/20 bg-white/[0.035] p-4">
              <div className="text-lg font-black text-white">Build your gym</div>
              <div className="mt-1 text-xs leading-5 text-slate-400">
                Tap the equipment available here. SYNC will use this list for
                substitutions and future workouts.
              </div>

              <input
                value={gymName}
                onChange={(event) => setGymName(event.target.value)}
                placeholder="Gym name, such as YMCA, Planet Fitness, or Home Gym"
                className="mt-4 h-12 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-lime-300/45"
              />

              <div className="mt-4">
                <EquipmentChecklist
                  selected={selectedEquipment}
                  onToggle={toggleEquipment}
                />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input
                  value={dumbbellMax}
                  onChange={(event) => setDumbbellMax(event.target.value)}
                  inputMode="decimal"
                  placeholder="Max dumbbell weight (lb)"
                  className="h-12 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-lime-300/45"
                />

                <input
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional notes"
                  className="h-12 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-lime-300/45"
                />
              </div>

              <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3 text-xs text-slate-400">
                {selectedEquipment.length
                  ? `${selectedEquipment.length} equipment items selected`
                  : "No equipment selected yet"}
              </div>

              <button
                type="button"
                onClick={addGym}
                disabled={!gymName.trim()}
                className="mt-3 h-13 w-full rounded-2xl bg-lime-300 px-4 py-3 text-sm font-black text-black shadow-[0_0_26px_rgba(112,255,61,0.20)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save and Select Gym
              </button>
            </div>
          ) : null}
        </div>

        <footer className="border-t border-white/10 bg-black/55 p-4">
          <button
            type="button"
            disabled={!selected}
            onClick={continueWorkout}
            className="h-14 w-full rounded-2xl border border-lime-300/70 bg-lime-300 text-base font-black uppercase tracking-[0.1em] text-black shadow-[0_0_34px_rgba(112,255,61,0.24)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Adapt and Continue
          </button>

          <div className="mt-2 text-center text-[10px] font-bold leading-4 text-slate-500">
            Locations are saved for future sessions. You can change locations
            every workout without losing progress.
          </div>
        </footer>
      </section>
    </div>
  );
}
