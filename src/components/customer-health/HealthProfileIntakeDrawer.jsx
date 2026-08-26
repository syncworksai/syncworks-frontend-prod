// src/components/customer-health/HealthProfileIntakeDrawer.jsx
import React, { useEffect, useMemo, useState } from "react";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function calculateBmi({ weight, heightFt, heightIn }) {
  const pounds = safeNumber(weight, 0);
  const inches = safeNumber(heightFt, 0) * 12 + safeNumber(heightIn, 0);
  if (pounds <= 0 || inches <= 0) return "";
  return String(Math.round(((pounds / (inches * inches)) * 703) * 10) / 10);
}

function normalizeTrainingLocation(value) {
  const clean = String(value || "").trim().toLowerCase();
  if (!clean) return "Home";
  if (clean === "gym" || clean === "commercial gym") return "Gym";
  if (clean === "home gym" || clean === "homegym") return "Home Gym";
  if (clean === "home") return "Home";
  if (clean === "outside" || clean === "outdoors") return "Outdoors";
  if (clean.includes("hotel") || clean.includes("travel")) return "Hotel / Travel";
  return "Other";
}

function equipmentList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const TRAINING_LOCATIONS = ["Home", "Home Gym", "Gym", "Outdoors", "Hotel / Travel", "Other"];

const GYM_EQUIPMENT_OPTIONS = [
  "Bodyweight",
  "Dumbbells",
  "Adjustable dumbbells",
  "Barbell",
  "Bench",
  "Squat rack",
  "Smith machine",
  "Cable machine",
  "Cable attachments",
  "Lat pulldown",
  "Seated row",
  "Leg press",
  "Leg extension",
  "Leg curl",
  "Chest press",
  "Shoulder press",
  "Pull-up bar",
  "Resistance bands",
  "Kettlebells",
  "Treadmill",
  "Stationary bike",
  "Rowing machine",
  "Elliptical",
  "Stair climber",
];

function FieldLabel({ children }) {
  return <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500 sm:text-[10px]">{children}</div>;
}

function TextInput({ label, value, onChange, type = "text", inputMode, placeholder }) {
  return (
    <label className="block min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        inputMode={inputMode}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1.5 h-10 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-[12px] font-bold text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40 sm:mt-2 sm:h-11 sm:rounded-2xl sm:text-sm"
      />
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <label className="block min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <textarea
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-[12px] font-bold leading-5 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40 sm:mt-2 sm:rounded-2xl sm:text-sm sm:leading-6"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-10 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-[12px] font-bold text-white outline-none focus:border-cyan-300/40 sm:mt-2 sm:h-11 sm:rounded-2xl sm:text-sm"
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function StepButton({ active, complete, label, number, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "min-h-12 rounded-xl border px-2 py-2 text-left transition sm:rounded-2xl sm:px-3 sm:py-3",
        active
          ? "border-cyan-300/35 bg-cyan-300/12 text-cyan-100"
          : complete
          ? "border-blue-300/25 bg-blue-400/[0.07] text-blue-100"
          : "border-white/10 bg-white/[0.03] text-slate-400"
      )}
    >
      <div className="text-[8px] font-black uppercase tracking-[0.12em] opacity-70 sm:text-[9px]">Step {number}</div>
      <div className="mt-0.5 text-[10px] font-black leading-3 sm:mt-1 sm:text-sm sm:leading-normal">{label}</div>
    </button>
  );
}

function EquipmentBuilder({ open, onToggle, value, onChange }) {
  const selected = equipmentList(value);

  function toggle(item) {
    const next = selected.includes(item)
      ? selected.filter((entry) => entry !== item)
      : [...selected, item];
    onChange(next.join(", "));
  }

  return (
    <div className="sm:col-span-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="h-10 flex-1 rounded-xl border border-cyan-300/25 bg-cyan-300/[0.07] px-3 text-left text-[11px] font-black text-cyan-100"
        >
          {open ? "Hide Gym Builder" : "Build Gym / Equipment"}
        </button>
        <span className="shrink-0 text-[9px] font-bold text-slate-500">{selected.length} selected</span>
      </div>

      {open ? (
        <div className="mt-2 rounded-2xl border border-blue-400/20 bg-blue-500/[0.05] p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-300">Your equipment</div>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">
            Tap everything available here. SYNC uses this list when building workouts and finding exercise swaps.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {GYM_EQUIPMENT_OPTIONS.map((item) => {
              const active = selected.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggle(item)}
                  className={cx(
                    "min-h-10 rounded-xl border px-2 py-2 text-[10px] font-black",
                    active
                      ? "border-cyan-300/35 bg-cyan-300/12 text-cyan-100"
                      : "border-white/10 bg-white/[0.025] text-slate-400"
                  )}
                >
                  {item}
                </button>
              );
            })}
          </div>
          <label className="mt-3 block">
            <FieldLabel>Other equipment / attachments</FieldLabel>
            <input
              value={value || ""}
              onChange={(event) => onChange(event.target.value)}
              placeholder="Add anything else, separated by commas"
              className="mt-1.5 h-10 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-[11px] font-bold text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
            />
          </label>
        </div>
      ) : (
        <div className="mt-2 truncate text-[10px] text-slate-500">{value || "No equipment selected yet"}</div>
      )}
    </div>
  );
}

