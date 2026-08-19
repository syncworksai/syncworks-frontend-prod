import api from "./client";
import { getCalendarConnections } from "./calendarConnections";

function safeList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function lastDate(values = []) {
  const valid = values.filter(Boolean).map((value) => new Date(value)).filter((date) => Number.isFinite(date.getTime()));
  if (!valid.length) return null;
  return new Date(Math.max(...valid.map((date) => date.getTime()))).toISOString();
}

export async function loadConnectedLifeRegistry({ financeEnabled = false, growthEnabled = false } = {}) {
  const requests = [
    getCalendarConnections(),
    financeEnabled ? api.get("/personal-finance/dashboard/") : Promise.resolve({ data: null }),
    growthEnabled ? api.get("/platform-growth/growth/channels/") : Promise.resolve({ data: [] }),
    api.get("/ticket-conversations/?scope=PERSONAL&archived=false"),
  ];

  const [calendarResult, financeResult, growthResult, inboxResult] = await Promise.allSettled(requests);

  const calendarData = calendarResult.status === "fulfilled" ? calendarResult.value || {} : {};
  const calendarRows = safeList(calendarData?.connections);
  const activeCalendars = calendarRows.filter((row) => row?.enabled !== false && row?.connected !== false);

  const financeData = financeResult.status === "fulfilled" ? financeResult.value?.data || {} : {};
  const financeConnections = safeList(financeData?.connections);
  const activeBanks = financeConnections.filter((row) => row?.active !== false && row?.status !== "DISCONNECTED");

  const growthData = growthResult.status === "fulfilled" ? growthResult.value?.data : [];
  const growthRows = safeList(growthData);
  const activeSocial = growthRows.filter((row) => row?.status === "CONNECTED" && !row?.metadata?.internal_placeholder);

  const inboxData = inboxResult.status === "fulfilled" ? inboxResult.value?.data || {} : {};
  const unread = Number(inboxData?.unread_total || 0);

  return {
    loadedAt: new Date().toISOString(),
    calendar: {
      connected: activeCalendars.length > 0,
      count: activeCalendars.length,
      lastSyncedAt: lastDate(activeCalendars.map((row) => row?.last_synced_at)),
      providers: [...new Set(activeCalendars.map((row) => row?.provider).filter(Boolean))],
      error: calendarResult.status === "rejected",
    },
    banks: {
      connected: activeBanks.length > 0,
      count: activeBanks.length,
      lastSyncedAt: lastDate(activeBanks.map((row) => row?.last_synced_at || row?.updated_at)),
      error: financeEnabled && financeResult.status === "rejected",
    },
    socialPublishing: {
      connected: activeSocial.length > 0,
      count: activeSocial.length,
      providers: [...new Set(activeSocial.map((row) => row?.provider).filter(Boolean))],
      lastSyncedAt: lastDate(activeSocial.map((row) => row?.updated_at || row?.connected_at)),
      error: growthEnabled && growthResult.status === "rejected",
    },
    messages: {
      connected: true,
      unread,
      error: inboxResult.status === "rejected",
    },
  };
}
