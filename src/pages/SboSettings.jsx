// src/pages/SboSettings.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import ModeBar from "../components/ModeBar";
import BusinessPicker from "../components/BusinessPicker";

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

  return raw.toUpperCase().slice(0, 2);
}

function setupStorageKey(businessId) {
  return `sw_sbo_settings_snapshot_v2_${businessId || "no_biz"}`;
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

  if (raw && typeof raw === "object") return categoryId(raw);

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

  if (!selectable.length) selectable = active;

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

function SmallButton({ children, tone = "slate", disabled = false, onClick, type = "button" }) {
  const tones = {
    slate:
      "border-slate-800 bg-slate-950/70 text-slate-200 hover:bg-slate-900 disabled:text-slate-600",
    cyan:
      "border-cyan-400/40 bg-cyan-500/90 text-black hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500",
    fuchsia:
      "border-fuchsia-400/40 bg-fuchsia-500/20 text-fuchsia-100 hover:bg-fuchsia-500/25 disabled:text-slate-500",
    emerald:
      "border-emerald-400/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/20 disabled:text-slate-500",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "inline-flex min-h-10 items-center justify-center rounded-2xl border px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
        tones[tone] || tones.slate
      )}
    >
      {children}
    </button>
  );
}

function Card({ title, subtitle, right, children }) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950/50 p-4 shadow-[0_0_34px_rgba(15,23,42,0.35)] md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base font-black text-slate-100">{title}</div>
          {subtitle ? (
            <div className="mt-1 text-xs leading-5 text-slate-400">{subtitle}</div>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Input({ label, value, onChange, placeholder = "", type = "text", inputMode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-slate-300">{label}</div>
      <input
        value={value}
        type={type}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/10"
      />
    </label>
  );
}

function Textarea({ label, value, onChange, placeholder = "", rows = 4 }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-slate-300">{label}</div>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/10"
      />
    </label>
  );
}

function Select({ label, value, onChange, options = [] }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-slate-300">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/10"
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

function Toggle({ label, checked, onChange, hint = "" }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cx(
        "w-full rounded-3xl border p-4 text-left transition",
        checked
          ? "border-cyan-400/40 bg-cyan-500/12 text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.12)]"
          : "border-slate-800 bg-slate-950/70 text-slate-200 hover:bg-slate-900/70"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-black">{label}</div>
          {hint ? <div className="mt-1 text-xs leading-5 text-slate-400">{hint}</div> : null}
        </div>
        <div
          className={cx(
            "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]",
            checked
              ? "border-cyan-300 bg-cyan-400 text-black"
              : "border-slate-700 bg-slate-900 text-slate-500"
          )}
        >
          {checked ? "ON" : "OFF"}
        </div>
      </div>
    </button>
  );
}

function MobileTab({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "shrink-0 rounded-2xl border px-4 py-2 text-sm font-bold transition",
        active
          ? "border-cyan-400/45 bg-cyan-500/15 text-cyan-100"
          : "border-slate-800 bg-slate-950/70 text-slate-300 hover:bg-slate-900"
      )}
    >
      {children}
    </button>
  );
}

