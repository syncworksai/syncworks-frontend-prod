const STORAGE_KEY = "sw:saved_providers_v1";
const PREFILL_KEY = "sw:new_request_prefill";

function normalizeServiceKeys(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === "string" || typeof item === "number") return [String(item)];
      return [item?.key, item?.slug, item?.name, item?.label, item?.category_key, item?.service_key, item?.vertical_key, item?.id];
    }).map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function collectServiceKeys(provider) {
  const sources = [
    provider?.service_keys, provider?.serviceKeys, provider?.selected_services,
    provider?.selectedServices, provider?.services, provider?.service_categories,
    provider?.serviceCategories, provider?.categories, provider?.category_keys,
    provider?.categoryKeys, provider?.business?.service_keys,
    provider?.business?.selected_services, provider?.business?.services,
    provider?.business?.service_categories, provider?.business?.categories,
  ];
  const explicit = sources.flatMap(normalizeServiceKeys);
  const text = String(
    provider?.services_text || provider?.headline || provider?.description ||
    provider?.business?.services_text || provider?.business?.headline ||
    provider?.business?.description || ""
  ).toLowerCase();
  const inferred = [];
  if (text.includes("groom")) inferred.push("dog_grooming", "pets");
  if (text.includes("dog") || text.includes("pet")) inferred.push("pets");
  if (text.includes("plumb")) inferred.push("plumbing");
  if (text.includes("hvac") || text.includes("air conditioning")) inferred.push("hvac");
  if (text.includes("electric")) inferred.push("electrical");
  if (text.includes("lawn") || text.includes("landscap")) inferred.push("lawn_landscaping");
  if (text.includes("tree")) inferred.push("tree_services");
  if (text.includes("clean")) inferred.push("cleaning");
  if (text.includes("roof")) inferred.push("roofing_gutters");
  if (text.includes("auto") || text.includes("mechanic")) inferred.push("auto_services");
  if (text.includes("tutor")) inferred.push("education_tutoring");
  return Array.from(new Set([...explicit, ...inferred]));
}

function cleanProvider(provider) {
  if (!provider) return null;
  const id = Number(provider.id || provider.business_id || provider.assigned_business_id || provider.business?.id || 0);
  if (!id) return null;
  return {
    id,
    name: provider.name || provider.business_name || provider.assigned_business_name || provider.business?.name || `Business #${id}`,
    logo_url: provider.logo_url || provider.business?.logo_url || "",
    headline: provider.headline || provider.business?.headline || "",
    phone: provider.phone || provider.business?.phone || "",
    business_email: provider.business_email || provider.email || provider.business?.business_email || provider.business?.email || "",
    website: provider.website || provider.business?.website || "",
    city: provider.city || provider.business?.city || "",
    state: provider.state || provider.business?.state || "",
    base_zip: provider.base_zip || provider.service_zip || provider.business?.base_zip || "",
    service_radius_miles: provider.service_radius_miles ?? provider.business?.service_radius_miles ?? null,
    services_text: provider.services_text || provider.business?.services_text || provider.headline || "",
    service_keys: collectServiceKeys(provider),
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
  const next = [cleaned, ...readSavedProviders().filter((item) => Number(item.id) !== Number(cleaned.id))].slice(0, 50);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("sw:savedProvidersChanged", { detail: next }));
  return cleaned;
}

export function removeSavedProvider(providerId) {
  const next = readSavedProviders().filter((item) => Number(item.id) !== Number(providerId));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("sw:savedProvidersChanged", { detail: next }));
  return next;
}

export function providerFromTicket(ticket) {
  const card = ticket?.assigned_business_card || {};
  return cleanProvider({
    ...card,
    id: card.id || ticket?.assigned_business_id || ticket?.assigned_business?.id || ticket?.business_id,
    name: ticket?.assigned_business_name || card.name || ticket?.assigned_business?.name || ticket?.business_name,
    service_zip: ticket?.service_zip,
    service_keys: card.service_keys || card.selected_services || card.services ||
      ticket?.assigned_business?.service_keys || ticket?.assigned_business?.selected_services ||
      ticket?.assigned_business?.services,
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
