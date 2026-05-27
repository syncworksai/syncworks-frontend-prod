import React from "react";

export function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

const TONES = {
  cyan: "from-cyan-500/35 via-blue-500/20 to-fuchsia-500/25",
  indigo: "from-indigo-500/35 via-cyan-500/15 to-fuchsia-500/25",
  fuchsia: "from-fuchsia-500/35 via-indigo-500/20 to-cyan-500/20",
  emerald: "from-emerald-500/30 via-cyan-500/15 to-indigo-500/20",
  amber: "from-amber-500/30 via-fuchsia-500/15 to-indigo-500/20",
  rose: "from-rose-500/30 via-fuchsia-500/15 to-indigo-500/20",
  slate: "from-slate-500/20 via-slate-500/10 to-slate-500/10",
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
        "relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950/45 backdrop-blur-xl",
        "shadow-[0_0_45px_rgba(0,0,0,0.35)]",
        glow && "before:absolute before:inset-0 before:bg-gradient-to-br before:opacity-70",
        glow && (TONES[tone] || TONES.cyan),
        className
      )}
    >
      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl" />

      <div className="relative p-5">
        {(title || subtitle || right) && (
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              {title ? (
                <h3 className="truncate text-base font-extrabold text-slate-100">
                  {title}
                </h3>
              ) : null}
              {subtitle ? (
                <p className="mt-1 text-xs leading-5 text-slate-400">{subtitle}</p>
              ) : null}
            </div>
            {right ? <div className="shrink-0">{right}</div> : null}
          </div>
        )}

        <div className={cx("relative", bodyClassName)}>{children}</div>
      </div>
    </section>
  );
}