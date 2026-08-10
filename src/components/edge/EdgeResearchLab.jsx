import React, { useEffect, useState } from "react";
import api from "../../api/client";

function Metric({ label, value, detail }) {
  return <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">{label}</div><div className="mt-2 text-2xl font-black text-white">{value}</div>{detail ? <div className="mt-1 text-xs text-slate-500">{detail}</div> : null}</div>;
}

export default function EdgeResearchLab() {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);
  const [feeBps, setFeeBps] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function run() {
    setLoading(true); setMessage("");
    try {
      const end = new Date(); const start = new Date(end.getTime() - days * 86400000);
      const iso = (d) => d.toISOString().slice(0, 10);
      const response = await api.get(`/edge/research/mlb/backtest/?start=${iso(start)}&end=${iso(end)}&fee_bps=${feeBps}&risk_cents=100`);
      setData(response.data);
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Backtest data is not available yet. Sync historical snapshots first.");
    } finally { setLoading(false); }
  }

  useEffect(() => { run(); }, []);

  return <section className="rounded-[1.75rem] border border-cyan-400/15 bg-slate-950/65 p-5 sm:p-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">EDGE Research Lab</div><h2 className="mt-1 text-xl font-black text-white">Does the theory actually work?</h2><p className="mt-2 max-w-3xl text-xs leading-5 text-slate-400">Replay historical MLB/Kalshi snapshots. Compare 5%, 8%, and 10% model-vs-market thresholds and inspect comeback buckets. Research only.</p></div>
      <div className="flex flex-wrap gap-2"><select value={days} onChange={(e) => setDays(Number(e.target.value))} className="min-h-10 rounded-xl border border-white/10 bg-black/30 px-3 text-xs font-black text-white"><option value="7">7 days</option><option value="30">30 days</option><option value="60">60 days</option></select><label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 text-xs font-black text-slate-300">Fee bps<input type="number" min="0" max="500" value={feeBps} onChange={(e) => setFeeBps(Number(e.target.value || 0))} className="w-16 bg-transparent text-white outline-none" /></label><button type="button" onClick={run} disabled={loading} className="min-h-10 rounded-xl border border-cyan-300/25 bg-cyan-500/10 px-4 text-xs font-black text-cyan-100">{loading ? "Running…" : "Run test"}</button></div>
    </div>
    {message ? <div className="mt-4 rounded-xl border border-amber-400/15 bg-amber-500/[.05] p-3 text-xs text-amber-100">{message}</div> : null}
    {data ? <>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Historical samples" value={data.dataset?.samples ?? 0} /><Metric label="5% rule ROI" value={`${data.strategies?.[0]?.roi_pct ?? 0}%`} detail={`${data.strategies?.[0]?.opportunities ?? 0} opportunities`} /><Metric label="8% rule ROI" value={`${data.strategies?.[1]?.roi_pct ?? 0}%`} detail={`${data.strategies?.[1]?.opportunities ?? 0} opportunities`} /><Metric label="10% rule ROI" value={`${data.strategies?.[2]?.roi_pct ?? 0}%`} detail={`${data.strategies?.[2]?.opportunities ?? 0} opportunities`} /></div>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead><tr className="border-b border-white/10 text-[10px] uppercase tracking-[.14em] text-slate-500"><th className="px-3 py-3">Rule</th><th className="px-3 py-3">Samples</th><th className="px-3 py-3">Opps</th><th className="px-3 py-3">Win rate</th><th className="px-3 py-3">ROI</th><th className="px-3 py-3">Max DD</th><th className="px-3 py-3">Brier</th></tr></thead><tbody>{(data.strategies || []).map((row) => <tr key={row.minimum_edge_pct} className="border-b border-white/5 text-slate-300"><td className="px-3 py-3 font-black text-white">≥ {row.minimum_edge_pct}%</td><td className="px-3 py-3">{row.samples}</td><td className="px-3 py-3">{row.opportunities}</td><td className="px-3 py-3">{row.win_rate_pct}%</td><td className={`px-3 py-3 font-black ${row.roi_pct >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{row.roi_pct}%</td><td className="px-3 py-3">{row.max_drawdown_cents}¢</td><td className="px-3 py-3">{row.brier_score ?? "—"}</td></tr>)}</tbody></table></div>
      <div className="mt-5"><div className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-200">Comeback hypothesis</div><div className="mt-2 max-h-72 overflow-auto rounded-2xl border border-white/10">{(data.comeback_buckets || []).length ? data.comeback_buckets.map((row) => <div key={row.bucket} className="grid grid-cols-[1.5fr_.6fr_.8fr_.8fr] gap-2 border-b border-white/5 px-3 py-3 text-xs"><span className="font-black text-white">{row.bucket.replaceAll("_", " ")}</span><span className="text-slate-400">{row.samples}</span><span className="text-slate-300">{row.actual_win_rate_pct}% actual</span><span className="text-slate-500">{row.average_market_price_pct ?? "—"}% avg px</span></div>) : <div className="p-4 text-xs text-slate-500">No historical snapshots in this range yet.</div>}</div></div>
    </> : null}
  </section>;
}
