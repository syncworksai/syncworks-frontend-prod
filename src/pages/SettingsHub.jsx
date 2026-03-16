import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ModeBar from "../components/ModeBar";
import { useAuth } from "../auth/AuthContext";
import api from "../api/client";

import CategoryWizard from "../components/upgrade/categories/CategoryWizard";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Card({ title, subtitle, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-5 shadow-[0_0_60px_rgba(0,0,0,0.30)]">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-base font-extrabold text-slate-100">{title}</div>
          {subtitle ? (
            <div className="text-xs text-slate-400 mt-1 leading-relaxed">{subtitle}</div>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-slate-300 font-semibold">{label}</div>
          {hint ? <div className="text-[11px] text-slate-500 mt-1">{hint}</div> : null}
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Input({ value, onChange, placeholder, mono = false, disabled = false, type = "text" }) {
  return (
    <input
      value={value}
      type={type}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className={cx(
        "w-full h-11 rounded-2xl border bg-slate-950/60 px-3 text-sm outline-none transition",
        disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-slate-900/40",
        "border-slate-800 focus:border-cyan-500/40",
        mono ? "font-mono" : ""
      )}
    />
  );
}

function Textarea({ value, onChange, placeholder }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm outline-none transition hover:bg-slate-900/40 focus:border-cyan-500/40"
    />
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange?.(!checked)}
      className={cx(
        "w-full h-11 rounded-2xl border px-3 text-sm font-semibold flex items-center justify-between transition",
        checked
          ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
          : "border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900/40"
      )}
      title={label}
    >
      <span>{label}</span>
      <span
        className={cx(
          "text-[11px] px-2 py-1 rounded-full border",
          checked ? "border-emerald-500/30 bg-emerald-500/10" : "border-slate-700 bg-slate-900/30"
        )}
      >
        {checked ? "YES" : "NO"}
      </span>
    </button>
  );
}

function CheckRow({ checked, onChange, label, hint }) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 cursor-pointer hover:bg-slate-900/30">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-1"
      />
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-100">{label}</div>
        {hint ? <div className="text-[11px] text-slate-500 mt-1">{hint}</div> : null}
      </div>
    </label>
  );
}

function CopyBtn({ value, label = "Copy" }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(String(value || ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-2xl px-4 py-2 text-sm font-semibold border border-cyan-500/35 bg-cyan-500/12 hover:bg-cyan-500/18 text-cyan-200"
      title="Copy to clipboard"
    >
      {copied ? "Copied ✅" : label}
    </button>
  );
}

function Modal({ open, title, subtitle, children, onClose, right }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[99999]">
      <div
        className="absolute inset-0 bg-black/65"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl rounded-3xl border border-slate-800 bg-slate-950 shadow-[0_0_120px_rgba(0,0,0,0.75)] overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-950">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base font-extrabold text-slate-100 truncate">{title}</div>
                {subtitle ? <div className="text-xs text-slate-400 mt-1">{subtitle}</div> : null}
              </div>
              <div className="flex items-center gap-2">
                {right || null}
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 px-4 rounded-2xl border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40 text-slate-200 text-sm font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 max-h-[78vh] overflow-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}

function safeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.value)) return data.value;
  return [];
}

function bizKey(bizId, suffix) {
  const id = bizId ? String(bizId) : "none";
  return `sw:biz:${id}:${suffix}`;
}

