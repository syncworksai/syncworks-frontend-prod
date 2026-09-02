import React, { useMemo, useState } from "react";
import { addTask, upsertList, uid } from "../../lib/personalActionStore";

function n(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }

export default function HealthGoalBriefing({ profile = {}, snapshot = {}, onOpenNutrition, onOpenPlanner }) {
  const [message, setMessage] = useState("");
  const calorieGoal = n(snapshot?.calorie_goal ?? profile?.calorie_goal);
  const proteinGoal = n(snapshot?.protein_goal ?? profile?.protein_goal);
  const calories = n(snapshot?.calories ?? snapshot?.calories_today);
  const protein = n(snapshot?.protein_today ?? snapshot?.protein);
  const weekPlan = Array.isArray(snapshot?.week_plan) ? snapshot.week_plan : [];
  const planned = weekPlan.filter((item) => item?.workout_name).length;
  const completed = weekPlan.filter((item) => item?.status === "Completed").length;
  const proteinLeft = proteinGoal ? Math.max(0, proteinGoal - protein) : 0;

  const briefing = useMemo(() => ({
    headline: proteinGoal ? `Build consistency around ${Math.round(proteinGoal)}g protein and your training plan.` : "Finish target setup so SYNC can turn Health into daily actions.",
    rules: [
      proteinGoal ? `Protein: aim for at least 90% of ${Math.round(proteinGoal)}g on a tracked day.` : "Set a protein target before protein adherence is scored.",
      calorieGoal ? `Calories: treat ${Math.round(calorieGoal)} as a target with context, not a pass/fail cliff.` : "Set a calorie target before calorie adherence is scored.",
      planned ? `Training: complete or intentionally reschedule planned sessions; a moved session is not automatically a failed week.` : "Build a weekly workout plan so missed and completed sessions can be measured.",
    ],
    exceptions: ["No food log means unknown, not failed.", "Illness, travel, recovery needs or a deliberately moved workout should change the plan instead of creating fake failure.", "Today stays in progress until the day is actually complete."],
    actions: [
      ...(proteinLeft > 0 ? [{ title: `Finish today's protein target - ${Math.round(proteinLeft)}g remaining`, reason: `Supports the current ${Math.round(proteinGoal)}g daily protein goal.`, route: "/customer/health" }] : []),
      ...(planned && completed < planned ? [{ title: "Review this week's remaining workouts", reason: `${completed} of ${planned} planned sessions are completed.`, route: "/customer/health" }] : []),
    ],
  }), [proteinGoal, calorieGoal, proteinLeft, planned, completed]);

  function sendActions() {
    briefing.actions.forEach((action) => addTask({ ...action, source: "HEALTH", due_ymd: new Date().toLocaleDateString("en-CA"), priority: "HIGH" }));
    setMessage(briefing.actions.length ? "Health actions added to My Day." : "No new Health action is required right now.");
  }

  function createShoppingList() {
    const items = [];
    if (proteinLeft > 0) {
      items.push({ id: uid("shop"), title: "Lean protein option", quantity: "Enough to close today's protein gap", done: false, reason: `Current gap: ${Math.round(proteinLeft)}g protein` });
      items.push({ id: uid("shop"), title: "High-protein grab-and-go option", quantity: "2-3 servings", done: false, reason: "Backup option for busy days" });
    }
    items.push({ id: uid("shop"), title: "Hydration / water supply", quantity: "As needed", done: false, reason: "Keep the week's training and nutrition plan easy to execute" });
    upsertList({ title: "Health Shopping - This Week", type: "SHOPPING", source: "HEALTH", reason: "Items support the current Health goal briefing. Adjust choices to preferences and budget.", route: "/customer/store", items });
    setMessage("Health shopping list added to My Day.");
  }

  return <section className="rounded-[1.6rem] border border-lime-300/20 bg-[radial-gradient(circle_at_90%_0%,rgba(112,255,61,.10),transparent_30%),rgba(7,16,30,.96)] p-4 sm:p-5">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><div className="text-[9px] font-black uppercase tracking-[.18em] text-lime-200">Your Health briefing</div><h3 className="mt-1 text-xl font-black text-white">{briefing.headline}</h3><p className="mt-1 text-xs leading-5 text-slate-400">The plan is only useful if you understand what counts, what does not, and what to do next.</p></div><div className="flex gap-2"><button type="button" onClick={sendActions} className="h-10 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-3 text-[11px] font-black text-cyan-100">Send actions to My Day</button><button type="button" onClick={createShoppingList} className="h-10 rounded-xl border border-fuchsia-300/25 bg-fuchsia-300/10 px-3 text-[11px] font-black text-fuchsia-100">Create shopping list</button></div></div>
    <div className="mt-4 grid gap-3 lg:grid-cols-3"><div className="rounded-xl border border-emerald-300/15 bg-emerald-500/[.05] p-3"><div className="text-[9px] font-black uppercase text-emerald-200">Rules</div><div className="mt-2 space-y-2">{briefing.rules.map((item) => <div key={item} className="text-[11px] leading-4 text-slate-300">• {item}</div>)}</div></div><div className="rounded-xl border border-amber-300/15 bg-amber-500/[.05] p-3"><div className="text-[9px] font-black uppercase text-amber-200">Exceptions</div><div className="mt-2 space-y-2">{briefing.exceptions.map((item) => <div key={item} className="text-[11px] leading-4 text-slate-300">• {item}</div>)}</div></div><div className="rounded-xl border border-cyan-300/15 bg-cyan-500/[.05] p-3"><div className="text-[9px] font-black uppercase text-cyan-200">Next actions</div><div className="mt-2 space-y-2">{briefing.actions.length ? briefing.actions.map((item) => <div key={item.title} className="text-[11px] leading-4 text-slate-300">• {item.title}</div>) : <div className="text-[11px] text-slate-500">No urgent action generated from current data.</div>}</div></div></div>
    <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={onOpenNutrition} className="text-[10px] font-black text-lime-200">Open Nutrition →</button><button type="button" onClick={onOpenPlanner} className="text-[10px] font-black text-cyan-200">Open Workout Plan →</button>{message ? <span className="text-[10px] font-bold text-slate-400">{message}</span> : null}</div>
  </section>;
}
