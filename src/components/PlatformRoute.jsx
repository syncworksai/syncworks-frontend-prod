// src/components/PlatformRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function PlatformRoute({ children }) {
  const {
    booting,
    isAuthed,
    isPlatformAdmin,
  } = useAuth();

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

  return children;
}