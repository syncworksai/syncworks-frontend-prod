// src/components/customer-health/HealthAppHeader.jsx
import React, { useState } from "react";

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function BrandMark() {
  return (
    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-300/45 bg-[#050914] font-black italic text-cyan-300 shadow-[0_0_20px_rgba(37,99,235,.35),inset_0_1px_0_rgba(255,255,255,.06)]">
      <span className="bg-gradient-to-br from-cyan-300 via-blue-500 to-fuchsia-500 bg-clip-text text-2xl text-transparent">S</span>
    </span>
  );
}

const ITEMS = [
  ["Health Home", "home"],
  ["Workouts", "dashboard"],
  ["Plan", "planner"],
  ["Nutrition", "nutrition-dashboard"],
  ["Progress", "insights"],
  ["SYNC Coach", "coach-chat"],
  ["Profile", "profile-intake"],
  ["Exercise Library", "exercise-library"],
  ["Workout History", "workout-history"],
  ["Cardio / HIIT", "cardio-player"],
  ["Daily Goals", "daily-goals"],
  ["Devices", "devices"],
];

export default function HealthAppHeader({ hasHealthAccess, syncStatus = "local", onExit, onOpen }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const syncCopy = {
    local: "LOCAL",
    loading: "LOADING",
    syncing: "SYNCING",
    saved: "SAVED",
    error: "SYNC ISSUE",
  };

  function navigate(target) {
    setMenuOpen(false);
    onOpen?.(target);
  }

  return (
    <header className="sticky top-0 z-[90] border-b border-blue-400/20 bg-[#030816]/96 backdrop-blur-2xl">
      <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-5">
        <button type="button" onClick={() => navigate("home")} className="flex min-w-0 items-center gap-3 text-left">
          <BrandMark />
          <span className="min-w-0">
            <span className="block truncate text-[12px] font-black uppercase tracking-[0.24em] text-cyan-200">SYNCWORKS</span>
            <span className="block truncate text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">HEALTH</span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          {hasHealthAccess ? (
            <span className={`hidden rounded-xl border px-2.5 py-2 text-[9px] font-black uppercase tracking-[0.12em] md:inline-flex ${syncStatus === "error" ? "border-rose-400/25 bg-rose-400/10 text-rose-200" : "border-blue-400/20 bg-blue-400/[0.06] text-blue-100"}`}>
              {syncCopy[syncStatus] || "LOCAL"}
            </span>
          ) : null}

          <button type="button" onClick={() => setMenuOpen((value) => !value)} aria-label="Open Health menu" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-400/[0.05] text-blue-100 hover:border-cyan-300/40">
            <MenuIcon />
          </button>
          <button type="button" onClick={onExit} aria-label="Back to SyncWorks" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-slate-200 hover:border-blue-300/35 hover:text-white">
            <CloseIcon />
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="absolute right-3 top-[68px] max-h-[calc(100dvh-86px)] w-[min(25rem,calc(100vw-1.5rem))] overflow-y-auto rounded-[1.5rem] border border-blue-400/20 bg-[#070d1b]/98 p-3 shadow-[0_28px_80px_rgba(0,0,0,.62),0_0_40px_rgba(37,99,235,.15)] backdrop-blur-2xl sm:right-5">
          <div className="mb-3 flex items-center gap-3 px-2 pt-1">
            <BrandMark />
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">HEALTH MENU</div>
              <div className="mt-1 text-xs text-slate-400">Training, nutrition, progress and SYNC.</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {ITEMS.map(([label, target]) => (
              <button key={target} type="button" onClick={() => navigate(target)} className={`min-h-11 rounded-xl border px-3 py-2.5 text-left text-xs font-black ${target === "coach-chat" ? "border-violet-400/30 bg-violet-400/[0.08] text-violet-100" : "border-white/10 bg-white/[0.025] text-white hover:border-blue-300/30"}`}>
                {label}
              </button>
            ))}
          </div>
          <button type="button" onClick={onExit} className="mt-3 h-12 w-full rounded-xl border border-white/10 bg-black/35 px-4 text-sm font-black text-slate-200 hover:border-blue-300/30 hover:text-white">
            Back to SyncWorks
          </button>
        </div>
      ) : null}
    </header>
  );
}
