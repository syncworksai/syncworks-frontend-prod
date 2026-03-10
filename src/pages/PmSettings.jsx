// src/pages/PmSettings.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ModeBar from "../components/ModeBar";
import { useAuth } from "../auth/AuthContext";
import api, { getActiveBusinessId } from "../api/client";
import Button from "../components/ui/Button";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Field({ label, children, hint }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-slate-400">{label}</div>
      {children}
      {hint ? <div className="text-[11px] text-slate-500">{hint}</div> : null}
    </div>
  );
}

function normalizeBusinesses(myBusinesses) {
  const arr = Array.isArray(myBusinesses) ? myBusinesses : [];
  return arr
    .map((x) => {
      if (!x) return null;
      if (x.business && typeof x.business === "object") return x.business;
      return x;
    })
    .filter(Boolean);
}

function readLocal() {
  try {
    const raw = localStorage.getItem("sw_pm_settings");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLocal(obj) {
  localStorage.setItem("sw_pm_settings", JSON.stringify(obj || {}));
}

export default function PmSettings() {
  const nav = useNavigate();
  const loc = useLocation();
  const { myBusinesses } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const redirectTimerRef = useRef(null);

  const businesses = useMemo(() => normalizeBusinesses(myBusinesses), [myBusinesses]);
  const activeBiz = useMemo(() => {
    const idRaw = getActiveBusinessId?.() || "";
    const id = idRaw ? Number(idRaw) : null;
    if (!id) return null;
    return (businesses || []).find((b) => Number(b?.id) === Number(id)) || null;
  }, [businesses]);

  const qs = useMemo(() => new URLSearchParams(loc.search), [loc.search]);
  const returnTo = useMemo(() => {
    const raw = qs.get("return") || qs.get("return_to") || "";
    if (!raw) return "/pm";
    if (raw.startsWith("/")) return raw;
    return "/pm";
  }, [qs]);

  const [form, setForm] = useState({
    // PM identity
    manager_name: "",
    company_name: "",
    phone: "",
    email: "",
    website: "",
    office_address: "",

    // PM preferences
    notify_email: true,
    notify_sms: false,
    notify_push: true,

    // ops defaults
    default_late_fee: "",
    default_grace_days: "0",
    auto_post_rent_charges: false,
  });

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
      // ✅ MVP NOW: localStorage
      const s = readLocal();

      // Best-effort: seed from active business if present (optional)
      const seedCompany = activeBiz?.name || "";
      const seedEmail = activeBiz?.business_email || "";
      const seedPhone = activeBiz?.phone || "";
      const seedWebsite = activeBiz?.website || activeBiz?.website_url || "";

      setForm((prev) => ({
        ...prev,
        manager_name: s.manager_name ?? prev.manager_name ?? "",
        company_name: s.company_name ?? seedCompany ?? "",
        phone: s.phone ?? seedPhone ?? "",
        email: s.email ?? seedEmail ?? "",
        website: s.website ?? seedWebsite ?? "",
        office_address: s.office_address ?? "",

        notify_email: typeof s.notify_email === "boolean" ? s.notify_email : true,
        notify_sms: typeof s.notify_sms === "boolean" ? s.notify_sms : false,
        notify_push: typeof s.notify_push === "boolean" ? s.notify_push : true,

        default_late_fee: s.default_late_fee ?? "",
        default_grace_days: s.default_grace_days ?? "0",
        auto_post_rent_charges: typeof s.auto_post_rent_charges === "boolean" ? s.auto_post_rent_charges : false,
      }));

      // Later swap (no UI changes):
      // const r = await api.get("/pm/settings/me/");
      // setForm(r.data);

    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Failed to load PM settings");
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
      // ✅ MVP NOW: localStorage
      writeLocal(form);

      // Later swap:
      // await api.patch("/pm/settings/me/", form);

      setOk("PM settings saved. Returning…");
      redirectTimerRef.current = setTimeout(() => {
        nav(returnTo, { replace: true });
      }, 900);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
    return () => clearRedirectTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBiz?.id]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="PM Settings"
        subtitle="Manager profile • Notifications • Defaults"
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

          {/* PM Profile */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 mb-6">
            <div className="font-semibold">PM Profile</div>
            <div className="text-xs text-slate-400 mt-1">
              This shows on PM-generated notices, invoices, and tenant communications.
            </div>

            <div className="mt-4 grid md:grid-cols-2 gap-4">
              <Field label="Manager Name">
                <input
                  value={form.manager_name}
                  onChange={(e) => setForm((p) => ({ ...p, manager_name: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                  placeholder="e.g., Jacob Lord"
                />
              </Field>

              <Field label="Company Name" hint="Defaults to your active business name if you have one selected.">
                <input
                  value={form.company_name}
                  onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                  placeholder="e.g., Lord Capital Holdings"
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

              <Field label="Email">
                <input
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                  placeholder="pm@company.com"
                />
              </Field>

              <Field label="Website">
                <input
                  value={form.website}
                  onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                  placeholder="https://company.com"
                />
              </Field>

              <Field label="Office Address">
                <input
                  value={form.office_address}
                  onChange={(e) => setForm((p) => ({ ...p, office_address: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                  placeholder="123 Main St, City, ST"
                />
              </Field>
            </div>
          </div>

          {/* Notifications */}
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

          {/* Defaults */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 mb-6">
            <div className="font-semibold">Defaults</div>
            <div className="text-xs text-slate-400 mt-1">MVP defaults for rent/ledger automation (we’ll wire backend later).</div>

            <div className="mt-4 grid md:grid-cols-2 gap-4">
              <Field label="Default Late Fee" hint="Example: 50 or 50.00 (currency formatting later)">
                <input
                  value={form.default_late_fee}
                  onChange={(e) => setForm((p) => ({ ...p, default_late_fee: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                  placeholder="50"
                />
              </Field>

              <Field label="Grace Days" hint="How many days after due date before late fee applies">
                <input
                  type="number"
                  value={form.default_grace_days}
                  onChange={(e) => setForm((p) => ({ ...p, default_grace_days: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                  placeholder="0"
                />
              </Field>

              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!form.auto_post_rent_charges}
                    onChange={(e) => setForm((p) => ({ ...p, auto_post_rent_charges: e.target.checked }))}
                  />
                  <span>Auto-post monthly rent charges (MVP)</span>
                </label>
                <div className="text-[11px] text-slate-500 mt-1">
                  This is a toggle now; later it will drive a scheduled job (monthly postings).
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-2 flex-wrap">
            <Button tone="cyan" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save PM Settings"}
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