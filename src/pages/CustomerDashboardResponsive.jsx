import React, { useEffect, useMemo, useState } from "react";
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

  return (
    <>
      <div className="lg:hidden min-h-dvh bg-[#020617] px-3 pb-28 pt-3 text-slate-100">
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
          onOpenAudioSummary={() => window.dispatchEvent(new CustomEvent("sync-assistant:play-briefing"))}
          onOpenMore={() => nav("/customer/settings")}
        />
        <SyncAssistantStickyDock displayName={firstName(user)} />
      </div>
      <div className="hidden lg:block"><CustomerDashboard /></div>
    </>
  );
}
