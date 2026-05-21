import React, { useState } from "react";
import { submitAffiliateApplication } from "../../api/platformAffiliates";

const AGREEMENT = `SYNCWORKS AFFILIATE AGREEMENT

By applying, you agree that affiliate commissions are calculated only from actual net SyncWorks revenue collected from businesses attributed to your referral code.

Affiliates may receive 10% of eligible SyncWorks revenue, including platform fees, subscriptions, Growth OS fees, and approved future SyncWorks revenue streams.

Commissions are not calculated from gross business revenue. Payouts may be reviewed, adjusted, delayed, voided, or clawed back for refunds, fraud, chargebacks, billing errors, duplicate attribution, or policy violations.

One business may only have one affiliate attribution. SyncWorks may manually assign a business to an affiliate in God Mode when appropriate and audit all manual assignment activity.

You agree not to misrepresent SyncWorks, spam potential users, impersonate SyncWorks staff, or make unauthorized claims.

You agree to keep confidential any non-public SyncWorks information, business information, payout data, internal metrics, or platform operations shared with you.`;

export default function AffiliateSignupModal({ open, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    zip_code: "",
    payout_provider: "MANUAL",
    payout_email: "",
    payout_notes: "",
    referral_strategy: "",
    application_notes: "",
    accepted_agreement: false,
  });

  if (!open) return null;

  function update(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function submit() {
    setErr("");
    if (!form.accepted_agreement) {
      setErr("You must accept the affiliate agreement.");
      return;
    }

    setSaving(true);
    try {
      await submitAffiliateApplication(form);
      onSuccess?.();
      onClose?.();
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.response?.data?.non_field_errors?.[0] || e?.message || "Application failed");
    } finally {
      setSaving(false);
    }
  }

  const input =
    "w-full h-11 rounded-2xl border border-slate-800 bg-slate-950/60 px-3 text-sm text-slate-100 outline-none focus:border-cyan-500/50";

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-[#020617] text-slate-100 shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-3">
          <div>
            <div className="text-xl font-extrabold">SyncWorks Affiliate Application</div>
            <div className="text-sm text-slate-400 mt-1">
              Step {step} of 4 — simple, serious, and built for lifetime commissions.
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-2xl border border-slate-800 hover:bg-slate-900">
            ✕
          </button>
        </div>

        <div className="p-5 max-h-[72vh] overflow-y-auto">
          {err ? <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{err}</div> : null}

          {step === 1 ? (
            <div className="space-y-4">
              <div className="rounded-3xl border border-cyan-500/25 bg-cyan-500/8 p-5">
                <div className="text-2xl font-black">Earn for businesses you bring into SyncWorks.</div>
                <div className="mt-3 text-sm text-slate-300">
                  You earn 10% of SyncWorks revenue from businesses tied to your code. If a business generates $5,000 and SyncWorks collects $50, you earn $5 and SyncWorks keeps $45.
                </div>
              </div>

              <button onClick={() => setStep(2)} className="w-full h-11 rounded-2xl bg-cyan-500/18 border border-cyan-500/35 text-cyan-100 font-semibold">
                Start Application
              </button>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid md:grid-cols-2 gap-3">
              <input className={input} placeholder="Full name" value={form.name} onChange={(e) => update("name", e.target.value)} />
              <input className={input} placeholder="Email" value={form.email} onChange={(e) => update("email", e.target.value)} />
              <input className={input} placeholder="Phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
              <input className={input} placeholder="Payout email" value={form.payout_email} onChange={(e) => update("payout_email", e.target.value)} />
              <input className={`${input} md:col-span-2`} placeholder="Address line 1" value={form.address_line_1} onChange={(e) => update("address_line_1", e.target.value)} />
              <input className={`${input} md:col-span-2`} placeholder="Address line 2" value={form.address_line_2} onChange={(e) => update("address_line_2", e.target.value)} />
              <input className={input} placeholder="City" value={form.city} onChange={(e) => update("city", e.target.value)} />
              <input className={input} placeholder="State" maxLength={2} value={form.state} onChange={(e) => update("state", e.target.value.toUpperCase())} />
              <input className={input} placeholder="Zip" value={form.zip_code} onChange={(e) => update("zip_code", e.target.value)} />
              <select className={input} value={form.payout_provider} onChange={(e) => update("payout_provider", e.target.value)}>
                <option value="MANUAL">Manual</option>
                <option value="STRIPE">Stripe</option>
                <option value="ACH">ACH</option>
                <option value="OTHER">Other</option>
              </select>

              <div className="md:col-span-2 flex gap-2">
                <button onClick={() => setStep(1)} className="h-11 px-4 rounded-2xl border border-slate-800 text-slate-200">Back</button>
                <button onClick={() => setStep(3)} className="flex-1 h-11 rounded-2xl border border-cyan-500/35 bg-cyan-500/18 text-cyan-100 font-semibold">Continue</button>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <textarea className={`${input} h-28 py-3`} placeholder="How will you refer businesses?" value={form.referral_strategy} onChange={(e) => update("referral_strategy", e.target.value)} />
              <textarea className={`${input} h-24 py-3`} placeholder="Payout notes / preferred payment details" value={form.payout_notes} onChange={(e) => update("payout_notes", e.target.value)} />
              <div className="flex gap-2">
                <button onClick={() => setStep(2)} className="h-11 px-4 rounded-2xl border border-slate-800 text-slate-200">Back</button>
                <button onClick={() => setStep(4)} className="flex-1 h-11 rounded-2xl border border-cyan-500/35 bg-cyan-500/18 text-cyan-100 font-semibold">Continue to Agreement</button>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <div className="h-64 overflow-y-auto whitespace-pre-wrap rounded-3xl border border-slate-800 bg-slate-950/55 p-4 text-sm text-slate-300">
                {AGREEMENT}
              </div>

              <label className="flex items-start gap-3 rounded-3xl border border-slate-800 bg-slate-950/45 p-4">
                <input type="checkbox" checked={form.accepted_agreement} onChange={(e) => update("accepted_agreement", e.target.checked)} className="mt-1" />
                <span className="text-sm text-slate-300">
                  I have read and accept the SyncWorks Affiliate Agreement.
                </span>
              </label>

              <div className="flex gap-2">
                <button onClick={() => setStep(3)} className="h-11 px-4 rounded-2xl border border-slate-800 text-slate-200">Back</button>
                <button disabled={saving} onClick={submit} className="flex-1 h-11 rounded-2xl border border-emerald-500/35 bg-emerald-500/18 text-emerald-100 font-semibold disabled:opacity-50">
                  {saving ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}