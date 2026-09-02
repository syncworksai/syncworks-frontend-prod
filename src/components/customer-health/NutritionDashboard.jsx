// src/components/customer-health/NutritionDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import NutritionConsistencyTracker from "./NutritionConsistencyTracker";

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
  if (value === null || value === undefined || String(value).trim() === "") return fallback;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ""));
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
  const defaults = {
    goals: ["maintain"],
    targetDate: "",
    targetWeight: "",
    weeklyBudget: "",
    activityLevel: "moderate",
    mealsPerDay: "3",
    dietaryPattern: "No preference",
  };

  if (typeof window === "undefined") return defaults;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      ...defaults,
      ...parsed,
      goals: Array.isArray(parsed.goals) && parsed.goals.length ? parsed.goals : defaults.goals,
    };
  } catch {
    return defaults;
  }
}

function deriveWeight(profile, snapshot) {
  const value =
    snapshot?.weight ??
    profile?.weight ??
    snapshot?.measurements?.weight ??
    profile?.measurements?.weight;
  const weight = safeNumber(value, 0);
  return weight > 0 ? weight : null;
}

function calculateTargets({ weight, goals, activityLevel, workoutToday }) {
  if (!weight) {
    return {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      reasons: ["Add your current weight or set explicit nutrition targets before SYNC calculates calorie and macro estimates."],
    };
  }

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
    reasons.push("The estimate avoids aggressive restriction and keeps adequate dietary fat in the plan.");
  }

  calories = Math.max(1200, calories);
  const protein = Math.round(weight * proteinPerPound);
  const fat = Math.round((calories * fatPercent) / 9);
  const carbs = Math.max(50, Math.round((calories - protein * 4 - fat * 9) / 4));

  return { calories, protein, carbs, fat, reasons };
}

