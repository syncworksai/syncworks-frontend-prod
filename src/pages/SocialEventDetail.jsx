import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CircleDollarSign,
  CloudSun,
  CreditCard,
  ExternalLink,
  Loader2,
  MapPin,
  Share2,
  Trophy,
  Users,
  WalletCards,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import ModeBar from "../components/ModeBar";
import { useAuth } from "../auth/AuthContext";
import {
  createEventResponse,
  getCollections,
  getEvent,
  getEventInvitations,
  getEventResponses,
  getGroups,
  getMemberships,
  updateEventResponse,
} from "../api/social";

const cx = (...values) => values.filter(Boolean).join(" ");
const list = (value) => Array.isArray(value) ? value : [];
const num = (value) => Number(value || 0);
const money = (cents) => (num(cents) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
const errorText = (error) => error?.response?.data?.detail || error?.message || "Something went wrong.";

function Card({ title, body, action, children, className = "" }) {
  return (
    <section className={cx("rounded-[1.45rem] border border-white/10 bg-[#07111f]/95 p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-black text-white">{title}</h2>
          {body ? <p className="mt-1 text-[10px] leading-4 text-slate-500">{body}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Btn({ children, onClick, primary, disabled, className = "" }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cx(
      "min-h-10 rounded-xl px-3 text-[10px] font-black transition active:scale-[.98] disabled:opacity-40",
      primary ? "bg-cyan-300 text-slate-950" : "border border-white/10 bg-white/[.035] text-slate-200",
      className,
    )}>
      {children}
    </button>
  );
}

function Pill({ children, tone = "slate" }) {
  const tones = {
    slate: "border-white/10 bg-white/[.04] text-slate-300",
    cyan: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
    green: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
    amber: "border-amber-300/20 bg-amber-300/10 text-amber-100",
    rose: "border-rose-300/20 bg-rose-300/10 text-rose-100",
    violet: "border-violet-300/20 bg-violet-300/10 text-violet-100",
  };
  return <span className={cx("inline-flex rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-wide", tones[tone])}>{children}</span>;
}

export default function SocialEventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = Number(user?.id || 0);

  const [event, setEvent] = useState(null);
  const [groups, setGroups] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [responses, setResponses] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [eventRow, groupRows, membershipRows, responseRows, inviteRows, collectionRows] = await Promise.all([
        getEvent(eventId),
        getGroups(),
        getMemberships(),
        getEventResponses(),
        getEventInvitations(),
        getCollections(),
      ]);
      setEvent(eventRow);
      setGroups(list(groupRows));
      setMemberships(list(membershipRows));
      setResponses(list(responseRows));
      setInvitations(list(inviteRows));
      setCollections(list(collectionRows));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, [eventId]);

  const activeMemberships = useMemo(
    () => memberships.filter((row) => Number(row.user) === userId && row.status === "ACTIVE"),
    [memberships, userId],
  );
  const activeGroupIds = useMemo(() => new Set(activeMemberships.map((row) => Number(row.group))), [activeMemberships]);

  const acceptedGroupIds = useMemo(() => {
    const ids = new Set();
    if (event?.organizer_group) ids.add(Number(event.organizer_group));
    invitations
      .filter((row) => Number(row.event) === Number(eventId) && row.status === "ACCEPTED")
      .forEach((row) => ids.add(Number(row.target_group)));
    return ids;
  }, [event, invitations, eventId]);

  const participation = activeMemberships.find((row) => acceptedGroupIds.has(Number(row.group))) || null;
  const groupId = Number(participation?.group || 0);
  const group = groups.find((row) => Number(row.id) === groupId) || groups.find((row) => Number(row.id) === Number(event?.organizer_group)) || null;
  const myResponse = responses.find((row) => Number(row.event) === Number(eventId) && Number(row.user) === userId && (!groupId || Number(row.group) === groupId)) || null;
  const eventCollections = collections.filter((row) => Number(row.event) === Number(eventId));
  const myShares = eventCollections.flatMap((collection) =>
    list(collection.shares)
      .filter((share) => Number(share.user) === userId)
      .map((share) => ({ ...share, collection })),
  );
  const myDue = myShares.reduce((sum, row) => sum + Math.max(0, num(row.amount_due_cents) - num(row.amount_paid_cents)), 0);
  const flyer = event?.flyer_image_url || event?.flyer_url || "";
  const isTeam = ["TEAM", "CLUB"].includes(String(group?.kind || "").toUpperCase());

  async function respond(value) {
    if (!event || !groupId) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (myResponse?.id) await updateEventResponse(myResponse.id, value);
      else await createEventResponse({ event: Number(event.id), group: groupId, response: value });
      setNotice(value === "YES" ? "You’re attending." : value === "MAYBE" ? "You’re marked maybe." : "You’re marked unavailable.");
      await refresh();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  function directionsUrl() {
    const destination = [event?.venue_name, event?.address_line1, event?.address_line2, event?.city, event?.state, event?.postal_code].filter(Boolean).join(", ");
    return "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(destination);
  }

  async function shareEvent() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: event?.title || "SyncWorks event", text: event?.description || "Event details in SyncWorks", url });
        return;
      } catch {}
    }
    await navigator.clipboard?.writeText(url);
    setNotice("Event link copied.");
  }

  function openCalendar() {
    const date = event?.start_at ? String(event.start_at).slice(0, 10) : "";
    navigate(date ? "/calendar?date=" + date : "/calendar");
  }

  if (loading) {
    return <div className="min-h-screen bg-[#02060c] text-white"><ModeBar title="Event" subtitle="SyncWorks Social" /><div className="grid min-h-[70vh] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-cyan-300" /></div></div>;
  }

  if (!event) {
    return <div className="min-h-screen bg-[#02060c] p-3 text-white"><ModeBar title="Event" subtitle="SyncWorks Social" /><Card title="Event unavailable"><p className="text-xs text-slate-500">{error || "This event could not be loaded."}</p><Btn className="mt-3" onClick={() => navigate("/connect")}><ArrowLeft className="mr-1 inline h-4 w-4" />Back to Social</Btn></Card></div>;
  }

  const start = new Date(event.start_at);
  const dateLabel = start.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const timeLabel = start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-[#02060c] pb-28 text-slate-100">
      <ModeBar title="Event" subtitle="SyncWorks Social" />
      <main className="mx-auto max-w-5xl space-y-3 px-3 py-3 sm:px-5">
        <div className="flex items-center justify-between gap-2">
          <Btn onClick={() => navigate("/connect")}><ArrowLeft className="mr-1 inline h-4 w-4" />Social</Btn>
          <Btn onClick={shareEvent}><Share2 className="mr-1 inline h-4 w-4" />Share</Btn>
        </div>

        {error ? <div className="rounded-xl border border-rose-300/20 bg-rose-300/10 p-2.5 text-[10px] text-rose-100">{error}</div> : null}
        {notice ? <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-2.5 text-[10px] text-cyan-100">{notice}</div> : null}

        <section className="overflow-hidden rounded-[1.8rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_80%_0%,rgba(34,211,238,.16),transparent_34%),radial-gradient(circle_at_0%_100%,rgba(139,92,246,.14),transparent_36%),#07111f]">
          {flyer ? <img src={flyer} alt={event.title + " flyer"} className="max-h-[28rem] w-full border-b border-white/10 object-cover" /> : null}
          <div className="p-4 sm:p-5">
            <div className="flex flex-wrap gap-1.5">
              <Pill tone="cyan">{group?.kind || "EVENT"}</Pill>
              <Pill tone={event.status === "CANCELLED" ? "rose" : "green"}>{event.status}</Pill>
              {event.weather_dependent ? <Pill tone="amber">Weather permitting</Pill> : null}
              {event.recurrence_rule ? <Pill tone="violet">Recurring</Pill> : null}
            </div>
            <h1 className="mt-3 text-2xl font-black text-white sm:text-3xl">{event.title}</h1>
            {group ? <button type="button" onClick={() => isTeam ? navigate("/connect/groups/" + group.id + "/sports") : navigate("/connect")} className="mt-2 text-left text-xs font-black text-cyan-200">{group.name}</button> : null}
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/15 p-3"><div className="text-[8px] font-black uppercase tracking-[.13em] text-cyan-300">When</div><div className="mt-1 text-sm font-black text-white">{dateLabel}</div><div className="text-xs text-slate-400">{timeLabel}</div></div>
              <div className="rounded-xl border border-white/10 bg-black/15 p-3"><div className="text-[8px] font-black uppercase tracking-[.13em] text-emerald-300">Where</div><div className="mt-1 text-sm font-black text-white">{event.venue_name || "Location TBD"}</div><div className="text-xs text-slate-400">{[event.address_line1, event.city, event.state].filter(Boolean).join(", ") || "Address not posted"}</div></div>
            </div>
          </div>
        </section>

        <div className="grid gap-3 lg:grid-cols-[1.15fr_.85fr]">
          <div className="space-y-3">
            {groupId ? <Card title="Your commitment" body="Your RSVP also controls whether this event stays active on your SyncWorks calendar." action={<Users className="h-4 w-4 text-cyan-300" />}>
              <div className="grid grid-cols-3 gap-1.5">
                {[["YES","IN"],["MAYBE","MAYBE"],["NO","OUT"]].map(([value,label]) => (
                  <button key={value} type="button" disabled={busy} onClick={() => respond(value)} className={cx(
                    "min-h-11 rounded-xl border text-[10px] font-black",
                    myResponse?.response === value
                      ? value === "YES" ? "border-emerald-300/40 bg-emerald-300/20 text-emerald-100"
                        : value === "MAYBE" ? "border-amber-300/40 bg-amber-300/20 text-amber-100"
                        : "border-rose-300/40 bg-rose-300/20 text-rose-100"
                      : "border-white/10 text-slate-400",
                  )}>{myResponse?.response === value ? <Check className="mr-1 inline h-3.5 w-3.5" /> : null}{label}</button>
                ))}
              </div>
            </Card> : null}

            <Card title="Event details" body="Everything the organizer posted for this event.">
              <div className="space-y-3 text-xs leading-5 text-slate-300">
                {event.description ? <p>{event.description}</p> : <p className="text-slate-500">No additional description.</p>}
                {event.weather_note ? <div className="rounded-xl border border-amber-300/15 bg-amber-300/[.05] p-3 text-amber-100"><CloudSun className="mr-1 inline h-4 w-4" /><b>Weather:</b> {event.weather_note}</div> : null}
                {event.prizes ? <div><b className="text-white">Prizes / benefits</b><p className="mt-1 text-slate-400">{event.prizes}</p></div> : null}
                {event.rules ? <div><b className="text-white">Rules / notes</b><p className="mt-1 text-slate-400">{event.rules}</p></div> : null}
              </div>
            </Card>

            {eventCollections.length ? <Card title="Event costs & collections" body="Your own amount due is shown privately here." action={<CircleDollarSign className="h-4 w-4 text-amber-300" />}>
              <div className="mb-3 rounded-xl border border-amber-300/15 bg-amber-300/[.05] p-3">
                <div className="text-[8px] font-black uppercase tracking-wide text-amber-300">My event balance</div>
                <div className="mt-1 text-2xl font-black text-white">{money(myDue)}</div>
              </div>
              <div className="space-y-2">
                {myShares.map((row) => {
                  const remaining = Math.max(0, num(row.amount_due_cents) - num(row.amount_paid_cents));
                  const opts = row.collection?.payment_options || {};
                  return <section key={row.id} className="rounded-xl border border-white/10 bg-white/[.025] p-3">
                    <div className="flex justify-between gap-2"><div><b className="text-xs text-white">{row.collection?.title}</b><div className="text-[9px] text-slate-500">{money(row.amount_paid_cents)} paid</div></div><Pill tone={remaining ? "amber" : "green"}>{row.status}</Pill></div>
                    <div className="mt-2 text-lg font-black text-white">{money(remaining)}</div>
                    {remaining ? <div className="mt-2 grid grid-cols-2 gap-1.5">
                      {opts.stripe_payment_link ? <a href={opts.stripe_payment_link} target="_blank" rel="noreferrer" className="flex min-h-9 items-center justify-center gap-1 rounded-lg border border-cyan-300/20 bg-cyan-300/[.05] text-[8px] font-black text-cyan-100"><CreditCard className="h-3.5 w-3.5" />Stripe</a> : null}
                      {opts.cash_app_url ? <a href={opts.cash_app_url} target="_blank" rel="noreferrer" className="flex min-h-9 items-center justify-center gap-1 rounded-lg border border-white/10 text-[8px] font-black"><WalletCards className="h-3.5 w-3.5" />Cash App</a> : null}
                      {opts.venmo_url ? <a href={opts.venmo_url} target="_blank" rel="noreferrer" className="flex min-h-9 items-center justify-center gap-1 rounded-lg border border-white/10 text-[8px] font-black"><WalletCards className="h-3.5 w-3.5" />Venmo</a> : null}
                      {opts.zelle_instructions ? <div className="col-span-2 rounded-lg border border-white/10 p-2 text-[8px] text-slate-400"><b className="text-white">Zelle:</b> {opts.zelle_instructions}</div> : null}
                    </div> : null}
                  </section>;
                })}
                {!myShares.length ? <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-500">No personal collection balance is assigned to you for this event.</div> : null}
              </div>
            </Card> : event.entry_amount_cents ? <Card title="Event cost" body="Organizer-posted event cost."><div className="text-2xl font-black text-white">{money(event.entry_amount_cents)}</div></Card> : null}
          </div>

          <div className="space-y-3">
            <Card title="Event actions" body="Calendar and travel tools stay connected to the event.">
              <div className="grid gap-2">
                <Btn primary onClick={openCalendar}><CalendarDays className="mr-1 inline h-4 w-4" />Open in SyncWorks Calendar</Btn>
                {(event.venue_name || event.address_line1) ? <a href={directionsUrl()} target="_blank" rel="noreferrer" className="flex min-h-10 items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/[.035] px-3 text-[10px] font-black text-slate-200"><MapPin className="h-4 w-4" />Route / directions <ExternalLink className="h-3 w-3" /></a> : null}
                <Btn onClick={shareEvent}><Share2 className="mr-1 inline h-4 w-4" />Share event</Btn>
                {isTeam && group ? <Btn onClick={() => navigate("/connect/groups/" + group.id + "/sports")}><Trophy className="mr-1 inline h-4 w-4" />Open team dashboard</Btn> : null}
              </div>
            </Card>

            <Card title="Organizer" body="Events belong to Social groups, so this works for teams, clubs, book clubs, churches, families and communities.">
              <div className="rounded-xl border border-white/10 bg-black/15 p-3">
                <div className="text-sm font-black text-white">{group?.name || "Personal event"}</div>
                <div className="mt-1 text-[9px] uppercase tracking-wide text-slate-500">{group?.kind || "PERSONAL"}</div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
