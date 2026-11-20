import React, { useEffect, useMemo, useState } from "react";
import {Building2, CalendarDays, ChevronLeft, ChevronRight, X, Star, Phone, Mail, ExternalLink, Info} from "lucide-react";
import "./RolodexCompact.css";
import { useNavigate, useSearchParams } from "react-router-dom";
import { extractBusinessCardCode } from "../utils/businessQrCodes.mjs";
import "./CustomerRolodex.css";
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

function getBusinessLogoUrl(biz) {
  const raw =
    biz?.logo_url ||
    biz?.logo ||
    biz?.logo_image ||
    biz?.logo_file ||
    "";

  const base = String(raw || "").trim();
  if (!base) return "";

  const stamp =
    biz?.logo_updated_at ||
    biz?.updated_at ||
    biz?.modified ||
    biz?.updated ||
    "";

  if (!stamp) return base;

  return `${base}${base.includes("?") ? "&" : "?"}v=${encodeURIComponent(String(stamp))}`;
}

function BusinessLogo({biz,large=false}) {
  const [failed,setFailed]=useState(false);
  const url=getBusinessLogoUrl(biz);
  useEffect(()=>setFailed(false),[url]);
  return <div className={`sw-rolo-logo ${large?"large":""}`}>
    {url&&!failed?<img src={url} alt={`${biz?.name||"Business"} logo`} loading="lazy" onError={()=>setFailed(true)}/>:
      <div className="sw-rolo-logo-fallback" aria-label="No business logo"><Building2 size={25}/><span>{String(biz?.name||"Business").slice(0,2).toUpperCase()}</span></div>}
  </div>;
}
function getFlag(biz, key) {
  if (typeof biz?.[key] === "boolean") return !!biz[key];
  if (typeof biz?.compliance?.[key] === "boolean") return !!biz.compliance[key];
  return false;
}

