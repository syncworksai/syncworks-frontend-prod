import React, { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, Eye, Flame, RefreshCw, ShieldCheck, TrendingUp, Zap } from "lucide-react";
import api from "../../api/client";

const STARTING_CAPITAL_CENTS = 5000;
const PAPER_RISK_CENTS = 100;

const HEAT_MAPS = {
  MLB: {
    columns: ["Down 1", "Down 2", "Down 3", "Down 4+"],
    rows: [
      { label: "After 3rd", values: [72, 61, 43, 22] },
      { label: "After 4th", values: [78, 69, 48, 24] },
      { label: "After 5th", values: [88, 91, 55, 26] },
      { label: "After 6th", values: [84, 86, 46, 18] },
      { label: "After 7th", values: [66, 54, 28, 9] },
    ],
    note: "Prototype reprice map for stronger pregame teams. Down 1–2 around innings 4–6 is the primary research zone.",
  },
  NFL: {
    columns: ["Down 3", "Down 7", "Down 10", "Down 14+"],
    rows: [
      { label: "Halftime", values: [76, 68, 51, 30] },
      { label: "Start Q4", values: [84, 80, 58, 31] },
      { label: "10m Q4", values: [87, 82, 55, 22] },
      { label: "5m Q4", values: [65, 49, 24, 8] },
    ],
    note: "Prototype only. Live NFL production scoring must also include possession, field position, timeouts and down-and-distance.",
  },
  NCAAF: {
    columns: ["Down 3", "Down 7", "Down 10", "Down 14+"],
    rows: [
      { label: "Halftime", values: [74, 70, 59, 39] },
      { label: "Start Q4", values: [83, 81, 63, 37] },
      { label: "10m Q4", values: [85, 79, 57, 29] },
      { label: "5m Q4", values: [61, 47, 27, 12] },
    ],
    note: "Prototype only. College football needs a heavier team-strength adjustment because matchup quality varies much more widely.",
  },
};

function money(cents) {
  const value = Number(cents || 0) / 100;
  return `${value < 0 ? "-" : ""}$${Math.abs(value).toFixed(2)}`;
}

function pct(value, digits = 2) {
  const number = Number(value || 0);
  return `${number >= 0 ? "+" : ""}${number.toFixed(digits)}%`;
}

function cents(value) {
  return value === null || value === undefined ? "—" : `${value}¢`;
}

