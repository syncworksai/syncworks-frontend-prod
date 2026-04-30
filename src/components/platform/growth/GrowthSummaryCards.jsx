import React from "react";

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
    <span className={`text-[11px] px-2 py-1 rounded-full border ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
}

export default function GrowthSummaryCards({
  campaigns,
  conversations,
  activityFeed,
  fmtDateTime,
  toneFromStatus,
}) {
  return (
    <div className="grid xl:grid-cols-3 gap-4">
      <GlassCard title="Campaigns" right="read-only">
        <div className="space-y-3">
          {campaigns.map((c, idx) => (
            <div key={c.id || idx} className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-slate-100 truncate">{c.name || `Campaign #${idx + 1}`}</div>
                <StatusPill tone={toneFromStatus(c.status)}>{c.status || "Unknown"}</StatusPill>
              </div>
              <div className="mt-2 text-xs text-slate-400">Channel: {c.channel || "—"} • Reach: {c.reach ?? "—"}</div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard title="Conversation inbox preview" right="read-only">
        <div className="space-y-3">
          {conversations.map((cv, idx) => (
            <div key={cv.id || idx} className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-slate-100 truncate">{cv.subject || `Conversation #${idx + 1}`}</div>
                <StatusPill tone={toneFromStatus(cv.status)}>{cv.status || "Open"}</StatusPill>
              </div>
              <div className="mt-2 text-xs text-slate-400 truncate">{cv.preview || "No preview available."}</div>
              <div className="mt-1 text-[11px] text-slate-500">Last activity: {fmtDateTime(cv.updated_at || cv.created_at)}</div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard title="Automation events" right="activity feed">
        <div className="space-y-3">
          {activityFeed.map((ev, idx) => (
            <div key={ev.id || idx} className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-slate-100">{ev.title || "Automation Event"}</div>
                <StatusPill tone={toneFromStatus(ev.status || ev.level)}>{ev.status || ev.level || "Info"}</StatusPill>
              </div>
              <div className="mt-1 text-xs text-slate-400">{ev.description || ev.message || "No description provided."}</div>
              <div className="mt-1 text-[11px] text-slate-500">{fmtDateTime(ev.created_at || ev.timestamp)}</div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}