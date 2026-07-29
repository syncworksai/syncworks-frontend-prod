import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import Button from "../components/ui/Button";

const list = (data) => Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
const label = (value) => String(value || "OPEN").replaceAll("_", " ");

export default function PMWorkOrders() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/pm/work-orders/");
      setOrders(list(response.data));
    } catch (e) {
      setOrders([]);
      setError(e?.response?.data?.detail || "Could not load work orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    total: orders.length,
    urgent: orders.filter((item) => ["URGENT", "EMERGENCY", "HIGH"].includes(String(item?.priority || "").toUpperCase())).length,
    open: orders.filter((item) => !["COMPLETED", "CLOSED", "CANCELLED"].includes(String(item?.status || "OPEN").toUpperCase())).length,
    completed: orders.filter((item) => ["COMPLETED", "CLOSED"].includes(String(item?.status || "").toUpperCase())).length,
  }), [orders]);

  const visible = useMemo(() => orders.filter((item) => {
    if (filter === "ALL") return true;
    if (filter === "URGENT") return ["URGENT", "EMERGENCY", "HIGH"].includes(String(item?.priority || "").toUpperCase());
    if (filter === "OPEN") return !["COMPLETED", "CLOSED", "CANCELLED"].includes(String(item?.status || "OPEN").toUpperCase());
    return ["COMPLETED", "CLOSED"].includes(String(item?.status || "").toUpperCase());
  }), [orders, filter]);

  return (
    <div className="min-h-screen bg-transparent text-slate-100">
      <main className="space-y-6 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-cyan-500/15 bg-gradient-to-r from-cyan-500/10 via-[#07111f] to-fuchsia-500/10 p-5">
          <div><div className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Maintenance Operations</div><div className="mt-2 text-xl font-black text-white">Work Order Queue</div><p className="mt-1 text-sm text-slate-400">Prioritize maintenance, ownership, status, and response across the portfolio.</p></div>
          <Button tone="slate" onClick={load} disabled={loading}>Refresh Queue</Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[["Total", stats.total, "All requests", "cyan"], ["Urgent", stats.urgent, "Immediate attention", "rose"], ["Open", stats.open, "In the active queue", "amber"], ["Completed", stats.completed, "Resolved requests", "emerald"]].map(([name, value, hint, tone]) => <div key={name} className={`rounded-3xl border bg-[#07111f]/95 p-5 ${tone === "rose" ? "border-rose-500/20" : tone === "amber" ? "border-amber-500/20" : tone === "emerald" ? "border-emerald-500/20" : "border-cyan-500/20"}`}><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{name}</div><div className="mt-3 text-3xl font-black text-white">{value}</div><div className="mt-2 text-xs text-slate-500">{hint}</div></div>)}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">{["ALL", "URGENT", "OPEN", "COMPLETED"].map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={`min-h-10 shrink-0 rounded-2xl border px-4 text-xs font-black ${filter === item ? "border-cyan-400/45 bg-cyan-500/15 text-cyan-100" : "border-slate-700 bg-[#07111f] text-slate-400"}`}>{item}</button>)}</div>

        {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}

        <section className="rounded-[28px] border border-cyan-500/15 bg-[#07111f]/90 p-4 sm:p-5">
          {loading ? <div className="py-16 text-center text-sm text-slate-500">Loading work orders...</div> : visible.length ? <div className="grid gap-3">{visible.map((item) => {
            const priority = String(item?.priority || "NORMAL").toUpperCase();
            const urgent = ["URGENT", "EMERGENCY", "HIGH"].includes(priority);
            return <article key={item.id} className="rounded-3xl border border-slate-700/70 bg-black/25 p-4 transition hover:border-cyan-500/30 sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-black text-white">{item.title || "Work Order"}</h2><span className={`rounded-full border px-2.5 py-1 text-[9px] font-black ${urgent ? "border-rose-500/35 bg-rose-500/10 text-rose-200" : "border-cyan-500/25 bg-cyan-500/10 text-cyan-200"}`}>{priority}</span></div><div className="mt-2 text-xs text-slate-500">{item.property_name || item.property?.name || "Portfolio property"}{item.unit_label ? ` · ${item.unit_label}` : ""}</div>{item.description ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">{item.description}</p> : null}</div><div className="shrink-0 rounded-2xl border border-slate-700 bg-[#07111f] px-4 py-3 text-right"><div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Status</div><div className="mt-1 text-xs font-black text-cyan-100">{label(item.status)}</div></div></div></article>;
          })}</div> : <div className="rounded-3xl border border-dashed border-slate-700 py-16 text-center text-sm text-slate-500">No work orders match this view.</div>}
        </section>
      </main>
    </div>
  );
}
