import test from "node:test";
import assert from "node:assert/strict";
import {limitAnte,capGutsResult,rebuyChips,pickPracticeBotChoice,centsFromDollars} from "./pokerPracticeSession.mjs";
test("a $50 cap limits a 4-loser matching pot and conserves chips",()=>{
 const r=capGutsResult({kind:"drag",winner:0,entered:[0,1,2,3,4],delta:[2500,-2500,-2500,-2500,-2500],nextPot:10000,message:"Drag"}, {potCents:2500,capCents:5000,anteCents:25});
 assert.equal(r.nextPot,5000);
 assert.deepEqual(r.delta,[2500,-1250,-1250,-1250,-1250]);
 assert.equal(r.delta.reduce((sum,x)=>sum+x,0)+r.nextPot-2500,0);
});
test("at cap a no-holder round cannot add an ante",()=>{
 const r=capGutsResult({kind:"all-drop",delta:[-25,-25,-25],nextPot:5075,message:"Everyone folded"}, {potCents:5000,capCents:5000,anteCents:25});
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
