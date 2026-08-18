import api from "./client";

function list(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

export async function searchPeople(search) {
  const { data } = await api.get("/social/people/", { params: { search } });
  return list(data);
}

export async function getConnections() {
  const { data } = await api.get("/social/connections/");
  return list(data);
}

export async function sendConnection(recipient) {
  const { data } = await api.post("/social/connections/", { recipient });
  return data;
}

export async function acceptConnection(id) {
  const { data } = await api.post(`/social/connections/${id}/accept/`);
  return data;
}

export async function declineConnection(id) {
  const { data } = await api.post(`/social/connections/${id}/decline/`);
  return data;
}

export async function getGroups() {
  const { data } = await api.get("/social/groups/");
  return list(data);
}

export async function createGroup(payload) {
  const { data } = await api.post("/social/groups/", payload);
  return data;
}

export async function getMemberships() {
  const { data } = await api.get("/social/memberships/");
  return list(data);
}

export async function inviteMember(payload) {
  const { data } = await api.post("/social/memberships/", payload);
  return data;
}

export async function acceptMembership(id) {
  const { data } = await api.post(`/social/memberships/${id}/accept/`);
  return data;
}

export async function declineMembership(id) {
  const { data } = await api.post(`/social/memberships/${id}/decline/`);
  return data;
}

export async function getEvents() {
  const { data } = await api.get("/social/events/");
  return list(data);
}

export async function createEvent(payload) {
  const { data } = await api.post("/social/events/", payload);
  return data;
}

export async function updateEvent(id, payload) {
  const { data } = await api.patch(`/social/events/${id}/`, payload);
  return data;
}

export async function cancelEvent(id) {
  await api.delete(`/social/events/${id}/`);
}

export async function getEventInvitations() {
  const { data } = await api.get("/social/event-invitations/");
  return list(data);
}

export async function createEventInvitation(payload) {
  const { data } = await api.post("/social/event-invitations/", payload);
  return data;
}

export async function acceptEventInvitation(id) {
  const { data } = await api.post(`/social/event-invitations/${id}/accept/`);
  return data;
}

export async function declineEventInvitation(id) {
  const { data } = await api.post(`/social/event-invitations/${id}/decline/`);
  return data;
}

export async function getEventResponses() {
  const { data } = await api.get("/social/event-responses/");
  return list(data);
}

export async function createEventResponse(payload) {
  const { data } = await api.post("/social/event-responses/", payload);
  return data;
}

export async function updateEventResponse(id, response) {
  const { data } = await api.patch(`/social/event-responses/${id}/`, { response });
  return data;
}

export async function getCollections() {
  const { data } = await api.get("/social/collections/");
  return list(data);
}

export async function createCollection(payload) {
  const { data } = await api.post("/social/collections/", payload);
  return data;
}

export async function getCollectionShares() {
  const { data } = await api.get("/social/collection-shares/");
  return list(data);
}

export async function createCollectionShare(payload) {
  const { data } = await api.post("/social/collection-shares/", payload);
  return data;
}
