import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";
import { useAuth } from "../auth/AuthContext";

function cx(...p) {
  return p.filter(Boolean).join(" ");
}

function safeResults(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

const STATUSES = [
  "NEW",
  "ASSIGNED",
  "ACCEPTED",
  "SCHEDULED",
  "EN_ROUTE",
  "ON_SITE",
  "IN_PROGRESS",
  "AWAITING_APPROVAL",
  "COMPLETED",
  "INVOICED",
  "PAID",
  "CANCELLED",
];

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

function isAssigned(t) {
  return !!(t?.assigned_business || t?.assigned_business_id || t?.business || t?.business_id);
}

function isMarketplace(t) {
  return !!t?.is_marketplace;
}

function statusLabel(s) {
  const u = String(s || "").toUpperCase();
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
      APPROVED: "Approved",
      AWAITING_APPROVAL: "Awaiting Approval",
      COMPLETED: "Completed",
      INVOICED: "Invoiced",
      PAID: "Paid",
      CANCELLED: "Cancelled",
      CLOSED: "Closed",
    }[u] || u || "Status"
  );
}

function statusTone(s) {
  const u = String(s || "").toUpperCase();
  if (["PAID"].includes(u)) return "emerald";
  if (["COMPLETED", "INVOICED"].includes(u)) return "cyan";
  if (["CANCELLED"].includes(u)) return "rose";
  if (["IN_PROGRESS", "ON_SITE", "EN_ROUTE"].includes(u)) return "amber";
  if (["SCHEDULED", "ACCEPTED"].includes(u)) return "fuchsia";
  return "slate";
}

function Pill({ children, tone = "slate" }) {
  const m = {
    slate: "border-slate-800 bg-slate-950/40 text-slate-200",
    cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
    fuchsia: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-200",
    sky: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  };
  return (
    <span className={cx("inline-flex items-center px-2 py-1 rounded-full border text-[11px] font-semibold", m[tone] || m.slate)}>
      {children}
    </span>
  );
}

