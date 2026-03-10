// src/components/pm/docs/DeleteDocModal.jsx
import React from "react";
import { Modal, Input } from "./docsUi";

export default function DeleteDocModal({
  open,
  deleteBusy,
  deleteTarget,
  deleteText,
  setDeleteText,
  deleteErr,
  onClose,
  onConfirm,
}) {
  return (
    <Modal open={open} title="Delete document" onClose={() => (deleteBusy ? null : onClose?.())} disableClose={deleteBusy}>
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
        <div className="text-slate-100 font-semibold">{deleteTarget?.title || deleteTarget?.file_name || `#${deleteTarget?.id || ""}`}</div>
        <div className="text-xs text-slate-300 mt-1">Type DELETE to confirm.</div>
      </div>

      <div className="mt-4 grid gap-3">
        <Input value={deleteText} onChange={(e) => setDeleteText(e.target.value)} disabled={deleteBusy} placeholder="DELETE" />

        {deleteErr ? <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">{deleteErr}</div> : null}

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={deleteBusy}
            className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900 disabled:opacity-60"
            title="Cancel"
            type="button"
          >
            ✖
          </button>
          <button
            onClick={onConfirm}
            disabled={deleteBusy || deleteText.trim().toUpperCase() !== "DELETE"}
            className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-100 hover:bg-rose-500/15 disabled:opacity-60"
            title="Delete"
            type="button"
          >
            🗑️ Delete
          </button>
        </div>
      </div>
    </Modal>
  );
}
