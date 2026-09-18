import React, { useEffect, useRef, useState } from "react";
import { RefreshCw, Send, Trash2 } from "lucide-react";

import { deleteGroupMessage, getGroupMessages, sendGroupMessage } from "../../api/social";

const nameOf = (row) => row?.author_detail?.display_name || row?.author_detail?.email || "Member";

export default function TeamChatPanel({ groupId, userId, canManage = false, bare = false, title = "Team chat", noun = "team" }) {
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  async function load({ quiet = false } = {}) {
    if (!quiet) setError("");
    try {
      const rows = await getGroupMessages(groupId);
      setMessages(Array.isArray(rows) ? rows : []);
    } catch (err) {
      if (!quiet) setError(err?.response?.data?.detail || "Team chat could not load.");
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load({ quiet: true }), 8000);
    return () => window.clearInterval(timer);
  }, [groupId]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [messages.length]);

  async function submit(event) {
    event.preventDefault();
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    setError("");
    try {
      await sendGroupMessage({ group: Number(groupId), body: text });
      setBody("");
      await load({ quiet: true });
    } catch (err) {
      setError(err?.response?.data?.detail || "Message could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(message) {
    if (!message?.id) return;
    setBusy(true);
    try {
      await deleteGroupMessage(message.id);
      await load({ quiet: true });
    } catch (err) {
      setError(err?.response?.data?.detail || "Message could not be removed.");
    } finally {
      setBusy(false);
    }
  }

  const shell = bare
    ? ""
    : "rounded-[1.35rem] border border-white/10 bg-[#07111f]/95 p-3.5";

  return (
    <section className={shell}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-black text-white">{title}</h2>
          <p className="mt-0.5 text-[10px] text-slate-500">Visible to active members of this Social group.</p>
        </div>
        <button type="button" onClick={() => load()} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-slate-400">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {error ? <div className="mt-2 rounded-lg border border-rose-400/20 bg-rose-400/10 p-2 text-[10px] text-rose-100">{error}</div> : null}

      <div className="mt-3 max-h-[22rem] space-y-2 overflow-y-auto pr-1">
        {messages.map((message) => {
          const mine = Number(message.author) === Number(userId);
          const removable = mine || canManage;
          return (
            <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[88%] rounded-2xl border px-3 py-2 ${mine ? "border-cyan-300/20 bg-cyan-300/10" : "border-white/10 bg-white/[.035]"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[9px] font-black text-slate-300">{mine ? "You" : nameOf(message)}</span>
                  <span className="shrink-0 text-[8px] text-slate-600">{new Date(message.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                </div>
                <div className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-4 text-slate-100">{message.body}</div>
                {removable ? (
                  <button type="button" disabled={busy} onClick={() => remove(message)} className="mt-1 inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wide text-slate-500">
                    <Trash2 className="h-3 w-3" /> Remove
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
        {!messages.length ? <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-[10px] text-slate-500">Start the {noun} conversation.</div> : null}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          value={body}
          maxLength={2000}
          onChange={(event) => setBody(event.target.value)}
          placeholder={`Message the ${noun}…`}
          className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 text-[16px] text-white outline-none focus:border-cyan-400/40 sm:text-xs"
        />
        <button type="submit" disabled={busy || !body.trim()} className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-300 text-slate-950 disabled:opacity-40">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </section>
  );
}
