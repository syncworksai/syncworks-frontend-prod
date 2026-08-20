import api from "./client";

export async function getMarketplaceAvailability(params = {}) {
  const response = await api.get("/sync-ai/marketplace/availability/", { params });
  return response?.data || { results: [] };
}

export async function bookMarketplaceSlot(payload) {
  const response = await api.post("/sync-ai/marketplace/book/", payload);
  return response?.data;
}

export async function getServiceCategories() {
  const response = await api.get("/service-categories/");
  const data = response?.data;
  return Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
}
