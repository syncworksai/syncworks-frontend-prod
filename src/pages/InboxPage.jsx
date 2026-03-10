// src/pages/InboxPage.jsx
import React from "react";
import ModeBar from "../components/ModeBar";
import NotificationsPanel from "../components/NotificationsPanel";

export default function InboxPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar title="Inbox" subtitle="Notifications • Ticket updates • Broadcasts" />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <NotificationsPanel title="Inbox" subtitle="Latest activity for your account & business context." />
      </main>
    </div>
  );
}
