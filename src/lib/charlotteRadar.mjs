import {chartMetrics} from "./charlotteIndicators.mjs";
// Bounded pilot universe, not an exchange-wide scanner.
export const radarUniverse=["AAPL","MSFT","NVDA","JPM","XOM","UNH"];
export function assessCandidate(data,now=Date.now()){
 if(!radarUniverse.includes(data?.symbol)||!Array.isArray(data.bars)||data.bars.length<50)return null;
 const timestamp=Date.parse(data.as_of);
 if(!Number.isFinite(timestamp)||timestamp>now||now-timestamp>4*86400000)return null;
 const bars=data.bars;
 if(bars.some((b,i)=>!Number.isFinite(Date.parse(b.date))||(i>0&&Date.parse(b.date)<=Date.parse(bars[i-1].date))))return null;
 const m=chartMetrics(bars.map(b=>b.close));
 const reasons=[];
 if(m.price>m.sma50&&m.price<m.sma20&&m.rsi14>=35&&m.rsi14<=55)reasons.push("Pullback within a stronger 50-session trend; investigate stabilization.");
 if(m.price>m.sma20&&bars.at(-2).close<=chartMetrics(bars.slice(0,-1).map(b=>b.close)).sma20)reasons.push("Reclaimed the 20-session average; investigate whether momentum persists.");
 if(m.rsi14<=30)reasons.push("RSI at or below 30; investigate selling pressure, not an automatic reversal.");
 if(!reasons.length)return null;
 return {symbol:data.symbol,asOf:data.as_of,source:data.source,adjustment:data.adjustment,reasons,risk:"Historical chart conditions can fail; verify earnings, news, valuation and liquidity before drawing conclusions.",next:"Open combined research and compare fundamental and economic evidence.",metrics:m};
}
export async function runRadar(getHistory,now=Date.now()){
 const candidates=[],unavailable=[];let checked=0;
 for(const symbol of radarUniverse){
  try{const data=await getHistory(symbol);if(data.symbol!==symbol)throw Error("Symbol mismatch");
   const t=Date.parse(data.as_of);if(!Number.isFinite(t)||t>now||now-t>4*86400000||!Array.isArray(data.bars)||data.bars.length<50)throw Error("Insufficient or stale data");
   const item=assessCandidate(data,now);checked++;if(item)candidates.push(item);
  }catch{unavailable.push(symbol);}
 }
 return {generatedAt:new Date(now).toISOString(),checked,unavailable,candidates};
}
