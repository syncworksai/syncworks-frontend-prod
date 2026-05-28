// src/components/requests/RequestStepNav.jsx
import React from "react";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

const DEFAULT_STEPS = [
  { key: "search", label: "Find" },
  { key: "service", label: "Service" },
  { key: "urgency", label: "Urgency" },
  { key: "location", label: "Location" },
  { key: "details", label: "Details" },
  { key: "review", label: "Review" },
];

export default function RequestStepNav({
  step,
  setStep,
  steps = DEFAULT_STEPS,
  canGoTo = () => true,
}) {
  return (
    <div className="w-full">
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {steps.map((s, i) => {
          const active = step === i;
          const complete = step > i;
          const enabled = i <= step || canGoTo(i);

          return (
            <button
              key={s.key || s.label}
              type="button"
              disabled={!enabled}
              onClick={() => enabled && setStep(i)}
              className={cx(
                "shrink-0 rounded-2xl border px-3 py-2 text-left transition min-w-[94px]",
                active
                  ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-50 shadow-[0_0_20px_rgba(34,211,238,0.16)]"
                  : complete
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                  : enabled
                  ? "border-slate-800 bg-slate-950/70 text-slate-300 hover:border-cyan-500/30 hover:bg-slate-900/70"
                  : "border-slate-900 bg-slate-950/30 text-slate-600 cursor-not-allowed"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cx(
                    "grid h-5 w-5 place-items-center rounded-full border text-[10px] font-black",
                    active
                      ? "border-cyan-300 bg-cyan-400 text-black"
                      : complete
                      ? "border-emerald-400 bg-emerald-400 text-black"
                      : "border-slate-700 bg-slate-900 text-slate-400"
                  )}
                >
                  {complete ? "✓" : i + 1}
                </span>

                <span className="text-xs font-semibold whitespace-nowrap">
                  {s.label}
                </span>
              </div>

              {s.helper ? (
                <div className="mt-1 text-[10px] text-slate-500 whitespace-nowrap">
                  {s.helper}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}