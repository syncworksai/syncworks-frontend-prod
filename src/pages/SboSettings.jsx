import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import BusinessPicker from "../components/BusinessPicker";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Card({ title, subtitle, right, children }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 shadow-[0_0_30px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="font-semibold text-slate-100">{title}</div>
          {subtitle ? <div className="text-xs text-slate-300 mt-1 leading-relaxed">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder = "", type = "text", hint = "" }) {
  return (
    <label className="block">
      <div className="text-xs text-slate-200 font-medium">{label}</div>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/40"
      />
      {hint ? <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">{hint}</div> : null}
    </label>
  );
}

function Textarea({ label, value, onChange, placeholder = "", hint = "" }) {
  return (
    <label className="block">
      <div className="text-xs text-slate-200 font-medium">{label}</div>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/40"
      />
      {hint ? <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">{hint}</div> : null}
    </label>
  );
}

function Toggle({ label, checked, onChange, hint = "" }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/45 p-3">
      <div>
        <div className="text-sm text-slate-100 font-semibold">{label}</div>
        {hint ? <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">{hint}</div> : null}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={
          "w-14 h-8 rounded-full border transition relative shrink-0 " +
          (checked ? "bg-cyan-500/20 border-cyan-500/40" : "bg-slate-950 border-slate-700")
        }
        title={checked ? "On" : "Off"}
      >
        <span
          className={
            "absolute top-1 left-1 w-6 h-6 rounded-full transition " +
            (checked ? "translate-x-6 bg-cyan-200" : "translate-x-0 bg-slate-300")
          }
        />
      </button>
    </div>
  );
}

function Select({ label, value, onChange, options = [], hint = "" }) {
  return (
    <label className="block">
      <div className="text-xs text-slate-200 font-medium">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/40"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-slate-950 text-slate-100">
            {opt.label}
          </option>
        ))}
      </select>
      {hint ? <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">{hint}</div> : null}
    </label>
  );
}

function SmallText({ children }) {
  return <div className="text-[11px] text-slate-400 leading-relaxed">{children}</div>;
}

function safeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.value)) return data.value;
  return [];
}

function normalizeBusinesses(myBusinesses) {
  const arr = Array.isArray(myBusinesses) ? myBusinesses : [];
  return arr
    .map((x) => {
      if (!x) return null;
      if (x.business && typeof x.business === "object") return x.business;
      return x;
    })
    .filter(Boolean);
}

function normalizeWebsite(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `https://${s}`;
}

function normalizeExternalUrl(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `https://${s}`;
}

function getPresenceMeta(modeRaw) {
  const mode = String(modeRaw || "").trim().toLowerCase();

  if (mode === "online") {
    return {
      label: "ONLINE BUSINESS",
      className:
        "border-cyan-500/40 bg-cyan-500/15 text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,0.18)]",
    };
  }

  if (mode === "in_person") {
    return {
      label: "IN PERSON",
      className:
        "border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-200 shadow-[0_0_30px_rgba(217,70,239,0.16)]",
    };
  }

  if (mode === "on_site") {
    return {
      label: "ON-SITE SERVICE",
      className:
        "border-emerald-500/40 bg-emerald-500/15 text-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.16)]",
    };
  }

  if (mode === "hybrid") {
    return {
      label: "ONLINE + ON-SITE",
      className:
        "border-amber-500/40 bg-amber-500/15 text-amber-200 shadow-[0_0_30px_rgba(245,158,11,0.16)]",
    };
  }

  return {
    label: "BUSINESS TYPE",
    className: "border-slate-700 bg-slate-900/70 text-slate-300",
  };
}

function PresenceBadge({ mode }) {
  const meta = getPresenceMeta(mode);
  return (
    <div
      className={`inline-flex items-center rounded-full border px-4 py-2 text-[11px] font-extrabold tracking-[0.18em] uppercase ${meta.className}`}
    >
      {meta.label}
    </div>
  );
}

function getSocialLinks({
  facebookUrl,
  instagramUrl,
  linkedinUrl,
  googleBusinessUrl,
  youtubeUrl,
  tiktokUrl,
}) {
  return [
    { key: "facebook", label: "Facebook", short: "f", url: normalizeExternalUrl(facebookUrl) },
    { key: "instagram", label: "Instagram", short: "ig", url: normalizeExternalUrl(instagramUrl) },
    { key: "linkedin", label: "LinkedIn", short: "in", url: normalizeExternalUrl(linkedinUrl) },
    { key: "google", label: "Google", short: "g", url: normalizeExternalUrl(googleBusinessUrl) },
    { key: "youtube", label: "YouTube", short: "yt", url: normalizeExternalUrl(youtubeUrl) },
    { key: "tiktok", label: "TikTok", short: "tt", url: normalizeExternalUrl(tiktokUrl) },
  ].filter((x) => x.url);
}

