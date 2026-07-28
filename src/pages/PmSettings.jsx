import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import PMHeader from "../components/pm/PMHeader";
import Button from "../components/ui/Button";

const inputClass = "min-h-11 w-full rounded-2xl border border-slate-700 bg-black/35 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/15 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-black/20 disabled:text-slate-400";

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

function valueFrom(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return "";
}

function userDefaults(user) {
  const first = valueFrom(user, ["first_name", "firstName"]);
  const last = valueFrom(user, ["last_name", "lastName"]);
  const fullName = valueFrom(user, ["full_name", "name", "display_name"]) || [first, last].filter(Boolean).join(" ");
  const email = valueFrom(user, ["email"]);
  const phone = valueFrom(user, ["phone", "phone_number", "mobile"]);
  const address = valueFrom(user, ["address", "street_address", "mailing_address"]);
  return {
    ...emptyWorkspace,
    manager_name: fullName,
    sender_name: fullName,
    office_email: email,
    tenant_email: email,
    reply_to_email: email,
    phone,
    office_address: address,
  };
}

function errorMessage(err, fallback) {
  const data = err?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail)) return data.detail.join(" ");
  if (data && typeof data === "object") {
    const first = Object.values(data).find((value) => typeof value === "string" || Array.isArray(value));
    if (Array.isArray(first)) return first.join(" ");
    if (typeof first === "string") return first;
  }
  return fallback;
}

function normalizeWebsite(value) {
  const cleaned = String(value || "").trim();
  if (!cleaned || cleaned === "https://" || cleaned === "http://") return "";
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  return `https://${cleaned}`;
}

function Field({ label, children }) {
  return <label className="block space-y-1.5"><span className="text-xs font-medium text-slate-300">{label}</span>{children}</label>;
}

