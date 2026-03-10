// src/components/PlatformRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function PlatformRoute({ children }) {
  const { booting, isAuthed, isGod } = useAuth();

  if (booting) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-100 flex items-center justify-center">
        Loading…
      </div>
    );
  }

  if (!isAuthed) return <Navigate to="/login" replace />;

  // ✅ Only Jacob can access platform routes
  if (!isGod) return <Navigate to="/customer" replace />;

  return children;
}