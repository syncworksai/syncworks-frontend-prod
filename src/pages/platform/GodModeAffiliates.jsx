import React, { useEffect, useState } from "react";
import AffiliateKpiCards from "../../components/affiliates/AffiliateKpiCards";
import {
  assignBusinessToAffiliate,
  createGodModeAffiliate,
  getGodModeAffiliateOverview,
  getGodModeAffiliates,
  updateGodModeAffiliate,
} from "../../api/platformAffiliates";

function safeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

export default function GodModeAffiliates() {
  const [overview, setOverview] = useState({});
  const [affiliates, setAffiliates] = useState([]);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", status: "ACTIVE" });
  const [assign, setAssign] = useState({ business_id: "", affiliate_id: "", reason: "", retroactive: false });

  async function load() {
    setErr("");
    try {
      const [o, a] = await Promise.all([
        getGodModeAffiliateOverview(),
        getGodModeAffiliates(),
      ]);
      setOverview(o || {});
      setAffiliates(safeList(a));
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Failed to load affiliates");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createAffiliate(e) {
    e.preventDefault();
    setErr("");
    try {
      await createGodModeAffiliate(form);
      setForm({ name: "", email: "", phone: "", status: "ACTIVE" });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Create failed");
    }
  }

  async function setStatus(id, status) {
    await updateGodModeAffiliate(id, { status });
    await load();
  }

  async function submitAssign(e) {
    e.preventDefault();
    setErr("");
    try {
      await assignBusinessToAffiliate({
        business_id: Number(assign.business_id),
        affiliate_id: Number(assign.affiliate_id),
        reason: assign.reason,
        retroactive: !!assign.retroactive,
      });
      setAssign({ business_id: "", affiliate_id: "", reason: "", retroactive: false });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.business_id || e?.response?.data?.detail || e?.message || "Assignment failed");
    }
  }

  const input = "h-10 rounded-2xl border border-slate-800 bg-slate-950/60 px-3 text-sm text-slate-100 outline-none";

  return (
    <div className="space-y-5">
      {err ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-200 text-sm">{String(err)}</div> : null}

      <AffiliateKpiCards metrics={overview} godMode />

      <div className="grid lg:grid-cols-2 gap-4">
        <form onSubmit={createAffiliate} className="rounded-3xl border border-slate-800 bg-slate-950/35 p-5">
          <div className="font-bold">Create Affiliate</div>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <input className={input} placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            <input className={input} placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            <input className={input} placeholder="Phone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            <select className={input} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
              <option value="PENDING">Pending</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="DEACTIVATED">Deactivated</option>
            </select>
          </div>
          <button className="mt-4 h-10 px-4 rounded-2xl border border-cyan-500/35 bg-cyan-500/18 text-cyan-100 font-semibold text-sm">
            Create
          </button>
        </form>

        <form onSubmit={submitAssign} className="rounded-3xl border border-slate-800 bg-slate-950/35 p-5">
          <div className="font-bold">Assign Business to Affiliate</div>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <input className={input} placeholder="Business ID" value={assign.business_id} onChange={(e) => setAssign((p) => ({ ...p, business_id: e.target.value }))} />
            <select className={input} value={assign.affiliate_id} onChange={(e) => setAssign((p) => ({ ...p, affiliate_id: e.target.value }))}>
              <option value="">Select affiliate</option>
              {affiliates.map((a) => <option key={a.id} value={a.id}>{a.name} — {a.code}</option>)}
            </select>
            <input className={`${input} sm:col-span-2`} placeholder="Reason" value={assign.reason} onChange={(e) => setAssign((p) => ({ ...p, reason: e.target.value }))} />
            <label className="sm:col-span-2 flex gap-2 items-center text-sm text-slate-300">
              <input type="checkbox" checked={assign.retroactive} onChange={(e) => setAssign((p) => ({ ...p, retroactive: e.target.checked }))} />
              Retroactive assignment
            </label>
          </div>
          <button className="mt-4 h-10 px-4 rounded-2xl border border-fuchsia-500/35 bg-fuchsia-500/18 text-fuchsia-100 font-semibold text-sm">
            Assign
          </button>
        </form>
      </div>

      <section className="rounded-3xl border border-slate-800 bg-slate-950/35 p-5">
        <div className="font-bold">Affiliates</div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="text-left py-2">Name</th>
                <th className="text-left py-2">Code</th>
                <th className="text-left py-2">Email</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Businesses</th>
                <th className="text-left py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {affiliates.map((a) => (
                <tr key={a.id} className="border-t border-slate-800">
                  <td className="py-3 font-semibold">{a.name}</td>
                  <td className="py-3 text-cyan-200 font-mono">{a.code}</td>
                  <td className="py-3">{a.email}</td>
                  <td className="py-3">{a.status}</td>
                  <td className="py-3">{a.referred_business_count || 0}</td>
                  <td className="py-3">
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => setStatus(a.id, "ACTIVE")} className="px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 text-xs">Approve</button>
                      <button onClick={() => setStatus(a.id, "SUSPENDED")} className="px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs">Suspend</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!affiliates.length ? (
                <tr><td colSpan="6" className="py-6 text-slate-500">No affiliates yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}