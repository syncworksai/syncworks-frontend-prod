import React from "react";

function Tile({ title, desc, badge, tone = "cyan", onClick, disabled }) {
  const toneMap = {
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-100",
    fuchsia: "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-100",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",
    amber: "border-amber-500/25 bg-amber-500/10 text-amber-100",
    indigo: "border-indigo-500/25 bg-indigo-500/10 text-indigo-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-left rounded-3xl border p-5 transition ${
        toneMap[tone] || toneMap.cyan
      } ${disabled ? "opacity-80 cursor-not-allowed" : "hover:scale-[1.01]"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-lg font-black">{title}</div>
        {badge ? (
          <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-semibold">
            {badge}
          </span>
        ) : null}
      </div>

      <div className="mt-2 text-sm opacity-80 leading-relaxed">{desc}</div>
    </button>
  );
}

export default function CustomerAppTiles({
  onFinance,
  onFitness,
  onLocalBusinesses,
  onNewsfeed,
}) {
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
      <Tile
        title="Finance"
        desc="Bills, payments, receipts, and personal cashflow tools."
        badge="Coming Soon"
        tone="cyan"
        onClick={onFinance}
      />

      <Tile
        title="Fitness"
        desc="Habits, workouts, goals, and daily accountability."
        badge="Coming Soon"
        tone="emerald"
        onClick={onFitness}
      />

      <Tile
        title="Local Businesses"
        desc="Find providers near you and save favorites to Business Cards."
        badge="Build Network"
        tone="fuchsia"
        onClick={onLocalBusinesses}
      />

      <Tile
        title="Featured Offers"
        desc="Platform-approved promotions and sponsored local offers."
        badge="Approved"
        tone="amber"
        onClick={onNewsfeed}
      />
    </div>
  );
}