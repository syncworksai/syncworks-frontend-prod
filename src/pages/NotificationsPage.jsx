// src/pages/NotificationsPage.jsx
import React, { useEffect, useState } from "react";
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

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const r = await api.get("/notifications/");
      setItems(safeList(r.data));
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-2xl font-bold">Notifications</div>
            <div className="text-sm text-slate-400">Everything that happened — tickets, broadcasts, billing, system.</div>
          </div>
          <button
            onClick={load}
            className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
          >
            Refresh
          </button>
        </div>

        {err ? (
          <div className="text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-xl p-3">
            {err}
          </div>
        ) : null}

        {loading ? <div className="text-sm text-slate-400">Loading…</div> : null}

        {!loading && items.length === 0 ? (
          <div className="text-sm text-slate-400">No notifications yet.</div>
        ) : null}

        <div className="grid md:grid-cols-2 gap-3">
          {items.map((n) => (
            <div key={n.id} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold">{n.title || "Notification"}</div>
                <div className="text-[11px] text-slate-500">{n.type || "SYSTEM"}</div>
              </div>

              {n.body ? <div className="text-sm text-slate-300 mt-2">{n.body}</div> : null}

              <div className="text-xs text-slate-500 mt-3 flex items-center justify-between">
                <span>{n.is_read ? "Read" : "Unread"}</span>
                <span>{fmt(n.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
