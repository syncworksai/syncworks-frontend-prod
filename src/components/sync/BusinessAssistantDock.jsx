import React from "react";
import { useNavigate } from "react-router-dom";
import { AVATARS, getAvatarPhotoForUser, getAvatarFallbackPhotoForUser } from "./JarvisAvatar";
import { getPilotAgentsForUser } from "./pilotAgentRoster";
import "./BusinessAssistantDock.css";

/**
 * Global business assistant controls. Mount once in the persistent shell,
 * rather than duplicating agents in every business module.
 *
 * This is a navigation/launcher affordance, not a claim that every specialist
 * has a live autonomous worker connected.
 */
export default function BusinessAssistantDock({user,onVictoria}) {
  const navigate=useNavigate();
  const agents=getPilotAgentsForUser(user, AVATARS);
  return <nav className="sw-business-assist-dock" aria-label="Business AI team">
    <span className="sw-business-assist-caption">AI TEAM</span>
    {agents.map(agent=><button
      type="button"
      key={agent.id}
      aria-label={`Open ${agent.name}, ${agent.role}`}
      title={`${agent.name} — ${agent.role}`}
      className="sw-business-assist-person"
      onClick={()=>agent.role==="Chief of Staff"?onVictoria():navigate("/sync/assist")}
    >
      <img src={getAvatarPhotoForUser(agent,user)} alt="" loading="lazy" onError={(event)=>{const fallback=getAvatarFallbackPhotoForUser(agent,user);if(fallback && event.currentTarget.src !== new URL(fallback,window.location.href).href)event.currentTarget.src=fallback;}}/>
      <span>{agent.name}</span>
    </button>)}
  </nav>;
}
