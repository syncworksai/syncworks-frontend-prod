// src/components/sbo/SboSetupWizard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { BUSINESS_ADD_ONS, STATUS_LABEL } from "../../lib/featureAvailability";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function safeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.value)) return data.value;
  return [];
}

const STATE_CODE_BY_NAME = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "district of columbia": "DC",
};

function normalizeStateCode(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.length === 2) return raw.toUpperCase();

  const lowered = raw.toLowerCase();
  if (STATE_CODE_BY_NAME[lowered]) return STATE_CODE_BY_NAME[lowered];

  return raw.toUpperCase();
}

function setupStorageKey(businessId) {
  return `sw_setup_baseline_v1_${businessId || "no_biz"}`;
}

function categoryId(cat) {
  const raw = cat?.id ?? cat?.pk ?? cat?.value ?? "";
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function categoryParentId(cat) {
  const raw =
    cat?.parent_id ??
    cat?.parent ??
    cat?.parentId ??
    cat?.parent_category ??
    cat?.parentCategory ??
    "";

  if (raw && typeof raw === "object") {
    return categoryId(raw);
  }

  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function categoryKey(cat) {
  return String(cat?.key || cat?.slug || cat?.code || cat?.name || "")
    .trim()
    .toLowerCase();
}

function categoryName(cat) {
  return String(cat?.name || cat?.label || cat?.title || cat?.key || "Service").trim();
}

function categoryPath(cat) {
  return String(cat?.path || cat?.category_path || cat?.full_path || "").trim();
}

function isActiveCategory(cat) {
  if (cat?.is_active === false) return false;
  if (cat?.active === false) return false;
  return true;
}

function extractBusinessServiceIds(biz) {
  const possible = [
    biz?.services_offered,
    biz?.services_offered_ids,
    biz?.service_categories,
    biz?.service_category_ids,
    biz?.selected_services,
    biz?.selectedServices,
  ];

  const ids = [];

  possible.forEach((value) => {
    if (!value) return;

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (typeof item === "number" || typeof item === "string") {
          const n = Number(item);
          if (Number.isFinite(n) && n > 0) ids.push(n);
          return;
        }

        const n = categoryId(item);
        if (n) ids.push(n);
      });
    }
  });

  return Array.from(new Set(ids));
}

function buildSelectableServiceGroups(categories) {
  const active = safeList(categories).filter(isActiveCategory);
  const byId = new Map();

  active.forEach((cat) => {
    const id = categoryId(cat);
    if (id) byId.set(id, cat);
  });

  const childCount = new Map();

  active.forEach((cat) => {
    const pid = categoryParentId(cat);
    if (!pid) return;
    childCount.set(pid, (childCount.get(pid) || 0) + 1);
  });

  let selectable = active.filter((cat) => {
    const id = categoryId(cat);
    const pid = categoryParentId(cat);
    return id && pid && childCount.get(id) > 0;
  });

  if (!selectable.length) {
    selectable = active.filter((cat) => {
      const id = categoryId(cat);
      return id && childCount.get(id) > 0;
    });
  }

  if (!selectable.length) {
    selectable = active;
  }

  return selectable
    .map((cat) => {
      const id = categoryId(cat);
      const pid = categoryParentId(cat);
      const parent = pid ? byId.get(pid) : null;

      return {
        id,
        key: categoryKey(cat),
        name: categoryName(cat),
        path: categoryPath(cat),
        parentName: parent ? categoryName(parent) : "",
        childCount: childCount.get(id) || 0,
      };
    })
    .filter((x) => x.id)
    .sort((a, b) => {
      const ap = a.parentName || "";
      const bp = b.parentName || "";
      if (ap !== bp) return ap.localeCompare(bp);
      return a.name.localeCompare(b.name);
    });
}

function serviceIcon(key, name) {
  const text = `${key || ""} ${name || ""}`.toLowerCase();

  if (text.includes("plumb")) return "🚰";
  if (text.includes("hvac") || text.includes("air")) return "❄️";
  if (text.includes("electric")) return "⚡";
  if (text.includes("tree")) return "🌳";
  if (text.includes("lawn") || text.includes("landscap")) return "🌿";
  if (text.includes("junk") || text.includes("haul")) return "🚚";
  if (text.includes("clean")) return "🧽";
  if (text.includes("handyman")) return "🛠️";
  if (text.includes("roof")) return "🏠";
  if (text.includes("dog") || text.includes("pet")) return "🐶";
  if (text.includes("tutor") || text.includes("education")) return "📚";
  if (text.includes("real")) return "🏡";
  if (text.includes("restaurant") || text.includes("food")) return "🍔";
  if (text.includes("auto") || text.includes("mechanic")) return "🚗";
  if (text.includes("beauty") || text.includes("hair")) return "✨";
  if (text.includes("tech") || text.includes("computer")) return "💻";

  return "🎫";
}

