import React, { useMemo, useState } from "react";
import api from "../../api/client";

function safeNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function detectBudget(text) {
  const match = String(text || "").match(/\$\s?(\d+(?:\.\d{1,2})?)/);
  return match ? safeNumber(match[1], 0) : 0;
}

function chooseSuggestion(text, remaining) {
  const lower = String(text || "").toLowerCase();
  const budget = detectBudget(text);
  const needsProtein = remaining.protein >= 30;
  const lowCalories = remaining.calories > 0 && remaining.calories <= 650;

  if (lower.includes("mcdonald")) {
    return {
      title: lowCalories ? "McDonald's lighter protein option" : "McDonald's budget protein option",
      meal: lowCalories
        ? "Two plain hamburger patties, apple slices, and water or a zero-calorie drink"
        : "Two McDoubles, remove one set of buns if needed, and choose water or a zero-calorie drink",
      reason: needsProtein
        ? "This prioritizes protein while keeping the order adjustable to your remaining calories."
        : "This keeps the order simple and avoids spending calories on fries or a sugary drink.",
      cost: budget ? `Keep the order at or under $${budget.toFixed(0)}.` : "Check local app pricing before ordering.",
    };
  }

  if (lower.includes("chick-fil-a") || lower.includes("chick fil a")) {
    return {
      title: "Chick-fil-A recovery option",
      meal: lowCalories
        ? "Grilled nuggets, fruit cup, and water"
        : "Grilled chicken sandwich, grilled nuggets, and water",
      reason: "This gives you a protein-centered meal with carbohydrates that can support training and recovery.",
      cost: budget ? `Choose the combination that stays under $${budget.toFixed(0)}.` : "Use rewards or skip sides when cost is the priority.",
    };
  }

  if (lower.includes("taco bell")) {
    return {
      title: "Taco Bell budget option",
      meal: "Two chicken soft tacos, add beans if needed, skip the sugary drink, and choose mild toppings",
      reason: "This balances cost, protein, and carbohydrates without making the meal unnecessarily heavy.",
      cost: budget ? `Build the order under $${budget.toFixed(0)}.` : "Value-menu pricing may vary by location.",
    };
  }

  if (lower.includes("gas station") || lower.includes("convenience store")) {
    return {
      title: "Gas-station protein option",
      meal: "Ready-to-drink protein shake, Greek yogurt or string cheese, a banana, and water",
      reason: "This covers protein, quick carbohydrates, and hydration without requiring cooking.",
      cost: budget ? `Prioritize the shake and one food item under $${budget.toFixed(0)}.` : "Store-brand items are usually the lower-cost choice.",
    };
  }

  if (lower.includes("pizza")) {
    return {
      title: "Pizza-night adjustment",
      meal: "Two slices of pizza with a side salad or vegetables, water, and an added lean protein if available",
      reason: "This lets you eat with the family while controlling portions and closing the protein gap.",
      cost: "Use the food already being ordered rather than buying a separate meal.",
    };
  }

  if (lower.includes("chicken") && lower.includes("rice")) {
    return {
      title: "Use what you have",
      meal: "Chicken and rice bowl with vegetables or fruit, seasoned to taste",
      reason: needsProtein
        ? "Increase the chicken portion first, then adjust rice to match your remaining calories and workout needs."
        : "Keep the chicken moderate and use rice based on your remaining calories and activity.",
      cost: "This reuses food on hand and avoids an extra purchase.",
    };
  }

  if (lower.includes("egg") || lower.includes("tortilla")) {
    return {
      title: "Fast home meal",
      meal: "Egg and tortilla wraps with any available vegetables, salsa, or leftover lean protein",
      reason: "This is quick, inexpensive, and easy to scale based on your calorie and protein targets.",
      cost: budget ? `Use what is already available and keep any add-on purchase under $${budget.toFixed(0)}.` : "Use pantry ingredients first.",
    };
  }

  return {
    title: budget ? `Best option within about $${budget.toFixed(0)}` : "Practical next-meal option",
    meal: needsProtein
      ? "Choose a lean protein first, add a fruit or vegetable, then add a moderate carbohydrate based on your remaining calories"
      : "Choose a balanced meal with protein, produce, and a portion of carbohydrates that fits your remaining calories",
    reason: lowCalories
      ? "Your remaining calories are limited, so prioritize lean protein and high-volume foods."
      : "This keeps the meal flexible while supporting your current workout and nutrition goals.",
    cost: budget ? `Compare the final order total against your $${budget.toFixed(0)} limit before checkout.` : "Tell SYNC the restaurant, foods available, or exact budget for a more specific answer.",
  };
}

