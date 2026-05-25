import React, { useState } from "react";

const input = "h-10 rounded-2xl border border-slate-800 bg-slate-950/60 px-3 text-sm text-slate-100 outline-none focus:border-cyan-500/50";

export default function AffiliateCreateCard({ onSubmit }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    status: "ACTIVE",
  });

  async function submit(e) {
    e.preventDefault();
    await onSubmit?.(form);
    setForm({ name: "", email: "", phone: "", status: "ACTIVE" });
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-slate-800 bg-slate-950/35 p-5">
      <div className="font-bold">Create Affiliate</div>
      <div className="text-xs text-slate-500 mt-1">Manual creation for internal onboarding or support corrections.</div>

      <div className="mt-4 grid sm:grid-cols-2 gap-3">
        <input className={input} placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        <input className={input} placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
        <input className={input} placeholder="Phone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
        <select className={input} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
          <option value="PENDING">Pending</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="DEACTIVATED">Deactivated</option>
        </select>
      </div>

      <button className="mt-4 h-10 px-4 rounded-2xl border border-cyan-500/35 bg-cyan-500/18 text-cyan-100 font-semibold text-sm">
        Create
      </button>
    </form>
  );
}