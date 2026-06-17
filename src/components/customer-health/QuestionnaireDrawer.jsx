// src/components/customer-health/QuestionnaireDrawer.jsx
import React, { useMemo } from "react";
import HealthDrawer from "./HealthDrawer";
import { cx } from "./healthStorage";

function Field({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-slate-400">{label}</div>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-slate-400">{label}</div>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none transition focus:border-cyan-400/40"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function PillToggle({ active, children, onClick, tone = "cyan" }) {
  const activeClass =
    tone === "emerald"
      ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
      : tone === "fuchsia"
      ? "border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-100"
      : tone === "amber"
      ? "border-amber-400/40 bg-amber-500/15 text-amber-100"
      : "border-cyan-400/40 bg-cyan-500/15 text-cyan-100";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-2xl border px-3 py-2 text-xs font-black transition",
        active
          ? activeClass
          : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
      )}
    >
      {children}
    </button>
  );
}

function Section({ title, subtitle, children, tone = "slate" }) {
  const tones = {
    cyan: "border-cyan-500/20 bg-cyan-500/10",
    emerald: "border-emerald-500/20 bg-emerald-500/10",
    fuchsia: "border-fuchsia-500/20 bg-fuchsia-500/10",
    amber: "border-amber-500/20 bg-amber-500/10",
    slate: "border-white/10 bg-white/[0.03]",
  };

  return (
    <section className={cx("rounded-3xl border p-4", tones[tone] || tones.slate)}>
      <div className="mb-4">
        <div className="text-sm font-black text-white">{title}</div>
        {subtitle ? <div className="mt-1 text-xs leading-5 text-slate-400">{subtitle}</div> : null}
      </div>
      {children}
    </section>
  );
}

function inferCoachPath(profile) {
  const goal = String(profile.primary_goal || "").toLowerCase();
  const inspiration = String(profile.inspiration_goal || "").toLowerCase();
  const limitations = String(profile.limitations || "").toLowerCase();
  const sport = String(profile.sport || "").trim();

  if (limitations.includes("pain") || limitations.includes("surgery") || limitations.includes("injury")) {
    return "Recovery-aware coaching";
  }

  if (sport || goal.includes("sport") || inspiration.includes("polamalu")) {
    return "Athletic performance coaching";
  }

  if (goal.includes("strength") || inspiration.includes("harrison")) {
    return "Strength-focused coaching";
  }

  if (goal.includes("muscle") || goal.includes("fitness model") || inspiration.includes("fitness model")) {
    return "Lean muscle coaching";
  }

  if (goal.includes("fat") || goal.includes("weight")) {
    return "Weight loss and consistency coaching";
  }

  return "General health coaching";
}

const WEAK_AREAS = [
  "Hip",
  "Knee",
  "Shoulder",
  "Back",
  "Core",
  "Mobility",
  "Endurance",
  "Balance",
];

