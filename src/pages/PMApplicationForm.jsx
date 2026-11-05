import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import api from "../api/client";

const field = "mt-1 min-h-11 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none";
const panel = "rounded-2xl border border-cyan-500/20 bg-[#07111f] p-4 sm:p-5";
const steps = ["Contact", "Household", "Employment", "Rental history", "Review"];
const blank = {
  phone: "", preferred_contact: "EMAIL", preferred_move_in: "", moving_reason: "",
  section8_requested: false, voucher_amount: "", voucher_bedrooms: 0,
  agency_name: "", agent_name: "", agent_email: "",
  adults: 1, children: 0, pets: 0, pets_notes: "",
  household_notes: "", other_occupants_description: "", vehicles_description: "",
  smoking_preference: "",
  current_employer: "", current_job_title: "", current_employment_years: "",
  current_employer_address: "", current_supervisor: "", annual_income: "",
  previous_employer: "", previous_job_title: "", previous_employment_years: "",
  current_residence_address: "", current_residence_monthly_rent: "",
  current_residence_years: "", current_lease_end: "",
  current_landlord_name: "", current_landlord_contact: "",
  previous_residence_address: "", previous_residence_years: "",
  previous_residence_monthly_rent: "", previous_landlord_name: "",
  previous_landlord_contact: "",
};

function Field({ label, value, onChange, type = "text", hint = "" }) {
  return <label className="block min-w-0 text-xs font-semibold text-slate-300">
    {label}
    <input className={field} type={type} value={value ?? ""} onChange={e => onChange(e.target.value)} />
    {hint ? <span className="mt-1 block text-[10px] font-normal text-slate-500">{hint}</span> : null}
  </label>;
}
function StepPanel({ title, description, children }) {
  return <section className={panel}>
    <h2 className="text-base font-black">{title}</h2>
    {description ? <p className="mt-1 text-[11px] leading-5 text-slate-400">{description}</p> : null}
    <div className="mt-4 grid gap-3 sm:grid-cols-2">{children}</div>
  </section>;
}

