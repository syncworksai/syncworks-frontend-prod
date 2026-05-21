import React, { useEffect, useState } from "react";
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
      setErr(e?.response?.data?.detail || e?.message || "Failed to load affiliate dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const affiliate = data?.affiliate || null;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="Affiliate Portal"
        subtitle="Refer businesses • Track lifetime commissions • Grow SyncWorks"
      />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {err ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-200 text-sm">{err}</div> : null}
        {loading ? <div className="text-slate-400">Loading...</div> : null}

        {!loading && !data?.has_affiliate_profile ? (
          <section className="rounded-3xl border border-cyan-500/25 bg-cyan-500/8 p-6">
            <div className="text-3xl font-black">Become a SyncWorks Affiliate</div>
            <p className="mt-3 text-slate-300 max-w-3xl">
              Apply to receive a referral code, QR card, and lifetime commission tracking.
              Affiliates earn 10% of SyncWorks revenue generated from referred businesses.
            </p>
            <button
              onClick={() => setSignupOpen(true)}
              className="mt-5 h-11 px-5 rounded-2xl border border-cyan-500/35 bg-cyan-500/18 hover:bg-cyan-500/24 text-cyan-100 font-semibold"
            >
              Start Affiliate Application
            </button>
          </section>
        ) : null}

        {affiliate ? (
          <>
            <section className="rounded-3xl border border-slate-800 bg-slate-950/35 p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Affiliate</div>
                  <div className="text-3xl font-black mt-1">{affiliate.name}</div>
                  <div className="text-sm text-slate-400 mt-2">{affiliate.email}</div>
                </div>
                <span className="self-start text-xs px-3 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 font-semibold">
                  {affiliate.status}
                </span>
              </div>
            </section>

            <AffiliateKpiCards metrics={data?.metrics || {}} />

            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1">
                <AffiliateQrCard affiliate={affiliate} />
              </div>

              <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-slate-950/35 p-5">
                <div className="font-bold">Referred Businesses</div>
                <div className="mt-3 space-y-2">
                  {businesses.length ? businesses.map((b) => (
                    <div key={b.id} className="rounded-2xl border border-slate-800 bg-slate-950/45 p-3">
                      <div className="font-semibold">{b.business_name || `Business #${b.business}`}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        Code {b.referral_code} • {b.attribution_source} • Effective {b.effective_from}
                      </div>
                    </div>
                  )) : <div className="text-sm text-slate-500">No referred businesses yet.</div>}
                </div>
              </div>
            </div>

            <section className="rounded-3xl border border-slate-800 bg-slate-950/35 p-5">
              <div className="font-bold">Commission History</div>
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
                      <tr key={c.id} className="border-t border-slate-800">
                        <td className="py-3">{c.business_name || `Business #${c.business}`}</td>
                        <td className="py-3">{c.revenue_source}</td>
                        <td className="py-3">{money(c.net_syncworks_revenue_amount)}</td>
                        <td className="py-3 text-cyan-200 font-semibold">{money(c.commission_amount)}</td>
                        <td className="py-3">{c.status}</td>
                      </tr>
                    ))}
                    {!commissions.length ? (
                      <tr><td colSpan="5" className="py-6 text-slate-500">No commissions recorded yet.</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </main>

      <AffiliateSignupModal open={signupOpen} onClose={() => setSignupOpen(false)} onSuccess={load} />
    </div>
  );
}