function groupLabelFromBusiness(biz) {
  const tags = Array.isArray(biz?.services_offered)
    ? biz.services_offered
        .map((x) =>
          typeof x === "number"
            ? `service-${x}`
            : `${x?.name || ""} ${x?.key || ""} ${x?.path || ""}`
        )
        .join(" ")
        .toLowerCase()
    : "";

  const headline = safeText(biz?.headline).toLowerCase();
  const services = safeText(biz?.services_text).toLowerCase();
  const blob = `${headline} ${services} ${tags}`;

  if (blob.includes("plumb")) return "Plumbing";
  if (blob.includes("hvac") || blob.includes("air") || blob.includes("cooling") || blob.includes("heating")) return "HVAC";
  if (blob.includes("electric")) return "Electrical";
  if (blob.includes("detail") || blob.includes("towing") || blob.includes("mechanic") || blob.includes("roadside")) return "Auto";
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
    (biz?.effective_service_radius_miles == null && biz?.service_radius_miles == null)
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
  const [urlParams, setUrlParams] = useSearchParams();
  const incomingCode = urlParams.get("code") || "";

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [items, setItems] = useState([]);
  const [activeGroup, setActiveGroup] = useState("All");
  const [search, setSearch] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [opened, setOpened] = useState(null);
  const [drawerMode,setDrawerMode]=useState("details");
  const [page,setPage]=useState(0);
  const pageSize=6;
  useEffect(()=>setPage(0),[search,activeGroup]);
  useEffect(()=>{if(!opened)return;const onKey=e=>{if(e.key==="Escape")setOpened(null)};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey)},[opened]);

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
          ? biz.services_offered.flatMap((x) =>
              typeof x === "number" ? [String(x)] : [x?.name, x?.key, x?.path]
            )
          : []),
      ]
        .map((x) => String(x || "").toLowerCase())
        .join(" ");

      return blob.includes(q);
    });
  }, [items, activeGroup, search]);

  async function addByCode(codeRaw) {
    const code = extractBusinessCardCode(codeRaw);
    if (!code) {
      throw new Error("Enter a valid SyncWorks business QR or SW- code.");
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

  // QR scans open this route. Ask for deliberate confirmation: never save a
  // provider automatically merely because a link was opened.
  const [qrPreview, setQrPreview] = useState(null);
  const [qrPreviewError, setQrPreviewError] = useState("");
  useEffect(() => {
    const code = extractBusinessCardCode(incomingCode);
    if (!incomingCode) { setQrPreview(null); setQrPreviewError(""); return; }
    if (!code) { setQrPreview(null); setQrPreviewError("Unrecognized business QR. Ask the business for an updated SyncWorks code."); return; }
    let alive = true;
    api.get("/me/business-cards/resolve/", { params: { code } })
      .then(({ data }) => { if(alive) {setQrPreview({ code, business:data?.business });setQrPreviewError("");} })
      .catch((e) => {if(alive) {setQrPreview(null);setQrPreviewError(e?.response?.data?.detail || "Unable to verify this business QR.");}});
    return () => {alive = false;};
  }, [incomingCode]);

  function clearQrPreview() {
    setQrPreview(null);
    setQrPreviewError("");
    const next = new URLSearchParams(urlParams);
    next.delete("code");
    setUrlParams(next, { replace:true });
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
      radius_miles: isRemoteBusiness(biz)
        ? null
        : biz?.effective_service_radius_miles ?? biz?.service_radius_miles ?? null,
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
    <div className="sw-rolodex-page sw-rolo-compact-page text-slate-100">
      <ModeBar title="My Rolodex" subtitle="Your trusted businesses, ready for direct requests." />

      <main className="sw-rolodex-main sw-rolo-compact-main">
        <div className="sw-rolodex-head"><div><p>SYNCWORKS / APPS</p><h1>My Rolodex</h1><span>Save, discover and request service from trusted businesses.</span></div><button type="button" onClick={()=>nav("/customer/new-request")}>New Request</button></div>
        {qrPreviewError ? <div role="alert" className="rounded-2xl border border-rose-400/40 bg-rose-950/60 p-3 text-sm text-rose-100">{qrPreviewError}<button type="button" className="ml-3 underline" onClick={clearQrPreview}>Dismiss</button></div> : null}
        {qrPreview?.business ? <section className="rounded-3xl border border-cyan-300/60 bg-slate-950/80 p-4 shadow-xl"><div className="text-xs font-black uppercase tracking-widest text-cyan-300">Scanned business card</div><h2 className="mt-2 text-xl font-black">{qrPreview.business.name}</h2><p className="mt-1 text-xs text-slate-300">{qrPreview.business.headline || "Verify this business before saving."}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busy} className="min-h-11 rounded-xl bg-cyan-400 px-4 font-bold text-slate-950 disabled:opacity-60" onClick={async()=>{try{await addByCode(qrPreview.code);clearQrPreview();}catch{}}}>{busy?"Saving…":"Save to Rolodex"}</button><button type="button" onClick={clearQrPreview} className="min-h-11 rounded-xl border border-slate-500 px-4">Not now</button></div></section> : null}
        <div className="sw-rolo-toolbar">
          <div className="sw-rolo-toolbar-actions">
            <button type="button" onClick={()=>nav(-1)} disabled={busy}>Back</button>
            <button type="button" onClick={load} disabled={loading||busy}>{loading?"Loading…":"Refresh"}</button>
            <button type="button" onClick={()=>setScanOpen(true)} disabled={busy}>Scan QR</button>
            <button type="button" onClick={()=>setAddOpen(true)} disabled={busy}>Add by Code</button>
          </div>
          <div className="sw-rolo-search">
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a saved business, service or location…" aria-label="Search saved business cards"/>
            <span>{filteredItems.length} saved</span>
          </div>
          <div className="sw-rolo-filter" aria-label="Service filters">
            {groups.map(group=><button type="button" key={group} aria-pressed={activeGroup===group} onClick={()=>setActiveGroup(group)}>{group}</button>)}
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

        {!loading && filteredItems.length ? <>
          <div className="sw-rolo-list" aria-label="Saved business cards">
            {filteredItems.slice(page*pageSize,(page+1)*pageSize).map(fav=>{
              const biz=fav.business||{};
              const location=biz.display_location||[biz.city,biz.state].filter(Boolean).join(", ");
              const rating=Number(biz.rating);
              const rated=biz.rating!=null&&Number.isFinite(rating)&&rating>0;
              return <article className="sw-rolo-card" key={fav.id}>
                <BusinessLogo biz={biz}/>
                <div className="sw-rolo-card-info">
                  <strong title={biz.name}>{biz.name||"Business"}</strong>
                  <div className="sw-rolo-card-meta"><span>{groupLabelFromBusiness(biz)}</span><span>{getPresenceMeta(biz.business_presence_mode).label}</span>{location&&<span>{location}</span>}</div>
                  <p>{biz.headline||biz.services_text||"Open the business card for services and contact details."}</p>
                  <button type="button" className="sw-rolo-rating" onClick={()=>{setOpened(fav);setDrawerMode("reviews")}} aria-label={rated?`View ratings for ${biz.name}`:`Reviews for ${biz.name}`}>
                    <Star size={14} fill={rated?"currentColor":"none"}/>{rated?`${rating.toFixed(1)} / 5`:"Not yet rated"} <span>Reviews</span>
                  </button>
                </div>
                <div className="sw-rolo-card-actions">
                  <button type="button" className="primary" onClick={()=>{setOpened(fav);setDrawerMode("call")}}><CalendarDays size={15}/> Schedule a Call</button>
                  <button type="button" onClick={()=>{setOpened(fav);setDrawerMode("reviews")}}><Star size={15}/> Reviews</button>
                  <button type="button" onClick={()=>{setOpened(fav);setDrawerMode("details")}}><Info size={15}/> More</button>
                </div>
              </article>
            })}
          </div>
          <nav className="sw-rolo-pages" aria-label="Saved business pages">
            <button type="button" disabled={page===0} onClick={()=>setPage(p=>Math.max(0,p-1))}><ChevronLeft size={15}/> Previous</button>
            <span>Page {page+1} of {Math.ceil(filteredItems.length/pageSize)}</span>
            <button type="button" disabled={(page+1)*pageSize>=filteredItems.length} onClick={()=>setPage(p=>p+1)}>Next <ChevronRight size={15}/></button>
          </nav>
        </> : null}
      </main>

      {opened&&<div className="sw-rolo-drawer-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setOpened(null)}}>
        <aside className="sw-rolo-drawer" role="dialog" aria-modal="true" aria-label={`${opened.business?.name||"Business"} information`}>
          <header><BusinessLogo biz={opened.business} large/><div><small>Saved business</small><h2>{opened.business?.name||"Business"}</h2><p>{groupLabelFromBusiness(opened.business||{})}</p></div><button type="button" aria-label="Close details" onClick={()=>setOpened(null)}><X size={20}/></button></header>
          <div className="sw-rolo-drawer-tabs">{[["details","Details"],["call","Schedule a Call"],["reviews","Reviews"]].map(([key,label])=><button type="button" aria-pressed={drawerMode===key} key={key} onClick={()=>setDrawerMode(key)}>{label}</button>)}</div>
          <div className="sw-rolo-drawer-body">
            {drawerMode==="details"&&<>
              <p>{opened.business?.headline||opened.business?.services_text||"No additional business description is available."}</p>
              <dl>{[["Location",opened.business?.display_location||[opened.business?.city,opened.business?.state].filter(Boolean).join(", ")],["Service radius",getRadiusLabel(opened.business)],["Phone",opened.business?.phone],["Email",opened.business?.business_email],["Services",opened.business?.services_text]].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v||"—"}</dd></div>)}</dl>
              <div className="sw-rolo-drawer-links">{getSocialLinks(opened.business).map(x=><a key={x.key} href={x.url} target="_blank" rel="noreferrer">{x.label} <ExternalLink size={13}/></a>)}</div>
              <div className="sw-rolo-drawer-links"><button type="button" onClick={()=>{setOpened(null);nav(`/customer/business-cards/${opened.id}`)}}>Full profile <ExternalLink size={14}/></button><button type="button" onClick={()=>{setOpened(null);bookAgain(opened)}}>Request service</button><button type="button" onClick={()=>{setOpened(null);removeCard(opened)}}>Remove saved card</button></div>
            </>}
            {drawerMode==="call"&&<>
              <p>Connect with this business to arrange a call. These options start a request or contact the provider; no appointment is confirmed automatically.</p>
              <div className="sw-rolo-drawer-links">
                {opened.business?.phone&&<a href={`tel:${String(opened.business.phone).replace(/[^+\d]/g,"")}`}><Phone size={15}/> Call business</a>}
                {opened.business?.business_email&&<a href={`mailto:${encodeURIComponent(opened.business.business_email)}?subject=${encodeURIComponent("Request to schedule a call")}&body=${encodeURIComponent(`Hello ${opened.business?.name||""},\n\nI'd like to arrange a call. Please let me know your availability.\n\nThank you.`)}`}><Mail size={15}/> Email call request</a>}
                <button type="button" onClick={()=>{setOpened(null);bookAgain(opened)}}><CalendarDays size={15}/> Start SyncWorks request</button>
              </div>
              {!opened.business?.phone&&!opened.business?.business_email&&<p>No public phone or email is listed. Use the SyncWorks request flow to contact this provider.</p>}
            </>}
            {drawerMode==="reviews"&&<>
              <div className="sw-rolo-review-summary"><Star size={28} fill={Number(opened.business?.rating)>0?"currentColor":"none"}/><strong>{Number(opened.business?.rating)>0?Number(opened.business.rating).toFixed(1)+" / 5":"No verified rating available"}</strong></div>
              <p>Reviews must come from verified business feedback. Individual reviews and new review submissions are not available through this Rolodex API yet. We won't display fictional testimonials or accept unverified ratings.</p>
              <button type="button" className="sw-rolo-review-profile" onClick={()=>{setOpened(null);nav(`/customer/business-cards/${opened.id}`)}}>View full business profile <ExternalLink size={15}/></button>
            </>}
          </div>
        </aside>
      </div>}
      <AddBusinessCardModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={(code) => addByCode(code)}
      />

      <BarcodeScannerModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onDetected={async(raw) => { const code=extractBusinessCardCode(raw); if (!code) {setErr("Scan a valid SyncWorks business QR code.");return;} await addByCode(code); }}
      />
    </div>
  );
}