function MacroCard({ label, value, goal, suffix = "", tone = "cyan", onSetGoal }) {
  const safeValue = safeNumber(value, 0);
  const safeGoal = safeNumber(goal, 0);
  const remaining = safeGoal ? Math.max(0, safeGoal - safeValue) : 0;
  const overage = safeGoal ? Math.max(0, safeValue - safeGoal) : 0;
  const rawPercent = safeGoal ? Math.round((safeValue / safeGoal) * 100) : 0;
  const percent = Math.min(100, Math.max(0, rawPercent));

  const neutralTones = {
    cyan: "from-cyan-300/16 to-cyan-300/[0.03] border-cyan-300/15",
    lime: "from-lime-300/16 to-lime-300/[0.03] border-lime-300/15",
    fuchsia: "from-fuchsia-300/16 to-fuchsia-300/[0.03] border-fuchsia-300/15",
    amber: "from-amber-300/16 to-amber-300/[0.03] border-amber-300/15",
  };

  let state = {
    label: "Target not set",
    detail: "Target not set",
    card: neutralTones[tone] || neutralTones.cyan,
    value: "text-white",
    status: "border-white/10 bg-white/[0.04] text-slate-400",
    fill: "bg-slate-500",
  };

  if (safeGoal) {
    if (safeValue > safeGoal) {
      state = {
        label: "Over target",
        detail: `${Math.round(overage)}${suffix} over`,
        card: "from-rose-500/22 to-rose-500/[0.04] border-rose-400/35",
        value: "text-rose-300",
        status: "border-rose-400/30 bg-rose-500/12 text-rose-200",
        fill: "bg-rose-400",
      };
    } else if (rawPercent >= 90) {
      state = {
        label: rawPercent >= 100 ? "Goal met" : "On track",
        detail: rawPercent >= 100 ? "Target reached" : `${Math.round(remaining)}${suffix} left`,
        card: "from-emerald-500/20 to-emerald-500/[0.04] border-emerald-400/30",
        value: "text-emerald-300",
        status: "border-emerald-400/30 bg-emerald-500/12 text-emerald-200",
        fill: "bg-emerald-400",
      };
    } else if (rawPercent >= 70) {
      state = {
        label: "Close",
        detail: `${Math.round(remaining)}${suffix} left`,
        card: "from-orange-500/18 to-orange-500/[0.04] border-orange-400/28",
        value: "text-orange-300",
        status: "border-orange-400/25 bg-orange-500/10 text-orange-200",
        fill: "bg-orange-400",
      };
    } else {
      state = {
        label: "Goal not met",
        detail: `${Math.round(remaining)}${suffix} left`,
        card: "from-amber-400/16 to-amber-400/[0.03] border-amber-300/25",
        value: "text-amber-200",
        status: "border-amber-300/25 bg-amber-400/10 text-amber-200",
        fill: "bg-amber-300",
      };
    }
  }

  return (
    <div className={`rounded-[1.35rem] border bg-gradient-to-br p-3 transition-colors ${state.card}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</div>
        {safeGoal ? (
          <span className={`rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] ${state.status}`}>{state.label}</span>
        ) : null}
      </div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div>
          <div className={`text-2xl font-black ${state.value}`}>{Math.round(safeValue)}{suffix}</div>
          <div className={`mt-0.5 text-[10px] font-bold ${safeGoal ? state.value : "text-slate-400"}`}>{state.detail}</div>
        </div>
        <div className="text-[10px] font-black text-slate-500">{safeGoal ? `${Math.round(safeGoal)}${suffix}` : "-"}</div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/30">
        <div className={`h-full rounded-full transition-all ${state.fill}`} style={{ width: `${percent}%` }} />
      </div>
      {safeGoal ? <div className="mt-1 text-right text-[8px] font-black text-slate-500">{rawPercent}% of target</div> : null}
      {!safeGoal && onSetGoal ? (
        <button type="button" onClick={onSetGoal} className="mt-2 text-[10px] font-black text-cyan-200">Set target →</button>
      ) : null}
    </div>
  );
}

function MealCard({ meal, onEdit, onDelete, onReuse }) {
  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.035] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-white">{meal?.description || meal?.note || "Meal"}</div>
          <div className="mt-1 text-[10px] font-bold text-slate-500">{meal?.ymd || ""}</div>
        </div>
        <div className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black text-slate-300">{Math.round(mealValue(meal, "calories"))} cal</div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[10px]">
        <div className="rounded-xl bg-black/20 p-2 text-lime-200"><b>{Math.round(mealValue(meal, "protein"))}g</b><br />protein</div>
        <div className="rounded-xl bg-black/20 p-2 text-cyan-200"><b>{Math.round(mealValue(meal, "carbs"))}g</b><br />carbs</div>
        <div className="rounded-xl bg-black/20 p-2 text-amber-200"><b>{Math.round(mealValue(meal, "fat"))}g</b><br />fat</div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <button type="button" onClick={() => onReuse?.(meal)} className="h-9 rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-[11px] font-black text-cyan-100">Reuse</button>
        <button type="button" onClick={() => onEdit?.(meal)} className="h-9 rounded-xl border border-fuchsia-300/20 bg-fuchsia-300/10 text-[11px] font-black text-fuchsia-100">Edit</button>
        <button type="button" onClick={() => onDelete?.(meal)} className="h-9 rounded-xl border border-rose-300/20 bg-rose-300/10 text-[11px] font-black text-rose-100">Delete</button>
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
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nutritionProfile));
    } catch {
      // Local persistence remains best-effort until this preference object is cloud-backed.
    }
  }, [nutritionProfile]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;
    const openedOn = todayYmd();
    const updateDay = () => {
      if (selectedDate === openedOn) setSelectedDate(todayYmd());
    };
    const interval = window.setInterval(updateDay, 60000);
    const onVisible = () => {
      if (document.visibilityState === "visible") updateDay();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [open, selectedDate]);

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
  const currentWeight = deriveWeight(profile, snapshot);
  const derivedTargets = useMemo(
    () => calculateTargets({
      weight: currentWeight,
      goals: nutritionProfile.goals,
      activityLevel: nutritionProfile.activityLevel,
      workoutToday,
    }),
    [currentWeight, nutritionProfile.goals, nutritionProfile.activityLevel, workoutToday]
  );

  const calorieGoal = safeNumber(snapshot?.calorie_goal ?? profile?.calorie_goal, derivedTargets.calories);
  const proteinGoal = safeNumber(snapshot?.protein_goal ?? profile?.protein_goal, derivedTargets.protein);
  const carbGoal = safeNumber(snapshot?.carb_goal ?? profile?.carb_goal, derivedTargets.carbs);
  const fatGoal = safeNumber(snapshot?.fat_goal ?? profile?.fat_goal, derivedTargets.fat);
  const targetsReady = Boolean(calorieGoal && proteinGoal);

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

  const averages = useMemo(() => {
    const loggedDays = last7.filter((day) => day.count > 0);
    if (!loggedDays.length) return { calories: 0, protein: 0, days: 0 };
    return {
      calories: Math.round(loggedDays.reduce((sum, day) => sum + day.calories, 0) / loggedDays.length),
      protein: Math.round(loggedDays.reduce((sum, day) => sum + day.protein, 0) / loggedDays.length),
      days: loggedDays.length,
    };
  }, [last7]);

  const caloriesRemaining = calorieGoal ? Math.max(0, calorieGoal - totals.calories) : null;
  const proteinRemaining = proteinGoal ? Math.max(0, proteinGoal - totals.protein) : null;

  const aiMessage = useMemo(() => {
    if (!targetsReady) {
      return "Set your current weight or explicit calorie and protein targets before SYNC gives target-based nutrition guidance.";
    }
    if (!meals.length) {
      return workoutToday
        ? "Training is scheduled today. Log your first meal so SYNC can compare actual intake with your targets."
        : "No meals are logged for this day. Log the first meal to begin adaptive guidance.";
    }
    if (proteinRemaining > 40 && caloriesRemaining < 700) {
      return `Protein is ${Math.round(proteinRemaining)}g below target while calories are tighter. A lean high-protein choice fits best next.`;
    }
    if (totals.calories > calorieGoal) {
      return "Calories are above the current target. Review the day before adding more target-based recommendations.";
    }
    if (totals.protein >= proteinGoal) {
      return workoutToday
        ? "Protein is on target. Use the remaining plan for carbohydrates, fats and fluids that support training and recovery."
        : "Protein is on target. Continue with a balanced intake that supports recovery.";
    }
    return `About ${Math.round(proteinRemaining)}g protein and ${Math.round(caloriesRemaining)} calories remain against today's targets.`;
  }, [targetsReady, meals.length, workoutToday, proteinRemaining, caloriesRemaining, totals.calories, totals.protein, calorieGoal, proteinGoal]);

  function toggleGoal(goal) {
    setNutritionProfile((current) => {
      const hasGoal = current.goals.includes(goal);
      const nextGoals = hasGoal ? current.goals.filter((item) => item !== goal) : [...current.goals, goal];
      return { ...current, goals: nextGoals.length ? nextGoals : ["maintain"] };
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[134] flex items-end justify-center bg-black/80 p-0 backdrop-blur-xl sm:items-center sm:p-3">
      <button type="button" aria-label="Close Nutrition Dashboard" onClick={onClose} className="absolute inset-0" />
      <section className="relative z-[135] h-[100dvh] w-full max-w-5xl overflow-y-auto border border-fuchsia-300/20 bg-[radial-gradient(circle_at_top_left,rgba(255,59,212,0.10),transparent_28%),radial-gradient(circle_at_top_right,rgba(112,255,61,0.08),transparent_28%),linear-gradient(180deg,#07111f,#040812)] p-3 pb-[calc(env(safe-area-inset-bottom)+2rem)] shadow-[0_28px_90px_rgba(0,0,0,0.72)] sm:h-auto sm:max-h-[94vh] sm:rounded-[2rem] sm:p-6">
        <div className="sticky top-0 z-20 -mx-3 -mt-3 flex items-start justify-between gap-3 border-b border-white/10 bg-[#07111f]/95 px-3 py-3 backdrop-blur-xl sm:static sm:mx-0 sm:mt-0 sm:border-0 sm:bg-transparent sm:px-0">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-fuchsia-200">SyncWorks Nutrition</div>
            <h2 className="mt-1 text-2xl font-black text-white">Nutrition Intelligence Center</h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">Log first. SYNC uses your real meals and targets instead of filling missing data with demo values.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close nutrition" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] font-black text-white">X</button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button type="button" onClick={() => onOpenCoach?.(null)} className="h-11 rounded-xl border border-lime-300/30 bg-lime-300/15 text-xs font-black text-lime-100">+ Log Meal</button>
          <button type="button" onClick={onOpenMealPlanner} className="h-11 rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-xs font-black text-cyan-100">What to Eat</button>
          <button type="button" onClick={() => setSettingsOpen((value) => !value)} className="h-11 rounded-xl border border-fuchsia-300/25 bg-fuchsia-300/10 text-xs font-black text-fuchsia-100">{settingsOpen ? "Hide Goals" : "Goals"}</button>
        </div>

        {!targetsReady ? (
          <div className="mt-3 rounded-[1.35rem] border border-amber-300/25 bg-amber-300/[0.07] p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-200">Targets need setup</div>
            <div className="mt-1 text-sm font-black text-white">SYNC will not guess your body weight or pretend a macro target exists.</div>
            <p className="mt-1 text-xs leading-5 text-slate-400">Add your current weight in Health Profile or set explicit calorie/protein targets. Existing targets are always respected.</p>
            <button type="button" onClick={onOpenGoals} className="mt-3 h-10 rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 text-xs font-black text-amber-100">Set nutrition targets</button>
          </div>
        ) : null}

        {settingsOpen ? (
          <div className="mt-3 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-fuchsia-200">Nutrition goals</div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {GOALS.map(([value, label]) => (
                <button key={value} type="button" onClick={() => toggleGoal(value)} className={`min-h-11 rounded-xl border px-2 text-[11px] font-black ${nutritionProfile.goals.includes(value) ? "border-lime-300/35 bg-lime-300/15 text-lime-100" : "border-white/10 bg-black/20 text-slate-400"}`}>{label}</button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Target date<input type="date" value={nutritionProfile.targetDate} onChange={(event) => setNutritionProfile((current) => ({ ...current, targetDate: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white" /></label>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Target weight<input inputMode="decimal" value={nutritionProfile.targetWeight} onChange={(event) => setNutritionProfile((current) => ({ ...current, targetWeight: event.target.value }))} placeholder="Optional" className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white" /></label>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Weekly budget<input inputMode="decimal" value={nutritionProfile.weeklyBudget} onChange={(event) => setNutritionProfile((current) => ({ ...current, weeklyBudget: event.target.value }))} placeholder="$125" className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white" /></label>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Activity<select value={nutritionProfile.activityLevel} onChange={(event) => setNutritionProfile((current) => ({ ...current, activityLevel: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white"><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option><option value="athlete">Athlete</option></select></label>
            </div>
            <button type="button" onClick={onOpenGoals} className="mt-3 h-10 w-full rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-xs font-black text-cyan-100">Open Full Target Settings</button>
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MacroCard label="Calories" value={totals.calories} goal={calorieGoal} tone="fuchsia" onSetGoal={onOpenGoals} />
          <MacroCard label="Protein" value={totals.protein} goal={proteinGoal} suffix="g" tone="lime" onSetGoal={onOpenGoals} />
          <MacroCard label="Carbs" value={totals.carbs} goal={carbGoal} suffix="g" tone="cyan" onSetGoal={onOpenGoals} />
          <MacroCard label="Fat" value={totals.fat} goal={fatGoal} suffix="g" tone="amber" onSetGoal={onOpenGoals} />
        </div>

        <div className="mt-3">
          <NutritionConsistencyTracker days={last7} calorieGoal={calorieGoal} proteinGoal={proteinGoal} onSelectDay={setSelectedDate} />
        </div>

        <div className="mt-3 overflow-hidden rounded-[1.4rem] border border-lime-300/20 bg-lime-300/[0.06]">
          <button type="button" onClick={() => setRevisionOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
            <span><span className="block text-[10px] font-black uppercase tracking-[0.16em] text-lime-200">SYNC nutrition status</span><span className="mt-1 block text-sm font-black leading-5 text-white">{aiMessage}</span></span>
            <span className="text-xs font-black text-lime-100">{revisionOpen ? "Hide" : "View"}</span>
          </button>
          {revisionOpen ? (
            <div className="border-t border-lime-300/15 p-4 pt-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">Inputs used</div>
                  <div className="mt-2 space-y-1 text-[11px] leading-4 text-slate-300">
                    <div>Weight: {currentWeight ? `${Math.round(currentWeight)} lb` : "Not set"}</div>
                    <div>Workout today: {workoutToday ? "Yes" : "No"}</div>
                    <div>Goals: {nutritionProfile.goals.map((goal) => GOALS.find(([value]) => value === goal)?.[1]).filter(Boolean).join(", ")}</div>
                    <div>Target date: {nutritionProfile.targetDate || "Not set"}</div>
                    <div>Budget: {nutritionProfile.weeklyBudget ? `$${nutritionProfile.weeklyBudget}/week` : "Not set"}</div>
                  </div>
                </div>
                <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] p-3">
                  <div className="text-[9px] font-black uppercase tracking-wider text-cyan-200">How targets were handled</div>
                  <div className="mt-2 space-y-2 text-[11px] leading-4 text-slate-300">
                    {derivedTargets.reasons.map((reason) => <div key={reason}>• {reason}</div>)}
                    <div>• Explicit targets saved in your Health profile override calculated estimates.</div>
                    <div>• Estimates should be refined from actual intake, weight trend, hunger, recovery and performance.</div>
                    {nutritionProfile.goals.includes("healthy_hormones") ? <div>• Nutrition can support normal hormone function; the app does not diagnose or promise hormone changes.</div> : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-end justify-between gap-3">
              <div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-lime-200">Meal timeline</div><div className="mt-1 text-lg font-black text-white">{meals.length ? `${meals.length} meals logged` : "No meals logged"}</div></div>
              <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="h-10 rounded-xl border border-white/10 bg-slate-950 px-2 text-xs font-black text-white" />
            </div>
            <div className="mt-3 space-y-2">
              {meals.length ? meals.map((meal) => <MealCard key={meal.id} meal={meal} onReuse={onReuseMeal} onEdit={onEditMeal} onDelete={onDeleteMeal} />) : (
                <button type="button" onClick={() => onOpenCoach?.(null)} className="w-full rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-slate-500">Log a meal to begin this day's timeline.</button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-fuchsia-200">Last 7 days</div>
              <div className="mt-3 space-y-2">
                {last7.map((day) => (
                  <button key={day.ymd} type="button" onClick={() => setSelectedDate(day.ymd)} className="flex w-full items-center justify-between rounded-xl border border-white/8 bg-black/20 px-3 py-2 text-left"><span className="text-[11px] font-bold text-slate-300">{day.ymd}</span><span className="text-[10px] text-slate-500">{day.count} meals · {Math.round(day.calories)} cal · {Math.round(day.protein)}g P</span></button>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-black/20 p-3"><div className="text-[9px] uppercase text-slate-500">Avg calories</div><div className="mt-1 text-xl font-black text-white">{averages.calories}</div></div>
                <div className="rounded-xl bg-black/20 p-3"><div className="text-[9px] uppercase text-slate-500">Avg protein</div><div className="mt-1 text-xl font-black text-lime-200">{averages.protein}g</div></div>
              </div>
              <div className="mt-2 text-[10px] text-slate-500">Average uses {averages.days} logged day{averages.days === 1 ? "" : "s"}; unlogged days are not treated as zero intake.</div>
            </div>

            <div className="rounded-[1.5rem] border border-cyan-300/20 bg-cyan-300/[0.05] p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">Frequent meals</div>
              <div className="mt-2 space-y-2">
                {frequentMeals.length ? frequentMeals.map(({ meal, count }) => (
                  <button key={`${meal?.id}-${count}`} type="button" onClick={() => onReuseMeal?.(meal)} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-left"><span className="min-w-0 truncate text-xs font-black text-white">{meal?.description || meal?.note || "Meal"}</span><span className="ml-2 shrink-0 text-[10px] text-cyan-200">{count}x · Reuse</span></button>
                )) : <div className="text-xs leading-5 text-slate-500">Frequent meals appear after foods are logged repeatedly.</div>}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3 text-[11px] leading-5 text-slate-400">Calorie and macro targets are estimates, not medical advice. Health conditions, pregnancy, eating-disorder history, medications, or hormone concerns should be reviewed with a qualified clinician.</div>
      </section>
    </div>
  );
}
