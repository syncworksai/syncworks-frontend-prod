// src/components/SalesModeGate.jsx
import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function SalesModeGate({ children }) {
  const loc = useLocation();
  const { mode, setMode } = useAuth();

  useEffect(() => {
    const p = String(loc.pathname || "");
    if (!p.startsWith("/sales")) return;

    // ✅ avoid redundant writes (prevents dev StrictMode churn)
    if (mode !== "SALES") setMode("SALES");
  }, [loc.pathname, mode, setMode]);

  return <>{children}</>;
}