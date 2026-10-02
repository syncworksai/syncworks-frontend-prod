import React, { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Save } from "lucide-react";

import { adjustScopedTeamStats, getScopedTeamStats } from "../../api/sports";

const list = (value) => (Array.isArray(value) ? value : []);
const num = (value) => Number(value || 0);
const pct = (value) => num(value).toFixed(3).replace(/^0(?=\.)/, "");

const EDITABLE = [
  ["games", "g", "G"],
  ["pa", "pa", "PA"],
  ["ab", "ab", "AB"],
  ["hits", "h", "H"],
  ["doubles", "double", "2B"],
  ["triples", "triple", "3B"],
  ["home_runs", "hr", "HR"],
  ["walks", "bb", "BB"],
  ["sac_flies", "sf", "SF"],
  ["double_plays", "gidp", "GIDP"],
  ["rbi", "rbi", "RBI"],
  ["runs", "runs", "R"],
];

function draftFromRow(row) {
  return Object.fromEntries(EDITABLE.map(([field, key]) => [field, String(num(row?.[key]))]));
}

function normalizedDraft(draft) {
  return Object.fromEntries(
    EDITABLE.map(([field]) => [field, Math.max(0, Number.parseInt(draft?.[field] || "0", 10) || 0)]),
  );
}

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

function sameDraft(row, draft) {
  return EDITABLE.every(([field, key]) => num(row?.[key]) === num(draft?.[field]));
}

