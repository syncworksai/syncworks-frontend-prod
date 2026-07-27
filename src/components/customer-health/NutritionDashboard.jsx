// src/components/customer-health/NutritionDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "syncworks_health_nutrition_profile_v1";

const GOALS = [
  ["lose_fat", "Lose fat"],
  ["burn_fat", "Improve fat-burning fitness"],
  ["build_muscle", "Build muscle"],
  ["performance", "Performance and stamina"],
  ["healthy_hormones", "Support healthy testosterone and hormones"],
  ["maintain", "Maintain weight and health"],
];

function safeNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
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
  if (key === "calories") return safeNumber(meal?.calories ?? meal?.value, 0);
  if (key === "protein") return safeNumber(meal?.protein ?? meal?.secondary, 0);
  return safeNumber(meal?.[key], 0);
}

function sumMeals(meals) {
  return meals.reduce(
    (totals, meal) => ({
      calories: totals.calories + mealValue(meal, "calories"),
      protein: totals.protein + mealValue(meal, "protein"),
      carbs: totals.carbs + mealValue(meal, "carbs"),
      fat: totals.fat + mealValue(meal, "fat"),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

function loadNutritionProfile() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      goals: Array.isArray(parsed.goals) ? parsed.goals : ["maintain"],
      targetDate: parsed.targetDate || "",
      targetWeight: parsed.targetWeight || "",
      weeklyBudget: parsed.weeklyBudget || "",
      activityLevel: parsed.activityLevel || "moderate",
      mealsPerDay: parsed.mealsPerDay || "3",
      dietaryPattern: parsed.dietaryPattern || "No preference",
    };
  } catch {
    return {
      goals: ["maintain"],
      targetDate: "",
      targetWeight: "",
      weeklyBudget: "",
      activityLevel: "moderate",
      mealsPerDay: "3",
      dietaryPattern: "No preference",
    };
  }
}

function deriveWeight(profile, snapshot) {
  return safeNumber(
    snapshot?.weight ||
      profile?.weight ||
      snapshot?.measurements?.weight ||
      profile?.measurements?.weight,
    180
  );
}

function calculateTargets({ weight, goals, activityLevel, workoutToday }) {
  const activityFactor = {
    low: 13,
    moderate: 15,
    high: 17,
    athlete: 18,
  }[activityLevel] || 15;

  let calories = Math.round(weight * activityFactor);
  let proteinPerPound = 0.8;
  let fatPercent = 0.28;
  const reasons = [];

  if (goals.includes("lose_fat")) {
    calories -= 350;
    proteinPerPound = Math.max(proteinPerPound, 0.9);
    reasons.push("A moderate calorie deficit supports gradual fat loss.");
  }

  if (goals.includes("burn_fat")) {
    calories -= 150;
    proteinPerPound = Math.max(proteinPerPound, 0.85);
    reasons.push("Calories stay controlled while carbohydrates remain available for conditioning.");
  }

  if (goals.includes("build_muscle")) {
    calories += 250;
    proteinPerPound = Math.max(proteinPerPound, 0.95);
    reasons.push("A small calorie surplus and higher protein support muscle gain.");
  }

  if (goals.includes("performance")) {
    calories += workoutToday ? 200 : 75;
    proteinPerPound = Math.max(proteinPerPound, 0.85);
    reasons.push("Training-day calories and carbohydrates support stamina and recovery.");
  }

  if (goals.includes("healthy_hormones")) {
    fatPercent = Math.max(fatPercent, 0.3);
    calories = Math.max(calories, Math.round(weight * 13));
    reasons.push(
      "The plan avoids aggressive restriction and protects adequate dietary fat, sleep, and recovery support."
    );
  }

  calories = Math.max(1200, calories);
  const protein = Math.round(weight * proteinPerPound);
  const fat = Math.round((calories * fatPercent) / 9);
  const carbs = Math.max(50, Math.round((calories - protein * 4 - fat * 9) / 4));

  return { calories, protein, carbs, fat, reasons };
}

function MacroCard({ label, value, goal, suffix = "", tone = "cyan" }) {
  const safeValue = safeNumber(value, 0);
  const safeGoal = safeNumber(goal, 0);
  const remaining = Math.max(0, safeGoal - safeValue);
  const percent = safeGoal
    ? Math.min(100, Math.round((safeValue / safeGoal) * 100))
    : 0;

  const tones = {
    cyan: "from-cyan-300/25 to-cyan-300/5 border-cyan-300/20",
    lime: "from-lime-300/25 to-lime-300/5 border-lime-300/20",
    fuchsia: "from-fuchsia-300/25 to-fuchsia-300/5 border-fuchsia-300/20",
    amber: "from-amber-300/25 to-amber-300/5 border-amber-300/20",
  };

  const fills = {
    cyan: "bg-cyan-300",
    lime: "bg-lime-300",
    fuchsia: "bg-fuchsia-300",
    amber: "bg-amber-300",
  };

  return (
    <div className={`rounded-[1.35rem] border bg-gradient-to-br p-3 ${tones[tone]}`}>
      <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div>
          <div className="text-2xl font-black text-white">
            {Math.round(safeValue)}{suffix}
          </div>
          <div className="mt-0.5 text-[10px] font-bold text-slate-400">
            {safeGoal ? `${Math.round(remaining)}${suffix} left` : "No target"}
          </div>
        </div>
        <div className="text-[10px] font-black text-slate-500">
          {safeGoal ? `${Math.round(safeGoal)}${suffix}` : "-"}
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/30">
        <div className={`h-full rounded-full ${fills[tone]}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function MealCard({ meal, onEdit, onDelete, onReuse }) {
  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.035] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-white">
            {meal?.description || meal?.note || "Meal"}
          </div>
          <div className="mt-1 text-[10px] font-bold text-slate-500">
            {meal?.ymd || ""}
          </div>
        </div>
        <div className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black text-slate-300">
          {Math.round(mealValue(meal, "calories"))} cal
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[10px]">
        <div className="rounded-xl bg-black/20 p-2 text-lime-200">
          <b>{Math.round(mealValue(meal, "protein"))}g</b><br />protein
        </div>
        <div className="rounded-xl bg-black/20 p-2 text-cyan-200">
          <b>{Math.round(mealValue(meal, "carbs"))}g</b><br />carbs
        </div>
        <div className="rounded-xl bg-black/20 p-2 text-amber-200">
          <b>{Math.round(mealValue(meal, "fat"))}g</b><br />fat
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <button type="button" onClick={() => onReuse?.(meal)} className="h-9 rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-[11px] font-black text-cyan-100">
          Reuse
        </button>
        <button type="button" onClick={() => onEdit?.(meal)} className="h-9 rounded-xl border border-fuchsia-300/20 bg-fuchsia-300/10 text-[11px] font-black text-fuchsia-100">
          Edit
        </button>
        <button type="button" onClick={() => onDelete?.(meal)} className="h-9 rounded-xl border border-rose-300/20 bg-rose-300/10 text-[11px] font-black text-rose-100">
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
  const [selectedDate, setSelectedDate] = useState(todayYmd());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [nutritionProfile, setNutritionProfile] = useState(loadNutritionProfile);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nutritionProfile));
    } catch {
      // Local persistence is best-effort until server nutrition-profile sync is added.
    }
  }, [nutritionProfile]);

  const allMeals = useMemo(
    () => (Array.isArray(progressLogs) ? progressLogs : []).filter((entry) => entry?.type === "meal"),
    [progressLogs]
  );

  const meals = useMemo(
    () => allMeals.filter((entry) => entry?.ymd === selectedDate).slice().reverse(),
    [allMeals, selectedDate]
  );

  const totals = useMemo(() => sumMeals(meals), [meals]);

  const workoutToday = Boolean(
    (Array.isArray(snapshot?.week_plan) ? snapshot.week_plan : []).find(
      (item) => item?.ymd === todayYmd() && item?.workout_name && item?.status !== "Completed"
    )
  );

  const derivedTargets = useMemo(
    () =>
      calculateTargets({
        weight: deriveWeight(profile, snapshot),
        goals: nutritionProfile.goals,
        activityLevel: nutritionProfile.activityLevel,
        workoutToday,
      }),
    [profile, snapshot, nutritionProfile.goals, nutritionProfile.activityLevel, workoutToday]
  );

  const calorieGoal = safeNumber(snapshot?.calorie_goal || profile?.calorie_goal, derivedTargets.calories);
  const proteinGoal = safeNumber(snapshot?.protein_goal || profile?.protein_goal, derivedTargets.protein);
  const carbGoal = safeNumber(snapshot?.carb_goal || profile?.carb_goal, derivedTargets.carbs);
  const fatGoal = safeNumber(snapshot?.fat_goal || profile?.fat_goal, derivedTargets.fat);

  const last7 = useMemo(() => {
    const rows = [];
    for (let index = 6; index >= 0; index -= 1) {
      const ymd = addDays(todayYmd(), -index);
      const dayMeals = allMeals.filter((entry) => entry?.ymd === ymd);
      rows.push({ ymd, count: dayMeals.length, ...sumMeals(dayMeals) });
    }
    return rows;
  }, [allMeals]);

  const frequentMeals = useMemo(() => {
    const counts = new Map();
    allMeals.forEach((meal) => {
      const label = String(meal?.description || meal?.note || "").trim();
      if (!label) return;
      const key = label.toLowerCase();
      const current = counts.get(key) || { meal, count: 0 };
      current.count += 1;
      counts.set(key, current);
    });
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  }, [allMeals]);

  const averages = useMemo(
    () => ({
      calories: Math.round(last7.reduce((sum, day) => sum + day.calories, 0) / 7),
      protein: Math.round(last7.reduce((sum, day) => sum + day.protein, 0) / 7),
    }),
    [last7]
  );

  const caloriesRemaining = Math.max(0, calorieGoal - totals.calories);
  const proteinRemaining = Math.max(0, proteinGoal - totals.protein);

  const aiMessage = useMemo(() => {
    if (!meals.length) {
      return workoutToday
        ? "Training is scheduled today. Start with protein and carbohydrates so the plan can support performance and recovery."
        : "No meals are logged for this day. Log the first meal to begin adaptive guidance.";
    }
    if (proteinRemaining > 40 && caloriesRemaining < 700) {
      return `Protein is ${Math.round(proteinRemaining)}g low while calories are tighter. Choose a lean, high-protein meal next.`;
    }
    if (totals.calories > calorieGoal) {
      return "Calories are above target. Keep the next choice lighter and prioritize lean protein, vegetables, and hydration.";
    }
    if (totals.protein >= proteinGoal) {
      return workoutToday
        ? "Protein is on target. Use remaining calories for carbohydrates and fluids that support today's training."
        : "Protein is on target. Finish the day with a balanced meal that supports recovery.";
    }
    return `About ${Math.round(proteinRemaining)}g protein and ${Math.round(caloriesRemaining)} calories remain today.`;
  }, [meals.length, workoutToday, proteinRemaining, caloriesRemaining, totals.calories, totals.protein, calorieGoal, proteinGoal]);

  function toggleGoal(goal) {
    setNutritionProfile((current) => {
      const hasGoal = current.goals.includes(goal);
      const nextGoals = hasGoal
        ? current.goals.filter((item) => item !== goal)
        : [...current.goals, goal];
      return { ...current, goals: nextGoals.length ? nextGoals : ["maintain"] };
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[134] flex items-end justify-center bg-black/80 p-0 backdrop-blur-xl sm:items-center sm:p-3">
      <button type="button" aria-label="Close Nutrition Dashboard" onClick={onClose} className="absolute inset-0" />
      <section className="relative z-[135] h-[100dvh] w-full max-w-5xl overflow-y-auto border border-fuchsia-300/20 bg-[radial-gradient(circle_at_top_left,rgba(255,59,212,0.10),transparent_28%),radial-gradient(circle_at_top_right,rgba(112,255,61,0.08),transparent_28%),linear-gradient(180deg,#07111f,#040812)] p-3 pb-28 shadow-[0_28px_90px_rgba(0,0,0,0.72)] sm:h-auto sm:max-h-[94vh] sm:rounded-[2rem] sm:p-6">
        <div className="sticky top-0 z-20 -mx-3 -mt-3 flex items-start justify-between gap-3 border-b border-white/10 bg-[#07111f]/95 px-3 py-3 backdrop-blur-xl sm:static sm:mx-0 sm:mt-0 sm:border-0 sm:bg-transparent sm:px-0">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-fuchsia-200">SyncWorks Nutrition</div>
            <h2 className="mt-1 text-2xl font-black text-white">Nutrition Intelligence Center</h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">Meals, history, frequent foods, adaptive targets, budget, and goal-based guidance.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] font-black text-white">X</button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button type="button" onClick={() => onOpenCoach?.(null)} className="h-11 rounded-xl border border-lime-300/30 bg-lime-300/15 text-xs font-black text-lime-100">+ Log Meal</button>
          <button type="button" onClick={onOpenMealPlanner} className="h-11 rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-xs font-black text-cyan-100">What to Eat</button>
          <button type="button" onClick={() => setSettingsOpen((value) => !value)} className="h-11 rounded-xl border border-fuchsia-300/25 bg-fuchsia-300/10 text-xs font-black text-fuchsia-100">
            {settingsOpen ? "Hide Goals" : "Goals"}
          </button>
        </div>

        {settingsOpen ? (
          <div className="mt-3 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-fuchsia-200">Nutrition goals</div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {GOALS.map(([value, label]) => (
                <button key={value} type="button" onClick={() => toggleGoal(value)} className={`min-h-11 rounded-xl border px-2 text-[11px] font-black ${nutritionProfile.goals.includes(value) ? "border-lime-300/35 bg-lime-300/15 text-lime-100" : "border-white/10 bg-black/20 text-slate-400"}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Target date
                <input type="date" value={nutritionProfile.targetDate} onChange={(event) => setNutritionProfile((current) => ({ ...current, targetDate: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white" />
              </label>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Target weight
                <input inputMode="decimal" value={nutritionProfile.targetWeight} onChange={(event) => setNutritionProfile((current) => ({ ...current, targetWeight: event.target.value }))} placeholder="Optional" className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white" />
              </label>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Weekly budget
                <input inputMode="decimal" value={nutritionProfile.weeklyBudget} onChange={(event) => setNutritionProfile((current) => ({ ...current, weeklyBudget: event.target.value }))} placeholder="$125" className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white" />
              </label>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Activity
                <select value={nutritionProfile.activityLevel} onChange={(event) => setNutritionProfile((current) => ({ ...current, activityLevel: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white">
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                  <option value="athlete">Athlete</option>
                </select>
              </label>
            </div>
            <button type="button" onClick={onOpenGoals} className="mt-3 h-10 w-full rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-xs font-black text-cyan-100">Open Full Target Settings</button>
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MacroCard label="Calories" value={totals.calories} goal={calorieGoal} tone="fuchsia" />
          <MacroCard label="Protein" value={totals.protein} goal={proteinGoal} suffix="g" tone="lime" />
          <MacroCard label="Carbs" value={totals.carbs} goal={carbGoal} suffix="g" tone="cyan" />
          <MacroCard label="Fat" value={totals.fat} goal={fatGoal} suffix="g" tone="amber" />
        </div>

        <div className="mt-3 overflow-hidden rounded-[1.4rem] border border-lime-300/20 bg-lime-300/[0.06]">
          <button type="button" onClick={() => setRevisionOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
            <span>
              <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-lime-200">AI revised nutrition plan</span>
              <span className="mt-1 block text-sm font-black leading-5 text-white">{aiMessage}</span>
            </span>
            <span className="text-xs font-black text-lime-100">{revisionOpen ? "Hide" : "View"}</span>
          </button>
          {revisionOpen ? (
            <div className="border-t border-lime-300/15 p-4 pt-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">Inputs used</div>
                  <div className="mt-2 space-y-1 text-[11px] leading-4 text-slate-300">
                    <div>Weight: {Math.round(deriveWeight(profile, snapshot))} lb</div>
                    <div>Workout today: {workoutToday ? "Yes" : "No"}</div>
                    <div>Goals: {nutritionProfile.goals.map((goal) => GOALS.find(([value]) => value === goal)?.[1]).filter(Boolean).join(", ")}</div>
                    <div>Target date: {nutritionProfile.targetDate || "Not set"}</div>
                    <div>Budget: {nutritionProfile.weeklyBudget ? `$${nutritionProfile.weeklyBudget}/week` : "Not set"}</div>
                  </div>
                </div>
                <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] p-3">
                  <div className="text-[9px] font-black uppercase tracking-wider text-cyan-200">What changed and why</div>
                  <div className="mt-2 space-y-2 text-[11px] leading-4 text-slate-300">
                    {derivedTargets.reasons.length ? derivedTargets.reasons.map((reason) => <div key={reason}>• {reason}</div>) : <div>• Maintenance targets are active until another goal is selected.</div>}
                    <div>• Targets are estimates and should be refined from actual weight, hunger, recovery, and performance trends.</div>
                    {nutritionProfile.goals.includes("healthy_hormones") ? <div>• Nutrition can support healthy hormone function, but the app does not diagnose or guarantee a testosterone increase.</div> : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-lime-200">Meal timeline</div>
                <div className="mt-1 text-lg font-black text-white">{meals.length ? `${meals.length} meals logged` : "No meals logged"}</div>
              </div>
              <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="h-10 rounded-xl border border-white/10 bg-slate-950 px-2 text-xs font-black text-white" />
            </div>
            <div className="mt-3 space-y-2">
              {meals.length ? meals.map((meal) => (
                <MealCard key={meal.id} meal={meal} onReuse={onReuseMeal} onEdit={onEditMeal} onDelete={onDeleteMeal} />
              )) : (
                <button type="button" onClick={() => onOpenCoach?.(null)} className="w-full rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-slate-500">
                  Log a meal to begin this day's timeline.
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-fuchsia-200">Last 7 days</div>
              <div className="mt-3 space-y-2">
                {last7.map((day) => (
                  <button key={day.ymd} type="button" onClick={() => setSelectedDate(day.ymd)} className="flex w-full items-center justify-between rounded-xl border border-white/8 bg-black/20 px-3 py-2 text-left">
                    <span className="text-[11px] font-bold text-slate-300">{day.ymd}</span>
                    <span className="text-[10px] text-slate-500">{day.count} meals · {Math.round(day.calories)} cal · {Math.round(day.protein)}g P</span>
                  </button>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-black/20 p-3">
                  <div className="text-[9px] uppercase text-slate-500">Avg calories</div>
                  <div className="mt-1 text-xl font-black text-white">{averages.calories}</div>
                </div>
                <div className="rounded-xl bg-black/20 p-3">
                  <div className="text-[9px] uppercase text-slate-500">Avg protein</div>
                  <div className="mt-1 text-xl font-black text-lime-200">{averages.protein}g</div>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-cyan-300/20 bg-cyan-300/[0.05] p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">Frequent meals</div>
              <div className="mt-2 space-y-2">
                {frequentMeals.length ? frequentMeals.map(({ meal, count }) => (
                  <button key={`${meal?.id}-${count}`} type="button" onClick={() => onReuseMeal?.(meal)} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-left">
                    <span className="min-w-0 truncate text-xs font-black text-white">{meal?.description || meal?.note || "Meal"}</span>
                    <span className="ml-2 shrink-0 text-[10px] text-cyan-200">{count}x · Reuse</span>
                  </button>
                )) : <div className="text-xs leading-5 text-slate-500">Frequent meals appear after the same meal is logged more than once.</div>}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3 text-[11px] leading-5 text-slate-400">
          Calorie and macro targets are estimates, not medical advice. Health conditions, pregnancy, eating-disorder history, medications, or hormone concerns should be reviewed with a qualified clinician.
        </div>
      </section>
    </div>
  );
}
