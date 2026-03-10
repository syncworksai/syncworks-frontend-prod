import React from "react";

export default function AnalyticsManager() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="font-semibold">Analytics (Next)</div>
      <div className="text-sm text-slate-400 mt-2">
        Growth + revenue analytics. Today: Overview tab has trend charts for signups/businesses/locks.
      </div>

      <div className="mt-4 text-xs text-slate-500">
        Future metrics:
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Tickets created / closed per day</li>
          <li>Cash vs card ratio</li>
          <li>Active businesses by ZIP</li>
          <li>Retention cohorts</li>
          <li>Revenue forecast + realized</li>
        </ul>
      </div>
    </div>
  );
}
