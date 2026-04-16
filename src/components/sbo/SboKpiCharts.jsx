import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="font-semibold text-slate-100">{title}</div>
      {subtitle ? <div className="text-xs text-slate-400 mt-1">{subtitle}</div> : null}
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function SboKpiCharts({ loading, chartData = [] }) {
  return (
    <div className="grid gap-4">
      <ChartCard
        title="Revenue Trend"
        subtitle="Paid revenue over the last 30 days"
      >
        <div className="h-72">
          {loading ? (
            <div className="text-sm text-slate-400">Loading…</div>
          ) : chartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#22d3ee"
                  fill="#22d3ee33"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-sm text-slate-400">No revenue chart data yet.</div>
          )}
        </div>
      </ChartCard>

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard
          title="Jobs + Tickets"
          subtitle="Completed jobs and open tickets by day"
        >
          <div className="h-72">
            {loading ? (
              <div className="text-sm text-slate-400">Loading…</div>
            ) : chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="completedJobs" stroke="#34d399" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="openTickets" stroke="#f472b6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-slate-400">No job chart data yet.</div>
            )}
          </div>
        </ChartCard>

        <ChartCard
          title="Invoices + Paid Tickets"
          subtitle="Invoice/payment activity over time"
        >
          <div className="h-72">
            {loading ? (
              <div className="text-sm text-slate-400">Loading…</div>
            ) : chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="paidInvoices" stroke="#a78bfa" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="paidTickets" stroke="#fbbf24" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-slate-400">No invoice chart data yet.</div>
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}