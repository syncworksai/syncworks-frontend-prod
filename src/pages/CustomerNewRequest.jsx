import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";

/**
 * SyncWorks — Customer New Request
 *
 * Production routing strategy:
 * 1) User picks life bucket
 * 2) User picks subtype
 * 3) Frontend resolves the BEST backend group category for that subtype
 * 4) Frontend fetches exact leaf jobs directly with ?parent=<group_id>
 */

// ----------------------------
// Priority Levels
// ----------------------------
const PRIORITY_LEVELS = [
  { id: "P1", label: "P1 – Urgent (1–4 hours)", hint: "Fast response requested for urgent or time-sensitive needs." },
  { id: "P2", label: "P2 – Next Day", hint: "Provider response requested by the next day." },
  { id: "P3", label: "P3 – By End of Week", hint: "Needs attention soon, but not immediately." },
  { id: "P4", label: "P4 – First Available", hint: "Flexible timing. Schedule whenever the provider is first open." },
];

// ----------------------------
// Payment preference
// ----------------------------
const PAYMENT_PREFS = [
  { id: "CARD_ON_FILE", label: "Pay by card after completion", hint: "Provider will send an invoice when the job is done." },
  { id: "CASH", label: "Pay with cash / offline", hint: "You’ll coordinate payment directly with the provider." },
  { id: "PAY_LATER", label: "Pay later (invoice)", hint: "You’ll receive an invoice and can pay when ready." },
];

// ----------------------------
// Timezones
// ----------------------------
const TIMEZONE_OPTIONS = [
  { id: "America/New_York", label: "ET" },
  { id: "America/Chicago", label: "CT" },
  { id: "America/Denver", label: "MT" },
  { id: "America/Los_Angeles", label: "PT" },
];

// ----------------------------
// Life categories (UX buckets)
// ----------------------------
const LIFE_CATEGORIES = [
  { key: "home_property", label: "Home", emoji: "🏠", desc: "Repairs, cleaning, HVAC, lawn, appliances" },
  { key: "auto", label: "Auto", emoji: "🚘", desc: "Detailing, repairs, roadside, tint, audio" },
  { key: "commercial", label: "Commercial", emoji: "🏢", desc: "Offices, retail, facilities, maintenance" },
  { key: "rideshare", label: "Ride Share", emoji: "🚗", desc: "Drivers, pickups, scheduled rides" },
  { key: "party_services", label: "Party Services", emoji: "🎉", desc: "Inflatables, DJ, setup, photo/video" },
  { key: "pets", label: "Pets", emoji: "🐾", desc: "Grooming, sitting, walking, training" },
  { key: "kids_family", label: "Kids & Family", emoji: "👨‍👩‍👧", desc: "Babysitting, tutoring, family help" },
  { key: "beauty_wellness", label: "Beauty", emoji: "💆", desc: "Hair, nails, massage, wellness" },
  { key: "errands_help", label: "Errands", emoji: "🛍️", desc: "Pickups, assembly, errands, help" },
  { key: "sports_activities", label: "Sports", emoji: "🏋️", desc: "Training, coaching, lessons" },
  { key: "tech_digital", label: "Tech", emoji: "💻", desc: "Computer, Wi-Fi, devices, websites" },
  { key: "education_tutoring", label: "Education", emoji: "📚", desc: "Tutoring, test prep, lessons" },
  { key: "business_finance", label: "Business", emoji: "💼", desc: "Notary, bookkeeping, marketing, finance" },
  { key: "property_mgmt", label: "Property Mgmt", emoji: "🧰", desc: "Dispatch, make-ready, inspections" },
  { key: "other", label: "Something Else", emoji: "✨", desc: "Describe a custom job" },
];

// ----------------------------
// Smart search aliases
// ----------------------------
const SEARCH_ALIASES = {
  home_property: [
    "plumber",
    "plumbing",
    "leak",
    "leaky faucet",
    "drain",
    "toilet",
    "water heater",
    "hvac",
    "ac",
    "air conditioner",
    "furnace",
    "electrical",
    "outlet",
    "breaker",
    "cleaning",
    "lawn",
    "roof",
    "handyman",
    "pressure washing",
    "appliance repair",
  ],
  auto: [
    "car",
    "vehicle",
    "mechanic",
    "detailing",
    "detail",
    "tint",
    "roadside",
    "battery",
    "tow",
    "brakes",
    "engine diagnostics",
  ],
  commercial: [
    "office",
    "facility",
    "janitorial",
    "commercial hvac",
    "commercial electrical",
    "maintenance",
    "retail",
  ],
  rideshare: [
    "ride",
    "airport",
    "driver",
    "delivery",
    "courier",
    "pickup",
    "dropoff",
    "transport",
  ],
  party_services: [
    "bounce house",
    "inflatable",
    "dj",
    "party",
    "event",
    "photography",
    "videography",
    "decor",
  ],
  pets: [
    "dog grooming",
    "cat grooming",
    "dog walk",
    "dog walking",
    "pet sitting",
    "pet training",
    "mobile vet",
    "pet",
  ],
  kids_family: [
    "babysitter",
    "babysitting",
    "childcare",
    "family help",
    "kids",
    "children",
    "tutoring",
  ],
  beauty_wellness: [
    "barber",
    "hair",
    "stylist",
    "nails",
    "massage",
    "beauty",
    "wellness",
  ],
  errands_help: [
    "grocery",
    "errand",
    "assembly",
    "pickup",
    "dropoff",
    "help",
  ],
  sports_activities: [
    "baseball",
    "basketball",
    "soccer",
    "football",
    "volleyball",
    "softball",
    "coach",
    "coaching",
    "trainer",
    "training",
    "martial arts",
    "dance",
  ],
  tech_digital: [
    "computer",
    "wifi",
    "network",
    "website",
    "tech support",
    "phone help",
    "device",
  ],
  education_tutoring: [
    "math",
    "reading",
    "test prep",
    "music lessons",
    "language lessons",
    "tutor",
    "education",
  ],
  business_finance: [
    "bookkeeping",
    "accounting",
    "tax",
    "marketing",
    "notary",
    "insurance",
    "business",
  ],
  property_mgmt: [
    "tenant repair",
    "turnover",
    "inspection",
    "make ready",
    "maintenance",
    "property management",
  ],
  other: ["other", "custom"],
};

