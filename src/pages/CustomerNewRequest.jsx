// src/pages/CustomerNewRequest.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";

/**
 * LIFE-FIRST intake wizard that submits to:
 *   POST /service-requests/
 *
 * Supports "Business Cards" prefill:
 * - from query params:  /customer/new-request?business_id=3&favorite_id=4
 * - from localStorage:  sw:new_request_prefill (fallback)
 *
 * Backend routing notes (current v7.1):
 * - Send BOTH legacy fields (address/zip_code) AND routing fields (service_address/service_zip/service_radius_miles)
 * - If business_id is provided: backend forces is_marketplace OFF and routes directly (target_business + ticket.assigned_business)
 */

// ----------------------------
// Priority Levels (Maintenance)
// ----------------------------
const PRIORITY_LEVELS = [
  { id: "P1", label: "P1 – Urgent (1–8 hours)", hint: "Emergencies / time-sensitive issues" },
  { id: "P2", label: "P2 – Next day (12–24 hours)", hint: "Needs attention soon" },
  { id: "P3", label: "P3 – This week (3–5 days)", hint: "Can wait a bit" },
  { id: "P4", label: "P4 – Flexible / anytime", hint: "Not time-sensitive" },
];

// ----------------------------
// Payment preference (MVP)
// ----------------------------
const PAYMENT_PREFS = [
  { id: "CARD_ON_FILE", label: "Pay by card after completion", hint: "Provider will send an invoice when the job is done." },
  { id: "CASH", label: "Pay with cash / offline", hint: "You’ll coordinate payment directly with the provider." },
  { id: "PAY_LATER", label: "Pay later (invoice)", hint: "You’ll receive an invoice and can pay when ready." },
];

/**
 * ✅ New top-level “Life” Categories (big buckets)
 * - You asked for Auto, Home, Commercial, Ride Share, Party Services, etc.
 * - These keys only drive UI + subtype selection and category mapping heuristics.
 */
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
  { key: "business_finance", label: "Business", emoji: "💼", desc: "Notary, bookkeeping, marketing" },
  { key: "property_mgmt", label: "Property Mgmt", emoji: "🧰", desc: "Dispatch, make-ready, inspections" },
  { key: "other", label: "Something Else", emoji: "✨", desc: "Describe a custom job" },
];

// -------------------------------------
// Subtypes per life category (Slide 2)
// -------------------------------------
const SUBTYPES = {
  // Existing bucket (kept)
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
    { key: "other_home", label: "Other home help", emoji: "✨" },
  ],

  // New: Auto
  auto: [
    { key: "auto_detailing", label: "Auto detailing", emoji: "🧼" },
    { key: "auto_repair", label: "Auto repair", emoji: "🔧" },
    { key: "auto_tint", label: "Tint / wrap", emoji: "🪟" },
    { key: "auto_audio", label: "Audio / electronics", emoji: "🔊" },
    { key: "auto_roadside", label: "Roadside help", emoji: "🛞" },
    { key: "auto_other", label: "Other auto service", emoji: "✨" },
  ],

  // New: Commercial
  commercial: [
    { key: "commercial_cleaning", label: "Commercial cleaning", emoji: "🧽" },
    { key: "commercial_hvac", label: "HVAC (commercial)", emoji: "🏢❄️" },
    { key: "commercial_electrical", label: "Electrical (commercial)", emoji: "⚡" },
    { key: "commercial_handyman", label: "Maintenance / handyman", emoji: "🛠️" },
    { key: "commercial_security", label: "Cameras / security", emoji: "📹" },
    { key: "commercial_other", label: "Other commercial service", emoji: "✨" },
  ],

  // New: Ride Share (keep it simple—can expand later)
  rideshare: [
    { key: "ride_local", label: "Local ride", emoji: "🚗" },
    { key: "ride_airport", label: "Airport ride", emoji: "✈️" },
    { key: "ride_scheduled", label: "Scheduled ride", emoji: "🗓️" },
    { key: "ride_delivery", label: "Delivery / pickup", emoji: "📦" },
    { key: "ride_other", label: "Other ride need", emoji: "✨" },
  ],

  // New: Party Services
  party_services: [
    { key: "inflatable_rentals", label: "Inflatables / bounce house", emoji: "🏰" },
    { key: "party_setup", label: "Party setup / breakdown", emoji: "🧰" },
    { key: "dj", label: "DJ / music", emoji: "🎛️" },
    { key: "photography", label: "Photography", emoji: "📷" },
    { key: "video", label: "Video / editing", emoji: "🎥" },
    { key: "party_other", label: "Other party service", emoji: "✨" },
  ],

  // Existing (kept)
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
    { key: "baseball", label: "Baseball coach", emoji: "⚾" },
    { key: "basketball", label: "Basketball coach", emoji: "🏀" },
    { key: "soccer", label: "Soccer coach", emoji: "⚽" },
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

