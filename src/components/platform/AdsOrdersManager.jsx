import React, { useEffect, useMemo, useState } from "react";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Card({ title, subtitle, right, children }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="font-semibold text-slate-100">{title}</div>
          {subtitle ? <div className="text-xs text-slate-400 mt-1">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function safeList(x) {
  if (!x) return [];
  return Array.isArray(x) ? x : [];
}

function readFeedItems() {
  try {
    const raw = localStorage.getItem("sw_feed_items");
    const parsed = raw ? JSON.parse(raw) : [];
    return safeList(parsed);
  } catch {
    return [];
  }
}

function writeFeedItems(items) {
  try {
    localStorage.setItem("sw_feed_items", JSON.stringify(Array.isArray(items) ? items : []));
  } catch {
    // ignore
  }
}

function readAdOrders() {
  try {
    const raw = localStorage.getItem("sw_ad_orders");
    const parsed = raw ? JSON.parse(raw) : [];
    return safeList(parsed);
  } catch {
    return [];
  }
}

function writeAdOrders(items) {
  try {
    localStorage.setItem("sw_ad_orders", JSON.stringify(Array.isArray(items) ? items : []));
  } catch {
    // ignore
  }
}

function seedDemoOrdersIfNeeded() {
  const existing = readAdOrders();
  if (existing.length) return existing;

  const demo = [
    {
      id: "ad-order-1",
      status: "PENDING",
      business_name: "Quantum Edge FX",
      headline: "Trading tools, insights, and education built for serious traders.",
      body: "Featured platform ad for traders who want structure, execution, and psychology support.",
      cta: "Learn More",
      cta_href: "/newsfeed",
      city: "Remote",
      state: "",
      placement: "customer_dashboard",
      daily_budget: 1,
      sponsored: true,
      image_url: "",
      created_at: new Date().toISOString(),
    },
    {
      id: "ad-order-2",
      status: "APPROVED",
      business_name: "SyncWorks Demo Plumbing",
      headline: "Fast plumbing help with local scheduling and clean pricing.",
      body: "Book trusted plumbing service directly through SyncWorks.",
      cta: "Book Now",
      cta_href: "/customer/new-request",
      city: "Montgomery",
      state: "AL",
      placement: "newsfeed",
      daily_budget: 1,
      sponsored: true,
      image_url: "",
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  writeAdOrders(demo);
  return demo;
}

function toFeedItem(order) {
  return {
    id: order.id,
    type: "AD",
    status: order.status || "APPROVED",
    sponsored: true,
    title: order.business_name || "Featured Business",
    business_name: order.business_name || "",
    headline: order.headline || "",
    body: order.body || "",
    cta: order.cta || "Open",
    cta_href: order.cta_href || "/newsfeed",
    city: order.city || "",
    state: order.state || "",
    image_url: order.image_url || "",
    placement: order.placement || "customer_dashboard",
    created_at: order.created_at || new Date().toISOString(),
  };
}

export default function AdsOrdersManager() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems(seedDemoOrdersIfNeeded());
  }, []);

  const counts = useMemo(() => {
    const list = safeList(items);
    return {
      total: list.length,
      pending: list.filter((x) => String(x.status).toUpperCase() === "PENDING").length,
      approved: list.filter((x) => String(x.status).toUpperCase() === "APPROVED").length,
      rejected: list.filter((x) => String(x.status).toUpperCase() === "REJECTED").length,
    };
  }, [items]);

  function updateStatus(id, nextStatus) {
    const next = items.map((x) =>
      x.id === id
        ? {
            ...x,
            status: nextStatus,
          }
        : x
    );
    setItems(next);
    writeAdOrders(next);

    const approvedAds = next
      .filter((x) => String(x.status).toUpperCase() === "APPROVED")
      .map(toFeedItem);

    const currentFeed = readFeedItems();
    const nonOrderAds = currentFeed.filter((x) => !String(x.id || "").startsWith("ad-order-"));
    writeFeedItems([...approvedAds, ...nonOrderAds]);
  }

  return (
    <div className="space-y-4">
      <Card
        title="Ads Orders Manager"
        subtitle="Approve or reject internal ad placements before customers see them."
        right={
          <div className="flex gap-2 flex-wrap text-[11px]">
            <span className="px-3 py-2 rounded-full border border-slate-800 bg-slate-950/60 text-slate-200">
              Total {counts.total}
            </span>
            <span className="px-3 py-2 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-200">
              Pending {counts.pending}
            </span>
            <span className="px-3 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-200">
              Approved {counts.approved}
            </span>
            <span className="px-3 py-2 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-200">
              Rejected {counts.rejected}
            </span>
          </div>
        }
      >
        <div className="text-sm text-slate-300">
          MVP flow:
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-400 space-y-1">
            <li>Businesses submit ad content</li>
            <li>GodMode approves/rejects</li>
            <li>Approved ads appear in Customer Dashboard + Newsfeed</li>
            <li>Later: billing, ZIP targeting, impressions, clicks, schedules</li>
          </ul>
        </div>
      </Card>

      <div className="space-y-3">
        {items.map((x) => {
          const status = String(x.status || "PENDING").toUpperCase();

          return (
            <div key={x.id} className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    {x.placement || "placement"}
                  </div>
                  <div className="text-lg font-extrabold text-slate-100 mt-1">
                    {x.business_name || "Business"}
                  </div>
                  {x.headline ? <div className="text-sm text-cyan-200 mt-2">{x.headline}</div> : null}
                  {x.body ? <div className="text-sm text-slate-300 mt-2">{x.body}</div> : null}

                  <div className="mt-3 flex gap-2 flex-wrap text-[11px]">
                    <span className="px-3 py-1.5 rounded-full border border-slate-800 bg-slate-950/60 text-slate-200">
                      ${x.daily_budget || 1}/day
                    </span>

                    <span
                      className={cx(
                        "px-3 py-1.5 rounded-full border",
                        status === "APPROVED"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                          : status === "REJECTED"
                          ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                      )}
                    >
                      {status}
                    </span>

                    {(x.city || x.state) && (
                      <span className="px-3 py-1.5 rounded-full border border-slate-800 bg-slate-950/60 text-slate-200">
                        {x.city || ""}
                        {x.city && x.state ? ", " : ""}
                        {x.state || ""}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => updateStatus(x.id, "APPROVED")}
                    className="h-10 px-4 rounded-2xl border border-emerald-500/35 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-200 text-sm font-semibold"
                  >
                    Approve
                  </button>

                  <button
                    type="button"
                    onClick={() => updateStatus(x.id, "REJECTED")}
                    className="h-10 px-4 rounded-2xl border border-rose-500/35 bg-rose-500/10 hover:bg-rose-500/15 text-rose-200 text-sm font-semibold"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {!items.length ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">
            No ad orders yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}