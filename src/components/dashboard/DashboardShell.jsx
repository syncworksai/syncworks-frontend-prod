import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import ModeBar from "../ModeBar";
import ProfileCompletionBanner from "../profile/ProfileCompletionBanner";
import LocalDiscoveryBanner from "../discovery/LocalDiscoveryBanner";
import SyncDailyIntelligenceBar from "../sync/SyncDailyIntelligenceBar";
import { useBusinessWorkspaceTheme } from "../../hooks/useBusinessWorkspaceTheme";
import { cx } from "./GlassCard";
import "./DashboardShell.css";

/**
 * The shared dashboard-shell owns the viewport, not document scrolling.
 * Inner workspaces remain scrollable for long forms/data; global header,
 * assistant and mobile navigation stay anchored outside the content region.
 *
 * Scoped to business and work modules. Personal Health, Forge and Games are
 * intentionally excluded and retain their own independently designed shells.
 */
function isBusinessWorkspace(path) {
  return /^\/(?:sbo|pm|employee|team|tickets|calendar|inbox|platform|tenant|investor|sales|ceo)(?:\/|$)/.test(path);
}

export default function DashboardShell({
  title,
  subtitle,
  modeBarTitle,
  modeBarSubtitle,
  rightActions,
  children,
  maxWidth = "max-w-[1600px]",
  className = "",
  locked,
}) {
  const {pathname}=useLocation();
  const {themeProps}=useBusinessWorkspaceTheme();
  const isLocked=locked ?? isBusinessWorkspace(pathname);

  useEffect(()=>{
    if(!isLocked)return undefined;
    document.documentElement.classList.add("sw-business-shell-active");
    document.body.classList.add("sw-business-shell-active");
    return ()=>{
      document.documentElement.classList.remove("sw-business-shell-active");
      document.body.classList.remove("sw-business-shell-active");
    };
  },[isLocked]);

  return (
    <div
      className={cx(
        "bg-[#020617] text-slate-100",
        isLocked?"sw-business-locked-shell":"min-h-dvh overflow-x-hidden"
      )}
      data-sw-shell="dashboard"
      data-sw-locked={isLocked ? "true" : undefined}
      {...(isLocked?themeProps:{})}
    >
      {isLocked ? <>
        <div className="sw-business-shell-photo" aria-hidden="true" />
        <div className="sw-business-shell-overlay" aria-hidden="true" />
      </> : <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[#020617]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(217,70,239,0.10),transparent_32%),radial-gradient(circle_at_bottom,rgba(99,102,241,0.12),transparent_38%)]" />
        <div className="absolute left-1/2 top-0 h-px w-[80vw] -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-300/35 to-transparent" />
      </div>}

      <ModeBar
        title={modeBarTitle || title}
        subtitle={modeBarSubtitle || subtitle}
        rightActions={rightActions}
      />

      {!isLocked && <div className="md:hidden" data-sw-layout="portrait">
        <ProfileCompletionBanner />
        <LocalDiscoveryBanner />
        <SyncDailyIntelligenceBar />
      </div>}

      <main
        className={cx(
          isLocked
            ? "sw-business-shell-main relative mx-auto min-h-0 w-full px-3 pt-2 sm:px-4 lg:px-5"
            : "relative mx-auto px-3 pb-[calc(8.5rem+env(safe-area-inset-bottom))] pt-3 sm:px-4 sm:pt-4 lg:px-6 lg:pb-8 lg:pt-4 xl:px-8",
          maxWidth,
          className
        )}
        data-sw-layout="responsive"
        data-sw-workspace-content={isLocked?"locked":undefined}
      >
        {children}
      </main>
    </div>
  );
}
