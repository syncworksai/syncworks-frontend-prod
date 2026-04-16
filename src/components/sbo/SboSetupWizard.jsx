import React, { useEffect, useMemo, useRef, useState } from "react";
import Button from "../ui/Button";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function norm(s) {
  return String(s || "").toLowerCase().trim();
}

function uniqNums(list) {
  return Array.from(new Set((list || []).map((x) => Number(x)).filter(Boolean)));
}

function Input({ label, value, onChange, placeholder = "", type = "text", hint = "" }) {
  return (
    <label className="block">
      <div className="text-xs text-slate-300 mb-1">{label}</div>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-500/40"
      />
      {hint ? <div className="text-[11px] text-slate-500 mt-1">{hint}</div> : null}
    </label>
  );
}

function Textarea({ label, value, onChange, placeholder = "", hint = "" }) {
  return (
    <label className="block">
      <div className="text-xs text-slate-300 mb-1">{label}</div>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-500/40"
      />
      {hint ? <div className="text-[11px] text-slate-500 mt-1">{hint}</div> : null}
    </label>
  );
}

function Select({ label, value, onChange, options = [], hint = "" }) {
  return (
    <label className="block">
      <div className="text-xs text-slate-300 mb-1">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-500/40"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-slate-950 text-slate-100">
            {opt.label}
          </option>
        ))}
      </select>
      {hint ? <div className="text-[11px] text-slate-500 mt-1">{hint}</div> : null}
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
          ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-100"
          : "border-slate-800 bg-slate-950/60 text-slate-100 hover:bg-slate-900/40"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{label}</div>
          {hint ? <div className="text-[11px] text-slate-400 mt-1">{hint}</div> : null}
        </div>
        <div className="text-[11px]">{checked ? "ON" : "OFF"}</div>
      </div>
    </button>
  );
}

