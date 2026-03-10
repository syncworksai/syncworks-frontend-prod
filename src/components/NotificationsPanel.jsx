// src/components/NotificationsPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

function safeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

function fmt(dt) {
  if (!dt) return "";
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return "";
  }
}

export default function NotificationsPanel({ title = "Inbox", subtitle = "" }) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  const latest = useMemo(() => (items || []).slice(0, 10), [items]);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const r = await api.get("/notifications/");
      setItems(safeList(r.data));
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Failed to load inbox");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{title}</div>
          {subtitle ? <div className="text-xs text-slate-400 mt-1">{subtitle}</div> : null}
        </div>

        <div className="flex gap-2">
          <button
            onClick={load}
            className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
          >
            Refresh
          </button>
          <Link
            to="/notifications"
            className="text-xs rounded-xl px-3 py-2 bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-200"
          >
            View all
          </Link>
        </div>
      </div>

      {err ? (
        <div className="mt-3 text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-xl p-3">
          {err}
        </div>
      ) : null}

      {loading ? <div className="mt-3 text-sm text-slate-400">Loading…</div> : null}

      {!loading && latest.length === 0 ? (
        <div className="mt-3 text-sm text-slate-400">No notifications yet.</div>
      ) : null}

      <div className="mt-4 space-y-2">
        {latest.map((n) => (
          <div
            key={n.id}
            className={
              "rounded-2xl border p-3 " +
              (n.is_read
                ? "border-slate-800 bg-slate-900/20"
                : "border-cyan-500/20 bg-cyan-500/10")
            }
          >
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold text-sm">{n.title || "Notification"}</div>
              <div className="text-[11px] text-slate-500">{n.type || "SYSTEM"}</div>
            </div>
            {n.body ? <div className="text-xs text-slate-300 mt-1">{n.body}</div> : null}
            <div className="text-[11px] text-slate-500 mt-2">{fmt(n.created_at)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
