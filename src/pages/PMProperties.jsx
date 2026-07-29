import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import Button from "../components/ui/Button";

const list = (data) => Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

function propertyImage(property) {
  return property?.image_url || property?.photo_url || property?.cover_image_url || property?.logo_url || "";
}

export default function PMProperties() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const workspace = await api.get("/pm-hub/workspaces/current/");
      const headers = { "X-PM-Workspace-ID": String(workspace.data.id) };
      const response = await api.get("/pm-hub/properties/", { headers });
      setProperties(list(response.data));
    } catch (e) {
      setProperties([]);
      setError(e?.response?.data?.detail || "Could not load the property portfolio.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const occupancy = properties.map((item) => Number(item?.occupancy_rate || 0)).filter((value) => Number.isFinite(value));
    const average = occupancy.length ? Math.round((occupancy.reduce((sum, value) => sum + value, 0) / occupancy.length) * 100) : 0;
    const risk = properties.filter((item) => String(item?.status || "").toUpperCase() === "AT_RISK").length;
    return { total: properties.length, average, risk };
  }, [properties]);

  return (
    <div className="min-h-screen bg-transparent text-slate-100">
      <main className="space-y-6 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-cyan-500/15 bg-gradient-to-r from-cyan-500/10 via-[#07111f] to-fuchsia-500/10 p-5">
          <div><div className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Portfolio Inventory</div><div className="mt-2 text-xl font-black text-white">Properties</div><p className="mt-1 text-sm text-slate-400">Open a property to manage units, occupancy, tenants, documents, and activity.</p></div>
          <div className="flex gap-2"><Button tone="slate" onClick={load} disabled={loading}>Refresh</Button><Button tone="cyan" onClick={() => nav("/pm/properties/new")}>Add Property</Button></div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[["Total Properties", stats.total, "Portfolio inventory"], ["Average Occupancy", `${stats.average}%`, "Across recorded properties"], ["At Risk", stats.risk, "Requires attention"]].map(([label, value, hint]) => <div key={label} className="rounded-3xl border border-cyan-500/15 bg-[#07111f]/95 p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</div><div className="mt-3 text-3xl font-black text-white">{value}</div><div className="mt-2 text-xs text-slate-500">{hint}</div></div>)}
        </div>

        {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}

        <section className="rounded-[28px] border border-cyan-500/15 bg-[#07111f]/90 p-4 sm:p-5">
          {loading ? <div className="py-16 text-center text-sm text-slate-500">Loading properties...</div> : properties.length ? (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {properties.map((property, index) => {
                const image = propertyImage(property);
                const occupancy = Math.round(Number(property?.occupancy_rate || 0) * 100);
                return <button key={property.id} type="button" onClick={() => nav(`/pm/properties/${property.id}`)} className="group overflow-hidden rounded-3xl border border-slate-700/80 bg-black/25 text-left transition hover:-translate-y-0.5 hover:border-cyan-400/45 hover:shadow-[0_18px_50px_rgba(34,211,238,0.08)]">
                  <div className="relative h-40 overflow-hidden bg-gradient-to-br from-cyan-500/20 via-[#07111f] to-fuchsia-500/20">
                    {image ? <img src={image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center"><div className="text-5xl font-black text-cyan-200/25">{String(property.name || index + 1).slice(0, 1).toUpperCase()}</div></div>}
                    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#030814] to-transparent" />
                  </div>
                  <div className="p-5"><div className="flex items-start justify-between gap-3"><div><div className="text-lg font-black text-white">{property.name || "Unnamed Property"}</div><div className="mt-1 text-xs text-slate-500">{[property.address, property.city, property.state].filter(Boolean).join(", ") || "Address not entered"}</div></div><span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-bold text-cyan-200">OPEN</span></div><div className="mt-5"><div className="flex justify-between text-xs"><span className="text-slate-500">Occupancy</span><span className="font-bold text-white">{occupancy}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" style={{ width: `${Math.min(100, Math.max(0, occupancy))}%` }} /></div></div></div>
                </button>;
              })}
            </div>
          ) : <div className="rounded-3xl border border-dashed border-slate-700 py-16 text-center"><div className="text-sm text-slate-500">No properties have been added yet.</div><div className="mt-4"><Button tone="cyan" onClick={() => nav("/pm/properties/new")}>Add First Property</Button></div></div>}
        </section>
      </main>
    </div>
  );
}
