import React from "react";
import { useNavigate } from "react-router-dom";
import DashboardShell from "../../components/dashboard/DashboardShell";
import GlassCard from "../../components/dashboard/GlassCard";
import SidebarNav from "../../components/dashboard/SidebarNav";
import Button from "../../components/ui/Button";

export default function SboCustomers() {
  const navigate = useNavigate();

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
      subtitle="Customer CRM Lite"
      modeBarTitle="Customers"
      modeBarSubtitle="Repeat customers • saved customers • service history"
      bottomNavItems={[
        { label: "Home", icon: "⌂", onClick: () => navigate("/sbo") },
        { label: "Requests", icon: "▤", onClick: () => navigate("/tickets?view=new") },
        { label: "Leads", icon: "◎", onClick: () => navigate("/sbo/leads") },
        { label: "Settings", icon: "⚙", onClick: () => navigate("/sbo/settings?return=%2Fsbo") },
      ]}
      bottomCenterAction={{ label: "New", onClick: () => navigate("/tickets?view=new") }}
    >
      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <SidebarNav title="Business OS" subtitle="Customers" items={navItems} />

        <div className="space-y-5">
          <GlassCard title="Customer CRM Lite" subtitle="This will become the saved/repeat customer command center." tone="cyan">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-5">
                <div className="text-xs text-cyan-200">Saved Customers</div>
                <div className="mt-2 text-3xl font-black text-white">0</div>
              </div>
              <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                <div className="text-xs text-emerald-200">Repeat Customers</div>
                <div className="mt-2 text-3xl font-black text-white">0</div>
              </div>
              <div className="rounded-3xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-5">
                <div className="text-xs text-fuchsia-200">Lifetime Value</div>
                <div className="mt-2 text-3xl font-black text-white">$0.00</div>
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-slate-800 bg-slate-950/45 p-5">
              <div className="font-black text-white">Coming next</div>
              <div className="mt-2 text-sm text-slate-400">
                Customer profiles, service history, last job date, notes, tags, follow-up reminders, and review request automation.
              </div>
            </div>
          </GlassCard>

          <Button tone="cyan" onClick={() => navigate("/tickets?view=customers")}>
            View customer-related tickets
          </Button>
        </div>
      </div>
    </DashboardShell>
  );
}