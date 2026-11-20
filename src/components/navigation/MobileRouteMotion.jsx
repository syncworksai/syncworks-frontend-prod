import React, { useEffect, useRef, useState } from "react";
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
  const previousRoute=useRef(location.pathname);
  useEffect(() => {
    const sync = () => setEnabled(readMotion());
    window.addEventListener("sw:workspace-appearance", sync);
    window.addEventListener("storage", sync);
    return () => {window.removeEventListener("sw:workspace-appearance", sync);window.removeEventListener("storage", sync);};
  }, []);
  const currentPath=location.pathname;
  const previousPath=previousRoute.current;
  const isSbo=currentPath==="/sbo"||currentPath.startsWith("/sbo/");
  const wasSbo=previousPath==="/sbo"||previousPath.startsWith("/sbo/");
  const depth=path=>path.split("/").filter(Boolean).length;
  const businessMotion=isSbo&&wasSbo
    ? depth(currentPath)>depth(previousPath)?"sbo-forward"
      :depth(currentPath)<depth(previousPath)?"sbo-back":"sbo-peer"
    :"sbo-peer";
  useEffect(()=>{previousRoute.current=location.pathname;},[location.pathname]);
  const transition=enabled ? isSbo ? businessMotion : routeTransition(currentPath) : "none";
  // Animate only routed pages. Global navigation / AI dock / alerts remain
  // outside the stage, so they never animate or lose state.
  return <div key={location.pathname} className="sw-mobile-route-stage" data-mobile-route-motion={transition}>{children}</div>;
}
