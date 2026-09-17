import React from "react";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";

import Connect from "./Connect";

export default function ConnectSportsBridge() {
  const navigate = useNavigate();
  return (
    <div className="relative">
      <Connect />
      <button
        type="button"
        onClick={() => navigate("/connect/sports")}
        className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] right-3 z-[70] flex min-h-12 items-center gap-2 rounded-full border border-cyan-300/25 bg-[#07111f]/95 px-4 text-xs font-black text-cyan-100 shadow-2xl shadow-black/50 backdrop-blur-xl sm:right-5"
        aria-label="Open Teams and Clubs"
      >
        <Users className="h-4 w-4 text-cyan-300" />
        Teams & Clubs
      </button>
    </div>
  );
}
