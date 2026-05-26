import React, { useMemo, useState } from "react";

function safeText(value) {
  return String(value || "").trim();
}

function buildReferralLink(affiliate) {
  const direct = safeText(affiliate?.referral_link);
  if (direct) return direct;

  const code = safeText(affiliate?.code);
  if (!code) return "";

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://syncworks-frontend-prod.vercel.app";

  return `${origin}/register?ref=${encodeURIComponent(code)}`;
}

function qrImageUrl(value) {
  if (!value) return "";
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=${encodeURIComponent(
    value
  )}`;
}

export default function AffiliateQrCard({ affiliate }) {
  const [copied, setCopied] = useState("");

  const code = safeText(affiliate?.code);
  const link = useMemo(() => buildReferralLink(affiliate), [affiliate]);
  const qrSvg = safeText(affiliate?.qr_code_svg);
  const qrImg = useMemo(() => qrImageUrl(link || code), [link, code]);

  async function copy(text, label) {
    try {
      await navigator.clipboard.writeText(text || "");
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      window.prompt("Copy this:", text || "");
    }
  }

  return (
    <div className="rounded-3xl border border-cyan-500/25 bg-cyan-500/8 p-5 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-slate-400">Your Affiliate Code</div>
          <div className="mt-1 text-3xl font-black text-cyan-100 break-all">
            {code || "—"}
          </div>
        </div>

        <span className="shrink-0 text-[11px] px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 font-semibold">
          Lifetime
        </span>
      </div>

      <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-950/55 p-4 overflow-hidden">
        <div className="mx-auto w-full max-w-[280px] rounded-3xl border border-cyan-500/25 bg-slate-900/80 p-4 shadow-[0_0_35px_rgba(34,211,238,0.12)]">
          {qrSvg ? (
            <div
              className="mx-auto [&_svg]:w-full [&_svg]:h-auto"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          ) : qrImg ? (
            <img
              src={qrImg}
              alt={`QR code for affiliate code ${code}`}
              className="mx-auto h-auto w-full rounded-2xl bg-white p-2"
              loading="lazy"
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
              QR unavailable
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/45 p-3">
        <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
          Referral Link
        </div>
        <div className="mt-2 text-xs text-slate-300 break-all">
          {link || "No referral link available yet."}
        </div>
      </div>

      {copied ? (
        <div className="mt-3 text-xs text-emerald-300">
          Copied {copied}.
        </div>
      ) : null}

      <div className="mt-4 flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => copy(code, "code")}
          className="h-10 px-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/12 hover:bg-cyan-500/18 text-cyan-100 text-xs font-semibold"
        >
          Copy Code
        </button>

        <button
          type="button"
          onClick={() => copy(link, "link")}
          className="h-10 px-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/12 hover:bg-indigo-500/18 text-indigo-100 text-xs font-semibold"
        >
          Copy Link
        </button>

        {link ? (
          <a
            href={qrImg}
            download={`syncworks-affiliate-${code || "qr"}.png`}
            className="h-10 px-4 inline-flex items-center justify-center rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/12 hover:bg-fuchsia-500/18 text-fuchsia-100 text-xs font-semibold"
          >
            Download QR
          </a>
        ) : null}
      </div>
    </div>
  );
}