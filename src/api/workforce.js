import api, { getActiveBusinessId } from "./client";

function businessParams() {
  const businessId = getActiveBusinessId();
  return businessId ? { business_id: businessId } : {};
}

export async function getBusinessWorkforce() {
  const response = await api.get("/sync-ai/business/workforce/", { params: businessParams() });
  return response?.data || { members: [] };
}

export async function saveWorkforceMember(memberId, payload = {}) {
  const businessId = getActiveBusinessId();
  const response = await api.patch("/sync-ai/business/workforce/", {
    member_id: memberId,
    ...(businessId ? { business_id: businessId } : {}),
    ...payload,
  });
  return response?.data || {};
}

export async function getBusinessOperationsSummary() {
  const response = await api.get("/sync-ai/business/operations/summary/", { params: businessParams() });
  return response?.data || {};
}
