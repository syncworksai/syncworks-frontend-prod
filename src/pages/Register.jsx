import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import {
  captureAffiliateCodeFromLocation,
  getStoredAffiliateCode,
  normalizeAffiliateCode,
  storeAffiliateCode,
} from "../api/platformAffiliates";

const INPUT_CLASS =
  "mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400/60";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeState(value) {
  return normalizeCode(value).slice(0, 2);
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
    <div className="grid grid-cols-3 gap-2">
      {items.map((label, index) => {
        const number = index + 1;
        const complete = number < active;
        const current = number === active;

        return (
          <div
            key={label}
            className={`rounded-2xl border p-2.5 text-center ${
              complete
                ? "border-emerald-500/35 bg-emerald-500/10"
                : current
                ? "border-cyan-500/40 bg-cyan-500/10"
                : "border-slate-800 bg-slate-950/50"
            }`}
          >
            <div
              className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                complete
                  ? "bg-emerald-400 text-black"
                  : current
                  ? "bg-cyan-400 text-black"
                  : "bg-slate-800 text-slate-500"
              }`}
            >
              {complete ? "✓" : number}
            </div>

            <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">
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
          Your free Personal account is ready. You can explore SyncWorks or add
          more tools whenever you need them.
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={onContinue}
          className="w-full rounded-2xl bg-cyan-400 px-4 py-3 font-black text-black"
        >
          Enter SyncWorks
        </button>

        <button
          type="button"
          onClick={onBusiness}
          className="w-full rounded-2xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-3 font-bold text-cyan-100"
        >
          Add My Business
        </button>

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

export default function Register() {
  const {
    register,
    startEmailVerification,
    verifyEmailCode,
    resendEmailCode,
    resolveSignupCodes,
    reloadBusinesses,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [stage, setStage] = useState("EMAIL");
  const [loading, setLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [error, setError] = useState("");

  const [infoOpen, setInfoOpen] = useState(false);
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [businessOpen, setBusinessOpen] = useState(false);

  const [email, setEmail] = useState("");
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
    phone: "",
    city: "",
    state: "",
    zip: "",
    accessCode: "",
    acceptsMarketplace: true,
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
        registration_source: affiliateCode ? "INVITATION" : "WEB",
      });

      setStage("WELCOME");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to create your account."));
    } finally {
      setLoading(false);
    }
  }

  async function redeemBusinessCode(businessId, code) {
    const cleanCode = normalizeCode(code);

    if (!businessId || !cleanCode) return;

    try {
      await api.post("/business-access-codes/redeem/", {
        business_id: businessId,
        code: cleanCode,
      });
    } catch (err) {
      if ([404, 405].includes(err?.response?.status)) {
        localStorage.setItem(
          `sw_pending_business_access_code_${businessId}`,
          cleanCode
        );
        return;
      }

      throw err;
    }
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
        business_email: email,
        owner_name: `${account.firstName} ${account.lastName}`.trim(),
        phone: business.phone.trim(),
        city: business.city.trim(),
        state: normalizeState(business.state),
        base_zip: business.zip.trim(),
        accepts_marketplace_tickets: business.acceptsMarketplace,
        service_radius_miles: 25,
        business_presence_mode: "on_site",
        signup_source: "post_registration_business",
        platform_fee_bps: 100,
        understands_platform_fee: true,
        affiliate_code: affiliateCode || undefined,
        referral_code: affiliateCode || undefined,
      });

      const businessId = response?.data?.id || response?.data?.pk;

      await redeemBusinessCode(
        businessId,
        business.accessCode || account.promoCode
      );

      if (businessId) {
        localStorage.setItem("sw_active_business_id", String(businessId));
      }

      try {
        await Promise.resolve(reloadBusinesses?.());
      } catch {
        // Business creation succeeded; refresh can happen later.
      }

      setBusinessOpen(false);

      navigate("/sbo/settings?return=/sbo", {
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
      <div className="min-h-screen bg-[#020617] px-4 py-8 text-slate-100">
        <div className="mx-auto max-w-md">
          <Welcome
            firstName={account.firstName}
            onContinue={() => navigate("/customer", { replace: true })}
            onBusiness={() => setBusinessOpen(true)}
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
    <div className="min-h-screen bg-[#020617] px-4 py-6 text-slate-100">
      <div className="mx-auto max-w-md">
        <header className="mb-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
                SyncWorks
              </div>

              <h1 className="mt-1 text-2xl font-black">
                Create your account
              </h1>
            </div>

            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              aria-label="Learn more"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-slate-950 text-lg font-bold text-cyan-300"
            >
              i
            </button>
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Start free with Personal. Add a business or other modules later.
          </p>
        </header>

        <main className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 shadow-2xl">
          <Progress stage={stage} />

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          {stage === "EMAIL" ? (
            <form
              onSubmit={handleStartVerification}
              className="mt-6 space-y-4"
            >
              <div>
                <h2 className="text-xl font-black">Enter your email</h2>
                <p className="mt-1 text-sm text-slate-400">
                  We will send a six-digit verification code.
                </p>
              </div>

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
                <h2 className="text-xl font-black">Check your email</h2>
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
                {loading ? "Creating Account..." : "Create Free Personal Account"}
              </button>
            </form>
          ) : null}

          <div className="mt-5 border-t border-slate-800 pt-4 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link
              to="/login"
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

