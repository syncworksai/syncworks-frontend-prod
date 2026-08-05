import React, { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { getJarvisProduct } from "../../api/jarvisProduct";
import LegacySyncAssistantLauncher from "./SyncAssistantLauncher.jsx";

export default function SyncAssistantLauncherRouter() {
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (location.pathname !== "/customer") return;
    getJarvisProduct().then(setProfile).catch(() => setProfile(null));
  }, [location.pathname]);

  if (location.pathname !== "/customer") {
    return React.createElement(LegacySyncAssistantLauncher);
  }

  return React.createElement(
    "button",
    {
      type: "button",
      onClick: () => navigate("/upgrade?product=jarvis&return=/customer"),
      className: "fixed bottom-24 right-4 z-[85] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-cyan-300/40 bg-slate-950/95 px-4 py-3 text-left shadow-[0_0_38px_rgba(34,211,238,.24)] backdrop-blur-xl lg:bottom-6 lg:right-6",
      "aria-label": "Set up User Jarvis",
    },
    React.createElement(
      "span",
      { className: "grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 text-white" },
      React.createElement(Sparkles, { className: "h-5 w-5" })
    ),
    React.createElement(
      "span",
      null,
      React.createElement("span", { className: "block text-[10px] font-black uppercase tracking-[.18em] text-cyan-200" }, "User Jarvis"),
      React.createElement("span", { className: "block text-sm font-black text-white" }, profile?.onboarding_complete ? "Manage your Jarvis" : "Set up your Jarvis"),
      React.createElement("span", { className: "block text-[11px] text-slate-400" }, profile ? `${profile.setup_score || 0}% ready · connect your life` : "Marketplace, schedule, health, work and home")
    )
  );
}
