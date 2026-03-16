import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";
import Button from "../components/ui/Button";
import AddBusinessCardModal from "../components/BusinessCards/AddBusinessCardModal";
import BarcodeScannerModal from "../components/BusinessCards/BarcodeScannerModal";
import StarRating from "../components/BusinessCards/StarRating";

function safeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

function normalizeWebsite(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `https://${s}`;
}

function normalizeExternalUrl(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `https://${s}`;
}

function safeText(v) {
  return String(v || "").trim();
}

function groupLabelFromBusiness(biz) {
  const serviceTags = Array.isArray(biz?.services_offered)
    ? biz.services_offered
        .map((x) => `${x?.name || ""} ${x?.key || ""} ${x?.path || ""}`)
        .join(" ")
        .toLowerCase()
    : "";

  const headline = safeText(biz?.headline).toLowerCase();
  const services = safeText(biz?.services_text).toLowerCase();
  const blob = `${headline} ${services} ${serviceTags}`;

  if (blob.includes("plumb")) return "Plumbing";
  if (blob.includes("hvac") || blob.includes("air") || blob.includes("cooling") || blob.includes("heating")) return "HVAC";
  if (blob.includes("electric")) return "Electrical";
  if (blob.includes("auto") || blob.includes("detail") || blob.includes("roadside")) return "Auto";
  if (blob.includes("pet") || blob.includes("dog") || blob.includes("groom")) return "Pets";
  if (blob.includes("clean")) return "Cleaning";
  if (blob.includes("lawn") || blob.includes("landscap")) return "Lawn";
  if (blob.includes("roof")) return "Roofing";
  if (blob.includes("handyman") || blob.includes("repair")) return "Repair";
  if (
    blob.includes("tax") ||
    blob.includes("bookkeeping") ||
    blob.includes("notary") ||
    blob.includes("insurance") ||
    blob.includes("marketing")
  ) {
    return "Business";
  }
  if (blob.includes("ride") || blob.includes("transport")) return "Transportation";

  return "All Services";
}

function writeNewRequestPrefill(payload) {
  try {
    localStorage.setItem("sw:new_request_prefill", JSON.stringify(payload || {}));
  } catch {
    // ignore
  }
}

function getPresenceMeta(modeRaw) {
  const mode = String(modeRaw || "").trim().toLowerCase();

  if (mode === "online") {
    return {
      label: "ONLINE BUSINESS",
      className:
        "border-cyan-500/40 bg-cyan-500/15 text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,0.18)]",
    };
  }

  if (mode === "in_person") {
    return {
      label: "IN PERSON",
      className:
        "border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-200 shadow-[0_0_30px_rgba(217,70,239,0.16)]",
    };
  }

  if (mode === "on_site") {
    return {
      label: "ON-SITE SERVICE",
      className:
        "border-emerald-500/40 bg-emerald-500/15 text-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.16)]",
    };
  }

  if (mode === "hybrid") {
    return {
      label: "ONLINE + ON-SITE",
      className:
        "border-amber-500/40 bg-amber-500/15 text-amber-200 shadow-[0_0_30px_rgba(245,158,11,0.16)]",
    };
  }

  return {
    label: "BUSINESS TYPE",
    className: "border-slate-700 bg-slate-900/70 text-slate-300",
  };
}

function isRemoteBusiness(biz) {
  return (
    !!biz?.is_online_only ||
    String(biz?.business_presence_mode || "").trim().toLowerCase() === "online" ||
    biz?.effective_service_radius_miles == null
  );
}

function getRadiusLabel(biz) {
  if (isRemoteBusiness(biz)) return "Remote";
  const n = biz?.effective_service_radius_miles ?? biz?.service_radius_miles;
  return n != null && n !== "" ? `${n} mi` : "—";
}

function getSocialLinks(biz) {
  return [
    { key: "facebook", label: "Facebook", short: "f", url: normalizeExternalUrl(biz?.facebook_url) },
    { key: "instagram", label: "Instagram", short: "ig", url: normalizeExternalUrl(biz?.instagram_url) },
    { key: "linkedin", label: "LinkedIn", short: "in", url: normalizeExternalUrl(biz?.linkedin_url) },
    { key: "google", label: "Google", short: "g", url: normalizeExternalUrl(biz?.google_business_url) },
    { key: "youtube", label: "YouTube", short: "yt", url: normalizeExternalUrl(biz?.youtube_url) },
    { key: "tiktok", label: "TikTok", short: "tt", url: normalizeExternalUrl(biz?.tiktok_url) },
  ].filter((x) => x.url);
}

function SocialLinkPill({ href, label, short }) {
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={label}
      className="inline-flex items-center justify-center min-w-[42px] h-10 px-3 rounded-2xl border border-slate-800 bg-slate-950/80 hover:bg-slate-900 text-slate-100 transition text-xs font-extrabold uppercase tracking-wide"
    >
      {short}
    </a>
  );
}

