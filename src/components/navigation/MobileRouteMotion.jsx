import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import "./MobileRouteMotion.css";

const SETTINGS_KEY = "sw_workspace_appearance_v1";
function readMotion() {
  try { return JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || "{}")?.motion !== false; }
  catch { return true; }
}
function mobileTransition(path) {
  if (!/^\/(customer(?:\/|$)|sync(?:\/|$)|calendar(?:\/|$)|sbo(?:\/|$)|pm(?:\/|$))/.test(path)) return "none";
  if (/^\/sync(?:\/|$)/.test(path)) return "hologram";
  if (/^\/customer\/games\/(?:table|clubs\/room|play)(?:\/|$)/.test(path)) return "none";
  return "fade-zoom";
}
export default function MobileRouteMotion({ children }) {
  const location = useLocation();
  const [enabled, setEnabled] = useState(readMotion);
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches);
  useEffect(() => {
    const sync = () => setEnabled(readMotion());
    window.addEventListener("sw:workspace-appearance", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("sw:workspace-appearance", sync); window.removeEventListener("storage", sync); };
  }, []);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const refresh = () => setMobile(query.matches);
    refresh();
    query.addEventListener("change", refresh);
    return () => query.removeEventListener("change", refresh);
  }, []);
  // The desktop route tree retains precisely its original DOM shape.
  if (!mobile) return <>{children}</>;
  const transition = enabled ? mobileTransition(location.pathname) : "none";
  // Only the routed page enters. The AI employee tray and role-aware mobile
  // navigation are outside this stage and retain their existing state.
  return <div key={location.pathname} className="sw-mobile-route-stage" data-mobile-route-motion={transition}>{children}</div>;
}
