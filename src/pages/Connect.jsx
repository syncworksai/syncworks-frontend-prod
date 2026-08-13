import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeDollarSign,
  BookOpen,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Link2,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import ModeBar from "../components/ModeBar";
import { useAuth } from "../auth/AuthContext";
import {
  acceptConnection,
  acceptEventInvitation,
  createCollection,
  createEvent,
  createGroup,
  declineConnection,
  declineEventInvitation,
  getCollectionShares,
  getCollections,
  getConnections,
  getEventInvitations,
  getEventResponses,
  getEvents,
  getGroups,
  getMemberships,
  searchPeople,
  sendConnection,
} from "../api/social";

const tabs = ["Home", "People", "Groups", "Events", "Collect"];
const useCases = [
  { icon: Trophy, title: "Teams & leagues", body: "Invites, attendance, entry fees, schedules and location changes." },
  { icon: BookOpen, title: "Clubs & communities", body: "Book clubs, church groups, school groups, HOAs and recurring dues." },
  { icon: Users, title: "Friends & trips", body: "Connect with people, plan gatherings and split shared costs." },
];

function cx(...parts) { return parts.filter(Boolean).join(" "); }
function list(value) { return Array.isArray(value) ? value : []; }
function money(cents) { return (Number(cents || 0) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" }); }
function initials(person) {
  const a = String(person?.first_name || "").trim().charAt(0);
  const b = String(person?.last_name || "").trim().charAt(0);
  return (a + b || String(person?.email || "?").charAt(0)).toUpperCase();
}
function displayName(person) { return person?.display_name || [person?.first_name, person?.last_name].filter(Boolean).join(" ") || person?.email || "SyncWorks user"; }
function errMessage(error) { return error?.response?.data?.detail || error?.response?.data?.non_field_errors?.[0] || error?.response?.data?.[0] || error?.message || "Something went wrong."; }

function Pill({ children, tone = "slate" }) {
  const tones = {
    cyan: "border-cyan-400/25 bg-cyan-400/10 text-cyan-100",
    emerald: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
    amber: "border-amber-400/25 bg-amber-400/10 text-amber-100",
    violet: "border-violet-400/25 bg-violet-400/10 text-violet-100",
    rose: "border-rose-400/25 bg-rose-400/10 text-rose-100",
    slate: "border-white/10 bg-white/[0.04] text-slate-300",
  };
  return <span className={cx("inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]", tones[tone] || tones.slate)}>{children}</span>;
}

function Button({ children, onClick, primary = false, danger = false, className = "", disabled = false }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={cx("min-h-11 rounded-2xl px-4 text-sm font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50", primary && "bg-cyan-300 text-slate-950 hover:bg-cyan-200", danger && "border border-rose-400/20 bg-rose-400/[0.06] text-rose-100", !primary && !danger && "border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.07]", className)}>{children}</button>;
}

function Panel({ title, body, children, right }) {
  return <section className="rounded-[1.75rem] border border-white/10 bg-[#07111f]/85 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.24)] sm:p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-black text-white sm:text-lg">{title}</h2>{body ? <p className="mt-1 text-sm leading-6 text-slate-400">{body}</p> : null}</div>{right}</div><div className="mt-4">{children}</div></section>;
}
function Stat({ value, label }) { return <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-xl font-black text-white">{value}</div><div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</div></div>; }
function Field({ label, value, onChange, placeholder = "", type = "text" }) { return <label className="block"><span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} type={type} placeholder={placeholder} className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/35" /></label>; }

function Drawer({ open, title, onClose, children }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-[100] flex items-end bg-black/70 backdrop-blur-sm sm:items-center sm:justify-center" onMouseDown={onClose}><section onMouseDown={(e) => e.stopPropagation()} className="max-h-[88dvh] w-full overflow-y-auto rounded-t-[2rem] border border-white/10 bg-[#06101d] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl sm:max-w-xl sm:rounded-[2rem] sm:p-5"><div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/15 sm:hidden"/><div className="sticky top-0 z-10 -mx-1 flex items-start justify-between gap-4 bg-[#06101d]/95 px-1 pb-3 backdrop-blur"><div><Pill tone="cyan">SyncWorks Social</Pill><h2 className="mt-2 text-xl font-black text-white">{title}</h2></div><button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.04]"><X className="h-5 w-5"/></button></div>{children}</section></div>;
}

export default function Connect() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("Home");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [drawer, setDrawer] = useState(null);
  const [people, setPeople] = useState([]);
  const [connections, setConnections] = useState([]);
  const [groups, setGroups] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [events, setEvents] = useState([]);
  const [eventInvites, setEventInvites] = useState([]);
  const [responses, setResponses] = useState([]);
  const [collections, setCollections] = useState([]);
  const [shares, setShares] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [groupForm, setGroupForm] = useState({ name: "", kind: "COMMUNITY", visibility: "PRIVATE", city: "", state: "" });
  const [eventForm, setEventForm] = useState({ title: "", organizer_group: "", startDate: "", startTime: "09:00", venue_name: "", address_line1: "", city: "", state: "", entryAmount: "" });
  const [collectionForm, setCollectionForm] = useState({ title: "", group: "", event: "", total: "", split_method: "EQUAL" });

  const userId = Number(user?.id || 0);
  const pendingIncoming = useMemo(() => connections.filter((c) => c.status === "PENDING" && Number(c.recipient) === userId), [connections, userId]);
  const pendingOutgoingIds = useMemo(() => new Set(connections.filter((c) => c.status === "PENDING" && Number(c.sender) === userId).map((c) => Number(c.recipient))), [connections, userId]);
  const friendIds = useMemo(() => new Set(connections.filter((c) => c.status === "ACCEPTED").map((c) => Number(c.sender) === userId ? Number(c.recipient) : Number(c.sender))), [connections, userId]);
  const managedGroupIds = useMemo(() => new Set(memberships.filter((m) => m.status === "ACTIVE" && ["OWNER", "DIRECTOR", "MANAGER"].includes(m.role) && Number(m.user) === userId).map((m) => Number(m.group))), [memberships, userId]);
  const myShares = useMemo(() => shares.filter((s) => Number(s.user) === userId), [shares, userId]);

  async function loadAll() {
    setLoading(true); setError("");
    const results = await Promise.allSettled([getConnections(), getGroups(), getMemberships(), getEvents(), getEventInvitations(), getEventResponses(), getCollections(), getCollectionShares()]);
    const setters = [setConnections, setGroups, setMemberships, setEvents, setEventInvites, setResponses, setCollections, setShares];
    results.forEach((result, i) => { if (result.status === "fulfilled") setters[i](list(result.value)); });
    const rejected = results.find((r) => r.status === "rejected");
    if (rejected) setError(`Some Social data could not load: ${errMessage(rejected.reason)}`);
    setLoading(false);
  }
  useEffect(() => { loadAll(); }, []);

  async function run(action, success, close = true) {
    setBusy(true); setError(""); setNotice("");
    try { await action(); setNotice(success); if (close) setDrawer(null); await loadAll(); }
    catch (e) { setError(errMessage(e)); }
    finally { setBusy(false); }
  }
  async function doSearch() {
    if (searchText.trim().length < 2) { setPeople([]); setNotice("Enter at least 2 characters to search people."); return; }
    setBusy(true); setError("");
    try { setPeople(await searchPeople(searchText.trim())); }
    catch (e) { setError(errMessage(e)); }
    finally { setBusy(false); }
  }
  function connectionFor(personId) { return connections.find((c) => (Number(c.sender) === userId && Number(c.recipient) === Number(personId)) || (Number(c.recipient) === userId && Number(c.sender) === Number(personId))); }
  function eventById(id) { return events.find((e) => Number(e.id) === Number(id)); }
  function groupById(id) { return groups.find((g) => Number(g.id) === Number(id)); }
  const tabIcon = { Home: Sparkles, People: UserPlus, Groups: Users, Events: CalendarDays, Collect: BadgeDollarSign };

  return <div className="min-h-screen bg-[#02060c] pb-[calc(7.5rem+env(safe-area-inset-bottom))] text-slate-100">
    <ModeBar title="SyncWorks Social" subtitle="People • Groups • Events • Collections" />
    <main className="mx-auto max-w-7xl px-3 py-4 sm:px-5 sm:py-6">
      <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">{tabs.map((tab) => { const Icon = tabIcon[tab]; return <button key={tab} onClick={() => { setActiveTab(tab); setNotice(""); setError(""); }} className={cx("flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-black", activeTab === tab ? "bg-white text-slate-950" : "border border-white/10 bg-white/[0.03] text-slate-400")}><Icon className="h-4 w-4"/>{tab}</button>; })}<button type="button" onClick={loadAll} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.03]"><RefreshCw className={cx("h-4 w-4", loading && "animate-spin")}/></button></div>
      {error ? <div className="mb-4 rounded-2xl border border-rose-400/20 bg-rose-400/[0.08] p-3 text-sm text-rose-100">{error}</div> : null}
      {notice ? <div className="mb-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.08] p-3 text-sm text-cyan-100">{notice}</div> : null}
      {loading ? <div className="grid min-h-64 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-cyan-200"/></div> : null}

      {!loading && activeTab === "Home" ? <div className="space-y-4">
        <section className="overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_85%_10%,rgba(34,211,238,.18),transparent_30%),radial-gradient(circle_at_10%_90%,rgba(139,92,246,.14),transparent_32%),linear-gradient(145deg,#07111f,#02060c)] p-5 sm:p-7"><div className="flex items-start justify-between gap-4"><div className="max-w-3xl"><div className="flex flex-wrap gap-2"><Pill tone="cyan">Live Social</Pill><Pill>People → Groups → Events → Collections</Pill></div><h1 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-4xl">Connect people. Organize life. Keep everyone in sync.</h1><p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">Your Social records now come from the SyncWorks backend. Friends, groups, invitations, RSVPs and collections persist across devices and refreshes.</p></div><div className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10"><Sparkles className="h-6 w-6 text-cyan-200"/></div></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat value={friendIds.size} label="Connections"/><Stat value={groups.length} label="Groups"/><Stat value={events.length} label="Events"/><Stat value={myShares.length} label="My shares"/></div><div className="mt-5 flex flex-wrap gap-2"><Button primary onClick={() => setActiveTab("People")}><UserPlus className="mr-2 inline h-4 w-4"/>Find people</Button><Button onClick={() => { setActiveTab("Groups"); setDrawer({ type: "createGroup" }); }}><Plus className="mr-2 inline h-4 w-4"/>Create group</Button><Button onClick={() => { setActiveTab("Events"); setDrawer({ type: "createEvent" }); }}><CalendarDays className="mr-2 inline h-4 w-4"/>Plan event</Button></div></section>
        <Panel title="What can you use it for?" body="The same Social engine works for any real-world group that needs people, schedules and shared costs."><div className="grid gap-3 md:grid-cols-3">{useCases.map(({ icon: Icon, title, body }) => <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-cyan-400/10"><Icon className="h-5 w-5 text-cyan-200"/></div><div className="mt-3 font-black text-white">{title}</div><div className="mt-1 text-xs leading-5 text-slate-400">{body}</div></div>)}</div></Panel>
        <div className="grid gap-4 lg:grid-cols-2"><Panel title="Needs a response" body="Actions arrive at the right level instead of disappearing in chat." right={<Pill tone="amber">{pendingIncoming.length + eventInvites.filter((i) => i.status === "PENDING").length} actions</Pill>}><div className="space-y-2">{pendingIncoming.slice(0,3).map((c) => <button key={c.id} onClick={() => setDrawer({ type: "friendRequest", connection: c })} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left"><div><div className="font-black text-white">{displayName(c.sender_detail)}</div><div className="text-xs text-slate-500">Friend request</div></div><ChevronRight className="h-4 w-4"/></button>)}{eventInvites.filter((i) => i.status === "PENDING").slice(0,3).map((i) => <button key={i.id} onClick={() => setDrawer({ type: "eventInvite", invite: i })} className="flex w-full items-center justify-between rounded-2xl border border-amber-400/15 bg-amber-400/[0.05] p-3 text-left"><div><div className="font-black text-white">{eventById(i.event)?.title || `Event #${i.event}`}</div><div className="text-xs text-slate-500">Manager decision</div></div><ChevronRight className="h-4 w-4"/></button>)}{!pendingIncoming.length && !eventInvites.some((i) => i.status === "PENDING") ? <div className="text-sm text-slate-500">Nothing waiting on you.</div> : null}</div></Panel><Panel title="Calendar connected" body="Accepted Social events can feed the existing SyncWorks Calendar layer." right={<CalendarDays className="h-5 w-5 text-cyan-200"/>}><Button className="w-full" onClick={() => nav("/calendar")}><MapPin className="mr-2 inline h-4 w-4"/>Open SyncWorks Calendar</Button></Panel></div>
      </div> : null}

      {!loading && activeTab === "People" ? <div className="space-y-4"><Panel title="Find your people" body="Search registered SyncWorks users and send a real connection request." right={pendingIncoming.length ? <Button onClick={() => setDrawer({ type: "requests" })}>{pendingIncoming.length} requests</Button> : null}><div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-500"/><input value={searchText} onChange={(e) => setSearchText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()} className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none" placeholder="Search by name or email"/></div><Button primary disabled={busy} onClick={doSearch}>Search</Button></div></Panel><div className="grid gap-3 lg:grid-cols-2">{people.map((person) => { const connection = connectionFor(person.id); const accepted = friendIds.has(Number(person.id)); const outgoing = pendingOutgoingIds.has(Number(person.id)); return <div key={person.id} className="rounded-[1.5rem] border border-white/10 bg-[#07111f]/85 p-4"><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-cyan-300 to-blue-600 font-black text-slate-950">{initials(person)}</div><div className="min-w-0 flex-1"><div className="font-black text-white">{displayName(person)}</div><div className="truncate text-xs text-slate-500">{person.email}</div></div></div><div className="mt-4 flex gap-2">{accepted ? <Button disabled>Connected</Button> : outgoing ? <Button disabled>Request sent</Button> : connection?.status === "PENDING" && Number(connection.recipient) === userId ? <Button primary onClick={() => setDrawer({ type: "friendRequest", connection })}>Review request</Button> : <Button primary disabled={busy} onClick={() => run(() => sendConnection(person.id), `Connection request sent to ${displayName(person)}.`)}><UserPlus className="mr-2 inline h-4 w-4"/>Add friend</Button>}<Button onClick={() => setDrawer({ type: "profile", person })}>Profile</Button></div></div>; })}</div>{searchText && !people.length ? <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">No matching users found.</div> : null}</div> : null}

      {!loading && activeTab === "Groups" ? <div className="space-y-4"><Panel title="Groups that fit real life" body="Create a standalone group or a hierarchy such as organization → division → team → member." right={<Button primary onClick={() => setDrawer({ type: "createGroup" })}><Plus className="mr-2 inline h-4 w-4"/>Create</Button>}><div className="grid gap-3 md:grid-cols-3">{groups.map((group) => <button key={group.id} onClick={() => setDrawer({ type: "group", group })} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left"><div className="flex items-start justify-between gap-2"><div className="font-black text-white">{group.name}</div><Pill tone="violet">{group.kind}</Pill></div><div className="mt-2 text-xs text-slate-400">{group.member_count || 0} members</div><div className="mt-1 text-xs text-slate-500">{[group.city, group.state].filter(Boolean).join(", ") || group.visibility}</div><div className="mt-4 flex items-center justify-between text-xs font-black text-slate-200">Open group <ChevronRight className="h-4 w-4"/></div></button>)}</div>{!groups.length ? <div className="text-sm text-slate-500">No groups yet. Create the first one.</div> : null}</Panel></div> : null}

      {!loading && activeTab === "Events" ? <div className="space-y-4"><Panel title="Events are live source records" body="Organizers own the date, time, venue, address and entry amount. Accepted groups can then collect availability from members." right={<Button primary onClick={() => setDrawer({ type: "createEvent" })}><Plus className="mr-2 inline h-4 w-4"/>Create event</Button>}><div className="space-y-3">{events.map((event) => <button key={event.id} onClick={() => setDrawer({ type: "event", event })} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left"><div className="flex items-start justify-between gap-3"><div><div className="font-black text-white">{event.title}</div><div className="mt-1 text-xs text-slate-400">{new Date(event.start_at).toLocaleString()} · {event.venue_name || [event.city,event.state].filter(Boolean).join(", ") || "Location TBD"}</div><div className="mt-1 text-xs text-slate-500">{money(event.entry_amount_cents)} entry · version {event.version}</div></div><Pill tone={event.status === "PUBLISHED" ? "emerald" : "slate"}>{event.status}</Pill></div></button>)}</div>{!events.length ? <div className="text-sm text-slate-500">No events visible yet.</div> : null}</Panel></div> : null}

      {!loading && activeTab === "Collect" ? <div className="space-y-4"><Panel title="Collections without chasing people" body="Every collection stays attached to its group, event and member shares." right={<Button primary onClick={() => setDrawer({ type: "createCollection" })}><Plus className="mr-2 inline h-4 w-4"/>Create</Button>}><div className="space-y-3">{collections.map((collection) => <button key={collection.id} onClick={() => setDrawer({ type: "collection", collection })} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left"><div className="flex items-start justify-between gap-3"><div><div className="font-black text-white">{collection.title}</div><div className="mt-1 text-xs text-slate-500">{groupById(collection.group)?.name || `Group #${collection.group}`} · {collection.split_method}</div></div><Pill tone={collection.status === "FUNDED" ? "emerald" : "amber"}>{collection.status}</Pill></div><div className="mt-3 grid grid-cols-3 gap-2"><Stat value={money(collection.total_amount_cents)} label="Total"/><Stat value={money(collection.collected_amount_cents)} label="Collected"/><Stat value={`${collection.shares?.length || 0}`} label="Shares"/></div></button>)}</div>{!collections.length ? <div className="text-sm text-slate-500">No collections yet.</div> : null}</Panel><Panel title="Payment rails" body="Stripe, Venmo and Cash App remain visible as planned payment choices, but live charging is still intentionally disabled until the payment build."><div className="grid gap-3 sm:grid-cols-3">{[[CreditCard,"Stripe","Card / wallet"],[WalletCards,"Venmo","Merchant checkout"],[CircleDollarSign,"Cash App","Cash App Pay"]].map(([Icon,name,detail]) => <div key={name} className="rounded-2xl border border-white/10 bg-black/20 p-4"><Icon className="h-5 w-5 text-cyan-200"/><div className="mt-2 font-black text-white">{name}</div><div className="text-xs text-slate-500">{detail}</div></div>)}</div></Panel></div> : null}

      <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4 text-xs leading-5 text-emerald-100/80"><ShieldCheck className="mr-2 inline h-4 w-4"/>Social persistence is active in this build. Messaging, real payment execution and automatic external-calendar propagation remain separate upcoming builds.</div>
      <button type="button" onClick={() => setDrawer({ type: "access" })} className="mt-3 flex min-h-12 w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm font-black text-slate-300"><span><Link2 className="mr-2 inline h-4 w-4"/>Connect by access code</span><ChevronRight className="h-4 w-4"/></button>
    </main>

    <Drawer open={drawer?.type === "profile"} title={drawer?.person ? displayName(drawer.person) : "Profile"} onClose={() => setDrawer(null)}><div className="space-y-4"><div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="font-black text-white">{displayName(drawer?.person)}</div><div className="mt-1 text-xs text-slate-500">{drawer?.person?.email}</div></div><p className="text-sm leading-6 text-slate-400">Profile privacy and mutual-group visibility will expand in the messaging/moderation build.</p></div></Drawer>
    <Drawer open={drawer?.type === "requests"} title="Friend requests" onClose={() => setDrawer(null)}><div className="space-y-3">{pendingIncoming.map((c) => <div key={c.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="font-black text-white">{displayName(c.sender_detail)}</div><div className="mt-3 grid grid-cols-2 gap-2"><Button primary disabled={busy} onClick={() => run(() => acceptConnection(c.id), "Friend request accepted.")}>Accept</Button><Button danger disabled={busy} onClick={() => run(() => declineConnection(c.id), "Friend request declined.")}>Decline</Button></div></div>)}</div></Drawer>
    <Drawer open={drawer?.type === "friendRequest"} title="Friend request" onClose={() => setDrawer(null)}>{drawer?.connection ? <div className="space-y-4"><div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="font-black text-white">{displayName(drawer.connection.sender_detail)}</div></div><div className="grid grid-cols-2 gap-2"><Button primary disabled={busy} onClick={() => run(() => acceptConnection(drawer.connection.id), "Friend request accepted.")}>Accept</Button><Button danger disabled={busy} onClick={() => run(() => declineConnection(drawer.connection.id), "Friend request declined.")}>Decline</Button></div></div> : null}</Drawer>
    <Drawer open={drawer?.type === "createGroup"} title="Create group" onClose={() => setDrawer(null)}><div className="space-y-3"><Field label="Group name" value={groupForm.name} onChange={(v) => setGroupForm((f) => ({...f,name:v}))} placeholder="Tuesday Night Book Club"/><label className="block"><span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Type</span><select value={groupForm.kind} onChange={(e) => setGroupForm((f) => ({...f,kind:e.target.value}))} className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white"><option value="ORGANIZATION">Organization</option><option value="DIVISION">Division / chapter</option><option value="TEAM">Team</option><option value="CLUB">Club</option><option value="COMMUNITY">Community</option><option value="HOUSEHOLD">Household</option><option value="OTHER">Other</option></select></label><div className="grid grid-cols-2 gap-3"><Field label="City" value={groupForm.city} onChange={(v) => setGroupForm((f) => ({...f,city:v}))}/><Field label="State" value={groupForm.state} onChange={(v) => setGroupForm((f) => ({...f,state:v}))}/></div><Button primary className="w-full" disabled={busy || !groupForm.name.trim()} onClick={() => run(() => createGroup(groupForm), "Group created and saved.")}>Create group</Button></div></Drawer>
    <Drawer open={drawer?.type === "group"} title={drawer?.group?.name || "Group"} onClose={() => setDrawer(null)}>{drawer?.group ? <div className="space-y-4"><div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-center justify-between"><Pill tone="violet">{drawer.group.kind}</Pill><Pill tone={managedGroupIds.has(Number(drawer.group.id)) ? "emerald" : "slate"}>{managedGroupIds.has(Number(drawer.group.id)) ? "You manage" : drawer.group.visibility}</Pill></div><p className="mt-3 text-sm text-slate-400">{drawer.group.description || "No description yet."}</p></div><Button className="w-full" onClick={() => nav("/calendar")}><CalendarDays className="mr-2 inline h-4 w-4"/>Open calendar</Button><p className="text-xs leading-5 text-slate-500">Member invites and group announcements will be expanded in the next communication build.</p></div> : null}</Drawer>
    <Drawer open={drawer?.type === "createEvent"} title="Create event" onClose={() => setDrawer(null)}><div className="space-y-3"><Field label="Event name" value={eventForm.title} onChange={(v) => setEventForm((f) => ({...f,title:v}))}/><label className="block"><span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Organizer group</span><select value={eventForm.organizer_group} onChange={(e) => setEventForm((f) => ({...f,organizer_group:e.target.value}))} className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white"><option value="">Personal event</option>{groups.filter((g) => managedGroupIds.has(Number(g.id))).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><Field label="Date" type="date" value={eventForm.startDate} onChange={(v) => setEventForm((f) => ({...f,startDate:v}))}/><Field label="Start" type="time" value={eventForm.startTime} onChange={(v) => setEventForm((f) => ({...f,startTime:v}))}/></div><Field label="Venue" value={eventForm.venue_name} onChange={(v) => setEventForm((f) => ({...f,venue_name:v}))}/><Field label="Address" value={eventForm.address_line1} onChange={(v) => setEventForm((f) => ({...f,address_line1:v}))}/><div className="grid grid-cols-2 gap-3"><Field label="City" value={eventForm.city} onChange={(v) => setEventForm((f) => ({...f,city:v}))}/><Field label="State" value={eventForm.state} onChange={(v) => setEventForm((f) => ({...f,state:v}))}/></div><Field label="Entry / cost" value={eventForm.entryAmount} onChange={(v) => setEventForm((f) => ({...f,entryAmount:v}))} placeholder="400.00"/><Button primary className="w-full" disabled={busy || !eventForm.title.trim() || !eventForm.startDate} onClick={() => { const start_at = new Date(`${eventForm.startDate}T${eventForm.startTime || "09:00"}:00`).toISOString(); const payload = { title:eventForm.title, start_at, venue_name:eventForm.venue_name, address_line1:eventForm.address_line1, city:eventForm.city, state:eventForm.state, entry_amount_cents:Math.round(Number(eventForm.entryAmount || 0)*100), status:"PUBLISHED" }; if (eventForm.organizer_group) payload.organizer_group = Number(eventForm.organizer_group); return run(() => createEvent(payload), "Event created and saved."); }}>Create event</Button></div></Drawer>
    <Drawer open={drawer?.type === "event"} title={drawer?.event?.title || "Event"} onClose={() => setDrawer(null)}>{drawer?.event ? <div className="space-y-4"><div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.05] p-4"><div className="text-sm text-slate-300">{new Date(drawer.event.start_at).toLocaleString()}</div><div className="mt-1 text-xs text-slate-500">{drawer.event.venue_name || "Venue TBD"} · {money(drawer.event.entry_amount_cents)}</div></div><Button className="w-full" onClick={() => nav("/calendar")}>Open SyncWorks Calendar</Button><p className="text-xs leading-5 text-slate-500">If this event was sent to your group, use the pending manager invitation on Home to accept or decline it.</p></div> : null}</Drawer>
    <Drawer open={drawer?.type === "eventInvite"} title="Event invitation" onClose={() => setDrawer(null)}>{drawer?.invite ? <div className="space-y-4"><div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.05] p-4"><div className="font-black text-white">{eventById(drawer.invite.event)?.title || `Event #${drawer.invite.event}`}</div><div className="mt-1 text-xs text-slate-500">For {groupById(drawer.invite.target_group)?.name || `Group #${drawer.invite.target_group}`}</div></div><div className="grid grid-cols-2 gap-2"><Button primary disabled={busy} onClick={() => run(() => acceptEventInvitation(drawer.invite.id), "Group accepted the event.")}>Accept for group</Button><Button danger disabled={busy} onClick={() => run(() => declineEventInvitation(drawer.invite.id), "Group declined the event.")}>Decline</Button></div></div> : null}</Drawer>
    <Drawer open={drawer?.type === "createCollection"} title="Create collection" onClose={() => setDrawer(null)}><div className="space-y-3"><Field label="Collection name" value={collectionForm.title} onChange={(v) => setCollectionForm((f) => ({...f,title:v}))}/><label className="block"><span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Group</span><select value={collectionForm.group} onChange={(e) => setCollectionForm((f) => ({...f,group:e.target.value}))} className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white"><option value="">Select managed group</option>{groups.filter((g) => managedGroupIds.has(Number(g.id))).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label><label className="block"><span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Linked event</span><select value={collectionForm.event} onChange={(e) => setCollectionForm((f) => ({...f,event:e.target.value}))} className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white"><option value="">Optional</option>{events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}</select></label><Field label="Total amount" value={collectionForm.total} onChange={(v) => setCollectionForm((f) => ({...f,total:v}))} placeholder="400.00"/><Button primary className="w-full" disabled={busy || !collectionForm.title.trim() || !collectionForm.group} onClick={() => { const payload = { title:collectionForm.title, group:Number(collectionForm.group), total_amount_cents:Math.round(Number(collectionForm.total || 0)*100), split_method:collectionForm.split_method, status:"OPEN" }; if (collectionForm.event) payload.event = Number(collectionForm.event); return run(() => createCollection(payload), "Collection created and saved."); }}>Create collection</Button></div></Drawer>
    <Drawer open={drawer?.type === "collection"} title={drawer?.collection?.title || "Collection"} onClose={() => setDrawer(null)}>{drawer?.collection ? <div className="space-y-4"><div className="grid grid-cols-3 gap-2"><Stat value={money(drawer.collection.total_amount_cents)} label="Total"/><Stat value={money(drawer.collection.collected_amount_cents)} label="Collected"/><Stat value={`${drawer.collection.shares?.length || 0}`} label="Shares"/></div><div className="space-y-2">{list(drawer.collection.shares).map((share) => <div key={share.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3"><div><div className="text-sm font-black text-white">{displayName(share.user_detail)}</div><div className="text-xs text-slate-500">{money(share.amount_due_cents)}</div></div><Pill tone={share.status === "PAID" ? "emerald" : "amber"}>{share.status}</Pill></div>)}</div><div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.05] p-3 text-xs leading-5 text-amber-100/80">Real payment execution is not enabled yet. Paid status remains server-controlled and cannot be self-marked.</div></div> : null}</Drawer>
    <Drawer open={drawer?.type === "access"} title="Connect by access code" onClose={() => setDrawer(null)}><div className="space-y-3"><p className="text-sm leading-6 text-slate-400">Existing employee, tenant and investor access systems remain separate from Social membership.</p><Button className="w-full" onClick={() => nav("/employee/settings")}>Employee access</Button><Button className="w-full" onClick={() => nav("/tenant/settings")}>Tenant access</Button><Button className="w-full" onClick={() => nav("/investor/settings")}>Investor access</Button></div></Drawer>
  </div>;
}
