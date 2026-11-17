import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BriefcaseBusiness, ChevronRight, Grip, MessageCircle, RefreshCw, RotateCcw, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { AVATARS } from "../sync/JarvisAvatar";
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
    return () => { live = false; };
  }, [permitted, version]);

  const roster = useMemo(() => AVATARS.map((avatar) => ({
    ...avatar,
    configured: employees.some((worker) => worker.id === avatar.id),
  })), [employees]);

  if (!permitted) return null;
  const office = placement === "office";
  const shown = office ? roster.filter((person) => person.id === "executive-female") : roster;
  const active = roster.find((person) => person.id === selected);
  const openEmployee = (person) => nav(person.configured
    ? `/sync/assist/employee/${encodeURIComponent(person.id)}`
    : "/sync/assist");

  return (
    <section ref={dockRef} style={moveable ? {"--sw-team-x": offset.x + "px", "--sw-team-y": offset.y + "px"} : undefined} className={`sw-office-agents sw-office-agents--${placement} ${moveable ? "sw-office-agents--bubbles" : ""}`} aria-label={office ? "Chief of Staff" : "My AI team"}>
      <div className="sw-office-agents-head">
        <span className="sw-office-agents-heading"><Users size={16} aria-hidden="true" /> {office ? "CHIEF OF STAFF" : "MY AI TEAM"}</span>
        <span className="sw-office-agents-state">
          {fetchState === "loading" ? "Checking team…" :
           fetchState === "unavailable" ? "Status unavailable" :
           office ? (shown[0]?.configured ? "Configured" : "Not configured") :
           `${employees.length} configured`}
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
              <img src={person.photo} alt="" loading="lazy" />
              <span className="sw-office-agent-names"><strong>{person.name}</strong><small>{person.role}</small></span>
              <ChevronRight size={15} className="sw-office-agent-chevron" aria-hidden="true" />
            </button>
          ))}
        </div>
        {active && shown.some((person) => person.id === active.id) && (
          <div className="sw-office-agent-detail" role="region" aria-label={`${active.name} actions`}>
            <div><strong>{active.name}</strong><span>{active.configured ? "Employee configured" : "Employee setup required"}</span></div>
            <button type="button" onClick={() => openEmployee(active)}>
              <MessageCircle size={14} /> {active.configured ? "Open employee workspace" : "Set up employee"}
            </button>
          </div>
        )}
        {office && !active && <p className="sw-office-agents-hint">Select Victoria for her workspace and assigned duties.</p>}
        {!office && <div className="sw-office-agents-actions">
          <button type="button" onClick={() => nav("/sync/assist")}><BriefcaseBusiness size={15}/> Manage team</button>
          <button type="button" aria-label="Refresh AI employee configuration" title="Refresh team" onClick={() => setVersion((v) => v + 1)}><RefreshCw size={15}/></button>
        </div>}
      </div>
    </section>
  );
  return moveable ? <><div className="sw-desktop-bubble-placeholder" aria-hidden="true" />{createPortal(dock, document.body)}</> : dock;
}
