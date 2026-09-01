import React from "react";

export function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

const TONES = {
  cyan: "from-cyan-500/18 via-blue-500/10 to-fuchsia-500/12",
  indigo: "from-indigo-500/18 via-cyan-500/8 to-fuchsia-500/12",
  fuchsia: "from-fuchsia-500/18 via-indigo-500/10 to-cyan-500/10",
  emerald: "from-emerald-500/16 via-cyan-500/8 to-indigo-500/10",
  amber: "from-amber-500/16 via-fuchsia-500/8 to-indigo-500/10",
  rose: "from-rose-500/16 via-fuchsia-500/8 to-indigo-500/10",
  slate: "from-slate-500/10 via-slate-500/5 to-slate-500/5",
};

export default function GlassCard({
  title,
  subtitle,
  right,
  children,
  className = "",
  bodyClassName = "",
  tone = "cyan",
  glow = true,
}) {
  return (
    <section
      className={cx(
        "relative overflow-hidden rounded-[1.45rem] border border-white/10 bg-slate-950/45 backdrop-blur-xl",
        "shadow-[0_16px_48px_rgba(0,0,0,0.26)]",
        glow && "before:absolute before:inset-0 before:bg-gradient-to-br before:opacity-60",
        glow && (TONES[tone] || TONES.cyan),
        className
      )}
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-52 w-52 rounded-full bg-cyan-500/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-28 h-60 w-60 rounded-full bg-fuchsia-500/8 blur-3xl" />

      <div className="relative p-3.5 sm:p-4">
        {(title || subtitle || right) && (
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              {title ? (
                <h3 className="truncate text-sm font-extrabold tracking-tight text-slate-100 sm:text-base">
                  {title}
                </h3>
              ) : null}

              {subtitle ? (
                <p className="mt-1 text-[11px] leading-4 text-slate-400 sm:text-xs sm:leading-5">
                  {subtitle}
                </p>
              ) : null}
            </div>

            {right ? <div className="shrink-0">{right}</div> : null}
          </div>
        )}

        <div className={cx("relative min-w-0", bodyClassName)}>{children}</div>
      </div>
    </section>
  );
}