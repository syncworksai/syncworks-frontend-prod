// src/pages/Register.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

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
      : "border-slate-800 bg-slate-950/50 text-slate-200";

  return (
    <span className={cx("inline-flex items-center rounded-full border px-2 py-1 text-[11px]", cls)}>
      {children}
    </span>
  );
}

function Feature({ title, desc }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="text-sm font-semibold text-slate-100">{title}</div>
      <div className="text-sm text-slate-400 mt-1 leading-relaxed">{desc}</div>
    </div>
  );
}

function Step({ n, title, desc }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-5">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-2xl border border-slate-800 bg-slate-950/70 flex items-center justify-center text-sm font-extrabold text-slate-200">
          {n}
        </div>
        <div className="text-sm font-semibold text-slate-100">{title}</div>
      </div>
      <div className="mt-2 text-sm text-slate-300 leading-relaxed">{desc}</div>
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
        <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-950/90 backdrop-blur p-6 shadow-[0_0_90px_rgba(0,0,0,0.55)] relative overflow-hidden">
          <div className="pointer-events-none absolute -inset-20 blur-3xl bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-fuchsia-500/10" />
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-extrabold text-slate-100">{title}</div>
                {subtitle ? <div className="text-xs text-slate-400 mt-1">{subtitle}</div> : null}
              </div>
              <button
                onClick={onClose}
                className="h-10 w-10 rounded-2xl border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40 text-slate-200"
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
          <div className="text-xs text-slate-400 mt-1">{sub}</div>
        </div>
        <span className={cx("rounded-2xl px-3 py-2 text-xs font-semibold border", ring)}>{price}</span>
      </div>
      <div className="mt-4 space-y-2">
        {bullets.map((b) => (
          <div key={b} className="text-sm text-slate-300 flex gap-2">
            <span className="text-cyan-300">•</span>
            <span>{b}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Register() {
  const { register, user } = useAuth();
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [first_name, setFirstName] = useState("");
  const [last_name, setLastName] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [pricingOpen, setPricingOpen] = useState(false);

  // ✅ NEW: claim modal
  const [claimOpen, setClaimOpen] = useState(false);

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

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await register({
        email,
        username: username || (email.includes("@") ? email.split("@")[0] : email),
        first_name,
        last_name,
        password,
      });
      nav("/customer", { replace: true });
    } catch (e2) {
      const msg =
        e2?.response?.data?.detail ||
        e2?.response?.data?.non_field_errors?.[0] ||
        JSON.stringify(e2?.response?.data || {}) ||
        e2?.message ||
        "Registration failed";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  function goClaim(kind) {
    // kind: "tenant" | "investor"
    setClaimOpen(false);
    nav(`/portal/claim?portal=${kind}`);
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 relative overflow-hidden">
      {/* Background video */}
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
          className="absolute -inset-y-10 -inset-x-40 blur-xl"
          style={{
            animation: "swSweep 14s ease-in-out infinite",
            background:
              "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.10) 45%, rgba(255,255,255,0) 100%)",
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: How it works */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex items-center gap-2 flex-wrap">
              <Pill tone="cyan">One login</Pill>
              <Pill tone="indigo">Different tabs</Pill>
              <Pill tone="fuchsia">Customer → Business → PM</Pill>
              <Pill tone="emerald">Portals by code</Pill>
            </div>

            <div>
              <div className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
                <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-400 bg-clip-text text-transparent">
                  How SyncWorks works
                </span>
                <div className="text-slate-100 mt-2">
                  Register once — then use the same account for everything.
                </div>
              </div>

              <div className="mt-4 text-slate-200/90 text-lg leading-relaxed max-w-2xl">
                SyncWorks is built to be your <b>forever login</b>. Start free as a customer, then upgrade when you need
                business tools or property management — no new accounts.
              </div>

              <div className="mt-4 flex gap-2 flex-wrap">
                <button
                  onClick={() => setPricingOpen(true)}
                  className="rounded-2xl px-4 py-2 text-sm font-semibold border border-fuchsia-500/35 bg-fuchsia-500/10 hover:bg-fuchsia-500/15 text-fuchsia-200"
                >
                  View Plans
                </button>

                {/* ✅ NEW: Enter your code (small) */}
                <button
                  onClick={() => setClaimOpen(true)}
                  className="rounded-2xl px-4 py-2 text-sm border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40"
                  title="Tenant/Investor invite code"
                >
                  Enter your code
                </button>

                <Link
                  to="/login"
                  className="rounded-2xl px-4 py-2 text-sm border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>

            {/* Steps */}
            <div className="grid md:grid-cols-2 gap-3">
              <Step
                n="1"
                title="Register as a customer"
                desc="Create your account like normal. Customers can submit requests, track progress, message businesses, and keep receipts — free."
              />
              <Step
                n="2"
                title="Use different tabs (same login)"
                desc="Inside the app you switch modes: Customer, SBO (business owner), Employee, and Property Manager — one account, different access."
              />
              <Step
                n="3"
                title="Upgrade when you need it"
                desc="When you're ready to run a business or manage properties, you upgrade. That unlocks scheduling, payments, workflows, team tools, and automation."
              />
              <Step
                n="4"
                title="Tenant / Investor portals use a code"
                desc="If you're a tenant or investor of a property management company, you'll receive a claim/invite code. Click “Enter your code” to connect your portal."
              />
            </div>

            {/* Role cards */}
            <div className="grid md:grid-cols-2 gap-3 max-w-2xl">
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
                title="Portals"
                desc="Tenant & Investor portals are claim-code based. The right people get the right access — clean and secure."
              />
            </div>

            <div className="text-[12px] text-slate-400 max-w-2xl">
              If you’re not a tenant/investor invited by a PM, just create an account normally.
            </div>
          </div>

          <div className="lg:col-span-5" />
        </div>

        {/* Register fixed top-right */}
        <div className="fixed top-6 right-6 z-50 w-[440px] max-w-[calc(100vw-3rem)]">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/55 backdrop-blur p-5 shadow-[0_0_90px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-extrabold">Create account</div>
                <div className="text-xs text-slate-400 mt-1">Start free as a customer — upgrade later.</div>
              </div>
              <Pill tone="cyan">v7.1</Pill>
            </div>

            {err ? (
              <div className="mt-4 text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-2xl p-3">
                {err}
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] text-slate-400">Email</label>
                <input
                  className="mt-1 w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2.5 outline-none focus:border-cyan-500/50"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400">Username (optional)</label>
                <input
                  className="mt-1 w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2.5 outline-none focus:border-cyan-500/50"
                  placeholder="optional"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400">First name</label>
                  <input
                    className="mt-1 w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2.5 outline-none focus:border-cyan-500/50"
                    value={first_name}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Last name</label>
                  <input
                    className="mt-1 w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2.5 outline-none focus:border-cyan-500/50"
                    value={last_name}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400">Password</label>
                <input
                  className="mt-1 w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2.5 outline-none focus:border-cyan-500/50"
                  placeholder="••••••••"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                disabled={loading}
                className={cx(
                  "w-full rounded-2xl py-2.5 font-semibold text-sm border transition",
                  loading
                    ? "opacity-60 border-slate-800 bg-slate-950/60 text-slate-200"
                    : "border-fuchsia-500/35 bg-fuchsia-500/10 hover:bg-fuchsia-500/15 text-fuchsia-200"
                )}
                type="submit"
              >
                {loading ? "Creating..." : "Create Account"}
              </button>
            </form>

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
                className="rounded-2xl px-3 py-2 text-sm border border-cyan-500/35 bg-cyan-500/15 hover:bg-cyan-500/20 text-center text-cyan-200 font-semibold"
              >
                Plans
              </button>

              {/* ✅ NEW: Enter your code (small) */}
              <button
                type="button"
                onClick={() => setClaimOpen(true)}
                className="rounded-2xl px-3 py-2 text-sm border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40 text-center"
                title="Tenant/Investor invite code"
              >
                Code
              </button>

              <Link
                to="/login"
                className="rounded-2xl px-3 py-2 text-sm border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40 text-center"
              >
                Back
              </Link>
            </div>

            <div className="mt-4 text-[11px] text-slate-500">
              Tenant/Investor portals are invite-based. Use your code to connect.
            </div>
          </div>
        </div>

        <div className="mt-10 text-center text-[11px] text-slate-500">
          © {new Date().getFullYear()} SyncWorks — Built for operators.
        </div>
      </div>

      {/* Pricing Modal */}
      <Modal
        open={pricingOpen}
        onClose={() => setPricingOpen(false)}
        title="SyncWorks Pricing"
        subtitle="Customers are free. Upgrade when you’re ready."
      >
        <div className="grid md:grid-cols-2 gap-3">
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
            sub="Per business (monthly)"
            bullets={[
              "Tickets + dispatch + scheduling",
              "Invoices + payment collection",
              "Team assignments",
              "Operations tools + automation",
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
            <div className="text-sm font-semibold text-slate-100">Portals</div>
            <div className="mt-2 text-sm text-slate-300 leading-relaxed space-y-2">
              <div>• Tenants and investors connect using a code provided by the Property Manager.</div>
              <div>• Click “Enter your code” and choose your portal type.</div>
              <div className="mt-3">
                <button
                  onClick={() => setPricingOpen(false)}
                  className="rounded-2xl px-4 py-2 text-sm border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* ✅ Claim Modal */}
      <Modal
        open={claimOpen}
        onClose={() => setClaimOpen(false)}
        title="Enter your invite code"
        subtitle="Choose what type of portal you were invited to."
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            onClick={() => goClaim("tenant")}
            className="rounded-3xl border border-cyan-500/35 bg-cyan-500/10 hover:bg-cyan-500/15 p-5 text-left"
          >
            <div className="text-sm font-semibold text-cyan-200">Tenant</div>
            <div className="mt-1 text-sm text-slate-300">
              I received a tenant code from my Property Manager.
            </div>
            <div className="mt-3 text-[11px] text-slate-400">Route: /portal/claim?portal=tenant</div>
          </button>

          <button
            onClick={() => goClaim("investor")}
            className="rounded-3xl border border-fuchsia-500/35 bg-fuchsia-500/10 hover:bg-fuchsia-500/15 p-5 text-left"
          >
            <div className="text-sm font-semibold text-fuchsia-200">Investor</div>
            <div className="mt-1 text-sm text-slate-300">
              I received an investor code from my Property Manager.
            </div>
            <div className="mt-3 text-[11px] text-slate-400">Route: /portal/claim?portal=investor</div>
          </button>
        </div>

        <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-300">
          If you don’t have a code, you can still create a normal account and start as a customer.
        </div>
      </Modal>
    </div>
  );
}
