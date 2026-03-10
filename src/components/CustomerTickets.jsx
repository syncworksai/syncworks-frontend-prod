// src/components/CustomerTickets.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/client";

const LS_SMS_KEY = "sw_customer_sms_ok"; // global consent (device-based for now)

function safeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

function statusPill(status) {
  const s = String(status || "").toUpperCase();
  const base = "text-[10px] px-2 py-1 rounded-full border font-semibold ";
  if (s === "COMPLETED" || s === "PAID") return base + "bg-emerald-500/10 border-emerald-500/30 text-emerald-200";
  if (s === "CANCELLED") return base + "bg-rose-500/10 border-rose-500/30 text-rose-200";
  return base + "bg-cyan-500/10 border-cyan-500/30 text-cyan-200";
}

function safeStr(x) {
  return (x ?? "").toString();
}

function titleCase(s) {
  return safeStr(s)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractSyncworksIntake(description) {
  const desc = safeStr(description);
  if (!desc) return null;

  const marker = "SyncWorks Intake:";
  const idx = desc.lastIndexOf(marker);
  if (idx === -1) return null;

  const after = desc.slice(idx + marker.length).trim();
  const start = after.indexOf("{");
  const end = after.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  const jsonStr = after.slice(start, end + 1);
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

const LIFE_CATEGORY_LABELS = {
  home_property: "Home & Property",
  rides_transport: "Rides & Transportation",
  kids_family: "Kids & Family",
  pets: "Pets",
  beauty_wellness: "Beauty & Wellness",
  events_media: "Events & Media",
  business_finance: "Business & Finance",
  property_mgmt: "Property Mgmt / Rentals",
  errands_help: "Errands & Help",
  sports_activities: "Sports & Activities",
  music_creative: "Music & Creative",
  education_tutoring: "Education & Tutoring",
  tech_digital: "Tech & Digital Help",
  other: "Something Else",
};

const SUBTYPE_LABELS = {
  ride_local: "Need a ride (local)",
  ride_airport: "Airport ride",
  ride_medical: "Medical transport (non-emergency)",
  delivery_pickup: "Delivery / pickup",
  moving_help: "Moving / hauling help",
  roadside: "Roadside help (jump/flat/lockout)",
  other_transport: "Other transportation help",

  plumbing: "Plumbing",
  hvac: "HVAC",
  electrical: "Electrical",
  cleaning: "Cleaning",
  lawn: "Lawn & Landscaping",
  handyman: "Handyman / Home Repair",
  roofing: "Roofing & Gutters",
  remodeling: "Construction & Remodeling",
  appliance: "Appliance Repair",
  pest: "Pest Control",
  security_low_voltage: "Security / Low Voltage",
  other_home: "Other home/property",

  pet_grooming: "Grooming",
  pet_sitting: "Sitting / boarding",
  pet_walking: "Dog walking",
  pet_training: "Training",
  pet_vet_mobile: "Mobile vet (non-emergency)",
  other_pets: "Other pet help",

  babysitting: "Babysitting",
  tutoring: "Tutoring",
  kids_activity: "Kids activity instructor",
  family_errands: "Family help / errands",
  other_kids: "Other kids/family",

  baseball: "Baseball coach",
  basketball: "Basketball coach",
  soccer: "Soccer coach",
  personal_training: "Personal trainer",
  dance: "Dance coach",
  martial_arts: "Martial arts",
  other_sports: "Other sports/activity",

  math: "Math tutoring",
  reading: "Reading / writing help",
  test_prep: "Test prep",
  music_lessons: "Music lessons",
  language: "Language lessons",
  other_edu: "Other education",

  piano: "Piano instructor",
  guitar: "Guitar instructor",
  voice: "Voice lessons",
  art: "Art instructor",
  other_music: "Other creative",

  photography: "Photography",
  video: "Videography / editing",
  dj: "DJ / music",
  party_help: "Party help / setup",
  other_events: "Other events/media",

  insurance: "Insurance (auto/home/life)",
  notary: "Notary",
  bookkeeping: "Bookkeeping / accounting",
  tax: "Tax help",
  marketing: "Marketing / ads",
  other_business: "Other business help",

  tenant_repair: "Tenant repair dispatch",
  turnover: "Turnover / make-ready",
  inspection: "Inspection walkthrough",
  preventative: "Preventative maintenance",
  other_pm: "Other PM help",

  computer_fix: "Computer help",
  wifi_network: "WiFi / network",
  phone_help: "Phone / device help",
  web_dev: "Website / web help",
  other_tech: "Other tech help",

  grocery: "Grocery / errands",
  pickup_dropoff: "Pickup / drop-off",
  assembly: "Assembly help",
  other_errands: "Other help",

  barber: "Barber / haircut",
  stylist: "Hair stylist",
  nails: "Nails",
  massage: "Massage",
  other_beauty: "Other beauty/wellness",

  other_any: "Describe a custom job",
};

function resolveCustomerFriendlyTitle(ticket) {
  const t = ticket || {};

  const preferred = [
    t.taxonomy_label,
    t.taxonomy?.label,
    t.taxonomy?.name,
    t.category_label,
    t.category?.label,
    t.category?.name,
    t.service_category_label,
    t.service_category?.label,
    t.service_category?.name,
    t.display_title,
    t.display_name,
    t.title,
  ]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);

  const blacklist = new Set(["ac not cooling", "ac-not-cooling", "uncategorized", "unknown", "not set"]);
  const firstGood = preferred.find((s) => !blacklist.has(s.toLowerCase()));
  if (firstGood) return firstGood;

  const intake = extractSyncworksIntake(t.description || t.details || "");
  const lifeKey = intake?.life_category || intake?.lifeCategory || "";
  const subtypeKey = intake?.subtype || intake?.type || "";

  const subtypeLabel = SUBTYPE_LABELS[subtypeKey] || (subtypeKey ? titleCase(subtypeKey) : "");
  const lifeLabel = LIFE_CATEGORY_LABELS[lifeKey] || (lifeKey ? titleCase(lifeKey) : "");

  if (subtypeLabel) return subtypeLabel;
  if (lifeLabel) return lifeLabel;

  if (t.category_name && typeof t.category_name === "string") return t.category_name;

  return "Service Request";
}

function safeDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d : null;
}

