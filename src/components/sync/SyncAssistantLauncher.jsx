import React from "react";
import { Mic } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const HIDDEN_PREFIXES = [
  "/login",
  "/register",
  "/employee/invite",
  "/accept-invite",
];

export default function SyncAssistantLauncher() {
  const location = useLocation();
  const navigate = useNavigate();

  if (
    location.pathname === "/sync" ||
    HIDDEN_PREFIXES.some((prefix) => location.pathname.startsWith(prefix))
  ) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() =>
        navigate(`/sync?return=${encodeURIComponent(location.pathname)}`)
      }
      className="fixed bottom-24 right-4 z-[80] grid h-14 w-14 place-items-center rounded-full border border-cyan-200/50 bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 text-white shadow-[0_0_34px_rgba(34,211,238,0.42)] transition hover:scale-105 lg:bottom-6 lg:right-6"
      aria-label="Open SYNC assistant"
      title="Open SYNC"
    >
      <Mic aria-hidden="true" className="h-6 w-6" />
      <span className="absolute -bottom-5 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100">
        SYNC
      </span>
    </button>
  );
}
