// src/components/business/BusinessCommunicationAutomation.jsx
import React, { useEffect, useState } from "react";
import api from "../../api/client";

function Toggle({ label, description, checked, onChange, locked = false }) {
  return (
    <button
      type="button"
      disabled={locked}
      onClick={() => !locked && onChange(!checked)}
      className={`w-full rounded-3xl border p-4 text-left transition ${
        checked
          ? "border-cyan-400/40 bg-cyan-500/10"
          : "border-slate-800 bg-slate-950/70"
      } ${locked ? "cursor-not-allowed opacity-65" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-white">{label}</div>
          <div className="mt-1 text-xs leading-5 text-slate-400">
            {description}
          </div>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-[10px] font-black ${
            checked
              ? "border-cyan-300 bg-cyan-400 text-black"
              : "border-slate-700 bg-slate-900 text-slate-500"
          }`}
        >
          {locked ? "REQUIRED" : checked ? "ON" : "OFF"}
        </span>
      </div>
    </button>
  );
}

export default function BusinessCommunicationAutomation({ businessId }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    if (!businessId) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await api.get(
        "/communication-preferences/current/?scope=BUSINESS"
      );
      setSettings(response.data || null);
    } catch (error) {
      setMessage(
        error?.response?.data?.detail ||
          "Communication settings could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  async function save(patch) {
    setSaving(true);
    setMessage("");
    try {
      const response = await api.patch(
        "/communication-preferences/current/?scope=BUSINESS",
        patch
      );
      setSettings(response.data || null);
      setMessage("Communication automation saved.");
    } catch (error) {
      const data = error?.response?.data;
      setMessage(
        data?.sms_notifications_enabled?.[0] ||
          data?.detail ||
          "Communication settings could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  function update(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
    save({ [key]: value });
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-400">
        Creating the automated Business Inbox profile…
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-100">
        {message || "Business Inbox settings are unavailable."}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 via-indigo-500/8 to-fuchsia-500/8 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-lg font-black text-white">
              {settings.inbox_identity?.label || "Business Inbox"}
            </div>
            <div className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">
              This inbox belongs to the business—not the owner’s personal
              account. Ticket, lead, quote, invoice, and customer messages are
              categorized and routed automatically.
            </div>
          </div>
          <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-[11px] font-black text-emerald-100">
            AUTOMATED
          </span>
        </div>
      </section>

      {message ? (
        <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-3 text-sm text-slate-300">
          {saving ? "Saving…" : message}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <Toggle
          label="Internal Business Inbox"
          description="Required source of truth for customer and team communication."
          checked
          locked
          onChange={() => {}}
        />
        <Toggle
          label="Keep Everyone Updated Automatically"
          description="SyncWorks routes, categorizes, follows up, and escalates unread urgent work."
          checked={settings.automatic_updates_enabled}
          onChange={(value) => update("automatic_updates_enabled", value)}
        />
        <Toggle
          label="Free Email Notifications"
          description="Email alerts employees and links them back to the internal thread."
          checked={settings.email_notifications_enabled}
          onChange={(value) => update("email_notifications_enabled", value)}
        />
        <Toggle
          label="Owner and Manager Oversight"
          description="Authorized leaders can oversee team queues without sharing one login."
          checked={settings.owner_oversight_enabled}
          onChange={(value) => update("owner_oversight_enabled", value)}
        />
        <Toggle
          label="Urgent Unread Escalation"
          description="Re-alert or escalate important conversations that remain unread."
          checked={settings.urgent_unread_escalation_enabled}
          onChange={(value) =>
            update("urgent_unread_escalation_enabled", value)
          }
        />
        <Toggle
          label="Low-Priority Email Digest"
          description="Bundle routine updates while keeping the internal inbox current."
          checked={settings.email_digest_for_low_priority}
          onChange={(value) =>
            update("email_digest_for_low_priority", value)
          }
        />
      </div>

      <section className="rounded-3xl border border-slate-800 bg-slate-950/55 p-5">
        <div className="text-sm font-black text-white">Team Inbox Routing</div>
        <div className="mt-1 text-xs leading-5 text-slate-400">
          Automatic routing is recommended. Employees receive conversations
          relevant to assigned tickets and roles without sharing the owner’s
          personal inbox or credentials.
        </div>

        <select
          value={settings.assignment_mode}
          onChange={(event) => update("assignment_mode", event.target.value)}
          className="mt-4 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white"
        >
          <option value="AUTO">Automatically route by ticket and role</option>
          <option value="ASSIGNED_ONLY">Only assigned conversations</option>
          <option value="SHARED">Shared business team queue</option>
        </select>
      </section>

      <section className="rounded-3xl border border-amber-500/25 bg-amber-500/8 p-5">
        <div className="text-sm font-black text-amber-100">Paid SMS Add-On</div>
        <div className="mt-1 text-xs leading-5 text-slate-300">
          SMS remains off until the business has an active paid package,
          verified phone, and consent. Internal inbox and email continue
          automatically at no additional charge.
        </div>
        <div className="mt-3 inline-flex rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-[11px] font-black text-amber-100">
          {settings.sms_ready ? "READY" : "UPGRADE REQUIRED"}
        </div>
      </section>
    </div>
  );
}
