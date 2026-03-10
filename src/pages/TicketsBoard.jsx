// src/pages/TicketsBoard.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";
import { useAuth } from "../auth/AuthContext";

function cx(...p) {
  return p.filter(Boolean).join(" ");
}

function safeResults(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

const STATUSES = [
  "NEW",
  "ASSIGNED",
  "ACCEPTED",
  "SCHEDULED",
  "EN_ROUTE",
  "ON_SITE",
  "IN_PROGRESS",
  "AWAITING_APPROVAL",
  "COMPLETED",
  "INVOICED",
  "PAID",
  "CANCELLED",
];

function isAssigned(t) {
  return !!(t?.assigned_business || t?.assigned_business_id || t?.business || t?.business_id);
}

function isMarketplace(t) {
  return !!t?.is_marketplace;
}

function statusTone(s) {
  const u = String(s || "").toUpperCase();
  if (["PAID"].includes(u)) return "emerald";
  if (["COMPLETED", "INVOICED"].includes(u)) return "cyan";
  if (["CANCELLED"].includes(u)) return "rose";
  if (["IN_PROGRESS", "ON_SITE", "EN_ROUTE"].includes(u)) return "amber";
  if (["SCHEDULED", "ACCEPTED"].includes(u)) return "fuchsia";
  return "slate";
}

function Pill({ children, tone = "slate" }) {
  const m = {
    slate: "border-slate-800 bg-slate-950/40 text-slate-200",
    cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
    fuchsia: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  };
  return (
    <span className={cx("inline-flex items-center px-2 py-1 rounded-full border text-[11px] font-semibold", m[tone] || m.slate)}>
      {children}
    </span>
  );
}

function SmallBtn({ children, tone = "slate", className = "", ...props }) {
  const tones = {
    slate: "bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-200",
    cyan: "bg-cyan-500/15 border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-200",
    rose: "bg-rose-500/15 border-rose-500/30 hover:bg-rose-500/20 text-rose-200",
    fuchsia: "bg-fuchsia-500/15 border-fuchsia-500/30 hover:bg-fuchsia-500/20 text-fuchsia-200",
    emerald: "bg-emerald-500/15 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-200",
    amber: "bg-amber-500/15 border-amber-500/30 hover:bg-amber-500/20 text-amber-200",
  };
  return (
    <button
      className={cx(
        "h-9 px-3 rounded-xl border text-[11px] font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed",
        tones[tone] || tones.slate,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function FieldLabel({ children }) {
  return <div className="text-[11px] text-slate-500 mb-1">{children}</div>;
}

// Detects your lock response shape from backend
function parseLockError(e) {
  const d = e?.response?.data;
  const status = e?.response?.status;

  const detail = typeof d?.detail === "string" ? d.detail : "";
  const lock_reason = d?.lock_reason || d?.lockReason || null;
  const business_id = d?.business_id || d?.businessId || null;

  const looksLocked =
    status === 423 ||
    (typeof detail === "string" && detail.toLowerCase().includes("locked")) ||
    !!lock_reason;

  if (!looksLocked) return null;

  return {
    locked: true,
    lock_reason: lock_reason || "LOCKED",
    business_id: business_id || null,
    detail: detail || "Business account is locked. Update billing or submit an unlock request.",
  };
}

export default function TicketsBoard() {
  const nav = useNavigate();
  const { mode, activeBusinessId } = useAuth();
  const [params, setParams] = useSearchParams();

  const isCustomer = mode === "CUSTOMER";
  const isSboLike = mode === "SBO" || mode === "EMPLOYEE" || mode === "PROPERTY_MGR" || mode === "PM";

  const view = params.get("view") || "all"; // all | my | marketplace

  // viewMode: table | board | queue
  const defaultViewMode = view === "marketplace" ? "queue" : "table";
  const [viewMode, setViewMode] = useState(defaultViewMode);

  useEffect(() => {
    setViewMode(view === "marketplace" ? "queue" : "table");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // ✅ billing lock state (local to this page)
  const [billing, setBilling] = useState(null);
  const locked = !!billing?.is_locked;
  const lockReason = billing?.lock_reason || "LOCKED";

  // filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [source, setSource] = useState("ALL"); // ALL | DIRECT | MARKETPLACE
  const [assigned, setAssigned] = useState("ALL"); // ALL | ASSIGNED | UNASSIGNED
  const [sort, setSort] = useState("NEWEST"); // NEWEST | OLDEST
  const [actingId, setActingId] = useState(null);

  const bizId = useMemo(() => String(activeBusinessId || "").trim(), [activeBusinessId]);

  function setView(next) {
    setParams((p) => {
      p.set("view", next);
      return p;
    });
  }

  function goCreate() {
    if (isCustomer) nav("/customer/new-request");
    else nav("/tickets/new");
  }

  const loadBilling = useCallback(async () => {
    try {
      const res = await api.get("/billing/status/");
      setBilling(res.data || null);
    } catch {
      setBilling(null);
    }
  }, []);

  const openSetupCard = useCallback(async () => {
    setErr("");
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
      setErr("No Stripe checkout URL returned from /billing/setup-card/.");
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to open card setup.");
    }
  }, []);

  const submitUnlockRequest = useCallback(async () => {
    setErr("");
    try {
      await api.post("/billing/unlock-request/", {
        message: `Unlock request from TicketsBoard. Business ${bizId || "—"} is locked (${lockReason}). Billing updated / requesting review.`,
      });
      // keep it simple: user can refresh billing
      await loadBilling();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to submit unlock request.");
    }
  }, [bizId, lockReason, loadBilling]);

  async function acceptMarketplace(ticketId) {
    setErr("");
    setActingId(ticketId);
    try {
      await api.post(`/tickets/${ticketId}/accept/`);
      await load();
    } catch (e) {
      const lock = parseLockError(e);
      if (lock) {
        await loadBilling();
        setErr(lock.detail);
        window.dispatchEvent(new CustomEvent("sw:billingLocked", { detail: lock }));
      } else {
        setErr(e?.response?.data?.detail || "Accept failed");
      }
    } finally {
      setActingId(null);
    }
  }

  async function declineMarketplace(ticketId) {
    setErr("");
    setActingId(ticketId);
    try {
      await api.post(`/tickets/${ticketId}/decline_marketplace/`);
      await load();
    } catch (e) {
      const lock = parseLockError(e);
      if (lock) {
        await loadBilling();
        setErr(lock.detail);
        window.dispatchEvent(new CustomEvent("sw:billingLocked", { detail: lock }));
      } else {
        setErr(e?.response?.data?.detail || "Decline failed");
      }
    } finally {
      setActingId(null);
    }
  }

  async function load() {
    setErr("");
    setLoading(true);

    try {
      // ✅ Always refresh billing first when SBO-like and especially when trying marketplace
      if (!isCustomer && isSboLike) {
        await loadBilling();
      }

      // ✅ IMPORTANT: do NOT call marketplace endpoint if locked
      if (!isCustomer && isSboLike && view === "marketplace") {
        const latestLocked = !!(billing?.is_locked);
        if (latestLocked) {
          setItems([]);
          setErr("Marketplace is blocked while your business is locked. Fix billing to continue.");
          setLoading(false);
          return;
        }
      }

      let url = "/tickets/";
      if (!isCustomer && isSboLike && view === "marketplace") url = "/tickets/marketplace/";

      const res = await api.get(url);
      setItems(safeResults(res.data));
    } catch (e) {
      setItems([]);

      const lock = parseLockError(e);
      if (lock) {
        // ✅ Pull full billing status so lock_reason is consistent everywhere
        await loadBilling();
        setErr(lock.detail);
        window.dispatchEvent(new CustomEvent("sw:billingLocked", { detail: lock }));
      } else {
        setErr(e?.response?.data?.detail || "Failed to load tickets");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    function onBizChanged() {
      load();
    }
    window.addEventListener("sw:activeBusinessChanged", onBizChanged);
    return () => window.removeEventListener("sw:activeBusinessChanged", onBizChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, mode]);

  const filtered = useMemo(() => {
    const text = (q || "").trim().toLowerCase();
    let list = [...(items || [])];

    // server already returns marketplace set when /marketplace/ but keep logic safe
    if (!isCustomer && isSboLike) {
      if (view === "my") list = list.filter((t) => isAssigned(t));
      if (view === "marketplace") list = list.filter((t) => isMarketplace(t) && !isAssigned(t));
    }

    if (status !== "ALL") {
      list = list.filter((t) => String(t?.status || "").toUpperCase() === status);
    }

    if (source === "DIRECT") list = list.filter((t) => !isMarketplace(t));
    if (source === "MARKETPLACE") list = list.filter((t) => isMarketplace(t));

    if (assigned === "ASSIGNED") list = list.filter((t) => isAssigned(t));
    if (assigned === "UNASSIGNED") list = list.filter((t) => !isAssigned(t));

    if (text) {
      list = list.filter((t) => {
        const blob = [t?.id, t?.title, t?.status, t?.category_path, t?.category_name, t?.service_zip, t?.service_address]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return blob.includes(text);
      });
    }

    list.sort((a, b) => {
      const da = a?.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b?.created_at ? new Date(b.created_at).getTime() : 0;
      return sort === "NEWEST" ? db - da : da - db;
    });

    return list;
  }, [items, q, status, source, assigned, sort, view, isCustomer, isSboLike]);

  const counts = useMemo(() => {
    const total = filtered.length;
    const mp = filtered.filter((t) => isMarketplace(t) && !isAssigned(t)).length;
    const asg = filtered.filter((t) => isAssigned(t)).length;
    return { total, mp, asg };
  }, [filtered]);

  const showViewTabs = !isCustomer && isSboLike;

  const marketplaceDisabled = showViewTabs && locked;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar title="Tickets" subtitle="Spreadsheet view + marketplace queue" />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* ✅ Lock banner (only impacts Marketplace; keep Tickets readable) */}
        {showViewTabs && locked ? (
          <div className="rounded-3xl border border-rose-500/35 bg-rose-500/10 p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="text-base font-extrabold text-rose-100">Business Locked</div>
                <div className="text-xs text-rose-200/90 mt-1">
                  Reason: <b className="font-mono">{lockReason}</b>
                </div>
                <div className="text-xs text-slate-300 mt-2">
                  Marketplace is blocked until billing is updated. You can still view your tickets and cash fee invoices.
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <SmallBtn tone="cyan" onClick={openSetupCard}>
                  Add/Update Card
                </SmallBtn>
                <SmallBtn tone="fuchsia" onClick={submitUnlockRequest}>
                  Submit Unlock Request
                </SmallBtn>
                <SmallBtn tone="slate" onClick={() => nav("/billing/cash-fee-invoices")}>
                  View Invoices
                </SmallBtn>
                <SmallBtn tone="slate" onClick={load}>
                  Refresh
                </SmallBtn>
              </div>
            </div>
          </div>
        ) : null}

        {err ? <div className="text-sm text-red-200 bg-red-900/10 border border-red-800 rounded-xl p-3">{err}</div> : null}

        {/* Top row */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Pill tone="slate">{loading ? "Loading…" : `${counts.total} in view`}</Pill>
            {showViewTabs ? (
              <>
                <Pill tone="cyan">{counts.asg} assigned</Pill>
                <Pill tone="fuchsia">{counts.mp} marketplace open</Pill>
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <SmallBtn tone="fuchsia" onClick={goCreate}>
              + {isCustomer ? "New Service Request" : "New Ticket"}
            </SmallBtn>
            <SmallBtn onClick={load}>Refresh</SmallBtn>
          </div>
        </div>

        {/* View tabs (All / My / Marketplace) */}
        {showViewTabs ? (
          <div className="flex items-center gap-2 flex-wrap">
            <SmallBtn tone={view === "all" ? "cyan" : "slate"} onClick={() => setView("all")}>
              All
            </SmallBtn>
            <SmallBtn tone={view === "my" ? "cyan" : "slate"} onClick={() => setView("my")}>
              My Business
            </SmallBtn>

            {/* ✅ Marketplace tab disabled while locked */}
            <SmallBtn
              tone={view === "marketplace" ? "cyan" : "slate"}
              onClick={() => (marketplaceDisabled ? null : setView("marketplace"))}
              disabled={marketplaceDisabled}
              title={marketplaceDisabled ? "Marketplace is locked until billing is updated." : "Marketplace queue"}
              className={marketplaceDisabled ? "opacity-50" : ""}
            >
              Marketplace
            </SmallBtn>

            {marketplaceDisabled ? (
              <div className="text-[11px] text-slate-400 ml-1">
                Marketplace disabled —{" "}
                <button className="underline text-cyan-200" onClick={() => nav("/billing/cash-fee-invoices")}>
                  view invoices
                </button>
              </div>
            ) : null}

            <div className="ml-auto flex items-center gap-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-1 flex gap-1">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={cx(
                    "px-3 py-2 rounded-xl text-[11px] font-semibold border transition",
                    viewMode === "table"
                      ? "bg-cyan-500/12 border-cyan-500/40 text-cyan-200"
                      : "bg-slate-950/40 border-slate-800 text-slate-200 hover:bg-slate-900"
                  )}
                >
                  Table
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("board")}
                  className={cx(
                    "px-3 py-2 rounded-xl text-[11px] font-semibold border transition",
                    viewMode === "board"
                      ? "bg-fuchsia-500/12 border-fuchsia-500/40 text-fuchsia-200"
                      : "bg-slate-950/40 border-slate-800 text-slate-200 hover:bg-slate-900"
                  )}
                >
                  Board
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("queue")}
                  className={cx(
                    "px-3 py-2 rounded-xl text-[11px] font-semibold border transition",
                    viewMode === "queue"
                      ? "bg-emerald-500/12 border-emerald-500/40 text-emerald-200"
                      : "bg-slate-950/40 border-slate-800 text-slate-200 hover:bg-slate-900"
                  )}
                >
                  Queue
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* If user somehow lands on marketplace view while locked */}
        {showViewTabs && view === "marketplace" && locked ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
            <div className="text-lg font-extrabold text-slate-100">Marketplace is locked</div>
            <div className="text-sm text-slate-400 mt-2">
              Your business must resolve <b className="font-mono text-slate-200">{lockReason}</b> before bidding/accepting new jobs.
            </div>

            <div className="mt-4 flex gap-2 flex-wrap">
              <SmallBtn tone="cyan" onClick={openSetupCard}>
                Add/Update Card
              </SmallBtn>
              <SmallBtn tone="fuchsia" onClick={submitUnlockRequest}>
                Submit Unlock Request
              </SmallBtn>
              <SmallBtn tone="slate" onClick={() => nav("/billing/cash-fee-invoices")}>
                View Cash Fee Invoices
              </SmallBtn>
              <SmallBtn tone="slate" onClick={() => setView("all")}>
                Back to All Tickets
              </SmallBtn>
            </div>
          </div>
        ) : null}

        {/* Filters */}
        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
          <div className="grid md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <FieldLabel>Search</FieldLabel>
              <input
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                placeholder="id, title, category, zip, address…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div>
              <FieldLabel>Status</FieldLabel>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="ALL">All</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel>Source</FieldLabel>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="ALL">All</option>
                <option value="DIRECT">Direct</option>
                <option value="MARKETPLACE">Marketplace</option>
              </select>
            </div>

            <div>
              <FieldLabel>Assigned</FieldLabel>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                value={assigned}
                onChange={(e) => setAssigned(e.target.value)}
              >
                <option value="ALL">All</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="UNASSIGNED">Unassigned</option>
              </select>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-slate-500">
              Tip: Table is your “operator” view. Queue is best for marketplace intake.
            </div>
            <div className="flex items-center gap-2">
              <FieldLabel>Sort</FieldLabel>
              <select
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="NEWEST">Newest</option>
                <option value="OLDEST">Oldest</option>
              </select>

              <SmallBtn
                onClick={() => {
                  setQ("");
                  setStatus("ALL");
                  setSource("ALL");
                  setAssigned("ALL");
                  setSort("NEWEST");
                }}
              >
                Clear
              </SmallBtn>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        {viewMode === "queue" ? (
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-8 text-slate-400">No tickets in this view.</div>
            ) : (
              filtered.map((t) => {
                const title = `${t.id} • ${t.title || t.category_path || t.category_name || "Ticket"}`;
                const st = String(t?.status || "NEW").toUpperCase();
                const tone = statusTone(st);
                const mp = isMarketplace(t);
                const asg = isAssigned(t);

                const showMpActions = view === "marketplace" && isSboLike && mp && !asg && !locked;

                return (
                  <div key={t.id} className="rounded-3xl border border-slate-800 bg-slate-950/40 hover:bg-slate-900/30 transition p-5">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="text-base font-extrabold truncate">{title}</div>
                        <div className="text-sm text-slate-400 mt-1">
                          {t.service_address || "—"} <span className="text-slate-600">•</span>{" "}
                          {t.service_zip ? `ZIP ${t.service_zip}` : "ZIP —"} <span className="text-slate-600">•</span>{" "}
                          {t.service_radius_miles ? `${t.service_radius_miles}mi` : "—"}
                        </div>
                        {t.category_path ? <div className="text-[11px] text-slate-500 mt-1">{t.category_path}</div> : null}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Pill tone={tone}>{st}</Pill>
                        {mp ? <Pill tone="cyan">Marketplace</Pill> : <Pill tone="slate">Direct</Pill>}
                        {asg ? <Pill tone="emerald">Assigned</Pill> : <Pill tone="amber">Unassigned</Pill>}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-3">
                        <Link to={`/tickets/${t.id}`} className="text-[12px] text-slate-200 hover:text-white underline underline-offset-4">
                          Details
                        </Link>
                        {t.created_at ? (
                          <span className="text-[11px] text-slate-500">Created: {new Date(t.created_at).toLocaleString()}</span>
                        ) : null}
                      </div>

                      {showMpActions ? (
                        <div className="flex gap-2">
                          <SmallBtn tone="cyan" onClick={() => acceptMarketplace(t.id)} disabled={actingId === t.id} title="Accept this marketplace job">
                            {actingId === t.id ? "..." : "Accept"}
                          </SmallBtn>
                          <SmallBtn
                            tone="rose"
                            onClick={() => declineMarketplace(t.id)}
                            disabled={actingId === t.id}
                            title="Decline (you won’t see it again)"
                          >
                            {actingId === t.id ? "..." : "Decline"}
                          </SmallBtn>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500">{view === "marketplace" ? (locked ? "Locked" : "Not actionable") : ""}</div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : viewMode === "table" ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full text-left">
                <thead className="sticky top-0 bg-slate-950/90 backdrop-blur border-b border-slate-800">
                  <tr className="text-[11px] text-slate-400">
                    <th className="px-4 py-3">Ticket</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Assigned</th>
                    <th className="px-4 py-3">ZIP</th>
                    <th className="px-4 py-3">Address</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td className="px-4 py-10 text-slate-500" colSpan={8}>
                        No tickets match your filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((t) => {
                      const title = `${t.id} • ${t.title || t.category_path || t.category_name || "Ticket"}`;
                      const st = String(t?.status || "NEW").toUpperCase();
                      const tone = statusTone(st);
                      const mp = isMarketplace(t);
                      const asg = isAssigned(t);
                      const created = t.created_at ? new Date(t.created_at) : null;

                      const showMpActions = view === "marketplace" && isSboLike && mp && !asg && !locked;

                      return (
                        <tr key={t.id} className="border-b border-slate-800/70 hover:bg-slate-900/25 transition">
                          <td className="px-4 py-3">
                            <div className="text-sm font-semibold text-slate-100 truncate max-w-[360px]">{title}</div>
                            {t.category_path ? (
                              <div className="text-[11px] text-slate-500 truncate max-w-[360px]">{t.category_path}</div>
                            ) : null}
                          </td>

                          <td className="px-4 py-3">
                            <Pill tone={tone}>{st}</Pill>
                          </td>

                          <td className="px-4 py-3">{mp ? <Pill tone="cyan">Marketplace</Pill> : <Pill tone="slate">Direct</Pill>}</td>

                          <td className="px-4 py-3">{asg ? <Pill tone="emerald">Assigned</Pill> : <Pill tone="amber">Unassigned</Pill>}</td>

                          <td className="px-4 py-3 text-sm text-slate-200">{t.service_zip || "—"}</td>

                          <td className="px-4 py-3">
                            <div className="text-sm text-slate-200 truncate max-w-[360px]">{t.service_address || "—"}</div>
                            <div className="text-[11px] text-slate-500">{t.service_radius_miles ? `${t.service_radius_miles}mi` : "—"}</div>
                          </td>

                          <td className="px-4 py-3 text-sm text-slate-300">{created ? created.toLocaleString() : "—"}</td>

                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-2 justify-end">
                              <Link to={`/tickets/${t.id}`} className="text-[12px] text-slate-200 hover:text-white underline underline-offset-4">
                                Details
                              </Link>

                              {showMpActions ? (
                                <>
                                  <SmallBtn tone="cyan" onClick={() => acceptMarketplace(t.id)} disabled={actingId === t.id}>
                                    {actingId === t.id ? "..." : "Accept"}
                                  </SmallBtn>
                                  <SmallBtn tone="rose" onClick={() => declineMarketplace(t.id)} disabled={actingId === t.id}>
                                    {actingId === t.id ? "..." : "Decline"}
                                  </SmallBtn>
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 text-[11px] text-slate-500 border-t border-slate-800">
              Spreadsheet mode is meant to replace the grid when volume grows.
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
            <div className="text-slate-200 font-semibold">Board view is optional now.</div>
            <div className="text-slate-500 text-sm mt-1">
              Use <b>Table</b> for operations and <b>Queue</b> for marketplace intake.
            </div>
            <div className="mt-4 flex gap-2">
              <SmallBtn tone="cyan" onClick={() => setViewMode("table")}>
                Go Table
              </SmallBtn>
              <SmallBtn tone="emerald" onClick={() => setViewMode("queue")}>
                Go Queue
              </SmallBtn>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}