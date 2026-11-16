import test from "node:test";
import assert from "node:assert/strict";
import { TRAINING_CANDLES, buildTrainingRows, resolvePracticeTrade, explainTrainingSignal, closePracticeTrade, practiceStats } from "../src/utils/tradingTutorial.mjs";

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

test("paper MNQ trades include point value and illustrative costs",()=>{
  const trade={side:"LONG",entry:21000,stop:20995,target:21010,risk:5,entryTime:"T+1"};
  const closed=closePracticeTrade(trade,21010,"MANUAL CLOSE");
  assert.equal(closed.netPnl,17.5);
  const stats=practiceStats([closed]);
  assert.equal(stats.count,1);
  assert.equal(stats.winRate,100);
  assert.equal(stats.balance,10017.5);
  assert.equal(stats.maxDrawdown,0);
});
test("losing paper trade affects win rate and drawdown",()=>{
  const trade={side:"SHORT",entry:21000,stop:21005,target:20990,risk:5};
  const closed=resolvePracticeTrade(trade,{low:20998,high:21006});
  assert.equal(closed.outcome,"STOP HIT");
  assert.equal(closed.netPnl,-12.5);
  const stats=practiceStats([closed]);
  assert.equal(stats.winRate,0);
  assert.equal(stats.maxDrawdown,12.5);
});