function ServicesPicker({ categories, selectedServiceIds, setSelectedServiceIds }) {
  const [query, setQuery] = useState("");

  const rows = useMemo(() => buildSelectableServiceGroups(categories), [categories]);
  const selectedSet = useMemo(
    () => new Set((selectedServiceIds || []).map(Number).filter(Boolean)),
    [selectedServiceIds]
  );

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedSet.has(row.id)),
    [rows, selectedSet]
  );

  const filteredRows = useMemo(() => {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return rows.slice(0, 36);

    return rows
      .filter((row) =>
        [row.name, row.key, row.path, row.parentName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
      .slice(0, 36);
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

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-fuchsia-500/25 bg-gradient-to-br from-fuchsia-500/10 via-purple-500/8 to-cyan-500/8 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-black text-fuchsia-100">Services provided</div>
            <div className="mt-1 text-xs leading-5 text-slate-300">
              Pick broad service groups. Example: Plumbing covers leak repair,
              drains, water heaters, toilets, and garbage disposals underneath it.
            </div>
          </div>

          <div className="rounded-full border border-fuchsia-400/35 bg-fuchsia-500/15 px-3 py-1 text-[11px] font-black text-fuchsia-100">
            {selectedSet.size}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/75 p-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search plumbing, tree, tutoring, dog grooming..."
            className="h-11 w-full bg-transparent px-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none"
          />
        </div>

        {selectedRows.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedRows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => toggle(row.id)}
                className="rounded-full border border-fuchsia-400/40 bg-fuchsia-500/18 px-3 py-2 text-xs font-bold text-fuchsia-50"
              >
                {row.name} ×
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/55 p-3 text-sm text-slate-500">
            No services selected yet.
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100">
          No service categories loaded. Backend categories need to be seeded.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredRows.map((row) => {
            const active = selectedSet.has(row.id);

            return (
              <button
                key={row.id}
                type="button"
                onClick={() => toggle(row.id)}
                className={cx(
                  "rounded-3xl border p-4 text-left transition",
                  active
                    ? "border-fuchsia-400/60 bg-gradient-to-r from-fuchsia-500/20 to-cyan-500/12 shadow-[0_0_26px_rgba(217,70,239,0.18)]"
                    : "border-slate-800 bg-slate-950/65 hover:border-fuchsia-500/35 hover:bg-slate-900/70"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-2xl">{serviceIcon(row.key, row.name)}</div>
                    <div className="mt-2 text-sm font-black text-white">{row.name}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {row.parentName ? `${row.parentName} • ` : ""}
                      {row.childCount ? `${row.childCount} sub-services` : row.key}
                    </div>
                  </div>

                  <span
                    className={cx(
                      "rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em]",
                      active
                        ? "border-fuchsia-300 bg-fuchsia-400 text-black"
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

  const [section, setSection] = useState("business");
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

  const [baselineRevenue, setBaselineRevenue] = useState("");
  const [targetRevenue, setTargetRevenue] = useState("");
  const [oldDataStatus, setOldDataStatus] = useState("LATER");
  const [usageIntent, setUsageIntent] = useState("MAJORITY");

  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [googleBusinessUrl, setGoogleBusinessUrl] = useState("");

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");

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

  const readiness = useMemo(() => {
    const checks = [
      !!name.trim(),
      !!phone.trim() || !!businessEmail.trim(),
      !!baseZip.trim(),
      !!normalizeStateCode(state).trim(),
      selectedServiceIds.length > 0,
      !!acceptsMarketplace,
    ];

    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  }, [name, phone, businessEmail, baseZip, state, selectedServiceIds, acceptsMarketplace]);

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
    setOk("");

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

      try {
        const local = JSON.parse(localStorage.getItem(setupStorageKey(activeBusinessId)) || "{}");
        setBaselineRevenue(String(local.baselineRevenue || ""));
        setTargetRevenue(String(local.targetRevenue || ""));
        setOldDataStatus(local.oldDataStatus || "LATER");
        setUsageIntent(local.usageIntent || "MAJORITY");
      } catch {
        // keep defaults
      }
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

  function saveLocalSnapshot() {
    localStorage.setItem(
      setupStorageKey(activeBusinessId),
      JSON.stringify({
        baselineRevenue,
        targetRevenue,
        oldDataStatus,
        usageIntent,
        selectedServices: selectedServiceIds,
        updatedAt: new Date().toISOString(),
      })
    );
  }

  function basePayload() {
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
      services_offered: selectedServiceIds,
    };
  }

  async function saveSettings() {
    if (!activeBusinessId) return;

    setSaving(true);
    setErr("");
    setOk("");

    try {
      saveLocalSnapshot();

      await api.patch(`/businesses/${activeBusinessId}/`, basePayload());

      const refreshed = await api.get(`/businesses/${activeBusinessId}/`);
      setBusiness(refreshed?.data || null);
      setSelectedServiceIds(extractBusinessServiceIds(refreshed?.data || null));

      Promise.resolve(reloadBusinesses?.()).catch(() => {});
      setOk("Settings saved.");
    } catch (e) {
      setErr(
        e?.response?.data?.detail ||
          JSON.stringify(e?.response?.data || {}) ||
          "Save failed."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleLogoFileChange(file) {
    setLogoFile(file || null);

    if (logoPreviewUrl && logoPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(logoPreviewUrl);
    }

    if (file) setLogoPreviewUrl(URL.createObjectURL(file));
    else setLogoPreviewUrl("");
  }

  async function uploadLogo() {
  if (!activeBusinessId || !logoFile) return;

  setLogoSaving(true);
  setErr("");
  setOk("");

  try {
    const fd = new FormData();
    fd.append("logo", logoFile);

    const res = await api.post(`/businesses/${activeBusinessId}/upload-logo/`, fd, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    const refreshed = await api.get(`/businesses/${activeBusinessId}/`);
    setBusiness(refreshed?.data || null);
    setOk("Logo uploaded.");
    setLogoFile(null);

    if (res?.data?.logo_url) {
      setLogoPreviewUrl(res.data.logo_url);
    }

    Promise.resolve(reloadBusinesses?.()).catch(() => {});
  } catch (e) {
    const data = e?.response?.data;

    let message = "Logo upload failed. Please try a small PNG or JPG file.";

    if (data && typeof data === "object") {
      message =
        data?.detail ||
        data?.logo?.[0] ||
        data?.non_field_errors?.[0] ||
        data?.error ||
        JSON.stringify(data);
    }

    setErr(message);
  } finally {
    setLogoSaving(false);
  }
}

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="SBO Settings"
        subtitle="Business profile, marketplace routing, services, and setup goals"
        rightActions={
          <div className="flex flex-wrap gap-2">
            <BusinessPicker />
            <SmallButton tone="slate" onClick={() => navigate(returnTo)}>
              Back
            </SmallButton>
            <SmallButton tone="cyan" onClick={saveSettings} disabled={saving || loading}>
              {saving ? "Saving…" : "Save"}
            </SmallButton>
          </div>
        }
      />

      <main className="mx-auto max-w-6xl px-4 py-5 pb-28 md:py-6 md:pb-8">
        {err ? (
          <div className="mb-4 rounded-2xl border border-red-500/35 bg-red-500/10 p-3 text-sm text-red-100">
            {err}
          </div>
        ) : null}

        {ok ? (
          <div className="mb-4 rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-3 text-sm text-emerald-100">
            {ok}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5 text-sm text-slate-400">
            Loading settings…
          </div>
        ) : null}

        <div className="mb-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max gap-2">
            <MobileTab active={section === "business"} onClick={() => setSection("business")}>
              Business
            </MobileTab>
            <MobileTab active={section === "marketplace"} onClick={() => setSection("marketplace")}>
              Marketplace
            </MobileTab>
            <MobileTab active={section === "services"} onClick={() => setSection("services")}>
              Services
            </MobileTab>
            <MobileTab active={section === "goals"} onClick={() => setSection("goals")}>
              Goals
            </MobileTab>
          </div>
        </div>

        <div className="mb-5 rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-cyan-100">
                Setup readiness
              </div>
              <div className="mt-1 text-xs text-slate-400">
                The more complete this is, the better SyncWorks can route jobs and score activity.
              </div>
            </div>

            <div className="text-2xl font-black text-white">{readiness}%</div>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-900">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-purple-400"
              style={{ width: `${readiness}%` }}
            />
          </div>
        </div>

        <div className="space-y-5">
          {section === "business" ? (
            <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
              <Card
                title="Business Profile"
                subtitle="Core information customers and SyncWorks use."
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <Input label="Business Name" value={name} onChange={setName} placeholder="Acme Plumbing" />
                  <Input label="Business Email" value={businessEmail} onChange={setBusinessEmail} placeholder="office@acme.com" />
                  <Input label="Owner / Contact Name" value={ownerName} onChange={setOwnerName} placeholder="Jacob Lord" />
                  <Input label="Phone" value={phone} onChange={setPhone} placeholder="334-555-1212" inputMode="tel" />
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
                subtitle="Optional logo for business card/profile."
                right={
                  <SmallButton tone="fuchsia" onClick={uploadLogo} disabled={!logoFile || logoSaving}>
                    {logoSaving ? "Uploading…" : "Upload"}
                  </SmallButton>
                }
              >
                <div className="space-y-4">
                  <div className="flex min-h-44 items-center justify-center rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
                    {currentLogoUrl ? (
                      <img
                        src={currentLogoUrl}
                        alt="Business logo preview"
                        className="max-h-36 max-w-full rounded-2xl object-contain"
                      />
                    ) : (
                      <div className="text-sm text-slate-500">No logo uploaded.</div>
                    )}
                  </div>

                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={(e) => handleLogoFileChange(e.target.files?.[0] || null)}
                    className="block w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 file:mr-3 file:rounded-xl file:border-0 file:bg-cyan-500/15 file:px-3 file:py-2 file:text-cyan-200"
                  />

                  <div className="text-xs leading-5 text-slate-500">
                    Logo upload may need backend field alignment later if this errors.
                  </div>
                </div>
              </Card>
            </div>
          ) : null}

          {section === "marketplace" ? (
            <Card
              title="Marketplace Routing"
              subtitle="Controls whether this business can receive local marketplace tickets."
            >
              <div className="grid gap-3 md:grid-cols-2">
                <Input label="Street Address" value={address} onChange={setAddress} placeholder="123 Main St" />
                <Input label="City" value={city} onChange={setCity} placeholder="Montgomery" />
                <Input label="State" value={state} onChange={setState} placeholder="AL or Alabama" />
                <Input label="Base ZIP" value={baseZip} onChange={setBaseZip} placeholder="36117" inputMode="numeric" />
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

              <div className="mt-4">
                <Toggle
                  label="Accept Marketplace Tickets"
                  checked={acceptsMarketplace}
                  onChange={setAcceptsMarketplace}
                  hint="If off, this business will not receive new open marketplace jobs."
                />
              </div>

              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-xs leading-5 text-slate-400">
                State names are normalized before save. Example: Alabama saves as AL.
              </div>
            </Card>
          ) : null}

          {section === "services" ? (
            <Card
              title="Services"
              subtitle="Pick broad service groups for routing and internal ticket creation."
            >
              <ServicesPicker
                categories={categories}
                selectedServiceIds={selectedServiceIds}
                setSelectedServiceIds={setSelectedServiceIds}
              />
            </Card>
          ) : null}

          {section === "goals" ? (
            <Card
              title="God Mode CRM Snapshot"
              subtitle="These values are saved locally now. Later we’ll add backend fields so God Mode can score account adoption."
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

                <Select
                  label="Old Data / Import Preference"
                  value={oldDataStatus}
                  onChange={setOldDataStatus}
                  options={[
                    { value: "LATER", label: "Import later" },
                    { value: "YES", label: "Yes, wants import help" },
                    { value: "NONE", label: "No old data" },
                  ]}
                />

                <Select
                  label="SyncWorks Usage Intent"
                  value={usageIntent}
                  onChange={setUsageIntent}
                  options={[
                    { value: "MAJORITY", label: "Run majority of business through SyncWorks" },
                    { value: "PARTIAL", label: "Use SyncWorks for part of the business" },
                    { value: "TESTING", label: "Testing / exploring" },
                  ]}
                />
              </div>

              <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs leading-5 text-amber-100">
                Backend CRM fields should be added later so God Mode can report on
                majority-use vs partial-use businesses. For now this snapshot saves
                locally and does not block the setup flow.
              </div>
            </Card>
          ) : null}
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-[#020617]/95 px-4 py-3 backdrop-blur-xl md:hidden">
        <SmallButton tone="cyan" onClick={saveSettings} disabled={saving || loading}>
          {saving ? "Saving…" : "Save Settings"}
        </SmallButton>
      </div>
    </div>
  );
}