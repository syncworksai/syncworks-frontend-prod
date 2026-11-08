import React, { useState } from "react";
import { ArrowLeft, RotateCcw, Spade, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = Array.from({ length: 13 }, (_, i) => i + 2);
const WILDS = [3, 5, 7];
const label = (r) => ({ 11: "J", 12: "Q", 13: "K", 14: "A" }[r] || String(r));
const makeDeck = () => SUITS.flatMap((suit) => RANKS.map((rank) => ({ suit, rank: rank === 2 ? 2 : rank })));
function shuffle(cards) {
  const deck = [...cards];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
function combinations(cards) {
  if (cards.length <= 5) return [cards];
  return cards.map((_, i) => cards.filter((__, j) => j !== i));
}
function bestStraight(ranks, wild) {
  const present = new Set(ranks);
  if (present.has(14)) present.add(1);
  for (let high = 14; high >= 5; high--) {
    const target = Array.from({ length: 5 }, (_, k) => high - k);
    if (target.filter((r) => !present.has(r)).length <= wild) return high;
  }
  return 0;
}
function evaluateFive(cards, wildRank) {
  const natural = cards.filter((card) => card.rank !== wildRank);
  const wild = cards.length - natural.length;
  const counts = new Map();
  natural.forEach(({ rank }) => counts.set(rank, (counts.get(rank) || 0) + 1));
  const ranks = [...counts.keys()].sort((a, b) => b - a);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const isFlush = natural.every(({ suit }) => suit === natural[0]?.suit);
  const straight = bestStraight(ranks, wild);
  const encode = (category, kickers, name) => ({ score: category * 1e10 + kickers.reduce((sum, r, i) => sum + r * (15 ** (4 - i)), 0), name });
  if (isFlush && straight) return encode(8, [straight], "Straight flush");
  for (let rank = 14; rank >= 2; rank--) {
    if ((counts.get(rank) || 0) + wild >= 4) {
      const kicker = ranks.find((r) => r !== rank) || 14;
      return encode(7, [rank, kicker], "Four of a kind");
    }
  }
  for (let trip = 14; trip >= 2; trip--) {
    const needTrip = Math.max(0, 3 - (counts.get(trip) || 0));
    if (needTrip > wild) continue;
    for (let pair = 14; pair >= 2; pair--) {
      if (pair !== trip && (counts.get(pair) || 0) + wild - needTrip >= 2) return encode(6, [trip, pair], "Full house");
    }
  }
  if (isFlush) return encode(5, [...ranks, ...Array(wild).fill(14)].sort((a, b) => b - a).slice(0, 5), "Flush");
  if (straight) return encode(4, [straight], "Straight");
  for (let rank = 14; rank >= 2; rank--) {
    if ((counts.get(rank) || 0) + wild >= 3) return encode(3, [rank, ...ranks.filter((r) => r !== rank)].slice(0, 5), "Three of a kind");
  }
  for (let first = 14; first >= 2; first--) {
    const firstNeed = Math.max(0, 2 - (counts.get(first) || 0));
    if (firstNeed > wild) continue;
    for (let second = first - 1; second >= 2; second--) {
      const secondNeed = Math.max(0, 2 - (counts.get(second) || 0));
      if (firstNeed + secondNeed <= wild) return encode(2, [first, second, ranks.find((r) => r !== first && r !== second) || 14], "Two pair");
    }
  }
  for (let rank = 14; rank >= 2; rank--) {
    if ((counts.get(rank) || 0) + wild >= 2) return encode(1, [rank, ...ranks.filter((r) => r !== rank)].slice(0, 5), "Pair");
  }
  return encode(0, ranks.slice(0, 5), "High card");
}
function bestHand(cards, wildRank) {
  return combinations(cards).map((hand) => evaluateFive(hand, wildRank)).sort((a, b) => b.score - a.score)[0];
}
function PlayingCard({ card, wild }) {
  return <div className={`relative flex h-24 w-[66px] shrink-0 flex-col justify-between rounded-lg border-2 p-1.5 shadow-lg ${wild ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white"} ${card.suit === "♥" || card.suit === "♦" ? "text-red-600" : "text-slate-950"}`}>
    <div className="text-base font-black leading-4">{label(card.rank)}<span className="block text-sm">{card.suit}</span></div>
    <span className="text-center text-3xl">{card.suit}</span>
    {wild && <span className="absolute -top-2 right-0 rounded-full bg-amber-400 px-1.5 text-[8px] font-black text-black">WILD</span>}
  </div>;
}
const initialNames = ["Player 1", "Player 2", "Player 3"];
export default function CustomerGames() {
  const nav = useNavigate();
  const [names, setNames] = useState(initialNames);
  const [mode, setMode] = useState("friends");
  const [round, setRound] = useState(0);
  const [turn, setTurn] = useState(0);
  const [deck, setDeck] = useState([]);
  const [hands, setHands] = useState([]);
  const [phase, setPhase] = useState("setup");
  const [viewPlayer, setViewPlayer] = useState(null);
  const [countdown, setCountdown] = useState(3);
  const [scores, setScores] = useState([]);
  const [result, setResult] = useState(null);
  const [dropChoices, setDropChoices] = useState([]);
  const [decisionIndex, setDecisionIndex] = useState(0);
  const [soloStreak, setSoloStreak] = useState({ player: null, count: 0 });
  const wildRank = WILDS[round];

  const activeNames = mode === "solo" ? [names[0] || "You", "Computer"] : names;
  function deal(nextRound = round, previousScores = scores) {
    const fresh = shuffle(makeDeck());
    const nextHands = activeNames.map((_, i) => fresh.slice(i * 2, i * 2 + 2));
    setDeck(fresh.slice(activeNames.length * 2));
    setHands(nextHands);
    setRound(nextRound);
    setTurn(1);
    setScores(previousScores.length ? previousScores : activeNames.map(() => 0));
    setResult(null);
    setViewPlayer(null);
    setCountdown(3);
    setDropChoices([]);
    setDecisionIndex(0);
    setPhase("playing");
  }
  function draw() {
    if (turn >= 3) return;
    const next = deck.slice(0, activeNames.length * 2);
    setDeck(deck.slice(next.length));
    setHands(hands.map((hand, i) => [...hand, ...next.slice(i * 2, i * 2 + 2)]));
    setTurn(turn + 1);
    setViewPlayer(null);
  }
  function commitChoice(choice) {
    const next = [...dropChoices, choice];
    const nextIndex = next.length;
    setDropChoices(next);
    setDecisionIndex(nextIndex);
    if (nextIndex === activeNames.length) { setPhase("countdown"); setCountdown(3); }
  }
  function drop() {
    const entered = dropChoices.map((choice, i) => choice === "hold" ? i : null).filter((i) => i !== null);
    const results = hands.map((hand, i) => ({ i, ...bestHand(hand, wildRank) }));
    let winners = [];
    let message = "";
    if (!entered.length) {
      setSoloStreak({ player: null, count: 0 });
      message = "Everyone dropped — no winner; pot carries over.";
    } else if (entered.length === 1) {
      const only = entered[0];
      const newCount = soloStreak.player === only ? soloStreak.count + 1 : 1;
      winners = newCount >= 3 ? [only] : [];
      setSoloStreak(winners.length ? { player: null, count: 0 } : { player: only, count: newCount });
      message = winners.length ? "Three uncontested holds — pot may be claimed." : `Only ${activeNames[only]} held. ${newCount}/3 uncontested holds; pot carries over.`;
    } else {
      const max = Math.max(...entered.map((i) => results[i].score));
      winners = entered.filter((i) => results[i].score === max);
      setSoloStreak({ player: null, count: 0 });
      message = "Contested hold — highest eligible hand wins.";
    }
    setScores((old) => old.map((score, i) => score + (winners.includes(i) ? 1 : 0)));
    setResult({ results, winners, entered, message });
    setViewPlayer(null);
    setPhase("revealed");
  }
  function reset() {
    setPhase("setup"); setRound(0); setTurn(0); setScores([]); setHands([]); setResult(null); setSoloStreak({ player: null, count: 0 }); setDropChoices([]);
  }
  return <main className="min-h-dvh bg-[#020817] px-4 pb-12 pt-[max(1.5rem,env(safe-area-inset-top))] text-white">
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex items-center justify-between gap-3"><button type="button" onClick={() => nav("/customer")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm"><ArrowLeft size={18}/> Dashboard</button><div className="text-right"><span className="block text-[10px] font-bold tracking-[.3em] text-cyan-300">SYNCWORKS GAMES</span><h1 className="text-2xl font-black">3–5–7 DROP</h1></div></header>
      <button type="button" onClick={() => nav("/customer/games/clubs")} className="mb-4 min-h-11 w-full rounded-xl border border-violet-400/25 bg-violet-500/10 px-4 text-left text-sm font-bold text-violet-200">Card Clubs & running tally preview →</button>
      <div className="mb-5 rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-4"><div className="flex items-center gap-2 text-sm font-bold text-cyan-200"><Spade size={17}/> Pass & play beta</div><p className="mt-1 text-xs leading-5 text-slate-400">Three rounds: 3s, 5s, then 7s wild. Draw two cards per player each turn; after three deals, players secretly hold or drop together on three. Two or more holders compare the best five of six. A lone holder needs three uncontested holds to claim the pot. House rules and payouts still need confirmation.</p></div>
      {phase === "setup" ? <section className="rounded-2xl border border-white/10 bg-white/5 p-5"><h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Users size={20}/> Players</h2><div className="mb-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => setMode("friends")} className={`min-h-11 rounded-xl border text-sm font-bold ${mode === "friends" ? "border-cyan-400 bg-cyan-500/20" : "border-white/15"}`}>Friends</button><button type="button" onClick={() => setMode("solo")} className={`min-h-11 rounded-xl border text-sm font-bold ${mode === "solo" ? "border-cyan-400 bg-cyan-500/20" : "border-white/15"}`}>Vs. Computer</button></div><div className="space-y-3">{(mode === "solo" ? names.slice(0, 1) : names).map((name, i) => <label key={i} className="block text-xs text-slate-400">Player {i + 1}<input className="mt-1 block w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-white" value={name} maxLength={24} onChange={(e) => setNames((old) => old.map((x, j) => j === i ? e.target.value : x))}/></label>)}</div>{mode === "friends" && <div className="mt-4 flex gap-2"><button type="button" className="rounded-xl border border-white/20 px-3 py-2 text-sm" disabled={names.length <= 2} onClick={() => setNames(names.slice(0, -1))}>Remove</button><button type="button" className="rounded-xl border border-white/20 px-3 py-2 text-sm" disabled={names.length >= 6} onClick={() => setNames([...names, `Player ${names.length + 1}`])}>Add player</button></div>}<button type="button" className="mt-5 min-h-12 w-full rounded-xl bg-cyan-500 font-black text-slate-950" onClick={() => deal(0, [])}>Start 3–5–7</button></section> : <>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><div className="text-xs font-bold text-cyan-300">ROUND {round + 1} OF 3</div><div className="text-2xl font-black">{wildRank}s are WILD</div><div className="text-xs text-slate-400">Deal {turn}/3 · {turn * 2} cards per player</div></div><button type="button" className="flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs" onClick={reset}><RotateCcw size={15}/> New game</button></div>
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{activeNames.map((name, i) => <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3"><div className="truncate text-sm font-bold">{name || `Player ${i + 1}`}</div><div className="text-xs text-slate-400">{scores[i] || 0} round wins</div></div>)}</div>
        {phase === "playing" ? <section className="rounded-2xl border border-emerald-500/25 bg-emerald-950/20 p-4"><h2 className="mb-3 text-center text-xl font-black">Private hands</h2><p className="mb-4 text-center text-xs text-slate-400">Pass the device. Tap a name to peek at your cards, then hide them before passing it on.</p><div className="space-y-2">{activeNames.map((name, i) => <div key={i} className="rounded-xl border border-white/10 bg-black/20 p-3"><button type="button" className="flex min-h-10 w-full items-center justify-between text-sm font-bold" disabled={mode === "solo" && i === 1} onClick={() => setViewPlayer(viewPlayer === i ? null : i)}><span>{name}</span><span className="text-cyan-300">{mode === "solo" && i === 1 ? "Hidden until DROP" : viewPlayer === i ? "Hide hand" : "View hand"}</span></button>{viewPlayer === i && <div className="mt-3 flex flex-wrap gap-2">{hands[i].map((card, j) => <PlayingCard key={j} card={card} wild={card.rank === wildRank}/>)}</div>}</div>)}</div>{turn < 3 ? <button type="button" className="mt-5 min-h-12 w-full rounded-xl bg-cyan-500 font-black text-slate-950" onClick={draw}>Deal 2 more cards to each player</button> : <button type="button" className="mt-5 min-h-12 w-full rounded-xl bg-amber-400 font-black text-slate-950" onClick={() => {setViewPlayer(null);setDropChoices([]);setDecisionIndex(0);setPhase("deciding");}}>1, 2, 3, DROP — choose hold or fold</button>}</section> : null}
        {phase === "deciding" && <section className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-6 text-center">
          {mode === "solo" && decisionIndex === 1 ? <div><h2 className="text-xl font-black">Computer is choosing</h2><p className="mt-2 text-sm text-slate-400">The computer's decision is hidden until reveal.</p><button type="button" className="mt-5 min-h-12 w-full rounded-xl bg-cyan-500 font-black text-black" onClick={() => commitChoice(bestHand(hands[1], wildRank).score >= 2e10 || Math.random() > 0.45 ? "hold" : "drop")}>Commit computer's choice</button></div>
            : <><h2 className="text-xl font-black">{activeNames[decisionIndex]}: hold or drop?</h2><p className="mt-2 text-xs text-slate-400">Pass the phone privately. Your selection is hidden until everyone has chosen. Online play will commit selections server-side simultaneously.</p><div className="mt-5 grid grid-cols-2 gap-3"><button type="button" className="min-h-14 rounded-xl bg-emerald-500 font-black text-black" onClick={() => commitChoice("hold")}>HOLD — IN</button><button type="button" className="min-h-14 rounded-xl bg-rose-500 font-black text-white" onClick={() => commitChoice("drop")}>DROP — OUT</button></div></>}
        </section>}
        {phase === "countdown" && <section className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-8 text-center"><div className="text-6xl font-black text-amber-300">{countdown ? countdown : "DROP!"}</div><button type="button" className="mt-6 min-h-12 rounded-xl bg-amber-400 px-8 font-black text-black" onClick={() => countdown > 1 ? setCountdown(countdown - 1) : drop()}>{countdown > 1 ? "Next count" : "DROP & reveal"}</button></section>}
        {phase === "revealed" && <section className="space-y-3"><div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-5 text-center"><div className="text-xs font-bold uppercase tracking-widest text-amber-300">Round result</div><div className="mt-1 text-2xl font-black">{result.winners.length ? result.winners.map((i) => activeNames[i]).join(" & ") : "Pot carries over"}</div><p className="mt-2 text-xs text-amber-100">{result.message}</p></div>{result.results.map(({ i, name }) => <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="mb-2 flex justify-between gap-2 text-sm font-bold"><span>{activeNames[i]} · {dropChoices[i] === "hold" ? "HELD" : "DROPPED"}</span><span className="text-cyan-300">{dropChoices[i] === "hold" ? name : "Folded"}</span></div><div className="flex flex-wrap gap-2">{hands[i].map((card, j) => <PlayingCard key={j} card={card} wild={card.rank === wildRank}/>)}</div></div>)}{round < 2 ? <button type="button" className="min-h-12 w-full rounded-xl bg-cyan-500 font-black text-black" onClick={() => deal(round + 1)}>Next round: {WILDS[round + 1]}s wild</button> : <button type="button" className="min-h-12 w-full rounded-xl bg-amber-400 font-black text-black" onClick={() => setPhase("finished")}>Final results</button>}</section>}
        {phase === "finished" && <section className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-6 text-center"><h2 className="text-2xl font-black">Game complete!</h2><p className="mt-3 text-lg">Winner: {activeNames.filter((_, i) => scores[i] === Math.max(...scores)).join(" & ")}</p><button type="button" className="mt-5 min-h-12 rounded-xl bg-cyan-500 px-8 font-black text-black" onClick={reset}>Play again</button></section>}
      </>}
    </div>
  </main>;
}
