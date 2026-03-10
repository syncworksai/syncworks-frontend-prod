// src/utils/calendar.js

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toICSDateUTC(date) {
  // date is JS Date
  const y = date.getUTCFullYear();
  const m = pad2(date.getUTCMonth() + 1);
  const d = pad2(date.getUTCDate());
  const hh = pad2(date.getUTCHours());
  const mm = pad2(date.getUTCMinutes());
  const ss = pad2(date.getUTCSeconds());
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

function safeString(x) {
  return String(x || "").replace(/\r?\n/g, "\\n");
}

// Try to parse "Preferred date: YYYY-MM-DD" and "Time window: 8am – 10am" from description.
// This is MVP parsing because your wizard injects these lines into description.
export function extractPreferredScheduleFromDescription(desc) {
  const text = String(desc || "");

  // Preferred date: 2026-01-20
  const mDate = text.match(/Preferred date:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
  const dateStr = mDate?.[1] || "";

  // Time window: 8am – 10am  OR 8am - 10am OR 8am – 10am
  const mWin = text.match(/Time window:\s*([^\n\r]+)/i);
  const win = (mWin?.[1] || "").trim();

  return { dateStr, windowLabel: win };
}

function parseTimeWindowToStartHour(windowLabel) {
  // Very forgiving: look for first number + optional am/pm
  // Examples:
  // "8am – 10am" => 8
  // "10am – 12pm" => 10
  // "Evening" => 18
  // "ASAP" => 9
  const w = (windowLabel || "").toLowerCase();

  if (w.includes("evening")) return 18;
  if (w.includes("asap")) return 9;

  const m = w.match(/(\d{1,2})\s*(am|pm)?/);
  if (!m) return 9;

  let h = parseInt(m[1], 10);
  const ap = m[2];

  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;

  // clamp
  if (!Number.isFinite(h) || h < 0 || h > 23) return 9;
  return h;
}

export function buildEventFromTicket(ticket) {
  const id = ticket?.id ? `#${ticket.id}` : "";
  const title =
    ticket?.title ||
    ticket?.category_name ||
    ticket?.category_path ||
    `SyncWorks Ticket ${id}`.trim();

  const locationParts = [];
  if (ticket?.service_address) locationParts.push(ticket.service_address);
  if (ticket?.service_zip) locationParts.push(ticket.service_zip);
  const location = locationParts.join(", ");

  const descParts = [];
  if (ticket?.category_path) descParts.push(`Category: ${ticket.category_path}`);
  if (ticket?.status) descParts.push(`Status: ${ticket.status}`);
  if (ticket?.is_marketplace != null) descParts.push(`Marketplace: ${ticket.is_marketplace ? "Yes" : "No"}`);
  if (ticket?.service_zip) descParts.push(`ZIP: ${ticket.service_zip}`);
  if (ticket?.service_radius_miles) descParts.push(`Radius: ${ticket.service_radius_miles} mi`);
  if (ticket?.created_at) descParts.push(`Created: ${ticket.created_at}`);

  // Attempt to find preferred schedule from description if present (MVP)
  const { dateStr, windowLabel } = extractPreferredScheduleFromDescription(ticket?.description || "");
  if (dateStr) descParts.push(`Preferred date: ${dateStr}`);
  if (windowLabel) descParts.push(`Time window: ${windowLabel}`);

  const description = descParts.join("\n");

  // Determine start/end time:
  // - If backend eventually provides scheduled_for, use it.
  // - For MVP, use preferred date + start hour derived from window.
  // - If no preferred date, fallback to "tomorrow at 9am local".
  let start = null;
  let end = null;

  const scheduledFor = ticket?.scheduled_for || ticket?.scheduled_start || ""; // future-proof
  if (scheduledFor) {
    const d = new Date(scheduledFor);
    if (!Number.isNaN(d.getTime())) {
      start = d;
      end = new Date(d.getTime() + 60 * 60 * 1000); // default 1h
    }
  }

  if (!start) {
    let base = null;

    if (dateStr) {
      // local date at derived hour
      const h = parseTimeWindowToStartHour(windowLabel);
      const d = new Date(`${dateStr}T${pad2(h)}:00:00`);
      if (!Number.isNaN(d.getTime())) base = d;
    }

    if (!base) {
      // tomorrow at 9am local
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      base = d;
    }

    start = base;
    end = new Date(base.getTime() + 60 * 60 * 1000);
  }

  return { title, location, description, start, end };
}

export function googleCalendarUrl({ title, location, description, start, end }) {
  // https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=.../...&details=...&location=...
  const s = new Date(start);
  const e = new Date(end);

  // Google accepts "YYYYMMDDTHHMMSSZ/YYYYMMDDTHHMMSSZ"
  const dates = `${toICSDateUTC(s)}/${toICSDateUTC(e)}`;

  const params = new URLSearchParams();
  params.set("action", "TEMPLATE");
  params.set("text", title || "SyncWorks Job");
  params.set("dates", dates);
  if (description) params.set("details", description);
  if (location) params.set("location", location);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookWebUrl({ title, location, description, start, end }) {
  // Outlook web calendar deep link
  // https://outlook.live.com/calendar/0/deeplink/compose?subject=...&body=...&startdt=...&enddt=...&location=...
  const s = new Date(start);
  const e = new Date(end);

  const params = new URLSearchParams();
  params.set("subject", title || "SyncWorks Job");
  params.set("body", description || "");
  params.set("startdt", s.toISOString());
  params.set("enddt", e.toISOString());
  if (location) params.set("location", location);

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function downloadICS({ title, location, description, start, end, uid }) {
  const dtStart = toICSDateUTC(new Date(start));
  const dtEnd = toICSDateUTC(new Date(end));
  const now = toICSDateUTC(new Date());

  const safeUid = uid || `syncworks-${Date.now()}@syncworks`;
  const ics =
    "BEGIN:VCALENDAR\r\n" +
    "VERSION:2.0\r\n" +
    "PRODID:-//SyncWorks//EN\r\n" +
    "CALSCALE:GREGORIAN\r\n" +
    "METHOD:PUBLISH\r\n" +
    "BEGIN:VEVENT\r\n" +
    `UID:${safeString(safeUid)}\r\n` +
    `DTSTAMP:${now}\r\n` +
    `DTSTART:${dtStart}\r\n` +
    `DTEND:${dtEnd}\r\n` +
    `SUMMARY:${safeString(title || "SyncWorks Job")}\r\n` +
    (location ? `LOCATION:${safeString(location)}\r\n` : "") +
    (description ? `DESCRIPTION:${safeString(description)}\r\n` : "") +
    "END:VEVENT\r\n" +
    "END:VCALENDAR\r\n";

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "syncworks-ticket.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* =========================================================================================
   PLANNER (TodoList/Planner) helpers
   - Do NOT break ticket calendar logic above
   - Planner uses an all-day Google Calendar template event on task due_date
========================================================================================= */

export function ymdToCompact(ymd) {
  // "YYYY-MM-DD" -> "YYYYMMDD"
  if (!ymd || typeof ymd !== "string") return "";
  return ymd.replaceAll("-", "");
}

export function addDaysYmd(ymd, days) {
  // ymd: "YYYY-MM-DD"
  const d = new Date(`${ymd}T00:00:00`);
  if (!Number.isFinite(d.getTime())) return ymd;
  d.setDate(d.getDate() + Number(days || 0));
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Planner: open Google Calendar event creation (template URL)
 * All-day event using task due_date:
 *  - start: due_date
 *  - end: due_date + 1 day (exclusive)
 */
export function buildGoogleCalendarTaskUrl({ title, notes, due_date }) {
  const t = (title || "").trim();
  const due = (due_date || "").trim();
  if (!t || !due) return null;

  const start = ymdToCompact(due);
  const end = ymdToCompact(addDaysYmd(due, 1)); // end is exclusive for all-day events

  const params = new URLSearchParams();
  params.set("action", "TEMPLATE");
  params.set("text", t);
  params.set("dates", `${start}/${end}`); // all-day event
  if (notes && String(notes).trim()) params.set("details", String(notes).trim());

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
