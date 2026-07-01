import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/client";

function fmtWhen(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function initials(name) {
  const raw = String(name || "").trim();
  if (!raw) return "S";
  const parts = raw.split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] || "S"}${parts[1]?.[0] || ""}`.toUpperCase();
}

function normalizeRole(message, isCustomerView) {
  const raw = String(
    message?.author_role ||
      message?.sender_role ||
      message?.role ||
      message?.author_type ||
      ""
  ).toUpperCase();

  const author = String(message?.author_name || message?.author || "").toUpperCase();

  if (raw.includes("SYSTEM") || author === "SYSTEM") return "system";
  if (message?.is_mine === true || message?.mine === true || message?.sent_by_me === true) {
    return "mine";
  }
  if (raw.includes("CUSTOMER") || raw.includes("PERSONAL")) {
    return isCustomerView ? "mine" : "customer";
  }
  if (
    raw.includes("BUSINESS") ||
    raw.includes("OWNER") ||
    raw.includes("MANAGER") ||
    raw.includes("DISPATCH") ||
    raw.includes("TECH")
  ) {
    return isCustomerView ? "provider" : "mine";
  }

  return isCustomerView ? "provider" : "customer";
}

function bubbleClasses(role) {
  if (role === "system") {
    return "mx-auto max-w-[92%] border-slate-700 bg-slate-900/80 text-slate-300";
  }
  if (role === "mine") {
    return "ml-auto max-w-[88%] border-cyan-300/25 bg-gradient-to-br from-cyan-500/20 to-blue-500/10";
  }
  if (role === "provider") {
    return "mr-auto max-w-[88%] border-violet-300/20 bg-violet-500/10";
  }
  return "mr-auto max-w-[88%] border-slate-700 bg-slate-900/75";
}

function authorLabel(role, author, isCustomer) {
  if (role === "system") return "SyncWorks update";
  if (role === "mine") return "You";
  if (role === "provider" && isCustomer) return author || "Service provider";
  if (role === "customer") return author || "Customer";
  return author || "Message";
}

const CUSTOMER_REPLIES = [
  "Thank you!",
  "I’m available.",
  "Please call when you arrive.",
  "Can you send an update?",
];

const PROVIDER_REPLIES = [
  "On my way.",
  "I’ve arrived.",
  "Work is in progress.",
  "The job is complete.",
];

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
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const quickReplies = useMemo(
    () => (isCustomer ? CUSTOMER_REPLIES : PROVIDER_REPLIES),
    [isCustomer]
  );

  function scrollToBottom(behavior = "smooth") {
    window.setTimeout(() => {
      try {
        const node = listRef.current;
        if (node) node.scrollTo({ top: node.scrollHeight, behavior });
      } catch {
        // no-op
      }
    }, 60);
  }

  async function load({ quiet = false } = {}) {
    setErr("");
    if (!quiet) setLoading(true);

    try {
      const res = await api.get("/ticket-messages/", {
        params: { ticket: ticketId },
      });
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setItems(list);
      scrollToBottom(quiet ? "auto" : "smooth");
    } catch (e) {
      setItems([]);
      setErr(e?.response?.data?.detail || "Failed to load messages");
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  useEffect(() => {
    if (ticketId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  async function send(textOverride = "") {
    const txt = String(textOverride || body || "").trim();
    if (!txt || busy) return;

    setErr("");
    setBusy(true);

    try {
      await api.post("/ticket-messages/", {
        ticket: ticketId,
        body: txt,
      });
      setBody("");
      await load({ quiet: true });
      inputRef.current?.focus();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Send failed");
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      send();
    }
  }

  return (
    <div
      className={`overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950/60 ${
        compact ? "p-3 sm:p-4" : "p-3 sm:p-5"
      }`}
    >
      <div className="flex items-start justify-between gap-3 px-1">
        <div>
          <div className="text-lg font-black text-white">
            {isCustomer ? "Service Chat" : title}
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-400">
            {subtitle ||
              (isCustomer
                ? "Updates, questions, arrival details, and photos stay with this request."
                : "Keep all job communication organized in one place.")}
          </div>
        </div>

        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="shrink-0 rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] font-bold text-slate-300 hover:bg-slate-900 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {isCustomer ? (
        <div className="mt-4 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.06] px-3 py-2 text-xs text-cyan-100">
          Messages are shared with the assigned provider and remain attached to this request.
        </div>
      ) : null}

      {err ? (
        <div className="mt-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
          {err}
        </div>
      ) : null}

      <div
        ref={listRef}
        className={`mt-4 space-y-3 overflow-y-auto rounded-3xl border border-slate-800 bg-[#020617] p-3 ${
          compact ? "max-h-[340px]" : "min-h-[300px] max-h-[56vh] sm:max-h-[480px]"
        }`}
      >
        {loading && !items.length ? (
          <div className="grid min-h-[220px] place-items-center text-sm text-slate-500">
            Loading conversation…
          </div>
        ) : items.length ? (
          items.map((message) => {
            const author =
              message.author_name ||
              message.sender_name ||
              message.author ||
              "SyncWorks";
            const role = normalizeRole(message, isCustomer);
            const system = role === "system";
            const label = authorLabel(role, author, isCustomer);

            return (
              <article
                key={message.id}
                className={`rounded-3xl border p-3.5 ${bubbleClasses(role)}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl border text-[11px] font-black ${
                      system
                        ? "border-slate-700 bg-slate-950 text-slate-400"
                        : role === "mine"
                        ? "border-cyan-300/25 bg-cyan-400/10 text-cyan-100"
                        : "border-violet-300/20 bg-violet-400/10 text-violet-100"
                    }`}
                  >
                    {system ? "⚙" : initials(label)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] font-black text-slate-300">
                        {label}
                      </div>
                      <time className="text-[10px] text-slate-500">
                        {fmtWhen(message.created_at)}
                      </time>
                    </div>

                    <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-100">
                      {message.body || message.message || ""}
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="grid min-h-[220px] place-items-center rounded-2xl border border-dashed border-slate-800 p-6 text-center">
            <div>
              <div className="text-3xl">💬</div>
              <div className="mt-3 text-sm font-black text-white">
                Start the conversation
              </div>
              <div className="mt-1 text-xs leading-5 text-slate-500">
                Ask a question or share an access detail for this service request.
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {quickReplies.map((reply) => (
          <button
            key={reply}
            type="button"
            onClick={() => {
              setBody(reply);
              inputRef.current?.focus();
            }}
            className="shrink-0 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-2 text-[11px] font-bold text-slate-300 hover:border-cyan-400/30 hover:text-cyan-100"
          >
            {reply}
          </button>
        ))}
      </div>

      <div className="sticky bottom-0 mt-3 rounded-3xl border border-slate-700 bg-slate-950/95 p-3 shadow-[0_-12px_40px_rgba(2,6,23,0.85)] backdrop-blur-xl">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={2}
            className="min-h-[52px] flex-1 resize-none rounded-2xl border border-slate-700 bg-[#020617] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40"
            placeholder={
              isCustomer
                ? "Message your service provider…"
                : "Write a job update…"
            }
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={onKeyDown}
          />

          <button
            type="button"
            onClick={() => send()}
            disabled={busy || !body.trim()}
            className="grid h-[52px] min-w-[58px] place-items-center rounded-2xl border border-cyan-300/35 bg-gradient-to-br from-cyan-500 to-blue-600 px-4 text-xs font-black text-white shadow-[0_0_24px_rgba(34,211,238,0.18)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "…" : "Send"}
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[10px] text-slate-600">
          <span>Ctrl or Cmd + Enter to send</span>
          <span>{body.length}/2000</span>
        </div>
      </div>
    </div>
  );
}