export default function PMApplicationForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const token = params.get("token") || "";
  const [loaded, setLoaded] = useState(null);
  const [form, setForm] = useState(blank);
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [certified, setCertified] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const applicantName = loaded?.name || [user?.first_name, user?.last_name].filter(Boolean).join(" ");
  const applicantEmail = loaded?.email || user?.email || "";

  useEffect(() => {
    let alive = true;
    if (!token) {
      setIsLoading(false);
      setError("Use the secure application link provided by your property manager.");
      return undefined;
    }
    setIsLoading(true);
    api.get("/pm-hub/onboarding/applications/my/", { params: { token } }).then(r => {
      if (!alive) return;
      const d = r.data;
      setLoaded(d);
      const existing = d.application || {};
      const accountAddress = typeof user?.address === "string" ? user.address : "";
      setForm({
        ...blank, ...existing,
        phone: existing.phone || d.phone || user?.phone || user?.phone_number || "",
        preferred_move_in: existing.preferred_move_in || "",
        current_residence_address: existing.current_residence_address || accountAddress,
        section8_requested: Boolean(d.section8_requested),
        voucher_amount: d.voucher_amount ?? "",
        voucher_bedrooms: d.voucher_bedrooms ?? 0,
        adults: d.adults ?? 1, children: d.children ?? 0, pets: d.pets ?? 0,
      });
      setIsSubmitted(d.application_status === "SUBMITTED");
      setError("");
    }).catch(e => {
      if (alive) setError(e?.response?.data?.detail ||
        "Application unavailable. Sign in with the invited email, or ask management for a new link.");
    }).finally(() => { if (alive) setIsLoading(false); });
    return () => { alive = false; };
  }, [token, user?.phone, user?.phone_number, user?.address]);

  async function saveDraft() {
    if (!loaded || isSaving || isSubmitted) return;
    setError(""); setNotice(""); setIsSaving(true);
    try {
      await api.patch("/pm-hub/onboarding/applications/my/", {
        ...form, token, property_id: loaded.property_id || "",
      });
      setNotice("Draft saved. You can return with the same application link to finish later.");
    } catch (e) {
      setError(e?.response?.data?.detail || "Could not save your application draft.");
    } finally { setIsSaving(false); }
  }

  async function submit(event) {
    event.preventDefault();
    if (!loaded || isSaving || isSubmitted) return;
    if (!certified) { setError("Confirm the accuracy statement before submitting."); return; }
    setError(""); setNotice(""); setIsSaving(true);
    try {
      await api.post("/pm-hub/onboarding/applications/my/", {
        ...form, token, property_id: loaded.property_id || "", certifies_truth: true,
      });
      setIsSubmitted(true);
    } catch (e) {
      setError(e?.response?.data?.detail || "Could not submit the application. Review the details and try again.");
    } finally { setIsSaving(false); }
  }

  function nextStep() {
    setError(""); setStep(s => Math.min(steps.length - 1, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const numeric = key => value => update(key, Math.max(0, Number(value) || 0));

  return <main className="min-h-screen bg-[#030915] px-3 py-5 pb-24 text-white sm:px-6">
    <div className="mx-auto max-w-3xl space-y-4">
      <header className={panel}>
        <p className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">SyncWorks · Rental Application</p>
        <h1 className="mt-2 text-xl font-black sm:text-2xl">Apply once. Reuse your details.</h1>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          Your free Personal account gives you one login for applications and, after your tenancy is linked, your resident portal.
        </p>
        <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs">
          <strong>{applicantName || "Applicant"}</strong><span className="text-slate-400">{applicantEmail}</span>
        </div>
        <p className="mt-1 text-[11px] text-cyan-200">Property: {loaded?.property_name || "Not selected yet"}</p>
        {loaded && !isSubmitted ? <div className="mt-4 grid grid-cols-5 gap-1" aria-label="Application steps">
          {steps.map((name, i) => <button key={name} type="button" onClick={() => { setStep(i); setError(""); }}
            aria-current={i === step ? "step" : undefined}
            className={"min-h-10 rounded-lg border px-1 py-1.5 text-[9px] font-semibold " +
              (i === step ? "border-cyan-300 bg-cyan-500/20 text-white" :
                i < step ? "border-emerald-400/30 text-emerald-200" : "border-slate-700 text-slate-400")}>
            {i + 1}. {name}
          </button>)}
        </div> : null}
      </header>

      {isLoading ? <p className="text-sm text-slate-300">Loading your application…</p> : null}
      {error ? <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-100">{error}</div> : null}
      {notice ? <div role="status" className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-3 text-xs text-emerald-200">{notice}</div> : null}
      {isSubmitted ? <section className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-5">
        <h2 className="text-lg font-black text-emerald-200">Application received</h2>
        <p className="mt-2 text-sm text-slate-200">
          Your application is with property management for review. No lease has been signed, screening authorized or payment made.
        </p>
        <button onClick={() => navigate("/customer")} type="button"
          className="mt-4 min-h-10 rounded-lg border border-cyan-400/40 px-3 text-xs font-bold text-cyan-100">
          Personal dashboard
        </button>
      </section> : null}

      {loaded && !isSubmitted ? <form onSubmit={submit} className="space-y-3">
        {step === 0 ? <StepPanel title="1 · Contact and move-in" description="We've carried over your inquiry and Personal account details wherever available.">
          <div className="sm:col-span-2 rounded-xl border border-slate-700 bg-black/20 p-3">
            <div className="text-sm font-bold">{applicantName}</div>
            <div className="mt-1 text-xs text-slate-400">{applicantEmail}</div>
            <p className="mt-2 text-[10px] text-slate-500">Contact your property manager if your name or invited email needs correcting.</p>
          </div>
          <Field label="Phone" type="tel" value={form.phone} onChange={v => update("phone", v)} />
          <label className="block text-xs font-semibold text-slate-300">Preferred contact
            <select className={field} value={form.preferred_contact || "EMAIL"} onChange={e => update("preferred_contact", e.target.value)}>
              <option value="EMAIL">Email</option><option value="PHONE">Phone</option><option value="TEXT">Text</option>
            </select>
          </label>
          <Field label="Preferred move-in date" type="date" value={form.preferred_move_in} onChange={v => update("preferred_move_in", v)} />
          <Field label="Reason for moving (optional)" value={form.moving_reason} onChange={v => update("moving_reason", v)} />
          <label className="sm:col-span-2 flex items-center gap-2 text-xs font-semibold">
            <input type="checkbox" checked={!!form.section8_requested} onChange={e => update("section8_requested", e.target.checked)} />
            Section 8 / housing voucher applicant
          </label>
          {form.section8_requested ? <div className="sm:col-span-2 grid gap-3 rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/5 p-3 sm:grid-cols-2">
            <Field label="Voucher payment standard" value={form.voucher_amount} onChange={v => update("voucher_amount", v)} />
            <Field label="Voucher bedrooms" type="number" value={form.voucher_bedrooms} onChange={numeric("voucher_bedrooms")} />
            <Field label="Housing authority" value={form.agency_name} onChange={v => update("agency_name", v)} />
            <Field label="Caseworker name" value={form.agent_name} onChange={v => update("agent_name", v)} />
            <Field label="Caseworker email" type="email" value={form.agent_email} onChange={v => update("agent_email", v)} />
            <p className="text-[11px] text-fuchsia-200">Voucher limits are not the final approved tenant/HAP rent split.</p>
          </div> : null}
        </StepPanel> : null}
        {step === 1 ? <StepPanel title="2 · Household and pets">
          <Field label="Adults" type="number" value={form.adults} onChange={numeric("adults")} />
          <Field label="Children" type="number" value={form.children} onChange={numeric("children")} />
          <Field label="Pets" type="number" value={form.pets} onChange={numeric("pets")} />
          <Field label="Additional occupants (optional)" value={form.other_occupants_description} onChange={v => update("other_occupants_description", v)} />
          <Field label="Pet details (optional)" value={form.pets_notes} onChange={v => update("pets_notes", v)} />
          <Field label="Vehicle details (optional)" value={form.vehicles_description} onChange={v => update("vehicles_description", v)} />
          <Field label="Other household notes (optional)" value={form.household_notes} onChange={v => update("household_notes", v)} />
          <label className="block text-xs font-semibold text-slate-300">Smoking preference
            <select className={field} value={form.smoking_preference} onChange={e => update("smoking_preference", e.target.value)}>
              <option value="">Not specified</option><option value="NO">No smoking</option>
              <option value="YES">Smoking</option><option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
            </select>
          </label>
        </StepPanel> : null}
        {step === 2 ? <div className="space-y-3">
          <StepPanel title="3 · Current employment">
            <Field label="Employer" value={form.current_employer} onChange={v => update("current_employer", v)} />
            <Field label="Job title" value={form.current_job_title} onChange={v => update("current_job_title", v)} />
            <Field label="Time employed" value={form.current_employment_years} onChange={v => update("current_employment_years", v)} />
            <Field label="Gross annual income (optional)" value={form.annual_income} onChange={v => update("annual_income", v)} />
            <Field label="Employer address" value={form.current_employer_address} onChange={v => update("current_employer_address", v)} />
            <Field label="Supervisor / reference (optional)" value={form.current_supervisor} onChange={v => update("current_supervisor", v)} />
          </StepPanel>
          <StepPanel title="Previous employment (optional)">
            <Field label="Previous employer" value={form.previous_employer} onChange={v => update("previous_employer", v)} />
            <Field label="Previous job" value={form.previous_job_title} onChange={v => update("previous_job_title", v)} />
            <Field label="Time employed" value={form.previous_employment_years} onChange={v => update("previous_employment_years", v)} />
          </StepPanel>
        </div> : null}
        {step === 3 ? <div className="space-y-3">
          <StepPanel title="4 · Current rental history">
            <Field label="Current address" value={form.current_residence_address} onChange={v => update("current_residence_address", v)} />
            <Field label="Monthly rent (optional)" value={form.current_residence_monthly_rent} onChange={v => update("current_residence_monthly_rent", v)} />
            <Field label="Time at address" value={form.current_residence_years} onChange={v => update("current_residence_years", v)} />
            <Field label="Lease end date" type="date" value={form.current_lease_end} onChange={v => update("current_lease_end", v)} />
            <Field label="Current landlord" value={form.current_landlord_name} onChange={v => update("current_landlord_name", v)} />
            <Field label="Landlord email or phone" value={form.current_landlord_contact} onChange={v => update("current_landlord_contact", v)} />
          </StepPanel>
          <StepPanel title="Previous address (optional)">
            <Field label="Previous address" value={form.previous_residence_address} onChange={v => update("previous_residence_address", v)} />
            <Field label="Monthly rent" value={form.previous_residence_monthly_rent} onChange={v => update("previous_residence_monthly_rent", v)} />
            <Field label="Time at address" value={form.previous_residence_years} onChange={v => update("previous_residence_years", v)} />
            <Field label="Previous landlord" value={form.previous_landlord_name} onChange={v => update("previous_landlord_name", v)} />
            <Field label="Landlord email or phone" value={form.previous_landlord_contact} onChange={v => update("previous_landlord_contact", v)} />
          </StepPanel>
        </div> : null}
        {step === 4 ? <section className={panel}>
          <h2 className="text-base font-black">5 · Review and submit</h2>
          <p className="mt-3 text-sm text-slate-200">{applicantName} · {applicantEmail}</p>
          <p className="mt-2 text-xs text-slate-300">Property: {loaded.property_name || "Not selected"} · Preferred move-in: {form.preferred_move_in || "Not specified"}</p>
          <p className="mt-2 text-xs text-slate-300">Household: {form.adults} adults, {form.children} children, {form.pets} pets · Voucher: {form.section8_requested ? "Yes" : "No"}</p>
          <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-500/5 p-3 text-xs leading-5 text-amber-100">
            This application is for management review only. It does not sign a lease, authorize tenant screening, or collect a fee.
            Do not enter Social Security numbers, government ID details, bank accounts or credit-card information in this form.
            Any required screening disclosures and authorization will be handled separately.
          </div>
          <label className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-200">
            <input className="mt-1" type="checkbox" checked={certified} onChange={e => setCertified(e.target.checked)} />
            I confirm that the information I provided is accurate to the best of my knowledge and authorize management to review this application.
          </label>
        </section> : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" disabled={step === 0 || isSaving}
            onClick={() => { setStep(s => Math.max(0, s - 1)); setError(""); }}
            className="min-h-11 rounded-xl border border-slate-700 px-4 text-xs font-bold disabled:opacity-40">Back</button>
          <button type="button" onClick={saveDraft} disabled={isSaving}
            className="min-h-11 rounded-xl border border-cyan-400/40 px-4 text-xs font-bold text-cyan-100 disabled:opacity-40">
            {isSaving ? "Saving…" : "Save draft"}
          </button>
          {step < steps.length - 1 ?
            <button type="button" onClick={nextStep}
              className="min-h-11 rounded-xl bg-cyan-400 px-6 text-xs font-black text-slate-950">Continue</button> :
            <button type="submit" disabled={isSaving || !certified}
              className="min-h-11 rounded-xl bg-cyan-400 px-6 text-xs font-black text-slate-950 disabled:opacity-40">
              {isSaving ? "Submitting…" : "Submit application"}</button>}
        </div>
      </form> : null}
      <p className="text-center text-[10px] text-slate-500">
        Your application details are stored with this PM portfolio. <Link to="/customer" className="underline">Personal dashboard</Link>
      </p>
    </div>
  </main>;
}
