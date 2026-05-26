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
        "rounded-3xl border border-slate-800/80 bg-slate-950/35 backdrop-blur-xl p-5 shadow-[0_0_60px_rgba(0,0,0,0.35)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="font-semibold text-slate-100">{title}</div>
        {right ? <div>{right}</div> : null}
      </div>

      {children}
    </div>
  );
}

function PromoPill({ children, tone = "slate" }) {
  const cls =
    tone === "fuchsia"
      ? "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200"
      : tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : tone === "cyan"
      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
      : tone === "amber"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
      : "border-slate-800 bg-slate-950/60 text-slate-200";

  return (
    <span
      className={`text-[11px] px-3 py-1.5 rounded-full border font-semibold ${cls}`}
    >
      {children}
    </span>
  );
}

function invoicePill(status) {
  const s = String(status || "").toUpperCase();
  const base =
    "text-[10px] px-2.5 py-1 rounded-full border font-semibold tracking-wide ";

  if (s === "PAID") {
    return base + "bg-emerald-500/10 border-emerald-500/30 text-emerald-200";
  }

  if (s === "VOID") {
    return base + "bg-slate-500/10 border-slate-500/30 text-slate-300";
  }

  if (s === "SENT" || s === "READY_FOR_PAYMENT" || s === "OPEN") {
    return base + "bg-amber-500/10 border-amber-500/30 text-amber-200";
  }

  return base + "bg-cyan-500/10 border-cyan-500/30 text-cyan-200";
}

