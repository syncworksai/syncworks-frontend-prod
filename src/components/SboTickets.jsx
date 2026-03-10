// src/components/SboTickets.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";

function safeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

function StatusPill({ status }) {
  const s = String(status || "").toUpperCase();
  const base = "text-[11px] font-bold px-2 py-1 rounded-full border";
  if (s === "NEW") return <span className={`${base} bg-cyan-500/10 border-cyan-500/20 text-cyan-200`}>NEW</span>;
  if (s === "ASSIGNED") return <span className={`${base} bg-amber-500/10 border-amber-500/20 text-amber-200`}>ASSIGNED</span>;
  if (s === "ACCEPTED") return <span className={`${base} bg-emerald-500/10 border-emerald-500/20 text-emerald-200`}>ACCEPTED</span>;
  if (s === "IN_PROGRESS") return <span className={`${base} bg-indigo-500/10 border-indigo-500/20 text-indigo-200`}>IN PROGRESS</span>;
  if (s === "COMPLETED") return <span className={`${base} bg-green-500/10 border-green-500/20 text-green-200`}>COMPLETED</span>;
  if (s === "CANCELLED") return <span className={`${base} bg-rose-500/10 border-rose-500/20 text-rose-200`}>CANCELLED</span>;
  return <span className={`${base} bg-slate-500/10 border-slate-500/20 text-slate-200`}>{s || "STATUS"}</span>;
}

function TicketCard({ t, onAction }) {
  const status = String(t.status || "").toUpperCase();

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold">
            Ticket #{t.id} • {t.category_name || "Category"}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            📍 {t.service_address || "—"} • {t.service_zip || "—"} • radius {t.service_radius_miles ?? "—"}mi
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            Created: {t.created_at ? new Date(t.created_at).toLocaleString() : ""}
          </div>
        </div>
        <StatusPill status={t.status} />
      </div>

      <div className="mt-3 flex gap-2 flex-wrap">
        {(status === "NEW" || status === "ASSIGNED") ? (
          <button
            onClick={() => onAction(t.id, "accept")}
            className="text-xs rounded-xl px-3 py-2 bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-200"
          >
            Accept
          </button>
        ) : null}

        {status === "ACCEPTED" ? (
          <button
            onClick={() => onAction(t.id, "start")}
            className="text-xs rounded-xl px-3 py-2 bg-indigo-500/15 border border-indigo-500/30 hover:bg-indigo-500/20 text-indigo-200"
          >
            Start
          </button>
        ) : null}

        {status === "IN_PROGRESS" ? (
          <button
            onClick={() => onAction(t.id, "complete")}
            className="text-xs rounded-xl px-3 py-2 bg-green-500/15 border border-green-500/30 hover:bg-green-500/20 text-green-200"
          >
            Complete
          </button>
        ) : null}

        {!["COMPLETED", "CLOSED", "CANCELLED"].includes(status) ? (
          <button
            onClick={() => onAction(t.id, "cancel")}
            className="text-xs rounded-xl px-3 py-2 bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/20 text-rose-200"
          >
            Cancel
          </button>
        ) : null}

        {t.is_marketplace ? (
          <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-200">
            Marketplace
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default function SboTickets({ title = "Tickets Board" }) {
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const r = await api.get("/tickets/");
      setTickets(safeList(r.data));
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const groups = useMemo(() => {
    const list = tickets || [];
    const upper = (x) => String(x?.status || "").toUpperCase();
    return {
      marketplace: list.filter((t) => t.is_marketplace === true && upper(t) === "NEW"),
      active: list.filter((t) => ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"].includes(upper(t))),
      completed: list.filter((t) => ["COMPLETED", "CANCELLED", "CLOSED"].includes(upper(t))),
    };
  }, [tickets]);

  async function onAction(ticketId, action) {
    setErr("");
    try {
      await api.post(`/tickets/${ticketId}/${action}/`);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Action failed");
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-2xl font-bold">{title}</div>
            <div className="text-sm text-slate-400">
              Marketplace + assigned tickets. Accept → Start → Complete.
            </div>
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

        <section className="space-y-2">
          <div className="font-semibold">Marketplace</div>
          {groups.marketplace.length === 0 ? (
            <div className="text-sm text-slate-400">No marketplace tickets right now.</div>
          ) : (
            <div className="space-y-3">
              {groups.marketplace.map((t) => (
                <TicketCard key={t.id} t={t} onAction={onAction} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-2 pt-2">
          <div className="font-semibold">Active</div>
          {groups.active.length === 0 ? (
            <div className="text-sm text-slate-400">No active tickets.</div>
          ) : (
            <div className="space-y-3">
              {groups.active.map((t) => (
                <TicketCard key={t.id} t={t} onAction={onAction} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-2 pt-2">
          <div className="font-semibold">Completed / Closed</div>
          {groups.completed.length === 0 ? (
            <div className="text-sm text-slate-400">Nothing completed yet.</div>
          ) : (
            <div className="space-y-3">
              {groups.completed.map((t) => (
                <TicketCard key={t.id} t={t} onAction={onAction} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
