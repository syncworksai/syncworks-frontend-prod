import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ModeBar from "../components/ModeBar";
import Button from "../components/ui/Button";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Card({ title, subtitle, children, right }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
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

function safeList(data) {
  if (!data) return [];
  return Array.isArray(data) ? data : [];
}

function readLocalFeed() {
  try {
    const raw = localStorage.getItem("sw_feed_items");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalFeed(items) {
  localStorage.setItem("sw_feed_items", JSON.stringify(Array.isArray(items) ? items : []));
}

function seedFeedIfNeeded() {
  const existing = readLocalFeed();
  if (existing.length) return existing;

  const demo = [
    {
      id: "feed-1",
      type: "AD",
      sponsored: true,
      title: "Quantum Edge FX",
      business_name: "Quantum Edge FX",
      headline: "Trading tools, insights, and education built for serious traders.",
      body: "Get structure, clarity, and execution support with premium trading resources.",
      cta: "Learn More",
      cta_href: "/newsfeed",
      city: "Remote",
      state: "",
      image_url: "",
    },
    {
      id: "feed-2",
      type: "FEATURED_BUSINESS",
      sponsored: true,
      title: "Featured Local Service",
      business_name: "SyncWorks Demo Plumbing",
      headline: "Fast plumbing service with clean scheduling and trusted routing.",
      body: "Book directly through SyncWorks and save your favorite providers to Business Cards.",
      cta: "Book Now",
      cta_href: "/customer/new-request",
      city: "Montgomery",
      state: "AL",
      image_url: "",
    },
    {
      id: "feed-3",
      type: "UPDATE",
      sponsored: false,
      title: "SyncWorks update",
      business_name: "",
      headline: "Business cards and settings are expanding.",
      body: "Customers will soon see stronger local deals, premium provider cards, and smarter business promotions.",
      cta: "Nice ✅",
      cta_href: "",
      city: "",
      state: "",
      image_url: "",
    },
  ];

  writeLocalFeed(demo);
  return demo;
}

function ItemPill({ children, tone = "slate" }) {
  const cls =
    tone === "fuchsia"
      ? "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200"
      : tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : "border-slate-800 bg-slate-950/60 text-slate-200";

  return <span className={cx("text-[11px] px-3 py-1.5 rounded-full border font-semibold", cls)}>{children}</span>;
}

function FeedPromoCard({ item, onOpen }) {
  const isAd = String(item?.type || "").toUpperCase() === "AD";
  const isSponsored = !!item?.sponsored || isAd;

  return (
    <div
      className={cx(
        "rounded-3xl border p-5 transition",
        isSponsored
          ? "border-fuchsia-500/20 bg-slate-950/45 shadow-[0_0_40px_rgba(217,70,239,0.08)]"
          : "border-slate-800 bg-slate-950/40"
      )}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex gap-2 flex-wrap items-center">
            <ItemPill tone={isSponsored ? "fuchsia" : "slate"}>{item?.type || "ITEM"}</ItemPill>
            {isSponsored ? <ItemPill tone="emerald">Sponsored</ItemPill> : null}
            {item?.city || item?.state ? (
              <ItemPill>
                {item?.city || ""}
                {item?.city && item?.state ? ", " : ""}
                {item?.state || ""}
              </ItemPill>
            ) : null}
          </div>

          <div className="mt-3 text-xl font-extrabold text-slate-100">
            {item?.business_name || item?.title || "Feed Item"}
          </div>

          {item?.headline ? <div className="mt-2 text-sm text-cyan-200">{item.headline}</div> : null}

          {item?.body ? <div className="mt-3 text-sm text-slate-300">{item.body}</div> : null}
        </div>

        <div className="shrink-0">
          <button
            type="button"
            className={cx(
              "text-xs rounded-2xl px-4 py-3 border transition font-semibold",
              isSponsored
                ? "bg-fuchsia-500/12 border-fuchsia-500/30 hover:bg-fuchsia-500/18 text-fuchsia-100"
                : "bg-slate-950/60 border-slate-800 hover:bg-slate-900/40 text-slate-200"
            )}
            onClick={() => onOpen(item)}
          >
            {item?.cta || "Open"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Newsfeed() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setItems(seedFeedIfNeeded());
  }, []);

  const featured = useMemo(() => {
    return items.filter((x) => !!x?.sponsored).slice(0, 3);
  }, [items]);

  function addQuickDemo() {
    setCreating(true);
    const next = [
      {
        id: String(Date.now()),
        type: "AD",
        sponsored: true,
        title: "New Sponsored Slot",
        business_name: "Promoted Business",
        headline: "This is where your internal paid promo will appear.",
        body: "Next: wire this to paid ad orders, approval queue, targeting, and reporting.",
        cta: "Open",
        cta_href: "/newsfeed",
        city: "Remote",
        state: "",
        image_url: "",
      },
      ...items,
    ];
    setItems(next);
    writeLocalFeed(next);
    setTimeout(() => setCreating(false), 500);
  }

  function openItem(item) {
    const href = String(item?.cta_href || "").trim();

    if (href.startsWith("/")) {
      nav(href);
      return;
    }

    if (href.startsWith("http://") || href.startsWith("https://")) {
      window.open(href, "_blank", "noreferrer");
      return;
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="Newsfeed"
        subtitle="Ads • Updates • Featured businesses • Local promos"
        rightActions={
          <div className="flex items-center gap-2">
            <Button tone="slate" onClick={() => nav(-1)}>
              Back
            </Button>
            <Button tone="fuchsia" onClick={addQuickDemo} disabled={creating}>
              {creating ? "Adding…" : "Add Demo Item"}
            </Button>
          </div>
        }
      />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <Card
          title="Featured Local Deals"
          subtitle="Promoted businesses, featured offers, and platform updates."
        >
          {featured.length ? (
            <div className="grid md:grid-cols-3 gap-3">
              {featured.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-fuchsia-500/20 bg-slate-950/45 p-4 shadow-[0_0_30px_rgba(217,70,239,0.08)]"
                >
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Featured</div>
                  <div className="mt-2 font-extrabold text-slate-100">{item.business_name || item.title}</div>
                  {item.headline ? <div className="mt-2 text-sm text-cyan-200">{item.headline}</div> : null}
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    className="mt-4 w-full h-10 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/12 hover:bg-fuchsia-500/18 text-fuchsia-100 text-sm font-semibold"
                  >
                    {item.cta || "Open"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-400">No featured items yet.</div>
          )}
        </Card>

        <Card
          title="What this becomes"
          subtitle="This is the internal ads/newsreel engine you described."
        >
          <div className="text-sm text-slate-300">
            Next wiring:
            <ul className="mt-2 list-disc pl-5 text-xs text-slate-400 space-y-1">
              <li>GodMode ad approvals</li>
              <li>Customer dashboard promo rail</li>
              <li>ZIP/category targeting</li>
              <li>Impression + click tracking</li>
              <li>SBO paid placement at $1/day</li>
            </ul>
          </div>
        </Card>

        <div className="space-y-3">
          {items.map((x) => (
            <FeedPromoCard key={x.id} item={x} onOpen={openItem} />
          ))}
        </div>
      </main>
    </div>
  );
}