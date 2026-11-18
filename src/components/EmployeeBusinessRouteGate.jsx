import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import api from "../api/client";

// Client-side navigation barrier only. API endpoints must separately enforce
// each permission. Fail closed if current membership cannot be verified.
const allowedPermission = (path) => {
  if (path.startsWith("/team/invites")) return "can_manage_team";
  if (!path.startsWith("/sbo")) return null;
  if (path.startsWith("/sbo/dispatch") || path.startsWith("/sbo/tech-board")) return "can_assign_tickets";
  if (path.startsWith("/sbo/appointments")) return "can_manage_schedule";
  if (path.startsWith("/sbo/invoices")) return "can_manage_invoices";
  if (path.startsWith("/sbo/finance")) return "can_view_financials";
  if (path.startsWith("/sbo/catalog")) return "can_manage_categories";
  if (path.startsWith("/sbo/settings")) return "can_manage_settings";
  return "DENY";
};

export default function EmployeeBusinessRouteGate({ children, user }) {
  const location = useLocation();
  const role = String(user?.role || "").toUpperCase();
  const permission = allowedPermission(location.pathname);
  const restricted = role === "EMPLOYEE" && permission !== null;
  const [access, setAccess] = useState("loading");
  useEffect(() => {
    if (!restricted) { setAccess("allowed"); return; }
    if (permission === "DENY") { setAccess("denied"); return; }
    let cancelled = false;
    setAccess("loading");
    api.get("/business-members/me/").then((response) => {
      if (cancelled) return;
      const list = Array.isArray(response.data) ? response.data : response.data?.results || [];
      const selected = list[0];
      setAccess(selected?.is_active && (selected?.role === "OWNER" || selected?.[permission] === true) ? "allowed" : "denied");
    }).catch(() => { if (!cancelled) setAccess("denied"); });
    return () => { cancelled = true; };
  }, [restricted, permission, location.pathname]);
  if (!restricted) return children;
  if (access === "loading") return <div className="grid min-h-[50vh] place-items-center text-sm text-slate-300">Verifying employee access…</div>;
  if (access === "denied") return <Navigate to="/employee" replace />;
  return children;
}
