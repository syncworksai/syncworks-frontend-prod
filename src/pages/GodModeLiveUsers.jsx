import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";

const TYPES = ["UNCLASSIFIED", "REAL_USER", "BETA_TESTER", "TEST_ACCOUNT", "DEMO", "INTERNAL", "BILLING_RESTRICTED", "SUSPENDED"];
const ROLE_OPTIONS = ["BETA_TESTER", "BUSINESS_OWNER", "PERSONAL", "PM", "EMPLOYEE", "TENANT", "INVESTOR", "AFFILIATE"];
const MODULE_OPTIONS = ["PERSONAL", "BUSINESS", "PROPERTY_MANAGEMENT", "HEALTH", "FINANCE", "SOCIAL_MEDIA", "COLLECT", "MARKETPLACE"];
const SUBSCRIPTION_OPTIONS = ["BUSINESS", "GROWTH_OS", "HEALTH", "PROPERTY_MANAGEMENT"];
const ACQUISITION_OPTIONS = ["UNKNOWN", "DIRECT", "FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK", "YOUTUBE", "X", "GOOGLE", "REFERRAL", "AFFILIATE", "BUSINESS_INVITE", "PM_INVITE", "TENANT_INVITE", "OTHER"];
const USER_TABS = ["overview", "growth", "acquisition", "revenue", "cohorts", "directory"];

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.value)) return data.value;
  return [];
}
function money(cents) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((Number(cents) || 0) / 100); }
function dateKey(value) { const d = new Date(value); return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10); }
function monthKey(value) { const d = new Date(value); return Number.isNaN(d.getTime()) ? "" : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
function monthLabel(key) { if (!key) return "—"; const [y, m] = key.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short", year: "numeric" }); }
function isPaying(user) { return (user.billing_summary?.subscription_statuses || []).some((status) => !["UNKNOWN", "INACTIVE", "CANCELED", "CANCELLED", "NONE"].includes(String(status).toUpperCase())); }
function Metric({ label, value, note, tone = "cyan" }) {
  const tones = tone === "violet" ? "border-violet-400/20" : tone === "emerald" ? "border-emerald-400/20" : tone === "amber" ? "border-amber-400/20" : "border-cyan-400/15";
  return <div className={`rounded-2xl border ${tones} bg-slate-950/55 p-4`}><div className="text-[10px] font-black uppercase tracking-[.16em] text-slate-500">{label}</div><div className="mt-1 text-2xl font-black text-white">{value}</div><div className="mt-1 text-xs text-slate-500">{note}</div></div>;
}
function CheckGrid({ title, options, values, onToggle }) {
  return <div><div className="mb-2 text-xs font-black uppercase tracking-[.14em] text-slate-400">{title}</div><div className="grid gap-2 sm:grid-cols-2">{options.map((option) => { const checked = values.includes(option); return <label key={option} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${checked ? "border-cyan-400/35 bg-cyan-400/10 text-cyan-100" : "border-white/10 bg-slate-950/60 text-slate-400"}`}><input type="checkbox" checked={checked} onChange={() => onToggle(option)} />{option.replaceAll("_", " ")}</label>; })}</div></div>;
}
function BarRows({ rows, total, suffix = "users" }) {
  return <div className="space-y-3">{rows.length ? rows.map(([label, count]) => <div key={label}><div className="flex justify-between text-xs"><span className="font-bold text-slate-300">{String(label).replaceAll("_", " ")}</span><span className="text-white">{count} {suffix}</span></div><div className="mt-1 h-2 rounded-full bg-slate-900"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500" style={{ width: `${total ? Math.max(2, (count / total) * 100) : 0}%` }} /></div></div>) : <div className="py-8 text-center text-sm text-slate-500">No data yet.</div>}</div>;
}

export default function GodModeLiveUsers({ onMetrics }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [edit, setEdit] = useState(null);
  const [userTab, setUserTab] = useState("overview");
  const [growthRange, setGrowthRange] = useState("month");

  async function load() {
    setLoading(true); setError("");
    try { const response = await api.get("/platform/users/"); setUsers(normalizeList(response.data)); }
    catch (err) { setError(err?.response?.data?.detail || "Could not load the registered SyncWorks users."); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const filteredUsers = useMemo(() => users.filter((user) => {
    const q = query.trim().toLowerCase();
    if (filter && user.classification !== filter) return false;
    if (q && !`${user.display_name || ""} ${user.email || ""}`.toLowerCase().includes(q)) return false;
    return true;
  }), [users, query, filter]);

  const metrics = useMemo(() => ({
    real: users.filter((u) => u.classification === "REAL_USER").length,
    beta: users.filter((u) => u.classification === "BETA_TESTER" || u.intelligence?.roles?.includes("BETA_TESTER")).length,
    test: users.filter((u) => ["TEST_ACCOUNT", "DEMO"].includes(u.classification)).length,
    total: users.length,
  }), [users]);
  useEffect(() => { onMetrics?.(metrics); }, [metrics, onMetrics]);

  const analytics = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const days = {}, weeks = {}, months = {}, sources = {}, cohorts = {};
    let attributedRevenue = 0, verifiedRevenue = 0, paid = 0, payable = 0, brought = 0, supplied = 0, verifiedBrought = 0, verifiedSupplied = 0;
    users.forEach((u) => {
      const joined = new Date(u.date_joined);
      if (!Number.isNaN(joined.getTime())) {
        const dk = dateKey(joined); days[dk] = (days[dk] || 0) + 1;
        const wkStart = new Date(joined); wkStart.setDate(wkStart.getDate() - wkStart.getDay()); const wk = dateKey(wkStart); weeks[wk] = (weeks[wk] || 0) + 1;
        const mk = monthKey(joined); months[mk] = (months[mk] || 0) + 1;
        if (!cohorts[mk]) cohorts[mk] = { users: 0, real: 0, paying: 0, verifiedRevenue: 0 };
        cohorts[mk].users += 1; if (u.classification === "REAL_USER") cohorts[mk].real += 1; if (isPaying(u)) cohorts[mk].paying += 1; cohorts[mk].verifiedRevenue += Number(u.verified_value?.platform_revenue_cents || 0);
      }
      const intel = u.intelligence || {}; const source = intel.acquisition_source || "UNKNOWN"; sources[source] = (sources[source] || 0) + 1;
      attributedRevenue += Number(intel.attributed_revenue_cents || 0); paid += Number(intel.paid_cents || 0); payable += Number(intel.payable_cents || 0); brought += Number(intel.customers_brought || 0); supplied += Number(intel.customers_supplied_by_syncworks || 0);
      verifiedRevenue += Number(u.verified_value?.platform_revenue_cents || 0); verifiedBrought += Number(u.verified_value?.customers_brought || 0); verifiedSupplied += Number(u.verified_value?.customers_supplied_by_syncworks || 0);
    });
    const bestMonth = Object.entries(months).sort((a, b) => b[1] - a[1])[0] || ["", 0];
    const growthMap = growthRange === "day" ? days : growthRange === "week" ? weeks : months;
    const growthLimit = growthRange === "day" ? 30 : growthRange === "week" ? 16 : 12;
    const growthRows = Object.entries(growthMap).sort((a, b) => a[0].localeCompare(b[0])).slice(-growthLimit);
    const maxGrowth = Math.max(1, ...growthRows.map(([, count]) => count));
    return {
      today: users.filter((u) => new Date(u.date_joined) >= todayStart).length,
      week: users.filter((u) => new Date(u.date_joined) >= weekStart).length,
      month: users.filter((u) => new Date(u.date_joined) >= monthStart).length,
      payingUsers: users.filter(isPaying).length,
      businessOwners: users.filter((u) => u.intelligence?.detected_roles?.includes("BUSINESS_OWNER") || u.intelligence?.roles?.includes("BUSINESS_OWNER")).length,
      bestMonth, sources, cohorts, growthRows, maxGrowth,
      attributedRevenue, verifiedRevenue, paid, payable, brought, supplied, verifiedBrought, verifiedSupplied,
      avgAttributed: metrics.real ? Math.round(attributedRevenue / metrics.real) : 0,
      avgVerified: metrics.real ? Math.round(verifiedRevenue / metrics.real) : 0,
    };
  }, [users, metrics.real, growthRange]);

  const sourceRows = Object.entries(analytics.sources).sort((a, b) => b[1] - a[1]);
  const cohortRows = Object.entries(analytics.cohorts).sort((a, b) => b[0].localeCompare(a[0]));

  function openUser(user) {
    const intel = user.intelligence || {};
    setSelected(user);
    setEdit({ classification: user.classification || "UNCLASSIFIED", note: user.classification_note || "", roles: [...(intel.roles || [])], modules: [...(intel.modules || [])], subscriptions: [...(intel.subscriptions || [])], acquisition_source: intel.acquisition_source || "UNKNOWN", acquisition_detail: intel.acquisition_detail || "", customers_brought: Number(intel.customers_brought || 0), customers_supplied_by_syncworks: Number(intel.customers_supplied_by_syncworks || 0), attributed_revenue: (Number(intel.attributed_revenue_cents || 0) / 100).toFixed(2), paid: (Number(intel.paid_cents || 0) / 100).toFixed(2), payable: (Number(intel.payable_cents || 0) / 100).toFixed(2) });
  }
  function toggle(key, value) { setEdit((current) => ({ ...current, [key]: current[key].includes(value) ? current[key].filter((x) => x !== value) : [...current[key], value] })); }
  function cents(value) { return Math.max(0, Math.round((Number(value) || 0) * 100)); }
  async function saveUser() {
    if (!selected || !edit) return;
    setSaving(String(selected.id)); setError("");
    try {
      const response = await api.patch(`/platform/users/${selected.id}/`, { classification: edit.classification, note: edit.note, intelligence: { roles: edit.roles, modules: edit.modules, subscriptions: edit.subscriptions, acquisition_source: edit.acquisition_source, acquisition_detail: edit.acquisition_detail, customers_brought: Number(edit.customers_brought || 0), customers_supplied_by_syncworks: Number(edit.customers_supplied_by_syncworks || 0), attributed_revenue_cents: cents(edit.attributed_revenue), paid_cents: cents(edit.paid), payable_cents: cents(edit.payable) } });
      setUsers((current) => current.map((item) => item.id === selected.id ? response.data : item)); setSelected(null); setEdit(null);
    } catch (err) { setError(err?.response?.data?.detail || "Could not save this user profile."); }
    finally { setSaving(""); }
  }

  const growthPanel = <div className="rounded-[24px] border border-cyan-400/15 bg-[#061127]/90 p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><div className="text-xs font-black uppercase tracking-[.18em] text-cyan-300">User Growth</div><h3 className="mt-1 text-xl font-black text-white">Registrations by {growthRange}</h3></div><div className="flex gap-1 rounded-xl border border-white/10 bg-slate-950/70 p-1">{["day", "week", "month"].map((range) => <button key={range} onClick={() => setGrowthRange(range)} className={`rounded-lg px-3 py-1.5 text-xs font-black uppercase ${growthRange === range ? "bg-cyan-400/15 text-cyan-200" : "text-slate-500"}`}>{range}</button>)}</div></div><div className="mt-5 flex h-56 items-end gap-2 overflow-x-auto border-b border-white/10 pb-2">{analytics.growthRows.length ? analytics.growthRows.map(([key, count]) => <div key={key} className="flex min-w-[44px] flex-1 flex-col items-center justify-end gap-2"><div className="text-xs font-black text-white">{count}</div><div className="w-full rounded-t-lg bg-gradient-to-t from-blue-600 via-cyan-400 to-fuchsia-400" style={{ height: `${Math.max(8, (count / analytics.maxGrowth) * 160)}px` }} /><div className="max-w-[70px] truncate text-[9px] text-slate-500">{growthRange === "month" ? monthLabel(key).split(" ")[0] : key.slice(5)}</div></div>) : <div className="m-auto text-sm text-slate-500">Registration history will appear here.</div>}</div></div>;

  const directoryPanel = <div className="overflow-hidden rounded-[28px] border border-cyan-400/20 bg-[#061127]/90 shadow-[0_24px_80px_rgba(0,0,0,.35)]"><div className="flex flex-col gap-3 border-b border-white/10 p-5 lg:flex-row lg:items-center lg:justify-between"><div><div className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">Live Account Directory</div><h2 className="mt-1 text-2xl font-black text-white">Registered SyncWorks Users</h2><p className="mt-1 text-sm text-slate-400">One person can hold multiple roles, products and revenue relationships. Primary classification is separate.</p></div><div className="flex flex-wrap gap-2"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email" className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" /><select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"><option value="">All classifications</option>{TYPES.map((type) => <option key={type}>{type}</option>)}</select><button onClick={load} className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-black text-white">Refresh</button></div></div>{loading ? <div className="p-8 text-center text-slate-400">Loading registered users…</div> : <div className="overflow-x-auto"><table className="w-full min-w-[1280px] text-left text-sm"><thead className="bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="p-4">User</th><th className="p-4">Joined</th><th className="p-4">Roles</th><th className="p-4">Businesses</th><th className="p-4">Source</th><th className="p-4">Customers</th><th className="p-4">Verified Value</th><th className="p-4">Attributed</th><th className="p-4">Billing</th><th className="p-4">Manage</th></tr></thead><tbody>{filteredUsers.map((user) => { const intel = user.intelligence || {}; const verified = user.verified_value || {}; const roles = [...new Set([...(intel.detected_roles || []), ...(intel.roles || [])])]; return <tr key={user.id} className="border-t border-white/5 hover:bg-cyan-400/[.03]"><td className="p-4"><div className="font-black text-white">{user.display_name || user.email}</div><div className="text-xs text-slate-500">{user.email}</div><div className="mt-1 text-[10px] font-bold text-cyan-300">{(user.classification || "UNCLASSIFIED").replaceAll("_", " ")}</div></td><td className="p-4 text-slate-400">{user.date_joined ? new Date(user.date_joined).toLocaleDateString() : "—"}</td><td className="p-4"><div className="flex max-w-[260px] flex-wrap gap-1">{roles.length ? roles.slice(0, 4).map((role) => <span key={role} className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2 py-1 text-[9px] font-bold text-violet-200">{role.replaceAll("_", " ")}</span>) : <span className="text-slate-600">—</span>}</div></td><td className="p-4 font-bold text-white">{user.businesses_count ?? 0}</td><td className="p-4 text-xs text-slate-300">{(intel.acquisition_source || "UNKNOWN").replaceAll("_", " ")}</td><td className="p-4"><div className="font-bold text-white">Verified brought {verified.customers_brought || 0}</div><div className="text-[10px] text-cyan-300">SW supplied {verified.customers_supplied_by_syncworks || 0}</div></td><td className="p-4 font-black text-emerald-300">{money(verified.platform_revenue_cents)}</td><td className="p-4 text-slate-300">{money(intel.attributed_revenue_cents)}</td><td className="p-4"><div className="text-xs text-slate-300">{(user.billing_summary?.subscription_statuses || []).join(", ") || "No subscription"}</div><div className="text-[10px] text-slate-500">{user.billing_summary?.payment_method_ready || 0} payment method ready</div></td><td className="p-4"><button onClick={() => openUser(user)} className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-black text-cyan-100">Manage</button></td></tr>; })}</tbody></table>{!filteredUsers.length && <div className="p-8 text-center text-slate-500">No users matched this filter.</div>}</div>}</div>;

  return <section className="space-y-4">
    <div className="flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/45 p-2">{USER_TABS.map((tab) => <button key={tab} onClick={() => setUserTab(tab)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wide ${userTab === tab ? "bg-cyan-400/15 text-cyan-200 shadow-[inset_0_-2px_0_#22d3ee]" : "text-slate-500 hover:text-white"}`}>{tab}</button>)}</div>
    {error && <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</div>}

    {(userTab === "overview" || userTab === "growth") && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8"><Metric label="New Today" value={analytics.today} note="Registrations" /><Metric label="Last 7 Days" value={analytics.week} note="New accounts" /><Metric label="This Month" value={analytics.month} note="New accounts" /><Metric label="Best Month" value={analytics.bestMonth[1]} note={monthLabel(analytics.bestMonth[0])} /><Metric label="Real Users" value={metrics.real} note="Classified production users" /><Metric label="Paying Users" value={analytics.payingUsers} note="Active billing status" tone="emerald" /><Metric label="Business Owners" value={analytics.businessOwners} note="Detected or assigned" tone="violet" /><Metric label="Conversion" value={`${metrics.total ? Math.round((analytics.payingUsers / metrics.total) * 100) : 0}%`} note="Registered → paying" tone="amber" /></div>}

    {userTab === "overview" && <><div className="grid gap-4 xl:grid-cols-12"><div className="xl:col-span-8">{growthPanel}</div><div className="rounded-[24px] border border-violet-400/15 bg-[#061127]/90 p-5 xl:col-span-4"><div className="text-xs font-black uppercase tracking-[.18em] text-violet-300">Acquisition</div><h3 className="mt-1 text-xl font-black text-white">Where users came from</h3><div className="mt-4"><BarRows rows={sourceRows.slice(0, 8)} total={users.length} /></div></div></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Verified Platform Revenue" value={money(analytics.verifiedRevenue)} note="Collected production platform fees" tone="emerald" /><Metric label="Verified Avg / Real User" value={money(analytics.avgVerified)} note="Verified platform fee value" /><Metric label="Customers They Brought" value={analytics.verifiedBrought} note="Manual/imported business customers" /><Metric label="SyncWorks Supplied" value={analytics.verifiedSupplied} note="Production SyncWorks-sourced customers" tone="violet" /></div></>}
    {userTab === "growth" && growthPanel}
    {userTab === "acquisition" && <div className="grid gap-4 xl:grid-cols-12"><div className="rounded-[24px] border border-violet-400/15 bg-[#061127]/90 p-5 xl:col-span-8"><div className="text-xs font-black uppercase tracking-[.18em] text-violet-300">Acquisition Sources</div><h3 className="mt-1 text-xl font-black text-white">Where registered users came from</h3><div className="mt-5"><BarRows rows={sourceRows} total={users.length} /></div></div><div className="rounded-[24px] border border-amber-400/15 bg-[#061127]/90 p-5 xl:col-span-4"><h3 className="text-xl font-black text-white">Attribution quality</h3><div className="mt-4 text-4xl font-black text-amber-200">{analytics.sources.UNKNOWN || 0}</div><div className="text-sm text-slate-400">users still marked UNKNOWN</div><p className="mt-4 text-sm leading-6 text-slate-400">God Mode does not guess acquisition source. Campaign/referral/UTM capture will reduce Unknown as signup instrumentation is completed.</p></div></div>}
    {userTab === "revenue" && <><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Verified Platform Revenue" value={money(analytics.verifiedRevenue)} note="Collected platform fees" tone="emerald" /><Metric label="Avg Verified / Real User" value={money(analytics.avgVerified)} note="Verified revenue ÷ real users" /><Metric label="Attributed Revenue" value={money(analytics.attributedRevenue)} note="Manual/tracked attribution" tone="violet" /><Metric label="Avg Attributed / Real User" value={money(analytics.avgAttributed)} note="Not a verified payment metric" /></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Tracked Paid" value={money(analytics.paid)} note="Manual relationship tracking" /><Metric label="Tracked Payable" value={money(analytics.payable)} note="Manual relationship tracking" tone="amber" /><Metric label="Verified Customers Brought" value={analytics.verifiedBrought} note="Manual/imported records" /><Metric label="Verified SW Supplied" value={analytics.verifiedSupplied} note="SyncWorks-sourced records" tone="violet" /></div><div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm leading-6 text-emerald-100"><b>Verified</b> uses production customer/invoice records. <b>Attributed</b> is management intelligence you can enter or import. God Mode keeps them separate so growth decisions are not based on invented revenue.</div></>}
    {userTab === "cohorts" && <div className="overflow-hidden rounded-[24px] border border-cyan-400/15 bg-[#061127]/90"><div className="p-5"><div className="text-xs font-black uppercase tracking-[.18em] text-cyan-300">Signup Cohorts</div><h3 className="mt-1 text-xl font-black text-white">Quality by signup month</h3></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-950/70 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="p-4">Month</th><th className="p-4">Registered</th><th className="p-4">Real Users</th><th className="p-4">Paying</th><th className="p-4">Registered → Paying</th><th className="p-4">Verified Revenue</th></tr></thead><tbody>{cohortRows.map(([key, row]) => <tr key={key} className="border-t border-white/5"><td className="p-4 font-black text-white">{monthLabel(key)}</td><td className="p-4">{row.users}</td><td className="p-4">{row.real}</td><td className="p-4">{row.paying}</td><td className="p-4 text-cyan-300">{row.users ? Math.round((row.paying / row.users) * 100) : 0}%</td><td className="p-4 font-black text-emerald-300">{money(row.verifiedRevenue)}</td></tr>)}</tbody></table></div></div>}
    {userTab === "directory" && directoryPanel}

    {selected && edit && <div className="fixed inset-0 z-[100] flex justify-end bg-black/65" onMouseDown={() => setSelected(null)}><aside className="h-full w-full max-w-2xl overflow-y-auto border-l border-cyan-400/25 bg-[#040b1b] p-5 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}><div className="flex items-start justify-between gap-3"><div><div className="text-xs font-black uppercase tracking-[.18em] text-cyan-300">User Control</div><h2 className="mt-1 text-2xl font-black text-white">{selected.display_name || selected.email}</h2><div className="text-sm text-slate-500">{selected.email}</div></div><button onClick={() => setSelected(null)} className="rounded-xl border border-white/10 px-3 py-2 text-sm">Close</button></div><div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-100"><b>God Mode:</b> founder-locked. This user cannot receive God Mode access from this screen.</div><div className="mt-4 grid gap-3 sm:grid-cols-3"><Metric label="Verified Revenue" value={money(selected.verified_value?.platform_revenue_cents)} note="Production platform fees" tone="emerald" /><Metric label="Customers Brought" value={selected.verified_value?.customers_brought || 0} note="Production records" /><Metric label="SW Supplied" value={selected.verified_value?.customers_supplied_by_syncworks || 0} note="Production records" tone="violet" /></div><div className="mt-5 space-y-5"><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-400">Primary classification<select value={edit.classification} onChange={(e) => setEdit((x) => ({ ...x, classification: e.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm text-white">{TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><label className="text-xs font-bold text-slate-400">Acquisition source<select value={edit.acquisition_source} onChange={(e) => setEdit((x) => ({ ...x, acquisition_source: e.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm text-white">{ACQUISITION_OPTIONS.map((source) => <option key={source}>{source}</option>)}</select></label></div><input value={edit.acquisition_detail} onChange={(e) => setEdit((x) => ({ ...x, acquisition_detail: e.target.value }))} placeholder="Campaign, referral code, invite, channel detail…" className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm" /><CheckGrid title="Roles / relationships" options={ROLE_OPTIONS} values={edit.roles} onToggle={(v) => toggle("roles", v)} /><CheckGrid title="Module access / use" options={MODULE_OPTIONS} values={edit.modules} onToggle={(v) => toggle("modules", v)} /><CheckGrid title="Subscriptions / products" options={SUBSCRIPTION_OPTIONS} values={edit.subscriptions} onToggle={(v) => toggle("subscriptions", v)} /><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-400">Customers they brought<input type="number" min="0" value={edit.customers_brought} onChange={(e) => setEdit((x) => ({ ...x, customers_brought: e.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white" /></label><label className="text-xs font-bold text-slate-400">Customers SyncWorks gave them<input type="number" min="0" value={edit.customers_supplied_by_syncworks} onChange={(e) => setEdit((x) => ({ ...x, customers_supplied_by_syncworks: e.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white" /></label></div><div className="grid gap-3 sm:grid-cols-3">{[["attributed_revenue", "Revenue attributed"], ["paid", "Paid to/by user"], ["payable", "Currently payable"]].map(([key, label]) => <label key={key} className="text-xs font-bold text-slate-400">{label}<input type="number" min="0" step="0.01" value={edit[key]} onChange={(e) => setEdit((x) => ({ ...x, [key]: e.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white" /></label>)}</div><label className="text-xs font-bold text-slate-400">Internal note<textarea rows="4" value={edit.note} onChange={(e) => setEdit((x) => ({ ...x, note: e.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white" /></label><div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-xs text-slate-400">Real billing signals: {selected.billing_summary?.billing_profiles || 0} business billing profile(s), {selected.billing_summary?.payment_method_ready || 0} payment method ready, {selected.billing_summary?.locked_businesses || 0} locked. Manual attribution stays separate from verified transaction lineage.</div><button onClick={saveUser} disabled={saving === String(selected.id)} className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 font-black text-white disabled:opacity-50">{saving === String(selected.id) ? "Saving…" : "Save User Intelligence"}</button></div></aside></div>}
  </section>;
}
