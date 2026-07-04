import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";
import { useAuth } from "../auth/AuthContext";

import MessagePanel from "../components/tickets/MessagePanel";
import AttachmentPanel from "../components/tickets/AttachmentPanel";
import QuotePanel from "../components/tickets/QuotePanel";
import InvoicePanel from "../components/tickets/InvoicePanel";
import CustomerInvoicePanel from "../components/tickets/CustomerInvoicePanel";
import TicketWorkspaceNav from "../components/tickets/TicketWorkspaceNav";
import TicketSummaryRail from "../components/tickets/TicketSummaryRail";
import TicketHeaderCard from "../components/tickets/TicketHeaderCard";
import TicketQuickFactsCard from "../components/tickets/TicketQuickFactsCard";
import TicketCustomerCard from "../components/tickets/TicketCustomerCard";
import TicketLifecycleCard from "../components/tickets/TicketLifecycleCard";
import TicketArchiveToolsCard from "../components/tickets/TicketArchiveToolsCard";
import TicketNextActionCard from "../components/tickets/TicketNextActionCard";
import CustomerRequestTracker from "../components/tickets/CustomerRequestTracker";
import CustomerCompletionReviewCard from "../components/tickets/CustomerCompletionReviewCard";
import TicketCommandCenter from "../components/tickets/TicketCommandCenter";
import { providerFromTicket, saveProvider } from "../utils/savedProviders";

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
  if (s === "INVOICED" || s === "AWAITING_APPROVAL" || s === "SENT") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  if (s === "SCHEDULED") return "border-sky-500/30 bg-sky-500/10 text-sky-200";
  if (s === "ACCEPTED") return "border-violet-500/30 bg-violet-500/10 text-violet-200";
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

function statusLabel(s) {
  return STATUS_LABELS[upperStatus(s)] || s || "--";
}

