import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ModeBar from "../components/ModeBar";
import Button from "../components/ui/Button";
import api from "../api/client";

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-slate-400">{label}</div>
      {children}
      {hint ? <div className="text-[11px] text-slate-500">{hint}</div> : null}
    </div>
  );
}

function readLocal() {
  try {
    const raw = localStorage.getItem("sw_tenant_settings");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLocal(obj) {
  localStorage.setItem("sw_tenant_settings", JSON.stringify(obj || {}));
}

export default function TenantSettings() {
  const nav = useNavigate();
  const loc = useLocation();
  const redirectTimerRef = useRef(null);

  const qs = useMemo(() => new URLSearchParams(loc.search), [loc.search]);
  const returnTo = useMemo(() => {
    const raw = qs.get("return") || qs.get("return_to") || "";
    if (!raw) return "/tenant";
    return raw.startsWith("/") ? raw : "/tenant";
  }, [qs]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyCode, setBusyCode] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    mailing_address: "",
    preferred_contact_method: "email",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    tenant_code: "",
    notify_email: true,
    notify_sms: false,
    notify_push: true,
  });

  function clearRedirectTimer() {
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
  }

  async function load() {
    clearRedirectTimer();
    setLoading(true);
    setErr("");
    setOk("");

    try {
      const local = readLocal();
      setForm((prev) => ({
        ...prev,
        full_name: local.full_name ?? "",
        email: local.email ?? "",
        phone: local.phone ?? "",
        mailing_address: local.mailing_address ?? "",
        preferred_contact_method: local.preferred_contact_method ?? "email",
        emergency_contact_name: local.emergency_contact_name ?? "",
        emergency_contact_phone: local.emergency_contact_phone ?? "",
        tenant_code: local.tenant_code ?? "",
        notify_email: typeof local.notify_email === "boolean" ? local.notify_email : true,
        notify_sms: typeof local.notify_sms === "boolean" ? local.notify_sms : false,
        notify_push: typeof local.notify_push === "boolean" ? local.notify_push : true,
      }));
    } catch (e) {
      setErr(e?.message || "Failed to load tenant settings.");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    clearRedirectTimer();
    setSaving(true);
    setErr("");
    setOk("");

    try {
      writeLocal(form);
      setOk("Tenant settings saved. Returning…");
      redirectTimerRef.current = setTimeout(() => {
        nav(returnTo, { replace: true });
      }, 900);
    } catch (e) {
      setErr(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function claimCode() {
    setBusyCode(true);
    setErr("");
    setOk("");

    try {
      const code = String(form.tenant_code || "").trim();
      if (!code) {
        setErr("Enter your tenant invite code.");
        return;
      }

      await api.post("/tenant/invites/accept/", { code });
      setOk("Tenant invite accepted. Redirecting…");
      redirectTimerRef.current = setTimeout(() => {
        nav("/tenant", { replace: true });
      }, 700);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Unable to accept tenant invite.");
    } finally {
      setBusyCode(false);
    }
  }

  useEffect(() => {
    load();
    return () => clearRedirectTimer();
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="Tenant Settings"
        subtitle="Profile • Contact preferences • Invite linking"
        rightActions={
          <Button tone="slate" onClick={() => nav(returnTo)}>
            Back
          </Button>
        }
      />

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6 shadow-[0_0_60px_rgba(0,0,0,0.24)]">
          {loading ? <div className="text-sm text-slate-400">Loading…</div> : null}

          {err ? (
            <div className="text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-xl p-3 mb-4">
              {err}
            </div>
          ) : null}

          {ok ? (
            <div className="text-sm text-emerald-200 bg-emerald-900/15 border border-emerald-700/30 rounded-xl p-3 mb-4">
              {ok}
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 mb-6">
            <div className="font-semibold">Tenant Profile</div>
            <div className="text-xs text-slate-400 mt-1">
              Keep this clean and current for lease, notices, and tenant communication.
            </div>

            <div className="mt-4 grid md:grid-cols-2 gap-4">
              <Field label="Full Name">
                <input
                  value={form.full_name}
                  onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                  placeholder="Your full name"
                />
              </Field>

              <Field label="Email">
                <input
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                  placeholder="tenant@email.com"
                />
              </Field>

              <Field label="Phone">
                <input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                  placeholder="(555) 555-5555"
                />
              </Field>

              <Field label="Preferred Contact Method">
                <select
                  value={form.preferred_contact_method}
                  onChange={(e) => setForm((p) => ({ ...p, preferred_contact_method: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="phone">Phone</option>
                  <option value="app">In App</option>
                </select>
              </Field>

              <div className="md:col-span-2">
                <Field label="Mailing Address">
                  <input
                    value={form.mailing_address}
                    onChange={(e) => setForm((p) => ({ ...p, mailing_address: e.target.value }))}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                    placeholder="123 Main St, City, ST"
                  />
                </Field>
              </div>

              <Field label="Emergency Contact Name">
                <input
                  value={form.emergency_contact_name}
                  onChange={(e) => setForm((p) => ({ ...p, emergency_contact_name: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                  placeholder="Emergency contact"
                />
              </Field>

              <Field label="Emergency Contact Phone">
                <input
                  value={form.emergency_contact_phone}
                  onChange={(e) => setForm((p) => ({ ...p, emergency_contact_phone: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                  placeholder="(555) 555-5555"
                />
              </Field>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 mb-6">
            <div className="font-semibold">Tenant Invite Link</div>
            <div className="text-xs text-slate-400 mt-1">
              Use your tenant code if your portal is not linked yet.
            </div>

            <div className="mt-4 grid md:grid-cols-[1fr_auto] gap-3 items-end">
              <Field label="Tenant Code" hint="Example: SW-TENANT-XXXX">
                <input
                  value={form.tenant_code}
                  onChange={(e) => setForm((p) => ({ ...p, tenant_code: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm font-mono"
                  placeholder="Enter code"
                />
              </Field>

              <Button tone="cyan" onClick={claimCode} disabled={busyCode}>
                {busyCode ? "Linking…" : "Claim Code"}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 mb-6">
            <div className="font-semibold">Notifications</div>

            <div className="mt-3 space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!form.notify_email}
                  onChange={(e) => setForm((p) => ({ ...p, notify_email: e.target.checked }))}
                />
                <span>Email alerts</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!form.notify_sms}
                  onChange={(e) => setForm((p) => ({ ...p, notify_sms: e.target.checked }))}
                />
                <span>SMS alerts</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!form.notify_push}
                  onChange={(e) => setForm((p) => ({ ...p, notify_push: e.target.checked }))}
                />
                <span>In-app alerts</span>
              </label>
            </div>
          </div>

          <div className="mt-6 flex gap-2 flex-wrap">
            <Button tone="cyan" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save Tenant Settings"}
            </Button>
            <Button tone="slate" onClick={load} disabled={loading || saving}>
              Reset
            </Button>
            <Button tone="indigo" className="ml-auto" onClick={() => nav(returnTo)}>
              Dashboard
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}