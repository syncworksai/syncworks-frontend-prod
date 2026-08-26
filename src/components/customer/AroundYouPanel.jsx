import React, { useEffect, useMemo, useState } from "react";
import { CloudSun, Compass, MapPinned, MapPin, Route, ShoppingBag, Store, Utensils } from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../../api/client";
import { getBrowserCurrentLocation } from "../../api/locationContext";

const ACTIONS = [
  { label: "Food", detail: "Restaurants, coffee and places to eat.", icon: Utensils, route: "/customer/discover?category=FOOD" },
  { label: "Shopping", detail: "Stores and useful retail nearby.", icon: ShoppingBag, route: "/customer/discover?category=RETAIL" },
  { label: "Weather", detail: "Live conditions and the next hour.", icon: CloudSun, route: "/customer/weather" },
  { label: "Traffic", detail: "Live delays and route timing.", icon: Route, route: "/customer/traffic" },
  { label: "Things to do", detail: "Nearby activities and places to explore.", icon: Compass, route: "/customer/discover?category=EVENTS" },
  { label: "Local services", detail: "Businesses and providers around you.", icon: Store, route: "/customer/discover?category=SERVICES" },
];

function ActionCard({ item, onClick }) {
  const Icon = item.icon;
  return (
    <button type="button" onClick={onClick} className="rounded-2xl border border-white/10 bg-white/[.025] p-3 text-left transition hover:border-cyan-300/25 hover:bg-cyan-500/[.04]">
      <Icon className="h-4 w-4 text-cyan-200" />
      <div className="mt-2 text-sm font-black text-white">{item.label}</div>
      <div className="mt-1 text-[10px] leading-4 text-slate-500">{item.detail}</div>
    </button>
  );
}

export default function AroundYouPanel() {
  const nav = useNavigate();
  const [location, setLocation] = useState(null);
  const [mapUrl, setMapUrl] = useState("");
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";

    async function load() {
      try {
        const current = await getBrowserCurrentLocation({ enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
        if (cancelled) return;
        setLocation(current);
        const response = await api.get("/identity/map-preview/", {
          params: { latitude: current.latitude, longitude: current.longitude, zoom: 12 },
          responseType: "blob",
        });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(response.data);
        setMapUrl(objectUrl);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("location-required");
      }
    }

    load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  const coordinateLabel = useMemo(() => {
    if (!location) return "Current location";
    return `${Number(location.latitude).toFixed(3)}, ${Number(location.longitude).toFixed(3)}`;
  }, [location]);

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-cyan-400/15 bg-slate-950/55">
      <div className="grid xl:grid-cols-[1.15fr_.85fr]">
        <div className="min-w-0 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-200">Around you</div>
              <h2 className="mt-1 text-lg font-black text-white">Live local intelligence</h2>
              <p className="mt-1 text-xs text-slate-500">Food, shopping, weather, traffic and local places from your current location.</p>
            </div>
            <button type="button" onClick={() => nav("/customer/discover")} className="rounded-xl border border-cyan-300/20 bg-cyan-500/[.06] px-3 py-2 text-xs font-black text-cyan-100">Open discovery</button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
            {ACTIONS.map((item) => <ActionCard key={item.label} item={item} onClick={() => nav(item.route)} />)}
          </div>
        </div>

        <div className="relative min-h-[300px] border-t border-white/10 bg-[#06101f] xl:border-l xl:border-t-0">
          {mapUrl ? <img src={mapUrl} alt="Map centered on your current location" className="absolute inset-0 h-full w-full object-cover" /> : null}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#020617]/85 via-transparent to-transparent" />

          <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-slate-950/80 p-3 backdrop-blur-xl">
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-500/10 text-cyan-200"><MapPin className="h-4 w-4" /></span>
              <div className="min-w-0">
                <div className="text-[10px] font-black text-white">{status === "ready" ? "Current location" : status === "loading" ? "Locating you…" : "Location needed"}</div>
                <div className="truncate text-[9px] text-slate-500">{status === "ready" ? coordinateLabel : status === "loading" ? "Preparing your local map" : "Allow browser location to show the map."}</div>
              </div>
            </div>
            <button type="button" onClick={() => nav("/customer/traffic")} className="pointer-events-auto inline-flex min-h-10 items-center gap-2 rounded-xl border border-violet-300/20 bg-violet-500/10 px-3 text-[10px] font-black text-violet-100"><MapPinned className="h-4 w-4" />Live traffic</button>
          </div>
        </div>
      </div>
    </section>
  );
}
