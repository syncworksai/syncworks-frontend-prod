// src/pages/CustomerSettings.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";
import Button from "../components/ui/Button";

function Field({ label, children, hint }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-slate-400">{label}</div>
      {children}
      {hint ? <div className="text-[11px] text-slate-500">{hint}</div> : null}
    </div>
  );
}

function safeBool(v, fallback = false) {
  if (typeof v === "boolean") return v;
  return fallback;
}

function coercePrefix(v) {
  const allowed = new Set(["NONE", "MR", "MS", "MRS", "MX", "DR"]);
  return allowed.has(v) ? v : "NONE";
}

export default function CustomerSettings() {
  const nav = useNavigate();
  const loc = useLocation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoErr, setPhotoErr] = useState("");

  // Email is login — display only
  const [email, setEmail] = useState("");

  const [profilePhotoUrl, setProfilePhotoUrl] = useState(null);

  const redirectTimerRef = useRef(null);

  const [form, setForm] = useState({
    // customer identity
    first_name: "",
    last_name: "",
    prefix: "NONE", // Mr/Ms/etc
    suffix: "", // Jr/Sr/III
    phone: "",
    preferred_contact_method: "EMAIL",

    // defaults / preferences
    default_address: "",
    default_zip: "",
    notify_email: true,
    notify_sms: false,
    notify_push: true,
    preferred_calendar_provider: "NONE",
    calendar_sync_enabled: false,
  });

  const qs = useMemo(() => new URLSearchParams(loc.search), [loc.search]);

  // If you navigate here with ?return=/customer (or any path), we’ll go back there.
  const returnTo = useMemo(() => {
    const raw = qs.get("return") || qs.get("return_to") || "";
    if (!raw) return "/customer";
    // basic safety: only allow internal paths
    if (raw.startsWith("/")) return raw;
    return "/customer";
  }, [qs]);

  function clearRedirectTimer() {
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
  }

  async function load() {
    clearRedirectTimer();
    setErr("");
    setOk("");
    setLoading(true);

    try {
      const r = await api.get("/customer-settings/me/");
      const data = r.data || {};

      const cp = data.customer_profile || {};
      setEmail(cp.email || "");

      setForm((prev) => ({
        ...prev,
        first_name: cp.first_name || "",
        last_name: cp.last_name || "",
        prefix: coercePrefix(cp.prefix || "NONE"),
        suffix: cp.suffix || "",
        phone: cp.phone || "",
        preferred_contact_method: cp.preferred_contact_method || "EMAIL",

        default_address: data.default_address || "",
        default_zip: data.default_zip || "",
        notify_email: safeBool(data.notify_email, true),
        notify_sms: safeBool(data.notify_sms, false),
        notify_push: safeBool(data.notify_push, true),
        preferred_calendar_provider: data.preferred_calendar_provider || "NONE",
        calendar_sync_enabled: safeBool(data.calendar_sync_enabled, false),
      }));

      setProfilePhotoUrl(data.profile_photo_url || null);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Failed to load settings");
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
      await api.patch("/customer-settings/me/", form);
      setOk("Settings saved. Returning to dashboard…");

      redirectTimerRef.current = setTimeout(() => {
        nav(returnTo, { replace: true });
      }, 900);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function uploadPhoto(file) {
    if (!file) return;
    clearRedirectTimer();
    setPhotoErr("");
    setOk("");
    setPhotoUploading(true);

    try {
      const fd = new FormData();
      fd.append("profile_photo", file);

      const r = await api.patch("/customer-settings/me/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setProfilePhotoUrl(r.data?.profile_photo_url || null);
      setOk("Photo updated.");
    } catch (e) {
      setPhotoErr(e?.response?.data?.detail || "Photo upload failed");
    } finally {
      setPhotoUploading(false);
    }
  }

  async function removePhoto() {
    clearRedirectTimer();
    setPhotoErr("");
    setOk("");
    setPhotoUploading(true);

    try {
      const fd = new FormData();
      // backend expects clearing via empty string (kept consistent with your existing behavior)
      fd.append("profile_photo", "");
      const r = await api.patch("/customer-settings/me/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProfilePhotoUrl(r.data?.profile_photo_url || null);
      setOk("Photo removed.");
    } catch (e) {
      setPhotoErr(e?.response?.data?.detail || "Remove failed");
    } finally {
      setPhotoUploading(false);
    }
  }

  useEffect(() => {
    load();
    return () => {
      clearRedirectTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="Customer Settings"
        subtitle="Profile • Defaults • Notifications • Calendar • Payments"
        rightActions={
          <Button tone="slate" onClick={() => nav(returnTo)}>
            Back
          </Button>
        }
      />

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
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

          {/* Profile */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 mb-6">
            <div className="font-semibold">Customer Profile</div>
            <div className="text-xs text-slate-400 mt-1">This information appears on your tickets and invoices.</div>

            <div className="mt-4 grid md:grid-cols-2 gap-4">
              <Field label="Title">
                <select
                  value={form.prefix}
                  onChange={(e) => setForm((p) => ({ ...p, prefix: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                >
                  <option value="NONE">—</option>
                  <option value="MR">Mr.</option>
                  <option value="MS">Ms.</option>
                  <option value="MRS">Mrs.</option>
                  <option value="MX">Mx.</option>
                  <option value="DR">Dr.</option>
                </select>
              </Field>

              <Field label="Suffix" hint="Jr, Sr, III (optional)">
                <input
                  value={form.suffix}
                  onChange={(e) => setForm((p) => ({ ...p, suffix: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                  placeholder="Jr"
                />
              </Field>

              <Field label="First Name">
                <input
                  value={form.first_name}
                  onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                  placeholder="First"
                />
              </Field>

              <Field label="Last Name">
                <input
                  value={form.last_name}
                  onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                  placeholder="Last"
                />
              </Field>

              <Field label="Email (login)" hint="Email is your login and can’t be edited here yet.">
                <input
                  value={email}
                  disabled
                  className="w-full rounded-xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-sm text-slate-300 opacity-80"
                />
              </Field>

              <Field label="Phone" hint="Recommended for appointment coordination.">
                <input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                  placeholder="(555) 555-5555"
                />
              </Field>

              <Field label="Preferred contact">
                <select
                  value={form.preferred_contact_method}
                  onChange={(e) => setForm((p) => ({ ...p, preferred_contact_method: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                >
                  <option value="EMAIL">Email</option>
                  <option value="SMS">SMS</option>
                </select>
              </Field>
            </div>

            {/* Photo */}
            {photoErr ? (
              <div className="mt-3 text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-xl p-3">
                {photoErr}
              </div>
            ) : null}

            <div className="mt-5 flex items-center gap-4 flex-wrap">
              <div className="h-16 w-16 rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden shrink-0">
                {profilePhotoUrl ? (
                  <img src={profilePhotoUrl} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-slate-500 text-xs">
                    No photo
                  </div>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                <label className="inline-flex items-center justify-center h-9 text-xs rounded-xl px-4 bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-200 cursor-pointer">
                  {photoUploading ? "Uploading…" : "Upload Photo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => uploadPhoto(e.target.files?.[0])}
                    disabled={photoUploading}
                  />
                </label>

                <Button tone="slate" onClick={removePhoto} disabled={photoUploading || !profilePhotoUrl}>
                  Remove
                </Button>
              </div>
            </div>
          </div>

          {/* Payments (NO card-on-file) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 mb-6">
            <div className="font-semibold">Payments</div>
            <div className="text-xs text-slate-400 mt-1">
              SyncWorks uses <span className="text-slate-200">invoice-based payments</span>. You’ll pay each invoice
              securely through Stripe Checkout when a provider sends it — no card is stored on file.
            </div>

            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-sm text-slate-200">What you’ll see</div>
              <ul className="mt-2 text-xs text-slate-400 list-disc pl-5 space-y-1">
                <li>
                  On an invoice: a <span className="text-slate-200">Pay</span> button opens Stripe Checkout.
                </li>
                <li>
                  If a business hasn’t finished payout setup yet, you’ll see{" "}
                  <span className="text-slate-200">“Business payout setup pending”</span> (payments may be temporarily
                  unavailable).
                </li>
                <li>
                  Invoice statuses: <span className="text-slate-200">DRAFT → SENT → PAID</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Defaults / preferences */}
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Default Address" hint="Used to prefill new service requests.">
              <input
                value={form.default_address}
                onChange={(e) => setForm((p) => ({ ...p, default_address: e.target.value }))}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                placeholder="123 Main St"
              />
            </Field>

            <Field label="Default ZIP" hint="Helps marketplace routing and provider matching.">
              <input
                value={form.default_zip}
                onChange={(e) => setForm((p) => ({ ...p, default_zip: e.target.value }))}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                placeholder="30318"
              />
            </Field>
          </div>

          <div className="mt-6 grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="font-semibold">Notifications</div>
              <div className="mt-3 space-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.notify_email}
                    onChange={(e) => setForm((p) => ({ ...p, notify_email: e.target.checked }))}
                  />
                  <span>Email alerts</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.notify_sms}
                    onChange={(e) => setForm((p) => ({ ...p, notify_sms: e.target.checked }))}
                  />
                  <span>SMS alerts</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.notify_push}
                    onChange={(e) => setForm((p) => ({ ...p, notify_push: e.target.checked }))}
                  />
                  <span>In-app alerts</span>
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="font-semibold">Calendar Preference</div>
              <div className="text-xs text-slate-400 mt-1">Used for scheduling defaults.</div>

              <select
                value={form.preferred_calendar_provider}
                onChange={(e) => setForm((p) => ({ ...p, preferred_calendar_provider: e.target.value }))}
                className="mt-3 w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              >
                <option value="NONE">None</option>
                <option value="GOOGLE">Google</option>
                <option value="OUTLOOK">Outlook</option>
                <option value="APPLE">Apple / iOS</option>
              </select>

              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.calendar_sync_enabled}
                  onChange={(e) => setForm((p) => ({ ...p, calendar_sync_enabled: e.target.checked }))}
                />
                <span>Enable calendar sync</span>
              </label>
            </div>
          </div>

          <div className="mt-6 flex gap-2 flex-wrap">
            <Button tone="cyan" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save Settings"}
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
