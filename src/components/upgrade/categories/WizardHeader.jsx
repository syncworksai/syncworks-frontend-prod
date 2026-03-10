// src/components/upgrade/categories/WizardHeader.jsx
import React from "react";

export default function WizardHeader({ step, onStep }) {
  const chips = [
    { i: 0, label: "1) Industry" },
    { i: 1, label: "2) Group" },
    { i: 2, label: "3) Services" },
    { i: 3, label: "4) Review" },
  ];
  return (
    <div className="flex gap-2 flex-wrap">
      {chips.map((c) => (
        <button
          key={c.i}
          type="button"
          onClick={() => onStep(c.i)}
          className={
            "px-3 py-2 rounded-xl text-xs border " +
            (step === c.i
              ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-100"
              : "bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-200")
          }
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}