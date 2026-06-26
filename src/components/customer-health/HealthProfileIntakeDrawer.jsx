// src/components/customer-health/HealthProfileIntakeDrawer.jsx
import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(
    String(value ?? "").replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function calculateBmi({
  weight,
  heightFt,
  heightIn,
}) {
  const pounds = safeNumber(weight, 0);
  const inches =
    safeNumber(heightFt, 0) * 12 +
    safeNumber(heightIn, 0);

  if (pounds <= 0 || inches <= 0) {
    return "";
  }

  return String(
    Math.round(
      ((pounds / (inches * inches)) * 703) * 10
    ) / 10
  );
}

function FieldLabel({ children }) {
  return (
    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
      {children}
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  placeholder,
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>

      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>

      <textarea
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        rows={rows}
        className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-slate-950 px-3 py-3 text-sm font-bold leading-6 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/40"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function StepButton({
  active,
  complete,
  label,
  number,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-2xl border px-3 py-3 text-left transition",
        active
          ? "border-cyan-300/30 bg-cyan-300/12 text-cyan-100"
          : complete
          ? "border-lime-300/20 bg-lime-300/[0.07] text-lime-100"
          : "border-white/10 bg-white/[0.035] text-slate-400"
      )}
    >
      <div className="text-[9px] font-black uppercase tracking-[0.14em] opacity-70">
        Step {number}
      </div>

      <div className="mt-1 text-sm font-black">
        {label}
      </div>
    </button>
  );
}

