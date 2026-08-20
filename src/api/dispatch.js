import api from "./client";

export async function getDispatchBoard(date = "") {
  const params = date ? { date } : {};
  const response = await api.get("/sync-ai/business/dispatch/", { params });
  return response?.data || { staff: [], summary: {} };
}

export async function updateDispatchDelay(ticketId, minutes) {
  const response = await api.post(`/sync-ai/business/dispatch/${ticketId}/delay/`, { minutes });
  return response?.data || {};
}
