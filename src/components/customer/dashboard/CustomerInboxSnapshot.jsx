import React from "react";

export default function CustomerInboxSnapshot({
  unreadCount = 0,
  latestSender = "SyncWorks",
  latestMessage = "No new messages right now.",
  onOpenInbox,
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xl font-black text-slate-100">Inbox</div>
          <div className="mt-1 text-sm text-slate-400">
            Messages, ticket updates, reminders, and business replies.
          </div>
        </div>

        <span className="shrink-0 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold text-cyan-200">
          {unreadCount} unread
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
          Latest
        </div>
        <div className="mt-2 text-sm font-bold text-slate-100">
          {latestSender}
        </div>
        <div className="mt-1 text-sm text-slate-400 line-clamp-2">
          {latestMessage}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onOpenInbox}
          className="h-10 rounded-2xl border border-cyan-500/30 bg-cyan-500/12 hover:bg-cyan-500/18 text-cyan-100 text-xs font-semibold"
        >
          Open Inbox
        </button>

        <button
          type="button"
          disabled
          className="h-10 rounded-2xl border border-slate-700 bg-slate-900/50 text-slate-500 text-xs font-semibold cursor-not-allowed"
          title="Coming soon"
        >
          Quick Reply
        </button>
      </div>
    </div>
  );
}