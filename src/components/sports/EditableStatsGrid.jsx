import React, { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Plus, Save, X } from "lucide-react";

import { adjustScopedTeamStats, createStatLedgerEntry, getScopedTeamStats } from "../../api/sports";
import { getExecutionTotals, getWayRatings, rateWayPlayer, saveExecutionTotal } from "../../api/wayAnalytics";

const list = (value) => (Array.isArray(value) ? value : []);
const num = (value) => Number(value || 0);
const pct = (value) => num(value).toFixed(3).replace(/^0(?=\.)/, "");

const EDITABLE = [
  ["games", "g", "G"], ["pa", "pa", "PA"], ["ab", "ab", "AB"], ["hits", "h", "H"],
  ["doubles", "double", "2B"], ["triples", "triple", "3B"], ["home_runs", "hr", "HR"],
  ["walks", "bb", "BB"], ["sac_flies", "sf", "SF"], ["double_plays", "gidp", "GIDP"],
  ["rbi", "rbi", "RBI"], ["runs", "runs", "R"],
];

const blankQuick = () => Object.fromEntries(EDITABLE.map(([field]) => [field, ""]));
const draftFromRow = (row) => Object.fromEntries(EDITABLE.map(([field, key]) => [field, String(num(row?.[key]))]));
const normalizedDraft = (draft) => Object.fromEntries(EDITABLE.map(([field]) => [field, Math.max(0, Number.parseInt(draft?.[field] || "0", 10) || 0)]));

function derived(draft) {
  const row = normalizedDraft(draft);
  const single = Math.max(0, row.hits - row.doubles - row.triples - row.home_runs);
  const tb = single + 2 * row.doubles + 3 * row.triples + 4 * row.home_runs;
  const avg = row.ab ? row.hits / row.ab : 0;
  const obpDen = row.ab + row.walks + row.sac_flies;
  const obp = obpDen ? (row.hits + row.walks) / obpDen : 0;
  const slg = row.ab ? tb / row.ab : 0;
  return { single, tb, avg, obp, slg, ops: obp + slg };
}

const sameDraft = (row, draft) => EDITABLE.every(([field, key]) => num(row?.[key]) === num(draft?.[field]));

function QuickAddModal({ row, scope, onClose, onSaved }) {
  const [draft, setDraft] = useState(blankQuick);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const change = (field, value) => setDraft((current) => ({ ...current, [field]: String(value || "").replace(/[^0-9]/g, "") }));
  const additions = normalizedDraft(draft);
  const hasValue = Object.values(additions).some((value) => value > 0);

  async function save() {
    if (!hasValue) return;
    if (additions.hits > additions.ab) return setError("Hits cannot exceed at-bats in this added line.");
    if (additions.doubles + additions.triples + additions.home_runs > additions.hits) return setError("2B + 3B + HR cannot exceed hits in this added line.");
    setSaving(true); setError("");
    try {
      await createStatLedgerEntry({ team: row.team, player: row.player?.id, scope, source: "MANUAL", note: "Quick add from scorebook", ...additions });
      await onSaved?.();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || Object.values(err?.response?.data || {})?.flat?.()?.[0] || err?.message || "Quick stats could not save.");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[800] flex items-end justify-center bg-black/80 p-2 backdrop-blur-sm sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="w-full max-w-xl rounded-[1.4rem] border border-cyan-300/20 bg-[#07111f] p-4 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-3"><div><div className="text-[8px] font-black uppercase tracking-[.16em] text-cyan-300">Quick add · {scope}</div><h2 className="mt-1 text-lg font-black">{row.player?.display_name}</h2><p className="mt-1 text-[10px] text-slate-500">Enter only what this book/game adds. Existing totals stay intact.</p></div><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10"><X className="h-4 w-4" /></button></div>
        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">{EDITABLE.map(([field,,label]) => <label key={field} className="block"><span className="mb-1 block text-center text-[7px] font-black text-slate-500">{label}</span><input inputMode="numeric" pattern="[0-9]*" value={draft[field]} onChange={(event) => change(field, event.target.value)} placeholder="0" className="h-10 w-full rounded-xl border border-white/10 bg-black/25 px-1 text-center text-sm font-black text-white outline-none focus:border-cyan-300/40" /></label>)}</div>
        {error ? <div className="mt-3 rounded-xl border border-rose-300/20 bg-rose-300/10 p-2 text-[9px] text-rose-100">{error}</div> : null}
        <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-white/10 text-xs font-black text-slate-300">Cancel</button><button type="button" disabled={!hasValue || saving} onClick={save} className="min-h-11 rounded-xl bg-cyan-300 text-xs font-black text-slate-950 disabled:opacity-40">{saving ? <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> : <Plus className="mr-1 inline h-4 w-4" />}Add to totals</button></div>
      </section>
    </div>
  );
}

