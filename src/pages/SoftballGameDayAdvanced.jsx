import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  CircleDot,
  Eye,
  EyeOff,
  Edit3,
  Loader2,
  Minus,
  Plus,
  Radio,
  RotateCcw,
  Share2,
  Trophy,
  Undo2,
  UserRound,
} from "lucide-react";

import ModeBar from "../components/ModeBar";
import SoftballDefenseField from "../components/sports/SoftballDefenseField";
import { useAuth } from "../auth/AuthContext";
import { getMemberships } from "../api/social";
import {
  correctSoftballPlay,
  finishSportsGame,
  getGameCastSettings,
  getPlateAppearances,
  getPlayerCard,
  getSoftballRuleSets,
  getSportsGame,
  recordSoftballPlay,
  saveSoftballPlayContext,
  setOpponentHomeRuns,
  setOpponentScore,
  updateGameInningLine,
  startSportsGame,
  substituteSportsGame,
  undoSoftballPlay,
  updateDefensivePosition,
  updateGameCastSettings,
  updateSportsGame,
} from "../api/sports";

const RESULTS = [
  { value: "1B", label: "1B", detail: "Single", outs: 0, tone: "cyan" },
  { value: "2B", label: "2B", detail: "Double", outs: 0, tone: "cyan" },
  { value: "3B", label: "3B", detail: "Triple", outs: 0, tone: "cyan" },
  { value: "HR", label: "HR", detail: "Home run", outs: 0, rbi: 1, runs: 1, tone: "green" },
  { value: "BB", label: "BB", detail: "Walk", outs: 0, tone: "violet" },
  { value: "OUT", label: "OUT", detail: "Out", outs: 1, tone: "slate" },
  { value: "K", label: "K", detail: "Strikeout", outs: 1, tone: "slate" },
  { value: "ROE", label: "ROE", detail: "Error", outs: 0, tone: "amber" },
  { value: "FC", label: "FC", detail: "Fielder's choice", outs: 1, tone: "amber" },
  { value: "SF", label: "SF", detail: "Sac fly", outs: 1, productive: true, tone: "amber" },
];

const QUICK_RESULT_VALUES = ["1B", "2B", "3B", "HR", "BB", "ROE", "OUT"];
const OUT_OPTIONS = [
  { value: "OUT", label: "Routine", detail: "Routine out", outs: 1 },
  { value: "K", label: "K", detail: "Strikeout", outs: 1 },
  { value: "FC", label: "FC", detail: "Fielder's choice", outs: 1 },
  { value: "SF", label: "SF", detail: "Sac fly", outs: 1, productive: true },
  { value: "OUT", label: "DP", detail: "Double play", outs: 2 },
  { value: "OUT", label: "TP", detail: "Triple play", outs: 3 },
];

const BATTED_BALLS = [["GROUND", "Ground"], ["LINE", "Line"], ["FLY", "Fly"], ["POP", "Pop"]];
const SPRAY_ZONES = [
  ["LEFT_LINE", "LF line"], ["LEFT", "Left"], ["LEFT_CENTER", "Left center"],
  ["CENTER", "Center"], ["RIGHT_CENTER", "Right center"], ["RIGHT", "Right"],
  ["RIGHT_LINE", "RF line"], ["INFIELD_LEFT", "IF left"], ["INFIELD_MIDDLE", "IF middle"], ["INFIELD_RIGHT", "IF right"],
];
const POSITIONS = ["P", "C", "1B", "2B", "3B", "SS", "MM", "LF", "LC", "CF", "RC", "RF", "OF", "EH1", "EH2", "EH", "DH"];

const cx = (...values) => values.filter(Boolean).join(" ");
const list = (value) => Array.isArray(value) ? value : [];
const num = (value) => Number(value || 0);
const errorText = (error) => error?.response?.data?.detail || Object.values(error?.response?.data || {})?.flat?.()?.[0] || error?.message || "Something went wrong.";

function scoringSuggestion(result, bases, outsBefore = 0) {
  const first = Boolean(bases.first);
  const second = Boolean(bases.second);
  const third = Boolean(bases.third);
  const runners = Number(first) + Number(second) + Number(third);

  let runs = 0;
  if (result === "1B") runs = third ? 1 : 0;
  if (result === "2B") runs = Number(second) + Number(third);
  if (result === "3B") runs = runners;
  if (result === "HR") runs = runners + 1;
  if (result === "BB") runs = first && second && third ? 1 : 0;
  if (result === "SF") runs = third && outsBefore < 2 ? 1 : 0;

  return { runs, rbi: runs };
}

function predictedBasesAfter(result, bases, runsScored, suggestion) {
  const first = Boolean(bases.first);
  const second = Boolean(bases.second);
  const third = Boolean(bases.third);
  const extraRuns = Math.max(0, num(runsScored) - num(suggestion?.runs));

  if (result === "HR") return { first: false, second: false, third: false };
  if (result === "3B") return { first: false, second: false, third: true };
  if (result === "2B") {
    return {
      first: false,
      second: true,
      third: first && extraRuns === 0,
    };
  }
  if (result === "1B") {
    return {
      first: true,
      second: first,
      third: second && extraRuns === 0,
    };
  }
  if (result === "BB") {
    return {
      first: true,
      second: first || second,
      third: third || (first && second),
    };
  }
  if (result === "SF" && runsScored > 0) return { first, second, third: false };
  return { first, second, third };
}

function gameBattingMetrics(plays) {
  let ab = 0;
  let hits = 0;
  let walks = 0;
  let sacFlies = 0;
  let totalBases = 0;
  let rbi = 0;
  let runs = 0;

  for (const play of plays) {
    rbi += num(play.rbi);
    runs += num(play.runs_scored);
    if (!["BB", "SF"].includes(play.result)) ab += 1;
    if (["1B", "2B", "3B", "HR"].includes(play.result)) hits += 1;
    if (play.result === "BB") walks += 1;
    if (play.result === "SF") sacFlies += 1;
    if (play.result === "1B") totalBases += 1;
    if (play.result === "2B") totalBases += 2;
    if (play.result === "3B") totalBases += 3;
    if (play.result === "HR") totalBases += 4;
  }

  const avg = ab ? hits / ab : 0;
  const obpDen = ab + walks + sacFlies;
  const obp = obpDen ? (hits + walks) / obpDen : 0;
  const slg = ab ? totalBases / ab : 0;

  return {
    pa: plays.length,
    ab,
    hits,
    rbi,
    runs,
    avg,
    obp,
    slg,
    ops: obp + slg,
  };
}

function playBadge(play) {
  if (play.result !== "OUT") return play.result;
  const note = String(play.notes || "").toLowerCase();
  if (note.includes("double play")) return "DP";
  if (note.includes("triple play")) return "TP";
  return "OUT";
}

function Button({ children, onClick, primary, danger, disabled, className = "" }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cx(
      "min-h-9 rounded-xl px-2.5 text-[10px] font-black transition active:scale-[.98] disabled:opacity-40",
      primary ? "bg-cyan-300 text-slate-950" : danger ? "border border-rose-300/25 bg-rose-300/10 text-rose-100" : "border border-white/10 bg-white/[.035] text-slate-200",
      className,
    )}>{children}</button>
  );
}

