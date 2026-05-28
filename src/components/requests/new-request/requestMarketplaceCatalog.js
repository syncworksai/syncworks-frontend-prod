// src/components/requests/new-request/requestMarketplaceCatalog.js

export const MARKETPLACE_MODES = {
  CUSTOMER_MARKETPLACE: "CUSTOMER_MARKETPLACE",
  BUSINESS_INTERNAL: "BUSINESS_INTERNAL",
};

export const ROUTE_SCOPES = {
  MARKETPLACE: "MARKETPLACE",
  BUSINESS_ONLY: "BUSINESS_ONLY",
};

export const FULFILLMENT_TYPES = {
  ONSITE: "ONSITE",
  PICKUP: "PICKUP",
  DELIVERY: "DELIVERY",
  VIRTUAL: "VIRTUAL",
  QUOTE: "QUOTE",
  BOOKING: "BOOKING",
};

export const POPULAR_SERVICE_KEYS = [
  "plumbing_leak_repair",
  "hvac_ac_not_cooling",
  "lawn_mowing",
  "tree_removal",
  "brush_removal",
  "junk_removal",
  "house_cleaning",
  "dog_grooming",
  "math_tutoring",
  "handyman_general",
  "mobile_mechanic",
  "real_estate_showing",
  "restaurant_pickup_order",
  "property_tenant_repair",
];

