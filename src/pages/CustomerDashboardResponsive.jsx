import React, { useEffect, useMemo, useState } from "react";
import { Home, Inbox, LayoutGrid, MoreHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import CustomerDashboard from "./CustomerDashboard";
import CustomerMobileHome from "../components/customer/CustomerMobileHome";
import SyncAssistantStickyDock from "../components/sync/SyncAssistantStickyDock";

function safeList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function firstName(user) {
  const name = String(user?.first_name || user?.name || "").trim();
  if (name) return name.split(/\s+/)[0];
  const email = String(user?.email || "").trim();
  return email ? email.split("@")[0] : "there";
}

export default function CustomerDashboardResponsive() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dockOpen, setDockOpen] = useState(false);

  async function load() {
    setLoading(true);
    const [ticketResult, invoiceResult] = await Promise.allSettled([
      api.get("/tickets/"),
      api.get("/cash-fee-invoices/"),
    ]);
    setTickets(ticketResult.status === "fulfilled" ? safeList(ticketResult.value?.data) : []);
    setInvoices(invoiceResult.status === "fulfilled" ? safeList(invoiceResult.value?.data) : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const openTickets = useMemo(() => tickets.filter((item) => !["COMPLETED", "CLOSED", "CANCELLED", "PAID"].includes(String(item?.status || "").toUpperCase())), [tickets]);
  const dueInvoices = useMemo(() => invoices.filter((item) => !["PAID", "VOID"].includes(String(item?.status || "").toUpperCase())), [invoices]);
  const totalDue = useMemo(() => dueInvoices.reduce((sum, item) => sum + Number(item?.amount || item?.total || Number(item?.amount_cents || 0) / 100 || 0), 0), [dueInvoices]);

  function playBriefing() {
    setDockOpen(true);
    window.setTimeout(() => window.dispatchEvent(new CustomEvent("sync-assistant:play-briefing")), 30);
  }

  return (
    <>
      <div className="lg:hidden min-h-dvh bg-[#020617] px-3 pb-24 pt-3 text-slate-100">
        <CustomerMobileHome
          displayName={firstName(user)}
          tickets={tickets}
          invoices={invoices}
          openCount={openTickets.length}
          totalDue={totalDue}
          loading={loading}
          onRefresh={load}
          onNewRequest={() => nav("/customer/new-request")}
          onOpenTicket={(id) => nav(`/tickets/${id}`)}
          onOpenRequests={() => nav("/customer/tickets")}
          onOpenCalendar={() => nav("/calendar")}
          onOpenMessages={() => nav("/customer/inbox")}
          onOpenMoney={() => nav("/customer/finance")}
          onOpenHealth={() => nav("/customer/health")}
          onOpenAudioSummary={playBriefing}
          onOpenMore={() => nav("/customer/settings")}
        />

        <nav className="fixed inset-x-3 bottom-[max(.45rem,env(safe-area-inset-bottom))] z-[150] grid grid-cols-5 items-end rounded-[1.4rem] border border-white/10 bg-[#030817]/95 px-2 py-2 shadow-[0_-10px_50px_rgba(2,6,23,.8)] backdrop-blur-2xl">
          <button type="button" onClick={() => nav("/customer")} className="flex flex-col items-center gap-1 text-[9px] font-black text-cyan-200"><Home className="h-4 w-4" />Home</button>
          <button type="button" onClick={() => nav("/customer/marketplace")} className="flex flex-col items-center gap-1 text-[9px] font-black text-slate-400"><LayoutGrid className="h-4 w-4" />Services</button>
          <button type="button" onClick={() => setDockOpen(true)} className="mx-auto -mt-7 flex flex-col items-center gap-1 text-[9px] font-black text-cyan-200" aria-label="Open SYNC Assistant"><span className="grid h-12 w-12 place-items-center rounded-full border border-cyan-300/60 bg-[radial-gradient(circle_at_36%_30%,rgba(56,189,248,.3),rgba(2,6,23,.96)_64%)] text-xl font-black italic text-cyan-300 shadow-[0_0_28px_rgba(34,211,238,.4),0_0_44px_rgba(124,58,237,.18)]">S</span>SYNC</button>
          <button type="button" onClick={() => nav("/customer/inbox")} className="flex flex-col items-center gap-1 text-[9px] font-black text-slate-400"><Inbox className="h-4 w-4" />Inbox</button>
          <button type="button" onClick={() => nav("/customer/settings")} className="flex flex-col items-center gap-1 text-[9px] font-black text-slate-400"><MoreHorizontal className="h-4 w-4" />More</button>
        </nav>

        {dockOpen ? <SyncAssistantStickyDock displayName={firstName(user)} /> : null}
      </div>
      <div className="hidden lg:block"><CustomerDashboard /></div>
    </>
  );
}
