import React, { useState } from "react";

const input = "h-10 rounded-2xl border border-slate-800 bg-slate-950/60 px-3 text-sm text-slate-100 outline-none focus:border-fuchsia-500/50";

export default function AffiliateAssignBusinessCard({ affiliates = [], onSubmit }) {
  const [assign, setAssign] = useState({
    business_id: "",
    affiliate_id: "",
    reason: "",
    retroactive: false,
  });

  async function submit(e) {
    e.preventDefault();
    await onSubmit?.(assign);
    setAssign({ business_id: "", affiliate_id: "", reason: "", retroactive: false });
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-slate-800 bg-slate-950/35 p-5">
      <div className="font-bold">Assign Business to Affiliate</div>
      <div className="text-xs text-slate-500 mt-1">Use when a business forgot a code or needs manual attribution.</div>

      <div className="mt-4 grid sm:grid-cols-2 gap-3">
        <input className={input} placeholder="Business ID" value={assign.business_id} onChange={(e) => setAssign((p) => ({ ...p, business_id: e.target.value }))} />

        <select className={input} value={assign.affiliate_id} onChange={(e) => setAssign((p) => ({ ...p, affiliate_id: e.target.value }))}>
          <option value="">Select affiliate</option>
          {affiliates.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} — {a.code}
            </option>
          ))}
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
  );
}