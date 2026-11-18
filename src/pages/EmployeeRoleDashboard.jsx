import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

const actions = [
  ["can_create_tickets", "Technician team board", "/employee/technicians", "See assigned jobs, report status, and request handoffs"],
  ["can_create_tickets", "My tickets", "/tickets", "View the tickets assigned to you"],
  ["can_assign_tickets", "Dispatch board", "/sbo/dispatch", "Assign and coordinate service"],
  ["can_manage_schedule", "Schedule", "/sbo/appointments", "Coordinate appointments"],
  ["can_manage_invoices", "Invoices", "/sbo/invoices", "Manage billing documents"],
  ["can_view_financials", "Financials", "/sbo/finance", "Review business finances"],
  ["can_manage_properties", "Properties", "/pm", "Manage authorized properties"],
  ["can_manage_team", "Employees", "/team/invites", "Manage team access"],
  ["can_manage_settings", "Business settings", "/sbo/settings", "Update business configuration"],
  ["can_manage_categories", "Services", "/sbo/catalog", "Manage the service catalog"],
  ["can_manage_connections", "Connections", "/sbo/settings", "Manage business integrations"],
];
const labels = {TECHNICIAN: "Technician", TECH: "Technician", DISPATCH: "Dispatch", ACCOUNTING: "Accounting", MANAGER: "Manager", OWNER: "Owner", ADMIN: "Administrator"};

export default function EmployeeRoleDashboard() {
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/business-members/me/");
      const memberships = Array.isArray(res.data) ? res.data : res.data?.results || [];
      const selectedId = String(localStorage.getItem("sw_active_business_id") || "").trim();
      const active = memberships.find((m) => String(m.business) === selectedId);
      if (!active) {
        setMembership(null);
        setError("No active membership found for the selected business. Select the business you work for or ask its owner to verify your invite.");
      } else {
        setMembership(active);
      }
    } catch (err) {
      setMembership(null);
      setError(err?.response?.data?.detail || "Unable to verify employee permissions. Access is unavailable until verification succeeds.");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const role = String(membership?.role || "TECHNICIAN").toUpperCase();
  const name = [membership?.user_first_name, membership?.user_last_name].filter(Boolean).join(" ") || membership?.user_name || membership?.user_email || "Employee";
  const allowed = membership ? actions.filter(([key]) => membership[key] === true) : [];
  return (
    <main className="mx-auto flex h-[calc(100dvh-100px)] min-h-0 w-full max-w-6xl flex-col gap-3 overflow-hidden px-4 py-4 text-slate-100">
      <header className="flex items-center justify-between gap-3">
        <div><p className="text-xs text-cyan-200">SYNCWORKS / EMPLOYEE OFFICE</p><h1 className="text-xl font-bold">{loading ? "Verifying access…" : name}</h1><p className="text-xs text-slate-400">{labels[role] || role} · Your available work tools</p></div>
        <button onClick={load} className="rounded-xl border border-cyan-400/30 px-3 py-2 text-sm">Refresh access</button>
      </header>
      {error && <p role="alert" className="rounded-xl border border-amber-500/30 p-3 text-sm text-amber-200">{error}</p>}
      {!loading && membership && (
        <section className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-cyan-400/25 bg-slate-950/50 p-4">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Your workspace</h2><span className="text-xs text-slate-400">{allowed.length} available tools</span></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {allowed.map(([key, title, path, description]) => <Link key={key} to={path} className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-4 hover:border-cyan-400/50"><div className="font-semibold">{title}</div><p className="mt-1 text-xs text-slate-400">{description}</p></Link>)}
          </div>
          {allowed.length === 0 && <p className="text-sm text-slate-400">No business tools are enabled for your account. Contact your manager.</p>}
          <p className="mt-5 text-xs text-slate-500">Permissions are set by the business owner. Changing the role label alone does not grant access.</p>
        </section>
      )}
    </main>
  );
}
