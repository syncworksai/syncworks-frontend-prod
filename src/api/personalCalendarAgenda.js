import api from "./client";

// Dashboard and full calendar must read the same paginated active-event feed.
export async function fetchPersonalCalendarEvents() {
  const events = [];
  let next = "/personal-calendar/events/";
  const seen = new Set();
  for (let page = 0; page < 20 && next; page += 1) {
    if (seen.has(next)) break;
    seen.add(next);
    const response = await api.get(next, page === 0 ? { params: { status: "ACTIVE" } } : undefined);
    const data = response.data;
    events.push(...(Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []));
    next = Array.isArray(data) ? null : data?.next || null;
  }
  return events.filter(event => String(event?.status || "ACTIVE").toUpperCase() === "ACTIVE");
}
