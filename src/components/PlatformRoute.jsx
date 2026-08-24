// src/components/PlatformRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import GodModeCompanyOperations from "../pages/GodModeCompanyOperations";
import GlobalModeBar from "./navigation/GlobalModeBar";

const GOD_MODE_EMAIL = "jacoblord7@outlook.com";

export default function PlatformRoute({ children }) {
  const { booting, isAuthed, user } = useAuth();
  const location = useLocation();

  if (booting) {
    return <div className="flex min-h-screen items-center justify-center bg-[#020617] text-slate-100">Loading...</div>;
  }

  if (!isAuthed) return <Navigate to="/login" replace />;

  const email = String(user?.email || "").trim().toLowerCase();
  const isGodMode = email === GOD_MODE_EMAIL;
  if (!isGodMode) return <Navigate to="/customer" replace />;

  const isGodModeHome = location.pathname === "/platform" && !new URLSearchParams(location.search).has("tab");

  return <><GlobalModeBar />{isGodModeHome ? <GodModeCompanyOperations /> : children}</>;
}
