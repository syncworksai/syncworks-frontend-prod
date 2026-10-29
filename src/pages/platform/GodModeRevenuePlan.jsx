import React, { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Calculator, Target, TrendingUp, Wallet } from "lucide-react";
import { calculateFounderRevenueScenario } from "../../utils/founderRevenueScenario";

const defaults = {
  businesses: 134, ownBusinessVolume: 1500, marketplaceJobsPerBusiness: 5,
  averageMarketplaceJob: 300, platformFeePct: 1, marketplaceSuccessPct: 6,
  monthlyDirectCostsPerBusiness: 20, monthlyUnfundedProcessingPerBusiness: 0,
  subscriptionPerBusiness: 0, companyFixedCosts: 40, taxReservePct: 25,
  targetTakeHome: 10000,
};

const money = (value) => Number(value).toLocaleString("en-US", {
  style: "currency", currency: "USD", maximumFractionDigits: 2,
});
const count = (value) => Number(value).toLocaleString("en-US");

function Field({ label, value, onChange, min = 0, max = 1000000, step = 1, note }) {
  return (
    <label className="block min-w-0 space-y-1.5">
      <span className="block text-xs font-bold text-slate-300">{label}</span>
      <input type="number" min={min} max={max} step={step} inputMode="decimal"
        value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base text-white focus:border-cyan-400"/>
      {note ? <span className="block text-[11px] leading-4 text-slate-500">{note}</span> : null}
    </label>
  );
}

function Metric({ label, value, note, tone = "default" }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/65 p-3.5">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={"mt-1 break-words text-xl font-black " + (tone === "cyan" ? "text-cyan-200" : tone === "emerald" ? "text-emerald-200" : "text-white")}>{value}</div>
      <div className="mt-1 text-[11px] leading-4 text-slate-500">{note}</div>
    </div>
  );
}

