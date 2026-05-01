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

function StatusPill({ children, tone = "slate", cx }) {
  const tones = {
    slate: "bg-slate-500/10 border-slate-500/20 text-slate-200",
    cyan: "bg-cyan-500/10 border-cyan-500/20 text-cyan-200",
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-200",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-200",
    rose: "bg-rose-500/10 border-rose-500/20 text-rose-200",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-200",
  };

  return (
    <span className={cx("text-[11px] px-2 py-1 rounded-full border", tones[tone] || tones.slate)}>
      {children}
    </span>
  );
}

export default function GrowthLeadPipelineCard({
  pipelineGroups,
  leadStatuses,
  statusFilter,
  setStatusFilter,
  patchLeadStatus,
  busyLeadIds,
  isDemoMode,
  cx,
  toneFromStatus,
  sourceTone,
  fmtDateTime,
}) {
  const EDITABLE_STATUSES = ["NEW", "QUALIFIED", "NURTURING", "WON", "LOST"];

  return (
    <GlassCard title="Lead pipeline" right={isDemoMode ? "demo mode • read-only backend" : "live mode"}>
      <div className="flex flex-wrap gap-2">
        {leadStatuses.map((s) => (
          <button key={s} type="button" onClick={() => setStatusFilter(s)} className={cx("h-8 px-3 rounded-2xl text-xs border transition", statusFilter === s ? "border-cyan-500/35 bg-cyan-500/15 text-cyan-100" : "border-slate-800 bg-slate-950/55 hover:bg-slate-900/50 text-slate-300")}>
            {s}
          </button>
        ))}
      </div>
      <div className="mt-4 grid md:grid-cols-2 xl:grid-cols-5 gap-3">
        {pipelineGroups.map((group) => (
          <div key={group.key} className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold text-slate-100">{group.key}</div>
              <StatusPill tone={toneFromStatus(group.key)} cx={cx}>{group.items.length}</StatusPill>
            </div>
            <div className="mt-3 space-y-2">
              {group.items.map((l, idx) => {
                const current = String(l.status || "").toUpperCase();
                const selectValue = EDITABLE_STATUSES.includes(current) ? current : "NEW";
                return (
                  <div key={l.id || l.lead_id || `${group.key}-${idx}`} className="rounded-xl border border-slate-800 bg-slate-950/70 p-2">
                    <div className="font-semibold text-sm text-slate-100">{l.name || l.email || `Lead #${idx + 1}`}</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      <StatusPill tone={sourceTone(l.source)} cx={cx}>{l.source || "Manual"}</StatusPill> • Last: {fmtDateTime(l.updated_at || l.created_at)}
                    </div>
                    <div className="mt-2">
                      <select value={selectValue} disabled={!isDemoMode && !!busyLeadIds[String(l.id || l.lead_id)]} onChange={(e) => patchLeadStatus(l, e.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-200">
                        {EDITABLE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}