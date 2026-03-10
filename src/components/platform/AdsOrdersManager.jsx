import React from "react";

export default function AdsOrdersManager() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="font-semibold">Ads Orders (Next)</div>
      <div className="text-sm text-slate-300 mt-2">
        This tab will track:
      </div>
      <ul className="text-sm text-slate-400 list-disc pl-5 mt-2 space-y-1">
        <li>Paid ad orders</li>
        <li>Zip targeting / schedule / impressions (later)</li>
        <li>Invoice status per ad client</li>
      </ul>

      <div className="mt-4 text-xs text-slate-500">
        Today’s MVP: you can already run “ads” via News Reel with scheduling + ZIP targeting + image upload.
      </div>
    </div>
  );
}
