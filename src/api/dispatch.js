import api from "./client";

export async function getDispatchBoard(date = "") {
  const params = date ? { date } : {};
  const response = await api.get("/sync-ai/business/dispatch/", { params });
  return response?.data || { staff: [], summary: {} };
}

export async function getLiveOperations(date = "") {
  const params = date ? { date } : {};
  const response = await api.get("/sync-ai/business/live-operations/", { params });
  return response?.data || { staff: [], summary: {}, recommendations: [] };
}

export async function updateDispatchDelay(ticketId, minutes) {
  const response = await api.post(`/sync-ai/business/dispatch/${ticketId}/delay/`, { minutes });
  return response?.data || {};
}

export async function getEmployeeLiveDay(date = "") {
  const params = date ? { date } : {};
  const response = await api.get("/sync-ai/employee/live-day/", { params });
  return response?.data || { jobs: [], summary: {} };
}

export async function updateEmployeeJobClock(ticketId, action) {
  const response = await api.post(`/sync-ai/employee/jobs/${ticketId}/clock/`, { action });
  return response?.data || {};
}
