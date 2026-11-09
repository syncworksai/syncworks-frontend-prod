import test from "node:test";
import assert from "node:assert/strict";
import {score442,naturalPair442,replace442,settle442,botExchange442} from "./fourFourDeuce.mjs";
const cards=(...r)=>r.map((rank,i)=>({rank,suit:["♠","♥","♦","♣"][i]}));
test("four-card evaluator ignores straight and flush and 4 is always wild",()=>{
 assert.equal(score442(cards(5,6,7,8)).category,0);
 assert.equal(score442(cards(9,9,6,7)).category,1);
 assert.equal(score442(cards(9,9,7,7)).category,2);
 assert.equal(score442(cards(9,9,9,7)).category,3);
 assert.equal(score442(cards(9,9,9,4)).category,4);
 assert.equal(score442(cards(4,4,9,9)).category,4);
 assert.ok(score442(cards(8,8,8,8)).score>score442(cards(8,8,8,7)).score);
});
test("only non-wild matching ranks qualify lone holder",()=>{
 assert.equal(naturalPair442(cards(4,14,7,9)),false);
 assert.equal(naturalPair442(cards(4,4,14,9)),false);
 assert.equal(naturalPair442(cards(4,9,9,7)),true);
});
test("exchange limit, selected slots and deck conservation",()=>{
 const hands=[cards(2,3,4,5),cards(7,8,9,10)],deck=cards(11,12,13,14);
 const changed=replace442({hands,deck,seat:0,indexes:[0,3,1]});
 assert.deepEqual(changed.hands[0].map(c=>c.rank),[11,12,4,13]);
 assert.equal(changed.deck.length,1);
 assert.deepEqual(hands[0].map(c=>c.rank),[2,3,4,5]);
 assert.throws(()=>replace442({hands,deck,seat:0,indexes:[0,1,2,3]}),/up to three/);
});
test("all drop and lone no natural pair carry pot without transfer",()=>{
 const hands=[cards(4,8,9,10),cards(6,6,7,8)];
 let r=settle442({hands,choices:["fold","fold"],potCents:150,capCents:1000,anteCents:25});
 assert.equal(r.kind,"all-drop");assert.equal(r.nextPot,150);
 r=settle442({hands,choices:["hold","fold"],potCents:150,capCents:1000,anteCents:25});
 assert.equal(r.kind,"no-natural-pair");assert.equal(r.nextPot,150);
 r=settle442({hands,choices:["fold","hold"],potCents:150,capCents:1000,anteCents:25});
 assert.equal(r.winner,1);assert.equal(r.nextPot,0);assert.equal(r.delta[1],150);
});
test("best four-card holder drags and loser matches pot within cap",()=>{
 const hands=[cards(7,7,9,10),cards(8,8,8,4)];
 const r=settle442({hands,choices:["hold","hold"],potCents:150,capCents:1000,anteCents:25});
 assert.equal(r.winner,1);assert.deepEqual(r.delta,[-150,150]);assert.equal(r.nextPot,150);
 const capped=settle442({hands,choices:["hold","hold"],potCents:150,capCents:100,anteCents:25});
 assert.deepEqual(capped.delta,[-100,150]);assert.equal(capped.nextPot,100);
});
test("bot conserves wild fours and existing natural pairs",()=>{
 assert.deepEqual(botExchange442(cards(4,8,8,11)),[3]);
 assert.equal(botExchange442(cards(3,7,9,11)).length,3);
});
