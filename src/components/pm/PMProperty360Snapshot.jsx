import React from "react";
import { AlertTriangle, ArrowRight, Building2, ClipboardList, FileText, Handshake,
  Home, MessageSquare, Receipt, ShieldAlert, Users, Wallet, Wrench } from "lucide-react";

const cash = n => Number(n || 0).toLocaleString("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2});
const healthTone = status => status==="AT_RISK"?"text-rose-200 bg-rose-500/10 border-rose-500/30":status==="WATCH"?"text-amber-200 bg-amber-500/10 border-amber-500/30":"text-emerald-200 bg-emerald-500/10 border-emerald-500/30";
const navTiles=[
  {key:"tenants",label:"Tenants & leases",hint:"People and agreements",icon:Users},
  {key:"ledger",label:"Money & ledger",hint:"Rent, payments, deposits",icon:Receipt},
  {key:"documents",label:"Files & signatures",hint:"All records, approvals",icon:FileText},
  {key:"maintenance",label:"Repairs & work",hint:"Open jobs and projects",icon:Wrench},
  {key:"handoff",label:"Setup & transfer",hint:"Opening balances, agency",icon:Handshake},
  {key:"investors",label:"Owners & investors",hint:"Updates and payout history",icon:Wallet},
];
export default function PMProperty360Snapshot({data,loading,error,property,openTab,navigate,onDetails,reload}){
  const p=data?.property || property;
  const metrics=data?.operations;
  const propertyId=String(p?.id||"");
  const action=(key)=>{
    if(key==="handoff")return navigate(`/pm/handoff?property=${propertyId}`);
    if(key==="investors")return navigate("/pm/investors");
    return openTab(key);
  };
  return <div className="space-y-3">
    <section className="rounded-2xl border border-cyan-400/20 bg-[linear-gradient(130deg,rgba(8,47,67,.86),rgba(7,17,31,.96)_60%,rgba(70,22,81,.18))] p-3 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-[.17em] text-cyan-300">Property 360</span>
            <span className={`rounded-md border px-2 py-0.5 text-[9px] font-black ${healthTone(p?.status)}`}>{String(p?.status||"REVIEW").replaceAll("_"," ")}</span>
          </div>
          <h1 className="mt-1 truncate text-lg font-black text-white sm:text-xl">{p?.name||"Property"}</h1>
          <p className="truncate text-[11px] text-slate-400">{[p?.address,p?.city,p?.state].filter(Boolean).join(", ")}</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button type="button" onClick={reload} className="min-h-9 rounded-lg border border-slate-600 px-2.5 text-[11px] text-slate-200">Refresh</button>
          <button type="button" onClick={onDetails} className="min-h-9 rounded-lg border border-cyan-400/35 bg-cyan-500/10 px-2.5 text-[11px] font-bold text-cyan-100">Edit</button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Occupancy",data?`${data.units.occupied}/${data.units.total}`:"—","Units occupied"],
          ["Tenant ledger",data?cash(data.accounting.posted_tenant_unpaid):"—","Posted unpaid only"],
          ["Assistance",data?cash(data.accounting.posted_assistance_unreconciled):"—","Unreconciled portion"],
          ["Open work",metrics?metrics.open_work:"—","Active work orders"]
        ].map(([label,value,hint])=><div key={label} className="min-w-0 rounded-xl border border-white/10 bg-black/25 px-2.5 py-2.5">
          <div className="text-[10px] text-slate-400">{label}</div><div className="mt-1 truncate text-lg font-black text-white">{value}</div><p className="text-[9px] text-slate-500">{hint}</p>
        </div>)}
      </div>
      <p className="mt-2 text-[10px] leading-4 text-slate-400">Ledger figures reflect recorded entries only, not verified cash owing or historical manager/agency payments. Unresolved funds remain in reconciliation.</p>
    </section>
    {error ? <div role="alert" className="rounded-xl border border-amber-400/30 bg-amber-500/5 p-3 text-xs text-amber-100">Detailed Property 360 data couldn't load: {error}. Existing property records remain accessible below.</div> : null}
    {loading ? <div role="status" className="rounded-xl border border-slate-700 px-3 py-4 text-xs text-slate-400">Checking linked records and outstanding actions…</div> : null}
    <div className="grid gap-3 lg:grid-cols-[1.1fr_.9fr]">
      <section className="min-w-0 rounded-xl border border-slate-700 bg-[#07111f] p-3">
        <div className="mb-2 flex items-center justify-between gap-2"><h2 className="text-sm font-black text-white">Needs attention</h2><button type="button" onClick={()=>navigate(`/pm/document-requests?property=${propertyId}`)} className="text-[11px] font-bold text-cyan-300">Requests <ArrowRight className="inline h-3 w-3"/></button></div>
        {data?.attention?.length?<div className="space-y-1.5">{data.attention.slice(0,6).map(item=><button type="button" key={item.key} onClick={()=>item.href?.startsWith("/pm/properties/") && item.href.includes("?tab=")?openTab(item.href.split("?tab=")[1]):navigate(item.href)} className="flex min-h-10 w-full items-center gap-2 rounded-lg border border-slate-700/70 bg-black/20 px-2.5 py-2 text-left hover:border-cyan-400/35"><span className={`h-2 w-2 shrink-0 rounded-full ${item.priority==="HIGH"?"bg-rose-400":item.priority==="REVIEW"?"bg-amber-300":"bg-cyan-300"}`}/><span className="min-w-0 flex-1 truncate text-xs text-slate-200">{item.title}</span><span className="font-black text-xs">{item.count}</span><ArrowRight className="h-3 w-3 shrink-0 text-slate-500"/></button>)}</div>:<div className="rounded-lg border border-dashed border-slate-700 p-3 text-xs text-slate-400">{data?"No flagged items in the current records.":"Awaiting property status…"}</div>}
        {data?.links?.legacy_tenant_ids?.length?<p className="mt-2 text-[10px] text-amber-200"><ShieldAlert className="mr-1 inline h-3 w-3"/>Some tenants match by legacy property name; verify each link before importing more records.</p>:null}
        {data?.handoff?.unresolved_balances>0?<button type="button" onClick={()=>action("handoff")} className="mt-2 w-full rounded-lg border border-amber-500/30 bg-amber-500/5 px-2.5 py-2 text-left text-[11px] text-amber-200"><AlertTriangle className="mr-1 inline h-3 w-3"/> {data.handoff.unresolved_balances} opening balance(s) need evidence</button>:null}
      </section>
      <section className="min-w-0 rounded-xl border border-slate-700 bg-[#07111f] p-3">
        <h2 className="mb-2 text-sm font-black text-white">Quick navigation</h2>
        <div className="grid grid-cols-2 gap-2">{navTiles.map(({key,label,hint,icon:Icon})=><button key={key} type="button" onClick={()=>action(key)} className="min-w-0 rounded-lg border border-slate-700 bg-black/20 p-2.5 text-left hover:border-cyan-400/35"><Icon className="mb-2 h-4 w-4 text-cyan-300"/><div className="text-[11px] font-black text-white">{label}</div><p className="mt-0.5 text-[10px] leading-4 text-slate-500">{hint}</p></button>)}</div>
      </section>
    </div>
    {data ? <div className="grid gap-3 lg:grid-cols-2">
      <section className="rounded-xl border border-slate-700 bg-[#07111f] p-3"><div className="flex items-center justify-between"><h2 className="text-sm font-black">People & leases</h2><button type="button" className="text-[11px] font-bold text-cyan-300" onClick={()=>openTab("tenants")}>View all →</button></div>
        {data.tenants.length?<div className="mt-2 space-y-2">{data.tenants.slice(0,3).map(t=><div key={t.id} className="flex items-start justify-between gap-2 rounded-lg border border-slate-700/70 p-2.5"><div className="min-w-0"><div className="truncate text-xs font-bold">{t.name}</div><div className="text-[10px] text-slate-400">{t.unit_label||"Unassigned unit"}{t.lease?` · Lease ${t.lease.start}`:" · No linked lease"}</div>{t.link_status==="REVIEW_NAME_MATCH"?<div className="mt-1 text-[10px] text-amber-200">Verify property link</div>:null}</div><span className="shrink-0 text-[11px] text-cyan-200">{t.lease?cash(t.lease.rent)+"/mo":"—"}</span></div>)}</div>:<div className="mt-2 text-xs text-slate-400">No confirmed tenant link. Review occupancy and lease records before creating another tenant.</div>}
        <div className="mt-2 text-[11px] text-slate-400">Owner: {data.owners.map(x=>x.name).join(", ")||"No linked ownership record"}</div>
      </section>
      <section className="rounded-xl border border-slate-700 bg-[#07111f] p-3"><div className="flex items-center justify-between"><h2 className="text-sm font-black">Current activity</h2><button type="button" onClick={()=>openTab("maintenance")} className="text-[11px] font-bold text-cyan-300">All work →</button></div>
        <div className="mt-2 grid grid-cols-3 gap-2">{[["Requests",metrics?.open_requests],["Messages",metrics?.open_messages],["Team tasks",metrics?.open_staff_tasks]].map(([name,v])=><div className="rounded-lg border border-slate-700/70 p-2 text-center" key={name}><div className="text-base font-black">{v??"—"}</div><div className="text-[10px] text-slate-400">{name}</div></div>)}</div>
        {data.recent_work.length?<div className="mt-2 space-y-1">{data.recent_work.slice(0,2).map(w=><button type="button" onClick={()=>openTab("maintenance")} key={w.id} className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-700/70 px-2 py-2 text-xs"><span className="truncate">{w.title}</span><span className="shrink-0 text-[10px] text-slate-400">{w.status.replaceAll("_"," ")}</span></button>)}</div>:<p className="mt-2 text-[11px] text-slate-500">No maintenance entries yet.</p>}
      </section>
    </div>:null}
  </div>;
}
