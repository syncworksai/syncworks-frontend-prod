import React, { useState } from "react";
import ModeBar from "../components/ModeBar";
import TicketsBoard from "./TicketsBoard";
import NotificationsPanel from "../components/NotificationsPanel";
import TodoList from "../components/TodoList";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "tickets", label: "Tickets" },
  { id: "team", label: "Team" },
  { id: "invoices", label: "Invoices" },
  { id: "settings", label: "Settings" },
];

export default function Dashboard() {
  const [tab, setTab] = useState("overview");

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar title="CEO / SBO Dashboard" subtitle="Run your business: tickets, team, schedule, and money." />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex gap-2 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                "text-xs rounded-xl px-3 py-2 border " +
                (tab === t.id
                  ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-200"
                  : "bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-200")
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" ? (
          <div className="grid lg:grid-cols-3 gap-4">
            <TodoList scope="sbo" title="CEO To-Do" subtitle="Your operational checklist." />
            <div className="lg:col-span-2">
              <NotificationsPanel
                title="Company Inbox"
                subtitle="Ticket updates, assignments, announcements, billing alerts."
              />
            </div>
          </div>
        ) : null}

        {tab === "tickets" ? <TicketsBoard title="Company Tickets" /> : null}

        {tab === "team" ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
            <div className="font-semibold">Team</div>
            <div className="text-sm text-slate-400 mt-2">
              Next: wire your existing Team system UI here (permissions toggles, invites, fire/rehire, roles).
            </div>
          </div>
        ) : null}

        {tab === "invoices" ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
            <div className="font-semibold">Invoices</div>
            <div className="text-sm text-slate-400 mt-2">
              Next: show invoices by ticket, paid/unpaid, cash-only ratio, card failures.
            </div>
          </div>
        ) : null}

        {tab === "settings" ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
            <div className="font-semibold">Business Settings</div>
            <div className="text-sm text-slate-400 mt-2">
              Next: business profile, address/ZIP, service area, categories, staff permissions.
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
