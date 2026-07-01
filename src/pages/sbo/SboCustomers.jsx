import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardShell from "../../components/dashboard/DashboardShell";
import GlassCard from "../../components/dashboard/GlassCard";
import SidebarNav from "../../components/dashboard/SidebarNav";
import Button from "../../components/ui/Button";
import { useAuth } from "../../auth/AuthContext";
import {
  readBusinessCustomers,
  removeBusinessCustomer,
} from "../../utils/savedCustomers";

function safeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

export default function SboCustomers() {
  const navigate = useNavigate();
  const { myBusinesses, activeBusinessId } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState("");

  const activeBusiness = useMemo(() => {
    const found = safeList(myBusinesses).find(
      (item) =>
        String(item?.id || item?.business_id || item?.business?.id || "") ===
        String(activeBusinessId || "")
    );
    return found?.business || found || null;
  }, [myBusinesses, activeBusinessId]);

  const businessId = activeBusiness?.id || activeBusiness?.business_id || activeBusinessId || "";

  useEffect(() => {
    const refresh = () => setCustomers(readBusinessCustomers(businessId));
    refresh();
    window.addEventListener("sw:businessCustomersChanged", refresh);
    return () => window.removeEventListener("sw:businessCustomersChanged", refresh);
  }, [businessId]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter((customer) =>
      [customer.name, customer.email, customer.phone, customer.city, customer.service_zip]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [customers, query]);

  const repeatCount = customers.filter((customer) => Number(customer.ticket_count || 0) > 1).length;

  const navItems = [
    { label: "Dashboard", icon: "⌂", onClick: () => navigate("/sbo") },
    { label: "Job Requests", icon: "▤", onClick: () => navigate("/tickets?view=new") },
    { label: "Inbox", icon: "💬", onClick: () => navigate("/inbox"), badge: "0" },
    { label: "Calendar", icon: "◷", onClick: () => navigate("/calendar") },
    { label: "Customers", icon: "◉", active: true, onClick: () => navigate("/sbo/customers") },
    { label: "Leads", icon: "◎", onClick: () => navigate("/sbo/leads") },
    { label: "Employees", icon: "👥", onClick: () => navigate("/team/invites") },
    { label: "Product Settings", icon: "⚙", onClick: () => navigate("/sbo/catalog") },
    { label: "Finance", icon: "$", onClick: () => navigate("/sbo/finance") },
    { label: "Social Media", icon: "✦", onClick: () => navigate("/sbo/growth") },
    { label: "Reports", icon: "↗", onClick: () => navigate("/sbo/reports") },
    { label: "Settings", icon: "⚙", onClick: () => navigate("/sbo/settings?return=%2Fsbo") },
  ];

  return (
    <DashboardShell
      title="Customers"
      subtitle={activeBusiness?.name || "Customer CRM Lite"}
      modeBarTitle="Customers"
      modeBarSubtitle="Repeat customers • saved contacts • quick ticket intake"
      bottomNavItems={[
        { label: "Home", icon: "⌂", onClick: () => navigate("/sbo") },
        { label: "Requests", icon: "▤", onClick: () => navigate("/tickets?view=new") },
        { label: "Leads", icon: "◎", onClick: () => navigate("/sbo/leads") },
        { label: "Settings", icon: "⚙", onClick: () => navigate("/sbo/settings?return=%2Fsbo") },
      ]}
      bottomCenterAction={{ label: "New Ticket", onClick: () => navigate("/sbo/new-ticket") }}
    >
      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <SidebarNav title="Business OS" subtitle="Customers" items={navItems} />

        <div className="space-y-5">
          <GlassCard title="Customer CRM Lite" subtitle="Saved automatically from business-created tickets." tone="cyan">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-5">
                <div className="text-xs text-cyan-200">Saved Customers</div>
                <div className="mt-2 text-3xl font-black text-white">{customers.length}</div>
              </div>
              <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                <div className="text-xs text-emerald-200">Repeat Customers</div>
                <div className="mt-2 text-3xl font-black text-white">{repeatCount}</div>
              </div>
              <div className="rounded-3xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-5">
                <div className="text-xs text-fuchsia-200">Recent Records</div>
                <div className="mt-2 text-3xl font-black text-white">{Math.min(customers.length, 30)}</div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email, phone, city, or ZIP"
                className="min-h-11 flex-1 rounded-2xl border border-slate-800 bg-slate-950/75 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/50"
              />
              <Button tone="cyan" onClick={() => navigate("/sbo/new-ticket")}>
                + Create customer ticket
              </Button>
            </div>
          </GlassCard>

          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((customer) => (
              <div key={customer.id} className="rounded-[1.75rem] border border-slate-800 bg-slate-950/55 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-black text-white">
                      {customer.name || "Unnamed customer"}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {customer.phone || customer.email || "No contact information"}
                    </div>
                  </div>
                  <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-black text-cyan-200">
                    {customer.ticket_count || 1} ticket{Number(customer.ticket_count || 1) === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-xs leading-5 text-slate-400">
                  {[customer.address, customer.city, customer.state, customer.service_zip]
                    .filter(Boolean)
                    .join(", ") || "No saved service address"}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => navigate("/sbo/new-ticket")}
                    className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-black text-cyan-100"
                  >
                    Create ticket
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = removeBusinessCustomer(businessId, customer.id);
                      setCustomers(next);
                    }}
                    className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs font-black text-rose-200"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {!filtered.length ? (
            <div className="rounded-[2rem] border border-dashed border-slate-700 bg-slate-950/35 p-8 text-center">
              <div className="text-3xl">👥</div>
              <div className="mt-3 text-sm font-black text-white">No saved customers yet</div>
              <div className="mt-1 text-xs leading-5 text-slate-500">
                Create a phone, text, email, or walk-in ticket and the customer will be saved automatically.
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </DashboardShell>
  );
}
