import api from "./client";

export async function getCustomerHealthProfile() {
  const response = await api.get(
    "/customer-health/me/"
  );

  return response.data;
}

export async function patchCustomerHealthProfile(
  payload
) {
  const response = await api.patch(
    "/customer-health/me/",
    payload
  );

  return response.data;
}

export async function redeemHealthAccessCode(code) {
  const response = await api.post(
    "/customer-health/redeem-access-code/",
    {
      code: String(code || "")
        .trim()
        .toUpperCase(),
    }
  );

  return response.data;
}