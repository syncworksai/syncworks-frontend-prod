import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";

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
  return String(t?.status || t || "").toUpperCase();
}

function statusLabel(status) {
  const s = upperStatus(status);
  return (
    {
      NEW: "New",
      ASSIGNED: "Assigned",
      ACCEPTED: "Accepted",
      SCHEDULED: "Scheduled",
      EN_ROUTE: "En Route",
      ON_SITE: "On Site",
      IN_PROGRESS: "In Progress",
      NEEDS_QUOTE: "Needs Quote",
      QUOTED: "Quoted",
      QUOTE_REJECTED: "Quote Rejected",
      APPROVED: "Approved",
      AWAITING_APPROVAL: "Awaiting Approval",
      COMPLETED: "Completed",
      INVOICED: "Invoiced",
      PAID: "Paid",
      CANCELLED: "Cancelled",
      CLOSED: "Closed",
    }[s] || s || "Status"
  );
}

function makeTicketCode(ticket) {
  if (ticket?.ticket_code) return ticket.ticket_code;
  const num = Number(ticket?.id || 0);
  if (!num) return "DT-000000";
  const prefix = ticket?.is_marketplace ? "MP" : "DT";
  return `${prefix}-${String(num).padStart(6, "0")}`;
}

function ticketLocationLine(t) {
  const address = String(t?.service_address || "").trim();
  const city = String(t?.service_city || t?.city || "").trim();
  const state = String(t?.service_state || t?.state || "").trim();
  const zip = String(t?.service_zip || "").trim();

  const cityState = [city, state].filter(Boolean).join(", ");
  return [address, cityState, zip].filter(Boolean).join(" • ") || "No service location";
}

