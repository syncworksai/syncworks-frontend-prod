// src/components/BusinessCards/BusinessCardsPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";

import AddBusinessCardModal from "./AddBusinessCardModal";
import BarcodeScannerModal from "./BarcodeScannerModal";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function safeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

function IconBtn({ title, tone = "slate", disabled, onClick, children }) {
  const tones = {
    slate: "bg-slate-950/70 border-slate-800 hover:bg-slate-900/60 text-slate-200",
    cyan: "bg-cyan-500/18 border-cyan-500/35 hover:bg-cyan-500/24 text-cyan-100",
    indigo: "bg-indigo-500/18 border-indigo-500/35 hover:bg-indigo-500/24 text-indigo-100",
    emerald: "bg-emerald-500/14 border-emerald-500/28 hover:bg-emerald-500/18 text-emerald-100",
    rose: "bg-rose-500/14 border-rose-500/28 hover:bg-rose-500/18 text-rose-100",
  };

  return (
    <button
      type="button"
      title={title}
      disabled={!!disabled}
      onClick={onClick}
      className={cx(
        "inline-flex items-center justify-center h-9 w-9 rounded-2xl border transition select-none",
        tones[tone] || tones.slate,
        disabled ? "opacity-50 cursor-not-allowed" : ""
      )}
    >
      <span className="text-[14px] leading-none">{children}</span>
    </button>
  );
}

function writeNewRequestPrefill(payload) {
  try {
    localStorage.setItem("sw:new_request_prefill", JSON.stringify(payload || {}));
  } catch {
    // ignore
  }
}

