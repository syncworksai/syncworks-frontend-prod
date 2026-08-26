import React from "react";
import ModeBar from "../ModeBar";
import ProfileCompletionBanner from "../profile/ProfileCompletionBanner";
import LocalDiscoveryBanner from "../discovery/LocalDiscoveryBanner";
import SyncDailyIntelligenceBar from "../sync/SyncDailyIntelligenceBar";
import { cx } from "./GlassCard";

export default function DashboardShell({
  title,
  subtitle,
  modeBarTitle,
  modeBarSubtitle,
  rightActions,
  children,
  maxWidth = "max-w-[1600px]",
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

      {/* These mobile intelligence strips are useful on the phone, but on desktop
          they were pushing the actual Personal command center below the fold. */}
      <div className="lg:hidden">
        <ProfileCompletionBanner />
        <LocalDiscoveryBanner />
        <SyncDailyIntelligenceBar />
      </div>

      <main
        className={cx(
          "relative mx-auto px-3 pb-40 pt-4 sm:px-5 lg:px-8 lg:pb-10 lg:pt-5",
          maxWidth,
          className
        )}
      >
        {children}
      </main>
    </div>
  );
}
