import test from "node:test";
import assert from "node:assert/strict";
import {buildPracticeSummary,practiceLifetime} from "./pokerClubPracticeLedger.mjs";
test("a $20 starter with four $20 rebuys caps initial buy-in exposure at $100",()=>{
 const report=buildPracticeSummary({players:[{id:"a",name:"Jake",kind:"human",chips:2000}],stacks:[7500],rebuyCounts:{0:4},cashouts:[{seat:0,chips:3000}],pot:0,gameCount:3});
 assert.equal(report.rows[0].buyinCents+report.rows[0].rebuyCents,10000);
 assert.equal(report.rows[0].payoutCents,10500);
 assert.equal(report.rows[0].netCents,500);
});
test("a cash-out plus resumed stack is not double counted",()=>{
 const x=buildPracticeSummary({players:[{id:"a",name:"Jake",chips:2000}],stacks:[2500],rebuyCounts:{0:1},cashouts:[{seat:0,chips:1000}]});
 assert.equal(x.rows[0].payoutCents,3500);
 assert.equal(x.rows[0].netCents,-500);
});
test("virtual lifetime results accumulate sessions without mixing other ledgers",()=>{
 const a=buildPracticeSummary({players:[{id:"a",name:"Jake",chips:2000}],stacks:[2400]});
 const b=buildPracticeSummary({players:[{id:"a",name:"Jake",chips:2000}],stacks:[1800]});
 const stats=practiceLifetime([a,b]);
 assert.equal(stats[0].net,200);assert.equal(stats[0].nights,2);
});
test("invalid rebuy beyond four is rejected",()=>{
 assert.throws(()=>buildPracticeSummary({players:[{id:"a",chips:2000}],stacks:[0],rebuyCounts:{0:5}}),/rebuy count/);
});
