// src/pages/SboSettings.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import BusinessPicker from "../components/BusinessPicker";

function Card({ title, subtitle, right, children }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{title}</div>
          {subtitle ? <div className="text-xs text-slate-400 mt-1">{subtitle}</div> : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder = "", type = "text", hint = "" }) {
  return (
    <label className="block">
      <div className="text-xs text-slate-300">{label}</div>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
      />
      {hint ? <div className="text-[11px] text-slate-500 mt-1">{hint}</div> : null}
    </label>
  );
}

function Toggle({ label, checked, onChange, hint = "" }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-sm text-slate-200 font-semibold">{label}</div>
        {hint ? <div className="text-[11px] text-slate-500 mt-1">{hint}</div> : null}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={
          "w-14 h-8 rounded-full border transition relative " +
          (checked ? "bg-cyan-500/20 border-cyan-500/40" : "bg-slate-950 border-slate-800")
        }
        title={checked ? "On" : "Off"}
      >
        <span
          className={
            "absolute top-1 left-1 w-6 h-6 rounded-full transition " +
            (checked ? "translate-x-6 bg-cyan-200" : "translate-x-0 bg-slate-300")
          }
        />
      </button>
    </div>
  );
}

function safeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

/**
 * Normalize AuthContext.myBusinesses into a flat list of business objects.
 * Some backends return memberships like { business: {id, name, ...}, role, ... }
 * Some return businesses directly like { id, name, ... }
 */
function normalizeBusinesses(myBusinesses) {
  const arr = Array.isArray(myBusinesses) ? myBusinesses : [];
  return arr
    .map((x) => {
      if (!x) return null;
      if (x.business && typeof x.business === "object") return x.business;
      return x; // already a business object
    })
    .filter(Boolean);
}

