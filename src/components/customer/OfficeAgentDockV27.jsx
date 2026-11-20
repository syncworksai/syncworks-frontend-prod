import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BriefcaseBusiness, ChevronRight, Grip, MessageCircle, RefreshCw, RotateCcw, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { AVATARS, getAvatarPhotoForUser } from "../sync/JarvisAvatar";
import {getPilotAgentsForUser} from "../sync/pilotAgentRoster";
import "./OfficeAgentDockV27.css";

// One source of truth for the private-pilot employees. Membership is NOT live
// activity or proof that an agent is currently executing a task.
export default function OfficeAgentDock({ user, placement = "home", theme = "future" }) {
  const nav = useNavigate();
  const permitted = String(user?.email || "").trim().toLowerCase() === "jacoblord7@outlook.com";
  const [employees, setEmployees] = useState([]);
  const [fetchState, setFetchState] = useState("loading");
  const [version, setVersion] = useState(0);
  const [selected, setSelected] = useState(null);
  const dockRef = useRef(null);
  const dragStart = useRef(null);
  const moveable = placement === "home";
  const [offset, setOffset] = useState(() => {
    try { const o = JSON.parse(localStorage.getItem("sw_desktop_agent_dock_position_v1") || "{}"); return {x:Number(o.x) || 0,y:Number(o.y) || 0}; }
    catch {return {x:0,y:0};}
  });
  function dragBegin(event) {
    if (!moveable || event.button !== 0) return;
    const rect = dockRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = {x:event.clientX,y:event.clientY,offset,rect};
  }
  function dragMove(event) {
    if (!dragStart.current) return;
    const {x,y,offset:initial,rect} = dragStart.current;
    const left = rect.left - initial.x, right = rect.right - initial.x;
    const top = rect.top - initial.y, bottom = rect.bottom - initial.y;
    setOffset({
      x: Math.round(Math.min(window.innerWidth - right - 8, Math.max(8 - left, initial.x + event.clientX - x))),
      y: Math.round(Math.min(window.innerHeight - bottom - 8, Math.max(72 - top, initial.y + event.clientY - y)))
    });
  }
  function dragEnd() {dragStart.current = null;}
  useEffect(() => {
    if (!moveable) return;
    try {localStorage.setItem("sw_desktop_agent_dock_position_v1", JSON.stringify(offset));} catch {}
  }, [offset.x,offset.y,moveable]);

  useEffect(() => {
    if (!permitted) return;
    let live = true;
    setFetchState("loading");
    api.get("/sync-ai/assist/pilot/team/", { timeout: 15000 })
      .then(({ data }) => {
        if (!live) return;
        setEmployees(Array.isArray(data?.employees) ? data.employees : []);
        setFetchState("ready");
      })
      .catch(() => { if (live) setFetchState("unavailable"); });
    const refresh=()=>setVersion(v=>v+1);
    window.addEventListener("sw:assist-team-updated",refresh);
    return () => { live = false; window.removeEventListener("sw:assist-team-updated",refresh); };
  }, [permitted, version]);

  const roster = useMemo(() => getPilotAgentsForUser(user,AVATARS).map((avatar) => {
    const slotId=avatar.id==="accounting-female"?"finance-manager":avatar.id;
    const employee=employees.find(worker=>worker.id===slotId);
    return {
    ...avatar,
    slotId,
    photo: employee?.photo || getAvatarPhotoForUser(avatar,user),
    name: employee?.name || avatar.name,
    configured: Boolean(employee),
  }}), [employees, user?.email]);

  if (!permitted) return null;
  const office = placement === "office";
  const shown = office ? roster.filter((person) => person.id === "executive-female") : roster;
  const active = roster.find((person) => person.id === selected);
  const openEmployee = (person) => nav(person.configured
    ? `/sync/assist/employee/${encodeURIComponent(person.slotId)}`
    : "/sync/assist");

  const dock = (
    <section data-bubble-theme={theme} ref={dockRef} style={moveable ? {"--sw-team-x": offset.x + "px", "--sw-team-y": offset.y + "px"} : undefined} className={`sw-office-agents sw-office-agents--${placement} ${moveable ? "sw-office-agents--bubbles" : ""}`} aria-label={office ? "Chief of Staff" : "My AI team"}>
      <div className="sw-office-agents-head">
        <span className="sw-office-agents-heading"><Users size={16} aria-hidden="true" /> {office ? "CHIEF OF STAFF" : "MY AI TEAM"}</span>
        <span className="sw-office-agents-state">
          {fetchState === "loading" ? "Checking team…" :
           fetchState === "unavailable" ? "Status unavailable" :
           office ? (shown[0]?.configured ? "Configured" : "Not configured") :
           `${shown.filter(person=>person.configured).length} profiles · review-only pilot`}
        </span>
      </div>
      {moveable && <div className="sw-office-bubbles-controls">
        <button type="button" className="sw-office-bubbles-grip" aria-label="Drag to move AI team dock" title="Drag to reposition AI team"
          onPointerDown={dragBegin} onPointerMove={dragMove} onPointerUp={dragEnd} onPointerCancel={dragEnd}><Grip size={19}/></button>
        {(offset.x !== 0 || offset.y !== 0) && <button type="button" title="Reset dock position" aria-label="Reset dock position"
          onClick={() => setOffset({x:0,y:0})}><RotateCcw size={15}/></button>}
      </div>}
      <div className="sw-office-agents-content">
        <div className="sw-office-agents-portraits">
          {shown.map((person) => (
            <button key={person.id} type="button" className="sw-office-agent"
              aria-label={`Open ${person.name}, ${person.role}`}
              onClick={() => setSelected((old) => old === person.id ? null : person.id)}>
              {person.photo?<img src={person.photo} alt="" loading="lazy" />:<span className="grid h-full w-full place-items-center rounded-full border border-cyan-300/30 bg-cyan-500/15 text-lg font-bold text-cyan-100">{person.name?.charAt(0)||"AI"}</span>}
              <span className="sw-office-agent-names"><strong>{person.name}</strong><small>{person.role}</small></span>
              <ChevronRight size={15} className="sw-office-agent-chevron" aria-hidden="true" />
            </button>
          ))}
        </div>
        {active && shown.some((person) => person.id === active.id) && (
          <div className="sw-office-agent-detail" role="region" aria-label={`${active.name} actions`}>
            <div><strong>{active.name}</strong><span>{active.configured ? "Employee configured" : "Employee setup required"}</span></div>
            <button type="button" onClick={() => nav("/sync/assist/assignments")}>Assign a task</button>
            <button type="button" onClick={() => openEmployee(active)}>
              <MessageCircle size={14} /> {active.configured ? "Open employee workspace" : "Set up employee"}
            </button>
          </div>
        )}
        {office && !active && <p className="sw-office-agents-hint">Select Victoria for her workspace and assigned duties.</p>}
        {!office && <div className="sw-office-agents-actions">
          <button type="button" onClick={() => nav("/sync/assist/assignments")}><MessageCircle size={15}/> Assign task</button>
          <button type="button" onClick={() => nav("/sync/assist/employees")}><BriefcaseBusiness size={15}/> Manage team</button>
          <button type="button" aria-label="Refresh AI employee configuration" title="Refresh team" onClick={() => setVersion((v) => v + 1)}><RefreshCw size={15}/></button>
        </div>}
      </div>
    </section>
  );
  return moveable ? <><div className="sw-desktop-bubble-placeholder" aria-hidden="true" />{createPortal(dock, document.body)}</> : dock;
}
