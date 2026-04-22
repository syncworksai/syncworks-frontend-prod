// src/components/requests/RequestStepNav.jsx
import React from "react";

export default function RequestStepNav({ step, setStep }) {
  const steps = ["Category", "Type", "Job", "Details"];

  return (
    <div className="flex gap-2 mb-4 flex-wrap">
      {steps.map((s, i) => (
        <button
          key={s}
          onClick={() => setStep(i)}
          className={`px-3 py-1 rounded-xl text-xs ${
            step === i
              ? "bg-cyan-500 text-black"
              : "bg-slate-800 text-slate-400"
          }`}
        >
          {i + 1}. {s}
        </button>
      ))}
    </div>
  );
}