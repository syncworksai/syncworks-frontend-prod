import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";

const TYPES = [
  "UNCLASSIFIED",
  "REAL_USER",
  "BETA_TESTER",
  "TEST_ACCOUNT",
  "DEMO",
  "INTERNAL",
  "BILLING_RESTRICTED",
  "SUSPENDED",
];

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.value)) return data.value;
  return [];
}

export default function GodModeLiveUsers({ onMetrics }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (query.trim()) params.q = query.trim();
      if (filter) params.classification = filter;
      const response = await api.get("/platform/users/", { params });
      setUsers(normalizeList(response.data));
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not load the registered SyncWorks users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filter]);

  const metrics = useMemo(() => ({
    real: users.filter((u) => u.classification === "REAL_USER").length,
    beta: users.filter((u) => u.classification === "BETA_TESTER").length,
    test: users.filter((u) => ["TEST_ACCOUNT", "DEMO"].includes(u.classification)).length,
    total: users.length,
  }), [users]);

  useEffect(() => { onMetrics?.(metrics); }, [metrics, onMetrics]);

  async function classify(user, classification) {
    setSaving(String(user.id));
    setError("");
    try {
      const response = await api.patch(`/platform/users/${user.id}/`, {
        classification,
        note: user.classification_note || "",
      });
      setUsers((current) => current.map((item) => item.id === user.id ? response.data : item));
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not save this classification.");
    } finally {
      setSaving("");
    }
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-cyan-400/20 bg-[#061127]/90 shadow-[0_24px_80px_rgba(0,0,0,.35)]">
      <div className="flex flex-col gap-3 border-b border-white/10 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">Live Account Directory</div>
          <h2 className="mt-1 text-2xl font-black text-white">Registered SyncWorks Users</h2>
          <p className="mt-1 text-sm text-slate-400">This list comes from the production user database. Classifications save across devices.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="Search name or email" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white">
            <option value="">All classifications</option>
            {TYPES.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}
          </select>
          <button onClick={load} className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-black text-white">Refresh</button>
        </div>
      </div>

      {error && <div className="m-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</div>}
      {loading ? <div className="p-8 text-center text-slate-400">Loading registered users…</div> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-500">
              <tr><th className="p-4">User</th><th className="p-4">Joined</th><th className="p-4">Last login</th><th className="p-4">Businesses</th><th className="p-4">Status</th><th className="p-4">Classification</th></tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-white/5 hover:bg-cyan-400/[.03]">
                  <td className="p-4"><div className="font-black text-white">{user.display_name || user.email}</div><div className="text-xs text-slate-500">{user.email}</div>{user.suggested_classification && user.classification === "UNCLASSIFIED" && <div className="mt-1 text-[10px] font-bold text-amber-300">Suggested: {user.suggested_classification.replaceAll("_", " ")}</div>}</td>
                  <td className="p-4 text-slate-400">{user.date_joined ? new Date(user.date_joined).toLocaleDateString() : "—"}</td>
                  <td className="p-4 text-slate-400">{user.last_login ? new Date(user.last_login).toLocaleString() : "Never"}</td>
                  <td className="p-4 font-bold text-white">{user.businesses_count ?? 0}</td>
                  <td className="p-4"><span className={`rounded-full border px-2 py-1 text-[10px] font-black ${user.is_active ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-rose-400/30 bg-rose-400/10 text-rose-300"}`}>{user.is_active ? "ACTIVE" : "INACTIVE"}</span></td>
                  <td className="p-4"><select disabled={saving === String(user.id)} value={user.classification || "UNCLASSIFIED"} onChange={(e) => classify(user, e.target.value)} className="min-w-[190px] rounded-xl border border-cyan-400/20 bg-slate-950 px-3 py-2 text-sm text-white disabled:opacity-50">{TYPES.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!users.length && <div className="p-8 text-center text-slate-500">No users matched this filter.</div>}
        </div>
      )}
    </section>
  );
}
