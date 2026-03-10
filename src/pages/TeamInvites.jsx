// src/pages/TeamInvites.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import BusinessPicker from "../components/BusinessPicker";

const PERMS = [
  ["can_manage_team", "Manage Team"],
  ["can_manage_settings", "Manage Settings"],
  ["can_view_financials", "View Financials"],
  ["can_manage_invoices", "Manage Invoices"],
  ["can_create_tickets", "Create Tickets"],
  ["can_assign_tickets", "Assign Tickets"],
  ["can_close_tickets", "Close Tickets"],
  ["can_manage_schedule", "Manage Schedule"],
  ["can_manage_categories", "Manage Categories"],
  ["can_manage_properties", "Manage Properties"],
  ["can_manage_connections", "Manage Connections"],
];

export default function TeamInvites() {
  const [invites, setInvites] = useState([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("TECHNICIAN");
  const [codeToAccept, setCodeToAccept] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [perms, setPerms] = useState(() => {
    const obj = {};
    PERMS.forEach(([k]) => (obj[k] = k === "can_create_tickets"));
    return obj;
  });

  const loadInvites = async () => {
    setErr("");
    try {
      const res = await api.get("/team/invites/");
      setInvites(res.data?.results || res.data || []);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to load invites (check business context).");
      setInvites([]);
    }
  };

  useEffect(() => {
    loadInvites();
  }, []);

  const togglePerm = (k) => setPerms((p) => ({ ...p, [k]: !p[k] }));

  const createInvite = async () => {
    setMsg("");
    setErr("");
    try {
      const payload = { email: email || null, role, ...perms };
      await api.post("/team/invites/", payload);
      setEmail("");
      await loadInvites();
      setMsg("Invite created ✅");
    } catch (e) {
      setErr(e?.response?.data?.detail || JSON.stringify(e?.response?.data || {}) || "Failed to create invite");
    }
  };

  const acceptInvite = async () => {
    setMsg("");
    setErr("");
    try {
      await api.post("/team/invites/accept/", { code: codeToAccept });
      setCodeToAccept("");
      setMsg("Invite accepted ✅ (reload /auth/me and set business context if needed)");
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to accept invite");
    }
  };

  const copy = async (t) => {
    await navigator.clipboard.writeText(t);
    alert("Copied!");
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-bold">Team Invites</div>
            <div className="text-xs text-slate-400">Invite employees & subcontractors with permission snapshots</div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <BusinessPicker />
            <Link
              to="/sbo"
              className="rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-xs"
            >
              Back
            </Link>
            <button
              className="rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-xs"
              onClick={loadInvites}
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {msg && <div className="text-sm text-emerald-300 bg-emerald-900/10 border border-emerald-800 rounded-xl p-3">{msg}</div>}
        {err && <div className="text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-xl p-3">{err}</div>}

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-5">
            <div className="font-semibold mb-3">Create Invite</div>

            <div className="grid md:grid-cols-3 gap-3 mb-4">
              <input
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                placeholder="Optional email lock"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <select
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="TECHNICIAN">Technician</option>
                <option value="DISPATCH">Dispatch</option>
                <option value="ACCOUNTING">Accounting</option>
                <option value="MANAGER">Manager</option>
              </select>
              <button
                className="rounded-xl px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-sm font-semibold"
                onClick={createInvite}
              >
                Create
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-2">
              {PERMS.map(([k, label]) => (
                <label
                  key={k}
                  className="flex items-center gap-2 text-sm bg-slate-950 border border-slate-800 rounded-xl px-3 py-2"
                >
                  <input type="checkbox" checked={!!perms[k]} onChange={() => togglePerm(k)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            <div className="mt-3 text-xs text-slate-400">
              These permissions snapshot onto the membership when they accept the code.
            </div>
          </div>

          <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-5">
            <div className="font-semibold mb-3">Accept Invite (testing)</div>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-sm"
                placeholder="Invite code"
                value={codeToAccept}
                onChange={(e) => setCodeToAccept(e.target.value)}
              />
              <button
                className="rounded-xl px-4 py-2 bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-sm font-semibold"
                onClick={acceptInvite}
                disabled={!codeToAccept}
              >
                Accept
              </button>
            </div>
            <div className="mt-3 text-xs text-slate-400">
              After acceptance, set your <b>Business context</b> (top right) to that business id.
            </div>
          </div>
        </div>

        <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Invites</div>
          </div>

          {invites.length === 0 ? (
            <div className="text-slate-400">No invites.</div>
          ) : (
            <div className="space-y-3">
              {invites.map((inv) => (
                <div key={inv.id || inv.code} className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <div className="font-semibold">
                        {inv.email || "Open Invite"} • {inv.role}
                      </div>
                      <div className="text-slate-400 text-sm">
                        <span className="font-mono">{inv.code}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="rounded-xl px-3 py-2 bg-indigo-500/20 border border-indigo-500/40 hover:bg-indigo-500/30 text-xs"
                        onClick={() => copy(inv.code)}
                      >
                        Copy Code
                      </button>
                      <button
                        className="rounded-xl px-3 py-2 bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-xs"
                        onClick={() => copy(`${window.location.origin}/accept-invite?code=${inv.code}`)}
                      >
                        Copy Link
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid md:grid-cols-3 gap-2 text-xs text-slate-400">
                    {PERMS.map(([k, label]) => (
                      <div key={k} className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${inv[k] ? "bg-emerald-400" : "bg-slate-700"}`} />
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
