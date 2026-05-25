import React from "react";

function tone(status) {
  switch (String(status || "").toUpperCase()) {
    case "ACTIVE":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    case "PENDING":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    case "SUSPENDED":
      return "border-rose-500/30 bg-rose-500/10 text-rose-200";
    default:
      return "border-slate-700 bg-slate-800/40 text-slate-300";
  }
}

export default function AffiliateTable({ affiliates = [], onOpen, onApprove, onSuspend }) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950/35 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-bold text-lg">Affiliates</div>
          <div className="text-xs text-slate-500 mt-1">All partner accounts, codes, status, and business counts.</div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-xs text-slate-500">
            <tr>
              <th className="text-left py-2">Affiliate</th>
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
                <td className="py-3 font-semibold">{a.name || "Unnamed"}</td>
                <td className="py-3 text-cyan-200 font-mono">{a.code}</td>
                <td className="py-3 text-slate-300">{a.email}</td>
                <td className="py-3">
                  <span className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${tone(a.status)}`}>
                    {a.status}
                  </span>
                </td>
                <td className="py-3">{a.referred_business_count || 0}</td>
                <td className="py-3">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onOpen?.(a)}
                      className="px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 text-xs"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => onApprove?.(a)}
                      className="px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 text-xs"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => onSuspend?.(a)}
                      className="px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs"
                    >
                      Suspend
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!affiliates.length ? (
              <tr>
                <td colSpan="6" className="py-6 text-slate-500">
                  No affiliates yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}