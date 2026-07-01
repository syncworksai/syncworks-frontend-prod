import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/client";

function humanSize(value) {
  const bytes = Number(value) || 0;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageUrl(url) {
  if (!url) return false;
  const clean = String(url).toLowerCase().split("?")[0];
  return [".png", ".jpg", ".jpeg", ".webp", ".gif", ".heic", ".heif"].some((ext) =>
    clean.endsWith(ext)
  );
}

function pickUrl(item) {
  return item?.file_url || item?.url || item?.file || null;
}

function formatWhen(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function fileIcon(name, isImage) {
  if (isImage) return "▧";
  const lower = String(name || "").toLowerCase();
  if (lower.endsWith(".pdf")) return "PDF";
  return "DOC";
}

function SelectedFileCard({ entry, onRemove }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/75 p-3">
      <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
        {entry.preview ? (
          <img src={entry.preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-[10px] font-black text-slate-400">
            {fileIcon(entry.file.name, false)}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-black text-slate-200">{entry.file.name}</div>
        <div className="mt-1 text-[10px] text-slate-500">{humanSize(entry.file.size)}</div>
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-rose-400/20 bg-rose-400/10 text-sm font-black text-rose-200"
        aria-label={`Remove ${entry.file.name}`}
      >
        ×
      </button>
    </div>
  );
}

export default function AttachmentPanel({ ticketId, canUpload = true, isCustomer = false }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const res = await api.get("/ticket-attachments/", {
        params: { ticket: ticketId },
      });
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setItems(list);
    } catch (error) {
      setItems([]);
      setErr(error?.response?.data?.detail || "Failed to load attachments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (ticketId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  useEffect(() => {
    return () => {
      selected.forEach((entry) => {
        if (entry.preview) URL.revokeObjectURL(entry.preview);
      });
    };
  }, [selected]);

  function addFiles(fileList) {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    const next = incoming.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
      file,
      preview: file.type?.startsWith("image/") ? URL.createObjectURL(file) : "",
    }));

    setSelected((current) => [...current, ...next].slice(0, 12));
    setErr("");
  }

  function removeSelected(id) {
    setSelected((current) => {
      const target = current.find((entry) => entry.id === id);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return current.filter((entry) => entry.id !== id);
    });
  }

  function clearSelected() {
    selected.forEach((entry) => {
      if (entry.preview) URL.revokeObjectURL(entry.preview);
    });
    setSelected([]);
  }

  async function upload() {
    if (!selected.length || busy) return;

    setErr("");
    setBusy(true);
    let completed = 0;

    try {
      for (const entry of selected) {
        setUploadStatus(`Uploading ${completed + 1} of ${selected.length}…`);

        const formData = new FormData();
        formData.append("ticket", String(ticketId));
        formData.append("file", entry.file);

        await api.post("/ticket-attachments/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        completed += 1;
      }

      clearSelected();
      setUploadStatus(`${completed} file${completed === 1 ? "" : "s"} uploaded`);
      await load();

      window.setTimeout(() => setUploadStatus(""), 2500);
    } catch (error) {
      setErr(
        error?.response?.data?.detail ||
          `Upload stopped after ${completed} of ${selected.length} files.`
      );
    } finally {
      setBusy(false);
    }
  }

  const normalized = useMemo(() => {
    return (items || []).map((item) => {
      const url = pickUrl(item);
      const name =
        item?.filename ||
        item?.name ||
        item?.original_name ||
        `Attachment #${item.id}`;
      const created = item?.created_at || item?.uploaded_at || null;
      const size = item?.size_bytes || item?.size || 0;
      const isImage =
        isImageUrl(url) || String(item?.content_type || "").startsWith("image/");

      return {
        ...item,
        _url: url,
        _name: name,
        _created: created,
        _size: size,
        _isImage: isImage,
      };
    });
  }, [items]);

  const imageCount = normalized.filter((item) => item._isImage).length;
  const documentCount = normalized.length - imageCount;

  return (
    <>
      <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950/60 p-3 sm:p-5">
        <div className="flex items-start justify-between gap-3 px-1">
          <div>
            <div className="text-lg font-black text-white">
              {isCustomer ? "Photos & Files" : "Job Photos & Files"}
            </div>
            <div className="mt-1 text-xs leading-5 text-slate-400">
              {isCustomer
                ? "Show the issue clearly, add receipts, or share access information."
                : "Capture before-and-after photos, receipts, documents, and proof of work."}
            </div>
          </div>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="shrink-0 rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] font-bold text-slate-300 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.06] p-3 text-center">
            <div className="text-xl font-black text-white">{normalized.length}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Total
            </div>
          </div>
          <div className="rounded-2xl border border-violet-400/15 bg-violet-400/[0.06] p-3 text-center">
            <div className="text-xl font-black text-white">{imageCount}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Photos
            </div>
          </div>
          <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.06] p-3 text-center">
            <div className="text-xl font-black text-white">{documentCount}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Files
            </div>
          </div>
        </div>

        {err ? (
          <div className="mt-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
            {err}
          </div>
        ) : null}

        {uploadStatus ? (
          <div className="mt-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-200">
            {uploadStatus}
          </div>
        ) : null}

        {canUpload ? (
          <div className="mt-4 rounded-3xl border border-slate-800 bg-[#020617] p-4">
            <input
              ref={galleryInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = "";
              }}
            />

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = "";
              }}
            />

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="min-h-[88px] rounded-3xl border border-cyan-300/25 bg-gradient-to-br from-cyan-500/20 to-blue-500/10 p-4 text-left"
              >
                <div className="text-2xl">📷</div>
                <div className="mt-2 text-sm font-black text-white">Take photo</div>
                <div className="mt-1 text-[11px] text-slate-400">Open phone camera</div>
              </button>

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="min-h-[88px] rounded-3xl border border-violet-300/20 bg-violet-500/10 p-4 text-left"
              >
                <div className="text-2xl">▧</div>
                <div className="mt-2 text-sm font-black text-white">Choose files</div>
                <div className="mt-1 text-[11px] text-slate-400">Photos or PDFs</div>
              </button>
            </div>

            {selected.length ? (
              <div className="mt-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-white">
                      Ready to upload
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      {selected.length} selected · maximum 12 at once
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={clearSelected}
                    disabled={busy}
                    className="rounded-xl border border-slate-700 px-3 py-2 text-[10px] font-bold text-slate-400 disabled:opacity-40"
                  >
                    Clear
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {selected.map((entry) => (
                    <SelectedFileCard
                      key={entry.id}
                      entry={entry}
                      onRemove={() => removeSelected(entry.id)}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={upload}
                  disabled={busy}
                  className="mt-3 min-h-[52px] w-full rounded-2xl border border-cyan-300/35 bg-gradient-to-r from-cyan-500 to-blue-600 px-4 text-sm font-black text-white shadow-[0_0_24px_rgba(34,211,238,0.18)] disabled:opacity-50"
                >
                  {busy
                    ? uploadStatus || "Uploading…"
                    : `Upload ${selected.length} file${selected.length === 1 ? "" : "s"}`}
                </button>
              </div>
            ) : (
              <div className="mt-3 text-center text-[11px] leading-5 text-slate-600">
                Add clear photos before work, during service, or after completion.
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-xs text-slate-500">
            Uploads are disabled for your role.
          </div>
        )}

        <div className="mt-4">
          <div className="flex items-center justify-between gap-3 px-1">
            <div>
              <div className="text-sm font-black text-white">Service gallery</div>
              <div className="mt-1 text-[11px] text-slate-500">
                Tap a photo to view it full screen.
              </div>
            </div>
          </div>

          {loading && !normalized.length ? (
            <div className="mt-3 grid min-h-[180px] place-items-center rounded-3xl border border-slate-800 text-sm text-slate-500">
              Loading files…
            </div>
          ) : normalized.length ? (
            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
              {normalized.map((item) => (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/75"
                >
                  {item._isImage && item._url ? (
                    <button
                      type="button"
                      onClick={() => setLightbox(item)}
                      className="block aspect-square w-full overflow-hidden bg-slate-900"
                    >
                      <img
                        src={item._url}
                        alt={item._name}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
                      />
                    </button>
                  ) : (
                    <div className="grid aspect-square place-items-center bg-gradient-to-br from-slate-900 to-slate-950">
                      <div className="text-center">
                        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-xs font-black text-amber-100">
                          {fileIcon(item._name, false)}
                        </div>
                        <div className="mt-3 px-3 text-[10px] text-slate-500">
                          Document
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-3">
                    <div className="truncate text-xs font-black text-slate-200">
                      {item._name}
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-500">
                      <span>{humanSize(item._size)}</span>
                      <span>{formatWhen(item._created)}</span>
                    </div>

                    {item._url ? (
                      <a
                        href={item._url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex min-h-9 w-full items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 text-[11px] font-black text-cyan-100"
                      >
                        {item._isImage ? "Open original" : "Open file"}
                      </a>
                    ) : (
                      <div className="mt-3 text-[10px] text-slate-600">
                        No file link returned
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-3 grid min-h-[190px] place-items-center rounded-3xl border border-dashed border-slate-800 p-6 text-center">
              <div>
                <div className="text-3xl">📷</div>
                <div className="mt-3 text-sm font-black text-white">
                  No photos or files yet
                </div>
                <div className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
                  Add photos of the issue or proof of completed work so everyone has the same record.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {lightbox?._url ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 p-4 backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-label={lightbox._name}
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-2xl border border-white/15 bg-slate-950/80 text-xl font-black text-white"
            aria-label="Close image"
          >
            ×
          </button>

          <div
            className="max-h-full max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={lightbox._url}
              alt={lightbox._name}
              className="max-h-[78vh] max-w-full rounded-3xl border border-white/10 object-contain shadow-2xl"
            />
            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/90 p-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-black text-white">
                  {lightbox._name}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {formatWhen(lightbox._created)}
                </div>
              </div>
              <a
                href={lightbox._url}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-xs font-black text-cyan-100"
              >
                Original
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
