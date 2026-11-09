import test from "node:test";
import assert from "node:assert/strict";
import {fybOrder,fybRound,fybNextDealer,fybSwap,fybStakeFromTotal,fybRevealKing,fybCurrentKings,fybDealFromShoe,fybDealerDraw,fybPayRound,fybSplitPurse} from "./fybElimination.mjs";
const hand=n=>[{rank:n,suit:"♠"}];
test("three losses eliminate a seat, but do not finish when 2+ survivors",()=>{
 const r=fybRound({hands:[hand(4),hand(9),hand(12)],active:[0,1,2],losses:[2,1,0],chipCents:50});
 assert.deepEqual(r.nextLosses,[3,1,0]);assert.deepEqual(r.eliminated,[0]);assert.deepEqual(r.survivors,[1,2]);assert.equal(r.gameOver,false);
});
test("ties each cost one strike, no more than three",()=>{
 const r=fybRound({hands:[hand(2),hand(2),hand(13)],active:[0,1,2],losses:[2,1,0],chipCents:50});
 assert.deepEqual(r.losers,[0,1]);assert.deepEqual(r.nextLosses,[3,2,0]);assert.deepEqual(r.eliminated,[0]);assert.deepEqual(r.roundLosses,[{seat:0,cents:50},{seat:1,cents:50}]);
});
test("last survivor wins and leaves no growing purse",()=>{
 const r=fybRound({hands:[hand(3),hand(9)],active:[0,1],losses:[2,0],chipCents:50});
 assert.equal(r.winner,1);assert.equal(r.gameOver,true);assert.deepEqual(r.survivors,[1]);
});
test("dealer rotation skips eliminated seats",()=>{
 assert.deepEqual(fybOrder([0,2,4],2),[4,0,2]);assert.equal(fybNextDealer([0,2,4],2),4);
 assert.equal(fybNextDealer([0,2,4],4),0);
});
test("pass-left exchanges cards, Kings block, dealer draws from deck",()=>{
 const hands=[hand(4),hand(8),hand(13)];
 const swap=fybSwap({hands,deck:[{rank:11,suit:"♥"}],actor:0,next:1,pass:true,playerName:"Jake",nextName:"Russ"});
 assert.equal(swap.hands[0][0].rank,8);assert.equal(swap.hands[1][0].rank,4);assert.equal(swap.kind,"swap");
 const block=fybSwap({hands,deck:[],actor:1,next:2,pass:true,playerName:"Russ",nextName:"King"});
 assert.equal(block.kind,"blocked");assert.equal(block.hands[1][0].rank,8);
 const drawn=fybSwap({hands,deck:[{rank:6,suit:"♦"}],actor:2,next:null,pass:true,playerName:"Dealer"});
 assert.equal(drawn.kind,"draw");assert.equal(drawn.hands[2][0].rank,6);assert.equal(drawn.deck.length,0);
});

test("dealer total stake is exactly three loss chips per player",()=>{
 assert.deepEqual(fybStakeFromTotal(300),{totalCents:300,chipCents:100,strikes:3});
 assert.deepEqual(fybStakeFromTotal(150),{totalCents:150,chipCents:50,strikes:3});
 assert.equal(fybStakeFromTotal(100),null);
 assert.equal(fybStakeFromTotal(-300),null);
 const chips=fybStakeFromTotal(300).chipCents;
 const round=fybRound({hands:[hand(3),hand(8)],active:[0,1],losses:[2,0],chipCents:chips});
 assert.equal(round.roundLosses[0].cents,100);
 assert.deepEqual(round.eliminated,[0]);
 assert.equal(round.winner,1);
});
test("blocked King stays revealed as source to the caller, not swapped",()=>{
 const hands=[hand(6),hand(13)];
 const move=fybSwap({hands,deck:[],actor:0,next:1,pass:true,playerName:"One",nextName:"Two"});
 assert.equal(move.kind,"blocked");
 assert.equal(hands[0][0].rank,6);
 assert.equal(move.hands[1][0].rank,13);
 assert.match(move.event,/King blocked/);
});

