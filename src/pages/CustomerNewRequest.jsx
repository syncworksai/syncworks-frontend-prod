// src/pages/CustomerNewRequest.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import UniversalTicketCreator from "../components/requests/new-request/UniversalTicketCreator";
import { MARKETPLACE_MODES } from "../components/requests/new-request/requestMarketplaceCatalog";

export default function CustomerNewRequest() {
  const navigate = useNavigate();

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
    <UniversalTicketCreator
      mode={MARKETPLACE_MODES.CUSTOMER_MARKETPLACE}
      title="What do you need?"
      subtitle="Search the local marketplace. SyncWorks turns every request into a trackable ticket behind the scenes."
      onCreated={handleCreated}
      onCancel={() => navigate("/customer")}
    />
  );
}