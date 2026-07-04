import React, { useEffect, useMemo, useState } from "react";
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

function safeTelHref(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const hasLeadingPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7) return "";

  return `tel:${hasLeadingPlus ? "+" : ""}${digits}`;
}

function CommandButton({ icon, label, onClick, disabled = false, active = false }) {
  return (
    <button
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
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const phoneHref = useMemo(
    () => safeTelHref(isCustomer ? providerPhone : customerPhone),
    [customerPhone, isCustomer, providerPhone]
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

    function onKeyDown(event) {
      if (event.key === "Escape") setDrawerOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
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
          />
          <CommandButton icon={ReceiptText} label="Invoice" onClick={onInvoice} />
          <CommandButton icon={FileText} label="Files" onClick={onFiles} />
        </div>
      </nav>

      {drawerOpen ? (
        <div className="sw-ticket-drawer-layer lg:hidden" role="presentation">
          <button
            type="button"
            className="sw-ticket-drawer-backdrop"
            aria-label="Close ticket actions"
            onClick={() => setDrawerOpen(false)}
          />

          <section
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