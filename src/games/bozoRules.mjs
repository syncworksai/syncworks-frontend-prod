// Bozo / Clown Guts: pure, client-side demonstration rules.
// Every occurrence of the face-up Clown rank acts as a wildcard for everyone.
// Five-of-a-kind is allowed with wildcards and ranks above straight flush.
export const SUITS = ["♠", "♥", "♦", "♣"];
export const LABEL = (rank) => ({ 11: "J", 12: "Q", 13: "K", 14: "A" }[rank] || String(rank));

export function makeShuffledDeck(random = Math.random) {
  const deck = SUITS.flatMap((suit) => Array.from({ length: 13 }, (_, i) => ({ rank: i + 2, suit })));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
function select(cards, count, offset = 0, prefix = [], all = []) {
  if (!count) { all.push(prefix); return all; }
  for (let i = offset; i <= cards.length - count; i++) select(cards, count - 1, i + 1, [...prefix, cards[i]], all);
  return all;
}
const ENCODER_BASE = 15 ** 5;
function score(category, kickers, name) {
  const values = [...kickers, ...Array(5).fill(0)].slice(0, 5);
  return { score: category * ENCODER_BASE + values.reduce((acc, rank) => acc * 15 + rank, 0), name, kickers };
}
function straightHigh(ranks) {
  const unique = new Set(ranks);
  if (unique.has(14)) unique.add(1);
  if (new Set(ranks).size !== 5) return 0;
  for (let top = 14; top >= 5; top--) {
    if ([0,1,2,3,4].every(n => unique.has(top-n))) return top;
  }
  return 0;
}
function classifyRanks(ranks) {
  const counts = new Map();
  for (const rank of ranks) counts.set(rank, (counts.get(rank) || 0) + 1);
  const groups = [...counts.entries()].sort((a,b) => b[1] - a[1] || b[0] - a[0]);
  const ordered = [...ranks].sort((a,b)=>b-a);
  if (groups[0][1] === 5) return score(9, [groups[0][0]], "Five of a kind");
  if (groups[0][1] === 4) return score(7, [groups[0][0], groups[1][0]], "Four of a kind");
  if (groups[0][1] === 3 && groups[1]?.[1] === 2) return score(6, [groups[0][0], groups[1][0]], "Full house");
  const st = straightHigh(ranks);
  if (st) return score(4, [st], "Straight");
  if (groups[0][1] === 3) return score(3, [groups[0][0], ...groups.slice(1).map(g=>g[0]).sort((a,b)=>b-a)], "Three of a kind");
  if (groups[0][1] === 2 && groups[1]?.[1] === 2) {
    const pairs = groups.slice(0,2).map(g=>g[0]).sort((a,b)=>b-a);
    return score(2, [...pairs, groups[2][0]], "Two pair");
  }
  if (groups[0][1] === 2) return score(1, [groups[0][0], ...groups.slice(1).map(g=>g[0]).sort((a,b)=>b-a)], "Pair");
  return score(0, ordered, "High card");
}
function bestFive(cards, wildRank) {
  const fixed = cards.filter(c => c.rank !== wildRank);
  const wildCount = cards.length - fixed.length;
  const candidateRanks = [];
  let best = score(-1, [], "Unranked");
  function visit(n) {
    if (n === wildCount) {
      const result = classifyRanks([...fixed.map(c=>c.rank),...candidateRanks]);
      if (result.score > best.score) best = result;
      return;
    }
    for (let rank = 2; rank <= 14; rank++) {
      candidateRanks[n] = rank;
      visit(n + 1);
    }
  }
  visit(0);
  // Wild cards may adopt any suit. Flushes (and straight flushes) are possible
  // only when the natural cards already share a suit.
  const allOneSuit = fixed.every(c=>c.suit===fixed[0]?.suit);
  if (allOneSuit) {
    const naturalRanks = new Set(fixed.map(c=>c.rank));
    if (naturalRanks.size === fixed.length) {
      for (let high = 14; high >= 5; high--) {
        const needed = new Set([0,1,2,3,4].map(i=>high-i));
        const isInRun = fixed.every(c=>needed.has(c.rank) || (high===5 && c.rank===14 && needed.has(1)));
        const used = new Set(fixed.map(c=>c.rank===14&&high===5?1:c.rank));
        if (isInRun && needed.size - used.size <= wildCount) {
          const sf = score(8,[high],"Straight flush");
          if (sf.score > best.score) best = sf;
          break;
        }
      }
    }
    const flushRanks = fixed.map(c=>c.rank);
    for (let r=14;flushRanks.length<5 && r>=2;r--) {
      if (!flushRanks.includes(r)) flushRanks.push(r);
    }
    flushRanks.sort((a,b)=>b-a);
    const fl=score(5,flushRanks,"Flush");
    if(fl.score>best.score)best=fl;
  }
  return best;
}
export function evaluateBozoHand(cards, wildRank) {
  if (![5,7].includes(cards.length)) throw new Error("Bozo supports five or seven cards.");
  if (wildRank < 2 || wildRank > 14) throw new Error("Invalid Clown wild rank.");
  return select(cards,5).reduce((best,subset)=>{
    const result=bestFive(subset,wildRank);
    return !best || result.score>best.score ? result:best;
  },null);
}
/**
 * On a Clown win the holders collectively replace ONE pot, not one
 * full pot apiece. Split the required contribution as evenly as possible,
 * never charging more than a player's remaining virtual stack or the cap.
 */
export function bozoClownContributions({holders,stacks,potCents,capCents=Number.MAX_SAFE_INTEGER}){
 if(!Array.isArray(holders)||!Array.isArray(stacks)||!Number.isSafeInteger(potCents)||potCents<0)throw Error("Invalid Bozo matching inputs");
 const limit=Math.max(0,Math.min(potCents,capCents-potCents));
 const payments=Object.fromEntries(holders.map(i=>[i,0]));
 let remaining=limit;
 let available=holders.filter(i=>Number.isInteger(i)&&i>=0&&i<stacks.length&&Number.isSafeInteger(stacks[i])&&stacks[i]>0);
 // Water-fill in large equal increments, then distribute final odd cents.
 while(remaining>0&&available.length){
  const chunk=Math.max(1,Math.floor(remaining/available.length));
  let paid=0;
  for(const i of available){
   const contribution=Math.min(chunk,Math.max(0,stacks[i]-payments[i]),remaining-paid);
   payments[i]+=contribution;paid+=contribution;
  }
  if(!paid)break;
  remaining-=paid;
  available=available.filter(i=>stacks[i]>payments[i]);
 }
 return {payments,totalCents:limit-remaining,nextPotCents:potCents+limit-remaining};
}

export function resolveBozoRound({choices,hands,clown,wildRank,potCents}) {
  const holders = choices.flatMap((choice,i)=>choice==="hold"?[i]:[]);
  if (!holders.length) return {kind:"all-drop", nextPotCents:potCents, dragCents:0, penalties:[], message:"Everyone dropped. Re-ante and deal again."};
  const clownHand=evaluateBozoHand(clown,wildRank);
  const playerHands=holders.map(i=>({i,hand:evaluateBozoHand(hands[i],wildRank)}));
  const highest=Math.max(clownHand.score,...playerHands.map(p=>p.hand.score));
  const topPlayers=playerHands.filter(p=>p.hand.score===highest);
  if (topPlayers.length>1 || (clownHand.score===highest && topPlayers.length)) {
    return {kind:"tie-review",clownHand,playerHands,nextPotCents:potCents,dragCents:0,penalties:[],message:"Tied winning hands require a dealer ruling. No automatic ledger movement."};
  }
  if (clownHand.score===highest) {
    const base=Math.floor(potCents/holders.length),remainder=potCents%holders.length;
    return {kind:"clown-win",clownHand,playerHands,nextPotCents:potCents*2,dragCents:0,penalties:holders.map((i,n)=>({player:i,cents:base+(n<remainder?1:0)})),message:"The Clown wins. Holding players collectively match the current pot once; the doubled pot carries forward."};
  }
  const winner=topPlayers[0].i;
  const losers=holders.filter(i=>i!==winner);
  return {kind:"player-win",winner,clownHand,playerHands,nextPotCents:losers.length*potCents,dragCents:potCents,penalties:losers.map(i=>({player:i,cents:potCents})),message:"A player beat the Clown and all other holders. They drag the pot; losing holders replace it for the next hand."};
}

/**
 * Practice-only Bozo bot: no peeking at the Clown's hidden cards or rival hands.
 * A stronger evaluated hand encourages a Hold; risk grows with pot/stack ratio.
 * Chance remains uncertain, especially with two or more possible opponents.
 */
export function chooseBozoBotAction({hand,wildRank,potCents=0,stackCents=2000,style="balanced",random=Math.random}){
 if(!Array.isArray(hand)||![5,7].includes(hand.length)||!Number.isFinite(wildRank))return "fold";
 if(stackCents<=0)return "fold";
 const result=evaluateBozoHand(hand,wildRank);
 const category=Math.floor(result.score/(15**5));
 const base=[0.04,0.22,0.42,0.69,0.8,0.84,0.93,0.96,0.98,0.99][Math.max(0,Math.min(9,category))];
 const styleOffset=style==="aggressive"?.17:style==="cautious"?-.15:0;
 const risk=Math.min(0.36,(Math.max(0,potCents)/Math.max(1,stackCents))*0.32);
 const odds=Math.min(.995,Math.max(.01,base+styleOffset-risk));
 return random()<odds?"hold":"fold";
}
