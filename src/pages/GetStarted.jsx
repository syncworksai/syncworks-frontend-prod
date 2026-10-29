import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, Home, KeyRound, ShieldCheck, UserRound, Wallet } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

export const JOIN_ROLES = [
  {key:"personal",title:"Personal",icon:UserRound,description:"Request services and organize your everyday life.",detail:"Free personal profile, requests, tickets, calendar and more.",tone:"cyan"},
  {key:"business",title:"Business",icon:Building2,description:"Run jobs, customers, employees, scheduling and payments.",detail:"Set up one or more business profiles; each can have its own contact email.",tone:"emerald"},
  {key:"tenant",title:"Tenant",icon:Home,description:"Connect to your property and manage your rental experience.",detail:"A secure invitation from your property manager is required to link a lease.",tone:"violet"},
  {key:"investor",title:"Investor",icon:Wallet,description:"View investments and property reporting shared with you.",detail:"Your property manager must send an investor invite/claim code.",tone:"fuchsia"},
];

const EXISTING_USER_DESTINATIONS = {
  personal:"/customer",
  business:"/onboarding/business",
  tenant:"/tenant/accept",
  investor:"/investor/accept",
};

export function roleSignupUrl(role) {
  const key = JOIN_ROLES.some(item => item.key===role) ? role : "personal";
  return `/register?role=${encodeURIComponent(key)}`;
}
export function roleDestination(role, alreadySignedIn) {
  return alreadySignedIn ? EXISTING_USER_DESTINATIONS[role] || "/customer" : roleSignupUrl(role);
}

export default function GetStarted() {
  const { user } = useAuth();
  const signedIn = Boolean(user);
  return (
    <div className="min-h-dvh bg-[#030712] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[380px] bg-gradient-to-b from-[#12253e]/60 to-transparent" />
      <header className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <Link to="/login" className="inline-flex items-center gap-3 text-lg font-black tracking-wide">
          <img src="/brands/syncworks-icon-192.png" alt="" className="h-11 w-11 rounded-xl border border-cyan-400/30 object-contain" />
          SyncWorks
        </Link>
        <Link to={signedIn?"/customer":"/login"} className="rounded-xl border border-cyan-400/25 bg-slate-900/80 px-4 py-2.5 text-sm font-bold text-cyan-100">
          {signedIn?"My dashboard":"Sign in"}
        </Link>
      </header>
      <main className="relative mx-auto max-w-6xl px-4 pb-20 pt-5 sm:px-6 sm:pt-10">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-[.15em] text-emerald-200">
            <ShieldCheck size={16}/> One secure account
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">Start with you. Then connect what you do.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            Everyone starts with a basic Personal profile and one verified login. Choose what you want to set up next.
            You can use several roles without creating separate personal accounts.
          </p>
        </div>
        <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:gap-4">
          {JOIN_ROLES.map(({key,title,icon:Icon,description,detail})=>(
            <Link key={key} to={roleDestination(key,signedIn)}
              className="group flex min-h-[190px] flex-col rounded-3xl border border-slate-700/80 bg-[#0a1528]/95 p-5 transition hover:border-cyan-400/50 hover:bg-[#11213a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 sm:p-6">
              <div className="flex items-center justify-between">
                <span className="rounded-2xl border border-cyan-500/15 bg-cyan-400/10 p-3"><Icon size={24} className="text-cyan-200"/></span>
                <ArrowRight className="text-cyan-200 transition group-hover:translate-x-1" size={20}/>
              </div>
              <h2 className="mt-4 text-xl font-black">{title}</h2>
              <p className="mt-1 text-sm text-slate-200">{description}</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p>
            </Link>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 text-sm text-slate-300 sm:p-5">
          <div className="flex gap-3"><KeyRound className="mt-0.5 shrink-0 text-emerald-200" size={19}/>
            <div><strong className="text-white">Your emails can be different.</strong> Your personal email is your verified sign-in address.
              A business can use a separate email for customer inquiries, invoices and company correspondence.
              Tenant and Investor access is linked only after an authorized invitation is accepted.</div>
          </div>
        </div>
      </main>
    </div>
  );
}
