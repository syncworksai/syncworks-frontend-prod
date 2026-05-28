// src/components/requests/new-request/requestPayloadBuilder.js
import {
  FULFILLMENT_TYPES,
  MARKETPLACE_MODES,
  ROUTE_SCOPES,
} from "./requestMarketplaceCatalog";
import { getVisibleDynamicIntake } from "./requestDynamicFields";

export function normalizeZip(value) {
  return String(value || "").replace(/[^\d-]/g, "").slice(0, 10);
}

export function getCreatedId(data) {
  return (
    data?.id ||
    data?.ticket_id ||
    data?.service_request_id ||
    data?.request_id ||
    data?.ticket?.id ||
    data?.request?.id ||
    ""
  );
}

export function buildFullServiceAddress({
  address,
  unit,
  city,
  stateRegion,
  serviceZip,
}) {
  const cleanZip = normalizeZip(serviceZip);

  return [
    String(address || "").trim(),
    String(unit || "").trim(),
    String(city || "").trim(),
    [String(stateRegion || "").trim(), cleanZip].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
}

export function inferFulfillmentType(selectedService, explicitFulfillmentType) {
  if (explicitFulfillmentType) return explicitFulfillmentType;

  const types = Array.isArray(selectedService?.fulfillmentTypes)
    ? selectedService.fulfillmentTypes
    : [];

  if (types.includes(FULFILLMENT_TYPES.ONSITE)) return FULFILLMENT_TYPES.ONSITE;
  if (types.includes(FULFILLMENT_TYPES.BOOKING)) return FULFILLMENT_TYPES.BOOKING;

  return types[0] || FULFILLMENT_TYPES.ONSITE;
}

export function buildStructuredIntake({
  mode = MARKETPLACE_MODES.CUSTOMER_MARKETPLACE,
  selectedService,
  dynamicIntake,
  address,
  unit,
  city,
  stateRegion,
  serviceZip,
  accessNotes,
  paymentPreference,
  contactPreference,
  bestPhone,
  priority,
  neededByDate,
  preferredTimeWindow,
  preferredStartDate,
  preferredEndDate,
  fulfillmentType,
  marketplaceAgreement,
  customerName = "",
  customerEmail = "",
  businessId = "",
  businessName = "",
}) {
  const cleanZip = normalizeZip(serviceZip);
  const fullServiceAddress = buildFullServiceAddress({
    address,
    unit,
    city,
    stateRegion,
    serviceZip,
  });

  const isBusinessInternal = mode === MARKETPLACE_MODES.BUSINESS_INTERNAL;
  const resolvedFulfillmentType = inferFulfillmentType(
    selectedService,
    fulfillmentType
  );

  const visibleDynamicIntake = getVisibleDynamicIntake(
    selectedService,
    dynamicIntake
  );

  return {
    schema: "syncworks_universal_ticket_intake_v1",
    creator_mode: mode,
    route_scope: isBusinessInternal
      ? ROUTE_SCOPES.BUSINESS_ONLY
      : ROUTE_SCOPES.MARKETPLACE,

    marketplace_vertical: selectedService?.verticalKey || "",
    marketplace_vertical_label: selectedService?.verticalLabel || "",
    marketplace_category: selectedService?.categoryKey || "",
    marketplace_category_label: selectedService?.categoryLabel || "",
    marketplace_service: selectedService?.key || "",
    marketplace_service_label: selectedService?.label || "",

    ticket_type: selectedService?.ticketType || "SERVICE",
    fulfillment_type: resolvedFulfillmentType,

    business_id: isBusinessInternal ? businessId || "" : "",
    business_name: isBusinessInternal ? businessName || "" : "",

    customer_name: customerName || "",
    customer_email: customerEmail || "",
    best_phone: String(bestPhone || "").trim(),
    contact_preference: contactPreference,
    payment_preference: paymentPreference,

    street_address: String(address || "").trim(),
    unit: String(unit || "").trim(),
    city: String(city || "").trim(),
    state: String(stateRegion || "").trim().toUpperCase(),
    service_zip: cleanZip,
    service_address: fullServiceAddress,
    access_notes: String(accessNotes || "").trim(),

    priority,
    needed_by_date: neededByDate,
    preferred_time_window: String(preferredTimeWindow || "").trim(),
    preferred_start_date: preferredStartDate || "",
    preferred_end_date: preferredEndDate || "",

    dynamic_intake_type: selectedService?.categoryKey || selectedService?.verticalKey || "",
    dynamic_intake: visibleDynamicIntake,

    marketplace_agreement: isBusinessInternal ? true : !!marketplaceAgreement,
    is_marketplace: !isBusinessInternal,
    is_business_internal: isBusinessInternal,
  };
}

export function buildTicketDescription({
  details,
  selectedService,
  structuredIntake,
}) {
  const lines = [
    String(details || "").trim(),
    selectedService?.label
      ? `Selected need: ${selectedService.label}`
      : "",
    selectedService?.verticalLabel
      ? `Marketplace vertical: ${selectedService.verticalLabel}`
      : "",
    selectedService?.categoryLabel
      ? `Marketplace category: ${selectedService.categoryLabel}`
      : "",
    structuredIntake?.ticket_type
      ? `Ticket type: ${structuredIntake.ticket_type}`
      : "",
    structuredIntake?.fulfillment_type
      ? `Fulfillment type: ${structuredIntake.fulfillment_type}`
      : "",
    structuredIntake?.service_address
      ? `Service address: ${structuredIntake.service_address}`
      : "",
    structuredIntake?.access_notes
      ? `Access notes: ${structuredIntake.access_notes}`
      : "",
    structuredIntake?.best_phone
      ? `Best phone: ${structuredIntake.best_phone}`
      : "",
    structuredIntake?.customer_name
      ? `Customer name: ${structuredIntake.customer_name}`
      : "",
    structuredIntake?.customer_email
      ? `Customer email: ${structuredIntake.customer_email}`
      : "",
    structuredIntake?.priority ? `Priority: ${structuredIntake.priority}` : "",
    structuredIntake?.needed_by_date
      ? `Needed by date: ${structuredIntake.needed_by_date}`
      : "",
    structuredIntake?.preferred_time_window
      ? `Preferred time window: ${structuredIntake.preferred_time_window}`
      : "",
    structuredIntake?.preferred_start_date
      ? `Preferred start date: ${structuredIntake.preferred_start_date}`
      : "",
    structuredIntake?.preferred_end_date
      ? `Preferred end date: ${structuredIntake.preferred_end_date}`
      : "",
    structuredIntake?.dynamic_intake
      ? `Dynamic intake: ${JSON.stringify(structuredIntake.dynamic_intake)}`
      : "",
    `Creator mode: ${structuredIntake?.creator_mode || ""}`,
    `Route scope: ${structuredIntake?.route_scope || ""}`,
    `Marketplace agreement accepted: ${
      structuredIntake?.marketplace_agreement ? "Yes" : "No"
    }`,
    `SyncWorks Intake: ${JSON.stringify(structuredIntake)}`,
  ];

  return lines.filter(Boolean).join("\n");
}

export function buildServiceRequestPayload({
  details,
  selectedService,
  structuredIntake,
}) {
  const title = selectedService?.label || "SyncWorks Ticket";

  return {
    category:
      selectedService?.key ||
      selectedService?.categoryKey ||
      selectedService?.verticalKey ||
      "",
    title,
    description: buildTicketDescription({
      details,
      selectedService,
      structuredIntake,
    }),
    service_address: structuredIntake?.service_address || "",
    service_zip: structuredIntake?.service_zip || "",
    service_radius_miles: 25,
    is_marketplace: !!structuredIntake?.is_marketplace,
  };
}

export function getMissingSubmitRequirements({
  mode = MARKETPLACE_MODES.CUSTOMER_MARKETPLACE,
  selectedService,
  address,
  city,
  stateRegion,
  serviceZip,
  details,
  priority,
  neededByDate,
  preferredTimeWindow,
  marketplaceAgreement,
}) {
  const isBusinessInternal = mode === MARKETPLACE_MODES.BUSINESS_INTERNAL;
  const cleanZip = normalizeZip(serviceZip);
  const missing = [];

  if (!selectedService) missing.push("service");
  if (!priority) missing.push("priority");
  if (!neededByDate) missing.push("needed by date");
  if (!String(preferredTimeWindow || "").trim()) {
    missing.push("preferred time window");
  }

  if (!String(address || "").trim()) missing.push("street address");
  if (!String(city || "").trim()) missing.push("city");
  if (!String(stateRegion || "").trim()) missing.push("state");
  if (!cleanZip || cleanZip.length < 5) missing.push("ZIP");

  if (!String(details || "").trim()) missing.push("description");

  if (!isBusinessInternal && !marketplaceAgreement) {
    missing.push("marketplace agreement");
  }

  return missing;
}

export function canSubmitUniversalTicket(args) {
  return getMissingSubmitRequirements(args).length === 0 && !args?.submitting;
}