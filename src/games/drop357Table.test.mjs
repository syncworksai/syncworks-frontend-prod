import test from "node:test";
import assert from "node:assert/strict";
import {createShuffledDeck,dealt357,addRoundCards,instant357,rate357,resolve357} from "./drop357Table.mjs";

const c=(rank,suit="♠")=>({rank,suit});

test("3-5-7 uses one 52-card deck, then adds two retained cards per stage",()=>{
 const shuffled=createShuffledDeck(()=>0.25);
 assert.equal(shuffled.length,52);
 assert.equal(new Set(shuffled.map(card=>card.rank+card.suit)).size,52);
 const opening=dealt357(shuffled,6);
 assert.equal(opening.hands.length,6);
 assert.ok(opening.hands.every(hand=>hand.length===3));
 const next=addRoundCards(opening.hands,opening.deck);
 assert.ok(next.hands.every(hand=>hand.length===5));
 assert.deepEqual(next.hands[0].slice(0,3),opening.hands[0]);
 const last=addRoundCards(next.hands,next.deck);
 assert.ok(last.hands.every(hand=>hand.length===7));
 assert.deepEqual(last.hands[2].slice(0,5),next.hands[2]);
});
test("only opening ranks 3,5,7 trigger the jackpot",()=>{
 assert.equal(instant357([c(7),c(3),c(5)]),true);
 assert.equal(instant357([c(3),c(5),c(8)]),false);
});
test("three-card straight and flush do not outrank a natural pair",()=>{
 const straight=rate357([c(4),c(5),c(6)],0);
 const flush=rate357([c(9),c(11),c(13)],0);
 const pair=rate357([c(8),c(8,"♥"),c(2,"♦")],0);
 assert.equal(straight.name,"High card");
 assert.equal(flush.name,"High card");
 assert.equal(pair.name,"Pair");
 assert.ok(pair.score>straight.score);
});
test("threes are wild only in first round",()=>{
 const hand=[c(3),c(8,"♥"),c(8,"♦")];
 assert.equal(rate357(hand,0).name,"Three of a kind");
 const five=[...hand,c(6,"♣"),c(9,"♦")];
 assert.notEqual(rate357(five,1).name,"Three of a kind");
});
test("two holders: winner drags pot and loser replaces same amount",()=>{
 const hands=[[c(3),c(13),c(13,"♥")],[c(2),c(8),c(9)]];
 const result=resolve357({hands,round:0,choices:["hold","hold"],potCents:100,strikes:{},anteCents:25});
 assert.equal(result.kind,"drag");
 assert.equal(result.winner,0);
 assert.deepEqual(result.delta,[100,-100]);
 assert.equal(result.nextPot,100);
});
test("three holders: winner drags pot, two losers match full original pot",()=>{
 const hands=[[c(3),c(13),c(13,"♥")],[c(2),c(8),c(9)],[c(10),c(6),c(4)]];
 const result=resolve357({hands,round:0,choices:["hold","hold","hold"],potCents:100,strikes:{},anteCents:25});
 assert.equal(result.nextPot,200);
 assert.deepEqual(result.delta,[100,-100,-100]);
});
test("uncontested strikes accumulate across other rounds; do not require consecutive holds",()=>{
 const hands=[[c(13),c(13,"♥"),c(8)],[c(2),c(8),c(9)]];
 const original={0:1,1:0};
 const first=resolve357({hands,round:0,choices:["drop","hold"],potCents:200,strikes:original,anteCents:25});
 assert.equal(first.strikes[1],1);
 const second=resolve357({hands,round:0,choices:["hold","drop"],potCents:200,strikes:first.strikes,anteCents:25});
 assert.equal(second.strikes[0],2);
 const third=resolve357({hands,round:0,choices:["hold","drop"],potCents:200,strikes:second.strikes,anteCents:25});
 assert.equal(third.kind,"drag");
 assert.equal(third.winner,0);
 assert.equal(third.nextPot,0);
});
test("everyone drops: each player antes, no cards are awarded",()=>{
 const hands=[[c(13),c(13,"♥"),c(8)],[c(2),c(8),c(9)]];
 const result=resolve357({hands,round:0,choices:["drop","drop"],potCents:100,strikes:{0:2},anteCents:25});
 assert.equal(result.nextPot,150);
 assert.deepEqual(result.delta,[-25,-25]);
 assert.equal(result.strikes[0],2);
});

test("folded players receive no fifth or seventh cards and no extra deck cards are used",()=>{
 const deck=createShuffledDeck(()=>0.317);
 const initial=dealt357(deck,6,[0,1,2,3]);
 assert.equal(initial.hands[4].length,0);
 assert.equal(initial.hands[5].length,0);
 assert.equal(initial.deck.length,40);
 const five=addRoundCards(initial.hands,initial.deck,[0,2]);
 assert.equal(five.hands[0].length,5);assert.equal(five.hands[2].length,5);
 assert.equal(five.hands[1].length,3);assert.equal(five.hands[3].length,3);
 assert.equal(five.deck.length,36);
 const seven=addRoundCards(five.hands,five.deck,[2]);
 assert.equal(seven.hands[2].length,7);assert.equal(seven.hands[0].length,5);
 assert.equal(seven.deck.length,34);
 const all=initial.hands.flat().concat(initial.deck);
 assert.equal(new Set(all.map(c=>c.rank+":"+c.suit)).size,52);
});