function PresenceBadge({ mode }) {
  const meta = getPresenceMeta(mode);
  return (
    <div
      className={`inline-flex items-center rounded-full border px-3 py-2 text-[11px] font-extrabold tracking-[0.18em] uppercase ${meta.className}`}
    >
      {meta.label}
    </div>
  );
}

function TrustMiniPill({ active, label }) {
  return (
    <span
      className={
        "text-[11px] px-3 py-1.5 rounded-full border font-semibold " +
        (active
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
          : "bg-slate-950/60 border-slate-800 text-slate-400")
      }
    >
      {label}
    </span>
  );
}

export default function CustomerBusinessCards() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [items, setItems] = useState([]);
  const [activeGroup, setActiveGroup] = useState("All");
  const [search, setSearch] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await api.get("/me/favorites/businesses/");
      setItems(safeList(res.data));
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Failed to load business cards.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const favoritesByBizId = useMemo(() => {
    const m = new Map();
    items.forEach((f) => {
      const bid = f?.business?.id;
      if (bid != null) m.set(String(bid), f);
    });
    return m;
  }, [items]);

  const groups = useMemo(() => {
    const set = new Set(["All"]);
    items.forEach((fav) => {
      set.add(groupLabelFromBusiness(fav?.business || {}));
    });
    return Array.from(set);
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((fav) => {
      const biz = fav?.business || {};
      const group = groupLabelFromBusiness(biz);
      const socials = getSocialLinks(biz);

      if (activeGroup !== "All" && group !== activeGroup) return false;
      if (!q) return true;

      const blob = [
        fav?.nickname,
        biz?.name,
        biz?.headline,
        biz?.services_text,
        biz?.phone,
        biz?.business_email,
        biz?.city,
        biz?.state,
        biz?.display_location,
        biz?.website,
        biz?.base_zip,
        biz?.business_card_code,
        biz?.business_presence_mode,
        biz?.is_online_only ? "remote" : "",
        biz?.is_online_only ? "online" : "",
        getPresenceMeta(biz?.business_presence_mode).label,
        group,
        ...socials.flatMap((x) => [x.label, x.url]),
        ...(Array.isArray(biz?.services_offered)
          ? biz.services_offered.flatMap((x) => [x?.name, x?.key, x?.path])
          : []),
      ]
        .map((x) => String(x || "").toLowerCase())
        .join(" ");

      return blob.includes(q);
    });
  }, [items, activeGroup, search]);

  async function addByCode(codeRaw) {
    const code = String(codeRaw || "").trim();
    if (!code) {
      throw new Error("Enter a business card code first.");
    }

    setBusy(true);
    setErr("");
    setOk("");

    try {
      const resolved = await api.get("/me/business-cards/resolve/", { params: { code } });
      const business = resolved?.data?.business;

      if (!business?.id) {
        throw new Error("Invalid business card code.");
      }

      if (favoritesByBizId.has(String(business.id))) {
        throw new Error("That business is already saved in your Business Cards.");
      }

      await api.post("/me/favorites/businesses/", { business_id: business.id });
      setOk("Business card added.");
      setAddOpen(false);
      setScanOpen(false);
      await load();
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.code?.[0] ||
        e?.message ||
        "Could not add business card.";
      setErr(msg);
      throw e;
    } finally {
      setBusy(false);
    }
  }

  async function removeCard(fav) {
    const id = Number(fav?.id);
    if (!Number.isFinite(id)) return;

    const yes = window.confirm(`Remove ${fav?.business?.name || "this business card"}?`);
    if (!yes) return;

    setBusy(true);
    setErr("");
    setOk("");

    try {
      await api.delete(`/me/favorites/businesses/${id}/`);
      setOk("Business card removed.");
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Failed to remove business card.");
    } finally {
      setBusy(false);
    }
  }

  function bookAgain(fav) {
    const biz = fav?.business || {};
    const businessId = biz?.id;
    if (!businessId) return;

    const payload = {
      source: "favorite_business",
      favorite_id: fav?.id,
      business_id: businessId,
      business_name: biz?.name || "",
      base_zip: biz?.base_zip || "",
      radius_miles: isRemoteBusiness(biz) ? null : biz?.effective_service_radius_miles ?? biz?.service_radius_miles ?? null,
      is_online_only: !!biz?.is_online_only,
      business_presence_mode: biz?.business_presence_mode || "",
    };

    writeNewRequestPrefill(payload);

    const q = new URLSearchParams();
    q.set("business_id", String(businessId));
    q.set("favorite_id", String(fav?.id || ""));
    nav(`/customer/new-request?${q.toString()}`);
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar title="Business Cards" subtitle="Saved providers you trust." />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button tone="slate" onClick={() => nav(-1)} disabled={busy}>
            Back
          </Button>

          <Button tone="slate" onClick={load} disabled={loading || busy}>
            {loading ? "Loading…" : "Refresh"}
          </Button>

          <Button tone="cyan" onClick={() => setScanOpen(true)} disabled={loading || busy}>
            Scan QR
          </Button>

          <Button tone="indigo" onClick={() => setAddOpen(true)} disabled={loading || busy}>
            Add by Code
          </Button>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-sm font-semibold text-slate-100">Find a Saved Card</div>
              <div className="text-xs text-slate-400 mt-1">
                Search by business name, code, service, city, email, phone, website, or social link.
              </div>
            </div>
            <div className="text-xs text-slate-500">{filteredItems.length} shown</div>
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search business cards..."
            className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-3 py-3 text-sm text-slate-100 outline-none focus:border-cyan-500/40"
          />

          <div className="flex gap-2 flex-wrap">
            {groups.map((group) => (
              <button
                key={group}
                type="button"
                onClick={() => setActiveGroup(group)}
                className={
                  "text-xs rounded-full px-3 py-2 border transition " +
                  (activeGroup === group
                    ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-200"
                    : "bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-200")
                }
              >
                {group}
              </button>
            ))}
          </div>
        </div>

        {err ? (
          <div className="text-sm text-red-200 bg-red-900/10 border border-red-800 rounded-xl p-3">
            {err}
          </div>
        ) : null}

        {ok ? (
          <div className="text-sm text-emerald-200 bg-emerald-900/10 border border-emerald-800 rounded-xl p-3">
            {ok}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">
            Loading business cards…
          </div>
        ) : null}

        {!loading && !filteredItems.length ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">
            No saved business cards in this view yet.
          </div>
        ) : null}

        {!loading && filteredItems.length ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredItems.map((fav) => {
              const biz = fav?.business || {};
              const website = normalizeWebsite(biz?.website || "");
              const location = biz?.display_location || [biz?.city, biz?.state].filter(Boolean).join(", ");
              const socials = getSocialLinks(biz);

              return (
                <div
                  key={fav?.id}
                  className="group rounded-3xl border border-slate-800 bg-slate-950/45 p-5 shadow-[0_0_40px_rgba(0,0,0,0.20)] hover:shadow-[0_0_40px_rgba(34,211,238,0.07)] transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Saved Provider</div>
                      <div className="text-lg font-extrabold truncate mt-1">{biz?.name || "Business"}</div>

                      {fav?.nickname ? (
                        <div className="text-xs text-slate-500 mt-1 truncate">
                          Saved as: {fav.nickname}
                        </div>
                      ) : null}

                      <div className="mt-3">
                        <PresenceBadge mode={biz?.business_presence_mode} />
                      </div>
                    </div>

                    <div className="flex items-start gap-3 shrink-0">
                      <div className="h-16 w-16 rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center">
                        {biz?.logo_url ? (
                          <img
                            src={biz.logo_url}
                            alt={biz?.name || "Business"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-500">No Logo</span>
                        )}
                      </div>

                      <StarRating value={biz?.rating ?? 0} />
                    </div>
                  </div>

                  {biz?.headline ? (
                    <div className="mt-4 text-sm text-cyan-200 leading-relaxed">{biz.headline}</div>
                  ) : null}

                  {socials.length ? (
                    <div className="mt-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-2">
                        Socials
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {socials.map((item) => (
                          <SocialLinkPill
                            key={item.key}
                            href={item.url}
                            label={item.label}
                            short={item.short}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 flex gap-2 flex-wrap">
                    <TrustMiniPill active={!!biz?.is_licensed} label="Licensed" />
                    <TrustMiniPill active={!!biz?.is_insured} label="Insured" />
                    <TrustMiniPill active={!!biz?.background_checked} label="Checked" />
                  </div>

                  {biz?.services_text ? (
                    <div className="mt-4 text-sm text-slate-300 line-clamp-4">{biz.services_text}</div>
                  ) : null}

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">Location</div>
                      <div className="mt-1 text-slate-200">{location || "—"}</div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">Radius</div>
                      <div className="mt-1 text-slate-200">{getRadiusLabel(biz)}</div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1 text-sm text-slate-300">
                    <div>
                      <span className="text-slate-500">Phone:</span> {biz?.phone || "—"}
                    </div>
                    <div>
                      <span className="text-slate-500">Email:</span> {biz?.business_email || "—"}
                    </div>
                    <div>
                      <span className="text-slate-500">ZIP:</span> {biz?.base_zip || "—"}
                    </div>
                    <div>
                      <span className="text-slate-500">Code:</span> {biz?.business_card_code || "—"}
                    </div>
                    <div>
                      <span className="text-slate-500">Website:</span>{" "}
                      {website ? (
                        <a
                          href={website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-300 underline break-all"
                        >
                          {website}
                        </a>
                      ) : (
                        "—"
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex gap-2 flex-wrap">
                    <Button tone="cyan" onClick={() => bookAgain(fav)} disabled={busy}>
                      Book Again
                    </Button>

                    <Button tone="slate" onClick={() => nav(`/customer/business-cards/${fav.id}`)} disabled={busy}>
                      View Card
                    </Button>

                    <Button tone="rose" onClick={() => removeCard(fav)} disabled={busy}>
                      Delete Card
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </main>

      <AddBusinessCardModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={(code) => addByCode(code)}
      />

      <BarcodeScannerModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onDetected={(raw) => addByCode(raw)}
      />
    </div>
  );
}