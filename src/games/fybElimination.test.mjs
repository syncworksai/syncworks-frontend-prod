import test from "node:test";
import assert from "node:assert/strict";
import {fybOrder,fybRound,fybNextDealer,fybSwap} from "./fybElimination.mjs";
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
