import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/client";

const inputClass = "min-h-11 w-full rounded-2xl border border-slate-700 bg-black/30 px-3 text-sm text-white outline-none focus:border-cyan-400/60";
const list = (data) => Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

export default function PMPropertyMedia({ workspace, property }) {
  const [items, setItems] = useState([]);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [area, setArea] = useState("EXTERIOR");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    if (!workspace?.id || !property?.id) return;
    const headers = { "X-PM-Workspace-ID": String(workspace.id) };
    const response = await api.get("/pm-hub/property-documents/", { headers, params: { property_id: property.id } });
    setItems(list(response.data).filter((item) => item.checklist_key === "PROPERTY_PHOTO"));
  }

  useEffect(() => { load(); }, [workspace?.id, property?.id]);
  const photos = useMemo(() => items.filter((item) => item.document_url), [items]);

  async function upload() {
    if (!file) return setMessage("Choose a property photo first.");
    setSaving(true); setMessage("");
    try {
      const headers = { "X-PM-Workspace-ID": String(workspace.id), "Content-Type": "multipart/form-data" };
      const form = new FormData();
      form.append("property", property.id);
      form.append("category", "OTHER");
      form.append("title", title || `${property.name} ${area.toLowerCase()} photo`);
      form.append("status", "ACTIVE");
      form.append("document", file);
      form.append("source_name", file.name);
      form.append("checklist_key", "PROPERTY_PHOTO");
      form.append("notes", `[${area}] ${notes}`.trim());
      await api.post("/pm-hub/property-documents/", form, { headers });
      setFile(null); setTitle(""); setNotes(""); setMessage("Property photo uploaded."); await load();
    } catch (err) { setMessage(err?.response?.data?.detail || "Could not upload the property photo."); }
    finally { setSaving(false); }
  }

  async function remove(item) {
    if (!window.confirm(`Delete ${item.title}?`)) return;
    const headers = { "X-PM-Workspace-ID": String(workspace.id) };
    await api.delete(`/pm-hub/property-documents/${item.id}/`, { headers });
    await load();
  }

  return <section className="mb-5 rounded-[28px] border border-cyan-500/15 bg-[#07111f]/92">
    <div className="border-b border-cyan-500/10 px-5 py-4"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Property media</div><h3 className="mt-2 text-xl font-black text-white">Photos & visual property record</h3><p className="mt-1 text-sm text-slate-400">Keep exterior, interior, condition, inspection, make-ready, and marketing photos with the property history.</p></div>
    <div className="grid gap-5 p-5 lg:grid-cols-[360px_1fr]">
      <div className="space-y-3 rounded-2xl border border-slate-800 bg-black/20 p-4"><select className={inputClass} value={area} onChange={(e) => setArea(e.target.value)}><option>EXTERIOR</option><option>INTERIOR</option><option>MOVE_IN</option><option>MOVE_OUT</option><option>MAKE_READY</option><option>INSPECTION</option><option>MARKETING</option><option>OTHER</option></select><input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Photo title (optional)" /><input type="file" accept="image/*" className={inputClass} onChange={(e) => setFile(e.target.files?.[0] || null)} /><textarea rows="3" className={`${inputClass} py-3`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Room, condition, repair note, or other detail" /><button type="button" disabled={saving} onClick={upload} className="min-h-11 w-full rounded-2xl bg-cyan-400 px-4 text-sm font-black text-slate-950 disabled:opacity-50">{saving ? "Uploading..." : "Upload Property Photo"}</button>{message ? <div className="text-xs text-slate-400">{message}</div> : null}</div>
      <div>{photos.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{photos.map((item) => <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-black/20"><a href={item.document_url} target="_blank" rel="noreferrer"><img src={item.document_url} alt={item.title} className="h-44 w-full object-cover" /></a><div className="p-3"><div className="font-bold text-white">{item.title}</div><div className="mt-1 line-clamp-2 text-xs text-slate-500">{item.notes || "Property photo"}</div><div className="mt-3 flex gap-2"><a href={item.document_url} target="_blank" rel="noreferrer" className="rounded-xl border border-cyan-400/30 px-3 py-2 text-xs font-bold text-cyan-100">Open</a><button type="button" onClick={() => remove(item)} className="rounded-xl border border-rose-400/30 px-3 py-2 text-xs font-bold text-rose-100">Delete</button></div></div></article>)}</div> : <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-slate-700 text-sm text-slate-500">No property photos uploaded yet.</div>}</div>
    </div>
  </section>;
}
