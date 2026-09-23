import React, { useEffect, useMemo, useState } from "react";
import { Bell, CalendarDays, Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import {
  getWeeklyAvailability,
  openWeeklyAvailability,
  respondWeeklyAvailability,
} from "../../api/sports";

const cx = (...values) => values.filter(Boolean).join(" ");

function mondayYmd(date = new Date()) {
  const copy = new Date(date);
  const day = copy.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + offset);
  const local = new Date(copy.getTime() - copy.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function shiftWeek(ymd, amount) {
  const date = new Date(ymd + "T12:00:00");
  date.setDate(date.getDate() + amount * 7);
  return mondayYmd(date);
}

function labelFor(value) {
  return value === "YES" ? "IN" : value === "MAYBE" ? "SUB" : value === "NO" ? "OUT" : "PENDING";
}

function responseTone(value) {
  return value === "YES"
    ? "border-emerald-300/35 bg-emerald-300/15 text-emerald-100"
    : value === "MAYBE"
      ? "border-amber-300/35 bg-amber-300/15 text-amber-100"
      : value === "NO"
        ? "border-rose-300/35 bg-rose-300/15 text-rose-100"
        : "border-white/10 bg-white/[.025] text-slate-400";
}

export default function WeeklyAvailabilityCard({
  teamId,
  managerView = false,
  compact = false,
  initialWeekStart = "",
  title = "This week's games",
}) {
  const [weekStart, setWeekStart] = useState(initialWeekStart || mondayYmd());
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load(nextWeek = weekStart) {
    if (!teamId) return;
    setBusy(true);
    setError("");
    try {
      setData(await getWeeklyAvailability(teamId, nextWeek));
    } catch (err) {
      setError(err?.response?.data?.detail || "Availability could not load.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { load(weekStart); }, [teamId, weekStart]);

  const games = Array.isArray(data?.games) ? data.games : [];
  const roster = Array.isArray(data?.roster) ? data.roster : [];
  const pendingPlayers = useMemo(
    () => roster.filter((row) => Number(row.pending || 0) > 0).length,
    [roster],
  );

  async function saveResponses(responses, message) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const next = await respondWeeklyAvailability(teamId, weekStart, responses);
      setData((current) => ({ ...(current || {}), ...next }));
      setNotice(message);
    } catch (err) {
      setError(err?.response?.data?.detail || "Availability could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  function answerAll(value) {
    const responses = {};
    games.forEach((row) => { responses[String(row.game.id)] = value; });
    saveResponses(
      responses,
      value === "YES" ? "You're in for every game this week." : value === "NO" ? "You're marked out for every game this week." : "You're marked as a possible sub this week.",
    );
  }

  function answerOne(gameId, value) {
    saveResponses({ [String(gameId)]: value }, "Game availability updated.");
  }

  async function remindPending() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const next = await openWeeklyAvailability(teamId, weekStart);
      setData(next);
      setNotice(next.sent ? `Reminder sent to ${next.sent} player${next.sent === 1 ? "" : "s"}.` : "Everyone has already responded.");
    } catch (err) {
      setError(err?.response?.data?.detail || "Weekly availability could not be opened.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={cx(
      "rounded-[1.35rem] border border-cyan-300/15 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,.09),transparent_42%),#07111f] text-slate-100",
      compact ? "p-3" : "p-3.5 sm:p-4",
    )}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-white"><CalendarDays className="h-4 w-4 text-cyan-300" />{title}</div>
          <p className="mt-1 text-[10px] leading-4 text-slate-400">One weekly poll, with each game saved separately so the lineup always uses the real game response.</p>
        </div>
        {busy ? <Loader2 className="h-4 w-4 animate-spin text-cyan-300" /> : null}
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-1.5">
        <button type="button" onClick={() => setWeekStart((value) => shiftWeek(value, -1))} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400"><ChevronLeft className="h-4 w-4" /></button>
        <div className="text-center"><div className="text-[8px] font-black uppercase tracking-[.13em] text-slate-500">Week of</div><div className="text-xs font-black text-white">{new Date(weekStart + "T12:00:00").toLocaleDateString([], { month:"short", day:"numeric", year:"numeric" })}</div></div>
        <button type="button" onClick={() => setWeekStart((value) => shiftWeek(value, 1))} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400"><ChevronRight className="h-4 w-4" /></button>
      </div>

      {error ? <div className="mt-2 rounded-xl border border-rose-300/20 bg-rose-300/10 p-2 text-[10px] text-rose-100">{error}</div> : null}
      {notice ? <div className="mt-2 rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-2 text-[10px] text-emerald-100">{notice}</div> : null}

      {!games.length && !busy ? <div className="mt-3 rounded-xl border border-dashed border-white/10 p-4 text-center text-[10px] text-slate-500">No games scheduled for this week.</div> : null}

      {games.length ? <>
        {!managerView ? <div className="mt-3 grid grid-cols-3 gap-1.5">
          <button type="button" disabled={busy} onClick={() => answerAll("YES")} className="min-h-10 rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-2 text-[9px] font-black text-emerald-100">IN FOR ALL</button>
          <button type="button" disabled={busy} onClick={() => answerAll("MAYBE")} className="min-h-10 rounded-xl border border-amber-300/25 bg-amber-300/10 px-2 text-[9px] font-black text-amber-100">SUB / MAYBE</button>
          <button type="button" disabled={busy} onClick={() => answerAll("NO")} className="min-h-10 rounded-xl border border-rose-300/25 bg-rose-300/10 px-2 text-[9px] font-black text-rose-100">OUT FOR ALL</button>
        </div> : <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-violet-300/15 bg-violet-300/[.04] p-2.5">
          <div><b className="text-[10px] text-white">{pendingPlayers} player{pendingPlayers === 1 ? "" : "s"} still pending</b><div className="text-[9px] text-slate-500">Reminders appear in their main SyncWorks notifications.</div></div>
          <button type="button" disabled={busy || !pendingPlayers} onClick={remindPending} className="min-h-10 shrink-0 rounded-xl bg-violet-300 px-3 text-[9px] font-black text-slate-950 disabled:opacity-40"><Bell className="mr-1 inline h-3.5 w-3.5" />Remind</button>
        </div>}

        <div className="mt-3 space-y-2">
          {games.map((row, index) => {
            const game = row.game;
            const value = row.my_response?.response || "PENDING";
            return <div key={game.id} className="rounded-xl border border-white/10 bg-white/[.025] p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><div className="text-[8px] font-black uppercase tracking-wide text-cyan-300">Game {index + 1} · {game.home_away}</div><b className="block truncate text-xs text-white">vs {game.opponent_name}</b><div className="mt-0.5 text-[9px] text-slate-500">{new Date(game.start_at).toLocaleString([], { weekday:"short", month:"short", day:"numeric", hour:"numeric", minute:"2-digit" })} · {game.venue_name || "Field TBD"}</div></div>
                {!managerView ? <span className={cx("rounded-full border px-2 py-1 text-[8px] font-black", responseTone(value))}>{labelFor(value)}</span> : null}
              </div>
              {!managerView ? <div className="mt-2 grid grid-cols-3 gap-1.5">{[["YES","IN"],["MAYBE","SUB"],["NO","OUT"]].map(([answer,label])=><button key={answer} type="button" disabled={busy} onClick={() => answerOne(game.id, answer)} className={cx("min-h-9 rounded-lg border text-[8px] font-black",value===answer?responseTone(answer):"border-white/10 text-slate-500")}>{value===answer?<Check className="mr-1 inline h-3 w-3" />:null}{label}</button>)}</div> : null}
            </div>;
          })}
        </div>

        {managerView && roster.length ? <div className="mt-3 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[560px] text-[9px]">
            <thead className="bg-white/[.04] text-slate-500"><tr><th className="p-2 text-left">PLAYER</th>{games.map((row,index)=><th key={row.game.id} className="p-2 text-center">G{index+1}</th>)}<th className="p-2 text-center">WEEK</th></tr></thead>
            <tbody>{roster.map((row)=><tr key={row.player.id} className="border-t border-white/10"><td className="p-2 font-black text-white">#{row.player.jersey_number || "—"} {row.player.display_name}</td>{games.map((gameRow)=><td key={gameRow.game.id} className="p-2 text-center"><span className={cx("rounded-md border px-1.5 py-1 text-[8px] font-black",responseTone(row.responses?.[String(gameRow.game.id)] || "PENDING"))}>{labelFor(row.responses?.[String(gameRow.game.id)] || "PENDING")}</span></td>)}<td className="p-2 text-center font-black text-slate-300">{row.all_yes ? "ALL IN" : row.pending ? `${row.pending} PENDING` : "SET"}</td></tr>)}</tbody>
          </table>
        </div> : null}
      </> : null}
    </section>
  );
}
