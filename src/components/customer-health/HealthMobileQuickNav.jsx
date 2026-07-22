// src/components/customer-health/HealthMobileQuickNav.jsx
import React from "react";

const HEALTH_GLOW_LOGO = "/health/syncworks-health-s-glow.png";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Icon({ type }) {
  const paths = {
    home: <><path d="m4 11 8-7 8 7" /><path d="M6.5 10.5V20h11v-9.5M10 20v-5h4v5" /></>,
    plan: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4M17 3v4M3 9h18M7 13h3M14 13h3M7 17h3" /></>,
    progress: <><path d="M5 20V11M12 20V5M19 20v-8" /><path d="m4 8 5-4 4 3 7-5" /></>,
    log: <><path d="M5 4h14v16H5z" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  };

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[type]}
    </svg>
  );
}

function NavButton({ label, icon, onClick, active = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 font-sans text-[8px] font-extrabold uppercase tracking-[0.08em] transition active:scale-[0.96]",
        active
          ? "text-[#65ff9a]"
          : "text-slate-400 hover:text-white"
      )}
    >
      <span
        className={cx(
          "flex h-8 w-8 items-center justify-center rounded-xl border bg-black/55",
          active
            ? "border-[#39ff88]/55 text-[#65ff9a] shadow-[0_0_16px_rgba(57,255,136,0.3)]"
            : "border-white/10 text-slate-400"
        )}
      >
        {icon}
      </span>

      <span className="w-full truncate text-center leading-none">
        {label}
      </span>
    </button>
  );
}

export default function HealthMobileQuickNav({
  onOpen,
  onOpenSync,
  nextSession,
  hasCoachProposal,
  activeView = "home",
}) {
  return (
    <div
      data-syncworks-module-nav="health"
      className="fixed inset-x-0 bottom-0 z-[75] border-t border-[#39ff88]/20 bg-[#010302]/96 px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-1.5 shadow-[0_-10px_34px_rgba(0,0,0,0.72)] backdrop-blur-2xl lg:hidden"
    >
      <div className="mx-auto max-w-md">
        <div className="grid h-[64px] grid-cols-5 items-center gap-1">
          <NavButton
            label="Home"
            icon={<Icon type="home" />}
            active={activeView === "home"}
            onClick={() => onOpen?.("home")}
          />

          <NavButton
            label="Calendar"
            icon={<Icon type="plan" />}
            active={activeView === "planner"}
            onClick={() => onOpen?.("planner")}
          />

          <div className="relative flex h-full items-center justify-center">
            <button
              type="button"
              onClick={() => onOpenSync?.()}
              aria-label="Open SYNC health assistant"
              title="Open SYNC"
              className="relative flex h-[58px] w-[58px] items-center justify-center rounded-full border border-[#65ff9a]/75 bg-black shadow-[0_0_0_3px_rgba(57,255,136,0.08),0_0_28px_rgba(57,255,136,0.5),inset_0_0_18px_rgba(57,255,136,0.12)] transition active:scale-[0.94]"
            >
              <span className="absolute inset-1 animate-pulse rounded-full bg-[#39ff88]/10 blur-md" />
              <img
                src={HEALTH_GLOW_LOGO}
                alt=""
                className="relative h-full w-full scale-[1.45] rounded-full object-cover object-center"
              />
            </button>

            <span className="pointer-events-none absolute -bottom-1 rounded-full border border-[#39ff88]/25 bg-[#010302]/95 px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.16em] text-[#65ff9a]">
              SYNC
            </span>
          </div>

          <NavButton
            label="Progress"
            icon={<Icon type="progress" />}
            active={
              activeView === "insights" ||
              activeView === "dashboard"
            }
            onClick={() => onOpen?.("insights")}
          />

          <NavButton
            label="Log"
            icon={<Icon type="log" />}
            active={hasCoachProposal}
            onClick={() => onOpen?.("quick-log")}
          />
        </div>
      </div>
    </div>
  );
}