// ----------------------------
// UI-only subtype suggestions
// ----------------------------
const SUBTYPES = {
  home_property: [
    { key: "plumbing", label: "Plumbing", emoji: "🚰" },
    { key: "hvac", label: "HVAC", emoji: "❄️" },
    { key: "electrical", label: "Electrical", emoji: "⚡" },
    { key: "cleaning", label: "Cleaning", emoji: "🧽" },
    { key: "lawn", label: "Lawn & Landscaping", emoji: "🌿" },
    { key: "handyman", label: "Handyman / Home Repair", emoji: "🛠️" },
    { key: "roofing", label: "Roofing & Gutters", emoji: "🏚️" },
    { key: "remodeling", label: "Construction & Remodeling", emoji: "🏗️" },
    { key: "appliance", label: "Appliance Repair", emoji: "🧊" },
    { key: "pest", label: "Pest Control", emoji: "🐜" },
    { key: "security_low_voltage", label: "Security / Low Voltage", emoji: "📹" },
    { key: "woodworking", label: "Woodworking / Furniture Build", emoji: "🪵" },
    { key: "pressure_washing", label: "Pressure Washing", emoji: "💦" },
    { key: "other_home", label: "Other home help", emoji: "✨" },
  ],
  auto: [
    { key: "auto_detailing", label: "Auto detailing", emoji: "🧼" },
    { key: "auto_repair", label: "Auto repair", emoji: "🔧" },
    { key: "auto_tint", label: "Tint / wrap", emoji: "🪟" },
    { key: "auto_audio", label: "Audio / electronics", emoji: "🔊" },
    { key: "auto_roadside", label: "Roadside help", emoji: "🛞" },
    { key: "auto_other", label: "Other auto service", emoji: "✨" },
  ],
  commercial: [
    { key: "commercial_cleaning", label: "Commercial cleaning", emoji: "🧽" },
    { key: "commercial_hvac", label: "HVAC (commercial)", emoji: "🏢❄️" },
    { key: "commercial_electrical", label: "Electrical (commercial)", emoji: "⚡" },
    { key: "commercial_handyman", label: "Maintenance / handyman", emoji: "🛠️" },
    { key: "commercial_security", label: "Cameras / security", emoji: "📹" },
    { key: "commercial_other", label: "Other commercial service", emoji: "✨" },
  ],
  rideshare: [
    { key: "ride_local", label: "Local ride", emoji: "🚗" },
    { key: "ride_airport", label: "Airport ride", emoji: "✈️" },
    { key: "ride_scheduled", label: "Scheduled ride", emoji: "🗓️" },
    { key: "ride_delivery", label: "Delivery / pickup", emoji: "📦" },
    { key: "ride_other", label: "Other ride need", emoji: "✨" },
  ],
  party_services: [
    { key: "inflatable_rentals", label: "Inflatables / bounce house", emoji: "🏰" },
    { key: "party_setup", label: "Party setup / breakdown", emoji: "🧰" },
    { key: "dj", label: "DJ / music", emoji: "🎛️" },
    { key: "photography", label: "Photography", emoji: "📷" },
    { key: "video", label: "Video / editing", emoji: "🎥" },
    { key: "party_other", label: "Other party service", emoji: "✨" },
  ],
  pets: [
    { key: "pet_grooming", label: "Grooming", emoji: "🐶✂️" },
    { key: "pet_sitting", label: "Sitting / boarding", emoji: "🏠" },
    { key: "pet_walking", label: "Dog walking", emoji: "🚶" },
    { key: "pet_training", label: "Training", emoji: "🎓" },
    { key: "pet_vet_mobile", label: "Mobile vet (non-emergency)", emoji: "🩺" },
    { key: "other_pets", label: "Other pet help", emoji: "✨" },
  ],
  kids_family: [
    { key: "babysitting", label: "Babysitting", emoji: "🧸" },
    { key: "tutoring", label: "Tutoring", emoji: "📚" },
    { key: "kids_activity", label: "Kids activity instructor", emoji: "🎨" },
    { key: "family_errands", label: "Family help / errands", emoji: "🛍️" },
    { key: "other_kids", label: "Other kids/family", emoji: "✨" },
  ],
  sports_activities: [
    { key: "sports_coaching", label: "Sports coaching", emoji: "🏅" },
    { key: "personal_training", label: "Personal trainer", emoji: "🏋️" },
    { key: "dance", label: "Dance coach", emoji: "💃" },
    { key: "martial_arts", label: "Martial arts", emoji: "🥋" },
    { key: "other_sports", label: "Other sports/activity", emoji: "✨" },
  ],
  education_tutoring: [
    { key: "math", label: "Math tutoring", emoji: "➗" },
    { key: "reading", label: "Reading / writing help", emoji: "📖" },
    { key: "test_prep", label: "Test prep", emoji: "📝" },
    { key: "music_lessons", label: "Music lessons", emoji: "🎵" },
    { key: "language", label: "Language lessons", emoji: "🗣️" },
    { key: "other_edu", label: "Other education", emoji: "✨" },
  ],
  business_finance: [
    { key: "insurance", label: "Insurance (auto/home/life)", emoji: "🛡️" },
    { key: "notary", label: "Notary", emoji: "✒️" },
    { key: "bookkeeping", label: "Bookkeeping / accounting", emoji: "🧾" },
    { key: "tax", label: "Tax help", emoji: "💰" },
    { key: "marketing", label: "Marketing / ads", emoji: "📈" },
    { key: "investing", label: "Investing / financial education", emoji: "📊" },
    { key: "trading_education", label: "Trading education / mentorship", emoji: "📉" },
    { key: "other_business", label: "Other business help", emoji: "✨" },
  ],
  property_mgmt: [
    { key: "tenant_repair", label: "Tenant repair dispatch", emoji: "🧰" },
    { key: "turnover", label: "Turnover / make-ready", emoji: "🧹" },
    { key: "inspection", label: "Inspection walkthrough", emoji: "📝" },
    { key: "preventative", label: "Preventative maintenance", emoji: "🛠️" },
    { key: "other_pm", label: "Other PM help", emoji: "✨" },
  ],
  tech_digital: [
    { key: "computer_fix", label: "Computer help", emoji: "🖥️" },
    { key: "wifi_network", label: "WiFi / network", emoji: "📶" },
    { key: "phone_help", label: "Phone / device help", emoji: "📱" },
    { key: "web_dev", label: "Website / web help", emoji: "🌐" },
    { key: "other_tech", label: "Other tech help", emoji: "✨" },
  ],
  errands_help: [
    { key: "grocery", label: "Grocery / errands", emoji: "🛒" },
    { key: "pickup_dropoff", label: "Pickup / drop-off", emoji: "📦" },
    { key: "assembly", label: "Assembly help", emoji: "🧰" },
    { key: "other_errands", label: "Other help", emoji: "✨" },
  ],
  beauty_wellness: [
    { key: "barber", label: "Barber / haircut", emoji: "💈" },
    { key: "stylist", label: "Hair stylist", emoji: "💇" },
    { key: "nails", label: "Nails", emoji: "💅" },
    { key: "massage", label: "Massage", emoji: "💆" },
    { key: "other_beauty", label: "Other beauty/wellness", emoji: "✨" },
  ],
  other: [{ key: "other_any", label: "Describe a custom job", emoji: "✨" }],
};

