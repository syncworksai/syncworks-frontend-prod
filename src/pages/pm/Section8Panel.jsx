// src/components/pm/Section8Panel.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import Button from "../ui/Button";
import Section8CaseModal from "../../components/pm/Section8CaseModal";

const STATUS_FILTERS = [
  { value: "", label: "ALL" },
  { value: "ACTIVE", label: "ACTIVE" },
  { value: "PENDING", label: "PENDING" },
  { value: "SUSPENDED", label: "SUSPENDED" },
  { value: "TERMINATED", label: "TERMINATED" },
  { value: "CLOSED", label: "CLOSED" },
];

const INSPECTION_FILTERS = [
  { value: "", label: "ALL" },
  { value: "UNKNOWN", label: "UNKNOWN" },
  { value: "SCHEDULED", label: "SCHEDULED" },
  { value: "PASSED", label: "PASSED" },
  { value: "FAILED", label: "FAILED" },
  { value: "REINSPECTION", label: "REINSPECTION" },
];

const ORDERING = [
  { value: "-updated_at", label: "Recently Updated" },
  { value: "-created_at", label: "Newest" },
  { value: "recert_due_date", label: "Recert Due Date" },
  { value: "inspection_scheduled_date", label: "Inspection Scheduled Date" },
];

function Card({ title, subtitle, right, children }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-slate-100 text-sm">{title}</div>
          {subtitle ? <div className="text-[11px] text-slate-400 mt-0.5">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

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
      : tone === "red"
      ? "border-red-500/40 text-red-200 bg-red-500/10"
      : "border-slate-700 text-slate-300 bg-slate-950/40";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] ${cls}`}>
      {children}
    </span>
  );
}

function inputCls() {
  return [
    "w-full h-9 rounded-xl border px-3 text-[13px] outline-none",
    "border-slate-800 bg-slate-950/60 text-slate-100",
    "focus:border-fuchsia-500/40 focus:ring-2 focus:ring-fuchsia-500/10",
  ].join(" ");
}

function formatDate(d) {
  if (!d) return "—";
  try {
    const x = new Date(d);
    if (!Number.isFinite(x.getTime())) return "—";
    return x.toLocaleDateString();
  } catch {
    return "—";
  }
}

function statusTone(s) {
  if (s === "ACTIVE") return "emerald";
  if (s === "PENDING") return "amber";
  if (s === "SUSPENDED") return "red";
  if (s === "TERMINATED") return "red";
  if (s === "CLOSED") return "slate";
  return "slate";
}

function inspTone(s) {
  if (s === "PASSED") return "emerald";
  if (s === "SCHEDULED") return "cyan";
  if (s === "FAILED") return "red";
  if (s === "REINSPECTION") return "amber";
  return "slate";
}

function safeStr(x) {
  return (typeof x === "string" ? x : "")?.trim();
}

function safeDateTime(d) {
  if (!d) return "—";
  try {
    const x = new Date(d);
    if (!Number.isFinite(x.getTime())) return "—";
    return x.toLocaleString();
  } catch {
    return "—";
  }
}

export default function Section8Panel({ onChanged }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [inspection, setInspection] = useState("");
  const [ordering, setOrdering] = useState("-updated_at");

  const [cases, setCases] = useState([]);

  const [openModal, setOpenModal] = useState(false);
  const [editCase, setEditCase] = useState(null);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const params = new URLSearchParams();
      if (q?.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      if (inspection) params.set("inspection_status", inspection);
      if (ordering) params.set("ordering", ordering);

      const url = `/pm/section8/cases/${params.toString() ? `?${params.toString()}` : ""}`;
      const r = await api.get(url);
      const data = r.data;
      const rows = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      setCases(rows);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Failed to load Section 8 cases.");
      setCases([]);
    } finally {
      setLoading(false);
    }
  }

  // initial + whenever filters change (debounced search)
  useEffect(() => {
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, inspection, ordering]);

  const rows = useMemo(() => cases || [], [cases]);

  function openNew() {
    setEditCase(null);
    setOpenModal(true);
  }

  function openEdit(item) {
    setEditCase(item);
    setOpenModal(true);
  }

  async function remove(item) {
    if (!item?.id) return;
    // eslint-disable-next-line no-alert
    const ok = window.confirm("Delete this Section 8 case? This cannot be undone.");
    if (!ok) return;

    try {
      await api.delete(`/pm/section8/cases/${item.id}/`);
      await load();
      onChanged?.();
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e?.response?.data?.detail || e?.message || "Failed to delete case.");
    }
  }

  return (
    <>
      <Card
        title="Section 8 Cases"
        subtitle="Track voucher/HAP, inspections, recerts, housing authority + caseworker info."
        right={
          <div className="flex items-center gap-2">
            <Button tone="slate" onClick={load} disabled={loading}>
              Refresh
            </Button>
            <Button tone="cyan" onClick={openNew}>
              New Case
            </Button>
          </div>
        }
      >
        {err ? (
          <div className="mb-3 text-[13px] text-red-300 bg-red-900/20 border border-red-800 rounded-2xl px-3 py-2">
            {err}
          </div>
        ) : null}

        <div className="grid lg:grid-cols-12 gap-2">
          <div className="lg:col-span-6">
            <div className="text-[11px] text-slate-400 mb-1">Search</div>
            <input
              className={inputCls()}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search voucher, authority, tenant, property, unit..."
            />
          </div>

          <div className="lg:col-span-2">
            <div className="text-[11px] text-slate-400 mb-1">Status</div>
            <select className={inputCls()} value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_FILTERS.map((s) => (
                <option key={s.value || "ALL"} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <div className="text-[11px] text-slate-400 mb-1">Inspection</div>
            <select className={inputCls()} value={inspection} onChange={(e) => setInspection(e.target.value)}>
              {INSPECTION_FILTERS.map((s) => (
                <option key={s.value || "ALL"} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <div className="text-[11px] text-slate-400 mb-1">Order</div>
            <select className={inputCls()} value={ordering} onChange={(e) => setOrdering(e.target.value)}>
              {ORDERING.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 text-[11px] text-slate-400">
          {loading ? "Loading…" : `${rows.length} case${rows.length === 1 ? "" : "s"}`}
        </div>

        <div className="mt-2 overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-[13px]">
            <thead className="bg-slate-950/60 text-slate-300">
              <tr className="text-left">
                <th className="px-3 py-2 w-[96px]">Case</th>
                <th className="px-3 py-2">Property / Unit / Tenant</th>
                <th className="px-3 py-2 w-[120px]">Status</th>
                <th className="px-3 py-2 w-[170px]">Inspection</th>
                <th className="px-3 py-2 w-[190px]">Caseworker</th>
                <th className="px-3 py-2 w-[130px]">Recert</th>
                <th className="px-3 py-2 w-[150px]">Updated</th>
                <th className="px-3 py-2 w-[150px] text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="bg-slate-950/30">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-slate-400">
                    No Section 8 cases yet.
                  </td>
                </tr>
              ) : (
                rows.map((c) => {
                  const agent = safeStr(c.caseworker_name);
                  const agentPhone = safeStr(c.caseworker_phone);
                  const agentEmail = safeStr(c.caseworker_email);

                  return (
                    <tr key={c.id} className="border-t border-slate-800/70 hover:bg-slate-900/25">
                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-100">#{c.id}</div>
                        <div className="text-[11px] text-slate-400">{c.voucher_number || "—"}</div>
                      </td>

                      <td className="px-3 py-2">
                        <div className="text-slate-100 font-medium truncate">{c.property_label || "—"}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                          <span className="text-slate-300">{c.unit_label || "—"}</span>
                          <span className="px-2 text-slate-700">•</span>
                          <span className="text-slate-300">{c.tenant_label || "—"}</span>
                        </div>
                        {c.housing_authority_name ? (
                          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                            Authority: {c.housing_authority_name}
                          </div>
                        ) : null}
                      </td>

                      <td className="px-3 py-2">
                        <Pill tone={statusTone(c.status)}>{c.status || "—"}</Pill>
                      </td>

                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1">
                          <Pill tone={inspTone(c.inspection_status)}>{c.inspection_status || "—"}</Pill>
                          <div className="text-[11px] text-slate-500">Sched: {formatDate(c.inspection_scheduled_date)}</div>
                          <div className="text-[11px] text-slate-500">Done: {formatDate(c.inspection_completed_date)}</div>
                        </div>
                      </td>

                      <td className="px-3 py-2">
                        <div className="text-slate-100 font-medium truncate">{agent || "—"}</div>
                        {(agentPhone || agentEmail) ? (
                          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                            {agentPhone ? <span>{agentPhone}</span> : null}
                            {agentPhone && agentEmail ? <span className="px-2 text-slate-700">•</span> : null}
                            {agentEmail ? <span>{agentEmail}</span> : null}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-600 mt-0.5">—</div>
                        )}
                      </td>

                      <td className="px-3 py-2">
                        <div className="text-slate-200">{formatDate(c.recert_due_date)}</div>
                        <div className="text-[11px] text-slate-500">Subm: {formatDate(c.recert_submitted_date)}</div>
                      </td>

                      <td className="px-3 py-2">
                        <div className="text-slate-200 text-[12px]">{safeDateTime(c.updated_at)}</div>
                      </td>

                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button tone="slate" onClick={() => openEdit(c)}>
                            Edit
                          </Button>
                          <Button tone="slate" onClick={() => remove(c)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Section8CaseModal
        open={openModal}
        mode={editCase ? "edit" : "create"}
        caseItem={editCase}
        onClose={() => setOpenModal(false)}
        onSaved={async () => {
          await load();
          onChanged?.();
        }}
      />
    </>
  );
}
