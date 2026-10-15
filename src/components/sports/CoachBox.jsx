import React, { useEffect, useMemo, useState } from "react";
import { BarChart3, ChevronDown, ChevronUp, Pencil, RefreshCw, RotateCcw, Save, Target, TrendingUp, Users, X } from "lucide-react";

import { getCoachBox, saveCoachBoxPlayer, snapshotCoachBox } from "../../api/wayAnalytics";

const fmtRate = (value) => value == null ? "—" : Number(value).toFixed(3).replace(/^0(?=\.)/, "");
const fmtRuns = (value) => Number(value || 0).toFixed(2);
const fmtWeek = (value) => {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};
const errorText = (error) => error?.response?.data?.detail || error?.message || "Coach Box could not be updated.";

function Metric({ label, value, sub, tone = "slate" }) {
  const tones = {
    slate: "border-white/10 bg-white/[.025] text-slate-100",
    cyan: "border-cyan-300/20 bg-cyan-300/[.07] text-cyan-100",
    amber: "border-amber-300/20 bg-amber-300/[.07] text-amber-100",
    green: "border-emerald-300/20 bg-emerald-300/[.07] text-emerald-100",
    violet: "border-violet-300/20 bg-violet-300/[.07] text-violet-100",
  };
  return <div className={`rounded-xl border p-2 ${tones[tone] || tones.slate}`}>
    <div className="text-[7px] font-black uppercase tracking-[.13em] opacity-55">{label}</div>
    <div className="mt-1 text-sm font-black">{value}</div>
    {sub ? <div className="mt-0.5 text-[7px] opacity-60">{sub}</div> : null}
  </div>;
}

function LineupDraft({ rows, unavailableIds, onToggleUnavailable }) {
  const unavailable = new Set((unavailableIds || []).map(Number));
  const available = (rows || []).filter((item) => !unavailable.has(Number(item.player?.id)));
  const top = available.slice(0, 10).map((item, index) => ({ ...item, displaySlot: index + 1 }));
  const depth = available.slice(10);
  const out = (rows || []).filter((item) => unavailable.has(Number(item.player?.id)));
  if (!top.length && !out.length) return null;

  return <section className="rounded-[1.2rem] border border-cyan-300/15 bg-black/20 p-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-[8px] font-black uppercase tracking-[.16em] text-cyan-300">Efficiency order</div>
        <h3 className="mt-1 text-sm font-black text-white">Best available 10-player offensive order</h3>
        <p className="mt-1 text-[9px] leading-4 text-slate-500">Tap the X on anyone who is out. The next-best available player immediately slides into the 10. This does not change the roster.</p>
      </div>
      <BarChart3 className="h-5 w-5 shrink-0 text-cyan-200" />
    </div>

    <div className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-5">
      {top.map((item) => <div key={item.player?.id} className="relative rounded-xl border border-white/8 bg-[#06101d] p-2.5 pr-9">
        <button
          type="button"
          onClick={() => onToggleUnavailable?.(item.player?.id)}
          className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-lg border border-rose-300/15 bg-rose-300/[.05] text-rose-200 hover:bg-rose-300/10"
          aria-label={`Mark ${item.player?.display_name || "player"} unavailable`}
          title="Unavailable today"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-cyan-300 text-[10px] font-black text-slate-950">{item.displaySlot}</span>
          <div className="min-w-0">
            <div className="truncate text-[10px] font-black text-white">{item.player?.display_name}</div>
            <div className="truncate text-[7px] font-bold uppercase tracking-wide text-slate-500">{item.role}</div>
          </div>
        </div>
      </div>)}
    </div>

    {depth.length ? <div className="mt-2 rounded-lg border border-white/8 bg-white/[.02] px-2.5 py-2 text-[8px] leading-4 text-slate-500"><b className="text-slate-300">Next best options:</b> {depth.map((item) => item.player?.display_name).filter(Boolean).join(" · ")}</div> : null}

    {out.length ? <div className="mt-2 rounded-xl border border-rose-300/15 bg-rose-300/[.04] p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[7px] font-black uppercase tracking-[.14em] text-rose-200">Unavailable for this lineup</div>
        <button type="button" onClick={() => out.forEach((item) => onToggleUnavailable?.(item.player?.id, true))} className="inline-flex items-center gap-1 text-[7px] font-black uppercase tracking-wide text-slate-400"><RotateCcw className="h-3 w-3" />Restore all</button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">{out.map((item) => <button key={item.player?.id} type="button" onClick={() => onToggleUnavailable?.(item.player?.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-[8px] font-bold text-slate-300"><RotateCcw className="h-3 w-3" />{item.player?.display_name}</button>)}</div>
    </div> : null}
  </section>;
}

