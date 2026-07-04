// src/components/customer-health/HealthReleaseUpdateModal.jsx
import React from "react";
import { X } from "lucide-react";

const UPDATE_ITEMS = [
  {
    title: "Every saved set now matters",
    description:
      "Working sets immediately update exercise memory, training totals, and your Push, Pull, Legs, and Core balance.",
    accent:
      "border-lime-300/25 bg-lime-300/[0.08]",
  },
  {
    title: "Smarter workout recommendations",
    description:
      "SYNC reads your last seven days of training and shifts focus toward undertrained areas instead of repeatedly choosing the same workout type.",
    accent:
      "border-cyan-300/25 bg-cyan-300/[0.08]",
  },
  {
    title: "Immediate next-set coaching",
    description:
      "After a set is saved, the coach responds during rest with guidance based on reps, weight, effort, pain, and the current plan.",
    accent:
      "border-fuchsia-300/25 bg-fuchsia-300/[0.08]",
  },
  {
    title: "Connected daily health goals",
    description:
      "Steps, water, protein, calories, and sleep now feed seven-day charts, streaks, rewards, a daily score, and your next priority.",
    accent:
      "border-amber-300/25 bg-amber-300/[0.08]",
  },
];

export const HEALTH_RELEASE_UPDATE_ID =
  "health-connected-coach-2026-07";

export default function HealthReleaseUpdateModal({
  open,
  onClose,
  onOpenInsights,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[180] flex items-end justify-center bg-black/80 p-3 backdrop-blur-xl sm:items-center">
      <button
        type="button"
        aria-label="Close Health update"
        onClick={onClose}
        className="absolute inset-0"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="health-release-update-title"
        className="relative z-[181] max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-cyan-300/25 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_top_right,rgba(57,255,136,0.12),transparent_34%),linear-gradient(180deg,#07111f,#030712)] p-4 shadow-[0_30px_100px_rgba(0,0,0,0.78)] sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex rounded-full border border-lime-300/25 bg-lime-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-lime-100">
              Health Update
            </div>

            <h2
              id="health-release-update-title"
              className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl"
            >
              Your Health system is now connected
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
              Logging, coaching, recommendations, and daily goals now work together as one adaptive system.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss Health update"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-lg font-black text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {UPDATE_ITEMS.map((item) => (
            <article
              key={item.title}
              className={`rounded-2xl border p-4 ${item.accent}`}
            >
              <div className="text-sm font-black text-white">
                {item.title}
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-300">
                {item.description}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">
            The new feedback loop
          </div>

          <div className="mt-2 text-sm font-black leading-6 text-white">
            Log activity â†’ update progress â†’ adapt the next decision â†’ explain why
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-2xl border border-lime-300/25 bg-lime-300/12 px-4 text-sm font-black text-lime-100"
          >
            Explore Health Home
          </button>

          <button
            type="button"
            onClick={onOpenInsights}
            className="h-12 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 text-sm font-black text-cyan-100"
          >
            View Connected Insights
          </button>
        </div>

        <p className="mt-4 text-center text-[10px] leading-4 text-slate-500">
          This update notice appears once and will stay dismissed after you close it.
        </p>
      </section>
    </div>
  );
}