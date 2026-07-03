import React from "react";
import ModeBar from "../ModeBar";
import { cx } from "./GlassCard";

export default function DashboardShell({
  title,
  subtitle,
  modeBarTitle,
  modeBarSubtitle,
  rightActions,
  children,
  maxWidth = "max-w-7xl",
  className = "",
}) {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#020617] text-slate-100">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[#020617]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(217,70,239,0.10),transparent_32%),radial-gradient(circle_at_bottom,rgba(99,102,241,0.12),transparent_38%)]" />
        <div className="absolute left-1/2 top-0 h-px w-[80vw] -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-300/35 to-transparent" />
      </div>

      <ModeBar
        title={modeBarTitle || title}
        subtitle={modeBarSubtitle || subtitle}
        rightActions={rightActions}
      />

      <main
        className={cx(
          "relative mx-auto px-3 pb-40 pt-4 sm:px-5 lg:pb-10",
          maxWidth,
          className
        )}
      >
        {children}
      </main>

    </div>
  );
}