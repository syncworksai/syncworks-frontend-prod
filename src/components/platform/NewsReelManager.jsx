import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client";

const KIND_OPTIONS = [
  { value: "NEWS", label: "News" },
  { value: "TIP", label: "Tip" },
  { value: "AD", label: "Ad" },
  { value: "ALERT", label: "Alert" },
];

const SCOPE_OPTIONS = [
  { value: "ALL", label: "All Users" },
  { value: "CUSTOMER", label: "Customers" },
  { value: "SBO", label: "SBOs" },
  { value: "PM", label: "Property Managers" },
];

function toInputValue(dt) {
  if (!dt) return "";
  // supports ISO from backend like "2026-01-06T12:00:00Z" or naive
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function NewsReelManager() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  // create form
  const [kind, setKind] = useState("TIP");
  const [targetScope, setTargetScope] = useState("ALL");
  const [zipInput, setZipInput] = useState(""); // "35243,35244"
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [imageFile, setImageFile] = useState(null);

  const zipList = useMemo(() => {
    const z = (zipInput || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    // de-dupe
    return Array.from(new Set(z));
  }, [zipInput]);

  async function load() {
    setErr("");
    try {
      const res = await api.get("/platform/news-reel/");
      const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setItems(list);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to load news reel.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createItem() {
    setErr("");
    setMsg("");

    try {
      const fd = new FormData();
      fd.append("kind", kind);
      fd.append("target_scope", targetScope);
      fd.append("target_zip_codes", JSON.stringify(zipList));
      fd.append("title", title);
      fd.append("body", body);
      fd.append("link_url", linkUrl || "");
      fd.append("is_active", isActive ? "true" : "false");
      if (startsAt) fd.append("starts_at", new Date(startsAt).toISOString());
      if (endsAt) fd.append("ends_at", new Date(endsAt).toISOString());
      if (imageFile) fd.append("image", imageFile);

      await api.post("/platform/news-reel/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMsg("News reel item created ✅");
      setTitle("");
      setBody("");
      setLinkUrl("");
      setZipInput("");
      setStartsAt("");
      setEndsAt("");
      setImageFile(null);
      setKind("TIP");
      setTargetScope("ALL");
      setIsActive(true);
      await load();
    } catch (e) {
      setErr(e?.response?.data ? JSON.stringify(e.response.data) : "Create failed.");
    }
  }

  async function toggleActive(it) {
    setErr("");
    setMsg("");
    try {
      const patch = { is_active: !it.is_active };
      await api.patch(`/platform/news-reel/${it.id}/`, patch);
      await load();
    } catch (e) {
      setErr("Update failed.");
    }
  }

  async function del(it) {
    if (!window.confirm("Delete this item?")) return;
    setErr("");
    setMsg("");
    try {
      await api.delete(`/platform/news-reel/${it.id}/`);
      setMsg("Deleted ✅");
      await load();
    } catch (e) {
      setErr("Delete failed.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <div className="font-semibold">News Reel Manager</div>
            <div className="text-xs text-slate-400 mt-1">
              Use this for tips, announcements, and paid ads. Supports scheduling + expiration + ZIP targeting + image upload.
            </div>
          </div>
          <button className="rounded-xl px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-sm" onClick={load}>
            Refresh
          </button>
        </div>

        {msg ? <div className="mt-3 text-sm text-emerald-200 bg-emerald-900/10 border border-emerald-800 rounded-xl p-3">{msg}</div> : null}
        {err ? <div className="mt-3 text-sm text-red-200 bg-red-900/20 border border-red-800 rounded-xl p-3">{err}</div> : null}

        <div className="mt-4 grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            <div className="grid md:grid-cols-3 gap-2">
              <select className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm" value={kind} onChange={(e) => setKind(e.target.value)}>
                {KIND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>

              <select className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm" value={targetScope} onChange={(e) => setTargetScope(e.target.value)}>
                {SCOPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>

              <label className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm">
                <input type="checkbox" checked={isActive} onChange={() => setIsActive((v) => !v)} />
                Active
              </label>
            </div>

            <input
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
              placeholder="Title (short and punchy)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="w-full min-h-[110px] bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
              placeholder="Body (max ~300 chars)"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />

            <div className="grid md:grid-cols-2 gap-2">
              <input
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                placeholder="Optional link (https://...)"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
              <input
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                placeholder="ZIP targeting (comma separated) e.g. 35243,35244"
                value={zipInput}
                onChange={(e) => setZipInput(e.target.value)}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="text-xs text-slate-400">Start Date/Time (optional)</div>
                <input
                  type="datetime-local"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-slate-400">Expiration Date/Time (optional)</div>
                <input
                  type="datetime-local"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="text-xs text-slate-400">Upload Image (optional)</div>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />
                {imageFile ? <div className="text-xs text-slate-500">Selected: {imageFile.name}</div> : null}
              </div>

              <div className="flex items-end">
                <button
                  className="w-full rounded-xl px-4 py-3 bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-sm font-semibold"
                  onClick={createItem}
                  disabled={!title.trim() || !body.trim()}
                >
                  Create Item
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <div className="font-semibold">Preview</div>
            <div className="text-xs text-slate-400 mt-1">What users see in the reel.</div>

            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-xs text-slate-400">{kind} • {targetScope}{zipList.length ? ` • ZIP: ${zipList.join(", ")}` : ""}</div>
              <div className="font-semibold mt-1">{title || "Title..."}</div>
              <div className="text-sm text-slate-300 mt-1">{body || "Body..."}</div>
              {linkUrl ? <div className="text-xs text-cyan-200 mt-2 break-all">{linkUrl}</div> : null}
              {startsAt || endsAt ? (
                <div className="text-xs text-slate-500 mt-2">
                  {startsAt ? `Starts: ${startsAt}` : ""} {endsAt ? ` • Ends: ${endsAt}` : ""}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
        <div className="font-semibold">Current items</div>
        <div className="text-xs text-slate-400 mt-1">Toggle active for paid ad scheduling or maintenance.</div>

        {!items.length ? (
          <div className="text-slate-400 mt-4">No items yet.</div>
        ) : (
          <div className="mt-4 space-y-2">
            {items.map((it) => (
              <div key={it.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <div className="text-xs text-slate-400">
                      {it.kind} • {it.target_scope}{(it.target_zip_codes || []).length ? ` • ZIP: ${(it.target_zip_codes || []).join(", ")}` : ""} • Live:{" "}
                      <b className={it.is_live ? "text-emerald-300" : "text-slate-500"}>{it.is_live ? "YES" : "NO"}</b>
                    </div>
                    <div className="font-semibold mt-1">{it.title}</div>
                    <div className="text-sm text-slate-300 mt-1">{it.body}</div>
                    {(it.starts_at || it.ends_at) ? (
                      <div className="text-xs text-slate-500 mt-2">
                        {it.starts_at ? `Starts: ${toInputValue(it.starts_at)}` : ""}{" "}
                        {it.ends_at ? `• Ends: ${toInputValue(it.ends_at)}` : ""}
                      </div>
                    ) : null}
                    {it.image ? <div className="text-xs text-slate-500 mt-2">Image: {it.image}</div> : null}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      className="rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-xs"
                      onClick={() => toggleActive(it)}
                    >
                      {it.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      className="rounded-xl px-3 py-2 bg-rose-500/20 border border-rose-500/40 hover:bg-rose-500/30 text-xs"
                      onClick={() => del(it)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
