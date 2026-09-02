import React, { useMemo, useState } from "react";
import { CalendarDays, ChevronRight, CircleDollarSign, CloudSun, Dumbbell, Mail, MapPinned, Menu, Mic2, ReceiptText, Search, ShoppingBag, Sparkles, Utensils, UserRound, Wrench, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./CustomerMobileHome.css";

const list = (value) => (Array.isArray(value) ? value : []);
const upper = (value) => String(value || "NEW").toUpperCase();

function titleFor(ticket) {
  return ticket?.taxonomy_label || ticket?.category_label || ticket?.service_category_label || ticket?.display_title || ticket?.title || "Service request";
}

const MORE = [
  ["Store", "Shop products recommended from tasks, projects, Health and household needs.", "/customer/store"],
  ["Marketplace & services", "Find providers, create requests and track service work.", "/customer/marketplace"],
  ["Invoices & payments", "Review provider invoices, due dates and secure payments.", "/customer/invoices"],
  ["Health & nutrition", "Training, meals, recovery and progress.", "/customer/health"],
  ["Money", "Bills, budgets, accounts and financial planning.", "/customer/finance"],
  ["SYNC Assistant", "Your paid briefing and connected-life action layer.", "/sync"],
  ["EDGE", "Prediction-market research and paper trading.", "/customer/edge"],
  ["Connections", "Connect calendar, email and other apps.", "/customer/settings"],
  ["Plans & features", "See pricing and why each paid feature may be useful.", "/customer/plans"],
];

function QuickIntent({ icon: Icon, label, onClick, primary = false }) {
  return <button type="button" onClick={onClick} className={`min-w-[104px] rounded-2xl border p-3 text-left ${primary ? "border-cyan-300/35 bg-gradient-to-br from-cyan-500/18 to-violet-500/10" : "border-white/10 bg-white/[.025]"}`}><Icon className={`h-4 w-4 ${primary ? "text-cyan-200" : "text-slate-300"}`} /><div className="mt-2 text-[10px] font-black leading-4 text-white">{label}</div></button>;
}

export default function CustomerMobileHome({
  displayName,
  profilePhotoUrl,
  tickets,
  invoices,
  openCount,
  totalDue,
  loading,
  onNewRequest,
  onOpenTicket,
  onOpenRequests,
  onOpenCalendar,
  onOpenMessages,
  onOpenInvoices,
  onOpenMoney,
  onOpenHealth,
  onOpenAudioSummary,
}) {
  const nav = useNavigate();
  const [query, setQuery] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);

  const active = useMemo(() => list(tickets).filter((ticket) => !["COMPLETED", "PAID", "CLOSED", "CANCELLED"].includes(upper(ticket?.status))).slice(0, 2), [tickets]);
  const nextScheduled = useMemo(() => list(tickets).find((ticket) => ticket?.scheduled_start || ticket?.scheduled_at || ticket?.schedule_time || ticket?.appointment_at) || null, [tickets]);
  const dueCount = list(invoices).filter((item) => !["PAID", "VOID"].includes(upper(item?.derived_state || item?.status))).length;

  function submitSearch(event) {
    event.preventDefault();
    const clean = query.trim();
    nav(clean ? `/customer/new-request?query=${encodeURIComponent(clean)}` : "/customer/new-request");
  }

  return (
    <section className="customer-mobile-cockpit lg:hidden">
      <div className="customer-mobile-hero p-4">
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="customer-mobile-brand">SyncWorks Personal</div>
              <h1 className="mt-1 text-[24px] font-black tracking-tight text-white">Hey {displayName}</h1>
              <p className="mt-1 text-[12px] text-slate-400">What do you need handled today?</p>
            </div>
            <div className="flex shrink-0 items-start gap-2">
              <button type="button" onClick={() => nav("/profile")} className="grid h-[58px] w-[58px] place-items-center overflow-hidden rounded-2xl border border-cyan-300/25 bg-slate-950/70 shadow-[0_0_24px_rgba(34,211,238,.12)]" aria-label="Open profile">
                {profilePhotoUrl ? <img src={profilePhotoUrl} alt={`${displayName} profile`} className="h-full w-full object-cover" /> : <UserRound className="h-5 w-5 text-cyan-200" />}
              </button>
              <button type="button" onClick={() => setMoreOpen(true)} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[.04] text-slate-200" aria-label="Open more"><Menu className="h-5 w-5" /></button>
            </div>
          </div>

          <form onSubmit={submitSearch} className="mt-4 flex gap-2">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-cyan-300/20 bg-slate-950/80 px-3"><Search className="h-4 w-4 shrink-0 text-cyan-300" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Plumber, lawn care, cleaning…" className="min-w-0 flex-1 bg-transparent py-3 text-[13px] text-white outline-none placeholder:text-slate-600" /></label>
            <button type="submit" className="grid w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white" aria-label="Find service"><Wrench className="h-5 w-5" /></button>
          </form>
        </div>
      </div>

      <div className="-mx-3 mt-3 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2">
          <QuickIntent icon={Sparkles} label="Book service" primary onClick={onNewRequest} />
          <QuickIntent icon={ShoppingBag} label="Shop products" onClick={() => nav("/customer/store")} />
          <QuickIntent icon={Utensils} label="Food nearby" onClick={() => nav("/customer/discover?category=FOOD")} />
          <QuickIntent icon={ShoppingBag} label="Shops nearby" onClick={() => nav("/customer/discover?category=RETAIL")} />
          <QuickIntent icon={CloudSun} label="Weather" onClick={() => nav("/customer/weather")} />
          <QuickIntent icon={MapPinned} label="Traffic" onClick={() => nav("/customer/traffic")} />
          <QuickIntent icon={Mic2} label="Play briefing" onClick={onOpenAudioSummary} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button type="button" onClick={onOpenRequests} className="rounded-2xl border border-white/10 bg-white/[.025] p-3 text-left"><Wrench className="h-4 w-4 text-cyan-300" /><div className="mt-2 text-[9px] font-black uppercase tracking-wider text-slate-500">Requests</div><div className="mt-0.5 text-lg font-black text-white">{loading ? "…" : openCount}</div><div className="text-[9px] text-slate-500">active</div></button>
        <button type="button" onClick={onOpenCalendar} className="rounded-2xl border border-white/10 bg-white/[.025] p-3 text-left"><CalendarDays className="h-4 w-4 text-violet-300" /><div className="mt-2 text-[9px] font-black uppercase tracking-wider text-slate-500">Next</div><div className="mt-0.5 truncate text-[11px] font-black text-white">{nextScheduled ? titleFor(nextScheduled) : "No event"}</div><div className="text-[9px] text-slate-500">schedule</div></button>
        <button type="button" onClick={onOpenInvoices} className="rounded-2xl border border-white/10 bg-white/[.025] p-3 text-left"><CircleDollarSign className="h-4 w-4 text-amber-300" /><div className="mt-2 text-[9px] font-black uppercase tracking-wider text-slate-500">Due</div><div className="mt-0.5 text-[12px] font-black text-white">{dueCount ? `${dueCount} item${dueCount === 1 ? "" : "s"}` : "$0"}</div><div className="text-[9px] text-slate-500">{Number(totalDue || 0) > 0 ? `${Number(totalDue).toLocaleString(undefined,{style:"currency",currency:"USD"})}` : "clear"}</div></button>
      </div>

      {active.length ? <div className="mt-4"><div className="mb-2 flex items-center justify-between"><h2 className="text-[13px] font-black text-white">Service activity</h2><button type="button" onClick={onOpenRequests} className="text-[10px] font-black text-cyan-300">View all</button></div><div className="space-y-2">{active.map((ticket) => <button key={ticket.id} type="button" onClick={() => onOpenTicket(ticket.id)} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-3 text-left"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-cyan-500/10 text-cyan-300"><Wrench className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-black text-white">{titleFor(ticket)}</span><span className="block text-[9px] uppercase tracking-wider text-slate-500">{upper(ticket.status).replaceAll("_", " ")}</span></span><ChevronRight className="h-4 w-4 text-slate-600" /></button>)}</div></div> : null}

      <div className="mt-4"><div className="mb-2 flex items-center justify-between"><h2 className="text-[13px] font-black text-white">Tools</h2><button type="button" onClick={() => setMoreOpen(true)} className="text-[10px] font-black text-cyan-300">View all</button></div><div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
        {[[ShoppingBag,"Store",()=>nav("/customer/store")],[CalendarDays,"Calendar",onOpenCalendar],[Mail,"Inbox",onOpenMessages],[ReceiptText,"Invoices",onOpenInvoices],[Dumbbell,"Health",onOpenHealth],[CircleDollarSign,"Money",onOpenMoney],[Sparkles,"EDGE",()=>nav("/customer/edge")]].map(([Icon,label,action]) => <button key={label} type="button" onClick={action} className="min-w-[86px] rounded-2xl border border-white/10 bg-white/[.025] p-3 text-left"><Icon className="h-4 w-4 text-cyan-300" /><div className="mt-2 text-[10px] font-black text-white">{label}</div></button>)}
      </div></div>

      <button type="button" onClick={() => nav("/customer/plans")} className="mt-4 flex w-full items-center gap-3 rounded-[1.3rem] border border-violet-400/15 bg-violet-500/[.04] p-3.5 text-left"><span className="min-w-0 flex-1"><span className="block text-[12px] font-black text-white">What can SyncWorks do for me?</span><span className="mt-0.5 block text-[10px] leading-4 text-slate-500">Compare free and paid features, pricing and real benefits.</span></span><ChevronRight className="h-4 w-4 shrink-0 text-violet-300" /></button>

      {moreOpen ? <div className="fixed inset-0 z-[220] bg-black/70 backdrop-blur-sm" onMouseDown={() => setMoreOpen(false)}><aside className="absolute inset-y-0 right-0 w-[88%] max-w-sm overflow-y-auto border-l border-cyan-300/15 bg-[#020817] p-4" onMouseDown={(e) => e.stopPropagation()}><div className="flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">SyncWorks</div><h2 className="mt-1 text-xl font-black text-white">Everything else</h2></div><button type="button" onClick={() => setMoreOpen(false)} className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10"><X className="h-5 w-5" /></button></div><div className="mt-4 space-y-2">{MORE.map(([title,body,url]) => <button key={title} type="button" onClick={() => nav(url)} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-3 text-left"><span className="min-w-0 flex-1"><span className="block text-[12px] font-black text-white">{title}</span><span className="mt-0.5 block text-[10px] leading-4 text-slate-500">{body}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-slate-600" /></button>)}</div></aside></div> : null}
    </section>
  );
}
