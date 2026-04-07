// src/components/SboTickets.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../api/client";

function safeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.value)) return data.value;
  return [];
}

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
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

function TicketCard({ t, onAction, marketplaceMode = false, busyId = null }) {
  const status = String(t.status || "").toUpperCase();
  const isBusy = String(busyId || "") === String(t.id);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
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
        <Link
          to={`/tickets/${t.id}`}
          className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
        >
          Open
        </Link>

        {marketplaceMode && status === "NEW" ? (
          <>
            <button
              onClick={() => onAction(t.id, "accept")}
              disabled={isBusy}
              className={cx(
                "text-xs rounded-xl px-3 py-2 border",
                isBusy
                  ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-cyan-500/15 border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-200"
              )}
            >
              {isBusy ? "Accepting..." : "Accept"}
            </button>

            <button
              onClick={() => onAction(t.id, "decline_marketplace")}
              disabled={isBusy}
              className={cx(
                "text-xs rounded-xl px-3 py-2 border",
                isBusy
                  ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-rose-500/15 border-rose-500/30 hover:bg-rose-500/20 text-rose-200"
              )}
            >
              Decline
            </button>
          </>
        ) : null}

        {!marketplaceMode && (status === "NEW" || status === "ASSIGNED") ? (
          <button
            onClick={() => onAction(t.id, "accept")}
            disabled={isBusy}
            className={cx(
              "text-xs rounded-xl px-3 py-2 border",
              isBusy
                ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-cyan-500/15 border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-200"
            )}
          >
            {isBusy ? "Working..." : "Accept"}
          </button>
        ) : null}

        {!marketplaceMode && status === "ACCEPTED" ? (
          <button
            onClick={() => onAction(t.id, "start")}
            disabled={isBusy}
            className={cx(
              "text-xs rounded-xl px-3 py-2 border",
              isBusy
                ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-indigo-500/15 border-indigo-500/30 hover:bg-indigo-500/20 text-indigo-200"
            )}
          >
            {isBusy ? "Working..." : "Start"}
          </button>
        ) : null}

        {!marketplaceMode && status === "IN_PROGRESS" ? (
          <button
            onClick={() => onAction(t.id, "complete")}
            disabled={isBusy}
            className={cx(
              "text-xs rounded-xl px-3 py-2 border",
              isBusy
                ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-green-500/15 border-green-500/30 hover:bg-green-500/20 text-green-200"
            )}
          >
            {isBusy ? "Working..." : "Complete"}
          </button>
        ) : null}

        {!marketplaceMode && !["COMPLETED", "CLOSED", "CANCELLED"].includes(status) ? (
          <button
            onClick={() => onAction(t.id, "cancel")}
            disabled={isBusy}
            className={cx(
              "text-xs rounded-xl px-3 py-2 border",
              isBusy
                ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-rose-500/15 border-rose-500/30 hover:bg-rose-500/20 text-rose-200"
            )}
          >
            {isBusy ? "Working..." : "Cancel"}
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
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const view = String(params.get("view") || "my").toLowerCase();

  const [loading, setLoading] = useState(false);
  const [assignedTickets, setAssignedTickets] = useState([]);
  const [marketplaceTickets, setMarketplaceTickets] = useState([]);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const [mineRes, marketplaceRes] = await Promise.allSettled([
        api.get("/tickets/"),
        api.get("/tickets/marketplace/"),
      ]);

      if (mineRes.status === "fulfilled") {
        setAssignedTickets(safeList(mineRes.value.data));
      } else {
        setAssignedTickets([]);
      }

      if (marketplaceRes.status === "fulfilled") {
        setMarketplaceTickets(safeList(marketplaceRes.value.data));
      } else {
        setMarketplaceTickets([]);
      }

      if (mineRes.status === "rejected" && marketplaceRes.status === "rejected") {
        const e = mineRes.reason || marketplaceRes.reason;
        setErr(e?.response?.data?.detail || e?.message || "Failed to load tickets");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    function onBizChanged() {
      load();
    }
    window.addEventListener("sw:activeBusinessChanged", onBizChanged);
    return () => window.removeEventListener("sw:activeBusinessChanged", onBizChanged);
  }, []);

  const groups = useMemo(() => {
    const upper = (x) => String(x?.status || "").toUpperCase();

    const assigned = assignedTickets || [];
    const marketplace = marketplaceTickets || [];

    return {
      marketplace: marketplace.filter((t) => upper(t) === "NEW"),
      active: assigned.filter((t) => ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"].includes(upper(t))),
      completed: assigned.filter((t) => ["COMPLETED", "CANCELLED", "CLOSED"].includes(upper(t))),
      allAssigned: assigned,
    };
  }, [assignedTickets, marketplaceTickets]);

  async function onAction(ticketId, action) {
    setErr("");
    setBusyId(ticketId);
    try {
      await api.post(`/tickets/${ticketId}/${action}/`, {});
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  const showMarketplaceOnly = view === "marketplace";
  const showMyOnly = view === "my";

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <div className="text-2xl font-bold">{title}</div>
            <div className="text-sm text-slate-400">
              Marketplace queue + assigned tickets. Accept → Start → Complete.
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Link
              to="/tickets?view=my"
              className={cx(
                "text-xs rounded-xl px-3 py-2 border",
                showMyOnly
                  ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-200"
                  : "bg-slate-950 border-slate-800 hover:bg-slate-900"
              )}
            >
              My Tickets
            </Link>

            <Link
              to="/tickets?view=marketplace"
              className={cx(
                "text-xs rounded-xl px-3 py-2 border",
                showMarketplaceOnly
                  ? "bg-fuchsia-500/15 border-fuchsia-500/30 text-fuchsia-200"
                  : "bg-slate-950 border-slate-800 hover:bg-slate-900"
              )}
            >
              Marketplace
            </Link>

            <button
              onClick={load}
              className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
            >
              Refresh
            </button>
          </div>
        </div>

        {err ? (
          <div className="text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-xl p-3">
            {err}
          </div>
        ) : null}

        {loading ? <div className="text-sm text-slate-400">Loading…</div> : null}

        {showMarketplaceOnly ? (
          <section className="space-y-2">
            <div className="font-semibold">Marketplace Queue</div>
            {groups.marketplace.length === 0 ? (
              <div className="text-sm text-slate-400">No marketplace tickets right now.</div>
            ) : (
              <div className="space-y-3">
                {groups.marketplace.map((t) => (
                  <TicketCard
                    key={t.id}
                    t={t}
                    onAction={onAction}
                    marketplaceMode
                    busyId={busyId}
                  />
                ))}
              </div>
            )}
          </section>
        ) : null}

        {showMyOnly ? (
          <>
            <section className="space-y-2">
              <div className="font-semibold">Active</div>
              {groups.active.length === 0 ? (
                <div className="text-sm text-slate-400">No active tickets.</div>
              ) : (
                <div className="space-y-3">
                  {groups.active.map((t) => (
                    <TicketCard key={t.id} t={t} onAction={onAction} busyId={busyId} />
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
                    <TicketCard key={t.id} t={t} onAction={onAction} busyId={busyId} />
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}