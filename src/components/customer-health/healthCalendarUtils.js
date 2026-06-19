// src/components/customer-health/healthCalendarUtils.js
import { normalizeSleepPlan } from "./healthSleepPlanner";

function pad(value) {
  return String(value).padStart(2, "0");
}

function parseTime(value = "00:00") {
  const [hours, minutes] = String(value).split(":").map(Number);

  return {
    hours: Number.isFinite(hours) ? hours : 0,
    minutes: Number.isFinite(minutes) ? minutes : 0,
  };
}

function toGoogleDate(date) {
  return (
    `${date.getUTCFullYear()}` +
    `${pad(date.getUTCMonth() + 1)}` +
    `${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(
      date.getUTCSeconds()
    )}Z`
  );
}

function sleepRangeForDate(date, plan) {
  const normalized = normalizeSleepPlan(plan);
  const bed = parseTime(normalized.bedtime);
  const wake = parseTime(normalized.wake_time);

  const start = new Date(date);
  start.setHours(bed.hours, bed.minutes, 0, 0);

  const end = new Date(date);
  end.setHours(wake.hours, wake.minutes, 0, 0);

  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }

  return { start, end };
}

export function buildSleepGoogleCalendarLink(plan, date = new Date()) {
  const normalized = normalizeSleepPlan(plan);
  const { start, end } = sleepRangeForDate(date, normalized);
  const params = new URLSearchParams();

  params.set("action", "TEMPLATE");
  params.set("text", "SyncWorks Sleep & Recovery");
  params.set(
    "details",
    `Protected recovery block from SyncWorks Health. Sleep goal: ${
      normalized.sleep_goal_hours
    } hours. Quiet hours enabled: ${
      normalized.quiet_hours_enabled ? "Yes" : "No"
    }.`
  );
  params.set("dates", `${toGoogleDate(start)}/${toGoogleDate(end)}`);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function toIcsLocal(date) {
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `T${pad(date.getHours())}${pad(date.getMinutes())}${pad(
      date.getSeconds()
    )}`
  );
}

function escapeIcs(value = "") {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function buildSleepScheduleIcs(
  plan,
  startDate = new Date(),
  nights = 7
) {
  const normalized = normalizeSleepPlan(plan);
  const events = [];

  for (let index = 0; index < nights; index += 1) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + index);

    const dayKey = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][
      date.getDay()
    ];

    if (!normalized.days.includes(dayKey)) {
      continue;
    }

    const { start, end } = sleepRangeForDate(date, normalized);

    events.push(
      [
        "BEGIN:VEVENT",
        `UID:syncworks-sleep-${start.getTime()}@syncworks.ai`,
        `DTSTAMP:${toIcsLocal(new Date())}`,
        `DTSTART:${toIcsLocal(start)}`,
        `DTEND:${toIcsLocal(end)}`,
        `SUMMARY:${escapeIcs("SyncWorks Sleep & Recovery")}`,
        `DESCRIPTION:${escapeIcs(
          `Protected recovery block. Sleep goal: ${normalized.sleep_goal_hours} hours.`
        )}`,
        "TRANSP:OPAQUE",
        "END:VEVENT",
      ].join("\r\n")
    );
  }

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SyncWorks//Health Sleep Planner//EN",
    "CALSCALE:GREGORIAN",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadSleepScheduleIcs(plan) {
  const content = buildSleepScheduleIcs(plan);
  const blob = new Blob([content], {
    type: "text/calendar;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "syncworks-sleep-schedule.ics";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}