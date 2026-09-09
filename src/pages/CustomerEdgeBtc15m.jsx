import React, { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, BarChart3, Bitcoin, Clock3, RefreshCw, ShieldCheck, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useNavigate } from "react-router-dom";

import api from "../api/client";
import DashboardShell from "../components/dashboard/DashboardShell";

function money(cents) {
  const value = Number(cents || 0) / 100;
  return `${value < 0 ? "-" : ""}$${Math.abs(value).toFixed(2)}`;
}

function pct(value, digits = 2) {
  const n = Number(value || 0);
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;
}

function cents(value) {
  return value === null || value === undefined ? "—" : `${Number(value).toFixed(Number(value) % 1 ? 1 : 0)}¢`;
}

function price(value) {
  if (value === null || value === undefined) return "—";
  return `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function dateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function Metric({ label, value, detail, tone = "text-white" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4">
      <div className="text-[9px] font-black uppercase tracking-[.15em] text-slate-500">{label}</div>
      <div className={`mt-1.5 text-xl font-black sm:text-2xl ${tone}`}>{value}</div>
      {detail ? <div className="mt-1 text-[10px] leading-4 text-slate-500">{detail}</div> : null}
    </div>
  );
}

function Rule({ label, value, detail }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">
      <div className="text-[9px] font-black uppercase tracking-[.13em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-black text-white">{value}</div>
      <div className="mt-1 text-[10px] leading-4 text-slate-500">{detail}</div>
    </div>
  );
}

function SessionCard({ row }) {
  const entered = row.decision === "ENTER";
  const positive = Number(row.pnl_cents || 0) > 0;
  const negative = Number(row.pnl_cents || 0) < 0;
  return (
    <div className={`rounded-2xl border p-3 ${entered ? "border-cyan-300/20 bg-cyan-500/[.045]" : "border-white/10 bg-white/[.02]"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`text-[9px] font-black uppercase tracking-[.14em] ${entered ? "text-cyan-200" : "text-slate-500"}`}>{entered ? `${row.side} • PAPER ENTRY` : "NO TRADE • FILTERED"}</div>
          <div className="mt-1 truncate text-xs font-black text-white">{row.ticker || "BTC 15M"}</div>
          <div className="mt-1 text-[10px] text-slate-500">{dateTime(row.at)}</div>
        </div>
        {row.pnl_cents !== null && row.pnl_cents !== undefined ? (
          <div className={`text-sm font-black ${positive ? "text-emerald-300" : negative ? "text-rose-300" : "text-slate-300"}`}>{money(row.pnl_cents)}</div>
        ) : (
          <div className="text-[9px] font-black uppercase text-slate-600">{row.trade_status || "SKIP"}</div>
        )}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        <div><div className="text-[8px] font-black uppercase text-slate-600">Fair</div><div className="mt-1 text-xs font-black text-white">{row.fair_probability_pct ?? "—"}%</div></div>
        <div><div className="text-[8px] font-black uppercase text-slate-600">Edge</div><div className="mt-1 text-xs font-black text-cyan-200">{row.edge_points === null || row.edge_points === undefined ? "—" : `+${row.edge_points}pt`}</div></div>
        <div><div className="text-[8px] font-black uppercase text-slate-600">Entry</div><div className="mt-1 text-xs font-black text-white">{cents(row.entry_price_cents || row.market_ask_cents)}</div></div>
        <div><div className="text-[8px] font-black uppercase text-slate-600">Exit</div><div className="mt-1 text-xs font-black text-white">{cents(row.exit_price_cents)}</div></div>
      </div>
      {!entered && row.failed_checks?.length ? <div className="mt-3 text-[10px] leading-4 text-slate-500">Filtered: {row.failed_checks.join(" • ")}</div> : null}
    </div>
  );
}

