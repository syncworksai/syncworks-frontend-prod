import test from "node:test";
import assert from "node:assert/strict";
import {limitAnte,capGutsResult,rebuyChips,pickPracticeBotChoice,centsFromDollars} from "./pokerPracticeSession.mjs";
test("a $50 cap limits a 4-loser matching pot and conserves chips",()=>{
 const r=capGutsResult({kind:"drag",winner:0,entered:[0,1,2,3,4],delta:[2500,-2500,-2500,-2500,-2500],nextPot:10000,message:"Drag"}, {potCents:2500,capCents:5000,anteCents:25,stacks:[2000,2000,2000,2000,2000]});
 assert.equal(r.nextPot,5000);
 assert.deepEqual(r.delta,[7500,-2500,-2500,-2500,-2500]);
 assert.equal(r.delta.reduce((sum,x)=>sum+x,0)+r.nextPot-2500,0);
});
test("at cap a no-holder round cannot add an ante",()=>{
 const r=capGutsResult({kind:"all-drop",delta:[-25,-25,-25],nextPot:5075,message:"Everyone folded"}, {potCents:5000,capCents:5000,anteCents:25,stacks:[2000,2000,2000]});
 assert.equal(r.nextPot,5000);assert.deepEqual(r.delta,[0,0,0]);
});
test("limit first ante and rebuys remain separate from pot",()=>{
 assert.equal(limitAnte({potCents:4800,capCents:5000,anteCents:100,playerCount:4}),50);
 assert.equal(centsFromDollars("20"),2000);
 assert.equal(centsFromDollars("-1"),null);
 assert.deepEqual(rebuyChips([-1000,1000],0,2000),[1000,1000]);
});
test("balanced bots fold weak hands more and aggressive is opt-in",()=>{
 const weak=[{rank:2},{rank:6},{rank:9}];
 const strong=[{rank:3},{rank:9},{rank:9}];
 assert.equal(pickPracticeBotChoice(weak,0,"balanced",()=>0.5),"drop");
 assert.equal(pickPracticeBotChoice(strong,0,"balanced",()=>0.5),"hold");
 assert.equal(pickPracticeBotChoice(weak,0,"aggressive",()=>0.5),"hold");
});

test("a capped pot still charges the full loser liability and carries forward",()=>{
 const r=capGutsResult({kind:"drag",winner:0,entered:[0,1],delta:[5000,-5000],nextPot:5000,message:"Drag"},
 {potCents:5000,capCents:5000,anteCents:25,stacks:[1200,400]});
 assert.deepEqual(r.delta,[5000,-5000]);assert.equal(r.nextPot,5000);assert.equal(r.matchingAmountCents,5000);assert.equal(400+r.delta[1],-4600);
});
test("short losing chip balance becomes debt rather than forgiving the match",()=>{
 const r=capGutsResult({kind:"drag",winner:0,entered:[0,1,2],delta:[300,-300,-300],nextPot:600,message:"Drag"},
 {potCents:300,capCents:2000,anteCents:25,stacks:[100,60,200]});
 assert.deepEqual(r.delta,[300,-300,-300]);assert.equal(r.nextPot,600);
});

test("all wagers use 25-cent chips; no fractional pennies",()=>{
 assert.equal(centsFromDollars("0.30"),25);
 assert.equal(centsFromDollars("0.37"),25);
 assert.equal(centsFromDollars("0.40"),50);
 const x=capGutsResult({kind:"drag",winner:0,entered:[0,1,2],delta:[-1,-1,-1]},{
  potCents:250,capCents:300,anteCents:25,stacks:[250,25,25]
 });
 assert.equal(x.nextPot,300);
 assert.deepEqual(x.delta,[450,-250,-250]);
 assert.equal(x.bonusToWinnerCents,200);
});
