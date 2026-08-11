import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeDollarSign,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Link2,
  MapPin,
  MessageCircle,
  Plus,
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

const tabs = ["Home", "People", "Groups", "Events", "Collect"];
const peopleSeed = [
  { id: 1, initials: "BR", name: "Brandon Ritter", meta: "2 mutual connections · Montgomery, AL" },
  { id: 2, initials: "MC", name: "Morgan Carter", meta: "3 shared groups · Birmingham, AL" },
  { id: 3, initials: "AP", name: "Alex Parker", meta: "1 mutual connection · Prattville, AL" },
];
const groups = [
  { id: 1, name: "River Region Sports", type: "Organization", members: 312, child: "4 divisions · 28 teams", tone: "cyan" },
  { id: 2, name: "Tuesday Night Book Club", type: "Community", members: 18, child: "Monthly meeting · dues optional", tone: "violet" },
  { id: 3, name: "Oak Ridge Neighborhood", type: "Neighborhood", members: 146, child: "Events · HOA notices · collections", tone: "emerald" },
];
const useCases = [
  { icon: Trophy, title: "Teams & leagues", body: "Invites, attendance, entry fees, schedules and location changes." },
  { icon: BookOpen, title: "Clubs & communities", body: "Book clubs, church groups, school groups, HOAs and recurring dues." },
  { icon: Users, title: "Friends & trips", body: "Connect with people, plan gatherings and split shared costs." },
];

function cx(...parts) { return parts.filter(Boolean).join(" "); }

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
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={cx(
      "min-h-11 rounded-2xl px-4 text-sm font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
      primary && "bg-cyan-300 text-slate-950 hover:bg-cyan-200",
      danger && "border border-rose-400/20 bg-rose-400/[0.06] text-rose-100",
      !primary && !danger && "border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.07]",
      className
    )}>{children}</button>
  );
}

function Panel({ title, body, children, right }) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-[#07111f]/85 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.24)] sm:p-5">
      <div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-black text-white sm:text-lg">{title}</h2>{body ? <p className="mt-1 text-sm leading-6 text-slate-400">{body}</p> : null}</div>{right}</div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Stat({ value, label }) {
  return <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-xl font-black text-white">{value}</div><div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</div></div>;
}

function Field({ label, placeholder, type = "text" }) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</span><input type={type} placeholder={placeholder} className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/35" /></label>;
}