export default function HealthProfileIntakeDrawer({
  open,
  onClose,
  profile,
  setProfile,
  snapshot,
  setSnapshot,
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({});
  const [confirmed, setConfirmed] =
    useState(false);

  useEffect(() => {
    if (!open) return;

    setStep(0);
    setConfirmed(false);

    setForm({
      first_name:
        profile?.first_name || "",
      age:
        profile?.age || "",
      sex:
        profile?.sex || "",
      height_ft:
        profile?.height_ft || "",
      height_in:
        profile?.height_in || "",
      weight:
        profile?.weight ||
        snapshot?.weight ||
        "",
      target_weight:
        profile?.target_weight || "",
      known_bmi:
        profile?.known_bmi || "",
      primary_goal:
        profile?.primary_goal ||
        "General fitness",
      activity_level:
        profile?.activity_level ||
        "Moderate",
      training_days:
        profile?.training_days || "3",
      training_location:
        profile?.training_location ||
        "Home",
      preferred_equipment:
        profile?.preferred_equipment ||
        "Bodyweight",
      injuries:
        profile?.injuries || "",
      surgeries:
        profile?.surgeries || "",
      heart_conditions:
        profile?.heart_conditions || "",
      health_conditions:
        profile?.health_conditions || "",
      medications:
        profile?.medications || "",
      limitations:
        profile?.limitations || "",
      avoid_movements:
        profile?.avoid_movements || "",
      physician_restrictions:
        profile?.physician_restrictions || "",
      medical_clearance:
        profile?.medical_clearance ||
        "Not needed",
      emergency_notes:
        profile?.emergency_notes || "",
      nutrition_goal:
        profile?.nutrition_goal ||
        "Balanced nutrition",
      dietary_preferences:
        profile?.dietary_preferences || "",
      food_allergies:
        profile?.food_allergies || "",
      meals_per_day:
        profile?.meals_per_day || "3",
      nutrition_coach_enabled:
        profile?.nutrition_coach_enabled !== false,
    });
  }, [open, profile, snapshot?.weight]);

  const calculatedBmi = useMemo(
    () =>
      calculateBmi({
        weight: form.weight,
        heightFt: form.height_ft,
        heightIn: form.height_in,
      }),
    [
      form.weight,
      form.height_ft,
      form.height_in,
    ]
  );

  if (!open) return null;

  const steps = [
    "Starting Point",
    "Medical & Movement",
    "Nutrition",
    "Review",
  ];

  function patch(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function saveProfile() {
    const completedAt =
      new Date().toISOString();

    const nextProfile = {
      ...profile,
      ...form,
      bmi:
        form.known_bmi ||
        calculatedBmi ||
        "",
      bmi_source:
        form.known_bmi
          ? "user_entered"
          : calculatedBmi
          ? "calculated"
          : "",
      health_intake_completed_at:
        completedAt,
      health_intake_updated_at:
        completedAt,
      profile_version: 1,
    };

    setProfile?.(nextProfile);

    setSnapshot?.((previous) => ({
      ...previous,
      weight:
        form.weight ||
        previous?.weight ||
        "",
      goal:
        form.primary_goal ||
        previous?.goal ||
        "General fitness",
      last_profile_update_at:
        completedAt,
      health_profile_ready: true,
    }));

    onClose?.();
  }

  return (
    <div className="fixed inset-0 z-[125] flex justify-end bg-black/80 backdrop-blur-xl">
      <button
        type="button"
        aria-label="Close health profile"
        onClick={onClose}
        className="absolute inset-0"
      />

      <section className="relative z-[126] flex h-full w-full max-w-4xl flex-col overflow-hidden border-l border-cyan-300/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_26%),linear-gradient(180deg,#040812,#07111f)] shadow-[-30px_0_80px_rgba(0,0,0,0.6)]">
        <header className="border-b border-white/10 px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">
                One-Time Health Profile
              </div>

              <h2 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                Give your coach a safe starting point
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Add what you know today. You can update
                anything later as your health, goals, or
                medical guidance changes.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] font-black text-white"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
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

        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {step === 0 ? (
            <div className="space-y-5">
              <div>
                <div className="text-xl font-black text-white">
                  Starting point
                </div>

                <p className="mt-1 text-sm leading-6 text-slate-400">
                  These values support training and nutrition
                  estimates. They are not a diagnosis.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <TextInput
                  label="First name"
                  value={form.first_name || ""}
                  onChange={(value) =>
                    patch("first_name", value)
                  }
                />

                <TextInput
                  label="Age"
                  value={form.age || ""}
                  onChange={(value) =>
                    patch("age", value)
                  }
                  inputMode="numeric"
                />

                <SelectField
                  label="Sex used for estimates"
                  value={form.sex || ""}
                  onChange={(value) =>
                    patch("sex", value)
                  }
                  options={[
                    "",
                    "Female",
                    "Male",
                    "Prefer not to say",
                  ]}
                />

                <SelectField
                  label="Primary goal"
                  value={
                    form.primary_goal ||
                    "General fitness"
                  }
                  onChange={(value) =>
                    patch("primary_goal", value)
                  }
                  options={[
                    "General fitness",
                    "Lose weight",
                    "Gain muscle",
                    "Increase strength",
                    "Athletic performance",
                    "Mobility and recovery",
                    "Health and longevity",
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <TextInput
                  label="Height feet"
                  value={form.height_ft || ""}
                  onChange={(value) =>
                    patch("height_ft", value)
                  }
                  inputMode="numeric"
                />

                <TextInput
                  label="Height inches"
                  value={form.height_in || ""}
                  onChange={(value) =>
                    patch("height_in", value)
                  }
                  inputMode="numeric"
                />

                <TextInput
                  label="Current weight"
                  value={form.weight || ""}
                  onChange={(value) =>
                    patch("weight", value)
                  }
                  inputMode="decimal"
                />

                <TextInput
                  label="Target weight"
                  value={
                    form.target_weight || ""
                  }
                  onChange={(value) =>
                    patch("target_weight", value)
                  }
                  inputMode="decimal"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <TextInput
                  label="Known BMI (optional)"
                  value={form.known_bmi || ""}
                  onChange={(value) =>
                    patch("known_bmi", value)
                  }
                  inputMode="decimal"
                />

                <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.07] p-4">
                  <FieldLabel>Calculated BMI</FieldLabel>

                  <div className="mt-2 text-3xl font-black text-white">
                    {calculatedBmi || "-"}
                  </div>

                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    A general screening estimate. It does not
                    distinguish muscle from body fat.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Activity level"
                  value={
                    form.activity_level ||
                    "Moderate"
                  }
                  onChange={(value) =>
                    patch("activity_level", value)
                  }
                  options={[
                    "Low",
                    "Light",
                    "Moderate",
                    "High",
                    "Very high",
                  ]}
                />

                <SelectField
                  label="Training days per week"
                  value={
                    form.training_days || "3"
                  }
                  onChange={(value) =>
                    patch("training_days", value)
                  }
                  options={[
                    "1",
                    "2",
                    "3",
                    "4",
                    "5",
                    "6",
                    "7",
                  ]}
                />

                <TextInput
                  label="Training location"
                  value={
                    form.training_location || ""
                  }
                  onChange={(value) =>
                    patch("training_location", value)
                  }
                  placeholder="Home, gym, outside"
                />

                <TextInput
                  label="Available equipment"
                  value={
                    form.preferred_equipment || ""
                  }
                  onChange={(value) =>
                    patch("preferred_equipment", value)
                  }
                  placeholder="Bodyweight, dumbbells, full gym"
                />
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-5">
              <div>
                <div className="text-xl font-black text-white">
                  Medical and movement history
                </div>

                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Use plain language. SyncWorks will use this
                  information to avoid unsafe recommendations
                  and ask for clarification when needed.
                </p>
              </div>

              <div className="rounded-2xl border border-rose-300/20 bg-rose-300/[0.07] p-4 text-sm leading-6 text-rose-100">
                SyncWorks does not replace medical care. Chest
                pain, fainting, severe shortness of breath,
                new neurological symptoms, or severe pain
                require appropriate medical attention.
              </div>

              <div className="grid gap-4">
                <TextArea
                  label="Current or past injuries"
                  value={form.injuries || ""}
                  onChange={(value) =>
                    patch("injuries", value)
                  }
                  placeholder="Example: right shoulder strain, recurring ankle sprain"
                />

                <TextArea
                  label="Surgeries or major procedures"
                  value={form.surgeries || ""}
                  onChange={(value) =>
                    patch("surgeries", value)
                  }
                  placeholder="Include approximate year and any lasting restrictions"
                />

                <TextArea
                  label="Heart or circulation conditions"
                  value={
                    form.heart_conditions || ""
                  }
                  onChange={(value) =>
                    patch("heart_conditions", value)
                  }
                  placeholder="Leave blank when none are known"
                />

                <TextArea
                  label="Other health conditions"
                  value={
                    form.health_conditions || ""
                  }
                  onChange={(value) =>
                    patch("health_conditions", value)
                  }
                  placeholder="Examples: asthma, diabetes, high blood pressure"
                />

                <TextArea
                  label="Medications relevant to exercise or nutrition"
                  value={form.medications || ""}
                  onChange={(value) =>
                    patch("medications", value)
                  }
                  placeholder="Optional"
                />

                <TextArea
                  label="Movement limitations or painful positions"
                  value={
                    form.limitations || ""
                  }
                  onChange={(value) =>
                    patch("limitations", value)
                  }
                  placeholder="Examples: deep hip flexion, overhead pressing, running impact"
                />

                <TextArea
                  label="Movements to avoid"
                  value={
                    form.avoid_movements || ""
                  }
                  onChange={(value) =>
                    patch("avoid_movements", value)
                  }
                  placeholder="Exercises or movements you do not want recommended"
                />

                <TextArea
                  label="Clinician restrictions or guidance"
                  value={
                    form.physician_restrictions || ""
                  }
                  onChange={(value) =>
                    patch("physician_restrictions", value)
                  }
                  placeholder="Copy the guidance in your own words"
                />

                <SelectField
                  label="Medical clearance"
                  value={
                    form.medical_clearance ||
                    "Not needed"
                  }
                  onChange={(value) =>
                    patch("medical_clearance", value)
                  }
                  options={[
                    "Not needed",
                    "Cleared without restrictions",
                    "Cleared with restrictions",
                    "Need medical clearance",
                    "Unsure",
                  ]}
                />

                <TextArea
                  label="Emergency or safety notes"
                  value={
                    form.emergency_notes || ""
                  }
                  onChange={(value) =>
                    patch("emergency_notes", value)
                  }
                  placeholder="Optional information the coach should surface before training"
                />
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-5">
              <div>
                <div className="text-xl font-black text-white">
                  Nutrition starting point
                </div>

                <p className="mt-1 text-sm leading-6 text-slate-400">
                  This prepares the future Nutrition Coach
                  without mixing the full nutrition experience
                  into the fitness dashboard.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Nutrition goal"
                  value={
                    form.nutrition_goal ||
                    "Balanced nutrition"
                  }
                  onChange={(value) =>
                    patch("nutrition_goal", value)
                  }
                  options={[
                    "Balanced nutrition",
                    "Lose weight",
                    "Gain muscle",
                    "Improve performance",
                    "Maintain weight",
                    "Improve consistency",
                  ]}
                />

                <SelectField
                  label="Meals per day"
                  value={
                    form.meals_per_day || "3"
                  }
                  onChange={(value) =>
                    patch("meals_per_day", value)
                  }
                  options={[
                    "2",
                    "3",
                    "4",
                    "5",
                    "6",
                  ]}
                />

                <TextArea
                  label="Dietary preferences"
                  value={
                    form.dietary_preferences || ""
                  }
                  onChange={(value) =>
                    patch("dietary_preferences", value)
                  }
                  placeholder="Example: high protein, vegetarian, simple meals"
                />

                <TextArea
                  label="Food allergies or foods to avoid"
                  value={
                    form.food_allergies || ""
                  }
                  onChange={(value) =>
                    patch("food_allergies", value)
                  }
                  placeholder="Include medical allergies and personal avoidances"
                />
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-lime-300/20 bg-lime-300/[0.07] p-4">
                <input
                  type="checkbox"
                  checked={
                    !!form.nutrition_coach_enabled
                  }
                  onChange={(event) =>
                    patch(
                      "nutrition_coach_enabled",
                      event.target.checked
                    )
                  }
                  className="mt-1 h-4 w-4 accent-lime-400"
                />

                <span>
                  <span className="block text-sm font-black text-lime-100">
                    Prepare Nutrition Coach
                  </span>

                  <span className="mt-1 block text-xs leading-5 text-slate-400">
                    Use my profile and logged food to estimate
                    targets and suggest practical meals. Changes
                    to official targets should require my approval.
                  </span>
                </span>
              </label>

              <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.07] p-4">
                <div className="text-sm font-black text-cyan-100">
                  Natural-language food logging is planned
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  You will be able to say, "I ate three
                  McDonald's cheeseburgers," and SyncWorks can
                  look up or estimate calories and macros, show
                  the assumptions, and ask you to confirm before
                  saving the meal.
                </p>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-5">
              <div>
                <div className="text-xl font-black text-white">
                  Review and save
                </div>

                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Your coach will use this as a starting point,
                  explain important changes, and allow you to
                  update the profile later.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.07] p-4">
                  <FieldLabel>Starting Point</FieldLabel>
                  <div className="mt-2 text-lg font-black text-white">
                    {form.weight || "-"} lb →{" "}
                    {form.target_weight || "-"} lb
                  </div>
                  <div className="mt-1 text-sm text-slate-400">
                    BMI{" "}
                    {form.known_bmi ||
                      calculatedBmi ||
                      "not calculated"}
                  </div>
                </div>

                <div className="rounded-2xl border border-lime-300/20 bg-lime-300/[0.07] p-4">
                  <FieldLabel>Primary Goal</FieldLabel>
                  <div className="mt-2 text-lg font-black text-white">
                    {form.primary_goal ||
                      "General fitness"}
                  </div>
                  <div className="mt-1 text-sm text-slate-400">
                    {form.training_days || "3"} training
                    days · {form.training_location || "Flexible"}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <FieldLabel>Coach Safety Summary</FieldLabel>

                <div className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                  <div>
                    Injuries: {form.injuries || "None entered"}
                  </div>
                  <div>
                    Surgeries: {form.surgeries || "None entered"}
                  </div>
                  <div>
                    Heart conditions:{" "}
                    {form.heart_conditions || "None entered"}
                  </div>
                  <div>
                    Restrictions:{" "}
                    {form.physician_restrictions ||
                      form.limitations ||
                      "None entered"}
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-4">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) =>
                    setConfirmed(event.target.checked)
                  }
                  className="mt-1 h-4 w-4 accent-amber-400"
                />

                <span className="text-sm leading-6 text-slate-300">
                  I understand SyncWorks provides fitness and
                  nutrition guidance, not medical diagnosis or
                  emergency care. I will update this profile when
                  my health status or clinician guidance changes.
                </span>
              </label>
            </div>
          ) : null}
        </main>

        <footer className="border-t border-white/10 bg-[#040812]/95 px-4 py-3 sm:px-6">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                step === 0
                  ? onClose?.()
                  : setStep((previous) =>
                      Math.max(0, previous - 1)
                    )
              }
              className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-slate-200"
            >
              {step === 0 ? "Close" : "Back"}
            </button>

            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={() =>
                  setStep((previous) =>
                    Math.min(
                      steps.length - 1,
                      previous + 1
                    )
                  )
                }
                className="h-12 rounded-2xl border border-cyan-300/30 bg-cyan-300/15 text-sm font-black text-cyan-100"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={saveProfile}
                disabled={!confirmed}
                className="h-12 rounded-2xl border border-lime-300/30 bg-lime-300/15 text-sm font-black text-lime-100 disabled:cursor-not-allowed disabled:opacity-40"
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
