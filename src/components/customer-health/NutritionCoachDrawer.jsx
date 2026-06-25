// src/components/customer-health/NutritionCoachDrawer.jsx
import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../../api/client";

function safeNumber(value, fallback = 0) {
  const parsed = Number(
    String(value ?? "").replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function todayYmd() {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

const FOOD_LIBRARY = [
  {
    aliases: [
      "mcdonald's cheeseburger",
      "mcdonalds cheeseburger",
      "cheeseburger",
    ],
    label: "Cheeseburger",
    calories: 300,
    protein: 15,
    carbs: 32,
    fat: 13,
  },
  {
    aliases: ["hamburger", "burger"],
    label: "Hamburger",
    calories: 250,
    protein: 13,
    carbs: 31,
    fat: 9,
  },
  {
    aliases: [
      "medium fries",
      "french fries",
      "fries",
    ],
    label: "Medium fries",
    calories: 320,
    protein: 5,
    carbs: 43,
    fat: 15,
  },
  {
    aliases: [
      "chicken breast",
      "grilled chicken",
      "chicken",
    ],
    label: "Chicken breast serving",
    calories: 280,
    protein: 52,
    carbs: 0,
    fat: 6,
  },
  {
    aliases: ["white rice", "rice"],
    label: "Cooked rice cup",
    calories: 205,
    protein: 4,
    carbs: 45,
    fat: 0,
  },
  {
    aliases: ["large egg", "eggs", "egg"],
    label: "Large egg",
    calories: 72,
    protein: 6,
    carbs: 0,
    fat: 5,
  },
  {
    aliases: [
      "protein shake",
      "protein drink",
      "protein powder",
    ],
    label: "Protein shake",
    calories: 160,
    protein: 30,
    carbs: 6,
    fat: 2,
  },
  {
    aliases: ["greek yogurt", "yogurt"],
    label: "Greek yogurt serving",
    calories: 130,
    protein: 17,
    carbs: 9,
    fat: 0,
  },
  {
    aliases: ["oatmeal", "oats"],
    label: "Oatmeal serving",
    calories: 150,
    protein: 5,
    carbs: 27,
    fat: 3,
  },
  {
    aliases: ["banana"],
    label: "Medium banana",
    calories: 105,
    protein: 1,
    carbs: 27,
    fat: 0,
  },
  {
    aliases: ["apple"],
    label: "Medium apple",
    calories: 95,
    protein: 0,
    carbs: 25,
    fat: 0,
  },
  {
    aliases: ["pizza slice", "slice of pizza", "pizza"],
    label: "Pizza slice",
    calories: 285,
    protein: 12,
    carbs: 36,
    fat: 10,
  },
  {
    aliases: ["bacon strip", "bacon"],
    label: "Bacon strip",
    calories: 43,
    protein: 3,
    carbs: 0,
    fat: 3,
  },
  {
    aliases: ["peanut butter"],
    label: "Peanut butter serving",
    calories: 190,
    protein: 7,
    carbs: 7,
    fat: 16,
  },
  {
    aliases: ["bread slice", "slice of bread", "bread"],
    label: "Bread slice",
    calories: 80,
    protein: 3,
    carbs: 15,
    fat: 1,
  },
  {
    aliases: ["steak"],
    label: "Steak serving",
    calories: 430,
    protein: 48,
    carbs: 0,
    fat: 25,
  },
  {
    aliases: ["salmon"],
    label: "Salmon serving",
    calories: 367,
    protein: 39,
    carbs: 0,
    fat: 22,
  },
  {
    aliases: ["whole milk", "milk"],
    label: "Milk cup",
    calories: 149,
    protein: 8,
    carbs: 12,
    fat: 8,
  },
];

function quantityBefore(text, alias) {
  const escaped = alias.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  const match = text.match(
    new RegExp(
      `(\\d+(?:\\.\\d+)?)\\s*(?:x\\s*)?(?:small\\s+|medium\\s+|large\\s+)?${escaped}`,
      "i"
    )
  );

  if (match) {
    return Math.max(
      0.25,
      safeNumber(match[1], 1)
    );
  }

  const words = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
  };

  for (const [word, value] of Object.entries(words)) {
    if (
      new RegExp(
        `\\b${word}\\s+(?:small\\s+|medium\\s+|large\\s+)?${escaped}`,
        "i"
      ).test(text)
    ) {
      return value;
    }
  }

  return 1;
}

function estimateMeal(description) {
  const clean = String(description || "")
    .trim()
    .toLowerCase();

  if (!clean) {
    return {
      items: [],
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      confidence: "low",
      note:
        "Describe your meal to generate an estimate.",
    };
  }

  const matched = [];
  const usedRanges = [];

  for (const food of FOOD_LIBRARY) {
    let foundAlias = "";

    for (const alias of food.aliases) {
      const index = clean.indexOf(alias);

      if (index < 0) continue;

      const overlaps = usedRanges.some(
        ([start, end]) =>
          index < end &&
          index + alias.length > start
      );

      if (!overlaps) {
        foundAlias = alias;
        usedRanges.push([
          index,
          index + alias.length,
        ]);
        break;
      }
    }

    if (!foundAlias) continue;

    const quantity = quantityBefore(
      clean,
      foundAlias
    );

    matched.push({
      ...food,
      quantity,
      calories: Math.round(
        food.calories * quantity
      ),
      protein: Math.round(
        food.protein * quantity
      ),
      carbs: Math.round(
        food.carbs * quantity
      ),
      fat: Math.round(
        food.fat * quantity
      ),
    });
  }

  const totals = matched.reduce(
    (sum, item) => ({
      calories:
        sum.calories + item.calories,
      protein:
        sum.protein + item.protein,
      carbs: sum.carbs + item.carbs,
      fat: sum.fat + item.fat,
    }),
    {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    }
  );

  return {
    items: matched,
    ...totals,
    confidence:
      matched.length >= 2
        ? "medium"
        : matched.length === 1
        ? "low"
        : "low",
    note: matched.length
      ? "Estimate uses typical serving sizes. Review and edit before saving."
      : "No known foods were matched. Enter the nutrition manually before saving.",
  };
}

function ProgressBar({
  label,
  value,
  goal,
  suffix = "",
  tone = "cyan",
}) {
  const safeGoal = safeNumber(goal, 0);
  const safeValue = safeNumber(value, 0);
  const percent = safeGoal
    ? Math.min(
        100,
        Math.round(
          (safeValue / safeGoal) * 100
        )
      )
    : 0;

  const toneMap = {
    cyan: "bg-cyan-300",
    lime: "bg-lime-300",
    fuchsia: "bg-fuchsia-300",
    amber: "bg-amber-300",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
          {label}
        </span>

        <span className="text-sm font-black text-white">
          {safeValue}
          {suffix}
          {safeGoal
            ? ` / ${safeGoal}${suffix}`
            : ""}
        </span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/35">
        <div
          className={`h-full rounded-full ${
            toneMap[tone] || toneMap.cyan
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function MacroInput({
  label,
  value,
  onChange,
  suffix,
}) {
  return (
    <label className="block">
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>

      <div className="relative mt-2">
        <input
          inputMode="decimal"
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 pr-14 text-base font-black text-white outline-none focus:border-cyan-300/40"
        />

        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-black text-slate-500">
          {suffix}
        </span>
      </div>
    </label>
  );
}

export default function NutritionCoachDrawer({
  open,
  onClose,
  profile,
  snapshot,
  progressLogs,
  onSaveMeal,
  onOpenDashboard,
  initialMeal,
}) {
  const [description, setDescription] =
    useState("");
  const [date, setDate] =
    useState(todayYmd());
  const [estimate, setEstimate] =
    useState(null);
  const [calories, setCalories] =
    useState("");
  const [protein, setProtein] =
    useState("");
  const [carbs, setCarbs] =
    useState("");
  const [fat, setFat] =
    useState("");
  const [saving, setSaving] =
    useState(false);
  const [analyzing, setAnalyzing] =
    useState(false);
  const [analysisError, setAnalysisError] =
    useState("");
  const [savedMessage, setSavedMessage] =
    useState("");

  useEffect(() => {
    if (!open) return;

    if (initialMeal) {
      setDescription(
        initialMeal.description ||
          initialMeal.note ||
          ""
      );
      setDate(initialMeal.ymd || todayYmd());
      setCalories(
        String(
          safeNumber(
            initialMeal.calories ??
              initialMeal.value,
            0
          ) || ""
        )
      );
      setProtein(
        String(
          safeNumber(
            initialMeal.protein ??
              initialMeal.secondary,
            0
          ) || ""
        )
      );
      setCarbs(
        String(
          safeNumber(initialMeal.carbs, 0) ||
            ""
        )
      );
      setFat(
        String(
          safeNumber(initialMeal.fat, 0) ||
            ""
        )
      );
      setEstimate({
        items:
          Array.isArray(
            initialMeal.estimate_items
          )
            ? initialMeal.estimate_items
            : [],
        calories: safeNumber(
          initialMeal.calories ??
            initialMeal.value,
          0
        ),
        protein: safeNumber(
          initialMeal.protein ??
            initialMeal.secondary,
          0
        ),
        carbs: safeNumber(
          initialMeal.carbs,
          0
        ),
        fat: safeNumber(initialMeal.fat, 0),
        confidence:
          initialMeal.estimate_confidence ||
          "manual",
        note:
          "Review and save your updated meal.",
      });
      setSavedMessage("");
      return;
    }

    setDescription("");
    setDate(todayYmd());
    setEstimate(null);
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setSavedMessage("");
  }, [open, initialMeal]);

  const todayMeals = useMemo(() => {
    return (Array.isArray(progressLogs)
      ? progressLogs
      : []
    )
      .filter(
        (entry) =>
          entry?.type === "meal" &&
          entry?.ymd === todayYmd()
      )
      .slice()
      .reverse();
  }, [progressLogs]);

  const calorieGoal =
    safeNumber(
      snapshot?.calorie_goal ||
        profile?.calorie_goal,
      0
    );

  const proteinGoal =
    safeNumber(
      snapshot?.protein_goal ||
        profile?.protein_goal,
      0
    );

  if (!open) return null;

  async function runEstimate() {
    if (!description.trim() || analyzing) {
      return;
    }

    setAnalyzing(true);
    setAnalysisError("");
    setSavedMessage("");

    try {
      const response = await api.post(
        "/customer-health/nutrition/analyze/",
        {
          description:
            description.trim(),
          meal_type: "",
          restaurant: "",
        }
      );

      const data = response?.data || {};
      const totals = data?.totals || {};

      const next = {
        items: Array.isArray(data?.items)
          ? data.items.map((item) => ({
              label:
                item?.name ||
                "Food item",
              quantity:
                safeNumber(
                  item?.quantity,
                  1
                ),
              serving_description:
                item?.serving_description ||
                "",
              calories:
                safeNumber(
                  item?.calories,
                  0
                ),
              protein:
                safeNumber(
                  item?.protein,
                  0
                ),
              carbs:
                safeNumber(
                  item?.carbs,
                  0
                ),
              fat:
                safeNumber(
                  item?.fat,
                  0
                ),
              fiber:
                safeNumber(
                  item?.fiber,
                  0
                ),
              sugar:
                safeNumber(
                  item?.sugar,
                  0
                ),
            }))
          : [],
        calories:
          safeNumber(
            totals?.calories,
            0
          ),
        protein:
          safeNumber(
            totals?.protein,
            0
          ),
        carbs:
          safeNumber(
            totals?.carbs,
            0
          ),
        fat:
          safeNumber(
            totals?.fat,
            0
          ),
        fiber:
          safeNumber(
            totals?.fiber,
            0
          ),
        sugar:
          safeNumber(
            totals?.sugar,
            0
          ),
        confidence:
          data?.confidence || "low",
        source_type:
          data?.source_type ||
          "unknown",
        assumptions:
          Array.isArray(
            data?.assumptions
          )
            ? data.assumptions
            : [],
        warnings:
          Array.isArray(
            data?.warnings
          )
            ? data.warnings
            : [],
        note:
          data?.assumptions?.length
            ? data.assumptions.join(
                " "
              )
            : "AI estimate generated. Review all values before saving.",
        provider:
          data?.provider || "openai",
      };

      setEstimate(next);
      setCalories(
        next.calories
          ? String(next.calories)
          : ""
      );
      setProtein(
        next.protein
          ? String(next.protein)
          : ""
      );
      setCarbs(
        next.carbs
          ? String(next.carbs)
          : ""
      );
      setFat(
        next.fat
          ? String(next.fat)
          : ""
      );
    } catch (error) {
      const fallback =
        estimateMeal(description);

      setEstimate(fallback);
      setCalories(
        fallback.calories
          ? String(
              fallback.calories
            )
          : ""
      );
      setProtein(
        fallback.protein
          ? String(
              fallback.protein
            )
          : ""
      );
      setCarbs(
        fallback.carbs
          ? String(
              fallback.carbs
            )
          : ""
      );
      setFat(
        fallback.fat
          ? String(fallback.fat)
          : ""
      );

      setAnalysisError(
        error?.response?.data?.detail ||
          "AI analysis was unavailable, so SyncWorks used the local estimate. Review it before saving."
      );
    } finally {
      setAnalyzing(false);
    }
  }

  async function saveMeal() {
    if (
      !description.trim() ||
      safeNumber(calories, 0) <= 0
    ) {
      return;
    }

    setSaving(true);

    try {
      await onSaveMeal?.({
        type: "meal",
        ymd: date,
        note: description.trim(),
        value: safeNumber(calories, 0),
        secondary: safeNumber(protein, 0),
        carbs: safeNumber(carbs, 0),
        fat: safeNumber(fat, 0),
        estimate_items:
          estimate?.items || [],
        estimate_confidence:
          estimate?.confidence || "manual",
        source:
          estimate?.provider === "openai"
            ? "nutrition_ai_estimate"
            : estimate?.items?.length
            ? "nutrition_coach_estimate"
            : "nutrition_manual",
        replace_id: initialMeal?.id || "",
      });

      setSavedMessage(
        "Meal saved. Today’s totals have been updated."
      );
      setDescription("");
      setEstimate(null);
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[135] flex items-end justify-center bg-black/80 p-3 backdrop-blur-xl sm:items-center">
      <button
        type="button"
        aria-label="Close Nutrition Coach"
        onClick={onClose}
        className="absolute inset-0"
      />

      <section className="relative z-[136] max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-lime-300/20 bg-[radial-gradient(circle_at_top_left,rgba(112,255,61,0.10),transparent_30%),radial-gradient(circle_at_top_right,rgba(255,59,212,0.08),transparent_28%),linear-gradient(180deg,#07111f,#040812)] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.72)] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-lime-200">
              SyncWorks Nutrition Coach
            </div>

            <h2 className="mt-1 text-3xl font-black text-white">
              Tell me what you ate
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Describe the meal naturally. The coach will estimate calories and macros, show its assumptions, and wait for your confirmation before saving.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onOpenDashboard}
              className="h-10 rounded-xl border border-fuchsia-300/25 bg-fuchsia-300/10 px-3 text-xs font-black text-fuchsia-100"
            >
              Dashboard
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] font-black text-white"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ProgressBar
            label="Calories today"
            value={snapshot?.calories}
            goal={calorieGoal}
            tone="fuchsia"
          />

          <ProgressBar
            label="Protein today"
            value={snapshot?.protein_today}
            goal={proteinGoal}
            suffix="g"
            tone="lime"
          />
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-4">
          <label className="block">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">
              Meal description
            </div>

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              rows={4}
              placeholder="Example: I ate 3 McDonald’s cheeseburgers and a medium fries"
              className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold leading-6 text-white outline-none placeholder:text-slate-600 focus:border-lime-300/40"
            />
          </label>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <label className="block sm:w-48">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                Date
              </div>

              <input
                type="date"
                value={date}
                onChange={(event) =>
                  setDate(event.target.value)
                }
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm font-black text-white outline-none focus:border-cyan-300/40"
              />
            </label>

            <button
              type="button"
              disabled={
                !description.trim() ||
                analyzing
              }
              onClick={runEstimate}
              className="mt-auto h-12 flex-1 rounded-2xl border border-lime-300/30 bg-lime-300/15 px-5 text-sm font-black text-lime-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {analyzing
                ? "Analyzing Meal…"
                : "Analyze With AI"}
            </button>
          </div>
        </div>

        {analysisError ? (
          <div className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm font-bold text-amber-100">
            {analysisError}
          </div>
        ) : null}

        {estimate ? (
          <div className="mt-4 rounded-[1.5rem] border border-cyan-300/20 bg-cyan-300/[0.06] p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">
                  Coach Estimate
                </div>

                <div className="mt-1 text-xl font-black text-white">
                  Review before saving
                </div>
              </div>

              <span className="w-fit rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-300">
                {estimate.confidence} confidence
              </span>
            </div>

            {estimate.items.length ? (
              <div className="mt-4 space-y-2">
                {estimate.items.map(
                  (item, index) => (
                    <div
                      key={`${item.label}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                    >
                      <div className="text-sm font-bold text-white">
                        {item.quantity} ×{" "}
                        {item.label}
                      </div>

                      <div className="text-xs font-black text-slate-400">
                        {item.calories} cal ·{" "}
                        {item.protein}g protein
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : null}

            <p className="mt-3 text-xs leading-5 text-slate-400">
              {estimate.note}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MacroInput
                label="Calories"
                value={calories}
                onChange={setCalories}
                suffix="kcal"
              />

              <MacroInput
                label="Protein"
                value={protein}
                onChange={setProtein}
                suffix="g"
              />

              <MacroInput
                label="Carbs"
                value={carbs}
                onChange={setCarbs}
                suffix="g"
              />

              <MacroInput
                label="Fat"
                value={fat}
                onChange={setFat}
                suffix="g"
              />
            </div>

            <button
              type="button"
              onClick={saveMeal}
              disabled={
                saving ||
                !description.trim() ||
                safeNumber(calories, 0) <= 0
              }
              className="mt-4 h-12 w-full rounded-2xl border border-lime-300/30 bg-gradient-to-r from-lime-300/20 to-cyan-300/15 text-sm font-black text-lime-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving
                ? "Saving Meal…"
                : "Confirm and Save Meal"}
            </button>
          </div>
        ) : null}

        {savedMessage ? (
          <div className="mt-4 rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-4 text-sm font-bold text-emerald-100">
            {savedMessage}
          </div>
        ) : null}

        <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-fuchsia-200">
            Today’s Meals
          </div>

          {todayMeals.length ? (
            <div className="mt-3 space-y-2">
              {todayMeals.map((meal) => (
                <div
                  key={meal.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-3"
                >
                  <div className="text-sm font-black text-white">
                    {meal.description ||
                      meal.note ||
                      "Meal"}
                  </div>

                  <div className="mt-1 text-xs font-bold text-slate-400">
                    {safeNumber(
                      meal.calories ||
                        meal.value,
                      0
                    )}{" "}
                    cal ·{" "}
                    {safeNumber(
                      meal.protein ||
                        meal.secondary,
                      0
                    )}
                    g protein ·{" "}
                    {safeNumber(meal.carbs, 0)}
                    g carbs ·{" "}
                    {safeNumber(meal.fat, 0)}
                    g fat
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm leading-6 text-slate-400">
              No meals logged today yet.
            </p>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-4 text-xs leading-5 text-slate-400">
          Nutrition values are estimates and can vary by brand, portion size, and preparation. Review the numbers before saving. This tool supports health tracking and is not medical nutrition therapy.
        </div>
      </section>
    </div>
  );
}
