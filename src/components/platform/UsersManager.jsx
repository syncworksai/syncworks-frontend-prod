import React, { useEffect, useState } from "react";
import api from "../../api/client";

export default function UsersManager() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      const res = await api.get(`/platform/users/?q=${encodeURIComponent(q || "")}`);
      const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setItems(list.slice(0, 100));
    } catch (e) {
      setErr("Failed to load users.");
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="font-semibold">Users</div>
      <div className="text-xs text-slate-400 mt-1">Search by email to see role and flags.</div>

      {err ? <div className="mt-3 text-sm text-red-200 bg-red-900/20 border border-red-800 rounded-xl p-3">{err}</div> : null}

      <div className="mt-4 flex gap-2">
        <input className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm" placeholder="Search email..." value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="rounded-xl px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-sm font-semibold" onClick={load}>
          Search
        </button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-xs text-slate-400">
            <tr>
              <th className="text-left py-2 pr-4">Email</th>
              <th className="text-left py-2 pr-4">Role</th>
              <th className="text-left py-2 pr-4">Flags</th>
              <th className="text-left py-2 pr-4">Joined</th>
              <th className="text-left py-2 pr-4">Last Login</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id} className="border-t border-slate-800">
                <td className="py-2 pr-4">{u.email}</td>
                <td className="py-2 pr-4">{u.role}</td>
                <td className="py-2 pr-4 text-xs text-slate-400">
                  {u.is_platform_admin ? "PlatformAdmin " : ""}
                  {u.is_superuser ? "Superuser " : ""}
                  {u.is_staff ? "Staff " : ""}
                  {!u.is_active ? "Inactive" : ""}
                </td>
                <td className="py-2 pr-4 text-xs text-slate-400">{u.date_joined}</td>
                <td className="py-2 pr-4 text-xs text-slate-400">{u.last_login || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {!items.length ? <div className="text-slate-400 mt-3">No users.</div> : null}
      </div>
    </div>
  );
}