function MiniStepper({ label, value, onChange, max = 9 }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-1.5">
      <div className="text-center text-[7px] font-black uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 grid grid-cols-[1.9rem_1fr_1.9rem] items-center gap-1">
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10"><Minus className="h-3 w-3" /></button>
        <div className="text-center text-lg font-black text-white">{value}</div>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10"><Plus className="h-3 w-3" /></button>
      </div>
    </div>
  );
}

function Toggle({ active, onClick, children }) {
  return <button type="button" onClick={onClick} className={cx("min-h-8 rounded-lg border px-2 text-[9px] font-black", active ? "border-cyan-300/35 bg-cyan-300/12 text-cyan-100" : "border-white/10 bg-black/15 text-slate-400")}>{active ? <Check className="mr-1 inline h-3 w-3" /> : null}{children}</button>;
}

function resultTone(row, active, disabled) {
  if (disabled) return "border-white/5 bg-white/[.015] text-slate-700";
  if (active) return "border-white/60 bg-white text-slate-950";
  if (row.tone === "green") return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  if (row.tone === "violet") return "border-violet-300/25 bg-violet-300/10 text-violet-100";
  if (row.tone === "amber") return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  if (row.tone === "cyan") return "border-cyan-300/25 bg-cyan-300/10 text-cyan-100";
  return "border-white/10 bg-white/[.035] text-slate-200";
}


function statRate(value) {
  return num(value).toFixed(3).replace(/^0(?=\.)/, "");
}

