import api from "./client";

export async function getMyAffiliateDashboard() {
  const res = await api.get("/platform-affiliates/me/");
  return res.data;
}

export async function submitAffiliateApplication(payload) {
  const res = await api.post("/platform-affiliates/me/", payload);
  return res.data;
}

export async function getMyAffiliateBusinesses() {
  const res = await api.get("/platform-affiliates/me/businesses/");
  return res.data;
}

export async function getMyAffiliateCommissions() {
  const res = await api.get("/platform-affiliates/me/commissions/");
  return res.data;
}

export async function claimAffiliateCode(payload) {
  const res = await api.post("/platform-affiliates/claim-code/", payload);
  return res.data;
}

export async function getGodModeAffiliateOverview() {
  const res = await api.get("/platform-affiliates/godmode/overview/");
  return res.data;
}

export async function getGodModeAffiliates() {
  const res = await api.get("/platform-affiliates/godmode/affiliates/");
  return res.data;
}

export async function createGodModeAffiliate(payload) {
  const res = await api.post("/platform-affiliates/godmode/affiliates/", payload);
  return res.data;
}

export async function getGodModeAffiliateDetail(id) {
  const res = await api.get(`/platform-affiliates/godmode/affiliates/${id}/`);
  return res.data;
}

export async function updateGodModeAffiliate(id, payload) {
  const res = await api.patch(`/platform-affiliates/godmode/affiliates/${id}/`, payload);
  return res.data;
}

export async function assignBusinessToAffiliate(payload) {
  const res = await api.post("/platform-affiliates/godmode/assign-business/", payload);
  return res.data;
}

export async function getGodModePayoutBatches() {
  const res = await api.get("/platform-affiliates/godmode/payout-batches/");
  return res.data;
}

export async function createGodModePayoutBatch(payload) {
  const res = await api.post("/platform-affiliates/godmode/payout-batches/", payload);
  return res.data;
}

export async function markGodModePayoutBatchPaid(id, payload = {}) {
  const res = await api.post(
    `/platform-affiliates/godmode/payout-batches/${id}/mark-paid/`,
    payload
  );
  return res.data;
}