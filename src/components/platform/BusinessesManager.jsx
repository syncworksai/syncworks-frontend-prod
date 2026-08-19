import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import api from "../../api/client";

const CHECK_LABELS = {
  email: "Email",
  phone: "Phone",
  identity: "Owner identity",
  business_details: "Business details",
  payment: "Payment",
  license: "License",
  insurance: "Insurance",
  background: "Background",
};
const FIELD_BY_CHECK = {
  email: "email_verified",
  phone: "phone_verified",
  identity: "identity_verified",
  business_details: "business_details_verified",
  payment: "payment_verified",
  license: "license_verified",
  insurance: "insurance_verified",
  background: "background_verified",
};

function VerificationQueue() {
  const [filter, setFilter] = useState("IN_REVIEW");
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");

  async function load(nextFilter = filter) {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/identity/platform/verifications/?status=${encodeURIComponent(nextFilter)}`);
      setRows(Array.isArray(response?.data?.results) ? response.data.results : []);
      setCounts(response?.data?.counts || {});
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to load verification queue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(filter); }, [filter]);

  async function saveRow(row, patch) {
    const id = row?.business?.id;
    if (!id) return;
    setSaving(String(id));
    setError("");
    try {
      await api.patch(`/identity/platform/businesses/${id}/trust/`, patch);
      await load(filter);
    } catch (err) {
      setError(err?.response?.data?.detail || "Verification update failed.");
    } finally {
      setSaving("");
    }
  }

  return (
    <section className="mb-5 rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/[.06] via-slate-950 to-violet-500/[.06] p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-cyan-100"><ShieldCheck className="h-5 w-5" /><span className="font-black">Business Verification Queue</span></div>
          <div className="mt-1 text-xs leading-5 text-slate-400">Review exactly what SyncWorks has verified. A badge is never granted by business self-report.</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {["IN_REVIEW", "VERIFIED", "REJECTED", "ALL"].map((value) => (
            <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-xl border px-3 py-2 text-xs font-black ${filter === value ? "border-cyan-300/40 bg-cyan-500/15 text-cyan-100" : "border-slate-800 bg-slate-950 text-slate-400"}`}>
              {value.replaceAll("_", " ")} {value !== "ALL" && counts[value] !== undefined ? `(${counts[value]})` : ""}
            </button>
          ))}
          <button type="button" onClick={() => load(filter)} className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-300"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
        </div>
      </div>

      {error ? <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</div> : null}

      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <article key={row.business.id} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-base font-black text-white">{row.business.name}</div>
                  <span className="rounded-full border border-white/10 bg-white/[.04] px-2 py-1 text-[10px] font-black text-slate-300">{row.status}</span>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-black text-cyan-100">{row.verified_count}/{row.total_checks} checks</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">{row.business.business_email || "No business email"} • {row.business.phone || "No phone"} • {[row.business.city, row.business.state].filter(Boolean).join(", ") || "No public location"}</div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {Object.entries(row.checks || {}).map(([key, value]) => (
                    <button key={key} type="button" disabled={saving === String(row.business.id)} onClick={() => saveRow(row, { [FIELD_BY_CHECK[key]]: !value })} className={`flex min-h-10 items-center gap-2 rounded-xl border px-3 text-left text-xs font-bold ${value ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100" : "border-slate-800 bg-slate-900 text-slate-400"}`}>
                      {value ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}{CHECK_LABELS[key] || key}
                    </button>
                  ))}
                </div>
                <textarea defaultValue={row.review_notes || ""} onBlur={(event) => { if (event.target.value !== (row.review_notes || "")) saveRow(row, { review_notes: event.target.value }); }} placeholder="Internal verification notes..." rows={2} className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100" />
                <div className="mt-2 text-[11px] leading-4 text-slate-600">{row.disclaimer}</div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button type="button" disabled={saving === String(row.business.id)} onClick={() => saveRow(row, { status: "VERIFIED" })} className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-100"><CheckCircle2 className="mr-1 inline h-4 w-4" />Verify</button>
                <button type="button" disabled={saving === String(row.business.id)} onClick={() => saveRow(row, { status: "REJECTED" })} className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-black text-rose-100"><XCircle className="mr-1 inline h-4 w-4" />Reject</button>
              </div>
            </div>
          </article>
        ))}
        {!loading && !rows.length ? <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">No businesses in this verification view.</div> : null}
      </div>
    </section>
  );
}

