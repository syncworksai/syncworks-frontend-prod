import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";
import { useAuth } from "../auth/AuthContext";
import PriorityBadge, { isPriorityOne, priorityRank } from "../components/tickets/PriorityBadge";
import TicketMobileActionBar from "../components/tickets/TicketMobileActionBar";

function cx(...p) {
  return p.filter(Boolean).join(" ");
}

function safeResults(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

function paginationMeta(data) {
  if (!data || Array.isArray(data)) return null;
  return {
    count: Number(data.count || 0),
    next: data.next || null,
    previous: data.previous || null,
  };
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
  "CLOSED",
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

function isArchived(t) {
  return !!(t?.is_archived || t?.archived_at);
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
    }[u] ||
    u ||
    "Status"
  );
}

function statusTone(s) {
  const u = String(s || "").toUpperCase();
  if (["PAID"].includes(u)) return "emerald";
  if (["COMPLETED"].includes(u)) return "cyan";
  if (["INVOICED", "AWAITING_APPROVAL"].includes(u)) return "amber";
  if (["CANCELLED", "CLOSED"].includes(u)) return "rose";
  if (["IN_PROGRESS", "ON_SITE", "EN_ROUTE"].includes(u)) return "amber";
  if (["SCHEDULED", "ACCEPTED"].includes(u)) return "fuchsia";
  return "slate";
}

function Pill({ children, tone = "slate", className = "" }) {
  const m = {
    slate: "border-slate-800 bg-slate-950/50 text-slate-200",
    cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
    fuchsia: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-200",
    sky: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  };

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.13em]",
        m[tone] || m.slate,
        className
      )}
    >
      {children}
    </span>
  );
}

function SmallBtn({ children, tone = "slate", className = "", ...props }) {
  const tones = {
    slate: "bg-slate-950/70 border-slate-800 hover:bg-slate-900 text-slate-200",
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
        "inline-flex h-9 items-center justify-center gap-2 rounded-xl border px-3 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
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
  return <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-500">{children}</div>;
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
  const full = `${member?.user?.first_name || ""} ${member?.user?.last_name || ""}`.trim();
  return (
    full ||
    member?.user_name ||
    member?.name ||
    member?.user_email ||
    member?.user?.email ||
    member?.email ||
    `Member #${member?.id || ""}`
  );
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

function savedKeyForUser(userId, mode) {
  return `sw:saved_ticket_ids:${mode || "user"}:${userId || "anon"}`;
}

function readSavedSet(userId, mode) {
  try {
    const raw = localStorage.getItem(savedKeyForUser(userId, mode));
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.map((x) => Number(x)).filter(Boolean) : []);
  } catch {
    return new Set();
  }
}

function writeSavedSet(userId, mode, set) {
  try {
    localStorage.setItem(savedKeyForUser(userId, mode), JSON.stringify(Array.from(set)));
  } catch {
    // no-op
  }
}

function BoardStat({ label, value, tone = "cyan", hint }) {
  const tones = {
    cyan: "border-cyan-500/20 bg-cyan-500/10 text-cyan-100",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
    fuchsia: "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-100",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-100",
    rose: "border-rose-500/20 bg-rose-500/10 text-rose-100",
    slate: "border-slate-800 bg-slate-950/50 text-slate-100",
  };

  return (
    <div className={cx("rounded-3xl border p-4", tones[tone] || tones.cyan)}>
      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-black tracking-tight text-white">{value}</div>
      {hint ? <div className="mt-1 text-[11px] text-slate-500">{hint}</div> : null}
    </div>
  );
}

function TicketsHero({ isCustomer, counts, loading, onCreate, onRefresh }) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-cyan-500/20 bg-slate-950/55 p-5 shadow-[0_0_70px_rgba(34,211,238,0.10)] md:p-7">
      <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="absolute -bottom-28 left-1/3 h-80 w-80 rounded-full bg-fuchsia-500/12 blur-3xl" />
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-indigo-500/10 to-fuchsia-500/10" />

      <div className="relative flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-200">
            SyncWorks Operations Board
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight text-white md:text-5xl">
            {isCustomer ? "My Requests" : "Job Requests"}
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
            Search, filter, save, archive, assign, and move work through the full job lifecycle without loading the whole business into chaos.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-cyan-300/40 bg-gradient-to-r from-cyan-500 to-blue-600 px-5 text-sm font-black text-white shadow-[0_0_35px_rgba(34,211,238,0.28)] transition hover:brightness-110"
            >
              + {isCustomer ? "New Request" : "New Ticket"}
            </button>

            <SmallBtn tone="slate" className="h-12 rounded-2xl px-5" onClick={onRefresh} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </SmallBtn>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:w-[460px]">
          <BoardStat label="Visible" value={loading ? "…" : counts.total} tone="cyan" />
          <BoardStat label="Assigned" value={counts.asg} tone="emerald" />
          <BoardStat label="Marketplace" value={counts.mp} tone="fuchsia" />
        </div>
      </div>
    </section>
  );
}