test("dealer is last and may keep or draw after right-hand player acts",()=>{
 const active=[0,1,2,3];
 const order=fybOrder(active,2);
 assert.deepEqual(order,[3,0,1,2]);
 const hands=[hand(4),hand(9),hand(6),hand(8)];
 const passToDealer=fybSwap({hands,deck:[{rank:11,suit:"♥"}],actor:1,next:2,pass:true,playerName:"Right",nextName:"Dealer"});
 assert.equal(passToDealer.kind,"swap");
 assert.equal(passToDealer.hands[2][0].rank,9);
 assert.equal(passToDealer.hands[1][0].rank,6);
 const keep=fybSwap({hands:passToDealer.hands,deck:passToDealer.deck,actor:2,next:null,pass:false,playerName:"Dealer"});
 assert.equal(keep.kind,"keep");assert.equal(keep.hands[2][0].rank,9);
 const draw=fybSwap({hands:passToDealer.hands,deck:passToDealer.deck,actor:2,next:null,pass:true,playerName:"Dealer"});
 assert.equal(draw.kind,"draw");assert.equal(draw.hands[2][0].rank,11);
});

test("blocked King becomes publicly revealed at receiving seat and continues to block",()=>{
 const hands=[hand(7),hand(13),hand(5)];
 const move=fybSwap({hands,deck:[],actor:0,next:1,pass:true,playerName:"Right",nextName:"King owner"});
 const seen=fybRevealKing({},move.hands,1);
 assert.equal(move.kind,"blocked");
 assert.deepEqual(fybCurrentKings(seen,move.hands),[{seat:1,card:move.hands[1][0]}]);
 const again=fybSwap({hands:move.hands,deck:[],actor:0,next:1,pass:true,playerName:"Right",nextName:"King owner"});
 assert.equal(again.kind,"blocked");
 assert.deepEqual(fybCurrentKings(seen,again.hands),[{seat:1,card:again.hands[1][0]}]);
});
test("dealer King flips on arrival even without a pass, other cards stay hidden",()=>{
 const hands=[hand(5),hand(8),hand(13)];
 const before={};
 assert.strictEqual(fybRevealKing(before,hands,0),before);
 const dealerTurn=fybRevealKing(before,hands,2);
 assert.deepEqual(fybCurrentKings(dealerTurn,hands),[{seat:2,card:hands[2][0]}]);
});
test("reveal follows actual King card and clears from seat if it moves",()=>{
 const start=[hand(13),hand(8)];
 const shown=fybRevealKing({},start,0);
 const swap=fybSwap({hands:start,deck:[],actor:0,next:1,pass:true,playerName:"A",nextName:"B"});
 assert.equal(swap.kind,"swap");
 assert.deepEqual(fybCurrentKings(shown,swap.hands),[]);
 const arrived=fybRevealKing(shown,swap.hands,1);
 assert.deepEqual(fybCurrentKings(arrived,swap.hands),[{seat:1,card:swap.hands[1][0]}]);
});

