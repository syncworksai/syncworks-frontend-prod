import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";
import { useAuth } from "../auth/AuthContext";

import MessagePanel from "../components/tickets/MessagePanel";
import AttachmentPanel from "../components/tickets/AttachmentPanel";
import QuotePanel from "../components/tickets/QuotePanel";
import InvoicePanel from "../components/tickets/InvoicePanel";
import TicketWorkspaceNav from "../components/tickets/TicketWorkspaceNav";
import TicketSummaryRail from "../components/tickets/TicketSummaryRail";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function safeInternalReturn(raw) {
  if (!raw) return null;
  if (raw.startsWith("/")) return raw;
  return null;
}

function upperStatus(status) {
  return String(status || "").toUpperCase();
}

function statusTone(status) {
  const s = upperStatus(status);
  if (s === "PAID" || s === "COMPLETED") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (s === "CANCELLED") return "border-rose-500/30 bg-rose-500/10 text-rose-200";
  if (s === "IN_PROGRESS" || s === "EN_ROUTE" || s === "ON_SITE") return "border-cyan-500/30 bg-cyan-500/10 text-cyan-200";
  if (s === "INVOICED" || s === "AWAITING_APPROVAL") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  return "border-slate-700 bg-slate-900/40 text-slate-200";
}

const STATUS_LABELS = {
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
};

function statusLabel(s) {
  return STATUS_LABELS[upperStatus(s)] || s || "—";
}

function fmtPretty(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "—";
  }
}

