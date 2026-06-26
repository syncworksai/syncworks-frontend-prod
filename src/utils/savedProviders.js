// src/utils/savedProviders.js

const STORAGE_KEY = "sw:saved_providers_v1";
const PREFILL_KEY = "sw:new_request_prefill";

function cleanProvider(provider) {
  if (!provider) return null;
  const id = Number(
    provider.id ||
      provider.business_id ||
      provider.assigned_business_id ||
      provider.business?.id ||
      0
  );
  if (!id) return null;

  return {
    id,
    name:
      provider.name ||
      provider.business_name ||
      provider.assigned_business_name ||
      provider.business?.name ||
      `Business #${id}`,
    logo_url: provider.logo_url || provider.business?.logo_url || "",
    headline: provider.headline || "",
    phone: provider.phone || "",
    business_email: provider.business_email || provider.email || "",
    website: provider.website || "",
    city: provider.city || "",
    state: provider.state || "",
    base_zip: provider.base_zip || provider.service_zip || "",
    service_radius_miles: provider.service_radius_miles ?? null,
    services_text: provider.services_text || "",
    saved_at: provider.saved_at || new Date().toISOString(),
  };
}

export function readSavedProviders() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map(cleanProvider).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function saveProvider(provider) {
  const cleaned = cleanProvider(provider);
  if (!cleaned) return null;

  const next = [
    cleaned,
    ...readSavedProviders().filter((item) => Number(item.id) !== Number(cleaned.id)),
  ].slice(0, 50);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("sw:savedProvidersChanged", { detail: next }));
  return cleaned;
}

export function removeSavedProvider(providerId) {
  const next = readSavedProviders().filter(
    (item) => Number(item.id) !== Number(providerId)
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("sw:savedProvidersChanged", { detail: next }));
  return next;
}

export function providerFromTicket(ticket) {
  const card = ticket?.assigned_business_card || {};
  return cleanProvider({
    ...card,
    id:
      card.id ||
      ticket?.assigned_business_id ||
      ticket?.assigned_business?.id ||
      ticket?.business_id,
    name:
      ticket?.assigned_business_name ||
      card.name ||
      ticket?.assigned_business?.name ||
      ticket?.business_name,
    service_zip: ticket?.service_zip,
  });
}

export function readRequestProviderPrefill() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PREFILL_KEY) || "null");
    const provider = cleanProvider(parsed);
    if (provider) {
      localStorage.removeItem(PREFILL_KEY);
      return provider;
    }
  } catch {
    // ignore malformed prefill
  }
  return null;
}
