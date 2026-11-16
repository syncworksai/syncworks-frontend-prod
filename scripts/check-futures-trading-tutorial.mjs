import test from "node:test";
import assert from "node:assert/strict";
import { TRAINING_CANDLES, buildTrainingRows, resolvePracticeTrade, explainTrainingSignal } from "../src/utils/tradingTutorial.mjs";

test("tutorial prices and OHLC structure are valid and deterministic",()=>{
  const rows = buildTrainingRows();
  assert.equal(rows.length,84);
  assert.deepEqual(rows, buildTrainingRows(TRAINING_CANDLES));
  assert.ok(rows.every(c=>c.low<=c.open&&c.low<=c.close&&c.high>=c.open&&c.high>=c.close&&c.volume>0));
  assert.ok(rows.slice(20).every(c=>Number.isFinite(c.upper)&&Number.isFinite(c.lower)&&Number.isFinite(c.vwap)));
});
test("20-candle channel excludes the current bar",()=>{
  const rows=buildTrainingRows();
  for(let i=20;i<rows.length;i++){
    assert.equal(rows[i].upper,Math.max(...rows.slice(i-20,i).map(c=>c.high)));
    assert.equal(rows[i].lower,Math.min(...rows.slice(i-20,i).map(c=>c.low)));
  }
});
test("practice stop takes precedence when both stop and target touch",()=>{
  const trade={side:"LONG",entry:100,stop:98,target:104,risk:2};
  const next=resolvePracticeTrade(trade,{high:105,low:97});
  assert.equal(next.outcome,"STOP HIT");assert.equal(next.resultR,-1);
  assert.equal(resolvePracticeTrade(trade,{high:103,low:99}),trade);
});
test("tutorial has both wait and breakout teaching examples",()=>{
  const rows=buildTrainingRows();
  assert.ok(rows.some(c=>c.signal==="WAIT"));
  assert.ok(rows.some(c=>c.signal!=="WAIT"),"Synthetic replay must include a qualifying setup");
});

test("WAIT teaching explanation lists missed gates without changing signal",()=>{
  const rows=buildTrainingRows();
  const candle=rows.find(row=>row.signal==="WAIT"&&row.upper!=null&&row.close>row.upper);
  assert.ok(candle,"Expected a breakout that lacks at least one confirmation");
  const result=explainTrainingSignal(candle);
  assert.match(result.summary,/WAIT — missing/);
  assert.ok(result.checks.some(check=>!check.passed));
  assert.equal(candle.signal,"WAIT");
});
