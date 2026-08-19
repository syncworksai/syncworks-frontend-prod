import React, { useEffect, useState } from "react";
import { CalendarDays, Mail, Plus, X } from "lucide-react";
import CalendarConnectionCard from "./CalendarConnectionCard";
import { deleteCalendarConnection, getCalendarConnections, startCalendarOAuth, syncCalendarConnection, updateCalendarConnection } from "../api/calendarConnections";

export default function CalendarConnectionsDrawer({ open, onClose, returnTo = "/customer/settings", onChanged }) {
  const [data, setData] = useState({ connections: [], providers: {} });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    try {
      const next = await getCalendarConnections();
      setData(next);
      onChanged?.(next);
    } catch (error) {
      setNotice(error?.response?.data?.detail || "Could not load connections.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (open) load(); }, [open]);

  async function connect(provider) {
    setBusy(`connect-${provider}`);
    setNotice("");
    try {
      const result = await startCalendarOAuth(provider, returnTo);
      if (result?.authorization_url) window.location.assign(result.authorization_url);
    } catch (error) {
      setNotice(error?.response?.data?.detail || `Could not connect ${provider}.`);
      setBusy("");
    }
  }

  async function patch(connection, payload) {
    setBusy(connection.id);
    try { await updateCalendarConnection(connection.id, payload); await load(); }
    catch (error) { setNotice(error?.response?.data?.detail || "Could not update connection."); }
    finally { setBusy(""); }
  }

  async function syncNow(connection) {
    setBusy(`sync-${connection.id}`);
    try {
      const result = await syncCalendarConnection(connection.id);
      const mailCount = Number(result?.personal_mail?.message_count || 0);
      const eventCopy = `Imported ${result?.imported || 0} event${result?.imported === 1 ? "" : "s"}`;
      setNotice(result?.ok ? `${eventCopy}${mailCount ? ` and refreshed ${mailCount} email summaries` : ""}.` : result?.detail || "Sync failed.");
      await load();
    } catch (error) { setNotice(error?.response?.data?.detail || "Sync failed."); }
    finally { setBusy(""); }
  }

  async function remove(connection) {
    if (!window.confirm(`Disconnect ${connection.email || connection.display_name || "this account"}?`)) return;
    try { await deleteCalendarConnection(connection.id); await load(); }
    catch (error) { setNotice(error?.response?.data?.detail || "Could not disconnect account."); }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[220] flex justify-end bg-black/70 backdrop-blur-sm" onMouseDown={onClose}>
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-cyan-400/20 bg-[#020617] p-5 text-slate-100" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">SYNC Assistant Connections</div>
            <h2 className="mt-2 text-2xl font-black text-white">Calendars & email</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Connect accounts you already use. Calendar events feed your master schedule; Outlook email can be turned on separately for Personal SYNC summaries.</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-700 bg-slate-900"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => connect("GOOGLE")} disabled={busy || data.providers?.google === false} className="rounded-3xl border border-cyan-400/25 bg-cyan-500/10 p-4 text-left disabled:opacity-45"><Plus className="h-5 w-5 text-cyan-200" /><div className="mt-3 font-black text-white">Connect Google</div><div className="mt-1 text-xs text-slate-400">Google Calendar now · Gmail permission next</div></button>
          <button type="button" onClick={() => connect("MICROSOFT")} disabled={busy || data.providers?.microsoft === false} className="rounded-3xl border border-violet-400/25 bg-violet-500/10 p-4 text-left disabled:opacity-45"><Plus className="h-5 w-5 text-violet-200" /><div className="mt-3 font-black text-white">Connect Outlook</div><div className="mt-1 text-xs text-slate-400">Calendar + optional Personal email intelligence</div></button>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4"><div className="flex items-center gap-3"><CalendarDays className="h-5 w-5 text-slate-300" /><div className="font-black text-white">Apple / iOS</div></div><div className="mt-2 text-xs leading-5 text-slate-400">Apple Calendar remains a future provider lane. SyncWorks never asks users to paste calendar passwords.</div></div>
          <div className="rounded-3xl border border-violet-400/15 bg-violet-500/[.04] p-4"><div className="flex items-center gap-3"><Mail className="h-5 w-5 text-violet-200" /><div className="font-black text-white">Email privacy</div></div><div className="mt-2 text-xs leading-5 text-slate-400">Email intelligence is opt-in per account. SYNC stores compact recent-message summaries for prioritization; sending remains an approved action.</div></div>
        </div>
        {notice ? <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100">{notice}</div> : null}
        {loading ? <div className="mt-6 text-sm text-slate-400">Loading connections…</div> : null}
        <div className="mt-6 space-y-4">{(data.connections || []).map((connection) => <CalendarConnectionCard key={connection.id} connection={connection} busy={busy} onPatch={patch} onSync={syncNow} onDelete={remove} />)}</div>
      </aside>
    </div>
  );
}
