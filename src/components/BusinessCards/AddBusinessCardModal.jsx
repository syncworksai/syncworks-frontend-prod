// src/components/BusinessCards/AddBusinessCardModal.jsx
import React, { useEffect, useRef, useState } from "react";
import Button from "../ui/Button";

export default function AddBusinessCardModal({ open, onClose, onSubmit }) {
  const inputRef = useRef(null);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) {
      setCode("");
      setSubmitting(false);
      setErr("");
      return;
    }

    const t = setTimeout(() => {
      try {
        inputRef.current?.focus();
      } catch {
        // ignore
      }
    }, 50);

    return () => clearTimeout(t);
  }, [open]);

  async function handleSubmit(e) {
    e?.preventDefault?.();

    const trimmed = String(code || "").trim();
    if (!trimmed) {
      setErr("Enter a business card code first.");
      return;
    }

    setSubmitting(true);
    setErr("");

    try {
      await onSubmit?.(trimmed);
      setCode("");
      onClose?.();
    } catch (e2) {
      setErr(
        e2?.response?.data?.detail ||
          e2?.response?.data?.code?.[0] ||
          e2?.response?.data?.non_field_errors?.[0] ||
          e2?.message ||
          "Could not add business card."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70" onClick={submitting ? undefined : onClose} />

      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-slate-100">Add Business Card</div>
            <div className="text-sm text-slate-400 mt-1">
              Paste the business SW-code to save them to your Business Cards.
            </div>
          </div>

          <Button tone="slate" size="sm" onClick={onClose} disabled={submitting}>
            Close
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">Business Card Code</label>
            <input
              ref={inputRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="SW-XXXXXXXX"
              autoComplete="off"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-500/40"
            />
            <div className="mt-2 text-xs text-slate-500">
              Example: <span className="font-mono text-slate-300">SW-PDdfCZ0_ed9OtYQB</span>
            </div>
          </div>

          {err ? (
            <div className="rounded-xl border border-red-800 bg-red-900/10 p-3 text-sm text-red-200">
              {err}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <Button tone="slate" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" tone="cyan" disabled={submitting}>
              {submitting ? "Adding…" : "Add Card"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}