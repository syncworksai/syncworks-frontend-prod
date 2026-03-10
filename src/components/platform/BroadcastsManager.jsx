import React, { useState } from "react";
import api from "../../api/client";

export default function BroadcastsManager() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sendTo, setSendTo] = useState("ALL");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function send() {
    setErr("");
    setMsg("");
    try {
      const res = await api.post("/platform/broadcasts/", { title, body, send_to: sendTo });
      setMsg(`Broadcast sent ✅ (${res.data?.recipients || "?"} recipients)`);
      setTitle("");
      setBody("");
      setSendTo("ALL");
    } catch (e) {
      setErr(e?.response?.data?.detail || "Broadcast failed.");
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="font-semibold">Broadcasts</div>
      <div className="text-xs text-slate-400 mt-1">Send a message to users → shows in their Notifications.</div>

      {msg ? <div className="mt-3 text-sm text-emerald-200 bg-emerald-900/10 border border-emerald-800 rounded-xl p-3">{msg}</div> : null}
      {err ? <div className="mt-3 text-sm text-red-200 bg-red-900/20 border border-red-800 rounded-xl p-3">{err}</div> : null}

      <div className="mt-4 grid md:grid-cols-3 gap-2">
        <select className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm" value={sendTo} onChange={(e) => setSendTo(e.target.value)}>
          <option value="ALL">ALL</option>
          <option value="CUSTOMER">CUSTOMERS</option>
          <option value="SBO">SBO</option>
          <option value="PM">PM</option>
        </select>
        <input className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button className="rounded-xl px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-sm font-semibold" onClick={send} disabled={!title.trim() || !body.trim()}>
          Send
        </button>
      </div>

      <textarea className="mt-2 w-full min-h-[140px] bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm" placeholder="Message..." value={body} onChange={(e) => setBody(e.target.value)} />
    </div>
  );
}
