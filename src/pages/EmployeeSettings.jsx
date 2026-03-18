import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ModeBar from "../components/ModeBar";
import Button from "../components/ui/Button";

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
    const raw = localStorage.getItem("sw_employee_settings");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLocal(obj) {
  localStorage.setItem("sw_employee_settings", JSON.stringify(obj || {}));
}

export default function EmployeeSettings() {
  const nav = useNavigate();
  const loc = useLocation();
  const redirectTimerRef = useRef(null);

  const qs = useMemo(() => new URLSearchParams(loc.search), [loc.search]);
  const returnTo = useMemo(() => {
    const raw = qs.get("return") || qs.get("return_to") || "";
    if (!raw) return "/employee";
    return raw.startsWith("/") ? raw : "/employee";
  }, [qs]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    company_name: "",
    department: "",
    title: "",
    office_location: "",
    employee_code: "",
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
        company_name: local.company_name ?? "",
        department: local.department ?? "",
        title: local.title ?? "",
        office_location: local.office_location ?? "",
        employee_code: local.employee_code ?? "",
        notify_email: typeof local.notify_email === "boolean" ? local.notify_email : true,
        notify_sms: typeof local.notify_sms === "boolean" ? local.notify_sms : false,
        notify_push: typeof local.notify_push === "boolean" ? local.notify_push : true,
      }));
    } catch (e) {
      setErr(e?.message || "Failed to load employee settings.");
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
      setOk("Employee settings saved. Returning…");
      redirectTimerRef.current = setTimeout(() => {
        nav(returnTo, { replace: true });
      }, 900);
    } catch (e) {
      setErr(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
    return () => clearRedirectTimer();
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="Employee Settings"
        subtitle="Identity • Company • Contact preferences"
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
            <div className="font-semibold">Employee Profile</div>
            <div className="text-xs text-slate-400 mt-1">
              Simple, clean, and production-safe for team members across SyncWorks roles.
            </div>

            <div className="mt-4 grid md:grid-cols-2 gap-4">
              <Field label="Full Name">
                <input
                  value={form.full_name}
                  onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                  placeholder="Employee full name"
                />
              </Field>

              <Field label="Email">
                <input
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                  placeholder="employee@email.com"
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

              <Field label="Company They Work For">
                <input
                  value={form.company_name}
                  onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                  placeholder="SyncWorks Business Name"
                />
              </Field>

              <Field label="Department">
                <input
                  value={form.department}
                  onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                  placeholder="Operations, Dispatch, Field, Admin"
                />
              </Field>

              <Field label="Title">
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                  placeholder="Technician, Dispatcher, Assistant"
                />
              </Field>

              <Field label="Office / Service Area">
                <input
                  value={form.office_location}
                  onChange={(e) => setForm((p) => ({ ...p, office_location: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                  placeholder="Montgomery, AL"
                />
              </Field>

              <Field label="Employee Code" hint="Optional for local recordkeeping until backend is wired.">
                <input
                  value={form.employee_code}
                  onChange={(e) => setForm((p) => ({ ...p, employee_code: e.target.value }))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm font-mono"
                  placeholder="EMP-XXXX"
                />
              </Field>
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
              {saving ? "Saving…" : "Save Employee Settings"}
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