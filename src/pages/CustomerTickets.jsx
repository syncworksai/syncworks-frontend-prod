// src/components/CustomerTickets.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

function safeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

// ---- friendly title resolver (same logic as dashboard) ----
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

function StatusPill({ status }) {
  const s = String(status || "").toUpperCase();
  const base = "text-[10px] px-2 py-1 rounded-full border font-semibold ";
  if (s === "COMPLETED" || s === "PAID") return <span className={base + "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"}>{s}</span>;
  if (s === "CANCELLED") return <span className={base + "bg-rose-500/10 border-rose-500/30 text-rose-200"}>{s}</span>;
  return <span className={base + "bg-cyan-500/10 border-cyan-500/30 text-cyan-200"}>{s || "NEW"}</span>;
}

export default function CustomerTickets({ title = "My Orders", embedded = false }) {
  const nav = useNavigate();

  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");

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
    const qq = q.trim().toLowerCase();
    const st = String(status || "ALL").toUpperCase();

    return list
      .filter((t) => {
        if (st === "ALL") return true;
        return String(t?.status || "").toUpperCase() === st;
      })
      .filter((t) => {
        if (!qq) return true;
        const title = resolveCustomerFriendlyTitle(t).toLowerCase();
        const addr = safeStr(t?.service_address).toLowerCase();
        const zip = safeStr(t?.service_zip).toLowerCase();
        const id = safeStr(t?.id).toLowerCase();
        return title.includes(qq) || addr.includes(qq) || zip.includes(qq) || id.includes(qq);
      })
      .sort((a, b) => {
        const da = new Date(a?.created_at || 0).getTime() || 0;
        const db = new Date(b?.created_at || 0).getTime() || 0;
        return db - da;
      });
  }, [tickets, q, status]);

  const wrapperClass = embedded ? "" : "min-h-screen bg-[#020617] text-slate-100";

  return (
    <div className={wrapperClass}>
      <main className={embedded ? "space-y-4" : "max-w-6xl mx-auto px-4 py-6 space-y-4"}>
        {!embedded ? (
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-2xl font-bold">{title}</div>
              <div className="text-sm text-slate-400">Track status updates and ticket routing.</div>
            </div>
            <button
              onClick={load}
              className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
            >
              Refresh
            </button>
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-2 justify-between">
            <div className="flex gap-2 flex-wrap items-center">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search title, address, zip, or ticket #"
                className="w-full md:w-[340px] rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              />

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              >
                <option value="ALL">All statuses</option>
                <option value="NEW">NEW</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="ACCEPTED">ACCEPTED</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="PAID">PAID</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="CLOSED">CLOSED</option>
              </select>

              <button
                onClick={load}
                className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
              >
                Refresh
              </button>
            </div>

            <div className="text-[11px] text-slate-500">
              Showing <span className="text-slate-200 font-semibold">{filtered.length}</span>
            </div>
          </div>
        </div>

        {err ? (
          <div className="text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-xl p-3">
            {err}
          </div>
        ) : null}

        {loading ? <div className="text-sm text-slate-400">Loading…</div> : null}

        {!loading && filtered.length === 0 ? (
          <div className="text-sm text-slate-400">No orders found.</div>
        ) : null}

        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((t) => {
            const friendly = resolveCustomerFriendlyTitle(t);

            return (
              <div
                key={t.id}
                role="button"
                tabIndex={0}
                onClick={() => nav(`/tickets/${t.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") nav(`/tickets/${t.id}`);
                }}
                className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 cursor-pointer hover:bg-slate-900/35 transition outline-none focus:ring-2 focus:ring-cyan-500/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">
                      #{t.id} • {friendly}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {t.service_zip ? `ZIP ${t.service_zip}` : "No ZIP"}
                      {t.service_address ? ` • ${t.service_address}` : ""}
                    </div>
                  </div>
                  <StatusPill status={t.status} />
                </div>

                <div className="text-[11px] text-slate-500 mt-3">
                  Created: {t.created_at ? new Date(t.created_at).toLocaleString() : "—"}
                </div>

                {t.accepted_at ? (
                  <div className="text-[11px] text-slate-500 mt-1">
                    Accepted: {new Date(t.accepted_at).toLocaleString()}
                  </div>
                ) : null}

                {t.started_at ? (
                  <div className="text-[11px] text-slate-500 mt-1">
                    Started: {new Date(t.started_at).toLocaleString()}
                  </div>
                ) : null}

                {t.completed_at ? (
                  <div className="text-[11px] text-slate-500 mt-1">
                    Completed: {new Date(t.completed_at).toLocaleString()}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
