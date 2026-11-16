// Self-contained educational data. NEVER use these candles or signals as live quotes.
// Deterministic scenario with consolidation -> EMA/VWAP alignment -> upper-channel break -> extension -> fade.
export const TRAINING_CANDLES = Array.from({length:84}, (_,i) => {
  const base = 21000 + (i < 40 ? Math.sin(i * .63) * 8 + i * .09 : i < 54 ? (i - 40) * 3.6 + Math.sin(i * .5) * 3 : i < 65 ? 49 + (i - 54) * 2.4 : i < 75 ? 74 - (i - 65) * 3.7 : 37 - (i - 75) * 2);
  const close = +(base + Math.sin(i * 1.47) * 1.5).toFixed(2);
  const open = +(i ? (21000 + (i-1 < 40 ? Math.sin((i-1) * .63) * 8 + (i-1) * .09 : i-1 < 54 ? (i-1-40)*3.6 + Math.sin((i-1)*.5)*3 : i-1 < 65 ? 49+(i-1-54)*2.4 : i-1 < 75 ? 74-(i-1-65)*3.7 : 37-(i-1-75)*2) + Math.sin((i-1)*1.47)*1.5) : close-1).toFixed(2);
  return {time: "T+"+String(i+1).padStart(2,"0"),open,close,high:+(Math.max(open,close)+2.2+(i%3)).toFixed(2),low:+(Math.min(open,close)-2.1-(i%4)).toFixed(2),volume:Math.round(i>=40&&i<=55 ? 150+40*Math.abs(Math.sin(i)) : 65+30*Math.abs(Math.sin(i*1.4)))};
});
const average = (arr) => arr.reduce((sum, v) => sum+v,0)/(arr.length || 1);
export function buildTrainingRows(candles = TRAINING_CANDLES) {
  let ema7 = null,ema9 = null,cumulativePV=0,cumulativeVol=0,gains=[],losses=[],trueRanges=[];
  return candles.map((c,i)=>{
    ema7 = ema7 === null ? c.close : ema7 + (2/8)*(c.close-ema7);
    ema9 = ema9 === null ? c.close : ema9 + (2/10)*(c.close-ema9);
    cumulativePV += ((c.high+c.low+c.close)/3)*c.volume;
    cumulativeVol += c.volume;
    const delta = i>0 ? c.close-candles[i-1].close : 0;
    gains.push(Math.max(0,delta));losses.push(Math.max(0,-delta));
    const tr = i ? Math.max(c.high-c.low,Math.abs(c.high-candles[i-1].close),Math.abs(c.low-candles[i-1].close)) : c.high-c.low;
    trueRanges.push(tr);
    const vwap = cumulativePV/cumulativeVol;
    const upper = i>=20 ? Math.max(...candles.slice(i-20,i).map(x=>x.high)) : null;
    const lower = i>=20 ? Math.min(...candles.slice(i-20,i).map(x=>x.low)) : null;
    const avgGain = i>=14 ? average(gains.slice(i-13,i+1)) : null;
    const avgLoss = i>=14 ? average(losses.slice(i-13,i+1)) : null;
    const rsi = avgGain === null ? null : avgLoss===0 ? (avgGain===0 ? 50 : 100) : 100-100/(1+avgGain/avgLoss);
    const atr = i>=13 ? average(trueRanges.slice(i-13,i+1)) : null;
    const vol20 = i>=19 ? average(candles.slice(i-19,i+1).map(x=>x.volume)) : null;
    const volRatio = vol20 ? c.volume/vol20 : null;
    const readyLong = i>=20 && c.close>upper && ema7>ema9 && c.close>vwap && volRatio>=1.15;
    const readyShort = i>=20 && c.close<lower && ema7<ema9 && c.close<vwap && volRatio>=1.15;
    return {...c,ema7,ema9,vwap,upper,lower,rsi,atr,volRatio,signal:readyLong?"LONG WATCH":readyShort?"SHORT WATCH":"WAIT"};
  });
}
export function resolvePracticeTrade(trade, candle) {
  if (!trade || !candle) return trade;
  const stopHit = trade.side==="LONG" ? candle.low<=trade.stop : candle.high>=trade.stop;
  const targetHit = trade.side==="LONG" ? candle.high>=trade.target : candle.low<=trade.target;
  if (!stopHit&&!targetHit) return trade;
  const exit=stopHit?trade.stop:trade.target;
  return {...trade,exit,closed:true,outcome:stopHit?"STOP HIT":"TARGET HIT",resultR:(exit-trade.entry)*(trade.side==="LONG"?1:-1)/trade.risk};
}


export function explainTrainingSignal(c) {
  if(!c)return {summary:"No candle yet",checks:[]};
  const checks=[
    {label:"EMA pressure",passed:c.ema7>c.ema9,detail:"EMA 7 must be above EMA 9 for a long setup"},
    {label:"Above VWAP",passed:c.close>c.vwap,detail:"Close must be above simulated session VWAP"},
    {label:"Donchian break",passed:c.upper!=null&&c.close>c.upper,detail:"Close must exceed previous 20-bar high"},
    {label:"Volume confirmation",passed:c.volRatio!=null&&c.volRatio>=1.15,detail:"Relative volume must be at least 1.15×"}
  ];
  const missing=checks.filter(x=>!x.passed).map(x=>x.label);
  return {summary:c.signal!=="WAIT"?c.signal+" — review risk before practice entry":missing.length?"WAIT — missing "+missing.join(", "):"WAIT — bullish checks not sufficient; inspect short-side conditions",checks};
}
