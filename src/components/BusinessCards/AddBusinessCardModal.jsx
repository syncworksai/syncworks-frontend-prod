// src/components/BusinessCards/BusinessCardsPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import Button from "../ui/Button";

import AddBusinessCardModal from "./AddBusinessCardModal";
import BarcodeScannerModal from "./BarcodeScannerModal";
import StarRating from "./StarRating";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function safeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

function Card({ title, subtitle, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/45 backdrop-blur p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-extrabold text-slate-100 truncate">{title}</div>
          {subtitle ? <div className="text-sm text-slate-400 mt-1">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function toBusiness(fav) {
  return fav?.business || null;
}

function toBusinessId(fav) {
  return fav?.business?.id ?? null;
}

function toBusinessName(fav) {
  return fav?.business?.name ?? "Business";
}

function toBusinessCardCode(fav) {
  return fav?.business?.business_card_code ?? fav?.business_card_code ?? "";
}

export default function BusinessCardsPanel() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [favorites, setFavorites] = useState([]);

  const [addOpen, setAddOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const favoritesByBizId = useMemo(() => {
    const m = new Map();
    (favorites || []).forEach((f) => {
      const bid = toBusinessId(f);
      if (bid != null) m.set(String(bid), f);
    });
    return m;
  }, [favorites]);

  async function loadFavorites() {
    setErr("");
    setLoading(true);
    try {
      const r = await api.get("/me/favorites/businesses/");
      setFavorites(safeList(r.data));
    } catch (e) {
      setFavorites([]);
      setErr(e?.response?.data?.detail || e?.message || "Failed to load business cards");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFavorites();
  }, []);

  async function resolveAndAddByCode(codeRaw) {
    const code = String(codeRaw || "").trim();
    if (!code) return;

    setErr("");
    try {
      // 1) resolve
      const res = await api.get("/me/business-cards/resolve/", { params: { code } });
      const biz = res?.data?.business || null;
      const bizId = biz?.id;

      if (!bizId) {
        setErr("Could not resolve that code. Ask the business to verify their SW- code.");
        return;
      }

      // already favorited?
      if (favoritesByBizId.has(String(bizId))) {
        setErr("That business is already saved in your Business Cards.");
        return;
      }

      // 2) add favorite
      await api.post("/me/favorites/businesses/", { business_id: Number(bizId) });

      setAddOpen(false);
      setScanOpen(false);

      // 3) refresh list
      await loadFavorites();
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.code?.[0] ||
        e?.response?.data?.non_field_errors?.[0] ||
        e?.message ||
        "Failed to add business card";
      setErr(msg);
    }
  }

  async function removeFavorite(fav) {
    const id = fav?.id;
    if (!id) {
      await loadFavorites();
      return;
    }

    setErr("");
    try {
      await api.delete(`/me/favorites/businesses/${id}/`);
      await loadFavorites();
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Failed to remove business card");
    }
  }

  return (
    <div className="space-y-4">
      {err ? (
        <div className="rounded-2xl border border-red-900/50 bg-red-950/30 text-red-200 p-3 text-sm">
          {err}
        </div>
      ) : null}

      <Card
        title="Business Cards"
        subtitle="Save providers you trust — scan their QR or type their SW- code."
        right={
          <div className="flex gap-2 flex-wrap justify-end">
            <Button tone="cyan" onClick={() => setScanOpen(true)} disabled={loading}>
              Scan QR
            </Button>
            <Button tone="indigo" onClick={() => setAddOpen(true)} disabled={loading}>
              Add by Code
            </Button>
            <Button tone="slate" onClick={loadFavorites} disabled={loading}>
              {loading ? "Loading…" : "Refresh"}
            </Button>
          </div>
        }
      >
        {loading ? (
          <div className="text-sm text-slate-400">Loading…</div>
        ) : favorites.length === 0 ? (
          <div className="text-sm text-slate-400">
            No business cards yet. Tap <b>Scan QR</b> or <b>Add by Code</b>.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {favorites.map((fav) => {
              const biz = toBusiness(fav);
              const bid = toBusinessId(fav);
              const name = toBusinessName(fav);
              const code = toBusinessCardCode(fav);

              return (
                <div
                  key={fav?.id ?? `${bid}-${name}`}
                  className="rounded-3xl border border-slate-800 bg-slate-950/55 p-5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-100 truncate">{name}</div>
                      <div className="mt-2 text-xs text-slate-400">
                        ID: <span className="text-slate-200">{bid ?? "—"}</span>
                      </div>
                      {code ? (
                        <div className="mt-1 text-xs text-slate-500">
                          Card: <span className="font-mono text-slate-300">{code}</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="shrink-0">
                      <StarRating value={biz?.rating ?? 0} />
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2 flex-wrap">
                    <Button
                      tone="cyan"
                      onClick={() => {
                        // Prefill business for new request
                        try {
                          localStorage.setItem("sw_customer_pref_business_id", String(bid || ""));
                        } catch {}
                        window.location.href = `/customer/new-request?business_id=${encodeURIComponent(String(bid || ""))}`;
                      }}
                      disabled={!bid}
                    >
                      Book Again
                    </Button>

                    <Button tone="slate" onClick={() => removeFavorite(fav)}>
                      Remove
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modals */}
      <AddBusinessCardModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={(code) => resolveAndAddByCode(code)}
      />

      <BarcodeScannerModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onDetected={(raw) => resolveAndAddByCode(raw)}
      />
    </div>
  );
}