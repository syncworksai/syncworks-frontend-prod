// src/pages/CustomerBusinessCards.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import api, { favoritesApi } from "../api/client";
import ModeBar from "../components/ModeBar";

function normalizeCode(v) {
  return (v || "").trim();
}

export default function CustomerBusinessCards() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [err, setErr] = useState("");

  const [code, setCode] = useState("");
  const [adding, setAdding] = useState(false);

  // For QR preview: encode ONLY the code (works offline/local)
  const qrValue = useMemo(() => {
    const c = normalizeCode(code);
    if (!c) return "";
    // Later we can change this to a deep link or hosted URL.
    // For now: QR contains the raw business card code.
    return c;
  }, [code]);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const res = await favoritesApi.list();
      const data = res.data?.results ?? res.data ?? [];
      setFavorites(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to load business cards.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addByCode() {
    const c = normalizeCode(code);
    if (!c) return;

    setErr("");
    setAdding(true);
    try {
      // We need an endpoint to resolve code -> business.
      // TEMP approach: ask backend for business by code via query param.
      // If you don’t have it yet, we’ll add a tiny endpoint next.
      const res = await api.get(`/me/business-cards/resolve/`, { params: { code: c } });
      const business = res.data?.business;
      if (!business?.id) throw new Error("Invalid code");

      await favoritesApi.add(business.id);
      setCode("");
      await load();
    } catch (e) {
      setErr(
        e?.response?.data?.detail ||
          "Could not add business card. Check the code and try again."
      );
    } finally {
      setAdding(false);
    }
  }

  async function removeFavorite(favId) {
    setErr("");
    try {
      await favoritesApi.remove(favId);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to remove business card.");
    }
  }

  function openCard(fav) {
    // Route to a detail page (below)
    nav(`/customer/business-cards/${fav.id}`);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <ModeBar />

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Business Cards</h1>
            <p className="text-slate-300 mt-1">
              Save your favorite providers so you can book them again fast.
            </p>
          </div>

          <button
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition"
            onClick={() => nav("/customer/new-request")}
          >
            New Request
          </button>
        </div>

        {err ? (
          <div className="mt-4 p-3 rounded-xl bg-red-900/40 border border-red-500/40 text-red-100">
            {err}
          </div>
        ) : null}

        {/* Add by code */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1">
              <div className="text-sm text-slate-300 mb-1">Add a business card</div>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste code (ex: SW-fbYYoD_TVGplB7QG)"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 outline-none focus:border-slate-600"
              />
              <div className="text-xs text-slate-400 mt-2">
                Tip: For now the QR can just contain the code. Later it’ll open a link.
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                disabled={adding || !normalizeCode(code)}
                onClick={addByCode}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition"
              >
                {adding ? "Adding..." : "Add"}
              </button>

              <div className="w-[110px] h-[110px] rounded-xl bg-white flex items-center justify-center">
                {qrValue ? <QRCodeCanvas value={qrValue} size={92} /> : null}
              </div>
            </div>
          </div>
        </div>

        {/* Favorites list */}
        <div className="mt-6">
          <div className="text-sm text-slate-300 mb-2">
            Your saved businesses ({favorites.length})
          </div>

          {loading ? (
            <div className="text-slate-400">Loading…</div>
          ) : favorites.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-slate-300">
              No business cards yet. Add one using a code or after you place an order.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {favorites.map((fav) => (
                <div
                  key={fav.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 hover:border-slate-700 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-lg font-semibold truncate">
                        {fav.nickname || fav.business?.name || "Business"}
                      </div>
                      <div className="text-sm text-slate-400 mt-1">
                        ZIP: {fav.business?.base_zip || "—"} • Radius:{" "}
                        {fav.business?.service_radius_miles ?? "—"} mi
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => openCard(fav)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 transition text-sm"
                      >
                        Open
                      </button>
                      <button
                        onClick={() => removeFavorite(fav.id)}
                        className="px-3 py-1.5 rounded-xl bg-red-900/40 hover:bg-red-900/60 transition text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-slate-500">
                    Added: {fav.created_at ? new Date(fav.created_at).toLocaleString() : "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}