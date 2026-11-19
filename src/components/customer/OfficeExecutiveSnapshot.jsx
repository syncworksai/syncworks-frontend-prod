import React from "react";
import { ArrowUpRight, Activity, BriefcaseBusiness, Clock3, FileBarChart2, Landmark, ShieldCheck } from "lucide-react";
import "./OfficeExecutiveSnapshot.css";

// Presentation fixture only: the production executive overview will replace this
// with business-scoped KPI responses once the isolated reporting API is available.
const snapshot = [
  ["Revenue", "$42.2k", ArrowUpRight],
  ["Jobs closed", "142", BriefcaseBusiness],
  ["SLA met", "96.4%", Clock3],
  ["Receivables", "$18.7k", Landmark],
];
export default function OfficeExecutiveSnapshot({ onOpen }) {
  return <section className="sw-office-executive" aria-label="Private executive snapshot preview">
    <div className="sw-office-executive-head">
      <div><span className="sw-office-executive-kicker">PRIVATE / STERLING SHOWCASE</span><h3>Executive snapshot</h3><p>Simulated company activity · Your existing account is unchanged</p></div>
      <ShieldCheck size={22} aria-label="Private preview"/>
    </div>
    <div className="sw-office-executive-metrics">
      {snapshot.map(([label,value,Icon])=><div key={label} className="sw-office-executive-metric"><Icon size={15} aria-hidden="true"/><span>{label}</span><strong>{value}</strong></div>)}
    </div>
    <div className="sw-office-executive-bottom"><span><Activity size={14}/> 4 SLA alerts · 6 invoices to review</span><button type="button" onClick={onOpen}><FileBarChart2 size={16}/> Open CEO Command <ArrowUpRight size={15}/></button></div>
  </section>;
}
