import api from "./client";

export async function getCustomerInvoiceCenter() {
  const response = await api.get("/sync-ai/customer/invoices/");
  return response.data;
}

export async function getCustomerInvoiceDetail(invoiceId) {
  const response = await api.get(`/sync-ai/customer/invoices/${invoiceId}/`);
  return response.data;
}

export async function startInvoiceCheckout(invoiceId) {
  const response = await api.post(`/billing/invoices/${invoiceId}/checkout/`, {});
  return response.data;
}