test("FYB keeps a single 52-card deck across consecutive hands",()=>{
 const makeDeck=()=>Array.from({length:52},(_,i)=>({rank:i===0?14:2+(i%12),suit:"♠",id:i}));
 let draws=0;
 const fresh=()=>{draws++;return makeDeck();};
 const one=fybDealFromShoe({deck:[],active:[1,2,0],playerCount:3,newDeck:fresh});
 assert.equal(draws,1);assert.equal(one.newDeckCount,1);
 assert.equal(one.deck.length,49);
 assert.deepEqual(one.hands.map(h=>h[0].id),[2,0,1]);
 const second=fybDealFromShoe({deck:one.deck,active:[0,1,2],playerCount:3,newDeck:fresh});
 assert.equal(second.newDeckCount,0);assert.equal(draws,1);
 assert.deepEqual(second.hands.map(h=>h[0].id),[3,4,5]);
 assert.equal(second.deck.length,46);
});
test("new deck starts only when prior deck exhausts, even mid-hand",()=>{
 let opens=0;const fresh=()=>{opens++;return Array.from({length:52},(_,i)=>({rank:2,suit:"♠",id:100+i}));};
 const two=fybDealFromShoe({deck:[{rank:9,id:98},{rank:8,id:99}],active:[0,1,2],playerCount:3,newDeck:fresh});
 assert.equal(opens,1);assert.equal(two.newDeckCount,1);
 assert.deepEqual(two.hands.map(h=>h[0].id),[98,99,100]);
 assert.equal(two.deck.length,51);
});
test("dealer draw consumes current deck, then replaces deck only if exhausted",()=>{
 const hands=[hand(4),hand(7)];
 let opens=0;const fresh=()=>{opens++;return Array.from({length:52},(_,i)=>({rank:5,suit:"♥",id:i}));};
 const first=fybDealerDraw({hands,deck:[{rank:11,suit:"♣"}],actor:1,newDeck:fresh});
 assert.equal(first.hands[1][0].rank,11);assert.equal(first.newDeckCount,0);assert.equal(first.deck.length,0);
 const second=fybDealerDraw({hands:first.hands,deck:first.deck,actor:1,newDeck:fresh});
 assert.equal(opens,1);assert.equal(second.newDeckCount,1);assert.equal(second.deck.length,51);
});
test("FYB lost chips accumulate and final winner drags entire purse, conserving virtual chips",()=>{
 const initial=[2000,2000,2000];
 const handOne=fybPayRound({stacks:initial,potCents:0,losers:[0,1],chipCents:100});
 assert.deepEqual(handOne.stacks,[1900,1900,2000]);assert.equal(handOne.potCents,200);
 const handTwo=fybPayRound({stacks:handOne.stacks,potCents:handOne.potCents,losers:[0],chipCents:100});
 assert.equal(handTwo.potCents,300);
 const final=fybPayRound({stacks:handTwo.stacks,potCents:handTwo.potCents,losers:[0,1],chipCents:100,winner:2});
 assert.deepEqual(final.stacks,[1700,1800,2500]);assert.equal(final.dragCents,500);assert.equal(final.potCents,0);
 assert.equal(final.stacks.reduce((sum,n)=>sum+n,0),initial.reduce((sum,n)=>sum+n,0));
});

test("final two cannot split until BOTH independently approve",()=>{
 const stacks=[1800,1500,1700],seats=[0,2];
 assert.throws(()=>fybSplitPurse({stacks,potCents:700,seats,approvals:{0:true}}),/Both players/);
 assert.throws(()=>fybSplitPurse({stacks,potCents:700,seats,approvals:{2:true}}),/Both players/);
 assert.throws(()=>fybSplitPurse({stacks,potCents:700,seats:[0,1,2],approvals:{0:true,1:true,2:true}}),/exactly two/);
 const agreed=fybSplitPurse({stacks,potCents:700,seats,approvals:{0:true,2:true}});
 assert.deepEqual(agreed.stacks,[2150,1500,2050]);
 assert.equal(agreed.potCents,0);
 assert.equal(agreed.splitCents,700);
 assert.equal(agreed.stacks.reduce((a,b)=>a+b,0),stacks.reduce((a,b)=>a+b,0)+700);
});
test("odd cents are awarded deterministically without losing a penny",()=>{
 const p=fybSplitPurse({stacks:[100,100],potCents:101,seats:[1,0],approvals:{0:true,1:true}});
 assert.deepEqual(p.payouts,{"0":51,"1":50});
 assert.deepEqual(p.stacks,[151,150]);
 assert.equal(p.stacks[0]+p.stacks[1],301);
});
test("empty purse and duplicated seat cannot bypass consent",()=>{
 assert.throws(()=>fybSplitPurse({stacks:[500,500],potCents:0,seats:[0,1],approvals:{0:true,1:true}}),/No FYB purse/);
 assert.throws(()=>fybSplitPurse({stacks:[500,500],potCents:100,seats:[0,0],approvals:{0:true}}),/exactly two/);
});
