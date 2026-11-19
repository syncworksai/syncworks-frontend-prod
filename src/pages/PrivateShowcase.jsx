import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useWorkspaceAppearance } from "../components/customer/CustomerWorkspace";
import "./PrivateShowcaseOffice.css";
import { useAuth } from "../auth/AuthContext";

const PRIVATE_EMAIL = "jacoblord7@outlook.com";
const money = value => new Intl.NumberFormat("en-US", {style:"currency",currency:"USD",maximumFractionDigits:0}).format(value);
const serviceJobs = [
  {id:"SW-1041", customer:"Hamilton Office Park", service:"HVAC service", tech:"Daniel Brooks", status:"In progress", amount:1240, duration:112},
  {id:"SW-1042", customer:"Willow Creek Residences", service:"Plumbing repair", tech:"Marcus Reed", status:"Scheduled", amount:675, duration:84},
  {id:"SW-1043", customer:"Cedar Ridge Retail", service:"Electrical repair", tech:"Olivia Carter", status:"Completed", amount:920, duration:96},
  {id:"SW-1044", customer:"Ashford Apartments", service:"Preventive maintenance", tech:"Ethan Foster", status:"Awaiting invoice", amount:480, duration:68},
  {id:"SW-1045", customer:"Riverside Medical Offices", service:"Emergency cooling", tech:"Sophia Bennett", status:"Dispatched", amount:1860, duration:145}
];
const team = [
  {name:"Daniel Brooks", trade:"HVAC", jobs:34, travel:22, onSite:102, sla:97},
  {name:"Marcus Reed", trade:"Plumbing", jobs:31, travel:19, onSite:91, sla:95},
  {name:"Olivia Carter", trade:"Electrical", jobs:37, travel:26, onSite:108, sla:98},
  {name:"Ethan Foster", trade:"Maintenance", jobs:29, travel:17, onSite:83, sla:96},
  {name:"Sophia Bennett", trade:"HVAC", jobs:33, travel:24, onSite:116, sla:94}
];
const properties = [
  {name:"Willow Creek Residences",units:32,occupied:30,rent:41800,open:3},
  {name:"Ashford Apartments",units:24,occupied:23,rent:31900,open:5},
  {name:"Cedar Ridge Townhomes",units:18,occupied:17,rent:23800,open:2},
  {name:"Riverside Cottages",units:12,occupied:11,rent:14900,open:2}
];
const reports = [
  {name:"Profit & Loss",category:"Financial",detail:"Revenue, direct costs and operating expenses"},
  {name:"Invoice & Payments Ledger",category:"Financial",detail:"Payments, balances and adjustments"},
  {name:"Technician Productivity",category:"Workforce",detail:"Jobs, travel, time on site and SLA"},
  {name:"Customer & Sales Intelligence",category:"Growth",detail:"Retention, lead conversions and pipeline"},
  {name:"Rent Roll & Collections",category:"Property Management",detail:"Units, charges and payment status"},
  {name:"Property Operating Summary",category:"Property Management",detail:"Occupancy and maintenance expenses"}
];
const metrics = [
  ["Revenue invoiced", "$42,200", "Monthly goal $60,000"],
  ["Gross profit", "$12,660", "30.0% estimated margin"],
  ["Completed jobs", "142", "12.7% growth"],
  ["SLA compliance", "96.4%", "4 jobs at risk"],
  ["Cash collected", "$36,400", "86.3% of invoiced"],
  ["Outstanding invoices", "$18,650", "6 need attention"]
];
function Tile({label,value,detail}) {return <div className="rounded-2xl border border-cyan-300/15 bg-slate-900/70 p-3"><p className="text-[11px] uppercase tracking-wider text-cyan-100/65">{label}</p><strong className="mt-1 block text-xl text-white">{value}</strong><span className="text-xs text-slate-400">{detail}</span></div>;}
function Section({title,children}) {return <section className="rounded-2xl border border-cyan-300/15 bg-slate-900/70 p-4"><h2 className="mb-3 text-base font-bold text-white">{title}</h2>{children}</section>;}
function Table({columns,rows}) {return <div className="max-h-56 overflow-auto rounded-xl border border-white/10"><table className="w-full min-w-[520px] text-left text-xs"><thead className="sticky top-0 bg-slate-800 text-cyan-100"><tr>{columns.map(c=><th className="p-2" key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i} className="border-t border-white/10 text-slate-200">{r.map((v,j)=><td className="p-2" key={j}>{v}</td>)}</tr>)}</tbody></table></div>;}
export default function PrivateShowcase() {
  const {user,isAuthed} = useAuth();
  const [appearance] = useWorkspaceAppearance();
  const [tab,setTab] = useState(() => { const value = new URLSearchParams(window.location.search).get("tab"); return ["business","property","ceo","reports"].includes(value) ? value : "ceo"; });
  const [notice,setNotice] = useState("");
  const [year,setYear] = useState("2026");
  const [format,setFormat] = useState("CSV");
  const isOwner = String(user?.email||"").trim().toLowerCase() === PRIVATE_EMAIL;
  if (!isAuthed || !isOwner) return <Navigate to="/customer" replace />;
  const exportPreview = () => {
    if(format!=="CSV") {setNotice("PDF, Excel and Google Sheets exports require the isolated reporting backend. No file has been generated.");return;}
    const csv = ["Report,Category,Tax Year,Dataset",...reports.map(r=>[r.name,r.category,year,"SIMULATED SHOWCASE DATA"].map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
    const a=document.createElement("a");a.href=url;a.download="sterling-showcase-report-index-"+year+".csv";a.click();URL.revokeObjectURL(url);
    setNotice("Downloaded a simulated report INDEX, not financial records or a tax filing package.");
  };
  return <main className="sw-private-office min-h-[calc(100dvh-115px)] px-3 pb-20 pt-4 sm:px-6" data-workspace-theme={appearance.theme} data-workspace-motion={appearance.motion ? "on" : "off"}>
    <div className="sw-private-office-cockpit mx-auto max-w-6xl space-y-4">
      <header className="rounded-3xl border border-amber-400/35 bg-gradient-to-r from-[#15253e] to-[#081629] p-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-amber-200">Private · Isolated showcase · Simulated</span><Link to="/customer" className="rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold hover:bg-white/10">Return to my dashboard</Link></div>
        <h1 className="mt-3 text-2xl font-black tracking-wide">Sterling Group <span className="text-cyan-300">Command Center</span></h1>
        <p className="mt-1 text-xs text-slate-300">Presentation preview only. Fictional employees, customers, jobs, financials and properties. No live business is connected, no payments are processed, and actions here never alter real records.</p>
      </header>
      <nav aria-label="Showcase sections" className="sw-private-office-nav grid grid-cols-2 gap-2 sm:grid-cols-4">{[["business","Business"],["property","Property Management"],["ceo","CEO Command"],["reports","Reports & Export"]].map(([key,title])=><button type="button" key={key} onClick={()=>{setTab(key);setNotice("");}} className={`min-h-12 rounded-xl border px-2 text-sm font-bold transition ${tab===key?"is-active border-cyan-300 bg-cyan-300/20 text-cyan-100":"border-white/15 bg-slate-900 text-slate-300 hover:bg-slate-800"}`}>{title}</button>)}</nav>
      <div className="sw-private-office-panels" key={tab}>
      {tab==="business" && <><div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Tile label="Open work orders" value="42" detail="Across 4 service teams"/><Tile label="Technicians" value="18" detail="5 shown below"/><Tile label="Historical work orders" value="1,284" detail="Fictional 2024–2026 history"/><Tile label="New leads" value="65" detail="Simulated pipeline"/></div>
        <div className="grid gap-3 lg:grid-cols-2"><Section title="Service dispatch board"><Table columns={["Ticket","Customer","Technician","Status"]} rows={serviceJobs.map(j=>[j.id,j.customer,j.tech,j.status])}/></Section><Section title="Today's appointments"><Table columns={["Time","Job","Technician"]} rows={[["8:00–10:00","Cooling service","Daniel Brooks"],["9:00–11:00","Plumbing repair","Marcus Reed"],["11:30–13:00","Electrical diagnostics","Olivia Carter"],["13:00–15:00","Preventive maintenance","Ethan Foster"],["15:00–17:00","Emergency cooling","Sophia Bennett"]]}/></Section></div>
        <Section title="Technician performance"><Table columns={["Employee","Specialty","Jobs / mo","Avg travel","Avg on-site","SLA"]} rows={team.map(t=>[t.name,t.trade,t.jobs,t.travel+" min",t.onSite+" min",t.sla+"%"])}/></Section>
      </>}
      {tab==="property" && <><div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Tile label="Managed units" value="86" detail="4 communities"/><Tile label="Occupied" value="81" detail="94.2% occupancy"/><Tile label="Monthly rent roll" value="$112,400" detail="Fictional recurring charges"/><Tile label="Maintenance" value="12" detail="Open requests"/></div><Section title="Sterling Property Management portfolio"><Table columns={["Community","Units","Occupied","Rent roll","Open requests"]} rows={properties.map(p=>[p.name,p.units,p.occupied,money(p.rent),p.open])}/></Section><Section title="Lease and collection activity"><Table columns={["Item","Property","Status"]} rows={[["Lease renewal","Willow Creek","Due in 30 days"],["Partial rent payment","Ashford","Follow-up required"],["Maintenance dispatch","Cedar Ridge","Assigned to service team"],["Inspection","Riverside","Scheduled"] ]}/></Section></>}
      {tab==="ceo" && <><div className="grid grid-cols-2 gap-3 md:grid-cols-3">{metrics.map(([label,value,detail])=><Tile key={label} label={label} value={value} detail={detail}/>)}</div><div className="grid gap-3 lg:grid-cols-2"><Section title="Executive briefing · Victoria (simulation)"><p className="text-sm leading-6 text-slate-200">Four service jobs are approaching SLA deadlines. Six invoices require collection follow-up. Two technician scheduling conflicts need dispatcher review.</p><p className="mt-2 text-xs text-amber-200">Illustrative briefing only. AI execution is not connected to this showcase.</p></Section><Section title="Revenue goal"><div className="flex justify-between text-sm"><span>Monthly invoiced revenue</span><strong>$42,200 / $60,000</strong></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-700"><div className="h-full rounded-full bg-cyan-400" style={{width:"70.3%"}}/></div><p className="mt-2 text-xs text-slate-400">70.3% to target · illustrative, not a live financial calculation</p></Section></div><Section title="Operational and sales intelligence"><Table columns={["Metric","Showcase value","Context"]} rows={[["Average travel to site","22 min","Sample technician logs"],["First-visit fix rate","91%","Sample work-order history"],["Customer retention","78%","Illustrative rolling measure"],["Sales pipeline","$68,500","Sample qualified opportunities"],["Net profit","Not calculated","Requires verified expense ledger"]]}/></Section></>}
      {tab==="reports" && <><Section title="Report library"><Table columns={["Report","Category","Contents"]} rows={reports.map(r=>[r.name,r.category,r.detail])}/></Section><Section title="Export preview"><div className="grid gap-3 sm:grid-cols-3"><label className="text-sm">Tax year<select value={year} onChange={e=>setYear(e.target.value)} className="mt-1 block w-full rounded-lg border border-white/20 bg-slate-800 p-2">{["2026","2025","2024"].map(x=><option key={x}>{x}</option>)}</select></label><label className="text-sm">Format<select value={format} onChange={e=>setFormat(e.target.value)} className="mt-1 block w-full rounded-lg border border-white/20 bg-slate-800 p-2">{["CSV","PDF","Excel","Google Sheets","QuickBooks / tax software"].map(x=><option key={x}>{x}</option>)}</select></label><div className="flex items-end"><button onClick={exportPreview} className="w-full rounded-lg bg-cyan-500 px-3 py-2 font-bold text-slate-950 hover:bg-cyan-400">Export preview</button></div></div><p className="mt-3 text-xs text-slate-400">Only the CSV report index is downloadable in this preview. Financial exports and connected app uploads are not enabled.</p></Section></>}
      </div>
      {notice && <div role="status" className="rounded-xl border border-amber-300/30 bg-amber-400/10 p-3 text-sm text-amber-100">{notice}</div>}
      <footer className="pb-4 text-center text-xs text-slate-500">Sterling Showcase · Private pilot · Sample content only · No production data</footer>
    </div>
  </main>;
}
