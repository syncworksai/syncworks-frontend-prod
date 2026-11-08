import api from "./client";

// Server-side Social Group scoped rooms; all monetary figures are virtual chip cents.
// Cross-device waiting-room presence is polled by the customer app.
export async function listCardRooms(group) {
  const { data } = await api.get("/social/card-rooms/", { params: { group } });
  return Array.isArray(data) ? data : [];
}
export async function getCardRoom(id) {
  const { data } = await api.get("/social/card-rooms/" + id + "/");
  return data;
}
export async function createCardRoom(payload) {
  const { data } = await api.post("/social/card-rooms/", payload);
  return data;
}
export async function actCardRoom(id, action, payload={}) {
  const { data } = await api.post("/social/card-rooms/" + id + "/" + action + "/", payload);
  return data;
}
