import React from "react";

export default function AffiliateQrCard({ affiliate }) {
  const code = affiliate?.code || "";
  const link = affiliate?.referral_link || "";
  const qr = affiliate?.qr_code_svg || "";

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text || "");
    } catch {
      window.prompt("Copy this:", text || "");
    }
  }

  return (
    <div className="rounded-3xl border border-cyan-500/25 bg-cyan-500/8 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-400">Your Affiliate Code</div>
          <div className="mt-1 text-3xl font-black text-cyan-100">{code || "—"}</div>
        </div>
        <span className="text-[11px] px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 font-semibold">
          Lifetime
        </span>
      </div>

      <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-950/55 p-3 overflow-hidden">
        {qr ? (
          <div
            className="mx-auto max-w-[260px]"
            dangerouslySetInnerHTML={{ __html: qr }}
          />
        ) : (
          <div className="h-48 flex items-center justify-center text-slate-500">
            QR unavailable
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-slate-400 break-all">{link}</div>

      <div className="mt-4 flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => copy(code)}
          className="h-10 px-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/12 hover:bg-cyan-500/18 text-cyan-100 text-xs font-semibold"
        >
          Copy Code
        </button>
        <button
          type="button"
          onClick={() => copy(link)}
          className="h-10 px-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/12 hover:bg-indigo-500/18 text-indigo-100 text-xs font-semibold"
        >
          Copy Link
        </button>
      </div>
    </div>
  );
}