function fmtPretty(iso) {
  const d = safeDate(iso);
  if (!d) return "—";
  const date = d.toLocaleDateString(undefined, { year: "2-digit", month: "numeric", day: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} @ ${time}`;
}

function readSmsConsent() {
  try {
    const raw = localStorage.getItem(LS_SMS_KEY);
    if (raw === "1") return true;
    if (raw === "0") return false;
  } catch {
    // ignore
  }
  return true; // default ON (you can change default here)
}

function writeSmsConsent(v) {
  try {
    localStorage.setItem(LS_SMS_KEY, v ? "1" : "0");
  } catch {
    // ignore
  }
}

/**
 * CustomerTickets
 * - embedded: if true, renders only inner content (no full-page wrapper)
 * - onOpenTicket: optional callback(ticketId) to override navigation
 */
export default function CustomerTickets({ title = "My Orders", embedded = false, onOpenTicket = null }) {
  const nav = useNavigate();
  const loc = useLocation();

  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL"); // ALL | ACTIVE | COMPLETED | CANCELLED
  const [sort, setSort] = useState("NEWEST"); // NEWEST | OLDEST

  // NEW: global customer consent (device-based)
  const [smsOk, setSmsOk] = useState(() => readSmsConsent());

  useEffect(() => {
    writeSmsConsent(smsOk);
  }, [smsOk]);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const r = await api.get("/tickets/");
      setTickets(safeList(r.data));
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Failed to load tickets");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const list = Array.isArray(tickets) ? tickets : [];

    const byStatus = list.filter((t) => {
      const s = String(t?.status || "").toUpperCase();
      if (status === "ALL") return true;
      if (status === "ACTIVE") return !["COMPLETED", "PAID", "CANCELLED", "CLOSED"].includes(s);
      if (status === "COMPLETED") return ["COMPLETED", "PAID", "CLOSED", "INVOICED"].includes(s);
      if (status === "CANCELLED") return s === "CANCELLED";
      return true;
    });

    const query = q.trim().toLowerCase();
    const byQuery = !query
      ? byStatus
      : byStatus.filter((t) => {
          const title = resolveCustomerFriendlyTitle(t).toLowerCase();
          const id = String(t?.id || "");
          const addr = String(t?.service_address || "").toLowerCase();
          const zip = String(t?.service_zip || "");
          return title.includes(query) || id.includes(query) || addr.includes(query) || zip.includes(query);
        });

    const sorted = [...byQuery].sort((a, b) => {
      const da = safeDate(a?.created_at)?.getTime() || 0;
      const db = safeDate(b?.created_at)?.getTime() || 0;
      return sort === "OLDEST" ? da - db : db - da;
    });

    return sorted;
  }, [tickets, q, status, sort]);

  function openTicket(tid) {
    const id = Number(tid);
    if (!Number.isFinite(id)) return;

    if (typeof onOpenTicket === "function") return onOpenTicket(id);

    const returnTo = "/customer?tab=orders";
    nav(`/tickets/${id}?return=${encodeURIComponent(returnTo)}`, { state: { from: loc.pathname + loc.search } });
  }

  const Inner = (
    <div className={embedded ? "space-y-4" : "min-h-screen bg-[#020617] text-slate-100"}>
      <div className={embedded ? "space-y-4" : "max-w-6xl mx-auto px-4 py-6 space-y-4"}>
        {!embedded ? (
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-2xl font-bold">{title}</div>
              <div className="text-sm text-slate-400">Every service request you’ve created.</div>
            </div>
            <button onClick={load} className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900">
              Refresh
            </button>
          </div>
        ) : null}

        {/* NEW: Customer Consent Card */}
        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-100">Text message consent (from businesses)</div>
              <div className="text-xs text-slate-400 mt-1">
                This lets the provider’s <b>company phone</b> text you about scheduling/updates. SyncWorks is <b>not</b> sending texts yet.
              </div>
              <div className="text-[11px] text-slate-500 mt-2">
                Saved on this device for now. Later we’ll store it on your account + support in-app messaging.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={"text-[10px] px-2 py-1 rounded-full border font-semibold " + (smsOk ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200" : "bg-rose-500/10 border-rose-500/30 text-rose-200")}>
                {smsOk ? "Allowed" : "Not allowed"}
              </span>
              <button
                type="button"
                onClick={() => setSmsOk((v) => !v)}
                className={
                  "h-10 text-xs rounded-2xl px-4 border transition " +
                  (smsOk ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-100 hover:bg-cyan-500/25" : "bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-900")
                }
                title="Toggle consent"
              >
                {smsOk ? "Texts: ON" : "Texts: OFF"}
              </button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title, ID, address, ZIP…"
            className="w-full md:flex-1 rounded-2xl bg-slate-950/60 border border-slate-800 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500"
          />

          <div className="flex gap-2 flex-wrap">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 rounded-2xl bg-slate-950/60 border border-slate-800 px-3 text-xs text-slate-100"
              title="Filter status"
            >
              <option value="ALL">All</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-10 rounded-2xl bg-slate-950/60 border border-slate-800 px-3 text-xs text-slate-100"
              title="Sort"
            >
              <option value="NEWEST">Newest</option>
              <option value="OLDEST">Oldest</option>
            </select>

            <button
              onClick={load}
              className="h-10 text-xs rounded-2xl px-4 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40 text-slate-200"
            >
              Refresh
            </button>
          </div>
        </div>

        {err ? (
          <div className="text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-2xl p-3">{err}</div>
        ) : null}

        {loading ? <div className="text-sm text-slate-400">Loading…</div> : null}

        {!loading && filtered.length === 0 ? <div className="text-sm text-slate-400">No orders found.</div> : null}

        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((t) => {
            const friendlyTitle = resolveCustomerFriendlyTitle(t);
            return (
              <div
                key={t.id}
                role="button"
                tabIndex={0}
                onClick={() => openTicket(t.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") openTicket(t.id);
                }}
                className="rounded-3xl border border-slate-800 bg-slate-950/40 hover:bg-slate-900/45 p-4 transition cursor-pointer outline-none focus:ring-2 focus:ring-cyan-500/30"
                title="Open ticket"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold">
                    #{t.id} • {friendlyTitle}
                  </div>
                  <span className={statusPill(t.status)}>{String(t.status || "NEW")}</span>
                </div>

                <div className="text-xs text-slate-400 mt-2">
                  {t.service_zip ? `ZIP ${t.service_zip}` : "No ZIP"}
                  {t.service_address ? ` • ${t.service_address}` : ""}
                </div>

                <div className="text-[11px] text-slate-500 mt-3">Created: {fmtPretty(t.created_at)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return Inner;
}