import React from "react";

import CalendarPageEnhancer from "../components/calendar/CalendarPageEnhancer";
import CalendarPageV3 from "./CalendarPageV3";

export default function CalendarPage() {
  return <>
    <CalendarPageV3 />
    <CalendarPageEnhancer />
  </>;
}
