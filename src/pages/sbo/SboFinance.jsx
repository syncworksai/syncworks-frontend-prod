import React from "react";
import { useNavigate } from "react-router-dom";
import DashboardShell from "../../components/dashboard/DashboardShell";
import GlassCard from "../../components/dashboard/GlassCard";
import SidebarNav from "../../components/dashboard/SidebarNav";
import Button from "../../components/ui/Button";

export default function SboFinance() {
  const navigate = useNavigate();

  const navItems = [
    { label: "Dashboard", icon: "⌂", onClick: () => navigate("/sbo") },
    { label: "Job Requests", icon: "▤", onClick: () => navigate("/tickets?view=new") },
    { label: "Inbox", icon: "💬", onClick: () => navigate("/inbox"), badge: "0" },
    { label: "Calendar", icon: "◷", onClick: () => navigate("/calendar") },
    { label: "Customers", icon: "◉", onClick: () => navigate("/sbo/customers") },
    { label: "Leads", icon: "◎", onClick: () => navigate("/sbo/leads") },
    { label: "Employees", icon: "👥", onClick: () => navigate("/team/invites") },
    { label: "Product Settings", icon: "⚙", onClick: () => navigate("/sbo/catalog") },
    { label: "Finance", icon: "$", active: true, onClick: () => navigate("/sbo/finance") },
    { label: "Social Media", icon: "✦", onClick: () => navigate("/sbo/growth") },
    { label: "Reports", icon: "↗", onClick: () => navigate("/sbo/reports") },
    { label: "Settings", icon: "⚙", onClick: () => navigate("/sbo/settings?return=%2Fsbo") },
  ];

  return (
    <DashboardShell
      title="Finance"
      subtitle="Business financials and SyncWorks fee reconciliation"
      modeBarTitle="Finance"
      modeBarSubtitle="Revenue • invoices • cash fee invoices • platform fees"
      bottomNavItems={[
        { label: "Home", icon: "⌂", onClick: () => navigate("/sbo") },
        { label: "Requests", icon: "▤", onClick: () => navigate("/tickets?view=new") },
        { label: "Reports", icon: "↗", onClick: () => navigate("/sbo/reports") },
        { label: "Settings", icon: "⚙", onClick: () => navigate("/sbo/settings?return=%2Fsbo") },
      ]}
      bottomCenterAction={{ label: "New", onClick: () => navigate("/tickets?view=new") }}
    >
      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <SidebarNav title="Business OS" subtitle="Finance" items={navItems} />

        <div className="space-y-5">
          <GlassCard title="Finance Center" subtitle="This will become the business money command center." tone="emerald">
            <div className="grid gap-3 md:grid-cols-4">
              {[
                ["Collected", "$0.00", "emerald"],
                ["Outstanding", "$0.00", "amber"],
                ["Platform Fees", "$0.00", "fuchsia"],
                ["Cash Fee Invoices", "0", "cyan"],
              ].map(([label, value, tone]) => (
                <div key={label} className="rounded-3xl border border-slate-800 bg-slate-950/45 p-5">
                  <div className="text-xs text-slate-400">{label}</div>
                  <div className="mt-2 text-3xl font-black text-white">{value}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5">
              <div className="font-black text-emerald-100">External payment reconciliation</div>
              <div className="mt-2 text-sm text-slate-400">
                Cash, Zelle, Venmo, Cash App, check, Clover, Square, and other POS payments should still close invoices inside SyncWorks so the 1% platform fee is tracked.
              </div>
            </div>
          </GlassCard>

          <Button tone="emerald" onClick={() => navigate("/billing/cash-fee-invoices")}>
            Open cash fee invoices
          </Button>
        </div>
      </div>
    </DashboardShell>
  );
}