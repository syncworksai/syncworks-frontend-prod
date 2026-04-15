import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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

function upperStatus(t) {
  return String(t?.status || "").toUpperCase();
}

function StatusPill({ status }) {
  const s = upperStatus({ status });
  const base = "text-[11px] font-bold px-2 py-1 rounded-full border whitespace-nowrap";
  if (s === "NEW") return <span className={`${base} bg-cyan-500/10 border-cyan-500/20 text-cyan-200`}>NEW</span>;
  if (s === "ASSIGNED") return <span className={`${base} bg-amber-500/10 border-amber-500/20 text-amber-200`}>ASSIGNED</span>;
  if (s === "ACCEPTED") return <span className={`${base} bg-emerald-500/10 border-emerald-500/20 text-emerald-200`}>ACCEPTED</span>;
  if (s === "SCHEDULED") return <span className={`${base} bg-sky-500/10 border-sky-500/20 text-sky-200`}>SCHEDULED</span>;
  if (s === "EN_ROUTE") return <span className={`${base} bg-indigo-500/10 border-indigo-500/20 text-indigo-200`}>EN ROUTE</span>;
  if (s === "ON_SITE") return <span className={`${base} bg-violet-500/10 border-violet-500/20 text-violet-200`}>ON SITE</span>;
  if (s === "IN_PROGRESS") return <span className={`${base} bg-indigo-500/10 border-indigo-500/20 text-indigo-200`}>IN PROGRESS</span>;
  if (s === "NEEDS_QUOTE") return <span className={`${base} bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-200`}>NEEDS QUOTE</span>;
  if (s === "QUOTED") return <span className={`${base} bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-200`}>QUOTED</span>;
  if (s === "APPROVED" || s === "AWAITING_APPROVAL") return <span className={`${base} bg-cyan-500/10 border-cyan-500/20 text-cyan-200`}>{s.replaceAll("_", " ")}</span>;
  if (s === "INVOICED") return <span className={`${base} bg-amber-500/10 border-amber-500/20 text-amber-200`}>INVOICED</span>;
  if (s === "PAID") return <span className={`${base} bg-emerald-500/10 border-emerald-500/20 text-emerald-200`}>PAID</span>;
  if (s === "COMPLETED") return <span className={`${base} bg-green-500/10 border-green-500/20 text-green-200`}>COMPLETED</span>;
  if (s === "CANCELLED") return <span className={`${base} bg-rose-500/10 border-rose-500/20 text-rose-200`}>CANCELLED</span>;
  if (s === "CLOSED") return <span className={`${base} bg-slate-500/10 border-slate-500/20 text-slate-200`}>CLOSED</span>;
  return <span className={`${base} bg-slate-500/10 border-slate-500/20 text-slate-200`}>{s || "STATUS"}</span>;
}

function SmallStat({ label, value, tone = "slate" }) {
  const tones = {
    slate: "border-slate-800 bg-slate-950/40 text-slate-100",
    cyan: "border-cyan-500/20 bg-cyan-500/10 text-cyan-100",
    fuchsia: "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-100",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
  };

  return (
    <div className={cx("rounded-3xl border p-4", tones[tone] || tones.slate)}>
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-extrabold tracking-tight">{value}</div>
    </div>
  );
}

