import React, { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Building2,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Globe2,
  Home,
  LoaderCircle,
  MapPin,
  Navigation,
  Plus,
  Save,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import ModeBar from "../components/ModeBar";
import { useAuth } from "../auth/AuthContext";
import {
  createIdentityLocation,
  deleteIdentityLocation,
  getBrowserPosition,
  getBusinessTrust,
  getIdentityProfile,
  patchIdentityLocation,
  patchIdentityProfile,
  resolveCurrentLocation,
  submitBusinessVerification,
} from "../api/identity";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Toggle({ checked, onChange, label, detail, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-3 text-left disabled:opacity-50"
    >
      <span className="min-w-0">
        <span className="block text-xs font-black text-white">{label}</span>
        <span className="mt-1 block text-[11px] leading-4 text-slate-500">{detail}</span>
      </span>
      <span className={cx("relative h-6 w-11 shrink-0 rounded-full border transition", checked ? "border-emerald-300/30 bg-emerald-500/25" : "border-slate-700 bg-slate-900")}>
        <span className={cx("absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white transition", checked ? "left-[22px]" : "left-1")} />
      </span>
    </button>
  );
}

function InfoButton({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-white/[.03] text-slate-400" aria-label={`About ${title}`}>
        <CircleHelp className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-[130]">
          <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="absolute inset-x-3 bottom-3 mx-auto max-w-xl rounded-[2rem] border border-cyan-400/20 bg-[#020617] p-5 shadow-[0_0_90px_rgba(0,0,0,.65)] sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Why SyncWorks asks</div>
                <div className="mt-1 text-lg font-black text-white">{title}</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-slate-300"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 text-sm leading-6 text-slate-400">{children}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Field({ label, value, onChange, placeholder = "", type = "text", help = null, readOnly = false, className = "" }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-slate-500">
        {label}
        {help}
      </span>
      <input
        type={type}
        value={value ?? ""}
        readOnly={readOnly}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        className={cx(
          "h-11 w-full rounded-2xl border px-3 text-sm outline-none transition",
          readOnly
            ? "border-white/8 bg-white/[.02] text-slate-500"
            : "border-white/10 bg-slate-950/80 text-white placeholder:text-slate-600 focus:border-cyan-400/40"
        )}
      />
    </label>
  );
}

function Card({ title, subtitle, icon: Icon, action, children }) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {Icon ? <div className="grid h-10 w-10 place-items-center rounded-2xl border border-cyan-400/15 bg-cyan-500/[.06]"><Icon className="h-5 w-5 text-cyan-200" /></div> : null}
          <div>
            <h2 className="text-base font-black text-white sm:text-lg">{title}</h2>
            {subtitle ? <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">{subtitle}</p> : null}
          </div>
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function LocationEditor({ open, initial = null, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ kind: "SAVED", label: "", address_line1: "", address_line2: "", city: "", state: "", postal_code: "", country: "US", is_default_service: false });

  useEffect(() => {
    if (!open) return;
    setForm(initial ? {
      kind: initial.kind || "SAVED",
      label: initial.label || "",
      address_line1: initial.address_line1 || "",
      address_line2: initial.address_line2 || "",
      city: initial.city || "",
      state: initial.state || "",
      postal_code: initial.postal_code || "",
      country: initial.country || "US",
      is_default_service: !!initial.is_default_service,
    } : { kind: "SAVED", label: "", address_line1: "", address_line2: "", city: "", state: "", postal_code: "", country: "US", is_default_service: false });
    setError("");
  }, [open, initial]);

  if (!open) return null;

  async function save() {
    if (!form.address_line1.trim()) return setError("Street address is required.");
    setSaving(true);
    setError("");
    try {
      const saved = initial?.id ? await patchIdentityLocation(initial.id, form) : await createIdentityLocation(form);
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.response?.data?.address_line1 || "Could not save location.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[125]">
      <button type="button" aria-label="Close location editor" onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="absolute inset-x-3 bottom-3 mx-auto max-h-[88dvh] max-w-2xl overflow-y-auto rounded-[2rem] border border-cyan-400/20 bg-[#020617] p-5 shadow-[0_0_90px_rgba(0,0,0,.7)] sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2">
        <div className="flex items-start justify-between gap-3">
          <div><div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Location book</div><h3 className="mt-1 text-xl font-black text-white">{initial ? "Edit location" : "Add a place"}</h3></div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-slate-300"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-500">Type</span><select value={form.kind} onChange={(e) => setForm((prev) => ({ ...prev, kind: e.target.value }))} className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm text-white"><option value="HOME">Home</option><option value="WORK">Work</option><option value="SAVED">Saved place</option></select></label>
          <Field label="Label" value={form.label} onChange={(value) => setForm((prev) => ({ ...prev, label: value }))} placeholder={form.kind === "HOME" ? "Home" : "Mom's house, office..."} />
          <Field className="sm:col-span-2" label="Street address" value={form.address_line1} onChange={(value) => setForm((prev) => ({ ...prev, address_line1: value }))} placeholder="123 Main St" />
          <Field className="sm:col-span-2" label="Unit / apartment" value={form.address_line2} onChange={(value) => setForm((prev) => ({ ...prev, address_line2: value }))} placeholder="Optional" />
          <Field label="City" value={form.city} onChange={(value) => setForm((prev) => ({ ...prev, city: value }))} />
          <Field label="State" value={form.state} onChange={(value) => setForm((prev) => ({ ...prev, state: value.toUpperCase() }))} />
          <Field label="ZIP / postal code" value={form.postal_code} onChange={(value) => setForm((prev) => ({ ...prev, postal_code: value }))} />
          <Field label="Country" value={form.country} onChange={(value) => setForm((prev) => ({ ...prev, country: value.toUpperCase() }))} />
        </div>
        <Toggle checked={form.kind === "HOME" || form.is_default_service} disabled={form.kind === "HOME"} onChange={(value) => setForm((prev) => ({ ...prev, is_default_service: value }))} label="Default for service requests" detail="Home is always the default unless you deliberately choose another service location." />
        {error ? <div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-500/[.06] px-3 py-2 text-xs text-rose-100">{error}</div> : null}
        <button type="button" onClick={save} disabled={saving} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 text-sm font-black text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save location</button>
      </div>
    </div>
  );
}

function TrustCard({ business }) {
  const [trust, setTrust] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    if (!business?.id) return;
    setLoading(true);
    try { setTrust(await getBusinessTrust(business.id)); } catch { setTrust(null); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [business?.id]);

  async function submit() {
    setSubmitting(true);
    try { setTrust(await submitBusinessVerification(business.id)); } finally { setSubmitting(false); }
  }

  const verification = trust?.verification || {};
  const checks = verification.checks || {};
  const status = verification.status || "UNVERIFIED";

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[.025] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-slate-900">{business?.logo_url || business?.logo ? <img src={business.logo_url || business.logo} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-5 w-5 text-violet-200" />}</div>
          <div><div className="font-black text-white">{business?.name || "Business"}</div><div className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-500">{loading ? "Checking…" : status.replaceAll("_", " ")}</div></div>
        </div>
        {status === "VERIFIED" ? <BadgeCheck className="h-6 w-6 text-emerald-300" /> : <ShieldCheck className="h-6 w-6 text-slate-500" />}
      </div>
      {!loading ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Object.entries(checks).map(([key, value]) => <div key={key} className={cx("rounded-xl border px-2.5 py-2 text-[10px] font-black uppercase tracking-wider", value ? "border-emerald-400/20 bg-emerald-500/[.06] text-emerald-200" : "border-white/8 bg-white/[.02] text-slate-600")}>{value ? "✓ " : "○ "}{key.replaceAll("_", " ")}</div>)}
          </div>
          <p className="mt-3 text-[11px] leading-5 text-slate-500">{verification.disclaimer || "Verification confirms only the checks shown and is not a guarantee of service quality."}</p>
          {status === "UNVERIFIED" || status === "REJECTED" ? <button type="button" disabled={submitting} onClick={submit} className="mt-3 rounded-xl border border-violet-400/20 bg-violet-500/[.08] px-3 py-2 text-xs font-black text-violet-100 disabled:opacity-50">{submitting ? "Submitting…" : "Start verification"}</button> : null}
          {status === "IN_REVIEW" ? <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/[.06] px-3 py-2 text-xs font-bold text-amber-100">Verification review requested.</div> : null}
        </>
      ) : null}
    </div>
  );
}

export default function IdentitySettings() {
  const nav = useNavigate();
  const { myBusinesses } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [locationEditor, setLocationEditor] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locating, setLocating] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await getIdentityProfile();
      setProfile(data);
      setForm({
        first_name: data?.user?.first_name || "",
        last_name: data?.user?.last_name || "",
        display_name: data?.identity?.display_name || "",
        phone: data?.identity?.phone || "",
        bio: data?.identity?.bio || "",
        public_city: data?.identity?.public_city || "",
        public_state: data?.identity?.public_state || "",
        show_photo_services: data?.identity?.show_photo_services !== false,
        show_photo_social: data?.identity?.show_photo_social !== false,
        show_photo_groups: data?.identity?.show_photo_groups !== false,
        show_city_public: !!data?.identity?.show_city_public,
        use_current_for_weather: data?.identity?.use_current_for_weather !== false,
        use_current_for_traffic: data?.identity?.use_current_for_traffic !== false,
        use_current_for_nearby: data?.identity?.use_current_for_nearby !== false,
        use_current_for_local_info: data?.identity?.use_current_for_local_info !== false,
      });
    } catch (err) {
      setError(err?.response?.data?.detail || "Identity settings are temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const locations = profile?.locations || [];
  const home = profile?.home_location || null;
  const completion = useMemo(() => {
    const checks = [form?.first_name, form?.last_name, form?.phone, home];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form, home]);

  async function saveProfile(patch = null) {
    if (!form) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const data = await patchIdentityProfile(patch || form);
      setProfile(data);
      setMessage("Identity updated across SyncWorks.");
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not save identity settings.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadPhoto(file) {
    if (!file) return;
    const data = new FormData();
    data.append("profile_photo", file);
    setSaving(true);
    try {
      const updated = await patchIdentityProfile(data);
      setProfile(updated);
      setMessage("Profile photo updated.");
    } catch {
      setError("Could not upload profile photo.");
    } finally { setSaving(false); }
  }

  async function useCurrent() {
    setLocating(true);
    setError("");
    try {
      const point = await getBrowserPosition();
      let resolved = null;
      try { resolved = await resolveCurrentLocation(point.latitude, point.longitude); } catch { resolved = { ...point, available: false }; }
      setCurrentLocation({ ...point, ...resolved, capturedAt: new Date().toISOString() });
    } catch (err) {
      setError(err?.message || "Current location permission was not available.");
    } finally { setLocating(false); }
  }

  async function removeLocation(location) {
    if (!window.confirm(`Remove ${location.label || location.kind.toLowerCase()}?`)) return;
    await deleteIdentityLocation(location.id);
    await load();
  }

  if (loading || !form) {
    return <div className="min-h-dvh bg-[#020617] text-white"><ModeBar title="SyncWorks" subtitle="Identity & trust" /><div className="mx-auto flex max-w-7xl items-center gap-2 px-5 py-12 text-sm text-slate-400"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading your identity…</div></div>;
  }

  return (
    <div className="min-h-dvh bg-[#020617] text-slate-100">
      <ModeBar title="SyncWorks" subtitle="Identity, locations & trust" />
      <main className="mx-auto max-w-7xl space-y-4 px-3 pb-28 pt-5 sm:px-5 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_90%_10%,rgba(139,92,246,.18),transparent_35%),rgba(2,6,23,.88)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex min-w-0 items-center gap-4">
              <label className="relative grid h-20 w-20 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-[1.5rem] border border-cyan-400/25 bg-slate-900 shadow-[0_0_32px_rgba(34,211,238,.12)]">
                {profile?.identity?.profile_photo_url ? <img src={profile.identity.profile_photo_url} alt="Profile" className="h-full w-full object-cover" /> : <UserRound className="h-8 w-8 text-cyan-200" />}
                <span className="absolute inset-x-0 bottom-0 flex h-7 items-center justify-center bg-black/65"><Camera className="h-3.5 w-3.5 text-white" /></span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadPhoto(e.target.files?.[0])} />
              </label>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">SyncWorks Identity</div>
                <h1 className="mt-1 truncate text-2xl font-black text-white sm:text-3xl">{form.display_name || `${form.first_name} ${form.last_name}`.trim() || "Your profile"}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400"><span>{profile?.user?.email}</span>{profile?.user?.email_verified ? <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-500/[.06] px-2 py-1 font-black text-emerald-200"><CheckCircle2 className="h-3 w-3" /> Verified email</span> : null}</div>
              </div>
            </div>
            <div className="min-w-[180px] rounded-2xl border border-white/10 bg-white/[.025] p-4"><div className="flex items-center justify-between text-xs"><span className="font-black text-white">Profile readiness</span><span className="font-black text-cyan-200">{completion}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-900"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500" style={{ width: `${completion}%` }} /></div><div className="mt-2 text-[10px] leading-4 text-slate-500">Ask once. Reuse safely across services, Social, SYNC and future discovery.</div></div>
          </div>
        </section>

        {message ? <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[.06] px-4 py-3 text-sm text-emerald-100">{message}</div> : null}
        {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-500/[.06] px-4 py-3 text-sm text-rose-100">{error}</div> : null}

        <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
          <div className="space-y-4">
            <Card title="Personal identity" subtitle="This is the central profile used throughout SyncWorks. Your email stays tied to the verified account flow." icon={UserRound} action={<button type="button" onClick={() => saveProfile()} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-500 px-3 text-xs font-black text-slate-950 disabled:opacity-50"><Save className="h-4 w-4" /> Save</button>}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="First name" value={form.first_name} onChange={(value) => setForm((prev) => ({ ...prev, first_name: value }))} />
                <Field label="Last name" value={form.last_name} onChange={(value) => setForm((prev) => ({ ...prev, last_name: value }))} />
                <Field label="Display name" value={form.display_name} onChange={(value) => setForm((prev) => ({ ...prev, display_name: value }))} help={<InfoButton title="Display name">This is how you can appear in Social, groups and other user-facing areas. Your account identity remains attached behind the scenes.</InfoButton>} />
                <Field label="Mobile number" type="tel" value={form.phone} onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))} help={<InfoButton title="Mobile number">Used for account and service communication. If you later enable text alerts, this is the number SyncWorks will use.</InfoButton>} />
                <Field className="sm:col-span-2" label="Verified email" value={profile?.user?.email || ""} readOnly help={<InfoButton title="Verified email">This is currently the email used for account verification and email notifications. Changing it should always use a verification flow.</InfoButton>} />
                <Field label="Public city" value={form.public_city} onChange={(value) => setForm((prev) => ({ ...prev, public_city: value }))} />
                <Field label="Public state" value={form.public_state} onChange={(value) => setForm((prev) => ({ ...prev, public_state: value }))} />
                <label className="sm:col-span-2"><span className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-500">Short bio</span><textarea value={form.bio} onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))} rows={3} maxLength={500} className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-white outline-none focus:border-cyan-400/40" placeholder="Optional — a little about you." /></label>
              </div>
            </Card>

            <Card title="Profile visibility" subtitle="Your home address and live/current location are never public profile fields. Control where your photo and general city can appear." icon={ShieldCheck}>
              <div className="grid gap-2 sm:grid-cols-2">
                <Toggle checked={form.show_photo_services} onChange={(value) => { setForm((prev) => ({ ...prev, show_photo_services: value })); saveProfile({ show_photo_services: value }); }} label="Service providers" detail="Allow your profile photo to be shown in appropriate service interactions." />
                <Toggle checked={form.show_photo_social} onChange={(value) => { setForm((prev) => ({ ...prev, show_photo_social: value })); saveProfile({ show_photo_social: value }); }} label="SyncWorks Social" detail="Allow your photo on your internal Social identity." />
                <Toggle checked={form.show_photo_groups} onChange={(value) => { setForm((prev) => ({ ...prev, show_photo_groups: value })); saveProfile({ show_photo_groups: value }); }} label="Groups & teams" detail="Allow your photo in teams, groups and event communities." />
                <Toggle checked={form.show_city_public} onChange={(value) => { setForm((prev) => ({ ...prev, show_city_public: value })); saveProfile({ show_city_public: value }); }} label="Show city/state" detail="Show only your general city/state — never your street address." />
              </div>
              <div className="mt-3 rounded-2xl border border-emerald-400/15 bg-emerald-500/[.04] p-3 text-xs leading-5 text-slate-400"><ShieldCheck className="mr-2 inline h-4 w-4 text-emerald-200" />Home and device location stay operational/private. SyncWorks can use them to complete requested features without publishing them on your profile.</div>
            </Card>

            <Card title="Your location book" subtitle="Home is your default service and delivery location. Saved places are reusable. Current location is a separate, temporary device context." icon={MapPin} action={<button type="button" onClick={() => setLocationEditor({ mode: "new" })} className="inline-flex h-10 items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/[.07] px-3 text-xs font-black text-cyan-100"><Plus className="h-4 w-4" /> Add place</button>}>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-3xl border border-cyan-400/20 bg-cyan-500/[.05] p-4">
                  <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-xs font-black text-white"><Home className="h-4 w-4 text-cyan-200" /> Home</div><div className="mt-2 text-sm font-bold text-slate-200">{home?.formatted_address || "No Home address saved"}</div></div>{home ? <span className="rounded-full border border-emerald-400/20 bg-emerald-500/[.06] px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-200">Default</span> : null}</div>
                  <p className="mt-3 text-[11px] leading-5 text-slate-500">Used by default for on-site service requests and delivery-style features. It never changes simply because you travel.</p>
                  <button type="button" onClick={() => setLocationEditor({ mode: "edit", location: home || { kind: "HOME", label: "Home", is_default_service: true } })} className="mt-3 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-xs font-black text-white">{home ? "Edit Home" : "Add Home"}</button>
                </div>

                <div className="rounded-3xl border border-violet-400/20 bg-violet-500/[.05] p-4">
                  <div className="flex items-center gap-2 text-xs font-black text-white"><Navigation className="h-4 w-4 text-violet-200" /> Current location</div>
                  <div className="mt-2 text-sm font-bold text-slate-200">{currentLocation?.label || (currentLocation ? `${currentLocation.latitude.toFixed(5)}, ${currentLocation.longitude.toFixed(5)}` : "Not requested this session")}</div>
                  <p className="mt-3 text-[11px] leading-5 text-slate-500">Temporary device location for weather, traffic, nearby food/retail, travel and explicit service-address overrides. It does not replace Home.</p>
                  <button type="button" disabled={locating} onClick={useCurrent} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/[.08] px-3 py-2 text-xs font-black text-violet-100 disabled:opacity-50">{locating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />} Use current location</button>
                </div>
              </div>

              {locations.filter((item) => item.kind !== "HOME").length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{locations.filter((item) => item.kind !== "HOME").map((location) => <div key={location.id} className="rounded-2xl border border-white/10 bg-white/[.02] p-3"><div className="flex items-start justify-between gap-2"><div><div className="text-xs font-black text-white">{location.label || location.kind}</div><div className="mt-1 text-[11px] leading-4 text-slate-500">{location.formatted_address}</div></div><div className="flex gap-1"><button type="button" onClick={() => setLocationEditor({ mode: "edit", location })} className="rounded-lg border border-white/10 px-2 py-1 text-[10px] font-bold text-slate-300">Edit</button><button type="button" onClick={() => removeLocation(location)} className="grid h-7 w-7 place-items-center rounded-lg border border-rose-400/15 text-rose-300"><Trash2 className="h-3 w-3" /></button></div></div></div>)}</div> : null}
            </Card>
          </div>

          <div className="space-y-4">
            <Card title="Current-location intelligence" subtitle="Choose what SYNC may use your current device location for when permission is available." icon={Globe2}>
              <div className="space-y-2">
                <Toggle checked={form.use_current_for_weather} onChange={(value) => { setForm((prev) => ({ ...prev, use_current_for_weather: value })); saveProfile({ use_current_for_weather: value }); }} label="Weather" detail="Use where you are now, not your Home address." />
                <Toggle checked={form.use_current_for_traffic} onChange={(value) => { setForm((prev) => ({ ...prev, use_current_for_traffic: value })); saveProfile({ use_current_for_traffic: value }); }} label="Traffic & travel" detail="Drive times, departure planning and route context." />
                <Toggle checked={form.use_current_for_nearby} onChange={(value) => { setForm((prev) => ({ ...prev, use_current_for_nearby: value })); saveProfile({ use_current_for_nearby: value }); }} label="Nearby discovery" detail="Future restaurants, retail, services and things near you." />
                <Toggle checked={form.use_current_for_local_info} onChange={(value) => { setForm((prev) => ({ ...prev, use_current_for_local_info: value })); saveProfile({ use_current_for_local_info: value }); }} label="Local information" detail="Local context such as area news or location-relevant SYNC answers." />
              </div>
            </Card>

            <Card title="Business trust center" subtitle="Verification tells customers exactly what SyncWorks checked. Self-reported licenses or insurance remain separate until verified." icon={BadgeCheck}>
              <div className="space-y-3">
                {Array.isArray(myBusinesses) && myBusinesses.length ? myBusinesses.map((business) => <TrustCard key={business.id || business.business_id} business={{ ...business, id: business.id || business.business_id }} />) : <div className="rounded-2xl border border-white/10 bg-white/[.02] p-4"><div className="text-sm font-black text-white">No Business yet</div><p className="mt-1 text-xs leading-5 text-slate-500">Create a Business when you are ready. Your verified Personal contact information can prefill setup, but the Business keeps its own independent profile afterward.</p><button type="button" onClick={() => nav("/upgrade")} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/[.08] px-3 py-2 text-xs font-black text-violet-100">Create / add Business <ChevronRight className="h-4 w-4" /></button></div>}
              </div>
            </Card>

            <Card title="Module profiles" subtitle="Keep basic identity here. Each module asks only for specialized information when you activate it." icon={Users}>
              <div className="space-y-2">
                <button type="button" onClick={() => nav("/customer/health")} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[.02] p-3 text-left"><div><div className="text-xs font-black text-white">Health profile</div><div className="mt-1 text-[11px] text-slate-500">Fitness, goals, nutrition, devices and recovery data live in Health.</div></div><ChevronRight className="h-4 w-4 text-slate-600" /></button>
                <button type="button" onClick={() => nav("/customer/finance")} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[.02] p-3 text-left"><div><div className="text-xs font-black text-white">Money connections</div><div className="mt-1 text-[11px] text-slate-500">Banks, budgets and financial goals remain scoped to Money.</div></div><ChevronRight className="h-4 w-4 text-slate-600" /></button>
                <button type="button" onClick={() => nav("/settings?tab=CONNECTIONS")} className="flex w-full items-center justify-between rounded-2xl border border-cyan-400/15 bg-cyan-500/[.04] p-3 text-left"><div><div className="text-xs font-black text-cyan-100">All connections & upgrades</div><div className="mt-1 text-[11px] text-slate-500">Calendar, Social, paid modules and workspaces stay centralized in Settings.</div></div><ChevronRight className="h-4 w-4 text-cyan-300" /></button>
              </div>
            </Card>

            <Card title="Security" subtitle="Password and access-code tools remain available while the Identity center replaces duplicate profile fields." icon={Smartphone}>
              <button type="button" onClick={() => nav("/profile/legacy")} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[.025] p-4 text-left"><div><div className="text-sm font-black text-white">Security & legacy account tools</div><div className="mt-1 text-xs text-slate-500">Password, access-code and older account controls.</div></div><ChevronRight className="h-5 w-5 text-slate-500" /></button>
            </Card>
          </div>
        </div>
      </main>

      <LocationEditor
        open={!!locationEditor}
        initial={locationEditor?.mode === "edit" ? locationEditor.location : null}
        onClose={() => setLocationEditor(null)}
        onSaved={load}
      />
    </div>
  );
}