function safeStr(x) {
  return (x ?? "").toString();
}

function titleCase(s) {
  return safeStr(s).replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function toPrettyDateISO(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function mapToServiceCategoryId(serviceCats, lifeKey, subtypeKey) {
  const cats = Array.isArray(serviceCats) ? serviceCats : [];

  const needles = [
    safeStr(subtypeKey).toLowerCase(),
    safeStr(lifeKey).toLowerCase(),
    lifeKey === "home_property" ? "home" : "",
    lifeKey === "rideshare" ? "ride" : "",
    lifeKey === "auto" ? "auto" : "",
    lifeKey === "commercial" ? "commercial" : "",
    lifeKey === "party_services" ? "party" : "",
    subtypeKey === "plumbing" ? "plumb" : "",
    subtypeKey === "hvac" ? "hvac" : "",
  ].filter(Boolean);

  function blob(c) {
    const parts = [c?.key, c?.slug, c?.category_key, c?.category_root_key, c?.name, c?.label, c?.path, c?.category_path]
      .map((x) => safeStr(x).toLowerCase())
      .filter(Boolean);
    return parts.join(" | ");
  }

  for (const c of cats) {
    const b = blob(c);
    if (needles[0] && b.includes(needles[0])) return c.id;
  }
  for (const c of cats) {
    const b = blob(c);
    if (needles[1] && b.includes(needles[1])) return c.id;
  }
  return cats[0]?.id || "";
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

function RadioCard({ active, title, hint, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "text-left rounded-2xl border p-4 transition w-full " +
        (active ? "border-cyan-500/40 bg-cyan-500/10" : "border-slate-800 bg-slate-950 hover:bg-slate-900")
      }
    >
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold text-sm">{title}</div>
        <div className={"h-4 w-4 rounded-full border " + (active ? "border-cyan-400 bg-cyan-400/60" : "border-slate-600")} />
      </div>
      {hint ? <div className="text-xs text-slate-500 mt-2">{hint}</div> : null}
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
      <div className="text-[11px] text-slate-500 mt-2">
        Tip: try “auto”, “cleaning”, “DJ”, “HVAC”, “ride”, “lawn”, “grooming”…
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

export default function CustomerNewRequest() {
  const nav = useNavigate();
  const location = useLocation();

  const [serviceCats, setServiceCats] = useState([]);
  const [loadingCats, setLoadingCats] = useState(false);

  const [step, setStep] = useState(1);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [isMarketplace, setIsMarketplace] = useState(true);

  const [lifeCategory, setLifeCategory] = useState("");
  const [subtype, setSubtype] = useState("");

  const [shortTitle, setShortTitle] = useState("");
  const [details, setDetails] = useState("");

  const [serviceAddress, setServiceAddress] = useState("");
  const [serviceZip, setServiceZip] = useState("");
  const [serviceRadius, setServiceRadius] = useState(25);

  const [preferredDate, setPreferredDate] = useState("");
  const [timeWindow, setTimeWindow] = useState("");

  const [priority, setPriority] = useState("P3");

  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");

  const [petType, setPetType] = useState("dog");
  const [breed, setBreed] = useState("");
  const [weight, setWeight] = useState("");
  const [shotsUpToDate, setShotsUpToDate] = useState("yes");
  const [petNotes, setPetNotes] = useState("");

  const [childAge, setChildAge] = useState("");
  const [recurring, setRecurring] = useState("one_time");
  const [familyNotes, setFamilyNotes] = useState("");

  const [paymentPref, setPaymentPref] = useState("CARD_ON_FILE");

  // ✅ Selected provider (from Business Cards)
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  const [selectedFavoriteId, setSelectedFavoriteId] = useState(null);
  const [selectedBusinessName, setSelectedBusinessName] = useState("");
  const [prefillSource, setPrefillSource] = useState("");

  // ✅ New: search UI state (category + type search)
  const [search, setSearch] = useState("");
  const [typeSearch, setTypeSearch] = useState("");

  async function loadServiceCats() {
    setErr("");
    setLoadingCats(true);
    try {
      const res = await api.get("/service-categories/");
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setServiceCats(list);
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

  // ✅ Prefill from query params OR localStorage
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
          radius_miles: null,
          source: "query",
        }
      : hasLS
      ? {
          business_id: Number(ls.business_id),
          favorite_id: Number.isFinite(Number(ls.favorite_id)) ? Number(ls.favorite_id) : null,
          business_name: safeStr(ls.business_name || ""),
          base_zip: safeStr(ls.base_zip || ""),
          radius_miles: ls.radius_miles ?? null,
          source: safeStr(ls.source || "localStorage"),
        }
      : null;

    if (!chosen) return;

    setSelectedBusinessId(chosen.business_id);
    setSelectedFavoriteId(chosen.favorite_id);
    setSelectedBusinessName(chosen.business_name || "");
    setPrefillSource(chosen.source || "prefill");

    // Prefer DIRECT request when user chose a business card
    setIsMarketplace(false);

    // Prefill routing fields if provided
    if (chosen.base_zip && !serviceZip) setServiceZip(chosen.base_zip);
    if (chosen.radius_miles != null && Number(chosen.radius_miles) > 0) setServiceRadius(Number(chosen.radius_miles));

    // If we came from localStorage, clear it so it doesn't "stick" forever
    if (!hasQuery && hasLS) clearPrefill();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // ✅ Fetch business name if missing
  useEffect(() => {
    let mounted = true;
    async function hydrateBusinessName() {
      if (!selectedBusinessId) return;
      if (selectedBusinessName) return;
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

  const computedCategoryId = useMemo(() => {
    if (!serviceCats?.length) return "";
    if (!lifeCategory && !subtype) return serviceCats[0]?.id || "";
    return mapToServiceCategoryId(serviceCats, lifeCategory, subtype);
  }, [serviceCats, lifeCategory, subtype]);

  function next() {
    if (step === 1 && !lifeCategory) return setErr("Pick what you need help with.");
    if (step === 2 && !subtype) return setErr("Pick a type.");
    if (step === 3) {
      if (!shortTitle.trim()) return setErr("Short title is required.");
      if (isMarketplace && !serviceZip.trim()) return setErr("ZIP is required for marketplace tickets.");
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
    setPickupAddress("");
    setDropoffAddress("");
    setTypeSearch("");
  }

  function clearSelectedBusiness() {
    setSelectedBusinessId(null);
    setSelectedFavoriteId(null);
    setSelectedBusinessName("");
    setPrefillSource("");
    // don't force marketplace on/off here; let user decide
  }

  function buildContext() {
    return {
      version: "life_intake_v1",
      life_category: lifeCategory,
      subtype,
      marketplace_ui: !!isMarketplace,
      payment: { preference: paymentPref },
      routing: {
        service_zip: serviceZip.trim(),
        service_radius_miles: Number(serviceRadius) || 25,
        service_address: serviceAddress.trim(),
      },
      scheduling: {
        preferred_date: preferredDate ? toPrettyDateISO(preferredDate) : "",
        time_window: timeWindow || "",
      },
      home: lifeCategory === "home_property" ? { priority } : undefined,
      ride:
        lifeCategory === "rideshare"
          ? { pickup_address: pickupAddress.trim(), dropoff_address: dropoffAddress.trim() }
          : undefined,
      pets:
        lifeCategory === "pets"
          ? {
              pet_type: petType,
              breed: breed.trim(),
              weight: weight.trim(),
              shots_up_to_date: shotsUpToDate,
              pet_notes: petNotes.trim(),
            }
          : undefined,
      kids_family:
        lifeCategory === "kids_family"
          ? { child_age: childAge.trim(), recurring, family_notes: familyNotes.trim() }
          : undefined,
      selected_provider:
        selectedBusinessId
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
      if (!computedCategoryId) throw new Error("No service category available (service-categories empty).");
      if (!lifeCategory) throw new Error("Pick what you need help with.");
      if (!subtype) throw new Error("Pick a type.");
      if (!shortTitle.trim()) throw new Error("Short title is required.");
      if (isMarketplace && !serviceZip.trim()) throw new Error("ZIP is required for marketplace tickets.");

      const context = buildContext();
      const finalDescription = (details?.trim() || "") + intakeBlock(context);

      const payload = {
        category: Number(computedCategoryId),
        title: shortTitle.trim(),
        description: finalDescription.trim(),

        // Legacy model fields
        address: serviceAddress.trim(),
        zip_code: serviceZip.trim(),

        // Routing / Ticket fields
        service_address: serviceAddress.trim(),
        service_zip: serviceZip.trim(),
        service_radius_miles: Number(serviceRadius) || 25,

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
      setErr(e?.response?.data?.detail || e.message || "Failed to create request");
    }
  }

  const lifeLabel = LIFE_CATEGORIES.find((c) => c.key === lifeCategory)?.label || "";
  const subtypeLabel = (subtypeOptions || []).find((s) => s.key === subtype)?.label || "";
  const paymentLabel = PAYMENT_PREFS.find((p) => p.id === paymentPref)?.label || paymentPref;

  // ✅ Filter helpers for search
  const filteredLifeCats = useMemo(() => {
    const q = safeStr(search).trim().toLowerCase();
    if (!q) return LIFE_CATEGORIES;

    return LIFE_CATEGORIES.filter((c) => {
      const blob = [c.key, c.label, c.desc, c.emoji].map((x) => safeStr(x).toLowerCase()).join(" | ");
      return blob.includes(q);
    });
  }, [search]);

  const filteredSubtypeOptions = useMemo(() => {
    const list = subtypeOptions || [];
    const q = safeStr(typeSearch).trim().toLowerCase();
    if (!q) return list;

    return list.filter((s) => {
      const blob = [s.key, s.label, s.emoji].map((x) => safeStr(x).toLowerCase()).join(" | ");
      return blob.includes(q);
    });
  }, [subtypeOptions, typeSearch]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar title="New Service Request" subtitle="Search → pick a bucket → pick a type → submit." />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {err ? <div className="text-sm text-red-200 bg-red-900/10 border border-red-800 rounded-xl p-3">{err}</div> : null}
        {msg ? <div className="text-sm text-emerald-200 bg-emerald-900/10 border border-emerald-800 rounded-xl p-3">{msg}</div> : null}

        {/* ✅ Selected Provider Banner */}
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
                      {" "}
                      • Favorite ID <span className="font-mono">{selectedFavoriteId}</span>
                    </>
                  ) : null}
                </div>
                <div className="text-[11px] text-slate-400 mt-2">
                  Direct request is enabled ✅ This will route directly to the selected provider (Marketplace OFF).
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
            done={!!shortTitle.trim() && (!isMarketplace || !!serviceZip.trim())}
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
              title={selectedBusinessId ? "Provider selected. Marketplace ON means broadcast intent (but direct routing will be forced OFF on submit)." : ""}
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

        {/* ✅ STEP 1: Search + Big Buckets */}
        {step === 1 ? (
          <div className="space-y-3">
            <SearchBar value={search} onChange={setSearch} placeholder="Search services… (auto detailing, DJ, cleaning, HVAC, ride, etc.)" />

            <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold">Pick a category</div>
                  <div className="text-xs text-slate-400 mt-1">Big buckets first. We’ll narrow it down next.</div>
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
                      setTimeout(() => {
                        try {
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        } catch {}
                      }, 0);
                    }}
                  />
                ))}
              </div>

              {!filteredLifeCats.length ? (
                <div className="mt-4 text-sm text-slate-400">
                  No matches. Try a different search (ex: “auto”, “party”, “home”, “pets”).
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* ✅ STEP 2: Type Search + Tiles */}
        {step === 2 ? (
          <div className="space-y-3">
            <SearchBar value={typeSearch} onChange={setTypeSearch} placeholder={`Search types in ${lifeLabel || "category"}…`} />

            <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold">
                    {lifeCategory ? `Choose a type in ${lifeLabel}` : "Choose a type"}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">This helps us match you to the right provider.</div>
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
                    desc={titleCase(it.key)}
                    onClick={() => {
                      setErr("");
                      setSubtype(it.key);
                      setStep(3);
                      setTimeout(() => {
                        try {
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        } catch {}
                      }, 0);
                    }}
                  />
                ))}
              </div>

              {!filteredSubtypeOptions.length ? (
                <div className="mt-4 text-sm text-slate-400">
                  No matches. Try searching “clean”, “repair”, “DJ”, “HVAC”, “detail”, etc.
                </div>
              ) : null}

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

        {/* ✅ STEP 3: Details (kept as-is) */}
        {step === 3 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Details</div>
                <div className="text-xs text-slate-400 mt-1">{lifeLabel ? `${lifeLabel} → ${subtypeLabel}` : "Answer a few quick questions."}</div>
              </div>
              <div className="text-xs text-slate-500">
                Service Category ID mapped: <span className="font-mono text-slate-300">{computedCategoryId || "—"}</span>
              </div>
            </div>

            <Field label="Short title (required)">
              <input
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                placeholder="Example: Kitchen sink leaking, airport ride, dog grooming…"
                value={shortTitle}
                onChange={(e) => setShortTitle(e.target.value)}
              />
            </Field>

            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Service ZIP" hint={isMarketplace ? "Required for marketplace routing." : "Optional for direct requests (still recommended)."}>
                <input
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                  placeholder="ZIP"
                  value={serviceZip}
                  onChange={(e) => setServiceZip(e.target.value)}
                />
              </Field>

              <Field label="Radius (miles)" hint="Used for routing & matching.">
                <input
                  type="number"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                  value={serviceRadius}
                  onChange={(e) => setServiceRadius(Number(e.target.value) || 25)}
                  min={1}
                  max={250}
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

              <Field label="Extra details (optional)" hint="This will be appended before the intake block.">
                <textarea
                  className="w-full min-h-[88px] bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                  placeholder="Describe the job…"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                />
              </Field>
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

        {/* ✅ STEP 4: Review (kept as-is) */}
        {step === 4 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Review</div>
                <div className="text-xs text-slate-400 mt-1">Confirm and create the request.</div>
              </div>
              <div className="text-xs text-slate-500">
                Mapped category: <span className="font-mono text-slate-300">{computedCategoryId || "—"}</span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              {selectedBusinessId ? (
                <ReviewRow k="Provider" v={selectedBusinessName || `Business #${selectedBusinessId}`} />
              ) : (
                <ReviewRow k="Provider" v="Marketplace broadcast (no provider selected)" />
              )}
              <ReviewRow k="Category" v={`${lifeLabel || "—"} → ${subtypeLabel || "—"}`} />
              <ReviewRow k="Marketplace (UI intent)" v={isMarketplace ? "ON" : "OFF"} />
              <ReviewRow k="Title" v={shortTitle || "—"} />
              <ReviewRow k="ZIP" v={serviceZip || "—"} />
              <ReviewRow k="Radius" v={`${serviceRadius || 25} mi`} />
              <ReviewRow k="Preferred Date" v={preferredDate || "—"} />
              <ReviewRow k="Time Window" v={timeWindow || "—"} />
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
