// src/components/requests/new-request/requestDynamicFields.js

function includesAny(haystack, needles) {
  const text = String(haystack || "").toLowerCase();
  return (needles || []).some((needle) => text.includes(String(needle).toLowerCase()));
}

export const UNIVERSAL_DETAIL_FIELDS = [
  {
    name: "customer_goal",
    label: "What outcome do you want?",
    type: "textarea",
    placeholder: "Example: I need this fixed today, I need a quote, I need someone to come look at it...",
    fullWidth: true,
  },
  {
    name: "photos_note",
    label: "Photos / attachments note",
    type: "textarea",
    placeholder: "Describe any photos you plan to send or upload later.",
    fullWidth: true,
  },
];

const FIELD_GROUPS = [
  {
    key: "tree_services",
    label: "Tree / Brush Details",
    match: ["tree_", "brush", "stump", "storm_cleanup", "fallen_limb", "lot_clearing"],
    fields: [
      {
        name: "tree_status",
        label: "What is the tree/brush situation?",
        type: "select",
        options: ["Standing tree", "Fallen tree", "Fallen limbs", "Brush pile", "Overgrown area", "Stump only", "Unsure"],
      },
      {
        name: "near_power_lines",
        label: "Near power lines?",
        type: "select",
        options: ["No", "Yes", "Unsure"],
      },
      {
        name: "on_structure",
        label: "Is anything on a house, car, fence, or structure?",
        type: "select",
        options: ["No", "Yes - house/building", "Yes - vehicle", "Yes - fence", "Unsure"],
      },
      {
        name: "tree_size",
        label: "Approximate size",
        type: "select",
        options: ["Small", "Medium", "Large", "Very large", "Multiple trees / large area", "Unsure"],
      },
      {
        name: "haul_away_needed",
        label: "Need debris hauled away?",
        type: "select",
        options: ["Yes", "No", "Quote both options"],
      },
      {
        name: "stump_needed",
        label: "Need stump grinding/removal?",
        type: "select",
        options: ["No", "Yes", "Maybe / quote it"],
      },
      {
        name: "access_to_area",
        label: "Access to work area",
        placeholder: "Front yard, backyard gate, narrow access, drive-up access, etc.",
      },
    ],
  },
  {
    key: "lawn_landscaping",
    label: "Lawn / Landscaping Details",
    match: ["lawn_", "landscape_", "yard_", "leaf_", "hedge_", "mulch", "sod", "irrigation"],
    fields: [
      {
        name: "yard_size",
        label: "Yard size",
        type: "select",
        options: ["Small", "Medium", "Large", "Acreage", "Unsure"],
      },
      {
        name: "front_back_both",
        label: "Front, back, or both?",
        type: "select",
        options: ["Front", "Back", "Both", "Full property"],
      },
      {
        name: "gate_access",
        label: "Gate access",
        type: "select",
        options: ["No gate", "Unlocked gate", "Gate code / key needed", "Locked / customer must be present"],
      },
      {
        name: "pets_in_yard",
        label: "Pets in yard?",
        type: "select",
        options: ["No", "Yes", "Sometimes"],
      },
      {
        name: "current_condition",
        label: "Current condition",
        type: "textarea",
        placeholder: "Overgrown, normal maintenance, weeds, leaves, bare spots, etc.",
        fullWidth: true,
      },
    ],
  },
  {
    key: "junk_hauling",
    label: "Junk / Hauling Details",
    match: ["junk", "removal", "debris", "cleanout", "hauling", "furniture", "appliance_removal", "trailer"],
    fields: [
      {
        name: "item_type",
        label: "What needs removed?",
        placeholder: "Furniture, appliances, brush, construction debris, trash bags, etc.",
      },
      {
        name: "quantity_estimate",
        label: "Estimated amount",
        type: "select",
        options: ["Few items", "1/4 truckload", "1/2 truckload", "Full truckload", "Multiple loads", "Unsure"],
      },
      {
        name: "heavy_items",
        label: "Heavy items?",
        type: "select",
        options: ["No", "Yes", "Unsure"],
      },
      {
        name: "pickup_location",
        label: "Where is it located?",
        type: "select",
        options: ["Curbside", "Garage", "Inside home", "Backyard", "Upstairs", "Storage unit", "Other"],
      },
      {
        name: "stairs_or_elevator",
        label: "Stairs or elevator?",
        type: "select",
        options: ["No", "Stairs", "Elevator", "Both", "Unsure"],
      },
    ],
  },
  {
    key: "plumbing",
    label: "Plumbing Details",
    match: ["plumbing_", "sewer", "water_heater", "toilet", "drain", "faucet"],
    fields: [
      {
        name: "active_leak",
        label: "Active leak?",
        type: "select",
        options: ["No", "Yes - contained", "Yes - uncontrolled", "Unsure"],
      },
      {
        name: "water_shutoff",
        label: "Has water been shut off?",
        type: "select",
        options: ["No", "Yes", "Partially", "Unsure"],
      },
      {
        name: "issue_location",
        label: "Issue location",
        placeholder: "Kitchen, bathroom, crawlspace, yard, water heater closet, etc.",
      },
      {
        name: "severity",
        label: "Severity",
        type: "select",
        options: ["Low", "Medium", "High", "Emergency"],
      },
    ],
  },
  {
    key: "hvac",
    label: "HVAC Details",
    match: ["hvac_", "ac_", "heat_", "thermostat", "ductwork"],
    fields: [
      {
        name: "system_running",
        label: "Is the system running?",
        type: "select",
        options: ["Yes", "No", "Partially / intermittently", "Unsure"],
      },
      {
        name: "issue_type",
        label: "Main issue",
        type: "select",
        options: ["No cooling", "No heat", "Weak airflow", "Thermostat issue", "Noise", "Leak", "Maintenance", "Unsure"],
      },
      {
        name: "unit_location",
        label: "Unit location",
        placeholder: "Attic, closet, crawlspace, outside, roof, etc.",
      },
      {
        name: "emergency_symptoms",
        label: "Emergency symptoms",
        type: "textarea",
        placeholder: "Burning smell, leaking, electrical smell, unusual sounds, elderly/infant in home, etc.",
        fullWidth: true,
      },
    ],
  },
  {
    key: "electrical",
    label: "Electrical Details",
    match: ["electrical_", "breaker", "outlet", "fixture", "ceiling_fan", "ev_charger", "generator"],
    fields: [
      {
        name: "power_out",
        label: "Is power out?",
        type: "select",
        options: ["No", "Yes - whole home", "Yes - one room/area", "Flickering", "Unsure"],
      },
      {
        name: "sparking_or_smell",
        label: "Sparking, smoke, or burning smell?",
        type: "select",
        options: ["No", "Yes", "Earlier but stopped", "Unsure"],
      },
      {
        name: "breaker_tripping",
        label: "Breaker tripping?",
        type: "select",
        options: ["No", "Yes", "Sometimes", "Unsure"],
      },
      {
        name: "electrical_location",
        label: "Location",
        placeholder: "Kitchen, garage, panel, outside, bedroom, etc.",
      },
    ],
  },
  {
    key: "cleaning",
    label: "Cleaning Details",
    match: ["cleaning", "clean_", "airbnb", "turnover", "carpet", "office_cleaning"],
    fields: [
      {
        name: "property_type",
        label: "Property type",
        type: "select",
        options: ["House", "Apartment", "Office", "Rental / Airbnb", "Commercial", "Other"],
      },
      {
        name: "cleaning_level",
        label: "Cleaning level",
        type: "select",
        options: ["Standard", "Deep clean", "Move-in/move-out", "Post-construction", "Turnover", "Unsure"],
      },
      {
        name: "bed_bath_count",
        label: "Beds / baths or square footage",
        placeholder: "3 bed / 2 bath, 1,800 sqft, office size, etc.",
      },
      {
        name: "supplies_needed",
        label: "Should provider bring supplies?",
        type: "select",
        options: ["Yes", "No", "Either is fine"],
      },
    ],
  },
  {
    key: "real_estate",
    label: "Real Estate Details",
    match: ["real_estate_"],
    fields: [
      {
        name: "real_estate_goal",
        label: "What are you trying to do?",
        type: "select",
        options: ["Buy", "Sell", "Rent", "Schedule showing", "Ask about a property", "Listing prep", "Inspection", "Other"],
      },
      {
        name: "property_address_or_area",
        label: "Property address or area",
        placeholder: "Address, neighborhood, city, ZIP, or area of interest",
      },
      {
        name: "budget_or_price",
        label: "Budget / price range",
        placeholder: "$250k-$350k, $1,500/mo, unsure, etc.",
      },
      {
        name: "timeline",
        label: "Timeline",
        type: "select",
        options: ["ASAP", "This week", "This month", "1-3 months", "Just researching"],
      },
      {
        name: "financing_status",
        label: "Financing status",
        type: "select",
        options: ["Pre-approved", "Need lender help", "Cash buyer", "Not sure yet", "Not applicable"],
      },
    ],
  },
  {
    key: "property_management",
    label: "Property Management Details",
    match: ["property_"],
    fields: [
      {
        name: "occupancy_status",
        label: "Occupancy",
        type: "select",
        options: ["Tenant occupied", "Vacant", "Owner occupied", "Unknown"],
      },
      {
        name: "tenant_contact_allowed",
        label: "Can provider contact tenant?",
        type: "select",
        options: ["Yes", "No", "Coordinate through manager", "Unsure"],
      },
      {
        name: "pm_issue_type",
        label: "Issue type",
        type: "select",
        options: ["Repair", "Make-ready", "Inspection", "Violation cleanup", "Emergency", "Quote request", "Other"],
      },
      {
        name: "entry_instructions",
        label: "Entry instructions",
        type: "textarea",
        placeholder: "Lockbox, tenant schedule, gate code, property manager instructions...",
        fullWidth: true,
      },
    ],
  },
  {
    key: "auto",
    label: "Auto / Mobile Details",
    match: ["auto_", "mobile_mechanic", "windshield", "towing"],
    fields: [
      {
        name: "vehicle_info",
        label: "Vehicle",
        placeholder: "Year, make, model",
      },
      {
        name: "vehicle_location",
        label: "Vehicle location",
        placeholder: "Home, office, roadside, parking lot, etc.",
      },
      {
        name: "vehicle_drivable",
        label: "Is it drivable?",
        type: "select",
        options: ["Yes", "No", "Barely", "Unsure"],
      },
      {
        name: "auto_issue",
        label: "What’s going on?",
        type: "textarea",
        placeholder: "Won’t start, flat tire, strange noise, needs oil change, etc.",
        fullWidth: true,
      },
    ],
  },
  {
    key: "pets",
    label: "Pet Details",
    match: ["pet_", "dog_", "mobile_pet"],
    fields: [
      {
        name: "pet_type",
        label: "Pet type",
        type: "select",
        options: ["Dog", "Cat", "Multiple pets", "Other"],
      },
      {
        name: "pet_size",
        label: "Pet size",
        type: "select",
        options: ["Small", "Medium", "Large", "Extra large", "Multiple sizes"],
      },
      {
        name: "pet_temperament",
        label: "Temperament",
        type: "select",
        options: ["Friendly", "Nervous", "Reactive", "Needs special handling", "Unsure"],
      },
      {
        name: "pet_service_notes",
        label: "Pet service notes",
        type: "textarea",
        placeholder: "Breed, grooming needs, walking details, sitting schedule, medical notes...",
        fullWidth: true,
      },
    ],
  },
  {
    key: "tutoring",
    label: "Tutoring / Education Details",
    match: ["tutoring", "test_prep", "lessons", "homework", "language_"],
    fields: [
      {
        name: "student_age_grade",
        label: "Student age / grade",
        placeholder: "Age 10, 5th grade, college, adult learner, etc.",
      },
      {
        name: "subject",
        label: "Subject",
        placeholder: "Math, reading, ACT, Spanish, piano, etc.",
      },
      {
        name: "session_preference",
        label: "Session preference",
        type: "select",
        options: ["In person", "Virtual", "Either"],
      },
      {
        name: "learning_goal",
        label: "Learning goal",
        type: "textarea",
        placeholder: "Raise grade, prepare for test, weekly lessons, homework support...",
        fullWidth: true,
      },
    ],
  },
  {
    key: "food",
    label: "Food / Restaurant Details",
    match: ["restaurant_"],
    fields: [
      {
        name: "food_order_type",
        label: "Order type",
        type: "select",
        options: ["Pickup", "Delivery", "Catering", "Reservation", "Large order", "Question"],
      },
      {
        name: "order_details",
        label: "Order details",
        type: "textarea",
        placeholder: "Items, quantities, special instructions, catering size, reservation details...",
        fullWidth: true,
      },
      {
        name: "delivery_or_pickup_time",
        label: "Requested pickup/delivery time",
        placeholder: "ASAP, 6:30 PM, tomorrow at noon, etc.",
      },
      {
        name: "food_allergies",
        label: "Allergies or special notes",
        placeholder: "Optional",
      },
    ],
  },
  {
    key: "retail",
    label: "Retail / Product Details",
    match: ["retail_"],
    fields: [
      {
        name: "product_needed",
        label: "Product/item needed",
        placeholder: "Mulch, sod, gravel, product name, SKU, size, color, etc.",
      },
      {
        name: "quantity_needed",
        label: "Quantity",
        placeholder: "How much or how many?",
      },
      {
        name: "retail_fulfillment",
        label: "Pickup or delivery?",
        type: "select",
        options: ["Pickup", "Delivery", "Either", "Need quote"],
      },
      {
        name: "product_notes",
        label: "Product notes",
        type: "textarea",
        placeholder: "Details, alternatives, budget, delivery instructions, etc.",
        fullWidth: true,
      },
    ],
  },
  {
    key: "events",
    label: "Event Details",
    match: ["photography", "videography", "dj", "event_", "party_", "balloon", "bartending"],
    fields: [
      {
        name: "event_type",
        label: "Event type",
        placeholder: "Birthday, wedding, business event, sports, family event, etc.",
      },
      {
        name: "event_date_time",
        label: "Event date/time",
        placeholder: "Date and time",
      },
      {
        name: "guest_count",
        label: "Guest count",
        placeholder: "Approximate number of people",
      },
      {
        name: "event_notes",
        label: "Event notes",
        type: "textarea",
        placeholder: "Theme, location, setup needs, hours needed, special requests...",
        fullWidth: true,
      },
    ],
  },
  {
    key: "business",
    label: "Business Service Details",
    match: ["bookkeeping", "tax_", "notary", "marketing", "website", "admin", "commercial_", "office_cleaning_business"],
    fields: [
      {
        name: "business_need",
        label: "Business need",
        placeholder: "Bookkeeping, website, marketing, notary, office maintenance, etc.",
      },
      {
        name: "business_timeline",
        label: "Timeline",
        type: "select",
        options: ["ASAP", "This week", "This month", "Ongoing", "Just need quote"],
      },
      {
        name: "remote_or_onsite",
        label: "Remote or onsite?",
        type: "select",
        options: ["Remote", "Onsite", "Either"],
      },
      {
        name: "business_details",
        label: "Details",
        type: "textarea",
        placeholder: "What do you need done? Include scope, deadlines, and goals.",
        fullWidth: true,
      },
    ],
  },
  {
    key: "tech",
    label: "Tech Details",
    match: ["computer", "wifi", "smart_home", "camera", "phone", "printer", "data_backup"],
    fields: [
      {
        name: "device_or_system",
        label: "Device/system",
        placeholder: "Laptop, WiFi router, printer, phone, camera system, etc.",
      },
      {
        name: "tech_location",
        label: "Location",
        type: "select",
        options: ["Home", "Business", "Remote help", "Other"],
      },
      {
        name: "internet_available",
        label: "Internet available?",
        type: "select",
        options: ["Yes", "No", "Intermittent", "Unsure"],
      },
      {
        name: "tech_issue",
        label: "Issue details",
        type: "textarea",
        placeholder: "What is not working or what needs setup?",
        fullWidth: true,
      },
    ],
  },
];

