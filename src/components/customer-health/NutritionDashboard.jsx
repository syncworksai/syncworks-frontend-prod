// src/components/customer-health/NutritionDashboard.jsx
import React, { useMemo, useState } from "react";

function safeNumber(value, fallback = 0) {
  const parsed = Number(
    String(value ?? "").replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(parsed) ? parsed : fallback;
}

function todayYmd() {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function addDays(ymd, days) {
  const date = new Date(`${ymd}T12:00:00`);
  date.setDate(date.getDate() + days);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function mealValue(meal, key) {
  if (key === "calories") {
    return safeNumber(meal?.calories ?? meal?.value, 0);
  }

  if (key === "protein") {
    return safeNumber(meal?.protein ?? meal?.secondary, 0);
  }

  return safeNumber(meal?.[key], 0);
}

function sumMeals(meals) {
  return meals.reduce(
    (totals, meal) => ({
      calories:
        totals.calories + mealValue(meal, "calories"),
      protein:
        totals.protein + mealValue(meal, "protein"),
      carbs:
        totals.carbs + mealValue(meal, "carbs"),
      fat:
        totals.fat + mealValue(meal, "fat"),
    }),
    {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    }
  );
}

function MacroCard({
  label,
  value,
  goal,
  suffix = "",
  tone = "cyan",
}) {
  const safeValue = safeNumber(value, 0);
  const safeGoal = safeNumber(goal, 0);
  const remaining = Math.max(0, safeGoal - safeValue);
  const percent = safeGoal
    ? Math.min(100, Math.round((safeValue / safeGoal) * 100))
    : 0;

  const tones = {
    cyan: "from-cyan-300/25 to-cyan-300/5 border-cyan-300/20",
    lime: "from-lime-300/25 to-lime-300/5 border-lime-300/20",
    fuchsia:
      "from-fuchsia-300/25 to-fuchsia-300/5 border-fuchsia-300/20",
    amber:
      "from-amber-300/25 to-amber-300/5 border-amber-300/20",
  };

  const fills = {
    cyan: "bg-cyan-300",
    lime: "bg-lime-300",
    fuchsia: "bg-fuchsia-300",
    amber: "bg-amber-300",
  };

  return (
    <div
      className={`rounded-[1.4rem] border bg-gradient-to-br p-4 ${
        tones[tone] || tones.cyan
      }`}
    >
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </div>

      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <div className="text-3xl font-black text-white">
            {Math.round(safeValue)}
            {suffix}
          </div>

          <div className="mt-1 text-xs font-bold text-slate-400">
            {safeGoal
              ? `${Math.round(remaining)}${suffix} remaining`
              : "No goal set"}
          </div>
        </div>

        <div className="text-xs font-black text-slate-500">
          {safeGoal ? `${Math.round(safeGoal)}${suffix}` : "—"}
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/30">
        <div
          className={`h-full rounded-full ${
            fills[tone] || fills.cyan
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function MealCard({
  meal,
  onEdit,
  onDelete,
  onReuse,
}) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-white">
            {meal?.description ||
              meal?.note ||
              "Meal"}
          </div>

          <div className="mt-1 text-xs font-bold text-slate-500">
            {meal?.ymd || ""}
            {meal?.estimate_confidence
              ? ` · ${meal.estimate_confidence} confidence`
              : ""}
          </div>
        </div>

        <div className="shrink-0 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-black text-slate-300">
          {Math.round(mealValue(meal, "calories"))} cal
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-black/20 p-2">
          <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
            Protein
          </div>
          <div className="mt-1 text-sm font-black text-lime-200">
            {Math.round(mealValue(meal, "protein"))}g
          </div>
        </div>

        <div className="rounded-xl bg-black/20 p-2">
          <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
            Carbs
          </div>
          <div className="mt-1 text-sm font-black text-cyan-200">
            {Math.round(mealValue(meal, "carbs"))}g
          </div>
        </div>

        <div className="rounded-xl bg-black/20 p-2">
          <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
            Fat
          </div>
          <div className="mt-1 text-sm font-black text-amber-200">
            {Math.round(mealValue(meal, "fat"))}g
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onReuse?.(meal)}
          className="h-10 rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-xs font-black text-cyan-100"
        >
          Reuse
        </button>

        <button
          type="button"
          onClick={() => onEdit?.(meal)}
          className="h-10 rounded-xl border border-fuchsia-300/20 bg-fuchsia-300/10 text-xs font-black text-fuchsia-100"
        >
          Edit
        </button>

        <button
          type="button"
          onClick={() => onDelete?.(meal)}
          className="h-10 rounded-xl border border-rose-300/20 bg-rose-300/10 text-xs font-black text-rose-100"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function NutritionDashboard({
  open,
  onClose,
  profile,
  snapshot,
  progressLogs,
  onOpenCoach,
  onOpenGoals,
  onOpenMealPlanner,
  onEditMeal,
  onDeleteMeal,
  onReuseMeal,
}) {
  const [selectedDate, setSelectedDate] =
    useState(todayYmd());

  const meals = useMemo(
    () =>
      (Array.isArray(progressLogs)
        ? progressLogs
        : []
      )
        .filter(
          (entry) =>
            entry?.type === "meal" &&
            entry?.ymd === selectedDate
        )
        .slice()
        .reverse(),
    [progressLogs, selectedDate]
  );

  const totals = useMemo(
    () => sumMeals(meals),
    [meals]
  );

  const calorieGoal = safeNumber(
    snapshot?.calorie_goal ||
      profile?.calorie_goal,
    0
  );

  const proteinGoal = safeNumber(
    snapshot?.protein_goal ||
      profile?.protein_goal,
    0
  );

  const carbGoal = safeNumber(
    snapshot?.carb_goal ||
      profile?.carb_goal,
    0
  );

  const fatGoal = safeNumber(
    snapshot?.fat_goal ||
      profile?.fat_goal,
    0
  );

  const last7 = useMemo(() => {
    const rows = [];

    for (let index = 6; index >= 0; index -= 1) {
      const ymd = addDays(todayYmd(), -index);
      const dayMeals = (
        Array.isArray(progressLogs)
          ? progressLogs
          : []
      ).filter(
        (entry) =>
          entry?.type === "meal" &&
          entry?.ymd === ymd
      );

      rows.push({
        ymd,
        ...sumMeals(dayMeals),
      });
    }

    return rows;
  }, [progressLogs]);

  const averageCalories = Math.round(
    last7.reduce(
      (sum, day) => sum + day.calories,
      0
    ) / 7
  );

  const averageProtein = Math.round(
    last7.reduce(
      (sum, day) => sum + day.protein,
      0
    ) / 7
  );

  const coachMessage = useMemo(() => {
    const caloriesRemaining = Math.max(
      0,
      calorieGoal - totals.calories
    );

    const proteinRemaining = Math.max(
      0,
      proteinGoal - totals.protein
    );

    if (!calorieGoal || !proteinGoal) {
      return "Set your calorie and macro targets to unlock remaining-goal guidance.";
    }

    if (!meals.length) {
      return "No meals are logged for this day yet. Log your first meal so SyncWorks can guide the rest of the day.";
    }

    if (
      proteinGoal &&
      proteinRemaining > 40 &&
      calorieGoal &&
      caloriesRemaining < 700
    ) {
      return `Protein is still ${Math.round(
        proteinRemaining
      )}g low while calories are tighter. Choose a lean, high-protein meal next.`;
    }

    if (
      calorieGoal &&
      totals.calories > calorieGoal
    ) {
      return "You are over today’s calorie target. Keep the next choice lighter and focus on hydration, vegetables, and lean protein.";
    }

    if (
      proteinGoal &&
      totals.protein >= proteinGoal
    ) {
      return "Protein is on target. Use the rest of today’s calories for a balanced meal that supports recovery.";
    }

    if (proteinGoal) {
      return `You need about ${Math.round(
        proteinRemaining
      )}g more protein today.`;
    }

    return "Your meal history is ready. Add nutrition goals in your profile to unlock more specific guidance.";
  }, [
    meals.length,
    totals.calories,
    totals.protein,
    calorieGoal,
    proteinGoal,
  ]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[134] flex items-end justify-center bg-black/80 p-3 backdrop-blur-xl sm:items-center">
      <button
        type="button"
        aria-label="Close Nutrition Dashboard"
        onClick={onClose}
        className="absolute inset-0"
      />

      <section className="relative z-[135] max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-fuchsia-300/20 bg-[radial-gradient(circle_at_top_left,rgba(255,59,212,0.10),transparent_28%),radial-gradient(circle_at_top_right,rgba(112,255,61,0.08),transparent_28%),linear-gradient(180deg,#07111f,#040812)] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.72)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-200">
              SyncWorks Nutrition
            </div>

            <h2 className="mt-1 text-3xl font-black text-white">
              Nutrition Command Center
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Track meals, see remaining macros, reuse recent meals, and get a clear next-food decision.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenMealPlanner}
              className="h-11 rounded-2xl border border-lime-300/30 bg-lime-300/15 px-4 text-sm font-black text-lime-100"
            >
              What Should I Eat?
            </button>

            <button
              type="button"
              onClick={onOpenGoals}
              className="h-11 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 text-sm font-black text-cyan-100"
            >
              Set Targets
            </button>

            <button
              type="button"
              onClick={() =>
                onOpenCoach?.(null)
              }
              className="h-11 rounded-2xl border border-lime-300/30 bg-lime-300/15 px-4 text-sm font-black text-lime-100"
            >
              + Log Meal
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] font-black text-white"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MacroCard
            label="Calories"
            value={totals.calories}
            goal={calorieGoal}
            tone="fuchsia"
          />

          <MacroCard
            label="Protein"
            value={totals.protein}
            goal={proteinGoal}
            suffix="g"
            tone="lime"
          />

          <MacroCard
            label="Carbs"
            value={totals.carbs}
            goal={carbGoal}
            suffix="g"
            tone="cyan"
          />

          <MacroCard
            label="Fat"
            value={totals.fat}
            goal={fatGoal}
            suffix="g"
            tone="amber"
          />
        </div>

        <div className="mt-4 rounded-[1.4rem] border border-cyan-300/20 bg-cyan-300/[0.07] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">
            Coach Guidance
          </div>

          <div className="mt-1 text-lg font-black text-white">
            {coachMessage}
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.5fr_0.8fr]">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-lime-200">
                  Meal Timeline
                </div>

                <div className="mt-1 text-xl font-black text-white">
                  {meals.length
                    ? `${meals.length} meal${
                        meals.length === 1 ? "" : "s"
                      } logged`
                    : "No meals logged"}
                </div>
              </div>

              <input
                type="date"
                value={selectedDate}
                onChange={(event) =>
                  setSelectedDate(
                    event.target.value
                  )
                }
                className="h-11 rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm font-black text-white outline-none focus:border-cyan-300/40"
              />
            </div>

            <div className="mt-4 space-y-3">
              {meals.length ? (
                meals.map((meal) => (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    onReuse={onReuseMeal}
                    onEdit={onEditMeal}
                    onDelete={onDeleteMeal}
                  />
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
                  Log a meal to begin today’s timeline.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-fuchsia-200">
                Seven-Day Average
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-black/20 p-4">
                  <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                    Calories
                  </div>

                  <div className="mt-1 text-2xl font-black text-white">
                    {averageCalories}
                  </div>
                </div>

                <div className="rounded-2xl bg-black/20 p-4">
                  <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                    Protein
                  </div>

                  <div className="mt-1 text-2xl font-black text-lime-200">
                    {averageProtein}g
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-amber-300/20 bg-amber-300/[0.07] p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-200">
                Quick Reminder
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Restaurant and homemade meal values are estimates. Confirm portions and edit macros when needed.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
