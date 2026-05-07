// src/components/tickets/PriorityBadge.jsx
import React from "react";

const PRIORITIES = {
  P1: {
    label: "P1",
    title: "Service Now",
    eta: "2–4 hours",
    classes:
      "border-red-500/60 bg-red-500/15 text-red-100 shadow-[0_0_18px_rgba(239,68,68,0.28)]",
  },
  P2: {
    label: "P2",
    title: "Same Day / Next Day",
    eta: "Soon",
    classes: "border-orange-500/50 bg-orange-500/15 text-orange-100",
  },
  P3: {
    label: "P3",
    title: "Same Week",
    eta: "2–5 business days",
    classes: "border-yellow-400/50 bg-yellow-400/15 text-yellow-100",
  },
  P4: {
    label: "P4",
    title: "First Available",
    eta: "Scheduled",
    classes: "border-emerald-500/50 bg-emerald-500/15 text-emerald-100",
  },
};

export function normalizePriority(value) {
  const raw = String(value || "").trim().toUpperCase();

  if (["P1", "P2", "P3", "P4"].includes(raw)) return raw;
  if (raw.includes("EMERGENCY") || raw.includes("SERVICE NOW")) return "P1";
  if (raw.includes("SAME DAY") || raw.includes("NEXT DAY")) return "P2";
  if (raw.includes("SAME WEEK")) return "P3";
  if (raw.includes("SCHEDULE") || raw.includes("FIRST AVAILABLE")) return "P4";

  return "";
}

function parseIntakeDescription(description) {
  const text = String(description || "");
  const markers = ["SyncWorks Structured Intake:", "SyncWorks Intake:"];

  for (const marker of markers) {
    const idx = text.indexOf(marker);
    if (idx === -1) continue;

    const jsonText = text.slice(idx + marker.length).trim();

    try {
      return JSON.parse(jsonText);
    } catch {
      const first = jsonText.indexOf("{");
      const last = jsonText.lastIndexOf("}");

      if (first === -1 || last === -1 || last <= first) return null;

      try {
        return JSON.parse(jsonText.slice(first, last + 1));
      } catch {
        return null;
      }
    }
  }

  return null;
}

export function getTicketPriority(ticket) {
  const direct = normalizePriority(
    ticket?.priority ||
      ticket?.urgency ||
      ticket?.marketplace_priority ||
      ticket?.request_priority ||
      ticket?.priority_level ||
      ticket?.intake?.priority ||
      ticket?.intake?.priority_level
  );

  if (direct) return direct;

  const intake = parseIntakeDescription(
    ticket?.description || ticket?.details || ticket?.notes || ""
  );

  return normalizePriority(
    intake?.priority ||
      intake?.priority_level ||
      intake?.priority_label ||
      intake?.urgency
  );
}

export function priorityRank(value) {
  const code =
    typeof value === "object" && value !== null
      ? getTicketPriority(value)
      : normalizePriority(value);

  return { P1: 1, P2: 2, P3: 3, P4: 4 }[code] || 99;
}

export function isPriorityOne(ticket) {
  return getTicketPriority(ticket) === "P1";
}

export default function PriorityBadge({
  priority,
  ticket,
  showEta = true,
  className = "",
}) {
  const code = normalizePriority(priority) || getTicketPriority(ticket);

  if (!code) return null;

  const meta = PRIORITIES[code];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide ${meta.classes} ${className}`}
      title={`${meta.label} ${meta.title}${showEta ? ` • ${meta.eta}` : ""}`}
    >
      <span>{meta.label}</span>
      <span className="opacity-90">{meta.title}</span>
      {showEta ? (
        <span className="opacity-70 normal-case">• {meta.eta}</span>
      ) : null}
    </span>
  );
}