function HitterTendencyFan({ card, compact = false }) {
  const zones = list(card?.tendencies?.spray_field);
  const sample = num(card?.tendencies?.spray_total);
  if (!card) {
    return <div className="rounded-xl border border-white/10 bg-black/15 p-3 text-center text-[9px] text-slate-600">Loading hitter history…</div>;
  }
  if (!sample) {
    return <div className="rounded-xl border border-dashed border-white/10 bg-black/10 p-3 text-center text-[9px] text-slate-500">No spray-chart data yet. Record spray zones on batted balls and the percentages will build automatically.</div>;
  }
  const labels = { LEFT:"LF", LEFT_CENTER:"LC", CENTER:"CF", RIGHT_CENTER:"RC", RIGHT:"RF" };
  const maxPct = Math.max(...zones.map((row)=>num(row.pct)), 0.01);
  return (
    <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[.035] p-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[7px] font-black uppercase tracking-[.13em] text-emerald-300">Historical spray tendency</div>
          <div className="mt-0.5 text-[8px] text-slate-500">{sample} tracked batted ball{sample===1?"":"s"} · descriptive, not a prediction</div>
        </div>
        <div className="text-[8px] font-black text-slate-400">{num(card?.tendencies?.sample_size)} PA</div>
      </div>
      <div className={cx("mt-2 grid grid-cols-5 items-end gap-1 rounded-t-[4rem] border border-emerald-200/10 bg-[#08291d] px-2 pt-3", compact ? "h-20" : "h-28")}>
        {zones.map((row)=>(
          <div key={row.zone} className="flex h-full min-w-0 flex-col items-center justify-end">
            <div className="mb-1 text-[8px] font-black text-white">{Math.round(num(row.pct)*100)}%</div>
            <div
              className="w-full rounded-t-md bg-emerald-300/20"
              style={{height:`${Math.max(8, Math.round((num(row.pct)/maxPct)*55))}%`}}
            />
            <div className="mt-1 text-[7px] font-black text-emerald-100">{labels[row.zone] || row.zone}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayerBackCard({ card }) {
  if (!card) return null;
  const overall = card.overall || {};
  const seasons = list(card.seasons);
  const split = (scope) => list(card.splits).find((row)=>row.scope===scope) || {};
  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-cyan-300/15 bg-gradient-to-br from-cyan-300/[.08] to-violet-300/[.05] p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[8px] font-black uppercase tracking-[.14em] text-cyan-300">Player card</div>
            <div className="mt-1 text-xl font-black text-white">#{card.player?.jersey_number || "—"} {card.player?.display_name}</div>
            <div className="mt-1 text-[9px] text-slate-400">{card.player?.primary_position || "Position TBD"} · {card.team?.name}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-center">
            <div className="text-[7px] font-black uppercase text-slate-500">OPS</div>
            <div className="text-xl font-black text-white">{statRate(overall.ops)}</div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-5 gap-1">
          {[["G",overall.g],["AVG",statRate(overall.avg)],["HR",overall.hr],["RBI",overall.rbi],["R",overall.runs]].map(([label,value])=>(
            <div key={label} className="rounded-lg border border-white/10 bg-black/15 p-1.5 text-center">
              <div className="text-[6px] font-black text-slate-500">{label}</div>
              <div className="mt-0.5 text-[10px] font-black text-white">{value ?? 0}</div>
            </div>
          ))}
        </div>
      </section>

      <HitterTendencyFan card={card} />

      <section className="rounded-xl border border-white/10 bg-black/15 p-2.5">
        <div className="text-[8px] font-black uppercase tracking-wide text-slate-500">League vs tournament</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {[["LEAGUE","League",split("LEAGUE")],["TOURNAMENT","Tournament",split("TOURNAMENT")]].map(([key,label,row])=>(
            <div key={key} className="rounded-xl border border-white/10 bg-white/[.025] p-2">
              <div className="text-[8px] font-black text-cyan-200">{label}</div>
              <div className="mt-1 grid grid-cols-2 gap-x-2 text-[8px] text-slate-400">
                <span>G <b className="text-white">{num(row.g)}</b></span>
                <span>AVG <b className="text-white">{statRate(row.avg)}</b></span>
                <span>HR <b className="text-white">{num(row.hr)}</b></span>
                <span>RBI <b className="text-white">{num(row.rbi)}</b></span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-x-auto rounded-xl border border-white/10 bg-black/15 p-2.5">
        <div className="mb-2 text-[8px] font-black uppercase tracking-wide text-slate-500">Year / season history</div>
        <table className="min-w-[560px] w-full text-center text-[8px]">
          <thead className="text-slate-600"><tr><th className="py-1 text-left">SEASON</th><th>TYPE</th><th>G</th><th>AB</th><th>H</th><th>AVG</th><th>OBP</th><th>SLG</th><th>OPS</th><th>HR</th><th>RBI</th></tr></thead>
          <tbody>
            {seasons.map((row,index)=>(
              <tr key={`${row.year || "hist"}-${row.season}-${row.scope}-${index}`} className="border-t border-white/5">
                <td className="py-1.5 text-left font-black text-white">{row.year ? `${row.year} · ` : ""}{row.season}</td>
                <td className="text-slate-400">{row.scope}</td>
                <td>{num(row.g)}</td><td>{num(row.ab)}</td><td>{num(row.h)}</td>
                <td>{statRate(row.avg)}</td><td>{statRate(row.obp)}</td><td>{statRate(row.slg)}</td><td className="font-black text-cyan-100">{statRate(row.ops)}</td>
                <td>{num(row.hr)}</td><td>{num(row.rbi)}</td>
              </tr>
            ))}
            {!seasons.length ? <tr><td colSpan="11" className="py-4 text-center text-slate-600">No season history yet.</td></tr> : null}
          </tbody>
        </table>
      </section>
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
  const [ruleSets, setRuleSets] = useState([]);
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
  const [outMenuOpen, setOutMenuOpen] = useState(false);
  const [outChoice, setOutChoice] = useState(null);
  const [editingPlay, setEditingPlay] = useState(null);
  const [editForm, setEditForm] = useState({ inning: 1, result: "OUT", outs_recorded: 1, rbi: 0, runs_scored: 0, notes: "" });
  const [hitterCard, setHitterCard] = useState(null);
  const [playerCard, setPlayerCard] = useState(null);
  const [playerCardOpen, setPlayerCardOpen] = useState(false);
  const [substituteOpen, setSubstituteOpen] = useState(false);
  const [subForm, setSubForm] = useState({ batting_order: "", incoming_player: "", defensive_position: "" });

  const canManage = useMemo(() => Boolean(game?.can_manage) || memberships.some(
    (membership) => Number(membership.group) === Number(groupId)
      && Number(membership.user) === userId
      && membership.status === "ACTIVE"
      && ["OWNER", "DIRECTOR", "MANAGER"].includes(membership.role),
  ), [game?.can_manage, memberships, groupId, userId]);

  const lineup = useMemo(() => [...list(game?.lineup_spots)].sort((a, b) => num(a.batting_order) - num(b.batting_order)), [game]);
  const benchPlayers = useMemo(() => list(game?.bench_players), [game?.bench_players]);
  const substitutions = useMemo(() => list(game?.substitutions), [game?.substitutions]);

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
        const [share, rules] = await Promise.all([
          getGameCastSettings(gameId).catch(() => null),
          getSoftballRuleSets().catch(() => []),
        ]);
        setGamecast(share);
        setRuleSets(list(rules));
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [gameId]);

  useEffect(() => {
    if (!game) return;
    try {
      if (game.status === "LIVE") {
        localStorage.setItem("sw_live_sports_game_v1", JSON.stringify({
          groupId: Number(groupId), gameId: Number(game.id), teamName: game.team_name || "", opponentName: game.opponent_name || "",
        }));
      } else if (game.status === "FINAL") {
        const current = JSON.parse(localStorage.getItem("sw_live_sports_game_v1") || "null");
        if (Number(current?.gameId) === Number(game.id)) localStorage.removeItem("sw_live_sports_game_v1");
      }
      window.dispatchEvent(new CustomEvent("sw:liveSportsGameChanged"));
    } catch {}
  }, [game?.status, game?.id, groupId]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`sw_sports_bases_${gameId}`) || "null");
      if (saved && typeof saved === "object") {
        setRunner1(Boolean(saved.first));
        setRunner2(Boolean(saved.second));
        setRunner3(Boolean(saved.third));
      }
    } catch {}
  }, [gameId]);

  useEffect(() => {
    try {
      localStorage.setItem(`sw_sports_bases_${gameId}`, JSON.stringify({
        first: runner1,
        second: runner2,
        third: runner3,
      }));
    } catch {}
  }, [gameId, runner1, runner2, runner3]);

  useEffect(() => {
    if (game?.status !== "LIVE") return undefined;
    const id = window.setInterval(() => refresh({ quiet: true }), 5000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.status, gameId]);

  useEffect(() => {
    const playerId = game?.current_batter?.id;
    if (!playerId) {
      setHitterCard(null);
      return undefined;
    }
    let alive = true;
    getPlayerCard(playerId)
      .then((data) => { if (alive) setHitterCard(data); })
      .catch(() => { if (alive) setHitterCard(null); });
    return () => { alive = false; };
  }, [game?.current_batter?.id]);

  async function run(fn, message) {
    setBusy(true); setError(""); setNotice("");
    try {
      const value = await fn();
      if (message) setNotice(message);
      await refresh({ quiet: true });
      return value;
    } catch (err) {
      setError(errorText(err));
      return null;
    } finally { setBusy(false); }
  }

  function applyResult(row, choice = null) {
    if (row.value === "HR" && game?.home_run_allowed === false) return;
    const remainingOuts = Math.max(0, 3 - num(game?.outs));
    const nextOuts = Math.min(remainingOuts, num(choice?.outs ?? row.outs ?? 0));
    const suggestion = scoringSuggestion(
      row.value,
      { first: runner1, second: runner2, third: runner3 },
      num(game?.outs),
    );

    setResult(row.value);
    setOutsRecorded(nextOuts);
    setRbi(suggestion.rbi);
    setRuns(suggestion.runs);
    setProductiveOut(Boolean(choice?.productive ?? row.productive));
    setOutChoice(choice);
    setOutMenuOpen(false);
    if (["BB", "K"].includes(row.value)) {
      setBattedBallType("");
      setSprayZone("");
    }
  }

  function chooseResult(row) {
    if (row.value === "OUT") {
      setOutMenuOpen(true);
      return;
    }
    applyResult(row);
  }

  function chooseOut(option) {
    const row = RESULTS.find((item) => item.value === option.value) || RESULTS.find((item) => item.value === "OUT");
    applyResult({ ...row, value: option.value, productive: option.productive }, option);
  }

  function clearEntry({ keepBases = true } = {}) {
    setResult(""); setOutsRecorded(0); setRbi(0); setRuns(0);
    if (!keepBases) { setRunner1(false); setRunner2(false); setRunner3(false); }
    setRunnersAdvanced(0); setProductiveOut(false); setBattedBallType(""); setSprayZone("");
    setOutMenuOpen(false); setOutChoice(null);
  }

  async function recordPlay() {
    if (!result || !game || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const beforeInning = num(game.current_inning);
      const basesBefore = { first: runner1, second: runner2, third: runner3 };
      const suggestion = scoringSuggestion(result, basesBefore, num(game.outs));
      const response = await recordSoftballPlay(game.id, {
        result,
        outs_recorded: outsRecorded,
        rbi,
        runs_scored: runs,
        notes: outChoice?.detail || "",
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
        } catch {}
      }

      const inningAdvanced = num(response?.game?.current_inning) > beforeInning;
      if (inningAdvanced) {
        setRunner1(false); setRunner2(false); setRunner3(false);
        setNotice(`3 outs — inning ${response.game.current_inning} started automatically.`);
      } else {
        const nextBases = predictedBasesAfter(result, basesBefore, runs, suggestion);
        setRunner1(nextBases.first);
        setRunner2(nextBases.second);
        setRunner3(nextBases.third);
      }

      clearEntry({ keepBases: true });
      await refresh({ quiet: true });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  function openPlayEditor(play) {
    if (!canManage) return;
    setEditingPlay(play);
    setEditForm({
      inning: Math.max(1, num(play.inning)),
      result: play.result || "OUT",
      outs_recorded: num(play.outs_recorded),
      rbi: num(play.rbi),
      runs_scored: num(play.runs_scored),
      notes: play.notes || "",
    });
  }

  async function savePlayCorrection() {
    if (!editingPlay || busy) return;
    const saved = await run(
      () => correctSoftballPlay(editingPlay.id, {
        inning: Math.max(1, num(editForm.inning)),
        result: editForm.result,
        outs_recorded: Math.max(0, Math.min(3, num(editForm.outs_recorded))),
        rbi: Math.max(0, num(editForm.rbi)),
        runs_scored: Math.max(0, num(editForm.runs_scored)),
        notes: editForm.notes || "",
      }),
      "Scorebook corrected.",
    );
    if (saved) setEditingPlay(null);
  }
  async function openPlayerCard(playerId) {
    if (!playerId) return;
    setPlayerCardOpen(true);
    setPlayerCard(null);
    try {
      const data = await getPlayerCard(playerId);
      setPlayerCard(data);
    } catch (err) {
      setError(errorText(err));
      setPlayerCardOpen(false);
    }
  }

  function openSubstitution(spot = null, incoming = null) {
    const fallback = spot || lineup.find((row) => num(row.batting_order) === num(game?.current_batter_order)) || lineup[0];
    const bench = incoming || benchPlayers[0] || null;
    setSubForm({
      batting_order: fallback ? String(fallback.batting_order) : "",
      incoming_player: bench ? String(bench.id) : "",
      defensive_position: bench?.primary_position || fallback?.defensive_position || "",
    });
    setSubstituteOpen(true);
  }

  async function saveSubstitution() {
    if (!subForm.batting_order || !subForm.incoming_player) return;
    const saved = await run(
      () => substituteSportsGame(game.id, {
        batting_order: Number(subForm.batting_order),
        incoming_player: Number(subForm.incoming_player),
        defensive_position: subForm.defensive_position,
      }),
      "Substitution recorded.",
    );
    if (saved) setSubstituteOpen(false);
  }

  async function toggleGameCast(enabled) {
    const next = await run(() => updateGameCastSettings(game.id, { enabled, show_player_stats: true }), enabled ? "GameCast is live." : "GameCast sharing off.");
    if (next) setGamecast(next);
  }

  async function shareGameCast() {
    if (!gamecast?.token) return;
    const url = `${window.location.origin}/gamecast/${gamecast.token}`;
    if (navigator.share) {
      try { await navigator.share({ title: `${game.team_name} GameCast`, text: `Follow ${game.team_name} vs ${game.opponent_name} live.`, url }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(url); setNotice("GameCast link copied."); } catch { setNotice(url); }
  }

  function facebookGameCast() {
    if (!gamecast?.token) return;
    const url = `${window.location.origin}/gamecast/${gamecast.token}`;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer");
  }

  async function changeRule(ruleSetId) {
    const rule = ruleSets.find((row) => String(row.id) === String(ruleSetId));
    await run(() => updateSportsGame(game.id, {
      rule_set: ruleSetId ? Number(ruleSetId) : null,
      ...(rule?.innings ? { innings_scheduled: Number(rule.innings) } : {}),
    }), "Game rules updated.");
  }

  async function changeDefense(playerId, position) {
    await run(() => updateDefensivePosition(game.id, Number(playerId), position), "Defense updated.");
  }

  async function changeOpponentInning(inning, field, delta) {
    const current = list(game?.inning_lines).find((row) => num(row.inning) === num(inning)) || {};
    const payload = {
      inning: Number(inning),
      opponent_runs: num(current.opponent_runs),
      opponent_hits: num(current.opponent_hits),
    };
    payload[field] = Math.max(0, num(payload[field]) + delta);
    await run(() => updateGameInningLine(game.id, payload));
  }

  const innings = useMemo(() => {
    const max = Math.max(num(game?.innings_scheduled) || 7, num(game?.current_inning) || 1, ...plays.map((play) => num(play.inning)));
    return Array.from({ length: max }, (_, index) => index + 1);
  }, [game, plays]);

  const cellMap = useMemo(() => {
    const map = new Map();
    for (const play of plays) {
      const key = `${play.player}-${play.inning}`;
      const rows = map.get(key) || [];
      rows.push(play);
      map.set(key, rows);
    }
    return map;
  }, [plays]);

  const inningTotals = useMemo(() => {
    const map = new Map();
    innings.forEach((inning) => map.set(inning, { runs: 0, hits: 0 }));
    for (const play of plays) {
      const row = map.get(num(play.inning)) || { runs: 0, hits: 0 };
      row.runs += num(play.runs_scored);
      if (["1B", "2B", "3B", "HR"].includes(play.result)) row.hits += 1;
      map.set(num(play.inning), row);
    }
    return map;
  }, [plays, innings]);

  const teamGameMetrics = useMemo(() => gameBattingMetrics(plays), [plays]);

  const currentBatterMetrics = useMemo(
    () => gameBattingMetrics(plays.filter((play) => num(play.player) === num(game?.current_batter?.id))),
    [plays, game?.current_batter?.id],
  );

  const playerGameMetrics = useMemo(() => {
    const map = new Map();
    for (const spot of lineup) {
      map.set(num(spot.player), gameBattingMetrics(plays.filter((play) => num(play.player) === num(spot.player))));
    }
    return map;
  }, [lineup, plays]);

  const opponentInningMap = useMemo(
    () => new Map(list(game?.inning_lines).map((row) => [num(row.inning), row])),
    [game?.inning_lines],
  );

  if (loading) return <div className="min-h-screen bg-[#02060c] text-white"><ModeBar title="Game Book" subtitle="Softball" /><div className="grid min-h-[70vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-cyan-300" /></div></div>;
  if (!game) return <div className="min-h-screen bg-[#02060c] p-4 text-white"><ModeBar title="Game Book" subtitle="Softball" /><div className="rounded-xl border border-rose-300/20 bg-rose-300/10 p-3">{error || "Game unavailable."}</div></div>;

  const live = game.status === "LIVE";
  const final = game.status === "FINAL";
  const currentBatter = game.current_batter;
  const selected = RESULTS.find((row) => row.value === result);
  const selectedDetail = outChoice?.detail || selected?.detail || "";
  const smartSuggestion = selected
    ? scoringSuggestion(result, { first: runner1, second: runner2, third: runner3 }, num(game.outs))
    : { runs: 0, rbi: 0 };
  const basesLoaded = runner1 && runner2 && runner3;
  const rule = game.rule_set_detail;

  return (
    <div className="min-h-screen bg-[#02060c] pb-32 text-slate-100">
      <ModeBar title="Game Book" subtitle={`${game.team_name} • Softball`} />
      <main className="mx-auto max-w-6xl space-y-2.5 px-2.5 py-2.5 sm:px-4">
        <div className="flex items-center justify-between gap-2">
          <Button onClick={() => navigate(`/connect/groups/${groupId}/sports`)}><ArrowLeft className="mr-1 inline h-3.5 w-3.5" />Team</Button>
          <span className={cx("rounded-full px-2.5 py-1.5 text-[8px] font-black uppercase tracking-wide", live ? "bg-emerald-300 text-slate-950" : "border border-white/10 text-slate-300")}>{live ? "● Live" : game.status}</span>
        </div>

        {error ? <div className="rounded-xl border border-rose-300/20 bg-rose-300/10 p-2 text-[10px] text-rose-100">{error}</div> : null}
        {notice ? <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-2 text-[10px] text-cyan-100">{notice}</div> : null}

        <section className="rounded-2xl border border-cyan-300/15 bg-[#07111f] p-2.5">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="text-center"><div className="truncate text-[8px] font-black uppercase text-cyan-300">{game.team_name}</div><div className="text-3xl font-black text-white">{game.runs_for}</div></div>
            <div className="min-w-[7.5rem] rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-center">
              <div className="text-[7px] font-black uppercase tracking-[.14em] text-slate-500">Inning {game.current_inning}</div>
              <div className="mt-1 text-base font-black text-white">{num(game.outs)} OUT{num(game.outs)===1?"":"S"}</div>
              <div className="mt-1.5 flex justify-center gap-1.5">{[0,1,2].map((i)=><span key={i} className={cx("h-3 w-3 rounded-full border",i<num(game.outs)?"border-rose-200 bg-rose-300":"border-white/20 bg-white/[.02]")} />)}</div>
            </div>
            <div className="text-center"><div className="truncate text-[8px] font-black uppercase text-slate-400">{game.opponent_name}</div><div className="text-3xl font-black text-white">{game.runs_against}</div></div>
          </div>
          {live ? <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl border border-white/8 bg-black/15 px-2.5 py-2">
            <div>
              <div className="text-[7px] font-black uppercase tracking-wide text-slate-500">Live situation</div>
              <div className="mt-0.5 text-[9px] font-black text-white">Inning {game.current_inning} · {num(game.outs)} out{num(game.outs)===1?"":"s"} · Batter #{game.current_batter_order}</div>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {[["1B",runner1],["2B",runner2],["3B",runner3]].map(([label,on])=><span key={label} className={cx("grid h-8 w-8 place-items-center rounded-lg border text-[7px] font-black",on?"border-amber-200/40 bg-amber-300/20 text-amber-100":"border-white/10 text-slate-600")}>{label}</span>)}
            </div>
          </div> : null}
        </section>

        <section className="grid grid-cols-5 gap-1.5">
          {[
            ["HITS", teamGameMetrics.hits],
            ["RBI", teamGameMetrics.rbi],
            ["AVG", teamGameMetrics.avg.toFixed(3)],
            ["OBP", teamGameMetrics.obp.toFixed(3)],
            ["OPS", teamGameMetrics.ops.toFixed(3)],
          ].map(([label,value]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-[#07111f] px-1.5 py-2 text-center">
              <div className="text-[7px] font-black text-slate-500">{label}</div>
              <div className="mt-0.5 text-[11px] font-black text-white">{value}</div>
            </div>
          ))}
        </section>

        <section className="overflow-x-auto rounded-2xl border border-white/10 bg-[#07111f] p-2">
          <div className="mb-1 text-[8px] font-black uppercase tracking-[.14em] text-slate-500">Inning scoreboard</div>
          <table className="min-w-max border-collapse text-center text-[8px]">
            <thead><tr><th className="sticky left-0 z-10 min-w-28 bg-[#07111f] px-2 py-1 text-left text-slate-500">TEAM</th>{innings.map((inning)=><th key={inning} className="min-w-10 border-l border-white/5 px-1 py-1">{inning}</th>)}<th className="border-l border-white/10 px-2">R</th><th className="border-l border-white/10 px-2">H</th></tr></thead>
            <tbody>
              <tr className="border-t border-white/5"><td className="sticky left-0 z-10 bg-[#07111f] px-2 py-1.5 text-left font-black text-cyan-100">{game.team_name}</td>{innings.map((inning)=>{const row=inningTotals.get(inning)||{};return <td key={inning} className="border-l border-white/5 px-1">{num(row.runs)}</td>})}<td className="border-l border-white/10 font-black">{game.runs_for}</td><td className="border-l border-white/10 font-black">{innings.reduce((sum,inning)=>sum+num(inningTotals.get(inning)?.hits),0)}</td></tr>
              <tr className="border-t border-white/5"><td className="sticky left-0 z-10 bg-[#07111f] px-2 py-1.5 text-left font-black text-slate-300">{game.opponent_name}</td>{innings.map((inning)=>{const row=opponentInningMap.get(inning)||{};return <td key={inning} className="border-l border-white/5 px-1">{num(row.opponent_runs)}</td>})}<td className="border-l border-white/10 font-black">{game.runs_against}</td><td className="border-l border-white/10 font-black">{innings.reduce((sum,inning)=>sum+num(opponentInningMap.get(inning)?.opponent_hits),0)}</td></tr>
            </tbody>
          </table>
        </section>

        {!lineup.length ? <section className="rounded-xl border border-amber-300/20 bg-amber-300/[.05] p-3 text-[10px] text-amber-100">Build the game lineup before starting Game Book.</section> : null}

        {game.status === "SCHEDULED" && lineup.length ? (
          <div className="grid gap-2 lg:grid-cols-[1fr_.8fr]">
            <SoftballDefenseField lineup={lineup} compact />
            <section className="rounded-2xl border border-cyan-300/15 bg-[#07111f] p-3">
              <div className="text-[8px] font-black uppercase tracking-wide text-cyan-300">Ready</div>
              <div className="mt-1 text-sm font-black text-white">{lineup.length} batters loaded</div>
              {canManage ? <Button primary className="mt-3 w-full" disabled={busy} onClick={() => run(() => startSportsGame(game.id), "Game started.")}><CircleDot className="mr-1 inline h-3.5 w-3.5" />Start Game</Button> : null}
            </section>
          </div>
        ) : null}

        {live ? (
          <>
            <section className="rounded-2xl border border-cyan-300/20 bg-[#07111f] p-2.5">
              <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={()=>openPlayerCard(currentBatter?.id)} className="min-w-0 text-left">
                  <div className="text-[7px] font-black uppercase tracking-[.14em] text-cyan-300">At bat · tap player card</div>
                  <div className="truncate text-base font-black text-white">#{currentBatter?.jersey_number || "—"} {currentBatter?.display_name || "Current batter"}</div>
                  <div className="mt-0.5 text-[8px] text-slate-500">Game: {currentBatterMetrics.hits}-{currentBatterMetrics.ab} · {currentBatterMetrics.rbi} RBI · {currentBatterMetrics.avg.toFixed(3)} AVG</div>
                </button>
                <div className="text-right"><div className="text-[8px] text-slate-500">Order #{game.current_batter_order}<br />{currentBatter?.primary_position || "—"}</div><UserRound className="ml-auto mt-1 h-4 w-4 text-cyan-300"/></div>
              </div>

              <div className="mt-2 grid gap-2 lg:grid-cols-[1.2fr_.8fr]">
                <HitterTendencyFan card={hitterCard} compact />
                <div className="rounded-xl border border-violet-300/15 bg-violet-300/[.035] p-2">
                  <div className="text-[7px] font-black uppercase tracking-wide text-violet-300">Prior result mix</div>
                  <div className="mt-1.5 grid grid-cols-3 gap-1">
                    {list(hitterCard?.tendencies?.results).slice(0,6).map((row)=><div key={row.result} className="rounded-lg border border-white/8 bg-black/15 px-1.5 py-1 text-center"><div className="text-[8px] font-black text-white">{row.result}</div><div className="text-[7px] text-slate-500">{Math.round(num(row.pct)*100)}%</div></div>)}
                  </div>
                  {!list(hitterCard?.tendencies?.results).length?<div className="mt-2 text-[8px] text-slate-600">No prior PA history yet.</div>:null}
                </div>
              </div>

              {canManage ? (
                <>
                  <div className="mt-2 rounded-xl border border-white/10 bg-black/15 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[7px] font-black uppercase tracking-[.13em] text-slate-500">Bases before play</div>
                        <div className="mt-0.5 text-[8px] text-slate-500">Tap occupied bases first. SyncWorks uses them for run/RBI suggestions.</div>
                      </div>
                      {basesLoaded ? <span className="rounded-full bg-amber-300 px-2 py-1 text-[7px] font-black text-slate-950">LOADED</span> : null}
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-1.5">
                      <Toggle active={runner1} onClick={() => setRunner1(!runner1)}>1B</Toggle>
                      <Toggle active={runner2} onClick={() => setRunner2(!runner2)}>2B</Toggle>
                      <Toggle active={runner3} onClick={() => setRunner3(!runner3)}>3B</Toggle>
                      <button type="button" onClick={() => { setRunner1(false); setRunner2(false); setRunner3(false); }} className="min-h-8 rounded-lg border border-white/10 px-2 text-[9px] font-black text-slate-500">Clear</button>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-4 gap-1">
                    {QUICK_RESULT_VALUES.map((value) => RESULTS.find((row) => row.value === value)).filter(Boolean).map((row) => {
                      const blockedHr = row.value === "HR" && game.home_run_allowed === false;
                      const active = row.value === "OUT"
                        ? outMenuOpen || (result === "OUT" && Boolean(outChoice))
                        : result === row.value;
                      return (
                        <button
                          key={row.value}
                          type="button"
                          disabled={blockedHr}
                          onClick={() => chooseResult(row)}
                          className={cx(
                            "min-h-12 rounded-xl border px-1 py-1 text-center",
                            resultTone(row,active,blockedHr),
                            row.value === "OUT" && "col-span-2",
                          )}
                        >
                          <b className="block text-[12px]">{row.label}</b>
                          <span className="block truncate text-[7px] opacity-70">
                            {blockedHr ? "RULE" : row.value === "OUT" ? "Choose out" : row.detail}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {outMenuOpen ? (
                    <div className="mt-2 rounded-xl border border-slate-300/15 bg-slate-300/[.04] p-2">
                      <div className="text-[8px] font-black uppercase tracking-[.12em] text-slate-400">What kind of out?</div>
                      <div className="mt-2 grid grid-cols-3 gap-1.5">
                        {OUT_OPTIONS.map((option) => (
                          <button
                            key={option.label}
                            type="button"
                            onClick={() => chooseOut(option)}
                            className="min-h-10 rounded-lg border border-white/10 bg-black/20 px-2 text-[9px] font-black text-white"
                          >
                            <span className="block text-[11px]">{option.label}</span>
                            <span className="text-[7px] font-medium text-slate-500">{option.detail}</span>
                          </button>
                        ))}
                      </div>
                      <div className="mt-2 text-[8px] text-cyan-200">
                        Any out that reaches 3 total outs automatically starts the next inning.
                      </div>
                    </div>
                  ) : null}

                  {selected ? (
                    <div className="mt-2 rounded-xl border border-white/10 bg-black/20 p-2">
                      <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                        <div className="text-[9px]">
                          <b className="text-white">{selectedDetail}</b>
                          <span className="ml-1 text-slate-500">selected</span>
                          {outsRecorded ? (
                            <span className="ml-2 rounded-full bg-rose-300/10 px-2 py-0.5 text-[7px] font-black text-rose-100">
                              +{outsRecorded} OUT{outsRecorded === 1 ? "" : "S"}
                            </span>
                          ) : null}
                        </div>
                        <button type="button" onClick={() => clearEntry({ keepBases: true })} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10">
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {(smartSuggestion.runs > 0 || smartSuggestion.rbi > 0) ? (
                        <div className="mt-2 rounded-lg border border-cyan-300/20 bg-cyan-300/[.07] p-2 text-[8px] leading-4 text-cyan-100">
                          Smart start: <b>{smartSuggestion.runs} run{smartSuggestion.runs === 1 ? "" : "s"}</b> / <b>{smartSuggestion.rbi} RBI</b> from the current base state. Use +/− if the actual play differed.
                        </div>
                      ) : null}

                      {["1B","2B","3B","BB","ROE"].includes(result) ? (
                        <button
                          type="button"
                          onClick={() => setOutsRecorded(outsRecorded ? 0 : 1)}
                          className={cx(
                            "mt-2 flex min-h-9 w-full items-center justify-between rounded-lg border px-2.5 text-[9px] font-black",
                            outsRecorded
                              ? "border-rose-300/25 bg-rose-300/10 text-rose-100"
                              : "border-white/10 bg-white/[.025] text-slate-300",
                          )}
                        >
                          <span>Runner out on bases</span>
                          <span>{outsRecorded ? "+" + outsRecorded + " OUT" : "+1 OUT"}</span>
                        </button>
                      ) : null}
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        <MiniStepper label="RBI" value={rbi} onChange={setRbi} max={4} />
                        <MiniStepper label="Runs" value={runs} onChange={setRuns} max={4} />
                      </div>

                      <details className="mt-2 rounded-lg border border-white/10 bg-white/[.02] p-2">
                        <summary className="cursor-pointer text-[8px] font-black uppercase tracking-wide text-slate-500">More play detail</summary>
                        <div className="mt-2 space-y-2">
                          {outsRecorded ? <MiniStepper label="Outs on play" value={outsRecorded} onChange={setOutsRecorded} max={Math.max(0,3-num(game.outs))} /> : null}
                          <MiniStepper label="Runners advanced" value={runnersAdvanced} onChange={setRunnersAdvanced} max={3} />
                          {["OUT","FC","SF"].includes(result) ? <Toggle active={result==="SF"||productiveOut} onClick={() => result!=="SF"&&setProductiveOut(!productiveOut)}>Productive out</Toggle> : null}
                          {!["BB","K"].includes(result) ? (
                            <>
                              <div className="grid grid-cols-4 gap-1">
                                {BATTED_BALLS.map(([value,label])=><Toggle key={value} active={battedBallType===value} onClick={()=>setBattedBallType(battedBallType===value?"":value)}>{label}</Toggle>)}
                              </div>
                              <div className="grid grid-cols-2 gap-1 sm:grid-cols-5">
                                {SPRAY_ZONES.map(([value,label])=><Toggle key={value} active={sprayZone===value} onClick={()=>setSprayZone(sprayZone===value?"":value)}>{label}</Toggle>)}
                              </div>
                            </>
                          ) : null}
                        </div>
                      </details>

                      <Button primary className="mt-2 w-full" disabled={busy} onClick={recordPlay}>
                        Record {outChoice?.label || selected.label}
                      </Button>
                    </div>
                  ) : null}
                </>
              ) : <div className="mt-2 text-[9px] text-amber-200">Managers control scoring.</div>}
            </section>

            <section className="overflow-x-auto rounded-2xl border border-white/10 bg-[#07111f] p-2">
              <div className="mb-1.5 flex items-center justify-between"><div><div className="text-[8px] font-black uppercase tracking-[.14em] text-slate-500">Scorebook grid</div>{canManage?<div className="mt-0.5 text-[7px] text-slate-600">Tap any recorded box to correct it.</div>:null}</div>{canManage&&plays.length?<Button onClick={()=>run(()=>undoSoftballPlay(game.id),"Last play undone.")}><Undo2 className="mr-1 inline h-3.5 w-3.5" />Undo</Button>:null}</div>
              <table className="min-w-max border-collapse text-center text-[8px]">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 min-w-28 bg-[#07111f] px-2 py-1 text-left text-slate-500">PLAYER</th>
                    {innings.map((inning)=><th key={inning} className="min-w-12 border-l border-white/5 px-1 py-1 text-slate-500">{inning}</th>)}
                    <th className="border-l border-cyan-300/10 px-2 text-cyan-200">H/AB</th>
                    <th className="border-l border-cyan-300/10 px-2 text-cyan-200">RBI</th>
                  </tr>
                </thead>
                <tbody>
                  {lineup.map((spot)=>{
                    const metrics=playerGameMetrics.get(num(spot.player))||gameBattingMetrics([]);
                    return (
                      <tr key={spot.id} className="border-t border-white/5">
                        <td className="sticky left-0 z-10 max-w-28 bg-[#07111f] px-2 py-1.5 text-left font-black text-white">
                          <button type="button" onClick={()=>openPlayerCard(spot.player)} className="flex max-w-28 items-center gap-1 text-left">
                            <span className="truncate">{spot.batting_order}. {spot.player_detail?.display_name}</span>
                            <UserRound className="h-3 w-3 shrink-0 text-cyan-300/70"/>
                          </button>
                        </td>
                        {innings.map((inning)=>{
                          const rows=cellMap.get(String(spot.player) + "-" + inning)||[];
                          return (
                            <td key={inning} className="border-l border-white/5 px-1 py-1">
                              <div className="flex justify-center gap-0.5">
                                {rows.map((play)=>(
                                  <button
                                    key={play.id}
                                    type="button"
                                    onClick={() => openPlayEditor(play)}
                                    className={cx(
                                      "rounded px-1 py-0.5 font-black",
                                      canManage && "cursor-pointer transition hover:ring-1 hover:ring-cyan-300/40",
                                      ["1B","2B","3B","HR"].includes(play.result)
                                        ? "bg-emerald-300/15 text-emerald-100"
                                        : play.result==="BB"
                                          ? "bg-violet-300/15 text-violet-100"
                                          : "bg-white/[.05] text-slate-300",
                                    )}
                                    title={canManage ? "Tap to correct this scorebook entry" : undefined}
                                  >
                                    <span className="flex items-center justify-center gap-0.5">
                                      <span>{playBadge(play)}</span>
                                      {num(play.outs_recorded)>0?<span className="text-[6px] text-rose-200">+{num(play.outs_recorded)}O</span>:null}
                                      {canManage?<Edit3 className="h-2.5 w-2.5 opacity-55"/>:null}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </td>
                          );
                        })}
                        <td className="border-l border-cyan-300/10 px-2 font-black text-cyan-100">{metrics.hits}/{metrics.ab}</td>
                        <td className="border-l border-cyan-300/10 px-2 font-black text-cyan-100">{metrics.rbi}</td>
                      </tr>
                    );
                  })}
                  <tr className="border-t border-cyan-300/15">
                    <td className="sticky left-0 z-10 bg-[#07111f] px-2 py-1 text-left font-black text-cyan-200">RUNS / HITS</td>
                    {innings.map((inning)=>{
                      const t=inningTotals.get(inning)||{};
                      return <td key={inning} className="border-l border-white/5 px-1 py-1 font-black text-cyan-100">{num(t.runs)} / {num(t.hits)}</td>;
                    })}
                    <td className="border-l border-cyan-300/10 px-2 font-black text-cyan-100">{teamGameMetrics.hits}/{teamGameMetrics.ab}</td>
                    <td className="border-l border-cyan-300/10 px-2 font-black text-cyan-100">{teamGameMetrics.rbi}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className="rounded-2xl border border-violet-300/15 bg-[#07111f] p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[8px] font-black uppercase tracking-[.14em] text-violet-300">Bench / subs</div>
                  <div className="mt-0.5 text-[8px] text-slate-500">{benchPlayers.length} available · {substitutions.length} substitution{substitutions.length===1?"":"s"} recorded</div>
                </div>
                {canManage&&live&&benchPlayers.length?<Button onClick={()=>openSubstitution()}>Substitute</Button>:null}
              </div>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {benchPlayers.map((player)=>(
                  <div key={player.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[.025] p-2">
                    <button type="button" onClick={()=>openPlayerCard(player.id)} className="min-w-0 text-left">
                      <b className="block truncate text-[10px] text-white">#{player.jersey_number||"—"} {player.display_name}</b>
                      <span className="text-[8px] text-slate-500">{player.primary_position||"Utility"} · SUB</span>
                    </button>
                    {canManage&&live?<button type="button" onClick={()=>openSubstitution(null,player)} className="shrink-0 rounded-lg border border-violet-300/20 bg-violet-300/[.06] px-2 py-1 text-[8px] font-black text-violet-100">SUB IN</button>:null}
                  </div>
                ))}
                {!benchPlayers.length?<div className="rounded-xl border border-dashed border-white/10 p-3 text-center text-[9px] text-slate-600 sm:col-span-2 lg:col-span-3">No available bench players. Anyone removed from the live lineup returns here as a sub option.</div>:null}
              </div>
              {substitutions.length?<div className="mt-2 rounded-xl border border-white/8 bg-black/15 p-2">
                <div className="text-[7px] font-black uppercase tracking-wide text-slate-600">Substitution log</div>
                <div className="mt-1 space-y-1">
                  {substitutions.slice().reverse().slice(0,6).map((sub)=><div key={sub.id} className="text-[8px] text-slate-400"><b className="text-violet-200">Inn {sub.inning}</b> · {sub.incoming_player_detail?.display_name} for {sub.outgoing_player_detail?.display_name} · slot {sub.batting_order}{sub.defensive_position ? " · " + sub.defensive_position : ""}</div>)}
                </div>
              </div>:null}
            </section>

            <div className="grid gap-2 lg:grid-cols-[1.15fr_.85fr]">
              <div className="space-y-2">
                <SoftballDefenseField lineup={lineup} compact />
                {canManage ? <section className="rounded-2xl border border-white/10 bg-[#07111f] p-2.5"><div className="text-[8px] font-black uppercase tracking-wide text-slate-500">Change defense</div><div className="mt-2 grid grid-cols-2 gap-1.5">{lineup.map((spot)=><label key={spot.id} className="flex min-h-[4.9rem] flex-col items-center justify-center rounded-lg border border-white/8 bg-white/[.02] px-2 py-2 text-center"><span className="w-full truncate text-[9px] font-bold text-slate-300">{spot.player_detail?.display_name}</span><select aria-label={"Position for " + (spot.player_detail?.display_name || "player")} value={spot.defensive_position||""} onChange={(event)=>changeDefense(spot.player,event.target.value)} className="mt-1.5 h-8 w-[5.4rem] rounded-lg border border-white/10 bg-[#050b14] px-1 text-center text-[10px] font-black text-white"><option value="">—</option>{POSITIONS.map((position)=><option key={position}>{position}</option>)}</select></label>)}</div></section> : null}
              </div>

              <div className="space-y-2">
                <section className="rounded-2xl border border-amber-300/15 bg-[#07111f] p-2.5">
                  <div className="text-[8px] font-black uppercase tracking-wide text-amber-300">Rules</div>
                  {canManage ? <select value={game.rule_set||""} onChange={(event)=>changeRule(event.target.value)} className="mt-2 h-9 w-full rounded-lg border border-white/10 bg-[#050b14] px-2 text-[9px] text-white"><option value="">Unlimited / no attached rules</option>{ruleSets.filter((row)=>row.is_active!==false).map((row)=><option key={row.id} value={row.id}>{row.competition_type} · {row.name}</option>)}</select> : null}
                  <div className="mt-2 rounded-lg border border-white/8 bg-black/15 p-2 text-[9px] text-slate-300">{rule ? <><b className="text-white">{rule.name}</b><div>{rule.home_run_rule==="FIXED"?`${rule.home_run_limit} HR cap`:rule.home_run_rule==="ONE_UP"?`One-up / San Diego · max +${rule.home_run_max_ahead}`:"Unlimited HR"}</div></> : "No HR restriction attached."}</div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5"><div className="rounded-lg border border-cyan-300/15 bg-cyan-300/[.04] p-2 text-center"><div className="text-[7px] text-slate-500">OUR HR</div><b className="text-lg text-cyan-100">{game.home_runs_for||0}</b></div><div className="rounded-lg border border-white/10 bg-white/[.025] p-2 text-center"><div className="text-[7px] text-slate-500">OPP HR</div><div className="mt-1 flex items-center justify-center gap-1">{canManage?<button onClick={()=>run(()=>setOpponentHomeRuns(game.id,Math.max(0,num(game.home_runs_against)-1)))} className="grid h-7 w-7 place-items-center rounded-lg border border-white/10"><Minus className="h-3 w-3"/></button>:null}<b className="min-w-5 text-lg">{game.home_runs_against||0}</b>{canManage?<button onClick={()=>run(()=>setOpponentHomeRuns(game.id,num(game.home_runs_against)+1))} className="grid h-7 w-7 place-items-center rounded-lg border border-white/10"><Plus className="h-3 w-3"/></button>:null}</div></div></div>
                  {game.home_run_allowed===false?<div className="mt-2 rounded-lg border border-rose-300/20 bg-rose-300/10 p-2 text-[8px] font-black text-rose-100">HR currently blocked by the attached rule.</div>:null}
                </section>

                {canManage ? <section className="rounded-2xl border border-white/10 bg-[#07111f] p-2.5"><div className="text-[8px] font-black uppercase tracking-wide text-slate-500">Opponent · inning {game.current_inning}</div><div className="mt-2 grid grid-cols-2 gap-2">{[["opponent_runs","Runs"],["opponent_hits","Hits"]].map(([field,label])=>{const row=opponentInningMap.get(num(game.current_inning))||{};return <div key={field} className="rounded-lg border border-white/8 bg-black/15 p-2"><div className="text-center text-[7px] text-slate-500">{label}</div><div className="mt-1 grid grid-cols-[1.8rem_1fr_1.8rem] items-center gap-1"><button onClick={()=>changeOpponentInning(game.current_inning,field,-1)} className="grid h-7 w-7 place-items-center rounded-lg border border-white/10"><Minus className="h-3 w-3"/></button><b className="text-center text-base">{num(row[field])}</b><button onClick={()=>changeOpponentInning(game.current_inning,field,1)} className="grid h-7 w-7 place-items-center rounded-lg border border-white/10"><Plus className="h-3 w-3"/></button></div></div>})}</div></section> : null}

                {canManage&&gamecast?<section className="rounded-2xl border border-emerald-300/15 bg-[#07111f] p-2.5"><div className="flex items-center justify-between"><div><div className="text-[8px] font-black uppercase text-emerald-300">Public GameCast</div><div className="text-[9px] text-slate-500">No login required.</div></div>{gamecast.enabled?<Radio className="h-4 w-4 text-emerald-300"/>:<EyeOff className="h-4 w-4 text-slate-500"/>}</div><div className="mt-2 grid grid-cols-2 gap-1.5"><Button primary={!gamecast.enabled} onClick={()=>toggleGameCast(!gamecast.enabled)}>{gamecast.enabled?<><EyeOff className="mr-1 inline h-3.5 w-3.5"/>Stop</>:<><Eye className="mr-1 inline h-3.5 w-3.5"/>Go live</>}</Button><Button disabled={!gamecast.enabled} onClick={shareGameCast}><Share2 className="mr-1 inline h-3.5 w-3.5"/>Share</Button></div>{gamecast.enabled?<Button className="mt-1.5 w-full" onClick={facebookGameCast}>Share to Facebook</Button>:null}</section>:null}

                {canManage?<Button danger className="w-full" onClick={()=>run(()=>finishSportsGame(game.id),"Game marked final.")}><Trophy className="mr-1 inline h-3.5 w-3.5"/>Finish Game</Button>:null}
              </div>
            </div>
          </>
        ) : null}

        {editingPlay ? (
          <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 px-3 pb-4 pt-20 sm:items-center">
            <div className="w-full max-w-md rounded-[1.6rem] border border-cyan-300/20 bg-[#07111f] p-4 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[8px] font-black uppercase tracking-[.15em] text-cyan-300">Correct scorebook entry</div>
                  <div className="mt-1 text-base font-black text-white">{editingPlay.player_name}</div>
                  <div className="text-[8px] text-slate-500">Save rebuilds the inning totals and live game stats from the corrected book.</div>
                </div>
                <button type="button" onClick={() => setEditingPlay(null)} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-slate-400">×</button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="text-[8px] font-black uppercase text-slate-500">Inning
                  <input type="number" min="1" value={editForm.inning} onChange={(e)=>setEditForm({...editForm,inning:e.target.value})} className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#050b14] px-2 text-[16px] font-black text-white sm:text-xs" />
                </label>
                <label className="text-[8px] font-black uppercase text-slate-500">Result
                  <select value={editForm.result} onChange={(e)=>setEditForm({...editForm,result:e.target.value})} className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#050b14] px-2 text-xs font-black text-white">
                    {RESULTS.map((row)=><option key={row.value} value={row.value}>{row.label} · {row.detail}</option>)}
                  </select>
                </label>
                <label className="text-[8px] font-black uppercase text-slate-500">Outs on play
                  <input type="number" min="0" max="3" value={editForm.outs_recorded} onChange={(e)=>setEditForm({...editForm,outs_recorded:e.target.value})} className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#050b14] px-2 text-[16px] font-black text-white sm:text-xs" />
                </label>
                <label className="text-[8px] font-black uppercase text-slate-500">RBI
                  <input type="number" min="0" max="4" value={editForm.rbi} onChange={(e)=>setEditForm({...editForm,rbi:e.target.value})} className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#050b14] px-2 text-[16px] font-black text-white sm:text-xs" />
                </label>
                <label className="text-[8px] font-black uppercase text-slate-500">Runs
                  <input type="number" min="0" max="4" value={editForm.runs_scored} onChange={(e)=>setEditForm({...editForm,runs_scored:e.target.value})} className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#050b14] px-2 text-[16px] font-black text-white sm:text-xs" />
                </label>
                <label className="text-[8px] font-black uppercase text-slate-500">Note
                  <input value={editForm.notes} onChange={(e)=>setEditForm({...editForm,notes:e.target.value})} placeholder="Optional" className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-[#050b14] px-2 text-[16px] text-white sm:text-xs" />
                </label>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button onClick={() => setEditingPlay(null)}>Cancel</Button>
                <Button primary disabled={busy} onClick={savePlayCorrection}>{busy ? "Saving…" : "Save correction"}</Button>
              </div>
            </div>
          </div>
        ) : null}
        {final ? <section className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[.04] p-4 text-center"><Trophy className="mx-auto h-6 w-6 text-emerald-300"/><div className="mt-1 text-lg font-black">{game.team_name} {game.runs_for}–{game.runs_against} {game.opponent_name}</div><Button className="mt-3" onClick={()=>navigate(`/connect/groups/${groupId}/sports`)}>Back to team</Button></section> : null}
      </main>
    </div>
  );
}
