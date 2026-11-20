import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  WalletCards,
  XCircle,
  Settings2,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../../api/client";
import { getInvoiceCenter, getBillingAutomationSettings } from "../../api/invoices";
import PaymentMigrationChecklist from "../../components/payments/PaymentMigrationChecklist";
import DashboardShell from "../../components/dashboard/DashboardShell";
import GlassCard from "../../components/dashboard/GlassCard";
import SidebarNav from "../../components/dashboard/SidebarNav";
import { BarChart3, ClipboardList, LayoutDashboard, FileText, TrendingUp } from "lucide-react";
import "./SboFinanceSterling.css";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}


function statusLabel(value) {
  return String(value || "none").replaceAll("_", " ");
}

function StatusPill({ ok, children, warning = false }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]",
        ok
          ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
          : warning
          ? "border-amber-400/25 bg-amber-400/10 text-amber-200"
          : "border-rose-400/25 bg-rose-400/10 text-rose-200"
      )}
    >
      {ok ? (
        <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
      ) : warning ? (
        <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />
      ) : (
        <XCircle aria-hidden="true" className="h-3.5 w-3.5" />
      )}
      {children}
    </span>
  );
}

function ReadinessRow({ icon, title, description, ok, actionLabel, onAction, busy }) {
  return (
    <div
      className={cx(
        "flex flex-col gap-4 rounded-3xl border p-4 sm:flex-row sm:items-center sm:justify-between",
        ok
          ? "border-emerald-500/20 bg-emerald-500/[0.07]"
          : "border-amber-500/25 bg-amber-500/[0.08]"
      )}
    >
      <div className="flex min-w-0 gap-3">
        <div
          className={cx(
            "grid h-11 w-11 shrink-0 place-items-center rounded-2xl border",
            ok
              ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
              : "border-amber-400/25 bg-amber-400/10 text-amber-200"
          )}
        >
          {React.createElement(icon, {
            "aria-hidden": true,
            className: "h-5 w-5",
          })}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-black text-white">{title}</div>
            <StatusPill ok={ok} warning={!ok}>
              {ok ? "Ready" : "Action needed"}
            </StatusPill>
          </div>
          <div className="mt-1 text-sm leading-6 text-slate-400">
            {description}
          </div>
        </div>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={onAction}
        className={cx(
          "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-black disabled:opacity-50",
          ok
            ? "border-slate-700 bg-slate-900 text-slate-200"
            : "border-cyan-300/30 bg-cyan-500/15 text-cyan-100"
        )}
      >
        {busy ? (
          <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <ExternalLink aria-hidden="true" className="h-4 w-4" />
        )}
        {actionLabel}
      </button>
    </div>
  );
}

