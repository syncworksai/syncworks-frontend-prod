import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Copy,
  ExternalLink,
  Loader2,
  MessageCircle,
  Settings,
  Share2,
  ShieldCheck,
  Trophy,
  UserPlus,
  Users,
  WalletCards,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import ModeBar from "../components/ModeBar";
import TeamChatPanel from "../components/sports/TeamChatPanel";
import { useAuth } from "../auth/AuthContext";
import {
  createGroupInviteLink,
  getCollections,
  getEventInvitations,
  getEvents,
  getGroupMembers,
  getGroups,
  getMemberships,
} from "../api/social";

const TABS = ["Overview", "Events", "Members", "Chat", "Collect"];
const cx = (...values) => values.filter(Boolean).join(" ");
const list = (value) => Array.isArray(value) ? value : [];
const num = (value) => Number(value || 0);
const money = (cents) => (num(cents) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
const errorText = (error) => error?.response?.data?.detail || error?.message || "Something went wrong.";

function Btn({ children, onClick, primary, disabled, className = "" }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={cx(
    "min-h-10 rounded-xl px-3 text-[10px] font-black transition active:scale-[.98] disabled:opacity-40",
    primary ? "bg-cyan-300 text-slate-950" : "border border-white/10 bg-white/[.035] text-slate-200",
    className,
  )}>{children}</button>;
}

function Card({ title, body, action, children, className = "" }) {
  return <section className={cx("rounded-[1.4rem] border border-white/10 bg-[#07111f]/95 p-4", className)}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0"><h2 className="text-sm font-black text-white">{title}</h2>{body ? <p className="mt-1 text-[10px] leading-4 text-slate-500">{body}</p> : null}</div>
      {action}
    </div>
    <div className="mt-3">{children}</div>
  </section>;
}

function Metric({ label, value, tone = "cyan", sub }) {
  const tones = {
    cyan: "border-cyan-300/15 bg-cyan-300/[.045]",
    violet: "border-violet-300/15 bg-violet-300/[.045]",
    green: "border-emerald-300/15 bg-emerald-300/[.045]",
    amber: "border-amber-300/15 bg-amber-300/[.045]",
  };
  return <div className={cx("rounded-xl border p-2.5", tones[tone] || "border-white/10")}>
    <div className="text-[7px] font-black uppercase tracking-[.13em] text-slate-500">{label}</div>
    <div className="mt-1 text-lg font-black text-white">{value}</div>
    {sub ? <div className="text-[8px] text-slate-500">{sub}</div> : null}
  </div>;
}

function Pill({ children, tone = "slate" }) {
  const tones = {
    slate: "border-white/10 bg-white/[.04] text-slate-300",
    cyan: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
    green: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
    amber: "border-amber-300/20 bg-amber-300/10 text-amber-100",
    violet: "border-violet-300/20 bg-violet-300/10 text-violet-100",
  };
  return <span className={cx("inline-flex rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-wide", tones[tone])}>{children}</span>;
}

function GroupMark({ group }) {
  if (group?.logo_url) return <img src={group.logo_url} alt="" className="h-20 w-20 rounded-[1.35rem] border border-white/10 object-cover" />;
  const initials = String(group?.name || "G").split(/\s+/).slice(0,2).map((part)=>part[0]).join("").toUpperCase();
  return <div className="grid h-20 w-20 place-items-center rounded-[1.35rem] border border-cyan-300/20 bg-gradient-to-br from-cyan-300/20 to-violet-300/10 text-2xl font-black text-cyan-100">{initials}</div>;
}

export default function SocialGroupDashboard() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = Number(user?.id || 0);

  const [tab, setTab] = useState("Overview");
  const [group, setGroup] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true); setError("");
    try {
      const [groupRows, membershipRows, memberRows, eventRows, inviteRows, collectionRows] = await Promise.all([
        getGroups(),
        getMemberships(),
        getGroupMembers(groupId),
        getEvents(),
        getEventInvitations(),
        getCollections(),
      ]);
      setGroup(list(groupRows).find((row) => Number(row.id) === Number(groupId)) || null);
      setMemberships(list(membershipRows));
      setMembers(list(memberRows));
      setEvents(list(eventRows));
      setInvitations(list(inviteRows));
      setCollections(list(collectionRows).filter((row) => Number(row.group) === Number(groupId)));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, [groupId]);

  const myMembership = memberships.find((row) => Number(row.group) === Number(groupId) && Number(row.user) === userId && row.status === "ACTIVE");
  const managed = ["OWNER","DIRECTOR","MANAGER"].includes(myMembership?.role);
  const isTeam = ["TEAM","CLUB"].includes(String(group?.kind || "").toUpperCase());

  const groupEvents = useMemo(() => {
    const acceptedIds = new Set(
      invitations
        .filter((row) => Number(row.target_group) === Number(groupId) && row.status === "ACCEPTED")
        .map((row) => Number(row.event)),
    );
    return events
      .filter((row) => Number(row.organizer_group) === Number(groupId) || acceptedIds.has(Number(row.id)))
      .sort((a,b) => new Date(a.start_at) - new Date(b.start_at));
  }, [events, invitations, groupId]);

  const upcoming = groupEvents.filter((row) => row.status !== "CANCELLED" && new Date(row.start_at).getTime() >= Date.now() - 21600000);
  const nextEvent = upcoming[0] || null;
  const ownShares = collections.flatMap((collection) =>
    list(collection.shares)
      .filter((share) => Number(share.user) === userId)
      .map((share) => ({ ...share, collection })),
  );
  const myDue = ownShares.reduce((sum,row)=>sum + Math.max(0,num(row.amount_due_cents)-num(row.amount_paid_cents)),0);
  const totalOpen = collections.filter((row)=>["OPEN","DRAFT"].includes(row.status)).length;

  async function ensureInviteLink() {
    setBusy(true); setError(""); setNotice("");
    try {
      const link = await createGroupInviteLink(Number(groupId), "MEMBER");
      const url = window.location.origin + "/social/invite/" + link.token;
      return url;
    } catch (err) {
      setError(errorText(err));
      return "";
    } finally {
      setBusy(false);
    }
  }

  async function shareInvite() {
    const url = await ensureInviteLink();
    if (!url) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join " + group.name + " on SyncWorks", text: "Join our SyncWorks Social group.", url });
        return;
      } catch {}
    }
    await navigator.clipboard?.writeText(url);
    setNotice("Group invite link copied.");
  }

  async function copyInvite() {
    const url = await ensureInviteLink();
    if (!url) return;
    await navigator.clipboard?.writeText(url);
    setNotice("Group invite link copied.");
  }

  if (loading) return <div className="min-h-screen bg-[#02060c] text-white"><ModeBar title="Group" subtitle="SyncWorks Social"/><div className="grid min-h-[70vh] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-cyan-300"/></div></div>;

  if (!group) return <div className="min-h-screen bg-[#02060c] p-3 text-white"><ModeBar title="Group" subtitle="SyncWorks Social"/><Card title="Group unavailable"><p className="text-xs text-slate-500">{error || "This group could not be loaded."}</p><Btn className="mt-3" onClick={()=>navigate("/connect")}><ArrowLeft className="mr-1 inline h-4 w-4"/>Back to Social</Btn></Card></div>;

  return <div className="min-h-screen bg-[#02060c] pb-28 text-slate-100">
    <ModeBar title="Group" subtitle="SyncWorks Social"/>
    <main className="mx-auto max-w-6xl space-y-3 px-3 py-3 sm:px-5">
      <div className="flex items-center justify-between gap-2">
        <Btn onClick={()=>navigate("/connect")}><ArrowLeft className="mr-1 inline h-4 w-4"/>Social</Btn>
        {managed ? <div className="flex gap-2"><Btn onClick={copyInvite} disabled={busy}><Copy className="mr-1 inline h-4 w-4"/>Copy invite</Btn><Btn primary onClick={shareInvite} disabled={busy}><Share2 className="mr-1 inline h-4 w-4"/>Invite</Btn></div> : null}
      </div>

      {error ? <div className="rounded-xl border border-rose-300/20 bg-rose-300/10 p-2.5 text-[10px] text-rose-100">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-2.5 text-[10px] text-cyan-100">{notice}</div> : null}

      <section className="relative overflow-hidden rounded-[1.8rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_84%_0%,rgba(34,211,238,.18),transparent_31%),radial-gradient(circle_at_0%_100%,rgba(139,92,246,.15),transparent_35%),#07111f] p-4 sm:p-5">
        <div className="relative flex items-start gap-3">
          <GroupMark group={group}/>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-1.5"><Pill tone="cyan">{group.kind}</Pill><Pill tone="green">{myMembership?.role || "MEMBER"}</Pill>{group.visibility ? <Pill>{group.visibility}</Pill> : null}</div>
            <h1 className="mt-2 truncate text-2xl font-black text-white">{group.name}</h1>
            {group.description ? <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-400">{group.description}</p> : null}
            <div className="mt-1 text-[9px] text-slate-500">{[group.city,group.state].filter(Boolean).join(", ")}</div>
          </div>
        </div>
        <div className="relative mt-4 grid grid-cols-4 gap-1.5">
          <Metric label="Members" value={members.length}/>
          <Metric label="Upcoming" value={upcoming.length} tone="green"/>
          <Metric label="Collect" value={totalOpen} tone="violet"/>
          <Metric label="My due" value={money(myDue)} tone="amber"/>
        </div>
        {isTeam ? <button type="button" onClick={()=>navigate("/connect/groups/"+group.id+"/sports")} className="relative mt-3 flex w-full items-center justify-between rounded-xl border border-amber-300/20 bg-gradient-to-r from-amber-300/[.07] to-cyan-300/[.04] p-3 text-left"><span><span className="block text-xs font-black text-white"><Trophy className="mr-1 inline h-4 w-4 text-amber-300"/>Sports team center</span><span className="mt-0.5 block text-[9px] text-slate-500">Player profiles, lineup, games, stats, league and Game Book.</span></span><ChevronRight className="h-4 w-4 text-amber-200"/></button> : null}
      </section>

      <div className="flex gap-1.5 overflow-x-auto pb-1">{TABS.map((name)=><button key={name} type="button" onClick={()=>setTab(name)} className={cx("min-h-9 shrink-0 rounded-full px-3 text-[9px] font-black",tab===name?"bg-white text-slate-950":"border border-white/10 text-slate-400")}>{name}{name==="Collect"&&myDue>0?<span className="ml-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[7px] text-white">!</span>:null}</button>)}</div>

      {tab==="Overview" ? <div className="grid gap-3 lg:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-3">
          <Card title="What’s next" body="The next shared event for this group." action={<CalendarDays className="h-4 w-4 text-emerald-300"/>}>
            {nextEvent ? <button type="button" onClick={()=>navigate("/connect/events/"+nextEvent.id)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-emerald-300/15 bg-emerald-300/[.04] p-3 text-left"><span className="min-w-0"><span className="block text-[8px] font-black uppercase tracking-wide text-emerald-300">{new Date(nextEvent.start_at).toLocaleDateString([], {weekday:"short",month:"short",day:"numeric"})}</span><b className="mt-1 block truncate text-sm text-white">{nextEvent.title}</b><span className="mt-1 block text-[9px] text-slate-500">{new Date(nextEvent.start_at).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})} · {nextEvent.venue_name || "Location TBD"}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-emerald-300"/></button> : <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-slate-500">No upcoming events yet.</div>}
          </Card>
          <Card title="Recent & upcoming events" body="Open any event for RSVP, route, flyer, calendar and payments.">
            <div className="space-y-1.5">{groupEvents.slice(0,5).map((row)=><button key={row.id} type="button" onClick={()=>navigate("/connect/events/"+row.id)} className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[.025] p-2.5 text-left"><CalendarDays className="h-4 w-4 shrink-0 text-cyan-300"/><span className="min-w-0 flex-1"><b className="block truncate text-[10px] text-white">{row.title}</b><span className="block text-[9px] text-slate-500">{new Date(row.start_at).toLocaleString()}</span></span><ChevronRight className="h-4 w-4 text-slate-600"/></button>)}{!groupEvents.length?<div className="text-xs text-slate-500">No events have been shared with this group.</div>:null}</div>
          </Card>
        </div>
        <div className="space-y-3">
          <Card title="Group snapshot" body="One Social group can be a team, club, book club, church group, family or community.">
            <div className="grid grid-cols-2 gap-2"><Metric label="Members" value={members.length}/><Metric label="Events" value={groupEvents.length} tone="green"/><Metric label="Collections" value={collections.length} tone="violet"/><Metric label="My due" value={money(myDue)} tone="amber"/></div>
          </Card>
          {managed ? <Card title="Manager tools" body="Group settings and creation tools stay in the main Social workspace."><div className="grid gap-2"><Btn primary onClick={shareInvite}><UserPlus className="mr-1 inline h-4 w-4"/>Invite members</Btn><Btn onClick={()=>navigate("/connect")}><Settings className="mr-1 inline h-4 w-4"/>Manage group in Social</Btn></div></Card> : null}
        </div>
      </div> : null}

      {tab==="Events" ? <Card title="Group events" body="Shared events automatically connect RSVP and SyncWorks Calendar."><div className="space-y-2">{groupEvents.map((row)=>{const flyer=row.flyer_image_url||row.flyer_url;return <button key={row.id} type="button" onClick={()=>navigate("/connect/events/"+row.id)} className="grid w-full grid-cols-[4.5rem_1fr_auto] items-center gap-3 rounded-xl border border-white/10 bg-white/[.025] p-2 text-left">{flyer?<img src={flyer} alt="" className="h-16 w-[4.5rem] rounded-lg object-cover"/>:<div className="grid h-16 w-[4.5rem] place-items-center rounded-lg bg-cyan-300/[.05]"><CalendarDays className="h-5 w-5 text-cyan-300"/></div>}<span className="min-w-0"><b className="block truncate text-xs text-white">{row.title}</b><span className="mt-1 block text-[9px] text-slate-500">{new Date(row.start_at).toLocaleString()}</span><span className="block text-[9px] text-slate-600">{row.venue_name||"Location TBD"}</span></span><ChevronRight className="h-4 w-4 text-slate-600"/></button>})}{!groupEvents.length?<div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-slate-500">No group events yet.</div>:null}</div></Card> : null}

      {tab==="Members" ? <Card title="Members" body="Active member directory. Email addresses stay private."><div className="mb-3 grid grid-cols-3 gap-2"><Metric label="Total" value={members.length}/><Metric label="Leaders" value={members.filter((row)=>["OWNER","DIRECTOR","MANAGER"].includes(row.role)).length} tone="violet"/><Metric label="Members" value={members.filter((row)=>row.role==="MEMBER").length} tone="green"/></div><div className="grid gap-2 sm:grid-cols-2">{members.map((row)=>{const initials=String(row.user?.display_name||"M").split(/\s+/).slice(0,2).map((part)=>part[0]).join("").toUpperCase();return <div key={row.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.025] p-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cyan-300/15 bg-cyan-300/10 text-xs font-black text-cyan-100">{initials}</div><div className="min-w-0 flex-1"><b className="block truncate text-xs text-white">{row.user?.display_name||"SyncWorks member"}</b><span className="text-[8px] font-black uppercase tracking-wide text-slate-500">{row.role}</span></div>{["OWNER","DIRECTOR","MANAGER"].includes(row.role)?<ShieldCheck className="h-4 w-4 text-violet-300"/>:null}</div>})}</div></Card> : null}

      {tab==="Chat" ? <TeamChatPanel groupId={Number(groupId)} userId={userId} canManage={managed} title="Group chat" noun="group"/> : null}

      {tab==="Collect" ? <div className="grid gap-3 lg:grid-cols-[1fr_.8fr]">
        <Card title={managed ? "Group collections" : "My group balance"} body={managed ? "Managers see group totals. Members only receive their own assigned share." : "Your own collection shares stay private."} action={<CircleDollarSign className="h-4 w-4 text-amber-300"/>}>
          {!managed ? <div className="mb-3 rounded-xl border border-amber-300/15 bg-amber-300/[.05] p-3"><div className="text-[8px] font-black uppercase tracking-wide text-amber-300">My amount due</div><div className="mt-1 text-2xl font-black text-white">{money(myDue)}</div></div> : null}
          <div className="space-y-2">{collections.map((collection)=>{
            const mine=list(collection.shares).filter((share)=>Number(share.user)===userId);
            const myRow=mine[0];
            const remaining=myRow?Math.max(0,num(myRow.amount_due_cents)-num(myRow.amount_paid_cents)):0;
            const options=collection.payment_options||{};
            return <section key={collection.id} className="rounded-xl border border-white/10 bg-white/[.025] p-3">
              <div className="flex justify-between gap-2"><div><b className="text-xs text-white">{collection.title}</b><div className="mt-0.5 text-[9px] text-slate-500">{managed?money(collection.collected_amount_cents)+" / "+money(collection.total_amount_cents):myRow?money(myRow.amount_paid_cents)+" paid":"No share assigned"}</div></div><Pill tone={collection.status==="FUNDED"?"green":"amber"}>{collection.status}</Pill></div>
              {!managed&&myRow?<><div className="mt-2 text-lg font-black text-white">{money(remaining)}</div>{remaining?<div className="mt-2 grid grid-cols-2 gap-1.5">{options.stripe_payment_link?<a href={options.stripe_payment_link} target="_blank" rel="noreferrer" className="flex min-h-9 items-center justify-center gap-1 rounded-lg border border-cyan-300/20 bg-cyan-300/[.05] text-[8px] font-black text-cyan-100"><WalletCards className="h-3.5 w-3.5"/>Stripe</a>:null}{options.cash_app_url?<a href={options.cash_app_url} target="_blank" rel="noreferrer" className="flex min-h-9 items-center justify-center gap-1 rounded-lg border border-white/10 text-[8px] font-black">Cash App <ExternalLink className="h-3 w-3"/></a>:null}{options.venmo_url?<a href={options.venmo_url} target="_blank" rel="noreferrer" className="flex min-h-9 items-center justify-center gap-1 rounded-lg border border-white/10 text-[8px] font-black">Venmo <ExternalLink className="h-3 w-3"/></a>:null}{options.zelle_instructions?<div className="col-span-2 rounded-lg border border-white/10 p-2 text-[8px] text-slate-400"><b className="text-white">Zelle:</b> {options.zelle_instructions}</div>:null}</div>:null}</>:null}
              {managed?<div className="mt-2 grid grid-cols-2 gap-2"><Metric label="Assigned" value={list(collection.shares).length}/><Metric label="Collected" value={money(collection.collected_amount_cents)} tone="green"/></div>:null}
            </section>;
          })}{!collections.length?<div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-slate-500">No group collections yet.</div>:null}</div>
        </Card>
        <Card title="Privacy" body="Collection balances are scoped to the member unless you manage the group." action={<ShieldCheck className="h-4 w-4 text-emerald-300"/>}><p className="text-xs leading-5 text-slate-400">Members can pay and track their own assigned amount without seeing another member’s balance. Owners, directors and managers retain the full collection view for administration.</p></Card>
      </div> : null}
    </main>
  </div>;
}
