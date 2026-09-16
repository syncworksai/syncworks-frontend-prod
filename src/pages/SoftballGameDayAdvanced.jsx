import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Check,
  CircleDot,
  Clipboard,
  Eye,
  EyeOff,
  Loader2,
  Minus,
  Play,
  Plus,
  Radio,
  RotateCcw,
  Share2,
  Trophy,
  Undo2,
} from "lucide-react";

import ModeBar from "../components/ModeBar";
import { useAuth } from "../auth/AuthContext";
import { getMemberships } from "../api/social";
import {
  finishSportsGame,
  getGameCastSettings,
  getPlateAppearances,
  getSportsGame,
  recordSoftballPlay,
  saveSoftballPlayContext,
  setOpponentScore,
  startSportsGame,
  undoSoftballPlay,
  updateGameCastSettings,
} from "../api/sports";

const RESULTS = [
  { value: "1B", label: "1B", detail: "Single", outs: 0 },
  { value: "2B", label: "2B", detail: "Double", outs: 0 },
  { value: "3B", label: "3B", detail: "Triple", outs: 0 },
  { value: "HR", label: "HR", detail: "Home run", outs: 0, rbi: 1, runs: 1 },
  { value: "BB", label: "BB", detail: "Walk", outs: 0 },
  { value: "OUT", label: "OUT", detail: "Out", outs: 1 },
  { value: "K", label: "K", detail: "Strikeout", outs: 1 },
  { value: "ROE", label: "ROE", detail: "Reached on error", outs: 0 },
  { value: "FC", label: "FC", detail: "Fielder's choice", outs: 1 },
  { value: "SF", label: "SF", detail: "Sac fly", outs: 1, productive: true },
];

const BATTED_BALLS = [
  ["GROUND", "Ground"],
  ["LINE", "Line"],
  ["FLY", "Fly"],
  ["POP", "Pop"],
];

const SPRAY_ZONES = [
  ["LEFT_LINE", "LF line"],
  ["LEFT", "Left"],
  ["LEFT_CENTER", "Left center"],
  ["CENTER", "Center"],
  ["RIGHT_CENTER", "Right center"],
  ["RIGHT", "Right"],
  ["RIGHT_LINE", "RF line"],
  ["INFIELD_LEFT", "IF left"],
  ["INFIELD_MIDDLE", "IF middle"],
  ["INFIELD_RIGHT", "IF right"],
];

const cx = (...values) => values.filter(Boolean).join(" ");
const list = (value) => (Array.isArray(value) ? value : []);
const num = (value) => Number(value || 0);
const errorText = (error) => error?.response?.data?.detail || Object.values(error?.response?.data || {})?.flat?.()?.[0] || error?.message || "Something went wrong.";

function Button({ children, onClick, primary, danger, disabled, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "min-h-12 rounded-2xl px-4 text-sm font-black transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40",
        primary
          ? "bg-cyan-300 text-slate-950"
          : danger
            ? "border border-rose-400/25 bg-rose-400/10 text-rose-100"
            : "border border-white/10 bg-white/[.04] text-slate-100",
        className,
      )}
    >
      {children}
    </button>
  );
}

function Stepper({ label, value, onChange, max = 9 }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="text-center text-[9px] font-black uppercase tracking-[.14em] text-slate-500">{label}</div>
      <div className="mt-2 grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10"><Minus className="h-4 w-4" /></button>
        <div className="text-center text-2xl font-black text-white">{value}</div>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10"><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

function Toggle({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "min-h-11 rounded-xl border px-3 text-xs font-black",
        active ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100" : "border-white/10 bg-black/15 text-slate-400",
      )}
    >
      {active ? <Check className="mr-1 inline h-3.5 w-3.5" /> : null}{children}
    </button>
  );
}

function ScoreBox({ name, score, accent }) {
  return (
    <div className={cx("rounded-2xl border p-4 text-center", accent ? "border-cyan-300/25 bg-cyan-300/[.07]" : "border-white/10 bg-black/20")}>
      <div className="truncate text-[10px] font-black uppercase tracking-[.12em] text-slate-500">{name}</div>
      <div className="mt-1 text-4xl font-black text-white">{score}</div>
    </div>
  );
}

