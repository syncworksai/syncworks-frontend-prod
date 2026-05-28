// src/components/sbo/SboSetupWizard.jsx
import React, { useEffect, useMemo, useState } from "react";

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
  const steps = useMemo(
    () => [
      { key: "basics", label: "1. Business Basics" },
      { key: "area", label: "2. Service Area" },
      { key: "services", label: "3. Services" },
      { key: "goals", label: "4. Revenue + Goals" },
      { key: "finish", label: "5. Finish" },
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

  const [oldDataStatus, setOldDataStatus] = useState("LATER");
  const [baselineRevenue, setBaselineRevenue] = useState("");
  const [targetRevenue, setTargetRevenue] = useState("");

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
    setSaving(false);
    setError("");
    setWarning("");
    setSuccess("");

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

    setOldDataStatus(local.oldDataStatus || "LATER");
    setBaselineRevenue(String(local.baselineRevenue || ""));
    setTargetRevenue(String(local.targetRevenue || ""));
  }, [open, businessId, business]);

  if (!open) return null;

  function persistLocal() {
    const payload = {
      name,
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
      oldDataStatus,
      baselineRevenue,
      targetRevenue,
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
      return saveBusinessStep(servicesPayload(), "Services saved.");
    }

    if (currentStep === 3) {
      persistLocal();
      setError("");
      setWarning(
        "Revenue goals and import preference are stored locally until backend fields are added for them."
      );
      setSuccess("Revenue + goals snapshot saved.");
      return true;
    }

    return true;
  }

  async function handleNext() {
    const ok = await saveCurrentStep(step);
    if (!ok) return;
    setStep((s) => Math.min(steps.length - 1, s + 1));
  }

  async function handleFinish() {
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

    onClose?.();
  }

  const canNext =
    step === 0
      ? !!name.trim()
      : step === 1
      ? !!baseZip.trim() && !!normalizeStateCode(state).trim()
      : step === 2
      ? selectedServiceIds.length > 0
      : step === 3
      ? true
      : true;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-[2.25rem] border border-fuchsia-500/25 bg-[#020617] shadow-[0_0_80px_rgba(76,29,149,0.35)]">
        <div className="sticky top-0 z-10 border-b border-slate-800 bg-[#020617]/95 px-6 py-5 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-3xl font-black tracking-tight text-white">
                Business Setup Wizard
              </div>
              <div className="mt-1 text-sm text-slate-400">
                PowerPoint-style setup so SBOs can get market-ready fast.
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
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  label="Business Name"
                  value={name}
                  onChange={setName}
                  placeholder="Acme Plumbing"
                />
                <Input
                  label="Business Email"
                  value={businessEmail}
                  onChange={setBusinessEmail}
                  placeholder="office@acme.com"
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
              title="Services"
              subtitle="Pick broad service types. The system can still match detailed customer issues underneath them."
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
            <Card
              title="Revenue + Goals"
              subtitle="These values are saved locally right now so the setup can still feel complete."
            >
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  label="Baseline Monthly Revenue"
                  value={baselineRevenue}
                  onChange={setBaselineRevenue}
                  type="number"
                  placeholder="5000"
                />
                <Input
                  label="Target Monthly Revenue"
                  value={targetRevenue}
                  onChange={setTargetRevenue}
                  type="number"
                  placeholder="10000"
                />
              </div>

              <div className="mt-3">
                <Select
                  label="Import Old Data"
                  value={oldDataStatus}
                  onChange={setOldDataStatus}
                  options={[
                    { value: "LATER", label: "I’ll import later" },
                    { value: "YES", label: "Yes, I want to import old data" },
                    { value: "NONE", label: "No old data to import" },
                  ]}
                />
              </div>

              <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
                Revenue goals and import preference are being saved locally in the browser
                until backend fields are added for them.
              </div>
            </Card>
          ) : null}

          {step === 4 ? (
            <Card
              title="Finish Setup"
              subtitle="This business is almost ready to operate inside SyncWorks."
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl border border-fuchsia-500/25 bg-slate-950/65 p-4">
                  <div className="text-2xl font-black text-slate-100">What is saved now</div>
                  <ul className="mt-4 space-y-3 text-sm text-slate-300">
                    <li>• Business basics</li>
                    <li>• Service area</li>
                    <li>• Marketplace status</li>
                    <li>• Broad service types selected</li>
                  </ul>
                </div>

                <div className="rounded-3xl border border-cyan-500/25 bg-slate-950/65 p-4">
                  <div className="text-2xl font-black text-slate-100">Setup snapshot</div>
                  <ul className="mt-4 space-y-3 text-sm text-slate-300">
                    <li>• {selectedServiceIds.length} service type(s) selected</li>
                    <li>
                      • Baseline revenue{" "}
                      {baselineRevenue ? `$${Number(baselineRevenue || 0).toLocaleString()}` : "not set"}
                    </li>
                    <li>
                      • Revenue goal{" "}
                      {targetRevenue ? `$${Number(targetRevenue || 0).toLocaleString()}` : "not set"}
                    </li>
                    <li>• Import preference: {oldDataStatus || "LATER"}</li>
                  </ul>
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
                  {saving ? "Saving…" : "Finish Setup"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}