export default function EditableStatsGrid({ teamId, initialScope = "COMBINED", onSaved }) {
  const [scope, setScope] = useState(initialScope === "TOURNAMENT" ? "TOURNAMENT" : initialScope === "LEAGUE" ? "LEAGUE" : "COMBINED");
  const [rows, setRows] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [executionRows, setExecutionRows] = useState({});
  const [executionDrafts, setExecutionDrafts] = useState({});
  const [executionTeam, setExecutionTeam] = useState(null);
  const [gradeByPlayer, setGradeByPlayer] = useState({});
  const [quickRow, setQuickRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [savingGrade, setSavingGrade] = useState({});
  const [savingExecution, setSavingExecution] = useState({});
  const [savingAll, setSavingAll] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load(targetScope = scope) {
    if (!teamId) return;
    setLoading(true); setError("");
    try {
      const [statsResult, executionResult, ratingResult] = await Promise.allSettled([
        getScopedTeamStats(teamId, targetScope === "COMBINED" ? "ALL" : targetScope),
        getExecutionTotals(teamId),
        getWayRatings(teamId),
      ]);
      if (statsResult.status !== "fulfilled") throw statsResult.reason;
      const nextRows = list(statsResult.value?.rows).map((row) => ({ ...row, team: Number(teamId) }));
      setRows(nextRows);
      setDrafts(Object.fromEntries(nextRows.map((row) => [Number(row.player?.id), draftFromRow(row)])));
      if (executionResult.status === "fulfilled") {
        const byPlayer = Object.fromEntries(list(executionResult.value?.rows).map((item) => [Number(item.player?.id), item]));
        setExecutionRows(byPlayer);
        setExecutionDrafts(Object.fromEntries(Object.entries(byPlayer).map(([id, item]) => [Number(id), item.execution_points == null ? "" : String(item.execution_points)])));
        setExecutionTeam(executionResult.value?.team || null);
      }
      if (ratingResult.status === "fulfilled") {
        const grades = list(ratingResult.value?.ratings).filter((item) => item.metric_key === "PLAYER_GRADE");
        setGradeByPlayer(Object.fromEntries(grades.map((item) => [Number(item.player), Number(item.value)])));
      }
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Stats could not load.");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(scope); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [teamId, scope]);
  const changedIds = useMemo(() => rows.filter((row) => !sameDraft(row, drafts[Number(row.player?.id)])).map((row) => Number(row.player?.id)), [rows, drafts]);

  function change(playerId, field, value) {
    const clean = String(value ?? "").replace(/[^0-9]/g, "");
    setDrafts((current) => ({ ...current, [playerId]: { ...(current[playerId] || {}), [field]: clean } }));
    setNotice("");
  }

  async function saveExecution(playerId) {
    const raw = String(executionDrafts[playerId] ?? "").trim();
    if (!raw) return;
    const points = Number(raw);
    if (!Number.isFinite(points) || points < 0) return setError("Execution points must be zero or greater.");
    const current = executionRows[playerId]?.execution_points;
    if (current != null && Number(current) === points) return;
    setSavingExecution((value) => ({ ...value, [playerId]: true })); setError("");
    try {
      await saveExecutionTotal(teamId, { player: playerId, points, note: "Coach-adjusted all-games execution total" });
      await load(scope);
      setNotice("Execution points saved. EXE% recalculated as Execution Points ÷ all-games PA.");
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Execution points could not save.");
    } finally { setSavingExecution((value) => ({ ...value, [playerId]: false })); }
  }

  async function saveGrade(playerId, value) {
    if (!value) return;
    setSavingGrade((current) => ({ ...current, [playerId]: true })); setError("");
    try {
      await rateWayPlayer(teamId, { player: playerId, metric_key: "PLAYER_GRADE", value: Number(value) });
      setGradeByPlayer((current) => ({ ...current, [playerId]: Number(value) }));
      setNotice("Coach Grade saved on the 1–10 scale. It stays separate from Stats and EXE%.");
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Coach Grade could not save.");
    } finally { setSavingGrade((current) => ({ ...current, [playerId]: false })); }
  }

  async function saveRow(row, { quiet = false } = {}) {
    const playerId = Number(row.player?.id);
    const draft = drafts[playerId] || draftFromRow(row);
    const target = normalizedDraft(draft);
    if (target.hits > target.ab) throw new Error("Hits cannot exceed at-bats.");
    if (target.doubles + target.triples + target.home_runs > target.hits) throw new Error("2B + 3B + HR cannot exceed total hits.");
    setSaving((current) => ({ ...current, [playerId]: true }));
    if (!quiet) { setError(""); setNotice(""); }
    try {
      const result = await adjustScopedTeamStats(teamId, playerId, scope, target, "Coach-adjusted totals from the editable stats grid");
      const saved = { ...(result?.row || row), team: Number(teamId) };
      setRows((current) => current.map((item) => Number(item.player?.id) === playerId ? saved : item));
      setDrafts((current) => ({ ...current, [playerId]: draftFromRow(saved) }));
      if (!quiet) { await onSaved?.(saved, scope, result); await load(scope); setNotice(`${row.player?.display_name || "Player"} totals updated.`); }
      return saved;
    } finally { setSaving((current) => ({ ...current, [playerId]: false })); }
  }

  async function saveAll() {
    if (!changedIds.length || savingAll) return;
    setSavingAll(true); setError(""); setNotice("");
    try {
      for (const playerId of changedIds) {
        const row = rows.find((item) => Number(item.player?.id) === playerId);
        if (row) await saveRow(row, { quiet: true });
      }
      await onSaved?.(null, scope, { bulk: true }); await load(scope);
      setNotice(`${changedIds.length} player${changedIds.length === 1 ? "" : "s"} updated.`);
    } catch (err) { setError(err?.response?.data?.detail || err?.message || "One of the stat rows could not be saved."); }
    finally { setSavingAll(false); }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[.035] p-3">
        <div className="text-[9px] font-black uppercase tracking-[.14em] text-cyan-300">Stats + team standard</div>
        <p className="mt-1 text-[10px] leading-5 text-slate-300">Stats stay intact. <b className="text-white">Execution Points</b> are kept like hits; <b className="text-white">EXE%</b> is Execution Points ÷ all-games plate appearances. Coach Grade remains a separate 1–10 evaluation.</p>
        <p className="mt-1 text-[9px] font-bold text-cyan-100">The question isn't whether you got a hit. Did you make us better?</p>
        {executionTeam ? <div className="mt-3 grid grid-cols-3 gap-2"><div className="rounded-lg border border-white/8 bg-black/15 p-2"><div className="text-[7px] font-black text-slate-500">TEAM EXE%</div><div className="mt-1 text-lg font-black text-cyan-100">{executionTeam.execution_average == null ? "—" : pct(executionTeam.execution_average)}</div></div><div className="rounded-lg border border-white/8 bg-black/15 p-2"><div className="text-[7px] font-black text-slate-500">TEAM BA</div><div className="mt-1 text-lg font-black text-white">{pct(executionTeam.ba)}</div></div><div className="rounded-lg border border-white/8 bg-black/15 p-2"><div className="text-[7px] font-black text-slate-500">EXEC PTS / PA</div><div className="mt-1 text-sm font-black text-white">{executionTeam.execution_points ?? 0} / {executionTeam.pa ?? 0}</div></div></div> : null}
      </div>

      <div className="flex items-center justify-between gap-2"><div className="flex gap-1.5">{["COMBINED", "LEAGUE", "TOURNAMENT"].map((value) => <button key={value} type="button" disabled={loading || savingAll} onClick={() => setScope(value)} className={`min-h-10 rounded-xl px-3 text-[9px] font-black ${scope === value ? "bg-cyan-300 text-slate-950" : "border border-white/10 text-slate-400"}`}>{value === "COMBINED" ? "Combined" : value === "LEAGUE" ? "League" : "Tournament"}</button>)}</div><button type="button" disabled={!changedIds.length || savingAll || loading} onClick={saveAll} className="min-h-10 rounded-xl bg-emerald-300 px-3 text-[9px] font-black text-slate-950 disabled:opacity-35">{savingAll ? <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 inline h-3.5 w-3.5" />}Save all {changedIds.length ? `(${changedIds.length})` : ""}</button></div>
      {error ? <div className="rounded-xl border border-rose-300/20 bg-rose-300/10 p-2.5 text-[10px] text-rose-100">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-2.5 text-[10px] text-emerald-100">{notice}</div> : null}

      {loading ? <div className="grid min-h-44 place-items-center rounded-xl border border-white/10 bg-black/15"><Loader2 className="h-6 w-6 animate-spin text-cyan-300" /></div> : <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#050b14]">
        <table className="min-w-[1780px] border-collapse text-center text-[9px]">
          <thead className="sticky top-0 z-30 bg-[#091421] text-slate-500"><tr><th className="sticky left-0 z-40 min-w-[15rem] border-r border-white/10 bg-[#091421] px-3 py-2 text-left">PLAYER / ADD / EDIT</th><th className="min-w-[6rem] border-l border-cyan-300/10 px-2 text-cyan-200">EXEC PTS</th><th className="min-w-[5rem] border-l border-cyan-300/10 px-2 text-cyan-200">EXE%</th><th className="min-w-[5rem] border-l border-white/10 px-2 text-white">BA ALL</th><th className="min-w-[6rem] border-l border-amber-300/10 px-2 text-amber-200">COACH 1–10</th>{EDITABLE.map(([field,,label]) => <th key={field} className="min-w-[4.8rem] border-l border-white/5 px-1 py-2">{label}</th>)}<th className="min-w-[4.8rem] border-l border-violet-300/10 px-2 py-2 text-violet-200">1B</th><th className="min-w-[4.8rem] border-l border-violet-300/10 px-2 py-2 text-violet-200">TB</th><th className="min-w-[4.8rem] border-l border-violet-300/10 px-2 py-2 text-violet-200">AVG</th><th className="min-w-[4.8rem] border-l border-violet-300/10 px-2 py-2 text-violet-200">OBP</th><th className="min-w-[4.8rem] border-l border-violet-300/10 px-2 py-2 text-violet-200">SLG</th><th className="min-w-[4.8rem] border-l border-violet-300/10 px-2 py-2 text-violet-200">OPS</th></tr></thead>
          <tbody>{rows.map((row) => {
            const playerId = Number(row.player?.id); const draft = drafts[playerId] || draftFromRow(row); const calc = derived(draft); const changed = !sameDraft(row, draft); const exec = executionRows[playerId]; const rowSaving = !!saving[playerId];
            return <tr key={playerId} className={`border-t border-white/5 ${changed ? "bg-amber-300/[.035]" : ""}`}>
              <td className="sticky left-0 z-20 border-r border-white/10 bg-[#07111f] px-2 py-2 text-left"><div className="flex items-center gap-2"><div className="min-w-0 flex-1"><b className="block truncate text-[10px] text-white">#{row.player?.jersey_number || "—"} {row.player?.display_name}</b><span className="text-[7px] text-slate-600">{row.player?.primary_position || "—"} · {changed ? "edited totals" : "current totals"}</span></div><button type="button" onClick={() => setQuickRow(row)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-cyan-300/20 bg-cyan-300/[.06] text-cyan-100" aria-label={`Quick add stats for ${row.player?.display_name || "player"}`}><Plus className="h-3.5 w-3.5" /></button><button type="button" disabled={!changed || rowSaving || savingAll} onClick={() => saveRow(row).catch((err) => setError(err?.response?.data?.detail || err?.message || "Stats could not save."))} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-emerald-300/20 bg-emerald-300/[.06] text-emerald-100 disabled:opacity-25" aria-label={`Save stats for ${row.player?.display_name || "player"}`}>{rowSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}</button></div></td>
              <td className="border-l border-cyan-300/10 p-1"><input inputMode="decimal" value={executionDrafts[playerId] ?? ""} onChange={(event) => setExecutionDrafts((current) => ({ ...current, [playerId]: event.target.value.replace(/[^0-9.]/g, "") }))} onBlur={() => saveExecution(playerId)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} placeholder="—" className="h-10 w-full rounded-lg border border-cyan-300/15 bg-black/25 px-1 text-center text-[12px] font-black text-cyan-100 outline-none focus:border-cyan-300/45" />{savingExecution[playerId] ? <Loader2 className="mx-auto mt-1 h-3 w-3 animate-spin text-cyan-300" /> : null}</td>
              <td className="border-l border-cyan-300/10 px-2"><div className="text-base font-black text-cyan-100">{exec?.execution_average == null ? "—" : pct(exec.execution_average)}</div><div className="text-[7px] text-slate-600">{exec?.pa ?? 0} PA</div></td>
              <td className="border-l border-white/10 px-2"><div className="text-base font-black text-white">{exec ? pct(exec.ba) : "—"}</div><div className="text-[7px] text-slate-600">all games</div></td>
              <td className="border-l border-amber-300/10 p-1"><select disabled={savingGrade[playerId]} value={gradeByPlayer[playerId] || ""} onChange={(event) => saveGrade(playerId, event.target.value)} className="h-10 w-full rounded-lg border border-amber-300/15 bg-black/25 px-1 text-center text-[12px] font-black text-amber-100 outline-none"><option value="">—</option>{Array.from({ length: 10 }, (_, i) => i + 1).map((value) => <option key={value} value={value}>{value}</option>)}</select></td>
              {EDITABLE.map(([field,,label]) => <td key={field} className="border-l border-white/5 p-1"><input aria-label={`${row.player?.display_name || "Player"} ${label}`} inputMode="numeric" pattern="[0-9]*" value={draft[field] ?? ""} onChange={(event) => change(playerId, field, event.target.value)} className={`h-10 w-full rounded-lg border bg-black/25 px-1 text-center text-[14px] font-black outline-none sm:text-[11px] ${num(draft[field]) !== num(row?.[EDITABLE.find(([name]) => name === field)?.[1]]) ? "border-amber-300/35 text-amber-100" : "border-white/10 text-white"} focus:border-cyan-300/45`} /></td>)}
              <td className="border-l border-violet-300/10 px-2 font-black text-violet-100">{calc.single}</td><td className="border-l border-violet-300/10 px-2 font-black text-violet-100">{calc.tb}</td><td className="border-l border-violet-300/10 px-2 font-black text-cyan-100">{pct(calc.avg)}</td><td className="border-l border-violet-300/10 px-2 font-black text-cyan-100">{pct(calc.obp)}</td><td className="border-l border-violet-300/10 px-2 font-black text-cyan-100">{pct(calc.slg)}</td><td className="border-l border-violet-300/10 px-2 font-black text-cyan-100">{pct(calc.ops)}</td>
            </tr>;
          })}{!rows.length ? <tr><td colSpan={EDITABLE.length + 11} className="p-6 text-center text-xs text-slate-500">No active players found.</td></tr> : null}</tbody>
        </table>
      </div>}
      <div className="text-[8px] leading-4 text-slate-600">EXE% and BA ALL always use all games, even when the stat grid is filtered to League or Tournament. Swipe left/right on mobile; the player controls stay pinned.</div>
      {quickRow ? <QuickAddModal row={quickRow} scope={scope} onClose={() => setQuickRow(null)} onSaved={async () => { await onSaved?.(); await load(scope); }} /> : null}
    </div>
  );
}
