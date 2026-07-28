import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import PMHeader from "../components/pm/PMHeader";
import Button from "../components/ui/Button";

const inputClass = "min-h-11 w-full rounded-2xl border border-slate-700 bg-black/35 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/15";

const emptyWorkspace = {
  name: "",
  manager_name: "",
  phone: "",
  office_email: "",
  tenant_email: "",
  reply_to_email: "",
  sender_name: "",
  website: "",
  office_address: "",
  email_signature: "",
};

const emptyTenant = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  property_name: "",
  unit_label: "",
  move_in_date: "",
  lease_start: "",
  lease_end: "",
  monthly_rent: "",
  notes: "",
};

function normalizeList(data) {
  if (Array.isArray(data?.results)) return data.results;
  return Array.isArray(data) ? data : [];
}

function Info({ children }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button type="button" aria-label="More information" className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-600 text-[11px] font-bold text-slate-300">i</button>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-56 -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-950 p-3 text-left text-[11px] font-normal leading-4 text-slate-300 shadow-2xl group-hover:block group-focus-within:block">{children}</span>
    </span>
  );
}

function Field({ label, hint, info, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-slate-300">{label}{info ? <Info>{info}</Info> : null}</span>
      {children}
      {hint ? <span className="block text-[11px] leading-4 text-slate-500">{hint}</span> : null}
    </label>
  );
}

