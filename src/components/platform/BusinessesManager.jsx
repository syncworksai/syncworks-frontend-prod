import React, { useEffect, useState } from "react";
import api from "../../api/client";

export default function BusinessesManager() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      const res = await api.get(`/platform/businesses/?q=${encodeURIComponent(q || "")}`);
      const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setItems(list);
    } catch (e) {
      setErr("Failed to load businesses.");
    }
  }

  useEffect(() => { load(); }, []);

  async function lock(id) {
    const reason = window.prompt("Lock reason:", "Past due billing");
    if (!reason) return;
    setMsg(""); setErr("");
    try {
      await api.post(`/platform/businesses/${id}/lock/`, { reason });
      setMsg("Locked ✅");
      await load();
    } catch (e) {
      setErr("Lock failed.");
    }
  }

  async function unlock(id) {
    if (!window.confirm("Unlock this business?")) return;
    setMsg(""); setErr("");
    try {
      await api.post(`/platform/businesses/${id}/unlock/`);
      setMsg("Unlocked ✅");
      await load();
    } catch (e) {
      setErr("Unlock failed.");
    }
  }

  async function message(id) {
    const title = window.prompt("Title:", "Action Needed");
    if (!title) return;
    const body = window.prompt("Body:", "Please update billing method today.");
    if (!body) return;

    setMsg(""); setErr("");
    try {
      await api.post(`/platform/businesses/${id}/message-owner/`, { title, body });
      setMsg("Message sent ✅");
    } catch (e) {
      setErr("Message failed.");
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <div className="font-semibold">Businesses</div>
          <div className="text-xs text-slate-400 mt-1">Search, message, and lock/unlock immediately.</div>
        </div>
        <button className="rounded-xl px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-sm" onClick={load}>
          Refresh
        </button>
      </div>

      {msg ? <div className="mt-3 text-sm text-emerald-200 bg-emerald-900/10 border border-emerald-800 rounded-xl p-3">{msg}</div> : null}
      {err ? <div className="mt-3 text-sm text-red-200 bg-red-900/20 border border-red-800 rounded-xl p-3">{err}</div> : null}

      <div className="mt-4 flex gap-2">
        <input className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm" placeholder="Search by name..." value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="rounded-xl px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-sm font-semibold" onClick={load}>
          Search
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {items.map((b) => (
          <div key={b.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <div className="font-semibold">{b.name}</div>
                <div className="text-xs text-slate-500 mt-1">
                  Members: {b.members_count ?? "-"} • Card: <b>{b.stripe_setup_complete ? "Yes" : "No"}</b> • Locked:{" "}
                  <b className={b.is_locked ? "text-rose-300" : "text-emerald-300"}>
                    {b.is_locked ? "Yes" : "No"}
                  </b>
                  {b.lock_reason ? <span> • {b.lock_reason}</span> : null}
                </div>
                {(b.next_due_date || b.grace_until) ? (
                  <div className="text-xs text-slate-500 mt-1">
                    Due: {b.next_due_date || "-"} • Grace: {b.grace_until || "-"}
                  </div>
                ) : null}
              </div>

              <div className="flex gap-2 flex-wrap">
                <button className="rounded-xl px-3 py-2 bg-indigo-500/20 border border-indigo-500/40 hover:bg-indigo-500/30 text-xs" onClick={() => message(b.id)}>
                  Message
                </button>
                {!b.is_locked ? (
                  <button className="rounded-xl px-3 py-2 bg-rose-500/20 border border-rose-500/40 hover:bg-rose-500/30 text-xs" onClick={() => lock(b.id)}>
                    Lock
                  </button>
                ) : (
                  <button className="rounded-xl px-3 py-2 bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-xs" onClick={() => unlock(b.id)}>
                    Unlock
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {!items.length ? <div className="text-slate-400">No businesses found.</div> : null}
      </div>
    </div>
  );
}
