// src/pages/Newsfeed.jsx
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

/**
 * MVP: local items (so the page works now)
 * Later: GET /feed/ or /ads/feed/ with targeting rules (role, zip, services, licensed_states, etc)
 */
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

export default function Newsfeed() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const seed = readLocalFeed();
    if (seed.length) {
      setItems(seed);
      return;
    }
    // Seed example items
    const demo = [
      {
        id: "demo-1",
        type: "AD",
        title: "Your business can run ads here",
        body: "This newsfeed is the internal ads/newsreel. Next step: targeting by ZIP + services + roles.",
        cta: "Learn more",
      },
      {
        id: "demo-2",
        type: "UPDATE",
        title: "SyncWorks update",
        body: "Settings now switch by role and show identity info in the ModeBar.",
        cta: "Nice ✅",
      },
    ];
    setItems(demo);
    writeLocalFeed(demo);
  }, []);

  function addQuickDemo() {
    setCreating(true);
    const next = [
      {
        id: String(Date.now()),
        type: "AD",
        title: "New Ad Slot",
        body: "Replace this with real Stripe-paid ad placements (SBO: $1/day) + approvals.",
        cta: "Open",
      },
      ...items,
    ];
    setItems(next);
    writeLocalFeed(next);
    setTimeout(() => setCreating(false), 500);
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="Newsfeed"
        subtitle="Ads • Updates • Local promos"
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

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <Card
          title="What this is"
          subtitle="This is the ads/newsreel you described (DoorDash-style retention: reason to log in)."
        >
          <div className="text-sm text-slate-300">
            Next wiring:
            <ul className="mt-2 list-disc pl-5 text-xs text-slate-400 space-y-1">
              <li>Backend feed endpoint (targeting by role, ZIP, services, licensed_states)</li>
              <li>Stripe: $1/day ad subscription + approval queue</li>
              <li>Impression/click tracking + basic reporting</li>
            </ul>
          </div>
        </Card>

        <div className="space-y-3">
          {items.map((x) => (
            <div
              key={x.id}
              className={cx(
                "rounded-3xl border border-slate-800 bg-slate-950/40 p-5",
                x.type === "AD" ? "shadow-[0_0_40px_rgba(217,70,239,0.10)]" : ""
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-slate-500">{x.type}</div>
                  <div className="font-semibold text-slate-100 mt-1">{x.title}</div>
                  <div className="text-sm text-slate-300 mt-2">{x.body}</div>
                </div>
                <button
                  type="button"
                  className="text-xs rounded-2xl px-3 py-2 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40 text-slate-200"
                  onClick={() => {}}
                  title="CTA (wire later)"
                >
                  {x.cta || "Open"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}