function StepCard({ title, subtitle, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-5">
      <div className="font-semibold text-slate-100">{title}</div>
      {subtitle ? <div className="text-xs text-slate-400 mt-1">{subtitle}</div> : null}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function getLeafCategories(categories) {
  const list = Array.isArray(categories) ? categories : [];
  const parentIds = new Set(list.map((x) => Number(x?.parent_id)).filter(Boolean));
  return list.filter((x) => !parentIds.has(Number(x.id)));
}

function buildPath(cat, all) {
  if (!cat) return "";
  const byId = new Map((all || []).map((x) => [Number(x.id), x]));
  const parts = [];
  let cur = cat;
  let guard = 0;
  while (cur && guard < 20) {
    parts.unshift(cur.name);
    cur = cur.parent_id ? byId.get(Number(cur.parent_id)) : null;
    guard += 1;
  }
  return parts.join(" → ");
}

function storageKey(businessId) {
  return `sw_setup_baseline_v1_${businessId || "no_biz"}`;
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
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [localErr, setLocalErr] = useState("");
  const [softWarn, setSoftWarn] = useState("");

  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [servicesText, setServicesText] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");

  const [businessPresenceMode, setBusinessPresenceMode] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [baseZip, setBaseZip] = useState("");
  const [radius, setRadius] = useState("25");
  const [acceptsMarketplace, setAcceptsMarketplace] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedServices, setSelectedServices] = useState([]);

  const [baselineRevenue, setBaselineRevenue] = useState("");
  const [targetRevenue, setTargetRevenue] = useState("");
  const [clientBase, setClientBase] = useState("");
  const [mainGoal, setMainGoal] = useState("");
  const [oldDataStatus, setOldDataStatus] = useState("LATER");

  const leafCategories = useMemo(() => getLeafCategories(categories), [categories]);

  const filteredServices = useMemo(() => {
    const q = norm(search);
    const list = leafCategories.map((c) => ({
      ...c,
      path: buildPath(c, categories),
    }));
    if (!q) return list.slice(0, 30);
    return list.filter((c) => norm(`${c.name} ${c.key} ${c.path}`).includes(q)).slice(0, 40);
  }, [search, leafCategories, categories]);

  const initKeyRef = useRef("");

  function hydrateFromPropsAndLocal() {
    setName(business?.name || "");
    setHeadline(business?.headline || "");
    setServicesText(business?.services_text || "");
    setPhone(business?.phone || "");
    setWebsite(business?.website || "");

    setBusinessPresenceMode(business?.business_presence_mode || "");
    setAddress(business?.address || "");
    setCity(business?.city || "");
    setState(business?.state || "");
    setBaseZip(business?.base_zip || "");
    setRadius(String(business?.service_radius_miles ?? business?.effective_service_radius_miles ?? 25));
    setAcceptsMarketplace(!!business?.accepts_marketplace_tickets);

    const svc = Array.isArray(business?.services_offered) ? business.services_offered : [];
    setSelectedServices(uniqNums(svc.map((x) => (typeof x === "number" ? x : x?.id))));

    try {
      const saved = JSON.parse(localStorage.getItem(storageKey(businessId)) || "{}");
      setBaselineRevenue(String(saved?.baselineRevenue || ""));
      setTargetRevenue(String(saved?.targetRevenue || ""));
      setClientBase(String(saved?.clientBase || ""));
      setMainGoal(String(saved?.mainGoal || ""));
      setOldDataStatus(String(saved?.oldDataStatus || "LATER"));

      if (Array.isArray(saved?.selectedServices) && saved.selectedServices.length) {
        setSelectedServices(uniqNums(saved.selectedServices));
      }

      if (!business?.name && saved?.name) setName(String(saved.name || ""));
      if (!business?.headline && saved?.headline) setHeadline(String(saved.headline || ""));
      if (!business?.services_text && saved?.servicesText) setServicesText(String(saved.servicesText || ""));
      if (!business?.phone && saved?.phone) setPhone(String(saved.phone || ""));
      if (!business?.website && saved?.website) setWebsite(String(saved.website || ""));

      if (!business?.business_presence_mode && saved?.businessPresenceMode) setBusinessPresenceMode(String(saved.businessPresenceMode || ""));
      if (!business?.address && saved?.address) setAddress(String(saved.address || ""));
      if (!business?.city && saved?.city) setCity(String(saved.city || ""));
      if (!business?.state && saved?.state) setState(String(saved.state || ""));
      if (!business?.base_zip && saved?.baseZip) setBaseZip(String(saved.baseZip || ""));
      if (!business?.service_radius_miles && saved?.radius) setRadius(String(saved.radius || "25"));
      if (typeof saved?.acceptsMarketplace === "boolean") setAcceptsMarketplace(!!saved.acceptsMarketplace);
    } catch {
      setBaselineRevenue("");
      setTargetRevenue("");
      setClientBase("");
      setMainGoal("");
      setOldDataStatus("LATER");
    }

    setLocalErr("");
    setSoftWarn("");
    setSaving(false);
    setStep(0);
  }

  useEffect(() => {
    if (!open) {
      initKeyRef.current = "";
      return;
    }

    const initKey = `${businessId || "no_biz"}::open`;
    if (initKeyRef.current === initKey) return;

    initKeyRef.current = initKey;
    hydrateFromPropsAndLocal();
    // intentionally not depending on business object changes while open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, businessId]);

  if (!open) return null;

  function persistLocal(partial = {}) {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey(businessId)) || "{}");
      localStorage.setItem(
        storageKey(businessId),
        JSON.stringify({
          ...saved,
          ...partial,
        })
      );
    } catch {
      localStorage.setItem(storageKey(businessId), JSON.stringify(partial));
    }
  }

  function toggleService(id) {
    const nid = Number(id);
    setSelectedServices((prev) => {
      const s = new Set(prev);
      if (s.has(nid)) s.delete(nid);
      else s.add(nid);
      return Array.from(s);
    });
  }

  async function backgroundSaveBusiness(payload) {
    if (!onSaveBusiness) return;

    setSaving(true);
    try {
      await onSaveBusiness(payload);
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        (typeof e?.response?.data === "string" ? e.response.data : "") ||
        "Some fields could not be saved to the backend yet. Your setup still continued locally.";
      setSoftWarn(msg);
    } finally {
      setSaving(false);
    }
  }

  function saveStepLocally(currentStep) {
    if (currentStep === 0) {
      persistLocal({
        name: String(name || "").trim(),
        headline: String(headline || "").trim(),
        servicesText: String(servicesText || "").trim(),
        phone: String(phone || "").trim(),
        website: String(website || "").trim(),
      });
      return;
    }

    if (currentStep === 1) {
      persistLocal({
        businessPresenceMode: String(businessPresenceMode || "").trim(),
        address: String(address || "").trim(),
        city: String(city || "").trim(),
        state: String(state || "").trim().toUpperCase(),
        baseZip: String(baseZip || "").trim(),
        radius: String(radius || "0"),
        acceptsMarketplace: !!acceptsMarketplace,
      });
      return;
    }

    if (currentStep === 2) {
      persistLocal({
        selectedServices,
      });
      return;
    }

    if (currentStep === 3) {
      persistLocal({
        baselineRevenue,
        targetRevenue,
        clientBase,
        mainGoal,
        oldDataStatus,
      });
    }
  }

  function buildBusinessPayloadForStep(currentStep) {
    if (currentStep === 0) {
      return {
        name: String(name || "").trim(),
        headline: String(headline || "").trim(),
        services_text: String(servicesText || "").trim(),
        phone: String(phone || "").trim(),
        website: String(website || "").trim(),
      };
    }

    if (currentStep === 1) {
      return {
        address: String(address || "").trim(),
        city: String(city || "").trim(),
        state: String(state || "").trim().toUpperCase(),
        base_zip: String(baseZip || "").trim(),
        service_radius_miles: Number(radius || 0),
        business_presence_mode: String(businessPresenceMode || "").trim(),
        accepts_marketplace_tickets: !!acceptsMarketplace,
      };
    }

    return null;
  }

  function handleNext() {
    setLocalErr("");
    const currentStep = step;

    saveStepLocally(currentStep);

    if (currentStep < 4) {
      setStep(currentStep + 1);
    } else {
      setSaving(true);
      Promise.resolve(onDone?.())
        .catch(() => {
          setSoftWarn("Setup finished, but the final refresh did not complete.");
        })
        .finally(() => {
          setSaving(false);
          onClose?.();
        });
      return;
    }

    const payload = buildBusinessPayloadForStep(currentStep);
    if (payload) {
      backgroundSaveBusiness(payload);
    }
  }

  function handleBack() {
    if (step <= 0) return;
    setStep((s) => s - 1);
  }

  const steps = [
    "Business Basics",
    "Service Area",
    "Services",
    "Revenue + Goals",
    "Finish",
  ];

  return (
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl rounded-3xl border border-slate-800 bg-[#020617] shadow-[0_0_90px_rgba(0,0,0,0.55)] p-6 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.08),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(217,70,239,0.08),transparent_24%)]" />
          <div className="relative">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="text-lg font-extrabold text-slate-100">Business Setup Wizard</div>
                <div className="text-xs text-slate-400 mt-1">
                  PowerPoint-style setup so SBOs can get market-ready fast.
                </div>
              </div>
              <Button tone="slate" onClick={onClose}>
                Close
              </Button>
            </div>

            <div className="mt-4 flex gap-2 flex-wrap">
              {steps.map((label, idx) => (
                <div
                  key={label}
                  className={cx(
                    "text-[11px] px-3 py-1.5 rounded-full border",
                    idx === step
                      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
                      : idx < step
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                      : "border-slate-800 bg-slate-950/55 text-slate-300"
                  )}
                >
                  {idx + 1}. {label}
                </div>
              ))}
            </div>

            {localErr ? (
              <div className="mt-4 text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-2xl p-3">
                {localErr}
              </div>
            ) : null}

            {softWarn ? (
              <div className="mt-4 text-sm text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3">
                {softWarn}
              </div>
            ) : null}

            <div className="mt-5">
              {step === 0 ? (
                <StepCard
                  title="Business Basics"
                  subtitle="Start with the core identity and what this business actually does."
                >
                  <div className="grid md:grid-cols-2 gap-3">
                    <Input label="Business Name" value={name} onChange={setName} placeholder="Acme Plumbing" />
                    <Input label="Phone" value={phone} onChange={setPhone} placeholder="334-555-1212" />
                    <Input label="Website" value={website} onChange={setWebsite} placeholder="https://acme.com" />
                    <Input
                      label="Headline"
                      value={headline}
                      onChange={setHeadline}
                      placeholder="Fast plumbing service for homes and small businesses"
                    />
                  </div>

                  <div className="mt-3">
                    <Textarea
                      label="Services Summary"
                      value={servicesText}
                      onChange={setServicesText}
                      placeholder="Water heaters, leak repair, drain cleaning, fixture installs..."
                    />
                  </div>
                </StepCard>
              ) : null}

              {step === 1 ? (
                <StepCard
                  title="Service Area"
                  subtitle="This determines who gets matched to this business in marketplace."
                >
                  <div className="grid md:grid-cols-2 gap-3">
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
                    <Input label="Street Address" value={address} onChange={setAddress} placeholder="123 Main St" />
                    <Input label="City" value={city} onChange={setCity} placeholder="Montgomery" />
                    <Input label="State" value={state} onChange={setState} placeholder="AL" />
                    <Input label="Base ZIP" value={baseZip} onChange={setBaseZip} placeholder="36117" />
                    <Input label="Radius (miles)" value={radius} onChange={setRadius} type="number" placeholder="25" />
                  </div>

                  <div className="mt-3">
                    <Toggle
                      label="Accept Marketplace Jobs"
                      checked={acceptsMarketplace}
                      onChange={setAcceptsMarketplace}
                      hint="If off, this business will not receive marketplace tickets even if tags and ZIP match."
                    />
                  </div>
                </StepCard>
              ) : null}

              {step === 2 ? (
                <StepCard
                  title="Service Categories"
                  subtitle="Choose the exact services this business should be matched for. Saved locally for now so setup never blocks."
                >
                  <Input
                    label="Search Services"
                    value={search}
                    onChange={setSearch}
                    placeholder="plumbing, laptop repair, wedding photography..."
                  />

                  <div className="mt-4 grid lg:grid-cols-[1fr_320px] gap-4">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3 max-h-[420px] overflow-auto space-y-2">
                      {filteredServices.length ? (
                        filteredServices.map((item) => {
                          const active = selectedServices.includes(Number(item.id));
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => toggleService(item.id)}
                              className={cx(
                                "w-full text-left rounded-2xl border p-3 transition",
                                active
                                  ? "border-cyan-500/25 bg-cyan-500/10"
                                  : "border-slate-800 bg-slate-950/70 hover:bg-slate-900/50"
                              )}
                            >
                              <div className="text-sm font-semibold text-slate-100">
                                {active ? "✓ " : ""}{item.name}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-1">{item.path}</div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="text-sm text-slate-400">No matching services.</div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
                      <div className="text-sm font-semibold text-slate-100">Selected Services</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {selectedServices.length} selected
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedServices.length ? (
                          selectedServices.map((id) => {
                            const found = leafCategories.find((x) => Number(x.id) === Number(id));
                            if (!found) return null;
                            return (
                              <button
                                key={id}
                                type="button"
                                onClick={() => toggleService(id)}
                                className="text-[11px] px-3 py-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/10 text-cyan-100"
                              >
                                {found.name} ✕
                              </button>
                            );
                          })
                        ) : (
                          <div className="text-sm text-slate-400">No services selected yet.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </StepCard>
              ) : null}

              {step === 3 ? (
                <StepCard
                  title="Revenue + Goals"
                  subtitle="Stored locally for now until backend baseline fields are wired."
                >
                  <div className="grid md:grid-cols-2 gap-3">
                    <Input
                      label="Current Monthly Revenue"
                      value={baselineRevenue}
                      onChange={setBaselineRevenue}
                      placeholder="2500"
                      type="number"
                      hint="Used as the before-SyncWorks baseline."
                    />
                    <Input
                      label="Target Monthly Revenue"
                      value={targetRevenue}
                      onChange={setTargetRevenue}
                      placeholder="5000"
                      type="number"
                      hint="Used for growth and goal tracking."
                    />
                  </div>

                  <div className="mt-3 grid gap-3">
                    <Textarea
                      label="Client Base"
                      value={clientBase}
                      onChange={setClientBase}
                      placeholder="Mostly homeowners in Montgomery, some property managers, a few repeat business clients..."
                    />
                    <Textarea
                      label="Main Goal"
                      value={mainGoal}
                      onChange={setMainGoal}
                      placeholder="Get more recurring customers, improve invoice follow-up, increase monthly revenue..."
                    />
                  </div>

                  <div className="mt-3">
                    <Select
                      label="Old Data / Ticket Import"
                      value={oldDataStatus}
                      onChange={setOldDataStatus}
                      options={[
                        { value: "NOW", label: "I want to import old tickets/data now" },
                        { value: "LATER", label: "I want to do that later" },
                        { value: "NONE", label: "I do not have old data to import" },
                      ]}
                      hint="We’ll use this later for import/export workflow."
                    />
                  </div>
                </StepCard>
              ) : null}

              {step === 4 ? (
                <StepCard
                  title="Finish Setup"
                  subtitle="This business is almost ready to operate inside SyncWorks."
                >
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
                      <div className="text-sm font-semibold text-slate-100">What is saved now</div>
                      <div className="mt-3 space-y-2 text-sm text-slate-300">
                        <div>• Business basics</div>
                        <div>• Service area</div>
                        <div>• Marketplace status</div>
                        <div>• Service categories saved locally</div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
                      <div className="text-sm font-semibold text-slate-100">What is stored locally for now</div>
                      <div className="mt-3 space-y-2 text-sm text-slate-300">
                        <div>• Baseline revenue</div>
                        <div>• Revenue goal</div>
                        <div>• Client base notes</div>
                        <div>• Main goal</div>
                        <div>• Old data import preference</div>
                      </div>
                    </div>
                  </div>
                </StepCard>
              ) : null}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <Button tone="slate" onClick={handleBack} disabled={step === 0}>
                Back
              </Button>

              <div className="flex items-center gap-2">
                <Button tone="slate" onClick={onClose}>
                  Cancel
                </Button>
                <Button tone="cyan" onClick={handleNext}>
                  {saving ? "Saving in background…" : step === 4 ? "Finish Setup" : "Next"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}