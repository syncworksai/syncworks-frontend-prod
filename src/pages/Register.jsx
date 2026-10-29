import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Login from "./Login";

import api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import {
  captureAffiliateCodeFromLocation,
  getStoredAffiliateCode,
  normalizeAffiliateCode,
  storeAffiliateCode,
} from "../api/platformAffiliates";

const INPUT_CLASS =
  "mt-1 w-full rounded-xl border border-slate-700/75 bg-slate-950 px-3 py-2.5 text-base text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400/60 sm:text-sm";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeState(value) {
  return normalizeCode(value).slice(0, 2);
}

function safeReturnPath(value, fallback = "/customer") {
  const path = String(value || "").trim();
  return path.startsWith("/") && !path.startsWith("//") ? path : fallback;
}

function suggestedUsername(email) {
  return normalizeEmail(email)
    .split("@")[0]
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 120);
}

function getErrorMessage(error, fallback) {
  const data = error?.response?.data;

  if (typeof error?.message === "string" && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof data === "string" && data.trim()) {
    return data.trim();
  }

  if (typeof data?.detail === "string" && data.detail.trim()) {
    return data.detail.trim();
  }

  if (data && typeof data === "object") {
    for (const value of Object.values(data)) {
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }

      if (Array.isArray(value) && value.length) {
        return String(value[0]);
      }
    }
  }

  return fallback;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  inputMode,
  autoComplete,
  maxLength,
  className = "",
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-400">{label}</span>

      <input
        className={`${INPUT_CLASS} ${className}`}
        value={value}
        type={type}
        placeholder={placeholder}
        required={required}
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Drawer({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/75">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto border-l border-cyan-500/20 bg-[#020617] p-5 shadow-2xl">
        <div className="relative">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-black text-white">{title}</h2>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-800 px-3 py-2 text-slate-300 hover:bg-slate-900"
            >
              ✕
            </button>
          </div>

          <div className="mt-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Progress({ stage }) {
  const active =
    stage === "EMAIL" ? 1 : stage === "VERIFY" ? 2 : 3;

  const items = ["Email", "Verify", "Profile"];

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {items.map((label, index) => {
        const number = index + 1;
        const complete = number < active;
        const current = number === active;

        return (
          <div
            key={label}
            className={`rounded-xl border p-2 text-center ${
              complete
                ? "border-emerald-500/35 bg-emerald-500/10"
                : current
                ? "border-cyan-500/40 bg-cyan-500/10"
                : "border-slate-800 bg-slate-950/50"
            }`}
          >
            <div
              className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                complete
                  ? "bg-emerald-400 text-black"
                  : current
                  ? "bg-cyan-400 text-black"
                  : "bg-slate-800 text-slate-500"
              }`}
            >
              {complete ? "✓" : number}
            </div>

            <div className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-slate-300">
              {label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InfoDrawer({ open, onClose }) {
  const modules = [
    ["Personal", "Your free account for requests, planning, activity, and connections."],
    ["Business", "Tickets, customers, scheduling, teams, invoices, and reporting."],
    ["Finance", "Budgets, transactions, debt planning, and financial guidance."],
    ["Health", "Workouts, fitness coaching, sleep, nutrition, and progress."],
    ["Property Management", "Properties, tenants, work orders, rent, and investor portals."],
    ["Social Media", "Content planning, leads, follow-up, and channel automation."],
  ];

  return (
    <Drawer open={open} onClose={onClose} title="How SyncWorks works">
      <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 p-4">
        <div className="font-bold text-cyan-100">
          One account. Add tools when needed.
        </div>

        <p className="mt-2 text-sm leading-6 text-slate-300">
          Every user starts with a free Personal account. Other modules are
          added under that same verified login.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {modules.map(([title, description]) => (
          <div
            key={title}
            className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
          >
            <div className="font-bold text-slate-100">{title}</div>
            <div className="mt-1 text-sm leading-5 text-slate-400">
              {description}
            </div>
          </div>
        ))}
      </div>
    </Drawer>
  );
}

function UpdatesDrawer({ open, onClose }) {
  const updates = [
    {
      status: "Available",
      title: "Verified registration",
      text: "New accounts now verify their email before profile creation.",
    },
    {
      status: "Available",
      title: "Health coaching",
      text: "Plan workouts, track sets, monitor progress, and receive coaching.",
    },
    {
      status: "Available",
      title: "Business social automation",
      text: "Plan content, connect channels, capture leads, and automate follow-up.",
    },
    {
      status: "In development",
      title: "Personal finance",
      text: "Budget views, transactions, debt payoff tools, and tailored guidance.",
    },
  ];

  return (
    <Drawer open={open} onClose={onClose} title="What’s new">
      <div className="space-y-3">
        {updates.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
          >
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
              {item.status}
            </div>

            <div className="mt-1 font-bold text-slate-100">{item.title}</div>

            <div className="mt-1 text-sm leading-5 text-slate-400">
              {item.text}
            </div>
          </div>
        ))}
      </div>
    </Drawer>
  );
}

function BusinessDrawer({
  open,
  onClose,
  loading,
  form,
  setForm,
  onSubmit,
}) {
  function update(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <Drawer open={open} onClose={onClose} title="Add your business">
      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
        <div className="font-bold text-emerald-100">
          Your Personal account is already active.
        </div>

        <div className="mt-1 text-sm leading-5 text-emerald-100/75">
          This business will be connected to the same verified login.
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <Field
          label="Business name"
          value={form.name}
          onChange={(value) => update("name", value)}
          required
          autoComplete="organization"
        />

        <Field label="Business contact email" value={form.businessEmail}
          onChange={(value) => update("businessEmail", value)} type="email"
          placeholder="company@example.com" autoComplete="off" />
        <p className="-mt-2 text-xs leading-5 text-slate-400">Optional. Leave blank to use your verified Personal email. Your business email is for company contact, not for signing in.</p>
        <Field
          label="Business phone"
          value={form.phone}
          onChange={(value) => update("phone", value)}
          inputMode="tel"
          autoComplete="tel"
        />

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="City"
            value={form.city}
            onChange={(value) => update("city", value)}
            autoComplete="address-level2"
          />

          <Field
            label="State"
            value={form.state}
            onChange={(value) => update("state", normalizeState(value))}
            placeholder="AL"
            maxLength={2}
            autoComplete="address-level1"
          />
        </div>

        <Field
          label="Base ZIP"
          value={form.zip}
          onChange={(value) =>
            update(
              "zip",
              String(value || "")
                .replace(/\D/g, "")
                .slice(0, 10)
            )
          }
          required
          inputMode="numeric"
          autoComplete="postal-code"
        />

        <Field
          label="Business access code"
          value={form.accessCode}
          onChange={(value) => update("accessCode", normalizeCode(value))}
          placeholder="Optional"
          className="uppercase"
        />

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <input
            type="checkbox"
            checked={form.acceptsMarketplace}
            onChange={(event) =>
              update("acceptsMarketplace", event.target.checked)
            }
            className="mt-1"
          />

          <span>
            <span className="block font-semibold text-slate-100">
              Accept Marketplace Tickets
            </span>

            <span className="mt-1 block text-xs leading-5 text-slate-400">
              Allow nearby customers to send service requests.
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 p-4">
          <input
            type="checkbox"
            checked={form.acceptsFee}
            onChange={(event) => update("acceptsFee", event.target.checked)}
            className="mt-1"
          />

          <span>
            <span className="block font-semibold text-cyan-100">
              I understand the platform fee
            </span>

            <span className="mt-1 block text-xs leading-5 text-cyan-100/70">
              Access codes may waive a subscription but do not waive the
              platform fee on processed business revenue.
            </span>
          </span>
        </label>

        <button
          type="submit"
          disabled={loading || !form.acceptsFee}
          className="w-full rounded-2xl bg-cyan-400 px-4 py-3 font-black text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Creating Business..." : "Create Business"}
        </button>
      </form>
    </Drawer>
  );
}

function Welcome({
  firstName,
  onContinue,
  onBusiness,
  onInfo,
  onUpdates,
  businessFirst = false,
  chosenRole = "personal",
  onRoleContinue,
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 shadow-2xl">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400 text-2xl font-black text-black">
        ✓
      </div>

      <div className="mt-4 text-center">
        <h1 className="text-2xl font-black text-white">
          Welcome{firstName ? `, ${firstName}` : ""}.
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          {businessFirst
            ? chosenRole === "pm" ? "Your Personal account is ready. Add your dedicated PM workspace next." : "Your account is ready. Add your business next. Industry-specific dashboards for Retail and Food will follow."
            : (chosenRole === "tenant" || chosenRole === "investor")
              ? "Your Personal account is ready. Use the invitation code from your PM company's email to connect your property."
              : "Your free Personal account is ready. You can explore SyncWorks or add more tools whenever you need them."}
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {(chosenRole === "tenant" || chosenRole === "investor" || chosenRole === "owner") ? (
          <button type="button" onClick={onRoleContinue} className="w-full rounded-2xl bg-cyan-400 px-4 py-3 font-black text-black">
            {chosenRole === "tenant" ? "Connect Tenant Portal" : "Connect Property Owner / Partner Portal"}
            <span className="mt-1 block text-xs font-medium">Secure invitation required</span>
          </button>
        ) : null}
        {chosenRole !== "tenant" && chosenRole !== "investor" && chosenRole !== "owner" ? <button
          type="button"
          onClick={onBusiness}
          className={businessFirst
            ? "w-full rounded-2xl bg-cyan-400 px-4 py-3 font-black text-black"
            : "w-full rounded-2xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-3 font-bold text-cyan-100"}
        >
          {chosenRole === "pm" ? "Set Up Property Management" : businessFirst ? "Continue Business Setup" : "Add My Business"}
        </button> : null}

        <button
          type="button"
          onClick={onContinue}
          className={businessFirst
            ? "w-full rounded-2xl border border-slate-700 px-4 py-3 font-semibold text-slate-200"
            : "w-full rounded-2xl bg-cyan-400 px-4 py-3 font-black text-black"}
        >
          {businessFirst || chosenRole === "tenant" || chosenRole === "investor" ? "Go to Personal Instead" : "Enter SyncWorks"}
        </button>

        <Link to="/get-started" className="block text-center text-xs font-bold text-cyan-300 hover:text-cyan-200">See all onboarding options</Link>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onInfo}
            className="rounded-2xl border border-slate-800 px-4 py-3 text-sm font-semibold text-slate-200"
          >
            Explore Modules
          </button>

          <button
            type="button"
            onClick={onUpdates}
            className="rounded-2xl border border-slate-800 px-4 py-3 text-sm font-semibold text-slate-200"
          >
            What’s New
          </button>
        </div>
      </div>
    </div>
  );
}

function RegistrationBackdrop() {
  return (
    <>
      <div className="fixed inset-0 overflow-hidden bg-[#05080f]" aria-hidden="true" inert>
        <div className="pointer-events-none h-full opacity-75 blur-[1.5px]">
          <Login backgroundOnly />
        </div>
      </div>
      <div className="pointer-events-none fixed inset-0 bg-[#020617]/40" aria-hidden="true" />
    </>
  );
}

export default function Register() {
  const {
    register,
    startEmailVerification,
    verifyEmailCode,
    resendEmailCode,
    resolveSignupCodes,
    reloadBusinesses,
    user,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const returnTo = safeReturnPath(queryParams.get("next"));
  const invitedEmail = normalizeEmail(queryParams.get("email"));
  const requestedRole = String(queryParams.get("role") || "").trim().toLowerCase();
  const chosenRole = requestedRole === "investor" ? "owner" :
    ["personal","business","pm","tenant","owner","retail","food"].includes(requestedRole)
      ? requestedRole : queryParams.get("business") === "1" ? "business" : "personal";
  const onboardingIntent = ["business","retail","food"].includes(chosenRole);
  const isPropertyInvite = chosenRole === "tenant" || chosenRole === "owner";
  const isPM = chosenRole === "pm" || isPropertyInvite;
  const industryLabel = chosenRole === "retail" ? "Retail & Shops" : chosenRole === "food" ? "Restaurants & Food" : "Service Business";
  const invitationFromLink = isPropertyInvite ? queryParams.get("code") || queryParams.get("invitation_code") || "" : "";
  const claimPath = (code) => `${chosenRole === "tenant" ? "/tenant/accept" : "/investor/accept"}${code ? `?code=${encodeURIComponent(code.trim())}` : ""}`;
  const roleSignupUrl = (role) => {
    const params = new URLSearchParams(location.search);
    params.set("role", role);
    if (role !== chosenRole) { params.delete("code"); params.delete("invitation_code"); }
    return `/register?${params.toString()}`;
  };

  const signedInTarget = isPropertyInvite ? claimPath(invitationFromLink) :
    chosenRole === "pm" ? "/onboarding/property-management" :
    chosenRole === "business" ? "/onboarding/business" :
    chosenRole === "retail" || chosenRole === "food" ? `/onboarding/business?vertical=${chosenRole}` : "/customer";
  const [stage, setStage] = useState("EMAIL");
  const [loading, setLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [error, setError] = useState("");

  const [infoOpen, setInfoOpen] = useState(false);
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [businessOpen, setBusinessOpen] = useState(false);
  const [createdBusinessId, setCreatedBusinessId] = useState(null);

  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState(() => String(invitationFromLink).trim());
  const signInPath = isPropertyInvite
    ? `/login?next=${encodeURIComponent(claimPath(inviteCode))}&email=${encodeURIComponent(email || invitedEmail)}`
    : "/login";
  const [challengeId, setChallengeId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [registrationProof, setRegistrationProof] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);

  const [account, setAccount] = useState({
    firstName: "",
    lastName: "",
    username: "",
    password: "",
    confirmPassword: "",
    affiliateCode: "",
    promoCode: "",
  });

  const [codeResult, setCodeResult] = useState(null);

  const [business, setBusiness] = useState({
    name: "",
    businessEmail: "",
    phone: "",
    city: "",
    state: "",
    zip: "",
    accessCode: "",
    acceptsMarketplace: !["retail","food"].includes(chosenRole),
    acceptsFee: false,
  });

  function updateAccount(key, value) {
    setAccount((current) => ({
      ...current,
      [key]: value,
    }));

    if (key === "affiliateCode" || key === "promoCode") {
      setCodeResult(null);
    }
  }

  useEffect(() => {
    setInviteCode(isPropertyInvite ? String(invitationFromLink).trim() : "");
  }, [chosenRole, isPropertyInvite, invitationFromLink]);

  useEffect(() => {
    if (!email && invitedEmail) {
      setEmail(invitedEmail);
    }
  }, [invitedEmail, email]);

  useEffect(() => {
    const captured = captureAffiliateCodeFromLocation(location);
    const stored = getStoredAffiliateCode();

    updateAccount(
      "affiliateCode",
      normalizeAffiliateCode(captured || stored || "")
    );
  }, [location]);

  useEffect(() => {
    if (!email || account.username) return;

    updateAccount("username", suggestedUsername(email));
  }, [email, account.username]);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;

    const timer = window.setInterval(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleEscape(event) {
      if (event.key === "Escape" && !infoOpen && !updatesOpen && !businessOpen && stage !== "WELCOME") {
        navigate("/login");
      }
    }
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [navigate, infoOpen, updatesOpen, businessOpen, stage]);

  async function handleStartVerification(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const cleanEmail = normalizeEmail(email);

      if (!cleanEmail) {
        throw new Error("Enter your email address.");
      }

      const result = await startEmailVerification({
        email: cleanEmail,
        purpose: "REGISTER",
      });

      if (!result?.challenge_id) {
        throw new Error("Verification could not be started.");
      }

      setEmail(cleanEmail);
      setChallengeId(result.challenge_id);
      setVerificationCode("");
      setRegistrationProof("");
      setResendSeconds(Number(result.resend_after || 60));
      setStage("VERIFY");
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to send the verification code.")
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!challengeId) {
        throw new Error("Request a new verification code.");
      }

      const result = await verifyEmailCode({
        challengeId,
        code: verificationCode,
      });

      if (!result?.verified || !result?.registration_proof) {
        throw new Error("Email verification failed.");
      }

      setRegistrationProof(result.registration_proof);
      setStage("ACCOUNT");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to verify that code."));
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    setError("");
    setLoading(true);

    try {
      const result = await resendEmailCode({
        challengeId,
      });

      setChallengeId(result?.challenge_id || challengeId);
      setVerificationCode("");
      setResendSeconds(Number(result?.resend_after || 60));
    } catch (err) {
      setError(getErrorMessage(err, "Unable to resend the code."));
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckCodes() {
    setError("");
    setCodeLoading(true);

    try {
      const affiliateCode = normalizeAffiliateCode(account.affiliateCode);
      const promoCode = normalizeCode(account.promoCode);

      const result = await resolveSignupCodes({
        affiliateCode,
        promoCode,
      });

      updateAccount("affiliateCode", affiliateCode);
      updateAccount("promoCode", promoCode);
      setCodeResult(result);

      if (affiliateCode && result?.affiliate?.valid) {
        storeAffiliateCode(affiliateCode);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Unable to check the codes."));
    } finally {
      setCodeLoading(false);
    }
  }

  function validateAccount() {
    if (!account.firstName.trim()) {
      throw new Error("First name is required.");
    }

    if (!account.lastName.trim()) {
      throw new Error("Last name is required.");
    }

    if (!account.username.trim()) {
      throw new Error("Username is required.");
    }

    if (account.password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    if (account.password !== account.confirmPassword) {
      throw new Error("Passwords do not match.");
    }

    if (!registrationProof) {
      throw new Error("Verify your email before creating the account.");
    }

    if (
      codeResult?.affiliate?.provided &&
      !codeResult?.affiliate?.valid
    ) {
      throw new Error("Correct or remove the invalid referral code.");
    }

    if (codeResult?.promo?.provided && !codeResult?.promo?.valid) {
      throw new Error("Correct or remove the invalid promo code.");
    }
  }

  async function handleCreateAccount(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      validateAccount();

      const affiliateCode = normalizeAffiliateCode(account.affiliateCode);
      const promoCode = normalizeCode(account.promoCode);

      if (affiliateCode) {
        storeAffiliateCode(affiliateCode);
      }

      await register({
        email,
        username: account.username.trim(),
        first_name: account.firstName.trim(),
        last_name: account.lastName.trim(),
        password: account.password,
        confirm_password: account.confirmPassword,
        registration_proof: registrationProof,
        affiliate_code: affiliateCode,
        promo_code: promoCode,
        registration_source: returnTo.includes("/sports/invite/") ? "SPORTS_INVITATION" : affiliateCode ? "INVITATION" : "WEB",
      });

      if (returnTo !== "/customer") {
        navigate(returnTo, { replace: true });
        return;
      }
      // A URL code only prefills the next step. The backend checks invitation and invited email on acceptance.
      if (isPropertyInvite && inviteCode.trim()) {
        navigate(claimPath(inviteCode), { replace: true });
        return;
      }
      setStage("WELCOME");
      if (onboardingIntent) setBusinessOpen(true);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to create your account."));
    } finally {
      setLoading(false);
    }
  }

  async function redeemBusinessCode(businessId, code) {
    const cleanCode = normalizeCode(code);

    if (!businessId || !cleanCode) return;

    // The authenticated, business-specific promo endpoint confirms the waiver
    // (including SWFF26) instead of treating an unverified local code as applied.
    const response = await api.post("/auth/upgrade-to-sbo-promo/", {
      business_id: businessId,
      code: cleanCode,
    });
    if (!response?.data?.subscriptions_exempt && cleanCode === "SWFF26") {
      throw new Error("Business created but the SWFF26 subscription waiver was not confirmed.");
    }
    return response?.data;
  }

  async function handleCreateBusiness(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!business.name.trim()) {
        throw new Error("Business name is required.");
      }

      if (!business.zip.trim()) {
        throw new Error("Business ZIP is required.");
      }

      if (!business.acceptsFee) {
        throw new Error("Confirm the platform fee.");
      }

      const affiliateCode = normalizeAffiliateCode(account.affiliateCode);

      const response = await api.post("/businesses/", {
        name: business.name.trim(),
        business_email: normalizeEmail(business.businessEmail) || normalizeEmail(email),
        owner_name: `${account.firstName} ${account.lastName}`.trim(),
        phone: business.phone.trim(),
        city: business.city.trim(),
        state: normalizeState(business.state),
        base_zip: business.zip.trim(),
        accepts_marketplace_tickets: business.acceptsMarketplace,
        service_radius_miles: 25,
        business_presence_mode: ["retail","food"].includes(chosenRole) ? "in_person" : "on_site",
        signup_source: chosenRole === "retail" ? "post_registration_retail" : chosenRole === "food" ? "post_registration_food" : "post_registration_business",
        platform_fee_bps: 100,
        understands_platform_fee: true,
        affiliate_code: affiliateCode || undefined,
        referral_code: affiliateCode || undefined,
      });

      const businessId = response?.data?.id || response?.data?.pk;
      if (!businessId) throw new Error("Business creation could not be confirmed. Review your Business list before retrying.");
      setCreatedBusinessId(businessId);
      try { localStorage.setItem("sw_active_business_id", String(businessId)); } catch {}
      try { await Promise.resolve(reloadBusinesses?.()); } catch {}
      try {
        await redeemBusinessCode(businessId, business.accessCode || account.promoCode);
      } catch (promoError) {
        // Creation succeeded. Do not let a second submit create a duplicate company.
        setBusinessOpen(false);
        setError("Business created, but the promotional code was not confirmed. Check it with SyncWorks support before relying on a lifetime waiver. " +
          getErrorMessage(promoError, "Promotion could not be applied."));
        return;
      }

      if (businessId) {
        localStorage.setItem("sw_active_business_id", String(businessId));
      }

      try {
        await Promise.resolve(reloadBusinesses?.());
      } catch {
        // Business creation succeeded; refresh can happen later.
      }

      setBusinessOpen(false);

      navigate("/sbo/settings/general?setup=1&return=%2Fsbo", {
        replace: true,
      });
    } catch (err) {
      setError(getErrorMessage(err, "Unable to create the business."));
    } finally {
      setLoading(false);
    }
  }

  if (stage === "WELCOME") {
    return (
      <div className="relative flex min-h-dvh items-center justify-center px-3 py-5 text-slate-100">
        <RegistrationBackdrop />
        <div className="relative z-10 mx-auto max-h-[calc(100dvh-40px)] w-full max-w-md overflow-y-auto rounded-3xl border border-cyan-400/20 bg-[#07111f]/95 p-4 shadow-2xl">
          {error ? <p role="alert" className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">{error}</p> : null}
          <Welcome
            firstName={account.firstName}
            onContinue={() => navigate(returnTo, { replace: true })}
            onBusiness={() => chosenRole === "pm" ? navigate("/onboarding/property-management", { replace:true }) : createdBusinessId ? navigate("/sbo/settings/general?setup=1&return=%2Fsbo", { replace:true }) : setBusinessOpen(true)}
            chosenRole={chosenRole}
            onRoleContinue={() => navigate(claimPath(inviteCode), { replace: true })}
            businessFirst={onboardingIntent || chosenRole === "pm"}
            onInfo={() => setInfoOpen(true)}
            onUpdates={() => setUpdatesOpen(true)}
          />
        </div>

        <InfoDrawer
          open={infoOpen}
          onClose={() => setInfoOpen(false)}
        />

        <UpdatesDrawer
          open={updatesOpen}
          onClose={() => setUpdatesOpen(false)}
        />

        <BusinessDrawer
          open={businessOpen}
          onClose={() => setBusinessOpen(false)}
          loading={loading}
          form={business}
          setForm={setBusiness}
          onSubmit={handleCreateBusiness}
        />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-3 py-3 text-slate-100 sm:px-6 sm:py-6">
      <RegistrationBackdrop />
      <div role="dialog" aria-modal="true" aria-labelledby="sw-registration-heading" className="relative z-10 max-h-[calc(100dvh-24px)] w-full max-w-[540px] overflow-y-auto rounded-[28px] border border-cyan-400/25 bg-[#07111f]/95 p-4 shadow-[0_24px_90px_rgba(0,0,0,.72)] sm:max-h-[calc(100dvh-48px)] sm:p-6">
        <header className="mb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <img src="/brands/syncworks-icon-192.png" alt="" className="h-10 w-10 shrink-0 rounded-xl border border-cyan-400/25 object-contain" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.19em] text-cyan-300">SyncWorks · Secure signup</p>
                <h1 id="sw-registration-heading" className="mt-0.5 text-xl font-bold tracking-tight text-white">
                  {chosenRole === "pm" ? "PM company onboarding" : chosenRole === "tenant" ? "Tenant onboarding" : chosenRole === "owner" ? "Property Owner / Partner" : onboardingIntent ? `${industryLabel} onboarding` : "Create your Personal account"}
                </h1>
              </div>
            </div>
            <button type="button" onClick={() => navigate("/login")} aria-label="Close registration and return to SyncWorks home" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 text-lg text-slate-300 transition hover:border-cyan-400 hover:text-white">×</button>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-400">
            {onboardingIntent
              ? `Start with your free verified Personal profile. Then connect your ${industryLabel.toLowerCase()} with its own company email.`
              : isPropertyInvite ? "Create your free Personal profile first. Enter the code from your management company's onboarding email to connect the correct property."
                : chosenRole === "pm" ? "Create a verified Personal login and a separate Property Management workspace."
                : "One free Personal login for Service Business, Property Management, Retail, Food and more."}
          </p>
          <nav aria-label="Select signup type" className="mt-4 grid grid-cols-5 gap-1">
            {[["personal","Personal"],["business","Service"],["pm","Property"],["retail","Retail"],["food","Food"]].map(([role,label]) => (
              <Link key={role} to={roleSignupUrl(role)} aria-current={(role==="pm" ? isPM : chosenRole===role) ? "page" : undefined}
                className={`rounded-lg border px-1 py-2.5 text-center text-[10px] font-semibold ${(role==="pm" ? isPM : chosenRole===role) ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-100" : "border-slate-700/75 bg-slate-950/50 text-slate-400 hover:border-cyan-400/40 hover:text-white"}`}>{label}</Link>
            ))}
          </nav>
          {isPM ? <div className="mt-2 grid grid-cols-3 gap-1.5" aria-label="Property Management role">
            {[["pm","PM company"],["tenant","Tenant"],["owner","Owner / Partner"]].map(([role,label])=><Link key={role} to={roleSignupUrl(role)}
              aria-current={chosenRole===role ? "page":undefined} className={`rounded-lg border px-1 py-2 text-center text-[10px] font-semibold ${chosenRole===role ? "border-violet-400/60 bg-violet-400/15 text-violet-100" : "border-slate-700 text-slate-400"}`}>{label}</Link>)}
          </div> : null}
          <p className="mt-3 text-[11px] leading-4 text-slate-500">
            Step 1: Personal account · Step 2: Connect your chosen workspace
          </p>
        </header>

        <main className="rounded-2xl border border-slate-800/75 bg-[#040c19]/80 p-4 sm:p-5">
          <Progress stage={stage} />

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          {stage === "EMAIL" ? (
            <form
              onSubmit={handleStartVerification}
              className="mt-5 space-y-4"
            >
              <div>
                <h2 className="text-lg font-semibold">Verify your personal email</h2>
                <p className="mt-1 text-sm text-slate-400">
                  We will send a six-digit verification code.
                </p>
              </div>

              {user ? <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-xs text-emerald-100">
                You are signed in as {user.email}. You can connect this workspace without registering again.
                <Link to={isPropertyInvite ? claimPath(inviteCode) : signedInTarget}
                  className="mt-2 block rounded-lg bg-emerald-300 px-3 py-2 text-center font-bold text-slate-950">Continue with my existing account</Link>
                {isPropertyInvite ? <p className="mt-2 text-[11px]">Your email must match the invitation email. You will confirm the code on the next screen.</p> : null}
              </div> : null}
              {isPropertyInvite ? <div className="rounded-xl border border-violet-400/25 bg-violet-400/5 p-3">
                <Field label={chosenRole==="tenant" ? "Tenant invitation code" : "Property Owner / Partner invitation code"} value={inviteCode}
                  onChange={setInviteCode} placeholder="Code from your PM company's onboarding email" autoComplete="off"/>
                <p className="mt-2 text-[11px] leading-4 text-slate-400">Invitation links prefill the code. Otherwise enter the code from your PM email. Only the invited email can claim access. A code is required to link a portal, not to create a free Personal account.</p>
              </div> : null}
              <Field
                label="Email address"
                value={email}
                onChange={setEmail}
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-cyan-400 px-4 py-3 font-black text-black disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Verification Code"}
              </button>
            </form>
          ) : null}

          {stage === "VERIFY" ? (
            <form onSubmit={handleVerifyCode} className="mt-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Check your email</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Enter the code sent to {email}.
                </p>
              </div>

              <Field
                label="Six-digit code"
                value={verificationCode}
                onChange={(value) =>
                  setVerificationCode(
                    String(value || "")
                      .replace(/\D/g, "")
                      .slice(0, 6)
                  )
                }
                placeholder="000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                className="text-center text-xl font-black tracking-[0.35em]"
              />

              <button
                type="submit"
                disabled={loading || verificationCode.length !== 6}
                className="w-full rounded-2xl bg-cyan-400 px-4 py-3 font-black text-black disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify Email"}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={loading || resendSeconds > 0}
                  onClick={handleResendCode}
                  className="rounded-2xl border border-slate-800 px-3 py-3 text-sm disabled:opacity-40"
                >
                  {resendSeconds > 0
                    ? `Resend in ${resendSeconds}s`
                    : "Resend Code"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setVerificationCode("");
                    setStage("EMAIL");
                  }}
                  className="rounded-2xl border border-slate-800 px-3 py-3 text-sm"
                >
                  Change Email
                </button>
              </div>
            </form>
          ) : null}

          {stage === "ACCOUNT" ? (
            <form
              onSubmit={handleCreateAccount}
              className="mt-6 space-y-4"
            >
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                ✓ {email} verified
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="First name"
                  value={account.firstName}
                  onChange={(value) => updateAccount("firstName", value)}
                  required
                  autoComplete="given-name"
                />

                <Field
                  label="Last name"
                  value={account.lastName}
                  onChange={(value) => updateAccount("lastName", value)}
                  required
                  autoComplete="family-name"
                />
              </div>

              <Field
                label="Username"
                value={account.username}
                onChange={(value) => updateAccount("username", value)}
                required
                autoComplete="username"
              />

              <Field
                label="Password"
                value={account.password}
                onChange={(value) => updateAccount("password", value)}
                type="password"
                placeholder="At least 8 characters"
                required
                autoComplete="new-password"
              />

              <Field
                label="Confirm password"
                value={account.confirmPassword}
                onChange={(value) =>
                  updateAccount("confirmPassword", value)
                }
                type="password"
                required
                autoComplete="new-password"
              />

              <details className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <summary className="cursor-pointer text-sm font-bold text-slate-200">
                  Referral or promo code
                </summary>

                <div className="mt-4 space-y-3">
                  <Field
                    label="Referral code"
                    value={account.affiliateCode}
                    onChange={(value) =>
                      updateAccount(
                        "affiliateCode",
                        normalizeAffiliateCode(value)
                      )
                    }
                    placeholder="Optional"
                    className="uppercase"
                  />

                  <Field
                    label="Promo code"
                    value={account.promoCode}
                    onChange={(value) =>
                      updateAccount("promoCode", normalizeCode(value))
                    }
                    placeholder="Optional"
                    className="uppercase"
                  />

                  {(account.affiliateCode || account.promoCode) && (
                    <button
                      type="button"
                      disabled={codeLoading}
                      onClick={handleCheckCodes}
                      className="w-full rounded-2xl border border-slate-700 px-4 py-3 text-sm font-semibold disabled:opacity-50"
                    >
                      {codeLoading ? "Checking..." : "Check Codes"}
                    </button>
                  )}

                  {codeResult ? (
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 text-xs leading-5 text-slate-300">
                      Referral:{" "}
                      {codeResult?.affiliate?.provided
                        ? codeResult?.affiliate?.valid
                          ? "Valid"
                          : "Invalid"
                        : "Not entered"}
                      <br />
                      Promo:{" "}
                      {codeResult?.promo?.provided
                        ? codeResult?.promo?.valid
                          ? "Valid"
                          : "Invalid"
                        : "Not entered"}
                    </div>
                  ) : null}
                </div>
              </details>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-cyan-400 px-4 py-3 font-black text-black disabled:opacity-50"
              >
                {loading ? "Creating Account..." : onboardingIntent ? "Create Account & Continue" : "Create Free Personal Account"}
              </button>
            </form>
          ) : null}

          <div className="mt-5 border-t border-slate-800 pt-4 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link
              to={signInPath}
              className="font-semibold text-cyan-300 hover:text-cyan-200"
            >
              Sign in
            </Link>
          </div>
        </main>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm font-semibold text-slate-300"
          >
            How It Works
          </button>

          <button
            type="button"
            onClick={() => setUpdatesOpen(true)}
            className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm font-semibold text-slate-300"
          >
            What’s New
          </button>
        </div>
      </div>

      <InfoDrawer
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
      />

      <UpdatesDrawer
        open={updatesOpen}
        onClose={() => setUpdatesOpen(false)}
      />
    </div>
  );
}

