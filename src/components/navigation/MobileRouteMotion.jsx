import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import "./MobileRouteMotion.css";

const SETTINGS_KEY = "sw_workspace_appearance_v1";
function readMotion() {
  try { return JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || "{}")?.motion !== false; }
  catch { return true; }
}
function routeTransition(path) {
  // The app-level motion system applies to every signed-in page, including
  // New Request, Inbox, profile, settings and routes opened from the hamburger.
  // Keep authentication, invite links, live cards/tables and real-time score
  // interfaces instant to avoid interrupting active interaction.
  if (/^\/(?:login|register|forgot-password|reset-password|onboarding|employee\/invite|accept-invite|gamecast|sports\/invite|sports\/team-invite|social\/invite)(?:\/|$)/.test(path)) return "none";
  if (/^\/customer\/games\/(?:table|clubs\/room|play)(?:\/|$)/.test(path)) return "none";
  if (/^\/connect\/groups\/[^/]+\/sports\/games\//.test(path)) return "none";
  if (/^\/sync(?:\/|$)/.test(path)) return "hologram";
  return "fade-zoom";
}
export default function MobileRouteMotion({ children }) {
  const location = useLocation();
  const [enabled, setEnabled] = useState(readMotion);
  useEffect(() => {
    const sync = () => setEnabled(readMotion());
    window.addEventListener("sw:workspace-appearance", sync);
    window.addEventListener("storage", sync);
    return () => {window.removeEventListener("sw:workspace-appearance", sync);window.removeEventListener("storage", sync);};
  }, []);
  const transition = enabled ? routeTransition(location.pathname) : "none";
  // Animate only routed pages. Global navigation / AI dock / alerts remain
  // outside the stage, so they never animate or lose state.
  return <div key={location.pathname} className="sw-mobile-route-stage" data-mobile-route-motion={transition}>{children}</div>;
}
