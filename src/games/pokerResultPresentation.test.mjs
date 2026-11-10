import test from "node:test";
import assert from "node:assert/strict";
import {describeRankedHand,describePokerResult} from "./pokerResultPresentation.mjs";
import {score442} from "./fourFourDeuce.mjs";
import {evaluateBozoHand,resolveBozoRound} from "./bozoRules.mjs";
const card=(rank,suit="♠")=>({rank,suit});
const hand=(...r)=>r.map((n,i)=>card(n,["♠","♥","♦","♣"][i%4]));
const players=[{name:"Jake"},{name:"Zack"},{name:"Lilly"}];
test("display real ranked hands, including kicker rank for full house",()=>{
 assert.equal(describeRankedHand({name:"Full house",kickers:[10,2]}),"Full house · Tens over Twos");
 assert.equal(describeRankedHand({name:"Four of a kind",kickers:[14]}),"Four of a kind · Aces");
 assert.equal(describeRankedHand({name:"Pair",kickers:[12,9,6]}),"Pair of Queens");
});
test("Bozo winner shows the winning player's actual evaluated hand",()=>{
 const clown=hand(2,3,5,7,9),hands=[hand(14,14,14,14,11),hand(3,5,7,9,11)];
 const result=resolveBozoRound({choices:["hold","drop"],hands,clown,wildRank:2,potCents:500});
 const displayed=describePokerResult({variant:"bozo",outcome:{kind:"player-win",winner:0,amount:500,losers:[]},players,hands,bozoResult:result,clownResult:result.clownHand});
 assert.match(displayed.title,/WINNER · Jake/);
 assert.match(displayed.detail,/Four of a kind · Aces/);
 assert.match(displayed.detail,/\$5\.00/);
});
test("Bozo clown win reports actual hand but a nobody-holds round never invents a winner",()=>{
 const clown=hand(13,13,9,9,2),weak=hand(3,5,7,8,10);
 const clownResult=evaluateBozoHand(clown,13);
 const winner=describePokerResult({variant:"bozo",outcome:{kind:"clown-win",message:"Pot carries forward."},players,clownResult});
 assert.match(winner.title,/Clown wins/);
 assert.match(winner.detail,/of a kind|house|Pair|Flush|Straight/);
 const dropped=describePokerResult({variant:"bozo",outcome:{kind:"all-drop"},players});
 assert.equal(dropped.winner,false);
 assert.match(dropped.detail,/No winner/);
});
test("4/4/Deuce announces winning combination and proper settlement",()=>{
 const ranked=score442(hand(11,11,11,2));
 const result=describePokerResult({variant:"442",outcome:{kind:"drag",winner:1,hand:ranked,delta:[-100,300,0],losers:[0]},players});
 assert.equal(result.title,"🏆 WINNER · Zack");
 assert.match(result.detail,/Three of a kind · Jacks/);
 assert.match(result.detail,/\$3\.00/);
});
test("FYB only declares a winner once one survives",()=>{
 const loss=describePokerResult({variant:"fyb",outcome:{losers:[1],message:"Zack loses one chip"},players});
 assert.equal(loss.winner,false);
 const victory=describePokerResult({variant:"fyb",outcome:{winner:0,dragCents:600},players,hands:[[card(13,"♦")],[],[]]});
 assert.match(victory.title,/FYB WINNER · Jake/);
 assert.match(victory.detail,/Final card: King ♦/);
});