function StatusPill({ status }) {
  const s = upperStatus(status);
  const base = "text-[11px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap";
  if (s === "NEW") return <span className={`${base} bg-cyan-500/10 border-cyan-500/20 text-cyan-200`}>NEW</span>;
  if (s === "ASSIGNED") return <span className={`${base} bg-amber-500/10 border-amber-500/20 text-amber-200`}>ASSIGNED</span>;
  if (s === "ACCEPTED") return <span className={`${base} bg-violet-500/10 border-violet-500/20 text-violet-200`}>ACCEPTED</span>;
  if (s === "SCHEDULED") return <span className={`${base} bg-sky-500/10 border-sky-500/20 text-sky-200`}>SCHEDULED</span>;
  if (s === "EN_ROUTE") return <span className={`${base} bg-indigo-500/10 border-indigo-500/20 text-indigo-200`}>EN ROUTE</span>;
  if (s === "ON_SITE") return <span className={`${base} bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-200`}>ON SITE</span>;
  if (s === "IN_PROGRESS") return <span className={`${base} bg-cyan-500/10 border-cyan-500/20 text-cyan-200`}>IN PROGRESS</span>;
  if (s === "NEEDS_QUOTE") return <span className={`${base} bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-200`}>NEEDS QUOTE</span>;
  if (s === "QUOTED") return <span className={`${base} bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-200`}>QUOTED</span>;
  if (s === "APPROVED" || s === "AWAITING_APPROVAL") return <span className={`${base} bg-cyan-500/10 border-cyan-500/20 text-cyan-200`}>{s.replaceAll("_", " ")}</span>;
  if (s === "INVOICED") return <span className={`${base} bg-amber-500/10 border-amber-500/20 text-amber-200`}>INVOICED</span>;
  if (s === "PAID") return <span className={`${base} bg-emerald-500/10 border-emerald-500/20 text-emerald-200`}>PAID</span>;
  if (s === "COMPLETED") return <span className={`${base} bg-emerald-500/10 border-emerald-500/20 text-emerald-200`}>COMPLETED</span>;
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

function roleLabel(role) {
  const raw = String(role || "").trim();
  if (!raw) return "Team Member";
  return raw
    .toLowerCase()
    .split("_")
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}

function displayMemberName(member) {
  const full =
    `${member?.user?.first_name || ""} ${member?.user?.last_name || ""}`.trim() ||
    member?.user_name ||
    member?.name ||
    member?.user_email ||
    member?.user?.email ||
    member?.email ||
    `Member #${member?.id || ""}`;
  return full;
}

const STATUS_CHANGE_OPTIONS = [
  "NEW",
  "ASSIGNED",
  "ACCEPTED",
  "SCHEDULED",
  "EN_ROUTE",
  "ON_SITE",
  "IN_PROGRESS",
  "NEEDS_QUOTE",
  "QUOTED",
  "APPROVED",
  "AWAITING_APPROVAL",
  "COMPLETED",
  "INVOICED",
  "PAID",
  "CANCELLED",
  "CLOSED",
];

function TicketCard({
  t,
  onAction,
  onAssign,
  onStatusChange,
  mode = "new",
  busyId = null,
  members = [],
}) {
  const navigate = useNavigate();
  const status = upperStatus(t);
  const ticketCode = makeTicketCode(t);
  const isBusy = String(busyId || "") === String(t.id);

  const [assignValue, setAssignValue] = useState("");
  const [statusValue, setStatusValue] = useState(status);

  useEffect(() => {
    const assignedUserId = String(t?.assigned_member || t?.assigned_member_id || "");
    const found = (members || []).find(
      (m) => String(m?.user || m?.user_id || m?.user?.id || "") === assignedUserId
    );
    setAssignValue(found ? String(found.id) : "");
    setStatusValue(status);
  }, [members, status, t?.assigned_member, t?.assigned_member_id]);

  const assignedDisplay = useMemo(() => {
    const assignedUserId = String(t?.assigned_member || t?.assigned_member_id || "");
    const found = (members || []).find(
      (m) => String(m?.user || m?.user_id || m?.user?.id || "") === assignedUserId
    );
    return found ? `${displayMemberName(found)} • ${roleLabel(found?.role)}` : "Unassigned";
  }, [members, t]);

  const canArchive = !t?.is_marketplace && ["PAID", "COMPLETED", "CANCELLED", "CLOSED"].includes(status);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-extrabold text-base">{ticketCode}</div>
            <StatusPill status={t.status} />
            {t.is_marketplace ? (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-200">
                Marketplace
              </span>
            ) : null}
            {t.is_archived ? (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-300">
                Archived
              </span>
            ) : null}
          </div>

          <div className="mt-2 text-sm font-semibold text-slate-100 line-clamp-1">
            {t.category_name || "Category"}
          </div>

          <div className="mt-1 text-xs text-slate-400 line-clamp-2">
            {ticketLocationLine(t)}
          </div>

          <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px] text-slate-500">
            <span>Assigned: {assignedDisplay}</span>
            <span>•</span>
            <span>{t.created_at ? new Date(t.created_at).toLocaleString() : "—"}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/tickets/${t.id}`)}
          className="text-xs rounded-2xl px-4 h-10 bg-slate-950 border border-slate-800 hover:bg-slate-900"
        >
          Open
        </button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
          <div className="text-[11px] text-slate-400">Assign Tech / Employee</div>
          <div className="mt-2 flex gap-2 flex-col sm:flex-row">
            <select
              className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-100"
              value={assignValue}
              onChange={(e) => setAssignValue(e.target.value)}
              disabled={isBusy}
            >
              <option value="">Select team member…</option>
              {(members || []).map((m) => (
                <option key={m.id} value={String(m.id)}>
                  {displayMemberName(m)} • {roleLabel(m.role)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => assignValue && onAssign(t.id, assignValue)}
              disabled={isBusy || !assignValue}
              className={cx(
                "text-xs rounded-2xl px-4 h-12 border",
                isBusy || !assignValue
                  ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-sky-500/15 border-sky-500/30 hover:bg-sky-500/20 text-sky-200"
              )}
            >
              {isBusy ? "Saving…" : "Assign"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
          <div className="text-[11px] text-slate-400">Status Change</div>
          <div className="mt-2 flex gap-2 flex-col sm:flex-row">
            <select
              className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-100"
              value={statusValue}
              onChange={(e) => setStatusValue(e.target.value)}
              disabled={isBusy}
            >
              {STATUS_CHANGE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => statusValue && onStatusChange(t.id, statusValue)}
              disabled={isBusy || !statusValue || statusValue === status}
              className={cx(
                "text-xs rounded-2xl px-4 h-12 border",
                isBusy || !statusValue || statusValue === status
                  ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-fuchsia-500/15 border-fuchsia-500/30 hover:bg-fuchsia-500/20 text-fuchsia-200"
              )}
            >
              {isBusy ? "Updating…" : "Update"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-2 flex-wrap">
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
              {isBusy ? "Accepting…" : "Accept"}
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
            {isBusy ? "Working…" : "Accept"}
          </button>
        ) : null}

        {mode === "new" && status === "ACCEPTED" ? (
          <button
            type="button"
            onClick={() => onAction(t.id, "schedule")}
            disabled={isBusy}
            className={cx(
              "text-xs rounded-2xl px-4 h-10 border",
              isBusy
                ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-amber-500/15 border-amber-500/30 hover:bg-amber-500/20 text-amber-200"
            )}
          >
            {isBusy ? "Working…" : "Schedule"}
          </button>
        ) : null}

        {mode === "new" && status === "SCHEDULED" ? (
          <button
            type="button"
            onClick={() => onAction(t.id, "en-route")}
            disabled={isBusy}
            className={cx(
              "text-xs rounded-2xl px-4 h-10 border",
              isBusy
                ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-sky-500/15 border-sky-500/30 hover:bg-sky-500/20 text-sky-200"
            )}
          >
            {isBusy ? "Working…" : "En Route"}
          </button>
        ) : null}

        {mode === "new" && status === "EN_ROUTE" ? (
          <button
            type="button"
            onClick={() => onAction(t.id, "on-site")}
            disabled={isBusy}
            className={cx(
              "text-xs rounded-2xl px-4 h-10 border",
              isBusy
                ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-fuchsia-500/15 border-fuchsia-500/30 hover:bg-fuchsia-500/20 text-fuchsia-200"
            )}
          >
            {isBusy ? "Working…" : "On Site"}
          </button>
        ) : null}

        {mode === "new" && ["ACCEPTED", "SCHEDULED", "EN_ROUTE", "ON_SITE", "APPROVED"].includes(status) ? (
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
            {isBusy ? "Working…" : "Start"}
          </button>
        ) : null}

        {mode === "new" && ["IN_PROGRESS", "ON_SITE", "EN_ROUTE", "SCHEDULED"].includes(status) ? (
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
            {isBusy ? "Working…" : "Complete"}
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
            {isBusy ? "Working…" : "Cancel"}
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
            {isBusy ? "Archiving…" : "Archive"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function SboTickets({ title = "Tickets Board" }) {
  const location = useLocation();
  const { activeBusinessId } = useAuth();
  const params = new URLSearchParams(location.search);
  const view = String(params.get("view") || "new").toLowerCase();

  const [loading, setLoading] = useState(false);
  const [assignedTickets, setAssignedTickets] = useState([]);
  const [marketplaceTickets, setMarketplaceTickets] = useState([]);
  const [members, setMembers] = useState([]);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [search, setSearch] = useState("");

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const [mineRes, marketplaceRes, membersRes] = await Promise.allSettled([
        api.get("/tickets/"),
        api.get("/tickets/marketplace/"),
        activeBusinessId ? api.get(`/businesses/${activeBusinessId}/members/`) : Promise.resolve({ data: [] }),
      ]);

      const mine = mineRes.status === "fulfilled" ? safeList(mineRes.value.data) : [];
      const market = marketplaceRes.status === "fulfilled" ? safeList(marketplaceRes.value.data) : [];
      const team = membersRes.status === "fulfilled" ? safeList(membersRes.value.data) : [];

      setAssignedTickets(mine);
      setMarketplaceTickets(market);
      setMembers(team);

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
  }, [activeBusinessId]);

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

  const visibleTickets = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    const match = (t) => {
      if (!q) return true;
      const haystack = [
        String(t?.id || ""),
        String(t?.ticket_code || ""),
        makeTicketCode(t),
        String(t?.category_name || ""),
        String(t?.service_address || ""),
        String(t?.service_city || t?.city || ""),
        String(t?.service_state || t?.state || ""),
        String(t?.service_zip || ""),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    };

    return {
      marketplace: groups.marketplace.filter(match),
      newer: groups.newer.filter(match),
      old: groups.old.filter(match),
    };
  }, [groups, search]);

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

  async function onAssign(ticketId, memberId) {
    setErr("");
    setBusyId(ticketId);
    try {
      await api.post(`/tickets/${ticketId}/assign_member/`, {
        business_member_id: Number(memberId),
      });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to assign team member");
    } finally {
      setBusyId(null);
    }
  }

  async function onStatusChange(ticketId, status) {
    setErr("");
    setBusyId(ticketId);
    try {
      await api.post(`/tickets/${ticketId}/set-status/`, { status });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to update status");
    } finally {
      setBusyId(null);
    }
  }

  const cards = [
    { key: "new", label: "Active Tickets", count: visibleTickets.newer.length, tone: "cyan" },
    { key: "marketplace", label: "Marketplace", count: visibleTickets.marketplace.length, tone: "fuchsia" },
    { key: "old", label: "Old Tickets", count: visibleTickets.old.length, tone: "emerald" },
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
                Search by ticket number, category, address, city, state, or ZIP. Change assignment and status right here.
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

          <div className="relative mt-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ticket #, DT-000006, category, address, city, state, zip..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-500/40"
            />
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
            {visibleTickets.marketplace.length === 0 ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-8 text-slate-400">
                No matched marketplace tickets right now.
              </div>
            ) : (
              visibleTickets.marketplace.map((t) => (
                <TicketCard
                  key={t.id}
                  t={t}
                  onAction={onAction}
                  onAssign={onAssign}
                  onStatusChange={onStatusChange}
                  mode="marketplace"
                  busyId={busyId}
                  members={members}
                />
              ))
            )}
          </section>
        ) : null}

        {view === "old" ? (
          <section className="space-y-3">
            <div className="font-semibold">Old Tickets</div>
            {visibleTickets.old.length === 0 ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-8 text-slate-400">
                No old tickets yet.
              </div>
            ) : (
              visibleTickets.old.map((t) => (
                <TicketCard
                  key={t.id}
                  t={t}
                  onAction={onAction}
                  onAssign={onAssign}
                  onStatusChange={onStatusChange}
                  mode="old"
                  busyId={busyId}
                  members={members}
                />
              ))
            )}
          </section>
        ) : null}

        {view === "new" ? (
          <section className="space-y-3">
            <div className="font-semibold">Active Tickets</div>
            {visibleTickets.newer.length === 0 ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-8 text-slate-400">
                No active tickets right now.
              </div>
            ) : (
              visibleTickets.newer.map((t) => (
                <TicketCard
                  key={t.id}
                  t={t}
                  onAction={onAction}
                  onAssign={onAssign}
                  onStatusChange={onStatusChange}
                  mode="new"
                  busyId={busyId}
                  members={members}
                />
              ))
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}