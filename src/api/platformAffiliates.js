import api from "./client";

export const AFFILIATE_REF_STORAGE_KEY = "sw_affiliate_ref_code_v1";

export function normalizeAffiliateCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");
}

export function getStoredAffiliateCode() {
  try {
    return normalizeAffiliateCode(localStorage.getItem(AFFILIATE_REF_STORAGE_KEY) || "");
  } catch {
    return "";
  }
}

export function storeAffiliateCode(code) {
  const normalized = normalizeAffiliateCode(code);

  if (!normalized) return "";

  try {
    localStorage.setItem(AFFILIATE_REF_STORAGE_KEY, normalized);
  } catch {
    // no-op
  }

  return normalized;
}

export function clearStoredAffiliateCode() {
  try {
    localStorage.removeItem(AFFILIATE_REF_STORAGE_KEY);
  } catch {
    // no-op
  }
}

export function readAffiliateCodeFromSearch(search = "") {
  try {
    const qs = new URLSearchParams(search || "");
    return normalizeAffiliateCode(
      qs.get("ref") ||
        qs.get("affiliate") ||
        qs.get("affiliate_code") ||
        qs.get("code") ||
        ""
    );
  } catch {
    return "";
  }
}

export function captureAffiliateCodeFromLocation(locationLike) {
  const search =
    typeof locationLike === "string"
      ? locationLike
      : locationLike?.search || window?.location?.search || "";

  const code = readAffiliateCodeFromSearch(search);

  if (!code) return getStoredAffiliateCode();

  return storeAffiliateCode(code);
}

export function buildAffiliatePayload(extra = {}) {
  const code = getStoredAffiliateCode();

  return {
    ...extra,
    ...(code ? { affiliate_code: code, referral_code: code } : {}),
  };
}

export async function trackAffiliateClick(payload) {
  const res = await api.post("/platform-affiliates/track-click/", payload);
  return res.data;
}

export async function resolveAffiliateCode(payload) {
  const res = await api.post("/platform-affiliates/resolve-code/", payload);
  return res.data;
}

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