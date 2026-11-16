/**
 * Research-only backtest. Uses only completed past bars for setups, enters at next
 * candle open, resolves ambiguous stop/target bars as stop-first, and closes positions
 * at last candle if still held. This is not a fill simulator.
 */
export function parseResearchCsv(csv) {
  const rows = String(csv).replace(/\r/g, "").trim().split("\n").filter(Boolean);
  if (rows.length < 55 || rows.length > 100002) throw new Error("Supply 55 to 100,001 CSV lines, including the header.");
  const names = rows.shift().split(",").map((value) => value.trim().toLowerCase().replace(/[^a-z]/g,""));
  const lookup = (...keys) => keys.map((name) => names.indexOf(name)).find((index) => index !== -1) ?? -1;
  const columns = {time:lookup("date","datetime","timestamp","time"),open:lookup("open"),high:lookup("high"),low:lookup("low"),close:lookup("close"),volume:lookup("volume","vol")};
  if (Object.values(columns).some((index) => index === -1)) throw new Error("Required columns: date, open, high, low, close, volume.");
  const candles = rows.map((line) => {
    const values = line.split(",").map((value) => value.trim().replace(/^"|"$/g,""));
    const candle = Object.fromEntries(Object.entries(columns).map(([key,index]) => [key, key === "time" ? values[index] : Number(values[index])]));
    const timeMs = Date.parse(candle.time);
    if (!Number.isFinite(timeMs) || ![candle.open,candle.high,candle.low,candle.close,candle.volume].every(Number.isFinite) || candle.volume < 0 ||
      candle.low <= 0 || candle.low > candle.high || candle.open < candle.low || candle.open > candle.high || candle.close < candle.low || candle.close > candle.high)
      throw new Error("Invalid timestamp or OHLCV data. Use ISO timestamps and valid positive prices.");
    return {...candle,timeMs};
  });
  if (candles.some((r,i) => i > 0 && r.timeMs <= candles[i-1].timeMs)) throw new Error("Candles must be in ascending order, without duplicate dates.");
  return candles;
}

const mean = (bars, key) => bars.reduce((sum,bar) => sum + bar[key],0)/bars.length;

export function backtestDonchian(candles, {lookback = 20, volumeMinimum = 1.2, maxHold = 20, costR = 0.05} = {}) {
  if (![lookback, maxHold].every(Number.isInteger) || lookback < 5 || lookback > 100 || maxHold < 1 || maxHold > 500 ||
    !Number.isFinite(volumeMinimum) || volumeMinimum < 0 || !Number.isFinite(costR) || costR < 0 || costR > 5) {
    throw new Error("Invalid backtest parameters.");
  }
  const trades = [];
  let openTrade = null;
  for (let i = Math.max(50, lookback); i < candles.length; i++) {
    const candle = candles[i];
    if (openTrade) {
      const trade = openTrade;
      const held = i - trade.entryIndex + 1;
      const stopHit = trade.side === "LONG" ? candle.low <= trade.stop : candle.high >= trade.stop;
      const targetHit = trade.side === "LONG" ? candle.high >= trade.target : candle.low <= trade.target;
      const end = i === candles.length - 1 || held >= maxHold;
      if (stopHit || targetHit || end) {
        const exitPrice = stopHit ? trade.stop : targetHit ? trade.target : candle.close;
        const rawR = ((exitPrice - trade.entry) * (trade.side === "LONG" ? 1 : -1)) / trade.risk;
        trades.push({...trade,exitTime:candle.time,exit:exitPrice,reason:stopHit?"STOP (or ambiguous)":targetHit?"TARGET":"TIME/END",resultR:rawR-costR});
        openTrade = null;
      }
      continue;
    }
    // Compute the signal from the prior fully closed candle only.
    const setupIndex = i-1;
    const setup = candles[setupIndex];
    const past20 = candles.slice(setupIndex-19,setupIndex+1);
    const past50 = candles.slice(setupIndex-49,setupIndex+1);
    const previousChannel = candles.slice(setupIndex-lookback,setupIndex);
    if (previousChannel.length !== lookback || past50.length !== 50 || past20.length !== 20) continue;
    const upper = Math.max(...previousChannel.map((r) => r.high));
    const lower = Math.min(...previousChannel.map((r) => r.low));
    const sma20 = mean(past20,"close");
    const sma50 = mean(past50,"close");
    const volumeAverage = mean(candles.slice(setupIndex-19,setupIndex+1),"volume");
    if (volumeAverage <= 0 || setup.volume/volumeAverage < volumeMinimum) continue;
    const long = setup.close > upper && setup.close > sma20 && sma20 > sma50;
    const short = setup.close < lower && setup.close < sma20 && sma20 < sma50;
    if (!long && !short) continue;
    // Stop at the signal candle extreme; entry next open, never on the signal close.
    const entry = candle.open;
    const stop = long ? setup.low : setup.high;
    const risk = long ? entry-stop : stop-entry;
    if (!(risk > 0) || !Number.isFinite(risk)) continue;
    openTrade = {side:long?"LONG":"SHORT",entryIndex:i,signalTime:setup.time,entryTime:candle.time,entry,stop,target:long?entry+2*risk:entry-2*risk,risk};
    // Entry bar may also hit stop or target. Stop-first pessimistic fill.
    const stopHit = long ? candle.low <= stop : candle.high >= stop;
    const targetHit = long ? candle.high >= openTrade.target : candle.low <= openTrade.target;
    if (stopHit || targetHit || i === candles.length-1) {
      const exitPrice = stopHit ? stop : targetHit ? openTrade.target : candle.close;
      trades.push({...openTrade,exitTime:candle.time,exit:exitPrice,reason:stopHit?"STOP (or ambiguous)":targetHit?"TARGET":"END",resultR:((exitPrice-entry)*(long?1:-1))/risk-costR});
      openTrade = null;
    }
  }
  if (openTrade) {
    const last = candles[candles.length-1];
    trades.push({...openTrade,exitTime:last.time,exit:last.close,reason:"END",resultR:((last.close-openTrade.entry)*(openTrade.side==="LONG"?1:-1))/openTrade.risk-costR});
  }
  const wins = trades.filter((trade) => trade.resultR > 0).length;
  let equity = 0, peak = 0, maxDrawdownR = 0;
  for (const trade of trades) {
    equity += trade.resultR;
    peak = Math.max(peak,equity);
    maxDrawdownR = Math.max(maxDrawdownR,peak-equity);
  }
  return {trades, count:trades.length, winRate:trades.length?wins/trades.length:0, expectancyR:trades.length?equity/trades.length:0, totalR:equity, maxDrawdownR};
}
