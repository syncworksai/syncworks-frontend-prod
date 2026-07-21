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

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M14 7l5 5-5 5" />
    </svg>
  );
}

function BrandMark({ compact = false }) {
  return (
    <span className={`relative flex shrink-0 items-center justify-center rounded-2xl border border-emerald-300/35 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.10),transparent_28%),linear-gradient(145deg,#132019,#020403)] font-black italic text-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_24px_rgba(0,245,106,0.18)] ${compact ? "h-10 w-10 text-xl" : "h-11 w-11 text-2xl"}`}>
      S
      <span className="absolute bottom-1.5 h-px w-5 bg-emerald-300 shadow-[0_0_8px_rgba(0,245,106,0.8)]" />
    </span>
  );
}

const MENU_GROUPS = [
  {
    title: "Train",
    items: [
      ["Health Home", "home"],
      ["Today's Plan", "planner"],
      ["Build Workout", "plan-today"],
      ["Exercise Library", "exercise-library"],
      ["Workout History", "workout-history"],
      ["Cardio / HIIT", "cardio-player"],
    ],
  },
  {
    title: "Track",
    items: [
      ["Quick Log", "quick-log"],
      ["Nutrition", "nutrition-dashboard"],
      ["Progress", "insights"],
      ["Sleep Planner", "sleep"],
      ["Daily Goals", "daily-goals"],
    ],
  },
  {
    title: "Coach and Profile",
    items: [
      ["SYNC Coach", "coach-chat"],
      ["Build Your Profile", "profile-intake"],
      ["Devices", "devices"],
    ],
  },
];

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
    if (!hasHealthAccess || typeof window === "undefined") return;

    try {
      const completed = window.localStorage.getItem(TOUR_KEY) === "true";
      if (!completed) {
        window.localStorage.setItem(TOUR_KEY, "true");
        setHelpMode("tour");
        setHelpOpen(true);
      }
    } catch {
      // Storage may be unavailable.
    }
  }, [hasHealthAccess]);

  function closeHelp() {
    setHelpOpen(false);
  }

  function launchHelp(mode = "help") {
    setMenuOpen(false);
    setHelpMode(mode);
    setHelpOpen(true);
  }

  function navigate(target) {
    setMenuOpen(false);
    onOpen?.(target);
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
      <header className="sticky top-0 z-[90] border-b border-emerald-300/15 bg-[#020403]/96 backdrop-blur-2xl">
        <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-5">
          <button type="button" onClick={() => navigate("home")} className="group flex min-w-0 items-center gap-3 text-left">
            <BrandMark />
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-black uppercase tracking-[0.24em] text-emerald-300">SYNCWORKS</span>
              <span className="block truncate text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">FITNESS COACH</span>
            </span>
          </button>

          <div className="flex shrink-0 items-center gap-2">
            {hasHealthAccess ? (
              <button type="button" onClick={() => navigate("coach-chat")} className="hidden h-11 items-center gap-2 rounded-2xl border border-emerald-300/35 bg-emerald-300/[0.06] px-4 text-xs font-black uppercase tracking-[0.12em] text-emerald-100 shadow-[0_0_22px_rgba(0,245,106,0.10)] sm:inline-flex">
                <CoachIcon /> AI Coach
              </button>
            ) : null}

            {hasHealthAccess ? (
              <span className={`hidden rounded-xl border px-2.5 py-2 text-[9px] font-black uppercase tracking-[0.12em] md:inline-flex ${syncStatus === "error" ? "border-rose-400/25 bg-rose-400/10 text-rose-200" : "border-white/10 bg-white/[0.03] text-slate-300"}`}>
                {syncCopy[syncStatus] || "LOCAL"}
              </span>
            ) : null}

            <button type="button" onClick={() => setMenuOpen((value) => !value)} aria-label="Open Health menu" aria-expanded={menuOpen} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-slate-200 hover:border-emerald-300/35 hover:text-white">
              <MenuIcon />
            </button>

            <button type="button" onClick={onExit} aria-label="Exit Health and return to Personal Home" title="Back to SyncWorks" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-slate-200 hover:border-emerald-300/35 hover:text-white">
              <CloseIcon />
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div className="absolute right-3 top-[68px] max-h-[calc(100dvh-86px)] w-[min(25rem,calc(100vw-1.5rem))] overflow-y-auto rounded-[1.5rem] border border-emerald-300/20 bg-[#080d0a]/98 p-3 shadow-[0_28px_80px_rgba(0,0,0,0.62),0_0_40px_rgba(0,245,106,0.09)] backdrop-blur-2xl sm:right-5">
            <div className="flex items-center gap-3 px-2 pb-3 pt-1">
              <BrandMark compact />
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">HEALTH MENU</div>
                <div className="mt-1 text-xs text-slate-400">Everything in your fitness app.</div>
              </div>
            </div>

            <div className="space-y-4">
              {MENU_GROUPS.map((group) => (
                <section key={group.title} className="rounded-2xl border border-white/[0.07] bg-black/20 p-2">
                  <div className="px-2 pb-2 pt-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{group.title}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map(([label, target]) => (
                      <button key={target} type="button" onClick={() => navigate(target)} className={`min-h-11 rounded-xl border px-3 py-2.5 text-left text-xs font-black ${target === "coach-chat" ? "border-emerald-300/30 bg-emerald-300/[0.07] text-emerald-100" : "border-white/10 bg-white/[0.025] text-white hover:border-emerald-300/30"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => launchHelp("help")} className="h-11 rounded-xl border border-white/10 bg-white/[0.025] px-3 text-left text-xs font-black text-white hover:border-emerald-300/30">Help Center</button>
              <button type="button" onClick={() => launchHelp("tour")} className="h-11 rounded-xl border border-white/10 bg-white/[0.025] px-3 text-left text-xs font-black text-white hover:border-emerald-300/30">Replay Tour</button>
            </div>

            <button type="button" onClick={onExit} className="mt-2 flex h-12 w-full items-center justify-between rounded-xl border border-white/10 bg-black/35 px-4 text-sm font-black text-slate-200 hover:border-emerald-300/30 hover:text-white">
              <span>Back to SyncWorks</span>
              <ArrowIcon />
            </button>
          </div>
        ) : null}
      </header>

      <HealthHelpCenter open={helpOpen} onClose={closeHelp} initialMode={helpMode} key={`${helpMode}-${helpOpen}`} />
    </>
  );
}
