// src/pages/CustomerNewRequest.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import UniversalTicketCreator from "../components/requests/new-request/UniversalTicketCreator";
import { readWorkspaceAppearance } from "../components/customer/CustomerWorkspace";
import { MARKETPLACE_MODES } from "../components/requests/new-request/requestMarketplaceCatalog";

export default function CustomerNewRequest() {
  const navigate = useNavigate();
  const [appearance, setAppearance] = useState(readWorkspaceAppearance);
  useEffect(() => {
    const sync = () => setAppearance(readWorkspaceAppearance());
    window.addEventListener("sw:workspace-appearance",sync);
    window.addEventListener("storage",sync);
    document.documentElement.classList.add("sw-new-request-viewport-locked");
    document.body.classList.add("sw-new-request-viewport-locked");
    return () => {
      window.removeEventListener("sw:workspace-appearance",sync);
      window.removeEventListener("storage",sync);
      document.documentElement.classList.remove("sw-new-request-viewport-locked");
      document.body.classList.remove("sw-new-request-viewport-locked");
    };
  }, []);
  const location = useLocation();
  const jarvisDetails = typeof location.state?.jarvisDescription === "string" ? location.state.jarvisDescription.slice(0, 3000) : "";

  function handleCreated({ id }) {
    window.setTimeout(() => {
      if (id) {
        navigate(`/tickets/${id}`);
      } else {
        navigate("/customer/tickets");
      }
    }, 700);
  }

  return (
    <div className="sw-new-request-page" data-theme={appearance.theme} data-motion={appearance.motion ? "on" : "off"}>
      <UniversalTicketCreator
        mode={MARKETPLACE_MODES.CUSTOMER_MARKETPLACE}
        initialDetails={jarvisDetails}
        title="New Request"
        onOpenAvailability={() => navigate("/customer/marketplace")}
        subtitle="Search the local marketplace. SyncWorks turns every request into a trackable ticket behind the scenes."
        onCreated={handleCreated}
        onCancel={() => navigate("/customer")}
      />
    </div>
  );
}
