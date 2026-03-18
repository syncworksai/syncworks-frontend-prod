import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import ModeBar from "../components/ModeBar";

function centsToDollars(cents) {
  const n = Number(cents || 0);
  return `$${(n / 100).toFixed(2)}`;
}

function Info({ label, value, mono = false }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={"text-sm font-semibold " + (mono ? "font-mono" : "")}>{value}</div>
    </div>
  );
}

function Card({ title, subtitle, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5 shadow-[0_0_60px_rgba(0,0,0,0.25)]">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="font-extrabold text-slate-100">{title}</div>
          {subtitle ? <div className="text-xs text-slate-400 mt-1">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function InputField({
  label,
  type = "text",
  value,
  onChange,
  placeholder = "",
  autoComplete,
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="text-xs text-slate-400 mb-2">{label}</div>
      <input
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={cx(
          "w-full h-11 rounded-2xl border border-slate-800 bg-slate-950/80 px-3 text-sm text-slate-100",
          "placeholder:text-slate-500 outline-none focus:border-cyan-500/40 focus:bg-slate-950/90",
          "shadow-[inset_0_0_0_1000px_rgba(2,6,23,0.95)]"
        )}
        style={{
          WebkitTextFillColor: "#e2e8f0",
          caretColor: "#e2e8f0",
          boxShadow: "inset 0 0 0 1000px rgba(2,6,23,0.95)",
          transition: "background-color 99999s ease-in-out 0s",
        }}
      />
    </div>
  );
}

function ModalShell({ open, onClose, title, subtitle, children }) {
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
        <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-950/95 backdrop-blur p-6 shadow-[0_0_90px_rgba(0,0,0,0.55)] relative overflow-hidden">
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

function ModulePill({ label, unlocked, tone = "cyan" }) {
  const onClass =
    tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : tone === "fuchsia"
      ? "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200"
      : tone === "indigo"
      ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-200"
      : "border-cyan-500/30 bg-cyan-500/10 text-cyan-200";

  const offClass = "border-slate-800 bg-slate-950/60 text-slate-400";

  return (
    <div
      className={cx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold",
        unlocked ? onClass : offClass
      )}
    >
      <span>{label}</span>
      <span className="text-[10px] uppercase tracking-wider">
        {unlocked ? "Unlocked" : "Locked"}
      </span>
    </div>
  );
}

function ChangePasswordCard({ onOk, onErr }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const disabled =
    saving ||
    !form.current_password ||
    !form.new_password ||
    form.new_password.length < 8 ||
    form.new_password !== form.confirm_password;

  async function submit() {
    if (form.new_password !== form.confirm_password) return onErr("New passwords do not match.");
    if (String(form.new_password || "").length < 8) return onErr("Password must be at least 8 characters.");

    setSaving(true);
    try {
      const payloads = [
        { current_password: form.current_password, new_password: form.new_password },
        { old_password: form.current_password, new_password: form.new_password },
        { currentPassword: form.current_password, newPassword: form.new_password },
      ];

      const tries = [
        (p) => api.post("/auth/change-password/", p),
        (p) => api.post("/auth/password/change/", p),
        (p) => api.post("/auth/password/change-password/", p),
        (p) => api.post("/auth/password/", p),
        (p) => api.patch("/auth/me/", p),
      ];

      let lastErr = null;
      for (const p of payloads) {
        for (const fn of tries) {
          try {
            await fn(p);
            setForm({ current_password: "", new_password: "", confirm_password: "" });
            onOk("Password updated ✅");
            setSaving(false);
            return;
          } catch (e) {
            lastErr = e;
          }
        }
      }

      const detail =
        lastErr?.response?.data?.detail ||
        lastErr?.response?.data?.error ||
        lastErr?.message ||
        "Password update failed.";
      onErr(detail);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card
      title="Security"
      subtitle="Change your password"
      right={
        <button
          type="button"
          onClick={submit}
          disabled={disabled}
          className={cx(
            "rounded-2xl px-4 py-2 text-sm font-semibold border transition",
            disabled
              ? "bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed"
              : "bg-cyan-500/12 border-cyan-500/35 hover:bg-cyan-500/18 text-cyan-200"
          )}
        >
          {saving ? "Saving..." : "Update Password"}
        </button>
      }
    >
      <div className="grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <InputField
            label="Current password"
            type="password"
            value={form.current_password}
            onChange={(e) => setForm((p) => ({ ...p, current_password: e.target.value }))}
            placeholder="Current password"
            autoComplete="current-password"
          />
        </div>

        <div>
          <InputField
            label="New password"
            type="password"
            value={form.new_password}
            onChange={(e) => setForm((p) => ({ ...p, new_password: e.target.value }))}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
          <div className="text-[11px] text-slate-500 mt-2">Tip: use a passphrase for strength.</div>
        </div>

        <div>
          <InputField
            label="Confirm new password"
            type="password"
            value={form.confirm_password}
            onChange={(e) => setForm((p) => ({ ...p, confirm_password: e.target.value }))}
            placeholder="Repeat new password"
            autoComplete="new-password"
          />
          {form.confirm_password && form.new_password !== form.confirm_password ? (
            <div className="text-[11px] text-rose-200 mt-2">Passwords do not match.</div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function AccessCodeCard({ onOk, onErr, onUnlocked }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState("");

  async function applyCode() {
    const cleaned = String(code || "").trim().toUpperCase();
    if (!cleaned) {
      setLocalStatus("Please enter your access code.");
      return;
    }

    setLoading(true);
    setLocalStatus("");

    try {
      const res = await api.post(
        "/auth/upgrade-to-sbo-promo/",
        { code: cleaned },
        {
          headers: {
            "X-Business-Id": "",
          },
        }
      );

      const detail = res?.data?.detail || "Access unlocked ✅";
      setCode("");
      setLocalStatus(detail);
      onUnlocked?.();
      onOk?.(detail);
    } catch (e) {
      const detail =
        e?.response?.data?.detail ||
        e?.response?.data?.error ||
        "Unable to apply access code.";
      setLocalStatus(detail);
      onErr?.(detail);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      title="Private Access Code"
      subtitle="Enter your code to unlock additional account access. The code itself is never shown in the app."
      right={
        <button
          type="button"
          onClick={applyCode}
          disabled={loading}
          className={cx(
            "rounded-2xl px-4 py-2 text-sm font-semibold border transition",
            loading
              ? "bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed"
              : "bg-emerald-500/12 border-emerald-500/35 hover:bg-emerald-500/18 text-emerald-200"
          )}
        >
          {loading ? "Applying..." : "Apply Code"}
        </button>
      }
    >
      <div className="space-y-3">
        <InputField
          label="Access code"
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter code"
          autoComplete="off"
        />

        <div className="text-[11px] text-slate-500">
          The code will not be displayed, stored in visible form, or echoed back in the UI.
        </div>

        {localStatus ? (
          <div
            className={cx(
              "rounded-2xl p-3 text-sm border",
              localStatus.toLowerCase().includes("unlock") ||
                localStatus.toLowerCase().includes("success") ||
                localStatus.toLowerCase().includes("applied")
                ? "text-emerald-200 bg-emerald-900/10 border-emerald-800"
                : "text-red-200 bg-red-900/10 border-red-800"
            )}
          >
            {localStatus}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function CreateBusinessModal({ open, onClose, onCreated, onErr, onOk }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    business_email: "",
    phone: "",
    base_zip: "",
  });

  useEffect(() => {
    if (!open) {
      setForm({
        name: "",
        business_email: "",
        phone: "",
        base_zip: "",
      });
      setSaving(false);
    }
  }, [open]);

  async function submit() {
    const name = String(form.name || "").trim();
    if (!name) {
      onErr?.("Business name is required.");
      return;
    }

    setSaving(true);
    try {
      const res = await api.post(
        "/me/businesses/create/",
        {
          name,
          business_email: String(form.business_email || "").trim(),
          phone: String(form.phone || "").trim(),
          base_zip: String(form.base_zip || "").trim(),
        },
        {
          headers: {
            "X-Business-Id": "",
          },
        }
      );

      onOk?.("Business created ✅ Finish the rest in SBO Settings.");
      onCreated?.(res?.data || {});
      onClose?.();
    } catch (e) {
      onErr?.(
        e?.response?.data?.detail ||
          e?.response?.data?.error ||
          "Failed to create business."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Create Business"
      subtitle="Start with the basics. You can finish the rest later in SBO Settings."
    >
      <div className="space-y-3">
        <InputField
          label="Business name"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="Your business name"
          autoComplete="organization"
        />

        <div className="grid md:grid-cols-2 gap-3">
          <InputField
            label="Business email"
            type="email"
            value={form.business_email}
            onChange={(e) => setForm((p) => ({ ...p, business_email: e.target.value }))}
            placeholder="business@email.com"
            autoComplete="email"
          />
          <InputField
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            placeholder="Business phone"
            autoComplete="tel"
          />
        </div>

        <InputField
          label="ZIP code"
          value={form.base_zip}
          onChange={(e) => setForm((p) => ({ ...p, base_zip: e.target.value }))}
          placeholder="ZIP code"
          autoComplete="postal-code"
        />

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl px-4 py-2 text-sm border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className={cx(
              "rounded-2xl px-4 py-2 text-sm font-semibold border",
              saving
                ? "bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed"
                : "border-cyan-500/35 bg-cyan-500/12 hover:bg-cyan-500/18 text-cyan-200"
            )}
          >
            {saving ? "Creating..." : "Create Business"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export default function UserProfile() {
  const nav = useNavigate();
  const loc = useLocation();
  const {
    user,
    mode,
    activeBusinessId,
    setActiveBusinessId,
    reloadBusinesses,
    reload,
    setMode,
    moduleAccess,
    myBusinesses,
    isGod,
  } = useAuth();

  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [billingStatus, setBillingStatus] = useState(null);
  const [billingPreview, setBillingPreview] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingCard, setLoadingCard] = useState(false);

  const [showCreateBusinessModal, setShowCreateBusinessModal] = useState(false);

  const businessSelected = useMemo(() => {
    const n = parseInt(String(activeBusinessId || ""), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [activeBusinessId]);

  const hasBusinesses = useMemo(
    () => (Array.isArray(myBusinesses) ? myBusinesses.length > 0 : false),
    [myBusinesses]
  );

  const canUseSbo = !!moduleAccess?.sbo || hasBusinesses || isGod || user?.role === "SBO";
  const canUsePm = !!moduleAccess?.pm || isGod;
  const canUseSales = !!moduleAccess?.sales || isGod;
  const canUseEmployee = hasBusinesses || isGod;
  const canUseTenant = true;
  const canUseInvestor = true;

  function toastError(s) {
    setMsg("");
    setErr(s || "Something went wrong.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toastSuccess(s) {
    setErr("");
    setMsg(s || "Done.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const isBillingScopedMode = useMemo(() => {
    return ["SBO", "EMPLOYEE", "PM", "PLATFORM"].includes(mode);
  }, [mode]);

  async function loadBilling() {
    if (!businessSelected || !isBillingScopedMode) {
      setBillingStatus(null);
      setBillingPreview(null);
      return;
    }

    setLoading(true);
    setErr("");
    try {
      const [s, p] = await Promise.all([
        api.get("/billing/status/"),
        api.get("/billing/monthly/preview/"),
      ]);
      setBillingStatus(s.data || null);
      setBillingPreview(p.data || null);
    } catch (e) {
      const detail = e?.response?.data?.detail || "Failed to load billing info.";
      toastError(detail);
      setBillingStatus(null);
      setBillingPreview(null);
    } finally {
      setLoading(false);
    }
  }

  async function setupOrUpdateCard() {
    if (!businessSelected) return toastError("Select a business first.");
    setLoadingCard(true);
    setErr("");
    setMsg("");
    try {
      const res = await api.post("/billing/setup-card/");
      if (res.data?.url) {
        window.location.href = res.data.url;
        return;
      }
      if (res.data?.detail) {
        toastSuccess(res.data.detail);
        await loadBilling();
        return;
      }
      toastError("No Stripe URL returned.");
    } catch (e) {
      toastError(e?.response?.data?.detail || "Failed to start card setup.");
    } finally {
      setLoadingCard(false);
    }
  }

  async function handleUnlocked() {
    try {
      await reload?.();
      await reloadBusinesses?.();
    } catch {
      // ignore
    }
  }

  async function handleBusinessCreated(payload) {
    const bizId =
      payload?.business_id ||
      payload?.business?.id ||
      payload?.id ||
      "";

    if (!bizId) {
      toastError("Business created but no business ID was returned.");
      return;
    }

    setActiveBusinessId?.(bizId);

    try {
      await reload?.();
      await reloadBusinesses?.();
    } catch {
      // ignore
    }

    setMode?.("SBO");
    toastSuccess("Business created ✅ Finish the rest in SBO Settings.");
    nav("/sbo/settings");
  }

  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const setup = qs.get("setup");
    if (setup === "success") toastSuccess("Card saved ✅ (Stripe)");
    if (setup === "cancel") toastSuccess("Card setup canceled.");
    loadBilling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadBilling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessSelected, isBillingScopedMode]);

  const billingExempt = !!billingStatus?.billing_exempt;
  const setupComplete = !!billingStatus?.stripe_setup_complete;

  const periodLabel = useMemo(() => {
    const s = billingPreview?.period_start;
    const e = billingPreview?.period_end;
    if (!s || !e) return "—";
    return `${s} → ${e}`;
  }, [billingPreview]);

  const lockedLabel = useMemo(() => {
    if (!billingStatus) return "—";
    if (billingExempt) return "Exempt ✅";
    if (billingStatus.is_locked) return "Locked 🔒";
    if (setupComplete) return "Active ✅";
    return "Needs card ⚠️";
  }, [billingStatus, billingExempt, setupComplete]);

  const returnTo = useMemo(() => {
    const qs = new URLSearchParams(loc.search);
    return qs.get("return") || "/";
  }, [loc.search]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar title="SyncWorks" subtitle="User Profile" />

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xl font-extrabold tracking-tight">User Profile</div>
            <div className="text-xs text-slate-400">
              Account access, security, and billing snapshot.
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => nav("/settings")}
              className="rounded-2xl px-4 py-2 bg-cyan-500/12 border border-cyan-500/35 hover:bg-cyan-500/18 text-sm text-cyan-200 font-semibold"
            >
              Open Settings Hub
            </button>

            <button
              type="button"
              onClick={loadBilling}
              className="rounded-2xl px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-sm"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            <Link
              to={returnTo}
              className="rounded-2xl px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-sm"
            >
              Back
            </Link>
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

        <Card
          title="Access Snapshot"
          subtitle="What this account is signed up for and what is unlocked."
          right={
            <div className="text-[11px] px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-200">
              {isGod ? "God Mode" : user?.role || "User"}
            </div>
          }
        >
          <div className="grid sm:grid-cols-2 gap-3">
            <Info label="Login Email" value={user?.email || user?.username || "—"} mono />
            <Info label="Current Mode" value={mode || "—"} />
            <Info label="Primary Role" value={user?.role || "—"} />
            <Info label="Businesses Linked" value={String(Array.isArray(myBusinesses) ? myBusinesses.length : 0)} />
          </div>

          <div className="mt-4">
            <div className="text-xs text-slate-400 mb-3">Unlocked Modules</div>
            <div className="flex flex-wrap gap-2">
              <ModulePill label="Customer" unlocked={true} tone="cyan" />
              <ModulePill label="SBO" unlocked={canUseSbo} tone="indigo" />
              <ModulePill label="PM" unlocked={canUsePm} tone="fuchsia" />
              <ModulePill label="Sales OS" unlocked={canUseSales} tone="emerald" />
              <ModulePill label="Employee" unlocked={canUseEmployee} tone="cyan" />
              <ModulePill label="Tenant" unlocked={canUseTenant} tone="cyan" />
              <ModulePill label="Investor" unlocked={canUseInvestor} tone="indigo" />
            </div>
          </div>
        </Card>

        <AccessCodeCard
          onOk={toastSuccess}
          onErr={toastError}
          onUnlocked={handleUnlocked}
        />

        {canUseSbo ? (
          <Card
            title="Create Business"
            subtitle="Create a business directly if this account already has SBO access."
            right={
              <button
                type="button"
                onClick={() => setShowCreateBusinessModal(true)}
                className="rounded-2xl px-4 py-2 text-sm font-semibold border border-cyan-500/35 bg-cyan-500/12 hover:bg-cyan-500/18 text-cyan-200"
              >
                Create Business
              </button>
            }
          >
            <div className="text-sm text-slate-300 leading-relaxed">
              Start with the basics here, then finish branding, services, city/state, business type,
              and marketplace routing inside SBO Settings.
            </div>
          </Card>
        ) : (
          <Card
            title="Business Access"
            subtitle="This account does not currently have SBO access unlocked."
            right={
              <button
                type="button"
                onClick={() => nav("/upgrade")}
                className="rounded-2xl px-4 py-2 text-sm font-semibold border border-indigo-500/35 bg-indigo-500/12 hover:bg-indigo-500/18 text-indigo-200"
              >
                Upgrade
              </button>
            }
          >
            <div className="text-sm text-slate-300">
              SBO features stay locked until this account has business access enabled.
            </div>
          </Card>
        )}

        <ChangePasswordCard onOk={toastSuccess} onErr={toastError} />

        <Card
          title="Billing Snapshot"
          subtitle="Business billing preview and current status. Account-side billing can also live here later."
          right={
            businessSelected ? (
              <div className="text-[11px] px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-200">
                Business #{businessSelected}
              </div>
            ) : (
              <div className="text-[11px] px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-100">
                No business selected
              </div>
            )
          }
        >
          {!isBillingScopedMode ? (
            <div className="text-sm text-slate-400">
              Billing is not shown in this mode. Switch to SBO/PM/Employee/Platform to see business billing.
            </div>
          ) : !businessSelected ? (
            <div className="text-sm text-slate-400">
              Select a business from the top bar to see billing preview and status.
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <Info label="State" value={lockedLabel} />
                <Info label="Period" value={periodLabel} mono />
                <Info
                  label="Seats"
                  value={`${billingPreview?.seat_count ?? "—"} (included ${billingPreview?.included_seats ?? "—"})`}
                />
                <Info label="Extra seats" value={String(billingPreview?.extra_seats ?? "—")} />
              </div>

              <div className="mt-4 grid sm:grid-cols-2 gap-3">
                <Info label="SBO subscription" value={centsToDollars(billingPreview?.sbo_subscription_cents)} />
                <Info label="PM subscription" value={centsToDollars(billingPreview?.pm_subscription_cents)} />
                <Info label="Seat charges" value={centsToDollars(billingPreview?.seats_cents)} />
                <Info label="Platform fee" value={centsToDollars(billingPreview?.platform_fee_cents)} />
              </div>

              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-xs text-slate-400">Total due (preview)</div>
                  <div className="text-2xl font-extrabold">{centsToDollars(billingPreview?.total_due_cents)}</div>
                  {billingExempt ? <div className="text-xs text-emerald-200 mt-1">Billing exempt ✅</div> : null}
                </div>

                {!billingExempt ? (
                  <button
                    type="button"
                    onClick={setupOrUpdateCard}
                    disabled={loadingCard}
                    className="rounded-2xl px-5 py-3 bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-sm disabled:opacity-60"
                  >
                    {loadingCard ? "Opening Stripe..." : setupComplete ? "Update Card" : "Add Card on File"}
                  </button>
                ) : (
                  <div className="text-xs text-slate-500">Card not required while exempt.</div>
                )}
              </div>

              <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
                <Info label="Next due date" value={billingStatus?.next_due_date || "—"} mono />
                <Info label="Grace until" value={billingStatus?.grace_until || "—"} mono />
              </div>
            </>
          )}
        </Card>
      </div>

      <CreateBusinessModal
        open={showCreateBusinessModal}
        onClose={() => setShowCreateBusinessModal(false)}
        onCreated={handleBusinessCreated}
        onErr={toastError}
        onOk={toastSuccess}
      />
    </div>
  );
}