export function getDynamicFieldGroup(selection) {
  const serviceKey = String(selection?.key || "");
  const categoryKey = String(selection?.categoryKey || "");
  const verticalKey = String(selection?.verticalKey || "");
  const label = String(selection?.label || "");
  const search = `${serviceKey} ${categoryKey} ${verticalKey} ${label}`;

  return FIELD_GROUPS.find((group) => includesAny(search, group.match)) || null;
}

export function getDynamicFields(selection) {
  const group = getDynamicFieldGroup(selection);

  if (!group) {
    return {
      key: "general",
      label: "Request Details",
      fields: UNIVERSAL_DETAIL_FIELDS,
    };
  }

  return {
    ...group,
    fields: [...group.fields, ...UNIVERSAL_DETAIL_FIELDS],
  };
}

export function getVisibleDynamicIntake(selection, dynamicIntake) {
  const group = getDynamicFields(selection);
  const fields = group?.fields || [];

  return fields.reduce((acc, field) => {
    const value = String(dynamicIntake?.[field.name] || "").trim();
    if (value) acc[field.name] = value;
    return acc;
  }, {});
}

export function renderDynamicFieldInputProps(field, value, onChange) {
  return {
    value: value || "",
    onChange,
    placeholder: field.placeholder || "",
    className:
      "mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10",
  };
}