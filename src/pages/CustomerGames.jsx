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
function choose(cards, size) {
  if (size === 0) return [[]];
  if (cards.length < size) return [];
  return cards.flatMap((card, i) => choose(cards.slice(i + 1), size - 1).map((rest) => [card, ...rest]));
}
function evaluateThree(cards, wildRank) {
  // House rules: three of a kind > pair > high card. Suits and runs are ignored.
  const natural = cards.filter((card) => card.rank !== wildRank);
  const wilds = cards.length - natural.length;
  const counts = new Map();
  natural.forEach((card) => counts.set(card.rank, (counts.get(card.rank) || 0) + 1));
  let best = { score: -1, name: "High card" };
  for (let triple = 14; triple >= 2; triple--) {
    if ((counts.get(triple) || 0) + wilds === 3 && natural.every((card) => card.rank === triple)) {
      return { score: 2 * 10000 + triple, name: "Three of a kind" };
    }
  }
  for (let pair = 14; pair >= 2; pair--) {
    const needed = Math.max(0, 2 - (counts.get(pair) || 0));
    if (needed > wilds) continue;
    const remainingNaturals = natural.filter((card) => card.rank !== pair);
    if (remainingNaturals.length > 1) continue;
    const kick = remainingNaturals[0]?.rank || 14;
    const score = 10000 + pair * 15 + kick;
    if (score > best.score) best = { score, name: "Pair" };
  }
  if (best.score >= 0) return best;
  const sorted = natural.map((card) => card.rank).sort((a,b)=>b-a);
  return { score: sorted.reduce((value, rank) => value * 15 + rank, 0), name: "High card" };
}
function isInstant357(cards) {
  return cards.length === 3 && cards.map((card) => card.rank).sort((a,b)=>a-b).join(",") === "3,5,7";
}
function bestHand(cards, wildRank, round = 0) {
  if (round === 0) return choose(cards, 3).map((hand)=>evaluateThree(hand,wildRank)).sort((a,b)=>b.score-a.score)[0];
  return choose(cards, 5).map((hand) => evaluateFive(hand, wildRank)).sort((a, b) => b.score - a.score)[0];
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
  const [soloStreak, setSoloStreak] = useState({});
  const [potCents, setPotCents] = useState(100);
  const [stake, setStake] = useState("1.00");
  const [ante, setAnte] = useState("0.25");
  const [potCap, setPotCap] = useState("20.00");
  const [dealerMode, setDealerMode] = useState("dealer");
  const [netCents, setNetCents] = useState([]);
  const [potHistory, setPotHistory] = useState([]);
  const [instantWinner, setInstantWinner] = useState(null);
  const wildRank = WILDS[round];

  const activeNames = mode === "solo" ? [names[0] || "You", "Computer"] : names;
  const anteCents = Math.round(Number(ante || 0) * 100);
  const capCents = Math.round(Number(potCap || 0) * 100);
  const atCap = potCents >= capCents;
  function deal() {
    const fresh = shuffle(makeDeck());
    const nextHands = activeNames.map((_, i) => fresh.slice(i * 3, i * 3 + 3));
    setDeck(fresh.slice(activeNames.length * 3));
    setHands(nextHands);
    setRound(0);
    setTurn(1);
    setScores(activeNames.map(() => 0));
    setSoloStreak({});
    const opening = Math.max(1, Math.round(Number(stake || 1) * 100));
    setPotCents(opening);
    setNetCents(activeNames.map(()=>0));
    const instantPlayers = nextHands.map((hand, i) => isInstant357(hand) ? i : -1).filter((i) => i >= 0);
    if (instantPlayers.length === 1) {
      const winner = instantPlayers[0];
      setInstantWinner(winner);
      setPotCents(0);
      setNetCents(activeNames.map((_,i)=>i===winner?opening:0));
      setPotHistory([{kind:"opening virtual pot (funding unassigned)",amount:opening},{kind:"3-5-7 instant win",winner:activeNames[winner],drag:opening,newPot:0}]);
    } else {
      setInstantWinner(null);
      setPotHistory([{kind:"opening virtual pot (funding unassigned)",amount:opening}]);
    }
    setResult(null);
    setViewPlayer(null);
    setCountdown(3);
    setDropChoices([]);
    setDecisionIndex(0);
    // Multiple qualifying hands are held for dealer adjudication rather than awarding twice.
    setPhase(instantPlayers.length === 1 ? "instant" : instantPlayers.length > 1 ? "instant-tie" : "playing");
  }
  function advanceRound() {
    if (round >= 2 || atCap) return;
    const next = deck.slice(0, activeNames.length * 2);
    if (next.length !== activeNames.length * 2) return;
    setDeck(deck.slice(next.length));
    setHands(hands.map((hand, i) => [...hand, ...next.slice(i * 2, i * 2 + 2)]));
    setRound(round + 1);
    setTurn(round + 2);
    setDropChoices([]);
    setDecisionIndex(0);
    setViewPlayer(null);
    setResult(null);
    setPhase("playing");
  }
  function finishGame() {
    setPhase("finished");
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
    const results = hands.map((hand, i) => ({ i, ...bestHand(hand, wildRank, round) }));
    let winners = [];
    let message = "";
    let awarded = 0;
    let replacements = 0;
    if (!entered.length) {
      setSoloStreak({});
      const added = anteCents * activeNames.length;
      setPotCents(potCents + added);
      setNetCents((old)=>old.map((v)=>v-anteCents));
      setPotHistory((old)=>[...old,{kind:"all dropped ante",each:anteCents,players:activeNames.length,added,newPot:potCents+added}]);
      message = `Everyone dropped — each player contributes the ${(anteCents/100).toFixed(2)} ante. Pot grows by ${(added/100).toFixed(2)}.`;
    } else if (entered.length === 1) {
      const only = entered[0];
      const newCount = (soloStreak[only] || 0) + 1;
      winners = newCount >= 3 ? [only] : [];
      setSoloStreak((old) => ({ ...old, [only]: newCount }));
      message = winners.length ? "Three cumulative uncontested holds — pot claimed." : `Only ${activeNames[only]} held. ${newCount}/3 cumulative uncontested holds; pot carries over.`;
    } else {
      const max = Math.max(...entered.map((i) => results[i].score));
      winners = entered.filter((i) => results[i].score === max);
      setSoloStreak({});
      message = "Contested hold — highest eligible hand wins. Every losing holder replaces the drag.";
    }
    if (winners.length === 1) {
      awarded = potCents;
      replacements = entered.length > 1 ? entered.length - 1 : 0;
      const winner = winners[0];
      setPotCents(replacements * awarded);
      setNetCents((old)=>old.map((balance,i)=>balance + (i===winner?awarded:entered.includes(i)?-awarded:0)));
      setPotHistory((old)=>[...old,{kind:"drag-and-replace",winner:activeNames[winner],drag:awarded,losers:entered.filter(i=>i!==winner).map(i=>activeNames[i]),newPot:replacements*awarded}]);
    } else if (winners.length > 1) {
      message = "Tied best hand — payout held pending house tie rule; pot carries over.";
    }
    setScores((old) => old.map((score, i) => score + (winners.includes(i) ? 1 : 0)));
    setResult({ results, winners, entered, message, awarded, replacements });
    setViewPlayer(null);
    setPhase("revealed");
  }
  function reset() {
    setPhase("setup"); setRound(0); setTurn(0); setScores([]); setHands([]); setResult(null); setSoloStreak({}); setDropChoices([]); setPotCents(100); setNetCents([]); setPotHistory([]); setInstantWinner(null);
  }
  return <main className="min-h-dvh bg-[#020817] px-4 pb-12 pt-[max(1.5rem,env(safe-area-inset-top))] text-white">
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex items-center justify-between gap-3"><button type="button" onClick={() => nav("/customer/games")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm"><ArrowLeft size={18}/> Dashboard</button><div className="text-right"><span className="block text-[10px] font-bold tracking-[.3em] text-cyan-300">SYNCWORKS GAMES</span><h1 className="text-2xl font-black">3–5–7 DROP</h1></div></header>
      <button type="button" onClick={() => nav("/customer/games/clubs")} className="mb-4 min-h-11 w-full rounded-xl border border-violet-400/25 bg-violet-500/10 px-4 text-left text-sm font-bold text-violet-200">Card Clubs & running tally preview →</button>
      <div className="mb-5 rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-4"><div className="flex items-center gap-2 text-sm font-bold text-cyan-200"><Spade size={17}/> Pass & play beta</div><p className="mt-1 text-xs leading-5 text-slate-400">One growing hand: three cards with 3s wild, add two cards for 5s wild, then add two for 7s wild. Old wild ranks revert to normal. Three-card hands have no straights or flushes. Dealt 3-5-7 instantly ends the game and drags the pot. Everyone otherwise chooses HOLD/DROP each round; a lone holder needs three cumulative uncontested holds. If everyone drops, every player adds the configured ante to the virtual pot. The winner drags the pot and each losing holder replaces the amount. Pot cap pauses play for dealer review.</p></div>
      {phase === "setup" ? <section className="rounded-2xl border border-white/10 bg-white/5 p-5"><h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Users size={20}/> Players</h2><div className="mb-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => setMode("friends")} className={`min-h-11 rounded-xl border text-sm font-bold ${mode === "friends" ? "border-cyan-400 bg-cyan-500/20" : "border-white/15"}`}>Friends</button><button type="button" onClick={() => setMode("solo")} className={`min-h-11 rounded-xl border text-sm font-bold ${mode === "solo" ? "border-cyan-400 bg-cyan-500/20" : "border-white/15"}`}>Vs. Computer</button></div><div className="space-y-3">{(mode === "solo" ? names.slice(0, 1) : names).map((name, i) => <label key={i} className="block text-xs text-slate-400">Player {i + 1}<input className="mt-1 block w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-white" value={name} maxLength={24} onChange={(e) => setNames((old) => old.map((x, j) => j === i ? e.target.value : x))}/></label>)}</div>{mode === "friends" && <div className="mt-4 flex gap-2"><button type="button" className="rounded-xl border border-white/20 px-3 py-2 text-sm" disabled={names.length <= 2} onClick={() => setNames(names.slice(0, -1))}>Remove</button><button type="button" className="rounded-xl border border-white/20 px-3 py-2 text-sm" disabled={names.length >= 6} onClick={() => setNames([...names, `Player ${names.length + 1}`])}>Add player</button></div>}<label className="mt-4 block text-xs text-slate-400">Opening virtual pot ($)<input type="number" min="0.01" max="1000" step="0.01" value={stake} onChange={(e)=>setStake(e.target.value)} className="mt-1 block w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-white" /></label><div className="mt-4 text-xs font-bold text-slate-300">Dealer's ante per player when everyone drops</div><div className="mt-2 grid grid-cols-3 gap-2">{["0.25","0.50","1.00"].map((value)=><button type="button" key={value} onClick={()=>setAnte(value)} className={`min-h-11 rounded-xl border font-bold ${ante===value?"border-cyan-400 bg-cyan-500/20":"border-white/15"}`}>${value}</button>)}</div><label className="mt-3 block text-xs text-slate-400">Custom ante ($)<input type="number" min="0.01" max="1000" step="0.01" value={ante} onChange={(e)=>setAnte(e.target.value)} className="mt-1 block w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-white"/></label><label className="mt-3 block text-xs text-slate-400">Pot cap ($) — pause for dealer review<input type="number" min="0.01" max="1000000" step="0.01" value={potCap} onChange={(e)=>setPotCap(e.target.value)} className="mt-1 block w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-white"/></label><label className="mt-3 block text-xs text-slate-400">Dealer selection<select value={dealerMode} onChange={(e)=>setDealerMode(e.target.value)} className="mt-1 block w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-white"><option value="dealer">Dealer choice</option><option value="random">Random dealer (future room support)</option></select></label><button type="button" disabled={!Number.isFinite(Number(stake)) || Number(stake)<0.01 || !Number.isFinite(Number(ante)) || Number(ante)<0.01 || !Number.isFinite(Number(potCap)) || Number(potCap)<Number(stake)} className="mt-5 min-h-12 w-full rounded-xl bg-cyan-500 font-black text-slate-950 disabled:opacity-40" onClick={deal}>Start 3–5–7</button></section> : <>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><div className="text-xs font-bold text-cyan-300">ROUND {round + 1} OF 3</div><div className="text-2xl font-black">{wildRank}s are WILD</div><div className="text-xs text-slate-400">{hands[0]?.length || 0} cards per player · ante ${(anteCents/100).toFixed(2)}</div></div><button type="button" className="flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs" onClick={reset}><RotateCcw size={15}/> New game</button></div>
        <div className="mb-4 rounded-xl border border-amber-400/20 bg-amber-500/10 p-3"><div className="text-xs text-amber-200">Current virtual pot (device only)</div><div className="text-2xl font-black">${(potCents/100).toFixed(2)}</div><div className="text-[10px] text-slate-400">Cap ${(capCents/100).toFixed(2)} · No actual funds or transfers. Drag-and-replace updates the running pot.</div></div>
        {atCap && <div role="status" className="mb-4 rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-200">Pot cap reached or exceeded. Dealer review required before another round; the tally is not silently reduced. Start a new game after settling the virtual pot.</div>}
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{activeNames.map((name, i) => <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3"><div className="truncate text-sm font-bold">{name || `Player ${i + 1}`}</div><div className="text-xs text-slate-400">{scores[i] || 0} round wins · {soloStreak[i] || 0}/3 lone holds · {netCents[i] >= 0 ? "+" : "−"}${(Math.abs(netCents[i] || 0)/100).toFixed(2)}</div></div>)}</div>
        {phase === "instant" && <section className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-6 text-center"><div className="text-xs font-black uppercase tracking-widest text-amber-200">Instant win · 3–5–7</div><h2 className="mt-2 text-3xl font-black">{activeNames[instantWinner]} drags the pot!</h2><p className="mt-3 text-sm text-slate-200">Dealt 3, 5, and 7 in the opening hand. No HOLD/DROP or further dealing. Virtual pot awarded: ${(Math.round(Number(stake) * 100)/100).toFixed(2)}.</p><div className="mt-4 flex flex-wrap justify-center gap-2">{hands[instantWinner]?.map((card,i)=><PlayingCard key={i} card={card} wild={card.rank === 3}/>)}</div><button type="button" className="mt-6 min-h-12 rounded-xl bg-cyan-500 px-6 font-black text-black" onClick={reset}>New game</button></section>}
        {phase === "instant-tie" && <section className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-6 text-center"><h2 className="text-2xl font-black">Multiple 3–5–7 hands</h2><p className="mt-2 text-sm">Dealer review required. Pot unchanged until your tie rule is confirmed.</p><button type="button" className="mt-5 rounded-xl border border-white/20 px-5 py-3" onClick={reset}>New game</button></section>}
        {phase === "playing" ? <section className="rounded-2xl border border-emerald-500/25 bg-emerald-950/20 p-4"><h2 className="mb-3 text-center text-xl font-black">Private hands</h2><p className="mb-4 text-center text-xs text-slate-400">Pass the device. Tap a name to peek at your cards, then hide them before passing it on.</p><div className="space-y-2">{activeNames.map((name, i) => <div key={i} className="rounded-xl border border-white/10 bg-black/20 p-3"><button type="button" className="flex min-h-10 w-full items-center justify-between text-sm font-bold" disabled={mode === "solo" && i === 1} onClick={() => setViewPlayer(viewPlayer === i ? null : i)}><span>{name}</span><span className="text-cyan-300">{mode === "solo" && i === 1 ? "Hidden until DROP" : viewPlayer === i ? "Hide hand" : "View hand"}</span></button>{viewPlayer === i && <div className="mt-3 flex flex-wrap gap-2">{hands[i].map((card, j) => <PlayingCard key={j} card={card} wild={card.rank === wildRank}/>)}</div>}</div>)}</div>{<button type="button" className="mt-5 min-h-12 w-full rounded-xl bg-amber-400 font-black text-slate-950" onClick={() => {setViewPlayer(null);setDropChoices([]);setDecisionIndex(0);setPhase("deciding");}}>Round {round + 1}: 1, 2, 3, DROP — choose hold or fold</button>}</section> : null}
        {phase === "deciding" && <section className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-6 text-center">
          {mode === "solo" && decisionIndex === 1 ? <div><h2 className="text-xl font-black">Computer is choosing</h2><p className="mt-2 text-sm text-slate-400">The computer's decision is hidden until reveal.</p><button type="button" className="mt-5 min-h-12 w-full rounded-xl bg-cyan-500 font-black text-black" onClick={() => commitChoice(bestHand(hands[1], wildRank, round).score >= (round===0 ? 100000 : 2e10) || Math.random() > 0.45 ? "hold" : "drop")}>Commit computer's choice</button></div>
            : <><h2 className="text-xl font-black">{activeNames[decisionIndex]}: hold or drop?</h2><p className="mt-2 text-xs text-slate-400">Pass the phone privately. Your selection is hidden until everyone has chosen. Online play will commit selections server-side simultaneously.</p><div className="mt-5 grid grid-cols-2 gap-3"><button type="button" className="min-h-14 rounded-xl bg-emerald-500 font-black text-black" onClick={() => commitChoice("hold")}>HOLD — IN</button><button type="button" className="min-h-14 rounded-xl bg-rose-500 font-black text-white" onClick={() => commitChoice("drop")}>DROP — OUT</button></div></>}
        </section>}
        {phase === "countdown" && <section className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-8 text-center"><div className="text-6xl font-black text-amber-300">{countdown ? countdown : "DROP!"}</div><button type="button" className="mt-6 min-h-12 rounded-xl bg-amber-400 px-8 font-black text-black" onClick={() => countdown > 1 ? setCountdown(countdown - 1) : drop()}>{countdown > 1 ? "Next count" : "DROP & reveal"}</button></section>}
        {phase === "revealed" && <section className="space-y-3"><div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-5 text-center"><div className="text-xs font-bold uppercase tracking-widest text-amber-300">Round result</div><div className="mt-1 text-2xl font-black">{result.winners.length ? result.winners.map((i) => activeNames[i]).join(" & ") : "Pot carries over"}</div><p className="mt-2 text-xs text-amber-100">{result.message}</p>{result.awarded>0 && <p className="mt-2 text-xs text-amber-100">Dragged ${(result.awarded/100).toFixed(2)} · {result.replacements} losing holders replaced it · next pot ${((result.awarded*result.replacements)/100).toFixed(2)}</p>}</div>{result.results.map(({ i, name }) => <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="mb-2 flex justify-between gap-2 text-sm font-bold"><span>{activeNames[i]} · {dropChoices[i] === "hold" ? "HELD" : "DROPPED"}</span><span className="text-cyan-300">{dropChoices[i] === "hold" ? name : "Folded"}</span></div><div className="flex flex-wrap gap-2">{hands[i].map((card, j) => <PlayingCard key={j} card={card} wild={card.rank === wildRank}/>)}</div></div>)}{round < 2 ? <button type="button" className="min-h-12 w-full rounded-xl bg-cyan-500 font-black text-black" disabled={atCap} onClick={advanceRound}>{atCap ? "Pot cap reached — dealer review" : `Deal 2 more cards: ${WILDS[round + 1]}s wild`}</button> : <button type="button" className="min-h-12 w-full rounded-xl bg-amber-400 font-black text-black" onClick={finishGame}>Final results</button>}</section>}
        {phase === "finished" && <section className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-6 text-center"><h2 className="text-2xl font-black">Game complete!</h2><p className="mt-3 text-lg">Winner: {activeNames.filter((_, i) => scores[i] === Math.max(...scores)).join(" & ")}</p><button type="button" className="mt-5 min-h-12 rounded-xl bg-cyan-500 px-8 font-black text-black" onClick={reset}>Play again</button></section>}
      </>}
    </div>
  </main>;
}
