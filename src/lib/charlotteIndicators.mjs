export function chartMetrics(closes) {
 if (!Array.isArray(closes)||!closes.length||closes.some(v=>!Number.isFinite(v)||v<=0)) throw new RangeError("Positive chronological closing prices required");
 const price=closes.at(-1);
 const sma=n=>closes.length<n?null:closes.slice(-n).reduce((a,b)=>a+b,0)/n;
 let rsi=null;
 if(closes.length>=15){
 let gain=0,loss=0;
 for(let i=1;i<=14;i++){const d=closes[i]-closes[i-1];gain+=Math.max(d,0)/14;loss+=Math.max(-d,0)/14;}
 for(let i=15;i<closes.length;i++){const d=closes[i]-closes[i-1];gain=(13*gain+Math.max(d,0))/14;loss=(13*loss+Math.max(-d,0))/14;}
 rsi=loss===0?(gain===0?50:100):100-100/(1+gain/loss);
 }
 return {price,sma20:sma(20),sma50:sma(50),sma200:sma(200),rsi14:rsi};
}
export function fundamentalMetrics({price,epsTTM,epsActual,epsEstimate}) {
 const finite=Number.isFinite;
 return {pe:finite(price)&&price>0&&finite(epsTTM)&&epsTTM>0?price/epsTTM:null,
 surprisePercent:finite(epsActual)&&finite(epsEstimate)&&epsEstimate!==0?100*(epsActual-epsEstimate)/Math.abs(epsEstimate):null};
}
