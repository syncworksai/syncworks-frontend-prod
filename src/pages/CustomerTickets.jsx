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

function statusGroup(status) {
  const s = String(status || "").toUpperCase();
  if (["COMPLETED", "CLOSED", "CANCELLED"].includes(s)) return "COMPLETED";
  if (["INVOICED", "PAID", "PAYMENT_DUE", "OVERDUE"].includes(s)) return "PAYMENT";
  if (["SCHEDULED", "ACCEPTED", "ASSIGNED", "EN_ROUTE", "ARRIVED"].includes(s)) return "SCHEDULED";
  return "ACTIVE";
}

function statusLabel(status) {
  const s = String(status || "NEW").toUpperCase();
  const labels = {
    NEW: "New", OPEN: "Open", ASSIGNED: "Assigned", ACCEPTED: "Accepted",
    SCHEDULED: "Scheduled", EN_ROUTE: "En route", ARRIVED: "Arrived",
    IN_PROGRESS: "In progress", COMPLETED: "Completed", INVOICED: "Invoice ready",
    PAYMENT_DUE: "Payment due", OVERDUE: "Overdue", PAID: "Paid",
    CLOSED: "Closed", CANCELLED: "Cancelled",
  };
  return labels[s] || titleCase(s);
}

function StatusPill({ status }) {
  const s = String(status || "").toUpperCase();
  const base = "rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] ";
  if (["PAID", "COMPLETED", "CLOSED"].includes(s)) {
    return <span className={base + "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"}>{statusLabel(s)}</span>;
  }
  if (["CANCELLED", "OVERDUE"].includes(s)) {
    return <span className={base + "border-rose-400/30 bg-rose-400/10 text-rose-200"}>{statusLabel(s)}</span>;
  }
  if (["INVOICED", "PAYMENT_DUE"].includes(s)) {
    return <span className={base + "border-amber-400/30 bg-amber-400/10 text-amber-200"}>{statusLabel(s)}</span>;
  }
  if (["SCHEDULED", "ASSIGNED", "ACCEPTED", "EN_ROUTE", "ARRIVED"].includes(s)) {
    return <span className={base + "border-violet-400/30 bg-violet-400/10 text-violet-200"}>{statusLabel(s)}</span>;
  }
  return <span className={base + "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"}>{statusLabel(s)}</span>;
}

function requestSource(ticket) {
  const intake = extractSyncworksIntake(ticket?.description || ticket?.details || "") || {};
  const scope = String(intake.route_scope || "").toUpperCase();
  const creator = String(intake.creator_mode || "").toUpperCase();

  if (creator === "BUSINESS_INTERNAL" || intake.is_business_internal) {
    return { label: "Business entered", tone: "indigo" };
  }
  if (scope === "DIRECT_PROVIDER" || intake.direct_provider_id || ticket?.target_business) {
    return { label: "Saved business", tone: "emerald" };
  }
  if (ticket?.is_marketplace === false) {
    return { label: "Direct request", tone: "emerald" };
  }
  return { label: "Marketplace", tone: "cyan" };
}

function SourcePill({ ticket }) {
  const source = requestSource(ticket);
  const tones = {
    cyan: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
    emerald: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    indigo: "border-indigo-400/25 bg-indigo-400/10 text-indigo-200",
  };
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${tones[source.tone]}`}>
      {source.label}
    </span>
  );
}

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "SCHEDULED", label: "Scheduled" },
  { key: "PAYMENT", label: "Payment" },
  { key: "COMPLETED", label: "Completed" },
];

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
        return statusGroup(t?.status) === st;
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

  const counts = useMemo(() => {
    const base = { ALL: tickets.length, ACTIVE: 0, SCHEDULED: 0, PAYMENT: 0, COMPLETED: 0 };
    tickets.forEach((ticket) => {
      const group = statusGroup(ticket?.status);
      if (base[group] !== undefined) base[group] += 1;
    });
    return base;
  }, [tickets]);

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

        <section className="rounded-[2rem] border border-slate-800 bg-slate-950/55 p-4 shadow-[0_0_40px_rgba(15,23,42,0.35)]">
          <div className="flex items-center gap-2">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-lg">
              🔎
            </div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search requests, address, ZIP, or ticket #"
              className="h-11 min-w-0 flex-1 rounded-2xl border border-slate-800 bg-slate-950 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40"
            />
            <button
              onClick={load}
              className="h-11 shrink-0 rounded-2xl border border-slate-800 bg-slate-950 px-3 text-xs font-black text-slate-300"
            >
              Refresh
            </button>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((filter) => {
              const active = status === filter.key;
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setStatus(filter.key)}
                  className={[
                    "flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black transition",
                    active
                      ? "border-cyan-400/35 bg-cyan-400/15 text-cyan-100"
                      : "border-slate-800 bg-slate-950 text-slate-400",
                  ].join(" ")}
                >
                  <span>{filter.label}</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px]">
                    {counts[filter.key] || 0}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 text-[11px] text-slate-500">
            Showing <span className="font-black text-slate-200">{filtered.length}</span> request{filtered.length === 1 ? "" : "s"}
          </div>
        </section>

        {err ? (
          <div className="text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-xl p-3">
            {err}
          </div>
        ) : null}

        {loading ? <div className="text-sm text-slate-400">Loading…</div> : null}

        {!loading && filtered.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-700 bg-slate-950/35 p-8 text-center">
            <div className="text-3xl">📋</div>
            <div className="mt-3 text-sm font-black text-white">No matching requests</div>
            <div className="mt-1 text-xs leading-5 text-slate-500">
              Try another status tab or clear your search.
            </div>
          </div>
        ) : null}

        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((t) => {
            const friendly = resolveCustomerFriendlyTitle(t);

            return (
              <article
                key={t.id}
                role="button"
                tabIndex={0}
                onClick={() => nav(`/tickets/${t.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") nav(`/tickets/${t.id}`);
                }}
                className="group cursor-pointer rounded-[1.75rem] border border-slate-800 bg-slate-950/55 p-4 outline-none transition hover:border-cyan-400/25 hover:bg-slate-900/45 focus:ring-2 focus:ring-cyan-500/30"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={t.status} />
                  <SourcePill ticket={t} />
                </div>

                <div className="mt-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-black text-white">{friendly}</div>
                    <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      Ticket #{t.id}
                    </div>
                  </div>
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-800 bg-slate-950 text-slate-500 transition group-hover:border-cyan-400/30 group-hover:text-cyan-200">
                    →
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
                    Service location
                  </div>
                  <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-300">
                    {t.service_address || (t.service_zip ? `ZIP ${t.service_zip}` : "Location pending")}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-slate-500">
                  <span>
                    {t.created_at ? new Date(t.created_at).toLocaleDateString() : "Date unavailable"}
                  </span>
                  <span className="font-bold text-cyan-200">View request</span>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
