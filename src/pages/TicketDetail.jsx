// src/pages/TicketDetail.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";
import { useAuth } from "../auth/AuthContext";

import MessagePanel from "../components/tickets/MessagePanel";
import AttachmentPanel from "../components/tickets/AttachmentPanel";
import QuotePanel from "../components/tickets/QuotePanel";
import InvoicePanel from "../components/tickets/InvoicePanel";
import CustomerInvoicePanel from "../components/tickets/CustomerInvoicePanel";

const STATUS_LABELS = {
  NEW: "New",
  ASSIGNED: "Assigned",
  ACCEPTED: "Accepted",
  SCHEDULED: "Scheduled",
  EN_ROUTE: "En Route",
  ON_SITE: "On Site",
  IN_PROGRESS: "In Progress",
  AWAITING_APPROVAL: "Awaiting Approval",
  COMPLETED: "Completed",
  INVOICED: "Invoiced",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

function statusLabel(s) {
  return STATUS_LABELS[String(s || "").toUpperCase()] || s || "—";
}

function cx(...p) {
  return p.filter(Boolean).join(" ");
}

function safeDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d : null;
}

function fmtPretty(iso) {
  const d = safeDate(iso);
  if (!d) return "—";
  const date = d.toLocaleDateString(undefined, { year: "2-digit", month: "numeric", day: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} @ ${time}`;
}

function durationLabel(fromIso, toIso) {
  const a = safeDate(fromIso);
  const b = safeDate(toIso);
  if (!a || !b) return "—";
  const ms = Math.max(0, b.getTime() - a.getTime());
  const mins = Math.round(ms / 60000);
  const days = Math.floor(mins / (60 * 24));
  const hrs = Math.floor((mins - days * 60 * 24) / 60);
  const remM = mins - days * 60 * 24 - hrs * 60;

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hrs) parts.push(`${hrs}h`);
  if (!days && !hrs) parts.push(`${remM}m`);
  return parts.join(" ");
}

function safeInternalReturn(raw) {
  if (!raw) return null;
  if (raw.startsWith("/")) return raw;
  return null;
}

function Icon({ name, className = "w-5 h-5", title }) {
  const common = { className, "aria-hidden": title ? undefined : true };
  const wrap = (d) => (
    <svg viewBox="0 0 24 24" fill="none" {...common}>
      {title ? <title>{title}</title> : null}
      {d}
    </svg>
  );

  switch (name) {
    case "refresh":
      return wrap(
        <>
          <path d="M20 12a8 8 0 10-2.34 5.66" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M20 12v-6m0 6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    case "chat":
      return wrap(
        <>
          <path
            d="M20 12c0 3.866-3.582 7-8 7-1.06 0-2.07-.17-3-.48L4 20l1.32-3.52C4.5 15.35 4 13.73 4 12c0-3.866 3.582-7 8-7s8 3.134 8 7z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M8 11h8M8 14h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case "invoice":
      return wrap(
        <>
          <path d="M7 3h10v18l-2-1-3 1-3-1-2 1V3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case "paperclip":
      return wrap(
        <>
          <path
            d="M8 12l6-6a3 3 0 114 4l-8 8a5 5 0 11-7-7l8-8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );
    case "clock":
      return wrap(
        <>
          <path d="M12 22a10 10 0 100-20 10 10 0 000 20z" stroke="currentColor" strokeWidth="2" />
          <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case "note":
      return wrap(
        <>
          <path d="M7 3h8l2 2v16H7V3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M9 9h6M9 13h6M9 17h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case "x":
      return wrap(
        <>
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case "slides":
      return wrap(
        <>
          <path d="M4 6h16v10H4V6z" stroke="currentColor" strokeWidth="2" />
          <path d="M8 20h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M9 10h6M9 13h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
        </>
      );
    case "tools":
      return wrap(
        <>
          <path d="M14 7l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M3 21l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M15 3a4 4 0 00-3 6.7L5.7 16A2 2 0 105 17l6.3-6.3A4 4 0 0015 3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </>
      );
    case "quote":
      return wrap(
        <>
          <path d="M7 7h10v10H7V7z" stroke="currentColor" strokeWidth="2" />
          <path d="M9 10h6M9 13h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case "chevL":
      return wrap(<path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />);
    case "chevR":
      return wrap(<path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />);
    default:
      return null;
  }
}

function SmallPill({ children, tone = "slate", icon }) {
  const tones = {
    slate: "border-slate-700 bg-slate-900/40 text-slate-200",
    cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-200",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    fuchsia: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200",
  };
  return (
    <span className={"text-[11px] px-2 py-1 rounded-lg border inline-flex items-center gap-1 " + (tones[tone] || tones.slate)}>
      {icon ? <span className="opacity-90">{icon}</span> : null}
      {children}
    </span>
  );
}

function Row({ k, v }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
      <div className="text-[11px] text-slate-400">{k}</div>
      <div className="text-sm font-semibold mt-1 break-words">{v}</div>
    </div>
  );
}

function Btn({ children, tone = "slate", className = "", leftIcon, ...props }) {
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
      {leftIcon ? <span className="opacity-90">{leftIcon}</span> : null}
      {children}
    </button>
  );
}

function SlideDots({ count, index, onJump }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onJump(i)}
          className={cx(
            "h-2.5 rounded-full transition border",
            i === index ? "w-7 bg-cyan-400/30 border-cyan-400/50" : "w-2.5 bg-slate-900/50 border-slate-800 hover:bg-slate-800"
          )}
          aria-label={`Go to step ${i + 1}`}
          title={`Step ${i + 1}`}
        />
      ))}
    </div>
  );
}

function BottomDock({ slides, index, onJump }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[55]">
      <div className="mx-auto max-w-7xl px-4 pb-4">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/85 backdrop-blur shadow-[0_0_60px_rgba(0,0,0,0.55)] p-2">
          <div className="grid grid-cols-6 gap-2">
            {slides.slice(0, 6).map((s, i) => {
              const active = i === index;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onJump(i)}
                  className={cx(
                    "h-12 rounded-2xl border flex items-center justify-center gap-2 text-[11px] font-semibold transition",
                    active
                      ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-200"
                      : "bg-slate-950/60 border-slate-800 text-slate-200 hover:bg-slate-900/50"
                  )}
                  title={s.title}
                >
                  <span className={cx(active ? "opacity-100" : "opacity-80")}>{s.icon}</span>
                  <span className="hidden sm:inline">{s.short}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
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
  const t = ticket || {};
  return t.assigned_business_card || null;
}

function assignedBusinessName(ticket) {
  const t = ticket || {};
  const card = assignedBusinessCard(t);
  const candidates = [
    t.assigned_business_name,
    card?.name,
    t.business_name,
    t.business?.name,
    t.assigned_business?.name,
  ]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);
  return candidates[0] || "";
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
    <div className="rounded-3xl border border-slate-800 bg-slate-950/30 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-extrabold">Assigned Provider</div>
          <div className="text-xs text-slate-400 mt-1">
            This is the business currently attached to your ticket.
          </div>
        </div>

        {name ? <SmallPill tone="emerald">Assigned</SmallPill> : <SmallPill tone="amber">Pending</SmallPill>}
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
          No provider is assigned yet. Once a business accepts or is assigned, their trust card will show here.
        </div>
      )}
    </div>
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
    return "/tickets";
  }, [returnTo, isCustomer]);

  const [ticket, setTicket] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  const ticketId = useMemo(() => Number(id), [id]);

  const [slide, setSlide] = useState(0);
  const swipeRef = useRef({ x: 0, y: 0, t: 0 });

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

  useEffect(() => {
    function onKey(e) {
      if (noteOpen) return;
      if (e.key === "ArrowLeft") setSlide((s) => Math.max(0, s - 1));
      if (e.key === "ArrowRight") setSlide((s) => Math.min(slidesRef.current.length - 1, s + 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [noteOpen]);

  const status = ticket?.status || "NEW";
  const isMarketplace = !!ticket?.is_marketplace;
  const assigned = !!assignedBusinessName(ticket);

  const completedAt = ticket?.completed_at || null;
  const invoicedAt = ticket?.invoiced_at || null;
  const paidAt = ticket?.paid_at || null;

  async function providerAction(actionName) {
    setErr("");
    try {
      await api.post(`/tickets/${id}/${actionName}/`);
      await loadTicket();
    } catch (e) {
      setErr(e?.response?.data?.detail || `Action failed: ${actionName}`);
    }
  }

  async function declineMarketplace() {
    setErr("");
    try {
      await api.post(`/tickets/${id}/decline_marketplace/`);
      await loadTicket();
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
      await api.post(`/ticket-messages/`, { ticket: ticketId, body });
      setNoteText("");
      setNoteOpen(false);
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

  const slides = useMemo(() => {
    if (isCustomer) {
      return [
        { id: "home", title: "Ticket Home", short: "Home", icon: <Icon name="slides" className="w-5 h-5" /> },
        { id: "messages", title: "Messages", short: "Chat", icon: <Icon name="chat" className="w-5 h-5" /> },
        { id: "invoice", title: "Invoice", short: "Invoice", icon: <Icon name="invoice" className="w-5 h-5" /> },
        { id: "files", title: "Files", short: "Files", icon: <Icon name="paperclip" className="w-5 h-5" /> },
      ];
    }

    return [
      { id: "overview", title: "Overview", short: "Overview", icon: <Icon name="slides" className="w-5 h-5" /> },
      { id: "messages", title: "Messages", short: "Chat", icon: <Icon name="chat" className="w-5 h-5" /> },
      { id: "work", title: "Work", short: "Work", icon: <Icon name="tools" className="w-5 h-5" /> },
      { id: "quote", title: "Quote", short: "Quote", icon: <Icon name="quote" className="w-5 h-5" /> },
      { id: "invoice", title: "Invoice", short: "Invoice", icon: <Icon name="invoice" className="w-5 h-5" /> },
      { id: "files", title: "Files", short: "Files", icon: <Icon name="paperclip" className="w-5 h-5" /> },
    ];
  }, [isCustomer]);

  useEffect(() => {
    if (slide >= slides.length) setSlide(slides.length - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length]);

  const slidesRef = useRef(slides);
  useEffect(() => {
    slidesRef.current = slides;
  }, [slides]);

  const activeSlide = slides[slide]?.id || (isCustomer ? "home" : "overview");

  function next() {
    setSlide((s) => Math.min(slides.length - 1, s + 1));
  }
  function prev() {
    setSlide((s) => Math.max(0, s - 1));
  }

  function onTouchStart(e) {
    const t = e.touches?.[0];
    if (!t) return;
    swipeRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  }
  function onTouchEnd(e) {
    const t0 = swipeRef.current;
    const t = e.changedTouches?.[0];
    if (!t || !t0) return;

    const dx = t.clientX - t0.x;
    const dy = t.clientY - t0.y;
    const dt = Date.now() - t0.t;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (dt < 800 && absX > 60 && absX > absY * 1.2) {
      if (dx < 0) next();
      if (dx > 0) prev();
    }
  }

  const customerName = getCustomerName(ticket);
  const { email: customerEmail, phone: customerPhone } = getCustomerContact(ticket);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 pb-[96px]">
      <ModeBar
        title={
          <div className="flex items-center gap-3">
            <img
              src="/tickets-icon.png"
              alt="Tickets"
              className="w-14 h-14 rounded-2xl border border-slate-800 bg-slate-950/40 object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="leading-tight">
              <div className="text-base font-semibold">{`#${id} • ${customerName}`}</div>
              <div className="text-xs text-slate-400">{`Status: ${statusLabel(status)}`}</div>

              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <SmallPill tone={status === "COMPLETED" || status === "PAID" ? "emerald" : "cyan"} icon={<Icon name="clock" className="w-3.5 h-3.5" />}>
                  {statusLabel(status)}
                </SmallPill>
                {isMarketplace ? <SmallPill tone="cyan">Marketplace</SmallPill> : <SmallPill>Direct</SmallPill>}
                {assigned ? <SmallPill tone="emerald">Assigned</SmallPill> : <SmallPill tone="amber">Unassigned</SmallPill>}
              </div>
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
              <Btn
                tone="slate"
                onClick={() => setNoteOpen(true)}
                leftIcon={<Icon name="note" className="w-4 h-4" />}
                title="Add a quick internal note to this ticket"
              >
                Quick Note
              </Btn>
            ) : null}

            <Btn onClick={loadTicket} disabled={loading} leftIcon={<Icon name="refresh" className="w-4 h-4" />}>
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
                <div className="text-xs text-slate-400 mt-1">Fast internal note — shows in the ticket message stream.</div>
              </div>
              <button
                className="h-10 w-10 rounded-2xl border border-slate-800 bg-slate-950/60 hover:bg-slate-900 flex items-center justify-center"
                onClick={() => {
                  if (!noteSaving) setNoteOpen(false);
                }}
                title="Close"
              >
                <Icon name="x" className="w-5 h-5" />
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
              <div className="text-[11px] text-slate-500">Tip: keep notes short and action-oriented.</div>
              <div className="flex gap-2">
                <Btn tone="slate" onClick={() => setNoteOpen(false)} disabled={noteSaving}>
                  Cancel
                </Btn>
                <Btn
                  tone="cyan"
                  onClick={postQuickNote}
                  disabled={noteSaving || !(noteText || "").trim()}
                  leftIcon={<Icon name="chat" className="w-4 h-4" />}
                >
                  {noteSaving ? "Saving…" : "Add Note"}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <main className="max-w-7xl mx-auto px-4 py-5 space-y-4">
        {err ? <div className="text-sm text-red-200 bg-red-900/10 border border-red-800 rounded-2xl p-3">{err}</div> : null}

        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <span className="opacity-90">{slides[slide]?.icon}</span>
                <span className="truncate">{slides[slide]?.title || "Ticket"}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Step {slide + 1} of {slides.length} • Swipe left/right on mobile
              </div>
            </div>

            <div className="flex items-center gap-2">
              <SlideDots count={slides.length} index={slide} onJump={setSlide} />
              <div className="hidden sm:flex items-center gap-2 ml-2">
                <Btn tone="slate" onClick={prev} disabled={slide === 0} leftIcon={<Icon name="chevL" className="w-4 h-4" />}>
                  Prev
                </Btn>
                <Btn tone="cyan" onClick={next} disabled={slide === slides.length - 1} leftIcon={<Icon name="chevR" className="w-4 h-4" />}>
                  Next
                </Btn>
              </div>
            </div>
          </div>
        </div>

        <div
          className="rounded-3xl border border-slate-800 bg-slate-950/40 overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="p-4 sm:p-6">
            {activeSlide === "home" ? (
              <div className="space-y-4">
                <div className="grid lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-5 space-y-4">
                    <div className="rounded-3xl border border-slate-800 bg-slate-950/30 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-extrabold text-lg">Ticket Summary</div>
                        <SmallPill tone="slate">Created {fmtPretty(ticket?.created_at)}</SmallPill>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Row k="Status" v={statusLabel(ticket?.status)} />
                        <Row k="Assigned" v={assigned ? "Yes" : "Not yet"} />
                        <Row k="Marketplace" v={ticket?.is_marketplace ? "Yes" : "No"} />
                        <Row k="ZIP" v={ticket?.service_zip || "—"} />
                        <Row k="Address" v={ticket?.service_address || "—"} />
                        <Row k="Category" v={ticket?.category_name || ticket?.category_path || (ticket?.category ? `#${ticket.category}` : "—")} />
                      </div>

                      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
                        <div className="text-[11px] text-slate-400">What happens next?</div>
                        <div className="text-sm text-slate-200 mt-1">
                          {assigned
                            ? "A provider is assigned. Use Messages for updates and pay the invoice when it’s ready."
                            : ticket?.is_marketplace
                            ? "Your request is in the Marketplace. A provider will accept it soon."
                            : "Your request is being routed to a provider directly."}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-800 bg-slate-950/30 p-5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="font-extrabold text-lg">Invoice</div>
                        <Btn tone="emerald" onClick={() => setSlide(slides.findIndex((s) => s.id === "invoice"))} leftIcon={<Icon name="invoice" className="w-4 h-4" />}>
                          Open Invoice →
                        </Btn>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Row k="Invoiced" v={fmtPretty(invoicedAt)} />
                        <Row k="Paid" v={fmtPretty(paidAt)} />
                      </div>
                      <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
                        <div className="text-[11px] text-slate-400">Invoiced → Paid</div>
                        <div className="text-sm font-semibold mt-1">{durationLabel(invoicedAt, paidAt)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-7 space-y-4">
                    <AssignedBusinessCardPanel ticket={ticket} onBookAgain={bookAgainWithAssignedBusiness} />

                    <div className="rounded-3xl border border-slate-800 bg-slate-950/30 p-5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <div className="text-lg font-extrabold">Messages</div>
                          <div className="text-xs text-slate-400 mt-1">Send updates, photos, access notes, anything needed.</div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Btn tone="cyan" onClick={() => setSlide(slides.findIndex((s) => s.id === "messages"))} leftIcon={<Icon name="chat" className="w-4 h-4" />}>
                            Open Chat →
                          </Btn>
                          <Btn tone="slate" onClick={() => setSlide(slides.findIndex((s) => s.id === "files"))} leftIcon={<Icon name="paperclip" className="w-4 h-4" />}>
                            Upload Files →
                          </Btn>
                        </div>
                      </div>

                      <div className="mt-4">
                        <MessagePanel ticketId={ticketId} />
                      </div>
                    </div>

                    {customerEmail || customerPhone ? (
                      <div className="rounded-3xl border border-slate-800 bg-slate-950/30 p-5">
                        <div className="font-extrabold text-lg">Your Contact</div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <Row k="Email" v={customerEmail || "—"} />
                          <Row k="Phone" v={customerPhone || "—"} />
                        </div>
                        <div className="text-[11px] text-slate-500 mt-3">
                          Providers may contact you using your consent settings (company phone). SyncWorks isn’t sending texts yet.
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {activeSlide === "overview" ? (
              <div className="space-y-4">
                <div className="grid lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-5 space-y-4">
                    <div className="rounded-3xl border border-slate-800 bg-slate-950/30 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-extrabold text-lg">Ticket Snapshot</div>
                        <SmallPill tone="slate">Created {fmtPretty(ticket?.created_at)}</SmallPill>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Row k="Status" v={statusLabel(ticket?.status)} />
                        <Row k="Marketplace" v={ticket?.is_marketplace ? "Yes" : "No"} />
                        <Row k="Category" v={ticket?.category_name || ticket?.category_path || (ticket?.category ? `#${ticket.category}` : "—")} />
                        <Row k="Service ZIP" v={ticket?.service_zip || "—"} />
                        <Row k="Radius" v={ticket?.service_radius_miles ? `${ticket.service_radius_miles} mi` : "—"} />
                        <Row k="Assigned" v={assigned ? "Yes" : "No"} />
                      </div>

                      {ticket?.service_address ? (
                        <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
                          <div className="text-[11px] text-slate-400">Service Address</div>
                          <div className="text-sm font-semibold mt-1">{ticket.service_address}</div>
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-3xl border border-slate-800 bg-slate-950/30 p-5">
                      <div className="font-extrabold text-lg">Customer</div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Row k="Name" v={customerName || "—"} />
                        <Row k="Phone" v={customerPhone || "—"} />
                        <Row k="Email" v={customerEmail || "—"} />
                        <Row k="Text Consent" v="(shown in ticket notes if captured)" />
                      </div>
                      <div className="text-[11px] text-slate-500 mt-3">
                        If you don’t see phone/email here, the backend ticket serializer isn’t returning it yet — we can add it.
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-7 space-y-4">
                    <AssignedBusinessCardPanel ticket={ticket} onBookAgain={bookAgainWithAssignedBusiness} />

                    <div className="rounded-3xl border border-slate-800 bg-slate-950/30 p-5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="font-extrabold text-lg">Quick Actions</div>
                        <div className="flex gap-2 flex-wrap">
                          <Btn tone="cyan" onClick={() => setSlide(1)} leftIcon={<Icon name="chat" className="w-4 h-4" />}>
                            Messages →
                          </Btn>
                          <Btn tone="cyan" onClick={() => setSlide(2)} leftIcon={<Icon name="tools" className="w-4 h-4" />}>
                            Work →
                          </Btn>
                        </div>
                      </div>

                      <div className="mt-4 text-[11px] text-slate-500">
                        Marketplace tickets should remain Unassigned until accepted. Direct tickets can be assigned immediately.
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-800 bg-slate-950/30 p-5">
                      <div className="text-lg font-extrabold">Messages (fast view)</div>
                      <div className="mt-3">
                        <MessagePanel ticketId={ticketId} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {activeSlide === "messages" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="text-lg font-extrabold">Messages</div>
                    <div className="text-xs text-slate-400 mt-1">Customer + provider conversation lives here.</div>
                  </div>
                </div>
                <MessagePanel ticketId={ticketId} />
              </div>
            ) : null}

            {activeSlide === "work" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="text-lg font-extrabold">Work</div>
                    <div className="text-xs text-slate-400 mt-1">Provider workflow: accept → start → complete.</div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Btn tone="fuchsia" onClick={() => setSlide(slides.findIndex((s) => s.id === "quote"))} leftIcon={<Icon name="quote" className="w-4 h-4" />}>
                      Quote →
                    </Btn>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-950/30 p-5">
                  <div className="text-xs text-slate-400 mb-3">Provider actions</div>
                  <div className="flex gap-2 flex-wrap">
                    <Btn tone="cyan" onClick={() => providerAction("accept")} disabled={loading}>
                      Accept
                    </Btn>

                    {isMarketplace && !assigned ? (
                      <Btn tone="rose" onClick={declineMarketplace} disabled={loading} leftIcon={<Icon name="x" className="w-4 h-4" />}>
                        Decline
                      </Btn>
                    ) : null}

                    <Btn tone="cyan" onClick={() => providerAction("start")} disabled={loading}>
                      Start
                    </Btn>

                    <Btn tone="emerald" onClick={() => providerAction("complete")} disabled={loading}>
                      Complete
                    </Btn>

                    <Btn tone="rose" onClick={() => providerAction("cancel")} disabled={loading} leftIcon={<Icon name="x" className="w-4 h-4" />}>
                      Cancel
                    </Btn>
                  </div>
                </div>
              </div>
            ) : null}

            {activeSlide === "quote" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="text-lg font-extrabold">Quote</div>
                    <div className="text-xs text-slate-400 mt-1">Build the estimate.</div>
                  </div>
                </div>

                <QuotePanel ticketId={ticketId} canCreate={isSboLike} canApprove={false} onAfterChange={loadTicket} />
              </div>
            ) : null}

            {activeSlide === "invoice" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="text-lg font-extrabold">Invoice</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {isCustomer ? "Review and pay your invoice." : "Build it fast, then mark it ready for payment."}
                    </div>
                  </div>
                </div>

                {isCustomer ? (
                  <CustomerInvoicePanel
                    ticketId={ticketId}
                    invoice={ticket?.latest_invoice || null}
                    onAfterPay={loadTicket}
                  />
                ) : (
                  <InvoicePanel
                    ticketId={ticketId}
                    ticket={ticket}
                    onAfterChange={loadTicket}
                  />
                )}
              </div>
            ) : null}

            {activeSlide === "files" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="text-lg font-extrabold">Files</div>
                    <div className="text-xs text-slate-400 mt-1">Photos, docs, receipts.</div>
                  </div>
                </div>

                <AttachmentPanel ticketId={ticketId} canUpload={isCustomer || isSboLike} />
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-800 bg-slate-950/50 p-3 flex items-center justify-between sm:hidden">
            <button
              type="button"
              onClick={prev}
              disabled={slide === 0}
              className="h-10 px-4 rounded-2xl border border-slate-800 bg-slate-950/60 text-slate-200 disabled:opacity-50"
            >
              Prev
            </button>
            <div className="text-[11px] text-slate-400">
              {slide + 1}/{slides.length}
            </div>
            <button
              type="button"
              onClick={next}
              disabled={slide === slides.length - 1}
              className="h-10 px-4 rounded-2xl border border-cyan-500/35 bg-cyan-500/15 text-cyan-200 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </main>

      <BottomDock slides={slides} index={slide} onJump={setSlide} />
    </div>
  );
}