export default function EditableStatsGrid({ teamId, initialScope = "COMBINED", onSaved }) {
  const [scope, setScope] = useState(
    initialScope === "TOURNAMENT" ? "TOURNAMENT" : initialScope === "LEAGUE" ? "LEAGUE" : "COMBINED",
  );
  const [rows, setRows] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [savingAll, setSavingAll] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load(targetScope = scope) {
    if (!teamId) return;
    setLoading(true);
    setError("");
    try {
      const data = await getScopedTeamStats(teamId, targetScope === "COMBINED" ? "ALL" : targetScope);
      const nextRows = list(data?.rows);
      setRows(nextRows);
      setDrafts(Object.fromEntries(nextRows.map((row) => [Number(row.player?.id), draftFromRow(row)])));
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Stats could not load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(scope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, scope]);

  const changedIds = useMemo(
    () => rows.filter((row) => !sameDraft(row, drafts[Number(row.player?.id)])).map((row) => Number(row.player?.id)),
    [rows, drafts],
  );

  function change(playerId, field, value) {
    const clean = String(value ?? "").replace(/[^0-9]/g, "");
    setDrafts((current) => ({
      ...current,
      [playerId]: { ...(current[playerId] || {}), [field]: clean },
    }));
    setNotice("");
  }

  async function saveRow(row, { quiet = false } = {}) {
    const playerId = Number(row.player?.id);
    const draft = drafts[playerId] || draftFromRow(row);
    const target = normalizedDraft(draft);
    if (target.hits > target.ab) throw new Error("Hits cannot exceed at-bats.");
    if (target.doubles + target.triples + target.home_runs > target.hits) {
      throw new Error("2B + 3B + HR cannot exceed total hits.");
    }

    setSaving((current) => ({ ...current, [playerId]: true }));
    if (!quiet) { setError(""); setNotice(""); }
    try {
      const result = await adjustScopedTeamStats(
        teamId,
        playerId,
        scope,
        target,
        "Coach-adjusted totals from the editable stats grid",
      );
      const saved = result?.row || row;
      setRows((current) => current.map((item) => Number(item.player?.id) === playerId ? saved : item));
      setDrafts((current) => ({ ...current, [playerId]: draftFromRow(saved) }));
      if (!quiet) {
        await onSaved?.(saved, scope, result);
        setNotice(`${row.player?.display_name || "Player"} updated. Lineup, leaders and earned badges now recalculate from these totals.`);
      }
      return saved;
    } finally {
      setSaving((current) => ({ ...current, [playerId]: false }));
    }
  }

  async function saveAll() {
    if (!changedIds.length || savingAll) return;
    setSavingAll(true);
    setError("");
    setNotice("");
    try {
      for (const playerId of changedIds) {
        const row = rows.find((item) => Number(item.player?.id) === playerId);
        if (row) await saveRow(row, { quiet: true });
      }
      await onSaved?.(null, scope, { bulk: true });
      setNotice(`${changedIds.length} player${changedIds.length === 1 ? "" : "s"} updated. Team leaders, league leaders, lineup stats and badges are recalculated.`);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "One of the stat rows could not be saved.");
    } finally {
      setSavingAll(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[.035] p-3">
        <div className="text-[9px] font-black uppercase tracking-[.14em] text-cyan-300">Editable totals</div>
        <p className="mt-1 text-[10px] leading-5 text-slate-300">
          Every row starts with what SyncWorks has now. Type the total that should be in any counting-stat column and save the row. 1B, TB, AVG, OBP, SLG and OPS recalculate automatically.
        </p>
        <p className="mt-1 text-[9px] leading-4 text-slate-500">
          Corrections stay auditable. Combined edits fix season totals without inventing a League/Tournament split; scoped edits update that competition directly. The original Game Book is never deleted, and verified totals flow into lineup stats, leaders and earned Power/Contact badges.
        </p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {["COMBINED", "LEAGUE", "TOURNAMENT"].map((value) => (
            <button
              key={value}
              type="button"
              disabled={loading || savingAll}
              onClick={() => setScope(value)}
              className={`min-h-10 rounded-xl px-3 text-[9px] font-black ${scope === value ? "bg-cyan-300 text-slate-950" : "border border-white/10 text-slate-400"}`}
            >
              {value === "COMBINED" ? "Combined" : value === "LEAGUE" ? "League" : "Tournament"}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={!changedIds.length || savingAll || loading}
          onClick={saveAll}
          className="min-h-10 rounded-xl bg-emerald-300 px-3 text-[9px] font-black text-slate-950 disabled:opacity-35"
        >
          {savingAll ? <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 inline h-3.5 w-3.5" />}
          Save all {changedIds.length ? `(${changedIds.length})` : ""}
        </button>
      </div>

      {error ? <div className="rounded-xl border border-rose-300/20 bg-rose-300/10 p-2.5 text-[10px] text-rose-100">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-2.5 text-[10px] text-emerald-100">{notice}</div> : null}

      {loading ? (
        <div className="grid min-h-44 place-items-center rounded-xl border border-white/10 bg-black/15">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#050b14]">
          <table className="min-w-[1480px] border-collapse text-center text-[9px]">
            <thead className="sticky top-0 z-30 bg-[#091421] text-slate-500">
              <tr>
                <th className="sticky left-0 z-40 min-w-[13rem] border-r border-white/10 bg-[#091421] px-3 py-2 text-left">PLAYER / SAVE</th>
                {EDITABLE.map(([field,,label]) => <th key={field} className="min-w-[4.8rem] border-l border-white/5 px-1 py-2">{label}</th>)}
                <th className="min-w-[4.8rem] border-l border-violet-300/10 px-2 py-2 text-violet-200">1B</th>
                <th className="min-w-[4.8rem] border-l border-violet-300/10 px-2 py-2 text-violet-200">TB</th>
                <th className="min-w-[4.8rem] border-l border-violet-300/10 px-2 py-2 text-violet-200">AVG</th>
                <th className="min-w-[4.8rem] border-l border-violet-300/10 px-2 py-2 text-violet-200">OBP</th>
                <th className="min-w-[4.8rem] border-l border-violet-300/10 px-2 py-2 text-violet-200">SLG</th>
                <th className="min-w-[4.8rem] border-l border-violet-300/10 px-2 py-2 text-violet-200">OPS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const playerId = Number(row.player?.id);
                const draft = drafts[playerId] || draftFromRow(row);
                const calc = derived(draft);
                const changed = !sameDraft(row, draft);
                const rowSaving = !!saving[playerId];
                return (
                  <tr key={playerId} className={`border-t border-white/5 ${changed ? "bg-amber-300/[.035]" : ""}`}>
                    <td className="sticky left-0 z-20 border-r border-white/10 bg-[#07111f] px-2 py-2 text-left">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <b className="block truncate text-[10px] text-white">#{row.player?.jersey_number || "—"} {row.player?.display_name}</b>
                          <span className="text-[7px] text-slate-600">{row.player?.primary_position || "—"} · {changed ? "edited" : "current"}</span>
                        </div>
                        <button
                          type="button"
                          disabled={!changed || rowSaving || savingAll}
                          onClick={() => saveRow(row).catch((err) => setError(err?.response?.data?.detail || err?.message || "Stats could not save."))}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-emerald-300/20 bg-emerald-300/[.06] text-emerald-100 disabled:opacity-25"
                          aria-label={`Save stats for ${row.player?.display_name || "player"}`}
                        >
                          {rowSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                    {EDITABLE.map(([field,,label]) => (
                      <td key={field} className="border-l border-white/5 p-1">
                        <input
                          aria-label={`${row.player?.display_name || "Player"} ${label}`}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={draft[field] ?? ""}
                          onChange={(event) => change(playerId, field, event.target.value)}
                          className={`h-10 w-full rounded-lg border bg-black/25 px-1 text-center text-[14px] font-black outline-none sm:text-[11px] ${num(draft[field]) !== num(row?.[EDITABLE.find(([name]) => name === field)?.[1]]) ? "border-amber-300/35 text-amber-100" : "border-white/10 text-white"} focus:border-cyan-300/45`}
                        />
                      </td>
                    ))}
                    <td className="border-l border-violet-300/10 px-2 font-black text-violet-100">{calc.single}</td>
                    <td className="border-l border-violet-300/10 px-2 font-black text-violet-100">{calc.tb}</td>
                    <td className="border-l border-violet-300/10 px-2 font-black text-cyan-100">{pct(calc.avg)}</td>
                    <td className="border-l border-violet-300/10 px-2 font-black text-cyan-100">{pct(calc.obp)}</td>
                    <td className="border-l border-violet-300/10 px-2 font-black text-cyan-100">{pct(calc.slg)}</td>
                    <td className="border-l border-violet-300/10 px-2 font-black text-cyan-100">{pct(calc.ops)}</td>
                  </tr>
                );
              })}
              {!rows.length ? <tr><td colSpan={EDITABLE.length + 7} className="p-6 text-center text-xs text-slate-500">No active players found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-[8px] leading-4 text-slate-600">
        Swipe left/right on mobile. The player/save column stays pinned. Use Combined for verified season totals, then League or Tournament when you know the competition-specific split.
      </div>
    </div>
  );
}
