// src/components/customer-health/HealthMobileQuickNav.jsx
import React from "react";
import {
  Activity,
  Dumbbell,
  HeartPulse,
  UserRound,
  Utensils,
} from "lucide-react";

function NavButton({ icon: Icon, label, active = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[9px] font-black uppercase tracking-[.08em] transition ${
        active
          ? "bg-lime-300/[.09] text-lime-300 shadow-[inset_0_0_18px_rgba(166,255,0,.06)]"
          : "text-slate-400 active:bg-white/[.04] active:text-white"
      }`}
    >
      <Icon size={20} strokeWidth={2.1} />
      <span className="truncate">{label}</span>
    </button>
  );
}

/**
 * Health owns its mobile navigation while the user is inside the Health
 * product. iPhone Safari can report a layout viewport wider than the old
 * 767px cutoff, so Health uses the tablet/mobile cutoff (<1024px) instead.
 * Drawers and active workouts intentionally sit above this layer.
 */
export default function HealthMobileQuickNav({
  onOpen,
  activeView = "home",
}) {
  return (
    <>
      <style>{`
        @media (max-width: 1023px) {
          .health-obsidian-electric .sw-health-shell-tabs {
            display: none !important;
          }
        }
      `}</style>

      <nav
        data-syncworks-module-nav="health"
        aria-label="Health navigation"
        className="fixed inset-x-3 bottom-[calc(.6rem+env(safe-area-inset-bottom))] z-[2147481000] mx-auto grid h-[76px] max-w-[760px] grid-cols-5 gap-1 rounded-[1.55rem] border border-cyan-300/25 bg-[#020916]/[.97] p-1.5 shadow-[0_18px_55px_rgba(0,0,0,.72),inset_0_1px_0_rgba(255,255,255,.035)] backdrop-blur-2xl lg:hidden"
      >
        <NavButton
          icon={HeartPulse}
          label="Home"
          active={activeView === "home"}
          onClick={() => onOpen?.("home")}
        />
        <NavButton
          icon={Dumbbell}
          label="Workouts"
          onClick={() => onOpen?.("my-workouts")}
        />
        <NavButton
          icon={Utensils}
          label="Nutrition"
          onClick={() => onOpen?.("nutrition-dashboard")}
        />
        <NavButton
          icon={Activity}
          label="Stats"
          active={activeView === "insights" || activeView === "dashboard"}
          onClick={() => onOpen?.("progress")}
        />
        <NavButton
          icon={UserRound}
          label="You"
          onClick={() => onOpen?.("profile-intake")}
        />
      </nav>
    </>
  );
}
