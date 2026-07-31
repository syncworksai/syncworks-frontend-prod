// src/components/PlatformRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import GodModeDashboard from "../pages/GodModeDashboard";

export default function PlatformRoute({ children }) {
  const {
    booting,
    isAuthed,
    isPlatformAdmin,
  } = useAuth();
  const location = useLocation();

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617] text-slate-100">
        Loading...
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (!isPlatformAdmin) {
    return (
      <Navigate
        to="/customer"
        replace
      />
    );
  }

  const isGodModeHome =
    location.pathname === "/platform" &&
    !new URLSearchParams(location.search).has("tab");

  if (isGodModeHome) {
    return <GodModeDashboard />;
  }

  return children;
}
