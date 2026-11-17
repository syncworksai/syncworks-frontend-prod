import React, { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, ChevronDown, ChevronUp, Users, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { AVATARS } from "../sync/JarvisAvatar";
import "./OfficeAgentDockV27.css";

// Existing private-pilot employee endpoints must authorize data server-side.
// The UI must not imply that assigned employees have executed work.
export default function OfficeAgentDock({ user }) {
  const nav = useNavigate();
  const permitted = String(user?.email || "").trim().toLowerCase() === "jacoblord7@outlook.com";
  const [expanded, setExpanded] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [fetchState, setFetchState] = useState("loading");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!permitted) return;
    let live = true;
    setFetchState("loading");
    api.get("/sync-ai/assist/pilot/team/", { timeout: 15000 })
      .then(({data}) => {
        if (!live) return;
        setEmployees(Array.isArray(data?.employees) ? data.employees : []);
        setFetchState("ready");
      })
      .catch(() => { if(live) setFetchState("unavailable"); });
    return () => { live = false; };
  }, [permitted, version]);

  const roster = useMemo(() => AVATARS.map((avatar) => {
    // Match by the stable avatar id; never infer authorization or activity
    // merely from a matching display name.
    const configured = employees.find((worker) => worker.id === avatar.id);
    return { ...avatar, configured: Boolean(configured) };
  }), [employees]);

  if (!permitted) return null;

  return (
    <section className={`sw-office-agents ${expanded ? "is-expanded" : "is-collapsed"}`} aria-label="Your Sync Assist AI team">
      <div className="sw-office-agents-head">
        <span className="sw-office-agents-heading"><Users size={16} aria-hidden="true" /> MY AI TEAM</span>
        <span className="sw-office-agents-state">
          {fetchState === "ready" ? `${employees.length} configured` : fetchState === "loading" ? "Checking team…" : "Team status unavailable"}
        </span>
        <button type="button" className="sw-office-agents-collapse" aria-label={expanded ? "Collapse AI team dock" : "Expand AI team dock"} aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
          {expanded ? <ChevronDown size={18}/> : <ChevronUp size={18}/>}
        </button>
      </div>
      {expanded && <div className="sw-office-agents-content">
        <div className="sw-office-agents-portraits">
          {roster.map((avatar) => (
            <button key={avatar.id} type="button" className="sw-office-agent" title={`${avatar.name} — ${avatar.role}${avatar.configured ? " · open employee dashboard" : " · not configured"}`}
              onClick={() => nav(avatar.configured ? `/sync/assist/employee/${encodeURIComponent(avatar.id)}` : "/sync/assist")}>
              <img src={avatar.photo} alt="" loading="lazy" onError={(event) => {event.currentTarget.style.visibility = "hidden";}} />
              <span className="sw-office-agent-names"><strong>{avatar.name}</strong><small>{avatar.role}</small></span>
              <span className={`sw-office-agent-dot ${avatar.configured ? "is-configured" : ""}`} title={avatar.configured ? "Configured (not an activity status)" : "Not configured"} aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className="sw-office-agents-actions">
          <button type="button" onClick={() => nav("/sync/assist")}><BriefcaseBusiness size={15}/> Manage team</button>
          <button type="button" className="sw-office-agents-refresh" aria-label="Refresh AI employee configuration" title="Refresh team" onClick={() => setVersion((v) => v+1)}><RefreshCw size={15}/></button>
        </div>
      </div>}
    </section>
  );
}
