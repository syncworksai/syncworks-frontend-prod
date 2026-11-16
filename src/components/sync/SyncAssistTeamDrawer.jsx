import React, { useEffect, useState } from "react";
import { Check, ChevronLeft, Save, Settings2, X } from "lucide-react";
import api from "../../api/client";
import { AVATARS } from "./JarvisAvatar";

const BASE = "/sync-ai/assist/pilot/team/";
const DEFAULTS = AVATARS.map((assistant) => ({
  id: assistant.id, name: assistant.name, role: assistant.role.toUpperCase().replaceAll(" ", "_"),
  execution_status: ["CHIEF_OF_STAFF", "SALES_MANAGER", "RESEARCH_ANALYST", "MARKETING_MANAGER", "EXECUTIVE_ASSISTANT"].includes(assistant.role.toUpperCase().replaceAll(" ", "_")) ? "internal_pilot" : "not_implemented",
}));
const clean = (items) => items.map(({ id, name, role }) => ({ id, name, role }));
const label = (role) => role.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

export default function SyncAssistTeamDrawer({ onTeamChange }) {
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState(DEFAULTS);
  const [roles, setRoles] = useState(["CHIEF_OF_STAFF", "SALES_MANAGER", "MARKETING_MANAGER", "RESEARCH_ANALYST"]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let alive = true;
    api.get(BASE, { timeout: 15000 }).then(({ data }) => {
      if (!alive) return;
      setEmployees(data.employees || DEFAULTS);
      setRoles(data.allowed_roles || roles);
      onTeamChange?.(data.employees || DEFAULTS);
    }).catch(() => {
      if (alive) setError("Team preferences could not load. No changes were made.");
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [onTeamChange]);

  function update(id, field, value) {
    setNotice(""); setError("");
    setEmployees((rows) => rows.map((row) => row.id === id ? { ...row, [field]: value } : row));
  }

  async function save() {
    if (saving || loading) return;
    if (new Set(employees.map((e) => e.role)).size !== employees.length) {
      setError("Give each employee a different role."); return;
    }
    setSaving(true); setError(""); setNotice("");
    try {
      const { data } = await api.put(BASE, { employees: clean(employees) }, { timeout: 15000 });
      setEmployees(data.employees || employees);
      onTeamChange?.(data.employees || employees);
      setNotice("Your team choices were saved to your SyncWorks account.");
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to save your team changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-400/30 bg-slate-950/75 px-3 py-2 text-xs font-bold text-cyan-100 hover:border-cyan-300">
        <Settings2 size={16} /> Manage AI team
      </button>
      {open && (
        <div className="fixed inset-0 z-[260] flex justify-end bg-slate-950/70 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-label="Manage AI employees" className="flex h-full w-full max-w-lg flex-col border-l border-cyan-400/30 bg-[#071225] text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <div><p className="text-[10px] font-black uppercase tracking-widest text-cyan-300">Sync Assist · Private Pilot</p><h2 className="text-xl font-black">Manage AI team</h2></div>
              <button type="button" onClick={() => setOpen(false)} className="grid h-11 w-11 place-items-center rounded-xl border border-white/15" aria-label="Close team manager"><X size={20}/></button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              <p className="text-xs leading-5 text-slate-300">Customize your employees' names and assign one job role to each portrait. Roles control which assignment is selected, not account access or execution permissions.</p>
              {loading && <p role="status" className="text-sm text-slate-300">Loading your team…</p>}
              {!loading && employees.map((employee) => {
                const portrait = AVATARS.find((a) => a.id === employee.id);
                const executable = ["CHIEF_OF_STAFF", "SALES_MANAGER", "RESEARCH_ANALYST", "MARKETING_MANAGER", "EXECUTIVE_ASSISTANT"].includes(employee.role);
                return <div key={employee.id} className="rounded-2xl border border-white/15 bg-slate-900/50 p-3">
                  <div className="mb-3 flex items-center gap-3">
                    <img src={portrait?.photo} alt="" className="h-12 w-12 rounded-full border border-cyan-300/45 object-cover object-top"/>
                    <div className="min-w-0 flex-1"><p className="font-bold">{employee.name || "Employee"}</p>
                    <p className={`text-xs ${executable ? "text-emerald-200" : "text-amber-200"}`}>{executable ? "Restricted internal execution available" : "Execution not yet implemented"}</p></div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="text-xs font-bold text-slate-200">Employee name
                      <input value={employee.name} maxLength={32} onChange={(event) => update(employee.id, "name", event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 text-sm text-white" />
                    </label>
                    <label className="text-xs font-bold text-slate-200">Job role
                      <select value={employee.role} onChange={(event) => update(employee.id, "role", event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-950 px-2 text-sm text-white">
                        {roles.map((role) => <option key={role} value={role}>{label(role)}</option>)}
                      </select>
                    </label>
                  </div>
                </div>;
              })}
              {error && <p role="alert" className="rounded-lg border border-rose-400/30 p-3 text-xs text-rose-200">{error}</p>}
              {notice && <p role="status" className="flex items-center gap-2 text-xs text-emerald-200"><Check size={16}/>{notice}</p>}
              <p className="text-[11px] leading-5 text-amber-200">This does not enable background scheduling, email sending, customer changes, or payments. Internal-pilot tasks require matching source records and owner approval. Other roles still need separate authorized tool integrations before activation.</p>
            </div>
            <div className="flex items-center gap-2 border-t border-white/10 bg-[#071225] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button type="button" onClick={() => setOpen(false)} className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-white/20 px-3 text-sm"><ChevronLeft size={16}/> Back</button>
              <button type="button" disabled={loading || saving} onClick={save} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-3 text-sm font-black disabled:opacity-50"><Save size={17}/>{saving ? "Saving…" : "Save team changes"}</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
