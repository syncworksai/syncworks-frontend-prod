import test from "node:test";
import assert from "node:assert/strict";
import {HAND_RANKINGS_357,practiceHandInfo,estimatePracticeEquity} from "./practiceOdds357.mjs";
const card=(rank,suit="♠")=>({rank,suit});

test("three-card practice excludes straights and flushes from hierarchy",()=>{
 assert.deepEqual(HAND_RANKINGS_357[0],["Natural 3-5-7 (instant drag)","Three of a kind","Pair","High card"]);
 assert.equal(practiceHandInfo([card(4),card(5),card(6)],0).name,"High card");
 assert.equal(practiceHandInfo([card(8),card(8,"♥"),card(10)],0).name,"Pair");
});
test("wild rank changes and is visible in practice hints",()=>{
 const first=practiceHandInfo([card(3),card(13,"♥"),card(13,"♦")],0);
 assert.equal(first.name,"Three of a kind");
 assert.equal(first.wildCount,1);
 const second=practiceHandInfo([card(3),card(13,"♥"),card(13,"♦"),card(5),card(9)],1);
 assert.equal(second.wild,5);
 assert.equal(second.wildCount,1);
});
test("natural 3 5 7 opening hand is a guaranteed instant drag",()=>{
 const hand=[card(5),card(7,"♥"),card(3,"♦")];
 assert.match(practiceHandInfo(hand,0).name,/instant drag/);
 assert.equal(estimatePracticeEquity(hand,0,{trials:8}).percent,100);
});
test("sampled opponent excludes player's cards, returns valid bounded approximate percentage",()=>{
 const hand=[card(14),card(13,"♥"),card(12,"♣")];
 const result=estimatePracticeEquity(hand,0,{trials:20,random:()=>0.25});
 assert.equal(result.trials,20);
 assert.ok(result.percent>=0&&result.percent<=100);
 assert.ok(result.wins+result.ties<=20);
 assert.equal(estimatePracticeEquity([],0),null);
});
test("five and seven card ranking order uses existing evaluator",()=>{
 assert.deepEqual(HAND_RANKINGS_357[2].slice(0,3),["Five of a kind","Straight flush","Four of a kind"]);
 const five=[card(10),card(10,"♥"),card(7,"♣"),card(4),card(2)];
 const info=practiceHandInfo(five,1);
 assert.equal(info.wild,5);
 assert.equal(info.name,"Pair");
});
