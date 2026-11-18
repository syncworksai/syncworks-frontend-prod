import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import BusinessPicker from "../components/BusinessPicker";

const ROLE_OPTIONS = [
  ["TECHNICIAN", "Technician"],
  ["DISPATCH", "Dispatch"],
  ["ACCOUNTING", "Accounting"],
  ["MANAGER", "Manager"],
  ["OWNER", "Owner"],
  ["ADMIN", "Admin"],
];

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

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function getActiveBusinessId() {
  try {
    return localStorage.getItem("sw_active_business_id") || "";
  } catch {
    return "";
  }
}

function roleLabel(role) {
  const raw = String(role || "").trim();
  if (!raw) return "Team Member";
  return raw
    .toLowerCase()
    .split("_")
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}

function displayMemberName(member) {
  const full =
    `${member?.user_first_name || member?.user?.first_name || ""} ${member?.user_last_name || member?.user?.last_name || ""}`.trim() ||
    member?.user_name ||
    member?.display_name ||
    member?.full_name ||
    member?.user?.full_name ||
    member?.name ||
    member?.user_email ||
    member?.user?.email ||
    member?.email ||
    (member?.user_id ? `Employee account #${member.user_id}` : `Employee profile unavailable (#${member?.id || "unknown"})`);
  return full;
}

function memberPhone(member) {
  return (
    member?.phone ||
    member?.user_phone ||
    member?.user?.phone ||
    member?.company_phone ||
    ""
  );
}

function permCount(item) {
  return PERMS.reduce((count, [key]) => count + (item?.[key] ? 1 : 0), 0);
}

function Badge({ children, tone = "slate" }) {
  const tones = {
    slate: "border-slate-800 bg-slate-950/40 text-slate-200",
    cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    fuchsia: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200",
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-200",
    sky: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  };

  return (
    <span
      className={cx(
        "inline-flex items-center px-2 py-1 rounded-full border text-[11px] font-semibold",
        tones[tone] || tones.slate
      )}
    >
      {children}
    </span>
  );
}

