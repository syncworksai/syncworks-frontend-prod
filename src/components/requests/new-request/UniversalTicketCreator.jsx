// src/components/requests/new-request/UniversalTicketCreator.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api/client";
import {
  readRequestProviderPrefill,
  readSavedProviders,
  removeSavedProvider,
} from "../../../utils/savedProviders";

import RequestStepNav from "../RequestStepNav";
import RequestDetailsCard from "../RequestDetailsCard";
import RequestLocationCard from "../RequestLocationCard";

import MarketplaceSearchPanel from "./MarketplaceSearchPanel";
import {
  buildLeafCategoryIndex,
  attachResolvedCategory,
} from "./requestCategoryResolver";
import RequestPriorityCard from "./RequestPriorityCard";
import RequestScheduleCard from "./RequestScheduleCard";
import DynamicIntakeCard from "./DynamicIntakeCard";
import MarketplaceAgreementCard from "./MarketplaceAgreementCard";
import RequestReviewCard from "./RequestReviewCard";

import {
  MARKETPLACE_MODES,
  FULFILLMENT_TYPES,
  cx,
} from "./requestMarketplaceCatalog";

import {
  buildFullServiceAddress,
  buildServiceRequestPayload,
  buildStructuredIntake,
  canSubmitUniversalTicket,
  getCreatedId,
  getMissingSubmitRequirements,
  inferFulfillmentType,
  normalizeZip,
} from "./requestPayloadBuilder";

const STEPS = [
  { key: "find", label: "Find" },
  { key: "urgency", label: "Urgency" },
  { key: "location", label: "Location" },
  { key: "details", label: "Details" },
  { key: "review", label: "Review" },
];

function defaultNeededByDate() {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().slice(0, 10);
}

function defaultP4EndDate() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

function ModePill({ mode }) {
  const isBusinessInternal = mode === MARKETPLACE_MODES.BUSINESS_INTERNAL;

  return (
    <div
      className={cx(
        "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]",
        isBusinessInternal
          ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-100"
          : "border-cyan-500/30 bg-cyan-500/10 text-cyan-100"
      )}
    >
      {isBusinessInternal ? "Business Only" : "Marketplace"}
    </div>
  );
}

function FormAlert({ type = "error", children }) {
  const cls =
    type === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
      : type === "warning"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
      : "border-rose-500/30 bg-rose-500/10 text-rose-100";

  return (
    <div className={cx("rounded-2xl border px-4 py-3 text-sm", cls)}>
      {children}
    </div>
  );
}


