import React from "react";

export default function AffiliatePayoutMethodCard({
  affiliate,
}) {
  const provider =
    affiliate?.payout_provider || "Not configured";

  const payoutEmail =
    affiliate?.payout_email || "No payout email set";

  const notes =
    affiliate?.payout_notes || "";

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xl font-black text-slate-100">
            Payout Method
          </div>

          <div className="mt-1 text-sm text-slate-400">
            Where SyncWorks sends affiliate payouts.
          </div>
        </div>

        <div className="px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 text-[11px] font-semibold">
          VERIFIED
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            Provider
          </div>

          <div className="mt-2 text-lg font-bold text-slate-100">
            {provider}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            Payout Account
          </div>

          <div className="mt-2 text-sm text-slate-300 break-all">
            {payoutEmail}
          </div>
        </div>

        {notes ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
              Notes
            </div>

            <div className="mt-2 text-sm text-slate-300">
              {notes}
            </div>
          </div>
        ) : null}

        <button
          type="button"
          className="w-full h-11 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/18 text-cyan-100 text-sm font-semibold"
        >
          Update Payout Method
        </button>
      </div>
    </div>
  );
}