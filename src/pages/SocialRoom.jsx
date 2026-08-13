import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ModeBar from "../components/ModeBar";
import { useAuth } from "../auth/AuthContext";
import SocialRoomComposer from "../components/social/SocialRoomComposer";
import SocialRoomFeed from "../components/social/SocialRoomFeed";
import useSocialRoomActions from "../hooks/useSocialRoomActions";
import useSocialRoomFeed from "../hooks/useSocialRoomFeed";
import api from "../api/client";

const list = (data) => Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);

export default function SocialRoom() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [groups, setGroups] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [events, setEvents] = useState([]);
  const [invites, setInvites] = useState([]);
  const [groupId, setGroupId] = useState(params.get("group") || "");
  const [eventId, setEventId] = useState(params.get("event") || "none");
  const [loading, setLoading] = useState(true);
  const [baseError, setBaseError] = useState("");
  const { items, error: feedError, load: loadFeed } = useSocialRoomFeed();
  const { saving, error: actionError, createEntry } = useSocialRoomActions();
  const userId = Number(user?.id || 0);

  const activeMemberships = useMemo(() => memberships.filter((m) => m.status === "ACTIVE" && Number(m.user) === userId), [memberships, userId]);
  const activeGroupIds = useMemo(() => new Set(activeMemberships.map((m) => Number(m.group))), [activeMemberships]);
  const selectedMembership = activeMemberships.find((m) => Number(m.group) === Number(groupId));
  const selectedGroup = groups.find((g) => Number(g.id) === Number(groupId));
  const canAnnounce = ["OWNER", "DIRECTOR", "MANAGER"].includes(selectedMembership?.role);
  const roomEvents = events.filter((event) => Number(event.organizer_group) === Number(groupId) || invites.some((invite) => Number(invite.event) === Number(event.id) && Number(invite.target_group) === Number(groupId) && invite.status === "ACCEPTED"));

  async function loadOptions() {
    setLoading(true);
    setBaseError("");
    try {
      const [g, m, e, i] = await Promise.all([
        api.get("/social/groups/"), api.get("/social/memberships/"), api.get("/social/events/"), api.get("/social/event-invitations/"),
      ]);
      const nextGroups = list(g.data);
      const nextMemberships = list(m.data);
      setGroups(nextGroups);
      setMemberships(nextMemberships);
      setEvents(list(e.data));
      setInvites(list(i.data));
      if (!groupId) {
        const first = nextMemberships.find((membership) => membership.status === "ACTIVE" && Number(membership.user) === userId);
        if (first) setGroupId(String(first.group));
      }
    } catch (error) {
      setBaseError(error?.response?.data?.detail || error?.message || "Unable to load Social rooms.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadOptions(); }, []);
  useEffect(() => {
    if (!groupId) return undefined;
    const next = { group: groupId };
    if (eventId !== "none") next.event = eventId;
    setParams(next, { replace: true });
    loadFeed(groupId, eventId);
    const timer = window.setInterval(() => loadFeed(groupId, eventId), 8000);
    return () => window.clearInterval(timer);
  }, [groupId, eventId, loadFeed, setParams]);

  async function publish(values) {
    const payload = { group: Number(groupId), kind: values.kind, body: values.body };
    if (eventId !== "none") payload.event = Number(eventId);
    await createEntry(payload);
    await loadFeed(groupId, eventId);
  }

  const error = baseError || feedError || actionError;

  return <div className="min-h-screen bg-[#02060c] pb-28 text-slate-100">
    <ModeBar title="Social Chat" subtitle="Shared group rooms" />
    <main className="mx-auto max-w-5xl px-3 py-4 sm:px-5">
      <div className="mb-3 flex items-center gap-3">
        <button type="button" onClick={() => nav("/connect")} className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[.04]"><ArrowLeft className="h-5 w-5"/></button>
        <div className="min-w-0 flex-1"><div className="truncate text-lg font-black text-white">{selectedGroup?.name || "Group communication"}</div><div className="text-xs text-slate-500">Shared room • private conversations stay separate</div></div>
        <button type="button" onClick={() => loadFeed(groupId, eventId)} className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[.04]"><RefreshCw className="h-4 w-4"/></button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <select value={groupId} onChange={(e) => { setGroupId(e.target.value); setEventId("none"); }} className="h-12 rounded-2xl border border-white/10 bg-[#07111f] px-4 text-sm font-bold text-white">
          <option value="">Choose group</option>
          {groups.filter((group) => activeGroupIds.has(Number(group.id))).map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select>
        <select value={eventId} onChange={(e) => setEventId(e.target.value)} disabled={!groupId} className="h-12 rounded-2xl border border-white/10 bg-[#07111f] px-4 text-sm font-bold text-white disabled:opacity-50">
          <option value="none"># Group chat</option>
          {roomEvents.map((event) => <option key={event.id} value={event.id}>Event • {event.title}</option>)}
        </select>
      </div>

      {error ? <div className="mt-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-100">{error}</div> : null}

      <section className="mt-3 min-h-[55dvh] rounded-[1.75rem] border border-white/10 bg-[#07111f]/80 p-4">
        {groupId ? <SocialRoomFeed items={items} loading={loading} groupName={selectedGroup?.name} /> : <div className="grid min-h-[45dvh] place-items-center text-sm text-slate-500">Choose one of your groups to open its room.</div>}
      </section>

      {groupId ? <SocialRoomComposer canAnnounce={canAnnounce} saving={saving} onCreate={publish} /> : null}
    </main>
  </div>;
}
