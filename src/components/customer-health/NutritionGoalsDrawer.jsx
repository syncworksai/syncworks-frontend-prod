// src/components/customer-health/NutritionGoalsDrawer.jsx
import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

function safeNumber(value, fallback = 0) {
  const parsed = Number(
    String(value ?? "").replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function calculateTargets({
  sex,
  age,
  weightLb,
  heightFt,
  heightIn,
  activity,
  goal,
}) {
  const weightKg = safeNumber(weightLb) * 0.453592;
  const heightCm =
    (safeNumber(heightFt) * 12 +
      safeNumber(heightIn)) *
    2.54;

  if (
    !weightKg ||
    !heightCm ||
    !safeNumber(age)
  ) {
    return null;
  }

  const base =
    10 * weightKg +
    6.25 * heightCm -
    5 * safeNumber(age);

  const bmr =
    sex === "female"
      ? base - 161
      : base + 5;

  const activityMap = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  const maintenance =
    bmr *
    (activityMap[activity] || 1.55);

  const adjustmentMap = {
    lose_fast: -600,
    lose: -350,
    maintain: 0,
    gain: 250,
    gain_fast: 450,
  };

  const calories = Math.max(
    1200,
    Math.round(
      maintenance +
        (adjustmentMap[goal] || 0)
    )
  );

  const proteinPerLb =
    goal === "gain" ||
    goal === "gain_fast"
      ? 0.9
      : goal === "lose" ||
        goal === "lose_fast"
      ? 0.85
      : 0.8;

  const protein = Math.round(
    safeNumber(weightLb) *
      proteinPerLb
  );

  const fat = Math.round(
    (calories * 0.27) / 9
  );

  const carbs = Math.max(
    0,
    Math.round(
      (calories -
        protein * 4 -
        fat * 9) /
        4
    )
  );

  return {
    calories,
    protein,
    carbs,
    fat,
    maintenance: Math.round(maintenance),
    bmr: Math.round(bmr),
  };
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  suffix = "",
  options = null,
}) {
  return (
    <label className="block">
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>

      <div className="relative mt-2">
        {options ? (
          <select
            value={value}
            onChange={(event) =>
              onChange(event.target.value)
            }
            className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm font-black text-white outline-none focus:border-cyan-300/40"
          >
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            inputMode={
              type === "number"
                ? "decimal"
                : undefined
            }
            value={value}
            onChange={(event) =>
              onChange(event.target.value)
            }
            className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 pr-12 text-sm font-black text-white outline-none focus:border-cyan-300/40"
          />
        )}

        {suffix && !options ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-black text-slate-500">
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
  );
}

export default function NutritionGoalsDrawer({
  open,
  onClose,
  profile,
  snapshot,
  setProfile,
  setSnapshot,
}) {
  const [sex, setSex] = useState("male");
  const [age, setAge] = useState("");
  const [weightLb, setWeightLb] =
    useState("");
  const [heightFt, setHeightFt] =
    useState("");
  const [heightIn, setHeightIn] =
    useState("");
  const [activity, setActivity] =
    useState("moderate");
  const [goal, setGoal] =
    useState("maintain");
  const [manualCalories, setManualCalories] =
    useState("");
  const [manualProtein, setManualProtein] =
    useState("");
  const [manualCarbs, setManualCarbs] =
    useState("");
  const [manualFat, setManualFat] =
    useState("");
  const [saved, setSaved] =
    useState(false);

  useEffect(() => {
    if (!open) return;

    setSex(
      profile?.sex ||
        profile?.biological_sex ||
        "male"
    );
    setAge(profile?.age || "");
    setWeightLb(
      profile?.weight ||
        snapshot?.weight ||
        ""
    );
    setHeightFt(
      profile?.height_ft || ""
    );
    setHeightIn(
      profile?.height_in || ""
    );
    setActivity(
      profile?.activity_level ||
        "moderate"
    );
    setGoal(
      profile?.nutrition_goal ||
        "maintain"
    );
    setManualCalories(
      String(
        snapshot?.calorie_goal ||
          profile?.calorie_goal ||
          ""
      )
    );
    setManualProtein(
      String(
        snapshot?.protein_goal ||
          profile?.protein_goal ||
          ""
      )
    );
    setManualCarbs(
      String(
        snapshot?.carb_goal ||
          profile?.carb_goal ||
          ""
      )
    );
    setManualFat(
      String(
        snapshot?.fat_goal ||
          profile?.fat_goal ||
          ""
      )
    );
    setSaved(false);
  }, [open, profile, snapshot]);

  const calculated = useMemo(
    () =>
      calculateTargets({
        sex,
        age,
        weightLb,
        heightFt,
        heightIn,
        activity,
        goal,
      }),
    [
      sex,
      age,
      weightLb,
      heightFt,
      heightIn,
      activity,
      goal,
    ]
  );

  if (!open) return null;

  function applyCalculated() {
    if (!calculated) return;

    setManualCalories(
      String(calculated.calories)
    );
    setManualProtein(
      String(calculated.protein)
    );
    setManualCarbs(
      String(calculated.carbs)
    );
    setManualFat(
      String(calculated.fat)
    );
  }

  function saveTargets() {
    const calories = Math.round(
      safeNumber(manualCalories)
    );
    const protein = Math.round(
      safeNumber(manualProtein)
    );
    const carbs = Math.round(
      safeNumber(manualCarbs)
    );
    const fat = Math.round(
      safeNumber(manualFat)
    );

    if (
      calories <= 0 ||
      protein <= 0
    ) {
      return;
    }

    const updatedAt =
      new Date().toISOString();

    setProfile((previous) => ({
      ...previous,
      sex,
      biological_sex: sex,
      age: safeNumber(age),
      weight: safeNumber(weightLb),
      height_ft: safeNumber(heightFt),
      height_in: safeNumber(heightIn),
      activity_level: activity,
      nutrition_goal: goal,
      calorie_goal: calories,
      protein_goal: protein,
      carb_goal: carbs,
      fat_goal: fat,
      nutrition_targets_updated_at:
        updatedAt,
    }));

    setSnapshot((previous) => ({
      ...previous,
      calorie_goal: calories,
      protein_goal: protein,
      carb_goal: carbs,
      fat_goal: fat,
      nutrition_goal: goal,
      nutrition_targets_updated_at:
        updatedAt,
    }));

    setSaved(true);
  }

  return (
    <div className="fixed inset-0 z-[140] flex items-end justify-center bg-black/80 p-3 backdrop-blur-xl sm:items-center">
      <button
        type="button"
        aria-label="Close nutrition goals"
        onClick={onClose}
        className="absolute inset-0"
      />

      <section className="relative z-[141] max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_top_left,rgba(52,223,255,0.10),transparent_28%),radial-gradient(circle_at_top_right,rgba(112,255,61,0.08),transparent_28%),linear-gradient(180deg,#07111f,#040812)] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.72)] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">
              Nutrition Target Setup
            </div>

            <h2 className="mt-1 text-3xl font-black text-white">
              Set your daily targets
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Generate a starting estimate from body size, activity, and goal, then adjust the numbers before saving.
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

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Biological sex"
            value={sex}
            onChange={setSex}
            options={[
              {
                value: "male",
                label: "Male",
              },
              {
                value: "female",
                label: "Female",
              },
            ]}
          />

          <Field
            label="Age"
            value={age}
            onChange={setAge}
            type="number"
            suffix="yr"
          />

          <Field
            label="Weight"
            value={weightLb}
            onChange={setWeightLb}
            type="number"
            suffix="lb"
          />

          <Field
            label="Height feet"
            value={heightFt}
            onChange={setHeightFt}
            type="number"
            suffix="ft"
          />

          <Field
            label="Height inches"
            value={heightIn}
            onChange={setHeightIn}
            type="number"
            suffix="in"
          />

          <Field
            label="Activity level"
            value={activity}
            onChange={setActivity}
            options={[
              {
                value: "sedentary",
                label: "Mostly sedentary",
              },
              {
                value: "light",
                label: "Light activity",
              },
              {
                value: "moderate",
                label: "Moderately active",
              },
              {
                value: "active",
                label: "Very active",
              },
              {
                value: "very_active",
                label: "Athlete / highly active",
              },
            ]}
          />

          <Field
            label="Primary goal"
            value={goal}
            onChange={setGoal}
            options={[
              {
                value: "lose_fast",
                label: "Faster fat loss",
              },
              {
                value: "lose",
                label: "Steady fat loss",
              },
              {
                value: "maintain",
                label: "Maintain weight",
              },
              {
                value: "gain",
                label: "Lean muscle gain",
              },
              {
                value: "gain_fast",
                label: "Faster weight gain",
              },
            ]}
          />
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-lime-300/20 bg-lime-300/[0.07] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-lime-200">
                Suggested Starting Point
              </div>

              <div className="mt-1 text-lg font-black text-white">
                {calculated
                  ? `${calculated.calories} calories · ${calculated.protein}g protein · ${calculated.carbs}g carbs · ${calculated.fat}g fat`
                  : "Add age, weight, and height to calculate targets."}
              </div>

              {calculated ? (
                <div className="mt-1 text-xs font-bold text-slate-500">
                  Estimated maintenance:{" "}
                  {calculated.maintenance} calories
                </div>
              ) : null}
            </div>

            <button
              type="button"
              disabled={!calculated}
              onClick={applyCalculated}
              className="h-11 shrink-0 rounded-2xl border border-lime-300/30 bg-lime-300/15 px-4 text-sm font-black text-lime-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Use Suggested
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-fuchsia-200">
            Final Daily Targets
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field
              label="Calories"
              value={manualCalories}
              onChange={setManualCalories}
              type="number"
              suffix="cal"
            />

            <Field
              label="Protein"
              value={manualProtein}
              onChange={setManualProtein}
              type="number"
              suffix="g"
            />

            <Field
              label="Carbs"
              value={manualCarbs}
              onChange={setManualCarbs}
              type="number"
              suffix="g"
            />

            <Field
              label="Fat"
              value={manualFat}
              onChange={setManualFat}
              type="number"
              suffix="g"
            />
          </div>

          <button
            type="button"
            onClick={saveTargets}
            disabled={
              safeNumber(manualCalories) <= 0 ||
              safeNumber(manualProtein) <= 0
            }
            className="mt-4 h-12 w-full rounded-2xl border border-cyan-300/30 bg-gradient-to-r from-cyan-300/15 to-fuchsia-300/15 text-sm font-black text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save Nutrition Targets
          </button>

          {saved ? (
            <div className="mt-3 rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-3 text-sm font-bold text-emerald-100">
              Nutrition targets saved and synced to the dashboard.
            </div>
          ) : null}
        </div>

        <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-4 text-xs leading-5 text-slate-400">
          These targets are general estimates, not medical nutrition advice. Pregnancy, eating disorders, kidney disease, diabetes, and other medical conditions require individualized guidance from a qualified professional.
        </div>
      </section>
    </div>
  );
}
