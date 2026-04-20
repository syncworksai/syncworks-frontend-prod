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

export default function AttachmentPanel({ ticketId, canUpload = true, isCustomer = false }) {
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
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-lg font-extrabold">Photos & Attachments</div>
          <div className="text-xs text-slate-400 mt-1">
            {isCustomer
              ? "Upload photos of the issue, receipts, or anything the business needs to review."
              : "Store photos, receipts, documents, and proof of work here."}
          </div>
        </div>

        <button
          onClick={load}
          className="text-[11px] rounded-2xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
        >
          Refresh
        </button>
      </div>

      {err ? (
        <div className="mt-3 text-xs text-red-200 bg-red-900/10 border border-red-800 rounded-2xl p-3">{err}</div>
      ) : null}

      {canUpload ? (
        <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-950/30 p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="file"
              accept="image/*,application/pdf"
              className="block w-full text-xs text-slate-300 file:mr-3 file:rounded-2xl file:border file:border-slate-700 file:bg-slate-950 file:px-3 file:py-2.5 file:text-xs file:text-slate-200 hover:file:bg-slate-900"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <button
              onClick={upload}
              disabled={!file || busy}
              className="text-xs rounded-2xl px-4 py-3 bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 disabled:opacity-60"
            >
              {busy ? "Uploading…" : "Upload"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 text-xs text-slate-500">Uploads are disabled for your role.</div>
      )}

      <div className="mt-4 grid md:grid-cols-2 gap-3">
        {normalized.length ? (
          normalized.map((a) => (
            <div key={a.id} className="rounded-3xl border border-slate-800 bg-slate-950/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-slate-100 truncate">{a._name}</div>
                <div className="text-[11px] text-slate-500">{humanSize(a._size)}</div>
              </div>

              {a._isImg && a._url ? (
                <a href={a._url} target="_blank" rel="noreferrer" className="block mt-3">
                  <img
                    src={a._url}
                    alt={a._name}
                    className="w-full max-h-[240px] object-cover rounded-2xl border border-slate-800"
                  />
                </a>
              ) : null}

              <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                {a._url ? (
                  <a
                    className="inline-flex items-center justify-center h-9 text-[11px] rounded-2xl px-3 border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/15"
                    href={a._url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open File
                  </a>
                ) : (
                  <div className="text-[11px] text-slate-500">No link returned</div>
                )}

                {a._created ? (
                  <div className="text-[11px] text-slate-600">{new Date(a._created).toLocaleString()}</div>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4 text-sm text-slate-500 md:col-span-2">
            No attachments yet.
          </div>
        )}
      </div>
    </div>
  );
}