import api from "./client";

export async function getInvoiceCenter(state = "") {
  const response = await api.get("/sync-ai/business/invoices/", {
    params: state ? { state } : {},
  });
  return response?.data || { summary: {}, results: [], ready_to_bill: [], suggestions: [] };
}

export async function getInvoiceDetail(invoiceId) {
  const response = await api.get(`/sync-ai/business/invoices/${invoiceId}/`);
  return response?.data || {};
}

export async function createInvoiceFromTicket(ticketId, payload = {}) {
  const response = await api.post(`/sync-ai/business/invoices/from-ticket/${ticketId}/`, payload);
  return response?.data || {};
}

export async function invoiceAction(invoiceId, actionName, payload = {}) {
  const response = await api.post(`/sync-ai/business/invoices/${invoiceId}/${actionName}/`, payload);
  return response?.data || {};
}

export async function getBillingAutomationSettings() {
  const response = await api.get("/sync-ai/business/billing-automation/");
  return response?.data || {};
}

export async function saveBillingAutomationSettings(payload = {}) {
  const response = await api.patch("/sync-ai/business/billing-automation/", payload);
  return response?.data || {};
}

export async function getReceivablesIntelligence() {
  const response = await api.get("/sync-ai/business/receivables/");
  return response?.data || { aging: {}, customers: [], settings: {} };
}
