import React, { useEffect, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Home, LoaderCircle, MapPin, ShieldCheck, UserRound, X } from "lucide-react";
import { useLocation } from "react-router-dom";

import { useAuth } from "../../auth/AuthContext";
import {
  createIdentityLocation,
  getBrowserPosition,
  getIdentityProfile,
  patchIdentityProfile,
  resolveCurrentLocation,
} from "../../api/identity";

const SKIP_PATHS = ["/login", "/register", "/employee/invite", "/accept-invite"];

function Field({ label, value, onChange, placeholder = "", type = "text" }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</span>
      <input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40" />
    </label>
  );
}

export default function IdentityOnboardingGate() {
  const location = useLocation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [person, setPerson] = useState({ first_name: "", last_name: "", phone: "" });
  const [home, setHome] = useState({ kind: "HOME", label: "Home", address_line1: "", address_line2: "", city: "", state: "", postal_code: "", country: "US", is_default_service: true });
  const [currentStatus, setCurrentStatus] = useState("Not requested");

  useEffect(() => {
    let active = true;
    const path = String(location.pathname || "").toLowerCase();
    if (!user || SKIP_PATHS.some((item) => path.startsWith(item))) {
      setOpen(false);
      return undefined;
    }
    getIdentityProfile()
      .then((data) => {
        if (!active) return;
        setProfile(data);
        setPerson({
          first_name: data?.user?.first_name || "",
          last_name: data?.user?.last_name || "",
          phone: data?.identity?.phone || "",
        });
        if (data?.home_location) {
          setHome({
            kind: "HOME",
            label: data.home_location.label || "Home",
            address_line1: data.home_location.address_line1 || "",
            address_line2: data.home_location.address_line2 || "",
            city: data.home_location.city || "",
            state: data.home_location.state || "",
            postal_code: data.home_location.postal_code || "",
            country: data.home_location.country || "US",
            is_default_service: true,
          });
        }
        setOpen(!data?.identity?.onboarding_completed);
      })
      .catch(() => setOpen(false));
    return () => { active = false; };
  }, [user?.id, location.pathname]);

  if (!open) return null;

  async function savePerson() {
    if (!person.first_name.trim() || !person.last_name.trim()) {
      setError("First and last name are required to continue.");
      return false;
    }
    setSaving(true);
    setError("");
    try {
      const updated = await patchIdentityProfile(person);
      setProfile(updated);
      return true;
    } catch {
      setError("We could not save your basic profile yet.");
      return false;
    } finally { setSaving(false); }
  }

  async function saveHome() {
    if (!home.address_line1.trim()) {
      setError("Add your Home address, or use Skip for now.");
      return false;
    }
    setSaving(true);
    setError("");
    try {
      if (!profile?.home_location) await createIdentityLocation(home);
      return true;
    } catch {
      setError("We could not save Home yet.");
      return false;
    } finally { setSaving(false); }
  }

  async function next() {
    if (step === 0 && !(await savePerson())) return;
    if (step === 1 && !(await saveHome())) return;
    setError("");
    setStep((value) => Math.min(2, value + 1));
  }

  async function useCurrentLocation() {
    setSaving(true);
    setError("");
    try {
      const point = await getBrowserPosition();
      try {
        const resolved = await resolveCurrentLocation(point.latitude, point.longitude);
        setCurrentStatus(resolved?.label || "Current location available");
      } catch {
        setCurrentStatus("Current location permission granted");
      }
    } catch (err) {
      setCurrentStatus("Location not enabled");
      setError(err?.message || "Location permission was not granted.");
    } finally { setSaving(false); }
  }

  async function finish() {
    setSaving(true);
    setError("");
    try {
      await patchIdentityProfile({ onboarding_completed: true });
      setOpen(false);
    } catch {
      setError("Could not finish setup. You can try again or close and use Settings later.");
    } finally { setSaving(false); }
  }

  async function skipAll() {
    setSaving(true);
    try {
      await patchIdentityProfile({ onboarding_completed: true });
      setOpen(false);
    } catch {
      setOpen(false);
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />
      <div className="absolute inset-x-3 bottom-3 mx-auto max-h-[92dvh] max-w-xl overflow-y-auto rounded-[2rem] border border-cyan-400/20 bg-[#020617] p-5 shadow-[0_0_110px_rgba(0,0,0,.75)] sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Welcome to SyncWorks</div>
            <h2 className="mt-1 text-2xl font-black text-white">Finish the basics</h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">A few details now let SyncWorks reuse information instead of asking you again in every module.</p>
          </div>
          <button type="button" onClick={skipAll} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-slate-400" aria-label="Skip onboarding"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-4 flex gap-2">{[0, 1, 2].map((index) => <div key={index} className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-cyan-400" : "bg-slate-800"}`} />)}</div>

        {step === 0 ? (
          <div className="mt-5">
            <div className="flex items-center gap-2 text-sm font-black text-white"><UserRound className="h-5 w-5 text-cyan-200" /> About you</div>
            <p className="mt-2 text-xs leading-5 text-slate-500">Your verified email is already attached to the account. Add the basic contact information SyncWorks can safely reuse.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="First name" value={person.first_name} onChange={(value) => setPerson((prev) => ({ ...prev, first_name: value }))} /><Field label="Last name" value={person.last_name} onChange={(value) => setPerson((prev) => ({ ...prev, last_name: value }))} /><Field label="Mobile number" type="tel" value={person.phone} onChange={(value) => setPerson((prev) => ({ ...prev, phone: value }))} placeholder="For service updates and optional texts" /></div>
            <div className="mt-3 rounded-2xl border border-cyan-400/15 bg-cyan-500/[.04] p-3 text-[11px] leading-5 text-slate-500">Your phone number can support account communication, service updates and SMS notifications if you choose to enable them later.</div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="mt-5">
            <div className="flex items-center gap-2 text-sm font-black text-white"><Home className="h-5 w-5 text-cyan-200" /> Your Home</div>
            <p className="mt-2 text-xs leading-5 text-slate-500">Home becomes the default address for service calls and delivery-style features. Traveling never changes it automatically.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Street address" value={home.address_line1} onChange={(value) => setHome((prev) => ({ ...prev, address_line1: value }))} /><Field label="Unit / apt" value={home.address_line2} onChange={(value) => setHome((prev) => ({ ...prev, address_line2: value }))} /><Field label="City" value={home.city} onChange={(value) => setHome((prev) => ({ ...prev, city: value }))} /><Field label="State" value={home.state} onChange={(value) => setHome((prev) => ({ ...prev, state: value.toUpperCase() }))} /><Field label="ZIP" value={home.postal_code} onChange={(value) => setHome((prev) => ({ ...prev, postal_code: value }))} /></div>
            <div className="mt-3 rounded-2xl border border-emerald-400/15 bg-emerald-500/[.04] p-3 text-[11px] leading-5 text-slate-500"><ShieldCheck className="mr-2 inline h-4 w-4 text-emerald-200" />Your street address is operational information. It is not a public profile field.</div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-5">
            <div className="flex items-center gap-2 text-sm font-black text-white"><MapPin className="h-5 w-5 text-violet-200" /> Current location is separate</div>
            <p className="mt-2 text-xs leading-5 text-slate-500">If you are traveling, SYNC can use where you are now for weather, traffic, nearby restaurants/shops and travel planning while Home stays unchanged.</p>
            <button type="button" onClick={useCurrentLocation} disabled={saving} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/[.08] text-sm font-black text-violet-100 disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />} Enable current location</button>
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/[.02] p-3 text-xs text-slate-400">{currentStatus === "Not requested" ? "Optional — you can enable this later in Settings." : <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" />{currentStatus}</span>}</div>
          </div>
        ) : null}

        {error ? <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/[.06] px-3 py-2 text-xs text-rose-100">{error}</div> : null}

        <div className="mt-5 flex items-center gap-2">
          {step > 0 ? <button type="button" onClick={() => setStep((value) => value - 1)} className="inline-flex h-11 items-center gap-1 rounded-2xl border border-white/10 px-3 text-xs font-black text-slate-300"><ChevronLeft className="h-4 w-4" /> Back</button> : null}
          <button type="button" onClick={skipAll} className="h-11 rounded-2xl border border-white/10 px-3 text-xs font-black text-slate-500">Skip for now</button>
          {step < 2 ? <button type="button" onClick={next} disabled={saving} className="ml-auto inline-flex h-11 items-center gap-1 rounded-2xl bg-cyan-500 px-4 text-sm font-black text-slate-950 disabled:opacity-50">Continue <ChevronRight className="h-4 w-4" /></button> : <button type="button" onClick={finish} disabled={saving} className="ml-auto h-11 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-5 text-sm font-black text-white disabled:opacity-50">Finish setup</button>}
        </div>
      </div>
    </div>
  );
}