function ActionDrawer({ drawer, close, setNotice, nav, updateConnection }) {
  if (!drawer) return null;
  const type = drawer.type;
  const person = drawer.person;
  const group = drawer.group;
  const titleMap = {
    profile: person?.name || "Profile",
    message: `Message ${person?.name || "connection"}`,
    friendRequests: "Friend requests",
    createGroup: "Create group",
    group: group?.name || "Group",
    createEvent: "Create event",
    event: "River City Invitational",
    declineEvent: "Decline invitation",
    rsvp: "Your availability",
    collection: "Collection details",
    pay: `Pay with ${drawer.provider || "selected method"}`,
    createCollection: "Create collection",
    access: "Connect by code",
  };
  const finish = (message) => { setNotice(message); close(); };
  return (
    <div className="fixed inset-0 z-[100] flex items-end bg-black/70 backdrop-blur-sm sm:items-center sm:justify-center" onMouseDown={close}>
      <section className="max-h-[88dvh] w-full overflow-y-auto rounded-t-[2rem] border border-white/10 bg-[#06101d] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl sm:max-w-xl sm:rounded-[2rem] sm:p-5" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/15 sm:hidden" />
        <div className="sticky top-0 z-10 -mx-1 flex items-start justify-between gap-4 bg-[#06101d]/95 px-1 pb-3 backdrop-blur">
          <div><Pill tone="cyan">SyncWorks Social</Pill><h2 className="mt-2 text-xl font-black text-white">{titleMap[type]}</h2></div>
          <button type="button" onClick={close} aria-label="Close" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04]"><X className="h-5 w-5" /></button>
        </div>

        {type === "profile" ? <div className="space-y-4"><div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-cyan-300 to-blue-600 font-black text-slate-950">{person.initials}</div><div><div className="font-black text-white">{person.name}</div><div className="text-xs text-slate-400">{person.meta}</div></div></div><div className="grid grid-cols-2 gap-2"><Button primary onClick={() => { updateConnection(person.id, "pending"); close(); }}><UserPlus className="mr-2 inline h-4 w-4" />Add friend</Button><Button onClick={() => finish("Profile privacy controls will determine which shared groups and details are visible.")}>Shared context</Button></div></div> : null}

        {type === "message" ? <div className="space-y-3"><textarea rows={5} placeholder="Write a message..." className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/35" /><Button primary className="w-full" onClick={() => finish(`Message to ${person.name} prepared. Messaging persistence is not enabled yet.`)}>Send message</Button></div> : null}

        {type === "friendRequests" ? <div className="space-y-3"><div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-full bg-violet-400/20 font-black text-violet-100">JT</div><div className="flex-1"><div className="font-black text-white">Jordan Taylor</div><div className="text-xs text-slate-400">4 mutual connections</div></div></div><div className="mt-4 grid grid-cols-2 gap-2"><Button primary onClick={() => { updateConnection(99, "friend"); close(); }}>Accept</Button><Button danger onClick={() => finish("Friend request declined.")}>Decline</Button></div></div></div> : null}

        {type === "createGroup" ? <div className="space-y-3"><Field label="Group name" placeholder="Example: Tuesday Night Book Club" /><label className="block"><span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Group type</span><select className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"><option>Community</option><option>Team</option><option>Organization</option><option>Division / chapter</option><option>Club</option><option>Neighborhood</option><option>School / church</option></select></label><Field label="City / area" placeholder="Montgomery, AL" /><label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300"><input type="checkbox" defaultChecked className="h-5 w-5 accent-cyan-300" />Approval required to join</label><Button primary className="w-full" onClick={() => finish("Group draft created in this audit preview. Backend save will activate when Social API wiring is merged.")}>Create group</Button></div> : null}

        {type === "group" ? <div className="space-y-4"><div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-black text-white">{group.name}</div><div className="mt-1 text-xs text-slate-400">{group.members} members · {group.child}</div></div><Pill tone={group.tone}>{group.type}</Pill></div></div><div className="grid grid-cols-2 gap-2"><Button primary onClick={() => finish(`Membership request for ${group.name} prepared.`)}>Join / request</Button><Button onClick={() => finish(`Invite people drawer for ${group.name} prepared.`)}><UserPlus className="mr-2 inline h-4 w-4" />Invite</Button><Button onClick={() => finish(`Announcements for ${group.name} opened in preview.`)}><MessageCircle className="mr-2 inline h-4 w-4" />Announcements</Button><Button onClick={() => { close(); nav("/calendar"); }}><CalendarDays className="mr-2 inline h-4 w-4" />Calendar</Button></div></div> : null}

        {type === "createEvent" ? <div className="space-y-3"><Field label="Event name" placeholder="Community fundraiser" /><div className="grid grid-cols-2 gap-3"><Field label="Date" type="date" /><Field label="Start" type="time" /></div><Field label="Venue" placeholder="Riverfront Park" /><Field label="Address" placeholder="Full address" /><Field label="Cost / entry" placeholder="$0.00" /><Field label="RSVP deadline" type="date" /><Button primary className="w-full" onClick={() => finish("Event draft created in this audit preview. The persistent API will own the live source event.")}>Create event</Button></div> : null}

        {type === "event" ? <div className="space-y-4"><div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.05] p-4"><Pill tone="amber">Manager decision</Pill><div className="mt-3 text-lg font-black text-white">River City Invitational</div><div className="mt-2 space-y-1 text-xs text-slate-400"><div>Aug 29, 2026 · 8:00 AM</div><div>Hoover Sports Park · Hoover, AL</div><div>$400 group entry · RSVP Aug 22</div></div></div><div className="grid grid-cols-2 gap-2"><Button primary onClick={() => finish("Group accepted. Member Yes / Maybe / No availability is now the next action in this preview.")}>Accept for group</Button><Button danger onClick={() => { close(); drawer.open({ type: "declineEvent" }); }}>Decline</Button></div><Button className="w-full" onClick={() => { close(); nav("/calendar"); }}>Open SyncWorks Calendar</Button></div> : null}

        {type === "declineEvent" ? <div className="space-y-3"><p className="text-sm leading-6 text-slate-400">Declining at the manager level stops this event from becoming a member commitment or payment request.</p><label className="block"><span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Optional reason</span><textarea rows={4} placeholder="Schedule conflict, roster unavailable, travel distance..." className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white outline-none placeholder:text-slate-600" /></label><Button danger className="w-full" onClick={() => finish("Group invitation declined. No member collection would be generated.")}>Confirm decline</Button></div> : null}

        {type === "rsvp" ? <div className="space-y-3"><p className="text-sm leading-6 text-slate-400">Your answer is visible to the appropriate group manager. It does not answer for other members.</p>{["Yes — I can attend", "Maybe — keep me pending", "No — unavailable"].map((answer) => <button key={answer} type="button" onClick={() => finish(`${answer} saved in this audit preview.`)} className="flex min-h-14 w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-left text-sm font-black text-white">{answer}<ChevronRight className="h-4 w-4 text-slate-500" /></button>)}</div> : null}

        {type === "collection" ? <div className="space-y-4"><div className="grid grid-cols-3 gap-2"><Stat value="$400" label="Total" /><Stat value="$320" label="Collected" /><Stat value="$80" label="Remaining" /></div><div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="font-black text-white">River City Invitational entry</div><div className="mt-1 text-xs text-slate-400">10 members · $40 equal split · due Aug 22</div></div><Button primary className="w-full" onClick={() => drawer.open({ type: "pay", provider: "Stripe" })}>Pay my $40 share</Button></div> : null}

        {type === "pay" ? <div className="space-y-4"><div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="text-xs text-slate-500">Payment for</div><div className="mt-1 font-black text-white">River City Invitational · $40.00</div><div className="mt-2 text-xs leading-5 text-slate-400">Provider: {drawer.provider}. No real charge will be submitted from this preview build.</div></div><Button primary className="w-full" onClick={() => finish(`${drawer.provider} payment handoff confirmed as an audit flow. Live processor execution remains disabled.`)}>Continue with {drawer.provider}</Button></div> : null}

        {type === "createCollection" ? <div className="space-y-3"><Field label="Collection name" placeholder="Tournament entry, trip house, club dues..." /><Field label="Total amount" placeholder="$0.00" /><label className="block"><span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Split type</span><select className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"><option>Equal split</option><option>Custom amounts</option><option>Optional contribution</option><option>Required contribution</option><option>Quantity based</option></select></label><Field label="Due date" type="date" /><Button primary className="w-full" onClick={() => finish("Collection draft created in this audit preview.")}>Create collection</Button></div> : null}

        {type === "access" ? <div className="space-y-3"><p className="text-sm leading-6 text-slate-400">Existing employee, tenant and investor code flows stay separate from Social membership.</p><Button className="w-full" onClick={() => { close(); nav("/employee/settings?return=/connect"); }}>Employee access code</Button><Button className="w-full" onClick={() => { close(); nav("/tenant/settings?return=/connect"); }}>Tenant access code</Button><Button className="w-full" onClick={() => { close(); nav("/investor/settings?return=/connect"); }}>Investor access code</Button></div> : null}
      </section>
    </div>
  );
}

function HomeTab({ nav, setTab, openDrawer }) {
  return <div className="space-y-4">
    <section className="overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_85%_10%,rgba(34,211,238,.18),transparent_30%),radial-gradient(circle_at_10%_90%,rgba(139,92,246,.14),transparent_32%),linear-gradient(145deg,#07111f,#02060c)] p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4"><div className="max-w-3xl"><div className="flex flex-wrap gap-2"><Pill tone="cyan">SyncWorks Social</Pill><Pill>People → Groups → Events → Collections</Pill></div><h1 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-4xl">Connect people. Organize life. Keep everyone in sync.</h1><p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">Build your network, create communities, organize events, collect shared fees and keep dates, times and locations connected to each member&apos;s calendar.</p></div><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10"><Sparkles className="h-6 w-6 text-cyan-200" /></div></div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat value="People" label="Friend connections" /><Stat value="Groups" label="Any community" /><Stat value="Events" label="Live schedules" /><Stat value="1 place" label="Shared collections" /></div>
      <div className="mt-5 flex flex-wrap gap-2"><Button primary onClick={() => setTab("People")}><UserPlus className="mr-2 inline h-4 w-4" />Find people</Button><Button onClick={() => openDrawer({ type: "createGroup" })}><Plus className="mr-2 inline h-4 w-4" />Create group</Button><Button onClick={() => openDrawer({ type: "createEvent" })}><CalendarDays className="mr-2 inline h-4 w-4" />Plan event</Button></div>
    </section>
    <Panel title="What can you use it for?" body="The same Social building blocks work anywhere people need to coordinate."><div className="grid gap-3 md:grid-cols-3">{useCases.map(({ icon: Icon, title, body }) => <button type="button" key={title} onClick={() => setTab(title.includes("Friends") ? "People" : title.includes("Teams") ? "Events" : "Groups")} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-cyan-400/10"><Icon className="h-5 w-5 text-cyan-200" /></div><div className="mt-3 font-black text-white">{title}</div><div className="mt-1 text-xs leading-5 text-slate-400">{body}</div></button>)}</div></Panel>
    <div className="grid gap-4 lg:grid-cols-2"><Panel title="Needs a response" body="Invitations move to the correct decision-maker instead of getting buried in chat." right={<Pill tone="amber">2 actions</Pill>}><button type="button" onClick={() => openDrawer({ type: "event" })} className="w-full rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-left"><div className="flex items-start justify-between gap-3"><div><div className="font-black text-white">River City Invitational</div><div className="mt-1 text-xs text-slate-400">Manager decision · Aug 29 · Hoover, AL</div></div><ChevronRight className="h-5 w-5 text-amber-200" /></div></button></Panel><Panel title="Upcoming & connected" body="Organizer changes flow to everyone who accepted the event." right={<CalendarDays className="h-5 w-5 text-cyan-200" />}><button type="button" onClick={() => nav("/calendar")} className="w-full rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.05] p-4 text-left"><div className="flex items-start gap-3"><MapPin className="mt-0.5 h-5 w-5 text-cyan-200" /><div><div className="font-black text-white">Community fundraiser</div><div className="mt-1 text-xs text-slate-400">Saturday · 10:00 AM · Riverfront Park</div></div></div></button></Panel></div>
  </div>;
}

function PeopleTab({ connections, updateConnection, openDrawer }) {
  const [query, setQuery] = useState("");
  const visible = peopleSeed.filter((person) => `${person.name} ${person.meta}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-4"><Panel title="Find your people" body="Friend-style connections are personal. Add people, then invite them into the parts of Social you choose."><div className="relative"><Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" /><input value={query} onChange={(e) => setQuery(e.target.value)} className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/30" placeholder="Search people by name, city or shared group" /></div></Panel><div className="grid gap-3 lg:grid-cols-2">{visible.map((person) => { const status = connections[person.id] || "suggested"; return <div key={person.id} className="rounded-[1.5rem] border border-white/10 bg-[#07111f]/85 p-4"><div className="flex items-center gap-3"><button type="button" onClick={() => openDrawer({ type: "profile", person })} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan-300 to-blue-600 font-black text-slate-950">{person.initials}</button><div className="min-w-0 flex-1"><button type="button" onClick={() => openDrawer({ type: "profile", person })} className="font-black text-white">{person.name}</button><div className="mt-1 text-xs text-slate-400">{person.meta}</div></div></div><div className="mt-4 flex flex-wrap gap-2">{status === "suggested" ? <><Button primary onClick={() => updateConnection(person.id, "pending")}><UserPlus className="mr-2 inline h-4 w-4" />Add friend</Button><Button onClick={() => openDrawer({ type: "profile", person })}>View profile</Button></> : null}{status === "pending" ? <><Button><Check className="mr-2 inline h-4 w-4" />Request sent</Button><Button danger onClick={() => updateConnection(person.id, "suggested")}>Cancel</Button></> : null}{status === "friend" ? <><Button primary onClick={() => openDrawer({ type: "message", person })}><MessageCircle className="mr-2 inline h-4 w-4" />Message</Button><Button onClick={() => openDrawer({ type: "profile", person })}>Friends</Button></> : null}</div></div>; })}</div><Button className="w-full" onClick={() => openDrawer({ type: "friendRequests" })}>Review friend requests</Button></div>;
}

function GroupsTab({ openDrawer }) {
  return <div className="space-y-4"><Panel title="Groups that fit real life" body="Create a single group or build a hierarchy such as organization → division → team → members." right={<Button primary onClick={() => openDrawer({ type: "createGroup" })}><Plus className="mr-2 inline h-4 w-4" />Create</Button>}><div className="grid gap-3 md:grid-cols-3">{groups.map((group) => <div key={group.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-start justify-between gap-2"><div className="font-black text-white">{group.name}</div><Pill tone={group.tone}>{group.type}</Pill></div><div className="mt-2 text-xs text-slate-400">{group.members} members</div><div className="mt-1 text-xs text-slate-500">{group.child}</div><button type="button" onClick={() => openDrawer({ type: "group", group })} className="mt-4 flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs font-black text-slate-200">Open group <ChevronRight className="h-4 w-4" /></button></div>)}</div></Panel><div className="grid gap-4 lg:grid-cols-2"><Panel title="Role-aware control" body="The person at the right level receives the decision."><div className="space-y-2 text-xs text-slate-300">{["Organization owner / sanction", "Division or chapter director", "Group / team manager", "Member / player / parent"].map((item, i) => <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-cyan-400/10 font-black text-cyan-200">{i + 1}</span>{item}</div>)}</div></Panel><Panel title="Internal communication" body="Announcements, group chat and event conversations stay tied to the people who belong there." right={<MessageCircle className="h-5 w-5 text-violet-200" />}><Button className="w-full" onClick={() => openDrawer({ type: "message", person: { name: "group", initials: "G" } })}>Open group conversation preview</Button></Panel></div></div>;
}

function EventsTab({ nav, openDrawer }) {
  const [answer, setAnswer] = useState("pending");
  return <div className="space-y-4"><Panel title="Create one event, keep everyone current" body="The organizer owns date, time, venue, address, pricing, deadline, flyer, rules and updates." right={<Button primary onClick={() => openDrawer({ type: "createEvent" })}><Plus className="mr-2 inline h-4 w-4" />Create event</Button>}><button type="button" onClick={() => openDrawer({ type: "event" })} className="w-full rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.05] p-4 text-left"><div className="flex flex-wrap items-start justify-between gap-3"><div><Pill tone="cyan">Invitation</Pill><div className="mt-2 text-lg font-black text-white">River City Invitational</div><div className="mt-1 text-xs text-slate-400">Aug 29, 2026 · Hoover Sports Park · $400 group entry</div></div><Pill tone="amber">Manager decision</Pill></div></button></Panel><div className="grid gap-4 lg:grid-cols-2"><Panel title="Member availability" body="After the group accepts, each member answers independently." right={<Pill tone="violet">Coach / leader view</Pill>}><div className="grid grid-cols-3 gap-2">{["yes", "maybe", "no"].map((item) => <button key={item} type="button" onClick={() => { setAnswer(item); openDrawer({ type: "rsvp" }); }} className={cx("min-h-11 rounded-xl border text-xs font-black capitalize", answer === item ? "border-cyan-300/40 bg-cyan-300 text-slate-950" : "border-white/10 bg-black/20 text-slate-300")}>{item}</button>)}</div><div className="mt-3 grid grid-cols-3 gap-2"><Stat value="9" label="Yes" /><Stat value="2" label="Maybe" /><Stat value="1" label="Pending" /></div></Panel><Panel title="Live event updates" body="Accepted events feed the existing SyncWorks Calendar source-of-truth model." right={<ShieldCheck className="h-5 w-5 text-emerald-200" />}><div className="space-y-2"><Button className="w-full" onClick={() => nav("/calendar")}>Open calendar</Button><Button className="w-full" onClick={() => openDrawer({ type: "event" })}>View event details</Button></div></Panel></div></div>;
}

function CollectTab({ openDrawer }) {
  const [paid, setPaid] = useState([1,2,3,4,5,6,7,8]);
  const paidTotal = paid.length * 40;
  return <div className="space-y-4"><Panel title="Collect without chasing everyone" body="Pay once as a group or split a required amount among members." right={<Button primary onClick={() => openDrawer({ type: "createCollection" })}><Plus className="mr-2 inline h-4 w-4" />Create</Button>}><button type="button" onClick={() => openDrawer({ type: "collection" })} className="grid w-full grid-cols-2 gap-3 text-left sm:grid-cols-4"><Stat value="$400" label="Entry / total" /><Stat value={`$${paidTotal}`} label="Collected" /><Stat value={`${paid.length}/10`} label="Members paid" /><Stat value={`$${400-paidTotal}`} label="Remaining" /></button><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-cyan-300" style={{ width: `${Math.min(100,(paidTotal/400)*100)}%` }} /></div></Panel><div className="grid gap-4 lg:grid-cols-2"><Panel title="Member portions" body="Tap a row to audit paid/due state changes in the preview."><div className="space-y-2">{Array.from({length:10},(_,i)=>i+1).map((id)=>{const isPaid=paid.includes(id);return <button key={id} type="button" onClick={()=>setPaid((current)=>isPaid?current.filter((v)=>v!==id):[...current,id])} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left"><div><div className="text-sm font-black text-white">Member {id}</div><div className="text-xs text-slate-500">$40 portion</div></div><Pill tone={isPaid?"emerald":"amber"}>{isPaid?"Paid":"Due"}</Pill></button>;})}</div></Panel><Panel title="Ways to pay" body="These open provider handoff drawers. No real money moves in this frontend audit build."><div className="grid gap-3 sm:grid-cols-3"><button type="button" onClick={() => openDrawer({type:"pay",provider:"Stripe"})} className="rounded-2xl border border-indigo-400/20 bg-indigo-400/[0.06] p-4 text-left"><CreditCard className="h-5 w-5 text-indigo-200" /><div className="mt-2 font-black text-white">Stripe</div></button><button type="button" onClick={() => openDrawer({type:"pay",provider:"Venmo"})} className="rounded-2xl border border-blue-400/20 bg-blue-400/[0.06] p-4 text-left"><WalletCards className="h-5 w-5 text-blue-200" /><div className="mt-2 font-black text-white">Venmo</div></button><button type="button" onClick={() => openDrawer({type:"pay",provider:"Cash App"})} className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4 text-left"><CircleDollarSign className="h-5 w-5 text-emerald-200" /><div className="mt-2 font-black text-white">Cash App</div></button></div></Panel></div></div>;
}

export default function Connect() {
  const nav = useNavigate();
  const [activeTab, setActiveTab] = useState("Home");
  const [notice, setNotice] = useState("");
  const [connections, setConnections] = useState({});
  const [drawerState, setDrawerState] = useState(null);
  const tabIcon = useMemo(() => ({ Home: Sparkles, People: UserPlus, Groups: Users, Events: CalendarDays, Collect: BadgeDollarSign }), []);
  const openDrawer = (next) => setDrawerState(next);
  const closeDrawer = () => setDrawerState(null);
  const drawer = drawerState ? { ...drawerState, open: openDrawer } : null;

  function updateConnection(id, status) {
    setConnections((current) => ({ ...current, [id]: status }));
    setNotice(status === "pending" ? "Friend request prepared in this audit preview." : status === "friend" ? "Friend request accepted in this audit preview." : "Connection state updated in this audit preview.");
  }

  return <div className="min-h-screen bg-[#02060c] pb-[calc(7.5rem+env(safe-area-inset-bottom))] text-slate-100">
    <ModeBar title="SyncWorks Social" subtitle="People • Groups • Events • Collections" />
    <main className="mx-auto max-w-7xl px-3 py-4 sm:px-5 sm:py-6">
      <div className="mb-4 flex items-center gap-2"><div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">{tabs.map((tab)=>{const Icon=tabIcon[tab];return <button key={tab} type="button" onClick={()=>{setActiveTab(tab);setNotice("");}} className={cx("flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-black",activeTab===tab?"bg-white text-slate-950":"border border-white/10 bg-white/[0.03] text-slate-400")}><Icon className="h-4 w-4" />{tab}</button>;})}</div><button type="button" onClick={()=>openDrawer({type:"access"})} aria-label="Connect by code" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-slate-300"><Link2 className="h-4 w-4" /></button></div>
      {notice ? <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.07] p-3 text-sm text-cyan-100"><span>{notice}</span><button type="button" onClick={()=>setNotice("")}><X className="h-4 w-4" /></button></div> : null}
      {activeTab==="Home"?<HomeTab nav={nav} setTab={setActiveTab} openDrawer={openDrawer}/>:null}
      {activeTab==="People"?<PeopleTab connections={connections} updateConnection={updateConnection} openDrawer={openDrawer}/>:null}
      {activeTab==="Groups"?<GroupsTab openDrawer={openDrawer}/>:null}
      {activeTab==="Events"?<EventsTab nav={nav} openDrawer={openDrawer}/>:null}
      {activeTab==="Collect"?<CollectTab openDrawer={openDrawer}/>:null}
      <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/[0.07] p-4 text-xs leading-5 text-amber-100/80">Audit build: drawers, search, connection states, group/event creation surfaces, manager decisions, member RSVP, collection tracking, payment-provider handoffs and legacy access-code routes are interactive. Live persistence, messaging delivery and payment execution remain intentionally disabled until the backend/API builds are validated.</div>
    </main>
    <ActionDrawer drawer={drawer} close={closeDrawer} setNotice={setNotice} nav={nav} updateConnection={updateConnection} />
  </div>;
}
