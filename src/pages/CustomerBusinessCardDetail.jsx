import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import api from "../api/client";
import ModeBar from "../components/ModeBar";
import Button from "../components/ui/Button";

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

function safePhoneHref(v) {
  const raw = String(v || "").trim();
  if (!raw) return "";
  const digits = raw.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "";
}

function safeMailHref(v) {
  const raw = String(v || "").trim();
  if (!raw) return "";
  return `mailto:${raw}`;
}

function writeNewRequestPrefill(payload) {
  try {
    localStorage.setItem("sw:new_request_prefill", JSON.stringify(payload || {}));
  } catch {
    // ignore
  }
}

function TrustPill({ active, label }) {
  return (
    <span
      className={
        "text-xs px-3 py-2 rounded-full border font-semibold " +
        (active
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
          : "bg-slate-950/60 border-slate-800 text-slate-400")
      }
    >
      {label}: {active ? "Yes" : "No"}
    </span>
  );
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

function PresenceBadge({ mode }) {
  const meta = getPresenceMeta(mode);
  return (
    <div
      className={`inline-flex items-center rounded-full border px-4 py-2 text-[11px] font-extrabold tracking-[0.2em] uppercase ${meta.className}`}
    >
      {meta.label}
    </div>
  );
}

function isRemoteBusiness(biz) {
  return (
    !!biz?.is_online_only ||
    String(biz?.business_presence_mode || "").trim().toLowerCase() === "online" ||
    biz?.effective_service_radius_miles == null
  );
}

function getRadiusDisplay(biz) {
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
      className="inline-flex items-center justify-center min-w-[46px] h-11 px-3 rounded-2xl border border-slate-800 bg-slate-950/80 hover:bg-slate-900 text-slate-100 transition text-xs font-extrabold uppercase tracking-wide"
    >
      {short}
    </a>
  );
}

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
      const res = await api.get("/me/favorites/businesses/");
      const data = res.data?.results ?? res.data ?? [];
      const item = (Array.isArray(data) ? data : []).find((x) => String(x.id) === String(favoriteId));
      if (!item) throw new Error("Not found");
      setFav(item);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Business card not found.");
      setFav(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [favoriteId]);

  const biz = fav?.business || {};
  const site = useMemo(() => normalizeWebsite(biz?.website || ""), [biz?.website]);
  const displayLocation = biz?.display_location || [biz?.city, biz?.state].filter(Boolean).join(", ");
  const fullAddress = [biz?.address, biz?.city, biz?.state].filter(Boolean).join(", ");
  const qrValue = biz?.business_card_code || "";
  const phoneHref = useMemo(() => safePhoneHref(biz?.phone), [biz?.phone]);
  const mailHref = useMemo(() => safeMailHref(biz?.business_email), [biz?.business_email]);
  const socials = useMemo(() => getSocialLinks(biz), [biz]);

  function bookAgain() {
    const businessId = fav?.business?.id;
    if (!businessId) return;

    writeNewRequestPrefill({
      source: "favorite_business",
      favorite_id: fav?.id,
      business_id: businessId,
      business_name: biz?.name || "",
      base_zip: biz?.base_zip || "",
      radius_miles: isRemoteBusiness(biz) ? null : biz?.effective_service_radius_miles ?? biz?.service_radius_miles ?? null,
      is_online_only: !!biz?.is_online_only,
      business_presence_mode: biz?.business_presence_mode || "",
    });

    const qs = new URLSearchParams();
    qs.set("business_id", String(businessId));
    qs.set("favorite_id", String(fav?.id || ""));
    nav(`/customer/new-request?${qs.toString()}`);
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar title="Business Card" subtitle="Provider details" />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button tone="slate" onClick={() => nav("/customer/business-cards")}>
            ← Back to Business Cards
          </Button>

          {!loading && fav ? (
            <Button tone="cyan" onClick={bookAgain}>
              Book Again
            </Button>
          ) : null}
        </div>

        {err ? (
          <div className="text-sm text-red-200 bg-red-900/10 border border-red-800 rounded-xl p-3">
            {err}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">
            Loading…
          </div>
        ) : null}

        {!loading && fav ? (
          <div className="grid lg:grid-cols-[1.25fr_0.75fr] gap-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wider text-slate-500">Business Card</div>
                  <div className="text-2xl font-extrabold mt-1 break-words">{biz?.name || "Business"}</div>

                  {fav?.nickname ? (
                    <div className="mt-2 text-xs text-slate-500">
                      Saved as: <span className="text-slate-300">{fav.nickname}</span>
                    </div>
                  ) : null}

                  <div className="mt-3">
                    <PresenceBadge mode={biz?.business_presence_mode} />
                  </div>

                  {biz?.headline ? (
                    <div className="mt-4 text-cyan-200 text-sm leading-relaxed">{biz.headline}</div>
                  ) : null}
                </div>

                <div className="h-24 w-24 rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center shrink-0">
                  {biz?.logo_url ? (
                    <img src={biz.logo_url} alt={biz?.name || "Business"} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs text-slate-500">No Logo</span>
                  )}
                </div>
              </div>

              {socials.length ? (
                <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Social Media</div>
                  <div className="mt-3 flex gap-2 flex-wrap">
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

              <div className="mt-5 flex gap-2 flex-wrap">
                <TrustPill active={!!biz?.is_licensed} label="Licensed" />
                <TrustPill active={!!biz?.is_insured} label="Insured" />
                <TrustPill active={!!biz?.is_bonded} label="Bonded" />
                <TrustPill active={!!biz?.background_checked} label="Background Checked" />
              </div>

              <div className="mt-5 grid md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                  <div className="text-slate-500">Phone</div>
                  <div className="mt-1 text-slate-100 break-words">
                    {phoneHref ? (
                      <a href={phoneHref} className="text-cyan-300 underline">
                        {biz?.phone}
                      </a>
                    ) : (
                      biz?.phone || "—"
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                  <div className="text-slate-500">Email</div>
                  <div className="mt-1 text-slate-100 break-words">
                    {mailHref ? (
                      <a href={mailHref} className="text-cyan-300 underline break-all">
                        {biz?.business_email}
                      </a>
                    ) : (
                      biz?.business_email || "—"
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                  <div className="text-slate-500">City / State</div>
                  <div className="mt-1 text-slate-100">{displayLocation || "—"}</div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                  <div className="text-slate-500">Base ZIP / Radius</div>
                  <div className="mt-1 text-slate-100">
                    {biz?.base_zip || "—"} / {getRadiusDisplay(biz)}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="text-slate-500 text-sm">Address</div>
                <div className="mt-2 text-sm text-slate-200 whitespace-pre-wrap">{fullAddress || "—"}</div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="text-slate-500 text-sm">Service Description</div>
                <div className="mt-2 text-sm text-slate-200 whitespace-pre-wrap">
                  {biz?.services_text || "No service description added yet."}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="text-slate-500 text-sm">Website</div>
                <div className="mt-2 text-sm">
                  {site ? (
                    <a href={site} target="_blank" rel="noreferrer" className="text-cyan-300 underline break-all">
                      {site}
                    </a>
                  ) : (
                    <span className="text-slate-200">—</span>
                  )}
                </div>
              </div>

              <div className="mt-5 flex gap-3 flex-wrap">
                <Button tone="cyan" onClick={bookAgain}>
                  Book Again
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
                <div className="text-sm font-semibold">Business Card Code</div>
                <div className="mt-2 text-lg font-bold text-cyan-200 font-mono break-all">
                  {biz?.business_card_code || "—"}
                </div>

                {qrValue ? (
                  <div className="mt-4 rounded-xl bg-white p-3 w-fit">
                    <QRCodeCanvas value={qrValue} size={144} />
                  </div>
                ) : null}

                <div className="mt-3 text-xs text-slate-500">
                  Share this code or QR to help customers save this provider quickly.
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
                <div className="text-sm font-semibold">Saved Details</div>

                <div className="mt-3 grid gap-3 text-sm">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                    <div className="text-slate-500">Added</div>
                    <div className="mt-1 text-slate-100">
                      {fav.created_at ? new Date(fav.created_at).toLocaleString() : "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                    <div className="text-slate-500">Favorite ID</div>
                    <div className="mt-1 text-slate-100 font-mono">{fav?.id || "—"}</div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                    <div className="text-slate-500">Marketplace</div>
                    <div className="mt-1 text-slate-100">
                      {biz?.accepts_marketplace_tickets ? "Accepting jobs" : "Not accepting jobs"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                    <div className="text-slate-500">Emergency Service</div>
                    <div className="mt-1 text-slate-100">{biz?.emergency_service ? "Yes" : "No"}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}