// src/pages/SboDashboard.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";
import NewsReel from "../components/NewsReel";
import TodoList from "../components/TodoList";
import NotificationsPanel from "../components/NotificationsPanel";
import CalendarAgenda from "../components/CalendarAgenda";
import { useAuth } from "../auth/AuthContext";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "tickets", label: "Tickets" },
  { id: "marketplace", label: "Marketplace" },
  { id: "team", label: "Team" },
  { id: "schedule", label: "Schedule" },
  { id: "inbox", label: "Inbox" },
  { id: "settings", label: "Settings" },
];

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Card({ title, subtitle, right, children }) {
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

function MiniKpi({ label, value, tone = "slate" }) {
  const toneCls =
    tone === "cyan"
      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-100"
      : tone === "fuchsia"
      ? "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-100"
      : tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
      : tone === "amber"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
      : tone === "rose"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-100"
      : "border-slate-800 bg-slate-950/50 text-slate-100";

  return (
    <div className={cx("rounded-2xl border p-4", toneCls)}>
      <div className="text-[11px] text-slate-300/80">{label}</div>
      <div className="mt-1 text-lg font-extrabold tracking-tight">{value}</div>
    </div>
  );
}

function TabBtn({ active, children, onClick, disabled, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!!disabled}
      title={title}
      className={cx(
        "text-xs rounded-2xl px-3 py-2 border transition",
        active
          ? "bg-fuchsia-500/15 border-fuchsia-500/35 text-fuchsia-200 shadow-[0_0_30px_rgba(217,70,239,0.12)]"
          : "bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40 text-slate-200",
        disabled ? "opacity-50 cursor-not-allowed hover:bg-slate-950/60" : ""
      )}
    >
      {children}
    </button>
  );
}

function Pill({ tone = "slate", children }) {
  const cls =
    tone === "rose"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
      : tone === "amber"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
      : tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : tone === "cyan"
      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
      : "border-slate-800 bg-slate-950/50 text-slate-200";

  return <span className={cx("inline-flex items-center rounded-full border px-2 py-1 text-[11px]", cls)}>{children}</span>;
}

function Modal({ open, onClose, title, subtitle, children }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130]">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-950/92 backdrop-blur p-6 shadow-[0_0_90px_rgba(0,0,0,0.55)] relative overflow-hidden">
          <div className="pointer-events-none absolute -inset-20 blur-3xl bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-fuchsia-500/10" />
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-lg font-extrabold text-slate-100">{title}</div>
                {subtitle ? <div className="text-xs text-slate-400 mt-1">{subtitle}</div> : null}
              </div>
              <button
                onClick={onClose}
                className="h-10 w-10 rounded-2xl border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40 text-slate-200"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-5">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Small top-right Stripe button:
 */
