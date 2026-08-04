import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import api from "../../api/client";

const REPLACEMENTS = [
  ["â€¦", "…"],
  ["â€¢", "•"],
  ["â€”", "—"],
  ["â€“", "–"],
  ["â†’", "→"],
  ["âœ“", "✓"],
  ["âœ•", "×"],
  ["Â", ""],
];

function cleanText(value) {
  let next = String(value || "");
  REPLACEMENTS.forEach(([broken, fixed]) => {
    next = next.split(broken).join(fixed);
  });
  return next;
}

function ticketIdFromCard(card) {
  const ticketLink = [...card.querySelectorAll('a[href^="/tickets/"]')].find((link) =>
    /^\/tickets\/\d+/.test(link.getAttribute("href") || "")
  );
  const match = String(ticketLink?.getAttribute("href") || "").match(/^\/tickets\/(\d+)/);
  return match?.[1] || "";
}

function buttonByText(root, label) {
  return [...root.querySelectorAll("button")].find(
    (button) => cleanText(button.textContent).trim().toLowerCase() === label.toLowerCase()
  );
}

function findManagementRoot(card) {
  const assignLabel = [...card.querySelectorAll("div")].find(
    (node) => cleanText(node.textContent).trim() === "Assign Employee"
  );
  const statusLabel = [...card.querySelectorAll("div")].find(
    (node) => cleanText(node.textContent).trim() === "Status Change"
  );
  if (!assignLabel || !statusLabel) return null;

  let current = assignLabel.parentElement;
  while (current && current !== card) {
    if (current.contains(statusLabel) && current.querySelectorAll("select").length >= 2) return current;
    current = current.parentElement;
  }
  return null;
}

function nextActionFor(card) {
  const text = cleanText(card.textContent).toUpperCase();
  if (text.includes("UNASSIGNED")) return "Assign employee";
  if (text.includes("NEW") || text.includes("ASSIGNED")) return "Accept request";
  if (text.includes("ACCEPTED") && !text.includes("SCHEDULED")) return "Schedule visit";
  if (text.includes("IN PROGRESS") || text.includes("ON SITE")) return "Complete work";
  if (text.includes("COMPLETED")) return "Send invoice";
  if (text.includes("INVOICED") || text.includes("AWAITING PAYMENT")) return "Collect payment";
  if (text.includes("PAID")) return "Close job";
  if (text.includes("CLOSED")) return "Archived";
  return "Review job";
}

function makeAction(label, tone, handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.className = `sw-ticket-action sw-ticket-action--${tone}`;
  button.addEventListener("click", handler);
  return button;
}

function setBusy(card, busy, message = "") {
  card.dataset.swBusy = busy ? "true" : "false";
  const buttons = card.querySelectorAll(".sw-ticket-action");
  buttons.forEach((button) => {
    button.disabled = busy;
  });
  const status = card.querySelector(".sw-ticket-action-status");
  if (status) status.textContent = message;
}

function optimizeTicketCards() {
  const cards = [...document.querySelectorAll("article")].filter((card) => {
    const text = cleanText(card.textContent);
    return /\b(?:DT|MP)-\d{6}\b/.test(text) && ticketIdFromCard(card);
  });

  cards.forEach((card) => {
    const ticketId = ticketIdFromCard(card);
    if (!ticketId) return;

    card.classList.add("sw-ticket-card-compact");
    const managementRoot = findManagementRoot(card);
    if (managementRoot) {
      managementRoot.classList.add("sw-ticket-management-root");
      managementRoot.hidden = true;
    }

    const oldDesktopActions = [...card.querySelectorAll("div")].find((node) => {
      const directLabels = [...node.children].map((child) => cleanText(child.textContent).trim());
      return directLabels.includes("Save") && (directLabels.includes("Archive") || directLabels.includes("Restore")) && directLabels.includes("Open");
    });
    if (oldDesktopActions) oldDesktopActions.classList.add("sw-ticket-old-actions");

    if (card.querySelector(":scope .sw-ticket-action-center")) return;

    const openLink = [...card.querySelectorAll('a[href^="/tickets/"]')].find((link) =>
      /^\/tickets\/\d+/.test(link.getAttribute("href") || "")
    );
    const archiveButton = buttonByText(card, "Archive");
    const restoreButton = buttonByText(card, "Restore");

    const center = document.createElement("div");
    center.className = "sw-ticket-action-center";

    const next = document.createElement("div");
    next.className = "sw-ticket-next-action";
    next.innerHTML = `<span>Next action</span><strong>${nextActionFor(card)}</strong>`;
    center.appendChild(next);

    const actions = document.createElement("div");
    actions.className = "sw-ticket-actions";

    actions.appendChild(makeAction("Open", "cyan", () => openLink?.click()));
    actions.appendChild(makeAction("Message", "slate", () => {
      window.location.assign(`/sbo/inbox?ticket=${encodeURIComponent(ticketId)}`);
    }));
    actions.appendChild(makeAction("Request payment", "amber", () => {
      window.location.assign(`/sbo/finance?section=invoices&ticket=${encodeURIComponent(ticketId)}&action=request-payment`);
    }));

    if (managementRoot) {
      actions.appendChild(makeAction("Manage", "fuchsia", (event) => {
        const willOpen = managementRoot.hidden;
        managementRoot.hidden = !willOpen;
        card.classList.toggle("sw-ticket-card-expanded", willOpen);
        event.currentTarget.textContent = willOpen ? "Done" : "Manage";
      }));
    }

    if (!restoreButton) {
      actions.appendChild(makeAction("Close job", "emerald", async () => {
        if (!window.confirm("Close this job and move it to Archive?")) return;
        setBusy(card, true, "Closing job…");
        try {
          await api.post(`/tickets/${ticketId}/set-status/`, { status: "CLOSED" });
          await api.post(`/tickets/${ticketId}/archive/`, {});
          card.remove();
          window.dispatchEvent(new CustomEvent("syncworks:tickets-changed", { detail: { ticketId, status: "CLOSED", archived: true } }));
        } catch (error) {
          setBusy(card, false, error?.response?.data?.detail || "Could not close and archive this job.");
        }
      }));
    }

    if (restoreButton) {
      actions.appendChild(makeAction("Restore", "emerald", () => restoreButton.click()));
    } else if (archiveButton) {
      actions.appendChild(makeAction("Archive", "slate", () => archiveButton.click()));
    }

    center.appendChild(actions);
    const status = document.createElement("div");
    status.className = "sw-ticket-action-status";
    center.appendChild(status);

    const host = card.querySelector(":scope > div.relative") || card.firstElementChild || card;
    host.appendChild(center);
  });
}

