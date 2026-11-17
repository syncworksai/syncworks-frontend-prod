import React, { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, ChevronRight, MessageCircle, RefreshCw, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { AVATARS } from "../sync/JarvisAvatar";
import "./OfficeAgentDockV27.css";

// One source of truth for the private-pilot employees. Membership is NOT live
// activity or proof that an agent is currently executing a task.
export default function OfficeAgentDock({ user, placement = "home" }) {
  const nav = useNavigate();
  const permitted = String(user?.email || "").trim().toLowerCase() === "jacoblord7@outlook.com";
  const [employees, setEmployees] = useState([]);
  const [fetchState, setFetchState] = useState("loading");
  const [version, setVersion] = useState(0);
  const [selected, setSelected] = useState(null);

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
    <section className={`sw-office-agents sw-office-agents--${placement}`} aria-label={office ? "Chief of Staff" : "My AI team"}>
      <div className="sw-office-agents-head">
        <span className="sw-office-agents-heading"><Users size={16} aria-hidden="true" /> {office ? "CHIEF OF STAFF" : "MY AI TEAM"}</span>
        <span className="sw-office-agents-state">
          {fetchState === "loading" ? "Checking team…" :
           fetchState === "unavailable" ? "Status unavailable" :
           office ? (shown[0]?.configured ? "Configured" : "Not configured") :
           `${employees.length} configured`}
        </span>
      </div>
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
}
