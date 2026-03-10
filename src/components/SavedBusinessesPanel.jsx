// src/components/SavedBusinessesPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import Button from "./ui/Button";

function safeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

export default function SavedBusinessesPanel({
  title = "Saved Businesses",
  subtitle = "Reuse your favorite providers fast (like ‘Order Again’).",
  compact = false,
  showCreateRequest = true,
}) {
  const nav = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const r = await api.get("/me/favorites/businesses/");
      setItems(safeList(r.data));
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Failed to load saved businesses");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function removeFavorite(id) {
    try {
      await api.delete(`/me/favorites/businesses/${id}/`);
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      // keep silent in UI; optionally show toast later
    }
  }

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => {
    if (compact) return items.slice(0, 3);
    return items;
  }, [items, compact]);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-bold">{title}</div>
          {subtitle ? <div className="text-sm text-slate-400 mt-1">{subtitle}</div> : null}
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button tone="slate" onClick={load} disabled={loading}>
            Refresh
          </Button>

          {showCreateRequest ? (
            <Button tone="cyan" onClick={() => nav("/customer/new-request")}>
              + New Request
            </Button>
          ) : null}
        </div>
      </div>

      {err ? (
        <div className="mt-4 text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-xl p-3">{err}</div>
      ) : null}

      {loading ? <div className="mt-4 text-sm text-slate-400">Loading…</div> : null}

      <div className="mt-5 space-y-2">
        {!loading && rows.length === 0 ? (
          <div className="text-sm text-slate-400">
            No saved businesses yet. When you complete a ticket, you’ll be able to save that provider for 1-tap reuse.
          </div>
        ) : null}

        {rows.map((fav) => {
          const b = fav.business || {};
          const name = fav.nickname || b.name || `Business #${fav.business || "?"}`;
          const businessId = b.id || fav.business_id || fav.business;

          return (
            <div
              key={fav.id}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 hover:bg-slate-900/60 p-4 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{name}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {b.base_zip ? `ZIP ${b.base_zip}` : ""}
                    {b.service_radius_miles ? ` • Radius ${b.service_radius_miles}mi` : ""}
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap items-center">
                  <Button
                    tone="cyan"
                    onClick={() => nav(`/customer/new-request?business=${businessId}`)}
                    title="Create a new request to this business"
                  >
                    Request Again
                  </Button>

                  <Button tone="slate" onClick={() => removeFavorite(fav.id)} title="Remove from saved">
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!compact && items.length > 0 ? (
        <div className="mt-4 text-[11px] text-slate-500">
          Tip: Add “Save provider” buttons on Ticket Detail and Completed screens next.
        </div>
      ) : null}
    </div>
  );
}
