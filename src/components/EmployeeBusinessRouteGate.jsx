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
  const permission = allowedPermission(location.pathname);
  const restricted = permission !== null;
  const [access, setAccess] = useState("loading");

  useEffect(() => {
    if (!restricted) { setAccess("allowed"); return; }
    let cancelled = false;
    setAccess("loading");
    const verify = async () => {
      try {
        const businessId = String(localStorage.getItem("sw_active_business_id") || "").trim();
        if (!businessId) { if (!cancelled) setAccess("denied"); return; }
        const businessRes = await api.get(`/businesses/${businessId}/`);
        const actualOwner = String(businessRes.data?.owner) === String(user?.id);
        if (actualOwner) { if (!cancelled) setAccess("allowed"); return; }
        if (permission === "DENY") { if (!cancelled) setAccess("denied"); return; }
        // A global SBO profile is not proof that this user owns this business.
        // Evaluate explicit permission flags for their selected membership.
        const memberRes = await api.get("/business-members/me/");
        const memberships = Array.isArray(memberRes.data) ? memberRes.data : memberRes.data?.results || [];
        const selected = memberships.find(m => String(m.business) === businessId);
        if (!cancelled) setAccess(selected?.is_active === true && selected?.[permission] === true ? "allowed" : "denied");
      } catch {
        if (!cancelled) setAccess("denied");
      }
    };
    verify();
    return () => { cancelled = true; };
  }, [restricted, permission, location.pathname, user?.id]);
  if (!restricted) return children;
  if (access === "loading") return <div className="grid min-h-[50vh] place-items-center text-sm text-slate-300">Verifying business access…</div>;
  if (access === "denied") return <Navigate to="/employee" replace />;
  return children;
}
