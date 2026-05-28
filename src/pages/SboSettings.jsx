// src/pages/SboSettings.jsx
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

function Card({ title, subtitle, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="font-semibold text-slate-100">{title}</div>
          {subtitle ? (
            <div className="text-xs text-slate-400 mt-1">{subtitle}</div>
          ) : null}
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
          {hint ? (
            <div className="text-[11px] text-slate-400 mt-1">{hint}</div>
          ) : null}
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

function ServicesOfferedPicker({
  categories,
  selectedServiceIds,
  setSelectedServiceIds,
}) {
  const [query, setQuery] = useState("");

  const rows = useMemo(() => buildSelectableServiceGroups(categories), [categories]);
  const selectedSet = useMemo(
    () => new Set((selectedServiceIds || []).map(Number).filter(Boolean)),
    [selectedServiceIds]
  );

  const filtered = useMemo(() => {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((row) => {
      return [row.name, row.key, row.path, row.parentName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [query, rows]);

  function toggle(id) {
    const n = Number(id);
    if (!Number.isFinite(n) || n <= 0) return;

    setSelectedServiceIds((prev) => {
      const next = new Set((prev || []).map(Number).filter(Boolean));
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return Array.from(next);
    });
  }

  function clearAll() {
    setSelectedServiceIds([]);
  }

  return (
    <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm font-black text-cyan-100">
            Services this business provides
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-400">
            Pick main service groups, not every tiny job.
          </div>
        </div>

        <div className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[11px] font-black text-cyan-100">
          {selectedSet.size} selected
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search services: plumbing, tree, tutoring, dog grooming..."
          className="h-11 w-full bg-transparent px-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none"
        />
      </div>

      <div className="mt-3 flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={clearAll}
          className="rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-900"
        >
          Clear
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100">
          No service categories loaded yet.
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((row) => {
            const active = selectedSet.has(row.id);

            return (
              <button
                key={row.id}
                type="button"
                onClick={() => toggle(row.id)}
                className={cx(
                  "rounded-3xl border p-4 text-left transition",
                  active
                    ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.12)]"
                    : "border-slate-800 bg-slate-950/65 text-slate-200 hover:border-cyan-500/30 hover:bg-slate-900/60"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-2xl">{serviceIcon(row.key, row.name)}</div>
                    <div className="mt-2 text-sm font-black text-slate-50">
                      {row.name}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      {row.parentName ? `${row.parentName} • ` : ""}
                      {row.childCount ? `${row.childCount} sub-services` : row.key}
                    </div>
                  </div>

                  <span
                    className={cx(
                      "shrink-0 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em]",
                      active
                        ? "border-cyan-300 bg-cyan-400 text-black"
                        : "border-slate-700 bg-slate-900 text-slate-500"
                    )}
                  >
                    {active ? "ON" : "OFF"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && rows.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
          No service groups matched your search.
        </div>
      ) : null}
    </div>
  );
}

export default function SboSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeBusinessId, reloadBusinesses } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoSaving, setLogoSaving] = useState(false);
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
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);

  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [googleBusinessUrl, setGoogleBusinessUrl] = useState("");

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");

  const localSetup = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(setupStorageKey(activeBusinessId)) || "{}");
    } catch {
      return {};
    }
  }, [activeBusinessId, ok, wizardOpen]);

  const selectedServicesCount =
    selectedServiceIds.length ||
    (Array.isArray(localSetup?.selectedServices) ? localSetup.selectedServices.length : 0);

  const returnTo = useMemo(() => {
    const qs = new URLSearchParams(location.search || "");
    const r = (qs.get("return") || "").trim();
    return r && r.startsWith("/") ? r : "/sbo";
  }, [location.search]);

  const currentLogoUrl = useMemo(() => {
    if (logoPreviewUrl) return logoPreviewUrl;
    return (
      business?.logo_url ||
      business?.logo ||
      business?.image_url ||
      business?.avatar_url ||
      ""
    );
  }, [business, logoPreviewUrl]);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl && logoPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
    };
  }, [logoPreviewUrl]);

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
        api.get("/service-categories/"),
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
      setSelectedServiceIds(extractBusinessServiceIds(biz));

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
      setSelectedServiceIds(extractBusinessServiceIds(refreshed?.data || null));
      setOk("Saved.");
      Promise.resolve(reloadBusinesses?.()).catch(() => {});
      return refreshed?.data || null;
    } catch (e) {
      setErr(
        e?.response?.data?.detail ||
          JSON.stringify(e?.response?.data || {}) ||
          "Save failed."
      );
      throw e;
    } finally {
      setSaving(false);
    }
  }

  function baseProfilePayload() {
    return {
      name,
      business_email: businessEmail,
      owner_name: ownerName,
      phone,
      website,
      headline,
      services_text: servicesText,
      address,
      city,
      state: normalizeStateCode(state),
      base_zip: baseZip,
      service_radius_miles: Number(radius || 0),
      business_presence_mode: businessPresenceMode,
      accepts_marketplace_tickets: !!acceptsMarketplace,
      facebook_url: facebookUrl,
      instagram_url: instagramUrl,
      linkedin_url: linkedinUrl,
      google_business_url: googleBusinessUrl,
    };
  }

  async function saveProfile() {
    await saveBusiness(baseProfilePayload());
  }

  async function saveMarketplace() {
    await saveBusiness({
      ...baseProfilePayload(),
      services_offered: selectedServiceIds,
    });
  }

  function handleLogoFileChange(file) {
    setLogoFile(file || null);

    if (logoPreviewUrl && logoPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(logoPreviewUrl);
    }

    if (file) {
      const blobUrl = URL.createObjectURL(file);
      setLogoPreviewUrl(blobUrl);
    } else {
      setLogoPreviewUrl("");
    }
  }

  async function uploadLogo() {
    if (!activeBusinessId || !logoFile) return;

    setLogoSaving(true);
    setErr("");
    setOk("");

    try {
      const fd = new FormData();
      fd.append("logo", logoFile);

      await api.patch(`/businesses/${activeBusinessId}/`, fd);

      const refreshed = await api.get(`/businesses/${activeBusinessId}/`);
      setBusiness(refreshed?.data || null);
      setOk("Logo uploaded.");
      setLogoFile(null);

      Promise.resolve(reloadBusinesses?.()).catch(() => {});
    } catch (e) {
      setErr(
        e?.response?.data?.detail ||
          "Logo upload failed. The backend may use a different field name than 'logo'."
      );
    } finally {
      setLogoSaving(false);
    }
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
          </Card>
        ) : null}

        {section === "profile" ? (
          <div className="grid xl:grid-cols-[1fr_360px] gap-5">
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

            <Card
              title="Business Logo"
              subtitle="Upload a logo for your business card and branded presence."
              right={
                <Button tone="indigo" onClick={uploadLogo} disabled={!logoFile || logoSaving}>
                  {logoSaving ? "Uploading…" : "Upload Logo"}
                </Button>
              }
            >
              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-800 bg-slate-950/55 p-4 flex items-center justify-center min-h-[220px]">
                  {currentLogoUrl ? (
                    <img
                      src={currentLogoUrl}
                      alt="Business logo preview"
                      className="max-h-40 max-w-full object-contain rounded-2xl"
                    />
                  ) : (
                    <div className="text-sm text-slate-500">No logo uploaded yet.</div>
                  )}
                </div>

                <label className="block">
                  <div className="text-xs text-slate-300 mb-1">Choose Logo File</div>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={(e) => handleLogoFileChange(e.target.files?.[0] || null)}
                    className="block w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 file:mr-3 file:rounded-xl file:border-0 file:bg-cyan-500/15 file:px-3 file:py-2 file:text-cyan-200"
                  />
                </label>

                <div className="text-[11px] text-slate-500">
                  Best result: square PNG with transparent background.
                </div>
              </div>
            </Card>
          </div>
        ) : null}

        {section === "marketplace" ? (
          <Card
            title="Marketplace"
            subtitle="Routing and discovery controls for new jobs."
            right={
              <Button tone="cyan" onClick={saveMarketplace} disabled={saving}>
                {saving ? "Saving…" : "Save Marketplace"}
              </Button>
            }
          >
            <div className="grid md:grid-cols-2 gap-3">
              <Input label="Street Address" value={address} onChange={setAddress} placeholder="123 Main St" />
              <Input label="City" value={city} onChange={setCity} placeholder="Montgomery" />
              <Input label="State" value={state} onChange={setState} placeholder="AL or Alabama" />
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
              <ServicesOfferedPicker
                categories={categories}
                selectedServiceIds={selectedServiceIds}
                setSelectedServiceIds={setSelectedServiceIds}
              />
            </div>

            <div className="mt-4 flex gap-2 flex-wrap">
              <Button tone="cyan" onClick={saveMarketplace} disabled={saving}>
                {saving ? "Saving…" : "Save Marketplace"}
              </Button>

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