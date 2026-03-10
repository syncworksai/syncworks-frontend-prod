// src/components/support/SupportMessageBox.jsx
import React, { useMemo, useState } from "react";
import api from "../../api/client";
import GlowCard from "../ui/GlowCard";

/**
 * Universal Support box: “Message SyncWorks”
 * - Works even when business is locked (backend allowlist should include /api/v1/support/)
 * - Posts to: POST /api/v1/support/requests/
 *
 * Props:
 * - title (optional)
 * - defaultKind: "BILLING" | "UNLOCK" | "BUG" | "FEATURE" | "OTHER"
 * - businessId (optional)
 * - role (optional)
 * - tone (optional)
 */
export default function SupportMessageBox({
  title = "Message SyncWorks",
  defaultKind = "OTHER",
  businessId = null,
  role = "",
  tone = "indigo",
  compact = false,
}) {
  const [kind, setKind] = useState(defaultKind);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  const canSend = useMemo(() => {
    return subject.trim().length >= 3 && body.trim().length >= 6;
  }, [subject, body]);

  async function submit() {
    setOk("");
    setErr("");

    if (!canSend) {
      setErr("Add a short subject and a message.");
      return;
    }

    setSending(true);
    try {
      const payload = {
        title: subject.trim(),
        body: body.trim(),
        kind,
      };

      // only send these if present (your serializer may accept them)
      if (businessId) payload.business_id = Number(businessId);
      if (role) payload.role = String(role);

      await api.post("/support/requests/", payload);

      setOk("Sent. SyncWorks Support will review it shortly.");
      setSubject("");
      setBody("");
      setKind(defaultKind);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <GlowCard tone={tone}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-lg font-extrabold flex items-center gap-2">
            <span className="text-xl">💬</span>
            <span className="truncate">{title}</span>
          </div>
          <div className="text-sm text-slate-400 mt-1">
            Reach SyncWorks Support for billing locks, bugs, or feature requests.
          </div>
          {businessId ? (
            <div className="mt-2 text-[11px] text-slate-500">
              Context: <span className="font-mono text-slate-200">business_id={String(businessId)}</span>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] px-3 py-1.5 rounded-full border font-semibold bg-cyan-500/10 border-cyan-500/30 text-cyan-200">
            SyncWorks Support
          </span>
        </div>
      </div>

      <div className={compact ? "mt-4 grid gap-2" : "mt-4 grid md:grid-cols-3 gap-3"}>
        <div className={compact ? "" : "md:col-span-1"}>
          <label className="text-[11px] text-slate-400">Type</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="mt-1 w-full h-10 rounded-2xl bg-slate-950 border border-slate-800 px-3 text-sm text-slate-100"
          >
            <option value="UNLOCK">Unlock Account</option>
            <option value="BILLING">Billing Question</option>
            <option value="BUG">Bug Report</option>
            <option value="FEATURE">Feature Request</option>
            <option value="OTHER">Other</option>
          </select>

          <div className="mt-3 text-[11px] text-slate-500">
            Tip: If your account is locked, choose <b className="text-slate-200">Unlock</b> or <b className="text-slate-200">Billing</b>.
          </div>
        </div>

        <div className={compact ? "" : "md:col-span-2"}>
          <div>
            <label className="text-[11px] text-slate-400">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Example: Billing updated — please unlock"
              className="mt-1 w-full h-10 rounded-2xl bg-slate-950 border border-slate-800 px-3 text-sm text-slate-100"
            />
          </div>

          <div className="mt-3">
            <label className="text-[11px] text-slate-400">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={compact ? 3 : 4}
              placeholder="Give SyncWorks Support the details…"
              className="mt-1 w-full rounded-2xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          {err ? (
            <div className="mt-3 text-sm text-rose-200 bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3">
              {err}
            </div>
          ) : null}
          {ok ? (
            <div className="mt-3 text-sm text-emerald-200 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3">
              {ok}
            </div>
          ) : null}

          <div className="mt-3 flex gap-2 flex-wrap">
            <button
              type="button"
              disabled={sending || !canSend}
              onClick={submit}
              className={[
                "inline-flex items-center justify-center h-10 text-xs rounded-2xl px-4 border transition font-semibold",
                sending || !canSend
                  ? "bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-cyan-500/18 border-cyan-500/35 hover:bg-cyan-500/24 text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.12)]",
              ].join(" ")}
            >
              {sending ? "Sending…" : "Send to SyncWorks"}
            </button>

            <button
              type="button"
              onClick={() => {
                setOk("");
                setErr("");
                setSubject("");
                setBody("");
                setKind(defaultKind);
              }}
              className="inline-flex items-center justify-center h-10 text-xs rounded-2xl px-4 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40 text-slate-200"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </GlowCard>
  );
}