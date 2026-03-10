// src/components/Inbox/InboxPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client";

/**
 * InboxPanel (compact)
 *
 * Goals:
 * - Fix "POST not allowed" by using best-effort mark-all-read with fallback methods.
 * - Add per-message Hide (archive) + Delete.
 * - Keep UI tight + responsive (icon buttons).
 *
 * Backend variability:
 * - Some APIs: POST /notifications/mark_all_read/
 * - Others: PATCH /notifications/mark_all_read/
 * - Others: POST /me/notifications/mark_all_read/
 * - Some: per-item PATCH {is_archived:true} or DELETE /notifications/<id>/
 *
 * If you paste your backend notifications viewset, I’ll lock it to exact routes.
 */

// Try these in order:
const MARK_ALL_READ_CANDIDATES = [
  { method: "post", url: "/notifications/mark_all_read/" },
  { method: "patch", url: "/notifications/mark_all_read/" },
  { method: "post", url: "/me/notifications/mark_all_read/" },
  { method: "patch", url: "/me/notifications/mark_all_read/" },
];

// Per-item archive fallbacks:
async function archiveNotification(id) {
  // 1) PATCH update style
  try {
    await api.patch(`/notifications/${id}/`, { is_archived: true });
    return true;
  } catch {
    // ignore
  }
  try {
    await api.patch(`/notifications/${id}/`, { archived: true });
    return true;
  } catch {
    // ignore
  }
  // 2) action endpoint style
  try {
    await api.post(`/notifications/${id}/archive/`);
    return true;
  } catch {
    // ignore
  }
  // 3) me-scoped variant
  try {
    await api.post(`/me/notifications/${id}/archive/`);
    return true;
  } catch {
    // ignore
  }
  return false;
}

async function deleteNotification(id) {
  // Most common:
  try {
    await api.delete(`/notifications/${id}/`);
    return true;
  } catch {
    // ignore
  }
  // Sometimes me-scoped:
  try {
    await api.delete(`/me/notifications/${id}/`);
    return true;
  } catch {
    // ignore
  }
  return false;
}

function safeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

function pillTone(typeOrStatus) {
  const s = String(typeOrStatus || "").toUpperCase();
  if (s.includes("TICKET")) return "bg-cyan-500/10 border-cyan-500/30 text-cyan-200";
  if (s.includes("BILL") || s.includes("INVOICE")) return "bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-200";
  if (s.includes("WARN") || s.includes("ERROR")) return "bg-rose-500/10 border-rose-500/30 text-rose-200";
  return "bg-slate-900/40 border-slate-700 text-slate-200";
}

function IconBtn({ title, tone = "slate", onClick, disabled, children }) {
  const tones = {
    slate: "bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-200",
    cyan: "bg-cyan-500/20 border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-200",
    emerald: "bg-emerald-500/15 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-200",
    fuchsia: "bg-fuchsia-500/15 border-fuchsia-500/30 hover:bg-fuchsia-500/20 text-fuchsia-200",
    rose: "bg-rose-500/15 border-rose-500/30 hover:bg-rose-500/20 text-rose-200",
    amber: "bg-amber-500/15 border-amber-500/30 hover:bg-amber-500/20 text-amber-200",
  };

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={!!disabled}
      className={
        "inline-flex items-center justify-center h-9 w-9 rounded-xl border transition select-none " +
        (tones[tone] || tones.slate) +
        (disabled ? " opacity-50 cursor-not-allowed" : "")
      }
    >
      <span className="text-[14px] leading-none">{children}</span>
    </button>
  );
}

function fmt(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "";
  }
}

