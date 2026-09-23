import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera, CheckCircle2, ChevronDown, ChevronUp, FileImage,
  ImagePlus, Loader2, RefreshCw, Trash2, ZoomIn, ZoomOut,
} from "lucide-react";

import {
  getSportsScorebookImage,
  getSportsScorebookPages,
  removeSportsScorebookPage,
  updateSportsScorebookPage,
  uploadSportsScorebookPage,
} from "../../api/sports";

const MAX_PHOTOS = 16;
const MAX_BYTES = 10 * 1024 * 1024;

function errorText(error) {
  const detail = error?.response?.data?.detail;
  return typeof detail === "string" ? detail : error?.message || "Unable to save this photo.";
}

// Safari can open HEIC on newer iPhones, but Pillow on our backend may not.
// Convert only HEIC; preserve original bytes of supported JPEG/PNG/WebP files.
async function preparePhoto(file) {
  const heic = /image\/hei(c|f)/i.test(file.type || "") || /\.hei(c|f)$/i.test(file.name || "");
  if (!heic) return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    try {
      await image.decode();
    } catch {
      throw new Error("This iPhone photo cannot be converted here. Export it as JPEG and try again.");
    }
    const scale = Math.min(1, 4400 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to prepare the iPhone photo.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const jpeg = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.94));
    if (!jpeg) throw new Error("The image could not be converted to JPEG.");
    return new File([jpeg], (file.name || "scorebook").replace(/\.hei(c|f)$/i, "") + ".jpg", {
      type: "image/jpeg",
      lastModified: file.lastModified || Date.now(),
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function SmallButton({ children, onClick, disabled, primary = false, danger = false, className = "" }) {
  return <button type="button" onClick={onClick} disabled={disabled} className={
    "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold disabled:opacity-40 " +
    (primary ? "border-cyan-300 bg-cyan-300 text-[#03101e] " :
      danger ? "border-rose-300/25 bg-rose-300/10 text-rose-100 " :
        "border-white/10 bg-white/[.04] text-slate-200 ") + className
  }>{children}</button>;
}

export default function ScorebookPhotoArchive({ gameId, canScore, canManage }) {
  const [expanded, setExpanded] = useState(false);
  const [pages, setPages] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [imageRetry, setImageRetry] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [zoom, setZoom] = useState(1);
  const cameraRef = useRef(null);
  const libraryRef = useRef(null);

  const selected = pages.find((page) => Number(page.id) === Number(selectedId)) || null;
  const reviewedCount = pages.filter((page) => page.review_status === "REVIEWED").length;

  const reload = useCallback(async () => {
    if (!gameId || !canScore) return;
    setLoading(true);
    try {
      const rows = await getSportsScorebookPages(gameId);
      setPages(rows);
      setSelectedId((old) => rows.some((page) => Number(page.id) === Number(old))
        ? old : rows[0]?.id || null);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [gameId, canScore]);

  useEffect(() => {
    if (expanded && canScore) reload();
  }, [expanded, canScore, reload]);

  useEffect(() => {
    if (!expanded || !selectedId || !canScore) {
      setImageUrl("");
      return undefined;
    }
    let alive = true;
    let objectUrl = "";
    setImageUrl("");
    setImageLoading(true);
    setZoom(1);
    getSportsScorebookImage(gameId, selectedId)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (alive) setImageUrl(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      })
      .catch((err) => { if (alive) setError(errorText(err)); })
      .finally(() => { if (alive) setImageLoading(false); });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [expanded, selectedId, gameId, canScore, imageRetry]);

  useEffect(() => {
    setDraftNotes(selected?.notes || "");
  }, [selected?.id, selected?.notes]);

  async function addPhotos(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    if (pages.length + files.length > MAX_PHOTOS) {
      setError("You can attach up to 16 photos per game.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    let lastPageId = null;
    try {
      for (let index = 0; index < files.length; index += 1) {
        setProgress("Uploading photo " + (index + 1) + " of " + files.length);
        const file = await preparePhoto(files[index]);
        if (file.size > MAX_BYTES) {
          throw new Error(file.name + " exceeds 10 MB. Export a smaller JPEG.");
        }
        if (!/^image\/(jpeg|png|webp)$/i.test(file.type || "")) {
          throw new Error("Please choose JPEG, PNG or WebP scorebook photos.");
        }
        const saved = await uploadSportsScorebookPage(gameId, file);
        lastPageId = saved.id;
      }
      setNotice(files.length + " scorebook photo" + (files.length === 1 ? "" : "s") +
        " uploaded. No statistics were changed.");
    } catch (err) {
      setError(errorText(err) + " Any earlier successful photos remain saved.");
    } finally {
      setProgress("");
      setBusy(false);
      await reload();
      if (lastPageId) setSelectedId(lastPageId);
    }
  }

  async function updateSelected(payload) {
    if (!canManage || !selected || busy) return;
    setBusy(true);
    setError("");
    try {
      const updated = await updateSportsScorebookPage(gameId, selected.id, payload);
      setPages((current) => current.map((page) => page.id === updated.id ? updated : page));
      setNotice(payload.reviewed === true ? "Photo marked reviewed. Digital game statistics are unchanged."
        : payload.reviewed === false ? "Review status cleared." : "Page notes saved.");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function removeSelected() {
    if (!canManage || !selected || busy) return;
    if (!window.confirm("Remove this scorebook photo? This cannot be undone. Digital statistics will not be changed.")) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await removeSportsScorebookPage(gameId, selected.id);
      setNotice("Source photo removed. Digital statistics were not changed.");
      await reload();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  if (!canScore) return null;

  return (
    <section className="rounded-2xl border border-violet-300/20 bg-[#081222] p-3 text-slate-100">
      <button
        type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}
        className="flex min-h-12 w-full items-center justify-between gap-3 text-left"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-violet-300/25 bg-violet-300/10 text-violet-200">
            <FileImage className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-black text-white">Paper Game Book</span>
            <span className="block text-[11px] text-slate-400">
              Photograph or attach an old scorebook · private to scoring staff
              {expanded && pages.length ? " · " + reviewedCount + "/" + pages.length + " images reviewed" : ""}
            </span>
          </span>
        </span>
        {expanded ? <ChevronUp className="h-5 w-5 shrink-0 text-violet-200" /> :
          <ChevronDown className="h-5 w-5 shrink-0 text-violet-200" />}
      </button>

      {expanded ? (
        <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
          <p className="rounded-xl border border-amber-300/20 bg-amber-300/[.06] px-3 py-2 text-[11px] leading-5 text-amber-100">
            Accuracy first: photos are source evidence, not official stats. Enter the paper plays into
            this game's digital book, compare every player and inning, then let a coach mark the image reviewed.
            There is no automatic handwriting transcription in this version.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <SmallButton primary disabled={busy || pages.length >= MAX_PHOTOS}
              onClick={() => cameraRef.current?.click()}><Camera className="h-4 w-4" /> Take photo</SmallButton>
            <SmallButton disabled={busy || pages.length >= MAX_PHOTOS}
              onClick={() => libraryRef.current?.click()}><ImagePlus className="h-4 w-4" /> Photos / Files</SmallButton>
          </div>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment"
            className="sr-only" aria-label="Photograph paper scorebook"
            onChange={(event) => {
              const selectedFiles = Array.from(event.target.files || []);
              event.target.value = "";
              addPhotos(selectedFiles);
            }} />
          <input ref={libraryRef} type="file" accept="image/*,.heic,.heif" multiple
            className="sr-only" aria-label="Attach existing paper scorebook photos"
            onChange={(event) => {
              const selectedFiles = event.target.files;
              event.target.value = "";
              addPhotos(selectedFiles);
            }} />

          {progress ? <p role="status" className="flex items-center gap-2 text-xs text-cyan-200">
            <Loader2 className="h-4 w-4 animate-spin" />{progress}
          </p> : null}
          {error ? <p role="alert" className="rounded-lg border border-rose-300/20 bg-rose-300/10 p-2 text-xs text-rose-100">{error}</p> : null}
          {notice ? <p role="status" className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-2 text-xs text-emerald-100">{notice}</p> : null}

          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-white">
              Source photos {pages.length} / {MAX_PHOTOS}
            </span>
            <SmallButton disabled={loading || busy} onClick={reload}>
              <RefreshCw className={"h-3.5 w-3.5 " + (loading ? "animate-spin" : "")} /> Refresh
            </SmallButton>
          </div>
          {loading && !pages.length ? <p className="py-4 text-center text-xs text-slate-400">Loading images…</p> : null}
          {!loading && !pages.length ? <p className="rounded-xl border border-dashed border-white/15 p-4 text-center text-xs leading-5 text-slate-400">
            No photos attached yet. For the clearest handwriting, shoot straight above a flat page in bright, even light.
            Upload one picture per page.
          </p> : null}

          {pages.length ? (
            <div className="grid gap-3 lg:grid-cols-[minmax(12rem,15rem)_minmax(0,1fr)]">
              <div className="flex gap-2 overflow-x-auto pb-1 lg:max-h-[36rem] lg:flex-col lg:overflow-y-auto">
                {pages.map((page) => (
                  <button key={page.id} type="button" onClick={() => setSelectedId(page.id)}
                    className={"min-w-[10rem] max-w-[15rem] shrink-0 rounded-xl border p-2.5 text-left " +
                      (Number(selectedId) === Number(page.id)
                        ? "border-cyan-300/70 bg-cyan-300/10" : "border-white/10 bg-white/[.025]")}>
                    <span className="flex items-center gap-2 text-xs font-black text-white">
                      <FileImage className="h-4 w-4 shrink-0 text-violet-200" /> Page {page.page_number}
                    </span>
                    <span className="mt-1 block truncate text-[10px] text-slate-400">{page.original_filename}</span>
                    <span className={"mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold " +
                      (page.review_status === "REVIEWED"
                        ? "bg-emerald-300/15 text-emerald-200" : "bg-amber-300/10 text-amber-100")}>
                      {page.review_status === "REVIEWED" ? <><CheckCircle2 className="h-3 w-3" /> Photo reviewed</> : "Needs review"}
                    </span>
                  </button>
                ))}
              </div>

              {selected ? <div className="min-w-0 space-y-3">
                <div className="rounded-xl border border-white/10 bg-[#020710] p-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-white">Page {selected.page_number}</span>
                    <div className="flex items-center gap-1">
                      <SmallButton disabled={zoom <= 1} onClick={() => setZoom((value) => Math.max(1, value - 0.5))}
                        className="min-h-9 !px-2" ><ZoomOut className="h-4 w-4" /></SmallButton>
                      <span className="w-9 text-center text-[10px] text-slate-400">{Math.round(zoom * 100)}%</span>
                      <SmallButton disabled={zoom >= 3} onClick={() => setZoom((value) => Math.min(3, value + 0.5))}
                        className="min-h-9 !px-2" ><ZoomIn className="h-4 w-4" /></SmallButton>
                    </div>
                  </div>
                  <div className="max-h-[62vh] min-h-40 overflow-auto rounded-lg bg-white/5">
                    {imageLoading ? <div className="flex min-h-40 items-center justify-center gap-2 text-xs text-slate-400">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading full-resolution image…
                    </div> : imageUrl ? <img
                      src={imageUrl} alt={"Paper scorebook page " + selected.page_number}
                      draggable={false} style={{ width: Math.round(zoom * 100) + "%", maxWidth: "none" }}
                      className="h-auto object-contain" /> :
                      <div className="p-5 text-center text-xs text-slate-400">
                        Image not available. <button type="button" className="underline" onClick={() => setImageRetry((value) => value + 1)}>Retry</button>
                      </div>}
                  </div>
                  <div className="mt-2 text-[10px] text-slate-500">
                    {selected.image_width} × {selected.image_height} original pixels. Zoom in to verify handwriting.
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <label htmlFor={"scorebook-notes-" + selected.id} className="mb-1 block text-[11px] font-bold text-slate-200">
                    Review notes / unclear handwriting
                  </label>
                  <textarea id={"scorebook-notes-" + selected.id} rows={3} maxLength={1000}
                    value={draftNotes} disabled={!canManage || busy} onChange={(event) => setDraftNotes(event.target.value)}
                    placeholder="Example: Confirm batter #7 in inning 3; original writer's mark is unclear."
                    className="w-full rounded-lg border border-white/10 bg-[#030b16] p-2 text-base text-white placeholder:text-slate-500 sm:text-xs" />
                  {canManage ? <div className="mt-2 grid grid-cols-2 gap-2">
                    <SmallButton disabled={busy || draftNotes === (selected.notes || "")}
                      onClick={() => updateSelected({ notes: draftNotes })}>Save notes</SmallButton>
                    <SmallButton disabled={busy} primary={selected.review_status !== "REVIEWED"}
                      onClick={() => {
                        const markReviewed = selected.review_status !== "REVIEWED";
                        if (markReviewed && !window.confirm("Have you compared this paper page against the digital Game Book? Marking the image reviewed does not change player stats.")) return;
                        updateSelected({ reviewed: markReviewed, notes: draftNotes });
                      }}>
                      {selected.review_status === "REVIEWED" ? "Reopen review" : "Mark photo reviewed"}
                    </SmallButton>
                  </div> : <p className="mt-2 text-[10px] text-slate-500">A coach or team manager reviews source pages.</p>}
                  {canManage ? <SmallButton danger className="mt-2 w-full" disabled={busy} onClick={removeSelected}>
                    <Trash2 className="h-3.5 w-3.5" /> Remove this photo
                  </SmallButton> : null}
                </div>
              </div> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
