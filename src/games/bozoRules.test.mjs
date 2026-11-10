import test from "node:test";
import assert from "node:assert/strict";
import {evaluateBozoHand,resolveBozoRound,chooseBozoBotAction,bozoClownContributions} from "./bozoRules.mjs";
import {createShuffledDeck} from "./drop357Table.mjs";
const c=(rank,suit="♠")=>({rank,suit});
const cards=(...r)=>r.map((n,i)=>c(n,["♠","♥","♦","♣"][i%4]));
test("7-card Bozo plus ghost uses one 52-card deck even with six players",()=>{
 for(let n=0;n<40;n++){
  const deck=createShuffledDeck();
  const hands=Array.from({length:6},(_,i)=>deck.slice(i*7,(i+1)*7));
  const clown=deck.slice(42,49),unused=deck.slice(49);
  assert.equal(clown.length,7);assert.equal(unused.length,3);
  assert.equal(new Set([...hands.flat(),...clown,...unused].map(c=>c.rank+c.suit)).size,52);
  assert.equal(evaluateBozoHand(clown,clown[0].rank).score>=15**5,true);
 }
});
test("Clown exposed wild guarantees a pair even when all other natural ranks differ",()=>{
 const clown=cards(2,6,9,11,13);
 const result=evaluateBozoHand(clown,2);
 assert.ok(result.score>=15**5);assert.notEqual(result.name,"High card");
});
test("lone holder who beats Clown drags and ends the game",()=>{
 const clown=cards(2,3,5,7,9),strong=cards(14,14,14,14,11);
 const result=resolveBozoRound({choices:["hold","drop"],hands:[strong,cards(3,5,7,9,11)],clown,wildRank:2,potCents:500});
 assert.equal(result.kind,"player-win");assert.equal(result.winner,0);assert.equal(result.dragCents,500);
 assert.deepEqual(result.penalties,[]);
});
test("lone holder losing to Clown matches full pot",()=>{
 const clown=cards(13,13,9,9,2),weak=cards(3,5,7,8,10);
 const result=resolveBozoRound({choices:["hold","drop"],hands:[weak,cards(4,5,6,7,8)],clown,wildRank:13,potCents:400});
 assert.equal(result.kind,"clown-win");
 assert.deepEqual(result.penalties,[{player:0,cents:400}]);
 assert.equal(result.nextPotCents,800);
});
test("every losing holder matches pot if another holder beats Clown",()=>{
 const clown=cards(2,3,5,7,9),best=cards(14,14,14,14,11),weak=cards(3,4,6,8,10);
 const result=resolveBozoRound({choices:["hold","hold","drop"],hands:[best,weak,cards(6,7,8,9,10)],clown,wildRank:2,potCents:300});
 assert.equal(result.kind,"player-win");assert.equal(result.nextPotCents,300);
 assert.deepEqual(result.penalties,[{player:1,cents:300}]);
});
test("nobody holds: pot is carried to the next ante without immediate double charge",()=>{
 const result=resolveBozoRound({choices:["drop","drop"],hands:[cards(2,3,4,5,6),cards(7,8,9,10,11)],clown:cards(4,6,8,10,12),wildRank:4,potCents:275});
 assert.equal(result.kind,"all-drop");assert.equal(result.nextPotCents,275);
 assert.equal(result.penalties.length,0);
});

test("Bozo AI holds strong hands but drops weak ones without seeing opponents",()=>{
 const strong=cards(14,14,14,14,9);
 const weak=cards(2,5,8,11,13);
 assert.equal(chooseBozoBotAction({hand:strong,wildRank:3,potCents:200,stackCents:2000,random:()=>0.7}),"hold");
 assert.equal(chooseBozoBotAction({hand:weak,wildRank:3,potCents:1600,stackCents:2000,random:()=>0.5}),"fold");
 assert.equal(chooseBozoBotAction({hand:strong,wildRank:3,stackCents:0,random:()=>0}),"fold");
});
test("Bozo AI style changes probability but does not guarantee a win",()=>{
 const hand=cards(10,10,6,8,14);
 const cautious=chooseBozoBotAction({hand,wildRank:3,style:"cautious",random:()=>0.15});
 const aggressive=chooseBozoBotAction({hand,wildRank:3,style:"aggressive",random:()=>0.15});
 assert.equal(cautious,"fold");
 assert.equal(aggressive,"hold");
});

test("Two holders against the Clown collectively double a one-dollar purse",()=>{
 const clown=cards(13,13,9,9,2);
 const weak=cards(3,5,7,8,10),other=cards(4,5,6,7,8);
 const result=resolveBozoRound({choices:["hold","hold","drop"],hands:[weak,other,cards(2,4,6,8,10)],clown,wildRank:13,potCents:100});
 assert.equal(result.kind,"clown-win");
 assert.equal(result.nextPotCents,200);
 assert.deepEqual(result.penalties,[{player:0,cents:50},{player:1,cents:50}]);
 const paid=bozoClownContributions({holders:[0,1],stacks:[2000,2000,2000],potCents:100,capCents:5000});
 assert.equal(paid.totalCents,100);assert.equal(paid.nextPotCents,200);
 assert.deepEqual(paid.payments,{"0":50,"1":50});
});
test("Three holders split an odd-cent Clown match without increasing pot more than once",()=>{
 const result=bozoClownContributions({holders:[0,1,2],stacks:[100,100,100],potCents:100,capCents:500});
 assert.equal(result.nextPotCents,200);
 assert.equal(Object.values(result.payments).reduce((sum,v)=>sum+v,0),100);
 assert.ok(Math.max(...Object.values(result.payments))-Math.min(...Object.values(result.payments))<=25);assert.ok(Object.values(result.payments).every(x=>x%25===0));
});
test("Clown settlement honors cap while short stacks can owe whole quarters",()=>{
 const result=bozoClownContributions({holders:[0,1],stacks:[10,100],potCents:100,capCents:150});
 assert.equal(result.nextPotCents,150);
 assert.deepEqual(result.payments,{"0":25,"1":25});assert.equal(10-result.payments[0],-15);
 const capped=bozoClownContributions({holders:[0,1],stacks:[100,100],potCents:100,capCents:100});
 assert.equal(capped.totalCents,0);assert.equal(capped.nextPotCents,100);
});
test("No holders never triggers a Clown payout or pot match",()=>{
 const clown=cards(13,13,9,9,2),weak=cards(3,5,7,8,10);
 const result=resolveBozoRound({choices:["drop","drop"],hands:[weak,weak],clown,wildRank:13,potCents:100});
 assert.equal(result.kind,"all-drop");assert.equal(result.nextPotCents,100);
 assert.deepEqual(result.penalties,[]);
});