export default function PmSettings() {
  const [tab, setTab] = useState("workspace");
  const [workspace, setWorkspace] = useState(emptyWorkspace);
  const [workspaceId, setWorkspaceId] = useState("");
  const [tenant, setTenant] = useState(emptyTenant);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const headers = useMemo(() => (workspaceId ? { "X-PM-Workspace-ID": String(workspaceId) } : {}), [workspaceId]);

  async function loadTenants(id = workspaceId) {
    if (!id) return setTenants([]);
    try {
      const response = await api.get("/pm-hub/tenants/", { headers: { "X-PM-Workspace-ID": String(id) } });
      setTenants(normalizeList(response.data));
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not load tenants.");
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await api.get("/pm-hub/workspaces/current/");
        if (!active) return;
        setWorkspace({ ...emptyWorkspace, ...response.data });
        setWorkspaceId(response.data?.id || "");
      } catch (err) {
        if (active && err?.response?.status !== 404) setError(err?.response?.data?.detail || "Could not load PM settings.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => { if (workspaceId) loadTenants(workspaceId); }, [workspaceId]);

  async function saveWorkspace() {
    if (!workspace.name.trim()) return setError("Enter a portfolio name.");
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await api.patch("/pm-hub/workspaces/current/", workspace, { headers });
      setWorkspace({ ...emptyWorkspace, ...response.data });
      setWorkspaceId(response.data.id);
      setMessage("Property Management settings saved.");
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not save Property Management settings.");
    } finally { setSaving(false); }
  }

  async function createTenant(sendInvite = false) {
    if (!workspaceId) { setTab("workspace"); return setError("Save the portfolio settings before adding a tenant."); }
    if (!tenant.first_name.trim() || !tenant.email.trim()) return setError("Tenant first name and email are required.");
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await api.post("/pm-hub/tenants/", { ...tenant, workspace_id: workspaceId, monthly_rent: tenant.monthly_rent || null }, { headers });
      if (sendInvite) await api.post(`/pm-hub/tenants/${response.data.id}/send-invite/`, { mode: "TENANT_ONBOARDING" }, { headers });
      setTenant(emptyTenant);
      setMessage(sendInvite ? "Tenant saved and onboarding invitation sent." : "Tenant saved.");
      await loadTenants(workspaceId);
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not save the tenant.");
    } finally { setSaving(false); }
  }

  return (
    <div className="min-h-screen bg-black text-slate-100">
      <PMHeader title={workspace.name || "Property Management Settings"} subtitle="Portfolio identity, communications, and tenant onboarding" />

      <main className="relative z-10 mx-auto max-w-4xl space-y-4 px-4 pb-[calc(13rem+env(safe-area-inset-bottom))] pt-5">
        <section className="rounded-[28px] border border-cyan-400/20 bg-[#07111f]/95 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Property Management Settings</div>
          <h1 className="mt-2 text-xl font-semibold text-white">Configure your portfolio and tenant communications.</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">These settings control the identity tenants see in invitations, messages, and account communications.</p>
        </section>

        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-1.5">
          <button type="button" onClick={() => setTab("workspace")} className={`min-h-11 rounded-xl px-3 text-sm font-semibold ${tab === "workspace" ? "bg-cyan-500/15 text-cyan-200" : "text-slate-400"}`}>Portfolio</button>
          <button type="button" onClick={() => setTab("tenants")} className={`min-h-11 rounded-xl px-3 text-sm font-semibold ${tab === "tenants" ? "bg-cyan-500/15 text-cyan-200" : "text-slate-400"}`}>Tenants</button>
        </div>

        {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}
        {message ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">{message}</div> : null}

        {tab === "workspace" ? (
          <section className="rounded-[28px] border border-slate-800 bg-[#07111f]/90 p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-white">Portfolio identity</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Used across tenant invitations, messages, and reply routing.</p>
            {loading ? <div className="mt-5 text-sm text-slate-400">Loading settings...</div> : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Portfolio name" info="The Property Management workspace name shown throughout SyncWorks."><input className={inputClass} value={workspace.name} onChange={(e) => setWorkspace((p) => ({ ...p, name: e.target.value }))} placeholder="Lord Holdings" /></Field>
                <Field label="Manager name"><input className={inputClass} value={workspace.manager_name} onChange={(e) => setWorkspace((p) => ({ ...p, manager_name: e.target.value }))} /></Field>
                <Field label="Sender display name" info="The name tenants see in email and system communications."><input className={inputClass} value={workspace.sender_name} onChange={(e) => setWorkspace((p) => ({ ...p, sender_name: e.target.value }))} /></Field>
                <Field label="Office email"><input type="email" className={inputClass} value={workspace.office_email} onChange={(e) => setWorkspace((p) => ({ ...p, office_email: e.target.value }))} /></Field>
                <Field label="Tenant communications email"><input type="email" className={inputClass} value={workspace.tenant_email} onChange={(e) => setWorkspace((p) => ({ ...p, tenant_email: e.target.value }))} /></Field>
                <Field label="Reply-to email" info="Tenant replies are routed to this address."><input type="email" className={inputClass} value={workspace.reply_to_email} onChange={(e) => setWorkspace((p) => ({ ...p, reply_to_email: e.target.value }))} /></Field>
                <Field label="Phone"><input className={inputClass} value={workspace.phone} onChange={(e) => setWorkspace((p) => ({ ...p, phone: e.target.value }))} /></Field>
                <Field label="Website"><input className={inputClass} value={workspace.website} onChange={(e) => setWorkspace((p) => ({ ...p, website: e.target.value }))} /></Field>
                <div className="sm:col-span-2"><Field label="Office address"><input className={inputClass} value={workspace.office_address} onChange={(e) => setWorkspace((p) => ({ ...p, office_address: e.target.value }))} /></Field></div>
                <div className="sm:col-span-2"><Field label="Email signature"><textarea rows={4} className={inputClass} value={workspace.email_signature} onChange={(e) => setWorkspace((p) => ({ ...p, email_signature: e.target.value }))} /></Field></div>
              </div>
            )}
            <div className="mt-5"><Button tone="cyan" onClick={saveWorkspace} disabled={saving || loading}>{saving ? "Saving..." : "Save Settings"}</Button></div>
          </section>
        ) : (
          <div className="space-y-4">
            <section className="rounded-[28px] border border-slate-800 bg-[#07111f]/90 p-4 sm:p-5">
              <h2 className="text-lg font-semibold text-white">Add tenant</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">Create the tenant record and send onboarding when ready.</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="First name"><input className={inputClass} value={tenant.first_name} onChange={(e) => setTenant((p) => ({ ...p, first_name: e.target.value }))} /></Field>
                <Field label="Last name"><input className={inputClass} value={tenant.last_name} onChange={(e) => setTenant((p) => ({ ...p, last_name: e.target.value }))} /></Field>
                <Field label="Email"><input type="email" className={inputClass} value={tenant.email} onChange={(e) => setTenant((p) => ({ ...p, email: e.target.value }))} /></Field>
                <Field label="Phone"><input className={inputClass} value={tenant.phone} onChange={(e) => setTenant((p) => ({ ...p, phone: e.target.value }))} /></Field>
                <Field label="Property"><input className={inputClass} value={tenant.property_name} onChange={(e) => setTenant((p) => ({ ...p, property_name: e.target.value }))} /></Field>
                <Field label="Unit"><input className={inputClass} value={tenant.unit_label} onChange={(e) => setTenant((p) => ({ ...p, unit_label: e.target.value }))} /></Field>
                <Field label="Lease start"><input type="date" className={inputClass} value={tenant.lease_start} onChange={(e) => setTenant((p) => ({ ...p, lease_start: e.target.value }))} /></Field>
                <Field label="Lease end"><input type="date" className={inputClass} value={tenant.lease_end} onChange={(e) => setTenant((p) => ({ ...p, lease_end: e.target.value }))} /></Field>
                <Field label="Monthly rent"><input inputMode="decimal" className={inputClass} value={tenant.monthly_rent} onChange={(e) => setTenant((p) => ({ ...p, monthly_rent: e.target.value }))} /></Field>
                <div className="sm:col-span-2"><Field label="Notes"><textarea rows={3} className={inputClass} value={tenant.notes} onChange={(e) => setTenant((p) => ({ ...p, notes: e.target.value }))} /></Field></div>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <Button tone="slate" onClick={() => createTenant(false)} disabled={saving}>Save Tenant</Button>
                <Button tone="cyan" onClick={() => createTenant(true)} disabled={saving}>Save & Send Onboarding</Button>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-800 bg-[#07111f]/90 p-4 sm:p-5">
              <h2 className="text-lg font-semibold text-white">Tenant directory</h2>
              <div className="mt-4 space-y-3">
                {tenants.length ? tenants.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-800 bg-black/25 p-4">
                    <div className="font-semibold text-white">{[item.first_name, item.last_name].filter(Boolean).join(" ") || item.email}</div>
                    <div className="mt-1 text-xs text-slate-500">{item.email} · {[item.property_name, item.unit_label].filter(Boolean).join(" / ") || "Property not assigned"}</div>
                  </div>
                )) : <div className="text-sm text-slate-500">No tenants added yet.</div>}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
