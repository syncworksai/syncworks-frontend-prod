import React from "react";

function QuickActionButton({
  title,
  subtitle,
  tone = "cyan",
  onClick,
}) {
  const toneMap = {
    cyan:
      "border-cyan-500/25 bg-cyan-500/10 hover:bg-cyan-500/14 text-cyan-100",
    fuchsia:
      "border-fuchsia-500/25 bg-fuchsia-500/10 hover:bg-fuchsia-500/14 text-fuchsia-100",
    emerald:
      "border-emerald-500/25 bg-emerald-500/10 hover:bg-emerald-500/14 text-emerald-100",
    amber:
      "border-amber-500/25 bg-amber-500/10 hover:bg-amber-500/14 text-amber-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full rounded-3xl border p-4 text-left transition ${toneMap[tone]}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold">{title}</div>

          <div className="mt-1 text-xs text-slate-300 leading-relaxed">
            {subtitle}
          </div>
        </div>

        <div className="text-lg opacity-60 group-hover:translate-x-1 transition">
          →
        </div>
      </div>
    </button>
  );
}

export default function CustomerSidebarStack({
  navigate,
  recentTickets = [],
}) {
  const activeTickets = recentTickets.filter(
    (x) =>
      !["COMPLETED", "PAID", "CANCELLED"].includes(
        String(x?.status || "").toUpperCase()
      )
  ).length;

  return (
    <div className="space-y-5">
      <div className="rounded-[2rem] border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/10 via-slate-950/60 to-slate-950/80 p-5 shadow-[0_0_60px_rgba(217,70,239,0.10)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.20em] text-fuchsia-200/70">
              Affiliate Program
            </div>

            <div className="mt-2 text-2xl font-black text-fuchsia-100">
              SW-JACOB7
            </div>
          </div>

          <div className="h-12 w-12 rounded-2xl border border-fuchsia-500/25 bg-fuchsia-500/12 flex items-center justify-center text-xl">
            🤝
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-fuchsia-500/20 bg-slate-950/40 p-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Earnings
            </div>

            <div className="mt-2 text-2xl font-black text-fuchsia-100">
              $0.00
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/40 p-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Referrals
            </div>

            <div className="mt-2 text-2xl font-black text-cyan-100">
              0
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate("/customer/affiliate")}
          className="mt-5 h-11 w-full rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/14 hover:bg-fuchsia-500/18 text-fuchsia-100 text-sm font-semibold transition"
        >
          View Portal
        </button>
      </div>

      <div className="rounded-[2rem] border border-slate-800/80 bg-slate-950/40 backdrop-blur-xl p-5 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xl font-black text-slate-100">
              Quick Actions
            </div>

            <div className="mt-1 text-sm text-slate-400">
              Fast access to your most-used tools.
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-100">
            {activeTickets} active
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <QuickActionButton
            title="+ New Request"
            subtitle="Book a new service"
            tone="cyan"
            onClick={() => navigate("/customer/new-request")}
          />

          <QuickActionButton
            title="Business Cards"
            subtitle="View saved businesses"
            tone="fuchsia"
            onClick={() => navigate("/customer/business-cards")}
          />

          <QuickActionButton
            title="Schedule"
            subtitle="View your calendar"
            tone="emerald"
            onClick={() => navigate("/customer/calendar")}
          />

          <QuickActionButton
            title="Support"
            subtitle="Get help & support"
            tone="amber"
            onClick={() => navigate("/support")}
          />
        </div>
      </div>
    </div>
  );
}