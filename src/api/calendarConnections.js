import api from "./client";

export const getCalendarConnections = async () => (await api.get("/personal-calendar/connections/")).data;
export const startCalendarOAuth = async (provider) => (await api.post("/personal-calendar/connections/oauth/start/", { provider, return_to: "/customer/settings" })).data;
export const updateCalendarConnection = async (id, payload) => (await api.patch(`/personal-calendar/connections/${id}/`, payload)).data;
export const deleteCalendarConnection = async (id) => api.delete(`/personal-calendar/connections/${id}/`);
export const syncCalendarConnection = async (id) => (await api.post(`/personal-calendar/connections/${id}/sync/`, {})).data;
