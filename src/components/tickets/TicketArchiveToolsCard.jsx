import React from "react";

function Btn({ children, tone = "slate", className = "", disabled = false, ...props }) {
  const tones = {
    slate: "bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-200",
    cyan: "bg-cyan-500/20 border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-200",
    amber: "bg-amber-500/15 border-amber-500/30 hover:bg-amber-500/20 text-amber-200",
  };

  return (
    <button
      className={`inline-flex items-center justify-center h-10 text-xs rounded-2xl px-4 border transition whitespace-nowrap gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${tones[tone] || tones.slate} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

export default function TicketArchiveToolsCard({
  ticket,
  ticketCode,
  onExport,
}) {
  const archived = !!ticket?.is_archived || !!ticket?.archived_at;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-lg font-extrabold">Archive / Export</div>
          <div className="text-xs text-slate-400 mt-1">
            Export works now. Archive is surfaced here and can be wired once the backend archive action is added.
          </div>
        </div>

        <span
          className={`text-[11px] px-2 py-1 rounded-full border font-semibold ${
            archived
              ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
              : "border-slate-700 bg-slate-900/40 text-slate-300"
          }`}
        >
          {archived ? "Archived" : "Active"}
        </span>
      </div>

      <div className="mt-4 grid md:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
          <div className="text-sm font-semibold">Export Ticket</div>
          <div className="text-xs text-slate-400 mt-2">
            Download a local JSON export for ops, records, or debugging.
          </div>
          <div className="mt-3">
            <Btn tone="cyan" onClick={onExport}>
              Export {ticketCode}
            </Btn>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
          <div className="text-sm font-semibold">Archive Queue</div>
          <div className="text-xs text-slate-400 mt-2">
            UI is ready. Wire backend actions like <span className="text-slate-300">/tickets/:id/archive/</span> and <span className="text-slate-300">/tickets/:id/unarchive/</span> next.
          </div>
          <div className="mt-3 flex gap-2 flex-wrap">
            <Btn tone="amber" disabled>
              {archived ? "Unarchive Ticket" : "Archive Ticket"}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}