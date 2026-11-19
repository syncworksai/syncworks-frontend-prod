import React from "react";
import { Mail, MessageSquareText, Building2, BriefcaseBusiness } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import "./MessageSourceTabs.css";

const sources = [
  { id: "tickets", title: "Tickets", Icon: MessageSquareText },
  { id: "email", title: "Email", Icon: Mail },
  { id: "property", title: "Property", Icon: Building2 },
  { id: "business", title: "Business", Icon: BriefcaseBusiness },
];

/** One navigation surface shared by Personal, PM and Business inboxes.
 * Nothing changes the data source implicitly: links retain access checks.
 */
export default function MessageSourceTabs({ active, onTickets, onEmail, onProperty, onBusiness }) {
  const navigate = useNavigate();
  const { mode } = useAuth();
  const businessRoute = String(mode || "").toUpperCase() === "SBO" ? "/sbo/inbox" : "/employee/inbox";
  const actions = {
    tickets: onTickets || (() => navigate("/customer/inbox")),
    email: onEmail || (() => navigate("/customer/inbox?quick=email")),
    property: onProperty || (() => navigate("/pm/settings?view=messages")),
    business: onBusiness || (() => navigate(businessRoute)),
  };
  return <nav className="sw-message-sources" aria-label="Message sources">
    {sources.map(({ id, title, Icon }) => <button type="button" key={id} aria-current={active === id ? "page" : undefined} onClick={actions[id]}><Icon size={18}/><span>{title}</span></button>)}
  </nav>;
}