export default function InboxPanel({
  title = "Inbox",
  subtitle = "Ticket updates, messages, broadcasts, reminders, and promos.",
  compact = true,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState("");

  // Controls
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("unread"); // unread | all | archived
  const [showArchived, setShowArchived] = useState(false);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      // Prefer /me/notifications if you use me-scoped routes, but you had /notifications working already.
      const r = await api.get("/notifications/");
      setItems(safeList(r.data));
    } catch (e) {
      setItems([]);
      setErr(e?.response?.data?.detail || e?.message || "Failed to load inbox");
    } finally {
      setLoading(false);
    }
  }

  async function markAllRead() {
    setErr("");
    // Try candidate routes/methods until one works
    for (const c of MARK_ALL_READ_CANDIDATES) {
      try {
        if (c.method === "post") await api.post(c.url);
        else if (c.method === "patch") await api.patch(c.url);
        await load();
        return;
      } catch (e) {
        const detail = e?.response?.data?.detail || "";
        const status = e?.response?.status;
        // If it's clearly forbidden/not found, keep trying next candidate
        if (status === 404 || status === 405) continue;
        // Some backends return 400 with method message; keep trying
        if (String(detail).toLowerCase().includes("not allowed")) continue;
        // Otherwise stop and show the error
        setErr(detail || "Failed to mark all read");
        return;
      }
    }
    setErr("Mark-all-read is not enabled on backend yet (no matching endpoint).");
  }

  async function hideOne(id) {
    setErr("");
    setBusyId(id);
    try {
      const ok = await archiveNotification(id);
      if (!ok) {
        setErr("Hide/Archive isn’t enabled on backend yet for notifications.");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function deleteOne(id) {
    setErr("");
    setBusyId(id);
    try {
      const ok = await deleteNotification(id);
      if (!ok) {
        setErr("Delete isn’t enabled on backend yet for notifications.");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    const qq = (q || "").trim().toLowerCase();

    function isArchived(x) {
      return !!(x?.is_archived || x?.archived || x?.archived_at);
    }
    function isUnread(x) {
      if (x?.is_read === false) return true;
      if (x?.read === false) return true;
      if (!x?.read_at && (x?.is_read === undefined && x?.read === undefined)) return false; // unknown
      if (!x?.read_at) return true;
      return false;
    }

    let out = list;

    if (mode === "unread") out = out.filter(isUnread);
    if (mode === "archived") out = out.filter(isArchived);
    if (mode === "all") out = showArchived ? out : out.filter((x) => !isArchived(x));

    if (qq) {
      out = out.filter((x) => {
        const blob = [
          x?.title,
          x?.subject,
          x?.body,
          x?.message,
          x?.text,
          x?.type,
          x?.kind,
          x?.metadata ? JSON.stringify(x.metadata) : "",
        ]
          .filter(Boolean)
          .join(" | ")
          .toLowerCase();
        return blob.includes(qq);
      });
    }

    return out;
  }, [items, q, mode, showArchived]);

  const unreadCount = useMemo(() => {
    return safeList(items).filter((x) => x?.is_read === false || x?.read === false || !x?.read_at).length;
  }, [items]);

  return (
    <div className={compact ? "w-full" : ""}>
      <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
        {/* Header */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-start">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="font-semibold text-lg">{title}</div>
              {unreadCount ? (
                <span className="text-[10px] px-2 py-1 rounded-full border font-semibold bg-cyan-500/10 border-cyan-500/30 text-cyan-200">
                  {unreadCount} unread
                </span>
              ) : null}
            </div>
            <div className="text-xs text-slate-400 mt-1">{subtitle}</div>
          </div>

          <div className="flex items-center justify-start sm:justify-end gap-2">
            <IconBtn title="Refresh" tone="slate" onClick={load} disabled={loading}>
              🔄
            </IconBtn>
            <IconBtn title="Mark all read" tone="cyan" onClick={markAllRead} disabled={loading}>
              ✅
            </IconBtn>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-[180px] flex items-center gap-2">
              <div className="relative w-full">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔎</div>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search inbox…"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100"
                />
              </div>
            </div>

            <IconBtn title="Unread" tone={mode === "unread" ? "cyan" : "slate"} onClick={() => setMode("unread")}>
              📩
            </IconBtn>
            <IconBtn title="All" tone={mode === "all" ? "cyan" : "slate"} onClick={() => setMode("all")}>
              📨
            </IconBtn>
            <IconBtn title="Archived" tone={mode === "archived" ? "cyan" : "slate"} onClick={() => setMode("archived")}>
              🗄️
            </IconBtn>
            <IconBtn
              title={showArchived ? "Hide archived in All" : "Show archived in All"}
              tone={showArchived ? "emerald" : "slate"}
              onClick={() => setShowArchived((v) => !v)}
            >
              🗂️
            </IconBtn>

            {q ? (
              <IconBtn title="Clear search" tone="rose" onClick={() => setQ("")}>
                ✖️
              </IconBtn>
            ) : null}
          </div>

          {err ? (
            <div className="text-sm text-red-200 bg-red-900/10 border border-red-800 rounded-xl p-3">{err}</div>
          ) : null}
        </div>

        {/* List */}
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
          {loading ? <div className="text-sm text-slate-400 p-2">Loading…</div> : null}

          {!loading && filtered.length === 0 ? (
            <div className="text-sm text-slate-400 p-2">No inbox items yet.</div>
          ) : null}

          <div className="space-y-2">
            {filtered.slice(0, compact ? 6 : 50).map((x) => {
              const id = x?.id;
              const titleText = x?.title || x?.subject || "Notification";
              const bodyText = x?.body || x?.message || x?.text || "";
              const typeText = x?.type || x?.kind || "";
              const created = x?.created_at || x?.created || x?.timestamp;

              return (
                <div
                  key={id || `${titleText}-${created}-${Math.random()}`}
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{titleText}</div>

                      {bodyText ? (
                        <div className="text-xs text-slate-300 mt-1 whitespace-pre-wrap break-words">
                          {String(bodyText).slice(0, 220)}
                          {String(bodyText).length > 220 ? "…" : ""}
                        </div>
                      ) : null}

                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {typeText ? (
                          <span className={"text-[10px] px-2 py-1 rounded-full border font-semibold " + pillTone(typeText)}>
                            {String(typeText)}
                          </span>
                        ) : null}
                        {created ? <span className="text-[11px] text-slate-500">{fmt(created)}</span> : null}
                      </div>
                    </div>

                    {/* Per-item actions */}
                    {id ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <IconBtn
                          title="Hide (archive)"
                          tone="amber"
                          onClick={() => hideOne(id)}
                          disabled={busyId === id}
                        >
                          🙈
                        </IconBtn>
                        <IconBtn
                          title="Delete"
                          tone="rose"
                          onClick={() => {
                            if (window.confirm("Delete this notification? This may be permanent.")) deleteOne(id);
                          }}
                          disabled={busyId === id}
                        >
                          🗑️
                        </IconBtn>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-3 text-[11px] text-slate-500">
          Tips: 📩 unread • 🗄️ archived • 🙈 hide moves it out of your main view • 🗑️ delete is permanent (if backend supports it)
        </div>
      </div>
    </div>
  );
}
