// src/components/customer-health/HealthProfileIntakeDrawer.jsx
import React, { useEffect, useMemo, useState } from "react";

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

function Field({ label, value, onChange, type = "text", placeholder = "", min, max, step }) {
  return (
    <label className="block min-w-0">
      <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500 sm:text-[10px]">{label}</div>
      <input
        type={type}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/45"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block min-w-0">
      <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500 sm:text-[10px]">{label}</div>
      <select
        value={value ?? options[0]}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/45"
      >
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder }) {
  return (
    <label className="block min-w-0">
      <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500 sm:text-[10px]">{label}</div>
      <textarea
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm font-bold leading-6 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/45"
      />
    </label>
  );
}

function Section({ eyebrow, title, description, children }) {
  return (
    <section className="rounded-3xl border border-cyan-300/15 bg-[linear-gradient(145deg,rgba(6,16,31,.96),rgba(2,7,16,.98))] p-4 sm:p-5">
      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-300">{eyebrow}</div>
      <h3 className="mt-1 text-lg font-black text-white sm:text-xl">{title}</h3>
      {description ? <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

const EQUIPMENT = [
  "Bodyweight",
  "Dumbbells",
  "Adjustable dumbbells",
  "Barbell",
  "Bench",
  "Squat rack",
  "Smith machine",
  "Cable machine",
  "Machines",
  "Resistance bands",
  "Kettlebells",
  "Pull-up bar",
  "Treadmill",
  "Bike",
  "Rowing machine",
  "Elliptical",
  "Stair climber",
];

function equipmentList(value) {
  if (Array.isArray(value)) return value;
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

export default function HealthProfileIntakeDrawer({
  open,
  onClose,
  profile,
  setProfile,
  snapshot,
  setSnapshot,
}) {
  const [form, setForm] = useState({});
  const [tab, setTab] = useState("body");

  useEffect(() => {
    if (!open) return;
    setTab("body");
    setForm({
      first_name: profile?.first_name || "",
      age: profile?.age || "",
      sex: profile?.sex || "",
      height_ft: profile?.height_ft || "",
      height_in: profile?.height_in || "",
      weight: profile?.weight || snapshot?.weight || "",
      target_weight: profile?.target_weight || "",
      body_fat_percent: profile?.body_fat_percent || "",
      waist_in: profile?.waist_in || "",
      chest_in: profile?.chest_in || "",
      hips_in: profile?.hips_in || "",
      thigh_in: profile?.thigh_in || "",
      arm_in: profile?.arm_in || "",
      neck_in: profile?.neck_in || "",
      resting_heart_rate: profile?.resting_heart_rate || snapshot?.resting_heart_rate || "",
      blood_pressure: profile?.blood_pressure || snapshot?.blood_pressure || "",
      primary_goal: profile?.primary_goal || snapshot?.goal || "General health",
      goal_detail: profile?.goal_detail || "",
      experience: profile?.experience || profile?.experience_level || "Beginner",
      activity_level: profile?.activity_level || "Moderate",
      training_days: profile?.training_days || "3",
      session_minutes: profile?.session_minutes || profile?.preferred_session_minutes || "45",
      training_location: profile?.training_location || snapshot?.training_location || "Gym",
      preferred_time: profile?.preferred_time || snapshot?.preferred_workout_time || "08:00",
      equipment: profile?.preferred_equipment || snapshot?.equipment || "",
      sport: profile?.sport || "",
      injuries: profile?.injuries || "",
      surgeries: profile?.surgeries || "",
      limitations: profile?.limitations || "",
      avoid_movements: profile?.avoid_movements || "",
      nutrition_goal: profile?.nutrition_goal || "Balanced nutrition",
      calorie_goal: profile?.calorie_goal || snapshot?.calorie_goal || "",
      protein_goal: profile?.protein_goal || snapshot?.protein_goal || "",
      carb_goal: profile?.carb_goal || snapshot?.carb_goal || "",
      fat_goal: profile?.fat_goal || snapshot?.fat_goal || "",
      dietary_preferences: profile?.dietary_preferences || "",
      food_allergies: profile?.food_allergies || "",
      meals_per_day: profile?.meals_per_day || "3",
      water_goal_oz: profile?.water_goal_oz || snapshot?.water_goal_oz || "100",
      sleep_goal_hours: profile?.sleep_goal_hours || snapshot?.sleep_goal_hours || "8",
      step_goal: profile?.step_goal || snapshot?.step_goal || "10000",
      coach_voice_preference: profile?.coach_voice_preference || snapshot?.coach_voice_preference || "australian_female",
      coach_audio_mode: profile?.coach_audio_mode || snapshot?.coach_audio_mode || "trainer",
    });
  }, [open, profile, snapshot]);

  const bmi = useMemo(
    () => calculateBmi({ weight: form.weight, heightFt: form.height_ft, heightIn: form.height_in }),
    [form.weight, form.height_ft, form.height_in]
  );

  if (!open) return null;

  const patch = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));
  const selectedEquipment = equipmentList(form.equipment);

  function toggleEquipment(item) {
    const next = selectedEquipment.includes(item)
      ? selectedEquipment.filter((entry) => entry !== item)
      : [...selectedEquipment, item];
    patch("equipment", next.join(", "));
  }

  function save() {
    const now = new Date().toISOString();
    const availableEquipment = equipmentList(form.equipment);
    const nextProfile = {
      ...profile,
      ...form,
      bmi,
      bmi_source: bmi ? "calculated" : "",
      available_equipment: availableEquipment,
      preferred_equipment: form.equipment,
      experience_level: form.experience,
      preferred_session_minutes: form.session_minutes,
      health_intake_completed_at: profile?.health_intake_completed_at || now,
      health_intake_updated_at: now,
      profile_version: 2,
    };

    setProfile?.(nextProfile);
    setSnapshot?.((previous) => ({
      ...previous,
      weight: form.weight || previous?.weight || "",
      bmi: bmi || previous?.bmi || "",
      goal: form.primary_goal || previous?.goal || "General health",
      calorie_goal: safeNumber(form.calorie_goal, previous?.calorie_goal || 0) || previous?.calorie_goal,
      protein_goal: safeNumber(form.protein_goal, previous?.protein_goal || 0) || previous?.protein_goal,
      carb_goal: safeNumber(form.carb_goal, previous?.carb_goal || 0) || previous?.carb_goal,
      fat_goal: safeNumber(form.fat_goal, previous?.fat_goal || 0) || previous?.fat_goal,
      water_goal_oz: safeNumber(form.water_goal_oz, previous?.water_goal_oz || 100),
      sleep_goal_hours: safeNumber(form.sleep_goal_hours, previous?.sleep_goal_hours || 8),
      step_goal: safeNumber(form.step_goal, previous?.step_goal || 10000),
      training_location: form.training_location,
      preferred_workout_time: form.preferred_time,
      equipment: form.equipment,
      available_equipment: availableEquipment,
      coach_voice_preference: form.coach_voice_preference || "australian_female",
      coach_audio_mode: form.coach_audio_mode || "trainer",
      health_profile_ready: true,
      last_profile_update_at: now,
    }));
    onClose?.();
  }

  return (
    <div className="fixed inset-0 z-[500] flex justify-end bg-black/80 backdrop-blur-xl">
      <button type="button" aria-label="Close health profile" onClick={onClose} className="absolute inset-0" />
      <section className="relative z-[501] flex h-full w-full max-w-5xl flex-col overflow-hidden border-l border-cyan-300/20 bg-[radial-gradient(circle_at_top_left,rgba(37,135,255,.13),transparent_28%),linear-gradient(180deg,#020712,#06101e)] shadow-[-30px_0_80px_rgba(0,0,0,.65)]">
        <header className="shrink-0 border-b border-white/10 px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Your health profile</div>
              <h2 className="mt-1 text-2xl font-black text-white sm:text-3xl">Give SYNC the data that should drive the plan</h2>
              <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-400 sm:text-sm sm:leading-6">
                Add what you know. SYNC uses these body metrics, goals, training constraints, nutrition targets and recovery goals when building and adapting your plan.
              </p>
            </div>
            <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-xl text-white">×</button>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              ["body", "Body"],
              ["training", "Training"],
              ["nutrition", "Nutrition"],
              ["recovery", "Recovery"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`rounded-xl border px-2 py-2 text-[10px] font-black uppercase tracking-[.1em] sm:text-xs ${tab === value ? "border-cyan-300/40 bg-cyan-300/12 text-cyan-100" : "border-white/10 bg-white/[.025] text-slate-400"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-28 sm:px-6 sm:py-6">
          {tab === "body" ? (
            <div className="space-y-4">
              <Section eyebrow="Starting point" title="Body metrics & measurements" description="Measurements are optional, but they give progress another signal beyond the scale.">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="First name" value={form.first_name} onChange={(v) => patch("first_name", v)} />
                  <Field label="Age" type="number" value={form.age} onChange={(v) => patch("age", v)} />
                  <Select label="Sex" value={form.sex} onChange={(v) => patch("sex", v)} options={["", "Male", "Female", "Prefer not to say"]} />
                  <Field label="Weight (lb)" type="number" value={form.weight} onChange={(v) => patch("weight", v)} />
                  <Field label="Height ft" type="number" value={form.height_ft} onChange={(v) => patch("height_ft", v)} />
                  <Field label="Height in" type="number" value={form.height_in} onChange={(v) => patch("height_in", v)} />
                  <Field label="Target weight (lb)" type="number" value={form.target_weight} onChange={(v) => patch("target_weight", v)} />
                  <Field label="Body fat %" type="number" step="0.1" value={form.body_fat_percent} onChange={(v) => patch("body_fat_percent", v)} />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Waist (in)" type="number" step="0.1" value={form.waist_in} onChange={(v) => patch("waist_in", v)} />
                  <Field label="Chest (in)" type="number" step="0.1" value={form.chest_in} onChange={(v) => patch("chest_in", v)} />
                  <Field label="Hips (in)" type="number" step="0.1" value={form.hips_in} onChange={(v) => patch("hips_in", v)} />
                  <Field label="Thigh (in)" type="number" step="0.1" value={form.thigh_in} onChange={(v) => patch("thigh_in", v)} />
                  <Field label="Arm (in)" type="number" step="0.1" value={form.arm_in} onChange={(v) => patch("arm_in", v)} />
                  <Field label="Neck (in)" type="number" step="0.1" value={form.neck_in} onChange={(v) => patch("neck_in", v)} />
                </div>
                <div className="mt-4 rounded-2xl border border-lime-300/20 bg-lime-300/[.06] p-3 text-sm text-slate-300">
                  Calculated BMI: <b className="text-lime-200">{bmi || "Add height + weight"}</b>
                </div>
              </Section>

              <Section eyebrow="Goal" title="What are we building toward?">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select label="Primary goal" value={form.primary_goal} onChange={(v) => patch("primary_goal", v)} options={["General health", "Lose fat / weight loss", "Build muscle / bodybuilding", "Get stronger", "Athletic performance", "Improve conditioning", "Mobility and longevity", "Return after time off"]} />
                  <Select label="Activity level" value={form.activity_level} onChange={(v) => patch("activity_level", v)} options={["Low", "Light", "Moderate", "High", "Very high"]} />
                </div>
                <div className="mt-3"><TextArea label="Describe success" value={form.goal_detail} onChange={(v) => patch("goal_detail", v)} placeholder="Example: lose 15 lb, keep strength, improve conditioning, move better and feel good playing sports." /></div>
              </Section>
            </div>
          ) : null}

          {tab === "training" ? (
            <div className="space-y-4">
              <Section eyebrow="Training" title="Build around the user's real schedule">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Select label="Experience" value={form.experience} onChange={(v) => patch("experience", v)} options={["Beginner", "Restarting", "Intermediate", "Advanced", "Competitive athlete"]} />
                  <Field label="Days / week" type="number" min="1" max="7" value={form.training_days} onChange={(v) => patch("training_days", v)} />
                  <Field label="Session minutes" type="number" value={form.session_minutes} onChange={(v) => patch("session_minutes", v)} />
                  <Field label="Preferred start time" type="time" value={form.preferred_time} onChange={(v) => patch("preferred_time", v)} />
                  <Select label="Location" value={form.training_location} onChange={(v) => patch("training_location", v)} options={["Gym", "Home Gym", "Home", "Outdoors", "Hotel / Travel", "Other"]} />
                  <Field label="Sport / activity" value={form.sport} onChange={(v) => patch("sport", v)} placeholder="Softball, running, golf..." />
                </div>
              </Section>

              <Section eyebrow="Equipment" title="What can the plan use?" description="Tap what is regularly available. SYNC can use this for exercise selection and substitutions.">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {EQUIPMENT.map((item) => {
                    const active = selectedEquipment.includes(item);
                    return (
                      <button key={item} type="button" onClick={() => toggleEquipment(item)} className={`rounded-xl border px-3 py-2 text-xs font-black ${active ? "border-lime-300/40 bg-lime-300/[.1] text-lime-100" : "border-white/10 bg-white/[.025] text-slate-400"}`}>
                        {item}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3"><Field label="Other equipment" value={form.equipment} onChange={(v) => patch("equipment", v)} placeholder="Add anything else, separated by commas" /></div>
              </Section>

              <Section eyebrow="Safety" title="Pain, injuries & movement limitations">
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextArea label="Injuries / pain" value={form.injuries} onChange={(v) => patch("injuries", v)} placeholder="Current or recurring injuries, pain or sensitive areas." />
                  <TextArea label="Surgeries / medical history" value={form.surgeries} onChange={(v) => patch("surgeries", v)} placeholder="Anything relevant to training decisions." />
                  <TextArea label="Limitations" value={form.limitations} onChange={(v) => patch("limitations", v)} placeholder="Mobility, range of motion, balance, endurance..." />
                  <TextArea label="Movements to avoid" value={form.avoid_movements} onChange={(v) => patch("avoid_movements", v)} placeholder="Exercises or positions the user should not do." />
                </div>
              </Section>
            </div>
          ) : null}

          {tab === "nutrition" ? (
            <div className="space-y-4">
              <Section eyebrow="Nutrition" title="Targets the coach can actually use" description="Leave macro targets blank if you want SYNC to calculate them during plan creation.">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Select label="Nutrition goal" value={form.nutrition_goal} onChange={(v) => patch("nutrition_goal", v)} options={["Balanced nutrition", "Fat loss", "Muscle gain", "Performance fuel", "Maintain weight", "Improve protein intake"]} />
                  <Field label="Calories / day" type="number" value={form.calorie_goal} onChange={(v) => patch("calorie_goal", v)} placeholder="AI can calculate" />
                  <Field label="Protein (g)" type="number" value={form.protein_goal} onChange={(v) => patch("protein_goal", v)} placeholder="AI can calculate" />
                  <Field label="Carbs (g)" type="number" value={form.carb_goal} onChange={(v) => patch("carb_goal", v)} placeholder="Optional" />
                  <Field label="Fat (g)" type="number" value={form.fat_goal} onChange={(v) => patch("fat_goal", v)} placeholder="Optional" />
                  <Field label="Meals / day" type="number" min="1" max="8" value={form.meals_per_day} onChange={(v) => patch("meals_per_day", v)} />
                  <Field label="Water target (oz)" type="number" value={form.water_goal_oz} onChange={(v) => patch("water_goal_oz", v)} />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <TextArea label="Dietary preferences" value={form.dietary_preferences} onChange={(v) => patch("dietary_preferences", v)} placeholder="Foods you like, dislike, eating style, restaurant habits, meal-prep preferences..." />
                  <TextArea label="Allergies / foods to avoid" value={form.food_allergies} onChange={(v) => patch("food_allergies", v)} placeholder="Allergies, intolerances or foods the plan should avoid." />
                </div>
              </Section>
              <section className="rounded-3xl border border-fuchsia-300/20 bg-fuchsia-300/[.06] p-4">
                <div className="text-[10px] font-black uppercase tracking-[.18em] text-fuchsia-200">How this is used</div>
                <p className="mt-2 text-sm leading-6 text-slate-300">Meal logging, calorie and macro targets, protein remaining, AI meal suggestions and weekly plan adjustments all read from this same profile.</p>
              </section>
            </div>
          ) : null}

          {tab === "recovery" ? (
            <div className="space-y-4">
              <Section eyebrow="Recovery" title="Daily targets & trainer behavior">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Sleep target (hours)" type="number" step="0.25" value={form.sleep_goal_hours} onChange={(v) => patch("sleep_goal_hours", v)} />
                  <Field label="Step target" type="number" value={form.step_goal} onChange={(v) => patch("step_goal", v)} />
                  <Field label="Resting heart rate" type="number" value={form.resting_heart_rate} onChange={(v) => patch("resting_heart_rate", v)} />
                  <Field label="Blood pressure" value={form.blood_pressure} onChange={(v) => patch("blood_pressure", v)} placeholder="Example: 120/80" />
                </div>
              </Section>
              <Section eyebrow="Trainer voice" title="SYNC workout coach">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select label="Voice" value={form.coach_voice_preference} onChange={(v) => patch("coach_voice_preference", v)} options={["australian_female", "female", "australian_male", "male", "auto"]} />
                  <Select label="Audio mode" value={form.coach_audio_mode} onChange={(v) => patch("coach_audio_mode", v)} options={["trainer", "basic", "off"]} />
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-400">Australian Female is the SyncWorks default. The app will use the premium connected voice provider when available and browser speech only as a fallback.</p>
              </Section>
              <section className="rounded-3xl border border-lime-300/20 bg-lime-300/[.06] p-4">
                <div className="text-[10px] font-black uppercase tracking-[.18em] text-lime-200">Next step</div>
                <h3 className="mt-1 text-xl font-black text-white">Save this profile, then let AI build the plan</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">The AI plan builder can use these metrics with workout history, readiness, sleep, nutrition and equipment to shape training and recovery.</p>
              </section>
            </div>
          ) : null}
        </main>

        <footer className="absolute inset-x-0 bottom-0 z-[502] border-t border-white/10 bg-[#020712]/95 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[10px] text-slate-500">You can update these numbers anytime as the plan changes.</div>
            <button type="button" onClick={save} className="min-h-11 rounded-xl border border-lime-300/50 bg-lime-400/15 px-5 text-xs font-black uppercase tracking-[.12em] text-lime-100 shadow-[0_0_24px_rgba(166,255,0,.12)]">
              Save health profile
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
