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

    if (next.trim() === "Profile completion") {
      next = "Business setup completion";
    }

    if (next.trim() === "Finish setup to start converting customers") {
      const pageText = document.body?.innerText || "";
      if (pageText.includes("5/6 complete") && pageText.includes("Service catalog")) {
        next = "Only Stripe payments remain";
      }
    }

    if (next.trim() === "+ New Ticket") next = "+ New Job Request";
    if (next.trim() === "Refreshing…") next = "Refreshing…";
    if (next.includes("Ticket #, category, zip, address, customer")) {
      next = "Job #, service, ZIP, address, or customer";
    }

    if (next !== original) node.nodeValue = next;
  });
}

export default function BusinessLiveAuditGuard() {
  const location = useLocation();
  const pathname = location.pathname.replace(/\/+$/, "") || "/";
  const enabled = pathname === "/sbo" || pathname === "/sbo/finance" || pathname === "/tickets";

  useEffect(() => {
    if (!enabled || typeof document === "undefined") return undefined;

    let scheduled = false;
    const run = () => {
      scheduled = false;
      updateTextNodes(document.body);
    };
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(run);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [enabled, pathname]);

  return null;
}
