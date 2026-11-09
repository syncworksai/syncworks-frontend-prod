import test from "node:test";
import assert from "node:assert/strict";
import {suggestedHistory,sessionTotals,clubSummary,createSession,normalizeAlias,parseMoney} from "./cardClubSessions.mjs";
test("November 7 screenshot history retains corrected Russ payout and flags $2 mismatch",()=>{
 const s=suggestedHistory.find(x=>x.date==="2026-11-07");
 assert.equal(s.rows.find(x=>x.player==="Russ").payoutCents,1600);
 assert.equal(sessionTotals(s).paidIn,6000);
 assert.equal(sessionTotals(s).paidOut,6200);
 assert.equal(sessionTotals(s).difference,-200);
});
test("October 10 four $20 buy-ins produce $0.75 unallocated difference",()=>{
 const s=suggestedHistory.find(x=>x.date==="2026-10-10");
 assert.equal(sessionTotals(s).paidIn,8000);
 assert.equal(sessionTotals(s).paidOut,7925);
 assert.equal(sessionTotals(s).difference,75);
});
test("September 27 is only a $20-per-player draft, not invented payouts",()=>{
 const s=suggestedHistory.find(x=>x.date==="2026-09-27");
 assert.equal(s.defaultBuyinCents,2000);
 assert.deepEqual(s.rows,[]);
});
test("multiple club tables and player aliases roll into one lifetime entry",()=>{
 const a=createSession({date:"2026-11-07",table:"Table 1",rows:[{player:"Zach",buyinCents:1000,rebuyCents:0,payoutCents:1500}]});
 const b=createSession({date:"2026-11-07",table:"Table 2",rows:[{player:"Zack",buyinCents:2000,rebuyCents:500,payoutCents:2000}]});
 const result=clubSummary([a,b],{"Zach":"Zack"});
 assert.equal(result.length,1);assert.equal(result[0].nights,1);
 assert.equal(result[0].tables,2);assert.equal(result[0].net,0);
});
test("parse money rejects invalid and negative entries, keeps exact cents",()=>{
 assert.equal(parseMoney("20.50"),2050);
 assert.equal(parseMoney("0.25"),25);
 assert.equal(parseMoney("-20"),null);
 assert.equal(parseMoney("20.555"),null);
 assert.equal(normalizeAlias("Ang.",{"Ang.":"Angela"}),"Angela");
});
