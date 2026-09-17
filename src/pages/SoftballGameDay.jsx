import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  CircleDot,
  History,
  Loader2,
  Minus,
  Play,
  Plus,
  RotateCcw,
  Save,
  Trophy,
  Undo2,
} from "lucide-react";

import ModeBar from "../components/ModeBar";
import { useAuth } from "../auth/AuthContext";
import { getMemberships } from "../api/social";
import {
  finishSportsGame,
  getPlateAppearances,
  getSportsGame,
  recordSoftballPlay,
  setOpponentScore,
  startSportsGame,
  undoSoftballPlay,
} from "../api/sports";

const RESULTS = [
  { value: "1B", label: "Single", tone: "cyan", outs: 0 },
  { value: "2B", label: "Double", tone: "cyan", outs: 0 },
  { value: "3B", label: "Triple", tone: "cyan", outs: 0 },
  { value: "HR", label: "Home Run", tone: "green", outs: 0, rbi: 1, runs: 1 },
  { value: "BB", label: "Walk", tone: "purple", outs: 0 },
  { value: "OUT", label: "Out", tone: "slate", outs: 1 },
  { value: "K", label: "Strikeout", tone: "slate", outs: 1 },
  { value: "ROE", label: "Error", tone: "amber", outs: 0 },
  { value: "FC", label: "Fielder's Choice", tone: "amber", outs: 1 },
  { value: "SF", label: "Sac Fly", tone: "amber", outs: 1 },
];

const cx = (...values) => values.filter(Boolean).join(" ");
const list = (value) => (Array.isArray(value) ? value : []);
const number = (value) => Number(value || 0);
const errorText = (error) => error?.response?.data?.detail || Object.values(error?.response?.data || {})?.flat?.()?.[0] || error?.message || "Something went wrong.";

function Btn({ children, onClick, primary, danger, disabled, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "min-h-12 rounded-2xl px-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-40",
        primary
          ? "bg-cyan-300 text-slate-950 active:scale-[.98]"
          : danger
            ? "border border-rose-400/25 bg-rose-400/10 text-rose-100"
            : "border border-white/10 bg-white/[.04] text-slate-100 active:bg-white/[.08]",
        className,
      )}
    >
      {children}
    </button>
  );
}

