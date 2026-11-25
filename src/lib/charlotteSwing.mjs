// Pure research calculations. No market feed, orders, or account access.
export function planLong({entry,stop,target,balance,riskPercent}) {
  if (![entry,stop,target,balance,riskPercent].every(Number.isFinite) || !(stop>0 && entry>stop && target>entry && balance>0 && riskPercent>0 && riskPercent<=100)) throw new RangeError("Invalid long plan");
  const perShare=entry-stop;
  const shares=Math.min(Math.floor(balance/entry),Math.floor(balance*riskPercent/100/perShare));
  return {shares,cost:shares*entry,plannedLoss:shares*perShare,potentialGain:shares*(target-entry),rewardRisk:(target-entry)/perShare};
}
export function evaluateLong({price,entry,stop,target,asOf}, now=Date.now(), maxAgeMs=15*60*1000) {
  if (![price,entry,stop,target,now,maxAgeMs].every(Number.isFinite) || !(price>0 && stop>0 && entry>stop && target>entry && maxAgeMs>0)) throw new RangeError("Invalid observation");
  const timestamp=Date.parse(asOf);
  if (!Number.isFinite(timestamp) || timestamp>now || now-timestamp>maxAgeMs) return "STALE_OR_UNKNOWN";
  if (price<=stop) return "INVALIDATION_REVIEW";
  if (price>=target) return "TARGET_REVIEW";
  if (price>=entry) return "ENTRY_REVIEW";
  return "WATCHING";
}