export default function CustomerEdgeBtc15m() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [lastRefresh, setLastRefresh] = useState(null);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const response = await api.get("/edge/btc15m/dashboard/");
      setData(response.data);
      setLastRefresh(new Date());
      setMessage("");
    } catch (error) {
      setMessage(error?.response?.data?.detail || "BTC 15-minute paper data is not available yet.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load(true), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const metrics = data?.metrics || {};
  const current = data?.current_session || null;
  const rules = data?.rules || {};
  const experiment = data?.experiment || {};
  const equityData = useMemo(() => (data?.equity_curve || []).map((row, index) => ({
    index,
    label: index === 0 ? "Start" : new Date(row.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    equity: Number(row.equity_cents || 0) / 100,
  })), [data]);

  const pUp = Number(current?.model_up_pct || 0);
  const pDown = Number(current?.model_down_pct || 0);
  const side = pUp >= pDown ? "UP" : "DOWN";
  const sideFair = Math.max(pUp, pDown);
  const sideAsk = side === "UP" ? current?.yes_ask_cents : current?.no_ask_cents;
  const edge = side === "UP" ? current?.up_edge_points : current?.down_edge_points;
  const remaining = Number(current?.seconds_remaining || 0);
  const inEntryWindow = remaining >= 120 && remaining <= 300;
  const signalReady = inEntryWindow && sideFair >= 75 && Number(edge || -99) >= 5;

  return (
    <DashboardShell
      title="SyncWorks EDGE"
      subtitle="BTC 15-minute paper strategy lab"
      rightActions={<button type="button" onClick={() => load()} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-500/[.07] px-3 text-[10px] font-black uppercase tracking-[.12em] text-cyan-100"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</button>}
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className="rounded-xl border border-cyan-300/35 bg-cyan-500/12 px-3 py-2 text-xs font-black text-cyan-100">BTC 15M</button>
        <button type="button" onClick={() => navigate("/customer/edge/sports")} className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs font-black text-slate-400">Sports EDGE</button>
        <button type="button" onClick={() => navigate("/customer/day-trading-futures")} className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs font-black text-slate-400">Futures Signals</button>
      </div>

      <section className="relative overflow-hidden rounded-[1.8rem] border border-cyan-300/20 bg-slate-950/75 p-4 sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,.12),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,.10),transparent_35%)]" />
        <div className="relative">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-500/[.08] px-3 py-1 text-[9px] font-black uppercase tracking-[.15em] text-amber-200"><Bitcoin className="h-3.5 w-3.5" /> BTC • 15 MINUTES</span>
                <span className="rounded-full border border-emerald-300/25 bg-emerald-500/[.08] px-3 py-1 text-[9px] font-black uppercase tracking-[.15em] text-emerald-200">$1 FIXED PAPER RISK</span>
                <span className="rounded-full border border-violet-300/25 bg-violet-500/[.08] px-3 py-1 text-[9px] font-black uppercase tracking-[.15em] text-violet-200">7-DAY TEST</span>
              </div>
              <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">Does BTC move first — and Kalshi reprice second?</h1>
              <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-400">EDGE watches each KXBTC15M window, estimates fair value from BTC distance-to-target, one-minute volatility and 1m/5m momentum, then enters only when the model advantage survives the filters.</p>
            </div>
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/[.05] p-3 text-xs leading-5 text-emerald-100 lg:max-w-sm">
              <div className="flex items-center gap-2 font-black"><ShieldCheck className="h-4 w-4" /> PAPER ONLY</div>
              <div className="mt-1 text-emerald-100/70">No real Kalshi order is sent. Entry uses the displayed executable ask for a conservative fill assumption; maker price is tracked separately but never assumed filled.</div>
            </div>
          </div>

          {message ? <div className="mt-4 rounded-xl border border-rose-300/20 bg-rose-500/[.06] p-3 text-xs text-rose-100">{message}</div> : null}

          <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-6">
            <Metric label="Paper equity" value={money(metrics.equity_cents)} detail={`Started ${money(experiment.start_bankroll_cents || 10000)}`} tone={Number(metrics.net_pnl_cents || 0) >= 0 ? "text-emerald-200" : "text-rose-200"} />
            <Metric label="Net P/L" value={money(metrics.net_pnl_cents)} detail={pct(metrics.roi_pct)} tone={Number(metrics.net_pnl_cents || 0) >= 0 ? "text-emerald-300" : "text-rose-300"} />
            <Metric label="Windows" value={metrics.sessions_evaluated ?? 0} detail={`${metrics.entries ?? 0} entries • ${metrics.skips ?? 0} skips`} />
            <Metric label="Closed" value={metrics.closed_trades ?? 0} detail={`${metrics.wins ?? 0} W • ${metrics.losses ?? 0} L`} />
            <Metric label="Positive closes" value={`${Number(metrics.positive_close_rate_pct || 0).toFixed(1)}%`} detail="Not the same as expected value" />
            <Metric label="Avg entry edge" value={`+${Number(metrics.avg_entry_edge_points || 0).toFixed(2)}pt`} detail="Model fair minus market ask" tone="text-cyan-200" />
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.08fr_.92fr]">
        <section className={`rounded-[1.7rem] border p-4 sm:p-5 ${signalReady ? "border-emerald-300/40 bg-emerald-500/[.07] shadow-[0_0_40px_rgba(52,211,153,.10)]" : "border-white/10 bg-slate-950/70"}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.17em] text-cyan-200"><Activity className="h-4 w-4" /> Current 15-minute window</div>
              <div className="mt-1 text-lg font-black text-white">{current?.ticker || (loading ? "Loading Kalshi…" : "Waiting for an open KXBTC15M market")}</div>
            </div>
            <div className={`rounded-xl border px-3 py-2 text-center ${inEntryWindow ? "border-amber-300/25 bg-amber-500/[.08]" : "border-white/10 bg-white/[.03]"}`}>
              <div className="text-[8px] font-black uppercase tracking-[.12em] text-slate-500">Time left</div>
              <div className="mt-1 text-base font-black text-white">{current ? `${Math.floor(remaining / 60)}:${String(Math.max(0, remaining % 60)).padStart(2, "0")}` : "—"}</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Kalshi target" value={price(current?.target)} detail="Contract reference" />
            <Metric label="BTC spot" value={price(current?.btc_spot)} detail="Coinbase signal proxy" />
            <Metric label="1m momentum" value={pct(current?.ret1_pct, 3)} tone={Number(current?.ret1_pct || 0) >= 0 ? "text-emerald-300" : "text-rose-300"} />
            <Metric label="5m momentum" value={pct(current?.ret5_pct, 3)} tone={Number(current?.ret5_pct || 0) >= 0 ? "text-emerald-300" : "text-rose-300"} />
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[.15em] text-slate-500">Model favorite</div>
                <div className={`mt-1 flex items-center gap-2 text-3xl font-black ${side === "UP" ? "text-emerald-300" : "text-rose-300"}`}>{side === "UP" ? <TrendingUp className="h-7 w-7" /> : <TrendingDown className="h-7 w-7" />}{side} {sideFair.toFixed(1)}%</div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-right">
                <div><div className="text-[8px] font-black uppercase text-slate-600">Ask</div><div className="mt-1 text-lg font-black text-white">{cents(sideAsk)}</div></div>
                <div><div className="text-[8px] font-black uppercase text-slate-600">Edge</div><div className={`mt-1 text-lg font-black ${Number(edge || 0) >= 5 ? "text-emerald-300" : "text-slate-300"}`}>{edge === null || edge === undefined ? "—" : `${Number(edge) >= 0 ? "+" : ""}${Number(edge).toFixed(2)}pt`}</div></div>
                <div><div className="text-[8px] font-black uppercase text-slate-600">Zone</div><div className={`mt-1 text-lg font-black ${inEntryWindow ? "text-amber-200" : "text-slate-400"}`}>{inEntryWindow ? "ENTRY" : remaining > 300 ? "WAIT" : "CLOSED"}</div></div>
              </div>
            </div>
            <div className={`mt-4 rounded-xl border p-3 ${signalReady ? "border-emerald-300/35 bg-emerald-500/[.09]" : "border-white/10 bg-white/[.025]"}`}>
              <div className={`flex items-center gap-2 text-xs font-black ${signalReady ? "text-emerald-100" : "text-slate-300"}`}><Zap className="h-4 w-4" /> {signalReady ? `${side} has the minimum probability + edge setup — full filters decide the paper entry.` : "No qualified paper entry is being assumed from headline probability alone."}</div>
            </div>
          </div>
        </section>

        <section className="rounded-[1.7rem] border border-violet-300/15 bg-slate-950/70 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.17em] text-violet-200"><BarChart3 className="h-4 w-4" /> 7-day equity curve</div><div className="mt-1 text-sm text-slate-500">Fixed $1 risk • bankroll does not change position size</div></div>
            <div className="text-right"><div className="text-[8px] font-black uppercase text-slate-600">Ends</div><div className="mt-1 text-[10px] font-black text-white">{dateTime(experiment.ends_at)}</div></div>
          </div>
          <div className="mt-4 h-[245px] w-full">
            {equityData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={equityData} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.10)" />
                  <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 9 }} minTickGap={28} />
                  <YAxis domain={["auto", "auto"]} tick={{ fill: "#64748b", fontSize: 9 }} tickFormatter={(v) => `$${Number(v).toFixed(0)}`} />
                  <Tooltip contentStyle={{ background: "#020617", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12 }} formatter={(v) => [`$${Number(v).toFixed(2)}`, "Paper equity"]} />
                  <Line type="monotone" dataKey="equity" stroke="#22d3ee" strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 text-xs text-slate-600">Equity points appear as paper trades close.</div>}
          </div>
          <div className="mt-2 text-[10px] leading-4 text-slate-500">The meaningful number at the end of the week is net expected value after realistic entry/exit assumptions — not just win percentage.</div>
        </section>
      </div>

      <section className="mt-4 rounded-[1.7rem] border border-white/10 bg-slate-950/70 p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.17em] text-emerald-200"><ShieldCheck className="h-4 w-4" /> Frozen week-one rules</div><h2 className="mt-1 text-lg font-black text-white">We do not move the goalposts after a losing window.</h2></div>
          <div className="text-[10px] text-slate-600">Last UI refresh {lastRefresh ? lastRefresh.toLocaleTimeString() : "—"}</div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Rule label="Entry time" value={rules.entry_window || "T-5:00 to T-2:00"} detail="Observe early. No new entry in the final two minutes." />
          <Rule label="Probability" value={`≥ ${rules.minimum_model_probability_pct ?? 75}%`} detail="Favorite must be established by the model." />
          <Rule label="Price edge" value={`≥ ${rules.minimum_edge_points ?? 5} points`} detail="Model fair probability minus executable market ask." />
          <Rule label="Spread" value={`≤ ${rules.max_spread_cents ?? 3}¢`} detail="Avoid paying through thin or dislocated markets." />
          <Rule label="Momentum" value="1m + 5m agree" detail="Both must confirm the selected UP/DOWN side." />
          <Rule label="Target persistence" value="Same side of target" detail="BTC must actually remain above/below the Kalshi reference." />
          <Rule label="Execution" value="Ask fill for P/L" detail="Maker target is recorded, but an unfilled resting order is never counted as a win." />
          <Rule label="Exit" value="Fair / break / settle" detail="Exit if market reaches model fair, thesis breaks, or contract settles." />
        </div>
      </section>

      <section className="mt-4 rounded-[1.7rem] border border-white/10 bg-slate-950/70 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.17em] text-cyan-200"><Clock3 className="h-4 w-4" /> Session ledger</div><h2 className="mt-1 text-lg font-black text-white">Every evaluated window stays visible — winners, losers and skips.</h2></div><div className="hidden text-right text-[10px] text-slate-600 sm:block">Potential windows in 7 days<br /><span className="font-black text-white">{experiment.potential_15m_windows ?? 672}</span></div></div>
        <div className="mt-4 grid gap-2 lg:grid-cols-2">{data?.recent_sessions?.length ? data.recent_sessions.map((row, index) => <SessionCard key={`${row.ticker}-${row.at}-${index}`} row={row} />) : <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-slate-600">The first decision appears when an open BTC 15-minute market enters the T−5:00 to T−2:00 evaluation window.</div>}</div>
      </section>

      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-cyan-300/15 bg-cyan-500/[.035] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><div className="text-xs font-black text-white">What we decide after seven days</div><div className="mt-1 text-[11px] leading-5 text-slate-400">If net P/L, calibration and drawdown survive the test, we optimize thresholds on a separate sample. If they do not, we change or kill the model instead of hiding the losing windows.</div></div>
        <button type="button" onClick={() => navigate("/customer/edge/sports")} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 text-xs font-black text-white">Open Sports EDGE <ArrowRight className="h-4 w-4" /></button>
      </div>
    </DashboardShell>
  );
}
