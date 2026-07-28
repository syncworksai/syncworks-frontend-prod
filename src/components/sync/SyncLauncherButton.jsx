import React from "react";

export default function SyncLauncherButton({
  onClick,
  label = "Open SYNC",
  compact = false,
  health = false,
  className = "",
}) {
  const accent = health
    ? "from-emerald-300 via-lime-400 to-emerald-500"
    : "from-cyan-300 via-blue-500 to-violet-500";
  const glow = health
    ? "shadow-[0_0_18px_rgba(57,255,136,.5),0_0_44px_rgba(112,255,61,.2)]"
    : "shadow-[0_0_18px_rgba(52,223,255,.55),0_0_48px_rgba(139,92,246,.28)]";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`group relative inline-grid shrink-0 place-items-center rounded-full border border-cyan-200/35 bg-[#020617] p-1 transition active:scale-95 ${glow} ${compact ? "h-14 w-14" : "h-20 w-20"} ${className}`}
    >
      <span className={`absolute inset-1 rounded-full bg-gradient-to-br ${accent} opacity-70 blur-[7px] transition group-hover:opacity-100`} />
      <span className="relative grid h-full w-full place-items-center rounded-full border border-white/25 bg-[radial-gradient(circle_at_32%_25%,rgba(255,255,255,.22),rgba(15,23,42,.96)_43%,rgba(2,6,23,1)_72%)] shadow-[inset_0_0_18px_rgba(255,255,255,.08)]">
        <span className={`bg-gradient-to-br ${accent} bg-clip-text font-black italic text-transparent drop-shadow-[0_0_10px_rgba(34,211,238,.7)] ${compact ? "text-2xl" : "text-4xl"}`}>
          S
        </span>
      </span>
      <span className="pointer-events-none absolute inset-[-5px] rounded-full border border-cyan-300/15" />
    </button>
  );
}