function Stepper({ label, value, setValue, min = 0, max = 99 }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="text-center text-[10px] font-black uppercase tracking-[.14em] text-slate-500">{label}</div>
      <div className="mt-2 grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2">
        <button type="button" onClick={() => setValue(Math.max(min, value - 1))} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10"><Minus className="h-4 w-4" /></button>
        <div className="text-center text-2xl font-black text-white">{value}</div>
        <button type="button" onClick={() => setValue(Math.min(max, value + 1))} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10"><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

function ScoreBox({ name, score, active }) {
  return (
    <div className={cx("rounded-2xl border p-4 text-center", active ? "border-cyan-300/25 bg-cyan-300/[.07]" : "border-white/10 bg-white/[.025]")}>
      <div className="truncate text-xs font-black uppercase tracking-[.12em] text-slate-400">{name}</div>
      <div className="mt-1 text-4xl font-black text-white">{score}</div>
    </div>
  );
}

export default function SoftballGameDay() {
  const { groupId, gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = Number(user?.id || 0);

  const [game, setGame] = useState(null);
  const [plays, setPlays] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState("");
  const [outsRecorded, setOutsRecorded] = useState(0);
  const [rbi, setRbi] = useState(0);
  const [runs, setRuns] = useState(0);

  const canManage = useMemo(
    () => memberships.some(
      (membership) => Number(membership.group) === Number(groupId)
        && Number(membership.user) === userId
        && membership.status === "ACTIVE"
        && ["OWNER", "DIRECTOR", "MANAGER"].includes(membership.role),
    ),
    [memberships, groupId, userId],
  );

  const lineup = list(game?.lineup_spots).sort((a, b) => number(a.batting_order) - number(b.batting_order));
  const currentBatter = game?.current_batter;

  async function refresh({ quiet = false } = {}) {
    if (!quiet) setLoading(true);
    setError("");
    try {
      const [gameData, playRows, membershipRows] = await Promise.all([
        getSportsGame(gameId),
        getPlateAppearances(gameId),
        getMemberships(),
      ]);
      setGame(gameData);
      setPlays(list(playRows));
      setMemberships(list(membershipRows));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  async function run(fn, message) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      if (message) setNotice(message);
      await refresh({ quiet: true });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  function chooseResult(row) {
    setResult(row.value);
    setOutsRecorded(row.outs || 0);
    setRbi(row.rbi || 0);
    setRuns(row.runs || 0);
  }

  function clearEntry() {
    setResult("");
    setOutsRecorded(0);
    setRbi(0);
    setRuns(0);
  }

  async function recordPlay() {
    if (!result) return;
    await run(
      () => recordSoftballPlay(game.id, {
        result,
        outs_recorded: outsRecorded,
        rbi,
        runs_scored: runs,
      }),
      `${currentBatter?.display_name || "Batter"}: ${result} recorded.`,
    );
    clearEntry();
  }

  async function changeOpponentScore(delta) {
    const next = Math.max(0, number(game?.runs_against) + delta);
    await run(() => setOpponentScore(game.id, next), "Opponent score updated.");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#02060c] text-white">
        <ModeBar title="Game Book" subtitle="Softball" />
        <div className="grid min-h-[70vh] place-items-center"><Loader2 className="h-9 w-9 animate-spin text-cyan-300" /></div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-[#02060c] p-4 text-white">
        <ModeBar title="Game Book" subtitle="Softball" />
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-rose-100">{error || "Game unavailable."}</div>
      </div>
    );
  }

  const isLive = game.status === "LIVE";
  const isFinal = game.status === "FINAL";
  const selected = RESULTS.find((row) => row.value === result);
  const outsRemaining = Math.max(0, 3 - number(game.outs));

  return (
    <div className="min-h-screen bg-[#02060c] pb-36 text-slate-100">
      <ModeBar title="Game Book" subtitle={`${game.team_name} • Softball`} />
      <main className="mx-auto max-w-5xl space-y-4 px-3 py-4 sm:px-5">
        <div className="flex items-center justify-between gap-2">
          <Btn onClick={() => navigate(`/connect/groups/${groupId}/sports`)}><ArrowLeft className="mr-2 inline h-4 w-4" />Team</Btn>
          <div className={cx("rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[.14em]", isLive ? "bg-emerald-300 text-slate-950" : isFinal ? "bg-white/10 text-slate-300" : "bg-cyan-300/10 text-cyan-100")}>
            {isLive ? "● Live" : game.status}
          </div>
        </div>

        {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-100">{error}</div> : null}
        {notice ? <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-sm text-cyan-100">{notice}</div> : null}

        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_50%_-20%,rgba(34,211,238,.2),transparent_45%),#07111f] p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-2">
            <ScoreBox name={game.team_name} score={number(game.runs_for)} active />
            <ScoreBox name={game.opponent_name} score={number(game.runs_against)} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-[9px] font-black uppercase tracking-[.14em] text-slate-500">Inning</div><div className="mt-1 text-xl font-black text-white">{number(game.current_inning)}</div></div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-[9px] font-black uppercase tracking-[.14em] text-slate-500">Outs</div><div className="mt-1 flex justify-center gap-1">{[0, 1, 2].map((out) => <span key={out} className={cx("h-4 w-4 rounded-full border", out < number(game.outs) ? "border-rose-300 bg-rose-300" : "border-white/20")} />)}</div></div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-[9px] font-black uppercase tracking-[.14em] text-slate-500">Batting</div><div className="mt-1 text-xl font-black text-white">#{game.current_batter_order}</div></div>
          </div>
          <div className="mt-3 text-center text-xs text-slate-500">{new Date(game.start_at).toLocaleString()} · {game.venue_name || "Location TBD"}{game.tournament_name ? ` · ${game.tournament_name}` : ""}{game.round_label ? ` · ${game.round_label}` : ""}</div>
        </section>

        {!lineup.length ? (
          <section className="rounded-[1.65rem] border border-amber-400/20 bg-amber-400/[.06] p-5">
            <h2 className="font-black text-amber-100">Lineup needed</h2>
            <p className="mt-1 text-sm leading-6 text-amber-100/70">Build this game’s batting order on the team Lineup card before starting Game Book.</p>
            <Btn className="mt-4" onClick={() => navigate(`/connect/groups/${groupId}/sports`)}><ArrowLeft className="mr-2 inline h-4 w-4" />Open team lineup</Btn>
          </section>
        ) : null}

        {game.status === "SCHEDULED" && lineup.length ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_.72fr]">
            <section className="rounded-[1.65rem] border border-white/10 bg-[#07111f] p-4 sm:p-5">
              <h2 className="font-black text-white">Starting lineup</h2>
              <div className="mt-4 space-y-2">
                {lineup.map((spot) => (
                  <div key={spot.id} className="grid grid-cols-[2.5rem_1fr_4rem] items-center gap-2 rounded-2xl border border-white/10 bg-white/[.025] p-2">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300/10 font-black text-cyan-100">{spot.batting_order}</div>
                    <div className="min-w-0"><b className="block truncate text-sm text-white">#{spot.player_detail?.jersey_number || "—"} {spot.player_detail?.display_name}</b><span className="text-[10px] text-slate-500">{spot.player_detail?.primary_position || "Player"}</span></div>
                    <div className="text-center text-xs font-black text-slate-300">{spot.defensive_position || "—"}</div>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-[1.65rem] border border-cyan-400/20 bg-cyan-400/[.05] p-5">
              <Play className="h-7 w-7 text-cyan-300" />
              <h2 className="mt-3 text-xl font-black text-white">Ready to score?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">Starting locks Game Book onto batter #1 and begins the live inning/out state.</p>
              {canManage ? <Btn primary className="mt-5 w-full" disabled={busy} onClick={() => run(() => startSportsGame(game.id), "Game started.")}><CircleDot className="mr-2 inline h-4 w-4" />Start Game</Btn> : <div className="mt-5 text-sm text-amber-200">A team coach or manager starts and scores the game.</div>}
            </section>
          </div>
        ) : null}

        {isLive ? (
          <>
            <section className="rounded-[1.75rem] border border-cyan-400/25 bg-[radial-gradient(circle_at_85%_0%,rgba(34,211,238,.14),transparent_38%),#07111f] p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-300">At bat now</div>
                  <h2 className="mt-1 text-2xl font-black text-white">#{currentBatter?.jersey_number || "—"} {currentBatter?.display_name || "Current batter"}</h2>
                  <p className="mt-1 text-xs text-slate-500">Order #{game.current_batter_order} · {currentBatter?.primary_position || "Position not set"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-center"><div className="text-[9px] font-black uppercase text-slate-500">Outs left</div><b className="text-lg text-white">{outsRemaining}</b></div>
              </div>

              {canManage ? (
                <>
                  <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {RESULTS.map((row) => {
                      const active = result === row.value;
                      const tone = row.tone === "green" ? "border-emerald-300/35 bg-emerald-300/15" : row.tone === "purple" ? "border-violet-300/35 bg-violet-300/15" : row.tone === "amber" ? "border-amber-300/35 bg-amber-300/15" : row.tone === "cyan" ? "border-cyan-300/35 bg-cyan-300/15" : "border-white/15 bg-white/[.04]";
                      return (
                        <button
                          key={row.value}
                          type="button"
                          onClick={() => chooseResult(row)}
                          className={cx("min-h-[4.7rem] rounded-2xl border p-2 text-center transition active:scale-[.98]", tone, active && "ring-2 ring-white/80")}
                        >
                          <div className="text-xl font-black text-white">{row.value}</div>
                          <div className="mt-1 text-[10px] text-slate-400">{row.label}</div>
                        </button>
                      );
                    })}
                  </div>

                  {selected ? (
                    <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-black/20 p-3">
                      <div className="flex items-center justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">Selected result</div><b className="text-white">{selected.value} · {selected.label}</b></div><button type="button" onClick={clearEntry} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10"><RotateCcw className="h-4 w-4" /></button></div>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <Stepper label="Outs on play" value={outsRecorded} setValue={setOutsRecorded} max={outsRemaining} />
                        <Stepper label="RBI" value={rbi} setValue={setRbi} max={4} />
                        <Stepper label="Runs" value={runs} setValue={setRuns} max={4} />
                      </div>
                      <Btn primary className="mt-3 w-full" disabled={busy} onClick={recordPlay}><Save className="mr-2 inline h-4 w-4" />Record {selected.value}</Btn>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/[.06] p-4 text-sm text-amber-100">You can follow this live game, but scoring controls are limited to team management.</div>
              )}
            </section>

            {canManage ? (
              <section className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-white/10 bg-[#07111f] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">Opponent score</div>
                  <div className="mt-3 grid grid-cols-[3rem_1fr_3rem] items-center gap-3">
                    <button type="button" onClick={() => changeOpponentScore(-1)} disabled={busy || number(game.runs_against) === 0} className="grid h-12 w-12 place-items-center rounded-xl border border-white/10 disabled:opacity-30"><Minus className="h-4 w-4" /></button>
                    <div className="text-center text-3xl font-black text-white">{number(game.runs_against)}</div>
                    <button type="button" onClick={() => changeOpponentScore(1)} disabled={busy} className="grid h-12 w-12 place-items-center rounded-xl border border-white/10"><Plus className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-[1.5rem] border border-white/10 bg-[#07111f] p-4">
                  <Btn disabled={busy || !plays.length} onClick={() => run(() => undoSoftballPlay(game.id), "Last play removed and game state rewound.")}><Undo2 className="mr-2 inline h-4 w-4" />Undo</Btn>
                  <Btn danger disabled={busy} onClick={() => run(() => finishSportsGame(game.id, { runs_for: number(game.runs_for), runs_against: number(game.runs_against) }), "Game marked final.")}><Check className="mr-2 inline h-4 w-4" />Final</Btn>
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        {isFinal ? (
          <section className="rounded-[1.75rem] border border-amber-300/20 bg-[radial-gradient(circle_at_50%_-10%,rgba(251,191,36,.12),transparent_45%),#07111f] p-5 text-center">
            <Trophy className="mx-auto h-8 w-8 text-amber-300" />
            <div className="mt-3 text-[10px] font-black uppercase tracking-[.16em] text-amber-200">Final</div>
            <h2 className="mt-1 text-2xl font-black text-white">{game.team_name} {game.runs_for} · {game.opponent_name} {game.runs_against}</h2>
            <p className="mt-2 text-sm text-slate-400">Every saved plate appearance is now included in the team and player season dashboard.</p>
            <Btn primary className="mt-5" onClick={() => navigate(`/connect/groups/${groupId}/sports`)}><Trophy className="mr-2 inline h-4 w-4" />View Team Stats</Btn>
          </section>
        ) : null}

        <section className="rounded-[1.65rem] border border-white/10 bg-[#07111f] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3"><div><h2 className="font-black text-white">Play log</h2><p className="mt-1 text-xs text-slate-500">Latest saved plate appearances for this game.</p></div><History className="h-5 w-5 text-slate-500" /></div>
          <div className="mt-4 space-y-2">
            {[...plays].reverse().map((play) => (
              <div key={play.id} className="grid grid-cols-[2.7rem_1fr_auto] items-center gap-2 rounded-2xl border border-white/10 bg-white/[.025] p-2.5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/[.05] text-xs font-black text-slate-300">{play.sequence}</div>
                <div className="min-w-0"><b className="block truncate text-sm text-white">{play.player_name}</b><span className="text-[10px] text-slate-500">Inning {play.inning}{play.rbi ? ` · ${play.rbi} RBI` : ""}{play.runs_scored ? ` · ${play.runs_scored} run${play.runs_scored === 1 ? "" : "s"}` : ""}{play.outs_recorded ? ` · ${play.outs_recorded} out${play.outs_recorded === 1 ? "" : "s"}` : ""}</span></div>
                <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[.07] px-3 py-2 text-xs font-black text-cyan-100">{play.result}</div>
              </div>
            ))}
            {!plays.length ? <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">No plate appearances recorded yet.</div> : null}
          </div>
        </section>
      </main>
    </div>
  );
}