function Btn({ children, tone = "slate", className = "", ...props }) {
  const tones = {
    slate: "bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-200",
    cyan: "bg-cyan-500/20 border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-200",
    emerald: "bg-emerald-500/15 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-200",
    rose: "bg-rose-500/15 border-rose-500/30 hover:bg-rose-500/20 text-rose-200",
    amber: "bg-amber-500/15 border-amber-500/30 hover:bg-amber-500/20 text-amber-200",
    fuchsia: "bg-fuchsia-500/15 border-fuchsia-500/30 hover:bg-fuchsia-500/20 text-fuchsia-200",
  };

  return (
    <button
      className={cx(
        "inline-flex items-center justify-center h-10 text-xs rounded-2xl px-4 border transition whitespace-nowrap gap-2 disabled:opacity-60 disabled:cursor-not-allowed",
        tones[tone] || tones.slate,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function Row({ k, v }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
      <div className="text-[11px] text-slate-400">{k}</div>
      <div className="text-sm font-semibold mt-1 break-words">{v || "—"}</div>
    </div>
  );
}

function GlowStat({ label, value, tone = "slate" }) {
  const tones = {
    slate: "border-slate-800 bg-slate-950/40 text-slate-100",
    cyan: "border-cyan-500/20 bg-cyan-500/10 text-cyan-100",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-100",
    fuchsia: "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-100",
  };

  return (
    <div className={cx("rounded-3xl border p-4", tones[tone] || tones.slate)}>
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-extrabold tracking-tight">{value}</div>
    </div>
  );
}

function getCustomerName(ticket) {
  const t = ticket || {};
  const candidates = [
    t.customer_name,
    t.customer_full_name,
    t.customer?.name,
    t.customer?.full_name,
    t.requester_name,
    t.created_by_name,
    t.created_by?.name,
    t.created_by?.full_name,
  ]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);
  return candidates[0] || "Customer";
}

function getCustomerContact(ticket) {
  const t = ticket || {};
  const email =
    t.customer_email ||
    t.customer?.email ||
    t.requester_email ||
    t.created_by_email ||
    t.created_by?.email ||
    "";
  const phone =
    t.customer_phone ||
    t.customer?.phone ||
    t.requester_phone ||
    t.created_by_phone ||
    t.created_by?.phone ||
    "";
  return { email, phone };
}

function assignedBusinessCard(ticket) {
  return ticket?.assigned_business_card || null;
}

function assignedBusinessName(ticket) {
  const t = ticket || {};
  const card = assignedBusinessCard(t);
  return (
    t.assigned_business_name ||
    card?.name ||
    t.business_name ||
    t.business?.name ||
    t.assigned_business?.name ||
    ""
  );
}

function normalizeWebsite(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `https://${s}`;
}

function safePhoneHref(v) {
  const raw = String(v || "").trim();
  if (!raw) return "";
  const digits = raw.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "";
}

function safeMailHref(v) {
  const raw = String(v || "").trim();
  if (!raw) return "";
  return `mailto:${raw}`;
}

function writeNewRequestPrefill(payload) {
  try {
    localStorage.setItem("sw:new_request_prefill", JSON.stringify(payload || {}));
  } catch {
    // ignore
  }
}

function AssignedBusinessCardPanel({ ticket, onBookAgain }) {
  const card = assignedBusinessCard(ticket);
  const name = assignedBusinessName(ticket);
  const logoUrl = card?.logo_url || "";
  const headline = card?.headline || "";
  const servicesText = card?.services_text || "";
  const phone = card?.phone || "";
  const email = card?.business_email || "";
  const website = normalizeWebsite(card?.website || "");
  const location = card?.display_location || [card?.city, card?.state].filter(Boolean).join(", ");
  const phoneHref = safePhoneHref(phone);
  const emailHref = safeMailHref(email);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-lg font-extrabold">Assigned Provider</div>
          <div className="text-xs text-slate-400 mt-1">
            The business connected to this ticket.
          </div>
        </div>

        <span
          className={cx(
            "text-[11px] px-2 py-1 rounded-full border font-semibold",
            name
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-amber-500/30 bg-amber-500/10 text-amber-200"
          )}
        >
          {name ? "Assigned" : "Pending"}
        </span>
      </div>

      {name ? (
        <>
          <div className="mt-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xl font-bold break-words">{name}</div>
              {headline ? <div className="mt-2 text-sm text-cyan-200">{headline}</div> : null}
            </div>

            <div className="h-20 w-20 rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt={name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-[10px] text-slate-500">No Logo</span>
              )}
            </div>
          </div>

          <div className="mt-4 grid md:grid-cols-2 gap-2">
            <Row k="Phone" v={phone || "—"} />
            <Row k="Email" v={email || "—"} />
            <Row k="Location" v={location || "—"} />
            <Row k="Website" v={website || "—"} />
          </div>

          {servicesText ? (
            <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
              <div className="text-[11px] text-slate-400">Service Description</div>
              <div className="text-sm text-slate-200 mt-1 whitespace-pre-wrap">{servicesText}</div>
            </div>
          ) : null}

          <div className="mt-4 flex gap-2 flex-wrap">
            {phoneHref ? (
              <a
                href={phoneHref}
                className="inline-flex items-center justify-center h-10 text-xs rounded-2xl px-4 border transition bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-200"
              >
                Call
              </a>
            ) : null}

            {emailHref ? (
              <a
                href={emailHref}
                className="inline-flex items-center justify-center h-10 text-xs rounded-2xl px-4 border transition bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-200"
              >
                Email
              </a>
            ) : null}

            {website ? (
              <a
                href={website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center h-10 text-xs rounded-2xl px-4 border transition bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-200"
              >
                Website
              </a>
            ) : null}

            <Btn tone="cyan" onClick={onBookAgain}>
              Book Again
            </Btn>
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/30 p-4 text-sm text-slate-400">
          No provider is assigned yet.
        </div>
      )}
    </div>
  );
}

