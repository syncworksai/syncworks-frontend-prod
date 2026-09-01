import React from "react";
import GlassCard, { cx } from "./GlassCard";

const TONE_TEXT = {
  cyan: "text-cyan-200",
  indigo: "text-indigo-200",
  fuchsia: "text-fuchsia-200",
  emerald: "text-emerald-200",
  amber: "text-amber-200",
  rose: "text-rose-200",
  slate: "text-slate-200",
};

export default function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "cyan",
  badge,
  onClick,
}) {
  const clickable = typeof onClick === "function";

  return (
    <GlassCard
      tone={tone}
      className={cx(
        "min-h-[108px]",
        clickable && "cursor-pointer transition hover:-translate-y-0.5 hover:border-cyan-500/35"
      )}
      bodyClassName="h-full"
    >
      <button
        type="button"
        onClick={onClick}
        disabled={!clickable}
        className={cx("block h-full w-full text-left", !clickable && "cursor-default")}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</div>
            <div className="mt-2 text-2xl font-black tracking-tight text-white">{value}</div>
          </div>

          <div className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-950/65 text-base shadow-[0_0_20px_rgba(34,211,238,0.10)]", TONE_TEXT[tone] || TONE_TEXT.cyan)}>
            {icon || "✦"}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="min-w-0 truncate text-[10px] text-slate-400">{hint || "Live dashboard metric"}</div>
          {badge ? <span className={cx("shrink-0 rounded-full border border-slate-700 bg-slate-950/60 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em]", TONE_TEXT[tone] || TONE_TEXT.cyan)}>{badge}</span> : null}
        </div>
      </button>
    </GlassCard>
  );
}