// src/components/NotificationsBell.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

function BellIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 22a2.2 2.2 0 0 0 2.2-2.2h-4.4A2.2 2.2 0 0 0 12 22Z" fill="currentColor" opacity="0.9" />
      <path
        d="M18 16.8H6c.7-1.1 1.2-2.2 1.2-3.6V10a4.8 4.8 0 0 1 9.6 0v3.2c0 1.4.5 2.5 1.2 3.6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M9.1 6.2a3.6 3.6 0 0 1 5.8 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}

function XIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function safeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Best-effort resolver for "where should this notification go?"
 * ✅ Preferred backend field: notification.target_path (string route like "/customer/tickets/12")
 * Fallback heuristics for common fields: url/path/route, ticket_id, invoice_id, support_request_id, etc.
 */
function resolveTargetPath(n) {
  const pickStr = (...keys) => {
    for (const k of keys) {
      const v = n?.[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  };

  // ✅ ideal fields you can add in backend later
  const direct = pickStr("target_path", "path", "route", "url", "action_url", "link", "href");
  if (direct.startsWith("/")) return direct;

  // common ids
  const ticketId = n?.ticket_id || n?.ticket || n?.ticketId || n?.entity_id;
  const invoiceId = n?.invoice_id || n?.invoice || n?.invoiceId;
  const supportId = n?.support_request_id || n?.support_request || n?.supportId;

  // entity_type based routing (if you add it later)
  const et = String(n?.entity_type || n?.type || n?.kind || "").toUpperCase();

  if (et.includes("TICKET") && ticketId) return `/customer/tickets/${ticketId}`;
  if (et.includes("INVOICE") && invoiceId) return `/customer?tab=invoices`;
  if (et.includes("SUPPORT") && supportId) return `/platform?tab=support`;

  // heuristic fallback (works now if you pass ticket_id)
  if (ticketId) return `/customer/tickets/${ticketId}`;
  if (invoiceId) return `/customer?tab=invoices`;
  if (supportId) return `/platform?tab=support`;

  // last resort
  return "/customer?tab=inbox";
}

/**
 * Mark read / dismiss helpers:
 * We attempt a few endpoint shapes so you don't have to match exactly today.
 * Once you confirm your backend supports one, we can simplify.
 */
async function markOneRead(id) {
  if (!id) return;

  // Try PATCH /notifications/:id/
  try {
    await api.patch(`/notifications/${id}/`, { is_read: true, read: true });
    return;
  } catch {}

  // Try POST /notifications/:id/mark_read/
  try {
    await api.post(`/notifications/${id}/mark_read/`);
    return;
  } catch {}

  // Try POST /notifications/mark_read/ with id payload
  try {
    await api.post(`/notifications/mark_read/`, { id });
    return;
  } catch {}

  // If backend doesn't support read yet, we still allow UI dismissal (local-only).
}

async function markAllRead(ids) {
  const cleanIds = (ids || []).filter(Boolean);

  // Try POST /notifications/mark_all_read/
  try {
    await api.post(`/notifications/mark_all_read/`);
    return;
  } catch {}

  // Try POST /notifications/mark_read_bulk/
  try {
    await api.post(`/notifications/mark_read_bulk/`, { ids: cleanIds });
    return;
  } catch {}

  // fallback: patch a handful (avoid hammering)
  for (const id of cleanIds.slice(0, 30)) {
    // eslint-disable-next-line no-await-in-loop
    await markOneRead(id);
  }
}

export default function NotificationsBell() {
  const nav = useNavigate();

  const btnRef = useRef(null);
  const popRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);

  const [pos, setPos] = useState({ top: 0, left: 0, width: 420, ready: false });

  const unreadCount = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    return list.filter((n) => !(n?.read || n?.is_read)).length;
  }, [items]);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const r = await api.get("/notifications/");
      setItems(safeList(r.data));
    } catch (e) {
      setItems([]);
      setErr(e?.response?.data?.detail || "Notifications not available yet.");
    } finally {
      setLoading(false);
    }
  }

  function computePosition() {
    const el = btnRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();

    const pad = 12;
    const vw = window.innerWidth || 1200;
    const vh = window.innerHeight || 800;

    const desiredW = 460;
    const width = clamp(desiredW, 320, Math.min(560, vw - pad * 2));

    const estimatedH = 560;

    const belowTop = r.bottom + 10;
    const aboveTop = r.top - 10 - estimatedH;

    const useAbove = belowTop + estimatedH > vh - pad && aboveTop > pad;

    const top = useAbove ? Math.max(pad, r.top - 10 - estimatedH) : Math.min(vh - pad - 60, belowTop);

    const left = clamp(r.right - width, pad, vw - width - pad);

    setPos({ top, left, width, ready: true });
  }

  useEffect(() => {
    if (!open) return;
    computePosition();

    function onMove() {
      computePosition();
    }

    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;

    load();

    function onDocDown(e) {
      const b = btnRef.current;
      const p = popRef.current;
      if (!b || !p) return;
      if (b.contains(e.target)) return;
      if (!p.contains(e.target)) setOpen(false);
    }

    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function dismissOne(n) {
    const id = n?.id;
    // optimistic UI: remove now
    setItems((prev) => (Array.isArray(prev) ? prev.filter((x) => x?.id !== id) : []));
    try {
      await markOneRead(id);
    } catch {
      // ignore (UI already removed)
    }
  }

  async function handleClickNotification(n) {
    const id = n?.id;
    const target = resolveTargetPath(n);

    // mark read in background (optimistic)
    setItems((prev) =>
      (Array.isArray(prev) ? prev : []).map((x) => (x?.id === id ? { ...x, is_read: true, read: true } : x))
    );

    try {
      await markOneRead(id);
    } catch {
      // ignore
    }

    setOpen(false);
    nav(target);
  }

  async function clearAll() {
    const ids = (items || []).map((n) => n?.id).filter(Boolean);
    if (!ids.length) return;

    setClearing(true);
    // optimistic: clear immediately
    setItems([]);

    try {
      await markAllRead(ids);
    } catch {
      // ignore
    } finally {
      setClearing(false);
    }
  }

  const popover = open ? (
    <div
      ref={popRef}
      className="fixed z-[99999] rounded-3xl border border-slate-700 bg-slate-950 shadow-[0_0_90px_rgba(0,0,0,0.75)] overflow-hidden"
      style={{ top: pos.top, left: pos.left, width: pos.width }}
      role="dialog"
      aria-label="Notifications"
    >
      {/* header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold text-slate-100 text-base">Notifications</div>
            <div className="text-xs text-slate-300 mt-1">Updates, reminders, and ticket activity.</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearAll}
              disabled={clearing || loading || !items?.length}
              className="text-[12px] px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900 hover:bg-slate-800 transition text-slate-100 disabled:opacity-50"
              title="Clear all (mark read)"
            >
              {clearing ? "Clearing…" : "Clear"}
            </button>
            <button
              type="button"
              onClick={load}
              className="text-[12px] px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900 hover:bg-slate-800 transition text-slate-100"
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {/* body */}
      <div className="max-h-[440px] overflow-auto">
        {err ? (
          <div className="p-4">
            <div className="text-sm text-amber-100 bg-amber-900/20 border border-amber-700/30 rounded-2xl p-3">
              {err}
            </div>
            <div className="mt-3 text-xs text-slate-300">
              Tip: Open{" "}
              <button
                className="underline text-cyan-200"
                onClick={() => {
                  setOpen(false);
                  nav("/customer?tab=inbox");
                }}
              >
                Inbox
              </button>{" "}
              for messages.
            </div>
          </div>
        ) : null}

        {!err && !loading && (!items || items.length === 0) ? (
          <div className="p-4 text-sm text-slate-200">No notifications.</div>
        ) : null}

        {!err && items?.length ? (
          <div className="p-3 space-y-2">
            {items.slice(0, 50).map((n, idx) => {
              const isRead = !!(n?.read || n?.is_read);
              const title = n?.title || n?.subject || "Notification";
              const body = n?.body || n?.message || n?.text || "—";

              return (
                <div
                  key={n?.id || idx}
                  className={[
                    "rounded-2xl border p-3 transition",
                    isRead
                      ? "border-slate-800 bg-slate-950/70 hover:bg-slate-900/50"
                      : "border-cyan-500/25 bg-cyan-500/10 hover:bg-cyan-500/15",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* clickable content */}
                    <button
                      type="button"
                      onClick={() => handleClickNotification(n)}
                      className="min-w-0 text-left flex-1"
                      title="Open"
                    >
                      <div className="font-semibold text-sm text-slate-100 truncate">{title}</div>
                      <div className="text-sm text-slate-200 mt-1 leading-snug break-words">{body}</div>
                    </button>

                    {/* right-side actions */}
                    <div className="shrink-0 flex items-center gap-2">
                      <span
                        className={[
                          "text-[10px] px-2 py-1 rounded-full border",
                          isRead
                            ? "border-slate-700 bg-slate-900/60 text-slate-200"
                            : "border-cyan-400/40 bg-cyan-400/20 text-cyan-100",
                        ].join(" ")}
                      >
                        {isRead ? "Read" : "New"}
                      </span>

                      {/* ✅ dismiss "X" */}
                      <button
                        type="button"
                        onClick={() => dismissOne(n)}
                        className="h-7 w-7 rounded-full border border-slate-700 bg-slate-900/70 hover:bg-slate-800 text-slate-200 flex items-center justify-center"
                        title="Dismiss"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {n?.created_at ? (
                    <div className="text-[11px] text-slate-400 mt-2">{new Date(n.created_at).toLocaleString()}</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            nav("/customer");
          }}
          className="flex-1 h-10 rounded-2xl border border-slate-700 bg-slate-900 hover:bg-slate-800 transition text-xs text-slate-100"
        >
          Customer Home
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            nav("/customer/tickets");
          }}
          className="flex-1 h-10 rounded-2xl border border-cyan-500/35 bg-cyan-500/20 hover:bg-cyan-500/28 transition text-xs text-cyan-100"
        >
          Orders
        </button>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
        className="relative h-10 w-10 rounded-2xl border border-slate-800 bg-slate-950/55 text-slate-300 hover:text-white hover:border-transparent hover:bg-slate-900/60 transition flex items-center justify-center"
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount ? (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-cyan-500 text-[11px] font-extrabold text-slate-950 flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? createPortal(popover, document.body) : null}
    </>
  );
}