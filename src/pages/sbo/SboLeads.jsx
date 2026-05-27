import React from "react";
import { useNavigate } from "react-router-dom";
import DashboardShell from "../../components/dashboard/DashboardShell";
import GlassCard from "../../components/dashboard/GlassCard";
import SidebarNav from "../../components/dashboard/SidebarNav";
import Button from "../../components/ui/Button";

export default function SboLeads() {
  const navigate = useNavigate();

  const navItems = [
    { label: "Dashboard", icon: "⌂", onClick: () => navigate("/sbo") },
    { label: "Job Requests", icon: "▤", onClick: () => navigate("/tickets?view=new") },
    { label: "Inbox", icon: "💬", onClick: () => navigate("/inbox"), badge: "0" },
    { label: "Calendar", icon: "◷", onClick: () => navigate("/calendar") },
    { label: "Customers", icon: "◉", onClick: () => navigate("/sbo/customers") },
    { label: "Leads", icon: "◎", active: true, onClick: () => navigate("/sbo/leads") },
    { label: "Employees", icon: "👥", onClick: () => navigate("/team/invites") },
    { label: "Product Settings", icon: "⚙", onClick: () => navigate("/sbo/catalog") },
    { label: "Finance", icon: "$", onClick: () => navigate("/sbo/finance") },
    { label: "Social Media", icon: "✦", onClick: () => navigate("/sbo/growth") },
    { label: "Reports", icon: "↗", onClick: () => navigate("/sbo/reports") },
    { label: "Settings", icon: "⚙", onClick: () => navigate("/sbo/settings?return=%2Fsbo") },
  ];

  return (
    <DashboardShell
      title="Leads"
      subtitle="Social and marketplace CRM"
      modeBarTitle="Leads"
      modeBarSubtitle="Social leads • marketplace leads • website leads"
      bottomNavItems={[
        { label: "Home", icon: "⌂", onClick: () => navigate("/sbo") },
        { label: "Requests", icon: "▤", onClick: () => navigate("/tickets?view=new") },
        { label: "Customers", icon: "◉", onClick: () => navigate("/sbo/customers") },
        { label: "Settings", icon: "⚙", onClick: () => navigate("/sbo/settings?return=%2Fsbo") },
      ]}
      bottomCenterAction={{ label: "New", onClick: () => navigate("/tickets?view=new") }}
    >
      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <SidebarNav title="Business OS" subtitle="Leads CRM" items={navItems} />

        <div className="space-y-5">
          <GlassCard title="Leads CRM" subtitle="This will connect Social Media / Growth OS into a real sales pipeline." tone="fuchsia">
            <div className="grid gap-3 md:grid-cols-5">
              {["New", "Contacted", "Qualified", "Quote Sent", "Won"].map((stage) => (
                <div key={stage} className="rounded-3xl border border-slate-800 bg-slate-950/45 p-4">
                  <div className="text-xs text-slate-400">{stage}</div>
                  <div className="mt-2 text-3xl font-black text-white">0</div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-3xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-5">
              <div className="font-black text-fuchsia-100">Social Media CRM path</div>
              <div className="mt-2 text-sm text-slate-400">
                Facebook, Instagram, TikTok, QR code, website, marketplace, and manual leads will eventually flow here.
              </div>
            </div>
          </GlassCard>

          <Button tone="fuchsia" onClick={() => navigate("/sbo/growth")}>
            Open Social Media
          </Button>
        </div>
      </div>
    </DashboardShell>
  );
}