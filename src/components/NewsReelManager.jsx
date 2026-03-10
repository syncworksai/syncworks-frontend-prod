// src/components/NewsReelManager.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";

const KINDS = [
  { value: "NEWS", label: "NEWS" },
  { value: "TIP", label: "TIP" },
  { value: "AD", label: "AD" },
  { value: "ALERT", label: "ALERT" },
];

function pad(n) {
  return String(n).padStart(2, "0");
}

function toDatetimeLocalValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function nowLocalDatetimeValue() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function addDaysToLocalDatetimeValue(baseLocal, days) {
  const base = baseLocal ? new Date(baseLocal) : new Date();
  if (Number.isNaN(base.getTime())) return nowLocalDatetimeValue();
  base.setDate(base.getDate() + days);
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T${pad(base.getHours())}:${pad(base.getMinutes())}`;
}

function parseZipList(str) {
  if (!str) return [];
  return str
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 50);
}

export default function NewsReelManager() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [kind, setKind] = useState("TIP");
  const [isActive, setIsActive] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [zipTargets, setZipTargets] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [imageFile, setImageFile] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const editingItem = useMemo(() => items.find((x) => x.id === editingId) || null, [items, editingId]);

  async function load() {
    setErr("");
    setMsg("");
    try {
      const res = await api.get("/platform/news-reel/");
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setItems(list);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to load news reel items");
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setKind("TIP");
    setIsActive(true);
    setTitle("");
    setBody("");
    setLinkUrl("");
    setZipTargets("");
    setStartsAt("");
    setEndsAt("");
    setImageFile(null);
  }

  function beginEdit(item) {
    setEditingId(item.id);
    setKind(item.kind || "TIP");
    setIsActive(!!item.is_active);
    setTitle(item.title || "");
    setBody(item.body || "");
    setLinkUrl(item.link_url || "");
    setZipTargets((item.target_zip_codes || []).join(", "));
    setStartsAt(toDatetimeLocalValue(item.starts_at));
    setEndsAt(toDatetimeLocalValue(item.ends_at));
    setImageFile(null);
    setMsg("");
    setErr("");
  }

  function cancelEdit() {
    setEditingId(null);
    resetForm();
  }

  async function createOrUpdate() {
    setErr("");
    setMsg("");

    if (!title.trim() && !body.trim()) {
      setErr("Add at least a title or body.");
      return;
    }

    const fd = new FormData();
    fd.append("kind", kind);
    fd.append("is_active", String(!!isActive));
    fd.append("title", title.trim());
    fd.append("body", body.trim());
    fd.append("link_url", (linkUrl || "").trim());

    const zips = parseZipList(zipTargets);
    zips.forEach((z) => fd.append("target_zip_codes", z));

    // IMPORTANT: send datetime-local string directly (prevents timezone surprise)
    if (startsAt) fd.append("starts_at", startsAt);
    if (endsAt) fd.append("ends_at", endsAt);

    if (imageFile) fd.append("image", imageFile);

    try {
      if (editingId) {
        await api.patch(`/platform/news-reel/${editingId}/`, fd);
        setMsg("Updated ✅");
      } else {
        await api.post(`/platform/news-reel/`, fd);
        setMsg("Created ✅");
      }
      await load();
      cancelEdit();
    } catch (e) {
      const data = e?.response?.data;
      setErr(typeof data === "string" ? data : JSON.stringify(data || "Save failed"));
    }
  }

  async function toggleActive(item) {
    setErr("");
    setMsg("");
    try {
      await api.patch(`/platform/news-reel/${item.id}/`, { is_active: !item.is_active });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to update");
    }
  }

  async function removeItem(item) {
    if (!window.confirm("Delete this news item?")) return;
    setErr("");
    setMsg("");
    try {
      await api.delete(`/platform/news-reel/${item.id}/`);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to delete");
    }
  }

  const liveCount = items.filter((x) => !!x.is_live).length;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-bold">📣 News Reel Manager</div>
          <div className="text-xs text-slate-400 mt-1">
            Tips, ads, alerts. Supports schedule + expiration + ZIP targeting + image upload.
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Live now: <b className="text-slate-200">{liveCount}</b> • Total:{" "}
            <b className="text-slate-200">{items.length}</b>
          </div>
        </div>

        <button
          onClick={load}
          className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
        >
          Refresh
        </button>
      </div>

      {err ? (
        <div className="mt-4 text-sm text-rose-200 bg-rose-900/20 border border-rose-800 rounded-xl p-3">
          {err}
        </div>
      ) : null}

      {msg ? (
        <div className="mt-4 text-sm text-emerald-200 bg-emerald-900/10 border border-emerald-800 rounded-xl p-3">
          {msg}
        </div>
      ) : null}

      <div className="mt-6 grid lg:grid-cols-2 gap-4">
        {/* Create/Edit */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
          <div className="flex items-center justify-between">
            <div className="font-semibold">{editingId ? "Edit item" : "Create item"}</div>
            {editingId ? (
              <button
                className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
                onClick={cancelEdit}
              >
                Cancel
              </button>
            ) : null}
          </div>

          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <select
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-2 text-sm bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                Active
              </label>
            </div>

            <input
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
              placeholder="Title (short)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <textarea
              className="w-full min-h-[110px] bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
              placeholder="Body (what users see)"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />

            {/* Real image upload */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="text-sm font-semibold">Upload image (optional)</div>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="text-xs" />
                {imageFile ? (
                  <button
                    className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
                    onClick={() => setImageFile(null)}
                  >
                    Clear
                  </button>
                ) : null}
              </div>

              {imageFile ? (
                <div className="mt-3 text-xs text-slate-300">
                  Selected: <span className="font-mono">{imageFile.name}</span>
                </div>
              ) : null}

              {editingId && editingItem?.image ? (
                <div className="mt-3">
                  <img src={editingItem.image} alt="Current" className="max-h-40 rounded-xl border border-slate-800 object-cover" />
                </div>
              ) : null}
            </div>

            <input
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
              placeholder="Link URL (optional)"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />

            {/* ZIP targeting */}
            <input
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
              placeholder="Target ZIP codes (optional) e.g. 35242, 35244"
              value={zipTargets}
              onChange={(e) => setZipTargets(e.target.value)}
            />
            <div className="text-xs text-slate-500">
              Empty → shows to everyone. If set → only users matching ZIP will see it.
            </div>

            {/* Scheduling */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="text-sm font-semibold">Schedule</div>

              <div className="mt-3 grid md:grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-slate-400 mb-1">Starts</div>
                  <input
                    type="datetime-local"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                  />
                </div>

                <div>
                  <div className="text-xs text-slate-400 mb-1">Expires</div>
                  <input
                    type="datetime-local"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-3 flex gap-2 flex-wrap">
                <button
                  className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
                  onClick={() => setStartsAt(nowLocalDatetimeValue())}
                >
                  Start now (set)
                </button>
                <button
                  className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
                  onClick={() => setEndsAt("")}
                >
                  No expiration
                </button>

                {/* Expiration presets */}
                <button className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900" onClick={() => setEndsAt(addDaysToLocalDatetimeValue(startsAt, 1))}>
                  +1 day
                </button>
                <button className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900" onClick={() => setEndsAt(addDaysToLocalDatetimeValue(startsAt, 7))}>
                  +7 days
                </button>
                <button className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900" onClick={() => setEndsAt(addDaysToLocalDatetimeValue(startsAt, 30))}>
                  +1 month
                </button>
                <button className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900" onClick={() => setEndsAt(addDaysToLocalDatetimeValue(startsAt, 180))}>
                  +6 months
                </button>
                <button className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900" onClick={() => setEndsAt(addDaysToLocalDatetimeValue(startsAt, 365))}>
                  +12 months
                </button>
              </div>
            </div>

            <button
              className="w-full rounded-xl px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-sm font-semibold"
              onClick={createOrUpdate}
            >
              {editingId ? "Save Changes" : "Create"}
            </button>
          </div>
        </div>

        {/* List */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
          <div className="font-semibold">All items</div>

          <div className="mt-4 space-y-3">
            {items.length === 0 ? (
              <div className="text-sm text-slate-500">No items yet.</div>
            ) : (
              items.map((it) => (
                <div key={it.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] px-2 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-200">
                          {it.kind}
                        </span>
                        {it.is_live ? (
                          <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">
                            LIVE
                          </span>
                        ) : null}
                        {!it.is_active ? (
                          <span className="text-[10px] px-2 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-200">
                            INACTIVE
                          </span>
                        ) : null}
                      </div>

                      <div className="text-lg font-bold mt-2">{it.title || "(no title)"}</div>
                      {it.body ? <div className="text-sm text-slate-300 mt-1">{it.body}</div> : null}

                      <div className="text-xs text-slate-500 mt-2">
                        Starts: {it.starts_at ? new Date(it.starts_at).toLocaleString() : "—"} • Expires:{" "}
                        {it.ends_at ? new Date(it.ends_at).toLocaleString() : "—"}
                      </div>

                      {Array.isArray(it.target_zip_codes) && it.target_zip_codes.length ? (
                        <div className="text-xs text-slate-500 mt-1">
                          ZIP: <span className="text-slate-300">{it.target_zip_codes.join(", ")}</span>
                        </div>
                      ) : null}

                      {it.image ? (
                        <div className="mt-3">
                          <img src={it.image} alt="News" className="max-h-40 rounded-xl border border-slate-800 object-cover" />
                        </div>
                      ) : null}

                      {it.link_url ? (
                        <div className="mt-2">
                          <a className="text-xs text-cyan-200 underline" href={it.link_url} target="_blank" rel="noreferrer">
                            Open link
                          </a>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex gap-2 flex-wrap justify-end">
                      <button
                        className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
                        onClick={() => beginEdit(it)}
                      >
                        Edit
                      </button>

                      <button
                        className="text-xs rounded-xl px-3 py-2 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20"
                        onClick={() => toggleActive(it)}
                      >
                        {it.is_active ? "Deactivate" : "Activate"}
                      </button>

                      <button
                        className="text-xs rounded-xl px-3 py-2 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20"
                        onClick={() => removeItem(it)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
