import React from "react";
import CustomerInboxSnapshot from "./CustomerInboxSnapshot";
import CustomerAppTiles from "./CustomerAppTiles";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Card({ title, right, children, className = "" }) {
  return (
    <div
      className={cx(
        "rounded-[2rem] border border-slate-800/80 bg-slate-950/40 backdrop-blur-xl p-5 shadow-[0_0_60px_rgba(0,0,0,0.35)]",
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-xl font-black text-slate-100">
          {title}
        </div>

        {right}
      </div>

      {children}
    </div>
  );
}

function Pill({ children, tone = "cyan" }) {
  const toneMap = {
    cyan:
      "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
    fuchsia:
      "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200",
    emerald:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    amber:
      "border-amber-500/30 bg-amber-500/10 text-amber-200",
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-[11px] font-bold ${toneMap[tone]}`}
    >
      {children}
    </span>
  );
}

function invoiceTone(status) {
  const s = String(status || "").toUpperCase();

  if (s === "READY") {
    return "border-cyan-500/30 bg-cyan-500/10 text-cyan-200";
  }

  if (s === "SENT") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  }

  return "border-slate-700 bg-slate-900/60 text-slate-300";
}

function money(v) {
  return `$${Number(v || 0).toFixed(2)}`;
}

export default function CustomerOverviewGrid({
  dueInvoiceItems = [],
  totalDue = 0,
  navigate,
  setTab,
  featuredFeedItems = [],
  openFeedItem,
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-2">
          <Card
            title="Payments Due"
            right={<Pill tone="amber">{dueInvoiceItems.length} Due</Pill>}
          >
            <div className="mb-5 flex items-start justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-950/55 p-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Total Due
                </div>

                <div className="mt-2 text-4xl font-black text-amber-100">
                  {money(totalDue)}
                </div>
              </div>

              <button
                type="button"
                className="h-11 rounded-2xl border border-cyan-500/35 bg-cyan-500/18 px-5 text-sm font-bold text-cyan-100 hover:bg-cyan-500/24"
              >
                Pay All
              </button>
            </div>

            <div className="space-y-3">
              {dueInvoiceItems.length ? (
                dueInvoiceItems.slice(0, 4).map((item, idx) => {
                  const invoice = item.invoice || {};
                  const ticket = item.ticket || {};

                  return (
                    <div
                      key={idx}
                      className="rounded-3xl border border-slate-800 bg-slate-950/55 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-bold text-slate-100">
                            {ticket.title || ticket.taxonomy_label || "Service Request"}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            Ticket #{ticket.id || "—"}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xl font-black text-slate-100">
                            {money(invoice.total || invoice.amount || 0)}
                          </div>

                          <div
                            className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${invoiceTone(invoice.status)}`}
                          >
                            {invoice.status || "OPEN"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/tickets/${ticket.id}`)}
                          className="h-10 flex-1 rounded-2xl border border-cyan-500/30 bg-cyan-500/12 text-sm font-bold text-cyan-100 hover:bg-cyan-500/18"
                        >
                          Pay Now
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-700 p-5 text-sm text-slate-500">
                  No payments due right now.
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setTab("orders")}
              className="mt-5 h-11 w-full rounded-2xl border border-slate-700 bg-slate-950/55 text-sm font-bold text-cyan-100 hover:border-cyan-500/30"
            >
              View All Orders →
            </button>
          </Card>

          <CustomerInboxSnapshot
            unreadCount={3}
            latestSender="SyncWorks Plumbing"
            latestMessage="We're on the way. ETA 25 minutes."
            onOpenInbox={() => setTab("inbox")}
          />
        </div>

        <Card title="Your Apps & Tools">
          <CustomerAppTiles
            onFinance={() => setTab("finance")}
            onFitness={() => setTab("fitness")}
            onLocalBusinesses={() => navigate("/customer/business-cards")}
            onNewsfeed={() => navigate("/newsfeed")}
          />
        </Card>

        <Card
          title="Featured Local Offers"
          right={
            <button
              type="button"
              onClick={() => navigate("/newsfeed")}
              className="h-10 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 text-xs font-bold text-fuchsia-100 hover:bg-fuchsia-500/16"
            >
              View News Feed
            </button>
          }
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(featuredFeedItems.length
              ? featuredFeedItems
              : [
                  {
                    business_name: "Quantum Edge FX",
                    body: "Trading tools, insights, and education.",
                    cta: "Learn More",
                    tag: "SPONSORED",
                  },
                  {
                    business_name: "Elite Auto Detailing",
                    body: "Professional detailing and protection.",
                    cta: "View Offer",
                    tag: "FEATURED",
                  },
                  {
                    business_name: "SW Marketing Pros",
                    body: "Marketing that actually gets results.",
                    cta: "Get Started",
                    tag: "PROMOTED",
                  },
                ]
            ).map((item, idx) => (
              <div
                key={idx}
                className="rounded-3xl border border-fuchsia-500/20 bg-slate-950/50 p-4 shadow-[0_0_30px_rgba(217,70,239,0.06)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="h-16 w-16 rounded-2xl border border-slate-700 bg-slate-900/80" />

                  <Pill tone="fuchsia">
                    {item.tag || "FEATURED"}
                  </Pill>
                </div>

                <div className="mt-4 font-bold text-slate-100">
                  {item.business_name}
                </div>

                <div className="mt-2 text-sm leading-relaxed text-slate-400">
                  {item.body}
                </div>

                <button
                  type="button"
                  onClick={() => openFeedItem?.(item)}
                  className="mt-4 h-10 w-full rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/12 text-sm font-bold text-fuchsia-100 hover:bg-fuchsia-500/18"
                >
                  {item.cta || "Open"}
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}