// Rolodex-ish stacked cards (overlap + slight rotation + depth)
function BusinessCard({ fav, index, onRemove, onSchedule }) {
  const biz = fav?.business || {};
  const name = biz?.name || "Business";
  const nickname = fav?.nickname || "";
  const zip = biz?.base_zip || "";
  const radius = biz?.service_radius_miles ?? "";
  const accepts = !!biz?.accepts_marketplace_tickets;

  const logoUrl = biz?.logo_url || biz?.logoUrl || biz?.logo || null;

  const tilt = useMemo(() => {
    const t = ((index % 6) - 3) * 0.6; // -1.8..+1.8
    return t;
  }, [index]);

  const lift = useMemo(() => {
    const y = Math.min(index, 6) * 6;
    return y;
  }, [index]);

  return (
    <div
      className="relative shrink-0"
      style={{
        width: 420,
        maxWidth: "80vw",
        transform: `translateY(${lift}px) rotate(${tilt}deg)`,
      }}
    >
      <div className="rounded-[28px] border border-slate-800 bg-slate-950/55 backdrop-blur shadow-[0_0_60px_rgba(0,0,0,0.45)] overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-cyan-400/80 via-indigo-400/70 to-fuchsia-400/70" />

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider text-slate-500">Business Card</div>
              <div className="text-lg font-extrabold text-slate-100 truncate mt-1">{name}</div>

              {nickname ? (
                <div className="text-xs text-cyan-200/90 mt-1">
                  Nickname: <span className="font-semibold">{nickname}</span>
                </div>
              ) : null}

              <div className="text-sm text-slate-300 mt-3 leading-relaxed">
                <span className="text-slate-400">What they do:</span> Service provider (profile text coming next)
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {zip ? (
                  <span className="text-[11px] px-3 py-1.5 rounded-full border border-slate-800 bg-slate-950/70 text-slate-200">
                    ZIP {zip}
                  </span>
                ) : null}
                {radius !== "" ? (
                  <span className="text-[11px] px-3 py-1.5 rounded-full border border-slate-800 bg-slate-950/70 text-slate-200">
                    Radius {radius} mi
                  </span>
                ) : null}
                <span
                  className={cx(
                    "text-[11px] px-3 py-1.5 rounded-full border font-semibold",
                    accepts
                      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-200"
                      : "bg-rose-500/10 border-rose-500/25 text-rose-200"
                  )}
                >
                  {accepts ? "Accepting jobs" : "Not accepting jobs"}
                </span>
              </div>
            </div>

            <div className="shrink-0 w-[124px] h-[124px] rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden relative">
              {logoUrl ? (
                <img src={logoUrl} alt={name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-slate-500 text-xs">Photo</div>
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-indigo-500/10 to-fuchsia-500/10" />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={onSchedule}
              className="inline-flex items-center justify-center h-10 text-xs rounded-2xl px-4 bg-cyan-500/18 border border-cyan-500/35 hover:bg-cyan-500/24 text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.10)]"
              title="Start a new request with this business (prefill)"
            >
              ↻ Schedule again
            </button>

            <div className="flex items-center gap-2">
              <IconBtn title="Remove from favorites" tone="rose" onClick={onRemove}>
                🗑️
              </IconBtn>
            </div>
          </div>

          <div className="mt-3 text-[11px] text-slate-500">
            Favorite ID: <span className="font-mono text-slate-300">{fav?.id}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BusinessCardsPanel() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [openAdd, setOpenAdd] = useState(false);
  const [openScan, setOpenScan] = useState(false);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const r = await api.get("/me/favorites/businesses/");
      setItems(safeList(r.data));
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Failed to load business cards");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function removeFavorite(favId) {
    const id = Number(favId);
    if (!Number.isFinite(id)) return;

    setErr("");

    // optimistic remove
    const prev = items;
    setItems((x) => x.filter((f) => Number(f?.id) !== id));

    try {
      // ✅ delete by FAVORITE row id (not business id)
      await api.delete(`/me/favorites/businesses/${id}/`);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Remove failed");
      setItems(prev);
    }
  }

  function scheduleAgain(fav) {
    const biz = fav?.business || {};

    const payload = {
      source: "favorite_business",
      favorite_id: fav?.id,
      business_id: biz?.id,
      business_name: biz?.name || "",
      base_zip: biz?.base_zip || "",
      radius_miles: biz?.service_radius_miles ?? null,
    };

    writeNewRequestPrefill(payload);

    const q = new URLSearchParams();
    if (biz?.id) q.set("business_id", String(biz.id));
    if (fav?.id) q.set("favorite_id", String(fav.id));

    navigate(`/customer/new-request?${q.toString()}`);
  }

  // ✅ Customer adds card by code (manual OR scanned)
  async function addByCode(codeRaw) {
    const code = String(codeRaw || "").trim();
    if (!code) throw new Error("Missing code");

    setErr("");

    // 1) Resolve code -> business
    const res = await api.get("/me/business-cards/resolve/", { params: { code } });
    const business = res.data?.business;
    if (!business?.id) throw new Error("Invalid code");

    // 2) Add favorite
    await api.post("/me/favorites/businesses/", { business_id: business.id });

    // 3) Refresh list
    await load();
  }

  async function addByDetectedCode(raw) {
    try {
      await addByCode(raw);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Could not add card from scan.");
    }
  }

  const count = items?.length || 0;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/45 backdrop-blur p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-extrabold">Business Cards</div>
          <div className="text-sm text-slate-400 mt-1">
            Customers only: scan a business QR or type the SW-code to save them here.
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            type="button"
            onClick={() => setOpenScan(true)}
            className="inline-flex items-center justify-center h-10 text-xs rounded-2xl px-4 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40 text-slate-200"
            title="Scan a business QR"
          >
            📷 Scan
          </button>

          <button
            type="button"
            onClick={() => setOpenAdd(true)}
            className="inline-flex items-center justify-center h-10 text-xs rounded-2xl px-4 bg-cyan-500/18 border border-cyan-500/35 hover:bg-cyan-500/24 text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.10)]"
            title="Type/paste a business SW-code"
          >
            ＋ Add by code
          </button>

          <span className="text-[11px] px-3 py-1.5 rounded-full border font-semibold bg-indigo-500/10 border-indigo-500/30 text-indigo-200">
            {count} saved
          </span>

          <IconBtn title="Refresh" tone="slate" onClick={load}>
            🔄
          </IconBtn>
        </div>
      </div>

      {err ? (
        <div className="mt-4 text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-2xl p-3">{err}</div>
      ) : null}

      {loading ? <div className="mt-4 text-sm text-slate-400">Loading…</div> : null}

      {!loading && count === 0 ? (
        <div className="mt-5 rounded-3xl border border-slate-800 bg-slate-950/55 p-5">
          <div className="font-semibold">No Business Cards yet</div>
          <div className="text-sm text-slate-400 mt-2">
            Tap <b>Add by code</b> to paste a business SW-code, or <b>Scan</b> a business QR.
          </div>
        </div>
      ) : null}

      {count ? (
        <div className="mt-5">
          <div className="relative">
            <div className="pointer-events-none absolute inset-x-0 -top-8 h-16 bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-fuchsia-500/10 blur-2xl" />

            <div className="flex gap-4 overflow-x-auto pb-6 pt-2 pr-2">
              {items.map((fav, i) => (
                <BusinessCard
                  key={fav?.id || i}
                  fav={fav}
                  index={i}
                  onRemove={() => removeFavorite(fav?.id)}
                  onSchedule={() => scheduleAgain(fav)}
                />
              ))}
            </div>

            <div className="text-[11px] text-slate-500 mt-2">
              Next: business profile fields (photo + “what they do”) so these cards feel like real provider cards.
            </div>
          </div>
        </div>
      ) : null}

      {/* ✅ Add by code */}
      <AddBusinessCardModal open={openAdd} onClose={() => setOpenAdd(false)} onSubmit={addByCode} />

      {/* ✅ Scan QR */}
      <BarcodeScannerModal open={openScan} onClose={() => setOpenScan(false)} onDetected={addByDetectedCode} />
    </div>
  );
}