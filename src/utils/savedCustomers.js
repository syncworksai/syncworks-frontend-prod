const STORAGE_PREFIX = "sw:business_customers_v1";

function keyForBusiness(businessId) {
  return `${STORAGE_PREFIX}:${String(businessId || "unknown")}`;
}

function normalize(value) {
  return String(value || "").trim();
}

function customerIdentity(customer) {
  const email = normalize(customer?.email || customer?.customer_email).toLowerCase();
  const phone = normalize(customer?.phone || customer?.best_phone).replace(/\D/g, "");
  const name = normalize(customer?.name || customer?.customer_name).toLowerCase();
  return email || phone || name;
}

function cleanCustomer(customer) {
  if (!customer) return null;
  const name = normalize(customer.name || customer.customer_name);
  const email = normalize(customer.email || customer.customer_email);
  const phone = normalize(customer.phone || customer.best_phone);
  if (!name && !email && !phone) return null;

  return {
    id: customer.id || customerIdentity({ name, email, phone }) || `${Date.now()}`,
    name,
    email,
    phone,
    address: normalize(customer.address || customer.street_address),
    unit: normalize(customer.unit),
    city: normalize(customer.city),
    state: normalize(customer.state || customer.state_region).toUpperCase(),
    service_zip: normalize(customer.service_zip || customer.zip),
    access_notes: normalize(customer.access_notes),
    contact_preference: normalize(customer.contact_preference) || "either",
    payment_preference: normalize(customer.payment_preference) || "quote_first",
    last_service: normalize(customer.last_service || customer.marketplace_service_label),
    last_ticket_id: customer.last_ticket_id || customer.ticket_id || "",
    ticket_count: Number(customer.ticket_count || 1),
    updated_at: customer.updated_at || new Date().toISOString(),
    created_at: customer.created_at || new Date().toISOString(),
  };
}

export function readBusinessCustomers(businessId) {
  try {
    const parsed = JSON.parse(localStorage.getItem(keyForBusiness(businessId)) || "[]");
    return Array.isArray(parsed) ? parsed.map(cleanCustomer).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function saveBusinessCustomer(businessId, customer) {
  const cleaned = cleanCustomer(customer);
  if (!businessId || !cleaned) return null;

  const current = readBusinessCustomers(businessId);
  const identity = customerIdentity(cleaned);
  const existing = current.find((item) => customerIdentity(item) === identity);
  const merged = existing
    ? {
        ...existing,
        ...cleaned,
        id: existing.id,
        created_at: existing.created_at,
        ticket_count: Math.max(1, Number(existing.ticket_count || 0) + 1),
        updated_at: new Date().toISOString(),
      }
    : cleaned;

  const next = [
    merged,
    ...current.filter((item) => customerIdentity(item) !== identity),
  ]
    .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))
    .slice(0, 500);

  localStorage.setItem(keyForBusiness(businessId), JSON.stringify(next));
  window.dispatchEvent(
    new CustomEvent("sw:businessCustomersChanged", {
      detail: { businessId, customers: next },
    })
  );
  return merged;
}

export function removeBusinessCustomer(businessId, customerId) {
  const next = readBusinessCustomers(businessId).filter(
    (item) => String(item.id) !== String(customerId)
  );
  localStorage.setItem(keyForBusiness(businessId), JSON.stringify(next));
  window.dispatchEvent(
    new CustomEvent("sw:businessCustomersChanged", {
      detail: { businessId, customers: next },
    })
  );
  return next;
}
