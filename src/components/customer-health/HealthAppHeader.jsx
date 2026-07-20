// src/components/customer-health/HealthAppHeader.jsx
import React, { useEffect, useState } from "react";
import HealthHelpCenter from "./HealthHelpCenter";

const TOUR_KEY = "syncworks.health.onboarding.v1.completed";

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CoachIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M4 12h2l2-5 3 10 2-7 2 4h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function HealthAppHeader({
  hasHealthAccess,
  syncStatus = "local",
  onExit,
  onOpen,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpMode, setHelpMode] = useState("help");

  useEffect(() => {
    if (!hasHealthAccess) return;
    try {
      if (window.localStorage.getItem(TOUR_KEY) !== "true") {
        setHelpMode("tour");
        setHelpOpen(true);
      }
    } catch {
      // Local storage can be unavailable in private browsing.
    }
  }, [hasHealthAccess]);

  function closeHelp() {
    setHelpOpen(false);
    try {
      window.localStorage.setItem(TOUR_KEY, "true");
    } catch {
      // Keep onboarding usable even when persistence is unavailable.
    }
  }

  function launchHelp(mode = "help") {
    setMenuOpen(false);
    setHelpMode(mode);
    setHelpOpen(true);
  }

  const syncCopy = {
    local: "LOCAL",
    loading: "LOADING",
    syncing: "SYNCING",
    saved: "SAVED",
    error: "SYNC ISSUE",
  };

  return (
    <>
      <header className="sticky top-0 z-[90] border-b border-emerald-300/15 bg-[#020403]/95 backdrop-blur-2xl">
        <div className="mx-auto flex min-h-[74px] max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-5">
          <button type="button" onClick={() => onOpen?.("home")} className="group flex min-w-0 items-center gap-3 text-left">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/30 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.14),transparent_28%),linear-gradient(145deg,rgba(0,245,106,0.18),rgba(3,8,5,0.98))] shadow-[0_0_22px_rgba(0,245,106,0.16)]">
              <img src="/health/brand/syncworks-start-logo.png" alt="" className="h-9 w-9 object-contain" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-black uppercase tracking-[0.24em] text-emerald-300">SYNCWORKS</span>
              <span className="block truncate text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">FITNESS COACH</span>
            </span>
          </button>

          <div className="flex shrink-0 items-center gap-2">
            {hasHealthAccess ? (
              <button type="button" onClick={() => onOpen?.("coach-chat")} className="hidden h-11 items-center gap-2 rounded-2xl border border-emerald-300/40 bg-emerald-300/[0.07] px-4 text-xs font-black uppercase tracking-[0.12em] text-emerald-100 shadow-[0_0_22px_rgba(0,245,106,0.12)] sm:inline-flex">
                <CoachIcon /> AI Coach
              </button>
            ) : null}

            {hasHealthAccess ? (
              <span className={`hidden rounded-xl border px-2.5 py-2 text-[9px] font-black uppercase tracking-[0.12em] md:inline-flex ${syncStatus === "error" ? "border-rose-400/25 bg-rose-400/10 text-rose-200" : "border-emerald-300/20 bg-emerald-300/[0.05] text-emerald-200"}`}>
                {syncCopy[syncStatus] || "LOCAL"}
              </span>
            ) : null}

            <button type="button" onClick={() => setMenuOpen((value) => !value)} aria-label="Open Health menu" aria-expanded={menuOpen} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-slate-200 hover:border-emerald-300/35 hover:text-white">
              <MenuIcon />
            </button>

            <button type="button" onClick={onExit} aria-label="Exit Health and return to Personal Home" title="Back to SyncWorks" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-2xl font-light leading-none text-slate-200 hover:border-emerald-300/35 hover:text-white">
              Ã—
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div className="absolute right-3 top-[68px] w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.5rem] border border-emerald-300/20 bg-[#080d0a]/98 p-2 shadow-[0_28px_80px_rgba(0,0,0,0.58),0_0_40px_rgba(0,245,106,0.10)] backdrop-blur-2xl sm:right-5">
            <div className="px-3 pb-2 pt-3">
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">HEALTH MENU</div>
              <div className="mt-1 text-sm text-slate-400">Navigate Health or return to SyncWorks.</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setMenuOpen(false); onOpen?.("home"); }} className="h-12 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-left text-sm font-black text-white hover:border-emerald-300/30">Health Home</button>
              <button type="button" onClick={() => { setMenuOpen(false); onOpen?.("planner"); }} className="h-12 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-left text-sm font-black text-white hover:border-emerald-300/30">Workouts</button>
              <button type="button" onClick={() => { setMenuOpen(false); onOpen?.("insights"); }} className="h-12 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-left text-sm font-black text-white hover:border-emerald-300/30">Progress</button>
              <button type="button" onClick={() => { setMenuOpen(false); onOpen?.("coach-chat"); }} className="h-12 rounded-xl border border-emerald-300/25 bg-emerald-300/[0.06] px-3 text-left text-sm font-black text-emerald-100">SYNC Coach</button>
              <button type="button" onClick={() => launchHelp("help")} className="h-12 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-left text-sm font-black text-white hover:border-emerald-300/30">Help Center</button>
              <button type="button" onClick={() => launchHelp("tour")} className="h-12 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-left text-sm font-black text-white hover:border-emerald-300/30">Replay Tour</button>
            </div>

            <button type="button" onClick={onExit} className="mt-2 flex h-12 w-full items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 text-sm font-black text-slate-200 hover:border-emerald-300/30 hover:text-white">
              <span>Back to SyncWorks</span>
              <span aria-hidden="true">â†’</span>
            </button>
          </div>
        ) : null}
      </header>

      <HealthHelpCenter open={helpOpen} onClose={closeHelp} initialMode={helpMode} key={`${helpMode}-${helpOpen}`} />
    </>
  );
}
