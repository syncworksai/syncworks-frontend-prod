// src/pages/Upgrade.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ModeBar from "../components/ModeBar";
import { useAuth } from "../auth/AuthContext";
import api from "../api/client";

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

function Card({
  tone = "slate",
  title,
  price,
  subtitle,
  bullets,
  ctaLabel,
  onClick,
  badge,
  disabled,
  busy,
}) {
  const ring =
    tone === "fuchsia"
      ? "border-fuchsia-500/30"
      : tone === "cyan"
      ? "border-cyan-500/30"
      : tone === "indigo"
      ? "border-indigo-500/30"
      : tone === "emerald"
      ? "border-emerald-500/30"
      : "border-slate-800";

  const glow =
    tone === "fuchsia"
      ? "shadow-[0_0_38px_rgba(217,70,239,0.10)]"
      : tone === "cyan"
      ? "shadow-[0_0_38px_rgba(34,211,238,0.10)]"
      : tone === "indigo"
      ? "shadow-[0_0_38px_rgba(99,102,241,0.10)]"
      : tone === "emerald"
      ? "shadow-[0_0_38px_rgba(52,211,153,0.10)]"
      : "shadow-[0_0_34px_rgba(148,163,184,0.06)]";

  const pricePillTone = tone;

  return (
    <div className={cx("rounded-3xl border bg-slate-950/45 p-5 relative overflow-hidden", ring, glow)}>
      <div
        className="pointer-events-none absolute -inset-24 blur-3xl opacity-70"
        style={{
          background:
            tone === "cyan"
              ? "radial-gradient(700px 220px at 20% 30%, rgba(34,211,238,0.18), rgba(0,0,0,0) 60%)"
              : tone === "indigo"
              ? "radial-gradient(700px 220px at 20% 30%, rgba(99,102,241,0.18), rgba(0,0,0,0) 60%)"
              : tone === "fuchsia"
              ? "radial-gradient(700px 220px at 20% 30%, rgba(217,70,239,0.18), rgba(0,0,0,0) 60%)"
              : tone === "emerald"
              ? "radial-gradient(700px 220px at 20% 30%, rgba(52,211,153,0.18), rgba(0,0,0,0) 60%)"
              : "radial-gradient(700px 220px at 20% 30%, rgba(148,163,184,0.14), rgba(0,0,0,0) 60%)",
        }}
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-base font-extrabold text-slate-100">{title}</div>
              {badge ? <Pill tone={tone}>{badge}</Pill> : null}
            </div>
            <div className="text-xs text-slate-400 mt-1 leading-relaxed">{subtitle}</div>
          </div>
          <Pill tone={pricePillTone}>{price}</Pill>
        </div>

        <div className="mt-4 space-y-2">
          {bullets.map((b) => (
            <div key={b} className="text-sm text-slate-300 flex gap-2">
              <span className="text-cyan-300">•</span>
              <span>{b}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={onClick}
            disabled={!!disabled}
            className={cx(
              "rounded-2xl px-4 py-2 text-sm font-semibold border transition",
              disabled ? "opacity-60 cursor-not-allowed" : "",
              tone === "cyan"
                ? "border-cyan-500/35 bg-cyan-500/12 hover:bg-cyan-500/18 text-cyan-200"
                : tone === "indigo"
                ? "border-indigo-500/35 bg-indigo-500/12 hover:bg-indigo-500/18 text-indigo-200"
                : tone === "fuchsia"
                ? "border-fuchsia-500/35 bg-fuchsia-500/12 hover:bg-fuchsia-500/18 text-fuchsia-200"
                : tone === "emerald"
                ? "border-emerald-500/35 bg-emerald-500/12 hover:bg-emerald-500/18 text-emerald-200"
                : "border-slate-800 bg-slate-950/60 hover:bg-slate-900/40 text-slate-200"
            )}
          >
            {busy ? "Redirecting…" : ctaLabel}
          </button>
        </div>
      </div>
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
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-950/92 backdrop-blur p-6 shadow-[0_0_90px_rgba(0,0,0,0.55)] relative overflow-hidden">
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

function firstSetupPathFromModules(modulesCsv) {
  const raw = String(modulesCsv || "");
  const list = raw
    .split(",")
    .map((x) => x.trim().toUpperCase())
    .filter(Boolean);

  if (list.includes("SBO")) return "/upgrade/sbo";
  if (list.includes("PM")) return "/upgrade/pm";
  if (list.includes("SALESOS")) return "/upgrade/sales";
  return "/customer";
}

function coerceInt(val) {
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function readJsonStorage(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function Upgrade() {
  const nav = useNavigate();
  const loc = useLocation();
  const auth = useAuth();
  const { mode } = auth || {};

  const [pricingOpen, setPricingOpen] = useState(false);
  const [busyKey, setBusyKey] = useState("");
  const [err, setErr] = useState("");

  const [promoCode, setPromoCode] = useState("");
  const [promoStatus, setPromoStatus] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoBusinessId, setPromoBusinessId] = useState(null);

  const search = useMemo(() => new URLSearchParams(loc.search || ""), [loc.search]);
  const subState = search.get("sub") || "";
  const modulesFromQuery = search.get("modules") || "";
  const nextFromQuery = search.get("next") || "";

  const activeBusinessId = useMemo(() => {
    const candidates = [
      auth?.activeBusinessId,
      auth?.businessId,
      auth?.currentBusinessId,
      auth?.selectedBusinessId,
      auth?.me?.active_business_id,
      auth?.me?.business_id,
      auth?.user?.active_business_id,
      auth?.user?.business_id,
      search.get("business_id"),
      window.localStorage.getItem("active_business_id"),
      window.localStorage.getItem("business_id"),
      window.localStorage.getItem("selectedBusinessId"),
      window.localStorage.getItem("sw_active_business_id"),
      readJsonStorage("sw_auth")?.active_business_id,
      readJsonStorage("sw_auth")?.business_id,
      readJsonStorage("auth")?.active_business_id,
      readJsonStorage("auth")?.business_id,
    ];

    for (const val of candidates) {
      const id = coerceInt(val);
      if (id) return id;
    }
    return null;
  }, [auth, search]);

  useEffect(() => {
    if (subState !== "success") return;

    const target = nextFromQuery || firstSetupPathFromModules(modulesFromQuery);
    const qs = new URLSearchParams();
    if (modulesFromQuery) qs.set("modules", modulesFromQuery);
    qs.set("checkout", "success");

    nav(`${target}?${qs.toString()}`, { replace: true });
  }, [subState, nextFromQuery, modulesFromQuery, nav]);

  useEffect(() => {
    if (subState === "cancel") {
      setErr("Checkout was canceled. No upgrade was applied.");
    }
  }, [subState]);

  const billingNote = useMemo(
    () =>
      "Billing is consolidated: you get one monthly invoice. Any products you activate are line-items that add up into a single monthly total.",
    []
  );

  const backTarget = useMemo(() => {
    const ret = (search.get("return") || "").trim();
    if (ret && ret.startsWith("/")) return ret;

    if (mode === "SBO") return "/sbo";
    if (mode === "PM") return "/pm";
    if (mode === "SALES") return "/sales/board";
    if (mode === "PLATFORM") return "/platform";
    if (mode === "EMPLOYEE") return "/employee";
    return "/customer";
  }, [search, mode]);

  function goBack() {
    try {
      nav(backTarget);
    } catch {
      nav("/customer");
    }
  }

  async function applyPromoCode() {
    const code = String(promoCode || "").trim().toUpperCase();
    if (!code) {
      setPromoStatus("Please enter a promo code.");
      return;
    }

    if (!activeBusinessId) {
      setPromoStatus("Create or select your business first, then apply your promo code.");
      return;
    }

    setPromoLoading(true);
    setPromoStatus("");
    setErr("");

    try {
      const res = await api.post(
        "/auth/upgrade-to-sbo-promo/",
        {
          code,
          business_id: activeBusinessId,
        },
        {
          headers: {
            "X-Business-Id": String(activeBusinessId),
          },
        }
      );

      setPromoApplied(true);
      setPromoBusinessId(activeBusinessId);
      setPromoCode(code);
      setPromoStatus(res?.data?.detail || "success");
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.error ||
        "Invalid promo code or missing business selection.";
      setPromoApplied(false);
      setPromoStatus(String(msg));
    } finally {
      setPromoLoading(false);
    }
  }

  async function startModuleUpgrade(modules, busyLabel) {
    setErr("");
    setBusyKey(busyLabel);

    try {
      const normalized = Array.isArray(modules) ? modules.map((m) => String(m).toUpperCase()) : [];

      if (normalized.length === 1 && normalized[0] === "SBO" && promoApplied) {
        const bid = promoBusinessId || activeBusinessId;
        const qs = new URLSearchParams();
        if (bid) qs.set("business_id", String(bid));
        qs.set("promo", "success");
        nav(`/upgrade/sbo?${qs.toString()}`);
        return;
      }

      const res = await api.post("/billing/subscription/subscribe/", { modules });

      const url = String(res?.data?.url || "").trim();
      if (!url) {
        throw new Error("Upgrade checkout did not return a Stripe URL.");
      }

      window.location.href = url;
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.error ||
        e?.message ||
        "Unable to start upgrade checkout.";
      setErr(String(msg));
    } finally {
      setBusyKey("");
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar title="SyncWorks" subtitle="Upgrade Hub — activate products and add-ons." />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-2xl md:text-3xl font-extrabold tracking-tight">Upgrade Hub</div>
              <Pill tone="cyan">One login</Pill>
              <Pill tone="indigo">Customer-first</Pill>
              <Pill tone="emerald">Modular billing</Pill>
            </div>

            <div className="mt-2 text-sm text-slate-300 max-w-3xl leading-relaxed">
              Upgrade from your customer account first. After checkout, SyncWorks will guide you into the correct setup flow for
              your business or workspace.
            </div>

            <div className="mt-3 text-xs text-slate-400 border border-slate-800 bg-slate-950/40 rounded-2xl p-3 max-w-3xl">
              {billingNote}
            </div>

            {!activeBusinessId ? (
              <div className="mt-3 text-sm text-amber-200 bg-amber-900/10 border border-amber-800 rounded-2xl p-3">
                Select or create your business first before applying an SBO promo code.
              </div>
            ) : null}

            {err ? (
              <div className="mt-3 text-sm text-red-200 bg-red-900/10 border border-red-800 rounded-2xl p-3">
                ⚠️ {err}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPricingOpen(true)}
              className="rounded-2xl px-4 py-2 text-sm font-semibold border border-fuchsia-500/35 bg-fuchsia-500/10 hover:bg-fuchsia-500/15 text-fuchsia-200"
            >
              View pricing
            </button>

            <button
              type="button"
              onClick={goBack}
              className="rounded-2xl px-4 py-2 text-sm border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40"
              title="Back"
            >
              Back
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/45 p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-100">Have a promo code?</div>
              <div className="text-xs text-slate-400 mt-1">
                Enter your access code to unlock special pricing or lifetime offers for SBO.
              </div>
            </div>
            <Pill tone="emerald">Beta Access</Pill>
          </div>

          <div className="mt-4 flex gap-2 flex-wrap">
            <input
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="Enter code (ex: SWFF26)"
              className="flex-1 min-w-[220px] rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-2 text-sm outline-none focus:border-cyan-500/40"
            />

            <button
              type="button"
              onClick={applyPromoCode}
              disabled={promoLoading || !activeBusinessId}
              className="rounded-2xl px-4 py-2 text-sm font-semibold border border-emerald-500/35 bg-emerald-500/12 hover:bg-emerald-500/18 text-emerald-200 disabled:opacity-60"
            >
              {promoLoading ? "Applying..." : "Apply Code"}
            </button>
          </div>

          {promoApplied ? (
            <div className="mt-3 text-sm text-emerald-300 bg-emerald-900/10 border border-emerald-800 rounded-2xl p-3">
              ✅ {promoStatus || "Promo applied — SBO subscription has been waived."}
            </div>
          ) : null}

          {!promoApplied && promoStatus ? (
            <div className="mt-3 text-sm text-red-200 bg-red-900/10 border border-red-800 rounded-2xl p-3">
              ⚠️ {promoStatus}
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid lg:grid-cols-2 gap-4">
          <Card
            tone="indigo"
            title="Start a Business (SBO)"
            badge={promoApplied ? "Promo Active" : "Business Owner"}
            price={promoApplied ? "$0 with promo" : "$19.99 / month"}
            subtitle="Run a service business with tickets, scheduling, payments, team management, and automation."
            bullets={[
              "Marketplace routing and customer requests",
              "Job tracking, invoices, and collections",
              "Business settings, branding, and service areas",
              "Built for streamlined daily operations",
            ]}
            ctaLabel={promoApplied ? "Continue SBO Setup →" : "Upgrade SBO →"}
            onClick={() => startModuleUpgrade(["SBO"], "SBO")}
            disabled={!!busyKey && busyKey !== "SBO"}
            busy={busyKey === "SBO"}
          />

          <Card
            tone="fuchsia"
            title="Property Management"
            badge="PM Workspace"
            price="$49.99 / month"
            subtitle="Manage properties, units, tenants, invites, workflows, and portfolio operations."
            bullets={[
              "Properties, units, tenants, and leases",
              "Work orders and vendor coordination",
              "Tenant and investor access flows",
              "Operations with cleaner portfolio visibility",
            ]}
            ctaLabel="Upgrade PM →"
            onClick={() => startModuleUpgrade(["PM"], "PM")}
            disabled={!!busyKey && busyKey !== "PM"}
            busy={busyKey === "PM"}
          />

          <Card
            tone="emerald"
            title="Sales OS"
            badge="Agent System"
            price="$9.99 / month"
            subtitle="Pipelines, prospect activity, performance visibility, and team sales workflows."
            bullets={[
              "Pipeline stages and prospect tracking",
              "Follow-up activity and visibility",
              "Team sales workflow support",
              "Built for scalable sales organizations",
            ]}
            ctaLabel="Upgrade Sales OS →"
            onClick={() => startModuleUpgrade(["SALESOS"], "SALESOS")}
            disabled={!!busyKey && busyKey !== "SALESOS"}
            busy={busyKey === "SALESOS"}
          />

          <Card
            tone="cyan"
            title="Connect by Code"
            badge="Invites"
            price="Free"
            subtitle="Employees, tenants, and investors join through scoped invite codes."
            bullets={[
              "Employee team access",
              "Tenant portal access",
              "Investor portal access",
              "Scoped and secure invite flow",
            ]}
            ctaLabel="Enter code →"
            onClick={() => nav("/connect")}
            disabled={!!busyKey}
            busy={false}
          />
        </div>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-950/45 p-5">
          <div className="text-sm font-semibold text-slate-100">Optional add-ons</div>
          <div className="mt-2 text-sm text-slate-300 leading-relaxed">
            Finance and Fitness can be activated as add-ons and billed alongside your selected workspace modules.
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => startModuleUpgrade(["FINANCE"], "FINANCE")}
              disabled={!!busyKey && busyKey !== "FINANCE"}
              className="rounded-2xl px-4 py-2 text-sm font-semibold border border-cyan-500/35 bg-cyan-500/12 hover:bg-cyan-500/18 text-cyan-200 disabled:opacity-60"
            >
              {busyKey === "FINANCE" ? "Redirecting…" : "Add Finance ($0.99/mo) →"}
            </button>

            <button
              type="button"
              onClick={() => startModuleUpgrade(["FITNESS"], "FITNESS")}
              disabled={!!busyKey && busyKey !== "FITNESS"}
              className="rounded-2xl px-4 py-2 text-sm font-semibold border border-emerald-500/35 bg-emerald-500/12 hover:bg-emerald-500/18 text-emerald-200 disabled:opacity-60"
            >
              {busyKey === "FITNESS" ? "Redirecting…" : "Add Fitness ($2.99/mo) →"}
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={pricingOpen}
        onClose={() => setPricingOpen(false)}
        title="Pricing"
        subtitle="Customer-first upgrades with modular billing."
      >
        <div className="space-y-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-100">Customers</div>
                <div className="text-xs text-slate-400 mt-1">Requests, tracking, receipts, and messaging.</div>
              </div>
              <Pill tone="cyan">Free</Pill>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-100">Start a Business (SBO)</div>
                <div className="text-xs text-slate-400 mt-1">Business operations and marketplace workflow.</div>
              </div>
              <Pill tone="indigo">$19.99 / mo</Pill>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-100">Property Management</div>
                <div className="text-xs text-slate-400 mt-1">Portfolio operations, tenants, and PM workflows.</div>
              </div>
              <Pill tone="fuchsia">$49.99 / mo</Pill>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-100">Sales OS</div>
                <div className="text-xs text-slate-400 mt-1">Pipelines, prospect tracking, and sales workflow.</div>
              </div>
              <Pill tone="emerald">$9.99 / mo</Pill>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-100">Finance Add-on</div>
                <div className="text-xs text-slate-400 mt-1">Optional finance workspace access.</div>
              </div>
              <Pill tone="cyan">$0.99 / mo</Pill>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-100">Fitness Add-on</div>
                <div className="text-xs text-slate-400 mt-1">Optional fitness workspace access.</div>
              </div>
              <Pill tone="emerald">$2.99 / mo</Pill>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
            <b>Billing:</b> Upgrades start from the customer account first, then continue into the appropriate setup flow.
          </div>
        </div>
      </Modal>
    </div>
  );
}