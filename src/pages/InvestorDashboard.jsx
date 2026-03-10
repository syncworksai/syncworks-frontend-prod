// src/pages/InvestorDashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";
import Button from "../components/ui/Button";

import InvestorInbox from "../components/investor/InvestorInbox";

function Pill({ children, tone = "slate" }) {
  const cls =
    tone === "purple"
      ? "border-fuchsia-500/40 text-fuchsia-200 bg-fuchsia-500/10"
      : tone === "cyan"
      ? "border-cyan-500/40 text-cyan-200 bg-cyan-500/10"
      : tone === "emerald"
      ? "border-emerald-500/40 text-emerald-200 bg-emerald-500/10"
      : tone === "amber"
      ? "border-amber-500/40 text-amber-200 bg-amber-500/10"
      : tone === "rose"
      ? "border-rose-500/40 text-rose-200 bg-rose-500/10"
      : "border-slate-700 text-slate-300 bg-slate-950/40";

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full border text-[11px] ${cls}`}>
      {children}
    </span>
  );
}

function Card({ title, subtitle, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3">
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

export default function InvestorDashboard() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  async function loadDashboard() {
    setLoading(true);
    setErr("");
    try {
      const r = await api.get("/investor/dashboard/");
      setData(r.data);
    } catch (e) {
      setData(null);
      setErr(e?.response?.data?.detail || e?.message || "Failed to load investor dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="Investor"
        subtitle="Your portfolio view • Updates • PM Inbox"
        rightActions={
          <div className="flex gap-2 flex-wrap">
            <Button tone="slate" onClick={loadDashboard} disabled={loading}>
              Refresh
            </Button>
            <Button tone="slate" onClick={() => nav("/customer")}>
              Home
            </Button>
          </div>
        }
      />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {/* hero */}
        <div className="rounded-[28px] border border-slate-800 bg-slate-950/35 p-6 overflow-hidden relative">
          <div className="pointer-events-none absolute inset-0 opacity-70">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
            <div className="absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
          </div>

          <div className="relative flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-[260px]">
              <div className="text-xs text-slate-400 tracking-widest">INVESTOR PORTAL</div>
              <div className="text-2xl font-extrabold">Portfolio Hub</div>
              <div className="text-sm text-slate-300 mt-1">
                See what matters: property performance, updates, and direct messages with your PM.
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Pill tone="cyan">One login • Role-based access</Pill>
              <Pill tone="purple">Inbox inside dashboard</Pill>
              <Pill tone="emerald">Professional view</Pill>
            </div>
          </div>
        </div>

        {err ? (
          <div className="text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-2xl p-3">
            {err}
            <div className="mt-2 text-xs text-slate-300">
              If this says your investor is not linked, you must claim your profile using the connect code.
            </div>
          </div>
        ) : null}

        {/* quick stats */}
        <div className="grid md:grid-cols-3 gap-3">
          <Card title="Properties Linked" subtitle="Properties assigned to you by a PM" right={<Pill tone="cyan">Live</Pill>}>
            <div className="text-3xl font-semibold">
              {data?.properties ? String(data.properties.length) : loading ? "…" : "0"}
            </div>
            <div className="text-xs text-slate-500 mt-1">This comes from /investor/dashboard/</div>
          </Card>

          <Card title="Open Items" subtitle="Work orders / notices (future rollup)" right={<Pill tone="cyan">Queued</Pill>}>
            <div className="text-3xl font-semibold">—</div>
            <div className="text-xs text-slate-500 mt-1">Next: investor rollups (repairs, expenses, approvals).</div>
          </Card>

          <Card title="Statements" subtitle="Monthly statements (future)" right={<Pill tone="cyan">Queued</Pill>}>
            <div className="text-3xl font-semibold">—</div>
            <div className="text-xs text-slate-500 mt-1">Next: statement list + PDF export.</div>
          </Card>
        </div>

        {/* inbox (core build) */}
        <InvestorInbox />

        {/* properties list (light + clean) */}
        <Card title="Your Properties" subtitle="Read-only portfolio list (from investor dashboard endpoint)">
          {loading ? (
            <div className="text-sm text-slate-400">Loading…</div>
          ) : (data?.properties || []).length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-300">
              No properties linked yet. Once the PM links you to a property, it shows here and a thread appears in the Inbox.
            </div>
          ) : (
            <div className="space-y-2">
              {data.properties.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-100 truncate">{p.name || `Property #${p.id}`}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {p.city ? `${p.city}, ` : ""}{p.state || ""} {p.zip || ""}
                    </div>
                  </div>
                  <div className="shrink-0 flex gap-2 items-center">
                    <Pill tone="emerald">Linked</Pill>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="text-[11px] text-slate-500">
          Investor is external to the PM company: role-based access only. PM tools stay in PM hub. Inbox lives here.
        </div>
      </main>
    </div>
  );
}
