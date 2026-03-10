// src/components/platform/PlatformTabBroadcasts.jsx
import React from "react";

function GlassCard({ title, children }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 backdrop-blur p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="font-semibold tracking-tight">{title}</div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function PlatformTabBroadcasts({
  broadcastTitle,
  setBroadcastTitle,
  broadcastBody,
  setBroadcastBody,
  sendTo,
  setSendTo,
  broadcastMsg,
  sendBroadcast,
}) {
  return (
    <GlassCard title="Broadcast message to users">
      {broadcastMsg ? (
        <div className="mt-1 text-sm text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3">
          {broadcastMsg}
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        <div className="grid md:grid-cols-3 gap-2">
          <select
            className="bg-black/30 border border-white/10 rounded-2xl px-3 py-2 text-sm"
            value={sendTo}
            onChange={(e) => setSendTo(e.target.value)}
            title="Send to segment"
          >
            <option value="ALL">All</option>
            <option value="CUSTOMER">Customers</option>
            <option value="SBO">SBO</option>
            <option value="PM">Property Managers</option>
          </select>

          <input
            className="md:col-span-2 bg-black/30 border border-white/10 rounded-2xl px-3 py-2 text-sm"
            placeholder="Title (e.g. Scheduled Maintenance Tonight)"
            value={broadcastTitle}
            onChange={(e) => setBroadcastTitle(e.target.value)}
          />
        </div>

        <textarea
          className="w-full min-h-[140px] bg-black/30 border border-white/10 rounded-2xl px-3 py-2 text-sm"
          placeholder="Message..."
          value={broadcastBody}
          onChange={(e) => setBroadcastBody(e.target.value)}
        />

        <div className="flex gap-2 flex-wrap">
          <button
            className="rounded-2xl px-4 py-2 bg-white/10 border border-white/20 hover:bg-white/15 text-sm font-semibold"
            onClick={sendBroadcast}
            disabled={!broadcastTitle.trim() || !broadcastBody.trim()}
          >
            Send Broadcast
          </button>
        </div>
      </div>
    </GlassCard>
  );
}
