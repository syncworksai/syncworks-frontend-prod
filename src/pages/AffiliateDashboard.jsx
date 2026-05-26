import React, { useEffect, useMemo, useState } from "react";
import ModeBar from "../components/ModeBar";

import AffiliateKpiCards from "../components/affiliates/AffiliateKpiCards";
import AffiliateQrCard from "../components/affiliates/AffiliateQrCard";
import AffiliateSignupModal from "../components/affiliates/AffiliateSignupModal";

import AffiliateFinancialSummary from "../components/affiliates/dashboard/AffiliateFinancialSummary";
import AffiliateReferredBusinesses from "../components/affiliates/dashboard/AffiliateReferredBusinesses";
import AffiliatePayoutHistory from "../components/affiliates/dashboard/AffiliatePayoutHistory";
import AffiliateShareTools from "../components/affiliates/dashboard/AffiliateShareTools";
import AffiliateTaxDocuments from "../components/affiliates/dashboard/AffiliateTaxDocuments";
import AffiliatePayoutMethodCard from "../components/affiliates/dashboard/AffiliatePayoutMethodCard";

import {
  getMyAffiliateBusinesses,
  getMyAffiliateCommissions,
  getMyAffiliateDashboard,
} from "../api/platformAffiliates";

function safeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function statusTone(status) {
  switch ((status || "").toUpperCase()) {
    case "ACTIVE":
      return "border-cyan-500/30 bg-cyan-500/10 text-cyan-200";
    case "PENDING":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    case "SUSPENDED":
      return "border-rose-500/30 bg-rose-500/10 text-rose-200";
    default:
      return "border-slate-700 bg-slate-800/40 text-slate-300";
  }
}

