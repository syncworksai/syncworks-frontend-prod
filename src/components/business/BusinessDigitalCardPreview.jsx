// src/components/business/BusinessDigitalCardPreview.jsx
import React, { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function normalizeWebsite(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function serviceNames(categories, selectedServiceIds) {
  const selected = new Set((selectedServiceIds || []).map(Number).filter(Boolean));
  return (categories || [])
    .filter((cat) => selected.has(Number(cat?.id || cat?.pk || 0)))
    .map((cat) => String(cat?.name || cat?.label || cat?.title || "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

function escapeVCard(value) {
  return String(value || "")
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\n", "\\n");
}

function businessConnectCode(businessId) {
  const raw = String(businessId || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return raw ? `SWB-${raw.padStart(6, "0")}` : "SWB-PENDING";
}

export default function BusinessDigitalCardPreview({
  businessId,
  name,
  logoUrl,
  headline,
  servicesText,
  phone,
  businessEmail,
  website,
  city,
  state,
  baseZip,
  radius,
  serviceAreas,
  acceptsMarketplace,
  businessPresenceMode,
  categories,
  selectedServiceIds,
  readiness,
}) {
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const selectedNames = useMemo(
    () => serviceNames(categories, selectedServiceIds),
    [categories, selectedServiceIds]
  );

  const location = [city, state, baseZip].filter(Boolean).join(", ");
  const webHref = normalizeWebsite(website);
  const connectCode = useMemo(() => businessConnectCode(businessId), [businessId]);

  const shareText = useMemo(() => {
    const lines = [
      name || "SyncWorks Business",
      headline || "",
      servicesText || selectedNames.join(", "),
      location ? `Based in ${location}` : "",
      radius ? `Serving approximately ${radius} miles from ${baseZip || "headquarters"}` : "",
      phone ? `Phone: ${phone}` : "",
      businessEmail ? `Email: ${businessEmail}` : "",
      website ? `Website: ${website}` : "",
      businessId ? `SyncWorks Business ID: ${businessId}` : "",
      `SyncWorks Connect Code: ${connectCode}`,
    ];
    return lines.filter(Boolean).join("\n");
  }, [
    name,
    headline,
    servicesText,
    selectedNames,
    location,
    radius,
    baseZip,
    phone,
    businessEmail,
    website,
    businessId,
    connectCode,
  ]);

  const vCardValue = useMemo(() => {
    const addressParts = [city, state, baseZip].filter(Boolean).map(escapeVCard).join(";");
    return [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${escapeVCard(name || "SyncWorks Business")}`,
      `ORG:${escapeVCard(name || "SyncWorks Business")}`,
      headline ? `TITLE:${escapeVCard(headline)}` : "",
      phone ? `TEL;TYPE=WORK,VOICE:${escapeVCard(phone)}` : "",
      businessEmail ? `EMAIL;TYPE=WORK:${escapeVCard(businessEmail)}` : "",
      webHref ? `URL:${escapeVCard(webHref)}` : "",
      addressParts ? `ADR;TYPE=WORK:;;;${addressParts};;` : "",
      `NOTE:${escapeVCard(`SyncWorks Connect Code: ${connectCode}`)}`,
      "END:VCARD",
    ]
      .filter(Boolean)
      .join("\n");
  }, [name, headline, phone, businessEmail, webHref, city, state, baseZip, connectCode]);

  async function copyCard() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  async function copyConnectCode() {
    try {
      await navigator.clipboard.writeText(connectCode);
      setCodeCopied(true);
      window.setTimeout(() => setCodeCopied(false), 1800);
    } catch {
      setCodeCopied(false);
    }
  }

  function downloadQr() {
    const svg = document.getElementById(`business-card-qr-${businessId || "pending"}`);
    if (!svg) return;

    const markup = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${String(name || "syncworks-business").trim().replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-qr.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-500/25 bg-[linear-gradient(145deg,rgba(8,47,73,0.75),rgba(15,23,42,0.94),rgba(88,28,135,0.44))] p-5 shadow-[0_0_70px_rgba(34,211,238,0.12)] md:p-6">
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/4 h-72 w-72 rounded-full bg-fuchsia-500/12 blur-3xl" />

        <div className="relative">
          <div className="flex items-start gap-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70">
              {logoUrl ? (
                <img src={logoUrl} alt={name || "Business"} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-black text-slate-500">LOGO</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">
                  SyncWorks Business
                </span>
                <span
                  className={cx(
                    "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]",
                    acceptsMarketplace
                      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                      : "border-slate-700 bg-slate-900/70 text-slate-400"
                  )}
                >
                  {acceptsMarketplace ? "Marketplace On" : "Marketplace Off"}
                </span>
              </div>

              <h2 className="mt-3 break-words text-2xl font-black tracking-tight text-white">
                {name || "Your Business Name"}
              </h2>
              <div className="mt-1 text-sm font-semibold text-cyan-100">
                {headline || "Add a customer-facing headline in Business Settings."}
              </div>
              <div className="mt-2 text-xs text-slate-400">
                {location || "Add city, state, and ZIP to establish your headquarters."}
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-white/10 bg-slate-950/45 p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              What we offer
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-200">
              {servicesText ||
                (selectedNames.length
                  ? selectedNames.join(" • ")
                  : "Select services, products, food, bookings, or other categories in Settings.")}
            </div>

            {selectedNames.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedNames.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-3 py-1 text-[11px] font-bold text-fuchsia-100"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                Business model
              </div>
              <div className="mt-1 text-sm font-semibold capitalize text-white">
                {businessPresenceMode ? businessPresenceMode.replaceAll("_", " ") : "Not selected"}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                Standard coverage
              </div>
              <div className="mt-1 text-sm font-semibold text-white">
                {baseZip && radius ? `${radius} miles from ${baseZip}` : "Add ZIP and radius"}
              </div>
            </div>
          </div>

          {(serviceAreas || []).filter((area) => area?.active !== false).length ? (
            <div className="mt-4 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">
                Expanded coverage
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(serviceAreas || [])
                  .filter((area) => area?.active !== false)
                  .slice(0, 6)
                  .map((area) => (
                    <span key={area.id} className="rounded-full border border-emerald-400/25 px-3 py-1 text-[11px] font-bold text-emerald-100">
                      {area.name || area.area_type}
                    </span>
                  ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {phone ? (
              <a
                href={`tel:${String(phone).replace(/[^\d+]/g, "")}`}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/12 px-4 text-sm font-black text-cyan-100"
              >
                Call
              </a>
            ) : null}
            {businessEmail ? (
              <a
                href={`mailto:${businessEmail}`}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/70 px-4 text-sm font-black text-slate-200"
              >
                Email
              </a>
            ) : null}
            {webHref ? (
              <a
                href={webHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/70 px-4 text-sm font-black text-slate-200"
              >
                Website
              </a>
            ) : null}
            <button
              type="button"
              onClick={copyCard}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/12 px-4 text-sm font-black text-fuchsia-100"
            >
              {copied ? "Copied" : "Copy Card"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-cyan-500/25 bg-slate-950/60 p-4 md:p-5">
        <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
          <div className="mx-auto rounded-3xl bg-white p-4 shadow-[0_0_40px_rgba(34,211,238,0.18)]">
            <QRCodeSVG
              id={`business-card-qr-${businessId || "pending"}`}
              value={vCardValue}
              size={188}
              level="M"
              includeMargin
              title={`Add ${name || "this business"} to contacts`}
            />
          </div>

          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-200">
              Scan to add this business
            </div>
            <h3 className="mt-2 text-xl font-black text-white">QR contact card</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              A customer can scan this QR code with a phone camera and save the business contact information directly.
            </p>

            <div className="mt-4 rounded-2xl border border-fuchsia-400/25 bg-fuchsia-500/10 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-200">
                SyncWorks Connect Code
              </div>
              <div className="mt-2 break-all font-mono text-2xl font-black tracking-[0.16em] text-white">
                {connectCode}
              </div>
              <div className="mt-2 text-xs leading-5 text-slate-400">
                This code is unique to Business ID {businessId || "pending"}. It can be shared verbally or copied when a QR scan is not practical.
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={copyConnectCode}
                className="min-h-11 rounded-2xl border border-cyan-400/30 bg-cyan-500/12 px-4 text-sm font-black text-cyan-100"
              >
                {codeCopied ? "Code Copied" : "Copy Connect Code"}
              </button>
              <button
                type="button"
                onClick={downloadQr}
                className="min-h-11 rounded-2xl border border-slate-700 bg-slate-950/70 px-4 text-sm font-black text-slate-200"
              >
                Save QR Image
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950/50 p-4 md:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-white">Card readiness</div>
            <div className="mt-1 text-xs leading-5 text-slate-400">
              This preview, QR contact card, and Connect Code update from the saved Business profile. A future backend connection flow can use the same Business ID for in-app customer connections.
            </div>
          </div>
          <div className="text-2xl font-black text-cyan-100">{readiness}%</div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-900">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-purple-400"
            style={{ width: `${readiness}%` }}
          />
        </div>
      </section>
    </div>
  );
}
