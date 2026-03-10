// src/pages/platform/PlatformSupportRequests.jsx
import React, { useEffect, useMemo, useState } from "react";
import ModeBar from "../../components/ModeBar";
import api from "../../api/client";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function safeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.value)) return data.value;
  return [];
}

function Badge({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-500/10 border-slate-500/20 text-slate-200",
    cyan: "bg-cyan-500/10 border-cyan-500/20 text-cyan-200",
    fuchsia: "bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-200",
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-200",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-200",
    red: "bg-red-500/10 border-red-500/20 text-red-200",
  };
  return <span className={cx("text-[11px] px-2 py-1 rounded-full border", tones[tone] || tones.slate)}>{children}</span>;
}

function roleTone(role) {
  const r = String(role || "").toUpperCase();
  if (r === "SBO") return "cyan";
  if (r === "CUSTOMER") return "emerald";
  if (r === "PM") return "fuchsia";
  if (r === "EMPLOYEE") return "slate";
  if (r === "TENANT") return "amber";
  if (r === "INVESTOR") return "amber";
  if (r === "SALES") return "cyan";
  if (r === "PLATFORM") return "cyan";
  return "slate";
}

function statusTone(status) {
  const s = String(status || "").toUpperCase();
  if (s === "OPEN") return "cyan";
  if (s === "IN_PROGRESS") return "amber";
  if (s === "RESOLVED") return "emerald";
  if (s === "CLOSED") return "slate";
  return "slate";
}

function kindTone(kind) {
  const k = String(kind || "").toUpperCase();
  if (k === "BILLING" || k === "PAYMENTS") return "amber";
  if (k === "LOCKED_OUT") return "red";
  if (k === "BUG") return "fuchsia";
  if (k === "FEATURE") return "cyan";
  return "slate";
}

