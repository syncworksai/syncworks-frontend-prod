import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import PMHeader from "../components/pm/PMHeader";
import Button from "../components/ui/Button";

const inputClass = "min-h-11 w-full rounded-2xl border border-slate-700 bg-black/35 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/15";
const emptyTenant = { first_name: "", last_name: "", email: "", phone: "", property_name: "", unit_label: "", move_in_date: "", lease_start: "", lease_end: "", monthly_rent: "", notes: "" };

function Field({ label, children }) {
  return <label className="block space-y-1.5"><span className="text-xs font-medium text-slate-300">{label}</span>{children}</label>;
}

function list(data) {
  return Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
}

function messageFrom(err, fallback) {
  return err?.response?.data?.detail || fallback;
}

export default function PMTenants() {
  const nav = useNavigate();
  const [workspace, setWorkspace] = useState(null);
  const [tenant, setTenant] = useState(emptyTenant);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const workspaceResponse = await api.get("/pm-hub/workspaces/current/");
      const current = workspaceResponse.data;
      setWorkspace(current);
      const response = await api.get("/pm-hub/tenants/", { headers: { "X-PM-Workspace-ID": String(current.id) } });
      setTenants(list(response.data));
    } catch (err) {
      if (err?.response?.status === 404) setError("Set up your portfolio before adding a tenant.");
      else setError(messageFrom(err, "Could not load tenants."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createTenant(sendInvite) {
    if (!workspace?.id) return nav("/pm/settings");
    if (!tenant.first_name.trim() || !tenant.email.trim()) return setError("Tenant first name and email are required.");
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const headers = { "X-PM-Workspace-ID": String(workspace.id) };
      const response = await api.post("/pm-hub/tenants/", { ...tenant, workspace_id: workspace.id, monthly_rent: tenant.monthly_rent || null }, { headers });
      if (sendInvite) await api.post(`/pm-hub/tenants/${response.data.id}/send-invite/`, { mode: "TENANT_ONBOARDING" }, { headers });
      setTenant(emptyTenant);
      setMessage(sendInvite ? "Tenant saved and onboarding invitation sent." : "Tenant saved.");
      await load();
    } catch (err) {
      setError(messageFrom(err, "Could not save the tenant."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-slate-100">
      <PMHeader title={workspace?.name || "Tenant Center"} subtitle="Tenant records, leases, and onboarding" />
      <main className="relative z-10 mx-auto max-w-5xl space-y-4 px-4 pb-[calc(13rem+env(safe-area-inset-bottom))] pt-5">
        <section className="rounded-[28px] border border-cyan-400/20 bg-[#07111f]/95 p-4 sm:p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Tenant Center</div>
          <h1 className="mt-2 text-xl font-semibold text-white">Create and manage tenant records.</h1>
          <p className="mt-2 text-sm text-slate-400">Tenant onboarding is kept separate from portfolio settings.</p>
        </section>

        {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}
        {message ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">{message}</div> : null}

        {!workspace?.id && !loading ? <Button tone="cyan" onClick={() => nav("/pm/settings")}>Set Up Portfolio</Button> : (
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[28px] border border-blue-500/20 bg-[#07111f]/90 p-4 sm:p-5">
              <h2 className="text-lg font-semibold text-white">Create tenant</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="First name"><input className={inputClass} value={tenant.first_name} onChange={(e) => setTenant((p) => ({ ...p, first_name: e.target.value }))} /></Field>
                <Field label="Last name"><input className={inputClass} value={tenant.last_name} onChange={(e) => setTenant((p) => ({ ...p, last_name: e.target.value }))} /></Field>
                <Field label="Email"><input type="email" className={inputClass} value={tenant.email} onChange={(e) => setTenant((p) => ({ ...p, email: e.target.value }))} /></Field>
                <Field label="Phone"><input className={inputClass} value={tenant.phone} onChange={(e) => setTenant((p) => ({ ...p, phone: e.target.value }))} /></Field>
                <Field label="Property"><input className={inputClass} value={tenant.property_name} onChange={(e) => setTenant((p) => ({ ...p, property_name: e.target.value }))} /></Field>
                <Field label="Unit"><input className={inputClass} value={tenant.unit_label} onChange={(e) => setTenant((p) => ({ ...p, unit_label: e.target.value }))} /></Field>
                <Field label="Move-in date"><input type="date" className={inputClass} value={tenant.move_in_date} onChange={(e) => setTenant((p) => ({ ...p, move_in_date: e.target.value }))} /></Field>
                <Field label="Monthly rent"><input inputMode="decimal" className={inputClass} value={tenant.monthly_rent} onChange={(e) => setTenant((p) => ({ ...p, monthly_rent: e.target.value }))} /></Field>
                <Field label="Lease start"><input type="date" className={inputClass} value={tenant.lease_start} onChange={(e) => setTenant((p) => ({ ...p, lease_start: e.target.value }))} /></Field>
                <Field label="Lease end"><input type="date" className={inputClass} value={tenant.lease_end} onChange={(e) => setTenant((p) => ({ ...p, lease_end: e.target.value }))} /></Field>
                <div className="sm:col-span-2"><Field label="Notes"><textarea rows={3} className={inputClass} value={tenant.notes} onChange={(e) => setTenant((p) => ({ ...p, notes: e.target.value }))} /></Field></div>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2"><Button tone="slate" onClick={() => createTenant(false)} disabled={saving}>Save Tenant</Button><Button tone="cyan" onClick={() => createTenant(true)} disabled={saving}>{saving ? "Saving..." : "Save & Send Onboarding"}</Button></div>
            </section>

            <section className="rounded-[28px] border border-blue-500/20 bg-[#07111f]/90 p-4 sm:p-5">
              <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-white">Tenant directory</h2><span className="text-xs text-cyan-300">{tenants.length} total</span></div>
              <div className="mt-4 space-y-3">
                {loading ? <div className="text-sm text-slate-500">Loading tenants...</div> : tenants.length ? tenants.map((item) => <article key={item.id} className="rounded-2xl border border-slate-800 bg-black/25 p-4"><div className="font-semibold text-white">{item.full_name || [item.first_name, item.last_name].filter(Boolean).join(" ")}</div><div className="mt-1 text-xs text-slate-400">{item.email}</div><div className="mt-1 text-xs text-slate-500">{[item.property_name, item.unit_label].filter(Boolean).join(" · ") || "Property not assigned"}</div></article>) : <div className="rounded-2xl border border-dashed border-slate-700 p-5 text-sm text-slate-500">No tenants added yet.</div>}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
