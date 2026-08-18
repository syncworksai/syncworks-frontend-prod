import React, { useState } from "react";
import { CalendarDays } from "lucide-react";
import LegacyCustomerSettings from "./CustomerSettings.jsx";
import CalendarConnectionsDrawer from "../components/CalendarConnectionsDrawer.jsx";

export default function CustomerSettingsWithConnections() {
  const [open, setOpen] = useState(false);
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(LegacyCustomerSettings),
    React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setOpen(true),
        className: "fixed bottom-24 right-4 z-[120] flex items-center gap-3 rounded-2xl border border-cyan-300/40 bg-slate-950/95 px-4 py-3 text-left text-white shadow-[0_0_38px_rgba(34,211,238,.24)] backdrop-blur-xl lg:bottom-6 lg:right-6",
        "aria-label": "Open connected calendars",
      },
      React.createElement("span", { className: "grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600" }, React.createElement(CalendarDays, { className: "h-5 w-5" })),
      React.createElement("span", null,
        React.createElement("span", { className: "block text-[10px] font-black uppercase tracking-[.18em] text-cyan-200" }, "SYNC Assistant Connections"),
        React.createElement("span", { className: "block text-sm font-black" }, "Connect calendars"),
        React.createElement("span", { className: "block text-[11px] text-slate-400" }, "Google · Outlook · multiple accounts")
      )
    ),
    React.createElement(CalendarConnectionsDrawer, { open, onClose: () => setOpen(false) })
  );
}
