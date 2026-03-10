// src/pages/CustomerFavorites.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";
import Button from "../components/ui/Button";

import AddBusinessCardModal from "../components/BusinessCards/AddBusinessCardModal";
import BarcodeScannerModal from "../components/BusinessCards/BarcodeScannerModal";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Card({ title, subtitle, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-100">{title}</div>
          {subtitle ? <div className="text-xs text-slate-400 mt-1">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Pill({ children, tone = "slate" }) {
  const cls =
    tone === "cyan"
      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
      : tone === "fuchsia"
      ? "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200"
      : tone === "indigo"
      ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-200"
      : "border-slate-800 bg-slate-950/60 text-slate-200";
  return (
    <span className={cx("inline-flex items-center rounded-full border px-2 py-1 text-[11px]", cls)}>
      {children}
    </span>
  );
}

export default function CustomerFavorites() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [favorites, setFavorites] = useState([]);

  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState("");
  const [results, setResults] = useState([]);

  const [openAdd, setOpenAdd] = useState(false);
  const [openScan, setOpenScan] = useState(false);

  const favoritesByBusinessId = useMemo(() => {
    const m = new Map();
    (favorites || []).forEach((f) => {
      const bid = f?.business?.id ?? f?.business_id ?? f?.businessId;
      if (bid != null) m.set(String(bid), f);
    });
    return m;
  }, [favorites]);

  const searchEndpoint = useMemo(() => "/businesses/", []);

  async function loadFavorites() {
    setErr("");
    setLoading(true);
    try {
      const res = await api.get("/me/favorites/businesses/");
      const data = res?.data;
      const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      setFavorites(list);
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.non_field_errors?.[0] ||
        e?.message ||
        "Failed to load favorites";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toBusinessId(fav) {
    return fav?.business?.id ?? fav?.business_id ?? fav?.businessId ?? null;
  }

  function toBusinessName(fav) {
    return fav?.business?.name ?? fav?.business_name ?? fav?.name ?? "Business";
  }

  function toFavoriteId(fav) {
    return fav?.id ?? fav?.favorite_id ?? null;
  }

  function startNewRequestForBusiness(businessId) {
    if (!businessId) return;
    try {
      localStorage.setItem("sw_customer_pref_business_id", String(businessId));
    } catch {}
    nav(`/customer/new-request?business_id=${encodeURIComponent(String(businessId))}`);
  }

  async function addFavoriteByBusinessId(businessId) {
    if (!businessId) return;
    setErr("");
    try {
      await api.post("/me/favorites/businesses/", { business_id: Number(businessId) });
      await loadFavorites();
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.business_id?.[0] ||
        e?.response?.data?.non_field_errors?.[0] ||
        e?.message ||
        "Failed to add favorite";
      setErr(msg);
    }
  }

  async function removeFavorite(fav) {
    const favId = toFavoriteId(fav);
    if (!favId) {
      await loadFavorites();
      return;
    }
    setErr("");
    try {
      await api.delete(`/me/favorites/businesses/${favId}/`);
      await loadFavorites();
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.non_field_errors?.[0] ||
        e?.message ||
        "Failed to remove favorite";
      setErr(msg);
    }
  }

  async function searchBusinesses() {
    const term = (q || "").trim();
    if (!term) {
      setResults([]);
      setSearchErr("");
      return;
    }

    setSearching(true);
    setSearchErr("");
    try {
      const res = await api.get(searchEndpoint, { params: { search: term } });
      const data = res?.data;
      const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      setResults(list);
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.non_field_errors?.[0] ||
        e?.message ||
        "Search failed (backend search param mismatch?)";
      setSearchErr(msg);
    } finally {
      setSearching(false);
    }
  }

  function isBusinessFavorited(businessId) {
    return favoritesByBusinessId.has(String(businessId));
  }

  // ✅ Scan / type flow: code -> resolve -> add favorite
  async function addByBusinessCardCode(raw) {
    const code = String(raw || "").trim();
    if (!code) return;

    setErr("");
    try {
      const res = await api.get("/me/business-cards/resolve/", { params: { code } });
      const biz = res?.data?.business;
      if (!biz?.id) throw new Error("Invalid code");
      await addFavoriteByBusinessId(biz.id);
    } catch (e) {
      const msg = e?.response?.data?.detail || "Could not add business card.";
      setErr(msg);
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-2xl font-extrabold tracking-tight">Favorites</div>
            <div className="text-sm text-slate-400 mt-1">Save businesses you trust — rebook in 2 clicks.</div>
            <div className="mt-2 flex gap-2 flex-wrap">
              <Pill tone="cyan">Fast re-book</Pill>
              <Pill tone="indigo">Repeat providers</Pill>
              <Pill tone="fuchsia">Less typing</Pill>
            </div>
          </div>

          <div className="flex gap-2">
            <Link to="/customer/tickets">
              <Button variant="secondary">My Tickets</Button>
            </Link>
            <Link to="/customer">
              <Button variant="secondary">Back</Button>
            </Link>
          </div>
        </div>

        {err ? (
          <div className="mt-4 rounded-2xl border border-red-900/50 bg-red-950/30 text-red-200 p-3 text-sm">
            {err}
          </div>
        ) : null}

        <div className="mt-5 grid lg:grid-cols-12 gap-4">
          {/* Left: favorites list */}
          <div className="lg:col-span-7">
            <Card
              title="Your favorites"
              subtitle="Use Add Code / Scan QR to save a business instantly."
              right={
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setOpenScan(true)}>
                    Scan QR
                  </Button>
                  <Button onClick={() => setOpenAdd(true)}>Add Code</Button>
                  <Button variant="secondary" onClick={loadFavorites} disabled={loading}>
                    {loading ? "Loading..." : "Refresh"}
                  </Button>
                </div>
              }
            >
              {loading ? (
                <div className="text-sm text-slate-400">Loading favorites…</div>
              ) : favorites.length === 0 ? (
                <div className="text-sm text-slate-400">No favorites yet. Add one with a card code.</div>
              ) : (
                <div className="space-y-3">
                  {favorites.map((fav) => {
                    const bid = toBusinessId(fav);
                    const name = toBusinessName(fav);

                    return (
                      <div
                        key={toFavoriteId(fav) ?? `${bid}-${name}`}
                        className="rounded-3xl border border-slate-800 bg-slate-950/50 p-4 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-100 truncate">{name}</div>
                          <div className="text-xs text-slate-400 mt-1">
                            Business ID: <span className="text-slate-200">{bid ?? "—"}</span>
                          </div>
                          {fav?.business?.business_card_code ? (
                            <div className="text-xs text-slate-500 mt-1">
                              Card: <span className="font-mono text-slate-300">{fav.business.business_card_code}</span>
                            </div>
                          ) : null}
                        </div>

                        <div className="flex gap-2 shrink-0">
                          <Button onClick={() => startNewRequestForBusiness(bid)} disabled={!bid}>
                            Book again
                          </Button>
                          <Button variant="secondary" onClick={() => removeFavorite(fav)}>
                            Remove
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Right: search */}
          <div className="lg:col-span-5 space-y-4">
            <Card title="Search businesses" subtitle="Optional: find by name and favorite directly.">
              <div className="flex gap-2">
                <input
                  className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-2.5 outline-none focus:border-cyan-500/50"
                  placeholder="Search by name, zip, service…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") searchBusinesses();
                  }}
                />
                <Button onClick={searchBusinesses} disabled={searching}>
                  {searching ? "Searching…" : "Search"}
                </Button>
              </div>

              {searchErr ? (
                <div className="mt-3 text-xs text-amber-200 border border-amber-500/30 bg-amber-500/10 rounded-2xl p-3">
                  {searchErr}
                </div>
              ) : null}

              {results.length ? (
                <div className="mt-4 space-y-2">
                  {results.slice(0, 20).map((b) => {
                    const bid = b?.id;
                    const name = b?.name || `Business #${bid}`;
                    const favorited = bid ? isBusinessFavorited(bid) : false;

                    return (
                      <div
                        key={bid ?? name}
                        className="rounded-3xl border border-slate-800 bg-slate-950/50 p-4 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-100 truncate">{name}</div>
                          <div className="text-xs text-slate-400 mt-1">
                            ID: <span className="text-slate-200">{bid ?? "—"}</span>
                          </div>
                        </div>

                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant={favorited ? "secondary" : "primary"}
                            onClick={() => {
                              if (!bid) return;
                              if (!favorited) addFavoriteByBusinessId(bid);
                            }}
                            disabled={!bid || favorited}
                            title={favorited ? "Already favorited" : "Add to favorites"}
                          >
                            {favorited ? "Saved" : "Favorite"}
                          </Button>

                          <Button variant="secondary" onClick={() => startNewRequestForBusiness(bid)} disabled={!bid}>
                            Book
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-3 text-sm text-slate-400">Search results will appear here.</div>
              )}
            </Card>

            <Card title="Share Tip" subtitle="Business shows QR → customer scans → saved forever.">
              <div className="text-sm text-slate-300">
                Customers don’t generate QR — they just scan it or type the code.
              </div>
              <div className="mt-4 flex gap-2 flex-wrap">
                <Button variant="secondary" onClick={() => setOpenScan(true)}>
                  Scan QR
                </Button>
                <Button onClick={() => setOpenAdd(true)}>Add Code</Button>
              </div>
            </Card>
          </div>
        </div>

        <div className="mt-8 text-center text-[11px] text-slate-500">Favorites are per-user and tied to your account.</div>
      </div>

      <AddBusinessCardModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onSubmit={async (code) => {
          await addByBusinessCardCode(code);
          setOpenAdd(false);
        }}
      />

      <BarcodeScannerModal
        open={openScan}
        onClose={() => setOpenScan(false)}
        onDetected={async (code) => {
          await addByBusinessCardCode(code);
          setOpenScan(false);
        }}
      />
    </div>
  );
}