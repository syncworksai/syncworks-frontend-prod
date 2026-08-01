import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import NutritionBudgetCoachChat from "./NutritionBudgetCoachChat";

function numberFrom(text, fallback = 0) {
  const parsed = Number(String(text || "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function findNutritionDrawer() {
  return [...document.querySelectorAll("section")].find((section) =>
    (section.textContent || "").includes("SyncWorks Nutrition Coach")
  );
}

function parseProgress(drawer, label) {
  const text = drawer?.textContent || "";
  const pattern = new RegExp(`${label}\\s*(\\d[\\d,]*)\\s*\\/\\s*(\\d[\\d,]*)`, "i");
  const match = text.match(pattern);
  return match
    ? { value: numberFrom(match[1]), goal: numberFrom(match[2]) }
    : { value: 0, goal: 0 };
}

function setNativeValue(element, value) {
  const descriptor = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value"
  );
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function repairNutritionText(drawer) {
  if (!drawer) return;
  const replacements = new Map([
    ["Ã¢Å“â€¢", "Close"],
    ["Analyzing MealÃ¢â‚¬Â¦", "Analyzing Meal..."],
    ["Saving MealÃ¢â‚¬Â¦", "Saving Meal..."],
    ["Ã¢â‚¬Â¦", "..."],
    ["Ã‚/", "·"],
    ["Â", ""],
  ]);

  const walker = document.createTreeWalker(drawer, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    let next = node.nodeValue || "";
    replacements.forEach((replacement, broken) => {
      next = next.split(broken).join(replacement);
    });
    if (next !== node.nodeValue) node.nodeValue = next;
  });
}

export default function NutritionCoachGlobalAssist() {
  const [drawer, setDrawer] = useState(null);
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState({});

  useEffect(() => {
    const refresh = () => {
      const nextDrawer = findNutritionDrawer();
      setDrawer(nextDrawer || null);
      if (!nextDrawer) {
        setOpen(false);
        return;
      }
      repairNutritionText(nextDrawer);
      const calories = parseProgress(nextDrawer, "Calories today");
      const protein = parseProgress(nextDrawer, "Protein today");
      setSnapshot({
        calories: calories.value,
        calorie_goal: calories.goal,
        protein_today: protein.value,
        protein_goal: protein.goal,
      });
    };

    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  const portalTarget = useMemo(() => document.body, []);
  if (!drawer) return null;

  function useSuggestion(suggestion) {
    const currentDrawer = findNutritionDrawer();
    const textarea = currentDrawer?.querySelector("textarea");
    if (textarea) {
      setNativeValue(textarea, suggestion.description || "");
      textarea.scrollIntoView({ behavior: "smooth", block: "center" });
      textarea.focus();
    }
    setOpen(false);
  }

  return createPortal(
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-1/2 z-[180] h-12 -translate-x-1/2 rounded-full border border-fuchsia-300/35 bg-[#15102a] px-5 text-xs font-black text-fuchsia-100 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
      >
        Ask Nutrition Coach
      </button>

      {open ? (
        <div className="fixed inset-0 z-[190] flex items-end justify-center bg-black/80 p-0 backdrop-blur-xl sm:items-center sm:p-4">
          <button type="button" aria-label="Close coach" className="absolute inset-0" onClick={() => setOpen(false)} />
          <div className="relative z-[191] max-h-[88dvh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] border border-fuchsia-300/20 bg-[#07111f] p-3 pb-8 shadow-[0_30px_100px_rgba(0,0,0,0.75)] sm:rounded-[2rem] sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.18em] text-fuchsia-200">Practical food decision</div>
                <div className="mt-1 text-xl font-black text-white">What can you realistically eat?</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-black text-white">Close</button>
            </div>
            <NutritionBudgetCoachChat snapshot={snapshot} profile={{}} onUseSuggestion={useSuggestion} />
          </div>
        </div>
      ) : null}
    </>,
    portalTarget
  );
}
