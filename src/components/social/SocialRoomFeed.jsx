import React from "react";
import { BellRing, Users } from "lucide-react";

const displayName = (person) => person?.display_name || [person?.first_name, person?.last_name].filter(Boolean).join(" ") || person?.email || "SyncWorks member";

export default function SocialRoomFeed({ items, loading, groupName }) {
  if (loading && !items.length) return <div className="grid min-h-[45dvh] place-items-center text-sm text-slate-500">Loading room…</div>;
  if (!items.length) return <div className="grid min-h-[45dvh] place-items-center text-center text-sm text-slate-500"><div><Users className="mx-auto mb-3 h-8 w-8"/><div className="font-black text-slate-300">Start the room</div><div className="mt-1">Everyone active in {groupName || "this group"} will see the conversation.</div></div></div>;

  return <div className="space-y-3">{items.map((item) => {
    const announcement = item.kind === "ANNOUNCEMENT";
    return <article key={item.id} className={announcement ? "rounded-2xl border border-amber-400/25 bg-amber-400/[.08] p-4" : "rounded-2xl border border-white/10 bg-white/[.03] p-3"}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-black text-white">{displayName(item.sender_detail)}</span>
        {announcement ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-300 px-2 py-1 text-[9px] font-black uppercase tracking-[.12em] text-slate-950"><BellRing className="h-3 w-3"/>Announcement</span> : null}
        <span className="text-[10px] text-slate-600">{new Date(item.created_at).toLocaleString()}</span>
        {item.edited_at ? <span className="text-[10px] text-slate-600">edited</span> : null}
      </div>
      <div className={announcement ? "mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-amber-50" : "mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200"}>{item.body}</div>
    </article>;
  })}</div>;
}
