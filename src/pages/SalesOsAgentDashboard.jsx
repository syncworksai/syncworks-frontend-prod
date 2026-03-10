// src/pages/SalesOsAgentDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";

function Item({ p, onOpenEmail }) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold">{p.full_name}</div>
          <div className="text-xs text-white/60 mt-1">
            {p.stage?.name || "—"} • {p.email || "No email"} • {p.phone || "No phone"}
          </div>
        </div>
        <button
          className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm"
          onClick={() => onOpenEmail(p)}
          disabled={!p.email}
        >
          Email
        </button>
      </div>
      {p.next_follow_up_at && (
        <div className="mt-3 text-xs text-white/60">
          Follow-up: {new Date(p.next_follow_up_at).toLocaleString()}
        </div>
      )}
      {p.notes && (
        <div className="mt-3 text-sm text-white/70 whitespace-pre-wrap">{p.notes}</div>
      )}
    </div>
  );
}

export default function SalesOsAgentDashboard() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const pipelineId = params.get("pipeline_id");

  const [prospects, setProspects] = useState([]);
  const [metrics, setMetrics] = useState(null);

  const [emailModal, setEmailModal] = useState({ open: false, prospect: null });
  const [emailForm, setEmailForm] = useState({ subject: "", body: "", template: "followup" });
  const [sending, setSending] = useState(false);

  const followUps = useMemo(() => {
    return (prospects || [])
      .filter((p) => p.next_follow_up_at)
      .sort((a, b) => new Date(a.next_follow_up_at) - new Date(b.next_follow_up_at));
  }, [prospects]);

  async function load() {
    if (!pipelineId) return;
    const [p, m] = await Promise.all([
      api.get(`/sales/prospects/?pipeline_id=${pipelineId}`),
      api.get(`/sales/pipelines/${pipelineId}/metrics/`),
    ]);
    setProspects(p.data || []);
    setMetrics(m.data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineId]);

  function openEmail(prospect) {
    setEmailModal({ open: true, prospect });
    setEmailForm({ subject: "", body: "", template: "followup" });
  }

  async function sendEmail() {
    if (!emailModal.prospect) return;
    setSending(true);
    try {
      const payload =
        emailForm.body.trim()
          ? { subject: emailForm.subject, body: emailForm.body }
          : { template: emailForm.template, subject: emailForm.subject };

      const res = await api.post(`/sales/prospects/${emailModal.prospect.id}/send-email/`, payload);
      if (res.data?.ok) alert("Email sent.");
      else alert("Email failed.");
      setEmailModal({ open: false, prospect: null });
      await load();
    } catch (e) {
      alert("Email failed. Configure SMTP in Sales OS seat email settings.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <ModeBar
        title="Sales OS • Agent"
        subtitle={pipelineId ? `Pipeline #${pipelineId} • My work` : "Open from Sales OS dashboard"}
        rightActions={[
          {
            label: "Open Board",
            onClick: () => nav("/sales/board" + (pipelineId ? `?pipeline_id=${pipelineId}` : "")),
            disabled: !pipelineId,
          },
        ]}
      />

      <div className="max-w-6xl mx-auto px-4 pb-16">
        {!pipelineId ? (
          <div className="mt-6 text-white/70">Missing pipeline_id.</div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <div className="text-xs text-white/60">My Rank</div>
                <div className="text-2xl font-semibold mt-1">{metrics?.my_rank ?? "—"}</div>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <div className="text-xs text-white/60">Open Prospects</div>
                <div className="text-2xl font-semibold mt-1">{metrics?.open_prospects ?? "—"}</div>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <div className="text-xs text-white/60">Won (30d)</div>
                <div className="text-2xl font-semibold mt-1">{metrics?.won_30d ?? "—"}</div>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <div className="text-xs text-white/60">Conversion (30d)</div>
                <div className="text-2xl font-semibold mt-1">
                  {metrics?.conversion_rate_30d != null ? `${Math.round(metrics.conversion_rate_30d * 100)}%` : "—"}
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <div className="font-semibold mb-3">My Prospects</div>
                <div className="space-y-3">
                  {(prospects || []).length === 0 ? (
                    <div className="text-white/60 text-sm">No prospects yet.</div>
                  ) : (
                    prospects.slice(0, 12).map((p) => <Item key={p.id} p={p} onOpenEmail={openEmail} />)
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <div className="font-semibold mb-3">Follow-ups</div>
                <div className="space-y-3">
                  {followUps.length === 0 ? (
                    <div className="text-white/60 text-sm">No follow-ups scheduled.</div>
                  ) : (
                    followUps.slice(0, 12).map((p) => <Item key={p.id} p={p} onOpenEmail={openEmail} />)
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {emailModal.open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-zinc-950 border border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Send Email</div>
              <button className="text-white/60 hover:text-white" onClick={() => setEmailModal({ open: false, prospect: null })}>
                ✕
              </button>
            </div>

            <div className="mt-3 text-sm text-white/70">
              To: <span className="text-white">{emailModal.prospect?.email}</span>
            </div>

            <div className="mt-4 grid gap-3">
              <input
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2"
                placeholder="Subject (optional)"
                value={emailForm.subject}
                onChange={(e) => setEmailForm((s) => ({ ...s, subject: e.target.value }))}
              />

              <select
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
                value={emailForm.template}
                onChange={(e) => setEmailForm((s) => ({ ...s, template: e.target.value }))}
              >
                <option value="followup">Template: Follow-up</option>
                <option value="intro">Template: Intro</option>
                <option value="appointment">Template: Appointment</option>
              </select>

              <textarea
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 min-h-[140px]"
                placeholder="Custom email body (optional). If blank, template is used."
                value={emailForm.body}
                onChange={(e) => setEmailForm((s) => ({ ...s, body: e.target.value }))}
              />

              <button
                className="w-full px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10"
                onClick={sendEmail}
                disabled={sending}
              >
                {sending ? "Sending..." : "Send Email"}
              </button>

              <div className="text-xs text-white/50">
                Uses your agent SMTP settings.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}