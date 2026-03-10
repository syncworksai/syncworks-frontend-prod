// src/components/ui/GlowCard.jsx
import React from "react";

/**
 * GlowCard
 * - “Upgrade page style” neon highlight border
 * - Professional, silicon-valley vibe
 * - Uses a gradient "frame" + dark glass interior
 *
 * Props:
 * - tone: "cyan" | "fuchsia" | "indigo" | "emerald" | "amber" | "rose" | "slate"
 * - className: extra Tailwind classes
 */
export default function GlowCard({ tone = "cyan", className = "", children }) {
  const toneMap = {
    cyan: "from-cyan-500/55 via-indigo-500/45 to-fuchsia-500/55",
    fuchsia: "from-fuchsia-500/60 via-indigo-500/45 to-cyan-500/45",
    indigo: "from-indigo-500/60 via-fuchsia-500/45 to-cyan-500/45",
    emerald: "from-emerald-500/55 via-cyan-500/35 to-indigo-500/45",
    amber: "from-amber-500/55 via-fuchsia-500/30 to-indigo-500/45",
    rose: "from-rose-500/55 via-fuchsia-500/35 to-indigo-500/45",
    slate: "from-slate-500/35 via-slate-400/20 to-slate-500/35",
  };

  const grad = toneMap[tone] || toneMap.cyan;

  return (
    <div
      className={[
        "relative rounded-[28px] p-[1px] overflow-hidden",
        "shadow-[0_0_60px_rgba(0,0,0,0.45)]",
        "hover:shadow-[0_0_85px_rgba(0,0,0,0.55)] transition",
        className,
      ].join(" ")}
    >
      {/* Gradient frame */}
      <div className={["absolute inset-0 opacity-85 bg-gradient-to-r", grad].join(" ")} />
      {/* Extra glow bloom */}
      <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-fuchsia-500/12 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-500/12 blur-3xl" />

      {/* Inner glass */}
      <div className="relative rounded-[27px] border border-slate-800/80 bg-slate-950/45 backdrop-blur px-5 py-5">
        {children}
      </div>
    </div>
  );
}