import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import ModeBar from "../components/ModeBar";
import Button from "../components/ui/Button";
import BusinessPicker from "../components/BusinessPicker";
import SboSetupWizard from "../components/sbo/SboSetupWizard";

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

function Card({ title, subtitle, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="font-semibold text-slate-100">{title}</div>
          {subtitle ? <div className="text-xs text-slate-400 mt-1">{subtitle}</div> : null}
        </div>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder = "", type = "text" }) {
  return (
    <label className="block">
      <div className="text-xs text-slate-300 mb-1">{label}</div>
      <input
        value={value}
        type={type}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-500/40"
      />
    </label>
  );
}

function Textarea({ label, value, onChange, placeholder = "" }) {
  return (
    <label className="block">
      <div className="text-xs text-slate-300 mb-1">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-500/40"
      />
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

function Select({ label, value, onChange, options = [] }) {
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
    </label>
  );
}

function SectionPill({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "text-xs rounded-2xl px-3 py-2 border transition",
        active
          ? "bg-cyan-500/15 border-cyan-500/35 text-cyan-200"
          : "bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40 text-slate-200"
      )}
    >
      {children}
    </button>
  );
}

function setupStorageKey(businessId) {
  return `sw_setup_baseline_v1_${businessId || "no_biz"}`;
}

