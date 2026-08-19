import React from "react";
import { Mail, RefreshCw, Trash2 } from "lucide-react";

const CADENCES = [
  ["LIVE", "Fastest automatic (~5 min)"],
  ["FIVE_MIN", "Every 5 minutes"],
  ["FIFTEEN_MIN", "Every 15 minutes"],
  ["HOURLY", "Hourly"],
  ["DAILY", "Daily"],
  ["MANUAL", "Manual only"],
];

export default function CalendarConnectionCard({ connection, busy, onPatch, onSync, onDelete }) {
  const calendars = connection.calendars || [];
  const toggleCalendar = (calendarId, selected) => onPatch(connection, {
    calendars: calendars.map((row) => row.id === calendarId ? { ...row, selected } : row),
  });
  const destinations = new Set((connection.mail_destinations || []).map((value) => String(value).toUpperCase()));
  const personalMailEnabled = Boolean(connection.mail_enabled) && destinations.has("PERSONAL");

  const togglePersonalMail = (enabled) => {
    const next = new Set(destinations);
    if (enabled) next.add("PERSONAL");
    else next.delete("PERSONAL");
    onPatch(connection, {
      mail_enabled: enabled || next.size > 0,
      mail_destinations: [...next],
    });
  };

  return (
    <div className="rounded-[1.75rem] border border-slate-800 bg-slate-950/75 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-300">Connected</div>
          <div className="mt-1 font-black text-white">{connection.display_name || connection.email || connection.provider}</div>
          <div className="text-xs text-slate-400">{connection.email} · {connection.provider === "MICROSOFT" ? "Outlook / Microsoft" : "Google"}</div>
        </div>
        <button type="button" onClick={() => onDelete(connection)} className="grid h-10 w-10 place-items-center rounded-xl border border-rose-400/20 bg-rose-500/10 text-rose-200"><Trash2 className="h-4 w-4" /></button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-slate-400">Automatic sync
          <select value={connection.sync_cadence || "HOURLY"} onChange={(event) => onPatch(connection, { sync_cadence: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">
            {CADENCES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm">
          <input type="checkbox" checked={connection.enabled !== false} onChange={(event) => onPatch(connection, { enabled: event.target.checked })} />
          Sync enabled
        </label>
      </div>

      {connection.provider === "MICROSOFT" ? (
        <div className="mt-4 rounded-2xl border border-violet-400/20 bg-violet-500/[.06] p-3">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-violet-200" />
            <div className="min-w-0 flex-1">
              <div className="font-black text-white">Use this Outlook inbox with SYNC Assistant</div>
              <div className="mt-1 text-xs leading-5 text-slate-400">When on, SYNC can summarize recent sender, subject, preview, unread state, and likely high-priority messages. Sending still requires a separate approved action.</div>
              <label className="mt-3 flex items-center gap-2 text-sm font-bold text-violet-100">
                <input type="checkbox" checked={personalMailEnabled} onChange={(event) => togglePersonalMail(event.target.checked)} />
                Email intelligence on
              </label>
              {connection.mail_last_synced_at ? <div className="mt-2 text-[11px] text-slate-500">Email last checked: {new Date(connection.mail_last_synced_at).toLocaleString()}</div> : null}
              {connection.mail_last_error ? <div className="mt-2 rounded-xl border border-amber-400/20 bg-amber-500/10 p-2 text-xs text-amber-100">{connection.mail_last_error} If this account was connected before email permissions were added, reconnect Outlook once.</div> : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-3 text-xs leading-5 text-slate-500">Google Calendar is connected. Gmail intelligence uses a separate Google mail permission and is the next provider lane.</div>
      )}

      <div className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Calendars SYNC Assistant can read</div>
      <div className="mt-2 space-y-2">
        {calendars.map((calendar) => (
          <label key={calendar.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm">
            <span className="truncate text-slate-200">{calendar.name}{calendar.primary ? " · Primary" : ""}</span>
            <input type="checkbox" checked={calendar.selected !== false} onChange={(event) => toggleCalendar(calendar.id, event.target.checked)} />
          </label>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => onSync(connection)} disabled={busy === `sync-${connection.id}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-4 text-xs font-black text-cyan-100"><RefreshCw className={`h-4 w-4 ${busy === `sync-${connection.id}` ? "animate-spin" : ""}`} />Sync now</button>
        <span className="text-[11px] text-slate-500">Last sync: {connection.last_synced_at ? new Date(connection.last_synced_at).toLocaleString() : "Not yet"}</span>
      </div>
      {connection.last_error ? <div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-500/10 p-2 text-xs text-rose-100">{connection.last_error}</div> : null}
    </div>
  );
}