function StripeMiniButton({ stripeOk, stripeHasAccount, onClick, busy }) {
  const connectedCls = "bg-emerald-500/15 border-emerald-500/40 text-emerald-200";
  const warnCls = "bg-amber-500/15 border-amber-500/40 text-amber-200";
  const offCls = "bg-rose-500/15 border-rose-500/40 text-rose-200";

  const cls = stripeOk ? connectedCls : stripeHasAccount ? warnCls : offCls;
  const label = stripeOk ? "Payment Connected" : stripeHasAccount ? "Stripe Needs Info" : "Connect Stripe";

  return (
    <div className="relative">
      {!stripeOk ? (
        <div className="absolute -top-8 right-0 pointer-events-none">
          <div className="text-[10px] text-slate-200 bg-cyan-500/10 border border-cyan-500/30 rounded-full px-2 py-1 shadow-[0_0_30px_rgba(34,211,238,0.18)]">
            click here to connect stripe ✨
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className={cx(
          "text-[11px] rounded-full px-3 py-2 border transition font-semibold",
          cls,
          busy ? "opacity-60 cursor-not-allowed" : "hover:brightness-110"
        )}
        title={stripeOk ? "Stripe is connected" : "Click to connect/finish Stripe onboarding"}
      >
        {busy ? "Opening…" : label}
      </button>
    </div>
  );
}

function ZipRankPill({ zip, rank, total, scoreLabel, busy, onRefresh }) {
  const hasData = Boolean(zip && total);
  const toneCls = hasData
    ? "bg-indigo-500/15 border-indigo-500/35 text-indigo-200"
    : "bg-slate-950/60 border-slate-800 text-slate-200";

  const main = busy ? "ZIP Rank: …" : hasData ? `ZIP ${zip} • #${rank}/${total}` : "ZIP Rank";
  const sub = busy ? "Loading…" : hasData ? scoreLabel : "No data";

  return (
    <button
      type="button"
      onClick={onRefresh}
      className={cx("rounded-full border px-3 py-2 text-[11px] font-semibold transition hover:brightness-110", toneCls, busy ? "opacity-70 cursor-wait" : "")}
      title={hasData ? "Your rank vs other businesses in this ZIP. Click to refresh." : "Click to load ZIP rank."}
    >
      <span className="mr-2">🏁</span>
      <span>{main}</span>
      <span className="ml-2 text-[10px] opacity-80">{sub}</span>
    </button>
  );
}

function fmtMoneyCents(cents, currency = "USD") {
  const n = Number(cents || 0) / 100.0;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: String(currency || "USD").toUpperCase() }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}
function fmtShortDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString();
}

