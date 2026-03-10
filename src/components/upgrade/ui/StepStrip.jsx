// src/components/upgrade/ui/StepStrip.jsx
import React from "react";

export default function StepStrip({ current }) {
  const steps = [
    { title: "Business", desc: "Create/select" },
    { title: "Setup", desc: "ZIP + services" },
    { title: "Billing", desc: "Card/promo" },
    { title: "Upgrade", desc: "Unlock SBO" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {steps.map((s, idx) => {
        const active = idx === current;
        const done = idx < current;
        return (
          <div
            key={s.title}
            className={
              "rounded-2xl border px-3 py-2 " +
              (active
                ? "border-cyan-500/40 bg-cyan-500/10"
                : done
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-slate-800 bg-slate-950/30")
            }
          >
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-400">{idx + 1}</div>
              <div className="text-xs">
                {done ? (
                  <span className="text-emerald-200">✓</span>
                ) : active ? (
                  <span className="text-cyan-200">●</span>
                ) : null}
              </div>
            </div>
            <div
              className={
                "text-sm font-semibold " +
                (active ? "text-cyan-100" : done ? "text-emerald-100" : "text-slate-200")
              }
            >
              {s.title}
            </div>
            <div className="text-[11px] text-slate-500">{s.desc}</div>
          </div>
        );
      })}
    </div>
  );
}