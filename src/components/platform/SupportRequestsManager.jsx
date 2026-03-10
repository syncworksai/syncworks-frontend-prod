// src/components/platform/SupportRequestsManager.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client";

const STATUS_OPTIONS = ["", "OPEN", "IN_PROGRESS", "CLOSED"];
const KIND_OPTIONS = ["", "UNLOCK", "BILLING", "BUG", "FEATURE", "OTHER"];

function pillClass(kind) {
  switch (kind) {
    case "UNLOCK":
      return "bg-fuchsia-500/10 border-fuchsia-500/25 text-fuchsia-200";
    case "BILLING":
      return "bg-cyan-500/10 border-cyan-500/25 text-cyan-200";
    case "BUG":
      return "bg-rose-500/10 border-rose-500/25 text-rose-200";
    case "FEATURE":
      return "bg-indigo-500/10 border-indigo-500/25 text-indigo-200";
    default:
      return "bg-white/10 border-white/15 text-slate-200";
  }
}

export default function SupportRequestsManager({ embedded = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState("OPEN");
  const [kind, setKind] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [q, setQ] = useState("");

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (kind) params.set("kind", kind);
    if (businessId) params.set("business_id", businessId);
    if (q.trim()) params.set("q", q.trim()); // optional if backend supports q; harmless if ignored
    return params.toString();
  }, [status, kind, businessId, q]);

  async function load() {
    setLoading(true);
    setErr("");
    setMsg("");
    try {
      const res = await api.get(`/platform/support/requests/?${queryString}`);
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setItems(list);
    } catch (e) {
      setItems([]);
      setErr(e?.response?.data?.detail || "Failed to load support requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function safeAction(fn, successMsg) {
    setErr("");
    setMsg("");
    try {
      await fn();
      if (successMsg) setMsg(successMsg);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Action failed.");
    }
  }

  async function markInProgress(id) {
    return safeAction(() => api.post(`/platform/support/requests/${id}/in-progress/`, {}), "Marked IN_PROGRESS ✅");
  }

  async function closeRequest(id) {
    return safeAction(() => api.post(`/platform/support/requests/${id}/close/`, {}), "Closed ✅");
  }

  async function openRequest(id) {
    return safeAction(() => api.post(`/platform/support/requests/${id}/open/`, {}), "Re-opened ✅");
  }

  async function unlockBusinessFromRequest(r) {
    if (!r?.business_id) {
      setErr("This request has no business_id.");
      return;
    }

    const ok = window.confirm(
      `Unlock Business #${r.business_id} now?\n\nThis will also close the request.`
    );
    if (!ok) return;

    await safeAction(async () => {
      await api.post(`/platform/businesses/${r.business_id}/unlock/`, {});
      await api.post(`/platform/support/requests/${r.id}/close/`, {});
    }, `Business #${r.business_id} unlocked ✅ (request closed)`);
  }

  return (
    <div className={embedded ? "" : "min-h-screen text-slate-100 bg-[#05060a]"}>
      <div className={embedded ? "" : "max-w-7xl mx-auto px-4 py-6"}>
        <div className="rounded-3xl border border-white/10 bg-black/25 backdrop-blur p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="font-semibold tracking-tight">Support Requests</div>
              <div className="text-xs text-slate-300/80 mt-1">
                God Mode inbox for unlock/billing/bug/feature requests.
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={load}
                className="text-xs rounded-2xl px-3 py-2 bg-black/20 border border-white/10 hover:bg-white/10 backdrop-blur"
              >
                Refresh
              </button>
            </div>
          </div>

          {msg ? (
            <div className="mt-3 text-sm text-emerald-200 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3">
              {msg}
            </div>
          ) : null}

          {err ? (
            <div className="mt-3 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-2xl p-3">
              {err}
            </div>
          ) : null}

          {/* Filters */}
          <div className="mt-4 grid md:grid-cols-5 gap-2">
            <select
              className="bg-black/30 border border-white/10 rounded-2xl px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s || "Any Status"}
                </option>
              ))}
            </select>

            <select
              className="bg-black/30 border border-white/10 rounded-2xl px-3 py-2 text-sm"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              {KIND_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {k || "Any Kind"}
                </option>
              ))}
            </select>

            <input
              className="bg-black/30 border border-white/10 rounded-2xl px-3 py-2 text-sm"
              placeholder="Business ID (optional)"
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value.replace(/[^\d]/g, ""))}
            />

            <input
              className="md:col-span-2 bg-black/30 border border-white/10 rounded-2xl px-3 py-2 text-sm"
              placeholder="Search (optional)…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={load}
              className="rounded-2xl px-4 py-2 text-sm bg-white/10 border border-white/20 hover:bg-white/15"
            >
              Apply Filters
            </button>
          </div>

          {/* Table */}
          <div className="mt-5 overflow-auto">
            {loading ? (
              <div className="text-slate-300">Loading…</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-slate-300/80">
                  <tr>
                    <th className="text-left py-2">Kind</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Requester</th>
                    <th className="text-left py-2">Business</th>
                    <th className="text-left py-2">Message</th>
                    <th className="text-left py-2">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((r) => (
                    <tr key={r.id} className="border-t border-white/10 align-top">
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded-full border text-xs ${pillClass(r.kind)}`}>
                          {r.kind || "—"}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-1">#{r.id}</div>
                      </td>

                      <td className="py-2">
                        <span className="px-2 py-1 rounded-full bg-black/30 border border-white/10 text-xs">
                          {r.status}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-1">
                          {String(r.created_at || "").slice(0, 19).replace("T", " ")}
                        </div>
                      </td>

                      <td className="py-2">
                        <div className="font-mono text-xs">{r.requester_email || ""}</div>
                        <div className="text-xs text-slate-300/70">{r.role || "-"}</div>
                      </td>

                      <td className="py-2 text-xs text-slate-300/80">
                        {r.business_id ? `#${r.business_id}` : "-"}
                      </td>

                      <td className="py-2">
                        <div className="font-semibold">{r.title || "(no title)"}</div>
                        <div className="text-xs text-slate-300/80 mt-1 whitespace-pre-wrap">
                          {r.body}
                        </div>
                      </td>

                      <td className="py-2">
                        <div className="flex gap-2 flex-wrap">
                          {r.status !== "IN_PROGRESS" ? (
                            <button
                              onClick={() => markInProgress(r.id)}
                              className="text-xs rounded-2xl px-3 py-2 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15"
                            >
                              In Progress
                            </button>
                          ) : null}

                          {r.status !== "CLOSED" ? (
                            <button
                              onClick={() => closeRequest(r.id)}
                              className="text-xs rounded-2xl px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15"
                            >
                              Close
                            </button>
                          ) : (
                            <button
                              onClick={() => openRequest(r.id)}
                              className="text-xs rounded-2xl px-3 py-2 bg-white/10 border border-white/20 hover:bg-white/15"
                            >
                              Re-Open
                            </button>
                          )}

                          {/* ✅ Unlock button for UNLOCK kind */}
                          {r.kind === "UNLOCK" && r.business_id ? (
                            <button
                              onClick={() => unlockBusinessFromRequest(r)}
                              className="text-xs rounded-2xl px-3 py-2 bg-fuchsia-500/10 border border-fuchsia-500/25 hover:bg-fuchsia-500/15 text-fuchsia-200"
                            >
                              Unlock Business
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!items.length ? (
                    <tr>
                      <td className="py-3 text-slate-300/70" colSpan={6}>
                        No requests found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