function PlayerCoachCard({ row, weekOf, onSaved }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [role, setRole] = useState(row?.effective_role || row?.recommended_role || "");
  const [slots, setSlots] = useState(row?.effective_slots || row?.recommended_slots || "");
  const [focus, setFocus] = useState(row?.focus?.key || "");
  const [note, setNote] = useState(row?.coach_note || "");

  useEffect(() => {
    setRole(row?.effective_role || row?.recommended_role || "");
    setSlots(row?.effective_slots || row?.recommended_slots || "");
    setFocus(row?.focus?.key || "");
    setNote(row?.coach_note || "");
  }, [row?.player?.id, row?.effective_role, row?.effective_slots, row?.focus?.key, row?.coach_note]);

  const focusRow = row?.focus || {};
  const history = Array.isArray(row?.history) ? row.history : [];

  async function save() {
    setBusy(true); setError("");
    try {
      const result = await saveCoachBoxPlayer(row.player.team || row.team_id || row._teamId, {
        player: row.player.id,
        week_of: weekOf,
        role_override: role === row.recommended_role ? "" : role,
        slots_override: slots === row.recommended_slots ? "" : slots,
        focus_override: focus === row.focus?.key && !row.has_override ? "" : focus,
        coach_note: note,
      });
      onSaved?.(result.saved);
      setEditing(false);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return <article className="overflow-hidden rounded-[1.2rem] border border-white/10 bg-[#050b14]">
    <button type="button" onClick={() => setOpen((value) => !value)} className="w-full p-3 text-left">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><b className="truncate text-sm text-white">{row.player?.display_name}</b><span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-0.5 text-[7px] font-black uppercase tracking-wide text-cyan-100">{row.effective_slots}</span>{row.has_override ? <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-2 py-0.5 text-[7px] font-black uppercase tracking-wide text-violet-100">Coach adjusted</span> : null}</div><div className="mt-1 text-[10px] font-black text-amber-100">{row.effective_role}</div><div className="mt-1 line-clamp-2 text-[9px] leading-4 text-slate-500">{row.role_reason}</div></div>
        {open ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-500" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />}
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        <Metric label="AVG" value={fmtRate(row.season_batting?.avg)} tone="cyan" />
        <Metric label="SIT+" value={row.situational_index == null ? "—" : Number(row.situational_index).toFixed(1)} tone="violet" />
        <Metric label="EXE" value={fmtRate(row.execution_average)} tone="green" />
        <Metric label="Gain" value={`+${fmtRuns(focusRow.projected_runs_per_game_low)}–${fmtRuns(focusRow.projected_runs_per_game_high)}`} sub="team runs/game" tone="amber" />
      </div>
    </button>

    {open ? <div className="border-t border-white/8 p-3">
      <div className="grid gap-2 lg:grid-cols-3">
        <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[.05] p-3"><div className="text-[7px] font-black uppercase tracking-[.14em] text-emerald-300">Best current value</div><div className="mt-1 text-xs font-black text-white">{row.strength?.label || "Need more data"}</div>{row.strength?.value != null ? <div className="mt-1 text-sm font-black text-emerald-100">{fmtRate(row.strength.value)}</div> : null}</div>
        <div className="rounded-xl border border-amber-300/15 bg-amber-300/[.05] p-3"><div className="text-[7px] font-black uppercase tracking-[.14em] text-amber-300">Next lever</div><div className="mt-1 text-xs font-black text-white">{focusRow.label}</div><div className="mt-1 text-[9px] text-slate-400">{focusRow.current == null ? "Need more data" : `${fmtRate(focusRow.current)} → target ${fmtRate(focusRow.target)}`}</div></div>
        <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[.05] p-3"><div className="text-[7px] font-black uppercase tracking-[.14em] text-cyan-300">Modeled upside</div><div className="mt-1 text-xs font-black text-white">+{fmtRuns(focusRow.projected_runs_per_game_low)}–{fmtRuns(focusRow.projected_runs_per_game_high)} runs/game</div><div className="mt-1 text-[9px] text-slate-400">~+{Number(focusRow.projected_runs_per_10_games_low || 0).toFixed(1)}–{Number(focusRow.projected_runs_per_10_games_high || 0).toFixed(1)} team runs / 10 games</div></div>
      </div>

      <div className="mt-2 rounded-xl border border-white/10 bg-white/[.025] p-3"><div className="flex items-center gap-1 text-[7px] font-black uppercase tracking-[.14em] text-slate-500"><Target className="h-3 w-3" />What to coach</div><p className="mt-1 text-[10px] leading-5 text-slate-300">{focusRow.action}</p></div>

      {row.coach_note ? <div className="mt-2 rounded-xl border border-violet-300/15 bg-violet-300/[.05] p-3"><div className="text-[7px] font-black uppercase tracking-[.14em] text-violet-300">Private coach note</div><p className="mt-1 text-[10px] leading-5 text-violet-100">{row.coach_note}</p></div> : null}

      {history.length ? <div className="mt-3"><div className="text-[7px] font-black uppercase tracking-[.14em] text-slate-500">Week-to-week</div><div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1">{history.map((item, index) => <div key={`${item.week_of}-${index}`} className="min-w-[10rem] rounded-xl border border-white/8 bg-black/20 p-2"><div className="text-[8px] font-black text-cyan-200">Week of {fmtWeek(item.week_of)}</div><div className="mt-1 text-[8px] font-bold text-slate-300">{item.role} · {item.slots}</div><div className="mt-1 text-[7px] text-slate-500">Focus: {item.focus_label || item.focus_key || "—"}</div><div className="mt-1 text-[7px] text-amber-200">+{fmtRuns(item.projected_runs_per_game_low)}–{fmtRuns(item.projected_runs_per_game_high)} runs/g</div></div>)}</div></div> : null}

      <div className="mt-3 flex items-center justify-end gap-2"><button type="button" onClick={() => setEditing((value) => !value)} className="min-h-9 rounded-xl border border-white/10 px-3 text-[9px] font-black text-slate-300"><Pencil className="mr-1 inline h-3.5 w-3.5" />Adjust plan</button></div>
      {editing ? <div className="mt-2 rounded-xl border border-violet-300/15 bg-violet-300/[.04] p-3">
        <div className="grid gap-2 sm:grid-cols-2"><label><span className="mb-1 block text-[7px] font-black uppercase tracking-wide text-slate-500">Lineup role</span><input value={role} onChange={(event) => setRole(event.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-xs text-white outline-none" /></label><label><span className="mb-1 block text-[7px] font-black uppercase tracking-wide text-slate-500">Best slots / range</span><input value={slots} onChange={(event) => setSlots(event.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-xs text-white outline-none" /></label></div>
        <label className="mt-2 block"><span className="mb-1 block text-[7px] font-black uppercase tracking-wide text-slate-500">Development focus</span><select value={focus} onChange={(event) => setFocus(event.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-[#050b14] px-3 text-xs text-white outline-none">{(row.focus_options || []).map((item) => <option key={item.key} value={item.key}>{item.label} · {item.current == null ? "—" : fmtRate(item.current)} → {item.target == null ? "—" : fmtRate(item.target)}</option>)}</select></label>
        <label className="mt-2 block"><span className="mb-1 block text-[7px] font-black uppercase tracking-wide text-slate-500">Private coach note</span><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white outline-none" placeholder="What did you see? What do we want this player working on this week?" /></label>
        {error ? <div className="mt-2 text-[9px] text-rose-200">{error}</div> : null}
        <div className="mt-2 flex justify-end"><button type="button" disabled={busy} onClick={save} className="min-h-10 rounded-xl bg-violet-300 px-4 text-[9px] font-black text-slate-950 disabled:opacity-40"><Save className="mr-1 inline h-3.5 w-3.5" />{busy ? "Saving…" : "Save coach plan"}</button></div>
      </div> : null}
    </div> : null}
  </article>;
}

export default function CoachBox({ team, canManage = true }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [unavailableIds, setUnavailableIds] = useState([]);

  const teamId = Number(team?.id || 0);
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const order = Array.isArray(data?.suggested_order) ? data.suggested_order : [];
  const enrichedRows = useMemo(() => rows.map((row) => ({ ...row, player: { ...(row.player || {}), team: teamId }, _teamId: teamId })), [rows, teamId]);

  async function load({ snapshot = canManage } = {}) {
    if (!teamId) return;
    setError("");
    try {
      const result = snapshot ? await snapshotCoachBox(teamId) : await getCoachBox(teamId);
      setData(result);
    } catch (err) {
      if (snapshot) {
        try { setData(await getCoachBox(teamId)); return; } catch (fallback) { setError(errorText(fallback)); return; }
      }
      setError(errorText(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { setLoading(true); setUnavailableIds([]); load({ snapshot: canManage }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [teamId, canManage]);

  function replaceRow(saved) {
    if (!saved) return;
    setData((current) => ({ ...current, rows: (current?.rows || []).map((row) => Number(row.player?.id) === Number(saved.player?.id) ? saved : row) }));
    setRefreshing(true);
    load({ snapshot: false });
  }

  function toggleUnavailable(playerId, restoringAll = false) {
    const id = Number(playerId);
    if (!id) return;
    if (restoringAll) {
      setUnavailableIds([]);
      return;
    }
    setUnavailableIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  if (!teamId || !canManage) return null;
  return <section className="mx-auto max-w-6xl rounded-[1.45rem] border border-violet-300/18 bg-[radial-gradient(circle_at_100%_0%,rgba(139,92,246,.14),transparent_30%),linear-gradient(145deg,#07111f,#040a12)] p-3.5 text-white shadow-[0_16px_50px_rgba(0,0,0,.28)] sm:p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0"><div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[.17em] text-violet-300"><Users className="h-3.5 w-3.5" />Coach only</div><h2 className="mt-1 text-lg font-black tracking-tight">Coach Box</h2><p className="mt-1 max-w-3xl text-[10px] leading-5 text-slate-400">Build the best available order, identify each player’s role, and track the one improvement most likely to unlock more team runs.</p></div>
      <button type="button" disabled={refreshing} onClick={() => { setRefreshing(true); load({ snapshot: true }); }} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.035] text-slate-300 disabled:opacity-40" aria-label="Refresh Coach Box"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /></button>
    </div>

    {loading ? <div className="mt-4 rounded-xl border border-white/10 p-5 text-center text-xs text-slate-500">Building this week’s coach plan…</div> : null}
    {error ? <div className="mt-3 rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-[10px] text-rose-100">{error}</div> : null}
    {!loading && data ? <div className="mt-4 space-y-3">
      <LineupDraft rows={order} unavailableIds={unavailableIds} onToggleUnavailable={toggleUnavailable} />
      <div className="grid grid-cols-3 gap-1.5"><Metric label="Team AVG" value={fmtRate(data.team?.season_batting?.avg)} tone="cyan" /><Metric label="Team EXE" value={fmtRate(data.team?.execution_average)} tone="green" /><Metric label="Week" value={fmtWeek(data.week_of)} tone="violet" /></div>
      <div className="space-y-2">{enrichedRows.map((row) => <PlayerCoachCard key={row.player?.id} row={row} weekOf={data.week_of} onSaved={replaceRow} />)}</div>
      <div className="rounded-xl border border-white/8 bg-black/20 p-3 text-[8px] leading-4 text-slate-500"><TrendingUp className="mr-1 inline h-3.5 w-3.5 text-amber-300" />{data.projection_note}</div>
    </div> : null}
  </section>;
}
