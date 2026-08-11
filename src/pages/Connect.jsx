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

const useCases = [
  { icon: Trophy, title: "Teams & leagues", body: "Invites, attendance, entry fees, schedules and location changes." },
  { icon: BookOpen, title: "Clubs & communities", body: "Book clubs, church groups, school groups, HOAs and recurring dues." },
  { icon: Users, title: "Friends & trips", body: "Connect with people, plan gatherings and split shared costs." },
];

const peopleSeed = [
  { id: 1, initials: "BR", name: "Brandon Ritter", meta: "2 mutual connections · Montgomery, AL" },
  { id: 2, initials: "MC", name: "Morgan Carter", meta: "3 shared groups · Birmingham, AL" },
  { id: 3, initials: "AP", name: "Alex Parker", meta: "1 mutual connection · Prattville, AL" },
];

const groups = [
  { id: 1, name: "River Region Sports", type: "Organization", members: 312, child: "4 divisions · 28 teams", accent: "cyan" },
  { id: 2, name: "Tuesday Night Book Club", type: "Community", members: 18, child: "Monthly meeting · dues optional", accent: "violet" },
  { id: 3, name: "Oak Ridge Neighborhood", type: "Neighborhood", members: 146, child: "Events · HOA notices · collections", accent: "emerald" },
];

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Pill({ children, tone = "slate" }) {
  const tones = {
    cyan: "border-cyan-400/25 bg-cyan-400/10 text-cyan-100",
    emerald: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
    amber: "border-amber-400/25 bg-amber-400/10 text-amber-100",
    violet: "border-violet-400/25 bg-violet-400/10 text-violet-100",
    slate: "border-white/10 bg-white/[0.04] text-slate-300",
  };
  return <span className={cx("inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]", tones[tone] || tones.slate)}>{children}</span>;
}

function Button({ children, onClick, primary = false, danger = false, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "min-h-11 rounded-2xl px-4 text-sm font-black transition active:scale-[0.98]",
        primary && "bg-cyan-300 text-slate-950 hover:bg-cyan-200",
        danger && "border border-rose-400/20 bg-rose-400/[0.06] text-rose-100",
        !primary && !danger && "border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.07]",
        className
      )}
    >
      {children}
    </button>
  );
}

function Panel({ title, body, children, right }) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-[#07111f]/85 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.24)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-white sm:text-lg">{title}</h2>
          {body ? <p className="mt-1 text-sm leading-6 text-slate-400">{body}</p> : null}
        </div>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Stat({ value, label }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="text-xl font-black text-white">{value}</div>
      <div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</div>
    </div>
  );
}

function HomeTab({ nav, setTab, notice }) {
  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_85%_10%,rgba(34,211,238,.18),transparent_30%),radial-gradient(circle_at_10%_90%,rgba(139,92,246,.14),transparent_32%),linear-gradient(145deg,#07111f,#02060c)] p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex flex-wrap gap-2"><Pill tone="cyan">SyncWorks Social</Pill><Pill>People → Groups → Events → Collections</Pill></div>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-4xl">Connect people. Organize life. Keep everyone in sync.</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">Build your network, create communities, organize events, collect shared fees and keep dates, times and locations connected to each member&apos;s calendar.</p>
          </div>
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10"><Sparkles className="h-6 w-6 text-cyan-200" /></div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat value="People" label="Friend connections" />
          <Stat value="Groups" label="Any community" />
          <Stat value="Events" label="Live schedules" />
          <Stat value="1 place" label="Shared collections" />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button primary onClick={() => setTab("People")}><span className="inline-flex items-center gap-2"><UserPlus className="h-4 w-4" /> Find people</span></Button>
          <Button onClick={() => setTab("Groups")}><span className="inline-flex items-center gap-2"><Plus className="h-4 w-4" /> Create a group</span></Button>
          <Button onClick={() => setTab("Events")}><span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Plan event</span></Button>
        </div>
      </section>

      {notice ? <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.07] p-3 text-sm text-cyan-100">{notice}</div> : null}

      <Panel title="What can you use it for?" body="Social is intentionally broader than sports. The same building blocks work anywhere people need to coordinate.">
        <div className="grid gap-3 md:grid-cols-3">
          {useCases.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-cyan-400/10"><Icon className="h-5 w-5 text-cyan-200" /></div>
              <div className="mt-3 font-black text-white">{title}</div>
              <div className="mt-1 text-xs leading-5 text-slate-400">{body}</div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Needs a response" body="Invitations move through the correct level instead of getting buried in a group chat." right={<Pill tone="amber">2 actions</Pill>}>
          <div className="space-y-3">
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4">
              <div className="flex items-start justify-between gap-3"><div><div className="font-black text-white">River City Invitational</div><div className="mt-1 text-xs text-slate-400">Team manager decision · Aug 29 · Hoover, AL</div></div><Pill tone="amber">Manager</Pill></div>
              <div className="mt-3 flex gap-2"><Button primary>Accept</Button><Button danger>Decline</Button></div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="font-black text-white">Once the group commits</div>
              <div className="mt-1 text-xs leading-5 text-slate-400">Members can answer Yes, No or Maybe. Organizers see availability before assigning or collecting each person&apos;s share.</div>
            </div>
          </div>
        </Panel>

        <Panel title="Upcoming & connected" body="Shared details stay authoritative. Organizer changes flow to everyone who accepted the event." right={<CalendarDays className="h-5 w-5 text-cyan-200" />}>
          <button type="button" onClick={() => nav("/calendar")} className="w-full rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.05] p-4 text-left">
            <div className="flex items-start gap-3"><MapPin className="mt-0.5 h-5 w-5 text-cyan-200" /><div><div className="font-black text-white">Community fundraiser</div><div className="mt-1 text-xs text-slate-400">Saturday · 10:00 AM · Riverfront Park</div><div className="mt-2 text-xs leading-5 text-slate-500">If the organizer changes time or location, accepted calendars can be updated from the source event.</div></div></div>
          </button>
        </Panel>
      </div>
    </div>
  );
}