export default function HealthProfileIntakeDrawer({ open, onClose, profile, setProfile, snapshot, setSnapshot }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({});
  const [confirmed, setConfirmed] = useState(false);
  const [gymBuilderOpen, setGymBuilderOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setConfirmed(false);
    setGymBuilderOpen(false);
    setForm({
      first_name: profile?.first_name || "",
      age: profile?.age || "",
      sex: profile?.sex || "",
      height_ft: profile?.height_ft || "",
      height_in: profile?.height_in || "",
      weight: profile?.weight || snapshot?.weight || "",
      target_weight: profile?.target_weight || "",
      known_bmi: profile?.known_bmi || "",
      primary_goal: profile?.primary_goal || "General fitness",
      experience_level: profile?.experience_level || "Beginner",
      coaching_style: profile?.coaching_style || "Beginner Friendly",
      coach_audio_mode: profile?.coach_audio_mode || snapshot?.coach_audio_mode || "music_friendly",
      activity_level: profile?.activity_level || "Moderate",
      training_days: profile?.training_days || "3",
      training_location: normalizeTrainingLocation(profile?.training_location || snapshot?.training_location || "Home"),
      preferred_equipment:
        profile?.preferred_equipment ||
        (Array.isArray(profile?.available_equipment) ? profile.available_equipment.join(", ") : "") ||
        (Array.isArray(snapshot?.available_equipment) ? snapshot.available_equipment.join(", ") : "") ||
        snapshot?.equipment ||
        "Bodyweight",
      injuries: profile?.injuries || "",
      surgeries: profile?.surgeries || "",
      heart_conditions: profile?.heart_conditions || "",
      health_conditions: profile?.health_conditions || "",
      medications: profile?.medications || "",
      limitations: profile?.limitations || "",
      avoid_movements: profile?.avoid_movements || "",
      physician_restrictions: profile?.physician_restrictions || "",
      medical_clearance: profile?.medical_clearance || "Not needed",
      emergency_notes: profile?.emergency_notes || "",
      nutrition_goal: profile?.nutrition_goal || "Balanced nutrition",
      dietary_preferences: profile?.dietary_preferences || "",
      food_allergies: profile?.food_allergies || "",
      meals_per_day: profile?.meals_per_day || "3",
      nutrition_coach_enabled: profile?.nutrition_coach_enabled !== false,
    });
  }, [open, profile, snapshot]);

  const calculatedBmi = useMemo(
    () => calculateBmi({ weight: form.weight, heightFt: form.height_ft, heightIn: form.height_in }),
    [form.weight, form.height_ft, form.height_in]
  );

  if (!open) return null;

  const steps = ["Starting Point", "Medical & Movement", "Nutrition", "Review"];
  const patch = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));

  function saveProfile() {
    const completedAt = new Date().toISOString();
    const availableEquipment = equipmentList(form.preferred_equipment);
    const nextProfile = {
      ...profile,
      ...form,
      available_equipment: availableEquipment,
      bmi: form.known_bmi || calculatedBmi || "",
      bmi_source: form.known_bmi ? "user_entered" : calculatedBmi ? "calculated" : "",
      health_intake_completed_at: completedAt,
      health_intake_updated_at: completedAt,
      profile_version: 1,
    };

    setProfile?.(nextProfile);
    setSnapshot?.((previous) => ({
      ...previous,
      weight: form.weight || previous?.weight || "",
      goal: form.primary_goal || previous?.goal || "General fitness",
      last_profile_update_at: completedAt,
      health_profile_ready: true,
      experience_level: form.experience_level || "Beginner",
      coaching_style: form.coaching_style || "Beginner Friendly",
      coach_audio_mode: form.coach_audio_mode || "music_friendly",
      audible_trainer_enabled: (form.coach_audio_mode || "music_friendly") !== "music_friendly",
      training_location: form.training_location || "Home",
      available_equipment: availableEquipment,
      workout_equipment: availableEquipment,
      equipment: form.preferred_equipment || "Bodyweight",
    }));
    onClose?.();
  }

  return (
    <div className="fixed inset-x-0 bottom-0 top-[115px] z-[400] flex justify-end bg-black/80 backdrop-blur-xl sm:inset-0">
      <button type="button" aria-label="Close health profile" onClick={onClose} className="absolute inset-0" />

      <section className="relative z-[401] flex h-full w-full max-w-4xl flex-col overflow-hidden border-l border-cyan-300/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_26%),linear-gradient(180deg,#040812,#07111f)] shadow-[-30px_0_80px_rgba(0,0,0,0.6)]">
        <header className="shrink-0 border-b border-white/10 px-3 py-3 sm:px-6 sm:py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200 sm:text-[10px]">Build Your Health Profile</div>
              <h2 className="mt-1 text-xl font-black text-white sm:text-3xl">Build the coach around you</h2>
              <p className="mt-1 max-w-2xl text-[11px] leading-4 text-slate-400 sm:mt-2 sm:text-sm sm:leading-6">
                Add what you know today. You can update anything later as your health, goals, equipment, or medical guidance changes.
              </p>
            </div>
            <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sm font-black text-white sm:h-10 sm:w-10">×</button>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-1.5 sm:mt-4 sm:gap-2">
            {steps.map((label, index) => (
              <StepButton
                key={label}
                active={index === step}
                complete={index < step}
                label={label}
                number={index + 1}
                onClick={() => setStep(index)}
              />
            ))}
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 pb-28 sm:px-6 sm:py-5 sm:pb-28">
          {step === 0 ? (
            <div className="space-y-4">
              <div>
                <div className="text-base font-black text-white sm:text-xl">Starting point</div>
                <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-sm sm:leading-6">Your basic training setup, goals and equipment.</p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4">
                <TextInput label="First name" value={form.first_name} onChange={(value) => patch("first_name", value)} />
                <TextInput label="Age" value={form.age} onChange={(value) => patch("age", value)} inputMode="numeric" />
                <SelectField label="Sex used for estimates" value={form.sex || ""} onChange={(value) => patch("sex", value)} options={["", "Female", "Male", "Prefer not to say"]} />
                <SelectField label="Primary goal" value={form.primary_goal || "General fitness"} onChange={(value) => patch("primary_goal", value)} options={["General fitness", "Lose weight", "Gain muscle", "Increase strength", "Athletic performance", "Mobility and recovery", "Health and longevity"]} />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <TextInput label="Height feet" value={form.height_ft} onChange={(value) => patch("height_ft", value)} inputMode="numeric" />
                <TextInput label="Height inches" value={form.height_in} onChange={(value) => patch("height_in", value)} inputMode="numeric" />
                <TextInput label="Current weight" value={form.weight} onChange={(value) => patch("weight", value)} inputMode="decimal" />
                <TextInput label="Target weight" value={form.target_weight} onChange={(value) => patch("target_weight", value)} inputMode="decimal" />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4">
                <TextInput label="Known BMI (optional)" value={form.known_bmi} onChange={(value) => patch("known_bmi", value)} inputMode="decimal" />
                <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] p-3 sm:rounded-2xl sm:p-4">
                  <FieldLabel>Calculated BMI</FieldLabel>
                  <div className="mt-1 text-2xl font-black text-white sm:mt-2 sm:text-3xl">{calculatedBmi || "-"}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4">
                <SelectField label="Training experience" value={form.experience_level || "Beginner"} onChange={(value) => patch("experience_level", value)} options={["Beginner", "Intermediate", "Advanced / Competitive"]} />
                <SelectField label="Coaching style" value={form.coaching_style || "Beginner Friendly"} onChange={(value) => patch("coaching_style", value)} options={["Beginner Friendly", "Balanced", "Hardcore", "Athletic Performance"]} />
                <SelectField label="Coach audio" value={form.coach_audio_mode || "music_friendly"} onChange={(value) => patch("coach_audio_mode", value)} options={["music_friendly", "essential", "full"]} />
                <SelectField label="Activity level" value={form.activity_level || "Moderate"} onChange={(value) => patch("activity_level", value)} options={["Low", "Light", "Moderate", "High", "Very high"]} />
                <SelectField label="Training days per week" value={form.training_days || "3"} onChange={(value) => patch("training_days", value)} options={["1", "2", "3", "4", "5", "6", "7"]} />
                <SelectField
                  label="Training location"
                  value={form.training_location || "Home"}
                  onChange={(value) => {
                    patch("training_location", value);
                    if (["Gym", "Home Gym"].includes(value)) setGymBuilderOpen(true);
                  }}
                  options={TRAINING_LOCATIONS}
                />
                <EquipmentBuilder
                  open={gymBuilderOpen}
                  onToggle={() => setGymBuilderOpen((current) => !current)}
                  value={form.preferred_equipment || ""}
                  onChange={(value) => patch("preferred_equipment", value)}
                />
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <div className="text-base font-black text-white sm:text-xl">Medical and movement history</div>
                <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-sm sm:leading-6">Tell SYNC what should change how you train.</p>
              </div>
              <div className="rounded-xl border border-rose-300/20 bg-rose-300/[0.06] p-3 text-[11px] leading-5 text-rose-100 sm:rounded-2xl sm:p-4 sm:text-sm sm:leading-6">
                SyncWorks provides fitness guidance, not emergency or diagnostic care. New severe symptoms require appropriate medical attention.
              </div>
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                <TextArea label="Current or past injuries" value={form.injuries} onChange={(value) => patch("injuries", value)} placeholder="Example: shoulder strain, ankle sprain" />
                <TextArea label="Surgeries or major procedures" value={form.surgeries} onChange={(value) => patch("surgeries", value)} placeholder="Approximate year and lasting restrictions" />
                <TextArea label="Heart or circulation conditions" value={form.heart_conditions} onChange={(value) => patch("heart_conditions", value)} placeholder="Leave blank when none are known" />
                <TextArea label="Other health conditions" value={form.health_conditions} onChange={(value) => patch("health_conditions", value)} placeholder="Asthma, diabetes, blood pressure..." />
                <TextArea label="Medications relevant to exercise" value={form.medications} onChange={(value) => patch("medications", value)} placeholder="Optional" />
                <TextArea label="Movement limitations or painful positions" value={form.limitations} onChange={(value) => patch("limitations", value)} placeholder="Movements that hurt or feel restricted" />
                <TextArea label="Movements to avoid" value={form.avoid_movements} onChange={(value) => patch("avoid_movements", value)} placeholder="Exercises you do not want recommended" />
                <TextArea label="Clinician restrictions or guidance" value={form.physician_restrictions} onChange={(value) => patch("physician_restrictions", value)} placeholder="Enter guidance in your own words" />
                <SelectField label="Medical clearance" value={form.medical_clearance || "Not needed"} onChange={(value) => patch("medical_clearance", value)} options={["Not needed", "Cleared without restrictions", "Cleared with restrictions", "Need medical clearance", "Unsure"]} />
                <TextArea label="Emergency or safety notes" value={form.emergency_notes} onChange={(value) => patch("emergency_notes", value)} placeholder="Optional" />
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div>
                <div className="text-base font-black text-white sm:text-xl">Nutrition starting point</div>
                <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-sm sm:leading-6">Keep this simple now; Nutrition Coach can refine it later.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                <SelectField label="Nutrition goal" value={form.nutrition_goal || "Balanced nutrition"} onChange={(value) => patch("nutrition_goal", value)} options={["Balanced nutrition", "Lose weight", "Gain muscle", "Improve performance", "Maintain weight", "Improve consistency"]} />
                <SelectField label="Meals per day" value={form.meals_per_day || "3"} onChange={(value) => patch("meals_per_day", value)} options={["2", "3", "4", "5", "6"]} />
                <TextArea label="Dietary preferences" value={form.dietary_preferences} onChange={(value) => patch("dietary_preferences", value)} placeholder="High protein, vegetarian, simple meals..." />
                <TextArea label="Food allergies or foods to avoid" value={form.food_allergies} onChange={(value) => patch("food_allergies", value)} placeholder="Allergies and personal avoidances" />
              </div>
              <label className="flex items-start gap-3 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] p-3 sm:rounded-2xl sm:p-4">
                <input type="checkbox" checked={!!form.nutrition_coach_enabled} onChange={(event) => patch("nutrition_coach_enabled", event.target.checked)} className="mt-1 h-4 w-4 accent-cyan-400" />
                <span>
                  <span className="block text-[12px] font-black text-cyan-100 sm:text-sm">Prepare Nutrition Coach</span>
                  <span className="mt-1 block text-[10px] leading-4 text-slate-500 sm:text-xs sm:leading-5">Use my profile and logged food to estimate targets and practical meals.</span>
                </span>
              </label>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <div>
                <div className="text-base font-black text-white sm:text-xl">Review and save</div>
                <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-sm sm:leading-6">Confirm the basics. You can edit this profile anytime.</p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] p-3 sm:rounded-2xl sm:p-4">
                  <FieldLabel>Starting Point</FieldLabel>
                  <div className="mt-1 text-[14px] font-black text-white sm:mt-2 sm:text-lg">{form.weight || "-"} lb → {form.target_weight || "-"} lb</div>
                  <div className="mt-1 text-[10px] text-slate-500 sm:text-sm">BMI {form.known_bmi || calculatedBmi || "not calculated"}</div>
                </div>
                <div className="rounded-xl border border-blue-300/20 bg-blue-300/[0.06] p-3 sm:rounded-2xl sm:p-4">
                  <FieldLabel>Primary Goal</FieldLabel>
                  <div className="mt-1 text-[14px] font-black text-white sm:mt-2 sm:text-lg">{form.primary_goal || "General fitness"}</div>
                  <div className="mt-1 text-[10px] text-slate-500 sm:text-sm">{form.training_days || "3"} days · {form.training_location || "Flexible"}</div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:rounded-2xl sm:p-4">
                <FieldLabel>Gym & Equipment</FieldLabel>
                <div className="mt-2 text-[11px] font-bold leading-5 text-slate-300 sm:text-sm sm:leading-6">{form.preferred_equipment || "No equipment entered"}</div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:rounded-2xl sm:p-4">
                <FieldLabel>Coach Safety Summary</FieldLabel>
                <div className="mt-2 space-y-1.5 text-[11px] leading-5 text-slate-300 sm:mt-3 sm:space-y-2 sm:text-sm sm:leading-6">
                  <div>Injuries: {form.injuries || "None entered"}</div>
                  <div>Surgeries: {form.surgeries || "None entered"}</div>
                  <div>Heart conditions: {form.heart_conditions || "None entered"}</div>
                  <div>Restrictions: {form.physician_restrictions || form.limitations || "None entered"}</div>
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3 sm:rounded-2xl sm:p-4">
                <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-amber-400" />
                <span className="text-[11px] leading-5 text-slate-300 sm:text-sm sm:leading-6">
                  I understand SyncWorks provides fitness and nutrition guidance, not medical diagnosis or emergency care. I will update this profile when my health status or clinician guidance changes.
                </span>
              </label>
            </div>
          ) : null}
        </main>

        <footer className="sticky bottom-0 z-30 shrink-0 border-t border-cyan-300/15 bg-[#040812]/98 px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-16px_38px_rgba(0,0,0,.45)] backdrop-blur-xl sm:px-6">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => step === 0 ? onClose?.() : setStep((previous) => Math.max(0, previous - 1))}
              className="h-11 rounded-xl border border-white/10 bg-white/[0.04] text-[12px] font-black text-slate-200 sm:h-12 sm:rounded-2xl sm:text-sm"
            >
              {step === 0 ? "Close" : "Back"}
            </button>

            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((previous) => Math.min(steps.length - 1, previous + 1))}
                className="h-11 rounded-xl border border-cyan-300/35 bg-gradient-to-r from-cyan-500 to-blue-600 text-[12px] font-black text-white shadow-[0_8px_24px_rgba(37,99,235,.25)] sm:h-12 sm:rounded-2xl sm:text-sm"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={saveProfile}
                disabled={!confirmed}
                className="h-11 rounded-xl border border-cyan-300/35 bg-gradient-to-r from-cyan-500 to-blue-600 text-[12px] font-black text-white shadow-[0_8px_24px_rgba(37,99,235,.25)] disabled:cursor-not-allowed disabled:opacity-40 sm:h-12 sm:rounded-2xl sm:text-sm"
              >
                Save Health Profile
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}
