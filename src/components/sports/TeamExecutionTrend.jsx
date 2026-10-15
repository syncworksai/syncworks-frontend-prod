import React, { useEffect, useMemo, useState } from "react";
import { BarChart3, Save, TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  LabelList,
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

const hasValue = (value) => value !== null && value !== undefined && value !== "";
const fmtRuns = (value) => hasValue(value) ? Number(value).toFixed(1) : "—";
const fmtScore = (value) => hasValue(value) ? Number(value).toFixed(0) : "—";

function ToggleMetric({ active, onClick, label, value, sub, tone }) {
  const tones = {
    cyan: "border-cyan-300/25 bg-cyan-300/[.055] text-cyan-200",
    amber: "border-amber-300/25 bg-amber-300/[.055] text-amber-200",
    violet: "border-violet-300/25 bg-violet-300/[.055] text-violet-200",
  };
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-xl border p-2.5 text-left transition ${tones[tone] || tones.cyan} ${active ? "opacity-100" : "opacity-40 grayscale"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-[7px] font-black uppercase tracking-wide opacity-75">{label}</div>
        <span className={`h-2.5 w-2.5 rounded-full ${tone === "amber" ? "bg-amber-300" : tone === "violet" ? "bg-violet-300" : "bg-cyan-300"}`} />
      </div>
      <div className="mt-1 text-xl font-black text-white">{value}</div>
      <div className="text-[8px] leading-4 text-slate-500">{sub}</div>
      <div className="mt-1 text-[7px] font-black uppercase tracking-wide opacity-55">Click to {active ? "hide" : "show"}</div>
    </button>
  );
}

export default function TeamExecutionTrend({ team, canManage = false, onOpenAnalytics }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weekOf, setWeekOf] = useState(mondayIso());
  const [expected, setExpected] = useState("");
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState({ actual: true, expected: true, execution: true });

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
  const latestActual = useMemo(() => [...weeks].reverse().find((row) => hasValue(row?.actual_runs_per_game)) || null, [weeks]);
  const latestExpected = useMemo(() => [...weeks].reverse().find((row) => hasValue(row?.expected_runs_per_game)) || null, [weeks]);
  const latestExecution = useMemo(() => [...weeks].reverse().find((row) => hasValue(row?.team_execution_score ?? row?.team_player_score)) || null, [weeks]);

  const toggle = (key) => setVisible((current) => ({ ...current, [key]: !current[key] }));

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
        <ToggleMetric
          active={visible.actual}
          onClick={() => toggle("actual")}
          label="Actual runs/game"
          value={fmtRuns(latestActual?.actual_runs_per_game)}
          sub={latestActual ? `Latest · ${latestActual.label}` : "No finalized game week yet"}
          tone="cyan"
        />
        <ToggleMetric
          active={visible.expected}
          onClick={() => toggle("expected")}
          label="Expected runs/game"
          value={latestExpected ? fmtRuns(latestExpected.expected_runs_per_game) : "Not set"}
          sub={latestExpected ? `Latest target · ${latestExpected.label}` : "Set a lineup target below"}
          tone="amber"
        />
        <ToggleMetric
          active={visible.execution}
          onClick={() => toggle("execution")}
          label="Execution Score"
          value={fmtScore(latestExecution?.team_execution_score ?? latestExecution?.team_player_score)}
          sub={latestExecution ? `Latest graded · ${latestExecution.label}` : "No graded execution week yet"}
          tone="violet"
        />
      </div>

      <div className="mt-3 rounded-xl border border-white/8 bg-black/10 p-2">
        <div className="mb-2 flex flex-wrap items-center gap-1.5 px-1">
          <button type="button" onClick={() => toggle("actual")} className={`rounded-full border border-cyan-300/25 px-2.5 py-1 text-[8px] font-black ${visible.actual ? "bg-cyan-300/10 text-cyan-100" : "text-slate-600"}`}>● Actual runs/game</button>
          <button type="button" onClick={() => toggle("expected")} className={`rounded-full border border-amber-300/25 px-2.5 py-1 text-[8px] font-black ${visible.expected ? "bg-amber-300/10 text-amber-100" : "text-slate-600"}`}>● Expected runs/game{latestExpected ? "" : " · not set"}</button>
          <button type="button" onClick={() => toggle("execution")} className={`rounded-full border border-violet-300/25 px-2.5 py-1 text-[8px] font-black ${visible.execution ? "bg-violet-300/10 text-violet-100" : "text-slate-600"}`}>● Execution Score</button>
          <span className="ml-auto text-[7px] font-bold uppercase tracking-wide text-slate-600">Click any metric to show / hide</span>
        </div>
        <div className="h-64 w-full">
          {loading ? <div className="grid h-full place-items-center text-xs text-slate-600">Loading team trend…</div> : weeks.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeks} margin={{ top: 18, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.12)" />
                <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis
                  yAxisId="runs"
                  tick={{ fill: "#64748b", fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                  label={{ value: "Runs/game", angle: -90, position: "insideLeft", fill: "#475569", fontSize: 8 }}
                />
                <YAxis
                  yAxisId="score"
                  orientation="right"
                  domain={[0, 100]}
                  tick={{ fill: "#64748b", fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                  label={{ value: "Execution", angle: 90, position: "insideRight", fill: "#475569", fontSize: 8 }}
                />
                <Tooltip
                  contentStyle={{ background: "#07111f", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, fontSize: 11 }}
                  formatter={(value, name) => [name === "Execution Score" ? `${Number(value).toFixed(0)} / 100` : `${Number(value).toFixed(1)} runs/game`, name]}
                />
                {visible.actual ? <Line yAxisId="runs" type="monotone" dataKey="actual_runs_per_game" name="Actual runs/game" stroke="#67e8f9" strokeWidth={2.5} connectNulls dot={{ r: 4 }} activeDot={{ r: 6 }}>
                  <LabelList dataKey="actual_runs_per_game" position="top" fill="#67e8f9" fontSize={9} formatter={(value) => hasValue(value) ? Number(value).toFixed(1) : ""} />
                </Line> : null}
                {visible.expected ? <Line yAxisId="runs" type="monotone" dataKey="expected_runs_per_game" name="Expected runs/game" stroke="#fbbf24" strokeWidth={2.25} strokeDasharray="5 4" connectNulls dot={{ r: 4 }} activeDot={{ r: 6 }}>
                  <LabelList dataKey="expected_runs_per_game" position="bottom" fill="#fbbf24" fontSize={9} formatter={(value) => hasValue(value) ? Number(value).toFixed(1) : ""} />
                </Line> : null}
                {visible.execution ? <Line yAxisId="score" type="monotone" dataKey="team_execution_score" name="Execution Score" stroke="#a78bfa" strokeWidth={2.5} connectNulls dot={{ r: 4 }} activeDot={{ r: 6 }}>
                  <LabelList dataKey="team_execution_score" position="top" fill="#c4b5fd" fontSize={9} formatter={(value) => hasValue(value) ? Number(value).toFixed(0) : ""} />
                </Line> : null}
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="grid h-full place-items-center px-4 text-center text-[10px] leading-5 text-slate-600">Finalize games to build the weekly trend. Expected production can be entered now and compared as games are added.</div>}
        </div>
        {!latestExpected && !loading ? <div className="mt-1 rounded-lg border border-amber-300/15 bg-amber-300/[.045] px-2.5 py-1.5 text-[8px] text-amber-100">Expected runs/game has not been set yet, so there is no amber target line to plot. Enter the weekly target below and it will appear on the chart.</div> : null}
      </div>

      {canManage ? (
        <div className="mt-3 rounded-xl border border-white/8 bg-black/15 p-2.5">
          <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-wide text-slate-500"><TrendingUp className="h-3.5 w-3.5" />Set weekly lineup expectation</div>
          <div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2">
            <input type="date" value={weekOf} onChange={(event) => setWeekOf(event.target.value)} className="h-10 rounded-xl border border-white/10 bg-black/20 px-2 text-[10px] text-white outline-none" />
            <input inputMode="decimal" placeholder="Expected runs/game" value={expected} onChange={(event) => setExpected(event.target.value.replace(/[^0-9.]/g, ""))} className="h-10 rounded-xl border border-white/10 bg-black/20 px-2 text-[10px] text-white outline-none" />
            <button type="button" disabled={!expected || saving} onClick={saveTarget} className="min-h-10 rounded-xl bg-cyan-300 px-3 text-[9px] font-black text-slate-950 disabled:opacity-40"><Save className="mr-1 inline h-3.5 w-3.5" />{saving ? "Saving" : "Save"}</button>
          </div>
        </div>
      ) : null}

      {error ? <div className="mt-2 rounded-xl border border-rose-300/20 bg-rose-300/10 p-2 text-[9px] text-rose-100">{error}</div> : null}
    </section>
  );
}
