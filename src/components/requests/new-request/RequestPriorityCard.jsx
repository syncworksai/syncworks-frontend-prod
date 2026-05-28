// src/components/requests/new-request/RequestPriorityCard.jsx
import React from "react";
import { cx } from "./requestMarketplaceCatalog";

export const PRIORITY_OPTIONS = [
  {
    code: "P1",
    title: "Service Now / Emergency",
    shortTitle: "Service Now",
    eta: "2–4 hours",
    description:
      "Critical issues that need immediate provider response or fast dispatch.",
    helper:
      "Best for active leaks, no AC/heat, storm damage, tree blocking access, lockouts, safety issues, or urgent business needs.",
    classes:
      "border-red-500/70 bg-red-500/15 text-red-100 shadow-[0_0_30px_rgba(239,68,68,0.24)]",
    selectedClasses: "border-red-400 bg-red-500/25 ring-2 ring-red-500/35",
    badge: "SERVICE NOW",
  },
  {
    code: "P2",
    title: "Same Day / Next Day",
    shortTitle: "Fast Help",
    eta: "Today / tomorrow",
    description: "Urgent, but not an active emergency.",
    helper:
      "Best when the customer wants fast help but it can wait for the next available opening.",
    classes: "border-orange-500/55 bg-orange-500/12 text-orange-100",
    selectedClasses:
      "border-orange-400 bg-orange-500/20 ring-2 ring-orange-500/25",
    badge: "FAST",
  },
  {
    code: "P3",
    title: "Same Week",
    shortTitle: "This Week",
    eta: "2–5 business days",
    description: "Needed this week with reasonable scheduling flexibility.",
    helper:
      "Best for normal repairs, quotes, cleanup, grooming, tutoring, and non-urgent local services.",
    classes: "border-yellow-400/55 bg-yellow-400/12 text-yellow-100",
    selectedClasses:
      "border-yellow-300 bg-yellow-400/20 ring-2 ring-yellow-400/25",
    badge: "STANDARD",
  },
  {
    code: "P4",
    title: "First Available / Scheduled",
    shortTitle: "Scheduled",
    eta: "Pick a window",
    description: "Flexible timing or a planned appointment window.",
    helper:
      "Best for future appointments, planned projects, real estate showings, lessons, beauty bookings, and recurring services.",
    classes: "border-emerald-500/55 bg-emerald-500/12 text-emerald-100",
    selectedClasses:
      "border-emerald-400 bg-emerald-500/20 ring-2 ring-emerald-500/25",
    badge: "SCHEDULED",
  },
];

function priorityHintForService(service) {
  const ticketType = String(service?.ticketType || "").toUpperCase();
  const verticalKey = String(service?.verticalKey || "");

  if (ticketType === "FOOD") {
    return "For food and restaurant requests, use Service Now for ASAP pickup/delivery or Scheduled for catering/reservations.";
  }

  if (ticketType === "REAL_ESTATE") {
    return "For real estate, use Scheduled for showings or consultations, and Same Week for general questions or listing help.";
  }

  if (ticketType === "RETAIL") {
    return "For retail, use Service Now for same-day pickup/delivery, or Quote/Scheduled timing for larger product requests.";
  }

  if (verticalKey === "pets" || verticalKey === "beauty_wellness") {
    return "For appointment-based services, Scheduled usually works best unless the customer needs help today.";
  }

  return "Priority helps SyncWorks route, rank, and display the ticket correctly across customer and business views.";
}

export default function RequestPriorityCard({
  priority,
  setPriority,
  selectedService = null,
  mode = "CUSTOMER_MARKETPLACE",
}) {
  const isBusinessInternal = mode === "BUSINESS_INTERNAL";
  const activePriority = PRIORITY_OPTIONS.find((x) => x.code === priority);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-4 shadow-[0_0_34px_rgba(15,23,42,0.35)] md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-slate-100">
            Urgency & priority
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-400">
            {isBusinessInternal
              ? "Set priority so your team knows what needs attention first."
              : "Pick how fast you need help. Service Now gets the strongest marketplace visibility."}
          </div>
        </div>

        {activePriority ? (
          <div className="hidden rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100 sm:inline-flex">
            {activePriority.badge}
          </div>
        ) : null}
      </div>

      {selectedService ? (
        <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-950/65 p-3">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-lg">
              {selectedService.verticalIcon || "🎫"}
            </div>

            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Selected ticket type
              </div>
              <div className="mt-1 text-sm font-black text-slate-100">
                {selectedService.label}
              </div>
              <div className="mt-1 text-xs leading-5 text-slate-400">
                {priorityHintForService(selectedService)}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {PRIORITY_OPTIONS.map((option) => {
          const active = priority === option.code;

          return (
            <button
              key={option.code}
              type="button"
              onClick={() => setPriority(option.code)}
              className={cx(
                "relative overflow-hidden rounded-3xl border p-4 text-left transition",
                option.classes,
                active ? option.selectedClasses : "hover:scale-[1.01]"
              )}
            >
              {option.code === "P1" ? (
                <>
                  <div className="absolute inset-x-0 top-0 h-1 bg-red-400" />
                  <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-red-400/20 blur-2xl" />
                </>
              ) : null}

              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] opacity-90">
                    {option.badge}
                  </div>

                  <div className="mt-1 text-base font-black">
                    {option.title}
                  </div>

                  <div className="mt-1 text-xs font-bold opacity-90">
                    {option.eta}
                  </div>

                  <div className="mt-2 text-xs leading-5 opacity-75">
                    {option.description}
                  </div>

                  <div className="mt-3 text-[11px] leading-5 opacity-65">
                    {option.helper}
                  </div>
                </div>

                <span
                  className={cx(
                    "shrink-0 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em]",
                    active
                      ? "border-white/30 bg-white/15 text-white"
                      : "border-white/10 bg-black/10"
                  )}
                >
                  {active ? "Selected" : "Pick"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/65 p-3 text-xs leading-5 text-slate-400">
        {isBusinessInternal ? (
          <>
            Business-created tickets stay internal to your company, but priority
            still helps your employees, queues, dashboards, and future automations
            know what to handle first.
          </>
        ) : (
          <>
            Customers see a simple choice. Behind the scenes, SyncWorks can use
            priority to trigger alerts, sort provider boards, send follow-ups,
            and track speed-to-lead.
          </>
        )}
      </div>
    </div>
  );
}