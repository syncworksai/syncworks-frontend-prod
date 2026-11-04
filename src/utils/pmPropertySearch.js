/**
 * Search portfolio properties by unordered name, address, street-number, city
 * and postal-code tokens. Shared between PM Leads, Tenant Center and Onboarding.
 */
export function matchesPMProperty(property, search) {
  const tokens = String(search || "").trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const text = [
    property?.name, property?.address, property?.street_address,
    property?.city, property?.state, property?.zip, property?.postal_code,
    property?.unit_label,
  ].filter(Boolean).join(" ").toLocaleLowerCase();
  return tokens.every(token => text.includes(token));
}