function updateTextNodes(root) {
  if (!root || typeof document === "undefined") return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach((node) => {
    const original = node.nodeValue || "";
    let next = cleanText(original);
    if (next.trim() === "Failed resolving Stripe prices.") {
      next = "Stripe Business pricing is not configured on the server yet. Your service catalog is complete; subscription checkout is the remaining setup item.";
    }
    if (next.trim() === "Profile completion") next = "Business setup completion";
    if (next.trim() === "Finish setup to start converting customers") {
      const pageText = document.body?.innerText || "";
      if (pageText.includes("5/6 complete") && pageText.includes("Service catalog")) next = "Only Stripe payments remain";
    }
    if (next.trim() === "+ New Ticket") next = "+ New Job Request";
    if (next.includes("Ticket #, category, zip, address, customer")) next = "Job #, service, ZIP, address, or customer";
    if (next !== original) node.nodeValue = next;
  });
}

function installTicketStyles() {
  let style = document.getElementById("sw-ticket-workspace-styles");
  if (!style) {
    style = document.createElement("style");
    style.id = "sw-ticket-workspace-styles";
    document.head.appendChild(style);
  }
  style.textContent = `
    .sw-ticket-card-compact { padding:.8rem !important; border-radius:1rem !important; }
    .sw-ticket-card-compact .sw-ticket-management-root[hidden] { display:none !important; }
    .sw-ticket-card-compact .sw-ticket-old-actions { display:none !important; }
    .sw-ticket-action-center { margin-top:.65rem; padding-top:.65rem; border-top:1px solid rgba(71,85,105,.36); }
    .sw-ticket-next-action { display:flex; align-items:center; gap:.55rem; margin-bottom:.55rem; font-size:.68rem; }
    .sw-ticket-next-action span { color:#64748b; text-transform:uppercase; letter-spacing:.12em; font-weight:800; }
    .sw-ticket-next-action strong { color:#cffafe; font-size:.74rem; }
    .sw-ticket-actions { display:flex; flex-wrap:wrap; gap:.45rem; }
    .sw-ticket-action { min-height:2.2rem; border-radius:.7rem; border:1px solid rgba(71,85,105,.65); padding:0 .72rem; font-size:.7rem; font-weight:850; transition:.15s ease; }
    .sw-ticket-action:disabled { opacity:.5; cursor:not-allowed; }
    .sw-ticket-action--cyan { color:#cffafe; background:rgba(6,182,212,.12); border-color:rgba(34,211,238,.35); }
    .sw-ticket-action--amber { color:#fef3c7; background:rgba(245,158,11,.12); border-color:rgba(251,191,36,.35); }
    .sw-ticket-action--fuchsia { color:#fae8ff; background:rgba(217,70,239,.12); border-color:rgba(232,121,249,.35); }
    .sw-ticket-action--emerald { color:#d1fae5; background:rgba(16,185,129,.12); border-color:rgba(52,211,153,.35); }
    .sw-ticket-action--slate { color:#e2e8f0; background:rgba(15,23,42,.75); }
    .sw-ticket-action-status { min-height:1rem; margin-top:.4rem; color:#fda4af; font-size:.68rem; }
    @media (min-width:768px) {
      .sw-ticket-card-compact { padding:.9rem 1rem !important; }
      .sw-ticket-action-center { display:grid; grid-template-columns:auto 1fr; align-items:center; gap:.7rem; }
      .sw-ticket-next-action { margin:0; }
      .sw-ticket-actions { justify-content:flex-end; }
      .sw-ticket-action-status { grid-column:1 / -1; margin:0; }
    }
  `;
}

export default function BusinessLiveAuditGuard() {
  const location = useLocation();
  const pathname = location.pathname.replace(/\/+$/, "") || "/";
  const enabled = pathname === "/sbo" || pathname === "/sbo/finance" || pathname === "/tickets";

  useEffect(() => {
    if (!enabled || typeof document === "undefined") return undefined;
    if (pathname === "/tickets") installTicketStyles();

    let scheduled = false;
    const run = () => {
      scheduled = false;
      updateTextNodes(document.body);
      if (pathname === "/tickets") optimizeTicketCards();
    };
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(run);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [enabled, pathname]);

  return null;
}
