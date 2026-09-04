import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getTenantPortalAccount,
  getTenantPortalCommunications,
  sendTenantMaintenanceRequest,
  sendTenantPortalMessage,
} from "../api/pmTenantPortal";
import ModeBar from "../components/ModeBar";
import Button from "../components/ui/Button";

const emptyPortal = { conversations: [], maintenance: [], occupancy: null };
const emptyMessage = { subject: "", body: "" };
const emptyMaintenance = {
  subject: "",
  category: "GENERAL",
  priority: "ROUTINE",
  description: "",
  permission_to_enter: false,
  access_notes: "",
};

function Card({ title, subtitle, right, children }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[28px] border border-blue-500/20 bg-[#07111f]/90 p-4 shadow-[0_18px_70px_rgba(0,89,255,0.09)] backdrop-blur-xl sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          {subtitle ? <div className="mt-1 text-sm text-slate-400">{subtitle}</div> : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Pill({ children, tone = "blue" }) {
  const classes = tone === "green"
    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
    : "border-blue-500/25 bg-blue-500/10 text-blue-200";
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${classes}`}>{children}</span>;
}

function money(value) {
  const amount = Number(value || 0);
  return Number.isNaN(amount)
    ? "$0.00"
    : amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function fmtDate(value) {
  if (!value) return "—";
  const normalized = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T12:00:00`
    : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

function label(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function apiMessage(error, fallback) {
  return error?.response?.data?.detail || error?.message || fallback;
}

function requestTenantPortalData() {
  return Promise.allSettled([
    getTenantPortalAccount(),
    getTenantPortalCommunications(),
  ]);
}

export default function TenantDashboard() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [accountData, setAccountData] = useState(null);
  const [portal, setPortal] = useState(emptyPortal);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [messageOpen, setMessageOpen] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [messageForm, setMessageForm] = useState(emptyMessage);
  const [maintenanceForm, setMaintenanceForm] = useState(emptyMaintenance);

  const applyPortalResults = useCallback(([accountResult, portalResult]) => {
    if (accountResult.status === "fulfilled") {
      setAccountData(accountResult.value);
    } else {
      setAccountData(null);
      setError(apiMessage(accountResult.reason, "Unable to load your tenant account."));
    }

    if (portalResult.status === "fulfilled") {
      setPortal(portalResult.value || emptyPortal);
    } else {
      setPortal(emptyPortal);
      if (accountResult.status === "fulfilled") {
        setError(apiMessage(portalResult.reason, "Unable to load tenant communications."));
      }
    }
    setLoading(false);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    applyPortalResults(await requestTenantPortalData());
  }, [applyPortalResults]);

  useEffect(() => {
    let active = true;
    requestTenantPortalData().then((results) => {
      if (active) applyPortalResults(results);
    });
    return () => {
      active = false;
    };
  }, [applyPortalResults]);

  async function sendMessage(event) {
    event.preventDefault();
    setNotice("");
    try {
      await sendTenantPortalMessage(messageForm);
      setNotice("Message sent to property management.");
      setMessageOpen(false);
      setMessageForm(emptyMessage);
      await loadAll();
    } catch (requestError) {
      setNotice(apiMessage(requestError, "Message could not be sent."));
    }
  }

  async function sendMaintenance(event) {
    event.preventDefault();
    setNotice("");
    try {
      await sendTenantMaintenanceRequest(maintenanceForm);
      setNotice("Maintenance request submitted.");
      setMaintenanceOpen(false);
      setMaintenanceForm(emptyMaintenance);
      await loadAll();
    } catch (requestError) {
      setNotice(apiMessage(requestError, "Maintenance request could not be submitted."));
    }
  }

  const linked = Boolean(accountData?.tenant || accountData?.account?.tenant_id);
  const account = accountData?.account || {};
  const lease = accountData?.lease || {};
  const ledger = accountData?.ledger || [];
  const documents = accountData?.documents || [];
  const management = accountData?.management || {};

  return (
    <div className="min-h-screen bg-black text-slate-100">
      <ModeBar />
      <main className="mx-auto max-w-6xl overflow-x-hidden px-4 pb-[calc(10rem+var(--sw-ios-safe-bottom))] pt-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-blue-400">SYNCWORKS PROPERTY MANAGEMENT</div>
            <h1 className="mt-2 text-3xl font-bold text-white">Welcome Home</h1>
            <p className="mt-1 text-slate-400">Review rent and lease records, request maintenance, and message property management.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={loadAll} tone="slate" disabled={loading}>Refresh</Button>
            <Button onClick={() => nav("/tenant/settings")} tone="slate">Settings</Button>
            <Button onClick={() => nav("/customer")} tone="slate">Personal</Button>
          </div>
        </div>

        {error ? <div className="mt-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}
        {notice ? <div className="mt-5 rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-4 text-sm text-cyan-100">{notice}</div> : null}

        {!loading && !linked ? (
          <div className="mt-6 rounded-[28px] border border-cyan-400/25 bg-[#07111f] p-6">
            <Pill>Secure connection required</Pill>
            <h2 className="mt-4 text-2xl font-black text-white">Connect your tenant account</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Use the invitation sent by your property management company. Sign in with the same email address that received it.</p>
            <Button onClick={() => nav("/tenant/accept")} tone="cyan" className="mt-5">Accept Invitation</Button>
          </div>
        ) : null}

        {linked ? (
          <>
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card title="Rent & Balance" subtitle="Your live Property Management ledger" right={<Pill tone={Number(account.amount_due || 0) > 0 ? "blue" : "green"}>{Number(account.amount_due || 0) > 0 ? "Balance open" : "Current"}</Pill>}>
                <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-black/25 p-4">
                    <div className="text-xs text-slate-500">Amount due</div>
                    <div className="mt-1 text-2xl font-black text-white">{money(account.amount_due)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-black/25 p-4">
                    <div className="text-xs text-slate-500">Next due date</div>
                    <div className="mt-1 text-lg font-black text-white">{fmtDate(account.next_due_date)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-black/25 p-4">
                    <div className="text-xs text-slate-500">Past due</div>
                    <div className="mt-1 font-black text-amber-200">{money(account.past_due)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-black/25 p-4">
                    <div className="text-xs text-slate-500">Last payment</div>
                    <div className="mt-1 font-black text-emerald-200">{money(account.last_payment_amount)}</div>
                    <div className="mt-1 text-[11px] text-slate-500">{fmtDate(account.last_payment_date)}</div>
                  </div>
                </div>
              </Card>

              <Card title="Home & Lease" subtitle={management.name || "Property management"} right={<Pill>{label(lease.status || "Connected")}</Pill>}>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3"><span className="text-slate-500">Property</span><span className="text-right font-bold text-white">{accountData.property_name || "—"}</span></div>
                  <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3"><span className="text-slate-500">Unit</span><span className="text-right font-bold text-white">{accountData.unit_label || "—"}</span></div>
                  <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3"><span className="text-slate-500">Lease term</span><span className="text-right font-bold text-white">{fmtDate(lease.start_date)} – {fmtDate(lease.end_date)}</span></div>
                  <div className="flex items-start justify-between gap-4"><span className="text-slate-500">Monthly rent</span><span className="text-right font-bold text-white">{money(lease.monthly_rent)}</span></div>
                  {management.email || management.phone ? <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-cyan-100">Management contact: {management.email || management.phone}</div> : null}
                </div>
              </Card>

              <Card title="Messages" subtitle="Private conversations with your PM company" right={<Pill>{portal.conversations?.length || 0}</Pill>}>
                <div className="space-y-3">
                  <Button tone="cyan" onClick={() => setMessageOpen(true)}>New Message</Button>
                  {portal.conversations?.slice(0, 3).map((thread) => (
                    <article key={thread.id} className="rounded-2xl border border-slate-800 bg-black/25 p-3">
                      <div className="font-bold text-white">{thread.subject}</div>
                      <div className="mt-1 text-xs text-slate-500">{label(thread.status)} · {thread.property_name || "Tenant record"}</div>
                    </article>
                  ))}
                  {!portal.conversations?.length ? <div className="text-sm text-slate-500">No conversations yet.</div> : null}
                </div>
              </Card>

              <Card title="Maintenance Requests" subtitle={portal.occupancy ? `${portal.occupancy.property_name}${portal.occupancy.unit_label ? ` · ${portal.occupancy.unit_label}` : ""}` : "No active occupancy connected"} right={<Pill>{portal.maintenance?.length || 0}</Pill>}>
                <div className="space-y-3">
                  <Button tone="cyan" onClick={() => setMaintenanceOpen(true)} disabled={!portal.occupancy}>New Request</Button>
                  {portal.maintenance?.slice(0, 3).map((item) => (
                    <article key={item.id} className="rounded-2xl border border-slate-800 bg-black/25 p-3">
                      <div className="font-bold text-white">{item.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{label(item.status)} · {label(item.priority)}</div>
                    </article>
                  ))}
                  {!portal.maintenance?.length ? <div className="text-sm text-slate-500">No maintenance requests.</div> : null}
                </div>
              </Card>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
              <Card title="Tenant Ledger" subtitle="Charges, payments, credits, and adjustments recorded by management" right={<Pill>{ledger.length} entries</Pill>}>
                {ledger.length ? <div className="space-y-3">{ledger.map((entry) => {
                  const reducesBalance = ["PAYMENT", "CREDIT"].includes(String(entry.entry_type).toUpperCase());
                  return (
                    <article key={entry.id} className="grid gap-3 rounded-2xl border border-slate-800 bg-black/25 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                      <div className="text-xs text-slate-500">{fmtDate(entry.entry_date)}</div>
                      <div>
                        <div className="font-bold text-white">{label(entry.category || entry.entry_type)}</div>
                        <div className="mt-1 text-xs text-slate-500">{entry.memo || label(entry.entry_type)}{entry.reference ? ` · ${entry.reference}` : ""}</div>
                      </div>
                      <div className={`font-black ${reducesBalance ? "text-emerald-200" : "text-white"}`}>{reducesBalance ? "−" : ""}{money(entry.amount)}</div>
                    </article>
                  );
                })}</div> : <div className="text-sm text-slate-500">No ledger entries yet.</div>}
              </Card>

              <Card title="Documents" subtitle="Lease and onboarding records shared by management" right={<Pill>{documents.length}</Pill>}>
                {documents.length ? <div className="space-y-3">{documents.map((document) => (
                  <article key={document.id} className="rounded-2xl border border-slate-800 bg-black/25 p-4">
                    <div className="font-bold text-white">{document.template_name || label(document.packet_type)}</div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs"><span className="text-slate-500">Updated {fmtDate(document.updated_at)}</span><Pill tone={document.status === "COMPLETED" ? "green" : "blue"}>{label(document.status)}</Pill></div>
                  </article>
                ))}</div> : <div className="text-sm text-slate-500">No documents have been shared.</div>}
              </Card>
            </div>
          </>
        ) : null}
      </main>

      {messageOpen ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-x-hidden bg-black/75 p-3 pb-[calc(.75rem+var(--sw-ios-safe-bottom))] sm:items-center">
          <form onSubmit={sendMessage} className="max-h-[calc(100dvh-var(--sw-ios-safe-top)-var(--sw-ios-safe-bottom)-1.5rem)] w-full max-w-lg overflow-y-auto rounded-[28px] border border-cyan-400/25 bg-[#07111f] p-5">
            <div className="flex items-center justify-between gap-4"><h3 className="text-xl font-black text-white">Message Property Management</h3><button type="button" onClick={() => setMessageOpen(false)} className="min-h-11 px-2 text-slate-400">Close</button></div>
            <input required value={messageForm.subject} onChange={(event) => setMessageForm({ ...messageForm, subject: event.target.value })} placeholder="Subject" className="mt-4 min-h-11 w-full rounded-2xl border border-slate-700 bg-black/30 px-4 text-white" />
            <textarea required value={messageForm.body} onChange={(event) => setMessageForm({ ...messageForm, body: event.target.value })} placeholder="How can the PM company help?" className="mt-3 min-h-36 w-full rounded-2xl border border-slate-700 bg-black/30 p-4 text-white" />
            <button className="mt-4 min-h-11 w-full rounded-2xl bg-cyan-400 font-black text-slate-950">Send Message</button>
          </form>
        </div>
      ) : null}

      {maintenanceOpen ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-x-hidden bg-black/75 p-3 pb-[calc(.75rem+var(--sw-ios-safe-bottom))] sm:items-center">
          <form onSubmit={sendMaintenance} className="max-h-[calc(100dvh-var(--sw-ios-safe-top)-var(--sw-ios-safe-bottom)-1.5rem)] w-full max-w-xl overflow-x-hidden overflow-y-auto rounded-[28px] border border-cyan-400/25 bg-[#07111f] p-5">
            <div className="flex items-center justify-between gap-4"><h3 className="text-xl font-black text-white">New Maintenance Request</h3><button type="button" onClick={() => setMaintenanceOpen(false)} className="min-h-11 px-2 text-slate-400">Close</button></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input required value={maintenanceForm.subject} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, subject: event.target.value })} placeholder="Short title" className="min-h-11 rounded-2xl border border-slate-700 bg-black/30 px-4 text-white" />
              <select value={maintenanceForm.priority} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, priority: event.target.value })} className="min-h-11 rounded-2xl border border-slate-700 bg-black/30 px-3 text-white"><option value="ROUTINE">Routine</option><option value="HIGH">High</option><option value="URGENT">Urgent</option><option value="EMERGENCY">Emergency</option></select>
              <input value={maintenanceForm.category} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, category: event.target.value })} placeholder="Category" className="min-h-11 rounded-2xl border border-slate-700 bg-black/30 px-4 text-white" />
              <input value={maintenanceForm.access_notes} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, access_notes: event.target.value })} placeholder="Pets or access notes" className="min-h-11 rounded-2xl border border-slate-700 bg-black/30 px-4 text-white" />
            </div>
            <textarea required value={maintenanceForm.description} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, description: event.target.value })} placeholder="Describe the issue in detail" className="mt-3 min-h-36 w-full rounded-2xl border border-slate-700 bg-black/30 p-4 text-white" />
            <label className="mt-3 flex min-h-11 items-center gap-3 text-sm text-slate-300"><input type="checkbox" checked={maintenanceForm.permission_to_enter} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, permission_to_enter: event.target.checked })} /> Permission to enter when I am away</label>
            <button className="mt-4 min-h-11 w-full rounded-2xl bg-cyan-400 font-black text-slate-950">Submit Request</button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
