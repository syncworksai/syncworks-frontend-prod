import React, { useMemo } from "react";
import { BookOpen, Camera, CheckCircle2, Edit3, Plus, ShieldAlert } from "lucide-react";

const n = (value) => Number(value || 0);
const HITS = new Set(["1B", "2B", "3B", "HR"]);

function Diamond({ result }) {
  const filled = result === "HR"
    ? ["top", "left", "right", "bottom"]
    : result === "3B"
      ? ["top", "left", "bottom"]
      : result === "2B"
        ? ["top", "right"]
        : ["1B", "BB", "ROE"].includes(result) ? ["right"] : [];
  const corners = [
    ["top", "50,5 64,19 50,33 36,19"],
    ["right", "65,20 79,34 65,48 51,34"],
    ["bottom", "50,35 64,49 50,63 36,49"],
    ["left", "35,20 49,34 35,48 21,34"],
  ];
  return <svg aria-hidden="true" viewBox="0 0 100 72" className="h-9 w-12 shrink-0">
    <path d="M50 5 79 34 50 63 21 34Z" fill="none" stroke="currentColor" strokeOpacity=".36" strokeWidth="1.6"/>
    {corners.map(([id, shape]) => <polygon key={id} points={shape}
      fill={filled.includes(id) ? "#67e8f9" : "transparent"} stroke={filled.includes(id) ? "#67e8f9" : "#64748b"}
      strokeWidth="1.3" strokeOpacity={filled.includes(id) ? "1" : ".45"}/>)}
  </svg>;
}