export default function NutritionBudgetCoachChat({
  profile,
  snapshot,
  onUseSuggestion,
}) {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const remaining = useMemo(() => {
    const calorieGoal = safeNumber(snapshot?.calorie_goal || profile?.calorie_goal, 0);
    const proteinGoal = safeNumber(snapshot?.protein_goal || profile?.protein_goal, 0);
    const caloriesUsed = safeNumber(snapshot?.calories, 0);
    const proteinUsed = safeNumber(snapshot?.protein_today, 0);
    return {
      calories: Math.max(0, calorieGoal - caloriesUsed),
      protein: Math.max(0, proteinGoal - proteinUsed),
    };
  }, [profile, snapshot]);

  async function askCoach() {
    if (!message.trim() || loading) return;
    setLoading(true);
    setError("");

    const base = chooseSuggestion(message, remaining);
    let estimate = null;

    try {
      const response = await api.post("/customer-health/nutrition/analyze/", {
        description: base.meal,
        meal_type: "suggestion",
        restaurant: message,
      });
      const totals = response?.data?.totals || {};
      estimate = {
        calories: safeNumber(totals.calories, 0),
        protein: safeNumber(totals.protein, 0),
        carbs: safeNumber(totals.carbs, 0),
        fat: safeNumber(totals.fat, 0),
      };
    } catch {
      setError("Live nutrition estimates were unavailable. Review the suggestion and confirm portions before saving.");
    }

    setReply({ ...base, estimate });
    setLoading(false);
  }

  return (
    <section className="rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/[0.055] p-3 sm:rounded-[1.5rem] sm:p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-200">
        Ask Nutrition Coach
      </div>
      <h3 className="mt-1 text-lg font-black text-white">Tell SYNC what is realistic right now</h3>
      <p className="mt-1 text-xs leading-5 text-slate-400">
        Include your budget, restaurant, foods available, cooking limits, hunger, or timing. SYNC uses your remaining calories and protein to help you decide.
      </p>

      <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3 text-[10px] font-bold text-slate-400">
        Remaining today: {Math.round(remaining.calories)} calories and {Math.round(remaining.protein)}g protein
      </div>

      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={3}
        placeholder="Example: I have $10, I need fast food, cannot cook, and still need a lot of protein."
        className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm font-bold leading-5 text-white outline-none placeholder:text-slate-600 focus:border-fuchsia-300/40"
      />

      <button
        type="button"
        onClick={askCoach}
        disabled={!message.trim() || loading}
        className="mt-2 h-11 w-full rounded-xl border border-fuchsia-300/30 bg-fuchsia-300/15 text-xs font-black text-fuchsia-100 disabled:opacity-40"
      >
        {loading ? "Finding a practical option..." : "Ask SYNC"}
      </button>

      {reply ? (
        <div className="mt-3 rounded-xl border border-lime-300/20 bg-lime-300/[0.07] p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.14em] text-lime-200">SYNC suggestion</div>
          <div className="mt-1 text-base font-black text-white">{reply.title}</div>
          <div className="mt-2 text-sm font-bold leading-6 text-slate-200">{reply.meal}</div>
          <div className="mt-2 text-xs leading-5 text-slate-400">{reply.reason}</div>
          <div className="mt-1 text-xs leading-5 text-slate-500">{reply.cost}</div>

          {reply.estimate ? (
            <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
              {[
                ["Calories", reply.estimate.calories],
                ["Protein", `${reply.estimate.protein}g`],
                ["Carbs", `${reply.estimate.carbs}g`],
                ["Fat", `${reply.estimate.fat}g`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-white/10 bg-black/25 p-2">
                  <div className="text-[8px] uppercase text-slate-500">{label}</div>
                  <div className="mt-1 text-[11px] font-black text-white">{value}</div>
                </div>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => onUseSuggestion?.({
              description: reply.meal,
              calories: reply.estimate?.calories || "",
              protein: reply.estimate?.protein || "",
              carbs: reply.estimate?.carbs || "",
              fat: reply.estimate?.fat || "",
            })}
            className="mt-3 h-10 w-full rounded-xl border border-lime-300/30 bg-lime-300/15 text-xs font-black text-lime-100"
          >
            Use This Suggestion
          </button>
        </div>
      ) : null}

      {error ? <div className="mt-2 text-[10px] leading-4 text-amber-200">{error}</div> : null}
      <div className="mt-3 text-[10px] leading-4 text-slate-500">
        Suggestions are estimates and may vary by restaurant, price, portion, allergies, and preparation. Review before ordering or saving.
      </div>
    </section>
  );
}
