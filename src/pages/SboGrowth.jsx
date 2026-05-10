import React, { useMemo } from "react";
import ModeBar from "../components/ModeBar";
import Button from "../components/ui/Button";
import GrowthContentEngineCard from "../components/platform/growth/GrowthContentEngineCard";
import { toneFromStatus } from "../components/platform/growth/growthUtils";
import { useNavigate } from "react-router-dom";

export default function SboGrowth() {
  const navigate = useNavigate();

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

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        <section className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-5">
          <div className="text-xs uppercase tracking-[0.24em] text-cyan-200 font-black">SyncWorks Growth OS</div>
          <h1 className="mt-2 text-2xl md:text-3xl font-black tracking-tight text-white">
            Turn leads into follow-ups, drafts, and posts automatically.
          </h1>
          <p className="mt-2 text-sm text-slate-300 max-w-3xl">
            This is the SBO version of the Growth OS. It stays in safe mode for now: drafts can be queued and simulated,
            but nothing is posted externally until real channel connections are enabled.
          </p>
        </section>

        <GrowthContentEngineCard
          contentQueue={contentQueue}
          aiPostPresets={aiPostPresets}
          aiGeneratedPreviews={aiGeneratedPreviews}
          toneFromStatus={toneFromStatus}
        />
      </main>
    </div>
  );
}