// deterministic backend group resolution
const SUBTYPE_GROUP_HINTS = {
  plumbing: ["plumbing"],
  hvac: ["hvac"],
  electrical: ["electrical"],
  cleaning: ["residential cleaning", "deep cleaning", "cleaning"],
  lawn: ["lawn care", "landscaping"],
  handyman: ["handyman"],
  roofing: ["roofing"],
  remodeling: ["remodeling", "renovation", "general contracting", "construction"],
  appliance: ["appliance"],
  pest: ["pest control"],
  security_low_voltage: ["security", "low voltage", "security systems", "smart home"],
  woodworking: ["woodworking", "carpentry"],
  pressure_washing: ["pressure washing"],

  auto_detailing: ["detailing"],
  auto_repair: ["auto repair", "mobile mechanic"],
  auto_tint: ["tint", "wrap"],
  auto_audio: ["audio", "electronics"],
  auto_roadside: ["roadside assistance", "towing", "mobile mechanic"],
  auto_other: ["auto repair", "mobile mechanic", "detailing", "roadside"],

  commercial_cleaning: ["commercial cleaning", "janitorial"],
  commercial_hvac: ["commercial hvac", "hvac"],
  commercial_electrical: ["commercial electrical", "electrical"],
  commercial_handyman: ["facility maintenance", "maintenance", "handyman"],
  commercial_security: ["commercial security", "security"],
  commercial_other: ["commercial cleaning", "janitorial", "facility maintenance"],

  ride_local: ["ride-share driver", "senior transport", "medical transport"],
  ride_airport: ["ride-share driver", "airport"],
  ride_scheduled: ["ride-share driver", "medical transport", "senior transport"],
  ride_delivery: ["package delivery", "food delivery"],
  ride_other: ["ride-share driver", "package delivery", "medical transport"],

  inflatable_rentals: ["inflatables", "party rentals"],
  party_setup: ["event planning", "decorating"],
  dj: ["dj", "audio"],
  photography: ["photography"],
  video: ["videography"],
  party_other: ["event planning", "decorating", "photography", "videography"],

  pet_grooming: ["pet grooming"],
  pet_sitting: ["pet sitting", "pet boarding"],
  pet_walking: ["dog walking"],
  pet_training: ["pet training"],
  pet_vet_mobile: ["mobile vet"],
  other_pets: ["pet grooming", "pet sitting", "dog walking", "pet training"],

  babysitting: ["babysitting"],
  tutoring: ["tutoring"],
  kids_activity: ["kids activity", "instructor"],
  family_errands: ["personal assistant", "errand", "assistant"],
  other_kids: ["babysitting", "tutoring", "personal assistant"],

  sports_coaching: ["sports coaching", "coaching"],
  personal_training: ["personal training"],
  dance: ["dance"],
  martial_arts: ["martial arts"],
  other_sports: ["sports coaching", "personal training"],

  math: ["math tutoring", "tutoring"],
  reading: ["reading", "writing", "tutoring"],
  test_prep: ["test prep", "tutoring"],
  music_lessons: ["music lessons"],
  language: ["language lessons", "tutoring"],
  other_edu: ["tutoring", "music lessons", "language lessons"],

  insurance: ["insurance"],
  notary: ["notary"],
  bookkeeping: ["bookkeeping", "accounting"],
  tax: ["tax", "accounting"],
  marketing: ["marketing"],
  investing: ["investing", "consulting"],
  trading_education: ["trading", "consulting"],
  other_business: ["bookkeeping", "accounting", "consulting", "marketing", "notary"],

  tenant_repair: ["tenant repair", "maintenance"],
  turnover: ["turnover", "make-ready"],
  inspection: ["inspection"],
  preventative: ["preventative maintenance", "maintenance"],
  other_pm: ["tenant repair", "turnover", "inspection", "maintenance"],

  computer_fix: ["computer repair", "it support"],
  wifi_network: ["network setup", "wifi"],
  phone_help: ["it support", "device setup"],
  web_dev: ["website", "marketing", "digital"],
  other_tech: ["computer repair", "it support", "network setup"],

  grocery: ["errand", "personal assistant", "delivery"],
  pickup_dropoff: ["package delivery", "delivery"],
  assembly: ["assembly", "handyman"],
  other_errands: ["personal assistant", "package delivery"],

  barber: ["barber"],
  stylist: ["hair stylist", "stylist"],
  nails: ["nails"],
  massage: ["massage therapy"],
  other_beauty: ["barber", "hair stylist", "nails", "massage therapy"],

  other_home: ["plumbing", "electrical", "hvac", "handyman"],
  other_any: [],
};

const SUBTYPE_CONFIG = {
  plumbing: {
    detailsHint: "Add the issue, where it is happening, how urgent it is, and whether water is leaking or shut off.",
  },
  hvac: {
    detailsHint: "Add the unit issue, what is or is not working, and any urgent temperature concerns.",
  },
  electrical: {
    detailsHint: "Add the issue, affected rooms/areas, and whether power or breakers are involved.",
  },
  cleaning: {
    detailsHint: "Tell us what needs cleaned and the size/type: house, office, rental turn, post-construction, etc.",
  },
  lawn: {
    detailsHint: "Add what outdoor work is needed, lot size if known, and whether this is one-time or recurring.",
  },
  handyman: {
    detailsHint: "List the tasks clearly so the provider knows what needs repaired, installed, or assembled.",
  },
  roofing: {
    detailsHint: "Add the roof/gutter issue, leak details if any, and whether it is storm related.",
  },
  remodeling: {
    detailsHint: "Add the room/area, project goal, and whether this is repair work or a larger project.",
  },
  appliance: {
    detailsHint: "Add the appliance type, brand if known, and what it is or is not doing.",
  },
  pest: {
    detailsHint: "Add the pest type, where you are seeing it, and how urgent the problem feels.",
  },
  security_low_voltage: {
    detailsHint: "Add the device/system type, install or repair need, and the property type.",
  },
  woodworking: {
    detailsHint: "Add whether this is custom build, repair, or install, with rough size/dimensions if known.",
  },
  pressure_washing: {
    detailsHint: "Add what needs washed, property type, and the size/area if known.",
  },
  sports_coaching: {
    detailsHint: "Add the sport, athlete age, skill level, and whether this is private or group training.",
  },
  personal_training: {
    detailsHint: "Add fitness goals, age, experience level, and whether sessions are remote or in person.",
  },
  dance: {
    detailsHint: "Add dance type, age group, and whether this is private or group instruction.",
  },
  martial_arts: {
    detailsHint: "Add style, student age, experience level, and private vs group preference.",
  },
  other_any: {
    detailsHint: "Pick the closest match you can find, then use the extra details box to explain the request clearly.",
  },
};

function safeStr(x) {
  return (x ?? "").toString();
}

function toPrettyDateISO(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function detectTimeZone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz || "America/New_York";
  } catch {
    return "America/New_York";
  }
}

function normalizeText(s) {
  return safeStr(s).trim().toLowerCase();
}

function intakeBlock(contextObj) {
  const json = JSON.stringify(contextObj, null, 2);
  return `\n\n---\nSyncWorks Intake:\n${json}\n`;
}

function readPrefill() {
  try {
    const raw = localStorage.getItem("sw:new_request_prefill");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function clearPrefill() {
  try {
    localStorage.removeItem("sw:new_request_prefill");
  } catch {
    // ignore
  }
}

function safeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.value)) return data.value;
  return [];
}

function StepPill({ active, done, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "text-[11px] px-3 py-2 rounded-full border transition " +
        (active
          ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-100"
          : done
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/15"
          : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900")
      }
      title={label}
    >
      {label}
    </button>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      {children}
      {hint ? <div className="text-[11px] text-slate-500 mt-1">{hint}</div> : null}
    </div>
  );
}

function RadioCard({ active, title, hint, onClick, compact = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "text-left rounded-2xl border transition w-full " +
        (compact ? "p-3" : "p-4") +
        " " +
        (active ? "border-cyan-500/40 bg-cyan-500/10" : "border-slate-800 bg-slate-950 hover:bg-slate-900")
      }
    >
      <div className="flex items-center justify-between gap-3">
        <div className={compact ? "font-semibold text-xs" : "font-semibold text-sm"}>{title}</div>
        <div className={"h-4 w-4 rounded-full border " + (active ? "border-cyan-400 bg-cyan-400/60" : "border-slate-600")} />
      </div>
      {hint ? <div className={(compact ? "text-[11px]" : "text-xs") + " text-slate-500 mt-2"}>{hint}</div> : null}
    </button>
  );
}

function ReviewRow({ k, v }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
      <div className="text-[11px] text-slate-400">{k}</div>
      <div className="text-sm font-semibold mt-1">{v}</div>
    </div>
  );
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl border border-slate-800 bg-slate-950/60 flex items-center justify-center text-slate-300">
          🔎
        </div>
        <input
          className="flex-1 h-12 bg-slate-950 border border-slate-800 rounded-2xl px-4 text-sm outline-none focus:border-cyan-500/40"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="h-12 px-4 rounded-2xl bg-slate-950 border border-slate-800 hover:bg-slate-900 text-xs"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}

function BigTile({ active, emoji, title, desc, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "text-left rounded-3xl border p-5 transition w-full relative overflow-hidden " +
        (active
          ? "border-cyan-500/45 bg-cyan-500/10"
          : "border-slate-800 bg-slate-950 hover:bg-slate-900")
      }
    >
      <div
        className={
          "absolute -right-12 -top-12 h-40 w-40 rounded-full blur-2xl opacity-30 " +
          (active ? "bg-cyan-500" : "bg-slate-700")
        }
      />
      <div className="flex items-start justify-between gap-3 relative">
        <div className="flex items-center gap-3">
          <div className={"h-12 w-12 rounded-2xl border flex items-center justify-center text-2xl " + (active ? "border-cyan-500/40 bg-cyan-500/10" : "border-slate-800 bg-slate-950/50")}>
            {emoji || "✨"}
          </div>
          <div>
            <div className="text-base font-extrabold">{title}</div>
            {desc ? <div className="text-xs text-slate-400 mt-1">{desc}</div> : null}
          </div>
        </div>

        <div className={"h-5 w-5 rounded-full border mt-1 " + (active ? "border-cyan-400 bg-cyan-400/60" : "border-slate-600")} />
      </div>
    </button>
  );
}

