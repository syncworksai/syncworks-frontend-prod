import React, { useEffect, useMemo, useState } from "react";
import ModeBar from "../components/ModeBar";
import AffiliateKpiCards from "../components/affiliates/AffiliateKpiCards";
import AffiliateQrCard from "../components/affiliates/AffiliateQrCard";
import AffiliateSignupModal from "../components/affiliates/AffiliateSignupModal";

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

function money(v) {
  return `$${Number(v || 0).toFixed(2)}`;
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

  const metrics = useMemo(() => {
    return data?.metrics || {};
  }, [data]);

  const affiliateStatus = String(
    affiliate?.status || ""
  ).toUpperCase();

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

      <main className="relative max-w-6xl mx-auto px-4 py-6 space-y-5">

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
          <section className="rounded-3xl border border-cyan-500/25 bg-cyan-500/8 p-7">
            <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-300/80">
              SyncWorks Affiliate Program
            </div>

            <div className="text-4xl font-black mt-2">
              Build recurring income with SyncWorks.
            </div>

            <p className="mt-4 text-slate-300 max-w-3xl leading-relaxed">
              Refer service businesses to SyncWorks and earn recurring
              commissions tied to the platform revenue generated from your
              referred businesses.
            </p>

            <div className="grid md:grid-cols-3 gap-4 mt-6">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
                <div className="text-cyan-200 font-semibold">
                  Lifetime Attribution
                </div>
                <div className="text-sm text-slate-400 mt-2">
                  Businesses stay tied to your affiliate code once approved.
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
                <div className="text-cyan-200 font-semibold">
                  Recurring Revenue
                </div>
                <div className="text-sm text-slate-400 mt-2">
                  Earn 10% of SyncWorks revenue generated from your referred businesses.
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
                <div className="text-cyan-200 font-semibold">
                  QR + Referral Tools
                </div>
                <div className="text-sm text-slate-400 mt-2">
                  Share your code, QR card, and referral links anywhere.
                </div>
              </div>
            </div>

            <button
              onClick={() => setSignupOpen(true)}
              className="mt-7 h-12 px-6 rounded-2xl border border-cyan-500/35 bg-cyan-500/18 hover:bg-cyan-500/24 text-cyan-100 font-semibold transition-all"
            >
              Start Affiliate Application
            </button>
          </section>
        ) : null}

        {affiliate && affiliateStatus === "PENDING" ? (
          <section className="rounded-3xl border border-amber-500/25 bg-amber-500/8 p-7">
            <div className="text-3xl font-black">
              Affiliate Application Pending
            </div>

            <p className="mt-3 text-slate-300 max-w-2xl">
              Your application has been submitted and is currently under review.
              Once approved, your affiliate code, QR tools, metrics, and payout
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
            <section className="rounded-3xl border border-slate-800 bg-slate-950/35 p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Affiliate Profile
                  </div>

                  <div className="text-3xl font-black mt-1">
                    {affiliate.name}
                  </div>

                  <div className="text-sm text-slate-400 mt-2">
                    {affiliate.email}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <div className="px-4 py-2 rounded-2xl border border-cyan-500/30 bg-cyan-500/10">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-300/80">
                        Affiliate Code
                      </div>

                      <div className="text-xl font-black mt-1 text-cyan-100">
                        {affiliate.code}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={`self-start text-xs px-3 py-1.5 rounded-full border font-semibold ${statusTone(affiliate.status)}`}
                >
                  {affiliate.status}
                </div>
              </div>
            </section>

            <AffiliateKpiCards metrics={metrics} />

            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1">
                <AffiliateQrCard affiliate={affiliate} />
              </div>

              <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-slate-950/35 p-5">
                <div className="font-bold text-lg">
                  Referred Businesses
                </div>

                <div className="mt-3 space-y-3">
                  {businesses.length ? (
                    businesses.map((b) => (
                      <div
                        key={b.id}
                        className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-semibold">
                              {b.business_name || `Business #${b.business}`}
                            </div>

                            <div className="text-xs text-slate-500 mt-1">
                              Code {b.referral_code}
                            </div>
                          </div>

                          <div className="text-right text-xs text-slate-500">
                            <div>{b.attribution_source}</div>
                            <div className="mt-1">
                              {b.effective_from}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-500">
                      No referred businesses yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <section className="rounded-3xl border border-slate-800 bg-slate-950/35 p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="font-bold text-lg">
                  Commission History
                </div>

                <div className="text-xs text-slate-500">
                  Recurring commissions tied to your attributed businesses.
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-xs text-slate-500">
                    <tr>
                      <th className="text-left py-2">Business</th>
                      <th className="text-left py-2">Source</th>
                      <th className="text-left py-2">SyncWorks Revenue</th>
                      <th className="text-left py-2">Commission</th>
                      <th className="text-left py-2">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {commissions.map((c) => (
                      <tr
                        key={c.id}
                        className="border-t border-slate-800"
                      >
                        <td className="py-3">
                          {c.business_name || `Business #${c.business}`}
                        </td>

                        <td className="py-3">
                          {c.revenue_source}
                        </td>

                        <td className="py-3">
                          {money(c.net_syncworks_revenue_amount)}
                        </td>

                        <td className="py-3 text-cyan-200 font-semibold">
                          {money(c.commission_amount)}
                        </td>

                        <td className="py-3">
                          {c.status}
                        </td>
                      </tr>
                    ))}

                    {!commissions.length ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="py-6 text-slate-500"
                        >
                          No commissions recorded yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
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