export default function QuestionnaireDrawer({
  open,
  onClose,
  profile,
  setProfile,
  snapshot,
  setSnapshot,
}) {
  const coachPath = useMemo(() => inferCoachPath(profile || {}), [profile]);

  function updateProfile(patch) {
    setProfile((prev) => ({
      ...prev,
      ...patch,
    }));
  }

  function updateSnapshot(patch) {
    setSnapshot((prev) => ({
      ...prev,
      ...patch,
    }));
  }

  function toggleWeakArea(area) {
    const current = Array.isArray(profile.weak_areas) ? profile.weak_areas : [];
    const exists = current.includes(area);

    updateProfile({
      weak_areas: exists ? current.filter((x) => x !== area) : [...current, area],
    });
  }

  return (
    <HealthDrawer
      open={open}
      onClose={onClose}
      title="AI Coach Questionnaire"
      subtitle="This is the data the coach uses to tailor workouts, limits, progression, and daily pressure."
    >
      <div className="space-y-5">
        <Section
          title="Goal Identity"
          subtitle="The coach needs to know what the user is trying to become."
          tone="fuchsia"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <SelectField
              label="Primary goal"
              value={profile.primary_goal}
              onChange={(value) => {
                updateProfile({ primary_goal: value });
                updateSnapshot({ goal: value });
              }}
              options={[
                "General fitness",
                "Lose fat / weight loss",
                "Build muscle",
                "Get stronger",
                "Look like a fitness model",
                "Sport performance",
                "Mobility / pain-free movement",
                "Rebuild after time off",
              ]}
            />

            <SelectField
              label="Inspiration goal"
              value={profile.inspiration_goal}
              onChange={(value) => updateProfile({ inspiration_goal: value })}
              options={[
                "Best version of me",
                "Fitness model look",
                "Troy Polamalu athletic style",
                "James Harrison strength style",
                "Lean and healthy parent",
                "Move without pain",
                "Custom",
              ]}
            />

            <Field
              label="Specific sport or activity"
              value={profile.sport}
              onChange={(value) => updateProfile({ sport: value })}
              placeholder="Football, softball, golf, running, hiking, etc."
            />

            <SelectField
              label="Body goal"
              value={profile.body_goal}
              onChange={(value) => updateProfile({ body_goal: value })}
              options={[
                "Lean and healthy",
                "Athletic and explosive",
                "Strong and powerful",
                "Fitness model / aesthetic",
                "Lose belly fat",
                "Rebuild mobility",
                "Maintain health",
              ]}
            />
          </div>

          <label className="mt-3 block">
            <div className="mb-1 text-xs font-semibold text-slate-400">Goal detail</div>
            <textarea
              value={profile.goal_detail || ""}
              onChange={(e) => updateProfile({ goal_detail: e.target.value })}
              placeholder="Example: I want to lose 25 lbs, protect my hips, and look athletic again."
              rows={3}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40"
            />
          </label>
        </Section>

        <Section
          title="Body Data"
          subtitle="This helps the coach shape calories, protein, steps, workout volume, and progression."
          tone="cyan"
        >
          <div className="grid gap-3 md:grid-cols-3">
            <Field
              label="Age"
              value={profile.age}
              onChange={(value) => updateProfile({ age: value })}
              type="number"
              placeholder="35"
            />

            <div className="grid grid-cols-2 gap-2">
              <Field
                label="Height ft"
                value={profile.height_ft}
                onChange={(value) => updateProfile({ height_ft: value })}
                type="number"
                placeholder="6"
              />

              <Field
                label="Height in"
                value={profile.height_in}
                onChange={(value) => updateProfile({ height_in: value })}
                type="number"
                placeholder="0"
              />
            </div>

            <Field
              label="Current weight"
              value={profile.weight}
              onChange={(value) => {
                updateProfile({ weight: value });
                updateSnapshot({ weight: value });
              }}
              type="number"
              placeholder="210"
            />

            <Field
              label="Target weight"
              value={profile.target_weight}
              onChange={(value) => updateProfile({ target_weight: value })}
              type="number"
              placeholder="190"
            />

            <SelectField
              label="Activity level"
              value={profile.activity_level}
              onChange={(value) => updateProfile({ activity_level: value })}
              options={["Low", "Moderate", "High", "Athlete"]}
            />

            <SelectField
              label="Training identity"
              value={profile.training_identity}
              onChange={(value) => updateProfile({ training_identity: value })}
              options={[
                "Beginner",
                "Busy parent",
                "Everyday athlete",
                "Former athlete",
                "Fitness junkie",
                "Weight loss user",
                "Strength user",
                "Recovery user",
              ]}
            />
          </div>
        </Section>

        <Section
          title="Training Setup"
          subtitle="This keeps the plan realistic for people with real schedules."
          tone="emerald"
        >
          <div className="grid gap-3 md:grid-cols-3">
            <SelectField
              label="Experience"
              value={profile.experience}
              onChange={(value) => updateProfile({ experience: value })}
              options={["Beginner", "Restarting", "Intermediate", "Advanced", "Athlete"]}
            />

            <SelectField
              label="Training days per week"
              value={profile.training_days}
              onChange={(value) => updateProfile({ training_days: value })}
              options={["1", "2", "3", "4", "5", "6", "7"]}
            />

            <SelectField
              label="Preferred workout time"
              value={profile.preferred_time}
              onChange={(value) => updateProfile({ preferred_time: value })}
              options={["10 minutes", "20 minutes", "30 minutes", "45 minutes", "60 minutes", "90 minutes"]}
            />

            <SelectField
              label="Equipment"
              value={profile.preferred_equipment}
              onChange={(value) => {
                updateProfile({ preferred_equipment: value });
                updateSnapshot({ equipment: value });
              }}
              options={["Bodyweight", "Dumbbells", "Bands", "Full gym", "Machines", "Mixed"]}
            />

            <SelectField
              label="Training location"
              value={profile.training_location}
              onChange={(value) => updateProfile({ training_location: value })}
              options={["Home", "Gym", "Outside", "Travel", "Mixed"]}
            />

            <SelectField
              label="Schedule style"
              value={profile.schedule_style}
              onChange={(value) => updateProfile({ schedule_style: value })}
              options={["Flexible", "Strict plan", "Busy schedule", "Shift work", "Random"]}
            />
          </div>
        </Section>

        <Section
          title="Coach Personality"
          subtitle="Some users need a push. Others need consistency first. The coach should adapt."
          tone="amber"
        >
          <div className="grid gap-3 md:grid-cols-3">
            <SelectField
              label="Coaching intensity"
              value={profile.coaching_intensity}
              onChange={(value) => updateProfile({ coaching_intensity: value })}
              options={[
                "Gentle",
                "Balanced",
                "Push me",
                "Hardcore",
                "Recovery-first",
              ]}
            />

            <SelectField
              label="Accountability"
              value={profile.accountability_level}
              onChange={(value) => updateProfile({ accountability_level: value })}
              options={[
                "Low pressure",
                "Normal",
                "Hold me accountable",
                "No excuses",
              ]}
            />

            <SelectField
              label="Progression preference"
              value={profile.progression_preference}
              onChange={(value) => updateProfile({ progression_preference: value })}
              options={["Auto", "Day-to-day", "Week-to-week", "Hybrid"]}
            />

            <SelectField
              label="Nutrition focus"
              value={profile.nutrition_focus}
              onChange={(value) => updateProfile({ nutrition_focus: value })}
              options={[
                "Protein and consistency",
                "Fat loss calories",
                "Muscle gain calories",
                "Performance fuel",
                "Simple habits",
                "Not tracking yet",
              ]}
            />
          </div>
        </Section>

        <Section
          title="Weak Areas / Limits"
          subtitle="This prevents the coach from pushing the wrong thing too hard."
          tone="slate"
        >
          <div className="flex flex-wrap gap-2">
            {WEAK_AREAS.map((area) => (
              <PillToggle
                key={area}
                active={(profile.weak_areas || []).includes(area)}
                onClick={() => toggleWeakArea(area)}
                tone="amber"
              >
                {area}
              </PillToggle>
            ))}
          </div>

          <label className="mt-3 block">
            <div className="mb-1 text-xs font-semibold text-slate-400">Limitations / history</div>
            <textarea
              value={profile.limitations || ""}
              onChange={(e) => updateProfile({ limitations: e.target.value })}
              placeholder="Example: hip surgery, knee pain, shoulder tightness, low back pain, no running."
              rows={3}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40"
            />
          </label>

          <label className="mt-3 block">
            <div className="mb-1 text-xs font-semibold text-slate-400">Movements to avoid</div>
            <textarea
              value={profile.avoid_movements || ""}
              onChange={(e) => updateProfile({ avoid_movements: e.target.value })}
              placeholder="Example: deep squats, overhead press, jumping, sprinting."
              rows={2}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40"
            />
          </label>
        </Section>

        <section className="rounded-3xl border border-fuchsia-500/25 bg-fuchsia-500/10 p-4">
          <div className="text-sm font-black text-white">Coach Path</div>
          <div className="mt-2 text-2xl font-black text-fuchsia-100">{coachPath}</div>
          <div className="mt-2 text-xs leading-5 text-fuchsia-100/80">
            This profile now gives the coach enough context to push, hold, protect, or repeat based on the user’s actual goal and daily logs.
          </div>
        </section>
      </div>
    </HealthDrawer>
  );
}