export default function PlatformSupportRequests() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);

  // Filters
  const [role, setRole] = useState("ALL");
  const [kind, setKind] = useState("ALL");
  const [status, setStatus] = useState("OPEN");
  const [q, setQ] = useState("");

  const ROLES = useMemo(
    () => [
      { v: "ALL", label: "All roles" },
      { v: "CUSTOMER", label: "Customer" },
      { v: "SBO", label: "Business Owner" },
      { v: "PM", label: "Property Manager" },
      { v: "EMPLOYEE", label: "Employee" },
      { v: "TENANT", label: "Tenant" },
      { v: "INVESTOR", label: "Investor" },
      { v: "SALES", label: "Sales OS" },
    ],
    []
  );

  const KINDS = useMemo(
    () => [
      { v: "ALL", label: "All" },
      { v: "BILLING", label: "Billing" },
      { v: "PAYMENTS", label: "Payments" },
      { v: "LOCKED_OUT", label: "Locked Out" },
      { v: "BUG", label: "Bug" },
      { v: "FEATURE", label: "Feature Request" },
      { v: "MARKETPLACE", label: "Marketplace" },
      { v: "CALENDAR", label: "Calendar" },
      { v: "OTHER", label: "Other" },
    ],
    []
  );

  const STATUSES = useMemo(
    () => [
      { v: "ALL", label: "All" },
      { v: "OPEN", label: "Open" },
      { v: "IN_PROGRESS", label: "In Progress" },
      { v: "RESOLVED", label: "Resolved" },
      { v: "CLOSED", label: "Closed" },
    ],
    []
  );

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const r = await api.get("/platform/support/requests/");
      setItems(safeList(r.data));
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Failed to load support inbox.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const text = (q || "").trim().toLowerCase();

    return (items || [])
      .filter((x) => {
        const r = String(x?.role || "").toUpperCase();
        const k = String(x?.kind || "").toUpperCase();
        const s = String(x?.status || "").toUpperCase();

        if (role !== "ALL" && r !== role) return false;
        if (kind !== "ALL" && k !== kind) return false;
        if (status !== "ALL" && s !== status) return false;

        if (!text) return true;

        const hay = [x?.title, x?.body, x?.kind, x?.status, x?.role, x?.business_id].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(text);
      })
      .sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime());
  }, [items, role, kind, status, q]);

  async function setRequestStatus(id, nextStatus) {
    setErr("");
    try {
      await api.patch(`/platform/support/requests/${id}/`, { status: nextStatus });
      setItems((prev) => (prev || []).map((x) => (x?.id === id ? { ...x, status: nextStatus } : x)));
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Failed to update status.");
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="Support Inbox"
        subtitle="Support requests • communication • triage"
        rightActions={[
          { label: "Refresh", tone: "slate", onClick: load },
          { label: "Open Only", tone: "cyan", onClick: () => setStatus("OPEN") },
        ]}
      />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {err ? (
          <div className="text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-2xl p-3">{err}</div>
        ) : null}

        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="grid md:grid-cols-4 gap-3">
            <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-2xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm">
              {ROLES.map((r) => (
                <option key={r.v} value={r.v}>
                  From: {r.label}
                </option>
              ))}
            </select>

            <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-2xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm">
              {KINDS.map((k) => (
                <option key={k.v} value={k.v}>
                  Subject: {k.label}
                </option>
              ))}
            </select>

            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-2xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm">
              {STATUSES.map((s) => (
                <option key={s.v} value={s.v}>
                  Status: {s.label}
                </option>
              ))}
            </select>

            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="rounded-2xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              placeholder="Search title/body/business…"
            />
          </div>

          <div className="mt-3 text-xs text-slate-500">
            Showing <span className="text-slate-200">{filtered.length}</span> of{" "}
            <span className="text-slate-200">{(items || []).length}</span>
          </div>
        </div>

        {loading ? <div className="text-sm text-slate-400">Loading inbox…</div> : null}

        {!loading && filtered.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/30 p-6 text-slate-400">No requests match your filters.</div>
        ) : null}

        <div className="space-y-3">
          {filtered.map((x) => {
            const id = x?.id;
            const r = String(x?.role || "UNKNOWN").toUpperCase();
            const k = String(x?.kind || "OTHER").toUpperCase();
            const s = String(x?.status || "OPEN").toUpperCase();
            const created = x?.created_at ? new Date(x.created_at).toLocaleString() : "";

            return (
              <div key={id || Math.random()} className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-100 truncate">{x?.title || "(No title)"}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {created ? <span>{created}</span> : null}
                      {created ? <span className="mx-2">•</span> : null}
                      {x?.business_id ? (
                        <span>
                          Business: <span className="text-slate-200">#{x.business_id}</span>
                        </span>
                      ) : (
                        <span>Business: —</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone={roleTone(r)}>{r}</Badge>
                    <Badge tone={kindTone(k)}>{k}</Badge>
                    <Badge tone={statusTone(s)}>{s}</Badge>
                  </div>
                </div>

                <div className="mt-4 text-sm text-slate-200 whitespace-pre-wrap">{x?.body || "(No message body)"}</div>

                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <div className="text-xs text-slate-500">
                    Request ID: <span className="text-slate-200">{id}</span>
                  </div>

                  <div className="ml-auto flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setRequestStatus(id, "IN_PROGRESS")}
                      className="h-9 px-3 rounded-2xl text-xs border bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15 text-amber-200"
                    >
                      In Progress
                    </button>
                    <button
                      type="button"
                      onClick={() => setRequestStatus(id, "RESOLVED")}
                      className="h-9 px-3 rounded-2xl text-xs border bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15 text-emerald-200"
                    >
                      Resolve
                    </button>
                    <button
                      type="button"
                      onClick={() => setRequestStatus(id, "CLOSED")}
                      className="h-9 px-3 rounded-2xl text-xs border bg-slate-500/10 border-slate-500/20 hover:bg-slate-500/15 text-slate-200"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}