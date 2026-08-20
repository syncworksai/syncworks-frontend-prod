// src/pages/CustomerNewRequest.jsx
import React from "react";
import { CalendarClock } from "lucide-react";
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
    <div>
      <div className="fixed right-3 top-24 z-[60] sm:right-5">
        <button
          type="button"
          onClick={() => navigate("/customer/marketplace")}
          className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-cyan-400/30 bg-slate-950/95 px-4 text-xs font-black text-cyan-100 shadow-xl backdrop-blur"
        >
          <CalendarClock className="h-4 w-4" />
          Check real availability
        </button>
      </div>
      <UniversalTicketCreator
        mode={MARKETPLACE_MODES.CUSTOMER_MARKETPLACE}
        title="What do you need?"
        subtitle="Search the local marketplace. SyncWorks turns every request into a trackable ticket behind the scenes."
        onCreated={handleCreated}
        onCancel={() => navigate("/customer")}
      />
    </div>
  );
}