function SectionCard({ title, subtitle, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-lg font-extrabold">{title}</div>
          {subtitle ? <div className="text-xs text-slate-400 mt-1">{subtitle}</div> : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function makeEditState(member) {
  const state = {
    role: member?.role || "TECHNICIAN",
    is_active: !!member?.is_active,
  };

  PERMS.forEach(([key]) => {
    state[key] = !!member?.[key];
  });

  return state;
}

export default function TeamInvites() {
  const [activeBusinessId, setActiveBusinessId] = useState(getActiveBusinessId());

  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("TECHNICIAN");

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [memberErr, setMemberErr] = useState("");
  const [inviteErr, setInviteErr] = useState("");

  const [loading, setLoading] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editState, setEditState] = useState(null);
  const [saveBusyId, setSaveBusyId] = useState(null);
  const [inviteSettingsOpen, setInviteSettingsOpen] = useState(false);
  const [showInvites, setShowInvites] = useState(false);
  const [search, setSearch] = useState("");

  const [perms, setPerms] = useState(() => {
    const obj = {};
    PERMS.forEach(([k]) => {
      obj[k] = k === "can_create_tickets";
    });
    return obj;
  });

  const selectedRoleLabel = useMemo(
    () => ROLE_OPTIONS.find(([value]) => value === role)?.[1] || role,
    [role]
  );

  useEffect(() => {
    function handleBusinessChanged() {
      setActiveBusinessId(getActiveBusinessId());
    }

    window.addEventListener("sw:activeBusinessChanged", handleBusinessChanged);
    return () => window.removeEventListener("sw:activeBusinessChanged", handleBusinessChanged);
  }, []);

  async function loadMembers() {
    if (!activeBusinessId) {
      setMembers([]);
      setMemberErr("");
      return;
    }

    try {
      const res = await api.get(`/businesses/${activeBusinessId}/members/`);
      let list = Array.isArray(res?.data) ? res.data : res?.data?.results || [];
      // Older business-member serializers omit the linked user's identity.
      // The scoped team endpoint exposes user_name and user_email.
      if (list.some((member) => !member?.user_email && !member?.user_name && !member?.user_first_name && !member?.user?.email)) {
        try {
          const identityRes = await api.get("/team/members/");
          const teamList = Array.isArray(identityRes?.data) ? identityRes.data : identityRes?.data?.results || [];
          const byMemberId = new Map(teamList.filter((item) => String(item?.business) === String(activeBusinessId)).map((item) => [String(item.id), item]));
          list = list.map((member) => {
            const profile = byMemberId.get(String(member.id));
            if (!profile) return member;
            // Only merge identity fields; permissions and employment status
            // remain authoritative from the business-scoped endpoint.
            return {
              ...member,
              user_name: member.user_name || profile.user_name,
              user_email: member.user_email || profile.user_email,
              user_first_name: member.user_first_name || profile.user_first_name,
              user_last_name: member.user_last_name || profile.user_last_name,
            };
          });
        } catch {
          // The team endpoint may require additional permission on older deployments.
          // Keep showing the membership directory rather than failing the whole page.
        }
      }
      setMembers(list);
      setMemberErr("");
    } catch (e) {
      setMembers([]);
      setMemberErr(e?.response?.data?.detail || "Failed to load team members.");
    }
  }

  async function loadInvites() {
    if (!activeBusinessId) { setInvites([]); return; }
    try {
      const res = await api.get("/team/invites/");
      const records = res.data?.results || res.data || [];
      setInvites((Array.isArray(records) ? records : []).filter((invite) => String(invite.business) === String(activeBusinessId) && !invite.used_at));
      setInviteErr("");
    } catch (e) {
      setInvites([]);
      setInviteErr(e?.response?.data?.detail || `Pending invites could not be loaded (HTTP ${e?.response?.status || "network error"}).`);
    }
  }

  async function loadAll() {
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      await Promise.allSettled([loadMembers(), loadInvites()]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [activeBusinessId]);

  function togglePerm(key) {
    setPerms((p) => ({ ...p, [key]: !p[key] }));
  }

  function toggleEditPerm(key) {
    setEditState((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function createInvite() {
    setMsg("");
    setErr("");
    setInviteErr("");

    if (!activeBusinessId) {
      setErr("Pick a business first.");
      return;
    }

    setInviteBusy(true);
    try {
      const permissions = {};
      PERMS.forEach(([key]) => {
        permissions[key] = !!perms[key];
      });

      const payload = {
        email: (email || "").trim(),
        role,
        permissions,
      };

      await api.post(`/businesses/${activeBusinessId}/invite-employee/`, payload);

      setEmail("");
      await loadInvites();
      await loadMembers();

      setMsg(
        `Invite created for ${selectedRoleLabel}. Copy the invite link or code below and send it to the employee.`
      );
    } catch (e) {
      setErr(
        e?.response?.data?.detail ||
          JSON.stringify(e?.response?.data || {}) ||
          "Failed to create invite"
      );
    } finally {
      setInviteBusy(false);
    }
  }

  async function copy(text, success = "Copied!") {
    try {
      await navigator.clipboard.writeText(text);
      setMsg(success);
      setErr("");
    } catch {
      setErr("Copy failed. Please copy manually.");
    }
  }

  function beginEdit(member) {
    setEditingId(member.id);
    setEditState(makeEditState(member));
    setMsg("");
    setErr("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState(null);
  }

  async function saveMember(memberId) {
    if (!editState) return;

    setMsg("");
    setErr("");
    setSaveBusyId(memberId);

    try {
      const payload = {
        role: editState.role,
        is_active: !!editState.is_active,
      };

      PERMS.forEach(([key]) => {
        payload[key] = !!editState[key];
      });

      await api.patch(`/business-members/${memberId}/`, payload);
      await loadMembers();
      setEditingId(null);
      setEditState(null);
      setMsg("Team member updated.");
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to update team member.");
    } finally {
      setSaveBusyId(null);
    }
  }

  const inviteLinkBase = `${window.location.origin}/accept-invite`;
  const filteredMembers = members.filter((m) => [displayMemberName(m), m?.user_email, m?.user?.email, m?.role].join(" ").toLowerCase().includes(search.toLowerCase()));
  const fieldClass = "w-full min-w-0 rounded-xl border border-slate-700/70 bg-slate-950/55 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400";
  const buttonClass = "rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/20";
  const permissionGrid = (state, change) => (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {PERMS.map(([key, label]) => (
        <label key={key} className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-900/35 px-2 py-2 text-xs text-slate-200">
          <input type="checkbox" checked={!!state?.[key]} onChange={() => change(key)} className="accent-cyan-400" />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );
  return (
    <div className="flex min-h-[calc(100dvh-76px)] flex-col bg-transparent text-slate-100 lg:h-[calc(100dvh-76px)] lg:min-h-0 lg:overflow-hidden">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-5">
        <div><h1 className="text-lg font-bold">Team & Employees</h1><p className="text-xs text-slate-400">Invite employees, identify accounts and control access.</p></div>
        <div className="flex items-center gap-2"><BusinessPicker /><button onClick={loadAll} className={buttonClass}>Refresh</button><Link to="/sbo" className={buttonClass}>Back</Link></div>
      </div>
      {(msg || err || memberErr || inviteErr) && <div className="mx-auto mb-2 w-full max-w-7xl px-3 text-xs sm:px-5" role="status">
        {msg && <p className="text-emerald-300">{msg}</p>}{err && <p className="text-rose-300">{err}</p>}{memberErr && <p className="text-rose-300">{memberErr}</p>}{inviteErr && <p className="text-amber-300">{inviteErr}</p>}
      </div>}
      {!activeBusinessId && <div className="mx-auto w-full max-w-7xl px-3 text-amber-200">Select a business to manage its team.</div>}
      <main className="mx-auto grid w-full max-w-7xl min-h-0 flex-1 grid-cols-1 gap-3 px-3 pb-4 sm:px-5 lg:grid-cols-[minmax(300px,0.85fr)_minmax(0,1.15fr)]">
        <section className="min-h-0 rounded-2xl border border-cyan-500/25 bg-slate-950/45 p-3 backdrop-blur-md sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-bold">Invite an Employee</h2><Badge tone="cyan">Business #{activeBusinessId || "—"}</Badge></div>
          <form className="flex flex-col gap-2" onSubmit={(e) => {e.preventDefault();createInvite();}}>
            <label className="text-xs text-slate-400" htmlFor="team-invite-email">Employee email</label>
            <input id="team-invite-email" type="email" required className={fieldClass} placeholder="employee@example.com" value={email} onChange={(e) => setEmail(e.target.value)}/>
            <div className="flex gap-2"><select className={fieldClass} aria-label="Employee role" value={role} onChange={(e) => setRole(e.target.value)}>{ROLE_OPTIONS.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
            <button type="submit" disabled={inviteBusy || !activeBusinessId} className={buttonClass + " shrink-0 disabled:opacity-40"}>{inviteBusy ? "Creating…" : "Create Invite"}</button></div>
          </form>
          <button type="button" aria-expanded={inviteSettingsOpen} onClick={() => setInviteSettingsOpen((v) => !v)} className="mt-3 flex w-full items-center justify-between rounded-xl border border-slate-700/60 px-3 py-2 text-left text-sm text-slate-200"><span>Invite permissions <span className="text-xs text-slate-400">({permCount(perms)} enabled)</span></span><span>{inviteSettingsOpen ? "Hide −" : "Customize +"}</span></button>
          {inviteSettingsOpen && <div className="mt-3">{permissionGrid(perms, togglePerm)}</div>}
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-700/50 pt-3"><h3 className="text-sm font-semibold">Pending Invites <span className="text-xs text-amber-300">({invites.length})</span></h3><button type="button" className={buttonClass} onClick={() => setShowInvites((v) => !v)}>{showInvites ? "Hide" : "View Invites"}</button></div>
          {showInvites && <div className="mt-3 max-h-44 space-y-2 overflow-y-auto">
            {invites.length === 0 && <p className="text-xs text-slate-400">No pending invites.</p>}
            {invites.map((inv) => <div key={inv.id || inv.code} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700/60 p-2 text-xs"><div><div>{inv.email || "Open invite"}</div><span className="text-slate-400">{roleLabel(inv.role)}</span></div><div className="flex gap-1"><button className={buttonClass} onClick={() => copy(inv.code || "", "Invite code copied.")}>Code</button><button className={buttonClass} onClick={() => copy(`${inviteLinkBase}?code=${encodeURIComponent(inv.code || "")}`, "Invite link copied.")}>Copy Link</button></div></div>)}
          </div>}
          <p className="mt-3 text-xs leading-relaxed text-slate-400">Create an invite, copy its link and share it with the employee. After acceptance they appear in your team directory.</p>
        </section>
        <section className="flex min-h-0 flex-col rounded-2xl border border-fuchsia-500/25 bg-slate-950/45 p-3 backdrop-blur-md sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-bold">Your Team <span className="text-xs font-normal text-slate-400">({members.length})</span></h2><p className="text-xs text-slate-400">Choose an employee to change role, status or permissions.</p></div><input aria-label="Search employees" placeholder="Search employees…" className={fieldClass + " max-w-44"} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {filteredMembers.length === 0 && <p className="p-3 text-sm text-slate-400">{loading ? "Loading employees…" : "No matching employees."}</p>}
          {filteredMembers.map((member) => { const isEditing = editingId === member.id; const phone = memberPhone(member); const knownName = displayMemberName(member); return (
            <article key={member.id} className="rounded-xl border border-slate-700/65 bg-slate-900/35 p-3">
              <div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="truncate font-semibold">{knownName}</div><div className="truncate text-xs text-slate-400">{member?.user_email || member?.user?.email || "Email unavailable from account"}</div>{phone && <div className="text-xs text-slate-500">{phone}</div>}</div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1"><Badge tone="fuchsia">{roleLabel(member.role)}</Badge><Badge tone={member.is_active ? "emerald":"rose"}>{member.is_active ? "Active":"Inactive"}</Badge><button className={buttonClass} onClick={() => isEditing ? cancelEdit() : beginEdit(member)}>{isEditing ? "Close" : "Edit"}</button></div></div>
              {!isEditing && <div className="mt-2 text-[11px] text-slate-400">{permCount(member)} of {PERMS.length} permissions · {member?.user_id ? `User #${member.user_id}` : `Membership #${member.id}`}</div>}
              {isEditing && <div className="mt-3 space-y-3 border-t border-slate-700/70 pt-3">
                <div className="grid grid-cols-2 gap-2"><label className="text-xs text-slate-400">Role<select value={editState?.role || "TECHNICIAN"} onChange={(e) => setEditState((p) => ({...p, role:e.target.value}))} className={fieldClass + " mt-1"}>{ROLE_OPTIONS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
                <label className="flex items-center gap-2 self-end rounded-xl border border-slate-700/60 p-2 text-xs"><input type="checkbox" checked={!!editState?.is_active} onChange={(e) => setEditState((p) => ({...p, is_active:e.target.checked}))}/>Active account</label></div>
                <div><h4 className="mb-2 text-xs font-semibold text-slate-300">Access permissions</h4>{permissionGrid(editState, toggleEditPerm)}</div>
                <div className="flex justify-end gap-2"><button onClick={cancelEdit} className={buttonClass}>Cancel</button><button onClick={() => saveMember(member.id)} disabled={saveBusyId === member.id} className={buttonClass}>{saveBusyId === member.id ? "Saving…" : "Save Changes"}</button></div>
              </div>}
            </article>);})}
          </div>
        </section>
      </main>
    </div>
  );
}