export default function AffiliateDashboard() {
  const [data, setData] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [signupOpen, setSignupOpen] = useState(false);

  async function load() {
    setErr("");
    setLoading(true);

    try {
      const me = await getMyAffiliateDashboard();
      setData(me);

      if (me?.has_affiliate_profile) {
        const [biz, ledger] = await Promise.all([
          getMyAffiliateBusinesses(),
          getMyAffiliateCommissions(),
        ]);

        setBusinesses(safeList(biz));
        setCommissions(safeList(ledger));
      }
    } catch (e) {
      setErr(
        e?.response?.data?.detail ||
          e?.message ||
          "Failed to load affiliate dashboard"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const affiliate = data?.affiliate || null;
  const metrics = useMemo(() => data?.metrics || {}, [data]);
  const affiliateStatus = String(affiliate?.status || "").toUpperCase();

  const payoutMetrics = {
    expected_monthly_payout:
      metrics.expected_monthly_payout || metrics.pending_commission || 0,
    pending_commission: metrics.pending_commission || 0,
    lifetime_paid: metrics.lifetime_paid || 0,
    active_businesses:
      metrics.active_businesses || metrics.businesses_referred || businesses.length,
  };

  const payoutRows = commissions.map((c) => ({
    id: c.id,
    period: c.period_label || c.created_at || "Current Period",
    platform_revenue: c.net_syncworks_revenue_amount || 0,
    commission_amount: c.commission_amount || 0,
    status: c.status || "PENDING",
    paid_at: c.paid_at || null,
  }));

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full blur-3xl opacity-30 bg-cyan-500/30" />
        <div className="absolute top-0 right-0 w-[560px] h-[560px] rounded-full blur-3xl opacity-20 bg-fuchsia-500/20" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[320px] rounded-full blur-3xl opacity-20 bg-indigo-500/20" />
      </div>

      <ModeBar
        title="Affiliate Portal"
        subtitle="Refer businesses • Track recurring commissions • Grow SyncWorks"
      />

      <main className="relative max-w-7xl mx-auto px-4 py-6 space-y-5">
        {err ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {err}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6 text-slate-400">
            Loading affiliate dashboard...
          </div>
        ) : null}

        {!loading && !affiliate ? (
          <section className="rounded-3xl border border-cyan-500/25 bg-cyan-500/8 p-7 overflow-hidden relative">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
            </div>

            <div className="relative">
              <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-300/80">
                SyncWorks Affiliate Program
              </div>

              <div className="text-4xl md:text-5xl font-black mt-3 max-w-4xl leading-tight">
                Build recurring income by helping businesses grow with SyncWorks.
              </div>

              <p className="mt-5 text-slate-300 max-w-3xl leading-relaxed text-lg">
                Refer service businesses to SyncWorks and earn recurring commissions
                tied to platform revenue generated from your referred businesses.
              </p>

              <div className="grid md:grid-cols-3 gap-4 mt-8">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-5">
                  <div className="text-cyan-200 font-semibold">
                    Lifetime Attribution
                  </div>
                  <div className="text-sm text-slate-400 mt-2">
                    Businesses remain tied to your affiliate account after approval.
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-5">
                  <div className="text-cyan-200 font-semibold">
                    Recurring Revenue
                  </div>
                  <div className="text-sm text-slate-400 mt-2">
                    Earn 10% of SyncWorks revenue generated from your referred businesses.
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-5">
                  <div className="text-cyan-200 font-semibold">
                    QR + Referral Tools
                  </div>
                  <div className="text-sm text-slate-400 mt-2">
                    Share your affiliate link, QR card, and referral code anywhere.
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSignupOpen(true)}
                className="mt-8 h-12 px-6 rounded-2xl border border-cyan-500/35 bg-cyan-500/18 hover:bg-cyan-500/24 text-cyan-100 font-semibold transition-all"
              >
                Start Affiliate Application
              </button>
            </div>
          </section>
        ) : null}

        {affiliate && affiliateStatus === "PENDING" ? (
          <section className="rounded-3xl border border-amber-500/25 bg-amber-500/8 p-7">
            <div className="text-3xl font-black">
              Affiliate Application Pending
            </div>
            <p className="mt-3 text-slate-300 max-w-2xl">
              Your application has been submitted and is currently under review.
              Once approved, your affiliate tools, payout tracking, and referral
              dashboard will unlock automatically.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-200 text-sm font-semibold">
              Pending Review
            </div>
          </section>
        ) : null}

        {affiliate && affiliateStatus === "SUSPENDED" ? (
          <section className="rounded-3xl border border-rose-500/25 bg-rose-500/8 p-7">
            <div className="text-3xl font-black">
              Affiliate Account Restricted
            </div>
            <p className="mt-3 text-slate-300 max-w-2xl">
              Your affiliate account is currently suspended or restricted.
              Please contact SyncWorks support for assistance.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-200 text-sm font-semibold">
              Account Restricted
            </div>
          </section>
        ) : null}

        {affiliate && affiliateStatus === "ACTIVE" ? (
          <>
            <section className="rounded-3xl border border-slate-800 bg-slate-950/35 p-6 overflow-hidden relative">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-24 right-0 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
              </div>

              <div className="relative flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Affiliate Profile
                  </div>

                  <div className="text-3xl md:text-4xl font-black mt-2 break-words">
                    {affiliate.name}
                  </div>

                  <div className="text-sm text-slate-400 mt-2 break-all">
                    {affiliate.email}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <div className="px-4 py-3 rounded-2xl border border-cyan-500/30 bg-cyan-500/10">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-300/80">
                        Affiliate Code
                      </div>

                      <div className="text-2xl font-black mt-1 text-cyan-100">
                        {affiliate.code}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={`self-start text-xs px-3 py-1.5 rounded-full border font-semibold ${statusTone(
                    affiliate.status
                  )}`}
                >
                  {affiliate.status}
                </div>
              </div>
            </section>

            <AffiliateKpiCards metrics={metrics} />
            <AffiliateFinancialSummary metrics={payoutMetrics} />

            <div className="grid xl:grid-cols-3 gap-4">
              <div className="xl:col-span-1 space-y-4">
                <AffiliateQrCard affiliate={affiliate} />
                <AffiliateShareTools affiliate={affiliate} />
                <AffiliatePayoutMethodCard affiliate={affiliate} />
              </div>

              <div className="xl:col-span-2">
                <AffiliateReferredBusinesses
                  businesses={businesses.map((b) => ({
                    id: b.id,
                    name: b.business_name || `Business #${b.business}`,
                    city: b.city,
                    state: b.state,
                    active: String(b.status || "").toUpperCase() !== "INACTIVE",
                    monthly_platform_revenue:
                      b.monthly_platform_revenue ||
                      b.total_platform_revenue ||
                      0,
                  }))}
                />
              </div>
            </div>

            <AffiliatePayoutHistory payouts={payoutRows} />

            <AffiliateTaxDocuments
              documents={[
                {
                  id: 1,
                  label: "2026 1099",
                  description: "Year-end affiliate tax reporting document.",
                  url: "",
                },
              ]}
            />
          </>
        ) : null}
      </main>

      <AffiliateSignupModal
        open={signupOpen}
        onClose={() => setSignupOpen(false)}
        onSuccess={load}
      />
    </div>
  );
}