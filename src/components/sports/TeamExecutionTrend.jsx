import React, { useEffect, useMemo, useState } from "react";
import { BarChart3, Save, TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getWayTrend, saveWayWeekTarget } from "../../api/wayAnalytics";

function mondayIso(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default function TeamExecutionTrend({ team, canManage = false, onOpenAnalytics }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weekOf, setWeekOf] = useState(mondayIso());
  const [expected, setExpected] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!team?.id) return;
    setLoading(true);
    setError("");
    try {
      setData(await getWayTrend(team.id));
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Team trend could not load.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [team?.id]);

  const weeks = useMemo(() => data?.weeks || [], [data]);
  const latest = weeks.at(-1) || {};
  const saveTarget = async () => {
    if (!expected || !team?.id) return;
    setSaving(true);
    setError("");
    try {
      await saveWayWeekTarget(team.id, { week_of: weekOf, expected_runs_per_game: expected });
      setExpected("");
      await load();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Expected runs target could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mx-auto max-w-6xl rounded-[1.45rem] border border-white/10 bg-[#07111f] p-3.5 text-slate-100 shadow-xl sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[8px] font-black uppercase tracking-[.17em] text-cyan-300">Team execution trend</div>
          <h2 className="mt-1 text-base font-black text-white">Are we becoming the team we say we are?</h2>
          <p className="mt-1 max-w-2xl text-[9px] leading-4 text-slate-500">Expected runs and actual runs show production. Team Execution Score shows whether our decisions and actions made the team better.</p>
        </div>
        <button type="button" onClick={onOpenAnalytics} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border border-cyan-300/20 bg-cyan-300/[.06] px-3 text-[8px] font-black uppercase tracking-wide text-cyan-100"><BarChart3 className="h-3.5 w-3.5" />Details</button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-white/8 bg-black/15 p-2.5"><div className="text-[7px] font-black uppercase tracking-wide text-slate-600">This week actual</div><div className="mt-1 text-xl font-black text-white">{latest.actual_runs_per_game ?? "—"}</div><div className="text-[8px] text-slate-600">runs / game</div></div>
        <div className="rounded-xl border border-white/8 bg-black/15 p-2.5"><div className="text-[7px] font-black uppercase tracking-wide text-slate-600">Expected</div><div className="mt-1 text-xl font-black text-white">{latest.expected_runs_per_game ?? "—"}</div><div className="text-[8px] text-slate-600">lineup target</div></div>
        <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[.04] p-2.5"><div className="text-[7px] font-black uppercase tracking-wide text-cyan-300">Execution</div><div className="mt-1 text-xl font-black text-white">{latest.team_execution_score ?? latest.team_player_score ?? "—"}</div><div className="text-[8px] text-slate-600">team score</div></div>
      </div>

      <div className="mt-3 h-64 w-full rounded-xl border border-white/8 bg-black/10 p-2">
        {loading ? <div className="grid h-full place-items-center text-xs text-slate-600">Loading team trend…</div> : weeks.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeks} margin={{ top: 8, right: 6, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.12)" />
              <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="runs" tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="score" orientation="right" domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#07111f", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 9 }} />
              <Line yAxisId="runs" type="monotone" dataKey="actual_runs_per_game" name="Actual runs/game" stroke="#67e8f9" strokeWidth={2.5} connectNulls />
              <Line yAxisId="runs" type="monotone" dataKey="expected_runs_per_game" name="Expected runs/game" stroke="#fbbf24" strokeWidth={2} strokeDasharray="5 4" connectNulls />
              <Line yAxisId="score" type="monotone" dataKey="team_execution_score" name="Execution Score" stroke="#a78bfa" strokeWidth={2.5} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        ) : <div className="grid h-full place-items-center px-4 text-center text-[10px] leading-5 text-slate-600">Finalize games to build the weekly trend. Expected production can be entered now and compared as games are added.</div>}
      </div>

      {canManage ? (
        <div className="mt-3 rounded-xl border border-white/8 bg-black/15 p-2.5">
          <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-wide text-slate-500"><TrendingUp className="h-3.5 w-3.5" />Set weekly lineup expectation</div>
          <div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2">
            <input type="date" value={weekOf} onChange={(event) => setWeekOf(event.target.value)} className="h-10 rounded-xl border border-white/10 bg-black/20 px-2 text-[10px] text-white outline-none" />
            <input inputMode="decimal" placeholder="Runs/game" value={expected} onChange={(event) => setExpected(event.target.value.replace(/[^0-9.]/g, ""))} className="h-10 rounded-xl border border-white/10 bg-black/20 px-2 text-[10px] text-white outline-none" />
            <button type="button" disabled={!expected || saving} onClick={saveTarget} className="min-h-10 rounded-xl bg-cyan-300 px-3 text-[9px] font-black text-slate-950 disabled:opacity-40"><Save className="mr-1 inline h-3.5 w-3.5" />{saving ? "Saving" : "Save"}</button>
          </div>
        </div>
      ) : null}

      {error ? <div className="mt-2 rounded-xl border border-rose-300/20 bg-rose-300/10 p-2 text-[9px] text-rose-100">{error}</div> : null}
    </section>
  );
}
