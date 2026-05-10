import React, { useMemo } from "react";
import ModeBar from "../components/ModeBar";
import Button from "../components/ui/Button";
import GrowthContentEngineCard from "../components/platform/growth/GrowthContentEngineCard";
import { toneFromStatus } from "../components/platform/growth/growthUtils";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const GROWTH_OS_PAYMENT_URL = "https://buy.stripe.com/28E9AT4aefLp4uJ0Kn2Nq0i";

function UnlockGrowthOsCard({ onBack }) {
  function openCheckout() {
    window.open(GROWTH_OS_PAYMENT_URL, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-fuchsia-500/25 bg-slate-950/60 p-6 shadow-[0_0_70px_rgba(217,70,239,0.12)]">
        <div className="pointer-events-none absolute -inset-24 blur-3xl bg-gradient-to-br from-fuchsia-500/20 via-indigo-500/15 to-cyan-500/15" />

        <div className="relative grid lg:grid-cols-[1.3fr_0.7fr] gap-6 items-center">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-fuchsia-200 font-black">
              Growth OS Add-on
            </div>

            <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-white">
              Unlock Growth OS
            </h1>

            <p className="mt-3 text-sm md:text-base text-slate-300 max-w-3xl leading-relaxed">
              Automate follow-ups, review requests, and social content.
            </p>

            <div className="mt-5 grid sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                <div className="text-sm font-extrabold text-cyan-100">Follow-ups</div>
                <div className="mt-1 text-xs text-slate-300">Turn new leads into ready-to-send replies.</div>
              </div>

              <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4">
                <div className="text-sm font-extrabold text-indigo-100">Reviews</div>
                <div className="mt-1 text-xs text-slate-300">Generate review requests after completed jobs.</div>
              </div>

              <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-4">
                <div className="text-sm font-extrabold text-fuchsia-100">Content</div>
                <div className="mt-1 text-xs text-slate-300">Draft social posts without starting from scratch.</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/75 p-5">
            <div className="text-xs uppercase tracking-[0.22em] text-slate-400 font-black">
              Monthly add-on
            </div>

            <div className="mt-3 flex items-end gap-2">
              <div className="text-4xl font-black text-white">$9.99</div>
              <div className="pb-1 text-sm text-slate-400">/mo</div>
            </div>

            <div className="mt-3 text-sm text-slate-300">
              Safe-mode Growth OS access for SBO users.
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <Button tone="fuchsia" onClick={openCheckout}>
                Unlock Growth OS
              </Button>

              <Button tone="slate" onClick={onBack}>
                Back to SBO Dashboard
              </Button>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100">
              Nothing posts externally until real channel connections are enabled.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function SboGrowth() {
  const navigate = useNavigate();
  const { booting, isGod, canAccessGrowthOs, moduleAccess } = useAuth();

  const growthUnlocked = !!isGod || !!canAccessGrowthOs;

  const contentQueue = useMemo(
    () => [
      { id: "sbo-demo-1", title: "Weekly service tip", status: "DRAFT", source: "DEMO" },
      { id: "sbo-demo-2", title: "Review request campaign", status: "SCHEDULED", source: "DEMO" },
    ],
    []
  );

  const aiPostPresets = useMemo(
    () => [
      { key: "promo", label: "Generate Promo Post" },
      { key: "review", label: "Generate Review Ask" },
      { key: "educational", label: "Generate Educational Post" },
      { key: "before_after", label: "Generate Before/After Post" },
    ],
    []
  );

  const aiGeneratedPreviews = useMemo(
    () => [
      {
        id: "gp-1",
        title: "Lead Follow-Up",
        body: "Thanks for reaching out — we can help. Want to get on the schedule?",
        channel: "SMS / Email Draft",
      },
      {
        id: "gp-2",
        title: "Review Ask",
        body: "If we earned it, a quick review helps our small business grow.",
        channel: "Google / Facebook",
      },
      {
        id: "gp-3",
        title: "Service Promo",
        body: "Booking this week? Ask about our fast-turnaround service slots.",
        channel: "Facebook / Instagram",
      },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="Growth OS"
        subtitle="Automated follow-ups, social drafts, and safe publishing queue"
        rightActions={
          <div className="flex gap-2 flex-wrap">
            <Button tone="cyan" onClick={() => navigate("/sbo")}>
              SBO Dashboard
            </Button>
            <Button tone="slate" onClick={() => navigate("/sbo/settings?return=%2Fsbo%2Fgrowth")}>
              Settings
            </Button>
          </div>
        }
      />

      {booting || !moduleAccess?.checked ? (
        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5 text-sm text-slate-300">
            Loading Growth OS access…
          </div>
        </main>
      ) : !growthUnlocked ? (
        <UnlockGrowthOsCard onBack={() => navigate("/sbo")} />
      ) : (
        <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
          <section className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-cyan-200 font-black">
                  SyncWorks Growth OS
                </div>
                <h1 className="mt-2 text-2xl md:text-3xl font-black tracking-tight text-white">
                  Turn leads into follow-ups, drafts, and posts automatically.
                </h1>
                <p className="mt-2 text-sm text-slate-300 max-w-3xl">
                  This is the SBO version of the Growth OS. It stays in safe mode for now: drafts can be queued and simulated,
                  but nothing is posted externally until real channel connections are enabled.
                </p>
              </div>

              {isGod ? (
                <div className="rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 text-xs font-black text-fuchsia-200">
                  God Mode Bypass
                </div>
              ) : (
                <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-200">
                  Growth OS Active
                </div>
              )}
            </div>
          </section>

          <GrowthContentEngineCard
            contentQueue={contentQueue}
            aiPostPresets={aiPostPresets}
            aiGeneratedPreviews={aiGeneratedPreviews}
            toneFromStatus={toneFromStatus}
          />
        </main>
      )}
    </div>
  );
}