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
    `${member?.user?.first_name || ""} ${member?.user?.last_name || ""}`.trim() ||
    member?.user_name ||
    member?.name ||
    member?.user_email ||
    member?.user?.email ||
    member?.email ||
    `Member #${member?.id || ""}`;
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
      const list = Array.isArray(res?.data) ? res.data : res?.data?.results || [];
      setMembers(list);
      setMemberErr("");
    } catch (e) {
      setMembers([]);
      setMemberErr(e?.response?.data?.detail || "Failed to load team members.");
    }
  }

  async function loadInvites() {
    try {
      const res = await api.get("/team/invites/");
      setInvites(res.data?.results || res.data || []);
      setInviteErr("");
    } catch (e) {
      setInvites([]);
      setInviteErr(e?.response?.data?.detail || "Pending invites could not be loaded.");
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

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-lg font-bold">Team & Employees</div>
            <div className="text-xs text-slate-400">
              Send employee invites, review your team, and manage who can work tickets.
            </div>
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
              onClick={loadAll}
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {msg ? (
          <div className="text-sm text-emerald-300 bg-emerald-900/10 border border-emerald-800 rounded-xl p-3">
            {msg}
          </div>
        ) : null}

        {err ? (
          <div className="text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-xl p-3">
            {err}
          </div>
        ) : null}

        {!activeBusinessId ? (
          <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5">
            <div className="text-lg font-extrabold text-amber-100">Pick a business first</div>
            <div className="text-sm text-amber-200/90 mt-2">
              Use the business picker in the top right, then come back here to send employee invites.
            </div>
          </div>
        ) : null}

        <div className="grid xl:grid-cols-2 gap-6">
          <SectionCard
            title="Send Employee Invite"
            subtitle="Create a role-based invite for a technician, dispatch user, accounting seat, or manager."
            right={<Badge tone="cyan">Business #{activeBusinessId || "—"}</Badge>}
          >
            <div className="grid md:grid-cols-3 gap-3">
              <input
                className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm"
                placeholder="Employee email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <select
                className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                {ROLE_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <button
                className="rounded-2xl px-4 py-3 bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={createInvite}
                disabled={inviteBusy || !activeBusinessId}
              >
                {inviteBusy ? "Creating…" : "Send Invite"}
              </button>
            </div>

            <div className="mt-4 grid md:grid-cols-2 gap-2">
              {PERMS.map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-2 text-sm bg-slate-950 border border-slate-800 rounded-2xl px-3 py-3"
                >
                  <input type="checkbox" checked={!!perms[key]} onChange={() => togglePerm(key)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
              <div className="text-xs text-slate-400">How this works</div>
              <div className="mt-2 text-sm text-slate-200">
                Step 1: create the invite here. Step 2: copy the invite link or code from the pending invites section.
                Step 3: send it to the employee. Step 4: after they accept, they will appear in your team list and
                can be assigned to tickets.
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Current Team Members"
            subtitle="These members should appear in your ticket assignment dropdowns."
            right={
              <div className="flex items-center gap-2 flex-wrap">
                <Badge tone="emerald">
                  {loading ? "Loading…" : `${members.length} Member${members.length === 1 ? "" : "s"}`}
                </Badge>
                {memberErr ? <Badge tone="rose">Members Error</Badge> : null}
              </div>
            }
          >
            {memberErr ? (
              <div className="mb-3 text-sm text-rose-300 bg-rose-900/20 border border-rose-800 rounded-xl p-3">
                {memberErr}
              </div>
            ) : null}

            {members.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-5 text-slate-400">
                No team members found for this business yet.
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => {
                  const isEditing = editingId === member.id;
                  const phone = memberPhone(member);

                  return (
                    <div key={member.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <div className="font-semibold text-slate-100">
                            {displayMemberName(member)}
                          </div>
                          <div className="text-sm text-slate-400 mt-1">
                            {member?.user_email || member?.user?.email || "No email"}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {phone ? `Phone: ${phone}` : "Phone: not set"}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge tone="fuchsia">
                            {isEditing ? roleLabel(editState?.role) : roleLabel(member.role)}
                          </Badge>
                          <Badge tone={(isEditing ? editState?.is_active : member.is_active) ? "emerald" : "rose"}>
                            {(isEditing ? editState?.is_active : member.is_active) ? "Active" : "Inactive"}
                          </Badge>
                          <Badge tone="slate">
                            {isEditing ? permCount(editState || {}) : permCount(member)} perms
                          </Badge>

                          {!isEditing ? (
                            <button
                              className="rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-xs"
                              onClick={() => beginEdit(member)}
                            >
                              Edit
                            </button>
                          ) : (
                            <>
                              <button
                                className="rounded-xl px-3 py-2 bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-xs disabled:opacity-50"
                                onClick={() => saveMember(member.id)}
                                disabled={saveBusyId === member.id}
                              >
                                {saveBusyId === member.id ? "Saving…" : "Save"}
                              </button>
                              <button
                                className="rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-xs"
                                onClick={cancelEdit}
                                disabled={saveBusyId === member.id}
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {!isEditing ? (
                        <div className="mt-3 grid md:grid-cols-3 gap-2 text-xs text-slate-400">
                          {PERMS.map(([key, label]) => (
                            <div key={key} className="flex items-center gap-2">
                              <span
                                className={cx(
                                  "inline-block w-2 h-2 rounded-full",
                                  member[key] ? "bg-emerald-400" : "bg-slate-700"
                                )}
                              />
                              {label}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-4 space-y-4">
                          <div className="grid md:grid-cols-2 gap-3">
                            <div>
                              <div className="text-xs text-slate-400 mb-1">Job Role</div>
                              <select
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm"
                                value={editState?.role || "TECHNICIAN"}
                                onChange={(e) =>
                                  setEditState((prev) => ({ ...prev, role: e.target.value }))
                                }
                              >
                                {ROLE_OPTIONS.map(([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <div className="text-xs text-slate-400 mb-1">Status</div>
                              <label className="flex items-center gap-2 text-sm bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={!!editState?.is_active}
                                  onChange={(e) =>
                                    setEditState((prev) => ({
                                      ...prev,
                                      is_active: e.target.checked,
                                    }))
                                  }
                                />
                                <span>Active team member</span>
                              </label>
                            </div>
                          </div>

                          <div>
                            <div className="text-xs text-slate-400 mb-2">Permissions</div>
                            <div className="grid md:grid-cols-2 gap-2">
                              {PERMS.map(([key, label]) => (
                                <label
                                  key={key}
                                  className="flex items-center gap-2 text-sm bg-slate-950 border border-slate-800 rounded-2xl px-3 py-3"
                                >
                                  <input
                                    type="checkbox"
                                    checked={!!editState?.[key]}
                                    onChange={() => toggleEditPerm(key)}
                                  />
                                  <span>{label}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
                            Phone display will show here automatically if the backend returns a phone field for this member.
                            Saving a phone number from this page needs backend support for that field.
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        <SectionCard
          title="Pending Invites"
          subtitle="Create the invite here, then send the copied code or link to the employee."
          right={
            <div className="flex items-center gap-2 flex-wrap">
              <Badge tone="amber">{invites.length} Pending</Badge>
              {inviteErr ? <Badge tone="rose">Invites Error</Badge> : null}
            </div>
          }
        >
          {inviteErr ? (
            <div className="mb-3 text-sm text-amber-300 bg-amber-900/10 border border-amber-800 rounded-xl p-3">
              {inviteErr}
            </div>
          ) : null}

          {invites.length === 0 ? (
            <div className="text-slate-400">No pending invites.</div>
          ) : (
            <div className="space-y-3">
              {invites.map((inv) => {
                const inviteLink = `${inviteLinkBase}?code=${encodeURIComponent(inv.code || "")}`;
                return (
                  <div key={inv.id || inv.code} className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-100">
                          {inv.email || "Open Invite"} • {roleLabel(inv.role)}
                        </div>
                        <div className="text-slate-400 text-sm mt-1">
                          Invite Code: <span className="font-mono text-slate-200">{inv.code}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <button
                          className="rounded-xl px-3 py-2 bg-indigo-500/20 border border-indigo-500/40 hover:bg-indigo-500/30 text-xs"
                          onClick={() => copy(inv.code, "Invite code copied.")}
                        >
                          Copy Code
                        </button>

                        <button
                          className="rounded-xl px-3 py-2 bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-xs"
                          onClick={() => copy(inviteLink, "Invite link copied.")}
                        >
                          Copy Link
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid md:grid-cols-3 gap-2 text-xs text-slate-400">
                      {PERMS.map(([key, label]) => (
                        <div key={key} className="flex items-center gap-2">
                          <span
                            className={cx(
                              "inline-block w-2 h-2 rounded-full",
                              inv[key] ? "bg-emerald-400" : "bg-slate-700"
                            )}
                          />
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Employee Side"
          subtitle="Use this link for the employee. The owner should not accept invites on this page."
        >
          <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
            <div className="text-sm text-slate-200">
              Employee acceptance page:
              <span className="ml-2 font-mono text-cyan-200">{inviteLinkBase}</span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Once the employee accepts, come back here and refresh. Then go to tickets and assign them.
            </div>
          </div>
        </SectionCard>
      </main>
    </div>
  );
}