export default function SboDashboard() {
  const navigate = useNavigate();
  const { activeBusinessId } = useAuth();

  const [tab, setTab] = useState("overview");

  const [billing, setBilling] = useState(null);
  const [stripeConnect, setStripeConnect] = useState(null);

  const [zipMetrics, setZipMetrics] = useState(null);
  const [zipBusy, setZipBusy] = useState(false);

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const [kpis, setKpis] = useState({
    openTickets: "—",
    marketplaceOpen: "—",
    scheduled7d: "—",
    revenueMtd: "—",
  });

  // ✅ lock UX
  const locked = !!billing?.is_locked;
  const lockReason = billing?.lock_reason || "LOCKED";
  const [lockModalOpen, setLockModalOpen] = useState(false);

  // ✅ cash fee invoices (read-only)
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const [invoiceErr, setInvoiceErr] = useState("");
  const [cashInvoices, setCashInvoices] = useState([]);

  const stripeOk = useMemo(() => {
    const s = stripeConnect || {};
    return Boolean(s.connected && s.onboarding_completed && s.charges_enabled && s.payouts_enabled);
  }, [stripeConnect]);

  const stripeHasAccount = useMemo(() => {
    const s = stripeConnect || {};
    return Boolean(s.connected || s.stripe_connect_account_id);
  }, [stripeConnect]);

  const bizId = useMemo(() => String(activeBusinessId || "").trim(), [activeBusinessId]);

  const loadBilling = useCallback(async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await api.get("/billing/status/");
      setBilling(res.data || null);
    } catch (e) {
      setBilling(null);
      setErr(e?.response?.data?.detail || "Failed to load billing status");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStripeConnectStatus = useCallback(async () => {
    try {
      const res = await api.get("/connect/express/status/");
      setStripeConnect(res.data || null);
    } catch {
      setStripeConnect(null);
    }
  }, []);

  const loadCashFeeInvoices = useCallback(async () => {
    setInvoiceErr("");
    setInvoiceBusy(true);
    try {
      const q = bizId ? `?business_id=${encodeURIComponent(bizId)}` : "";
      const res = await api.get(`/cash-fee-invoices/${q}`);
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setCashInvoices(list);
    } catch (e) {
      setCashInvoices([]);
      setInvoiceErr(e?.response?.data?.detail || "Failed to load cash fee invoices.");
    } finally {
      setInvoiceBusy(false);
    }
  }, [bizId]);

  const submitUnlockRequest = useCallback(async (message) => {
    setInvoiceErr("");
    try {
      // backend likely expects {} or {message}; send message safely
      await api.post("/billing/unlock-request/", message ? { message } : {});
      return true;
    } catch (e) {
      setInvoiceErr(e?.response?.data?.detail || "Failed to submit unlock request.");
      return false;
    }
  }, []);

  const openSetupCard = useCallback(async () => {
    setInvoiceErr("");
    try {
      let res = null;
      try {
        res = await api.post("/billing/setup-card/", {});
      } catch {
        res = await api.get("/billing/setup-card/");
      }
      const url = res?.data?.url || res?.data?.checkout_url || res?.data?.checkoutUrl;
      if (url) {
        window.location.href = url;
        return;
      }
      setInvoiceErr("No Stripe checkout URL returned from /billing/setup-card/.");
    } catch (e) {
      setInvoiceErr(e?.response?.data?.detail || "Failed to open card setup.");
    }
  }, []);

  const loadKpis = useCallback(async () => {
    try {
      const mine = await api.get("/tickets/");
      const list = Array.isArray(mine.data) ? mine.data : mine.data?.results || [];
      const upper = (x) => String(x || "").toUpperCase();

      const open = list.filter((t) => !["COMPLETED", "PAID", "CLOSED", "CANCELLED"].includes(upper(t?.status)));
      const active = list.filter((t) =>
        ["ACCEPTED", "SCHEDULED", "EN_ROUTE", "ON_SITE", "IN_PROGRESS"].includes(upper(t?.status))
      );

      // Marketplace is blocked while locked — don't call it (prevents 423 spam)
      let marketplaceOpen = "—";
      if (!locked) {
        try {
          const mp = await api.get("/tickets/marketplace/");
          const mpl = Array.isArray(mp.data) ? mp.data : mp.data?.results || [];
          marketplaceOpen = String(mpl.length);
        } catch {
          marketplaceOpen = "—";
        }
      } else {
        marketplaceOpen = "Locked";
      }

      setKpis({
        openTickets: String(open.length),
        marketplaceOpen: String(marketplaceOpen),
        scheduled7d: String(active.length),
        revenueMtd: "—",
      });
    } catch {
      // ignore KPI errors
    }
  }, [locked]);

  const loadZipMetrics = useCallback(async () => {
    setZipBusy(true);
    try {
      const res = await api.get("/tickets/metrics/zip/");
      setZipMetrics(res.data || null);
    } catch {
      setZipMetrics(null);
    } finally {
      setZipBusy(false);
    }
  }, []);

  async function startStripeConnect() {
    setErr("");
    setConnecting(true);
    try {
      const res = await api.post("/connect/express/start/", {});
      if (res?.data?.url) {
        window.location.href = res.data.url;
        return;
      }
      setErr("No Stripe onboarding URL returned.");
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to start Stripe Connect onboarding");
    } finally {
      setConnecting(false);
    }
  }

  const zipRank = useMemo(() => {
    const zip = zipMetrics?.zip || "";
    const my = zipMetrics?.my || null;
    const lb = Array.isArray(zipMetrics?.leaderboard) ? zipMetrics.leaderboard : [];

    if (!my || !my.business_id) return { zip, rank: null, total: null, scoreLabel: "" };

    const all = [
      {
        business_id: my.business_id,
        business_name: my.business_name || "My Business",
        avg_response_min_30d: my.avg_response_min_30d,
        completion_rate_60d: my.completion_rate_60d,
        accept_count_30d: my.accept_count_30d,
        fast_accept_10m_30d: my.fast_accept_10m_30d,
        jobs_completed_30d: my.jobs_completed_30d,
      },
      ...lb,
    ];

    const safeNum = (x, d = 0) => {
      const n = Number(x);
      return Number.isFinite(n) ? n : d;
    };

    const response = (row) => {
      const v = safeNum(row.avg_response_min_30d, 999999);
      return v <= 0 ? 999999 : v;
    };

    const score = (row) => {
      const vol = safeNum(row.accept_count_30d, 0);
      const comp = safeNum(row.completion_rate_60d, 0);
      const fast = safeNum(row.fast_accept_10m_30d, 0);
      const resp = response(row);
      return vol * 1.0 + comp * 50.0 + fast * 0.5 - resp * 0.2;
    };

    const scored = all.map((r) => ({ ...r, __score: score(r) })).sort((a, b) => b.__score - a.__score);

    const total = scored.length;
    const idx = scored.findIndex((r) => String(r.business_id) === String(my.business_id));
    const rank = idx >= 0 ? idx + 1 : null;

    const scoreLabel = `30d: ${safeNum(my.accept_count_30d)} accepts • ${Math.round(safeNum(my.completion_rate_60d) * 100)}% complete`;

    return { zip, rank, total, scoreLabel };
  }, [zipMetrics]);

  useEffect(() => {
    loadBilling();
    loadKpis();
    loadStripeConnectStatus();
    loadZipMetrics();
  }, [loadBilling, loadKpis, loadStripeConnectStatus, loadZipMetrics]);

  useEffect(() => {
    function onBizChanged() {
      loadBilling();
      loadKpis();
      loadStripeConnectStatus();
      loadZipMetrics();
      // keep invoices fresh when business changes if modal is open
      if (lockModalOpen) loadCashFeeInvoices();
    }
    window.addEventListener("sw:activeBusinessChanged", onBizChanged);
    return () => window.removeEventListener("sw:activeBusinessChanged", onBizChanged);
  }, [loadBilling, loadKpis, loadStripeConnectStatus, loadZipMetrics, lockModalOpen, loadCashFeeInvoices]);

  // If API emits a global lock event (from api client interceptor), open the modal immediately
  useEffect(() => {
    function onLocked() {
      setLockModalOpen(true);
    }
    window.addEventListener("sw:billingLocked", onLocked);
    return () => window.removeEventListener("sw:billingLocked", onLocked);
  }, []);

  // Auto-open modal when newly locked (first render / business change)
  useEffect(() => {
    if (locked) setLockModalOpen(true);
  }, [locked]);

  function go(id) {
    if (id === "overview") {
      setTab("overview");
      return;
    }
    if (id === "tickets") return navigate("/tickets?view=my");

    // Marketplace routes to tickets board currently — block it when locked
    if (id === "marketplace") {
      if (locked) {
        setLockModalOpen(true);
        return;
      }
      return navigate("/tickets?view=marketplace");
    }

    if (id === "team") return navigate("/team/invites");
    if (id === "schedule") return navigate("/calendar");
    if (id === "inbox") return navigate("/inbox");
    if (id === "settings") return navigate("/upgrade");
  }

  async function refreshAll() {
    await Promise.allSettled([loadBilling(), loadKpis(), loadStripeConnectStatus(), loadZipMetrics()]);
    if (lockModalOpen) loadCashFeeInvoices();
  }

  async function openLockModalAndLoad() {
    setLockModalOpen(true);
    await loadCashFeeInvoices();
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="CEO / SBO Dashboard"
        subtitle="Tickets • Marketplace • Team • Schedule • Inbox"
        rightActions={
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/upgrade"
              className="text-xs rounded-2xl px-3 py-2 bg-indigo-500/20 border border-indigo-500/40 hover:bg-indigo-500/30"
              title="Create another business"
            >
              + Create business
            </Link>

            <Link
              to="/sales?create=1"
              className="text-xs rounded-2xl px-3 py-2 bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-200"
              title="Create a Sales Pipeline (Sales OS)"
            >
              + Create Sales Pipeline
            </Link>

            <button
              type="button"
              onClick={() => navigate("/upgrade")}
              className="text-xs rounded-2xl px-3 py-2 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40"
              title="Business settings"
            >
              Settings
            </button>
          </div>
        }
      />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <NewsReel />

        {err ? (
          <div className="text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-2xl p-3">{err}</div>
        ) : null}

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap items-center">
          {TABS.map((t) => {
            const isMarketplace = t.id === "marketplace";
            const disabled = isMarketplace && locked;
            const tip = disabled ? "Marketplace is blocked while billing is locked. Click to fix billing." : t.label;
            return (
              <TabBtn
                key={t.id}
                active={tab === t.id}
                disabled={disabled}
                title={tip}
                onClick={() => (t.id === "overview" ? setTab("overview") : go(t.id))}
              >
                {t.label}
              </TabBtn>
            );
          })}

          <button
            onClick={refreshAll}
            className="ml-auto text-xs rounded-2xl px-3 py-2 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40"
            disabled={loading}
            title="Reload for the active business"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Compact lock banner */}
        {locked ? (
          <div className="rounded-3xl border border-rose-500/35 bg-rose-500/10 p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="text-base font-extrabold text-rose-100">Account Locked</div>
                <div className="text-xs text-rose-200/90 mt-1">
                  Reason: <b className="font-mono">{lockReason}</b>
                </div>
                <div className="text-xs text-slate-300 mt-2">
                  Marketplace actions are disabled until billing is updated. Cash fee invoices remain readable.
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={openLockModalAndLoad}
                  className="rounded-2xl px-4 py-2 text-sm font-semibold border border-cyan-500/35 bg-cyan-500/12 hover:bg-cyan-500/18 text-cyan-200"
                >
                  Fix Billing
                </button>
                <Link
                  to="/billing/cash-fee-invoices"
                  className="rounded-2xl px-4 py-2 text-sm border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40"
                >
                  View Invoices
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {/* OVERVIEW */}
        {tab === "overview" ? (
          <div className="space-y-4">
            {/* CEO Hub */}
            <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-lg font-extrabold">CEO Hub</div>
                  <div className="text-sm text-slate-400 mt-1">
                    Marketplace queue is driven by ZIP + service categories. Favorites can route directly to a chosen SBO.
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2">
                    Active business: <span className="font-mono text-slate-200">{activeBusinessId || "auto"}</span>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap items-center">
                  <button
                    onClick={() => navigate("/tickets?view=my")}
                    className="text-xs rounded-2xl px-3 py-2 bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-200"
                  >
                    Tickets
                  </button>

                  <button
                    onClick={() => (locked ? setLockModalOpen(true) : navigate("/tickets?view=marketplace"))}
                    className={cx(
                      "text-xs rounded-2xl px-3 py-2 border transition",
                      locked
                        ? "bg-slate-950/60 border-slate-800 text-slate-400 cursor-not-allowed"
                        : "bg-fuchsia-500/15 border border-fuchsia-500/35 hover:bg-fuchsia-500/20 text-fuchsia-200"
                    )}
                    title={locked ? "Marketplace locked — fix billing first" : "Open Marketplace"}
                    disabled={locked}
                  >
                    Marketplace
                  </button>

                  <button
                    onClick={() => navigate("/team/invites")}
                    className="text-xs rounded-2xl px-3 py-2 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40 text-slate-200"
                  >
                    Team
                  </button>

                  <ZipRankPill
                    zip={zipRank.zip}
                    rank={zipRank.rank || "—"}
                    total={zipRank.total || ""}
                    scoreLabel={zipRank.scoreLabel || ""}
                    busy={zipBusy}
                    onRefresh={loadZipMetrics}
                  />

                  <StripeMiniButton
                    stripeOk={stripeOk}
                    stripeHasAccount={stripeHasAccount}
                    onClick={() => {
                      if (stripeOk) return loadStripeConnectStatus();
                      return startStripeConnect();
                    }}
                    busy={connecting}
                  />
                </div>
              </div>
            </div>

            {/* KPI row */}
            <div className="grid md:grid-cols-4 gap-3">
              <MiniKpi label="Open Tickets" value={kpis.openTickets} tone="cyan" />
              <MiniKpi label="Marketplace Queue" value={kpis.marketplaceOpen} tone="fuchsia" />
              <MiniKpi label="Scheduled (7d)" value={kpis.scheduled7d} tone="amber" />
              <MiniKpi label="Revenue (MTD)" value={kpis.revenueMtd} tone="emerald" />
            </div>

            {/* BIG Stripe card only when not ready */}
            {!stripeOk ? (
              <Card
                title="Stripe Connect (Get Paid)"
                subtitle="Customers pay by card — they do NOT need Stripe. You must connect Stripe so SyncWorks can route payouts to your bank."
                right={
                  <button
                    onClick={loadStripeConnectStatus}
                    className="text-xs rounded-2xl px-3 py-2 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40"
                    type="button"
                    title="Refresh Stripe status"
                  >
                    Refresh
                  </button>
                }
              >
                <div className="grid sm:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                    <div className="text-xs text-slate-400">Connected account</div>
                    <div className="mt-1 font-semibold">{stripeConnect?.stripe_connect_account_id ? "Yes ✅" : "No ❌"}</div>
                    <div className="text-[11px] text-slate-500 mt-1 truncate">{stripeConnect?.stripe_connect_account_id || "—"}</div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                    <div className="text-xs text-slate-400">Charges enabled</div>
                    <div className="mt-1 font-semibold">{stripeConnect?.charges_enabled ? "Yes ✅" : "No"}</div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                    <div className="text-xs text-slate-400">Payouts enabled</div>
                    <div className="mt-1 font-semibold">{stripeConnect?.payouts_enabled ? "Yes ✅" : "No"}</div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">
                  <div className="font-semibold">Action required</div>
                  <div className="text-[12px] text-cyan-100/90 mt-1">
                    Click the button below to connect Stripe and finish onboarding. Once complete, payouts go to your bank automatically.
                  </div>
                </div>

                <div className="mt-4 flex gap-2 flex-wrap items-center">
                  <button
                    onClick={startStripeConnect}
                    disabled={connecting}
                    className={
                      "rounded-2xl px-5 py-3 text-sm font-semibold border transition " +
                      (connecting
                        ? "bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed"
                        : "bg-cyan-500/20 border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,0.15)]")
                    }
                    type="button"
                  >
                    {connecting ? "Opening Stripe…" : "Connect Stripe Now →"}
                  </button>

                  <div className="text-xs text-slate-500">Needed so invoice payments can be routed to your business automatically.</div>
                </div>
              </Card>
            ) : null}

            {/* Rest */}
            <div className="grid xl:grid-cols-3 gap-4">
              <Card title="CEO Sticky Notes" subtitle="Quick notepad. Check it off and it disappears.">
                <TodoList scope="sbo" title="CEO Sticky Notes" subtitle="Text • Priority • Due date" />
              </Card>

              <div className="xl:col-span-2 space-y-4">
                <Card
                  title="Schedule"
                  subtitle="Upcoming ticket activity."
                  right={
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate("/calendar")}
                        className="text-xs rounded-2xl px-3 py-2 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40"
                      >
                        Calendar
                      </button>
                      <button
                        onClick={() => navigate("/tickets?view=my")}
                        className="text-xs rounded-2xl px-3 py-2 bg-fuchsia-500/15 border border-fuchsia-500/35 hover:bg-fuchsia-500/20 text-fuchsia-200"
                      >
                        My Tickets
                      </button>
                    </div>
                  }
                >
                  <CalendarAgenda modeLabel="Agenda" />
                </Card>

                <Card
                  title="Inbox (Snapshot)"
                  subtitle="Ticket notes, assignments, and platform broadcasts."
                  right={
                    <button
                      onClick={() => navigate("/inbox")}
                      className="text-xs rounded-2xl px-3 py-2 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40"
                    >
                      View all
                    </button>
                  }
                >
                  <NotificationsPanel title="Inbox" subtitle="Latest activity." />
                </Card>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* ✅ Lock Modal (Fix Billing) */}
      <Modal
        open={lockModalOpen && locked}
        onClose={() => setLockModalOpen(false)}
        title="Account Locked"
        subtitle={`Reason: ${lockReason} • Marketplace blocked until billing is updated`}
      >
        <div className="space-y-4">
          {invoiceErr ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">{invoiceErr}</div>
          ) : null}

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={openSetupCard}
              className="rounded-2xl px-4 py-2 text-sm font-semibold border border-cyan-500/35 bg-cyan-500/12 hover:bg-cyan-500/18 text-cyan-200"
            >
              Add/Update Card
            </button>

            <button
              type="button"
              onClick={async () => {
                // Minimal request payload for production
                const ok = await submitUnlockRequest(`Request unlock for business ${bizId || "—"}. I have updated billing/payment method.`);
                if (ok) {
                  setInvoiceErr("");
                }
              }}
              className="rounded-2xl px-4 py-2 text-sm font-semibold border border-fuchsia-500/35 bg-fuchsia-500/12 hover:bg-fuchsia-500/18 text-fuchsia-200"
            >
              Submit Unlock Request
            </button>

            <button
              type="button"
              onClick={async () => {
                await loadBilling();
                await loadCashFeeInvoices();
              }}
              className="rounded-2xl px-4 py-2 text-sm border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40"
            >
              Refresh
            </button>

            <Link
              to="/billing/cash-fee-invoices"
              className="rounded-2xl px-4 py-2 text-sm border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40"
              onClick={() => setLockModalOpen(false)}
            >
              Open Invoice Page →
            </Link>
          </div>

          {/* Invoices list */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="text-sm font-semibold text-slate-100">Cash Fee Invoices</div>
                <div className="text-xs text-slate-400 mt-1">
                  Read-only • Business ID: <span className="font-mono text-slate-200">{bizId || "—"}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={loadCashFeeInvoices}
                disabled={invoiceBusy}
                className={cx(
                  "rounded-2xl px-4 py-2 text-sm border transition",
                  "border-slate-800 bg-slate-950/60 hover:bg-slate-900/40",
                  invoiceBusy ? "opacity-60 cursor-wait" : ""
                )}
              >
                {invoiceBusy ? "Loading…" : "Reload"}
              </button>
            </div>

            <div className="mt-3 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400">
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Amount</th>
                    <th className="py-2 pr-3">Period</th>
                    <th className="py-2 pr-3">Due</th>
                    <th className="py-2 pr-3">Memo</th>
                  </tr>
                </thead>
                <tbody>
                  {!invoiceBusy && (!cashInvoices || cashInvoices.length === 0) ? (
                    <tr>
                      <td className="py-3 text-slate-300" colSpan={5}>
                        No invoices found.
                      </td>
                    </tr>
                  ) : null}

                  {(cashInvoices || []).map((inv) => {
                    const status = String(inv?.status || "").toUpperCase() || "—";
                    const tone = status === "OVERDUE" ? "rose" : status === "OPEN" ? "amber" : status === "PAID" ? "emerald" : "slate";
                    const amount = fmtMoneyCents(inv?.amount_cents, inv?.currency || "USD");
                    const period = `${fmtShortDate(inv?.period_start)} → ${fmtShortDate(inv?.period_end)}`;
                    const due = fmtShortDate(inv?.due_date);
                    const memo = inv?.memo || inv?.note || inv?.description || "—";

                    return (
                      <tr key={inv?.id} className="border-t border-slate-800/70">
                        <td className="py-3 pr-3">
                          <Pill tone={tone}>{status}</Pill>
                        </td>
                        <td className="py-3 pr-3 font-semibold text-slate-100">{amount}</td>
                        <td className="py-3 pr-3 text-slate-200">{period}</td>
                        <td className="py-3 pr-3 text-slate-200">{due}</td>
                        <td className="py-3 pr-3 text-slate-300 max-w-[420px]">
                          <div className="truncate" title={String(memo)}>
                            {String(memo)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-3 text-xs text-slate-500">
              Marketplace is ZIP + service-category routed (and can later support “favorite vendor direct routing”).
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}