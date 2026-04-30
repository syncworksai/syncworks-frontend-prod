import React from "react";

export default function ChannelBadge({ channel }) {
  return (
    <div className="h-7 w-7 rounded-xl border border-slate-700 bg-slate-900/80 flex items-center justify-center text-xs text-slate-200 shrink-0">
      {channel?.short || channel?.name?.slice(0, 2)?.toUpperCase?.() || "SW"}
    </div>
  );
}