function SocialLinkPill({ href, label, short }) {
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={label}
      className="inline-flex items-center justify-center min-w-[42px] h-10 px-3 rounded-2xl border border-slate-700 bg-slate-950/80 hover:bg-slate-900 text-slate-100 transition text-xs font-extrabold uppercase tracking-wide"
    >
      {short}
    </a>
  );
}

function getBusinessLogoUrl(biz, fallback = "") {
  const raw =
    biz?.logo_url ||
    biz?.logo ||
    biz?.logo_image ||
    biz?.logo_file ||
    fallback ||
    "";

  const base = String(raw || "").trim();
  if (!base) return "";

  const stamp =
    biz?.logo_updated_at ||
    biz?.updated_at ||
    biz?.modified ||
    biz?.updated ||
    Date.now();

  return `${base}${base.includes("?") ? "&" : "?"}v=${encodeURIComponent(String(stamp))}`;
}

const PRESENCE_OPTIONS = [
  { value: "", label: "Select business type…" },
  { value: "online", label: "Online Business" },
  { value: "in_person", label: "In Person" },
  { value: "on_site", label: "On-Site Service" },
  { value: "hybrid", label: "Online + On-Site" },
];

export default function SboSettings() {
  const nav = useNavigate();
  const loc = useLocation();
  const { activeBusinessId, myBusinesses, reloadBusinesses } = useAuth();
  const fileRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [copied, setCopied] = useState(false);

  const businesses = useMemo(() => normalizeBusinesses(myBusinesses), [myBusinesses]);
  const activeId = activeBusinessId ? Number(activeBusinessId) : null;

  const returnTo = useMemo(() => {
    const qs = new URLSearchParams(loc.search || "");
    const r = (qs.get("return") || "").trim();
    return r && r.startsWith("/") ? r : "/settings";
  }, [loc.search]);

  const fallbackActiveBiz = useMemo(() => {
    if (!activeId) return null;
    return (businesses || []).find((b) => Number(b.id) === Number(activeId)) || null;
  }, [businesses, activeId]);

  const [activeBiz, setActiveBiz] = useState(null);

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
  const [acceptsMarketplace, setAcceptsMarketplace] = useState(true);

  const [businessPresenceMode, setBusinessPresenceMode] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [googleBusinessUrl, setGoogleBusinessUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");

  const [servicesOffered, setServicesOffered] = useState([]);
  const [businessCardCode, setBusinessCardCode] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const [isLicensed, setIsLicensed] = useState(false);
  const [isInsured, setIsInsured] = useState(false);
  const [backgroundChecked, setBackgroundChecked] = useState(false);
  const [isBonded, setIsBonded] = useState(false);
  const [emergencyService, setEmergencyService] = useState(false);

  const [allCategories, setAllCategories] = useState([]);
  const [taxonomyLoading, setTaxonomyLoading] = useState(false);
  const [taxonomyError, setTaxonomyError] = useState("");

  const [roots, setRoots] = useState([]);
  const [rootPick, setRootPick] = useState(null);
  const [groupPick, setGroupPick] = useState(null);
  const [children, setChildren] = useState([]);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [serviceLabels, setServiceLabels] = useState({});

  async function fetchBusinessDetail(businessId) {
    if (!businessId) return null;
    const res = await api.get(`/businesses/${businessId}/`);
    return res?.data || null;
  }

  async function fetchAllServiceCategories() {
    let page = 1;
    let all = [];
    let keepGoing = true;

    while (keepGoing) {
      const r = await api.get("/service-categories/", { params: { page, page_size: 200 } });
      const list = safeList(r.data);
      all = [...all, ...list];
      keepGoing = !!r?.data?.next;
      page += 1;

      if (page > 50) break;
    }

    return all;
  }

  function hydrateTaxonomy(cats) {
    const list = Array.isArray(cats) ? cats : [];
    setAllCategories(list);
    setRoots(list.filter((x) => !x?.parent_id));
  }

  function getChildren(parentId, source = allCategories) {
    const pid = Number(parentId);
    return (Array.isArray(source) ? source : []).filter((x) => Number(x?.parent_id) === pid);
  }

  function findById(id, source = allCategories) {
    return (Array.isArray(source) ? source : []).find((x) => Number(x?.id) === Number(id)) || null;
  }

  function isLeaf(cat, source = allCategories) {
    if (!cat?.id) return false;
    return getChildren(cat.id, source).length === 0;
  }

  function buildPath(cat, source = allCategories) {
    if (!cat) return "";
    const map = new Map((Array.isArray(source) ? source : []).map((x) => [Number(x.id), x]));
    const chain = [];
    let cur = cat;
    let guard = 0;

    while (cur && guard < 20) {
      chain.unshift(cur.name);
      cur = cur.parent_id ? map.get(Number(cur.parent_id)) : null;
      guard += 1;
    }

    return chain.join(" → ");
  }

  async function loadLabels(ids, source = allCategories) {
    const clean = (ids || []).map((x) => Number(x)).filter(Boolean);
    if (!clean.length) {
      setServiceLabels({});
      return;
    }

    const list = Array.isArray(source) && source.length ? source : await fetchAllServiceCategories();
    const next = {};

    clean.forEach((id) => {
      const cat = findById(id, list);
      if (cat) {
        next[id] = {
          id,
          name: cat.name,
          path: buildPath(cat, list),
          key: cat.key,
        };
      }
    });

    setServiceLabels(next);
  }

  function hydrateFromBusiness(biz) {
    if (!biz) return;

    setName(biz.name || "");
    setBusinessEmail(biz.business_email || "");
    setOwnerName(biz.owner_name || "");
    setPhone(biz.phone || "");
    setWebsite(biz.website || "");
    setHeadline(biz.headline || "");
    setServicesText(biz.services_text || "");
    setAddress(biz.address || "");
    setCity(biz.city || "");
    setState(biz.state || "");
    setBaseZip(biz.base_zip || "");
    setRadius(String(biz.service_radius_miles ?? biz.effective_service_radius_miles ?? 25));
    setAcceptsMarketplace(!!biz.accepts_marketplace_tickets);
    setBusinessCardCode(biz.business_card_code || "");
    setLogoUrl(getBusinessLogoUrl(biz));

    setBusinessPresenceMode(biz.business_presence_mode || "");
    setFacebookUrl(biz.facebook_url || "");
    setInstagramUrl(biz.instagram_url || "");
    setLinkedinUrl(biz.linkedin_url || "");
    setGoogleBusinessUrl(biz.google_business_url || "");
    setYoutubeUrl(biz.youtube_url || "");
    setTiktokUrl(biz.tiktok_url || "");

    setIsLicensed(!!biz.is_licensed);
    setIsInsured(!!biz.is_insured);
    setBackgroundChecked(!!biz.background_checked);
    setIsBonded(!!biz.is_bonded);
    setEmergencyService(!!biz.emergency_service);

    const svc = Array.isArray(biz.services_offered)
      ? biz.services_offered
      : Array.isArray(biz.services_offered?.results)
      ? biz.services_offered.results
      : [];

    const ids = svc
      .map((x) => (typeof x === "number" ? x : x?.id))
      .filter(Boolean)
      .map((x) => Number(x));

    setServicesOffered(ids);
    loadLabels(ids);
  }

  async function loadTaxonomyOnly() {
    setTaxonomyLoading(true);
    setTaxonomyError("");
    try {
      const cats = await fetchAllServiceCategories();
      hydrateTaxonomy(cats);
      if (!cats.length) {
        setTaxonomyError("No service categories were returned from /service-categories/.");
      }
    } catch (e) {
      setTaxonomyError(e?.response?.data?.detail || "Failed to load service taxonomy.");
    } finally {
      setTaxonomyLoading(false);
    }
  }

  async function refreshBusinesses() {
    setErr("");
    setOk("");
    setLoading(true);
    try {
      await loadTaxonomyOnly();
      await reloadBusinesses?.();

      if (activeId) {
        const detail = await fetchBusinessDetail(activeId);
        setActiveBiz(detail);
      }
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to refresh businesses.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshBusinesses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadActive() {
      if (!activeId) {
        setActiveBiz(null);
        return;
      }

      try {
        const detail = await fetchBusinessDetail(activeId);
        if (!alive) return;
        setActiveBiz(detail || fallbackActiveBiz || null);
      } catch {
        if (!alive) return;
        setActiveBiz(fallbackActiveBiz || null);
      }
    }

    loadActive();

    return () => {
      alive = false;
    };
  }, [activeId, fallbackActiveBiz]);

  useEffect(() => {
    if (!activeBiz) return;
    hydrateFromBusiness(activeBiz);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBiz?.id, activeBiz?.updated_at, activeBiz?.logo_updated_at]);

  useEffect(() => {
    const q = String(searchQ || "").trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      return;
    }

    const list = (allCategories || []).filter((c) => {
      const blob = [c?.name, c?.key, c?.path, c?.category_path]
        .map((x) => String(x || "").toLowerCase())
        .join(" ");
      return blob.includes(q);
    });

    const leafMatches = list.filter((x) => isLeaf(x));
    setSearchResults(leafMatches.length ? leafMatches : list);
  }, [searchQ, allCategories]);

  const activeBusinessMissing = useMemo(() => {
    const hasAny = Array.isArray(myBusinesses) && myBusinesses.length > 0;
    return hasAny && !activeId;
  }, [myBusinesses, activeId]);

  const customerFacingWebsite = useMemo(() => normalizeWebsite(website), [website]);
  const qrValue = useMemo(() => (businessCardCode ? businessCardCode : ""), [businessCardCode]);

  const mailtoHref = useMemo(() => {
    if (!businessCardCode) return "";
    const subject = encodeURIComponent("Save our SyncWorks Business Card");
    const body = encodeURIComponent(
      [
        "Hi,",
        "",
        `You can save our business card in SyncWorks using this code: ${businessCardCode}`,
        "",
        "Open SyncWorks → Business Cards → Add by Code",
        "",
        "Thanks!",
      ].join("\n")
    );
    return `mailto:?subject=${subject}&body=${body}`;
  }, [businessCardCode]);

  const socialLinks = useMemo(
    () =>
      getSocialLinks({
        facebookUrl,
        instagramUrl,
        linkedinUrl,
        googleBusinessUrl,
        youtubeUrl,
        tiktokUrl,
      }),
    [facebookUrl, googleBusinessUrl, instagramUrl, linkedinUrl, tiktokUrl, youtubeUrl]
  );

  const selectedServiceObjects = useMemo(() => {
    return servicesOffered.map((id) => serviceLabels[id]).filter(Boolean);
  }, [servicesOffered, serviceLabels]);

  const rootGroups = useMemo(() => {
    if (!rootPick?.id) return [];
    return getChildren(rootPick.id);
  }, [rootPick, allCategories]);

  useEffect(() => {
    if (!groupPick?.id) {
      setChildren([]);
      return;
    }
    setChildren(getChildren(groupPick.id));
  }, [groupPick, allCategories]);

  function chooseRoot(root) {
    setRootPick(root);
    setGroupPick(null);
    setChildren([]);
  }

  function chooseGroup(group) {
    setGroupPick(group);
  }

  function toggleService(id) {
    const nid = Number(id);
    if (!nid) return;

    const cat = findById(nid);
    if (!cat || !isLeaf(cat)) return;

    setServicesOffered((prev) => {
      const set = new Set(prev || []);
      if (set.has(nid)) set.delete(nid);
      else set.add(nid);
      const next = Array.from(set);
      loadLabels(next);
      return next;
    });
  }

  async function save() {
    setErr("");
    setOk("");

    if (!activeBiz?.id) {
      setErr("Select a business first.");
      return;
    }

    const emailTrim = String(businessEmail || "").trim();
    if (!emailTrim) {
      setErr("Business Email is required.");
      return;
    }

    const payload = {
      name: String(name || "").trim(),
      business_email: emailTrim,
      owner_name: String(ownerName || "").trim(),
      phone: String(phone || "").trim(),
      website: normalizeWebsite(website),
      headline: String(headline || "").trim(),
      services_text: String(servicesText || "").trim(),
      address: String(address || "").trim(),
      city: String(city || "").trim(),
      state: String(state || "").trim().toUpperCase(),
      base_zip: String(baseZip || "").trim(),
      service_radius_miles: Number(radius) || 25,
      accepts_marketplace_tickets: !!acceptsMarketplace,
      services_offered: servicesOffered.map((x) => Number(x)).filter(Boolean),
      business_presence_mode: String(businessPresenceMode || "").trim(),
      facebook_url: normalizeExternalUrl(facebookUrl),
      instagram_url: normalizeExternalUrl(instagramUrl),
      linkedin_url: normalizeExternalUrl(linkedinUrl),
      google_business_url: normalizeExternalUrl(googleBusinessUrl),
      youtube_url: normalizeExternalUrl(youtubeUrl),
      tiktok_url: normalizeExternalUrl(tiktokUrl),
      is_licensed: !!isLicensed,
      is_insured: !!isInsured,
      background_checked: !!backgroundChecked,
      is_bonded: !!isBonded,
      emergency_service: !!emergencyService,
    };

    setSaving(true);
    try {
      await api.patch(`/businesses/${activeBiz.id}/`, payload);
      const detail = await fetchBusinessDetail(activeBiz.id);
      setActiveBiz(detail || { ...(activeBiz || {}), ...payload });
      await loadLabels(payload.services_offered);
      setOk("Business settings saved.");
      await reloadBusinesses?.();
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

  async function saveServicesOnly() {
    setErr("");
    setOk("");

    if (!activeBiz?.id) {
      setErr("Select a business first.");
      return;
    }

    setSaving(true);
    try {
      await api.patch(`/businesses/${activeBiz.id}/`, {
        services_offered: servicesOffered.map((x) => Number(x)).filter(Boolean),
      });
      const detail = await fetchBusinessDetail(activeBiz.id);
      setActiveBiz(detail || activeBiz);
      await loadLabels(servicesOffered);
      setOk("Marketplace services saved.");
      await reloadBusinesses?.();
    } catch (e) {
      setErr(
        e?.response?.data?.detail ||
          JSON.stringify(e?.response?.data || {}) ||
          "Service save failed."
      );
    } finally {
      setSaving(false);
    }
  }

  async function onPickLogoFile(file) {
    if (!activeBiz?.id || !file) return;

    const isImg = String(file.type || "").startsWith("image/");
    if (!isImg) {
      setErr("Please choose an image file.");
      return;
    }

    const fd = new FormData();
    fd.append("logo", file);

    try {
      setErr("");
      setOk("");
      await api.patch(`/businesses/${activeBiz.id}/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const detail = await fetchBusinessDetail(activeBiz.id);
      setActiveBiz(detail || activeBiz);
      setLogoUrl(getBusinessLogoUrl(detail || activeBiz, logoUrl));
      setOk("Logo uploaded.");
      await reloadBusinesses?.();
    } catch (e) {
      setErr(
        e?.response?.data?.detail ||
          JSON.stringify(e?.response?.data || {}) ||
          "Logo upload failed."
      );
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(String(businessCardCode || ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-4">
      <Card
        title="SBO Business Settings"
        subtitle="These settings belong to the business profile. They power your business card, marketplace routing, and customer-facing provider details."
        right={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => nav(returnTo)}
              className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-700 hover:bg-slate-900 text-slate-100"
            >
              Back
            </button>

            <BusinessPicker />

            <button
              onClick={refreshBusinesses}
              className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-700 hover:bg-slate-900 text-slate-100"
              disabled={loading}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        }
      >
        {activeBusinessMissing ? (
          <div className="text-sm text-amber-100 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
            Pick your active business from the selector above.
          </div>
        ) : null}

        {err ? (
          <div className="mt-3 text-sm text-red-200 bg-red-900/20 border border-red-800 rounded-xl p-3">
            {err}
          </div>
        ) : null}

        {ok ? (
          <div className="mt-3 text-sm text-emerald-200 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
            {ok}
          </div>
        ) : null}

        {!activeBiz ? (
          <div className="text-sm text-slate-300 mt-3">No active business selected yet.</div>
        ) : null}

        {activeBiz ? (
          <div className="grid lg:grid-cols-2 gap-4 mt-4">
            <Card
              title="Business Profile"
              subtitle="Business identity, contact info, logo, trust profile, and business card details."
            >
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-24 w-24 rounded-2xl overflow-hidden border border-slate-700 bg-slate-950/60 flex items-center justify-center">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Business logo"
                        className="h-full w-full object-cover"
                        onError={() => {
                          setErr("Logo uploaded, but the image file is not being served correctly in production.");
                        }}
                      />
                    ) : (
                      <div className="text-xs text-slate-400 text-center px-2">No Logo</div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="rounded-xl px-4 py-2 text-sm font-semibold border border-cyan-500/35 bg-cyan-500/12 hover:bg-cyan-500/18 text-cyan-200"
                    >
                      Upload Logo
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onPickLogoFile(e.target.files?.[0])}
                    />
                    <SmallText>
                      This logo is used for the digital business card customers save.
                    </SmallText>
                  </div>
                </div>

                <Input label="Business Name" value={name} onChange={setName} placeholder="e.g. Jacob's Plumbing Co." />
                <Input
                  label="Business Email"
                  value={businessEmail}
                  onChange={setBusinessEmail}
                  placeholder="office@yourbusiness.com"
                  type="email"
                  hint="This is the business email, separate from the user account."
                />

                <div className="grid sm:grid-cols-2 gap-3">
                  <Input label="Owner / Contact Name" value={ownerName} onChange={setOwnerName} placeholder="Jacob Lord" />
                  <Input label="Phone" value={phone} onChange={setPhone} placeholder="555-123-4567" />
                </div>

                <Input
                  label="Website"
                  value={website}
                  onChange={setWebsite}
                  placeholder="yourbusiness.com"
                  hint="Customers can click this from the business card."
                />

                <div className="grid sm:grid-cols-2 gap-3">
                  <Input label="Facebook URL" value={facebookUrl} onChange={setFacebookUrl} placeholder="https://facebook.com/yourbusiness" />
                  <Input label="Instagram URL" value={instagramUrl} onChange={setInstagramUrl} placeholder="https://instagram.com/yourbusiness" />
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <Input label="LinkedIn URL" value={linkedinUrl} onChange={setLinkedinUrl} placeholder="https://linkedin.com/company/yourbusiness" />
                  <Input label="Google Business URL" value={googleBusinessUrl} onChange={setGoogleBusinessUrl} placeholder="https://g.page/yourbusiness" />
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <Input label="YouTube URL" value={youtubeUrl} onChange={setYoutubeUrl} placeholder="https://youtube.com/@yourbusiness" />
                  <Input label="TikTok URL" value={tiktokUrl} onChange={setTiktokUrl} placeholder="https://tiktok.com/@yourbusiness" />
                </div>

                <Select
                  label="Business Type / Presence"
                  value={businessPresenceMode}
                  onChange={setBusinessPresenceMode}
                  options={PRESENCE_OPTIONS}
                  hint="This shows up boldly on the customer-facing business card."
                />

                {businessPresenceMode ? (
                  <div className="rounded-2xl border border-slate-700 bg-slate-950/50 p-4">
                    <div className="text-xs text-slate-300 mb-3">Customer-facing badge preview</div>
                    <PresenceBadge mode={businessPresenceMode} />
                  </div>
                ) : null}

                <Input
                  label="Headline"
                  value={headline}
                  onChange={setHeadline}
                  placeholder="Fast, reliable HVAC and electrical service"
                  hint="Short customer-facing headline for the digital business card."
                />

                <Textarea
                  label="Services Summary"
                  value={servicesText}
                  onChange={setServicesText}
                  placeholder="Repairs, installs, diagnostics, maintenance, after-hours support..."
                  hint="Customer-facing description. Marketplace matching still uses the actual service tags below."
                />

                <Input label="Street Address" value={address} onChange={setAddress} placeholder="123 Main St" />

                <div className="grid sm:grid-cols-3 gap-3">
                  <Input label="City" value={city} onChange={setCity} placeholder="Montgomery" />
                  <Input label="State" value={state} onChange={setState} placeholder="AL" hint="Use 2-letter state code if possible." />
                  <Input label="Base ZIP" value={baseZip} onChange={setBaseZip} placeholder="36117" hint="Routing center point." />
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <Input
                    label="Service Radius (miles)"
                    value={radius}
                    onChange={setRadius}
                    placeholder="25"
                    type="number"
                    hint="Use 25, 50, 100, or any custom miles."
                  />

                  <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                    <div className="text-xs text-slate-200 font-medium">Marketplace Availability</div>
                    <div className="mt-3">
                      <Toggle
                        label={acceptsMarketplace ? "Accepting Marketplace Jobs" : "Marketplace Off"}
                        checked={acceptsMarketplace}
                        onChange={setAcceptsMarketplace}
                        hint="If off, this business will not receive marketplace jobs even if tags and ZIP are correct."
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                  <div className="font-semibold text-slate-100">Trust Signals</div>
                  <div className="text-xs text-slate-300 mt-1">These should show up correctly on customer-facing business cards.</div>

                  <div className="mt-4 space-y-3">
                    <Toggle label={isLicensed ? "Licensed" : "Not Licensed"} checked={isLicensed} onChange={setIsLicensed} />
                    <Toggle label={isInsured ? "Insured" : "Not Insured"} checked={isInsured} onChange={setIsInsured} />
                    <Toggle
                      label={backgroundChecked ? "Background Checked" : "Not Background Checked"}
                      checked={backgroundChecked}
                      onChange={setBackgroundChecked}
                    />
                    <Toggle label={isBonded ? "Bonded" : "Not Bonded"} checked={isBonded} onChange={setIsBonded} />
                    <Toggle
                      label={emergencyService ? "Emergency Service Enabled" : "Emergency Service Off"}
                      checked={emergencyService}
                      onChange={setEmergencyService}
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    onClick={save}
                    disabled={saving}
                    className={
                      "rounded-xl px-4 py-2 text-sm font-semibold border transition " +
                      (saving
                        ? "bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed"
                        : "bg-cyan-500/20 border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-200")
                    }
                  >
                    {saving ? "Saving…" : "Save Business Settings"}
                  </button>
                </div>
              </div>
            </Card>

            <div className="space-y-4">
              <Card
                title="Business Card Code + QR"
                subtitle="Customers can save this provider by scanning the QR or entering the SW-code."
                right={
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={copyCode}
                      className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-700 hover:bg-slate-900 text-slate-100"
                      disabled={!businessCardCode}
                    >
                      {copied ? "Copied ✅" : "Copy Code"}
                    </button>

                    <a
                      href={mailtoHref || "#"}
                      onClick={(e) => {
                        if (!mailtoHref) e.preventDefault();
                      }}
                      className={cx(
                        "text-xs rounded-xl px-3 py-2 border",
                        businessCardCode
                          ? "bg-cyan-500/15 border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-200"
                          : "bg-slate-950 border-slate-800 text-slate-500 pointer-events-none"
                      )}
                    >
                      Email Code
                    </a>
                  </div>
                }
              >
                <div className="grid md:grid-cols-[160px_1fr] gap-4 items-start">
                  <div className="rounded-2xl border border-slate-700 bg-white p-3 w-fit">
                    {qrValue ? <QRCodeSVG value={qrValue} size={128} /> : null}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-slate-300">Business Card Code</div>
                      <div className="mt-1 text-lg font-extrabold text-cyan-200 font-mono">{businessCardCode || "—"}</div>
                    </div>

                    <div className="text-sm text-slate-200">Share this with customers so they can save your business card in SyncWorks.</div>
                    <div className="text-[11px] text-slate-400">Warm email uses your business code and opens the user’s email app.</div>
                  </div>
                </div>
              </Card>

              <Card
                title="Marketplace Service Tags"
                subtitle="These tags control which customer requests hit this business in the marketplace."
                right={
                  <div className="flex gap-2">
                    <button
                      onClick={clearServices}
                      className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-700 hover:bg-slate-900 text-slate-100"
                    >
                      Clear
                    </button>
                    <button
                      onClick={loadTaxonomyOnly}
                      className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-700 hover:bg-slate-900 text-slate-100"
                    >
                      Reload Tags
                    </button>
                  </div>
                }
              >
                <div className="space-y-4">
                  {taxonomyError ? (
                    <div className="text-sm text-amber-100 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                      {taxonomyError}
                    </div>
                  ) : null}

                  <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-100">Selected Services</div>
                        <div className="text-xs text-slate-300 mt-1">These are the actual routing tags used for customer ticket matching.</div>
                      </div>
                      <div className="text-xs text-slate-300">{servicesOffered.length} selected</div>
                    </div>

                    {selectedServiceObjects.length === 0 ? (
                      <div className="mt-3 text-sm text-slate-300">No services selected yet.</div>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedServiceObjects.map((obj) => (
                          <button
                            key={obj.id}
                            type="button"
                            onClick={() => toggleService(obj.id)}
                            className="text-xs rounded-full px-3 py-2 border border-cyan-500/20 bg-cyan-500/10 hover:bg-cyan-500/15 text-cyan-100"
                            title="Click to remove"
                          >
                            {obj.path || obj.name} ✕
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
                    <div className="font-semibold text-slate-100">Search Services</div>
                    <div className="text-xs text-slate-300 mt-1">Search for the exact service task. Matching should use leaf tasks, not only broad groups.</div>

                    <input
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                      placeholder="plumbing, AC not cooling, brake replacement..."
                      className="mt-3 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                    />

                    <div className="mt-3 max-h-[260px] overflow-auto space-y-2 pr-1">
                      {searchResults.slice(0, 40).map((c) => {
                        const id = Number(c.id);
                        const leaf = isLeaf(c);
                        const checked = servicesOffered.includes(id);

                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              if (leaf) toggleService(id);
                            }}
                            className={
                              "w-full text-left rounded-xl border p-3 transition " +
                              (checked
                                ? "bg-cyan-500/10 border-cyan-500/20"
                                : "bg-slate-950 border-slate-800 hover:bg-slate-900")
                            }
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-semibold text-sm text-slate-100">
                                  {leaf ? "✅ " : "📁 "}
                                  {c.name}
                                </div>
                                <div className="text-[11px] text-slate-300 mt-1">{buildPath(c)}</div>
                              </div>
                              <div className="text-[10px] text-slate-400">{leaf ? (checked ? "Selected" : "Leaf") : "Group"}</div>
                            </div>
                          </button>
                        );
                      })}

                      {searchQ && searchResults.length === 0 ? (
                        <div className="text-sm text-slate-300">No results.</div>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
                      <div className="font-semibold text-slate-100">1) Pick Industry</div>
                      <div className="text-xs text-slate-300 mt-1">Start with the top-level service industry.</div>

                      {taxonomyLoading ? <div className="mt-3 text-sm text-slate-300">Loading industries…</div> : null}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {roots.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => chooseRoot(r)}
                            className={
                              "text-xs rounded-full px-3 py-2 border transition " +
                              (Number(rootPick?.id) === Number(r.id)
                                ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-200"
                                : "bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-100")
                            }
                          >
                            {r.name}
                          </button>
                        ))}
                      </div>

                      {!taxonomyLoading && roots.length === 0 ? (
                        <div className="mt-3 text-sm text-slate-300">No industries loaded.</div>
                      ) : null}

                      {rootPick ? (
                        <div className="mt-4">
                          <div className="text-xs text-slate-200 font-medium">2) Pick Group</div>
                          <div className="text-[11px] text-slate-400 mt-1">
                            In <span className="text-slate-200">{rootPick.name}</span>
                          </div>

                          <div className="mt-2 max-h-[240px] overflow-auto space-y-2 pr-1">
                            {rootGroups.map((g) => (
                              <button
                                key={g.id}
                                type="button"
                                onClick={() => chooseGroup(g)}
                                className={
                                  "w-full text-left rounded-xl border p-3 transition " +
                                  (Number(groupPick?.id) === Number(g.id)
                                    ? "bg-indigo-500/12 border-indigo-500/30 text-indigo-100"
                                    : "bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-100")
                                }
                              >
                                <div className="font-semibold text-sm">{g.name}</div>
                                <div className="text-[11px] text-slate-300 mt-1">{g.key}</div>
                              </button>
                            ))}

                            {rootGroups.length === 0 ? <div className="text-sm text-slate-300">No groups found.</div> : null}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
                      <div className="font-semibold text-slate-100">3) Pick Leaf Service</div>
                      <div className="text-xs text-slate-300 mt-1">Choose the exact atomic task customers request.</div>

                      <div className="mt-3 max-h-[360px] overflow-auto space-y-2 pr-1">
                        {children.map((c) => {
                          const id = Number(c.id);
                          const leaf = isLeaf(c);
                          const checked = servicesOffered.includes(id);

                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                if (leaf) toggleService(id);
                              }}
                              className={
                                "w-full text-left rounded-xl border p-3 transition " +
                                (checked
                                  ? "bg-cyan-500/10 border-cyan-500/20"
                                  : "bg-slate-950 border-slate-800 hover:bg-slate-900")
                              }
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="font-semibold text-sm text-slate-100">
                                    {leaf ? "✅ " : "📁 "}
                                    {c.name}
                                  </div>
                                  <div className="text-[11px] text-slate-300 mt-1">{buildPath(c)}</div>
                                </div>
                                <div className="text-[10px] text-slate-400">{leaf ? (checked ? "Selected" : "Tap") : "Group"}</div>
                              </div>
                            </button>
                          );
                        })}

                        {!groupPick ? <div className="text-sm text-slate-300">Pick a group on the left first.</div> : null}
                        {groupPick && children.length === 0 ? <div className="text-sm text-slate-300">No leaf services found.</div> : null}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={saveServicesOnly}
                    disabled={saving}
                    className={
                      "w-full rounded-xl px-4 py-3 text-sm font-semibold border transition " +
                      (saving
                        ? "bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed"
                        : "bg-cyan-500/20 border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-200")
                    }
                  >
                    {saving ? "Saving…" : "Save Marketplace + Services"}
                  </button>
                </div>
              </Card>

              <Card title="Customer Business Card Preview" subtitle="This is what customers should understand at a glance.">
                <div className="rounded-3xl border border-slate-800 bg-slate-950/55 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-wider text-slate-400">Business Card</div>
                      <div className="text-lg font-extrabold text-slate-100 truncate mt-1">{name || "Business Name"}</div>

                      {businessPresenceMode ? (
                        <div className="mt-3">
                          <PresenceBadge mode={businessPresenceMode} />
                        </div>
                      ) : null}

                      {headline ? <div className="text-sm text-cyan-200/90 mt-3">{headline}</div> : null}

                      {socialLinks.length ? (
                        <div className="mt-3">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-2">Socials</div>
                          <div className="flex gap-2 flex-wrap">
                            {socialLinks.map((item) => (
                              <SocialLinkPill key={item.key} href={item.url} label={item.label} short={item.short} />
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-4 flex gap-2 flex-wrap">
                        <span
                          className={
                            "text-[11px] px-3 py-1.5 rounded-full border font-semibold " +
                            (isLicensed
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                              : "bg-slate-950/60 border-slate-700 text-slate-400")
                          }
                        >
                          Licensed
                        </span>
                        <span
                          className={
                            "text-[11px] px-3 py-1.5 rounded-full border font-semibold " +
                            (isInsured
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                              : "bg-slate-950/60 border-slate-700 text-slate-400")
                          }
                        >
                          Insured
                        </span>
                        <span
                          className={
                            "text-[11px] px-3 py-1.5 rounded-full border font-semibold " +
                            (backgroundChecked
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                              : "bg-slate-950/60 border-slate-700 text-slate-400")
                          }
                        >
                          Checked
                        </span>
                      </div>

                      {servicesText ? (
                        <div className="text-sm text-slate-200 mt-3 leading-relaxed">{servicesText}</div>
                      ) : (
                        <div className="text-sm text-slate-400 mt-3">Add a short service summary so customers know what you offer.</div>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {city || state ? (
                          <span className="text-[11px] px-3 py-1.5 rounded-full border border-slate-700 bg-slate-950/70 text-slate-200">
                            {city || "City"}
                            {city && state ? ", " : ""}
                            {state || ""}
                          </span>
                        ) : null}

                        {baseZip ? (
                          <span className="text-[11px] px-3 py-1.5 rounded-full border border-slate-700 bg-slate-950/70 text-slate-200">
                            ZIP {baseZip}
                          </span>
                        ) : null}

                        {radius ? (
                          <span className="text-[11px] px-3 py-1.5 rounded-full border border-slate-700 bg-slate-950/70 text-slate-200">
                            Radius {radius} mi
                          </span>
                        ) : null}
                      </div>

                      {selectedServiceObjects.length ? (
                        <div className="mt-3">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-2">Routed For</div>
                          <div className="flex flex-wrap gap-2">
                            {selectedServiceObjects.slice(0, 6).map((obj) => (
                              <span
                                key={obj.id}
                                className="text-[11px] px-3 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-100"
                                title={obj.path}
                              >
                                {obj.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {customerFacingWebsite ? (
                        <div className="mt-3">
                          <a
                            href={customerFacingWebsite}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-cyan-300 hover:text-cyan-200 underline break-all"
                          >
                            {customerFacingWebsite}
                          </a>
                        </div>
                      ) : null}
                    </div>

                    <div className="shrink-0 w-[110px] h-[110px] rounded-2xl border border-slate-700 bg-slate-950/60 overflow-hidden">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Business logo" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-400 text-xs">Logo</div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}