export default function PmSettings() {
  const nav = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const creatingNew = useMemo(() => new URLSearchParams(location.search).get("new") === "1", [location.search]);
  const defaults = useMemo(() => userDefaults(user), [user]);
  const [workspace, setWorkspace] = useState(defaults);
  const [workspaceId, setWorkspaceId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(creatingNew);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const defaultsResponse = await api.get("/pm-hub/workspaces/defaults/").catch(() => null);
        const apiDefaults = defaultsResponse?.data || {};
        const mergedDefaults = { ...defaults, ...Object.fromEntries(Object.entries(apiDefaults).filter(([key]) => key in emptyWorkspace)) };
        if (creatingNew) {
          if (active) {
            setWorkspace(mergedDefaults);
            setWorkspaceId("");
            setEditing(true);
          }
          return;
        }
        const response = await api.get("/pm-hub/workspaces/current/");
        if (!active) return;
        setWorkspace({ ...mergedDefaults, ...response.data });
        setWorkspaceId(response.data?.id || "");
        setEditing(false);
      } catch (err) {
        if (!active) return;
        if (err?.response?.status === 404) {
          setWorkspace(defaults);
          setWorkspaceId("");
          setEditing(true);
        } else {
          setError(errorMessage(err, "Could not load Property Management settings."));
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [creatingNew, defaults]);

  function update(name, value) {
    setWorkspace((current) => ({ ...current, [name]: value }));
  }

  async function saveWorkspace() {
    if (!workspace.name.trim()) return setError("Enter a portfolio name.");
    setSaving(true);
    setError("");
    setMessage("");
    const payload = Object.fromEntries(Object.keys(emptyWorkspace).map((key) => [key, String(workspace[key] || "").trim()]));
    payload.website = normalizeWebsite(payload.website);
    try {
      const response = creatingNew
        ? await api.post("/pm-hub/workspaces/", payload)
        : await api.patch("/pm-hub/workspaces/current/", payload, workspaceId ? { headers: { "X-PM-Workspace-ID": String(workspaceId) } } : undefined);
      setWorkspace({ ...emptyWorkspace, ...response.data });
      setWorkspaceId(response.data.id);
      setEditing(false);
      setMessage(creatingNew ? "Portfolio created." : "Property Management settings saved.");
      if (creatingNew) window.setTimeout(() => nav("/pm", { replace: true }), 700);
    } catch (err) {
      setError(errorMessage(err, "Could not save Property Management settings."));
    } finally {
      setSaving(false);
    }
  }

  const locked = Boolean(workspaceId) && !editing && !creatingNew;

  return (
    <div className="min-h-screen bg-black text-slate-100">
      <PMHeader title={workspace.name || (creatingNew ? "Create Portfolio" : "Property Management Settings")} subtitle="Portfolio identity and communications" />
      <main className="relative z-10 mx-auto max-w-4xl space-y-4 px-4 pb-[calc(13rem+env(safe-area-inset-bottom))] pt-5">
        <section className="rounded-[28px] border border-cyan-400/20 bg-[#07111f]/95 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">{creatingNew ? "Additional portfolio" : "Portfolio settings"}</div>
              <h1 className="mt-2 text-xl font-semibold text-white">{creatingNew ? "Create another Property Management portfolio" : "Portfolio identity"}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-400">Registration details are filled in automatically. Saved information stays locked until you choose Edit.</p>
            </div>
            {locked ? <Button tone="cyan" onClick={() => setEditing(true)}>Edit</Button> : null}
          </div>
          {creatingNew ? <div className="mt-4 rounded-2xl border border-fuchsia-500/25 bg-fuchsia-500/10 p-4 text-sm text-fuchsia-100"><strong>1 portfolio is free.</strong> Each additional portfolio is $9.99/month. Payment activation is required before an additional portfolio can be created.</div> : null}
        </section>

        {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}
        {message ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">{message}</div> : null}

        <section className="rounded-[28px] border border-blue-500/20 bg-[#07111f]/90 p-4 sm:p-5">
          {loading ? <div className="text-sm text-slate-400">Loading portfolio information...</div> : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Portfolio name"><input disabled={locked} className={inputClass} value={workspace.name} onChange={(e) => update("name", e.target.value)} placeholder="Lord Holdings" /></Field>
              <Field label="Manager name"><input disabled={locked} className={inputClass} value={workspace.manager_name} onChange={(e) => update("manager_name", e.target.value)} /></Field>
              <Field label="Sender display name"><input disabled={locked} className={inputClass} value={workspace.sender_name} onChange={(e) => update("sender_name", e.target.value)} /></Field>
              <Field label="Office email"><input disabled={locked} type="email" className={inputClass} value={workspace.office_email} onChange={(e) => update("office_email", e.target.value)} /></Field>
              <Field label="Tenant communications email"><input disabled={locked} type="email" className={inputClass} value={workspace.tenant_email} onChange={(e) => update("tenant_email", e.target.value)} /></Field>
              <Field label="Reply-to email"><input disabled={locked} type="email" className={inputClass} value={workspace.reply_to_email} onChange={(e) => update("reply_to_email", e.target.value)} /></Field>
              <Field label="Phone"><input disabled={locked} className={inputClass} value={workspace.phone} onChange={(e) => update("phone", e.target.value)} /></Field>
              <Field label="Website (optional)"><input disabled={locked} inputMode="url" className={inputClass} value={workspace.website} onChange={(e) => update("website", e.target.value)} placeholder="example.com" /></Field>
              <div className="sm:col-span-2"><Field label="Office address"><input disabled={locked} className={inputClass} value={workspace.office_address} onChange={(e) => update("office_address", e.target.value)} /></Field></div>
              <div className="sm:col-span-2"><Field label="Email signature"><textarea disabled={locked} rows={4} className={inputClass} value={workspace.email_signature} onChange={(e) => update("email_signature", e.target.value)} /></Field></div>
            </div>
          )}
          {!locked && !loading ? <div className="mt-5 flex flex-wrap gap-2"><Button tone="cyan" onClick={saveWorkspace} disabled={saving}>{saving ? "Saving..." : creatingNew ? "Create Portfolio" : "Save Settings"}</Button>{workspaceId && !creatingNew ? <Button tone="slate" onClick={() => setEditing(false)}>Cancel</Button> : null}</div> : null}
        </section>
      </main>
    </div>
  );
}
