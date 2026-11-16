import { SIM_MNQ_POINT_VALUE, SIM_ROUND_TRIP_FEE } from "./tradingTutorial.mjs";

export const JOURNAL_VERSION = 1;
export const JOURNAL_LIMIT = 300;
export const journalKey = (userId) => "sw:mnq-academy:journal:v1:" + String(userId || "anonymous").replace(/[^a-zA-Z0-9_-]/g, "_");

export function validateJournal(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.slice(-JOURNAL_LIMIT).filter((r) =>
    r && (r.side === "LONG" || r.side === "SHORT") &&
    ["MANUAL CLOSE", "STOP HIT", "TARGET HIT"].includes(r.outcome) &&
    [r.entry,r.exit,r.stop,r.target,r.risk,r.netPnl].every(Number.isFinite) &&
    r.risk > 0 && typeof r.entryTime === "string" && typeof r.exitTime === "string"
  ).map((r) => ({...r, entryIndex:Number.isInteger(r.entryIndex)?r.entryIndex:-1, exitIndex:Number.isInteger(r.exitIndex)?r.exitIndex:-1}));
}
export function readPracticeJournal(userId) {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const obj = JSON.parse(window.localStorage.getItem(journalKey(userId)) || "null");
    return obj?.version === JOURNAL_VERSION ? validateJournal(obj.trades) : [];
  } catch { return []; }
}
export function writePracticeJournal(userId, rows) {
  if (typeof window === "undefined" || !userId) return false;
  try {
    window.localStorage.setItem(journalKey(userId), JSON.stringify({version:JOURNAL_VERSION,trades:validateJournal(rows)}));
    return true;
  } catch { return false; }
}
export function unrealizedPracticePnl(trade, price) {
  if (!trade || !Number.isFinite(price)) return null;
  const gross = (price - trade.entry) * (trade.side === "LONG" ? 1 : -1) * SIM_MNQ_POINT_VALUE;
  return {gross, estimatedNet:gross - SIM_ROUND_TRIP_FEE, r:(price-trade.entry)*(trade.side==="LONG"?1:-1)/trade.risk};
}
export function equitySeries(trades,initial=10000) {
  return validateJournal(trades).reduce((data,r,i)=>{
    data.push({index:i+1,label:r.exitTime,equity:Number((data.at(-1).equity+r.netPnl).toFixed(2))});
    return data;
  },[{index:0,label:"Start",equity:initial}]);
}
export function reviewPracticeTrade(trade) {
  if (!trade?.closed) return null;
  const aligned = (trade.side==="LONG" && trade.signalAtEntry==="LONG WATCH") ||
    (trade.side==="SHORT" && trade.signalAtEntry==="SHORT WATCH");
  const followed = aligned ? "Entry matched the simulator's directional signal." : "Entry did not match a confirmed directional setup. Review EMA, VWAP, channel and volume before acting.";
  const risk = Number.isFinite(trade.risk) && trade.risk > 0 ? "Initial risk was " + trade.risk.toFixed(2) + " index points per contract." : "Risk could not be verified.";
  const exit = trade.outcome==="STOP HIT" ? "The practice stop closed this trade." : trade.outcome==="TARGET HIT" ? "The 2R practice target was reached." : "The position was closed manually.";
  const result = trade.netPnl>0 ? "This trade made simulated profit, which does not prove the entry was sound." : "This trade did not make simulated profit; evaluate the decision rather than judging it by the result alone.";
  return {aligned,summary:followed,details:[risk,exit,result],outcome:trade.outcome};
}
