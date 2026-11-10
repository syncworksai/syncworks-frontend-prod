import test from "node:test";
import assert from "node:assert/strict";
import {createShuffledDeck,dealt357,addRoundCards,advance357Street,instant357,rate357,resolve357,winningHandText357} from "./drop357Table.mjs";

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

test("three uncontested holds accumulate as three dots before dragging the pot",()=>{
 const hands=[[c(10),c(10,"♥"),c(12)],[c(2),c(8),c(11)]];
 const args={hands,round:0,choices:["hold","drop"],potCents:300,anteCents:25};
 const one=resolve357({...args,strikes:{}});
 assert.equal(one.kind,"lone-strike");assert.equal(one.strikes[0],1);assert.equal(one.nextPot,300);
 const two=resolve357({...args,strikes:one.strikes});
 assert.equal(two.kind,"lone-strike");assert.equal(two.strikes[0],2);
 const three=resolve357({...args,strikes:two.strikes});
 assert.equal(three.kind,"drag");assert.equal(three.winner,0);assert.equal(three.strikes[0],3);
});
test("winner hand text spells out matching rank for four Aces with wild fives",()=>{
 const hand=[c(14),c(14,"♥"),c(14,"♦"),c(5,"♣"),c(9,"♠")];
 assert.equal(winningHandText357(hand,1),"four Aces");
});

test("a fold in 3 cards does not exclude that player from the five or seven card street",()=>{
 const opening=dealt357(createShuffledDeck(()=>0.32),5);
 const threeDecisions=["hold","hold","drop","drop","drop"];
 const first=resolve357({hands:opening.hands,round:0,choices:threeDecisions,potCents:250,strikes:{},anteCents:25});
 assert.deepEqual(first.entered,[0,1]); // only two contest the three-card pot
 const five=advance357Street({hands:opening.hands,deck:opening.deck});
 assert.deepEqual(five.eligible,[0,1,2,3,4]);
 assert.deepEqual(five.hands.map(h=>h.length),[5,5,5,5,5]);
 for(let i=0;i<5;i++)assert.deepEqual(five.hands[i].slice(0,3),opening.hands[i]);
 const second=resolve357({hands:five.hands,round:1,choices:["hold","drop","hold","drop","drop"],potCents:250,strikes:first.strikes,anteCents:25});
 assert.deepEqual(second.entered,[0,2]); // player 2 dropped on the first street but reentered
 const seven=advance357Street({hands:five.hands,deck:five.deck});
 assert.deepEqual(seven.eligible,[0,1,2,3,4]);
 assert.deepEqual(seven.hands.map(h=>h.length),[7,7,7,7,7]);
 assert.equal(seven.deck.length,52-5*7);
 for(let i=0;i<5;i++)assert.deepEqual(seven.hands[i].slice(0,5),five.hands[i]);
});
test("a genuinely sitting-out seat does not get cards in the next street",()=>{
 const first=dealt357(createShuffledDeck(()=>0.31),3);
 const five=advance357Street({hands:first.hands,deck:first.deck,sittingOut:{1:true}});
 assert.deepEqual(five.hands.map(h=>h.length),[5,3,5]);
});
test("winner banner hand text identifies the ranks in a natural full house",()=>{
 assert.equal(winningHandText357([c(10),c(10,"♥"),c(10,"♦"),c(2),c(2,"♥")],1),"full house — Tens over Twos");
});
