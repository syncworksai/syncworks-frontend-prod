import React from "react";

/**
 * Single source of truth for ALL buttons in the app.
 * - Centers text/icons reliably (inline-flex + items-center + justify-center)
 * - Consistent height/padding/rounded
 * - "tone" controls color styling
 * - "size" controls dimensions (sm/md/lg/icon)
 */

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

const TONE_STYLES = {
  slate:
    "bg-slate-950/60 hover:bg-slate-900/60 border-slate-800 text-slate-200",
  cyan:
    "bg-cyan-500/15 hover:bg-cyan-500/20 border-cyan-500/30 text-cyan-200",
  indigo:
    "bg-indigo-500/15 hover:bg-indigo-500/20 border-indigo-500/30 text-indigo-200",
  rose:
    "bg-rose-500/15 hover:bg-rose-500/20 border-rose-500/30 text-rose-200",
  emerald:
    "bg-emerald-500/15 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-200",
};

const SIZE_STYLES = {
  sm: "h-9 px-3 text-sm rounded-xl",
  md: "h-10 px-4 text-sm rounded-xl",
  lg: "h-11 px-5 text-base rounded-2xl",
  icon: "h-10 w-10 p-0 rounded-xl",
};

export default function Button({
  children,
  className,
  tone = "slate",
  size = "md",
  type = "button",
  disabled = false,
  title,
  onClick,
  ...rest
}) {
  const toneCls = TONE_STYLES[tone] || TONE_STYLES.slate;
  const sizeCls = SIZE_STYLES[size] || SIZE_STYLES.md;

  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={cx(
        "inline-flex items-center justify-center gap-2 select-none",
        "border font-semibold transition",
        "focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:ring-offset-0",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "cursor-pointer active:translate-y-[0.5px]",
        toneCls,
        sizeCls,
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
