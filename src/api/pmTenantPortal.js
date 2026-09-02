import api from "./client";

export async function acceptTenantInvitation(code) {
  const normalizedCode = String(code || "").trim().toUpperCase();
  const response = await api.post("/pm-hub/tenant-invitations/accept/", {
    code: normalizedCode,
  });
  return response.data;
}

export async function getTenantPortalAccount() {
  const response = await api.get("/pm-hub/billing/my-account/");
  return response.data;
}

export async function getTenantPortalCommunications() {
  const response = await api.get("/pm-hub/tenant-portal/communications/");
  return response.data;
}

export async function sendTenantPortalMessage(payload) {
  const response = await api.post("/pm-hub/tenant-portal/communications/", {
    action: "MESSAGE",
    ...payload,
  });
  return response.data;
}

export async function sendTenantMaintenanceRequest(payload) {
  const response = await api.post("/pm-hub/tenant-portal/communications/", {
    action: "MAINTENANCE",
    ...payload,
  });
  return response.data;
}
