// src/components/pm/docs/docsUi.js
import React from "react";

export function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

export function normalizeErr(e) {
  const data = e?.response?.data;
  if (!data) return e?.message || "Error.";
  if (typeof data === "string") return data;
  if (data?.detail) return data.detail;

  // DRF validation dict
  if (typeof data === "object") {
    const parts = [];
    for (const [k, v] of Object.entries(data)) {
      if (Array.isArray(v)) parts.push(`${k}: ${v.join(" ")}`);
      else if (typeof v === "string") parts.push(`${k}: ${v}`);
      else parts.push(`${k}: ${JSON.stringify(v)}`);
    }
    if (parts.length) return parts.join(" • ");
  }
  return "Error.";
}

export function fmtDateTime(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString();
}

export function extFromName(name) {
  const n = String(name || "");
  const i = n.lastIndexOf(".");
  if (i < 0) return "";
  return n.slice(i + 1).toLowerCase();
}

export function docToneByType(type) {
  const t = String(type || "").toUpperCase();
  if (t === "LEASE") return "cyan";
  if (t.includes("SECTION8")) return "amber";
  if (t === "APPLICATION") return "purple";
  if (t === "NOTICE") return "rose";
  if (t === "INSPECTION") return "emerald";
  return "slate";
}

export const DOC_TYPES = [
  { value: "GENERAL", label: "General" },
  { value: "LEASE", label: "Lease" },
  { value: "APPLICATION", label: "Application" },
  { value: "NOTICE", label: "Notice" },
  { value: "INSPECTION", label: "Inspection" },
  { value: "SECTION8_PACKET", label: "Section 8 Packet" },
  { value: "SECTION8_RECERT", label: "Section 8 Recert" },
];

export function Pill({ tone = "slate", children }) {
  const tones = {
    slate: "border-slate-700/40 bg-slate-800/30 text-slate-200",
    cyan: "border-cyan-500/40 bg-cyan-500/10 text-cyan-100",
    emerald: "border-emerald-500/40 bg-emerald-500/10 text-emerald-100",
    amber: "border-amber-500/40 bg-amber-500/10 text-amber-100",
    purple: "border-purple-500/40 bg-purple-500/10 text-purple-100",
    rose: "border-rose-500/40 bg-rose-500/10 text-rose-100",
    fuchsia: "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-100",
  };

  return (
    <span className={cx("inline-flex items-center px-2 py-1 rounded-xl border text-[11px] font-semibold", tones[tone] || tones.slate)}>
      {children}
    </span>
  );
}

export function IconBtn({ tone = "slate", title, onClick, disabled, children }) {
  const tones = {
    slate: "border-slate-800 bg-slate-900/40 text-slate-200 hover:bg-slate-900/70",
    cyan: "border-cyan-500/40 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15",
    rose: "border-rose-500/40 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15",
    fuchsia: "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-100 hover:bg-fuchsia-500/15",
  };

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "rounded-xl border px-3 py-2 text-sm transition disabled:opacity-60 disabled:cursor-not-allowed",
        tones[tone] || tones.slate
      )}
    >
      {children}
    </button>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div className="text-xs text-slate-400">{label}</div>
      {hint ? <div className="text-[11px] text-slate-500 mt-0.5">{hint}</div> : null}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export function Input(props) {
  return (
    <input
      {...props}
      className={cx(
        "w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-200 placeholder:text-slate-600 outline-none",
        props.className
      )}
    />
  );
}

export function Select(props) {
  return (
    <select
      {...props}
      className={cx(
        "w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-200 outline-none",
        props.className
      )}
    />
  );
}

export function Modal({ open, title, onClose, disableClose, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={() => (disableClose ? null : onClose?.())} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-950 shadow-xl">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
            <div className="text-slate-100 font-semibold">{title}</div>
            <button
              type="button"
              onClick={() => (disableClose ? null : onClose?.())}
              className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900"
              disabled={disableClose}
            >
              ✖
            </button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