function BoardTicketCard({
  ticket,
  members,
  busyId,
  onAction,
  onAssign,
  onStatusChange,
  onArchiveToggle,
  onSavedToggle,
  view,
  isSboLike,
  locked,
  saved,
}) {
  const ticketCode = makeTicketCode(ticket);
  const status = String(ticket?.status || "").toUpperCase();
  const tone = statusTone(status);
  const mp = isMarketplace(ticket);
  const asg = isAssigned(ticket);
  const archived = isArchived(ticket);
  const showMpActions = view === "marketplace" && isSboLike && mp && !asg && !locked;
  const p1 = isPriorityOne(ticket);
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
    <article
      className={cx(
        "relative overflow-hidden rounded-3xl border bg-slate-950/45 p-4 shadow-[0_0_45px_rgba(0,0,0,0.22)] md:p-5",
        p1
          ? "border-red-500/60 bg-red-500/5 shadow-[0_0_32px_rgba(239,68,68,0.22)]"
          : archived
          ? "border-slate-700 opacity-80"
          : "border-slate-800/90"
      )}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-cyan-500/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-fuchsia-500/8 blur-3xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-base font-black text-slate-100">{ticketCode}</div>
              <PriorityBadge ticket={ticket} />
              {p1 ? <Pill tone="rose">Service Now</Pill> : null}
              <Pill tone={tone}>{statusLabel(status)}</Pill>
              {mp ? <Pill tone="fuchsia">Marketplace</Pill> : <Pill>Direct</Pill>}
              {asg ? <Pill tone="emerald">Assigned</Pill> : <Pill tone="amber">Unassigned</Pill>}
              {saved ? <Pill tone="cyan">Saved</Pill> : null}
              {archived ? <Pill tone="slate">Archived</Pill> : null}
            </div>

            <div className="mt-2 max-w-2xl truncate text-sm font-bold text-slate-100">
              {ticket?.category_path || ticket?.category_name || ticket?.title || "Ticket"}
            </div>

            <div className="mt-1 text-xs text-slate-400 break-words">
              {locationLine(ticket) || "No service location"}
            </div>

            <div className="mt-2 text-[11px] text-slate-500">
              {ticket?.sms_allowed ? "Allows text messaging" : "In-app or phone call"} •{" "}
              {ticket?.created_at ? new Date(ticket.created_at).toLocaleString() : "—"}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <SmallBtn tone={saved ? "cyan" : "slate"} onClick={() => onSavedToggle(ticket.id)}>
              {saved ? "Unsave" : "Save"}
            </SmallBtn>
            <SmallBtn tone={archived ? "emerald" : "amber"} onClick={() => onArchiveToggle(ticket.id, archived)} disabled={isBusy}>
              {archived ? "Restore" : "Archive"}
            </SmallBtn>
            <Link
              to={`/tickets/${ticket.id}`}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/12 px-3 text-[11px] font-semibold text-cyan-100 transition hover:bg-cyan-500/18"
            >
              Open
            </Link>
          </div>
        </div>

        {isSboLike ? (
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
              <div className="text-[11px] text-slate-400">Assign Employee</div>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <select
                  className="min-w-0 flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100"
                  value={assignValue}
                  onChange={(e) => setAssignValue(e.target.value)}
                  disabled={isBusy || archived}
                >
                  <option value="">Select employee…</option>
                  {(members || []).map((m) => (
                    <option key={m.id} value={String(m.id)}>
                      {displayMemberName(m)} • {roleLabel(m.role)}
                    </option>
                  ))}
                </select>

                <SmallBtn
                  tone="sky"
                  className="h-12 px-4"
                  disabled={isBusy || !assignValue || archived}
                  onClick={() => onAssign(ticket.id, assignValue)}
                >
                  {isBusy ? "Saving…" : "Assign"}
                </SmallBtn>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
              <div className="text-[11px] text-slate-400">Status Change</div>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <select
                  className="min-w-0 flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100"
                  value={statusValue}
                  onChange={(e) => setStatusValue(e.target.value)}
                  disabled={isBusy || archived}
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
                  disabled={isBusy || !statusValue || statusValue === status || archived}
                  onClick={() => onStatusChange(ticket.id, statusValue)}
                >
                  {isBusy ? "Updating…" : "Update"}
                </SmallBtn>
              </div>
            </div>
          </div>
        ) : null}

        {!archived ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {showMpActions ? (
              <>
                <SmallBtn tone="cyan" onClick={() => onAction(ticket.id, "accept")} disabled={isBusy}>
                  {isBusy ? "..." : "Accept"}
                </SmallBtn>
                <SmallBtn tone="rose" onClick={() => onAction(ticket.id, "decline_marketplace")} disabled={isBusy}>
                  {isBusy ? "..." : "Deny"}
                </SmallBtn>
              </>
            ) : isSboLike ? (
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
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function CompactTicketRow({ ticket, saved, onSavedToggle, onArchiveToggle, isSboLike, busy }) {
  const status = String(ticket?.status || "NEW").toUpperCase();
  const mp = isMarketplace(ticket);
  const archived = isArchived(ticket);

  return (
    <tr className="border-b border-slate-800/70 hover:bg-slate-900/35">
      <td className="whitespace-nowrap px-4 py-3">
        <Link to={`/tickets/${ticket.id}`} className="font-black text-cyan-100 hover:text-white">
          {makeTicketCode(ticket)}
        </Link>
        <div className="mt-1 text-[11px] text-slate-500">{ticket?.created_at ? new Date(ticket.created_at).toLocaleDateString() : "—"}</div>
      </td>
      <td className="min-w-[260px] px-4 py-3">
        <div className="truncate text-sm font-semibold text-slate-100">{ticket?.category_path || ticket?.category_name || ticket?.title || "Ticket"}</div>
        <div className="mt-1 truncate text-xs text-slate-500">{locationLine(ticket) || "No service location"}</div>
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <Pill tone={statusTone(status)}>{statusLabel(status)}</Pill>
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        {mp ? <Pill tone="fuchsia">Marketplace</Pill> : <Pill>Direct</Pill>}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        {isAssigned(ticket) ? <Pill tone="emerald">Assigned</Pill> : <Pill tone="amber">Open</Pill>}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <div className="flex gap-2">
          <SmallBtn tone={saved ? "cyan" : "slate"} onClick={() => onSavedToggle(ticket.id)}>
            {saved ? "Unsave" : "Save"}
          </SmallBtn>
          {isSboLike ? (
            <SmallBtn tone={archived ? "emerald" : "amber"} disabled={busy} onClick={() => onArchiveToggle(ticket.id, archived)}>
              {archived ? "Restore" : "Archive"}
            </SmallBtn>
          ) : null}
          <Link
            to={`/tickets/${ticket.id}`}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/70 px-3 text-[11px] font-semibold text-slate-200 hover:bg-slate-900"
          >
            Open
          </Link>
        </div>
      </td>
    </tr>
  );
}

export default function TicketsBoard() {
  const nav = useNavigate();
  const { mode, activeBusinessId, user } = useAuth();
  const [params, setParams] = useSearchParams();

  const isCustomer = mode === "CUSTOMER";
  const isSboLike = mode === "SBO" || mode === "EMPLOYEE" || mode === "PROPERTY_MGR" || mode === "PM";

  const view = params.get("view") || "active";
  const [viewMode, setViewMode] = useState(view === "marketplace" ? "queue" : "cards");

  const [items, setItems] = useState([]);
  const [pageMeta, setPageMeta] = useState(null);
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

  const [savedIds, setSavedIds] = useState(() => readSavedSet(user?.id || user?.email, mode));

  const locked = !!billing?.is_locked;
  const lockReason = billing?.lock_reason || "LOCKED";
  const bizId = useMemo(() => String(activeBusinessId || "").trim(), [activeBusinessId]);

  useEffect(() => {
    setSavedIds(readSavedSet(user?.id || user?.email, mode));
  }, [user?.id, user?.email, mode]);

  useEffect(() => {
    setViewMode(view === "marketplace" ? "queue" : "cards");
  }, [view]);

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

      let url = "/tickets/";
      const requestParams = {};

      if (!isCustomer && isSboLike && view === "marketplace") {
        url = "/tickets/marketplace/";
      } else if (view === "archived") {
        requestParams.archived = "true";
      } else {
        requestParams.archived = "false";
      }

      const res = await api.get(url, { params: requestParams });
      setItems(safeResults(res.data));
      setPageMeta(paginationMeta(res.data));
    } catch (e) {
      setItems([]);
      setPageMeta(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setErr(e?.response?.data?.detail || "Failed to assign employee");
    } finally {
      setActingId(null);
    }
  }

  async function onStatusChange(ticketId, nextStatus) {
    setErr("");
    setActingId(ticketId);

    try {
      await api.post(`/tickets/${ticketId}/set-status/`, {
        status: nextStatus,
      });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to update status");
    } finally {
      setActingId(null);
    }
  }

async function onArchiveToggle(ticketId, archived) {
  setErr("");
  setActingId(ticketId);

  try {
    await api.post(
      `/tickets/${ticketId}/${archived ? "unarchive" : "archive"}/`,
      {}
    );

    setItems((prev) => {
      const id = Number(ticketId);

      if (view === "archived" && archived) {
        return prev.filter((t) => Number(t.id) !== id);
      }

      if (view !== "archived" && !archived) {
        return prev.filter((t) => Number(t.id) !== id);
      }

      return prev.map((t) =>
        Number(t.id) === id
          ? {
              ...t,
              is_archived: !archived,
              archived_at: archived ? null : new Date().toISOString(),
            }
          : t
      );
    });

    await load();
  } catch (e) {
    const lock = parseLockError(e);

    if (lock) {
      await loadBilling();
      setErr(lock.detail);
    } else {
      setErr(
        e?.response?.data?.detail ||
          (archived
            ? "Failed to restore ticket"
            : "Failed to archive ticket")
      );
    }
  } finally {
    setActingId(null);
  }
}

  function onSavedToggle(ticketId) {
    const id = Number(ticketId);
    if (!id) return;

    const next = new Set(savedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);

    setSavedIds(next);
    writeSavedSet(user?.id || user?.email, mode, next);
  }

  const filtered = useMemo(() => {
    const text = (q || "").trim().toLowerCase();
    let list = [...(items || [])];

    if (!isCustomer && isSboLike) {
      if (view === "saved") list = list.filter((t) => savedIds.has(Number(t?.id)));
      if (view === "direct") list = list.filter((t) => !isMarketplace(t));
      if (view === "my") list = list.filter((t) => isAssigned(t));
      if (view === "marketplace") list = list.filter((t) => isMarketplace(t) && !isAssigned(t));
    } else if (view === "saved") {
      list = list.filter((t) => savedIds.has(Number(t?.id)));
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
          t?.customer_name,
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
      const urgency = priorityRank(a) - priorityRank(b);

      if (view === "marketplace" && urgency !== 0) return urgency;
      if (sort === "PRIORITY" && urgency !== 0) return urgency;

      return sort === "OLDEST" ? da - db : db - da;
    });

    return list;
  }, [items, q, status, source, assigned, sort, view, isCustomer, isSboLike, savedIds]);

  const counts = useMemo(() => {
    const base = items || [];
    const total = filtered.length;
    const mp = base.filter((t) => isMarketplace(t) && !isAssigned(t)).length;
    const asg = base.filter((t) => isAssigned(t)).length;
    const archived = base.filter((t) => isArchived(t)).length;
    const saved = base.filter((t) => savedIds.has(Number(t?.id))).length;
    const p1 = base.filter((t) => isPriorityOne(t)).length;

    return { total, mp, asg, archived, saved, p1 };
  }, [items, filtered.length, savedIds]);

  const showViewTabs = !isCustomer && isSboLike;
  const marketplaceDisabled = showViewTabs && locked;

  const viewTabs = isCustomer
    ? [
        ["active", "Active"],
        ["saved", "Saved"],
        ["archived", "Archived"],
      ]
    : [
        ["active", "Active"],
        ["my", "Assigned"],
        ["marketplace", "Marketplace"],
        ["direct", "Direct"],
        ["saved", "Saved"],
        ["archived", "Archived"],
      ];

  return (
    <div className="min-h-screen overflow-hidden bg-[#020617] text-slate-100">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[#020617]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(217,70,239,0.14),transparent_34%),radial-gradient(circle_at_bottom,rgba(99,102,241,0.15),transparent_38%)]" />
      </div>

      <ModeBar title="Job Requests" subtitle="SaaS ticket board • assignment • status controls • archive system" />

      <main className="relative mx-auto max-w-7xl space-y-5 px-4 py-6 pb-28">
        {showViewTabs && locked ? (
          <div className="rounded-3xl border border-rose-500/35 bg-rose-500/10 p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="text-base font-extrabold text-rose-100">Business Locked</div>
                <div className="mt-1 text-xs text-rose-200/90">
                  Reason: <b className="font-mono">{lockReason}</b>
                </div>
                <div className="mt-2 text-xs text-slate-300">
                  Marketplace is blocked until billing is updated. You can still view and manage assigned tickets.
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <SmallBtn tone="cyan" onClick={openSetupCard}>Add/Update Card</SmallBtn>
                <SmallBtn tone="fuchsia" onClick={submitUnlockRequest}>Submit Unlock Request</SmallBtn>
                <SmallBtn tone="slate" onClick={() => nav("/billing/cash-fee-invoices")}>View Invoices</SmallBtn>
                <SmallBtn tone="slate" onClick={load}>Refresh</SmallBtn>
              </div>
            </div>
          </div>
        ) : null}

        <TicketsHero isCustomer={isCustomer} counts={counts} loading={loading} onCreate={goCreate} onRefresh={load} />

        {err ? (
          <div className="rounded-2xl border border-red-800 bg-red-900/20 p-3 text-sm text-red-300">{err}</div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <BoardStat label="Visible" value={loading ? "…" : counts.total} tone="cyan" />
          <BoardStat label="Assigned" value={counts.asg} tone="emerald" />
          <BoardStat label="Marketplace" value={counts.mp} tone="fuchsia" />
          <BoardStat label="Saved" value={counts.saved} tone="sky" />
          <BoardStat label="Archived" value={counts.archived} tone="slate" />
          <BoardStat label="P1 Urgent" value={counts.p1} tone="rose" />
        </div>

        <section className="rounded-3xl border border-slate-800/90 bg-slate-950/45 p-4 backdrop-blur-xl">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {viewTabs.map(([key, label]) => {
                const disabled = key === "marketplace" && marketplaceDisabled;
                return (
                  <SmallBtn
                    key={key}
                    tone={view === key ? "cyan" : "slate"}
                    onClick={() => (disabled ? null : setView(key))}
                    disabled={disabled}
                    className={disabled ? "opacity-50" : ""}
                  >
                    {label}
                  </SmallBtn>
                );
              })}

              <div className="ml-auto flex items-center gap-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-1 flex gap-1">
                  {[
                    ["cards", "Cards"],
                    ["table", "Table"],
                    ["queue", "Queue"],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setViewMode(key)}
                      className={cx(
                        "rounded-xl border px-3 py-2 text-[11px] font-semibold transition",
                        viewMode === key
                          ? "border-cyan-500/40 bg-cyan-500/12 text-cyan-200"
                          : "border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-900"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-5">
              <div className="md:col-span-2">
                <FieldLabel>Search</FieldLabel>
                <input
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-500/40"
                  placeholder="Ticket #, category, zip, address, customer…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>

              <div>
                <FieldLabel>Status</FieldLabel>
                <select
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="ALL">All</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{statusLabel(s)}</option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel>Source</FieldLabel>
                <select
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
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
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
                  value={assigned}
                  onChange={(e) => setAssigned(e.target.value)}
                >
                  <option value="ALL">All</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="UNASSIGNED">Unassigned</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                {pageMeta?.count ? `Server count: ${pageMeta.count}` : "Ready for server-side pagination when backend returns paginated results."}
              </div>

              <div className="flex items-center gap-2">
                <FieldLabel>Sort</FieldLabel>
                <select
                  className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="NEWEST">Newest</option>
                  <option value="OLDEST">Oldest</option>
                  <option value="PRIORITY">Priority</option>
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
        </section>

        {viewMode === "table" ? (
          <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/45">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] uppercase tracking-[0.15em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Ticket</th>
                    <th className="px-4 py-3">Work</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Assignment</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-slate-400">No tickets match your filters.</td>
                    </tr>
                  ) : (
                    filtered.map((ticket) => (
                      <CompactTicketRow
                        key={ticket.id}
                        ticket={ticket}
                        saved={savedIds.has(Number(ticket.id))}
                        onSavedToggle={onSavedToggle}
                        onArchiveToggle={onArchiveToggle}
                        isSboLike={isSboLike}
                        busy={actingId === ticket.id}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className={cx(viewMode === "queue" ? "grid gap-4 xl:grid-cols-2" : "space-y-3")}>
            {filtered.length === 0 ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-8 text-slate-400">
                No tickets match your filters.
              </div>
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
                  onArchiveToggle={onArchiveToggle}
                  onSavedToggle={onSavedToggle}
                  view={view}
                  isSboLike={isSboLike}
                  locked={locked}
                  saved={savedIds.has(Number(ticket.id))}
                />
              ))
            )}
          </div>
        )}
             <TicketMobileActionBar
          view={view}
          onActive={() => setView("active")}
          onSaved={() => setView("saved")}
          onArchived={() => setView("archived")}
          onNew={goCreate}
        />
      </main>
    </div>
  );
}