export default function GodModeRevenuePlan() {
  const [settings, setSettings] = useState(defaults);
  const set = (key, value) => setSettings((old) => ({ ...old, [key]: value }));
  const model = useMemo(() => {
    try { return { result: calculateFounderRevenueScenario(settings), error: "" }; }
    catch (error) { return { result: null, error: error.message }; }
  }, [settings]);
  const m = model.result;

  return (
    <main className="space-y-4 pb-20 text-slate-100">
      <section className="rounded-3xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/10 via-slate-950 to-indigo-500/10 p-4 sm:p-6">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">
          <Calculator size={16}/> GOD MODE / COMPANY ECONOMICS
        </div>
        <h1 className="mt-2 text-2xl font-black sm:text-3xl">Revenue to owner take-home</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
          Model how many <strong>active, transacting</strong> businesses you need to reach $10,000 monthly take-home.
          These numbers are scenarios only—not connected Stripe receipts, booked platform revenue, or accounting profit.
        </p>
        <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs leading-5 text-amber-100">
          <AlertTriangle className="mr-1 inline h-4 w-4 align-middle"/>
          Actual profitability: <strong>not yet verified</strong>. Live settled platform fees, provider transfers, acquisition cost,
          chargebacks, taxes and all operating expenses must be reconciled before the company can report real profit.
          The 1% customer fee and 6% marketplace success fee are <strong>proposed</strong>, not confirmed live collections.
        </div>
      </section>

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Modeled company revenue / mo" value={m ? money(m.totalCompanyRevenue) : "—"} note="Gross fees and subscription scenario; not actual sales" />
        <Metric label="Modeled contribution / business" value={m ? money(m.contributionPerBusiness) : "—"} note="After specified direct + processing costs" tone="cyan"/>
        <Metric label="Modeled monthly owner take-home" value={m ? money(m.ownerTakeHome) : "—"} note="After fixed overhead and tax reserve" tone="emerald"/>
        <Metric label="Business target for take-home" value={m?.targetBusinesses == null ? "Not achievable" : count(m.targetBusinesses)} note="Only profitable active businesses count" tone="cyan"/>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-800 bg-slate-950/75 p-4 sm:p-5">
          <div className="flex items-center gap-2"><Target className="h-5 w-5 text-fuchsia-300"/><h2 className="text-lg font-black">Scale assumptions</h2></div>
          <p className="mt-1 text-xs text-slate-400">Start with a simple pilot scenario, then replace guesses with real costs and transaction data.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label="Active paying-job businesses" value={settings.businesses} onChange={v=>set("businesses",v)} max={100000}/>
            <Field label="Existing-customer job volume / business ($)" value={settings.ownBusinessVolume} onChange={v=>set("ownBusinessVolume",v)} step={100}/>
            <Field label="New marketplace jobs / business" value={settings.marketplaceJobsPerBusiness} onChange={v=>set("marketplaceJobsPerBusiness",v)} max={10000}/>
            <Field label="Avg new-job subtotal ($)" value={settings.averageMarketplaceJob} onChange={v=>set("averageMarketplaceJob",v)} step={25}/>
            <Field label="Optional subscription / business ($)" value={settings.subscriptionPerBusiness} onChange={v=>set("subscriptionPerBusiness",v)} step={5} note="Use $0 for free promotional access"/>
            <Field label="Variable support/acquisition costs / business ($)" value={settings.monthlyDirectCostsPerBusiness} onChange={v=>set("monthlyDirectCostsPerBusiness",v)} step={5}/>
            <Field label="Unfunded payment costs / business ($)" value={settings.monthlyUnfundedProcessingPerBusiness} onChange={v=>set("monthlyUnfundedProcessingPerBusiness",v)} step={5} note="$0 only if genuinely funded outside SyncWorks"/>
            <Field label="Total company monthly overhead ($)" value={settings.companyFixedCosts} onChange={v=>set("companyFixedCosts",v)} step={10}/>
            <Field label="Owner's income tax reserve (%)" value={settings.taxReservePct} onChange={v=>set("taxReservePct",v)} min={0} max={80} step={1} note="Planning assumption, not tax advice"/>
            <Field label="Monthly owner take-home target ($)" value={settings.targetTakeHome} onChange={v=>set("targetTakeHome",v)} step={500}/>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-400">Fee assumptions: 1% of all eligible paid job volume, plus 6% on newly acquired marketplace jobs.</span>
            <button type="button" onClick={()=>setSettings(defaults)}
              className="min-h-10 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs font-black text-cyan-200">Reset scenario</button>
          </div>
          {model.error ? <p role="alert" className="mt-3 text-sm text-rose-300">{model.error}</p> : null}
        </section>

        <section className="space-y-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/75 p-4 sm:p-5">
            <h2 className="flex items-center gap-2 text-lg font-black"><Wallet size={20} className="text-emerald-300"/> Money per active business</h2>
            {m ? <div className="mt-4 space-y-2 text-sm">
              {[
                ["Existing-job monthly volume", money(settings.ownBusinessVolume)],
                ["Marketplace job volume", money(m.marketplaceVolumePerBusiness)],
                ["1% platform fee revenue", money(m.platformRevenuePerBusiness)],
                ["6% marketplace success fee revenue", money(m.successRevenuePerBusiness)],
                ["Subscription scenario", money(settings.subscriptionPerBusiness)],
                ["Gross SyncWorks revenue", money(m.grossRevenuePerBusiness)],
                ["All entered direct costs", "−" + money(settings.monthlyDirectCostsPerBusiness + settings.monthlyUnfundedProcessingPerBusiness)],
              ].map(([label,value],i)=><div key={label} className={"flex flex-wrap justify-between gap-2 " + (i===5?"border-t border-slate-800 pt-3 font-black text-white":"text-slate-300")}><span>{label}</span><span className="font-bold tabular-nums">{value}</span></div>)}
              <div className="flex justify-between gap-2 border-t border-slate-700 pt-3 font-black text-emerald-200"><span>Business contribution</span><span>{money(m.contributionPerBusiness)}</span></div>
            </div> : null}
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/75 p-4 sm:p-5">
            <h2 className="flex items-center gap-2 text-lg font-black"><TrendingUp size={20} className="text-cyan-300"/> Company-wide operating plan</h2>
            {m ? <div className="mt-4 space-y-2 text-sm">
              {[
                ["Paid service volume / month", money(m.totalPaidJobVolume)],
                ["New marketplace jobs / month", count(m.totalMarketplaceJobs)],
                ["Gross SyncWorks revenue / month", money(m.totalCompanyRevenue)],
                ["Variable costs / month", "−"+money(m.totalMonthlyVariableCosts)],
                ["Fixed overhead / month", "−"+money(m.fixedCosts)],
                ["Modeled pre-tax profit", money(m.preTaxOperatingProfit)],
                ["Tax reserve", "−"+money(m.taxReserve)],
              ].map(([label,value])=><div key={label} className="flex flex-wrap justify-between gap-2 text-slate-300"><span>{label}</span><span className="font-bold text-white tabular-nums">{value}</span></div>)}
              <div className="flex justify-between gap-2 border-t border-slate-700 pt-3 font-black text-emerald-200"><span>Owner take-home scenario</span><span>{money(m.ownerTakeHome)}</span></div>
              {m.ownerTakeHome < m.targetTakeHome ? <p className="mt-2 text-xs text-amber-200">Short by {money(m.shortfall)} under these assumptions.</p> : <p className="mt-2 text-xs text-emerald-200">Target achieved in this scenario only.</p>}
            </div> : null}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-950/75 p-4 sm:p-5">
        <h2 className="text-lg font-black">Go from modeled revenue to verified revenue</h2>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          Until these evidence gates are complete, do not describe forecasted platform fees as profit or announce free processing.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["1. Sell the pilot", "Find 3 businesses willing to complete real jobs and discuss paid conversion.", "/platform?tab=prospects"],
            ["2. Complete setup", "Track owner verification, customer import, real job, invoice, and payout checks.", "/platform?tab=testers"],
            ["3. Reconcile money", "Verify live Stripe fee settlements, transfers, refunds, support, ads and all costs.", "/platform?tab=billing"],
            ["4. Prove retention", "Measure 30-day active businesses, paid jobs, upsells and marketplace conversions.", "/platform?tab=businesses"],
          ].map(([title,description,href])=><a key={title} href={href}
            className="rounded-xl border border-slate-700 bg-slate-900/70 p-3 hover:border-cyan-400/60">
            <span className="text-sm font-black text-white">{title}</span>
            <span className="mt-1 block text-xs leading-5 text-slate-400">{description}</span>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-black text-cyan-200">Open <ArrowRight size={14}/></span>
          </a>)}
        </div>
      </section>
    </main>
  );
}