function ProviderWorkflowCard({
  isCustomer,
  status,
  isMarketplace,
  assigned,
  loading,
  onAccept,
  onDecline,
  onStart,
  onComplete,
  onCancel,
  onOpenQuote,
  onOpenInvoice,
}) {
  if (isCustomer) return null;

  const s = upperStatus(status);
  const showMarketplaceActions = isMarketplace && !assigned && s === "NEW";
  const showAccept = !showMarketplaceActions && ["NEW", "ASSIGNED"].includes(s);
  const showStart = !isMarketplace && s === "ACCEPTED";
  const showComplete = !isMarketplace && ["IN_PROGRESS", "ON_SITE", "EN_ROUTE"].includes(s);
  const showCancel = !isMarketplace && !["PAID", "COMPLETED", "CANCELLED", "CLOSED"].includes(s);
  const showQuoteInvoiceTools = !showMarketplaceActions;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-lg font-extrabold">Provider Workflow</div>
          <div className="text-xs text-slate-400 mt-1">
            Marketplace tickets get Accept or Deny first. Assigned jobs unlock the full workflow.
          </div>
        </div>

        {showQuoteInvoiceTools ? (
          <div className="flex gap-2 flex-wrap">
            <Btn tone="fuchsia" onClick={onOpenQuote}>
              Open Quote
            </Btn>
            <Btn tone="cyan" onClick={onOpenInvoice}>
              Open Invoice
            </Btn>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex gap-2 flex-wrap">
        {showMarketplaceActions ? (
          <>
            <Btn tone="cyan" onClick={onAccept} disabled={loading}>
              Accept
            </Btn>
            <Btn tone="rose" onClick={onDecline} disabled={loading}>
              Deny
            </Btn>
          </>
        ) : null}

        {showAccept ? (
          <Btn tone="cyan" onClick={onAccept} disabled={loading}>
            Accept
          </Btn>
        ) : null}

        {showStart ? (
          <Btn tone="cyan" onClick={onStart} disabled={loading}>
            Start
          </Btn>
        ) : null}

        {showComplete ? (
          <Btn tone="emerald" onClick={onComplete} disabled={loading}>
            Complete
          </Btn>
        ) : null}

        {showCancel ? (
          <Btn tone="rose" onClick={onCancel} disabled={loading}>
            Cancel
          </Btn>
        ) : null}
      </div>
    </div>
  );
}

function CustomerOverviewCard({ ticket, ticketId, onOpenMessages, onOpenFiles }) {
  const invoice = ticket?.latest_invoice || ticket?.invoice || null;
  const pdfUrl =
    invoice?.pdf_url ||
    invoice?.invoice_pdf_url ||
    invoice?.public_pdf_url ||
    invoice?.download_url ||
    "";

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-lg font-extrabold">Customer Overview</div>
          <div className="text-xs text-slate-400 mt-1">
            Messages, files, and invoice PDF access live here for customers.
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Btn tone="slate" onClick={onOpenMessages}>
            Open Messages
          </Btn>
          <Btn tone="slate" onClick={onOpenFiles}>
            Open Files
          </Btn>
          {pdfUrl ? (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center h-10 text-xs rounded-2xl px-4 border transition whitespace-nowrap gap-2 bg-cyan-500/20 border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-200"
            >
              Open Invoice PDF
            </a>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid md:grid-cols-2 gap-3">
        <Row k="Ticket #" v={ticketId || "—"} />
        <Row k="Status" v={statusLabel(ticket?.status)} />
        <Row k="Category" v={ticket?.category_name || ticket?.category_path || "—"} />
        <Row k="Marketplace" v={ticket?.is_marketplace ? "Yes" : "No"} />
        <Row k="Service Address" v={ticket?.service_address || "—"} />
        <Row k="ZIP" v={ticket?.service_zip || "—"} />
      </div>

      {!pdfUrl ? (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/30 p-4 text-sm text-slate-400">
          No invoice PDF is available yet.
        </div>
      ) : null}
    </div>
  );
}

function IconOverview() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
      <path d="M4 6h16v12H4V6z" stroke="currentColor" strokeWidth="2" />
      <path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
      <path
        d="M20 12c0 3.866-3.582 7-8 7-1.06 0-2.07-.17-3-.48L4 20l1.32-3.52C4.5 15.35 4 13.73 4 12c0-3.866 3.582-7 8-7s8 3.134 8 7z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M8 11h8M8 14h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconWork() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
      <path d="M14 7l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M3 21l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M15 3a4 4 0 00-3 6.7L5.7 16A2 2 0 105 17l6.3-6.3A4 4 0 0015 3z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconQuote() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
      <path d="M7 7h10v10H7V7z" stroke="currentColor" strokeWidth="2" />
      <path d="M9 10h6M9 13h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconInvoice() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
      <path d="M7 3h10v18l-2-1-3 1-3-1-2 1V3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconFiles() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
      <path
        d="M8 12l6-6a3 3 0 114 4l-8 8a5 5 0 11-7-7l8-8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function TicketDetail() {
  const { id } = useParams();
  const loc = useLocation();
  const nav = useNavigate();
  const { mode } = useAuth();

  const isCustomer = mode === "CUSTOMER";
  const isSboLike = mode === "SBO" || mode === "EMPLOYEE" || mode === "PROPERTY_MGR" || mode === "PM";

  const returnTo = useMemo(() => {
    const qs = new URLSearchParams(loc.search);
    return safeInternalReturn(qs.get("return") || qs.get("return_to"));
  }, [loc.search]);

  const backHref = useMemo(() => {
    if (returnTo) return returnTo;
    if (isCustomer) return "/customer?tab=orders";
    return "/tickets?view=new";
  }, [returnTo, isCustomer]);

  const ticketId = useMemo(() => Number(id), [id]);

  const [ticket, setTicket] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  const tabs = useMemo(() => {
    if (isCustomer) {
      return [
        { key: "overview", label: "Overview", icon: <IconOverview /> },
        { key: "messages", label: "Messages", icon: <IconChat /> },
        { key: "files", label: "Files", icon: <IconFiles /> },
      ];
    }

    return [
      { key: "overview", label: "Overview", icon: <IconOverview /> },
      { key: "invoice", label: "Invoice Builder", icon: <IconInvoice /> },
      { key: "quote", label: "Quote", icon: <IconQuote /> },
      { key: "messages", label: "Messages", icon: <IconChat /> },
      { key: "work", label: "Work Notes", icon: <IconWork /> },
      { key: "files", label: "Files", icon: <IconFiles /> },
    ];
  }, [isCustomer]);

  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!tabs.find((t) => t.key === activeTab)) {
      setActiveTab(tabs[0]?.key || "overview");
    }
  }, [tabs, activeTab]);

  const loadTicket = useCallback(async () => {
    if (!id) return;
    setErr("");
    setLoading(true);

    try {
      const t = await api.get(`/tickets/${id}/`);
      setTicket(t.data);

      if (isSboLike && t.data?.is_marketplace === true) {
        try {
          await api.post(`/tickets/${id}/mark_viewed/`);
        } catch {
          // ignore
        }
      }
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to load ticket");
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, [id, isSboLike]);

  useEffect(() => {
    loadTicket();

    function onBizChanged() {
      loadTicket();
    }

    window.addEventListener("sw:activeBusinessChanged", onBizChanged);
    return () => window.removeEventListener("sw:activeBusinessChanged", onBizChanged);
  }, [loadTicket]);

  async function providerAction(actionName) {
    setErr("");
    try {
      await api.post(`/tickets/${id}/${actionName}/`);
      await loadTicket();
      if (actionName === "start") {
        setActiveTab("work");
      }
    } catch (e) {
      setErr(e?.response?.data?.detail || `Action failed: ${actionName}`);
    }
  }

  async function declineMarketplace() {
    setErr("");
    try {
      await api.post(`/tickets/${id}/decline_marketplace/`);
      nav("/tickets?view=marketplace");
    } catch (e) {
      setErr(e?.response?.data?.detail || "Decline failed");
    }
  }

  async function postQuickNote() {
    const body = (noteText || "").trim();
    if (!body) return;

    setErr("");
    setNoteSaving(true);

    try {
      await api.post("/ticket-messages/", { ticket: ticketId, body });
      setNoteText("");
      setNoteOpen(false);
      setActiveTab("messages");
      await loadTicket();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Quick note failed");
    } finally {
      setNoteSaving(false);
    }
  }

  function bookAgainWithAssignedBusiness() {
    const card = assignedBusinessCard(ticket);
    const businessId =
      card?.id ||
      ticket?.assigned_business_id ||
      ticket?.assigned_business?.id ||
      ticket?.business_id ||
      ticket?.business?.id;

    if (!businessId) return;

    writeNewRequestPrefill({
      source: "assigned_business_ticket",
      business_id: businessId,
      business_name: assignedBusinessName(ticket) || "",
      base_zip: card?.base_zip || ticket?.service_zip || "",
      radius_miles: card?.service_radius_miles ?? null,
    });

    const qs = new URLSearchParams();
    qs.set("business_id", String(businessId));
    nav(`/customer/new-request?${qs.toString()}`);
  }

  const assignedName = assignedBusinessName(ticket);
  const customerName = getCustomerName(ticket);
  const { email: customerEmail, phone: customerPhone } = getCustomerContact(ticket);
  const isMarketplace = !!ticket?.is_marketplace;
  const assigned = !!assignedName;
  const status = upperStatus(ticket?.status);

  const overviewStats = useMemo(() => {
    return {
      status: statusLabel(ticket?.status),
      created: fmtPretty(ticket?.created_at),
      updated: fmtPretty(ticket?.updated_at),
      source: isMarketplace ? "Marketplace" : "Direct",
      assigned: assigned ? "Yes" : "No",
    };
  }, [ticket, isMarketplace, assigned]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 pb-10">
      <ModeBar
        title={
          <div className="leading-tight">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-base font-semibold">{`#${id} • ${customerName}`}</div>
              <span className={cx("text-[11px] px-2 py-1 rounded-full border font-semibold", statusTone(ticket?.status))}>
                {statusLabel(ticket?.status)}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {assigned ? `Assigned to ${assignedName}` : isMarketplace ? "Marketplace ticket" : "Direct ticket"}
            </div>
          </div>
        }
        subtitle=""
        rightActions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Link
              to={backHref}
              className="inline-flex items-center justify-center h-10 text-xs rounded-2xl px-4 bg-slate-950 border border-slate-800 hover:bg-slate-900"
            >
              ← Back
            </Link>

            {isSboLike && !isCustomer ? (
              <Btn tone="slate" onClick={() => setNoteOpen(true)}>
                Quick Note
              </Btn>
            ) : null}

            <Btn onClick={loadTicket} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </Btn>
          </div>
        }
      />

      {noteOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              if (!noteSaving) setNoteOpen(false);
            }}
          />
          <div className="relative w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-950/95 backdrop-blur p-5 shadow-[0_0_60px_rgba(0,0,0,0.55)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-extrabold">Quick Note</div>
                <div className="text-xs text-slate-400 mt-1">
                  Fast internal note — saved into the ticket message stream.
                </div>
              </div>

              <button
                className="h-10 w-10 rounded-2xl border border-slate-800 bg-slate-950/60 hover:bg-slate-900 flex items-center justify-center"
                onClick={() => {
                  if (!noteSaving) setNoteOpen(false);
                }}
                title="Close"
              >
                ✕
              </button>
            </div>

            <textarea
              className="mt-4 w-full min-h-[140px] bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm outline-none focus:border-cyan-500/40"
              placeholder="Type your note…"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              disabled={noteSaving}
            />

            <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
              <div className="text-[11px] text-slate-500">Tip: short, clear, action-oriented.</div>
              <div className="flex gap-2">
                <Btn tone="slate" onClick={() => setNoteOpen(false)} disabled={noteSaving}>
                  Cancel
                </Btn>
                <Btn tone="cyan" onClick={postQuickNote} disabled={noteSaving || !(noteText || "").trim()}>
                  {noteSaving ? "Saving…" : "Add Note"}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <main className="max-w-7xl mx-auto px-4 py-5 space-y-4">
        {err ? (
          <div className="text-sm text-red-200 bg-red-900/10 border border-red-800 rounded-2xl p-3">
            {err}
          </div>
        ) : null}

        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5 overflow-hidden relative">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.10),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.10),transparent_28%)]" />
          <div className="relative">
            <div className="grid xl:grid-cols-12 gap-4 items-start">
              <div className="xl:col-span-7">
                <div className="text-xl font-extrabold">Ticket Workspace</div>
                <div className="text-sm text-slate-400 mt-1 max-w-2xl">
                  {isCustomer
                    ? "Customer view for ticket updates, messages, files, and invoice PDF access."
                    : "Fast operating system view for job communication, quote pulling, invoice building, and execution."}
                </div>

                <div className="mt-4 flex gap-2 flex-wrap">
                  {!isCustomer && !isMarketplace ? (
                    <Btn tone="fuchsia" onClick={() => setActiveTab("quote")}>
                      Open Quote
                    </Btn>
                  ) : null}

                  {!isCustomer && !isMarketplace ? (
                    <Btn tone="cyan" onClick={() => setActiveTab("invoice")}>
                      Open Invoice Builder
                    </Btn>
                  ) : null}

                  <Btn tone="slate" onClick={() => setActiveTab("messages")}>
                    Open Messages
                  </Btn>

                  {isCustomer ? (
                    <Btn tone="slate" onClick={() => setActiveTab("files")}>
                      Open Files
                    </Btn>
                  ) : null}
                </div>
              </div>

              <div className="xl:col-span-5 grid grid-cols-2 gap-3">
                <GlowStat label="Status" value={overviewStats.status} tone="cyan" />
                <GlowStat label="Source" value={overviewStats.source} tone="fuchsia" />
                <GlowStat label="Assigned" value={overviewStats.assigned} tone="emerald" />
                <GlowStat label="Updated" value={overviewStats.updated} tone="amber" />
              </div>
            </div>
          </div>
        </div>

        <TicketWorkspaceNav items={tabs} activeKey={activeTab} onChange={setActiveTab} />

        <div className="grid xl:grid-cols-12 gap-4">
          <aside className="xl:col-span-4">
            <TicketSummaryRail ticket={ticket} isCustomer={isCustomer} />
          </aside>

          <section className="xl:col-span-8 space-y-4">
            {activeTab === "overview" ? (
              <div className="space-y-4">
                {isCustomer ? (
                  <CustomerOverviewCard
                    ticket={ticket}
                    ticketId={ticketId}
                    onOpenMessages={() => setActiveTab("messages")}
                    onOpenFiles={() => setActiveTab("files")}
                  />
                ) : (
                  <>
                    <AssignedBusinessCardPanel ticket={ticket} onBookAgain={bookAgainWithAssignedBusiness} />

                    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
                      <GlowStat label="Created" value={overviewStats.created} tone="slate" />
                      <GlowStat label="Updated" value={overviewStats.updated} tone="slate" />
                      <GlowStat label="Customer" value={customerName} tone="cyan" />
                      <GlowStat label="Ticket ID" value={`#${ticketId || "—"}`} tone="fuchsia" />
                    </div>

                    <ProviderWorkflowCard
                      isCustomer={isCustomer}
                      status={status}
                      isMarketplace={isMarketplace}
                      assigned={assigned}
                      loading={loading}
                      onAccept={() => providerAction("accept")}
                      onDecline={declineMarketplace}
                      onStart={() => providerAction("start")}
                      onComplete={() => providerAction("complete")}
                      onCancel={() => providerAction("cancel")}
                      onOpenQuote={() => setActiveTab("quote")}
                      onOpenInvoice={() => setActiveTab("invoice")}
                    />

                    {!isMarketplace ? (
                      <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <div className="text-lg font-extrabold">Quick Access</div>
                            <div className="text-xs text-slate-400 mt-1">
                              Jump into the exact workflow you need right now.
                            </div>
                          </div>

                          <div className="flex gap-2 flex-wrap">
                            <Btn tone="fuchsia" onClick={() => setActiveTab("quote")}>Quote</Btn>
                            <Btn tone="cyan" onClick={() => setActiveTab("invoice")}>Invoice Builder</Btn>
                            <Btn tone="slate" onClick={() => setActiveTab("messages")}>Messages</Btn>
                            <Btn tone="emerald" onClick={() => setActiveTab("work")}>Work Notes</Btn>
                            <Btn tone="slate" onClick={() => setActiveTab("files")}>Files</Btn>
                          </div>
                        </div>

                        {(customerEmail || customerPhone) ? (
                          <div className="mt-4 grid md:grid-cols-2 gap-2">
                            <Row k="Customer Email" v={customerEmail || "—"} />
                            <Row k="Customer Phone" v={customerPhone || "—"} />
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                )}

                <MessagePanel
                  ticketId={ticketId}
                  compact
                  title="Recent Messages"
                  subtitle="Fast view of the ticket conversation."
                />
              </div>
            ) : null}

            {activeTab === "invoice" && !isCustomer && !isMarketplace ? (
              <InvoicePanel
                ticketId={ticketId}
                ticket={ticket}
                onAfterChange={loadTicket}
              />
            ) : null}

            {activeTab === "quote" && !isCustomer && !isMarketplace ? (
              <QuotePanel ticketId={ticketId} ticket={ticket} onAfterChange={loadTicket} />
            ) : null}

            {activeTab === "messages" ? <MessagePanel ticketId={ticketId} /> : null}

            {activeTab === "work" && !isCustomer && !isMarketplace ? (
              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-lg font-extrabold">Work Notes</div>
                      <div className="text-xs text-slate-400 mt-1">
                        This tab is now for active-job notes and execution chat only.
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Btn tone="fuchsia" onClick={() => setActiveTab("quote")}>
                        Open Quote
                      </Btn>
                      <Btn tone="cyan" onClick={() => setActiveTab("invoice")}>
                        Open Invoice
                      </Btn>
                    </div>
                  </div>

                  <div className="mt-4">
                    <MessagePanel
                      ticketId={ticketId}
                      compact
                      title="Work Chat"
                      subtitle="Arrival notes, on-site updates, completion notes, and active-job communication."
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === "files" ? (
              <AttachmentPanel ticketId={ticketId} canUpload={isCustomer || isSboLike} />
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}