export default function SboSettings() {
  const { activeBusinessId, myBusinesses, reloadBusinesses } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // Use the standardized source of businesses from AuthContext (/me/businesses/)
  const businesses = useMemo(() => normalizeBusinesses(myBusinesses), [myBusinesses]);

  const activeId = activeBusinessId ? Number(activeBusinessId) : null;

  const activeBiz = useMemo(() => {
    if (!activeId) return null;
    return (businesses || []).find((b) => Number(b.id) === Number(activeId)) || null;
  }, [businesses, activeId]);

  // Form state
  const [name, setName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [baseZip, setBaseZip] = useState("");
  const [radius, setRadius] = useState("25");
  const [acceptsMarketplace, setAcceptsMarketplace] = useState(true);
  const [servicesOffered, setServicesOffered] = useState([]);

  // Category data
  const [roots, setRoots] = useState([]);
  const [browseParent, setBrowseParent] = useState(null);
  const [children, setChildren] = useState([]);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [serviceLabels, setServiceLabels] = useState({}); // id -> {name, path}

  async function refreshBusinesses() {
    setErr("");
    setOk("");
    setLoading(true);
    try {
      await reloadBusinesses?.(); // this should call GET /me/businesses/ in AuthContext
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to refresh businesses.");
    } finally {
      setLoading(false);
    }
  }

  async function loadRoots() {
    try {
      const r = await api.get("/service-categories/roots/");
      setRoots(safeList(r.data));
    } catch {
      setRoots([]);
    }
  }

  async function loadChildren(parentId) {
    if (!parentId) {
      setChildren([]);
      return;
    }
    try {
      const r = await api.get(`/service-categories/${parentId}/children/`);
      setChildren(safeList(r.data));
    } catch {
      setChildren([]);
    }
  }

  async function loadLabels(ids) {
    const clean = (ids || []).map((x) => Number(x)).filter(Boolean);
    if (!clean.length) {
      setServiceLabels({});
      return;
    }
    try {
      const r = await api.get(`/service-categories/by-ids/?ids=${clean.join(",")}`);
      const list = safeList(r.data);
      const next = {};
      for (const c of list) {
        next[c.id] = { name: c.name, path: c.path || c.category_path || c.name };
      }
      setServiceLabels(next);
    } catch {
      setServiceLabels({});
    }
  }

  // Initial loads
  useEffect(() => {
    refreshBusinesses();
    loadRoots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When active business changes, hydrate form
  useEffect(() => {
    if (!activeBiz) return;

    setName(activeBiz.name || "");
    setBusinessEmail(activeBiz.business_email || "");
    setOwnerName(activeBiz.owner_name || "");
    setPhone(activeBiz.phone || "");
    setBaseZip(activeBiz.base_zip || "");
    setRadius(String(activeBiz.service_radius_miles ?? 25));
    setAcceptsMarketplace(!!activeBiz.accepts_marketplace_tickets);

    const svc = Array.isArray(activeBiz.services_offered)
      ? activeBiz.services_offered
      : Array.isArray(activeBiz.services_offered?.results)
      ? activeBiz.services_offered.results
      : [];

    // Some backends return list of ids; some return objs. Normalize.
    const ids = svc.map((x) => (typeof x === "number" ? x : x?.id)).filter(Boolean);
    setServicesOffered(ids);
    loadLabels(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBiz?.id]);

  // Search taxonomy
  useEffect(() => {
    let alive = true;
    async function go() {
      const q = (searchQ || "").trim();
      if (!q) {
        setSearchResults([]);
        return;
      }
      try {
        const r = await api.get(`/service-categories/search/?q=${encodeURIComponent(q)}`);
        const list = safeList(r.data);
        // prefer leaves
        const leaves = list.filter((x) => x && x.is_leaf);
        if (!alive) return;
        setSearchResults(leaves.length ? leaves : list);
      } catch {
        if (!alive) return;
        setSearchResults([]);
      }
    }
    go();
    return () => {
      alive = false;
    };
  }, [searchQ]);

  const activeBusinessMissing = useMemo(() => {
    const hasAny = Array.isArray(myBusinesses) && myBusinesses.length > 0;
    return hasAny && !activeId;
  }, [myBusinesses, activeId]);

  async function save() {
    setErr("");
    setOk("");

    if (!activeBiz?.id) {
      setErr("Select a business first.");
      return;
    }

    const emailTrim = (businessEmail || "").trim();
    if (!emailTrim) {
      setErr("Business Email is required (recommended for Google Calendar sync).");
      return;
    }

    const payload = {
      name: (name || "").trim(),
      business_email: emailTrim,
      owner_name: (ownerName || "").trim(),
      phone: (phone || "").trim(),
      base_zip: (baseZip || "").trim(),
      service_radius_miles: Number(radius) || 25,
      accepts_marketplace_tickets: !!acceptsMarketplace,
      services_offered: servicesOffered,
    };

    setSaving(true);
    try {
      await api.patch(`/businesses/${activeBiz.id}/`, payload);
      setOk("Saved.");
      await refreshBusinesses();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function toggleService(id) {
    const nid = Number(id);
    if (!nid) return;
    setServicesOffered((prev) => {
      const set = new Set(prev || []);
      if (set.has(nid)) set.delete(nid);
      else set.add(nid);
      const next = Array.from(set);
      loadLabels(next);
      return next;
    });
  }

  function clearServices() {
    setServicesOffered([]);
    setServiceLabels({});
  }

  return (
    <div className="space-y-4">
      <Card
        title="Business Settings"
        subtitle="Profile, marketplace visibility, service tags, and routing radius."
        right={
          <div className="flex items-center gap-2">
            <BusinessPicker />
            <button
              onClick={refreshBusinesses}
              className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
              disabled={loading}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        }
      >
        {activeBusinessMissing ? (
          <div className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
            Pick your active business from the selector above.
          </div>
        ) : null}

        {err ? (
          <div className="mt-3 text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-xl p-3">
            {err}
          </div>
        ) : null}

        {ok ? (
          <div className="mt-3 text-sm text-emerald-200 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
            {ok}
          </div>
        ) : null}

        {!activeBiz ? (
          <div className="text-sm text-slate-400 mt-3">No active business selected yet.</div>
        ) : null}

        {activeBiz ? (
          <div className="grid lg:grid-cols-2 gap-4 mt-4">
            {/* LEFT: Profile */}
            <Card
              title="Business Profile"
              subtitle="This is what customers/providers see. Business Email is recommended for calendar sync."
            >
              <div className="space-y-3">
                <Input label="Business Name" value={name} onChange={setName} placeholder="e.g. Jacob's Plumbing Co." />

                <Input
                  label="Business Email (required)"
                  value={businessEmail}
                  onChange={setBusinessEmail}
                  placeholder="billing@yourcompany.com"
                  type="email"
                  hint="Recommended: use a Gmail you want to connect to Google Calendar."
                />

                <div className="grid sm:grid-cols-2 gap-3">
                  <Input label="Owner / Contact Name" value={ownerName} onChange={setOwnerName} placeholder="Jacob Lord" />
                  <Input label="Phone" value={phone} onChange={setPhone} placeholder="555-123-4567" />
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <Input label="Base ZIP" value={baseZip} onChange={setBaseZip} placeholder="30318" />
                  <Input
                    label="Service Radius (miles)"
                    value={radius}
                    onChange={setRadius}
                    placeholder="25"
                    type="number"
                    hint="Used to match marketplace tickets by ZIP distance."
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    onClick={save}
                    disabled={saving}
                    className={
                      "rounded-xl px-4 py-2 text-sm font-semibold border transition " +
                      (saving
                        ? "bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed"
                        : "bg-cyan-500/20 border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-200")
                    }
                  >
                    {saving ? "Saving…" : "Save Settings"}
                  </button>
                </div>
              </div>
            </Card>

            {/* RIGHT: Services + Marketplace */}
            <Card
              title="Services Offered + Marketplace"
              subtitle="You must select at least 1 service AND enable marketplace to see marketplace jobs."
              right={
                <button
                  onClick={clearServices}
                  className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
                >
                  Clear
                </button>
              }
            >
              <div className="space-y-4">
                <Toggle
                  label="Accept Marketplace Tickets"
                  checked={acceptsMarketplace}
                  onChange={setAcceptsMarketplace}
                  hint="If OFF, you will NOT see marketplace tickets even if services/zip are set."
                />

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-100">Selected Services</div>
                      <div className="text-xs text-slate-400 mt-1">
                        These tags determine which marketplace jobs appear for your business.
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">{servicesOffered.length} selected</div>
                  </div>

                  {servicesOffered.length === 0 ? (
                    <div className="mt-3 text-sm text-slate-400">No services selected yet.</div>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {servicesOffered.map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleService(id)}
                          className="text-xs rounded-full px-3 py-2 border border-cyan-500/20 bg-cyan-500/10 hover:bg-cyan-500/15 text-cyan-100"
                          title="Click to remove"
                        >
                          {serviceLabels[id]?.path || serviceLabels[id]?.name || `Service #${id}`} ✕
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Search + Browse */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="font-semibold">Search Services</div>
                    <div className="text-xs text-slate-400 mt-1">Type to find services quickly.</div>

                    <input
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                      placeholder="e.g. plumbing, electrician, HVAC…"
                      className="mt-3 w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100"
                    />

                    <div className="mt-3 max-h-[260px] overflow-auto space-y-2 pr-1">
                      {searchResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleService(c.id)}
                          className={
                            "w-full text-left rounded-xl border p-3 transition " +
                            (servicesOffered.includes(Number(c.id))
                              ? "bg-cyan-500/10 border-cyan-500/20"
                              : "bg-slate-950 border-slate-800 hover:bg-slate-900")
                          }
                        >
                          <div className="font-semibold text-sm text-slate-100">{c.name}</div>
                          <div className="text-[11px] text-slate-500 mt-1">{c.key}</div>
                        </button>
                      ))}
                      {searchQ && searchResults.length === 0 ? (
                        <div className="text-sm text-slate-400">No results.</div>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="font-semibold">Browse Categories</div>
                    <div className="text-xs text-slate-400 mt-1">Pick a group → choose a service.</div>

                    <div className="mt-3 grid grid-cols-1 gap-2">
                      <div className="text-xs text-slate-400">Groups</div>
                      <div className="flex flex-wrap gap-2">
                        {roots.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              setBrowseParent(r.id);
                              loadChildren(r.id);
                            }}
                            className={
                              "text-xs rounded-full px-3 py-2 border transition " +
                              (Number(browseParent) === Number(r.id)
                                ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-200"
                                : "bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-200")
                            }
                          >
                            {r.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-xs text-slate-400">Services</div>
                      <div className="mt-2 max-h-[260px] overflow-auto space-y-2 pr-1">
                        {children.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              if (c.is_leaf) toggleService(c.id);
                              else {
                                setBrowseParent(c.id);
                                loadChildren(c.id);
                              }
                            }}
                            className={
                              "w-full text-left rounded-xl border p-3 transition " +
                              (servicesOffered.includes(Number(c.id))
                                ? "bg-cyan-500/10 border-cyan-500/20"
                                : "bg-slate-950 border-slate-800 hover:bg-slate-900")
                            }
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="font-semibold text-sm text-slate-100">{c.name}</div>
                              <div className="text-[11px] text-slate-500">{c.is_leaf ? "SERVICE" : "GROUP"}</div>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1">{c.key}</div>
                          </button>
                        ))}
                        {!browseParent ? <div className="text-sm text-slate-400">Pick a group above.</div> : null}
                        {browseParent && children.length === 0 ? (
                          <div className="text-sm text-slate-400">No children.</div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    onClick={save}
                    disabled={saving}
                    className={
                      "w-full rounded-xl px-4 py-3 text-sm font-semibold border transition " +
                      (saving
                        ? "bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed"
                        : "bg-cyan-500/20 border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-200")
                    }
                  >
                    {saving ? "Saving…" : "Save Marketplace + Services"}
                  </button>
                </div>
              </div>
            </Card>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
