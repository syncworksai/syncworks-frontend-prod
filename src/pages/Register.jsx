import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import api from "../api/client";
import {
  captureAffiliateCodeFromLocation,
  getStoredAffiliateCode,
  normalizeAffiliateCode,
  storeAffiliateCode,
} from "../api/platformAffiliates";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Pill({ children, tone = "slate" }) {
  const cls =
    tone === "cyan"
      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
      : tone === "fuchsia"
      ? "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200"
      : tone === "indigo"
      ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-200"
      : tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : tone === "amber"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
      : "border-slate-800 bg-slate-950/50 text-slate-200";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2 py-1 text-[11px]",
        cls
      )}
    >
      {children}
    </span>
  );
}

function Feature({ title, desc }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="text-sm font-semibold text-slate-100">{title}</div>
      <div className="mt-1 text-sm leading-relaxed text-slate-400">{desc}</div>
    </div>
  );
}

function Step({ n, title, desc }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/70 text-sm font-extrabold text-slate-200">
          {n}
        </div>
        <div className="text-sm font-semibold text-slate-100">{title}</div>
      </div>
      <div className="mt-2 text-sm leading-relaxed text-slate-300">{desc}</div>
    </div>
  );
}

function Modal({ open, onClose, title, subtitle, children }) {
  useEffect(() => {
    if (!open) return;

    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-[0_0_90px_rgba(0,0,0,0.55)] backdrop-blur">
          <div className="pointer-events-none absolute -inset-20 bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-fuchsia-500/10 blur-3xl" />
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-extrabold text-slate-100">
                  {title}
                </div>
                {subtitle ? (
                  <div className="mt-1 text-xs text-slate-400">
                    {subtitle}
                  </div>
                ) : null}
              </div>

              <button
                onClick={onClose}
                className="h-10 w-10 rounded-2xl border border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900/40"
                title="Close"
                type="button"
              >
                ✕
              </button>
            </div>

            <div className="mt-5">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Drawer({ open, onClose, title, subtitle, children }) {
  useEffect(() => {
    if (!open) return;

    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 flex w-full justify-end sm:w-auto">
        <div className="relative h-full w-full overflow-y-auto border-l border-cyan-500/20 bg-[#020617]/96 p-4 shadow-[0_0_100px_rgba(34,211,238,0.16)] backdrop-blur-xl sm:w-[520px] sm:p-6">
          <div className="pointer-events-none absolute -inset-20 bg-gradient-to-br from-cyan-500/10 via-fuchsia-500/8 to-purple-500/10 blur-3xl" />

          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Pill tone="cyan">Business signup</Pill>
                  <Pill tone="emerald">No business ID required</Pill>
                </div>

                <div className="mt-3 text-2xl font-black text-white">
                  {title}
                </div>

                {subtitle ? (
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    {subtitle}
                  </div>
                ) : null}
              </div>

              <button
                onClick={onClose}
                className="h-10 w-10 shrink-0 rounded-2xl border border-slate-800 bg-slate-950/70 text-slate-200 hover:bg-slate-900"
                type="button"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-5">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PriceCard({ title, price, sub, bullets, tone = "slate" }) {
  const ring =
    tone === "fuchsia"
      ? "border-fuchsia-500/35 bg-fuchsia-500/10 text-fuchsia-200"
      : tone === "cyan"
      ? "border-cyan-500/35 bg-cyan-500/10 text-cyan-200"
      : tone === "indigo"
      ? "border-indigo-500/35 bg-indigo-500/10 text-indigo-200"
      : tone === "emerald"
      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
      : "border-slate-800 bg-slate-950/60 text-slate-200";

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-100">{title}</div>
          <div className="mt-1 text-xs text-slate-400">{sub}</div>
        </div>
        <span
          className={cx(
            "rounded-2xl border px-3 py-2 text-xs font-semibold",
            ring
          )}
        >
          {price}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {bullets.map((b) => (
          <div key={b} className="flex gap-2 text-sm text-slate-300">
            <span className="text-cyan-300">•</span>
            <span>{b}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  required = false,
  inputMode,
  autoComplete,
  className = "",
}) {
  return (
    <label className="block">
      <div className="text-[11px] font-semibold text-slate-400">{label}</div>
      <input
        className={cx(
          "mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-500/50",
          className
        )}
        placeholder={placeholder}
        value={value}
        type={type}
        required={required}
        inputMode={inputMode}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function CheckboxCard({ checked, onChange, title, desc, tone = "cyan" }) {
  const active =
    tone === "emerald"
      ? "border-emerald-400/40 bg-emerald-500/10"
      : "border-cyan-400/40 bg-cyan-500/10";

  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cx(
        "w-full rounded-3xl border p-4 text-left transition",
        checked
          ? active
          : "border-slate-800 bg-slate-950/60 hover:bg-slate-900/50"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-slate-100">{title}</div>
          {desc ? (
            <div className="mt-1 text-xs leading-5 text-slate-400">{desc}</div>
          ) : null}
        </div>

        <div
          className={cx(
            "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]",
            checked
              ? "border-cyan-300 bg-cyan-400 text-black"
              : "border-slate-700 bg-slate-900 text-slate-500"
          )}
        >
          {checked ? "Yes" : "No"}
        </div>
      </div>
    </button>
  );
}

function RegisterCard({
  err,
  loading,
  email,
  setEmail,
  username,
  setUsername,
  first_name,
  setFirstName,
  last_name,
  setLastName,
  password,
  setPassword,
  affiliateCode,
  setAffiliateCode,
  onSubmit,
  setPricingOpen,
  setClaimOpen,
  setBusinessDrawerOpen,
}) {
  function updateAffiliateCode(value) {
    const normalized = normalizeAffiliateCode(value);
    setAffiliateCode(normalized);
    if (normalized) storeAffiliateCode(normalized);
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/55 p-5 shadow-[0_0_90px_rgba(0,0,0,0.45)] backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-extrabold">Create account</div>
          <div className="mt-1 text-xs text-slate-400">
            Start free as a customer — or create a business in one step.
          </div>
        </div>
        <Pill tone="cyan">v7.1</Pill>
      </div>

      {affiliateCode ? (
        <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-300/80">
            Affiliate referral detected
          </div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <div className="text-lg font-black text-emerald-100">
              {affiliateCode}
            </div>
            <Pill tone="emerald">Saved</Pill>
          </div>
          <div className="mt-1 text-xs text-emerald-200/75">
            If you start a business, this referral code will be carried forward
            automatically.
          </div>
        </div>
      ) : null}

      {err ? (
        <div className="mt-4 rounded-2xl border border-red-800 bg-red-900/20 p-3 text-sm text-red-300">
          {err}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <FormInput
          label="Email"
          placeholder="you@company.com"
          value={email}
          onChange={setEmail}
          required
          autoComplete="email"
        />

        <FormInput
          label="Username (optional)"
          placeholder="optional"
          value={username}
          onChange={setUsername}
          autoComplete="username"
        />

        <div className="grid grid-cols-2 gap-2">
          <FormInput
            label="First name"
            value={first_name}
            onChange={setFirstName}
            autoComplete="given-name"
          />
          <FormInput
            label="Last name"
            value={last_name}
            onChange={setLastName}
            autoComplete="family-name"
          />
        </div>

        <FormInput
          label="Password"
          placeholder="••••••••"
          type="password"
          value={password}
          onChange={setPassword}
          required
          autoComplete="new-password"
        />

        <div>
          <label className="text-[11px] text-slate-400">
            Affiliate / Referral Code (optional)
          </label>
          <input
            className="mt-1 w-full rounded-2xl border border-emerald-500/20 bg-slate-950 px-4 py-2.5 uppercase outline-none focus:border-emerald-500/50"
            placeholder="SW-JACOB7"
            value={affiliateCode}
            onChange={(e) => updateAffiliateCode(e.target.value)}
          />
          <div className="mt-1 text-[11px] text-slate-500">
            If someone referred you, enter their code here. QR/referral links
            fill this in automatically.
          </div>
        </div>

        <button
          disabled={loading}
          className={cx(
            "w-full rounded-2xl border py-2.5 text-sm font-semibold transition",
            loading
              ? "border-slate-800 bg-slate-950/60 text-slate-200 opacity-60"
              : "border-fuchsia-500/35 bg-fuchsia-500/10 text-fuchsia-200 hover:bg-fuchsia-500/15"
          )}
          type="submit"
        >
          {loading ? "Creating..." : "Create Free Customer Account"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setBusinessDrawerOpen(true)}
        className="mt-3 w-full rounded-2xl border border-cyan-400/40 bg-cyan-500/15 px-4 py-3 text-sm font-black text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.12)] hover:bg-cyan-500/20"
      >
        Create Business Account
      </button>

      <div className="mt-3 text-sm text-slate-400">
        Already have an account?{" "}
        <Link className="text-cyan-300 hover:text-cyan-200" to="/login">
          Sign in
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setPricingOpen(true)}
          className="rounded-2xl border border-cyan-500/35 bg-cyan-500/15 px-3 py-2 text-center text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20"
        >
          Plans
        </button>

        <button
          type="button"
          onClick={() => setClaimOpen(true)}
          className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-center text-sm hover:bg-slate-900/40"
          title="Tenant/Investor invite code"
        >
          Portal Code
        </button>

        <Link
          to="/login"
          className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-center text-sm hover:bg-slate-900/40"
        >
          Back
        </Link>
      </div>

      <div className="mt-4 text-[11px] leading-5 text-slate-500">
        Tenant/Investor portals still use invite codes. Business owners do not
        need a business ID to sign up.
      </div>
    </div>
  );
}

function BusinessSignupDrawer({
  open,
  onClose,
  loading,
  onSubmit,
  businessName,
  setBusinessName,
  businessPhone,
  setBusinessPhone,
  businessCity,
  setBusinessCity,
  businessState,
  setBusinessState,
  businessZip,
  setBusinessZip,
  businessAccessCode,
  setBusinessAccessCode,
  acceptsOnePercent,
  setAcceptsOnePercent,
  acceptsMarketplace,
  setAcceptsMarketplace,
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Create your business account"
      subtitle="No business ID needed. If you have a free lifetime access code, enter it here. The code bypasses the monthly SBO subscription, but the 1% SyncWorks platform fee still applies on processed business revenue."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="rounded-3xl border border-cyan-500/25 bg-cyan-500/10 p-4">
          <div className="text-sm font-black text-cyan-100">
            Simple business signup
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-300">
            This creates your customer login first, then creates your business
            profile under that same account.
          </div>
        </div>

        <FormInput
          label="Business Name"
          placeholder="Example: Lord's Lawn Care"
          value={businessName}
          onChange={setBusinessName}
          required
          autoComplete="organization"
        />

        <FormInput
          label="Business Phone"
          placeholder="334-555-1212"
          value={businessPhone}
          onChange={setBusinessPhone}
          inputMode="tel"
          autoComplete="tel"
        />

        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="City"
            placeholder="Montgomery"
            value={businessCity}
            onChange={setBusinessCity}
            autoComplete="address-level2"
          />

          <FormInput
            label="State"
            placeholder="AL"
            value={businessState}
            onChange={(value) => setBusinessState(String(value || "").toUpperCase().slice(0, 2))}
            autoComplete="address-level1"
          />
        </div>

        <FormInput
          label="Base ZIP"
          placeholder="36109"
          value={businessZip}
          onChange={setBusinessZip}
          inputMode="numeric"
          required
          autoComplete="postal-code"
        />

        <div className="rounded-3xl border border-emerald-500/25 bg-emerald-500/10 p-4">
          <div className="text-sm font-black text-emerald-100">
            Free Lifetime Access Code
          </div>
          <div className="mt-1 text-xs leading-5 text-emerald-100/75">
            Optional. This is for early adopters / promo accounts. It bypasses
            the monthly SBO payment only.
          </div>

          <input
            className="mt-3 w-full rounded-2xl border border-emerald-500/30 bg-slate-950 px-4 py-2.5 uppercase text-emerald-100 outline-none placeholder:text-emerald-900/60 focus:border-emerald-400/60"
            placeholder="FREE-LIFETIME-CODE"
            value={businessAccessCode}
            onChange={(e) =>
              setBusinessAccessCode(String(e.target.value || "").toUpperCase())
            }
          />
        </div>

        <CheckboxCard
          checked={acceptsMarketplace}
          onChange={setAcceptsMarketplace}
          title="Accept Marketplace Tickets"
          desc="Turn this on so local customers can find the business and send jobs through SyncWorks."
          tone="cyan"
        />

        <CheckboxCard
          checked={acceptsOnePercent}
          onChange={setAcceptsOnePercent}
          title="I understand SyncWorks still collects 1%"
          desc="Access codes can waive the monthly SBO subscription. They do not waive SyncWorks' 1% platform fee on business revenue processed through the platform."
          tone="emerald"
        />

        <button
          disabled={loading || !acceptsOnePercent}
          type="submit"
          className={cx(
            "w-full rounded-2xl border px-4 py-3 text-sm font-black transition",
            loading || !acceptsOnePercent
              ? "border-slate-800 bg-slate-950/60 text-slate-500"
              : "border-cyan-400/45 bg-cyan-400 text-black hover:bg-cyan-300"
          )}
        >
          {loading ? "Creating Business..." : "Create Business Account"}
        </button>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-[11px] leading-5 text-slate-400">
          After signup, you’ll land in SBO settings to finish services, logo,
          service radius, marketplace routing, and profile setup.
        </div>
      </form>
    </Drawer>
  );
}

function normalizeBusinessAccessCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-");
}

function normalizeStateCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .slice(0, 2);
}

function getErrorMessage(error, fallback = "Something went wrong.") {
  const data = error?.response?.data;

  if (data?.detail) return data.detail;
  if (data?.non_field_errors?.[0]) return data.non_field_errors[0];
  if (data?.email?.[0]) return data.email[0];
  if (data?.username?.[0]) return data.username[0];
  if (data?.name?.[0]) return data.name[0];
  if (data && typeof data === "object") return JSON.stringify(data);
  if (error?.message) return error.message;

  return fallback;
}

export default function Register() {
  const { register, user, reloadBusinesses } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [first_name, setFirstName] = useState("");
  const [last_name, setLastName] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [pricingOpen, setPricingOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [businessDrawerOpen, setBusinessDrawerOpen] = useState(false);
  const [affiliateCode, setAffiliateCode] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessCity, setBusinessCity] = useState("");
  const [businessState, setBusinessState] = useState("");
  const [businessZip, setBusinessZip] = useState("");
  const [businessAccessCode, setBusinessAccessCode] = useState("");
  const [acceptsOnePercent, setAcceptsOnePercent] = useState(false);
  const [acceptsMarketplace, setAcceptsMarketplace] = useState(true);

  useEffect(() => {
    const code = captureAffiliateCodeFromLocation(location);
    setAffiliateCode(code || getStoredAffiliateCode());
  }, [location]);

  useEffect(() => {
    if (user) nav("/customer", { replace: true });
  }, [user, nav]);

  useEffect(() => {
    const id = "sw-register-bg-css";
    if (document.getElementById(id)) return;

    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes swFloat {
        0% { transform: translate3d(-8%, 0, 0) scale(1); opacity: .50; }
        50% { transform: translate3d(8%, 0, 0) scale(1.02); opacity: .72; }
        100% { transform: translate3d(-8%, 0, 0) scale(1); opacity: .50; }
      }
      @keyframes swSweep {
        0% { transform: translateX(-120%); opacity: 0; }
        20% { opacity: .16; }
        60% { opacity: .08; }
        100% { transform: translateX(120%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const videoSrc = useMemo(() => "/landing/Servicesrecording.mp4", []);

  async function createBaseAccount() {
    const cleanAffiliateCode = normalizeAffiliateCode(affiliateCode);

    if (cleanAffiliateCode) {
      storeAffiliateCode(cleanAffiliateCode);
    }

    await register({
      email,
      username: username || (email.includes("@") ? email.split("@")[0] : email),
      first_name,
      last_name,
      password,
      ...(cleanAffiliateCode
        ? {
            affiliate_code: cleanAffiliateCode,
            referral_code: cleanAffiliateCode,
          }
        : {}),
    });

    return cleanAffiliateCode;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      await createBaseAccount();
      nav("/customer", { replace: true });
    } catch (e2) {
      setErr(getErrorMessage(e2, "Registration failed."));
    } finally {
      setLoading(false);
    }
  }

  async function redeemBusinessAccessCode({ businessId, code }) {
    const clean = normalizeBusinessAccessCode(code);
    if (!clean || !businessId) return;

    try {
      await api.post("/business-access-codes/redeem/", {
        business_id: businessId,
        code: clean,
      });
    } catch (error) {
      const status = error?.response?.status;

      if (status === 404 || status === 405) {
        localStorage.setItem(
          `sw_pending_business_access_code_${businessId}`,
          clean
        );
        return;
      }

      throw error;
    }
  }

  async function createBusinessAfterAccount(cleanAffiliateCode) {
    const cleanBusinessName = String(businessName || "").trim();
    const cleanZip = String(businessZip || "").trim();

    if (!cleanBusinessName) {
      throw new Error("Business name is required.");
    }

    if (!cleanZip) {
      throw new Error("Base ZIP is required.");
    }

    if (!acceptsOnePercent) {
      throw new Error("Please confirm the 1% SyncWorks platform fee.");
    }

    const payload = {
      name: cleanBusinessName,
      business_email: email,
      owner_name: [first_name, last_name].filter(Boolean).join(" ").trim(),
      phone: businessPhone,
      city: businessCity,
      state: normalizeStateCode(businessState),
      base_zip: cleanZip,
      accepts_marketplace_tickets: !!acceptsMarketplace,
      service_radius_miles: 25,
      business_presence_mode: "on_site",
      signup_source: "register_business_drawer",
      platform_fee_bps: 100,
      understands_platform_fee: true,
      ...(cleanAffiliateCode
        ? {
            affiliate_code: cleanAffiliateCode,
            referral_code: cleanAffiliateCode,
          }
        : {}),
    };

    const res = await api.post("/businesses/", payload);
    const businessId = res?.data?.id || res?.data?.pk;

    await redeemBusinessAccessCode({
      businessId,
      code: businessAccessCode,
    });

    if (businessId) {
      localStorage.setItem("sw_active_business_id", String(businessId));
    }

    try {
      await Promise.resolve(reloadBusinesses?.());
    } catch {
      // Non-blocking.
    }

    return businessId;
  }

  async function onBusinessSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const cleanAffiliateCode = await createBaseAccount();
      await createBusinessAfterAccount(cleanAffiliateCode);
      nav("/sbo/settings?return=/sbo", { replace: true });
    } catch (e2) {
      setErr(getErrorMessage(e2, "Business registration failed."));
    } finally {
      setLoading(false);
    }
  }

  function goClaim(kind) {
    setClaimOpen(false);
    nav(`/portal/claim?portal=${kind}`);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020617] text-slate-100">
      <div className="absolute inset-0">
        <video
          src={videoSrc}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[#020617]/70" />
        <div
          className="absolute -inset-20 blur-3xl"
          style={{
            animation: "swFloat 10s ease-in-out infinite",
            background:
              "radial-gradient(900px 360px at 10% 30%, rgba(34,211,238,0.18), rgba(0,0,0,0) 62%)," +
              "radial-gradient(900px 360px at 65% 40%, rgba(99,102,241,0.16), rgba(0,0,0,0) 62%)," +
              "radial-gradient(900px 360px at 90% 25%, rgba(217,70,239,0.16), rgba(0,0,0,0) 62%)",
          }}
        />
        <div
          className="absolute -inset-x-40 -inset-y-10 blur-xl"
          style={{
            animation: "swSweep 14s ease-in-out infinite",
            background:
              "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.10) 45%, rgba(255,255,255,0) 100%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:py-8 lg:py-10">
        <div className="grid items-start gap-6 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-7">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="cyan">One login</Pill>
              <Pill tone="indigo">Different tabs</Pill>
              <Pill tone="fuchsia">Customer → Business → PM</Pill>
              <Pill tone="emerald">Business signup simplified</Pill>
            </div>

            <div>
              <div className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl md:text-5xl">
                <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-400 bg-clip-text text-transparent">
                  How SyncWorks works
                </span>
                <div className="mt-2 text-slate-100">
                  Register once — then use the same account for everything.
                </div>
              </div>

              <div className="mt-4 max-w-2xl text-base leading-relaxed text-slate-200/90 sm:text-lg">
                SyncWorks is built to be your <b>forever login</b>. Start free
                as a customer, or create a business account from the drawer —
                no business ID required.
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setBusinessDrawerOpen(true)}
                  className="rounded-2xl border border-cyan-400/40 bg-cyan-500/15 px-4 py-2 text-sm font-black text-cyan-100 hover:bg-cyan-500/20"
                  type="button"
                >
                  Create Business
                </button>

                <button
                  onClick={() => setPricingOpen(true)}
                  className="rounded-2xl border border-fuchsia-500/35 bg-fuchsia-500/10 px-4 py-2 text-sm font-semibold text-fuchsia-200 hover:bg-fuchsia-500/15"
                  type="button"
                >
                  View Plans
                </button>

                <button
                  onClick={() => setClaimOpen(true)}
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-2 text-sm hover:bg-slate-900/40"
                  title="Tenant/Investor invite code"
                  type="button"
                >
                  Enter portal code
                </button>

                <Link
                  to="/login"
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-2 text-sm hover:bg-slate-900/40"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Step
                n="1"
                title="Register as a customer"
                desc="Create your free account. Customers can submit requests, track progress, message businesses, and keep receipts."
              />
              <Step
                n="2"
                title="Create a business without a business ID"
                desc="Business owners can open the drawer, enter their company info, and create the business profile under the same login."
              />
              <Step
                n="3"
                title="Use an access code when you have one"
                desc="A free lifetime code bypasses the monthly SBO subscription, but SyncWorks still keeps the 1% platform fee."
              />
              <Step
                n="4"
                title="Tenant / Investor portals still use claim codes"
                desc="Portal codes are separate from business signup. Those are only for tenants or investors invited by a property manager."
              />
            </div>

            <div className="grid max-w-2xl gap-3 md:grid-cols-2">
              <Feature
                title="Customers (Free)"
                desc="Submit a request, track updates, schedule, pay electronically, and keep all receipts + messages in one timeline."
              />
              <Feature
                title="Small Businesses"
                desc="Run tickets, schedule jobs, assign team members, invoice, collect payments, and keep operations in one place."
              />
              <Feature
                title="Property Managers"
                desc="Manage properties/units/tenants, work orders, inspections, rent workflows, and invite tenants + investors to portals."
              />
              <Feature
                title="Access Codes"
                desc="Business access codes are for monthly-payment bypass only. They do not remove the 1% platform fee."
              />
            </div>

            <div className="max-w-2xl rounded-3xl border border-amber-500/20 bg-amber-500/10 p-4 text-[12px] leading-5 text-amber-100/90">
              Business owners should use <b>Create Business</b>. Tenant and
              investor codes are only for property management portals.
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="mx-auto mt-2 w-full max-w-xl lg:sticky lg:top-6 lg:max-w-none">
              <RegisterCard
                err={err}
                loading={loading}
                email={email}
                setEmail={setEmail}
                username={username}
                setUsername={setUsername}
                first_name={first_name}
                setFirstName={setFirstName}
                last_name={last_name}
                setLastName={setLastName}
                password={password}
                setPassword={setPassword}
                affiliateCode={affiliateCode}
                setAffiliateCode={setAffiliateCode}
                onSubmit={onSubmit}
                setPricingOpen={setPricingOpen}
                setClaimOpen={setClaimOpen}
                setBusinessDrawerOpen={setBusinessDrawerOpen}
              />
            </div>
          </div>
        </div>

        <div className="mt-10 text-center text-[11px] text-slate-500">
          © {new Date().getFullYear()} SyncWorks — Built for operators.
        </div>
      </div>

      <BusinessSignupDrawer
        open={businessDrawerOpen}
        onClose={() => setBusinessDrawerOpen(false)}
        loading={loading}
        onSubmit={onBusinessSubmit}
        businessName={businessName}
        setBusinessName={setBusinessName}
        businessPhone={businessPhone}
        setBusinessPhone={setBusinessPhone}
        businessCity={businessCity}
        setBusinessCity={setBusinessCity}
        businessState={businessState}
        setBusinessState={setBusinessState}
        businessZip={businessZip}
        setBusinessZip={setBusinessZip}
        businessAccessCode={businessAccessCode}
        setBusinessAccessCode={setBusinessAccessCode}
        acceptsOnePercent={acceptsOnePercent}
        setAcceptsOnePercent={setAcceptsOnePercent}
        acceptsMarketplace={acceptsMarketplace}
        setAcceptsMarketplace={setAcceptsMarketplace}
      />

      <Modal
        open={pricingOpen}
        onClose={() => setPricingOpen(false)}
        title="SyncWorks Pricing"
        subtitle="Customers are free. Businesses can use a lifetime access code when approved."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <PriceCard
            tone="cyan"
            title="Customers"
            price="Free"
            sub="Start here. Forever login."
            bullets={[
              "Create requests and track work",
              "Messaging + updates timeline",
              "Scheduling + receipts",
              "Pay electronically when enabled",
            ]}
          />
          <PriceCard
            tone="indigo"
            title="Small Business"
            price="$19.99 / month"
            sub="Monthly can be bypassed by approved lifetime access code"
            bullets={[
              "Tickets + dispatch + scheduling",
              "Invoices + payment collection",
              "Team assignments",
              "1% platform fee still applies",
            ]}
          />
          <PriceCard
            tone="fuchsia"
            title="Property Management"
            price="$49.99 / month"
            sub="Up to 100 properties (monthly)"
            bullets={[
              "Portfolio ops: properties/units/tenants",
              "Work orders + inspections",
              "Tenant + Investor portals (invite code)",
              "Additional properties available after 100",
            ]}
          />
          <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5">
            <div className="text-sm font-semibold text-slate-100">
              Business Access Codes
            </div>
            <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-300">
              <div>• Business owners do not need a business ID to sign up.</div>
              <div>• Access codes can bypass monthly SBO subscription billing.</div>
              <div>• The 1% SyncWorks platform fee still applies.</div>
              <div className="mt-3">
                <button
                  onClick={() => setPricingOpen(false)}
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-2 text-sm hover:bg-slate-900/40"
                  type="button"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={claimOpen}
        onClose={() => setClaimOpen(false)}
        title="Enter your portal invite code"
        subtitle="This is only for tenants or investors invited by a property manager."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => goClaim("tenant")}
            className="rounded-3xl border border-cyan-500/35 bg-cyan-500/10 p-5 text-left hover:bg-cyan-500/15"
            type="button"
          >
            <div className="text-sm font-semibold text-cyan-200">Tenant</div>
            <div className="mt-1 text-sm text-slate-300">
              I received a tenant code from my Property Manager.
            </div>
            <div className="mt-3 text-[11px] text-slate-400">
              Route: /portal/claim?portal=tenant
            </div>
          </button>

          <button
            onClick={() => goClaim("investor")}
            className="rounded-3xl border border-fuchsia-500/35 bg-fuchsia-500/10 p-5 text-left hover:bg-fuchsia-500/15"
            type="button"
          >
            <div className="text-sm font-semibold text-fuchsia-200">
              Investor
            </div>
            <div className="mt-1 text-sm text-slate-300">
              I received an investor code from my Property Manager.
            </div>
            <div className="mt-3 text-[11px] text-slate-400">
              Route: /portal/claim?portal=investor
            </div>
          </button>
        </div>

        <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-950/50 p-4 text-sm leading-6 text-slate-300">
          Business owners should not use this portal code flow. Click{" "}
          <button
            type="button"
            onClick={() => {
              setClaimOpen(false);
              setBusinessDrawerOpen(true);
            }}
            className="font-bold text-cyan-300 hover:text-cyan-200"
          >
            Create Business
          </button>{" "}
          instead.
        </div>
      </Modal>
    </div>
  );
}