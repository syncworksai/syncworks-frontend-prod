import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api/client";

function cx(...p) {
  return p.filter(Boolean).join(" ");
}

function Btn({ children, tone = "slate", className = "", ...props }) {
  const tones = {
    slate: "bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-200",
    cyan: "bg-cyan-500/20 border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-200",
    emerald: "bg-emerald-500/15 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-200",
    rose: "bg-rose-500/15 border-rose-500/30 hover:bg-rose-500/20 text-rose-200",
    amber: "bg-amber-500/15 border-amber-500/30 hover:bg-amber-500/20 text-amber-200",
  };
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center h-9 text-xs rounded-xl px-3 border transition whitespace-nowrap",
        tones[tone] || tones.slate,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export default function AssignWorkOrderModal({
  open,
  onClose,
  workOrder,
  onAssigned,
}) {
  const [mode, setMode] = useState("TECH"); // TECH | MARKETPLACE
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // TECH list
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [assignedMemberId, setAssignedMemberId] = useState("");

  const woId = workOrder?.id;

  useEffect(() => {
    if (!open) return;
    setErr("");
    setMode("TECH");
    setAssignedMemberId("");
  }, [open]);

  async function loadMembers() {
    setMembersLoading(true);
    setErr("");
    try {
      // ✅ Uses existing endpoint you already have in urls.py
      // If this endpoint returns a paginated {results:[]}, we normalize.
      const res = await api.get("/business-members/");
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];

      // If you want to filter to "technician-like" roles, do it here.
      // If your BusinessMember model uses role enums, keep it permissive for now.
      setMembers(list);
    } catch (e) {
      setMembers([]);
      setErr(e?.response?.data?.detail || "Failed to load team members");
    } finally {
      setMembersLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const memberOptions = useMemo(() => {
    return (members || []).map((m) => {
      const label =
        m?.display_name ||
        m?.name ||
        m?.email ||
        (m?.user_email ? m.user_email : "") ||
        `Member #${m?.id}`;
      return { id: m?.id, label, raw: m };
    });
  }, [members]);

  async function submit() {
    if (!woId) return;
    setErr("");
    setLoading(true);

    try {
      if (mode === "TECH") {
        if (!assignedMemberId) {
          setErr("Pick a technician/team member.");
          setLoading(false);
          return;
        }
        await api.post(`/pm/workorders/${woId}/assign/`, {
          mode: "TECH",
          assigned_member_id: Number(assignedMemberId),
        });
      } else {
        await api.post(`/pm/workorders/${woId}/assign/`, { mode: "MARKETPLACE" });
      }

      if (onAssigned) await onAssigned();
      if (onClose) onClose();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Assign failed");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => {
          if (!loading) onClose?.();
        }}
      />
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-950/95 backdrop-blur p-5 shadow-[0_0_60px_rgba(0,0,0,0.55)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-extrabold">Assign Work Order</div>
            <div className="text-xs text-slate-400 mt-1">
              WO #{workOrder?.id} • {workOrder?.title || "—"}
            </div>
          </div>
          <button
            className="h-9 w-9 rounded-2xl border border-slate-800 bg-slate-950/60 hover:bg-slate-900 flex items-center justify-center"
            onClick={() => {
              if (!loading) onClose?.();
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {err ? (
          <div className="mt-4 text-sm text-red-200 bg-red-900/10 border border-red-800 rounded-xl p-3">
            {err}
          </div>
        ) : null}

        <div className="mt-4 grid md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode("TECH")}
            className={cx(
              "text-left rounded-2xl border p-4 transition",
              mode === "TECH"
                ? "border-cyan-500/40 bg-cyan-500/10"
                : "border-slate-800 bg-slate-950 hover:bg-slate-900"
            )}
          >
            <div className="font-semibold">Assign to Technician</div>
            <div className="text-xs text-slate-400 mt-1">
              Internal dispatch (your team). Fastest + cleanest.
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMode("MARKETPLACE")}
            className={cx(
              "text-left rounded-2xl border p-4 transition",
              mode === "MARKETPLACE"
                ? "border-amber-500/40 bg-amber-500/10"
                : "border-slate-800 bg-slate-950 hover:bg-slate-900"
            )}
          >
            <div className="font-semibold">Send to Marketplace</div>
            <div className="text-xs text-slate-400 mt-1">
              Broadcast to vendors. PM company is the payer.
            </div>
          </button>
        </div>

        {mode === "TECH" ? (
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-xs text-slate-400 mb-2">
              Choose a member (must be active on this business).
            </div>

            <div className="flex items-center gap-2 mb-3">
              <Btn tone="slate" onClick={loadMembers} disabled={membersLoading || loading}>
                {membersLoading ? "Loading…" : "Reload members"}
              </Btn>
            </div>

            <select
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
              value={assignedMemberId}
              onChange={(e) => setAssignedMemberId(e.target.value)}
              disabled={membersLoading || loading}
            >
              <option value="">Select member…</option>
              {memberOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>

            <div className="text-[11px] text-slate-500 mt-2">
              If you only want technicians here, we’ll filter by role next.
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="text-sm font-semibold text-amber-200">Marketplace Dispatch</div>
            <div className="text-xs text-slate-300 mt-1">
              This creates/links a Ticket and broadcasts it. The PM business should be shown as the requester/payer.
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <Btn tone="slate" onClick={onClose} disabled={loading}>
            Cancel
          </Btn>
          <Btn
            tone={mode === "MARKETPLACE" ? "amber" : "cyan"}
            onClick={submit}
            disabled={loading || (mode === "TECH" && !assignedMemberId)}
          >
            {loading ? "Assigning…" : mode === "MARKETPLACE" ? "Send to Marketplace" : "Assign"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
