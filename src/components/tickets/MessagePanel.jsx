// src/components/tickets/MessagePanel.jsx
import React, { useEffect, useRef, useState } from "react";
import api from "../../api/client";

function fmtWhen(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "";
  }
}

export default function MessagePanel({ ticketId }) {
  const [items, setItems] = useState([]);
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);

  async function load() {
    setErr("");
    try {
      const res = await api.get("/ticket-messages/", { params: { ticket: ticketId } });
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setItems(list);
      setTimeout(() => {
        try {
          listRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
        } catch {
          // ignore
        }
      }, 50);
    } catch (e) {
      setItems([]);
      setErr(e?.response?.data?.detail || "Failed to load messages");
    }
  }

  useEffect(() => {
    if (ticketId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  async function send() {
    const txt = (body || "").trim();
    if (!txt) return;
    setErr("");
    setBusy(true);
    try {
      await api.post("/ticket-messages/", { ticket: ticketId, body: txt });
      setBody("");
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Send failed");
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Messages</div>
        <button
          onClick={load}
          className="text-[11px] rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
        >
          Refresh
        </button>
      </div>

      {err ? (
        <div className="mt-3 text-xs text-red-200 bg-red-900/10 border border-red-800 rounded-xl p-2">{err}</div>
      ) : null}

      <div
        ref={listRef}
        className="mt-3 max-h-[280px] overflow-auto rounded-2xl border border-slate-800 bg-slate-950/60 p-3 space-y-2"
      >
        {items.length ? (
          items.map((m) => (
            <div key={m.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] text-slate-400">
                  {m.author_name || m.author || "SYSTEM"}
                </div>
                <div className="text-[11px] text-slate-500">{fmtWhen(m.created_at)}</div>
              </div>
              <div className="mt-2 text-sm text-slate-100 whitespace-pre-wrap">{m.body || m.message || ""}</div>
            </div>
          ))
        ) : (
          <div className="text-xs text-slate-600">No messages yet.</div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
          placeholder="Write a message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button
          onClick={send}
          disabled={busy}
          className="text-xs rounded-xl px-3 py-2 bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 disabled:opacity-60"
        >
          Send
        </button>
      </div>

      <div className="mt-2 text-[11px] text-slate-500">Tip: Ctrl+Enter to send.</div>
    </div>
  );
}
