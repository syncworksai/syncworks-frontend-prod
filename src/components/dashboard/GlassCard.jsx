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
        "relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-slate-950/45 backdrop-blur-xl",
        "shadow-[0_18px_60px_rgba(0,0,0,0.28)]",
        glow && "before:absolute before:inset-0 before:bg-gradient-to-br before:opacity-70",
        glow && (TONES[tone] || TONES.cyan),
        className
      )}
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-cyan-500/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-28 h-64 w-64 rounded-full bg-fuchsia-500/8 blur-3xl" />

      <div className="relative p-4 sm:p-5">
        {(title || subtitle || right) && (
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              {title ? (
                <h3 className="truncate text-base font-extrabold text-slate-100 sm:text-lg">
                  {title}
                </h3>
              ) : null}

              {subtitle ? (
                <p className="mt-1 text-xs leading-5 text-slate-400 sm:text-sm">
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