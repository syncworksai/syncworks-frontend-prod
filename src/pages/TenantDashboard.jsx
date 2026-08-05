// src/pages/TenantDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";
import Button from "../components/ui/Button";

function Card({ title, subtitle, right, children }) {
  return <div className="rounded-[28px] border border-blue-500/20 bg-[#07111f]/90 p-5 shadow-[0_18px_70px_rgba(0,89,255,0.09)] backdrop-blur-xl"><div className="flex items-start justify-between gap-3"><div><div className="text-lg font-semibold text-slate-100">{title}</div>{subtitle ? <div className="mt-1 text-sm text-slate-400">{subtitle}</div> : null}</div>{right ? <div>{right}</div> : null}</div><div className="mt-4">{children}</div></div>;
}
function Pill({ children }) { return <span className="inline-flex items-center rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-xs text-blue-200">{children}</span>; }
function money(v) { const n = Number(v || 0); return Number.isNaN(n) ? "$0.00" : n.toLocaleString(undefined, { style: "currency", currency: "USD" }); }
function fmtDate(value) { if (!value) return "—"; try { return new Date(value).toLocaleDateString(); } catch { return String(value); } }

export default function TenantDashboard() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [charges, setCharges] = useState([]);
  const [portal, setPortal] = useState({ conversations: [], maintenance: [], occupancy: null });
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [messageOpen, setMessageOpen] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [messageForm, setMessageForm] = useState({ subject: "", body: "" });
  const [maintenanceForm, setMaintenanceForm] = useState({ subject: "", category: "GENERAL", priority: "ROUTINE", description: "", permission_to_enter: false, access_notes: "" });

  const dueCharges = useMemo(() => charges.filter((c) => (c.status || "").toUpperCase() !== "PAID"), [charges]);

  async function loadAll() {
    setLoading(true); setErr("");
    try {
      const [sRes, cRes, pRes] = await Promise.allSettled([
        api.get("/tenant/summary/"),
        api.get("/tenant/rent/charges/"),
        api.get("/pm-hub/tenant-portal/communications/"),
      ]);
      if (sRes.status === "fulfilled") setSummary(sRes.value.data); else { setSummary(null); setErr(sRes.reason?.response?.data?.detail || "Unable to load tenant summary."); }
      if (cRes.status === "fulfilled") setCharges(Array.isArray(cRes.value.data) ? cRes.value.data : cRes.value.data?.results || []); else setCharges([]);
      if (pRes.status === "fulfilled") setPortal(pRes.value.data || { conversations: [], maintenance: [], occupancy: null });
    } finally { setLoading(false); }
  }
  useEffect(() => { loadAll(); }, []);

  async function handlePay(charge) {
    try {
      if (charge?.stripe_payment_url) return window.location.assign(charge.stripe_payment_url);
      const res = await api.post(`/tenant/rent/charges/${charge.id}/checkout/`);
      if (res?.data?.url) window.location.assign(res.data.url);
    } catch (e) { alert(e?.response?.data?.detail || "Checkout is not enabled for tenant yet."); }
  }

  async function sendMessage(event) {
    event.preventDefault();
    try {
      await api.post("/pm-hub/tenant-portal/communications/", { action: "MESSAGE", ...messageForm });
      setNotice("Message sent to property management."); setMessageOpen(false); setMessageForm({ subject: "", body: "" }); await loadAll();
    } catch (e) { setNotice(e?.response?.data?.detail || "Message could not be sent."); }
  }

  async function sendMaintenance(event) {
    event.preventDefault();
    try {
      await api.post("/pm-hub/tenant-portal/communications/", { action: "MAINTENANCE", ...maintenanceForm });
      setNotice("Maintenance request submitted."); setMaintenanceOpen(false); setMaintenanceForm({ subject: "", category: "GENERAL", priority: "ROUTINE", description: "", permission_to_enter: false, access_notes: "" }); await loadAll();
    } catch (e) { setNotice(e?.response?.data?.detail || "Maintenance request could not be submitted."); }
  }

  const linked = summary && !summary?.detail;
  const notLinkedMsg = (summary && summary?.detail) || err || "No tenant profile is linked to this account yet.";

  return <div className="min-h-screen bg-black text-slate-100"><ModeBar />
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><div className="text-xs font-bold uppercase tracking-[0.22em] text-blue-400">SYNCWORKS PROPERTY MANAGEMENT</div><div className="mt-2 text-3xl font-bold text-white">Welcome Home</div><div className="mt-1 text-slate-400">Pay rent, request maintenance, message management, and see your connected property.</div></div><div className="flex items-center gap-2"><Button onClick={loadAll} variant="secondary">Refresh</Button><Button onClick={() => nav("/customer")} variant="ghost">Personal</Button></div></div>
      {notice ? <div className="mt-5 rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-4 text-sm text-cyan-100">{notice}</div> : null}

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card title="Rent & Balance" subtitle={linked ? "Your current balance and due date" : "Link your tenant profile to unlock rent and documents"}>{loading ? <div className="text-slate-400">Loading...</div> : linked ? <div className="space-y-3"><div className="flex items-center justify-between"><div className="text-sm text-slate-400">Open balance</div><div className="text-xl font-semibold">{money(dueCharges.reduce((sum, c) => sum + Number(c.balance_due || 0), 0))}</div></div><div className="flex items-center justify-between"><div className="text-sm text-slate-400">Next due</div><div className="text-sm">{fmtDate(dueCharges?.[0]?.due_date)}</div></div><div className="flex flex-wrap gap-2"><Pill>{dueCharges.length} open charge(s)</Pill><Pill>{charges.length} total</Pill></div></div> : <div className="space-y-3"><div className="text-slate-300">{notLinkedMsg}</div><div className="text-sm text-slate-400">Accept your emailed tenant invitation to connect your account.</div><Button onClick={() => nav("/tenant/accept")}>Accept Invite</Button></div>}</Card>

        <Card title="Messages" subtitle="Private conversations with your PM company" right={<Pill>{portal.conversations?.length || 0}</Pill>}><div className="space-y-3"><div className="text-sm text-slate-400">Your messages remain attached to your tenant history even after a move.</div><Button variant="secondary" onClick={() => setMessageOpen(true)}>New message</Button>{portal.conversations?.slice(0, 2).map((thread) => <div key={thread.id} className="rounded-2xl border border-slate-800 bg-black/25 p-3"><div className="font-bold text-white">{thread.subject}</div><div className="mt-1 text-xs text-slate-500">{thread.status?.replaceAll("_", " ")} · {thread.property_name || "Tenant record"}</div></div>)}</div></Card>

        <Card title="Maintenance Requests" subtitle={portal.occupancy ? `${portal.occupancy.property_name}${portal.occupancy.unit_label ? ` · ${portal.occupancy.unit_label}` : ""}` : "No active occupancy connected"} right={<Pill>{portal.maintenance?.length || 0}</Pill>}><div className="space-y-3"><div className="text-sm text-slate-400">Submit an issue and track the work order without losing the property maintenance history.</div><Button variant="secondary" onClick={() => setMaintenanceOpen(true)} disabled={!portal.occupancy}>New request</Button>{portal.maintenance?.slice(0, 2).map((item) => <div key={item.id} className="rounded-2xl border border-slate-800 bg-black/25 p-3"><div className="font-bold text-white">{item.title}</div><div className="mt-1 text-xs text-slate-500">{item.status?.replaceAll("_", " ")} · {item.priority}</div></div>)}</div></Card>
      </div>

      <div className="mt-6"><Card title="Rent charges" subtitle="Pay, review history, and keep receipts" right={<Pill>Tenant ledger</Pill>}>{loading ? <div className="text-slate-400">Loading charges...</div> : charges.length === 0 ? <div className="text-slate-400">No charges yet.</div> : <div className="space-y-3">{charges.map((c) => { const paid = (c.status || "").toUpperCase() === "PAID" || Number(c.balance_due || 0) <= 0; return <div key={c.id} className="grid gap-3 rounded-2xl border border-slate-800 bg-black/25 p-4 sm:grid-cols-[1fr_auto_auto]"><div><div className="font-bold text-white">{fmtDate(c.period_start)} – {fmtDate(c.period_end)}</div><div className="mt-1 text-xs text-slate-500">Due {fmtDate(c.due_date)} · Charge #{c.id}</div></div><div><div className="text-xs text-slate-500">Balance</div><div className="font-black text-white">{money(c.balance_due)}</div></div><Button variant={paid ? "ghost" : undefined} disabled={paid} onClick={() => handlePay(c)}>{paid ? "Paid" : "Pay"}</Button></div>; })}</div>}</Card></div>
    </div>

    {messageOpen ? <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-3 sm:items-center"><form onSubmit={sendMessage} className="w-full max-w-lg rounded-[28px] border border-cyan-400/25 bg-[#07111f] p-5"><div className="flex items-center justify-between"><h3 className="text-xl font-black text-white">Message Property Management</h3><button type="button" onClick={() => setMessageOpen(false)} className="text-slate-400">Close</button></div><input required value={messageForm.subject} onChange={(e) => setMessageForm({ ...messageForm, subject: e.target.value })} placeholder="Subject" className="mt-4 min-h-11 w-full rounded-2xl border border-slate-700 bg-black/30 px-4 text-white" /><textarea required value={messageForm.body} onChange={(e) => setMessageForm({ ...messageForm, body: e.target.value })} placeholder="How can the PM company help?" className="mt-3 min-h-36 w-full rounded-2xl border border-slate-700 bg-black/30 p-4 text-white" /><button className="mt-4 min-h-11 w-full rounded-2xl bg-cyan-400 font-black text-slate-950">Send Message</button></form></div> : null}

    {maintenanceOpen ? <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-3 sm:items-center"><form onSubmit={sendMaintenance} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[28px] border border-cyan-400/25 bg-[#07111f] p-5"><div className="flex items-center justify-between"><h3 className="text-xl font-black text-white">New Maintenance Request</h3><button type="button" onClick={() => setMaintenanceOpen(false)} className="text-slate-400">Close</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><input required value={maintenanceForm.subject} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, subject: e.target.value })} placeholder="Short title" className="min-h-11 rounded-2xl border border-slate-700 bg-black/30 px-4 text-white" /><select value={maintenanceForm.priority} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, priority: e.target.value })} className="min-h-11 rounded-2xl border border-slate-700 bg-black/30 px-3 text-white"><option>ROUTINE</option><option>HIGH</option><option>URGENT</option><option>EMERGENCY</option></select><input value={maintenanceForm.category} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, category: e.target.value })} placeholder="Category" className="min-h-11 rounded-2xl border border-slate-700 bg-black/30 px-4 text-white" /><input value={maintenanceForm.access_notes} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, access_notes: e.target.value })} placeholder="Pets or access notes" className="min-h-11 rounded-2xl border border-slate-700 bg-black/30 px-4 text-white" /></div><textarea required value={maintenanceForm.description} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })} placeholder="Describe the issue in detail" className="mt-3 min-h-36 w-full rounded-2xl border border-slate-700 bg-black/30 p-4 text-white" /><label className="mt-3 flex items-center gap-3 text-sm text-slate-300"><input type="checkbox" checked={maintenanceForm.permission_to_enter} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, permission_to_enter: e.target.checked })} /> Permission to enter when I am away</label><button className="mt-4 min-h-11 w-full rounded-2xl bg-cyan-400 font-black text-slate-950">Submit Request</button></form></div> : null}
  </div>;
}