function toMoney(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

function invoiceAmount(invoice) {
  if (!invoice) return 0;
  if (invoice.total != null && invoice.total !== "") return Number(invoice.total || 0);
  if (invoice.amount != null && invoice.amount !== "") return Number(invoice.amount || 0);
  if (invoice.amount_cents != null && invoice.amount_cents !== "") {
    return Number(invoice.amount_cents || 0) / 100;
  }
  return 0;
}

function safeStr(value) {
  return String(value || "").trim();
}

function resolveTicketTitle(ticket) {
  const candidates = [
    ticket?.taxonomy_label,
    ticket?.category_label,
    ticket?.service_category_label,
    ticket?.display_title,
    ticket?.display_name,
    ticket?.title,
    ticket?.category_name,
  ]
    .map(safeStr)
    .filter(Boolean);

  return candidates[0] || "Service Request";
}

function PaymentsDueCard({
  invoices = [],
  totalDue = 0,
  onPayNow,
  onOpenOrder,
  onViewOrders,
}) {
  return (
    <Card
      title="Payments Due"
      right={
        invoices.length ? (
          <PromoPill tone="amber">{invoices.length} due</PromoPill>
        ) : (
          <PromoPill>No balance</PromoPill>
        )
      }
    >
      {invoices.length ? (
        <>
          <div className="rounded-3xl border border-amber-500/20 bg-amber-500/8 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-amber-200/80">
              Total Due
            </div>

            <div className="mt-2 text-3xl font-extrabold text-amber-100">
              {toMoney(totalDue)}
            </div>
          </div>

          <div className="mt-4 space-y-3 min-w-0">
            {invoices.slice(0, 3).map((item) => {
              const ticket = item.ticket || {};
              const invoice = item.invoice || {};
              const amount = invoiceAmount(invoice);

              return (
                <div
                  key={`due-${ticket.id}-${invoice.id || "latest"}`}
                  className="rounded-3xl border border-slate-800/80 bg-slate-950/40 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-100 truncate">
                        {resolveTicketTitle(ticket)}
                      </div>

                      <div className="text-xs text-slate-400 mt-1">
                        Ticket #{ticket.id}
                      </div>
                    </div>

                    <span className={invoicePill(invoice?.status)}>
                      {String(invoice?.status || "OPEN")}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between min-w-0">
                    <div className="shrink-0">
                      <div className="text-[11px] text-slate-500">
                        Amount Due
                      </div>

                      <div className="text-xl font-extrabold text-cyan-100">
                        {toMoney(amount)}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      <button
                        type="button"
                        onClick={() => onOpenOrder?.(ticket.id)}
                        className="inline-flex items-center justify-center h-9 text-xs rounded-2xl px-4 bg-slate-950/55 border border-slate-800/80 hover:bg-slate-900/40 text-slate-200"
                      >
                        Open Order
                      </button>

                      <button
                        type="button"
                        onClick={() => onPayNow?.(ticket.id)}
                        className="inline-flex items-center justify-center h-9 text-xs rounded-2xl px-4 bg-amber-500/18 border border-amber-500/35 hover:bg-amber-500/24 text-amber-100"
                      >
                        Pay Now
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onViewOrders}
            className="mt-4 w-full inline-flex items-center justify-center h-10 text-xs rounded-2xl px-4 bg-cyan-500/18 border border-cyan-500/35 hover:bg-cyan-500/24 text-cyan-100"
          >
            View All Orders
          </button>
        </>
      ) : (
        <div className="rounded-3xl border border-slate-800/80 bg-slate-950/30 p-4">
          <div className="text-sm text-slate-200 font-semibold">
            No invoices due right now.
          </div>

          <div className="text-xs text-slate-500 mt-2">
            When a business marks an invoice ready for payment, it will show here.
          </div>
        </div>
      )}
    </Card>
  );
}

function FeaturedDealsRail({ items = [], onOpenFeedItem, onViewFeed }) {
  return (
    <Card
      title="Featured Local Deals"
      right={
        <button
          type="button"
          onClick={onViewFeed}
          className="inline-flex items-center justify-center h-9 text-xs rounded-2xl px-4 bg-fuchsia-500/14 border border-fuchsia-500/28 hover:bg-fuchsia-500/18 text-fuchsia-100"
        >
          Open Newsfeed
        </button>
      }
    >
      <div className="text-sm text-slate-400">
        Platform-approved promotions, featured offers, and local businesses.
      </div>

      <div className="mt-4 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
        {items.length ? (
          items.map((item) => (
            <div
              key={item.id}
              className="min-w-[310px] max-w-[310px] snap-start rounded-3xl border border-fuchsia-500/20 bg-slate-950/45 p-4 shadow-[0_0_30px_rgba(217,70,239,0.08)]"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <PromoPill tone="fuchsia">{item.type || "OFFER"}</PromoPill>
                <PromoPill tone="emerald">Approved</PromoPill>

                {(item.city || item.state) ? (
                  <PromoPill tone="cyan">
                    {item.city || ""}
                    {item.city && item.state ? ", " : ""}
                    {item.state || ""}
                  </PromoPill>
                ) : null}
              </div>

              <div className="mt-3 text-lg font-extrabold text-slate-100">
                {item.business_name || item.title || "Featured"}
              </div>

              {item.headline ? (
                <div className="mt-2 text-sm text-cyan-200">
                  {item.headline}
                </div>
              ) : null}

              {item.body ? (
                <div className="mt-3 text-sm text-slate-300">
                  {item.body}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => onOpenFeedItem?.(item)}
                className="mt-4 w-full h-10 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/12 hover:bg-fuchsia-500/18 text-fuchsia-100 text-sm font-semibold"
              >
                {item.cta || "Open"}
              </button>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-700 p-5 text-sm text-slate-500">
            No featured offers yet.
          </div>
        )}
      </div>
    </Card>
  );
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
    <div className="space-y-6">
      <div className="grid xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <PaymentsDueCard
            invoices={dueInvoiceItems}
            totalDue={totalDue}
            onPayNow={(ticketId) => navigate(`/tickets/${ticketId}`)}
            onOpenOrder={(ticketId) => navigate(`/tickets/${ticketId}`)}
            onViewOrders={() => setTab("orders")}
          />
        </div>

        <CustomerInboxSnapshot
          unreadCount={0}
          latestSender="SyncWorks"
          latestMessage="No new messages right now."
          onOpenInbox={() => setTab("inbox")}
        />
      </div>

      <CustomerAppTiles
        onFinance={() => setTab("finance")}
        onFitness={() => setTab("fitness")}
        onLocalBusinesses={() => navigate("/customer/business-cards")}
        onNewsfeed={() => navigate("/newsfeed")}
      />

      <FeaturedDealsRail
        items={featuredFeedItems}
        onOpenFeedItem={openFeedItem}
        onViewFeed={() => navigate("/newsfeed")}
      />
    </div>
  );
}