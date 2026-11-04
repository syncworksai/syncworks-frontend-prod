import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/client";

const BASE = "/pm-hub/lead-addons/";
const monthly = cents => (Number(cents || 0) / 100).toLocaleString("en-US", {style:"currency",currency:"USD"});
const featureOrder = ["inbox_capture", "duplicate_detection", "quick_messages",
  "ai_extraction", "automatic_acknowledgements", "follow_up_reminders"];
function discountFor(n) { return n >= 8 ? 20 : n >= 5 ? 15 : n >= 3 ? 10 : 0; }
function preview(n) { return Math.round(999 * n * (100-discountFor(n))/100); }

export default function PMLeadAddons() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [workspace, setWorkspace] = useState(null);
  const [data, setData] = useState(null);
  const [mailboxes, setMailboxes] = useState(1);
  const [choices, setChoices] = useState(["inbox_capture", "duplicate_detection", "quick_messages"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active=true;
    (async()=>{
      try{
        const r=await api.get("/pm-hub/workspaces/current/");
        if(!active)return;
        setWorkspace(r.data);
        const st=await api.get(BASE+"status/",{headers:{"X-PM-Workspace-ID":String(r.data.id)}});
        if(active){setData(st.data);if(st.data?.mailbox_limit)setMailboxes(st.data.mailbox_limit);}
      }catch(e){if(active)setError(e?.response?.data?.detail||"Couldn't load PM billing. Confirm your PM portfolio.");}
    })();
    return()=>{active=false};
  },[]);

  const founder = Boolean(data?.founder_access);
  const active = Boolean(data?.subscription_active);
  const percent = discountFor(mailboxes);
  const total = founder ? 0 : preview(mailboxes);
  const subtotal = founder ? 0 : mailboxes*999;
  function toggle(feature) {
    if(!data?.catalog?.[feature]?.available || data.catalog[feature].included)return;
    setChoices(old=>old.includes(feature)?old.filter(x=>x!==feature):[...old,feature]);
  }
  async function checkout() {
    if(!workspace?.id||founder||!data?.checkout_enabled)return;
    setBusy(true);setError("");setNotice("");
    try{
      const r=await api.post(BASE+"checkout/",{mailboxes,features:choices},
        {headers:{"X-PM-Workspace-ID":String(workspace.id)}});
      if(r.data?.url)window.location.assign(r.data.url);
      else setError(r.data?.detail||"Stripe did not return a checkout link.");
    }catch(e){setError(e?.response?.data?.detail||"Checkout could not be started. No subscription has been activated.");}
    finally{setBusy(false);}
  }
  async function portal() {
    if(!workspace?.id)return;
    setBusy(true);setError("");
    try{
      const r=await api.post(BASE+"billing-portal/",{}, {headers:{"X-PM-Workspace-ID":String(workspace.id)}});
      if(r.data?.url)window.location.assign(r.data.url);
      else setError("Could not open Stripe Billing.");
    }catch(e){setError(e?.response?.data?.detail||"Could not open your Stripe billing portal.");}
    finally{setBusy(false);}
  }
  const panel = "rounded-2xl border border-cyan-400/20 bg-[#07111f] p-4 sm:p-5";
  return <main className="min-h-screen space-y-4 bg-[#020611] px-3 py-5 pb-24 text-white sm:px-6">
    <header className={panel}>
      <p className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-300">SyncWorks · Property Management Billing</p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
        <div><h1 className="text-2xl font-black">PM Add-ons & Subscriptions</h1>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">Connect Outlook mailboxes, route inbound rental inquiries into Leads, and select the automation you need.</p></div>
        <button type="button" onClick={()=>nav("/pm/leads?connect=email")}
          className="min-h-10 rounded-xl border border-cyan-400/40 px-4 text-xs font-bold text-cyan-100">Connect inboxes</button>
      </div>
      {workspace?<p className="mt-2 text-[11px] text-cyan-200">Portfolio: {workspace.name}</p>:null}
    </header>
    {error?<div role="alert" className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</div>:null}
    {notice?<div role="status" className="rounded-xl border border-emerald-400/35 bg-emerald-400/10 p-3 text-xs text-emerald-200">{notice}</div>:null}
    {params.get("checkout")==="success"?<div className="rounded-xl border border-amber-400/35 p-3 text-xs text-amber-200">
      Stripe checkout returned. Subscription access is being verified with Stripe; a return URL alone does not activate billing or access.
      <button type="button" className="ml-2 underline" onClick={()=>window.location.reload()}>Refresh status</button>
    </div>:null}
    {params.get("checkout")==="cancelled"?<div className="rounded-xl border border-slate-600 p-3 text-xs text-slate-200">Checkout was cancelled. Nothing new was activated.</div>:null}
    {founder?<section className="rounded-2xl border border-emerald-400/35 bg-emerald-500/10 p-4">
      <div className="text-sm font-black text-emerald-200">Founder testing access · $0.00</div>
      <p className="mt-1 text-xs text-slate-300">This verified test account has access to all lead-automation entitlements and unlimited connected mailboxes. No Stripe subscription or credit card is required. Features not yet built remain marked in development.</p>
    </section>:null}
    {data&&!founder?<section className={panel}>
      <div className="flex flex-wrap justify-between gap-3">
        <div><p className="text-[10px] uppercase tracking-wide text-slate-400">Subscription status</p>
          <strong className="mt-1 block text-lg">{String(data.subscription_status||"NONE").replaceAll("_"," ")}</strong>
          <p className="text-[11px] text-slate-400">{active?data.mailbox_limit+" billable inboxes active": "Manual lead capture remains free."}</p></div>
        {data.subscription_id_present?<button type="button" disabled={busy} onClick={portal}
          className="min-h-10 rounded-lg border border-cyan-400/40 px-4 text-xs font-bold text-cyan-100 disabled:opacity-40">Manage recurring billing</button>:null}
      </div>
    </section>:null}
    <section className={panel}>
      <h2 className="text-lg font-black">1 · Select mailboxes</h2>
      <p className="mt-1 text-xs text-slate-400">Base price: $9.99 per connected Outlook inbox per month. Manual leads remain included with the PM workspace.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="text-xs font-bold text-slate-200">Number of connected inboxes
          <input type="number" min="1" max="100" step="1" value={mailboxes} disabled={founder}
            onChange={e=>setMailboxes(Math.max(1,Math.min(100,Math.round(Number(e.target.value)||1))))}
            className="mt-1 block min-h-12 w-28 rounded-lg border border-slate-600 bg-black/30 px-3 text-lg font-black text-white disabled:opacity-50"/></label>
        <div className="rounded-xl border border-slate-700 bg-black/20 p-3 text-xs">
          <div className="text-slate-400">Volume discount</div>
          <strong className="mt-1 block text-base text-cyan-200">{founder?"Included":percent+"% off"}</strong>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
        {[{n:3,p:10},{n:5,p:15},{n:8,p:20}].map(item=><button type="button" key={item.n} disabled={founder}
          onClick={()=>setMailboxes(item.n)} className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-2 text-cyan-100">
          {item.n}+ inboxes <strong className="block">{item.p}% off</strong>
        </button>)}
      </div>
      {founder?<p className="mt-2 text-xs text-emerald-200">Unlimited mailboxes available on this testing account.</p>:null}
    </section>
    <section className={panel}>
      <h2 className="text-lg font-black">2 · Select add-ons</h2>
      <p className="mt-1 text-xs text-slate-400">Included options are selected automatically. Unreleased options cannot be charged until the service is ready.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {featureOrder.map(key=>{
          const item=data?.catalog?.[key]||{label:key,available:false,price_cents:0};
          const selected=founder||choices.includes(key);
          return <label key={key} className={"flex items-start gap-3 rounded-xl border p-3 "+
            (selected?"border-cyan-400/35 bg-cyan-500/10":"border-slate-700 bg-black/20")}>
            <input type="checkbox" className="mt-1 h-4 w-4 accent-cyan-400" checked={selected}
              disabled={founder||!item.available||item.included||key==="inbox_capture"}
              onChange={()=>toggle(key)}/>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-black">{item.label}</span>
              <span className="mt-1 block text-[10px] text-slate-400">
                {!item.available?"In development · not sold yet":item.included?"Included in lead capture":item.per_mailbox?"$9.99/month per inbox":monthly(item.price_cents)+"/month"}
              </span>
            </span>
          </label>;
        })}
      </div>
    </section>
    <section className={panel}>
      <h2 className="text-lg font-black">3 · Review your recurring total</h2>
      <div className="mt-3 space-y-2 text-xs">
        <div className="flex justify-between"><span>Mailbox capture</span><strong>{monthly(subtotal)}</strong></div>
        <div className="flex justify-between text-emerald-200"><span>Volume discount ({founder?"founder":percent+"%"})</span><strong>−{monthly(subtotal-total)}</strong></div>
        <div className="border-t border-slate-700 pt-3 flex items-center justify-between">
          <span className="text-sm font-black">Monthly subscription</span><strong className="text-2xl font-black text-cyan-200">{monthly(total)}</strong>
        </div>
        <p className="text-[10px] leading-4 text-slate-500">This estimate covers live mailbox capture and included tools only. Applicable taxes, if any, appear at checkout. Subscription renews monthly until cancelled. Manage cancellation in Stripe Billing.</p>
      </div>
      {founder?<button type="button" onClick={()=>nav("/pm/leads?connect=email")} className="mt-4 min-h-11 w-full rounded-xl bg-emerald-400 px-4 text-xs font-black text-slate-950">
        Use founder features · connect inbox
      </button>:active?<button type="button" onClick={portal} disabled={busy}
        className="mt-4 min-h-11 w-full rounded-xl bg-cyan-400 px-4 text-xs font-black text-slate-950 disabled:opacity-40">Manage existing subscription</button>:
        <button type="button" onClick={checkout} disabled={busy||!data?.checkout_enabled}
          className="mt-4 min-h-11 w-full rounded-xl bg-cyan-400 px-4 text-xs font-black text-slate-950 disabled:opacity-40">
          {busy?"Opening Stripe…":data?.checkout_enabled?"Continue to secure Stripe Checkout":"Recurring checkout not yet enabled"}
        </button>}
      {data&&!data.checkout_enabled&&!founder?<p className="mt-2 text-[11px] text-amber-200">Stripe checkout will be enabled after live webhook verification and billing deployment checks. No charge can be created while disabled.</p>:null}
    </section>
  </main>;
}
