import test from "node:test";
import assert from "node:assert/strict";
import { backtestDonchian, parseResearchCsv } from "../src/utils/tradingBacktest.mjs";

const start = Date.parse("2026-01-01T00:00:00Z");
function bars(n=100) {
  return Array.from({length:n},(_,i)=>{const close=100+i*0.15;return {time:new Date(start+i*60000).toISOString(),open:close-0.05,high:close+0.2,low:close-0.2,close,volume:100+i,timeMs:start+i*60000};});
}
test("requires correct CSV and ascending ISO timestamps",()=>{
  const data = bars(70);
  const csv = ["date,open,high,low,close,volume",...data.map(x=>[x.time,x.open,x.high,x.low,x.close,x.volume].join(","))].join("\n");
  assert.equal(parseResearchCsv(csv).length,70);
  assert.throws(()=>parseResearchCsv(csv.replace(data[1].time,data[0].time)),/ascending/);
  assert.throws(()=>parseResearchCsv("date,open,high,low,close,volume\n1,2,3"),/55/);
});
test("flat prices cannot generate a breakout",()=>{
  const candles = bars().map(x=>({...x,open:100,high:101,low:99,close:100}));
  assert.equal(backtestDonchian(candles).count,0);
});
test("every recorded trade has entry strictly after setup",()=>{
  const r=backtestDonchian(bars(),{volumeMinimum:0});
  for(const t of r.trades){assert.ok(Date.parse(t.entryTime)>Date.parse(t.signalTime));assert.ok(Number.isFinite(t.resultR));}
  assert.ok(Number.isFinite(r.maxDrawdownR));
});
