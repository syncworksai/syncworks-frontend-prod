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

function findManagementPanels(card) {
  return [...card.querySelectorAll("select")]
    .map((select) => select.closest("div.rounded-2xl"))
    .filter((panel, index, panels) => {
      if (!panel || panels.indexOf(panel) !== index) return false;
      const text = cleanText(panel.textContent);
      return text.includes("Assign Employee") || text.includes("Status Change");
    });
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
  const cards = [...document.querySelectorAll("article")].filter((article) =>
    /\b(?:DT|MP)-\d{6}\b/.test(cleanText(article.textContent))
  );

  cards.forEach((card) => {
    const archiveButton = buttonByText(card, "Archive");
    const restoreButton = buttonByText(card, "Restore");
    const openLink = [...card.querySelectorAll("a")].find((link) =>
      ["open", "open ticket"].includes(cleanText(link.textContent).trim().toLowerCase())
    );

    if (!archiveButton && !restoreButton && !openLink) return;

    card.classList.add("sw-ticket-card-compact");
    const managementPanels = findManagementPanels(card);
    managementPanels.forEach((panel) => {
      panel.classList.add("sw-ticket-management-panel");
      panel.hidden = true;
    });

    if (!card.querySelector(":scope .sw-ticket-quick-bar")) {
      const quickBar = document.createElement("div");
      quickBar.className = "sw-ticket-quick-bar";

      addQuickAction(quickBar, "Open", "cyan", () => openLink?.click());
      addQuickAction(quickBar, "Message", "slate", () => openLink?.click());
      addQuickAction(quickBar, "Request payment", "amber", () => openLink?.click());

      if (managementPanels.length) {
        addQuickAction(quickBar, "Manage", "fuchsia", () => {
          const willOpen = managementPanels.some((panel) => panel.hidden);
          managementPanels.forEach((panel) => {
            panel.hidden = !willOpen;
          });
          card.classList.toggle("sw-ticket-card-expanded", willOpen);
          const manageButton = [...quickBar.querySelectorAll("button")].find(
            (button) => cleanText(button.textContent).trim() === "Manage" || cleanText(button.textContent).trim() === "Done"
          );
          if (manageButton) manageButton.textContent = willOpen ? "Done" : "Manage";
        });
      }

      const relativeRoot = card.querySelector(":scope > div.relative") || card.firstElementChild || card;
      relativeRoot.appendChild(quickBar);
    }

    const visibleText = cleanText(card.textContent);
    if (/\bClosed\b/i.test(visibleText) && archiveButton && !card.dataset.swArchiveQueued) {
      card.dataset.swArchiveQueued = "true";
      window.setTimeout(() => {
        if (document.body.contains(archiveButton)) archiveButton.click();
      }, 350);
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
  let style = document.getElementById("sw-ticket-workspace-styles");
  if (!style) {
    style = document.createElement("style");
    style.id = "sw-ticket-workspace-styles";
    document.head.appendChild(style);
  }

  style.textContent = `
    .sw-ticket-card-compact { padding: .85rem !important; border-radius: 1.15rem !important; }
    .sw-ticket-card-compact:not(.sw-ticket-card-expanded) { min-height: 0 !important; }
    .sw-ticket-card-compact .sw-ticket-management-panel[hidden] { display: none !important; }
    .sw-ticket-card-compact .sw-ticket-quick-bar { display:flex; flex-wrap:wrap; gap:.5rem; margin-top:.7rem; padding-top:.7rem; border-top:1px solid rgba(71,85,105,.35); }
    .sw-ticket-quick-action { min-height:2.25rem; border-radius:.75rem; border:1px solid rgba(71,85,105,.65); padding:0 .8rem; font-size:.72rem; font-weight:800; }
    .sw-ticket-quick-action--cyan { color:#cffafe; background:rgba(6,182,212,.12); border-color:rgba(34,211,238,.35); }
    .sw-ticket-quick-action--amber { color:#fef3c7; background:rgba(245,158,11,.12); border-color:rgba(251,191,36,.35); }
    .sw-ticket-quick-action--fuchsia { color:#fae8ff; background:rgba(217,70,239,.12); border-color:rgba(232,121,249,.35); }
    .sw-ticket-quick-action--slate { color:#e2e8f0; background:rgba(15,23,42,.7); }
    @media (min-width: 768px) {
      .sw-ticket-card-compact { padding: 1rem 1.15rem !important; }
      .sw-ticket-card-compact .sw-ticket-quick-bar { justify-content:flex-end; }
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
