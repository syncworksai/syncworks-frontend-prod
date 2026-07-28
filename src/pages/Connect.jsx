import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ModeBar from "../components/ModeBar";

const tabs = ["Overview", "People", "Businesses", "Groups", "Events"];

function Icon({ children }) {
  return <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">{children}</span>;
}

function Stat({ label, value, note }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-2 text-xs text-slate-500">{note}</div>
    </div>
  );
}

function ActionCard({ title, body, badge, children }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#07111f]/90 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-white">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">{body}</p>
        </div>
        {badge ? <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-200">{badge}</span> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Button({ children, primary = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={primary
        ? "min-h-11 rounded-2xl bg-cyan-300 px-4 text-sm font-black text-slate-950 active:scale-[0.98]"
        : "min-h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-slate-200 active:scale-[0.98]"}
    >
      {children}
    </button>
  );
}

export default function Connect() {
  const nav = useNavigate();
  const [activeTab, setActiveTab] = useState("Overview");
  const [notice, setNotice] = useState("");

  const briefing = useMemo(() => ({
    invites: 3,
    businesses: 8,
    groups: 4,
    actions: 2,
  }), []);

  const demo = (message) => setNotice(`${message} This preview is frontend-only; no production record was changed.`);

  return (
    <div className="min-h-screen bg-[#02060c] pb-[calc(7.5rem+env(safe-area-inset-bottom))] text-slate-100">
      <ModeBar title="Connections" subtitle="People, businesses, groups and events" />

      <main className="mx-auto max-w-6xl px-4 py-5">
        <section className="overflow-hidden rounded-[2rem] border border-cyan-400/15 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_35%),linear-gradient(145deg,#07111f,#03070d)] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">SYNC briefing</p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-white">Your network, without the clutter.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                You have three unanswered invitations, one event awaiting payment status, and a new business connection opportunity.
              </p>
            </div>
            <Icon>◎</Icon>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat value={briefing.invites} label="Invites" note="Need your response" />
            <Stat value={briefing.businesses} label="Rolodex" note="Saved businesses" />
            <Stat value={briefing.groups} label="Groups" note="Active memberships" />
            <Stat value={briefing.actions} label="Actions" note="Payment or calendar" />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button primary onClick={() => demo("SYNC prepared your invitation review")}>Review invitations</Button>
            <Button onClick={() => nav("/customer/business-cards")}>Open business rolodex</Button>
            <Button onClick={() => demo("Calendar connection setup opened")}>Sync all calendars</Button>
          </div>
        </section>

        {notice ? (
          <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">
            {notice}
          </div>
        ) : null}

        <div className="mt-5 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={activeTab === tab
                ? "shrink-0 rounded-full bg-white px-4 py-2 text-xs font-black text-slate-950"
                : "shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-bold text-slate-400"}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <ActionCard
            title="People connections"
            body="Friend-style connections stay separate from your professional rolodex. Accept a person first, then choose whether to introduce selected businesses."
            badge="Private by default"
          >
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-cyan-300 to-blue-600 font-black text-slate-950">BR</div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white">Brandon Ritter</div>
                  <div className="text-xs text-slate-400">2 mutual connections · Montgomery area</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button primary onClick={() => demo("Personal connection accepted; business sharing remains optional")}>Accept</Button>
                <Button onClick={() => demo("Business introduction choices opened")}>Accept + choose businesses</Button>
                <Button onClick={() => demo("Connection request declined")}>Decline</Button>
              </div>
            </div>
          </ActionCard>

          <ActionCard
            title="Business rolodex"
            body="Follow a business, become a customer, request service directly, or use Marketplace. Owners control what customers and followers can see."
            badge="Separate relationship"
          >
            <div className="space-y-3">
              <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] p-4">
                <div className="text-sm font-bold text-white">A connection may already solve your request</div>
                <p className="mt-1 text-xs leading-5 text-slate-400">Brandon Ritter has a tree-service business available for direct requests.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button primary onClick={() => demo("Direct business request prepared")}>Go direct</Button>
                  <Button onClick={() => nav("/customer/new-request")}>Use Marketplace</Button>
                </div>
              </div>
              <button type="button" onClick={() => nav("/customer/business-cards")} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left">
                <div className="font-bold text-white">Open saved businesses</div>
                <div className="mt-1 text-xs text-slate-400">Existing business-card rolodex remains available.</div>
              </button>
            </div>
          </ActionCard>

          <ActionCard
            title="Organizations and groups"
            body="Join by invitation, request approval once, or use a 30-day code. Verified organizations can broadcast relevant events; random mass messaging is restricted."
            badge="Trust controls"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-sm font-bold text-white">WSL Alabama</div>
                <div className="mt-1 text-xs text-slate-400">Verified organization · Sports sanction</div>
                <div className="mt-3 flex gap-2"><Button primary onClick={() => demo("Membership request prepared")}>Request</Button><Button onClick={() => demo("Join-code entry opened")}>Use code</Button></div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-sm font-bold text-white">Team A Softball</div>
                <div className="mt-1 text-xs text-slate-400">USSSA · GSL · Local leagues</div>
                <div className="mt-3 text-xs leading-5 text-slate-500">One active request per group. Denied requests enter a cooldown; blocked users cannot re-request.</div>
              </div>
            </div>
          </ActionCard>

          <ActionCard
            title="Group announcements and events"
            body="The group feed is announcement-only. Members may acknowledge with a like, but responses happen through the event action card or direct message link."
            badge="Action first"
          >
            <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.05] p-4">
              <div className="text-sm font-black text-white">Church event scheduled</div>
              <div className="mt-1 text-xs text-slate-300">August 11, 2026 · 6:00 PM · Main sanctuary</div>
              <p className="mt-3 text-xs leading-5 text-slate-400">Confirming removes the request from Needs Action and adds the authoritative event to your calendar. Private reminders and notes remain yours.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button primary onClick={() => demo("Event confirmed and prepared for calendar")}>Confirm</Button>
                <Button onClick={() => demo("Event details opened")}>View details</Button>
                <Button onClick={() => demo("Announcement acknowledged")}>Like</Button>
              </div>
            </div>
          </ActionCard>

          <ActionCard
            title="Calendar connections"
            body="SyncWorks remains authoritative for shared event details. Users control private reminders, visibility and personal notes. Important organizer changes create structured notices."
            badge="Planned integration"
          >
            <div className="grid grid-cols-3 gap-2">
              {["Google", "Outlook", "iOS"].map((name) => (
                <button key={name} type="button" onClick={() => demo(`${name} Calendar connection selected`)} className="min-h-20 rounded-2xl border border-white/10 bg-white/[0.03] px-2 text-xs font-bold text-slate-200">
                  <span className="mx-auto mb-2 block text-xl">□</span>{name}
                </button>
              ))}
            </div>
            <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-400">
              Event addresses will support one-tap map launch and later travel, traffic and weather planning. This preview does not yet connect external calendars or maps.
            </div>
          </ActionCard>

          <ActionCard
            title="Safety, roles and continuity"
            body="Owners must appoint a successor before leaving or closing an active organization. Closed and inactive groups remain auditable and can be reclaimed through restricted platform administration."
            badge="Governance"
          >
            <ul className="space-y-2 text-xs leading-5 text-slate-400">
              <li>• Owner, admin, organizer, financial admin, moderator, leader and member permissions remain separate.</li>
              <li>• Payment visibility is limited to authorized event and financial administrators.</li>
              <li>• Guardian-mediated messaging protects dependent and minor profiles.</li>
              <li>• Explicit-language detection can warn the sender, hold a message, or flag it for moderation.</li>
              <li>• Verification, inactivity and suspicious broadcast activity feed private administrative review.</li>
            </ul>
          </ActionCard>

          <ActionCard
            title="Connect by code"
            body="The existing scoped-access code flow remains available for employees, tenants and investors while Connections expands to organizations and groups."
          >
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => nav("/employee/settings?return=/connect")}>Employee code</Button>
              <Button onClick={() => nav("/tenant/settings?return=/connect")}>Tenant code</Button>
              <Button onClick={() => nav("/investor/settings?return=/connect")}>Investor code</Button>
            </div>
          </ActionCard>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/[0.07] p-4 text-xs leading-5 text-amber-100/80">
          Build scope: frontend Connections foundation only. The dashboard describes intended permissions and workflows but does not yet provide backend persistence, live membership requests, messaging, verification, calendar integration, payments, maps, moderation automation or notifications.
        </div>
      </main>
    </div>
  );
}
