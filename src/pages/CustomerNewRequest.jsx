// src/pages/CustomerNewRequest.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

import RequestStepNav from "../components/requests/RequestStepNav";
import RequestDetailsCard from "../components/requests/RequestDetailsCard";
import RequestLocationCard from "../components/requests/RequestLocationCard";

function safeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.value)) return data.value;
  return [];
}

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function getId(item) {
  return item?.id ?? item?.value ?? item?.key ?? "";
}

function getParentId(item) {
  return item?.parent_id ?? item?.parent?.id ?? item?.parent ?? item?.parent_category_id ?? "";
}

function getLabel(item) {
  return item?.name || item?.label || item?.title || item?.display_name || item?.category_path || item?.path || String(getId(item) || "Service");
}

function getKeyDepth(item) {
  const key = String(item?.key || "");
  if (!key) return 0;
  return key.split("--").length - 1;
}

function uniqueById(list) {
  const seen = new Set();
  const out = [];
  (list || []).forEach((item) => {
    const id = String(getId(item) || "");
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push(item);
  });
  return out;
}

function extractZip(address) {
  const match = String(address || "").match(/\b\d{5}(?:-\d{4})?\b/);
  return match?.[0] || "";
}

function getCreatedId(data) {
  return data?.id || data?.ticket_id || data?.service_request_id || data?.request_id || data?.ticket?.id || data?.request?.id || "";
}

