import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarClock, CheckCircle2, Clock3, LoaderCircle, MapPin, Search, ShieldCheck, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardShell from "../components/dashboard/DashboardShell";
import { bookMarketplaceSlot, getMarketplaceAvailability, getServiceCategories } from "../api/marketplaceAvailability";

const PRIORITIES = [
  { value: "EMERGENCY", label: "Emergency", detail: "Immediate response target" },
  { value: "URGENT", label: "Urgent", detail: "Needs prompt attention" },
  { value: "STANDARD", label: "Standard", detail: "Normal scheduling" },
  { value: "FLEXIBLE", label: "Flexible", detail: "Best available fit" },
];

function formatSlot(value) {
  if (!value) return "";
  const d = new Date(value);
  return d.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function CustomerMarketplaceAvailability() {
  const nav = useNavigate();
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [address, setAddress] = useState("");
  const [priority, setPriority] = useState("STANDARD");
  const [duration, setDuration] = useState(60);
  const [details, setDetails] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookingKey, setBookingKey] = useState("");
  const [notice, setNotice] = useState("");
  const [created, setCreated] = useState(null);

  useEffect(() => {
    let active = true;
    getServiceCategories()
      .then((rows) => {
        if (!active) return;
        setCategories(rows.filter((row) => row?.is_active !== false));
      })
      .catch(() => active && setNotice("Service categories could not be loaded."));
    return () => { active = false; };
  }, []);

  const selectedCategory = useMemo(
    () => categories.find((row) => String(row.id) === String(categoryId)),
    [categories, categoryId]
  );

  async function searchAvailability() {
    if (!categoryId || !zipCode.trim()) {
      setNotice("Choose a service and enter the service ZIP code.");
      return;
    }
    setLoading(true);
    setNotice("");
    setCreated(null);
    try {
      const data = await getMarketplaceAvailability({
        category_id: categoryId,
        zip_code: zipCode.trim(),
        duration_minutes: Number(duration || 60),
      });
      setResults(data.results || []);
      if (!(data.results || []).length) {
        setNotice("No SyncWorks business has bookable workforce capacity for that service yet. You can still create an open Marketplace request.");
      }
    } catch (error) {
      setResults([]);
      setNotice(error?.response?.data?.detail || "Availability could not be checked right now.");
    } finally {
      setLoading(false);
    }
  }

  async function book(business, slot) {
    const key = `${business.business_id}-${slot.start}-${slot.member_id}`;
    setBookingKey(key);
    setNotice("");
    try {
      const payload = {
        business_id: business.business_id,
        category_id: categoryId,
        member_id: slot.member_id,
        start: slot.start,
        end: slot.end,
        priority,
        title: selectedCategory?.name || selectedCategory?.label || "Marketplace service request",
        description: details,
        address,
        zip_code: zipCode.trim(),
      };
      const value = await bookMarketplaceSlot(payload);
      setCreated(value);
      setNotice(`Booked with ${value?.business?.name || business.name}. Ticket ${value?.ticket_code || "created"}.`);
      setResults((current) => current.map((row) => row.business_id === business.business_id ? {
        ...row,
        slots: row.slots.filter((candidate) => candidate.start !== slot.start || candidate.member_id !== slot.member_id),
      } : row));
    } catch (error) {
      const message = error?.response?.data?.detail || "That opening could not be booked.";
      setNotice(message);
      if (error?.response?.status === 409) searchAvailability();
    } finally {
      setBookingKey("");
    }
  }

  return (
    <DashboardShell modeBarTitle="Personal" modeBarSubtitle="Marketplace availability">
      <div className="mx-auto max-w-6xl space-y-4 pb-28">
        <section className="rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_88%_8%,rgba(139,92,246,.2),transparent_32%),rgba(2,6,23,.94)] p-5 sm:p-7">
          <button type="button" onClick={() => nav("/customer/new-request")} className="inline-flex items-center gap-2 text-xs font-black text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" />Back to requests</button>
          <div className="mt-4 flex items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200"><CalendarClock className="h-6 w-6" /></div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">SyncWorks Marketplace</div>
              <h1 className="mt-1 text-3xl font-black text-white">Find businesses that can actually take the work.</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">SyncWorks checks the business service setup, schedulable staff and already-booked SyncWorks work before showing an opening. The business stays in control of its workforce and schedule.</p>
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-bold text-slate-400">Service
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white">
                <option value="">Choose service...</option>
                {categories.map((row) => <option key={row.id} value={row.id}>{row.name || row.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-400">Service ZIP
              <input value={zipCode} onChange={(e) => setZipCode(e.target.value)} inputMode="numeric" placeholder="36104" className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" />
            </label>
            <label className="text-xs font-bold text-slate-400">Expected time needed
              <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white">
                <option value={30}>30 minutes</option><option value={60}>1 hour</option><option value={90}>1.5 hours</option><option value={120}>2 hours</option><option value={180}>3 hours</option>
              </select>
            </label>
            <label className="text-xs font-bold text-slate-400">Priority
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white">
                {PRIORITIES.map((row) => <option key={row.value} value={row.value}>{row.label}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-xs font-bold text-slate-400">Service address
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Default to Home, or enter the service location" className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" />
            </label>
            <label className="text-xs font-bold text-slate-400">What is happening?
              <input value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Short description for the business" className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" />
            </label>
          </div>
          <button type="button" onClick={searchAvailability} disabled={loading} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 px-5 text-sm font-black text-white disabled:opacity-50 sm:w-auto">
            {loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}Check real availability
          </button>
        </section>

        {notice ? <div className={`rounded-2xl border p-4 text-sm ${created ? "border-emerald-400/20 bg-emerald-500/[.07] text-emerald-100" : "border-amber-400/20 bg-amber-500/[.07] text-amber-100"}`}>{notice}{created?.ticket_id ? <button type="button" onClick={() => nav(`/tickets/${created.ticket_id}`)} className="ml-3 font-black underline">Open ticket</button> : null}</div> : null}

        <div className="grid gap-3 lg:grid-cols-2">
          {results.map((business) => (
            <article key={business.business_id} className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5">
              <div className="flex items-start justify-between gap-3">
                <div><div className="text-xl font-black text-white">{business.name}</div><div className="mt-1 flex items-center gap-2 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{[business.city, business.state, business.base_zip].filter(Boolean).join(", ") || "Service area"}</div></div>
                <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.14em] text-emerald-200">Capacity found</div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/10 bg-white/[.025] p-3"><UsersRound className="h-4 w-4 text-cyan-200" /><div className="mt-2 text-lg font-black text-white">{business.matching_staff_count}</div><div className="text-[11px] text-slate-500">Matching schedulable staff</div></div>
                <div className="rounded-xl border border-white/10 bg-white/[.025] p-3"><Clock3 className="h-4 w-4 text-violet-200" /><div className="mt-2 text-sm font-black text-white">{formatSlot(business.earliest_start)}</div><div className="text-[11px] text-slate-500">Earliest opening</div></div>
              </div>
              <div className="mt-4 space-y-2">
                {(business.slots || []).map((slot) => {
                  const key = `${business.business_id}-${slot.start}-${slot.member_id}`;
                  return <div key={key} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-3">
                    <div><div className="text-sm font-black text-white">{formatSlot(slot.start)}</div><div className="mt-1 text-xs text-slate-500">{slot.staff_name} · {slot.title}</div></div>
                    <button type="button" disabled={bookingKey === key} onClick={() => book(business, slot)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 text-xs font-black text-cyan-100 disabled:opacity-50">{bookingKey === key ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Request this time</button>
                  </div>;
                })}
              </div>
              <div className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />{business.availability_basis}</div>
            </article>
          ))}
        </div>

        {!loading && !results.length ? <section className="rounded-[1.75rem] border border-white/10 bg-white/[.025] p-5 text-sm leading-6 text-slate-400">Businesses without configured SyncWorks workforce capacity are intentionally not shown as immediately bookable. You can still use the regular Marketplace request flow and let businesses respond manually.</section> : null}
      </div>
    </DashboardShell>
  );
}