function buildCategoryPath(cat, byId) {
  if (!cat) return "";
  const chain = [];
  let cur = cat;
  let guard = 0;

  while (cur && guard < 20) {
    chain.unshift(cur);
    const pid = cur.parent_id == null ? null : Number(cur.parent_id);
    cur = pid ? byId.get(pid) || null : null;
    guard += 1;
  }

  return chain
    .map((x) => safeStr(x?.name).trim())
    .filter(Boolean)
    .join(" → ");
}

function scoreGroupCategory(cat, subtypeKey, lifeKey, byId) {
  const text = [cat?.name, cat?.key, buildCategoryPath(cat, byId)].map(normalizeText).join(" | ");
  const hints = SUBTYPE_GROUP_HINTS[subtypeKey] || [];
  const life = normalizeText(lifeKey).replace(/_/g, " ");

  let score = 0;

  for (const hint of hints) {
    const needle = normalizeText(hint);
    if (!needle) continue;
    if (text.includes(needle)) score += 40;
  }

  const subtypeNeedle = normalizeText(subtypeKey).replace(/_/g, " ");
  if (subtypeNeedle && text.includes(subtypeNeedle)) score += 18;
  if (life && text.includes(life)) score += 4;

  return score;
}

function selectedSubtypeHelp(subtypeKey) {
  return (
    SUBTYPE_CONFIG[subtypeKey]?.detailsHint ||
    "Pick the closest match you can find. If it is not perfect, choose the nearest option and explain the rest below."
  );
}

function shouldShowLocationFields(lifeCategory) {
  return !["business_finance", "tech_digital"].includes(lifeCategory);
}

function shouldShowRideFields(lifeCategory) {
  return lifeCategory === "rideshare";
}

function shouldShowPetFields(lifeCategory) {
  return lifeCategory === "pets";
}

function shouldShowKidsFields(lifeCategory) {
  return lifeCategory === "kids_family";
}

function shouldShowSportsFields(lifeCategory) {
  return lifeCategory === "sports_activities";
}

function shouldShowEducationFields(lifeCategory) {
  return lifeCategory === "education_tutoring";
}

function shouldShowPartyFields(lifeCategory) {
  return lifeCategory === "party_services";
}

function shouldShowLeadFields(lifeCategory) {
  return lifeCategory === "business_finance" || lifeCategory === "tech_digital";
}

