/**
 * Strict normalized market data endpoint contract.
 * GET VITE_STOCKS_CANDLES_URL?symbol=SPY -> {symbol,timeframe,updated_at,candles:[
 *   {time:"2026-...Z",open:...,high:...,low:...,close:...,volume:...,complete:true}
 * ]}
 * Server must be a trusted authenticated market-data adapter. No vendor keys in VITE_ vars.
 */
const ENDPOINT = String(import.meta.env.VITE_STOCKS_CANDLES_URL || "").trim();
export const stockFeedConfigured = Boolean(ENDPOINT);
export async function requestStockCandles(symbol, signal) {
  if (!ENDPOINT) throw new Error("Live stock feed not configured.");
  const url = new URL(ENDPOINT, window.location.origin);
  if (!/^https?:$/.test(url.protocol)) throw new Error("Market data endpoint must use HTTP(S).");
  if (window.location.protocol === "https:" && url.protocol !== "https:") throw new Error("HTTPS is required for live market data.");
  url.searchParams.set("symbol", symbol);
  const response = await fetch(url.toString(), { cache:"no-store", credentials: "omit", signal });
  if (!response.ok) throw new Error("Market-data feed error (" + response.status + ").");
  const data = await response.json();
  if (data?.symbol !== symbol || !Array.isArray(data?.candles) || typeof data?.timeframe !== "string" || !data.timeframe) throw new Error("Feed schema does not match requested symbol.");
  const updated = Date.parse(data.updated_at);
  if (!Number.isFinite(updated) || updated > Date.now() + 5000 || Date.now() - updated > 30000) throw new Error("Feed is stale or has an invalid clock.");
  if (data.candles.length < 20) throw new Error("Feed requires at least 20 completed candles.");
  if (data.candles.length > 2000) throw new Error("Feed exceeded maximum candle count.");
  let lastTime = -Infinity;
  const candles = data.candles.map((r) => {
    const t = Date.parse(r.time);
    const c = {time:r.time,open:Number(r.open),high:Number(r.high),low:Number(r.low),close:Number(r.close),volume:Number(r.volume)};
    if (!Number.isFinite(t) || t <= lastTime || r.complete !== true ||
        !Object.values(c).slice(1).every(Number.isFinite) || c.low > c.high ||
        c.open < c.low || c.open > c.high || c.close < c.low || c.close > c.high || c.volume < 0) {
      throw new Error("Rejected incomplete, unsorted or invalid candle from feed.");
    }
    lastTime = t;
    return c;
  });
  if (lastTime > updated + 5000) throw new Error("Feed candle timestamp exceeds update time.");
  return {symbol, timeframe:data.timeframe, updated_at:data.updated_at, candles};
}
