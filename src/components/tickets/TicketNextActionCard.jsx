import React from "react";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

const toneClasses = {
  cyan: "border-cyan-400/40 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25",
  emerald: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25",
  amber: "border-amber-400/40 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25",
  fuchsia: "border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-100 hover:bg-fuchsia-500/25",
  sky: "border-sky-400/40 bg-sky-500/15 text-sky-100 hover:bg-sky-500/25",
  rose: "border-rose-400/40 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25",
  slate: "border-slate-700 bg-slate-950/70 text-slate-200 hover:bg-slate-900",
};

function ActionButton({ action, primary = false, onAction, disabled }) {
  if (!action) return null;
  return (
    <button
      type="button"
      onClick={() => onAction?.(action)}
      disabled={disabled}
      className={cx(
        "inline-flex min-h-11 items-center justify-center rounded-2xl border px-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50",
        primary && "w-full sm:w-auto sm:min-w-48",
        toneClasses[action.tone] || toneClasses.cyan
      )}
    >
      {action.label}
    </button>
  );
}

export default function TicketNextActionCard({ workflow, onAction, busy = false }) {
  if (!workflow) return null;

  const progress = workflow.progress || {};
  const percent = Math.max(0, Math.min(100, Number(progress.percent || 0)));
  const secondary = Array.isArray(workflow.secondary_actions) ? workflow.secondary_actions : [];

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-cyan-500/25 bg-[linear-gradient(135deg,rgba(8,47,73,0.68),rgba(30,41,59,0.82),rgba(88,28,135,0.30))] p-5 shadow-[0_0_60px_rgba(34,211,238,0.10)] md:p-6">
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl" />

      <div className="relative">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200">
              Current step
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
              {workflow.phase_label || workflow.status_label || "Ticket update"}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 font-bold text-cyan-100">
                {workflow.waiting_on_label || "Next action pending"}
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-950/50 px-3 py-1 text-slate-300">
                {workflow.context === "OPPORTUNITY" ? "Marketplace opportunity" : workflow.status_label}
              </span>
            </div>
          </div>

          <div className="w-full lg:max-w-xs">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
              <span>Service progress</span>
              <span>{progress.current || 0} of {progress.total || 0}</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-950/80 ring-1 ring-slate-700/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500 transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <ActionButton action={workflow.primary_action} primary onAction={onAction} disabled={busy} />
          {secondary.slice(0, 3).map((action) => (
            <ActionButton key={action.key} action={action} onAction={onAction} disabled={busy} />
          ))}
        </div>

        {!workflow.primary_action && workflow.blocked_reasons?.primary ? (
          <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-100">
            {workflow.blocked_reasons.primary}
          </div>
        ) : null}
      </div>
    </section>
  );
}