export default function CustomerNewRequest() {
  const nav = useNavigate();
  const location = useLocation();

  const [serviceCats, setServiceCats] = useState([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [loadingExactJobs, setLoadingExactJobs] = useState(false);

  const [step, setStep] = useState(1);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [isMarketplace, setIsMarketplace] = useState(true);

  const [lifeCategory, setLifeCategory] = useState("");
  const [subtype, setSubtype] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [resolvedGroupId, setResolvedGroupId] = useState(null);
  const [resolvedGroupName, setResolvedGroupName] = useState("");
  const [exactJobs, setExactJobs] = useState([]);

  const [shortTitle, setShortTitle] = useState("");
  const [details, setDetails] = useState("");

  const [serviceAddress, setServiceAddress] = useState("");
  const [serviceCity, setServiceCity] = useState("");
  const [serviceState, setServiceState] = useState("");
  const [serviceZip, setServiceZip] = useState("");

  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [timeWindow, setTimeWindow] = useState("");
  const [timeZone, setTimeZone] = useState(detectTimeZone());

  const [priority, setPriority] = useState("P3");

  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");

  const [petName, setPetName] = useState("");
  const [petType, setPetType] = useState("dog");
  const [breed, setBreed] = useState("");
  const [weight, setWeight] = useState("");
  const [shotsUpToDate, setShotsUpToDate] = useState("yes");
  const [petNotes, setPetNotes] = useState("");

  const [childAge, setChildAge] = useState("");
  const [studentAge, setStudentAge] = useState("");
  const [subject, setSubject] = useState("");
  const [sportType, setSportType] = useState("");
  const [skillLevel, setSkillLevel] = useState("");
  const [recurring, setRecurring] = useState("one_time");
  const [familyNotes, setFamilyNotes] = useState("");

  const [eventType, setEventType] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [setupWindow, setSetupWindow] = useState("");

  const [contactPreference, setContactPreference] = useState("call");
  const [callbackTime, setCallbackTime] = useState("");
  const [remoteAllowed, setRemoteAllowed] = useState("unsure");

  const [paymentPref, setPaymentPref] = useState("CARD_ON_FILE");

  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  const [selectedFavoriteId, setSelectedFavoriteId] = useState(null);
  const [selectedBusinessName, setSelectedBusinessName] = useState("");
  const [prefillSource, setPrefillSource] = useState("");

  const [search, setSearch] = useState("");
  const [typeSearch, setTypeSearch] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");

  async function loadServiceCats() {
    setErr("");
    setLoadingCats(true);

    try {
      let page = 1;
      let all = [];
      let keepGoing = true;

      while (keepGoing) {
        const res = await api.get(`/service-categories/?page=${page}`);
        const items = safeList(res.data);

        all = [...all, ...items];

        if (res?.data?.next) {
          page += 1;
        } else {
          keepGoing = false;
        }
      }

      setServiceCats(all);
    } catch (e) {
      setServiceCats([]);
      setErr(e?.response?.data?.detail || "Failed to load categories");
    } finally {
      setLoadingCats(false);
    }
  }

  useEffect(() => {
    loadServiceCats();
  }, []);

  useEffect(() => {
    const qs = new URLSearchParams(location.search || "");
    const qBiz = qs.get("business_id");
    const qFav = qs.get("favorite_id");

    const bizId = qBiz ? Number(qBiz) : null;
    const favId = qFav ? Number(qFav) : null;

    const ls = readPrefill();

    const hasQuery = Number.isFinite(bizId) && bizId > 0;
    const hasLS = ls && Number.isFinite(Number(ls.business_id)) && Number(ls.business_id) > 0;

    const chosen = hasQuery
      ? {
          business_id: bizId,
          favorite_id: Number.isFinite(favId) ? favId : null,
          business_name: "",
          base_zip: "",
          source: "query",
        }
      : hasLS
      ? {
          business_id: Number(ls.business_id),
          favorite_id: Number.isFinite(Number(ls.favorite_id)) ? Number(ls.favorite_id) : null,
          business_name: safeStr(ls.business_name || ""),
          base_zip: safeStr(ls.base_zip || ""),
          source: safeStr(ls.source || "localStorage"),
        }
      : null;

    if (!chosen) return;

    setSelectedBusinessId(chosen.business_id);
    setSelectedFavoriteId(chosen.favorite_id);
    setSelectedBusinessName(chosen.business_name || "");
    setPrefillSource(chosen.source || "prefill");
    setIsMarketplace(false);

    if (chosen.base_zip && !serviceZip) setServiceZip(chosen.base_zip);

    if (!hasQuery && hasLS) clearPrefill();
  }, [location.search, serviceZip]);

  useEffect(() => {
    let mounted = true;

    async function hydrateBusinessName() {
      if (!selectedBusinessId || selectedBusinessName) return;
      try {
        const r = await api.get(`/businesses/${selectedBusinessId}/`);
        const nm = r?.data?.name || "";
        if (mounted) setSelectedBusinessName(nm);
      } catch {
        // ignore
      }
    }

    hydrateBusinessName();

    return () => {
      mounted = false;
    };
  }, [selectedBusinessId, selectedBusinessName]);

  const subtypeOptions = useMemo(() => {
    if (!lifeCategory) return [];
    return SUBTYPES[lifeCategory] || SUBTYPES.other;
  }, [lifeCategory]);

  const filteredLifeCats = useMemo(() => {
    const q = normalizeText(search);
    if (!q) return LIFE_CATEGORIES;

    return LIFE_CATEGORIES.filter((life) => {
      const baseBlob = [life.key, life.label, life.desc, life.emoji]
        .map(normalizeText)
        .join(" | ");

      const subtypeBlob = (SUBTYPES[life.key] || [])
        .flatMap((s) => [s.key, s.label, s.emoji])
        .map(normalizeText)
        .join(" | ");

      const aliasBlob = (SEARCH_ALIASES[life.key] || [])
        .map(normalizeText)
        .join(" | ");

      const fullBlob = `${baseBlob} | ${subtypeBlob} | ${aliasBlob}`;
      return fullBlob.includes(q);
    });
  }, [search]);

  const filteredSubtypeOptions = useMemo(() => {
    const list = subtypeOptions || [];
    const q = normalizeText(typeSearch);
    if (!q) return list;

    return list.filter((s) => {
      const blob = [s.key, s.label, s.emoji].map(normalizeText).join(" | ");
      return blob.includes(q);
    });
  }, [subtypeOptions, typeSearch]);

  const categoryById = useMemo(() => {
    const map = new Map();
    (serviceCats || []).forEach((c) => map.set(Number(c.id), c));
    return map;
  }, [serviceCats]);

  const groupCandidates = useMemo(() => {
    if (!lifeCategory || !subtype || !serviceCats.length) return [];

    const groups = (serviceCats || []).filter((cat) => !!cat?.parent_id && !cat?.is_leaf);

    const scored = groups
      .map((cat) => ({
        cat,
        score: scoreGroupCategory(cat, subtype, lifeCategory, categoryById),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return safeStr(a.cat.name).localeCompare(safeStr(b.cat.name));
      });

    return scored.map((x) => x.cat);
  }, [lifeCategory, subtype, serviceCats, categoryById]);

  useEffect(() => {
    async function resolveAndLoadExactJobs() {
      setResolvedGroupId(null);
      setResolvedGroupName("");
      setExactJobs([]);
      setSelectedCategoryId("");

      if (!lifeCategory || !subtype || !serviceCats.length) return;

      const bestGroup = groupCandidates[0] || null;
      if (!bestGroup) return;

      setResolvedGroupId(Number(bestGroup.id));
      setResolvedGroupName(bestGroup.name || "");

      setLoadingExactJobs(true);
      try {
        const res = await api.get(`/service-categories/?parent=${bestGroup.id}&page_size=200`);
        const items = safeList(res.data)
          .filter((x) => !!x?.is_leaf)
          .sort(
            (a, b) =>
              Number(a.sort_order || 0) - Number(b.sort_order || 0) ||
              safeStr(a.name).localeCompare(safeStr(b.name))
          );

        setExactJobs(items);
        if (items[0]?.id) {
          setSelectedCategoryId(Number(items[0].id));
        }
      } catch (e) {
        setExactJobs([]);
        setErr(e?.response?.data?.detail || "Failed to load exact jobs");
      } finally {
        setLoadingExactJobs(false);
      }
    }

    resolveAndLoadExactJobs();
  }, [lifeCategory, subtype, serviceCats, groupCandidates]);

  const filteredExactJobs = useMemo(() => {
    const q = normalizeText(serviceSearch);
    if (!q) return exactJobs;

    return (exactJobs || []).filter((job) => {
      const path = buildCategoryPath(job, categoryById);
      const blob = [job?.name, job?.key, path].map(normalizeText).join(" | ");
      return blob.includes(q);
    });
  }, [exactJobs, serviceSearch, categoryById]);

  const computedCategoryId = useMemo(() => {
    if (selectedCategoryId) return Number(selectedCategoryId);
    return filteredExactJobs[0]?.id || "";
  }, [selectedCategoryId, filteredExactJobs]);

  const selectedCategoryObj = useMemo(() => {
    return (serviceCats || []).find((c) => Number(c.id) === Number(computedCategoryId)) || null;
  }, [serviceCats, computedCategoryId]);

  const selectedCategoryPath = useMemo(() => {
    if (!selectedCategoryObj) return "";
    return buildCategoryPath(selectedCategoryObj, categoryById);
  }, [selectedCategoryObj, categoryById]);

  function next() {
    if (step === 1 && !lifeCategory) return setErr("Pick what you need help with.");
    if (step === 2 && !subtype) return setErr("Pick a type.");
    if (step === 3) {
      if (!computedCategoryId) return setErr("Pick the exact job.");
      if (!shortTitle.trim()) return setErr("Short title is required.");
      if (isMarketplace && !serviceZip.trim()) return setErr("ZIP is required for marketplace requests.");
    }
    setErr("");
    setStep((s) => Math.min(4, s + 1));
  }

  function back() {
    setErr("");
    setStep((s) => Math.max(1, s - 1));
  }

  function resetSubtypeOnLifeChange(nextLife) {
    setLifeCategory(nextLife);
    setSubtype("");
    setSelectedCategoryId("");
    setResolvedGroupId(null);
    setResolvedGroupName("");
    setExactJobs([]);
    setPickupAddress("");
    setDropoffAddress("");
    setTypeSearch("");
    setServiceSearch("");
    setSportType("");
    setSubject("");
    setStudentAge("");
    setPetName("");
    setEventType("");
    setGuestCount("");
    setSetupWindow("");
  }

  function clearSelectedBusiness() {
    setSelectedBusinessId(null);
    setSelectedFavoriteId(null);
    setSelectedBusinessName("");
    setPrefillSource("");
  }

  function buildContext() {
    return {
      version: "life_intake_v4",
      life_category: lifeCategory,
      subtype,
      resolved_group_id: resolvedGroupId,
      resolved_group_name: resolvedGroupName,
      category_id: Number(computedCategoryId),
      category_name: selectedCategoryObj?.name || "",
      category_path: selectedCategoryPath || "",
      marketplace_ui: !!isMarketplace,
      payment: { preference: paymentPref },
      priority,
      routing: {
        service_address: serviceAddress.trim(),
        service_city: serviceCity.trim(),
        service_state: serviceState.trim().toUpperCase(),
        service_zip: serviceZip.trim(),
      },
      scheduling: {
        preferred_date: preferredDate ? toPrettyDateISO(preferredDate) : "",
        preferred_time: preferredTime || "",
        time_window: timeWindow || "",
        timezone: timeZone || "",
      },
      ride: shouldShowRideFields(lifeCategory)
        ? {
            pickup_address: pickupAddress.trim(),
            dropoff_address: dropoffAddress.trim(),
          }
        : undefined,
      pets: shouldShowPetFields(lifeCategory)
        ? {
            pet_name: petName.trim(),
            pet_type: petType,
            breed: breed.trim(),
            weight: weight.trim(),
            shots_up_to_date: shotsUpToDate,
            pet_notes: petNotes.trim(),
          }
        : undefined,
      kids_family: shouldShowKidsFields(lifeCategory)
        ? {
            child_age: childAge.trim(),
            recurring,
            family_notes: familyNotes.trim(),
          }
        : undefined,
      sports: shouldShowSportsFields(lifeCategory)
        ? {
            sport_type: sportType.trim(),
            athlete_age: studentAge.trim(),
            skill_level: skillLevel.trim(),
          }
        : undefined,
      education: shouldShowEducationFields(lifeCategory)
        ? {
            subject: subject.trim(),
            student_age: studentAge.trim(),
            recurring,
            remote_allowed: remoteAllowed,
          }
        : undefined,
      event: shouldShowPartyFields(lifeCategory)
        ? {
            event_type: eventType.trim(),
            guest_count: guestCount.trim(),
            setup_window: setupWindow.trim(),
          }
        : undefined,
      lead: shouldShowLeadFields(lifeCategory)
        ? {
            contact_preference: contactPreference,
            callback_time: callbackTime.trim(),
            remote_allowed: remoteAllowed,
          }
        : undefined,
      selected_provider: selectedBusinessId
        ? {
            business_id: selectedBusinessId,
            favorite_id: selectedFavoriteId,
            business_name: selectedBusinessName || "",
            source: prefillSource || "",
          }
        : undefined,
    };
  }

  async function submit() {
    setErr("");
    setMsg("");

    try {
      if (!computedCategoryId) throw new Error("No service category selected.");
      if (!lifeCategory) throw new Error("Pick what you need help with.");
      if (!subtype) throw new Error("Pick a type.");
      if (!shortTitle.trim()) throw new Error("Short title is required.");
      if (isMarketplace && !serviceZip.trim()) throw new Error("ZIP is required for marketplace requests.");

      const context = buildContext();
      const finalDescription = (details?.trim() || "") + intakeBlock(context);

      const payload = {
        category: Number(computedCategoryId),
        title: shortTitle.trim(),
        description: finalDescription.trim(),
        address: serviceAddress.trim(),
        zip_code: serviceZip.trim(),
        service_address: serviceAddress.trim(),
        service_zip: serviceZip.trim(),
        is_marketplace: !!isMarketplace,
      };

      if (selectedBusinessId) {
        payload.business_id = Number(selectedBusinessId);
        payload.is_marketplace = false;
      }

      const res = await api.post("/service-requests/", payload);

      setMsg("Request created ✅");

      const ticketId = res?.data?.ticket_id;
      if (ticketId) nav(`/tickets/${ticketId}`);
      else nav("/tickets");
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Failed to create request");
    }
  }

  const lifeLabel = LIFE_CATEGORIES.find((c) => c.key === lifeCategory)?.label || "";
  const subtypeLabel = (subtypeOptions || []).find((s) => s.key === subtype)?.label || "";
  const paymentLabel = PAYMENT_PREFS.find((p) => p.id === paymentPref)?.label || paymentPref;
  const priorityLabel = PRIORITY_LEVELS.find((p) => p.id === priority)?.label || priority;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar title="New Service Request" subtitle="Search → pick a bucket → pick a type → choose the exact job → submit." />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {err ? <div className="text-sm text-red-200 bg-red-900/10 border border-red-800 rounded-xl p-3">{err}</div> : null}
        {msg ? <div className="text-sm text-emerald-200 bg-emerald-900/10 border border-emerald-800 rounded-xl p-3">{msg}</div> : null}

        {selectedBusinessId ? (
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wider text-cyan-200/90">Selected Provider</div>
                <div className="text-sm font-extrabold mt-1">{selectedBusinessName || `Business #${selectedBusinessId}`}</div>
                <div className="text-xs text-slate-300 mt-1">
                  From: <span className="font-semibold">{prefillSource || "Business Card"}</span>
                  {selectedFavoriteId ? (
                    <>
                      {" "}• Favorite ID <span className="font-mono">{selectedFavoriteId}</span>
                    </>
                  ) : null}
                </div>
                <div className="text-[11px] text-slate-400 mt-2">
                  Direct request is enabled ✅ This routes directly to the selected provider.
                </div>
              </div>

              <button
                type="button"
                onClick={clearSelectedBusiness}
                className="shrink-0 rounded-xl px-3 py-2 text-xs bg-slate-950 border border-slate-800 hover:bg-slate-900"
              >
                Clear
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex gap-2 flex-wrap">
          <StepPill active={step === 1} done={!!lifeCategory} label="1) Category" onClick={() => setStep(1)} />
          <StepPill active={step === 2} done={!!subtype} label="2) Type" onClick={() => !!lifeCategory && setStep(2)} />
          <StepPill
            active={step === 3}
            done={!!shortTitle.trim() && !!computedCategoryId && (!isMarketplace || !!serviceZip.trim())}
            label="3) Details"
            onClick={() => !!subtype && setStep(3)}
          />
          <StepPill active={step === 4} done={false} label="4) Review" onClick={() => (!!shortTitle.trim() ? setStep(4) : null)} />

          <div className="ml-auto flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsMarketplace((v) => !v)}
              className={
                "rounded-xl px-4 py-2 text-xs border transition " +
                (isMarketplace
                  ? "bg-cyan-500/20 border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-200"
                  : "bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-200")
              }
            >
              Marketplace: {isMarketplace ? "ON" : "OFF"}
            </button>

            <button
              type="button"
              onClick={loadServiceCats}
              className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
            >
              {loadingCats ? "Loading…" : "Reload categories"}
            </button>
          </div>
        </div>

        {step === 1 ? (
          <div className="space-y-3">
            <SearchBar value={search} onChange={setSearch} placeholder="Search services… (window tint, baseball coach, bounce house, bookkeeping, dog grooming, etc.)" />

            <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold">Pick a category</div>
                  <div className="text-xs text-slate-400 mt-1">Big buckets first. You’ll narrow it down next.</div>
                </div>
                <div className="text-[11px] text-slate-500">
                  Showing <span className="font-semibold text-slate-200">{filteredLifeCats.length}</span>
                </div>
              </div>

              <div className="mt-4 grid sm:grid-cols-2 gap-3">
                {filteredLifeCats.map((it) => (
                  <BigTile
                    key={it.key}
                    active={lifeCategory === it.key}
                    emoji={it.emoji}
                    title={it.label}
                    desc={it.desc}
                    onClick={() => {
                      setErr("");
                      resetSubtypeOnLifeChange(it.key);
                      setStep(2);
                    }}
                  />
                ))}
              </div>

              {!filteredLifeCats.length ? (
                <div className="mt-4 text-sm text-slate-400">
                  No matches. Try a different search.
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-3">
            <SearchBar value={typeSearch} onChange={setTypeSearch} placeholder={`Search types in ${lifeLabel || "category"}…`} />

            <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold">
                    {lifeCategory ? `Choose a type in ${lifeLabel}` : "Choose a type"}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">This narrows the exact job list next.</div>
                </div>
                <div className="text-[11px] text-slate-500">
                  Showing <span className="font-semibold text-slate-200">{filteredSubtypeOptions.length}</span>
                </div>
              </div>

              <div className="mt-4 grid sm:grid-cols-2 gap-3">
                {filteredSubtypeOptions.map((it) => (
                  <BigTile
                    key={it.key}
                    active={subtype === it.key}
                    emoji={it.emoji}
                    title={it.label}
                    desc={it.key}
                    onClick={() => {
                      setErr("");
                      setSubtype(it.key);
                      setSelectedCategoryId("");
                      setServiceSearch("");
                      setStep(3);
                    }}
                  />
                ))}
              </div>

              <div className="mt-4 flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setErr("");
                    setTypeSearch("");
                  }}
                  className="rounded-xl px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-sm"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Choose the exact job</div>
                <div className="text-xs text-slate-400 mt-1">
                  {lifeLabel ? `${lifeLabel} → ${subtypeLabel}` : "Answer a few quick questions."}
                </div>
              </div>
              <div className="text-xs text-slate-500">
                Exact category ID: <span className="font-mono text-slate-300">{computedCategoryId || "—"}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Exact Job Match</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Pick the closest exact service. Routing is now based on the matched backend service group.
                  </div>
                </div>

                {resolvedGroupName ? (
                  <div className="text-[11px] rounded-full px-3 py-1 border border-cyan-500/30 bg-cyan-500/10 text-cyan-200">
                    Group: {resolvedGroupName}
                  </div>
                ) : null}
              </div>

              <div className="mt-3">
                <input
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                  placeholder="Search exact job..."
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                />
              </div>

              <div className="mt-3 max-h-[280px] overflow-auto space-y-2 pr-1">
                {loadingExactJobs ? <div className="text-sm text-slate-400">Loading exact jobs…</div> : null}

                {!loadingExactJobs &&
                  filteredExactJobs.map((cat) => {
                    const active = Number(selectedCategoryId || computedCategoryId) === Number(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategoryId(Number(cat.id))}
                        className={
                          "w-full text-left rounded-xl border p-3 transition " +
                          (active
                            ? "bg-cyan-500/10 border-cyan-500/20"
                            : "bg-slate-950 border-slate-800 hover:bg-slate-900")
                        }
                      >
                        <div className="font-semibold text-sm text-slate-100">{cat.name || `Category #${cat.id}`}</div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          {buildCategoryPath(cat, categoryById) || cat.key || ""}
                        </div>
                      </button>
                    );
                  })}

                {!loadingExactJobs && !filteredExactJobs.length ? (
                  <div className="text-sm text-slate-400">
                    No exact jobs found for this type. That usually means this subtype needs a closer backend group mapping or more seeded leaf tasks.
                  </div>
                ) : null}
              </div>
            </div>

            <Field label="Short title (required)" hint="Keep it clear and simple so the provider understands the request fast.">
              <input
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                placeholder="Example: Kitchen sink leaking"
                value={shortTitle}
                onChange={(e) => setShortTitle(e.target.value)}
              />
            </Field>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
              <div className="text-sm font-semibold">Priority</div>
              <div className="text-xs text-slate-400 mt-1">Choose how quickly you want a provider response.</div>

              <div className="mt-3 grid md:grid-cols-2 gap-2">
                {PRIORITY_LEVELS.map((p) => (
                  <RadioCard
                    key={p.id}
                    active={priority === p.id}
                    title={p.label}
                    hint={p.hint}
                    onClick={() => setPriority(p.id)}
                    compact
                  />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
              <div className="text-sm font-semibold">Scheduling</div>
              <div className="text-xs text-slate-400 mt-1">Add a requested date/time if you have one.</div>

              <div className="mt-3 grid md:grid-cols-2 gap-3">
                <Field label="Preferred date">
                  <input
                    type="date"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                  />
                </Field>

                <Field label="Preferred time">
                  <input
                    type="time"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                  />
                </Field>

                <Field label="Time window / flexibility" hint="Examples: Morning, 1–4 PM, After 5 PM, Flexible.">
                  <input
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                    placeholder="Morning, after work, flexible, etc."
                    value={timeWindow}
                    onChange={(e) => setTimeWindow(e.target.value)}
                  />
                </Field>

                <Field label="Timezone">
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                    value={timeZone}
                    onChange={(e) => setTimeZone(e.target.value)}
                  >
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <option key={tz.id} value={tz.id}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            {shouldShowLocationFields(lifeCategory) ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                <div className="text-sm font-semibold">Location</div>
                <div className="text-xs text-slate-400 mt-1">
                  ZIP helps marketplace matching. Add city/state/address if it helps the provider understand the job location.
                </div>

                <div className="mt-3 grid md:grid-cols-2 gap-3">
                  <Field label="Service ZIP" hint={isMarketplace ? "Required for marketplace routing." : "Recommended for direct requests too."}>
                    <input
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                      placeholder="ZIP"
                      value={serviceZip}
                      onChange={(e) => setServiceZip(e.target.value)}
                    />
                  </Field>

                  <Field label="State">
                    <input
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                      placeholder="State"
                      value={serviceState}
                      onChange={(e) => setServiceState(e.target.value.toUpperCase())}
                    />
                  </Field>

                  <Field label="City">
                    <input
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                      placeholder="City"
                      value={serviceCity}
                      onChange={(e) => setServiceCity(e.target.value)}
                    />
                  </Field>

                  <Field label="Service address (optional)">
                    <input
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                      placeholder="Street address"
                      value={serviceAddress}
                      onChange={(e) => setServiceAddress(e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                <div className="text-sm font-semibold">Location / Reach</div>
                <div className="text-xs text-slate-400 mt-1">
                  For remote, consulting, finance, or online services, add your state/ZIP if location matters.
                </div>

                <div className="mt-3 grid md:grid-cols-3 gap-3">
                  <Field label="City (optional)">
                    <input
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                      placeholder="City"
                      value={serviceCity}
                      onChange={(e) => setServiceCity(e.target.value)}
                    />
                  </Field>

                  <Field label="State (optional)">
                    <input
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                      placeholder="State"
                      value={serviceState}
                      onChange={(e) => setServiceState(e.target.value.toUpperCase())}
                    />
                  </Field>

                  <Field label="ZIP (optional)">
                    <input
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                      placeholder="ZIP"
                      value={serviceZip}
                      onChange={(e) => setServiceZip(e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            )}

            {shouldShowRideFields(lifeCategory) ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                <div className="text-sm font-semibold">Ride / delivery details</div>
                <div className="text-xs text-slate-400 mt-1">Add both locations clearly so the provider knows the route.</div>

                <div className="mt-3 grid md:grid-cols-2 gap-3">
                  <Field label="Pickup address">
                    <input
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                      placeholder="Pickup location"
                      value={pickupAddress}
                      onChange={(e) => setPickupAddress(e.target.value)}
                    />
                  </Field>

                  <Field label="Drop-off address">
                    <input
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                      placeholder="Drop-off location"
                      value={dropoffAddress}
                      onChange={(e) => setDropoffAddress(e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            ) : null}

            {shouldShowPetFields(lifeCategory) ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                <div className="text-sm font-semibold">Pet details</div>
                <div className="text-xs text-slate-400 mt-1">Small details help the provider prepare correctly.</div>

                <div className="mt-3 grid md:grid-cols-2 gap-3">
                  <Field label="Pet name">
                    <input
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                      placeholder="Bella, Max, Luna…"
                      value={petName}
                      onChange={(e) => setPetName(e.target.value)}
                    />
                  </Field>

                  <Field label="Pet type">
                    <select
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                      value={petType}
                      onChange={(e) => setPetType(e.target.value)}
                    >
                      <option value="dog">Dog</option>
                      <option value="cat">Cat</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>

                  <Field label="Breed / mix">
                    <input
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                      placeholder="Breed"
                      value={breed}
                      onChange={(e) => setBreed(e.target.value)}
                    />
                  </Field>

                  <Field label="Weight / size">
                    <input
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                      placeholder="Example: 40 lbs / medium"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                    />
                  </Field>

                  <Field label="Shots up to date?">
                    <select
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                      value={shotsUpToDate}
                      onChange={(e) => setShotsUpToDate(e.target.value)}
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                      <option value="unsure">Unsure</option>
                    </select>
                  </Field>

                  <Field label="Pet notes" hint="Behavior, sensitivity, coat condition, medication, etc.">
                    <textarea
                      className="w-full min-h-[88px] bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                      placeholder="Anything the provider should know about your pet…"
                      value={petNotes}
                      onChange={(e) => setPetNotes(e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            ) : null}

            {shouldShowKidsFields(lifeCategory) ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                <div className="text-sm font-semibold">Family details</div>
                <div className="text-xs text-slate-400 mt-1">Add enough detail so the provider knows who this is for and how often help is needed.</div>

                <div className="mt-3 grid md:grid-cols-2 gap-3">
                  <Field label="Child age / ages">
                    <input
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                      placeholder="Example: 4 and 7"
                      value={childAge}
                      onChange={(e) => setChildAge(e.target.value)}
                    />
                  </Field>

                  <Field label="Schedule type">
                    <select
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                      value={recurring}
                      onChange={(e) => setRecurring(e.target.value)}
                    >
                      <option value="one_time">One-time</option>
                      <option value="recurring">Recurring</option>
                      <option value="unsure">Not sure yet</option>
                    </select>
                  </Field>

                  <Field label="Family notes" hint="Allergies, pickup/drop notes, routines, or special needs.">
                    <textarea
                      className="w-full min-h-[88px] bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                      placeholder="Anything important the provider should know…"
                      value={familyNotes}
                      onChange={(e) => setFamilyNotes(e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            ) : null}

            {shouldShowSportsFields(lifeCategory) ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                <div className="text-sm font-semibold">Training details</div>
                <div className="text-xs text-slate-400 mt-1">Use the details below to help the coach know what sport and level you need.</div>

                <div className="mt-3 grid md:grid-cols-2 gap-3">
                  <Field label="Sport / activity">
                    <input
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                      placeholder="Baseball, soccer, volleyball, strength training…"
                      value={sportType}
                      onChange={(e) => setSportType(e.target.value)}
                    />
                  </Field>

                  <Field label="Athlete age">
                    <input
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                      placeholder="Age or age range"
                      value={studentAge}
                      onChange={(e) => setStudentAge(e.target.value)}
                    />
                  </Field>

                  <Field label="Skill level">
                    <input
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                      placeholder="Beginner, intermediate, travel ball, varsity, etc."
                      value={skillLevel}
                      onChange={(e) => setSkillLevel(e.target.value)}
                    />
                  </Field>

                  <Field label="Remote / online okay?">
                    <select
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                      value={remoteAllowed}
                      onChange={(e) => setRemoteAllowed(e.target.value)}
                    >
                      <option value="unsure">Unsure</option>
                      <option value="no">No, in-person only</option>
                      <option value="yes">Yes, remote is okay</option>
                    </select>
                  </Field>
                </div>
              </div>
            ) : null}

            {shouldShowEducationFields(lifeCategory) ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                <div className="text-sm font-semibold">Student details</div>
                <div className="text-xs text-slate-400 mt-1">A little context helps the tutor or coach prepare correctly.</div>

                <div className="mt-3 grid md:grid-cols-2 gap-3">
                  <Field label="Subject / focus">
                    <input
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                      placeholder="Math, reading, SAT, guitar, Spanish…"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </Field>

                  <Field label="Student age / grade">
                    <input
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                      placeholder="Age or grade"
                      value={studentAge}
                      onChange={(e) => setStudentAge(e.target.value)}
                    />
                  </Field>

                  <Field label="Schedule type">
                    <select
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                      value={recurring}
                      onChange={(e) => setRecurring(e.target.value)}
                    >
                      <option value="one_time">One-time</option>
                      <option value="recurring">Recurring</option>
                      <option value="unsure">Not sure yet</option>
                    </select>
                  </Field>

                  <Field label="Remote / online okay?">
                    <select
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                      value={remoteAllowed}
                      onChange={(e) => setRemoteAllowed(e.target.value)}
                    >
                      <option value="unsure">Unsure</option>
                      <option value="no">No, in-person only</option>
                      <option value="yes">Yes, remote is okay</option>
                    </select>
                  </Field>
                </div>
              </div>
            ) : null}

            {shouldShowPartyFields(lifeCategory) ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                <div className="text-sm font-semibold">Event details</div>
                <div className="text-xs text-slate-400 mt-1">This helps event providers quote, schedule, and prepare the right setup.</div>

                <div className="mt-3 grid md:grid-cols-2 gap-3">
                  <Field label="Event type">
                    <input
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                      placeholder="Birthday, school event, church event, corporate party…"
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                    />
                  </Field>

                  <Field label="Guest count (optional)">
                    <input
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                      placeholder="Approximate guest count"
                      value={guestCount}
                      onChange={(e) => setGuestCount(e.target.value)}
                    />
                  </Field>

                  <Field label="Setup window">
                    <input
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                      placeholder="Example: Setup between 9–11 AM"
                      value={setupWindow}
                      onChange={(e) => setSetupWindow(e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            ) : null}

            {shouldShowLeadFields(lifeCategory) ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                <div className="text-sm font-semibold">Contact preferences</div>
                <div className="text-xs text-slate-400 mt-1">For consulting, finance, marketing, or online services, a clear callback preference helps the provider follow up correctly.</div>

                <div className="mt-3 grid md:grid-cols-2 gap-3">
                  <Field label="Best contact method">
                    <select
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                      value={contactPreference}
                      onChange={(e) => setContactPreference(e.target.value)}
                    >
                      <option value="call">Call</option>
                      <option value="text">Text</option>
                      <option value="email">Email</option>
                      <option value="any">Any</option>
                    </select>
                  </Field>

                  <Field label="Best callback time">
                    <input
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                      placeholder="Morning, afternoons, after 6 PM, etc."
                      value={callbackTime}
                      onChange={(e) => setCallbackTime(e.target.value)}
                    />
                  </Field>

                  <Field label="Remote / online okay?">
                    <select
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                      value={remoteAllowed}
                      onChange={(e) => setRemoteAllowed(e.target.value)}
                    >
                      <option value="unsure">Unsure</option>
                      <option value="no">No, local only</option>
                      <option value="yes">Yes, remote is okay</option>
                    </select>
                  </Field>
                </div>
              </div>
            ) : null}

            <Field label="Extra details" hint={selectedSubtypeHelp(subtype)}>
              <textarea
                className="w-full min-h-[110px] bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                placeholder="Describe the job clearly so the provider knows what is coming in."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </Field>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="text-sm font-semibold text-amber-100">Photos</div>
              <div className="text-xs text-amber-200/80 mt-1">
                Photo upload should be added in the initial request flow next. For now, submit the request first, then attach photos in the ticket if needed.
              </div>
            </div>

            <div className="flex gap-2 flex-wrap pt-2">
              <button type="button" onClick={back} className="rounded-xl px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-sm">
                Back
              </button>

              <button
                type="button"
                onClick={next}
                className="rounded-xl px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-sm font-semibold"
              >
                Review
              </button>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Review</div>
                <div className="text-xs text-slate-400 mt-1">Confirm and create the request.</div>
              </div>
              <div className="text-xs text-slate-500">
                Exact category: <span className="font-mono text-slate-300">{computedCategoryId || "—"}</span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              {selectedBusinessId ? (
                <ReviewRow k="Provider" v={selectedBusinessName || `Business #${selectedBusinessId}`} />
              ) : (
                <ReviewRow k="Provider" v="Marketplace broadcast (no provider selected)" />
              )}
              <ReviewRow k="Category" v={`${lifeLabel || "—"} → ${subtypeLabel || "—"}`} />
              <ReviewRow k="Service Group" v={resolvedGroupName || "—"} />
              <ReviewRow k="Exact Job" v={selectedCategoryObj?.name || `Category #${computedCategoryId || "—"}`} />
              <ReviewRow k="Category Path" v={selectedCategoryPath || "—"} />
              <ReviewRow k="Marketplace (UI intent)" v={isMarketplace ? "ON" : "OFF"} />
              <ReviewRow k="Title" v={shortTitle || "—"} />
              <ReviewRow k="Priority" v={priorityLabel || "—"} />
              <ReviewRow k="City / State" v={`${serviceCity || "—"}${serviceCity && serviceState ? ", " : ""}${serviceState || ""}`} />
              <ReviewRow k="ZIP" v={serviceZip || "—"} />
              <ReviewRow k="Preferred Date" v={preferredDate || "—"} />
              <ReviewRow k="Preferred Time" v={preferredTime || "—"} />
              <ReviewRow k="Time Window" v={timeWindow || "—"} />
              <ReviewRow k="Timezone" v={TIMEZONE_OPTIONS.find((x) => x.id === timeZone)?.label || timeZone || "—"} />
              <ReviewRow k="Payment preference" v={paymentLabel || "—"} />
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
              <div className="font-semibold text-sm">Payment</div>
              <div className="text-xs text-slate-400 mt-1">You won’t be charged when creating the request. Payment happens after completion via invoice.</div>

              <div className="mt-3 grid md:grid-cols-3 gap-2">
                {PAYMENT_PREFS.map((p) => (
                  <RadioCard key={p.id} active={paymentPref === p.id} title={p.label} hint={p.hint} onClick={() => setPaymentPref(p.id)} />
                ))}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap pt-2">
              <button type="button" onClick={back} className="rounded-xl px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-sm">
                Back
              </button>

              <button
                type="button"
                onClick={submit}
                className="rounded-xl px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-sm font-semibold"
              >
                Create Request
              </button>

              <button type="button" onClick={() => nav(-1)} className="rounded-xl px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-sm">
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}