function StepPill({ active, done, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-2xl border px-3 py-2 text-xs font-semibold transition",
        active
          ? "border-fuchsia-400/60 bg-fuchsia-500/18 text-fuchsia-100 shadow-[0_0_24px_rgba(217,70,239,0.22)]"
          : done
          ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-100"
          : "border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-900/60"
      )}
    >
      {children}
    </button>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <div className="rounded-[2rem] border border-fuchsia-500/30 bg-slate-950/60 p-5 shadow-[0_0_40px_rgba(76,29,149,0.18)]">
      <div>
        <div className="text-sm font-black text-slate-100">{title}</div>
        {subtitle ? (
          <div className="mt-1 text-xs leading-5 text-slate-400">{subtitle}</div>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder = "", type = "text" }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs text-slate-300">{label}</div>
      <input
        value={value}
        type={type}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-fuchsia-500/50 focus:ring-2 focus:ring-fuchsia-500/10"
      />
    </label>
  );
}

function Select({ label, value, onChange, options = [] }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs text-slate-300">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-fuchsia-500/50 focus:ring-2 focus:ring-fuchsia-500/10"
      >
        {options.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            className="bg-slate-950 text-slate-100"
          >
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange, hint = "" }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cx(
        "w-full rounded-2xl border px-4 py-3 text-left transition",
        checked
          ? "border-fuchsia-400/40 bg-gradient-to-r from-fuchsia-500/15 via-purple-500/14 to-cyan-500/10 text-fuchsia-50 shadow-[0_0_22px_rgba(217,70,239,0.18)]"
          : "border-slate-800 bg-slate-950/70 text-slate-100 hover:bg-slate-900/70"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{label}</div>
          {hint ? (
            <div className="mt-1 text-[11px] text-slate-400">{hint}</div>
          ) : null}
        </div>
        <div className="text-[11px] font-black uppercase tracking-[0.14em]">
          {checked ? "ON" : "OFF"}
        </div>
      </div>
    </button>
  );
}

