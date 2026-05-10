import React, { useMemo, useState } from "react";
import { CHANNELS } from "./growthData";
import ChannelBadge from "./ChannelBadge";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function StepPill({ active, done, children }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black",
        active
          ? "border-cyan-500/35 bg-cyan-500/15 text-cyan-100"
          : done
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          : "border-slate-800 bg-slate-950/50 text-slate-400"
      )}
    >
      {children}
    </span>
  );
}

function OptionCard({ title, copy, selected, onClick, tone = "cyan" }) {
  const tones = {
    cyan: selected ? "border-cyan-500/50 bg-cyan-500/15" : "border-cyan-500/20 bg-cyan-500/8",
    indigo: selected ? "border-indigo-500/50 bg-indigo-500/15" : "border-indigo-500/20 bg-indigo-500/8",
    fuchsia: selected ? "border-fuchsia-500/50 bg-fuchsia-500/15" : "border-fuchsia-500/20 bg-fuchsia-500/8",
    emerald: selected ? "border-emerald-500/50 bg-emerald-500/15" : "border-emerald-500/20 bg-emerald-500/8",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-2xl border p-4 text-left transition hover:bg-slate-900/50",
        tones[tone] || tones.cyan
      )}
    >
      <div className="text-sm font-black text-white">{title}</div>
      <div className="mt-2 text-xs leading-relaxed text-slate-300">{copy}</div>
    </button>
  );
}

export default function GrowthOnboardingWizard({
  variant = "sbo",
  onCreateStarter,
  onOpenChannels,
  onSkip,
}) {
  const isPlatform = variant === "platform";
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState("leads");
  const [style, setStyle] = useState("approve");

  const channelPreview = useMemo(
    () =>
      CHANNELS.filter((c) =>
        ["facebook", "instagram", "google_business", "email"].includes(c.key)
      ),
    []
  );

  const starterType = useMemo(() => {
    if (goal === "reviews") return "review_request";
    if (goal === "social") return "weekly_tip";
    if (goal === "winback") return "promo";
    return "lead_follow_up";
  }, [goal]);

  function next() {
    setStep((s) => Math.min(s + 1, 4));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 1));
  }

  function finish() {
    if (typeof onCreateStarter === "function") {
      onCreateStarter({
        key: starterType,
        label:
          starterType === "review_request"
            ? "Start Review Request"
            : starterType === "weekly_tip"
            ? "Start Weekly Service Tip"
            : starterType === "promo"
            ? "Start Promo Post"
            : "Start Lead Follow-Up",
      });
    }
  }

  return (
    <section className="rounded-3xl border border-cyan-500/20 bg-slate-950/45 p-5 shadow-[0_0_70px_rgba(34,211,238,0.08)]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-cyan-200 font-black">
            {isPlatform ? "Growth OS Setup Preview" : "Set up Growth OS"}
          </div>
          <h2 className="mt-2 text-xl md:text-2xl font-black text-white">
            {isPlatform
              ? "Preview the SBO onboarding flow."
              : "Let SyncWorks guide your first automation."}
          </h2>
          <p className="mt-2 text-sm text-slate-300 max-w-3xl">
            {isPlatform
              ? "This shows the same setup flow business owners will use while preserving the full internal platform dashboard below."
              : "Answer a few simple questions, connect accounts when ready, and create your first safe-mode draft."}
          </p>
        </div>

        <button
          type="button"
          onClick={onSkip}
          className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-2 text-xs text-slate-300 hover:bg-slate-900/60"
        >
          Hide guide
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <StepPill active={step === 1} done={step > 1}>1. Goal</StepPill>
        <StepPill active={step === 2} done={step > 2}>2. Accounts</StepPill>
        <StepPill active={step === 3} done={step > 3}>3. Style</StepPill>
        <StepPill active={step === 4} done={false}>4. First draft</StepPill>
      </div>

      <div className="mt-5">
        {step === 1 ? (
          <div>
            <div className="text-sm font-black text-slate-100">What do you want Growth OS to help with first?</div>
            <div className="mt-3 grid md:grid-cols-4 gap-3">
              <OptionCard
                title="Get more leads"
                copy="Create quick replies and follow-ups for new service requests."
                selected={goal === "leads"}
                onClick={() => setGoal("leads")}
                tone="cyan"
              />
              <OptionCard
                title="Get more reviews"
                copy="Draft review requests after completed jobs or paid invoices."
                selected={goal === "reviews"}
                onClick={() => setGoal("reviews")}
                tone="indigo"
              />
              <OptionCard
                title="Stay active online"
                copy="Create helpful weekly posts for customers."
                selected={goal === "social"}
                onClick={() => setGoal("social")}
                tone="fuchsia"
              />
              <OptionCard
                title="Reconnect old leads"
                copy="Create win-back messages for quiet prospects."
                selected={goal === "winback"}
                onClick={() => setGoal("winback")}
                tone="emerald"
              />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <div className="text-sm font-black text-slate-100">Connect accounts when you’re ready.</div>
            <div className="mt-2 text-xs text-slate-400">
              You can keep using safe mode without connecting anything. Real posting requires connected channels later.
            </div>
            <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {channelPreview.map((channel) => (
                <div key={channel.key} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center gap-2">
                    <ChannelBadge channel={channel} />
                    <div className="text-sm font-bold text-slate-100">{channel.name}</div>
                  </div>
                  <div className="mt-2 text-xs text-slate-400">{channel.description}</div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={onOpenChannels}
              className="mt-4 rounded-2xl border border-cyan-500/35 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-500/15"
            >
              Open Connect Channels
            </button>
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            <div className="text-sm font-black text-slate-100">How much control do you want?</div>
            <div className="mt-3 grid md:grid-cols-3 gap-3">
              <OptionCard
                title="Drafts only"
                copy="SyncWorks creates drafts. You decide what happens next."
                selected={style === "drafts"}
                onClick={() => setStyle("drafts")}
                tone="cyan"
              />
              <OptionCard
                title="Approve before posting"
                copy="Recommended. Review first, then schedule or post safely."
                selected={style === "approve"}
                onClick={() => setStyle("approve")}
                tone="emerald"
              />
              <OptionCard
                title="Fully automatic later"
                copy="Future mode after accounts, rules, and trust settings are ready."
                selected={style === "auto"}
                onClick={() => setStyle("auto")}
                tone="fuchsia"
              />
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <div className="text-sm font-black text-emerald-100">Create your first safe-mode draft.</div>
            <div className="mt-2 text-sm text-slate-300">
              Growth OS will create a draft based on your goal. Nothing posts externally.
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={finish}
                className="rounded-2xl border border-emerald-500/35 bg-emerald-500/15 px-4 py-2 text-xs font-black text-emerald-100 hover:bg-emerald-500/20"
              >
                Create First Draft
              </button>
              <button
                type="button"
                onClick={onOpenChannels}
                className="rounded-2xl border border-cyan-500/35 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-500/15"
              >
                Connect Accounts
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex justify-between gap-2">
        <button
          type="button"
          onClick={back}
          disabled={step === 1}
          className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-2 text-xs text-slate-300 disabled:opacity-40"
        >
          Back
        </button>
        <button
          type="button"
          onClick={next}
          disabled={step === 4}
          className="rounded-2xl border border-cyan-500/35 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-100 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </section>
  );
}