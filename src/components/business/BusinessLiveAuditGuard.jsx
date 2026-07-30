import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";

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

function buttonByText(root, label) {
  return [...root.querySelectorAll("button")].find(
    (button) => cleanText(button.textContent).trim().toLowerCase() === label.toLowerCase()
  );
}

function ticketCardFromButton(button) {
  let current = button?.parentElement;
  while (current && current !== document.body) {
    const text = cleanText(current.textContent);
    if (/\b(?:DT|MP)-\d{6}\b/.test(text) && text.includes("Archive") && text.includes("Open")) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

function addQuickAction(bar, label, tone, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.className = `sw-ticket-quick-action sw-ticket-quick-action--${tone}`;
  button.addEventListener("click", onClick);
  bar.appendChild(button);
}

function optimizeTicketCards() {
  const archiveButtons = [...document.querySelectorAll("button")].filter(
    (button) => cleanText(button.textContent).trim() === "Archive"
  );

  archiveButtons.forEach((archiveButton) => {
    const card = ticketCardFromButton(archiveButton);
    if (!card || card.dataset.swCompactTicket === "true") return;

    card.dataset.swCompactTicket = "true";
    card.classList.add("sw-ticket-card-compact");

    const text = cleanText(card.textContent);
    const statusArea = [...card.querySelectorAll("div")].find((node) => {
      const own = cleanText(node.textContent);
      return own.includes("Assign Employee") && own.includes("Status Change");
    });

    if (statusArea) {
      statusArea.classList.add("sw-ticket-management-panel");
      statusArea.hidden = true;
    }

    const quickBar = document.createElement("div");
    quickBar.className = "sw-ticket-quick-bar";

    const openButton = buttonByText(card, "Open");
    addQuickAction(quickBar, "Open", "cyan", () => openButton?.click());
    addQuickAction(quickBar, "Message", "slate", () => {
      if (openButton) openButton.click();
    });
    addQuickAction(quickBar, "Request payment", "amber", () => {
      if (openButton) openButton.click();
    });

    if (statusArea) {
      addQuickAction(quickBar, "Manage", "fuchsia", () => {
        statusArea.hidden = !statusArea.hidden;
        card.classList.toggle("sw-ticket-card-expanded", !statusArea.hidden);
      });
    }

    const actionHost = archiveButton.parentElement || card;
    actionHost.parentElement?.insertBefore(quickBar, actionHost.nextSibling);

    if (/\bCLOSED\b/i.test(text) && !card.dataset.swArchiveQueued) {
      card.dataset.swArchiveQueued = "true";
      window.setTimeout(() => {
        if (document.body.contains(archiveButton)) archiveButton.click();
      }, 250);
    }
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
      next =
        "Stripe Business pricing is not configured on the server yet. Your service catalog is complete; subscription checkout is the remaining setup item.";
    }
    if (next.trim() === "Profile completion") next = "Business setup completion";
    if (next.trim() === "Finish setup to start converting customers") {
      const pageText = document.body?.innerText || "";
      if (pageText.includes("5/6 complete") && pageText.includes("Service catalog")) {
        next = "Only Stripe payments remain";
      }
    }
    if (next.trim() === "+ New Ticket") next = "+ New Job Request";
    if (next.includes("Ticket #, category, zip, address, customer")) {
      next = "Job #, service, ZIP, address, or customer";
    }
    if (next !== original) node.nodeValue = next;
  });
}

function installTicketStyles() {
  if (document.getElementById("sw-ticket-workspace-styles")) return;
  const style = document.createElement("style");
  style.id = "sw-ticket-workspace-styles";
  style.textContent = `
    .sw-ticket-card-compact { padding: 1rem !important; border-radius: 1.25rem !important; }
    .sw-ticket-card-compact:not(.sw-ticket-card-expanded) { min-height: 0 !important; }
    .sw-ticket-card-compact .sw-ticket-management-panel[hidden] { display: none !important; }
    .sw-ticket-quick-bar { display:flex; flex-wrap:wrap; gap:.5rem; margin-top:.75rem; padding-top:.75rem; border-top:1px solid rgba(71,85,105,.35); }
    .sw-ticket-quick-action { min-height:2.25rem; border-radius:.75rem; border:1px solid rgba(71,85,105,.65); padding:0 .8rem; font-size:.72rem; font-weight:800; }
    .sw-ticket-quick-action--cyan { color:#cffafe; background:rgba(6,182,212,.12); border-color:rgba(34,211,238,.35); }
    .sw-ticket-quick-action--amber { color:#fef3c7; background:rgba(245,158,11,.12); border-color:rgba(251,191,36,.35); }
    .sw-ticket-quick-action--fuchsia { color:#fae8ff; background:rgba(217,70,239,.12); border-color:rgba(232,121,249,.35); }
    .sw-ticket-quick-action--slate { color:#e2e8f0; background:rgba(15,23,42,.7); }
    @media (min-width: 768px) {
      .sw-ticket-card-compact { padding: 1.1rem 1.25rem !important; }
      .sw-ticket-quick-bar { justify-content:flex-end; }
    }
  `;
  document.head.appendChild(style);
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
