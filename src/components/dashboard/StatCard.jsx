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
        "min-h-[132px]",
        clickable && "cursor-pointer transition hover:-translate-y-0.5 hover:border-cyan-500/35"
      )}
      bodyClassName="h-full"
    >
      <button
        type="button"
        onClick={onClick}
        disabled={!clickable}
        className={cx(
          "block h-full w-full text-left",
          !clickable && "cursor-default"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {label}
            </div>
            <div className="mt-3 text-3xl font-black tracking-tight text-white">
              {value}
            </div>
          </div>

          <div
            className={cx(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-700/80 bg-slate-950/65 text-lg shadow-[0_0_25px_rgba(34,211,238,0.12)]",
              TONE_TEXT[tone] || TONE_TEXT.cyan
            )}
          >
            {icon || "✦"}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="text-xs text-slate-400">{hint || "Live dashboard metric"}</div>
          {badge ? (
            <span
              className={cx(
                "rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]",
                "border-slate-700 bg-slate-950/60",
                TONE_TEXT[tone] || TONE_TEXT.cyan
              )}
            >
              {badge}
            </span>
          ) : null}
        </div>
      </button>
    </GlassCard>
  );
}