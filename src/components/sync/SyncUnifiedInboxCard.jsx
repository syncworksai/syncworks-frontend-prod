import React, { useEffect, useState } from "react";
import { ExternalLink, Mail, MessageSquareMore, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { getSyncAssistantInboxState } from "../../api/jarvisProduct";

function when(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function SyncUnifiedInboxCard() {
  const nav = useNavigate();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setState(await getSyncAssistantInboxState());
    } catch {
      setState(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const syncworks = state?.syncworks || {};
  const external = state?.external_email || {};
  const conversations = syncworks.conversations || [];
  const messages = external.messages || [];

  return (
    <section className="rounded-[1.75rem] border border-violet-400/15 bg-slate-950/55 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[.18em] text-violet-200">SYNC Inbox intelligence</div>
          <h2 className="mt-1 text-xl font-black text-white">Internal conversations + connected email</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">SyncWorks Inbox stays first. Connected external mail fills the gap until more conversations move inside SyncWorks.</p>
        </div>
        <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-xs font-black text-slate-300"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="text-xs font-black uppercase text-slate-500">Total unread</div><div className="mt-1 text-2xl font-black text-white">{state?.total_unread || 0}</div></div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="text-xs font-black uppercase text-slate-500">Needs attention</div><div className="mt-1 text-2xl font-black text-white">{state?.total_high_priority || 0}</div></div>
        <button type="button" onClick={() => nav("/customer/settings")} className="rounded-2xl border border-violet-400/20 bg-violet-500/[.06] p-4 text-left"><div className="text-xs font-black uppercase text-violet-200">External email</div><div className="mt-1 font-black text-white">{external.available ? `${external.accounts?.length || 0} inbox connected` : "Turn email intelligence on"}</div><div className="mt-1 text-xs text-slate-500">Outlook available now · Gmail next</div></button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/[.02] p-4">
          <div className="flex items-center gap-2 text-sm font-black text-white"><MessageSquareMore className="h-4 w-4 text-cyan-200" />SyncWorks Inbox</div>
          <div className="mt-3 space-y-2">
            {conversations.length ? conversations.slice(0, 4).map((row) => (
              <button key={row.id} type="button" onClick={() => nav(row.url || "/customer/inbox")} className="flex w-full items-start justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-left">
                <div className="min-w-0"><div className="truncate text-sm font-black text-white">{row.title}</div><div className="mt-1 text-xs text-slate-400">{row.ticket_code} · {row.status}{row.provider ? ` · ${row.provider}` : ""}</div>{row.latest_message ? <div className="mt-1 line-clamp-2 text-xs text-slate-500">{row.latest_message}</div> : null}</div>
                {(row.unread || row.needs_attention) ? <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-400" /> : <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-slate-600" />}
              </button>
            )) : <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-500">No active Personal SyncWorks conversations.</div>}
          </div>
          <button type="button" onClick={() => nav("/customer/inbox")} className="mt-3 text-xs font-black text-cyan-200">Open SyncWorks Inbox →</button>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[.02] p-4">
          <div className="flex items-center gap-2 text-sm font-black text-white"><Mail className="h-4 w-4 text-violet-200" />Connected email</div>
          <div className="mt-3 space-y-2">
            {messages.length ? messages.slice(0, 4).map((row) => (
              <div key={`${row.mailbox}-${row.id}`} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-black text-white">{row.subject}</div><div className="mt-1 truncate text-xs text-slate-400">{row.sender_name || row.sender_email} · {when(row.received_at)}</div></div>{row.priority === "high" ? <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-1 text-[10px] font-black text-amber-100">Important</span> : !row.is_read ? <span className="h-2.5 w-2.5 rounded-full bg-violet-400" /> : null}</div>
                {row.preview ? <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{row.preview}</div> : null}
              </div>
            )) : <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-500">No external email snapshot yet. Connect Outlook and turn on Email intelligence in Settings, then Sync now.</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
