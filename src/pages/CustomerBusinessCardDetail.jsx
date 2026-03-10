// src/pages/CustomerBusinessCardDetail.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { favoritesApi } from "../api/client";
import ModeBar from "../components/ModeBar";

export default function CustomerBusinessCardDetail() {
  const nav = useNavigate();
  const { favoriteId } = useParams();

  const [fav, setFav] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      // No detail endpoint by default; just list and pick
      const res = await favoritesApi.list();
      const data = res.data?.results ?? res.data ?? [];
      const item = (Array.isArray(data) ? data : []).find((x) => String(x.id) === String(favoriteId));
      if (!item) throw new Error("Not found");
      setFav(item);
    } catch (e) {
      setErr("Business card not found.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [favoriteId]);

  function bookAgain() {
    const businessId = fav?.business?.id;
    if (!businessId) return;
    nav(`/customer/new-request?business=${businessId}`);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <ModeBar />

      <div className="max-w-3xl mx-auto px-4 py-6">
        <button
          onClick={() => nav("/customer/business-cards")}
          className="text-slate-300 hover:text-white"
        >
          ← Back
        </button>

        {err ? (
          <div className="mt-4 p-3 rounded-xl bg-red-900/40 border border-red-500/40 text-red-100">
            {err}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 text-slate-400">Loading…</div>
        ) : fav ? (
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="text-2xl font-semibold">
              {fav.nickname || fav.business?.name || "Business"}
            </div>

            <div className="text-slate-300 mt-2">
              Base ZIP: <span className="text-slate-100">{fav.business?.base_zip || "—"}</span>
            </div>
            <div className="text-slate-300 mt-1">
              Service Radius:{" "}
              <span className="text-slate-100">{fav.business?.service_radius_miles ?? "—"} mi</span>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={bookAgain}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 transition"
              >
                Book Again
              </button>
              <button
                onClick={() => nav("/customer/new-request")}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition"
              >
                New Request
              </button>
            </div>

            <div className="mt-4 text-xs text-slate-500">
              Added: {fav.created_at ? new Date(fav.created_at).toLocaleString() : "—"}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}