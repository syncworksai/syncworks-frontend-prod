import React from "react";
import CustomerAffiliateProgramCard from "./CustomerAffiliateProgramCard";
import DashboardCard from "./DashboardCard";

export default function CustomerSidebarStack({
  navigate,
  recentTickets = [],
}) {
  return (
    <div className="space-y-4">
      <CustomerAffiliateProgramCard
        onOpen={() => navigate("/customer/affiliate")}
      />

      <DashboardCard title="Quick Stats">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/8 p-4">
            <div className="text-xs text-cyan-200/80 uppercase tracking-[0.18em]">
              Requests
            </div>
            <div className="mt-2 text-2xl font-black text-cyan-100">
              {recentTickets.length}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-4">
            <div className="text-xs text-emerald-200/80 uppercase tracking-[0.18em]">
              Active
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-100">
              {
                recentTickets.filter(
                  (x) =>
                    !["COMPLETED", "PAID", "CANCELLED"].includes(
                      String(x?.status || "").toUpperCase()
                    )
                ).length
              }
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate("/customer/new-request")}
          className="mt-4 w-full h-11 rounded-2xl border border-cyan-500/30 bg-cyan-500/12 hover:bg-cyan-500/18 text-cyan-100 text-sm font-semibold"
        >
          + Create New Request
        </button>
      </DashboardCard>

      <DashboardCard title="Business Network">
        <div className="text-sm text-slate-400 leading-relaxed">
          Connect with trusted local providers, save favorites, and build your preferred business network.
        </div>

        <button
          type="button"
          onClick={() => navigate("/customer/business-cards")}
          className="mt-4 w-full h-11 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/12 hover:bg-fuchsia-500/18 text-fuchsia-100 text-sm font-semibold"
        >
          Open Business Cards
        </button>
      </DashboardCard>
    </div>
  );
}