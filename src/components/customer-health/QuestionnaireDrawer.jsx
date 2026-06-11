// src/components/customer-health/QuestionnaireDrawer.jsx
import React from "react";
import HealthDrawer from "./HealthDrawer";

const GOALS = [
  "General fitness",
  "Fat loss",
  "Muscle gain",
  "Strength",
  "Sport performance",
  "Mobility / pain reduction",
  "Rehab / strengthen weak areas",
  "Better energy / longevity",
];

const SPORTS = [
  "",
  "Baseball / Softball",
  "Football",
  "Golf",
  "Basketball",
  "Running",
  "Soccer",
  "Tennis",
  "Combat sports",
  "Other",
];

const WEAK_AREAS = ["Hip", "Knee", "Shoulder", "Back", "Neck", "Ankle", "Wrist", "Core", "Mobility", "Endurance"];

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-slate-400">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option || "None"}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function QuestionnaireDrawer({ open, onClose, profile, setProfile, snapshot, setSnapshot }) {
  function toggleWeakArea(area) {
    const current = Array.isArray(profile.weak_areas) ? profile.weak_areas : [];

    if (current.includes(area)) {
      setProfile((p) => ({ ...p, weak_areas: current.filter((x) => x !== area) }));
    } else {
      setProfile((p) => ({ ...p, weak_areas: [...current, area] }));
    }
  }

  return (
    <HealthDrawer
      open={open}
      onClose={onClose}
      title="Health Questionnaire"
      subtitle="This builds the user’s training profile and helps guide workouts."
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="What are you training for?"
            value={profile.primary_goal}
            onChange={(value) => {
              setProfile((p) => ({ ...p, primary_goal: value }));
              setSnapshot((p) => ({ ...p, goal: value }));
            }}
            options={GOALS}
          />

          <Select
            label="Sport"
            value={profile.sport}
            onChange={(value) => setProfile((p) => ({ ...p, sport: value }))}
            options={SPORTS}
          />

          <Select
            label="Current ability"
            value={profile.experience}
            onChange={(value) => setProfile((p) => ({ ...p, experience: value }))}
            options={["Beginner", "Intermediate", "Advanced"]}
          />

          <Select
            label="Training days per week"
            value={profile.training_days}
            onChange={(value) => setProfile((p) => ({ ...p, training_days: value }))}
            options={["2", "3", "4", "5", "6"]}
          />

          <Select
            label="Equipment"
            value={profile.preferred_equipment}
            onChange={(value) => {
              setProfile((p) => ({ ...p, preferred_equipment: value }));
              setSnapshot((p) => ({ ...p, equipment: value }));
            }}
            options={["Bodyweight", "Dumbbells", "Full gym", "Bands", "Cardio only", "Home gym"]}
          />

          <Select
            label="Preferred workout time"
            value={profile.preferred_time}
            onChange={(value) => setProfile((p) => ({ ...p, preferred_time: value }))}
            options={["Morning", "Lunch", "Afternoon", "Evening", "Flexible"]}
          />
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-sm font-black text-white">Areas to strengthen or protect</div>
          <div className="mt-1 text-xs leading-5 text-slate-400">
            This helps the app recommend support movements and avoid pushing the wrong direction.
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {WEAK_AREAS.map((area) => {
              const active = Array.isArray(profile.weak_areas) && profile.weak_areas.includes(area);

              return (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggleWeakArea(area)}
                  className={
                    active
                      ? "rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-100"
                      : "rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-black text-slate-300"
                  }
                >
                  {area}
                </button>
              );
            })}
          </div>
        </div>

        <label className="block">
          <div className="mb-1 text-xs font-semibold text-slate-400">Ailments, limitations, or notes</div>
          <textarea
            value={profile.limitations}
            onChange={(e) => setProfile((p) => ({ ...p, limitations: e.target.value }))}
            rows={4}
            placeholder="Example: hip tightness, shoulder pain, knee weakness, lower back stiffness..."
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
          />
        </label>

        <label className="block">
          <div className="mb-1 text-xs font-semibold text-slate-400">Motivation / personal goal</div>
          <textarea
            value={profile.motivation}
            onChange={(e) => setProfile((p) => ({ ...p, motivation: e.target.value }))}
            rows={3}
            placeholder="Example: move better for softball, lose 20 pounds, get stronger, stay healthy for family..."
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
          />
        </label>

        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
          Health guidance here is fitness support, not medical diagnosis. Pain, injury, or medical issues should be reviewed with a qualified professional.
        </div>
      </div>
    </HealthDrawer>
  );
}