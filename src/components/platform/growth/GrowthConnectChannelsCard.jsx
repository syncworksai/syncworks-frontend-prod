import React from "react";
import ChannelBadge from "./ChannelBadge";

function GlassCard({ title, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold tracking-tight text-slate-100">{title}</div>
        {right ? <div className="text-xs text-slate-400">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function StatusPill({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-500/10 border-slate-500/20 text-slate-200",
    cyan: "bg-cyan-500/10 border-cyan-500/20 text-cyan-200",
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-200",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-200",
    rose: "bg-rose-500/10 border-rose-500/20 text-rose-200",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-200",
  };

  return (
    <span className={["text-[11px] px-2 py-1 rounded-full border", tones[tone] || tones.slate].join(" ")}>
      {children}
    </span>
  );
}

export default function GrowthConnectChannelsCard({
  channelStateMap,
  getChannelStatus,
  getChannelLabel,
  toneFromStatus,
  setConnectModalOpen,
  isDemoMode,
}) {
  return (
    <GlassCard title="Connect Channels" right={isDemoMode ? "demo seed + expanded coverage" : "live + expanded coverage"}>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
        {Object.values(channelStateMap).map((c) => {
          const status = getChannelStatus(c);
          return (
            <div key={c.key} className="rounded-xl border border-slate-800 bg-slate-950/55 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ChannelBadge channel={c} />
                  <div className="text-sm text-slate-200">{c.name}</div>
                </div>
                <StatusPill tone={toneFromStatus(status)}>{getChannelLabel(status)}</StatusPill>
              </div>
              {status === "CONNECTED" && c.accountLabel ? (
                <div className="mt-2 text-xs text-emerald-200">Connected as {c.accountLabel}</div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={() => setConnectModalOpen(true)}
          className="h-9 px-3 rounded-2xl text-xs border border-cyan-500/35 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-100"
        >
          Connect Channels
        </button>
      </div>
    </GlassCard>
  );
}
