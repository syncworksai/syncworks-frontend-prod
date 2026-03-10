// src/components/platform/PlatformOverviewTab.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function money(cents) {
  const n = Number(cents || 0);
  const dollars = n / 100;
  return dollars.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function GlassCard({ title, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold tracking-tight text-slate-100">{title}</div>
        {right ? <div className="text-xs text-slate-400">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Mini({ title, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
      <div className="text-xs text-slate-400">{title}</div>
      <div className="text-xl font-extrabold mt-1 text-slate-100">{value}</div>
      {hint ? <div className="text-[11px] text-slate-500 mt-1">{hint}</div> : null}
    </div>
  );
}

function Badge({ tone = "slate", children }) {
  const tones = {
    slate: "bg-slate-500/10 border-slate-500/20 text-slate-200",
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-200",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-200",
    red: "bg-red-500/10 border-red-500/20 text-red-200",
    cyan: "bg-cyan-500/10 border-cyan-500/20 text-cyan-200",
  };
  return (
    <span className={cx("text-[11px] px-2 py-1 rounded-full border", tones[tone] || tones.slate)}>
      {children}
    </span>
  );
}

function toneForStatus(status) {
  const s = String(status || "").toUpperCase();
  if (s === "RED") return "red";
  if (s === "YELLOW") return "amber";
  if (s === "GREEN") return "emerald";
  return "slate";
}

export default function PlatformOverviewTab() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [kpis, setKpis] = useState(null);
  const [alerts, setAlerts] = useState(null);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        api.get("/platform/metrics/summary/?days=30"),
        api.get("/platform/metrics/alerts/"),
      ]);
      setKpis(r1.data || null);
      setAlerts(r2.data || null);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Failed to load platform overview.");
      setKpis(null);
      setAlerts(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const chartData = useMemo(() => {
    const arr = kpis?.chart || [];
    return Array.isArray(arr) ? arr : [];
  }, [kpis]);

  const rolePie = useMemo(() => {
    const rc = kpis?.role_counts || {};
    const keys = Object.keys(rc || {});
    const rows = keys.map((k) => ({ name: String(k), value: Number(rc[k] || 0) }));
    return rows.filter((x) => x.value > 0);
  }, [kpis]);

  const rangeLabel = useMemo(() => {
    const a = kpis?.range?.start;
    const b = kpis?.range?.end;
    return a && b ? `${a} → ${b}` : "";
  }, [kpis]);

  return (
    <div className="space-y-5">
      {err ? (
        <div className="text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-2xl p-3">
          {err}
        </div>
      ) : null}

      {loading ? <div className="text-sm text-slate-400">Loading…</div> : null}

      {!loading && kpis ? (
        <>
          {/* Executive strip */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/35 p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-100">Platform Pulse</div>
              <div className="text-xs text-slate-500 mt-1 truncate">
                Rolling 30-day window • {rangeLabel || "range"}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge tone="cyan">Users: {kpis.users_total}</Badge>
              <Badge tone="cyan">Businesses: {kpis.businesses_total}</Badge>
              <Badge tone="amber">Missing cards: {alerts?.executive?.billing?.businesses_missing_card ?? "—"}</Badge>
              <Badge tone="amber">Open tickets: {alerts?.executive?.tickets_open ?? "—"}</Badge>
              <Badge tone={alerts?.alerts_red ? "red" : alerts?.alerts_yellow ? "amber" : "emerald"}>
                Alerts: {alerts?.executive?.alerts_count ?? 0}
              </Badge>
              <button
                type="button"
                onClick={load}
                className="h-9 px-3 rounded-2xl text-xs border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40 text-slate-200"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid lg:grid-cols-3 gap-4">
            <GlassCard title="Growth" right="30d snapshot">
              <div className="grid grid-cols-2 gap-3">
                <Mini title="Signups (30d)" value={kpis.signups_last_30_days} />
                <Mini title="Users total" value={kpis.users_total} />
                <Mini title="Businesses total" value={kpis.businesses_total} />
                <Mini title="Card on file" value={kpis.businesses_with_card_on_file} />
              </div>
              <div className="mt-3 text-[11px] text-slate-500">
                Role mix:{" "}
                <span className="text-slate-200 font-mono">
                  {Object.keys(kpis.role_counts || {}).length
                    ? JSON.stringify(kpis.role_counts)
                    : "n/a"}
                </span>
              </div>
            </GlassCard>

            <GlassCard title="Revenue (placeholder)" right="wire to invoices next">
              <div className="grid grid-cols-2 gap-3">
                <Mini title="GMV (7d)" value={money(kpis.gmv_7d)} hint="All processed volume" />
                <Mini title="GMV (30d)" value={money(kpis.gmv_30d)} />
                <Mini title="Fee collected (30d)" value={money(kpis.platform_fee_collected_30d)} hint="Paid fees" />
                <Mini title="Fee due (30d)" value={money(kpis.platform_fee_due_30d)} hint="Total calculated fees" />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <Mini title="GMV (MTD)" value={money(kpis.gmv_mtd)} />
                <Mini title="GMV (YTD)" value={money(kpis.gmv_ytd)} />
              </div>

              <div className="mt-3 text-[11px] text-slate-500">
                Next: add cash GMV, card GMV, take-rate, MRR, module revenue.
              </div>
            </GlassCard>

            <GlassCard title="Billing risk" right="warn 30/15/7/1 → auto-lock">
              <div className="grid grid-cols-2 gap-3">
                <Mini title="Locked businesses" value={kpis.businesses_locked} />
                <Mini title="Expired cards" value={kpis.cards_expired} />
                <Mini title="Expiring (30d)" value={kpis.cards_expiring_30} />
                <Mini title="Expiring (7d)" value={kpis.cards_expiring_7} />
              </div>

              <div className="mt-3 space-y-2">
                {(alerts?.alerts || []).slice(0, 3).map((a) => (
                  <div key={a.key} className="flex items-center justify-between gap-3 text-sm">
                    <div className="text-slate-300">{a.label}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-100 font-semibold">{a.value}</span>
                      <Badge tone={toneForStatus(a.status)}>{a.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Charts row */}
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <GlassCard title="Growth chart (daily)" right="signups • businesses • locked">
                <div className="h-80">
                  {chartData.length ? (
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
                    <div className="text-sm text-slate-400">No chart data yet.</div>
                  )}
                </div>
              </GlassCard>
            </div>

            <GlassCard title="Role distribution" right="who is using what">
              <div className="h-80">
                {rolePie.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={rolePie} dataKey="value" nameKey="name" outerRadius={100} label />
                      <Legend />
                      {/* no explicit colors (per your rule: don't set colors unless asked) */}
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-sm text-slate-400">No role data.</div>
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-2">
                Next: track “multi-dashboard users” + “dashboard usage counts”.
              </div>
            </GlassCard>
          </div>

          {/* Scale / Future metrics */}
          <GlassCard title="Scale metrics (coming online next)" right="designed for thousands">
            <div className="grid md:grid-cols-4 gap-3">
              <Mini title="Active users (7d)" value="—" hint="Needs backend metric" />
              <Mini title="Active users (30d)" value="—" hint="Needs backend metric" />
              <Mini title="Multi-dashboard users" value="—" hint="Users who use >1 mode" />
              <Mini title="MRR total" value="—" hint="Stripe subscriptions + add-ons" />
            </div>
            <div className="mt-3 text-[11px] text-slate-500">
              We’ll wire these to: auth/me snapshots, mode switch events, Stripe subscription items, add-on entitlements.
            </div>
          </GlassCard>
        </>
      ) : null}
    </div>
  );
}