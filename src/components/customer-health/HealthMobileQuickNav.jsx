// src/components/customer-health/HealthMobileQuickNav.jsx
import React from "react";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Icon({ type }) {
  const paths = {
    home: <><path d="m4 11 8-7 8 7" /><path d="M6.5 10.5V20h11v-9.5M10 20v-5h4v5" /></>,
    workouts: <><path d="M5 9h14M7 6v6M17 6v6" /><path d="M4 12h16M6 12v6M18 12v6" /></>,
    nutrition: <><path d="M12 5c2-2 5-1 6 1 1 2 0 5-2 7-2 2-3 6-4 6s-2-4-4-6c-2-2-3-5-2-7 1-2 4-3 6-1Z" /><path d="M12 5c0-2 1-3 3-4" /></>,
    profile: <><circle cx="12" cy="8" r="3" /><path d="M5 20c1-4 4-6 7-6s6 2 7 6" /></>,
  };

  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[type]}
    </svg>
  );
}

function NavButton({ label, icon, onClick, active = false }) {
  return (
    <button type="button" onClick={onClick} className={cx("flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 font-sans text-[8px] font-extrabold uppercase tracking-[0.08em] transition active:scale-[0.96]", active ? "text-cyan-200" : "text-slate-400 hover:text-white")}> 
      <span className={cx("flex h-8 w-8 items-center justify-center rounded-xl border bg-black/55", active ? "border-blue-300/55 text-cyan-200 shadow-[0_0_16px_rgba(37,99,235,.35)]" : "border-white/10 text-slate-400")}>{icon}</span>
      <span className="w-full truncate text-center leading-none">{label}</span>
    </button>
  );
}

export default function HealthMobileQuickNav({ onOpen, onOpenSync, activeView = "home" }) {
  return (
    <div data-syncworks-module-nav="health" className="fixed inset-x-0 bottom-0 z-[75] border-t border-blue-400/20 bg-[#030816]/96 px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-1.5 shadow-[0_-10px_34px_rgba(0,0,0,.72)] backdrop-blur-2xl lg:hidden">
      <div className="mx-auto max-w-md">
        <div className="grid h-[64px] grid-cols-5 items-center gap-1">
          <NavButton label="Home" icon={<Icon type="home" />} active={activeView === "home"} onClick={() => onOpen?.("home")} />
          <NavButton label="Workouts" icon={<Icon type="workouts" />} active={activeView === "dashboard"} onClick={() => onOpen?.("dashboard")} />

          <div className="relative flex h-full items-center justify-center">
            <button type="button" onClick={() => onOpenSync?.()} aria-label="Open SYNC health assistant" title="Open SYNC" className="relative flex h-[58px] w-[58px] items-center justify-center rounded-full border border-blue-300/75 bg-[#050914] shadow-[0_0_0_3px_rgba(37,99,235,.10),0_0_28px_rgba(37,99,235,.55),0_0_42px_rgba(124,58,237,.35),inset_0_0_18px_rgba(34,211,238,.12)] transition active:scale-[0.94]">
              <span className="absolute inset-1 rounded-full border border-violet-400/70" />
              <span className="bg-gradient-to-br from-cyan-300 via-blue-500 to-fuchsia-500 bg-clip-text text-3xl font-black italic text-transparent">S</span>
            </button>
            <span className="pointer-events-none absolute -bottom-1 rounded-full border border-blue-300/25 bg-[#030816]/95 px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.16em] text-cyan-200">SYNC</span>
          </div>

          <NavButton label="Nutrition" icon={<Icon type="nutrition" />} active={activeView === "nutrition"} onClick={() => onOpen?.("nutrition-dashboard")} />
          <NavButton label="Profile" icon={<Icon type="profile" />} active={activeView === "profile"} onClick={() => onOpen?.("profile-intake")} />
        </div>
      </div>
    </div>
  );
}
