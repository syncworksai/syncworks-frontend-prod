import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, Home, KeyRound, ShieldCheck, UserRound, Store, UtensilsCrossed, HousePlus, UsersRound } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

export const JOIN_ROLES = [
  { key:"personal", title:"Personal", icon:UserRound, description:"Your free personal command center.", detail:"One verified email and one login for every workspace." },
  { key:"business", title:"Service Business", icon:Building2, description:"Run customers, jobs, teams and invoices.", detail:"Existing service-business operations and onboarding." },
  { key:"pm", title:"Property Management", icon:Home, description:"Manage a portfolio or join a property.", detail:"Choose Management Company, Tenant or Property Owner / Partner." },
  { key:"retail", title:"Retail & Shops", icon:Store, description:"Create a store business profile.", detail:"Core business tools now; dedicated retail dashboard to follow." },
  { key:"food", title:"Restaurants & Food", icon:UtensilsCrossed, description:"Create a food-service business profile.", detail:"Core business tools now; dedicated restaurant dashboard to follow." },
];

export const PROPERTY_ROLES = [
  { key:"pm", title:"Management Company", icon:Building2, detail:"Create a separate property-management workspace and dashboard." },
  { key:"tenant", title:"Tenant", icon:HousePlus, detail:"Use the invitation code emailed by your management company to link your rental." },
  { key:"owner", title:"Property Owner / Partner", icon:UsersRound, detail:"Use your management company's invitation code to see only authorized properties." },
];

const EXISTING_USER_DESTINATIONS = {
  personal:"/customer",
  business:"/onboarding/business",
  pm:"/onboarding/property-management",
  tenant:"/tenant/accept",
  owner:"/investor/accept",
  investor:"/investor/accept",
  retail:"/onboarding/business?vertical=retail",
  food:"/onboarding/business?vertical=food",
};

export function roleSignupUrl(role, extra = {}) {
  const key = [...JOIN_ROLES,...PROPERTY_ROLES].some(item => item.key===role) || role==="investor" ? role : "personal";
  const p = new URLSearchParams({ role:key });
  if (extra.email) p.set("email",String(extra.email).trim());
  if (extra.code && ["tenant","owner","investor"].includes(key)) p.set("code",String(extra.code).trim());
  return `/register?${p.toString()}`;
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
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[.15em] text-emerald-200">
            <ShieldCheck size={16}/> One secure account
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">Start with you. Connect what you do.</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Everyone begins with a free Personal identity. Businesses and property-management organizations have separate workspaces and contact emails, under the same login.
          </p>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Join SyncWorks">
          {JOIN_ROLES.map(({key,title,icon:Icon,description,detail})=>(
            <Link key={key} to={key==="pm"?"#property-management":roleDestination(key,signedIn)}
              className="group flex min-h-[170px] flex-col rounded-2xl border border-slate-700/80 bg-[#0a1528]/95 p-5 transition hover:border-cyan-400/50 hover:bg-[#11213a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
              <div className="flex items-center justify-between">
                <span className="rounded-xl border border-cyan-500/15 bg-cyan-400/10 p-2.5"><Icon size={22} className="text-cyan-200"/></span>
                <ArrowRight className="text-cyan-200 transition group-hover:translate-x-1" size={18}/>
              </div>
              <h2 className="mt-4 text-lg font-bold">{title}</h2>
              <p className="mt-1 text-sm text-slate-200">{description}</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p>
            </Link>
          ))}
        </div>
        <section id="property-management" className="mt-6 scroll-mt-12 rounded-2xl border border-violet-400/25 bg-[#0c1426] p-4 sm:p-5">
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-violet-300">Property Management</p>
            <h2 className="mt-1 text-xl font-bold">How are you connected to a property?</h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">A management company creates a workspace. Tenants and property owners join only through codes issued by that company.</p>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {PROPERTY_ROLES.map(({key,title,icon:Icon,detail})=><Link key={key} to={roleDestination(key,signedIn)} className="flex min-h-28 gap-3 rounded-xl border border-slate-700 bg-slate-950/60 p-4 transition hover:border-violet-400/55">
              <Icon className="mt-0.5 shrink-0 text-violet-300" size={20}/>
              <div><p className="text-sm font-bold text-white">{title}</p><p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p></div>
            </Link>)}
          </div>
        </section>
        <div className="mt-6 flex gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 text-sm text-slate-300 sm:p-5">
          <KeyRound className="mt-0.5 shrink-0 text-emerald-200" size={19}/>
          <p><strong className="text-white">One login; different contact emails.</strong> Your Personal email is used for sign-in. Service, Retail, Food and PM workspaces may each use separate company emails. Tenant and Property Owner / Partner access requires a valid invitation code and matching invited email.</p>
        </div>
      </main>
    </div>
  );
}