export default function SboFinance() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [billingStatus, setBillingStatus] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [connect, setConnect] = useState(null);
  const [invoiceCenter,setInvoiceCenter]=useState(null);
  const [automation,setAutomation]=useState(null);
  const [invoiceLoading,setInvoiceLoading]=useState(true);
  const [invoiceError,setInvoiceError]=useState("");
  const [showSetup,setShowSetup]=useState(false);

  const [financeTab,setFinanceTab]=useState("overview");

  const navItems = [
    {label:"Business overview",icon:"⌂",onClick:()=>navigate("/sbo")},
    {label:"Finance overview",icon:"$",active:financeTab==="overview",onClick:()=>{setFinanceTab("overview");setShowSetup(false);}},
    {label:"Needs attention",icon:"!",onClick:()=>navigate("/sbo/invoices?state=OVERDUE")},
    {label:"Invoices",icon:"▤",onClick:()=>navigate("/sbo/invoices")},
    {label:"Paid invoices",icon:"✓",onClick:()=>navigate("/sbo/invoices?state=PAID")},
    {label:"Archived / void",icon:"◌",onClick:()=>navigate("/sbo/invoices?state=VOID")},
    {label:"Billing automation",icon:"◷",onClick:()=>navigate("/sbo/settings/billing-automation")},
    {label:"Catalog",icon:"▦",onClick:()=>navigate("/sbo/catalog")},
    {label:"Profit & Cash",icon:"◫",onClick:()=>navigate("/sbo/finance-intelligence")},
    {label:"Reports",icon:"↗",onClick:()=>navigate("/sbo/reports")},
    {label:"Payment settings",icon:"⚙",active:financeTab==="readiness",onClick:()=>{setFinanceTab("readiness");setShowSetup(false);}},
  ];  const loadAll = useCallback(async () => {
    setLoading(true);
    setInvoiceLoading(true);
    setError("");

    const results = await Promise.allSettled([
      api.get("/billing/status/"),
      api.get("/billing/subscription/status/"),
      api.get("/connect/express/status/"),
      getInvoiceCenter(),
      getBillingAutomationSettings(),
    ]);
    setInvoiceCenter(results[3].status==="fulfilled"?results[3].value:null);
    setAutomation(results[4].status==="fulfilled"?results[4].value:null);
    setInvoiceError(results[3].status==="rejected"?"Invoice activity could not be loaded. Open Invoices to retry.":"");
    setInvoiceLoading(false);

    setBillingStatus(
      results[0].status === "fulfilled" ? results[0].value?.data || null : null
    );
    setSubscription(
      results[1].status === "fulfilled" ? results[1].value?.data || null : null
    );
    setConnect(
      results[2].status === "fulfilled" ? results[2].value?.data || null : null
    );

    const failures = results.slice(0,3).filter((result) => result.status === "rejected");
    if (failures.length) {
      const first = failures[0]?.reason;
      setError(
        first?.response?.data?.detail ||
          "Some payment status information could not be loaded."
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const subscriptionActive = !!subscription?.subscription_active;
  const cardReady = !!(
    billingStatus?.stripe_setup_complete ||
    billingStatus?.has_payment_method ||
    billingStatus?.payment_method_ready
  );
  const connectReady = !!(
    connect?.onboarding_completed &&
    connect?.charges_enabled &&
    connect?.payouts_enabled
  );

  const readinessScore = [subscriptionActive, cardReady, connectReady].filter(
    Boolean
  ).length;
  const readinessPercent = Math.round((readinessScore / 3) * 100);
  const invoiceSummary=invoiceCenter?.summary||{};
  const invoiceRows=Array.isArray(invoiceCenter?.results)?invoiceCenter.results:[];
  const readyToBill=Array.isArray(invoiceCenter?.ready_to_bill)?invoiceCenter.ready_to_bill:[];
  const overdueRows=invoiceRows.filter(row=>String(row.derived_state||row.state||"").toUpperCase()==="OVERDUE");
  const attentionRows=[
    ...overdueRows.map(row=>({kind:"overdue",id:row.id,name:row.customer_name||"Customer",detail:row.title||"Invoice",date:row.due_date,amount:row.balance_due})),
    ...readyToBill.map(row=>({kind:"ready",id:row.ticket_id||row.ticket||row.id,name:row.customer_name||row.customer||"Customer",detail:row.title||row.service_title||"Completed work",date:row.completed_at||row.completion_date||null,amount:null})),
  ].slice(0,7);
  const daysSince=(date)=>{if(!date)return null;const timestamp=Date.parse(date);return Number.isFinite(timestamp)?Math.max(0,Math.floor((Date.now()-timestamp)/86400000)):null;};
  const money=(value)=>value===null||value===undefined?"—":Number(value).toLocaleString("en-US",{style:"currency",currency:"USD"});
  const setupReady=!loading && readinessScore===3;
  const autoReady=automation?.auto_send_invoices && automation?.auto_reminders_enabled;


  const requirementsDue = useMemo(() => {
    const requirements = connect?.requirements_due || {};
    return [
      ...(requirements.currently_due || []),
      ...(requirements.past_due || []),
      ...(requirements.pending_verification || []),
    ];
  }, [connect]);

  async function startSubscription() {
    setBusyAction("subscription");
    setError("");
    setMessage("");

    try {
      const response = await api.post("/billing/subscription/subscribe/", {
        modules: ["SBO"],
      });
      const url = response?.data?.url;
      if (!url) throw new Error("Checkout URL missing.");
      window.location.assign(url);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail ||
          requestError?.response?.data?.error ||
          "Unable to start Business subscription checkout."
      );
    } finally {
      setBusyAction("");
    }
  }

  async function cancelSubscription() {
    setBusyAction("cancel");
    setError("");
    setMessage("");

    try {
      await api.post("/billing/subscription/cancel/");
      setMessage("Subscription cancellation is scheduled for the end of the current period.");
      await loadAll();
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail ||
          "Unable to update the subscription."
      );
    } finally {
      setBusyAction("");
    }
  }

  async function setupCard() {
    setBusyAction("card");
    setError("");
    setMessage("");

    try {
      const response = await api.post("/billing/setup-card/");
      const url = response?.data?.url;
      if (!url) throw new Error("Setup URL missing.");
      window.location.assign(url);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail ||
          "Unable to start payment-method setup."
      );
    } finally {
      setBusyAction("");
    }
  }

  const openFinanceTab=(tab)=>setFinanceTab(tab);

  async function startConnect() {
    setBusyAction("connect");
    setError("");
    setMessage("");

    try {
      const response = await api.post("/connect/express/start/");
      const url = response?.data?.url;
      if (!url) throw new Error("Connect onboarding URL missing.");
      window.location.assign(url);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail ||
          "Unable to start Stripe Connect onboarding."
      );
    } finally {
      setBusyAction("");
    }
  }

  return (
    <DashboardShell
      className="sw-sbo-finance-shell"
      title="Finance"
      subtitle="Subscriptions, payouts, payment readiness, and fee reconciliation"
      modeBarTitle="Finance"
      modeBarSubtitle="Business plan · Stripe Connect · invoices · platform fees"
      bottomNavItems={[
        { label: "Home", icon: "⌂", onClick: () => navigate("/sbo") },
        { label: "Requests", icon: "▤", onClick: () => navigate("/tickets?view=new") },
        { label: "Reports", icon: "↗", onClick: () => navigate("/sbo/reports") },
    { label: "Profit & Cash", icon: "▦", onClick: () => navigate("/sbo/finance-intelligence") },
        { label: "Settings", icon: "⚙", onClick: () => navigate("/sbo/settings?return=%2Fsbo") },
      ]}
      bottomCenterAction={{
        label: "New",
        onClick: () => navigate("/tickets?view=new"),
      }}
      rightActions={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate("/sbo")}
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm font-black text-slate-200"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Dashboard
          </button>
          <button
            type="button"
            onClick={loadAll}
            disabled={loading}
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-500/15 px-4 text-sm font-black text-cyan-100 disabled:opacity-50"
          >
            <RefreshCw
              aria-hidden="true"
              className={cx("h-4 w-4", loading && "animate-spin")}
            />
            Refresh
          </button>
        </div>
      }
    >
      <div className="sw-sbo-finance-cockpit grid min-h-0 gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
        <SidebarNav title="Business OS" subtitle="Finance" items={navItems} />
        <div className="sw-sbo-finance-center min-w-0 space-y-4">
          <nav aria-label="Finance workspace sections" className="sw-business-compact-nav flex flex-wrap gap-2 rounded-xl border border-cyan-300/20 bg-slate-950/75 p-2 backdrop-blur-xl">
            {[
              ["overview","Overview"],
              ["readiness","Payment readiness"],
              ["payments","Plans & payouts"],
              ["reconciliation","Fee reconciliation"]
            ].map(([id,label])=><button key={id} type="button" aria-current={financeTab===id?"page":undefined} onClick={()=>setFinanceTab(id)} className={`min-h-10 rounded-lg border px-3 text-xs font-semibold transition ${financeTab===id?"border-cyan-300/50 bg-cyan-500/20 text-cyan-50":"border-slate-700/70 bg-slate-900/40 text-slate-300 hover:border-cyan-300/30"}`}>{label}</button>)}
            <button type="button" onClick={()=>navigate("/sbo/invoices")} className="min-h-10 rounded-lg border border-slate-700/70 px-3 text-xs font-semibold text-slate-300">Invoices →</button>
          </nav>
          {financeTab==="overview" && <section className="sw-sbo-finance-overview" aria-label="Finance overview">
            <header className="sw-sbo-finance-hero"><div><span className="sw-sbo-finance-kicker">YOUR OFFICE · FINANCE</span><h1>Finance command center</h1><p>Payment readiness, receivables and accounting access in one place.</p></div><button type="button" onClick={loadAll} disabled={loading} aria-label="Refresh finance status"><RefreshCw size={17} className={loading?"animate-spin":""}/></button></header>
            <div className="sw-sbo-finance-pulse"><div><span>PAYMENT OPERATIONS</span><p>{loading?"Loading live payment status…":readinessScore===3?"Subscriptions, billing and payouts are ready":`${3-readinessScore} of 3 payment setup requirements need attention`}</p></div><button onClick={()=>openFinanceTab("readiness")}>Review <ArrowLeft size={14} className="rotate-180"/></button></div>
            <div className="sw-sbo-finance-invoice-header">
              <div><span>INVOICING PULSE</span><h2>Receivables and job billing</h2></div>
              <button type="button" onClick={()=>setShowSetup(true)} className={setupReady?"is-ready":""} aria-label="Open finance setup"><span className="sw-sbo-finance-status-light"/> {setupReady?"Setup ready":"Setup needs attention"} <Settings2 size={15}/></button>
            </div>
            <div className="sw-sbo-finance-invoice-kpis">
              <button type="button" onClick={()=>navigate("/sbo/invoices")}><span>Outstanding</span><strong>{invoiceLoading?"—":invoiceError?"Unavailable":money(invoiceSummary.outstanding)}</strong></button>
              <button type="button" onClick={()=>navigate("/sbo/invoices?state=OVERDUE")}><span>Overdue invoices</span><strong>{invoiceLoading?"—":invoiceError?"Unavailable":(invoiceSummary.overdue_count??overdueRows.length)}</strong></button>
              <button type="button" onClick={()=>navigate("/sbo/invoices")}><span>Ready to bill</span><strong>{invoiceLoading?"—":invoiceError?"Unavailable":(invoiceSummary.ready_to_bill_count??readyToBill.length)}</strong></button>
              <button type="button" onClick={()=>navigate("/sbo/invoices?state=PAID")}><span>Paid this month</span><strong>{invoiceLoading?"—":invoiceError?"Unavailable":money(invoiceSummary.paid_this_month)}</strong></button>
            </div>
            <section className="sw-sbo-finance-attention">
              <div className="sw-sbo-finance-attention-head"><h2><AlertTriangle size={16}/> Invoices requiring attention</h2><button type="button" onClick={()=>navigate("/sbo/invoices")}>All invoices <ChevronRight size={16}/></button></div>
              {invoiceError?<p role="alert">{invoiceError}</p>:invoiceLoading?<p>Loading invoice activity…</p>:attentionRows.length?<div className="sw-sbo-finance-attention-list">{attentionRows.map((item,index)=><button type="button" key={item.kind+"-"+item.id+"-"+index} onClick={()=>navigate(item.kind==="overdue"?"/sbo/invoices?state=OVERDUE":"/sbo/invoices")}><span><strong>{item.kind==="overdue"?"PAST DUE":"READY TO INVOICE"}</strong> · {item.name}<small>{item.detail} · {daysSince(item.date)===null?"Date unavailable":item.kind==="ready"?daysSince(item.date)+" days since completion":daysSince(item.date)+" days past due"}</small></span><span>{item.amount===null?"Review":money(item.amount)}</span></button>)}</div>:<p>No overdue invoices or completed jobs awaiting billing in the loaded records.</p>}
            </section>
            <div className="sw-sbo-finance-stats">
              <button type="button" onClick={()=>openFinanceTab("readiness")}><strong>{loading?"—":readinessPercent+"%"}</strong><small>Payment readiness</small></button>
              <button type="button" onClick={()=>openFinanceTab("payments")}><strong>{connectReady?"Ready":"Review"}</strong><small>Stripe payouts</small></button>
              <button type="button" onClick={()=>openFinanceTab("reconciliation")}><strong>1%</strong><small>Platform fee policy</small></button>
            </div>
            <div className="sw-sbo-finance-actions">
              <button type="button" onClick={()=>openFinanceTab("readiness")}><ShieldCheck size={25}/><strong>Payment setup</strong><span>Subscriptions, billing card and verification</span></button>
              <button type="button" onClick={()=>openFinanceTab("payments")}><WalletCards size={25}/><strong>Plans & payouts</strong><span>Business plan and Stripe Connect</span></button>
              <button type="button" onClick={()=>openFinanceTab("reconciliation")}><CircleDollarSign size={25}/><strong>Fee reconciliation</strong><span>Cash, card and outside payments</span></button>
              <button type="button" onClick={()=>navigate("/sbo/finance-intelligence")}><BarChart3 size={25}/><strong>Profit & cash</strong><span>Expenses, job margins and forecasts</span></button>
            </div>
            <div className="sw-sbo-finance-quick"><button type="button" onClick={()=>navigate("/sbo/invoices")}><FileText size={15}/> Invoices</button><button type="button" onClick={()=>navigate("/sbo/reports")}><TrendingUp size={15}/> Reports & exports</button><button type="button" onClick={()=>navigate("/sbo")}><LayoutDashboard size={15}/> Business office</button></div>
          </section>}
          {showSetup&&<div className="sw-sbo-finance-setup-backdrop" onMouseDown={()=>setShowSetup(false)}><aside role="dialog" aria-modal="true" aria-label="Finance setup" className="sw-sbo-finance-setup-drawer" onMouseDown={e=>e.stopPropagation()}><header><h2>Finance setup</h2><button type="button" onClick={()=>setShowSetup(false)} aria-label="Close setup"><XCircle size={21}/></button></header><p>Payment readiness, billing automation, and catalog controls.</p><div className="sw-sbo-finance-setup-items">
            <button onClick={()=>{setFinanceTab("readiness");setShowSetup(false)}}><span className={setupReady?"sw-sbo-setup-green":"sw-sbo-setup-amber"}/> Stripe & billing readiness <strong>{loading?"Loading":setupReady?"Ready":"Action needed"}</strong></button>
            <button onClick={()=>navigate("/sbo/settings/billing-automation")}><span className={autoReady?"sw-sbo-setup-green":"sw-sbo-setup-amber"}/> Automated invoicing & reminders <strong>{automation?autoReady?"Enabled":"Review":"Not verified"}</strong></button>
            <button onClick={()=>navigate("/sbo/catalog")}><span className="sw-sbo-setup-amber"/> Service & parts catalog <strong>Manage</strong></button>
            <button onClick={()=>navigate("/sbo/invoices")}><span className="sw-sbo-setup-amber"/> Invoicing center <strong>Manage</strong></button>
            <button onClick={()=>navigate("/sbo/reports")}><span className="sw-sbo-setup-amber"/> Reports & archival records <strong>Open</strong></button>
           </div><p className="sw-sbo-finance-setup-help">Green reflects verified payment readiness or saved automation settings. Catalog and other integrations are never marked complete without verification.</p></aside></div>}
          {error ? <div role="alert" className="rounded-lg border border-rose-400/25 bg-rose-900/40 p-3 text-sm text-rose-100">{error}</div> : null}
          {message ? <div role="status" className="rounded-lg border border-emerald-400/25 bg-emerald-900/40 p-3 text-sm text-emerald-100">{message}</div> : null}
          <div className={financeTab==="readiness"?"sw-sbo-finance-detail space-y-3":"hidden"}>
          <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                      <div className="text-sm font-black text-emerald-100">New: Profit & Cash Workspace</div>
                      <div className="mt-1 text-xs leading-5 text-slate-300">Track labor, materials, expenses, job contribution, recorded margins, and planned cash events.</div>
                      <button type="button" onClick={() => navigate("/sbo/finance-intelligence")} className="mt-3 min-h-10 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3 text-xs font-black text-cyan-100">Open Profit & Cash →</button>
                    </div>

          <PaymentMigrationChecklist />
          <section className="relative overflow-hidden rounded-[2rem] border border-cyan-500/20 bg-slate-950/70 p-5 shadow-[0_0_60px_rgba(34,211,238,0.08)] md:p-7">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
            <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />

            <div className="relative">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
                    Payment readiness
                  </div>
                  <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
                    {readinessScore === 3
                      ? "Ready to charge customers and receive payouts"
                      : "Finish payment setup"}
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                    Business subscription, platform billing method, and Stripe Connect
                    payouts are tracked separately so each requirement is clear.
                  </p>
                </div>

                <div className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-3 text-center">
                  <div className="text-3xl font-black text-white">
                    {loading ? "..." : `${readinessPercent}%`}
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">
                    Complete
                  </div>
                </div>
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full border border-slate-800 bg-slate-950">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 transition-[width]"
                  style={{ width: `${loading ? 0 : readinessPercent}%` }}
                />
              </div>
            </div>
          </section>

          <GlassCard
            title="Setup checklist"
            subtitle="These are separate Stripe responsibilities and should all be complete."
            tone="cyan"
          >
            <div className="space-y-3">
              <ReadinessRow
                icon={BadgeCheck}
                title="Business subscription"
                description={
                  subscriptionActive
                    ? `Status: ${statusLabel(subscription?.subscription_status)}`
                    : "Activate the SyncWorks Business plan through Stripe Billing."
                }
                ok={subscriptionActive}
                actionLabel={subscriptionActive ? "Review plan" : "Subscribe"}
                busy={busyAction === "subscription"}
                onAction={
                  subscriptionActive
                    ? () => {}
                    : startSubscription
                }
              />

              <ReadinessRow
                icon={CreditCard}
                title="Platform billing method"
                description={
                  cardReady
                    ? "A payment method is available for subscriptions and platform fees."
                    : "Add a business card for recurring charges and reconciled platform fees."
                }
                ok={cardReady}
                actionLabel={cardReady ? "Card ready" : "Add card"}
                busy={busyAction === "card"}
                onAction={cardReady ? () => {} : setupCard}
              />

              <ReadinessRow
                icon={WalletCards}
                title="Stripe Connect payouts"
                description={
                  connectReady
                    ? "Charges and payouts are enabled for this business."
                    : connect?.connected
                    ? "Stripe account exists, but onboarding or verification is incomplete."
                    : "Connect a Stripe Express account to receive customer-payment payouts."
                }
                ok={connectReady}
                actionLabel={
                  connectReady
                    ? "Connected"
                    : connect?.connected
                    ? "Resume setup"
                    : "Connect Stripe"
                }
                busy={busyAction === "connect"}
                onAction={connectReady ? () => {} : startConnect}
              />
            </div>
          </GlassCard>

          </div>
          <div className={financeTab==="payments"?"sw-sbo-finance-detail space-y-3":"hidden"}>
          <div className="grid gap-5 xl:grid-cols-2">
            <GlassCard
              title="Business plan"
              subtitle="Recurring SyncWorks Business subscription."
              tone="violet"
            >
              <div className="rounded-3xl border border-slate-800 bg-slate-950/55 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-white">
                      Business Profile
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Subscription status:{" "}
                      {statusLabel(subscription?.subscription_status)}
                    </div>
                  </div>
                  <div className="text-3xl font-black text-white">$19.99</div>
                </div>

                <div className="mt-4 text-xs text-slate-400">per month</div>

                {subscription?.current_period_end ? (
                  <div className="mt-3 text-xs text-slate-400">
                    Current period ends{" "}
                    {new Date(subscription.current_period_end).toLocaleDateString()}
                  </div>
                ) : null}

                {subscriptionActive ? (
                  <button
                    type="button"
                    disabled={
                      busyAction === "cancel" ||
                      subscription?.cancel_at_period_end
                    }
                    onClick={cancelSubscription}
                    className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 text-sm font-black text-rose-200 disabled:opacity-50"
                  >
                    <RotateCcw aria-hidden="true" className="h-4 w-4" />
                    {subscription?.cancel_at_period_end
                      ? "Cancellation scheduled"
                      : "Cancel at period end"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busyAction === "subscription"}
                    onClick={startSubscription}
                    className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-violet-300/30 bg-violet-500/15 px-4 text-sm font-black text-violet-100 disabled:opacity-50"
                  >
                    <CreditCard aria-hidden="true" className="h-4 w-4" />
                    Subscribe with Stripe
                  </button>
                )}
              </div>
            </GlassCard>

            <GlassCard
              title="Stripe Connect"
              subtitle="Customer payment processing and business payouts."
              tone="emerald"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-3xl border border-slate-800 bg-slate-950/55 p-4">
                  <div className="text-xs text-slate-500">Charges</div>
                  <div className="mt-2 font-black text-white">
                    {connect?.charges_enabled ? "Enabled" : "Not enabled"}
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-950/55 p-4">
                  <div className="text-xs text-slate-500">Payouts</div>
                  <div className="mt-2 font-black text-white">
                    {connect?.payouts_enabled ? "Enabled" : "Not enabled"}
                  </div>
                </div>
              </div>

              {requirementsDue.length ? (
                <div className="mt-4 rounded-3xl border border-amber-400/25 bg-amber-400/10 p-4">
                  <div className="font-black text-amber-100">
                    Verification requirements
                  </div>
                  <div className="mt-2 text-sm text-slate-400">
                    Stripe reports {requirementsDue.length} item(s) still due or
                    pending verification.
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                disabled={busyAction === "connect" || connectReady}
                onClick={startConnect}
                className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-300/30 bg-emerald-500/15 px-4 text-sm font-black text-emerald-100 disabled:opacity-50"
              >
                <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                {connectReady
                  ? "Stripe Connect ready"
                  : connect?.connected
                  ? "Resume Connect setup"
                  : "Start Connect setup"}
              </button>
            </GlassCard>
          </div>

          </div>
          <div className={financeTab==="reconciliation"?"sw-sbo-finance-detail space-y-3":"hidden"}>
          <GlassCard
            title="Platform fee reconciliation"
            subtitle="SyncWorks tracks the 1% platform fee regardless of payment method."
            tone="amber"
          >
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/55 p-5">
                <CircleDollarSign className="h-6 w-6 text-emerald-200" />
                <div className="mt-3 font-black text-white">Stripe payments</div>
                <div className="mt-2 text-sm leading-6 text-slate-400">
                  Customer checkout and payout status flow through Stripe Connect.
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/55 p-5">
                <Banknote className="h-6 w-6 text-cyan-200" />
                <div className="mt-3 font-black text-white">External payments</div>
                <div className="mt-2 text-sm leading-6 text-slate-400">
                  Cash, check, Zelle, Venmo, Cash App, Square, and Clover still close
                  the invoice inside SyncWorks.
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/55 p-5">
                <WalletCards className="h-6 w-6 text-violet-200" />
                <div className="mt-3 font-black text-white">Cash fee invoices</div>
                <div className="mt-2 text-sm leading-6 text-slate-400">
                  Reconcile platform fees for off-platform collections without
                  charging the underlying customer twice.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/billing/cash-fee-invoices")}
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-amber-300/30 bg-amber-500/15 px-4 text-sm font-black text-amber-100"
            >
              <Banknote aria-hidden="true" className="h-4 w-4" />
              Open cash fee invoices
            </button>
          </GlassCard>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
