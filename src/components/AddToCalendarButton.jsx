// src/components/AddToCalendarButton.jsx
import React, { useMemo, useState } from "react";
import api from "../api/client";
import {
  buildEventFromTicket,
  googleCalendarUrl,
  outlookWebUrl,
  downloadICS,
} from "../utils/calendar";

/**
 * Production behavior:
 * - If user has connected calendar(s), we call backend to SYNC event (create/update + store external event id)
 * - If not connected, fallback to Google URL + Outlook URL + ICS download (still useful)
 *
 * Props:
 * - ticket (required)
 * - compact (default true for inline)
 */
export default function AddToCalendarButton({ ticket, compact = true }) {
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState("");

  const evt = useMemo(() => buildEventFromTicket(ticket || {}), [ticket]);

  const gUrl = useMemo(() => googleCalendarUrl(evt), [evt]);
  const oUrl = useMemo(() => outlookWebUrl(evt), [evt]);

  if (!ticket) return null;

  async function syncNow() {
    setMsg("");
    setSyncing(true);
    try {
      const r = await api.post(`/tickets/${ticket.id}/calendar_sync/`, {});
      const ok = !!r?.data?.ok;
      const updated = r?.data?.updated || 0;
      const created = r?.data?.created || 0;
      if (ok) setMsg(`Synced ✅ (created ${created}, updated ${updated})`);
      else setMsg("Sync failed");
    } catch (e) {
      const data = e?.response?.data;
      const detail = data?.detail || (typeof data === "string" ? data : null) || "Sync failed";
      setMsg(detail);
    } finally {
      setSyncing(false);
      setTimeout(() => setMsg(""), 3500);
    }
  }

  return (
    <div className={compact ? "flex gap-2 flex-wrap items-center" : "rounded-2xl border border-slate-800 bg-slate-950/40 p-4"}>
      <button
        onClick={syncNow}
        disabled={syncing}
        className={
          "inline-flex items-center justify-center h-9 text-xs rounded-xl px-3 border transition whitespace-nowrap " +
          "bg-cyan-500/20 border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-200 disabled:opacity-60"
        }
        title="Sync to connected calendar(s). If not connected, use links below."
      >
        {syncing ? "Syncing…" : "Sync Calendar"}
      </button>

      <a
        href={gUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center h-9 text-xs rounded-xl px-3 border transition whitespace-nowrap bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-200"
        title="Fallback: Google calendar link"
      >
        Google Link
      </a>

      <a
        href={oUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center h-9 text-xs rounded-xl px-3 border transition whitespace-nowrap bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-200"
        title="Fallback: Outlook web link"
      >
        Outlook Link
      </a>

      <button
        onClick={() => downloadICS({ ...evt, uid: `syncworks-ticket-${ticket?.id || "x"}` })}
        className="inline-flex items-center justify-center h-9 text-xs rounded-xl px-3 border transition whitespace-nowrap bg-emerald-500/15 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-200"
        title="Fallback: download .ics for Apple/Outlook Desktop"
      >
        Download .ICS
      </button>

      {msg ? (
        <span className="text-[11px] px-2 py-1 rounded-lg border border-slate-700 bg-slate-900/40 text-slate-200">
          {msg}
        </span>
      ) : null}
    </div>
  );
}
