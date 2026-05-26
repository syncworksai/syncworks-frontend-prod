import React, { useMemo, useState } from "react";

function buildReferralLink(affiliate) {
  if (affiliate?.referral_link) {
    return affiliate.referral_link;
  }

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://syncworks-frontend-prod.vercel.app";

  return `${origin}/register?ref=${affiliate?.code || ""}`;
}

export default function AffiliateShareTools({
  affiliate,
}) {
  const [copied, setCopied] = useState("");

  const link = useMemo(
    () => buildReferralLink(affiliate),
    [affiliate]
  );

  async function copy(text, label) {
    try {
      await navigator.clipboard.writeText(text || "");
      setCopied(label);

      window.setTimeout(() => {
        setCopied("");
      }, 1800);
    } catch {
      window.prompt("Copy this:", text || "");
    }
  }

  function openShare() {
    const text = `Join SyncWorks using my affiliate link: ${link}`;

    if (navigator.share) {
      navigator.share({
        title: "SyncWorks",
        text,
        url: link,
      });

      return;
    }

    copy(link, "link");
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xl font-black text-slate-100">
            Share Tools
          </div>

          <div className="mt-1 text-sm text-slate-400">
            Share your referral tools anywhere online or in-person.
          </div>
        </div>

        <div className="px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 text-[11px] font-semibold">
          LIVE
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
          Referral Link
        </div>

        <div className="mt-2 text-sm text-slate-300 break-all">
          {link}
        </div>
      </div>

      {copied ? (
        <div className="mt-3 text-xs text-emerald-300">
          Copied {copied}.
        </div>
      ) : null}

      <div className="mt-5 grid sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => copy(affiliate?.code || "", "code")}
          className="h-11 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/18 text-cyan-100 text-sm font-semibold"
        >
          Copy Code
        </button>

        <button
          type="button"
          onClick={() => copy(link, "link")}
          className="h-11 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/18 text-indigo-100 text-sm font-semibold"
        >
          Copy Link
        </button>

        <button
          type="button"
          onClick={openShare}
          className="h-11 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 hover:bg-fuchsia-500/18 text-fuchsia-100 text-sm font-semibold"
        >
          Share
        </button>
      </div>
    </div>
  );
}