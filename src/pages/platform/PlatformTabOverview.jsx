// src/components/platform/PlatformTabOverview.jsx
import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

function n(x) {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
}

function GlassCard({ title, children }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 backdrop-blur p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="font-semibold tracking-tight">{title}</div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Mini({ title, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-xs text-slate-300/80">{title}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}

export default function PlatformTabOverview({ kpis, chartData, money }) {
  if (!kpis) {
    return (
      <div className="space-y-6">
        <div className="text-slate-300">Loading…</div>
      </div>
    );
  }

  const roleCounts =
    kpis.role_counts && typeof kpis.role_counts === "object" ? kpis.role_counts : {};

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-3 gap-4">
        <GlassCard title="Growth">
          <div className="grid grid-cols-2 gap-3">
            <Mini title="Signups (30d)" value={n(kpis.signups_last_30_days)} />
            <Mini title="Users Total" value={n(kpis.users_total)} />
            <Mini title="Businesses Total" value={n(kpis.businesses_total)} />
            <Mini title="Card on File" value={n(kpis.businesses_with_card_on_file)} />
          </div>
          <div className="mt-4 text-xs text-slate-300/80">
            Role mix:{" "}
            <span className="font-mono">
              {Object.keys(roleCounts).length ? JSON.stringify(roleCounts) : "n/a"}
            </span>
          </div>
        </GlassCard>

        <GlassCard title="Revenue">
          <div className="grid grid-cols-2 gap-3">
            <Mini title="GMV (7d)" value={money(n(kpis.gmv_7d))} />
            <Mini title="GMV (30d)" value={money(n(kpis.gmv_30d))} />
            <Mini title="Fee Collected (30d)" value={money(n(kpis.platform_fee_collected_30d))} />
            <Mini title="Fee Due (30d)" value={money(n(kpis.platform_fee_due_30d))} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Mini title="GMV (MTD)" value={money(n(kpis.gmv_mtd))} />
            <Mini title="GMV (YTD)" value={money(n(kpis.gmv_ytd))} />
          </div>
        </GlassCard>

        <GlassCard title="Billing Risk">
          <div className="grid grid-cols-2 gap-3">
            <Mini title="Locked Businesses" value={n(kpis.businesses_locked)} />
            <Mini title="Expired Cards" value={n(kpis.cards_expired)} />
            <Mini title="Expiring 30d" value={n(kpis.cards_expiring_30)} />
            <Mini title="Expiring 7d" value={n(kpis.cards_expiring_7)} />
          </div>
          <div className="mt-3 text-xs text-slate-300/80">
            Goal: warn at 30/15/7/1, auto-lock on expired.
          </div>
        </GlassCard>
      </div>

      <GlassCard title="Growth chart (last 30 days)">
        <div className="h-72">
          {chartData?.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dateShort" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="signups" />
                <Line type="monotone" dataKey="businesses_created" />
                <Line type="monotone" dataKey="locked_businesses" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-sm text-slate-300/70">No chart data yet.</div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}