function SmallBtn({ children, tone = "slate", className = "", ...props }) {
  const tones = {
    slate: "bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-200",
    cyan: "bg-cyan-500/15 border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-200",
    rose: "bg-rose-500/15 border-rose-500/30 hover:bg-rose-500/20 text-rose-200",
    fuchsia: "bg-fuchsia-500/15 border-fuchsia-500/30 hover:bg-fuchsia-500/20 text-fuchsia-200",
    emerald: "bg-emerald-500/15 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-200",
    amber: "bg-amber-500/15 border-amber-500/30 hover:bg-amber-500/20 text-amber-200",
    sky: "bg-sky-500/15 border-sky-500/30 hover:bg-sky-500/20 text-sky-200",
  };
  return (
    <button
      className={cx(
        "h-9 px-3 rounded-xl border text-[11px] font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed",
        tones[tone] || tones.slate,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function FieldLabel({ children }) {
  return <div className="text-[11px] text-slate-500 mb-1">{children}</div>;
}

function makeTicketCode(ticket) {
  if (ticket?.ticket_code) return ticket.ticket_code;
  const num = Number(ticket?.id || 0);
  if (!num) return "DT-000000";
  const prefix = ticket?.is_marketplace ? "MP" : "DT";
  return `${prefix}-${String(num).padStart(6, "0")}`;
}

function locationLine(ticket) {
  const address = String(ticket?.service_address || "").trim();
  const city = String(ticket?.service_city || ticket?.city || "").trim();
  const state = String(ticket?.service_state || ticket?.state || "").trim();
  const zip = String(ticket?.service_zip || "").trim();
  return [address, [city, state].filter(Boolean).join(", "), zip].filter(Boolean).join(" • ");
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

function parseLockError(e) {
  const d = e?.response?.data;
  const status = e?.response?.status;

  const detail = typeof d?.detail === "string" ? d.detail : "";
  const lock_reason = d?.lock_reason || d?.lockReason || null;
  const business_id = d?.business_id || d?.businessId || null;

  const looksLocked =
    status === 423 ||
    (typeof detail === "string" && detail.toLowerCase().includes("locked")) ||
    !!lock_reason;

  if (!looksLocked) return null;

  return {
    locked: true,
    lock_reason: lock_reason || "LOCKED",
    business_id: business_id || null,
    detail: detail || "Business account is locked. Update billing or submit an unlock request.",
  };
}

function BoardTicketCard({
  ticket,
  members,
  busyId,
  onAction,
  onAssign,
  onStatusChange,
  view,
  isSboLike,
  locked,
}) {
  const navigate = useNavigate();
  const ticketCode = makeTicketCode(ticket);
  const status = String(ticket?.status || "").toUpperCase();
  const tone = statusTone(status);
  const mp = isMarketplace(ticket);
  const asg = isAssigned(ticket);
  const showMpActions = view === "marketplace" && isSboLike && mp && !asg && !locked;
  const isBusy = String(busyId || "") === String(ticket.id);

  const [assignValue, setAssignValue] = useState("");
  const [statusValue, setStatusValue] = useState(status);

  useEffect(() => {
    const assignedUserId = String(ticket?.assigned_member || ticket?.assigned_member_id || "");
    const found = (members || []).find(
      (m) => String(m?.user || m?.user_id || m?.user?.id || "") === assignedUserId
    );
    setAssignValue(found ? String(found.id) : "");
    setStatusValue(status);
  }, [members, status, ticket?.assigned_member, ticket?.assigned_member_id]);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-base font-extrabold text-slate-100">{ticketCode}</div>
            <Pill tone={tone}>{statusLabel(status)}</Pill>
            {mp ? <Pill tone="fuchsia">Marketplace</Pill> : <Pill tone="slate">Direct</Pill>}
            {asg ? <Pill tone="emerald">Assigned</Pill> : <Pill tone="amber">Unassigned</Pill>}
          </div>

          <div className="mt-2 text-sm font-semibold text-slate-100 truncate">
            {ticket?.category_path || ticket?.category_name || ticket?.title || "Ticket"}
          </div>

          <div className="mt-1 text-xs text-slate-400 break-words">
            {locationLine(ticket) || "No service location"}
          </div>

          <div className="mt-2 text-[11px] text-slate-500">
            {ticket?.sms_allowed ? "Allows text messaging" : "In app or phone call"} • {ticket?.created_at ? new Date(ticket.created_at).toLocaleString() : "—"}
          </div>
        </div>

        <Link
          to={`/tickets/${ticket.id}`}
          className="inline-flex items-center justify-center h-10 px-4 rounded-2xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-xs font-semibold"
        >
          Open
        </Link>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
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

            <SmallBtn
              tone="sky"
              className="h-12 px-4"
              disabled={isBusy || !assignValue}
              onClick={() => onAssign(ticket.id, assignValue)}
            >
              {isBusy ? "Saving…" : "Assign"}
            </SmallBtn>
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

            <SmallBtn
              tone="fuchsia"
              className="h-12 px-4"
              disabled={isBusy || !statusValue || statusValue === status}
              onClick={() => onStatusChange(ticket.id, statusValue)}
            >
              {isBusy ? "Updating…" : "Update"}
            </SmallBtn>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        {showMpActions ? (
          <>
            <SmallBtn tone="cyan" onClick={() => onAction(ticket.id, "accept")} disabled={isBusy}>
              {isBusy ? "..." : "Accept"}
            </SmallBtn>
            <SmallBtn tone="rose" onClick={() => onAction(ticket.id, "decline_marketplace")} disabled={isBusy}>
              {isBusy ? "..." : "Deny"}
            </SmallBtn>
          </>
        ) : (
          <>
            {["NEW", "ASSIGNED"].includes(status) ? (
              <SmallBtn tone="cyan" onClick={() => onAction(ticket.id, "accept")} disabled={isBusy}>
                {isBusy ? "..." : "Accept"}
              </SmallBtn>
            ) : null}

            {status === "ACCEPTED" ? (
              <SmallBtn tone="amber" onClick={() => onAction(ticket.id, "schedule")} disabled={isBusy}>
                {isBusy ? "..." : "Schedule"}
              </SmallBtn>
            ) : null}

            {status === "SCHEDULED" ? (
              <SmallBtn tone="sky" onClick={() => onAction(ticket.id, "en-route")} disabled={isBusy}>
                {isBusy ? "..." : "En Route"}
              </SmallBtn>
            ) : null}

            {status === "EN_ROUTE" ? (
              <SmallBtn tone="fuchsia" onClick={() => onAction(ticket.id, "on-site")} disabled={isBusy}>
                {isBusy ? "..." : "On Site"}
              </SmallBtn>
            ) : null}

            {["ACCEPTED", "SCHEDULED", "EN_ROUTE", "ON_SITE", "APPROVED"].includes(status) ? (
              <SmallBtn tone="cyan" onClick={() => onAction(ticket.id, "start")} disabled={isBusy}>
                {isBusy ? "..." : "Start"}
              </SmallBtn>
            ) : null}

            {["IN_PROGRESS", "ON_SITE", "EN_ROUTE", "SCHEDULED", "ACCEPTED"].includes(status) ? (
              <SmallBtn tone="emerald" onClick={() => onAction(ticket.id, "complete")} disabled={isBusy}>
                {isBusy ? "..." : "Complete"}
              </SmallBtn>
            ) : null}

            {!["PAID", "COMPLETED", "CANCELLED", "CLOSED"].includes(status) ? (
              <SmallBtn tone="rose" onClick={() => onAction(ticket.id, "cancel")} disabled={isBusy}>
                {isBusy ? "..." : "Cancel"}
              </SmallBtn>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

export default function TicketsBoard() {
  const nav = useNavigate();
  const { mode, activeBusinessId } = useAuth();
  const [params, setParams] = useSearchParams();

  const isCustomer = mode === "CUSTOMER";
  const isSboLike = mode === "SBO" || mode === "EMPLOYEE" || mode === "PROPERTY_MGR" || mode === "PM";

  const view = params.get("view") || "all";
  const defaultViewMode = view === "marketplace" ? "queue" : "table";
  const [viewMode, setViewMode] = useState(defaultViewMode);

  useEffect(() => {
    setViewMode(view === "marketplace" ? "queue" : "table");
  }, [view]);

  const [items, setItems] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [billing, setBilling] = useState(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [source, setSource] = useState("ALL");
  const [assigned, setAssigned] = useState("ALL");
  const [sort, setSort] = useState("NEWEST");
  const [actingId, setActingId] = useState(null);

  const locked = !!billing?.is_locked;
  const lockReason = billing?.lock_reason || "LOCKED";
  const bizId = useMemo(() => String(activeBusinessId || "").trim(), [activeBusinessId]);

  function setView(next) {
    setParams((p) => {
      p.set("view", next);
      return p;
    });
  }

  function goCreate() {
    if (isCustomer) nav("/customer/new-request");
    else nav("/tickets/new");
  }

  const loadBilling = useCallback(async () => {
    try {
      const res = await api.get("/billing/status/");
      setBilling(res.data || null);
    } catch {
      setBilling(null);
    }
  }, []);

  const loadMembers = useCallback(async () => {
    if (!activeBusinessId || !isSboLike) {
      setMembers([]);
      return;
    }
    try {
      const res = await api.get(`/businesses/${activeBusinessId}/members/`);
      setMembers(safeResults(res.data));
    } catch {
      setMembers([]);
    }
  }, [activeBusinessId, isSboLike]);

  const openSetupCard = useCallback(async () => {
    setErr("");
    try {
      let res = null;
      try {
        res = await api.post("/billing/setup-card/", {});
      } catch {
        res = await api.get("/billing/setup-card/");
      }
      const url = res?.data?.url || res?.data?.checkout_url || res?.data?.checkoutUrl;
      if (url) {
        window.location.href = url;
        return;
      }
      setErr("No Stripe checkout URL returned from /billing/setup-card/.");
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to open card setup.");
    }
  }, []);

  const submitUnlockRequest = useCallback(async () => {
    setErr("");
    try {
      await api.post("/billing/unlock-request/", {
        message: `Unlock request from TicketsBoard. Business ${bizId || "—"} is locked (${lockReason}). Billing updated / requesting review.`,
      });
      await loadBilling();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to submit unlock request.");
    }
  }, [bizId, lockReason, loadBilling]);

  async function load() {
    setErr("");
    setLoading(true);

    try {
      if (!isCustomer && isSboLike) {
        await loadBilling();
        await loadMembers();
      }

      if (!isCustomer && isSboLike && view === "marketplace" && billing?.is_locked) {
        setItems([]);
        setErr("Marketplace is blocked while your business is locked. Fix billing to continue.");
        setLoading(false);
        return;
      }

      let url = "/tickets/";
      if (!isCustomer && isSboLike && view === "marketplace") url = "/tickets/marketplace/";

      const res = await api.get(url);
      setItems(safeResults(res.data));
    } catch (e) {
      setItems([]);
      const lock = parseLockError(e);
      if (lock) {
        await loadBilling();
        setErr(lock.detail);
        window.dispatchEvent(new CustomEvent("sw:billingLocked", { detail: lock }));
      } else {
        setErr(e?.response?.data?.detail || "Failed to load tickets");
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
  }, [view, mode, activeBusinessId]);

  async function onAction(ticketId, action) {
    setErr("");
    setActingId(ticketId);
    try {
      await api.post(`/tickets/${ticketId}/${action}/`, {});
      await load();
    } catch (e) {
      const lock = parseLockError(e);
      if (lock) {
        await loadBilling();
        setErr(lock.detail);
        window.dispatchEvent(new CustomEvent("sw:billingLocked", { detail: lock }));
      } else {
        setErr(e?.response?.data?.detail || e?.message || "Action failed");
      }
    } finally {
      setActingId(null);
    }
  }

  async function onAssign(ticketId, memberId) {
    setErr("");
    setActingId(ticketId);
    try {
      await api.post(`/tickets/${ticketId}/assign_member/`, {
        business_member_id: Number(memberId),
      });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to assign team member");
    } finally {
      setActingId(null);
    }
  }

  async function onStatusChange(ticketId, nextStatus) {
    setErr("");
    setActingId(ticketId);
    try {
      await api.post(`/tickets/${ticketId}/set-status/`, { status: nextStatus });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to update status");
    } finally {
      setActingId(null);
    }
  }

  const filtered = useMemo(() => {
    const text = (q || "").trim().toLowerCase();
    let list = [...(items || [])];

    if (!isCustomer && isSboLike) {
      if (view === "my") list = list.filter((t) => isAssigned(t));
      if (view === "marketplace") list = list.filter((t) => isMarketplace(t) && !isAssigned(t));
    }

    if (status !== "ALL") {
      list = list.filter((t) => String(t?.status || "").toUpperCase() === status);
    }

    if (source === "DIRECT") list = list.filter((t) => !isMarketplace(t));
    if (source === "MARKETPLACE") list = list.filter((t) => isMarketplace(t));

    if (assigned === "ASSIGNED") list = list.filter((t) => isAssigned(t));
    if (assigned === "UNASSIGNED") list = list.filter((t) => !isAssigned(t));

    if (text) {
      list = list.filter((t) => {
        const blob = [
          t?.id,
          t?.ticket_code,
          makeTicketCode(t),
          t?.title,
          t?.status,
          t?.category_path,
          t?.category_name,
          t?.service_zip,
          t?.service_address,
          t?.service_city,
          t?.service_state,
          t?.city,
          t?.state,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return blob.includes(text);
      });
    }

    list.sort((a, b) => {
      const da = a?.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b?.created_at ? new Date(b.created_at).getTime() : 0;
      return sort === "NEWEST" ? db - da : da - db;
    });

    return list;
  }, [items, q, status, source, assigned, sort, view, isCustomer, isSboLike]);

  const counts = useMemo(() => {
    const total = filtered.length;
    const mp = filtered.filter((t) => isMarketplace(t) && !isAssigned(t)).length;
    const asg = filtered.filter((t) => isAssigned(t)).length;
    return { total, mp, asg };
  }, [filtered]);

  const showViewTabs = !isCustomer && isSboLike;
  const marketplaceDisabled = showViewTabs && locked;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar title="Tickets" subtitle="Ticket number search + team assignment + fast status controls" />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {showViewTabs && locked ? (
          <div className="rounded-3xl border border-rose-500/35 bg-rose-500/10 p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="text-base font-extrabold text-rose-100">Business Locked</div>
                <div className="text-xs text-rose-200/90 mt-1">
                  Reason: <b className="font-mono">{lockReason}</b>
                </div>
                <div className="text-xs text-slate-300 mt-2">
                  Marketplace is blocked until billing is updated. You can still view and manage your tickets.
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <SmallBtn tone="cyan" onClick={openSetupCard}>
                  Add/Update Card
                </SmallBtn>
                <SmallBtn tone="fuchsia" onClick={submitUnlockRequest}>
                  Submit Unlock Request
                </SmallBtn>
                <SmallBtn tone="slate" onClick={() => nav("/billing/cash-fee-invoices")}>
                  View Invoices
                </SmallBtn>
                <SmallBtn tone="slate" onClick={load}>
                  Refresh
                </SmallBtn>
              </div>
            </div>
          </div>
        ) : null}

        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5 overflow-hidden relative">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.10),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.10),transparent_28%)]" />
          <div className="relative flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-2xl font-extrabold">Tickets Board</div>
              <div className="text-sm text-slate-400 mt-1">
                Search ticket number, assign team, change status, and open details fast.
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <SmallBtn tone="fuchsia" onClick={goCreate}>
                + {isCustomer ? "New Service Request" : "New Ticket"}
              </SmallBtn>
              <SmallBtn onClick={load}>Refresh</SmallBtn>
            </div>
          </div>

          <div className="relative mt-4">
            <input
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm"
              placeholder="Search ticket #, DT-000006, category, address, city, state, zip..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {err ? <div className="text-sm text-red-200 bg-red-900/10 border border-red-800 rounded-xl p-3">{err}</div> : null}

        <div className="grid md:grid-cols-3 gap-3">
          <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-4">
            <div className="text-[11px] text-slate-400">In View</div>
            <div className="mt-1 text-lg font-extrabold">{loading ? "…" : counts.total}</div>
          </div>
          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <div className="text-[11px] text-slate-400">Assigned</div>
            <div className="mt-1 text-lg font-extrabold">{counts.asg}</div>
          </div>
          <div className="rounded-3xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-4">
            <div className="text-[11px] text-slate-400">Marketplace Open</div>
            <div className="mt-1 text-lg font-extrabold">{counts.mp}</div>
          </div>
        </div>

        {showViewTabs ? (
          <div className="flex items-center gap-2 flex-wrap">
            <SmallBtn tone={view === "all" ? "cyan" : "slate"} onClick={() => setView("all")}>
              All
            </SmallBtn>
            <SmallBtn tone={view === "my" ? "cyan" : "slate"} onClick={() => setView("my")}>
              My Business
            </SmallBtn>
            <SmallBtn
              tone={view === "marketplace" ? "cyan" : "slate"}
              onClick={() => (marketplaceDisabled ? null : setView("marketplace"))}
              disabled={marketplaceDisabled}
              className={marketplaceDisabled ? "opacity-50" : ""}
            >
              Marketplace
            </SmallBtn>

            <div className="ml-auto flex items-center gap-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-1 flex gap-1">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={cx(
                    "px-3 py-2 rounded-xl text-[11px] font-semibold border transition",
                    viewMode === "table"
                      ? "bg-cyan-500/12 border-cyan-500/40 text-cyan-200"
                      : "bg-slate-950/40 border-slate-800 text-slate-200 hover:bg-slate-900"
                  )}
                >
                  Table
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("queue")}
                  className={cx(
                    "px-3 py-2 rounded-xl text-[11px] font-semibold border transition",
                    viewMode === "queue"
                      ? "bg-emerald-500/12 border-emerald-500/40 text-emerald-200"
                      : "bg-slate-950/40 border-slate-800 text-slate-200 hover:bg-slate-900"
                  )}
                >
                  Queue
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
          <div className="grid md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <FieldLabel>Search</FieldLabel>
              <input
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                placeholder="Ticket #, category, zip, address, city, state…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div>
              <FieldLabel>Status</FieldLabel>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="ALL">All</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel>Source</FieldLabel>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="ALL">All</option>
                <option value="DIRECT">Direct</option>
                <option value="MARKETPLACE">Marketplace</option>
              </select>
            </div>

            <div>
              <FieldLabel>Assigned</FieldLabel>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                value={assigned}
                onChange={(e) => setAssigned(e.target.value)}
              >
                <option value="ALL">All</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="UNASSIGNED">Unassigned</option>
              </select>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-slate-500">
              Search includes ticket number and ticket code.
            </div>
            <div className="flex items-center gap-2">
              <FieldLabel>Sort</FieldLabel>
              <select
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="NEWEST">Newest</option>
                <option value="OLDEST">Oldest</option>
              </select>

              <SmallBtn
                onClick={() => {
                  setQ("");
                  setStatus("ALL");
                  setSource("ALL");
                  setAssigned("ALL");
                  setSort("NEWEST");
                }}
              >
                Clear
              </SmallBtn>
            </div>
          </div>
        </div>

        {viewMode === "table" ? (
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-8 text-slate-400">No tickets match your filters.</div>
            ) : (
              filtered.map((ticket) => (
                <BoardTicketCard
                  key={ticket.id}
                  ticket={ticket}
                  members={members}
                  busyId={actingId}
                  onAction={onAction}
                  onAssign={onAssign}
                  onStatusChange={onStatusChange}
                  view={view}
                  isSboLike={isSboLike}
                  locked={locked}
                />
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-8 text-slate-400">No tickets in this view.</div>
            ) : (
              filtered.map((ticket) => {
                const title = `${makeTicketCode(ticket)} • ${ticket?.category_path || ticket?.category_name || ticket?.title || "Ticket"}`;
                const st = String(ticket?.status || "NEW").toUpperCase();
                const tone = statusTone(st);
                const mp = isMarketplace(ticket);
                const asg = isAssigned(ticket);
                const showMpActions = view === "marketplace" && isSboLike && mp && !asg && !locked;

                return (
                  <div key={ticket.id} className="rounded-3xl border border-slate-800 bg-slate-950/40 hover:bg-slate-900/30 transition p-5">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="text-base font-extrabold truncate">{title}</div>
                        <div className="text-sm text-slate-400 mt-1">
                          {locationLine(ticket) || "No service location"}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Pill tone={tone}>{statusLabel(st)}</Pill>
                        {mp ? <Pill tone="fuchsia">Marketplace</Pill> : <Pill tone="slate">Direct</Pill>}
                        {asg ? <Pill tone="emerald">Assigned</Pill> : <Pill tone="amber">Unassigned</Pill>}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-3">
                        <Link to={`/tickets/${ticket.id}`} className="text-[12px] text-slate-200 hover:text-white underline underline-offset-4">
                          Details
                        </Link>
                        {ticket.created_at ? (
                          <span className="text-[11px] text-slate-500">Created: {new Date(ticket.created_at).toLocaleString()}</span>
                        ) : null}
                      </div>

                      {showMpActions ? (
                        <div className="flex gap-2">
                          <SmallBtn tone="cyan" onClick={() => onAction(ticket.id, "accept")} disabled={actingId === ticket.id}>
                            {actingId === ticket.id ? "..." : "Accept"}
                          </SmallBtn>
                          <SmallBtn tone="rose" onClick={() => onAction(ticket.id, "decline_marketplace")} disabled={actingId === ticket.id}>
                            {actingId === ticket.id ? "..." : "Decline"}
                          </SmallBtn>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500">{view === "marketplace" ? (locked ? "Locked" : "Not actionable") : ""}</div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
}