import api from "./client";

export async function getNotificationSettings() {
  const response = await api.get("/sync-ai/assistant/notifications/");
  return response?.data || {};
}

export async function patchNotificationSettings(payload = {}) {
  const response = await api.patch("/sync-ai/assistant/notifications/", payload);
  return response?.data || {};
}

export async function registerPushDevice(payload = {}) {
  const response = await api.post("/sync-ai/assistant/notifications/device/", payload);
  return response?.data || {};
}

export async function removePushDevice(payload = {}) {
  const response = await api.delete("/sync-ai/assistant/notifications/device/", { data: payload });
  return response?.data || {};
}

export async function getNotifications(params = {}) {
  const response = await api.get("/notifications/", { params });
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.results)) return response.data.results;
  return [];
}

export async function getNotificationUnreadCount() {
  const response = await api.get("/notifications/unread-count/");
  return response?.data || { unread: 0, sync_alerts: 0 };
}

export async function markNotificationRead(id) {
  if (!id) return null;
  const response = await api.post(`/notifications/${id}/read/`);
  return response?.data || null;
}

export async function markAllNotificationsRead() {
  const response = await api.post("/notifications/mark-all-read/");
  return response?.data || { ok: true };
}
