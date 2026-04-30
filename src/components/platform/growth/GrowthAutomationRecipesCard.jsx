import React from "react";

function GlassCard({ title, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold tracking-tight text-slate-100">{title}</div>
        {right ? <div className="text-xs text-slate-400">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function StatusPill({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-500/10 border-slate-500/20 text-slate-200",
    cyan: "bg-cyan-500/10 border-cyan-500/20 text-cyan-200",
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-200",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-200",
    rose: "bg-rose-500/10 border-rose-500/20 text-rose-200",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-200",
  };

  return (
    <span className={`text-[11px] px-2 py-1 rounded-full border ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
}

export default function GrowthAutomationRecipesCard({ recipeCards }) {
  return (
    <GlassCard title="Automation recipes (lightweight)" right="frontend-first • demo fallback">
      <div className="grid md:grid-cols-2 gap-3">
        {recipeCards.map((r) => (
          <div key={r.id} className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold text-slate-100">{r.name}</div>
              <StatusPill tone={r.status === "ACTIVE" ? "emerald" : "amber"}>{r.status}</StatusPill>
            </div>
            <div className="mt-2 text-sm text-slate-300">{r.summary}</div>
            <div className="mt-2 text-[11px] text-slate-500">{r.audience}</div>
            <div className="mt-3 flex items-center gap-2">
              <button type="button" className="h-8 px-3 rounded-2xl text-xs border border-slate-800 bg-slate-950/70 text-slate-300">View recipe</button>
              <button type="button" className="h-8 px-3 rounded-2xl text-xs border border-cyan-500/30 bg-cyan-500/10 text-cyan-100">Clone for SBO</button>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}