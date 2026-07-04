import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  FileText,
  MessageSquareText,
  MoreHorizontal,
  Phone,
  ReceiptText,
  UserRoundCheck,
  X,
} from "lucide-react";
import "./TicketCommandCenter.css";

function workflowStepLabel(status) {
  const normalized = String(status || "").trim().toUpperCase();

  if (["NEW", "ASSIGNED"].includes(normalized)) return "Accept";
  if (normalized === "ACCEPTED") return "Schedule";
  if (normalized === "SCHEDULED") return "En Route";
  if (normalized === "EN_ROUTE") return "On Site";
  if (normalized === "ON_SITE") return "Start";
  if (normalized === "IN_PROGRESS") return "Complete";
  if (normalized === "APPROVED") return "Start or Complete";
  if (["COMPLETED", "PAID", "CLOSED"].includes(normalized)) return "Complete";
  if (normalized === "CANCELLED") return "Cancelled";
  return "Review ticket";
}

function compactStatusLabel(status) {
  const normalized = String(status || "").trim();
  if (!normalized) return "Unknown";

  return normalized
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
function safeTelHref(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const hasLeadingPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7) return "";

  return `tel:${hasLeadingPlus ? "+" : ""}${digits}`;
}

function CommandButton({ icon, label, onClick, disabled = false, active = false, buttonRef = null }) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className={`sw-ticket-command-button ${active ? "is-active" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      {React.createElement(icon, { "aria-hidden": "true" })}
      <span>{label}</span>
    </button>
  );
}

function DrawerAction({ icon, label, description, onClick, disabled = false }) {
  return (
    <button
      type="button"
      className="sw-ticket-drawer-action"
      onClick={onClick}
      disabled={disabled}
    >
      <span className="sw-ticket-drawer-action-icon">
        {React.createElement(icon, { "aria-hidden": "true" })}
      </span>
      <span className="sw-ticket-drawer-action-copy">
        <strong>{label}</strong>
        {description ? <small>{description}</small> : null}
      </span>
    </button>
  );
}

function SectionButton({ label, description, onClick }) {
  return (
    <button type="button" className="sw-ticket-section-button" onClick={onClick}>
      <strong>{label}</strong>
      <small>{description}</small>
    </button>
  );
}

export default function TicketCommandCenter({
  isCustomer = false,
  isMarketplace = false,
  ticketCode = "Ticket",
  ticketStatus = "UNKNOWN",
  assignedName = "",
  customerPhone = "",
  providerPhone = "",
  canAssign = false,
  canSchedule = false,
  canStatusChange = false,
  canComplete = false,
  onMessage,
  onQuickNote,
  onAssign,
  onSchedule,
  onUpdateStatus,
  onComplete,
  onInvoice,
  onFiles,
  onNavigate,
  onOpenNextStep,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef(null);
  const actionTriggerRef = useRef(null);
  const phoneHref = useMemo(
    () => safeTelHref(isCustomer ? providerPhone : customerPhone),
    [customerPhone, isCustomer, providerPhone]
  );

  const pulseStatus = useMemo(
    () => compactStatusLabel(ticketStatus),
    [ticketStatus]
  );
  const pulseNextStep = useMemo(
    () => workflowStepLabel(ticketStatus),
    [ticketStatus]
  );
  const sectionItems = useMemo(() => {
    if (isCustomer) {
      return [
        { key: "contact", label: "Provider", description: "Provider and request details" },
        { key: "notes", label: "Activity", description: "Messages and updates" },
        { key: "files", label: "Photos & files", description: "Attachments and uploads" },
        { key: "invoice", label: "Invoice", description: "Payment and invoice status" },
      ];
    }

    const items = [
      { key: "contact", label: "Customer", description: "Contact and service details" },
    ];

    if (canAssign) {
      items.push({
        key: "assignment",
        label: "Assignment",
        description: "Technician or team member",
      });
    }

    if (canSchedule) {
      items.push({
        key: "schedule",
        label: "Schedule",
        description: "Timing and arrival flow",
      });
    }

    items.push(
      {
        key: "workflow",
        label: "Status & workflow",
        description: "Progress and lifecycle",
      },
      {
        key: "notes",
        label: "Notes & activity",
        description: "Work chat and updates",
      },
      {
        key: "files",
        label: "Photos & files",
        description: "Attachments and uploads",
      }
    );

    if (!isMarketplace) {
      items.push({
        key: "quote",
        label: "Quote",
        description: "Estimate and approval",
      });
    }

    items.push({
      key: "invoice",
      label: "Invoice & payment",
      description: "Billing tools and status",
    });

    if (isMarketplace) {
      items.push({
        key: "marketplace",
        label: "Marketplace",
        description: "Partner and routing details",
      });
    }

    items.push({
      key: "archive",
      label: "Archive & export",
      description: "Closeout and records",
    });

    return items;
  }, [canAssign, canSchedule, isCustomer, isMarketplace]);

  useEffect(() => {
    if (!drawerOpen) return undefined;

    const drawer = drawerRef.current;
    const focusableSelector = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(",");

    function focusableElements() {
      return Array.from(drawer?.querySelectorAll(focusableSelector) || []);
    }

    function onKeyDown(event) {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        return;
      }

      if (event.key !== "Tab") return;

      const elements = focusableElements();
      if (!elements.length) {
        event.preventDefault();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    const triggerElement = actionTriggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    window.requestAnimationFrame(() => {
      const elements = focusableElements();
      elements[0]?.focus();
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      window.requestAnimationFrame(() => triggerElement?.focus());
    };
  }, [drawerOpen]);

  function run(action) {
    setDrawerOpen(false);
    window.requestAnimationFrame(() => action?.());
  }

  function callNow() {
    if (!phoneHref) return;
    window.location.href = phoneHref;
  }

  return (
    <>
      <nav className="sw-ticket-command-center lg:hidden" aria-label="Ticket actions">
        <div className="sw-ticket-command-grid">
          <CommandButton icon={MessageSquareText} label="Message" onClick={onMessage} />
          <CommandButton
            icon={Phone}
            label={phoneHref ? "Call" : "No Phone"}
            onClick={callNow}
            disabled={!phoneHref}
          />
          <CommandButton
            icon={MoreHorizontal}
            label="Actions"
            onClick={() => setDrawerOpen(true)}
            active={drawerOpen}
            buttonRef={actionTriggerRef}
          />
          <CommandButton icon={ReceiptText} label="Invoice" onClick={onInvoice} />
          <CommandButton icon={FileText} label="Files" onClick={onFiles} />
        </div>
      </nav>

      <div className="sw-ticket-pulse lg:hidden" aria-label="Ticket status summary">
        <button
          type="button"
          className="sw-ticket-pulse-action"
          onClick={onOpenNextStep}
          aria-label={`Open next ticket step: ${pulseNextStep}`}
        >
          <span className="sw-ticket-pulse-copy">
            <span className="sw-ticket-pulse-main">
              <span className="sw-ticket-pulse-code">{ticketCode || "Ticket"}</span>
              <span className="sw-ticket-pulse-status">{pulseStatus}</span>
            </span>
            <span className="sw-ticket-pulse-meta">
              <span>{assignedName ? `Assigned: ${assignedName}` : "Unassigned"}</span>
              <span>Next: {pulseNextStep}</span>
            </span>
          </span>
          <span className="sw-ticket-pulse-open">Open</span>
        </button>
      </div>

      {drawerOpen ? (
        <div className="sw-ticket-drawer-layer lg:hidden" role="presentation">
          <button
            type="button"
            className="sw-ticket-drawer-backdrop"
            aria-label="Close ticket actions"
            onClick={() => setDrawerOpen(false)}
          />

          <section
            ref={drawerRef}
            className="sw-ticket-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ticket-action-drawer-title"
          >
            <div className="sw-ticket-drawer-handle" />

            <div className="sw-ticket-drawer-header">
              <div>
                <span>Ticket command center</span>
                <h2 id="ticket-action-drawer-title">
                  {isCustomer ? "Request actions" : "Business actions"}
                </h2>
              </div>
              <button
                type="button"
                className="sw-ticket-drawer-close"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close"
              >
                <X aria-hidden="true" />
              </button>
            </div>

            {!phoneHref ? (
              <div className="sw-ticket-drawer-notice">
                No valid phone number is available. Use SyncWorks messaging to keep communication attached to this ticket.
              </div>
            ) : null}

            <div className="sw-ticket-drawer-section">
              <div className="sw-ticket-drawer-section-heading">
                <span>Jump to section</span>
                <small>Move around this ticket without scrolling through everything.</small>
              </div>

              <div className="sw-ticket-section-grid">
                {sectionItems.map((item) => (
                  <SectionButton
                    key={item.key}
                    label={item.label}
                    description={item.description}
                    onClick={() => run(() => onNavigate?.(item.key))}
                  />
                ))}
              </div>
            </div>

            <div className="sw-ticket-drawer-section">
              <div className="sw-ticket-drawer-section-heading">
                <span>Quick actions</span>
                <small>Use existing role-aware ticket controls.</small>
              </div>

              <div className="sw-ticket-drawer-actions">
                <DrawerAction
                  icon={MessageSquareText}
                  label={isCustomer ? "Message provider" : "Message customer"}
                  description="Open the ticket conversation."
                  onClick={() => run(onMessage)}
                />
                <DrawerAction
                  icon={Phone}
                  label={phoneHref ? (isCustomer ? "Call provider" : "Call customer") : "No phone available"}
                  description={phoneHref ? "Use the supplied phone number." : "A valid number was not supplied."}
                  onClick={() => run(callNow)}
                  disabled={!phoneHref}
                />

                {isCustomer ? null : (
                  <>
                    <DrawerAction
                      icon={MessageSquareText}
                      label="Add quick note"
                      description="Save a short update to the ticket."
                      onClick={() => run(onQuickNote)}
                    />
                    {canAssign ? (
                      <DrawerAction
                        icon={UserRoundCheck}
                        label="Assign technician"
                        description="Open the existing team assignment controls."
                        onClick={() => run(onAssign)}
                      />
                    ) : null}
                    {canSchedule ? (
                      <DrawerAction
                        icon={CalendarDays}
                        label="Schedule"
                        description="Use the current ticket workflow action."
                        onClick={() => run(onSchedule)}
                      />
                    ) : null}
                    {canStatusChange ? (
                      <DrawerAction
                        icon={MoreHorizontal}
                        label="Update status"
                        description="Open the existing authorized status controls."
                        onClick={() => run(onUpdateStatus)}
                      />
                    ) : null}
                    {canComplete ? (
                      <DrawerAction
                        icon={CheckCircle2}
                        label="Complete work"
                        description="Use the existing completion permission and endpoint."
                        onClick={() => run(onComplete)}
                      />
                    ) : null}
                  </>
                )}

                <DrawerAction
                  icon={ReceiptText}
                  label="Open invoice"
                  description={isCustomer ? "Review the latest invoice." : "Open invoice tools."}
                  onClick={() => run(onInvoice)}
                />
                <DrawerAction
                  icon={FileText}
                  label="Open files"
                  description="View or upload ticket attachments."
                  onClick={() => run(onFiles)}
                />
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}