function TicketCard({ t, onAction, mode = "new", busyId = null }) {
  const navigate = useNavigate();
  const status = upperStatus(t);
  const isBusy = String(busyId || "") === String(t.id);

  const canArchive = !t?.is_marketplace && ["PAID", "COMPLETED", "CANCELLED", "CLOSED"].includes(status);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="font-extrabold text-base">
            Ticket #{t.id} • {t.category_name || "Category"}
          </div>
          <div className="text-sm text-slate-300 mt-1">
            {t.assigned_business_name || (t.is_marketplace ? "Marketplace match" : "Assigned job")}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            📍 {t.service_address || "—"} • {t.service_zip || "—"} • radius {t.service_radius_miles ?? "—"} mi
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            Created: {t.created_at ? new Date(t.created_at).toLocaleString() : "—"}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <StatusPill status={t.status} />
          {t.is_marketplace ? (
            <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-200">
              Marketplace
            </span>
          ) : null}
          {t.is_archived ? (
            <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-300">
              Archived
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => navigate(`/tickets/${t.id}`)}
          className="text-xs rounded-2xl px-4 h-10 bg-slate-950 border border-slate-800 hover:bg-slate-900"
        >
          Open
        </button>

        {mode === "marketplace" ? (
          <>
            <button
              type="button"
              onClick={() => onAction(t.id, "accept")}
              disabled={isBusy}
              className={cx(
                "text-xs rounded-2xl px-4 h-10 border",
                isBusy
                  ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-cyan-500/15 border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-200"
              )}
            >
              {isBusy ? "Accepting..." : "Accept"}
            </button>

            <button
              type="button"
              onClick={() => onAction(t.id, "decline_marketplace")}
              disabled={isBusy}
              className={cx(
                "text-xs rounded-2xl px-4 h-10 border",
                isBusy
                  ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-rose-500/15 border-rose-500/30 hover:bg-rose-500/20 text-rose-200"
              )}
            >
              Deny
            </button>
          </>
        ) : null}

        {mode === "new" && ["NEW", "ASSIGNED"].includes(status) ? (
          <button
            type="button"
            onClick={() => onAction(t.id, "accept")}
            disabled={isBusy}
            className={cx(
              "text-xs rounded-2xl px-4 h-10 border",
              isBusy
                ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-cyan-500/15 border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-200"
            )}
          >
            {isBusy ? "Working..." : "Accept"}
          </button>
        ) : null}

        {mode === "new" && status === "ACCEPTED" ? (
          <button
            type="button"
            onClick={() => onAction(t.id, "start")}
            disabled={isBusy}
            className={cx(
              "text-xs rounded-2xl px-4 h-10 border",
              isBusy
                ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-indigo-500/15 border-indigo-500/30 hover:bg-indigo-500/20 text-indigo-200"
            )}
          >
            {isBusy ? "Working..." : "Start"}
          </button>
        ) : null}

        {mode === "new" && ["IN_PROGRESS", "ON_SITE", "EN_ROUTE"].includes(status) ? (
          <button
            type="button"
            onClick={() => onAction(t.id, "complete")}
            disabled={isBusy}
            className={cx(
              "text-xs rounded-2xl px-4 h-10 border",
              isBusy
                ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-emerald-500/15 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-200"
            )}
          >
            {isBusy ? "Working..." : "Complete"}
          </button>
        ) : null}

        {mode === "new" && !["PAID", "COMPLETED", "CANCELLED", "CLOSED"].includes(status) ? (
          <button
            type="button"
            onClick={() => onAction(t.id, "cancel")}
            disabled={isBusy}
            className={cx(
              "text-xs rounded-2xl px-4 h-10 border",
              isBusy
                ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-rose-500/15 border-rose-500/30 hover:bg-rose-500/20 text-rose-200"
            )}
          >
            {isBusy ? "Working..." : "Cancel"}
          </button>
        ) : null}

        {canArchive ? (
          <button
            type="button"
            onClick={() => onAction(t.id, "archive")}
            disabled={isBusy}
            className={cx(
              "text-xs rounded-2xl px-4 h-10 border",
              isBusy
                ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200"
            )}
          >
            {isBusy ? "Archiving..." : "Archive"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function SboTickets({ title = "Tickets Board" }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const view = String(params.get("view") || "new").toLowerCase();

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

      const mine = mineRes.status === "fulfilled" ? safeList(mineRes.value.data) : [];
      const market = marketplaceRes.status === "fulfilled" ? safeList(marketplaceRes.value.data) : [];

      setAssignedTickets(mine);
      setMarketplaceTickets(market);

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
    const assigned = assignedTickets || [];
    const market = marketplaceTickets || [];

    const NEW_STATUSES = [
      "ASSIGNED",
      "ACCEPTED",
      "SCHEDULED",
      "EN_ROUTE",
      "ON_SITE",
      "IN_PROGRESS",
      "NEEDS_QUOTE",
      "QUOTED",
      "QUOTE_REJECTED",
      "APPROVED",
      "AWAITING_APPROVAL",
      "INVOICED",
      "NEW",
    ];

    const OLD_STATUSES = ["COMPLETED", "PAID", "CANCELLED", "CLOSED"];

    return {
      marketplace: market.filter((t) => upperStatus(t) === "NEW"),
      newer: assigned.filter((t) => !t?.is_archived && NEW_STATUSES.includes(upperStatus(t))),
      old: assigned.filter((t) => t?.is_archived || OLD_STATUSES.includes(upperStatus(t))),
    };
  }, [assignedTickets, marketplaceTickets]);

  async function onAction(ticketId, action) {
    setErr("");
    setBusyId(ticketId);
    try {
      if (action === "archive") {
        setAssignedTickets((prev) =>
          prev.map((t) =>
            String(t.id) === String(ticketId)
              ? {
                  ...t,
                  is_archived: true,
                  archived_at: new Date().toISOString(),
                }
              : t
          )
        );
      } else {
        await api.post(`/tickets/${ticketId}/${action}/`, {});
        await load();
      }
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  const cards = [
    { key: "new", label: "New Tickets", count: groups.newer.length, tone: "cyan" },
    { key: "marketplace", label: "Marketplace", count: groups.marketplace.length, tone: "fuchsia" },
    { key: "old", label: "Old Tickets", count: groups.old.length, tone: "emerald" },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5 overflow-hidden relative">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.10),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.10),transparent_28%)]" />
          <div className="relative flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-2xl font-extrabold">{title}</div>
              <div className="text-sm text-slate-400 mt-1">
                Marketplace is matched-only. New tickets are active jobs. Old tickets are paid, completed, cancelled, or archived.
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={load}
                className="text-xs rounded-2xl px-4 h-10 bg-slate-950 border border-slate-800 hover:bg-slate-900"
                type="button"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          {cards.map((card) => (
            <Link
              key={card.key}
              to={`/tickets?view=${card.key}`}
              className={cx(
                "rounded-3xl border p-4 transition",
                view === card.key
                  ? card.tone === "cyan"
                    ? "border-cyan-500/30 bg-cyan-500/10"
                    : card.tone === "fuchsia"
                    ? "border-fuchsia-500/30 bg-fuchsia-500/10"
                    : "border-emerald-500/30 bg-emerald-500/10"
                  : "border-slate-800 bg-slate-950/40 hover:bg-slate-950/60"
              )}
            >
              <SmallStat label={card.label} value={card.count} tone={card.tone} />
            </Link>
          ))}
        </div>

        {err ? (
          <div className="text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-2xl p-3">
            {err}
          </div>
        ) : null}

        {loading ? <div className="text-sm text-slate-400">Loading…</div> : null}

        {view === "marketplace" ? (
          <section className="space-y-3">
            <div className="font-semibold">Marketplace</div>
            {groups.marketplace.length === 0 ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-8 text-slate-400">
                No matched marketplace tickets right now.
              </div>
            ) : (
              groups.marketplace.map((t) => (
                <TicketCard
                  key={t.id}
                  t={t}
                  onAction={onAction}
                  mode="marketplace"
                  busyId={busyId}
                />
              ))
            )}
          </section>
        ) : null}

        {view === "old" ? (
          <section className="space-y-3">
            <div className="font-semibold">Old Tickets</div>
            {groups.old.length === 0 ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-8 text-slate-400">
                No old tickets yet.
              </div>
            ) : (
              groups.old.map((t) => (
                <TicketCard key={t.id} t={t} onAction={onAction} mode="old" busyId={busyId} />
              ))
            )}
          </section>
        ) : null}

        {view === "new" ? (
          <section className="space-y-3">
            <div className="font-semibold">New Tickets</div>
            {groups.newer.length === 0 ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-8 text-slate-400">
                No active tickets right now.
              </div>
            ) : (
              groups.newer.map((t) => (
                <TicketCard key={t.id} t={t} onAction={onAction} mode="new" busyId={busyId} />
              ))
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}