function Metric({ label, value, detail, valueClass = "text-white" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-black ${valueClass}`}>{value}</div>
      {detail ? <div className="mt-1 text-xs text-slate-500">{detail}</div> : null}
    </div>
  );
}

function HeatCell({ value }) {
  const tone = value >= 85
    ? "border-emerald-300/40 bg-emerald-500/15 text-emerald-100"
    : value >= 70
      ? "border-cyan-300/30 bg-cyan-500/10 text-cyan-100"
      : value >= 45
        ? "border-amber-300/25 bg-amber-500/[.08] text-amber-100"
        : "border-white/10 bg-white/[.025] text-slate-500";
  const label = value >= 85 ? "PRIME" : value >= 70 ? "GOOD" : value >= 45 ? "WATCH" : "PASS";
  return (
    <div className={`min-w-[92px] rounded-xl border p-3 text-center ${tone}`}>
      <div className="text-lg font-black">{value}</div>
      <div className="mt-1 text-[9px] font-black uppercase tracking-[.12em]">{label}</div>
    </div>
  );
}

function StrategyHeatMap() {
  const [sport, setSport] = useState("MLB");
  const map = HEAT_MAPS[sport];
  return (
    <section className="rounded-[1.75rem] border border-cyan-400/20 bg-slate-950/70 p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-cyan-200"><BarChart3 className="h-4 w-4" /> Free Strategy Heat Map</div>
          <h2 className="mt-1 text-xl font-black text-white">See where EDGE is hunting before it ever enters.</h2>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-400">This map is intentionally transparent. It describes setup quality for a possible favorable market repricing — not a guarantee that the team wins the game.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {["MLB", "NFL", "NCAAF"].map((value) => (
            <button key={value} type="button" onClick={() => setSport(value)} className={`min-h-10 rounded-xl border px-3 text-xs font-black ${sport === value ? "border-cyan-300/35 bg-cyan-500/12 text-cyan-100" : "border-white/10 bg-white/[.03] text-slate-400"}`}>{value}</button>
          ))}
        </div>
      </div>
      <div className="mt-5 overflow-x-auto pb-2">
        <div className="min-w-[520px]">
          <div className="grid grid-cols-[110px_repeat(4,minmax(92px,1fr))] gap-2">
            <div />
            {map.columns.map((column) => <div key={column} className="px-2 pb-1 text-center text-[10px] font-black uppercase tracking-[.12em] text-slate-500">{column}</div>)}
            {map.rows.flatMap((row) => [
              <div key={`${row.label}-label`} className="flex items-center text-[11px] font-black text-slate-400">{row.label}</div>,
              ...row.values.map((value, index) => <HeatCell key={`${row.label}-${index}`} value={value} />),
            ])}
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-400">{map.note}</div>
        <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[.1em]"><span className="rounded-full border border-emerald-300/25 px-2 py-1 text-emerald-200">85+ PRIME</span><span className="rounded-full border border-cyan-300/25 px-2 py-1 text-cyan-200">70–84 GOOD</span><span className="rounded-full border border-amber-300/25 px-2 py-1 text-amber-200">45–69 WATCH</span></div>
      </div>
    </section>
  );
}

const RULES = [
  ["1", "Pregame", "55–64.9%", "Only moderate favorites."],
  ["2", "Score", "Down 1–2", "No ties, leaders, or 3+ run deficits."],
  ["3", "Timing", "4th–6th", "Enough game remains for repricing."],
  ["4", "Market shock", "Drop ≥18 pts", "Current ask must be at least 18 points below pregame."],
  ["5", "EDGE confirmation", "+5 pts", "Model fair value must exceed current ask by at least 5 points."],
];

function StrategyPlaybook() {
  return (
    <section className="rounded-[1.75rem] border border-emerald-400/20 bg-slate-950/70 p-5 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-200">Strategy A • Transparent Operating Playbook</div>
          <h2 className="mt-1 text-xl font-black text-white">Five checks. All five green or we pass.</h2>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-400">The free version shows the exact setup logic so users can paper trade it themselves. The eventual paid Autopilot can use the same rules without requiring the app to stay open.</p>
        </div>
        <span className="rounded-full border border-emerald-300/25 bg-emerald-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[.14em] text-emerald-100">Paper validation</span>
      </div>
      <div className="mt-5 grid gap-2 md:grid-cols-5">{RULES.map(([n, label, value, detail]) => <div key={n} className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="flex h-7 w-7 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-500/10 text-xs font-black text-emerald-200">{n}</div><div className="mt-3 text-[10px] font-black uppercase tracking-[.14em] text-slate-500">{label}</div><div className="mt-1 text-lg font-black text-white">{value}</div><div className="mt-1 text-[11px] leading-4 text-slate-500">{detail}</div></div>)}</div>
      <div className="mt-5 rounded-2xl border border-cyan-300/15 bg-cyan-500/[.045] p-4"><div className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-200">Current frozen exit rule</div><div className="mt-2 text-lg font-black text-white">Enter once → exit 20 minutes later.</div><div className="mt-1 text-xs leading-5 text-slate-400">This remains the frozen Strategy A comparison rule while we separately research 1.5×, 2×, partial exits, capital protection and re-entry.</div></div>
    </section>
  );
}

function StrategyACard({ item }) {
  const prime = Boolean(item.qualifies);
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4 ${prime ? "border-emerald-300/50 bg-emerald-500/[.09] shadow-[0_0_32px_rgba(52,211,153,.12)]" : "border-white/10 bg-black/15"}`}>
      {prime ? <div className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-emerald-300/50 bg-emerald-400/15 px-3 py-2 text-center text-xs font-black uppercase tracking-[.16em] text-emerald-100 animate-pulse"><Flame className="h-4 w-4" /> THIS IS A PRIME ENTRY • PAPER SIGNAL</div> : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><div className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-200">{item.strategy}</div><div className="mt-1 text-lg font-black text-white">{item.matchup} • {item.side}</div><div className="mt-1 text-xs text-slate-400">{item.game_state}</div></div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[.14em] ${prime ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-200" : "border-white/10 bg-white/[.03] text-slate-500"}`}>{prime ? "PRIME" : "WATCH"}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"><Metric label="Pregame" value={`${item.pregame_probability_pct}%`} /><Metric label="Ask" value={cents(item.current_ask_cents)} /><Metric label="Drop" value={`${item.market_drop_pct}%`} /><Metric label="EDGE fair" value={`${item.model_probability_pct}%`} /><Metric label="Model edge" value={`${item.model_edge_pct >= 0 ? "+" : ""}${item.model_edge_pct}%`} /><Metric label="Paper exit" value={`${item.paper_exit_minutes} min`} /></div>
      {prime ? <div className="mt-3 rounded-xl border border-emerald-400/15 bg-emerald-500/[.05] px-3 py-2 text-xs leading-5 text-emerald-100">All five checks passed. The alert is deliberately obvious so a free user can recognize the same entry the automated engine is paper-testing.</div> : null}
    </div>
  );
}

function LiveTestingStudio({ trades, qualifyingCount, lastRefresh, onRefresh, refreshing }) {
  const closed = trades.filter((trade) => trade.status === "EXITED");
  const open = trades.filter((trade) => trade.status === "OPEN");
  const realized = closed.reduce((sum, trade) => sum + Number(trade.pnl_cents || 0), 0);
  const equity = STARTING_CAPITAL_CENTS + realized;
  const roi = STARTING_CAPITAL_CENTS ? (realized / STARTING_CAPITAL_CENTS) * 100 : 0;
  const wins = closed.filter((trade) => Number(trade.pnl_cents || 0) > 0).length;
  const positiveRate = closed.length ? (wins / closed.length) * 100 : 0;
  const latest = [...closed].sort((a, b) => new Date(b.exited_at || b.updated_at || 0) - new Date(a.exited_at || a.updated_at || 0)).slice(0, 6);
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-violet-300/20 bg-slate-950/70">
      <div className="border-b border-white/10 bg-violet-500/[.045] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-violet-200"><Activity className="h-4 w-4" /> Free Live Account Testing Studio</div>
            <h2 className="mt-1 text-xl font-black text-white">Follow a $50 shadow account in real time.</h2>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-400">Starting capital, rules and every closed result stay visible. This is paper trading only — the purpose is to show what the strategy would be doing before a user ever connects real capital.</p>
          </div>
          <button type="button" disabled={refreshing} onClick={onRefresh} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-violet-300/25 bg-violet-500/10 px-3 text-xs font-black text-violet-100 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh studio</button>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300">As of <span className="font-black text-white">{lastRefresh ? lastRefresh.toLocaleString() : "waiting for live data"}</span> • Strategy A • $1 paper unit • $50 starting capital.</div>
      </div>
      <div className="space-y-4 p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Metric label="Start" value="$50.00" detail="Published baseline" />
          <Metric label="Equity" value={money(equity)} detail="Realized only" valueClass={realized >= 0 ? "text-emerald-300" : "text-rose-300"} />
          <Metric label="Profit / loss" value={money(realized)} detail={pct(roi)} valueClass={realized >= 0 ? "text-emerald-300" : "text-rose-300"} />
          <Metric label="Closed" value={String(closed.length)} detail={`${wins} positive`} />
          <Metric label="Positive rate" value={`${positiveRate.toFixed(1)}%`} detail="Not the same as final-game win rate" />
          <Metric label="Prime now" value={String(qualifyingCount)} detail={`${open.length} paper position${open.length === 1 ? "" : "s"} open`} />
        </div>
        <div className="rounded-2xl border border-cyan-300/15 bg-cyan-500/[.04] p-4 text-xs leading-5 text-slate-300"><span className="font-black text-cyan-100">What this proves:</span> users can watch the strategy's portfolio path instead of seeing only cherry-picked winning examples. A bad day stays visible too. The goal is transparency around entry, exit, drawdown and capital protection.</div>
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-slate-400"><TrendingUp className="h-4 w-4" /> Recent closed paper trades</div>
          {latest.length ? <div className="overflow-x-auto"><table className="w-full min-w-[660px] text-left text-xs"><thead><tr className="border-b border-white/10 text-[10px] uppercase tracking-[.12em] text-slate-500"><th className="px-3 py-3">Market</th><th className="px-3 py-3">Side</th><th className="px-3 py-3">Entry</th><th className="px-3 py-3">Exit</th><th className="px-3 py-3">P/L</th><th className="px-3 py-3">Status</th></tr></thead><tbody>{latest.map((trade, index) => { const pnl = Number(trade.pnl_cents || 0); return <tr key={trade.id || `${trade.ticker}-${index}`} className="border-b border-white/5 text-slate-300"><td className="px-3 py-3 font-black text-white">{trade.matchup || trade.ticker || "EDGE market"}</td><td className="px-3 py-3">{trade.side || "—"}</td><td className="px-3 py-3">{cents(trade.entry_price_cents ?? trade.entry_cents)}</td><td className="px-3 py-3">{cents(trade.exit_price_cents ?? trade.exit_cents)}</td><td className={`px-3 py-3 font-black ${pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{money(pnl)}</td><td className="px-3 py-3">EXITED</td></tr>; })}</tbody></table></div> : <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-500">No Strategy A paper trade has closed yet. The $50 account stays unchanged until the engine records a result.</div>}
        </div>
      </div>
    </section>
  );
}

export default function EdgeResearchLab() {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);
  const [feeBps, setFeeBps] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [strategyA, setStrategyA] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  async function run() {
    setLoading(true);
    setMessage("");
    try {
      const end = new Date();
      const start = new Date(end.getTime() - days * 86400000);
      const iso = (date) => date.toISOString().slice(0, 10);
      const response = await api.get(`/edge/research/mlb/backtest/?start=${iso(start)}&end=${iso(end)}&fee_bps=${feeBps}&risk_cents=${PAPER_RISK_CENTS}`);
      setData(response.data);
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Backtest data is not available yet. Sync historical snapshots first.");
    } finally {
      setLoading(false);
    }
  }

  async function loadStrategyA(manual = false) {
    if (manual) setRefreshing(true);
    try {
      const response = await api.get("/edge/strategy-a/live/");
      setStrategyA(response.data);
      setLastRefresh(new Date());
    } catch {
      setStrategyA(null);
    } finally {
      if (manual) setRefreshing(false);
    }
  }

  useEffect(() => {
    run();
    loadStrategyA();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => loadStrategyA(), 10000);
    return () => window.clearInterval(timer);
  }, []);

  const qualifying = strategyA?.qualifying_signals || [];
  const strategySignals = useMemo(() => (strategyA?.signals || []).filter((item) => item.qualifies || (item.pregame_probability_pct >= 55 && item.pregame_probability_pct < 65)).slice(0, 8), [strategyA]);
  const trades = strategyA?.paper_trades || [];

  return (
    <div className="space-y-4">
      <StrategyHeatMap />
      <LiveTestingStudio trades={trades} qualifyingCount={qualifying.length} lastRefresh={lastRefresh} onRefresh={() => loadStrategyA(true)} refreshing={refreshing} />
      <StrategyPlaybook />

      <section className="rounded-[1.75rem] border border-emerald-400/20 bg-slate-950/70 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-emerald-200"><Zap className="h-4 w-4" /> EDGE Strategy A • Live Scanner</div><h2 className="mt-1 text-xl font-black text-white">When every check turns green, make it impossible to miss.</h2><p className="mt-2 max-w-3xl text-xs leading-5 text-slate-400">The server keeps scanning independently. The cards below are a transparent free view of what the paper engine sees.</p></div>
          <div className="rounded-xl border border-emerald-300/20 bg-emerald-500/[.06] px-3 py-2 text-xs font-black text-emerald-100"><Eye className="mr-2 inline h-4 w-4" /> {qualifying.length} PRIME now</div>
        </div>
        <div className="mt-5 space-y-3">{strategySignals.length ? strategySignals.map((item) => <StrategyACard key={`${item.ticker}-${item.side}`} item={item} />) : <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-500">No 55–65% Strategy A candidates are active right now. Staying out is part of the strategy.</div>}</div>
      </section>

      <section className="rounded-[1.75rem] border border-cyan-400/15 bg-slate-950/65 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-cyan-200"><ShieldCheck className="h-4 w-4" /> EDGE Research Lab</div><h2 className="mt-1 text-xl font-black text-white">Keep testing the theory instead of assuming it works.</h2><p className="mt-2 max-w-3xl text-xs leading-5 text-slate-400">Historical research stays visibly separate from live forward paper results so users can see which numbers came from backtests and which came from real-time observation.</p></div>
          <div className="flex flex-wrap gap-2"><select value={days} onChange={(event) => setDays(Number(event.target.value))} className="min-h-10 rounded-xl border border-white/10 bg-black/30 px-3 text-xs font-black text-white"><option value="7">7 days</option><option value="30">30 days</option><option value="60">60 days</option></select><label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 text-xs font-black text-slate-300">Fee bps<input type="number" min="0" max="500" value={feeBps} onChange={(event) => setFeeBps(Number(event.target.value || 0))} className="w-16 bg-transparent text-white outline-none" /></label><button type="button" onClick={run} disabled={loading} className="min-h-10 rounded-xl border border-cyan-300/25 bg-cyan-500/10 px-4 text-xs font-black text-cyan-100">{loading ? "Running…" : "Run test"}</button></div>
        </div>
        {message ? <div className="mt-4 rounded-xl border border-amber-400/15 bg-amber-500/[.05] p-3 text-xs text-amber-100">{message}</div> : null}
        {data ? <><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Historical samples" value={data.dataset?.samples ?? 0} /><Metric label="5% rule ROI" value={`${data.strategies?.[0]?.roi_pct ?? 0}%`} detail={`${data.strategies?.[0]?.opportunities ?? 0} opportunities`} /><Metric label="8% rule ROI" value={`${data.strategies?.[1]?.roi_pct ?? 0}%`} detail={`${data.strategies?.[1]?.opportunities ?? 0} opportunities`} /><Metric label="10% rule ROI" value={`${data.strategies?.[2]?.roi_pct ?? 0}%`} detail={`${data.strategies?.[2]?.opportunities ?? 0} opportunities`} /></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead><tr className="border-b border-white/10 text-[10px] uppercase tracking-[.14em] text-slate-500"><th className="px-3 py-3">Rule</th><th className="px-3 py-3">Opps</th><th className="px-3 py-3">Win rate</th><th className="px-3 py-3">ROI</th><th className="px-3 py-3">Max DD</th></tr></thead><tbody>{(data.strategies || []).map((row) => <tr key={row.minimum_edge_pct} className="border-b border-white/5 text-slate-300"><td className="px-3 py-3 font-black text-white">≥ {row.minimum_edge_pct}%</td><td className="px-3 py-3">{row.opportunities}</td><td className="px-3 py-3">{row.win_rate_pct}%</td><td className={`px-3 py-3 font-black ${row.roi_pct >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{row.roi_pct}%</td><td className="px-3 py-3">{row.max_drawdown_cents}¢</td></tr>)}</tbody></table></div></> : null}
      </section>
    </div>
  );
}
