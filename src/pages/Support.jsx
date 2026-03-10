// src/pages/Support.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ModeBar from "../components/ModeBar";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Pill({ children, tone = "slate" }) {
  const tones = {
    slate: "border-slate-800 bg-slate-950/50 text-slate-300",
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-100",
    fuchsia: "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-100",
    amber: "border-amber-500/25 bg-amber-500/10 text-amber-100",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",
    red: "border-red-500/25 bg-red-500/10 text-red-100",
  };
  return (
    <span className={cx("text-[11px] px-2 py-1 rounded-full border", tones[tone] || tones.slate)}>{children}</span>
  );
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

function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso || "";
  }
}

function statusTone(s) {
  const v = String(s || "").toUpperCase();
  if (v === "OPEN") return "amber";
  if (v === "CLOSED") return "emerald";
  return "slate";
}

function kindLabel(kind) {
  const k = String(kind || "").toUpperCase();
  if (k === "BILLING") return "Billing";
  if (k === "BUG") return "Bug / Technical Issue";
  if (k === "ACCOUNT") return "Account / Login";
  if (k === "FEATURE") return "Feature Request";
  return "Other";
}

export default function Support() {
  const nav = useNavigate();
  const { mode, activeBusinessId, myBusinesses, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [listErr, setListErr] = useState("");
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);

  const [filterStatus, setFilterStatus] = useState("OPEN"); // OPEN | CLOSED | ""
  const [searchQ, setSearchQ] = useState("");

  const [form, setForm] = useState({
    kind: "BILLING", // BILLING | BUG | ACCOUNT | FEATURE | OTHER (safe)
    title: "",
    body: "",
    include_business: true,
  });

  const refreshTimer = useRef(null);

  const businessName = useMemo(() => {
    const id = activeBusinessId ? Number(activeBusinessId) : null;
    if (!id) return "";
    const arr = Array.isArray(myBusinesses) ? myBusinesses : [];
    const biz =
      arr.find((x) => Number(x?.id) === id) ||
      arr.find((x) => Number(x?.business_id) === id) ||
      arr.find((x) => Number(x?.business?.id) === id);
    return (biz?.name || biz?.business?.name || "").trim();
  }, [activeBusinessId, myBusinesses]);

  const roleLabel = useMemo(() => {
    // Prefer explicit mode (UI role), fallback to backend user.role if present
    const m = String(mode || "").toUpperCase();
    if (m) return m;
    return String(user?.role || "").toUpperCase() || "CUSTOMER";
  }, [mode, user?.role]);

  const canAttachBusiness = useMemo(() => {
    // Only attach when there is a selected business id AND role is business-scoped
    const hasBiz = !!activeBusinessId;
    const m = String(mode || "").toUpperCase();
    return hasBiz && ["SBO", "EMPLOYEE", "PM", "PLATFORM"].includes(m);
  }, [activeBusinessId, mode]);

  const effectiveBusinessId = useMemo(() => {
    if (!canAttachBusiness) return null;
    if (!form.include_business) return null;
    const id = activeBusinessId ? Number(activeBusinessId) : null;
    return id || null;
  }, [canAttachBusiness, form.include_business, activeBusinessId]);

  function clearFlash() {
    setErr("");
    setOk("");
  }

  async function loadList({ silent = false } = {}) {
    if (!silent) setLoading(true);
    setListErr("");
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (searchQ.trim()) params.q = searchQ.trim();

      const r = await api.get("/support/requests/", { params });
      const data = r.data;
      const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : data?.value || [];
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      setItems([]);
      setListErr(e?.response?.data?.detail || e?.message || "Failed to load support requests.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function submit() {
    clearFlash();
    setSubmitting(true);
    try {
      const payload = {
        kind: form.kind || "OTHER",
        title: (form.title || "").trim(),
        body: (form.body || "").trim(),
      };
      if (effectiveBusinessId) payload.business_id = effectiveBusinessId;

      if (!payload.body) {
        setErr("Please enter a message.");
        setSubmitting(false);
        return;
      }

      const r = await api.post("/support/requests/", payload);
      setOk("Message sent to SyncWorks Support.");
      setForm((p) => ({ ...p, title: "", body: "" }));
      setSelected(null);

      // refresh list
      await loadList({ silent: true });
      // auto-select newly created if present
      if (r?.data?.id) {
        const created = r.data;
        setSelected(created);
      }

      // quick hide
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => setOk(""), 2200);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Failed to send message.");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    loadList();
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // reload on filter/search changes (debounced)
    const t = setTimeout(() => loadList({ silent: true }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, searchQ]);

  const KIND_OPTIONS = [
    { value: "BILLING", label: "Billing / Subscription" },
    { value: "ACCOUNT", label: "Account / Login" },
    { value: "BUG", label: "Bug / Technical Issue" },
    { value: "FEATURE", label: "Feature Request" },
    { value: "OTHER", label: "Other" },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="Support"
        subtitle="Message SyncWorks Support • Track requests • Get help fast"
        rightActions={[
          {
            label: "Back",
            tone: "slate",
            onClick: () => {
              // sensible back by role
              const m = String(mode || "").toUpperCase();
              if (m === "SBO") return nav("/sbo");
              if (m === "PM") return nav("/pm");
              if (m === "EMPLOYEE") return nav("/employee");
              if (m === "SALES") return nav("/sales/dashboard");
              if (m === "PLATFORM") return nav("/platform");
              return nav("/customer");
            },
          },
        ]}
      />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Header banner */}
        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-lg font-semibold text-slate-100">Contact SyncWorks Support</div>
              <div className="text-xs text-slate-400 mt-1">
                Use this channel for SyncWorks platform issues (access, billing, bugs, feature requests). A copy may be
                routed to our support mailbox for tracking.
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <Pill tone="cyan">Role: {roleLabel}</Pill>
                {canAttachBusiness && businessName ? <Pill tone="indigo">Business: {businessName}</Pill> : null}
                {canAttachBusiness && !businessName && effectiveBusinessId ? (
                  <Pill tone="indigo">Business ID: {effectiveBusinessId}</Pill>
                ) : null}
              </div>
            </div>
            <div className="text-xs text-slate-400 max-w-md">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                <div className="font-semibold text-slate-200">Important</div>
                <div className="mt-1">
                  SyncWorks is a technology platform that helps customers and businesses operate more efficiently. Service
                  disputes (pricing, workmanship, scheduling, refunds) are handled between the customer and the service
                  provider unless required by law or platform policy.
                </div>
              </div>
            </div>
          </div>

          {err ? (
            <div className="mt-4 text-sm text-red-200 bg-red-900/20 border border-red-800 rounded-2xl p-3">{err}</div>
          ) : null}
          {ok ? (
            <div className="mt-4 text-sm text-emerald-200 bg-emerald-900/15 border border-emerald-700/30 rounded-2xl p-3">
              {ok}
            </div>
          ) : null}
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          {/* Compose */}
          <Card
            title="New Support Message"
            subtitle="Choose a topic, describe the issue, and submit."
            right={
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className={cx(
                  "h-10 px-4 rounded-2xl border text-xs font-semibold transition",
                  submitting
                    ? "bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-cyan-500/18 border-cyan-500/35 hover:bg-cyan-500/24 text-cyan-100"
                )}
              >
                {submitting ? "Sending..." : "Send"}
              </button>
            }
          >
            <div className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <label className="block">
                  <div className="text-xs text-slate-300">Topic</div>
                  <select
                    value={form.kind}
                    onChange={(e) => setForm((p) => ({ ...p, kind: e.target.value }))}
                    className="mt-1 w-full rounded-2xl bg-slate-950/60 border border-slate-800 px-3 py-2 text-sm text-slate-100"
                  >
                    {KIND_OPTIONS.map((k) => (
                      <option key={k.value} value={k.value}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <div className="text-xs text-slate-300">Subject (optional)</div>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    className="mt-1 w-full rounded-2xl bg-slate-950/60 border border-slate-800 px-3 py-2 text-sm text-slate-100"
                    placeholder="Short summary (optional)"
                    maxLength={140}
                  />
                </label>
              </div>

              {canAttachBusiness ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-slate-200 font-semibold">Attach active business</div>
                    <div className="text-xs text-slate-400 mt-1">
                      Recommended for billing, payout, or marketplace issues tied to a specific business.
                    </div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <Pill tone="slate">Business ID: {activeBusinessId || "—"}</Pill>
                      {businessName ? <Pill tone="slate">{businessName}</Pill> : null}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, include_business: !p.include_business }))}
                    className={cx(
                      "w-14 h-8 rounded-full border transition relative shrink-0 mt-1",
                      form.include_business ? "bg-cyan-500/20 border-cyan-500/40" : "bg-slate-950 border-slate-800"
                    )}
                    title={form.include_business ? "Attached" : "Not attached"}
                  >
                    <span
                      className={cx(
                        "absolute top-1 left-1 w-6 h-6 rounded-full transition",
                        form.include_business ? "translate-x-6 bg-cyan-200" : "translate-x-0 bg-slate-300"
                      )}
                    />
                  </button>
                </div>
              ) : null}

              <label className="block">
                <div className="text-xs text-slate-300">Message</div>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                  rows={7}
                  className="mt-1 w-full rounded-2xl bg-slate-950/60 border border-slate-800 px-3 py-2 text-sm text-slate-100"
                  placeholder="Describe what happened, what you expected, and any steps to reproduce (if a bug)."
                />
                <div className="text-[11px] text-slate-500 mt-1">
                  Tip: include any error message text, what page you were on, and the approximate time it occurred.
                </div>
              </label>

              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    clearFlash();
                    setForm((p) => ({ ...p, title: "", body: "", kind: "BILLING" }));
                  }}
                  className="h-10 px-4 rounded-2xl border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40 text-slate-200 text-xs font-semibold"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting}
                  className={cx(
                    "ml-auto h-10 px-4 rounded-2xl border text-xs font-semibold transition",
                    submitting
                      ? "bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed"
                      : "bg-fuchsia-500/14 border-fuchsia-500/28 hover:bg-fuchsia-500/20 text-fuchsia-100"
                  )}
                >
                  {submitting ? "Sending..." : "Send to Support"}
                </button>
              </div>
            </div>
          </Card>

          {/* History */}
          <Card
            title="My Support Requests"
            subtitle="Track status and reference prior messages."
            right={
              <button
                type="button"
                onClick={() => loadList()}
                className="h-10 px-4 rounded-2xl border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40 text-slate-200 text-xs font-semibold"
              >
                Refresh
              </button>
            }
          >
            <div className="space-y-3">
              <div className="grid md:grid-cols-3 gap-2">
                <label className="block">
                  <div className="text-xs text-slate-300">Status</div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="mt-1 w-full rounded-2xl bg-slate-950/60 border border-slate-800 px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="OPEN">Open</option>
                    <option value="CLOSED">Closed</option>
                    <option value="">All</option>
                  </select>
                </label>

                <label className="block md:col-span-2">
                  <div className="text-xs text-slate-300">Search</div>
                  <input
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    className="mt-1 w-full rounded-2xl bg-slate-950/60 border border-slate-800 px-3 py-2 text-sm text-slate-100"
                    placeholder="Search title or message..."
                  />
                </label>
              </div>

              {loading ? <div className="text-sm text-slate-400">Loading…</div> : null}
              {listErr ? (
                <div className="text-sm text-red-200 bg-red-900/20 border border-red-800 rounded-2xl p-3">
                  {listErr}
                </div>
              ) : null}

              {!loading && !listErr && items.length === 0 ? (
                <div className="text-sm text-slate-400">No support requests yet.</div>
              ) : null}

              <div className="space-y-2">
                {items.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() => setSelected(x)}
                    className={cx(
                      "w-full text-left rounded-2xl border p-4 transition",
                      selected?.id === x.id
                        ? "border-cyan-500/30 bg-cyan-500/8"
                        : "border-slate-800 bg-slate-950/50 hover:bg-slate-900/40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-100 truncate">
                          {x.title || "Support message"}
                        </div>
                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                          <Pill tone="slate">{kindLabel(x.kind)}</Pill>
                          <Pill tone={statusTone(x.status)}>{String(x.status || "").toUpperCase() || "—"}</Pill>
                          {x.business_id ? <Pill tone="slate">Business #{x.business_id}</Pill> : null}
                          <span className="text-[11px] text-slate-500">{fmtDate(x.created_at)}</span>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500">#{x.id}</div>
                    </div>

                    <div className="mt-3 text-sm text-slate-300 line-clamp-2">
                      {x.body || ""}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Detail modal */}
        {selected ? (
          <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-3">
            <div className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-950/85 overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-100 truncate">{selected.title || "Support message"}</div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <Pill tone="slate">{kindLabel(selected.kind)}</Pill>
                    <Pill tone={statusTone(selected.status)}>{String(selected.status || "").toUpperCase() || "—"}</Pill>
                    {selected.business_id ? <Pill tone="slate">Business #{selected.business_id}</Pill> : null}
                    <Pill tone="slate">Request #{selected.id}</Pill>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2">
                    Created: {fmtDate(selected.created_at)} • Updated: {fmtDate(selected.updated_at)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="h-10 w-10 rounded-2xl border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40 text-slate-200 flex items-center justify-center"
                  title="Close"
                >
                  ✕
                </button>
              </div>

              <div className="p-5">
                <div className="text-sm text-slate-200 whitespace-pre-wrap">{selected.body || ""}</div>

                <div className="mt-5 flex gap-2 flex-wrap justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText?.(
                        `Support Request #${selected.id}\nTopic: ${selected.kind}\nStatus: ${selected.status}\n\n${selected.body || ""}`
                      );
                      setOk("Copied to clipboard.");
                      if (refreshTimer.current) clearTimeout(refreshTimer.current);
                      refreshTimer.current = setTimeout(() => setOk(""), 1600);
                    }}
                    className="h-10 px-4 rounded-2xl border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40 text-slate-200 text-xs font-semibold"
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="h-10 px-4 rounded-2xl border border-cyan-500/35 bg-cyan-500/15 hover:bg-cyan-500/20 text-cyan-100 text-xs font-semibold"
                  >
                    Done
                  </button>
                </div>

                <div className="mt-4 text-[11px] text-slate-500">
                  For platform help, this is the fastest route. If your message is about a service provider dispute,
                  include the ticket/invoice number and any relevant dates so we can review platform records as needed.
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}