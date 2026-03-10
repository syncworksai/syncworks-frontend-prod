// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

/**
 * Generic auth gate:
 * - While booting: show loading screen (prevents flicker/blank)
 * - If not authed: redirect to /login and preserve return path
 * - If authed: render children
 */
export default function ProtectedRoute({ children }) {
  const { booting, user } = useAuth();
  const location = useLocation();

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/80 bg-[#020617]">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return children;
}
