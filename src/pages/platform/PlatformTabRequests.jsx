// src/components/platform/PlatformTabRequests.jsx
import React from "react";

function GlassCard({ title, children }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 backdrop-blur p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="font-semibold tracking-tight">{title}</div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function PlatformTabRequests({
  requestsLoading,
  requests,
  markInProgress,
  closeRequest,
  unlockBusiness,
  reload,
}) {
  async function unlockOnly(r) {
    if (!r?.business_id) return;
    await unlockBusiness(r.business_id);
    await reload?.();
  }

  async function unlockAndClose(r) {
    if (!r?.business_id) return;
    await unlockBusiness(r.business_id);
    await closeRequest(r.id);
    await reload?.();
  }

  return (
    <div className="space-y-4">
      <GlassCard title="God Mode Inbox (Support Requests)">
        <div className="text-xs text-slate-300/80">
          This replaces ticket inbox. These are SBO/PM/Tenant/Customer requests, including unlock requests.
        </div>

        <div className="mt-4 overflow-auto">
          {requestsLoading ? (
            <div className="text-slate-300">Loading…</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-slate-300/80">
                <tr>
                  <th className="text-left py-2">Kind</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Requester</th>
                  <th className="text-left py-2">Business</th>
                  <th className="text-left py-2">Message</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(requests || []).map((r) => (
                  <tr key={r.id} className="border-t border-white/10 align-top">
                    <td className="py-2">
                      <span className="px-2 py-1 rounded-full bg-white/10 border border-white/15 text-xs">
                        {r.kind}
                      </span>
                    </td>

                    <td className="py-2">
                      <span className="px-2 py-1 rounded-full bg-black/30 border border-white/10 text-xs">
                        {r.status}
                      </span>
                    </td>

                    <td className="py-2">
                      <div className="font-mono text-xs">{r.requester_email || ""}</div>
                      <div className="text-xs text-slate-300/70">{r.role || "-"}</div>
                    </td>

                    <td className="py-2 text-xs text-slate-300/80">
                      {r.business_id ? `#${r.business_id}` : "-"}
                    </td>

                    <td className="py-2">
                      <div className="font-semibold">{r.title || "(no title)"}</div>
                      <div className="text-xs text-slate-300/80 mt-1 whitespace-pre-wrap">{r.body}</div>
                    </td>

                    <td className="py-2">
                      <div className="flex gap-2 flex-wrap">
                        {r.status !== "IN_PROGRESS" ? (
                          <button
                            onClick={() => markInProgress(r.id)}
                            className="text-xs rounded-2xl px-3 py-2 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15"
                          >
                            In Progress
                          </button>
                        ) : null}

                        {r.business_id ? (
                          <button
                            onClick={() => unlockOnly(r)}
                            className="text-xs rounded-2xl px-3 py-2 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/15"
                            title="Unlocks the business billing lock"
                          >
                            Unlock Business
                          </button>
                        ) : null}

                        {r.kind === "UNLOCK" && r.business_id && r.status !== "CLOSED" ? (
                          <button
                            onClick={() => unlockAndClose(r)}
                            className="text-xs rounded-2xl px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15"
                            title="Unlock business and close this request"
                          >
                            Unlock + Close
                          </button>
                        ) : null}

                        {r.status !== "CLOSED" ? (
                          <button
                            onClick={() => closeRequest(r.id)}
                            className="text-xs rounded-2xl px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15"
                          >
                            Close
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}

                {!requests?.length ? (
                  <tr>
                    <td className="py-3 text-slate-300/70" colSpan={6}>
                      No requests yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