async function fetchCatsTry(paramsObj) {
  const tries = [
    () => api.get("/service-categories/", { params: paramsObj }),
    () => api.get("/service_categories/", { params: paramsObj }),
    () => api.get("/marketplace/service-categories/", { params: paramsObj }),
  ];
  let lastErr = null;
  for (const fn of tries) {
    try {
      const r = await fn();
      return safeList(r.data);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

async function fetchRoots() {
  try {
    return await fetchCatsTry({ roots: 1 });
  } catch {
    // ignore
  }
  try {
    return await fetchCatsTry({ parent: null });
  } catch {
    // ignore
  }
  try {
    return await fetchCatsTry({ level: 0 });
  } catch {
    // ignore
  }
  return [];
}

async function fetchChildren(parentId) {
  return await fetchCatsTry({ parent: parentId });
}

async function fetchSearch(q) {
  const query = String(q || "").trim();
  if (!query) return [];
  try {
    return await fetchCatsTry({ search: query });
  } catch {
    // ignore
  }
  try {
    return await fetchCatsTry({ q: query });
  } catch {
    // ignore
  }
  return [];
}

function parseMoney(x) {
  const s = String(x ?? "").replace(/[^\d.]/g, "");
  if (!s) return "";
  const n = Number(s);
  if (!Number.isFinite(n)) return "";
  return String(n);
}

function normalizeExternalUrl(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `https://${s}`;
}

function normalizeWebsite(v) {
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

function getSocialLinks(biz) {
  return [
    { key: "facebook", label: "Facebook", short: "f", url: normalizeExternalUrl(biz?.facebook_url) },
    { key: "instagram", label: "Instagram", short: "ig", url: normalizeExternalUrl(biz?.instagram_url) },
    { key: "linkedin", label: "LinkedIn", short: "in", url: normalizeExternalUrl(biz?.linkedin_url) },
    { key: "google", label: "Google", short: "g", url: normalizeExternalUrl(biz?.google_business_url) },
    { key: "youtube", label: "YouTube", short: "yt", url: normalizeExternalUrl(biz?.youtube_url) },
    { key: "tiktok", label: "TikTok", short: "tt", url: normalizeExternalUrl(biz?.tiktok_url) },
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
      className="inline-flex items-center justify-center min-w-[42px] h-10 px-3 rounded-2xl border border-slate-800 bg-slate-950/80 hover:bg-slate-900 text-slate-100 transition text-xs font-extrabold uppercase tracking-wide"
    >
      {short}
    </a>
  );
}

const PRESENCE_OPTIONS = [
  { value: "", label: "Select business type…" },
  { value: "online", label: "Online Business" },
  { value: "in_person", label: "In Person" },
  { value: "on_site", label: "On-Site Service" },
  { value: "hybrid", label: "Online + On-Site" },
];

export default function SettingsHub() {
  const nav = useNavigate();
  const loc = useLocation();
  const { user, mode, profiles, activeBusinessId, myBusinesses } = useAuth();

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [bizLoading, setBizLoading] = useState(false);
  const [bizSaving, setBizSaving] = useState(false);
  const [biz, setBiz] = useState(null);

  const [person, setPerson] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    profilePicUrl: "",
    allowSmsFromSbos: true,
  });

  const [compliance, setCompliance] = useState({
    is_licensed: false,
    is_insured: false,
    is_bonded: false,
    background_checked: false,
    emergency_service: false,
  });

  const fileRef = useRef(null);
  const [logoPreview, setLogoPreview] = useState("");

  const [servicesOpen, setServicesOpen] = useState(false);
  const [catLoading, setCatLoading] = useState(false);
  const [roots, setRoots] = useState([]);
  const [groups, setGroups] = useState([]);
  const [services, setServices] = useState([]);
  const [rootPick, setRootPick] = useState(null);
  const [groupPick, setGroupPick] = useState(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [catSearch, setCatSearch] = useState("");
  const [catSearchResults, setCatSearchResults] = useState([]);
  const [servicesPick, setServicesPick] = useState([]);
  const [selectedLeafObjects, setSelectedLeafObjects] = useState({});

  const [tab, setTab] = useState("ACCOUNT");

  const businessSelected = useMemo(() => {
    const n = parseInt(String(activeBusinessId || ""), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [activeBusinessId]);

  const hasMemberships = useMemo(
    () => (Array.isArray(myBusinesses) ? myBusinesses.length > 0 : false),
    [myBusinesses]
  );

  const eligible = useMemo(() => {
    return {
      CUSTOMER: true,
      SBO: hasMemberships,
      SALES: true,
      PM: hasMemberships,
      TENANT: true,
      INVESTOR: true,
      EMPLOYEE: true,
    };
  }, [hasMemberships]);

  function toastOk(s) {
    setErr("");
    setMsg(s || "Saved.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toastErr(s) {
    setMsg("");
    setErr(s || "Something went wrong.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const returnTo = useMemo(() => {
    const qs = new URLSearchParams(loc.search || "");
    const r = (qs.get("return") || "").trim();
    return r && r.startsWith("/") ? r : "/customer";
  }, [loc.search]);

  const profileKeys = useMemo(() => Object.keys(profiles || {}), [profiles]);

  const stripeStatus = useMemo(() => {
    const b = biz || {};
    const possible =
      b?.stripe_connected ??
      b?.is_stripe_connected ??
      b?.stripe_ready ??
      b?.stripe_account_id ??
      b?.stripe_connect_account_id ??
      null;

    if (typeof possible === "boolean") return possible ? "Connected ✅" : "Not connected";
    if (possible) return "Connected ✅";
    return "Unknown";
  }, [biz]);

  useEffect(() => {
    const u = user || {};
    const fullName = `${String(u.first_name || "").trim()} ${String(u.last_name || "").trim()}`
      .trim();
    setPerson((p) => ({
      ...p,
      name: fullName || u.name || u.username || "",
      email: u.email || "",
      phone: u.phone || u.phone_number || "",
      address: u.address || "",
      profilePicUrl: "",
      allowSmsFromSbos: true,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  async function loadBusiness() {
    if (!businessSelected) {
      setBiz(null);
      setLogoPreview("");
      return;
    }

    setBizLoading(true);
    setErr("");
    try {
      const res = await api.get(`/businesses/${businessSelected}/`);
      const b = res.data || null;
      setBiz(b);

      const remoteLogo = (b?.logo_url || b?.logoUrl || "").trim();
      const localLogo = (() => {
        try {
          return (localStorage.getItem(bizKey(businessSelected, "logo_dataurl")) || "").trim();
        } catch {
          return "";
        }
      })();
      setLogoPreview(remoteLogo || localLogo || "");

      try {
        const raw = localStorage.getItem(bizKey(businessSelected, "compliance"));
        const obj = raw ? JSON.parse(raw) : null;
        if (obj && typeof obj === "object") {
          setCompliance((c) => ({ ...c, ...obj }));
        } else {
          setCompliance({
            is_licensed: false,
            is_insured: false,
            is_bonded: false,
            background_checked: false,
            emergency_service: false,
          });
        }
      } catch {
        // ignore
      }

      try {
        const rawIds = localStorage.getItem(bizKey(businessSelected, "service_ids"));
        const rawMap = localStorage.getItem(bizKey(businessSelected, "service_map"));
        const ids = rawIds ? JSON.parse(rawIds) : [];
        const map = rawMap ? JSON.parse(rawMap) : {};
        if (Array.isArray(ids)) setServicesPick(ids);
        if (map && typeof map === "object") setSelectedLeafObjects(map);
      } catch {
        // ignore
      }
    } catch (e) {
      setBiz(null);
      toastErr(e?.response?.data?.detail || "Failed to load business.");
    } finally {
      setBizLoading(false);
    }
  }

  useEffect(() => {
    loadBusiness();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessSelected]);

  function persistComplianceLocal(next) {
    if (!businessSelected) return;
    try {
      localStorage.setItem(bizKey(businessSelected, "compliance"), JSON.stringify(next || {}));
    } catch {
      // ignore
    }
  }

  async function saveComplianceBestEffort(next) {
    if (!businessSelected) return;

    persistComplianceLocal(next);

    const payloads = [{ ...next }, { compliance: next }, { business_compliance: next }];

    for (const p of payloads) {
      try {
        await api.patch(`/businesses/${businessSelected}/`, p);
        break;
      } catch {
        // try next
      }
    }
  }

  async function onPickLogoFile(file) {
    if (!file) return;
    const isImg = String(file.type || "").startsWith("image/");
    if (!isImg) return toastErr("Please choose an image file.");

    const maxMB = 2.5;
    if (file.size > maxMB * 1024 * 1024) {
      return toastErr(`Image too large. Keep it under ~${maxMB}MB for now.`);
    }

    const dataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ""));
      r.onerror = () => reject(new Error("Failed reading file"));
      r.readAsDataURL(file);
    });

    setLogoPreview(dataUrl);
    try {
      if (businessSelected) localStorage.setItem(bizKey(businessSelected, "logo_dataurl"), dataUrl);
    } catch {
      // ignore
    }

    if (businessSelected) {
      try {
        const fd = new FormData();
        fd.append("logo", file);
        const res = await api.patch(`/businesses/${businessSelected}/`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setBiz(res.data || { ...(biz || {}) });
        toastOk("Logo uploaded ✅");
        return;
      } catch {
        // fallback below
      }
      toastOk("Logo updated ✅ (local preview). Wire multipart upload endpoint next.");
    }
  }

  function onToggleLeaf(id, obj) {
    setServicesPick((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      const has = list.includes(id);
      return has ? list.filter((x) => x !== id) : [...list, id];
    });
    if (obj && id) setSelectedLeafObjects((prev) => ({ ...(prev || {}), [id]: obj }));
  }

  function onRemoveLeaf(id) {
    setServicesPick((prev) => (Array.isArray(prev) ? prev.filter((x) => x !== id) : []));
  }

  function persistServicesLocal() {
    if (!businessSelected) return;
    try {
      localStorage.setItem(bizKey(businessSelected, "service_ids"), JSON.stringify(servicesPick || []));
      localStorage.setItem(
        bizKey(businessSelected, "service_map"),
        JSON.stringify(selectedLeafObjects || {})
      );
    } catch {
      // ignore
    }
  }

  async function saveServicesToBusiness() {
    if (!businessSelected) return toastErr("Select a business first.");
    persistServicesLocal();

    const ids = Array.isArray(servicesPick) ? servicesPick : [];
    const payloads = [{ services_offered: ids }];

    for (const p of payloads) {
      try {
        const res = await api.patch(`/businesses/${businessSelected}/`, p);
        if (res?.data) setBiz(res.data);
        toastOk("Services saved ✅ (used for marketplace matching)");
        setServicesOpen(false);
        return;
      } catch {
        // try next
      }
    }

    toastOk("Services saved ✅ (local). If PATCH failed, confirm BusinessViewSet allows updating services_offered.");
    setServicesOpen(false);
  }

  async function openServicesPicker() {
    if (!businessSelected) return toastErr("Select a business first (top bar).");
    setServicesOpen(true);
    setCatSearch("");
    setCatSearchResults([]);
    setWizardStep(0);
    setRootPick(null);
    setGroupPick(null);
    setGroups([]);
    setServices([]);

    setCatLoading(true);
    try {
      const r = await fetchRoots();
      setRoots(r);
    } catch (e) {
      toastErr(e?.response?.data?.detail || "Failed to load service categories.");
      setRoots([]);
    } finally {
      setCatLoading(false);
    }
  }

  async function onPickRoot(r) {
    setRootPick(r);
    setGroupPick(null);
    setServices([]);
    setWizardStep(1);

    setCatLoading(true);
    try {
      const kids = await fetchChildren(r.id);
      setGroups(kids);
    } catch {
      setGroups([]);
    } finally {
      setCatLoading(false);
    }
  }

  async function onPickGroup(g) {
    setGroupPick(g);
    setWizardStep(2);

    setCatLoading(true);
    try {
      const kids = await fetchChildren(g.id);
      setServices(kids);
    } catch {
      setServices([]);
    } finally {
      setCatLoading(false);
    }
  }

  async function onDrill(parent) {
    if (!parent?.id) return;

    if (!rootPick) {
      setRootPick(parent);
      setWizardStep(1);
      setCatLoading(true);
      try {
        const kids = await fetchChildren(parent.id);
        setGroups(kids);
      } catch {
        setGroups([]);
      } finally {
        setCatLoading(false);
      }
      return;
    }

    setGroupPick(parent);
    setWizardStep(2);
    setCatLoading(true);
    try {
      const kids = await fetchChildren(parent.id);
      setServices(kids);
    } catch {
      setServices([]);
    } finally {
      setCatLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    const q = String(catSearch || "").trim();
    if (!servicesOpen) return;
    if (!q) {
      setCatSearchResults([]);
      return;
    }

    const t = setTimeout(async () => {
      try {
        const r = await fetchSearch(q);
        if (alive) setCatSearchResults(r);
      } catch {
        if (alive) setCatSearchResults([]);
      }
    }, 220);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [catSearch, servicesOpen]);

  async function saveBusinessBlocks() {
    if (!businessSelected) return toastErr("Select a business first.");
    setBizSaving(true);
    setErr("");
    setMsg("");

    const gross = parseMoney(biz?.expected_gross_monthly ?? biz?.monthly_gross_estimate ?? "");

    const basePayload = {
      name: biz?.name || "",
      business_email: biz?.business_email || "",
      phone: biz?.phone || "",
      website: normalizeWebsite(biz?.website || ""),
      owner_name: biz?.owner_name || "",

      address: biz?.address || "",
      city: biz?.city || "",
      state: String(biz?.state || "").toUpperCase(),
      base_zip: biz?.base_zip || "",
      service_radius_miles: Number(biz?.service_radius_miles ?? 25),

      headline: biz?.headline || "",
      services_text: biz?.services_text || "",
      accepts_marketplace_tickets: !!biz?.accepts_marketplace_tickets,

      services_offered: Array.isArray(servicesPick) ? servicesPick : [],

      business_presence_mode: biz?.business_presence_mode || "",
      facebook_url: normalizeExternalUrl(biz?.facebook_url || ""),
      instagram_url: normalizeExternalUrl(biz?.instagram_url || ""),
      linkedin_url: normalizeExternalUrl(biz?.linkedin_url || ""),
      google_business_url: normalizeExternalUrl(biz?.google_business_url || ""),
      youtube_url: normalizeExternalUrl(biz?.youtube_url || ""),
      tiktok_url: normalizeExternalUrl(biz?.tiktok_url || ""),
    };

    const tryPayloads = [];
    if (gross !== "") {
      tryPayloads.push({ ...basePayload, expected_gross_monthly: Number(gross) });
      tryPayloads.push({ ...basePayload, monthly_gross_estimate: Number(gross) });
    } else {
      tryPayloads.push(basePayload);
    }

    try {
      let lastErr = null;
      for (const p of tryPayloads) {
        try {
          const res = await api.patch(`/businesses/${businessSelected}/`, p);
          setBiz(res.data || { ...(biz || {}), ...p });
          await saveComplianceBestEffort(compliance);
          toastOk("Business settings saved ✅");
          setBizSaving(false);
          return;
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr;
    } catch (e) {
      toastErr(
        e?.response?.data?.detail ||
          JSON.stringify(e?.response?.data || {}) ||
          "Failed to save business settings."
      );
    } finally {
      setBizSaving(false);
    }
  }

  const tabs = useMemo(
    () => [
      { key: "ACCOUNT", label: "Account", icon: "👤" },
      { key: "CUSTOMER", label: "Customer", icon: "🧾" },
      { key: "SBO", label: "SBO", icon: "🏢" },
      { key: "SALES", label: "Sales OS", icon: "📈" },
      { key: "PM", label: "PM", icon: "🏠" },
      { key: "TENANT", label: "Tenant", icon: "🔑" },
      { key: "INVESTOR", label: "Investor", icon: "💼" },
      { key: "EMPLOYEE", label: "Employee", icon: "🧰" },
    ],
    []
  );

  function handleTabClick(key) {
    if (key === "SBO" || key === "PM" || key === "SALES") {
      if (!eligible[key]) {
        nav("/upgrade");
        return;
      }
      setTab(key);
      return;
    }

    if (key === "TENANT" || key === "INVESTOR" || key === "EMPLOYEE") {
      if (!hasMemberships) {
        nav("/connect");
        return;
      }
      setTab(key);
      return;
    }

    setTab(key);
  }

  const servicesCount = useMemo(
    () => (Array.isArray(servicesPick) ? servicesPick.length : 0),
    [servicesPick]
  );

  const socialLinks = useMemo(() => getSocialLinks(biz || {}), [biz]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar title="SyncWorks" subtitle="Settings" />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-2xl font-extrabold tracking-tight">Settings</div>
            <div className="text-sm text-slate-400 mt-1">
              Profile + module settings. Tabs route you to the right place.
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Link
              to={returnTo}
              className="rounded-2xl px-4 py-2 text-sm border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40"
            >
              Back
            </Link>

            <button
              type="button"
              onClick={() => nav("/profile")}
              className="rounded-2xl px-4 py-2 text-sm font-semibold border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40"
              title="Security + billing snapshot"
            >
              Profile
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-3">
          <div className="flex gap-2 flex-wrap">
            {tabs.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => handleTabClick(t.key)}
                  className={cx(
                    "px-3 py-2 rounded-2xl text-xs border transition",
                    active
                      ? "bg-cyan-500/12 border-cyan-500/35 text-cyan-200"
                      : "bg-slate-950/60 border-slate-800 text-slate-200 hover:bg-slate-900/40"
                  )}
                >
                  <span className="mr-2">{t.icon}</span>
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="mt-2 text-[11px] text-slate-500 px-1">
            Locked modules auto-route: SBO/PM/Sales → Upgrade, Tenant/Investor/Employee → Connect code.
          </div>
        </div>

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

        {tab === "ACCOUNT" ? (
          <>
            <Card
              title="Account"
              subtitle="Identity + session"
              right={
                <div className="text-[11px] px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-200">
                  Mode: {mode || "—"}
                </div>
              }
            >
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Signed-in user" hint="Read-only display.">
                  <Input
                    value={`${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.username || "—"}
                    onChange={() => {}}
                    disabled
                  />
                </Field>

                <Field label="Email (login)" hint="Read-only display.">
                  <Input value={user?.email || user?.username || "—"} onChange={() => {}} disabled mono />
                </Field>

                <Field label="Password" hint="Change password in Profile → Security.">
                  <button
                    type="button"
                    onClick={() => nav("/profile")}
                    className="w-full h-11 rounded-2xl border border-cyan-500/35 bg-cyan-500/12 hover:bg-cyan-500/18 text-cyan-200 text-sm font-semibold"
                  >
                    Open Security (Change Password)
                  </button>
                </Field>

                <Field label="Danger zone" hint="Wire these later (safe placeholders).">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => toastErr("Logout-all-devices endpoint not wired yet.")}
                      className="h-11 rounded-2xl border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40 text-slate-200 text-sm font-semibold"
                    >
                      Logout all devices
                    </button>
                    <button
                      type="button"
                      onClick={() => toastErr("Delete-account endpoint not wired yet.")}
                      className="h-11 rounded-2xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/15 text-rose-200 text-sm font-semibold"
                    >
                      Delete account
                    </button>
                  </div>
                </Field>
              </div>
            </Card>

            <Card
              title="Profiles"
              subtitle="Read-only snapshot from /auth/me/."
              right={
                <div className="text-[11px] px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-200">
                  {profileKeys.length} profiles
                </div>
              }
            >
              {profileKeys.length === 0 ? (
                <div className="text-sm text-slate-400">No profiles found on /auth/me/.</div>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {profileKeys.map((k) => (
                    <Field key={k} label={k} hint="JSON snapshot (read-only).">
                      <pre className="text-[11px] leading-relaxed whitespace-pre-wrap break-words rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-slate-200">
                        {JSON.stringify(profiles?.[k] || {}, null, 2)}
                      </pre>
                    </Field>
                  ))}
                </div>
              )}
            </Card>
          </>
        ) : null}

        {tab === "CUSTOMER" ? (
          <Card
            title="Customer Settings"
            subtitle="Personal preferences + payments. (MVP local; wire backend later)"
            right={
              <button
                type="button"
                onClick={() => nav("/connect")}
                className="rounded-2xl px-4 py-2 text-sm font-semibold border border-emerald-500/35 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-200"
              >
                Payment Setup
              </button>
            }
          >
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Name">
                <Input
                  value={person.name}
                  onChange={(v) => setPerson((p) => ({ ...p, name: v }))}
                  placeholder="Your full name"
                />
              </Field>
              <Field label="Email">
                <Input
                  value={person.email}
                  onChange={(v) => setPerson((p) => ({ ...p, email: v }))}
                  placeholder="you@email.com"
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={person.phone}
                  onChange={(v) => setPerson((p) => ({ ...p, phone: v }))}
                  placeholder="(555) 555-5555"
                />
              </Field>
              <Field label="Address">
                <Input
                  value={person.address}
                  onChange={(v) => setPerson((p) => ({ ...p, address: v }))}
                  placeholder="123 Main St, City, ST"
                />
              </Field>
              <Field label="Allow SMS from businesses">
                <Toggle
                  checked={!!person.allowSmsFromSbos}
                  onChange={(v) => setPerson((p) => ({ ...p, allowSmsFromSbos: !!v }))}
                  label={person.allowSmsFromSbos ? "SMS allowed" : "SMS blocked"}
                />
              </Field>
              <Field label="Profile photo URL (optional)">
                <Input
                  value={person.profilePicUrl}
                  onChange={(v) => setPerson((p) => ({ ...p, profilePicUrl: v }))}
                  placeholder="https://..."
                  mono
                />
              </Field>
            </div>

            <div className="mt-4 text-[11px] text-slate-500">
              Next: wire this into PATCH /auth/me/ (or a dedicated /profile endpoint) and store it server-side.
            </div>
          </Card>
        ) : null}

        {tab === "SBO" ? (
          <Card
            title="SBO Settings"
            subtitle="Business profile, social links, business card display, marketplace eligibility, and matching rules."
            right={
              <button
                type="button"
                onClick={saveBusinessBlocks}
                disabled={bizSaving}
                className={cx(
                  "rounded-2xl px-4 py-2 text-sm font-semibold border transition",
                  bizSaving
                    ? "bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-cyan-500/12 border-cyan-500/35 hover:bg-cyan-500/18 text-cyan-200"
                )}
              >
                {bizSaving ? "Saving..." : "Save"}
              </button>
            }
          >
            {!businessSelected ? (
              <div className="text-sm text-slate-400">
                Select a business (top bar) to edit SBO settings.
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => nav("/upgrade")}
                    className="rounded-2xl px-4 py-2 bg-indigo-500/20 border border-indigo-500/40 hover:bg-indigo-500/30 text-sm"
                  >
                    Go to Upgrade
                  </button>
                </div>
              </div>
            ) : bizLoading ? (
              <div className="text-sm text-slate-400">Loading business…</div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 gap-3">
                  <Field label="Business name">
                    <Input
                      value={biz?.name || ""}
                      onChange={(v) => setBiz((b) => ({ ...(b || {}), name: v }))}
                      placeholder="Acme Services LLC"
                    />
                  </Field>

                  <Field label="Logo upload" hint="Tries multipart upload to Business.logo; falls back to local preview.">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden shrink-0">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-slate-500 text-xs">—</div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="h-11 px-4 rounded-2xl border border-cyan-500/35 bg-cyan-500/12 hover:bg-cyan-500/18 text-cyan-200 text-sm font-semibold"
                          >
                            Upload image
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLogoPreview("");
                              try {
                                localStorage.removeItem(bizKey(businessSelected, "logo_dataurl"));
                              } catch {
                                // ignore
                              }
                              toastOk("Logo cleared (local). Upload to persist.");
                            }}
                            className="h-11 px-4 rounded-2xl border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40 text-slate-200 text-sm font-semibold"
                          >
                            Clear
                          </button>
                        </div>
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => onPickLogoFile(e.target.files?.[0])}
                        />
                        <div className="mt-2 text-[11px] text-slate-500">
                          Stripe Connect: <span className="text-slate-200 font-semibold">{stripeStatus}</span>
                        </div>
                      </div>
                    </div>
                  </Field>

                  <Field label="Business email">
                    <Input
                      value={biz?.business_email || ""}
                      onChange={(v) => setBiz((b) => ({ ...(b || {}), business_email: v }))}
                      placeholder="billing@yourbusiness.com"
                    />
                  </Field>

                  <Field label="Phone">
                    <Input
                      value={biz?.phone || ""}
                      onChange={(v) => setBiz((b) => ({ ...(b || {}), phone: v }))}
                      placeholder="(555) 555-5555"
                    />
                  </Field>

                  <Field label="Website">
                    <Input
                      value={biz?.website || ""}
                      onChange={(v) => setBiz((b) => ({ ...(b || {}), website: v }))}
                      placeholder="https://yourbusiness.com"
                    />
                  </Field>

                  <Field label="Owner / Contact name">
                    <Input
                      value={biz?.owner_name || ""}
                      onChange={(v) => setBiz((b) => ({ ...(b || {}), owner_name: v }))}
                      placeholder="Jacob Lord"
                    />
                  </Field>
                </div>

                <div className="mt-3">
                  <div className="text-xs text-slate-400 mb-2 px-1">Social Media</div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <Field label="Facebook URL">
                      <Input
                        value={biz?.facebook_url || ""}
                        onChange={(v) => setBiz((b) => ({ ...(b || {}), facebook_url: v }))}
                        placeholder="https://facebook.com/yourbusiness"
                      />
                    </Field>

                    <Field label="Instagram URL">
                      <Input
                        value={biz?.instagram_url || ""}
                        onChange={(v) => setBiz((b) => ({ ...(b || {}), instagram_url: v }))}
                        placeholder="https://instagram.com/yourbusiness"
                      />
                    </Field>

                    <Field label="LinkedIn URL">
                      <Input
                        value={biz?.linkedin_url || ""}
                        onChange={(v) => setBiz((b) => ({ ...(b || {}), linkedin_url: v }))}
                        placeholder="https://linkedin.com/company/yourbusiness"
                      />
                    </Field>

                    <Field label="Google Business URL">
                      <Input
                        value={biz?.google_business_url || ""}
                        onChange={(v) => setBiz((b) => ({ ...(b || {}), google_business_url: v }))}
                        placeholder="https://g.page/yourbusiness"
                      />
                    </Field>

                    <Field label="YouTube URL">
                      <Input
                        value={biz?.youtube_url || ""}
                        onChange={(v) => setBiz((b) => ({ ...(b || {}), youtube_url: v }))}
                        placeholder="https://youtube.com/@yourbusiness"
                      />
                    </Field>

                    <Field label="TikTok URL">
                      <Input
                        value={biz?.tiktok_url || ""}
                        onChange={(v) => setBiz((b) => ({ ...(b || {}), tiktok_url: v }))}
                        placeholder="https://tiktok.com/@yourbusiness"
                      />
                    </Field>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-xs text-slate-400 mb-2 px-1">Address</div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <Field label="Street address">
                      <Input
                        value={biz?.address || ""}
                        onChange={(v) => setBiz((b) => ({ ...(b || {}), address: v }))}
                        placeholder="123 Main St"
                      />
                    </Field>

                    <Field label="Base ZIP">
                      <Input
                        value={biz?.base_zip || ""}
                        onChange={(v) => setBiz((b) => ({ ...(b || {}), base_zip: v }))}
                        placeholder="36117"
                        mono
                      />
                    </Field>

                    <Field label="City">
                      <Input
                        value={biz?.city || ""}
                        onChange={(v) => setBiz((b) => ({ ...(b || {}), city: v }))}
                        placeholder="Montgomery"
                      />
                    </Field>

                    <Field label="State">
                      <Input
                        value={biz?.state || ""}
                        onChange={(v) => setBiz((b) => ({ ...(b || {}), state: String(v || "").toUpperCase() }))}
                        placeholder="AL"
                        mono
                      />
                    </Field>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-xs text-slate-400 mb-2 px-1">Business Type / Visibility</div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <Field label="Business presence mode" hint='Shows boldly on the customer-facing business card.'>
                      <select
                        value={biz?.business_presence_mode || ""}
                        onChange={(e) =>
                          setBiz((b) => ({ ...(b || {}), business_presence_mode: e.target.value }))
                        }
                        className="w-full h-11 rounded-2xl border border-slate-800 bg-slate-950/60 px-3 text-sm outline-none transition hover:bg-slate-900/40 focus:border-cyan-500/40"
                      >
                        {PRESENCE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value} className="bg-slate-950 text-slate-100">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Presence badge preview">
                      <div className="min-h-[44px] flex items-center">
                        {biz?.business_presence_mode ? (
                          <PresenceBadge mode={biz?.business_presence_mode} />
                        ) : (
                          <div className="text-sm text-slate-500">Choose a business type above.</div>
                        )}
                      </div>
                    </Field>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-xs text-slate-400 mb-2 px-1">Marketplace</div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <Field label="Marketplace visibility" hint="If off, you won't appear in open requests.">
                      <Toggle
                        checked={!!biz?.accepts_marketplace_tickets}
                        onChange={(v) => setBiz((b) => ({ ...(b || {}), accepts_marketplace_tickets: !!v }))}
                        label={biz?.accepts_marketplace_tickets ? "Accepting jobs" : "Not accepting jobs"}
                      />
                    </Field>

                    <Field label="Service radius (miles)">
                      <Input
                        value={String(biz?.service_radius_miles ?? 25)}
                        onChange={(v) => setBiz((b) => ({ ...(b || {}), service_radius_miles: v }))}
                        placeholder="25"
                        mono
                        type="number"
                      />
                    </Field>

                    <Field label="Services (matching)" hint="This powers ticket matching: service + ZIP + radius.">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="text-sm text-slate-200">
                          Selected: <span className="font-extrabold text-cyan-200">{servicesCount}</span>
                        </div>
                        <button
                          type="button"
                          onClick={openServicesPicker}
                          className="h-11 px-4 rounded-2xl border border-cyan-500/35 bg-cyan-500/12 hover:bg-cyan-500/18 text-cyan-200 text-sm font-semibold"
                        >
                          Edit services
                        </button>
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500">
                        Keep it tight to avoid flooding your marketplace queue.
                      </div>
                    </Field>

                    <Field label="Headline (Business Card)">
                      <Input
                        value={biz?.headline || ""}
                        onChange={(v) => setBiz((b) => ({ ...(b || {}), headline: v }))}
                        placeholder="Fast, reliable HVAC & electrical"
                      />
                    </Field>

                    <Field label="Services text (Business Card copy)" hint="Marketing copy only. Matching uses selected services above.">
                      <Textarea
                        value={biz?.services_text || ""}
                        onChange={(v) => setBiz((b) => ({ ...(b || {}), services_text: v }))}
                        placeholder="AC repair • installs • diagnostics • maintenance plans"
                      />
                    </Field>

                    <Field label="Expected gross monthly" hint="Local-only unless backend field exists">
                      <Input
                        value={String(biz?.expected_gross_monthly ?? biz?.monthly_gross_estimate ?? "")}
                        onChange={(v) =>
                          setBiz((b) => ({
                            ...(b || {}),
                            expected_gross_monthly: v,
                            monthly_gross_estimate: v,
                          }))
                        }
                        placeholder="2500"
                        type="number"
                        mono
                      />
                    </Field>

                    <Field label="Business card code (SW-...)" hint="Customers can enter this to save you.">
                      <div className="flex gap-2">
                        <Input value={biz?.business_card_code || "—"} onChange={() => {}} disabled mono />
                        <CopyBtn value={biz?.business_card_code || ""} />
                      </div>
                    </Field>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-xs text-slate-400 mb-2 px-1">Compliance (Yes/No)</div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <CheckRow
                      checked={compliance.is_licensed}
                      onChange={(v) => {
                        const next = { ...compliance, is_licensed: v };
                        setCompliance(next);
                        persistComplianceLocal(next);
                      }}
                      label="Licensed"
                      hint="Used for trust badges + filtering later."
                    />
                    <CheckRow
                      checked={compliance.is_insured}
                      onChange={(v) => {
                        const next = { ...compliance, is_insured: v };
                        setCompliance(next);
                        persistComplianceLocal(next);
                      }}
                      label="Insured"
                      hint="Used for business cards + ticket trust signals."
                    />
                    <CheckRow
                      checked={compliance.is_bonded}
                      onChange={(v) => {
                        const next = { ...compliance, is_bonded: v };
                        setCompliance(next);
                        persistComplianceLocal(next);
                      }}
                      label="Bonded"
                      hint="Optional badge for certain industries."
                    />
                    <CheckRow
                      checked={compliance.background_checked}
                      onChange={(v) => {
                        const next = { ...compliance, background_checked: v };
                        setCompliance(next);
                        persistComplianceLocal(next);
                      }}
                      label="Background checked"
                      hint="Controls eligibility for some ticket types later."
                    />
                    <CheckRow
                      checked={compliance.emergency_service}
                      onChange={(v) => {
                        const next = { ...compliance, emergency_service: v };
                        setCompliance(next);
                        persistComplianceLocal(next);
                      }}
                      label="Offers emergency service"
                      hint="Used for urgent ticket routing."
                    />
                  </div>

                  <div className="mt-3 text-[11px] text-slate-500">
                    These save locally now; when backend fields exist, we’ll persist them on the Business model.
                  </div>
                </div>

                <div className="mt-4">
                  <Card
                    title="Customer Business Card Preview"
                    subtitle="This is what customers should understand at a glance."
                  >
                    <div className="rounded-3xl border border-slate-800 bg-slate-950/55 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs uppercase tracking-wider text-slate-500">Business Card</div>
                          <div className="text-lg font-extrabold text-slate-100 truncate mt-1">
                            {biz?.name || "Business Name"}
                          </div>

                          {biz?.business_presence_mode ? (
                            <div className="mt-3">
                              <PresenceBadge mode={biz?.business_presence_mode} />
                            </div>
                          ) : null}

                          {biz?.headline ? (
                            <div className="text-sm text-cyan-200/90 mt-3">{biz.headline}</div>
                          ) : null}

                          {socialLinks.length ? (
                            <div className="mt-3">
                              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-2">
                                Socials
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                {socialLinks.map((item) => (
                                  <SocialLinkPill
                                    key={item.key}
                                    href={item.url}
                                    label={item.label}
                                    short={item.short}
                                  />
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {biz?.services_text ? (
                            <div className="text-sm text-slate-300 mt-3 leading-relaxed">{biz.services_text}</div>
                          ) : (
                            <div className="text-sm text-slate-500 mt-3">
                              Add a short service summary so customers know what you offer.
                            </div>
                          )}

                          <div className="mt-3 flex flex-wrap gap-2">
                            {biz?.city || biz?.state ? (
                              <span className="text-[11px] px-3 py-1.5 rounded-full border border-slate-800 bg-slate-950/70 text-slate-200">
                                {biz?.city || "City"}
                                {biz?.city && biz?.state ? ", " : ""}
                                {biz?.state || ""}
                              </span>
                            ) : null}

                            {biz?.base_zip ? (
                              <span className="text-[11px] px-3 py-1.5 rounded-full border border-slate-800 bg-slate-950/70 text-slate-200">
                                ZIP {biz.base_zip}
                              </span>
                            ) : null}

                            {biz?.service_radius_miles ? (
                              <span className="text-[11px] px-3 py-1.5 rounded-full border border-slate-800 bg-slate-950/70 text-slate-200">
                                Radius {biz.service_radius_miles} mi
                              </span>
                            ) : null}
                          </div>

                          {biz?.website ? (
                            <div className="mt-3">
                              <a
                                href={normalizeWebsite(biz.website)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm text-cyan-300 hover:text-cyan-200 underline break-all"
                              >
                                {normalizeWebsite(biz.website)}
                              </a>
                            </div>
                          ) : null}
                        </div>

                        <div className="shrink-0 w-[110px] h-[110px] rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden">
                          {logoPreview ? (
                            <img src={logoPreview} alt="Business logo" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-slate-500 text-xs">
                              Logo
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </>
            )}
          </Card>
        ) : null}

        {tab === "SALES" ? (
          <Card
            title="Sales OS Settings"
            subtitle="This tab routes to your dedicated settings page (keeps SettingsHub lightweight)."
            right={
              <button
                type="button"
                onClick={() => nav("/sales/settings")}
                className="rounded-2xl px-4 py-2 text-sm font-semibold border border-cyan-500/35 bg-cyan-500/12 hover:bg-cyan-500/18 text-cyan-200"
              >
                Open Sales OS Settings
              </button>
            }
          >
            <div className="text-sm text-slate-300">
              Sales OS already has a clean settings page. Keep module-specific settings in their own pages.
              <div className="text-[11px] text-slate-500 mt-2">This hub is the router, not the dumping ground.</div>
            </div>
          </Card>
        ) : null}

        {tab === "PM" ? (
          <Card
            title="Property Management Settings"
            subtitle="Routes to PM settings page."
            right={
              <button
                type="button"
                onClick={() => nav("/pm/settings")}
                className="rounded-2xl px-4 py-2 text-sm font-semibold border border-cyan-500/35 bg-cyan-500/12 hover:bg-cyan-500/18 text-cyan-200"
              >
                Open PM Settings
              </button>
            }
          >
            <div className="text-sm text-slate-300">
              PM settings is already structured (Profile / Notifications / Defaults). We keep it separate so it doesn’t bloat the hub.
            </div>
          </Card>
        ) : null}

        {tab === "TENANT" || tab === "INVESTOR" || tab === "EMPLOYEE" ? (
          <Card
            title={`${tab === "TENANT" ? "Tenant" : tab === "INVESTOR" ? "Investor" : "Employee"} Access`}
            subtitle="These roles typically enter via an invite code."
            right={
              <button
                type="button"
                onClick={() => nav("/connect")}
                className="rounded-2xl px-4 py-2 text-sm font-semibold border border-emerald-500/35 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-200"
              >
                Enter Invite Code
              </button>
            }
          >
            <div className="text-sm text-slate-300">
              If you’re here without an invite link/code, you’ll be routed to Connect to attach your role to the correct business/property.
            </div>
          </Card>
        ) : null}

        <div className="text-[11px] text-slate-500 px-1">
          Marketplace logic depends on: <span className="text-slate-300">services + ZIP + radius</span>. This hub ensures businesses configure those correctly.
        </div>
      </div>

      <Modal
        open={servicesOpen}
        onClose={() => setServicesOpen(false)}
        title="Select Services"
        subtitle="This powers marketplace matching: service + ZIP + radius."
        right={
          <button
            type="button"
            onClick={saveServicesToBusiness}
            className="h-10 px-4 rounded-2xl border border-emerald-500/35 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-200 text-sm font-semibold"
          >
            Save services
          </button>
        }
      >
        <CategoryWizard
          businessSelected={!!businessSelected}
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
          selectedLeafObjects={selectedLeafObjects}
          setSelectedLeafObjects={setSelectedLeafObjects}
          onPickRoot={onPickRoot}
          onPickGroup={onPickGroup}
          onDrill={onDrill}
          onToggleLeaf={onToggleLeaf}
          onRemoveLeaf={onRemoveLeaf}
          onGoReview={() => setWizardStep(3)}
        />
      </Modal>
    </div>
  );
}