// src/components/upgrade/UpgradeShell.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import BusinessPicker from "../BusinessPicker";
import { useAuth } from "../../auth/AuthContext";

import StepStrip from "./ui/StepStrip";
import UpgradeCard from "./ui/UpgradeCard";

import Step1Business from "./steps/Step1Business";
import Step2Setup from "./steps/Step2Setup";
import Step3Billing from "./steps/Step3Billing";
import Step4Plans from "./steps/Step4Plans";

import { DEFAULT_RADIUS } from "./constants";
import { daysUntil } from "./utils";

function isLeaf(cat) {
  return !!cat?.is_leaf;
}

export default function UpgradeShell() {
  const { user, reload, activeBusinessId, setActiveBusinessId } = useAuth();

  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  // Billing status
  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Subscription status (display only)
  const [subStatus, setSubStatus] = useState(null);
  const [loadingSub, setLoadingSub] = useState(false);

  // Create Business (UI fields)
  const [newBizName, setNewBizName] = useState("");
  const [newBizEmail, setNewBizEmail] = useState("");
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newBizPhone, setNewBizPhone] = useState("");
  const [newBizLogoFile, setNewBizLogoFile] = useState(null);
  const [creatingBiz, setCreatingBiz] = useState(false);

  // Business setup
  const [savingSetup, setSavingSetup] = useState(false);
  const [baseZip, setBaseZip] = useState("");
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [acceptsMarketplace, setAcceptsMarketplace] = useState(true);

  // Promo
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);

  // Categories wizard
  const [catLoading, setCatLoading] = useState(false);
  const [catSearch, setCatSearch] = useState("");
  const [catSearchResults, setCatSearchResults] = useState([]);

  const [roots, setRoots] = useState([]);
  const [rootPick, setRootPick] = useState(null);

  const [groups, setGroups] = useState([]);
  const [groupPick, setGroupPick] = useState(null);

  const [services, setServices] = useState([]);
  const [servicesPick, setServicesPick] = useState([]);

  // id -> category object (for display)
  const [selectedLeafObjects, setSelectedLeafObjects] = useState({});

  // 0 Industry, 1 Group, 2 Services, 3 Review
  const [wizardStep, setWizardStep] = useState(0);

  const businessSelected = useMemo(() => {
    const n = parseInt(String(activeBusinessId || ""), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [activeBusinessId]);

  const billingExempt = !!status?.billing_exempt;
  const setupComplete = !!status?.stripe_setup_complete;

  function toastSuccess(s) {
    setErr("");
    setMsg(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function toastError(s) {
    setMsg("");
    setErr(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function currentProgressIndex() {
    // 0 Business, 1 Setup, 2 Billing, 3 Upgrade
    if (!businessSelected) return 0;

    const hasEmail = !!String(status?.business_email || "").trim() || !!String(newBizEmail || "").trim();
    const hasBasics = !!String(baseZip || "").trim() && Number(radius) > 0;
    const hasService = servicesPick.length > 0;

    if (!hasEmail || !hasBasics || !hasService) return 1;
    if (!billingExempt && !setupComplete) return 2;
    return 3;
  }

  async function loadBillingStatus() {
    if (!businessSelected) {
      setStatus(null);
      return;
    }
    setLoadingStatus(true);
    try {
      const res = await api.get("/billing/status/");
      setStatus(res.data);
    } catch (e) {
      setStatus(null);
      toastError(e?.response?.data?.detail || "Failed to load billing status");
    } finally {
      setLoadingStatus(false);
    }
  }

  async function loadSubscriptionStatus() {
    if (!businessSelected) {
      setSubStatus(null);
      return;
    }
    setLoadingSub(true);
    try {
      const res = await api.get("/billing/subscription/status/");
      setSubStatus(res.data);
    } catch {
      setSubStatus(null);
    } finally {
      setLoadingSub(false);
    }
  }

  async function fetchLeafLabelsByIds(ids) {
    const clean = (Array.isArray(ids) ? ids : [])
      .map((x) => parseInt(String(x), 10))
      .filter((n) => Number.isFinite(n));

    if (!clean.length) return;

    const missing = clean.filter((id) => !selectedLeafObjects?.[id]);
    if (!missing.length) return;

    try {
      const res = await api.get(`/service-categories/by-ids/?ids=${missing.join(",")}`);
      const list = Array.isArray(res.data) ? res.data : [];
      const map = {};
      list.forEach((x) => {
        if (x?.id) map[x.id] = x;
      });
      if (Object.keys(map).length) {
        setSelectedLeafObjects((prev) => ({ ...prev, ...map }));
      }
    } catch {
      // ignore
    }
  }

  async function loadBusinessDetails() {
    if (!businessSelected) return;
    try {
      const res = await api.get(`/businesses/${businessSelected}/`);
      const b = res.data || {};
      setBaseZip(b.base_zip || "");
      setRadius(b.service_radius_miles ?? DEFAULT_RADIUS);
      setAcceptsMarketplace(!!b.accepts_marketplace_tickets);

      const offered = Array.isArray(b.services_offered) ? b.services_offered : [];
      const ids = offered.map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n));
      setServicesPick(ids);

      await fetchLeafLabelsByIds(ids);
    } catch {
      // ignore
    }
  }

  async function loadRoots() {
    setCatLoading(true);
    try {
      const res = await api.get("/service-categories/roots/");
      setRoots(Array.isArray(res.data) ? res.data : []);
    } catch {
      setRoots([]);
    } finally {
      setCatLoading(false);
    }
  }

  async function loadChildren(id) {
    setCatLoading(true);
    try {
      const res = await api.get(`/service-categories/${id}/children/`);
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    } finally {
      setCatLoading(false);
    }
  }

  async function loadLeavesUnderParent(parentId) {
    setCatLoading(true);
    try {
      const res = await api.get(`/service-categories/leaves/?parent=${encodeURIComponent(parentId)}`);
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return null;
    } finally {
      setCatLoading(false);
    }
  }

  async function searchCategories(q) {
    const query = (q || "").trim();
    if (!query) {
      setCatSearchResults([]);
      return;
    }
    try {
      const res = await api.get(`/service-categories/search/?q=${encodeURIComponent(query)}`);
      const list = Array.isArray(res.data) ? res.data : [];
      setCatSearchResults(list);

      const map = {};
      list.filter(isLeaf).forEach((x) => (map[x.id] = x));
      setSelectedLeafObjects((prev) => ({ ...prev, ...map }));
    } catch {
      setCatSearchResults([]);
    }
  }

  async function refreshAll() {
    await loadRoots();
    await loadBusinessDetails();
    await loadBillingStatus();
    await loadSubscriptionStatus();
  }

  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const setup = qs.get("setup");
    const sub = qs.get("sub");

    if (setup === "success") toastSuccess("Card saved ✅ (Stripe)");
    if (setup === "cancel") toastSuccess("Card setup canceled.");

    if (sub === "success") toastSuccess("Subscription started ✅ (Stripe)");
    if (sub === "cancel") toastSuccess("Subscription checkout canceled.");

    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!businessSelected) {
      setStatus(null);
      setSubStatus(null);

      setRootPick(null);
      setGroupPick(null);
      setGroups([]);
      setServices([]);
      setWizardStep(0);
      setCatSearch("");
      setCatSearchResults([]);
      setServicesPick([]);
      setSelectedLeafObjects({});
      return;
    }

    loadBusinessDetails();
    loadBillingStatus();
    loadSubscriptionStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessSelected]);

  useEffect(() => {
    const t = setTimeout(() => searchCategories(catSearch), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catSearch]);

  useEffect(() => {
    if (servicesPick?.length) fetchLeafLabelsByIds(servicesPick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicesPick]);

  // -----------------------------
  // Actions
  // -----------------------------
  async function createBusiness() {
    setErr("");
    setMsg("");

    const name = newBizName.trim();
    const email = newBizEmail.trim();

    if (!name) return toastError("Business name is required.");
    if (!email) return toastError("Business email is required (for scheduling + Google Calendar sync).");

    setCreatingBiz(true);
    try {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("business_email", email);
      if (newOwnerName.trim()) fd.append("owner_name", newOwnerName.trim());
      if (newBizPhone.trim()) fd.append("phone", newBizPhone.trim());
      if (newBizLogoFile) fd.append("logo", newBizLogoFile);

      // defaults
      fd.append("accepts_marketplace_tickets", "true");
      fd.append("base_zip", "");
      fd.append("service_radius_miles", String(DEFAULT_RADIUS));
      fd.append("services_offered", JSON.stringify([]));

      const res = await api.post("/businesses/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const b = res.data;
      if (b?.id) {
        setActiveBusinessId(String(b.id));

        setNewBizName("");
        setNewBizEmail("");
        setNewOwnerName("");
        setNewBizPhone("");
        setNewBizLogoFile(null);

        toastSuccess("Business created ✅ Now choose your services to start getting tickets.");
        await refreshAll();
      } else {
        toastError("Business created but no ID returned.");
      }
    } catch (e) {
      const data = e?.response?.data;
      const detail = data?.detail || (typeof data === "object" ? JSON.stringify(data) : null) || "Failed to create business";
      toastError(detail);
    } finally {
      setCreatingBiz(false);
    }
  }

  async function saveBusinessSetup() {
    setErr("");
    setMsg("");

    if (!businessSelected) return toastError("Select or create a business first.");

    const z = baseZip.trim();
    if (!z) return toastError("Base ZIP is required (for routing).");
    if (z.length < 3) return toastError("Base ZIP looks too short.");
    if (!servicesPick.length) return toastError("Pick at least 1 service (leaf) so tickets can route to you.");

    setSavingSetup(true);
    try {
      await api.patch(`/businesses/${businessSelected}/`, {
        base_zip: z,
        service_radius_miles: Number(radius) || DEFAULT_RADIUS,
        accepts_marketplace_tickets: !!acceptsMarketplace,
        services_offered: servicesPick,
      });

      toastSuccess("Setup saved ✅ Your business can now receive matching tickets.");
      await refreshAll();
    } catch (e) {
      const data = e?.response?.data;
      const detail = data?.detail || (typeof data === "object" ? JSON.stringify(data) : null) || "Failed to save business settings";
      toastError(detail);
    } finally {
      setSavingSetup(false);
    }
  }

  async function setupCard() {
    setErr("");
    setMsg("");
    if (!businessSelected) return toastError("Select a business first.");

    try {
      const res = await api.post("/billing/setup-card/");
      if (res.data?.url) {
        window.location.href = res.data.url;
        return;
      }
      if (res.data?.detail) {
        toastSuccess(res.data.detail);
        await refreshAll();
        return;
      }
      toastError("No Stripe URL returned from backend.");
    } catch (e) {
      toastError(e?.response?.data?.detail || "Failed to start card setup");
    }
  }

  async function finishUpgrade() {
    setErr("");
    setMsg("");
    if (!businessSelected) return toastError("Select a business first.");

    try {
      const res = await api.post("/auth/upgrade-to-sbo/", {});
      toastSuccess(res.data?.detail || "Upgraded to SBO ✅");
      await reload();
      await refreshAll();
    } catch (e) {
      toastError(e?.response?.data?.detail || "Upgrade failed");
    }
  }

  async function applyPromo() {
    setErr("");
    setMsg("");
    if (!businessSelected) return toastError("Select a business first.");

    const code = promoCode.trim();
    if (!code) return toastError("Promo code is required.");

    setPromoLoading(true);
    try {
      const res = await api.post("/auth/upgrade-to-sbo-promo/", { code });
      setPromoCode("");
      toastSuccess(res.data?.detail || "Promo applied ✅");
      await reload();
      await refreshAll();
    } catch (e) {
      toastError(e?.response?.data?.detail || "Promo upgrade failed");
    } finally {
      setPromoLoading(false);
    }
  }

  // Wizard selection
  async function pickRoot(r) {
    setRootPick(r);
    setGroupPick(null);
    setServices([]);
    setGroups([]);
    setWizardStep(1);

    const kids = await loadChildren(r.id);
    setGroups(kids);

    const leafKids = kids.filter(isLeaf);
    if (leafKids.length && leafKids.length === kids.length) {
      setGroupPick({ id: r.id, name: r.name, key: r.key, is_leaf: false });
      setServices(leafKids);

      const map = {};
      leafKids.forEach((x) => (map[x.id] = x));
      setSelectedLeafObjects((prev) => ({ ...prev, ...map }));

      setWizardStep(2);
    }
  }

  async function pickGroup(g) {
    setGroupPick(g);
    setWizardStep(2);

    const leaves = await loadLeavesUnderParent(g.id);
    if (Array.isArray(leaves)) {
      setServices(leaves);
      const map = {};
      leaves.forEach((x) => (map[x.id] = x));
      setSelectedLeafObjects((prev) => ({ ...prev, ...map }));
      return;
    }

    const kids = await loadChildren(g.id);
    setServices(kids);

    const map = {};
    kids.filter(isLeaf).forEach((x) => (map[x.id] = x));
    setSelectedLeafObjects((prev) => ({ ...prev, ...map }));
  }

  async function drillDownParent(parent) {
    const kids = await loadChildren(parent.id);
    setServices(kids);

    const map = {};
    kids.filter(isLeaf).forEach((x) => (map[x.id] = x));
    setSelectedLeafObjects((prev) => ({ ...prev, ...map }));
  }

  function toggleLeaf(id, obj) {
    const n = parseInt(String(id), 10);
    if (!Number.isFinite(n)) return;

    if (obj) setSelectedLeafObjects((prev) => ({ ...prev, [n]: obj }));

    setServicesPick((prev) => {
      const has = prev.includes(n);
      if (has) return prev.filter((x) => x !== n);
      return [...prev, n];
    });
  }

  function removeLeaf(id) {
    const n = parseInt(String(id), 10);
    if (!Number.isFinite(n)) return;
    setServicesPick((prev) => prev.filter((x) => x !== n));
  }

  function resetWizard() {
    setRootPick(null);
    setGroupPick(null);
    setGroups([]);
    setServices([]);
    setWizardStep(0);
    setCatSearch("");
    setCatSearchResults([]);
  }

  function goReview() {
    setWizardStep(3);
  }

  const progress = currentProgressIndex();
  const hasBasics = !!String(baseZip || "").trim() && Number(radius) > 0;
  const hasServices = servicesPick.length > 0;

  const lockDate = status?.grace_until || status?.next_due_date || null;
  const lockDays = !billingExempt && !setupComplete && lockDate ? daysUntil(lockDate) : null;

  function lockCountdownLabel() {
    if (billingExempt) return "Billing exempt ✅";
    if (status?.is_locked) return "Account locked 🔒";
    if (setupComplete) return "Card on file ✅";
    if (lockDays === null) return "Card required";
    if (lockDays <= 0) return "Locks today ⚠️";
    if (lockDays === 1) return "Locks in 1 day ⚠️";
    return `Locks in ${lockDays} days ⚠️`;
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-bold tracking-tight">
              Upgrade & Billing{" "}
              <span className="text-xs ml-2 px-2 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-200">
                Setup Wizard ✨
              </span>
            </div>
            <div className="text-xs text-slate-400">Business → Setup → Billing → Upgrade.</div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <BusinessPicker />
            <button
              onClick={refreshAll}
              className="rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-xs"
              type="button"
            >
              Refresh
            </button>
            <Link
              to="/customer"
              className="rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-xs"
            >
              Back
            </Link>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 pb-4">
          <StepStrip current={progress} />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        {msg ? (
          <div className="text-sm text-emerald-200 bg-emerald-900/10 border border-emerald-800 rounded-2xl p-3 flex items-start gap-2">
            <span className="mt-[2px]">✅</span>
            <div>{msg}</div>
          </div>
        ) : null}

        {err ? (
          <div className="text-sm text-red-200 bg-red-900/10 border border-red-800 rounded-2xl p-3 flex items-start gap-2">
            <span className="mt-[2px]">⚠️</span>
            <div className="break-words whitespace-pre-wrap">{err}</div>
          </div>
        ) : null}

        <Step1Business
          businessSelected={businessSelected}
          newBizName={newBizName}
          setNewBizName={setNewBizName}
          newBizEmail={newBizEmail}
          setNewBizEmail={setNewBizEmail}
          newOwnerName={newOwnerName}
          setNewOwnerName={setNewOwnerName}
          newBizPhone={newBizPhone}
          setNewBizPhone={setNewBizPhone}
          newBizLogoFile={newBizLogoFile}
          setNewBizLogoFile={setNewBizLogoFile}
          creatingBiz={creatingBiz}
          createBusiness={createBusiness}
        />

        <Step2Setup
          businessSelected={businessSelected}
          hasBasics={hasBasics}
          hasServices={hasServices}
          baseZip={baseZip}
          setBaseZip={setBaseZip}
          radius={radius}
          setRadius={setRadius}
          acceptsMarketplace={acceptsMarketplace}
          setAcceptsMarketplace={setAcceptsMarketplace}
          savingSetup={savingSetup}
          saveBusinessSetup={saveBusinessSetup}
          loadRoots={loadRoots}
          catLoading={catLoading}
          roots={roots}
          groups={groups}
          services={services}
          rootPick={rootPick}
          groupPick={groupPick}
          wizardStep={wizardStep}
          setWizardStep={setWizardStep}
          catSearch={catSearch}
          setCatSearch={setCatSearch}
          catSearchResults={catSearchResults}
          servicesPick={servicesPick}
          setServicesPick={setServicesPick}
          selectedLeafObjects={selectedLeafObjects}
          setSelectedLeafObjects={setSelectedLeafObjects}
          pickRoot={pickRoot}
          pickGroup={pickGroup}
          drillDownParent={drillDownParent}
          toggleLeaf={toggleLeaf}
          removeLeaf={removeLeaf}
          resetWizard={resetWizard}
          goReview={goReview}
        />

        <Step3Billing
          status={status}
          subStatus={subStatus}
          billingExempt={billingExempt}
          setupComplete={setupComplete}
          businessSelected={businessSelected}
          lockCountdownLabel={lockCountdownLabel}
          loadingStatus={loadingStatus}
          loadingSub={loadingSub}
          loadBillingStatus={loadBillingStatus}
          loadSubscriptionStatus={loadSubscriptionStatus}
          setupCard={setupCard}
          promoCode={promoCode}
          setPromoCode={setPromoCode}
          promoLoading={promoLoading}
          applyPromo={applyPromo}
        />

        <Step4Plans
          user={user}
          businessSelected={businessSelected}
          finishUpgrade={finishUpgrade}
        />

        {/* Small dev note card so you remember where to extend later */}
        <UpgradeCard
          title="Next: Add-ons (Finance / Fitness) 🔧"
          subtitle="We can surface them now as add-ons and plug into Stripe when ready."
          badge="Coming soon"
        >
          <div className="text-sm text-slate-300 leading-relaxed">
            Right now: Step 4 shows add-ons as <span className="text-slate-100 font-semibold">Coming Soon</span>.
            When you’re ready, we’ll wire a backend endpoint like:
            <div className="mt-2 text-xs text-slate-400 font-mono">
              POST /billing/addons/finance/checkout/ <br />
              POST /billing/addons/fitness/checkout/
            </div>
          </div>
        </UpgradeCard>
      </main>
    </div>
  );
}