export const MARKETPLACE_CATALOG = [
  {
    key: "emergency",
    label: "Emergency Help",
    shortLabel: "Emergency",
    description: "Fast-response help for urgent issues.",
    icon: "🚨",
    accent: "red",
    ticketType: "SERVICE",
    fulfillmentTypes: [FULFILLMENT_TYPES.ONSITE],
    categories: [
      {
        key: "emergency_home",
        label: "Home Emergency",
        services: [
          {
            key: "emergency_plumbing",
            label: "Emergency plumbing",
            searchTerms: ["water leak", "pipe burst", "toilet overflow", "sewer backup"],
          },
          {
            key: "emergency_hvac",
            label: "Emergency HVAC",
            searchTerms: ["no ac", "no heat", "air not working", "heater not working"],
          },
          {
            key: "emergency_electrical",
            label: "Emergency electrical",
            searchTerms: ["breaker", "power", "sparking", "outlet issue"],
          },
          {
            key: "emergency_roof_leak",
            label: "Roof leak",
            searchTerms: ["roof leak", "storm damage", "ceiling leak"],
          },
          {
            key: "emergency_tree",
            label: "Tree on house / driveway",
            searchTerms: ["fallen tree", "tree on house", "tree blocking driveway"],
          },
          {
            key: "emergency_lockout",
            label: "Lockout help",
            searchTerms: ["locked out", "locksmith", "keys"],
          },
        ],
      },
    ],
  },
  {
    key: "home_services",
    label: "Home Services",
    shortLabel: "Home",
    description: "Repairs, installs, maintenance, and home projects.",
    icon: "🏠",
    accent: "cyan",
    ticketType: "SERVICE",
    fulfillmentTypes: [FULFILLMENT_TYPES.ONSITE, FULFILLMENT_TYPES.QUOTE],
    categories: [
      {
        key: "plumbing",
        label: "Plumbing",
        services: [
          { key: "plumbing_leak_repair", label: "Leak repair", searchTerms: ["leak", "pipe", "water"] },
          { key: "plumbing_drain_clog", label: "Drain clog", searchTerms: ["clog", "drain", "sink"] },
          { key: "plumbing_toilet", label: "Toilet repair", searchTerms: ["toilet", "overflow", "running toilet"] },
          { key: "plumbing_faucet", label: "Faucet repair / install", searchTerms: ["faucet", "sink", "fixture"] },
          { key: "plumbing_garbage_disposal", label: "Garbage disposal", searchTerms: ["disposal", "sink"] },
          { key: "plumbing_water_heater", label: "Water heater", searchTerms: ["hot water", "water heater"] },
          { key: "plumbing_sewer", label: "Sewer line issue", searchTerms: ["sewer", "backup"] },
          { key: "plumbing_fixture_install", label: "Fixture install", searchTerms: ["install toilet", "install sink"] },
        ],
      },
      {
        key: "hvac",
        label: "HVAC",
        services: [
          { key: "hvac_ac_not_cooling", label: "AC not cooling", searchTerms: ["ac", "air conditioning", "hot house"] },
          { key: "hvac_heat_not_working", label: "Heat not working", searchTerms: ["heat", "heater", "furnace"] },
          { key: "hvac_thermostat", label: "Thermostat issue", searchTerms: ["thermostat", "nest"] },
          { key: "hvac_maintenance", label: "Maintenance / tune-up", searchTerms: ["maintenance", "service"] },
          { key: "hvac_filter_change", label: "Filter change", searchTerms: ["filter"] },
          { key: "hvac_ductwork", label: "Ductwork", searchTerms: ["duct", "airflow"] },
          { key: "hvac_inspection", label: "System inspection", searchTerms: ["inspect", "diagnostic"] },
        ],
      },
      {
        key: "electrical",
        label: "Electrical",
        services: [
          { key: "electrical_outlet", label: "Outlet repair / install", searchTerms: ["outlet", "plug"] },
          { key: "electrical_light_fixture", label: "Light fixture install", searchTerms: ["light", "fixture"] },
          { key: "electrical_breaker", label: "Breaker issue", searchTerms: ["breaker", "panel"] },
          { key: "electrical_ceiling_fan", label: "Ceiling fan install", searchTerms: ["fan"] },
          { key: "electrical_panel", label: "Panel inspection", searchTerms: ["panel", "breaker box"] },
          { key: "electrical_ev_charger", label: "EV charger install", searchTerms: ["ev", "charger", "tesla"] },
          { key: "electrical_generator", label: "Generator hookup", searchTerms: ["generator"] },
        ],
      },
      {
        key: "handyman",
        label: "Handyman",
        services: [
          { key: "handyman_general", label: "General handyman", searchTerms: ["repair", "fix", "home repair"] },
          { key: "handyman_drywall", label: "Drywall repair", searchTerms: ["drywall", "wall hole"] },
          { key: "handyman_door", label: "Door repair", searchTerms: ["door", "hinge"] },
          { key: "handyman_window", label: "Window repair", searchTerms: ["window"] },
          { key: "handyman_furniture_assembly", label: "Furniture assembly", searchTerms: ["assembly", "ikea"] },
          { key: "handyman_tv_mount", label: "TV mounting", searchTerms: ["tv", "mount"] },
          { key: "handyman_shelving", label: "Shelving / wall install", searchTerms: ["shelf", "shelving"] },
        ],
      },
      {
        key: "roofing_gutters",
        label: "Roofing & Gutters",
        services: [
          { key: "roofing_repair", label: "Roof repair", searchTerms: ["roof", "shingle"] },
          { key: "roofing_leak", label: "Roof leak", searchTerms: ["leak", "ceiling"] },
          { key: "gutters_cleaning", label: "Gutter cleaning", searchTerms: ["gutter"] },
          { key: "gutters_repair", label: "Gutter repair", searchTerms: ["gutter repair"] },
          { key: "roofing_inspection", label: "Roof inspection", searchTerms: ["inspect roof"] },
        ],
      },
      {
        key: "appliance",
        label: "Appliance Repair",
        services: [
          { key: "appliance_fridge", label: "Refrigerator repair", searchTerms: ["fridge", "refrigerator"] },
          { key: "appliance_washer", label: "Washer repair", searchTerms: ["washer", "washing machine"] },
          { key: "appliance_dryer", label: "Dryer repair", searchTerms: ["dryer"] },
          { key: "appliance_dishwasher", label: "Dishwasher repair", searchTerms: ["dishwasher"] },
          { key: "appliance_oven", label: "Oven / stove repair", searchTerms: ["oven", "stove"] },
          { key: "appliance_install", label: "Appliance install", searchTerms: ["install appliance"] },
        ],
      },
      {
        key: "painting_flooring",
        label: "Painting & Flooring",
        services: [
          { key: "painting_interior", label: "Interior painting", searchTerms: ["paint", "interior"] },
          { key: "painting_exterior", label: "Exterior painting", searchTerms: ["paint", "exterior"] },
          { key: "flooring_repair", label: "Flooring repair", searchTerms: ["floor", "flooring"] },
          { key: "flooring_install", label: "Flooring install", searchTerms: ["install floor"] },
          { key: "tile_repair", label: "Tile repair", searchTerms: ["tile"] },
        ],
      },
    ],
  },
  {
    key: "outdoor_property",
    label: "Outdoor & Property",
    shortLabel: "Outdoor",
    description: "Lawn, landscaping, trees, junk, hauling, and exterior work.",
    icon: "🌳",
    accent: "emerald",
    ticketType: "SERVICE",
    fulfillmentTypes: [FULFILLMENT_TYPES.ONSITE, FULFILLMENT_TYPES.QUOTE],
    categories: [
      {
        key: "lawn_landscaping",
        label: "Lawn & Landscaping",
        services: [
          { key: "lawn_mowing", label: "Lawn mowing", searchTerms: ["mow", "grass", "yard"] },
          { key: "lawn_edging", label: "Edging / trimming", searchTerms: ["edge", "weed eat"] },
          { key: "lawn_weeds", label: "Weed control", searchTerms: ["weeds", "spray"] },
          { key: "landscape_mulch", label: "Mulch / pine straw", searchTerms: ["mulch", "pine straw"] },
          { key: "landscape_flower_beds", label: "Flower beds", searchTerms: ["flower bed", "beds"] },
          { key: "landscape_sod", label: "Sod install", searchTerms: ["sod", "grass install"] },
          { key: "landscape_irrigation", label: "Irrigation / sprinkler", searchTerms: ["sprinkler", "irrigation"] },
          { key: "yard_cleanup", label: "Yard cleanup", searchTerms: ["yard cleanup", "cleanup"] },
          { key: "leaf_removal", label: "Leaf removal", searchTerms: ["leaves", "leaf"] },
          { key: "hedge_trimming", label: "Hedge trimming", searchTerms: ["hedge", "bush"] },
        ],
      },
      {
        key: "tree_services",
        label: "Tree Services",
        services: [
          { key: "tree_trimming", label: "Tree trimming", searchTerms: ["trim tree", "branches"] },
          { key: "tree_removal", label: "Tree removal", searchTerms: ["remove tree", "cut tree"] },
          { key: "stump_grinding", label: "Stump grinding", searchTerms: ["stump", "grind stump"] },
          { key: "brush_removal", label: "Brush removal", searchTerms: ["brush", "brush hauling", "overgrown"] },
          { key: "storm_cleanup", label: "Storm cleanup", searchTerms: ["storm", "limbs", "debris"] },
          { key: "fallen_limb_removal", label: "Fallen limb removal", searchTerms: ["fallen limb", "branch"] },
          { key: "lot_clearing", label: "Lot clearing", searchTerms: ["clear lot", "land clearing"] },
          { key: "tree_inspection", label: "Tree inspection", searchTerms: ["inspect tree", "dead tree"] },
          { key: "tree_debris_haulaway", label: "Haul away branches / debris", searchTerms: ["haul branches", "debris"] },
        ],
      },
      {
        key: "junk_hauling",
        label: "Junk & Hauling",
        services: [
          { key: "junk_removal", label: "Junk removal", searchTerms: ["junk", "trash", "remove stuff"] },
          { key: "furniture_removal", label: "Furniture removal", searchTerms: ["couch", "furniture"] },
          { key: "appliance_removal", label: "Appliance removal", searchTerms: ["fridge removal", "washer removal"] },
          { key: "construction_debris", label: "Construction debris", searchTerms: ["debris", "construction trash"] },
          { key: "garage_cleanout", label: "Garage cleanout", searchTerms: ["garage", "cleanout"] },
          { key: "estate_cleanout", label: "Estate cleanout", searchTerms: ["estate", "house cleanout"] },
          { key: "hot_tub_removal", label: "Hot tub removal", searchTerms: ["hot tub"] },
          { key: "trailer_hauling", label: "Trailer hauling", searchTerms: ["trailer", "haul"] },
        ],
      },
      {
        key: "exterior_services",
        label: "Exterior Services",
        services: [
          { key: "pressure_washing", label: "Pressure washing", searchTerms: ["pressure wash", "power wash"] },
          { key: "window_cleaning", label: "Window cleaning", searchTerms: ["windows"] },
          { key: "fence_repair", label: "Fence repair", searchTerms: ["fence"] },
          { key: "concrete_repair", label: "Concrete repair", searchTerms: ["concrete", "driveway"] },
          { key: "pool_service", label: "Pool service", searchTerms: ["pool"] },
          { key: "pest_control", label: "Pest control", searchTerms: ["bugs", "pest", "roaches", "ants"] },
        ],
      },
    ],
  },
  {
    key: "cleaning",
    label: "Cleaning",
    shortLabel: "Cleaning",
    description: "Home, office, move-out, turnover, and deep cleaning.",
    icon: "🧽",
    accent: "sky",
    ticketType: "SERVICE",
    fulfillmentTypes: [FULFILLMENT_TYPES.ONSITE, FULFILLMENT_TYPES.QUOTE],
    categories: [
      {
        key: "cleaning_services",
        label: "Cleaning Services",
        services: [
          { key: "house_cleaning", label: "House cleaning", searchTerms: ["maid", "clean house"] },
          { key: "deep_cleaning", label: "Deep cleaning", searchTerms: ["deep clean"] },
          { key: "move_out_cleaning", label: "Move-out cleaning", searchTerms: ["move out", "move in"] },
          { key: "airbnb_turnover", label: "Airbnb / short-term rental turnover", searchTerms: ["airbnb", "turnover"] },
          { key: "office_cleaning", label: "Office cleaning", searchTerms: ["office", "commercial cleaning"] },
          { key: "carpet_cleaning", label: "Carpet cleaning", searchTerms: ["carpet"] },
          { key: "post_construction_cleaning", label: "Post-construction cleaning", searchTerms: ["construction cleaning"] },
        ],
      },
    ],
  },
  {
    key: "real_estate",
    label: "Real Estate",
    shortLabel: "Real Estate",
    description: "Buying, selling, showings, inspections, listing prep, and real estate help.",
    icon: "🏡",
    accent: "violet",
    ticketType: "REAL_ESTATE",
    fulfillmentTypes: [FULFILLMENT_TYPES.ONSITE, FULFILLMENT_TYPES.VIRTUAL, FULFILLMENT_TYPES.BOOKING],
    categories: [
      {
        key: "real_estate_services",
        label: "Real Estate Help",
        services: [
          { key: "real_estate_realtor_inquiry", label: "Talk to a realtor", searchTerms: ["realtor", "agent"] },
          { key: "real_estate_buy_home", label: "Buy a home", searchTerms: ["buy home", "house hunting"] },
          { key: "real_estate_sell_home", label: "Sell a home", searchTerms: ["sell home", "listing"] },
          { key: "real_estate_showing", label: "Schedule a showing", searchTerms: ["showing", "tour home"] },
          { key: "real_estate_open_house", label: "Open house question", searchTerms: ["open house"] },
          { key: "real_estate_rental_search", label: "Rental / apartment search", searchTerms: ["rent", "apartment"] },
          { key: "real_estate_inspection", label: "Home inspection", searchTerms: ["inspection"] },
          { key: "real_estate_appraisal", label: "Appraisal help", searchTerms: ["appraisal"] },
          { key: "real_estate_lender", label: "Mortgage / lender help", searchTerms: ["mortgage", "loan"] },
          { key: "real_estate_title_closing", label: "Title / closing help", searchTerms: ["title", "closing"] },
          { key: "real_estate_photography", label: "Listing photos / media", searchTerms: ["photos", "listing media"] },
          { key: "real_estate_staging", label: "Home staging", searchTerms: ["stage home", "staging"] },
          { key: "real_estate_listing_prep", label: "Repairs before listing", searchTerms: ["listing prep", "repair before sale"] },
        ],
      },
    ],
  },
  {
    key: "property_management",
    label: "Property Management",
    shortLabel: "PM",
    description: "Tenant repairs, turnovers, make-ready, and rental maintenance.",
    icon: "🔑",
    accent: "indigo",
    ticketType: "PROPERTY_MANAGEMENT",
    fulfillmentTypes: [FULFILLMENT_TYPES.ONSITE, FULFILLMENT_TYPES.QUOTE],
    categories: [
      {
        key: "pm_services",
        label: "PM / Rental Support",
        services: [
          { key: "property_tenant_repair", label: "Tenant repair dispatch", searchTerms: ["tenant repair", "maintenance"] },
          { key: "property_make_ready", label: "Make-ready / turnover", searchTerms: ["make ready", "turnover"] },
          { key: "property_move_out_inspection", label: "Move-out inspection", searchTerms: ["move out inspection"] },
          { key: "property_preventive_maintenance", label: "Preventive maintenance", searchTerms: ["preventive"] },
          { key: "property_lock_change", label: "Lock change", searchTerms: ["lock", "key"] },
          { key: "property_lawn_violation", label: "Lawn violation cleanup", searchTerms: ["lawn violation"] },
          { key: "property_vendor_quote", label: "Vendor quote request", searchTerms: ["vendor quote"] },
          { key: "property_walkthrough", label: "Property walkthrough", searchTerms: ["walkthrough"] },
          { key: "property_emergency_dispatch", label: "Emergency dispatch", searchTerms: ["emergency rental"] },
        ],
      },
    ],
  },
  {
    key: "auto_mobile",
    label: "Auto & Mobile",
    shortLabel: "Auto",
    description: "Mobile mechanic, detailing, towing, jump starts, and roadside help.",
    icon: "🚗",
    accent: "amber",
    ticketType: "SERVICE",
    fulfillmentTypes: [FULFILLMENT_TYPES.ONSITE, FULFILLMENT_TYPES.QUOTE],
    categories: [
      {
        key: "auto_services",
        label: "Auto Services",
        services: [
          { key: "mobile_mechanic", label: "Mobile mechanic", searchTerms: ["mechanic", "car repair"] },
          { key: "auto_oil_change", label: "Oil change", searchTerms: ["oil"] },
          { key: "auto_battery", label: "Battery replacement / jump", searchTerms: ["battery", "jump start"] },
          { key: "auto_tire", label: "Tire change / flat tire", searchTerms: ["flat tire", "tire"] },
          { key: "auto_lockout", label: "Vehicle lockout", searchTerms: ["locked car"] },
          { key: "auto_detailing", label: "Car detailing", searchTerms: ["detail", "wash"] },
          { key: "auto_windshield", label: "Windshield repair", searchTerms: ["windshield"] },
          { key: "auto_towing", label: "Towing request", searchTerms: ["tow", "towing"] },
        ],
      },
    ],
  },
  {
    key: "pets",
    label: "Pets",
    shortLabel: "Pets",
    description: "Dog grooming, pet sitting, walking, training, and mobile pet help.",
    icon: "🐶",
    accent: "pink",
    ticketType: "SERVICE",
    fulfillmentTypes: [FULFILLMENT_TYPES.ONSITE, FULFILLMENT_TYPES.BOOKING],
    categories: [
      {
        key: "pet_services",
        label: "Pet Services",
        services: [
          { key: "dog_grooming", label: "Dog grooming", searchTerms: ["dog grooming", "groomer"] },
          { key: "pet_sitting", label: "Pet sitting / boarding", searchTerms: ["pet sitting", "boarding"] },
          { key: "dog_walking", label: "Dog walking", searchTerms: ["dog walker"] },
          { key: "pet_training", label: "Pet training", searchTerms: ["dog training"] },
          { key: "mobile_pet_help", label: "Mobile pet help", searchTerms: ["mobile pet"] },
          { key: "pet_waste_cleanup", label: "Pet waste cleanup", searchTerms: ["poop scoop", "yard pet waste"] },
        ],
      },
    ],
  },
  {
    key: "education_tutoring",
    label: "Tutoring & Education",
    shortLabel: "Tutoring",
    description: "Tutoring, test prep, lessons, and learning support.",
    icon: "📚",
    accent: "blue",
    ticketType: "BOOKING",
    fulfillmentTypes: [FULFILLMENT_TYPES.ONSITE, FULFILLMENT_TYPES.VIRTUAL, FULFILLMENT_TYPES.BOOKING],
    categories: [
      {
        key: "tutoring_services",
        label: "Tutoring",
        services: [
          { key: "math_tutoring", label: "Math tutoring", searchTerms: ["math", "algebra", "geometry"] },
          { key: "reading_tutoring", label: "Reading / writing tutoring", searchTerms: ["reading", "writing"] },
          { key: "test_prep", label: "Test prep", searchTerms: ["act", "sat", "test"] },
          { key: "language_lessons", label: "Language lessons", searchTerms: ["spanish", "language"] },
          { key: "music_lessons", label: "Music lessons", searchTerms: ["music", "piano", "guitar"] },
          { key: "homework_help", label: "Homework help", searchTerms: ["homework"] },
        ],
      },
    ],
  },
  {
    key: "food_restaurants",
    label: "Food & Restaurants",
    shortLabel: "Food",
    description: "Pickup, delivery, catering, and restaurant requests.",
    icon: "🍔",
    accent: "orange",
    ticketType: "FOOD",
    fulfillmentTypes: [FULFILLMENT_TYPES.PICKUP, FULFILLMENT_TYPES.DELIVERY, FULFILLMENT_TYPES.BOOKING],
    categories: [
      {
        key: "restaurant_services",
        label: "Restaurants",
        services: [
          { key: "restaurant_pickup_order", label: "Pickup order", searchTerms: ["food pickup", "restaurant pickup"] },
          { key: "restaurant_delivery_order", label: "Delivery order", searchTerms: ["food delivery", "restaurant delivery"] },
          { key: "restaurant_catering", label: "Catering request", searchTerms: ["catering"] },
          { key: "restaurant_reservation", label: "Reservation request", searchTerms: ["reservation", "table"] },
          { key: "restaurant_large_order", label: "Large group order", searchTerms: ["large order", "office lunch"] },
        ],
      },
    ],
  },
  {
    key: "retail_products",
    label: "Retail & Products",
    shortLabel: "Retail",
    description: "Local products, delivery, pickup, quotes, and inventory requests.",
    icon: "🛍️",
    accent: "fuchsia",
    ticketType: "RETAIL",
    fulfillmentTypes: [FULFILLMENT_TYPES.PICKUP, FULFILLMENT_TYPES.DELIVERY, FULFILLMENT_TYPES.QUOTE],
    categories: [
      {
        key: "local_retail",
        label: "Local Retail",
        services: [
          { key: "retail_product_inquiry", label: "Product inquiry", searchTerms: ["product", "item"] },
          { key: "retail_local_pickup", label: "Local pickup", searchTerms: ["pickup"] },
          { key: "retail_local_delivery", label: "Local delivery", searchTerms: ["delivery"] },
          { key: "retail_quote_request", label: "Product quote request", searchTerms: ["quote"] },
          { key: "retail_inventory_hold", label: "Inventory hold", searchTerms: ["hold item", "reserve"] },
        ],
      },
      {
        key: "outdoor_supplies",
        label: "Outdoor Supplies",
        services: [
          { key: "retail_mulch_delivery", label: "Mulch delivery", searchTerms: ["mulch delivery"] },
          { key: "retail_sod_quote", label: "Sod quote", searchTerms: ["sod"] },
          { key: "retail_gravel_delivery", label: "Gravel / rock delivery", searchTerms: ["gravel", "rock"] },
          { key: "retail_soil_delivery", label: "Soil / dirt delivery", searchTerms: ["soil", "dirt"] },
        ],
      },
    ],
  },
  {
    key: "beauty_wellness",
    label: "Beauty & Wellness",
    shortLabel: "Beauty",
    description: "Hair, nails, massage, trainers, and mobile beauty services.",
    icon: "✨",
    accent: "rose",
    ticketType: "BOOKING",
    fulfillmentTypes: [FULFILLMENT_TYPES.ONSITE, FULFILLMENT_TYPES.BOOKING],
    categories: [
      {
        key: "beauty_services",
        label: "Beauty Services",
        services: [
          { key: "barber", label: "Barber / haircut", searchTerms: ["barber", "haircut"] },
          { key: "hair_stylist", label: "Hair stylist", searchTerms: ["hair", "stylist"] },
          { key: "nails", label: "Nails", searchTerms: ["nails", "manicure"] },
          { key: "makeup", label: "Makeup", searchTerms: ["makeup"] },
          { key: "massage", label: "Massage", searchTerms: ["massage"] },
          { key: "personal_training", label: "Personal trainer", searchTerms: ["trainer", "fitness"] },
          { key: "mobile_beauty", label: "Mobile beauty service", searchTerms: ["mobile beauty"] },
        ],
      },
    ],
  },
  {
    key: "events_media",
    label: "Events & Media",
    shortLabel: "Events",
    description: "Photography, DJ, video, party setup, and event support.",
    icon: "🎉",
    accent: "purple",
    ticketType: "BOOKING",
    fulfillmentTypes: [FULFILLMENT_TYPES.ONSITE, FULFILLMENT_TYPES.BOOKING, FULFILLMENT_TYPES.QUOTE],
    categories: [
      {
        key: "event_services",
        label: "Event Services",
        services: [
          { key: "photography", label: "Photography", searchTerms: ["photographer", "photos"] },
          { key: "videography", label: "Videography", searchTerms: ["video"] },
          { key: "dj", label: "DJ / music", searchTerms: ["dj", "music"] },
          { key: "event_setup", label: "Event setup", searchTerms: ["setup", "party"] },
          { key: "party_cleanup", label: "Party cleanup", searchTerms: ["cleanup"] },
          { key: "balloon_decor", label: "Balloon / decor setup", searchTerms: ["balloons", "decor"] },
          { key: "event_security", label: "Event security", searchTerms: ["security"] },
          { key: "bartending_service", label: "Bartending service", searchTerms: ["bartender"] },
        ],
      },
    ],
  },
  {
    key: "business_services",
    label: "Business Services",
    shortLabel: "Business",
    description: "Bookkeeping, tax, notary, IT, marketing, admin, and commercial support.",
    icon: "💼",
    accent: "slate",
    ticketType: "BUSINESS",
    fulfillmentTypes: [FULFILLMENT_TYPES.ONSITE, FULFILLMENT_TYPES.VIRTUAL, FULFILLMENT_TYPES.QUOTE],
    categories: [
      {
        key: "business_help",
        label: "Business Help",
        services: [
          { key: "bookkeeping", label: "Bookkeeping", searchTerms: ["bookkeeping", "books"] },
          { key: "tax_help", label: "Tax help", searchTerms: ["tax"] },
          { key: "notary", label: "Notary", searchTerms: ["notary"] },
          { key: "marketing_ads", label: "Marketing / ads", searchTerms: ["marketing", "ads"] },
          { key: "website_help", label: "Website help", searchTerms: ["website", "web"] },
          { key: "admin_help", label: "Admin help", searchTerms: ["admin", "assistant"] },
          { key: "commercial_maintenance", label: "Commercial maintenance", searchTerms: ["commercial", "maintenance"] },
          { key: "office_cleaning_business", label: "Office cleaning", searchTerms: ["office cleaning"] },
        ],
      },
    ],
  },
  {
    key: "tech_help",
    label: "Tech Help",
    shortLabel: "Tech",
    description: "Computers, WiFi, phones, smart home, cameras, printers, and websites.",
    icon: "💻",
    accent: "cyan",
    ticketType: "SERVICE",
    fulfillmentTypes: [FULFILLMENT_TYPES.ONSITE, FULFILLMENT_TYPES.VIRTUAL],
    categories: [
      {
        key: "tech_services",
        label: "Tech Services",
        services: [
          { key: "computer_repair", label: "Computer repair", searchTerms: ["computer", "laptop"] },
          { key: "wifi_setup", label: "WiFi / network setup", searchTerms: ["wifi", "internet"] },
          { key: "smart_home_setup", label: "Smart home setup", searchTerms: ["smart home"] },
          { key: "camera_install", label: "Camera install", searchTerms: ["camera", "security camera"] },
          { key: "phone_help", label: "Phone / device help", searchTerms: ["phone", "iphone"] },
          { key: "printer_setup", label: "Printer setup", searchTerms: ["printer"] },
          { key: "data_backup", label: "Data backup", searchTerms: ["backup", "data"] },
        ],
      },
    ],
  },
  {
    key: "errands_help",
    label: "Errands & Help",
    shortLabel: "Errands",
    description: "Pickup, delivery, assembly, errands, and general local help.",
    icon: "🧭",
    accent: "teal",
    ticketType: "SERVICE",
    fulfillmentTypes: [FULFILLMENT_TYPES.ONSITE, FULFILLMENT_TYPES.DELIVERY],
    categories: [
      {
        key: "errand_services",
        label: "Errands",
        services: [
          { key: "grocery_errand", label: "Grocery / errands", searchTerms: ["grocery", "errand"] },
          { key: "pickup_dropoff", label: "Pickup / drop-off", searchTerms: ["pickup", "dropoff"] },
          { key: "delivery_pickup", label: "Delivery / pickup", searchTerms: ["delivery"] },
          { key: "assembly_help", label: "Assembly help", searchTerms: ["assembly"] },
          { key: "moving_help", label: "Moving help", searchTerms: ["moving"] },
          { key: "senior_help", label: "Senior help / check-in", searchTerms: ["senior", "help"] },
        ],
      },
    ],
  },
  {
    key: "other",
    label: "Something Else",
    shortLabel: "Other",
    description: "Can’t find it? Create a custom SyncWorks ticket.",
    icon: "➕",
    accent: "slate",
    ticketType: "CUSTOM",
    fulfillmentTypes: [FULFILLMENT_TYPES.QUOTE],
    categories: [
      {
        key: "custom_request",
        label: "Custom Request",
        services: [
          { key: "custom_anything", label: "Describe what you need", searchTerms: ["other", "custom", "anything"] },
        ],
      },
    ],
  },
];

