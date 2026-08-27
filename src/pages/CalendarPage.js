import React from "react";
import CalendarPage from "./CalendarPage.jsx";

export default function CalendarPageDesktopDensity() {
  return (
    <div className="calendar-desktop-density">
      <style>{`
        @media (min-width: 768px) {
          .calendar-desktop-density main { font-size: 12px; }
          .calendar-desktop-density h1 { font-size: 1.45rem !important; line-height: 1.15 !important; }
          .calendar-desktop-density h2 { font-size: 1rem !important; line-height: 1.2 !important; }
          .calendar-desktop-density h3 { font-size: .82rem !important; line-height: 1.25 !important; }
          .calendar-desktop-density textarea,
          .calendar-desktop-density input,
          .calendar-desktop-density select { font-size: 12px !important; }
          .calendar-desktop-density button { letter-spacing: normal; }
        }
        @media (min-width: 1280px) {
          .calendar-desktop-density main { max-width: 1600px !important; }
        }
      `}</style>
      <CalendarPage />
    </div>
  );
}