function RequestRouteChooser({
  routeMode,
  setRouteMode,
  savedProviders,
  selectedProvider,
  onSelectProvider,
  onRemoveProvider,
}) {
  return (
    <section className="rounded-[2rem] border border-slate-800 bg-slate-950/55 p-4 md:p-5">
      <div className="text-sm font-black text-white">How should SyncWorks route this?</div>
      <div className="mt-1 text-xs leading-5 text-slate-400">
        Use the open marketplace or send the request directly to a provider you trust.
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setRouteMode("MARKETPLACE")}
          className={cx(
            "rounded-3xl border p-4 text-left transition",
            routeMode === "MARKETPLACE"
              ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-50"
              : "border-slate-800 bg-slate-950/70 text-slate-200"
          )}
        >
          <div className="text-xl">Marketplace</div>
          <div className="mt-2 text-sm font-black">Search every category</div>
          <div className="mt-1 text-xs leading-5 text-slate-400">
            Services, products, food, bookings, real estate, auto, and more.
          </div>
        </button>

        <button
          type="button"
          onClick={() => setRouteMode("SAVED_PROVIDER")}
          className={cx(
            "rounded-3xl border p-4 text-left transition",
            routeMode === "SAVED_PROVIDER"
              ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-50"
              : "border-slate-800 bg-slate-950/70 text-slate-200"
          )}
        >
          <div className="text-xl">Saved Provider</div>
          <div className="mt-2 text-sm font-black">Send a direct request</div>
          <div className="mt-1 text-xs leading-5 text-slate-400">
            Use a provider saved from a previous ticket or digital business card.
          </div>
        </button>
      </div>

      {routeMode === "SAVED_PROVIDER" ? (
        <div className="mt-4">
          {savedProviders.length ? (
            <div className="grid gap-3">
              {savedProviders.map((provider) => {
                const active = Number(selectedProvider?.id) === Number(provider.id);
                return (
                  <div
                    key={provider.id}
                    className={cx(
                      "rounded-3xl border p-3 transition",
                      active
                        ? "border-emerald-400/40 bg-emerald-500/10"
                        : "border-slate-800 bg-slate-950/65"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectProvider(provider)}
                      className="flex w-full items-center gap-3 text-left"
                    >
                      <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                        {provider.logo_url ? (
                          <img src={provider.logo_url} alt={provider.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs font-black text-slate-500">BIZ</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-black text-white">{provider.name}</div>
                        <div className="mt-1 truncate text-xs text-slate-400">
                          {[provider.city, provider.state, provider.base_zip].filter(Boolean).join(", ") || "Saved provider"}
                        </div>
                      </div>
                      <span className="text-xs font-black text-emerald-200">
                        {active ? "Selected" : "Choose"}
                      </span>
                    </button>
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onRemoveProvider(provider.id)}
                        className="text-[11px] font-semibold text-slate-500 hover:text-rose-300"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
              No providers are saved yet. Open an assigned ticket and tap Save Provider.
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function BottomActions({
  step,
  canContinue,
  selectedService,
  selectedProvider,
  routeMode,
  missing,
  submitting,
  canSubmit,
  navMessage,
  onHome,
  onBack,
  onContinue,
  onSubmit,
}) {
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-800 bg-[#020617]/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-[0_-18px_45px_rgba(0,0,0,0.45)] backdrop-blur-xl md:sticky md:bottom-3 md:rounded-3xl md:border">
      <div className="mx-auto grid max-w-4xl grid-cols-[auto_auto_1fr] items-center gap-2">
        <button type="button" onClick={onHome} className="min-h-11 rounded-2xl border border-slate-800 bg-slate-950/80 px-3 text-xs font-black text-slate-300">
          Home
        </button>
        <button type="button" onClick={onBack} disabled={step === 0} className="min-h-11 rounded-2xl border border-slate-800 bg-slate-950/80 px-3 text-xs font-black text-slate-300 disabled:opacity-35">
          Back
        </button>
        {!isLast ? (
          <button type="button" onClick={onContinue} className={cx(
            "min-h-11 rounded-2xl border px-5 text-sm font-black transition",
            canContinue
              ? "border-cyan-400/40 bg-cyan-500 text-black"
              : "border-amber-500/30 bg-amber-500/10 text-amber-100"
          )}>
            Continue
          </button>
        ) : (
          <button type="button" onClick={onSubmit} disabled={submitting} className={cx(
            "min-h-11 rounded-2xl border px-5 text-sm font-black transition",
            canSubmit
              ? "border-emerald-400/40 bg-emerald-500 text-black"
              : "border-amber-500/30 bg-amber-500/10 text-amber-100",
            submitting && "opacity-60"
          )}>
            {submitting ? "Creating..." : "Create Ticket"}
          </button>
        )}
      </div>

      <div className="mx-auto mt-2 max-w-4xl">
        {navMessage ? (
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100">
            {navMessage}
          </div>
        ) : selectedService ? (
          <div className="truncate text-center text-[11px] text-slate-500">
            {routeMode === "SAVED_PROVIDER" && selectedProvider
              ? `Direct to ${selectedProvider.name} - ${selectedService.label}`
              : `${selectedService.verticalLabel} - ${selectedService.label}`}
          </div>
        ) : null}
        {isLast && missing.length ? (
          <div className="mt-1 text-center text-[11px] text-slate-500">
            Missing: {missing.join(", ")}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function UniversalTicketCreator({
  mode = MARKETPLACE_MODES.CUSTOMER_MARKETPLACE,
  onCreated = null,
  onCancel = null,
  business = null,
  businessServiceKeys = [],
  title = "",
  subtitle = "",
}) {
  const isBusinessInternal = mode === MARKETPLACE_MODES.BUSINESS_INTERNAL;

  const [step, setStep] = useState(0);
  const initialProvider = useMemo(() => readRequestProviderPrefill(), []);
  const [savedProviders, setSavedProviders] = useState(() => readSavedProviders());
  const [routeMode, setRouteModeState] = useState(
    initialProvider ? "SAVED_PROVIDER" : "MARKETPLACE"
  );
  const [selectedProvider, setSelectedProvider] = useState(initialProvider);
  const [navMessage, setNavMessage] = useState("");

  const directProviderServiceKeys = useMemo(() => {
    if (routeMode !== "SAVED_PROVIDER" || !selectedProvider) return [];
    const values =
      selectedProvider.service_keys ||
      selectedProvider.serviceKeys ||
      selectedProvider.services ||
      selectedProvider.selected_services ||
      [];
    return Array.isArray(values)
      ? values.map((item) => String(item?.key || item?.slug || item?.name || item || "")).filter(Boolean)
      : [];
  }, [routeMode, selectedProvider]);

  const visibleServiceKeys = isBusinessInternal
    ? businessServiceKeys
    : routeMode === "SAVED_PROVIDER"
    ? directProviderServiceKeys
    : [];

  const [serviceCategories, setServiceCategories] = useState([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [categoryLoadError, setCategoryLoadError] = useState("");
  const [selectedService, setSelectedService] = useState(null);
  const [priority, setPriority] = useState("P3");

  const [fulfillmentType, setFulfillmentType] = useState("");

  const [neededByDate, setNeededByDate] = useState(() => defaultNeededByDate());
  const [preferredTimeWindow, setPreferredTimeWindow] = useState("Flexible");
  const [preferredStartDate, setPreferredStartDate] = useState("");
  const [preferredEndDate, setPreferredEndDate] = useState(() =>
    defaultP4EndDate()
  );

  const [address, setAddress] = useState("");
  const [unit, setUnit] = useState("");
  const [city, setCity] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [serviceZip, setServiceZip] = useState("");
  const [accessNotes, setAccessNotes] = useState("");

  const [details, setDetails] = useState("");
  const [bestPhone, setBestPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [paymentPreference, setPaymentPreference] = useState("quote_first");
  const [contactPreference, setContactPreference] = useState("either");

  const [dynamicIntake, setDynamicIntake] = useState({});
  const [marketplaceAgreement, setMarketplaceAgreement] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    setCategoryLoading(true);
    setCategoryLoadError("");
    api.get("/service-categories/")
      .then((response) => {
        if (!active) return;
        const data = response?.data;
        setServiceCategories(
          Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []
        );
      })
      .catch(() => {
        if (active) setCategoryLoadError("Service categories could not be loaded.");
      })
      .finally(() => {
        if (active) setCategoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function refreshSavedProviders() {
      setSavedProviders(readSavedProviders());
    }
    window.addEventListener("sw:savedProvidersChanged", refreshSavedProviders);
    return () =>
      window.removeEventListener("sw:savedProvidersChanged", refreshSavedProviders);
  }, []);

  function scrollFlowTop() {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function setRouteMode(nextMode) {
    setRouteModeState(nextMode);
    setNavMessage("");
    if (nextMode === "MARKETPLACE") {
      setSelectedProvider(null);
      setMarketplaceAgreement(false);
    }
  }

  function chooseProvider(provider) {
    setSelectedProvider(provider);
    setSelectedService(null);
    setDynamicIntake({});
    setMarketplaceAgreement(true);
    setNavMessage("");
  }

  function deleteSavedProvider(providerId) {
    const next = removeSavedProvider(providerId);
    setSavedProviders(next);
    if (Number(selectedProvider?.id) === Number(providerId)) {
      setSelectedProvider(null);
    }
  }

  const leafCategoryIndex = useMemo(
    () => buildLeafCategoryIndex(serviceCategories),
    [serviceCategories]
  );

  const resolvedFulfillmentType = useMemo(
    () => inferFulfillmentType(selectedService, fulfillmentType),
    [selectedService, fulfillmentType]
  );

  const cleanZip = normalizeZip(serviceZip);

  const fullServiceAddress = useMemo(
    () =>
      buildFullServiceAddress({
        address,
        unit,
        city,
        stateRegion,
        serviceZip,
      }),
    [address, unit, city, stateRegion, serviceZip]
  );

  const structuredIntake = useMemo(
    () =>
      buildStructuredIntake({
        mode,
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
        fulfillmentType: resolvedFulfillmentType,
        marketplaceAgreement,
        customerName,
        customerEmail,
        businessId: business?.id || business?.business_id || "",
        businessName: business?.name || business?.business_name || "",
        directProvider: routeMode === "SAVED_PROVIDER" ? selectedProvider : null,
      }),
    [
      mode,
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
      resolvedFulfillmentType,
      marketplaceAgreement,
      customerName,
      customerEmail,
      business,
      routeMode,
      selectedProvider,
    ]
  );

  const missing = useMemo(
    () =>
      getMissingSubmitRequirements({
        mode,
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
        directProvider: routeMode === "SAVED_PROVIDER" ? selectedProvider : null,
      }),
    [
      mode,
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
      routeMode,
      selectedProvider,
    ]
  );

  const canSubmit = canSubmitUniversalTicket({
    mode,
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
    directProvider: routeMode === "SAVED_PROVIDER" ? selectedProvider : null,
    submitting,
  });

  function canGoTo(nextStep) {
    if (nextStep <= step) return true;
    if (nextStep === 1) return !!selectedService && selectedService?.exactCategoryResolved !== false;
    if (nextStep === 2) return !!selectedService && !!priority;
    if (nextStep === 3) {
      return (
        !!selectedService &&
        !!priority &&
        !!address.trim() &&
        !!city.trim() &&
        !!stateRegion.trim() &&
        !!cleanZip &&
        cleanZip.length >= 5
      );
    }
    if (nextStep === 4) {
      return (
        !!selectedService &&
        !!priority &&
        !!address.trim() &&
        !!city.trim() &&
        !!stateRegion.trim() &&
        !!cleanZip &&
        cleanZip.length >= 5 &&
        !!details.trim()
      );
    }

    return true;
  }

  function canContinueCurrentStep() {
    if (step === 0) {
      if (routeMode === "SAVED_PROVIDER" && !selectedProvider) return false;
      return !!selectedService && selectedService?.exactCategoryResolved !== false;
    }
    if (step === 1) return !!priority;
    if (step === 2) {
      return (
        !!address.trim() &&
        !!city.trim() &&
        !!stateRegion.trim() &&
        !!cleanZip &&
        cleanZip.length >= 5 &&
        !!neededByDate &&
        !!preferredTimeWindow.trim()
      );
    }
    if (step === 3) return !!details.trim();
    return canSubmit;
  }

  function validationMessageForStep() {
    if (step === 0) {
      if (routeMode === "SAVED_PROVIDER" && !selectedProvider) {
        return "Choose a saved provider before continuing.";
      }
      if (!selectedService) {
        return "Choose a service, product, food option, booking, or other need before continuing.";
      }
      if (selectedService?.exactCategoryResolved === false) {
        return "Choose a more specific service that is available in the live service directory.";
      }
    }
    if (step === 1 && !priority) return "Choose the urgency or priority.";
    if (step === 2) {
      const fields = [];
      if (!address.trim()) fields.push("street address");
      if (!city.trim()) fields.push("city");
      if (!stateRegion.trim()) fields.push("state");
      if (!cleanZip || cleanZip.length < 5) fields.push("ZIP");
      if (!neededByDate) fields.push("needed-by date");
      if (!preferredTimeWindow.trim()) fields.push("time window");
      if (fields.length) return `Complete: ${fields.join(", ")}.`;
    }
    if (step === 3 && !details.trim()) {
      return "Add a short description of what you need.";
    }
    if (step === 4 && missing.length) {
      return `Complete: ${missing.join(", ")}.`;
    }
    return "";
  }

  function goToStep(nextStep) {
    setStep(Math.max(0, Math.min(STEPS.length - 1, nextStep)));
    setNavMessage("");
    scrollFlowTop();
  }

  function setGuardedStep(nextStep) {
    if (nextStep <= step || canGoTo(nextStep)) {
      goToStep(nextStep);
      return;
    }
    setNavMessage(validationMessageForStep());
  }

  function continueFlow() {
    if (!canContinueCurrentStep()) {
      setNavMessage(validationMessageForStep());
      return;
    }
    goToStep(step + 1);
  }

  function backFlow() {
    if (step > 0) goToStep(step - 1);
  }

  function homeFlow() {
    if (typeof onCancel === "function") onCancel();
  }

  function handleServiceSelect(service) {
    const resolvedService = attachResolvedCategory(service, leafCategoryIndex);
    setSelectedService(resolvedService);
    setDynamicIntake({});

    const inferred = inferFulfillmentType(resolvedService, "");
    setFulfillmentType(inferred || FULFILLMENT_TYPES.ONSITE);

    if (resolvedService?.ticketType === "FOOD") {
      setPriority("P2");
      setPaymentPreference("card");
      setPreferredTimeWindow("ASAP");
    } else if (
      resolvedService?.ticketType === "REAL_ESTATE" ||
      resolvedService?.ticketType === "BOOKING"
    ) {
      setPriority("P4");
      setPaymentPreference("quote_first");
      setPreferredTimeWindow("Flexible");
    } else if (resolvedService?.ticketType === "RETAIL") {
      setPriority("P3");
      setPaymentPreference("quote_first");
    }
  }

  async function handleSubmit() {
    if (!canSubmit) return;

    setSubmitting(true);
    setSubmitErr("");
    setSuccess("");

    const payload = buildServiceRequestPayload({
      details,
      selectedService,
      structuredIntake,
    });

    try {
      const res = await api.post("/service-requests/", payload);
      const createdId = getCreatedId(res.data);

      setSuccess(
        isBusinessInternal
          ? "Business ticket created."
          : "SyncWorks ticket created. We are routing it now."
      );

      if (typeof onCreated === "function") {
        onCreated({ id: createdId, data: res.data, payload, structuredIntake });
      }
    } catch (e) {
      const data = e?.response?.data;

      const msg =
        data?.detail ||
        data?.service_zip?.[0] ||
        data?.service_address?.[0] ||
        data?.non_field_errors?.[0] ||
        (typeof data === "string" ? data : null) ||
        e?.message ||
        "Error creating ticket.";

      setSubmitErr(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-5 pb-32 md:py-7 md:pb-7">
        <div className="mb-5 rounded-[2rem] border border-slate-800 bg-slate-950/55 p-4 shadow-[0_0_40px_rgba(15,23,42,0.45)] md:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <ModePill mode={mode} />

                {selectedService ? (
                  <div className="rounded-full border border-slate-800 bg-slate-950/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                    {selectedService.ticketType || "Ticket"}
                  </div>
                ) : null}
              </div>

              <h1 className="mt-3 text-xl font-black tracking-tight text-white md:text-3xl">
                {title ||
                  (isBusinessInternal
                    ? "Create Business Ticket"
                    : "Create SyncWorks Ticket")}
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                {subtitle ||
                  (isBusinessInternal
                    ? "Create a ticket from your business services when a customer calls in, texts, or walks in."
                    : "Search like a local marketplace. Behind the scenes, everything becomes a trackable SyncWorks ticket.")}
              </p>
            </div>

            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="shrink-0 rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-900"
              >
                Cancel
              </button>
            ) : null}
          </div>

          <div className="mt-5">
            <RequestStepNav
              step={step}
              setStep={setGuardedStep}
              steps={STEPS}
              canGoTo={canGoTo}
            />
          </div>
        </div>

        {submitErr ? <FormAlert>{submitErr}</FormAlert> : null}

        {success ? (
          <FormAlert type="success">
            {success}
          </FormAlert>
        ) : null}

        <div className="mt-5 space-y-5 pb-28 md:pb-0">
          {step === 0 ? (
            <>
              {!isBusinessInternal ? (
                <RequestRouteChooser
                  routeMode={routeMode}
                  setRouteMode={setRouteMode}
                  savedProviders={savedProviders}
                  selectedProvider={selectedProvider}
                  onSelectProvider={chooseProvider}
                  onRemoveProvider={deleteSavedProvider}
                />
              ) : null}
              {routeMode === "SAVED_PROVIDER" && selectedProvider ? (
                <div className="rounded-3xl border border-emerald-500/25 bg-emerald-500/10 p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">
                    Direct business booking
                  </div>
                  <div className="mt-1 text-sm font-black text-white">
                    Only services offered by {selectedProvider.name} are shown below.
                  </div>
                  {!directProviderServiceKeys.length ? (
                    <div className="mt-2 text-xs leading-5 text-amber-100">
                      This saved business does not have a structured service list yet. The broader catalog remains available until its Services settings are completed.
                    </div>
                  ) : null}
                </div>
              ) : null}
              <MarketplaceSearchPanel
                selectedService={selectedService}
                setSelectedService={handleServiceSelect}
                mode={mode}
                allowedServiceKeys={visibleServiceKeys}
                restrictToAllowedServices={
                  isBusinessInternal ||
                  (routeMode === "SAVED_PROVIDER" && directProviderServiceKeys.length > 0)
                }
                providerName={
                  routeMode === "SAVED_PROVIDER" ? selectedProvider?.name || "" : ""
                }
                categoryIndex={leafCategoryIndex}
                categoryLoading={categoryLoading}
                categoryLoadError={categoryLoadError}
              />
            </>
          ) : null}

          {step === 1 ? (
            <RequestPriorityCard
              priority={priority}
              setPriority={setPriority}
              selectedService={selectedService}
              mode={mode}
            />
          ) : null}

          {step === 2 ? (
            <>
              <RequestScheduleCard
                selectedService={selectedService}
                priority={priority}
                neededByDate={neededByDate}
                setNeededByDate={setNeededByDate}
                preferredTimeWindow={preferredTimeWindow}
                setPreferredTimeWindow={setPreferredTimeWindow}
                preferredStartDate={preferredStartDate}
                setPreferredStartDate={setPreferredStartDate}
                preferredEndDate={preferredEndDate}
                setPreferredEndDate={setPreferredEndDate}
                fulfillmentType={resolvedFulfillmentType}
                setFulfillmentType={setFulfillmentType}
                mode={mode}
              />

              <RequestLocationCard
                address={address}
                setAddress={setAddress}
                unit={unit}
                setUnit={setUnit}
                city={city}
                setCity={setCity}
                stateRegion={stateRegion}
                setStateRegion={setStateRegion}
                serviceZip={serviceZip}
                setServiceZip={setServiceZip}
                accessNotes={accessNotes}
                setAccessNotes={setAccessNotes}
                mode={mode}
              />
            </>
          ) : null}

          {step === 3 ? (
            <>
              <DynamicIntakeCard
                selectedService={selectedService}
                dynamicIntake={dynamicIntake}
                setDynamicIntake={setDynamicIntake}
                mode={mode}
              />

              <RequestDetailsCard
                details={details}
                setDetails={setDetails}
                paymentPreference={paymentPreference}
                setPaymentPreference={setPaymentPreference}
                contactPreference={contactPreference}
                setContactPreference={setContactPreference}
                bestPhone={bestPhone}
                setBestPhone={setBestPhone}
                customerName={customerName}
                setCustomerName={setCustomerName}
                customerEmail={customerEmail}
                setCustomerEmail={setCustomerEmail}
                mode={mode}
              />

              {routeMode !== "SAVED_PROVIDER" ? (
                <MarketplaceAgreementCard
                  marketplaceAgreement={marketplaceAgreement}
                  setMarketplaceAgreement={setMarketplaceAgreement}
                  mode={mode}
                  selectedService={selectedService}
                />
              ) : (
                <div className="rounded-3xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">
                  This request will be sent directly to {selectedProvider?.name || "your saved provider"}.
                </div>
              )}
            </>
          ) : null}

          {step === 4 ? (
            <RequestReviewCard
              selectedService={selectedService}
              priority={priority}
              fulfillmentType={resolvedFulfillmentType}
              neededByDate={neededByDate}
              preferredTimeWindow={preferredTimeWindow}
              preferredStartDate={preferredStartDate}
              preferredEndDate={preferredEndDate}
              fullServiceAddress={fullServiceAddress}
              accessNotes={accessNotes}
              details={details}
              bestPhone={bestPhone}
              contactPreference={contactPreference}
              paymentPreference={paymentPreference}
              dynamicIntake={structuredIntake.dynamic_intake}
              marketplaceAgreement={marketplaceAgreement}
              directProvider={
                routeMode === "SAVED_PROVIDER" ? selectedProvider : null
              }
              mode={mode}
            />
          ) : null}

          <BottomActions
            step={step}
            canContinue={canContinueCurrentStep()}
            selectedService={selectedService}
            selectedProvider={selectedProvider}
            routeMode={routeMode}
            missing={missing}
            submitting={submitting}
            canSubmit={canSubmit}
            navMessage={navMessage}
            onHome={homeFlow}
            onBack={backFlow}
            onContinue={continueFlow}
            onSubmit={() => {
              if (!canSubmit) {
                setNavMessage(validationMessageForStep());
                return;
              }
              handleSubmit();
            }}
          />
        </div>
      </div>
    </div>
  );
}