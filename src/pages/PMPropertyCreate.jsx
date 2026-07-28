import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import ModeBar from "../components/ModeBar";
import Button from "../components/ui/Button";

const API_ROOT = "https://syncworks-api.onrender.com/api/v1";

const PROPERTY_TYPES = [
  ["HOME", "Single-family home"],
  ["MULTIFAMILY", "Multifamily"],
  ["APARTMENT", "Apartment building"],
  ["CONDO", "Condominium"],
  ["TOWNHOME", "Townhome"],
  ["COMMERCIAL", "Commercial"],
  ["OTHER", "Other"],
];

function Field({ label, required, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-300">
        {label}{required ? <span className="text-cyan-300"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1.5 block text-[11px] leading-4 text-slate-500">{hint}</span> : null}
    </label>
  );
}

const controlClass =
  "min-h-12 w-full rounded-2xl border border-slate-700 bg-black/35 px-4 py-3 text-base text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/20";

function normalizeError(responseData, fallback) {
  if (!responseData) return fallback;
  if (typeof responseData === "string") return responseData;
  if (responseData.detail) return String(responseData.detail);

  const entries = Object.entries(responseData);
  if (!entries.length) return fallback;

  return entries
    .map(([key, value]) => {
      const message = Array.isArray(value) ? value.join(", ") : String(value);
      return `${key.replaceAll("_", " ")}: ${message}`;
    })
    .join(" · ");
}

export default function PMPropertyCreate() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    property_type: "HOME",
    address: "",
    city: "",
    state: "",
    zip: "",
    status: "HEALTHY",
    notes: "",
  });

  const canSave = useMemo(
    () => Boolean(form.name.trim() && form.address.trim() && form.city.trim() && form.state.trim() && form.zip.trim()),
    [form]
  );

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function saveProperty(event) {
    event.preventDefault();
    if (!canSave || saving) return;

    setSaving(true);
    setError("");

    const token = localStorage.getItem("sw_token") || "";
    const payload = {
      name: form.name.trim(),
      property_type: form.property_type,
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim().toUpperCase().slice(0, 2),
      zip: form.zip.trim(),
      status: form.status,
      notes: form.notes.trim(),
    };

    try {
      const response = await fetch(`${API_ROOT}/pm/properties/`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Token ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(normalizeError(data, `Property could not be saved (${response.status}).`));
      }

      if (!data?.id) {
        throw new Error("The property was saved, but the API did not return its property ID.");
      }

      navigate(`/pm/properties/${data.id}`, { replace: true });
    } catch (caught) {
      setError(caught?.message || "Property could not be saved. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#02050b] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute -right-40 top-24 h-96 w-96 rounded-full bg-indigo-600/10 blur-[130px]" />
      </div>

      <ModeBar
        title="Create Property"
        subtitle="Add a property to your PM portfolio"
        rightActions={
          <Button tone="slate" type="button" onClick={() => navigate("/pm")}>Cancel</Button>
        }
      />

      <main className="relative z-10 mx-auto max-w-3xl px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-5 sm:pt-7">
        <form onSubmit={saveProperty} className="space-y-5">
          <section className="rounded-[30px] border border-cyan-400/20 bg-[#07111f]/95 p-5 shadow-[0_24px_80px_rgba(0,136,255,0.10)] sm:p-6">
            <div className="mb-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300">Portfolio record</div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">Property information</h1>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                This creates a real backend property record. Units, tenants, leases, and maintenance can be connected after saving.
              </p>
            </div>

            {error ? (
              <div className="mb-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm leading-5 text-rose-100">
                {error}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Property name" required hint="Example: Oak Ridge Apartments or 214 Madison Street">
                  <input
                    className={controlClass}
                    value={form.name}
                    onChange={(event) => update("name", event.target.value)}
                    placeholder="Property name"
                    autoComplete="organization"
                  />
                </Field>
              </div>

              <Field label="Property type" required>
                <select className={controlClass} value={form.property_type} onChange={(event) => update("property_type", event.target.value)}>
                  {PROPERTY_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>

              <Field label="Portfolio status" required>
                <select className={controlClass} value={form.status} onChange={(event) => update("status", event.target.value)}>
                  <option value="HEALTHY">Healthy</option>
                  <option value="WATCH">Watch</option>
                  <option value="AT_RISK">At risk</option>
                </select>
              </Field>

              <div className="sm:col-span-2">
                <Field label="Street address" required>
                  <input
                    className={controlClass}
                    value={form.address}
                    onChange={(event) => update("address", event.target.value)}
                    placeholder="123 Main Street"
                    autoComplete="street-address"
                  />
                </Field>
              </div>

              <Field label="City" required>
                <input
                  className={controlClass}
                  value={form.city}
                  onChange={(event) => update("city", event.target.value)}
                  placeholder="Montgomery"
                  autoComplete="address-level2"
                />
              </Field>

              <div className="grid grid-cols-[0.8fr_1.2fr] gap-3">
                <Field label="State" required>
                  <input
                    className={controlClass}
                    value={form.state}
                    onChange={(event) => update("state", event.target.value.toUpperCase().slice(0, 2))}
                    placeholder="AL"
                    maxLength={2}
                    autoComplete="address-level1"
                  />
                </Field>
                <Field label="ZIP code" required>
                  <input
                    className={controlClass}
                    value={form.zip}
                    onChange={(event) => update("zip", event.target.value)}
                    placeholder="36104"
                    inputMode="numeric"
                    autoComplete="postal-code"
                  />
                </Field>
              </div>

              <div className="sm:col-span-2">
                <Field label="Internal notes" hint="Only your Property Management workspace should see these notes.">
                  <textarea
                    className={`${controlClass} min-h-28 resize-y`}
                    value={form.notes}
                    onChange={(event) => update("notes", event.target.value)}
                    placeholder="Ownership, access, management, or setup notes"
                  />
                </Field>
              </div>
            </div>
          </section>

          <div className="sticky bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-30 rounded-[26px] border border-cyan-400/25 bg-[#07111f]/95 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:static sm:flex sm:justify-end">
            <button
              type="submit"
              disabled={!canSave || saving}
              className="min-h-14 w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 text-sm font-bold text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.24)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto sm:min-w-48"
            >
              {saving ? "Saving property..." : "Save property"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
