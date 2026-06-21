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

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
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

function usernameFromEmail(value) {
  const email = normalizeEmail(value);
  const base = email.includes("@") ? email.split("@")[0] : email;

  return String(base || "")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 120);
}

function getErrorMessage(error, fallback = "Something went wrong.") {
  if (typeof error?.message === "string" && error.message.trim()) {
    return error.message.trim();
  }

  const data = error?.response?.data;

  if (typeof data === "string" && data.trim()) {
    return data.trim();
  }

  if (typeof data?.detail === "string" && data.detail.trim()) {
    return data.detail.trim();
  }

  if (Array.isArray(data?.non_field_errors) && data.non_field_errors.length) {
    return String(data.non_field_errors[0]);
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

function Pill({ children, tone = "slate" }) {
  const classes =
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
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        classes
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

function FormInput({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  required = false,
  inputMode,
  autoComplete,
  disabled = false,
  maxLength,
  className = "",
}) {
  return (
    <label className="block">
      <div className="text-[11px] font-semibold text-slate-400">{label}</div>

      <input
        className={cx(
          "mt-1 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-500/50 disabled:cursor-not-allowed disabled:opacity-60",
          className
        )}
        placeholder={placeholder}
        value={value}
        type={type}
        required={required}
        inputMode={inputMode}
        autoComplete={autoComplete}
        disabled={disabled}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Modal({ open, onClose, title, subtitle, children }) {
  useEffect(() => {
    if (!open) return undefined;

    function onKeyDown(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 cursor-default bg-black/70"
        onClick={onClose}
      />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
        <div className="pointer-events-auto relative w-full max-w-xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/95 p-6 shadow-[0_0_90px_rgba(0,0,0,0.55)] backdrop-blur">
          <div className="pointer-events-none absolute -inset-20 bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-fuchsia-500/10 blur-3xl" />

          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-extrabold text-slate-100">
                  {title}
                </div>

                {subtitle ? (
                  <div className="mt-1 text-xs leading-5 text-slate-400">
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
    if (!open) return undefined;

    function onKeyDown(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120]">
      <button
        type="button"
        aria-label="Close drawer"
        className="absolute inset-0 cursor-default bg-black/70"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 flex w-full justify-end sm:w-auto">
        <div className="relative h-full w-full overflow-y-auto border-l border-cyan-500/20 bg-[#020617]/98 p-4 shadow-[0_0_100px_rgba(34,211,238,0.16)] backdrop-blur-xl sm:w-[540px] sm:p-6">
          <div className="pointer-events-none absolute -inset-20 bg-gradient-to-br from-cyan-500/10 via-fuchsia-500/10 to-purple-500/10 blur-3xl" />

          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Pill tone="cyan">Business signup</Pill>
                  <Pill tone="emerald">Same verified account</Pill>
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
  const classes =
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
            classes
          )}
        >
          {price}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {bullets.map((bullet) => (
          <div key={bullet} className="flex gap-2 text-sm text-slate-300">
            <span className="text-cyan-300">•</span>
            <span>{bullet}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckboxCard({ checked, onChange, title, desc, tone = "cyan" }) {
  const activeClasses =
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
          ? activeClasses
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

function ProgressSteps({ stage }) {
  const items = [
    { key: "EMAIL", number: 1, label: "Email" },
    { key: "VERIFY", number: 2, label: "Verify" },
    { key: "ACCOUNT", number: 3, label: "Account" },
  ];

  const order = {
    EMAIL: 1,
    VERIFY: 2,
    ACCOUNT: 3,
  };

  const activeNumber = order[stage] || 1;

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => {
        const complete = item.number < activeNumber;
        const active = item.number === activeNumber;

        return (
          <div
            key={item.key}
            className={cx(
              "rounded-2xl border px-2 py-3 text-center",
              complete
                ? "border-emerald-500/35 bg-emerald-500/10"
                : active
                ? "border-cyan-500/45 bg-cyan-500/10"
                : "border-slate-800 bg-slate-950/50"
            )}
          >
            <div
              className={cx(
                "mx-auto flex h-7 w-7 items-center justify-center rounded-full border text-xs font-black",
                complete
                  ? "border-emerald-300 bg-emerald-400 text-black"
                  : active
                  ? "border-cyan-300 bg-cyan-400 text-black"
                  : "border-slate-700 bg-slate-900 text-slate-500"
              )}
            >
              {complete ? "✓" : item.number}
            </div>

            <div
              className={cx(
                "mt-1 text-[10px] font-bold uppercase tracking-[0.14em]",
                complete
                  ? "text-emerald-200"
                  : active
                  ? "text-cyan-200"
                  : "text-slate-600"
              )}
            >
              {item.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CodeStatus({ result }) {
  if (!result) return null;

  if (!result.provided) {
    return null;
  }

  if (result.valid) {
    return (
      <div className="mt-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
        ✓ Code verified
        {result.name ? ` — ${result.name}` : ""}
        {result.description ? ` — ${result.description}` : ""}
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
      This code could not be verified. Correct it or remove it before
      continuing.
    </div>
  );
}

function RegistrationCard({
  stage,
  setStage,
  loading,
  err,
  email,
  setEmail,
  verificationCode,
  setVerificationCode,
  resendSeconds,
  onStartVerification,
  onVerifyCode,
  onResendCode,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  username,
  setUsername,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  affiliateCode,
  setAffiliateCode,
  promoCode,
  setPromoCode,
  codeValidation,
  codeLoading,
  onValidateCodes,
  onCreatePersonal,
  setBusinessDrawerOpen,
  setPricingOpen,
  setClaimOpen,
}) {
  function updateAffiliateCode(value) {
    const normalized = normalizeAffiliateCode(value);

    setAffiliateCode(normalized);

    if (normalized) {
      storeAffiliateCode(normalized);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/65 p-5 shadow-[0_0_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-extrabold">Create your account</div>

          <div className="mt-1 text-xs leading-5 text-slate-400">
            Verify your email, create one secure login, and use SyncWorks across
            Personal, Business, Finance, Health, and more.
          </div>
        </div>

        <Pill tone="cyan">Verified signup</Pill>
      </div>

      <div className="mt-4">
        <ProgressSteps stage={stage} />
      </div>

      {err ? (
        <div className="mt-4 rounded-2xl border border-red-800 bg-red-900/20 p-3 text-sm text-red-300">
          {err}
        </div>
      ) : null}

      {stage === "EMAIL" ? (
        <form onSubmit={onStartVerification} className="mt-5 space-y-4">
          <div className="rounded-3xl border border-cyan-500/25 bg-cyan-500/10 p-4">
            <div className="text-sm font-black text-cyan-100">
              Start with your email
            </div>

            <div className="mt-1 text-xs leading-5 text-slate-300">
              We will send a six-digit verification code. This confirms the
              account belongs to you.
            </div>
          </div>

          <FormInput
            label="Email address"
            placeholder="you@example.com"
            value={email}
            onChange={setEmail}
            type="email"
            required
            autoComplete="email"
          />

          <button
            disabled={loading || !normalizeEmail(email)}
            className={cx(
              "w-full rounded-2xl border px-4 py-3 text-sm font-black transition",
              loading || !normalizeEmail(email)
                ? "border-slate-800 bg-slate-950/60 text-slate-500"
                : "border-cyan-400/45 bg-cyan-400 text-black hover:bg-cyan-300"
            )}
            type="submit"
          >
            {loading ? "Sending Code..." : "Send Verification Code"}
          </button>
        </form>
      ) : null}

      {stage === "VERIFY" ? (
        <form onSubmit={onVerifyCode} className="mt-5 space-y-4">
          <div className="rounded-3xl border border-indigo-500/25 bg-indigo-500/10 p-4">
            <div className="text-sm font-black text-indigo-100">
              Check your email
            </div>

            <div className="mt-1 text-xs leading-5 text-slate-300">
              Enter the six-digit code sent to{" "}
              <span className="font-bold text-white">{email}</span>.
            </div>
          </div>

          <FormInput
            label="Verification code"
            placeholder="000000"
            value={verificationCode}
            onChange={(value) =>
              setVerificationCode(String(value || "").replace(/\D/g, "").slice(0, 6))
            }
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            className="text-center text-xl font-black tracking-[0.35em]"
          />

          <button
            disabled={loading || verificationCode.length !== 6}
            className={cx(
              "w-full rounded-2xl border px-4 py-3 text-sm font-black transition",
              loading || verificationCode.length !== 6
                ? "border-slate-800 bg-slate-950/60 text-slate-500"
                : "border-indigo-400/45 bg-indigo-400 text-black hover:bg-indigo-300"
            )}
            type="submit"
          >
            {loading ? "Verifying..." : "Verify Email"}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={loading || resendSeconds > 0}
              onClick={onResendCode}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resendSeconds > 0
                ? `Resend in ${resendSeconds}s`
                : "Resend Code"}
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setVerificationCode("");
                setStage("EMAIL");
              }}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-900 disabled:opacity-50"
            >
              Change Email
            </button>
          </div>
        </form>
      ) : null}

      {stage === "ACCOUNT" ? (
        <form onSubmit={onCreatePersonal} className="mt-5 space-y-4">
          <div className="rounded-3xl border border-emerald-500/25 bg-emerald-500/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black text-emerald-100">
                  Email verified
                </div>

                <div className="mt-1 text-xs text-emerald-100/75">{email}</div>
              </div>

              <Pill tone="emerald">Confirmed</Pill>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="First name"
              value={firstName}
              onChange={setFirstName}
              required
              autoComplete="given-name"
            />

            <FormInput
              label="Last name"
              value={lastName}
              onChange={setLastName}
              required
              autoComplete="family-name"
            />
          </div>

          <FormInput
            label="Username"
            placeholder="Choose a username"
            value={username}
            onChange={setUsername}
            required
            autoComplete="username"
          />

          <FormInput
            label="Password"
            placeholder="At least 8 characters"
            type="password"
            value={password}
            onChange={setPassword}
            required
            autoComplete="new-password"
          />

          <FormInput
            label="Confirm password"
            placeholder="Enter password again"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            required
            autoComplete="new-password"
          />

          <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="text-sm font-black text-slate-100">
              Have a referral or access code?
            </div>

            <div className="mt-1 text-xs leading-5 text-slate-400">
              Both fields are optional. Affiliate codes track who referred you.
              Promo codes may unlock access or special pricing.
            </div>

            <div className="mt-4 space-y-3">
              <FormInput
                label="Affiliate / referral code"
                placeholder="Optional"
                value={affiliateCode}
                onChange={updateAffiliateCode}
                className="uppercase"
              />

              <CodeStatus result={codeValidation?.affiliate} />

              <FormInput
                label="Promo / access code"
                placeholder="Optional"
                value={promoCode}
                onChange={(value) =>
                  setPromoCode(String(value || "").trim().toUpperCase())
                }
                className="uppercase"
              />

              <CodeStatus result={codeValidation?.promo} />

              <button
                type="button"
                disabled={
                  codeLoading ||
                  (!String(affiliateCode || "").trim() &&
                    !String(promoCode || "").trim())
                }
                onClick={onValidateCodes}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-3 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {codeLoading ? "Checking Codes..." : "Check Codes"}
              </button>
            </div>
          </div>

          <button
            disabled={loading}
            className={cx(
              "w-full rounded-2xl border px-4 py-3 text-sm font-black transition",
              loading
                ? "border-slate-800 bg-slate-950/60 text-slate-500"
                : "border-fuchsia-400/45 bg-fuchsia-400 text-black hover:bg-fuchsia-300"
            )}
            type="submit"
          >
            {loading ? "Creating Account..." : "Create Free Personal Account"}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => setBusinessDrawerOpen(true)}
            className="w-full rounded-2xl border border-cyan-400/40 bg-cyan-500/15 px-4 py-3 text-sm font-black text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.12)] hover:bg-cyan-500/20 disabled:opacity-50"
          >
            Create Account + Business
          </button>
        </form>
      ) : null}

      <div className="mt-4 text-sm text-slate-400">
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
    </div>
  );
}

function BusinessSignupDrawer({
  open,
  onClose,
  loading,
  registrationReady,
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
      subtitle="Your verified Personal account is created first, then your business is added under the same secure login."
    >
      {!registrationReady ? (
        <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
          Complete email verification and account details before creating the
          business.
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <FormInput
          label="Business name"
          placeholder="Example: Acme Home Services"
          value={businessName}
          onChange={setBusinessName}
          required
          autoComplete="organization"
        />

        <FormInput
          label="Business phone"
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
            onChange={(value) => setBusinessState(normalizeStateCode(value))}
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
            Business access code
          </div>

          <div className="mt-1 text-xs leading-5 text-emerald-100/75">
            Optional. Approved codes may waive the monthly Business
            subscription. The platform fee still applies.
          </div>

          <input
            className="mt-3 w-full rounded-2xl border border-emerald-500/30 bg-slate-950 px-4 py-2.5 uppercase text-emerald-100 outline-none placeholder:text-emerald-900/60 focus:border-emerald-400/60"
            placeholder="OPTIONAL-CODE"
            value={businessAccessCode}
            onChange={(event) =>
              setBusinessAccessCode(
                normalizeBusinessAccessCode(event.target.value)
              )
            }
          />
        </div>

        <CheckboxCard
          checked={acceptsMarketplace}
          onChange={setAcceptsMarketplace}
          title="Accept Marketplace Tickets"
          desc="Allow nearby customers to find the business and send service requests."
          tone="cyan"
        />

        <CheckboxCard
          checked={acceptsOnePercent}
          onChange={setAcceptsOnePercent}
          title="I understand the platform fee"
          desc="Access codes may waive the monthly subscription. They do not waive SyncWorks' platform fee on processed business revenue."
          tone="emerald"
        />

        <button
          disabled={
            loading || !registrationReady || !acceptsOnePercent
          }
          type="submit"
          className={cx(
            "w-full rounded-2xl border px-4 py-3 text-sm font-black transition",
            loading || !registrationReady || !acceptsOnePercent
              ? "border-slate-800 bg-slate-950/60 text-slate-500"
              : "border-cyan-400/45 bg-cyan-400 text-black hover:bg-cyan-300"
          )}
        >
          {loading ? "Creating Business..." : "Create Account + Business"}
        </button>
      </form>
    </Drawer>
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

  const [email, setEmail] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [registrationProof, setRegistrationProof] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [affiliateCode, setAffiliateCode] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [codeValidation, setCodeValidation] = useState(null);
  const [codeLoading, setCodeLoading] = useState(false);

  const [resendSeconds, setResendSeconds] = useState(0);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [pricingOpen, setPricingOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [businessDrawerOpen, setBusinessDrawerOpen] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessCity, setBusinessCity] = useState("");
  const [businessState, setBusinessState] = useState("");
  const [businessZip, setBusinessZip] = useState("");
  const [businessAccessCode, setBusinessAccessCode] = useState("");
  const [acceptsOnePercent, setAcceptsOnePercent] = useState(false);
  const [acceptsMarketplace, setAcceptsMarketplace] = useState(true);

  const videoSrc = useMemo(() => "/landing/Servicesrecording.mp4", []);

  useEffect(() => {
    const detectedCode = captureAffiliateCodeFromLocation(location);
    const storedCode = getStoredAffiliateCode();

    setAffiliateCode(detectedCode || storedCode || "");
  }, [location]);

  useEffect(() => {
    if (username) return;

    const suggested = usernameFromEmail(email);

    if (suggested) {
      setUsername(suggested);
    }
  }, [email, username]);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;

    const timer = window.setInterval(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [resendSeconds]);

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

  const registrationReady =
    stage === "ACCOUNT" &&
    Boolean(registrationProof) &&
    Boolean(normalizeEmail(email));

  function validateAccountFields() {
    if (!firstName.trim()) {
      throw new Error("First name is required.");
    }

    if (!lastName.trim()) {
      throw new Error("Last name is required.");
    }

    if (!username.trim()) {
      throw new Error("Username is required.");
    }

    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    if (password !== confirmPassword) {
      throw new Error("Passwords do not match.");
    }

    if (!registrationProof) {
      throw new Error("Verify your email before creating the account.");
    }

    if (
      codeValidation?.affiliate?.provided &&
      !codeValidation?.affiliate?.valid
    ) {
      throw new Error("Correct or remove the invalid affiliate code.");
    }

    if (codeValidation?.promo?.provided && !codeValidation?.promo?.valid) {
      throw new Error("Correct or remove the invalid promo code.");
    }
  }

  async function handleStartVerification(event) {
    event.preventDefault();

    setErr("");
    setLoading(true);

    try {
      const cleanEmail = normalizeEmail(email);

      if (!cleanEmail) {
        throw new Error("Enter a valid email address.");
      }

      const result = await startEmailVerification({
        email: cleanEmail,
        purpose: "REGISTER",
      });

      setEmail(cleanEmail);
      setChallengeId(result?.challenge_id || "");
      setVerificationCode("");
      setRegistrationProof("");
      setResendSeconds(Number(result?.resend_after || 60));
      setStage("VERIFY");
    } catch (error) {
      setErr(getErrorMessage(error, "Unable to send the verification code."));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(event) {
    event.preventDefault();

    setErr("");
    setLoading(true);

    try {
      if (!challengeId) {
        throw new Error("Verification request is missing. Send a new code.");
      }

      if (verificationCode.length !== 6) {
        throw new Error("Enter the six-digit verification code.");
      }

      const result = await verifyEmailCode({
        challengeId,
        code: verificationCode,
      });

      if (!result?.verified || !result?.registration_proof) {
        throw new Error("Email verification could not be completed.");
      }

      setRegistrationProof(result.registration_proof);
      setStage("ACCOUNT");
    } catch (error) {
      setErr(getErrorMessage(error, "Unable to verify the email code."));
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    setErr("");
    setLoading(true);

    try {
      if (!challengeId) {
        throw new Error("Verification request is missing.");
      }

      const result = await resendEmailCode({
        challengeId,
      });

      setChallengeId(result?.challenge_id || challengeId);
      setVerificationCode("");
      setResendSeconds(60);
    } catch (error) {
      setErr(getErrorMessage(error, "Unable to resend the code."));
    } finally {
      setLoading(false);
    }
  }

  async function handleValidateCodes() {
    setErr("");
    setCodeLoading(true);

    try {
      const cleanAffiliateCode = normalizeAffiliateCode(affiliateCode);
      const cleanPromoCode = String(promoCode || "").trim().toUpperCase();

      const result = await resolveSignupCodes({
        affiliateCode: cleanAffiliateCode,
        promoCode: cleanPromoCode,
      });

      setAffiliateCode(cleanAffiliateCode);
      setPromoCode(cleanPromoCode);
      setCodeValidation(result);

      if (cleanAffiliateCode && result?.affiliate?.valid) {
        storeAffiliateCode(cleanAffiliateCode);
      }
    } catch (error) {
      setErr(getErrorMessage(error, "Unable to validate the codes."));
    } finally {
      setCodeLoading(false);
    }
  }

  async function createBaseAccount() {
    validateAccountFields();

    const cleanAffiliateCode = normalizeAffiliateCode(affiliateCode);
    const cleanPromoCode = String(promoCode || "").trim().toUpperCase();

    if (cleanAffiliateCode) {
      storeAffiliateCode(cleanAffiliateCode);
    }

    const result = await register({
      email: normalizeEmail(email),
      username: username.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      password,
      confirm_password: confirmPassword,
      registration_proof: registrationProof,
      affiliate_code: cleanAffiliateCode,
      promo_code: cleanPromoCode,
      registration_source: cleanAffiliateCode ? "INVITATION" : "WEB",
    });

    return {
      result,
      affiliateCode: cleanAffiliateCode,
      promoCode: cleanPromoCode,
    };
  }

  async function handleCreatePersonal(event) {
    event.preventDefault();

    setErr("");
    setLoading(true);

    try {
      await createBaseAccount();
      navigate("/customer", { replace: true });
    } catch (error) {
      setErr(getErrorMessage(error, "Registration failed."));
    } finally {
      setLoading(false);
    }
  }

  async function redeemBusinessAccessCode({ businessId, code }) {
    const cleanCode = normalizeBusinessAccessCode(code);

    if (!cleanCode || !businessId) return;

    try {
      await api.post("/business-access-codes/redeem/", {
        business_id: businessId,
        code: cleanCode,
      });
    } catch (error) {
      const status = error?.response?.status;

      if (status === 404 || status === 405) {
        localStorage.setItem(
          `sw_pending_business_access_code_${businessId}`,
          cleanCode
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
      throw new Error("Confirm the SyncWorks platform fee.");
    }

    const payload = {
      name: cleanBusinessName,
      business_email: normalizeEmail(email),
      owner_name: [firstName, lastName].filter(Boolean).join(" ").trim(),
      phone: String(businessPhone || "").trim(),
      city: String(businessCity || "").trim(),
      state: normalizeStateCode(businessState),
      base_zip: cleanZip,
      accepts_marketplace_tickets: Boolean(acceptsMarketplace),
      service_radius_miles: 25,
      business_presence_mode: "on_site",
      signup_source: "verified_register_business",
      platform_fee_bps: 100,
      understands_platform_fee: true,
      ...(cleanAffiliateCode
        ? {
            affiliate_code: cleanAffiliateCode,
            referral_code: cleanAffiliateCode,
          }
        : {}),
    };

    const response = await api.post("/businesses/", payload);
    const businessId = response?.data?.id || response?.data?.pk;

    await redeemBusinessAccessCode({
      businessId,
      code: businessAccessCode || promoCode,
    });

    if (businessId) {
      localStorage.setItem("sw_active_business_id", String(businessId));
    }

    try {
      await Promise.resolve(reloadBusinesses?.());
    } catch {
      // Business creation succeeded. Refresh failure is non-blocking.
    }

    return businessId;
  }

  async function handleBusinessSubmit(event) {
    event.preventDefault();

    setErr("");
    setLoading(true);

    try {
      const account = await createBaseAccount();

      await createBusinessAfterAccount(account.affiliateCode);

      setBusinessDrawerOpen(false);
      navigate("/sbo/settings?return=/sbo", {
        replace: true,
      });
    } catch (error) {
      setErr(getErrorMessage(error, "Business registration failed."));
    } finally {
      setLoading(false);
    }
  }

  function openBusinessSignup() {
    if (!registrationReady) {
      setErr(
        "Verify your email and complete the account form before creating a business."
      );
    }

    if (!businessAccessCode && promoCode) {
      setBusinessAccessCode(normalizeBusinessAccessCode(promoCode));
    }

    setBusinessDrawerOpen(true);
  }

  function goClaim(kind) {
    setClaimOpen(false);
    navigate(`/portal/claim?portal=${kind}`);
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

        <div className="absolute inset-0 bg-[#020617]/76" />

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
              <Pill tone="cyan">One verified identity</Pill>
              <Pill tone="indigo">Personal operating system</Pill>
              <Pill tone="fuchsia">Personal → Business → PM</Pill>
              <Pill tone="emerald">Affiliate-ready</Pill>
            </div>

            <div>
              <div className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl md:text-5xl">
                <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-400 bg-clip-text text-transparent">
                  One account for everything.
                </span>

                <div className="mt-2 text-slate-100">
                  Build your life, work, money, health, and connections in one
                  place.
                </div>
              </div>

              <div className="mt-4 max-w-2xl text-base leading-relaxed text-slate-200/90 sm:text-lg">
                Start with a free Personal account. Add a business, paid tools,
                groups, finance, health, collections, and more under the same
                verified identity.
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={openBusinessSignup}
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
                  type="button"
                >
                  Enter Portal Code
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
                title="Verify your email"
                desc="Your secure identity starts with a six-digit verification code."
              />

              <Step
                n="2"
                title="Create your Personal account"
                desc="Personal is the free foundation for requests, planning, finance, health, connections, and more."
              />

              <Step
                n="3"
                title="Add referral and promo codes"
                desc="Referral codes track who introduced you. Promo codes can unlock eligible access or pricing."
              />

              <Step
                n="4"
                title="Add a business when ready"
                desc="Create and manage a business under the same verified login without creating another identity."
              />
            </div>

            <div className="grid max-w-2xl gap-3 md:grid-cols-2">
              <Feature
                title="Personal — Free"
                desc="Requests, planning, connections, activity, saved businesses, receipts, and daily organization."
              />

              <Feature
                title="Business"
                desc="Tickets, customers, scheduling, team members, invoicing, reporting, and social automation."
              />

              <Feature
                title="Finance + Health"
                desc="Optional paid tools can be added to the same account when you are ready."
              />

              <Feature
                title="Affiliate Attribution"
                desc="The referring affiliate remains connected to eligible paid products purchased through the account."
              />
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="mx-auto mt-2 w-full max-w-xl lg:sticky lg:top-6 lg:max-w-none">
              <RegistrationCard
                stage={stage}
                setStage={setStage}
                loading={loading}
                err={err}
                email={email}
                setEmail={setEmail}
                verificationCode={verificationCode}
                setVerificationCode={setVerificationCode}
                resendSeconds={resendSeconds}
                onStartVerification={handleStartVerification}
                onVerifyCode={handleVerifyCode}
                onResendCode={handleResendCode}
                firstName={firstName}
                setFirstName={setFirstName}
                lastName={lastName}
                setLastName={setLastName}
                username={username}
                setUsername={setUsername}
                password={password}
                setPassword={setPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                affiliateCode={affiliateCode}
                setAffiliateCode={setAffiliateCode}
                promoCode={promoCode}
                setPromoCode={setPromoCode}
                codeValidation={codeValidation}
                codeLoading={codeLoading}
                onValidateCodes={handleValidateCodes}
                onCreatePersonal={handleCreatePersonal}
                setBusinessDrawerOpen={openBusinessSignup}
                setPricingOpen={setPricingOpen}
                setClaimOpen={setClaimOpen}
              />
            </div>
          </div>
        </div>

        <div className="mt-10 text-center text-[11px] text-slate-500">
          © {new Date().getFullYear()} SyncWorks
        </div>
      </div>

      <BusinessSignupDrawer
        open={businessDrawerOpen}
        onClose={() => setBusinessDrawerOpen(false)}
        loading={loading}
        registrationReady={registrationReady}
        onSubmit={handleBusinessSubmit}
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
        title="SyncWorks Plans"
        subtitle="Start free with Personal. Add tools as your life or business grows."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <PriceCard
            tone="cyan"
            title="Personal"
            price="Free"
            sub="Your everyday SyncWorks account"
            bullets={[
              "Requests and activity",
              "Planner and connections",
              "Messages and receipts",
              "One verified identity",
            ]}
          />

          <PriceCard
            tone="indigo"
            title="Business"
            price="$19.99 / month"
            sub="Eligible access codes may waive the subscription"
            bullets={[
              "Tickets and scheduling",
              "Customers and team",
              "Invoices and payments",
              "Platform fee still applies",
            ]}
          />

          <PriceCard
            tone="emerald"
            title="Health"
            price="$2.99 / month"
            sub="After the free trial"
            bullets={[
              "Workout planning",
              "Training sessions",
              "Progress tracking",
              "Personal coaching tools",
            ]}
          />

          <PriceCard
            tone="fuchsia"
            title="Social Media"
            price="$29.95 / month"
            sub="With an eligible Business subscription"
            bullets={[
              "Content planning",
              "Lead follow-up",
              "Channel connections",
              "Automation tools",
            ]}
          />
        </div>
      </Modal>

      <Modal
        open={claimOpen}
        onClose={() => setClaimOpen(false)}
        title="Enter your portal invite code"
        subtitle="Portal claim codes are for tenants or investors invited by a property manager."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => goClaim("tenant")}
            className="rounded-3xl border border-cyan-500/35 bg-cyan-500/10 p-5 text-left hover:bg-cyan-500/15"
            type="button"
          >
            <div className="text-sm font-semibold text-cyan-200">Tenant</div>

            <div className="mt-1 text-sm text-slate-300">
              I received a tenant code from a property manager.
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
              I received an investor code from a property manager.
            </div>
          </button>
        </div>

        <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-950/50 p-4 text-sm leading-6 text-slate-300">
          Business owners should complete normal registration and choose{" "}
          <button
            type="button"
            onClick={() => {
              setClaimOpen(false);
              openBusinessSignup();
            }}
            className="font-bold text-cyan-300 hover:text-cyan-200"
          >
            Create Business
          </button>
          .
        </div>
      </Modal>
    </div>
  );
}