export default function CustomerNewRequest() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const [categories, setCategories] = useState([]);
  const [childCache, setChildCache] = useState({});
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingChildrenFor, setLoadingChildrenFor] = useState("");
  const [loadErr, setLoadErr] = useState("");

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);

  const [details, setDetails] = useState("");
  const [address, setAddress] = useState("");
  const [unit, setUnit] = useState("");
  const [accessNotes, setAccessNotes] = useState("");

  const [paymentPreference, setPaymentPreference] = useState("card");
  const [contactPreference, setContactPreference] = useState("either");
  const [bestPhone, setBestPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const [success, setSuccess] = useState("");

  async function loadCategories() {
    setLoadingCategories(true);
    setLoadErr("");
    try {
      const res = await api.get("/service-categories/");
      let list = safeList(res.data);

      if (!list.length) {
        const rootsRes = await api.get("/service-categories/roots/");
        list = safeList(rootsRes.data);
      }

      setCategories(list);
    } catch (e) {
      setCategories([]);
      setLoadErr(e?.response?.data?.detail || e?.message || "Failed to load service categories.");
    } finally {
      setLoadingCategories(false);
    }
  }

  async function loadChildren(parent) {
    const parentId = getId(parent);
    if (!parentId || childCache[String(parentId)]) return;

    setLoadingChildrenFor(String(parentId));
    try {
      const res = await api.get(`/service-categories/${parentId}/children/`);
      const list = safeList(res.data);
      setChildCache((prev) => ({ ...prev, [String(parentId)]: list }));
      if (list.length) {
        setCategories((prev) => uniqueById([...prev, ...list]));
      }
    } catch {
      setChildCache((prev) => ({ ...prev, [String(parentId)]: [] }));
    } finally {
      setLoadingChildrenFor("");
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  const rootCategories = useMemo(() => {
    const roots = categories.filter((c) => !getParentId(c));
    if (roots.length) return roots;

    const broadByDepth = categories.filter((c) => getKeyDepth(c) <= 1);
    if (broadByDepth.length) return broadByDepth;

    return categories;
  }, [categories]);

  function childrenFor(parent) {
    if (!parent) return [];
    const parentId = String(getId(parent));
    const direct = categories.filter((c) => String(getParentId(c) || "") === parentId);
    const cached = childCache[parentId] || [];
    return uniqueById([...direct, ...cached]);
  }

  const typeOptions = useMemo(() => {
    const children = childrenFor(selectedCategory);
    if (children.length) return children;
    return selectedCategory ? [selectedCategory] : [];
  }, [categories, childCache, selectedCategory]);

  const jobOptions = useMemo(() => {
    const children = childrenFor(selectedType);
    if (children.length) return children;
    return selectedType ? [selectedType] : [];
  }, [categories, childCache, selectedType]);

  function selectCategory(category) {
    setSelectedCategory(category);
    setSelectedType(null);
    setSelectedJob(null);
    loadChildren(category);
    setSubmitErr("");
  }

  function selectType(type) {
    setSelectedType(type);
    setSelectedJob(null);
    loadChildren(type);
    setSubmitErr("");
  }

  function selectJob(job) {
    setSelectedJob(job);
    setSubmitErr("");
  }

  function canGoTo(nextStep) {
    if (nextStep <= 0) return true;
    if (nextStep === 1) return !!selectedCategory;
    if (nextStep === 2) return !!selectedCategory && !!selectedType;
    if (nextStep === 3) return !!selectedCategory && !!selectedType && !!selectedJob;
    return true;
  }

  function setGuardedStep(nextStep) {
    if (nextStep <= step || canGoTo(nextStep)) setStep(nextStep);
  }

  const canSubmit = !!selectedCategory && !!selectedType && !!selectedJob && !!address.trim() && !!details.trim() && !submitting;

  function selectedSummary() {
    return [selectedCategory, selectedType, selectedJob].filter(Boolean).map(getLabel).join(" → ");
  }

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    setSubmitErr("");
    setSuccess("");

    const categoryId = getId(selectedCategory);
    const typeId = getId(selectedType);
    const jobId = getId(selectedJob);
    const title = getLabel(selectedJob);
    const serviceZip = extractZip(address);

    const structuredIntake = {
      category_id: categoryId,
      category_key: selectedCategory?.key || "",
      category_name: getLabel(selectedCategory),
      type_id: typeId,
      type_key: selectedType?.key || "",
      type_name: getLabel(selectedType),
      job_id: jobId,
      job_key: selectedJob?.key || "",
      job_name: getLabel(selectedJob),
      address: address.trim(),
      unit: unit.trim(),
      access_notes: accessNotes.trim(),
      payment_preference: paymentPreference,
      contact_preference: contactPreference,
      best_phone: bestPhone.trim(),
      is_marketplace: true,
    };

    const notes = [
      details.trim(),
      accessNotes.trim() ? `Access notes: ${accessNotes.trim()}` : "",
      unit.trim() ? `Unit / Apt: ${unit.trim()}` : "",
      bestPhone.trim() ? `Best phone: ${bestPhone.trim()}` : "",
      `Contact preference: ${contactPreference}`,
      `Payment preference: ${paymentPreference}`,
      `Service path: ${selectedSummary()}`,
      `SyncWorks Intake: ${JSON.stringify(structuredIntake)}`,
    ]
      .filter(Boolean)
      .join("\n");

    const payload = {
      category: jobId || typeId || categoryId,
      title,
      description: notes,
      service_address: [address.trim(), unit.trim()].filter(Boolean).join(" "),
      service_zip: serviceZip,
      service_radius_miles: 25,
      is_marketplace: true,
    };

    try {
      const res = await api.post("/service-requests/", payload);
      const createdId = getCreatedId(res.data);
      setSuccess("Request submitted. We are routing it to marketplace providers now.");

      window.setTimeout(() => {
        if (createdId) navigate(`/tickets/${createdId}`);
        else navigate("/customer/tickets");
      }, 700);
    } catch (e) {
      const data = e?.response?.data;
      const msg =
        data?.detail ||
        data?.non_field_errors?.[0] ||
        (typeof data === "string" ? data : null) ||
        e?.message ||
        "Error submitting request.";
      setSubmitErr(msg);
    } finally {
      setSubmitting(false);
    }
  };

  function OptionGrid({ items, selected, onSelect, emptyText, loadingText }) {
    const selectedId = String(getId(selected) || "");
    const isLoading = loadingChildrenFor && (selectedCategory || selectedType);

    if (isLoading && loadingText) {
      return <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-400">{loadingText}</div>;
    }

    if (!items.length) {
      return <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-400">{emptyText}</div>;
    }

    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const id = String(getId(item));
          const active = selectedId === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(item)}
              className={cx(
                "text-left rounded-2xl border p-4 transition bg-slate-950/70",
                active
                  ? "border-cyan-500/45 bg-cyan-500/10 shadow-[0_0_24px_rgba(34,211,238,0.12)]"
                  : "border-slate-800 hover:border-cyan-500/30 hover:bg-slate-900/60"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-100">{getLabel(item)}</div>
                  {item?.description ? <div className="mt-1 text-xs text-slate-400 line-clamp-2">{item.description}</div> : null}
                  {item?.key ? <div className="mt-2 text-[11px] font-mono text-slate-600">{item.key}</div> : null}
                </div>
                <span className={cx("text-[11px] px-2 py-1 rounded-full border", active ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-100" : "border-slate-700 bg-slate-900 text-slate-400")}>
                  {active ? "Selected" : "Pick"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  function NavButtons({ nextDisabled, onNext }) {
    return (
      <div className="flex items-center justify-between gap-3 pt-4">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-2 text-sm text-slate-300 disabled:opacity-40"
        >
          Back
        </button>
        <button
          type="button"
          disabled={nextDisabled}
          onClick={onNext}
          className={cx(
            "rounded-2xl border px-4 py-2 text-sm transition",
            nextDisabled
              ? "border-slate-800 bg-slate-900/30 text-slate-500 cursor-not-allowed"
              : "border-cyan-500/40 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25"
          )}
        >
          Next
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/55 p-5 shadow-[0_0_40px_rgba(15,23,42,0.45)]">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xl font-bold tracking-tight">New Marketplace Request</div>
              <div className="text-sm text-slate-400 mt-1">Tell SyncWorks what you need and we’ll route it to eligible providers.</div>
            </div>
            <div className="text-xs px-3 py-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/10 text-cyan-100">Marketplace</div>
          </div>

          <div className="mt-5">
            <RequestStepNav step={step} setStep={setGuardedStep} />
          </div>

          {selectedSummary() ? (
            <div className="mt-2 rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
              Selected: <span className="text-slate-200">{selectedSummary()}</span>
            </div>
          ) : null}
        </div>

        {loadErr ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{loadErr}</div> : null}
        {submitErr ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{submitErr}</div> : null}
        {success ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{success}</div> : null}

        {step === 0 && (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/55 p-5 space-y-4">
            <div>
              <div className="text-lg font-semibold text-slate-100">Choose a service category</div>
              <div className="text-sm text-slate-400 mt-1">Start with the broad area of work.</div>
            </div>
            {loadingCategories ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-400">Loading categories…</div>
            ) : (
              <OptionGrid
                items={rootCategories}
                selected={selectedCategory}
                onSelect={selectCategory}
                emptyText="No categories are available yet. Please try again later."
              />
            )}
            <NavButtons nextDisabled={!selectedCategory} onNext={() => setStep(1)} />
          </div>
        )}

        {step === 1 && (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/55 p-5 space-y-4">
            <div>
              <div className="text-lg font-semibold text-slate-100">Choose a service type</div>
              <div className="text-sm text-slate-400 mt-1">Pick the type that best matches your request.</div>
            </div>
            <OptionGrid
              items={typeOptions}
              selected={selectedType}
              onSelect={selectType}
              emptyText="No service types were found for this category."
              loadingText="Loading service types…"
            />
            <NavButtons nextDisabled={!selectedType} onNext={() => setStep(2)} />
          </div>
        )}

        {step === 2 && (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/55 p-5 space-y-4">
            <div>
              <div className="text-lg font-semibold text-slate-100">Choose the exact job</div>
              <div className="text-sm text-slate-400 mt-1">Select the closest service so providers know what to quote.</div>
            </div>
            <OptionGrid
              items={jobOptions}
              selected={selectedJob}
              onSelect={selectJob}
              emptyText="No exact jobs were found for this type."
              loadingText="Loading exact jobs…"
            />
            <NavButtons nextDisabled={!selectedJob} onNext={() => setStep(3)} />
          </div>
        )}

        {step === 3 && (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/55 p-5 space-y-6">
            <div>
              <div className="text-lg font-semibold text-slate-100">Location and details</div>
              <div className="text-sm text-slate-400 mt-1">Add enough detail for providers to respond accurately.</div>
            </div>

            <RequestLocationCard
              address={address}
              setAddress={setAddress}
              unit={unit}
              setUnit={setUnit}
              accessNotes={accessNotes}
              setAccessNotes={setAccessNotes}
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
            />

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-2 text-sm text-slate-300"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={cx(
                  "rounded-2xl px-5 py-3 text-sm font-semibold border transition",
                  canSubmit
                    ? "border-cyan-500/40 bg-cyan-500 text-black hover:bg-cyan-400"
                    : "border-slate-800 bg-slate-900/40 text-slate-500 cursor-not-allowed"
                )}
              >
                {submitting ? "Submitting…" : "Submit Request"}
              </button>
            </div>

            {!canSubmit && !submitting ? (
              <div className="text-xs text-slate-500">Select a category, type, and job, then enter an address and description to submit.</div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}