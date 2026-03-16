import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function SalesModeGate({ children }) {
  const loc = useLocation();
  const nav = useNavigate();
  const { mode, setMode, isGod, moduleAccess } = useAuth();

  const onSalesPath = String(loc.pathname || "").startsWith("/sales");
  const allowed = isGod || !!moduleAccess?.sales;
  const ready = isGod || !!moduleAccess?.checked;

  useEffect(() => {
    if (!onSalesPath) return;
    if (!ready) return;

    if (!allowed) {
      const from = `${loc.pathname || "/sales"}${loc.search || ""}`;
      nav(`/upgrade?return=${encodeURIComponent(from)}`, { replace: true });
      return;
    }

    if (mode !== "SALES") {
      setMode("SALES");
    }
  }, [allowed, loc.pathname, loc.search, mode, nav, onSalesPath, ready, setMode]);

  if (onSalesPath && !ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617] text-slate-200">
        Loading Sales OS…
      </div>
    );
  }

  return children;
}