export default function SoftballGameDayAdvanced() {
  const { groupId, gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = Number(user?.id || 0);

  const [game, setGame] = useState(null);
  const [plays, setPlays] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [gamecast, setGamecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [result, setResult] = useState("");
  const [outsRecorded, setOutsRecorded] = useState(0);
  const [rbi, setRbi] = useState(0);
  const [runs, setRuns] = useState(0);
  const [runner1, setRunner1] = useState(false);
  const [runner2, setRunner2] = useState(false);
  const [runner3, setRunner3] = useState(false);
  const [runnersAdvanced, setRunnersAdvanced] = useState(0);
  const [productiveOut, setProductiveOut] = useState(false);
  const [battedBallType, setBattedBallType] = useState("");
  const [sprayZone, setSprayZone] = useState("");

  const canManage = useMemo(
    () => memberships.some(
      (membership) => Number(membership.group) === Number(groupId)
        && Number(membership.user) === userId
        && membership.status === "ACTIVE"
        && ["OWNER", "DIRECTOR", "MANAGER"].includes(membership.role),
    ),
    [memberships, groupId, userId],
  );

  const lineup = useMemo(
    () => [...list(game?.lineup_spots)].sort((a, b) => num(a.batting_order) - num(b.batting_order)),
    [game],
  );

  async function refresh({ quiet = false } = {}) {
    if (!quiet) setLoading(true);
    try {
      const [gameData, playRows, membershipRows] = await Promise.all([
        getSportsGame(gameId),
        getPlateAppearances(gameId),
        getMemberships(),
      ]);
      setGame(gameData);
      setPlays(list(playRows));
      setMemberships(list(membershipRows));
      const manager = list(membershipRows).some(
        (membership) => Number(membership.group) === Number(groupId)
          && Number(membership.user) === userId
          && membership.status === "ACTIVE"
          && ["OWNER", "DIRECTOR", "MANAGER"].includes(membership.role),
      );
      if (manager) {
        try {
          setGamecast(await getGameCastSettings(gameId));
        } catch {
          setGamecast(null);
        }
      }
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

  useEffect(() => {
    if (game?.status !== "LIVE") return undefined;
    const id = window.setInterval(() => refresh({ quiet: true }), 3000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.status, gameId]);

  async function run(fn, message) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const value = await fn();
      if (message) setNotice(message);
      await refresh({ quiet: true });
      return value;
    } catch (err) {
      setError(errorText(err));
      return null;
    } finally {
      setBusy(false);
    }
  }

  function chooseResult(row) {
    setResult(row.value);
    setOutsRecorded(row.outs || 0);
    setRbi(row.rbi || 0);
    setRuns(row.runs || 0);
    setProductiveOut(Boolean(row.productive));
    if (row.value === "BB" || row.value === "K") {
      setBattedBallType("");
      setSprayZone("");
    }
  }

  function clearEntry() {
    setResult("");
    setOutsRecorded(0);
    setRbi(0);
    setRuns(0);
    setRunner1(false);
    setRunner2(false);
    setRunner3(false);
    setRunnersAdvanced(0);
    setProductiveOut(false);
    setBattedBallType("");
    setSprayZone("");
  }

  async function recordPlay() {
    if (!result || !game || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await recordSoftballPlay(game.id, {
        result,
        outs_recorded: outsRecorded,
        rbi,
        runs_scored: runs,
      });
      const plateAppearanceId = response?.play?.id;
      if (plateAppearanceId) {
        try {
          await saveSoftballPlayContext({
            plate_appearance: plateAppearanceId,
            runner_on_first_before: runner1,
            runner_on_second_before: runner2,
            runner_on_third_before: runner3,
            runners_advanced: runnersAdvanced,
            productive_out: result === "SF" ? true : productiveOut,
            batted_ball_type: battedBallType,
            spray_zone: sprayZone,
          });
          setNotice(`${game.current_batter?.display_name || "Batter"}: ${result} recorded with quality context.`);
        } catch (contextError) {
          setNotice(`${result} was recorded, but the advanced context did not save. Official game scoring is intact.`);
          setError(errorText(contextError));
        }
      }
      clearEntry();
      await refresh({ quiet: true });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggleGameCast(enabled) {
    if (!gamecast) return;
    const next = await run(
      () => updateGameCastSettings(game.id, { enabled, show_player_stats: true }),
      enabled ? "GameCast is live for fans." : "GameCast sharing turned off.",
    );
    if (next) setGamecast(next);
  }

  async function copyGameCast() {
    if (!gamecast?.token) return;
    const url = `${window.location.origin}/gamecast/${gamecast.token}`;
    try {
      await navigator.clipboard.writeText(url);
      setNotice("GameCast link copied.");
    } catch {
      setNotice(url);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#02060c] text-white">
        <ModeBar title="Game Day" subtitle="Softball" />
        <div className="grid min-h-[70vh] place-items-center"><Loader2 className="h-9 w-9 animate-spin text-cyan-300" /></div>
      </div>
    );
  }

  if (!game) {
    return <div className="min-h-screen bg-[#02060c] p-4 text-white"><ModeBar title="Game Day" subtitle="Softball" /><div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4">{error || "Game unavailable."}</div></div>;
  }

  const live = game.status === "LIVE";
  const final = game.status === "FINAL";
  const currentBatter = game.current_batter;
  const selected = RESULTS.find((row) => row.value === result);
  const battedBallRelevant = result && !["BB", "K"].includes(result);
  const productiveRelevant = ["OUT", "FC", "SF"].includes(result);
  const gamecastUrl = gamecast?.token ? `${window.location.origin}/gamecast/${gamecast.token}` : "";

  return (
    <div className="min-h-screen bg-[#02060c] pb-36 text-slate-100">
      <ModeBar title="Game Day" subtitle={`${game.team_name} • Softball`} />
      <main className="mx-auto max-w-6xl space-y-4 px-3 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button onClick={() => navigate(`/connect/groups/${groupId}/sports`)}><ArrowLeft className="mr-2 inline h-4 w-4" />Team</Button>
          <div className="flex gap-2">
            <Button onClick={() => navigate(`/connect/groups/${groupId}/sports/analytics`)}><BarChart3 className="mr-2 inline h-4 w-4" />Analytics</Button>
            <span className={cx("grid min-h-12 place-items-center rounded-2xl px-4 text-xs font-black uppercase", live ? "bg-emerald-300 text-slate-950" : "border border-white/10 text-slate-300")}>{live ? "● Live" : game.status}</span>
          </div>
        </div>

        {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-100">{error}</div> : null}
        {notice ? <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-sm text-cyan-100">{notice}</div> : null}

        <section className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_50%_-20%,rgba(34,211,238,.22),transparent_48%),#07111f] p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-2">
            <ScoreBox name={game.team_name} score={num(game.runs_for)} accent />
            <ScoreBox name={game.opponent_name} score={num(game.runs_against)} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-[9px] uppercase tracking-widest text-slate-500">Inning</div><b className="text-2xl">{game.current_inning}</b></div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-[9px] uppercase tracking-widest text-slate-500">Outs</div><div className="mt-2 flex justify-center gap-1">{[0, 1, 2].map((index) => <span key={index} className={cx("h-4 w-4 rounded-full border", index < num(game.outs) ? "border-rose-300 bg-rose-300" : "border-white/20")} />)}</div></div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-[9px] uppercase tracking-widest text-slate-500">Batter</div><b className="text-2xl">#{game.current_batter_order}</b></div>
          </div>
          <div className="mt-3 text-center text-xs text-slate-500">{new Date(game.start_at).toLocaleString()} · {game.venue_name || "Location TBD"}</div>
        </section>

        {!lineup.length ? (
          <section className="rounded-[1.65rem] border border-amber-400/20 bg-amber-400/[.06] p-5">
            <b className="text-amber-100">Build the lineup before Game Day.</b>
          </section>
        ) : null}

        {game.status === "SCHEDULED" && lineup.length ? (
          <section className="rounded-[1.65rem] border border-cyan-400/20 bg-[#07111f] p-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_.7fr]">
              <div>
                <h2 className="font-black text-white">Starting lineup</h2>
                <div className="mt-3 space-y-2">{lineup.map((spot) => <div key={spot.id} className="flex items-center justify-between rounded-2xl border border-white/10 p-3"><span><b>{spot.batting_order}. {spot.player_detail?.display_name}</b><span className="ml-2 text-xs text-slate-500">#{spot.player_detail?.jersey_number || "—"}</span></span><span className="text-xs font-black text-slate-400">{spot.defensive_position || "—"}</span></div>)}</div>
              </div>
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[.05] p-4">
                <Play className="h-7 w-7 text-cyan-300" />
                <h2 className="mt-3 text-xl font-black">Start live scoring</h2>
                <p className="mt-2 text-sm text-slate-400">The first batter, inning and out state will go live.</p>
                {canManage ? <Button primary disabled={busy} className="mt-4 w-full" onClick={() => run(() => startSportsGame(game.id), "Game started.")}><CircleDot className="mr-2 inline h-4 w-4" />Start Game</Button> : null}
              </div>
            </div>
          </section>
        ) : null}

        {live ? (
          <div className="grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
            <div className="space-y-4">
              <section className="rounded-[1.75rem] border border-cyan-400/25 bg-[#07111f] p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div><div className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-300">At bat now</div><h2 className="mt-1 text-2xl font-black text-white">#{currentBatter?.jersey_number || "—"} {currentBatter?.display_name || "Lineup batter"}</h2></div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black text-slate-400">{currentBatter?.primary_position || "Player"}</span>
                </div>

                {canManage ? (
                  <>
                    <div className="mt-5 grid grid-cols-5 gap-2">{RESULTS.map((row) => <button key={row.value} type="button" onClick={() => chooseResult(row)} className={cx("min-h-16 rounded-2xl border p-2 text-center transition", result === row.value ? "border-cyan-300 bg-cyan-300 text-slate-950" : "border-white/10 bg-black/20 text-white")}><b className="block text-lg">{row.label}</b><span className="text-[9px] opacity-60">{row.detail}</span></button>)}</div>

                    {result ? (
                      <div className="mt-4 space-y-4 rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                        <div className="flex items-center justify-between gap-2"><div><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Selected</div><b className="text-lg text-white">{selected?.detail}</b></div><Button onClick={clearEntry}><RotateCcw className="mr-1 inline h-4 w-4" />Reset</Button></div>

                        <div className="grid grid-cols-3 gap-2"><Stepper label="Outs" value={outsRecorded} onChange={setOutsRecorded} max={Math.max(0, 3 - num(game.outs))} /><Stepper label="RBI" value={rbi} onChange={setRbi} max={4} /><Stepper label="Runs" value={runs} onChange={setRuns} max={4} /></div>

                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Runners on before contact</div>
                          <div className="mt-2 grid grid-cols-3 gap-2"><Toggle active={runner1} onClick={() => setRunner1(!runner1)}>1st</Toggle><Toggle active={runner2} onClick={() => setRunner2(!runner2)}>2nd</Toggle><Toggle active={runner3} onClick={() => setRunner3(!runner3)}>3rd</Toggle></div>
                        </div>

                        <Stepper label="Runners advanced" value={runnersAdvanced} onChange={setRunnersAdvanced} max={3} />

                        {productiveRelevant ? <Toggle active={result === "SF" || productiveOut} onClick={() => result !== "SF" && setProductiveOut(!productiveOut)}>Quality / productive out</Toggle> : null}

                        {battedBallRelevant ? (
                          <>
                            <div><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Batted ball</div><div className="mt-2 grid grid-cols-4 gap-2">{BATTED_BALLS.map(([value, label]) => <Toggle key={value} active={battedBallType === value} onClick={() => setBattedBallType(battedBallType === value ? "" : value)}>{label}</Toggle>)}</div></div>
                            <div><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Where did it go?</div><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">{SPRAY_ZONES.map(([value, label]) => <Toggle key={value} active={sprayZone === value} onClick={() => setSprayZone(sprayZone === value ? "" : value)}>{label}</Toggle>)}</div></div>
                          </>
                        ) : null}

                        <Button primary disabled={busy} className="w-full" onClick={recordPlay}>Record plate appearance</Button>
                      </div>
                    ) : null}
                  </>
                ) : <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/[.05] p-3 text-sm text-amber-100">Game entry is controlled by an owner, director or coach.</div>}
              </section>

              <section className="rounded-[1.65rem] border border-white/10 bg-[#07111f] p-4">
                <div className="flex items-center justify-between"><h2 className="font-black">Play-by-play</h2>{canManage && plays.length ? <Button onClick={() => run(() => undoSoftballPlay(game.id), "Last play undone.")}><Undo2 className="mr-1 inline h-4 w-4" />Undo</Button> : null}</div>
                <div className="mt-3 space-y-2">{[...plays].reverse().slice(0, 12).map((play) => <div key={play.id} className="flex items-center justify-between rounded-2xl border border-white/10 p-3"><div><b className="text-sm">{play.player_name}</b><div className="text-xs text-slate-500">Inning {play.inning} · PA #{play.sequence}</div></div><div className="text-right"><b className="text-cyan-100">{play.result_label || play.result}</b>{play.rbi ? <div className="text-[10px] text-slate-500">{play.rbi} RBI</div> : null}</div></div>)}</div>
              </section>
            </div>

            <div className="space-y-4">
              {canManage ? <section className="rounded-[1.65rem] border border-white/10 bg-[#07111f] p-4"><h2 className="font-black">Opponent score</h2><div className="mt-3 grid grid-cols-[3rem_1fr_3rem] items-center gap-2"><button onClick={() => run(() => setOpponentScore(game.id, Math.max(0, num(game.runs_against) - 1)), "Opponent score updated.")} className="grid h-12 w-12 place-items-center rounded-xl border border-white/10"><Minus /></button><div className="text-center text-3xl font-black">{game.runs_against}</div><button onClick={() => run(() => setOpponentScore(game.id, num(game.runs_against) + 1), "Opponent score updated.")} className="grid h-12 w-12 place-items-center rounded-xl border border-white/10"><Plus /></button></div></section> : null}

              {canManage && gamecast ? <section className="rounded-[1.65rem] border border-emerald-400/20 bg-emerald-400/[.05] p-4"><div className="flex items-start justify-between"><div><div className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Fan view</div><h2 className="mt-1 font-black">GameCast</h2></div>{gamecast.enabled ? <Radio className="h-6 w-6 text-emerald-300" /> : <EyeOff className="h-6 w-6 text-slate-500" />}</div><p className="mt-2 text-sm leading-6 text-slate-400">Share this one game without opening the private team group.</p><div className="mt-3 grid grid-cols-2 gap-2"><Button primary={!gamecast.enabled} onClick={() => toggleGameCast(!gamecast.enabled)}>{gamecast.enabled ? <><EyeOff className="mr-1 inline h-4 w-4" />Stop</> : <><Eye className="mr-1 inline h-4 w-4" />Go live</>}</Button><Button disabled={!gamecast.enabled} onClick={copyGameCast}><Share2 className="mr-1 inline h-4 w-4" />Copy link</Button></div>{gamecast.enabled ? <div className="mt-3 break-all rounded-xl bg-black/20 p-2 text-[10px] text-slate-500">{gamecastUrl}</div> : null}</section> : null}

              {canManage ? <Button danger className="w-full" onClick={() => run(() => finishSportsGame(game.id), "Game marked final.")}><Trophy className="mr-2 inline h-4 w-4" />Finish Game</Button> : null}
            </div>
          </div>
        ) : null}

        {final ? <section className="rounded-[1.65rem] border border-emerald-400/20 bg-emerald-400/[.05] p-5 text-center"><Trophy className="mx-auto h-8 w-8 text-emerald-300" /><h2 className="mt-2 text-xl font-black">Final: {game.runs_for}–{game.runs_against}</h2><Button className="mt-4" onClick={() => navigate(`/connect/groups/${groupId}/sports/analytics`)}><BarChart3 className="mr-2 inline h-4 w-4" />Review game impact</Button></section> : null}
      </main>
    </div>
  );
}