export default function DigitalScorebook({
  game,
  plays = [],
  bookPhotos = [],
  canScore = false,
  onEditPlay,
  onAddPlay,
  onUploadSource,
  onOpenPhoto,
}) {
  const innings = useMemo(() => {
    const max = Math.max(
      1, n(game?.innings_scheduled) || 7,
      ...plays.map((play) => n(play.inning)),
      ...(game?.inning_lines || []).map((line) => n(line.inning)),
    );
    return Array.from({ length: Math.min(20, max) }, (_, index) => index + 1);
  }, [game?.innings_scheduled, game?.inning_lines, plays]);

  const rows = useMemo(() => {
    const ordered = [...(game?.lineup_spots || [])].sort((a, b) => n(a.batting_order) - n(b.batting_order));
    const displayed = new Set(ordered.map((spot) => n(spot.player)));
    const extras = (game?.substitutions || []).flatMap((sub) => [
      { player: sub.outgoing_player, player_detail: sub.outgoing_player_detail, batting_order: sub.batting_order, sub_label: "OUT" },
      { player: sub.incoming_player, player_detail: sub.incoming_player_detail, batting_order: sub.batting_order, sub_label: "SUB" },
    ]).filter((sub) => {
      if (!sub.player || displayed.has(n(sub.player))) return false;
      displayed.add(n(sub.player));
      return true;
    });
    return [...ordered, ...extras].sort((a, b) => n(a.batting_order) - n(b.batting_order));
  }, [game?.lineup_spots, game?.substitutions]);

  const cellMap = useMemo(() => {
    const map = new Map();
    for (const play of plays) {
      const key = `${play.player}:${play.inning}`;
      const next = map.get(key) || [];
      next.push(play);
      map.set(key, next);
    }
    return map;
  }, [plays]);

  const firstReviewed = bookPhotos.find((photo) => ["REVIEWED", "VERIFIED"].includes(photo.review_status));
  const verifiedPhotos = bookPhotos.filter((photo) => photo.review_status === "VERIFIED").length;
  const attributed = plays.reduce((total, play) => total + n(play.runs_scored), 0);
  const unattributed = Math.max(0, n(game?.runs_for) - attributed);
  const hitCount = plays.filter((play) => HITS.has(play.result)).length;
  const inningMap = new Map((game?.inning_lines || []).map((line) => [n(line.inning), line]));
  const bases = (game?.bench_players || []).filter((player) => player.is_active !== false);

  return <section className="rounded-[1.4rem] border border-cyan-300/25 bg-[linear-gradient(155deg,rgba(34,211,238,.07),rgba(3,9,19,.98))] p-2.5 text-white sm:p-4">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.13em] text-cyan-300"><BookOpen className="h-4 w-4" />Official digital Game Book</div>
        <h2 className="mt-1 text-lg font-black">Bed Springs vs {game?.opponent_name}</h2>
        <p className="mt-1 text-[10px] text-slate-400">Batting order and player IDs are locked to this game. Each cell represents that player's play in the inning.</p>
      </div>
      <span className="rounded-xl border border-amber-300/25 bg-amber-300/[.09] px-3 py-2 text-xs font-black text-amber-100">
        FINAL {n(game?.runs_for)}–{n(game?.runs_against)}
      </span>
    </div>

    <div className="mt-3 grid grid-cols-3 gap-1.5">
      <div className="rounded-xl border border-white/10 bg-black/20 p-2"><div className="text-[8px] font-bold uppercase text-slate-500">Recorded plays</div><b className="mt-0.5 block text-lg text-white">{plays.length}</b></div>
      <div className="rounded-xl border border-white/10 bg-black/20 p-2"><div className="text-[8px] font-bold uppercase text-slate-500">Recorded hits</div><b className="mt-0.5 block text-lg text-cyan-200">{hitCount}</b></div>
      <div className="rounded-xl border border-white/10 bg-black/20 p-2"><div className="text-[8px] font-bold uppercase text-slate-500">Runs to attribute</div><b className="mt-0.5 block text-lg text-amber-200">{unattributed}</b></div>
    </div>

    {!bookPhotos.length ? <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300/25 bg-amber-300/[.07] p-2.5">
      <span className="flex items-center gap-1.5 text-[10px] text-amber-100"><ShieldAlert className="h-4 w-4 shrink-0" />Original scorebook not uploaded. Current individual totals may be incomplete.</span>
      {canScore ? <button type="button" onClick={onUploadSource} className="min-h-10 rounded-lg bg-amber-300 px-3 text-[10px] font-black text-slate-950"><Camera className="mr-1 inline h-3.5 w-3.5"/>Add source photo</button> : null}
    </div> : <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-300/15 bg-emerald-300/[.04] p-2.5">
      <span className="text-[10px] text-emerald-100">{bookPhotos.length} attached source photo{bookPhotos.length === 1 ? "" : "s"} · {verifiedPhotos} verified</span>
      {onOpenPhoto ? <button type="button" onClick={() => onOpenPhoto(bookPhotos[0].id)} className="min-h-9 rounded-lg border border-white/10 px-3 text-[9px] font-bold text-cyan-200">See source</button> : null}
    </div>}

    <div className="mt-3 overflow-x-auto overscroll-x-contain rounded-xl border border-white/10" role="region" aria-label="Scroll horizontally to review innings">
      <table className="min-w-max border-collapse text-center text-[9px]">
        <thead><tr className="bg-[#0e1c2b] text-slate-400">
          <th scope="col" className="sticky left-0 z-20 min-w-32 border-r border-white/10 bg-[#0e1c2b] p-2 text-left">BATTING ORDER</th>
          {innings.map((inning) => <th scope="col" key={inning} className="min-w-28 border-r border-white/5 px-2 py-3">INNING {inning}</th>)}
          <th className="min-w-14 p-2 text-cyan-200">H/AB</th><th className="min-w-12 p-2 text-cyan-200">RBI</th>
        </tr></thead>
        <tbody>{rows.map((spot) => {
          const all = plays.filter((play) => n(play.player) === n(spot.player));
          const hits = all.filter((play) => HITS.has(play.result)).length;
          const ab = all.filter((play) => !["BB", "SF"].includes(play.result)).length;
          return <tr key={`${spot.batting_order}:${spot.player}`} className="border-t border-white/10 odd:bg-white/[.012]">
            <th scope="row" className="sticky left-0 z-10 w-32 max-w-32 border-r border-white/10 bg-[#0a1827] px-2 py-2 text-left">
              <div className="text-[8px] font-bold text-cyan-300">#{spot.batting_order} · {spot.defensive_position || "EH"} {spot.sub_label || ""}</div>
              <div className="mt-1 truncate text-[10px] font-black text-white">{spot.player_detail?.display_name || "Player"}</div>
              <div className="text-[8px] text-slate-600">#{spot.player_detail?.jersey_number || "—"}</div>
            </th>
            {innings.map((inning) => {
              const cell = cellMap.get(`${spot.player}:${inning}`) || [];
              return <td key={inning} className="min-w-28 border-r border-white/5 px-1 py-2 align-top">
                <div className="flex flex-col items-stretch gap-1">
                  {cell.map((play) => <button key={play.id} type="button" disabled={!canScore} onClick={() => onEditPlay?.(play)}
                    aria-label={`Review ${spot.player_detail?.display_name || "player"} inning ${inning}: ${play.result}`}
                    className="flex min-h-16 flex-col items-center justify-center rounded-lg border border-emerald-300/15 bg-[#0c2330] px-1 py-1 text-[10px] font-black text-cyan-100 disabled:opacity-90">
                    <Diamond result={play.result}/><span>{play.result}</span>
                    {n(play.runs_scored) > 0 ? <span className="mt-0.5 rounded bg-amber-300/15 px-1 py-0.5 text-[8px] font-black text-amber-200">+{n(play.runs_scored)} RUN{n(play.runs_scored) === 1 ? "" : "S"}</span> : null}
                    {n(play.rbi) > 0 ? <span className="text-[7px] text-emerald-200">+{n(play.rbi)} RBI</span> : null}
                    {canScore ? <Edit3 className="mt-1 h-3 w-3 text-slate-500"/> : null}
                  </button>)}
                  {!cell.length ? <div className="grid h-16 place-items-center rounded-lg border border-dashed border-white/10 text-[8px] font-bold text-slate-700">NOT ENTERED</div> : null}
                  {canScore ? <button type="button" onClick={() => firstReviewed ? onAddPlay?.({player: n(spot.player), inning, source_photo: firstReviewed.id}) : onUploadSource?.()}
                    className="min-h-9 rounded-lg border border-white/10 bg-white/[.02] px-1 text-[9px] font-black text-cyan-200">
                    <Plus className="mr-0.5 inline h-3 w-3" />{firstReviewed ? "Add play" : "Source first"}</button> : null}
                </div>
              </td>;
            })}
            <td className="px-2 align-middle font-black text-cyan-200">{hits}/{ab}</td>
            <td className="px-2 align-middle font-black text-cyan-200">{all.reduce((sum, p) => sum + n(p.rbi), 0)}</td>
          </tr>;
        })}</tbody>
        <tfoot>
          <tr className="border-t border-amber-300/25 bg-amber-300/[.035]">
            <th scope="row" className="sticky left-0 z-10 border-r border-white/10 bg-[#201f1b] px-2 py-2 text-left font-black text-amber-100">OFFICIAL RUNS</th>
            {innings.map((inning) => <td key={inning} className="border-r border-white/5 py-2 font-black text-amber-200">{inningMap.has(inning) ? n(inningMap.get(inning).team_runs) : "—"}</td>)}
            <td colSpan={2} className="px-2 font-black text-amber-200">{game?.runs_for}</td>
          </tr>
          <tr className="border-t border-white/10 bg-black/20">
            <th scope="row" className="sticky left-0 z-10 border-r border-white/10 bg-[#151b24] px-2 py-2 text-left font-black text-slate-400">OPPONENT</th>
            {innings.map((inning) => <td key={inning} className="border-r border-white/5 py-2 text-slate-400">{inningMap.has(inning) ? n(inningMap.get(inning).opponent_runs) : "—"}</td>)}
            <td colSpan={2} className="font-black text-white">{game?.runs_against}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    {bases.length ? <div className="mt-3 text-[10px] text-slate-400"><b className="text-amber-200">Bench / not in original lineup:</b> {bases.map((p) => `#${p.jersey_number || "—"} ${p.display_name}`).join(" · ")}</div> : null}
    <p className="mt-2 text-[9px] leading-4 text-slate-500">A blank cell means the play has not been transcribed. It does not count as an out. Official final and inning scores remain unchanged until a coach deliberately edits the final result. Source review is separate from transcription.</p>
  </section>;
}
