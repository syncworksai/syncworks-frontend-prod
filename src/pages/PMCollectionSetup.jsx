import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, CheckCircle2, CreditCard, ExternalLink, FileText, Landmark, LockKeyhole, RefreshCw, ShieldAlert } from "lucide-react";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import PMShell from "../components/pm/PMShell";
import PaymentMigrationChecklist from "../components/payments/PaymentMigrationChecklist";

const OPTIONS = [
  { value: "STRIPE_CONNECT", label: "Connect my bank for SyncWorks payments", sub: "Stripe handles secure verification and direct deposits; no bank details are stored by SyncWorks.", icon: Landmark },
  { value: "EXTERNAL", label: "Keep my current payment processor", sub: "Continue using your processor while you organize records in SyncWorks. Automatic fee splitting and syncing are not enabled.", icon: CreditCard },
  { value: "MANUAL", label: "Cash, checks and manual payments", sub: "Record verified receipts through the PM ledger; no automatic processor fees or rent transfers.", icon: FileText },
];
const input = "mt-1 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none focus:border-cyan-300";
const errorText = (e) => e?.response?.data?.detail || Object.values(e?.response?.data || {}).flat().join(" · ") || e.message || "Request unsuccessful.";

export default function PMCollectionSetup() {
  const nav = useNavigate();
  const { activeBusinessId } = useAuth();
  const businessId = activeBusinessId ? String(activeBusinessId) : "";
  const headers = businessId ? { "X-Business-Id": businessId } : {};
  const [setup, setSetup] = useState(null);
  const [stripe, setStripe] = useState(null);
  const [method, setMethod] = useState("UNCONFIGURED");
  const [externalName, setExternalName] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [trustReviewed, setTrustReviewed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    if (!businessId) return;
    setLoading(true); setError("");
    try {
      const [status, connect] = await Promise.all([
        api.get("/pm-collection/setup/", { headers }),
        api.get("/connect/express/status/", { headers }).catch(e => ({ data: { error: errorText(e), connected: false } })),
      ]);
      const data = status.data || {};
      setSetup(data);
      setMethod(data.method || "UNCONFIGURED");
      setExternalName(data.external_provider_name || "");
      setExternalUrl(data.external_provider_url || "");
      setTrustReviewed(Boolean(data.trust_account_reviewed));
      setStripe(connect.data || null);
    } catch(e) { setError(errorText(e)); }
    finally { setLoading(false); }
  }, [businessId]);

  useEffect(() => { refresh(); }, [refresh]);

  async function save() {
    if (!businessId || saving) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const r = await api.patch("/pm-collection/setup/", {
        method,
        external_provider_name: method === "EXTERNAL" ? externalName.trim() : "",
        external_provider_url: method === "EXTERNAL" ? externalUrl.trim() : "",
        trust_account_reviewed: trustReviewed,
      }, { headers });
      setSetup(r.data);
      setTrustReviewed(Boolean(r.data.trust_account_reviewed));
      setNotice("Payment preferences saved. Rent collection is NOT yet enabled.");
    } catch(e) { setError(errorText(e)); }
    finally { setSaving(false); }
  }

  async function connectStripe() {
    if (!businessId || connecting) return;
    setConnecting(true); setError(""); setNotice("");
    try {
      if (method !== "STRIPE_CONNECT") {
        await api.patch("/pm-collection/setup/", { method: "STRIPE_CONNECT" }, { headers });
      }
      const r = await api.post("/connect/express/start/", {return_to:"/pm/payment-setup"}, { headers });
      const url = String(r.data?.url || "");
      if (!url.startsWith("https://connect.stripe.com/")) throw new Error("Unexpected payment onboarding address.");
      window.location.assign(url);
    } catch(e) { setError(errorText(e)); setConnecting(false); }
  }

  const connectedReady = Boolean(stripe?.charges_enabled && stripe?.payouts_enabled);
  return <PMShell>
    <div className="mx-auto max-w-4xl space-y-4 pb-24 text-slate-100">
      <div className="rounded-3xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/10 via-slate-950 to-indigo-500/10 p-5">
        <div className="text-xs font-black uppercase tracking-[.15em] text-cyan-200">Property Management / Payments</div>
        <h1 className="mt-2 text-2xl font-black">How should rent payments reach you?</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">Choose how your property-management company collects rent. Rent must ultimately settle to the legally authorized landlord or PM collection/trust account—not the tenant or SyncWorks operating account. We never ask you to enter banking credentials into this page.</p>
        <button type="button" onClick={()=>nav("/pm/payments")} className="mt-3 min-h-10 rounded-xl border border-slate-700 px-3 text-xs font-black text-cyan-200">Back to rent ledger</button>
      </div>
      {!businessId ? <div role="alert" className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
        Choose a linked Business profile before connecting payment processing. PM workspaces and business accounts aren't automatically interchangeable; we must confirm which legal entity owns the receiving account. <button type="button" className="underline" onClick={()=>nav("/sbo")}>Open Business</button>.
      </div> : null}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
        <ShieldAlert className="mr-2 inline h-4 w-4"/>
        Online tenant rent collection is currently <strong>disabled</strong>. This screen configures the receiving business, but doesn't authorize $1 fees, send payment links, guarantee trust-account compliance, or prove payouts. Those require separate processor, ledger, tax and legal verification.
      </div>
      {error ? <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p> : null}
      {notice ? <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</p> : null}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black">1. Choose your payment method</h2><button type="button" onClick={refresh} disabled={!businessId||loading} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-slate-700 px-3 text-xs font-bold"><RefreshCw size={15}/> Refresh</button></div>
        <div className="mt-3 grid gap-3">
          {OPTIONS.map(({value,label,sub,icon:Icon})=><label key={value} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${method===value?"border-cyan-400 bg-cyan-500/10":"border-slate-700 bg-slate-900/50"}`}>
            <input type="radio" className="mt-1 h-4 w-4 accent-cyan-400" name="payment-setup" checked={method===value} disabled={!businessId||loading} onChange={()=>setMethod(value)}/>
            <Icon size={19} className="mt-0.5 shrink-0 text-cyan-200"/>
            <span className="min-w-0"><span className="block text-sm font-black text-white">{label}</span><span className="mt-1 block text-xs leading-5 text-slate-400">{sub}</span></span>
          </label>)}
        </div>
        {method==="EXTERNAL" ? <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-300">Existing provider (required)<input className={input} value={externalName} maxLength={100} onChange={e=>setExternalName(e.target.value)} placeholder="Square / PayPal / merchant bank"/></label>
          <label className="text-xs font-bold text-slate-300">Official provider website (optional)<input className={input} value={externalUrl} maxLength={500} onChange={e=>setExternalUrl(e.target.value)} placeholder="https://your-processor.com"/></label>
          <p className="sm:col-span-2 text-xs text-slate-400">This is internal setup information only; we do not automatically collect, link tenant accounts, send money, or import transactions from this provider yet.</p>
        </div> : null}
        <button type="button" onClick={save} disabled={!businessId||saving||loading} className="mt-4 min-h-12 w-full rounded-xl bg-cyan-400 px-4 text-sm font-black text-slate-950 disabled:opacity-40">{saving?"Saving…":"Save payment preference"}</button>
      </div>
      {method==="STRIPE_CONNECT" ? <div className="rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-4 sm:p-5">
        <h2 className="text-lg font-black">2. Verify the bank receiving rent</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">Stripe handles identity verification and securely links the bank account. SyncWorks only receives account status; it does not store your routing or account number.</p>
        <p className="mt-2 text-xs leading-5 text-amber-200">This currently creates or continues a SyncWorks-linked Stripe Express account. If you already use a separate Stripe or Square merchant account, keep your existing provider selected until a supported account-linking migration is available.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          {connectedReady ? <CheckCircle2 size={19} className="text-emerald-300"/> : <LockKeyhole size={19} className="text-amber-200"/>}
          <span>{connectedReady?"Stripe reports charges and payouts enabled":"Stripe account is not yet fully verified for charges and payouts"}</span>
        </div>
        {stripe?.error ? <p className="mt-2 text-xs text-amber-200">Status check: {stripe.error}</p> : null}
        <button type="button" disabled={!businessId||connecting} onClick={connectStripe} className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-400 px-4 text-sm font-black text-slate-950 disabled:opacity-40"><Building2 size={17}/>{connecting?"Opening Stripe…":connectedReady?"Review connected Stripe account":"Connect bank securely with Stripe"}<ExternalLink size={14}/></button>
        <label className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-300">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-cyan-400" checked={trustReviewed} onChange={e=>setTrustReviewed(e.target.checked)}/>
          I have reviewed the required rent-collection or trust account arrangements for this legal entity. This acknowledgement does not replace broker, legal or processor verification.
        </label>
        <p className="mt-2 text-xs text-slate-400">Save again to record the acknowledgement. Bank-connection completion alone does not unlock tenant checkout.</p>
      </div> : null}
      <PaymentMigrationChecklist businessId={businessId} isPM />
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5">
        <h2 className="text-lg font-black">What happens next?</h2>
        <div className="mt-3 space-y-2 text-sm text-slate-300">
          {[
            "Verify the legal PM/landlord entity, bank ownership and any required trust account.",
            "Choose ACH/card economics so neither SyncWorks nor the PM unexpectedly subsidizes processing.",
            "Reconcile tenant rent, separately earned $1 fees, failed/returned payments and connected-account transfers.",
            "Only then activate tenant payment links, automatic reminders, receipts and payouts."
          ].map((item,i)=><div key={item} className="flex gap-3 rounded-xl bg-slate-900/60 p-3"><span className="font-black text-cyan-200">{i+1}.</span>{item}</div>)}
        </div>
        <p className="mt-3 text-xs text-slate-500">Proposed rent collection fee: $1 per eligible successful online payment, subject to compliance and fee-payer verification. No $1 charge is being collected by this setup screen.</p>
      </div>
    </div>
  </PMShell>;
}
