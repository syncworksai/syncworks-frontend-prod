// src/components/customer-health/QuestionnaireDrawer.jsx
import React, { useMemo } from "react";
import HealthDrawer from "./HealthDrawer";
import { cx } from "./healthStorage";

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  min,
  max,
  step,
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-slate-400">
        {label}
      </div>
      <input
        type={type}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40"
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
      <div className="mb-1 text-xs font-semibold text-slate-400">
        {label}
      </div>
      <select
        value={value || options[0] || ""}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none transition focus:border-cyan-400/40"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function PillToggle({
  active,
  children,
  onClick,
  tone = "cyan",
}) {
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

function Section({
  title,
  subtitle,
  children,
  tone = "slate",
}) {
  const tones = {
    cyan: "border-cyan-500/20 bg-cyan-500/10",
    emerald:
      "border-emerald-500/20 bg-emerald-500/10",
    fuchsia:
      "border-fuchsia-500/20 bg-fuchsia-500/10",
    amber: "border-amber-500/20 bg-amber-500/10",
    slate: "border-white/10 bg-white/[0.03]",
  };

  return (
    <section
      className={cx(
        "rounded-3xl border p-4",
        tones[tone] || tones.slate
      )}
    >
      <div className="mb-4">
        <div className="text-sm font-black text-white">
          {title}
        </div>
        {subtitle ? (
          <div className="mt-1 text-xs leading-5 text-slate-400">
            {subtitle}
          </div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function toggleArrayValue(currentValue, value) {
  const current = Array.isArray(currentValue)
    ? currentValue
    : [];

  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
}

function inferCoachPath(profile) {
  const goal = String(
    profile.primary_goal || ""
  ).toLowerCase();
  const limitations = String(
    profile.limitations || ""
  ).toLowerCase();
  const sport = String(profile.sport || "").trim();

  if (
    limitations.includes("pain") ||
    limitations.includes("surgery") ||
    limitations.includes("injury")
  ) {
    return "Recovery-aware personalized plan";
  }

  if (
    sport ||
    goal.includes("sport") ||
    goal.includes("athletic")
  ) {
    return "Athletic performance plan";
  }

  if (
    goal.includes("bodybuild") ||
    goal.includes("muscle")
  ) {
    return "Bodybuilding and hypertrophy plan";
  }

  if (goal.includes("strength")) {
    return "Strength and power plan";
  }

  if (
    goal.includes("fat") ||
    goal.includes("weight")
  ) {
    return "Fat loss and conditioning plan";
  }

  if (
    goal.includes("mobility") ||
    goal.includes("longevity")
  ) {
    return "Mobility and longevity plan";
  }

  return "General health and fitness plan";
}

const TRAINING_FOCUS_OPTIONS = [
  "Strength",
  "Muscle building",
  "Cardio",
  "Athletic performance",
  "Plyometrics",
  "Mobility",
  "Stretching",
  "HIIT",
  "Recovery",
];

const TRAINING_DAY_OPTIONS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];

const EQUIPMENT_OPTIONS = [
  "Bodyweight",
  "Dumbbells",
  "Bands",
  "Barbell",
  "Machines",
  "Full gym",
  "Cardio equipment",
];

const CARDIO_OPTIONS = [
  "Walking",
  "Running",
  "Incline treadmill",
  "Cycling",
  "Rowing",
  "Elliptical",
  "Stair climber",
  "Swimming",
  "Sports conditioning",
  "HIIT",
  "Sprints",
];

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
  const safeProfile = profile || {};

  const coachPath = useMemo(
    () => inferCoachPath(safeProfile),
    [safeProfile]
  );

  function updateProfile(patch) {
    setProfile((previous) => ({
      ...previous,
      ...patch,
      ai_plan_intake_updated_at:
        new Date().toISOString(),
    }));
  }

  function updateSnapshot(patch) {
    setSnapshot((previous) => ({
      ...previous,
      ...patch,
      updated_at: new Date().toISOString(),
    }));
  }

  function toggleProfileArray(field, value) {
    updateProfile({
      [field]: toggleArrayValue(
        safeProfile[field],
        value
      ),
    });
  }

  function finishIntake() {
    const completedAt =
      new Date().toISOString();

    updateProfile({
      ai_plan_intake_completed_at: completedAt,
      training_path: "ai_designed",
      preferred_time:
        safeProfile.preferred_start_time ||
        safeProfile.preferred_time ||
        "08:00",
    });

    updateSnapshot({
      training_path: "ai_designed",
      preferred_workout_time:
        safeProfile.preferred_start_time ||
        safeProfile.preferred_time ||
        "08:00",
      goal:
        safeProfile.primary_goal ||
        snapshot?.goal ||
        "General health",
      equipment:
        (
          Array.isArray(
            safeProfile.available_equipment
          )
            ? safeProfile.available_equipment
            : []
        ).join(", ") ||
        safeProfile.preferred_equipment ||
        snapshot?.equipment ||
        "Bodyweight",
      ai_plan_ready: true,
      ai_plan_intake_completed_at:
        completedAt,
    });

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "sw_health_ai_plan_ready",
        JSON.stringify({
          ready: true,
          completed_at: completedAt,
        })
      );
    }

    onClose?.();
  }

  const selectedTrainingDays =
    Array.isArray(
      safeProfile.preferred_training_days
    )
      ? safeProfile.preferred_training_days
      : [];

  return (
    <HealthDrawer
      open={open}
      onClose={onClose}
      title="AI Fitness Plan Intake"
      subtitle="Give SYNC the few details that matter. The coach will use them to build the right plan, schedule it at your preferred time, and adjust it as you progress."
    >
      <div className="space-y-5">
        <section className="rounded-3xl border border-lime-400/25 bg-[radial-gradient(circle_at_top_left,rgba(57,255,136,0.14),transparent_40%),rgba(57,255,136,0.06)] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-lime-200">
            What SYNC Will Build
          </div>
          <div className="mt-2 text-xl font-black text-white">
            One plan built around your body, goals, schedule, and experience
          </div>
          <div className="mt-2 text-sm leading-6 text-slate-300">
            SYNC will connect strength, cardio, mobility, stretching, recovery, nutrition, body weight, sets, reps, and progression. Beginners get more instruction. Advanced users can train harder with more control.
          </div>
        </section>

        <Section
          title="1. Your Goal"
          subtitle="Choose the result that matters most. You can still combine several training styles."
          tone="fuchsia"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <SelectField
              label="Primary goal"
              value={safeProfile.primary_goal}
              onChange={(value) => {
                updateProfile({
                  primary_goal: value,
                });
                updateSnapshot({ goal: value });
              }}
              options={[
                "General health",
                "Lose fat / weight loss",
                "Build muscle / bodybuilding",
                "Get stronger",
                "Athletic performance",
                "Improve conditioning",
                "Mobility and longevity",
                "Return after time off",
              ]}
            />

            <SelectField
              label="Experience level"
              value={safeProfile.experience}
              onChange={(value) =>
                updateProfile({
                  experience: value,
                  training_identity: value,
                })
              }
              options={[
                "Beginner",
                "Restarting",
                "Intermediate",
                "Advanced",
                "Competitive athlete",
              ]}
            />

            <Field
              label="Specific sport or activity"
              value={safeProfile.sport}
              onChange={(value) =>
                updateProfile({ sport: value })
              }
              placeholder="Softball, football, running, golf, hiking..."
            />

            <SelectField
              label="How hard should the coach push?"
              value={
                safeProfile.coaching_intensity
              }
              onChange={(value) =>
                updateProfile({
                  coaching_intensity: value,
                })
              }
              options={[
                "Build consistency",
                "Balanced progress",
                "Push me",
                "Train hard",
                "Competitive performance",
              ]}
            />
          </div>

          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold text-slate-400">
              Training focus â€” choose all that apply
            </div>
            <div className="flex flex-wrap gap-2">
              {TRAINING_FOCUS_OPTIONS.map(
                (focus) => (
                  <PillToggle
                    key={focus}
                    active={(
                      safeProfile.training_focuses ||
                      []
                    ).includes(focus)}
                    onClick={() =>
                      toggleProfileArray(
                        "training_focuses",
                        focus
                      )
                    }
                    tone="fuchsia"
                  >
                    {focus}
                  </PillToggle>
                )
              )}
            </div>
          </div>

          <label className="mt-4 block">
            <div className="mb-1 text-xs font-semibold text-slate-400">
              Describe what success looks like
            </div>
            <textarea
              value={
                safeProfile.goal_detail || ""
              }
              onChange={(event) =>
                updateProfile({
                  goal_detail:
                    event.target.value,
                })
              }
              placeholder="Example: Lose 12 lb, keep strength, improve softball speed, and protect my hips."
              rows={3}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40"
            />
          </label>
        </Section>

        <Section
          title="2. Body and Target"
          subtitle="This helps the coach shape calories, protein, training volume, cardio, recovery, and progression."
          tone="cyan"
        >
          <div className="grid gap-3 md:grid-cols-3">
            <Field
              label="Age"
              value={safeProfile.age}
              onChange={(value) =>
                updateProfile({ age: value })
              }
              type="number"
              min="13"
              max="100"
              placeholder="35"
            />

            <div className="grid grid-cols-2 gap-2">
              <Field
                label="Height ft"
                value={safeProfile.height_ft}
                onChange={(value) =>
                  updateProfile({
                    height_ft: value,
                  })
                }
                type="number"
                min="3"
                max="8"
                placeholder="5"
              />
              <Field
                label="Height in"
                value={safeProfile.height_in}
                onChange={(value) =>
                  updateProfile({
                    height_in: value,
                  })
                }
                type="number"
                min="0"
                max="11"
                placeholder="10"
              />
            </div>

            <Field
              label="Current weight (lb)"
              value={safeProfile.weight}
              onChange={(value) => {
                updateProfile({ weight: value });
                updateSnapshot({ weight: value });
              }}
              type="number"
              min="60"
              max="700"
              placeholder="180"
            />

            <Field
              label="Target weight (lb)"
              value={safeProfile.target_weight}
              onChange={(value) =>
                updateProfile({
                  target_weight: value,
                })
              }
              type="number"
              min="60"
              max="700"
              placeholder="170"
            />

            <SelectField
              label="Current activity level"
              value={safeProfile.activity_level}
              onChange={(value) =>
                updateProfile({
                  activity_level: value,
                })
              }
              options={[
                "Low",
                "Moderate",
                "High",
                "Athlete",
              ]}
            />

            <SelectField
              label="Nutrition approach"
              value={safeProfile.nutrition_focus}
              onChange={(value) =>
                updateProfile({
                  nutrition_focus: value,
                })
              }
              options={[
                "Simple habits",
                "Protein and consistency",
                "Fat loss calories",
                "Muscle gain calories",
                "Performance fuel",
                "Not tracking yet",
              ]}
            />
          </div>
        </Section>

        <Section
          title="3. Where and How You Train"
          subtitle="SYNC will create gym, home, outdoor, or mixed plans using equipment you actually have."
          tone="emerald"
        >
          <div className="grid gap-3 md:grid-cols-3">
            <SelectField
              label="Training location"
              value={
                safeProfile.training_location
              }
              onChange={(value) =>
                updateProfile({
                  training_location: value,
                })
              }
              options={[
                "Gym",
                "Home",
                "Both gym and home",
                "Outdoors",
                "Limited equipment",
              ]}
            />

            <SelectField
              label="Maximum workout length"
              value={
                safeProfile.session_length_minutes
              }
              onChange={(value) =>
                updateProfile({
                  session_length_minutes:
                    value,
                })
              }
              options={[
                "20",
                "30",
                "45",
                "60",
                "75",
                "90",
              ]}
            />

            <SelectField
              label="Schedule style"
              value={
                safeProfile.schedule_style
              }
              onChange={(value) =>
                updateProfile({
                  schedule_style: value,
                })
              }
              options={[
                "Flexible",
                "Strict plan",
                "Busy schedule",
                "Shift work",
                "Variable week",
              ]}
            />
          </div>

          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold text-slate-400">
              Available equipment â€” choose all that apply
            </div>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map(
                (equipment) => (
                  <PillToggle
                    key={equipment}
                    active={(
                      safeProfile.available_equipment ||
                      []
                    ).includes(equipment)}
                    onClick={() =>
                      toggleProfileArray(
                        "available_equipment",
                        equipment
                      )
                    }
                    tone="emerald"
                  >
                    {equipment}
                  </PillToggle>
                )
              )}
            </div>
          </div>
        </Section>

        <Section
          title="4. Your Weekly Schedule"
          subtitle="Choose the days and exact time you prefer. SYNC should schedule 8:00 AM when you say 8:00 AM."
          tone="amber"
        >
          <div className="grid gap-3 md:grid-cols-3">
            <Field
              label="Preferred workout start time"
              value={
                safeProfile.preferred_start_time ||
                safeProfile.preferred_time ||
                "08:00"
              }
              onChange={(value) =>
                updateProfile({
                  preferred_start_time: value,
                  preferred_time: value,
                })
              }
              type="time"
            />

            <SelectField
              label="Strength days per week"
              value={
                safeProfile.strength_days_per_week
              }
              onChange={(value) =>
                updateProfile({
                  strength_days_per_week:
                    value,
                })
              }
              options={[
                "0",
                "1",
                "2",
                "3",
                "4",
                "5",
                "6",
              ]}
            />

            <SelectField
              label="Cardio days per week"
              value={
                safeProfile.cardio_days_per_week
              }
              onChange={(value) =>
                updateProfile({
                  cardio_days_per_week:
                    value,
                })
              }
              options={[
                "0",
                "1",
                "2",
                "3",
                "4",
                "5",
                "6",
                "7",
              ]}
            />
          </div>

          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold text-slate-400">
              Days available to train
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {TRAINING_DAY_OPTIONS.map(
                (day) => (
                  <PillToggle
                    key={day}
                    active={selectedTrainingDays.includes(
                      day
                    )}
                    onClick={() =>
                      toggleProfileArray(
                        "preferred_training_days",
                        day
                      )
                    }
                    tone="amber"
                  >
                    {day}
                  </PillToggle>
                )
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold text-slate-400">
              Preferred cardio â€” choose any you enjoy
            </div>
            <div className="flex flex-wrap gap-2">
              {CARDIO_OPTIONS.map(
                (cardio) => (
                  <PillToggle
                    key={cardio}
                    active={(
                      safeProfile.preferred_cardio ||
                      []
                    ).includes(cardio)}
                    onClick={() =>
                      toggleProfileArray(
                        "preferred_cardio",
                        cardio
                      )
                    }
                    tone="cyan"
                  >
                    {cardio}
                  </PillToggle>
                )
              )}
            </div>
          </div>
        </Section>

        <Section
          title="5. Protect Your Body"
          subtitle="Tell SYNC what needs extra care so the plan can train around limitations instead of ignoring them."
          tone="slate"
        >
          <div className="flex flex-wrap gap-2">
            {WEAK_AREAS.map((area) => (
              <PillToggle
                key={area}
                active={(
                  safeProfile.weak_areas || []
                ).includes(area)}
                onClick={() =>
                  toggleProfileArray(
                    "weak_areas",
                    area
                  )
                }
                tone="amber"
              >
                {area}
              </PillToggle>
            ))}
          </div>

          <label className="mt-3 block">
            <div className="mb-1 text-xs font-semibold text-slate-400">
              Injuries, surgeries, pain, or limitations
            </div>
            <textarea
              value={
                safeProfile.limitations || ""
              }
              onChange={(event) =>
                updateProfile({
                  limitations:
                    event.target.value,
                })
              }
              placeholder="Example: hip surgery, knee pain, shoulder tightness, low back pain, no running."
              rows={3}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40"
            />
          </label>

          <label className="mt-3 block">
            <div className="mb-1 text-xs font-semibold text-slate-400">
              Movements to avoid
            </div>
            <textarea
              value={
                safeProfile.avoid_movements ||
                ""
              }
              onChange={(event) =>
                updateProfile({
                  avoid_movements:
                    event.target.value,
                })
              }
              placeholder="Example: deep squats, overhead press, jumping, sprinting."
              rows={2}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40"
            />
          </label>
        </Section>

        <section className="rounded-3xl border border-fuchsia-500/25 bg-fuchsia-500/10 p-4">
          <div className="text-sm font-black text-white">
            Recommended Coach Path
          </div>
          <div className="mt-2 text-2xl font-black text-fuchsia-100">
            {coachPath}
          </div>
          <div className="mt-2 text-xs leading-5 text-fuchsia-100/80">
            Your answers give SYNC enough context to build the weekly plan, schedule it correctly, and adjust training intensity as your results, nutrition, recovery, and performance change.
          </div>
        </section>

        <div className="sticky bottom-0 rounded-3xl border border-lime-300/25 bg-[#07111f]/95 p-3 backdrop-blur-xl">
          <button
            type="button"
            onClick={finishIntake}
            className="h-12 w-full rounded-2xl border border-lime-300/35 bg-lime-300/20 text-sm font-black text-lime-100 shadow-[0_0_28px_rgba(57,255,136,0.12)]"
          >
            Save Profile and Build My Plan
          </button>
          <div className="mt-2 text-center text-[10px] leading-4 text-slate-500">
            Your coach can be updated anytime as your goals, schedule, equipment, or body change.
          </div>
        </div>
      </div>
    </HealthDrawer>
  );
}