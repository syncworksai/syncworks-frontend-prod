// src/pages/SalesOsSeatManagement.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";
import SalesOsSubNav from "../components/SalesOsSubNav";

function Row({ m, onToggleSeat, onEditEmail }) {
  const name = m.user_display?.name || m.user_display?.email || `User #${m.user_id || m.id}`;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="font-semibold text-slate-100 truncate">{name}</div>
        <div className="text-xs text-slate-400 mt-1">
          Role: <span className="text-slate-200">{m.role}</span> • Seat:{" "}
          <span className="text-slate-200">{m.is_active_seat ? "Active" : "Inactive"}</span>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          className="px-3 py-2 rounded-xl bg-slate-950/60 hover:bg-slate-900/40 border border-slate-800 text-sm text-slate-200"
          onClick={() => onEditEmail(m)}
        >
          Email Settings
        </button>
        <button
          className="px-3 py-2 rounded-xl bg-slate-950/60 hover:bg-slate-900/40 border border-slate-800 text-sm text-slate-200"
          onClick={() => onToggleSeat(m)}
          disabled={m.role !== "AGENT"}
          title={m.role !== "AGENT" ? "Only AGENT seats affect billing quantity" : "Toggle seat"}
        >
          Toggle Seat
        </button>
      </div>
    </div>
  );
}

export default function SalesOsSeatManagement() {
  const [params] = useSearchParams();
  const pipelineId = (params.get("pipeline_id") || "").trim();

  const [members, setMembers] = useState([]);
  const [saving, setSaving] = useState(false);

  const [emailModal, setEmailModal] = useState({ open: false, member: null });
  const [emailSettings, setEmailSettings] = useState({
    from_name: "",
    from_email: "",
    reply_to_email: "",
    smtp_host: "",
    smtp_port: 587,
    smtp_username: "",
    smtp_password: "",
    use_tls: true,
    is_enabled: false,
  });

  const seatsActive = useMemo(() => {
    return (members || []).filter((m) => m.role === "AGENT" && m.is_active_seat).length;
  }, [members]);

  async function load() {
    if (!pipelineId) return;
    const res = await api.get(`/sales/members/?pipeline_id=${encodeURIComponent(pipelineId)}`);
    const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
    // backend may return broader list; filter client-side defensively
    setMembers(list.filter((m) => String(m.pipeline_id) === String(pipelineId)));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineId]);

  async function toggleSeat(member) {
    setSaving(true);
    try {
      const res = await api.post(`/sales/members/${member.id}/toggle-seat/`, {});
      const updated = members.map((m) =>
        m.id === member.id ? { ...m, is_active_seat: res.data?.is_active_seat } : m
      );
      setMembers(updated);
      if (res.data?.stripe?.detail) console.log("Stripe:", res.data.stripe);
    } finally {
      setSaving(false);
    }
  }

  async function openEmailSettings(member) {
    const res = await api.get(`/sales/members/${member.id}/email-settings/`);
    setEmailSettings(res.data || {});
    setEmailModal({ open: true, member });
  }

  async function saveEmailSettings() {
    if (!emailModal.member) return;
    setSaving(true);
    try {
      await api.patch(`/sales/members/${emailModal.member.id}/email-settings/`, emailSettings);
      alert("Email settings saved ✅");
      setEmailModal({ open: false, member: null });
    } catch (e) {
      alert(e?.response?.data?.detail || "Failed to save email settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="Sales OS • Seat Management"
        subtitle={
          pipelineId ? `Pipeline #${pipelineId} • Seats Active: ${seatsActive}` : "Open from Sales OS dashboard"
        }
        rightActions={<SalesOsSubNav pipelineId={pipelineId} active="seats" />}
      />

      <div className="max-w-5xl mx-auto px-4 pb-16">
        {!pipelineId ? (
          <div className="mt-6 text-slate-300">Missing pipeline_id.</div>
        ) : (
          <>
            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="font-semibold text-slate-100">Billing Seats</div>
              <div className="text-sm text-slate-400 mt-1">
                Stripe subscription quantity updates when <b>AGENT</b> seats are toggled active/inactive.
              </div>
              <div className="mt-3 text-sm text-slate-300">
                Seats active: <span className="text-slate-100">{seatsActive}</span>
                {saving && <span className="ml-2 text-slate-500">(saving...)</span>}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {members.length === 0 ? (
                <div className="text-slate-400">No members found.</div>
              ) : (
                members.map((m) => (
                  <Row key={m.id} m={m} onToggleSeat={toggleSeat} onEditEmail={openEmailSettings} />
                ))
              )}
            </div>
          </>
        )}
      </div>

      {emailModal.open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl rounded-3xl bg-slate-950 border border-slate-800 p-5">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Agent Email Settings</div>
              <button
                className="text-slate-300 hover:text-white"
                onClick={() => setEmailModal({ open: false, member: null })}
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2"
                placeholder="From Name"
                value={emailSettings.from_name || ""}
                onChange={(e) => setEmailSettings((s) => ({ ...s, from_name: e.target.value }))}
              />
              <input
                className="bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2"
                placeholder="From Email (optional)"
                value={emailSettings.from_email || ""}
                onChange={(e) => setEmailSettings((s) => ({ ...s, from_email: e.target.value }))}
              />

              <input
                className="bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2"
                placeholder="Reply-To Email (optional)"
                value={emailSettings.reply_to_email || ""}
                onChange={(e) => setEmailSettings((s) => ({ ...s, reply_to_email: e.target.value }))}
              />

              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-300">Enabled</label>
                <input
                  type="checkbox"
                  checked={Boolean(emailSettings.is_enabled)}
                  onChange={(e) => setEmailSettings((s) => ({ ...s, is_enabled: e.target.checked }))}
                />
              </div>

              <input
                className="bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2"
                placeholder="SMTP Host"
                value={emailSettings.smtp_host || ""}
                onChange={(e) => setEmailSettings((s) => ({ ...s, smtp_host: e.target.value }))}
              />
              <input
                className="bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2"
                placeholder="SMTP Port"
                type="number"
                value={emailSettings.smtp_port ?? 587}
                onChange={(e) => setEmailSettings((s) => ({ ...s, smtp_port: Number(e.target.value) }))}
              />

              <input
                className="bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2"
                placeholder="SMTP Username"
                value={emailSettings.smtp_username || ""}
                onChange={(e) => setEmailSettings((s) => ({ ...s, smtp_username: e.target.value }))}
              />
              <input
                className="bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2"
                placeholder="SMTP Password"
                type="password"
                value={emailSettings.smtp_password || ""}
                onChange={(e) => setEmailSettings((s) => ({ ...s, smtp_password: e.target.value }))}
              />

              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-300">Use TLS</label>
                <input
                  type="checkbox"
                  checked={Boolean(emailSettings.use_tls)}
                  onChange={(e) => setEmailSettings((s) => ({ ...s, use_tls: e.target.checked }))}
                />
              </div>
            </div>

            <div className="mt-4">
              <button
                className="w-full px-4 py-3 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 font-semibold"
                onClick={saveEmailSettings}
                disabled={saving}
              >
                Save Email Settings
              </button>
              <div className="text-xs text-slate-500 mt-2">
                MVP: uses agent SMTP credentials. Later we can add Gmail OAuth / SendGrid without changing prospect Email flow.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}