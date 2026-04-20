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

function initials(name) {
  const raw = String(name || "").trim();
  if (!raw) return "S";
  const parts = raw.split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || "S") + (parts[1]?.[0] || "");
}

function bubbleTone(authorName, isCustomerView) {
  const who = String(authorName || "").toLowerCase();
  if (who === "system") return "border-slate-800 bg-slate-950/50";
  if (isCustomerView) return "border-cyan-500/20 bg-cyan-500/5";
  return "border-slate-800 bg-slate-950/70";
}

export default function MessagePanel({
  ticketId,
  compact = false,
  isCustomer = false,
  title = "Messages",
  subtitle = "",
}) {
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
    <div className={`rounded-3xl border border-slate-800 bg-slate-950/40 ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-lg font-extrabold text-slate-100">{title}</div>
          <div className="text-xs text-slate-400 mt-1">
            {subtitle || (isCustomer ? "Use messages for updates, questions, and access details." : "Keep all job communication organized in one place.")}
          </div>
        </div>

        <button
          onClick={load}
          className="text-[11px] rounded-2xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
        >
          Refresh
        </button>
      </div>

      {err ? (
        <div className="mt-3 text-xs text-red-200 bg-red-900/10 border border-red-800 rounded-2xl p-3">{err}</div>
      ) : null}

      <div
        ref={listRef}
        className={`mt-4 overflow-auto rounded-3xl border border-slate-800 bg-slate-950/60 p-3 space-y-3 ${compact ? "max-h-[320px]" : "max-h-[420px]"}`}
      >
        {items.length ? (
          items.map((m) => {
            const author = m.author_name || m.author || "SYSTEM";
            const isSystem = String(author).toUpperCase() === "SYSTEM";

            return (
              <div
                key={m.id}
                className={`rounded-2xl border p-3 ${bubbleTone(author, isCustomer)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 shrink-0 rounded-2xl border border-slate-700 bg-slate-900 flex items-center justify-center text-[11px] font-bold text-slate-300">
                    {isSystem ? "⚙" : initials(author)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-[11px] font-semibold text-slate-300">
                        {author}
                      </div>
                      <div className="text-[11px] text-slate-500">{fmtWhen(m.created_at)}</div>
                    </div>

                    <div className="mt-2 text-sm text-slate-100 whitespace-pre-wrap break-words">
                      {m.body || m.message || ""}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-500">
            No messages yet.
          </div>
        )}
      </div>

      <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-950/30 p-3">
        <div className="flex gap-2">
          <input
            className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm"
            placeholder={isCustomer ? "Send a message to the business…" : "Write a message…"}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <button
            onClick={send}
            disabled={busy}
            className="text-xs rounded-2xl px-4 py-3 bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 disabled:opacity-60"
          >
            {busy ? "Sending…" : "Send"}
          </button>
        </div>

        <div className="mt-2 text-[11px] text-slate-500">
          Tip: Ctrl+Enter to send.
        </div>
      </div>
    </div>
  );
}