export default function SboSetupWizard({
  open,
  onClose,
  businessId,
  business,
  categories,
  onSaveBusiness,
  onDone,
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [planPromo, setPlanPromo] = useState("");
  const [jarvisAutomate, setJarvisAutomate] = useState(false);
  const [featureInterests, setFeatureInterests] = useState([]);
  const [customerFlow, setCustomerFlow] = useState("service");
  const [sameEmail, setSameEmail] = useState(false);
  const [sameName, setSameName] = useState(false);
  const [sameAddress, setSameAddress] = useState(false);
  const [orderMethod, setOrderMethod] = useState("pickup");
  const [contactPreference, setContactPreference] = useState("inbox");
  const steps = useMemo(
    () => [
      { key: "basics", label: "1. Business Basics" },
      { key: "area", label: "2. Service Area" },
      { key: "services", label: "3. Services" },
      { key: "finish", label: "4. Plan Review" },
    ],
    []
  );

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [headline, setHeadline] = useState("");
  const [servicesText, setServicesText] = useState("");

  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [baseZip, setBaseZip] = useState("");
  const [radius, setRadius] = useState("25");
  const [businessPresenceMode, setBusinessPresenceMode] = useState("");
  const [acceptsMarketplace, setAcceptsMarketplace] = useState(true);

  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [serviceQuery, setServiceQuery] = useState("");


  const serviceRows = useMemo(
    () => buildSelectableServiceGroups(categories),
    [categories]
  );

  const selectedServiceSet = useMemo(
    () => new Set((selectedServiceIds || []).map(Number).filter(Boolean)),
    [selectedServiceIds]
  );

  const filteredServiceRows = useMemo(() => {
    const q = String(serviceQuery || "").trim().toLowerCase();
    if (!q) return serviceRows;

    return serviceRows.filter((row) =>
      [row.name, row.key, row.path, row.parentName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [serviceQuery, serviceRows]);

  useEffect(() => {
    if (!open) return;

    let local = {};
    try {
      local = JSON.parse(localStorage.getItem(setupStorageKey(businessId)) || "{}");
    } catch {
      local = {};
    }

    setStep(0);
    setBillingCycle(local.billingCycle || "monthly");
    setPlanPromo(local.planPromo || "");
    setJarvisAutomate(!!local.jarvisAutomate);
    setFeatureInterests(Array.isArray(local.featureInterests) ? local.featureInterests : []);
    setSaving(false);
    setError("");
    setWarning("");
    setSuccess("");

    setCustomerFlow(local.customerFlow || "service");
    setSameEmail(!!local.sameEmail);
    setSameName(!!local.sameName);
    setSameAddress(!!local.sameAddress);
    setOrderMethod(local.orderMethod || "pickup");
    setContactPreference(local.contactPreference || "inbox");
    setName(local.name ?? business?.name ?? "");
    setBusinessEmail(local.businessEmail ?? business?.business_email ?? "");
    setOwnerName(local.ownerName ?? business?.owner_name ?? "");
    setPhone(local.phone ?? business?.phone ?? "");
    setWebsite(local.website ?? business?.website ?? "");
    setHeadline(local.headline ?? business?.headline ?? "");
    setServicesText(local.servicesText ?? business?.services_text ?? "");

    setAddress(local.address ?? business?.address ?? "");
    setCity(local.city ?? business?.city ?? "");
    setState(local.state ?? business?.state ?? "");
    setBaseZip(local.baseZip ?? business?.base_zip ?? "");
    setRadius(
      String(
        local.radius ??
          business?.service_radius_miles ??
          business?.effective_service_radius_miles ??
          25
      )
    );
    setBusinessPresenceMode(
      local.businessPresenceMode ?? business?.business_presence_mode ?? ""
    );
    setAcceptsMarketplace(
      typeof local.acceptsMarketplace === "boolean"
        ? local.acceptsMarketplace
        : !!business?.accepts_marketplace_tickets
    );

    const businessServiceIds = extractBusinessServiceIds(business);
    const localServices = Array.isArray(local.selectedServices)
      ? local.selectedServices.map(Number).filter(Boolean)
      : [];
    setSelectedServiceIds(localServices.length ? localServices : businessServiceIds);

  }, [open, businessId, business]);

  if (!open) return null;

  function persistLocal() {
    const payload = {
      name,
      billingCycle,
      planPromo,
      jarvisAutomate,
      featureInterests,
      customerFlow,
      sameEmail,
      sameName,
      sameAddress,
      orderMethod,
      contactPreference,
      businessEmail,
      ownerName,
      phone,
      website,
      headline,
      servicesText,
      address,
      city,
      state,
      baseZip,
      radius,
      businessPresenceMode,
      acceptsMarketplace,
      selectedServices: selectedServiceIds,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(setupStorageKey(businessId), JSON.stringify(payload));
  }

  function toggleService(id) {
    const n = Number(id);
    if (!Number.isFinite(n) || n <= 0) return;

    setSelectedServiceIds((prev) => {
      const next = new Set((prev || []).map(Number).filter(Boolean));
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return Array.from(next);
    });
  }

  async function saveBusinessStep(payload, successMessage) {
    if (typeof onSaveBusiness !== "function") {
      persistLocal();
      setSuccess(successMessage || "");
      return true;
    }

    setSaving(true);
    setError("");
    setWarning("");
    setSuccess("");

    try {
      await onSaveBusiness(payload);
      persistLocal();
      setSuccess(successMessage || "Saved.");
      return true;
    } catch (e) {
      const detail =
        e?.response?.data?.detail ||
        JSON.stringify(e?.response?.data || {}) ||
        e?.message ||
        "Save failed.";
      setError(detail);
      return false;
    } finally {
      setSaving(false);
    }
  }

  function basicsPayload() {
    return {
      name,
      business_email: businessEmail,
      owner_name: ownerName,
      phone,
      website,
      headline,
      services_text: servicesText,
    };
  }

  function areaPayload() {
    return {
      address,
      city,
      state: normalizeStateCode(state),
      base_zip: baseZip,
      service_radius_miles: Number(radius || 0),
      business_presence_mode: businessPresenceMode,
      accepts_marketplace_tickets: !!acceptsMarketplace,
    };
  }

  function servicesPayload() {
    return {
      services_offered: selectedServiceIds,
    };
  }

  async function saveCurrentStep(currentStep) {
    if (currentStep === 0) {
      return saveBusinessStep(basicsPayload(), "Business basics saved.");
    }

    if (currentStep === 1) {
      return saveBusinessStep(areaPayload(), "Service area saved.");
    }

    if (currentStep === 2) {
      if (!selectedServiceIds.length && !serviceRows.length) { persistLocal(); setWarning("Service categories are unavailable. You may finish the profile, but marketplace matching remains inactive until offerings are selected."); return true; }
      return saveBusinessStep(servicesPayload(), "Offerings saved.");
    }

    return true;
  }

  async function handleNext() {
    const ok = await saveCurrentStep(step);
    if (!ok) return;
    setStep((s) => Math.min(steps.length - 1, s + 1));
  }

  async function handleFinish() {
    if (!name.trim()) {
      setError("Enter your business name first.");
      setStep(0);
      return;
    }
    if (!city.trim() || !/^\d{5}$/.test(baseZip.trim()) || !normalizeStateCode(state) || (businessPresenceMode !== "online" && Number(radius || 0) <= 0)) {
      setError("Finish your city, state, five-digit ZIP, and service area before activating.");
      setStep(1);
      return;
    }
    if (!selectedServiceIds.length && serviceRows.length > 0) {
      setError("Choose at least one offering before completing setup.");
      setStep(2);
      return;
    }

    const combinedPayload = {
      ...basicsPayload(),
      ...areaPayload(),
      ...servicesPayload(),
    };

    const ok = await saveBusinessStep(
      combinedPayload,
      "Setup saved successfully."
    );

    if (!ok) return;

    persistLocal();

    if (typeof onDone === "function") {
      await Promise.resolve(onDone());
    }

    navigate("/upgrade?modules=SBO&next=%2Fsbo");
    onClose?.();
  }

  const canNext =
    step === 0
      ? !!name.trim()
      : step === 1
      ? !!city.trim() && /^\d{5}$/.test(baseZip.trim()) && !!normalizeStateCode(state).trim() && (businessPresenceMode === "online" || Number(radius || 0) > 0)
      : step === 2
      ? (selectedServiceIds.length > 0 || serviceRows.length === 0)
      : true;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-[2.25rem] border border-fuchsia-500/25 bg-[#020617] shadow-[0_0_80px_rgba(76,29,149,0.35)]">
        <div className="sticky top-0 z-10 border-b border-slate-800 bg-[#020617]/95 px-6 py-5 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-3xl font-black tracking-tight text-white">
                Set Up Your Business
              </div>
              <div className="mt-1 text-sm text-slate-400">
                Four guided steps: tell us about your business, where you work, what you offer, and review the setup. We'll explain why each answer matters.
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-900"
            >
              Close
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {steps.map((x, idx) => (
              <StepPill
                key={x.key}
                active={step === idx}
                done={idx < step}
                onClick={() => setStep(idx)}
              >
                {x.label}
              </StepPill>
            ))}
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error ? (
            <div className="rounded-2xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          {warning ? (
            <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {warning}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              {success}
            </div>
          ) : null}

          {step === 0 ? (
            <Card
              title="Business Basics"
              subtitle="Start with the core identity customers and SyncWorks use."
            >
              <div className="mb-5 rounded-2xl border border-sky-400/25 bg-[#0b1c30] p-4">
                <p className="text-sm font-bold text-white">How do customers interact with your business?</p>
                <p className="mt-1 text-sm text-slate-300">This helps SyncWorks recommend the right requests, tools and dashboard. You can change it later.</p>
                <div className="mt-3 grid gap-2">
                  {[
                    ["service","Customers request services or appointments"],
                    ["lead","Customers inquire before purchasing or signing up"],
                    ["order","Customers place orders or purchase products"],
                    ["mixed","My business uses a combination"]
                  ].map(([key,label]) => <label key={key} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700/70 bg-slate-950/60 px-3 py-3 text-sm text-slate-100"><input type="radio" name="businessCustomerFlow" checked={customerFlow===key} onChange={()=>setCustomerFlow(key)} className="h-4 w-4 accent-[#168BFF]"/>{label}</label>)}
                </div>
                <div className="mt-3 rounded-xl border border-teal-400/25 bg-teal-400/5 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-teal-200">Recommended workflow</p>
                  <p className="mt-1 text-sm font-semibold text-white">{({service:"Request → Schedule → Complete → Invoice",lead:"Lead → Qualify → Consult → Convert",order:"Order → Confirm → Fulfill → Payment",mixed:"Lead, service and order workflows"})[customerFlow]}</p>
                  <p className="mt-1 text-xs text-slate-300">This is a setup preference; advanced routing and order fulfillment need separate activation.</p>
                </div>
              </div>
              <div className="mb-4 flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-200"><input type="checkbox" checked={sameEmail} onChange={e=>{setSameEmail(e.target.checked);if(e.target.checked)setBusinessEmail(user?.email||"");}}/>Use my personal account email for business contact</label>
                <label className="flex items-center gap-2 text-sm text-slate-200"><input type="checkbox" checked={sameName} onChange={e=>{setSameName(e.target.checked);if(e.target.checked)setOwnerName([user?.first_name,user?.last_name].filter(Boolean).join(" ")||user?.name||"");}}/>Use my profile name as business contact</label>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  label="Business Name"
                  value={name}
                  onChange={setName}
                  placeholder="Acme Plumbing"
                />
                <Input
                  label="Business Contact Email"
                  value={businessEmail}
                  onChange={setBusinessEmail}
                  placeholder="office@yourbusiness.com"
                />
                <Input
                  label="Owner / Contact Name"
                  value={ownerName}
                  onChange={setOwnerName}
                  placeholder="Jacob Lord"
                />
                <Input
                  label="Phone"
                  value={phone}
                  onChange={setPhone}
                  placeholder="334-555-1212"
                />
                <Input
                  label="Website"
                  value={website}
                  onChange={setWebsite}
                  placeholder="https://yourbusiness.com"
                />
                <Input
                  label="Headline"
                  value={headline}
                  onChange={setHeadline}
                  placeholder="Fast, reliable service"
                />
              </div>

              <div className="mt-3">
                <label className="block">
                  <div className="mb-1 text-xs text-slate-300">Services Summary</div>
                  <textarea
                    value={servicesText}
                    onChange={(e) => setServicesText(e.target.value)}
                    placeholder="Repairs, installs, diagnostics, recurring service..."
                    rows={4}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-fuchsia-500/50 focus:ring-2 focus:ring-fuchsia-500/10"
                  />
                </label>
              </div>
            </Card>
          ) : null}

          {step === 1 ? (
            <Card
              title="Service Area"
              subtitle="Where do you operate, and do you want marketplace jobs turned on?"
            >
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  label="Street Address"
                  value={address}
                  onChange={setAddress}
                  placeholder="9073 Chastain Park Dr"
                />
                <Input
                  label="City"
                  value={city}
                  onChange={setCity}
                  placeholder="Montgomery"
                />
                <Input
                  label="State"
                  value={state}
                  onChange={setState}
                  placeholder="AL or Alabama"
                />
                <Input
                  label="Base ZIP"
                  value={baseZip}
                  onChange={setBaseZip}
                  placeholder="36117"
                />
                <Input
                  label="Radius (miles)"
                  value={radius}
                  onChange={setRadius}
                  type="number"
                  placeholder="25"
                />
                <Select
                  label="Business Type"
                  value={businessPresenceMode}
                  onChange={setBusinessPresenceMode}
                  options={[
                    { value: "", label: "Select business type…" },
                    { value: "online", label: "Online / Remote" },
                    { value: "in_person", label: "In Person" },
                    { value: "on_site", label: "On-Site Service" },
                    { value: "hybrid", label: "Hybrid" },
                  ]}
                />
              </div>

              <div className="mb-4 rounded-2xl border border-sky-400/20 bg-sky-500/5 p-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-100"><input type="checkbox" checked={sameAddress} onChange={e=>{setSameAddress(e.target.checked);if(e.target.checked){setAddress(user?.address||user?.street_address||"");setCity(user?.city||"");setState(user?.state||"");setBaseZip(user?.zip||user?.zip_code||"");}}}/>Use my personal profile address</label>
                <p className="mt-1 text-xs text-slate-300">Only reuse fields already saved in your profile; check them before saving. For online businesses, this address is for account setup and should not automatically be displayed publicly.</p>
              </div>
              {(customerFlow==="order"||customerFlow==="mixed") ? <div className="mb-4 rounded-2xl border border-violet-400/25 bg-violet-400/5 p-4">
                <p className="text-sm font-bold text-white">How will customers receive orders?</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">{[["pickup","In-store pickup"],["delivery","Local delivery"],["shipping","Shipping"],["arranged","Arrange with customer"]].map(([key,label])=><label key={key} className="flex items-center gap-2 text-sm text-slate-200"><input type="radio" name="orderMethod" checked={orderMethod===key} onChange={()=>setOrderMethod(key)}/>{label}</label>)}</div>
                <p className="mt-2 text-xs text-slate-300">Your preference is saved for future order setup. Shipping and delivery integrations are not enabled by choosing an option.</p>
              </div> : null}
              {(customerFlow==="lead"||customerFlow==="mixed") ? <div className="mb-4 rounded-2xl border border-teal-400/25 bg-teal-400/5 p-4"><p className="text-sm font-bold text-white">Where should new inquiries go first?</p><select value={contactPreference} onChange={e=>setContactPreference(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-3 text-sm text-white"><option value="inbox">Business inbox</option><option value="consultation">Consultation request queue</option></select><p className="mt-2 text-xs text-slate-300">This is a saved preference. Automated lead routing will be enabled when the relevant workflow is available.</p></div> : null}
              <div className="mt-4">
                <Toggle
                  label="Accept Marketplace Tickets"
                  checked={acceptsMarketplace}
                  onChange={setAcceptsMarketplace}
                  hint="If OFF, the business will not receive new open marketplace jobs."
                />
              </div>

              <div className="mt-3 rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-3 text-xs text-slate-300">
                State names like <span className="font-semibold text-white">Alabama</span> will now automatically save as{" "}
                <span className="font-semibold text-fuchsia-200">AL</span>.
              </div>
            </Card>
          ) : null}

          {step === 2 ? (
            <Card
              title="What you offer"
              subtitle="Search and select categories customers should find you under. These are used for marketplace discovery."
            >
              <div className="rounded-3xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/10 via-purple-500/8 to-cyan-500/8 p-4">
                <div className="text-sm font-black text-fuchsia-100">
                  Service types offered
                </div>
                <div className="mt-1 text-xs text-slate-300">
                  Choose broad service groups, not every tiny task.
                </div>

                <div className="mt-4 rounded-2xl border border-fuchsia-500/30 bg-slate-950/75 p-2 shadow-[0_0_24px_rgba(217,70,239,0.12)]">
                  <div className="flex items-center gap-2">
                    <input
                      value={serviceQuery}
                      onChange={(e) => setServiceQuery(e.target.value)}
                      placeholder="Search plumbing, tree, tutoring, dog grooming..."
                      className="h-11 w-full bg-transparent px-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none"
                    />
                    {serviceQuery ? (
                      <button
                        type="button"
                        onClick={() => setServiceQuery("")}
                        className="rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-2 text-xs font-semibold text-fuchsia-100 hover:bg-fuchsia-500/15"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-fuchsia-500/30 bg-slate-950/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-fuchsia-200">
                    Selected service types
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedServiceIds.length ? (
                      serviceRows
                        .filter((row) => selectedServiceSet.has(row.id))
                        .map((row) => (
                          <button
                            key={row.id}
                            type="button"
                            onClick={() => toggleService(row.id)}
                            className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/40 bg-gradient-to-r from-fuchsia-500/20 to-purple-500/20 px-3 py-2 text-xs font-semibold text-fuchsia-50 shadow-[0_0_18px_rgba(217,70,239,0.18)]"
                          >
                            {row.name}
                            <span className="text-fuchsia-200">×</span>
                          </button>
                        ))
                    ) : (
                      <div className="text-sm text-slate-500">No services selected yet.</div>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                  <div className="text-sm font-black text-cyan-100">Best matches</div>
                  <div className="mt-3 grid gap-3">
                    {filteredServiceRows.length ? (
                      filteredServiceRows.slice(0, 24).map((row) => {
                        const active = selectedServiceSet.has(row.id);

                        return (
                          <button
                            key={row.id}
                            type="button"
                            onClick={() => toggleService(row.id)}
                            className={cx(
                              "rounded-3xl border p-4 text-left transition",
                              active
                                ? "border-fuchsia-400/55 bg-gradient-to-r from-fuchsia-500/18 via-purple-500/18 to-cyan-500/12 text-fuchsia-50 shadow-[0_0_30px_rgba(217,70,239,0.22)]"
                                : "border-slate-800 bg-slate-950/65 text-slate-200 hover:border-fuchsia-500/35 hover:bg-slate-900/70"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-3">
                                  <div className="text-2xl">{serviceIcon(row.key, row.name)}</div>
                                  <div>
                                    <div className="text-lg font-black text-white">
                                      {row.name}
                                    </div>
                                    <div className="mt-1 text-sm text-slate-300">
                                      {row.parentName ? `${row.parentName} • ` : ""}
                                      {row.childCount ? `${row.childCount} sub-services` : "Broad service type"}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <span
                                className={cx(
                                  "shrink-0 rounded-full border px-3 py-2 text-xs font-black",
                                  active
                                    ? "border-fuchsia-300 bg-fuchsia-400/20 text-fuchsia-50"
                                    : "border-slate-700 bg-slate-900 text-slate-400"
                                )}
                              >
                                {active ? "Selected" : "Select"}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
                        No service groups matched your search.
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-fuchsia-500/25 bg-slate-950/60 p-4">
                  <div className="text-xl font-black text-slate-100">Simple rule</div>
                  <div className="mt-2 text-sm leading-6 text-slate-300">
                    Choose the broad service types you want matched for. Example:
                    pick <span className="font-semibold text-fuchsia-200">Plumbing</span>,
                    not every individual plumbing task.
                  </div>
                </div>
              </div>
            </Card>
          ) : null}

          {step === 3 ? (
            <Card title="Review your business plan" subtitle="Review an estimate, confirm your setup, then activate your subscription through secure billing. No charge is made on this screen.">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-sky-400/25 bg-slate-950/70 p-4">
                  <h3 className="text-lg font-bold text-white">Your business</h3>
                  <p className="mt-2 text-sm text-slate-200">{name}</p>
                  <p className="mt-1 text-sm text-slate-300">{city}, {normalizeStateCode(state)} · {baseZip}</p>
                  <p className="mt-2 text-sm text-slate-300">Customer workflow: {customerFlow === "lead" ? "Leads and consultations" : customerFlow === "order" ? "Orders and products" : customerFlow === "mixed" ? "Mixed business" : "Services and appointments"}</p>
                  <p className="mt-1 text-sm text-slate-300">{selectedServiceIds.length} marketplace offering(s) selected</p>
                  {!selectedServiceIds.length ? <p className="mt-3 rounded-lg border border-amber-400/25 p-3 text-sm text-amber-200">Marketplace discovery is not ready: select offerings when the category directory is available.</p> : null}
                </div>
                <div className="rounded-2xl border border-sky-400/25 bg-[#091b2b] p-4">
                  <h3 className="text-lg font-bold text-white">Subscription estimate</h3>
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={()=>setBillingCycle("monthly")} aria-pressed={billingCycle==="monthly"} className={`rounded-lg border px-4 py-2 text-sm ${billingCycle==="monthly"?"border-cyan-300 text-white bg-cyan-500/20":"border-slate-700 text-slate-300"}`}>Monthly</button>
                    <button type="button" onClick={()=>setBillingCycle("annual")} aria-pressed={billingCycle==="annual"} className={`rounded-lg border px-4 py-2 text-sm ${billingCycle==="annual"?"border-cyan-300 text-white bg-cyan-500/20":"border-slate-700 text-slate-300"}`}>Annual estimate</button>
                  </div>
                  <div className="mt-4 flex justify-between gap-3 text-sm text-slate-100"><span>Business base</span><strong>{billingCycle==="monthly"?"$19.99 / mo":"$199.00 / yr (proposed)"}</strong></div>
                  <div className="mt-4 rounded-xl border border-slate-700 p-3">
                    <p className="text-sm font-bold text-white">Included with Business · $19.99/month</p>
                    <ul className="mt-2 grid gap-1 text-sm leading-6 text-slate-200">
                      <li>✓ Business profile and searchable marketplace listing</li>
                      <li>✓ Customer CRM, leads and job requests</li>
                      <li>✓ Manual scheduling and employee assignments</li>
                      <li>✓ Quotes, invoicing and payment records</li>
                      <li>✓ Team inbox and basic email notifications</li>
                      <li>✓ Business dashboard and basic reporting</li>
                    </ul>
                    <p className="mt-2 text-xs text-slate-400">Features depend on account setup and activation; marketplace exposure requires approved offerings and coverage.</p>
                  </div>
                  <div className="mt-3 flex items-start gap-3 rounded-xl border border-slate-600/50 bg-slate-800/30 p-3 text-sm text-slate-300" aria-label="SYNC AI Automate coming soon"><span aria-hidden="true">◌</span><span><strong className="text-slate-200">SYNC AI Automate · $39.99/month proposed</strong><span className="ml-2 rounded border border-slate-500 px-2 py-0.5 text-xs">Coming soon</span><span className="mt-1 block text-slate-300">Planned AI workflows, suggested replies, and follow-ups. Includes the standalone assistant when released. Not available to purchase yet.</span></span></div>
                  <div className="mt-3 rounded-xl border border-slate-700 p-3">
                    <p className="text-sm font-bold text-white">Optional business features</p>
                    <p className="mt-1 text-xs text-slate-300">Here is what we are building. Prices are proposals, not current charges. Unreleased add-ons cannot be selected or purchased.</p>
                    {BUSINESS_ADD_ONS.map(([key,label,cents,status])=>(
                      <div key={key} className="mt-2 flex items-start justify-between gap-3 rounded-lg border border-slate-700/70 bg-slate-800/20 p-3 text-sm text-slate-300" aria-label={`${label}: ${STATUS_LABEL[status]}`}>
                        <span className="min-w-0">
                          <strong className="block font-semibold text-slate-200">{label}</strong>
                          <span className="mt-1 inline-block rounded border border-slate-600 px-2 py-0.5 text-xs text-slate-300">{STATUS_LABEL[status]}</span>
                          {key==="phone" ? <span className="mt-1 block text-xs">Additional usage charges would apply if released.</span> : null}
                        </span>
                        <span className="shrink-0 text-right text-xs text-slate-200">${(cents/100).toFixed(2)}/mo<span className="block text-slate-400">proposed</span></span>
                      </div>
                    ))}
                    <p className="mt-3 text-xs leading-5 text-amber-200">AI-enabled features require hard provider-cost caps; phone and routing usage may have additional charges, disclosed before activation.</p>
                  </div>
                  <label className="mt-4 block text-sm font-semibold text-white">Access / promotional code
                    <input value={planPromo} onChange={e=>setPlanPromo(e.target.value.toUpperCase())} placeholder="Enter code (optional)" className="mt-2 h-11 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 text-white"/>
                  </label>
                  <p className="mt-2 text-xs text-slate-300">{planPromo.trim()==="SWFF26"?"SWFF26 entered: tester subscription-waiver eligibility must be confirmed by billing. The 1% platform fee still applies.":"Code is not applied or validated here. Any trial or discount must be confirmed by secure billing."}</p>
                  <div className="mt-4 border-t border-slate-700 pt-3">
                    <div className="flex justify-between text-base font-bold text-white"><span>Business base estimate</span><span>{billingCycle==="monthly"?"$19.99/mo":"$199.00/yr proposed"}</span></div>
                    <p className="mt-2 text-xs leading-5 text-amber-200">Estimate only. Coming soon and verification-pending features are excluded from totals and unavailable for purchase. Trial eligibility and add-on activation are not configured here. Checkout controls final charges, and platform transaction fees are separate.</p>
                  </div>
                </div>
              </div>
            </Card>
          ) : null}
        </div>

        <div className="sticky bottom-0 z-10 border-t border-slate-800 bg-[#020617]/96 px-6 py-5 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || saving}
              className="rounded-2xl border border-slate-800 bg-slate-950/70 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Back
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-900 disabled:opacity-50"
              >
                Cancel
              </button>

              {step < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canNext || saving}
                  className="rounded-2xl border border-cyan-400/40 bg-cyan-500/85 px-5 py-3 text-sm font-black text-black transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Next"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={saving}
                  className="rounded-2xl border border-fuchsia-400/40 bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-5 py-3 text-sm font-black text-black transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save & review billing"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}