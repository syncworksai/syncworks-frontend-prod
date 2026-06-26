// src/components/customer-health/SmartMealPlannerDrawer.jsx
import React, { useEffect, useMemo, useState } from "react";

function n(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function todayYmd() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function valueOf(meal, key) {
  if (key === "calories") return n(meal?.calories ?? meal?.value);
  if (key === "protein") return n(meal?.protein ?? meal?.secondary);
  return n(meal?.[key]);
}

function totalsFor(meals) {
  return meals.reduce(
    (sum, meal) => ({
      calories: sum.calories + valueOf(meal, "calories"),
      protein: sum.protein + valueOf(meal, "protein"),
      carbs: sum.carbs + valueOf(meal, "carbs"),
      fat: sum.fat + valueOf(meal, "fat"),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

function list(value) {
  if (Array.isArray(value)) return value.map((x) => String(x).trim().toLowerCase()).filter(Boolean);
  return String(value || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
}

const MEALS = [
  {
    id: "chicken-rice-bowl",
    name: "Grilled Chicken Rice Bowl",
    types: ["lunch", "dinner", "post-workout"],
    places: ["home", "meal-prep", "restaurant"],
    tags: ["high-protein", "balanced", "gluten-free"],
    ingredients: ["chicken", "rice", "vegetables"],
    calories: 610, protein: 55, carbs: 67, fat: 13, minutes: 20,
    description: "Grilled chicken, rice, vegetables, and a light sauce.",
  },
  {
    id: "lean-taco-bowl",
    name: "Lean Taco Bowl",
    types: ["lunch", "dinner"],
    places: ["home", "meal-prep", "restaurant"],
    tags: ["high-protein", "balanced"],
    ingredients: ["ground turkey", "rice", "beans", "salsa"],
    calories: 590, protein: 48, carbs: 69, fat: 14, minutes: 20,
    description: "Lean seasoned meat, rice, beans, lettuce, salsa, and modest cheese.",
  },
  {
    id: "protein-breakfast-wrap",
    name: "Protein Breakfast Wrap",
    types: ["breakfast", "snack"],
    places: ["home", "fast-food"],
    tags: ["high-protein", "quick"],
    ingredients: ["eggs", "egg whites", "tortilla", "cheese"],
    calories: 430, protein: 38, carbs: 35, fat: 16, minutes: 10,
    description: "Eggs and egg whites with cheese in a high-fiber tortilla.",
  },
  {
    id: "greek-yogurt-bowl",
    name: "Greek Yogurt Protein Bowl",
    types: ["breakfast", "snack", "post-workout"],
    places: ["home", "meal-prep"],
    tags: ["high-protein", "quick", "vegetarian"],
    ingredients: ["greek yogurt", "berries", "granola", "protein powder"],
    calories: 390, protein: 41, carbs: 43, fat: 7, minutes: 5,
    description: "Greek yogurt, berries, a small granola portion, and protein powder.",
  },
  {
    id: "salmon-potato",
    name: "Salmon and Roasted Potato Plate",
    types: ["dinner"],
    places: ["home", "restaurant"],
    tags: ["balanced", "gluten-free"],
    ingredients: ["salmon", "potatoes", "vegetables"],
    calories: 670, protein: 47, carbs: 58, fat: 27, minutes: 30,
    description: "Salmon, roasted potatoes, and green vegetables.",
  },
  {
    id: "turkey-sandwich",
    name: "Turkey Sandwich and Fruit",
    types: ["lunch", "snack"],
    places: ["home", "meal-prep", "restaurant"],
    tags: ["quick", "balanced"],
    ingredients: ["turkey", "bread", "cheese", "fruit"],
    calories: 480, protein: 36, carbs: 55, fat: 13, minutes: 8,
    description: "Turkey on whole-grain bread with fruit.",
  },
  {
    id: "protein-shake",
    name: "Protein Shake and Banana",
    types: ["breakfast", "snack", "post-workout"],
    places: ["home", "meal-prep"],
    tags: ["high-protein", "quick", "vegetarian"],
    ingredients: ["protein powder", "milk", "banana"],
    calories: 340, protein: 35, carbs: 42, fat: 5, minutes: 3,
    description: "Protein powder blended with milk and a banana.",
  },
  {
    id: "grilled-chicken-sandwich",
    name: "Grilled Chicken Sandwich",
    types: ["lunch", "dinner"],
    places: ["fast-food", "restaurant"],
    tags: ["high-protein", "quick"],
    ingredients: ["chicken", "bun", "lettuce", "tomato"],
    calories: 470, protein: 42, carbs: 48, fat: 12, minutes: 10,
    description: "A grilled chicken sandwich with vegetables and light sauce.",
  },
  {
    id: "burger-salad",
    name: "Single Burger with Side Salad",
    types: ["lunch", "dinner"],
    places: ["fast-food", "restaurant"],
    tags: ["balanced"],
    ingredients: ["beef", "bun", "salad"],
    calories: 560, protein: 32, carbs: 49, fat: 25, minutes: 10,
    description: "A single burger paired with salad instead of fries.",
  },
  {
    id: "chicken-salad",
    name: "Large Grilled Chicken Salad",
    types: ["lunch", "dinner"],
    places: ["home", "restaurant", "fast-food"],
    tags: ["high-protein", "lower-carb", "gluten-free"],
    ingredients: ["chicken", "lettuce", "vegetables", "dressing"],
    calories: 430, protein: 48, carbs: 22, fat: 17, minutes: 12,
    description: "Grilled chicken, greens, vegetables, and measured dressing.",
  },
  {
    id: "protein-oatmeal",
    name: "Protein Oatmeal",
    types: ["breakfast"],
    places: ["home", "meal-prep"],
    tags: ["vegetarian", "balanced"],
    ingredients: ["oatmeal", "protein powder", "berries", "peanut butter"],
    calories: 510, protein: 36, carbs: 62, fat: 14, minutes: 8,
    description: "Oatmeal with protein powder, berries, and measured peanut butter.",
  },
  {
    id: "steak-vegetables",
    name: "Lean Steak and Vegetables",
    types: ["dinner"],
    places: ["home", "restaurant"],
    tags: ["high-protein", "lower-carb", "gluten-free"],
    ingredients: ["steak", "vegetables"],
    calories: 520, protein: 55, carbs: 18, fat: 25, minutes: 25,
    description: "Lean steak with a large serving of vegetables.",
  },
];

function ChoiceGroup({ label, value, onChange, choices }) {
  return (
    <div>
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {choices.map((choice) => (
          <button
            key={choice.value}
            type="button"
            onClick={() => onChange(choice.value)}
            className={`rounded-xl border px-3 py-2 text-xs font-black ${
              value === choice.value
                ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
                : "border-white/10 bg-white/[0.035] text-slate-400"
            }`}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function scoreMeal(meal, context) {
  const haystack = [meal.name, meal.description, ...meal.ingredients, ...meal.tags].join(" ").toLowerCase();
  if (context.allergies.some((x) => haystack.includes(x))) return -9999;
  if (context.dislikes.some((x) => haystack.includes(x))) return -9999;
  if (context.diet === "vegetarian" && !meal.tags.includes("vegetarian")) return -9999;
  if (context.diet === "gluten-free" && !meal.tags.includes("gluten-free")) return -9999;

  let score = 0;
  if (meal.types.includes(context.mealType)) score += 30;
  if (meal.places.includes(context.location)) score += 25;
  score += Math.max(0, 30 - Math.abs(context.remaining.calories - meal.calories) / 25);
  score += Math.max(0, 25 - Math.abs(context.remaining.protein - meal.protein) / 3);
  if (context.remaining.protein >= 35 && meal.tags.includes("high-protein")) score += 18;
  if (context.remaining.calories <= 550 && meal.calories <= 550) score += 12;
  if (context.mealType === "post-workout" && meal.protein >= 30) score += 15;
  score += context.pantry.filter((x) => haystack.includes(x)).length * 14;
  return score;
}

function reasonFor(meal, context) {
  const reasons = [];
  if (meal.protein >= 35) reasons.push(`${meal.protein}g protein helps close your protein gap`);
  if (context.remaining.calories > 0 && meal.calories <= context.remaining.calories) {
    reasons.push("fits inside your remaining calories");
  }
  if (context.mealType === "post-workout") reasons.push("supports post-workout recovery");
  const matches = context.pantry.filter((x) =>
    [meal.name, meal.description, ...meal.ingredients].join(" ").toLowerCase().includes(x)
  );
  if (matches.length) reasons.push(`uses ${matches.slice(0, 3).join(", ")} you already have`);
  return (reasons.length ? reasons : ["provides a balanced next meal"]).join(" and ");
}

export default function SmartMealPlannerDrawer({
  open,
  onClose,
  profile,
  snapshot,
  progressLogs,
  onLogMeal,
  setProfile,
}) {
  const hour = new Date().getHours();
  const [mealType, setMealType] = useState(
    hour < 10 ? "breakfast" : hour < 14 ? "lunch" : hour < 17 ? "snack" : "dinner"
  );
  const [location, setLocation] = useState("home");
  const [pantry, setPantry] = useState("");
  const [allergies, setAllergies] = useState("");
  const [dislikes, setDislikes] = useState("");
  const [diet, setDiet] = useState("none");
  const [offset, setOffset] = useState(0);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAllergies(
      Array.isArray(profile?.nutrition_allergies)
        ? profile.nutrition_allergies.join(", ")
        : profile?.nutrition_allergies || ""
    );
    setDislikes(
      Array.isArray(profile?.nutrition_dislikes)
        ? profile.nutrition_dislikes.join(", ")
        : profile?.nutrition_dislikes || ""
    );
    setDiet(profile?.nutrition_diet || "none");
    setOffset(0);
    setSaved(false);
  }, [open, profile]);

  const todayMeals = useMemo(
    () =>
      (Array.isArray(progressLogs) ? progressLogs : []).filter(
        (entry) => entry?.type === "meal" && entry?.ymd === todayYmd()
      ),
    [progressLogs]
  );

  const totals = useMemo(() => totalsFor(todayMeals), [todayMeals]);

  const targets = {
    calories: n(snapshot?.calorie_goal || profile?.calorie_goal),
    protein: n(snapshot?.protein_goal || profile?.protein_goal),
    carbs: n(snapshot?.carb_goal || profile?.carb_goal),
    fat: n(snapshot?.fat_goal || profile?.fat_goal),
  };

  const remaining = {
    calories: Math.max(0, targets.calories - totals.calories),
    protein: Math.max(0, targets.protein - totals.protein),
    carbs: Math.max(0, targets.carbs - totals.carbs),
    fat: Math.max(0, targets.fat - totals.fat),
  };

  const context = useMemo(
    () => ({
      mealType,
      location,
      pantry: list(pantry),
      allergies: list(allergies),
      dislikes: list(dislikes),
      diet,
      remaining,
    }),
    [
      mealType,
      location,
      pantry,
      allergies,
      dislikes,
      diet,
      remaining.calories,
      remaining.protein,
      remaining.carbs,
      remaining.fat,
    ]
  );

  const suggestions = useMemo(
    () =>
      MEALS.map((meal) => ({
        meal,
        score: scoreMeal(meal, context),
        reason: reasonFor(meal, context),
      }))
        .filter((item) => item.score > -1000)
        .sort((a, b) => b.score - a.score),
    [context]
  );

  const visible = suggestions.length
    ? Array.from(
        { length: Math.min(3, suggestions.length) },
        (_, index) => suggestions[(offset + index) % suggestions.length]
      )
    : [];

  if (!open) return null;

  function savePreferences() {
    setProfile((previous) => ({
      ...previous,
      nutrition_allergies: list(allergies),
      nutrition_dislikes: list(dislikes),
      nutrition_diet: diet,
      nutrition_preferences_updated_at: new Date().toISOString(),
    }));
    setSaved(true);
  }

  function logMeal(meal) {
    onLogMeal?.({
      ymd: todayYmd(),
      note: meal.name,
      value: meal.calories,
      secondary: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      estimate_items: [
        {
          label: meal.name,
          quantity: 1,
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
        },
      ],
      estimate_confidence: "coach suggestion",
      source: "smart_meal_planner",
    });
  }

  return (
    <div className="fixed inset-0 z-[142] flex items-end justify-center bg-black/80 p-3 backdrop-blur-xl sm:items-center">
      <button type="button" aria-label="Close smart meal planner" onClick={onClose} className="absolute inset-0" />

      <section className="relative z-[143] max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-lime-300/20 bg-[radial-gradient(circle_at_top_left,rgba(112,255,61,0.10),transparent_28%),radial-gradient(circle_at_top_right,rgba(52,223,255,0.08),transparent_28%),linear-gradient(180deg,#07111f,#040812)] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.72)] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-lime-200">
              SyncWorks Meal Decision Engine
            </div>
            <h2 className="mt-1 text-3xl font-black text-white">What should I eat next?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Suggestions use your remaining macros, meal type, location, preferences, and available ingredients.
            </p>
          </div>

          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] font-black text-white">
            ✕
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["Calories left", Math.round(remaining.calories), ""],
            ["Protein left", Math.round(remaining.protein), "g"],
            ["Carbs left", Math.round(remaining.carbs), "g"],
            ["Fat left", Math.round(remaining.fat), "g"],
          ].map(([label, value, suffix]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
              <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</div>
              <div className="mt-1 text-2xl font-black text-white">{value}{suffix}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
          <div className="grid gap-5 lg:grid-cols-2">
            <ChoiceGroup
              label="Meal type"
              value={mealType}
              onChange={setMealType}
              choices={[
                { value: "breakfast", label: "Breakfast" },
                { value: "lunch", label: "Lunch" },
                { value: "dinner", label: "Dinner" },
                { value: "snack", label: "Snack" },
                { value: "post-workout", label: "Post-workout" },
              ]}
            />
            <ChoiceGroup
              label="Where are you eating?"
              value={location}
              onChange={setLocation}
              choices={[
                { value: "home", label: "At home" },
                { value: "fast-food", label: "Fast food" },
                { value: "restaurant", label: "Restaurant" },
                { value: "meal-prep", label: "Meal prep" },
              ]}
            />
          </div>

          <label className="mt-5 block">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
              What ingredients do you have?
            </div>
            <textarea
              rows={2}
              value={pantry}
              onChange={(event) => setPantry(event.target.value)}
              placeholder="Example: chicken, rice, eggs, cheese"
              className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-lime-300/40"
            />
          </label>
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-fuchsia-300/15 bg-fuchsia-300/[0.05] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-fuchsia-200">Food Preferences</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label>
              <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Allergies</div>
              <input value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="Peanuts, shellfish" className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none" />
            </label>
            <label>
              <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Dislikes</div>
              <input value={dislikes} onChange={(e) => setDislikes(e.target.value)} placeholder="Mushrooms, fish" className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none" />
            </label>
            <label>
              <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Diet</div>
              <select value={diet} onChange={(e) => setDiet(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-black text-white outline-none">
                <option value="none">No restriction</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="gluten-free">Gluten-free</option>
              </select>
            </label>
          </div>
          <button type="button" onClick={savePreferences} className="mt-3 h-10 rounded-xl border border-fuchsia-300/25 bg-fuchsia-300/10 px-4 text-xs font-black text-fuchsia-100">
            Save Preferences
          </button>
          {saved ? <span className="ml-3 text-xs font-bold text-emerald-200">Saved</span> : null}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">Best Matches</div>
            <div className="mt-1 text-xl font-black text-white">
              {visible.length ? "Built around today's remaining targets" : "No safe matches found"}
            </div>
          </div>

          <button
            type="button"
            disabled={suggestions.length <= 1}
            onClick={() => setOffset((previous) => (previous + 3) % suggestions.length)}
            className="h-10 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 text-xs font-black text-cyan-100 disabled:opacity-40"
          >
            Swap Suggestions
          </button>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {visible.map(({ meal, reason }) => (
            <div key={meal.id} className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-black text-white">{meal.name}</div>
                  <p className="mt-1 text-sm leading-6 text-slate-400">{meal.description}</p>
                </div>
                <span className="shrink-0 rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-xs font-black text-lime-100">
                  {meal.minutes} min
                </span>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                {[
                  ["Cal", meal.calories, ""],
                  ["Protein", meal.protein, "g"],
                  ["Carbs", meal.carbs, "g"],
                  ["Fat", meal.fat, "g"],
                ].map(([label, value, suffix]) => (
                  <div key={label} className="rounded-xl bg-black/25 p-2">
                    <div className="text-[8px] font-black uppercase tracking-[0.1em] text-slate-500">{label}</div>
                    <div className="mt-1 text-sm font-black text-white">{value}{suffix}</div>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] p-3 text-xs leading-5 text-cyan-100">
                <span className="font-black">Why this fits:</span> {reason}.
              </div>

              <button type="button" onClick={() => logMeal(meal)} className="mt-3 h-11 w-full rounded-2xl border border-lime-300/30 bg-lime-300/15 text-sm font-black text-lime-100">
                Log This Meal
              </button>
            </div>
          ))}
        </div>

        {!visible.length ? (
          <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-4 text-sm leading-6 text-slate-400">
            Your current allergies, dislikes, or diet removed every available suggestion. Adjust preferences or use the Nutrition Coach for a custom meal.
          </div>
        ) : null}

        <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-4 text-xs leading-5 text-slate-400">
          Suggestions are planning estimates. Restaurant recipes and actual portions vary. Confirm nutrition after eating and seek qualified guidance for medical dietary needs.
        </div>
      </section>
    </div>
  );
}
