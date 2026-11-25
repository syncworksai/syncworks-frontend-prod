import test from "node:test";
import assert from "node:assert/strict";
import {planLong,evaluateLong} from "../src/lib/charlotteSwing.mjs";
test("whole-share sizing respects risk and cash",()=>{assert.deepEqual(planLong({entry:135,stop:125,target:155,balance:5000,riskPercent:1}),{shares:5,cost:675,plannedLoss:50,potentialGain:100,rewardRisk:2});});
test("invalid plans fail closed",()=>{assert.throws(()=>planLong({entry:135,stop:140,target:155,balance:5000,riskPercent:1}),RangeError);});
test("stale observations cannot trigger a review",()=>{assert.equal(evaluateLong({price:155,entry:135,stop:125,target:155,asOf:"2026-01-01T00:00:00Z"},Date.parse("2026-01-02T00:00:00Z")),"STALE_OR_UNKNOWN");});
test("fresh observations are review events, not orders",()=>{const asOf="2026-01-01T00:00:00Z";for(const [price,expected] of [[124,"INVALIDATION_REVIEW"],[155,"TARGET_REVIEW"],[135,"ENTRY_REVIEW"],[130,"WATCHING"]])assert.equal(evaluateLong({price,entry:135,stop:125,target:155,asOf},Date.parse(asOf)),expected);});