function PeopleTab({ connections, updateConnection, notice }) {
  return (
    <div className="space-y-4">
      <Panel title="Find your people" body="Friend-style connections are personal. A connection can later be invited to groups, events or shared collections.">
        <div className="relative"><Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" /><input className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/30" placeholder="Search people by name, city or shared group" /></div>
      </Panel>
      {notice ? <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.07] p-3 text-sm text-cyan-100">{notice}</div> : null}
      <div className="grid gap-3 lg:grid-cols-2">
        {peopleSeed.map((person) => {
          const status = connections[person.id] || "suggested";
          return (
            <div key={person.id} className="rounded-[1.5rem] border border-white/10 bg-[#07111f]/85 p-4">
              <div className="flex items-center gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan-300 to-blue-600 font-black text-slate-950">{person.initials}</div><div className="min-w-0 flex-1"><div className="font-black text-white">{person.name}</div><div className="mt-1 text-xs text-slate-400">{person.meta}</div></div></div>
              <div className="mt-4 flex flex-wrap gap-2">
                {status === "suggested" ? <><Button primary onClick={() => updateConnection(person.id, "pending")}><span className="inline-flex items-center gap-2"><UserPlus className="h-4 w-4" /> Add friend</span></Button><Button>View profile</Button></> : null}
                {status === "pending" ? <><Button><span className="inline-flex items-center gap-2"><Check className="h-4 w-4" /> Request sent</span></Button><Button danger onClick={() => updateConnection(person.id, "suggested")}>Cancel</Button></> : null}
                {status === "friend" ? <><Button><span className="inline-flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Message</span></Button><Button>Friends</Button></> : null}
              </div>
            </div>
          );
        })}
      </div>
      <Panel title="Friend requests" body="Accepting a person never automatically shares your business, financial or private group information." right={<Pill tone="emerald">Privacy first</Pill>}>
        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-violet-400/20 font-black text-violet-100">JT</div>
          <div className="min-w-0 flex-1"><div className="font-black text-white">Jordan Taylor</div><div className="text-xs text-slate-400">4 mutual connections</div></div>
          <div className="flex gap-2"><Button primary onClick={() => updateConnection(99, "friend")}>Accept</Button><Button danger>Decline</Button></div>
        </div>
      </Panel>
    </div>
  );
}

function GroupsTab({ setNotice }) {
  return (
    <div className="space-y-4">
      <Panel title="Groups that fit real life" body="Create a single group or build a hierarchy such as organization → division → team → members." right={<Button primary onClick={() => setNotice("Group creation is staged for the backend build. The UI structure is ready.")}><span className="inline-flex items-center gap-2"><Plus className="h-4 w-4" /> Create</span></Button>}>
        <div className="grid gap-3 md:grid-cols-3">
          {groups.map((group) => <div key={group.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-start justify-between gap-2"><div className="font-black text-white">{group.name}</div><Pill tone={group.accent}>{group.type}</Pill></div><div className="mt-2 text-xs text-slate-400">{group.members} members</div><div className="mt-1 text-xs text-slate-500">{group.child}</div><button type="button" className="mt-4 flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs font-black text-slate-200">Open group <ChevronRight className="h-4 w-4" /></button></div>)}
        </div>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Role-aware control" body="The person at the right level receives the decision. Directors invite organizations or teams; leaders then collect member availability.">
          <div className="space-y-2 text-xs text-slate-300">
            {["Organization owner / sanction", "Division or chapter director", "Group / team manager", "Member / player / parent"].map((item, index) => <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-cyan-400/10 font-black text-cyan-200">{index + 1}</span>{item}</div>)}
          </div>
        </Panel>
        <Panel title="Internal communication" body="Each group can have announcements, direct messages and event-specific conversations without relying on outside social apps." right={<MessageCircle className="h-5 w-5 text-violet-200" />}>
          <div className="space-y-2"><div className="rounded-2xl border border-violet-400/15 bg-violet-400/[0.05] p-3 text-sm text-slate-300"><b className="text-white">Announcements</b><div className="mt-1 text-xs text-slate-500">Structured updates, acknowledgements and organizer changes.</div></div><div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300"><b className="text-white">Group chat</b><div className="mt-1 text-xs text-slate-500">Conversation for the people who belong to the group.</div></div></div>
        </Panel>
      </div>
    </div>
  );
}

function EventsTab({ nav, setNotice }) {
  const [memberAnswer, setMemberAnswer] = useState("pending");
  return (
    <div className="space-y-4">
      <Panel title="Create one event, keep everyone current" body="The organizer owns the source details: date, time, park/venue, address, pricing, deadline, flyer, prizes, rules and updates." right={<Button primary onClick={() => setNotice("Event creation form is staged for the persistent backend build.")}><span className="inline-flex items-center gap-2"><Plus className="h-4 w-4" /> Create event</span></Button>}>
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.05] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><Pill tone="cyan">Invitation</Pill><div className="mt-2 text-lg font-black text-white">River City Invitational</div><div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400"><span>Aug 29, 2026 · 8:00 AM</span><span>Hoover Sports Park</span><span>$400 group entry</span></div></div><Pill tone="amber">Manager decision</Pill></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3"><Button primary onClick={() => setNotice("Group accepted. The next step is member availability and optional split collection.")}>Accept for group</Button><Button danger onClick={() => setNotice("Group declined. No member payment requests would be created.")}>Decline</Button><Button onClick={() => nav("/calendar")}>Open calendar</Button></div>
        </div>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Member availability" body="After the group accepts, each member can answer independently. The manager sees the live roster before finalizing participation." right={<Pill tone="violet">Coach / leader view</Pill>}>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="font-black text-white">Can you attend?</div><div className="mt-1 text-xs text-slate-400">Your answer is visible to the group manager.</div><div className="mt-3 grid grid-cols-3 gap-2">{["yes", "maybe", "no"].map((answer) => <button key={answer} type="button" onClick={() => setMemberAnswer(answer)} className={cx("min-h-11 rounded-xl border text-xs font-black capitalize", memberAnswer === answer ? "border-cyan-300/40 bg-cyan-300 text-slate-950" : "border-white/10 bg-black/20 text-slate-300")}>{answer}</button>)}</div></div>
          <div className="mt-3 grid grid-cols-3 gap-2"><Stat value="9" label="Yes" /><Stat value="2" label="Maybe" /><Stat value="1" label="Pending" /></div>
        </Panel>
        <Panel title="Live event updates" body="Accepted events can feed SyncWorks Calendar. Organizer edits become structured changes rather than another message people may miss." right={<ShieldCheck className="h-5 w-5 text-emerald-200" />}>
          <div className="space-y-2 text-xs text-slate-300"><div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] p-3"><b className="text-white">Location changed</b><div className="mt-1 text-slate-500">Source event updates member calendars and sends an acknowledgement notice.</div></div><div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"><b className="text-white">Time changed</b><div className="mt-1 text-slate-500">The new start time replaces the old shared event time while private reminders remain personal.</div></div></div>
        </Panel>
      </div>
    </div>
  );
}

function CollectTab({ setNotice }) {
  const [paid, setPaid] = useState([1, 2, 3, 4, 5, 6, 7, 8]);
  const paidTotal = paid.length * 40;
  return (
    <div className="space-y-4">
      <Panel title="Collect without chasing everyone" body="A group can pay once or split a required amount among members. SyncWorks tracks who has paid and rolls the collection toward the organizer." right={<Pill tone="emerald">Universal collection</Pill>}>
        <div className="grid gap-3 sm:grid-cols-4"><Stat value="$400" label="Entry / total" /><Stat value={`$${paidTotal}`} label="Collected" /><Stat value={`${paid.length}/10`} label="Members paid" /><Stat value="$80" label="Remaining" /></div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-cyan-300" style={{ width: `${Math.min(100, (paidTotal / 400) * 100)}%` }} /></div>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Member portions" body="Equal split is one option. Collections can also use custom amounts, quantities, optional contributions or required contributions.">
          <div className="space-y-2">{Array.from({ length: 10 }, (_, index) => index + 1).map((id) => { const isPaid = paid.includes(id); return <button key={id} type="button" onClick={() => setPaid((current) => isPaid ? current.filter((value) => value !== id) : [...current, id])} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left"><div><div className="text-sm font-black text-white">Member {id}</div><div className="text-xs text-slate-500">$40 portion</div></div><Pill tone={isPaid ? "emerald" : "amber"}>{isPaid ? "Paid" : "Due"}</Pill></button>; })}</div>
        </Panel>
        <div className="space-y-4">
          <Panel title="Ways to pay" body="The collection record can present the organizer&apos;s enabled payment choices. Production money movement will be wired separately from this UI foundation.">
            <div className="grid gap-3 sm:grid-cols-3"><button type="button" onClick={() => setNotice("Stripe checkout / connected-account wiring belongs to the payments backend build.")} className="rounded-2xl border border-indigo-400/20 bg-indigo-400/[0.06] p-4 text-left"><CreditCard className="h-5 w-5 text-indigo-200" /><div className="mt-2 font-black text-white">Stripe</div><div className="mt-1 text-[11px] text-slate-500">Card / wallet</div></button><button type="button" onClick={() => setNotice("Venmo payment-link/deep-link support is staged for provider wiring.")} className="rounded-2xl border border-blue-400/20 bg-blue-400/[0.06] p-4 text-left"><WalletCards className="h-5 w-5 text-blue-200" /><div className="mt-2 font-black text-white">Venmo</div><div className="mt-1 text-[11px] text-slate-500">Enabled by organizer</div></button><button type="button" onClick={() => setNotice("Cash App payment-link/deep-link support is staged for provider wiring.")} className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4 text-left"><CircleDollarSign className="h-5 w-5 text-emerald-200" /><div className="mt-2 font-black text-white">Cash App</div><div className="mt-1 text-[11px] text-slate-500">Enabled by organizer</div></button></div>
          </Panel>
          <Panel title="Collection rules" body="Every payment stays attached to its purpose, payor, group and parent event so organizers get a usable ledger instead of screenshots and text messages." right={<BadgeDollarSign className="h-5 w-5 text-amber-200" />}>
            <div className="space-y-2 text-xs text-slate-400"><div className="rounded-xl border border-white/10 bg-black/20 p-3">Equal, custom, quantity, optional or required split</div><div className="rounded-xl border border-white/10 bg-black/20 p-3">Due date, reminders and paid / unpaid status</div><div className="rounded-xl border border-white/10 bg-black/20 p-3">Platform fee and processor fee shown separately before payment</div></div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

export default function Connect() {
  const nav = useNavigate();
  const [activeTab, setActiveTab] = useState("Home");
  const [notice, setNotice] = useState("");
  const [connections, setConnections] = useState({});

  const tabIcon = useMemo(() => ({ Home: Sparkles, People: UserPlus, Groups: Users, Events: CalendarDays, Collect: BadgeDollarSign }), []);

  function updateConnection(id, status) {
    setConnections((current) => ({ ...current, [id]: status }));
    setNotice(status === "pending" ? "Friend request prepared in this frontend preview. Backend persistence comes in the next Social build." : "Connection state updated in this preview.");
  }

  return (
    <div className="min-h-screen bg-[#02060c] pb-[calc(7.5rem+env(safe-area-inset-bottom))] text-slate-100">
      <ModeBar title="SyncWorks Social" subtitle="People • Groups • Events • Collections" />
      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-5 sm:py-6">
        <div className="mb-4 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
          {tabs.map((tab) => { const Icon = tabIcon[tab]; return <button key={tab} type="button" onClick={() => { setActiveTab(tab); setNotice(""); }} className={cx("flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-black", activeTab === tab ? "bg-white text-slate-950" : "border border-white/10 bg-white/[0.03] text-slate-400")}><Icon className="h-4 w-4" />{tab}</button>; })}
        </div>

        {activeTab === "Home" ? <HomeTab nav={nav} setTab={setActiveTab} notice={notice} /> : null}
        {activeTab === "People" ? <PeopleTab connections={connections} updateConnection={updateConnection} notice={notice} /> : null}
        {activeTab === "Groups" ? <GroupsTab setNotice={setNotice} /> : null}
        {activeTab === "Events" ? <EventsTab nav={nav} setNotice={setNotice} /> : null}
        {activeTab === "Collect" ? <CollectTab setNotice={setNotice} /> : null}

        {activeTab !== "Home" && activeTab !== "People" && notice ? <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.07] p-3 text-sm text-cyan-100">{notice}</div> : null}

        <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/[0.07] p-4 text-xs leading-5 text-amber-100/80">
          Social foundation preview: people, group hierarchy, event decisions, member availability, collections and payment-method UI are now represented. Live records, messaging, provider payments and external calendar synchronization require the Social backend builds.
        </div>
      </main>
    </div>
  );
}