function fmtPretty(iso) {
  if (!iso) return "--";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "--";
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
    sky: "bg-sky-500/15 border-sky-500/30 hover:bg-sky-500/20 text-sky-200",
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

function GlowStat({ label, value, tone = "slate" }) {
  const tones = {
    slate: "border-slate-800 bg-slate-950/40 text-slate-100",
    cyan: "border-cyan-500/20 bg-cyan-500/10 text-cyan-100",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-100",
    fuchsia: "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-100",
    sky: "border-sky-500/20 bg-sky-500/10 text-sky-100",
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

function makeTicketCode(ticket) {
  if (ticket?.ticket_code) return ticket.ticket_code;
  const num = Number(ticket?.id || 0);
  if (!num) return "DT-000000";
  const prefix = ticket?.is_marketplace ? "MP" : "DT";
  return `${prefix}-${String(num).padStart(6, "0")}`;
}

function extractIntakeJson(description) {
  const raw = String(description || "");
  const marker = "SyncWorks Intake:";
  const idx = raw.indexOf(marker);
  if (idx === -1) {
    return { summary: raw.trim(), intake: null };
  }

  const summary = raw.slice(0, idx).trim();
  const jsonPart = raw.slice(idx + marker.length).trim();

  try {
    const parsed = JSON.parse(jsonPart);
    return { summary, intake: parsed };
  } catch {
    return { summary: raw.trim(), intake: null };
  }
}

function humanPaymentPref(ticket, intake) {
  const intakePref = intake?.payment?.preference || "";
  if (intakePref === "CARD_ON_FILE") return "Card";
  if (intakePref === "CASH") return "Cash";
  if (intakePref === "PAY_LATER") return "Invoice";

  const t = upperStatus(ticket?.payment_method);
  if (t === "CARD") return "Card";
  if (t === "CASH") return "Cash";
  if (t === "OTHER") return "Other";
  return "--";
}

function humanContactPref(intake) {
  const v = intake?.lead?.contact_preference || intake?.contact_preference || "";
  if (!v) return "--";
  if (v === "call") return "Call";
  if (v === "text") return "Text";
  if (v === "email") return "Email";
  if (v === "any") return "Any";
  if (v === "either") return "Call or Text";
  return String(v);
}

function humanSmsAllowed(intake) {
  const pref = intake?.lead?.contact_preference || intake?.contact_preference || "";
  if (pref === "text" || pref === "either") return "Yes";
  if (pref === "call" || pref === "email") return "No";
  return "--";
}

function bestPhoneFromIntakeOrTicket(intake, ticketPhone) {
  return intake?.best_phone || intake?.customer_phone || ticketPhone || "";
}

function cityStateFromIntake(intake) {
  const city = intake?.routing?.service_city || "";
  const state = intake?.routing?.service_state || "";
  if (city && state) return `${city}, ${state}`;
  return city || state || "";
}

function workTypeFromTicket(ticket, intake) {
  return intake?.category_path || ticket?.category_path || ticket?.category_name || "--";
}

function detailSummaryFromTicket(ticket) {
  const sr = ticket?.service_request_detail || ticket?.service_request || null;
  const base = sr?.description || ticket?.description || "";
  return extractIntakeJson(base).summary || "";
}

function intakeFromTicket(ticket) {
  const sr = ticket?.service_request_detail || ticket?.service_request || null;
  const base = sr?.description || ticket?.description || "";
  return extractIntakeJson(base).intake;
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

function currentUserIdFromMe(me) {
  return Number(me?.id || me?.user?.id || 0);
}

function canManageScheduleFromMode(mode) {
  return mode === "SBO" || mode === "PM" || mode === "PROPERTY_MGR";
}

function AssignedBusinessCardPanel({ ticket, onBookAgain, onSaveProvider }) {
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
            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
              <div className="text-[11px] text-slate-400">Phone</div>
              <div className="text-sm font-semibold mt-1">{phone || "--"}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
              <div className="text-[11px] text-slate-400">Email</div>
              <div className="text-sm font-semibold mt-1">{email || "--"}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
              <div className="text-[11px] text-slate-400">Location</div>
              <div className="text-sm font-semibold mt-1">{location || "--"}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
              <div className="text-[11px] text-slate-400">Website</div>
              <div className="text-sm font-semibold mt-1">{website || "--"}</div>
            </div>
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

            <Btn tone="emerald" onClick={onSaveProvider}>
              Save Provider
            </Btn>
            <Btn tone="cyan" onClick={onBookAgain}>
              New Request
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

function OperationsControlCard({
  ticket,
  members,
  loading,
  assignBusy,
  actionBusy,
  manualBusy,
  assignValue,
  setAssignValue,
  manualStatus,
  setManualStatus,
  onAssign,
  onAccept,
  onSchedule,
  onEnRoute,
  onOnSite,
  onStart,
  onComplete,
  onManualStatus,
  canAssign,
  canSchedule,
  canEnRoute,
  canOnSite,
  canStart,
  canComplete,
  canStatusChange,
  assignedMemberDisplay,
  currentRoleLabel,
}) {
  const status = upperStatus(ticket?.status);
  const isMarketplace = !!ticket?.is_marketplace;
  const assignedBusiness = !!ticket?.assigned_business_id;
  const availableTeam = (members || []).filter((m) => upperStatus(m?.role) !== "CUSTOMER");

  const nextStep =
    status === "NEW" || status === "ASSIGNED"
      ? "Accept"
      : status === "ACCEPTED"
      ? "Schedule"
      : status === "SCHEDULED"
      ? "En Route"
      : status === "EN_ROUTE"
      ? "On Site"
      : status === "ON_SITE"
      ? "Start"
      : status === "IN_PROGRESS"
      ? "Complete"
      : status === "APPROVED"
      ? "Start or Complete"
      : "No workflow action";

  const showAccept = ["NEW", "ASSIGNED"].includes(status);
  const showSchedule = ["NEW", "ASSIGNED", "ACCEPTED"].includes(status);
  const showEnRoute = ["SCHEDULED", "ACCEPTED"].includes(status);
  const showOnSite = ["EN_ROUTE", "SCHEDULED", "ACCEPTED"].includes(status);
  const showStart = ["ACCEPTED", "SCHEDULED", "EN_ROUTE", "ON_SITE", "APPROVED"].includes(status);
  const showComplete = ["IN_PROGRESS", "ON_SITE", "EN_ROUTE", "SCHEDULED", "ACCEPTED", "APPROVED"].includes(status);

  return (
    <div className="rounded-3xl border border-cyan-500/30 bg-[linear-gradient(135deg,rgba(6,182,212,0.10),rgba(168,85,247,0.07))] p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-lg font-extrabold text-slate-100">Operations Control</div>
          <div className="text-xs text-slate-300/80 mt-1">
            Fast assign, status flow, and owner override.
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] px-2 py-1 rounded-full border border-slate-700 bg-slate-950/60 text-slate-100 font-semibold">
            Current: {statusLabel(ticket?.status)}
          </span>
          <span className="text-[11px] px-2 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 font-semibold">
            Next: {nextStep}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div id="ticket-assignment" className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="text-sm font-semibold text-slate-100">Assign Tech / Employee</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Pick who owns the ticket from here.
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
            <select
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-100"
              value={assignValue}
              onChange={(e) => setAssignValue(e.target.value)}
              disabled={!canAssign || assignBusy}
            >
              <option value="">
                {availableTeam.length ? "Select team memberâ€¦" : "No team members found"}
              </option>
              {availableTeam.map((m) => (
                <option key={m.id} value={String(m.id)}>
                  {displayMemberName(m)} â€¢ {roleLabel(m.role)}
                </option>
              ))}
            </select>

            <Btn
              tone="sky"
              onClick={onAssign}
              disabled={!canAssign || assignBusy || !assignValue}
              className="h-[50px] px-5"
            >
              {assignBusy ? "Savingâ€¦" : "Assign"}
            </Btn>
          </div>

          <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
            <div className="text-[11px] text-slate-400">Assigned team member</div>
            <div className="mt-1 text-sm font-semibold text-slate-100">
              {assignedMemberDisplay || "Nobody assigned yet."}
            </div>
          </div>
        </div>

        <div id="ticket-workflow-actions" className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="text-sm font-semibold text-slate-100">Guided Actions</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Fastest way to move the ticket in the right order.
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {showAccept ? (
              <Btn tone="cyan" onClick={onAccept} disabled={loading || actionBusy}>
                Accept
              </Btn>
            ) : null}

            {showSchedule ? (
              <Btn tone="amber" onClick={onSchedule} disabled={loading || actionBusy || !canSchedule}>
                Schedule
              </Btn>
            ) : null}

            {showEnRoute ? (
              <Btn tone="sky" onClick={onEnRoute} disabled={loading || actionBusy || !canEnRoute}>
                En Route
              </Btn>
            ) : null}

            {showOnSite ? (
              <Btn tone="fuchsia" onClick={onOnSite} disabled={loading || actionBusy || !canOnSite}>
                On Site
              </Btn>
            ) : null}

            {showStart ? (
              <Btn tone="cyan" onClick={onStart} disabled={loading || actionBusy || !canStart}>
                Start
              </Btn>
            ) : null}

            {showComplete ? (
              <Btn tone="emerald" onClick={onComplete} disabled={loading || actionBusy || !canComplete}>
                Complete
              </Btn>
            ) : null}
          </div>

          <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
            <div className="text-[11px] text-slate-400">Your access</div>
            <div className="mt-1 text-sm text-slate-100">{currentRoleLabel}</div>

            {!canSchedule && !canEnRoute && !canOnSite && !canStart && !canComplete ? (
              <div className="mt-2 text-[11px] text-amber-300">
                You can view this, but current actions are limited by role or assignment.
              </div>
            ) : null}

            {isMarketplace && !assignedBusiness ? (
              <div className="mt-2 text-[11px] text-slate-400">
                Marketplace tickets must be accepted before normal workflow continues.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {canStatusChange ? (
        <div id="ticket-status-change" className="mt-4 rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-4">
          <div className="text-sm font-semibold text-slate-100">Status Change</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Owner/office override when you need to correct status manually.
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
            <select
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-100"
              value={manualStatus}
              onChange={(e) => setManualStatus(e.target.value)}
              disabled={manualBusy}
            >
              {STATUS_CHANGE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>

            <Btn
              tone="fuchsia"
              onClick={onManualStatus}
              disabled={manualBusy || !manualStatus || manualStatus === status}
              className="h-[50px] px-5"
            >
              {manualBusy ? "Updatingâ€¦" : "Update Status"}
            </Btn>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CustomerOverviewCard({ ticket, ticketCode, onOpenMessages, onOpenFiles, onOpenInvoice }) {
  const invoice = ticket?.latest_invoice || ticket?.invoice || null;
  const invoiceReady = !!invoice?.id;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-lg font-extrabold">Ticket Overview</div>
          <div className="text-xs text-slate-400 mt-1">
            Messages, photos, and payment live here for customers.
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Btn tone="slate" onClick={onOpenMessages}>
            Messages
          </Btn>
          <Btn tone="slate" onClick={onOpenFiles}>
            Files
          </Btn>
          <Btn tone={invoiceReady ? "cyan" : "slate"} onClick={onOpenInvoice}>
            {invoiceReady ? "Open Invoice" : "Invoice Pending"}
          </Btn>
        </div>
      </div>

      <div className="mt-4 grid md:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
          <div className="text-[11px] text-slate-400">Ticket #</div>
          <div className="mt-1 text-sm font-semibold">{ticketCode || "--"}</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
          <div className="text-[11px] text-slate-400">Status</div>
          <div className="mt-1 text-sm font-semibold">{statusLabel(ticket?.status)}</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
          <div className="text-[11px] text-slate-400">Category</div>
          <div className="mt-1 text-sm font-semibold">{ticket?.category_name || ticket?.category_path || "--"}</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
          <div className="text-[11px] text-slate-400">Routing</div>
          <div className="mt-1 text-sm font-semibold">{ticket?.is_marketplace ? "Marketplace" : "Direct"}</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
          <div className="text-[11px] text-slate-400">Service Address</div>
          <div className="mt-1 text-sm font-semibold">{ticket?.service_address || "--"}</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
          <div className="text-[11px] text-slate-400">ZIP</div>
          <div className="mt-1 text-sm font-semibold">{ticket?.service_zip || "--"}</div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/30 p-4 text-sm text-slate-300">
        You can message the business, upload photos, and pay when the final invoice is ready.
      </div>
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
  const { mode, activeBusinessId } = useAuth();

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
  const [me, setMe] = useState(null);
  const [members, setMembers] = useState([]);
  const [assignValue, setAssignValue] = useState("");
  const [manualStatus, setManualStatus] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [assignBusy, setAssignBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [manualBusy, setManualBusy] = useState(false);

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  const tabs = useMemo(() => {
    if (isCustomer) {
      return [
        { key: "overview", label: "Overview", icon: <IconOverview /> },
        { key: "messages", label: "Messages", icon: <IconChat /> },
        { key: "files", label: "Files", icon: <IconFiles /> },
        { key: "invoice", label: "Invoice", icon: <IconInvoice /> },
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

  const loadMe = useCallback(async () => {
    try {
      const res = await api.get("/auth/me/");
      setMe(res.data || null);
    } catch {
      setMe(null);
    }
  }, []);

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

  const loadMembers = useCallback(async () => {
    if (!activeBusinessId || isCustomer) {
      setMembers([]);
      return;
    }

    try {
      const res = await api.get(`/businesses/${activeBusinessId}/members/`);
      const list = Array.isArray(res?.data) ? res.data : res?.data?.results || [];
      setMembers(list);
    } catch {
      setMembers([]);
    }
  }, [activeBusinessId, isCustomer]);

  useEffect(() => {
    loadTicket();
    loadMe();
    loadMembers();

    function onBizChanged() {
      loadTicket();
      loadMe();
      loadMembers();
    }

    window.addEventListener("sw:activeBusinessChanged", onBizChanged);
    return () => window.removeEventListener("sw:activeBusinessChanged", onBizChanged);
  }, [loadTicket, loadMe, loadMembers]);

  useEffect(() => {
    const currentAssigned = String(ticket?.assigned_member || ticket?.assigned_member_id || "");
    setAssignValue(currentAssigned);
    setManualStatus(upperStatus(ticket?.status));
  }, [ticket?.assigned_member, ticket?.assigned_member_id, ticket?.status]);

  async function providerAction(actionName) {
    setErr("");
    setActionBusy(true);
    try {
      await api.post(`/tickets/${id}/${actionName}/`);
      await loadTicket();
      if (actionName === "start") {
        setActiveTab("work");
      }
    } catch (e) {
      setErr(e?.response?.data?.detail || `Action failed: ${actionName}`);
    } finally {
      setActionBusy(false);
    }
  }

  async function assignTechnician() {
    if (!assignValue) return;
    setErr("");
    setAssignBusy(true);
    try {
      await api.post(`/tickets/${id}/assign_member/`, {
        business_member_id: Number(assignValue),
      });
      await loadTicket();
      await loadMembers();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to assign team member.");
    } finally {
      setAssignBusy(false);
    }
  }

  async function manualSetStatus() {
    if (!manualStatus) return;
    setErr("");
    setManualBusy(true);
    try {
      await api.post(`/tickets/${id}/set-status/`, {
        status: manualStatus,
      });
      await loadTicket();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to update ticket status.");
    } finally {
      setManualBusy(false);
    }
  }

  async function closeTicket() {
    setErr("");
    setActionBusy(true);
    try {
      await api.post(`/tickets/${id}/set-status/`, { status: "CLOSED" });
      await loadTicket();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to close ticket.");
    } finally {
      setActionBusy(false);
    }
  }

  function saveAssignedProvider() {
    const provider = providerFromTicket(ticket);
    if (!provider) {
      setErr("This ticket does not have a provider to save yet.");
      return;
    }
    saveProvider(provider);
    setErr("");
  }

  async function declineMarketplace() {
    setErr("");
    setActionBusy(true);
    try {
      await api.post(`/tickets/${id}/decline_marketplace/`);
      nav("/tickets?view=marketplace");
    } catch (e) {
      setErr(e?.response?.data?.detail || "Decline failed");
    } finally {
      setActionBusy(false);
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

  function exportTicketJson() {
    const payload = {
      exported_at: new Date().toISOString(),
      ticket_code: makeTicketCode(ticket),
      ticket,
      intake: intakeFromTicket(ticket),
      detail_summary: detailSummaryFromTicket(ticket),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${makeTicketCode(ticket)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const ticketCode = useMemo(() => makeTicketCode(ticket || { id: ticketId }), [ticket, ticketId]);
  const assignedName = assignedBusinessName(ticket);
  const customerName = getCustomerName(ticket);
  const { email: customerEmail, phone: ticketPhone } = getCustomerContact(ticket);
  const isMarketplace = !!ticket?.is_marketplace;
  const assigned = !!assignedName;
  const status = upperStatus(ticket?.status);

  const intake = useMemo(() => intakeFromTicket(ticket), [ticket]);
  const detailSummary = useMemo(() => detailSummaryFromTicket(ticket), [ticket]);

  const bestPhone = bestPhoneFromIntakeOrTicket(intake, ticketPhone);
  const providerPhone =
    assignedBusinessCard(ticket)?.phone ||
    ticket?.assigned_business?.phone ||
    ticket?.business?.phone ||
    "";
  const paymentPref = humanPaymentPref(ticket, intake);
  const contactPref = humanContactPref(intake);
  const smsAllowed = humanSmsAllowed(intake);
  const workType = workTypeFromTicket(ticket, intake);
  const cityState = cityStateFromIntake(intake) || [ticket?.city, ticket?.state].filter(Boolean).join(", ");
  const priority = intake?.priority || "--";

  const overviewStats = useMemo(() => {
    return {
      status: statusLabel(ticket?.status),
      source: isMarketplace ? "Marketplace" : "Direct",
      assigned: assigned ? "Yes" : "No",
      updated: fmtPretty(ticket?.updated_at),
    };
  }, [ticket, isMarketplace, assigned]);

  const currentUserId = currentUserIdFromMe(me);
  const assignedMemberUserId = Number(ticket?.assigned_member || ticket?.assigned_member_id || 0);

  const currentMember = useMemo(() => {
    if (!currentUserId) return null;
    return (members || []).find((m) => Number(m?.user || m?.user_id || m?.user?.id || 0) === currentUserId) || null;
  }, [members, currentUserId]);

  const currentMemberRole = upperStatus(currentMember?.role);
  const isOwner = mode === "SBO";
  const isDispatchLike =
    ["MANAGER", "DISPATCH", "ADMIN", "OWNER"].includes(currentMemberRole) ||
    isOwner ||
    canManageScheduleFromMode(mode);
  const isAssignedTech = !!currentUserId && !!assignedMemberUserId && currentUserId === assignedMemberUserId;
  const canAssign = isDispatchLike;
  const canSchedule = isDispatchLike;
  const canEnRoute = isAssignedTech || isOwner;
  const canOnSite = isAssignedTech || isOwner;
  const canStart = isAssignedTech || isOwner;
  const canComplete = isAssignedTech || isDispatchLike || isOwner;
  const canStatusChange = isDispatchLike || isOwner;

  const assignedMemberDisplay = useMemo(() => {
    const found = (members || []).find(
      (m) => String(m?.user || m?.user_id || m?.user?.id || "") === String(assignedMemberUserId)
    );
    return found ? `${displayMemberName(found)} â€¢ ${roleLabel(found?.role)}` : "";
  }, [members, assignedMemberUserId]);

  function openTicketSection(tab, elementId = "") {
    setActiveTab(tab);
    if (!elementId) return;
    window.requestAnimationFrame(() => {
      document.getElementById(elementId)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }

  function navigateTicketSection(sectionKey) {
    const routes = {
      contact: ["overview", ""],
      assignment: ["overview", "ticket-assignment"],
      schedule: ["overview", "ticket-workflow-actions"],
      workflow: ["overview", canStatusChange ? "ticket-status-change" : "ticket-workflow-actions"],
      notes: [isCustomer ? "messages" : "work", ""],
      files: ["files", ""],
      quote: ["quote", ""],
      invoice: ["invoice", ""],
      marketplace: ["overview", ""],
      archive: ["overview", ""],
    };

    const route = routes[sectionKey] || ["overview", ""];
    openTicketSection(route[0], route[1]);
  }
  const currentRoleLabel = useMemo(() => {
    if (isOwner) return "Owner access: assign, guide workflow, and override when needed.";
    if (currentMember) return `${roleLabel(currentMember.role)} access`;
    if (mode === "EMPLOYEE") return "Employee access";
    if (mode === "PM" || mode === "PROPERTY_MGR") return "Office access";
    return "Business access";
  }, [currentMember, isOwner, mode]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 pb-28 lg:pb-10">
      <ModeBar
        title={
          <div className="leading-tight">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-base font-semibold">{ticketCode}</div>
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
              Back
            </Link>

            {isSboLike && !isCustomer ? (
              <Btn tone="slate" onClick={() => setNoteOpen(true)}>
                Quick Note
              </Btn>
            ) : null}

            <Btn onClick={loadTicket} disabled={loading}>
              {loading ? "Refreshingâ€¦" : "Refresh"}
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
                  Fast internal note saved to the ticket messages.
                </div>
              </div>

              <button
                className="h-10 w-10 rounded-2xl border border-slate-800 bg-slate-950/60 hover:bg-slate-900 flex items-center justify-center"
                onClick={() => {
                  if (!noteSaving) setNoteOpen(false);
                }}
                title="Close"
              >
                x
              </button>
            </div>

            <textarea
              className="mt-4 w-full min-h-[140px] bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm outline-none focus:border-cyan-500/40"
              placeholder="Type your noteâ€¦"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              disabled={noteSaving}
            />

            <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
              <div className="text-[11px] text-slate-500">Keep it short and actionable.</div>
              <div className="flex gap-2">
                <Btn tone="slate" onClick={() => setNoteOpen(false)} disabled={noteSaving}>
                  Cancel
                </Btn>
                <Btn tone="cyan" onClick={postQuickNote} disabled={noteSaving || !(noteText || "").trim()}>
                  {noteSaving ? "Savingâ€¦" : "Add Note"}
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

        <TicketHeaderCard
          ticket={ticket}
          ticketCode={ticketCode}
          customerName={customerName}
          serviceAddress={ticket?.service_address || intake?.routing?.service_address || ""}
          workType={workType}
          status={ticket?.status}
          isMarketplace={isMarketplace}
          assignedName={assignedName}
          detailSummary={detailSummary}
          isCustomer={isCustomer}
        />

        <TicketNextActionCard
          workflow={ticket?.workflow}
          busy={actionBusy || loading}
          onAction={(action) => {
            if (!action) return;
            if (action.key === "ASSIGN_TECHNICIAN") {
              setActiveTab("overview");
              window.requestAnimationFrame(() => {
                document
                  .getElementById("ticket-assignment")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
              });
              return;
            }
            if (action.key === "CLOSE_TICKET") {
              closeTicket();
              return;
            }
            if (action.tab) {
              setActiveTab(action.tab);
              return;
            }
            const endpointAction = action.endpoint;
            if (endpointAction === "decline_marketplace") {
              declineMarketplace();
              return;
            }
            if (endpointAction) {
              providerAction(endpointAction);
            }
          }}
        />

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
          <GlowStat label="Status" value={overviewStats.status} tone="cyan" />
          <GlowStat label="Source" value={overviewStats.source} tone="fuchsia" />
          <GlowStat label="Assigned" value={overviewStats.assigned} tone="emerald" />
          <GlowStat label="Updated" value={overviewStats.updated} tone="sky" />
        </div>

        <TicketWorkspaceNav items={tabs} activeKey={activeTab} onChange={setActiveTab} isCustomer={isCustomer} />

        <div className="grid xl:grid-cols-12 gap-4">
          <aside className="xl:col-span-4">
            <TicketSummaryRail ticket={ticket} isCustomer={isCustomer} />
          </aside>

          <section className="xl:col-span-8 space-y-4">
            {activeTab === "overview" ? (
              <div className="space-y-4">
                {isCustomer ? (
                  <>
                    <CustomerRequestTracker
                      ticket={ticket}
                      onOpenMessages={() => setActiveTab("messages")}
                      onOpenFiles={() => setActiveTab("files")}
                      onOpenInvoice={() => setActiveTab("invoice")}
                    />
                    <CustomerOverviewCard
                      ticket={ticket}
                      ticketCode={ticketCode}
                      onOpenMessages={() => setActiveTab("messages")}
                      onOpenFiles={() => setActiveTab("files")}
                      onOpenInvoice={() => setActiveTab("invoice")}
                    />
                    <AssignedBusinessCardPanel
                      ticket={ticket}
                      onBookAgain={bookAgainWithAssignedBusiness}
                      onSaveProvider={saveAssignedProvider}
                    />
                    <CustomerCompletionReviewCard
                      ticket={ticket}
                      ticketId={ticketId}
                      onBookAgain={bookAgainWithAssignedBusiness}
                      onOpenMessages={() => setActiveTab("messages")}
                      onCloseTicket={closeTicket}
                      onAfterChange={loadTicket}
                      closeBusy={actionBusy}
                    />
                  </>
                ) : (
                  <>
                    <OperationsControlCard
                      ticket={ticket}
                      members={members}
                      loading={loading}
                      assignBusy={assignBusy}
                      actionBusy={actionBusy}
                      manualBusy={manualBusy}
                      assignValue={assignValue}
                      setAssignValue={setAssignValue}
                      manualStatus={manualStatus}
                      setManualStatus={setManualStatus}
                      onAssign={assignTechnician}
                      onAccept={() => providerAction("accept")}
                      onSchedule={() => providerAction("schedule")}
                      onEnRoute={() => providerAction("en-route")}
                      onOnSite={() => providerAction("on-site")}
                      onStart={() => providerAction("start")}
                      onComplete={() => providerAction("complete")}
                      onManualStatus={manualSetStatus}
                      canAssign={canAssign}
                      canSchedule={canSchedule}
                      canEnRoute={canEnRoute}
                      canOnSite={canOnSite}
                      canStart={canStart}
                      canComplete={canComplete}
                      canStatusChange={canStatusChange}
                      assignedMemberDisplay={assignedMemberDisplay}
                      currentRoleLabel={currentRoleLabel}
                    />

                    <TicketQuickFactsCard
                      paymentPref={paymentPref}
                      contactPref={contactPref}
                      bestPhone={bestPhone}
                      smsAllowed={smsAllowed}
                      categoryPath={workType}
                      priority={priority}
                      zip={ticket?.service_zip || intake?.routing?.service_zip || ""}
                      cityState={cityState}
                      isMarketplace={isMarketplace}
                    />

                    <TicketCustomerCard
                      customerName={customerName}
                      customerEmail={customerEmail}
                      customerPhone={bestPhone}
                      serviceAddress={ticket?.service_address || intake?.routing?.service_address || ""}
                      detailSummary={detailSummary}
                      onOpenMessages={() => setActiveTab("messages")}
                    />

                    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <div className="text-lg font-extrabold">Quote + Invoice Tools</div>
                          <div className="text-xs text-slate-400 mt-1">
                            Workflow stays up top. Billing tools stay here.
                          </div>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          <Btn tone="fuchsia" onClick={() => setActiveTab("quote")}>
                            Open Quote
                          </Btn>
                          <Btn tone="cyan" onClick={() => setActiveTab("invoice")}>
                            Open Invoice
                          </Btn>
                          {!isMarketplace && !["PAID", "COMPLETED", "CANCELLED", "CLOSED"].includes(status) ? (
                            <Btn tone="rose" onClick={() => providerAction("cancel")} disabled={loading || actionBusy}>
                              Cancel
                            </Btn>
                          ) : null}
                          {isMarketplace && !assigned && status === "NEW" ? (
                            <Btn tone="rose" onClick={declineMarketplace} disabled={loading || actionBusy}>
                              Deny Marketplace
                            </Btn>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <TicketLifecycleCard ticket={ticket} />

                    <TicketArchiveToolsCard
                      ticket={ticket}
                      ticketCode={ticketCode}
                      onExport={exportTicketJson}
                      onAfterChange={loadTicket}
                    />
                  </>
                )}
              </div>
            ) : null}

            {activeTab === "invoice" ? (
              isCustomer ? (
                <CustomerInvoicePanel
                  ticketId={ticketId}
                  invoice={ticket?.latest_invoice || ticket?.invoice || null}
                  onAfterPay={loadTicket}
                />
              ) : !isMarketplace ? (
                <InvoicePanel ticketId={ticketId} ticket={ticket} onAfterChange={loadTicket} />
              ) : (
                <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5 text-sm text-slate-400">
                  Invoice builder is only available after the ticket is assigned.
                </div>
              )
            ) : null}

            {activeTab === "quote" && !isCustomer && !isMarketplace ? (
              <QuotePanel ticketId={ticketId} ticket={ticket} onAfterChange={loadTicket} />
            ) : null}

            {activeTab === "messages" ? <MessagePanel ticketId={ticketId} isCustomer={isCustomer} /> : null}

            {activeTab === "work" && !isCustomer && !isMarketplace ? (
              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-lg font-extrabold">Work Notes</div>
                      <div className="text-xs text-slate-400 mt-1">
                        Arrival notes, on-site updates, and completion notes.
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
                      isCustomer={false}
                      title="Work Chat"
                      subtitle="Execution updates and internal job communication."
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === "files" ? (
              <AttachmentPanel ticketId={ticketId} canUpload={isCustomer || isSboLike} isCustomer={isCustomer} />
            ) : null}
          </section>
        </div>
      </main>

      <TicketCommandCenter
        isCustomer={isCustomer}
        isMarketplace={isMarketplace}
        customerPhone={bestPhone}
        providerPhone={providerPhone}
        canAssign={canAssign}
        canSchedule={canSchedule}
        canStatusChange={canStatusChange}
        canComplete={canComplete}
        onMessage={() => openTicketSection("messages")}
        onQuickNote={() => setNoteOpen(true)}
        onAssign={() => openTicketSection("overview", "ticket-assignment")}
        onSchedule={() => providerAction("schedule")}
        onUpdateStatus={() => openTicketSection("overview", "ticket-status-change")}
        onComplete={() => providerAction("complete")}
        onInvoice={() => openTicketSection("invoice")}
        onFiles={() => openTicketSection("files")}
        onNavigate={navigateTicketSection}
      /></div>
  );
}
