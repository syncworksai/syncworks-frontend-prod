import React, { useState } from "react";
import api from "../../api/client";

function Btn({ children, tone = "slate", className = "", disabled = false, ...props }) {
  const tones = {
    slate: "bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-200",
    cyan: "bg-cyan-500/20 border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-200",
    amber: "bg-amber-500/15 border-amber-500/30 hover:bg-amber-500/20 text-amber-200",
    emerald: "bg-emerald-500/15 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-200",
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
  onAfterChange,
}) {
  const archived = !!ticket?.is_archived || !!ticket?.archived_at;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  async function toggleArchive() {
    if (!ticket?.id || busy) return;
    setBusy(true);
    setErr("");
    setOk("");

    try {
      const endpoint = archived ? "unarchive" : "archive";
      await api.post(`/tickets/${ticket.id}/${endpoint}/`);
      setOk(archived ? "Ticket restored." : "Ticket archived.");
      await onAfterChange?.();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Archive action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-lg font-extrabold">Archive / Export</div>
          <div className="text-xs text-slate-400 mt-1">
            Export records or move completed tickets out of the active queue.
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

      {err ? (
        <div className="mt-3 text-xs text-red-200 bg-red-900/10 border border-red-800 rounded-2xl p-3">
          {err}
        </div>
      ) : null}

      {ok ? (
        <div className="mt-3 text-xs text-emerald-200 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3">
          {ok}
        </div>
      ) : null}

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
            Archive tickets that are done so your live workspace stays clean.
          </div>
          <div className="mt-3 flex gap-2 flex-wrap">
            <Btn tone={archived ? "emerald" : "amber"} onClick={toggleArchive} disabled={busy}>
              {busy ? "Saving…" : archived ? "Unarchive Ticket" : "Archive Ticket"}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}