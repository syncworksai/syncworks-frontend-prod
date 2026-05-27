import React from "react";
import { useNavigate } from "react-router-dom";
import DashboardShell from "../../components/dashboard/DashboardShell";
import GlassCard from "../../components/dashboard/GlassCard";
import SidebarNav from "../../components/dashboard/SidebarNav";
import Button from "../../components/ui/Button";

export default function SboReports() {
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
    { label: "Finance", icon: "$", onClick: () => navigate("/sbo/finance") },
    { label: "Social Media", icon: "✦", onClick: () => navigate("/sbo/growth") },
    { label: "Reports", icon: "↗", active: true, onClick: () => navigate("/sbo/reports") },
    { label: "Settings", icon: "⚙", onClick: () => navigate("/sbo/settings?return=%2Fsbo") },
  ];

  return (
    <DashboardShell
      title="Reports"
      subtitle="Performance, marketplace rank, finance, and operational reports"
      modeBarTitle="Reports"
      modeBarSubtitle="Business reporting center"
      bottomNavItems={[
        { label: "Home", icon: "⌂", onClick: () => navigate("/sbo") },
        { label: "Requests", icon: "▤", onClick: () => navigate("/tickets?view=new") },
        { label: "Leads", icon: "◎", onClick: () => navigate("/sbo/leads") },
        { label: "Settings", icon: "⚙", onClick: () => navigate("/sbo/settings?return=%2Fsbo") },
      ]}
      bottomCenterAction={{ label: "New", onClick: () => navigate("/tickets?view=new") }}
    >
      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <SidebarNav title="Business OS" subtitle="Reports" items={navItems} />

        <div className="space-y-5">
          <GlassCard title="Reports Center" subtitle="Centralized reporting for the business." tone="indigo">
            <div className="grid gap-3 md:grid-cols-3">
              <button onClick={() => navigate("/sbo/metrics/zip")} className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-5 text-left">
                <div className="text-sm font-black text-cyan-100">ZIP Rank</div>
                <div className="mt-2 text-xs text-slate-400">Marketplace performance by ZIP.</div>
              </button>

              <button onClick={() => navigate("/sbo/finance")} className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-left">
                <div className="text-sm font-black text-emerald-100">Finance</div>
                <div className="mt-2 text-xs text-slate-400">Collected, due, fees, and invoices.</div>
              </button>

              <button onClick={() => navigate("/sbo/leads")} className="rounded-3xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-5 text-left">
                <div className="text-sm font-black text-fuchsia-100">Leads</div>
                <div className="mt-2 text-xs text-slate-400">Social and marketplace lead reports.</div>
              </button>
            </div>
          </GlassCard>

          <Button tone="cyan" onClick={() => navigate("/sbo/metrics/zip")}>
            Open ZIP leaderboard
          </Button>
        </div>
      </div>
    </DashboardShell>
  );
}