export default function BusinessesManager() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      const res = await api.get(`/platform/businesses/?q=${encodeURIComponent(q || "")}`);
      const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setItems(list);
    } catch (e) {
      setErr("Failed to load businesses.");
    }
  }

  useEffect(() => { load(); }, []);

  async function lock(id) {
    const reason = window.prompt("Lock reason:", "Past due billing");
    if (!reason) return;
    setMsg(""); setErr("");
    try { await api.post(`/platform/businesses/${id}/lock/`, { reason }); setMsg("Locked"); await load(); } catch { setErr("Lock failed."); }
  }

  async function unlock(id) {
    if (!window.confirm("Unlock this business?")) return;
    setMsg(""); setErr("");
    try { await api.post(`/platform/businesses/${id}/unlock/`); setMsg("Unlocked"); await load(); } catch { setErr("Unlock failed."); }
  }

  async function message(id) {
    const title = window.prompt("Title:", "Action Needed");
    if (!title) return;
    const body = window.prompt("Body:", "Please update billing method today.");
    if (!body) return;
    setMsg(""); setErr("");
    try { await api.post(`/platform/businesses/${id}/message-owner/`, { title, body }); setMsg("Message sent"); } catch { setErr("Message failed."); }
  }

  return (
    <>
      <VerificationQueue />
      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div><div className="font-semibold">Businesses</div><div className="mt-1 text-xs text-slate-400">Search, message, and lock/unlock immediately.</div></div>
          <button className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm hover:bg-slate-900" onClick={load}>Refresh</button>
        </div>
        {msg ? <div className="mt-3 rounded-xl border border-emerald-800 bg-emerald-900/10 p-3 text-sm text-emerald-200">{msg}</div> : null}
        {err ? <div className="mt-3 rounded-xl border border-red-800 bg-red-900/20 p-3 text-sm text-red-200">{err}</div> : null}
        <div className="mt-4 flex gap-2"><input className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm" placeholder="Search by name..." value={q} onChange={(e) => setQ(e.target.value)} /><button className="rounded-xl border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-sm font-semibold hover:bg-cyan-500/30" onClick={load}>Search</button></div>
        <div className="mt-4 space-y-2">
          {items.map((b) => (
            <div key={b.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div><div className="font-semibold">{b.name}</div><div className="mt-1 text-xs text-slate-500">Members: {b.members_count ?? "-"} • Card: <b>{b.stripe_setup_complete ? "Yes" : "No"}</b> • Locked: <b className={b.is_locked ? "text-rose-300" : "text-emerald-300"}>{b.is_locked ? "Yes" : "No"}</b>{b.lock_reason ? <span> • {b.lock_reason}</span> : null}</div>{(b.next_due_date || b.grace_until) ? <div className="mt-1 text-xs text-slate-500">Due: {b.next_due_date || "-"} • Grace: {b.grace_until || "-"}</div> : null}</div>
                <div className="flex flex-wrap gap-2"><button className="rounded-xl border border-indigo-500/40 bg-indigo-500/20 px-3 py-2 text-xs hover:bg-indigo-500/30" onClick={() => message(b.id)}>Message</button>{!b.is_locked ? <button className="rounded-xl border border-rose-500/40 bg-rose-500/20 px-3 py-2 text-xs hover:bg-rose-500/30" onClick={() => lock(b.id)}>Lock</button> : <button className="rounded-xl border border-emerald-500/40 bg-emerald-500/20 px-3 py-2 text-xs hover:bg-emerald-500/30" onClick={() => unlock(b.id)}>Unlock</button>}</div>
              </div>
            </div>
          ))}
          {!items.length ? <div className="text-slate-400">No businesses found.</div> : null}
        </div>
      </div>
    </>
  );
}