export function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export function safeLower(value) {
  return String(value || "").trim().toLowerCase();
}

export function flattenMarketplaceCatalog(catalog = MARKETPLACE_CATALOG) {
  const rows = [];

  catalog.forEach((vertical) => {
    (vertical.categories || []).forEach((category) => {
      (category.services || []).forEach((service) => {
        rows.push({
          ...service,
          verticalKey: vertical.key,
          verticalLabel: vertical.label,
          verticalShortLabel: vertical.shortLabel || vertical.label,
          verticalIcon: vertical.icon,
          verticalAccent: vertical.accent,
          ticketType: vertical.ticketType,
          fulfillmentTypes: vertical.fulfillmentTypes || [],
          categoryKey: category.key,
          categoryLabel: category.label,
          searchBlob: [
            vertical.label,
            vertical.shortLabel,
            vertical.description,
            category.label,
            service.label,
            ...(service.searchTerms || []),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase(),
        });
      });
    });
  });

  return rows;
}

export const FLAT_MARKETPLACE_SERVICES = flattenMarketplaceCatalog();

export function findServiceByKey(serviceKey) {
  if (!serviceKey) return null;
  return FLAT_MARKETPLACE_SERVICES.find((service) => service.key === serviceKey) || null;
}

export function findVerticalByKey(verticalKey) {
  if (!verticalKey) return null;
  return MARKETPLACE_CATALOG.find((vertical) => vertical.key === verticalKey) || null;
}

export function findCategoryByKey(categoryKey) {
  if (!categoryKey) return null;

  for (const vertical of MARKETPLACE_CATALOG) {
    const category = (vertical.categories || []).find((c) => c.key === categoryKey);
    if (category) {
      return {
        ...category,
        verticalKey: vertical.key,
        verticalLabel: vertical.label,
        verticalIcon: vertical.icon,
        ticketType: vertical.ticketType,
      };
    }
  }

  return null;
}

export function getPopularServices() {
  return POPULAR_SERVICE_KEYS.map(findServiceByKey).filter(Boolean);
}

export function searchMarketplaceServices(query, limit = 40) {
  const q = safeLower(query);
  const all = FLAT_MARKETPLACE_SERVICES;

  if (!q) return getPopularServices();

  return all
    .map((service) => {
      const label = safeLower(service.label);
      const category = safeLower(service.categoryLabel);
      const vertical = safeLower(service.verticalLabel);
      const blob = service.searchBlob || "";

      let score = 0;

      if (label === q) score += 100;
      if (label.startsWith(q)) score += 50;
      if (label.includes(q)) score += 25;
      if (category.includes(q)) score += 15;
      if (vertical.includes(q)) score += 12;
      if (blob.includes(q)) score += 10;

      q.split(/\s+/)
        .filter(Boolean)
        .forEach((term) => {
          if (label.includes(term)) score += 8;
          if (blob.includes(term)) score += 3;
        });

      return { service, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.service.label.localeCompare(b.service.label))
    .slice(0, limit)
    .map((row) => row.service);
}

export function getServicesForVertical(verticalKey) {
  return FLAT_MARKETPLACE_SERVICES.filter((service) => service.verticalKey === verticalKey);
}

export function getServicesForCategory(categoryKey) {
  return FLAT_MARKETPLACE_SERVICES.filter((service) => service.categoryKey === categoryKey);
}

export function filterServicesForBusiness(serviceRows, businessServiceKeys = []) {
  const keys = new Set((businessServiceKeys || []).map(String).filter(Boolean));

  if (!keys.size) return serviceRows || [];

  return (serviceRows || []).filter((service) => {
    return (
      keys.has(service.key) ||
      keys.has(service.categoryKey) ||
      keys.has(service.verticalKey) ||
      keys.has(service.label)
    );
  });
}

export function getAccentClasses(accent, active = false) {
  const map = {
    red: active
      ? "border-red-400 bg-red-500/20 text-red-50 shadow-[0_0_28px_rgba(239,68,68,0.22)]"
      : "border-red-500/25 bg-red-500/8 text-red-100 hover:border-red-400/50",
    cyan: active
      ? "border-cyan-400 bg-cyan-500/20 text-cyan-50 shadow-[0_0_28px_rgba(34,211,238,0.18)]"
      : "border-cyan-500/25 bg-cyan-500/8 text-cyan-100 hover:border-cyan-400/50",
    emerald: active
      ? "border-emerald-400 bg-emerald-500/20 text-emerald-50 shadow-[0_0_28px_rgba(16,185,129,0.18)]"
      : "border-emerald-500/25 bg-emerald-500/8 text-emerald-100 hover:border-emerald-400/50",
    violet: active
      ? "border-violet-400 bg-violet-500/20 text-violet-50 shadow-[0_0_28px_rgba(139,92,246,0.18)]"
      : "border-violet-500/25 bg-violet-500/8 text-violet-100 hover:border-violet-400/50",
    indigo: active
      ? "border-indigo-400 bg-indigo-500/20 text-indigo-50 shadow-[0_0_28px_rgba(99,102,241,0.18)]"
      : "border-indigo-500/25 bg-indigo-500/8 text-indigo-100 hover:border-indigo-400/50",
    amber: active
      ? "border-amber-400 bg-amber-500/20 text-amber-50 shadow-[0_0_28px_rgba(245,158,11,0.18)]"
      : "border-amber-500/25 bg-amber-500/8 text-amber-100 hover:border-amber-400/50",
    pink: active
      ? "border-pink-400 bg-pink-500/20 text-pink-50 shadow-[0_0_28px_rgba(236,72,153,0.18)]"
      : "border-pink-500/25 bg-pink-500/8 text-pink-100 hover:border-pink-400/50",
    orange: active
      ? "border-orange-400 bg-orange-500/20 text-orange-50 shadow-[0_0_28px_rgba(249,115,22,0.18)]"
      : "border-orange-500/25 bg-orange-500/8 text-orange-100 hover:border-orange-400/50",
    fuchsia: active
      ? "border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-50 shadow-[0_0_28px_rgba(217,70,239,0.18)]"
      : "border-fuchsia-500/25 bg-fuchsia-500/8 text-fuchsia-100 hover:border-fuchsia-400/50",
    rose: active
      ? "border-rose-400 bg-rose-500/20 text-rose-50 shadow-[0_0_28px_rgba(244,63,94,0.18)]"
      : "border-rose-500/25 bg-rose-500/8 text-rose-100 hover:border-rose-400/50",
    purple: active
      ? "border-purple-400 bg-purple-500/20 text-purple-50 shadow-[0_0_28px_rgba(168,85,247,0.18)]"
      : "border-purple-500/25 bg-purple-500/8 text-purple-100 hover:border-purple-400/50",
    teal: active
      ? "border-teal-400 bg-teal-500/20 text-teal-50 shadow-[0_0_28px_rgba(20,184,166,0.18)]"
      : "border-teal-500/25 bg-teal-500/8 text-teal-100 hover:border-teal-400/50",
    sky: active
      ? "border-sky-400 bg-sky-500/20 text-sky-50 shadow-[0_0_28px_rgba(14,165,233,0.18)]"
      : "border-sky-500/25 bg-sky-500/8 text-sky-100 hover:border-sky-400/50",
    blue: active
      ? "border-blue-400 bg-blue-500/20 text-blue-50 shadow-[0_0_28px_rgba(59,130,246,0.18)]"
      : "border-blue-500/25 bg-blue-500/8 text-blue-100 hover:border-blue-400/50",
    slate: active
      ? "border-slate-400 bg-slate-700/60 text-slate-50 shadow-[0_0_28px_rgba(148,163,184,0.12)]"
      : "border-slate-700 bg-slate-900/50 text-slate-100 hover:border-slate-500",
  };

  return map[accent] || map.cyan;
}