export default function SboSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeBusinessId, reloadBusinesses } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [section, setSection] = useState("profile");

  const [business, setBusiness] = useState(null);
  const [categories, setCategories] = useState([]);

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

  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [googleBusinessUrl, setGoogleBusinessUrl] = useState("");

  const localSetup = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(setupStorageKey(activeBusinessId)) || "{}");
    } catch {
      return {};
    }
  }, [activeBusinessId, ok, wizardOpen]);

  const selectedServicesCount = Array.isArray(localSetup?.selectedServices)
    ? localSetup.selectedServices.length
    : 0;

  const returnTo = useMemo(() => {
    const qs = new URLSearchParams(location.search || "");
    const r = (qs.get("return") || "").trim();
    return r && r.startsWith("/") ? r : "/sbo";
  }, [location.search]);

  async function loadAll() {
    if (!activeBusinessId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr("");

    try {
      const [bizRes, catRes] = await Promise.all([
        api.get(`/businesses/${activeBusinessId}/`),
        api.get("/service-categories/", { params: { page_size: 300 } }),
      ]);

      const biz = bizRes?.data || null;
      const cats = safeList(catRes?.data);

      setBusiness(biz);
      setCategories(cats);

      setName(biz?.name || "");
      setBusinessEmail(biz?.business_email || "");
      setOwnerName(biz?.owner_name || "");
      setPhone(biz?.phone || "");
      setWebsite(biz?.website || "");
      setHeadline(biz?.headline || "");
      setServicesText(biz?.services_text || "");

      setAddress(biz?.address || "");
      setCity(biz?.city || "");
      setState(biz?.state || "");
      setBaseZip(biz?.base_zip || "");
      setRadius(String(biz?.service_radius_miles ?? biz?.effective_service_radius_miles ?? 25));
      setBusinessPresenceMode(biz?.business_presence_mode || "");
      setAcceptsMarketplace(!!biz?.accepts_marketplace_tickets);

      setFacebookUrl(biz?.facebook_url || "");
      setInstagramUrl(biz?.instagram_url || "");
      setLinkedinUrl(biz?.linkedin_url || "");
      setGoogleBusinessUrl(biz?.google_business_url || "");
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBusinessId]);

  useEffect(() => {
    const qs = new URLSearchParams(location.search || "");
    if (qs.get("setup") === "1") {
      setWizardOpen(true);
      setSection("setup");
    }
  }, [location.search]);

  useEffect(() => {
    if (location.hash === "#export") {
      setSection("data");
    }
  }, [location.hash]);

  async function saveBusiness(payload) {
    if (!activeBusinessId) return;
    setSaving(true);
    setErr("");
    setOk("");
    try {
      await api.patch(`/businesses/${activeBusinessId}/`, payload);
      const refreshed = await api.get(`/businesses/${activeBusinessId}/`);
      setBusiness(refreshed?.data || null);
      setOk("Saved.");
      await reloadBusinesses?.();
    } catch (e) {
      setErr(e?.response?.data?.detail || JSON.stringify(e?.response?.data || {}) || "Save failed.");
      throw e;
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile() {
    await saveBusiness({
      name,
      business_email: businessEmail,
      owner_name: ownerName,
      phone,
      website,
      headline,
      services_text: servicesText,
      address,
      city,
      state: String(state || "").toUpperCase(),
      base_zip: baseZip,
      service_radius_miles: Number(radius || 0),
      business_presence_mode: businessPresenceMode,
      accepts_marketplace_tickets: !!acceptsMarketplace,
      facebook_url: facebookUrl,
      instagram_url: instagramUrl,
      linkedin_url: linkedinUrl,
      google_business_url: googleBusinessUrl,
    });
  }

  const importReady = !!localSetup?.oldDataStatus && localSetup.oldDataStatus !== "NONE";
  const baselineReady = !!localSetup?.baselineRevenue;
  const goalReady = !!localSetup?.targetRevenue;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="SBO Settings"
        subtitle="Setup first, refine later"
        rightActions={
          <div className="flex gap-2 flex-wrap">
            <BusinessPicker />
            <Button tone="slate" onClick={() => navigate(returnTo)}>
              Back
            </Button>
            <Button tone="fuchsia" onClick={() => setWizardOpen(true)}>
              Open Setup Flow
            </Button>
          </div>
        }
      />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {err ? (
          <div className="text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-2xl p-3">
            {err}
          </div>
        ) : null}

        {ok ? (
          <div className="text-sm text-emerald-200 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3">
            {ok}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5 text-sm text-slate-400">
            Loading settings…
          </div>
        ) : null}

        <div className="flex gap-2 flex-wrap">
          <SectionPill active={section === "setup"} onClick={() => setSection("setup")}>
            Setup
          </SectionPill>
          <SectionPill active={section === "profile"} onClick={() => setSection("profile")}>
            Profile
          </SectionPill>
          <SectionPill active={section === "marketplace"} onClick={() => setSection("marketplace")}>
            Marketplace
          </SectionPill>
          <SectionPill active={section === "socials"} onClick={() => setSection("socials")}>
            Socials
          </SectionPill>
          <SectionPill active={section === "data"} onClick={() => setSection("data")}>
            Import / Export
          </SectionPill>
        </div>

        {section === "setup" ? (
          <Card
            title="Guided Setup"
            subtitle="Best for new SBOs. Walk through business basics, service area, services, and revenue goals."
            right={
              <Button tone="cyan" onClick={() => setWizardOpen(true)}>
                Launch Wizard
              </Button>
            }
          >
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
                <div className="text-xs text-slate-400">Business</div>
                <div className="mt-1 text-sm font-semibold text-slate-100">{business?.name || "—"}</div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
                <div className="text-xs text-slate-400">ZIP</div>
                <div className="mt-1 text-sm font-semibold text-slate-100">{business?.base_zip || "—"}</div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
                <div className="text-xs text-slate-400">Radius</div>
                <div className="mt-1 text-sm font-semibold text-slate-100">
                  {business?.service_radius_miles ?? business?.effective_service_radius_miles ?? "—"}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
                <div className="text-xs text-slate-400">Marketplace</div>
                <div className="mt-1 text-sm font-semibold text-slate-100">
                  {business?.accepts_marketplace_tickets ? "On" : "Off"}
                </div>
              </div>
            </div>

            <div className="mt-4 grid md:grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                <div className="text-xs text-slate-400">Selected Services</div>
                <div className="mt-1 text-sm font-semibold text-cyan-100">{selectedServicesCount}</div>
              </div>

              <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-4">
                <div className="text-xs text-slate-400">Baseline Revenue</div>
                <div className="mt-1 text-sm font-semibold text-fuchsia-100">
                  {baselineReady ? `$${Number(localSetup.baselineRevenue || 0).toLocaleString()}` : "Not set"}
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="text-xs text-slate-400">Revenue Goal</div>
                <div className="mt-1 text-sm font-semibold text-emerald-100">
                  {goalReady ? `$${Number(localSetup.targetRevenue || 0).toLocaleString()}` : "Not set"}
                </div>
              </div>

              <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4">
                <div className="text-xs text-slate-400">Import Preference</div>
                <div className="mt-1 text-sm font-semibold text-indigo-100">
                  {importReady ? "Ready later" : "Not chosen"}
                </div>
              </div>
            </div>

            <div className="mt-4 text-sm text-slate-300">
              This setup flow is meant to feel like a slide deck, not a giant form wall.
            </div>
          </Card>
        ) : null}

        {section === "profile" ? (
          <Card
            title="Business Profile"
            subtitle="Edit the core business information customers and marketplace routing use."
            right={
              <Button tone="cyan" onClick={saveProfile} disabled={saving}>
                {saving ? "Saving…" : "Save Profile"}
              </Button>
            }
          >
            <div className="grid md:grid-cols-2 gap-3">
              <Input label="Business Name" value={name} onChange={setName} placeholder="Acme Plumbing" />
              <Input label="Business Email" value={businessEmail} onChange={setBusinessEmail} placeholder="office@acme.com" />
              <Input label="Owner / Contact Name" value={ownerName} onChange={setOwnerName} placeholder="Jacob Lord" />
              <Input label="Phone" value={phone} onChange={setPhone} placeholder="334-555-1212" />
              <Input label="Website" value={website} onChange={setWebsite} placeholder="https://acme.com" />
              <Input label="Headline" value={headline} onChange={setHeadline} placeholder="Fast, reliable service" />
            </div>

            <div className="mt-3">
              <Textarea
                label="Services Summary"
                value={servicesText}
                onChange={setServicesText}
                placeholder="Repairs, installs, diagnostics, recurring service..."
              />
            </div>
          </Card>
        ) : null}

        {section === "marketplace" ? (
          <Card
            title="Marketplace"
            subtitle="Routing and discovery controls for new jobs."
            right={
              <Button tone="cyan" onClick={saveProfile} disabled={saving}>
                {saving ? "Saving…" : "Save Marketplace"}
              </Button>
            }
          >
            <div className="grid md:grid-cols-2 gap-3">
              <Input label="Street Address" value={address} onChange={setAddress} placeholder="123 Main St" />
              <Input label="City" value={city} onChange={setCity} placeholder="Montgomery" />
              <Input label="State" value={state} onChange={setState} placeholder="AL" />
              <Input label="Base ZIP" value={baseZip} onChange={setBaseZip} placeholder="36117" />
              <Input label="Radius (miles)" value={radius} onChange={setRadius} type="number" placeholder="25" />

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

            <div className="mt-3">
              <Toggle
                label="Accept Marketplace Tickets"
                checked={acceptsMarketplace}
                onChange={setAcceptsMarketplace}
                hint="If off, the business won’t receive open marketplace jobs."
              />
            </div>

            <div className="mt-4">
              <Button tone="fuchsia" onClick={() => setWizardOpen(true)}>
                Launch Guided Setup
              </Button>
            </div>
          </Card>
        ) : null}

        {section === "socials" ? (
          <Card
            title="Social Links"
            subtitle="These support the business card and future social automation flows."
            right={
              <Button tone="cyan" onClick={saveProfile} disabled={saving}>
                {saving ? "Saving…" : "Save Socials"}
              </Button>
            }
          >
            <div className="grid md:grid-cols-2 gap-3">
              <Input label="Facebook URL" value={facebookUrl} onChange={setFacebookUrl} placeholder="https://facebook.com/yourbusiness" />
              <Input label="Instagram URL" value={instagramUrl} onChange={setInstagramUrl} placeholder="https://instagram.com/yourbusiness" />
              <Input label="LinkedIn URL" value={linkedinUrl} onChange={setLinkedinUrl} placeholder="https://linkedin.com/company/yourbusiness" />
              <Input label="Google Business URL" value={googleBusinessUrl} onChange={setGoogleBusinessUrl} placeholder="https://g.page/yourbusiness" />
            </div>
          </Card>
        ) : null}

        {section === "data" ? (
          <Card
            title="Import / Export"
            subtitle="Visible entry points now, workflow pages next."
          >
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setWizardOpen(true)}
                className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 p-4 text-left hover:bg-cyan-500/15"
              >
                <div className="text-sm font-semibold text-cyan-100">Import Old Tickets</div>
                <div className="text-xs text-slate-300 mt-2">
                  Use the guided setup flow to capture import preference until the full import page is live.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSection("setup")}
                className="rounded-2xl border border-indigo-500/25 bg-indigo-500/10 p-4 text-left hover:bg-indigo-500/15"
              >
                <div className="text-sm font-semibold text-indigo-100">Export Data</div>
                <div className="text-xs text-slate-300 mt-2">
                  Export architecture is planned here first so it stays visible in the product.
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigate("/sbo/catalog")}
                className="rounded-2xl border border-fuchsia-500/25 bg-fuchsia-500/10 p-4 text-left hover:bg-fuchsia-500/15"
              >
                <div className="text-sm font-semibold text-fuchsia-100">Build Catalog</div>
                <div className="text-xs text-slate-300 mt-2">
                  Get invoice-ready services into the system.
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigate("/team/invites")}
                className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-left hover:bg-emerald-500/15"
              >
                <div className="text-sm font-semibold text-emerald-100">Invite Employees</div>
                <div className="text-xs text-slate-300 mt-2">
                  Start role-based access for techs, office, accounting.
                </div>
              </button>
            </div>
          </Card>
        ) : null}
      </main>

      <SboSetupWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        businessId={activeBusinessId}
        business={business}
        categories={categories}
        onSaveBusiness={saveBusiness}
        onDone={async () => {
          await loadAll();
        }}
      />
    </div>
  );
}