import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/client";
import ModeBar from "../components/ModeBar";
import Button from "../components/ui/Button";

function Field({ label, hint, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-slate-300">{label}</span>
      {children}
      {hint ? <span className="block text-[11px] leading-4 text-slate-500">{hint}</span> : null}
    </label>
  );
}

const inputClass =
  "min-h-11 w-full rounded-2xl border border-slate-700 bg-black/35 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/15";

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

export default function PmSettings() {
  const nav = useNavigate();
  const [tab, setTab] = useState("workspace");
  const [workspace, setWorkspace] = useState(emptyWorkspace);
  const [workspaceId, setWorkspaceId] = useState("");
  const [tenant, setTenant] = useState(emptyTenant);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const headers = useMemo(
    () => (workspaceId ? { "X-PM-Workspace-ID": String(workspaceId) } : {}),
    [workspaceId]
  );

  async function loadWorkspace() {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/pm-hub/workspaces/current/");
      setWorkspace({ ...emptyWorkspace, ...response.data });
      setWorkspaceId(response.data?.id || "");
    } catch (err) {
      if (err?.response?.status !== 404) {
        setError(err?.response?.data?.detail || "Could not load PM workspace settings.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadTenants(nextWorkspaceId = workspaceId) {
    if (!nextWorkspaceId) {
      setTenants([]);
      return;
    }
    try {
      const response = await api.get("/pm-hub/tenants/", {
        headers: { "X-PM-Workspace-ID": String(nextWorkspaceId) },
      });
      setTenants(normalizeList(response.data));
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not load tenants.");
    }
  }

  useEffect(() => {
    loadWorkspace();
  }, []);

  useEffect(() => {
    if (workspaceId) loadTenants(workspaceId);
  }, [workspaceId]);

  async function saveWorkspace() {
    if (!workspace.name.trim()) {
      setError("Enter a PM workspace or portfolio name.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await api.patch("/pm-hub/workspaces/current/", workspace, {
        headers,
      });
      setWorkspace({ ...emptyWorkspace, ...response.data });
      setWorkspaceId(response.data.id);
      setMessage("PM workspace settings saved. These details will be used for tenant invitations.");
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not save PM workspace settings.");
    } finally {
      setSaving(false);
    }
  }

  async function createTenant(sendAfterCreate = false, mode = "COMPLETE_RECORD") {
    if (!workspaceId) {
      setError("Save the PM workspace before adding a tenant.");
      setTab("workspace");
      return;
    }
    if (!tenant.first_name.trim() || !tenant.email.trim()) {
      setError("Tenant first name and email are required.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await api.post(
        "/pm-hub/tenants/",
        { ...tenant, workspace_id: workspaceId, monthly_rent: tenant.monthly_rent || null },
        { headers }
      );
      const created = response.data;
      if (sendAfterCreate) {
        await api.post(
          `/pm-hub/tenants/${created.id}/send-invite/`,
          { mode },
          { headers }
        );
        setMessage(
          mode === "TENANT_ONBOARDING"
            ? "Tenant saved and onboarding email sent."
            : "Tenant saved and portal invitation sent."
        );
      } else {
        setMessage("Tenant saved. You can send the invitation when ready.");
      }
      setTenant(emptyTenant);
      await loadTenants(workspaceId);
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not save the tenant.");
    } finally {
      setSaving(false);
    }
  }

  async function sendInvite(item, mode) {
    setSendingId(item.id);
    setError("");
    setMessage("");
    try {
      await api.post(
        `/pm-hub/tenants/${item.id}/send-invite/`,
        { mode },
        { headers }
      );
      setMessage(`Invitation sent to ${item.email}.`);
      await loadTenants(workspaceId);
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not send the invitation.");
    } finally {
      setSendingId("");
    }
  }

  return (
    <div className="min-h-screen bg-black text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-20%] top-[-10%] h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-15%] h-96 w-96 rounded-full bg-purple-600/10 blur-[130px]" />
      </div>

      <ModeBar
        title="PM Setup Hub"
        subtitle="Standalone portfolio identity and tenant onboarding"
        rightActions={<Button tone="slate" onClick={() => nav("/pm")}>Back</Button>}
      />

      <main className="relative z-10 mx-auto max-w-4xl space-y-4 px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-5">
        <section className="rounded-[28px] border border-cyan-400/20 bg-[#07111f]/95 p-4 shadow-[0_24px_90px_rgba(0,119,255,0.12)]">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Independent PM workspace</div>
          <h1 className="mt-2 text-xl font-semibold text-white">Manage Lord Holdings, a personal portfolio, or any PM operation separately from Business.</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            The saved sender identity below controls future tenant invitations and reply routing for this PM workspace.
          </p>
        </section>

        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-1.5">
          <button type="button" onClick={() => setTab("workspace")} className={`min-h-11 rounded-xl px-3 text-sm font-semibold ${tab === "workspace" ? "bg-cyan-500/15 text-cyan-200" : "text-slate-400"}`}>Workspace</button>
          <button type="button" onClick={() => setTab("tenants")} className={`min-h-11 rounded-xl px-3 text-sm font-semibold ${tab === "tenants" ? "bg-cyan-500/15 text-cyan-200" : "text-slate-400"}`}>Tenants</button>
        </div>

        {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}
        {message ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">{message}</div> : null}

        {tab === "workspace" ? (
          <section className="rounded-[28px] border border-slate-800 bg-[#07111f]/90 p-4 sm:p-5">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-white">Portfolio and communication identity</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">Email is delivered by SyncWorks initially and replies go to the address you save here.</p>
            </div>
            {loading ? <div className="text-sm text-slate-400">Loading settings...</div> : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="PM workspace / portfolio name"><input className={inputClass} value={workspace.name} onChange={(e) => setWorkspace((p) => ({ ...p, name: e.target.value }))} placeholder="Lord Holdings or Personal Properties" /></Field>
                <Field label="Manager name"><input className={inputClass} value={workspace.manager_name} onChange={(e) => setWorkspace((p) => ({ ...p, manager_name: e.target.value }))} placeholder="Jacob Lord" /></Field>
                <Field label="Sender display name"><input className={inputClass} value={workspace.sender_name} onChange={(e) => setWorkspace((p) => ({ ...p, sender_name: e.target.value }))} placeholder="Lord Holdings Property Management" /></Field>
                <Field label="Office email"><input type="email" className={inputClass} value={workspace.office_email} onChange={(e) => setWorkspace((p) => ({ ...p, office_email: e.target.value }))} placeholder="office@example.com" /></Field>
                <Field label="Tenant communications email" hint="Used as the preferred tenant contact identity."><input type="email" className={inputClass} value={workspace.tenant_email} onChange={(e) => setWorkspace((p) => ({ ...p, tenant_email: e.target.value }))} placeholder="tenants@example.com" /></Field>
                <Field label="Reply-to email" hint="Tenant replies are routed here."><input type="email" className={inputClass} value={workspace.reply_to_email} onChange={(e) => setWorkspace((p) => ({ ...p, reply_to_email: e.target.value }))} placeholder="jacob@example.com" /></Field>
                <Field label="Phone"><input className={inputClass} value={workspace.phone} onChange={(e) => setWorkspace((p) => ({ ...p, phone: e.target.value }))} placeholder="(334) 555-0123" /></Field>
                <Field label="Website"><input className={inputClass} value={workspace.website} onChange={(e) => setWorkspace((p) => ({ ...p, website: e.target.value }))} placeholder="https://example.com" /></Field>
                <div className="sm:col-span-2"><Field label="Office address"><input className={inputClass} value={workspace.office_address} onChange={(e) => setWorkspace((p) => ({ ...p, office_address: e.target.value }))} placeholder="123 Main Street, Montgomery, AL" /></Field></div>
                <div className="sm:col-span-2"><Field label="Email signature"><textarea rows={4} className={inputClass} value={workspace.email_signature} onChange={(e) => setWorkspace((p) => ({ ...p, email_signature: e.target.value }))} placeholder="Thank you, Lord Holdings" /></Field></div>
              </div>
            )}
            <div className="mt-5"><Button tone="cyan" onClick={saveWorkspace} disabled={saving || loading}>{saving ? "Saving..." : "Save PM Workspace"}</Button></div>
          </section>
        ) : (
          <div className="space-y-4">
            <section className="rounded-[28px] border border-slate-800 bg-[#07111f]/90 p-4 sm:p-5">
              <h2 className="text-lg font-semibold text-white">Add a tenant</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">Save only, save and invite, or let the tenant finish their onboarding from the email.</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="First name"><input className={inputClass} value={tenant.first_name} onChange={(e) => setTenant((p) => ({ ...p, first_name: e.target.value }))} /></Field>
                <Field label="Last name"><input className={inputClass} value={tenant.last_name} onChange={(e) => setTenant((p) => ({ ...p, last_name: e.target.value }))} /></Field>
                <Field label="Email"><input type="email" className={inputClass} value={tenant.email} onChange={(e) => setTenant((p) => ({ ...p, email: e.target.value }))} /></Field>
                <Field label="Phone"><input className={inputClass} value={tenant.phone} onChange={(e) => setTenant((p) => ({ ...p, phone: e.target.value }))} /></Field>
                <Field label="Property"><input className={inputClass} value={tenant.property_name} onChange={(e) => setTenant((p) => ({ ...p, property_name: e.target.value }))} placeholder="Oak Ridge Apartments" /></Field>
                <Field label="Unit"><input className={inputClass} value={tenant.unit_label} onChange={(e) => setTenant((p) => ({ ...p, unit_label: e.target.value }))} placeholder="2B" /></Field>
                <Field label="Move-in date"><input type="date" className={inputClass} value={tenant.move_in_date} onChange={(e) => setTenant((p) => ({ ...p, move_in_date: e.target.value }))} /></Field>
                <Field label="Monthly rent"><input type="number" step="0.01" className={inputClass} value={tenant.monthly_rent} onChange={(e) => setTenant((p) => ({ ...p, monthly_rent: e.target.value }))} placeholder="1200.00" /></Field>
                <Field label="Lease start"><input type="date" className={inputClass} value={tenant.lease_start} onChange={(e) => setTenant((p) => ({ ...p, lease_start: e.target.value }))} /></Field>
                <Field label="Lease end"><input type="date" className={inputClass} value={tenant.lease_end} onChange={(e) => setTenant((p) => ({ ...p, lease_end: e.target.value }))} /></Field>
                <div className="sm:col-span-2"><Field label="Notes"><textarea rows={3} className={inputClass} value={tenant.notes} onChange={(e) => setTenant((p) => ({ ...p, notes: e.target.value }))} /></Field></div>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <Button tone="slate" onClick={() => createTenant(false)} disabled={saving}>Save only</Button>
                <Button tone="cyan" onClick={() => createTenant(true, "COMPLETE_RECORD")} disabled={saving}>Save + invite</Button>
                <Button tone="indigo" onClick={() => createTenant(true, "TENANT_ONBOARDING")} disabled={saving}>Email onboarding</Button>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-800 bg-[#07111f]/90 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-white">Saved tenants</h2><span className="text-xs text-cyan-300">{tenants.length} total</span></div>
              <div className="mt-4 space-y-3">
                {tenants.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-700 p-5 text-sm text-slate-500">No tenants saved in this PM workspace yet.</div> : tenants.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-slate-800 bg-black/25 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><div className="truncate font-semibold text-white">{item.full_name || item.first_name}</div><div className="mt-1 truncate text-xs text-slate-400">{item.email}</div><div className="mt-1 text-xs text-slate-500">{item.property_name || "Property not set"}{item.unit_label ? ` · Unit ${item.unit_label}` : ""}</div></div>
                      <span className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-200">{String(item.status || "DRAFT").replaceAll("_", " ")}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Button tone="slate" onClick={() => sendInvite(item, "COMPLETE_RECORD")} disabled={String(sendingId) === String(item.id)}>{String(sendingId) === String(item.id) ? "Sending..." : "Send portal invite"}</Button>
                      <Button tone="indigo" onClick={() => sendInvite(item, "TENANT_ONBOARDING")} disabled={String(sendingId) === String(item.id)}>Send onboarding</Button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
