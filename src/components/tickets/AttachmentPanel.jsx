// src/components/tickets/AttachmentPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client";

function humanSize(n) {
  const x = Number(n) || 0;
  if (x < 1024) return `${x} B`;
  if (x < 1024 * 1024) return `${(x / 1024).toFixed(1)} KB`;
  return `${(x / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageUrl(url) {
  if (!url) return false;
  const u = String(url).toLowerCase();
  return u.endsWith(".png") || u.endsWith(".jpg") || u.endsWith(".jpeg") || u.endsWith(".webp") || u.endsWith(".gif");
}

function pickUrl(a) {
  return a?.file_url || a?.url || a?.file || null;
}

export default function AttachmentPanel({ ticketId, canUpload = true }) {
  const [items, setItems] = useState([]);
  const [file, setFile] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setErr("");
    try {
      const res = await api.get("/ticket-attachments/", { params: { ticket: ticketId } });
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setItems(list);
    } catch (e) {
      setItems([]);
      setErr(e?.response?.data?.detail || "Failed to load attachments");
    }
  }

  useEffect(() => {
    if (ticketId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  async function upload() {
    if (!file) return;
    setErr("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("ticket", String(ticketId));
      fd.append("file", file);
      await api.post("/ticket-attachments/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFile(null);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const normalized = useMemo(() => {
    return (items || []).map((a) => {
      const url = pickUrl(a);
      const name = a?.filename || a?.name || a?.original_name || `Attachment #${a.id}`;
      const created = a?.created_at || a?.uploaded_at || null;
      const size = a?.size_bytes || a?.size || 0;
      const isImg = isImageUrl(url) || (a?.content_type || "").startsWith("image/");
      return { ...a, _url: url, _name: name, _created: created, _size: size, _isImg: isImg };
    });
  }, [items]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Photos & Attachments</div>
        <button
          onClick={load}
          className="text-[11px] rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
        >
          Refresh
        </button>
      </div>

      {err ? (
        <div className="mt-3 text-xs text-red-200 bg-red-900/10 border border-red-800 rounded-xl p-2">{err}</div>
      ) : null}

      {canUpload ? (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <input
            type="file"
            accept="image/*,application/pdf"
            className="block w-full text-xs text-slate-300 file:mr-3 file:rounded-xl file:border file:border-slate-700 file:bg-slate-950 file:px-3 file:py-2 file:text-xs file:text-slate-200 hover:file:bg-slate-900"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button
            onClick={upload}
            disabled={!file || busy}
            className="text-xs rounded-xl px-3 py-2 bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 disabled:opacity-60"
          >
            {busy ? "Uploading…" : "Upload"}
          </button>
          <div className="text-[11px] text-slate-500">Add photos of the issue, receipts, or documents.</div>
        </div>
      ) : (
        <div className="mt-3 text-xs text-slate-500">Uploads are disabled for your role.</div>
      )}

      <div className="mt-4 space-y-2">
        {normalized.length ? (
          normalized.map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-slate-100 truncate">{a._name}</div>
                <div className="text-[11px] text-slate-500">{humanSize(a._size)}</div>
              </div>

              {a._isImg && a._url ? (
                <a href={a._url} target="_blank" rel="noreferrer" className="block mt-2">
                  <img
                    src={a._url}
                    alt={a._name}
                    className="w-full max-h-[220px] object-cover rounded-xl border border-slate-800"
                  />
                </a>
              ) : null}

              {a._url ? (
                <a className="mt-2 inline-block text-[11px] text-cyan-200 hover:underline" href={a._url} target="_blank" rel="noreferrer">
                  Open
                </a>
              ) : (
                <div className="mt-2 text-[11px] text-slate-500">No link returned (backend can add file_url).</div>
              )}

              {a._created ? (
                <div className="mt-2 text-[11px] text-slate-600">{new Date(a._created).toLocaleString()}</div>
              ) : null}
            </div>
          ))
        ) : (
          <div className="text-xs text-slate-600">No attachments yet.</div>
        )}
      </div>
    </div>
  );
}
